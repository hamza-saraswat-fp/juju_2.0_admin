import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runDigest } from "../_lib/digestRunner";

/**
 * Vercel Cron target — runs at the schedule defined in vercel.json
 * (currently 22:30 UTC weekdays = 4:30 PM CST / 5:30 PM CDT).
 *
 * Authentication is handled by the Edge Middleware which accepts
 * `Authorization: Bearer ${CRON_SECRET}` for /api/cron/* paths.
 */
export default async function handler(
  _req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const result = await runDigest("daily", "cron");
  res.status(result.status === "failed" ? 500 : 200).json(result);
}
