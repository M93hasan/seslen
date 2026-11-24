-- Passive TV receiver heartbeat; absence of a heartbeat is not proof that TV is powered off.
ALTER TABLE devices ADD COLUMN last_seen INTEGER;
