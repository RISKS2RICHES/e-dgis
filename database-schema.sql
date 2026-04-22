-- E-DGIS Database Schema
-- Run this in Supabase SQL editor

-- Flights Table (Real-time + Historical)
CREATE TABLE flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icao_24 VARCHAR(6) NOT NULL,
  callsign VARCHAR(8),
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  altitude DECIMAL(10, 2),
  velocity DECIMAL(10, 2),
  heading DECIMAL(5, 2),
  vertical_rate DECIMAL(10, 2),
  aircraft_type VARCHAR(50),
  registration VARCHAR(20),
  operator VARCHAR(100),
  source VARCHAR(50), -- 'ADSB_ONE', 'ADSB_EXCHANGE', 'OPENSKY'
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_flights_timestamp ON flights(timestamp DESC);
CREATE INDEX idx_flights_location ON flights(latitude, longitude);
CREATE INDEX idx_flights_icao ON flights(icao_24);

-- Vessels Table (Real-time + Historical)
CREATE TABLE vessels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mmsi VARCHAR(9) NOT NULL UNIQUE,
  imo VARCHAR(10),
  call_sign VARCHAR(7),
  vessel_name VARCHAR(120),
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  course DECIMAL(5, 2),
  speed DECIMAL(8, 2),
  heading DECIMAL(5, 2),
  vessel_type VARCHAR(50),
  destination VARCHAR(120),
  status VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vessels_timestamp ON vessels(timestamp DESC);
CREATE INDEX idx_vessels_location ON vessels(latitude, longitude);
CREATE INDEX idx_vessels_mmsi ON vessels(mmsi);

-- Satellites Table
CREATE TABLE satellites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  norad_id VARCHAR(10) NOT NULL UNIQUE,
  satellite_name VARCHAR(120) NOT NULL,
  tle_line_1 TEXT,
  tle_line_2 TEXT,
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  altitude DECIMAL(12, 2),
  velocity DECIMAL(10, 2),
  footprint_radius DECIMAL(12, 2),
  rotation_longitude DECIMAL(5, 2),
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_satellites_timestamp ON satellites(timestamp DESC);
CREATE INDEX idx_satellites_location ON satellites(latitude, longitude);

-- Conflict Zones Table
CREATE TABLE conflict_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_name VARCHAR(200) NOT NULL,
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  country VARCHAR(100),
  region VARCHAR(100),
  status VARCHAR(50), -- 'ACTIVE', 'ESCALATING', 'CEASEFIRE', 'RESOLVED'
  severity_level INT, -- 1-5 scale
  start_date DATE,
  conflict_type VARCHAR(100), -- 'STATE_CONFLICT', 'INSURGENCY', 'TRIBAL', etc
  description TEXT,
  data_sources TEXT[], -- Array of sources
  latest_update TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conflict_zones_timestamp ON conflict_zones(timestamp DESC);
CREATE INDEX idx_conflict_zones_location ON conflict_zones(latitude, longitude);
CREATE INDEX idx_conflict_zones_status ON conflict_zones(status);

-- Conflict Events Table (Detailed events for each zone)
CREATE TABLE conflict_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES conflict_zones(id) ON DELETE CASCADE,
  event_type VARCHAR(100), -- 'ATTACK', 'AIRSTRIKE', 'PROTEST', 'SKIRMISH', etc
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  event_date TIMESTAMP,
  description TEXT,
  casualty_estimate INT,
  source VARCHAR(200),
  verified BOOLEAN DEFAULT FALSE,
  url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conflict_events_zone_id ON conflict_events(zone_id);
CREATE INDEX idx_conflict_events_date ON conflict_events(event_date DESC);

-- Conflict Videos Table
CREATE TABLE conflict_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES conflict_zones(id) ON DELETE CASCADE,
  video_title VARCHAR(300),
  video_url TEXT,
  thumbnail_url TEXT,
  source VARCHAR(100), -- 'YOUTUBE', 'TWITTER', 'NEWS', 'TELEGRAM'
  video_date TIMESTAMP,
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  location_verified BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conflict_videos_zone_id ON conflict_videos(zone_id);
CREATE INDEX idx_conflict_videos_date ON conflict_videos(video_date DESC);

-- Traffic Layer (London TFL)
CREATE TABLE traffic_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id VARCHAR(200) UNIQUE,
  line_name VARCHAR(100),
  location_latitude DECIMAL(10, 6),
  location_longitude DECIMAL(10, 6),
  incident_type VARCHAR(100), -- 'CONGESTION', 'CLOSURE', 'INCIDENT', 'PLANNED_WORK'
  severity VARCHAR(50), -- 'MINOR', 'MAJOR', 'SEVERE'
  description TEXT,
  camera_url TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_traffic_incidents_timestamp ON traffic_incidents(timestamp DESC);

-- Satellite Imagery Table
CREATE TABLE satellite_imagery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imagery_id VARCHAR(200),
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  imagery_date TIMESTAMP,
  imagery_type VARCHAR(100), -- 'FIRE', 'FLOOD', 'EARTHQUAKE', 'POLLUTION', etc
  description TEXT,
  image_url TEXT,
  source VARCHAR(100), -- 'NASA_EONET', 'GIBS', 'SENTINEL'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_satellite_imagery_date ON satellite_imagery(imagery_date DESC);
CREATE INDEX idx_satellite_imagery_location ON satellite_imagery(latitude, longitude);

-- Settings/Metadata Table
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Data Source Status Table
CREATE TABLE data_source_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name VARCHAR(100) NOT NULL,
  status VARCHAR(50), -- 'OPERATIONAL', 'DEGRADED', 'DOWN'
  last_update TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_data_source_status_updated ON data_source_status(last_update DESC);
