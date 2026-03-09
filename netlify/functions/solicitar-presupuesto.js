const {
  buildHtml,
  checkRateLimit,
  json,
  parseMultipart,
  sanitizeFormPayload,
  sendMail,
  validateBudget,
  validateFormGuard,
  validateOrigin,
} = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204 };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { message: "Metodo no permitido." });
  }
  if (!validateOrigin(event)) {
    return json(403, { message: "Origen no permitido." });
  }

  const rate = checkRateLimit(event, "budget");
  if (!rate.ok) {
    return {
      ...json(429, { message: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." }),
      headers: {
        ...json(429, {}).headers,
        "Retry-After": String(rate.retryAfterSec),
      },
    };
  }

  let fields;
  try {
    const parsed = await parseMultipart(event, { allowFile: false });
    fields = parsed.fields;
  } catch (err) {
    if (err.code === "INVALID_CONTENT_TYPE") {
      return json(400, { message: "Formato de solicitud invalido." });
    }
    return json(400, { message: "No se pudo procesar el formulario." });
  }

  const guardError = validateFormGuard(fields || {});
  const clean = sanitizeFormPayload(fields || {});
  const error = validateBudget(clean);

  if (guardError) {
    return json(400, { message: guardError });
  }
  if (error) {
    return json(400, { message: error });
  }

  try {
    const subject = "Control Risk- consulta de cotizacion";
    const text = [`Nombre: ${clean.nombre}`, `Correo: ${clean.email}`, `Consulta: ${clean.consulta}`].join("\n");
    const html = buildHtml("Solicitud de presupuesto", {
      Nombre: clean.nombre,
      Correo: clean.email,
      Consulta: clean.consulta,
    });

    await sendMail(subject, text, html);
    return json(200, { ok: true });
  } catch (err) {
    if (err.code === "SMTP_NOT_CONFIGURED") {
      return json(503, { message: "SMTP pendiente de configurar." });
    }
    return json(500, { message: "No se pudo enviar el formulario." });
  }
};
