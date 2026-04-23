import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { Task, AccountType } from '../types.ts';

function isoDay(date: Date, tz: string): string {
  return date.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
}

export async function fetchTasksForDay(
  client: OAuth2Client,
  account: AccountType,
  date: Date,
  timezone: string,
): Promise<Task[]> {
  const tasksApi = google.tasks({ version: 'v1', auth: client });
  const todayStr = isoDay(date, timezone);
  const tasks: Task[] = [];

  // Obtener todas las listas de tareas
  const listsRes = await tasksApi.tasklists.list({ maxResults: 100 });
  const taskLists = listsRes.data.items ?? [];

  await Promise.allSettled(
    taskLists.map(async (list) => {
      const res = await tasksApi.tasks.list({
        tasklist: list.id!,
        showCompleted: false,
        showHidden: false,
        maxResults: 100,
        // Traemos todas las pendientes y filtramos por fecha
        dueMax: `${todayStr}T23:59:59.999Z`,
      });

      for (const item of res.data.items ?? []) {
        if (item.status === 'completed') continue;
        tasks.push({
          id: item.id!,
          title: item.title ?? '(Sin título)',
          due: item.due ?? undefined,
          notes: item.notes ?? undefined,
          status: item.status as Task['status'],
          taskListName: list.title ?? 'Tasks',
          account,
        });
      }
    }),
  );

  return tasks;
}
