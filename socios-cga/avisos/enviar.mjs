#!/usr/bin/env node
/**
 * Envío automático de los avisos de renovación.
 *
 * Corre una vez al día desde GitHub Actions (.github/workflows/avisos-cga.yml),
 * que es gratuito, y hace lo mismo que haría alguien entrando a la pantalla de
 * Cobranzas y pulsando «Correo» en cada fila: le escribe al pagador de cada
 * cuota que vence dentro de su ventana de aviso —cinco días por omisión— y de
 * cada cuota ya vencida.
 *
 * Tres decisiones que conviene conocer antes de tocarlo:
 *
 *  1. **No recalcula nada.** Lee la vista `v_cobranzas` del esquema, que ya
 *     deduce el vencimiento a partir de los pagos con la misma regla que la
 *     aplicación. Si la regla cambia, cambia en un solo lugar.
 *  2. **No repite avisos.** Cada envío queda registrado en la tabla `avisos`,
 *     que tiene un índice único por (inscripción, vencimiento) para los avisos
 *     automáticos. Aunque la tarea corra cinco veces en los cinco días previos,
 *     el pagador recibe un correo, no cinco.
 *  3. **Sin dependencias.** Habla con Supabase y con Resend por HTTP directo,
 *     así la tarea programada no necesita instalar nada y no se cae porque un
 *     paquete cambió.
 *
 * Variables de entorno (en GitHub: Settings → Secrets and variables → Actions):
 *
 *   SUPABASE_URL          https://abcdefgh.supabase.co
 *   SUPABASE_SERVICE_KEY  clave «service_role» del proyecto. Es la que salta el
 *                         RLS: NUNCA va dentro del sitio web ni en el
 *                         repositorio, sólo como secreto de la tarea.
 *   RESEND_API_KEY        clave de resend.com (plan gratuito: 3.000 correos al
 *                         mes). Sin ella el script hace un ensayo y no envía.
 *   REMITENTE             "Club Gimnástico Alemán <avisos@sudominio.cl>"
 *   RESPONDER_A           (opcional) correo del club para las respuestas.
 *   ENSAYO                (opcional) "1" para listar sin enviar ni registrar.
 */

const URL_BASE = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const SERVICIO = process.env.SUPABASE_SERVICE_KEY ?? "";
const RESEND = process.env.RESEND_API_KEY ?? "";
const REMITENTE = process.env.REMITENTE ?? "Club Gimnástico Alemán <onboarding@resend.dev>";
const RESPONDER_A = process.env.RESPONDER_A ?? "";
const ENSAYO = process.env.ENSAYO === "1" || !RESEND;

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatoLargo(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return iso ?? "—";
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

function pesos(monto) {
  return `$${Math.round(monto).toLocaleString("es-CL")}`;
}

/** Llamada cruda: devuelve el estado HTTP sin reventar, para poder mirarlo. */
async function pedir(ruta, opciones = {}) {
  const respuesta = await fetch(`${URL_BASE}/rest/v1/${ruta}`, {
    ...opciones,
    headers: {
      apikey: SERVICIO,
      Authorization: `Bearer ${SERVICIO}`,
      "Content-Type": "application/json",
      ...(opciones.headers ?? {}),
    },
  });
  const texto = await respuesta.text();
  let datos = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }
  return { ok: respuesta.ok, estado: respuesta.status, datos, texto };
}

async function supabase(ruta, opciones = {}) {
  const r = await pedir(ruta, opciones);
  if (!r.ok) throw new Error(`Supabase respondió ${r.estado}: ${r.texto.slice(0, 300)}`);
  return r.datos;
}

/**
 * El texto del aviso. Es el mismo que arma la aplicación en
 * src/domain/avisos.ts; si se cambia acá, cámbielo también allá para que el
 * apoderado reciba lo mismo lo mande quien lo mande.
 */
function mensaje(fila) {
  const dias = Number(fila.dias);
  const cuando =
    dias < 0
      ? `venció el ${formatoLargo(fila.vence)}`
      : dias === 0
        ? `vence hoy, ${formatoLargo(fila.vence)}`
        : `vence el ${formatoLargo(fila.vence)}, en ${dias} días`;

  const mismaPersona = fila.pagador_id === fila.persona_id;
  const porQuien = mismaPersona ? "su participación" : `la participación de ${fila.persona}`;
  const nombrePila = (fila.pagador ?? "").split(" ")[0] || fila.pagador || "";

  const asunto = `CGA · ${fila.plan} — ${dias < 0 ? "cuota vencida" : "renovación próxima"}`;

  const cuerpo = [
    `Estimado/a ${nombrePila}:`,
    "",
    `Le escribimos del Club Gimnástico Alemán para recordarle que ${porQuien} en ` +
      `${fila.plan} ${cuando}.`,
    "",
    `Plan: ${fila.plan}`,
    `Valor del período: ${pesos(fila.valor)}`,
    `Vencimiento: ${formatoLargo(fila.vence)}`,
    "",
    "Puede renovar en la secretaría del club o por transferencia, indicando el nombre",
    "de quien participa. Si ya realizó el pago, le pedimos disculpas y le agradecemos",
    "hacernos llegar el comprobante para registrarlo.",
    "",
    "Un saludo cordial,",
    "Club Gimnástico Alemán · Temuco",
  ].join("\n");

  return { asunto, cuerpo };
}

async function enviarCorreo(destino, { asunto, cuerpo }) {
  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: REMITENTE,
      to: [destino],
      subject: asunto,
      text: cuerpo,
      ...(RESPONDER_A ? { reply_to: RESPONDER_A } : {}),
    }),
  });
  const dato = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(dato?.message ?? `Resend respondió ${respuesta.status}`);
  }
  return dato?.id ?? "";
}

/** Identificador propio, del mismo estilo que los que crea la aplicación. */
function nuevoId() {
  return `avi_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

async function principal() {
  if (!URL_BASE || !SERVICIO) {
    console.error(
      "Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY. Se configuran como secretos de la tarea.",
    );
    process.exit(1);
  }

  // Sólo lo que hay que avisar: activas, vencidas o dentro de su ventana.
  const filas = await supabase(
    "v_cobranzas?estado_inscripcion=eq.activa&estado_cobro=in.(vencida,por-vencer)&order=dias.asc",
  );

  if (filas.length === 0) {
    console.log("No hay cuotas por vencer ni vencidas. Nada que avisar.");
    return;
  }

  // Los avisos automáticos ya registrados desde el vencimiento más antiguo de
  // la lista en adelante. Se filtra por fecha y no por una lista de
  // identificadores: con un par de cientos de inscripciones, esa lista haría
  // una dirección de varios miles de caracteres que algún intermediario acaba
  // rechazando.
  const desde = filas.reduce((min, f) => (f.vence < min ? f.vence : min), filas[0].vence);
  const yaEnviados = await supabase(
    `avisos?estado=eq.enviado&vence=gte.${desde}&select=inscripcion_id,vence&limit=5000`,
  );
  const marcados = new Set(yaEnviados.map((a) => `${a.inscripcion_id}|${a.vence}`));

  let enviados = 0;
  let repetidos = 0;
  let fallidos = 0;
  const aMano = [];

  for (const fila of filas) {
    const clave = `${fila.inscripcion_id}|${fila.vence}`;
    if (marcados.has(clave)) {
      repetidos++;
      continue;
    }

    // WhatsApp no tiene una vía gratuita y automática: esas quedan listadas para
    // hacerlas a mano desde la pantalla de Cobranzas.
    const porCorreo = fila.canal_aviso === "correo" || fila.canal_aviso === "ambos";
    if (!porCorreo || !fila.avisar_email) {
      aMano.push(
        `${fila.persona} · ${fila.plan} · vence ${fila.vence} · ` +
          (fila.avisar_telefono || "sin teléfono ni correo"),
      );
      continue;
    }

    const texto = mensaje(fila);

    if (ENSAYO) {
      console.log(`[ensayo] ${fila.avisar_email} ← ${texto.asunto}`);
      enviados++;
      continue;
    }

    // El aviso se anota ANTES de enviarlo, no después. La tabla tiene un índice
    // único por (inscripción, vencimiento) para los avisos ya enviados, así que
    // esta fila es una reserva: si otra ejecución se le adelantó, la base
    // responde 409 y acá no se manda nada. Al revés —enviar y después anotar—
    // dos ejecuciones simultáneas alcanzarían a mandar el mismo correo dos
    // veces antes de que ninguna hubiera anotado.
    const idAviso = nuevoId();
    const reserva = await pedir("avisos", {
      method: "POST",
      body: JSON.stringify({
        id: idAviso,
        inscripcion_id: fila.inscripcion_id,
        vence: fila.vence,
        canal: "correo",
        destino: fila.avisar_email,
        estado: "enviado",
        detalle: "Envío automático",
      }),
    });

    if (!reserva.ok) {
      if (reserva.estado === 409) {
        repetidos++;
        continue;
      }
      fallidos++;
      console.error(`No se pudo anotar el aviso de ${fila.persona}: ${reserva.texto.slice(0, 200)}`);
      continue;
    }

    try {
      const idCorreo = await enviarCorreo(fila.avisar_email, texto);
      enviados++;
      console.log(`Avisado: ${fila.persona} → ${fila.avisar_email} (vence ${fila.vence})`);
      if (idCorreo) {
        await pedir(`avisos?id=eq.${idAviso}`, {
          method: "PATCH",
          body: JSON.stringify({ detalle: `Envío automático · ${idCorreo}` }),
        });
      }
    } catch (error) {
      fallidos++;
      console.error(`Falló el aviso de ${fila.persona}: ${error.message}`);
      // La reserva pasa a `error`: queda a la vista en la aplicación y, como el
      // índice único sólo cubre los avisos enviados, mañana se vuelve a
      // intentar en vez de darse por hecho para siempre.
      await pedir(`avisos?id=eq.${idAviso}`, {
        method: "PATCH",
        body: JSON.stringify({
          estado: "error",
          detalle: String(error.message).slice(0, 300),
        }),
      });
    }
  }

  console.log("");
  console.log(`Revisadas: ${filas.length} cuotas por vencer o vencidas.`);
  console.log(`Avisos enviados: ${enviados}${ENSAYO ? " (ensayo, no se envió nada)" : ""}`);
  console.log(`Ya avisados antes: ${repetidos}`);
  if (fallidos > 0) console.log(`Con error: ${fallidos}`);
  if (aMano.length > 0) {
    console.log("");
    console.log(`Quedan ${aMano.length} para avisar a mano (WhatsApp o sin correo):`);
    for (const linea of aMano) console.log(`  · ${linea}`);
  }

  // Un fallo de envío no debe pasar inadvertido: que la tarea salga en rojo es
  // la única señal que llega sin que nadie entre a mirar.
  if (fallidos > 0) process.exit(1);
}

await principal();
