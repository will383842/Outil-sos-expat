import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  CheckCircle, 
  User, 
  Globe, 
  MapPin, 
  MessageCircle, 
  Clock, 
  Bot,
  Brain,
  Zap,
  Send,
  Sparkles,
  Star,
  Calendar,
  Timer,
  Phone,
  Mail,
  FileText,
  Play,
  Pause,
  Save,
  Archive,
  Activity,
  Cpu,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Share2
} from 'lucide-react';

// Types simulés
interface ClientRequest {
  id: string;
  title: string;
  description: string;
  clientFirstName: string;
  clientLastName: string;
  nationality: string;
  language: string;
  country: string;
  expertRole: string;
  scheduledTime: Date;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  clientEmail?: string;
  clientPhone?: string;
  estimatedDuration?: number;
}

interface GPTResponse {
  id: string;
  initialResponse: string;
  confidence: number;
  tokensUsed: number;
  processingTime: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokensUsed?: number;
}

export default function RequestDetail() {
  // Données simulées pour l'outil interne d'équipe
  const request: ClientRequest = {
    id: '1',
    title: 'Problème configuration API OpenAI',
    description: 'Un utilisateur externe a contacté notre support concernant l\'intégration de l\'API OpenAI dans son application. Il rencontre des erreurs 401 et n\'arrive pas à configurer correctement les clés d\'authentification.',
    clientFirstName: 'Jean',
    clientLastName: 'Dubois',
    nationality: 'Française',
    language: 'Français',
    country: 'France',
    expertRole: 'support technique API',
    scheduledTime: new Date('2025-08-03T14:00:00'),
    status: 'in_progress',
    priority: 'high',
    clientEmail: 'jean.dubois@startup-tech.fr',
    clientPhone: '+33 1 23 45 67 89',
    estimatedDuration: 30
  };

  const onBack = () => {
    console.log('Retour vers la liste');
  };

  const [gptResponse] = useState<GPTResponse>({
    id: '1',
    initialResponse: `Analyse du problème API OpenAI pour Jean Dubois :

**Diagnostic technique** :
Le problème d'erreur 401 indique généralement une authentification incorrecte. Voici les causes les plus probables :

**1. Clé API invalide ou expirée** :
- Vérifier que la clé commence par "sk-"
- Confirmer qu'elle n'a pas été révoquée
- Tester avec une nouvelle clé si nécessaire

**2. Headers de requête incorrects** :
\`\`\`
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
\`\`\`

**3. Limites de quota** :
- Vérifier le plan de facturation OpenAI
- Contrôler les limites de rate limiting
- Examiner l'usage actuel vs. limites

**Solution recommandée** :
1. Régénérer une nouvelle clé API
2. Vérifier l'implémentation du header Authorization
3. Tester avec curl pour isoler le problème
4. Implémenter la gestion d'erreurs appropriée

**Code exemple** :
\`\`\`javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: {
    'Authorization': 'Bearer ' + apiKey,
    'Content-Type': 'application/json'
  },
  method: 'POST',
  body: JSON.stringify(payload)
});
\`\`\`

Cette approche devrait résoudre le problème d'authentification rencontré.`,
    confidence: 94,
    tokensUsed: 387,
    processingTime: 1.8
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'user',
      content: 'Le client dit avoir testé avec Postman et ça fonctionne, mais pas dans son code React. Que peut-on vérifier ?',
      timestamp: new Date('2025-08-03T14:15:00'),
      tokensUsed: 18
    },
    {
      id: '2',
      role: 'assistant',
      content: 'Si Postman fonctionne mais pas React, c\'est probablement un problème CORS ou d\'environnement :\n\n**Problèmes courants React + OpenAI** :\n• CORS : Les appels directs depuis le navigateur sont bloqués\n• Variables d\'environnement : Vérifier process.env.REACT_APP_OPENAI_KEY\n• Exposition de clé : Ne JAMAIS mettre la clé côté client\n\n**Solution recommandée** :\n1. Créer une API backend (Node.js/Express)\n2. Faire les appels OpenAI depuis le serveur\n3. React appelle votre API backend\n\n**Architecture sécurisée** :\nReact → API Backend → OpenAI API\n\nCela évite l\'exposition de la clé et les problèmes CORS.',
      timestamp: new Date('2025-08-03T14:15:30'),
      tokensUsed: 124
    },
    {
      id: '3',
      role: 'user',
      content: 'Il utilise Next.js avec des API routes. Comment peut-on déboguer les appels côté serveur ?',
      timestamp: new Date('2025-08-03T14:18:00'),
      tokensUsed: 19
    },
    {
      id: '4',
      role: 'assistant',
      content: 'Parfait ! Next.js API routes c\'est la bonne approche. Voici comment déboguer :\n\n**1. Logs détaillés dans /api/openai.js** :\n```javascript\nconsole.log(\'API Key exists:\', !!process.env.OPENAI_API_KEY);\nconsole.log(\'Request headers:\', req.headers);\nconsole.log(\'Request body:\', req.body);\n```\n\n**2. Vérifications essentielles** :\n• Fichier .env.local avec OPENAI_API_KEY=sk-...\n• Redémarrer le serveur après ajout .env\n• Tester l\'API route directement : /api/openai\n\n**3. Gestion d\'erreurs** :\n```javascript\ntry {\n  const response = await openai.chat.completions.create(...);\n  console.log(\'OpenAI response:\', response);\n} catch (error) {\n  console.error(\'OpenAI error:\', error.response?.data);\n  return res.status(500).json({ error: error.message });\n}\n```\n\n**4. Test curl** de l\'API route Next.js :\n```bash\ncurl -X POST http://localhost:3000/api/openai -H "Content-Type: application/json" -d \'{"message":"test"}\'\n```\n\nCela permettra d\'identifier précisément où se situe le problème.',
      timestamp: new Date('2025-08-03T14:18:45'),
      tokensUsed: 186
    }
  ]);

  // --- Persistence locale des messages (sans créer de nouveaux fichiers) ---
  // clé : chat_history_{requestId} ou 'chat_history_global' si absent
  useEffect(() => {
    try {
      const key = (typeof request !== 'undefined' && request?.id) ? `chat_history_${request.id}` : 'chat_history_global';
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        // reconvertir timestamps s'ils sont en string
        const normalized = parsed.map(m => ({ ...m, timestamp: m.timestamp ? new Date(m.timestamp) : new Date() }));
        setChatMessages(normalized);
      }
    } catch (e) {
      console.warn('Erreur lecture chat localStorage', e);
    }
  }, []); // charge au montage

  useEffect(() => {
    try {
      const key = (typeof request !== 'undefined' && request?.id) ? `chat_history_${request.id}` : 'chat_history_global';
      localStorage.setItem(key, JSON.stringify(chatMessages));
    } catch (e) {
      console.warn('Erreur écriture chat localStorage', e);
    }
  }, [chatMessages]);


  const [newMessage, setNewMessage] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showFullResponse, setShowFullResponse] = useState(false);
  const [callDuration, setCallDuration] = useState(1247); // 20:47
  const [isCallActive, setIsCallActive] = useState(true);

  // Timer pour la durée d'appel
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setIsLoadingChat(true);

    // Ajouter le message utilisateur
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: newMessage,
      timestamp: new Date(),
      tokensUsed: Math.ceil(newMessage.length / 4),
    };
    setChatMessages(prev => [...prev, userMessage]);

    try {
      const convId = (request && (request.id || request.requestId)) ? (request.id || request.requestId) : 'demo';
      const { callChat } = await import('../services/functionsClient');
      const reply = await callChat(convId, newMessage);

      const aiMessage: ChatMessage = {
        id: Date.now().toString() + 'a',
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
        tokensUsed: Math.ceil(reply.length / 4),
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (e) {
      console.warn('Backend chat failed, fallback to local simulation', e);
      const fallback = "Je n’ai pas pu joindre le serveur pour le moment. Voici une suggestion provisoire basée sur votre message :\n\n- Étape 1...\n- Étape 2...\n\nUn agent va reprendre rapidement.";
      const aiMessage: ChatMessage = {
        id: Date.now().toString() + 'b',
        role: 'assistant',
        content: fallback,
        timestamp: new Date(),
        tokensUsed: Math.ceil(fallback.length / 4),
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } finally {
      setNewMessage('');
      setIsLoadingChat(false);
    }
  };
    
    setChatMessages(prev => [...prev, userMessage]);
    try {
      // If a conversation id exists, call backend; else fallback to mock
      const convId = request.id || request.requestId || 'demo';
      const { callChat } = await import('../services/functionsClient');
      const reply = await callChat(convId, newMessage);
      const aiMessage: ChatMessage = { id: Date.now().toString()+"a", role: 'assistant', content: reply, timestamp: new Date(), tokensUsed: Math.ceil(reply.length/4) };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (e) {
      console.warn('Backend chat failed, falling back to mock', e);
      // fallback to existing mock flow below
    }
    setNewMessage('');

    // Simuler la réponse IA
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Excellente question concernant "${newMessage}". En tant qu'expert en visa et immigration, voici ce que je recommande :\n\n• **Point clé 1** : La réglementation récente stipule que...\n• **Point clé 2** : Pour votre situation spécifique d'étudiante espagnole...\n• **Point clé 3** : Les délais à prévoir sont généralement...\n\nCette information est basée sur les dernières directives officielles. Souhaitez-vous que je détaille l'un de ces aspects ?`,
        timestamp: new Date(),
        tokensUsed: 124
      };
      
      setChatMessages(prev => [...prev, aiResponse]);
      setIsLoadingChat(false);
    }, 2000);
  };

  const handleCompleteRequest = async () => {
    setIsCompleting(true);
    setIsCallActive(false);
    
    // Simulation de finalisation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Demande terminée et archivée');
    // onBack(); // Commenté pour la démo
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    console.log('Copié dans le presse-papier');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'from-red-500 to-pink-500';
      case 'high': return 'from-orange-500 to-red-500';
      case 'medium': return 'from-blue-500 to-indigo-500';
      case 'low': return 'from-emerald-500 to-teal-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* En-tête moderne avec glassmorphism */}
      <header className="backdrop-blur-xl bg-white/40 border-b border-white/20 sticky top-0 z-40">
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-3 bg-white/70 border border-white/30 rounded-2xl hover:bg-white/90 transition-all duration-300 hover:scale-105"
              >
                <ArrowLeft size={20} className="text-slate-700" />
              </button>
              
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 bg-gradient-to-br ${getPriorityColor(request.priority)} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <span className="text-white font-black text-lg">
                    {request.clientFirstName.charAt(0)}{request.clientLastName.charAt(0)}
                  </span>
                </div>
                
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-slate-800">
                    {request.clientFirstName} {request.clientLastName}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{request.scheduledTime.toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{request.scheduledTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Indicateur d'appel en cours */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-emerald-100 px-4 py-2 rounded-2xl">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-emerald-700 font-bold">{formatDuration(callDuration)}</span>
              </div>
              
              <button
                onClick={() => setIsCallActive(!isCallActive)}
                className={`p-3 rounded-2xl transition-all duration-300 ${
                  isCallActive 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                }`}
              >
                {isCallActive ? <Pause size={20} /> : <Play size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-6 space-y-6">
        {/* Informations client modernisées */}
        <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
              Informations Demande
            </h2>
            
            <div className="flex gap-2">
              <button className="p-2 bg-white/70 border border-white/30 rounded-xl hover:bg-white/90 transition-colors">
                <Mail size={16} className="text-slate-600" />
              </button>
              <button className="p-2 bg-white/70 border border-white/30 rounded-xl hover:bg-white/90 transition-colors">
                <Phone size={16} className="text-slate-600" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl">
              <Globe size={20} className="text-purple-600" />
              <div>
                <p className="text-sm font-semibold text-purple-800">Contact</p>
                <p className="font-bold text-purple-900">{request.nationality}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl">
              <MessageCircle size={20} className="text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Langue</p>
                <p className="font-bold text-blue-900">{request.language}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl">
              <MapPin size={20} className="text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Pays</p>
                <p className="font-bold text-emerald-900">{request.country}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl">
              <Star size={20} className="text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Type Support</p>
                <p className="font-bold text-amber-900 capitalize">{request.expertRole}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-6 bg-gradient-to-br from-slate-50 to-white rounded-2xl border-2 border-slate-200">
            <h3 className="text-lg font-black text-slate-800 mb-3 flex items-center gap-2">
              <FileText size={18} />
              {request.title}
            </h3>
            <p className="text-slate-700 leading-relaxed text-lg">
              {request.description}
            </p>
          </div>
        </div>

        {/* Réponse IA avec métriques */}
        <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-6 md:p-8 border-b border-white/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Brain size={20} className="text-white" />
                </div>
                Réponse IA Premium
              </h2>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(gptResponse.initialResponse)}
                  className="p-2 bg-white/70 border border-white/30 rounded-xl hover:bg-white/90 transition-colors"
                  title="Copier"
                >
                  <Copy size={16} className="text-slate-600" />
                </button>
                <button className="p-2 bg-white/70 border border-white/30 rounded-xl hover:bg-white/90 transition-colors">
                  <Share2 size={16} className="text-slate-600" />
                </button>
              </div>
            </div>

            {/* Métriques IA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl">
                <CheckCircle size={20} className="text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Confiance</p>
                  <p className="font-black text-emerald-900">{gptResponse.confidence}%</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl">
                <Cpu size={20} className="text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Tokens</p>
                  <p className="font-black text-blue-900">{gptResponse.tokensUsed}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl">
                <Zap size={20} className="text-purple-600" />
                <div>
                  <p className="text-sm font-semibold text-purple-800">Temps</p>
                  <p className="font-black text-purple-900">{gptResponse.processingTime}s</p>
                </div>
              </div>
            </div>

            {/* Contenu de la réponse */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6">
              <div className={`text-slate-700 leading-relaxed text-lg whitespace-pre-line ${!showFullResponse ? 'line-clamp-6' : ''}`}>
                {gptResponse.initialResponse}
              </div>
              
              <button
                onClick={() => setShowFullResponse(!showFullResponse)}
                className="mt-4 flex items-center gap-2 text-purple-600 hover:text-purple-800 font-semibold transition-colors"
              >
                {showFullResponse ? (
                  <>
                    <ChevronUp size={16} />
                    Réduire
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    Voir plus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Chat IA moderne */}
        <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-white/30">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <MessageCircle size={20} className="text-white" />
              </div>
              Discussion Interactive
            </h2>
          </div>
          
          {/* Messages */}
          <div className="max-h-96 overflow-y-auto p-6 space-y-4">
            {chatMessages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-4 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
                    : 'bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 text-slate-800'
                }`}>
                  <div className="whitespace-pre-line leading-relaxed">
                    {message.content}
                  </div>
                  <div className={`flex items-center justify-between mt-2 text-xs ${
                    message.role === 'user' ? 'text-indigo-100' : 'text-slate-500'
                  }`}>
                    <span>{message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    {message.tokensUsed && (
                      <span className="flex items-center gap-1">
                        <Cpu size={10} />
                        {message.tokensUsed}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoadingChat && (
              <div className="flex justify-start">
                <div className="bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={16} className="animate-spin text-indigo-500" />
                    <span className="text-slate-600">L'IA réfléchit...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Zone de saisie */}
          <div className="p-6 border-t border-white/30">
            <div className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 px-4 py-3 bg-white/70 border-2 border-white/50 rounded-2xl backdrop-blur-sm focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-300 transition-all duration-300 text-slate-800 placeholder-slate-500 font-medium"
                placeholder="Demander des précisions à l'IA pour aider le client..."
                disabled={isLoadingChat}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoadingChat || !newMessage.trim()}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 font-bold flex items-center gap-2 shadow-lg hover:scale-105"
              >
                <Send size={18} />
                Envoyer
              </button>
            </div>
          </div>
        </div>

        {/* Actions finales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => console.log('Sauvegarde...')}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 font-bold shadow-xl hover:scale-105"
          >
            <Save size={20} />
            Sauvegarder la session
          </button>

          <button
            onClick={handleCompleteRequest}
            disabled={isCompleting}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl hover:from-emerald-600 hover:to-green-600 transition-all duration-300 font-bold shadow-xl hover:scale-105 disabled:opacity-50"
          >
            {isCompleting ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                Finalisation...
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                Terminer le support
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}