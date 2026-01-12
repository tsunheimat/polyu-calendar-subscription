CREATE TABLE events (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    summary TEXT NOT NULL,
    dtstart INTEGER NOT NULL,  -- Unix timestamp
    dtend INTEGER NOT NULL,    -- Unix timestamp
    location TEXT,
    description TEXT,
    dtstamp INTEGER NOT NULL,  -- Unix timestamp
    source TEXT DEFAULT 'IMPORT',
    status TEXT DEFAULT 'ACTIVE',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_events_uid ON events(uid);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_dtstart ON events(dtstart);
