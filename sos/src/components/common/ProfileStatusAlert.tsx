import React from 'react';
import { AlertTriangle, Clock, Mail } from 'lucide-react';
import { useIntl } from 'react-intl';
import { User } from '../../contexts/types';

interface ProfileStatusAlertProps {
  user: User;
}

const ProfileStatusAlert: React.FC<ProfileStatusAlertProps> = ({ user }) => {
  const intl = useIntl();

  // Si le statut n'est pas défini, on suppose que le profil est approuvé (pour la compatibilité)
  if (!user.approvalStatus || user.approvalStatus === 'approved') {
    return null; // Ne rien afficher si le profil est approuvé
  }

  // Profil en attente de validation
  if (user.approvalStatus === 'pending') {
    return (
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-orange-500 rounded-lg p-6 mb-6 shadow-md">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-orange-900 mb-2 flex items-center gap-2">
              <span>⏳</span>
              {intl.formatMessage({ id: 'profileValidation.pending.title' })}
            </h3>
            <p className="text-orange-800 mb-4 leading-relaxed">
              {intl.formatMessage({ id: 'profileValidation.pending.description' })}
            </p>
            <div className="bg-white bg-opacity-60 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-orange-900 mb-2">
                {intl.formatMessage({ id: 'profileValidation.pending.whatHappensNow' })}
              </h4>
              <ul className="space-y-2 text-sm text-orange-800">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>{intl.formatMessage({ id: 'profileValidation.pending.steps.teamVerifies' })}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>{intl.formatMessage({ id: 'profileValidation.pending.steps.emailNotification' })}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>{intl.formatMessage({ id: 'profileValidation.pending.steps.profileVisible' })}</span>
                </li>
              </ul>
            </div>
            <div className="flex items-center gap-2 text-sm text-orange-700">
              <Mail className="w-4 h-4" />
              <span>
                {intl.formatMessage({ id: 'profileValidation.pending.validationTime' })} <strong>24-48 heures</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Profil rejeté
  if (user.approvalStatus === 'rejected') {
    return (
      <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 rounded-lg p-6 mb-6 shadow-md">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-900 mb-2 flex items-center gap-2">
              <span>❌</span>
              {intl.formatMessage({ id: 'profileValidation.rejected.title' })}
            </h3>
            <p className="text-red-800 mb-4 leading-relaxed">
              {intl.formatMessage({ id: 'profileValidation.rejected.description' })}
            </p>
            
            {user.rejectionReason && (
              <div className="bg-white bg-opacity-60 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-red-900 mb-2">
                  {intl.formatMessage({ id: 'profileValidation.rejected.rejectionReason' })}
                </h4>
                <p className="text-sm text-red-800 leading-relaxed">
                  {user.rejectionReason}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:support@sos-expat.com"
                className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Mail className="w-5 h-5" />
                {intl.formatMessage({ id: 'profileValidation.rejected.contactSupport' })}
              </a>
              <button
                onClick={() => window.location.href = '/dashboard/profile/edit'}
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-red-600 border-2 border-red-600 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {intl.formatMessage({ id: 'profileValidation.rejected.editProfile' })}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ProfileStatusAlert;