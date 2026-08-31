import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Aviso,
  Backup,
  EntradaBitacora,
  Inscripcion,
  Pago,
  Persona,
  Plan,
  Vinculo,
} from "../domain/types";
import { indexar } from "../domain/familia";
import { store } from "./index";
import { construirBackup, estadoVacio, type EstadoDatos } from "./store";

interface Contexto extends EstadoDatos {
  cargando: boolean;
  error: string | null;
  modo: "local" | "nube";
  etiquetaModo: string;
  /** Personas por id: lo usan casi todas las tablas para resolver nombres. */
  porId: Map<string, Persona>;
  guardarPersona: (persona: Persona) => Promise<void>;
  eliminarPersona: (id: string) => Promise<void>;
  guardarVinculo: (vinculo: Vinculo) => Promise<void>;
  eliminarVinculo: (id: string) => Promise<void>;
  guardarPlan: (plan: Plan) => Promise<void>;
  eliminarPlan: (id: string) => Promise<void>;
  guardarInscripcion: (inscripcion: Inscripcion) => Promise<void>;
  eliminarInscripcion: (id: string) => Promise<void>;
  guardarPago: (pago: Pago) => Promise<void>;
  eliminarPago: (id: string) => Promise<void>;
  guardarAviso: (aviso: Aviso) => Promise<void>;
  /** La bitácora se pide aparte: crece sin techo y casi nunca se mira. */
  leerBitacora: (limite?: number) => Promise<EntradaBitacora[]>;
  importar: (backup: Backup) => Promise<void>;
  vaciar: () => Promise<void>;
  exportar: () => Backup;
  recargar: () => Promise<void>;
}

const Ctx = createContext<Contexto | null>(null);

/** Inserta o reemplaza por id, conservando el orden de la lista. */
function fusionar<T extends { id: string }>(lista: T[], registro: T): T[] {
  const i = lista.findIndex((x) => x.id === registro.id);
  if (i < 0) return [...lista, registro];
  const copia = [...lista];
  copia[i] = registro;
  return copia;
}

export function ProveedorDatos({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoDatos>(estadoVacio);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      setEstado(await store.cargar());
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
      setError(e instanceof Error ? e.message : "Ocurrió un error al guardar.");
      throw e;
    }
  }, []);

  const guardarPersona = useCallback(
    (persona: Persona) =>
      conError(async () => {
        await store.guardarPersona(persona);
        setEstado((prev) => ({ ...prev, personas: fusionar(prev.personas, persona) }));
      }),
    [conError],
  );

  /**
   * Al borrar una persona desaparecen con ella sus vínculos —en los dos
   * sentidos— y todo lo que colgaba de sus inscripciones. Se replica acá lo que
   * hacen la base y el driver local, para no tener que recargar todo desde cero.
   */
  const eliminarPersona = useCallback(
    (id: string) =>
      conError(async () => {
        await store.eliminarPersona(id);
        setEstado((prev) => {
          const suyas = new Set(
            prev.inscripciones.filter((i) => i.personaId === id).map((i) => i.id),
          );
          return {
            ...prev,
            personas: prev.personas.filter((p) => p.id !== id),
            vinculos: prev.vinculos.filter((v) => v.personaId !== id && v.adultoId !== id),
            inscripciones: prev.inscripciones.filter((i) => !suyas.has(i.id)),
            pagos: prev.pagos.filter((p) => !suyas.has(p.inscripcionId)),
            avisos: prev.avisos.filter((a) => !suyas.has(a.inscripcionId)),
          };
        });
      }),
    [conError],
  );

  const guardarVinculo = useCallback(
    (vinculo: Vinculo) =>
      conError(async () => {
        await store.guardarVinculo(vinculo);
        setEstado((prev) => ({ ...prev, vinculos: fusionar(prev.vinculos, vinculo) }));
      }),
    [conError],
  );

  const eliminarVinculo = useCallback(
    (id: string) =>
      conError(async () => {
        await store.eliminarVinculo(id);
        setEstado((prev) => ({ ...prev, vinculos: prev.vinculos.filter((v) => v.id !== id) }));
      }),
    [conError],
  );

  const guardarPlan = useCallback(
    (plan: Plan) =>
      conError(async () => {
        await store.guardarPlan(plan);
        setEstado((prev) => ({ ...prev, planes: fusionar(prev.planes, plan) }));
      }),
    [conError],
  );

  const eliminarPlan = useCallback(
    (id: string) =>
      conError(async () => {
        await store.eliminarPlan(id);
        setEstado((prev) => ({ ...prev, planes: prev.planes.filter((p) => p.id !== id) }));
      }),
    [conError],
  );

  const guardarInscripcion = useCallback(
    (inscripcion: Inscripcion) =>
      conError(async () => {
        await store.guardarInscripcion(inscripcion);
        setEstado((prev) => ({
          ...prev,
          inscripciones: fusionar(prev.inscripciones, inscripcion),
        }));
      }),
    [conError],
  );

  const eliminarInscripcion = useCallback(
    (id: string) =>
      conError(async () => {
        await store.eliminarInscripcion(id);
        setEstado((prev) => ({
          ...prev,
          inscripciones: prev.inscripciones.filter((i) => i.id !== id),
          pagos: prev.pagos.filter((p) => p.inscripcionId !== id),
          avisos: prev.avisos.filter((a) => a.inscripcionId !== id),
        }));
      }),
    [conError],
  );

  const guardarPago = useCallback(
    (pago: Pago) =>
      conError(async () => {
        await store.guardarPago(pago);
        setEstado((prev) => ({ ...prev, pagos: fusionar(prev.pagos, pago) }));
      }),
    [conError],
  );

  const eliminarPago = useCallback(
    (id: string) =>
      conError(async () => {
        await store.eliminarPago(id);
        setEstado((prev) => ({ ...prev, pagos: prev.pagos.filter((p) => p.id !== id) }));
      }),
    [conError],
  );

  const guardarAviso = useCallback(
    (aviso: Aviso) =>
      conError(async () => {
        await store.guardarAviso(aviso);
        setEstado((prev) => ({ ...prev, avisos: fusionar(prev.avisos, aviso) }));
      }),
    [conError],
  );

  const importar = useCallback(
    (backup: Backup) =>
      conError(async () => {
        await store.importar(backup);
        setEstado({
          personas: backup.personas,
          vinculos: backup.vinculos,
          planes: backup.planes,
          inscripciones: backup.inscripciones,
          pagos: backup.pagos,
          avisos: backup.avisos,
        });
      }),
    [conError],
  );

  const vaciar = useCallback(
    () =>
      conError(async () => {
        await store.vaciar();
        setEstado(estadoVacio());
      }),
    [conError],
  );

  const porId = useMemo(() => indexar(estado.personas), [estado.personas]);

  const valor = useMemo<Contexto>(
    () => ({
      ...estado,
      porId,
      cargando,
      error,
      modo: store.modo,
      etiquetaModo: store.etiqueta,
      guardarPersona,
      eliminarPersona,
      guardarVinculo,
      eliminarVinculo,
      guardarPlan,
      eliminarPlan,
      guardarInscripcion,
      eliminarInscripcion,
      guardarPago,
      eliminarPago,
      guardarAviso,
      leerBitacora: (limite?: number) => store.bitacora(limite),
      importar,
      vaciar,
      exportar: () => construirBackup(estado),
      recargar,
    }),
    [
      estado, porId, cargando, error, guardarPersona, eliminarPersona, guardarVinculo,
      eliminarVinculo, guardarPlan, eliminarPlan, guardarInscripcion, eliminarInscripcion,
      guardarPago, eliminarPago, guardarAviso, importar, vaciar, recargar,
    ],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useDatos(): Contexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDatos debe usarse dentro de <ProveedorDatos>.");
  return ctx;
}
