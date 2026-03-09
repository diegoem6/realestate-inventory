# 🏢 Sistema de Inventarios Inmobiliarios

Aplicación cliente-servidor para la gestión de inventarios de propiedades inmobiliarias.

## 🏗 Arquitectura

- **Backend**: Node.js + Express + MongoDB
- **Frontend**: React (SPA, responsive/mobile)
- **Base de datos**: MongoDB

## 📁 Estructura

```
realestate-inventory/
├── server/                 # Backend Node.js
│   ├── models/             # Modelos Mongoose
│   │   ├── User.js         # Usuario (admin / inmobiliaria)
│   │   ├── Template.js     # Templates de ambientes
│   │   └── Inventario.js   # Inventarios con ambientes
│   ├── routes/             # Rutas Express
│   │   ├── auth.js         # Login, perfil
│   │   ├── users.js        # CRUD usuarios (admin)
│   │   ├── templates.js    # CRUD templates (admin)
│   │   └── inventarios.js  # CRUD inventarios + ambientes + archivos
│   ├── middleware/
│   │   ├── auth.js         # JWT protect + adminOnly
│   │   └── upload.js       # Multer para archivos
│   ├── seed.js             # Script inicial (admin + templates)
│   ├── index.js            # Entry point
│   └── .env.example        # Variables de entorno
│
└── client/                 # Frontend React
    ├── src/
    │   ├── context/        # AuthContext
    │   ├── pages/          # Páginas
    │   │   ├── LoginPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── InventariosPage.jsx
    │   │   ├── InventarioFormPage.jsx
    │   │   ├── InventarioDetailPage.jsx
    │   │   ├── TemplatesPage.jsx
    │   │   ├── UsersPage.jsx
    │   │   └── ProfilePage.jsx
    │   ├── components/
    │   │   └── Layout.jsx  # Sidebar + topbar mobile
    │   └── utils/
    │       └── api.js      # Axios instance con JWT
    └── public/
        └── index.html
```

## 🚀 Instalación y puesta en marcha

### Requisitos previos
- Node.js >= 18
- MongoDB (local o Atlas)

### 1. Instalar dependencias

```bash
# Instalar dependencias del servidor
cd server
npm install

# Instalar dependencias del cliente
cd ../client
npm install
```

### 2. Configurar variables de entorno del servidor

```bash
cp server/.env.example server/.env
```

Editar `server/.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/realestate_inventory
JWT_SECRET=cambia_esto_por_algo_seguro
JWT_EXPIRE=7d
USE_LOCAL_STORAGE=true
UPLOADS_PATH=./uploads
```

### 3. Ejecutar el seed (crea admin + templates por defecto)

```bash
cd server
node seed.js
```

Esto crea:
- **Usuario admin**: username `admin`, password `Admin1234!`
- **9 templates por defecto**: Fachada, Predio, Garage, Cocina, Living-comedor, Baño, Habitación 1, Habitación 2, Consumos

### 4. Iniciar el servidor

```bash
cd server
npm run dev    # con nodemon (desarrollo)
# o
npm start      # producción
```

### 5. Iniciar el cliente React

```bash
cd client
npm start
```

El cliente corre en `http://localhost:3000` y hace proxy al servidor en `http://localhost:5000`.

## 🔒 Roles y permisos

| Funcionalidad | Inmobiliaria | Admin |
|---|---|---|
| Crear/editar/eliminar propios inventarios | ✅ | ✅ |
| Ver todos los inventarios | ❌ | ✅ |
| Gestionar templates | ❌ | ✅ |
| Gestionar usuarios | ❌ | ✅ |
| Subir fotos/archivos a ambientes | ✅ | ✅ |

## 🌐 API REST

```
POST   /api/auth/login                                 Iniciar sesión
GET    /api/auth/me                                    Usuario actual
PUT    /api/auth/profile                               Actualizar perfil

GET    /api/users                                      Listar usuarios (admin)
POST   /api/users                                      Crear usuario (admin)
PUT    /api/users/:id                                  Editar usuario (admin)
DELETE /api/users/:id                                  Desactivar usuario (admin)

GET    /api/templates                                  Listar templates
POST   /api/templates                                  Crear template (admin)
PUT    /api/templates/:id                              Editar template (admin)
DELETE /api/templates/:id                              Eliminar template (admin)

GET    /api/inventarios                                Listar inventarios (paginado, búsqueda)
GET    /api/inventarios/:id                            Obtener inventario
POST   /api/inventarios                                Crear inventario (con ambientes default)
PUT    /api/inventarios/:id                            Actualizar inventario
DELETE /api/inventarios/:id                            Eliminar inventario

POST   /api/inventarios/:id/ambientes                  Agregar ambiente (desde template o en blanco)
POST   /api/inventarios/:id/ambientes/:ambId/archivos  Subir archivos al ambiente
DELETE /api/inventarios/:id/ambientes/:ambId/archivos/:archId  Eliminar archivo
```

## 🖼 Almacenamiento de archivos

Por defecto los archivos se guardan localmente en `server/uploads/`.

Para producción se recomienda usar **Cloudinary**:
1. Crear cuenta en cloudinary.com (plan gratuito disponible)
2. Configurar en `.env`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

## 📱 Responsive / Mobile

La interfaz está optimizada para mobile:
- Sidebar se convierte en menú hamburguesa en pantallas < 768px
- Grillas responsivas
- Botones y formularios touch-friendly
- Subida de fotos compatible con cámara mobile

## 🎨 Stack de diseño

- Paleta: verde oscuro (inmobiliaria/premium) + dorado (acento)
- Tipografía: DM Serif Display (títulos) + DM Sans (cuerpo)
- CSS custom properties para theming consistente
