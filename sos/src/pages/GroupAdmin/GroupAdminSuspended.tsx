/**
 * GroupAdminSuspended - Page shown when account is suspended
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import GroupAdminDashboardLayout from '@/components/GroupAdmin/Layout/GroupAdminDashboardLayout';
import { AlertTriangle, Mail, Phone } from 'lucide-react';

const GroupAdminSuspended: React.FC = () => {
  return (
    <GroupAdminDashboardLayout>
      <div className="flex items-center justify-center p-4 py-20">
        <div className="bg-white dark:bg-white/5 rounded-2xl shadow-xl dark:shadow-none p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            <FormattedMessage id="groupadmin.suspended.title" defaultMessage="Account Suspended" />
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            <FormattedMessage
              id="groupadmin.suspended.message"
              defaultMessage="Your Group Admin account has been temporarily suspended. This may be due to a violation of our terms of service or suspicious activity."
            />
          </p>

          <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              <FormattedMessage
                id="groupadmin.suspended.appealInfo"
                defaultMessage="If you believe this is an error, please contact our support team:"
              />
            </p>
            <div className="space-y-2">
              <a
                href="mailto:support@sos-expat.com"
                className="flex items-center justify-center gap-2 text-indigo-600 hover:text-indigo-700"
              >
                <Mail className="w-4 h-4" />
                support@sos-expat.com
              </a>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="groupadmin.suspended.note"
              defaultMessage="Please include your account email and group name in your appeal."
            />
          </p>
        </div>
      </div>
    </GroupAdminDashboardLayout>
  );
};

export default GroupAdminSuspended;
