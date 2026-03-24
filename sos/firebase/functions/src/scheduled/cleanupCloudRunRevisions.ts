/**
 * Cleanup Cloud Run Revisions
 *
 * Supprime automatiquement les anciennes révisions Cloud Run dans les 3 régions
 * pour éviter d'atteindre la limite de 4000 révisions par région.
 *
 * Stratégie: garde les 3 dernières révisions par service, supprime le reste.
 * Cloud Run refuse nativement de supprimer une révision qui sert du trafic.
 *
 * FIXES vs version précédente:
 * - Mémoire 256→512 MiB (crash OOM avec 264 MiB lors du listage de 200 services)
 * - Timeout 540→3600s (65k suppressions séquentielles = 3h+, maintenant parallèles)
 * - Suppressions parallèles par batch de 20 (au lieu de séquentiel)
 * - Pagination complète des révisions (pageSize=200 + nextPageToken)
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
const DELETE_CONCURRENCY = 20; // suppressions en parallèle

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
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}: ${await res.text()}`);
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

async function listAllRevisionsForService(
  region: string,
  service: string,
  token: string
): Promise<RevisionInfo[]> {
  const parent = `projects/${PROJECT_ID}/locations/${region}/services/${service}`;
  const allRevisions: RevisionInfo[] = [];
  let pageToken: string | undefined;

  do {
    const pageParam = pageToken ? `&pageToken=${pageToken}` : '';
    const url = `${BASE_URL}/${parent}/revisions?pageSize=200${pageParam}`;
    const data = await apiGet(url, token);
    const revisions = (data.revisions as Array<{ name: string; createTime: string }>) || [];
    for (const r of revisions) {
      allRevisions.push({
        fullName: r.name,
        shortName: r.name.split('/').pop() as string,
        createTime: r.createTime,
      });
    }
    pageToken = data.nextPageToken as string | undefined;
  } while (pageToken);

  // Tri: plus récent en premier
  return allRevisions.sort(
    (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
  );
}

// Exécute des tâches async par batch de `concurrency` en parallèle
async function runInBatches<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}

export const cleanupCloudRunRevisions = scheduler.onSchedule(
  {
    schedule: '0 3 * * 0', // Chaque dimanche à 3h00
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '512MiB',
    cpu: 0.5,
    timeoutSeconds: 1800, // 30 min max autorisé pour scheduled functions
  },
  async () => {
    console.log('='.repeat(70));
    console.log('[CLOUD-RUN-CLEANUP] Demarrage nettoyage revisions Cloud Run');
    console.log(`   Projet: ${PROJECT_ID}`);
    console.log(`   Regions: ${REGIONS.join(', ')}`);
    console.log(`   Revisions conservees par service: ${REVISIONS_TO_KEEP}`);
    console.log(`   Parallelisme suppressions: ${DELETE_CONCURRENCY}`);
    console.log('='.repeat(70));

    let token: string;
    try {
      token = await getAuthToken();
    } catch (authError) {
      console.error('[CLOUD-RUN-CLEANUP] Impossible d\'obtenir un token GCP:', authError);
      return;
    }

    const stats = {
      servicesScanned: 0,
      revisionsDeleted: 0,
      revisionsSkipped: 0,
      errors: 0,
    };

    for (const region of REGIONS) {
      console.log(`\n[${region}] Listage des services...`);

      let services: string[];
      try {
        services = await listServicesInRegion(region, token);
        console.log(`[${region}] ${services.length} services trouves`);
      } catch (err) {
        console.error(`[${region}] Erreur listage services:`, err);
        stats.errors++;
        continue;
      }

      for (const service of services) {
        stats.servicesScanned++;

        let revisions: RevisionInfo[];
        try {
          revisions = await listAllRevisionsForService(region, service, token);
        } catch (err) {
          console.error(`[${region}/${service}] Erreur listage revisions:`, err);
          stats.errors++;
          continue;
        }

        const toDelete = revisions.slice(REVISIONS_TO_KEEP);
        if (toDelete.length === 0) continue;

        console.log(`[${region}/${service}] ${revisions.length} revisions -> suppression de ${toDelete.length}`);

        // Suppression parallèle par batch
        const deleteTasks = toDelete.map((rev) => async () => {
          const url = `${BASE_URL}/${rev.fullName}`;
          const result = await apiDelete(url, token);
          if (result.ok) {
            stats.revisionsDeleted++;
          } else if (result.error?.includes('400') || result.error?.includes('serving')) {
            stats.revisionsSkipped++;
          } else {
            stats.errors++;
            console.warn(`[${region}/${service}] Erreur suppression ${rev.shortName}: ${result.error}`);
          }
        });

        await runInBatches(deleteTasks, DELETE_CONCURRENCY);
      }

      console.log(`[${region}] Termine. Supprimes: ${stats.revisionsDeleted}, Skips: ${stats.revisionsSkipped}`);
    }

    // Rapport final
    console.log('\n' + '='.repeat(70));
    console.log('[CLOUD-RUN-CLEANUP] RAPPORT FINAL');
    console.log('='.repeat(70));
    console.log(`   Services scannes:      ${stats.servicesScanned}`);
    console.log(`   Revisions supprimees:  ${stats.revisionsDeleted}`);
    console.log(`   Revisions skippees:    ${stats.revisionsSkipped}`);
    console.log(`   Erreurs:               ${stats.errors}`);
    console.log('='.repeat(70));

    if (stats.revisionsDeleted > 0 || stats.errors > 0) {
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
