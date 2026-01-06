// Script pour tester la sync de forcedAIAccess vers Outil
// Usage: node testSyncAccess.js

const fetch = require('node-fetch');

const OUTIL_ENDPOINT = 'https://syncprovider-r47sd2uiqa-ew.a.run.app';
const API_KEY = 'd8b045fa6fc42e12bc113a8bcbabaf1b5e56db4df8a56b2bb2a3845ee5efc656';

async function testSync() {
  console.log('Testing sync with API key (trimmed)...');
  console.log('API Key length:', API_KEY.length);

  const payload = {
    id: 'DfDbWASBaeaVEZrqg6Wlcd3zpYX2',
    forcedAIAccess: true,
    freeTrialUntil: null
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(OUTIL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY.trim()  // Explicitly trim
      },
      body: JSON.stringify(payload)
    });

    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response body:', text);

    if (response.status === 200) {
      console.log('✅ Sync successful!');
    } else {
      console.log('❌ Sync failed');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSync();
