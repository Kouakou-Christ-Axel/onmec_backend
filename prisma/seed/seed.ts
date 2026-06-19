import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Fixed UUIDs — ensures idempotent seeding (safe to run on every deploy)
const ID = {
  catSig: {
    voirie:        '11000000-0000-0000-0000-000000000001',
    environnement: '11000000-0000-0000-0000-000000000002',
    securite:      '11000000-0000-0000-0000-000000000003',
  },
  sigs: {
    s1: '12000000-0000-0000-0000-000000000001',
    s2: '12000000-0000-0000-0000-000000000002',
    s3: '12000000-0000-0000-0000-000000000003',
    s4: '12000000-0000-0000-0000-000000000004',
  },
  catQuiz: {
    civique:  '21000000-0000-0000-0000-000000000001',
    histoire: '21000000-0000-0000-0000-000000000002',
  },
  quiz: {
    q1: '22000000-0000-0000-0000-000000000001',
    q2: '22000000-0000-0000-0000-000000000002',
  },
  questions: {
    q1q1: '23100000-0000-0000-0000-000000000001',
    q1q2: '23100000-0000-0000-0000-000000000002',
    q1q3: '23100000-0000-0000-0000-000000000003',
    q2q1: '23200000-0000-0000-0000-000000000001',
    q2q2: '23200000-0000-0000-0000-000000000002',
    q2q3: '23200000-0000-0000-0000-000000000003',
  },
  choices: {
    q1q1c1: '24110000-0000-0000-0000-000000000001',
    q1q1c2: '24110000-0000-0000-0000-000000000002',
    q1q1c3: '24110000-0000-0000-0000-000000000003',
    q1q1c4: '24110000-0000-0000-0000-000000000004',
    q1q2c1: '24120000-0000-0000-0000-000000000001',
    q1q2c2: '24120000-0000-0000-0000-000000000002',
    q1q2c3: '24120000-0000-0000-0000-000000000003',
    q1q2c4: '24120000-0000-0000-0000-000000000004',
    q1q3c1: '24130000-0000-0000-0000-000000000001',
    q1q3c2: '24130000-0000-0000-0000-000000000002',
    q1q3c3: '24130000-0000-0000-0000-000000000003',
    q1q3c4: '24130000-0000-0000-0000-000000000004',
    q2q1c1: '24210000-0000-0000-0000-000000000001',
    q2q1c2: '24210000-0000-0000-0000-000000000002',
    q2q1c3: '24210000-0000-0000-0000-000000000003',
    q2q1c4: '24210000-0000-0000-0000-000000000004',
    q2q2c1: '24220000-0000-0000-0000-000000000001',
    q2q2c2: '24220000-0000-0000-0000-000000000002',
    q2q2c3: '24220000-0000-0000-0000-000000000003',
    q2q2c4: '24220000-0000-0000-0000-000000000004',
    q2q3c1: '24230000-0000-0000-0000-000000000001',
    q2q3c2: '24230000-0000-0000-0000-000000000002',
    q2q3c3: '24230000-0000-0000-0000-000000000003',
    q2q3c4: '24230000-0000-0000-0000-000000000004',
  },
  actualites: {
    a1: '31000000-0000-0000-0000-000000000001',
    a2: '31000000-0000-0000-0000-000000000002',
    a3: '31000000-0000-0000-0000-000000000003',
  },
  documents: {
    d1: '32000000-0000-0000-0000-000000000001',
    d2: '32000000-0000-0000-0000-000000000002',
    d3: '32000000-0000-0000-0000-000000000003',
  },
  notifications: {
    n1: '33000000-0000-0000-0000-000000000001',
    n2: '33000000-0000-0000-0000-000000000002',
    n3: '33000000-0000-0000-0000-000000000003',
    n4: '33000000-0000-0000-0000-000000000004',
  },
};

async function main() {
  console.log('🌱 Seeding database...');

  const hash = await bcrypt.hash('password', await bcrypt.genSalt());

  // ── USERS ────────────────────────────────────────────────────────────────────
  // Upsert by email (unique). If user already exists with a random UUID (created
  // via the API), we keep their real ID and capture it for use in FK references below.
  const admin = await prisma.user.upsert({
    where: { email: 'admin@agence.ci' },
    update: { emailVerified: true },
    create: {
      fullname: 'Admin Principal',
      email: 'admin@agence.ci',
      password: hash,
      role: 'ADMIN',
      phone: '+2250101010101',
      emailVerified: true,
    },
  });

  const member1 = await prisma.user.upsert({
    where: { email: 'kouame.jean@citoyen.ci' },
    update: { emailVerified: true },
    create: {
      fullname: 'Kouamé Jean',
      email: 'kouame.jean@citoyen.ci',
      password: hash,
      role: 'MEMBER',
      phone: '+2250707070701',
      emailVerified: true,
    },
  });

  const member2 = await prisma.user.upsert({
    where: { email: 'aya.fatou@citoyen.ci' },
    update: { emailVerified: true },
    create: {
      fullname: 'Aya Fatou',
      email: 'aya.fatou@citoyen.ci',
      password: hash,
      role: 'MEMBER',
      phone: '+2250707070702',
      emailVerified: true,
    },
  });

  console.log('✅ Users seeded');

  // ── CATEGORIES SIGNALEMENT ────────────────────────────────────────────────────
  await prisma.categorieSignalement.upsert({
    where: { id: ID.catSig.voirie },
    update: {},
    create: {
      id: ID.catSig.voirie,
      nom: 'Voirie et Infrastructure',
      description: "Nids de poule, routes endommagées, trottoirs défectueux, signalisation manquante.",
      validationObligatoire: true,
    },
  });

  await prisma.categorieSignalement.upsert({
    where: { id: ID.catSig.environnement },
    update: {},
    create: {
      id: ID.catSig.environnement,
      nom: 'Environnement et Salubrité',
      description: "Dépôts sauvages d'ordures, pollution, eaux stagnantes, inondations.",
      validationObligatoire: true,
    },
  });

  await prisma.categorieSignalement.upsert({
    where: { id: ID.catSig.securite },
    update: {},
    create: {
      id: ID.catSig.securite,
      nom: 'Sécurité Publique',
      description: 'Éclairage public défectueux, vandalisme, dangers imminents.',
      validationObligatoire: false,
    },
  });

  console.log('✅ Catégories signalement seeded');

  // ── CATEGORIES QUIZ ───────────────────────────────────────────────────────────
  await prisma.categorieQuiz.upsert({
    where: { id: ID.catQuiz.civique },
    update: {},
    create: {
      id: ID.catQuiz.civique,
      nom: 'Citoyenneté & Démocratie',
      description: "Questions sur les droits et devoirs du citoyen, les institutions de la République.",
    },
  });

  await prisma.categorieQuiz.upsert({
    where: { id: ID.catQuiz.histoire },
    update: {},
    create: {
      id: ID.catQuiz.histoire,
      nom: "Histoire de la Côte d'Ivoire",
      description: "Questions sur l'histoire, la géographie et la culture ivoirienne.",
    },
  });

  console.log('✅ Catégories quiz seeded');

  // ── QUIZ ──────────────────────────────────────────────────────────────────────
  await prisma.quiz.upsert({
    where: { id: ID.quiz.q1 },
    update: {},
    create: {
      id: ID.quiz.q1,
      title: 'Les bases de la citoyenneté',
      description: 'Testez vos connaissances sur les droits et devoirs fondamentaux du citoyen ivoirien.',
      difficulte: 'FACILE',
      authorId: admin.id,
      categorieId: ID.catQuiz.civique,
    },
  });

  await prisma.quiz.upsert({
    where: { id: ID.quiz.q2 },
    update: {},
    create: {
      id: ID.quiz.q2,
      title: 'Histoire et institutions de la RCI',
      description: "Quiz sur les grandes dates, les symboles et les institutions de la Côte d'Ivoire.",
      difficulte: 'MOYEN',
      authorId: admin.id,
      categorieId: ID.catQuiz.histoire,
    },
  });

  console.log('✅ Quiz seeded');

  // ── QUESTIONS ─────────────────────────────────────────────────────────────────
  const questionsData = [
    { id: ID.questions.q1q1, text: "Quel est le rôle principal d'un citoyen dans une démocratie ?", quizId: ID.quiz.q1, correctId: ID.choices.q1q1c2 },
    { id: ID.questions.q1q2, text: "À quel âge peut-on voter en Côte d'Ivoire ?", quizId: ID.quiz.q1, correctId: ID.choices.q1q2c1 },
    { id: ID.questions.q1q3, text: "Qu'est-ce que la laïcité ?", quizId: ID.quiz.q1, correctId: ID.choices.q1q3c3 },
    { id: ID.questions.q2q1, text: "En quelle année la Côte d'Ivoire a-t-elle accédé à l'indépendance ?", quizId: ID.quiz.q2, correctId: ID.choices.q2q1c4 },
    { id: ID.questions.q2q2, text: "Quelle est la capitale économique de la Côte d'Ivoire ?", quizId: ID.quiz.q2, correctId: ID.choices.q2q2c2 },
    { id: ID.questions.q2q3, text: "Qui est considéré comme le père de la nation ivoirienne ?", quizId: ID.quiz.q2, correctId: ID.choices.q2q3c1 },
  ];

  for (const q of questionsData) {
    await prisma.question.upsert({ where: { id: q.id }, update: {}, create: q });
  }

  console.log('✅ Questions seeded');

  // ── CHOICES ───────────────────────────────────────────────────────────────────
  const choicesData = [
    { id: ID.choices.q1q1c1, text: 'Payer ses impôts uniquement', questionId: ID.questions.q1q1 },
    { id: ID.choices.q1q1c2, text: 'Participer activement à la vie politique et sociale', questionId: ID.questions.q1q1 },
    { id: ID.choices.q1q1c3, text: 'Obéir aux autorités sans questionner', questionId: ID.questions.q1q1 },
    { id: ID.choices.q1q1c4, text: 'Rester neutre dans les affaires publiques', questionId: ID.questions.q1q1 },
    { id: ID.choices.q1q2c1, text: '18 ans', questionId: ID.questions.q1q2 },
    { id: ID.choices.q1q2c2, text: '16 ans', questionId: ID.questions.q1q2 },
    { id: ID.choices.q1q2c3, text: '21 ans', questionId: ID.questions.q1q2 },
    { id: ID.choices.q1q2c4, text: '25 ans', questionId: ID.questions.q1q2 },
    { id: ID.choices.q1q3c1, text: "La pratique d'une religion unique", questionId: ID.questions.q1q3 },
    { id: ID.choices.q1q3c2, text: "L'interdiction de toute religion", questionId: ID.questions.q1q3 },
    { id: ID.choices.q1q3c3, text: "La séparation de l'État et des religions", questionId: ID.questions.q1q3 },
    { id: ID.choices.q1q3c4, text: "L'obligation de pratiquer une religion", questionId: ID.questions.q1q3 },
    { id: ID.choices.q2q1c1, text: '1945', questionId: ID.questions.q2q1 },
    { id: ID.choices.q2q1c2, text: '1955', questionId: ID.questions.q2q1 },
    { id: ID.choices.q2q1c3, text: '1958', questionId: ID.questions.q2q1 },
    { id: ID.choices.q2q1c4, text: '1960', questionId: ID.questions.q2q1 },
    { id: ID.choices.q2q2c1, text: 'Yamoussoukro', questionId: ID.questions.q2q2 },
    { id: ID.choices.q2q2c2, text: 'Abidjan', questionId: ID.questions.q2q2 },
    { id: ID.choices.q2q2c3, text: 'Bouaké', questionId: ID.questions.q2q2 },
    { id: ID.choices.q2q2c4, text: 'San-Pédro', questionId: ID.questions.q2q2 },
    { id: ID.choices.q2q3c1, text: 'Félix Houphouët-Boigny', questionId: ID.questions.q2q3 },
    { id: ID.choices.q2q3c2, text: 'Laurent Gbagbo', questionId: ID.questions.q2q3 },
    { id: ID.choices.q2q3c3, text: 'Alassane Ouattara', questionId: ID.questions.q2q3 },
    { id: ID.choices.q2q3c4, text: 'Henri Konan Bédié', questionId: ID.questions.q2q3 },
  ];

  for (const c of choicesData) {
    await prisma.choice.upsert({ where: { id: c.id }, update: {}, create: c });
  }

  console.log('✅ Choices seeded');

  // ── SIGNALEMENTS CITOYENS ─────────────────────────────────────────────────────
  const signalementsData = [
    { id: ID.sigs.s1, titre: 'Nid de poule dangereux avenue Chardy', description: "Un nid de poule de grande taille obstrue la voie et cause des accidents. Présent depuis plus de 2 semaines.", categorieId: ID.catSig.voirie, adresse: 'Avenue Chardy, Plateau, Abidjan', latitude: 5.3192, longitude: -4.0167, statut: 'NOUVEAU' as const, citoyenId: member1.id, validation: false },
    { id: ID.sigs.s2, titre: "Dépôt sauvage d'ordures rue des Jardins", description: "Un dépôt de déchets ménagers non collectés depuis 3 jours crée des nuisances olfactives.", categorieId: ID.catSig.environnement, adresse: 'Rue des Jardins, Cocody, Abidjan', latitude: 5.3714, longitude: -3.9866, statut: 'EN_COURS' as const, citoyenId: member2.id, validation: true },
    { id: ID.sigs.s3, titre: 'Lampadaire éteint — zone non éclairée', description: "Un lampadaire est défaillant depuis une semaine, rendant la zone dangereuse la nuit.", categorieId: ID.catSig.securite, adresse: 'Boulevard Latrille, Cocody, Abidjan', latitude: 5.3620, longitude: -3.9960, statut: 'RESOLU' as const, citoyenId: member1.id, validation: true },
    { id: ID.sigs.s4, titre: 'Inondation récurrente au carrefour Deux Plateaux', description: "Les eaux de pluie s'accumulent à cet endroit à chaque forte pluie, bloquant la circulation.", categorieId: ID.catSig.environnement, adresse: 'Carrefour Deux Plateaux, Cocody, Abidjan', latitude: 5.3800, longitude: -3.9850, statut: 'NOUVEAU' as const, citoyenId: member2.id, validation: false },
  ];

  for (const s of signalementsData) {
    await prisma.signalementCitoyen.upsert({ where: { id: s.id }, update: {}, create: s });
  }

  console.log('✅ Signalements citoyens seeded');

  // ── ACTUALITES ────────────────────────────────────────────────────────────────
  const actualitesData = [
    { id: ID.actualites.a1, slug: 'lancement-plateforme-citoyenne-onmec', title: 'Lancement de la plateforme citoyenne ONMEC', date: new Date('2025-01-15'), excerpt: 'La plateforme ONMEC ouvre ses portes pour connecter les citoyens ivoiriens à leurs institutions.', content: '<p>La plateforme numérique ONMEC a été officiellement lancée ce 15 janvier 2025.</p>', imageUrl: '/images/actualites/lancement-onmec.jpg' },
    { id: ID.actualites.a2, slug: 'journee-nationale-citoyennete-2025', title: 'Journée nationale de la citoyenneté 2025', date: new Date('2025-03-10'), excerpt: "Le 10 mars, la Côte d'Ivoire célèbre la citoyenneté active et la participation civique.", content: "<p>À l'occasion de la Journée nationale de la citoyenneté, plusieurs activités sont organisées à travers le pays.</p>", imageUrl: '/images/actualites/journee-citoyennete.jpg' },
    { id: ID.actualites.a3, slug: 'amelioration-voirie-abidjan-2025', title: "Programme d'amélioration de la voirie à Abidjan", date: new Date('2025-05-20'), excerpt: 'Le gouvernement annonce un vaste programme de réhabilitation des routes abidjanaises.', content: "<p>Dans le cadre du Plan National de Développement, le District d'Abidjan lance un programme pour la réhabilitation de plus de 200 km de voirie urbaine.</p>", imageUrl: '/images/actualites/voirie-abidjan.jpg' },
  ];

  for (const a of actualitesData) {
    await prisma.actualite.upsert({ where: { id: a.id }, update: {}, create: a });
  }

  console.log('✅ Actualités seeded');

  // ── DOCUMENTS ─────────────────────────────────────────────────────────────────
  const documentsData = [
    { id: ID.documents.d1, title: "Constitution de la République de Côte d'Ivoire", description: 'Texte intégral de la Constitution ivoirienne révisée en 2016.', fileUrl: '/documents/constitution-ci-2016.pdf', fileType: 'pdf', uploadedById: admin.id },
    { id: ID.documents.d2, title: 'Guide du citoyen ivoirien', description: 'Guide pratique sur les droits, devoirs et démarches administratives du citoyen.', fileUrl: '/documents/guide-citoyen-ci.pdf', fileType: 'pdf', uploadedById: admin.id },
    { id: ID.documents.d3, title: 'Rapport annuel ONMEC 2024', description: 'Bilan des activités et signalements traités par la plateforme en 2024.', fileUrl: '/documents/rapport-onmec-2024.pdf', fileType: 'pdf', uploadedById: admin.id },
  ];

  for (const d of documentsData) {
    await prisma.document.upsert({ where: { id: d.id }, update: {}, create: d });
  }

  console.log('✅ Documents seeded');

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
  const notificationsData = [
    { id: ID.notifications.n1, title: 'Bienvenue sur ONMEC !', body: 'Votre compte a été créé avec succès. Découvrez la plateforme et participez à la vie citoyenne.', type: 'welcome', isRead: false, userId: member1.id },
    { id: ID.notifications.n2, title: 'Bienvenue sur ONMEC !', body: 'Votre compte a été créé avec succès. Découvrez la plateforme et participez à la vie citoyenne.', type: 'welcome', isRead: false, userId: member2.id },
    { id: ID.notifications.n3, title: 'Votre signalement est en cours de traitement', body: "Votre signalement 'Dépôt sauvage d'ordures rue des Jardins' est désormais pris en charge.", type: 'signalement_update', isRead: true, userId: member2.id },
    { id: ID.notifications.n4, title: 'Nouveau quiz disponible', body: "Un nouveau quiz 'Les bases de la citoyenneté' vient d'être publié. Testez vos connaissances !", type: 'new_quiz', isRead: false, userId: member1.id },
  ];

  for (const n of notificationsData) {
    await prisma.notification.upsert({ where: { id: n.id }, update: {}, create: n });
  }

  console.log('✅ Notifications seeded');

  console.log('\n🎉 Seed terminé avec succès !');
  console.log('   admin@agence.ci              (ADMIN)  — mot de passe: password');
  console.log('   kouame.jean@citoyen.ci       (MEMBER) — mot de passe: password');
  console.log('   aya.fatou@citoyen.ci         (MEMBER) — mot de passe: password');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
