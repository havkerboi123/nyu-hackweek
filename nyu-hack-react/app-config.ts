export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;
  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;
  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;
  // for LiveKit Cloud Sandbox
  sandboxId?: string;
  agentName?: string;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'MediVoice AI',
  pageTitle: 'AI Voice Assistant for Hospitals',
  pageDescription: 'Transform patient care with our intelligent voice assistant',

  supportsChatInput: true,
  supportsVideoInput: false,
  supportsScreenShare: false,
  isPreConnectBufferEnabled: true,

  logo: '/hospital-logo.svg',
  accent: '#0066CC',
  logoDark: '/hospital-logo-dark.svg',
  accentDark: '#4D9FFF',
  startButtonText: 'Talk to AI Assistant',

  // for LiveKit Cloud Sandbox
  sandboxId: undefined,
  agentName: undefined,
};
