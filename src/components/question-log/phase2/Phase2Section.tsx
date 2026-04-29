import type { QuestionFilters } from "@/lib/questionFilters";
import { EscalationComposition } from "./EscalationComposition";
import { EscalationRateByCategory } from "./EscalationRateByCategory";
import { POLeaderboard } from "./POLeaderboard";
import { RepeatQuestions } from "./RepeatQuestions";
import { TopCategories } from "./TopCategories";
import { VolumeOverTime } from "./VolumeOverTime";

interface Props {
  filters: QuestionFilters;
  onRepeatQuestionClick: (text: string) => void;
}

/**
 * Tier 2: 6 charts arranged across 3 rows. Each card owns its time-range
 * state and fetches independently — see individual card components for the
 * useQuestionPhase2 calls.
 *
 * Layout:
 *   row 1 (2 cols)        Volume               | Escalation Composition
 *   row 2 (2 cols)        Top Categories       | Escalation Rate by Cat
 *   row 3 (3 cols, 2:1)   PO Leaderboard ×2    | Repeat Questions
 */
export function Phase2Section({ filters, onRepeatQuestionClick }: Props) {
  const handleRepeatClick = (text: string) => {
    onRepeatQuestionClick(text);
    setTimeout(() => {
      document.getElementById("question-log-table")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  return (
    <div className="mb-8 space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VolumeOverTime filters={filters} />
        <EscalationComposition filters={filters} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopCategories filters={filters} />
        <EscalationRateByCategory filters={filters} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <POLeaderboard filters={filters} className="lg:col-span-2" />
        <RepeatQuestions filters={filters} onSelect={handleRepeatClick} />
      </div>
    </div>
  );
}
