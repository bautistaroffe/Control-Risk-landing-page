# Auditoria SEO - Control Risk (www.controlrisk-seguridad.com)

**Fecha:** 2026-03-30
**Sitio:** https://www.controlrisk-seguridad.com
**Tipo:** Landing page de empresa de seguridad privada (negocio local, Cordoba, Argentina)

---

## Mejoras Pendientes

### Prioridad ALTA

#### 1. Alt Text de Imagenes Mejorable
- **Problema:** Algunos alt texts son genericos:
  - `alt="Sede Control Risk"` deberia ser mas descriptivo: `alt="Oficinas centrales de Control Risk en Cordoba, Argentina"`
  - Logos de clientes tienen alt generico (`alt="Casonas"`, `alt="Dinosaurio Mall"`)
- **Impacto:** Medio - afecta SEO de imagenes y accesibilidad
- **Solucion:** Agregar descripciones mas especificas

#### 2. Schema LocalBusiness - Datos por completar
- `geo.latitude` y `geo.longitude`: Verificar coordenadas exactas de la sede
- `sameAs`: Agregar URLs de redes sociales (Instagram, Facebook, LinkedIn, etc.)
- `telephone`: Agregar cuando la empresa tenga un numero de contacto

### Prioridad MEDIA

#### 3. Jerarquia de Headings en Subpaginas
- **Hallazgo:** Las secciones usan H2 > H3 > H4 > H5, lo cual es correcto
- **Nota:** Los H2 de seccion ("Servicios de Seguridad", "Empresa de Seguridad") son textos cortos decorativos. Considerar que el H3 deberia ser H2 y el H2 decorativo un `<span>` o `<p>` con estilo

#### 4. Falta Pagina 404 Personalizada
- **Problema:** El server.js redirige todas las rutas desconocidas a `index.html` (comportamiento SPA), pero Netlify no tiene una pagina 404 configurada
- **Solucion:** Crear `public/404.html` y agregar `[[redirects]]` en netlify.toml

#### 5. Falta `hreflang` Tag
- **Problema:** El sitio esta en espanol (`lang="es"`) pero no tiene `hreflang` tag
- **Impacto:** Bajo si no hay version en otro idioma, pero recomendable para SEO regional
- **Solucion:** Agregar `<link rel="alternate" hreflang="es-AR" href="https://www.controlrisk-seguridad.com/" />`

### Prioridad BAJA

#### 6. Open Graph Image
- **Problema:** La imagen OG es el logo de la empresa, no una imagen representativa
- **Solucion:** Crear una imagen OG especifica (1200x630px) con logo + texto + imagen de fondo

#### 7. Fechas del Sitemap
- **Las fechas `lastmod` deben actualizarse** con cada deploy

#### 8. Fuentes de Google Fonts
- Se cargan 2 fuentes: Manrope y Material Symbols Outlined
- Material Symbols es pesada (~150KB+). Considerar usar solo los iconos necesarios via `text=` parameter

---

## Checklist Post-Deploy en Google Search Console

Despues de deployar estos cambios:

1. [ ] Ir a Google Search Console > Sitemaps > Enviar `https://www.controlrisk-seguridad.com/sitemap.xml`
2. [ ] Ir a Inspeccion de URLs > Inspeccionar `https://www.controlrisk-seguridad.com/` > Solicitar indexacion
3. [ ] Repetir inspeccion para las 4 paginas principales
4. [ ] Verificar que la propiedad en GSC sea `https://www.controlrisk-seguridad.com` (con www)
5. [ ] En Configuracion > Dominio preferido, asegurarse que `www.controlrisk-seguridad.com` sea el principal
6. [ ] Monitorear la pestaña "Cobertura" durante las proximas 2 semanas para verificar que los errores de redireccion desaparecen
7. [ ] Verificar en Rich Results Test que el schema LocalBusiness se detecta correctamente

---

## Configuracion Netlify Requerida

Para que la redireccion 301 funcione correctamente, verificar en Netlify:

1. **Domain Management:** El dominio personalizado `www.controlrisk-seguridad.com` debe estar configurado como dominio principal
2. **HTTPS:** Certificado SSL activo para el dominio personalizado
3. **DNS:** Los registros DNS deben apuntar correctamente a Netlify:
   - CNAME: `www` -> `controlrisk-seguridad.netlify.app`
   - O A record apuntando a la IP de Netlify

---

## Metricas a Monitorear

| Metrica | Herramienta | Objetivo |
|---------|-------------|----------|
| Errores de redireccion | Google Search Console | 0 errores |
| Paginas indexadas | Google Search Console | 4 paginas |
| LCP (mobile) | PageSpeed Insights | < 2.5s |
| CLS (mobile) | PageSpeed Insights | < 0.1 |
| Schema valido | Rich Results Test | Sin errores |
