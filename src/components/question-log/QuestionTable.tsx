import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Rating</TableHead>
              <TableHead>Question</TableHead>
              <TableHead className="w-[200px]">Category</TableHead>
              <TableHead className="hidden w-[150px] md:table-cell">
                Escalation
              </TableHead>
              <TableHead className="hidden w-[160px] text-right md:table-cell">
                Asked
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((q) => (
              <TableRow
                key={q.id}
                className="cursor-pointer"
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
                  <p className="text-sm font-medium">
                    {q.asker.displayName}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {relativeTime(q.askedAt)}
                  </p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {start}–{end} of {totalFiltered}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
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
    </div>
  );
}

function RatingCell({ question }: { question: Question }) {
  const avg = averageRating(question.ratings);
  if (avg === null) {
    return <span className="text-muted-foreground/40">—</span>;
  }
  const meta = ratingMeta(avg);
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", meta.toneClass)}
      title={`${question.ratings.length} rating${question.ratings.length === 1 ? "" : "s"}`}
    >
      <span className="text-base leading-none">{meta.emoji}</span>
      <span className="font-mono text-xs">{avg.toFixed(1)}</span>
      <span className="text-[10px] text-muted-foreground">
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
      className: "border-blue-300 bg-blue-50 text-blue-700",
    });
  }
  if (question.verification) {
    chips.push({
      label: "✅ Verified",
      className: "border-green-300 bg-green-50 text-green-700",
    });
  }
  if (question.categoryReroute) {
    chips.push({
      label: "🔀 Rerouted",
      className: "border-purple-300 bg-purple-50 text-purple-700",
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {chips.map((c) => (
        <Badge key={c.label} variant="outline" className={c.className}>
          {c.label}
        </Badge>
      ))}
    </div>
  );
}

function CategoryCell({ question }: { question: Question }) {
  const reroute = question.categoryReroute;
  const original = question.category;

  if (!original && !reroute) {
    return <span className="text-xs text-muted-foreground/50">—</span>;
  }

  if (reroute) {
    return (
      <div className="space-y-0.5">
        <div className="flex items-center gap-1">
          <Badge
            variant="outline"
            className="border-green-300 bg-green-50 text-green-700"
          >
            ↺ {formatCategory(reroute.newCategory)}
          </Badge>
        </div>
        {original && original !== reroute.newCategory && (
          <p className="text-[10px] text-muted-foreground line-through">
            {formatCategory(original)}
          </p>
        )}
        {question.subCategory && (
          <p className="text-[11px] text-muted-foreground">
            {question.subCategory}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <Badge variant="outline">{formatCategory(original)}</Badge>
      {question.subCategory && (
        <p className="text-[11px] text-muted-foreground">
          {question.subCategory}
        </p>
      )}
    </div>
  );
}

function EscalationCell({ question }: { question: Question }) {
  const e = question.escalation;
  if (!e) {
    return <span className="text-xs text-muted-foreground/40">—</span>;
  }
  if (e.type === "auto") {
    return (
      <div
        className="text-xs"
        title={`Auto-escalated · ${relativeTime(e.at)}`}
      >
        <span className="font-medium text-red-600">🚨 Auto</span>
        <span className="ml-1 text-muted-foreground">
          → {ownerName(e.toSlackId)}
        </span>
      </div>
    );
  }
  return (
    <div className="text-xs" title={`Escalated · ${relativeTime(e.at)}`}>
      <span className="font-medium text-orange-600">
        🚨 {ownerName(e.triggeredBySlackId)}
      </span>
      <span className="ml-1 text-muted-foreground">
        → {ownerName(e.toSlackId)}
      </span>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">Rating</TableHead>
            <TableHead>Question</TableHead>
            <TableHead className="w-[200px]">Category</TableHead>
            <TableHead className="hidden w-[150px] md:table-cell">
              Escalation
            </TableHead>
            <TableHead className="hidden w-[160px] text-right md:table-cell">
              Asked
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
              </TableCell>
              <TableCell>
                <div className="h-6 w-24 animate-pulse rounded bg-muted" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center">
      <p className="text-muted-foreground">
        No questions match your filters.
      </p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onReset}>
        Reset filters
      </Button>
    </div>
  );
}
