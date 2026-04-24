import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useBotConfig } from "@/hooks/useBotConfig";
import { PromptSlotEditor } from "@/components/bot-config/PromptSlotEditor";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PromptSlotDetailPage() {
  const { slotId } = useParams<{ slotId: string }>();
  const {
    slots,
    isLoading,
    error,
    updatePrompt,
    switchModel,
    saveVersion,
    rollbackToVersion,
  } = useBotConfig();

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const slot = slotId ? slots.find((s) => s.id === slotId) : null;

  if (isLoading) {
    return (
      <div className="py-12 text-center text-muted-foreground">Loading…</div>
    );
  }

  if (!slot) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold">Prompt slot not found</h2>
        <p className="mt-2 text-muted-foreground">
          The slot you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          to="/config"
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Bot Config
        </Link>
      </div>
    );
  }

  const envBadge = {
    production: "bg-green-100 text-green-700 border-green-300",
    staging: "bg-amber-100 text-amber-700 border-amber-300",
    base: "bg-gray-100 text-gray-700 border-gray-300",
  }[slot.environment];

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/config"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Bot Config
      </Link>

      <div className="rounded-lg border bg-card p-6">
        <div className="mb-6 flex items-center gap-3 border-b pb-4">
          <h1 className="text-xl font-semibold">{slot.name}</h1>
          <Badge variant="outline" className={cn("text-[10px]", envBadge)}>
            {slot.environment.toUpperCase()}
          </Badge>
        </div>

        <PromptSlotEditor
          slot={slot}
          variant="page"
          onUpdatePrompt={updatePrompt}
          onSwitchModel={switchModel}
          onSaveVersion={saveVersion}
          onRollback={rollbackToVersion}
        />
      </div>
    </div>
  );
}
