/**
 * PaginaTerminos.tsx
 * ==================
 * Página pública de los Términos y Condiciones. Accesible sin sesión en
 * `/terminos`. Enlazada desde el checkbox de registro y el footer público.
 *
 * El contenido es el borrador aprobado en `docs/legal/Terminos_y_Condiciones.md`.
 * Ubicación: apps/web/src/pages/public/PaginaTerminos.tsx
 */

import { Link } from 'react-router-dom';
import { LayoutPublico } from '../../components/layout/LayoutPublico';

const H2 = 'text-lg lg:text-xl font-bold text-slate-800 mt-8 mb-3';
const P = 'text-[15px] text-slate-600 leading-relaxed mb-4';
const UL = 'list-disc pl-5 space-y-2 text-[15px] text-slate-600 leading-relaxed mb-4';

export default function PaginaTerminos() {
  return (
    <LayoutPublico>
      <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8 2xl:p-10">
        <h1 className="text-2xl font-bold text-slate-800 lg:text-3xl">Términos y Condiciones de Uso</h1>
        <p className="mt-1 text-sm text-slate-500">Última actualización: 1 de julio de 2026</p>

        <h2 className={H2}>1. Titular y aceptación</h2>
        <p className={P}>
          Estos Términos y Condiciones (los "Términos") regulan el uso de la plataforma{' '}
          <strong>AnunciaYA</strong> (la "Plataforma"), operada por{' '}
          <strong>Juan Manuel Valenzuela Jabalera</strong> (persona física), con domicilio en Av.
          Sinaloa No. 27, Col. Centro, C.P. 83550, Puerto Peñasco, Sonora, México ("AnunciaYA",
          "nosotros").
        </p>
        <p className={P}>
          Al registrarte o utilizar la Plataforma, aceptas estos Términos y nuestro{' '}
          <Link to="/privacidad" className="font-semibold text-blue-700 hover:underline">
            Aviso de Privacidad
          </Link>
          . Si no estás de acuerdo, no utilices la Plataforma.
        </p>

        <h2 className={H2}>2. Definiciones</h2>
        <ul className={UL}>
          <li><strong>Usuario:</strong> cualquier persona que utiliza la Plataforma.</li>
          <li><strong>Comerciante:</strong> usuario que registra un negocio y/o contrata la membresía comercial.</li>
          <li><strong>Contenido:</strong> publicaciones, imágenes, textos, mensajes, reseñas y cualquier material que los usuarios suban a la Plataforma.</li>
        </ul>

        <h2 className={H2}>3. Objeto y naturaleza del servicio</h2>
        <p className={P}>
          AnunciaYA es una plataforma de comercio local hiperlocal que conecta a usuarios con comercios,
          productos y servicios de su ciudad, y ofrece herramientas de descubrimiento, contacto y
          lealtad.
        </p>
        <p className={P}>
          <strong>AnunciaYA actúa como intermediario tecnológico.</strong> No es parte, vendedor ni
          comprador en las operaciones que los usuarios realicen entre sí (por ejemplo, en MarketPlace o
          Servicios). Las negociaciones, pagos, entregas y acuerdos entre usuarios son de su exclusiva
          responsabilidad.
        </p>

        <h2 className={H2}>4. Registro y cuenta</h2>
        <ul className={UL}>
          <li>Debes ser <strong>mayor de 18 años</strong> y proporcionar información veraz y actualizada.</li>
          <li>Eres responsable de la confidencialidad de tus credenciales y de toda actividad realizada desde tu cuenta.</li>
          <li>Podemos suspender o cancelar cuentas con información falsa, uso indebido o incumplimiento de estos Términos.</li>
        </ul>

        <h2 className={H2}>5. Uso permitido y conducta prohibida</h2>
        <p className={P}>Te comprometes a usar la Plataforma conforme a la ley. Queda prohibido, de forma enunciativa:</p>
        <ul className={UL}>
          <li>Publicar contenido ilícito, fraudulento, ofensivo, difamatorio o que infrinja derechos de terceros.</li>
          <li>Ofrecer productos o servicios prohibidos por la ley.</li>
          <li>Suplantar identidades, manipular reseñas o engañar a otros usuarios.</li>
          <li>Vulnerar la seguridad de la Plataforma, extraer datos de forma automatizada (scraping) o interferir con su funcionamiento.</li>
          <li>Usar la Plataforma para spam o fines distintos a los previstos.</li>
        </ul>

        <h2 className={H2}>6. Contenido del usuario</h2>
        <ul className={UL}>
          <li>Eres el único responsable del Contenido que publicas y garantizas que tienes los derechos para hacerlo.</li>
          <li>Nos otorgas una licencia no exclusiva y gratuita para alojar y mostrar tu Contenido dentro de la Plataforma con el fin de prestar el servicio.</li>
          <li>Podemos <strong>moderar, ocultar o eliminar</strong> Contenido que incumpla estos Términos o la ley, sin previo aviso cuando sea necesario.</li>
        </ul>

        <h2 className={H2}>7. Operaciones entre usuarios</h2>
        <p className={P}>
          En las secciones de compra-venta entre particulares (MarketPlace) y de servicios,{' '}
          <strong>AnunciaYA solo facilita el contacto</strong>. No garantizamos la calidad, legalidad,
          seguridad ni la conclusión de las operaciones, ni asumimos responsabilidad por incumplimientos
          entre las partes. Te recomendamos tomar precauciones razonables al contactar o transaccionar
          con terceros.
        </p>

        <h2 className={H2}>8. Membresía comercial y pagos</h2>
        <ul className={UL}>
          <li>El acceso a la Plataforma para usuarios es <strong>gratuito</strong>. Los comerciantes pueden contratar una membresía comercial de pago recurrente.</li>
          <li>El <strong>precio vigente</strong> (con IVA incluido) se muestra en la Plataforma al momento de contratar. Los pagos con tarjeta se procesan mediante Stripe; también se admite pago manual (transferencia/depósito con comprobante).</li>
          <li><strong>Renovación automática:</strong> la membresía con tarjeta se renueva automáticamente al final de cada periodo, al precio vigente, hasta que la canceles.</li>
          <li><strong>Cancelación:</strong> puedes cancelar la renovación en cualquier momento desde tu perfil o el panel comercial; conservarás el acceso hasta el final del periodo ya pagado.</li>
          <li><strong>Falta de pago:</strong> si un cobro falla, otorgamos un periodo de gracia antes de suspender las funciones comerciales.</li>
          <li><strong>Reembolsos:</strong> los cobros de membresía no son reembolsables, salvo lo que exija la ley aplicable o los casos que AnunciaYA determine a su criterio (por ejemplo, cobros duplicados o errores).</li>
          <li>Los precios pueden modificarse; cualquier cambio aplicará al siguiente periodo y se te informará con antelación razonable.</li>
        </ul>

        <h2 className={H2}>9. Propiedad intelectual</h2>
        <p className={P}>
          La Plataforma, su marca, logotipos, diseño y software son propiedad de AnunciaYA o de sus
          licenciantes y están protegidos por la ley. No adquieres ningún derecho sobre ellos por el uso
          de la Plataforma.
        </p>

        <h2 className={H2}>10. Privacidad</h2>
        <p className={P}>
          El tratamiento de tus datos personales se rige por nuestro{' '}
          <Link to="/privacidad" className="font-semibold text-blue-700 hover:underline">
            Aviso de Privacidad
          </Link>
          , que forma parte integral de estos Términos.
        </p>

        <h2 className={H2}>11. Disponibilidad y limitación de responsabilidad</h2>
        <ul className={UL}>
          <li>La Plataforma se ofrece <strong>"tal cual"</strong>. Procuramos su disponibilidad y buen funcionamiento, pero no garantizamos que sea ininterrumpida o libre de errores.</li>
          <li>En la medida que permita la ley, AnunciaYA no será responsable por daños indirectos, pérdida de datos, lucro cesante ni por las operaciones, contenidos o conductas de terceros usuarios.</li>
          <li>Nada en estos Términos limita los derechos que la legislación de protección al consumidor te otorgue de forma irrenunciable.</li>
        </ul>

        <h2 className={H2}>12. Suspensión y terminación</h2>
        <p className={P}>
          Podemos suspender o cancelar tu acceso si incumples estos Términos o la ley. Tú puedes dejar de
          usar la Plataforma y solicitar la eliminación de tu cuenta en cualquier momento.
        </p>

        <h2 className={H2}>13. Modificaciones</h2>
        <p className={P}>
          Podemos actualizar estos Términos. La versión vigente se publicará en{' '}
          <strong>https://anunciaya.mx</strong> con su fecha. El uso continuado de la Plataforma tras un
          cambio implica su aceptación.
        </p>

        <h2 className={H2}>14. Legislación aplicable y jurisdicción</h2>
        <p className={P}>
          Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Para consumidores,
          resulta competente la Procuraduría Federal del Consumidor (PROFECO) en la vía administrativa.
          Para cualquier controversia, las partes se someten a los tribunales competentes de Puerto
          Peñasco, Sonora, salvo el derecho irrenunciable del consumidor de acudir a los de su domicilio.
        </p>

        <h2 className={H2}>15. Contacto</h2>
        <p className={P}>
          Dudas o aclaraciones sobre estos Términos: <strong>admin@anunciaya.mx</strong>
        </p>

        <p className="mt-8 border-t border-slate-200 pt-4 text-sm text-slate-500">
          Al utilizar AnunciaYA, reconoces haber leído, entendido y aceptado estos Términos y
          Condiciones.
        </p>
      </div>
    </LayoutPublico>
  );
}
