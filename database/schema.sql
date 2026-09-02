-- Optional PostgreSQL runtime schema for WorldCupIQ.
-- The API uses this only when WORLDCUPIQ_DATABASE_URL is configured.

create table if not exists teams (
  id text primary key,
  name text not null,
  fifa_code text not null unique,
  confederation text not null,
  group_name text,
  strength_rating numeric(5,2),
  form_index numeric(5,2),
  squad_strength numeric(5,2),
  last_five_results jsonb not null default '[]'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists players (
  id text primary key,
  team_id text not null references teams(id),
  name text not null,
  position text not null,
  club text,
  club_form_index numeric(5,2),
  goal_threat numeric(5,2),
  likely_starter boolean default false,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists fixtures (
  id text primary key,
  home_team_id text not null references teams(id),
  away_team_id text not null references teams(id),
  kickoff_utc timestamptz not null,
  venue text,
  tournament_stage text not null,
  group_name text,
  status text not null default 'scheduled',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists data_sync_runs (
  id bigserial primary key,
  provider_name text not null,
  team_count integer not null,
  player_count integer not null,
  fixture_count integer not null,
  synced_at timestamptz not null default now()
);

create table if not exists predictions (
  id text primary key,
  match_id text references fixtures(id),
  home_team_id text not null references teams(id),
  away_team_id text not null references teams(id),
  model_name text not null,
  model_version text not null,
  home_win_probability numeric(6,5) not null,
  draw_probability numeric(6,5) not null,
  away_win_probability numeric(6,5) not null,
  expected_goals_home numeric(6,3),
  expected_goals_away numeric(6,3),
  confidence_label text,
  explanation text,
  likely_scorers jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  formula_snapshot jsonb not null default '{}'::jsonb,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  generated_at timestamptz default now()
);

create table if not exists match_results (
  id bigserial primary key,
  fixture_id text not null references fixtures(id),
  home_goals integer not null,
  away_goals integer not null,
  result_status text not null default 'final',
  recorded_at timestamptz default now()
);

create table if not exists model_runs (
  id text primary key,
  prediction_id text references predictions(id) on delete cascade,
  model_name text not null,
  model_version text not null,
  input_snapshot jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz default now()
);
