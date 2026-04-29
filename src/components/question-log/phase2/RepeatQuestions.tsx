import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TimeToggle } from "@/components/ui/time-toggle";
import { useQuestionPhase2 } from "@/hooks/useQuestionPhase2";
import type { QuestionFilters, TimeRange } from "@/lib/questionFilters";
import { cn } from "@/lib/utils";

interface Props {
  filters: QuestionFilters;
  className?: string;
  onSelect: (text: string) => void;
}

export function RepeatQuestions({ filters, className, onSelect }: Props) {
  const [range, setRange] = useState<TimeRange>("7d");
  const { data: rpcData, isLoading } = useQuestionPhase2({
    ...filters,
    timeRange: range,
  });
  const data = rpcData?.repeat_questions ?? [];

  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              Repeat questions
            </h3>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              Asked 3+ times · click to filter the table below
            </p>
          </div>
          <TimeToggle value={range} onChange={setRange} />
        </div>
      </div>

      {isLoading ? (
        <div className="m-5 h-[140px] animate-pulse rounded-lg bg-surface-deep" />
      ) : data.length === 0 ? (
        <div className="flex h-[140px] items-center justify-center text-sm text-on-surface-faint">
          Not enough data yet
        </div>
      ) : (
        <ul className="border-t border-line">
          {data.map((q, i) => (
            <li key={i}>
              <button
                onClick={() => onSelect(q.question)}
                className="flex w-full items-center gap-3 border-b border-line px-5 py-3 text-left transition-colors last:border-0 hover:bg-page-accent/5"
              >
                <span className="flex-1 truncate text-sm">{q.question}</span>
                <span className="rounded-full border border-line-strong bg-surface-deep px-2 py-0.5 font-mono text-xs text-on-surface-variant">
                  {q.count}×
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-faint" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
