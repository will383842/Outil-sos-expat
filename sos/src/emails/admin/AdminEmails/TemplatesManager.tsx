// TemplatesManager.tsx
import React from 'react';
import DOMPurify from 'dompurify';
// import {
//   bookingConfirmation,
//   contactReply,
//   newsletter,
//   promoCode,
//   reminderOnline,
// } from '../../templates';

import { bookingConfirmation } from '@/emails/templates/bookingConfirmation';
import { contactReply } from '@/emails/templates/contactReply';
import { newsletter } from '@/emails/templates/newsletter';
import { promoCode } from '@/emails/templates/promoCode';
import { reminderOnline } from '@/emails/templates/reminderOnline';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const templates: Array<{ name: string; render: (data: any) => string; exampleData: Record<string, string> }> = [
  {
    name: '📅 Confirmation de RDV',
    render: bookingConfirmation,
    exampleData: {
      firstName: 'Alice',
      date: '01/08/2025 à 14h30',
      providerName: 'Me Jean Dupont',
      serviceTitle: 'Visa étudiant',
    },
  },
  {
    name: '📨 Réponse message contact',
    render: contactReply,
    exampleData: {
      firstName: 'Alice',
      userMessage: 'Bonjour, j’ai besoin d’aide pour mon dossier.',
      adminReply: 'Merci pour votre message. Voici comment procéder...',
    },
  },
  {
    name: '📰 Newsletter',
    render: newsletter,
    exampleData: {
      greeting: 'Bonjour à tous 👋',
      content: 'Voici les nouveautés du mois de juillet.',
    },
  },
  {
    name: '🏷️ Code promo',
    render: promoCode,
    exampleData: {
      firstName: 'Alice',
      code: 'WELCOME15',
      discount: '-15 % sur votre prochain appel',
      expiration: '30/08/2025',
    },
  },
  {
    name: '⏰ Rappel prestataire en ligne',
    render: reminderOnline,
    exampleData: {
      firstName: 'Alice',
      time: '2 heures',
    },
  },
];

const TemplatesManager: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">🧱 Aperçu des templates disponibles</h2>
      <p className="text-gray-600 mb-6">
        Voici un aperçu en temps réel de tous les templates d'emails intégrés.
      </p>

      <div className="space-y-8">
        {templates.map((tpl, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-md shadow-sm bg-white p-4"
          >
            <h3 className="text-lg font-bold mb-2">{tpl.name}</h3>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(tpl.render(tpl.exampleData)) }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplatesManager;


