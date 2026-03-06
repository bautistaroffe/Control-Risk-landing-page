# Control Risk Landing Page

Landing page con frontend estatico y backend para formularios (Express en local, Netlify Functions en produccion).

**Stack**
- Frontend: HTML, JavaScript (forms.js), Tailwind CSS (via CDN)
- UX/UI: Tailwind CSS, tokens de diseno en `public/styles/tokens.css`, estilos globales en `public/styles/main.css`
- Build & Deploy: Node.js, Netlify Functions, Nodemailer (SMTP propio), npm

**Arquitectura**
- `public/` contiene todas las paginas estaticas, estilos, scripts y assets.
- `server.js` sirve el contenido estatico y expone endpoints para formularios en desarrollo local.
- `netlify/functions/` contiene los endpoints serverless usados por Netlify.
- `public/js/forms.js` valida y envia formularios a `/api/*`.
- `netlify.toml` redirige `/api/*` a `/.netlify/functions/*`.

**Funcionalidades**
- Navegacion con enlaces a secciones y paginas dedicadas.
- Formularios con validacion cliente/servidor:
  - Presupuesto: nombre, email, consulta.
  - Trabaja con nosotros: nombre, email, telefono y CV adjunto (PDF/DOC/DOCX, max 2MB).
- Envio de emails por SMTP (pendiente de configurar variables de entorno).
- Seccion de contacto con informacion y mapa embebido en pagina `contacto.html`.
- Hero con fondo `gif_fondo.gif`.
- Imagen de "Nuestra Empresa" reemplazada por `imagen_nuestra_empresa.jpg`.

**Estructura de carpetas**
- `public/`:
  - `index.html`: landing principal.
  - `trabaja-con-nosotros.html`: pagina de postulacion.
  - `solicita-presupuesto.html`: pagina de presupuesto.
  - `contacto.html`: pagina de contacto con mapa.
  - `styles/`:
    - `tokens.css`: variables de color reutilizables.
    - `main.css`: utilidades globales y estilos compartidos.
  - `js/`:
    - `forms.js`: validacion y envio de formularios.
  - `assets/`: imagenes y recursos visuales.
- `netlify/functions/`: funciones de backend para formularios.
- `netlify.toml`: configuracion de build y redirects para Netlify.
- `server.js`: servidor Express para ejecucion local.
- `.env.example`: plantilla para variables SMTP.

**Endpoints**
- `POST /api/solicitar-presupuesto`
  - body: `nombre`, `email`, `consulta`
- `POST /api/trabaja-con-nosotros`
  - body: `nombre`, `email`, `telefono`, `cv` (archivo)

**Ejecucion local**
```powershell
npm install
npm start
```
Abrir `http://localhost:3000`.

**Deploy en Netlify**
- `Base directory`: vacio (o `.`)
- `Build command`: vacio
- `Publish directory`: `public`
- `Functions directory`: `netlify/functions`
- Variables de entorno requeridas:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `MAIL_FROM`
  - `MAIL_TO` (o `MAIL_TO_ENCRYPTED` + `MAIL_TO_KEY`)
  - `ALLOWED_ORIGINS` (recomendado)

**Seguridad de formularios**
- Validaciones server-side estrictas de longitud, formato y sanitizacion de texto.
- Protecciones anti-bot: honeypot + timestamp de inicio de formulario.
- Rate limit por IP (ventana y maximo configurables por env vars).
- Verificacion de tipo/extensiones y firma basica de archivo para CV.
- Escape HTML en emails para evitar inyecciones en el cuerpo del mensaje.

**Cifrar MAIL_TO (opcional)**
1. Generar valor cifrado:
```powershell
node scripts/encrypt-mail-to.js "destino@dominio.com" "TU_CLAVE_LARGA"
```
2. Configurar en Netlify:
- `MAIL_TO_ENCRYPTED=<valor_generado>`
- `MAIL_TO_KEY=TU_CLAVE_LARGA`
3. No definir `MAIL_TO` en texto plano.
