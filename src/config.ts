function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function optionalList(name: string): string[] {
  const val = process.env[name];
  return val ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

export const config = {
  discord: {
    token: required('DISCORD_TOKEN'),
    userId: required('DISCORD_USER_ID'),
  },
  google: {
    clientId: required('GOOGLE_CLIENT_ID'),
    clientSecret: required('GOOGLE_CLIENT_SECRET'),
    redirectPort: parseInt(optional('GOOGLE_REDIRECT_PORT', '3001')),
  },
  calendars: {
    // Cuenta personal → embed "Eventos del día"
    personalEvents: optionalList('PERSONAL_EVENTS_CALENDAR_IDS'),
    // Cuenta estudiante → embed "Horario del día"
    studentSchedule: optionalList('STUDENT_SCHEDULE_CALENDAR_IDS'),
    // Cuenta estudiante → Google Classroom (vacío = autodetectar)
    studentClassroom: optionalList('STUDENT_CLASSROOM_CALENDAR_IDS'),
  },
  schedule: {
    timezone: optional('TIMEZONE', 'Europe/Madrid'),
    cron: optional('SCHEDULE_CRON', '30 6 * * *'),
  },
  tokensPath: optional('TOKENS_PATH', './data/tokens.json'),
} as const;
