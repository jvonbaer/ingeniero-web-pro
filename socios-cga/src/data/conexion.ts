/**
 * De dónde salen las credenciales de Supabase.
 *
 * Se buscan en dos lugares, en este orden:
 *
 *  1. Lo que el club haya guardado desde la pantalla "Datos → Conexión con la
 *     nube". Queda en este navegador.
 *  2. Las variables VITE_SUPABASE_* del momento de compilar.
 *
 * El primero existe por una razón concreta: la forma más simple de publicar la
 * aplicación es arrastrar la carpeta compilada a Netlify, y ahí no hay dónde
 * poner variables de entorno —ya vienen dentro del archivo—. Sin esta pantalla,
 * conectar la nube obligaría a instalar Node y recompilar, que es justo lo que
 * esta aplicación trata de evitarle a la escuela.
 *
 * Sobre la clave: la "anon public" de Supabase está diseñada para viajar dentro
 * del sitio web, a la vista de cualquiera. Lo que protege los datos no es
 * esconderla, son las políticas RLS del esquema, que rechazan toda lectura sin
 * sesión iniciada. Guardarla acá no la expone más de lo que ya lo está.
 */

const CLAVE = "cga.conexion";

export interface Conexion {
  url: string;
  anonKey: string;
}

function desdeElNavegador(): Conexion | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const dato = JSON.parse(crudo) as Partial<Conexion>;
    if (!dato.url || !dato.anonKey) return null;
    return { url: dato.url, anonKey: dato.anonKey };
  } catch {
    return null; // localStorage bloqueado o contenido dañado
  }
}

function desdeLaCompilacion(): Conexion | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return url && anonKey ? { url, anonKey } : null;
}

export const conexion: Conexion | null = desdeElNavegador() ?? desdeLaCompilacion();

/** Verdadero cuando las credenciales las escribió alguien en esta pantalla. */
export const conexionManual = desdeElNavegador() !== null;

export function validarConexion(url: string, anonKey: string): string | null {
  const limpia = url.trim().replace(/\/+$/, "");
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(limpia)) {
    return "La dirección del proyecto debe verse así: https://abcdefgh.supabase.co";
  }
  if (anonKey.trim().length < 40) {
    return "La clave anónima parece incompleta. Es un texto largo que empieza con «eyJ» o «sb_».";
  }
  return null;
}

export function guardarConexion(url: string, anonKey: string) {
  localStorage.setItem(
    CLAVE,
    JSON.stringify({ url: url.trim().replace(/\/+$/, ""), anonKey: anonKey.trim() }),
  );
}

export function borrarConexion() {
  localStorage.removeItem(CLAVE);
}
