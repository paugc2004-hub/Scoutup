# ScoutUp · Demo interactiva

**ScoutUp — Connectant talent, clubs i oportunitats.**

Demo funcional (no un mockup) de la plataforma: frontend, backend, base de dades, autenticació, rols i permisos, amb dades de demostració coherents. Tot en català.

> ⚠️ **Totes les dades són fictícies**: clubs, jugadors, competicions, classificacions, estadístiques i missatges. Els municipis són reals només com a referència geogràfica. La demo **no es connecta amb la FCF**, no fa scraping, no fa servir cap API externa i cap indicador «Verificat» representa una verificació oficial.

---

## Requisits

- **Node.js 22.13 o superior** (recomanat Node 24). La demo fa servir la base de dades SQLite integrada a Node (`node:sqlite`), sense cap servei extern ni instal·lació addicional.

## Posada en marxa

```bash
cd scoutup-demo
npm install
npm run dev
```

Obre **http://localhost:3100**.

> **Windows (PowerShell):** si surt l'error «la ejecución de scripts está deshabilitada», fes servir `npm.cmd install` i `npm.cmd run dev` (o executa una vegada `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`).

La primera vegada que s'obre, l'aplicació crea la base de dades a `data/scoutup-demo.db` i hi carrega les dades de demostració automàticament.

### Altres ordres

| Ordre | Què fa |
|---|---|
| `npm run dev` | Servidor de desenvolupament a `http://localhost:3100` |
| `npm run seed` | Esborra la base de dades i torna a carregar les dades de demo |
| `npm run build` i `npm start` | Versió optimitzada (producció local) |
| `npm run typecheck` | Comprovació de tipus TypeScript |

També es poden restaurar les dades des de la pantalla **/demo** (botó «Restaurar dades de demo»).

### Variables d'entorn (opcionals)

Vegeu `.env.example`. Cap és obligatòria.

| Variable | Per defecte | Descripció |
|---|---|---|
| `SCOUTUP_DB` | `data/scoutup-demo.db` | Ruta del fitxer SQLite |
| `COMPETITION_PROVIDER` | `mock` | Només existeix el proveïdor de demostració |

## Usuaris de demo

Contrasenya de tots: **`demo`**. També es pot entrar amb un clic des de `/entrar` o `/demo`.

| Rol | Correu | Qui és |
|---|---|---|
| Club · Direcció esportiva | `director@scoutup.demo` | Marta Casanovas, CF Vallès Nord (accés complet) |
| Club · Entrenador | `coach@scoutup.demo` | Jordi Esteve, entrenador del Juvenil A (accés limitat al seu equip) |
| Jugador | `player@scoutup.demo` | Pol Serra Batlle, 18 anys, central esquerrà |
| Tutor legal | `tutor@scoutup.demo` | Anna Font, tutora d'en Nil (16 anys) |

També es poden crear comptes nous (jugador o club) des de `/registre`.

## Recorreguts guiats

A `/demo` hi ha quatre recorreguts amb una guia flotant pas a pas:

1. **Escenari FCF · «El club necessita un central sub-19»**: necessitat → ScoutUp Intelligence → perfil (87%) i context competitiu → comparar → pipeline → contacte.
2. **Flux del club**: oferta → candidats → perfil → comparar → pipeline (Nou → Interessant → Contactat) → sol·licitud → conversa.
3. **Flux del jugador**: perfil al 82% → oportunitat al 89% → «M'interessa» → «Sol·licitud enviada» → el club la rep.
4. **Protecció de menors**: la tutora autoritza (o denega) el contacte d'un club.

> Per fer el flux del club sense canviar d'usuari, el botó **«Simular resposta del jugador»** (només demo) accepta la sol·licitud en nom d'un jugador adult. Els contactes amb menors sempre requereixen l'autorització real del tutor.

## Funcionalitats

**Club**: tauler, ScoutUp Intelligence (cerca en llenguatge natural), cerca avançada amb filtres, ofertes (crear amb previsualització en directe, candidats, sol·licituds, pausar i tancar), perfil de jugador amb compatibilitat explicable, comparador de 2–3 jugadors, pipeline de 9 etapes amb arrossegament, contacte segur, missatgeria amb avís de moderació, videotrucades programades, avaluacions per àrees, notes privades, informes de scouting, calendari, plantilla visual per temporades (2024/25, 2025/26, 2026/27), equips i classificacions, perfil del club, usuaris i permisos.

**Jugador**: tauler, completesa del perfil, creació i edició del perfil en 8 passos, oportunitats amb % d'encaix, «M'interessa», seguiment de processos, clubs interessats, descobrir clubs i equips, missatges, calendari, privacitat camp a camp, bloquejos i denúncies.

**Tutor**: consentiment de visibilitat, autorització de contactes, lectura de converses, revocació i privacitat del menor.

## Arquitectura

```
Navegador (React 19, Next.js App Router, Tailwind 4)
   │  Server Components (lectura)          Client Components (interacció)
   │                                               │ fetch JSON
   ▼                                               ▼
Servidor Next.js ── src/server/services/* ── Rutes API src/app/api/*
   │  (permisos, privacitat, matching,        (validació zod, rols)
   │   notificacions, coherència d'estats)
   ▼
SQLite local (node:sqlite) · data/scoutup-demo.db
```

- `src/lib/` — domini compartit: posicions, categories, etapes, **motor de matching** (`matching.ts`), completesa, dates.
- `src/server/db/` — esquema SQL i client de base de dades (autoseed si és buida).
- `src/server/auth/` — contrasenyes (scrypt) i sessions (cookie httpOnly).
- `src/server/services/access.ts` — **permisos per rol** (direcció vs entrenador) i **visibilitat** (privacitat del jugador, menors, bloquejos, clubs verificats). Tot es comprova al servidor.
- `src/server/services/intelligence.ts` — ScoutUp Intelligence: motor **determinista i local**, sense IA externa.
- `src/server/competition/provider.ts` — `CompetitionDataProvider`: `MockCompetitionProvider` (actiu) i `FCFCompetitionProvider` (esquelet **no implementat**, sense cap connexió).
- `seed/demo-data/` — generador determinista de les dades de demo (clubs, jugadors, ofertes, converses…).

### Compatibilitat (matching)

Set factors ponderats (total 100): posició 25 · categoria i nivell 20 · edat 15 · ubicació 10 · disponibilitat 10 · característiques 10 · experiència 10. Cada factor té puntuació, estat i explicació, visibles per al club i per al jugador.

### Privacitat i menors

- Un menor és invisible per als clubs fins que el tutor hi dona consentiment, i com a màxim és visible per a clubs verificats.
- Qualsevol contacte amb un menor passa primer pel tutor.
- Els clubs no verificats no poden contactar ningú.
- El jugador decideix qui veu el perfil, els vídeos i les estadístiques, i quina ubicació es mostra.
- Els missatges amb telèfons, correus o xarxes socials es marquen i mostren un avís.
- Les notes i avaluacions del club no són mai visibles per al jugador.
