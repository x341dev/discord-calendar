import { getAuthedClient, hasTokens } from './google/auth.ts';
import { fetchEventsForDay, detectClassroomCalendars } from './google/calendar.ts';
import { fetchTasksForDay } from './google/tasks.ts';
import { config } from './config.ts';
import type { DailyData } from './types.ts';

export async function fetchDailyData(date: Date): Promise<DailyData> {
  const tz = config.schedule.timezone;
  const results: DailyData = {
    date,
    schedule: [],
    events: [],
    tasks: [],
    classroomEvents: [],
  };

  // ── Cuenta personal ──────────────────────────────────────────────────────────
  if (hasTokens('personal')) {
    const personalClient = getAuthedClient('personal');

    const [events, tasks] = await Promise.all([
      fetchEventsForDay(personalClient, config.calendars.personalEvents, date, tz),
      fetchTasksForDay(personalClient, 'personal', date, tz),
    ]);

    results.events.push(...events);
    results.tasks.push(...tasks);
  } else {
    console.warn('[fetcher] Sin tokens para cuenta personal');
  }

  // ── Cuenta estudiante ────────────────────────────────────────────────────────
  if (hasTokens('student')) {
    const studentClient = getAuthedClient('student');

    // Autodetectar calendarios de Classroom si no están configurados
    let classroomIds = config.calendars.studentClassroom;
    if (classroomIds.length === 0) {
      classroomIds = await detectClassroomCalendars(studentClient);
    }

    const [schedule, classroomEvents, tasks] = await Promise.all([
      fetchEventsForDay(studentClient, config.calendars.studentSchedule, date, tz),
      fetchEventsForDay(studentClient, classroomIds, date, tz),
      fetchTasksForDay(studentClient, 'student', date, tz),
    ]);

    results.schedule.push(...schedule);
    results.classroomEvents.push(...classroomEvents);
    results.tasks.push(...tasks);
  } else {
    console.warn('[fetcher] Sin tokens para cuenta estudiante');
  }

  return results;
}
