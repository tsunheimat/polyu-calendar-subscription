import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PolyUICSParser } from '../src/parser';
import { PolyUICSGenerator } from '../src/generator';
import { CalendarEvent } from '../src/types';

// Generators
const calendarEventArb = fc.record({
    uid: fc.uuid(),
    summary: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('\r') && !s.includes('\n')), // Simple string for now
    dtstart: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(d => Math.floor(d.getTime() / 1000)),
    dtend: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(d => Math.floor(d.getTime() / 1000)),
    location: fc.string({ maxLength: 50 }).filter(s => !s.includes('\r') && !s.includes('\n')),
    description: fc.string({ maxLength: 100 }).filter(s => !s.includes('\r') && !s.includes('\n')),
    dtstamp: fc.date().map(d => Math.floor(d.getTime() / 1000)),
    // Defaults for missing internal fields
    id: fc.constant('test-id'), // Not part of parsing/gen usually
    source: fc.constant('IMPORT'),
    status: fc.constant('ACTIVE')
}).map((e: any) => {
    // Ensure dtend > dtstart
    if (e.dtend <= e.dtstart) {
        e.dtend = e.dtstart + 3600;
    }
    return e as CalendarEvent;
});

describe('Property Based Tests', () => {

    // Property 1: ICS Round-Trip Consistency
    it('should maintain data consistency after generating and parsing back', () => {
        fc.assert(
            fc.property(fc.array(calendarEventArb, { minLength: 1, maxLength: 10 }), (events) => {
                const generator = new PolyUICSGenerator();
                const parser = new PolyUICSParser();

                // 1. Generate ICS
                const ics = generator.generate(events);

                // 2. Parse back
                const result = parser.parse(ics);

                // 3. Verify
                expect(result.success).toBe(true);
                expect(result.events).toHaveLength(events.length);

                // We need to match events. Order might be preserved but let's check by UID
                // Note: The parser returns Omit<CalendarEvent, 'id'...> etc.
                // And result events might be slight different formatting or timestamp precision if we weren't careful.
                // But we used seconds (Unix) everywhere.

                result.events!.forEach(parsedEvent => {
                    const original = events.find(e => e.uid === parsedEvent.uid);
                    expect(original).toBeDefined();

                    expect(parsedEvent.summary).toBe(original!.summary);
                    // Check timestamps (allow subtle rounding if any, but Int/Seconds should be exact)
                    expect(parsedEvent.dtstart).toBe(original!.dtstart);
                    expect(parsedEvent.dtend).toBe(original!.dtend);
                    // Location/Desc might be empty/null variations?
                    // My generator filters nulls or optional fields? In test generator they are all present strings.
                    // But in implementation, I iterate if(event.location).
                    // If generator produces empty string location, it might skip writing "LOCATION:".
                    // The parser extracts "LOCATION:". If missing, parser logic says || ''.
                    // So '' and undefined/missing match.
                    expect(parsedEvent.location || '').toBe(original!.location || '');
                    expect(parsedEvent.description || '').toBe(original!.description || '');
                });
            })
        );
    });
});
