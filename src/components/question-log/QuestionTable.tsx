import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Question } from "@/types/question";
import { ratingMeta } from "@/config/ratingScale";
import { ownerName } from "@/config/jujuTaxonomy";
import {
  averageRating,
  cn,
  formatCategory,
  relativeTime,
} from "@/lib/utils";

interface QuestionTableProps {
  questions: Question[];
  isLoading: boolean;
  onSelectQuestion: (question: Question) => void;
  onResetFilters: () => void;
  totalFiltered: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

export function QuestionTable({
  questions,
  isLoading,
  onSelectQuestion,
  onResetFilters,
  totalFiltered,
  page,
  perPage,
  onPageChange,
}: QuestionTableProps) {
  if (isLoading) return <TableSkeleton />;
  if (questions.length === 0 && totalFiltered === 0)
    return <EmptyState onReset={onResetFilters} />;

  const totalPages = Math.ceil(totalFiltered / perPage);
  const start = page * perPage + 1;
  const end = Math.min((page + 1) * perPage, totalFiltered);

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className="w-[110px] text-on-surface-variant">Rating</TableHead>
              <TableHead className="text-on-surface-variant">Question</TableHead>
              <TableHead className="w-[200px] text-on-surface-variant">Category</TableHead>
              <TableHead className="hidden w-[150px] text-on-surface-variant md:table-cell">
                Escalation
              </TableHead>
              <TableHead className="hidden w-[160px] text-right text-on-surface-variant md:table-cell">
                Asked
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((q) => (
              <TableRow
                key={q.id}
                className="cursor-pointer border-line transition-colors hover:bg-page-accent/[0.05]"
                onClick={() => onSelectQuestion(q)}
              >
                <TableCell>
                  <RatingCell question={q} />
                </TableCell>

                <TableCell className="max-w-sm">
                  <p className="truncate font-medium">{q.questionText}</p>
                  <StatusChips question={q} />
                </TableCell>

                <TableCell>
                  <CategoryCell question={q} />
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  <EscalationCell question={q} />
                </TableCell>

                <TableCell className="hidden text-right md:table-cell">
                  <p className="text-sm font-medium">{q.asker.displayName}</p>
                  <p className="font-mono text-xs text-on-surface-faint">
                    {relativeTime(q.askedAt)}
                  </p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t border-line bg-card-soft px-5 py-3.5">
        <p className="text-xs text-on-surface-variant">
          Showing{" "}
          <span className="font-medium text-on-surface">
            {start}–{end}
          </span>{" "}
          of {totalFiltered}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="px-2 font-mono text-xs text-on-surface-variant">
            {page + 1} / {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function RatingCell({ question }: { question: Question }) {
  const avg = averageRating(question.ratings);
  if (avg === null) {
    return <span className="text-on-surface-faint/60">—</span>;
  }
  const meta = ratingMeta(avg);
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", meta.toneClass)}
      title={`${question.ratings.length} rating${question.ratings.length === 1 ? "" : "s"}`}
    >
      <span className="text-base leading-none">{meta.emoji}</span>
      <span className="font-mono text-xs">{avg.toFixed(1)}</span>
      <span className="text-[10px] text-on-surface-faint">
        ({question.ratings.length})
      </span>
    </span>
  );
}

function StatusChips({ question }: { question: Question }) {
  const chips: { label: string; className: string }[] = [];

  if (question.verifiedAnswer) {
    chips.push({
      label: "✍️ Owner-answered",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    });
  }
  if (question.verification) {
    chips.push({
      label: "✅ Verified",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    });
  }
  if (question.categoryReroute) {
    chips.push({
      label: "🔀 Rerouted",
      className: "border-purple-200 bg-purple-50 text-purple-700",
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c.label}
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium leading-tight",
            c.className,
          )}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

function CategoryCell({ question }: { question: Question }) {
  const reroute = question.categoryReroute;
  const original = question.category;

  if (!original && !reroute) {
    return <span className="text-xs text-on-surface-faint/60">—</span>;
  }

  if (reroute) {
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          ↺ {formatCategory(reroute.newCategory)}
        </span>
        {original && original !== reroute.newCategory && (
          <p className="text-[10px] text-on-surface-faint line-through">
            {formatCategory(original)}
          </p>
        )}
        {question.subCategory && (
          <p className="text-[11px] text-on-surface-faint">
            {question.subCategory}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <span className="inline-flex items-center rounded-full border border-line-strong bg-surface-deep px-2.5 py-0.5 text-xs font-medium text-on-surface-variant">
        {formatCategory(original)}
      </span>
      {question.subCategory && (
        <p className="text-[11px] text-on-surface-faint">
          {question.subCategory}
        </p>
      )}
    </div>
  );
}

function EscalationCell({ question }: { question: Question }) {
  const e = question.escalation;
  if (!e) {
    return <span className="text-xs text-on-surface-faint/60">—</span>;
  }
  if (e.type === "auto") {
    return (
      <div
        className="text-xs"
        title={`Auto-escalated · ${relativeTime(e.at)}`}
      >
        <span className="font-medium text-rose-600">🚨 Auto</span>
        <span className="ml-1 text-on-surface-faint">
          → {ownerName(e.toSlackId)}
        </span>
      </div>
    );
  }
  return (
    <div className="text-xs" title={`Escalated · ${relativeTime(e.at)}`}>
      <span className="font-medium text-amber-700">
        🚨 {ownerName(e.triggeredBySlackId)}
      </span>
      <span className="ml-1 text-on-surface-faint">
        → {ownerName(e.toSlackId)}
      </span>
    </div>
  );
}

function TableSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow className="border-line hover:bg-transparent">
            <TableHead className="w-[110px] text-on-surface-variant">Rating</TableHead>
            <TableHead className="text-on-surface-variant">Question</TableHead>
            <TableHead className="w-[200px] text-on-surface-variant">Category</TableHead>
            <TableHead className="hidden w-[150px] text-on-surface-variant md:table-cell">
              Escalation
            </TableHead>
            <TableHead className="hidden w-[160px] text-right text-on-surface-variant md:table-cell">
              Asked
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i} className="border-line">
              <TableCell>
                <div className="h-4 w-12 animate-pulse rounded bg-surface-deep" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-3/4 animate-pulse rounded bg-surface-deep" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-surface-deep" />
              </TableCell>
              <TableCell>
                <div className="h-6 w-24 animate-pulse rounded bg-surface-deep" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="h-4 w-20 animate-pulse rounded bg-surface-deep" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="ml-auto h-4 w-20 animate-pulse rounded bg-surface-deep" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <Card className="p-12 text-center">
      <p className="text-on-surface-variant">
        No questions match your filters.
      </p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onReset}>
        Reset filters
      </Button>
    </Card>
  );
}
