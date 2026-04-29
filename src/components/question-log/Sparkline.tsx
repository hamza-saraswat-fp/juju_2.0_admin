import { cn } from "@/lib/utils";

interface SparklineProps {
  data: (number | null | undefined)[];
  height?: number;
  className?: string;
}

/**
 * Tiny inline-SVG sparkline. Stroke + fill use `currentColor`, so the parent
 * controls the hue via a Tailwind text-* class. Null/undefined values are
 * skipped (the polyline jumps over them).
 */
export function Sparkline({ data, height = 40, className }: SparklineProps) {
  const valid = data.filter((v): v is number => typeof v === "number");
  if (valid.length < 2) {
    return <div style={{ height }} aria-hidden />;
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const W = 100;
  const padY = 2;
  const stepX = W / (data.length - 1);

  const pts = data.map((v, i) => {
    if (typeof v !== "number") return null;
    const x = i * stepX;
    const y = height - padY - ((v - min) / range) * (height - padY * 2);
    return { x, y };
  });

  const linePoints = pts
    .filter((p): p is { x: number; y: number } => p !== null)
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  const first = pts.find((p) => p !== null);
  const last = [...pts].reverse().find((p) => p !== null);
  const areaPoints =
    first && last ? `${first.x},${height} ${linePoints} ${last.x},${height}` : "";

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
      aria-hidden
    >
      <polygon points={areaPoints} fill="currentColor" fillOpacity={0.12} />
      <polyline
        points={linePoints}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
