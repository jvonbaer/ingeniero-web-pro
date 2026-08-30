import { NavLink, Route, Routes } from "react-router-dom";
import { Escudo } from "./components/Marca";
import { useDatos } from "./data/DatosContext";
import { useSesion } from "./data/sesion";
import { Cobranzas } from "./pages/Cobranzas";
import { Datos } from "./pages/Datos";
import { Pagos } from "./pages/Pagos";
import { Personas } from "./pages/Personas";
import { PersonaFicha } from "./pages/PersonaFicha";
import { PersonaForm } from "./pages/PersonaForm";
import { Planes } from "./pages/Planes";
import { estadoCobro } from "./domain/cobros";

function BarraSuperior() {
  const { modo, etiquetaModo, inscripciones, pagos } = useDatos();
  const { requiereAcceso, email, salir } = useSesion();

  // El número junto a «Cobranzas» es lo que hace que alguien entre a mirarla:
  // sin él, la pantalla de avisos sólo se visita cuando ya es tarde.
  const pendientes = inscripciones.filter((i) => {
    if (i.estado !== "activa") return false;
    const clase = estadoCobro(i, pagos).clase;
    return clase === "vencida" || clase === "por-vencer";
  }).length;

  return (
    <header className="topbar no-print">
      <div className="topbar__inner">
        <div className="topbar__marca">
          <Escudo tamano={38} variante="blanco" />
          <div>
            <div className="topbar__titulo">Socios y Escuelas</div>
            <div className="topbar__sub">Club Gimnástico Alemán · Temuco</div>
          </div>
        </div>

        <nav className="topbar__nav" aria-label="Secciones">
          <NavLink to="/" end className="topbar__link">
            Personas
          </NavLink>
          <NavLink to="/planes" className="topbar__link">
            Planes
          </NavLink>
          <NavLink to="/cobranzas" className="topbar__link">
            Cobranzas{pendientes > 0 ? ` (${pendientes})` : ""}
          </NavLink>
          <NavLink to="/pagos" className="topbar__link">
            Pagos
          </NavLink>
          <NavLink to="/datos" className="topbar__link">
            Datos
          </NavLink>
        </nav>

        <span
          className={`topbar__modo ${modo === "nube" ? "topbar__modo--nube" : ""}`}
          title={
            modo === "nube"
              ? `Los datos se guardan en la base compartida del club. Sesión: ${email ?? ""}`
              : "Los datos se guardan sólo en este computador."
          }
        >
          {etiquetaModo}
        </span>

        {requiereAcceso && (
          <button type="button" className="topbar__link" onClick={() => void salir()}>
            Salir
          </button>
        )}
      </div>
    </header>
  );
}

export function App() {
  const { cargando, error, recargar } = useDatos();

  return (
    <div className="app">
      <BarraSuperior />
      <main className="app__main">
        {error && (
          <div className="aviso" role="alert">
            <div>
              <strong>Hubo un problema:</strong> {error}
            </div>
            {/* Sin esto, un error de carga deja la pantalla muerta: la sesión
                queda abierta y sin nada que tocar. */}
            <button
              type="button"
              className="btn btn--fantasma btn--sm"
              style={{ marginTop: 10 }}
              onClick={() => void recargar()}
            >
              Reintentar
            </button>
          </div>
        )}
        {cargando ? (
          <p className="vacio">Cargando los datos del club…</p>
        ) : (
          <Routes>
            <Route path="/" element={<Personas />} />
            <Route path="/personas/nueva" element={<PersonaForm />} />
            <Route path="/personas/:id" element={<PersonaFicha />} />
            <Route path="/personas/:id/editar" element={<PersonaForm />} />
            <Route path="/planes" element={<Planes />} />
            <Route path="/cobranzas" element={<Cobranzas />} />
            <Route path="/pagos" element={<Pagos />} />
            <Route path="/datos" element={<Datos />} />
            <Route path="*" element={<p className="vacio">Esta página no existe.</p>} />
          </Routes>
        )}
      </main>
    </div>
  );
}
