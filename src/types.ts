export interface CalendarEvent {
    id: string;
    uid: string;
    summary: string;
    dtstart: number;  // Unix timestamp
    dtend: number;    // Unix timestamp
    location: string;
    description: string;
    dtstamp: number;  // Unix timestamp
    source: 'IMPORT' | 'MANUAL';
    status: 'ACTIVE' | 'DELETED';
}

export interface ParseResult {
    success: boolean;
    events?: Omit<CalendarEvent, 'id' | 'source' | 'status'>[];
    error?: string;
}

export interface ICSParser {
    parse(icsContent: string): ParseResult;
}

export interface ICSGenerator {
    generate(events: CalendarEvent[]): string;
}

export interface Env {
    DB: D1Database;
}
