import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChipRama, Confirmar, Metrica, Vacio } from "../components/ui";
import { useDatos } from "../data/DatosContext";
import { formatoPesos } from "../domain/cobros";
import { coincide } from "../domain/familia";
import { aISO, formatoCorto } from "../domain/fechas";
import type { MedioPago, Pago, Rama } from "../domain/types";
import { MEDIOS_PAGO, nombreCompleto, nombreRama, RAMAS } from "../domain/types";

/** Primer día del mes en curso: el rango que la secretaría mira todos los días. */
function inicioDeMes(): string {
  const hoy = new Date();
  return aISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
}

function finDeMes(): string {
  const hoy = new Date();
  return aISO(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
}

export function Pagos() {
  const { pagos, inscripciones, planes, porId, personas, eliminarPago } = useDatos();
  const [desde, setDesde] = useState(inicioDeMes());
  const [hasta, setHasta] = useState(finDeMes());
  const [rama, setRama] = useState<Rama | "">("");
  const [medio, setMedio] = useState<MedioPago | "">("");
  const [consulta, setConsulta] = useState("");
  const [borrando, setBorrando] = useState<Pago | null>(null);

  const filas = useMemo(() => {
    return pagos
      .map((pago) => {
        const inscripcion = inscripciones.find((i) => i.id === pago.inscripcionId);
        const plan = planes.find((p) => p.id === inscripcion?.planId);
        return {
          pago,
          plan,
          socio: porId.get(inscripcion?.personaId ?? ""),
          pagador: porId.get(pago.personaId),
        };
      })
      .filter((f) => (!desde || f.pago.fecha >= desde) && (!hasta || f.pago.fecha <= hasta))
      .filter((f) => !rama || f.plan?.rama === rama)
      .filter((f) => !medio || f.pago.medio === medio)
      .filter((f) => {
        if (!consulta.trim()) return true;
        return (
          (f.socio && coincide(f.socio, consulta)) || (f.pagador && coincide(f.pagador, consulta))
        );
      })
      .sort((a, b) => b.pago.fecha.localeCompare(a.pago.fecha));
  }, [pagos, inscripciones, planes, porId, desde, hasta, rama, medio, consulta]);

  const total = filas.reduce((s, f) => s + f.pago.monto, 0);

  /** Por rama, para el informe mensual al directorio. */
  const porRama = useMemo(() => {
    const cuenta = new Map<Rama, number>();
    for (const f of filas) {
      if (!f.plan) continue;
      cuenta.set(f.plan.rama, (cuenta.get(f.plan.rama) ?? 0) + f.pago.monto);
    }
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1]);
  }, [filas]);

  /**
   * CSV separado por punto y coma: es lo que Excel en español abre en columnas
   * sin pedir nada. Con coma, todo cae en una sola columna.
   */
  function exportarCsv() {
    const encabezados = [
      "fecha", "socio", "rut_socio", "pagador", "plan", "rama", "concepto",
      "periodo_desde", "periodo_hasta", "medio", "comprobante", "monto",
    ];
    const escapar = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lineas = filas.map((f) =>
      [
        f.pago.fecha,
        nombreCompleto(f.socio),
        f.socio?.rut ?? "",
        nombreCompleto(f.pagador),
        f.plan?.nombre ?? "",
        f.plan ? nombreRama(f.plan.rama) : "",
        f.pago.concepto,
        f.pago.periodoDesde,
        f.pago.periodoHasta,
        f.pago.medio,
        f.pago.comprobante,
        f.pago.monto,
      ]
        .map(escapar)
        .join(";"),
    );
    const csv = `﻿${encabezados.join(";")}\n${lineas.join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `pagos-cga-${desde}_a_${hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Ingresos del club</span>
          <h1>Pagos</h1>
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

      <div className="grid grid--metricas">
        <Metrica rotulo="Recaudado en el período" valor={formatoPesos(total)} />
        <Metrica rotulo="Pagos registrados" valor={filas.length} />
        <Metrica
          rotulo="Personas que pagaron"
          valor={new Set(filas.map((f) => f.pago.personaId)).size}
        />
        <Metrica rotulo="Personas registradas" valor={personas.length} />
      </div>

      <div className="filtros no-print">
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
        <select
          className="select"
          value={rama}
          onChange={(e) => setRama(e.target.value as Rama | "")}
          aria-label="Rama"
        >
          <option value="">Todas las ramas</option>
          {RAMAS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={medio}
          onChange={(e) => setMedio(e.target.value as MedioPago | "")}
          aria-label="Medio de pago"
        >
          <option value="">Todos los medios</option>
          {MEDIOS_PAGO.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
        <input
          className="input"
          type="search"
          placeholder="Buscar por persona"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          aria-label="Buscar"
        />
      </div>

      {porRama.length > 1 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card__cuerpo" style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {porRama.map(([r, monto]) => (
              <span key={r} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ChipRama rama={r} />
                <strong>{formatoPesos(monto)}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {filas.length === 0 ? (
        <Vacio titulo="No hay pagos en este período">
          <p>Cambie el rango de fechas o registre un pago desde la ficha de una persona.</p>
        </Vacio>
      ) : (
        <div className="card">
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Por quién</th>
                  <th>Pagó</th>
                  <th>Plan</th>
                  <th>Período</th>
                  <th>Medio</th>
                  <th className="num">Monto</th>
                  <th className="no-print" />
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.pago.id}>
                    <td>{formatoCorto(f.pago.fecha)}</td>
                    <td>
                      {f.socio ? (
                        <Link to={`/personas/${f.socio.id}`}>{nombreCompleto(f.socio)}</Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {f.pagador ? (
                        <Link to={`/personas/${f.pagador.id}`}>{nombreCompleto(f.pagador)}</Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{f.plan?.nombre ?? "—"}</td>
                    <td>
                      {f.pago.periodoDesde
                        ? `${formatoCorto(f.pago.periodoDesde)} → ${formatoCorto(f.pago.periodoHasta)}`
                        : f.pago.concepto === "matricula"
                          ? "Matrícula"
                          : "—"}
                    </td>
                    <td>{MEDIOS_PAGO.find((m) => m.id === f.pago.medio)?.nombre ?? f.pago.medio}</td>
                    <td className="num">{formatoPesos(f.pago.monto)}</td>
                    <td className="no-print">
                      <button
                        type="button"
                        className="btn btn--fantasma btn--sm"
                        onClick={() => setBorrando(f.pago)}
                      >
                        Anular
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6}>Total del período</td>
                  <td className="num">{formatoPesos(total)}</td>
                  <td className="no-print" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {borrando && (
        <Confirmar
          titulo="Anular el pago"
          mensaje={
            `Se eliminará el pago de ${formatoPesos(borrando.monto)} del ${formatoCorto(borrando.fecha)}. ` +
            "La inscripción volverá a vencer en la fecha que le correspondía antes de este pago."
          }
          textoAceptar="Anular"
          onCancelar={() => setBorrando(null)}
          onAceptar={() => {
            void eliminarPago(borrando.id);
            setBorrando(null);
          }}
        />
      )}
    </>
  );
}
