import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Copy, Check, Share2, Users, UserPlus, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { copyToClipboard } from '@/utils/clipboard';

const StickyAffiliateBar: React.FC = () => {
  const intl = useIntl();
  const { clientShareUrl, recruitmentShareUrl, providerShareUrl, dashboardData } = useChatterData();

  const [copiedClient, setCopiedClient] = useState(false);
  const [copiedRecruitment, setCopiedRecruitment] = useState(false);
  const [copiedProvider, setCopiedProvider] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const lastScrollY = useRef(0);

  const affiliateCodeClient = dashboardData?.chatter?.affiliateCodeClient ?? '';
  const affiliateCodeRecruitment = dashboardData?.chatter?.affiliateCodeRecruitment ?? '';
  const affiliateCodeProvider = dashboardData?.chatter?.affiliateCodeProvider ?? '';
  const totalClients = dashboardData?.chatter?.totalClients ?? 0;
  const totalRecruits = dashboardData?.chatter?.totalRecruits ?? 0;
  const totalProviderRecruits = dashboardData?.chatter?.totalProviderRecruits ?? 0;

  // Dynamic commission amounts from config (cents → dollars)
  const config = dashboardData?.config;
  const { callAmountRange, providerCallAmount, n1CallAmount } = useMemo(() => {
    const expatAmt = (config?.commissionClientCallAmountExpat ?? 300) / 100;
    const lawyerAmt = (config?.commissionClientCallAmountLawyer ?? 500) / 100;
    const minAmt = Math.min(expatAmt, lawyerAmt);
    const maxAmt = Math.max(expatAmt, lawyerAmt);
    const range = minAmt === maxAmt ? `$${minAmt}` : `$${minAmt}-${maxAmt}`;
    const providerAmt = (config?.commissionProviderCallAmount ?? 500) / 100;
    const n1Amt = (config?.commissionN1CallAmount ?? 100) / 100;
    return { callAmountRange: range, providerCallAmount: providerAmt, n1CallAmount: n1Amt };
  }, [config?.commissionClientCallAmountExpat, config?.commissionClientCallAmountLawyer, config?.commissionProviderCallAmount, config?.commissionN1CallAmount]);

  // Collapse on scroll down, expand on scroll up
  // Uses a delta threshold to prevent feedback loops caused by the sticky bar's
  // own height change shifting content and re-triggering scroll events.
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;
      // Only react to intentional scrolls (delta > threshold), not layout-shift micro-scrolls
      if (delta > 12 && currentScrollY > 80) {
        setCollapsed(true);
      } else if (delta < -12) {
        setCollapsed(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCopy = useCallback(async (url: string, type: 'client' | 'recruitment' | 'provider') => {
    if (!url?.trim()) {
      toast.error(intl.formatMessage({ id: 'chatter.bar.linkNotReady', defaultMessage: 'Link not ready yet, please wait...' }));
      return;
    }
    const success = await copyToClipboard(url);
    if (success) {
      if (type === 'client') {
        setCopiedClient(true);
        setTimeout(() => setCopiedClient(false), 2000);
      } else if (type === 'recruitment') {
        setCopiedRecruitment(true);
        setTimeout(() => setCopiedRecruitment(false), 2000);
      } else {
        setCopiedProvider(true);
        setTimeout(() => setCopiedProvider(false), 2000);
      }
      localStorage.setItem('chatter_link_copied', Date.now().toString());
      navigator.vibrate?.(50);
      const msgIds: Record<string, { id: string; defaultMessage: string }> = {
        client: { id: 'chatter.bar.copiedClient', defaultMessage: 'Client link copied!' },
        recruitment: { id: 'chatter.bar.copiedRecruitment', defaultMessage: 'Team recruitment link copied!' },
        provider: { id: 'chatter.bar.copiedProvider', defaultMessage: 'Provider recruitment link copied!' },
      };
      toast.success(intl.formatMessage(msgIds[type]));
    } else {
      toast.error(
        intl.formatMessage({
          id: 'chatter.bar.copyError',
          defaultMessage: 'Unable to copy the link',
        })
      );
    }
  }, [intl]);

  const handleShare = useCallback(async (url: string, type: 'client' | 'recruitment' | 'provider') => {
    if (!url?.trim()) {
      toast.error(intl.formatMessage({ id: 'chatter.bar.linkNotReady', defaultMessage: 'Link not ready yet, please wait...' }));
      return;
    }
    const titles: Record<string, string> = {
      client: 'SOS Expat - Assistance',
      recruitment: 'SOS Expat - Rejoins notre équipe',
      provider: 'SOS Expat - Devenez prestataire',
    };
    const title = titles[type];

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        localStorage.setItem('chatter_link_shared', Date.now().toString());
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          toast.error(
            intl.formatMessage({
              id: 'chatter.bar.shareError',
              defaultMessage: 'Error while sharing',
            })
          );
        }
      }
    } else {
      toast(
        intl.formatMessage({
          id: 'chatter.bar.shareFallback',
          defaultMessage: 'Copy the link and share it manually',
        }),
        { icon: 'ℹ️' }
      );
    }
  }, [intl]);

  // ── COLLAPSED: minimal bar with compact copy buttons (provider hidden on narrow screens) ──
  if (collapsed) {
    return (
      <div className="sticky top-20 z-30 bg-slate-900/90 backdrop-blur-xl border-b border-white/[0.06] will-change-[height] transition-all duration-200">
        <div className="max-w-7xl mx-auto px-3 py-1.5 flex items-center justify-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleCopy(clientShareUrl ?? '', 'client')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              copiedClient
                ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-300'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 active:bg-emerald-500/20'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            {copiedClient ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="whitespace-nowrap">
              <FormattedMessage id="chatter.bar.collapsedClient" defaultMessage="Client {amount}/call" values={{ amount: callAmountRange }} />
            </span>
          </button>

          <button
            onClick={() => handleCopy(recruitmentShareUrl ?? '', 'recruitment')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              copiedRecruitment
                ? 'bg-violet-500/20 border border-violet-400/30 text-violet-300'
                : 'bg-violet-500/10 border border-violet-500/20 text-violet-300 active:bg-violet-500/20'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            {copiedRecruitment ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="whitespace-nowrap">
              <FormattedMessage id="chatter.bar.collapsedRecruitment" defaultMessage="Team ${amount}/call" values={{ amount: n1CallAmount }} />
            </span>
          </button>

          {/* Provider button hidden on narrow screens (<400px) to prevent overflow */}
          <button
            onClick={() => handleCopy(providerShareUrl ?? '', 'provider')}
            className={`hidden min-[400px]:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              copiedProvider
                ? 'bg-teal-500/20 border border-teal-400/30 text-teal-300'
                : 'bg-teal-500/10 border border-teal-500/20 text-teal-300 active:bg-teal-500/20'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 shrink-0" />
            {copiedProvider ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="whitespace-nowrap">
              <FormattedMessage id="chatter.bar.collapsedProvider" defaultMessage="Provider ${amount}/call" values={{ amount: providerCallAmount }} />
            </span>
          </button>

          <button
            onClick={() => { setCollapsed(false); lastScrollY.current = window.scrollY + 200; }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
            aria-label="Expand"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── EXPANDED: full link cards ──
  return (
    <div className="sticky top-20 z-30 bg-slate-900/90 backdrop-blur-xl border-b border-white/[0.06] will-change-[height] transition-all duration-200">
      <div className="max-w-7xl mx-auto px-3 py-2">
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-2">

          {/* ── Client link card ── */}
          <LinkCard
            type="client"
            icon={<Users className="w-4 h-4 text-emerald-400" />}
            label={intl.formatMessage({ id: 'chatter.bar.clientLabel', defaultMessage: 'Client link' })}
            commission={callAmountRange}
            commissionSuffix={intl.formatMessage({ id: 'chatter.bar.perCall', defaultMessage: '/call' })}
            code={affiliateCodeClient}
            count={totalClients}
            copied={copiedClient}
            colorScheme="emerald"
            onCopy={() => handleCopy(clientShareUrl ?? '', 'client')}
            onShare={() => handleShare(clientShareUrl ?? '', 'client')}
            tooltip={intl.formatMessage({
              id: 'chatter.bar.clientTooltip',
              defaultMessage: 'Share this link. When someone calls a provider through your link, you earn {amount} per paid call.',
            }, { amount: callAmountRange })}
          />

          {/* Divider (desktop) */}
          <div className="hidden sm:block w-px bg-white/[0.06] shrink-0 self-stretch" />

          {/* ── Recruitment link card ── */}
          <LinkCard
            type="recruitment"
            icon={<UserPlus className="w-4 h-4 text-violet-400" />}
            label={intl.formatMessage({ id: 'chatter.bar.recruitmentLabel', defaultMessage: 'Recruit team' })}
            commission={`$${n1CallAmount}`}
            commissionSuffix={intl.formatMessage({ id: 'chatter.bar.perCall', defaultMessage: '/call' })}
            code={affiliateCodeRecruitment}
            count={totalRecruits}
            copied={copiedRecruitment}
            colorScheme="violet"
            onCopy={() => handleCopy(recruitmentShareUrl ?? '', 'recruitment')}
            onShare={() => handleShare(recruitmentShareUrl ?? '', 'recruitment')}
            tooltip={intl.formatMessage({
              id: 'chatter.bar.recruitmentTooltip',
              defaultMessage: 'Share this link to recruit other chatters to your team. When your recruits generate calls, you earn ${amount} per call (N1 commission, forever).',
            }, { amount: `$${n1CallAmount}` })}
          />

          {/* Divider (desktop) */}
          <div className="hidden sm:block w-px bg-white/[0.06] shrink-0 self-stretch" />

          {/* ── Provider link card ── */}
          <LinkCard
            type="provider"
            icon={<Briefcase className="w-4 h-4 text-teal-400" />}
            label={intl.formatMessage({ id: 'chatter.bar.providerLabel', defaultMessage: 'Recruit providers' })}
            commission={`$${providerCallAmount}`}
            commissionSuffix={intl.formatMessage({ id: 'chatter.bar.perCall', defaultMessage: '/call' })}
            code={affiliateCodeProvider}
            count={totalProviderRecruits}
            copied={copiedProvider}
            colorScheme="teal"
            onCopy={() => handleCopy(providerShareUrl ?? '', 'provider')}
            onShare={() => handleShare(providerShareUrl ?? '', 'provider')}
            tooltip={intl.formatMessage({
              id: 'chatter.bar.providerTooltip',
              defaultMessage: 'Share this link with providers (lawyers, expats). When they sign up and receive paid calls, you earn ${amount} per call for 6 months.',
            }, { amount: providerCallAmount })}
          />
        </div>

        {/* Collapse button (mobile only) */}
        <button
          onClick={() => setCollapsed(true)}
          className="sm:hidden w-full flex items-center justify-center gap-1 pt-1 pb-0.5 text-[10px] text-slate-500 active:text-slate-300 transition-colors"
        >
          <ChevronUp className="w-3 h-3" />
          <FormattedMessage id="chatter.bar.collapse" defaultMessage="Collapse" />
        </button>
      </div>
    </div>
  );
};

/** Reusable link card for client / recruitment */
interface LinkCardProps {
  type: 'client' | 'recruitment' | 'provider';
  icon: React.ReactNode;
  label: string;
  commission: string;
  commissionSuffix: string;
  code: string;
  count: number;
  copied: boolean;
  colorScheme: 'emerald' | 'violet' | 'teal';
  onCopy: () => void;
  onShare: () => void;
  tooltip: string;
}

function LinkCard({
  icon,
  label,
  commission,
  commissionSuffix,
  code,
  count,
  copied,
  colorScheme,
  onCopy,
  onShare,
  tooltip,
}: LinkCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTooltip) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTooltip]);

  const colorMap = {
    emerald: {
      cardBg: 'bg-emerald-500/[0.08] border-emerald-500/[0.15]',
      badgeBg: 'bg-emerald-500/20 border-emerald-500/25 text-emerald-300',
      commColor: 'text-emerald-300',
      btnCopied: 'bg-emerald-500/30 border-emerald-400/40 text-emerald-200',
      btnDefault: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 active:bg-emerald-500/30',
      shareBtn: 'text-emerald-400/70 active:text-emerald-300 active:bg-emerald-500/10',
    },
    violet: {
      cardBg: 'bg-violet-500/[0.08] border-violet-500/[0.15]',
      badgeBg: 'bg-violet-500/20 border-violet-500/25 text-violet-300',
      commColor: 'text-violet-300',
      btnCopied: 'bg-violet-500/30 border-violet-400/40 text-violet-200',
      btnDefault: 'bg-violet-500/20 border-violet-500/30 text-violet-300 active:bg-violet-500/30',
      shareBtn: 'text-violet-400/70 active:text-violet-300 active:bg-violet-500/10',
    },
    teal: {
      cardBg: 'bg-teal-500/[0.08] border-teal-500/[0.15]',
      badgeBg: 'bg-teal-500/20 border-teal-500/25 text-teal-300',
      commColor: 'text-teal-300',
      btnCopied: 'bg-teal-500/30 border-teal-400/40 text-teal-200',
      btnDefault: 'bg-teal-500/20 border-teal-500/30 text-teal-300 active:bg-teal-500/30',
      shareBtn: 'text-teal-400/70 active:text-teal-300 active:bg-teal-500/10',
    },
  };
  const { cardBg, badgeBg, commColor, btnCopied, btnDefault, shareBtn } = colorMap[colorScheme];

  return (
    <div className={`flex-1 min-w-0 rounded-xl border ${cardBg} px-3 py-2`} ref={showTooltip ? tooltipRef : undefined}>
      {/* Row 1: Label + commission + count */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.06] shrink-0">
          {icon}
        </div>
        <span className="text-xs text-slate-300 font-medium truncate">{label}</span>
        <span className={`text-sm font-bold ${commColor} shrink-0`}>
          {commission}<span className="text-[10px] font-medium opacity-70">{commissionSuffix}</span>
        </span>
        {count > 0 && (
          <span className={`shrink-0 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full border text-[10px] font-bold leading-none ${badgeBg}`}>
            {count}
          </span>
        )}
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className="ml-auto text-slate-500 hover:text-slate-300 transition-colors shrink-0 p-1"
          aria-label="Info"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
          </svg>
        </button>
      </div>

      {/* Row 2: Code + action buttons */}
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 font-mono text-sm font-bold tracking-wide text-slate-100 truncate px-2.5 py-1.5 rounded-lg bg-white/[0.06]">
          {code}
        </code>

        {/* Copy */}
        <button
          onClick={onCopy}
          className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-colors shrink-0 ${
            copied ? btnCopied : btnDefault
          }`}
          aria-label={copied ? 'Copied' : 'Copy'}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>

        {/* Share */}
        <button
          onClick={onShare}
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors shrink-0 ${shareBtn}`}
          aria-label="Share"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Tooltip (expandable) */}
      {showTooltip && (
        <p className="mt-2 p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-slate-300 leading-relaxed">
          {tooltip}
        </p>
      )}
    </div>
  );
}

export default StickyAffiliateBar;
