// src/hooks/useIncomingCallSound.ts
// Hook pour gérer les sonneries d'appels entrants pour les prestataires
// =============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Configuration
const INCOMING_CALL_CONFIG = {
  // Durée de la sonnerie en ms (30 secondes - plus long car son doux)
  RING_DURATION_MS: 30000,
  // Volume de la sonnerie (0.0 - 1.0) - très bas pour son doux
  RING_VOLUME: 0.15,
  // Intervalle de répétition de la sonnerie en ms (5 secondes - espacé pour rester doux)
  RING_REPEAT_INTERVAL_MS: 5000,
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

// Générer une sonnerie DOUCE et mélodieuse avec Web Audio API
const generateRingtone = (ctx: AudioContext, duration: number = 2.5): void => {
  const now = ctx.currentTime;
  const volume = parseFloat(localStorage.getItem('incomingCallVolume') || '0.15');

  // Notes douces (accord de Do majeur avec septième - très apaisant)
  // C4 (261Hz), E4 (329Hz), G4 (392Hz), B4 (494Hz)
  const notes = [261.63, 329.63, 392.00, 493.88];

  notes.forEach((freq, index) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Onde sinusoïdale pure pour un son très doux
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, now);

    // Connecter
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Envelope ADSR très douce (Attack-Decay-Sustain-Release)
    const noteStart = now + index * 0.4; // Arpège doux
    const noteDuration = 1.2;

    // Attack très progressif (fade in doux)
    gainNode.gain.setValueAtTime(0, noteStart);
    gainNode.gain.linearRampToValueAtTime(volume * 0.08, noteStart + 0.3);

    // Sustain doux
    gainNode.gain.linearRampToValueAtTime(volume * 0.06, noteStart + 0.6);

    // Release très progressif (fade out doux)
    gainNode.gain.linearRampToValueAtTime(0, noteStart + noteDuration);

    oscillator.start(noteStart);
    oscillator.stop(noteStart + noteDuration + 0.1);
  });

  // Ajouter une note de basse très subtile pour la chaleur
  const bassOsc = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bassOsc.type = 'sine';
  bassOsc.frequency.setValueAtTime(130.81, now); // C3 - basse douce
  bassOsc.connect(bassGain);
  bassGain.connect(ctx.destination);

  bassGain.gain.setValueAtTime(0, now);
  bassGain.gain.linearRampToValueAtTime(volume * 0.03, now + 0.5);
  bassGain.gain.linearRampToValueAtTime(volume * 0.02, now + 1.5);
  bassGain.gain.linearRampToValueAtTime(0, now + 2.5);

  bassOsc.start(now);
  bassOsc.stop(now + 2.6);
};

// Générer un carillon doux (alternative)
const generateSoftChime = (ctx: AudioContext): void => {
  const now = ctx.currentTime;
  const volume = parseFloat(localStorage.getItem('incomingCallVolume') || '0.15');

  // Séquence de carillon doux (pentatonique - très apaisant)
  const chimeNotes = [
    { freq: 523.25, delay: 0, duration: 1.5 },      // C5
    { freq: 659.25, delay: 0.3, duration: 1.2 },    // E5
    { freq: 783.99, delay: 0.6, duration: 1.0 },    // G5
    { freq: 523.25, delay: 1.2, duration: 0.8 },    // C5 (reprise douce)
  ];

  chimeNotes.forEach(({ freq, delay, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    osc.connect(gain);
    gain.connect(ctx.destination);

    const start = now + delay;

    // Envelope très douce type "cloche de méditation"
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume * 0.1, start + 0.05); // Attack rapide mais doux
    gain.gain.exponentialRampToValueAtTime(volume * 0.02, start + duration * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.start(start);
    osc.stop(start + duration + 0.1);
  });
};

// Compteur pour alterner les sons
let ringCounter = 0;

// Jouer le fichier audio de sonnerie (ou génération douce)
const playRingtoneFile = async (): Promise<HTMLAudioElement | null> => {
  try {
    // Essayer d'abord le fichier audio personnalisé
    const audio = new Audio('/sounds/incoming-call.wav');
    audio.volume = parseFloat(localStorage.getItem('incomingCallVolume') || '0.15');
    audio.loop = false; // Pas de loop, on gère manuellement
    await audio.play();
    return audio;
  } catch (error) {
    // Fallback: utiliser Web Audio API avec sonnerie douce
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Alterner entre arpège doux et carillon
      ringCounter++;
      if (ringCounter % 2 === 0) {
        generateSoftChime(ctx);
      } else {
        generateRingtone(ctx, 2.5);
      }
    } catch (e) {
      console.error('Erreur lors de la génération de la sonnerie:', e);
    }
    return null;
  }
};

// Jouer uniquement la sonnerie douce générée (pour le test)
const playSoftRingtone = async (): Promise<void> => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    generateRingtone(ctx, 2.5);
  } catch (e) {
    console.error('Erreur lors de la génération de la sonnerie douce:', e);
  }
};

// Tracker si l'utilisateur a interagi avec la page (requis pour vibration)
let userHasInteracted = false;

// Fonction pour vérifier si la vibration est autorisée
const canVibrate = (): boolean => {
  // Pas de vibration sans interaction utilisateur
  if (!userHasInteracted) return false;
  // Pas de vibration si la page est en arrière-plan
  if (typeof document !== 'undefined' && document.hidden) return false;
  // Pas de vibration si l'API n'est pas disponible
  if (!('vibrate' in navigator)) return false;
  return true;
};

// Appel sécurisé à navigator.vibrate
const safeVibrate = (pattern: number | number[]): boolean => {
  if (!canVibrate()) return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    // Silencieux - vibration bloquée par le navigateur
    return false;
  }
};

// Initialiser le tracker d'interaction utilisateur
if (typeof window !== 'undefined') {
  const markUserInteraction = () => {
    userHasInteracted = true;
  };

  // Ces événements indiquent une interaction utilisateur
  ['click', 'touchstart', 'keydown'].forEach(event => {
    window.addEventListener(event, markUserInteraction, { once: false, passive: true });
  });
}

// Vibration douce (pour mobiles) - SEULEMENT après interaction utilisateur
const triggerVibration = (): void => {
  // Pattern de vibration DOUX: courtes impulsions légères avec longues pauses
  // 100ms vibration, 300ms pause, 100ms vibration, 500ms pause
  safeVibrate([100, 300, 100, 500, 80]);
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
    // Arrêter la vibration (0 = stop)
    safeVibrate(0);
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

    // Vibration si activée et si l'utilisateur a interagi
    if (isVibrationEnabled && userHasInteracted) {
      triggerVibration();

      // Répéter la vibration avec une limite de 5 répétitions
      let vibrationCount = 0;
      const maxVibrations = 5;

      const vibrationInterval = setInterval(() => {
        if (mountedRef.current && vibrationCount < maxVibrations && userHasInteracted) {
          // Ne pas vibrer si la page est en arrière-plan
          if (typeof document !== 'undefined' && !document.hidden) {
            vibrationCount++;
            triggerVibration();
          }
        } else {
          clearInterval(vibrationInterval);
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
