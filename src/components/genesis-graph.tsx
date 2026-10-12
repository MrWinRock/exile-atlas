"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GenesisBranch, GenesisData } from "@/lib/genesis-data";
import { Button } from "./ui";
import styles from "./genesis.module.css";
type View = { x: number; y: number; w: number; h: number };
export function GenesisGraph({
  data,
  allocated,
  selected,
  onSelect,
  branch,
}: {
  data: GenesisData;
  allocated: string[];
  selected: string;
  onSelect: (id: string) => void;
  branch: GenesisBranch;
}) {
  const nodes = data.nodes.filter((n) => n.branch === branch),
    byId = new Map(nodes.map((n) => [n.id, n])),
    active = new Set(allocated);
  const fit = (): View => {
    const minX = Math.min(...nodes.map((n) => n.x)),
      maxX = Math.max(...nodes.map((n) => n.x)),
      minY = Math.min(...nodes.map((n) => n.y)),
      maxY = Math.max(...nodes.map((n) => n.y));
    const w = Math.max(maxX - minX + 500, 900),
      h = Math.max(maxY - minY + 500, 650);
    return { x: (minX + maxX - w) / 2, y: (minY + maxY - h) / 2, w, h };
  };
  const [view, setView] = useState(fit),
    drag = useRef<{ x: number; y: number; view: View; id: string | null; moved: boolean } | null>(
      null,
    );
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const node = data.nodes.find((n) => n.id === selected && n.branch === branch);
    if (!node) return;
    const frame = requestAnimationFrame(() =>
      setView((v) => ({ ...v, x: node.x - v.w / 2, y: node.y - v.h / 2 })),
    );
    return () => cancelAnimationFrame(frame);
  }, [selected, data, branch]);
  const zoom = useCallback(
    (factor: number) =>
      setView((v) => {
        const w = Math.max(250, Math.min(14000, v.w * factor)),
          h = (v.h * w) / v.w;
        return { x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h };
      }),
    [],
  );
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      zoom(event.deltaY > 0 ? 1.1 : 0.9);
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => svg.removeEventListener("wheel", wheel);
  }, [zoom]);
  return (
    <div className={styles.graphContainer}>
      <div className={styles.graphToolbar}>
        <span>
          {nodes.length} source records · {branch}
        </span>
        <div>
          <Button variant="ghost" aria-label="Zoom Genesis out" onClick={() => zoom(1.25)}>
            −
          </Button>
          <Button variant="ghost" aria-label="Zoom Genesis in" onClick={() => zoom(0.8)}>
            +
          </Button>
          <Button variant="secondary" onClick={() => setView(fit())}>
            Fit branch
          </Button>
          <Button variant="ghost" onClick={() => setView(fit())}>
            Reset view
          </Button>
        </div>
      </div>
      <svg
        ref={svgRef}
        className={styles.graph}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        role="img"
        aria-label={`${branch} Genesis tree. Use the searchable node list for keyboard actions.`}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const id =
            (e.target as Element).closest("[data-node]")?.getAttribute("data-node") ?? null;
          drag.current = { x: e.clientX, y: e.clientY, view, id, moved: false };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x,
            dy = e.clientY - d.y;
          if (Math.hypot(dx, dy) > 5) d.moved = true;
          if (d.moved) {
            const box = e.currentTarget.getBoundingClientRect(),
              scale = Math.max(d.view.w / box.width, d.view.h / box.height);
            setView({ ...d.view, x: d.view.x - dx * scale, y: d.view.y - dy * scale });
          }
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
          if (d?.id && !d.moved) onSelect(d.id);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {data.edges
          .filter(([a, b]) => byId.has(a) && byId.has(b))
          .map(([a, b]) => {
            const first = byId.get(a)!,
              second = byId.get(b)!,
              connected = (active.has(a) || first.root) && (active.has(b) || second.root);
            return (
              <line
                key={a + ":" + b}
                x1={first.x}
                y1={first.y}
                x2={second.x}
                y2={second.y}
                stroke={connected ? "#dfb87d" : "#3f504b"}
                strokeWidth={connected ? 8 : 5}
              />
            );
          })}
        {nodes.map((n) => (
          <g key={n.id} data-node={n.id} style={{ cursor: "pointer" }}>
            <title>
              {n.name}
              {n.root ? " · Root" : ""}
            </title>
            {selected === n.id && (
              <circle cx={n.x} cy={n.y} r={70} fill="none" stroke="#f6e0ba" strokeWidth={4} />
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={n.root ? 54 : 34}
              fill={active.has(n.id) ? "#dfb87d" : n.root ? "#354c43" : "#18241f"}
              stroke={active.has(n.id) ? "#f0d9b4" : n.root ? "#90b6a1" : "#8c9a82"}
              strokeWidth={n.root ? 7 : 4}
            />
            {n.root && (
              <text x={n.x} y={n.y + 9} textAnchor="middle" fill="#d0dfcc" fontSize={32}>
                ✦
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className={styles.graphCaption}>
        Drag to pan · scroll or use + / − to zoom · select a node to inspect
      </div>
    </div>
  );
}
