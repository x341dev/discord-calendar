import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { CalendarEvent, CalendarInfo } from '../types.ts';

function startOfDay(date: Date, tz: string): string {
  const d = new Date(date.toLocaleDateString('en-CA', { timeZone: tz }) + 'T00:00:00');
  return new Date(date.toLocaleDateString('en-CA', { timeZone: tz }) + 'T00:00:00').toISOString().replace('Z', '') + '+00:00';
}

function isoDay(date: Date, tz: string): string {
  return date.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
}

export async function listCalendars(client: OAuth2Client): Promise<CalendarInfo[]> {
  const cal = google.calendar({ version: 'v3', auth: client });
  const res = await cal.calendarList.list({ maxResults: 250 });
  return (res.data.items ?? []).map((item) => ({
    id: item.id!,
    summary: item.summary!,
    description: item.description ?? undefined,
    backgroundColor: item.backgroundColor ?? undefined,
    primary: item.primary ?? false,
  }));
}

export async function fetchEventsForDay(
  client: OAuth2Client,
  calendarIds: string[],
  date: Date,
  timezone: string,
): Promise<CalendarEvent[]> {
  if (calendarIds.length === 0) return [];

  const cal = google.calendar({ version: 'v3', auth: client });
  const dayStr = isoDay(date, timezone);
  const timeMin = `${dayStr}T00:00:00Z`;
  const timeMax = `${dayStr}T23:59:59Z`;

  const results = await Promise.allSettled(
    calendarIds.map((calId) =>
      cal.events
        .list({
          calendarId: calId,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 50,
        })
        .then((res) => ({ calId, items: res.data.items ?? [], summary: res.data.summary ?? calId })),
    ),
  );

  const events: CalendarEvent[] = [];
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Error fetching calendar:', result.reason);
      continue;
    }
    const { items, summary } = result.value;
    for (const item of items) {
      events.push({
        id: item.id!,
        summary: item.summary ?? '(Sin título)',
        description: item.description ?? undefined,
        start: item.start as CalendarEvent['start'],
        end: item.end as CalendarEvent['end'],
        location: item.location ?? undefined,
        colorId: item.colorId ?? undefined,
        calendarName: summary,
      });
    }
  }

  return events.sort((a, b) => {
    const aTime = a.start.dateTime ?? a.start.date ?? '';
    const bTime = b.start.dateTime ?? b.start.date ?? '';
    return aTime.localeCompare(bTime);
  });
}

export async function detectClassroomCalendars(client: OAuth2Client): Promise<string[]> {
  const calendars = await listCalendars(client);
  return calendars
    .filter(
      (c) =>
        c.id.includes('classroom.google.com') ||
        c.summary?.toLowerCase().includes('classroom') ||
        c.description?.toLowerCase().includes('classroom'),
    )
    .map((c) => c.id);
}
