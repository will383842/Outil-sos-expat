/**
 * GroupAdminReferrals - Recruited admins page
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import GroupAdminDashboardLayout from '@/components/GroupAdmin/Layout/GroupAdminDashboardLayout';
import SEOHead from '@/components/layout/SEOHead';
import {  httpsCallable  } from 'firebase/functions';
import { functionsWest2 } from '@/config/firebase';
import { Users, Copy, CheckCircle, Loader2, ExternalLink, DollarSign, Clock, AlertTriangle, Info } from 'lucide-react';
import { GroupAdminRecruit, getGroupAdminRecruitmentLink, formatGroupAdminAmount, FirebaseDate } from '@/types/groupAdmin';

/**
 * Calculate remaining time until commission window ends
 */
const getTimeRemaining = (endDate: FirebaseDate): { days: number; months: number; isExpiringSoon: boolean; isExpired: boolean } => {
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { days: 0, months: 0, isExpiringSoon: false, isExpired: true };
  }

  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const isExpiringSoon = diffDays < 30;

  return { days: diffDays, months: diffMonths, isExpiringSoon, isExpired: false };
};

const GroupAdminReferrals: React.FC = () => {
  const intl = useIntl();
  const [loading, setLoading] = useState(true);
  const [recruits, setRecruits] = useState<GroupAdminRecruit[]>([]);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const getDashboard = httpsCallable(functionsWest2, 'getGroupAdminDashboard');
      const result = await getDashboard({});
      const data = result.data as { profile: { affiliateCodeRecruitment: string }; recentRecruits: GroupAdminRecruit[] };
      setAffiliateCode(data.profile.affiliateCodeRecruitment);
      setRecruits(data.recentRecruits);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    const link = getGroupAdminRecruitmentLink(affiliateCode);
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <GroupAdminDashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </GroupAdminDashboardLayout>
    );
  }

  const recruitmentLink = getGroupAdminRecruitmentLink(affiliateCode);

  return (
    <GroupAdminDashboardLayout>
      <SEOHead description="Manage your group with SOS-Expat" title={intl.formatMessage({ id: 'groupAdmin.referrals.title', defaultMessage: 'Referrals | SOS-Expat Group Admin' })} />

      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl dark:text-white md:text-3xl font-bold mb-2">
            <FormattedMessage id="groupAdmin.referrals.heading" defaultMessage="Recruited Admins" />
          </h1>
          <p className="text-gray-600 dark:text-gray-600 mb-8">
            <FormattedMessage id="groupAdmin.referrals.subtitle" defaultMessage="Earn $5 when your recruit reaches $50 in earnings" />
          </p>

          {/* Recruitment Link Card */}
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6" />
              <span className="font-bold">
                <FormattedMessage id="groupAdmin.referrals.yourLink" defaultMessage="Your Recruitment Link" />
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-3 mb-4">
              <input
                type="text"
                readOnly
                value={recruitmentLink}
                className="flex-1 bg-transparent text-white font-mono text-sm outline-none"
              />
              <button
                onClick={copyLink}
                className="bg-white text-purple-600 p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                title={intl.formatMessage({ id: 'groupAdmin.referrals.copyLink', defaultMessage: 'Copy link' })}
              >
                {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <a
                href={recruitmentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-white text-purple-600 font-semibold py-3 px-4 rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                <FormattedMessage id="groupAdmin.referrals.viewInvitationPage" defaultMessage="View Invitation Page" />
              </a>
              <button
                onClick={copyLink}
                className="flex-1 bg-white/20 backdrop-blur-sm text-white font-semibold py-3 px-4 rounded-lg hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <FormattedMessage id="groupAdmin.referrals.linkCopied" defaultMessage="Link Copied!" />
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <FormattedMessage id="groupAdmin.referrals.copyLinkButton" defaultMessage="Copy Link" />
                  </>
                )}
              </button>
            </div>

            <p className="text-purple-100 text-sm">
              <FormattedMessage id="groupAdmin.referrals.shareLinkDesc" defaultMessage="Share this link with other community/group admins. Earn $5 when your recruit reaches $50 in earnings." />
            </p>
          </div>

          {/* Commission Window Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border dark:border-blue-800/50 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-800 dark:text-blue-300 font-medium">
                  <FormattedMessage id="groupAdmin.referrals.commissionWindowInfo.title" defaultMessage="6-Month Commission Window" />
                </p>
                <p className="text-blue-600 dark:text-blue-400 mt-1">
                  <FormattedMessage
                    id="groupAdmin.referrals.commissionWindowInfo.description"
                    defaultMessage="You have 6 months from the recruitment date to earn the $5 commission. The commission is paid when your recruit reaches $50 in total earnings within this window."
                  />
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-white/5 rounded-xl p-4 shadow-sm dark:shadow-none text-center">
              <p className="text-2xl dark:text-white font-bold">{recruits.length}</p>
              <p className="text-sm dark:text-gray-700">
                <FormattedMessage id="groupAdmin.referrals.totalRecruited" defaultMessage="Total Recruited" />
              </p>
            </div>
            <div className="bg-white dark:bg-white/5 rounded-xl p-4 shadow-sm dark:shadow-none text-center">
              <p className="text-2xl font-bold">
                {formatGroupAdminAmount(recruits.filter((r) => r.commissionPaid).length * 500)}
              </p>
              <p className="text-sm dark:text-gray-700">
                <FormattedMessage id="groupAdmin.referrals.earned" defaultMessage="Earned" />
              </p>
            </div>
            <div className="bg-white dark:bg-white/5 rounded-xl p-4 shadow-sm dark:shadow-none text-center col-span-2 md:col-span-1">
              <p className="text-2xl font-bold">
                {recruits.filter((r) => !r.commissionPaid).length}
              </p>
              <p className="text-sm dark:text-gray-700">
                <FormattedMessage id="groupAdmin.referrals.pending" defaultMessage="Pending" />
              </p>
            </div>
          </div>

          {/* Recruits List */}
          <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm dark:shadow-none p-6">
            <h2 className="font-bold text-lg dark:text-white mb-4">
              <FormattedMessage id="groupAdmin.referrals.recruitedAdmins" defaultMessage="Recruited Admins" />
            </h2>
            {recruits.length > 0 ? (
              <div className="space-y-4">
                {recruits.map((recruit) => {
                  const timeRemaining = getTimeRemaining(recruit.commissionWindowEnd);
                  const windowEndDate = recruit.commissionWindowEnd instanceof Date
                    ? recruit.commissionWindowEnd
                    : new Date(recruit.commissionWindowEnd);

                  return (
                    <div key={recruit.id} className="flex sm:flex-row sm:items-center justify-between py-4 border-b dark:border-white/10 last:border-0 gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{recruit.recruitedName}</p>
                        <p className="text-sm dark:text-gray-700">{recruit.recruitedGroupName}</p>
                        <p className="text-xs dark:text-gray-400">
                          <FormattedMessage
                            id="groupAdmin.referrals.recruitedOn"
                            defaultMessage="Recruited on {date}"
                            values={{ date: new Date(recruit.recruitedAt).toLocaleDateString() }}
                          />
                        </p>
                      </div>

                      {/* Commission Window Status */}
                      <div className="flex sm:items-end gap-1">
                        {recruit.commissionPaid ? (
                          <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                            <CheckCircle className="w-4 h-4" />
                            <FormattedMessage id="groupAdmin.referrals.paid" defaultMessage="$5 Paid" />
                          </span>
                        ) : timeRemaining.isExpired ? (
                          <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400 font-medium">
                            <Clock className="w-4 h-4" />
                            <FormattedMessage id="groupAdmin.referrals.windowExpired" defaultMessage="Window Expired" />
                          </span>
                        ) : (
                          <>
                            <span className="text-amber-600 font-medium">
                              <FormattedMessage id="groupAdmin.referrals.pendingCommission" defaultMessage="Pending" />
                            </span>
                            <div className={`inline-flex items-center gap-1 text-xs ${timeRemaining.isExpiringSoon ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                              {timeRemaining.isExpiringSoon ? (
                                <AlertTriangle className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              {timeRemaining.days > 30 ? (
                                <FormattedMessage
                                  id="groupAdmin.referrals.monthsRemaining"
                                  defaultMessage="{months} months remaining"
                                  values={{ months: timeRemaining.months }}
                                />
                              ) : (
                                <FormattedMessage
                                  id="groupAdmin.referrals.daysRemaining"
                                  defaultMessage="{days} days remaining"
                                  values={{ days: timeRemaining.days }}
                                />
                              )}
                            </div>
                          </>
                        )}
                        <p className="text-xs dark:text-gray-400">
                          <FormattedMessage
                            id="groupAdmin.referrals.windowEnds"
                            defaultMessage="Window ends: {date}"
                            values={{ date: windowEndDate.toLocaleDateString() }}
                          />
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-700 dark:text-gray-300 mx-auto mb-4" />
                <p className="text-gray-700 dark:text-gray-700 mb-2">
                  <FormattedMessage id="groupAdmin.referrals.noRecruits" defaultMessage="No recruits yet" />
                </p>
                <p className="text-sm dark:text-gray-400">
                  <FormattedMessage id="groupAdmin.referrals.shareToEarn" defaultMessage="Share your link to start earning!" />
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </GroupAdminDashboardLayout>
  );
};

export default GroupAdminReferrals;
