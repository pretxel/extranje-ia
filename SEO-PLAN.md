# SEO Plan — Extranjería.ai

> Auditoría SEO y plan de optimización priorizado.
> Stack: **Next.js 16 (App Router) + React 19 + Tailwind v4**, auth Supabase, analítica GA (`@next/third-parties`).
> Fecha de auditoría: 2026-06-10 · Rama: `docs/seo-plan`

---

## 1. Resumen ejecutivo

La landing (`src/app/page.tsx`) tiene **buena base semántica** (un solo `<h1>`, jerarquía `h2/h3` limpia, `lang="es"`, fuentes con `display: swap`, SVG decorativos con `aria-hidden`), pero **carece de casi toda la capa SEO técnica**: sin Open Graph, sin Twitter Card, sin `metadataBase`/canonical, sin datos estructurados (JSON-LD), sin `sitemap.xml`, sin `robots.txt`, sin favicon ni imagen social, y con **dos enlaces de footer rotos** (`/privacidad`, `/terminos` → 404).

Para un producto cuyo público objetivo busca términos de alta intención (`cómo solicitar NIE`, `documentos TIE`, `cita previa extranjería`), el SEO orgánico es un canal de adquisición de primer orden hoy desaprovechado.

**Puntuación cualitativa actual:** contenido/semántica 7/10 · SEO técnico 2/10 · social/sharing 0/10 · datos estructurados 0/10.

---

## 2. Auditoría detallada

### 2.1 Lo que YA existe (✓)

| Área | Estado | Evidencia |
|---|---|---|
| Title raíz | ✓ | `layout.tsx:19` — "Extranjería.ai — Resuelve tus dudas de NIE, TIE y visados" (54 car., dentro de rango) |
| Meta description raíz | ✓ | `layout.tsx:20-21` (~130 car., correcta) |
| Idioma | ✓ | `<html lang="es">` (`layout.tsx:27`) |
| Jerarquía de encabezados | ✓ | Un único `<h1>` (`page.tsx:169`); `h2` por sección; `h3` en tarjetas |
| Fuentes optimizadas | ✓ | `next/font/google` con `display: "swap"` (`layout.tsx:9,15`) — evita FOIT, mejora LCP/CLS |
| SVG decorativos | ✓ | `aria-hidden="true"` en iconos (`page.tsx`) |
| Analítica | ✓ | `<GoogleAnalytics>` condicional a `NEXT_PUBLIC_GA_ID` |
| Enlaces internos cliente | ✓ | `next/link` para `/sign-up`, `/dashboard/chat` |
| `sharp` disponible | ✓ | `package.json` `onlyBuiltDependencies` — optimización de imágenes lista |

### 2.2 Lo que FALTA o está ROTO (✗)

| # | Problema | Severidad | Evidencia |
|---|---|---|---|
| 1 | **Enlaces de footer rotos** `/privacidad` y `/terminos` → 404 | 🔴 Alta | `page.tsx:715,718`; no existen `src/app/privacidad/` ni `src/app/terminos/` |
| 2 | **Sin Open Graph** (og:title, og:description, og:image, og:url, og:type) | 🔴 Alta | `layout.tsx` `metadata` solo tiene title+description |
| 3 | **Sin Twitter Card** | 🔴 Alta | idem |
| 4 | **Sin `metadataBase`** → URLs OG/canonical no se resuelven absolutas | 🔴 Alta | `layout.tsx:18` |
| 5 | **Sin `sitemap.xml`** | 🔴 Alta | no existe `src/app/sitemap.ts` |
| 6 | **Sin `robots.txt`** | 🔴 Alta | no existe `src/app/robots.ts` ni `public/robots.txt` (no hay `public/`) |
| 7 | **Sin datos estructurados JSON-LD** (Organization, WebSite, FAQPage, SoftwareApplication) | 🔴 Alta | grep sin resultados |
| 8 | **Sin favicon / icon / apple-icon** | 🟠 Media | no existe `src/app/icon.*` ni `public/` |
| 9 | **Sin imagen social** (`opengraph-image`) — comparticiones sin preview | 🟠 Media | no existe `src/app/opengraph-image.*` |
| 10 | **Sin canonical** por página | 🟠 Media | `metadata.alternates` ausente |
| 11 | **Páginas de auth indexables y sin metadata propia** (`/sign-in`, `/sign-up`) | 🟠 Media | `(auth)/sign-in/.../page.tsx` sin `metadata` ni `robots:noindex` |
| 12 | **Sin metadata por página** (dashboard, auth heredan title raíz) | 🟠 Media | solo `layout.tsx` exporta `metadata` |
| 13 | **`next.config.ts` vacío** — sin cabeceras de seguridad ni config de imágenes | 🟠 Media | `next.config.ts:2` → `{}` |
| 14 | **Sin `web app manifest`** (PWA / instalable / theme-color) | 🟡 Baja | no existe `src/app/manifest.ts` |
| 15 | **Sin `not-found.tsx` ni `error.tsx`** personalizados | 🟡 Baja | no existen en `src/app` |
| 16 | **Sin `theme-color` / viewport explícito** | 🟡 Baja | no exportado en `layout.tsx` |
| 17 | **Sin contenido indexable de fondo** (blog/guías) para términos long-tail | 🟡 Baja | solo landing + app privada |
| 18 | **CLAUDE.md desactualizado** (dice Clerk; el código usa Supabase) | 🟡 Baja | `page.tsx:3` usa `@/lib/auth/server` (Supabase) |

---

## 3. Plan de mejoras priorizado

Prioridad por **impacto SEO / esfuerzo**. Cada acción es concreta y aplicable sin instalar dependencias nuevas (todo es nativo de Next.js 16 Metadata API).

### 🔴 PRIORIDAD ALTA — base técnica indexable (1–2 h)

#### A1. Arreglar enlaces rotos del footer (`/privacidad`, `/terminos`)
- **Acción:** crear `src/app/privacidad/page.tsx` y `src/app/terminos/page.tsx` con el contenido legal (aviso de "información orientativa, no asesoramiento jurídico" ya presente en la home). Mientras no haya texto definitivo, publicar versión mínima viable.
- **Por qué:** enlaces 404 perjudican rastreo, confianza y conversión; obligatorio legalmente (RGPD/LSSI en España).
- **Impacto:** elimina 2 errores de rastreo + cumplimiento legal. **Alto.**

#### A2. Enriquecer `metadata` raíz (`src/app/layout.tsx`)
Añadir al objeto `metadata`:
```ts
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://extranjeria.ai"),
  title: {
    default: "Extranjería.ai — Resuelve tus dudas de NIE, TIE y visados",
    template: "%s · Extranjería.ai",
  },
  description:
    "Consultas sobre NIE, TIE, visados y permisos en España respondidas en segundos con fuentes oficiales verificadas.",
  keywords: ["NIE", "TIE", "visados España", "permiso de residencia", "extranjería", "cita previa extranjería", "BOE extranjería"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "/",
    siteName: "Extranjería.ai",
    title: "Extranjería.ai — Tu abogado de extranjería disponible 24/7",
    description: "Resuelve dudas de NIE, TIE, visados y permisos en España con fuentes oficiales (BOE, SEPE, Sede Electrónica).",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Extranjería.ai" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Extranjería.ai",
    description: "Tu asistente de extranjería con fuentes oficiales verificadas.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};
```
- **Por qué:** OG/Twitter controlan el preview al compartir (CTR social); `metadataBase` resuelve URLs absolutas; `template` da títulos coherentes por página.
- **Impacto:** **Alto** — sharing + CTR en SERP.

#### A3. `sitemap.xml` dinámico (`src/app/sitemap.ts`)
```ts
import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://extranjeria.ai";
  return [
    { url: `${base}/`,          changeFrequency: "weekly",  priority: 1 },
    { url: `${base}/privacidad`,changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/terminos`,  changeFrequency: "yearly",  priority: 0.3 },
  ];
}
```
- **Impacto:** rastreo guiado, indexación más rápida. **Alto.**

#### A4. `robots.txt` (`src/app/robots.ts`)
```ts
import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://extranjeria.ai";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard/", "/api/", "/sign-in", "/sign-up", "/auth/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
```
- **Por qué:** evita indexar rutas privadas/funcionales (presupuesto de rastreo) y declara el sitemap.
- **Impacto:** **Alto.**

#### A5. Datos estructurados JSON-LD (`Organization` + `WebSite` + `FAQPage`)
- **Acción:** componente `<script type="application/ld+json">` en `layout.tsx` (Organization + WebSite) y en `page.tsx` un `FAQPage` con preguntas reales (TIE, NIE, tasa 790). El mockup y secciones ya contienen Q&A reutilizables.
- **Por qué:** habilita rich results (FAQ, sitelinks search box) y refuerza entidad/marca.
- **Impacto:** **Alto** — visibilidad enriquecida en SERP.

---

### 🟠 PRIORIDAD MEDIA — cobertura social, iconos y seguridad (1–2 h)

#### M1. Imagen Open Graph generada (`src/app/opengraph-image.tsx`)
- Usar `ImageResponse` (nativo Next.js, sin deps) con la marca (1200×630). Cubre la `images` referenciada en A2.
- **Impacto:** previews al compartir en WhatsApp/X/LinkedIn — clave para tráfico de referencia hispano. **Medio-Alto.**

#### M2. Favicon e iconos (`src/app/icon.tsx` + `apple-icon.tsx`)
- Generar con `ImageResponse` o añadir `src/app/favicon.ico`. Logo "E" naranja ya definido en el diseño.
- **Impacto:** marca en pestañas/resultados, percepción de profesionalidad. **Medio.**

#### M3. `noindex` + metadata en páginas de auth
- En `(auth)/sign-in/.../page.tsx` y `sign-up`: `export const metadata = { title: "Inicia sesión", robots: { index: false, follow: false } }`.
- **Por qué:** páginas de login son contenido fino sin valor de búsqueda; evita canibalización y desperdicio de rastreo.
- **Impacto:** **Medio.**

#### M4. Metadata por página (privacidad, términos, dashboard)
- `title`/`description` propios via export `metadata`. Dashboard: `robots: { index: false }`.
- **Impacto:** títulos únicos = mejor CTR y desambiguación. **Medio.**

#### M5. Cabeceras de seguridad + config en `next.config.ts`
```ts
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
    ]}];
  },
};
```
- **Por qué:** señales de seguridad/HTTPS forman parte de "page experience"; `poweredByHeader:false` reduce superficie.
- **Impacto:** **Medio** (confianza + buenas prácticas).

---

### 🟡 PRIORIDAD BAJA — refinamiento y crecimiento de contenido (continuo)

#### B1. `web app manifest` + `theme-color` (`src/app/manifest.ts` + `viewport` export)
- PWA básica, `theme-color` `#070B14` (fondo) / acento naranja. Mejora instalación móvil y barra de color.
- **Impacto:** **Bajo** (UX móvil, no ranking directo).

#### B2. `not-found.tsx` y `error.tsx` con marca
- 404/500 con enlace a la home → recupera sesiones y mantiene al crawler en el sitio.
- **Impacto:** **Bajo.**

#### B3. Hub de contenido SEO (`/guias/[slug]`) — long-tail
- Guías indexables: "Cómo solicitar el TIE paso a paso", "Documentos para el NIE", "Tasa 790 012: cómo pagarla". Reutiliza el corpus RAG (BOE/SEDE/SEPE) ya disponible.
- **Por qué:** es el **mayor potencial de tráfico orgánico** a medio plazo; captura intención informacional antes de la conversión.
- **Impacto:** **Alto a 3–6 meses**, esfuerzo alto → prioridad baja por plazo, no por valor.

#### B4. `alt` text descriptivo si se añaden imágenes reales
- Hoy todo es SVG/emoji decorativo (correcto con `aria-hidden`). Al introducir capturas/diagramas, exigir `alt` con keyword natural.
- **Impacto:** **Bajo** hoy, preventivo.

#### B5. Sincronizar `CLAUDE.md`
- Actualizar auth de Clerk → Supabase (el código ya migró). Higiene del repo, no SEO directo.

---

## 4. Estimación de impacto (resumen)

| Acción | Prioridad | Esfuerzo | Impacto SEO |
|---|---|---|---|
| A1 Páginas privacidad/términos (fix 404) | Alta | S | 🔴🔴🔴 + legal |
| A2 Metadata raíz (OG/Twitter/canonical) | Alta | S | 🔴🔴🔴 |
| A3 sitemap.ts | Alta | XS | 🔴🔴 |
| A4 robots.ts | Alta | XS | 🔴🔴 |
| A5 JSON-LD (Org/WebSite/FAQ) | Alta | M | 🔴🔴🔴 |
| M1 opengraph-image | Media | S | 🟠🟠🟠 |
| M2 favicon/iconos | Media | S | 🟠🟠 |
| M3 noindex auth | Media | XS | 🟠🟠 |
| M4 metadata por página | Media | S | 🟠🟠 |
| M5 cabeceras seguridad | Media | S | 🟠 |
| B1 manifest/theme-color | Baja | S | 🟡 |
| B2 not-found/error | Baja | S | 🟡 |
| B3 hub de guías (long-tail) | Baja* | L | 🔴🔴🔴 (3–6 m) |
| B4 alt text futuro | Baja | — | 🟡 |
| B5 CLAUDE.md sync | Baja | XS | — (higiene) |

\* B3 tiene impacto alto pero plazo largo; priorizar tras cerrar Alta+Media.

Esfuerzo: XS <15 min · S ~30 min · M ~1 h · L días.

---

## 5. Orden de ejecución recomendado

1. **Sprint técnico (medio día):** A1 → A2 → A3 → A4 → A5 → M1 → M2 → M3 → M4 → M5.
   Deja el sitio totalmente indexable, compartible y con rich results — la mayor parte del valor con poco esfuerzo.
2. **Pulido (1–2 h):** B1 → B2 → B5.
3. **Crecimiento (continuo):** B3 (hub de guías) alimentado por el corpus RAG existente.

### Verificación posterior
- Google **Rich Results Test** (JSON-LD FAQ/Organization).
- **Search Console:** enviar `sitemap.xml`, revisar cobertura e indexación.
- **Lighthouse SEO** (objetivo ≥ 95) y **PageSpeed** (Core Web Vitals).
- Validar previews OG con el depurador de **Facebook Sharing** y **X Card Validator**.

---

*Nota: este plan no instala dependencias ni ejecuta builds. Todas las acciones usan la Metadata API y `ImageResponse` nativas de Next.js 16.*
