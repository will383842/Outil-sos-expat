/**
 * ChatterTraining - Complete training center for chatters
 * 3 tabs: Comment Gagner | Formation | Ressources
 * All content is i18n-ready with FormattedMessage / intl.formatMessage
 */

import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import toast from 'react-hot-toast';
import {
  Briefcase, BookOpen, FolderOpen, Lightbulb,
  Share2, Phone, DollarSign, Crown, CheckCircle,
  ArrowRight, ArrowLeft, Award, Loader2,
  X, ChevronRight, Lock, ImageIcon, FileText, Video,
  Calculator, Users, UserPlus, MessageCircle,
  TrendingUp, Target, Globe, Zap, Gift,
  Copy, CheckCheck, ExternalLink, AlertTriangle,
} from 'lucide-react';
import ChatterDashboardLayout from '@/components/Chatter/Layout/ChatterDashboardLayout';
import SwipeTabContainer from '@/components/Chatter/Layout/SwipeTabContainer';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { useChatterTraining } from '@/hooks/useChatterTraining';
import { useChatterResources } from '@/hooks/useChatterResources';
import { copyToClipboard } from '@/utils/clipboard';
import EmptyStateCard from '@/components/Chatter/Activation/EmptyStateCard';
import { UI, SPACING } from '@/components/Chatter/designTokens';
import { useApp } from '@/contexts/AppContext';
import type {
  TrainingModuleListItem,
  ChatterTrainingModule,
  TrainingSlide,
  TrainingQuizQuestion,
  SubmitTrainingQuizResult,
  ChatterResourceFile,
  ChatterResourceText,
} from '@/types/chatter';

/** Unified resource item */
interface ResourceItem {
  id: string;
  category: string;
  type: string;
  _kind: 'file' | 'text';
  title?: string;
  name?: string;
  description?: string;
  content?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  fileUrl?: string;
  format?: string;
  size?: number;
  sizeFormatted?: string;
  dimensions?: { width: number; height: number };
}

const formatCents = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

// Revenue calculator scenarios
const REVENUE_SCENARIOS = [
  { calls: 2, label: '2' },
  { calls: 5, label: '5' },
  { calls: 10, label: '10' },
  { calls: 20, label: '20' },
  { calls: 50, label: '50' },
];

export default function ChatterTraining() {
  return (
    <ChatterDashboardLayout activeKey="training">
      <ChatterTrainingContent />
    </ChatterDashboardLayout>
  );
}

function ChatterTrainingContent() {
  const intl = useIntl();
  const { language } = useApp();
  const { dashboardData, clientShareUrl, recruitmentShareUrl, providerShareUrl } = useChatterData();
  const chatter = dashboardData?.chatter;
  const config = dashboardData?.config;

  const {
    modules,
    isLoading: trainingLoading,
    isLoadingModule,
    loadModuleContent,
    submitQuiz,
    currentModule,
    error: trainingError,
  } = useChatterTraining();

  const {
    resources: resourcesData,
    isLoading: resourcesLoading,
    fetchResources,
  } = useChatterResources();

  // Fetch resources on mount
  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSlide, setSelectedSlide] = useState(0);
  const [viewingModule, setViewingModule] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<SubmitTrainingQuizResult | null>(null);
  const [revenueSlider, setRevenueSlider] = useState(2);
  const [copiedClient, setCopiedClient] = useState(false);
  const [copiedRecruitment, setCopiedRecruitment] = useState(false);
  const [copiedProvider, setCopiedProvider] = useState(false);

  // Commission amounts from config
  const clientCallLawyer = (config?.commissionClientCallAmountLawyer ?? config?.commissionClientCallAmount ?? 500) / 100;
  const clientCallExpat = (config?.commissionClientCallAmountExpat ?? config?.commissionClientCallAmount ?? 300) / 100;
  const n1CallAmount = (config?.commissionN1CallAmount ?? 100) / 100;
  const n2CallAmount = (config?.commissionN2CallAmount ?? 50) / 100;
  const activationBonus = (config?.commissionActivationBonusAmount ?? 500) / 100;
  const recruitBonus = (config?.commissionN1RecruitBonusAmount ?? 100) / 100;
  const providerCallAmount = (config?.commissionProviderCallAmount ?? config?.commissionRecruitmentAmount ?? 500) / 100;
  const minCall = Math.min(clientCallLawyer, clientCallExpat);
  const maxCall = Math.max(clientCallLawyer, clientCallExpat);
  const callRange = minCall === maxCall ? `$${minCall}` : `$${minCall}-$${maxCall}`;

  const handleCopyClient = useCallback(async () => {
    if (!clientShareUrl) return;
    const success = await copyToClipboard(clientShareUrl);
    if (success) { setCopiedClient(true); setTimeout(() => setCopiedClient(false), 2000); toast.success(intl.formatMessage({ id: 'chatter.linkCopied', defaultMessage: 'Link copied!' })); }
  }, [clientShareUrl, intl]);

  const handleCopyRecruitment = useCallback(async () => {
    if (!recruitmentShareUrl) return;
    const success = await copyToClipboard(recruitmentShareUrl);
    if (success) { setCopiedRecruitment(true); setTimeout(() => setCopiedRecruitment(false), 2000); toast.success(intl.formatMessage({ id: 'chatter.linkCopied', defaultMessage: 'Link copied!' })); }
  }, [recruitmentShareUrl, intl]);

  const handleCopyProvider = useCallback(async () => {
    if (!providerShareUrl) return;
    const success = await copyToClipboard(providerShareUrl);
    if (success) { setCopiedProvider(true); setTimeout(() => setCopiedProvider(false), 2000); toast.success(intl.formatMessage({ id: 'chatter.linkCopied', defaultMessage: 'Link copied!' })); }
  }, [providerShareUrl, intl]);

  const handleOpenModule = useCallback(async (moduleId: string) => {
    setViewingModule(moduleId);
    setSelectedSlide(0);
    setQuizAnswers({});
    setQuizResult(null);
    await loadModuleContent(moduleId);
  }, [loadModuleContent]);

  // ══════════════════════════════════════════════════════════════
  // TAB 1: GETTING STARTED — First steps to earn money
  // ══════════════════════════════════════════════════════════════
  const gettingStartedTab = (
    <div className="space-y-4">
      {/* What is SOS-Expat */}
      <div className={`${UI.card} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-5 h-5 text-indigo-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            <FormattedMessage id="chatter.training.whatIs.title" defaultMessage="What is SOS-Expat?" />
          </h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          <FormattedMessage
            id="chatter.training.whatIs.desc"
            defaultMessage="SOS-Expat connects expatriates with lawyers and local experts by phone. When someone uses YOUR link and makes a paid call, you earn a commission automatically."
          />
        </p>
      </div>

      {/* Your 2 links explained */}
      <div className={`${UI.card} p-4`}>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
          <FormattedMessage id="chatter.training.links.title" defaultMessage="Your 3 links explained" />
        </h3>

        {/* Client link */}
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              <FormattedMessage id="chatter.training.links.client" defaultMessage="Client link" />
            </span>
            <span className="ml-auto text-sm font-black text-emerald-600 dark:text-emerald-400">{callRange}<span className="text-xs font-medium opacity-70"><FormattedMessage id="chatter.bar.perCall" defaultMessage="/call" /></span></span>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400/80 leading-relaxed">
            <FormattedMessage
              id="chatter.training.links.clientDesc"
              defaultMessage="Share this with people who need help (expatriates, immigrants). When they call a lawyer or expert through your link, you earn {amount} per call."
              values={{ amount: callRange }}
            />
          </p>
          {clientShareUrl && (
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-300 truncate bg-white/50 dark:bg-white/5 px-2 py-1.5 rounded-lg">{clientShareUrl}</code>
              <button onClick={handleCopyClient} className="shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold flex items-center gap-1">
                {copiedClient ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedClient ? intl.formatMessage({ id: 'common.copied', defaultMessage: 'Copied!' }) : intl.formatMessage({ id: 'common.copy', defaultMessage: 'Copy' })}
              </button>
            </div>
          )}
        </div>

        {/* Recruitment link */}
        <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span className="text-sm font-bold text-violet-700 dark:text-violet-300">
              <FormattedMessage id="chatter.training.links.recruitment" defaultMessage="Team recruitment link" />
            </span>
            <span className="ml-auto text-sm font-black text-violet-600 dark:text-violet-400">${n1CallAmount}<span className="text-xs font-medium opacity-70"><FormattedMessage id="chatter.bar.perCall" defaultMessage="/call" /></span></span>
          </div>
          <p className="text-xs text-violet-600 dark:text-violet-400/80 leading-relaxed">
            <FormattedMessage
              id="chatter.training.links.recruitDesc"
              defaultMessage="Share this with other chatters. When they generate paid calls, you earn ${n1} per call."
              values={{ n1: n1CallAmount }}
            />
          </p>
          {recruitmentShareUrl && (
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono text-violet-700 dark:text-violet-300 truncate bg-white/50 dark:bg-white/5 px-2 py-1.5 rounded-lg">{recruitmentShareUrl}</code>
              <button onClick={handleCopyRecruitment} className="shrink-0 px-2.5 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-bold flex items-center gap-1">
                {copiedRecruitment ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedRecruitment ? intl.formatMessage({ id: 'common.copied', defaultMessage: 'Copied!' }) : intl.formatMessage({ id: 'common.copy', defaultMessage: 'Copy' })}
              </button>
            </div>
          )}
        </div>

        {/* Provider link */}
        <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="text-sm font-bold text-teal-700 dark:text-teal-300">
              <FormattedMessage id="chatter.training.links.provider" defaultMessage="Provider link" />
            </span>
            <span className="ml-auto text-sm font-black text-teal-600 dark:text-teal-400">${providerCallAmount}<span className="text-xs font-medium opacity-70"><FormattedMessage id="chatter.bar.perCall" defaultMessage="/call" /></span></span>
          </div>
          <p className="text-xs text-teal-600 dark:text-teal-400/80 leading-relaxed">
            <FormattedMessage
              id="chatter.training.links.providerDesc"
              defaultMessage="Share this with lawyers or expat helpers who want to join the platform. When their clients call, you earn ${amount} per call (for 6 months)."
              values={{ amount: providerCallAmount }}
            />
          </p>
          {providerShareUrl && (
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono text-teal-700 dark:text-teal-300 truncate bg-white/50 dark:bg-white/5 px-2 py-1.5 rounded-lg">{providerShareUrl}</code>
              <button onClick={handleCopyProvider} className="shrink-0 px-2.5 py-1.5 rounded-lg bg-teal-500 text-white text-xs font-bold flex items-center gap-1">
                {copiedProvider ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedProvider ? intl.formatMessage({ id: 'common.copied', defaultMessage: 'Copied!' }) : intl.formatMessage({ id: 'common.copy', defaultMessage: 'Copy' })}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Step by step: Generate your first revenue */}
      <div className={`${UI.card} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            <FormattedMessage id="chatter.training.firstRevenue.title" defaultMessage="Generate your first revenue" />
          </h3>
        </div>

        <div className="space-y-4">
          {/* Step 1 */}
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center shrink-0 text-sm font-bold">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                <FormattedMessage id="chatter.training.step1.title" defaultMessage="Sign up — Done!" />
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <FormattedMessage id="chatter.training.step1.desc" defaultMessage="Your account is active and your links are ready." />
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center shrink-0 text-sm font-bold">2</div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                <FormattedMessage id="chatter.training.step2.title" defaultMessage="Copy your CLIENT link" />
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <FormattedMessage id="chatter.training.step2.desc" defaultMessage="Use the green link at the top of your dashboard. This is the link that earns you {amount} per call." values={{ amount: callRange }} />
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center shrink-0 text-sm font-bold">3</div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                <FormattedMessage id="chatter.training.step3.title" defaultMessage="Share it where expats need help" />
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <FormattedMessage id="chatter.training.step3.desc" defaultMessage="Facebook groups for expats, WhatsApp groups, Telegram communities, expat forums, Reddit, local community boards. Target people who genuinely need legal or administrative help abroad." />
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center shrink-0 text-sm font-bold">4</div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                <FormattedMessage id="chatter.training.step4.title" defaultMessage="Someone calls → You earn automatically" />
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <FormattedMessage id="chatter.training.step4.desc" defaultMessage="When someone clicks your link and makes a paid call, your commission is credited automatically within 48 hours. No action needed from you." />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Where to share — Practical tips */}
      <div className={`${UI.card} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="w-5 h-5 text-blue-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            <FormattedMessage id="chatter.training.whereToShare.title" defaultMessage="Best places to share" />
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {[
            { icon: '📱', key: 'whatsapp', defaultMsg: 'WhatsApp & Telegram groups for expats in your country' },
            { icon: '👥', key: 'facebook', defaultMsg: 'Facebook groups: "Expats in [city]", "French abroad", immigration help groups' },
            { icon: '🌐', key: 'forums', defaultMsg: 'Expat forums: Internations, ExpatForum, Reddit r/expats, r/immigration' },
            { icon: '💬', key: 'personal', defaultMsg: 'Your personal network: friends abroad, family, colleagues who moved countries' },
            { icon: '📝', key: 'social', defaultMsg: 'Your social media: Instagram stories, Facebook posts, Twitter/X, LinkedIn' },
          ].map((place) => (
            <div key={place.key} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-white/5">
              <span className="text-lg shrink-0">{place.icon}</span>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <FormattedMessage id={`chatter.training.where.${place.key}`} defaultMessage={place.defaultMsg} />
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Content Ideas — Fun and actionable */}
      <div className={`${UI.card} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🎬</span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            <FormattedMessage id="chatter.training.ideas.title" defaultMessage="Content ideas that work" />
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          <FormattedMessage id="chatter.training.ideas.subtitle" defaultMessage="Create content that naturally brings people to your link. Here are proven ideas:" />
        </p>

        <div className="space-y-2.5">
          {/* TikTok / Reels */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 dark:from-pink-500/5 dark:to-purple-500/5 border border-pink-200 dark:border-pink-500/20">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">🎵</span>
              <span className="text-sm font-bold text-pink-700 dark:text-pink-300">TikTok / Instagram Reels</span>
            </div>
            <ul className="text-xs text-pink-600 dark:text-pink-400/80 space-y-1 leading-relaxed">
              <li>
                <FormattedMessage id="chatter.training.ideas.tiktok1" defaultMessage="&quot;3 things I wish I knew before moving abroad&quot; — add your link in bio" />
              </li>
              <li>
                <FormattedMessage id="chatter.training.ideas.tiktok2" defaultMessage="&quot;How I earn money from my phone helping expats&quot; — recruitment angle" />
              </li>
              <li>
                <FormattedMessage id="chatter.training.ideas.tiktok3" defaultMessage="&quot;This app saved my visa situation&quot; — storytelling format" />
              </li>
              <li>
                <FormattedMessage id="chatter.training.ideas.tiktok4" defaultMessage="Quick tip videos about expat life — &quot;Did you know you can call a lawyer for just $X?&quot;" />
              </li>
            </ul>
          </div>

          {/* Instagram Stories */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-yellow-500/10 dark:from-orange-500/5 dark:to-yellow-500/5 border border-orange-200 dark:border-orange-500/20">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">📸</span>
              <span className="text-sm font-bold text-orange-700 dark:text-orange-300">Instagram Stories</span>
            </div>
            <ul className="text-xs text-orange-600 dark:text-orange-400/80 space-y-1 leading-relaxed">
              <li>
                <FormattedMessage id="chatter.training.ideas.story1" defaultMessage="Poll: &quot;Have you ever needed legal help abroad?&quot; → swipe up to your link" />
              </li>
              <li>
                <FormattedMessage id="chatter.training.ideas.story2" defaultMessage="Share your earnings screenshot (blur personal info) → &quot;Want to earn too?&quot;" />
              </li>
              <li>
                <FormattedMessage id="chatter.training.ideas.story3" defaultMessage="&quot;Story time: when my friend got stuck abroad...&quot; → mention SOS-Expat" />
              </li>
            </ul>
          </div>

          {/* Facebook */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-500/5 dark:to-cyan-500/5 border border-blue-200 dark:border-blue-500/20">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">👥</span>
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">Facebook</span>
            </div>
            <ul className="text-xs text-blue-600 dark:text-blue-400/80 space-y-1 leading-relaxed">
              <li>
                <FormattedMessage id="chatter.training.ideas.fb1" defaultMessage="Join 10-20 expat groups for your country/city and answer people's questions, then share your link naturally" />
              </li>
              <li>
                <FormattedMessage id="chatter.training.ideas.fb2" defaultMessage="Post: &quot;If you're an expat and need legal advice, I found this great service...&quot;" />
              </li>
              <li>
                <FormattedMessage id="chatter.training.ideas.fb3" defaultMessage="Create a helpful post about common expat problems → include your link as the solution" />
              </li>
            </ul>
          </div>

          {/* WhatsApp / Telegram */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-500/5 dark:to-emerald-500/5 border border-green-200 dark:border-green-500/20">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">💬</span>
              <span className="text-sm font-bold text-green-700 dark:text-green-300">WhatsApp / Telegram</span>
            </div>
            <ul className="text-xs text-green-600 dark:text-green-400/80 space-y-1 leading-relaxed">
              <li>
                <FormattedMessage id="chatter.training.ideas.wa1" defaultMessage="Share in relevant groups when someone asks for legal/admin help abroad" />
              </li>
              <li>
                <FormattedMessage id="chatter.training.ideas.wa2" defaultMessage="Send to friends abroad: &quot;Hey, I found this service that might help you with...&quot;" />
              </li>
              <li>
                <FormattedMessage id="chatter.training.ideas.wa3" defaultMessage="For recruitment: &quot;I make extra money sharing links, no investment needed. Want to try?&quot;" />
              </li>
            </ul>
          </div>
        </div>

        {/* Pro tip */}
        <div className="mt-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
          <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
            <FormattedMessage id="chatter.training.ideas.proTip.title" defaultMessage="Pro tip" />
          </p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400/80 leading-relaxed">
            <FormattedMessage id="chatter.training.ideas.proTip.desc" defaultMessage="The best performing chatters post 2-3 times per week on different platforms. Mix helpful content (expat tips) with direct promotion (your link). Be authentic — people trust real stories more than ads." />
          </p>
        </div>
      </div>

      {/* Anti-spam notice */}
      <div className={`${UI.card} p-4 bg-amber-50/50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20`}>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
            <FormattedMessage id="chatter.training.noSpam.title" defaultMessage="Share smart, no spam" />
          </p>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          <FormattedMessage id="chatter.training.noSpam.desc" defaultMessage="Share in relevant groups with people who genuinely need help. Quality over quantity. Spamming will get you banned from groups and won't generate calls." />
        </p>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // TAB 2: BUILD YOUR TEAM — Recruit chatters, passive income
  // ══════════════════════════════════════════════════════════════
  const buildTeamTab = (
    <div className="space-y-4">
      {/* How team building works */}
      <div className={`${UI.card} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-violet-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            <FormattedMessage id="chatter.training.team.title" defaultMessage="Build your team = passive income" />
          </h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
          <FormattedMessage
            id="chatter.training.team.desc"
            defaultMessage="Use your RECRUITMENT link (purple) to invite people who want to earn money too. When they join and their clients call, you earn commissions on every call they generate — forever."
          />
        </p>

        {/* N1 / N2 explanation */}
        <div className="space-y-2">
          <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-violet-700 dark:text-violet-300">
                <FormattedMessage id="chatter.training.team.n1" defaultMessage="Level 1 (your direct recruits)" />
              </span>
              <span className="text-lg font-black text-violet-600 dark:text-violet-400">${n1CallAmount}</span>
            </div>
            <p className="text-xs text-violet-600 dark:text-violet-400/80">
              <FormattedMessage id="chatter.training.team.n1Desc" defaultMessage="For every paid call their clients make, you earn ${amount}. No limit, no expiration." values={{ amount: n1CallAmount }} />
            </p>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                <FormattedMessage id="chatter.training.team.n2" defaultMessage="Level 2 (their recruits)" />
              </span>
              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">${n2CallAmount}</span>
            </div>
            <p className="text-xs text-indigo-600 dark:text-indigo-400/80">
              <FormattedMessage id="chatter.training.team.n2Desc" defaultMessage="When your recruits recruit someone, you also earn ${amount} per call from THEIR recruits. 2 levels of passive income." values={{ amount: n2CallAmount }} />
            </p>
          </div>
        </div>
      </div>

      {/* Concrete earnings example */}
      <div className={`${UI.card} p-4 bg-green-50/50 dark:bg-green-500/5 border-green-200 dark:border-green-500/15`}>
        <h4 className="text-sm font-bold text-green-800 dark:text-green-300 mb-2">
          <FormattedMessage id="chatter.training.team.example.title" defaultMessage="Concrete example" />
        </h4>
        <div className="space-y-1.5 text-sm text-green-700 dark:text-green-400">
          <p>
            <FormattedMessage
              id="chatter.training.team.example.line1"
              defaultMessage="You recruit 10 chatters (N1)"
            />
          </p>
          <p>
            <FormattedMessage
              id="chatter.training.team.example.line2"
              defaultMessage="Each generates 2 client calls/week"
            />
          </p>
          <p className="text-lg font-black text-green-600 dark:text-green-300">
            = 10 × 2 × ${n1CallAmount} × 4 = <FormattedMessage id="chatter.training.team.example.result" defaultMessage="${amount}/month passive income" values={{ amount: (10 * 2 * n1CallAmount * 4).toFixed(0) }} />
          </p>
          <p className="text-xs text-green-600/70 dark:text-green-400/60">
            <FormattedMessage id="chatter.training.team.example.note" defaultMessage="+ ${n2}/call from their recruits (N2) + activation bonuses + recruitment bonuses" values={{ n2: n2CallAmount }} />
          </p>
        </div>
      </div>

      {/* Bonuses when recruiting */}
      <div className={`${UI.card} p-4`}>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
          <FormattedMessage id="chatter.training.team.bonuses.title" defaultMessage="Bonuses for recruiting" />
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-white/5">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                <FormattedMessage id="chatter.training.team.bonus.activation" defaultMessage="Activation bonus (recruit makes 2 calls)" />
              </span>
            </div>
            <span className="font-bold text-orange-600 dark:text-orange-400">${activationBonus}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-white/5">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-teal-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                <FormattedMessage id="chatter.training.team.bonus.recruit" defaultMessage="Recruitment bonus (recruit recruits someone)" />
              </span>
            </div>
            <span className="font-bold text-teal-600 dark:text-teal-400">${recruitBonus}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-white/5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                <FormattedMessage id="chatter.training.team.bonus.milestones" defaultMessage="Milestone bonuses (5, 10, 20... recruits)" />
              </span>
            </div>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">$15→$4,000</span>
          </div>
        </div>
      </div>

      {/* Who to recruit */}
      <div className={`${UI.card} p-4`}>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
          <FormattedMessage id="chatter.training.team.who.title" defaultMessage="Who should you recruit?" />
        </h3>
        <div className="space-y-2">
          {[
            { icon: '🎓', key: 'students', defaultMsg: 'Students looking for side income' },
            { icon: '🏠', key: 'stayHome', defaultMsg: 'Stay-at-home parents who want to earn from their phone' },
            { icon: '🌍', key: 'expats', defaultMsg: 'Expats who know other expats and have a large network' },
            { icon: '📱', key: 'social', defaultMsg: 'People active on social media with large followings' },
            { icon: '💼', key: 'sideHustle', defaultMsg: 'Anyone looking for a flexible side hustle with no investment' },
          ].map((target) => (
            <div key={target.key} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-white/5">
              <span className="text-lg shrink-0">{target.icon}</span>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <FormattedMessage id={`chatter.training.recruit.${target.key}`} defaultMessage={target.defaultMsg} />
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Path to Captain */}
      <div className={`${UI.card} p-4 border-l-4 border-amber-400`}>
        <div className="flex items-center gap-2 mb-2">
          <Crown className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            <FormattedMessage id="chatter.training.captain.title" defaultMessage="Path to Captain" />
          </h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
          <FormattedMessage
            id="chatter.training.captain.desc"
            defaultMessage="Top recruiters become Captains. As a Captain, you earn additional commissions on ALL calls generated by your entire team (N1 + N2). Monthly bonus tiers from Bronze to Diamond based on your team's total calls."
          />
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { name: 'Bronze', calls: '10+', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' },
            { name: 'Silver', calls: '50+', color: 'text-gray-500 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/20' },
            { name: 'Gold', calls: '100+', color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' },
            { name: 'Plat.', calls: '250+', color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20' },
            { name: 'Diam.', calls: '500+', color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' },
          ].map((tier) => (
            <div key={tier.name} className={`p-2 rounded-lg text-center ${tier.color}`}>
              <p className="text-[10px] font-bold">{tier.name}</p>
              <p className="text-[9px] opacity-70">{tier.calls}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // TAB 3: MAXIMIZE EARNINGS — Calculator, all sources, tips
  // ══════════════════════════════════════════════════════════════
  const maximizeTab = (
    <div className="space-y-4">
      {/* Revenue calculator */}
      <div className={`${UI.card} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-5 h-5 text-green-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            <FormattedMessage id="chatter.training.calc.title" defaultMessage="Revenue calculator" />
          </h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          <FormattedMessage id="chatter.training.calc.desc" defaultMessage="If you generate X client calls per week:" />
        </p>
        <input
          type="range"
          min={0}
          max={REVENUE_SCENARIOS.length - 1}
          value={revenueSlider}
          onChange={(e) => setRevenueSlider(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1 mb-4">
          {REVENUE_SCENARIOS.map((s) => <span key={s.calls}>{s.label}</span>)}
        </div>
        <div className="text-center p-4 bg-green-50 dark:bg-green-500/10 rounded-xl">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {REVENUE_SCENARIOS[revenueSlider].calls} <FormattedMessage id="chatter.training.calc.callsPerWeek" defaultMessage="calls/week" /> =
          </p>
          <p className="text-3xl font-extrabold text-green-500 mt-1">
            ~${(REVENUE_SCENARIOS[revenueSlider].calls * maxCall * 4).toFixed(0)}<span className="text-lg font-medium">/<FormattedMessage id="chatter.training.calc.month" defaultMessage="month" /></span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            <FormattedMessage id="chatter.training.calc.plus" defaultMessage="+ passive income from your team" />
          </p>
        </div>
      </div>

      {/* All commission sources */}
      <div className={`${UI.card} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-5 h-5 text-green-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            <FormattedMessage id="chatter.training.sources.title" defaultMessage="All your income sources" />
          </h3>
        </div>

        <div className="space-y-3">
          {/* Direct commissions */}
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
              <FormattedMessage id="chatter.training.sources.direct" defaultMessage="Direct commissions (your client link)" />
            </p>
            <div className="space-y-1">
              <CommissionLine
                label={intl.formatMessage({ id: 'chatter.training.comm.lawyer', defaultMessage: 'Call with a lawyer' })}
                amount={`$${clientCallLawyer}`}
                color="text-green-600 dark:text-green-400"
              />
              <CommissionLine
                label={intl.formatMessage({ id: 'chatter.training.comm.expat', defaultMessage: 'Call with an expat expert' })}
                amount={`$${clientCallExpat}`}
                color="text-green-600 dark:text-green-400"
              />
            </div>
          </div>

          {/* Team commissions */}
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
              <FormattedMessage id="chatter.training.sources.team" defaultMessage="Team commissions (your recruitment link)" />
            </p>
            <div className="space-y-1">
              <CommissionLine
                label={intl.formatMessage({ id: 'chatter.training.comm.n1', defaultMessage: 'N1 recruit\'s client calls' })}
                amount={`$${n1CallAmount}`}
                detail={intl.formatMessage({ id: 'chatter.training.comm.forever', defaultMessage: 'forever' })}
                color="text-violet-600 dark:text-violet-400"
              />
              <CommissionLine
                label={intl.formatMessage({ id: 'chatter.training.comm.n2', defaultMessage: 'N2 recruit\'s client calls' })}
                amount={`$${n2CallAmount}`}
                detail={intl.formatMessage({ id: 'chatter.training.comm.forever', defaultMessage: 'forever' })}
                color="text-indigo-600 dark:text-indigo-400"
              />
              <CommissionLine
                label={intl.formatMessage({ id: 'chatter.training.comm.activationBonus', defaultMessage: 'N1 activation bonus' })}
                amount={`$${activationBonus}`}
                detail={intl.formatMessage({ id: 'chatter.training.comm.oncePerRecruit', defaultMessage: 'once per recruit' })}
                color="text-orange-600 dark:text-orange-400"
              />
              <CommissionLine
                label={intl.formatMessage({ id: 'chatter.training.comm.recruitBonus', defaultMessage: 'N1 recruitment bonus' })}
                amount={`$${recruitBonus}`}
                detail={intl.formatMessage({ id: 'chatter.training.comm.whenTheyRecruit', defaultMessage: 'when they recruit' })}
                color="text-teal-600 dark:text-teal-400"
              />
            </div>
          </div>

          {/* Bonuses */}
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
              <FormattedMessage id="chatter.training.sources.bonuses" defaultMessage="Special bonuses" />
            </p>
            <div className="space-y-1">
              <CommissionLine
                label={intl.formatMessage({ id: 'chatter.training.comm.telegram', defaultMessage: 'Telegram bonus' })}
                amount="$50"
                detail={intl.formatMessage({ id: 'chatter.training.comm.telegramDetail', defaultMessage: 'connect Telegram + earn $150' })}
                color="text-sky-600 dark:text-sky-400"
              />
              <CommissionLine
                label={intl.formatMessage({ id: 'chatter.training.comm.milestones', defaultMessage: 'Recruitment milestones' })}
                amount="$15→$4K"
                detail={intl.formatMessage({ id: 'chatter.training.comm.milestonesDetail', defaultMessage: '5 to 500 recruits' })}
                color="text-indigo-600 dark:text-indigo-400"
              />
              <CommissionLine
                label={intl.formatMessage({ id: 'chatter.training.comm.top3', defaultMessage: 'Monthly Top 3 competition' })}
                amount="$50→$200"
                detail={intl.formatMessage({ id: 'chatter.training.comm.everyMonth', defaultMessage: 'every month' })}
                color="text-yellow-600 dark:text-yellow-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Earning potential projections */}
      <div className={`${UI.card} p-4`}>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
          <FormattedMessage id="chatter.training.potential.title" defaultMessage="Earning potential" />
        </h3>
        <div className="space-y-2">
          {[
            { level: 'Beginner', desc: '5 client calls/week', amount: `$${(5 * maxCall * 4).toFixed(0)}`, color: 'border-slate-300 dark:border-slate-600' },
            { level: 'Active', desc: '10 calls + 5 recruits', amount: `$${(10 * maxCall * 4 + 5 * 2 * n1CallAmount * 4).toFixed(0)}`, color: 'border-blue-400 dark:border-blue-600' },
            { level: 'Pro', desc: '20 calls + 20 recruits', amount: `$${(20 * maxCall * 4 + 20 * 2 * n1CallAmount * 4).toFixed(0)}`, color: 'border-violet-400 dark:border-violet-600' },
            { level: 'Captain', desc: '50 calls + 50 recruits + captain bonus', amount: '$2,000+', color: 'border-amber-400 dark:border-amber-600' },
          ].map((proj) => (
            <div key={proj.level} className={`flex items-center justify-between p-3 rounded-xl border-l-4 bg-slate-50 dark:bg-white/5 ${proj.color}`}>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  <FormattedMessage id={`chatter.training.potential.${proj.level.toLowerCase()}`} defaultMessage={proj.level} />
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{proj.desc}</p>
              </div>
              <span className="text-lg font-black text-green-500">{proj.amount}<span className="text-xs font-medium text-slate-400">/<FormattedMessage id="chatter.training.calc.month" defaultMessage="month" /></span></span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // TAB 2: FORMATION — Training modules with progress
  // ══════════════════════════════════════════════════════════════
  const formationTab = (
    <div className="space-y-4">
      {trainingLoading && (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      )}
      {!trainingLoading && modules && modules.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
            <FormattedMessage id="chatter.training.modules.title" defaultMessage="Training modules" />
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {modules.map((mod: TrainingModuleListItem) => {
              // Check if prerequisites are met: all prerequisite modules must be completed
              const prerequisitesNotMet = mod.prerequisites.length > 0 &&
                mod.prerequisites.some((prereqId: string) => {
                  const prereqMod = modules.find((m) => m.id === prereqId);
                  return !prereqMod?.progress?.isCompleted;
                });

              return (
                <button
                  key={mod.id}
                  onClick={() => handleOpenModule(mod.id)}
                  disabled={prerequisitesNotMet}
                  className={`${UI.card} ${UI.cardHover} p-4 text-left transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm cursor-pointer`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 text-[10px] font-medium rounded-full uppercase">
                      {mod.category || 'general'}
                    </span>
                    {prerequisitesNotMet ? (
                      <Lock className="w-4 h-4 text-slate-400" />
                    ) : mod.progress?.isCompleted ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : null}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{mod.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {mod.progress?.totalSlides || 0} slides · {mod.estimatedMinutes || 5}min
                  </p>
                  {mod.progress && mod.progress.isStarted && !mod.progress.isCompleted && mod.progress.totalSlides > 0 && (
                    <div className="mt-2 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(mod.progress.currentSlideIndex / mod.progress.totalSlides) * 100}%` }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {!trainingLoading && trainingError && (
        <div className={`${UI.card} p-4 bg-red-50/50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{trainingError}</p>
          </div>
        </div>
      )}
      {!trainingLoading && !trainingError && (!modules || modules.length === 0) && (
        <EmptyStateCard
          icon={<BookOpen className="w-7 h-7" />}
          title={<FormattedMessage id="chatter.training.modules.emptyTitle" defaultMessage="Modules coming soon" />}
          description={<FormattedMessage id="chatter.training.modules.emptyDesc" defaultMessage="Training modules are being prepared. Check back soon!" />}
        />
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // TAB 3: RESOURCES
  // ══════════════════════════════════════════════════════════════
  const allResources = useMemo(() => {
    if (!resourcesData) return [];
    const files: ResourceItem[] = (resourcesData.files || []).map((f) => ({ ...f, _kind: 'file' as const }));
    const texts: ResourceItem[] = (resourcesData.texts || []).map((t) => ({ ...t, _kind: 'text' as const }));
    return [...files, ...texts];
  }, [resourcesData]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    allResources.forEach((r) => { if (r.category) cats.add(r.category); });
    return Array.from(cats).sort();
  }, [allResources]);

  const filteredResources = useMemo(() => {
    let items = allResources;
    if (selectedCategory) items = items.filter((r) => r.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((r) =>
        (r.title || r.name || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.content || '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [allResources, selectedCategory, searchQuery]);

  const resourcesTab = (
    <div className="space-y-4">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={intl.formatMessage({ id: 'chatter.resources.search', defaultMessage: 'Search...' })}
        className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-base text-slate-900 dark:text-white placeholder-slate-400"
      />
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
              !selectedCategory ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'
            }`}
          >
            <FormattedMessage id="common.all" defaultMessage="All" />
          </button>
          {categories.map((cat: string) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === cat ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
      {resourcesLoading && (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      )}
      {filteredResources.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredResources.map((resource) => (
            <div key={resource.id} className={`${UI.card} p-4`}>
              {resource.type === 'image' && resource.thumbnailUrl && (
                <img src={resource.thumbnailUrl} alt={resource.title} className="w-full h-32 object-cover rounded-lg mb-3" loading="lazy" />
              )}
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-8 h-8 bg-slate-100 dark:bg-white/10 rounded-lg flex items-center justify-center">
                  {resource._kind === 'text' ? <FileText className="w-4 h-4 text-slate-400" /> :
                   resource.type === 'image' ? <ImageIcon className="w-4 h-4 text-slate-400" /> :
                   resource.type === 'video' ? <Video className="w-4 h-4 text-slate-400" /> :
                   <FileText className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">{resource.title}</h4>
                  {resource.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{resource.description}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {resource.downloadUrl && (
                  <a href={resource.downloadUrl} target="_blank" rel="noopener noreferrer" className={`${UI.button.primary} px-3 py-1.5 text-xs flex-1 text-center`}>
                    <FormattedMessage id="common.download" defaultMessage="Download" />
                  </a>
                )}
                {resource.content && (
                  <button
                    onClick={async () => {
                      const success = await copyToClipboard(resource.content!);
                      if (success) toast.success(intl.formatMessage({ id: 'common.copied', defaultMessage: 'Copied!' }));
                    }}
                    className={`${UI.button.secondary} px-3 py-1.5 text-xs flex-1`}
                  >
                    <FormattedMessage id="common.copy" defaultMessage="Copy" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {!resourcesLoading && filteredResources.length === 0 && (
        <EmptyStateCard
          icon={<FolderOpen className="w-7 h-7" />}
          title={<FormattedMessage id="chatter.resources.emptyTitle" defaultMessage="Resources coming soon" />}
          description={<FormattedMessage id="chatter.resources.emptyDesc" defaultMessage="Images, pre-written texts, and sharing tools coming soon!" />}
        />
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // COMBINED TAB: Comment Gagner = Getting Started + Maximize + Build Team
  // ══════════════════════════════════════════════════════════════
  const howToEarnTab = (
    <div className="space-y-4">
      {gettingStartedTab}
      {maximizeTab}
      {buildTeamTab}
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // TABS
  // ══════════════════════════════════════════════════════════════
  const tabs = [
    {
      key: 'howToEarn',
      label: <FormattedMessage id="chatter.training.tab.howToEarn" defaultMessage="Comment Gagner" />,
      content: howToEarnTab,
    },
    {
      key: 'training',
      label: <FormattedMessage id="chatter.training.tab.training" defaultMessage="Formation" />,
      content: formationTab,
    },
    {
      key: 'resources',
      label: <FormattedMessage id="chatter.tools.tab.resources" defaultMessage="Resources" />,
      content: resourcesTab,
    },
  ];

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-indigo-500" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          <FormattedMessage id="chatter.training.pageTitle" defaultMessage="Training" />
        </h1>
      </div>
      <SwipeTabContainer tabs={tabs} />

      {/* Module viewer modal */}
      {viewingModule && (
        isLoadingModule ? (
          <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <FormattedMessage id="chatter.training.loadingModule" defaultMessage="Loading module..." />
            </p>
            <button
              onClick={() => { setViewingModule(null); setQuizResult(null); }}
              className={`mt-4 ${UI.button.secondary} px-4 py-2 text-sm`}
            >
              <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
            </button>
          </div>
        ) : trainingError ? (
          <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6">
            <AlertTriangle className="w-10 h-10 text-amber-500 mb-4" />
            <p className="text-sm text-slate-700 dark:text-slate-300 text-center mb-4">{trainingError}</p>
            <button
              onClick={() => { setViewingModule(null); setQuizResult(null); }}
              className={`${UI.button.primary} px-6 py-2 text-sm`}
            >
              <FormattedMessage id="common.close" defaultMessage="Close" />
            </button>
          </div>
        ) : currentModule ? (
          <ModuleViewer
            module={currentModule}
            selectedSlide={selectedSlide}
            onSlideChange={setSelectedSlide}
            quizAnswers={quizAnswers}
            onQuizAnswer={(qId, answer) => setQuizAnswers(prev => ({ ...prev, [qId]: answer }))}
            quizResult={quizResult}
            onSubmitQuiz={async () => {
              const answersArray = Object.entries(quizAnswers).map(([questionId, answerId]) => ({ questionId, answerId }));
              const result = await submitQuiz(viewingModule, answersArray);
              if (result) setQuizResult(result);
            }}
            onClose={() => { setViewingModule(null); setQuizResult(null); }}
          />
        ) : null
      )}
    </div>
  );
}

// ============================================================================
// COMMISSION LINE (simple row for commission display)
// ============================================================================
function CommissionLine({ label, amount, detail, color }: { label: string; amount: string; detail?: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-white/5">
      <div className="min-w-0 flex-1">
        <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
        {detail && <span className="text-[10px] text-slate-400 ml-1.5">({detail})</span>}
      </div>
      <span className={`text-base font-black shrink-0 ${color}`}>{amount}</span>
    </div>
  );
}

// ============================================================================
// MODULE VIEWER (full-screen on mobile)
// ============================================================================
interface ModuleViewerProps {
  module: ChatterTrainingModule;
  selectedSlide: number;
  onSlideChange: (index: number) => void;
  quizAnswers: Record<string, string>;
  onQuizAnswer: (questionId: string, answer: string) => void;
  quizResult: SubmitTrainingQuizResult | null;
  onSubmitQuiz: () => void;
  onClose: () => void;
}

const ModuleViewer: React.FC<ModuleViewerProps> = ({
  module, selectedSlide, onSlideChange, quizAnswers, onQuizAnswer, quizResult, onSubmitQuiz, onClose,
}) => {
  const intl = useIntl();
  const slides = module.slides || [];
  const quiz = module.quizQuestions?.length > 0 ? module.quizQuestions : null;
  const totalSteps = slides.length + (quiz ? 1 : 0);
  const isQuizStep = selectedSlide >= slides.length;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{module.title}</h3>
          <p className="text-xs text-slate-400">{selectedSlide + 1}/{totalSteps}</p>
        </div>
        <button onClick={onClose} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      <div className="h-1 bg-slate-200 dark:bg-white/10">
        <div className="h-full bg-indigo-500 transition-all" style={{ width: `${((selectedSlide + 1) / totalSteps) * 100}%` }} />
      </div>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        {!isQuizStep && slides[selectedSlide] && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{slides[selectedSlide].title}</h2>
            {slides[selectedSlide].mediaUrl && (
              <img src={slides[selectedSlide].mediaUrl} alt="" className="w-full rounded-xl mb-4" loading="lazy" />
            )}
            <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: slides[selectedSlide].content || '' }} />
          </div>
        )}

        {isQuizStep && quiz && !quizResult && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Quiz</h2>
            <div className="space-y-6">
              {quiz.map((q: TrainingQuizQuestion, qi: number) => (
                <div key={q.id}>
                  <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">{qi + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options?.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => onQuizAnswer(q.id, opt.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                          quizAnswers[q.id] === opt.id
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                            : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={onSubmitQuiz} className={`mt-6 w-full ${UI.button.primary} py-3 text-sm`}>
              <FormattedMessage id="chatter.training.submitQuiz" defaultMessage="Submit quiz" />
            </button>
          </div>
        )}

        {quizResult && (
          <div className="text-center py-8">
            <Award className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {quizResult.score >= 70
                ? intl.formatMessage({ id: 'chatter.training.quiz.passed', defaultMessage: 'Congratulations!' })
                : intl.formatMessage({ id: 'chatter.training.quiz.failed', defaultMessage: 'Try again!' })
              }
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">Score: {quizResult.score}%</p>
            <button onClick={onClose} className={`mt-6 ${UI.button.primary} px-8 py-3 text-sm`}>
              <FormattedMessage id="common.close" defaultMessage="Close" />
            </button>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200 dark:border-white/10 px-4 py-3 flex justify-between">
        <button
          onClick={() => onSlideChange(Math.max(0, selectedSlide - 1))}
          disabled={selectedSlide === 0}
          className={`${UI.button.secondary} px-4 py-2 text-sm disabled:opacity-30 inline-flex items-center gap-1`}
        >
          <ArrowLeft className="w-4 h-4" />
          <FormattedMessage id="common.previous" defaultMessage="Previous" />
        </button>
        <button
          onClick={() => { if (selectedSlide < totalSteps - 1) onSlideChange(selectedSlide + 1); }}
          disabled={selectedSlide >= totalSteps - 1}
          className={`${UI.button.primary} px-4 py-2 text-sm disabled:opacity-30 inline-flex items-center gap-1`}
        >
          <FormattedMessage id="common.next" defaultMessage="Next" />
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
