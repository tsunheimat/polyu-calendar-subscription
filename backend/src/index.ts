import { Router } from 'itty-router';
import { Env, CalendarEvent } from './types';
import { PolyUICSParser } from './parser';
import { PolyUICSGenerator } from './generator';

const router = Router();

router.post('/api/upload', async (request, env: Env) => {
    try {
        const contentType = request.headers.get('Content-Type') || '';
        if (!contentType.includes('multipart/form-data')) {
            return new Response('Content-Type must be multipart/form-data', { status: 400 });
        }

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || !(file instanceof File)) {
            return Response.json({ success: false, error: { code: 'MISSING_FILE', message: 'No file provided' } }, { status: 400 });
        }

        if (file.size > 1024 * 1024) { // 1MB
            return Response.json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'File too large' } }, { status: 413 });
        }

        const text = await file.text();
        const parser = new PolyUICSParser();
        const parseResult = parser.parse(text);

        if (!parseResult.success || !parseResult.events) {
            return Response.json({ success: false, error: { code: 'INVALID_FORMAT', message: parseResult.error || 'Invalid Format' } }, { status: 400 });
        }

        const events = parseResult.events;
        if (events.length === 0) {
            return Response.json({ success: true, eventsAdded: 0, eventsUpdated: 0, feedUrl: '' });
        }

        // Database Ops
        let added = 0;
        let updated = 0;

        // Process in batches if necessary, but D1 handles small loops fine.
        // For proper upsert without unique constraint on uid (schema has id as PK):
        // We check if UID exists.

        // Note: Ideally schema would have UNIQUE(uid).
        // Logic: 
        // Prepare statements?

        for (const event of events) {
            const existing = await env.DB.prepare('SELECT id FROM events WHERE uid = ?').bind(event.uid).first();

            if (existing) {
                // Update
                await env.DB.prepare(`
          UPDATE events SET 
            summary = ?, dtstart = ?, dtend = ?, location = ?, description = ?, dtstamp = ?, updated_at = strftime('%s', 'now')
          WHERE uid = ?
        `).bind(
                    event.summary, event.dtstart, event.dtend, event.location, event.description, event.dtstamp, event.uid
                ).run();
                updated++;
            } else {
                // Insert
                const id = crypto.randomUUID();
                await env.DB.prepare(`
          INSERT INTO events (id, uid, summary, dtstart, dtend, location, description, dtstamp, source, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'IMPORT', 'ACTIVE')
        `).bind(
                    id, event.uid, event.summary, event.dtstart, event.dtend, event.location, event.description, event.dtstamp
                ).run();
                added++;
            }
        }

        const url = new URL(request.url);
        const feedUrl = `${url.origin}/feed.ics`;

        return Response.json({
            success: true,
            eventsAdded: added,
            eventsUpdated: updated,
            feedUrl: feedUrl
        });

    } catch (e: any) {
        return Response.json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
    }
});

router.get('/feed.ics', async (request, env: Env) => {
    try {
        const { results } = await env.DB.prepare('SELECT * FROM events WHERE status = "ACTIVE"').all<CalendarEvent>();

        if (!results) {
            return new Response('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR', {
                headers: {
                    'Content-Type': 'text/calendar; charset=utf-8',
                    'Cache-Control': 'public, max-age=1800'
                }
            });
        }

        // Convert results (which might have different types for numbers depending on D1 driver but usually number)
        // to proper CalendarEvent
        const events: CalendarEvent[] = results.map(r => ({
            ...r,
            dtstart: Number(r.dtstart),
            dtend: Number(r.dtend),
            dtstamp: Number(r.dtstamp)
        }));

        const generator = new PolyUICSGenerator();
        const icsContent = generator.generate(events);

        return new Response(icsContent, {
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Cache-Control': 'public, max-age=1800',
                'Content-Disposition': 'attachment; filename="polyu-calendar.ics"'
            }
        });

    } catch (e) {
        return new Response('Error generating feed', { status: 500 });
    }
});

// Fallback for everything else to 404
router.all('*', () => new Response('Not Found', { status: 404 }));

export default {
    fetch: router.handle
};
