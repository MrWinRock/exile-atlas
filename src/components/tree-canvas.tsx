"use client";
import { useEffect, useRef, useState } from "react";
import type { Tree } from "@/lib/tree";
import type { TreeRenderer } from "@/lib/tree-renderer";
import { Minus, Plus, Scan } from "lucide-react";
export function TreeCanvas({
  tree,
  ascendancy,
  allocated,
  highlight,
  onSelect,
}: {
  tree: Tree;
  ascendancy?: string;
  allocated: string[];
  highlight?: string;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    rendererRef = useRef<TreeRenderer | null>(null),
    stateRef = useRef({ allocated, highlight }),
    selectRef = useRef(onSelect),
    [error, setError] = useState("");
  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    stateRef.current = { allocated, highlight };
    rendererRef.current?.update(allocated, highlight);
  }, [allocated, highlight]);
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
        renderer.update(stateRef.current.allocated, stateRef.current.highlight);
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
          Allocated
        </span>
      </div>
      <span className="tree-hint">SCROLL TO ZOOM · DRAG TO EXPLORE</span>
    </div>
  );
}
