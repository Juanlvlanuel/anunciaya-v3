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

// URL pública del logo de AnunciaYA en R2 (para incluir en emails).
// Usar URL pública (no base64) porque Gmail bloquea data: URIs desde 2013.
const LOGO_URL = 'https://pub-e2d7b5cee341434dbe2884e04b368108.r2.dev/brand/anunciaya-logo2.png';

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
            <td style="padding: 20px 32px; text-align: center; background: linear-gradient(135deg, #02143D 10%, #001E70 50%, #034AE3 100%);">
              <a href="${env.FRONTEND_URL}" target="_blank" rel="noopener" style="display: inline-block; text-decoration: none; border: 0;">
                <img src="${LOGO_URL}" alt="AnunciaYA" width="180" style="display: inline-block; max-width: 180px; height: auto; border: 0;" />
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