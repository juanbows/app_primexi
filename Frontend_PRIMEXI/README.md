# PRIMEXI

PRIMEXI esta montado como una webapp en Next.js con App Router, Tailwind CSS v4 y una navegacion inferior basada en rutas reales.

## Estado de la migracion

- La estructura principal vive en `src/app`.
- La home sigue el diseno original del mockup.
- La barra inferior ya navega entre rutas reales de Next:
  - `/`
  - `/equipo`
  - `/traspasos`
  - `/ligas`
  - `/perfil`
- Las secciones secundarias quedaron preparadas como placeholders para conectar datos y logica real mas adelante.

## Desarrollo

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev`: levanta el entorno local.
- `npm run build`: genera build de produccion con webpack para una validacion mas estable.
- `npm run build:turbopack`: ejecuta el build usando Turbopack.
- `npm run start`: arranca la app compilada.
- `npm run lint`: valida el codigo con ESLint.
  
