import { ICSParser, ParseResult, CalendarEvent } from './types';

export class PolyUICSParser implements ICSParser {
    parse(icsContent: string): ParseResult {
        try {
            // 1. Unfold lines (CRLF + space/tab -> removed)
            const unfolded = icsContent.replace(/\r\n[ \t]/g, '');

            // 2. Split into events
            // A naive split might fail if nested VEVENTs exist (unlikely here)
            const eventBlocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g);

            if (!eventBlocks) {
                return { success: true, events: [] };
            }

            const events: Omit<CalendarEvent, 'id' | 'source' | 'status'>[] = [];

            for (const block of eventBlocks) {
                const uid = this.extractField(block, 'UID');
                const summary = this.extractField(block, 'SUMMARY') || 'No Title';
                const location = this.extractField(block, 'LOCATION') || '';
                const description = this.extractField(block, 'DESCRIPTION') || '';
                const dtstampStr = this.extractField(block, 'DTSTAMP');
                const dtstartStr = this.extractField(block, 'DTSTART');
                const dtendStr = this.extractField(block, 'DTEND');

                // Validation
                if (!uid || !dtstartStr || !dtendStr) {
                    console.warn('Skipping event due to missing fields', { uid, dtstartStr, dtendStr });
                    continue;
                }

                const dtstart = this.parseDate(dtstartStr);
                const dtend = this.parseDate(dtendStr);
                const dtstamp = dtstampStr ? this.parseDate(dtstampStr) : Math.floor(Date.now() / 1000);

                // Decode description (unescape chars)
                const cleanDescription = this.unescapeText(description);

                events.push({
                    uid,
                    summary: this.unescapeText(summary),
                    dtstart,
                    dtend,
                    location: this.unescapeText(location),
                    description: cleanDescription,
                    dtstamp
                });
            }

            return { success: true, events };

        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    private extractField(block: string, fieldName: string): string | null {
        // Matches "FIELD:VALUE" or "FIELD;PARAM=...:VALUE"
        // Case insensitive for field name usually, but ICS is UPPERCASE mostly.
        // Spec says regex: ^name *(?:; param )* : value
        const regex = new RegExp(`^${fieldName}(?:;[^:]*)?:(.*)$`, 'm');
        const match = block.match(regex);
        return match ? match[1].trim() : null;
    }

    // Parses ICS date string to Unix Timestamp (Seconds)
    // Handles:
    // 1. YYYYMMDDTHHMMSS (Floating/Local) -> Assume HK (Beijing) Time (UTC+8)
    // 2. YYYYMMDDTHHMMSSZ (UTC)
    // 3. YYYYMMDD (Date only) -> Start of day HK Time
    private parseDate(dateStr: string): number {
        // Remove "Z" if present to check for base format, but remember it
        const isUTC = dateStr.endsWith('Z');
        const cleanStr = dateStr.replace('Z', '');

        let year, month, day, hour, minute, second;

        if (cleanStr.length === 8) {
            // YYYYMMDD
            year = parseInt(cleanStr.substring(0, 4));
            month = parseInt(cleanStr.substring(4, 6)) - 1; // 0-indexed
            day = parseInt(cleanStr.substring(6, 8));
            hour = 0; minute = 0; second = 0;
        } else {
            // YYYYMMDDTHHMMSS
            // T is at index 8
            year = parseInt(cleanStr.substring(0, 4));
            month = parseInt(cleanStr.substring(4, 6)) - 1;
            day = parseInt(cleanStr.substring(6, 8));
            hour = parseInt(cleanStr.substring(9, 11));
            minute = parseInt(cleanStr.substring(11, 13));
            second = parseInt(cleanStr.substring(13, 15));
        }

        // Construct Date
        // If Z was present, it's UTC.
        // If no Z, assume PolyU Local Time (Asia/Hong_Kong = UTC+8).

        let timestampMs: number;

        if (isUTC) {
            timestampMs = Date.UTC(year, month, day, hour, minute, second);
        } else {
            // "Local" time. 
            // We manually offset it. 
            // UTC+8 means the time 09:00 is actually 01:00 UTC.
            // So if input is 09:00, we treat it as 09:00 UTC then subtract 8 hours.
            const utcRepresentation = Date.UTC(year, month, day, hour, minute, second);
            // Subtract 8 hours (8 * 60 * 60 * 1000)
            const HK_OFFSET_MS = 8 * 60 * 60 * 1000;
            timestampMs = utcRepresentation - HK_OFFSET_MS;
        }

        return Math.floor(timestampMs / 1000);
    }

    private unescapeText(text: string): string {
        return text
            .replace(/\\n/g, '\n')
            .replace(/\\N/g, '\n')
            .replace(/\\;/g, ';')
            .replace(/\\,/g, ',')
            .replace(/\\\\/g, '\\');
    }
}
