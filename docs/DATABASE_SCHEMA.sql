-- DATABASE_SCHEMA.sql
-- Complete database schema for Isaac Wilson Darts Team App
-- WARNING: This schema is for documentation only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

-- =================================================================
-- PLAYERS & USER MANAGEMENT
-- =================================================================

-- Core players table
CREATE TABLE public.players (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  weeks_attended integer DEFAULT 0,
  games_played integer DEFAULT 0,
  games_won integer DEFAULT 0,
  games_lost integer DEFAULT 0,
  last_game_week integer,
  created_at timestamp with time zone DEFAULT now(),
  total_darts integer DEFAULT 0,
  total_180s integer DEFAULT 0,
  win_percentage numeric DEFAULT 0.00,
  highest_checkout integer DEFAULT 0,
  checkout_attempts integer DEFAULT 0,
  checkout_hits integer DEFAULT 0,
  last_result character varying, -- 'win', 'loss', null
  consecutive_losses integer DEFAULT 0,
  drop_week integer, -- week number they must sit, null if available
  CONSTRAINT players_pkey PRIMARY KEY (id)
);

-- User roles for authentication
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  role character varying NOT NULL DEFAULT 'player'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Player statistics by season
CREATE TABLE public.player_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  league_year character varying NOT NULL,
  double_in_attempts integer DEFAULT 0,
  double_in_hits integer DEFAULT 0,
  double_in_percentage numeric DEFAULT 0.00,
  double_out_attempts integer DEFAULT 0,
  double_out_hits integer DEFAULT 0,
  double_out_percentage numeric DEFAULT 0.00,
  total_darts_thrown integer DEFAULT 0,
  total_points_scored integer DEFAULT 0,
  three_dart_average numeric DEFAULT 0.00,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT player_stats_pkey PRIMARY KEY (id),
  CONSTRAINT player_stats_player_fkey FOREIGN KEY (player_id) REFERENCES public.players(id)
);

-- =================================================================
-- FIXTURES & ATTENDANCE
-- =================================================================

-- Season fixtures
CREATE TABLE public.fixtures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  league_year text NOT NULL DEFAULT '2025/26'::text,
  week_number integer NOT NULL,
  match_date date NOT NULL,
  venue character varying NOT NULL CHECK (venue::text = ANY (ARRAY['home'::character varying, 'away'::character varying]::text[])),
  result text DEFAULT 'Still to play'::text CHECK (result = ANY (ARRAY['win'::character varying::text, 'loss'::character varying::text, 'to_play'::character varying::text])),
  created_at timestamp with time zone DEFAULT now(),
  opposition text,
  status character varying DEFAULT 'to_play'::character varying,
  team_won boolean,
  CONSTRAINT fixtures_pkey PRIMARY KEY (id)
);

-- Weekly attendance tracking
CREATE TABLE public.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  league_year character varying NOT NULL,
  week_number integer NOT NULL,
  attended boolean DEFAULT true,
  selected boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_player_fkey FOREIGN KEY (player_id) REFERENCES public.players(id),
  UNIQUE(player_id, week_number, league_year)
);

-- =================================================================
-- MATCH & GAME TRACKING
-- =================================================================

-- Individual league games within fixtures
CREATE TABLE public.league_games (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  fixture_id uuid NOT NULL,
  game_number integer NOT NULL CHECK (game_number >= 1 AND game_number <= 7),
  our_player_id uuid NOT NULL,
  opponent_name character varying NOT NULL,
  result character varying NOT NULL CHECK (result::text = ANY (ARRAY['win'::character varying, 'loss'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT league_games_pkey PRIMARY KEY (id),
  CONSTRAINT league_games_fixture_fkey FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id),
  CONSTRAINT league_games_player_fkey FOREIGN KEY (our_player_id) REFERENCES public.players(id)
);

-- Detailed dart-by-dart tracking
CREATE TABLE public.dart_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  league_game_id uuid NOT NULL,
  player_id uuid NOT NULL,
  dart_number integer,
  dart_score integer NOT NULL CHECK (dart_score >= 0 AND dart_score <= 60),
  running_total integer NOT NULL CHECK (running_total >= 0 AND running_total <= 501),
  is_double_attempt boolean DEFAULT false,
  is_checkout_attempt boolean DEFAULT false,
  leg_won boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  checkout_successful boolean DEFAULT false,
  turn_number integer,
  dart_in_turn integer,
  leg_number integer DEFAULT 1,
  CONSTRAINT dart_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT dart_tracking_player_fkey FOREIGN KEY (player_id) REFERENCES public.players(id),
  CONSTRAINT dart_tracking_game_fkey FOREIGN KEY (league_game_id) REFERENCES public.league_games(id)
);

-- Comprehensive game statistics
CREATE TABLE public.game_statistics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_id uuid,
  player_name character varying NOT NULL,
  game_type character varying NOT NULL CHECK (game_type::text = ANY (ARRAY['league'::character varying, 'practice'::character varying]::text[])),
  game_session_id uuid,
  fixture_id uuid,
  game_date date NOT NULL,
  league_year character varying NOT NULL DEFAULT '2025-26'::character varying,
  opponent_type character varying NOT NULL CHECK (opponent_type::text = ANY (ARRAY['team'::character varying, 'player'::character varying]::text[])),
  opponent_name character varying NOT NULL,
  opponent_player_id uuid,
  game_won boolean NOT NULL,
  legs_played integer NOT NULL DEFAULT 1,
  legs_won integer NOT NULL DEFAULT 0,
  total_darts integer DEFAULT 0,
  total_points integer DEFAULT 0,
  scores_180 integer DEFAULT 0,
  scores_140_plus integer DEFAULT 0,
  scores_100_plus integer DEFAULT 0,
  scores_80_plus integer DEFAULT 0,
  double_attempts integer DEFAULT 0,
  double_hits integer DEFAULT 0,
  checkout_attempts integer DEFAULT 0,
  checkout_hits integer DEFAULT 0,
  highest_checkout integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT game_statistics_pkey PRIMARY KEY (id),
  CONSTRAINT game_statistics_opponent_player_id_fkey FOREIGN KEY (opponent_player_id) REFERENCES public.players(id),
  CONSTRAINT game_statistics_fixture_id_fkey FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id),
  CONSTRAINT game_statistics_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id)
);

-- Match results summary
CREATE TABLE public.match_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  fixture_id uuid NOT NULL,
  player_id uuid NOT NULL,
  result character varying CHECK (result::text = ANY (ARRAY['win'::character varying, 'loss'::character varying]::text[])),
  darts_thrown integer DEFAULT 0,
  legs_played integer DEFAULT 0,
  legs_won integer DEFAULT 0,
  score_180s integer DEFAULT 0,
  double_attempts integer DEFAULT 0,
  double_hits integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT match_results_pkey PRIMARY KEY (id),
  CONSTRAINT match_results_fixture_fkey FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id),
  CONSTRAINT match_results_player_fkey FOREIGN KEY (player_id) REFERENCES public.players(id)
);

-- =================================================================
-- WARM-UP TOURNAMENT SYSTEM
-- =================================================================

-- Warm-up sessions
CREATE TABLE public.warmup_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  week_number integer,
  format character varying NOT NULL CHECK (format::text = ANY (ARRAY['single_leg'::character varying, 'best_of_3'::character varying]::text[])),
  player_count integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT warmup_sessions_pkey PRIMARY KEY (id)
);

-- Individual warm-up games
CREATE TABLE public.warmup_games (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  game_number character varying NOT NULL,
  round_number integer,
  player1_id uuid,
  player1_name character varying NOT NULL,
  player2_id uuid,
  player2_name character varying NOT NULL,
  player1_legs integer DEFAULT 0,
  player2_legs integer DEFAULT 0,
  winner_id uuid,
  winner_name character varying,
  completed boolean DEFAULT false,
  format character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT warmup_games_pkey PRIMARY KEY (id),
  CONSTRAINT warmup_games_session_fkey FOREIGN KEY (session_id) REFERENCES public.warmup_sessions(id) ON DELETE CASCADE,
  CONSTRAINT warmup_games_player1_fkey FOREIGN KEY (player1_id) REFERENCES public.players(id) ON DELETE SET NULL,
  CONSTRAINT warmup_games_player2_fkey FOREIGN KEY (player2_id) REFERENCES public.players(id) ON DELETE SET NULL
);

-- Individual legs within warm-up games
CREATE TABLE public.warmup_legs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  leg_number integer NOT NULL,
  player1_darts integer,
  player2_darts integer,
  winner_id uuid,
  winner_name character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT warmup_legs_pkey PRIMARY KEY (id),
  CONSTRAINT warmup_legs_game_fkey FOREIGN KEY (game_id) REFERENCES public.warmup_games(id) ON DELETE CASCADE
);

-- =================================================================
-- INDEXES FOR PERFORMANCE
-- =================================================================

-- Player lookup optimization
CREATE INDEX idx_players_name ON public.players(name);
CREATE INDEX idx_players_active ON public.players(drop_week) WHERE drop_week IS NULL;

-- Fixture and attendance queries
CREATE INDEX idx_fixtures_league_year_week ON public.fixtures(league_year, week_number);
CREATE INDEX idx_attendance_week_league ON public.attendance(week_number, league_year);
CREATE INDEX idx_attendance_player_week ON public.attendance(player_id, week_number);

-- Game and statistics queries
CREATE INDEX idx_league_games_fixture ON public.league_games(fixture_id);
CREATE INDEX idx_league_games_player ON public.league_games(our_player_id);
CREATE INDEX idx_dart_tracking_game ON public.dart_tracking(league_game_id);
CREATE INDEX idx_dart_tracking_player ON public.dart_tracking(player_id);

-- Warm-up tournament queries
CREATE INDEX idx_warmup_games_session ON public.warmup_games(session_id);
CREATE INDEX idx_warmup_legs_game ON public.warmup_legs(game_id);

-- =================================================================
-- INITIAL DATA (Current Team Players)
-- =================================================================

-- Team members (as documented in current system)
INSERT INTO public.players (name) VALUES
  ('Tracey'), ('Jordan'), ('Taffy'), ('Ross'), ('Layton'), ('Fran'),
  ('Boyce'), ('Clayton'), ('Peter'), ('Dave'), ('Liam'), ('Mark'),
  ('John Breeze'), ('Tommy')
ON CONFLICT (name) DO NOTHING;