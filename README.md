# Control Risk Landing Page

Landing page con backend minimo en Node.js/Express para formularios de presupuesto y postulaciones laborales con adjunto de CV.

**Stack**
- Frontend: HTML + Tailwind (via CDN)
- Backend: Node.js + Express
- Emails: Nodemailer (SMTP propio)
- Uploads: Multer (CV en memoria)

**Arquitectura**
- `public/` contiene todas las paginas estaticas, estilos, scripts y assets.
- `server.js` sirve el contenido estatico y expone endpoints para formularios.
- `public/js/forms.js` valida y envia formularios al backend.
- Configuracion de colores y estilos reutilizables en `public/styles/`.

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
  - `assets/`:
    - `gif_fondo.gif`: fondo del hero.
    - `imagen_nuestra_empresa.jpg`: imagen para seccion "Nuestra Empresa".
- `server.js`: servidor Express + endpoints de formularios.
- `package.json`: dependencias y scripts.
- `.env.example`: plantilla para variables SMTP.
- `.gitignore`: exclusiones de git.

**Endpoints**
- `POST /api/solicitar-presupuesto`
  - body: `nombre`, `email`, `consulta`
- `POST /api/trabaja-con-nosotros`
  - body: `nombre`, `email`, `telefono`, `cv` (archivo)

**Variables de entorno**
Crear un `.env` basado en `.env.example`.
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `MAIL_TO`

**Ejecucion local**
```powershell
npm install
npm start
```
Abrir `http://localhost:3000`.

**Notas**
- Si falta SMTP, el backend responde con error indicando configuracion pendiente.
- El CV se procesa en memoria y se adjunta al email.
