const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxCvSizeBytes = 2 * 1024 * 1024;
const allowedCvTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const formConfigs = {
  budget: {
    endpoint: "/api/solicitar-presupuesto",
    minMessageLength: 5,
  },
  work: {
    endpoint: "/api/trabaja-con-nosotros",
    minMessageLength: 0,
  },
};

const getFeedbackEl = (form) => form.querySelector(".form-feedback");
const antiBotFieldNames = {
  honeypot: "website",
  startedAt: "form_started_at",
};

const setFeedback = (form, type, message) => {
  const feedback = getFeedbackEl(form);
  if (!feedback) return;

  feedback.classList.remove("is-visible", "bg-emerald-100", "text-emerald-900", "bg-red-100", "text-red-900");
  feedback.classList.add("is-visible");

  if (type === "success") {
    feedback.classList.add("bg-emerald-100", "text-emerald-900");
  } else {
    feedback.classList.add("bg-red-100", "text-red-900");
  }

  feedback.textContent = message;
};

const getFormDataObject = (form) => {
  const data = {};
  new FormData(form).forEach((value, key) => {
    data[key] = typeof value === "string" ? value.trim() : value;
  });
  return data;
};

const validateCommon = (data) => {
  if (!data.nombre || data.nombre.length < 2) {
    return "Por favor, ingresá tu nombre completo.";
  }
  if (!data.email || !emailRegex.test(data.email)) {
    return "Ingresá un correo electrónico válido.";
  }
  return null;
};

const validateBudget = (data, minMessageLength) => {
  const common = validateCommon(data);
  if (common) return common;
  if (!data.consulta || data.consulta.length < minMessageLength) {
    return "Contanos en qué podemos ayudarte.";
  }
  return null;
};

const validateWork = (data, file) => {
  const common = validateCommon(data);
  if (common) return common;
  if (!data.telefono || data.telefono.replace(/\D/g, "").length < 6) {
    return "Ingresá un teléfono de contacto válido.";
  }
  if (!file) {
    return "Adjunta tu CV en PDF o DOC/DOCX.";
  }
  if (!allowedCvTypes.includes(file.type)) {
    return "Formato de CV no permitido. Usa PDF o DOC/DOCX.";
  }
  if (file.size > maxCvSizeBytes) {
    return "El archivo supera el límite permitido (2MB).";
  }
  return null;
};

const handleSubmit = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const type = form.dataset.form;
  const config = formConfigs[type];

  if (!config) return;

  const data = getFormDataObject(form);
  const file = form.querySelector("input[type='file']")?.files?.[0] || null;
  let error = null;

  if (type === "budget") {
    error = validateBudget(data, config.minMessageLength);
  }

  if (type === "work") {
    error = validateWork(data, file);
  }

  if (error) {
    setFeedback(form, "error", error);
    return;
  }

  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });

  if (file) {
    formData.append("cv", file);
  }

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setFeedback(form, "error", payload.message || "No pudimos enviar el formulario. Intentá más tarde.");
      return;
    }

    form.reset();
    const fileFeedback = form.querySelector("[data-file-feedback]");
    if (fileFeedback) {
      fileFeedback.textContent = "No hay archivo seleccionado.";
      fileFeedback.classList.remove("text-emerald-300");
      fileFeedback.classList.add("text-slate-500");
    }
    setFeedback(form, "success", "Mensaje enviado. Te vamos a contactar a la brevedad.");
  } catch (error) {
    setFeedback(form, "error", "Ocurrió un error de conexión. Intentá nuevamente.");
  }
};

document.querySelectorAll("form[data-form]").forEach((form) => {
  form.setAttribute("novalidate", "novalidate");

  const fileInput = form.querySelector("input[type='file']");
  const fileFeedback = form.querySelector("[data-file-feedback]");
  if (fileInput && fileFeedback) {
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) {
        fileFeedback.textContent = "No hay archivo seleccionado.";
        fileFeedback.classList.remove("text-emerald-300");
        fileFeedback.classList.add("text-slate-500");
        return;
      }

      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      fileFeedback.textContent = `Archivo cargado: ${file.name} (${sizeMb} MB)`;
      fileFeedback.classList.remove("text-slate-500");
      fileFeedback.classList.add("text-emerald-300");
    });
  }

  if (!form.querySelector(`input[name="${antiBotFieldNames.honeypot}"]`)) {
    const honeypot = document.createElement("input");
    honeypot.type = "text";
    honeypot.name = antiBotFieldNames.honeypot;
    honeypot.autocomplete = "off";
    honeypot.tabIndex = -1;
    honeypot.ariaHidden = "true";
    honeypot.style.position = "absolute";
    honeypot.style.left = "-9999px";
    honeypot.style.width = "1px";
    honeypot.style.height = "1px";
    honeypot.style.opacity = "0";
    form.appendChild(honeypot);
  }

  let startedInput = form.querySelector(`input[name="${antiBotFieldNames.startedAt}"]`);
  if (!startedInput) {
    startedInput = document.createElement("input");
    startedInput.type = "hidden";
    startedInput.name = antiBotFieldNames.startedAt;
    form.appendChild(startedInput);
  }
  startedInput.value = String(Date.now());

  form.addEventListener("input", () => {
    if (!startedInput.value) {
      startedInput.value = String(Date.now());
    }
  });

  form.addEventListener("submit", handleSubmit);
});

