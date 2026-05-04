import { useState, useMemo, useEffect } from "react";
import {
  ArrowUpDown,
  Search,
  Plus,
  ExternalLink,
  Hash,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateDocRequestSheet } from "./CreateDocRequestSheet";
import { DocRequestDetailSheet } from "./DocRequestDetailSheet";
import { useDocRequests } from "@/hooks/useDocRequests";
import { cn, relativeTime } from "@/lib/utils";
import { toast } from "sonner";
import type {
  DocRequest,
  DocRequestStatus,
  DocRequestOrigin,
  RecommendationClassification,
} from "@/types/knowledge";

const PER_PAGE = 15;

type SortKey = "submittedAt" | "projectName" | "taskStatus" | "priorityLevel";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | DocRequestStatus;
type OriginFilter = "all" | DocRequestOrigin;

const STATUS_LABEL: Record<DocRequestStatus, string> = {
  waiting: "Waiting",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
};

const STATUS_BADGE: Record<DocRequestStatus, string> = {
  waiting: "bg-amber-50 text-amber-800 border-amber-200",
  in_progress: "bg-blue-50 text-blue-800 border-blue-200",
  completed: "bg-green-50 text-green-800 border-green-200",
  rejected: "bg-gray-100 text-gray-600 border-gray-200",
};

export function DocRequestsTable() {
  const {
    requests,
    isLoading,
    error,
    updateRequest,
    createRequest,
    refetch,
    regenerateRecommendation,
  } = useDocRequests();

  const [sortKey, setSortKey] = useState<SortKey>("submittedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState<DocRequest | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filtered = useMemo(() => {
    let out = requests;
    if (statusFilter !== "all") {
      out = out.filter((r) => r.taskStatus === statusFilter);
    }
    if (originFilter !== "all") {
      out = out.filter((r) => r.origin === originFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (r) =>
          r.projectName.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.requestorName ?? "").toLowerCase().includes(q) ||
          (r.owner ?? "").toLowerCase().includes(q),
      );
    }
    const sorted = [...out].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      // Nulls always sort last regardless of direction.
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [requests, statusFilter, originFilter, search, sortKey, sortDir]);

  const paginated = useMemo(() => {
    const start = page * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  };

  const handleStatusChange = async (id: string, status: DocRequestStatus) => {
    try {
      await updateRequest(id, { taskStatus: status });
      toast.success(`Status → ${STATUS_LABEL[status]}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handlePriorityChange = async (id: string, priority: string) => {
    try {
      await updateRequest(id, { priorityLevel: priority || null });
    } catch {
      toast.error("Failed to update priority");
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
            Doc Requests
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Education team queue. Slack-flagged requests come from{" "}
            <code className="font-mono">#juju_escalations</code>; you can also
            add standalone requests from here.
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5 bg-primary-navy text-white hover:bg-primary-navy/90"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          New Request
        </Button>
      </div>

      <StatusSummaryStrip requests={requests} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[180px] flex-grow sm:max-w-[280px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by project, requestor, owner..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <FilterPills
          label="Status"
          options={[
            ["all", "All"],
            ["waiting", "Waiting"],
            ["in_progress", "In Progress"],
            ["completed", "Completed"],
            ["rejected", "Rejected"],
          ]}
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v as StatusFilter);
            setPage(0);
          }}
        />

        <FilterPills
          label="Origin"
          options={[
            ["all", "All"],
            ["slack_flag", "Slack"],
            ["admin_create", "Admin"],
          ]}
          value={originFilter}
          onChange={(v) => {
            setOriginFilter(v as OriginFilter);
            setPage(0);
          }}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[24px]" />
              <SortableHead
                label="Project"
                k="projectName"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <TableHead className="hidden md:table-cell">Requestor</TableHead>
              <TableHead className="hidden lg:table-cell">Asset Type</TableHead>
              <TableHead className="hidden xl:table-cell w-[260px]">
                AI Recommendation
              </TableHead>
              <SortableHead
                label="Submitted"
                k="submittedAt"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHead
                label="Status"
                k="taskStatus"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHead
                label="Priority"
                k="priorityLevel"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <TableHead className="hidden md:table-cell">Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  Loading doc requests...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-12 text-center text-sm text-destructive"
                >
                  {error}
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {requests.length === 0
                    ? "No doc requests yet. Flag one from #juju_escalations or click New Request."
                    : "No requests match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => setDetailRequest(r)}
                >
                  <TableCell
                    className="text-muted-foreground"
                    title={
                      r.origin === "slack_flag"
                        ? "Flagged from Slack"
                        : "Created from admin"
                    }
                  >
                    {r.origin === "slack_flag" ? (
                      <Hash className="h-3.5 w-3.5" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                  </TableCell>
                  <TableCell className="max-w-[280px] font-medium">
                    <div className="truncate">{r.projectName}</div>
                    {r.threadPermalink && (
                      <a
                        href={r.threadPermalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary-blue"
                      >
                        thread <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {r.requestorName ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <AssetTypePills types={r.assetTypes} />
                  </TableCell>
                  <TableCell className="hidden xl:table-cell w-[260px]">
                    <RecommendationCell request={r} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {relativeTime(r.submittedAt)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <StatusSelect
                      value={r.taskStatus}
                      onChange={(s) => handleStatusChange(r.id, s)}
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <PrioritySelect
                      value={r.priorityLevel ?? ""}
                      onChange={(p) => handlePriorityChange(r.id, p)}
                    />
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {r.owner ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > PER_PAGE && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * PER_PAGE + 1}–
            {Math.min((page + 1) * PER_PAGE, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CreateDocRequestSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={createRequest}
      />

      <DocRequestDetailSheet
        request={
          // Re-resolve from `requests` so optimistic recommendation updates
          // (regenerate flow) flow through to the drawer without closing it.
          detailRequest
            ? requests.find((r) => r.id === detailRequest.id) ?? detailRequest
            : null
        }
        onOpenChange={(open) => {
          if (!open) setDetailRequest(null);
        }}
        onUpdate={updateRequest}
        onAfterUpdate={refetch}
        onRegenerateRecommendation={regenerateRecommendation}
      />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function StatusSummaryStrip({ requests }: { requests: DocRequest[] }) {
  const counts = useMemo(() => {
    const c: Record<DocRequestStatus, number> = {
      waiting: 0,
      in_progress: 0,
      completed: 0,
      rejected: 0,
    };
    for (const r of requests) c[r.taskStatus]++;
    return c;
  }, [requests]);

  const items: { status: DocRequestStatus; dot: string }[] = [
    { status: "waiting", dot: "bg-amber-500" },
    { status: "in_progress", dot: "bg-blue-500" },
    { status: "completed", dot: "bg-green-500" },
    { status: "rejected", dot: "bg-gray-400" },
  ];

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-muted/30 px-4 py-2.5">
      {items.map(({ status, dot }) => (
        <div key={status} className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
          <span className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
            {STATUS_LABEL[status]}
          </span>
          <span className="font-mono text-sm font-medium">
            {counts[status]}
          </span>
        </div>
      ))}
      <div className="ml-auto text-[11px] text-muted-foreground">
        {requests.length} total
      </div>
    </div>
  );
}

function SortableHead({
  label,
  k,
  currentKey,
  currentDir,
  onSort,
}: {
  label: string;
  k: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = currentKey === k;
  return (
    <TableHead
      className="cursor-pointer select-none"
      onClick={() => onSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={cn(
            "h-3 w-3",
            active ? "text-foreground" : "text-muted-foreground/40",
          )}
        />
        {active && (
          <span className="text-[10px] text-muted-foreground">
            {currentDir === "asc" ? "↑" : "↓"}
          </span>
        )}
      </span>
    </TableHead>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: DocRequestStatus;
  onChange: (s: DocRequestStatus) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as DocRequestStatus)}
      className={cn(
        "h-7 cursor-pointer rounded-md border px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring/50",
        STATUS_BADGE[value],
      )}
    >
      {(Object.keys(STATUS_LABEL) as DocRequestStatus[]).map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

function PrioritySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 cursor-pointer rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
    >
      <option value="">—</option>
      <option value="P1">P1</option>
      <option value="P2">P2</option>
      <option value="P3">P3</option>
    </select>
  );
}

function AssetTypePills({ types }: { types: string[] }) {
  if (!types || types.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const visible = types.slice(0, 2);
  const remaining = types.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((t) => (
        <Badge
          key={t}
          variant="outline"
          className="border-gray-200 text-[10px] font-normal"
        >
          {shortenAssetType(t)}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge
          variant="outline"
          className="border-gray-200 text-[10px] font-normal"
        >
          +{remaining}
        </Badge>
      )}
    </div>
  );
}

// Asset type values come from the Slack modal and are already human-readable.
// This shortens the long ones for table display only.
function shortenAssetType(t: string): string {
  return t
    .replace("Update to an Existing ", "Update ")
    .replace("New ", "New ")
    .replace(" Article", "");
}

// ─── Recommendation cell + badge ─────────────────────────────────────

const CLASSIFICATION_LABEL: Record<RecommendationClassification, string> = {
  correction: "Correction",
  gap: "Gap",
  clarification: "Clarification",
};

const CLASSIFICATION_BADGE: Record<RecommendationClassification, string> = {
  correction: "bg-red-50 text-red-700 border-red-200",
  gap: "bg-amber-50 text-amber-800 border-amber-200",
  clarification: "bg-purple-50 text-purple-700 border-purple-200",
};

export function ClassificationBadge({
  classification,
  className,
}: {
  classification: RecommendationClassification;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
        CLASSIFICATION_BADGE[classification],
        className,
      )}
    >
      {CLASSIFICATION_LABEL[classification]}
    </span>
  );
}

function RecommendationCell({ request: r }: { request: DocRequest }) {
  if (r.recommendationStatus === "not_applicable") {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  if (r.recommendationStatus === "pending" || r.recommendationStatus === "generating") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Generating…
      </span>
    );
  }
  if (r.recommendationStatus === "failed") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] text-destructive"
        title={r.recommendationError ?? "Generation failed"}
      >
        <AlertCircle className="h-3 w-3" />
        Failed — open to retry
      </span>
    );
  }
  if (r.recommendationStatus === "generated" && r.recommendationClassification) {
    return (
      <div className="flex items-start gap-1.5">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-purple-500" />
        <div className="flex-1 min-w-0 space-y-1">
          <ClassificationBadge classification={r.recommendationClassification} />
          <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">
            {r.recommendationSynopsis ?? ""}
          </p>
        </div>
      </div>
    );
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

function FilterPills({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: [string, string][];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex gap-0.5 rounded-md bg-muted p-0.5">
        {options.map(([val, text]) => (
          <Button
            key={val}
            variant={value === val ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-7 rounded-sm px-2.5 text-xs font-medium",
              value === val &&
                "bg-primary-navy text-white hover:bg-primary-navy/90",
              value !== val && "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onChange(val)}
          >
            {text}
          </Button>
        ))}
      </div>
    </div>
  );
}
