import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface AppConfig {
  daily_digest_enabled: boolean;
  weekly_digest_enabled: boolean;
  digest_channel_id: string | null;
  daily_digest_template: string | null;
  weekly_digest_template: string | null;
  updated_at: string;
}

export interface DigestLogEntry {
  id: string;
  kind: "daily" | "weekly";
  triggered_by: "cron" | "manual";
  channel_id: string;
  status: "sent" | "skipped" | "failed";
  error: string | null;
  created_at: string;
}

/**
 * Reads the singleton `app_config` row + the most recent digest_log entries.
 * Provides an `update` mutator that PATCHes the config row.
 */
export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [log, setLog] = useState<DigestLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [{ data: cfg, error: cfgErr }, { data: rows, error: logErr }] =
      await Promise.all([
        supabase
          .from("app_config")
          .select(
            "daily_digest_enabled, weekly_digest_enabled, digest_channel_id, daily_digest_template, weekly_digest_template, updated_at",
          )
          .eq("id", 1)
          .single(),
        supabase
          .from("digest_log")
          .select("id, kind, triggered_by, channel_id, status, error, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    if (cfgErr) {
      console.error("[useAppConfig] config read failed:", cfgErr);
      setError(cfgErr.message);
      setIsLoading(false);
      return;
    }
    if (logErr) {
      console.error("[useAppConfig] log read failed:", logErr);
    }

    setConfig(cfg as AppConfig);
    setLog((rows ?? []) as DigestLogEntry[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const update = useCallback(
    async (patch: Partial<Omit<AppConfig, "updated_at">>) => {
      const { error: err } = await supabase
        .from("app_config")
        .update(patch)
        .eq("id", 1);
      if (err) {
        console.error("[useAppConfig] update failed:", err);
        setError(err.message);
        return false;
      }
      await fetch();
      return true;
    },
    [fetch],
  );

  return { config, log, isLoading, error, refetch: fetch, update };
}
