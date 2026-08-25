import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { db, nubeConfigurada } from "./supabaseDriver";

type Estado = "cargando" | "sin-sesion" | "con-sesion";

interface Sesion {
  estado: Estado;
  email: string | null;
  requiereAcceso: boolean;
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
 */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(nubeConfigurada ? "cargando" : "con-sesion");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!nubeConfigurada) return;
    let vigente = true;

    void db()
      .auth.getSession()
      .then(({ data }) => {
        if (!vigente) return;
        setEmail(data.session?.user.email ?? null);
        setEstado(data.session ? "con-sesion" : "sin-sesion");
      });

    const { data: sub } = db().auth.onAuthStateChange((_evento, sesion) => {
      setEmail(sesion?.user.email ?? null);
      setEstado(sesion ? "con-sesion" : "sin-sesion");
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

export function useSesion(): Sesion {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSesion debe usarse dentro de <ProveedorSesion>.");
  return ctx;
}
