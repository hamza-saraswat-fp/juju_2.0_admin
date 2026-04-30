import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runDigest } from "../_lib/digestRunner";

/**
 * Vercel Cron target — runs at the schedule defined in vercel.json
 * (currently 16:00 UTC Mondays = 10:00 AM CST / 11:00 AM CDT).
 *
 * Authentication is handled by the Edge Middleware which accepts
 * `Authorization: Bearer ${CRON_SECRET}` for /api/cron/* paths.
 */
export default async function handler(
  _req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const result = await runDigest("weekly", "cron");
  res.status(result.status === "failed" ? 500 : 200).json(result);
}
