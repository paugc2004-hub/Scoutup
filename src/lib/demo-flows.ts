/** Recorridos guiados de la demo (los usan la página /demo y la guía flotante). */

/** Cuentas de acceso rápido de la demo (ver /api/auth/demo). */
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

const HUGO = "/club/jugadors/p_hugo?offer=o_vn_ld";

export const DEMO_FLOWS: DemoFlow[] = [
  {
    id: "estrella",
    title: "Recorrido estrella · «El Cadete A necesita un lateral derecho»",
    subtitle: "Necesidad → oportunidad → 18 compatibles → perfil al 87 % → guardar → comparar → pipeline → evaluación → contacto → actividad.",
    minutes: "5 min",
    steps: [
      { role: "director", href: "/club", title: "1 · Entramos como directora deportiva", text: "Marta Casanovas, CF Vallès Nord. El panel prioriza lo que hay que hacer hoy. Arriba aparece la necesidad: el Cadete A necesita un lateral derecho." },
      { role: "director", href: "/club/oportunitats/o_vn_ld", title: "2 · Abrimos la oportunidad", text: "La necesidad ya es una oportunidad. ScoutUp encuentra 18 jugadores compatibles (≥ 70 %), ordenados por % de compatibilidad, que no es probabilidad de fichaje." },
      { role: "director", href: HUGO, title: "3 · Hugo Navarro · 87 %", text: "Abrimos al primero. El bloque «¿Por qué encaja?» explica cada factor: posición, nivel, edad, ubicación, disponibilidad, características y experiencia." },
      { role: "director", href: HUGO, title: "4 · Guardar", text: "Pulsa «Guardar». Queda en la lista del club y en la actividad." },
      { role: "director", href: "/club/comparar?ids=p_hugo,p_006,p_013&offer=o_vn_ld", title: "5 · Comparar", text: "Tres laterales cara a cara: radar, estadísticas y compatibilidad con la misma oportunidad." },
      { role: "director", href: HUGO, title: "6 · Añadir al pipeline", text: "«Añadir al pipeline» y muévelo a «Interesante». El cuerpo técnico lo verá según sus permisos." },
      { role: "director", href: `${HUGO}&tab=avaluacio`, title: "7 · Evaluación privada", text: "Puntúa por áreas, indica el contexto (partido, entrenamiento, vídeo) y la decisión. El jugador nunca ve las evaluaciones." },
      { role: "director", href: HUGO, title: "8 · Contacto seguro", text: "«Contactar». Hugo tiene 15 años: la solicitud va primero a su tutor legal y el club no puede escribirle hasta que lo autorice." },
      { role: "director", href: "/club", title: "9 · Todo queda registrado", text: "Vuelve al panel: la actividad reciente muestra lo que acabas de hacer (guardar, pipeline, evaluación y contacto)." },
    ],
  },
  {
    id: "permisos",
    title: "Roles, permisos y aislamiento entre clubes",
    subtitle: "Dirección, coordinación y entrenador ven cosas distintas; otro club no ve nada privado.",
    minutes: "3 min",
    steps: [
      { role: "director", href: "/club/configuracio", title: "Usuarios y permisos", text: "La dirección deportiva cambia roles y equipos. La matriz sale del mismo RBAC que aplica el servidor y cada cambio queda en el registro de auditoría." },
      { role: "coordinator", href: "/club/oportunitats", title: "Coordinación", text: "El coordinador ve todos los equipos y puede gestionar oportunidades, pero no puede editar el club ni los usuarios." },
      { role: "coach", href: "/club/pipeline", title: "Entrenador", text: "El entrenador del Juvenil A solo ve el pipeline, las conversaciones y las evaluaciones de su equipo." },
      { role: "clubB", href: "/club/pipeline", title: "Otro club", text: "El FC Mediterrani (Club B) tiene su propio pipeline. No puede ver ni modificar nada interno del CF Vallès Nord, aunque conozca los identificadores." },
    ],
  },
  {
    id: "central",
    title: "Segundo caso · «Central zurdo sub-19» con IA copiloto",
    subtitle: "Búsqueda en lenguaje natural y contacto con un jugador adulto (conversación simulada).",
    minutes: "3 min",
    steps: [
      { role: "director", href: "/club/intelligence?q=Necesito%20un%20central%20zurdo%20sub-19%20de%20la%20zona%20del%20Vall%C3%A8s%20con%20buen%20juego%20a%C3%A9reo", title: "IA copiloto", text: "La petición en lenguaje natural se convierte en criterios y en una lista ordenada y explicada. Motor determinista: no inventa datos." },
      { role: "director", href: "/club/jugadors/p_biel?offer=o_vn_central", title: "Biel Riera · 87 %", text: "Mayor de edad: el contacto va directo al jugador. Con «Simular respuesta del jugador» (solo demo) se abre la conversación." },
      { role: "director", href: "/club/missatges", title: "Conversación", text: "Mensajería interna, con aviso si alguien intenta sacar la conversación fuera de la plataforma." },
    ],
  },
  {
    id: "menors",
    title: "Protección de menores",
    subtitle: "Consentimiento del tutor antes de cualquier contacto.",
    minutes: "1 min",
    steps: [
      { role: "guardian", href: "/tutor", title: "Panel del tutor", text: "El CF Vallès Nord quiere contactar con Nil (16 años). Sin la autorización de la tutora, el club no puede escribirle." },
      { role: "guardian", href: "/tutor", title: "Autorizar o denegar", text: "Si autoriza, se abre la conversación y la tutora puede consultar su contenido. Puede revocar la visibilidad en cualquier momento." },
    ],
  },
];
