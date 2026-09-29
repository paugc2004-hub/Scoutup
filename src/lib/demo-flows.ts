/** Recorreguts guiats de la demo (els fa servir la pàgina /demo i la guia flotant). */
export type DemoStep = { role: "director" | "coach" | "player" | "guardian"; href: string; title: string; text: string };
export type DemoFlow = { id: string; title: string; subtitle: string; minutes: string; steps: DemoStep[] };

export const DEMO_FLOWS: DemoFlow[] = [
  {
    id: "fcf",
    title: "Escenari FCF · «El club necessita un central sub-19»",
    subtitle: "De la necessitat al contacte, i on la informació de competició aporta context.",
    minutes: "4 min",
    steps: [
      { role: "director", href: "/club", title: "Una necessitat real", text: "Al tauler del CF Vallès Nord apareix la necessitat del Juvenil A: dos centrals acaben etapa i cap no és esquerrà." },
      { role: "director", href: "/club/intelligence?q=Necessito%20un%20central%20esquerr%C3%A0%20sub-19%20de%20la%20zona%20del%20Vall%C3%A8s%20amb%20bon%20joc%20aeri", title: "ScoutUp Intelligence", text: "La petició en llenguatge natural es converteix en criteris i en una llista ordenada i explicada. Sense IA externa: motor determinista." },
      { role: "director", href: "/club/jugadors/p_biel?offer=o_vn_central", title: "Perfil i context esportiu", text: "Compatibilitat del 87% desglossada factor per factor. Fixa't en el bloc «Context competitiu»: avui és simulat; amb dades oficials seria contrastable." },
      { role: "director", href: "/club/comparar?ids=p_biel,p_arnau,p_pol&offer=o_vn_central", title: "Comparar", text: "Tres centrals cara a cara: radar, estadístiques i encaix amb l'oferta." },
      { role: "director", href: "/club/jugadors/p_biel?offer=o_vn_central", title: "Pipeline i contacte", text: "Afegeix-lo al pipeline, mou-lo a «Interessant» i envia una sol·licitud de contacte. Amb «Simular resposta» veuràs com s'obre la conversa." },
    ],
  },
  {
    id: "club",
    title: "Flux del club",
    subtitle: "Oferta → candidats → perfil → comparar → pipeline → contacte → conversa.",
    minutes: "3–4 min",
    steps: [
      { role: "director", href: "/club", title: "Tauler del club", text: "Indicadors, necessitats de la plantilla, nous perfils compatibles i agenda." },
      { role: "director", href: "/club/ofertes/o_vn_central", title: "Oferta «Busquem central sub-19»", text: "Candidats recomanats ordenats per compatibilitat. Filtra per peu esquerre i «No al pipeline»." },
      { role: "director", href: "/club/jugadors/p_biel?offer=o_vn_central", title: "Perfil del jugador · 87%", text: "Obre el desglossament: posició, nivell, edat, ubicació, disponibilitat, característiques i experiència." },
      { role: "director", href: "/club/comparar?ids=p_biel,p_arnau,p_pol&offer=o_vn_central", title: "Comparar 3 jugadors", text: "Radar superposat, estadístiques i resum automàtic." },
      { role: "director", href: "/club/pipeline", title: "Pipeline", text: "Arrossega la targeta (o fes servir el menú) de Nou → Interessant → Contactat." },
      { role: "director", href: "/club/jugadors/p_biel?offer=o_vn_central", title: "Enviar sol·licitud", text: "Botó «Contactar». Després, «Simular resposta del jugador» per obrir la conversa." },
      { role: "director", href: "/club/missatges", title: "Conversa", text: "Missatgeria interna, amb avís si algú intenta treure la conversa fora de la plataforma. Prova «Programar videotrucada»." },
    ],
  },
  {
    id: "player",
    title: "Flux del jugador",
    subtitle: "Perfil → oportunitat 89% → M'interessa → el club ho veu.",
    minutes: "2 min",
    steps: [
      { role: "player", href: "/jugador", title: "Tauler del jugador", text: "Perfil al 82% (i què hi falta), clubs interessats, agenda i oportunitats per a tu." },
      { role: "player", href: "/jugador/oportunitats/o_vn_central", title: "Oportunitat 89% compatible", text: "«Per què encaixes»: el mateix desglossament que veu el club, explicat al jugador." },
      { role: "player", href: "/jugador/oportunitats/o_vn_central", title: "M'interessa", text: "Prem «M'interessa» i envia la sol·licitud. L'estat passa a «Sol·licitud enviada»." },
      { role: "player", href: "/jugador/seguiment", title: "Seguiment", text: "Totes les candidatures i contactes, amb el seu estat." },
      { role: "director", href: "/club/ofertes/o_vn_central?tab=sollicituds", title: "El club ho rep", text: "Entra com a club: la sol·licitud apareix a la pestanya «Sol·licituds», amb notificació." },
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
];
