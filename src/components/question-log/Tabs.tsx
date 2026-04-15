import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface QuestionTabsProps {
  activeTab: "all" | "unanswered";
  unansweredCount: number;
  onTabChange: (tab: "all" | "unanswered") => void;
}

export function QuestionTabs({
  activeTab,
  unansweredCount,
  onTabChange,
}: QuestionTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onTabChange(v as "all" | "unanswered")}
      className="mb-6"
    >
      <TabsList>
        <TabsTrigger value="all">All Questions</TabsTrigger>
        <TabsTrigger value="unanswered" className="gap-2">
          Unanswered Bucket
          {unansweredCount > 0 && (
            <Badge
              variant="destructive"
              className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]"
            >
              {unansweredCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
