import { Client, GatewayIntentBits, Events, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { config } from './config.ts';
import { registerCommands, handleCommand } from './commands/index.ts';
import { startScheduler } from './scheduler.ts';

export async function startBot(): Promise<void> {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  });

  client.once(Events.ClientReady, async (c) => {
    console.log(`[bot] Conectado como ${c.user.tag}`);
    await registerCommands(c.user.id);
    startScheduler(c);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    try {
      await handleCommand(interaction as ChatInputCommandInteraction, client);
    } catch (err) {
      const code = (err as { code?: number }).code;

      // 10062: interacción expirada (Discord no esperó los 3 s de respuesta inicial).
      // 40060: interacción ya respondida (consecuencia habitual de un 10062 previo).
      // En ambos casos no hay nada que hacer: la UI de Discord ya la descartó.
      if (code === 10062 || code === 40060) {
        console.warn(`[bot] Interacción descartada (código ${code})`);
        return;
      }

      console.error('[bot] Error en comando:', err);
      const msg = `❌ Error inesperado: ${(err as Error).message}`;
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply(msg).catch(() => {});
      } else {
        await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  });

  await client.login(config.discord.token);
}
