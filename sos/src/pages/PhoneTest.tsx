/**
 * Page de test pour le composant IntlPhoneInput
 * URL: http://localhost:5173/phone-test
 */

import React, { useState } from 'react';
import IntlPhoneInput from '@/components/forms-data/IntlPhoneInput';
import { smartNormalizePhone } from '@/utils/phone';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const PhoneTest: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);

  const handlePhoneChange = (value: string) => {
    console.log('📱 Phone changed:', value);
    setPhone(value);
  };

  const runTests = () => {
    const testCases = [
      '0612345678',
      '06 12 34 56 78',
      '+33612345678',
      '0033612345678',
      '33612345678',
      '070000000',
      '+337000000000000',
      '07911123456',
      '00447911123456',
    ];

    const results = testCases.map(input => {
      const result = smartNormalizePhone(input, 'FR');
      const parsed = parsePhoneNumberFromString(input, 'FR');
      return {
        input,
        output: result.e164,
        valid: result.ok,
        reason: result.reason,
        parsed: parsed?.number,
      };
    });

    setTestResults(results);
  };

  const currentResult = smartNormalizePhone(phone, 'FR');
  const currentParsed = parsePhoneNumberFromString(phone);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          🧪 Test IntlPhoneInput
        </h1>

        {/* Composant de test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Composant IntlPhoneInput</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro de téléphone
            </label>
            <IntlPhoneInput
              value={phone}
              onChange={handlePhoneChange}
              defaultCountry="fr"
              placeholder="+33 6 12 34 56 78"
            />
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">État actuel :</h3>
            <div className="space-y-1 text-sm font-mono">
              <div>Valeur : <span className="text-blue-600">{phone || '(vide)'}</span></div>
              <div>
                E.164 :
                <span className={currentResult.ok ? 'text-green-600' : 'text-red-600'}>
                  {currentResult.e164 || '(invalide)'}
                </span>
              </div>
              <div>
                Valide :
                <span className={currentResult.ok ? 'text-green-600' : 'text-red-600'}>
                  {currentResult.ok ? '✅ Oui' : '❌ Non'}
                </span>
              </div>
              {!currentResult.ok && currentResult.reason && (
                <div className="text-red-600">
                  Raison : {currentResult.reason}
                </div>
              )}
              {currentParsed && (
                <>
                  <div>Pays détecté : {currentParsed.country || 'N/A'}</div>
                  <div>Numéro national : {currentParsed.nationalNumber || 'N/A'}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tests automatiques */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Tests automatiques</h2>

          <button
            onClick={runTests}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-4"
          >
            Lancer les tests
          </button>

          {testResults.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Input
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Output E.164
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {testResults.map((result, index) => (
                    <tr key={index} className={result.valid ? 'bg-green-50' : 'bg-red-50'}>
                      <td className="px-4 py-2 text-sm font-mono">{result.input}</td>
                      <td className="px-4 py-2 text-sm font-mono">
                        {result.output || result.reason}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {result.valid ? (
                          <span className="text-green-600">✅ Valide</span>
                        ) : (
                          <span className="text-red-600">❌ Invalide</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Instructions de test</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
            <li>Testez en tapant : <code>0612345678</code> (format national français)</li>
            <li>Testez en tapant : <code>0033612345678</code> (format international avec 00)</li>
            <li>Testez en tapant : <code>+33612345678</code> (format international avec +)</li>
            <li>Testez en tapant : <code>33612345678</code> (format international sans +)</li>
            <li>Testez en tapant : <code>070000000</code> (numéro invalide)</li>
            <li>Changez le pays dans le dropdown et testez d'autres formats</li>
            <li>Vérifiez que le numéro se normalise automatiquement pendant la saisie</li>
            <li>Vérifiez que le numéro se normalise au blur (clic en dehors)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PhoneTest;
