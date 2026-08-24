import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

/**
 * Point unique de hachage des mots de passe.
 *
 * Auparavant : `bcryptjs` (implementation JS pure, nettement plus lente que
 * l'implementation native) importe a cinq endroits, avec un cout code en dur
 * a 10 ici et un `genSalt()` implicite la. Ce service centralise les deux.
 */
@Injectable()
export class HashService {
  private readonly rounds: number;

  /**
   * Hash factice utilise pour egaliser le temps de reponse quand le compte
   * n'existe pas : sans cela, un login sur un email inconnu repond nettement
   * plus vite que sur un email connu, ce qui permet d'enumerer les comptes
   * meme avec un message d'erreur uniforme.
   */
  private readonly dummyHash: string;

  constructor(configService: ConfigService) {
    const parsed = Number(configService.get<string>('BCRYPT_ROUNDS'));
    this.rounds = Number.isFinite(parsed) && parsed >= 10 ? parsed : 12;
    this.dummyHash = bcrypt.hashSync('mot-de-passe-inexistant', this.rounds);
  }

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /** Consomme le meme temps qu'une comparaison reelle, et retourne toujours false. */
  async compareWithDummy(plain: string): Promise<boolean> {
    await bcrypt.compare(plain, this.dummyHash);
    return false;
  }
}
