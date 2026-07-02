/**
 * PaginaAvisoPrivacidad.tsx
 * =========================
 * Página pública del Aviso de Privacidad (LFPDPPP). Accesible sin sesión en
 * `/privacidad`. Enlazada desde el checkbox de registro y el footer público.
 *
 * El contenido es el borrador aprobado en `docs/legal/Aviso_de_Privacidad.md`.
 * Ubicación: apps/web/src/pages/public/PaginaAvisoPrivacidad.tsx
 */

import { Link } from 'react-router-dom';
import { LayoutPublico } from '../../components/layout/LayoutPublico';

const H2 = 'text-lg lg:text-xl font-bold text-slate-800 mt-8 mb-3';
const H3 = 'text-base lg:text-lg font-semibold text-slate-800 mt-5 mb-2';
const P = 'text-[15px] text-slate-600 leading-relaxed mb-4';
const UL = 'list-disc pl-5 space-y-2 text-[15px] text-slate-600 leading-relaxed mb-4';

export default function PaginaAvisoPrivacidad() {
  return (
    <LayoutPublico>
      <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8 2xl:p-10">
        <h1 className="text-2xl font-bold text-slate-800 lg:text-3xl">Aviso de Privacidad</h1>
        <p className="mt-1 text-sm text-slate-500">Última actualización: 1 de julio de 2026</p>

        <h2 className={H2}>1. Identidad y domicilio del responsable</h2>
        <p className={P}>
          <strong>Juan Manuel Valenzuela Jabalera</strong> (persona física), en lo sucesivo{' '}
          <strong>"AnunciaYA"</strong>, con domicilio en <strong>Av. Sinaloa No. 27, entre De las
          Rosas y Magnolias, Col. Centro, C.P. 83550, Puerto Peñasco, Sonora, México</strong>, es el
          responsable del tratamiento de tus datos personales conforme a la Ley Federal de Protección
          de Datos Personales en Posesión de los Particulares (LFPDPPP), su Reglamento y demás
          normativa aplicable.
        </p>
        <p className={P}>
          Correo de contacto en materia de privacidad: <strong>admin@anunciaya.mx</strong>
        </p>

        <h2 className={H2}>2. Datos personales que recabamos</h2>
        <p className={P}>Para prestar nuestros servicios podemos recabar las siguientes categorías de datos:</p>
        <ul className={UL}>
          <li><strong>De identificación:</strong> nombre, apellidos, fecha de nacimiento, género y fotografía/avatar (si decides subirla).</li>
          <li><strong>De contacto:</strong> correo electrónico, número de teléfono y ciudad.</li>
          <li><strong>De tu negocio</strong> (si eres comerciante): nombre comercial, domicilio del establecimiento, giro, sucursales, horarios, imágenes y descripción.</li>
          <li><strong>De ubicación/geolocalización:</strong> para mostrarte comercios, productos y servicios cercanos (función hiperlocal). Se usa solo mientras utilizas la app y puedes desactivarla desde los permisos de tu dispositivo.</li>
          <li><strong>De uso y operación:</strong> publicaciones, mensajes en el chat, reseñas, transacciones, puntos de lealtad y actividad dentro de la plataforma.</li>
          <li><strong>De pago:</strong> los pagos con tarjeta se procesan directamente a través de nuestro proveedor Stripe; <strong>AnunciaYA no almacena los números completos de tu tarjeta</strong>. En pagos manuales podemos recibir el comprobante que tú nos envías.</li>
          <li><strong>Técnicos:</strong> dirección IP, tipo de dispositivo, identificadores y datos de sesión (incluidas cookies o tecnologías similares).</li>
        </ul>
        <p className={P}>
          <strong>No recabamos datos personales sensibles</strong> (como origen racial, estado de
          salud, creencias religiosas, preferencias sexuales o afiliación política). AnunciaYA está
          dirigida a personas <strong>mayores de 18 años</strong>; no recabamos intencionalmente datos
          de menores.
        </p>

        <h2 className={H2}>3. Finalidades del tratamiento</h2>
        <h3 className={H3}>Finalidades primarias (necesarias para el servicio)</h3>
        <ul className={UL}>
          <li>Crear, autenticar y administrar tu cuenta.</li>
          <li>Operar las funciones de la plataforma (publicar, buscar, chatear, ScanYA, CardYA, ofertas y servicios).</li>
          <li>Mostrarte contenido cercano mediante geolocalización.</li>
          <li>Procesar el cobro de la membresía comercial y llevar el control de pagos (solo comerciantes).</li>
          <li>Enviarte comunicaciones transaccionales: verificación de cuenta, códigos de seguridad (2FA), recibos y notificaciones operativas.</li>
          <li>Prevenir fraudes, abusos y garantizar la seguridad de la plataforma.</li>
          <li>Cumplir obligaciones legales, fiscales y contractuales.</li>
        </ul>
        <p className="mb-4 rounded-r-lg border-l-4 border-blue-300 bg-blue-50 p-4 text-[15px] leading-relaxed text-slate-700">
          <strong>El tratamiento para las finalidades primarias es indispensable.</strong> Los datos
          marcados como obligatorios en nuestros formularios son necesarios para crear tu cuenta y
          prestarte el servicio; si decides no proporcionarlos, no podremos registrarte ni atender tu
          solicitud. No es posible oponerse a estas finalidades y, al mismo tiempo, seguir usando la
          Plataforma.
        </p>
        <h3 className={H3}>Finalidades secundarias (no necesarias)</h3>
        <ul className={UL}>
          <li>Elaborar estadísticas y análisis internos para mejorar el servicio.</li>
        </ul>
        <p className={P}>
          Estas finalidades secundarias <strong>no son necesarias</strong> para prestarte el servicio.
          Si no deseas que tus datos se traten para ellas, puedes manifestarlo enviando un correo a{' '}
          <strong>admin@anunciaya.mx</strong>. <strong>Negarte a estas finalidades secundarias no
          afectará</strong> la prestación de los servicios ni el uso de tu cuenta.
        </p>

        <h2 className={H2}>4. Medios para limitar el uso o divulgación de tus datos</h2>
        <p className={P}>Puedes limitar el uso o divulgación de tus datos de las siguientes maneras:</p>
        <ul className={UL}>
          <li>Enviando una solicitud a <strong>admin@anunciaya.mx</strong> para limitar, cancelar u oponerte al tratamiento (derechos ARCO, ver sección 5).</li>
          <li>Ajustando los <strong>permisos de tu dispositivo</strong> (por ejemplo, desactivando el acceso a tu ubicación).</li>
          <li><strong>Absteniéndote de publicar</strong> información que no desees hacer visible: las publicaciones, reseñas y datos de tu negocio que decides compartir son, por su naturaleza, visibles para otros usuarios.</li>
          <li>Solicitando la <strong>eliminación de tu cuenta</strong>.</li>
        </ul>

        <h2 className={H2}>5. Derechos ARCO</h2>
        <p className={P}>
          Tienes derecho a <strong>Acceder</strong> a tus datos, <strong>Rectificarlos</strong> cuando
          sean inexactos, <strong>Cancelarlos</strong> cuando consideres que no se requieren, y{' '}
          <strong>Oponerte</strong> a su tratamiento (derechos ARCO), así como a revocar tu
          consentimiento. Para ejercerlos, envía tu solicitud a <strong>admin@anunciaya.mx</strong>{' '}
          indicando:
        </p>
        <ul className={UL}>
          <li>Tu nombre completo y un medio para contactarte.</li>
          <li>Copia de una identificación oficial que acredite tu identidad.</li>
          <li>La descripción clara de los datos y del derecho que deseas ejercer.</li>
        </ul>
        <p className={P}>
          Responderemos en los plazos que marca la LFPDPPP (en general, 20 días hábiles para dar
          respuesta y 15 días hábiles para hacerla efectiva, prorrogables conforme a la ley).
        </p>

        <h2 className={H2}>6. Transferencias y remisiones de datos</h2>
        <p className={P}>
          Para operar, compartimos datos con <strong>prestadores de servicios (encargados)</strong> que
          los tratan por cuenta de AnunciaYA y bajo confidencialidad, algunos ubicados en el extranjero:
        </p>
        <ul className={UL}>
          <li><strong>Stripe</strong> — procesamiento de pagos.</li>
          <li><strong>Google</strong> — inicio de sesión (OAuth) y el asistente Coyo (IA).</li>
          <li><strong>Amazon Web Services (SES)</strong> — envío de correos.</li>
          <li><strong>Cloudflare (R2)</strong> — almacenamiento de imágenes y archivos.</li>
          <li><strong>Upstash / Supabase</strong> — infraestructura de datos.</li>
        </ul>
        <p className={P}>
          Estas remisiones son necesarias para prestarte el servicio y no requieren tu consentimiento
          conforme al art. 37 de la LFPDPPP. <strong>AnunciaYA no vende ni renta tus datos
          personales.</strong> No realizamos transferencias a terceros con fines distintos a los aquí
          descritos sin tu consentimiento, salvo las excepciones previstas por la ley.
        </p>

        <h2 className={H2}>7. Uso de cookies y tecnologías similares</h2>
        <p className={P}>
          Utilizamos cookies e identificadores para mantener tu sesión, recordar preferencias y mejorar
          el funcionamiento de la plataforma. Puedes deshabilitarlas desde tu navegador, aunque algunas
          funciones podrían dejar de operar correctamente.
        </p>

        <h2 className={H2}>8. Cambios al aviso de privacidad</h2>
        <p className={P}>
          Podemos actualizar este aviso por cambios legales, en nuestros servicios o en nuestras
          prácticas. Publicaremos la versión vigente en <strong>https://anunciaya.mx</strong> con su
          fecha de actualización. Te recomendamos revisarlo periódicamente.
        </p>

        <p className="mt-8 border-t border-slate-200 pt-4 text-sm text-slate-500">
          Consulta también nuestros{' '}
          <Link to="/terminos" className="font-semibold text-blue-700 hover:underline">
            Términos y Condiciones
          </Link>
          . Al utilizar AnunciaYA, reconoces haber leído y entendido este Aviso de Privacidad.
        </p>
      </div>
    </LayoutPublico>
  );
}
