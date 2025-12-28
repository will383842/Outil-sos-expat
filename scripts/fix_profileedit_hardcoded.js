const fs = require('fs');

const path = 'C:/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/src/pages/ProfileEdit.tsx';
let content = fs.readFileSync(path, 'utf-8');

// 1. Ajouter le hook useLanguage après useAuth
content = content.replace(
  'const { user: ctxUser, authInitialized, refreshUser } = useAuth();',
  `const { user: ctxUser, authInitialized, refreshUser } = useAuth();
  const { t } = useLanguage();`
);

// 2. Remplacer les textes hardcodés
const replacements = [
  // Titre principal
  ['>Modifier mon profil</h1>', '>{t("profileEdit.title")}</h1>'],

  // Photo
  ['alt="Photo de profil"', 'alt={t("profileEdit.photo.alt")}'],
  ['<span className="text-gray-500 text-sm">Photo</span>', '<span className="text-gray-500 text-sm">{t("profileEdit.photo.placeholder")}</span>'],
  ['<label className="block mb-2 text-sm font-medium text-gray-700">Photo de profil</label>', '<label className="block mb-2 text-sm font-medium text-gray-700">{t("profileEdit.photo.label")}</label>'],
  ['<p className="text-xs text-gray-500 mt-1">Formats acceptés: JPEG, PNG, WebP (max 5MB)</p>', '<p className="text-xs text-gray-500 mt-1">{t("profileEdit.photo.formats")}</p>'],

  // Section Informations personnelles
  ['{styles.sectionTitle}>Informations personnelles</h2>', '{styles.sectionTitle}>{t("profileEdit.personalInfo.title")}</h2>'],
  ['placeholder="Prénom"', 'placeholder={t("profileEdit.personalInfo.firstName")}'],
  ['placeholder="Nom"', 'placeholder={t("profileEdit.personalInfo.lastName")}'],
  ['placeholder="Email"', 'placeholder={t("profileEdit.personalInfo.email")}'],

  // Section Sécurité
  ['{styles.sectionTitle}>Sécurité</h2>', '{styles.sectionTitle}>{t("profileEdit.security.title")}</h2>'],
  ['placeholder="Mot de passe actuel (requis pour les modifications de sécurité)"', 'placeholder={t("profileEdit.security.currentPassword")}'],
  ['placeholder="Nouveau mot de passe (optionnel)"', 'placeholder={t("profileEdit.security.newPassword")}'],
  ['placeholder="Confirmer le nouveau mot de passe"', 'placeholder={t("profileEdit.security.confirmPassword")}'],

  // Section Coordonnées
  ['{styles.sectionTitle}>Coordonnées</h2>', '{styles.sectionTitle}>{t("profileEdit.contact.title")}</h2>'],
  ['placeholder="Indicatif (+33)"', 'placeholder={t("profileEdit.contact.phoneCode")}'],
  ['placeholder="Numéro de téléphone"', 'placeholder={t("profileEdit.contact.phone")}'],

  // Section Lawyer
  ['{styles.sectionTitle}>Détails professionnels</h2>', '{styles.sectionTitle}>{t("profileEdit.lawyer.title")}</h2>'],
  ['placeholder="Pays de résidence"', 'placeholder={t("profileEdit.lawyer.country")}'],
  ['placeholder="Pays actuel"', 'placeholder={t("profileEdit.lawyer.currentCountry")}'],
  ['placeholder="Numéro de barreau"', 'placeholder={t("profileEdit.lawyer.barNumber")}'],
  ['placeholder="Années d\'expérience"', 'placeholder={t("profileEdit.lawyer.experienceYears")}'],
  ['placeholder="Année du diplôme"', 'placeholder={t("profileEdit.lawyer.diplomaYear")}'],
  ['placeholder="Description professionnelle"', 'placeholder={t("profileEdit.lawyer.description")}'],
  ['placeholder="Spécialités (séparées par des virgules)"', 'placeholder={t("profileEdit.lawyer.specialties")}'],
  ['placeholder="Pays d\'intervention"', 'placeholder={t("profileEdit.lawyer.interventionCountries")}'],
  ['placeholder="Langues parlées (séparées par des virgules)"', 'placeholder={t("profileEdit.lawyer.languages")}'],
  ['placeholder="Certifications"', 'placeholder={t("profileEdit.lawyer.certifications")}'],

  // Section Expat
  ['{styles.sectionTitle}>Informations sur votre expatriation</h2>', '{styles.sectionTitle}>{t("profileEdit.expat.title")}</h2>'],
  ['placeholder="Années d\'expatriation"', 'placeholder={t("profileEdit.expat.expatYears")}'],
  ['placeholder="Votre expérience d\'expatriation"', 'placeholder={t("profileEdit.expat.expDescription")}'],
  ['placeholder="Pourquoi souhaitez-vous aider d\'autres expatriés ?"', 'placeholder={t("profileEdit.expat.whyHelp")}'],

  // Section Client
  ['{styles.sectionTitle}>Informations complémentaires</h2>', '{styles.sectionTitle}>{t("profileEdit.client.title")}</h2>'],
  ['placeholder="Nationalité"', 'placeholder={t("profileEdit.client.nationality")}'],
  ['placeholder="Statut"', 'placeholder={t("profileEdit.client.status")}'],
  ['placeholder="Langue principale"', 'placeholder={t("profileEdit.client.language")}'],

  // Feedback
  ['<p className="font-semibold">Erreur</p>', '<p className="font-semibold">{t("profileEdit.feedback.error")}</p>'],
  ['<p className="font-semibold">Succès</p>', '<p className="font-semibold">{t("profileEdit.feedback.success")}</p>'],

  // Actions
  ['Mise à jour en cours...', '{t("profileEdit.actions.updating")}'],
];

replacements.forEach(([search, replace]) => {
  content = content.replace(search, replace);
});

fs.writeFileSync(path, content, 'utf-8');
console.log('✅ ProfileEdit.tsx mis à jour avec les traductions!');
console.log(`${replacements.length} remplacements effectués.`);
