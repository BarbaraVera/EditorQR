# EditorQR

Editor visual de códigos QR personalizados. Crea QR únicos con colores, degradados, logos, imágenes de fondo y mucho más, todo desde una interfaz interactiva en tiempo real.

![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![Fabric.js](https://img.shields.io/badge/Fabric.js-6-E34234?logo=fabricdotjs)
![FastAPI](https://img.shields.io/badge/FastAPI-0.128-009688?logo=fastapi)

---

## Características

- **Colores y degradados** — Personaliza módulos, esquinas y fondo del QR con colores sólidos o degradados lineales/radiales.
- **Formas** — Elige entre módulos redondeados, cuadrados o puntos.
- **Logos** — Sube tu logo, ajusta su escala, aplica filtros (escala de grises, invertir, brillo, contraste) y quitale el fondo con un clic.
- **Imagen de fondo** — Agrega una imagen detrás del QR con control de opacidad.
- **Vista previa en vivo** — El canvas se actualiza al instante con cada cambio.
- **Exportación HD** — Descarga como PNG o JPG hasta 4000 px.
- **Diseño responsivo** — Funciona en desktop y mobile.
- **Idiomas** — Español e inglés integrados.

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, TypeScript 6, Vite 8 |
| Estilos | Tailwind CSS 4, Plus Jakarta Sans |
| Canvas | Fabric.js 6 |
| QR | qr-code-styling 1.9 |
| Backend | FastAPI (Python 3), rembg |
| I18n | i18next, react-i18next |

---

## Cómo empezar

### Requisitos

- Node.js 20+
- Python 3.9+
- npm

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Abrir [http://localhost:5173](http://localhost:5173) en el navegador.

### Backend (quitar fondo del logo)

El backend es opcional — solo lo necesitas si quieres usar la función "Quitar fondo del logo".

```bash
# Crear y activar el entorno virtual (una sola vez)
python -m venv venv
.\venv\Scripts\activate      # Windows
# source venv/bin/activate   # Linux / macOS

# Instalar dependencias
pip install -r backend/requirements.txt

# Iniciar el servidor
uvicorn backend.main:app --reload --port 8000
```

El frontend ya tiene el proxy configurado (`/api` → `http://localhost:8000`), así que no hace falta configurar nada más.

> **Nota:** La primera vez que uses "Quitar fondo", el backend descarga el modelo U2Net (unos minutos). Las siguientes veces será mucho más rápido.

---

## Scripts disponibles

### Frontend

| Comando | Descripción |
|---------|------------|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Compila TypeScript + build de producción |
| `npm run preview` | Previsualiza el build de producción |
| `npm test` | Ejecuta los tests con Vitest |

---

## Estructura del proyecto

```
qrdinamico/
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Componente raíz y controles de la barra lateral
│   │   ├── App.css              # Tema, animaciones, estilos globales (Tailwind v4)
│   │   ├── main.tsx             # Punto de entrada
│   │   ├── i18n.ts              # Configuración de i18next (es/en)
│   │   ├── components/
│   │   │   └── canvas/
│   │   │       └── QrCanvas.tsx # Canvas Fabric.js: renderizado, sincronización, exportación
│   │   ├── context/
│   │   │   └── QrDesignContext.tsx  # Estado global con useReducer + TypeScript estricto
│   │   └── locales/
│   │       ├── es.json           # Traducciones al español
│   │       └── en.json           # Traducciones al inglés
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts            # Proxy /api → :8000 para el backend
├── backend/
│   ├── main.py                   # API FastAPI: POST /api/remove-bg
│   └── requirements.txt
├── skills/
│   └── frontend-design/
│       └── SKILL.md              # Guía de diseño visual del proyecto
├── AGENT.md                      # Memoria del contexto de desarrollo
└── README.md
```

---

## Diseño visual

La interfaz sigue una estética **instrumento de precisión**: fondos oscuros profundos (`#0A0D14`), superficies elevadas en `#131823` y acentos en teal (`#00D4AA`) que recuerdan a la luz de un escáner. La tipografía **Plus Jakarta Sans** aporta calidez sin perder claridad técnica.

El elemento distintivo es una **línea de escaneo animada** que recorre el QR periódicamente, evocando el gesto de escanear un código.

---

## Licencia

Uso interno — proyecto en desarrollo activo.
