import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Copy, Check, Share2, Users, UserPlus, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { copyToClipboard } from '@/utils/clipboard';

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
  const { callAmountRange, n1CallAmount, providerCallAmount } = useMemo(() => {
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
        { icon: 'i' }
      );
    }
  }, [intl]);

  const toggleTooltip = useCallback((type: 'client' | 'recruitment') => {
    setTooltipOpen((prev) => (prev === type ? null : type));
  }, []);

  // Collapsed mini version — two copy buttons with labels
  if (collapsed) {
    return (
      <div className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-white/[0.06] dark:bg-slate-900/80 dark:backdrop-blur-xl dark:border-white/[0.06] light:bg-white/80 light:backdrop-blur-xl light:border-slate-200/50 transition-all duration-500 ease-out">
        <div className="max-w-7xl mx-auto px-3 py-1.5 flex items-center justify-center gap-3">
          {/* Client collapsed button */}
          <button
            onClick={() => handleCopy(clientShareUrl ?? '', 'client')}
            className={`group flex items-center gap-2 px-4 py-2 min-h-[48px] min-w-[48px] rounded-xl transition-all duration-300 ${
              copiedClient
                ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-300'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/30'
            }`}
            title={intl.formatMessage({
              id: 'chatter.bar.clientTooltip',
              defaultMessage: 'Share this link. When someone calls a provider through your link, you earn $3 to $5 per paid call.',
            })}
          >
            <Users className="w-4 h-4 shrink-0" />
            {copiedClient ? <Check className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
            <span className="text-xs font-semibold whitespace-nowrap">
              <span className="sm:hidden">
                <FormattedMessage id="chatter.bar.clientLinkMobile" defaultMessage="Earn" />
                {' '}{callAmountRange}
              </span>
              <span className="hidden sm:inline">
                <FormattedMessage
                  id="chatter.bar.collapsedClient"
                  defaultMessage="Client {amount}/call"
                  values={{ amount: callAmountRange }}
                />
              </span>
            </span>
          </button>

          {/* Recruitment collapsed button */}
          <button
            onClick={() => handleCopy(recruitmentShareUrl ?? '', 'recruitment')}
            className={`group flex items-center gap-2 px-4 py-2 min-h-[48px] min-w-[48px] rounded-xl transition-all duration-300 ${
              copiedRecruitment
                ? 'bg-violet-500/20 border border-violet-400/30 text-violet-300'
                : 'bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/20 hover:border-violet-400/30'
            }`}
            title={intl.formatMessage({
              id: 'chatter.bar.recruitmentTooltip',
              defaultMessage: 'Share this link with providers (lawyers, expats). When they sign up and receive calls, you earn $5 per call for 6 months.',
            })}
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            {copiedRecruitment ? <Check className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
            <span className="text-xs font-semibold whitespace-nowrap">
              <span className="sm:hidden">
                <FormattedMessage id="chatter.bar.recruitmentLinkMobile" defaultMessage="Recruit" />
                {` $${providerCallAmount}`}
              </span>
              <span className="hidden sm:inline">
                <FormattedMessage
                  id="chatter.bar.collapsedRecruitment"
                  defaultMessage="Recruit ${amount}/call"
                  values={{ amount: providerCallAmount }}
                />
              </span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-white/[0.06] dark:bg-slate-900/80 dark:backdrop-blur-xl dark:border-white/[0.06] light:bg-white/80 light:backdrop-blur-xl light:border-slate-200/50 transition-all duration-500 ease-out">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5">
        <div className="flex flex-col sm:flex-row sm:items-stretch sm:gap-4 gap-2">

          {/* ── Client link section ── */}
          <div
            className="flex-1 min-w-0 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/[0.12] px-3.5 py-2.5 transition-all duration-300"
            ref={tooltipOpen === 'client' ? tooltipRef : undefined}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Icon + label */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20">
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs text-emerald-300/70 font-medium leading-tight">
                    <FormattedMessage id="chatter.bar.clientLabel" defaultMessage="Client link" />
                  </span>
                  {/* Prominent commission display */}
                  <span className="text-sm font-bold text-emerald-300 leading-tight relative">
                    <span className="relative z-10">
                      <FormattedMessage
                        id="chatter.bar.clientEarn"
                        defaultMessage="Earn {amount}/call"
                        values={{ amount: callAmountRange }}
                      />
                    </span>
                    <span className="absolute inset-0 bg-emerald-400/10 blur-lg rounded-full" aria-hidden="true" />
                  </span>
                </div>
                <span className="text-xs text-emerald-300 font-semibold sm:hidden">
                  <FormattedMessage id="chatter.bar.clientLinkMobile" defaultMessage="Earn" />
                </span>
                <button
                  onClick={() => toggleTooltip('client')}
                  className="flex items-center justify-center w-6 h-6 min-w-[48px] min-h-[48px] rounded-full text-emerald-400/60 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                  aria-label="Info"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Affiliate code */}
              <code className="font-mono text-base font-bold tracking-wider text-slate-100 truncate min-w-0 px-2.5 py-1 rounded-lg bg-white/[0.06]">
                {affiliateCodeClient}
              </code>

              {/* Client count badge */}
              {totalClients > 0 && (
                <span className="shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-[11px] font-bold leading-none">
                  {totalClients}
                </span>
              )}

              {/* Mobile commission badge */}
              <div className="sm:hidden shrink-0 relative">
                <span className="text-sm font-bold text-emerald-300 relative z-10">
                  {callAmountRange}
                  <span className="text-[10px] font-medium text-emerald-400/70">
                    <FormattedMessage id="chatter.bar.perCall" defaultMessage="/call" />
                  </span>
                </span>
                <span className="absolute inset-0 bg-emerald-400/15 blur-md rounded-full" aria-hidden="true" />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0 ml-auto">
                <button
                  onClick={() => handleCopy(clientShareUrl ?? '', 'client')}
                  className={`flex items-center justify-center w-[48px] h-[48px] sm:w-9 sm:h-9 rounded-xl transition-all duration-300 ${
                    copiedClient
                      ? 'border border-emerald-400/40 text-emerald-300 bg-transparent'
                      : `bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-400/40 ${showPulse ? 'animate-pulse' : ''}`
                  }`}
                  aria-label={intl.formatMessage({ id: 'chatter.bar.copyClientAriaLabel', defaultMessage: 'Copy client link' })}
                >
                  {copiedClient ? <Check className="w-4.5 h-4.5" /> : <Copy className="w-4.5 h-4.5" />}
                </button>
                <button
                  onClick={() => handleShare(clientShareUrl ?? '', 'client')}
                  className="flex items-center justify-center w-[48px] h-[48px] sm:w-9 sm:h-9 rounded-xl text-emerald-400/60 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-300"
                  aria-label={intl.formatMessage({ id: 'chatter.bar.shareClientAriaLabel', defaultMessage: 'Share client link' })}
                >
                  {sharedClient ? <Check className="w-4.5 h-4.5" /> : <Share2 className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Tooltip */}
            {tooltipOpen === 'client' && (
              <div className="mt-2.5 p-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/[0.12] text-xs text-emerald-200/90 leading-relaxed backdrop-blur-sm">
                <FormattedMessage
                  id="chatter.bar.clientTooltip"
                  defaultMessage="Share this link. When someone calls a provider through your link, you earn $3 to $5 per paid call."
                />
              </div>
            )}
          </div>

          {/* Divider (desktop only) */}
          <div className="hidden sm:block w-px bg-white/[0.06] shrink-0 self-stretch" />

          {/* ── Recruitment link section ── */}
          <div
            className="flex-1 min-w-0 rounded-2xl bg-violet-500/[0.08] border border-violet-500/[0.12] px-3.5 py-2.5 transition-all duration-300"
            ref={tooltipOpen === 'recruitment' ? tooltipRef : undefined}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Icon + label */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-500/20">
                  <UserPlus className="w-4 h-4 text-violet-400" />
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs text-violet-300/70 font-medium leading-tight">
                    <FormattedMessage id="chatter.bar.recruitmentLabel" defaultMessage="Recruitment link" />
                  </span>
                  {/* Prominent commission display */}
                  <span className="text-sm font-bold text-violet-300 leading-tight relative">
                    <span className="relative z-10">
                      <FormattedMessage
                        id="chatter.bar.recruitmentEarn"
                        defaultMessage="Earn ${amount}/call · 6 months"
                        values={{ amount: providerCallAmount }}
                      />
                    </span>
                    <span className="absolute inset-0 bg-violet-400/10 blur-lg rounded-full" aria-hidden="true" />
                  </span>
                </div>
                <span className="text-xs text-violet-300 font-semibold sm:hidden">
                  <FormattedMessage id="chatter.bar.recruitmentLinkMobile" defaultMessage="Recruit" />
                </span>
                <button
                  onClick={() => toggleTooltip('recruitment')}
                  className="flex items-center justify-center w-6 h-6 min-w-[48px] min-h-[48px] rounded-full text-violet-400/60 hover:text-violet-300 hover:bg-violet-500/10 transition-colors"
                  aria-label="Info"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Affiliate code */}
              <code className="font-mono text-base font-bold tracking-wider text-slate-100 truncate min-w-0 px-2.5 py-1 rounded-lg bg-white/[0.06]">
                {affiliateCodeRecruitment}
              </code>

              {/* Recruit count badge */}
              {totalRecruits > 0 && (
                <span className="shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/20 text-violet-300 text-[11px] font-bold leading-none">
                  {totalRecruits}
                </span>
              )}

              {/* Mobile commission badge */}
              <div className="sm:hidden shrink-0 relative">
                <span className="text-sm font-bold text-violet-300 relative z-10">
                  {`$${providerCallAmount}`}
                  <span className="text-[10px] font-medium text-violet-400/70">
                    <FormattedMessage id="chatter.bar.perCall" defaultMessage="/call" />
                  </span>
                </span>
                <span className="absolute inset-0 bg-violet-400/15 blur-md rounded-full" aria-hidden="true" />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0 ml-auto">
                <button
                  onClick={() => handleCopy(recruitmentShareUrl ?? '', 'recruitment')}
                  className={`flex items-center justify-center w-[48px] h-[48px] sm:w-9 sm:h-9 rounded-xl transition-all duration-300 ${
                    copiedRecruitment
                      ? 'border border-violet-400/40 text-violet-300 bg-transparent'
                      : `bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 hover:border-violet-400/40 ${showPulse ? 'animate-pulse' : ''}`
                  }`}
                  aria-label={intl.formatMessage({ id: 'chatter.bar.copyRecruitmentAriaLabel', defaultMessage: 'Copy recruitment link' })}
                >
                  {copiedRecruitment ? <Check className="w-4.5 h-4.5" /> : <Copy className="w-4.5 h-4.5" />}
                </button>
                <button
                  onClick={() => handleShare(recruitmentShareUrl ?? '', 'recruitment')}
                  className="flex items-center justify-center w-[48px] h-[48px] sm:w-9 sm:h-9 rounded-xl text-violet-400/60 hover:text-violet-300 hover:bg-violet-500/10 transition-all duration-300"
                  aria-label={intl.formatMessage({ id: 'chatter.bar.shareRecruitmentAriaLabel', defaultMessage: 'Share recruitment link' })}
                >
                  {sharedRecruitment ? <Check className="w-4.5 h-4.5" /> : <Share2 className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Tooltip */}
            {tooltipOpen === 'recruitment' && (
              <div className="mt-2.5 p-3 rounded-xl bg-violet-500/[0.08] border border-violet-500/[0.12] text-xs text-violet-200/90 leading-relaxed backdrop-blur-sm">
                <FormattedMessage
                  id="chatter.bar.recruitmentTooltip"
                  defaultMessage="Share this link with providers (lawyers, expats). When they sign up and receive calls, you earn $5 per call for 6 months."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickyAffiliateBar;
