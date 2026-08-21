import fs from 'node:fs/promises';

const BASE = 'https://www.gmactorneos.lat';
const OG_IMAGE = `${BASE}/assets/branding/gmac-logo.png`;
const TODAY = '2026-08-21';

const pages = {
  'index.html': {
    path: '/',
    title: 'GMAC Torneos | FC Mobile y eFootball en Perú',
    description: 'GMAC organiza torneos online de FC Mobile y eFootball en Perú y Latinoamérica: convocatorias, fixtures, resultados, copas, inscripciones y comunidad competitiva.',
    robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    schemaType: 'WebPage',
  },
  'fc-mobile.html': {
    path: '/fc-mobile.html',
    title: 'Torneos FC Mobile en Perú | GMAC Torneos',
    description: 'Compite en torneos de FC Mobile organizados por GMAC: copas, ligas, grupos, eliminatorias, fixtures, resultados e inscripciones para jugadores de Perú y Latinoamérica.',
    robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    schemaType: 'CollectionPage',
  },
  'efootball.html': {
    path: '/efootball.html',
    title: 'Torneos eFootball en Perú | GMAC Torneos',
    description: 'Compite en torneos de eFootball organizados por GMAC: copas, ligas, formatos oficiales, fixtures, resultados e inscripciones para Perú y Latinoamérica.',
    robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    schemaType: 'CollectionPage',
  },
  'contacto.html': {
    path: '/contacto.html',
    title: 'Contacto GMAC Torneos | FC Mobile y eFootball',
    description: 'Contacta con GMAC para consultas sobre torneos, inscripciones, códigos, fixtures y competencias de FC Mobile y eFootball.',
    robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    schemaType: 'ContactPage',
  },
  'torneo.html': {
    path: '/torneo.html',
    title: 'Torneo GMAC | FC Mobile y eFootball',
    description: 'Consulta la información oficial de una edición de GMAC: participantes, fixture, resultados, formato y estado del torneo.',
    robots: 'noindex,follow,max-image-preview:large',
    schemaType: null,
  },
};

function esc(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function schemaFor(config) {
  if (!config.schemaType) return '';
  const canonical = `${BASE}${config.path}`;
  const organization = {
    '@type': 'Organization',
    '@id': `${BASE}/#organization`,
    name: 'GMAC',
    alternateName: 'GMAC Torneos',
    url: `${BASE}/`,
    logo: { '@type': 'ImageObject', url: OG_IMAGE },
    description: 'Circuito competitivo de torneos online de FC Mobile y eFootball.',
    areaServed: ['Perú', 'Latinoamérica'],
    sameAs: ['https://www.instagram.com/gmac.torneos/'],
  };
  const website = {
    '@type': 'WebSite',
    '@id': `${BASE}/#website`,
    url: `${BASE}/`,
    name: 'GMAC Torneos',
    inLanguage: 'es-PE',
    publisher: { '@id': `${BASE}/#organization` },
  };
  const page = {
    '@type': config.schemaType,
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: config.title,
    description: config.description,
    inLanguage: 'es-PE',
    isPartOf: { '@id': `${BASE}/#website` },
    about: { '@id': `${BASE}/#organization` },
  };
  if (config.path !== '/') {
    page.breadcrumb = { '@id': `${canonical}#breadcrumb` };
  }
  const graph = [organization, website, page];
  if (config.path !== '/') {
    const label = config.path.includes('fc-mobile') ? 'FC Mobile' : config.path.includes('efootball') ? 'eFootball' : 'Contacto';
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${canonical}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'GMAC', item: `${BASE}/` },
        { '@type': 'ListItem', position: 2, name: label, item: canonical },
      ],
    });
  }
  return `<script id="gmac-seo-schema" type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}

function seoBlock(config) {
  const canonical = `${BASE}${config.path}`;
  return `<!-- SEO GMAC START -->
<title>${esc(config.title)}</title>
<meta name="description" content="${esc(config.description)}"/>
<meta name="robots" content="${config.robots}"/>
<meta name="googlebot" content="${config.robots}"/>
<link rel="canonical" href="${canonical}"/>
<link rel="alternate" hreflang="es-PE" href="${canonical}"/>
<link rel="alternate" hreflang="x-default" href="${canonical}"/>
<meta property="og:locale" content="es_PE"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="GMAC Torneos"/>
<meta property="og:title" content="${esc(config.title)}"/>
<meta property="og:description" content="${esc(config.description)}"/>
<meta property="og:url" content="${canonical}"/>
<meta property="og:image" content="${OG_IMAGE}"/>
<meta property="og:image:alt" content="Logo oficial de GMAC Torneos"/>
<meta name="twitter:card" content="summary"/>
<meta name="twitter:title" content="${esc(config.title)}"/>
<meta name="twitter:description" content="${esc(config.description)}"/>
<meta name="twitter:image" content="${OG_IMAGE}"/>
${schemaFor(config)}
<!-- SEO GMAC END -->`;
}

function stripLegacySeo(html) {
  html = html.replace(/\s*<!-- SEO GMAC START -->[\s\S]*?<!-- SEO GMAC END -->\s*/gi, '\n');
  html = html.replace(/\s*<title>[\s\S]*?<\/title>\s*/i, '\n');
  html = html.replace(/\s*<meta\b[^>]*\bname=["']description["'][^>]*\/?>\s*/gi, '\n');
  html = html.replace(/\s*<meta\b[^>]*\bname=["'](?:robots|googlebot|twitter:card|twitter:title|twitter:description|twitter:image)["'][^>]*\/?>\s*/gi, '\n');
  html = html.replace(/\s*<meta\b[^>]*\bproperty=["']og:(?:locale|type|site_name|title|description|url|image|image:alt)["'][^>]*\/?>\s*/gi, '\n');
  html = html.replace(/\s*<link\b[^>]*\brel=["']canonical["'][^>]*\/?>\s*/gi, '\n');
  html = html.replace(/\s*<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["'](?:es-PE|x-default)["'][^>]*\/?>\s*/gi, '\n');
  html = html.replace(/\s*<script\b[^>]*\bid=["']gmac-seo-schema["'][^>]*>[\s\S]*?<\/script>\s*/gi, '\n');
  return html;
}

async function optimizePage(file, config) {
  let html = await fs.readFile(file, 'utf8');
  html = stripLegacySeo(html);
  const block = seoBlock(config);
  const anchor = /(<meta\b[^>]*\bname=["']theme-color["'][^>]*\/?>)/i;
  if (anchor.test(html)) html = html.replace(anchor, `$1\n${block}`);
  else html = html.replace(/<head>/i, `<head>\n${block}`);

  html = html
    .replace('Las tarjetas se alimentan de la base local del proyecto. Cuando cambian estado, formato, cupos o copa, la portada puede reflejarlo automáticamente.', 'Las tarjetas muestran el estado oficial de cada torneo: formato, cupos, fechas, premios e inscripciones cuando se publica cada convocatoria.')
    .replace('La versión anterior separaba campeonatos principales, torneos relámpago y retos especiales. Ahora esa información queda integrada en un bloque más claro.', 'GMAC combina campeonatos principales, torneos relámpago y retos especiales en una temporada con formatos distintos para cada tipo de competencia.')
    .replace('Las páginas de cada campeonato están preparadas para reunir la información importante sin crear interfaces diferentes en cada edición.', 'Cada campeonato reúne en una sola página su convocatoria, participantes, fixture, resultados e historial de la edición.')
    .replace('Las fechas, premios y estados se administrarán después desde Google Sheets.', 'Las fechas, premios y estados se publican desde el centro de control de GMAC y se actualizan en cada convocatoria.')
    .replace('La estructura queda preparada para que después coloquemos el reglamento definitivo de FC Mobile y, si quieres, reglas distintas por torneo.', 'Cada convocatoria publica las reglas de FC Mobile aplicables antes del inicio y puede incluir condiciones específicas según el formato del torneo.')
    .replace('La estructura queda preparada para que después coloquemos el reglamento definitivo de eFootball y, si quieres, reglas distintas por torneo.', 'Cada convocatoria publica las reglas de eFootball aplicables antes del inicio y puede incluir condiciones específicas según el formato del torneo.');

  await fs.writeFile(file, html);
}

for (const [file, config] of Object.entries(pages)) {
  await optimizePage(file, config);
}

const dataFile = 'assets/js/tournaments/data.js';
let data = await fs.readFile(dataFile, 'utf8');
data = data.replace(/"registrationStatus":"Abiertas"/g, '"registrationStatus":"Cerradas"');
await fs.writeFile(dataFile, data);

const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin.html\nDisallow: /api/\nDisallow: /torneo.html\n\nSitemap: ${BASE}/sitemap.xml\n`;
await fs.writeFile('robots.txt', robots);

const sitemapEntries = [
  ['/', '1.0', 'weekly'],
  ['/fc-mobile.html', '0.9', 'daily'],
  ['/efootball.html', '0.9', 'daily'],
  ['/contacto.html', '0.5', 'monthly'],
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.map(([path, priority, changefreq]) => `  <url>\n    <loc>${BASE}${path}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`).join('\n')}\n</urlset>\n`;
await fs.writeFile('sitemap.xml', sitemap);

console.log('GMAC production SEO applied.');
