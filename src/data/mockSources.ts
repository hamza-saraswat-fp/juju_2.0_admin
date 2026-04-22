import type {
  KnowledgeSource,
  SourceStats,
  CoverageGap,
  UnmatchedQuestion,
} from "@/types/knowledge";
import type { Category } from "@/types/question";

// ── Helpers ─────────────────────────────────────────────────

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
}

function computeStaleStatus(
  staleDays: number,
): "fresh" | "aging" | "stale" {
  if (staleDays > 180) return "stale";
  if (staleDays > 90) return "aging";
  return "fresh";
}

// ── Knowledge Sources ───────────────────────────────────────
// Derived from the top-cited real sources across 30 eval questions.
// Owner names and lastModified dates are fabricated.

const sources: KnowledgeSource[] = [
  { id: "ks-01", title: "Sending Estimates & Invoices to Customers", url: "https://fieldpulse.mintlify.app/core-platform/invoices-estimates/sending-estimates-invoices-to-customers", sourceType: "knowledge_center", owner: "A. Vance", lastModified: daysAgo(12) },
  { id: "ks-02", title: "Engage Overview", url: "https://fieldpulse.mintlify.app/growth/engage/engage-overview", sourceType: "knowledge_center", owner: "Ashli Torres", lastModified: daysAgo(45) },
  { id: "ks-03", title: "Creating Automatic Triggers", url: "https://fieldpulse.mintlify.app/core-platform/customers/communications/index", sourceType: "knowledge_center", owner: "Devon Richards", lastModified: daysAgo(8) },
  { id: "ks-04", title: "Automatic Triggers Related to Invoices", url: "https://fieldpulse.atlassian.net/wiki/spaces/FKB/pages/884998173", sourceType: "confluence", owner: "Finance Systems", lastModified: daysAgo(188) },
  { id: "ks-05", title: "FieldPulse Payments", url: "https://fieldpulse.mintlify.app/growth/fp-payments/fieldpulse-payments", sourceType: "knowledge_center", owner: "Payments Team", lastModified: daysAgo(22) },
  { id: "ks-06", title: "Customer Record: Character Limits", url: "https://fieldpulse.mintlify.app/core-platform/customers/character-limits", sourceType: "knowledge_center", owner: "Eng-Core", lastModified: daysAgo(310) },
  { id: "ks-07", title: "Card Fee Recovery", url: "https://fieldpulse.mintlify.app/growth/fp-payments/card-fee-recovery", sourceType: "knowledge_center", owner: "A. Vance", lastModified: daysAgo(15) },
  { id: "ks-08", title: "FAQs - Card Fee Recovery", url: "https://fieldpulse.atlassian.net/wiki/spaces/FKB/pages/1060175894", sourceType: "confluence", owner: "A. Vance", lastModified: daysAgo(120) },
  { id: "ks-09", title: "Job Costing", url: "https://fieldpulse.mintlify.app/core-platform/jobs/job-costing", sourceType: "knowledge_center", owner: "Product Team", lastModified: daysAgo(30) },
  { id: "ks-10", title: "Job Costing (Confluence)", url: "https://fieldpulse.atlassian.net/wiki/spaces/FKB/pages/981696547", sourceType: "confluence", owner: "Product Team", lastModified: daysAgo(242) },
  { id: "ks-11", title: "Purchase Orders", url: "https://fieldpulse.mintlify.app/core-platform/purchase-orders/purchase-orders", sourceType: "knowledge_center", owner: "Devon Richards", lastModified: daysAgo(55) },
  { id: "ks-12", title: "Invoice Reports", url: "https://fieldpulse.mintlify.app/core-platform/reporting/invoice-reports", sourceType: "knowledge_center", owner: "Finance Systems", lastModified: daysAgo(95) },
  { id: "ks-13", title: "Acorn Finance", url: "https://fieldpulse.mintlify.app/integrations/other/acorn-finance", sourceType: "knowledge_center", owner: "Partnerships", lastModified: daysAgo(200) },
  { id: "ks-14", title: "Customer Portal", url: "https://fieldpulse.mintlify.app/core-platform/customers/customer-portal", sourceType: "knowledge_center", owner: "Product Team", lastModified: daysAgo(18) },
  { id: "ks-15", title: "General FAQs", url: "https://fieldpulse.atlassian.net/wiki/spaces/FKB/pages/907182115", sourceType: "confluence", owner: "CS Team", lastModified: daysAgo(155) },
  { id: "ks-16", title: "Recurring Jobs", url: "https://fieldpulse.mintlify.app/core-platform/jobs/recurring-jobs", sourceType: "knowledge_center", owner: "Product Team", lastModified: daysAgo(75) },
  { id: "ks-17", title: "User Roles", url: "https://fieldpulse.mintlify.app/core-platform/user-management/user-roles", sourceType: "knowledge_center", owner: "Eng-Core", lastModified: daysAgo(42) },
  { id: "ks-18", title: "Inventory Hubs", url: "https://fieldpulse.mintlify.app/core-platform/inventory/inventory-hubs", sourceType: "knowledge_center", owner: "Devon Richards", lastModified: daysAgo(110) },
  { id: "ks-19", title: "VPN Access Guidelines", url: "https://fieldpulse.atlassian.net/wiki/spaces/FKB/pages/100014", sourceType: "confluence", owner: "IT Infrastructure", lastModified: daysAgo(280) },
  { id: "ks-20", title: "Booking Portal", url: "https://fieldpulse.mintlify.app/core-platform/booking-portal/booking-portal", sourceType: "knowledge_center", owner: "Product Team", lastModified: daysAgo(60) },
];

// Citation counts and helpful rates (fabricated to match realistic patterns)
const citationData: Record<string, { citations: number; helpfulRate: number }> = {
  "ks-01": { citations: 1420, helpfulRate: 94 },
  "ks-02": { citations: 1180, helpfulRate: 78 },
  "ks-03": { citations: 980, helpfulRate: 85 },
  "ks-04": { citations: 892, helpfulRate: 42 },  // Heavily cited but low helpful rate
  "ks-05": { citations: 870, helpfulRate: 88 },
  "ks-06": { citations: 756, helpfulRate: 45 },  // Stale + low rate
  "ks-07": { citations: 720, helpfulRate: 91 },
  "ks-08": { citations: 654, helpfulRate: 72 },
  "ks-09": { citations: 620, helpfulRate: 88 },
  "ks-10": { citations: 580, helpfulRate: 65 },  // Stale confluence version
  "ks-11": { citations: 540, helpfulRate: 82 },
  "ks-12": { citations: 512, helpfulRate: 76 },
  "ks-13": { citations: 490, helpfulRate: 58 },  // Stale + mediocre rate
  "ks-14": { citations: 465, helpfulRate: 90 },
  "ks-15": { citations: 430, helpfulRate: 55 },  // Aging confluence FAQ
  "ks-16": { citations: 410, helpfulRate: 80 },
  "ks-17": { citations: 380, helpfulRate: 86 },
  "ks-18": { citations: 350, helpfulRate: 68 },  // Aging
  "ks-19": { citations: 290, helpfulRate: 40 },  // Stale + lowest rate
  "ks-20": { citations: 260, helpfulRate: 84 },
};

// Build SourceStats
export const mockSourceStats: SourceStats[] = sources.map((source) => {
  const data = citationData[source.id] ?? { citations: 0, helpfulRate: 0 };
  const staleDays = Math.round(
    (Date.now() - new Date(source.lastModified).getTime()) / (24 * 60 * 60_000),
  );
  return {
    source,
    citations: data.citations,
    helpfulRate: data.helpfulRate,
    staleDays,
    staleStatus: computeStaleStatus(staleDays),
  };
});

// ── Coverage Gaps ───────────────────────────────────────────

export const mockCoverageGaps: CoverageGap[] = [
  {
    id: "cg-01",
    category: "payments" as Category,
    description:
      "Voided invoice behavior in QuickBooks sync is undocumented. Multiple agents confused.",
    unansweredRate: 40,
    totalQuestions: 15,
    owner: "Finance Systems",
  },
  {
    id: "cg-02",
    category: "general" as Category,
    description:
      "Engage line vs. user pricing differences are unclear in knowledge base.",
    unansweredRate: 33,
    totalQuestions: 12,
    owner: "Ashli Torres",
  },
  {
    id: "cg-03",
    category: "general" as Category,
    description:
      "Dashboard sharing and visibility permissions have no documentation.",
    unansweredRate: 28,
    totalQuestions: 8,
    owner: "Eng-Core",
  },
  {
    id: "cg-04",
    category: "general" as Category,
    description:
      "Credit card processing over the phone — no clear step-by-step guide exists.",
    unansweredRate: 22,
    totalQuestions: 18,
    owner: "Payments Team",
  },
];

// ── Unmatched Questions ─────────────────────────────────────
// Questions Juju couldn't answer well — derived from low-confidence eval results.

export const mockUnmatchedQuestions: UnmatchedQuestion[] = [
  {
    id: "uq-01",
    questionText:
      "How to process a credit card payment over the phone and send a receipt?",
    hits: 14,
    category: "payments" as Category,
  },
  {
    id: "uq-02",
    questionText:
      "What's the difference between an additional line vs. additional user in Engage?",
    hits: 11,
    category: "general" as Category,
  },
  {
    id: "uq-03",
    questionText:
      "Best way to add 'asset worked on' to a customer invoice?",
    hits: 9,
    category: "general" as Category,
  },
  {
    id: "uq-04",
    questionText: "How can you share visibility on dashboards?",
    hits: 8,
    category: "general" as Category,
  },
  {
    id: "uq-05",
    questionText:
      "If you void an invoice, what happens in QuickBooks?",
    hits: 7,
    category: "payments" as Category,
  },
  {
    id: "uq-06",
    questionText:
      "Is there a limit to the number of texts customers can send daily for Engage?",
    hits: 6,
    category: "general" as Category,
  },
  {
    id: "uq-07",
    questionText:
      "Does the customer get GPS tracking when a tech sends 'headed your way'?",
    hits: 5,
    category: "general" as Category,
  },
  {
    id: "uq-08",
    questionText: "Do archived estimates show up in reporting?",
    hits: 4,
    category: "payments" as Category,
  },
];
