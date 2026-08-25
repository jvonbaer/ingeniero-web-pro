import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CATEGORIAS_EDAD, POSICIONES } from "../config/pautas";
import { useDatos } from "../data/DatosContext";
import { EntradaFoto } from "../components/Foto";
import { Campo } from "../components/ui";
import { generarCodigo, hoyISO, nombreCompleto, nuevoId } from "../domain/scoring";
import type { Jugador, PieHabil } from "../domain/types";

function jugadorVacio(): Jugador {
  return {
    id: nuevoId("jug"),
    codigo: "",
    nombre: "",
    apellido: "",
    fechaNacimiento: "",
    categoria: "SUB-12",
    posicion: "Volante ofensivo",
    pieHabil: "Derecho",
    alturaCm: null,
    dorsal: "",
    fotoDataUrl: null,
    ingreso: hoyISO(),
    apoderado: { nombre: "", email: "", telefono: "" },
    activo: true,
    creadoEn: new Date().toISOString(),
  };
}

export function JugadorForm() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { jugadores, guardarJugador, eliminarJugador } = useDatos();

  const original = useMemo(() => jugadores.find((j) => j.id === id), [jugadores, id]);
  const [form, setForm] = useState<Jugador>(() => original ?? jugadorVacio());
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  if (id && !original) {
    return <p className="vacio">No encontramos ese jugador.</p>;
  }

  const editando = Boolean(original);

  function set<K extends keyof Jugador>(clave: K, valor: Jugador[K]) {
    setForm((f) => ({ ...f, [clave]: valor }));
  }

  function validar(): boolean {
    const e: Record<string, string> = {};
    if (!form.nombre.trim()) e.nombre = "Escriba el nombre.";
    if (!form.apellido.trim()) e.apellido = "Escriba el apellido.";
    if (!form.fechaNacimiento) e.fechaNacimiento = "Indique la fecha de nacimiento.";
    if (form.apoderado.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.apoderado.email)) {
      e.email = "Ese correo no parece válido.";
    }
    const codigoRepetido = jugadores.some(
      (j) => j.id !== form.id && j.codigo && j.codigo === form.codigo.trim(),
    );
    if (codigoRepetido) e.codigo = "Ese código ya está asignado a otro jugador.";
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!validar()) return;
    setGuardando(true);
    try {
      const codigo =
        form.codigo.trim() ||
        generarCodigo(form.fechaNacimiento, jugadores.map((j) => j.codigo));
      const limpio: Jugador = {
        ...form,
        codigo,
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
      };
      await guardarJugador(limpio);
      navegar(`/jugadores/${limpio.id}`);
    } catch {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!original) return;
    const seguro = window.confirm(
      `¿Eliminar a ${nombreCompleto(original)} y todas sus evaluaciones? Esta acción no se puede deshacer.`,
    );
    if (!seguro) return;
    await eliminarJugador(original.id);
    navegar("/");
  }

  return (
    <form onSubmit={enviar}>
      <div className="page-head">
        <div>
          <span className="eyebrow">{editando ? "Editar ficha" : "Nueva ficha"}</span>
          <h1>{editando ? nombreCompleto(original!) : "Nuevo jugador"}</h1>
        </div>
      </div>

      <div className="grid grid--ficha">
        <div className="card">
          <h2 className="card__titulo">Fotografía</h2>
          <div className="card__cuerpo">
            <EntradaFoto
              valor={form.fotoDataUrl}
              onCambio={(v) => set("fotoDataUrl", v)}
              nombre={`${form.nombre} ${form.apellido}`.trim() || "el jugador"}
            />
            <p className="campo__ayuda" style={{ marginTop: 12 }}>
              <strong>Tomar foto</strong> abre la cámara: la trasera en el teléfono o la tablet, la
              webcam en el computador. <strong>Subir archivo</strong> busca una foto que ya tenga.
              En ambos casos la imagen se reduce sola antes de guardarse.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div className="card">
            <h2 className="card__titulo">Datos del jugador</h2>
            <div className="card__cuerpo">
              <div className="grid grid--2">
                <Campo label="Nombre" error={errores.nombre}>
                  <input
                    className="input"
                    value={form.nombre}
                    onChange={(e) => set("nombre", e.target.value)}
                    aria-invalid={Boolean(errores.nombre)}
                    autoComplete="given-name"
                  />
                </Campo>
                <Campo label="Apellido" error={errores.apellido}>
                  <input
                    className="input"
                    value={form.apellido}
                    onChange={(e) => set("apellido", e.target.value)}
                    aria-invalid={Boolean(errores.apellido)}
                    autoComplete="family-name"
                  />
                </Campo>
              </div>

              <div className="grid grid--2">
                <Campo label="Fecha de nacimiento" error={errores.fechaNacimiento}>
                  <input
                    className="input"
                    type="date"
                    value={form.fechaNacimiento}
                    onChange={(e) => set("fechaNacimiento", e.target.value)}
                    aria-invalid={Boolean(errores.fechaNacimiento)}
                  />
                </Campo>
                <Campo
                  label="Código de seguimiento"
                  ayuda="Si lo deja en blanco se genera solo (formato CGA-F-AA-000)."
                  error={errores.codigo}
                >
                  <input
                    className="input"
                    value={form.codigo}
                    onChange={(e) => set("codigo", e.target.value.toUpperCase())}
                    placeholder="Se genera automáticamente"
                    aria-invalid={Boolean(errores.codigo)}
                  />
                </Campo>
              </div>

              <div className="grid grid--2">
                <Campo label="Categoría">
                  <select
                    className="select"
                    value={form.categoria}
                    onChange={(e) => set("categoria", e.target.value)}
                  >
                    {CATEGORIAS_EDAD.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Posición">
                  <select
                    className="select"
                    value={form.posicion}
                    onChange={(e) => set("posicion", e.target.value)}
                  >
                    {POSICIONES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </Campo>
              </div>

              <div className="grid grid--3">
                <Campo label="Pie hábil">
                  <select
                    className="select"
                    value={form.pieHabil}
                    onChange={(e) => set("pieHabil", e.target.value as PieHabil)}
                  >
                    <option>Derecho</option>
                    <option>Izquierdo</option>
                    <option>Ambidiestro</option>
                  </select>
                </Campo>
                <Campo label="Altura (cm)">
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min={90}
                    max={220}
                    value={form.alturaCm ?? ""}
                    onChange={(e) =>
                      set("alturaCm", e.target.value ? Number(e.target.value) : null)
                    }
                  />
                </Campo>
                <Campo label="Dorsal">
                  <input
                    className="input"
                    inputMode="numeric"
                    maxLength={3}
                    value={form.dorsal}
                    onChange={(e) => set("dorsal", e.target.value)}
                  />
                </Campo>
              </div>

              <div className="grid grid--2">
                <Campo label="Ingreso a la escuela">
                  <input
                    className="input"
                    type="date"
                    value={form.ingreso}
                    onChange={(e) => set("ingreso", e.target.value)}
                  />
                </Campo>
                <Campo label="Estado">
                  <select
                    className="select"
                    value={form.activo ? "activo" : "retirado"}
                    onChange={(e) => set("activo", e.target.value === "activo")}
                  >
                    <option value="activo">Activo</option>
                    <option value="retirado">Retirado</option>
                  </select>
                </Campo>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="card__titulo">Apoderado</h2>
            <div className="card__cuerpo">
              <Campo label="Nombre del apoderado">
                <input
                  className="input"
                  value={form.apoderado.nombre}
                  onChange={(e) =>
                    set("apoderado", { ...form.apoderado, nombre: e.target.value })
                  }
                />
              </Campo>
              <div className="grid grid--2">
                <Campo
                  label="Correo"
                  ayuda="Se usa para enviarle el informe en PDF."
                  error={errores.email}
                >
                  <input
                    className="input"
                    type="email"
                    inputMode="email"
                    value={form.apoderado.email}
                    onChange={(e) =>
                      set("apoderado", { ...form.apoderado, email: e.target.value })
                    }
                    aria-invalid={Boolean(errores.email)}
                  />
                </Campo>
                <Campo label="Teléfono">
                  <input
                    className="input"
                    type="tel"
                    inputMode="tel"
                    value={form.apoderado.telefono}
                    onChange={(e) =>
                      set("apoderado", { ...form.apoderado, telefono: e.target.value })
                    }
                  />
                </Campo>
              </div>
            </div>
          </div>

          {editando && (
            <div>
              <button type="button" className="btn btn--peligro btn--sm" onClick={borrar}>
                Eliminar jugador y su historial
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Guardar va al pie, que es donde uno termina de escribir. La barra queda
          fija al borde inferior para que en el teléfono el botón esté a mano sin
          tener que volver a subir. */}
      <div className="form-pie no-print">
        {Object.keys(errores).length > 0 && (
          <span className="form-pie__error" role="alert">
            Falta completar algún dato obligatorio.
          </span>
        )}
        <Link to={editando ? `/jugadores/${form.id}` : "/"} className="btn btn--fantasma">
          Cancelar
        </Link>
        <button type="submit" className="btn btn--primario" disabled={guardando}>
          {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar ficha"}
        </button>
      </div>
    </form>
  );
}
