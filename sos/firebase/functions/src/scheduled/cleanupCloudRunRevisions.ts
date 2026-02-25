/**
 * Cleanup Cloud Run Revisions
 *
 * Supprime automatiquement les anciennes révisions Cloud Run dans les 3 régions
 * pour éviter d'atteindre la limite de 4000 révisions par région.
 *
 * Stratégie: garde les 3 dernières révisions par service, supprime le reste.
 * Cloud Run refuse nativement de supprimer une révision qui sert du trafic.
 *
 * Exécution: Chaque dimanche à 3h00 (Europe/Paris)
 */

import * as scheduler from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = 'sos-urgently-ac307';
const REGIONS = ['europe-west1', 'us-central1', 'europe-west3'];
const REVISIONS_TO_KEEP = 3;
const BASE_URL = 'https://run.googleapis.com/v2';

async function getAuthToken(): Promise<string> {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token as string;
}

async function apiGet(url: string, token: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function apiDelete(url: string, token: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) return { ok: true };
  const text = await res.text();
  return { ok: false, error: `HTTP ${res.status}: ${text}` };
}

async function listServicesInRegion(region: string, token: string): Promise<string[]> {
  const url = `${BASE_URL}/projects/${PROJECT_ID}/locations/${region}/services?pageSize=1000`;
  const data = await apiGet(url, token);
  const services = (data.services as Array<{ name: string }>) || [];
  return services.map((s) => s.name.split('/').pop() as string);
}

interface RevisionInfo {
  fullName: string;
  shortName: string;
  createTime: string;
}

async function listRevisionsForService(
  region: string,
  service: string,
  token: string
): Promise<RevisionInfo[]> {
  const parent = `projects/${PROJECT_ID}/locations/${region}/services/${service}`;
  const url = `${BASE_URL}/${parent}/revisions?pageSize=200`;
  const data = await apiGet(url, token);
  const revisions = (data.revisions as Array<{ name: string; createTime: string }>) || [];

  return revisions
    .map((r) => ({
      fullName: r.name,
      shortName: r.name.split('/').pop() as string,
      createTime: r.createTime,
    }))
    .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
  // Triées du plus récent au plus ancien
}

export const cleanupCloudRunRevisions = scheduler.onSchedule(
  {
    schedule: '0 3 * * 0', // Chaque dimanche à 3h00
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '128MiB',
    cpu: 0.083,
    timeoutSeconds: 540, // 9 min — peut y avoir beaucoup de services
  },
  async () => {
    console.log('='.repeat(70));
    console.log('🧹 [CLOUD-RUN-CLEANUP] Démarrage nettoyage révisions Cloud Run');
    console.log(`   Projet: ${PROJECT_ID}`);
    console.log(`   Régions: ${REGIONS.join(', ')}`);
    console.log(`   Révisions conservées par service: ${REVISIONS_TO_KEEP}`);
    console.log('='.repeat(70));

    let token: string;
    try {
      token = await getAuthToken();
    } catch (authError) {
      console.error('❌ Impossible d\'obtenir un token GCP:', authError);
      return;
    }

    const stats = {
      servicesScanned: 0,
      revisionsDeleted: 0,
      revisionsSkipped: 0, // serving traffic ou autre erreur
      errors: 0,
    };

    for (const region of REGIONS) {
      console.log(`\n📍 Région: ${region}`);
      console.log('-'.repeat(50));

      let services: string[];
      try {
        services = await listServicesInRegion(region, token);
        console.log(`   ${services.length} services trouvés`);
      } catch (err) {
        console.error(`   ❌ Erreur listage services ${region}:`, err);
        stats.errors++;
        continue;
      }

      for (const service of services) {
        stats.servicesScanned++;

        let revisions: RevisionInfo[];
        try {
          revisions = await listRevisionsForService(region, service, token);
        } catch (err) {
          console.error(`   ❌ Erreur listage révisions ${service}:`, err);
          stats.errors++;
          continue;
        }

        const toDelete = revisions.slice(REVISIONS_TO_KEEP);
        if (toDelete.length === 0) continue;

        console.log(`   🔍 ${service}: ${revisions.length} révisions → suppression de ${toDelete.length}`);

        for (const rev of toDelete) {
          const url = `${BASE_URL}/${rev.fullName}`;
          const result = await apiDelete(url, token);

          if (result.ok) {
            stats.revisionsDeleted++;
            console.log(`      ✅ Supprimé: ${rev.shortName}`);
          } else {
            // Cloud Run refuse si la révision sert du trafic → normal
            if (result.error?.includes('400') || result.error?.includes('serving')) {
              stats.revisionsSkipped++;
              console.log(`      ⏭️  Skip (serving): ${rev.shortName}`);
            } else {
              stats.errors++;
              console.warn(`      ⚠️  Erreur ${rev.shortName}: ${result.error}`);
            }
          }
        }
      }
    }

    // ===== RAPPORT FINAL =====
    console.log('\n' + '='.repeat(70));
    console.log('🧹 [CLOUD-RUN-CLEANUP] RAPPORT FINAL');
    console.log('='.repeat(70));
    console.log(`   Services scannés:      ${stats.servicesScanned}`);
    console.log(`   Révisions supprimées:  ${stats.revisionsDeleted}`);
    console.log(`   Révisions skippées:    ${stats.revisionsSkipped}`);
    console.log(`   Erreurs:               ${stats.errors}`);
    console.log('='.repeat(70));

    // Alerte admin si beaucoup de suppressions
    if (stats.revisionsDeleted > 0) {
      const db = admin.firestore();
      await db.collection('system_logs').add({
        type: 'cleanup_cloud_run_revisions',
        ...stats,
        regions: REGIONS,
        revisionsKept: REVISIONS_TO_KEEP,
        timestamp: admin.firestore.Timestamp.now(),
      });
    }
  }
);
