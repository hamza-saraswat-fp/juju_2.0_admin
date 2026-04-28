import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useQuestions } from "@/hooks/useQuestions";
import { QuestionDetail } from "@/components/question-log/QuestionDetail";

export function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getById, isLoading, error } = useQuestions();

  const question = id ? getById(id) : null;

  if (isLoading) {
    return (
      <div className="py-12 text-center text-muted-foreground">Loading…</div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold">Failed to load</h2>
        <p className="mt-2 text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold">Question not found</h2>
        <p className="mt-2 text-muted-foreground">
          The question you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          to="/questions"
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Question Log
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/questions"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Question Log
      </Link>
      <div className="rounded-lg border bg-card p-6">
        <QuestionDetail question={question} />
      </div>
    </div>
  );
}
