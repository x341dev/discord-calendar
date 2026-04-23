import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { OAuth2Client } from 'google-auth-library';
import { config } from '../config.ts';
import type { AccountType, StoredTokens, GoogleTokens } from '../types.ts';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks.readonly',
];

function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    `http://localhost:${config.google.redirectPort}/auth/callback`,
  );
}

function loadTokens(): StoredTokens {
  if (!existsSync(config.tokensPath)) return {};
  try {
    return JSON.parse(readFileSync(config.tokensPath, 'utf-8')) as StoredTokens;
  } catch {
    return {};
  }
}

function saveTokens(tokens: StoredTokens): void {
  writeFileSync(config.tokensPath, JSON.stringify(tokens, null, 2), 'utf-8');
}

export function getAuthUrl(account: AccountType): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: account,
    login_hint: account === 'student' ? '' : undefined,
  });
}

export async function exchangeCode(code: string, account: AccountType): Promise<void> {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  const stored = loadTokens();
  stored[account] = {
    access_token: tokens.access_token ?? '',
    refresh_token: tokens.refresh_token ?? '',
    expiry_date: tokens.expiry_date ?? 0,
    token_type: tokens.token_type ?? 'Bearer',
    scope: tokens.scope ?? '',
  };
  saveTokens(stored);
}

export function getAuthedClient(account: AccountType): OAuth2Client {
  const stored = loadTokens();
  const tokens = stored[account];
  if (!tokens) throw new Error(`No hay tokens para la cuenta "${account}". Corre: bun run setup:auth`);

  const client = createOAuth2Client();
  client.setCredentials(tokens);

  // Guarda el access_token refrescado automáticamente
  client.on('tokens', (newTokens) => {
    const current = loadTokens();
    current[account] = { ...(current[account] as GoogleTokens), ...(newTokens as Partial<GoogleTokens>) };
    saveTokens(current);
  });

  return client;
}

export function hasTokens(account: AccountType): boolean {
  const stored = loadTokens();
  return !!stored[account]?.refresh_token;
}
