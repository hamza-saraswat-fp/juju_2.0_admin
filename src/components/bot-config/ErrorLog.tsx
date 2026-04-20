import { useState } from "react";
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ErrorLogEntry, ErrorType, PromptSlot } from "@/types/botConfig";
import { cn, relativeTime } from "@/lib/utils";

interface ErrorLogProps {
  entries: ErrorLogEntry[];
  slots: PromptSlot[];
}

const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  retrieval_error: "Retrieval",
  model_timeout: "Timeout",
  parse_error: "Parse",
  rate_limit: "Rate Limit",
  unknown: "Unknown",
};

const ERROR_TYPE_COLORS: Record<ErrorType, string> = {
  retrieval_error: "bg-red-100 text-red-700",
  model_timeout: "bg-amber-100 text-amber-700",
  parse_error: "bg-purple-100 text-purple-700",
  rate_limit: "bg-orange-100 text-orange-700",
  unknown: "bg-gray-100 text-gray-700",
};

const ALL_TYPES: ErrorType[] = [
  "retrieval_error",
  "model_timeout",
  "parse_error",
  "rate_limit",
  "unknown",
];

export function ErrorLog({ entries, slots }: ErrorLogProps) {
  const [expanded, setExpanded] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ErrorType | "all">("all");

  const filtered =
    typeFilter === "all"
      ? entries
      : entries.filter((e) => e.type === typeFilter);

  const slotName = (slotId: string) =>
    slots.find((s) => s.id === slotId)?.name ?? slotId;

  const unresolvedCount = entries.filter((e) => !e.resolved).length;

  return (
    <div>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mb-4 flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
            Error Log
          </p>
          {unresolvedCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {unresolvedCount} unresolved
            </Badge>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <Card>
          <CardContent className="p-4">
            {/* Filter */}
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Filter:
              </span>
              <div className="flex gap-0.5 rounded-md bg-muted p-0.5">
                <FilterPill
                  active={typeFilter === "all"}
                  onClick={() => setTypeFilter("all")}
                >
                  All ({entries.length})
                </FilterPill>
                {ALL_TYPES.map((t) => {
                  const count = entries.filter((e) => e.type === t).length;
                  if (count === 0) return null;
                  return (
                    <FilterPill
                      key={t}
                      active={typeFilter === t}
                      onClick={() => setTypeFilter(t)}
                    >
                      {ERROR_TYPE_LABELS[t]} ({count})
                    </FilterPill>
                  );
                })}
              </div>
            </div>

            {/* Log entries */}
            <div className="max-h-[400px] space-y-1 overflow-y-auto">
              {filtered.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-start gap-3 rounded-md px-3 py-2 text-sm",
                    entry.resolved ? "opacity-50" : "",
                  )}
                >
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {relativeTime(entry.timestamp)}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "shrink-0 text-[9px]",
                      ERROR_TYPE_COLORS[entry.type],
                    )}
                  >
                    {ERROR_TYPE_LABELS[entry.type]}
                  </Badge>
                  <span className="flex-1 text-xs">{entry.message}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {slotName(entry.slotId)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={active ? "default" : "ghost"}
      size="sm"
      className={cn(
        "h-6 rounded-sm px-2 text-[10px] font-medium",
        active && "bg-primary-navy text-white hover:bg-primary-navy/90",
        !active && "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
