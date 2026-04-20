import { useState, useMemo, useEffect } from "react";
import {
  BookOpen,
  FolderOpen,
  ArrowUpDown,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
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
import type { SourceStats } from "@/types/knowledge";
import {
  filterSources,
  sortSources,
  DEFAULT_SOURCE_FILTERS,
  type SourceFilters,
  type SourceSortKey,
  type SourceSortDir,
  type StaleFilter,
} from "@/lib/knowledgeFilters";
import type { SourceType } from "@/types/question";
import { cn, relativeTime } from "@/lib/utils";
import { toast } from "sonner";

const PER_PAGE = 15;

interface SourceTableProps {
  sources: SourceStats[];
}

export function SourceTable({ sources }: SourceTableProps) {
  const [filters, setFilters] = useState<SourceFilters>(DEFAULT_SOURCE_FILTERS);
  const [sortKey, setSortKey] = useState<SourceSortKey>("citations");
  const [sortDir, setSortDir] = useState<SourceSortDir>("desc");
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(
      () => setFilters((f) => ({ ...f, search: searchInput })),
      300,
    );
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filtered = useMemo(
    () => sortSources(filterSources(sources, filters), sortKey, sortDir),
    [sources, filters, sortKey, sortDir],
  );

  const paginated = useMemo(() => {
    const start = page * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const handleSort = (key: SourceSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  };

  const handleFilterChange = <K extends keyof SourceFilters>(
    key: K,
    value: SourceFilters[K],
  ) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(0);
  };

  return (
    <div>
      {/* Section header + export */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
          Most-Cited Knowledge Sources
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-primary-blue"
          onClick={() => toast.success("Report exported (mock)")}
        >
          Export Report
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[180px] flex-grow sm:max-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sources..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <FilterPills
          label="Type"
          options={[
            ["ALL", "All"],
            ["knowledge_center", "KC"],
            ["confluence", "Confluence"],
          ]}
          value={filters.sourceType}
          onChange={(v) =>
            handleFilterChange("sourceType", v as SourceType | "ALL")
          }
        />

        <FilterPills
          label="Status"
          options={[
            ["all", "All"],
            ["fresh", "Fresh"],
            ["aging", "Aging"],
            ["stale", "Stale"],
          ]}
          value={filters.staleStatus}
          onChange={(v) =>
            handleFilterChange("staleStatus", v as StaleFilter)
          }
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source Title</TableHead>
              <TableHead className="w-[70px]">Type</TableHead>
              <SortableHead
                label="Citations"
                sortKey="citations"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHead
                label="Helpful Rate"
                sortKey="helpfulRate"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHead
                label="Last Modified"
                sortKey="lastModified"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="hidden w-[100px] md:table-cell">
                Owner
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No sources match your filters.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((s) => (
                <TableRow key={s.source.id}>
                  <TableCell className="max-w-[250px] truncate font-medium">
                    {s.source.title}
                  </TableCell>
                  <TableCell>
                    {s.source.sourceType === "knowledge_center" ? (
                      <BookOpen className="h-4 w-4 text-blue-600" />
                    ) : (
                      <FolderOpen className="h-4 w-4 text-amber-600" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {s.citations.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <HelpfulRateBar rate={s.helpfulRate} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {relativeTime(s.source.lastModified)}
                  </TableCell>
                  <TableCell>
                    <StaleBadge status={s.staleStatus} days={s.staleDays} />
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {s.source.owner}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function SortableHead({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: SourceSortKey;
  currentKey: SourceSortKey;
  currentDir: SourceSortDir;
  onSort: (key: SourceSortKey) => void;
}) {
  const active = currentKey === sortKey;
  return (
    <TableHead
      className="cursor-pointer select-none"
      onClick={() => onSort(sortKey)}
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

function HelpfulRateBar({ rate }: { rate: number }) {
  const color =
    rate >= 75
      ? "bg-green-500"
      : rate >= 50
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="font-mono text-xs">{rate}%</span>
    </div>
  );
}

function StaleBadge({
  status,
  days,
}: {
  status: "fresh" | "aging" | "stale";
  days: number;
}) {
  if (status === "fresh") return null;
  if (status === "aging") {
    return (
      <Badge
        variant="outline"
        className="border-amber-300 text-amber-700 text-[10px]"
      >
        AGING
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="text-[10px]">
      STALE: {days}D
    </Badge>
  );
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
