import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Copy, Check, Share2, Users, UserPlus, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useChatterData } from '@/contexts/ChatterDataContext';

const StickyAffiliateBar: React.FC = () => {
  const intl = useIntl();
  const { clientShareUrl, recruitmentShareUrl, dashboardData } = useChatterData();

  const [copiedClient, setCopiedClient] = useState(false);
  const [copiedRecruitment, setCopiedRecruitment] = useState(false);
  const [sharedClient, setSharedClient] = useState(false);
  const [sharedRecruitment, setSharedRecruitment] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const [tooltipOpen, setTooltipOpen] = useState<'client' | 'recruitment' | null>(null);

  const lastScrollY = useRef(0);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const affiliateCodeClient = dashboardData?.chatter?.affiliateCodeClient ?? '';
  const affiliateCodeRecruitment = dashboardData?.chatter?.affiliateCodeRecruitment ?? '';
  const totalClients = dashboardData?.chatter?.totalClients ?? 0;
  const totalRecruits = dashboardData?.chatter?.totalRecruits ?? 0;

  // Dynamic commission amounts from config (cents -> dollars)
  const config = dashboardData?.config;
  const { callAmountRange, n1CallAmount } = useMemo(() => {
    const expatAmt = (config?.commissionClientCallAmountExpat ?? 300) / 100;
    const lawyerAmt = (config?.commissionClientCallAmountLawyer ?? 500) / 100;
    const minAmt = Math.min(expatAmt, lawyerAmt);
    const maxAmt = Math.max(expatAmt, lawyerAmt);
    const range = minAmt === maxAmt ? `$${minAmt}` : `$${minAmt}-${maxAmt}`;
    const n1Amt = (config?.commissionN1CallAmount ?? 100) / 100;
    const providerAmt = (config?.commissionProviderCallAmount ?? 500) / 100;
    return { callAmountRange: range, n1CallAmount: n1Amt, providerCallAmount: providerAmt };
  }, [config?.commissionClientCallAmountExpat, config?.commissionClientCallAmountLawyer, config?.commissionN1CallAmount, config?.commissionProviderCallAmount]);

  // Stop pulse animation after 3s
  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Collapse on scroll down, expand on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        setCollapsed(true);
      } else if (currentScrollY < lastScrollY.current) {
        setCollapsed(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close tooltip on outside click
  useEffect(() => {
    if (!tooltipOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setTooltipOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tooltipOpen]);

  const handleCopy = useCallback(async (url: string, type: 'client' | 'recruitment') => {
    try {
      await navigator.clipboard.writeText(url);
      if (type === 'client') {
        setCopiedClient(true);
        setTimeout(() => setCopiedClient(false), 2000);
      } else {
        setCopiedRecruitment(true);
        setTimeout(() => setCopiedRecruitment(false), 2000);
      }
      localStorage.setItem('chatter_link_copied', Date.now().toString());
      navigator.vibrate?.(50);
      toast.success(
        type === 'client' ? 'Lien client copie !' : 'Lien recrutement copie !'
      );
    } catch {
      toast.error('Impossible de copier le lien');
    }
  }, []);

  const handleShare = useCallback(async (url: string, type: 'client' | 'recruitment') => {
    const title = type === 'client'
      ? 'SOS Expat - Assistance'
      : 'SOS Expat - Rejoins-nous';

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        if (type === 'client') {
          setSharedClient(true);
          setTimeout(() => setSharedClient(false), 2000);
        } else {
          setSharedRecruitment(true);
          setTimeout(() => setSharedRecruitment(false), 2000);
        }
        localStorage.setItem('chatter_link_shared', Date.now().toString());
      } catch (err: any) {
        // User cancelled share — ignore AbortError
        if (err?.name !== 'AbortError') {
          toast.error('Erreur lors du partage');
        }
      }
    } else {
      toast('Copiez le lien et partagez-le manuellement', { icon: 'i' });
    }
  }, []);

  const toggleTooltip = useCallback((type: 'client' | 'recruitment') => {
    setTooltipOpen((prev) => (prev === type ? null : type));
  }, []);

  // Collapsed mini version — two copy buttons with updated labels
  if (collapsed) {
    return (
      <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-sm border-b border-slate-200/80 shadow-sm dark:bg-slate-900/85 dark:border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-3 py-1.5 flex items-center justify-center gap-3">
          <button
            onClick={() => handleCopy(clientShareUrl ?? '', 'client')}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
            title={`Partagez ce lien. Quand quelqu'un appelle un prestataire via votre lien, vous gagnez ${callAmountRange} par appel pay\u00e9.`}
          >
            <Users className="w-3.5 h-3.5" />
            {copiedClient ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="sm:hidden">
              <FormattedMessage id="chatter.bar.clientLinkMobile" defaultMessage="Gagner" />
            </span>
            <span className="hidden sm:inline">
              {`Lien client \u2014 Gagnez ${callAmountRange}/appel`}
            </span>
          </button>
          <button
            onClick={() => handleCopy(recruitmentShareUrl ?? '', 'recruitment')}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-medium hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
            title={`Partagez ce lien aux prestataires. Quand ils s'inscrivent et re\u00e7oivent des appels, vous gagnez $${providerCallAmount} par appel pendant 6 mois.`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {copiedRecruitment ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="sm:hidden">
              <FormattedMessage id="chatter.bar.recruitmentLinkMobile" defaultMessage="Recruter" />
            </span>
            <span className="hidden sm:inline">
              {`Recrutement avocat/expat \u2014 Gagnez $${providerCallAmount}/appel 6 mois`}
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-sm border-b border-slate-200/80 shadow-sm dark:bg-slate-900/85 dark:border-white/5 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 sm:py-2">
        <div className="flex flex-col sm:flex-row sm:items-stretch sm:gap-4 gap-1.5">

          {/* Client link section */}
          <div className="flex-1 min-w-0 rounded-xl bg-emerald-50/70 dark:bg-emerald-900/20 px-3 py-2" ref={tooltipOpen === 'client' ? tooltipRef : undefined}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium hidden sm:inline">
                  {`Lien client \u2014 Gagnez ${callAmountRange}/appel`}
                </span>
                <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium sm:hidden">
                  <FormattedMessage id="chatter.bar.clientLinkMobile" defaultMessage="Gagner" />
                </span>
                <button
                  onClick={() => toggleTooltip('client')}
                  className="flex items-center justify-center w-5 h-5 rounded-full text-emerald-500 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-800/40 transition-colors"
                  aria-label="Info"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <code className="font-mono text-sm font-bold tracking-wide text-slate-800 dark:text-slate-100 truncate min-w-0">
                {affiliateCodeClient}
              </code>
              {totalClients > 0 && (
                <span className="shrink-0 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold leading-none">
                  {totalClients}
                </span>
              )}
              <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                <button
                  onClick={() => handleCopy(clientShareUrl ?? '', 'client')}
                  className={`flex items-center justify-center w-[44px] h-[44px] sm:w-8 sm:h-8 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors ${showPulse ? 'animate-pulse' : ''}`}
                  aria-label="Copier lien client"
                >
                  {copiedClient ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleShare(clientShareUrl ?? '', 'client')}
                  className="flex items-center justify-center w-[44px] h-[44px] sm:w-8 sm:h-8 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                  aria-label="Partager lien client"
                >
                  {sharedClient ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {/* Mobile badge */}
            <div className="sm:hidden mt-0.5 ml-5.5">
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/70 font-medium">{"~" + callAmountRange + "/appel"}</span>
            </div>
            {/* Tooltip */}
            {tooltipOpen === 'client' && (
              <div className="mt-2 p-2.5 rounded-lg bg-emerald-100/80 dark:bg-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                {`Partagez ce lien. Quand quelqu'un appelle un prestataire via votre lien, vous gagnez ${callAmountRange} par appel pay\u00e9.`}
              </div>
            )}
          </div>

          {/* Divider (desktop only) */}
          <div className="hidden sm:block w-px bg-slate-200 dark:bg-white/10 shrink-0 self-stretch" />

          {/* Recruitment link section */}
          <div className="flex-1 min-w-0 rounded-xl bg-violet-50/70 dark:bg-violet-900/20 px-3 py-2" ref={tooltipOpen === 'recruitment' ? tooltipRef : undefined}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <UserPlus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span className="text-xs text-violet-700 dark:text-violet-300 font-medium hidden sm:inline">
                  {`Recrutement avocat/expat \u2014 Gagnez $${providerCallAmount}/appel 6 mois`}
                </span>
                <span className="text-xs text-violet-700 dark:text-violet-300 font-medium sm:hidden">
                  <FormattedMessage id="chatter.bar.recruitmentLinkMobile" defaultMessage="Recruter" />
                </span>
                <button
                  onClick={() => toggleTooltip('recruitment')}
                  className="flex items-center justify-center w-5 h-5 rounded-full text-violet-500 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-800/40 transition-colors"
                  aria-label="Info"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <code className="font-mono text-sm font-bold tracking-wide text-slate-800 dark:text-slate-100 truncate min-w-0">
                {affiliateCodeRecruitment}
              </code>
              {totalRecruits > 0 && (
                <span className="shrink-0 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-[10px] font-semibold leading-none">
                  {totalRecruits}
                </span>
              )}
              <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                <button
                  onClick={() => handleCopy(recruitmentShareUrl ?? '', 'recruitment')}
                  className={`flex items-center justify-center w-[44px] h-[44px] sm:w-8 sm:h-8 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors ${showPulse ? 'animate-pulse' : ''}`}
                  aria-label="Copier lien recrutement"
                >
                  {copiedRecruitment ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleShare(recruitmentShareUrl ?? '', 'recruitment')}
                  className="flex items-center justify-center w-[44px] h-[44px] sm:w-8 sm:h-8 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                  aria-label="Partager lien recrutement"
                >
                  {sharedRecruitment ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {/* Mobile badge */}
            <div className="sm:hidden mt-0.5 ml-5.5">
              <span className="text-[10px] text-violet-600/80 dark:text-violet-400/70 font-medium">{`~$${providerCallAmount}/appel recrut\u00e9`}</span>
            </div>
            {/* Tooltip */}
            {tooltipOpen === 'recruitment' && (
              <div className="mt-2 p-2.5 rounded-lg bg-violet-100/80 dark:bg-violet-900/40 text-xs text-violet-800 dark:text-violet-200 leading-relaxed">
                {`Partagez ce lien aux prestataires (avocats, expatri\u00e9s). Quand ils s'inscrivent et re\u00e7oivent des appels, vous gagnez $${providerCallAmount} par appel pendant 6 mois.`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickyAffiliateBar;
