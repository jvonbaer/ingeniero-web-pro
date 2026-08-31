import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChipEstado, ChipRama, Metrica, Vacio } from "../components/ui";
import { useDatos } from "../data/DatosContext";
import { estadoCobro, type ClaseCobro } from "../domain/cobros";
import { coincide, responsablesDe } from "../domain/familia";
import { edad } from "../domain/fechas";
import { formatearRut } from "../domain/rut";
import type { Persona, Rama } from "../domain/types";
import { nombreCompleto, RAMAS } from "../domain/types";

/** Orden de gravedad: lo que manda en la fila es el peor estado de la persona. */
const GRAVEDAD: Record<ClaseCobro, number> = {
  vencida: 4,
  "por-vencer": 3,
  "al-dia": 2,
  pagada: 1,
  suspendida: 0,
  terminada: 0,
};

type FiltroTipo = "todos" | "socios" | "menores" | "adultos" | "responsables" | "sin-inscripcion";

export function Personas() {
  const { personas, vinculos, planes, inscripciones, pagos } = useDatos();
  const [consulta, setConsulta] = useState("");
  const [tipo, setTipo] = useState<FiltroTipo>("todos");
  const [rama, setRama] = useState<Rama | "">("");
  const [soloDeuda, setSoloDeuda] = useState(false);
  const [incluirInactivos, setIncluirInactivos] = useState(false);

  const planPorId = useMemo(() => new Map(planes.map((p) => [p.id, p])), [planes]);

  /**
   * Una pasada sobre las inscripciones deja, por persona, sus ramas y el peor
   * estado de cobro. Recorrer la lista completa dentro de cada fila haría que
   * el listado se pusiera lento justo cuando el club crece.
   */
  const resumenPorPersona = useMemo(() => {
    const mapa = new Map<
      string,
      { ramas: Set<Rama>; peor: ReturnType<typeof estadoCobro> | null; activas: number }
    >();
    for (const ins of inscripciones) {
      if (ins.estado === "terminada") continue;
      const estado = estadoCobro(ins, pagos);
      const plan = planPorId.get(ins.planId);
      const actual = mapa.get(ins.personaId) ?? { ramas: new Set<Rama>(), peor: null, activas: 0 };
      if (plan) actual.ramas.add(plan.rama);
      if (ins.estado === "activa") actual.activas++;
      if (!actual.peor || GRAVEDAD[estado.clase] > GRAVEDAD[actual.peor.clase]) actual.peor = estado;
      mapa.set(ins.personaId, actual);
    }
    return mapa;
  }, [inscripciones, pagos, planPorId]);

  const listado = useMemo(() => {
    return personas
      .filter((p) => incluirInactivos || p.activo)
      .filter((p) => coincide(p, consulta))
      .filter((p) => {
        const años = edad(p.fechaNacimiento);
        const resumen = resumenPorPersona.get(p.id);
        switch (tipo) {
          case "socios":
            return p.socio;
          case "menores":
            return años !== null && años < 18;
          case "adultos":
            return años === null || años >= 18;
          case "responsables":
            return vinculos.some((v) => v.adultoId === p.id);
          case "sin-inscripcion":
            return !resumen || resumen.activas === 0;
          default:
            return true;
        }
      })
      .filter((p) => !rama || resumenPorPersona.get(p.id)?.ramas.has(rama))
      .filter((p) => {
        if (!soloDeuda) return true;
        const clase = resumenPorPersona.get(p.id)?.peor?.clase;
        return clase === "vencida" || clase === "por-vencer";
      })
      .sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, "es"));
  }, [personas, incluirInactivos, consulta, tipo, rama, soloDeuda, resumenPorPersona, vinculos]);

  const metricas = useMemo(() => {
    let porVencer = 0;
    let vencidas = 0;
    for (const ins of inscripciones) {
      if (ins.estado !== "activa") continue;
      const clase = estadoCobro(ins, pagos).clase;
      if (clase === "vencida") vencidas++;
      if (clase === "por-vencer") porVencer++;
    }
    return {
      personas: personas.filter((p) => p.activo).length,
      socios: personas.filter((p) => p.activo && p.socio).length,
      porVencer,
      vencidas,
    };
  }, [personas, inscripciones, pagos]);

  return (
    <>
      <div className="page-head no-print">
        <div>
          <span className="eyebrow">Club Gimnástico Alemán</span>
          <h1>Personas</h1>
        </div>
        <div className="page-head__acciones">
          <Link className="btn btn--primario" to="/personas/nueva">
            + Nueva persona
          </Link>
        </div>
      </div>

      <div className="grid grid--metricas">
        <Metrica rotulo="Personas activas" valor={metricas.personas} />
        <Metrica rotulo="Socios del club" valor={metricas.socios} />
        <Metrica rotulo="Por vencer" valor={metricas.porVencer} tono="aviso" />
        <Metrica rotulo="Cuotas vencidas" valor={metricas.vencidas} tono="alerta" />
      </div>

      <div className="filtros no-print">
        <input
          className="input"
          type="search"
          placeholder="Buscar por nombre, RUT, socio o correo"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          aria-label="Buscar persona"
        />
        <select
          className="select"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as FiltroTipo)}
          aria-label="Tipo de persona"
        >
          <option value="todos">Todas las personas</option>
          <option value="socios">Sólo socios</option>
          <option value="menores">Menores de edad</option>
          <option value="adultos">Mayores de edad</option>
          <option value="responsables">Apoderados y pagadores</option>
          <option value="sin-inscripcion">Sin inscripción activa</option>
        </select>
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
        <button
          type="button"
          className={`btn btn--sm ${soloDeuda ? "btn--primario" : "btn--fantasma"}`}
          onClick={() => setSoloDeuda((v) => !v)}
          aria-pressed={soloDeuda}
        >
          Con cuota pendiente
        </button>
        <button
          type="button"
          className={`btn btn--sm ${incluirInactivos ? "btn--primario" : "btn--fantasma"}`}
          onClick={() => setIncluirInactivos((v) => !v)}
          aria-pressed={incluirInactivos}
        >
          Ver retirados
        </button>
      </div>

      {listado.length === 0 ? (
        <Vacio titulo="No hay personas que mostrar">
          <p>
            {personas.length === 0
              ? "Empiece creando una persona, o cargue los datos de ejemplo desde Datos."
              : "Ningún registro coincide con los filtros aplicados."}
          </p>
        </Vacio>
      ) : (
        <ul className="lista-limpia">
          {listado.map((p) => (
            <li key={p.id}>
              <FilaPersona
                persona={p}
                resumen={resumenPorPersona.get(p.id)}
                responsables={responsablesDe(p.id, vinculos).length}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function FilaPersona({
  persona,
  resumen,
  responsables,
}: {
  persona: Persona;
  resumen?: { ramas: Set<Rama>; peor: ReturnType<typeof estadoCobro> | null; activas: number };
  responsables: number;
}) {
  const años = edad(persona.fechaNacimiento);
  const menor = años !== null && años < 18;

  return (
    <Link className="persona-item" to={`/personas/${persona.id}`}>
      <span className={`persona-item__inicial ${menor ? "persona-item__inicial--menor" : ""}`}>
        {persona.nombres.charAt(0)}
        {persona.apellidos.charAt(0)}
      </span>

      <span className="persona-item__cuerpo">
        <span className="persona-item__nombre">{nombreCompleto(persona)}</span>
        <span className="persona-item__meta">
          {persona.rut && <span>{formatearRut(persona.rut)}</span>}
          {años !== null && <span>{años} años</span>}
          {menor && responsables === 0 && (
            <span className="estado estado--vencida">Sin apoderado registrado</span>
          )}
          {persona.email && <span>{persona.email}</span>}
          {!persona.activo && <span>Retirado</span>}
        </span>
      </span>

      <span className="persona-item__chips">
        {persona.socio && <span className="chip chip--rojo">Socio</span>}
        {[...(resumen?.ramas ?? [])].map((r) => (
          <ChipRama key={r} rama={r} />
        ))}
        {resumen?.peor && <ChipEstado estado={resumen.peor} />}
      </span>
    </Link>
  );
}
