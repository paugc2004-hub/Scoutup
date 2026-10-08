/** Recorreguts guiats de la demo (els fa servir la pàgina /demo i la guia flotant). */

/** Comptes d'accés ràpid de la demo (vegeu /api/auth/demo). */
export type DemoAccount = "director" | "coordinator" | "coach" | "clubB" | "player" | "guardian";
export const DEMO_EMAILS: Record<DemoAccount, string> = {
  director: "director@scoutup.demo",
  coordinator: "coordinacio@scoutup.demo",
  coach: "coach@scoutup.demo",
  clubB: "club-b@scoutup.demo",
  player: "player@scoutup.demo",
  guardian: "tutor@scoutup.demo",
};
export function demoAccountOf(email: string): DemoAccount | null {
  return (Object.entries(DEMO_EMAILS).find(([, e]) => e === email)?.[0] as DemoAccount | undefined) ?? null;
}

export type DemoStep = { role: DemoAccount; href: string; title: string; text: string };
export type DemoFlow = { id: string; title: string; subtitle: string; minutes: string; steps: DemoStep[] };

const BIEL = "/club/jugadors/p_biel?offer=o_vn_central";

export const DEMO_FLOWS: DemoFlow[] = [
  {
    id: "estrella",
    title: "Recorregut estrella · «El Juvenil A necessita un central»",
    subtitle: "Necessitat → oportunitat → compatibles → perfil 87% → guardar → comparar → pipeline → avaluació → contacte → activitat.",
    minutes: "5 min",
    steps: [
      { role: "director", href: "/club", title: "Una necessitat real", text: "Entres com a directora esportiva del CF Vallès Nord. Al tauler, la necessitat del Juvenil A: dos centrals acaben etapa i cap no és esquerrà." },
      { role: "director", href: "/club/oportunitats/o_vn_central", title: "L'oportunitat", text: "La necessitat ja és una oportunitat oberta. ScoutUp hi ordena els jugadors compatibles per % de compatibilitat (no és probabilitat de fitxatge)." },
      { role: "director", href: BIEL, title: "Perfil · 87% compatible", text: "Obre el desglossament «Per què encaixa»: posició, nivell, edat, ubicació, disponibilitat, característiques i experiència, cadascun amb el seu pes." },
      { role: "director", href: BIEL, title: "Guardar", text: "Prem l'estrella per guardar-lo a la llista del club. Queda registrat a l'activitat." },
      { role: "director", href: "/club/comparar?ids=p_biel,p_arnau,p_pol&offer=o_vn_central", title: "Comparar candidats", text: "Tres centrals cara a cara: radar, estadístiques i compatibilitat amb la mateixa oportunitat." },
      { role: "director", href: BIEL, title: "Afegir al pipeline", text: "«Afegir al pipeline» i mou-lo a «Interessant». El pipeline és compartit amb el cos tècnic segons els permisos de cadascú." },
      { role: "director", href: `${BIEL}&tab=avaluacio`, title: "Avaluació privada", text: "Puntua per àrees, indica el context (partit, entrenament, vídeo) i la decisió. Les avaluacions mai no són visibles per al jugador." },
      { role: "director", href: BIEL, title: "Contacte segur", text: "«Contactar» envia una sol·licitud per la plataforma. Amb «Simular resposta del jugador» (només demo) s'obre la conversa. Amb menors, sempre decideix el tutor." },
      { role: "director", href: "/club", title: "Tot queda registrat", text: "Torna al tauler: l'activitat recent mostra el que acabes de fer (guardar, pipeline, avaluació, contacte)." },
    ],
  },
  {
    id: "permisos",
    title: "Rols, permisos i aïllament entre clubs",
    subtitle: "Direcció, coordinació i entrenador veuen coses diferents; un altre club no veu res de privat.",
    minutes: "3 min",
    steps: [
      { role: "director", href: "/club/configuracio", title: "Usuaris i permisos", text: "La direcció esportiva canvia rols i equips. La matriu surt del mateix RBAC que aplica el servidor, i cada canvi queda al registre d'auditoria." },
      { role: "coordinator", href: "/club/oportunitats", title: "Coordinació", text: "El coordinador veu tots els equips i pot gestionar oportunitats, però no pot editar el club ni els usuaris." },
      { role: "coach", href: "/club/pipeline", title: "Entrenador", text: "L'entrenador del Juvenil A només veu el pipeline, les converses i les avaluacions del seu equip." },
      { role: "clubB", href: "/club/pipeline", title: "Un altre club", text: "El FC Mediterrani (Club B) té el seu propi pipeline. No pot veure ni modificar res intern del CF Vallès Nord, encara que en conegui els identificadors." },
    ],
  },
  {
    id: "menors",
    title: "Protecció de menors",
    subtitle: "Consentiment del tutor abans de qualsevol contacte.",
    minutes: "1 min",
    steps: [
      { role: "guardian", href: "/tutor", title: "Panell del tutor", text: "El CF Vallès Nord vol contactar amb en Nil (16 anys). Sense l'autorització de la tutora, el club no pot escriure-li." },
      { role: "guardian", href: "/tutor", title: "Autoritzar o denegar", text: "Si autoritza, s'obre la conversa i la tutora en pot consultar el contingut. Pot revocar la visibilitat en qualsevol moment." },
    ],
  },
  {
    id: "player",
    title: "L'altra banda: el jugador (ScoutUp Player)",
    subtitle: "Per entendre d'on surten les sol·licituds que rep el club.",
    minutes: "2 min",
    steps: [
      { role: "player", href: "/jugador/oportunitats/o_vn_central", title: "Oportunitat compatible", text: "El jugador veu el mateix desglossament de compatibilitat, explicat des del seu punt de vista." },
      { role: "player", href: "/jugador/oportunitats/o_vn_central", title: "M'interessa", text: "Prem «M'interessa» i envia la sol·licitud." },
      { role: "director", href: "/club/oportunitats/o_vn_central?tab=sollicituds", title: "El club ho rep", text: "La sol·licitud apareix a la pestanya «Sol·licituds» de l'oportunitat, amb notificació." },
    ],
  },
];
