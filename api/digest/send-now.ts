import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runDigest, type DigestKind } from "../_lib/digestRunner";

/**
 * Manual "send now" trigger from the admin UI.
 *
 *   POST /api/digest/send-now?kind=daily
 *   POST /api/digest/send-now?kind=weekly
 *
 * Authentication is handled by the Edge Middleware (Basic Auth, same as
 * the SPA). Bypasses the enable flag — this is explicit user intent.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const kindRaw = (req.query.kind ?? "").toString();
  if (kindRaw !== "daily" && kindRaw !== "weekly") {
    res.status(400).json({ error: "kind query param must be 'daily' or 'weekly'" });
    return;
  }
  const kind: DigestKind = kindRaw;

  const result = await runDigest(kind, "manual");
  res.status(result.status === "failed" ? 500 : 200).json(result);
}
