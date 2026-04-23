import { exchangeCode } from './auth.ts';
import { config } from '../config.ts';
import type { AccountType } from '../types.ts';

type OnComplete = (account: AccountType, success: boolean, error?: string) => Promise<void>;

let server: ReturnType<typeof Bun.serve> | null = null;

export function startOAuthServer(onComplete: OnComplete): void {
  if (server) {
    server.stop(true);
    server = null;
  }

  // Cierra el servidor automáticamente tras 5 minutos sin callback
  const timeout = setTimeout(() => stopOAuthServer(), 5 * 60_000);

  server = Bun.serve({
    port: config.google.redirectPort,
    async fetch(req: Request) {
      const url = new URL(req.url);
      if (url.pathname !== '/auth/callback') {
        return new Response('Not found', { status: 404 });
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      const state = url.searchParams.get('state') as AccountType | null;

      clearTimeout(timeout);
      stopOAuthServer();

      if (error || !code || !state) {
        void onComplete(state ?? 'personal', false, error ?? 'Falta el código de autorización');
        return htmlResponse('❌ Error de autorización', 'Puedes cerrar esta ventana.');
      }

      try {
        await exchangeCode(code, state);
        void onComplete(state, true);
        return htmlResponse('✅ ¡Autorizado!', 'Puedes cerrar esta ventana y volver a Discord.');
      } catch (err) {
        void onComplete(state, false, (err as Error).message);
        return htmlResponse('❌ Error', (err as Error).message);
      }
    },
  });
}

function stopOAuthServer(): void {
  if (server) {
    server.stop(true);
    server = null;
  }
}

function htmlResponse(title: string, body: string): Response {
  return new Response(
    `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#2c2f33;color:#fff}
    .card{text-align:center;padding:2rem;background:#36393f;border-radius:12px;box-shadow:0 4px 24px #0004}</style>
    </head><body><div class="card"><h2>${title}</h2><p>${body}</p></div></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
