export type AccountType = 'personal' | 'student';

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type: string;
  scope: string;
}

export interface StoredTokens {
  personal?: GoogleTokens;
  student?: GoogleTokens;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  location?: string;
  colorId?: string;
  calendarName: string;
}

export interface Task {
  id: string;
  title: string;
  due?: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  taskListName: string;
  account: AccountType;
}

export interface CalendarInfo {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  primary?: boolean;
}

export interface DailyData {
  date: Date;
  schedule: CalendarEvent[];
  events: CalendarEvent[];
  tasks: Task[];
  classroomEvents: CalendarEvent[];
}
