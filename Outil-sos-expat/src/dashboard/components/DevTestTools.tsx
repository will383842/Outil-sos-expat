/**
 * =============================================================================
 * DEV TEST TOOLS - Outils de test pour le mode développement
 * =============================================================================
 *
 * En mode dev, utilise des données mockées localement (pas besoin de Firestore).
 * Permet de tester l'interface sans permissions Firebase.
 *
 * =============================================================================
 */

import { useState, useCallback } from "react";
import {
  Wrench,
  Plus,
  Database,
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export interface MockConversation {
  id: string;
  bookingId: string;
  providerId: string;
  clientName: string;
  clientFirstName: string;
  title: string;
  subject: string;
  status: "active" | "completed";
  messagesCount: number;
  providerType: "lawyer" | "expat";
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}

export interface MockBooking {
  id: string;
  title: string;
  description: string;
  status: string;
  clientFirstName: string;
  clientLastName: string;
  clientName: string;
  clientNationality: string;
  clientCurrentCountry: string;
  clientLanguages: string[];
  providerId: string;
  providerName: string;
  providerType: "lawyer" | "expat";
  providerCountry: string;
  duration: number;
  aiProcessed: boolean;
  aiProcessedAt: Date | null;
  createdAt: Date;
}

export interface MockMessage {
  id: string;
  role: "user" | "assistant";
  source: "provider" | "gpt";
  content: string;
  createdAt: Date;
}

// =============================================================================
// STORAGE LOCAL DES MOCKS
// =============================================================================

const STORAGE_KEY = "sos-expat-dev-mock-data";

interface MockData {
  conversations: MockConversation[];
  bookings: MockBooking[];
  messages: Record<string, MockMessage[]>; // conversationId -> messages
}

function loadMockData(): MockData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // Convertir les dates
      return {
        ...data,
        conversations: data.conversations.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          lastMessageAt: new Date(c.lastMessageAt),
        })),
        bookings: data.bookings.map((b: any) => ({
          ...b,
          createdAt: new Date(b.createdAt),
          aiProcessedAt: b.aiProcessedAt ? new Date(b.aiProcessedAt) : null,
        })),
        messages: Object.fromEntries(
          Object.entries(data.messages || {}).map(([convId, msgs]) => [
            convId,
            (msgs as any[]).map((m: any) => ({
              ...m,
              createdAt: new Date(m.createdAt),
            })),
          ])
        ),
      };
    }
  } catch (e) {
    console.warn("[DevTestTools] Erreur chargement mock data:", e);
  }
  return { conversations: [], bookings: [], messages: {} };
}

function saveMockData(data: MockData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Export pour utiliser dans les autres composants
export function getMockData(): MockData {
  return loadMockData();
}

export function clearMockData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Ajouter un message à une conversation mock
export function addMockMessage(conversationId: string, message: MockMessage): void {
  const data = loadMockData();
  if (!data.messages[conversationId]) {
    data.messages[conversationId] = [];
  }
  data.messages[conversationId].push(message);
  saveMockData(data);
  window.dispatchEvent(new CustomEvent("mock-messages-updated", { detail: { conversationId } }));
}

// =============================================================================
// SIMULATION IA - Réponses réalistes pour le mode dev
// =============================================================================

const AI_RESPONSE_TEMPLATES = [
  {
    keywords: ["visa", "permis", "séjour", "résidence"],
    responses: [
      "Concernant votre situation de visa, voici les points importants à considérer :\n\n**1. Type de visa requis**\nSelon votre situation, vous pourriez avoir besoin d'un visa de travail, d'un permis de séjour temporaire, ou d'une carte de résident.\n\n**2. Documents nécessaires**\n- Passeport valide (6 mois minimum)\n- Justificatif de domicile\n- Contrat de travail ou attestation d'emploi\n- Photos d'identité récentes\n\n**3. Délais à prévoir**\nLes délais de traitement varient entre 2 et 8 semaines selon les pays.\n\nSouhaitez-vous que je vous donne plus de détails sur un aspect particulier ?",
      "Pour votre demande de visa, je vous recommande de :\n\n1. **Vérifier les conditions d'éligibilité** de votre pays de destination\n2. **Rassembler les documents** requis (voir liste ci-dessous)\n3. **Prendre rendez-vous** auprès du consulat ou de l'ambassade\n\n📋 **Documents généralement demandés :**\n- Formulaire de demande complété\n- Passeport + copies\n- Photos conformes aux normes\n- Justificatifs financiers\n- Assurance voyage/santé\n\nAvez-vous déjà commencé à rassembler ces documents ?",
    ],
  },
  {
    keywords: ["fiscal", "impôt", "taxe", "déclaration", "revenus"],
    responses: [
      "Votre question fiscale est très pertinente. Voici mon analyse :\n\n**Résidence fiscale**\nVous êtes considéré comme résident fiscal dans le pays où vous passez plus de 183 jours par an ou où se situe le centre de vos intérêts économiques.\n\n**Obligations déclaratives**\n- Déclarer vos revenus mondiaux dans votre pays de résidence fiscale\n- Vérifier les conventions de non-double imposition\n- Conserver tous les justificatifs pendant au moins 3 ans\n\n**Points d'attention**\n⚠️ Les revenus de source étrangère peuvent nécessiter des formulaires spécifiques\n⚠️ Certains pays exigent une déclaration même pour les non-résidents\n\nQuel est votre pays de résidence actuel ?",
      "En matière de fiscalité internationale, plusieurs règles s'appliquent :\n\n**1. Principe de base**\nChaque pays taxe différemment les revenus. La convention fiscale entre les deux pays détermine qui a le droit de taxer quoi.\n\n**2. Crédit d'impôt**\nSi vous payez des impôts dans deux pays, vous pouvez généralement bénéficier d'un crédit d'impôt pour éviter la double imposition.\n\n**3. Recommandations**\n- Consultez la convention fiscale applicable\n- Gardez une trace de tous vos paiements d'impôts\n- Envisagez un accompagnement par un expert\n\nVoulez-vous que j'approfondisse un point particulier ?",
    ],
  },
  {
    keywords: ["divorce", "mariage", "conjoint", "famille", "enfant"],
    responses: [
      "Les questions de droit de la famille à l'international sont complexes. Voici les éléments clés :\n\n**Juridiction compétente**\nEn règle générale, c'est le tribunal du lieu de résidence habituelle des époux qui est compétent.\n\n**Loi applicable**\nPlusieurs critères peuvent déterminer la loi applicable :\n- Nationalité commune des époux\n- Résidence habituelle\n- Choix des parties (dans certains cas)\n\n**Protection des enfants**\nL'intérêt supérieur de l'enfant prime toujours. La Convention de La Haye encadre les questions de garde internationale.\n\n**Prochaines étapes recommandées**\n1. Déterminer la juridiction compétente\n2. Identifier la loi applicable\n3. Consulter un avocat spécialisé\n\nDans quel pays résidez-vous actuellement ?",
    ],
  },
  {
    keywords: ["entreprise", "société", "création", "business", "commercial"],
    responses: [
      "Pour créer une entreprise à l'étranger, voici les étapes essentielles :\n\n**1. Choix de la forme juridique**\n- SARL/LLC : responsabilité limitée, gestion flexible\n- SA/Corp : pour les projets ambitieux avec investisseurs\n- Succursale : extension de votre société existante\n\n**2. Formalités administratives**\n- Enregistrement au registre du commerce local\n- Obtention des licences nécessaires\n- Ouverture d'un compte bancaire professionnel\n\n**3. Aspects fiscaux**\n- Imposition des bénéfices locaux\n- TVA et taxes indirectes\n- Obligations comptables\n\n**4. Considérations pratiques**\n- Domiciliation de l'entreprise\n- Embauche de personnel local\n- Conformité réglementaire\n\nDans quel pays souhaitez-vous créer votre entreprise ?",
    ],
  },
  {
    keywords: ["immobilier", "achat", "maison", "appartement", "propriété"],
    responses: [
      "L'achat immobilier à l'étranger nécessite une attention particulière :\n\n**Vérifications préalables**\n- Droit des étrangers à acquérir (certains pays ont des restrictions)\n- Titre de propriété clair et sans charges\n- Conformité urbanistique du bien\n\n**Financement**\n- Prêt bancaire local vs. prêt dans votre pays d'origine\n- Apport personnel souvent requis (20-30%)\n- Garanties demandées par les banques\n\n**Frais à prévoir**\n- Droits d'enregistrement/mutation\n- Frais de notaire\n- Honoraires d'avocat\n- Taxes locales annuelles\n\n**Conseil important**\nFaites-vous accompagner par un avocat local pour vérifier tous les aspects juridiques avant de signer.\n\nOù se situe le bien que vous souhaitez acquérir ?",
    ],
  },
];

const DEFAULT_RESPONSES = [
  "Merci pour ces informations. Pour mieux vous conseiller, pourriez-vous me préciser :\n\n1. **Votre situation actuelle** - Où résidez-vous et depuis combien de temps ?\n2. **Votre nationalité** - Cela peut influencer les démarches à effectuer\n3. **Votre objectif** - Quel est le résultat que vous souhaitez obtenir ?\n\nAvec ces éléments, je pourrai vous donner des conseils plus adaptés à votre situation.",
  "Je comprends votre situation. Voici quelques points généraux à considérer :\n\n**Démarches administratives**\nChaque pays a ses propres procédures. Il est important de bien identifier les autorités compétentes.\n\n**Documentation**\nRassemblez tous vos documents importants : pièce d'identité, justificatifs de domicile, documents officiels.\n\n**Délais**\nPrévoyez des marges de sécurité car les procédures administratives peuvent prendre du temps.\n\nY a-t-il un aspect spécifique sur lequel vous aimeriez que j'approfondisse ?",
  "Votre question touche à plusieurs aspects du droit international. Voici mon analyse préliminaire :\n\n**Principes applicables**\nLe droit international privé détermine quelle loi s'applique et quel tribunal est compétent.\n\n**Recommandations**\n1. Identifier tous les pays concernés par votre situation\n2. Vérifier les conventions internationales applicables\n3. Consulter les textes de loi pertinents\n\n**Prochaine étape**\nPour vous donner un avis plus précis, j'aurais besoin de quelques informations complémentaires.\n\nPouvez-vous me décrire plus en détail votre situation ?",
];

// Fonction pour simuler une réponse IA
export function simulateAIResponse(userMessage: string, bookingContext?: { title?: string; description?: string }): Promise<string> {
  return new Promise((resolve) => {
    // Délai réaliste de 1.5 à 3 secondes
    const delay = 1500 + Math.random() * 1500;

    setTimeout(() => {
      const lowerMessage = userMessage.toLowerCase();

      // Chercher une réponse contextuelle basée sur les mots-clés
      for (const template of AI_RESPONSE_TEMPLATES) {
        if (template.keywords.some((kw) => lowerMessage.includes(kw))) {
          const responses = template.responses;
          resolve(responses[Math.floor(Math.random() * responses.length)]);
          return;
        }
      }

      // Réponse par défaut
      resolve(DEFAULT_RESPONSES[Math.floor(Math.random() * DEFAULT_RESPONSES.length)]);
    }, delay);
  });
}

// =============================================================================
// DONNÉES DE TEST
// =============================================================================

const TEST_CLIENTS = [
  {
    firstName: "Jean",
    lastName: "Dupont",
    nationality: "France",
    currentCountry: "Espagne",
    languages: ["fr", "es"],
  },
  {
    firstName: "Marie",
    lastName: "Martin",
    nationality: "Belgique",
    currentCountry: "Portugal",
    languages: ["fr", "pt", "en"],
  },
  {
    firstName: "Pierre",
    lastName: "Bernard",
    nationality: "Suisse",
    currentCountry: "Thaïlande",
    languages: ["fr", "en"],
  },
  {
    firstName: "Sophie",
    lastName: "Leroy",
    nationality: "Canada",
    currentCountry: "Japon",
    languages: ["fr", "en", "jp"],
  },
];

const TEST_TITLES = [
  "Problème de visa de travail",
  "Question sur la fiscalité internationale",
  "Divorce avec conjoint étranger",
  "Création d'entreprise à l'étranger",
  "Succession transfrontalière",
  "Rachat de bien immobilier",
];

const TEST_DESCRIPTIONS = [
  "Je suis expatrié depuis 2 ans et j'ai des questions concernant mon statut fiscal. Mon employeur me demande de fournir des documents mais je ne sais pas lesquels.",
  "Mon visa expire dans 3 mois et je souhaite le renouveler mais la procédure semble avoir changé. Pouvez-vous m'aider ?",
  "Je souhaite acheter un bien immobilier dans mon pays d'accueil mais je ne connais pas les implications légales et fiscales.",
  "Mon conjoint et moi souhaitons divorcer mais nous avons des biens dans plusieurs pays. Comment procéder ?",
  "Je veux créer une entreprise mais je ne sais pas si je dois la créer dans mon pays d'origine ou dans mon pays de résidence.",
];

const MOCK_MESSAGES: MockMessage[] = [
  {
    id: "msg-1",
    role: "user",
    source: "provider",
    content: "Bonjour, j'ai une question concernant ma situation fiscale en tant qu'expatrié.",
    createdAt: new Date(Date.now() - 25 * 60 * 1000),
  },
  {
    id: "msg-2",
    role: "assistant",
    source: "gpt",
    content: "Bonjour ! Je comprends votre préoccupation concernant la fiscalité internationale. Pourriez-vous me donner plus de détails sur votre situation ? Notamment : dans quel pays résidez-vous actuellement et depuis combien de temps ?",
    createdAt: new Date(Date.now() - 24 * 60 * 1000),
  },
  {
    id: "msg-3",
    role: "user",
    source: "provider",
    content: "Je réside en Espagne depuis 2 ans. Mon employeur est en France mais je travaille à distance.",
    createdAt: new Date(Date.now() - 20 * 60 * 1000),
  },
  {
    id: "msg-4",
    role: "assistant",
    source: "gpt",
    content: "Merci pour ces précisions. Votre situation relève du télétravail transfrontalier, qui est encadré par des conventions fiscales bilatérales.\n\nÉtant donné que vous résidez en Espagne depuis plus de 183 jours par an, vous êtes considéré comme résident fiscal espagnol. Cependant, selon la convention franco-espagnole, votre employeur français peut continuer à prélever les cotisations sociales sous certaines conditions.\n\n**Points importants à vérifier :**\n1. Votre certificat A1 pour les cotisations sociales\n2. La déclaration de revenus dans les deux pays\n3. Le crédit d'impôt pour éviter la double imposition",
    createdAt: new Date(Date.now() - 18 * 60 * 1000),
  },
];

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

export default function DevTestTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mockData, setMockData] = useState<MockData>(loadMockData);

  // Afficher UNIQUEMENT si ?dev=true dans l'URL
  const isDevMock = new URLSearchParams(window.location.search).get("dev") === "true";
  if (!isDevMock) {
    return null;
  }

  const refreshMockData = () => {
    setMockData(loadMockData());
  };

  // Créer une conversation mockée
  const createMockConversation = useCallback((status: "active" | "completed") => {
    const client = TEST_CLIENTS[Math.floor(Math.random() * TEST_CLIENTS.length)];
    const title = TEST_TITLES[Math.floor(Math.random() * TEST_TITLES.length)];
    const description = TEST_DESCRIPTIONS[Math.floor(Math.random() * TEST_DESCRIPTIONS.length)];
    const now = new Date();
    const providerId = "dev-provider-1";
    const convId = `conv-${Date.now()}`;
    const bookingId = `booking-${Date.now()}`;

    const data = loadMockData();

    // Créer le booking
    const booking: MockBooking = {
      id: bookingId,
      title,
      description,
      status: status === "active" ? "in_progress" : "completed",
      clientFirstName: client.firstName,
      clientLastName: client.lastName,
      clientName: `${client.firstName} ${client.lastName}`,
      clientNationality: client.nationality,
      clientCurrentCountry: client.currentCountry,
      clientLanguages: client.languages,
      providerId,
      providerName: "Dr. Test Provider",
      providerType: Math.random() > 0.5 ? "lawyer" : "expat",
      providerCountry: "France",
      duration: 30,
      aiProcessed: status === "completed",
      aiProcessedAt: status === "completed" ? new Date(Date.now() - 30 * 60 * 1000) : null,
      createdAt: new Date(Date.now() - (status === "completed" ? 2 * 60 * 60 * 1000 : 5 * 60 * 1000)),
    };

    // Créer la conversation
    const conversation: MockConversation = {
      id: convId,
      bookingId,
      providerId,
      clientName: booking.clientName,
      clientFirstName: booking.clientFirstName,
      title,
      subject: title,
      status,
      messagesCount: status === "completed" ? 4 : 0,
      providerType: booking.providerType,
      createdAt: booking.createdAt,
      updatedAt: now,
      lastMessageAt: now,
    };

    // Ajouter les messages si conversation complétée
    if (status === "completed") {
      data.messages[convId] = [...MOCK_MESSAGES];
    }

    // Si on crée une conversation active, désactiver les autres
    if (status === "active") {
      data.conversations = data.conversations.map((c) =>
        c.status === "active" ? { ...c, status: "completed" as const } : c
      );
    }

    data.conversations.push(conversation);
    data.bookings.push(booking);
    saveMockData(data);
    setMockData(data);

    setResult({
      success: true,
      message: `Conversation ${status === "active" ? "ACTIVE" : "PASSÉE"} créée ! Client: ${client.firstName}. Rafraîchissez la page.`,
    });

    // Dispatch event pour que les autres composants sachent que les données ont changé
    window.dispatchEvent(new CustomEvent("mock-data-updated"));
  }, []);

  // Supprimer toutes les données mock
  const clearAllMockData = useCallback(() => {
    clearMockData();
    setMockData({ conversations: [], bookings: [], messages: {} });
    setResult({
      success: true,
      message: "Toutes les données de test ont été supprimées. Rafraîchissez la page.",
    });
    window.dispatchEvent(new CustomEvent("mock-data-updated"));
  }, []);

  const activeCount = mockData.conversations.filter((c) => c.status === "active").length;
  const completedCount = mockData.conversations.filter((c) => c.status === "completed").length;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Bouton flottant */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-full shadow-lg hover:bg-amber-600 transition-colors"
      >
        <Wrench className="w-5 h-5" />
        <span className="text-sm font-medium">Dev Tools</span>
        {(activeCount > 0 || completedCount > 0) && (
          <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded">
            {activeCount + completedCount}
          </span>
        )}
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {/* Panel d'outils */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-100">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-gray-900">Données de test (Mock)</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-amber-100 rounded"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Contenu */}
          <div className="p-4 space-y-3">
            {/* Statistiques */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-700">{activeCount}</p>
                <p className="text-xs text-green-600">Active(s)</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-700">{completedCount}</p>
                <p className="text-xs text-gray-600">Passée(s)</p>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="space-y-2">
              <button
                onClick={() => createMockConversation("active")}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Créer conversation ACTIVE</span>
              </button>

              <button
                onClick={() => createMockConversation("completed")}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Créer conversation PASSÉE</span>
              </button>

              {(activeCount > 0 || completedCount > 0) && (
                <button
                  onClick={clearAllMockData}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Supprimer toutes les données</span>
                </button>
              )}
            </div>

            {/* Résultat */}
            {result && (
              <div
                className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                  result.success
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <span>{result.message}</span>
              </div>
            )}

            {/* Note */}
            <p className="text-xs text-gray-500 text-center">
              Données stockées localement (localStorage). Pas besoin de Firestore.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
