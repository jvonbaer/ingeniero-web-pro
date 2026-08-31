import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Metrica, Vacio } from "../components/ui";
import { useDatos } from "../data/DatosContext";
import { useSesion } from "../data/sesion";
import { formatoCorto, hoyISO } from "../domain/fechas";
import type { AccionBitacora, EntradaBitacora } from "../domain/types";
import { nombreCampo, nombreTabla, TABLAS_BITACORA } from "../domain/types";

/** Fecha y hora en una sola línea: `30-08 · 14:35`. */
function cuando(iso: string): string {
  const fecha = iso.slice(0, 10);
  const hora = iso.slice(11, 16);
  return `${formatoCorto(fecha)} · ${hora}`;
}

/** Un valor de la base, escrito como para leerlo en pantalla. */
function comoTexto(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "sí" : "no";
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

export function Bitacora() {
  const { leerBitacora, modo } = useDatos();
  const { modo: modoSesion } = useSesion();
  // Desde la ficha de una persona se llega acá con su nombre ya puesto en la
  // búsqueda: es la pregunta que uno trae cuando abre esta pantalla.
  const [parametros] = useSearchParams();
  const [entradas, setEntradas] = useState<EntradaBitacora[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limite, setLimite] = useState(500);
  const [consulta, setConsulta] = useState(parametros.get("q") ?? "");
  const [usuario, setUsuario] = useState("");
  const [tabla, setTabla] = useState("");
  const [accion, setAccion] = useState<AccionBitacora | "">("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);

  const cargar = useCallback(
    async (cuantas: number) => {
      setError(null);
      try {
        setEntradas(await leerBitacora(cuantas));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo leer la bitácora.");
      }
    },
    [leerBitacora],
  );

  useEffect(() => {
    void cargar(limite);
  }, [cargar, limite]);

  const usuarios = useMemo(
    () => [...new Set((entradas ?? []).map((e) => e.usuario))].sort((a, b) => a.localeCompare(b, "es")),
    [entradas],
  );

  const filas = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    return (entradas ?? []).filter((e) => {
      const fecha = e.ocurridoEn.slice(0, 10);
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;
      if (usuario && e.usuario !== usuario) return false;
      if (tabla && e.tabla !== tabla) return false;
      if (accion && e.accion !== accion) return false;
      if (!q) return true;
      return (
        e.descripcion.toLowerCase().includes(q) ||
        e.usuario.toLowerCase().includes(q) ||
        e.registroId.toLowerCase().includes(q)
      );
    });
  }, [entradas, consulta, usuario, tabla, accion, desde, hasta]);

  const deHoy = useMemo(
    () => (entradas ?? []).filter((e) => e.ocurridoEn.slice(0, 10) === hoyISO()).length,
    [entradas],
  );

  function exportarCsv() {
    const escapar = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const columnas = ["fecha", "hora", "quien", "accion", "tabla", "sobre_que", "registro", "cambios"];
    const lineas = filas.map((e) =>
      [
        e.ocurridoEn.slice(0, 10),
        e.ocurridoEn.slice(11, 19),
        e.usuario,
        e.accion,
        nombreTabla(e.tabla),
        e.descripcion,
        e.registroId,
        e.cambios
          ? Object.entries(e.cambios)
              .map(([c, v]) => `${nombreCampo(c)}: ${comoTexto(v.antes)} → ${comoTexto(v.despues)}`)
              .join(" | ")
          : "",
      ]
        .map(escapar)
        .join(";"),
    );
    const csv = `﻿${columnas.join(";")}\r\n${lineas.join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `bitacora-cga-${hoyISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Quién hizo qué</span>
          <h1>Bitácora</h1>
        </div>
        <div className="page-head__acciones no-print">
          <button type="button" className="btn btn--fantasma" onClick={exportarCsv}>
            Exportar CSV
          </button>
          <button type="button" className="btn btn--fantasma" onClick={() => window.print()}>
            Imprimir
          </button>
        </div>
      </div>

      {modo === "nube" ? (
        <div className="aviso aviso--ok no-print">
          <p>
            <strong>Esta bitácora la escribe la base de datos, no la aplicación.</strong> Cada alta,
            cambio o baja queda anotada con el correo de la cuenta que la hizo, sacado del token de
            la sesión: nadie puede firmar con el nombre de otro, ni siquiera editando desde
            Supabase. Desde acá sólo se lee — no hay forma de corregir ni borrar una línea.
          </p>
        </div>
      ) : (
        <div className="aviso no-print">
          <p>
            <strong>Esta copia guarda los datos sólo en este computador</strong>, así que la
            bitácora anota el nombre que se escribió al entrar, sin ninguna cuenta que lo respalde.
            Sirve para ordenarse; no sirve como prueba. La huella de verdad exige la base
            compartida: vea <em>Datos → Conexión con la nube</em>.
          </p>
        </div>
      )}

      {error && (
        <div className="aviso" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid--metricas">
        <Metrica rotulo="Movimientos cargados" valor={entradas?.length ?? 0} />
        <Metrica rotulo="Movimientos hoy" valor={deHoy} />
        <Metrica rotulo="Personas que trabajaron" valor={usuarios.length} />
        <Metrica rotulo="En pantalla" valor={filas.length} />
      </div>

      <div className="filtros no-print">
        <input
          className="input"
          type="search"
          placeholder="Buscar por nombre o descripción"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          aria-label="Buscar"
        />
        <select
          className="select"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          aria-label="Quién"
        >
          <option value="">Cualquier persona</option>
          {usuarios.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={tabla}
          onChange={(e) => setTabla(e.target.value)}
          aria-label="Sobre qué"
        >
          <option value="">Todo el sistema</option>
          {TABLAS_BITACORA.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={accion}
          onChange={(e) => setAccion(e.target.value as AccionBitacora | "")}
          aria-label="Qué hizo"
        >
          <option value="">Cualquier acción</option>
          <option value="creó">Creó</option>
          <option value="modificó">Modificó</option>
          <option value="eliminó">Eliminó</option>
        </select>
        <input
          className="input"
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          aria-label="Desde"
        />
        <input
          className="input"
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          aria-label="Hasta"
        />
      </div>

      {entradas === null ? (
        <p className="vacio">Cargando la bitácora…</p>
      ) : filas.length === 0 ? (
        <Vacio titulo="No hay movimientos que mostrar">
          <p>
            {entradas.length === 0
              ? "Todavía no se ha guardado nada. La bitácora se llena sola a medida que se trabaja."
              : "Ningún movimiento coincide con los filtros aplicados."}
          </p>
        </Vacio>
      ) : (
        <div className="card">
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Cuándo</th>
                  <th>Quién</th>
                  <th>Qué hizo</th>
                  <th>Sobre qué</th>
                  <th className="no-print" />
                </tr>
              </thead>
              <tbody>
                {filas.map((e) => (
                  <Fragment key={e.id}>
                    <tr>
                      <td className="mono">{cuando(e.ocurridoEn)}</td>
                      <td>{e.usuario}</td>
                      <td>
                        <span className={`estado estado--${e.accion === "eliminó" ? "vencida" : e.accion === "creó" ? "al-dia" : "por-vencer"}`}>
                          {e.accion}
                        </span>{" "}
                        {nombreTabla(e.tabla).toLowerCase()}
                      </td>
                      <td>{e.descripcion || e.registroId}</td>
                      <td className="no-print">
                        {e.cambios && (
                          <button
                            type="button"
                            className="btn btn--fantasma btn--sm"
                            onClick={() => setAbierta(abierta === e.id ? null : e.id)}
                          >
                            {abierta === e.id ? "Ocultar" : "Ver cambios"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {abierta === e.id && e.cambios && (
                      <tr>
                        <td colSpan={5} style={{ background: "var(--hueso)" }}>
                          <dl className="datos-lista">
                            {Object.entries(e.cambios).map(([campo, valor]) => (
                              <Fragment key={campo}>
                                <dt>{nombreCampo(campo)}</dt>
                                <dd>
                                  <span className="texto-suave">{comoTexto(valor.antes)}</span>
                                  {"  →  "}
                                  <strong>{comoTexto(valor.despues)}</strong>
                                </dd>
                              </Fragment>
                            ))}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {entradas !== null && entradas.length >= limite && (
        <div className="no-print" style={{ marginTop: 14, textAlign: "center" }}>
          <button
            type="button"
            className="btn btn--fantasma"
            onClick={() => setLimite((n) => n + 1000)}
          >
            Cargar movimientos más antiguos
          </button>
        </div>
      )}

      {modoSesion === "local" && entradas !== null && entradas.length > 0 && (
        <p className="campo__ayuda no-print" style={{ marginTop: 14 }}>
          Se guardan los últimos 3.000 movimientos de este computador. En la base compartida no hay
          tope: queda todo.
        </p>
      )}
    </>
  );
}
