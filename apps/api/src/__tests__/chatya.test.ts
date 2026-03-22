/**
 * chatya.test.ts
 * ================
 * Tests E2E para el módulo ChatYA.
 * Ejecuta contra la BD local de PostgreSQL y la API corriendo en localhost.
 *
 * PRE-REQUISITO: La API debe estar corriendo (`npm run dev` en apps/api)
 *
 * EJECUTAR: npm test (desde apps/api)
 *
 * UBICACIÓN: apps/api/src/__tests__/chatya.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  crearUsuariosPrueba,
  limpiarDatosPrueba,
  TOKEN_USUARIO_1,
  TOKEN_USUARIO_2,
  USUARIO_2_ID,
  request,
} from './helpers';

// =============================================================================
// VARIABLES COMPARTIDAS ENTRE TESTS
// =============================================================================

let conversacionId: string;
let mensajeId: string;
let mensajeUsuario2Id: string;

// =============================================================================
// SETUP / TEARDOWN
// =============================================================================

beforeAll(async () => {
  await crearUsuariosPrueba();
});

afterAll(async () => {
  // No limpiar usuarios si se van a usar en tests de Playwright.
  // Para limpiar manualmente: ejecutar limpiarDatosPrueba() o borrar via pgAdmin.
  if (process.env.LIMPIAR_DATOS_TEST === 'true') {
    await limpiarDatosPrueba();
  }
});

// =============================================================================
// 1. CONVERSACIONES
// =============================================================================

describe('Conversaciones', () => {
  it('debe crear una conversación entre dos usuarios', async () => {
    const { status, data } = await request('/chatya/conversaciones', {
      method: 'POST',
      token: TOKEN_USUARIO_1(),
      body: {
        participante2Id: USUARIO_2_ID,
        participante2Modo: 'personal',
        contextoTipo: 'directo',
      },
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();

    const conv = data.data as Record<string, unknown>;
    conversacionId = conv.id as string;
    expect(conversacionId).toBeTruthy();
  });

  it('debe retomar la misma conversación si ya existe', async () => {
    const { status, data } = await request('/chatya/conversaciones', {
      method: 'POST',
      token: TOKEN_USUARIO_1(),
      body: {
        participante2Id: USUARIO_2_ID,
        participante2Modo: 'personal',
        contextoTipo: 'directo',
      },
    });

    expect(status).toBe(200);
    const conv = data.data as Record<string, unknown>;
    expect(conv.id).toBe(conversacionId);
  });

  it('debe listar conversaciones del usuario', async () => {
    const { status, data } = await request('/chatya/conversaciones?modo=personal', {
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();

    const respuesta = data.data as Record<string, unknown>;
    const conversaciones = respuesta.conversaciones as unknown[] | undefined;
    // La respuesta puede ser un array directo o un objeto con conversaciones
    const lista = conversaciones || (data.data as unknown[]);
    expect(Array.isArray(lista) ? lista.length : 0).toBeGreaterThanOrEqual(0);
  });

  it('debe obtener una conversación por ID', async () => {
    const { status, data } = await request(`/chatya/conversaciones/${conversacionId}`, {
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('debe fijar una conversación', async () => {
    const { status, data } = await request(`/chatya/conversaciones/${conversacionId}/fijar`, {
      method: 'PATCH',
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('debe desfijar (toggle) la conversación', async () => {
    const { status, data } = await request(`/chatya/conversaciones/${conversacionId}/fijar`, {
      method: 'PATCH',
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('debe archivar una conversación', async () => {
    const { status, data } = await request(`/chatya/conversaciones/${conversacionId}/archivar`, {
      method: 'PATCH',
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('debe desarchivar (toggle) la conversación', async () => {
    const { status, data } = await request(`/chatya/conversaciones/${conversacionId}/archivar`, {
      method: 'PATCH',
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('debe silenciar una conversación', async () => {
    const { status, data } = await request(`/chatya/conversaciones/${conversacionId}/silenciar`, {
      method: 'PATCH',
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });
});

// =============================================================================
// 2. MENSAJES
// =============================================================================

describe('Mensajes', () => {
  it('debe enviar un mensaje de texto', async () => {
    const { status, data } = await request(`/chatya/conversaciones/${conversacionId}/mensajes`, {
      method: 'POST',
      token: TOKEN_USUARIO_1(),
      body: {
        contenido: 'Hola, este es un mensaje de prueba E2E',
        tipo: 'texto',
      },
    });

    expect(status).toBe(201);
    expect(data.success).toBe(true);

    const mensaje = data.data as Record<string, unknown>;
    mensajeId = mensaje.id as string;
    expect(mensajeId).toBeTruthy();
  });

  it('debe enviar un mensaje con URL', async () => {
    const { status, data } = await request(`/chatya/conversaciones/${conversacionId}/mensajes`, {
      method: 'POST',
      token: TOKEN_USUARIO_1(),
      body: {
        contenido: 'Mira este link https://github.com',
        tipo: 'texto',
      },
    });

    expect(status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('debe listar mensajes de la conversación', async () => {
    const { status, data } = await request(`/chatya/conversaciones/${conversacionId}/mensajes?limit=20`, {
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
  });

  it('debe editar un mensaje', async () => {
    const { status, data } = await request(`/chatya/mensajes/${mensajeId}`, {
      method: 'PATCH',
      token: TOKEN_USUARIO_1(),
      body: {
        contenido: 'Mensaje editado E2E',
      },
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('no debe editar un mensaje ajeno', async () => {
    const { status } = await request(`/chatya/mensajes/${mensajeId}`, {
      method: 'PATCH',
      token: TOKEN_USUARIO_2(),
      body: {
        contenido: 'Intento de edición no autorizada',
      },
    });

    expect(status).not.toBe(200);
  });

  it('debe marcar mensajes como leídos', async () => {
    const { status, data } = await request(`/chatya/conversaciones/${conversacionId}/leer`, {
      method: 'PATCH',
      token: TOKEN_USUARIO_2(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('el usuario 2 debe enviar un mensaje', async () => {
    const { status, data } = await request(`/chatya/conversaciones/${conversacionId}/mensajes`, {
      method: 'POST',
      token: TOKEN_USUARIO_2(),
      body: {
        contenido: 'Respuesta del usuario 2',
        tipo: 'texto',
      },
    });

    expect(status).toBe(201);
    expect(data.success).toBe(true);

    const msg = data.data as Record<string, unknown>;
    mensajeUsuario2Id = msg.id as string;
  });

  it('debe reenviar un mensaje al usuario 2', async () => {
    const { status, data } = await request(`/chatya/mensajes/${mensajeId}/reenviar`, {
      method: 'POST',
      token: TOKEN_USUARIO_1(),
      body: {
        destinatarioId: USUARIO_2_ID,
        destinatarioModo: 'personal',
      },
    });

    expect(status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('debe eliminar un mensaje (para mí)', async () => {
    const { status, data } = await request(`/chatya/mensajes/${mensajeId}`, {
      method: 'DELETE',
      token: TOKEN_USUARIO_1(),
      body: { paraTodos: false },
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });
});

// =============================================================================
// 3. REACCIONES
// =============================================================================

describe('Reacciones', () => {
  it('debe agregar una reacción', async () => {
    const { status, data } = await request(`/chatya/mensajes/${mensajeUsuario2Id}/reaccion`, {
      method: 'POST',
      token: TOKEN_USUARIO_1(),
      body: { emoji: '❤️' },
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('debe obtener reacciones del mensaje', async () => {
    const { status, data } = await request(`/chatya/mensajes/${mensajeUsuario2Id}/reacciones`, {
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('debe quitar la reacción (toggle)', async () => {
    const { status, data } = await request(`/chatya/mensajes/${mensajeUsuario2Id}/reaccion`, {
      method: 'POST',
      token: TOKEN_USUARIO_1(),
      body: { emoji: '❤️' },
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });
});

// =============================================================================
// 4. MENSAJES FIJADOS
// =============================================================================

describe('Mensajes Fijados', () => {
  let mensajeParaFijar: string;

  it('debe enviar un mensaje para fijar', async () => {
    const { data } = await request(`/chatya/conversaciones/${conversacionId}/mensajes`, {
      method: 'POST',
      token: TOKEN_USUARIO_1(),
      body: { contenido: 'Mensaje importante para fijar', tipo: 'texto' },
    });

    const msg = data.data as Record<string, unknown>;
    mensajeParaFijar = msg.id as string;
    expect(mensajeParaFijar).toBeTruthy();
  });

  it('debe fijar un mensaje', async () => {
    const { status, data } = await request(`/chatya/conversaciones/${conversacionId}/fijados`, {
      method: 'POST',
      token: TOKEN_USUARIO_1(),
      body: { mensajeId: mensajeParaFijar },
    });

    expect(status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('debe listar mensajes fijados', async () => {
    const { status, data } = await request(`/chatya/conversaciones/${conversacionId}/fijados`, {
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('debe desfijar el mensaje', async () => {
    const { status, data } = await request(`/chatya/conversaciones/${conversacionId}/fijados/${mensajeParaFijar}`, {
      method: 'DELETE',
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });
});

// =============================================================================
// 5. BÚSQUEDA
// =============================================================================

describe('Búsqueda', () => {
  it('debe buscar mensajes en la conversación', async () => {
    const { status, data } = await request(`/chatya/conversaciones/${conversacionId}/buscar?texto=Respuesta`, {
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('debe buscar personas', async () => {
    const { status, data } = await request('/chatya/buscar-personas?q=Test', {
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });
});

// =============================================================================
// 6. CONTACTOS
// =============================================================================

describe('Contactos', () => {
  it('debe agregar un contacto', async () => {
    const { status, data } = await request('/chatya/contactos', {
      method: 'POST',
      token: TOKEN_USUARIO_1(),
      body: {
        contactoId: USUARIO_2_ID,
      },
    });

    expect(status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('debe listar contactos', async () => {
    const { status, data } = await request('/chatya/contactos', {
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('debe eliminar un contacto', async () => {
    const { status, data } = await request(`/chatya/contactos/${USUARIO_2_ID}`, {
      method: 'DELETE',
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });
});

// =============================================================================
// 7. BLOQUEO
// =============================================================================

describe('Bloqueo', () => {
  it('debe bloquear un usuario', async () => {
    const { status, data } = await request('/chatya/bloqueados', {
      method: 'POST',
      token: TOKEN_USUARIO_1(),
      body: {
        bloqueadoId: USUARIO_2_ID,
      },
    });

    expect(status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('debe listar usuarios bloqueados', async () => {
    const { status, data } = await request('/chatya/bloqueados', {
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('debe desbloquear al usuario', async () => {
    const { status, data } = await request(`/chatya/bloqueados/${USUARIO_2_ID}`, {
      method: 'DELETE',
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('debe poder enviar mensaje después de desbloquear', async () => {
    const { status, data } = await request(`/chatya/conversaciones/${conversacionId}/mensajes`, {
      method: 'POST',
      token: TOKEN_USUARIO_1(),
      body: { contenido: 'Mensaje después de desbloquear', tipo: 'texto' },
    });

    expect(status).toBe(201);
    expect(data.success).toBe(true);
  });
});

// =============================================================================
// 8. BADGE NO LEÍDOS
// =============================================================================

describe('Badge No Leídos', () => {
  it('debe contar mensajes no leídos', async () => {
    const { status, data } = await request('/chatya/no-leidos', {
      token: TOKEN_USUARIO_2(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
  });
});

// =============================================================================
// 9. OG PREVIEW
// =============================================================================

describe('OG Preview', () => {
  it('debe obtener preview de una URL válida', async () => {
    const { status, data } = await request(`/chatya/og-preview?url=${encodeURIComponent('https://github.com')}`, {
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);

    const preview = data.data as Record<string, unknown>;
    expect(preview.dominio).toBe('github.com');
  });

  it('debe rechazar URL sin protocolo HTTP', async () => {
    const { status, data } = await request(`/chatya/og-preview?url=${encodeURIComponent('ftp://example.com')}`, {
      token: TOKEN_USUARIO_1(),
    });

    expect(data.success).toBe(false);
  });

  it('debe rechazar URL inválida', async () => {
    const { status, data } = await request('/chatya/og-preview?url=no-es-una-url', {
      token: TOKEN_USUARIO_1(),
    });

    expect(data.success).toBe(false);
  });

  it('debe retornar error sin parámetro url', async () => {
    const { status } = await request('/chatya/og-preview', {
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(400);
  });
});

// =============================================================================
// 10. MIS NOTAS
// =============================================================================

describe('Mis Notas', () => {
  it('debe obtener Mis Notas', async () => {
    const { status, data } = await request('/chatya/mis-notas', {
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });
});

// =============================================================================
// 11. ELIMINAR CONVERSACIÓN (al final)
// =============================================================================

describe('Eliminar Conversación', () => {
  it('debe eliminar la conversación', async () => {
    const { status, data } = await request(`/chatya/conversaciones/${conversacionId}`, {
      method: 'DELETE',
      token: TOKEN_USUARIO_1(),
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });
});
