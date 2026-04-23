import { type ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { hasTokens } from '../google/auth.ts';
import { config } from '../config.ts';

export async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  const personalOk = hasTokens('personal');
  const studentOk = hasTokens('student');

  const embed = new EmbedBuilder()
    .setColor(personalOk && studentOk ? 0x57f287 : 0xed4245)
    .setTitle('📊 Estado del bot')
    .addFields(
      {
        name: '👤 Cuenta personal',
        value: personalOk ? '✅ Autenticada' : '❌ No autenticada – usa `/auth cuenta:Personal`',
        inline: false,
      },
      {
        name: '🎓 Cuenta estudiante',
        value: studentOk ? '✅ Autenticada' : '❌ No autenticada – usa `/auth cuenta:Estudiante`',
        inline: false,
      },
      {
        name: '⏰ Programación',
        value: `\`${config.schedule.cron}\` (${config.schedule.timezone})`,
        inline: false,
      },
      {
        name: '📅 Calendarios configurados',
        value: [
          `**Eventos personales:** ${config.calendars.personalEvents.join(', ') || '*(sin configurar)*'}`,
          `**Horario estudiante:** ${config.calendars.studentSchedule.join(', ') || '*(sin configurar)*'}`,
          `**Classroom:** ${config.calendars.studentClassroom.length ? config.calendars.studentClassroom.join(', ') : '*(autodetección)*'}`,
        ].join('\n'),
        inline: false,
      },
    );

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
