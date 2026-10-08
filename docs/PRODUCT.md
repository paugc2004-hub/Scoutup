# ScoutUp Club · handoff de producto

## Qué es

El software web del club para pasar de una **necesidad deportiva** a una **decisión**, con todo el contexto en un único sitio y trabajando en equipo con permisos.

```
NECESIDAD → OPORTUNIDAD → DESCUBRIMIENTO → MATCHING → ANÁLISIS → GUARDAR → PIPELINE → CONTACTO → EVALUACIÓN → DECISIÓN
```

**Lados del producto:** CLUB ↔ JUGADOR. Esta demo es **ScoutUp Club**. El lado del jugador (ScoutUp Player) existe en el repositorio solo para simular respuestas y el consentimiento de menores. **No existe** un rol, cuenta ni producto «Scout»: el scouting es una capacidad del club.

## Navegación (sigue el flujo central)

| Sección | Ruta | Para qué |
|---|---|---|
| Inicio | `/club` | Acciones pendientes: necesidades, solicitudes nuevas, perfiles compatibles, agenda y actividad |
| Oportunidades | `/club/oportunitats` | Necesidades concretas convertidas en oportunidades, con sus candidatos ordenados por compatibilidad |
| Jugadores | `/club/cercar`, `/club/jugadors/[id]` | Búsqueda con filtros y perfil completo (quién es, qué ha hecho, datos, vídeo, encaje y qué hacer ahora) |
| IA · Copilot | `/club/intelligence` | Búsqueda en lenguaje natural. **IA DEMO:** motor determinista local, sin IA externa |
| Pipeline | `/club/pipeline` | Kanban de 9 etapas, compartido según permisos |
| Evaluaciones | `/club/avaluacions` | Evaluaciones por áreas (autor, fecha, contexto, decisión), informes de observación y jugadores guardados |
| Mensajes | `/club/missatges` | Conversaciones abiertas tras una solicitud aceptada |
| Calendario | `/club/calendari` | Partidos, pruebas, reuniones, observación y llamadas |
| El club | `/club/equips`, `/club/plantilla`, `/club/perfil`, `/club/configuracio` | Estructura, plantilla por temporada, perfil público, usuarios, permisos y auditoría |
| Comparar | `/club/comparar` | Se abre desde la bandeja de comparación (2–3 jugadores). No está en el menú para simplificar |

**Simplificaciones respecto al brief:** «Ofertas» pasa a ser **Oportunidades** en toda la UI (consistencia de nombres); «Scouting» se fusiona en **Evaluaciones**; «Comparar» sale del menú porque es una acción contextual.

## Entidades y estados

| Entidad | Estados |
|---|---|
| Oportunidad | `oberta` → `pausada` ↔ `oberta` → `tancada` |
| Pipeline | `nou`, `revisar`, `interessant`, `contactat`, `en_conversa`, `prova`, `en_espera`, `rebutjat`, `incorporat` (el cambio de etapa actualiza el estado que ve el jugador, sin revelarle notas ni etapas internas) |
| Solicitud de contacto | `pendent` / `pendent_tutor` (menor) → `acceptada` (se abre conversación) · `rebutjada` · `cancel_lada` |
| Evaluación | Decisión: `seguir`, `prova`, `fitxar`, `descartar`; 5 áreas × 3 criterios (1–10); contexto libre |
| Usuario del club | Rol `director` / `coordinator` / `coach` · estado `active` / `disabled` |

## Compatibilidad (matching)

- Se expresa como **% de compatibilidad**, nunca como «probabilidad de fichaje».
- 7 factores ponderados (total 100): posición 25 · categoría y nivel 20 · edad 15 · ubicación 10 · disponibilidad 10 · características 10 · experiencia 10.
- Cada factor tiene puntuación, estado (cumple, parcial o no cumple) y una explicación en lenguaje natural: es el **«¿por qué encaja?»**.
- Es determinista y explicable; no hay «algoritmos mágicos».

## Roles

| | Dirección deportiva | Coordinación | Entrenador |
|---|:-:|:-:|:-:|
| Buscar, ver perfiles, IA | ✓ | ✓ | ✓ |
| Pipeline, evaluaciones, notas, contacto, calendario | ✓ | ✓ | Solo su equipo |
| Crear, pausar y cerrar oportunidades | ✓ | ✓ | — |
| Editar el club, usuarios y roles, auditoría, restaurar la demo | ✓ | — | — |

La dirección cambia roles, equipos y acceso desde **Configuració**. Cada cambio cierra las sesiones del usuario afectado y queda en el registro de auditoría.

## Datos mock y funcionalidades simuladas

| Elemento | Estado |
|---|---|
| Clubes, jugadores, estadísticas, competiciones y clasificaciones | **DATOS MOCK** (deterministas, ficticios) |
| «Verificat» | Marca simulada; no es una verificación oficial |
| ScoutUp Intelligence | **IA DEMO**: intérprete determinista de texto + motor de matching |
| Vídeos | Metadatos simulados (no se suben ficheros) |
| «Simular resposta del jugador» | Solo demo, para hacer el recorrido sin cambiar de usuario (nunca con menores) |
| Invitación de usuarios | Se crea el usuario; el envío del correo está **PENDIENTE DE DEFINIR** |
| Proveedor FCF | Esqueleto `FCFCompetitionProvider` sin conexión: **INTEGRACIÓN PENDIENTE** |

## Decisiones

| Decisión | Clasificación |
|---|---|
| Flujo central, CLUB ↔ JUGADOR y que no exista un producto Scout | DEFINED (brief) |
| Tres roles internos y su matriz de permisos | PROPOSAL (definida por el equipo, extensible) |
| Compatibilidad calculada al vuelo en lugar de persistida | PROPOSAL / TECHNICAL VALIDATION si crece el volumen |
| Guardar jugador por usuario (no por club) | PROPOSAL; la alternativa de una lista compartida por club está pendiente de decidir con clubes reales |
| Recorrido estrella «Cadete A necesita lateral derecho → 18 compatibles → 87 %» | DEFINED (brief): datos de demo ajustados en `seed/demo-data` (Hugo Navarro, oportunidad `o_vn_ld`). Como Hugo es menor, el contacto pasa por su tutor |
| Idioma de la interfaz | Castellano. Rutas y valores internos (estados, etapas) conservan identificadores en catalán |
| Requisitos de protección de menores (consentimiento, conservación, edad mínima) | LEGAL VALIDATION |
| Uso de datos oficiales de competición | FCF VALIDATION + LEGAL VALIDATION + TECHNICAL VALIDATION |
| Recuperación de contraseña, correo e invitaciones | PENDING |
| Onboarding de un club nuevo (club → equipos → primera necesidad → primera oportunidad → primeros jugadores) | DONE: asistente en `/club/bienvenida`, servicio `src/server/services/onboarding.ts` (requiere `club.edit`, auditado) |
