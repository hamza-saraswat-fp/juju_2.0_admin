import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type QuestionTab = "all" | "needs_attention";

interface QuestionTabsProps {
  activeTab: QuestionTab;
  needsAttentionCount: number;
  onTabChange: (tab: QuestionTab) => void;
}

export function QuestionTabs({
  activeTab,
  needsAttentionCount,
  onTabChange,
}: QuestionTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onTabChange(v as QuestionTab)}
      className="mb-6"
    >
      <TabsList className="h-auto rounded-xl border border-line bg-surface-deep p-1">
        <TabsTrigger
          value="all"
          className="rounded-lg px-3 py-1.5 text-sm font-medium data-active:bg-card data-active:text-on-surface data-active:shadow-[0_1px_2px_rgba(15,15,40,0.06),0_1px_0_rgba(15,15,40,0.04)]"
        >
          All Questions
          <span className="ml-1.5 font-mono text-xs text-on-surface-variant">
            ·
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="needs_attention"
          className="rounded-lg px-3 py-1.5 text-sm font-medium data-active:bg-card data-active:text-on-surface data-active:shadow-[0_1px_2px_rgba(15,15,40,0.06),0_1px_0_rgba(15,15,40,0.04)]"
        >
          Needs Attention
          {needsAttentionCount > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-100 px-1.5 font-mono text-[10px] font-medium text-rose-700">
              {needsAttentionCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
