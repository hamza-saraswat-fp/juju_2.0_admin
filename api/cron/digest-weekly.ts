import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runDigest } from "../_lib/digestRunner";

/**
 * Vercel Cron target — runs Mondays per vercel.json. Authentication is
 * handled by the Edge Middleware (Bearer ${CRON_SECRET}).
 */
export default async function handler(
  _req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const result = await runDigest("weekly", "cron");
  res.status(result.status === "failed" ? 500 : 200).json(result);
}
