export type DoniLanguage = 'fr'|'en'|'es'|'ht'|'fil'|'ceb';
export type DetectableLanguage = 'fr'|'en'|'es'|'ht';
export type ConversationStatus = 'ACTIVE'|'PAUSED'|'COMPLETED'|'ABANDONED'|'CANCELLED'|'AGENT_HOLD';
export type JsonObject = Record<string, unknown>;

export interface ConversationSession {
  id: string;
  waId: string;
  country: string|null;
  businessSegment: string;
  lockedLanguage: DoniLanguage|null;
  currentSegment: string;
  previousSegment: string|null;
  state: JsonObject;
  status: ConversationStatus;
  agentRequired: boolean;
  lastMessageAt: Date|null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentReply {
  message: string|null;
  nextSegment: string|null;
  stateUpdates?: JsonObject|null;
  outcome: 'success'|'retry'|'error'|'escalated';
  normalized?: string|null;
  autoChain?: boolean;
}

export interface SegmentHandler {
  readonly id: string;
  handle(session: ConversationSession, text: string, rawMessage?: unknown): Promise<SegmentReply>|SegmentReply;
  prompt(session: ConversationSession): Promise<string>|string;
}
