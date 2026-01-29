/**
 * Seed script for Influencer Training Modules
 *
 * FUN & ENGAGING VERSION 🎉
 * - Tons of emojis
 * - Casual, friendly tone
 * - Content creator vibes
 * - Gamified feeling
 * - No friction, pure fun!
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { InfluencerTrainingModule } from "../types";

/**
 * Fun training modules for influencers
 */
export const INFLUENCER_TRAINING_MODULES: Omit<InfluencerTrainingModule, "id" | "createdAt" | "updatedAt" | "createdBy">[] = [
  // ============================================================================
  // MODULE 1: Welcome to the Creator Club! 🌟
  // ============================================================================
  {
    order: 1,
    title: "Bienvenue au Creator Club ! 🌟",
    titleTranslations: {
      en: "Welcome to the Creator Club! 🌟",
      es: "¡Bienvenido al Club de Creadores! 🌟",
    },
    description: "3 minutes pour comprendre comment transformer ton audience en revenus. Let's go! 🚀",
    descriptionTranslations: {
      en: "3 minutes to understand how to turn your audience into income. Let's go! 🚀",
    },
    category: "onboarding",
    coverImageUrl: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800",
    estimatedMinutes: 3,
    isRequired: true,
    prerequisites: [],
    status: "published",
    passingScore: 70,
    slides: [
      {
        order: 1,
        type: "text",
        title: "T'es officiellement partenaire ! 🎉",
        titleTranslations: { en: "You're officially a partner! 🎉" },
        content: `Bienvenue dans le programme Influenceur SOS-Expat ! 🙌

Tu as une audience ? Des followers qui te font confiance ?

**Parfait.** Tu vas pouvoir les aider ET gagner de l'argent. Le combo parfait ! 💪

**C'est quoi SOS-Expat ?**
Une plateforme qui met en relation les expatriés avec un **avocat** ou un **expatrié aidant** en **moins de 5 minutes** par téléphone ! 📞

🌍 **Couverture mondiale :**
- Tous les pays du monde
- Toutes les langues
- Toutes les nationalités

📋 **Tous types de problèmes :**
Visa, papiers administratifs, impôts, police, travaux, déménagement, stockage, litiges, contrats... Même juste pour une question simple ou être rassuré !

💰 **Prix accessibles :**
- **Avocat** : ~49€ / 55$ pour 20 min
- **Expatrié aidant** : ~19€ / 25$ pour 20 min

**Pourquoi ce partenariat est PARFAIT ?**
Si tu crées du contenu pour des expats ou des voyageurs, tu as exactement l'audience qui a BESOIN de ce service ! 🎯

**Ton rôle ?**
Recommander le service à ta communauté de manière authentique. Quand ils l'utilisent → tu touches ta com' !

⚠️ **IMPORTANT - Règle absolue :**
Spam, forcing, ou contenu trompeur = **BAN DÉFINITIF** de la plateforme.
On veut des partenaires authentiques, pas des spammeurs !

Simple comme bonjour 👋`,
        contentTranslations: {
          en: `Welcome to the SOS-Expat Influencer Program! 🙌

Got an audience? Followers who trust you?

**Perfect.** You're going to help them AND make money. The perfect combo! 💪

**What's SOS-Expat?**
A platform where expats can talk to lawyers in a few clicks. Visas, contracts, administrative issues... All without the headache!

**Your role?**
Recommend the service to your community. When they use it → you get your commission!

Easy peasy 👋`,
        },
      },
      {
        order: 2,
        type: "text",
        title: "Tes gains en 2 minutes ⏱️",
        titleTranslations: { en: "Your earnings in 2 minutes ⏱️" },
        content: `On va droit au but ! 💰

**💵 $10 par appel**
Un de tes followers s'inscrit avec ton lien et appelle ?
→ **$10 dans ta poche !**

**💵 $5 par appel (recrutement)**
Tu recrutes un avocat ou un expatrié aidant ?
→ Pendant 6 mois, tu touches **$5 par appel** qu'il reçoit !

**🎁 -5% pour tes followers**
Tes followers ont automatiquement 5% de réduction. Un argument en plus !

**📊 Pour info - Ce que gagnent les providers :**
- Avocat : ~30€ / 30$ par appel de 20 min
- Expatrié aidant : ~10€ / 10$ par appel de 30 min

→ Tout le monde peut devenir expatrié aidant (s'il est expat) !
→ Tout avocat en exercice peut s'inscrire !

**Exemple réaliste :**
- 50 followers utilisent ton lien ce mois = **$500**
- 1 provider recruté (20 appels/mois) = **$100/mois**
- Total = **$600/mois** 🤑

Et ce n'est que le début...`,
        contentTranslations: {
          en: `Let's get straight to the point! 💰

**💵 $10 per call**
One of your followers signs up with your link and calls a lawyer?
→ **$10 in your pocket!**

**💵 $5 per call (recruitment)**
Know a lawyer who wants more clients?
→ Recruit them, and for 6 months, you get **$5 per call** they receive!

**🎁 -5% for your followers**
Your followers automatically get 5% off. One more selling point for you!

**Realistic example:**
- 50 followers use your link this month = **$500**
- 1 recruited lawyer (20 calls/month) = **$100/month**
- Total = **$600/month** 🤑

And this is just the beginning...`,
        },
      },
      {
        order: 3,
        type: "text",
        title: "Tes outils de créateur 🛠️",
        titleTranslations: { en: "Your creator tools 🛠️" },
        content: `Dans ton espace influenceur, tu as tout ce qu'il faut pour promouvoir facilement :

**🔗 Ton lien personnalisé**
Un lien unique rien qu'à toi. Simple à partager, il track automatiquement tes conversions.

**📊 Dashboard en temps réel**
- Combien de clics
- Combien d'inscrits
- Combien de $$$

**🖼️ Visuels prêts à l'emploi**
Stories, posts, bannières... On a tout préparé pour toi !

**📱 QR Code perso**
Parfait pour les événements ou les vidéos. Scanne → inscrit → tu gagnes !

**Tout est automatique.** Tu partages, on track, tu gagnes. 🎯`,
        contentTranslations: {
          en: `In your influencer space, you have everything you need to promote easily:

**🔗 Your personalized link**
A unique link just for you. Easy to share, it automatically tracks your conversions.

**📊 Real-time dashboard**
- How many clicks
- How many sign-ups
- How much $$$

**🖼️ Ready-to-use visuals**
Stories, posts, banners... We've prepared everything for you!

**📱 Personal QR Code**
Perfect for events or videos. Scan → sign up → you earn!

**Everything is automatic.** You share, we track, you earn. 🎯`,
        },
      },
    ],
    quizQuestions: [
      {
        id: "m1_q1",
        question: "Combien tes followers économisent grâce à ton lien ? 💸",
        questionTranslations: { en: "How much do your followers save with your link? 💸" },
        options: [
          { id: "a", text: "0% (rien 😢)", textTranslations: { en: "0% (nothing 😢)" } },
          { id: "b", text: "5% de réduction ! 🎉", textTranslations: { en: "5% off! 🎉" } },
          { id: "c", text: "10%", textTranslations: { en: "10%" } },
          { id: "d", text: "50%", textTranslations: { en: "50%" } },
        ],
        correctAnswerId: "b",
        explanation: "5% de réduction automatique pour ta communauté. Un super argument pour les convaincre ! 🎯",
        explanationTranslations: { en: "5% automatic discount for your community. A great argument to convince them! 🎯" },
      },
      {
        id: "m1_q2",
        question: "Que se passe-t-il si tu spammes ou forces la main ? ⚠️",
        questionTranslations: { en: "What happens if you spam or force? ⚠️" },
        options: [
          { id: "a", text: "Rien, c'est normal", textTranslations: { en: "Nothing, it's normal" } },
          { id: "b", text: "Un petit avertissement", textTranslations: { en: "A small warning" } },
          { id: "c", text: "BAN DÉFINITIF de la plateforme 🚫", textTranslations: { en: "PERMANENT BAN from the platform 🚫" } },
          { id: "d", text: "Une réduction de commission", textTranslations: { en: "A commission reduction" } },
        ],
        correctAnswerId: "c",
        explanation: "Spam ou forcing = BAN DÉFINITIF ! Pas d'avertissement, pas de seconde chance. On veut des partenaires authentiques ! 🙌",
        explanationTranslations: { en: "Spam or forcing = PERMANENT BAN! No warning, no second chance. We want authentic partners! 🙌" },
      },
    ],
  },

  // ============================================================================
  // MODULE 2: Créer du contenu qui convertit 🎬
  // ============================================================================
  {
    order: 2,
    title: "Créer du contenu qui convertit 🎬",
    titleTranslations: {
      en: "Create Content That Converts 🎬",
      es: "Crear contenido que convierte 🎬",
    },
    description: "Les secrets pour parler de SOS-Expat de façon naturelle et efficace. Zero forcing ! 😎",
    descriptionTranslations: {
      en: "The secrets to talking about SOS-Expat naturally and effectively. Zero forcing! 😎",
    },
    category: "content_creation",
    coverImageUrl: "https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=800",
    estimatedMinutes: 4,
    isRequired: false,
    prerequisites: [],
    status: "published",
    passingScore: 70,
    slides: [
      {
        order: 1,
        type: "text",
        title: "La règle d'or du contenu 👑",
        titleTranslations: { en: "The golden rule of content 👑" },
        content: `Avant tout, une vérité importante :

# Tes followers te suivent pour TOI, pas pour de la pub.

# ⚠️ SPAM / FORCING = BAN DÉFINITIF ⚠️

C'est dans notre **charte** et c'est non négociable. Si tu spammes ton lien partout ou si tu fais de la pub agressive → **ton compte est banni définitivement**. Pas d'avertissement, pas de seconde chance.

**Ce qui est STRICTEMENT INTERDIT :**
- 🚫 "Utilisez mon code PROMO123 !" (trop vendeur)
- 🚫 Spam de liens dans chaque post/story
- 🚫 Contenu 100% promotionnel sans valeur
- 🚫 Fausses promesses ou contenu trompeur
- 🚫 Harceler ta communauté avec des relances

**Ce qui MARCHE (et qui est encouragé) :**
- ✅ Raconter une vraie histoire
- ✅ Résoudre un vrai problème de ta communauté
- ✅ Être authentique, utile et bienveillant

**La formule magique :**
> Problème réel + Solution naturelle + Ton lien (en douceur)

Tu parles d'un problème que ta communauté vit, tu proposes une solution, et ton lien est là pour ceux qui veulent l'utiliser. C'est tout ! 🎯`,
        contentTranslations: {
          en: `First, an important truth:

# Your followers follow you for YOU, not for ads.

**What DOESN'T work:**
- ❌ "Use my code PROMO123!" (too salesy)
- ❌ Spamming links in every post
- ❌ 100% promotional content

**What WORKS:**
- ✅ Telling a real story
- ✅ Solving a real problem
- ✅ Being authentic and helpful

**The magic formula:**
> Real problem + Natural solution + Your link

You talk about a problem your community experiences, you offer a solution, and your link is there for those who want to use it. That's it! 🎯`,
        },
      },
      {
        order: 2,
        type: "text",
        title: "Idées de contenu qui cartonnent 🔥",
        titleTranslations: { en: "Content ideas that crush it 🔥" },
        content: `Voici des formats qui marchent super bien :

**📖 Le storytelling (le plus efficace !)**
> "L'année dernière, j'ai galéré avec mon visa. J'ai découvert un service où tu peux parler à un avocat en 2 clics. Ça m'a sauvé !"

**❓ Le Q&A**
> "Vous me demandez souvent comment gérer l'admin à l'étranger. Mon secret ? J'utilise [service] pour les questions juridiques."

**🎭 Le sketch/humour**
> Montre la galère classique d'un expatrié, puis la solution. Les gens adorent !

**📊 L'infographie utile**
> "5 erreurs que font tous les expatriés" → avec ton lien à la fin

**🎤 Le live/AMA**
> Parle de tes galères d'expatrié et mentionne naturellement le service

**Thèmes parfaits pour SOS-Expat (TOUS couverts !) :**
- 🛂 Visa, permis de séjour, immigration
- 🏠 Problèmes de propriétaire / logement
- 💼 Contrats de travail, litiges employeur
- 📋 Démarches administratives (tous pays !)
- 🏦 Impôts, fiscalité internationale
- 🚔 Problèmes avec la police
- 📦 Déménagement, stockage
- 🔧 Travaux, litiges divers
- ❓ Ou juste besoin d'être rassuré !

**Rappel : Tous les pays, toutes les langues, toutes les nationalités !**

**L'idée : intégrer SOS-Expat dans ton contenu existant, de manière naturelle et utile.** 💡`,
        contentTranslations: {
          en: `Here are formats that work really well:

**📖 Storytelling**
> "Last year, I struggled with my visa. I discovered a service where you can talk to a lawyer in 2 clicks. It saved me!"

**❓ Q&A**
> "You often ask me how to handle admin abroad. My secret? I use [service] for legal questions."

**🎭 Sketch/humor**
> Show the classic expat struggle, then the magic solution. People love it!

**📊 Infographic**
> "5 mistakes all expats make" → with your link at the end

**🎤 Live/AMA**
> Talk about your expat struggles and naturally mention the service

**The idea: integrate SOS-Expat into your existing content, don't create content just for SOS-Expat.** 💡`,
        },
      },
      {
        order: 3,
        type: "text",
        title: "Les hooks qui accrochent 🪝",
        titleTranslations: { en: "Hooks that grab attention 🪝" },
        content: `Les 3 premières secondes sont cruciales. Voici des hooks testés et approuvés :

**🎯 Le problème commun**
> "Tu vis à l'étranger et t'as peur de faire une erreur administrative ?"

**😱 Le choc**
> "J'ai failli perdre mon visa à cause d'UNE erreur..."

**🤫 Le secret**
> "Le truc que tous les expatriés devraient connaître..."

**❓ La question**
> "Tu sais ce que font les expats malins quand ils ont un problème juridique ?"

**📊 Le chiffre**
> "80% des expatriés font cette erreur. Et toi ?"

**Après le hook :** Tu racontes, tu expliques, et tu termines avec ton lien + call-to-action soft.

> "Si ça peut t'aider, c'est par ici : [lien] 😊"`,
        contentTranslations: {
          en: `The first 3 seconds are crucial. Here are tested and approved hooks:

**🎯 The common problem**
> "Living abroad and afraid of making an administrative mistake?"

**😱 The shock**
> "I almost lost my visa because of ONE mistake..."

**🤫 The secret**
> "The thing all expats should know..."

**❓ The question**
> "Know what smart expats do when they have a legal problem?"

**📊 The number**
> "80% of expats make this mistake. Do you?"

**After the hook:** You tell your story, explain, and end with your link + soft call-to-action.

> "If it can help, it's here: [link] 😊"`,
        },
      },
      {
        order: 4,
        type: "text",
        title: "Où poster ton contenu 📍",
        titleTranslations: { en: "Where to post your content 📍" },
        content: `Chaque plateforme a ses codes. Voici comment adapter :

**📸 Instagram**
- Stories : parfait pour les témoignages rapides
- Reels : hooks + storytelling court
- Bio : ton lien permanent !
- Highlights : crée un highlight "Expat tips"

**🎵 TikTok**
- Format court, direct, authentique
- Montre les galères avec humour
- Trends + expatriation = viralité

**🎬 YouTube**
- Vlogs expatriation
- Vidéos "Comment faire X à l'étranger"
- Description = ton lien !

**📝 Blog/Newsletter**
- Articles détaillés sur l'expatriation
- Guides pratiques
- Ton lien intégré naturellement

**🌍 Communautés d'expatriés (avec précaution !)**
Si tu es membre actif de groupes Facebook/forums d'expats, tu peux partager ton contenu. Mais **JAMAIS de spam** - uniquement si c'est pertinent et utile pour la discussion.

⚠️ **Rappel : spam dans les groupes = BAN définitif !**

**💡 Pro tip :** Recycle ton contenu sur plusieurs plateformes ! Un Reel peut devenir un TikTok, une Story, un Short... 🔄`,
        contentTranslations: {
          en: `Each platform has its own rules. Here's how to adapt:

**📸 Instagram**
- Stories: perfect for quick testimonials
- Reels: hooks + short storytelling
- Bio: your permanent link!
- Highlights: create an "Expat tips" highlight

**🎵 TikTok**
- Short, direct, authentic format
- Show struggles with humor
- Trends + expat life = virality

**🎬 YouTube**
- Expat vlogs
- "How to do X abroad" videos
- Description = your link!

**📝 Blog/Newsletter**
- Detailed articles about expatriation
- Practical guides
- Your link integrated naturally

**💡 Pro tip:** Recycle your content across platforms! A Reel can become a TikTok, a Story, a Short... 🔄`,
        },
      },
    ],
    quizQuestions: [
      {
        id: "m2_q1",
        question: "C'est quoi la formule magique du contenu ? ✨",
        questionTranslations: { en: "What's the magic content formula? ✨" },
        options: [
          { id: "a", text: "Spam + Spam + Spam (= BAN !)", textTranslations: { en: "Spam + Spam + Spam (= BAN!)" } },
          { id: "b", text: "Problème réel + Solution naturelle + Lien 🎯", textTranslations: { en: "Real problem + Natural solution + Link 🎯" } },
          { id: "c", text: "Code promo + Urgence + Pression (= BAN !)", textTranslations: { en: "Promo code + Urgency + Pressure (= BAN!)" } },
          { id: "d", text: "Ne jamais parler du service", textTranslations: { en: "Never talk about the service" } },
        ],
        correctAnswerId: "b",
        explanation: "Exactement ! Problème réel + solution naturelle + ton lien. Le spam et la pression = BAN définitif ! 💪",
        explanationTranslations: { en: "Exactly! Real problem + natural solution + your link. Spam and pressure = permanent BAN! 💪" },
      },
      {
        id: "m2_q2",
        question: "Quel type de contenu marche le mieux ? 🏆",
        questionTranslations: { en: "What type of content works best? 🏆" },
        options: [
          { id: "a", text: "Des pubs classiques", textTranslations: { en: "Classic ads" } },
          { id: "b", text: "Du storytelling authentique 📖", textTranslations: { en: "Authentic storytelling 📖" } },
          { id: "c", text: "Que des codes promo", textTranslations: { en: "Only promo codes" } },
          { id: "d", text: "Des messages copiés-collés", textTranslations: { en: "Copy-pasted messages" } },
        ],
        correctAnswerId: "b",
        explanation: "Le storytelling authentique ! Les gens veulent des vraies histoires, pas de la pub 🎬",
        explanationTranslations: { en: "Authentic storytelling! People want real stories, not ads 🎬" },
      },
    ],
  },

  // ============================================================================
  // MODULE 3: Maximiser tes revenus 📈
  // ============================================================================
  {
    order: 3,
    title: "Maximiser tes revenus 📈",
    titleTranslations: {
      en: "Maximize Your Revenue 📈",
      es: "Maximiza tus ingresos 📈",
    },
    description: "Les stratégies avancées pour passer au niveau supérieur. Ready to scale ? 🚀",
    descriptionTranslations: {
      en: "Advanced strategies to level up. Ready to scale? 🚀",
    },
    category: "monetization",
    coverImageUrl: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800",
    estimatedMinutes: 4,
    isRequired: false,
    prerequisites: [],
    status: "published",
    passingScore: 70,
    slides: [
      {
        order: 1,
        type: "text",
        title: "Le pouvoir du recrutement 🦸",
        titleTranslations: { en: "The power of recruitment 🦸" },
        content: `Le vrai game changer ? **Recruter des providers !** ⚡

**Tu peux recruter 2 types de personnes :**

**👨‍⚖️ Les AVOCATS :**
- Tout avocat en exercice peut s'inscrire
- Ils gagnent ~30€/30$ par appel de 20 min
- Argument : "Des clients expatriés du monde entier !"

**🌍 Les EXPATRIÉS AIDANTS :**
- Tout expatrié peut devenir aidant !
- Ils gagnent ~10€/10$ par appel de 30 min
- Argument : "Aide d'autres expats et monétise ton expérience !"

**Comment ça marche pour toi :**
Tu recrutes quelqu'un avec ton code → Tu touches **$5 par appel** qu'il reçoit pendant **6 mois** !

**Le calcul qui fait rêver :**
- 1 provider actif = ~25 appels/mois
- 25 × $5 = **$125/mois**
- × 6 mois = **$750** pour UN recrutement ! 🤯

**Imagine 5 providers...**
- **$625/mois** de revenus passifs
- **$3,750** sur 6 mois
- Et tu n'as RIEN à faire ! 💤💰

**Où les trouver ?**
- LinkedIn (avocats immigration/international)
- Ta communauté d'expats (pour les aidants)
- Ton réseau perso`,
        contentTranslations: {
          en: `The real game changer? **Recruiting lawyers!** ⚡

**How it works:**
Know a lawyer, notary, jurist? Tell them about SOS-Expat. They sign up with your code → You get **$5 per call** they receive for **6 months**!

**The dream calculation:**
- 1 active lawyer = ~25 calls/month
- 25 × $5 = **$125/month**
- × 6 months = **$750** for ONE lawyer! 🤯

**Imagine 5 lawyers...**
- **$625/month** in passive income
- **$3,750** over 6 months
- And you do NOTHING! 💤💰

**Where to find them?**
- LinkedIn (search "immigration lawyer")
- Your personal network
- Networking events`,
        },
      },
      {
        order: 2,
        type: "text",
        title: "Stratégies de contenu avancées 🎯",
        titleTranslations: { en: "Advanced content strategies 🎯" },
        content: `Passe au niveau supérieur avec ces stratégies :

**🔄 Le contenu evergreen**
Crée du contenu qui reste pertinent longtemps :
- "Guide : Que faire quand on arrive dans un nouveau pays"
- "Les 10 galères de tout expatrié"
→ Continue de générer des clics pendant des mois !

**📧 La newsletter**
Capture les emails de ta communauté et envoie des tips réguliers avec ton lien.

**🤝 Les collabs**
Partenariat avec d'autres créateurs expatriation = nouvelle audience !

**🎁 Le lead magnet**
Offre un guide gratuit "Les 5 erreurs à éviter en expatriation" en échange d'un email → puis nurture avec ton lien.

**📈 L'entonnoir**
Contenu gratuit → Confiance → Recommandation → Commission ! 🎯`,
        contentTranslations: {
          en: `Level up with these strategies:

**🔄 Evergreen content**
Create content that stays relevant for a long time:
- "Guide: What to do when you arrive in a new country"
- "The 10 struggles of every expat"
→ Keeps generating clicks for months!

**📧 The newsletter**
Capture your community's emails and send regular tips with your link.

**🤝 Collabs**
Partnership with other expat creators = new audience!

**🎁 The lead magnet**
Offer a free guide "5 mistakes to avoid in expatriation" in exchange for an email → then nurture with your link.

**📈 The funnel**
Free content → Trust → Recommendation → Commission! 🎯`,
        },
      },
      {
        order: 3,
        type: "text",
        title: "Optimise ton tunnel 🔧",
        titleTranslations: { en: "Optimize your funnel 🔧" },
        content: `Petits ajustements = grandes différences !

**🔗 Ton lien**
- Mets-le PARTOUT (bio, description, site...)
- Utilise un raccourcisseur pour tracker
- Ajoute un call-to-action : "Clique ici pour -5%"

**📊 Analyse tes stats**
- Quel contenu génère le plus de clics ?
- Quel jour/heure marche le mieux ?
- Quelle plateforme convertit le plus ?
→ Double down sur ce qui marche ! 📈

**🎯 A/B testing**
- Teste différents hooks
- Teste différents CTA
- Teste différents formats
→ Garde ce qui performe !

**⏰ La régularité**
- Mieux vaut 1 bon post/semaine que 7 posts médiocres
- La constance crée la confiance
- La confiance crée les conversions

**Tu es un business maintenant.** Agis comme tel ! 💼`,
        contentTranslations: {
          en: `Small adjustments = big differences!

**🔗 Your link**
- Put it EVERYWHERE (bio, description, website...)
- Use a shortener to track
- Add a call-to-action: "Click here for -5%"

**📊 Analyze your stats**
- Which content generates the most clicks?
- Which day/time works best?
- Which platform converts the most?
→ Double down on what works! 📈

**🎯 A/B testing**
- Test different hooks
- Test different CTAs
- Test different formats
→ Keep what performs!

**⏰ Consistency**
- Better 1 good post/week than 7 mediocre posts
- Consistency creates trust
- Trust creates conversions

**You're a business now.** Act like it! 💼`,
        },
      },
      {
        order: 4,
        type: "text",
        title: "Ta checklist succès ✅",
        titleTranslations: { en: "Your success checklist ✅" },
        content: `Récap de tout ce que tu dois faire pour cartonner ! 🚀

**Cette semaine :**
□ Mettre ton lien dans toutes tes bios
□ Créer ton premier contenu SOS-Expat (authentique !)
□ Planifier 2-3 posts pour le mois

**Ce mois-ci :**
□ Publier au moins 4 contenus avec ton lien
□ Contacter 3 avocats potentiels
□ Analyser tes premiers résultats

**Ce trimestre :**
□ Avoir un flow régulier de contenu
□ Recruter au moins 1 avocat
□ Atteindre tes premiers $500 💰

# ⚠️ RAPPEL IMPORTANT - La charte ⚠️

**Ce qui est OK :**
- ✅ Contenu authentique et utile
- ✅ Storytelling personnel
- ✅ Recommandations naturelles

**Ce qui = BAN DÉFINITIF :**
- 🚫 Spam de liens
- 🚫 Contenu trompeur / fausses promesses
- 🚫 Harcèlement de ta communauté

**Rappelle-toi :**
- 🎯 Sois authentique et bienveillant
- 🎯 Sois régulier
- 🎯 Sois patient

**Les résultats viennent avec le temps. Et toi, t'as le talent ! 🌟**

Go faire des $$$ (de manière éthique) ! 🚀`,
        contentTranslations: {
          en: `Recap of everything you need to do to crush it! 🚀

**This week:**
□ Put your link in all your bios
□ Create your first SOS-Expat content
□ Plan 2-3 posts for the month

**This month:**
□ Publish at least 4 pieces of content with your link
□ Contact 3 potential lawyers
□ Analyze your first results

**This quarter:**
□ Have a regular content flow
□ Recruit at least 1 lawyer
□ Reach your first $500 💰

**Remember:**
- 🎯 Be authentic
- 🎯 Be consistent
- 🎯 Be patient

**Results come with time. And you've got the talent! 🌟**

Go make $$$! 🚀`,
        },
      },
    ],
    quizQuestions: [
      {
        id: "m3_q1",
        question: "Pendant combien de temps tu touches des commissions sur un avocat recruté ? ⏰",
        questionTranslations: { en: "For how long do you earn commissions on a recruited lawyer? ⏰" },
        options: [
          { id: "a", text: "1 mois", textTranslations: { en: "1 month" } },
          { id: "b", text: "3 mois", textTranslations: { en: "3 months" } },
          { id: "c", text: "6 mois ! 🎉", textTranslations: { en: "6 months! 🎉" } },
          { id: "d", text: "1 an", textTranslations: { en: "1 year" } },
        ],
        correctAnswerId: "c",
        explanation: "6 mois de revenus passifs pour chaque avocat recruté. Le vrai passive income ! 💤💰",
        explanationTranslations: { en: "6 months of passive income for each recruited lawyer. Real passive income! 💤💰" },
      },
      {
        id: "m3_q2",
        question: "C'est quoi la clé pour réussir (et éviter le BAN) ? 🔑",
        questionTranslations: { en: "What's the key to success (and avoiding the BAN)? 🔑" },
        options: [
          { id: "a", text: "Spammer son lien partout (= BAN !)", textTranslations: { en: "Spamming your link everywhere (= BAN!)" } },
          { id: "b", text: "Poster 1 fois et attendre", textTranslations: { en: "Post once and wait" } },
          { id: "c", text: "Authenticité + Bienveillance + Régularité 🌟", textTranslations: { en: "Authenticity + Kindness + Consistency 🌟" } },
          { id: "d", text: "Faire de fausses promesses (= BAN !)", textTranslations: { en: "Making false promises (= BAN!)" } },
        ],
        correctAnswerId: "c",
        explanation: "Authenticité, bienveillance et régularité. Le spam et les fausses promesses = BAN définitif ! 🏆",
        explanationTranslations: { en: "Authenticity, kindness and consistency. Spam and false promises = permanent BAN! 🏆" },
      },
    ],
  },
];

/**
 * Seed function to populate training modules
 */
export async function seedInfluencerTrainingModules(
  createdBy: string
): Promise<{ success: boolean; modulesCreated: number; errors: string[] }> {
  const db = getFirestore();
  const errors: string[] = [];
  let modulesCreated = 0;

  for (const moduleData of INFLUENCER_TRAINING_MODULES) {
    try {
      // Check if module with same title already exists
      const existingQuery = await db
        .collection("influencer_training_modules")
        .where("title", "==", moduleData.title)
        .limit(1)
        .get();

      if (!existingQuery.empty) {
        console.log(`Module "${moduleData.title}" already exists, skipping...`);
        continue;
      }

      // Create new module
      const moduleRef = db.collection("influencer_training_modules").doc();
      const module: InfluencerTrainingModule = {
        id: moduleRef.id,
        ...moduleData,
        slides: moduleData.slides.map((slide, index) => ({
          id: `slide_${index + 1}`,
          ...slide,
        })),
        quizQuestions: moduleData.quizQuestions.map((q, index) => ({
          order: index + 1,
          ...q,
        })),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy,
      };

      await moduleRef.set(module);
      modulesCreated++;
      console.log(`Created module: ${moduleData.title}`);
    } catch (error) {
      const errorMsg = `Failed to create module "${moduleData.title}": ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  return {
    success: errors.length === 0,
    modulesCreated,
    errors,
  };
}
