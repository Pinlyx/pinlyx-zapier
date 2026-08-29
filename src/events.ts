/**
 * The webhook event catalogue, mirroring `WebhookEventTypes` in the API.
 *
 * Every entry here becomes one Zapier trigger. They are declared in one table because a
 * REST Hook trigger is otherwise four near-identical functions, and four copies is how
 * `deal.won` ends up subscribing to `deal.lost`.
 *
 * `sampleEndpoint` is what `performList` polls to fill the Zap editor's "test trigger"
 * step. A REST Hook has nothing to show before the first real event fires, so without it
 * a user reaches the field-mapping step with no data to map.
 */
export interface EventDefinition {
  /** Zapier trigger key. Immutable once published: changing it orphans existing Zaps. */
  key: string;
  /** Event type string the API subscribes to. */
  event: string;
  /** Shown in the trigger list, e.g. "New Contact". */
  label: string;
  /** The record type, used by Zapier for wording elsewhere in the editor. */
  noun: string;
  description: string;
  /** Path polled for sample records, plus any query that narrows it to the right shape. */
  sampleEndpoint: string;
}

export const EVENTS: EventDefinition[] = [
  {
    key: 'contact_created',
    event: 'contact.created',
    label: 'New Contact',
    noun: 'Contact',
    description:
      'Triggers when a contact is added to your CRM, whether it came from an inbound message, the panel, an import or another integration.',
    sampleEndpoint: '/v1/contacts?limit=3',
  },
  {
    key: 'contact_updated',
    event: 'contact.updated',
    label: 'Updated Contact',
    noun: 'Contact',
    description:
      'Triggers when a contact is edited. The payload lists which fields changed, so you can act only on the ones you care about.',
    sampleEndpoint: '/v1/contacts?limit=3',
  },
  {
    key: 'contact_stage_changed',
    event: 'pipeline.stage_changed',
    label: 'Contact Moved to New Pipeline Stage',
    noun: 'Contact',
    description:
      'Triggers when a contact is moved to a different column on a pipeline board.',
    sampleEndpoint: '/v1/contacts?limit=3',
  },
  {
    key: 'deal_created',
    event: 'deal.created',
    label: 'New Deal',
    noun: 'Deal',
    description: 'Triggers when a deal is opened.',
    sampleEndpoint: '/v1/deals?limit=3',
  },
  {
    key: 'deal_stage_changed',
    event: 'deal.stage_changed',
    label: 'Deal Stage Changed',
    noun: 'Deal',
    description: 'Triggers when a deal moves between stages.',
    sampleEndpoint: '/v1/deals?limit=3',
  },
  {
    key: 'deal_won',
    event: 'deal.won',
    label: 'Deal Won',
    noun: 'Deal',
    description: 'Triggers when a deal is closed as won.',
    sampleEndpoint: '/v1/deals?stage=won&limit=3',
  },
  {
    key: 'deal_lost',
    event: 'deal.lost',
    label: 'Deal Lost',
    noun: 'Deal',
    description: 'Triggers when a deal is closed as lost.',
    sampleEndpoint: '/v1/deals?stage=lost&limit=3',
  },
  {
    key: 'task_created',
    event: 'task.created',
    label: 'New Task',
    noun: 'Task',
    description: 'Triggers when a task is created.',
    sampleEndpoint: '/v1/tasks?limit=3',
  },
  {
    key: 'task_completed',
    event: 'task.completed',
    label: 'Task Completed',
    noun: 'Task',
    description: 'Triggers when a task is marked done.',
    sampleEndpoint: '/v1/tasks?status=done&limit=3',
  },
  {
    key: 'message_received',
    event: 'message.received',
    label: 'New Inbound Message',
    noun: 'Message',
    description:
      'Triggers when a contact sends you a message on any connected channel - Telegram, WhatsApp, Instagram, X and the rest.',
    sampleEndpoint: '/v1/conversations?limit=3',
  },
  {
    key: 'message_sent',
    event: 'message.sent',
    label: 'Message Sent',
    noun: 'Message',
    description: 'Triggers when a message is delivered to a contact from your CRM.',
    sampleEndpoint: '/v1/conversations?limit=3',
  },
  {
    key: 'sequence_completed',
    event: 'sequence.completed',
    label: 'Sequence Completed',
    noun: 'Sequence',
    description: 'Triggers when a contact reaches the end of an outreach sequence.',
    sampleEndpoint: '/v1/sequences?limit=3',
  },
  {
    key: 'outreach_replied',
    event: 'outreach.replied',
    label: 'Outreach Reply Received',
    noun: 'Reply',
    description:
      'Triggers when a contact replies to an outreach step, which is usually the moment a lead becomes worth a human.',
    sampleEndpoint: '/v1/conversations?limit=3',
  },
  {
    key: 'invoice_paid',
    event: 'invoice.paid',
    label: 'Invoice Paid',
    noun: 'Invoice',
    description: 'Triggers when an invoice is settled.',
    sampleEndpoint: '/v1/finance/invoices?limit=3',
  },
  {
    key: 'invoice_created',
    event: 'invoice.created',
    label: 'New Invoice',
    noun: 'Invoice',
    description: 'Triggers when an invoice is issued.',
    sampleEndpoint: '/v1/finance/invoices?limit=3',
  },
];
