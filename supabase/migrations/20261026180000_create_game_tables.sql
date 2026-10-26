
-- Gingerbread Operation: core database tables

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  work_email text not null unique,
  created_at timestamptz not null default now(),
  last_played_at timestamptz
);

create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  score integer not null default 0 check (score >= 0),
  objects_removed integer not null default 0 check (objects_removed >= 0),
  tickets_remaining integer not null default 0 check (tickets_remaining between 0 and 10),
  completed_at timestamptz not null default now()
);

-- Enable row-level security on both tables
alter table public.players enable row level security;
alter table public.game_results enable row level security;

-- Do not allow public browser access until secure policies
-- and server-side submission logic are configured.
revoke all on table public.players from anon, authenticated;
revoke all on table public.game_results from anon, authenticated;
