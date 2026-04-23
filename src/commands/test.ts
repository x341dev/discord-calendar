import { type ChatInputCommandInteraction, type Client, MessageFlags } from 'discord.js';
import { sendDailySummary } from '../scheduler.ts';

export async function handleTest(
  interaction: ChatInputCommandInteraction,
  client: Client,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    await sendDailySummary(client);
    await interaction.editReply('✅ Resumen enviado a tu MD.');
  } catch (err) {
    await interaction.editReply(`❌ Error: ${(err as Error).message}`);
  }
}
