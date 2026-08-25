import type { ReactNode } from "react";
import type { Nivel, ResultadoCategoria } from "../domain/types";
import { claseDelta, formatoDelta } from "../domain/scoring";
import { Icono } from "./Iconos";

export function NivelTexto({ nivel, className = "" }: { nivel: Nivel | null; className?: string }) {
  if (!nivel) return <span className="nivel nivel--inicial">Sin datos</span>;
  return <span className={`nivel nivel--${nivel.id} ${className}`}>{nivel.etiqueta}</span>;
}

export function Puntaje({
  valor,
  tamano = 34,
  sufijo = true,
}: {
  valor: number | null;
  tamano?: number;
  sufijo?: boolean;
}) {
  return (
    <span className="puntaje" style={{ fontSize: tamano }}>
      {valor === null ? "—" : valor}
      {sufijo && valor !== null && <small>/100</small>}
    </span>
  );
}

export function Delta({ valor }: { valor: number | null }) {
  return <span className={claseDelta(valor)}>{formatoDelta(valor)}</span>;
}

export function BarraCategoria({
  resultado,
  deltaValor,
}: {
  resultado: ResultadoCategoria;
  deltaValor?: number | null;
}) {
  const ancho = resultado.puntaje === null ? 0 : resultado.puntaje;
  return (
    <div className="barra-cat">
      <Icono nombre={resultado.icono} tamano={19} />
      <span className="barra-cat__nombre">{resultado.nombre}</span>
      <span className="barra-cat__pista" role="presentation">
        <span className="barra-cat__valor" style={{ width: `${ancho}%` }} />
      </span>
      <span className="barra-cat__num">
        {resultado.puntaje === null ? "—" : resultado.puntaje}
      </span>
      <span style={{ width: 42, textAlign: "right", flex: "none" }}>
        {deltaValor !== undefined && <Delta valor={deltaValor} />}
      </span>
      <span style={{ width: 108, flex: "none", textAlign: "right" }}>
        <NivelTexto nivel={resultado.nivel} />
      </span>
    </div>
  );
}

export function Vacio({
  titulo,
  children,
}: {
  titulo: string;
  children?: ReactNode;
}) {
  return (
    <div className="vacio">
      <h3>{titulo}</h3>
      {children}
    </div>
  );
}

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
