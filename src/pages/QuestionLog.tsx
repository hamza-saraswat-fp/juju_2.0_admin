import { useState, useMemo, useCallback } from "react";
import { useQuestions } from "@/hooks/useQuestions";
import { useThumbsVote } from "@/hooks/useThumbsVote";
import { CURRENT_ADMIN } from "@/types/question";
import {
  filterQuestions,
  searchQuestions,
  DEFAULT_FILTERS,
  type QuestionFilters,
} from "@/lib/questionFilters";
import { StatCards } from "@/components/question-log/StatCards";
import { FilterBar } from "@/components/question-log/FilterBar";
import { QuestionTable } from "@/components/question-log/QuestionTable";
import { QuestionTabs } from "@/components/question-log/Tabs";
import { QuestionDrawer } from "@/components/question-log/QuestionDrawer";

const PER_PAGE = 20;

export function QuestionLog() {
  const { questions, stats, overrideCategory } = useQuestions();
  const { vote, getVotes } = useThumbsVote();

  // Filter state
  const [filters, setFilters] = useState<QuestionFilters>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "unanswered">("all");

  // Drawer state — store ID, derive question from array (always fresh after mutations)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null,
  );
  const selectedQuestion = selectedQuestionId
    ? (questions.find((q) => q.id === selectedQuestionId) ?? null)
    : null;

  // Filter change resets page
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

  const handleTabChange = useCallback((tab: "all" | "unanswered") => {
    setActiveTab(tab);
    setPage(0);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery("");
    setPage(0);
    setActiveTab("all");
  }, []);

  // Data pipeline: search → filter → paginate
  const searched = useMemo(
    () => searchQuestions(questions, searchQuery),
    [questions, searchQuery],
  );

  const filtered = useMemo(
    () =>
      filterQuestions(searched, {
        ...filters,
        onlyUnanswered: activeTab === "unanswered",
      }),
    [searched, filters, activeTab],
  );

  const paginated = useMemo(() => {
    const start = page * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  // Unanswered count for the tab badge (within current search + filters, NOT tab)
  const unansweredCount = useMemo(
    () =>
      filterQuestions(searched, {
        ...filters,
        onlyUnanswered: true,
      }).length,
    [searched, filters],
  );

  // Drawer voting + category props
  const drawerAdminVotes = selectedQuestion
    ? getVotes(selectedQuestion.id)
    : [];
  const handleDrawerVote = useCallback(
    (value: "up" | "down") => {
      if (selectedQuestion) {
        vote(
          selectedQuestion.id,
          CURRENT_ADMIN.id,
          CURRENT_ADMIN.name,
          value,
        );
      }
    },
    [selectedQuestion, vote],
  );
  const handleDrawerOverride = useCallback(
    (category: import("@/types/question").Category | null) => {
      if (selectedQuestion) {
        overrideCategory(selectedQuestion.id, category);
      }
    },
    [selectedQuestion, overrideCategory],
  );

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Question Log</h1>
        <p className="mt-1 text-muted-foreground">
          Real-time analysis of user inquiries and engine confidence scores.
        </p>
      </div>

      <StatCards stats={stats} />

      <FilterBar
        filters={filters}
        searchQuery={searchQuery}
        onFilterChange={handleFilterChange}
        onSearchChange={handleSearchChange}
      />

      <QuestionTabs
        activeTab={activeTab}
        unansweredCount={unansweredCount}
        onTabChange={handleTabChange}
      />

      <QuestionTable
        questions={paginated}
        isLoading={false}
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
        adminVotes={drawerAdminVotes}
        onVote={handleDrawerVote}
        onOverrideCategory={handleDrawerOverride}
      />
    </div>
  );
}
