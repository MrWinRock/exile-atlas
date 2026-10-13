"use client";
import { useEffect, useRef, useState } from "react";
import type { Tree } from "@/lib/tree";
import type { TreeRenderer } from "@/lib/tree-renderer";
import { WEAPON_PASSIVE_COLORS } from "@/lib/passive-colors";
import type { PassiveDisplay } from "@/lib/passive-display";
import type { AllocationMode } from "@/lib/passive-plan";
import { Minus, Plus, Scan, Undo2 } from "lucide-react";
export function TreeCanvas({
  tree,
  ascendancy,
  allocated,
  weaponAllocated,
  weaponSet,
  highlight,
  onSelect,
  display,
  onModeChange,
  onShowBothChange,
  readOnly,
  difference,
  undoAction,
}: {
  tree: Tree;
  ascendancy?: string;
  allocated: string[];
  weaponAllocated?: string[];
  weaponSet?: 1 | 2;
  highlight?: string;
  onSelect: (id: string) => void;
  display?: PassiveDisplay;
  onModeChange?: (mode: AllocationMode) => void;
  onShowBothChange?: (value: boolean) => void;
  readOnly?: boolean;
  difference?: { added: string[]; removed: string[] };
  undoAction?: { disabled: boolean; onClick: () => void };
}) {
  const ref = useRef<HTMLDivElement>(null),
    rendererRef = useRef<TreeRenderer | null>(null),
    stateRef = useRef({ allocated, highlight, weaponAllocated, weaponSet, display, difference }),
    selectRef = useRef(onSelect),
    [error, setError] = useState("");
  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    stateRef.current = { allocated, highlight, weaponAllocated, weaponSet, display, difference };
    rendererRef.current?.update(
      allocated,
      highlight,
      weaponAllocated,
      weaponSet,
      display,
      difference,
    );
  }, [allocated, highlight, weaponAllocated, weaponSet, display, difference]);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let disposed = false;
    const controller = new AbortController();
    let renderer: TreeRenderer | undefined;
    void import("@/lib/tree-renderer")
      .then(async ({ createTreeRenderer }) => {
        if (disposed) return;
        renderer = await createTreeRenderer(
          host,
          tree,
          ascendancy,
          (id) => selectRef.current(id),
          controller.signal,
        );
        if (disposed) {
          renderer.destroy();
          return;
        }
        rendererRef.current = renderer;
        const state = stateRef.current;
        renderer.update(
          state.allocated,
          state.highlight,
          state.weaponAllocated,
          state.weaponSet,
          state.display,
          state.difference,
        );
        setError("");
      })
      .catch(() => {
        if (!disposed)
          setError(
            "The canvas renderer is unavailable. Use the searchable node list to plan your build.",
          );
      });
    return () => {
      disposed = true;
      controller.abort();
      renderer?.destroy();
      rendererRef.current = null;
    };
  }, [tree, ascendancy]);
  function zoom(factor: number) {
    rendererRef.current?.zoom(factor);
  }
  return (
    <div className="tree-viewport">
      <div
        ref={ref}
        className="tree-canvas"
        aria-label="Interactive official PoE2 passive tree. Search nodes in the adjacent list for keyboard access."
        role="img"
      />
      {error && <div className="canvas-error">{error}</div>}
      {display && onModeChange && (
        <div className="tree-set-controls" aria-label="Canvas weapon sets">
          <span data-testid="editing-set">
            {readOnly ? "Viewing" : "Editing"}:{" "}
            {display.mode === 0 ? "Shared" : display.mode === 1 ? "Weapon set I" : "Weapon set II"}
          </span>
          <div>
            {([0, 1, 2] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-label={
                  mode === 0 ? "View shared passives" : `View weapon set ${mode === 1 ? "I" : "II"}`
                }
                aria-pressed={display.mode === mode}
                style={{
                  color: mode === 0 ? "#dab077" : `#${WEAPON_PASSIVE_COLORS[mode].toString(16)}`,
                }}
                onClick={() => onModeChange(mode)}
              >
                {mode === 0 ? "Shared" : mode === 1 ? "Set I" : "Set II"}
              </button>
            ))}
          </div>
          {undoAction && !readOnly && (
            <button
              type="button"
              aria-label="Undo last passive change"
              disabled={undoAction.disabled}
              onClick={undoAction.onClick}
              title="Undo the last planner change during this visit"
            >
              <Undo2
                size={12}
                style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }}
              />
              Undo
            </button>
          )}
          {onShowBothChange && (
            <button
              type="button"
              aria-pressed={display.showBoth}
              onClick={() => onShowBothChange(!display.showBoth)}
            >
              Show both sets
            </button>
          )}
        </div>
      )}
      <div className="tree-controls">
        <button className="icon-button" aria-label="Zoom in" onClick={() => zoom(1.3)}>
          <Plus size={18} />
        </button>
        <button className="icon-button" aria-label="Zoom out" onClick={() => zoom(0.77)}>
          <Minus size={18} />
        </button>
        <button
          className="icon-button"
          aria-label="Fit tree to view"
          onClick={() => rendererRef.current?.fit()}
        >
          <Scan size={18} />
        </button>
      </div>
      <div className="tree-legend">
        <span>
          <i className="normal" />
          Passive
        </span>
        <span>
          <i className="notable" />
          Notable
        </span>
        <span>
          <i className="keystone" />
          Keystone
        </span>
        <span>
          <i className="allocated" />
          {display || weaponSet ? "Shared" : "Allocated"}
        </span>
        {([1, 2] as const)
          .filter((set) => display?.showBoth || weaponSet === set)
          .map((set) => (
            <span key={set}>
              <i
                data-set={set}
                style={{ backgroundColor: `#${WEAPON_PASSIVE_COLORS[set].toString(16)}` }}
              />
              Weapon set {set === 1 ? "I" : "II"}
            </span>
          ))}
      </div>
      <span className="tree-hint">SCROLL TO ZOOM · DRAG TO EXPLORE</span>
    </div>
  );
}
