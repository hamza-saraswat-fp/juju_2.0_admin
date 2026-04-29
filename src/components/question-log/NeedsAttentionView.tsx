import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ownerName } from "@/config/jujuTaxonomy";
import type { Question } from "@/types/question";
import { cn, relativeTime } from "@/lib/utils";

// ─── Tunable thresholds ───────────────────────────────────────────────
const SLA_HOURS = 24;
const PO_TAGGED_THRESHOLD = 3;
const PO_LOOKBACK_DAYS = 7;
const REPEAT_QUESTIONS_LOOKBACK_DAYS = 30;

// ─── Types ────────────────────────────────────────────────────────────
interface OpenEscalation {
  id: string;
  questionText: string;
  hoursOverdue: number;
  toName: string;
  asker: string;
}

interface OvertaggedPO {
  slackId: string;
  name: string;
  taggedCount: number;
  oldestTagAt: string;
}

interface RepeatItem {
  questionText: string;
  count: number;
  oldestAt: string;
}

interface NeedsAttentionData {
  openEscalations: OpenEscalation[];
  overtaggedPOs: OvertaggedPO[];
  repeatQuestions: RepeatItem[];
}

// ─── Computation ──────────────────────────────────────────────────────
export function computeNeedsAttention(questions: Question[]): NeedsAttentionData {
  const now = Date.now();
  const slaCutoff = now - SLA_HOURS * 60 * 60 * 1000;
  const poLookbackCutoff = now - PO_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const repeatLookbackCutoff =
    now - REPEAT_QUESTIONS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

  // 1. Open escalations past SLA
  const openEscalations: OpenEscalation[] = [];
  for (const q of questions) {
    if (!q.escalation) continue;
    if (q.verifiedAnswer) continue;
    const escAt = new Date(q.escalation.at).getTime();
    if (escAt > slaCutoff) continue; // still inside SLA
    openEscalations.push({
      id: q.id,
      questionText: q.questionText,
      hoursOverdue: (now - escAt) / (60 * 60 * 1000) - SLA_HOURS,
      toName: ownerName(q.escalation.toSlackId) ?? q.escalation.toSlackId,
      asker: q.asker.displayName,
    });
  }
  openEscalations.sort((a, b) => b.hoursOverdue - a.hoursOverdue);

  // 2. POs over-tagged in last 7 days with zero verified responses
  // "Verified by this PO" = a verifiedAnswer with this PO's slackId in the
  // 7-day window. We use the same ownerSlackId (verifiedAnswer.ownerSlackId)
  // since that's who actually responded.
  const tagsByPO = new Map<
    string,
    { count: number; oldestAt: string }
  >();
  const verifiedByPO = new Map<string, number>();
  for (const q of questions) {
    if (q.escalation) {
      const escAt = new Date(q.escalation.at).getTime();
      if (escAt >= poLookbackCutoff) {
        // escalated_to may be comma-separated
        for (const raw of q.escalation.toSlackId.split(",")) {
          const id = raw.trim();
          if (!id) continue;
          const cur = tagsByPO.get(id);
          if (!cur || q.escalation.at < cur.oldestAt) {
            tagsByPO.set(id, {
              count: (cur?.count ?? 0) + 1,
              oldestAt: q.escalation.at,
            });
          } else {
            cur.count += 1;
            tagsByPO.set(id, cur);
          }
        }
      }
    }
    if (q.verifiedAnswer) {
      const subAt = new Date(q.verifiedAnswer.submittedAt).getTime();
      if (subAt >= poLookbackCutoff) {
        const id = q.verifiedAnswer.ownerSlackId;
        if (id) verifiedByPO.set(id, (verifiedByPO.get(id) ?? 0) + 1);
      }
    }
  }
  const overtaggedPOs: OvertaggedPO[] = [];
  for (const [slackId, { count, oldestAt }] of tagsByPO) {
    if (count <= PO_TAGGED_THRESHOLD) continue;
    if ((verifiedByPO.get(slackId) ?? 0) > 0) continue; // they did respond
    overtaggedPOs.push({
      slackId,
      name: ownerName(slackId) ?? slackId,
      taggedCount: count,
      oldestTagAt: oldestAt,
    });
  }
  overtaggedPOs.sort((a, b) => b.taggedCount - a.taggedCount);

  // 3. Repeat questions (3+ in last 30 days) with no verified answer on any
  const byText = new Map<
    string,
    { count: number; oldestAt: string; anyVerified: boolean }
  >();
  for (const q of questions) {
    const text = q.questionText.trim();
    if (!text) continue;
    const askedAt = new Date(q.askedAt).getTime();
    if (askedAt < repeatLookbackCutoff) continue;
    const cur = byText.get(text);
    const verified = q.verifiedAnswer !== null;
    if (cur) {
      cur.count += 1;
      if (q.askedAt < cur.oldestAt) cur.oldestAt = q.askedAt;
      cur.anyVerified = cur.anyVerified || verified;
    } else {
      byText.set(text, {
        count: 1,
        oldestAt: q.askedAt,
        anyVerified: verified,
      });
    }
  }
  const repeatQuestions: RepeatItem[] = [];
  for (const [text, info] of byText) {
    if (info.count < 3) continue;
    if (info.anyVerified) continue;
    repeatQuestions.push({
      questionText: text,
      count: info.count,
      oldestAt: info.oldestAt,
    });
  }
  repeatQuestions.sort((a, b) => b.count - a.count);

  return { openEscalations, overtaggedPOs, repeatQuestions };
}

// ─── Component ────────────────────────────────────────────────────────
interface Props {
  questions: Question[];
  onResetFilters: () => void;
  onSelectQuestionText: (text: string) => void;
}

export function NeedsAttentionView({
  questions,
  onResetFilters,
  onSelectQuestionText,
}: Props) {
  const data = useMemo(() => computeNeedsAttention(questions), [questions]);
  const total =
    data.openEscalations.length +
    data.overtaggedPOs.length +
    data.repeatQuestions.length;

  if (total === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-on-surface-variant">
          No items need attention right now. ✨
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onResetFilters}
        >
          Back to all questions
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Section
        title="Open escalations past SLA"
        subtitle={`Tagged > ${SLA_HOURS}h ago, no verified answer yet`}
        count={data.openEscalations.length}
        accent="rose"
      >
        {data.openEscalations.length === 0 ? (
          <EmptyRow>None — every escalation is inside SLA.</EmptyRow>
        ) : (
          <ul>
            {data.openEscalations.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 border-t border-line px-5 py-3"
              >
                <span className="flex-1 truncate text-sm font-medium">
                  {e.questionText}
                </span>
                <span className="font-mono text-xs text-on-surface-variant">
                  {e.toName}
                </span>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono text-xs text-rose-700">
                  {Math.round(e.hoursOverdue)}h overdue
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="POs over-tagged with no response"
        subtitle={`Tagged > ${PO_TAGGED_THRESHOLD} times in last ${PO_LOOKBACK_DAYS} days, zero verified answers in window`}
        count={data.overtaggedPOs.length}
        accent="amber"
      >
        {data.overtaggedPOs.length === 0 ? (
          <EmptyRow>No PO is over-tagged without a response.</EmptyRow>
        ) : (
          <ul>
            {data.overtaggedPOs.map((p) => (
              <li
                key={p.slackId}
                className="flex items-center gap-3 border-t border-line px-5 py-3"
              >
                <span className="flex-1 text-sm font-medium">{p.name}</span>
                <span className="text-xs text-on-surface-faint">
                  oldest tag {relativeTime(p.oldestTagAt)}
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-xs text-amber-700">
                  {p.taggedCount}× tagged
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Repeat questions without a verified answer"
        subtitle={`Asked 3+ times in last ${REPEAT_QUESTIONS_LOOKBACK_DAYS} days · click to filter the table below`}
        count={data.repeatQuestions.length}
        accent="violet"
      >
        {data.repeatQuestions.length === 0 ? (
          <EmptyRow>No repeating unanswered questions right now.</EmptyRow>
        ) : (
          <ul>
            {data.repeatQuestions.map((r, i) => (
              <li key={i}>
                <button
                  onClick={() => onSelectQuestionText(r.questionText)}
                  className="flex w-full items-center gap-3 border-t border-line px-5 py-3 text-left transition-colors hover:bg-page-accent/5"
                >
                  <span className="flex-1 truncate text-sm font-medium">
                    {r.questionText}
                  </span>
                  <span className="text-xs text-on-surface-faint">
                    first asked {relativeTime(r.oldestAt)}
                  </span>
                  <span className="rounded-full border border-line-strong bg-surface-deep px-2 py-0.5 font-mono text-xs text-on-surface-variant">
                    {r.count}×
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ─── Section primitive ───────────────────────────────────────────────
function Section({
  title,
  subtitle,
  count,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  accent: "rose" | "amber" | "violet";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const accentMap: Record<typeof accent, string> = {
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
  };
  return (
    <Card className="overflow-hidden p-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          render={
            <button className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-card-soft">
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-on-surface-variant transition-transform",
                  !open && "-rotate-90",
                )}
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {subtitle}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
                  count === 0
                    ? "border-line-strong bg-surface-deep text-on-surface-variant"
                    : accentMap[accent],
                )}
              >
                {count}
              </span>
            </button>
          }
        />
        <CollapsiblePanel>{children}</CollapsiblePanel>
      </Collapsible>
    </Card>
  );
}

function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <p className="border-t border-line px-5 py-4 text-sm text-on-surface-faint">
      {children}
    </p>
  );
}
