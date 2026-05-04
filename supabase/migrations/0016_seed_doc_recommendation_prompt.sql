-- 0016_seed_doc_recommendation_prompt.sql
-- Seeds the prompt slot used by the doc-recommendation generator edge
-- function (supabase/functions/generate-doc-recommendation/index.ts).
--
-- The function reads this slot via the same `prompts` table the bot uses,
-- so the active prompt + model can be hot-swapped from the Bot Config admin
-- page without redeploying the function.

SELECT save_prompt_version(
  'doc_recommendation_generator',
  '1.0',
$prompt$You are analyzing a knowledge gap that surfaced in our internal AI assistant Juju.

A user asked Juju a question. Juju produced an answer (citing some sources). A human product owner reviewed Juju's answer and submitted a verified correct answer because Juju was wrong, incomplete, or missing context.

YOUR JOB: classify the kind of doc work this gap requires, and explain it in plain language for the education team who maintains the docs.

You will receive JSON with: question, original_juju_answer, cited_sources (each {url, title, body, fetch_status, source_type}), and verified_answer.

CLASSIFICATIONS — pick exactly one:

- "correction": Juju cited specific pages, but the cited content is wrong, outdated, or directly contradicts the verified answer. The fix is to update an existing page.

- "gap": Juju had no relevant sources to cite, or only cited generic/tangentially-related ones. The verified answer reveals knowledge that doesn't exist in docs at all. The fix is to write a new page.

- "clarification": Sources exist and Juju cited them correctly, but their wording is ambiguous enough that a careful reader would still misunderstand. The cited content isn't wrong — it just needs sharper language. The fix is to rewrite the existing page for clarity, not add new content.

OUTPUT — return ONLY a JSON object, no prose around it:

{
  "classification": "correction" | "gap" | "clarification",
  "synopsis": "1-2 sentences. Concrete and specific. Names the doc and the issue. Fits in a table cell (max ~120 chars).",
  "full_reasoning": "3-6 sentences. Reference cited pages by title where relevant. Explain the gap concretely — what does the cited content say vs what the verified answer says? End with a brief recommended action (1 sentence). Use light markdown if helpful (- bullets) but no headers."
}

EXAMPLES:

Synopsis good: "Card Fees page lists 2.9% but verified answer specifies 2.6% for tier-2 customers — the doc is missing the tier conditional."
Synopsis bad: "There is a knowledge gap related to fees and customer tiers." (vague, no specifics)

Full reasoning good: "Juju cited the Card Fees page (Help Center) which states a flat 2.9% rate. The verified answer reveals a tier-conditional structure: tier-2 customers get 2.6%, tier-3 get 2.4%. The cited page makes no mention of tiers at all.\n\n- Recommended action: add a tier-conditional rate table to the Card Fees page, sourced from the verified answer."
Full reasoning bad: "The answer was wrong. The doc should be updated to include the correct information." (no specifics, no diff, no action)

Be honest about uncertainty. If the cited sources failed to fetch (fetch_status != "ok"), say so — don't pretend you read pages you didn't.$prompt$,
  'anthropic/claude-haiku-4.5',
  'Generates AI recommendations for Slack-flagged doc requests'
);

-- ─── Vault entries + pg_cron schedule ────────────────────────────────
-- Mirrors the digest cron pattern from 0013_digest_cron.sql.
--
-- The Vault entries are created with placeholder values here so the
-- migration is idempotent and re-runnable. After applying, replace the
-- function_key value in Vault with the project's anon key (or rotate
-- by updating the entry).
--
-- The function itself is deployed with --no-verify-jwt; the bearer is
-- transport-only. verify_jwt=false on the function means the body of
-- the request is what determines authorization (cron sends {}, manual
-- regen sends {id, force:true}).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'doc_recommendation_function_url') THEN
    PERFORM vault.create_secret(
      'https://<project_ref>.supabase.co/functions/v1/generate-doc-recommendation',
      'doc_recommendation_function_url'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'doc_recommendation_function_key') THEN
    PERFORM vault.create_secret('<replace-with-anon-key>', 'doc_recommendation_function_key');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'doc-recommendation-tick') THEN
    PERFORM cron.unschedule('doc-recommendation-tick');
  END IF;
END $$;

SELECT cron.schedule(
  'doc-recommendation-tick',
  '*/2 * * * *',
  $cron$
    select net.http_post(
      url     := (select decrypted_secret from vault.decrypted_secrets
                   where name = 'doc_recommendation_function_url'),
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret
                                         from vault.decrypted_secrets
                                         where name = 'doc_recommendation_function_key')
      ),
      body    := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $cron$
);
