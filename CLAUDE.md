# CLAUDE.md

Este repositorio mezcla tres cosas distintas. Antes de tocar código, identifica en cuál estás trabajando.

| Carpeta | Qué es | Stack |
|---|---|---|
| `evaluacion-cga/` | App de evaluación de habilidades de la Escuela de Fútbol del Club Gimnástico Alemán (CGA) de Temuco | React 19, TypeScript, Vite, react-router-dom, Supabase |
| `socios-cga/` | App de socios, ramas, escuelas, pagos y avisos de renovación del CGA | Igual que la anterior |
| Raíz (`SKILL.md`, `references/`, `scripts/`, `templates/`) | Skill «Web Design Engineer Pro» para construir webs nuevas con Next.js | Next.js 16, Tailwind v4, shadcn/ui, Framer Motion |

## Regla principal

El stack de la skill de la raíz **no aplica** a `evaluacion-cga/` ni a `socios-cga/`. En esas carpetas:

- No migres a Next.js ni agregues Tailwind, shadcn, Framer Motion ni librerías de UI o de toasts.
- El CSS es propio, en `src/styles/` (`tokens.css`, `components.css`, `print.css`, etc.). Usa los tokens existentes antes de inventar valores.
- Antes de agregar una dependencia, revisa si el `package.json` de la app ya resuelve el problema.

## Comandos

Se ejecutan dentro de cada app (`cd evaluacion-cga` o `cd socios-cga`). Requieren Node 20 o superior.

```bash
npm install
npm run dev       # servidor de desarrollo (Vite)
npm run build     # tsc -b && vite build; es también la verificación de tipos
npm run lint      # oxlint
```

- No hay tests automatizados. Antes de dar algo por terminado, corre `npm run build` y `npm run lint` en la app que tocaste.
- `socios-cga` agrega `npm run avisos`, que ejecuta `avisos/enviar.mjs` (envío de avisos de renovación).
- `postinstall` ejecuta `scripts/preparar-fuentes.mjs`; si falla en un entorno sin red, no es un error del código.

## Datos y seguridad

- Ambas apps funcionan sin configurar nada, guardando en el propio dispositivo (IndexedDB). Con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` pasan a trabajar contra Supabase. El acceso a datos pasa por `src/data/` (driver local y driver de Supabase); no lo saltes llamando a Supabase desde las pantallas.
- Los esquemas de base de datos viven en `supabase/schema.sql` de cada app. La seguridad depende de las políticas RLS: no las debilites para «hacer andar» algo.
- Hay datos personales de **menores de edad** y de apoderados. No pegues datos reales en commits, issues ni en el chat; para pruebas usa los datos de ejemplo (`seed.ts`, `ejemplo.ts`).
- Nunca commitees `.env`. Las claves `SUPABASE_SERVICE_KEY`, `RESEND_API_KEY` y similares van solo como secretos de GitHub Actions, jamás en el código del navegador.

## Despliegue

- `netlify.toml` de la raíz construye `evaluacion-cga` (`base = "evaluacion-cga"`). `socios-cga` tiene su propio `netlify.toml` y `vercel.json`.
- `.github/workflows/avisos-cga.yml` corre todos los días y envía los avisos de renovación. Lo que cambies en `socios-cga/avisos/` o en el esquema afecta a esa tarea.

## Marca del club

Los diseños, textos y piezas del CGA siguen el skill `identidad-marca-cga` si está disponible en la sesión (paleta, tipografía y reglas de watermark). Para `evaluacion-cga` rige la identidad de la rama Fútbol: Rojo CGA, Negro Carbón, Amarillo DFB y tipografía Barlow.

## Skills de diseño instalados

En `.agents/skills/` (con enlaces en `.claude/skills/`) hay skills de animación y calidad de UI de `emilkowalski/skills`: `animate`, `review-animations`, `improve-animations`, `find-animation-opportunities`, `animation-vocabulary`, `break-ui`, `emil-design-eng` y `prototype`. Son de un tercero: léelos antes de confiar en lo que instruyen. Se instalan con `npx skills@latest add emilkowalski/skills`, y `skills-lock.json` registra lo instalado.

## Estilo de trabajo

- Todo texto, comentario, mensaje de commit y documentación va en español de Chile, con ortografía y tildes correctas. Los errores ortográficos no son aceptables.
- Sigue el estilo del archivo que editas: nombres en español para el dominio (`jugadores`, `pautas`, `camisetas`), densidad de comentarios similar y sin dependencias nuevas sin justificarlas.
- Desarrolla en la rama indicada para la sesión; no abras PR salvo que se pida.
