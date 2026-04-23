import { type ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { getAuthedClient, hasTokens } from '../google/auth.ts';
import { listCalendars } from '../google/calendar.ts';
import type { AccountType } from '../types.ts';

export async function handleCalendars(interaction: ChatInputCommandInteraction): Promise<void> {
  const account = interaction.options.getString('cuenta', true) as AccountType;

  if (!hasTokens(account)) {
    await interaction.reply({
      content: `❌ La cuenta **${account}** no está autenticada. Usa \`/auth\` primero.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const client = getAuthedClient(account);
    const calendars = await listCalendars(client);

    const lines = calendars.map((c) => {
      const primary = c.primary ? ' ⭐' : '';
      return `\`${c.id}\`\n  → **${c.summary}**${primary}`;
    });

    // Discord tiene límite de 4096 chars en description
    const chunks: string[] = [];
    let current = '';
    for (const line of lines) {
      if ((current + '\n\n' + line).length > 3800) {
        chunks.push(current);
        current = line;
      } else {
        current += (current ? '\n\n' : '') + line;
      }
    }
    if (current) chunks.push(current);

    const embeds = chunks.map((chunk, i) =>
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(i === 0 ? `📅 Calendarios – ${account === 'personal' ? 'Personal' : 'Estudiante'}` : '​')
        .setDescription(chunk),
    );

    await interaction.editReply({ embeds: embeds.slice(0, 10) });
  } catch (err) {
    await interaction.editReply(`❌ Error: ${(err as Error).message}`);
  }
}
