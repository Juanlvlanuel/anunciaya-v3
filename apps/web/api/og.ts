/**
 * ============================================================================
 * API ENDPOINT: Open Graph Universal
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/api/og.ts
 * 
 * PROPÓSITO:
 * Endpoint UNIVERSAL que genera meta tags de Open Graph para cualquier entidad
 * 
 * USO:
 * /api/og?tipo=oferta&id=abc123
 * /api/og?tipo=negocio&id=xyz789
 * /api/og?tipo=articulo&id=def456
 * 
 * CREADO: Febrero 2026
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

type EntityType = 'negocio' | 'oferta' | 'articulo' | 'empleo' | 'rifa' | 'subasta';

interface EntityConfig {
  endpoint: string;
  titleField: string;
  descriptionField?: string;
  imageField?: string;
  fallbackTitle: string;
  fallbackDescription: string;
}

const ENTITY_CONFIG: Record<EntityType, EntityConfig> = {
  negocio: {
    endpoint: '/negocios/publico',
    titleField: 'nombreComercial',
    descriptionField: 'descripcion',
    imageField: 'logo',
    fallbackTitle: 'Negocio en AnunciaYA',
    fallbackDescription: 'Descubre este negocio cerca de ti',
  },
  oferta: {
    endpoint: '/ofertas/detalle',
    titleField: 'titulo',
    descriptionField: 'descripcion',
    imageField: 'imagen',
    fallbackTitle: 'Oferta Especial en AnunciaYA',
    fallbackDescription: '¡No te pierdas esta oferta!',
  },
  articulo: {
    endpoint: '/articulos/publico',
    titleField: 'nombre',
    descriptionField: 'descripcion',
    imageField: 'imagenes[0]',
    fallbackTitle: 'Producto en AnunciaYA',
    fallbackDescription: 'Descubre este producto',
  },
  empleo: {
    endpoint: '/empleos/publico',
    titleField: 'titulo',
    descriptionField: 'descripcion',
    imageField: 'empresaLogo',
    fallbackTitle: 'Empleo en AnunciaYA',
    fallbackDescription: 'Oportunidad laboral disponible',
  },
  rifa: {
    endpoint: '/rifas/publico',
    titleField: 'titulo',
    descriptionField: 'descripcion',
    imageField: 'imagen',
    fallbackTitle: 'Rifa en AnunciaYA',
    fallbackDescription: '¡Participa y gana!',
  },
  subasta: {
    endpoint: '/subastas/publico',
    titleField: 'titulo',
    descriptionField: 'descripcion',
    imageField: 'imagen',
    fallbackTitle: 'Subasta en AnunciaYA',
    fallbackDescription: 'Haz tu oferta ahora',
  },
};

function getNestedField(obj: any, path: string): any {
  if (!path) return undefined;
  
  if (path.includes('[')) {
    const [field, indexStr] = path.split('[');
    const index = parseInt(indexStr.replace(']', ''));
    return obj[field]?.[index];
  }
  
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function truncate(text: string | undefined, maxLength: number): string {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { tipo, id } = req.query;

    if (!tipo || typeof tipo !== 'string') {
      return res.status(400).send('Parámetro "tipo" es requerido');
    }

    if (!id || typeof id !== 'string') {
      return res.status(400).send('Parámetro "id" es requerido');
    }

    if (!(tipo in ENTITY_CONFIG)) {
      return res.status(400).send(`Tipo "${tipo}" no es válido. Tipos permitidos: ${Object.keys(ENTITY_CONFIG).join(', ')}`);
    }

    const entityType = tipo as EntityType;
    const config = ENTITY_CONFIG[entityType];

    // VITE_API_URL ya incluye /api, no duplicar
    const apiUrl = process.env.VITE_API_URL || 'https://anunciaya-api.onrender.com/api';
    const endpointUrl = `${apiUrl}${config.endpoint}/${id}`;

    const response = await fetch(endpointUrl);
    
    if (!response.ok) {
      return res.status(404).send(`${entityType} no encontrado`);
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      return res.status(404).send(`${entityType} no encontrado`);
    }

    const data = result.data;

    const titulo = getNestedField(data, config.titleField) || config.fallbackTitle;
    const descripcion = truncate(
      getNestedField(data, config.descriptionField || '') || config.fallbackDescription,
      160
    );
    const imagen = getNestedField(data, config.imageField || '') 
      || 'https://anunciaya-v3-app.vercel.app/logo-share.png';

    const nombreNegocio = data.negocioNombre || data.nombreComercial;
    const tituloCompleto = nombreNegocio && entityType !== 'negocio'
      ? `${titulo} - ${nombreNegocio}`
      : titulo;

    const urlCompleta = `https://anunciaya-v3-app.vercel.app/p/${tipo}/${id}`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <meta property="og:type" content="website">
  <meta property="og:url" content="${urlCompleta}">
  <meta property="og:title" content="${tituloCompleto}">
  <meta property="og:description" content="${descripcion}">
  <meta property="og:image" content="${imagen}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="AnunciaYA">
  <meta property="og:locale" content="es_MX">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${urlCompleta}">
  <meta name="twitter:title" content="${tituloCompleto}">
  <meta name="twitter:description" content="${descripcion}">
  <meta name="twitter:image" content="${imagen}">
  
  <meta http-equiv="refresh" content="0; url=/p/${tipo}/${id}">
  
  <title>${tituloCompleto} | AnunciaYA</title>
</head>
<body>
  <p>Redirigiendo...</p>
</body>
</html>
    `.trim();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    
    return res.status(200).send(html);
    
  } catch (error) {
    const fallbackHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="AnunciaYA - Tu Comunidad Local">
  <meta property="og:description" content="Descubre negocios, ofertas y servicios cerca de ti">
  <meta property="og:image" content="https://anunciaya-v3-app.vercel.app/logo-share.png">
  <meta http-equiv="refresh" content="0; url=/">
  <title>AnunciaYA</title>
</head>
<body><p>Redirigiendo...</p></body>
</html>`.trim();
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(fallbackHtml);
  }
}