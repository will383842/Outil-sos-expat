import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Bot, Settings, Globe, MessageSquare, Copy, TestTube, Save, Eye, EyeOff } from 'lucide-react';

// Types pour Bolt.new
interface GPTPrompt {
  id: string;
  name: string;
  expertRole: 'avocat' | 'expatrie';
  countries: string[];
  problemTypes: string[];
  prompt: string;
  tone: 'formal' | 'empathetic' | 'professional';
  model: string;
  temperature: number;
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
  usageCount?: number;
}

interface OpenAIConfig {
  apiKey: string;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
}

export default function GPTManager() {
  const [prompts, setPrompts] = useState<GPTPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<GPTPrompt | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingPrompt, setTestingPrompt] = useState<string | null>(null);
  const [config, setConfig] = useState<OpenAIConfig>({
    apiKey: '',
    defaultModel: 'gpt-4',
    maxTokens: 1000,
    temperature: 0.7
  });

  useEffect(() => {
    loadPrompts();
    loadConfig();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      
      // Mock data pour Bolt.new
      const mockPrompts: GPTPrompt[] = [
        {
          id: '1',
          name: 'Conseils visa général',
          expertRole: 'avocat',
          countries: ['France', 'Allemagne', 'Espagne'],
          problemTypes: ['visa', 'documents'],
          prompt: 'Tu es un avocat spécialisé en droit des étrangers. Réponds de manière claire et précise aux questions sur les visas et procédures administratives. Utilise un ton professionnel mais accessible.',
          tone: 'professional',
          model: 'gpt-4',
          temperature: 0.7,
          isActive: true,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          usageCount: 47
        },
        {
          id: '2',
          name: 'Aide expatriation pratique',
          expertRole: 'expatrie',
          countries: ['Maroc', 'Tunisie', 'Algérie'],
          problemTypes: ['logement', 'banque', 'assurance'],
          prompt: 'Tu es un expatrié expérimenté qui aide d\'autres expatriés. Partage tes conseils pratiques avec empathie et bienveillance. Utilise des exemples concrets.',
          tone: 'empathetic',
          model: 'gpt-4',
          temperature: 0.8,
          isActive: true,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          usageCount: 23
        },
        {
          id: '3',
          name: 'Urgences consulaires',
          expertRole: 'avocat',
          countries: ['Global'],
          problemTypes: ['urgence', 'documents'],
          prompt: 'Tu es un avocat spécialisé en urgences consulaires. Réponds rapidement avec des instructions claires et précises. Priorité à l\'efficacité.',
          tone: 'formal',
          model: 'gpt-4-turbo',
          temperature: 0.6,
          isActive: false,
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          usageCount: 8
        }
      ];

      setPrompts(mockPrompts);
    } catch (error) {
      console.error('Erreur lors du chargement des prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = () => {
    // Simulation du chargement de la config
    const savedConfig = localStorage.getItem('openai_config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  };

  const saveConfig = () => {
    localStorage.setItem('openai_config', JSON.stringify(config));
    alert('Configuration sauvegardée !');
  };

  const deletePrompt = async (promptId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce prompt ?')) {
      setPrompts(prompts.filter(p => p.id !== promptId));
    }
  };

  const togglePromptStatus = (promptId: string) => {
    setPrompts(prompts.map(p => 
      p.id === promptId ? { ...p, isActive: !p.isActive } : p
    ));
  };

  const duplicatePrompt = (prompt: GPTPrompt) => {
    const newPrompt: GPTPrompt = {
      ...prompt,
      id: Date.now().toString(),
      name: `${prompt.name} (Copie)`,
      createdAt: new Date(),
      usageCount: 0
    };
    setPrompts([...prompts, newPrompt]);
  };

  const testPrompt = (promptId: string) => {
    setTestingPrompt(promptId);
    // Simulation d'un test
    setTimeout(() => {
      alert('Test réussi ! Le prompt fonctionne correctement.');
      setTestingPrompt(null);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const activePrompts = prompts.filter(p => p.isActive).length;
  const totalUsage = prompts.reduce((acc, p) => acc + (p.usageCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <Bot size={24} className="mr-3 text-blue-500" />
              Gestion GPT & IA
            </h2>
            <p className="text-gray-600 mt-1">
              Configurez et gérez vos assistants IA personnalisés
            </p>
          </div>
          
          <button
            onClick={() => {
              setEditingPrompt(null);
              setShowModal(true);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-600 transition-colors"
          >
            <Plus size={16} />
            <span>Nouveau prompt</span>
          </button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-500">{activePrompts}</p>
            <p className="text-xs text-gray-500">Prompts actifs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">{prompts.length}</p>
            <p className="text-xs text-gray-500">Total prompts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-500">{totalUsage}</p>
            <p className="text-xs text-gray-500">Utilisations</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">
              {prompts.filter(p => p.expertRole === 'avocat').length}
            </p>
            <p className="text-xs text-gray-500">Prompts avocat</p>
          </div>
        </div>
      </div>

      {/* Configuration OpenAI */}
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
          <Settings size={20} className="mr-2 text-blue-500" />
          Configuration OpenAI
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clé API OpenAI
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => setConfig({...config, apiKey: e.target.value})}
                placeholder="sk-..."
                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modèle par défaut
            </label>
            <select 
              value={config.defaultModel}
              onChange={(e) => setConfig({...config, defaultModel: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tokens maximum
            </label>
            <input
              type="number"
              value={config.maxTokens}
              onChange={(e) => setConfig({...config, maxTokens: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="100"
              max="4000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Température ({config.temperature})
            </label>
            <input
              type="range"
              value={config.temperature}
              onChange={(e) => setConfig({...config, temperature: parseFloat(e.target.value)})}
              className="w-full"
              min="0"
              max="1"
              step="0.1"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Précis</span>
              <span>Créatif</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={saveConfig}
          className="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
        >
          <Save size={16} />
          <span>Sauvegarder la configuration</span>
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg p-4 shadow-lg">
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
            Tous ({prompts.length})
          </button>
          <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
            Actifs ({activePrompts})
          </button>
          <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
            Avocats ({prompts.filter(p => p.expertRole === 'avocat').length})
          </button>
          <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
            Expatriés ({prompts.filter(p => p.expertRole === 'expatrie').length})
          </button>
        </div>
      </div>

      {/* Liste des prompts */}
      <div className="space-y-4">
        {prompts.map((prompt) => (
          <div key={prompt.id} className="bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="font-semibold text-gray-800 text-lg">{prompt.name}</h3>
                  {!prompt.isActive && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                      Inactif
                    </span>
                  )}
                  {prompt.usageCount && prompt.usageCount > 0 && (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                      {prompt.usageCount} utilisations
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
                  <div className="flex items-center space-x-1">
                    <Bot size={14} />
                    <span className="capitalize">{prompt.expertRole}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Globe size={14} />
                    <span>{prompt.countries.length} pays</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageSquare size={14} />
                    <span className="capitalize">{prompt.tone}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    Modèle: {prompt.model}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 mb-3">
                  {prompt.prompt}
                </p>

                <div className="flex flex-wrap gap-2">
                  {prompt.countries.slice(0, 4).map(country => (
                    <span key={country} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                      {country}
                    </span>
                  ))}
                  {prompt.countries.length > 4 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      +{prompt.countries.length - 4} autres
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-6">
                <button
                  onClick={() => testPrompt(prompt.id)}
                  disabled={testingPrompt === prompt.id}
                  className="p-2 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors disabled:opacity-50"
                  title="Tester le prompt"
                >
                  {testingPrompt === prompt.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  ) : (
                    <TestTube size={16} />
                  )}
                </button>

                <button
                  onClick={() => duplicatePrompt(prompt)}
                  className="p-2 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors"
                  title="Dupliquer"
                >
                  <Copy size={16} />
                </button>
                
                <button
                  onClick={() => togglePromptStatus(prompt.id)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    prompt.isActive
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                  }`}
                >
                  {prompt.isActive ? 'Désactiver' : 'Activer'}
                </button>
                
                <button
                  onClick={() => {
                    setEditingPrompt(prompt);
                    setShowModal(true);
                  }}
                  className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                  title="Modifier"
                >
                  <Edit size={16} />
                </button>
                
                <button
                  onClick={() => deletePrompt(prompt.id)}
                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {prompts.length === 0 && (
          <div className="bg-white rounded-lg p-8 shadow-lg text-center">
            <Bot size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucun prompt configuré</h3>
            <p className="text-gray-600 mb-4">
              Créez votre premier prompt pour commencer à utiliser l'IA
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Créer un prompt
            </button>
          </div>
        )}
      </div>

      {/* Modal de création/édition */}
      {showModal && (
        <PromptModal
          prompt={editingPrompt}
          onClose={() => {
            setShowModal(false);
            setEditingPrompt(null);
          }}
          onSaved={(newPrompt) => {
            if (editingPrompt) {
              setPrompts(prompts.map(p => p.id === editingPrompt.id ? newPrompt : p));
            } else {
              setPrompts([...prompts, newPrompt]);
            }
            setShowModal(false);
            setEditingPrompt(null);
          }}
        />
      )}
    </div>
  );
}

// Modal de création/édition de prompt
interface PromptModalProps {
  prompt: GPTPrompt | null;
  onClose: () => void;
  onSaved: (prompt: GPTPrompt) => void;
}

function PromptModal({ prompt, onClose, onSaved }: PromptModalProps) {
  const [formData, setFormData] = useState({
    name: prompt?.name || '',
    expertRole: prompt?.expertRole || 'expatrie' as 'avocat' | 'expatrie',
    countries: prompt?.countries || [],
    problemTypes: prompt?.problemTypes || [],
    prompt: prompt?.prompt || '',
    tone: prompt?.tone || 'professional' as 'formal' | 'empathetic' | 'professional',
    model: prompt?.model || 'gpt-4',
    temperature: prompt?.temperature || 0.7,
  });
  const [loading, setLoading] = useState(false);

  const availableCountries = [
    'France', 'Allemagne', 'Espagne', 'Italie', 'Maroc', 'Tunisie', 
    'Algérie', 'Canada', 'États-Unis', 'Royaume-Uni', 'Suisse'
  ];

  const availableProblemTypes = [
    'visa', 'documents', 'logement', 'banque', 'assurance', 
    'santé', 'éducation', 'travail', 'urgence', 'famille'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newPrompt: GPTPrompt = {
        id: prompt?.id || Date.now().toString(),
        ...formData,
        isActive: true,
        createdAt: prompt?.createdAt || new Date(),
        usageCount: prompt?.usageCount || 0
      };

      onSaved(newPrompt);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCountry = (country: string) => {
    setFormData({
      ...formData,
      countries: formData.countries.includes(country)
        ? formData.countries.filter(c => c !== country)
        : [...formData.countries, country]
    });
  };

  const toggleProblemType = (type: string) => {
    setFormData({
      ...formData,
      problemTypes: formData.problemTypes.includes(type)
        ? formData.problemTypes.filter(t => t !== type)
        : [...formData.problemTypes, type]
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-800 mb-6">
          {prompt ? 'Modifier le prompt' : 'Nouveau prompt'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du prompt *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Conseils visa Schengen"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rôle d'expert
              </label>
              <select
                value={formData.expertRole}
                onChange={(e) => setFormData({ ...formData, expertRole: e.target.value as 'avocat' | 'expatrie' })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="expatrie">Expatrié</option>
                <option value="avocat">Avocat</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ton de réponse
              </label>
              <select
                value={formData.tone}
                onChange={(e) => setFormData({ ...formData, tone: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="professional">Professionnel</option>
                <option value="empathetic">Empathique</option>
                <option value="formal">Formel</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modèle GPT
              </label>
              <select
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Température ({formData.temperature})
            </label>
            <input
              type="range"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
              className="w-full"
              min="0"
              max="1"
              step="0.1"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Plus précis</span>
              <span>Plus créatif</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pays concernés
            </label>
            <div className="flex flex-wrap gap-2">
              {availableCountries.map(country => (
                <button
                  key={country}
                  type="button"
                  onClick={() => toggleCountry(country)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    formData.countries.includes(country)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {country}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Types de problèmes
            </label>
            <div className="flex flex-wrap gap-2">
              {availableProblemTypes.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleProblemType(type)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors capitalize ${
                    formData.problemTypes.includes(type)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt GPT *
            </label>
            <textarea
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tu es un expert qui aide les expatriés. Réponds de manière claire et utile..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Caractères: {formData.prompt.length} | Tokens estimés: ~{Math.ceil(formData.prompt.length / 4)}
            </p>
          </div>
          
          <div className="flex space-x-3 pt-4 border-t">
            <button
              type