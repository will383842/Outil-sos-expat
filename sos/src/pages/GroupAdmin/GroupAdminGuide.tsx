/**
 * GroupAdminGuide - Integration guide for Facebook groups
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/layout/SEOHead';
import { useLocaleNavigate } from '@/multilingual-system';
import { BookOpen, CheckCircle, ChevronDown, ArrowRight, Pin, Image, MessageCircle, Calendar, Target } from 'lucide-react';

const GroupAdminGuide: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const [openSection, setOpenSection] = useState<number | null>(0);

  const sections = [
    {
      title: 'Getting Started',
      icon: <Target className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p>Welcome to the SOS-Expat Group Admin Program! Here's how to maximize your earnings:</p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Get your unique affiliate links from the Dashboard</li>
            <li>Choose ready-to-use posts from our Resources section</li>
            <li>Share with your group members</li>
            <li>Earn $15 for every client who books through your link</li>
          </ol>
        </div>
      ),
    },
    {
      title: 'Pinning Your First Post',
      icon: <Pin className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p>A pinned post is the most effective way to promote SOS-Expat to your members:</p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Go to <button onClick={() => navigate('/group-admin/posts')} className="text-indigo-600 underline">Posts</button> and find the "Welcome Announcement" template</li>
            <li>Click "Copy Post" - your affiliate link is automatically included</li>
            <li>Paste in your Facebook group</li>
            <li>Click the three dots on your post and select "Pin to top"</li>
            <li>Keep it pinned for maximum visibility</li>
          </ol>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <p className="text-amber-800 text-sm">
              <strong>Pro tip:</strong> Update your pinned post monthly with fresh content to keep engagement high.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Using Images & Banners',
      icon: <Image className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p>Visual content gets more engagement. Here's how to use our resources:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li><strong>Cover Banners (820x312px):</strong> Perfect for your group cover image</li>
            <li><strong>Post Images (1200x630px):</strong> Add to your posts for more visibility</li>
            <li><strong>Story Images (1080x1920px):</strong> Share on Facebook Stories</li>
            <li><strong>Partner Badges:</strong> Add to your group description</li>
          </ul>
          <button
            onClick={() => navigate('/group-admin/ressources')}
            className="inline-flex items-center gap-2 text-indigo-600 font-medium mt-2"
          >
            Browse Resources <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ),
    },
    {
      title: 'Welcome Messages for New Members',
      icon: <MessageCircle className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p>Automate your outreach with welcome messages:</p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Go to your Facebook Group settings</li>
            <li>Find "Membership Questions" or "Welcome Post" settings</li>
            <li>Copy our welcome message template from Resources</li>
            <li>New members will automatically see your affiliate link</li>
          </ol>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
            <p className="text-green-800 text-sm">
              <strong>Remember:</strong> Your members get $5 off their first consultation through your link - mention this benefit!
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Posting Schedule',
      icon: <Calendar className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p>Consistent posting drives more conversions. Recommended schedule:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">Weekly</p>
              <p className="text-sm text-gray-600">Share the "Weekly Reminder" post every Monday morning</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">Monthly</p>
              <p className="text-sm text-gray-600">Update your pinned post with fresh testimonials</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">When Relevant</p>
              <p className="text-sm text-gray-600">Post the "Emergency Help" template when members ask about visas/legal issues</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">Q&A Posts</p>
              <p className="text-sm text-gray-600">Share Q&A posts to address common concerns</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Recruiting Other Admins',
      icon: <Target className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p>Earn $5 for each admin you recruit:</p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Get your recruitment link from the Dashboard or Referrals page</li>
            <li>Reach out to admins of other expat/travel groups</li>
            <li>Share the benefits: $15/client, ready-made tools, 9 languages</li>
            <li>When they sign up through your link, you earn $5</li>
          </ol>
          <p className="text-gray-600 mt-4">
            The recruitment bonus is valid for 6 months from signup.
          </p>
          <button
            onClick={() => navigate('/group-admin/filleuls')}
            className="inline-flex items-center gap-2 text-indigo-600 font-medium mt-2"
          >
            View Referrals <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <SEOHead description="Manage your Facebook group with SOS-Expat" title={intl.formatMessage({ id: 'groupadmin.guide.title', defaultMessage: 'Guide | SOS-Expat Group Admin' })} />

      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                <FormattedMessage id="groupadmin.guide.heading" defaultMessage="Integration Guide" />
              </h1>
              <p className="text-gray-600">
                <FormattedMessage id="groupadmin.guide.subtitle" defaultMessage="Step-by-step guide to maximize your earnings" />
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {sections.map((section, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenSection(openSection === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                      {section.icon}
                    </div>
                    <span className="font-bold text-gray-900">{section.title}</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${openSection === index ? 'rotate-180' : ''}`} />
                </button>
                {openSection === index && (
                  <div className="p-5 pt-0 border-t border-gray-100">
                    <div className="pt-4">{section.content}</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Links */}
          <div className="mt-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
            <h2 className="font-bold text-lg mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button onClick={() => navigate('/group-admin/tableau-de-bord')} className="bg-white/10 hover:bg-white/20 rounded-lg p-3 text-sm font-medium">
                Dashboard
              </button>
              <button onClick={() => navigate('/group-admin/ressources')} className="bg-white/10 hover:bg-white/20 rounded-lg p-3 text-sm font-medium">
                Resources
              </button>
              <button onClick={() => navigate('/group-admin/posts')} className="bg-white/10 hover:bg-white/20 rounded-lg p-3 text-sm font-medium">
                Posts
              </button>
              <button onClick={() => navigate('/group-admin/paiements')} className="bg-white/10 hover:bg-white/20 rounded-lg p-3 text-sm font-medium">
                Payments
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GroupAdminGuide;
