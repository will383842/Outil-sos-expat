import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Copy, Check, Share2, Users, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { copyToClipboard } from '@/utils/clipboard';

const StickyAffiliateBar: React.FC = () => {
  const intl = useIntl();
  const { clientShareUrl, recruitmentShareUrl, dashboardData } = useChatterData();

  const [copiedClient, setCopiedClient] = useState(false);
  const [copiedRecruitment, setCopiedRecruitment] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const lastScrollY = useRef(0);

  const affiliateCodeClient = dashboardData?.chatter?.affiliateCodeClient ?? '';
  const affiliateCodeRecruitment = dashboardData?.chatter?.affiliateCodeRecruitment ?? '';
  const totalClients = dashboardData?.chatter?.totalClients ?? 0;
  const totalRecruits = dashboardData?.chatter?.totalRecruits ?? 0;

  // Dynamic commission amounts from config (cents -> dollars)
  const config = dashboardData?.config;
  const { callAmountRange, providerCallAmount } = useMemo(() => {
    const expatAmt = (config?.commissionClientCallAmountExpat ?? 300) / 100;
    const lawyerAmt = (config?.commissionClientCallAmountLawyer ?? 500) / 100;
    const minAmt = Math.min(expatAmt, lawyerAmt);
    const maxAmt = Math.max(expatAmt, lawyerAmt);
    const range = minAmt === maxAmt ? `$${minAmt}` : `$${minAmt}-${maxAmt}`;
    const providerAmt = (config?.commissionProviderCallAmount ?? 500) / 100;
    return { callAmountRange: range, providerCallAmount: providerAmt };
  }, [config?.commissionClientCallAmountExpat, config?.commissionClientCallAmountLawyer, config?.commissionProviderCallAmount]);

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

  const handleCopy = useCallback(async (url: string, type: 'client' | 'recruitment') => {
    const success = await copyToClipboard(url);
    if (success) {
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
        intl.formatMessage(
          {
            id: type === 'client' ? 'chatter.bar.copiedClient' : 'chatter.bar.copiedRecruitment',
            defaultMessage: type === 'client' ? 'Client link copied!' : 'Recruitment link copied!',
          }
        )
      );
    } else {
      toast.error(
        intl.formatMessage({
          id: 'chatter.bar.copyError',
          defaultMessage: 'Unable to copy the link',
        })
      );
    }
  }, [intl]);

  const handleShare = useCallback(async (url: string, type: 'client' | 'recruitment') => {
    const title = type === 'client'
      ? 'SOS Expat - Assistance'
      : 'SOS Expat - Rejoins-nous';

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

  // ── COLLAPSED: minimal bar with two compact copy buttons ──
  if (collapsed) {
    return (
      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-3 py-1.5 flex items-center justify-center gap-2">
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
              <FormattedMessage id="chatter.bar.collapsedRecruitment" defaultMessage="Recruit ${amount}/call" values={{ amount: providerCallAmount }} />
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
    <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border-b border-white/[0.06]">
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
              defaultMessage: 'Share this link. When someone calls a provider through your link, you earn $3 to $5 per paid call.',
            })}
          />

          {/* Divider (desktop) */}
          <div className="hidden sm:block w-px bg-white/[0.06] shrink-0 self-stretch" />

          {/* ── Recruitment link card ── */}
          <LinkCard
            type="recruitment"
            icon={<UserPlus className="w-4 h-4 text-violet-400" />}
            label={intl.formatMessage({ id: 'chatter.bar.recruitmentLabel', defaultMessage: 'Recruitment link' })}
            commission={`$${providerCallAmount}`}
            commissionSuffix={intl.formatMessage({ id: 'chatter.bar.perCall', defaultMessage: '/call' })}
            code={affiliateCodeRecruitment}
            count={totalRecruits}
            copied={copiedRecruitment}
            colorScheme="violet"
            onCopy={() => handleCopy(recruitmentShareUrl ?? '', 'recruitment')}
            onShare={() => handleShare(recruitmentShareUrl ?? '', 'recruitment')}
            tooltip={intl.formatMessage({
              id: 'chatter.bar.recruitmentTooltip',
              defaultMessage: 'Share this link with providers (lawyers, expats). When they sign up and receive calls, you earn $5 per call for 6 months.',
            })}
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
  type: 'client' | 'recruitment';
  icon: React.ReactNode;
  label: string;
  commission: string;
  commissionSuffix: string;
  code: string;
  count: number;
  copied: boolean;
  colorScheme: 'emerald' | 'violet';
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

  const isEmerald = colorScheme === 'emerald';

  const cardBg = isEmerald ? 'bg-emerald-500/[0.08] border-emerald-500/[0.15]' : 'bg-violet-500/[0.08] border-violet-500/[0.15]';
  const badgeBg = isEmerald ? 'bg-emerald-500/20 border-emerald-500/25 text-emerald-300' : 'bg-violet-500/20 border-violet-500/25 text-violet-300';
  const commColor = isEmerald ? 'text-emerald-300' : 'text-violet-300';
  const btnCopied = isEmerald ? 'bg-emerald-500/30 border-emerald-400/40 text-emerald-200' : 'bg-violet-500/30 border-violet-400/40 text-violet-200';
  const btnDefault = isEmerald
    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 active:bg-emerald-500/30'
    : 'bg-violet-500/20 border-violet-500/30 text-violet-300 active:bg-violet-500/30';
  const shareBtn = isEmerald ? 'text-emerald-400/70 active:text-emerald-300 active:bg-emerald-500/10' : 'text-violet-400/70 active:text-violet-300 active:bg-violet-500/10';

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
