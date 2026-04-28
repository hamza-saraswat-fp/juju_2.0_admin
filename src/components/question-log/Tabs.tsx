import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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
      <TabsList>
        <TabsTrigger value="all">All Questions</TabsTrigger>
        <TabsTrigger value="needs_attention" className="gap-2">
          Needs Attention
          {needsAttentionCount > 0 && (
            <Badge
              variant="destructive"
              className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]"
            >
              {needsAttentionCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
