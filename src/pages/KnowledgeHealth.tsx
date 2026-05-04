import { useKnowledgeHealth } from "@/hooks/useKnowledgeHealth";
import { HealthStatCards } from "@/components/knowledge-health/HealthStatCards";
import { SourceTable } from "@/components/knowledge-health/SourceTable";
import { StaleContent } from "@/components/knowledge-health/StaleContent";
import { CoverageGaps } from "@/components/knowledge-health/CoverageGaps";
import { UnmatchedQuestions } from "@/components/knowledge-health/UnmatchedQuestions";
import { DocRequestsTable } from "@/components/knowledge-health/DocRequestsTable";

export function KnowledgeHealth() {
  const { sources, stats, coverageGaps, unmatchedQuestions, staleSources } =
    useKnowledgeHealth();

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Knowledge Health
        </h1>
        <p className="mt-1 text-muted-foreground">
          Audit source origin metrics, identify coverage gaps, and maintain the
          integrity of Juju&apos;s reasoning engine.
        </p>
      </div>

      <HealthStatCards stats={stats} />

      {/* Main content: Source table + Unmatched questions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SourceTable sources={sources} />
        </div>
        <div className="lg:col-span-2">
          <UnmatchedQuestions questions={unmatchedQuestions} />
        </div>
      </div>

      {/* Doc Requests — Supabase-backed queue from Slack flags + admin entries.
          Sits between the source audit (above) and the proactive monitoring
          sections (below) — that's the workflow order: "what we cite" →
          "what we need to do" → "what we should watch." */}
      <div className="mt-8">
        <DocRequestsTable />
      </div>

      {/* Bottom sections: Stale content + Coverage gaps */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StaleContent sources={staleSources} />
        <CoverageGaps gaps={coverageGaps} />
      </div>
    </div>
  );
}
