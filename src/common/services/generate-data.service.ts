import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

const MAJUSCULES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MINUSCULES = 'abcdefghijklmnopqrstuvwxyz';
const CHIFFRES = '0123456789';
const SPECIAUX = '@$!%*?&';
const LONGUEUR = 12;

const piocher = (alphabet: string) => alphabet[randomInt(alphabet.length)];

@Injectable()
export class GenerateDataService {
  /**
   * Génère un mot de passe respectant le pattern imposé aux comptes :
   * 8 caractères minimum, au moins une majuscule, un chiffre et un spécial.
   *
   * `randomInt` (CSPRNG) plutôt que `Math.random` : ces mots de passe sont
   * envoyés par email lors d'une création de compte ou d'une réinitialisation.
   */
  generateSecurePassword(): string {
    const tous = MAJUSCULES + MINUSCULES + CHIFFRES + SPECIAUX;
    const requis = [MAJUSCULES, MINUSCULES, CHIFFRES, SPECIAUX].map(piocher);
    const reste = Array.from({ length: LONGUEUR - requis.length }, () =>
      piocher(tous),
    );

    const caracteres = [...requis, ...reste];
    // Fisher-Yates : sans mélange, les 4 premières positions trahissent le
    // type de caractère et réduisent l'espace de recherche.
    for (let i = caracteres.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
    }
    return caracteres.join('');
  }
}
