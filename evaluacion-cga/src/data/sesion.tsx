import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { esTablaAusente } from "./mensajes";
import { db, nubeConfigurada } from "./supabaseDriver";

type Estado = "cargando" | "sin-sesion" | "con-sesion";

export type Rol = "admin" | "entrenador";

interface Sesion {
  estado: Estado;
  email: string | null;
  requiereAcceso: boolean;
  rol: Rol;
  /**
   * Qué puede hacer quien está conectado, según la tabla `perfiles`.
   *
   * Esto NO es la seguridad: es la cortesía de no mostrar botones que la base
   * va a rechazar igual. Quien manda son las políticas de supabase, porque la
   * clave anónima viaja dentro del sitio y cualquiera puede consultar la base
   * sin pasar por esta pantalla.
   */
  esAdmin: boolean;
  entrar: (email: string, clave: string) => Promise<void>;
  salir: () => Promise<void>;
}

const Ctx = createContext<Sesion | null>(null);

/**
 * Control de acceso del modo nube.
 *
 * En modo local no hay nada que proteger más allá del propio dispositivo. En
 * modo nube sí: la base guarda nombres, fotos y correos de menores de edad, así
 * que sólo entra quien tenga una cuenta creada por el club. Las políticas RLS
 * de supabase/schema.sql rechazan cualquier lectura sin sesión, de modo que la
 * clave anónima publicada en el sitio no alcanza para ver nada.
 *
 * Además del "quién entra" está el "qué puede hacer": el rol se lee de la tabla
 * `perfiles` y separa al club del cuerpo técnico. Un entrenador evalúa, inscribe
 * camisetas y edita fichas; borrar historial y tocar las pautas queda para el
 * administrador.
 */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(nubeConfigurada ? "cargando" : "con-sesion");
  const [email, setEmail] = useState<string | null>(null);
  // En el propio dispositivo no hay cuentas ni nada que repartir: quien lo tiene
  // en la mano es el dueño de esos datos.
  const [rol, setRol] = useState<Rol>(nubeConfigurada ? "entrenador" : "admin");

  useEffect(() => {
    if (!nubeConfigurada) return;
    let vigente = true;

    const resolver = async (usuarioId: string | undefined) => {
      if (!usuarioId) {
        setRol("entrenador");
        return;
      }
      setRol(await leerRol(usuarioId));
    };

    void db()
      .auth.getSession()
      .then(async ({ data }) => {
        if (!vigente) return;
        setEmail(data.session?.user.email ?? null);
        await resolver(data.session?.user.id);
        if (!vigente) return;
        setEstado(data.session ? "con-sesion" : "sin-sesion");
      });

    const { data: sub } = db().auth.onAuthStateChange((_evento, sesion) => {
      setEmail(sesion?.user.email ?? null);
      setEstado(sesion ? "con-sesion" : "sin-sesion");
      void resolver(sesion?.user.id);
    });

    return () => {
      vigente = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const valor: Sesion = {
    estado,
    email,
    requiereAcceso: nubeConfigurada,
    rol,
    esAdmin: rol === "admin",
    async entrar(correo, clave) {
      const { error } = await db().auth.signInWithPassword({ email: correo, password: clave });
      if (error) throw new Error("Correo o clave incorrectos.");
    },
    async salir() {
      await db().auth.signOut();
    },
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

/**
 * Rol de una cuenta, leído de `perfiles`.
 *
 * Los dos casos raros se resuelven hacia lados distintos, y a propósito:
 *
 *  · La tabla no existe todavía —el club no ha corrido migracion-roles.sql—:
 *    se devuelve `admin`. Antes de esa migración la base le permite todo a
 *    cualquiera con sesión, así que esconder botones sólo confundiría sin
 *    proteger nada. El día que se corra la migración, empieza a mandar.
 *
 *  · La cuenta no tiene fila, o la consulta falla por otra razón: se devuelve
 *    `entrenador`. Ante la duda, el que menos permisos tiene.
 */
async function leerRol(usuarioId: string): Promise<Rol> {
  try {
    const { data, error } = await db()
      .from("perfiles")
      .select("rol")
      .eq("id", usuarioId)
      .maybeSingle();

    if (error) return esTablaAusente(error.message) ? "admin" : "entrenador";
    return data?.rol === "admin" ? "admin" : "entrenador";
  } catch {
    return "entrenador";
  }
}

export function useSesion(): Sesion {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSesion debe usarse dentro de <ProveedorSesion>.");
  return ctx;
}
