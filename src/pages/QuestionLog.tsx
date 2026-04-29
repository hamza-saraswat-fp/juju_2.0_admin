import { useState, useMemo, useCallback } from "react";
import { useQuestions } from "@/hooks/useQuestions";
import {
  filterQuestions,
  searchQuestions,
  DEFAULT_FILTERS,
  type QuestionFilters,
} from "@/lib/questionFilters";
import { StatCards } from "@/components/question-log/StatCards";
import { FilterBar } from "@/components/question-log/FilterBar";
import { QuestionTable } from "@/components/question-log/QuestionTable";
import {
  QuestionTabs,
  type QuestionTab,
} from "@/components/question-log/Tabs";
import { QuestionDrawer } from "@/components/question-log/QuestionDrawer";
import { Phase2Section } from "@/components/question-log/phase2/Phase2Section";
import { Phase3Section } from "@/components/question-log/phase3/Phase3Section";
import {
  NeedsAttentionView,
  computeNeedsAttention,
} from "@/components/question-log/NeedsAttentionView";

const PER_PAGE = 20;

export function QuestionLog() {
  const { questions, isLoading, error } = useQuestions();

  const [filters, setFilters] = useState<QuestionFilters>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<QuestionTab>("all");

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null,
  );
  const selectedQuestion = selectedQuestionId
    ? (questions.find((q) => q.id === selectedQuestionId) ?? null)
    : null;

  const handleFilterChange = useCallback(
    <K extends keyof QuestionFilters>(key: K, value: QuestionFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(0);
    },
    [],
  );

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(0);
  }, []);

  const handleTabChange = useCallback((tab: QuestionTab) => {
    setActiveTab(tab);
    setPage(0);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery("");
    setPage(0);
    setActiveTab("all");
  }, []);

  const searched = useMemo(
    () => searchQuestions(questions, searchQuery),
    [questions, searchQuery],
  );

  const filtered = useMemo(
    () =>
      filterQuestions(searched, {
        ...filters,
        onlyNeedsAttention: activeTab === "needs_attention",
      }),
    [searched, filters, activeTab],
  );

  const paginated = useMemo(() => {
    const start = page * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  // Sum across all 3 NeedsAttention sections (open SLA + over-tagged POs +
  // unverified repeats), computed from the filtered question list so the
  // badge respects the active filter bar.
  const needsAttentionData = useMemo(
    () => computeNeedsAttention(searched),
    [searched],
  );
  const needsAttentionCount =
    needsAttentionData.openEscalations.length +
    needsAttentionData.overtaggedPOs.length +
    needsAttentionData.repeatQuestions.length;

  return (
    <div>
      <div className="fade-up mb-8">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="h-1 w-12 rounded-full bg-page-accent" />
          <span className="text-xs font-medium text-page-accent-deep">
            Live mirror · auto-refreshing
          </span>
        </div>
        <h1 className="text-[2rem] font-semibold leading-tight tracking-tight md:text-[2.25rem]">
          Question Log
        </h1>
        <p className="mt-1.5 text-[0.95rem] text-on-surface-variant">
          Live mirror of Juju's answers, ratings, escalations, and verified
          responses.
        </p>
      </div>

      <StatCards />

      <Phase2Section
        filters={filters}
        onRepeatQuestionClick={handleSearchChange}
      />

      <Phase3Section filters={filters} />

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-700 shadow-[var(--shadow-card)]">
          Failed to load questions: {error}
        </div>
      )}

      <FilterBar
        filters={filters}
        searchQuery={searchQuery}
        onFilterChange={handleFilterChange}
        onSearchChange={handleSearchChange}
      />

      <QuestionTabs
        activeTab={activeTab}
        needsAttentionCount={needsAttentionCount}
        onTabChange={handleTabChange}
      />

      <div id="question-log-table" className="scroll-mt-24">
        {activeTab === "needs_attention" ? (
          <NeedsAttentionView
            questions={searched}
            onResetFilters={handleResetFilters}
            onSelectQuestionText={(text) => {
              handleTabChange("all");
              handleSearchChange(text);
            }}
          />
        ) : (
          <QuestionTable
            questions={paginated}
            isLoading={isLoading}
            onSelectQuestion={(q) => setSelectedQuestionId(q.id)}
            onResetFilters={handleResetFilters}
            totalFiltered={filtered.length}
            page={page}
            perPage={PER_PAGE}
            onPageChange={setPage}
          />
        )}
      </div>

      <QuestionDrawer
        question={selectedQuestion}
        open={selectedQuestion !== null}
        onClose={() => setSelectedQuestionId(null)}
      />
    </div>
  );
}
