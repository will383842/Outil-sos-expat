import React, { useState, useCallback, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Copy, Check, Share2, ChevronDown, ChevronUp, Link2, Phone, Users, Award, UserPlus, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { copyToClipboard } from '@/utils/clipboard';

/**
 * StickyAffiliateBar — Unified single link version
 *
 * Shows ONE universal /r/CODE link at the top of the Chatter dashboard.
 * Collapsed: compact copy button with earnings hint.
 * Expanded: full link display + earnings breakdown from config.
 */
const StickyAffiliateBar: React.FC = () => {
  const intl = useIntl();
  const { dashboardData } = useChatterData();

  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 640);

  const chatter = dashboardData?.chatter;
  const config = dashboardData?.config;
  const affiliateCode = chatter?.affiliateCode || chatter?.affiliateCodeClient || '';
  const shareUrl = affiliateCode ? `${window.location.origin}/r/${affiliateCode}` : '';
  const isCaptain = !!(chatter as any)?.isCaptain;

  // Dynamic commission amounts from config (cents → dollars)
  const earnings = useMemo(() => {
    const lawyerAmt = (config?.commissionClientCallAmountLawyer ?? config?.commissionClientCallAmountExpat ?? 1000) / 100;
    const expatAmt = (config?.commissionClientCallAmountExpat ?? config?.commissionClientCallAmountLawyer ?? 1000) / 100;
    const clientCall = lawyerAmt === expatAmt ? `$${lawyerAmt}` : `$${Math.min(lawyerAmt, expatAmt)}-${Math.max(lawyerAmt, expatAmt)}`;
    const n1 = (config?.commissionN1CallAmount ?? 100) / 100;
    const n2 = (config?.commissionN2CallAmount ?? 50) / 100;
    const activation = (config?.commissionActivationBonusAmount ?? 500) / 100;
    return { clientCall, n1, n2, activation };
  }, [config]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) {
      toast.error(intl.formatMessage({ id: 'chatter.bar.linkNotReady', defaultMessage: 'Link not ready yet, please wait...' }));
      return;
    }
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      navigator.vibrate?.(50);
      toast.success(intl.formatMessage({ id: 'unified.link.copied', defaultMessage: 'Link copied!' }));
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(intl.formatMessage({ id: 'chatter.bar.copyError', defaultMessage: 'Unable to copy the link' }));
    }
  }, [shareUrl, intl]);

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SOS Expat', url: shareUrl });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          toast.error(intl.formatMessage({ id: 'chatter.bar.shareError', defaultMessage: 'Error while sharing' }));
        }
      }
    } else {
      await handleCopy();
    }
  }, [shareUrl, intl, handleCopy]);

  if (!affiliateCode) return null;

  return (
    <div className="sticky top-20 z-30 bg-slate-900/90 backdrop-blur-xl border-b border-white/[0.06]">
      {/* ── COLLAPSED: compact single link copy ── */}
      {collapsed && (
        <div className="max-w-7xl mx-auto px-3 py-1.5 flex items-center justify-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <code className="font-mono text-xs text-slate-200 truncate max-w-[200px]">
            /r/{affiliateCode}
          </code>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              copied
                ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-300'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 active:bg-emerald-500/20'
            }`}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <FormattedMessage id="chatter.bar.copy" defaultMessage="Copy" />
          </button>
          <span className="text-[10px] text-emerald-300/70 font-medium whitespace-nowrap">
            {earnings.clientCall}<FormattedMessage id="chatter.bar.perCallShort" defaultMessage="/call" />
          </span>
          <button
            onClick={() => setCollapsed(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
            aria-label="Expand"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── EXPANDED: full unified link + earnings ── */}
      {!collapsed && (
        <div className="max-w-7xl mx-auto px-3 py-3">
          {/* Link section */}
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs text-slate-300 font-medium">
              <FormattedMessage id="chatter.bar.yourLink" defaultMessage="Your unique link" />
            </span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 min-w-0 font-mono text-sm font-bold tracking-wide text-slate-100 truncate px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08]">
              {shareUrl}
            </code>
            <button
              onClick={handleCopy}
              className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-colors shrink-0 ${
                copied
                  ? 'bg-emerald-500/30 border-emerald-400/40 text-emerald-200'
                  : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 active:bg-emerald-500/30'
              }`}
              aria-label={copied ? 'Copied' : 'Copy'}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-emerald-400/70 active:text-emerald-300 active:bg-emerald-500/10 transition-colors shrink-0"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Earnings breakdown - compact grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
            <EarningChip icon={<Phone className="w-3 h-3" />} label={intl.formatMessage({ id: 'chatter.bar.clientCall', defaultMessage: 'Client call' })} value={earnings.clientCall} color="emerald" />
            <EarningChip icon={<Users className="w-3 h-3" />} label={intl.formatMessage({ id: 'chatter.bar.n1Call', defaultMessage: 'N1 call' })} value={`$${earnings.n1}`} color="violet" />
            <EarningChip icon={<Users className="w-3 h-3" />} label={intl.formatMessage({ id: 'chatter.bar.n2Call', defaultMessage: 'N2 call' })} value={`$${earnings.n2}`} color="slate" />
            <EarningChip icon={<Award className="w-3 h-3" />} label={intl.formatMessage({ id: 'chatter.bar.activation', defaultMessage: 'Activation' })} value={`$${earnings.activation}`} color="amber" />
          </div>

          {/* Info + collapse */}
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-slate-400">
              <FormattedMessage
                id="chatter.bar.oneLinkInfo"
                defaultMessage="One link for everything. Your earnings depend on what your referral does."
              />
            </p>
            <button
              onClick={() => setCollapsed(true)}
              className="flex items-center gap-0.5 text-[10px] text-slate-500 active:text-slate-300 transition-colors p-1"
            >
              <ChevronUp className="w-3 h-3" />
              <FormattedMessage id="chatter.bar.collapse" defaultMessage="Collapse" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function EarningChip({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    violet: 'bg-violet-500/10 border-violet-500/20 text-violet-300',
    slate: 'bg-white/[0.04] border-white/[0.08] text-slate-300',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
  };

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border ${colorMap[color] || colorMap.slate}`}>
      {icon}
      <span className="truncate opacity-70">{label}</span>
      <span className="font-bold ml-auto shrink-0">{value}</span>
    </div>
  );
}

export default StickyAffiliateBar;
