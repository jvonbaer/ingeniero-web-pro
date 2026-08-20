import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { ProveedorDatos } from "./data/DatosContext";
import { ProveedorSesion, useSesion } from "./data/sesion";
import { Acceso } from "./pages/Acceso";
import { App } from "./App";
import "./styles/fuentes.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/informe.css";
import "./styles/print.css";

/**
 * Los datos sólo se cargan una vez resuelto el acceso: en modo nube, pedirlos
 * antes de tener sesión devolvería un error de permisos.
 */
function Puerta() {
  const { estado } = useSesion();

  if (estado === "cargando") return <p className="vacio">Verificando acceso…</p>;
  if (estado === "sin-sesion") return <Acceso />;

  return (
    <ProveedorDatos>
      <App />
    </ProveedorDatos>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* HashRouter: la app queda como archivos estáticos y funciona en cualquier
        hosting gratuito sin configurar reglas de reescritura. */}
    <HashRouter>
      <ProveedorSesion>
        <Puerta />
      </ProveedorSesion>
    </HashRouter>
  </StrictMode>,
);
