import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import { Globe, Plus, Edit, Trash2, Save, X, Eye, CheckCircle, AlertCircle, Database, Loader2 } from 'lucide-react';
import {
  FAQ,
  SUPPORTED_LANGUAGES,
  FAQ_CATEGORIES,
  listFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  getFirstAvailableTranslation,
  getFirstAvailableLanguageCode,
  translateFAQToAllLanguages,
  FAQInput
} from '../../services/faq';
import { initializeFAQs, resetAndInitializeFAQs, PREDEFINED_FAQS } from '../../services/faqInit';

const AdminFAQs: React.FC = () => {
  const { user } = useAuth();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState<boolean>(false);
  const [tagsInput, setTagsInput] = useState<string>('');
  const [translating, setTranslating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null });
  const [initializing, setInitializing] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Single language form data (source language - auto-detected)
  const [questionText, setQuestionText] = useState<string>('');
  const [answerText, setAnswerText] = useState<string>('');

  const [formData, setFormData] = useState<Partial<FAQ>>({
    question: {},
    answer: {},
    category: 'general',
    slug: {},
    order: 0,
    isActive: true,
    isFooter: false,
    tags: []
  });

  // Initialize predefined FAQs
  const handleInitializeFAQs = async () => {
    if (initializing) return;

    const confirmInit = window.confirm(
      `Voulez-vous initialiser ${PREDEFINED_FAQS.all.length} FAQ prédéfinies ?\n\nLes FAQ existantes ne seront pas modifiées.`
    );
    if (!confirmInit) return;

    try {
      setInitializing(true);
      setSuccessMessage('');
      setErrorMessage('');

      const result = await initializeFAQs();

      if (result.success) {
        setSuccessMessage(
          `Initialisation terminée ! ${result.created} FAQ créées, ${result.skipped} ignorées (déjà existantes).`
        );
      } else {
        setErrorMessage(
          `Initialisation partielle : ${result.created} créées, ${result.skipped} ignorées. Erreurs : ${result.errors.length}`
        );
      }

      // Recharger les FAQ
      const updatedFAQs = await listFAQs();
      setFaqs(updatedFAQs);
    } catch (error) {
      console.error('[handleInitializeFAQs] Error:', error);
      setErrorMessage('Erreur lors de l\'initialisation des FAQ.');
    } finally {
      setInitializing(false);
    }
  };

  // Reset and reinitialize FAQs (fixes slug translations)
  const handleResetFAQs = async () => {
    if (resetting) return;

    const confirmReset = window.confirm(
      `⚠️ ATTENTION: Cette action va:\n\n` +
      `1. SUPPRIMER toutes les FAQ existantes\n` +
      `2. Recréer ${PREDEFINED_FAQS.all.length} FAQ avec traductions complètes\n\n` +
      `Les slugs seront traduits dans chaque langue pour le SEO.\n\n` +
      `Cette opération peut prendre plusieurs minutes.\n\n` +
      `Continuer ?`
    );
    if (!confirmReset) return;

    try {
      setResetting(true);
      setSuccessMessage('');
      setErrorMessage('');

      const result = await resetAndInitializeFAQs();

      if (result.success) {
        setSuccessMessage(
          `Reset terminé ! ${result.deleted} FAQ supprimées, ${result.created}/${result.total} FAQ recréées avec slugs traduits.`
        );
      } else {
        setErrorMessage(
          `Reset partiel: ${result.created}/${result.total} FAQ créées. Erreurs: ${result.errors.length}`
        );
      }

      // Recharger les FAQ
      const updatedFAQs = await listFAQs();
      setFaqs(updatedFAQs);
    } catch (error) {
      console.error('[handleResetFAQs] Error:', error);
      setErrorMessage('Erreur lors du reset des FAQ.');
    } finally {
      setResetting(false);
    }
  };

  // Auto-dismiss success messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Auto-dismiss error messages
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 7000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Load FAQs
  useEffect(() => {
    const loadFAQsData = async () => {
      try {
        const faqList = await listFAQs();
        setFaqs(faqList);
      } catch (error) {
        console.error('Error loading FAQs:', error);
        setErrorMessage('Error loading FAQs. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    loadFAQsData();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    if (!questionText.trim() || !answerText.trim()) {
      setErrorMessage('Please provide both a question and an answer.');
      return;
    }

    try {
      setTranslating(true);

      // Translate to all languages (auto-detect source language)
      const { question, answer, slug } = await translateFAQToAllLanguages(
        questionText.trim(),
        answerText.trim()
      );

      // Convert tags input string to array
      const tagsArray = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const faqData: FAQInput = {
        question,
        answer,
        slug,
        category: formData.category || 'general',
        order: formData.order || 0,
        isActive: formData.isActive ?? true,
        isFooter: formData.isFooter ?? false,
        tags: tagsArray,
      };

      if (editingId) {
        await updateFAQ(editingId, faqData);
      } else {
        await createFAQ(faqData);
      }

      // Reset form
      setQuestionText('');
      setAnswerText('');
      setFormData({
        question: {},
        answer: {},
        category: 'general',
        slug: {},
        order: 0,
        isActive: true,
        isFooter: false,
        tags: [],
      });
      setTagsInput('');
      setEditingId(null);
      setShowNewForm(false);

      setSuccessMessage(
        editingId ? 'FAQ updated successfully!' : 'FAQ created and translated successfully!'
      );

      // Reload FAQs
      const updatedFAQs = await listFAQs();
      setFaqs(updatedFAQs);
    } catch (error) {
      console.error('Error saving FAQ:', error);
      setErrorMessage('Error saving FAQ. Please try again.');
    } finally {
      setTranslating(false);
    }
  };

  // Delete FAQ
  const handleDeleteClick = (id: string) => {
    setShowDeleteConfirm({ show: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (!showDeleteConfirm.id) return;

    try {
      await deleteFAQ(showDeleteConfirm.id);
      setFaqs(faqs.filter((f) => f.id !== showDeleteConfirm.id));
      setSuccessMessage('FAQ deleted successfully!');
      setShowDeleteConfirm({ show: false, id: null });
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      setErrorMessage('Error deleting FAQ. Please try again.');
      setShowDeleteConfirm({ show: false, id: null });
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm({ show: false, id: null });
  };

  // Start editing
  const handleEdit = (faq: FAQ) => {
    setEditingId(faq.id!);
    setShowNewForm(false);
    setFormData(faq);
    setTagsInput(faq.tags?.join(', ') || '');
    // Load the first available language (prefer French, then English, then any)
    const detectedLang = getFirstAvailableLanguageCode(faq.question, 'fr');
    setQuestionText(faq.question[detectedLang] || faq.question['fr'] || faq.question['en'] || '');
    setAnswerText(faq.answer[detectedLang] || faq.answer['fr'] || faq.answer['en'] || '');
  };

  // Show new FAQ form
  const handleNewFAQ = () => {
    setEditingId(null);
    setShowNewForm(true);
    setQuestionText('');
    setAnswerText('');
    setFormData({
      question: {},
      answer: {},
      category: 'general',
      slug: {},
      order: 0,
      isActive: true,
      tags: []
    });
    setTagsInput('');
  };

  // Cancel editing/new
  const handleCancel = () => {
    setEditingId(null);
    setShowNewForm(false);
    setQuestionText('');
    setAnswerText('');
    setFormData({
      question: {},
      answer: {},
      category: 'general',
      slug: {},
      order: 0,
      isActive: true,
      tags: []
    });
    setTagsInput('');
    setSuccessMessage('');
    setErrorMessage('');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center justify-between shadow-sm">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span>{successMessage}</span>
          </div>
          <button 
            onClick={() => setSuccessMessage('')} 
            className="text-green-600 hover:text-green-800 transition-colors"
            aria-label="Close notification"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between shadow-sm">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{errorMessage}</span>
          </div>
          <button 
            onClick={() => setErrorMessage('')} 
            className="text-red-600 hover:text-red-800 transition-colors"
            aria-label="Close notification"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this FAQ? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Manage FAQs</h1>
        {!editingId && !showNewForm && (
          <div className="flex items-center gap-3">
            {/* Initialize FAQs Button */}
            <button
              onClick={handleInitializeFAQs}
              disabled={initializing || resetting}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Initialiser ${PREDEFINED_FAQS.all.length} FAQ prédéfinies`}
            >
              {initializing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Initialisation...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5" />
                  Init FAQ ({PREDEFINED_FAQS.all.length})
                </>
              )}
            </button>
            {/* Reset FAQs Button - Fixes slug translations */}
            <button
              onClick={handleResetFAQs}
              disabled={initializing || resetting}
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Supprimer et recréer toutes les FAQ avec slugs traduits"
            >
              {resetting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Reset en cours...
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5" />
                  Reset FAQ (SEO)
                </>
              )}
            </button>
            {/* New FAQ Button */}
            <button
              onClick={handleNewFAQ}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New FAQ
            </button>
          </div>
        )}
      </div>

      {/* Form Section */}
      {(editingId || showNewForm || !faqs.length) && (
        <div className="bg-white rounded-lg shadow-lg mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">
              {editingId ? 'Edit FAQ' : 'Create New FAQ'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* Info Banner */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Auto-Translation Enabled
                  </p>
                  <p className="text-xs text-blue-700">
                    Enter your question and answer in any language. The system will automatically detect the language and translate it to all 9 supported languages when you save.
                  </p>
                </div>
              </div>
            </div>

            {/* Single Question and Answer Input */}
            <div className="space-y-6">
              {/* Question Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Question
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="Enter your question in any language..."
                  required
                  disabled={translating}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Language will be auto-detected automatically
                </p>
              </div>

              {/* Answer Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Answer
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-y"
                  rows={6}
                  placeholder="Enter your answer in any language..."
                  required
                  disabled={translating}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {answerText.length} characters
                </p>
              </div>
            </div>

            {/* Common Fields */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="general">General</option>
                  <option value="payment">Payment</option>
                  <option value="billing">Billing</option>
                  <option value="calls">Calls</option>
                  <option value="account">Account</option>
                  <option value="technical">Technical</option>
                  <option value="legal">Legal</option>
                </select>
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  min="0"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="payment, billing, account"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Separate multiple tags with commas (e.g., payment, billing, account)
                </p>
              </div>

              {/* Status Checkbox */}
              <div className="space-y-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Active (visible on website)
                  </span>
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-8 flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={translating}
                className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {translating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Translating...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {editingId ? 'Update FAQ' : 'Create & Translate FAQ'}
                  </>
                )}
              </button>
              {(editingId || showNewForm) && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={translating}
                  className="flex items-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5" />
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* FAQ List */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Existing FAQs ({faqs.length})</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {faqs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No FAQs found. Create your first FAQ above.
            </div>
          ) : (
            faqs.map(faq => (
              <div key={faq.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getFirstAvailableTranslation(faq.question, 'Untitled FAQ')}
                      </h3>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {faq.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {getFirstAvailableTranslation(faq.answer, 'No answer provided')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        faq.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {faq.isActive ? '✓ Active' : '✗ Inactive'}
                      </span>
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                        Order: {faq.order}
                      </span>
                      {faq.views !== undefined && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                          <Eye className="w-3 h-3 inline mr-1" />
                          {faq.views} views
                        </span>
                      )}
                    </div>
                    {faq.tags && faq.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {faq.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(faq)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit FAQ"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(faq.id!)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete FAQ"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFAQs;

