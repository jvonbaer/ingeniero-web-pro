import { createClient } from "@supabase/supabase-js";

/**
 * Revisión de la instalación en la nube.
 *
 * Existe porque conectar Supabase son cuatro pasos en dos sitios distintos
 * —crear el proyecto, correr el esquema, copiar las credenciales, crear la
 * cuenta del entrenador— y hasta ahora la aplicación sólo avisaba del último
 * que fallara, en medio de otra tarea. Esto los prueba de a uno y dice cuál
 * falta.
 *
 * Usa un cliente propio, con la sesión desactivada, para no tocar la sesión de
 * quien está usando la aplicación: revisar la instalación no debe cerrarle la
 * sesión a nadie ni dejarlo dentro sin haberla pedido.
 */

export type EstadoPrueba = "ok" | "falla" | "aviso" | "omitida";

export interface Prueba {
  id: string;
  titulo: string;
  estado: EstadoPrueba;
  detalle: string;
  /** Qué hacer cuando falla. Vacío cuando no hay nada que corregir. */
  remedio?: string;
}

const TABLAS = ["jugadores", "evaluaciones", "rubrica", "hojas"] as const;

/** El informe sale siempre en este orden, se hayan corrido las pruebas o no. */
const ORDEN = ["proyecto", "tablas", "rls", "sesion", "lectura", "escritura"] as const;

const TITULOS: Record<(typeof ORDEN)[number], string> = {
  proyecto: "El proyecto responde y acepta la clave",
  tablas: "Las cuatro tablas están creadas",
  rls: "Los datos no se leen sin iniciar sesión",
  sesion: "La cuenta del entrenador inicia sesión",
  lectura: "Con sesión se pueden leer las tablas",
  escritura: "Con sesión se puede guardar",
};

const CORRER_ESQUEMA =
  "En Supabase, SQL Editor → New query, pegue el contenido de supabase/schema.sql y pulse Run. " +
  "Se puede correr las veces que haga falta sin romper nada.";

interface ErrorPostgrest {
  code?: string;
  message: string;
}

function tablaAusente(error: ErrorPostgrest): boolean {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|could not find the table/i.test(error.message)
  );
}

function nuevoCliente(url: string, anonKey: string) {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

type Cliente = ReturnType<typeof nuevoCliente>;

/**
 * Cuenta las filas visibles de una tabla.
 *
 * Trae una fila de verdad en vez de pedir sólo la cabecera: una petición HEAD
 * vuelve sin cuerpo, y sin cuerpo los errores de PostgREST llegan vacíos —una
 * tabla inexistente se daba por buena y un permiso denegado aparecía sin
 * explicación—.
 */
async function contar(
  sb: Cliente,
  tabla: string,
): Promise<{ filas: number; error?: undefined } | { filas?: undefined; error: ErrorPostgrest }> {
  const { count, error } = await sb.from(tabla).select("*", { count: "exact" }).limit(1);
  if (error) return { error };
  return { filas: count ?? 0 };
}

export interface DatosRevision {
  url: string;
  anonKey: string;
  /** Opcionales: sin ellos se revisa sólo lo que se puede ver sin sesión. */
  correo?: string;
  clave?: string;
}

export async function revisarInstalacion({
  url,
  anonKey,
  correo,
  clave,
}: DatosRevision): Promise<Prueba[]> {
  const limpia = url.trim().replace(/\/+$/, "");
  const llave = anonKey.trim();
  const hechas = new Map<string, Prueba>();
  const cerrar = () => ORDEN.map((id) => hechas.get(id) ?? omitida(id));

  const anonimo = nuevoCliente(limpia, llave);

  const proyecto = await probarProyecto(limpia, llave, anonimo);
  hechas.set("proyecto", proyecto);
  if (proyecto.estado === "falla") return cerrar();

  const { prueba: tablas, expuestas } = await probarTablas(anonimo);
  hechas.set("tablas", tablas);
  if (tablas.estado === "falla") return cerrar();

  if (expuestas.length > 0) {
    const detalle = expuestas.map((e) => `${e.tabla} (${e.filas})`).join(", ");
    hechas.set("rls", {
      id: "rls",
      titulo: TITULOS.rls,
      estado: "falla",
      detalle: `Sin sesión ya se alcanzan a leer filas de: ${detalle}. Las fichas de los niños están a la vista de cualquiera que abra el sitio.`,
      remedio:
        "Falta la parte de seguridad del esquema. Vuelva a correr supabase/schema.sql completo: " +
        "activa RLS en las cuatro tablas y deja las políticas sólo para usuarios con sesión.",
    });

  } else {
    // Provisional: sin sesión no se ve nada, que es lo que se espera, pero
    // podría ser que la base esté vacía. Se confirma más abajo, comparando con
    // lo que sí se ve con sesión.
    hechas.set("rls", {
      id: "rls",
      titulo: TITULOS.rls,
      estado: "aviso",
      detalle:
        "Sin sesión no se ve ninguna fila, que es lo correcto. Para confirmarlo del todo hace falta comparar con lo que sí se ve con sesión.",
      remedio: "Escriba el correo y la clave de un entrenador y vuelva a revisar.",
    });
  }

  if (!correo || !clave) {
    const motivo = "Falta el correo y la clave de un entrenador.";
    for (const id of ["sesion", "lectura", "escritura"] as const) {
      hechas.set(id, omitida(id, motivo));
    }
    return cerrar();
  }

  const conSesion = nuevoCliente(limpia, llave);
  const entrada = await conSesion.auth.signInWithPassword({ email: correo.trim(), password: clave });

  if (entrada.error) {
    hechas.set("sesion", {
      id: "sesion",
      titulo: TITULOS.sesion,
      estado: "falla",
      detalle: entrada.error.message,
      remedio:
        "Cree la cuenta en Supabase → Authentication → Users → Add user, y marque «Auto Confirm User» " +
        "para no tener que pasar por el correo de confirmación.",
    });
    return cerrar();
  }

  hechas.set("sesion", {
    id: "sesion",
    titulo: TITULOS.sesion,
    estado: "ok",
    detalle: `Entró como ${entrada.data.user?.email ?? correo.trim()}.`,
  });

  try {
    const lectura = await probarLectura(conSesion);
    hechas.set("lectura", lectura);

    if (lectura.estado !== "ok") {
      hechas.set("escritura", omitida("escritura", "Antes hay que poder leer."));
    } else {
      hechas.set("escritura", await probarEscritura(conSesion));
    }

    // Durante la prueba de escritura hubo al menos una fila. Que el cliente
    // anónimo siguiera viendo cero no es que la base esté vacía: es el RLS. Sin
    // esa escritura la comparación no existe, y hay que decirlo con el motivo
    // verdadero: el consejo provisional pedía unas credenciales ya entregadas.
    if (expuestas.length === 0) {
      const escrituraOk = hechas.get("escritura")?.estado === "ok";
      hechas.set("rls", {
        id: "rls",
        titulo: TITULOS.rls,
        estado: escrituraOk ? "ok" : "aviso",
        detalle: escrituraOk
          ? "Con sesión se leen las tablas y sin sesión no se ve ninguna fila. Las políticas están puestas."
          : "Sin sesión no se ve ninguna fila, que es lo correcto, pero podría ser sólo que la base esté vacía.",
        remedio: escrituraOk
          ? undefined
          : "Para confirmarlo hace falta que la prueba de guardar funcione: corrija lo de más abajo y vuelva a revisar.",
      });
    }
  } finally {
    await conSesion.auth.signOut();
  }

  return cerrar();
}

/**
 * ¿La clave fue rechazada por el portero de Supabase?
 *
 * Se mira el error de una consulta de verdad, no el código del endpoint raíz.
 * La primera versión preguntaba por `/rest/v1/` mandando sólo la cabecera
 * `apikey`, y Supabase exige además `Authorization: Bearer`: devolvía 401 con
 * claves perfectamente válidas, y el diagnóstico acusaba a la escuela de un
 * error que no había cometido mientras la aplicación funcionaba al lado.
 */
function claveRechazada(error: ErrorPostgrest): boolean {
  return (
    error.code === "401" ||
    error.code === "PGRST301" ||
    /invalid api key|no api key|api key found|jwt/i.test(error.message)
  );
}

async function probarProyecto(url: string, anonKey: string, sb: Cliente): Promise<Prueba> {
  const titulo = TITULOS.proyecto;

  // Primero, que el host conteste algo. Cualquier respuesta sirve: lo que se
  // descarta acá es la dirección mal escrita y el proyecto en pausa.
  try {
    await fetch(`${url}/rest/v1/`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
  } catch {
    return {
      id: "proyecto",
      titulo,
      estado: "falla",
      detalle: "No hubo respuesta de esa dirección.",
      remedio:
        "Puede ser que la dirección esté mal escrita —tiene que verse como https://abcdefgh.supabase.co— " +
        "o que el proyecto esté en pausa. Supabase pausa los proyectos gratuitos tras unos días sin uso; " +
        "se reactivan desde el panel con «Restore project».",
    };
  }

  // Y ahora la clave, preguntada con la misma consulta que hace la aplicación.
  // Así el diagnóstico no puede contradecirla: si una entra, la otra también.
  const r = await contar(sb, TABLAS[0]);
  if (r.error && claveRechazada(r.error)) {
    return {
      id: "proyecto",
      titulo,
      estado: "falla",
      detalle: `El proyecto responde, pero rechaza la clave: ${r.error.message}`,
      remedio:
        "Copie de nuevo la clave desde Project Settings → API. Tiene que ser la «anon public», " +
        "no la «service_role» ni la contraseña de la base de datos.",
    };
  }

  // Que la tabla no exista no es problema de la clave: la clave pasó el portero
  // y por eso llegamos a que Postgres se queje de otra cosa. Eso lo levanta la
  // prueba siguiente.
  return { id: "proyecto", titulo, estado: "ok", detalle: "La dirección y la clave son válidas." };
}

interface Expuesta {
  tabla: string;
  filas: number;
}

async function probarTablas(
  sb: Cliente,
): Promise<{ prueba: Prueba; expuestas: Expuesta[] }> {
  const titulo = TITULOS.tablas;
  const faltantes: string[] = [];
  const otros: string[] = [];
  const expuestas: Expuesta[] = [];

  for (const tabla of TABLAS) {
    const r = await contar(sb, tabla);
    if (r.error) {
      if (tablaAusente(r.error)) faltantes.push(tabla);
      else otros.push(`${tabla}: ${r.error.message || `error ${r.error.code ?? "desconocido"}`}`);
      continue;
    }
    if (r.filas > 0) expuestas.push({ tabla, filas: r.filas });
  }

  if (faltantes.length > 0) {
    return {
      prueba: {
        id: "tablas",
        titulo,
        estado: "falla",
        detalle: `Falta${faltantes.length > 1 ? "n" : ""}: ${faltantes.join(", ")}.`,
        remedio: CORRER_ESQUEMA,
      },
      expuestas,
    };
  }
  if (otros.length > 0) {
    return {
      prueba: { id: "tablas", titulo, estado: "falla", detalle: otros.join(" · "), remedio: CORRER_ESQUEMA },
      expuestas,
    };
  }
  return {
    prueba: {
      id: "tablas",
      titulo,
      estado: "ok",
      detalle: "jugadores, evaluaciones, rubrica y hojas responden.",
    },
    expuestas,
  };
}

async function probarLectura(sb: Cliente): Promise<Prueba> {
  const titulo = TITULOS.lectura;
  for (const tabla of TABLAS) {
    const r = await contar(sb, tabla);
    if (r.error) {
      return {
        id: "lectura",
        titulo,
        estado: "falla",
        detalle: `${tabla}: ${r.error.message || `error ${r.error.code ?? "desconocido"}`}`,
        remedio:
          "Falta la política de lectura de esa tabla. Vuelva a correr supabase/schema.sql completo.",
      };
    }
  }
  return { id: "lectura", titulo, estado: "ok", detalle: "Las cuatro tablas se dejan consultar." };
}

/**
 * Escribe una ficha de prueba y la borra. Es la única forma de saber que las
 * políticas de escritura están puestas: leer funciona con políticas a medias.
 * Queda marcada como inactiva y con un código reconocible por si el borrado
 * llegara a fallar.
 */
async function probarEscritura(sb: Cliente): Promise<Prueba> {
  const titulo = TITULOS.escritura;
  const marca = Math.random().toString(36).slice(2, 8).toUpperCase();
  const id = `diagnostico-${marca}`;
  const codigo = `CGA-PRUEBA-${marca}`;

  const alta = await sb.from("jugadores").insert({
    id,
    codigo,
    categoria: null,
    activo: false,
    datos: { prueba: true, creadoEn: new Date().toISOString() },
  });

  if (alta.error) {
    return {
      id: "escritura",
      titulo,
      estado: "falla",
      detalle: alta.error.message,
      remedio:
        "Falta la política de escritura. Vuelva a correr supabase/schema.sql completo: " +
        "crea una política «for all» por tabla para los usuarios con sesión.",
    };
  }

  const baja = await sb.from("jugadores").delete().eq("id", id);
  if (baja.error) {
    return {
      id: "escritura",
      titulo,
      estado: "aviso",
      detalle: `Se pudo guardar, pero no borrar la ficha de prueba: ${baja.error.message}`,
      remedio: `Borre a mano la fila con código ${codigo} en Supabase → Table Editor → jugadores.`,
    };
  }

  return {
    id: "escritura",
    titulo,
    estado: "ok",
    detalle: "Se guardó una ficha de prueba y se borró sin dejar rastro.",
  };
}

function omitida(id: (typeof ORDEN)[number], motivo = "No se llegó a esta prueba."): Prueba {
  return { id, titulo: TITULOS[id], estado: "omitida", detalle: motivo };
}
