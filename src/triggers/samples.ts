/**
 * Sample records, one per noun.
 *
 * Zapier requires a sample on every trigger: it is what the Zap editor shows when a
 * user has no real data yet, and what later steps map their fields from. The shapes
 * here mirror the webhook `data` payloads built by `WebhookPayloads` in the API.
 */

export const CONTACT_SAMPLE = {
  id: 4821,
  userId: 17,
  actorUserId: 17,
  name: 'Ada Lovelace',
  username: 'adalovelace',
  email: 'ada@analytical.co',
  phone: '+15551234567',
  company: 'Analytical Engines Ltd',
  country: 'GB',
  city: 'London',
  externalId: 'crm-9912',
  platform: 'telegram',
  telegramUserId: 884412907,
  source: 'inboundMessage',
  stage: 'lead',
  pipelineId: 3,
  pipelineStageId: 11,
  leadScore: 72,
  origin: 'inbox',
  createdAt: '2026-08-29T09:14:22Z',
};

export const DEAL_SAMPLE = {
  id: 318,
  userId: 17,
  actorUserId: 17,
  title: 'Analytical Engines - annual plan',
  contactId: 4821,
  contactName: 'Ada Lovelace',
  value: 2400,
  currency: 'USD',
  stage: 'negotiation',
  previousStage: 'proposal',
  probability: 70,
  expectedCloseAt: '2026-09-30T00:00:00Z',
  closedAt: null,
  notes: 'Asked for a two-seat discount.',
  createdAt: '2026-08-21T11:02:00Z',
};

export const TASK_SAMPLE = {
  id: 902,
  userId: 17,
  actorUserId: 17,
  title: 'Send the revised quote',
  description: 'Include the two-seat discount we discussed.',
  contactId: 4821,
  contactName: 'Ada Lovelace',
  dealId: 318,
  dealTitle: 'Analytical Engines - annual plan',
  priority: 'high',
  status: 'open',
  dueAt: '2026-09-02T16:00:00Z',
  completedAt: null,
  createdAt: '2026-08-29T09:20:11Z',
};

export const MESSAGE_SAMPLE = {
  id: 55210,
  userId: 17,
  contactId: 4821,
  contactName: 'Ada Lovelace',
  platform: 'telegram',
  direction: 'inbound',
  text: 'Could you send the quote with the discount applied?',
  hasAttachment: false,
  conversationId: 1204,
  externalMessageId: '9912:44',
  sentAt: '2026-08-29T09:12:40Z',
  createdAt: '2026-08-29T09:12:41Z',
};

export const INVOICE_SAMPLE = {
  id: 77,
  userId: 17,
  number: 'INV-2026-0077',
  contactId: 4821,
  contactName: 'Ada Lovelace',
  amount: 2400,
  currency: 'USD',
  status: 'paid',
  issuedAt: '2026-08-01T00:00:00Z',
  dueAt: '2026-08-31T00:00:00Z',
  paidAt: '2026-08-29T08:41:00Z',
  createdAt: '2026-08-01T00:00:00Z',
};

export const SEQUENCE_SAMPLE = {
  id: 44,
  userId: 17,
  sequenceId: 12,
  sequenceName: 'Trial follow-up',
  contactId: 4821,
  contactName: 'Ada Lovelace',
  stepNumber: 4,
  channel: 'email',
  completedAt: '2026-08-29T09:30:00Z',
  createdAt: '2026-08-29T09:30:00Z',
};

/** Fields every trigger adds on top of the record, so a Zap can branch on the event. */
export const EVENT_META_SAMPLE = {
  event: 'contact.created',
  deliveredAt: '2026-08-29T09:14:23Z',
  deliveryId: 'a1b2c3d4e5f60718',
};

const BY_NOUN: Record<string, Record<string, unknown>> = {
  Contact: CONTACT_SAMPLE,
  Deal: DEAL_SAMPLE,
  Task: TASK_SAMPLE,
  Message: MESSAGE_SAMPLE,
  Invoice: INVOICE_SAMPLE,
  Sequence: SEQUENCE_SAMPLE,
  Reply: MESSAGE_SAMPLE,
};

export const sampleFor = (noun: string, event: string): Record<string, unknown> => ({
  ...(BY_NOUN[noun] || CONTACT_SAMPLE),
  ...EVENT_META_SAMPLE,
  event,
});
