CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(320),
  display_name varchar(128),
  timezone varchar(64) NOT NULL DEFAULT 'Asia/Shanghai',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  source varchar(32) NOT NULL,
  source_activity_id varchar(255),
  activity_type varchar(64) NOT NULL,
  activity_name varchar(255),
  device_name varchar(255),
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  timezone varchar(64),
  duration_seconds integer,
  moving_seconds integer,
  distance_meters double precision,
  elevation_gain_meters double precision,
  elevation_loss_meters double precision,
  calories integer,
  avg_speed_mps double precision,
  max_speed_mps double precision,
  avg_heart_rate integer,
  max_heart_rate integer,
  avg_cadence double precision,
  max_cadence double precision,
  avg_power integer,
  max_power integer,
  status varchar(32) NOT NULL DEFAULT 'READY',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activities_source_source_activity_unique UNIQUE(source, source_activity_id)
);

CREATE TABLE IF NOT EXISTS activity_track_points (
  id bigserial PRIMARY KEY,
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  timestamp timestamptz NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  elevation_meters double precision,
  distance_meters double precision,
  speed_mps double precision,
  pace_seconds_per_km double precision,
  heart_rate integer,
  cadence double precision,
  power integer,
  temperature_celsius double precision,
  CONSTRAINT track_activity_sequence_unique UNIQUE(activity_id, sequence)
);
CREATE INDEX IF NOT EXISTS track_activity_timestamp_idx ON activity_track_points(activity_id, timestamp);

CREATE TABLE IF NOT EXISTS activity_laps (
  id bigserial PRIMARY KEY,
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  lap_index integer NOT NULL,
  start_time timestamptz,
  duration_seconds integer,
  distance_meters double precision,
  avg_speed_mps double precision,
  avg_heart_rate integer,
  max_heart_rate integer,
  avg_cadence double precision,
  elevation_gain_meters double precision,
  elevation_loss_meters double precision,
  CONSTRAINT activity_lap_unique UNIQUE(activity_id, lap_index)
);

CREATE TABLE IF NOT EXISTS activity_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  file_type varchar(32) NOT NULL,
  storage_provider varchar(32) NOT NULL,
  storage_key text NOT NULL,
  content_type varchar(128),
  file_size bigint,
  sha256 varchar(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_file_unique UNIQUE(activity_id, file_type)
);
