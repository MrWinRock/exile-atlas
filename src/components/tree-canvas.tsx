"use client";
import { useEffect, useRef, useState } from "react";
import type { Tree } from "@/lib/tree";
import type { TreeRenderer } from "@/lib/tree-renderer";
import { WEAPON_PASSIVE_COLORS } from "@/lib/passive-colors";
import { Minus, Plus, Scan } from "lucide-react";
export function TreeCanvas({
  tree,
  ascendancy,
  allocated,
  weaponAllocated,
  weaponSet,
  highlight,
  onSelect,
}: {
  tree: Tree;
  ascendancy?: string;
  allocated: string[];
  weaponAllocated?: string[];
  weaponSet?: 1 | 2;
  highlight?: string;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    rendererRef = useRef<TreeRenderer | null>(null),
    stateRef = useRef({ allocated, highlight, weaponAllocated, weaponSet }),
    selectRef = useRef(onSelect),
    [error, setError] = useState("");
  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    stateRef.current = { allocated, highlight, weaponAllocated, weaponSet };
    rendererRef.current?.update(allocated, highlight, weaponAllocated, weaponSet);
  }, [allocated, highlight, weaponAllocated, weaponSet]);
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
        renderer.update(state.allocated, state.highlight, state.weaponAllocated, state.weaponSet);
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
          {weaponSet ? "Shared" : "Allocated"}
        </span>
        {weaponSet && (
          <span>
            <i style={{ backgroundColor: `#${WEAPON_PASSIVE_COLORS[weaponSet].toString(16)}` }} />
            Weapon set {weaponSet === 1 ? "I" : "II"}
          </span>
        )}
      </div>
      <span className="tree-hint">SCROLL TO ZOOM · DRAG TO EXPLORE</span>
    </div>
  );
}
