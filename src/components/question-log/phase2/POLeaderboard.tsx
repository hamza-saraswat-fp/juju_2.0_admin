import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TimeToggle } from "@/components/ui/time-toggle";
import { ownerName } from "@/config/jujuTaxonomy";
import { useQuestionPhase2 } from "@/hooks/useQuestionPhase2";
import type { QuestionFilters, TimeRange } from "@/lib/questionFilters";
import { cn } from "@/lib/utils";

type SortKey =
  | "name"
  | "tagged"
  | "verified"
  | "verified_rate"
  | "avg_response_hours";
type SortDir = "asc" | "desc";

interface Props {
  filters: QuestionFilters;
  className?: string;
}

interface POLeaderboardEntry {
  slack_id: string;
  tagged: number;
  verified: number;
  verified_rate: number | null;
  avg_response_hours: number | null;
}

export function POLeaderboard({ filters, className }: Props) {
  const [range, setRange] = useState<TimeRange>("7d");
  const { data: rpcData, isLoading } = useQuestionPhase2({
    ...filters,
    timeRange: range,
  });
  const data: POLeaderboardEntry[] = rpcData?.po_leaderboard ?? [];
  const [sortKey, setSortKey] = useState<SortKey>("tagged");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const empty = !isLoading && data.length === 0;

  const sorted = [...data].sort((a, b) => {
    const av = sortValue(a, sortKey);
    const bv = sortValue(b, sortKey);
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const onSort = (k: SortKey) => {
    if (k === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  return (
    <Card className={cn("flex flex-col overflow-hidden p-0", className)}>
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              Product Owner leaderboard
            </h3>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              Click a column to sort
            </p>
          </div>
          <TimeToggle value={range} onChange={setRange} />
        </div>
      </div>

      {isLoading ? (
        <div className="m-5 h-[200px] animate-pulse rounded-lg bg-surface-deep" />
      ) : empty ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-on-surface-faint">
          Not enough data yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <SortHeader
                  k="name"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  className="pl-5"
                >
                  PO
                </SortHeader>
                <SortHeader
                  k="tagged"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  align="right"
                >
                  Tagged
                </SortHeader>
                <SortHeader
                  k="verified"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  align="right"
                >
                  Verified
                </SortHeader>
                <SortHeader
                  k="verified_rate"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  align="right"
                >
                  Rate
                </SortHeader>
                <SortHeader
                  k="avg_response_hours"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  align="right"
                  className="pr-5"
                >
                  Avg resp
                </SortHeader>
              </tr>
            </thead>
            <tbody>
              {sorted.map((po) => (
                <tr
                  key={po.slack_id}
                  className="border-b border-line transition-colors last:border-0 hover:bg-page-accent/5"
                >
                  <td className="px-5 py-2.5 font-medium">
                    {ownerName(po.slack_id) ?? po.slack_id}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {po.tagged}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {po.verified}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {po.verified_rate !== null
                      ? `${Math.round(po.verified_rate * 100)}%`
                      : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-xs">
                    {po.avg_response_hours !== null
                      ? formatHours(po.avg_response_hours)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function sortValue(po: POLeaderboardEntry, key: SortKey): number | string {
  if (key === "name") {
    return (ownerName(po.slack_id) ?? po.slack_id ?? "").toLowerCase();
  }
  const v = po[key];
  return v ?? -Infinity;
}

function SortHeader({
  k,
  sortKey,
  sortDir,
  onSort,
  align,
  className,
  children,
}: {
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  align?: "right";
  className?: string;
  children: React.ReactNode;
}) {
  const isActive = sortKey === k;
  const Icon = !isActive ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      onClick={() => onSort(k)}
      className={cn(
        "cursor-pointer select-none px-3 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1",
          align === "right" && "justify-end",
        )}
      >
        {children}
        <Icon
          className={cn(
            "h-3 w-3",
            isActive ? "text-page-accent-deep" : "text-on-surface-faint",
          )}
        />
      </span>
    </th>
  );
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  const d = h / 24;
  return `${d.toFixed(1)}d`;
}
