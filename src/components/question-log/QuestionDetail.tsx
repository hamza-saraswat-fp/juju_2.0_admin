import {
  ExternalLink,
  BookOpen,
  FolderOpen,
  ThumbsUp,
  ThumbsDown,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CATEGORIES, CURRENT_ADMIN } from "@/types/question";
import type { Category, Question, ThumbsVote } from "@/types/question";
import {
  cn,
  relativeTime,
  formatMs,
  confidenceTier,
  confidenceColor,
  formatCategory,
} from "@/lib/utils";

// ── Props ───────────────────────────────────────────────────

interface QuestionDetailProps {
  question: Question;
  adminVotes: ThumbsVote[];
  onVote: (value: "up" | "down") => void;
  onOverrideCategory: (category: Category | null) => void;
}

export function QuestionDetail({
  question,
  adminVotes,
  onVote,
  onOverrideCategory,
}: QuestionDetailProps) {
  const merged = mergeVotes(question.thumbsVotes, adminVotes);
  const ups = merged.filter((v) => v.vote === "up").length;
  const downs = merged.filter((v) => v.vote === "down").length;
  const currentAdminVote = merged.find(
    (v) => v.adminId === CURRENT_ADMIN.id,
  )?.vote;

  const effectiveCategory =
    question.manualCategoryOverride ?? question.aiCategory;
  const tier = confidenceTier(question.confidence);

  return (
    <div className="space-y-6">
      {/* 1. Asker + timestamp + Slack link */}
      <div className="flex items-center gap-3">
        <span className="font-medium">{question.asker.name}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {relativeTime(question.askedAt)}
        </span>
        <a
          href={question.slackThreadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Slack thread
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <Separator />

      {/* 2. Question text + thread context */}
      <div>
        <SectionLabel>Question</SectionLabel>
        <p className="mt-2 text-sm leading-relaxed">{question.questionText}</p>
        {question.threadContext && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
              Thread context
            </summary>
            <p className="mt-1 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              {question.threadContext}
            </p>
          </details>
        )}
      </div>

      <Separator />

      {/* 3. Answer text */}
      <div>
        <SectionLabel>AI Response</SectionLabel>
        {question.answerText ? (
          <div
            className="mt-2 rounded-md bg-muted/30 p-4 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(question.answerText),
            }}
          />
        ) : (
          <div className="mt-2 rounded-md border border-dashed p-6 text-center">
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 text-amber-700"
            >
              Unanswered
            </Badge>
            <p className="mt-2 text-sm text-muted-foreground">
              No answer generated for this question.
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* 4. Sources */}
      <div>
        <SectionLabel>Sources</SectionLabel>
        {question.sources.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {question.sources.map((source) => (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                {source.sourceType === "knowledge_center" ? (
                  <span className="inline-flex items-center gap-0.5 text-blue-600">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-semibold">KC</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-amber-600">
                    <FolderOpen className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-semibold">Conf</span>
                  </span>
                )}
                {source.title}
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No sources</p>
        )}
      </div>

      <Separator />

      {/* 5. Category + override dropdown */}
      <div>
        <SectionLabel>Category</SectionLabel>
        <div className="mt-2 flex items-center gap-3">
          <div>
            <Badge variant="outline">{formatCategory(effectiveCategory)}</Badge>
            <span className="ml-2 text-[11px] text-muted-foreground">
              {question.manualCategoryOverride
                ? "Admin override"
                : "AI suggested"}
            </span>
          </div>
          <select
            value={question.manualCategoryOverride ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              onOverrideCategory(val === "" ? null : (val as Category));
            }}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
          >
            <option value="">
              AI Default ({formatCategory(question.aiCategory)})
            </option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {formatCategory(cat)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Separator />

      {/* 6. Confidence + latency */}
      <div>
        <SectionLabel>Metrics</SectionLabel>
        <div className="mt-2 flex items-center gap-4">
          <Badge variant="secondary" className={cn("font-mono", confidenceColor(tier))}>
            {question.confidence}% · {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </Badge>
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formatMs(question.latencyMs)}
          </span>
        </div>
      </div>

      <Separator />

      {/* 7. Aggregate thumbs + voter list */}
      <div>
        <SectionLabel>Feedback</SectionLabel>
        <div className="mt-2 flex items-center gap-4">
          <span className="inline-flex items-center gap-1 text-green-600">
            <ThumbsUp className="h-4 w-4" />
            <span className="font-mono text-sm">{ups}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-red-600">
            <ThumbsDown className="h-4 w-4" />
            <span className="font-mono text-sm">{downs}</span>
          </span>
        </div>
        {merged.length > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Voted by: {merged.map((v) => v.adminName).join(", ")}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">No votes yet</p>
        )}
      </div>

      {/* 8. Admin vote toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5",
            currentAdminVote === "up" &&
              "border-green-300 bg-green-100 text-green-700 hover:bg-green-100",
          )}
          onClick={() => onVote("up")}
        >
          <ThumbsUp className="h-4 w-4" />
          Vote up
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5",
            currentAdminVote === "down" &&
              "border-red-300 bg-red-100 text-red-700 hover:bg-red-100",
          )}
          onClick={() => onVote("down")}
        >
          <ThumbsDown className="h-4 w-4" />
          Vote down
        </Button>
        {currentAdminVote && (
          <span className="text-xs text-muted-foreground">
            You voted {currentAdminVote === "up" ? "👍" : "👎"}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

/** Merge persisted votes (from mock/Supabase) with session votes (from useThumbsVote).
 *  Deduplicates by adminId — session vote wins on conflict. */
function mergeVotes(
  persisted: ThumbsVote[],
  session: ThumbsVote[],
): ThumbsVote[] {
  const byAdmin = new Map<string, ThumbsVote>();
  for (const v of persisted) byAdmin.set(v.adminId, v);
  for (const v of session) byAdmin.set(v.adminId, v);
  return Array.from(byAdmin.values());
}

/** Lightweight markdown: **bold** → <strong>, *italic* → <em>, \n → <br> */
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br />");
}
