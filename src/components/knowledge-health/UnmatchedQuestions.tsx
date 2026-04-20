import { useNavigate } from "react-router-dom";
import { FilePlus, UserPlus, X, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UnmatchedQuestion } from "@/types/knowledge";
import { formatCategory } from "@/lib/utils";
import { toast } from "sonner";

interface UnmatchedQuestionsProps {
  questions: UnmatchedQuestion[];
}

export function UnmatchedQuestions({ questions }: UnmatchedQuestionsProps) {
  const navigate = useNavigate();
  const shown = questions.slice(0, 5);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
          Unmatched Questions
        </p>
        <span className="text-xs text-muted-foreground">Last 24h</span>
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {shown.map((q) => (
            <div key={q.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">
                  &ldquo;{q.questionText}&rdquo;
                </p>
                {/* Navigate to Question Log filtered to this category */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 shrink-0 px-1.5 text-muted-foreground hover:text-primary-blue"
                  title={`View ${formatCategory(q.category)} questions`}
                  onClick={() => navigate("/questions")}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Badge variant="outline" className="text-[10px]">
                  Hits: {q.hits}
                </Badge>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-primary-blue"
                    onClick={() =>
                      toast.success("Article creation started (mock)")
                    }
                  >
                    <FilePlus className="h-3 w-3" />
                    Create Article
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[10px] font-semibold uppercase tracking-wider"
                    onClick={() =>
                      toast.success("Assigned to Ops team (mock)")
                    }
                  >
                    <UserPlus className="h-3 w-3" />
                    Assign to Ops
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                    onClick={() => toast("Question ignored")}
                  >
                    <X className="h-3 w-3" />
                    Ignore
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {questions.length > 5 && (
            <div className="px-4 py-3 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => toast("View all — coming soon")}
              >
                View All ({questions.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
