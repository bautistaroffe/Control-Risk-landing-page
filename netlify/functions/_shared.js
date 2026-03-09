const crypto = require("crypto");
const path = require("path");
const Busboy = require("busboy");
const nodemailer = require("nodemailer");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedCvTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const allowedCvExtensions = new Set([".pdf", ".doc", ".docx"]);
const maxCvSizeBytes = 2 * 1024 * 1024;
const maxBodyBytes = 3 * 1024 * 1024;
const minFormFillMs = 1200;
const maxFormAgeMs = 2 * 60 * 60 * 1000;
const maxNombreLength = 120;
const maxEmailLength = 254;
const maxTelefonoLength = 40;
const maxConsultaLength = 2000;
const maxCvFilenameLength = 160;

const defaultRateLimitWindowMs = 10 * 60 * 1000;
const defaultRateLimitMaxRequests = 12;
const rateLimitStore = global.__netlifyRateLimitStore || new Map();
if (!global.__netlifyRateLimitStore) {
  global.__netlifyRateLimitStore = rateLimitStore;
}

const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
  },
  body: JSON.stringify(payload),
});

const getClientIp = (event) => {
  const xff = event?.headers?.["x-forwarded-for"] || event?.headers?.["X-Forwarded-For"] || "";
  const first = String(xff).split(",")[0].trim();
  return first || "unknown";
};

const parseAllowedOrigins = () => {
  const raw = process.env.ALLOWED_ORIGINS || "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
};

const validateOrigin = (event) => {
  const allowedOrigins = parseAllowedOrigins();
  if (allowedOrigins.length === 0) return true;
  const origin = event?.headers?.origin || event?.headers?.Origin || "";
  if (!origin) return false;
  return allowedOrigins.includes(origin);
};

const checkRateLimit = (event, routeKey) => {
  const ip = getClientIp(event);
  const key = `${routeKey}:${ip}`;
  const now = Date.now();
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || defaultRateLimitWindowMs);
  const maxRequests = Number(process.env.RATE_LIMIT_MAX || defaultRateLimitMaxRequests);

  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { ok: true };
};

const htmlEscape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const sanitizeText = (value, maxLength) => {
  const clean = String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.slice(0, maxLength);
};

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
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return decrypted.trim();
};

const getSmtpConfig = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_TO, MAIL_TO_ENCRYPTED, MAIL_TO_KEY } =
    process.env;
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
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;font-weight:600;">${htmlEscape(label)}</td><td style="padding:8px 12px;">${htmlEscape(
          value,
        )}</td></tr>`,
    )
    .join("");

  return `
    <div style="font-family:Arial, sans-serif;">
      <h2 style="color:#b91c1c;">${htmlEscape(title)}</h2>
      <table style="border-collapse:collapse;">${rows}</table>
    </div>
  `;
};

const validateCommon = (data) => {
  if (!data.nombre || data.nombre.length < 2) {
    return "Nombre invalido.";
  }
  if (data.nombre.length > maxNombreLength) {
    return "Nombre invalido.";
  }
  if (!data.email || !emailRegex.test(data.email) || data.email.length > maxEmailLength) {
    return "Correo invalido.";
  }
  return null;
};

const validateBudget = (data) => {
  const commonError = validateCommon(data);
  if (commonError) return commonError;
  if (!data.consulta || data.consulta.length < 5 || data.consulta.length > maxConsultaLength) {
    return "Consulta requerida.";
  }
  return null;
};

const validateWork = (data, file) => {
  const commonError = validateCommon(data);
  if (commonError) return commonError;
  if (!data.telefono || data.telefono.replace(/\D/g, "").length < 6 || data.telefono.length > maxTelefonoLength) {
    return "Telefono invalido.";
  }
  if (!file) {
    return "CV requerido.";
  }
  if (!allowedCvTypes.includes(file.mimetype)) {
    return "Formato de CV no permitido.";
  }
  if (!allowedCvExtensions.has(path.extname(file.originalname || "").toLowerCase())) {
    return "Formato de CV no permitido.";
  }
  if (file.size <= 0 || file.size > maxCvSizeBytes) {
    return "El archivo supera el limite permitido (2MB).";
  }
  return null;
};

const sanitizeFormPayload = (data) => ({
  nombre: sanitizeText(data.nombre, maxNombreLength),
  email: sanitizeText(data.email, maxEmailLength).toLowerCase(),
  telefono: sanitizeText(data.telefono, maxTelefonoLength),
  consulta: sanitizeText(data.consulta, maxConsultaLength),
});

const validateFormGuard = (data) => {
  const honeypot = sanitizeText(data.website || "", 200);
  if (honeypot) {
    return "Solicitud invalida.";
  }

  const started = Number(data.form_started_at);
  if (!Number.isFinite(started)) {
    return "Solicitud invalida.";
  }
  const elapsed = Date.now() - started;
  if (elapsed < minFormFillMs || elapsed > maxFormAgeMs) {
    return "Solicitud invalida.";
  }

  return null;
};

const sanitizeFilename = (rawName) => {
  const baseName = path.basename(String(rawName || "cv"));
  const sanitized = baseName.replace(/[^\w.\-() ]/g, "_").slice(0, maxCvFilenameLength);
  return sanitized || "cv";
};

const hasValidFileSignature = (file) => {
  const buffer = file?.buffer;
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  const ext = path.extname(file.originalname || "").toLowerCase();

  if (ext === ".pdf") {
    return buffer.subarray(0, 4).toString("ascii") === "%PDF";
  }
  if (ext === ".docx") {
    return buffer[0] === 0x50 && buffer[1] === 0x4b; // ZIP header
  }
  if (ext === ".doc") {
    return buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
  }
  return false;
};

const parseMultipart = (event, { allowFile = false } = {}) =>
  new Promise((resolve, reject) => {
    const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"];
    const bodyLength = event.body ? Buffer.byteLength(event.body, event.isBase64Encoded ? "base64" : "utf8") : 0;

    if (bodyLength > maxBodyBytes) {
      const error = new Error("LIMIT_BODY_SIZE");
      error.code = "LIMIT_BODY_SIZE";
      reject(error);
      return;
    }

    if (!contentType || !contentType.includes("multipart/form-data")) {
      const error = new Error("INVALID_CONTENT_TYPE");
      error.code = "INVALID_CONTENT_TYPE";
      reject(error);
      return;
    }

    const fields = {};
    let file = null;
    let hasFileSizeError = false;

    const busboy = Busboy({
      headers: { "content-type": contentType },
      limits: {
        fileSize: maxCvSizeBytes,
        files: allowFile ? 1 : 0,
        fields: 12,
        parts: 16,
        fieldNameSize: 80,
        fieldSize: 4096,
      },
    });

    busboy.on("field", (name, value) => {
      fields[name] = typeof value === "string" ? value.trim() : value;
    });

    busboy.on("file", (fieldName, stream, info) => {
      const chunks = [];
      const { filename, mimeType } = info;
      let size = 0;

      stream.on("data", (chunk) => {
        size += chunk.length;
        chunks.push(chunk);
      });

      stream.on("limit", () => {
        hasFileSizeError = true;
      });

      stream.on("end", () => {
        if (!filename) return;

        file = {
          fieldname: fieldName,
          originalname: sanitizeFilename(filename),
          mimetype: mimeType,
          size,
          buffer: Buffer.concat(chunks),
        };
      });
    });

    busboy.on("error", reject);

    busboy.on("finish", () => {
      if (hasFileSizeError) {
        const error = new Error("LIMIT_FILE_SIZE");
        error.code = "LIMIT_FILE_SIZE";
        reject(error);
        return;
      }

      resolve({ fields, file });
    });

    const body = event.body || "";
    const bodyBuffer = event.isBase64Encoded ? Buffer.from(body, "base64") : Buffer.from(body, "utf8");
    busboy.end(bodyBuffer);
  });

module.exports = {
  buildHtml,
  checkRateLimit,
  hasValidFileSignature,
  json,
  sanitizeFormPayload,
  parseMultipart,
  sendMail,
  validateFormGuard,
  validateOrigin,
  validateBudget,
  validateWork,
};
