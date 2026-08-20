import { useRef, useState } from "react";
import type { Jugador } from "../domain/types";
import { iniciales } from "../domain/scoring";

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

const LADO_MAX = 640;
const CALIDAD = 0.82;

/**
 * Reduce la foto a 640 px de lado mayor y la recodifica a JPEG antes de
 * guardarla. Una foto de teléfono pesa 3-5 MB; así queda en 50-80 KB, que es lo
 * que hace viable guardarla junto al resto de la ficha.
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
  alt: string;
}

export function EntradaFoto({ valor, onCambio, alt }: EntradaFotoProps) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  async function manejar(archivo: File | undefined) {
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
    <div>
      <div className="foto" style={{ maxWidth: 220 }}>
        {valor ? <img src={valor} alt={alt} /> : <span className="foto__vacia">SIN FOTO</span>}
      </div>

      {/* `capture` abre directamente la cámara en teléfono y tablet. */}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          void manejar(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn--fantasma btn--sm"
          onClick={() => input.current?.click()}
          disabled={procesando}
        >
          {procesando ? "Procesando…" : valor ? "Cambiar foto" : "Tomar o subir foto"}
        </button>
        {valor && (
          <button
            type="button"
            className="btn btn--fantasma btn--sm"
            onClick={() => onCambio(null)}
          >
            Quitar
          </button>
        )}
      </div>
      {error && <p className="campo__error" style={{ marginTop: 6 }}>{error}</p>}
    </div>
  );
}
