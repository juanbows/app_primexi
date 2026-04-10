# PRIMEXI - Documentacion De La App Y El Frontend

Este documento describe el estado real del proyecto segun el codigo actual del repositorio al 2026-04-08.

## 1. Resumen Ejecutivo

PRIMEXI es una webapp de fantasy football construida con Next.js y pensada con enfoque mobile-first.

La experiencia actual gira alrededor de:

- una home con countdown de deadline por gameweek
- un selector de jornada
- ranking visual de top jugadores
- una tarjeta de jugador revelacion
- noticias "inteligentes" con narrativa tipo IA
- una vista de equipo con formacion interactiva
- una vista de traspasos con recomendacion y reemplazos
- una vista de perfil del manager

Hoy el proyecto esta claramente en fase de frontend/producto visual:

- ya tiene identidad visual, navegacion, layout y varias interacciones
- usa datos mockeados para poblar la experiencia
- no se ve integracion con backend, auth, base de datos ni APIs reales
- no se ve una capa de testing automatizado

## 2. Que Es La App

PRIMEXI se presenta como una app de fantasy football enfocada en ayudar al usuario a tomar decisiones de jornada. La propuesta del frontend actual combina:

- informacion rapida de la GW actual
- lectura visual del estado del equipo
- recomendaciones de transfer
- perfil y rendimiento del manager
- una capa de storytelling visual alrededor de noticias y analitica

El tono del producto mezcla:

- look premium
- estilo gaming / neon / fantasy-dashboard
- animaciones suaves
- composicion mobile parecida a una app nativa

## 3. Stack Tecnico

| Area | Tecnologia | Uso actual |
| --- | --- | --- |
| Framework | Next.js `16.2.1` | App Router, rutas y rendering |
| UI | React `19.2.4` | Componentes y estado local |
| Lenguaje | TypeScript `^5` | Tipado estricto |
| Estilos | Tailwind CSS v4 | Utilidades y tema visual |
| Animacion | `motion` `12.23.24` | Entradas, hover, sheets, pulsos |
| Iconos | `lucide-react` | Iconografia de navegacion y cards |
| Carrusel | `react-slick` + `slick-carousel` | Slider del Top 5 |
| Lint | ESLint 9 + `eslint-config-next` | Validacion del proyecto |

## 4. Como Esta Organizado El Proyecto

```text
Frontend_PRIMEXI/
|-- README.md
|-- ATTRIBUTIONS.md
|-- package.json
|-- next.config.ts
|-- tsconfig.json
|-- eslint.config.mjs
|-- public/
|   `-- brand/primexi-logo.png
`-- src/
    |-- app/
    |   |-- layout.tsx
    |   |-- page.tsx
    |   |-- not-found.tsx
    |   |-- globals.css
    |   |-- equipo/page.tsx
    |   |-- traspasos/page.tsx
    |   `-- perfil/page.tsx
    |-- components/primexi/
    |   |-- PrimexiShell.tsx
    |   |-- Header.tsx
    |   |-- BottomNavigation.tsx
    |   |-- PrimexiHome.tsx
    |   |-- CountdownTimer.tsx
    |   |-- WeekSelector.tsx
    |   |-- TopPlayers.tsx
    |   |-- RevelationPlayer.tsx
    |   |-- NewsIntelligence.tsx
    |   |-- SectionPlaceholder.tsx
    |   `-- navigation.ts
    |-- features/
    |   |-- team/
    |   |   |-- TeamPageClient.tsx
    |   |   `-- components/
    |   |       |-- TeamFormation.tsx
    |   |       |-- TeamStats.tsx
    |   |       |-- PlayerNode.tsx
    |   |       `-- PlayerDetailSheet.tsx
    |   |-- transfers/TransfersPageClient.tsx
    |   `-- profile/ProfilePageClient.tsx
    |-- lib/mocks/fpl.ts
    `-- styles/
        |-- theme.css
        |-- fonts.css
        `-- carousel.css
```

## 5. Arquitectura Del Frontend

### 5.1 App Router

La app usa Next.js App Router en `src/app`.

- `layout.tsx` define metadata global, viewport y carga `globals.css`
- cada pagina vive en una ruta real de `src/app`
- las paginas son wrappers pequenos que montan `PrimexiShell` + un componente cliente

### 5.2 Shell Compartido

`PrimexiShell` es la carcasa comun de toda la experiencia:

- fondo global tipo gradient + noise
- ancho maximo `max-w-md`
- header fijo visual al inicio
- contenido principal dentro de `main`
- navegacion inferior persistente

Esto hace que toda la app se sienta como una sola experiencia mobile, aunque internamente sean rutas separadas.

### 5.3 Capas Del Proyecto

- `src/app`: enrutamiento y entrypoints
- `src/components/primexi`: componentes reutilizables de la experiencia general
- `src/features`: pantallas o modulos con logica mas especifica
- `src/lib/mocks`: datos de prueba y tipos del dominio fantasy
- `src/styles`: tema visual y overrides CSS

## 6. Rutas Actuales

### `/`

Home principal.

Contiene:

- countdown hacia el deadline de la gameweek
- selector de GW
- resumen rapido de calendario, rotacion y lesiones
- carrusel de top 5 de la jornada
- jugador revelacion
- noticias inteligentes

### `/equipo`

Vista del equipo del usuario.

Contiene:

- formacion visual `4-3-3`
- xP total, valor y forma reciente
- nodos de jugadores sobre una cancha
- estados visuales por fitness
- badge de capitan y vice
- bottom sheet con detalle individual del jugador

### `/traspasos`

Centro de traspasos.

Contiene:

- presupuesto y free transfers
- recomendacion principal de transfer
- lista de jugadores a vender
- hoja modal inferior con candidatos de reemplazo
- resumen fijo con xP actualizado y presupuesto remanente

### `/perfil`

Vista del manager.

Contiene:

- identidad del manager
- ranking global
- posicion en liga privada
- puntos totales y de la GW actual
- capitan actual
- transfers recientes

### `404 / not-found`

Vista de error personalizada con `SectionPlaceholder`.

## 7. Componentes Principales

### Shell y navegacion

- `Header.tsx`: renderiza el logo con entrada animada
- `BottomNavigation.tsx`: barra inferior con estados activos segun la ruta
- `navigation.ts`: define los tabs reales de la app

Tabs actuales:

- Inicio
- Equipo
- Traspasos
- Perfil

Observacion importante:

- el `README.md` menciona una ruta `/ligas`, pero en el codigo actual no existe esa pagina ni ese item en la navegacion

### Home

- `PrimexiHome.tsx`: coordina la pantalla principal y el estado de la GW actual
- `CountdownTimer.tsx`: calcula tiempo restante en vivo con `setInterval`
- `WeekSelector.tsx`: cambia de GW entre 1 y 38
- `TopPlayers.tsx`: slider visual del top 5
- `RevelationPlayer.tsx`: card destacada del pick sorpresa
- `NewsIntelligence.tsx`: feed de noticias tematicas

### Equipo

- `TeamPageClient.tsx`: entrypoint de la pantalla
- `TeamFormation.tsx`: arma la cancha y distribuye jugadores por linea
- `PlayerNode.tsx`: nodo interactivo de cada jugador
- `PlayerDetailSheet.tsx`: detalle expandido del jugador
- `TeamStats.tsx`: estadisticas de resumen del equipo

### Traspasos

- `TransfersPageClient.tsx`: maneja seleccion del jugador, reemplazos y calculo visual de xP y presupuesto

### Perfil

- `ProfilePageClient.tsx`: renderiza resumen de manager, ranking, puntos y transfer history

## 8. Datos, Estado Y Logica

### 8.1 Fuente de datos actual

La app usa mocks locales. El archivo central es:

- `src/lib/mocks/fpl.ts`

Ese archivo define:

- tipos del dominio fantasy
- countdown
- resumen de home por GW
- top players por jornada
- jugador revelacion por jornada
- noticias inteligentes
- mock del equipo
- mock de traspasos
- mock del perfil del manager

### 8.2 Estado del frontend

El estado esta resuelto de manera local con React:

- `useState` para gameweek actual, jugador seleccionado y modal abierto
- `useMemo` en traspasos para derivar jugador, replacements y calculos
- `startTransition` en home al cambiar gameweek

No hay actualmente:

- store global
- React Query / SWR
- reducers globales
- persistencia local
- sincronizacion con servidor

### 8.3 Observacion importante sobre duplicacion

Hay una diferencia entre la capa de mocks y la UI de home:

- `PrimexiHome.tsx` usa `countdownData`, `initialGameweek` y `getHomeSummaryForGameweek`
- pero `TopPlayers.tsx`, `RevelationPlayer.tsx` y `NewsIntelligence.tsx` mantienen datos mock propios dentro de los componentes
- al mismo tiempo, `src/lib/mocks/fpl.ts` ya exporta `getTopPlayersForGameweek`, `getRevelationForGameweek` y `newsInsights`

Eso significa que hoy existe duplicacion de datos mock entre componentes y la libreria central.

## 9. Sistema Visual Y UX

La identidad visual esta bastante definida.

### 9.1 Principios visibles del UI

- mobile-first
- dark theme
- look neon / glassmorphism
- paneles con blur
- fondos con gradients profundos
- detalles de color verde neon, cyan y rosa fuerte
- animaciones de entrada, hover y pulso

### 9.2 Tipografia

Se cargan fuentes desde Google Fonts:

- `Sora` para titulos
- `Manrope` para cuerpo

### 9.3 Layout

- ancho maximo visual de `max-w-md`
- uso de `safe-area` para top y bottom
- `BottomNavigation` fija al fondo
- mucho enfasis en tarjetas, paneles y bloques de informacion compactos

### 9.4 Estilos base

Archivos clave:

- `src/app/globals.css`
- `src/styles/theme.css`
- `src/styles/fonts.css`
- `src/styles/carousel.css`

Detalles notables:

- `globals.css` importa Tailwind, slick-carousel y estilos propios
- `theme.css` centraliza variables, colores, fondo general y utilidades como `glass-panel`
- `carousel.css` personaliza dots, escala y opacidad del slider

## 10. Configuracion Tecnica

### Scripts disponibles

```bash
npm run dev
npm run build
npm run build:turbopack
npm run start
npm run lint
```

### Alias

En `tsconfig.json` existe el alias:

```ts
@/* -> ./src/*
```

### ESLint

Se usa:

- `eslint-config-next/core-web-vitals`
- `eslint-config-next/typescript`

### Imagenes remotas

`next.config.ts` habilita imagenes remotas de:

- `images.unsplash.com`

Eso explica por que varias cards usan imagenes externas para jugadores mock.

## 11. Activos Y Recursos

### Activos locales

- logo en `public/brand/primexi-logo.png`

### Dependencias externas visibles en el UI

- imagenes de Unsplash
- componentes e iconos de Lucide
- animaciones con `motion`
- slider con `react-slick`

### Atribuciones

El archivo `ATTRIBUTIONS.md` indica referencias a:

- `shadcn/ui` bajo MIT
- fotos de Unsplash

## 12. Lo Que Ya Existe

El frontend ya tiene:

- branding inicial
- layout consistente
- experiencia mobile coherente
- navegacion por rutas reales
- metadata base del sitio
- 4 vistas de producto funcionales a nivel UI
- animaciones y microinteracciones
- mocks con cierto nivel de detalle
- detalle expandible de jugador
- flujo visual de traspasos
- perfil del manager

## 13. Lo Que Falta O No Se Ve Aun

No se observa en el repo una implementacion de:

- backend propio
- API real conectada
- autenticacion
- base de datos
- ligas privadas reales
- datos live de fantasy
- favoritos, settings o onboarding
- tests unitarios o e2e
- manejo de errores de red
- estados de loading de datos remotos

## 14. Observaciones Tecnicas Importantes

### 14.1 Desalineacion entre README y codigo

`README.md` habla de una barra inferior con:

- `/`
- `/equipo`
- `/traspasos`
- `/ligas`
- `/perfil`

Pero el codigo actual solo expone:

- `/`
- `/equipo`
- `/traspasos`
- `/perfil`

### 14.2 Duplicacion de mocks

La home no consume completamente la capa central de mocks. Conviene consolidar todos los datos mock en `src/lib/mocks/fpl.ts` para evitar inconsistencias.

### 14.3 Frontend fuertemente orientado a demo de producto

La app ya comunica muy bien vision y UX, pero todavia no parece conectada a reglas reales de negocio ni a datos productivos.

### 14.4 Arquitectura razonable para seguir creciendo

La separacion `app / components / features / lib / styles` esta bien encaminada y permite seguir escalando sin mezclar todo en un solo lugar.

## 15. Recomendaciones De Siguiente Paso

Si quieres llevar PRIMEXI de demo visual a producto mas completo, los pasos mas logicos serian:

1. Unificar todos los mocks en `src/lib/mocks/fpl.ts`.
2. Crear una capa de servicios para datos reales.
3. Conectar home, equipo, traspasos y perfil a una fuente real.
4. Definir si va a existir la seccion `ligas` o si se debe remover del `README`.
5. Agregar testing minimo para componentes criticos.
6. Definir autenticacion y persistencia del manager.
7. Separar el dominio fantasy en modelos mas claros si el proyecto crece.

## 16. Comandos De Trabajo Rapido

Desde la carpeta `Frontend_PRIMEXI`:

```bash
npm install
npm run dev
```

Luego abre:

```text
http://localhost:3000
```

## 17. Conclusiones

PRIMEXI ya tiene una base de frontend bastante atractiva, coherente y navegable. La app transmite bien una propuesta de valor de fantasy football premium, sobre todo para mobile. El trabajo hecho hasta ahora destaca mas por producto visual e interaccion que por integracion tecnica con servicios reales.

En resumen:

- como frontend/demo, el proyecto ya se ve solido
- como producto completo, todavia esta en una etapa temprana
- la siguiente gran evolucion esta en conectar datos reales y consolidar la arquitectura de dominio

## 18. Validacion Rapida

Validacion ejecutada sobre el frontend en la carpeta `Frontend_PRIMEXI`:

- `npm run lint`: OK
