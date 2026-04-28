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

const PER_PAGE = 20;

export function QuestionLog() {
  const { questions, stats, isLoading, error } = useQuestions();

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

  const needsAttentionCount = useMemo(
    () =>
      filterQuestions(searched, {
        ...filters,
        onlyNeedsAttention: true,
      }).length,
    [searched, filters],
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Question Log</h1>
        <p className="mt-1 text-muted-foreground">
          Live mirror of Juju's answers, ratings, escalations, and verified responses.
        </p>
      </div>

      <StatCards stats={stats} />

      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
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

      <QuestionDrawer
        question={selectedQuestion}
        open={selectedQuestion !== null}
        onClose={() => setSelectedQuestionId(null)}
      />
    </div>
  );
}
