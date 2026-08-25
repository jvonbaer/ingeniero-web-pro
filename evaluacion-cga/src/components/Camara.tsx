import { useCallback, useEffect, useRef, useState } from "react";

/** Proporción 3:4 vertical: la misma con la que se muestra la foto en la ficha y en el informe. */
const PROPORCION = 3 / 4;
const ALTO_MAX = 800;
const CALIDAD = 0.82;

type Lente = "environment" | "user";

interface Props {
  onCapturar: (dataUrl: string) => void;
  onCerrar: () => void;
  nombre: string;
}

function mensajeDeError(e: unknown): string {
  const nombre = e instanceof DOMException ? e.name : "";
  if (nombre === "NotAllowedError" || nombre === "SecurityError") {
    return "No se autorizó el uso de la cámara. Revise los permisos del navegador para este sitio y vuelva a intentarlo.";
  }
  if (nombre === "NotFoundError" || nombre === "OverconstrainedError") {
    return "No encontramos una cámara disponible en este dispositivo.";
  }
  if (nombre === "NotReadableError") {
    return "La cámara está ocupada por otra aplicación. Ciérrela y vuelva a intentarlo.";
  }
  return "No se pudo abrir la cámara.";
}

/**
 * Recorta el cuadro de video al encuadre 3:4 que el entrenador vio en pantalla y
 * lo baja a 800 px de alto. Una captura cruda de cámara pesa varios megabytes;
 * así queda en unos 70 KB, que es lo que la hace viable dentro de la ficha.
 */
function capturarLienzo(video: HTMLVideoElement, espejo: boolean): string {
  const ancho = video.videoWidth;
  const alto = video.videoHeight;

  let recorteAncho = ancho;
  let recorteAlto = Math.round(ancho / PROPORCION);
  if (recorteAlto > alto) {
    recorteAlto = alto;
    recorteAncho = Math.round(alto * PROPORCION);
  }

  const escala = Math.min(1, ALTO_MAX / recorteAlto);
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(recorteAncho * escala);
  lienzo.height = Math.round(recorteAlto * escala);

  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("El navegador no permitió procesar la imagen.");

  // La cámara frontal se previsualiza en espejo, como la gente espera verse.
  // La foto guardada va sin espejo, que es como se ve el niño de verdad.
  if (espejo) {
    ctx.translate(lienzo.width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(
    video,
    (ancho - recorteAncho) / 2,
    (alto - recorteAlto) / 2,
    recorteAncho,
    recorteAlto,
    0,
    0,
    lienzo.width,
    lienzo.height,
  );

  return lienzo.toDataURL("image/jpeg", CALIDAD);
}

/**
 * Visor de cámara. Usa getUserMedia, que funciona igual en el teléfono —con la
 * cámara trasera por omisión— y en el computador con la webcam. Requiere que el
 * sitio esté servido por HTTPS; en `localhost` también, para poder probar.
 */
export function Camara({ onCapturar, onCerrar, nombre }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const emision = useRef<MediaStream | null>(null);
  const [lente, setLente] = useState<Lente>("environment");
  const [captura, setCaptura] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const detener = useCallback(() => {
    emision.current?.getTracks().forEach((pista) => pista.stop());
    emision.current = null;
  }, []);

  useEffect(() => {
    // Mientras se revisa una captura no hace falta tener la cámara encendida.
    if (captura) {
      detener();
      return;
    }

    let cancelado = false;

    async function abrir() {
      setError(null);
      setListo(false);

      if (!window.isSecureContext) {
        setError(
          "La cámara sólo funciona en sitios seguros (https). Abra la aplicación por su dirección https o suba la foto desde un archivo.",
        );
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Este navegador no permite usar la cámara. Puede subir la foto desde un archivo.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: lente, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((pista) => pista.stop());
          return;
        }
        emision.current = stream;
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play();
        }
        setListo(true);
      } catch (e) {
        if (!cancelado) setError(mensajeDeError(e));
      }
    }

    void abrir();
    return () => {
      cancelado = true;
      detener();
    };
  }, [lente, captura, detener]);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  function tomar() {
    if (!video.current) return;
    try {
      setCaptura(capturarLienzo(video.current, lente === "user"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo tomar la foto.");
    }
  }

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Tomar foto de ${nombre}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="modal__caja camara">
        <div className="camara__cabecera">
          <div>
            <span className="eyebrow">Tomar foto</span>
            <h2>{nombre}</h2>
          </div>
          <button type="button" className="btn btn--fantasma btn--sm" onClick={onCerrar}>
            Cerrar
          </button>
        </div>

        <div className="camara__visor">
          {captura ? (
            <img src={captura} alt="Foto recién tomada" />
          ) : (
            <video
              ref={video}
              className={lente === "user" ? "camara__video camara__video--espejo" : "camara__video"}
              playsInline
              muted
            />
          )}

          {!captura && !error && !listo && (
            <p className="camara__aviso">Encendiendo la cámara…</p>
          )}
          {error && <p className="camara__aviso camara__aviso--error">{error}</p>}
        </div>

        <div className="camara__acciones">
          {captura ? (
            <>
              <button
                type="button"
                className="btn btn--fantasma"
                onClick={() => setCaptura(null)}
              >
                Repetir
              </button>
              <button
                type="button"
                className="btn btn--primario"
                onClick={() => onCapturar(captura)}
              >
                Usar esta foto
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn--fantasma"
                onClick={() => setLente((l) => (l === "environment" ? "user" : "environment"))}
                disabled={!listo}
              >
                {lente === "environment" ? "Cámara frontal" : "Cámara trasera"}
              </button>
              <button
                type="button"
                className="btn btn--primario"
                onClick={tomar}
                disabled={!listo}
                autoFocus
              >
                Tomar foto
              </button>
            </>
          )}
        </div>

        <p className="camara__pie">
          Encuadre al jugador de la cintura hacia arriba. La foto se guarda recortada en vertical,
          igual que se ve en la ficha y en el informe.
        </p>
      </div>
    </div>
  );
}
