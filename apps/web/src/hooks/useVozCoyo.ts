/**
 * useVozCoyo.ts
 * ==============
 * Síntesis de voz (TTS) de las respuestas de Coyo en el Asistente (FAB
 * global) — Web Speech Synthesis del navegador, gratis y sin round-trip al
 * backend. Distinto del reconocimiento de voz (input), que sí va a Gemini
 * vía `useAudioChat` — son dos APIs del navegador con soporte distinto;
 * síntesis (hablar) sí es confiable en iOS/Android.
 *
 * Ubicación: apps/web/src/hooks/useVozCoyo.ts
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAsistenteCoyoStore } from '../stores/useAsistenteCoyoStore';

/** Fragmentos de nombre que suelen indicar voz masculina en las plataformas comunes (Android/Chrome/iOS/Windows). El navegador no siempre expone el género como campo aparte. */
const PISTAS_VOZ_MASCULINA = ['jorge', 'diego', 'juan', 'carlos', 'male', 'hombre'];

function elegirVozMasculina(voces: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    const esVoces = voces.filter((v) => v.lang?.toLowerCase().startsWith('es'));
    if (esVoces.length === 0) return null;

    const porPista = esVoces.find((v) =>
        PISTAS_VOZ_MASCULINA.some((pista) => v.name.toLowerCase().includes(pista)),
    );
    if (porPista) return porPista;

    const mx = esVoces.find((v) => v.lang.toLowerCase() === 'es-mx');
    if (mx) return mx;

    return esVoces[0];
}

export function useVozCoyo() {
    const silenciado = useAsistenteCoyoStore((s) => s.silenciado);
    const vozRef = useRef<SpeechSynthesisVoice | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        const cargarVoces = () => {
            const voces = window.speechSynthesis.getVoices();
            if (voces.length > 0) vozRef.current = elegirVozMasculina(voces);
        };
        cargarVoces();
        window.speechSynthesis.addEventListener('voiceschanged', cargarVoces);
        return () => window.speechSynthesis.removeEventListener('voiceschanged', cargarVoces);
    }, []);

    /** Interrumpe cualquier audio en curso y lee el texto en voz alta. No hace nada si está silenciado o si el navegador no soporta la API. */
    const hablar = useCallback(
        (texto: string) => {
            if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
            if (silenciado || !texto.trim()) return;
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(texto);
            utterance.lang = 'es-MX';
            if (vozRef.current) utterance.voice = vozRef.current;
            window.speechSynthesis.speak(utterance);
        },
        [silenciado],
    );

    const detener = useCallback(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }, []);

    return { hablar, detener };
}

export default useVozCoyo;
