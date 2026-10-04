"use client";
import { useEffect, useRef } from "react";
import type { EChartsOption } from "echarts";
export function Chart({ options, label }: { options: EChartsOption; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let chart: import("echarts").ECharts | undefined;
    const observer = new ResizeObserver(() => chart?.resize());
    if (ref.current) observer.observe(ref.current);
    void import("echarts").then((echarts) => {
      if (disposed || !ref.current) return;
      chart = echarts.init(ref.current, undefined, { renderer: "canvas" });
      chart.setOption(options);
    });
    return () => {
      disposed = true;
      observer.disconnect();
      chart?.dispose();
    };
  }, [options]);
  return <div ref={ref} className="chart" role="img" aria-label={label} />;
}
