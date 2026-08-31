import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BuscadorPersona, Campo, Casilla } from "../components/ui";
import { useDatos } from "../data/DatosContext";
import { nuevoId } from "../data/store";
import { responsablesDe } from "../domain/familia";
import { edad, hoyISO } from "../domain/fechas";
import { formatearRut, normalizarRut, rutValido } from "../domain/rut";
import type { Persona, TipoVinculo, Vinculo } from "../domain/types";
import { nombreCompleto, TIPOS_VINCULO } from "../domain/types";

function personaEnBlanco(): Persona {
  return {
    id: "",
    rut: "",
    documento: "",
    nombres: "",
    apellidos: "",
    fechaNacimiento: "",
    sexo: "",
    email: "",
    telefono: "",
    direccion: "",
    comuna: "Temuco",
    socio: false,
    numeroSocio: "",
    categoriaSocio: "",
    fechaIngreso: hoyISO(),
    contactoEmergencia: "",
    telefonoEmergencia: "",
    observacionesSalud: "",
    prevision: "",
    autorizaImagen: false,
    activo: true,
    notas: "",
    creadoEn: "",
    actualizadoEn: "",
  };
}

interface AdultoNuevo {
  nombres: string;
  apellidos: string;
  rut: string;
  email: string;
  telefono: string;
}

export function PersonaForm() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { personas, vinculos, guardarPersona, guardarVinculo } = useDatos();

  const existente = personas.find((p) => p.id === id);
  const [persona, setPersona] = useState<Persona>(existente ?? personaEnBlanco());
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  // Vínculo que se crea junto con la ficha. Sólo para personas nuevas: en una
  // ficha ya existente los vínculos se administran desde su propia pantalla,
  // donde se ven todos juntos.
  const [adultoElegido, setAdultoElegido] = useState<Persona | null>(null);
  const [adultoNuevo, setAdultoNuevo] = useState<AdultoNuevo | null>(null);
  const [tipoVinculo, setTipoVinculo] = useState<TipoVinculo>("madre");

  const años = edad(persona.fechaNacimiento);
  const esMenor = años !== null && años < 18;
  const yaTieneResponsables = existente ? responsablesDe(existente.id, vinculos).length > 0 : false;
  const cambiar = (parcial: Partial<Persona>) => setPersona((p) => ({ ...p, ...parcial }));

  /** Otra ficha con el mismo RUT: la señal más confiable de un duplicado. */
  const duplicado = useMemo(() => {
    if (!persona.rut) return null;
    const rut = normalizarRut(persona.rut);
    return personas.find((p) => p.rut && normalizarRut(p.rut) === rut && p.id !== persona.id) ?? null;
  }, [personas, persona.rut, persona.id]);

  function validar(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!persona.nombres.trim()) e.nombres = "Escriba el nombre.";
    if (!persona.apellidos.trim()) e.apellidos = "Escriba los apellidos.";
    if (persona.rut && !rutValido(persona.rut)) {
      e.rut = "El RUT no es válido. Revise el dígito verificador.";
    }
    if (duplicado) e.rut = `Ya existe la ficha de ${nombreCompleto(duplicado)} con ese RUT.`;
    if (persona.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(persona.email)) {
      e.email = "El correo no parece válido.";
    }

    // La regla que sostiene todo el cruce: un menor tiene que quedar enlazado a
    // un adulto. Sin esto, cuando venza su cuota no hay a quién avisarle.
    const tendraResponsable = yaTieneResponsables || adultoElegido !== null || adultoNuevo !== null;
    if (esMenor && !tendraResponsable) {
      e.vinculo =
        "Es menor de edad: enlace a un adulto responsable. Si no tiene todos sus datos, " +
        "basta con el nombre y después se completa.";
    }
    if (adultoNuevo && !adultoNuevo.nombres.trim()) {
      e.vinculo = "Escriba al menos el nombre del adulto responsable.";
    }
    if (adultoNuevo?.rut && !rutValido(adultoNuevo.rut)) {
      e.vinculo = "El RUT del adulto responsable no es válido.";
    }
    return e;
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    setGuardando(true);
    try {
      const idPersona = persona.id || nuevoId("per");
      const ficha: Persona = {
        ...persona,
        id: idPersona,
        rut: persona.rut ? normalizarRut(persona.rut) : "",
        nombres: persona.nombres.trim(),
        apellidos: persona.apellidos.trim(),
        email: persona.email.trim(),
        creadoEn: persona.creadoEn || new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
      };
      await guardarPersona(ficha);

      let adultoId = adultoElegido?.id ?? "";
      if (adultoNuevo) {
        adultoId = nuevoId("per");
        await guardarPersona({
          ...personaEnBlanco(),
          id: adultoId,
          nombres: adultoNuevo.nombres.trim(),
          apellidos: adultoNuevo.apellidos.trim(),
          rut: adultoNuevo.rut ? normalizarRut(adultoNuevo.rut) : "",
          email: adultoNuevo.email.trim(),
          telefono: adultoNuevo.telefono.trim(),
          comuna: ficha.comuna,
          direccion: ficha.direccion,
          creadoEn: new Date().toISOString(),
          actualizadoEn: new Date().toISOString(),
        });
      }

      if (adultoId) {
        const vinculo: Vinculo = {
          id: nuevoId("vin"),
          personaId: idPersona,
          adultoId,
          tipo: tipoVinculo,
          // El primer adulto que se enlaza queda como pagador y contacto: es lo
          // que ocurre en la práctica y se puede cambiar después.
          pagador: true,
          contactoPrincipal: true,
          notas: "",
        };
        await guardarVinculo(vinculo);
      }

      navegar(`/personas/${idPersona}`);
    } catch {
      setGuardando(false); // el mensaje lo muestra la barra de error de la aplicación
    }
  }

  return (
    <form onSubmit={enviar}>
      <div className="page-head">
        <div>
          <span className="eyebrow">{existente ? "Editar ficha" : "Nueva ficha"}</span>
          <h1>{existente ? nombreCompleto(existente) : "Nueva persona"}</h1>
        </div>
      </div>

      <div className="grid grid--2">
        <div className="card">
          <div className="card__cuerpo">
            <h2 className="fieldset__titulo">Identificación</h2>

            <Campo label="Nombres" error={errores.nombres}>
              <input
                className="input"
                value={persona.nombres}
                onChange={(e) => cambiar({ nombres: e.target.value })}
                autoComplete="given-name"
                required
              />
            </Campo>

            <Campo label="Apellidos" error={errores.apellidos}>
              <input
                className="input"
                value={persona.apellidos}
                onChange={(e) => cambiar({ apellidos: e.target.value })}
                autoComplete="family-name"
                required
              />
            </Campo>

            <Campo
              label="RUT"
              error={errores.rut}
              ayuda="Es la llave que evita fichas repetidas. Se puede escribir con o sin puntos."
            >
              <input
                className="input"
                value={formatearRut(persona.rut)}
                onChange={(e) => cambiar({ rut: e.target.value })}
                onBlur={(e) => cambiar({ rut: e.target.value ? normalizarRut(e.target.value) : "" })}
                aria-invalid={Boolean(errores.rut)}
                inputMode="text"
              />
            </Campo>

            <Campo label="Documento (si no tiene RUT)" ayuda="Pasaporte o documento del país de origen.">
              <input
                className="input"
                value={persona.documento}
                onChange={(e) => cambiar({ documento: e.target.value })}
              />
            </Campo>

            <Campo
              label="Fecha de nacimiento"
              ayuda={años !== null ? `${años} años cumplidos${esMenor ? " · menor de edad" : ""}` : undefined}
            >
              <input
                className="input"
                type="date"
                value={persona.fechaNacimiento}
                onChange={(e) => cambiar({ fechaNacimiento: e.target.value })}
              />
            </Campo>

            <Campo label="Sexo">
              <select
                className="select"
                value={persona.sexo}
                onChange={(e) => cambiar({ sexo: e.target.value as Persona["sexo"] })}
              >
                <option value="">Sin especificar</option>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
                <option value="X">Otro</option>
              </select>
            </Campo>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card__cuerpo">
              <h2 className="fieldset__titulo">Contacto</h2>

              <Campo
                label="Correo"
                error={errores.email}
                ayuda="A esta dirección llegan los avisos de renovación."
              >
                <input
                  className="input"
                  type="email"
                  value={persona.email}
                  onChange={(e) => cambiar({ email: e.target.value })}
                  autoComplete="email"
                />
              </Campo>

              <Campo label="Teléfono" ayuda="Con código de país: +56 9 …">
                <input
                  className="input"
                  type="tel"
                  value={persona.telefono}
                  onChange={(e) => cambiar({ telefono: e.target.value })}
                  autoComplete="tel"
                />
              </Campo>

              <Campo label="Dirección">
                <input
                  className="input"
                  value={persona.direccion}
                  onChange={(e) => cambiar({ direccion: e.target.value })}
                />
              </Campo>

              <Campo label="Comuna">
                <input
                  className="input"
                  value={persona.comuna}
                  onChange={(e) => cambiar({ comuna: e.target.value })}
                />
              </Campo>
            </div>
          </div>

          <div className="card">
            <div className="card__cuerpo">
              <h2 className="fieldset__titulo">Condición de socio</h2>

              <Casilla
                checked={persona.socio}
                onChange={(socio) => cambiar({ socio })}
                ayuda="Ser socio del club es independiente de participar en una rama o escuela."
              >
                Es socio del club
              </Casilla>

              {persona.socio && (
                <>
                  <Campo label="Número de socio">
                    <input
                      className="input"
                      value={persona.numeroSocio}
                      onChange={(e) => cambiar({ numeroSocio: e.target.value })}
                    />
                  </Campo>

                  <Campo label="Categoría">
                    <select
                      className="select"
                      value={persona.categoriaSocio}
                      onChange={(e) =>
                        cambiar({ categoriaSocio: e.target.value as Persona["categoriaSocio"] })
                      }
                    >
                      <option value="">Sin categoría</option>
                      <option value="activo">Activo</option>
                      <option value="cooperador">Cooperador</option>
                      <option value="vitalicio">Vitalicio</option>
                      <option value="honorario">Honorario</option>
                    </select>
                  </Campo>

                  <Campo label="Fecha de ingreso al club">
                    <input
                      className="input"
                      type="date"
                      value={persona.fechaIngreso}
                      onChange={(e) => cambiar({ fechaIngreso: e.target.value })}
                    />
                  </Campo>
                </>
              )}

              <Casilla checked={persona.activo} onChange={(activo) => cambiar({ activo })}>
                Sigue participando en el club
              </Casilla>
            </div>
          </div>
        </div>
      </div>

      {!existente && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card__cuerpo">
            <h2 className="fieldset__titulo">
              Adulto responsable {esMenor ? "(obligatorio: es menor de edad)" : "(opcional)"}
            </h2>
            <p className="campo__ayuda" style={{ marginBottom: 12 }}>
              Enlaza esta ficha con quien responde y paga por ella. Si el adulto ya está en el
              sistema, búsquelo: así queda una sola ficha suya, con todos sus hijos colgando.
            </p>

            {errores.vinculo && <p className="campo__error">{errores.vinculo}</p>}

            {adultoElegido ? (
              <div className="fila" style={{ marginBottom: 12 }}>
                <div className="fila__cuerpo">
                  <div className="fila__titulo">{nombreCompleto(adultoElegido)}</div>
                  <div className="fila__meta">
                    {[adultoElegido.email, adultoElegido.telefono].filter(Boolean).join(" · ") ||
                      "Sin datos de contacto"}
                  </div>
                </div>
                <div className="fila__acciones">
                  <button
                    type="button"
                    className="btn btn--fantasma btn--sm"
                    onClick={() => setAdultoElegido(null)}
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ) : adultoNuevo ? (
              <div className="grid grid--2">
                <Campo label="Nombres del adulto">
                  <input
                    className="input"
                    value={adultoNuevo.nombres}
                    onChange={(e) => setAdultoNuevo({ ...adultoNuevo, nombres: e.target.value })}
                  />
                </Campo>
                <Campo label="Apellidos del adulto">
                  <input
                    className="input"
                    value={adultoNuevo.apellidos}
                    onChange={(e) => setAdultoNuevo({ ...adultoNuevo, apellidos: e.target.value })}
                  />
                </Campo>
                <Campo label="RUT del adulto">
                  <input
                    className="input"
                    value={formatearRut(adultoNuevo.rut)}
                    onChange={(e) => setAdultoNuevo({ ...adultoNuevo, rut: e.target.value })}
                  />
                </Campo>
                <Campo label="Correo del adulto" ayuda="Acá llegan los avisos de vencimiento.">
                  <input
                    className="input"
                    type="email"
                    value={adultoNuevo.email}
                    onChange={(e) => setAdultoNuevo({ ...adultoNuevo, email: e.target.value })}
                  />
                </Campo>
                <Campo label="Teléfono del adulto">
                  <input
                    className="input"
                    type="tel"
                    value={adultoNuevo.telefono}
                    onChange={(e) => setAdultoNuevo({ ...adultoNuevo, telefono: e.target.value })}
                  />
                </Campo>
                <div style={{ alignSelf: "end", marginBottom: 15 }}>
                  <button
                    type="button"
                    className="btn btn--fantasma btn--sm"
                    onClick={() => setAdultoNuevo(null)}
                  >
                    Cancelar y buscar uno existente
                  </button>
                </div>
              </div>
            ) : (
              <>
                <BuscadorPersona
                  personas={personas}
                  soloAdultos
                  etiqueta="Buscar al adulto en el sistema"
                  ayuda="Escriba dos letras del nombre, el RUT o el número de socio."
                  onElegir={setAdultoElegido}
                />
                <button
                  type="button"
                  className="btn btn--fantasma btn--sm"
                  onClick={() =>
                    setAdultoNuevo({ nombres: "", apellidos: "", rut: "", email: "", telefono: "" })
                  }
                >
                  No está en el sistema: crear su ficha
                </button>
              </>
            )}

            {(adultoElegido || adultoNuevo) && (
              <Campo label="Relación con esta persona">
                <select
                  className="select"
                  value={tipoVinculo}
                  onChange={(e) => setTipoVinculo(e.target.value as TipoVinculo)}
                >
                  {TIPOS_VINCULO.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card__cuerpo">
          <h2 className="fieldset__titulo">Salud, emergencia y autorizaciones</h2>
          <div className="grid grid--2">
            <Campo label="Contacto de emergencia">
              <input
                className="input"
                value={persona.contactoEmergencia}
                onChange={(e) => cambiar({ contactoEmergencia: e.target.value })}
              />
            </Campo>
            <Campo label="Teléfono de emergencia">
              <input
                className="input"
                type="tel"
                value={persona.telefonoEmergencia}
                onChange={(e) => cambiar({ telefonoEmergencia: e.target.value })}
              />
            </Campo>
            <Campo label="Previsión de salud">
              <input
                className="input"
                value={persona.prevision}
                onChange={(e) => cambiar({ prevision: e.target.value })}
                placeholder="Fonasa, Isapre, seguro escolar…"
              />
            </Campo>
            <Campo label="Observaciones de salud" ayuda="Alergias, medicamentos, lesiones.">
              <input
                className="input"
                value={persona.observacionesSalud}
                onChange={(e) => cambiar({ observacionesSalud: e.target.value })}
              />
            </Campo>
          </div>

          <Casilla
            checked={persona.autorizaImagen}
            onChange={(autorizaImagen) => cambiar({ autorizaImagen })}
            ayuda="Marque sólo si hay autorización firmada. En menores la firma el apoderado."
          >
            Autoriza el uso de su imagen en comunicaciones del club
          </Casilla>

          <Campo label="Notas internas">
            <textarea
              className="textarea"
              value={persona.notas}
              onChange={(e) => cambiar({ notas: e.target.value })}
            />
          </Campo>
        </div>
      </div>

      <div className="form-pie">
        {Object.keys(errores).length > 0 && (
          <span className="form-pie__error">Revise los campos marcados antes de guardar.</span>
        )}
        <button
          type="button"
          className="btn btn--fantasma"
          onClick={() => navegar(existente ? `/personas/${existente.id}` : "/")}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn--primario" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar ficha"}
        </button>
      </div>
    </form>
  );
}
