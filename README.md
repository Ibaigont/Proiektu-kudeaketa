# STIM - Web de Ventas de Videojuegos

STIM es una aplicacion web CRUD (Create, Read, Update, Delete) para la gestion y consulta de videojuegos.
Cumple arquitectura SPA + API REST y separa frontend, backend y persistencia de datos.

## Arquitectura

- `frontend/`: SPA (HTML, CSS, JavaScript).
- `backend/`: API REST con Express y logica de negocio.
- `data/`: persistencia con SQLite (`stim.sqlite`).

## Requisitos implementados

1. Sistema de roles:
- `admin`: puede crear, editar y eliminar videojuegos.
- `standard`: puede consultar catalogo y guardar una lista personal.

2. Registro e identificacion:
- Registro disponible para usuarios estandar.
- Login para todos los usuarios.
- El rol se asigna segun lo almacenado en base de datos.

3. CRUD bajo rol administrador:
- Crear: `POST /api/games`
- Consultar: `GET /api/games`
- Actualizar: `PUT /api/games/:id`
- Eliminar: `DELETE /api/games/:id`

4. Consulta de datos para usuarios estandar:
- Listado general de videojuegos (`GET /api/games`).

5. Lista personal para usuarios estandar:
- Guardar en lista personal: `POST /api/favorites/:gameId`
- Ver lista personal: `GET /api/favorites`
- Quitar de lista personal: `DELETE /api/favorites/:gameId`

## Tecnologias

- Node.js + Express
- SQLite
- JavaScript (frontend SPA)
- JWT para autenticacion

## Puesta en marcha

1. Instalar dependencias:

```bash
npm install
```

2. Arrancar en desarrollo:

```bash
npm run dev
```

Opcional (recarga automatica en cambios, Node moderno):

```bash
npm run dev:watch
```

3. Arrancar en modo normal:

```bash
npm start
```

4. Abrir en navegador:

`http://localhost:3000`

## Usuario administrador inicial

Se crea automaticamente en el primer arranque:

- Usuario: `admin`
- Contrasena: `admin123`

## Endpoints principales

- Salud del sistema: `GET /api/health`
- Registro: `POST /api/auth/register`
- Login: `POST /api/auth/login`
- Perfil actual: `GET /api/auth/me`
- Videojuegos: `/api/games`
- Lista personal: `/api/favorites`

## Notas

- La base de datos se genera automaticamente en `data/stim.sqlite`.
- Para cambiar claves de JWT se puede usar la variable de entorno `JWT_SECRET`.
