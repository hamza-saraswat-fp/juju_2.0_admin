import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  BookOpen,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import {
  cn,
  confidenceTier,
  confidenceColor,
  relativeTime,
  deriveFeedbackState,
  formatCategory,
} from "@/lib/utils";

// ── Props ───────────────────────────────────────────────────

interface QuestionTableProps {
  questions: Question[];
  isLoading: boolean;
  onSelectQuestion: (question: Question) => void;
  onResetFilters: () => void;
  // Pagination
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
  if (questions.length === 0 && totalFiltered === 0) return <EmptyState onReset={onResetFilters} />;

  const totalPages = Math.ceil(totalFiltered / perPage);
  const start = page * perPage + 1;
  const end = Math.min((page + 1) * perPage, totalFiltered);

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Feedback</TableHead>
              <TableHead>Question</TableHead>
              <TableHead className="w-[120px]">Confidence</TableHead>
              <TableHead className="w-[130px]">Category</TableHead>
              <TableHead className="hidden w-[120px] md:table-cell">
                Sources
              </TableHead>
              <TableHead className="hidden w-[140px] text-right md:table-cell">
                Activity
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
                {/* Feedback — dominant verdict at a glance.
                    Admin can see full breakdown in the drawer (Phase 3).
                    Shows dominant icon + count. Mixed = both counts. None = dash. */}
                <TableCell>
                  <FeedbackCell votes={q.thumbsVotes} />
                </TableCell>

                {/* Question text */}
                <TableCell className="max-w-sm">
                  <p className="truncate font-medium">{q.questionText}</p>
                  {q.needsReview && (
                    <Badge
                      variant="outline"
                      className="mt-1 border-amber-300 bg-amber-50 text-amber-700"
                    >
                      Needs Review
                    </Badge>
                  )}
                </TableCell>

                {/* Confidence */}
                <TableCell>
                  <ConfidenceBadge score={q.confidence} />
                </TableCell>

                {/* Category */}
                <TableCell>
                  <CategoryBadge question={q} />
                </TableCell>

                {/* Sources (hidden on mobile) */}
                <TableCell className="hidden md:table-cell">
                  <SourcesCell sources={q.sources} />
                </TableCell>

                {/* Activity (hidden on mobile) */}
                <TableCell className="hidden text-right md:table-cell">
                  <p className="text-sm font-medium">{q.asker.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {relativeTime(q.askedAt)}
                  </p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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

// ── Cell sub-components ─────────────────────────────────────

function FeedbackCell({ votes }: { votes: Question["thumbsVotes"] }) {
  const state = deriveFeedbackState(votes);
  const ups = votes.filter((v) => v.vote === "up").length;
  const downs = votes.filter((v) => v.vote === "down").length;

  if (state === "none") {
    return <Minus className="h-4 w-4 text-muted-foreground/40" />;
  }
  if (state === "positive") {
    return (
      <span className="inline-flex items-center gap-1 text-green-600">
        <ThumbsUp className="h-4 w-4" />
        <span className="font-mono text-xs">{ups}</span>
      </span>
    );
  }
  if (state === "negative") {
    return (
      <span className="inline-flex items-center gap-1 text-red-600">
        <ThumbsDown className="h-4 w-4" />
        <span className="font-mono text-xs">{downs}</span>
      </span>
    );
  }
  // mixed
  return (
    <span className="inline-flex items-center gap-1 text-amber-600">
      <ThumbsUp className="h-3.5 w-3.5" />
      <span className="font-mono text-xs">{ups}</span>
      <span className="text-muted-foreground">/</span>
      <ThumbsDown className="h-3.5 w-3.5" />
      <span className="font-mono text-xs">{downs}</span>
    </span>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const tier = confidenceTier(score);
  const colorClasses = confidenceColor(tier);
  return (
    <Badge variant="secondary" className={cn("font-mono", colorClasses)}>
      {score}% · {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </Badge>
  );
}

function CategoryBadge({ question }: { question: Question }) {
  const effective = question.manualCategoryOverride ?? question.aiCategory;
  const label = formatCategory(effective);

  return (
    <div>
      <Badge variant="outline">{label}</Badge>
      {question.manualCategoryOverride && (
        <span className="ml-1 text-[10px] text-primary-blue">override</span>
      )}
    </div>
  );
}

function SourcesCell({ sources }: { sources: Question["sources"] }) {
  if (sources.length === 0) {
    return <span className="text-xs text-muted-foreground/50">—</span>;
  }
  const hasKC = sources.some((s) => s.sourceType === "knowledge_center");
  const hasConfluence = sources.some((s) => s.sourceType === "confluence");

  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      {hasKC && (
        <span className="inline-flex items-center gap-0.5 text-blue-600">
          <BookOpen className="h-3.5 w-3.5" />
          <span className="text-[9px] font-medium">KC</span>
        </span>
      )}
      {hasConfluence && (
        <span className="inline-flex items-center gap-0.5 text-amber-600">
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="text-[9px] font-medium">Conf</span>
        </span>
      )}
      <span className="text-xs">
        {sources.length} source{sources.length !== 1 && "s"}
      </span>
    </span>
  );
}

// ── Skeleton ────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Feedback</TableHead>
            <TableHead>Question</TableHead>
            <TableHead className="w-[120px]">Confidence</TableHead>
            <TableHead className="w-[130px]">Category</TableHead>
            <TableHead className="hidden w-[120px] md:table-cell">
              Sources
            </TableHead>
            <TableHead className="hidden w-[140px] text-right md:table-cell">
              Activity
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="h-4 w-8 animate-pulse rounded bg-muted" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
              </TableCell>
              <TableCell>
                <div className="h-6 w-16 animate-pulse rounded bg-muted" />
              </TableCell>
              <TableCell>
                <div className="h-6 w-20 animate-pulse rounded bg-muted" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
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

// ── Empty state ─────────────────────────────────────────────

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
