import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { borrarOperador, guardarOperador, operadorActual } from "./operador";
import { db, nubeConfigurada } from "./supabaseDriver";

type Estado = "cargando" | "sin-sesion" | "con-sesion";

interface Sesion {
  estado: Estado;
  /** `nube` = cuentas de verdad; `local` = sólo un nombre en este computador. */
  modo: "nube" | "local";
  /** Quién está trabajando: el correo de la cuenta, o el nombre configurado. */
  usuario: string;
  entrar: (email: string, clave: string) => Promise<void>;
  /** Modo local: dejar dicho quién está en el teclado. */
  identificarse: (nombre: string) => void;
  salir: () => Promise<void>;
}

const Ctx = createContext<Sesion | null>(null);

/**
 * Quién entra y con qué garantías.
 *
 * Contra la base compartida la identidad es de verdad: cada persona tiene su
 * cuenta, y la base firma cada fila con el correo que viene dentro del token,
 * sin que el navegador pueda meter mano. Eso es lo que hace que la bitácora
 * sirva para responder «quién ingresó este dato».
 *
 * Trabajando sólo contra este computador no hay servidor que verifique nada, y
 * pedir una clave sería un teatro: cualquiera podría borrarla desde el propio
 * navegador. Lo que se pide entonces es un nombre, la bitácora lo anota como
 * «sin cuenta» y la aplicación lo dice en pantalla, para que nadie confunda las
 * dos cosas.
 */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(() => {
    if (nubeConfigurada) return "cargando";
    return operadorActual() ? "con-sesion" : "sin-sesion";
  });
  const [usuario, setUsuario] = useState<string>(nubeConfigurada ? "" : operadorActual());

  useEffect(() => {
    if (!nubeConfigurada) return;
    let vigente = true;

    void db()
      .auth.getSession()
      .then(({ data }) => {
        if (!vigente) return;
        setUsuario(data.session?.user.email ?? "");
        setEstado(data.session ? "con-sesion" : "sin-sesion");
      });

    const { data: sub } = db().auth.onAuthStateChange((_evento, sesion) => {
      setUsuario(sesion?.user.email ?? "");
      setEstado(sesion ? "con-sesion" : "sin-sesion");
    });

    return () => {
      vigente = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const valor: Sesion = {
    estado,
    modo: nubeConfigurada ? "nube" : "local",
    usuario,
    async entrar(correo, clave) {
      const { error } = await db().auth.signInWithPassword({ email: correo, password: clave });
      if (error) throw new Error("Correo o clave incorrectos.");
    },
    identificarse(nombre) {
      guardarOperador(nombre);
      setUsuario(nombre.trim());
      setEstado("con-sesion");
    },
    async salir() {
      if (nubeConfigurada) {
        await db().auth.signOut();
        return;
      }
      borrarOperador();
      setUsuario("");
      setEstado("sin-sesion");
    },
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSesion(): Sesion {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSesion debe usarse dentro de <ProveedorSesion>.");
  return ctx;
}
