/**
 * EscenarioTombola3D.tsx
 * ===================
 * Escenario 3D real (Three.js vía @react-three/fiber) de la tómbola —
 * reemplaza el escenario CSS/SVG en escritorio: jaula poliédrica tipo
 * geodésica (aristas de un icosaedro) SOSTENIDA por 2 postes laterales,
 * pegados casi al borde de la jaula (como los soportes de una tómbola de
 * lotería real) — la jaula gira sobre ese eje imaginario entre los 2
 * postes, que quedan fijos.
 *
 * Bolas decorativas numeradas (textura de canvas, no `<Text>` de drei):
 * en reposo (`girando=false`) quedan amontonadas abajo, como si la
 * gravedad las hubiera asentado; al empezar a girar se reparten por todo
 * el volumen de la jaula con un ligero "hervor" (`useFrame`, lerp +
 * oscilación por bola) para que se sientan tumbando, no rígidas con la
 * jaula. Sin física real — movimiento decorativo, no simulación.
 *
 * Un conducto curvo (más pronunciado que un simple diagonal — S visible
 * en 3 ejes) sale por la parte BAJA de la jaula por el que viaja la bola
 * activa (dorada, emisiva) hasta una copa receptora (`LatheGeometry`, con
 * perspectiva real de cuenco — no un disco plano) donde cae.
 *
 * Solo dibuja el espectáculo AMBIENTAL — el resultado legible (número,
 * "Lugar N"/"No ganó", trofeo) se queda en HTML/CSS en `TombolaSorteo.tsx`;
 * los números de las bolas decorativas son de adorno (no representan
 * boletos reales), no se renderiza el resultado real dentro del canvas.
 *
 * Sin drei (los números de las bolas usan `CanvasTexture`, no `<Text>` —
 * evita esa dependencia; tampoco hace falta control de cámara, la escena
 * no es interactiva), sin HDRI/Environment (nada de fetch de assets en
 * runtime, mismo criterio que `SISTEMA_ICONOS.md`), sin post-processing
 * (el brillo se logra con material emisivo + drop-shadow CSS).
 *
 * Se monta vía lazy-load (mismo diseño en escritorio y móvil) — ver
 * `TombolaSorteo.tsx`.
 *
 * Ubicación: apps/web/src/components/dinamicas/sala/EscenarioTombola3D.tsx
 */

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Paleta de bolas decorativas — colores variados, como un set real de
// tómbola, no todo ámbar. El dorado queda reservado para la bola activa.
// Los "números de boleto" son de adorno (visual, no datos reales) —
// generados (no a mano) para poder tener muchas sin repetir código.
const PALETA_BOLAS = ['#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6'];
const NUMERO_BOLAS_DECORATIVAS = 24;
const BOLAS_DECORATIVAS = Array.from({ length: NUMERO_BOLAS_DECORATIVAS }, (_, i) => ({
    color: PALETA_BOLAS[i % PALETA_BOLAS.length],
    // `i*7 mod 99` da 99 residuos únicos (7 y 99 son coprimos) — números
    // sin repetir y sin verse correlativos (no 1,2,3,4...).
    numero: ((i * 7 + 3) % 99) + 1,
}));

interface EscenarioTombola3DProps {
    numeroIntentoActual: number | null;
    girando: boolean;
}

// Curva del conducto — sale por la parte BAJA-frontal de la jaula (radio 1)
// con una curva pronunciada en 3 ejes (no un simple diagonal) para que se
// alcance a ver el recorrido completo de la bola por el tubo, como un
// tobogán real. Se mantiene lejos de los postes laterales (x≈±1.03).
const CURVA_TUBO = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.05, -0.7, 0.6),
    new THREE.Vector3(0.65, -0.8, 1.0),
    new THREE.Vector3(0.85, -1.05, 0.5),
    new THREE.Vector3(0.6, -1.3, 0.2),
    new THREE.Vector3(0.45, -1.55, 0.3),
]);

const RADIO_JAULA = 1;
// Casi pegados a la jaula (radio 1) — que se lea como los soportes reales
// de la tómbola, no como un marco separado alrededor de ella.
const X_SOPORTE = 1.03;
const RADIO_BOLA = 0.2;
const RADIO_BOLA_ACTIVA = 0.19;

/** Etiqueta con el número — se usa como `<sprite>` (billboard: siempre
 *  mira a la cámara, sin importar cómo rote la jaula o la bola) en vez de
 *  pintarse sobre la esfera misma. Pintado sobre la esfera solo se vería
 *  desde el ángulo en el que quedó esa cara al girar; el sprite garantiza
 *  que el número SIEMPRE esté visible. Círculo blanco de fondo para que
 *  el número se lea claro contra cualquier color de bola. */
function crearEtiquetaNumero(numero: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 96, 96);
    ctx.beginPath();
    ctx.arc(48, 48, 40, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(numero), 48, 50);
    const textura = new THREE.CanvasTexture(canvas);
    textura.needsUpdate = true;
    return textura;
}

function Jaula({ girando }: { girando: boolean }) {
    const grupoRef = useRef<THREE.Group>(null);
    const geometriaBase = useMemo(() => new THREE.IcosahedronGeometry(RADIO_JAULA, 1), []);
    const aristas = useMemo(() => new THREE.EdgesGeometry(geometriaBase), [geometriaBase]);
    const etiquetas = useMemo(() => BOLAS_DECORATIVAS.map((b) => crearEtiquetaNumero(b.numero)), []);

    // 2 configuraciones de posición por bola: "en reposo" (amontonadas
    // abajo, como si la gravedad las asentara cuando la tómbola no se
    // mueve) y "girando" (repartidas por todo el volumen). En reposo se
    // apilan en capas — cada capa es un anillo cuyo radio queda acotado
    // por la sección transversal REAL de la jaula (esfera, radio 1) a esa
    // altura, así nunca se salen del alambre por más bolas que haya.
    const posicionesReposo = useMemo(() => {
        const espaciado = RADIO_BOLA * 1.9;
        const posiciones: THREE.Vector3[] = [];
        let capa = 0;
        while (posiciones.length < BOLAS_DECORATIVAS.length) {
            const y = -0.95 + capa * espaciado * 0.82;
            const radioJaulaAquí = Math.sqrt(Math.max(0, 1 - y * y));
            const radioCapa = Math.min(radioJaulaAquí - RADIO_BOLA * 1.6, 0.1 + capa * espaciado * 0.95);
            const circunferencia = 2 * Math.PI * Math.max(radioCapa, 0.001);
            const porCapa = capa === 0 ? 1 : Math.max(1, Math.min(BOLAS_DECORATIVAS.length - posiciones.length, Math.floor(circunferencia / espaciado)));
            for (let i = 0; i < porCapa && posiciones.length < BOLAS_DECORATIVAS.length; i++) {
                const angulo = (i / porCapa) * Math.PI * 2 + capa * 0.7;
                // El jitter es chico y solo en Y — un jitter grande podía
                // mover la bola a una altura donde el corte real de la
                // esfera es más angosto que el radio calculado para su capa
                // nominal, empujándola fuera del alambre (bola "escapando").
                const jitterY = (Math.random() - 0.5) * espaciado * 0.12;
                posiciones.push(new THREE.Vector3(Math.cos(angulo) * radioCapa, y + jitterY, Math.sin(angulo) * radioCapa));
            }
            capa++;
            if (capa > 20) break; // salvaguarda — no debería hacer falta
        }
        return posiciones;
    }, []);
    const posicionesGirando = useMemo(
        () =>
            BOLAS_DECORATIVAS.map((_, i) => {
                const fi = Math.acos(-1 + (2 * i) / BOLAS_DECORATIVAS.length);
                const theta = Math.sqrt(BOLAS_DECORATIVAS.length * Math.PI) * fi;
                return new THREE.Vector3(0.62 * Math.cos(theta) * Math.sin(fi), 0.62 * Math.sin(theta) * Math.sin(fi), 0.62 * Math.cos(fi));
            }),
        [],
    );
    const bolasRefs = useRef<(THREE.Group | null)[]>([]);

    // Gira principalmente sobre el eje X — el mismo eje que conecta los 2
    // soportes laterales, para que se lea como "sostenida y girando sobre
    // ese eje" (tipo rotisserie), no como un globo girando sobre sí mismo.
    useFrame((estado, delta) => {
        if (girando && grupoRef.current) {
            grupoRef.current.rotation.x += delta * 0.4;
            grupoRef.current.rotation.y += delta * 0.05;
        }
        const t = estado.clock.elapsedTime;
        bolasRefs.current.forEach((grupoBola, i) => {
            if (!grupoBola) return;
            const objetivo = girando ? posicionesGirando[i] : posicionesReposo[i];
            const jitter = girando
                ? new THREE.Vector3(Math.sin(t * 1.3 + i) * 0.05, Math.cos(t * 1.7 + i * 1.3) * 0.05, Math.sin(t * 0.9 + i * 2) * 0.05)
                : undefined;
            const destino = jitter ? objetivo.clone().add(jitter) : objetivo;
            grupoBola.position.lerp(destino, Math.min(delta * 3, 1));
        });
    });

    return (
        <group ref={grupoRef}>
            <lineSegments geometry={aristas}>
                <lineBasicMaterial color="#94a3b8" />
            </lineSegments>
            <mesh geometry={geometriaBase}>
                <meshPhysicalMaterial color="#e2e8f0" transparent opacity={0.06} roughness={0.1} metalness={0.1} />
            </mesh>
            {BOLAS_DECORATIVAS.map((bola, i) => (
                <group key={i} ref={(el) => { bolasRefs.current[i] = el; }} position={posicionesReposo[i]}>
                    <mesh>
                        <sphereGeometry args={[RADIO_BOLA, 20, 20]} />
                        <meshStandardMaterial color={bola.color} roughness={0.35} metalness={0.3} />
                    </mesh>
                    {/* Etiqueta del número — `sprite`, siempre mira a la
                        cámara (billboard). `depthTest={false}` es clave: el
                        sprite vive en el mismo centro que la esfera opaca de
                        la bola, que ya escribió profundidad ahí — sin esto,
                        la prueba de profundidad lo tapaba con su PROPIA bola
                        y el número nunca se veía. */}
                    <sprite scale={[RADIO_BOLA * 1.15, RADIO_BOLA * 1.15, 1]} renderOrder={999}>
                        <spriteMaterial map={etiquetas[i]} transparent depthWrite={false} depthTest={false} />
                    </sprite>
                </group>
            ))}
        </group>
    );
}

/** Estructura fija (no gira) — solo los 2 postes laterales, pegados casi al
 *  borde de la jaula, sin eje horizontal visible entre ellos (la jaula gira
 *  sobre ese eje igual, solo que ya no se dibuja la varilla). */
function EstructuraSoporte() {
    const alturaPoste = 1.3;
    return (
        <group>
            {[-X_SOPORTE, X_SOPORTE].map((x) => (
                // El poste cuelga hacia abajo desde el eje (y=0): su tope
                // queda exactamente en el eje, nada sobresale por encima.
                <group key={x} position={[x, -alturaPoste / 2, 0]}>
                    <mesh>
                        <cylinderGeometry args={[0.05, 0.05, alturaPoste, 16]} />
                        <meshStandardMaterial color="#94a3b8" roughness={0.35} metalness={0.55} />
                    </mesh>
                    {/* Base pequeña del poste — plantado, sin ser una plataforma grande. */}
                    <mesh position={[0, -alturaPoste / 2 - 0.02, 0]}>
                        <cylinderGeometry args={[0.16, 0.18, 0.06, 16]} />
                        <meshStandardMaterial color="#cbd5e1" roughness={0.4} metalness={0.5} />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

/** Placa de aterrizaje — un pad circular con aro luminoso sobre un
 *  pedestal corto, en vez de un cuenco: un "cuenco" (perfil revolucionado
 *  con profundidad) se leía como un plato de mascota. Un pad iluminado es
 *  más "tecnológico/premium" y no depende de que la cámara lo vea desde
 *  el ángulo correcto para leerse bien. */
function PlacaAterrizaje({ posicion }: { posicion: THREE.Vector3 }) {
    return (
        <group position={posicion}>
            <mesh position={[0, -0.12, 0]}>
                <cylinderGeometry args={[0.07, 0.09, 0.18, 16]} />
                <meshStandardMaterial color="#94a3b8" roughness={0.45} metalness={0.35} />
            </mesh>
            <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.28, 28]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.4} metalness={0.35} />
            </mesh>
            <mesh position={[0, -0.018, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.25, 0.015, 12, 32]} />
                <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.7} roughness={0.3} metalness={0.2} />
            </mesh>
        </group>
    );
}

/** Conducto — riel metálico pulido (cromado) por el que viaja la bola
 *  activa. Antes era un intento de tubo de vidrio: sin reflejos de
 *  ambiente (a propósito, sin HDRI — ver comentario del archivo) el
 *  "vidrio" se leía plano y gris, no transparente. El metal SÍ se ve bien
 *  con solo las luces de la escena (no depende de reflejos de entorno). */
function Conducto() {
    const puntoFinal = useMemo(() => CURVA_TUBO.getPointAt(1), []);
    return <PlacaAterrizaje posicion={new THREE.Vector3(puntoFinal.x, puntoFinal.y - 0.08, puntoFinal.z)} />;
}

const NUM_ESTELA = 6;

/** Bola activa — dorada, viaja por `CURVA_TUBO` en ~900ms cuando cambia
 *  `numeroIntentoActual`, con una estela de bolitas que se achican y se
 *  desvanecen detrás (como un cometa) para que se note el recorrido
 *  completo SIN un tubo físico — un tubo metálico/vidrio sin reflejos de
 *  ambiente se veía mal (negro o plano); la estela usa `meshBasicMaterial`
 *  (sin luz, color siempre exacto), así nunca puede salir mal. Interpolación
 *  manual dentro de `useFrame`, sin librería de springs. */
function BolaActiva({ numeroIntentoActual }: { numeroIntentoActual: number | null }) {
    const refPrincipal = useRef<THREE.Mesh>(null);
    const refsEstela = useRef<(THREE.Mesh | null)[]>([]);
    const inicioRef = useRef<number | null>(null);
    const DURACION_MS = 900;

    useEffect(() => {
        if (numeroIntentoActual !== null) inicioRef.current = performance.now();
    }, [numeroIntentoActual]);

    useFrame(() => {
        const ocultarTodo = () => {
            if (refPrincipal.current) refPrincipal.current.visible = false;
            refsEstela.current.forEach((m) => {
                if (m) m.visible = false;
            });
        };
        if (numeroIntentoActual === null || inicioRef.current === null) {
            ocultarTodo();
            return;
        }
        const t = (performance.now() - inicioRef.current) / DURACION_MS;
        if (t >= 1) {
            ocultarTodo();
            return;
        }
        if (refPrincipal.current) {
            refPrincipal.current.visible = true;
            refPrincipal.current.position.copy(CURVA_TUBO.getPointAt(t));
        }
        refsEstela.current.forEach((malla, i) => {
            if (!malla) return;
            const tEco = t - (i + 1) * 0.035;
            if (tEco <= 0) {
                malla.visible = false;
                return;
            }
            malla.visible = true;
            malla.position.copy(CURVA_TUBO.getPointAt(Math.min(tEco, 1)));
        });
    });

    return (
        <>
            <mesh ref={refPrincipal} visible={false}>
                <sphereGeometry args={[RADIO_BOLA_ACTIVA, 20, 20]} />
                <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={1.1} roughness={0.25} metalness={0.2} />
            </mesh>
            {Array.from({ length: NUM_ESTELA }).map((_, i) => (
                <mesh key={i} ref={(el) => { refsEstela.current[i] = el; }} visible={false}>
                    <sphereGeometry args={[RADIO_BOLA_ACTIVA * (1 - i * 0.12), 12, 12]} />
                    <meshBasicMaterial color="#f59e0b" transparent opacity={0.32 - i * 0.045} />
                </mesh>
            ))}
        </>
    );
}

function Escena({ numeroIntentoActual, girando }: EscenarioTombola3DProps) {
    return (
        <>
            <ambientLight intensity={0.65} />
            <directionalLight position={[2, 3, 2]} intensity={1.1} />
            <pointLight position={[-2, -1, 1.5]} intensity={0.4} color="#fbbf24" />
            {/* Recentrado — el conducto/receptor se extiende hacia abajo (-Y)
                más de lo que la jaula ocupa hacia arriba (+Y): sin compensar,
                la composición completa no queda centrada verticalmente. */}
            <group position={[0, 0.4, 0]}>
                <EstructuraSoporte />
                <Jaula girando={girando} />
                <Conducto />
                <BolaActiva numeroIntentoActual={numeroIntentoActual} />
            </group>
        </>
    );
}

export function EscenarioTombola3D({ numeroIntentoActual, girando }: EscenarioTombola3DProps) {
    return (
        <div className="mx-auto my-2" style={{ width: 380, height: 355, maxWidth: '100%' }}>
            <Canvas
                camera={{ position: [0, 0, 5.5], fov: 36 }}
                gl={{ antialias: true, alpha: true }}
                dpr={[1, 2]}
                style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.12))' }}
            >
                <Escena numeroIntentoActual={numeroIntentoActual} girando={girando} />
            </Canvas>
        </div>
    );
}

export default EscenarioTombola3D;
