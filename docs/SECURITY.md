# ScoutUp Club · seguridad

> No afirmamos que la aplicación sea «100 % segura». Este documento recoge lo que se ha diseñado, lo que se ha atacado de forma controlada contra el propio entorno local, lo que se ha corregido y lo que queda pendiente.

## 1. «Break my app»: hallazgos y correcciones

Pruebas hechas contra la aplicación en local (nunca contra terceros). Cada hallazgo tiene una prueba automática que evita la regresión.

| # | Severidad | Hallazgo (antes) | Causa | Corrección | Test |
|---|---|---|---|---|---|
| 1 | 🔴 BLOCKER | `POST /api/demo/reset` **sin sesión** borraba toda la base de datos | Ruta sin autenticación ni permiso | Requiere `demo.reset` (solo dirección), rate limit y auditoría | `security.spec` · sin sesión → 401 |
| 2 | 🟠 HIGH | Un club podía añadir al pipeline, anotar, evaluar o guardar a **menores ocultos** (sin consentimiento del tutor) y les enviaba notificaciones | Las acciones no comprobaban la visibilidad del jugador | Guard central `assertPlayerVisible()` en todas las acciones sobre jugadores (404 si no es visible) | `roles.test` · protección de menores |
| 3 | 🟠 HIGH | Inyección de mensajes en **conversaciones de otro club** mediante `POST /api/events` con `conversation_id` ajeno | El `conversation_id` no se validaba | La conversación debe ser del club, del ámbito del usuario y del mismo jugador | `isolation.test` · inyección vía evento |
| 4 | 🟠 HIGH | Las **notas internas del club** se copiaban al calendario del jugador al programar una prueba | Se reutilizaba el campo `notes` | El evento del jugador nunca incluye notas internas | `core-flow.test` |
| 5 | 🟡 MEDIUM | Fechas inválidas provocaban un **500** (crash) | Sin validar formato ni rango | `zIsoDate` (formato y rango) | `validation.test`, `security.spec` |
| 6 | 🟡 MEDIUM | Títulos de **200 KB** aceptados y guardados | Sin límites de longitud ni de tamaño del cuerpo | `zText(max)` en cada campo y límite de 64 KB (413) | `security.spec` · entrada maliciosa |
| 7 | 🟡 MEDIUM | Guardar como favorito IDs inexistentes o arbitrarios | Sin validar el destino | `zId` y comprobación de existencia y visibilidad | `security.spec` |
| 8 | 🟡 MEDIUM | Sin rate limiting (fuerza bruta de login ilimitada) | — | Rate limiting por IP, por IP+correo y por usuario (login, registro, contacto, mensajes, IA, escrituras) | `rate-limit.test`, prueba manual (429 al 9.º intento) |
| 9 | 🟡 MEDIUM | Sin protección CSRF más allá de `SameSite=Lax`; se aceptaba `text/plain` | — | El middleware exige mismo origen y JSON en las escrituras a `/api` | `security.spec` · CSRF |
| 10 | 🟡 MEDIUM | Sin cabeceras de seguridad; `X-Powered-By` visible | — | CSP, nosniff, frame-ancestors/X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP y HSTS en producción | `security.spec` · cabeceras |
| 11 | 🟡 MEDIUM | Tokens de sesión guardados en claro en la base de datos; 30 días; sin rotación | — | Hash SHA-256 en la base de datos, 7 días, rotación al iniciar sesión y revocación al cambiar de rol | `roles.test` · revocación |
| 12 | 🟡 MEDIUM | Contraseñas de registro de 4 caracteres | — | Mínimo 8 (`zNewPassword`) | `validation.test` |
| 13 | 🟢 LOW | El entrenador veía los informes de observación de todo el club en la ficha del jugador | Consulta sin ámbito de equipo | Ámbito por equipo o autoría | revisión manual |
| 14 | 🟢 LOW | Contador de conversaciones sin leer sin ámbito de equipo para el entrenador | Consulta sin filtro | `teamFilterSql` | revisión manual |
| 15 | 🟢 LOW | En la búsqueda, un `?offer=` de otro club exponía el `team_id` al cliente | Uso del objeto antes de comprobar la pertenencia | Se ignora una oportunidad que no es del club | revisión manual |
| 16 | 🟢 LOW | Dependencias con CVE conocidos (Next/PostCSS) | Versiones antiguas | `next@15.5.27` + `overrides.postcss` → `npm audit --omit=dev` limpio | CI |

Ataques que ya fallaban antes y siguen cubiertos: SQL injection (todas las consultas están parametrizadas y los fragmentos dinámicos son listas blancas), XSS almacenado (React escapa y no se usa `dangerouslySetInnerHTML`; hay una regla de lint `react/no-danger`) y cookie manipulada.

## 2. Modelo de amenazas

| Amenaza | Prevenir | Detectar | Registrar | Bloquear |
|---|---|---|---|---|
| **Usuario malicioso** cambia IDs para acceder a recursos ajenos (IDOR) | Filtro por `club_id` de la sesión y comprobación de pertenencia en cada servicio; formato de ID | Denegaciones en el log | `audit_log` (`result=denied`) | 404/403 |
| **Usuario autenticado comprometido** intenta escalar permisos | RBAC en el servidor; no se puede cambiar el propio rol; siempre queda una dirección activa | Intentos `permission.*` | `audit_log` | 403 |
| **Usuario externo** intenta acceder a rutas internas | Middleware y `requireClubStaff()`/`apiStaff()` | — | — | Redirección / 401 |
| **Entrada maliciosa** (HTML, JS, SQL-like, enormes) | Zod, límites de longitud y tamaño, consultas parametrizadas, escape de React, CSP | Errores 400/413 | Log | 400/413/415 |
| **Abuso de API** | Rate limiting por acción | `rate_limit.blocked` | Log | 429 + `Retry-After` |
| **Fuga de datos** | DTOs (`presentPlayer` aplica la privacidad por campo); notas y evaluaciones nunca salen hacia el jugador; las respuestas de la API no devuelven hashes ni tokens | Tests | — | — |
| **Seguridad de menores** | Invisibles sin consentimiento del tutor; como máximo para clubes verificados; ubicación solo por comarca; contacto siempre a través del tutor; avisos de moderación en mensajes con teléfonos o redes sociales; bloqueos y denuncias | Denegaciones `assertPlayerVisible` | `audit_log` | 404 |
| **CSRF** | `SameSite=Lax`, Origin y JSON obligatorios | — | — | 403/415 |

## 3. Revisión OWASP Top 10 (conceptual)

| Categoría | Estado |
|---|---|
| A01 Broken Access Control | RBAC en el servidor, aislamiento por club, guard de visibilidad y tests de IDOR. **Principal foco de las correcciones.** |
| A02 Cryptographic Failures | scrypt con sal, tokens aleatorios de 256 bits guardados como hash, cookies `Secure` en producción y HSTS |
| A03 Injection | SQL parametrizado; los fragmentos dinámicos son listas blancas; React escapa el HTML |
| A04 Insecure Design | Contacto por solicitud, tutor para menores, invisibilidad por defecto de los menores y privacidad por defecto «solo clubes verificados» |
| A05 Security Misconfiguration | Cabeceras de seguridad, sin `X-Powered-By`, errores sin detalles internos y acceso de demo desactivable (`SCOUTUP_DEMO_LOGIN=off`) |
| A06 Vulnerable Components | `npm audit` de producción en el CI |
| A07 Identification & Auth Failures | Rate limiting de login, mensaje genérico, rotación y caducidad de sesión, revocación al cambiar de rol y cuentas desactivables |
| A08 Software & Data Integrity | Lockfile y `npm ci` en el CI; seed determinista |
| A09 Logging & Monitoring Failures | Log JSON estructurado con redacción y `audit_log` de acciones sensibles y denegaciones |
| A10 SSRF | No aplica: la aplicación no hace peticiones salientes |

## 4. Limitaciones conocidas y pendientes

- **CSP con `'unsafe-inline'`** en `script-src`, necesario para la hidratación de Next.js sin nonces. **PENDIENTE:** CSP con nonces vía middleware.
- **Rate limiting en memoria**, válido para una sola instancia. Con varias instancias hay que implementar `RateLimitStore` sobre Redis.
- **Acceso de demo con un clic** (`/api/auth/demo`) y «Simular respuesta del jugador»: son funciones de demo, desactivables con `SCOUTUP_DEMO_LOGIN=off`.
- **Ficheros:** la demo no admite subidas (los vídeos son metadatos simulados). Cuando existan, hará falta validar tipo y tamaño en el servidor, renombrar, guardar en un almacenamiento privado con URLs firmadas y analizar con antivirus. **PENDIENTE.**
- **Requisitos legales sobre menores** (consentimiento, conservación, RGPD/LOPDGDD): la arquitectura lo permite, pero los requisitos concretos están pendientes de **VALIDACIÓN LEGAL**.
- **Datos oficiales de competición:** requieren **VALIDACIÓN FCF / LEGAL / TÉCNICA**. Hoy son simulados.
