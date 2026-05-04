import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DocRequestCreatePayload } from "@/types/knowledge";

// Asset type options match the values the Slack modal sends. Keeping them
// aligned means an admin-created request renders the same pills in the table
// as a Slack-flagged one.
const ASSET_TYPES = [
  "New Help Center Article",
  "Update to an Existing Help Center Article",
  "New Confluence Article",
  "Update to an Existing Confluence Article",
  "In-App Banner Message",
  "In-App Guided How-To of the Feature",
  "Dedicated Email to Current FP Customers",
  "Other",
];

const APPROVAL_OPTIONS = [
  ["", "—"],
  ["No approval necessary.", "No approval necessary"],
  [
    "Yes, internal approval is needed (requestor).",
    "Internal approval (requestor)",
  ],
  [
    "Yes, show draft to Mo & Ashli before publishing",
    "Show draft to Mo & Ashli",
  ],
] as const;

interface CreateDocRequestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: DocRequestCreatePayload) => Promise<void>;
}

export function CreateDocRequestSheet({
  open,
  onOpenChange,
  onCreate,
}: CreateDocRequestSheetProps) {
  const [projectName, setProjectName] = useState("");
  const [requestorName, setRequestorName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assetTypes, setAssetTypes] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [helpfulResources, setHelpfulResources] = useState("");
  const [approvalNeeded, setApprovalNeeded] = useState("");
  const [priorityLevel, setPriorityLevel] = useState("");
  const [owner, setOwner] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setProjectName("");
    setRequestorName("");
    setDueDate("");
    setAssetTypes([]);
    setDescription("");
    setHelpfulResources("");
    setApprovalNeeded("");
    setPriorityLevel("");
    setOwner("");
    setSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const canSubmit =
    projectName.trim().length > 0 &&
    description.trim().length > 0 &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onCreate({
        projectName: projectName.trim(),
        description: description.trim(),
        requestorName: requestorName.trim() || null,
        dueDate: dueDate || null,
        assetTypes,
        helpfulResources: helpfulResources.trim() || null,
        approvalNeeded: approvalNeeded || null,
        priorityLevel: priorityLevel || null,
        owner: owner.trim() || null,
      });
      toast.success(`Created "${projectName.trim()}"`);
      handleOpenChange(false);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to create doc request",
      );
      setSubmitting(false);
    }
  };

  const toggleAssetType = (t: string) => {
    setAssetTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-[640px]"
      >
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="text-base">New Doc Request</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <Field label="Project Name" required>
            <Input
              placeholder="e.g. Tap to Pay - Beta Launch Pop-Up"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Requestor">
              <Input
                placeholder="Name"
                value={requestorName}
                onChange={(e) => setRequestorName(e.target.value)}
              />
            </Field>
            <Field label="Due Date">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Asset Type(s)">
            <div className="flex flex-wrap gap-1.5">
              {ASSET_TYPES.map((t) => {
                const active = assetTypes.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleAssetType(t)}
                    className={
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors " +
                      (active
                        ? "border-primary-navy bg-primary-navy text-white"
                        : "border-input bg-transparent text-muted-foreground hover:border-foreground hover:text-foreground")
                    }
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Description" required>
            <Textarea
              placeholder="What needs to be documented or updated, and why?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] text-sm"
            />
          </Field>

          <Field label="Helpful Resources">
            <Textarea
              placeholder="Links to Figma, dev URLs, related docs..."
              value={helpfulResources}
              onChange={(e) => setHelpfulResources(e.target.value)}
              className="min-h-[60px] text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Approval Needed">
              <select
                value={approvalNeeded}
                onChange={(e) => setApprovalNeeded(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
              >
                {APPROVAL_OPTIONS.map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={priorityLevel}
                onChange={(e) => setPriorityLevel(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
              >
                <option value="">—</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
              </select>
            </Field>
          </div>

          <Field label="Owner">
            <Input
              placeholder="e.g. Addi, Ashli"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </Field>

          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              className="h-8 gap-1 bg-primary-navy hover:bg-primary-navy/90"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              <Plus className="h-3.5 w-3.5" />
              {submitting ? "Creating..." : "Create Request"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </p>
      {children}
    </div>
  );
}
