import { Link, NavLink, Route, Routes } from "react-router-dom";
import { Escudo } from "./components/Marca";
import { useDatos } from "./data/DatosContext";
import { useSesion } from "./data/sesion";
import { Jugadores } from "./pages/Jugadores";
import { JugadorForm } from "./pages/JugadorForm";
import { JugadorFicha } from "./pages/JugadorFicha";
import { Evaluar } from "./pages/Evaluar";
import { Camisetas } from "./pages/Camisetas";
import { Informe } from "./pages/Informe";
import { HojaPapel } from "./pages/HojaPapel";
import { Parametros } from "./pages/Parametros";
import { Datos } from "./pages/Datos";

function BarraSuperior() {
  const { modo, etiquetaModo } = useDatos();
  const { requiereAcceso, email, salir, esAdmin } = useSesion();
  return (
    <header className="topbar no-print">
      <div className="topbar__inner">
        <div className="topbar__marca">
          <Escudo tamano={38} variante="blanco" />
          <div>
            <div className="topbar__titulo">Escuela de Fútbol</div>
            <div className="topbar__sub">Club Gimnástico Alemán · Temuco</div>
          </div>
        </div>

        <nav className="topbar__nav" aria-label="Secciones">
          <NavLink to="/" end className="topbar__link">Jugadores</NavLink>
          <NavLink to="/camisetas" className="topbar__link">Camisetas</NavLink>
          {/* Parámetros y Datos son del club, no del cuerpo técnico: una toca
              las pautas de toda la escuela y la otra baja el respaldo completo
              con los datos de los apoderados. Esconderlas es sólo cortesía —lo
              que de verdad protege son las políticas de la base—, pero evita
              que alguien apriete un botón que le va a ser rechazado. */}
          {esAdmin && (
            <>
              <NavLink to="/parametros" className="topbar__link">Parámetros</NavLink>
              <NavLink to="/datos" className="topbar__link">Datos</NavLink>
            </>
          )}
        </nav>

        <span
          className={`topbar__modo ${modo === "nube" ? "topbar__modo--nube" : ""}`}
          title={
            modo === "nube"
              ? `Los datos se guardan en la nube compartida. Sesión: ${email ?? ""}`
              : "Los datos se guardan sólo en este dispositivo."
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

/**
 * Lo que ve un entrenador si llega a una pantalla del club escribiendo la
 * dirección a mano. No es una barrera —la barrera está en la base— sino una
 * explicación, para que no quede pensando que la aplicación se rompió.
 */
function SoloAdmin({ que }: { que: string }) {
  return (
    <div className="vacio">
      <h3>Esta sección es del club</h3>
      <p>
        {que} está reservado a quienes administran el sistema. Si necesita algo de acá, pídaselo a
        la coordinación de la escuela.
      </p>
      <Link to="/" className="btn btn--fantasma">Volver a Jugadores</Link>
    </div>
  );
}

export function App() {
  const { cargando, error, recargar } = useDatos();
  const { esAdmin } = useSesion();

  return (
    <div className="app">
      <BarraSuperior />
      <main className="app__main">
        {error && (
          <div className="aviso" role="alert">
            <div>
              <strong>Hubo un problema:</strong> {error}
            </div>
            {/* Sin esto, un error de carga deja la pantalla muerta: el
                entrenador queda con la sesión abierta y sin nada que tocar. */}
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
          <p className="vacio">Cargando datos de la escuela…</p>
        ) : (
          <Routes>
            <Route path="/" element={<Jugadores />} />
            <Route path="/jugadores/nuevo" element={<JugadorForm />} />
            <Route path="/jugadores/:id" element={<JugadorFicha />} />
            <Route path="/jugadores/:id/editar" element={<JugadorForm />} />
            <Route path="/jugadores/:id/evaluar" element={<Evaluar />} />
            <Route path="/evaluaciones/:evaluacionId" element={<Evaluar />} />
            <Route path="/informe/:evaluacionId" element={<Informe />} />
            <Route path="/hoja/:pautaId" element={<HojaPapel />} />
            <Route path="/hoja/:pautaId/:jugadorId" element={<HojaPapel />} />
            <Route path="/camisetas" element={<Camisetas />} />
            <Route
              path="/parametros"
              element={esAdmin ? <Parametros /> : <SoloAdmin que="Editar las pautas de evaluación" />}
            />
            <Route
              path="/datos"
              element={esAdmin ? <Datos /> : <SoloAdmin que="El respaldo de los datos de la escuela" />}
            />
            <Route path="*" element={<p className="vacio">Esta página no existe.</p>} />
          </Routes>
        )}
      </main>
    </div>
  );
}
