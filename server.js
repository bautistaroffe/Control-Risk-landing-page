const path = require("path");
const express = require("express");
const nodemailer = require("nodemailer");
const multer = require("multer");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders(res, filePath) {
      if (/\.(?:css|js|png|jpg|jpeg|gif|svg|webp|avif|woff2)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return;
      }

      if (/\.html$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      }
    },
  }),
);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedCvTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const decryptMailTo = (encryptedValue, keyValue) => {
  const parts = String(encryptedValue || "").split(":");
  if (parts.length !== 3) {
    const error = new Error("MAIL_TO_ENCRYPTED_INVALID_FORMAT");
    error.code = "MAIL_TO_ENCRYPTED_INVALID_FORMAT";
    throw error;
  }

  const [ivB64, cipherB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(cipherB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const key = crypto.createHash("sha256").update(String(keyValue)).digest();

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8").trim();
};

const getSmtpConfig = () => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    MAIL_FROM,
    MAIL_TO,
    MAIL_TO_ENCRYPTED,
    MAIL_TO_KEY,
  } = process.env;
  let to = MAIL_TO;

  if (!to && MAIL_TO_ENCRYPTED && MAIL_TO_KEY) {
    to = decryptMailTo(MAIL_TO_ENCRYPTED, MAIL_TO_KEY);
  }

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_FROM || !to) {
    return null;
  }

  return {
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    from: MAIL_FROM,
    to,
  };
};

const validateCommon = (data) => {
  if (!data.nombre || data.nombre.trim().length < 2) {
    return "Nombre invalido.";
  }
  if (!data.email || !emailRegex.test(data.email)) {
    return "Correo invalido.";
  }
  return null;
};

const validateBudget = (data) => {
  const commonError = validateCommon(data);
  if (commonError) return commonError;
  if (!data.consulta || data.consulta.trim().length < 5) {
    return "Consulta requerida.";
  }
  return null;
};

const validateWork = (data, file) => {
  const commonError = validateCommon(data);
  if (commonError) return commonError;
  if (!data.telefono || data.telefono.replace(/\D/g, "").length < 6) {
    return "Telefono invalido.";
  }
  if (!file) {
    return "CV requerido.";
  }
  if (!allowedCvTypes.includes(file.mimetype)) {
    return "Formato de CV no permitido.";
  }
  return null;
};

const sendMail = async (subject, text, html, attachments = []) => {
  const smtp = getSmtpConfig();
  if (!smtp) {
    const error = new Error("SMTP_NOT_CONFIGURED");
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
  });

  await transporter.sendMail({
    from: smtp.from,
    to: smtp.to,
    subject,
    text,
    html,
    attachments,
  });
};

const buildHtml = (title, fields) => {
  const rows = Object.entries(fields)
    .map(([label, value]) => `<tr><td style="padding:8px 12px;font-weight:600;">${label}</td><td style="padding:8px 12px;">${value}</td></tr>`)
    .join("");

  return `
    <div style="font-family:Arial, sans-serif;">
      <h2 style="color:#b91c1c;">${title}</h2>
      <table style="border-collapse:collapse;">${rows}</table>
    </div>
  `;
};

app.post("/api/solicitar-presupuesto", upload.none(), async (req, res) => {
  const data = req.body || {};
  const error = validateBudget(data);

  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const subject = "Control Risk- consulta de cotizacion";
    const text = [
      `Nombre: ${data.nombre}`,
      `Correo: ${data.email}`,
      `Consulta: ${data.consulta}`,
    ].join("\n");

    const html = buildHtml("Solicitud de presupuesto", {
      Nombre: data.nombre,
      Correo: data.email,
      Consulta: data.consulta,
    });

    await sendMail(subject, text, html);
    return res.json({ ok: true });
  } catch (err) {
    if (err.code === "SMTP_NOT_CONFIGURED") {
      return res.status(503).json({ message: "SMTP pendiente de configurar." });
    }

    return res.status(500).json({ message: "No se pudo enviar el formulario." });
  }
});

app.post("/api/trabaja-con-nosotros", upload.single("cv"), async (req, res) => {
  const data = req.body || {};
  const file = req.file || null;
  const error = validateWork(data, file);

  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const subject = "Control Risk - nueva postulacion";
    const text = [
      `Nombre: ${data.nombre}`,
      `Correo: ${data.email}`,
      `Telefono: ${data.telefono}`,
      `CV: adjunto`,
    ].join("\n");

    const html = buildHtml("Postulacion laboral", {
      Nombre: data.nombre,
      Correo: data.email,
      Telefono: data.telefono,
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
    return res.json({ ok: true });
  } catch (err) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "El archivo supera el limite permitido (2MB)." });
    }

    if (err.code === "SMTP_NOT_CONFIGURED") {
      return res.status(503).json({ message: "SMTP pendiente de configurar." });
    }

    return res.status(500).json({ message: "No se pudo enviar el formulario." });
  }
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
