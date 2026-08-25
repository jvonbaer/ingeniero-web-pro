import { traducirError } from "../data/mensajes";
import { useState } from "react";
import { Escudo } from "../components/Marca";
import { Campo } from "../components/ui";
import { useSesion } from "../data/sesion";

export function Acceso() {
  const { entrar } = useSesion();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await entrar(correo.trim(), clave);
    } catch (e) {
      setError(traducirError(e instanceof Error ? e.message : "No se pudo iniciar sesión."));
      setEnviando(false);
    }
  }

  return (
    <div className="acceso">
      <form className="acceso__caja" onSubmit={enviar}>
        <div className="acceso__marca">
          <Escudo tamano={58} />
          <div>
            <h1>Escuela de Fútbol</h1>
            <p>Club Gimnástico Alemán · Temuco</p>
          </div>
        </div>

        <p className="acceso__texto">
          Ingrese con la cuenta que le entregó el club. Las fichas contienen datos de menores
          de edad, por eso el acceso es sólo para el cuerpo técnico.
        </p>

        <Campo label="Correo">
          <input
            className="input"
            type="email"
            inputMode="email"
            autoComplete="username"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
          />
        </Campo>

        <Campo label="Clave" error={error ?? undefined}>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
          />
        </Campo>

        <button type="submit" className="btn btn--primario btn--bloque" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
