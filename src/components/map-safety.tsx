"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameData } from "@/lib/game-data-store";
import { useSafetyProfiles } from "@/lib/map-safety-store";
import {
  evaluateMapSafety,
  prepareSafetyRegex,
  type SafetyProfile,
  type SafetyRule,
  type SafetyResult,
} from "@/lib/map-safety";
import { parseItemText } from "@/lib/item-text";
import { useItemTransfer, clearItemTransfer } from "@/lib/item-transfer-hook";
import { buildRegexCatalogue, defaultRegexCatalogue } from "@/lib/regex-catalogue-builder";
import { useRegexWorkspace } from "@/lib/regex-store";
import { downloadFile } from "@/lib/build";
import { Button, Field, Notice, PageTitle, SectionHeader } from "./ui";
import styles from "./map-safety.module.css";
const emptyProfile = (): SafetyProfile => ({
  id: crypto.randomUUID(),
  name: "My map profile",
  traits: {},
  rules: [],
});
export function MapSafety() {
  const library = useSafetyProfiles(),
    data = useGameData(),
    router = useRouter();
  const [profile, setProfile] = useState<SafetyProfile>(emptyProfile),
    [text, setText] = useState(""),
    [result, setResult] = useState<SafetyResult>(),
    [message, setMessage] = useState(""),
    [traitName, setTraitName] = useState(""),
    [preview, setPreview] = useState(false),
    [selectedRules, setSelectedRules] = useState<string[]>(),
    [deletePending, setDeletePending] = useState(false);
  const { transfer } = useItemTransfer();
  const catalogue = useMemo(
    () => (data.snapshot ? buildRegexCatalogue(data.snapshot) : defaultRegexCatalogue),
    [data.snapshot],
  );
  const modifiers = catalogue.modifiers.filter((m) => m.categories.includes("waystone"));
  useEffect(() => {
    useSafetyProfiles.getState().load();
  }, []);
  function update(next: SafetyProfile) {
    setProfile(next);
    setResult(undefined);
    setPreview(false);
    setSelectedRules(undefined);
  }
  function changeRule(id: string, patch: Partial<SafetyRule>) {
    update({ ...profile, rules: profile.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  }
  function attempt(task: () => void) {
    try {
      task();
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Profile action failed");
    }
  }
  const regex = data.snapshot
    ? prepareSafetyRegex(profile, data.snapshot, selectedRules)
    : undefined;
  const labels = {
    avoid: "Avoid",
    caution: "Caution",
    "no-flagged-condition": "No flagged known condition",
    "needs-review": "Needs review",
  };
  return (
    <>
      <PageTitle
        eyebrow="TOOLS / MAP SAFETY"
        title="Know what your map asks of you."
        description="Apply your own build-risk rules to a pasted Waystone. Every flag shows its conditions and actual rolls."
      />
      {(message || library.warning || data.error) && (
        <Notice error>{message || library.warning || data.error}</Notice>
      )}
      <div className={styles.grid}>
        <section className={`panel ${styles.panel}`}>
          <SectionHeader title="Build-risk profile" />
          <Field label="Saved risk profile">
            <select
              aria-label="Saved risk profile"
              value={library.records.some((p) => p.id === profile.id) ? profile.id : ""}
              onChange={(e) => {
                const p = library.records.find((p) => p.id === e.target.value);
                if (p) update(structuredClone(p));
              }}
            >
              <option value="">Unsaved profile</option>
              {library.records.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Profile name">
            <input
              aria-label="Profile name"
              value={profile.name}
              maxLength={120}
              onChange={(e) => update({ ...profile, name: e.target.value })}
            />
          </Field>
          <div className="button-group">
            <Button
              onClick={() =>
                attempt(() => {
                  library.save({ ...profile, snapshotId: profile.snapshotId ?? data.snapshot?.id });
                })
              }
            >
              Save profile
            </Button>
            <Button variant="secondary" onClick={() => update(emptyProfile())}>
              New profile
            </Button>
            <Button
              variant="secondary"
              disabled={!library.records.some((p) => p.id === profile.id)}
              onClick={() => attempt(() => library.duplicate(profile.id))}
            >
              Duplicate profile
            </Button>
            <Button
              variant="ghost"
              disabled={!library.records.some((p) => p.id === profile.id)}
              onClick={() => setDeletePending(true)}
            >
              Delete profile
            </Button>
            {deletePending && (
              <Button
                onClick={() => {
                  attempt(() => library.remove(profile.id));
                  setDeletePending(false);
                  update(emptyProfile());
                }}
              >
                Confirm profile deletion
              </Button>
            )}
          </div>
          <details>
            <summary>Build traits you want rules to reference</summary>
            <div className={styles.row}>
              <Field label="Trait name">
                <input
                  value={traitName}
                  onChange={(e) => setTraitName(e.target.value)}
                  maxLength={100}
                />
              </Field>
              <Button
                variant="secondary"
                disabled={!traitName.trim()}
                onClick={() => {
                  update({ ...profile, traits: { ...profile.traits, [traitName.trim()]: true } });
                  setTraitName("");
                }}
              >
                Add trait
              </Button>
            </div>
            {Object.entries(profile.traits).map(([id, value]) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    update({ ...profile, traits: { ...profile.traits, [id]: e.target.checked } })
                  }
                />
                {id}
              </label>
            ))}
          </details>
          {profile.rules.map((rule, index) => (
            <div className={styles.rule} key={rule.id}>
              <div className={styles.row}>
                <Field label={`Rule ${index + 1} name`}>
                  <input
                    value={rule.label}
                    onChange={(e) => changeRule(rule.id, { label: e.target.value })}
                  />
                </Field>
                <Field label={`Rule ${index + 1} severity`}>
                  <select
                    value={rule.severity}
                    onChange={(e) =>
                      changeRule(rule.id, { severity: e.target.value as SafetyRule["severity"] })
                    }
                  >
                    <option value="avoid">Avoid</option>
                    <option value="caution">Caution</option>
                  </select>
                </Field>
                <Field label={`Rule ${index + 1} matching`}>
                  <select
                    value={rule.operator}
                    onChange={(e) =>
                      changeRule(rule.id, { operator: e.target.value as SafetyRule["operator"] })
                    }
                  >
                    <option value="any">Any condition</option>
                    <option value="all">All conditions together</option>
                  </select>
                </Field>
              </div>
              {rule.conditions.map((c, ci) => (
                <div className={styles.condition} key={ci}>
                  <div className={styles.row}>
                    <Field label={`Rule ${index + 1} condition ${ci + 1} type`}>
                      <select
                        value={c.kind}
                        onChange={(e) =>
                          changeRule(rule.id, {
                            conditions: rule.conditions.map((old, i) =>
                              i === ci
                                ? e.target.value === "trait"
                                  ? {
                                      kind: "trait",
                                      id: Object.keys(profile.traits)[0] ?? "",
                                      value: true,
                                    }
                                  : { kind: "modifier", id: "extra-fire" }
                                : old,
                            ),
                          })
                        }
                      >
                        <option value="modifier">Waystone modifier</option>
                        <option value="trait">Build trait</option>
                      </select>
                    </Field>
                    <Field label={`Rule ${index + 1} condition ${ci + 1}`}>
                      <select
                        value={c.id}
                        onChange={(e) =>
                          changeRule(rule.id, {
                            conditions: rule.conditions.map((old, i) =>
                              i === ci ? { ...old, id: e.target.value } : old,
                            ),
                          })
                        }
                      >
                        {c.kind === "modifier"
                          ? modifiers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.label}
                              </option>
                            ))
                          : Object.keys(profile.traits).map((id) => (
                              <option key={id} value={id}>
                                {id}
                              </option>
                            ))}
                      </select>
                    </Field>
                  </div>
                  {c.kind === "modifier" && modifiers.find((m) => m.id === c.id)?.numericDomain && (
                    <div className={styles.row}>
                      {(["min", "max"] as const).map((bound) => (
                        <Field key={bound} label={`Rule ${index + 1} condition ${ci + 1} ${bound}`}>
                          <input
                            inputMode="decimal"
                            value={c[bound] ?? ""}
                            onChange={(e) =>
                              changeRule(rule.id, {
                                conditions: rule.conditions.map((old, i) =>
                                  i === ci ? { ...old, [bound]: e.target.value } : old,
                                ),
                              })
                            }
                          />
                        </Field>
                      ))}
                    </div>
                  )}
                  {c.kind === "trait" && (
                    <Field label={`Rule ${index + 1} required trait state`}>
                      <select
                        value={String(c.value)}
                        onChange={(e) =>
                          changeRule(rule.id, {
                            conditions: rule.conditions.map((old, i) =>
                              i === ci ? { ...old, value: e.target.value === "true" } : old,
                            ),
                          })
                        }
                      >
                        <option value="true">Trait applies</option>
                        <option value="false">Trait does not apply</option>
                      </select>
                    </Field>
                  )}
                  {rule.conditions.length > 1 && (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        changeRule(rule.id, {
                          conditions: rule.conditions.filter((_, i) => i !== ci),
                        })
                      }
                    >
                      Remove condition {ci + 1}
                    </Button>
                  )}
                </div>
              ))}
              <Field label={`Rule ${index + 1} explanation`}>
                <input
                  value={rule.reason}
                  onChange={(e) => changeRule(rule.id, { reason: e.target.value })}
                />
              </Field>
              <div className="button-group">
                <Button
                  variant="secondary"
                  onClick={() =>
                    changeRule(rule.id, {
                      conditions: [...rule.conditions, { kind: "modifier", id: "chilled-ground" }],
                    })
                  }
                >
                  Add condition to rule {index + 1}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    update({ ...profile, rules: profile.rules.filter((r) => r.id !== rule.id) })
                  }
                >
                  Remove rule {index + 1}
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              update({
                ...profile,
                rules: [
                  ...profile.rules,
                  {
                    id: crypto.randomUUID(),
                    label: "Extra fire damage",
                    severity: "avoid",
                    operator: "any",
                    conditions: [{ kind: "modifier", id: "extra-fire", min: "20", max: "" }],
                    reason: "Review extra fire damage for this build",
                  },
                ],
              })
            }
          >
            Add risk rule
          </Button>
          <p className="fine-print">
            Profile source: {profile.snapshotId?.slice(0, 12) ?? "version unrecorded"}.{" "}
            {profile.snapshotId !== data.snapshot?.id && data.snapshot && (
              <Button
                variant="ghost"
                onClick={() => update({ ...profile, snapshotId: data.snapshot!.id })}
              >
                Revalidate profile
              </Button>
            )}
          </p>
          <div className="button-group">
            <Button
              variant="secondary"
              onClick={() =>
                attempt(() =>
                  downloadFile(
                    "map-safety-profiles.json",
                    library.exportJson(),
                    "application/json",
                  ),
                )
              }
            >
              Export profiles
            </Button>
            <Field label="Import profiles">
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f)
                    void f
                      .text()
                      .then((t) => attempt(() => library.importJson(t)))
                      .catch(() => setMessage("Could not read profile file"));
                  e.target.value = "";
                }}
              />
            </Field>
          </div>
        </section>
        <section className={`panel ${styles.panel}`}>
          <SectionHeader title="Check a Waystone" />
          {transfer && (
            <Notice>
              Transferred item: review before replacing your paste.{" "}
              <Button
                variant="secondary"
                onClick={() => {
                  setText(transfer.itemText);
                  clearItemTransfer();
                }}
              >
                Use transferred item
              </Button>
              <Button variant="ghost" onClick={clearItemTransfer}>
                Discard transfer
              </Button>
            </Notice>
          )}
          <Field label="Waystone text">
            <textarea
              aria-label="Waystone text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setResult(undefined);
              }}
              placeholder="Paste English Waystone text…"
            />
          </Field>
          <Button
            disabled={!text.trim() || !data.snapshot}
            onClick={() =>
              attempt(() =>
                setResult(evaluateMapSafety(parseItemText(text), profile, data.snapshot!)),
              )
            }
          >
            Check Waystone
          </Button>
          {result && (
            <>
              <h3 data-testid="safety-status">{labels[result.status]}</h3>
              {result.findings.map((f) => (
                <div className={styles.finding} key={f.id}>
                  <strong>
                    {f.severity.toUpperCase()} · {f.label}
                  </strong>
                  <p>{f.reason}</p>
                  {f.conditions.map((c, i) => (
                    <p key={i}>{c}</p>
                  ))}
                </div>
              ))}
              {result.unknown.length > 0 && (
                <Notice error>
                  Needs review:
                  {result.unknown.map((u, i) => (
                    <p key={i}>{u}</p>
                  ))}
                </Notice>
              )}
              <p className="fine-print">
                This checks your chosen rules against known facts. No flagged known condition does
                not predict survival.
              </p>
            </>
          )}
          <Button
            variant="secondary"
            disabled={!data.snapshot || !profile.rules.length}
            onClick={() => setPreview(true)}
          >
            Preview avoid regex
          </Button>
          {preview && regex && (
            <div className={styles.preview}>
              <h3>Avoid-regex coverage</h3>
              <pre>{regex.compiled.text}</pre>
              <p>Covered: {regex.supported.join(" · ") || "none"}</p>
              {regex.unsupported.length > 0 && (
                <Notice error>Cannot represent completely: {regex.unsupported.join(" · ")}</Notice>
              )}
              <label>
                <input
                  type="checkbox"
                  checked={selectedRules !== undefined}
                  onChange={(e) =>
                    setSelectedRules(
                      e.target.checked
                        ? profile.rules
                            .filter(
                              (r) =>
                                prepareSafetyRegex({ ...profile, rules: [r] }, data.snapshot!)
                                  .canTransferComplete,
                            )
                            .map((r) => r.id)
                        : undefined,
                    )
                  }
                />
                Use an explicitly reduced rule set
              </label>
              {selectedRules && (
                <p className="fine-print">
                  Only the {selectedRules.length} representable rules above will transfer.
                </p>
              )}
              <div className="button-group">
                <Button
                  disabled={!regex.canTransferComplete}
                  onClick={() => {
                    useRegexWorkspace.getState().setDraft(regex.draft);
                    useRegexWorkspace.getState().setActiveTab("waystone");
                    router.push("/regex");
                  }}
                >
                  Use selected avoid rules
                </Button>
                <Button
                  variant="secondary"
                  disabled={!regex.compiled.copyable || !regex.canTransferComplete}
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(regex.compiled.text)
                      .catch(() =>
                        setMessage("Clipboard unavailable; select the preview text manually."),
                      )
                  }
                >
                  Copy avoid regex
                </Button>
                <Button variant="ghost" onClick={() => setPreview(false)}>
                  Cancel avoid preview
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
