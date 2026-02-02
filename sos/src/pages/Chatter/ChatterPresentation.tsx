/**
 * ChatterPresentation - Presentation/onboarding page before quiz
 * Shows chatter information and prepares user for the quiz
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import {
  Star,
  ArrowRight,
  CheckCircle,
  Users,
  Wallet,
  Trophy,
  Clock,
  BookOpen,
  ChevronRight,
} from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all",
  },
} as const;

const ChatterPresentation: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const [currentSlide, setCurrentSlide] = useState(0);

  const quizRoute = `/${getTranslatedRouteSlug('chatter-quiz' as RouteKey, langCode)}`;

  const slides = [
    {
      icon: <Star className="w-12 h-12" />,
      title: intl.formatMessage({ id: 'chatter.presentation.slide1.title', defaultMessage: 'Bienvenue chez les Chatters !' }),
      content: intl.formatMessage({ id: 'chatter.presentation.slide1.content', defaultMessage: 'Rejoignez les milliers d\'ambassadeurs SOS-Expat qui gagnent de l\'argent en partageant simplement un lien. 100% gratuit, sans investissement.' }),
      color: 'from-red-500 to-orange-500',
    },
    {
      icon: <Users className="w-12 h-12" />,
      title: intl.formatMessage({ id: 'chatter.presentation.slide2.title', defaultMessage: 'Simple comme 1-2-3' }),
      content: intl.formatMessage({ id: 'chatter.presentation.slide2.content', defaultMessage: '1. Trouvez des expatriés sur Facebook, WhatsApp, etc. 2. Partagez votre lien unique. 3. Gagnez $10 par client qui appelle !' }),
      color: 'from-red-500 to-pink-500',
    },
    {
      icon: <Wallet className="w-12 h-12" />,
      title: intl.formatMessage({ id: 'chatter.presentation.slide3.title', defaultMessage: 'Gagnez $10 par client !' }),
      content: intl.formatMessage({ id: 'chatter.presentation.slide3.content', defaultMessage: '$10 par client qui appelle via votre lien. PLUS $1 par appel de vos filleuls (N1) et $0.50 de leurs filleuls (N2). Recrutez 10 personnes actives = $100+/mois en passif.' }),
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: <Trophy className="w-12 h-12" />,
      title: intl.formatMessage({ id: 'chatter.presentation.slide4.title', defaultMessage: 'Bonus jusqu\'à $4,000 !' }),
      content: intl.formatMessage({ id: 'chatter.presentation.slide4.content', defaultMessage: 'Bonus de paliers : 5 filleuls=$15, 10=$35, 20=$75, 50=$250, 100=$600, 500=$4,000 ! Top 3 mensuel : commissions x2, x1.5, x1.15. Challenges hebdo : $50/$25/$10.' }),
      color: 'from-yellow-400 to-orange-500',
    },
    {
      icon: <BookOpen className="w-12 h-12" />,
      title: intl.formatMessage({ id: 'chatter.presentation.slide5.title', defaultMessage: 'Passez le quiz (5 min)' }),
      content: intl.formatMessage({ id: 'chatter.presentation.slide5.content', defaultMessage: '10 questions simples pour vérifier que vous avez compris le programme. Score minimum 85%. Vous pouvez réessayer après 6h si besoin. C\'est parti !' }),
      color: 'from-blue-500 to-indigo-500',
    },
  ];

  const quizInfo = [
    { label: intl.formatMessage({ id: 'chatter.presentation.quiz.questions', defaultMessage: '10 questions' }), icon: <BookOpen className="w-4 h-4" /> },
    { label: intl.formatMessage({ id: 'chatter.presentation.quiz.time', defaultMessage: '5 minutes' }), icon: <Clock className="w-4 h-4" /> },
    { label: intl.formatMessage({ id: 'chatter.presentation.quiz.score', defaultMessage: '85% requis' }), icon: <CheckCircle className="w-4 h-4" /> },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleStartQuiz = () => {
    navigate(quizRoute);
  };

  const currentSlideData = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-red-50/20 to-white dark:from-gray-950 dark:via-gray-950 dark:to-black flex flex-col">
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 py-6">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx === currentSlide
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 w-6'
                  : idx < currentSlide
                    ? 'bg-red-300 dark:bg-red-700'
                    : 'bg-gray-300 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Slide Content */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-md w-full text-center">
            {/* Icon */}
            <div className={`w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br ${currentSlideData.color} flex items-center justify-center text-white shadow-lg`}>
              {currentSlideData.icon}
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {currentSlideData.title}
            </h1>

            {/* Content */}
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-8">
              {currentSlideData.content}
            </p>

            {/* Quiz Info (on last slide) */}
            {isLastSlide && (
              <div className="flex justify-center gap-4 mb-8">
                {quizInfo.map((info, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-white/10 rounded-lg">
                    <span className="text-red-500">{info.icon}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{info.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="p-6 pb-10">
          <div className="max-w-md mx-auto">
            {isLastSlide ? (
              <button
                onClick={handleStartQuiz}
                className={`${UI.button.primary} w-full py-4 text-lg flex items-center justify-center gap-3`}
              >
                <FormattedMessage id="chatter.presentation.startQuiz" defaultMessage="Commencer le quiz" />
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentSlide(slides.length - 1)}
                  className="flex-1 py-4 text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <FormattedMessage id="common.skip" defaultMessage="Passer" />
                </button>
                <button
                  onClick={handleNext}
                  className={`${UI.button.primary} flex-1 py-4 flex items-center justify-center gap-2`}
                >
                  <FormattedMessage id="common.next" defaultMessage="Suivant" />
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChatterPresentation;
