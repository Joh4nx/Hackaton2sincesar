# Micro Monorepo Starter (pnpm + TypeScript + React + MongoDB Atlas)

Estructura al estilo monorepo (similar a *ReeUtil*), con:
- `apps/gateway`: Express TS, proxy, JWT, RBAC.
- `apps/web`: React + Vite TS, pantalla normal y admin.
- `services/auth-svc`: Login/Register/JWT, seed `admin@example.com/admin123`.
- `services/item-svc`: CRUD demo de items.
- Conexión a **MongoDB Atlas** por `.env`.

## Requisitos
- Node 20+
- pnpm (`npm i -g pnpm`)
- Cadena SRV de **MongoDB Atlas**

## Instalación
```bash
pnpm install
```

## Variables de entorno (Atlas)
Edita **.env** en:
- `services/auth-svc/.env`
- `services/item-svc/.env`
- `apps/gateway/.env` (JWT y URLs internas)

> Si tu password tiene símbolos (`@#%`), **URL-encode** en la `MONGO_URI`.

## Ejecutar en desarrollo
```bash
pnpm dev
```
Servicios:
- Gateway: http://localhost:4000
- Auth:    http://localhost:4001
- Items:   http://localhost:4002
- Web:     http://localhost:5173

## Flujo rápido
1. Inicia `pnpm dev`.
2. Entra a la web → **Ingresar** con `admin@example.com / admin123`.
3. En **Inicio** crea items.
4. En **/admin** ves overview (solo admin).

## Build/Start (prod simple)
```bash
pnpm build
pnpm start
```

¡Listo para extender con más microservicios!

