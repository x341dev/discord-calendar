import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} from 'discord.js';
import type { CalendarEvent, Task, DailyData } from '../types.ts';

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatDate(date: Date, tz: string): string {
  const local = new Date(date.toLocaleString('en-US', { timeZone: tz }));
  const day = DAYS_ES[local.getDay()];
  const num = local.getDate();
  const month = MONTHS_ES[local.getMonth()];
  const year = local.getFullYear();
  return `${day}, ${num} de ${month} de ${year}`;
}

function formatTime(dt: string | undefined, tz: string): string {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('es-ES', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatEventLine(event: CalendarEvent, tz: string): string {
  if (event.start.dateTime) {
    const start = formatTime(event.start.dateTime, tz);
    const end = formatTime(event.end.dateTime, tz);
    return `\`${start}–${end}\` ${event.summary}`;
  }
  return `\`Todo el día\` ${event.summary}`;
}

function sep(divider = true): SeparatorBuilder {
  return new SeparatorBuilder().setDivider(divider).setSpacing(SeparatorSpacingSize.Small);
}

// ─── Container 1: Horario del día (azul) ─────────────────────────────────────
function buildScheduleContainer(data: DailyData, tz: string): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(0x5865f2);

  c.addTextDisplayComponents(new TextDisplayBuilder().setContent('## 📅 Horario del día'));

  if (data.schedule.length === 0) {
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent('*No hay clases hoy 🎉*'));
  } else {
    c.addSeparatorComponents(sep());
    const lines = data.schedule.map((e) => formatEventLine(e, tz)).join('\n');
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines));
  }

  c.addSeparatorComponents(sep(false));
  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('-# Cuenta estudiante · El meu calendari'),
  );

  return c;
}

// ─── Container 2: Eventos del día (verde) ────────────────────────────────────
function buildEventsContainer(data: DailyData, tz: string): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(0x57f287);

  c.addTextDisplayComponents(new TextDisplayBuilder().setContent('## 📌 Eventos del día'));

  if (data.events.length === 0) {
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent('*No hay eventos hoy*'));
  } else {
    const byCalendar = new Map<string, CalendarEvent[]>();
    for (const event of data.events) {
      const list = byCalendar.get(event.calendarName) ?? [];
      list.push(event);
      byCalendar.set(event.calendarName, list);
    }

    for (const [calName, events] of byCalendar) {
      c.addSeparatorComponents(sep());
      c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${calName}**`));
      const lines = events.map((e) => formatEventLine(e, tz)).join('\n');
      c.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines));
    }
  }

  c.addSeparatorComponents(sep(false));
  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('-# Cuenta personal · El meu calendari · Diables Caldes'),
  );

  return c;
}

// ─── Container 3: Otros – tareas y Classroom (amarillo) ──────────────────────
function buildOthersContainer(data: DailyData, tz: string): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(0xfee75c);

  c.addTextDisplayComponents(new TextDisplayBuilder().setContent('## 📋 Otros'));

  const pendingTasks = data.tasks.filter((t) => t.status !== 'completed');
  const hasContent = pendingTasks.length > 0 || data.classroomEvents.length > 0;

  if (!hasContent) {
    c.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('*No hay tareas ni entregas pendientes*'),
    );
    return c;
  }

  // Tareas por cuenta
  const personalTasks = pendingTasks.filter((t) => t.account === 'personal');
  const studentTasks = pendingTasks.filter((t) => t.account === 'student');

  if (personalTasks.length > 0) {
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent('**📝 Tareas – Personal**'));
    c.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        personalTasks
          .map((t) => {
            const due = t.due ? ` *(vence: ${formatTime(t.due, tz) || 'hoy'})*` : '';
            return `• ${t.title}${due}`;
          })
          .join('\n'),
      ),
    );
  }

  if (studentTasks.length > 0) {
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent('**📝 Tareas – Estudiante**'));
    c.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        studentTasks
          .map((t) => {
            const due = t.due ? ` *(vence: ${formatTime(t.due, tz) || 'hoy'})*` : '';
            return `• ${t.title}${due}`;
          })
          .join('\n'),
      ),
    );
  }

  // Classroom
  if (data.classroomEvents.length > 0) {
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent('**🎓 Google Classroom**'));
    c.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        data.classroomEvents
          .map((e) => {
            const time = e.start.dateTime ? ` · \`${formatTime(e.start.dateTime, tz)}\`` : '';
            return `• ${e.summary}${time}`;
          })
          .join('\n'),
      ),
    );
  }

  c.addSeparatorComponents(sep(false));
  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('-# Tareas personales · Tareas de estudiante · Google Classroom'),
  );

  return c;
}

// ─── Componentes para dm.send() ──────────────────────────────────────────────
export function buildDailyComponents(
  data: DailyData,
  tz: string,
): (TextDisplayBuilder | SeparatorBuilder | ContainerBuilder)[] {
  return [
    new TextDisplayBuilder().setContent(`# 🌅 Buenos días\n### ${formatDate(data.date, tz)}`),
    new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Large),
    buildScheduleContainer(data, tz),
    new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small),
    buildEventsContainer(data, tz),
    new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small),
    buildOthersContainer(data, tz),
  ];
}
