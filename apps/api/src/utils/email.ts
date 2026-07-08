/**
 * email.ts
 * =========
 * Utilidad para envío de correos electrónicos.
 * 
 * ¿Qué hace este archivo?
 * - Detecta automáticamente qué proveedor usar:
 *   - AWS SES SDK (API HTTP) → Para producción (Render, etc.)
 *   - Nodemailer SMTP → Para desarrollo local
 * - Tiene funciones específicas para cada tipo de correo (verificación, etc.)
 * - Genera emails con diseño HTML bonito
 * 
 * Ubicación: apps/api/src/utils/email.ts
 */

import nodemailer from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { env } from '../config/env.js';
import { ZONA_EMPRESA } from './zonaHoraria.js';
import { obtenerConfigTexto } from '../services/configuracion.service.js';

// URL pública del logo de AnunciaYA (para incluir en emails).
// Usar URL pública (no base64) porque Gmail bloquea data: URIs desde 2013.
// Se construye desde BRAND_ASSETS_URL (dominio propio del bucket R2) en vez de
// hardcodear pub-…r2.dev, que sufre rate-limit y rompe el logo en Gmail/Yahoo.
const LOGO_URL = `${env.BRAND_ASSETS_URL}/brand/anunciaya-logo3.png`;

// Email de contacto público que se muestra en el pie de todos los correos. Se lee
// de la config (clave `email_soporte`) y se hidrata al arrancar el servidor con
// `refrescarEmailSoporte()`. El default coincide con el valor de producción por si
// aún no se hidrató.
let emailSoporte = 'contacto@anunciaya.mx';

/** Relee `email_soporte` de la config (para el pie de los correos). Llamar al arrancar. */
export async function refrescarEmailSoporte(): Promise<void> {
  try {
    emailSoporte = await obtenerConfigTexto('email_soporte', 'contacto@anunciaya.mx');
  } catch {
    // Conserva el valor actual/por defecto si la config no está disponible.
  }
}

// =============================================================================
// CONFIGURACIÓN DE PROVEEDORES
// =============================================================================

/**
 * Detectar qué proveedor de email usar
 * - Si hay AWS_ACCESS_KEY_ID → AWS SES (API HTTP, funciona en cualquier host)
 * - Si no → Nodemailer SMTP (para desarrollo local)
 */
const useAwsSes = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

// Cliente de AWS SES (solo se crea si hay credenciales)
let sesClient: SESClient | null = null;

if (useAwsSes) {
  sesClient = new SESClient({
    region: process.env.AWS_REGION || 'us-east-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  console.log('📧 Email configurado con AWS SES SDK (región:', process.env.AWS_REGION || 'us-east-2', ')');
}

// Transporter de Nodemailer (fallback para desarrollo local)
let transporter: nodemailer.Transporter | null = null;

if (!useAwsSes && env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: true,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
  console.log('📧 Email configurado con Nodemailer SMTP');
}

// Remitente configurado
const EMAIL_FROM = `AnunciaYA <${env.AWS_SES_FROM_EMAIL}>`;

// =============================================================================
// PLANTILLAS DE EMAIL
// =============================================================================

/**
 * Genera el HTML para el email de verificación
 * @param nombre - Nombre del usuario para personalizar
 * @param codigo - Código de 6 dígitos
 */
function plantillaVerificacion(nombre: string, codigo: string): string {
  const contenido = `
    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #334155;">
      Gracias por registrarte en AnunciaYA. Para completar tu registro, usa el siguiente c&oacute;digo de verificaci&oacute;n:
    </p>

    <div style="background-color: #e2e8f0; border: 1px solid #94a3b8; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 20px;">
      <div style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">
        ${codigo}
      </div>
      <p style="margin: 12px 0 0; font-size: 12px; color: #334155; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
        Expira en 15 minutos
      </p>
    </div>

    <p style="margin: 0; font-size: 13px; color: #64748b;">
      Si no solicitaste este c&oacute;digo, puedes ignorar este mensaje de forma segura.
    </p>`;

  return plantillaBase(nombre, contenido);
}

/**
 * Genera el HTML para el email de CAMBIO de correo (confirmar la dirección nueva).
 * Se envía al correo NUEVO; el copy deja claro que es un cambio de correo, no un registro.
 * @param nombre - Nombre del usuario para personalizar
 * @param codigo - Código de 6 dígitos
 */
function plantillaCambioCorreo(nombre: string, codigo: string): string {
  const contenido = `
    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #334155;">
      Recibimos una solicitud para cambiar el correo de tu cuenta de AnunciaYA a esta direcci&oacute;n. Usa el siguiente c&oacute;digo para confirmar tu nuevo correo:
    </p>

    <div style="background-color: #e2e8f0; border: 1px solid #94a3b8; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 20px;">
      <div style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">
        ${codigo}
      </div>
      <p style="margin: 12px 0 0; font-size: 12px; color: #334155; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
        Expira en 15 minutos
      </p>
    </div>

    <div style="border-left: 4px solid #d97706; background-color: #fef3c7; padding: 14px 18px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
      <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #78350f;">
        <strong style="color: #451a03;">Importante:</strong> si no solicitaste este cambio, ignora este mensaje. Tu correo actual seguir&aacute; siendo el mismo.
      </p>
    </div>

    <p style="margin: 0; font-size: 13px; color: #64748b;">
      Por seguridad, nunca compartas este c&oacute;digo con nadie.
    </p>`;

  return plantillaBase(nombre, contenido);
}

/**
 * Genera el HTML para el email de recuperación de contraseña
 * @param nombre - Nombre del usuario para personalizar
 * @param codigo - Código de 6 dígitos
 */
function plantillaRecuperacion(nombre: string, codigo: string): string {
  const contenido = `
    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #334155;">
      Recibimos una solicitud para restablecer la contrase&ntilde;a de tu cuenta. Usa el siguiente c&oacute;digo:
    </p>

    <div style="background-color: #e2e8f0; border: 1px solid #94a3b8; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 20px;">
      <div style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">
        ${codigo}
      </div>
      <p style="margin: 12px 0 0; font-size: 12px; color: #334155; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
        Expira en 15 minutos
      </p>
    </div>

    <div style="border-left: 4px solid #d97706; background-color: #fef3c7; padding: 14px 18px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
      <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #78350f;">
        <strong style="color: #451a03;">Importante:</strong> si no solicitaste este cambio, ignora este mensaje. Tu contrase&ntilde;a seguir&aacute; siendo la misma.
      </p>
    </div>

    <p style="margin: 0; font-size: 13px; color: #64748b;">
      Por seguridad, nunca compartas este c&oacute;digo con nadie.
    </p>`;

  return plantillaBase(nombre, contenido);
}

/**
 * Genera el HTML para el email de CREAR contraseña por primera vez (cuenta dada de alta
 * sin contraseña — modelo C). Mismo mecanismo de código de 6 dígitos que la recuperación,
 * pero con copy de "crear" (no "restablecer"), correcto para quien nunca tuvo contraseña.
 * @param nombre - Nombre del usuario para personalizar
 * @param codigo - Código de 6 dígitos
 */
/**
 * @param destino  A qué app dirige el enlace de activación:
 *   - 'panel': cuenta del EQUIPO (gerente/vendedor) → Panel Admin (PANEL_URL).
 *   - 'web'  : usuario / dueño de negocio → app pública AnunciaYA (FRONTEND_URL).
 */
function plantillaCrearContrasena(
  nombre: string,
  codigo: string,
  correo: string,
  destino: 'web' | 'panel' = 'web'
): string {
  const esPanel = destino === 'panel';
  // Si el Panel aún no está desplegado (PANEL_URL sin configurar) caemos a la app web,
  // que también sabe manejar ?activarCuenta. Así nunca queda un enlace roto.
  // .replace: quita una barra final para no generar '...app//?activarCuenta'.
  const urlBase = (esPanel ? (env.PANEL_URL ?? env.FRONTEND_URL) : env.FRONTEND_URL).replace(/\/+$/, '');
  const enlace = `${urlBase}/?activarCuenta=${encodeURIComponent(correo)}`;
  const bienvenida = esPanel
    ? 'Nos da mucho gusto que te unas a nuestro equipo.'
    : 'Nos da mucho gusto que te unas a nuestra comunidad local.';
  const ayudaFallback = esPanel
    ? '&iquest;El bot&oacute;n no funciona? Entra al Panel de AnunciaYA, elige &quot;&iquest;Olvidaste tu contrase&ntilde;a?&quot; y escribe el c&oacute;digo de arriba para crearla.'
    : '&iquest;El bot&oacute;n no funciona? Entra a AnunciaYA, abre &quot;Iniciar sesi&oacute;n&quot; y elige &quot;&iquest;Primera vez? Crear contrase&ntilde;a&quot;.';
  const contenido = `
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
      &iexcl;Te damos la bienvenida a <strong>AnunciaYA</strong>! ${bienvenida}
    </p>
    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #334155;">
      Tu cuenta ya est&aacute; creada &mdash; solo falta <strong>activarla con tu contrase&ntilde;a</strong>. Da clic en el bot&oacute;n y, cuando te lo pida, escribe este c&oacute;digo:
    </p>

    <div style="text-align: center; margin-bottom: 20px;">
      <a href="${enlace}" target="_blank" rel="noopener" style="display: inline-block; background-color: #034AE3; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
        Activar mi cuenta
      </a>
    </div>

    <div style="background-color: #e2e8f0; border: 1px solid #94a3b8; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 20px;">
      <div style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">
        ${codigo}
      </div>
      <p style="margin: 12px 0 0; font-size: 12px; color: #334155; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
        Expira en 15 minutos
      </p>
    </div>

    <p style="margin: 0 0 12px; font-size: 13px; color: #64748b;">
      ${ayudaFallback}
    </p>
    <p style="margin: 0; font-size: 13px; color: #64748b;">
      Si no esperabas este mensaje, puedes ignorarlo de forma segura.
    </p>`;

  return plantillaBase(nombre, contenido);
}

// =============================================================================
// FUNCIÓN GENÉRICA DE ENVÍO
// =============================================================================

/**
 * Resultado del envío de email
 */
interface ResultadoEmail {
  success: boolean;
  message: string;
  id?: string;
}


/**
 * Envía un email usando el proveedor configurado (AWS SES o Nodemailer)
 */
async function enviarEmail(
  to: string,
  subject: string,
  html: string
): Promise<ResultadoEmail> {
  // Opción 1: AWS SES SDK (API HTTP)
  if (useAwsSes && sesClient) {
    try {
      const command = new SendEmailCommand({
        Source: EMAIL_FROM,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: html,
              Charset: 'UTF-8',
            },
          },
        },
      });

      const response = await sesClient.send(command);

      return {
        success: true,
        message: 'Email enviado con AWS SES',
        id: response.MessageId,
      };
    } catch (error) {
      console.error('Error al enviar email con AWS SES:', error);
      return {
        success: false,
        message: 'No se pudo enviar el email con AWS SES',
      };
    }
  }

  // Opción 2: Nodemailer SMTP (desarrollo local)
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: EMAIL_FROM,
        to,
        subject,
        html,
      });

      return {
        success: true,
        message: 'Email enviado con Nodemailer',
        id: info.messageId,
      };
    } catch (error) {
      console.error('Error al enviar email con Nodemailer:', error);
      return {
        success: false,
        message: 'No se pudo enviar el email con Nodemailer',
      };
    }
  }

  // Sin proveedor configurado
  console.error('❌ No hay proveedor de email configurado');
  return {
    success: false,
    message: 'No hay proveedor de email configurado',
  };
}

// =============================================================================
// FUNCIONES DE ENVÍO ESPECÍFICAS
// =============================================================================

/**
 * Envía el código de verificación al correo del usuario
 */
export async function enviarCodigoVerificacion(
  correo: string,
  nombre: string,
  codigo: string
): Promise<ResultadoEmail> {
  return enviarEmail(
    correo,
    `${codigo} - Tu código de verificación de AnunciaYA`,
    plantillaVerificacion(nombre, codigo)
  );
}

/**
 * Reenvía el código de verificación
 */
export async function reenviarCodigoVerificacion(
  correo: string,
  nombre: string,
  codigo: string
): Promise<ResultadoEmail> {
  return enviarEmail(
    correo,
    `${codigo} - Nuevo código de verificación de AnunciaYA`,
    plantillaVerificacion(nombre, codigo)
  );
}

/**
 * Envía el código para CONFIRMAR un cambio de correo. Se manda al correo NUEVO;
 * el copy es de "cambio de correo" (no de registro).
 */
export async function enviarCodigoCambioCorreo(
  correo: string,
  nombre: string,
  codigo: string
): Promise<ResultadoEmail> {
  return enviarEmail(
    correo,
    `${codigo} - Confirma tu nuevo correo en AnunciaYA`,
    plantillaCambioCorreo(nombre, codigo)
  );
}

/**
 * Envía el código de recuperación de contraseña al correo del usuario
 */
export async function enviarCodigoRecuperacion(
  correo: string,
  nombre: string,
  codigo: string
): Promise<ResultadoEmail> {
  return enviarEmail(
    correo,
    `${codigo} - Recupera tu contraseña de AnunciaYA`,
    plantillaRecuperacion(nombre, codigo)
  );
}

/**
 * Envía el código para CREAR la contraseña por primera vez (cuenta dada de alta sin
 * contraseña). Mismo mecanismo de código de 6 dígitos que la recuperación, con copy de
 * "crear" en vez de "restablecer".
 */
export async function enviarCodigoCrearContrasena(
  correo: string,
  nombre: string,
  codigo: string,
  destino: 'web' | 'panel' = 'web'
): Promise<ResultadoEmail> {
  return enviarEmail(
    correo,
    `${codigo} - Crea tu contraseña de AnunciaYA`,
    plantillaCrearContrasena(nombre, codigo, correo, destino)
  );
}

/**
 * Email: una cuenta existente fue PROMOVIDA a un rol del equipo del Panel (vendedor / gerente).
 * No incluye contraseña: la persona ya tiene la suya. `detalle` opcional (ciudades/región).
 */
export async function enviarEmailBienvenidaEquipo(
  correo: string,
  nombre: string,
  rol: 'vendedor' | 'gerente',
  detalle?: string,
): Promise<ResultadoEmail> {
  const rolTexto = rol === 'gerente' ? 'Gerente Regional' : 'Vendedor';
  const contenido = `
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
      Ahora formas parte del equipo de <strong>AnunciaYA</strong> como <strong>${rolTexto}</strong>${detalle ? ` &mdash; ${escape(detalle)}` : ''}.
    </p>
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
      Inicia sesi&oacute;n con tu <strong>correo y contrase&ntilde;a de siempre</strong> para entrar al Panel de AnunciaYA.
    </p>
    <p style="margin: 0; font-size: 13px; color: #64748b;">
      Si no esperabas este mensaje, contacta al administrador de AnunciaYA.
    </p>`;
  return enviarEmail(correo, `Ahora eres ${rolTexto} en AnunciaYA`, plantillaBase(nombre, contenido));
}

// =============================================================================
// EMAILS DE GERENTES (BS Sucursales)
// =============================================================================

function plantillaBase(nombre: string, contenido: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
          <tr>
            <td style="padding: 20px 32px; text-align: center; background-color: #001E70; background: linear-gradient(135deg, #02143D 10%, #001E70 50%, #034AE3 100%);">
              <a href="${env.FRONTEND_URL}" target="_blank" rel="noopener" style="display: inline-block; text-decoration: none; border: 0;">
                <img src="${LOGO_URL}" alt="AnunciaYA" width="240" style="display: inline-block; max-width: 240px; height: auto; border: 0;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">
                Hola ${nombre}
              </h2>
              ${contenido}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #a1a1aa; text-align: center;">
                &iquest;Dudas? Escr&iacute;benos a <a href="mailto:${emailSoporte}" style="color: #64748b; text-decoration: underline;">${emailSoporte}</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                &copy; ${new Date().getFullYear()} AnunciaYA - Tu Comunidad Local
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

// Escapa caracteres HTML peligrosos en nombres de negocio/sucursal
function escape(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Email: cuenta de gerente creada con credenciales provisionales
 */
export async function enviarEmailGerenteCreado(
  correo: string,
  nombre: string,
  contrasenaProvisional: string,
  nombreNegocio: string,
  nombreSucursal: string
): Promise<ResultadoEmail> {
  const contenido = `
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
      Has sido asignado(a) como <strong>gerente de &quot;${escape(nombreSucursal)}&quot;</strong> del negocio <strong>&quot;${escape(nombreNegocio)}&quot;</strong> en AnunciaYA.
    </p>
    <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6; color: #334155;">
      Estas son tus credenciales de acceso:
    </p>
    <div style="background-color: #e2e8f0; border: 1px solid #94a3b8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <p style="margin: 0 0 4px; font-size: 11px; color: #334155; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Correo</p>
      <p style="margin: 0 0 16px; font-size: 15px; color: #0f172a; font-weight: 500;">${correo}</p>
      <p style="margin: 0 0 4px; font-size: 11px; color: #334155; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Contrase&ntilde;a provisional</p>
      <div style="font-family: 'Courier New', monospace; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: 3px;">
        ${contrasenaProvisional}
      </div>
    </div>
    <div style="border-left: 4px solid #d97706; background-color: #fef3c7; padding: 14px 18px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
      <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #78350f;">
        <strong style="color: #451a03;">Importante:</strong> al iniciar sesi&oacute;n por primera vez deber&aacute;s cambiar esta contrase&ntilde;a por una definitiva.
      </p>
    </div>
    <p style="margin: 0; font-size: 13px; color: #64748b;">
      Si no esperabas este mensaje, contacta al due&ntilde;o del negocio.
    </p>`;

  return enviarEmail(
    correo,
    `Te asignaron como gerente en ${nombreNegocio}`,
    plantillaBase(nombre, contenido)
  );
}

/**
 * Email: cuenta personal existente promovida a gerente
 * (NO incluye contraseña — el usuario ya tiene su propia contraseña)
 */
export async function enviarEmailGerenteAsignado(
  correo: string,
  nombre: string,
  nombreNegocio: string,
  nombreSucursal: string
): Promise<ResultadoEmail> {
  const contenido = `
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
      Has sido asignado(a) como <strong>gerente de &quot;${escape(nombreSucursal)}&quot;</strong> del negocio <strong>&quot;${escape(nombreNegocio)}&quot;</strong>.
    </p>
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
      Tu cuenta ya est&aacute; en modo comercial. Inicia sesi&oacute;n con tu contrase&ntilde;a habitual para gestionar tu sucursal desde AnunciaYA.
    </p>
    <p style="margin: 0; font-size: 13px; color: #64748b;">
      Si no esperabas este mensaje, contacta al due&ntilde;o del negocio.
    </p>`;

  return enviarEmail(
    correo,
    `Te asignaron como gerente en ${nombreNegocio}`,
    plantillaBase(nombre, contenido)
  );
}

/**
 * Email: credenciales reenviadas (nueva contraseña provisional)
 */
export async function enviarEmailCredencialesReenviadas(
  correo: string,
  nombre: string,
  contrasenaProvisional: string,
  nombreNegocio: string,
  nombreSucursal: string
): Promise<ResultadoEmail> {
  const contenido = `
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
      Se gener&oacute; una nueva contrase&ntilde;a provisional para tu cuenta de gerente de <strong>&quot;${escape(nombreSucursal)}&quot;</strong> (${escape(nombreNegocio)}):
    </p>
    <div style="background-color: #e2e8f0; border: 1px solid #94a3b8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <p style="margin: 0 0 4px; font-size: 11px; color: #334155; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Nueva contrase&ntilde;a provisional</p>
      <div style="font-family: 'Courier New', monospace; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: 3px;">
        ${contrasenaProvisional}
      </div>
    </div>
    <div style="border-left: 4px solid #d97706; background-color: #fef3c7; padding: 14px 18px; border-radius: 0 4px 4px 0;">
      <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #78350f;">
        <strong style="color: #451a03;">Importante:</strong> al iniciar sesi&oacute;n deber&aacute;s cambiar esta contrase&ntilde;a por una definitiva.
      </p>
    </div>`;

  return enviarEmail(
    correo,
    `Nueva contrase\u00f1a provisional - ${nombreNegocio}`,
    plantillaBase(nombre, contenido)
  );
}

/**
 * Email: notificación de revocación de gerente
 */
export async function enviarEmailGerenteRevocado(
  correo: string,
  nombre: string,
  nombreNegocio: string,
  nombreSucursal: string
): Promise<ResultadoEmail> {
  const contenido = `
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
      Tu acceso como <strong>gerente de &quot;${escape(nombreSucursal)}&quot;</strong> en <strong>&quot;${escape(nombreNegocio)}&quot;</strong> ha sido revocado por el due&ntilde;o del negocio.
    </p>
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
      Tu cuenta sigue activa como <strong>usuario personal</strong> de AnunciaYA. Puedes seguir usando la app para descubrir negocios, acumular puntos y m&aacute;s.
    </p>
    <p style="margin: 0; font-size: 13px; color: #64748b;">
      Si tienes preguntas, contacta al due&ntilde;o del negocio.
    </p>`;

  return enviarEmail(
    correo,
    `Tu acceso como gerente ha sido revocado - ${nombreNegocio}`,
    plantillaBase(nombre, contenido)
  );
}

// =============================================================================
// COMPROBANTE DE PAGO DE MEMBRESÍA (defensa Camino B — "robo invisible")
// =============================================================================

/**
 * Datos del pago para armar el comprobante / bloque-recibo que recibe el DUEÑO del
 * negocio cuando alguien (vendedor, gerente o admin) registra un pago manual.
 */
export interface DatosComprobantePago {
  /** Nombre del negocio cuya membresía se renovó/activó. */
  nombreNegocio: string;
  /** Cómo se registró: ingreso real (efectivo/transferencia/tarjeta) o cortesía (sin dinero). */
  concepto: 'efectivo' | 'transferencia' | 'cortesia' | 'tarjeta';
  /** Monto cobrado en MXN. NULL/omitido en cortesía (no hubo cobro). */
  monto?: number | null;
  /** Vigencia: fecha (ISO) hasta la que queda activa la membresía. */
  hasta: string;
  /** URL del recibo PDF en R2 (opcional). Si viene, el correo muestra el botón de descarga;
   *  si no (falló la generación/subida), el correo va igual sin botón. */
  reciboUrl?: string | null;
  /** Si true, el copy y el asunto dicen que es una CORRECCIÓN de un pago ya registrado
   *  (reemplaza el comprobante anterior con el mismo folio), no un pago nuevo. */
  esCorreccion?: boolean;
}

/** Botón "Descargar tu recibo (PDF)" — devuelve '' si no hay URL. */
function botonDescargaRecibo(reciboUrl?: string | null): string {
  if (!reciboUrl) return '';
  return `
    <div style="text-align: center; margin: 0 0 20px;">
      <a href="${reciboUrl}" target="_blank" rel="noopener" style="display: inline-block; border: 1px solid #034AE3; color: #034AE3; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 22px; border-radius: 8px;">
        Descargar tu recibo (PDF)
      </a>
    </div>`;
}

/** Texto legible del concepto del pago. */
function conceptoLegible(concepto: DatosComprobantePago['concepto']): string {
  if (concepto === 'transferencia') return 'Transferencia';
  if (concepto === 'tarjeta') return 'Tarjeta';
  if (concepto === 'cortesia') return 'Cortes&iacute;a';
  return 'Efectivo';
}

/** Formatea un monto MXN como "$449.00 MXN". */
function formatearMontoMXN(monto: number): string {
  const n = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto);
  return `${n} MXN`;
}

/**
 * Formatea una fecha ISO como "12 de Julio de 2026" en la zona operativa de la empresa (Sonora).
 * Los valores son timestamptz (instantes reales); formatear en hora local evita el corrimiento de un
 * día que daba UTC al emitir de tarde (18:30 local = 01:30 UTC del día siguiente). Igual que el PDF.
 */
function formatearFechaLarga(iso: string): string {
  // formatToParts para capitalizar SOLO el mes ('es-MX' lo da en minúscula): "20 de Junio de 2026".
  const partes = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: ZONA_EMPRESA,
  }).formatToParts(new Date(iso));
  return partes.map((p) => (p.type === 'month' ? p.value.charAt(0).toUpperCase() + p.value.slice(1) : p.value)).join('');
}

/**
 * Bloque-recibo (HTML) con el detalle del pago: negocio, concepto, monto (si aplica) y
 * vigencia. Reutilizado por el comprobante de renovación y por el correo de bienvenida del
 * alta manual. El monto se omite en cortesía (no hubo cobro de dinero).
 */
function bloqueReciboMembresia(datos: DatosComprobantePago): string {
  const esCortesia = datos.concepto === 'cortesia';
  const conceptoTexto = esCortesia ? 'Membres&iacute;a de cortes&iacute;a' : 'Pago de Membres&iacute;a';
  const filaMonto = (!esCortesia && datos.monto != null)
    ? `
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Monto</td>
        <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 700; text-align: right;">${formatearMontoMXN(datos.monto)}</td>
      </tr>`
    : '';
  const filaFormaPago = !esCortesia
    ? `
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Forma de pago</td>
        <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">${conceptoLegible(datos.concepto)}</td>
      </tr>`
    : '';

  return `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin-bottom: 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Negocio</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">${escape(datos.nombreNegocio)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Concepto</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">${conceptoTexto}</td>
        </tr>${filaMonto}${filaFormaPago}
        <tr>
          <td style="padding: 10px 0 0; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0;">Membres&iacute;a activa hasta</td>
          <td style="padding: 10px 0 0; font-size: 15px; color: #034AE3; font-weight: 700; text-align: right; border-top: 1px solid #e2e8f0;">${formatearFechaLarga(datos.hasta)}</td>
        </tr>
      </table>
    </div>`;
}

/**
 * Plantilla (HTML) del comprobante de pago de membresía. Exportada para que el harness de
 * verificación pueda renderizarla sin enviar correo. El copy se ramifica: efectivo/transferencia
 * confirma un pago recibido; cortesía informa la activación sin mencionar dinero.
 */
export function plantillaComprobantePago(nombre: string, datos: DatosComprobantePago): string {
  const esCortesia = datos.concepto === 'cortesia';
  const esCorreccion = datos.esCorreccion === true;

  const intro = esCorreccion
    ? `Actualizamos el registro de tu membres&iacute;a de AnunciaYA tras una <strong>correcci&oacute;n</strong> del pago. Este comprobante <strong>reemplaza al anterior</strong> (mismo folio); el detalle vigente es:`
    : esCortesia
      ? `Activamos la membres&iacute;a de tu negocio en AnunciaYA como <strong>cortes&iacute;a</strong>. Aqu&iacute; tienes el detalle:`
      : `Confirmamos que recibimos tu pago de la membres&iacute;a de AnunciaYA. <strong>Guarda este correo como tu comprobante.</strong>`;

  const cierre = esCorreccion
    ? `Este es tu <strong>comprobante actualizado</strong> y sustituye al anterior con ese folio. Si no reconoces esta correcci&oacute;n, av&iacute;sanos de inmediato.`
    : esCortesia
      ? `Cualquier duda sobre tu membres&iacute;a, est&aacute;s en buenas manos: cont&aacute;ctanos cuando lo necesites.`
      : `Este correo es tu <strong>comprobante oficial</strong>. Si registraste un pago y <strong>no</strong> recibiste este mensaje, av&iacute;sanos de inmediato &mdash; siempre debe llegarte una constancia.`;

  const contenido = `
    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #334155;">
      ${intro}
    </p>
    ${bloqueReciboMembresia(datos)}
    ${botonDescargaRecibo(datos.reciboUrl)}
    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #64748b;">
      ${cierre}
    </p>`;

  return plantillaBase(nombre, contenido);
}

/**
 * Envía el comprobante de pago de membresía al DUEÑO del negocio. Defensa del Camino B
 * (pago en efectivo): hace que registrar un cobro sea inseparable de que el negocio reciba
 * constancia con su vigencia → si pagó y no le llega, esa es la alarma. Best-effort: el
 * llamador debe envolverlo en try/catch para que un fallo de correo no rompa el cobro ya registrado.
 */
export async function enviarComprobantePagoMembresia(
  correo: string,
  nombre: string,
  datos: DatosComprobantePago
): Promise<ResultadoEmail> {
  const asunto = datos.esCorreccion
    ? 'Comprobante actualizado — tu membresía de AnunciaYA'
    : datos.concepto === 'cortesia'
      ? 'Tu membresía de AnunciaYA está activa'
      : 'Comprobante de pago — tu membresía de AnunciaYA';

  return enviarEmail(correo, asunto, plantillaComprobantePago(nombre, datos));
}

/**
 * Aviso al anunciante de que su publicidad está por vencer (cron de Publicidad, 3 días antes).
 * Best-effort.
 */
export async function enviarAvisoVencimientoPublicidad(
  correo: string,
  nombre: string,
  dias: number
): Promise<ResultadoEmail> {
  const cuando = dias <= 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`;

  const contenido = `
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
      Tu anuncio en AnunciaYA <strong>vence ${cuando}</strong>. Para seguir apareciendo en los carruseles de tu comunidad, vuelve a anunciarte desde la app antes de que expire.
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${env.FRONTEND_URL}" target="_blank" rel="noopener" style="display: inline-block; background-color: #034AE3; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 12px 28px; border-radius: 8px;">
        Volver a anunciarme
      </a>
    </div>
    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #64748b;">
      Gracias por anunciarte con nosotros.
    </p>`;
  return enviarEmail(correo, 'Tu publicidad está por vencer — AnunciaYA', plantillaBase(nombre, contenido));
}

/**
 * Bloque-recibo (HTML) del comprobante de PUBLICIDAD: anunciante, concepto, espacios (carruseles),
 * monto (si aplica), forma de pago y vigencia. Mismo lenguaje visual que `bloqueReciboMembresia`.
 */
function bloqueReciboPublicidad(datos: { titular: string; carruseles: string; concepto: string; monto: number | null; hasta: string }): string {
  const esCortesia = datos.concepto === 'cortesia';
  const conceptoTexto = esCortesia ? 'Publicidad de cortes&iacute;a' : 'Pago de Publicidad';
  const filaMonto = (!esCortesia && datos.monto != null)
    ? `
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Monto</td>
        <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 700; text-align: right;">${formatearMontoMXN(datos.monto)}</td>
      </tr>`
    : '';
  const filaFormaPago = !esCortesia
    ? `
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Forma de pago</td>
        <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">${conceptoLegible(datos.concepto as DatosComprobantePago['concepto'])}</td>
      </tr>`
    : '';

  return `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin-bottom: 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Anunciante</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">${escape(datos.titular)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Concepto</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">${conceptoTexto}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Espacios</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">${escape(datos.carruseles)}</td>
        </tr>${filaMonto}${filaFormaPago}
        <tr>
          <td style="padding: 10px 0 0; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0;">Publicidad activa hasta</td>
          <td style="padding: 10px 0 0; font-size: 15px; color: #034AE3; font-weight: 700; text-align: right; border-top: 1px solid #e2e8f0;">${formatearFechaLarga(datos.hasta)}</td>
        </tr>
      </table>
    </div>`;
}

/**
 * Comprobante al anunciante cuando se registra/paga su publicidad (alta manual o wizard). Usa la MISMA
 * plantilla rica que el recibo de membresía (`plantillaBase` + bloque-recibo) con el folio, el monto, la
 * vigencia y el botón de descarga del recibo PDF si se generó. Best-effort.
 */
export async function enviarComprobantePublicidad(
  correo: string,
  nombre: string,
  datos: { titular: string; carruseles: string; concepto: string; monto: number | null; folio: number | null; hasta: string; reciboUrl?: string }
): Promise<ResultadoEmail> {
  const esCortesia = datos.concepto === 'cortesia';
  const folioTxt = datos.folio != null ? ` &middot; Folio #${String(datos.folio).padStart(5, '0')}` : '';

  const intro = esCortesia
    ? `Activamos tu publicidad en AnunciaYA como <strong>cortes&iacute;a</strong>. Aqu&iacute; tienes el detalle:`
    : `Confirmamos que recibimos tu pago de publicidad en AnunciaYA. <strong>Guarda este correo como tu comprobante.</strong>`;

  const cierre = esCortesia
    ? `Cualquier duda sobre tu publicidad, est&aacute;s en buenas manos: cont&aacute;ctanos cuando lo necesites.`
    : `Este correo es tu <strong>comprobante oficial</strong>. Si no reconoces este cargo, av&iacute;sanos de inmediato.`;

  const contenido = `
    <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6; color: #334155;">
      ${intro}
    </p>
    <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #334155;">
      Tu publicidad en <strong>${escape(datos.carruseles)}</strong> ya est&aacute; activa${folioTxt}.
    </p>
    ${bloqueReciboPublicidad(datos)}
    ${botonDescargaRecibo(datos.reciboUrl)}
    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #64748b;">
      ${cierre}
    </p>`;

  const asunto = esCortesia ? 'Tu publicidad en AnunciaYA está activa' : 'Comprobante de pago — tu publicidad en AnunciaYA';
  return enviarEmail(correo, asunto, plantillaBase(nombre, contenido));
}

/**
 * Aviso al dueño de que un recibo suyo fue ANULADO/cancelado por el equipo. Transparencia de la
 * defensa Camino B: el negocio se entera de TODO movimiento, no solo de los cobros. Best-effort.
 */
export async function enviarReciboCancelado(
  correo: string,
  nombre: string,
  datos: { nombreNegocio: string; folio: number | string; monto?: number | null; motivo?: string | null }
): Promise<ResultadoEmail> {
  const folioTxt = `#${String(datos.folio).padStart(5, '0')}`;
  const montoTxt = datos.monto != null ? ` por <strong>${formatearMontoMXN(datos.monto)}</strong>` : '';
  const motivoBloque = datos.motivo
    ? `<p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #334155;">Motivo: ${escape(datos.motivo)}</p>`
    : '';

  const contenido = `
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
      Te informamos que el recibo <strong>${folioTxt}</strong> de tu negocio <strong>&quot;${escape(datos.nombreNegocio)}&quot;</strong>${montoTxt} fue <strong>cancelado</strong> por nuestro equipo.
    </p>
    ${motivoBloque}
    <div style="border-left: 4px solid #d97706; background-color: #fef3c7; padding: 14px 18px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
      <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #78350f;">
        Si este pago s&iacute; lo realizaste y no reconoces esta cancelaci&oacute;n, <strong>cont&aacute;ctanos de inmediato</strong>.
      </p>
    </div>
    <p style="margin: 0; font-size: 13px; color: #64748b;">
      Este aviso reemplaza al comprobante anterior con ese folio.
    </p>`;

  return enviarEmail(correo, 'Recibo cancelado — AnunciaYA', plantillaBase(nombre, contenido));
}

// =============================================================================
// EMAIL DE BIENVENIDA (alta manual de negocio en efectivo/transferencia)
// =============================================================================

/**
 * Email: bienvenida al dueño de un negocio dado de alta MANUALMENTE desde el Panel.
 * La cuenta nace SIN contraseña (modelo C): el dueño la define en su primer ingreso usando
 * la opción de crear/recuperar contraseña (código al correo). No incluye credenciales.
 *
 * Incluye el bloque-recibo del PRIMER PAGO (defensa Camino B): el dueño recibe en el mismo
 * correo la constancia de su pago + vigencia, sin un segundo correo.
 */
/** Plantilla (HTML) de la bienvenida del alta manual. Exportada para que el harness la
 *  renderice sin enviar correo. Incluye el bloque-recibo del primer pago. */
export function plantillaBienvenida(
  nombre: string,
  correo: string,
  nombreNegocio: string,
  datosPago: DatosComprobantePago
): string {
  const contenido = `
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
      &iexcl;Tu negocio <strong>&quot;${escape(nombreNegocio)}&quot;</strong> ya est&aacute; dado de alta en AnunciaYA y tu membres&iacute;a est&aacute; activa!
    </p>
    ${bloqueReciboMembresia(datosPago)}
    ${botonDescargaRecibo(datosPago.reciboUrl)}
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
      Para entrar a tu panel necesitas <strong>crear tu contrase&ntilde;a</strong>. Abre AnunciaYA, elige <strong>Iniciar sesi&oacute;n</strong>, escribe este correo (<strong>${correo}</strong>) y usa la opci&oacute;n de <strong>crear / recuperar contrase&ntilde;a</strong>: te enviaremos un c&oacute;digo a este correo para definirla.
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${env.FRONTEND_URL}" target="_blank" rel="noopener" style="display: inline-block; background-color: #034AE3; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 12px 28px; border-radius: 8px;">
        Ir a AnunciaYA
      </a>
    </div>
    <p style="margin: 0; font-size: 13px; color: #64748b;">
      Despu&eacute;s de definir tu contrase&ntilde;a, completa los datos de tu negocio (ubicaci&oacute;n, horarios y fotos) para que aparezca en el directorio.
    </p>`;

  return plantillaBase(nombre, contenido);
}

export async function enviarEmailBienvenida(
  correo: string,
  nombre: string,
  nombreNegocio: string,
  datosPago: DatosComprobantePago
): Promise<ResultadoEmail> {
  return enviarEmail(
    correo,
    'Tu negocio ya está en AnunciaYA',
    plantillaBienvenida(nombre, correo, nombreNegocio, datosPago)
  );
}

/**
 * Datos del trial para el correo de bienvenida del auto-registro (sin cobro hoy).
 * `finTrialIso` = fecha del primer cobro (fin del trial); `montoCentavos`+`intervalo`
 * = lo que se cobrará al terminar la prueba. Cualquiera puede venir nulo (si no se
 * pudo leer la suscripción de Stripe) → la plantilla cae a un texto genérico seguro.
 */
export interface DatosBienvenidaTrial {
  finTrialIso: string | null;
  montoCentavos: number | null;
  intervalo: 'month' | 'year' | null;
}

/** Plantilla (HTML) de la bienvenida del auto-registro CON trial: cálida arriba,
 *  clara abajo (no se cobró nada + fecha del primer cobro + cómo cancelar). */
export function plantillaBienvenidaTrial(
  nombre: string,
  nombreNegocio: string,
  datos: DatosBienvenidaTrial
): string {
  const fechaFmt = datos.finTrialIso
    ? new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(datos.finTrialIso))
    : '';
  const montoFmt = datos.montoCentavos && datos.montoCentavos > 0
    ? `${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(datos.montoCentavos / 100)} ${datos.intervalo === 'year' ? 'al año' : 'al mes'}`
    : '';

  // Línea del primer cobro: si tenemos fecha y monto, la mostramos exacta; si no, texto genérico seguro.
  const lineaCobro = (fechaFmt && montoFmt)
    ? `Tu primer cobro de <strong>${escape(montoFmt)}</strong> ser&aacute; el <strong>${escape(fechaFmt)}</strong>.`
    : (fechaFmt
        ? `Tu primer cobro ser&aacute; el <strong>${escape(fechaFmt)}</strong>.`
        : `Te avisaremos por correo antes de tu primer cobro.`);

  const contenido = `
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
      &iexcl;Tu negocio <strong>&quot;${escape(nombreNegocio)}&quot;</strong> ya est&aacute; dado de alta en AnunciaYA! Activamos tu <strong>prueba gratis</strong> para que explores todo sin compromiso.
    </p>
    <div style="background: #F0F7FF; border: 1px solid #DBEAFE; border-radius: 10px; padding: 16px 18px; margin: 0 0 18px;">
      <p style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: #034AE3;">
        Hoy no se te cobr&oacute; nada
      </p>
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #334155;">
        ${lineaCobro} Si decides no continuar, puedes cancelar antes de esa fecha desde <strong>Mi Perfil &rarr; Membres&iacute;a y Pagos</strong>, sin ning&uacute;n cargo.
      </p>
    </div>
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
      Mientras tanto, completa los datos de tu negocio (ubicaci&oacute;n, horarios y fotos) para que aparezca en el directorio y empiecen a llegarte clientes.
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${env.FRONTEND_URL}/business/onboarding" target="_blank" rel="noopener" style="display: inline-block; background-color: #034AE3; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 12px 28px; border-radius: 8px;">
        Completar mi negocio
      </a>
    </div>`;

  return plantillaBase(nombre, contenido);
}

export async function enviarEmailBienvenidaTrial(
  correo: string,
  nombre: string,
  nombreNegocio: string,
  datos: DatosBienvenidaTrial
): Promise<ResultadoEmail> {
  return enviarEmail(
    correo,
    'Tu prueba gratis en AnunciaYA ya empezó',
    plantillaBienvenidaTrial(nombre, nombreNegocio, datos)
  );
}

// =============================================================================
// VERIFICAR CONEXIÓN
// =============================================================================

/**
 * Verifica que la conexión de email funcione correctamente
 */
export async function verificarConexionSMTP(): Promise<boolean> {
  if (useAwsSes && sesClient) {
    console.log('✅ AWS SES SDK configurado correctamente');
    return true;
  }

  if (transporter) {
    try {
      await transporter.verify();
      console.log('✅ Conexión SMTP verificada correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error al verificar conexión SMTP:', error);
      return false;
    }
  }

  console.warn('⚠️ No hay proveedor de email configurado');
  return false;
}