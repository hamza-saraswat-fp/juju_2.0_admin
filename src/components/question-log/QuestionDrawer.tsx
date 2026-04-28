import { useNavigate } from "react-router-dom";
import { Maximize2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { QuestionDetail } from "./QuestionDetail";
import type { Question } from "@/types/question";

interface QuestionDrawerProps {
  question: Question | null;
  open: boolean;
  onClose: () => void;
}

export function QuestionDrawer({
  question,
  open,
  onClose,
}: QuestionDrawerProps) {
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-[900px]"
      >
        {question && (
          <>
            <SheetHeader className="flex flex-row items-center justify-between border-b pb-4">
              <SheetTitle>Question Detail</SheetTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => {
                  onClose();
                  navigate(`/questions/${question.id}`);
                }}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Expand
              </Button>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-6">
              <QuestionDetail question={question} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
