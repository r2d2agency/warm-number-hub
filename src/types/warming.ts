export interface Instance {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  status: 'connected' | 'disconnected' | 'warming';
  phoneNumber?: string;
  isPrimary?: boolean;
  isGlobal?: boolean;
  isOwner?: boolean; // true if current user owns this instance
  messagesSent?: number;
  messagesReceived?: number;
  lastActivity?: Date;
}

export interface WarmingNumber {
  id: string;
  phoneNumber: string;
  status: 'idle' | 'warming' | 'paused';
  messagesSent: number;
  messagesReceived: number;
  lastActivity?: Date;
}

export interface Message {
  id: string;
  content: string;
  type: 'incoming' | 'outgoing';
}

export interface WarmingConfig {
  minDelaySeconds: number;
  maxDelaySeconds: number;
  messagesPerHour: number;
  activeHoursStart: number;
  activeHoursEnd: number;
}

export interface ClientNumber {
  id: string;
  phoneNumber: string;
  name?: string;
  lastContact?: Date;
}
