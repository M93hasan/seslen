-- Single-use native iOS OAuth authorization ticket. No long-lived secrets are stored here.
CREATE TABLE ios_tickets(
 hash TEXT PRIMARY KEY,
 owner TEXT NOT NULL,
 challenge TEXT NOT NULL,
 expires INTEGER NOT NULL
);
CREATE INDEX ios_tickets_expires_idx ON ios_tickets(expires);
