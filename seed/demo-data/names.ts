/**
 * Noms FICTICIS per a la demo. Es combinen aleatòriament (de manera determinista) i
 * s'eviten combinacions que coincideixin amb futbolistes o personatges coneguts.
 */
export const MALE_NAMES = [
  "Pol", "Marc", "Arnau", "Jan", "Nil", "Pau", "Àlex", "Biel", "Oriol", "Guillem", "Joan", "Martí", "Èric", "Adrià",
  "Roger", "Gerard", "Hugo", "Leo", "Iker", "Aleix", "Bruno", "Unai", "Izan", "Sergi", "Dani", "Víctor", "Nico", "Quim",
  "Albert", "Aniol", "Lluc", "Ot", "Genís", "Ricard", "Joel", "Ivan", "Aitor", "Youssef", "Ibrahim", "Moussa", "Amadou",
  "Omar", "Bilal", "Mateo", "Thiago", "Santi", "Arlet", "Bernat", "Jofre", "Teo", "Enzo", "Rayan", "Hamza", "Ismael",
];
export const FEMALE_NAMES = [
  "Laia", "Júlia", "Martina", "Carla", "Aina", "Paula", "Clàudia", "Emma", "Ona", "Mariona", "Berta", "Noa", "Abril",
  "Jana", "Irene", "Lucía", "Nerea", "Gemma", "Mireia", "Queralt", "Sara", "Nora", "Blanca", "Fàtima", "Salma", "Txell",
];
export const SURNAMES = [
  "Puig", "Serra", "Soler", "Ferrer", "Font", "Pons", "Casals", "Vila", "Mas", "Riera", "Camps", "Bosch", "Costa",
  "Sala", "Prat", "Rovira", "Torrent", "Garriga", "Coll", "Badia", "Balcells", "Colomer", "Figueras", "Grau", "Llopis",
  "Marín", "Molina", "Navarro", "Ortiz", "Valls", "Amat", "Bertran", "Canals", "Cortada", "Duran", "Fabregat", "Galí",
  "Oliveras", "Pagès", "Planas", "Quintana", "Sabaté", "Tarrés", "Rius", "Martí", "Castro", "El Idrissi", "Diallo",
  "Traoré", "Benali", "Batlle", "Casanovas", "Esteve", "Roig", "Vives", "Nadal", "Güell", "Bayés", "Clotet", "Miró",
];

/** Combinacions nom + primer cognom que no volem generar mai. */
export const BLOCKED_COMBOS = new Set(["Pau Casals", "Joan Miró", "Marc Casanovas", "Pol Esteve", "Aina Batlle"]);

/** Equips de farciment per a les classificacions simulades (noms inventats). */
export const FILLER_TEAMS = [
  "CE Riu Sec", "UE Coll Blau", "FC Pedra Alta", "CF Roure Vell", "AE Camí Ral", "UD Pont Vell", "CE Estrella Nord",
  "FC Vall Fosca", "UE Sorrall", "CF Quatre Vents", "CE Mas Gran", "FC Molí Nou", "UE Rierol", "CF Canal Sec",
  "AE Brolla", "CE Tossal", "FC Serrat", "UE Vinyes", "CF Solell", "CE Pla d'Avall", "FC Carena", "UE Pineda Alta",
  "CF Font Freda", "CE Collet", "AE Marina Sud", "UD Castanyers",
];

export const COACH_NAMES = [
  "Xavier Rius", "Laia Ferrer", "Toni Bayés", "Núria Clotet", "Carles Amat", "Montse Vives", "Ramon Güell", "Sílvia Roig",
  "Jaume Nadal", "Eva Planas", "Pere Colomer", "Rosa Tarrés", "Enric Sabaté", "Marta Galí", "Lluís Badia", "Anna Costa",
];
