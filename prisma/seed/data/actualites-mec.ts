// Articles reels du MEC (contenu editorial officiel), fournis pour peuplement
// systematique en production. Contrairement au reste de seed.ts, ces entrees
// ne sont pas des donnees de demonstration.

const MEC_CATEGORIES = {
  Lancement: 'lancement',
  Institutionnel: 'institutionnel',
  Partenariat: 'partenariat',
  Sensibilisation: 'sensibilisation',
} as const;

export type MecCategorieSlug = (typeof MEC_CATEGORIES)[keyof typeof MEC_CATEGORIES];

interface RawActualiteMec {
  slug: string;
  title: string;
  date: string;
  category: keyof typeof MEC_CATEGORIES;
  excerpt: string;
  image: string;
  content: string;
}

export interface ActualiteMecSeedEntry {
  slug: string;
  title: string;
  date: Date;
  categorieSlug: MecCategorieSlug;
  excerpt: string;
  imageUrl: string;
  content: string;
}

// Resout un chemin d'image legacy (relatif, casse incoherente) vers son URL
// definitive sur mec-ci.org. Les URLs deja absolues sont laissees telles quelles.
function resolveMecImageUrl(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const withoutRelativePrefixes = trimmed.replace(/^(\.\.\/)+/, '');
  const lowercasedImagesSegment = withoutRelativePrefixes.replace(/^Images\//i, 'images/');
  return `https://mec-ci.org/${lowercasedImagesSegment}`;
}

function resolveImagesInContent(html: string): string {
  return html.replace(/<img([^>]*?)\ssrc="([^"]+)"/gi, (match, attrsBefore, src) => {
    return `<img${attrsBefore} src="${resolveMecImageUrl(src)}"`;
  });
}

const rawActualitesMec: RawActualiteMec[] = [
  {
    slug: 'le-lancement-du-mouvement-pour-leducation-a-la-citoyennete-mec',
    title: "LE LANCEMENT DU MOUVEMENT POUR L'EDUCATION A LA CITOYENNETE (MEC)",
    date: '2023-12-05',
    category: 'Lancement',
    excerpt:
      "Le Mouvement pour l'Éducation à la Citoyenneté (MEC) a été officiellement lancé le 13 décembre, à l'occasion d'une cérémonie dédiée à la promotion des valeurs citoyennes et de l'engagement civique.",
    image: '../images/lancement/1A1A3957.jpg',
    content: `<h2>Le Mouvement pour l'Éducation à la Citoyenneté (MEC) a été officiellement lancé le 13 décembre, à l'occasion d'une cérémonie dédiée à la promotion des valeurs citoyennes et de l'engagement civique.</h2>
<p>L'événement s'est déroulé en présence de MARIA HENRY, la représentante de Monsieur le Maire du Plateau, de Monsieur Ibrahima DIABATE, Président du Conseil National des Jeunes de Côte d'Ivoire (CNJCI), Alban M'LAN, ainsi que du conférencier Magloire N'DEHI. De nombreux partenaires institutionnels, acteurs de la société civile et citoyens engagés ont également pris part à cette rencontre.</p>
<img src="../images/lancement/1A1A3780.jpg" alt="Lancement01" />
<p>Les différentes interventions ont mis en lumière les enjeux liés à l'éducation à la citoyenneté, notamment la responsabilité individuelle, la participation civique et le rôle du citoyen dans la construction d'une société plus responsable. Les enseignements riches et porteurs de sens du conférencier Magloire N'DEHI ont particulièrement marqué les participants, en ouvrant des pistes de réflexion sur l'engagement personnel et collectif.</p>
<img src="../images/lancement/1A1A3886.jpg" alt="Lancement02" />

<p>Les échanges ont convergé autour d'un message central : la citoyenneté commence par l'engagement individuel et se renforce par l'action collective.</p>
À cette occasion, un hommage particulier a été rendu à Monsieur Mamadou CONE, Président du MEC, pour l'initiative et la vision ayant conduit à la création de ce mouvement citoyen. le MEC ambitionne de devenir un cadre de sensibilisation, de formation et de mobilisation autour des valeurs civiques, en particulier en direction de la jeunesse.
<img src="../Images/lancement/1A1A3998.jpeg" alt="Lancement03" />
La cérémonie s'est conclue par une activité participative intitulée « Poste ton engagement », invitant les participants à formuler un engagement concret en faveur d'une société plus respectueuse des valeurs citoyennes.
À travers cette initiative, le MEC entend contribuer durablement au renforcement de la citoyenneté active et à la promotion du civisme en Côte d'Ivoire.`,
  },
  {
    slug: 'bilan-premier-semestre-2026-mec-citoyennete',
    title: 'Bilan du 1er semestre 2026 : le MEC poursuit son engagement au service de la citoyenneté',
    date: '2026-07-10',
    category: 'Institutionnel',
    excerpt:
      'Le Comité Directeur du MEC a dressé le bilan du premier semestre 2026 et défini les priorités pour les mois à venir.',
    image: '../images/activite/01.jpg',
    content: `<h2>Bilan du 1er semestre 2026 : le MEC poursuit son engagement au service de la citoyenneté</h2>
<p>Le Comité Directeur du Mouvement pour l'Éducation à la Citoyenneté (MEC) s'est réuni afin de dresser le bilan des activités du premier semestre 2026 et de définir les priorités pour les mois à venir.</p>
<p>Ces six premiers mois témoignent d'une dynamique collective portée par des bénévoles, des partenaires et des citoyens engagés, convaincus qu'une société plus responsable se construit par l'éducation et l'action.</p>
<h3>Nos réalisations</h3>
<p><strong>8 initiatives citoyennes menées avec succès</strong></p>
<ul>
  <li>Zéro Graffitis, Zéro Incivisme ;</li>
  <li>Sensibilisation routière : Zéro Incivisme, Zéro Mort ;</li>
  <li>Zéro Affichage Anarchique ;</li>
  <li>Conférence sur l'engagement citoyen ;</li>
  <li>Distribution et formation sur la Constitution et le Code électoral ;</li>
  <li>Formation à la citoyenneté numérique : « Citoyenneté numérique & Désinformation » ;</li>
  <li>Initiative Lagune Propre ;</li>
  <li>Participation et don à l'initiative « Aboisso doit être propre ».</li>
</ul>
<img src="../images/activite/02.jpg" alt="bilan02" />
<h3>Une distinction</h3>
<p><strong>Lauréat TOYP 2026 – JCI Universitaire Cocody</strong></p>
<h3>Notre impact en chiffres</h3>
<ul>
  <li>Plus de 2 500 bénéficiaires directs et indirects</li>
  <li>Plus de 1 300 000 FCFA mobilisés pour la mise en œuvre de nos activités</li>
  <li>100 Constitutions distribuées</li>
  <li>Plus de 2 000 flyers distribués sur les infractions routières</li>
  <li>Plus de 2 000 usagers sensibilisés à la sécurité routière</li>
  <li>110 jeunes formés à la citoyenneté numérique</li>
</ul>
<h3>Des partenaires engagés à nos côtés</h3>
<p>Plus de 10 partenaires ont accompagné nos actions, notamment :</p>
<ul>
  <li>Conseil National des Jeunes de Côte d'Ivoire - CNJCI 🇨🇮</li>
  <li>SOTRA</li>
  <li>AMUGA</li>
  <li>CEI Côte d'Ivoire Commission Électorale Indépendante (CEI)</li>
  <li>Ministère de l'Éducation Nationale et de l'Enseignement Technique</li>
  <li>Polaris Association</li>
  <li>Lycée Classique Abidjan</li>
  <li>Lycée scientifique de Yamoussoukro</li>
  <li>LYCÉE Technique Abidjan Officiel</li>
  <li>Union des Jeunes de Blockhauss</li>
  <li>Ibrahim Doumbia, d'initiative lagune propre</li>
  <li>La Force du Nous et plusieurs organisations communautaires.</li>
</ul>
<img src="../images/activite/03.jpg" alt="bilan03 " />
<h3>Une communauté qui grandit</h3>
<ul>
  <li>Membres : 15 ➜ 31</li>
  <li>Sympathisants : 0 ➜ 106</li>
</ul>
<h3>Un impact digital en constante progression</h3>
<ul>
  <li>2 211 abonnés sur nos réseaux sociaux</li>
  <li>31 927 vues de nos publications</li>
  <li>28 260 interactions générées</li>
  <li>3 286 impressions sur LinkedIn</li>
</ul>
<h3>Cap sur le second semestre 2026</h3>
<p>Le meilleur reste à venir !</p>
<p>Parmi nos principales priorités figurent :</p>
<ul>
  <li>le lancement du Tournoi de la Cohésion des Organisations de Jeunesse ;</li>
  <li>le lancement officiel de l'application Citoyen+ ;</li>
  <li>le lancement du Podcast Citoyen+ ;</li>
  <li>la poursuite des Défis Citoyens ;</li>
  <li>plusieurs autres initiatives destinées à renforcer la culture citoyenne et l'engagement civique en Côte d'Ivoire.</li>
</ul>
<p>Ces résultats sont le fruit d'un engagement collectif. Ils nous encouragent à aller encore plus loin dans notre mission : former, sensibiliser et mobiliser une jeunesse responsable, engagée et actrice du développement de notre pays.</p>
<p>Merci à tous nos partenaires, bénévoles, sympathisants et citoyens qui nous font confiance et contribuent, à nos côtés, à bâtir une Côte d'Ivoire plus citoyenne.</p>
<p><strong>Selon vous, quelle action devrait être la priorité du MEC pour le second semestre 2026 ? Partagez vos idées en commentaire !</strong></p>
<p class="text-primary font-bold mt-4">#MEC #Citoyenneté #EngagementCitoyen #Jeunesse #Leadership #CitoyenPlus #ImpactSocial #InnovationCivique #Développement #CôteDIvoire #InstruirePourImpacter #Bilan2026</p>`,
  },
  {
    slug: 'rencontre-ministre-communication-mec',
    title: 'Rencontre avec le Ministre de la Communication : un jalon stratégique pour le MEC',
    date: '2025-12-12',
    category: 'Partenariat',
    excerpt:
      "Dans le cadre de la tournée institutionnelle de présentation du Mouvement pour l'Éducation à la Citoyenneté (MEC), nous avons eu l'honneur d'être reçus par Monsieur Amadou Coulibaly, en sa qualité de Ministre de la Communication et Porte-parole du Gouvernement.",
    image: '../images/lancement/010.jpg',
    content: `<h2>Rencontre avec le Ministre de la Communication : un jalon stratégique pour le MEC</h2>
<p>Dans le cadre de la tournée institutionnelle de présentation du Mouvement pour l'Éducation à la Citoyenneté (MEC), nous avons eu l'honneur d'être reçus par Monsieur Amadou Coulibaly, en sa qualité de Ministre de la Communication et Porte-parole du Gouvernement.</p>
<p>Le ministère qu'il dirige occupe une position centrale au sein du dispositif national d'information. À ce titre, son appui constituera un levier essentiel pour le déploiement des actions du MEC, en particulier à travers la facilitation de nos relations avec les médias, acteurs clés de la sensibilisation citoyenne et de la promotion de la culture civique.</p>
<p>Nous tenons à exprimer notre profonde gratitude à Monsieur le Ministre pour son écoute, la pertinence de ses orientations et la qualité de cet échange empreint d'ouverture et de sens du service public.</p>`,
  },
  {
    slug: 'Une_alliance_pour_une_jeunesse_citoyenne_et_engagee',
    title: 'Une alliance pour une jeunesse citoyenne et engagée',
    date: '2025-10-31',
    category: 'Partenariat',
    excerpt:
      'Rencontre entre le MEC et le CNJCI pour forger une alliance stratégique en faveur de la jeunesse ivoirienne.',
    image: '../images/lancement/019.jpeg',
    content: `<h2>Délégation du MEC en discussion avec le président du CNJCI</h2>
<p>Au cours de cette rencontre empreinte de convivialité et de hauteur de vue, les échanges ont porté sur la mise en œuvre de projets concrets en faveur de la jeunesse, notamment en matière d'éducation citoyenne, de lutte contre la désinformation et de promotion de l'engagement civique. Le Président du CNJCI, convaincu de la pertinence et de la portée nationale du MEC, a confirmé sa présence à la cérémonie de lancement, où il prendra également la parole en tant qu'invité d'honneur.</p>
<img src="../images/lancement/016.jpeg" alt="M. Ibrahima Diabaté, Président du CNJCI" />
<p>M. Ibrahima Diabaté a également accepté d'être l'invité du Podcast du MEC, une plateforme de dialogue et d'inspiration destinée à promouvoir les valeurs de leadership et de responsabilité citoyenne chez les jeunes. Plus encore, il a donné son accord pour la création d'une rubrique permanente dédiée au CNJCI dans le magazine du MEC, afin de renforcer la synergie entre les deux structures et valoriser les actions du Conseil en faveur de la jeunesse ivoirienne.</p>
<img src="../images/lancement/018.jpeg" alt="M. Mamadou Coné, Président du MEC" />
<p>Dans un geste fort d'engagement, le Président du CNJCI s'est aussi engagé à encourager, lors de chacune de ses interventions publiques, les jeunes à télécharger l'application mobile "Citoyen+" du MEC, un outil numérique innovant qui promeut la citoyenneté active et responsable.</p>
<p>Cette rencontre marque une étape décisive dans la collaboration entre le CNJCI et le MEC, deux structures unies par une même ambition : faire de la jeunesse ivoirienne un acteur central du développement, conscient de ses droits, de ses devoirs et de son rôle dans la construction d'une Côte d'Ivoire unie, démocratique et prospère.</p>`,
  },
  {
    slug: 'ecole-citoyen-plus-cocody-leadership-vision-engagement',
    title: "École Citoyen+ : renforcer le leadership des organisations de jeunesse de Cocody",
    date: '2025-08-08',
    category: 'Sensibilisation',
    excerpt:
      "Le MEC et le CNJCI ont organisé une nouvelle session de l'École Citoyen+ à Cocody, autour du leadership, de la vision, de l'engagement et de la prise de parole en public.",
    image: '../images/activite/05.jpg',
    content: `<h2>École Citoyen+ : renforcer le leadership des organisations de jeunesse de Cocody</h2>
<p>Ce samedi 08 août, le Mouvement pour l'Éducation à la Citoyenneté (MEC), en partenariat avec le Conseil National des Jeunes de Côte d'Ivoire (CNJCI), a organisé une nouvelle session de l'École Citoyen+, dédiée aux Présidents des organisations de jeunesse de Cocody.</p>
<p>Autour du thème <strong>« Leadership, vision, engagement et prise de parole en public »</strong>, cette session a permis aux participants de renforcer leurs capacités, de partager leurs expériences et de réfléchir à leur rôle dans le développement de leurs communautés.</p>
<h3>Merci à nos trois intervenants</h3>
<p>Nous adressons nos sincères remerciements à :</p>
<ul>
  <li><strong>Yaya Dosso</strong>, Président du Sénat des Jeunes de Côte d'Ivoire, pour son partage d'expérience sur le leadership et l'engagement.</li>
  <li><strong>Mohamed Nour DIARRASSOUBA</strong>, Conseiller technique du Ministre de l'Emploi, de la Protection sociale et de la Formation Professionnelle, pour son intervention sur le leadership, la vision et l'engagement.</li>
  <li><strong>Khadija ZOKO SÉBÉ</strong>, Communicante publique et institutionnelle, pour sa formation sur la prise de parole en public.</li>
</ul>
<img src="../images/activite/04.jpg" alt="ecole02" />
<p>Merci également à l'ensemble des Présidents d'organisations de jeunesse de Cocody pour leur participation et leur engagement.</p>
<p>Former des leaders capables d'agir et d'impacter positivement leurs communautés est au cœur de notre mission.</p>
<p><strong>Quelle commune devrait accueillir la prochaine session de l'École Citoyen+ ? Et avec quel formateur aimeriez-vous échanger ?</strong></p>
<p>👇 Dites-nous votre commune et le nom du formateur en commentaire !</p>
<p class="text-primary font-bold mt-4">#MEC #ÉcoleCitoyenPlus #CNJCI #Leadership #Jeunesse #Citoyenneté #EngagementCitoyen #Cocody #Formation #InstruirePourImpacter</p>`,
  },
  {
    slug: 'formation-constitution-code-electoral-lycee-classique-abidjan',
    title:
      'Lancement du programme de formation et de distribution de la Constitution et du Code électoral au Lycée Classique Abidjan',
    date: '2026-05-04',
    category: 'Sensibilisation',
    excerpt:
      "Le MEC, en partenariat avec la CEI Côte d'Ivoire, a formé 100 élèves du Lycée Classique Abidjan à la Constitution et au Code électoral ivoirien.",
    image: '../images/activite/13.jpg',
    content: `<h2>Lancement du programme de formation et de distribution de la Constitution et du Code électoral</h2>
<p>Le Mouvement pour l'Éducation à la Citoyenneté - MEC a marqué une étape importante dans sa mission d'éveil civique ce 04 mai au Lycée Classique Abidjan.</p>
<p>En partenariat avec la CEI Côte d'Ivoire, cette journée a été consacrée au lancement officiel du programme de formation et de distribution de la Constitution et du Code électoral ivoirien.</p>
<p>Cette activité s'est tenue en présence du Proviseur de l'établissement, <strong>COULIBALY FOUGNIGUÉ</strong>, de <strong>ADINA BORCANE</strong>, experte électorale de la Délégation de l'Union européenne en Côte d'Ivoire, ainsi que du représentant du Président du Conseil National des Jeunes de Côte d'Ivoire - CNJCI, <strong>GNABROYOU SCHADRACK</strong>.</p>
<p>Au total, <strong>100 élèves</strong>, notamment les délégués et membres du conseil scolaire, ont été formés pendant <strong>2 heures</strong> sur les fondamentaux de la Constitution et du Code électoral, avant de recevoir chacun leur exemplaire.</p>
<img src="../images/activite/14.jpg" alt="code02" />
<p>Désormais, ces élèves deviennent de véritables ambassadeurs de la Constitution et du Code électoral, avec pour mission de transmettre à leur tour ces connaissances à leurs pairs, pour environ <strong>2 800 élèves</strong> qui bénéficieront en retour de ce partage d'expérience.</p>
<p>Un moment fort d'apprentissage, d'échange et de responsabilisation, qui traduit une conviction simple : <strong>former les jeunes aujourd'hui, c'est construire des citoyens responsables demain.</strong> 🇨🇮</p>
<p class="text-primary font-bold mt-4">#Citoyenneté #Civisme #FormationCitoyenne #CotedIvoire #JeunesseIvoirienne #MEC #TousActeurs #EngagementCitoyen</p>`,
  },
  {
    slug: 'le-lancement-ecole-citoyen-plus',
    title: 'Lancement de "École Citoyen +"',
    date: '2026-05-19',
    category: 'Sensibilisation',
    excerpt:
      "Le MEC a officiellement lancé le projet École Citoyen+ au Lycée Technique d'Abidjan, avec le soutien technique de Polaris Association, autour de la désinformation et de la citoyenneté numérique.",
    image: '../images/activite/11.jpg',
    content: `<h2>Retour sur le lancement du projet "École Citoyen +"</h2>
<p>Le 19 mai, le Mouvement pour l'Éducation à la Citoyenneté avec l'appui technique de <strong>#Polaris_Association</strong> a officiellement lancé son nouveau projet <strong>"École Citoyen +"</strong> au <strong>Lycée Technique d'Abidjan</strong>.</p>
<p>Placée sous le thème <strong>"Désinformation et citoyenneté numérique"</strong>, cette première formation a réuni élèves et encadreurs autour d'un enjeu devenu central dans notre société connectée : apprendre à mieux s'informer, vérifier les sources et adopter des comportements responsables en ligne.</p>
<h3>Au programme</h3>
<ul>
  <li>Sensibilisation aux mécanismes de la désinformation ;</li>
  <li>Échanges interactifs avec les élèves sur les bons réflexes numériques au quotidien ;</li>
  <li>Mise en lumière du rôle des jeunes dans la construction d'un espace digital plus fiable et citoyen.</li>
</ul>
<img src="../images/activite/10.jpg" alt="ecole03" />
<p>Cette étape marque le début d'une série d'actions qui visent à renforcer l'éducation civique et numérique des jeunes à travers nos établissements scolaires.</p>
<p>Nous remercions le <strong>Lycée Technique d'Abidjan</strong> pour l'accueil, les élèves pour leur participation active, ainsi que notre partenaire <strong>Polaris asso</strong> représenté par son <strong>Directeur Pays, Salifou SIDIBÉ</strong>, enfin les membres du MEC et ses bénévoles mobilisés pour la réussite de cette première édition.</p>
<p><strong>Ensemble, faisons de chaque jeune un citoyen éclairé, responsable et engagé dans l'espace numérique.</strong></p>
<p class="text-primary font-bold mt-4">#MEC #EcoleCitoyenPlus #Citoyenneté #Education #CitoyennetéNumérique #Désinformation #Jeunesse #CIV</p>`,
  },
  {
    slug: 'initiative-lagune-propre-blockhauss-qnec-2026',
    title: 'Initiative Lagune Propre : 4e Défi Citoyen à Blockhauss',
    date: '2026-06-06',
    category: 'Sensibilisation',
    excerpt:
      "Le MEC, l'UJB, l'écologiste Ibrahim DOUMBIA et ses bénévoles ont organisé le 4e Défi Citoyen sur le bord lagunaire de Blockhauss dans le cadre de la QNEC 2026.",
    image: '../images/activite/09.jpg',
    content: `<h2>Initiative Lagune Propre : 4e Défi Citoyen à Blockhauss</h2>
<p>Le 6 juin 2026, le Mouvement pour l'Éducation à la Citoyenneté (MEC), en collaboration avec l'Union des Jeunes de Blockhauss (UJB), l'écologiste Ibrahim DOUMBIA et ses bénévoles, a organisé son 4è défi citoyen <strong>« Initiative Lagune Propre »</strong> sur le bord lagunaire de Blockhauss et une phase de sensibilisation des populations.</p>
<p>Cette action a permis de mobiliser les citoyens autour de la protection de notre environnement et de la préservation de la lagune, patrimoine naturel essentiel à notre cadre de vie.</p>
<img src="../images/activite/08.jpg" alt="blo02" />
<p>Cette initiative s'inscrit dans le cadre de la <strong>Quinzaine Nationale de l'Environnement et du Climat (QNEC)</strong> lancée par le Ministère de l'Environnement et de la Transition Écologique, qui se déroule du 03 au 17 juin 2026, et témoigne de notre engagement collectif en faveur d'une Côte d'Ivoire plus propre et plus responsable.</p>
<p>Ensemble, poursuivons nos efforts pour faire de la citoyenneté environnementale une réalité au quotidien.</p>
<p class="text-primary font-bold mt-4">#QNEC2026 #LagunePropre #Citoyenneté #Environnement #EngagementCitoyen #DéveloppementDurable #MEC #CôteDIvoire</p>`,
  },
  {
    slug: 'citoyen-plus-poursuit-son-chemin',
    title: 'Citoyen+ poursuit son chemin !',
    date: '2026-07-15',
    category: 'Partenariat',
    excerpt:
      "Le MEC a été reçu par le Cabinet du Ministre de la Communication pour présenter Citoyen+, une application dédiée à l'éducation citoyenne et au signalement citoyen.",
    image: '../images/activite/07.jpg',
    content: `<h2>Citoyen+ poursuit son chemin !</h2>
<p>Le Mouvement pour l'Éducation à la Citoyenneté - MEC a eu l'honneur d'être reçu par le Cabinet du Ministre de la Communication, Porte-parole du Gouvernement, représenté par <strong>M. Oumar KONATÉ</strong>, Directeur de Cabinet Adjoint, en présence de plusieurs collaborateurs dont <strong>Madame DAMMONH</strong>, Directrice Générale de la Communication et des Médias.</p>
<p>Cette rencontre a permis de présenter <strong>Citoyen+</strong>, une application dédiée à l'éducation citoyenne, à l'information civique et au signalement citoyen.</p>
<p>À travers cette initiative, le MEC ambitionne de mettre à la disposition des jeunes et des citoyens un outil moderne pour :</p>
<ul>
  <li>mieux connaître leurs droits et devoirs ;</li>
  <li>comprendre le fonctionnement des institutions de la République ;</li>
  <li>suivre l'actualité ivoirienne ;</li>
  <li>participer activement à la vie publique.</li>
</ul>
<p>Les échanges, particulièrement enrichissants, nous confortent dans notre volonté de faire de Citoyen+ un véritable levier d'engagement citoyen au service de la jeunesse ivoirienne.</p>
<p>Nous remercions chaleureusement le Ministre de la Communication Porte Parole du Gouvernement, M. Amadou Coulibaly dit AM's et l'ensemble de ses collaborateurs pour leur écoute et l'intérêt accordé à la jeunesse et à cette initiative.</p>
<p><strong>🇨🇮 Ensemble, construisons une jeunesse informée, responsable et engagée.</strong></p>
<p class="text-primary font-bold mt-4">#MEC #CitoyenPlus #Citoyenneté #JeunesseEngagée #InnovationCivique #EngagementCitoyen #CôteDIvoire #InstruirePourImpacter #ImpactSocial</p>`,
  },
  {
    slug: 'mec-rond-point-saint-jean-incivisme-routier',
    title: "Le MEC mobilisé au rond-point Saint Jean : sensibiliser et agir contre l'incivisme routier",
    date: '2026-04-03',
    category: 'Sensibilisation',
    excerpt:
      "Le MEC a été présent au rond-point Saint Jean de 18h à 22h pour sensibiliser, interpeller et agir contre l'incivisme routier.",
    image: '../images/activite/15.jpg',
    content: `<h2>Le MEC mobilisé au rond-point Saint Jean</h2>
<p>Le Mouvement pour l'Éducation à la Citoyenneté - MEC était présent, au rond-point Saint Jean de 18h à 22h, nous n'étions pas juste là pour parler, mais pour agir, sensibiliser et interpeller.</p>
<p>Nous avons distribué plus de 2 000 flyers rappelant les infractions et contraventions du code de la route, et déployé 10 pancartes, dont certaines ont été portées par des participants à chaque feu du carrefour, pour toucher directement les usagers.</p>
<img src="../images/activite/16.jpg" alt="bilan02" />
<p>Chaque échange, chaque regard, chaque geste comptait, parce que derrière l'incivisme routier, il y a des vies en jeu. Merci à tous ceux qui se sont mobilisés pour faire passer ce message.</p>
<p>Le combat continue, et il commence avec chacun de nous.</p>
<p class="text-primary font-bold mt-4">#MEC #TousActeurs #cotedivoire #citoyenneté #civisme #zéroincivisme #citoyen</p>`,
  },
  {
    slug: 'gare-sud-zero-graffiti-zero-incivisme-mars-2026',
    title: 'À la Gare Sud : mobilisation citoyenne pour le défi « Zéro graffiti, Zéro incivisme »',
    date: '2026-03-07',
    category: 'Sensibilisation',
    excerpt:
      "Le 7 mars dernier, à la Gare Sud, citoyens engagés et partenaires se sont réunis autour d'un même objectif : agir concrètement contre l'incivisme.",
    image: '../images/activite/17.jpg',
    content: `<h2>À la Gare Sud : mobilisation citoyenne pour le défi « Zéro graffiti, Zéro incivisme »</h2>
<p>Le 7 mars dernier, à la Gare Sud, citoyens engagés et partenaires se sont réunis autour d'un même objectif : <strong>agir concrètement contre l'incivisme</strong>.</p>
<p>Dans le cadre du Défi Citoyen <strong>« 𝐙𝐞́𝐫𝐨 𝐠𝐫𝐚𝐟𝐟𝐢𝐭𝐢𝐬, 𝐙𝐞́𝐫𝐨 𝐢𝐧𝐜𝐢𝐯𝐢𝐬𝐦𝐞 »</strong>, nous avons mené une action de sensibilisation et de nettoyage pour rappeler que <strong>le respect des biens publics commence par chacun de nous</strong>.</p>
<p>Un grand merci à l'équipe de la SOTRA pour l'accueil et la collaboration.</p>
<p>Nous saluons également la présence et le soutien de <strong>Ibrahima Diabaté, Président du Conseil National des jeunes de Côte d'Ivoire CNJCI</strong>, engagé aux côtés de la jeunesse pour promouvoir le civisme et la responsabilité citoyenne.</p>
<img src="../images/activite/18.jpg" alt="Gare Sud - Défi Citoyen" />
<p>Ensemble, continuons à faire vivre une culture du respect et de l'engagement.</p>
<p class="text-primary font-bold mt-4">#engagementcitoyen #zerograffiti #incivisme #citoyenneté #civisme #MEC #GareSud #DéfiCitoyen</p>`,
  },
  {
    slug: 'lancement-du-mec',
    title: "Ma carte, ma voix, mon avenir : l'unité avant tout !",
    date: '2023-10-20',
    category: 'Sensibilisation',
    excerpt:
      "À Bouaké, une séance de sensibilisation citoyenne s'est tenue autour du thème principal « Ma carte, ma voix, mon avenir ».",
    image:
      'https://horizons-cdn.hostinger.com/b61a40b2-e909-43e0-9984-f1b4ded5ed4b/0d55b4aa9aa525ce18b16c3d046b58e2.jpg',
    content: `<h2>Ma carte, ma voix, mon avenir : l'unité avant tout !</h2>
<p>À Bouaké, une séance de sensibilisation citoyenne s'est tenue autour du thème principal « Ma carte, ma voix, mon avenir », organisée par le Centre d'Incubation de Leadership et d'Entrepreneuriat (CILE).</p>
<p><em>(Homme parlant dans un micro lors de l'événement)</em></p>
<p>Le <strong>dimanche 19 octobre</strong>, une communication a été présentée par le Président du Mouvement pour l'Education à la Citoyenneté Mamadou CONÉ sur le thème « L'importance de préserver l'unité nationale ». Il a rappelé que la Constitution ivoirienne, en son article 49, stipule que « La Côte d'Ivoire est UNE et INDIVISIBLE ». Partant de ce principe, les participants ont été invités à demeurer unis et indivisibles, au-delà des différences ethniques, religieuses, culturelles ou politiques.</p>
<p><em>(Participants à l'événement de sensibilisation)</em></p>
<p>Il a mis l'accent également sur la nécessité pour chaque citoyen, en particulier les jeunes, de retirer leur carte d'électeur et de voter dans le calme le samedi 25 octobre 2025, en vue d'exprimer pleinement leur engagement citoyen.</p>
<p>Cette rencontre a constitué un moment fort de cohésion et de communion, rappelant que sans paix, aucune union durable ni développement n'est possible.</p>
<p><em>(Groupe de personnes tenant une banderole 'Elections Apaisees')</em></p>
<p>Le Mouvement pour l'Éducation à la Citoyenneté (MEC) adresse ses sincères remerciements à Mohamed Soro, Coordonnateur du CILE, ainsi qu'à Ibrahim Ibrango, Président du Mouvement de la Jeunesse Consciente de Côte d'Ivoire, pour cette belle initiative en parfaite cohérence avec la vision du MEC, une jeunesse citoyenne, engagée et responsable.</p>
<p class="text-primary font-bold mt-4">
  #CitoyennetéActive #UnitéNationale #CohésionSociale #Élections2025 #CIV2025 #JeunesseEngagée #MEC #Bouaké
</p>`,
  },
  {
    slug: 'Rencontre_avec_M_Ali_DIARRASSOUBA',
    title: 'Rencontre avec M. Ali DIARRASSOUBA',
    date: '2023-11-19',
    category: 'Lancement',
    excerpt:
      "Audience avec M. Ali DIARRASSOUBA, Directeur de l'Information à la Nouvelle Chaîne Ivoirienne (NCI), dans le cadre de la tournée des leaders d'opinion.",
    image: '../images/lancement/007.jpeg',
    content: `<h2>Le mercredi 19 novembre 2025, Le Président du MEC, M. Mamadou CONÉ, a eu l'honneur de rencontrer Monsieur Ali DIARRASSOUBA, Directeur de l'Information à la Nouvelle Chaîne Ivoirienne (NCI).</h2>
<img src="../images/lancement/008.jpeg" alt="Audience03" />
<p>Cette audience s'inscrit dans le cadre de la tournée des leaders d'opinion initiée en prélude au lancement officiel du MEC prévu pour décembre prochain. Au cours de cet échange, il a présenté la vision, les axes stratégiques, les objectifs et les projets majeurs du mouvement, dans l'optique de recueillir ses orientations et conseils avisés.</p>
<img src="../images/lancement/009.jpeg" alt="Audience04" />
<p>Séduit par la pertinence de l'initiative et par son ambition nationale, il a exprimé son adhésion pleine et entière au projet. Il a partagé des recommandations issues de son expérience dans l'engagement communautaire et proposé des pistes stratégiques pour renforcer l'impact de nos actions. Il a également manifesté sa disponibilité à accompagner le MEC dans ses démarches futures.</p>
<p>Le Président ressort satisfait de cette rencontre, qui fut à la fois riche, constructive et porteuse de perspectives prometteuses, le tout immortalisé par une belle photo de famille.</p>
#CitoyennetéActive
#EngagementJeunesse
#MouvementÉducatif
#AliDiarrassouba
#MEC
#ChangerLesMentalités
#LeadershipCitoyen
#CIV`,
  },
  {
    slug: 'Benedictions_et_Conseils',
    title: 'Bénédictions et Conseils',
    date: '2023-11-20',
    category: 'Lancement',
    excerpt:
      "Rencontre avec Dr Sali DIABATÉ, Directrice des Études de l'Institut de Formation Politique Amadou Gon Coulibaly.",
    image: '../images/lancement/001.jpeg',
    content: `<h2>La réussite de toute grande initiative commence par les bénédictions de nos parents spirituels. C'est dans cet esprit que le Président du MEC, M. Mamadou CONÉ, a rencontré Dr Sali DIABATÉ, Directrice des Études de l'Institut de Formation Politique Amadou Gon Coulibaly, véritable mère de tous les auditeurs de l'IFP-AGC.</h2>
<p>Cette rencontre avait pour objectif de lui présenter notre projet, recueillir ses conseils avisés et solliciter ses bénédictions pour la suite. Touchée par cette démarche, elle nous a exprimé sa gratitude et réaffirmé sa disponibilité à nous accompagner, notamment par ses prières, pour la réussite de notre noble mission.  </p>
<p>Ma reconnaissance envers Mme la Directrice est immense. Durant ma mandature de délégué de la 4ᵉ promotion, elle m'a conseillé avec bienveillance, comme un parent accompagne son enfant. On sait pouvoir compter sur son soutien pour la suite de mes ambitions au service de la nation.</p>
#LeadershipCitoyen
#IFPAGC
#Mentorat
#ÉducationCivique
#MEC
#EngagementJeune
#Bénédictions
#Transmission
#CôteDIvoire
#JeunesseEngagée`,
  },
  {
    slug: 'audience-professeur-simplice-yode-dion',
    title: 'Une rencontre inspirante pour le MEC',
    date: '2023-11-25',
    category: 'Lancement',
    excerpt:
      "Audience avec le Professeur Simplice Yodé DION, Vice-Président de l'Université Félix Houphouët-Boigny, pour échanger sur l'éducation citoyenne.",
    image: '../images/lancement/004.jpeg',
    content: `<h2>Audience avec le Professeur Simplice Yodé DION : Une rencontre inspirante pour le MEC</h2>
<p>Le Président du MEC, M. Mamadou CONÉ, a eu l'honneur d'être reçu en audience le mardi 25 novembre 2025 par le Professeur Simplice Yodé DION, Vice-Président de l'Université Félix Houphouët-Boigny en charge de la Planification, de la Programmation et des Relations Extérieures, et par ailleurs Président de la Ligue de la Nouvelle Espérance pour la Côte d'Ivoire (LINECI).</p>
<p>Figure érudite de notre époque, modèle pour la jeunesse et défenseur infatigable des valeurs républicaines, le Professeur DION incarne pleinement les idéaux portés par le Mouvement pour l'Éducation à la Citoyenneté (MEC). Cette rencontre avait pour objectif de recueillir ses conseils éclairés et de nous abreuver de son immense savoir.</p>
<img src="../images/lancement/006.jpeg" alt="Audience01" />
<p>Un passage de notre échange m'a profondément marqué :</p>
<p>« Si nous réussissons le pari de l'éducation citoyenne, notre Nation rayonnera de mille feux. »</p>
<p>Une phrase forte, qui résonne avec notre ambition commune : œuvrer pour le rayonnement d'une Côte d'Ivoire unie, responsable et exemplaire.</p>
<p>Nous adressons nos sincères remerciements au Professeur Simplice DION pour cette audience riche, inspirante, et pour sa disponibilité à accompagner le MEC dans la réalisation de sa noble mission.
#MEC
#ÉducationCitoyenne
#Leadership
#Civisme
#UniversitéFHB
#JeunesseIvoirienne
#EngagementCitoyen
#Citoyenneté
#TransformationSociale
#CIV225
#Inspiration
#LINECI
#RenouveauCitoyen
</p>`,
  },
  {
    slug: 'rencontre-fondation-friedrich-naumann',
    title: 'Fondation Friedrich Naumann',
    date: '2025-12-04',
    category: 'Partenariat',
    excerpt:
      "Le jeudi 04 décembre, nous avons eu l'honneur de nous entretenir avec Madame Behira Bénédicte KOFFI, Chargée de Programmes et de Communication à la Fondation Friedrich Naumann.",
    image: '../images/lancement/011.jpg',
    content: `<h2>Fondation Friedrich Naumann</h2>
<p>Le jeudi 04 décembre, nous avons eu l'honneur de nous entretenir avec Madame Behira Bénédicte KOFFI, Chargée de Programmes et de Communication à la Fondation Friedrich Naumann.</p>
<p>Dans la perspective d'un partenariat stratégique avec la Fondation, nous avons engagé des échanges constructifs en vue d'explorer les possibilités de collaboration autour de projets communs, notamment ceux liés à la promotion de la citoyenneté et de l'engagement civique.</p>
<p>Nous avons tenu à exprimer notre profonde gratitude à la Fondation pour son engagement constant en faveur de l'éducation citoyenne et pour son appui indéfectible aux initiatives portées par la jeunesse ivoirienne.</p>
<p>Nous renouvelons nos sincères remerciements à Madame KOFFI pour la qualité de cet entretien et pour sa disponibilité.</p>
`,
  },
  {
    slug: 'rencontre-delegation-union-europeenne-ci',
    title: "Rencontre stratégique avec la Délégation de l'Union européenne en Côte d'Ivoire",
    date: '2026-01-07',
    category: 'Partenariat',
    excerpt:
      "Le mercredi 7 janvier 2026, nous avons été reçus à la délégation de l'Union Européenne 🇪🇺 en Côte d'Ivoire par Madame Estelle MAÎTRE, Chargée de programmes, dans la perspective d'établir un partenariat avec son institution.",
    image: '../images/lancement/014.jpg',
    content: `<h2>Rencontre stratégique avec la Délégation de l'Union européenne en Côte d'Ivoire</h2>
<p>Le mercredi 7 janvier 2026, nous avons été reçus à la délégation de l'Union Européenne 🇪🇺 en Côte d'Ivoire par Madame Estelle MAÎTRE, Chargée de programmes, dans la perspective d'établir un partenariat avec son institution.</p>
<p>Cette rencontre, la toute première de l'année 2026 pour le Mouvement pour l'Éducation à la Citoyenneté (MEC), a été l'occasion de présenter nos meilleurs vœux à Son Excellence Monsieur Irchad RAZAALY, Ambassadeur de l'Union européenne en Côte d'Ivoire.</p>
<img src="../images/lancement/013.jpg" alt="Union013" />
<p>Après les civilités d'usage et les échanges de vœux du Nouvel An, nous avons présenté la vision du MEC ainsi que les projets programmés pour l'année 2026.</p>
<p>Madame MAÎTRE s'est réjouie de la tenue de cet entretien, saluant la qualité des échanges et la pertinence des initiatives portées par le MEC au service de la Nation. Elle nous a partagé de précieux conseils pour la réussite de notre mission et a exprimé sa disponibilité à nous accompagner.</p>
<p>Cette séance de travail, particulièrement enrichissante, ouvre des perspectives prometteuses de collaboration entre le MEC et la Délégation de l'Union européenne 🇪🇺 en Côte d'Ivoire 🇨🇮.</p>
<p class="text-primary font-bold mt-4">
  #MEC #ÉducationÀLaCitoyenneté #PartenariatsInstitutionnels #UnionEuropéenneCI #EngagementCitoyen #JeunesseResponsable #DémocratieParticipative #CoopérationInternationale #CôteDIvoire #Europe
</p>`,
  },
];

export const actualitesMec: ActualiteMecSeedEntry[] = rawActualitesMec.map((raw) => ({
  slug: raw.slug,
  title: raw.title,
  date: new Date(raw.date),
  categorieSlug: MEC_CATEGORIES[raw.category],
  excerpt: raw.excerpt,
  imageUrl: resolveMecImageUrl(raw.image),
  content: resolveImagesInContent(raw.content),
}));
