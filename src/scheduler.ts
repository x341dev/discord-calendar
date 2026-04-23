import cron from 'node-cron';
import { MessageFlags, type Client, type MessageCreateOptions } from 'discord.js';
import { config } from './config.ts';
import { fetchDailyData } from './data-fetcher.ts';
import { buildDailyComponents } from './embeds/daily.ts';

export async function sendDailySummary(client: Client): Promise<void> {
  const now = new Date();
  console.log(`[scheduler] Enviando resumen del día ${now.toISOString()}`);

  const data = await fetchDailyData(now);
  const components = buildDailyComponents(data, config.schedule.timezone);

  const user = await client.users.fetch(config.discord.userId);
  const dm = await user.createDM();

  // components: any[] porque los builders de V2 no están en el tipo estricto de discord.js
  await dm.send({
    components: components as MessageCreateOptions['components'],
    flags: MessageFlags.IsComponentsV2,
  });

  console.log('[scheduler] Resumen enviado correctamente');
}

export function startScheduler(client: Client): void {
  const { cron: cronExpr, timezone } = config.schedule;

  if (!cron.validate(cronExpr)) {
    throw new Error(`Expresión cron inválida: "${cronExpr}"`);
  }

  cron.schedule(
    cronExpr,
    async () => {
      try {
        await sendDailySummary(client);
      } catch (err) {
        console.error('[scheduler] Error al enviar resumen:', err);
      }
    },
    { timezone },
  );

  console.log(`[scheduler] Programado: "${cronExpr}" (${timezone})`);
}
