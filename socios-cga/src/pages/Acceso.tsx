import { useState } from "react";
import { Escudo } from "../components/Marca";
import { Campo } from "../components/ui";
import { traducirError } from "../data/mensajes";
import { useSesion } from "../data/sesion";

export function Acceso() {
  const { modo, entrar, identificarse } = useSesion();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function identificar(evento: React.FormEvent) {
    evento.preventDefault();
    if (nombre.trim().length < 3) {
      setError("Escriba su nombre y apellido.");
      return;
    }
    identificarse(nombre);
  }

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

  // Sin base compartida no hay a quién preguntarle si la clave es correcta. En
  // vez de simular un acceso que no protege nada, se pide el nombre de quien va
  // a trabajar y se dice con todas sus letras qué vale y qué no.
  if (modo === "local") {
    return (
      <div className="acceso">
        <form className="acceso__caja" onSubmit={identificar}>
          <div className="acceso__marca">
            <Escudo tamano={58} />
            <div>
              <h1>Socios y Escuelas</h1>
              <p>Club Gimnástico Alemán · Temuco</p>
            </div>
          </div>

          <p className="acceso__texto">
            Esta copia guarda los datos <strong>sólo en este computador</strong>. Escriba su nombre
            para que quede anotado en la bitácora quién ingresa cada dato.
          </p>

          <Campo
            label="Su nombre y apellido"
            error={error ?? undefined}
            ayuda="Queda guardado en este computador; se puede cambiar desde Datos."
          >
            <input
              className="input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="name"
              required
            />
          </Campo>

          <button type="submit" className="btn btn--primario btn--bloque">
            Entrar
          </button>

          <p className="campo__ayuda" style={{ marginTop: 14 }}>
            Ojo: acá no hay cuenta ni clave que verificar, así que la bitácora anotará este nombre
            como <strong>«sin cuenta»</strong>. Para que la huella valga de verdad —y para que
            todos los computadores vean lo mismo— hay que conectar la base compartida.
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="acceso">
      <form className="acceso__caja" onSubmit={enviar}>
        <div className="acceso__marca">
          <Escudo tamano={58} />
          <div>
            <h1>Socios y Escuelas</h1>
            <p>Club Gimnástico Alemán · Temuco</p>
          </div>
        </div>

        <p className="acceso__texto">
          Ingrese con la cuenta que le entregó el club. El registro contiene RUT, direcciones y
          teléfonos de socios y de menores de edad, por eso el acceso es sólo para quienes lo
          administran.
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
