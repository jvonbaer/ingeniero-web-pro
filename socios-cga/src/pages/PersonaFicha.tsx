import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChipEstado, ChipRama, Confirmar, Modal, Vacio } from "../components/ui";
import { useDatos } from "../data/DatosContext";
import {
  cargaMensual,
  estadoCobro,
  formatoPesos,
  motivoParaNoEliminar,
  totalPagado,
} from "../domain/cobros";
import { aCargoDe, hermanosDe, responsablesDe } from "../domain/familia";
import { edad, enPalabras, formatoCorto, formatoLargo } from "../domain/fechas";
import { formatearRut } from "../domain/rut";
import type { Inscripcion, Persona } from "../domain/types";
import { DIAS_SEMANA, nombreCompleto, nombrePeriodicidad, TIPOS_VINCULO } from "../domain/types";
import { ModalInscripcion, ModalPago, ModalVinculo } from "./modales";

export function PersonaFicha() {
  const { id = "" } = useParams();
  const navegar = useNavigate();
  const datos = useDatos();
  const {
    porId,
    vinculos,
    planes,
    inscripciones,
    pagos,
    guardarVinculo,
    eliminarVinculo,
    guardarInscripcion,
    guardarPersona,
    eliminarPersona,
  } = datos;

  const persona = porId.get(id);
  const [modal, setModal] = useState<
    | { tipo: "inscripcion"; inscripcion?: Inscripcion }
    | { tipo: "pago"; inscripcion: Inscripcion }
    | { tipo: "vinculo" }
    | { tipo: "borrar" }
    | null
  >(null);

  const propias = useMemo(
    () => inscripciones.filter((i) => i.personaId === id),
    [inscripciones, id],
  );
  /** Lo que esta persona paga por otros: la vista del apoderado. */
  const comoPagador = useMemo(
    () => inscripciones.filter((i) => i.pagadorId === id && i.personaId !== id),
    [inscripciones, id],
  );
  const responsables = useMemo(() => responsablesDe(id, vinculos), [vinculos, id]);
  const cargas = useMemo(() => aCargoDe(id, vinculos), [vinculos, id]);
  const hermanos = useMemo(() => hermanosDe(id, vinculos), [vinculos, id]);

  const impedimento = useMemo(
    () => motivoParaNoEliminar(id, inscripciones, pagos),
    [id, inscripciones, pagos],
  );

  const pagosRecibidos = useMemo(() => {
    const suyas = new Set([...propias, ...comoPagador].map((i) => i.id));
    return pagos
      .filter((p) => suyas.has(p.inscripcionId))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [pagos, propias, comoPagador]);

  if (!persona) {
    return (
      <Vacio titulo="Esta ficha no existe">
        <Link className="btn btn--fantasma" to="/">
          Volver al listado
        </Link>
      </Vacio>
    );
  }

  const años = edad(persona.fechaNacimiento);
  const menor = años !== null && años < 18;
  const aCargoTotal = cargaMensual([...propias, ...comoPagador]);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">
            {menor ? "Menor de edad" : persona.socio ? "Socio del club" : "Ficha de persona"}
          </span>
          <h1>{nombreCompleto(persona)}</h1>
          <div className="persona-item__meta" style={{ marginTop: 6 }}>
            {persona.rut && <span>{formatearRut(persona.rut)}</span>}
            {años !== null && <span>{años} años</span>}
            {persona.numeroSocio && <span>Socio {persona.numeroSocio}</span>}
            {!persona.activo && <span className="estado estado--vencida">Retirado</span>}
          </div>
        </div>
        <div className="page-head__acciones no-print">
          <Link className="btn btn--fantasma" to={`/personas/${persona.id}/editar`}>
            Editar ficha
          </Link>
          <button
            type="button"
            className="btn btn--primario"
            onClick={() => setModal({ tipo: "inscripcion" })}
          >
            + Inscribir en un plan
          </button>
        </div>
      </div>

      <div className="grid grid--ficha">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 className="card__titulo">Datos</h2>
            <div className="card__cuerpo">
              <dl className="datos-lista">
                <dt>RUT</dt>
                <dd>{persona.rut ? formatearRut(persona.rut) : persona.documento || "—"}</dd>
                <dt>Nacimiento</dt>
                <dd>{persona.fechaNacimiento ? formatoLargo(persona.fechaNacimiento) : "—"}</dd>
                <dt>Correo</dt>
                <dd>{persona.email || "—"}</dd>
                <dt>Teléfono</dt>
                <dd>{persona.telefono || "—"}</dd>
                <dt>Dirección</dt>
                <dd>{[persona.direccion, persona.comuna].filter(Boolean).join(", ") || "—"}</dd>
                {persona.socio && (
                  <>
                    <dt>Socio desde</dt>
                    <dd>{persona.fechaIngreso ? formatoLargo(persona.fechaIngreso) : "—"}</dd>
                    <dt>Categoría</dt>
                    <dd>{persona.categoriaSocio || "—"}</dd>
                  </>
                )}
                <dt>Imagen</dt>
                <dd>{persona.autorizaImagen ? "Autoriza su uso" : "Sin autorización registrada"}</dd>
              </dl>
            </div>
          </div>

          {(persona.contactoEmergencia || persona.observacionesSalud || persona.prevision) && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h2 className="card__titulo">Salud y emergencia</h2>
              <div className="card__cuerpo">
                <dl className="datos-lista">
                  <dt>Contacto</dt>
                  <dd>
                    {persona.contactoEmergencia || "—"}
                    {persona.telefonoEmergencia ? ` · ${persona.telefonoEmergencia}` : ""}
                  </dd>
                  <dt>Previsión</dt>
                  <dd>{persona.prevision || "—"}</dd>
                  <dt>Observaciones</dt>
                  <dd>{persona.observacionesSalud || "—"}</dd>
                </dl>
              </div>
            </div>
          )}

          {persona.notas && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h2 className="card__titulo">Notas internas</h2>
              <div className="card__cuerpo">{persona.notas}</div>
            </div>
          )}

          {(persona.creadoPor || persona.actualizadoPor) && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h2 className="card__titulo">Quién registró esta ficha</h2>
              <div className="card__cuerpo">
                <dl className="datos-lista">
                  <dt>La creó</dt>
                  <dd>
                    {persona.creadoPor || "—"}
                    {persona.creadoEn ? ` · ${formatoCorto(persona.creadoEn.slice(0, 10))}` : ""}
                  </dd>
                  <dt>Último cambio</dt>
                  <dd>
                    {persona.actualizadoPor || "—"}
                    {persona.actualizadoEn
                      ? ` · ${formatoCorto(persona.actualizadoEn.slice(0, 10))}`
                      : ""}
                  </dd>
                </dl>
                <Link
                  className="btn btn--fantasma btn--sm no-print"
                  style={{ marginTop: 12 }}
                  to={`/bitacora?q=${encodeURIComponent(nombreCompleto(persona))}`}
                >
                  Ver todo su historial
                </Link>
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn btn--peligro btn--bloque no-print"
            onClick={() => setModal({ tipo: "borrar" })}
          >
            Eliminar esta ficha
          </button>
        </div>

        <div>
          {/* ---------------- Grupo familiar: el cruce de datos ---------------- */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 className="card__titulo">
              Grupo familiar
              <span className="acciones no-print">
                <button
                  type="button"
                  className="btn btn--fantasma btn--sm"
                  onClick={() => setModal({ tipo: "vinculo" })}
                >
                  + Enlazar adulto
                </button>
              </span>
            </h2>
            <div className="card__cuerpo">
              {menor && responsables.length === 0 && (
                <p className="aviso">
                  <strong>Falta el apoderado.</strong> Es menor de edad y no está enlazado a ningún
                  adulto, así que no hay a quién cobrarle ni a quién avisarle cuando venza su cuota.
                </p>
              )}

              {responsables.length > 0 && (
                <>
                  <span className="campo__label">Responden por {persona.nombres}</span>
                  <ul className="lista-limpia" style={{ marginBottom: 16 }}>
                    {responsables.map((v) => {
                      const adulto = porId.get(v.adultoId);
                      return (
                        <li className="fila" key={v.id}>
                          <div className="fila__cuerpo">
                            <div className="fila__titulo">
                              <Link to={`/personas/${v.adultoId}`}>{nombreCompleto(adulto)}</Link>
                            </div>
                            <div className="fila__meta">
                              {TIPOS_VINCULO.find((t) => t.id === v.tipo)?.nombre ?? v.tipo}
                              {adulto?.email ? ` · ${adulto.email}` : ""}
                              {adulto?.telefono ? ` · ${adulto.telefono}` : ""}
                              {v.notas ? ` · ${v.notas}` : ""}
                            </div>
                          </div>
                          <div className="fila__acciones no-print">
                            {v.pagador ? (
                              <span className="chip chip--rojo">Paga</span>
                            ) : (
                              <button
                                type="button"
                                className="btn btn--fantasma btn--sm"
                                onClick={() => {
                                  // Sólo un pagador a la vez: marcar a uno desmarca al resto.
                                  for (const otro of responsables) {
                                    void guardarVinculo({ ...otro, pagador: otro.id === v.id });
                                  }
                                }}
                              >
                                Marcar como pagador
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn--fantasma btn--sm"
                              onClick={() => void eliminarVinculo(v.id)}
                            >
                              Quitar
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {cargas.length > 0 && (
                <>
                  <span className="campo__label">
                    {persona.nombres} responde por {cargas.length}{" "}
                    {cargas.length === 1 ? "persona" : "personas"}
                  </span>
                  <ul className="lista-limpia" style={{ marginBottom: 16 }}>
                    {cargas.map((v) => {
                      const hijo = porId.get(v.personaId);
                      const suyas = inscripciones.filter((i) => i.personaId === v.personaId);
                      return (
                        <li className="fila" key={v.id}>
                          <div className="fila__cuerpo">
                            <div className="fila__titulo">
                              <Link to={`/personas/${v.personaId}`}>{nombreCompleto(hijo)}</Link>
                            </div>
                            <div className="fila__meta">
                              {TIPOS_VINCULO.find((t) => t.id === v.tipo)?.nombre ?? v.tipo}
                              {hijo?.fechaNacimiento ? ` · ${edad(hijo.fechaNacimiento)} años` : ""}
                              {suyas.length > 0
                                ? ` · ${suyas.length} ${suyas.length === 1 ? "inscripción" : "inscripciones"}`
                                : " · sin inscripciones"}
                            </div>
                          </div>
                          <div className="fila__acciones">
                            {v.pagador && <span className="chip chip--rojo">Le paga</span>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {hermanos.length > 0 && (
                <>
                  <span className="campo__label">Hermanos en el club</span>
                  <p style={{ margin: "4px 0 0" }}>
                    {hermanos.map((hid, i) => (
                      <span key={hid}>
                        {i > 0 && " · "}
                        <Link to={`/personas/${hid}`}>{nombreCompleto(porId.get(hid))}</Link>
                      </span>
                    ))}
                  </p>
                  <p className="campo__ayuda">
                    Si el plan tiene descuento por hermanos, se puede aplicar al inscribir.
                  </p>
                </>
              )}

              {responsables.length === 0 && cargas.length === 0 && !menor && (
                <p className="texto-suave">
                  Sin vínculos registrados. Esta persona responde y paga por sí misma.
                </p>
              )}
            </div>
          </div>

          {/* ---------------- Inscripciones ---------------- */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 className="card__titulo">Inscripciones</h2>
            <div className="card__cuerpo">
              {propias.length === 0 ? (
                <p className="texto-suave">
                  Todavía no está inscrita en ningún plan. Use «Inscribir en un plan».
                </p>
              ) : (
                <ul className="lista-limpia">
                  {propias.map((ins) => (
                    <FilaInscripcion
                      key={ins.id}
                      inscripcion={ins}
                      onPago={() => setModal({ tipo: "pago", inscripcion: ins })}
                      onEditar={() => setModal({ tipo: "inscripcion", inscripcion: ins })}
                      onEstado={(estado) => void guardarInscripcion({ ...ins, estado })}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ---------------- Cuenta del pagador ---------------- */}
          {comoPagador.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h2 className="card__titulo">Paga por otras personas</h2>
              <div className="card__cuerpo">
                <ul className="lista-limpia">
                  {comoPagador.map((ins) => (
                    <FilaInscripcion
                      key={ins.id}
                      inscripcion={ins}
                      mostrarQuien
                      onPago={() => setModal({ tipo: "pago", inscripcion: ins })}
                      onEditar={() => setModal({ tipo: "inscripcion", inscripcion: ins })}
                      onEstado={(estado) => void guardarInscripcion({ ...ins, estado })}
                    />
                  ))}
                </ul>
                <p className="aviso aviso--ok" style={{ marginTop: 14, marginBottom: 0 }}>
                  <strong>Carga mensual:</strong> {formatoPesos(aCargoTotal)} al mes, sumando todo lo
                  que paga (las cuotas anuales o trimestrales se prorratean).
                </p>
              </div>
            </div>
          )}

          {/* ---------------- Pagos ---------------- */}
          <div className="card">
            <h2 className="card__titulo">Pagos</h2>
            <div className="card__cuerpo">
              {pagosRecibidos.length === 0 ? (
                <p className="texto-suave">Sin pagos registrados.</p>
              ) : (
                <div className="tabla-scroll">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Por</th>
                        <th>Plan</th>
                        <th>Período</th>
                        <th className="num">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagosRecibidos.slice(0, 20).map((p) => {
                        const ins = inscripciones.find((i) => i.id === p.inscripcionId);
                        const plan = planes.find((pl) => pl.id === ins?.planId);
                        return (
                          <tr key={p.id}>
                            <td>{formatoCorto(p.fecha)}</td>
                            <td>{nombreCompleto(porId.get(ins?.personaId ?? ""))}</td>
                            <td>{plan?.nombre ?? "—"}</td>
                            <td>
                              {p.periodoDesde
                                ? `${formatoCorto(p.periodoDesde)} → ${formatoCorto(p.periodoHasta)}`
                                : p.concepto === "matricula"
                                  ? "Matrícula"
                                  : "—"}
                            </td>
                            <td className="num">{formatoPesos(p.monto)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {modal?.tipo === "inscripcion" && (
        <ModalInscripcion
          persona={persona}
          inscripcion={modal.inscripcion}
          onCerrar={() => setModal(null)}
        />
      )}
      {modal?.tipo === "pago" && (
        <ModalPago inscripcion={modal.inscripcion} onCerrar={() => setModal(null)} />
      )}
      {modal?.tipo === "vinculo" && (
        <ModalVinculo persona={persona} onCerrar={() => setModal(null)} />
      )}
      {modal?.tipo === "borrar" &&
        (impedimento ? (
          /* Con pagos de por medio, la ficha no se borra: la base tampoco lo
             permite. Se ofrece lo que el club realmente necesita, que es dejar
             de contarla entre las activas sin perder su historia. */
          <Modal titulo="Esta ficha no se puede eliminar" onCerrar={() => setModal(null)}>
            <p>{impedimento}</p>
            <p>
              Si {persona.nombres} dejó de participar, márquela como retirada: desaparece del
              listado y de las cobranzas, y se conserva todo lo que pagó.
            </p>
            <div className="modal__acciones">
              <button type="button" className="btn btn--fantasma" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primario"
                onClick={() => {
                  void guardarPersona({ ...persona, activo: false });
                  setModal(null);
                }}
              >
                Marcar como retirada
              </button>
            </div>
          </Modal>
        ) : (
          <Confirmar
            titulo="Eliminar la ficha"
            mensaje={
              `Se eliminará a ${nombreCompleto(persona)} junto con sus vínculos e inscripciones. ` +
              "No tiene pagos registrados, así que no se pierde ninguna cuenta. Esto no se puede " +
              "deshacer."
            }
            onCancelar={() => setModal(null)}
            onAceptar={() => {
              void eliminarPersona(persona.id).then(() => navegar("/"));
            }}
          />
        ))}
    </>
  );
}

function FilaInscripcion({
  inscripcion,
  mostrarQuien = false,
  onPago,
  onEditar,
  onEstado,
}: {
  inscripcion: Inscripcion;
  mostrarQuien?: boolean;
  onPago: () => void;
  onEditar: () => void;
  onEstado: (estado: Inscripcion["estado"]) => void;
}) {
  const { planes, pagos, porId } = useDatos();
  const plan = planes.find((p) => p.id === inscripcion.planId);
  const estado = estadoCobro(inscripcion, pagos);
  const quien: Persona | undefined = porId.get(inscripcion.personaId);

  return (
    <li className={`fila ${inscripcion.estado !== "activa" ? "fila--tenue" : ""}`}>
      <div className="fila__cuerpo">
        <div className="fila__titulo">
          {mostrarQuien && quien ? `${nombreCompleto(quien)} — ` : ""}
          {plan?.nombre ?? "Plan eliminado"}
        </div>
        <div className="fila__meta">
          {formatoPesos(inscripcion.valor)} {nombrePeriodicidad(inscripcion.periodicidad).toLowerCase()}
          {inscripcion.descuentoMotivo ? ` · ${inscripcion.descuentoMotivo}` : ""}
          {estado.vence ? ` · vence ${formatoCorto(estado.vence)} (${enPalabras(estado.dias)})` : ""}
          {` · pagado ${formatoPesos(totalPagado(inscripcion.id, pagos))}`}
        </div>
        {plan && plan.horarios.length > 0 && inscripcion.estado === "activa" && (
          <div className="horarios" style={{ marginTop: 7 }}>
            {plan.horarios.map((h, i) => (
              <span className="horario" key={i}>
                <b>{DIAS_SEMANA[h.dia]}</b> {h.desde}–{h.hasta}
                {h.lugar ? ` · ${h.lugar}` : ""}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="fila__acciones">
        {plan && <ChipRama rama={plan.rama} />}
        <ChipEstado estado={estado} />
        <div className="no-print" style={{ display: "flex", gap: 7 }}>
          <button type="button" className="btn btn--fantasma btn--sm" onClick={onPago}>
            Registrar pago
          </button>
          <button type="button" className="btn btn--fantasma btn--sm" onClick={onEditar}>
            Editar
          </button>
          {inscripcion.estado === "activa" ? (
            <button
              type="button"
              className="btn btn--fantasma btn--sm"
              onClick={() => onEstado("suspendida")}
            >
              Suspender
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--fantasma btn--sm"
              onClick={() => onEstado("activa")}
            >
              Reactivar
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
