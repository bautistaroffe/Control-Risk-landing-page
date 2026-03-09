const {
  buildHtml,
  checkRateLimit,
  hasValidFileSignature,
  json,
  parseMultipart,
  sanitizeFormPayload,
  sendMail,
  validateFormGuard,
  validateOrigin,
  validateWork,
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

  const rate = checkRateLimit(event, "work");
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
  let file;
  try {
    const parsed = await parseMultipart(event, { allowFile: true });
    fields = parsed.fields;
    file = parsed.file;
  } catch (err) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return json(400, { message: "El archivo supera el limite permitido (2MB)." });
    }
    if (err.code === "INVALID_CONTENT_TYPE") {
      return json(400, { message: "Formato de solicitud invalido." });
    }
    return json(400, { message: "No se pudo procesar el formulario." });
  }

  const clean = sanitizeFormPayload(fields || {});
  const guardError = validateFormGuard(fields || {});
  const error = validateWork(clean || {}, file || null);

  if (guardError) {
    return json(400, { message: guardError });
  }
  if (error) {
    return json(400, { message: error });
  }
  if (!hasValidFileSignature(file)) {
    return json(400, { message: "Formato de CV no permitido." });
  }

  try {
    const subject = "Control Risk - nueva postulacion";
    const text = [
      `Nombre: ${clean.nombre}`,
      `Correo: ${clean.email}`,
      `Telefono: ${clean.telefono}`,
      "CV: adjunto",
    ].join("\n");

    const html = buildHtml("Postulacion laboral", {
      Nombre: clean.nombre,
      Correo: clean.email,
      Telefono: clean.telefono,
      "CV adjunto": file.originalname,
    });

    const attachments = [
      {
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      },
    ];

    await sendMail(subject, text, html, attachments);
    return json(200, { ok: true });
  } catch (err) {
    if (err.code === "SMTP_NOT_CONFIGURED") {
      return json(503, { message: "SMTP pendiente de configurar." });
    }
    return json(500, { message: "No se pudo enviar el formulario." });
  }
};
