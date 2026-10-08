# ScoutUp Club · handoff técnico

## Visión general

```
Navegador (React 19 · Next.js App Router · Tailwind 4)
  │  Server Components (lectura)            Client Components (interacción)
  │                                                │ fetch JSON (mismo origen)
  ▼                                                ▼
middleware.ts ── CSRF (Origin + JSON) · redirección sin sesión
  │
  ├─ Páginas  src/app/(app)/club/*      ── requireClubStaff() + servicios
  └─ API      src/app/api/*             ── api() · apiStaff(permiso) · Zod · rateLimit()
                     │
                     ▼
        src/server/services/*  (dominio: permisos, visibilidad, matching, pipeline,
                     │          contacto, evaluaciones, usuarios, notificaciones)
                     ▼
        src/server/db/client.ts  ── SQLite (node:sqlite), consultas parametrizadas
                     │
                     ▼
        data/scoutup-demo.db  ←  seed/demo-data (determinista)
```

## Estructura

| Ruta | Contenido |
|---|---|
| `src/app/(app)/club/*` | Pantallas de ScoutUp Club (Server Components) |
| `src/app/api/*` | Route Handlers: toda mutación pasa por aquí |
| `src/app/(app)/jugador`, `tutor` | Lado del jugador y del tutor (ScoutUp Player), fuera del alcance de esta demo; se conserva para simular respuestas y el consentimiento de menores |
| `src/components/ui.tsx` | Sistema de diseño (Card, Badge, Stat, EmptyState, ErrorState, Skeleton, MatchRing, Radar…) |
| `src/components/client/kit.tsx` | Primitivas interactivas (Button, Modal, Field, Input, Select, Tabs, Toggle, `useApi`) |
| `src/components/club/*` | Componentes de producto (kanban, buscador, formularios, gestor de usuarios…) |
| `src/lib/*` | Dominio compartido sin alias: posiciones, categorías, etapas, **matching**, **permisos**, recorridos de demo |
| `src/server/api.ts` | Envoltorio de las APIs: errores homogéneos, sesión, permisos, rate limit y límite de tamaño del cuerpo |
| `src/server/auth/*` | Contraseñas (scrypt) y sesiones (cookie httpOnly; en la base de datos solo se guarda el hash del token) |
| `src/server/security/*` | Rate limiting y auditoría |
| `src/server/services/access.ts` | Visibilidad jugador ↔ club (privacidad, menores, bloqueos) y guard `assertPlayerVisible` |
| `src/server/validation.ts` | Esquemas Zod reutilizables (IDs, textos, fechas, correo, contraseña) |
| `src/server/log.ts` | Logging estructurado JSON con redacción de campos sensibles |
| `seed/demo-data/*` | Generador determinista de datos de demo |
| `tests/unit`, `tests/integration`, `tests/e2e` | Vitest y Playwright |

## Datos

Una única fuente de verdad: el esquema está en `src/server/db/schema.ts`. Las columnas JSON se guardan como TEXT y se leen con `parseJson`.

Equivalencia con las entidades del brief:

| Entidad del brief | Tabla(s) | Notas |
|---|---|---|
| Club | `clubs` | |
| ClubUser | `users` (`role` ∈ director/coordinator/coach, `club_id`, `team_id`, `status`) | Los permisos se derivan del rol (`src/lib/permissions.ts`); no se guardan por usuario |
| Team / Season | `teams`, `seasons`, `team_seasons` | Plantilla por temporada en `roster_entries` |
| Player | `players` | Privacidad por campo en `privacy` (JSON) |
| PlayerTrajectory | `player_career` | |
| PlayerStats | `player_stats` (`UNIQUE(player_id, season_id)`) | |
| Opportunity | `offers` | En la UI siempre «Oportunitat». La tabla conserva el nombre técnico `offers` para no romper datos ni APIs |
| Match | — (calculado) | **Decisión:** la compatibilidad se calcula al vuelo (determinista, unos 150 jugadores). Si el volumen crece, se materializa en una tabla `matches(opportunity_id, player_id, score, factors, generated_at)` |
| SavedPlayer | `favorites` (`target_type = 'player'`) | Lista por usuario; queda registrada en la actividad del club |
| PipelineEntry | `pipeline_entries` (`UNIQUE(club_id, player_id)`) | |
| Evaluation | `evaluations` (autor, contexto, puntuaciones por área, decisión, fechas) | Privada del club |
| Notas / informes | `notes`, `scout_reports` | Privados del club |
| Contact / Conversation | `contact_requests`, `conversations`, `messages` | El contacto pasa siempre por solicitud; con menores, por el tutor |
| Notification | `notifications` | |
| Activity | `pipeline_activity` | Actor, jugador, acción y fecha |
| Audit log | `audit_log` | Acciones sensibles y denegaciones |

**Migraciones:** `SCHEMA_VERSION` en `schema.ts`. Si la versión de la base de datos no coincide, se recrea y se vuelven a cargar los datos de demo. Es aceptable en una demo; para producción habría que adoptar migraciones incrementales (Drizzle, Prisma o SQL versionado). **PENDIENTE DE DEFINIR.**

**Índices:** además de las claves, hay índices para el filtrado por club en cada tabla privada (pipeline, evaluaciones, notas, informes, actividad, contactos, conversaciones, auditoría) y para las sesiones.

## Autenticación

- Contraseñas con **scrypt** y sal aleatoria (`src/server/auth/password.ts`).
- Sesión: token aleatorio de 32 bytes en una cookie `su_session` (`httpOnly`, `SameSite=Lax` y `Secure` en producción). En la base de datos **solo se guarda su SHA-256**.
- Caducidad de 7 días. Se rota al iniciar sesión, las sesiones caducadas se limpian y un cambio de rol o de estado cierra las sesiones del usuario.
- Las cuentas desactivadas (`status = 'disabled'`) no pueden iniciar sesión y las sesiones existentes dejan de ser válidas.
- **PENDIENTE DE DEFINIR:** recuperación de contraseña y envío de invitaciones (no hay servicio de correo en la demo).

## Autorización (RBAC)

`src/lib/permissions.ts` es la única fuente:

| Permiso | Dirección | Coordinación | Entrenador |
|---|:-:|:-:|:-:|
| players.view · pipeline.manage · evaluations.write · contact.send · calendar.manage | ✓ | ✓ | ✓ (solo su equipo) |
| opportunities.manage | ✓ | ✓ | — |
| club.edit · users.manage · audit.view · demo.reset | ✓ | — | — |

- **Ámbito de equipos:** dirección y coordinación ven todos los equipos; el entrenador solo el suyo (`teamFilterSql`, `can.seeTeam`).
- **Servidor siempre:** `apiStaff(permiso)` / `requirePermission()` en cada ruta y comprobaciones de pertenencia en cada servicio. La UI solo oculta botones.
- **Tenencia:** cada consulta privada filtra por `club_id` de la sesión, nunca por un `club_id` que venga del cliente. Un recurso de otro club responde 404 (no se revela su existencia).
- **Visibilidad del jugador:** `assertPlayerVisible()` antes de cualquier acción sobre un jugador (pipeline, notas, evaluaciones, informes, guardar, interacciones, eventos, contacto).

## API

Todas las rutas usan `api()` (respuestas JSON, `Cache-Control: no-store` y errores sin detalles internos), validan con Zod (IDs con formato, longitudes máximas, enums, fechas ISO) y tienen un límite de cuerpo de 64 KB. Los códigos son: 400 datos no válidos · 401 sin sesión · 403 sin permiso · 404 no existe o no es accesible · 413 demasiado grande · 415 no es JSON · 429 rate limit.

## Rendimiento

- Lecturas en Server Components, sin cascadas de peticiones desde el cliente.
- La búsqueda resuelve los filtros simples en SQL y aplica la visibilidad sobre el subconjunto. La paginación es de 24 resultados.
- El pipeline carga los jugadores con una sola consulta (`playerRowsByIds`).
- **Límite conocido:** `rankCandidates` evalúa todos los jugadores visibles (unos 150 en la demo, en milisegundos). Con miles de jugadores habría que prefiltrar en SQL por género, franja de edad y radio, o materializar la tabla `matches`. **VALIDACIÓN TÉCNICA.**

## Observabilidad

`src/server/log.ts` emite JSON por línea (errores, endpoints lentos de más de 800 ms, rate limit, denegaciones) con redacción de campos sensibles. Es el punto único donde conectar Sentry, Datadog u OpenTelemetry.

## Tests

| Nivel | Herramienta | Qué cubre |
|---|---|---|
| Unitarios | Vitest | RBAC, motor de matching, validación, rate limiting |
| Integración | Vitest + SQLite temporal | Aislamiento Club A/B, permisos por rol, menores, recorrido estrella a nivel de servicio |
| E2E | Playwright (build de producción, base de datos propia) | Recorrido estrella, crear oportunidad, búsqueda, «break my app», responsive |

Cada fichero de integración usa su propia base de datos temporal (`tests/setup.ts`); nunca toca la de desarrollo.

## Despliegue

- `npm run build && npm start`. Node ≥ 22.13.
- `render.yaml`: Render, plan gratuito, disco efímero.
- **Para producción (PENDIENTE):** base de datos gestionada (Postgres; la capa `db/client.ts` encapsula el acceso), rate limiting compartido (implementar `RateLimitStore` con Redis), almacenamiento de vídeo privado con URLs firmadas, servicio de correo, CSP con nonces y observabilidad externa.
