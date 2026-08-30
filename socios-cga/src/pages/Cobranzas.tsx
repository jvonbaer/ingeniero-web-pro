import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChipEstado, ChipRama, Metrica, Vacio } from "../components/ui";
import { useDatos } from "../data/DatosContext";
import { nuevoId } from "../data/store";
import { estadoCobro, formatoPesos, type EstadoCobro } from "../domain/cobros";
import {
  destinatarioDe,
  enlaceCorreo,
  enlaceWhatsApp,
  mensajeRenovacion,
  yaAvisado,
  type Destinatario,
} from "../domain/avisos";
import { enPalabras, formatoCorto } from "../domain/fechas";
import type { Inscripcion, Plan } from "../domain/types";
import { nombreCompleto } from "../domain/types";
import { ModalPago } from "./modales";

type Pestana = "vencidas" | "por-vencer" | "proximas" | "sin-contacto";

interface Fila {
  inscripcion: Inscripcion;
  plan: Plan | undefined;
  estado: EstadoCobro;
  destinatario: Destinatario;
}

export function Cobranzas() {
  const datos = useDatos();
  const { inscripciones, pagos, planes, porId, vinculos, avisos, guardarAviso } = datos;
  const [pestana, setPestana] = useState<Pestana>("por-vencer");
  const [cobrando, setCobrando] = useState<Inscripcion | null>(null);

  const filas = useMemo<Fila[]>(() => {
    return inscripciones
      .filter((i) => i.estado === "activa")
      .map((inscripcion) => ({
        inscripcion,
        plan: planes.find((p) => p.id === inscripcion.planId),
        estado: estadoCobro(inscripcion, pagos),
        destinatario: destinatarioDe(inscripcion, porId, vinculos),
      }))
      .filter((f) => f.estado.vence)
      .sort((a, b) => a.estado.dias - b.estado.dias);
  }, [inscripciones, pagos, planes, porId, vinculos]);

  const grupos = useMemo(
    () => ({
      vencidas: filas.filter((f) => f.estado.clase === "vencida"),
      "por-vencer": filas.filter((f) => f.estado.clase === "por-vencer"),
      // Lo que viene después de la ventana de aviso: sirve para prever el mes.
      proximas: filas.filter((f) => f.estado.clase === "al-dia" && f.estado.dias <= 30),
      "sin-contacto": filas.filter((f) => !f.destinatario.email && !f.destinatario.telefono),
    }),
    [filas],
  );

  const visibles = grupos[pestana];

  const totalVencido = grupos.vencidas.reduce((s, f) => s + f.inscripcion.valor, 0);
  const totalPorVencer = grupos["por-vencer"].reduce((s, f) => s + f.inscripcion.valor, 0);

  const enviadosHoy = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    return avisos.filter((a) => a.enviadoEn.startsWith(hoy)).length;
  }, [avisos]);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Renovaciones y avisos</span>
          <h1>Cobranzas</h1>
        </div>
        <div className="page-head__acciones no-print">
          <button type="button" className="btn btn--fantasma" onClick={() => window.print()}>
            Imprimir lista
          </button>
        </div>
      </div>

      <div className="grid grid--metricas">
        <Metrica rotulo="Cuotas vencidas" valor={grupos.vencidas.length} tono="alerta" />
        <Metrica rotulo="Monto vencido" valor={formatoPesos(totalVencido)} tono="alerta" />
        <Metrica rotulo="Por vencer" valor={grupos["por-vencer"].length} tono="aviso" />
        <Metrica rotulo="Monto por vencer" valor={formatoPesos(totalPorVencer)} tono="aviso" />
      </div>

      <div className="aviso no-print">
        <p>
          <strong>Cómo funcionan los avisos.</strong> Cada inscripción define con cuántos días de
          anticipación avisar —cinco por omisión— y a quién: al pagador registrado. Desde acá se
          envían a mano, con el texto ya escrito, y el envío automático diario hace lo mismo por
          correo sin que nadie tenga que entrar (ver <code>avisos/enviar.mjs</code> y la sección 6
          del README).
        </p>
        {enviadosHoy > 0 && <p>Hoy se han registrado {enviadosHoy} avisos.</p>}
      </div>

      <div className="pestanas no-print" role="tablist">
        {(
          [
            ["vencidas", "Vencidas"],
            ["por-vencer", "Por vencer"],
            ["proximas", "Próximos 30 días"],
            ["sin-contacto", "Sin contacto"],
          ] as [Pestana, string][]
        ).map(([clave, texto]) => (
          <button
            key={clave}
            type="button"
            role="tab"
            className="pestana"
            aria-selected={pestana === clave}
            onClick={() => setPestana(clave)}
          >
            {texto}
            <span className="pestana__contador">{grupos[clave].length}</span>
          </button>
        ))}
      </div>

      {pestana === "sin-contacto" && grupos["sin-contacto"].length > 0 && (
        <p className="aviso">
          Estas inscripciones no tienen dónde avisar: el pagador no registra correo ni teléfono. Es
          el primer arreglo que conviene hacer, porque ningún aviso automático las alcanza.
        </p>
      )}

      {visibles.length === 0 ? (
        <Vacio titulo="Nada que cobrar acá">
          <p>
            {pestana === "vencidas"
              ? "Ninguna cuota está vencida."
              : pestana === "por-vencer"
                ? "No hay cuotas dentro de su ventana de aviso."
                : pestana === "proximas"
                  ? "No hay vencimientos en los próximos 30 días."
                  : "Todos los pagadores tienen correo o teléfono registrado."}
          </p>
        </Vacio>
      ) : (
        <ul className="lista-limpia">
          {visibles.map((fila) => (
            <FilaCobranza
              key={fila.inscripcion.id}
              fila={fila}
              avisado={yaAvisado(avisos, fila.inscripcion.id, fila.estado.vence)}
              onCobrar={() => setCobrando(fila.inscripcion)}
              onRegistrarAviso={(canal, destino, detalle) =>
                void guardarAviso({
                  id: nuevoId("avi"),
                  inscripcionId: fila.inscripcion.id,
                  vence: fila.estado.vence,
                  canal,
                  destino,
                  enviadoEn: new Date().toISOString(),
                  estado: "manual",
                  detalle,
                })
              }
            />
          ))}
        </ul>
      )}

      {cobrando && <ModalPago inscripcion={cobrando} onCerrar={() => setCobrando(null)} />}
    </>
  );
}

function FilaCobranza({
  fila,
  avisado,
  onCobrar,
  onRegistrarAviso,
}: {
  fila: Fila;
  avisado: { enviadoEn: string; canal: string } | undefined;
  onCobrar: () => void;
  onRegistrarAviso: (canal: "correo" | "whatsapp" | "manual", destino: string, detalle: string) => void;
}) {
  const { porId } = useDatos();
  const { inscripcion, plan, estado, destinatario } = fila;
  const socio = porId.get(inscripcion.personaId);
  const mensaje = mensajeRenovacion(destinatario, socio, plan, inscripcion, estado.vence, estado.dias);

  return (
    <li className="fila">
      <div className="fila__cuerpo">
        <div className="fila__titulo">
          <Link to={`/personas/${inscripcion.personaId}`}>{nombreCompleto(socio)}</Link>
        </div>
        <div className="fila__meta">
          {plan?.nombre ?? "Plan eliminado"} · {formatoPesos(inscripcion.valor)} · vence{" "}
          {formatoCorto(estado.vence)} ({enPalabras(estado.dias)})
        </div>
        <div className="fila__meta">
          Avisar a{" "}
          {destinatario.persona ? (
            <Link to={`/personas/${destinatario.persona.id}`}>{destinatario.nombre}</Link>
          ) : (
            destinatario.nombre
          )}
          {destinatario.email ? ` · ${destinatario.email}` : ""}
          {destinatario.telefono ? ` · ${destinatario.telefono}` : ""}
          {!destinatario.email && !destinatario.telefono ? ` · ${destinatario.motivo}` : ""}
        </div>
        {avisado && (
          <div className="fila__meta">
            Ya avisado el {formatoCorto(avisado.enviadoEn.slice(0, 10))} por {avisado.canal}.
          </div>
        )}
      </div>

      <div className="fila__acciones">
        {plan && <ChipRama rama={plan.rama} />}
        <ChipEstado estado={estado} />

        <div className="no-print" style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {destinatario.email && (
            <a
              className="btn btn--fantasma btn--sm"
              href={enlaceCorreo(destinatario.email, mensaje)}
              onClick={() => onRegistrarAviso("correo", destinatario.email, "Enviado a mano desde Cobranzas")}
            >
              Correo
            </a>
          )}
          {destinatario.telefono && (
            <a
              className="btn btn--fantasma btn--sm"
              href={enlaceWhatsApp(destinatario.telefono, mensaje)}
              target="_blank"
              rel="noreferrer"
              onClick={() =>
                onRegistrarAviso("whatsapp", destinatario.telefono, "Enviado a mano desde Cobranzas")
              }
            >
              WhatsApp
            </a>
          )}
          <button type="button" className="btn btn--primario btn--sm" onClick={onCobrar}>
            Registrar pago
          </button>
        </div>
      </div>
    </li>
  );
}
