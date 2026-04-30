import { useEffect, useMemo, useState } from "react";
import { Hash, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppConfig, type DigestLogEntry } from "@/hooks/useAppConfig";
import { supabase } from "@/lib/supabase";
import {
  DAILY_VARIABLES,
  DEFAULT_DAILY_TEMPLATE,
  DEFAULT_WEEKLY_TEMPLATE,
  WEEKLY_VARIABLES,
  fetchDailyVars,
  fetchWeeklyVars,
} from "@/lib/digestPayload";
import { cn, relativeTime } from "@/lib/utils";

export function DigestSection() {
  const { config, log, isLoading, update, refetch } = useAppConfig();
  const [channelDraft, setChannelDraft] = useState("");
  const [dailyDraft, setDailyDraft] = useState("");
  const [weeklyDraft, setWeeklyDraft] = useState("");
  const [sending, setSending] = useState<"daily" | "weekly" | null>(null);

  const [dailyVars, setDailyVars] = useState<Record<string, string> | null>(null);
  const [weeklyVars, setWeeklyVars] = useState<Record<string, string> | null>(null);

  // Sync drafts from server state when it loads/changes.
  useEffect(() => {
    if (!config) return;
    setChannelDraft(config.digest_channel_id ?? "");
    setDailyDraft(config.daily_digest_template ?? DEFAULT_DAILY_TEMPLATE);
    setWeeklyDraft(config.weekly_digest_template ?? DEFAULT_WEEKLY_TEMPLATE);
  }, [config]);

  // Fetch current variable values once for the live preview.
  useEffect(() => {
    fetchDailyVars(supabase).then(setDailyVars).catch(() => setDailyVars({}));
    fetchWeeklyVars(supabase).then(setWeeklyVars).catch(() => setWeeklyVars({}));
  }, []);

  if (isLoading || !config) {
    return (
      <Card className="p-5">
        <Header />
        <div className="mt-4 h-32 animate-pulse rounded-lg bg-surface-deep" />
      </Card>
    );
  }

  const channelDirty = channelDraft.trim() !== (config.digest_channel_id ?? "");
  const dailyDirty =
    dailyDraft !== (config.daily_digest_template ?? DEFAULT_DAILY_TEMPLATE);
  const weeklyDirty =
    weeklyDraft !== (config.weekly_digest_template ?? DEFAULT_WEEKLY_TEMPLATE);
  const lastSent = (kind: "daily" | "weekly") =>
    log.find((e) => e.kind === kind && e.status === "sent");

  async function handleToggle(kind: "daily" | "weekly", next: boolean) {
    const ok = await update(
      kind === "daily"
        ? { daily_digest_enabled: next }
        : { weekly_digest_enabled: next },
    );
    if (!ok) toast.error(`Couldn't update ${kind} toggle`);
  }

  async function handleChannelSave() {
    const trimmed = channelDraft.trim() || null;
    const ok = await update({ digest_channel_id: trimmed });
    if (ok) toast.success("Channel saved");
    else toast.error("Couldn't save channel");
  }

  async function handleSaveTemplate(kind: "daily" | "weekly") {
    const ok = await update(
      kind === "daily"
        ? { daily_digest_template: dailyDraft }
        : { weekly_digest_template: weeklyDraft },
    );
    if (ok) toast.success(`${kind === "daily" ? "Daily" : "Weekly"} template saved`);
    else toast.error("Couldn't save template");
  }

  async function handleResetTemplate(kind: "daily" | "weekly") {
    const def = kind === "daily" ? DEFAULT_DAILY_TEMPLATE : DEFAULT_WEEKLY_TEMPLATE;
    if (kind === "daily") setDailyDraft(def);
    else setWeeklyDraft(def);
    const ok = await update(
      kind === "daily"
        ? { daily_digest_template: def }
        : { weekly_digest_template: def },
    );
    if (ok) toast.success("Reset to default");
  }

  async function handleSendNow(kind: "daily" | "weekly") {
    setSending(kind);
    try {
      const res = await fetch(`/api/digest/send-now?kind=${kind}`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === "sent") {
        toast.success(`${kind === "daily" ? "Daily" : "Weekly"} digest sent`);
      } else if (body.status === "skipped") {
        toast.warning(`Skipped: ${body.message ?? "no channel configured"}`);
      } else {
        toast.error(
          `Failed: ${body.error ?? body.message ?? `HTTP ${res.status}`}`,
        );
      }
    } catch (err) {
      toast.error(
        `Network error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSending(null);
      refetch();
    }
  }

  return (
    <Card className="p-5">
      <Header />

      <div className="mt-5 space-y-4">
        {/* Channel input */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
            Slack channel ID
          </label>
          <div className="mt-1.5 flex gap-2">
            <Input
              value={channelDraft}
              onChange={(e) => setChannelDraft(e.target.value)}
              placeholder="C0123456789"
              className="font-mono"
            />
            <Button
              variant="default"
              size="sm"
              onClick={handleChannelSave}
              disabled={!channelDirty}
            >
              Save
            </Button>
          </div>
          <p className="mt-1 text-xs text-on-surface-faint">
            Find this in Slack → channel name → "Get channel details" → bottom
            of the About tab. The Juju bot must be a member.
          </p>
        </div>

        {/* Daily row */}
        <DigestRow
          label="Daily digest"
          subtitle="Posted weekday mornings (~9am CT) summarizing yesterday."
          enabled={config.daily_digest_enabled}
          onToggle={(v) => handleToggle("daily", v)}
          lastSent={lastSent("daily")}
          onSendNow={() => handleSendNow("daily")}
          sending={sending === "daily"}
          channelSet={Boolean(config.digest_channel_id)}
        />

        {/* Weekly row */}
        <DigestRow
          label="Weekly digest"
          subtitle="Posted Monday mornings (~9am CT) summarizing the prior week."
          enabled={config.weekly_digest_enabled}
          onToggle={(v) => handleToggle("weekly", v)}
          lastSent={lastSent("weekly")}
          onSendNow={() => handleSendNow("weekly")}
          sending={sending === "weekly"}
          channelSet={Boolean(config.digest_channel_id)}
        />
      </div>

      {/* Template editors */}
      <div className="mt-6 space-y-4">
        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
          Message templates
        </p>

        <TemplateEditor
          label="Daily template"
          value={dailyDraft}
          onChange={setDailyDraft}
          variables={DAILY_VARIABLES}
          previewVars={dailyVars}
          dirty={dailyDirty}
          onSave={() => handleSaveTemplate("daily")}
          onReset={() => handleResetTemplate("daily")}
        />

        <TemplateEditor
          label="Weekly template"
          value={weeklyDraft}
          onChange={setWeeklyDraft}
          variables={WEEKLY_VARIABLES}
          previewVars={weeklyVars}
          dirty={weeklyDirty}
          onSave={() => handleSaveTemplate("weekly")}
          onReset={() => handleResetTemplate("weekly")}
        />
      </div>

      {/* Recent log */}
      {log.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
            Recent runs
          </p>
          <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-card-soft">
            {log.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-3 px-3 py-2 text-xs"
              >
                <StatusDot status={entry.status} />
                <span className="font-medium capitalize">{entry.kind}</span>
                <span className="text-on-surface-variant">
                  {entry.triggered_by === "cron" ? "scheduled" : "manual"}
                </span>
                {entry.error && (
                  <span
                    className="truncate font-mono text-rose-700"
                    title={entry.error}
                  >
                    {entry.error}
                  </span>
                )}
                <span className="ml-auto font-mono text-on-surface-faint">
                  {relativeTime(entry.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2">
      <Hash className="h-4 w-4 text-on-surface-variant" />
      <h2 className="text-base font-semibold tracking-tight">Slack digest</h2>
    </div>
  );
}

function DigestRow({
  label,
  subtitle,
  enabled,
  onToggle,
  lastSent,
  onSendNow,
  sending,
  channelSet,
}: {
  label: string;
  subtitle: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
  lastSent?: DigestLogEntry;
  onSendNow: () => void;
  sending: boolean;
  channelSet: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-line bg-card-soft p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          <Switch checked={enabled} onChange={onToggle} />
        </div>
        <p className="mt-1 text-xs text-on-surface-variant">{subtitle}</p>
        {lastSent && (
          <p className="mt-1 text-xs text-on-surface-faint">
            Last sent {relativeTime(lastSent.created_at)} ·{" "}
            {lastSent.triggered_by === "cron" ? "scheduled" : "manual"}
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onSendNow}
        disabled={sending || !channelSet}
        className="gap-1.5"
      >
        <Send className="h-3.5 w-3.5" />
        {sending ? "Sending…" : "Send now"}
      </Button>
    </div>
  );
}

function TemplateEditor({
  label,
  value,
  onChange,
  variables,
  previewVars,
  dirty,
  onSave,
  onReset,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  variables: ReadonlyArray<string>;
  previewVars: Record<string, string> | null;
  dirty: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  const rendered = useMemo(() => {
    if (!previewVars) return value;
    return value.replace(/\{(\w+)\}/g, (_m, k) =>
      Object.prototype.hasOwnProperty.call(previewVars, k)
        ? previewVars[k]
        : `{${k}}`,
    );
  }, [value, previewVars]);

  return (
    <div className="rounded-xl border border-line bg-card-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="gap-1.5 text-on-surface-variant hover:text-on-surface"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to default
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onSave}
            disabled={!dirty}
          >
            Save
          </Button>
        </div>
      </div>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={7}
        className="mt-3 font-mono text-xs"
      />

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-on-surface-variant">Variables:</span>
        {variables.map((v) => (
          <code
            key={v}
            className="rounded border border-line bg-card px-1.5 py-0.5 text-[11px] font-mono text-on-surface-variant"
          >{`{${v}}`}</code>
        ))}
      </div>

      <div className="mt-3">
        <p className="text-[11px] uppercase tracking-wider text-on-surface-faint">
          Preview (current data)
        </p>
        <div className="mt-1.5 rounded-lg border border-line bg-card p-3">
          <MrkdwnPreview text={rendered} />
        </div>
      </div>
    </div>
  );
}

/** Tiny renderer that turns Slack-style mrkdwn (`*bold*`, `_italic_`, line
 * breaks) into safely-escaped HTML for a faithful-ish preview. */
function MrkdwnPreview({ text }: { text: string }) {
  const html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
    .replace(/_([^_\n]+)_/g, "<em>$1</em>")
    .replace(/\n/g, "<br />");
  return (
    <div
      className="text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-page-accent" : "bg-surface-deep",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function StatusDot({ status }: { status: DigestLogEntry["status"] }) {
  const tone =
    status === "sent"
      ? "bg-emerald-500"
      : status === "skipped"
        ? "bg-on-surface-faint"
        : "bg-rose-500";
  return (
    <span
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", tone)}
      title={status}
    />
  );
}
