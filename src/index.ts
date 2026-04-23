import { startBot } from './bot.ts';

// Cargar .env si existe (desarrollo local)
const envPath = '.env';
const envFile = Bun.file(envPath);
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

console.log('[main] Iniciando Discord Calendar Bot...');

try {
  await startBot();
} catch (err) {
  console.error('[main] Error fatal:', err);
  process.exit(1);
}
