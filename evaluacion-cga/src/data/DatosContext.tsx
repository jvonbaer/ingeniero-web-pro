import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { RUBRICA_BASE } from "../config/rubrica";
import type { Backup, Evaluacion, Jugador, Rubrica } from "../domain/types";
import { store } from "./index";
import { construirBackup, type EstadoDatos } from "./store";

interface Contexto extends EstadoDatos {
  cargando: boolean;
  error: string | null;
  modo: "local" | "nube";
  etiquetaModo: string;
  guardarJugador: (jugador: Jugador) => Promise<void>;
  eliminarJugador: (id: string) => Promise<void>;
  guardarEvaluacion: (evaluacion: Evaluacion) => Promise<void>;
  eliminarEvaluacion: (id: string) => Promise<void>;
  guardarRubrica: (rubrica: Rubrica) => Promise<void>;
  importar: (backup: Backup) => Promise<void>;
  exportar: () => Backup;
  recargar: () => Promise<void>;
}

const Ctx = createContext<Contexto | null>(null);

export function ProveedorDatos({ children }: { children: ReactNode }) {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [rubrica, setRubrica] = useState<Rubrica>(RUBRICA_BASE);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const estado = await store.cargar();
      setJugadores(estado.jugadores);
      setEvaluaciones(estado.evaluaciones);
      setRubrica(estado.rubrica);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los datos.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  /** Escribe primero en el almacenamiento y sólo después refresca la pantalla. */
  const conError = useCallback(async (accion: () => Promise<void>) => {
    try {
      await accion();
      setError(null);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "Ocurrió un error al guardar.";
      setError(mensaje);
      throw e;
    }
  }, []);

  const guardarJugador = useCallback(
    async (jugador: Jugador) => {
      await conError(async () => {
        await store.guardarJugador(jugador);
        setJugadores((prev) => {
          const i = prev.findIndex((j) => j.id === jugador.id);
          if (i < 0) return [...prev, jugador];
          const copia = [...prev];
          copia[i] = jugador;
          return copia;
        });
      });
    },
    [conError],
  );

  const eliminarJugador = useCallback(
    async (id: string) => {
      await conError(async () => {
        await store.eliminarJugador(id);
        setJugadores((prev) => prev.filter((j) => j.id !== id));
        setEvaluaciones((prev) => prev.filter((e) => e.jugadorId !== id));
      });
    },
    [conError],
  );

  const guardarEvaluacion = useCallback(
    async (evaluacion: Evaluacion) => {
      await conError(async () => {
        await store.guardarEvaluacion(evaluacion);
        setEvaluaciones((prev) => {
          const i = prev.findIndex((e) => e.id === evaluacion.id);
          if (i < 0) return [...prev, evaluacion];
          const copia = [...prev];
          copia[i] = evaluacion;
          return copia;
        });
      });
    },
    [conError],
  );

  const eliminarEvaluacion = useCallback(
    async (id: string) => {
      await conError(async () => {
        await store.eliminarEvaluacion(id);
        setEvaluaciones((prev) => prev.filter((e) => e.id !== id));
      });
    },
    [conError],
  );

  const guardarRubrica = useCallback(
    async (nueva: Rubrica) => {
      await conError(async () => {
        await store.guardarRubrica(nueva);
        setRubrica(nueva);
      });
    },
    [conError],
  );

  const importar = useCallback(
    async (backup: Backup) => {
      await conError(async () => {
        await store.importar(backup);
        setJugadores(backup.jugadores);
        setEvaluaciones(backup.evaluaciones);
        setRubrica(backup.rubrica);
      });
    },
    [conError],
  );

  const valor = useMemo<Contexto>(
    () => ({
      jugadores,
      evaluaciones,
      rubrica,
      cargando,
      error,
      modo: store.modo,
      etiquetaModo: store.etiqueta,
      guardarJugador,
      eliminarJugador,
      guardarEvaluacion,
      eliminarEvaluacion,
      guardarRubrica,
      importar,
      exportar: () => construirBackup({ jugadores, evaluaciones, rubrica }),
      recargar,
    }),
    [
      jugadores, evaluaciones, rubrica, cargando, error,
      guardarJugador, eliminarJugador, guardarEvaluacion,
      eliminarEvaluacion, guardarRubrica, importar, recargar,
    ],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useDatos(): Contexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDatos debe usarse dentro de <ProveedorDatos>.");
  return ctx;
}
