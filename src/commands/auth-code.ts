import { type ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { exchangeCode } from '../google/auth.ts';
import type { AccountType } from '../types.ts';

export async function handleAuthCode(interaction: ChatInputCommandInteraction): Promise<void> {
  const account = interaction.options.getString('cuenta', true) as AccountType;
  const rawInput = interaction.options.getString('codigo', true).trim();

  // Aceptar tanto el código suelto como la URL completa del callback
  // Ej: "4/0AX4XfWi..." o "http://localhost:3001/auth/callback?code=4/0AX4XfWi...&scope=..."
  let code = rawInput;
  if (rawInput.startsWith('http')) {
    try {
      const url = new URL(rawInput);
      code = url.searchParams.get('code') ?? rawInput;
    } catch {
      // Si no parsea, usar el input tal cual
    }
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await exchangeCode(code, account);
    const label = account === 'personal' ? 'Personal' : 'Estudiante';
    await interaction.editReply(`✅ Cuenta **${label}** autenticada correctamente.`);
  } catch (err) {
    await interaction.editReply(`❌ Error al autenticar: ${(err as Error).message}`);
  }
}
