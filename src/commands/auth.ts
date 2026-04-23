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

// En Docker remoto no hay servidor local accesible; usamos una env var para indicarlo.
const IS_REMOTE = process.env.AUTH_REMOTE === 'true';

export async function handleAuth(interaction: ChatInputCommandInteraction): Promise<void> {
  const account = interaction.options.getString('cuenta', true) as AccountType;
  const accountLabel = account === 'personal' ? 'Personal' : 'Estudiante';
  const url = getAuthUrl(account);

  const container = new ContainerBuilder().setAccentColor(0xfb923c);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## 🔑 Autenticar cuenta ${accountLabel}`),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  if (IS_REMOTE) {
    // Modo Docker remoto: el usuario tiene que copiar el código manualmente
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            'Haz clic en el botón y autoriza con Google.\n' +
              'Cuando el navegador intente redirigir a `localhost` y falle, **copia la URL completa** de la barra de direcciones y úsala con `/auth-code`.',
          ),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setLabel('Abrir Google Auth')
            .setURL(url)
            .setStyle(ButtonStyle.Link),
        ),
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# Modo remoto · Usa \`/auth-code\` con la URL del callback`,
      ),
    );
  } else {
    // Modo local/Docker mismo equipo: callback automático
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            'Haz clic en el botón para autorizar el acceso a Google Calendar y Google Tasks.\n' +
              'Cuando termines en el navegador, recibirás una confirmación en Discord.',
          ),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setLabel('Autorizar con Google')
            .setURL(url)
            .setStyle(ButtonStyle.Link),
        ),
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# Expira en 5 min · Puerto de callback: ${config.google.redirectPort}`,
      ),
    );

    // Servidor HTTP en background que procesa el callback automáticamente
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

  await interaction.reply({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components: [container] as any,
    flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
  });
}
