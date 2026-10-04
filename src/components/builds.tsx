"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import {
  BookOpen,
  Download,
  FileUp,
  Plus,
  Save,
  Trash2,
  GitBranch,
  ArrowUpRight,
  Code2,
} from "lucide-react";
import {
  buildSchema,
  downloadFile,
  emptyBuild,
  exportBuild,
  parseBuild,
  type Build,
} from "@/lib/build";
import { useWorkspace } from "@/lib/workspace-store";
import { Badge, Button, Field, Notice, PageTitle, SectionHeader } from "./ui";
import { ItemImage, useItemImages } from "./artwork";
export function Builds() {
  const { find } = useItemImages();
  const store = useWorkspace(),
    [activeId, setActiveId] = useState<string>(),
    [draft, setDraft] = useState<Build>(emptyBuild),
    [message, setMessage] = useState(""),
    [error, setError] = useState(false),
    [raw, setRaw] = useState(""),
    [showRaw, setShowRaw] = useState(false),
    [skillId, setSkillId] = useState(""),
    [supportIds, setSupportIds] = useState(""),
    [slot, setSlot] = useState("Weapon1"),
    [slotNote, setSlotNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, reset, getValues } = useForm<
    Pick<Build, "name" | "author" | "description" | "ascendancy" | "link">
  >({ defaultValues: emptyBuild });
  function report(text: string, isError = false) {
    setMessage(text);
    setError(isError);
  }
  function open(build: Build, id?: string) {
    setDraft(build);
    setActiveId(id);
    reset(build);
    setShowRaw(false);
    report("");
  }
  function current() {
    const { name, author, description, ascendancy, link } = getValues();
    return buildSchema.parse({ ...draft, name, author, description, ascendancy, link });
  }
  function save() {
    try {
      const build = current();
      setDraft(build);
      setActiveId(store.saveBuild(build, activeId));
      report("Build saved to your library in this browser.");
    } catch {
      report("Give the build a name and check its fields.", true);
    }
  }
  async function importFile(file: File) {
    try {
      const build = parseBuild(await file.text());
      open(build);
      report("Build imported. Save a copy to add it to your library.");
    } catch {
      report("This file is not a valid PoE2 .build document. Your current draft was kept.", true);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="WORKSPACE / BUILD LIBRARY"
        title="Good ideas deserve a home."
        description="Write a build guide, pick up a saved draft, and take it into the game."
        action={
          <div className="button-group">
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <FileUp size={15} />
              Import .build
            </Button>
            <Button onClick={() => open({ ...emptyBuild, name: "Untitled build" })}>
              <Plus size={15} />
              New build
            </Button>
          </div>
        }
      />
      <input
        ref={fileRef}
        hidden
        type="file"
        accept=".build,.json,application/json"
        aria-label="Import build file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFile(file);
          e.target.value = "";
        }}
      />
      {message && <Notice error={error}>{message}</Notice>}
      <div className="build-layout">
        <aside className="panel build-library">
          <SectionHeader title="Your library" aside={<Badge>{store.builds.length}</Badge>} />
          {store.builds.length === 0 ? (
            <div className="small-empty">
              <BookOpen size={29} />
              <h3>A blank page, a new path.</h3>
              <p>Create your first build or import a .build file.</p>
            </div>
          ) : (
            store.builds.map((b) => (
              <div className={`build-list-item ${activeId === b.id ? "active" : ""}`} key={b.id}>
                <button onClick={() => open(b.build, b.id)}>
                  <span className="small-icon">
                    <GitBranch size={18} />
                  </span>
                  <strong>{b.build.name}</strong>
                  <small>
                    {b.build.passives?.length ?? 0} passives · {b.build.skills?.length ?? 0} skills
                  </small>
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete build ${b.build.name}`}
                  onClick={() => {
                    store.deleteBuild(b.id);
                    if (activeId === b.id) open(emptyBuild);
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
          <div className="library-tip">
            <GitBranch size={19} />
            <p>
              Start with the <Link href="/planner">passive planner</Link> to bring your tree into a
              build.
            </p>
          </div>
        </aside>
        <form className="panel build-editor" onSubmit={handleSubmit(save)}>
          <SectionHeader title="Build guide" aside={<Badge tone="amber">.BUILD FORMAT</Badge>} />
          <div className="form-grid">
            <Field label="Build name">
              <input {...register("name")} required maxLength={120} />
            </Field>
            <Field label="Author">
              <input {...register("author")} maxLength={120} placeholder="Your name" />
            </Field>
            <Field label="Ascendancy ID" hint="Use the official ID, e.g. Warrior1 for Titan.">
              <input {...register("ascendancy")} placeholder="Warrior1" />
            </Field>
            <Field label="Guide link">
              <input {...register("link")} placeholder="https://…" type="url" />
            </Field>
          </div>
          <Field label="Description & notes">
            <textarea
              {...register("description")}
              rows={4}
              placeholder="What makes this build work? Write your leveling tips and goals."
            />
          </Field>
          <SectionHeader
            title="Passive allocations"
            aside={<Badge>{draft.passives?.length ?? 0} NODES</Badge>}
          />
          <div className="passive-summary">
            <GitBranch size={22} />
            <span>
              {draft.passives?.length
                ? `${draft.passives.length} passive entries included in this guide.`
                : "Build your path in the passive planner, then save it to this library."}
            </span>
            <Link className="text-link" href="/planner">
              Open planner <ArrowUpRight size={14} />
            </Link>
          </div>
          <SectionHeader
            title="Skills & supports"
            aside={<Badge>{draft.skills?.length ?? 0}</Badge>}
          />
          <div className="inline-fields">
            <Field label="Skill metadata ID">
              <input
                value={skillId}
                onChange={(e) => setSkillId(e.target.value)}
                placeholder="Metadata/Items/Gems/SkillGemEarthquake"
              />
            </Field>
            <Field label="Support metadata IDs" hint="Separate multiple IDs with commas.">
              <input
                value={supportIds}
                onChange={(e) => setSupportIds(e.target.value)}
                placeholder="Metadata/Items/Gems/SupportGemFastForward"
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              disabled={!skillId.trim()}
              onClick={() => {
                setDraft((d) => ({
                  ...d,
                  skills: [
                    ...(d.skills ?? []),
                    {
                      id: skillId.trim(),
                      support_skills: supportIds
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  ],
                }));
                setSkillId("");
                setSupportIds("");
              }}
            >
              <Plus size={15} />
              Add skill
            </Button>
          </div>
          {draft.skills?.map((skill, i) => (
            <div className="removable-row" key={i}>
              <ItemImage
                src={find(typeof skill === "string" ? skill : skill.id)?.icon}
                name={
                  find(typeof skill === "string" ? skill : skill.id)?.name ??
                  (typeof skill === "string" ? skill : skill.id).split("/").pop()!
                }
                size={44}
              />
              <div>
                <strong>
                  {find(typeof skill === "string" ? skill : skill.id)?.name ??
                    (typeof skill === "string" ? skill : skill.id).split("/").pop()}
                </strong>
                <small>{typeof skill === "string" ? skill : skill.id}</small>
                {typeof skill !== "string" && (
                  <div className="support-artwork">
                    {skill.support_skills?.map((support, j) => {
                      const id = typeof support === "string" ? support : support.id,
                        item = find(id);
                      return (
                        <span key={j}>
                          <ItemImage
                            src={item?.icon}
                            name={item?.name ?? id.split("/").pop()!}
                            size={26}
                          />
                          <span>{item?.name ?? id.split("/").pop()}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Remove skill"
                onClick={() =>
                  setDraft((d) => ({ ...d, skills: d.skills?.filter((_, n) => n !== i) }))
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <SectionHeader title="Equipment hints" />
          <div className="inline-fields">
            <Field label="Inventory slot">
              <select value={slot} onChange={(e) => setSlot(e.target.value)}>
                {[
                  "Weapon1",
                  "Weapon2",
                  "Helm1",
                  "BodyArmour1",
                  "Gloves1",
                  "Boots1",
                  "Belt1",
                  "Amulet1",
                  "Ring1",
                  "Ring2",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Hint shown in the game">
              <input
                value={slotNote}
                onChange={(e) => setSlotNote(e.target.value)}
                placeholder="Prioritize life and resistances"
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              disabled={!slotNote.trim()}
              onClick={() => {
                setDraft((d) => ({
                  ...d,
                  inventory_slots: [
                    ...(d.inventory_slots ?? []),
                    { inventory_id: slot, additional_text: slotNote },
                  ],
                }));
                setSlotNote("");
              }}
            >
              <Plus size={15} />
              Add hint
            </Button>
          </div>
          {draft.inventory_slots?.map((s, i) => (
            <div className="removable-row" key={i}>
              <div>
                <strong>{s.inventory_id}</strong>
                <small>{s.additional_text}</small>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Remove hint"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    inventory_slots: d.inventory_slots?.filter((_, n) => n !== i),
                  }))
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              try {
                setRaw(exportBuild(current()));
                setShowRaw((v) => !v);
              } catch {
                report("Check your build fields before editing JSON.", true);
              }
            }}
          >
            <Code2 size={15} />
            {showRaw ? "Hide JSON" : "Edit full JSON (level ranges & advanced fields)"}
          </Button>
          {showRaw && (
            <>
              <textarea
                className="code-textarea"
                aria-label="Build JSON"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                spellCheck={false}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  try {
                    const build = parseBuild(raw);
                    setDraft(build);
                    reset(build);
                    report("JSON applied to your guide.");
                  } catch {
                    report("Invalid .build JSON. Your current guide was kept.", true);
                  }
                }}
              >
                Apply JSON
              </Button>
            </>
          )}
          <div className="editor-actions">
            <Button type="submit">
              <Save size={15} />
              Save build
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                try {
                  const build = current();
                  downloadFile(build.name + ".build", exportBuild(build), "application/json");
                  report(
                    "Build downloaded. Upload it on pathofexile2.com or place it in your BuildPlanner folder.",
                  );
                } catch {
                  report("Give the build a name and check the fields before exporting.", true);
                }
              }}
            >
              <Download size={15} />
              Export .build
            </Button>
          </div>
          <p className="fine-print">
            On Windows: Documents / My Games / Path of Exile 2 / BuildPlanner. Builds provide
            guidance; they do not allocate passives or change equipment.
          </p>
        </form>
      </div>
    </>
  );
}
