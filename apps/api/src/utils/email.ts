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
const EMAIL_FROM = env.EMAIL_FROM || 'AnunciaYA <admin@anunciaya.online>';

// =============================================================================
// PLANTILLAS DE EMAIL
// =============================================================================

/**
 * Genera el HTML para el email de verificación
 * @param nombre - Nombre del usuario para personalizar
 * @param codigo - Código de 6 dígitos
 */
function plantillaVerificacion(nombre: string, codigo: string): string {
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
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #3b82f6;">
                🚀 AnunciaYA
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">
                ¡Hola ${nombre}!
              </h2>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
                Gracias por registrarte en AnunciaYA. Para completar tu registro, usa el siguiente código de verificación:
              </p>
              
              <!-- Código -->
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <div style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #3b82f6;">
                  ${codigo}
                </div>
                <p style="margin: 12px 0 0; font-size: 13px; color: #71717a;">
                  Expira en 15 minutos
                </p>
              </div>
              
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                Si no solicitaste este código, puedes ignorar este mensaje de forma segura.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                © ${new Date().getFullYear()} AnunciaYA - Comercio Local en México
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Genera el HTML para el email de recuperación de contraseña
 * @param nombre - Nombre del usuario para personalizar
 * @param codigo - Código de 6 dígitos
 */
function plantillaRecuperacion(nombre: string, codigo: string): string {
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
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #3b82f6;">
                🚀 AnunciaYA
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">
                ¡Hola ${nombre}!
              </h2>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa el siguiente código:
              </p>
              
              <!-- Código -->
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px; border: 1px solid #fcd34d;">
                <div style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #d97706;">
                  ${codigo}
                </div>
                <p style="margin: 12px 0 0; font-size: 13px; color: #92400e;">
                  ⏱️ Expira en 15 minutos
                </p>
              </div>
              
              <div style="background-color: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid #fecaca;">
                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #991b1b;">
                  <strong>⚠️ Importante:</strong> Si no solicitaste este cambio, ignora este mensaje y tu contraseña seguirá siendo la misma.
                </p>
              </div>
              
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                Por seguridad, nunca compartas este código con nadie.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                © ${new Date().getFullYear()} AnunciaYA - Comercio Local en México
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
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
 * Extrae solo el email de un string tipo "Nombre <email@ejemplo.com>"
 */
function extraerEmail(from: string): string {
  const match = from.match(/<(.+)>/);
  return match ? match[1] : from;
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