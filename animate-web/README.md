# Sitio web de Fundación Anímate

Sitio estático hecho con [Astro](https://astro.build). Vive en su propia carpeta y no depende de las otras aplicaciones de este repositorio.

## Cómo correrlo

```bash
cd animate-web
npm install
npm run dev      # vista previa en http://localhost:4321
npm run build    # genera la carpeta dist/ lista para publicar
```

Para publicar en Netlify, usa esta carpeta (`animate-web`) como directorio base. El `netlify.toml` de aquí ya trae la configuración.

## Dónde se cambia cada cosa

| Qué quieres cambiar | Dónde |
| --- | --- |
| Fotos | `src/assets/photos/`. Reemplaza el archivo conservando el nombre, o cambia el nombre en `src/data/fotos.ts`. `node scripts/preparar-foto.mjs <origen> <nombre.jpg>` las achica solas. |
| Texto alternativo de las fotos | `src/data/fotos.ts` |
| Contacto, menú, cifras, proyectos, alianzas, formas de colaborar | `src/data/sitio.ts` |
| Textos de la portada | `src/pages/index.astro` |
| Colores, tipografía, espacios | `src/styles/tokens.css` (viene del design system) y `src/styles/global.css` |
| Logo | `src/assets/logo/` |

## Estado

- **Hecho:** portada (Inicio), encabezado, pie y estilos del design system.
- **Pendiente de contenido:** las demás páginas (`/quienes-somos/`, `/equipo/`, `/modelo/`, `/terapeutica/`, `/educativa/`, `/formativa/`, `/proyectos/`, `/dona/`, `/contacto/`, `/transparencia/`) existen como páginas en construcción con `noindex`. Se reemplazan una a una.
- Las cifras de impacto están vacías en `src/data/sitio.ts`: mientras no haya datos, esa sección no se muestra.
- Las cifras regionales (CASEN 2021, ENDISC 2021) vienen de la propuesta original y hay que revisar si existen datos más nuevos.
- Los convenios y reconocimientos de `alianzas` hay que confirmarlos antes de publicar.
- Las formas de colaborar (donación, becas, certificado) están abiertas para completar cuando se definan los mecanismos.
- El tema oscuro del design system no está implementado: el sitio es solo claro.
- El logo disponible es una imagen de baja resolución: conviene pedir el archivo vectorial (SVG).
