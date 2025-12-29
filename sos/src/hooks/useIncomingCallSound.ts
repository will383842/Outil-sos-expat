// src/hooks/useIncomingCallSound.ts
// Hook pour gérer les sonneries d'appels entrants pour les prestataires
// =============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Configuration
const INCOMING_CALL_CONFIG = {
  // Durée de la sonnerie en ms (15 secondes par défaut)
  RING_DURATION_MS: 15000,
  // Volume de la sonnerie (0.0 - 1.0)
  RING_VOLUME: 0.5,
  // Intervalle de répétition de la sonnerie en ms
  RING_REPEAT_INTERVAL_MS: 3000,
  // Clé localStorage pour les préférences
  SOUND_ENABLED_KEY: 'incomingCallSoundEnabled',
  VIBRATION_ENABLED_KEY: 'incomingCallVibrationEnabled',
};

// Types
interface IncomingCall {
  id: string;
  clientId: string;
  clientName?: string;
  serviceType: string;
  status: string;
  createdAt: Timestamp;
}

interface UseIncomingCallSoundOptions {
  userId: string | undefined;
  isOnline: boolean;
  isProvider: boolean;
  enabled?: boolean;
}

interface UseIncomingCallSoundReturn {
  hasIncomingCall: boolean;
  incomingCall: IncomingCall | null;
  isSoundEnabled: boolean;
  isVibrationEnabled: boolean;
  toggleSound: () => void;
  toggleVibration: () => void;
  stopRinging: () => void;
  testRingtone: () => void;
}

// Créer le contexte audio une seule fois (singleton)
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Générer une sonnerie avec Web Audio API
const generateRingtone = (ctx: AudioContext, duration: number = 1): void => {
  const now = ctx.currentTime;

  // Créer les oscillateurs pour une sonnerie téléphonique classique
  const oscillator1 = ctx.createOscillator();
  const oscillator2 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  // Fréquences classiques de sonnerie téléphonique (440Hz et 480Hz)
  oscillator1.frequency.setValueAtTime(440, now);
  oscillator2.frequency.setValueAtTime(480, now);
  oscillator1.type = 'sine';
  oscillator2.type = 'sine';

  // Connecter les oscillateurs au gain node
  oscillator1.connect(gainNode);
  oscillator2.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Volume
  const volume = parseFloat(localStorage.getItem('incomingCallVolume') || '0.5');
  gainNode.gain.setValueAtTime(volume * 0.3, now);

  // Pattern de sonnerie: on-off-on-off
  const patternDuration = duration;
  for (let i = 0; i < 2; i++) {
    const startTime = now + i * 0.5;
    gainNode.gain.setValueAtTime(volume * 0.3, startTime);
    gainNode.gain.setValueAtTime(0, startTime + 0.2);
  }

  // Démarrer et arrêter les oscillateurs
  oscillator1.start(now);
  oscillator2.start(now);
  oscillator1.stop(now + patternDuration);
  oscillator2.stop(now + patternDuration);
};

// Jouer le fichier audio de sonnerie
const playRingtoneFile = async (): Promise<HTMLAudioElement | null> => {
  try {
    const audio = new Audio('/sounds/incoming-call.wav');
    audio.volume = parseFloat(localStorage.getItem('incomingCallVolume') || '0.5');
    audio.loop = true;
    await audio.play();
    return audio;
  } catch (error) {
    console.warn('Impossible de jouer le fichier audio, utilisation du fallback Web Audio API:', error);
    // Fallback: utiliser Web Audio API
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      generateRingtone(ctx, 1);
    } catch (e) {
      console.error('Erreur lors de la génération de la sonnerie:', e);
    }
    return null;
  }
};

// Vibration (pour mobiles)
const triggerVibration = (): void => {
  if ('vibrate' in navigator) {
    // Pattern de vibration: vibrer 200ms, pause 100ms, répéter
    navigator.vibrate([200, 100, 200, 100, 200]);
  }
};

// Hook principal
export const useIncomingCallSound = ({
  userId,
  isOnline,
  isProvider,
  enabled = true,
}: UseIncomingCallSoundOptions): UseIncomingCallSoundReturn => {
  const [hasIncomingCall, setHasIncomingCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    return localStorage.getItem(INCOMING_CALL_CONFIG.SOUND_ENABLED_KEY) !== 'false';
  });
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(() => {
    return localStorage.getItem(INCOMING_CALL_CONFIG.VIBRATION_ENABLED_KEY) !== 'false';
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Arrêter la sonnerie
  const stopRinging = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    // Arrêter la vibration
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }, []);

  // Démarrer la sonnerie
  const startRinging = useCallback(async () => {
    if (!isSoundEnabled && !isVibrationEnabled) return;

    stopRinging();

    // Jouer le son si activé
    if (isSoundEnabled) {
      audioRef.current = await playRingtoneFile();

      // Si pas de fichier audio, utiliser le Web Audio API en boucle
      if (!audioRef.current) {
        ringIntervalRef.current = setInterval(() => {
          try {
            const ctx = getAudioContext();
            if (ctx.state !== 'suspended') {
              generateRingtone(ctx, 1);
            }
          } catch (e) {
            console.error('Erreur sonnerie:', e);
          }
        }, INCOMING_CALL_CONFIG.RING_REPEAT_INTERVAL_MS);
      }
    }

    // Vibration si activée
    if (isVibrationEnabled) {
      triggerVibration();
      // Répéter la vibration
      const vibrationInterval = setInterval(() => {
        if (mountedRef.current) {
          triggerVibration();
        }
      }, 2000);

      // Stocker pour cleanup
      const originalClearInterval = ringIntervalRef.current;
      ringIntervalRef.current = vibrationInterval;
      if (originalClearInterval) {
        clearInterval(originalClearInterval);
      }
    }

    // Arrêter automatiquement après la durée configurée
    setTimeout(() => {
      stopRinging();
    }, INCOMING_CALL_CONFIG.RING_DURATION_MS);
  }, [isSoundEnabled, isVibrationEnabled, stopRinging]);

  // Tester la sonnerie
  const testRingtone = useCallback(async () => {
    await startRinging();
    setTimeout(() => {
      stopRinging();
    }, 3000);
  }, [startRinging, stopRinging]);

  // Toggle son
  const toggleSound = useCallback(() => {
    const newValue = !isSoundEnabled;
    setIsSoundEnabled(newValue);
    localStorage.setItem(INCOMING_CALL_CONFIG.SOUND_ENABLED_KEY, String(newValue));
  }, [isSoundEnabled]);

  // Toggle vibration
  const toggleVibration = useCallback(() => {
    const newValue = !isVibrationEnabled;
    setIsVibrationEnabled(newValue);
    localStorage.setItem(INCOMING_CALL_CONFIG.VIBRATION_ENABLED_KEY, String(newValue));
  }, [isVibrationEnabled]);

  // Écouter les appels entrants
  useEffect(() => {
    if (!userId || !isOnline || !isProvider || !enabled) {
      setHasIncomingCall(false);
      setIncomingCall(null);
      stopRinging();
      return;
    }

    mountedRef.current = true;

    // Écouter les sessions d'appel où ce prestataire est ciblé
    const callsQuery = query(
      collection(db, 'call_sessions'),
      where('metadata.providerId', '==', userId),
      where('status', 'in', ['pending', 'provider_connecting'])
    );

    const unsubscribe = onSnapshot(
      callsQuery,
      (snapshot) => {
        if (!mountedRef.current) return;

        const pendingCalls = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          } as any))
          .filter((call) => {
            // Ne considérer que les appels récents (moins de 2 minutes)
            const createdAt = call.metadata?.createdAt?.toDate?.();
            if (!createdAt) return true;
            const ageMs = Date.now() - createdAt.getTime();
            return ageMs < 120000; // 2 minutes
          });

        if (pendingCalls.length > 0) {
          const mostRecentCall = pendingCalls[0];
          setHasIncomingCall(true);
          setIncomingCall({
            id: mostRecentCall.id,
            clientId: mostRecentCall.metadata?.clientId || '',
            clientName: mostRecentCall.metadata?.clientName,
            serviceType: mostRecentCall.metadata?.serviceType || 'call',
            status: mostRecentCall.status,
            createdAt: mostRecentCall.metadata?.createdAt,
          });

          // Démarrer la sonnerie
          startRinging();

          console.log('📞 Appel entrant détecté:', mostRecentCall.id);
        } else {
          setHasIncomingCall(false);
          setIncomingCall(null);
          stopRinging();
        }
      },
      (error) => {
        if (!mountedRef.current) return;
        console.error('Erreur écoute appels entrants:', error);
      }
    );

    return () => {
      mountedRef.current = false;
      unsubscribe();
      stopRinging();
    };
  }, [userId, isOnline, isProvider, enabled, startRinging, stopRinging]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopRinging();
    };
  }, [stopRinging]);

  return {
    hasIncomingCall,
    incomingCall,
    isSoundEnabled,
    isVibrationEnabled,
    toggleSound,
    toggleVibration,
    stopRinging,
    testRingtone,
  };
};

export default useIncomingCallSound;
