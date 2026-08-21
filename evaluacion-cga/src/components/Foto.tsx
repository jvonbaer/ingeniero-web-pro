import { useRef, useState } from "react";
import type { Jugador } from "../domain/types";
import { iniciales } from "../domain/scoring";
import { Camara } from "./Camara";

interface FotoProps {
  jugador: Pick<Jugador, "nombre" | "apellido" | "fotoDataUrl">;
  mini?: boolean;
  className?: string;
}

export function Foto({ jugador, mini, className = "" }: FotoProps) {
  const clases = ["foto", mini ? "foto--mini" : "", className].filter(Boolean).join(" ");
  return (
    <div className={clases}>
      {jugador.fotoDataUrl ? (
        <img src={jugador.fotoDataUrl} alt={`${jugador.nombre} ${jugador.apellido}`} />
      ) : (
        <span className="foto__vacia" aria-hidden="true">
          {iniciales(jugador as Jugador)}
        </span>
      )}
    </div>
  );
}

const LADO_MAX = 800;
const CALIDAD = 0.82;

/**
 * Reduce la foto a 800 px de lado mayor y la recodifica a JPEG antes de
 * guardarla. Una foto de teléfono pesa 3-5 MB; así queda en 60-90 KB, que es lo
 * que hace viable guardarla junto al resto de la ficha.
 *
 * No recorta: la imagen se guarda completa y es la ficha la que decide qué parte
 * mostrar. Lo que sí llega recortado es lo que viene de la cámara, porque ahí el
 * entrenador encuadró en vivo.
 */
export function comprimirImagen(archivo: File): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error("No se pudo leer la imagen."));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => rechazar(new Error("El archivo no es una imagen válida."));
      img.onload = () => {
        const escala = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * escala);
        const h = Math.round(img.height * escala);
        const lienzo = document.createElement("canvas");
        lienzo.width = w;
        lienzo.height = h;
        const ctx = lienzo.getContext("2d");
        if (!ctx) return rechazar(new Error("El navegador no permitió procesar la imagen."));
        ctx.drawImage(img, 0, 0, w, h);
        resolver(lienzo.toDataURL("image/jpeg", CALIDAD));
      };
      img.src = lector.result as string;
    };
    lector.readAsDataURL(archivo);
  });
}

interface EntradaFotoProps {
  valor: string | null;
  onCambio: (dataUrl: string | null) => void;
  /** Nombre del jugador: se usa en el texto alternativo y en el visor de cámara. */
  nombre: string;
  /** Mensaje de estado que muestra quien la usa, por ejemplo "Foto guardada". */
  mensaje?: string | null;
}

/**
 * Dos caminos separados para la misma foto: tomarla en el momento con la cámara
 * —del teléfono o del computador, es el mismo visor— o subir un archivo que ya
 * existe. Antes había un solo botón que en el teléfono forzaba la cámara y no
 * dejaba llegar a la galería.
 */
export function EntradaFoto({ valor, onCambio, nombre, mensaje }: EntradaFotoProps) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [camaraAbierta, setCamaraAbierta] = useState(false);

  async function subir(archivo: File | undefined) {
    if (!archivo) return;
    setProcesando(true);
    setError(null);
    try {
      onCambio(await comprimirImagen(archivo));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo procesar la imagen.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="entrada-foto">
      <div className="foto">
        {valor ? (
          <img src={valor} alt={`Foto de ${nombre}`} />
        ) : (
          <span className="foto__vacia">SIN FOTO</span>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          void subir(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="foto__acciones">
        <button
          type="button"
          className="btn btn--primario btn--sm"
          onClick={() => setCamaraAbierta(true)}
          disabled={procesando}
        >
          Tomar foto
        </button>
        <button
          type="button"
          className="btn btn--fantasma btn--sm"
          onClick={() => input.current?.click()}
          disabled={procesando}
        >
          {procesando ? "Procesando…" : "Subir archivo"}
        </button>
        {valor && (
          <button
            type="button"
            className="btn btn--fantasma btn--sm"
            onClick={() => onCambio(null)}
            disabled={procesando}
          >
            Quitar
          </button>
        )}
      </div>

      {mensaje && <p className="foto__mensaje">{mensaje}</p>}
      {error && <p className="campo__error" style={{ marginTop: 6 }}>{error}</p>}

      {camaraAbierta && (
        <Camara
          nombre={nombre}
          onCerrar={() => setCamaraAbierta(false)}
          onCapturar={(dataUrl) => {
            onCambio(dataUrl);
            setCamaraAbierta(false);
          }}
        />
      )}
    </div>
  );
}
