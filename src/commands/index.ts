import {
  SlashCommandBuilder,
  REST,
  Routes,
  MessageFlags,
  type ChatInputCommandInteraction,
  type Client,
} from 'discord.js';
import { config } from '../config.ts';
import { handleAuth } from './auth.ts';
import { handleTest } from './test.ts';
import { handleStatus } from './status.ts';
import { handleCalendars } from './calendars.ts';

export const commands = [
  new SlashCommandBuilder()
    .setName('auth')
    .setDescription('Autenticar una cuenta de Google')
    .addStringOption((opt) =>
      opt
        .setName('cuenta')
        .setDescription('¿Qué cuenta quieres autenticar?')
        .setRequired(true)
        .addChoices(
          { name: 'Personal', value: 'personal' },
          { name: 'Estudiante', value: 'student' },
        ),
    ),
  new SlashCommandBuilder()
    .setName('test')
    .setDescription('Enviar el resumen de hoy ahora mismo'),
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Ver el estado de la conexión con Google Calendar'),
  new SlashCommandBuilder()
    .setName('calendarios')
    .setDescription('Listar todos los calendarios disponibles de una cuenta')
    .addStringOption((opt) =>
      opt
        .setName('cuenta')
        .setDescription('¿Qué cuenta quieres consultar?')
        .setRequired(true)
        .addChoices(
          { name: 'Personal', value: 'personal' },
          { name: 'Estudiante', value: 'student' },
        ),
    ),
];

export async function registerCommands(clientId: string): Promise<void> {
  const rest = new REST().setToken(config.discord.token);

  // integration_types: [1] = UserInstall (sin necesidad de invitar el bot a un servidor)
  // contexts: [0,1,2]      = Guild, BotDM, PrivateChannel
  const body = commands.map((c) => ({
    ...c.toJSON(),
    integration_types: [1],
    contexts: [0, 1, 2],
  }));

  await rest.put(Routes.applicationCommands(clientId), { body });
  console.log('[commands] Slash commands registrados (User Install)');
}

export async function handleCommand(
  interaction: ChatInputCommandInteraction,
  client: Client,
): Promise<void> {
  // Solo responder al usuario autorizado
  if (interaction.user.id !== config.discord.userId) {
    console.warn(`[commands] Acceso denegado. Esperado: ${config.discord.userId} | Recibido: ${interaction.user.id}`);
    await interaction.reply({ content: 'No tienes permiso para usar este bot.', flags: MessageFlags.Ephemeral });
    return;
  }

  switch (interaction.commandName) {
    case 'auth':
      await handleAuth(interaction);
      break;
    case 'test':
      await handleTest(interaction, client);
      break;
    case 'status':
      await handleStatus(interaction);
      break;
    case 'calendarios':
      await handleCalendars(interaction);
      break;
  }
}
