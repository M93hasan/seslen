CREATE TABLE push_subscriptions(id TEXT PRIMARY KEY,owner TEXT NOT NULL,session_hash TEXT NOT NULL,endpoint TEXT NOT NULL,created INTEGER NOT NULL);
CREATE INDEX push_owner ON push_subscriptions(owner);
CREATE TABLE push_jobs(id TEXT PRIMARY KEY,owner TEXT NOT NULL,created INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,next_attempt INTEGER NOT NULL DEFAULT 0);
CREATE TABLE push_receipts(job TEXT NOT NULL,subscription TEXT NOT NULL,PRIMARY KEY(job,subscription));
