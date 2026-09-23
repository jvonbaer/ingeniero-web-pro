/**
 * Descarga Barlow y Barlow Condensed desde Google Fonts y las deja dentro del
 * proyecto (src/fuentes/ + src/styles/fuentes.css).
 *
 * Se ejecuta solo después de `npm install`. La escuela evalúa a pie de cancha,
 * donde la señal es mala o no hay: con las fuentes auto-hospedadas el informe se
 * ve igual sin conexión. Los .woff2 no se versionan porque son binarios; este
 * script los repone en cualquier máquina.
 *
 * Si la descarga falla —por ejemplo, al compilar sin internet— escribe una hoja
 * de estilos que apunta al CDN de Google. La compilación nunca se rompe por
 * esto; sólo se pierde el funcionamiento sin conexión.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR_FUENTES = resolve(RAIZ, "src/fuentes");
const HOJA = resolve(RAIZ, "src/styles/fuentes.css");

const CONSULTA =
  "family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap";
const URL_CSS = `https://fonts.googleapis.com/css2?${CONSULTA}`;

// Google devuelve woff2 sólo si el navegador declarado lo soporta.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const ENCABEZADO = `/* Generado por scripts/preparar-fuentes.mjs — no editar a mano.
   Barlow y Barlow Condensed, la tipografía institucional del CGA. */\n\n`;

async function principal() {
  if (existsSync(HOJA) && (await readFile(HOJA, "utf8")).includes("@font-face")) {
    return; // ya está resuelto en esta copia
  }

  try {
    await descargar();
    console.log("Fuentes CGA listas en src/fuentes/.");
  } catch (error) {
    await escribirRespaldoCdn();
    console.warn(
      `No se pudieron descargar las fuentes (${error.message}). ` +
        "Se usará el CDN de Google; la aplicación funcionará, pero necesitará conexión " +
        "la primera vez que se abra en cada dispositivo.",
    );
  }
}

async function descargar() {
  const respuesta = await fetch(URL_CSS, { headers: { "User-Agent": UA } });
  if (!respuesta.ok) throw new Error(`Google Fonts respondió ${respuesta.status}`);
  const css = await respuesta.text();

  const bloques = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([\s\S]*?)\}/g)];
  if (bloques.length === 0) throw new Error("no se encontraron declaraciones @font-face");

  await mkdir(DIR_FUENTES, { recursive: true });
  const declaraciones = [];

  for (const [, subconjunto, cuerpo] of bloques) {
    const familia = /font-family:\s*'([^']+)'/.exec(cuerpo)?.[1];
    const peso = /font-weight:\s*(\d+)/.exec(cuerpo)?.[1];
    const url = /url\((https:\/\/[^)]+)\)/.exec(cuerpo)?.[1];
    if (!familia || !peso || !url) continue;

    const archivo = `${familia.toLowerCase().replace(/ /g, "-")}-${peso}-${subconjunto}.woff2`;
    const fuente = await fetch(url, { headers: { "User-Agent": UA } });
    if (!fuente.ok) throw new Error(`no se pudo bajar ${archivo}`);
    await writeFile(resolve(DIR_FUENTES, archivo), Buffer.from(await fuente.arrayBuffer()));

    const lineas = cuerpo
      .replace(url, `../fuentes/${archivo}`)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    declaraciones.push(`@font-face {\n  ${lineas.join("\n  ")}\n}`);
  }

  await writeFile(HOJA, ENCABEZADO + declaraciones.join("\n\n") + "\n");
}

async function escribirRespaldoCdn() {
  await mkdir(dirname(HOJA), { recursive: true });
  await writeFile(
    HOJA,
    `${ENCABEZADO}/* Respaldo: no hubo conexión al preparar el proyecto. */\n@import url("${URL_CSS}");\n`,
  );
}

await principal();
