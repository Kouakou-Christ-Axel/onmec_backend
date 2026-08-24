import { PointSource } from '../../generated/prisma/client';

/**
 * Bareme d'attribution des points.
 *
 * Ces valeurs sont un choix produit, pas une contrainte technique : elles sont
 * regroupees ici pour etre relues et ajustees sans avoir a parcourir les
 * modules qui les consomment.
 *
 * Les modifier ne reecrit pas l'historique : les points deja attribues restent
 * acquis, seules les attributions futures suivent le nouveau bareme.
 */
export const BAREME = {
  /** Depot d'un signalement citoyen. */
  SIGNALEMENT_DEPOSE: 10,
  /** Bonus verse en plus lorsque le signalement est valide par le back-office. */
  SIGNALEMENT_VALIDE: 20,
  /** Forfait verse a la fin d'un quiz, quel que soit le score. */
  QUIZ_TERMINE: 5,
  /** Verse en plus, par bonne reponse, lors de ce meme quiz. */
  QUIZ_BONNE_REPONSE: 1,
  /** Publication d'un commentaire. */
  COMMENTAIRE: 2,
  /** Like d'un contenu. Non repris au unlike, et non recredite au re-like. */
  LIKE: 1,
} as const;

/**
 * Plafond de points gagnables par jour et par source.
 *
 * Les sources absentes de cette table ne sont pas plafonnees : leur idempotence
 * suffit a borner le gain (un signalement ne se depose qu'une fois, un quiz ne
 * se termine qu'une fois, une cible ne se like qu'une fois).
 *
 * Le commentaire est le seul cas ou l'idempotence ne borne rien : chaque
 * nouveau commentaire porte un identifiant different, donc rien n'empeche d'en
 * poster cent. Le plafond est ce qui rend le spam sans interet.
 */
export const PLAFOND_QUOTIDIEN: Partial<Record<PointSource, number>> = {
  [PointSource.COMMENTAIRE]: 10,
};
