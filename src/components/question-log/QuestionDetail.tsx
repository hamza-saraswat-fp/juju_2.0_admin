import {
  ExternalLink,
  BookOpen,
  FolderOpen,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type {
  Escalation,
  Question,
  Rating,
  Source,
} from "@/types/question";
import { ratingMeta } from "@/config/ratingScale";
import { CC_ALL, ownerName } from "@/config/jujuTaxonomy";
import {
  averageRating,
  cn,
  formatCategory,
  formatMs,
  ratingBreakdown,
  relativeTime,
} from "@/lib/utils";

interface QuestionDetailProps {
  question: Question;
}

export function QuestionDetail({ question }: QuestionDetailProps) {
  return (
    <div className="space-y-6">
      <Header question={question} />

      <Separator />

      <Routing question={question} />

      {question.escalation && (
        <>
          <Separator />
          <EscalationCard escalation={question.escalation} />
        </>
      )}

      {question.verifiedAnswer && (
        <>
          <Separator />
          <VerifiedAnswerSection question={question} />
        </>
      )}

      {question.verification && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">
          ✅ Verified accurate by {question.verification.verifierDisplayName} ·{" "}
          {relativeTime(question.verification.verifiedAt)}
        </p>
      )}

      <Separator />

      <QuestionAndAnswer question={question} />

      <Separator />

      <SourcesSection question={question} />

      <Separator />

      <RatingsTimeline ratings={question.ratings} />

      {question.searchQueries !== null && question.searchQueries !== undefined && (
        <>
          <Separator />
          <SearchQueriesDebug data={question.searchQueries} />
        </>
      )}
    </div>
  );
}

// ── Sections ───────────────────────────────────────────────────────

function Header({ question }: { question: Question }) {
  return (
    <div>
      <p className="text-lg font-medium leading-snug">
        {question.questionText}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          Asked by <span className="font-medium text-foreground">{question.asker.displayName}</span>
        </span>
        <span>{relativeTime(question.askedAt)}</span>
        {question.latencyMs !== null && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatMs(question.latencyMs)}
          </span>
        )}
        {question.slackThreadUrl && (
          <a
            href={question.slackThreadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Slack thread
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function Routing({ question }: { question: Question }) {
  const reroute = question.categoryReroute;
  const original = question.category;

  return (
    <div>
      <SectionLabel>Routing</SectionLabel>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {reroute ? (
          <>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Classifier
            </span>
            <Badge variant="outline" className="line-through">
              {formatCategory(original)}
            </Badge>
            <span className="text-muted-foreground">→</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Rerouted
            </span>
            <Badge
              variant="outline"
              className="border-green-300 bg-green-50 text-green-700"
            >
              ↺ {formatCategory(reroute.newCategory)}
            </Badge>
            {question.subCategory && (
              <span className="text-sm text-muted-foreground">
                · {question.subCategory}
              </span>
            )}
            <p className="ml-2 text-[11px] text-muted-foreground">
              by {reroute.rerouterDisplayName} ·{" "}
              {relativeTime(reroute.reroutedAt)}
            </p>
          </>
        ) : (
          <>
            <Badge variant="outline">{formatCategory(original)}</Badge>
            {question.subCategory && (
              <span className="text-sm text-muted-foreground">
                · {question.subCategory}
              </span>
            )}
            {question.categoryConfidence !== null && (
              <span className="text-[11px] text-muted-foreground">
                ({Math.round(question.categoryConfidence * 100)}% confidence)
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EscalationCard({ escalation }: { escalation: Escalation }) {
  const isAuto = escalation.type === "auto";
  return (
    <div
      className={cn(
        "rounded-md border p-4",
        isAuto
          ? "border-red-300 bg-red-50"
          : "border-orange-300 bg-orange-50",
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle
          className={cn(
            "h-4 w-4",
            isAuto ? "text-red-600" : "text-orange-600",
          )}
        />
        <span
          className={cn(
            "text-sm font-semibold",
            isAuto ? "text-red-800" : "text-orange-800",
          )}
        >
          {isAuto ? "🚨 Auto-escalated" : "🚨 Escalated"}
        </span>
        <span className="text-xs text-muted-foreground">
          · {relativeTime(escalation.at)}
        </span>
      </div>
      <div className="mt-2 space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">Pinged: </span>
          <span className="font-medium">
            {ownerName(escalation.toSlackId)}
          </span>
          <span className="ml-2 text-muted-foreground">
            cc {CC_ALL.map(ownerName).join(", ")}
          </span>
        </p>
        {!isAuto && escalation.triggeredBySlackId && (
          <p>
            <span className="text-muted-foreground">Triggered by: </span>
            <span className="font-medium">
              {ownerName(escalation.triggeredBySlackId)}
            </span>
          </p>
        )}
        {isAuto && escalation.failureType && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge
              variant="outline"
              className="border-red-300 bg-white text-red-700"
            >
              {escalation.failureType}
            </Badge>
            {escalation.failureConfidence !== null && (
              <span className="text-muted-foreground">
                {(escalation.failureConfidence * 100).toFixed(0)}% confidence
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function VerifiedAnswerSection({ question }: { question: Question }) {
  const va = question.verifiedAnswer!;
  return (
    <div>
      <SectionLabel>Verified answer</SectionLabel>
      <div className="mt-2 rounded-md border border-blue-300 bg-blue-50 p-4">
        <p className="text-[11px] text-blue-800">
          ✍️ from {va.ownerDisplayName} · {relativeTime(va.submittedAt)}
        </p>
        <div
          className="mt-2 text-sm leading-relaxed text-foreground"
          dangerouslySetInnerHTML={{
            __html: renderSlackMrkdwn(va.text),
          }}
        />
        {va.manualCategoryOverride && (
          <p className="mt-3 text-xs text-blue-800">
            🔀 Routed to{" "}
            <span className="font-medium">
              {formatCategory(va.manualCategoryOverride)}
            </span>{" "}
            by {va.ownerDisplayName}
          </p>
        )}
      </div>
    </div>
  );
}

function QuestionAndAnswer({ question }: { question: Question }) {
  return (
    <div>
      <SectionLabel>Original AI response</SectionLabel>
      {question.answerText ? (
        <div
          className="mt-2 rounded-md bg-muted/30 p-4 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: renderSlackMrkdwn(question.answerText),
          }}
        />
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No answer recorded.</p>
      )}
      {question.answerConfidence !== null && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Answer confidence: {Math.round(question.answerConfidence * 100)}%
        </p>
      )}
    </div>
  );
}

function SourcesSection({ question }: { question: Question }) {
  const allSources = [...question.mintlifySources, ...question.confluenceSources];
  return (
    <div>
      <SectionLabel>Sources</SectionLabel>
      {allSources.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {allSources.map((source) => (
            <SourceLink key={source.id} source={source} />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No sources</p>
      )}
    </div>
  );
}

function SourceLink({ source }: { source: Source }) {
  return (
    <a
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
      <span className="max-w-xs truncate">{source.title}</span>
      <ExternalLink className="h-3 w-3 text-muted-foreground" />
    </a>
  );
}

function RatingsTimeline({ ratings }: { ratings: Rating[] }) {
  if (ratings.length === 0) {
    return (
      <div>
        <SectionLabel>Ratings</SectionLabel>
        <p className="mt-2 text-sm text-muted-foreground">No ratings yet</p>
      </div>
    );
  }

  const breakdown = ratingBreakdown(ratings);
  const avg = averageRating(ratings)!;
  const meta = ratingMeta(avg);

  return (
    <div>
      <SectionLabel>Ratings</SectionLabel>
      <div className="mt-2 flex items-center gap-3 text-sm">
        <span className={cn("inline-flex items-center gap-1.5", meta.toneClass)}>
          <span className="text-lg leading-none">{meta.emoji}</span>
          <span className="font-mono">{avg.toFixed(1)}</span>
        </span>
        <span className="text-muted-foreground">
          {breakdown.count} rating{breakdown.count === 1 ? "" : "s"}
        </span>
        <span className="text-xs text-muted-foreground">
          {([5, 4, 3, 2, 1] as const)
            .filter((s) => breakdown.byStars[s] > 0)
            .map((s) => `${ratingMeta(s).emoji}×${breakdown.byStars[s]}`)
            .join(" ")}
        </span>
      </div>
      <ol className="mt-3 space-y-2">
        {ratings.map((r) => {
          const m = ratingMeta(r.stars);
          return (
            <li
              key={r.id}
              className="flex items-start gap-3 rounded-md border bg-card p-3 text-sm"
            >
              <span className={cn("text-2xl leading-none", m.toneClass)}>
                {m.emoji}
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-medium">{r.raterDisplayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(r.ratedAt)}
                  </span>
                  {r.legacy && (
                    <span className="text-[10px] text-muted-foreground">
                      via 👍/👎
                    </span>
                  )}
                </div>
                {r.writtenFeedback && (
                  <p className="mt-1 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    {r.writtenFeedback}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SearchQueriesDebug({ data }: { data: unknown }) {
  return (
    <details>
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Search queries (debug)
      </summary>
      <pre className="mt-2 overflow-x-auto rounded-md bg-muted/40 p-3 text-[11px]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

// Slack-style mrkdwn → HTML. *bold*, _italic_, ~strike~, `code`, line breaks.
function renderSlackMrkdwn(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
    .replace(/_([^_\n]+)_/g, "<em>$1</em>")
    .replace(/~([^~\n]+)~/g, "<s>$1</s>")
    .replace(/\n/g, "<br />");
}
