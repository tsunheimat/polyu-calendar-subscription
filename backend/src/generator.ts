import { ICSGenerator, CalendarEvent } from './types';

export class PolyUICSGenerator implements ICSGenerator {
    generate(events: CalendarEvent[]): string {
        const lines: string[] = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//PolyU Calendar Service//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH'
        ];

        for (const event of events) {
            if (event.status !== 'ACTIVE') continue;

            lines.push('BEGIN:VEVENT');
            lines.push(`UID:${event.uid}`);
            lines.push(`DTSTAMP:${this.formatDate(event.dtstamp)}`);
            lines.push(`DTSTART:${this.formatDate(event.dtstart)}`);
            lines.push(`DTEND:${this.formatDate(event.dtend)}`);

            this.pushFolded(lines, `SUMMARY:${this.escapeText(event.summary)}`);

            if (event.location) {
                this.pushFolded(lines, `LOCATION:${this.escapeText(event.location)}`);
            }

            if (event.description) {
                this.pushFolded(lines, `DESCRIPTION:${this.escapeText(event.description)}`);
            }

            lines.push('END:VEVENT');
        }

        lines.push('END:VCALENDAR');

        // Join with CRLF
        return lines.join('\r\n');
    }

    private formatDate(timestampSeconds: number): string {
        const d = new Date(timestampSeconds * 1000);
        // toISOString gives YYYY-MM-DDTHH:mm:ss.sssZ
        // We want YYYYMMDDTHHMMSSZ
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }

    private escapeText(text: string): string {
        return text
            .replace(/\\/g, '\\\\') // Escape backslashes first
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
    }

    private pushFolded(lines: string[], content: string): void {
        // RFC 5545 limit is 75 octets.
        // For simplicity, we'll fold at 70 characters to be safe with UTF-8 expansion.
        // A proper implementation would count bytes.

        if (content.length <= 75) {
            lines.push(content);
            return;
        }

        // First line
        let currentLine = content.substring(0, 75);
        lines.push(currentLine);

        let remainder = content.substring(75);
        while (remainder.length > 0) {
            // Subsequent lines start with space
            const chunk = remainder.substring(0, 74); // 74 chars + 1 space = 75
            lines.push(' ' + chunk);
            remainder = remainder.substring(74);
        }
    }
}
