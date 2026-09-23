import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { EstadoCobro } from "../domain/cobros";
import { coincide } from "../domain/familia";
import { edad } from "../domain/fechas";
import { formatearRut } from "../domain/rut";
import type { Persona, Rama } from "../domain/types";
import { nombreCompleto, nombreRama } from "../domain/types";

export function Campo({
  label,
  ayuda,
  error,
  children,
}: {
  label: string;
  ayuda?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="campo">
      <span className="campo__label">{label}</span>
      {children}
      {ayuda && !error && <span className="campo__ayuda">{ayuda}</span>}
      {error && <span className="campo__error">{error}</span>}
    </label>
  );
}

export function Casilla({
  checked,
  onChange,
  children,
  ayuda,
}: {
  checked: boolean;
  onChange: (valor: boolean) => void;
  children: ReactNode;
  ayuda?: string;
}) {
  return (
    <label className="casilla">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {children}
        {ayuda && <small>{ayuda}</small>}
      </span>
    </label>
  );
}

export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="vacio">
      <h3>{titulo}</h3>
      {children}
    </div>
  );
}

export function Metrica({
  rotulo,
  valor,
  sufijo,
  tono,
}: {
  rotulo: string;
  valor: string | number;
  sufijo?: string;
  tono?: "alerta" | "aviso";
}) {
  return (
    <div className={`card metrica ${tono ? `metrica--${tono}` : ""}`}>
      <div className="card__cuerpo">
        <div className="metrica__rotulo">{rotulo}</div>
        <div className="metrica__valor">
          {valor}
          {sufijo && <small> {sufijo}</small>}
        </div>
      </div>
    </div>
  );
}

/**
 * Insignia de rama: el color de la rama va sólo en el punto, nunca en el fondo
 * de la pantalla. En una lista donde conviven tenis y natación, teñirla del
 * color de una de las dos sería atribuirle la pieza a esa rama.
 */
export function ChipRama({ rama }: { rama: Rama }) {
  return (
    <span className={`chip rama--${rama}`}>
      <span className="chip__punto" aria-hidden="true" />
      {nombreRama(rama)}
    </span>
  );
}

export function ChipEstado({ estado }: { estado: EstadoCobro }) {
  return <span className={`chip chip--${estado.clase}`}>{estado.etiqueta}</span>;
}

export function Modal({
  titulo,
  children,
  onCerrar,
}: {
  titulo: string;
  children: ReactNode;
  onCerrar: () => void;
}) {
  // Escape cierra: en un formulario abierto sobre la ficha, es lo que la gente
  // intenta antes de buscar el botón.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [onCerrar]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="modal__caja">
        <div className="modal__cabecera">
          <h2>{titulo}</h2>
          <button type="button" className="btn btn--fantasma btn--sm" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Busca una persona ya registrada por nombre, RUT o número de socio.
 *
 * Es la pieza que hace que los datos se crucen en vez de duplicarse: al
 * inscribir a un segundo hijo, la madre no se vuelve a escribir, se busca y se
 * enlaza, y así las dos fichas apuntan a la misma persona.
 */
export function BuscadorPersona({
  personas,
  excluir = [],
  onElegir,
  etiqueta = "Buscar persona",
  ayuda,
  soloAdultos = false,
}: {
  personas: Persona[];
  excluir?: string[];
  onElegir: (persona: Persona) => void;
  etiqueta?: string;
  ayuda?: string;
  soloAdultos?: boolean;
}) {
  const [consulta, setConsulta] = useState("");
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  const resultados = useMemo(() => {
    if (consulta.trim().length < 2) return [];
    const fuera = new Set(excluir);
    return personas
      .filter((p) => !fuera.has(p.id))
      .filter((p) => !soloAdultos || (edad(p.fechaNacimiento) ?? 99) >= 18)
      .filter((p) => coincide(p, consulta))
      .slice(0, 8);
  }, [personas, consulta, excluir, soloAdultos]);

  // Un clic fuera cierra la lista; sin esto queda flotando sobre el formulario.
  useEffect(() => {
    const alClic = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", alClic);
    return () => document.removeEventListener("mousedown", alClic);
  }, []);

  return (
    <div className="buscador" ref={contenedor}>
      <Campo label={etiqueta} ayuda={ayuda}>
        <input
          className="input"
          type="search"
          value={consulta}
          placeholder="Nombre, RUT o número de socio"
          onChange={(e) => {
            setConsulta(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
        />
      </Campo>

      {abierto && resultados.length > 0 && (
        <ul className="buscador__resultados">
          {resultados.map((p) => {
            const años = edad(p.fechaNacimiento);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className="buscador__opcion"
                  onClick={() => {
                    onElegir(p);
                    setConsulta("");
                    setAbierto(false);
                  }}
                >
                  {nombreCompleto(p)}
                  <small>
                    {[
                      p.rut ? formatearRut(p.rut) : p.documento,
                      años !== null ? `${años} años` : "",
                      p.email,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {abierto && consulta.trim().length >= 2 && resultados.length === 0 && (
        <ul className="buscador__resultados">
          <li className="buscador__opcion texto-suave">Nadie coincide con esa búsqueda.</li>
        </ul>
      )}
    </div>
  );
}

/** Pide confirmación antes de algo que no se puede deshacer. */
export function Confirmar({
  titulo,
  mensaje,
  textoAceptar = "Eliminar",
  onAceptar,
  onCancelar,
}: {
  titulo: string;
  mensaje: string;
  textoAceptar?: string;
  onAceptar: () => void;
  onCancelar: () => void;
}) {
  return (
    <Modal titulo={titulo} onCerrar={onCancelar}>
      <p>{mensaje}</p>
      <div className="modal__acciones">
        <button type="button" className="btn btn--fantasma" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="button" className="btn btn--peligro" onClick={onAceptar}>
          {textoAceptar}
        </button>
      </div>
    </Modal>
  );
}
