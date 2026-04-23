import { type ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { getAuthUrl, exchangeCode } from '../google/auth.ts';
import { config } from '../config.ts';
import type { AccountType } from '../types.ts';

const pendingAuth = new Map<AccountType, (code: string) => void>();

export function resolvePendingAuth(account: AccountType, code: string): boolean {
  const resolve = pendingAuth.get(account);
  if (!resolve) return false;
  resolve(code);
  pendingAuth.delete(account);
  return true;
}

export async function handleAuth(interaction: ChatInputCommandInteraction): Promise<void> {
  const account = interaction.options.getString('cuenta', true) as AccountType;
  const url = getAuthUrl(account);

  const embed = new EmbedBuilder()
    .setColor(0xfb923c)
    .setTitle(`🔑 Autenticar cuenta ${account === 'personal' ? 'Personal' : 'Estudiante'}`)
    .setDescription(
      `Visita el siguiente enlace para autorizar el acceso a Google Calendar:\n\n` +
        `[**Autorizar con Google →**](${url})\n\n` +
        `Después de autorizar, pega aquí el código de autorización con:\n` +
        `\`/auth-code cuenta:${account} código:<el código>\``,
    )
    .setFooter({ text: `Puerto de callback: ${config.google.redirectPort}` });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// Comando secundario para recibir el código (simplificado en el flujo de script)
export async function handleAuthCode(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const account = interaction.options.getString('cuenta', true) as AccountType;
  const code = interaction.options.getString('código', true);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    await exchangeCode(code, account);
    await interaction.editReply({
      content: `✅ Cuenta **${account}** autenticada correctamente.`,
    });
  } catch (err) {
    await interaction.editReply({
      content: `❌ Error al autenticar: ${(err as Error).message}`,
    });
  }
}
