import { useEffect, useState } from "react";
import { ExternalLink, Hash, Save, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type {
  DocRequest,
  DocRequestEditableFields,
} from "@/types/knowledge";

interface DocRequestDetailSheetProps {
  request: DocRequest | null;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, fields: DocRequestEditableFields) => Promise<void>;
  onAfterUpdate?: () => void;
}

export function DocRequestDetailSheet({
  request,
  onOpenChange,
  onUpdate,
  onAfterUpdate,
}: DocRequestDetailSheetProps) {
  const [owner, setOwner] = useState("");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset local state whenever a new request is opened.
  useEffect(() => {
    if (request) {
      setOwner(request.owner ?? "");
      setNotes(request.notes ?? "");
      setFollowUp(request.followUpWithRequestor);
    }
  }, [request?.id]);

  if (!request) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent side="right" />
      </Sheet>
    );
  }

  const dirty =
    owner !== (request.owner ?? "") ||
    notes !== (request.notes ?? "") ||
    followUp !== request.followUpWithRequestor;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(request.id, {
        owner: owner.trim() || null,
        notes: notes.trim() || null,
        followUpWithRequestor: followUp,
      });
      toast.success("Saved");
      onAfterUpdate?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const isSlackOrigin = request.origin === "slack_flag";

  return (
    <Sheet open={!!request} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-[680px]"
      >
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            {isSlackOrigin ? (
              <Hash className="h-4 w-4 text-muted-foreground" />
            ) : (
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="truncate">{request.projectName}</span>
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {isSlackOrigin
              ? "Flagged from #juju_escalations"
              : "Created in admin"}{" "}
            • Submitted {new Date(request.submittedAt).toLocaleString()}
            {request.submittedByDisplayName &&
              ` by ${request.submittedByDisplayName}`}
          </p>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-6 text-sm">
          {/* Juju context (only for Slack-flagged requests) */}
          {isSlackOrigin && (request.originalQuestion || request.verifiedAnswer) && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <SectionLabel>Juju context</SectionLabel>
              {request.originalQuestion && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Original question
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {request.originalQuestion}
                  </p>
                </div>
              )}
              {request.verifiedAnswer && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Verified answer
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {request.verifiedAnswer}
                  </p>
                </div>
              )}
              {request.threadPermalink && (
                <a
                  href={request.threadPermalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary-blue hover:underline"
                >
                  View Slack thread <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          <Section label="Description">
            <p className="whitespace-pre-wrap text-sm">{request.description}</p>
          </Section>

          {request.helpfulResources && (
            <Section label="Helpful Resources">
              <p className="whitespace-pre-wrap text-sm">
                {request.helpfulResources}
              </p>
            </Section>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Section label="Requestor">
              <p className="text-sm">{request.requestorName ?? "—"}</p>
            </Section>
            <Section label="Due Date">
              <p className="text-sm">
                {request.dueDate
                  ? new Date(request.dueDate).toLocaleDateString()
                  : "—"}
              </p>
            </Section>
            <Section label="Approval Needed">
              <p className="text-sm">{request.approvalNeeded ?? "—"}</p>
            </Section>
            <Section label="Category">
              <p className="text-sm">{request.category ?? "—"}</p>
            </Section>
          </div>

          {request.assetTypes.length > 0 && (
            <Section label="Asset Types">
              <div className="flex flex-wrap gap-1.5">
                {request.assetTypes.map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="border-gray-200 text-[10px] font-normal"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          <Separator />

          {/* Editable workflow fields */}
          <div>
            <SectionLabel>Workflow</SectionLabel>
            <p className="mt-0.5 mb-3 text-[11px] text-muted-foreground">
              Status and priority edit inline in the table; owner and notes
              save here.
            </p>

            <div className="space-y-3">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Owner
                </p>
                <Input
                  placeholder="e.g. Addi, Ashli"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Notes
                </p>
                <Textarea
                  placeholder="Internal notes, status updates, follow-ups..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px] text-sm"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={followUp}
                  onChange={(e) => setFollowUp(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-input"
                />
                Follow up with requestor
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              className="h-8 gap-1 bg-primary-navy hover:bg-primary-navy/90"
              onClick={handleSave}
              disabled={!dirty || saving}
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-1">{children}</div>
    </div>
  );
}
