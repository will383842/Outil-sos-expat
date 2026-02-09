import { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'express';
import { twilioCallWebhook, twilioRecordingWebhook } from '../Webhooks/twilioWebhooks';
import { twilioConferenceWebhook } from '../Webhooks/TwilioConferenceWebhook';

export const unifiedWebhook = onRequest(
  {
    region: 'europe-west1',
    // P0 CRITICAL FIX: Allow unauthenticated access for Twilio webhooks (Cloud Run requires explicit public access)
    invoker: "public",
    memory: '256MiB',
    cpu: 0.25,
    maxInstances: 3,
    minInstances: 0,
    concurrency: 1,
  },
  async (req: Request, res: Response) => {
    const path = (req.path || '').toLowerCase();
    const body = (req as any).body || {};

    const isRecording = path.includes('record') || 'RecordingSid' in body || 'RecordingUrl' in body;
    const isConference = path.includes('conference') || 'ConferenceSid' in body || 'ConferenceName' in body;

    if (isRecording) {
      return (twilioRecordingWebhook as any)(req, res);
    } else if (isConference) {
      return (twilioConferenceWebhook as any)(req, res);
    } else {
      return (twilioCallWebhook as any)(req, res);
    }
  }
);
