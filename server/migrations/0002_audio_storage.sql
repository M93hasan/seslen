ALTER TABLE audio ADD COLUMN backend TEXT NOT NULL DEFAULT 'r2';
ALTER TABLE audio ADD COLUMN bytes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE audio ADD COLUMN mime TEXT NOT NULL DEFAULT 'application/octet-stream';
ALTER TABLE audio ADD COLUMN ready INTEGER NOT NULL DEFAULT 1;
CREATE TABLE audio_chunks(audio_id TEXT NOT NULL REFERENCES audio(id) ON DELETE CASCADE,part INTEGER NOT NULL,data BLOB NOT NULL,PRIMARY KEY(audio_id,part));
CREATE INDEX audio_owner_created ON audio(owner,created);
CREATE INDEX messages_owner_created ON messages(owner,created);
