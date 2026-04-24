-- Bot Config V1 — prompts table + versioning RPCs.
--
-- One table. Each row is one version of one slot's prompt. The partial
-- unique index guarantees exactly one active row per slot.

create table prompts (
  id            uuid primary key default gen_random_uuid(),
  slot_id       text not null,
  version       text not null,
  prompt_text   text not null,
  model         text not null,
  description   text not null,
  is_active     boolean not null default false,
  created_at    timestamptz not null default now(),
  created_by    text,

  unique (slot_id, version)
);

create unique index prompts_one_active_per_slot
  on prompts (slot_id)
  where is_active;

create index prompts_slot_created_idx
  on prompts (slot_id, created_at desc);

-- Save: demote current active, insert new active. Atomic.
create or replace function save_prompt_version(
  p_slot_id     text,
  p_version     text,
  p_prompt_text text,
  p_model       text,
  p_description text
) returns uuid
language plpgsql
as $$
declare
  v_new_id uuid;
begin
  update prompts
    set is_active = false
    where slot_id = p_slot_id and is_active;

  insert into prompts (slot_id, version, prompt_text, model, description, is_active)
  values (p_slot_id, p_version, p_prompt_text, p_model, p_description, true)
  returning id into v_new_id;

  return v_new_id;
end;
$$;

-- Rollback: flip the active flag to a prior version. No new row.
create or replace function rollback_prompt(
  p_slot_id    text,
  p_version_id uuid
) returns void
language plpgsql
as $$
begin
  update prompts
    set is_active = false
    where slot_id = p_slot_id and is_active;

  update prompts
    set is_active = true
    where id = p_version_id and slot_id = p_slot_id;
end;
$$;
