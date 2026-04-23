import {
  type ChatInputCommandInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { getAuthUrl } from '../google/auth.ts';
import { startOAuthServer } from '../google/oauth-server.ts';
import { config } from '../config.ts';
import type { AccountType } from '../types.ts';

export async function handleAuth(interaction: ChatInputCommandInteraction): Promise<void> {
  const account = interaction.options.getString('cuenta', true) as AccountType;
  const accountLabel = account === 'personal' ? 'Personal' : 'Estudiante';
  const url = getAuthUrl(account);

  const container = new ContainerBuilder()
    .setAccentColor(0xfb923c)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## 🔑 Autenticar cuenta ${accountLabel}`),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            'Haz clic en el botón para autorizar el acceso a Google Calendar y Google Tasks.\n' +
              'Cuando termines en el navegador, recibirás una confirmación aquí en Discord.',
          ),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setLabel('Autorizar con Google')
            .setURL(url)
            .setStyle(ButtonStyle.Link),
        ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# Expira en 5 min · Puerto de callback: ${config.google.redirectPort}`,
      ),
    );

  // Respuesta inmediata con el botón de autorización
  await interaction.reply({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components: [container] as any,
    flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
  });

  // Servidor HTTP en background que procesa el callback de Google automáticamente
  startOAuthServer(async (acct, success, error) => {
    try {
      const user = await interaction.client.users.fetch(interaction.user.id);
      const dm = await user.createDM();

      const label = acct === 'personal' ? 'Personal' : 'Estudiante';
      if (success) {
        await dm.send(`✅ Cuenta **${label}** autenticada correctamente.`);
      } else {
        await dm.send(`❌ Error al autenticar cuenta **${label}**: ${error ?? 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('[auth] Error al enviar confirmación por DM:', err);
    }
  });
}
