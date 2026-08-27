/**
 * Extensions d'image acceptees pour les flux d'upload (actualites, avatars,
 * signalements, couvertures librairie).
 *
 * `svg` a ete retire : un SVG est un document XML pouvant embarquer du
 * script, et les fichiers sont servis en statique depuis /uploads sur le
 * meme domaine — c'est un XSS stocke.
 *
 * Ce filtre porte sur le NOM du fichier fourni par le client lors de la
 * demande d'URL presignee (POST .../upload-url) ; le backend ne recoit plus
 * les octets pour verifier le type reel (magic number).
 */
export class GenerateConfigService {
    static readonly ALLOWED_IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i;
}
