/**
 * Script interactivo para autenticar las cuentas de Google.
 * Uso: bun run setup:auth
 *
 * 1. Abre el navegador con la URL de autorización de Google
 * 2. Levanta un servidor HTTP local para recibir el callback
 * 3. Guarda los tokens en data/tokens.json
 */

import { getAuthUrl, exchangeCode, hasTokens } from '../src/google/auth.ts';
import type { AccountType } from '../src/types.ts';

// Cargar .env
const envFile = Bun.file('.env');
if (await envFile.exists()) {
  const text = await envFile.text();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

const { config } = await import('../src/config.ts');
const PORT = config.google.redirectPort;

function prompt(question: string): Promise<string> {
  process.stdout.write(question);
  return new Promise((resolve) => {
    const chunks: string[] = [];
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');
    process.stdin.once('data', (data) => {
      process.stdin.pause();
      resolve((data as string).trim());
    });
  });
}

async function authenticateAccount(account: AccountType): Promise<void> {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🔑 Autenticando cuenta: ${account === 'personal' ? 'PERSONAL' : 'ESTUDIANTE'}`);
  console.log('─'.repeat(60));

  if (hasTokens(account)) {
    const override = await prompt(`⚠️  La cuenta "${account}" ya está autenticada. ¿Reautenticar? [s/N]: `);
    if (!override.toLowerCase().startsWith('s')) {
      console.log('✅ Omitiendo...');
      return;
    }
  }

  // Levantar servidor para recibir el código OAuth
  let resolveCode!: (code: string) => void;
  const codePromise = new Promise<string>((res) => { resolveCode = res; });

  const server = Bun.serve({
    port: PORT,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === '/auth/callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          resolveCode('__ERROR__:' + error);
          return new Response(
            '<h2>❌ Error de autorización</h2><p>Puedes cerrar esta ventana.</p>',
            { headers: { 'Content-Type': 'text/html' } },
          );
        }

        if (code) {
          resolveCode(code);
          return new Response(
            '<h2>✅ ¡Autorizado correctamente!</h2><p>Puedes cerrar esta ventana y volver a la terminal.</p>',
            { headers: { 'Content-Type': 'text/html' } },
          );
        }
      }
      return new Response('Not found', { status: 404 });
    },
  });

  const authUrl = getAuthUrl(account);

  console.log(`\n📌 Abre esta URL en el navegador con la cuenta ${account === 'personal' ? 'PERSONAL' : 'ESTUDIANTE'}:\n`);
  console.log(`   ${authUrl}\n`);

  // Intentar abrir el navegador automáticamente
  try {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    Bun.spawn([cmd, authUrl], { stdio: ['ignore', 'ignore', 'ignore'] });
    console.log('(Intentando abrir el navegador automáticamente...)');
  } catch {
    // Silenciar error si no se puede abrir el navegador
  }

  console.log(`⏳ Esperando callback en http://localhost:${PORT}/auth/callback ...`);

  const code = await codePromise;
  server.stop();

  if (code.startsWith('__ERROR__:')) {
    throw new Error(`Google denegó el acceso: ${code.slice(10)}`);
  }

  await exchangeCode(code, account);
  console.log(`✅ Cuenta "${account}" autenticada y tokens guardados.`);
}

async function listCalendarsForAccount(account: AccountType): Promise<void> {
  if (!hasTokens(account)) return;

  const { getAuthedClient } = await import('../src/google/auth.ts');
  const { listCalendars } = await import('../src/google/calendar.ts');

  const client = getAuthedClient(account);
  const calendars = await listCalendars(client);

  console.log(`\n📅 Calendarios disponibles (cuenta ${account}):`);
  for (const cal of calendars) {
    const primary = cal.primary ? ' ⭐ (principal)' : '';
    console.log(`  ID: ${cal.id}`);
    console.log(`      Nombre: ${cal.summary}${primary}\n`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('\n🤖 Discord Calendar Bot – Setup de autenticación');
console.log('='.repeat(60));
console.log('Este script te guiará para conectar tus cuentas de Google.\n');

console.log('📋 Cuentas a configurar:');
console.log('  1. Personal  (El meu calendari, diablescaldes@gmail.com, Tasks)');
console.log('  2. Estudiante (Horario, Google Classroom, Tasks)');

const which = await prompt('\n¿Qué cuenta quieres autenticar? [personal/student/ambas]: ');

const accounts: AccountType[] = [];
if (which === 'personal') accounts.push('personal');
else if (which === 'student') accounts.push('student');
else accounts.push('personal', 'student');

for (const account of accounts) {
  await authenticateAccount(account);
}

// Mostrar calendarios disponibles para facilitar la configuración del .env
console.log('\n\n🗂️  Listando calendarios para ayudarte a configurar el .env...');

for (const account of accounts) {
  try {
    await listCalendarsForAccount(account);
  } catch (err) {
    console.error(`Error listando calendarios de ${account}:`, err);
  }
}

console.log('\n' + '='.repeat(60));
console.log('✅ Setup completado. Configura los IDs de calendario en tu .env:');
console.log('');
console.log('  PERSONAL_EVENTS_CALENDAR_IDS=primary,diablescaldes@gmail.com');
console.log('  STUDENT_SCHEDULE_CALENDAR_IDS=primary');
console.log('  STUDENT_CLASSROOM_CALENDAR_IDS=<ids separados por coma>');
console.log('');
console.log('Luego arranca el bot con: bun run dev');
console.log('='.repeat(60) + '\n');

process.exit(0);
