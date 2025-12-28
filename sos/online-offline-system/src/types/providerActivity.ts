export interface ProviderActivityPreferences {
  soundEnabled: boolean;
  voiceEnabled: boolean;
  modalEnabled: boolean;
}

export interface ReminderState {
  lastSoundPlayed: Date | null;
  lastVoicePlayed: Date | null;
  lastModalShown: Date | null;
  reminderDisabledToday: boolean;
}

export interface ActivityEvent {
  type: 'click' | 'mousemove' | 'keydown' | 'scroll' | 'touchstart';
  timestamp: Date;
}

export interface ProviderStatusInfo {
  isOnline: boolean;
  lastActivity: Date | null;
  lastActivityCheck: Date | null;
  autoOfflineEnabled: boolean;
  inactivityTimeoutMinutes: number;
}
