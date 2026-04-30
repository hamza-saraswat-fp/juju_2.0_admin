import type { SlackBlock } from "./digestPayload";

// Local declaration so this file type-checks under both the Vite SPA build
// (no @types/node) and the Vercel serverless build (Node runtime). Only
// the SLACK_BOT_TOKEN env var is read; nothing else from `process`.
declare const process: { env: { SLACK_BOT_TOKEN?: string } };

interface SlackPostMessageResponse {
  ok: boolean;
  error?: string;
  ts?: string;
  channel?: string;
}

/**
 * Posts a Slack message via chat.postMessage. Reads SLACK_BOT_TOKEN from
 * env at call time (no module-level capture — safer for serverless).
 *
 * Returns the message timestamp on success; throws with the Slack error
 * code on failure (e.g. `not_in_channel`, `channel_not_found`,
 * `invalid_auth`).
 */
export async function postSlackMessage(opts: {
  channel: string;
  text: string;
  blocks: SlackBlock[];
}): Promise<{ ts: string }> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN env var not set");
  }

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel: opts.channel,
      text: opts.text,
      blocks: opts.blocks,
      unfurl_links: false,
      unfurl_media: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Slack HTTP ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as SlackPostMessageResponse;
  if (!body.ok) {
    throw new Error(`Slack API error: ${body.error ?? "unknown"}`);
  }
  return { ts: body.ts ?? "" };
}
