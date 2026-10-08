# ScoutUp Club · demo funcional

**ScoutUp Club** es el software web con el que un club de fútbol detecta sus necesidades deportivas, encuentra jugadores compatibles, entiende por qué encajan, organiza a los candidatos, contacta de forma segura, registra evaluaciones y toma decisiones en equipo.

ScoutUp tiene dos productos: **ScoutUp Club** y **ScoutUp Player**. Esta demo construye **ScoutUp Club**. No existe un tercer producto ni un rol «Scout»: el scouting es una capacidad del software del club, que usan la dirección deportiva, la coordinación y los entrenadores según sus permisos.

```
NECESIDAD → OPORTUNIDAD → DESCUBRIMIENTO → MATCHING → ANÁLISIS → GUARDAR → PIPELINE → CONTACTO → EVALUACIÓN → DECISIÓN
```

> ⚠️ **Todos los datos son ficticios.** Clubes, jugadores, competiciones, clasificaciones, estadísticas y mensajes son inventados (los municipios son reales solo como referencia geográfica). La demo **no se conecta con la FCF**, no hace scraping ni usa APIs externas, y ningún indicador «Verificat» representa una verificación oficial. La interfaz está en **catalán**.

## Inicio rápido

Requisito: **Node.js 22.13 o superior** (usa la base de datos SQLite integrada en Node, `node:sqlite`; no hace falta instalar ningún servicio).

```bash
npm install
npm run dev          # http://localhost:3100
```

La primera vez se crea `data/scoutup-demo.db` y se cargan los datos de demo automáticamente.

### Usuarios de demo

Contraseña de todos: **`demo`**. También se puede entrar con un clic desde `/entrar` o `/demo`.

| Cuenta | Correo | Para qué sirve |
|---|---|---|
| Dirección deportiva | `director@scoutup.demo` | Marta Casanovas, CF Vallès Nord. Acceso completo, usuarios y auditoría |
| Coordinación | `coordinacio@scoutup.demo` | Sergi Puig. Todos los equipos y gestión de oportunidades; no administra el club |
| Entrenador | `coach@scoutup.demo` | Jordi Esteve, Juvenil A. Solo su equipo |
| Club B | `club-b@scoutup.demo` | Dirección del FC Mediterrani, para comprobar el aislamiento entre clubes |
| Jugador / tutora | `player@scoutup.demo`, `tutor@scoutup.demo` | El otro lado (ScoutUp Player), solo para simular respuestas y el consentimiento de menores |

### Recorrido estrella (5 min)

En `/demo` → «Recorregut estrella» se abre una guía flotante paso a paso:

1. Entramos como directora deportiva del CF Vallès Nord.
2. El panel muestra la necesidad: el Juvenil A necesita un central zurdo.
3. Abrimos la oportunidad: ScoutUp ordena los jugadores compatibles.
4. Abrimos a Biel Riera: **87 % de compatibilidad**, con el desglose de *por qué encaja*.
5. Guardar → comparar → añadir al pipeline → evaluación privada → contacto seguro.
6. Volvemos al panel y la actividad refleja todo lo que acabamos de hacer.

Hay otros recorridos: «Rols, permisos i aïllament», «Protecció de menors» y el lado del jugador.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en `http://localhost:3100` |
| `npm run build` / `npm start` | Versión de producción |
| `npm run seed` | Borra la base de datos y vuelve a cargar los datos de demo |
| `npm run lint` | ESLint (`next/core-web-vitals` + TypeScript) |
| `npm run typecheck` | TypeScript estricto |
| `npm test` | Tests unitarios y de integración (Vitest) |
| `npm run test:e2e` | E2E con Playwright contra la build de producción (ejecuta antes `npm run build`) |
| `npm run check` | lint + typecheck + tests + build |

Los datos también se pueden restaurar desde **Configuració → Dades de la demo**. Solo puede hacerlo la dirección deportiva.

## Variables de entorno

Todas son opcionales; consulta `.env.example`.

| Variable | Por defecto | Descripción |
|---|---|---|
| `SCOUTUP_DB` | `data/scoutup-demo.db` | Ruta del fichero SQLite |
| `SCOUTUP_DEMO_LOGIN` | `on` | `off` desactiva el acceso rápido y «Simular respuesta» |
| `SCOUTUP_INSECURE_COOKIES` | — | `1` permite cookies sin `Secure` sirviendo la build por HTTP (solo pruebas locales) |
| `SCOUTUP_RATE_LIMIT` | `on` | `off` desactiva el rate limiting (solo para depurar) |
| `SCOUTUP_LOG` | `info` | `debug` o `silent` |

## Stack y arquitectura

- **Next.js 15 (App Router) + React 19 + TypeScript estricto + Tailwind 4**.
- **Server Components** para leer datos y **Route Handlers** (`src/app/api/*`) para las mutaciones, con validación Zod.
- **Servicios de dominio** en `src/server/services/*`, desacoplados de la UI: permisos, visibilidad, matching, pipeline, notificaciones y auditoría.
- **SQLite** (`node:sqlite`) con consultas siempre parametrizadas, una única fuente de verdad y seed determinista.
- **RBAC** en `src/lib/permissions.ts`, comprobado siempre en el servidor.

Más detalle:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): handoff técnico (estructura, datos, auth, permisos, tests, despliegue).
- [`docs/SECURITY.md`](docs/SECURITY.md): modelo de amenazas, revisión OWASP y resultados del «Break my app».
- [`docs/PRODUCT.md`](docs/PRODUCT.md): handoff de producto (entidades, flujos, estados, decisiones, mocks y pendientes).

## Calidad

- **40 tests** unitarios y de integración: RBAC, motor de compatibilidad, validación, rate limiting, aislamiento entre clubes, permisos por rol, protección de menores y recorrido estrella a nivel de servicio.
- **21 tests E2E** (Playwright): recorrido estrella completo, crear una oportunidad, búsqueda, «break my app» (sin sesión, CSRF, IDOR entre clubes, roles, entrada maliciosa, XSS, cabeceras) y ausencia de scroll horizontal a 1440, 1280, 1024 y 768 px.
- **CI** en GitHub Actions: lint, typecheck, tests, `npm audit` de producción, build y E2E.

## Despliegue

`render.yaml` despliega la demo en Render (plan gratuito, disco efímero: la base de datos se recrea con los datos de demo en cada arranque). Para un entorno real, consulta los pendientes en `docs/ARCHITECTURE.md` (base de datos gestionada, rate limiting compartido, correo, almacenamiento de vídeo…).
