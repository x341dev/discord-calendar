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
      console.error('[bot] Error en comando:', err);
      const msg = `❌ Error inesperado: ${(err as Error).message}`;
      // Silenciar errores del fallback: si la interacción ya fue contestada
      // (o el token de interacción expiró), no hay nada que hacer.
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply(msg).catch(() => {});
      } else {
        await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  });

  await client.login(config.discord.token);
}
