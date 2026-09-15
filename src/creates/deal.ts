import type { Bundle, Create, ZObject } from 'zapier-platform-core';
import { baseUrl, compact } from '../client';
import { DEAL_SAMPLE } from '../triggers/samples';

/**
 * Deal writes.
 *
 * One asymmetry is worth knowing before reading `changeDealStage`: the API refuses to
 * move a deal to `won` over the public API, because winning a deal books an income
 * entry in the finance ledger and that is a panel-only action. The stage dropdown here
 * therefore omits `won` rather than offering a choice that always fails.
 */

const OPEN_STAGE_CHOICES = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
};

const MOVABLE_STAGE_CHOICES = {
  ...OPEN_STAGE_CHOICES,
  lost: 'Lost',
};

export const createDeal: Create = {
  key: 'create_deal',
  noun: 'Deal',
  display: {
    label: 'Create Deal',
    description: 'Opens a deal, optionally attached to a contact.',
  },
  operation: {
    inputFields: [
      { key: 'title', label: 'Title', type: 'string', required: true },
      {
        key: 'contactId',
        label: 'Contact',
        type: 'integer',
        dynamic: 'contact_list.id.name',
        helpText: 'Links the deal to a contact so it appears on their timeline.',
      },
      { key: 'value', label: 'Value', type: 'number' },
      {
        key: 'currency',
        label: 'Currency',
        type: 'string',
        default: 'USD',
        helpText: 'Three-letter code, for example USD, EUR or TRY.',
      },
      {
        key: 'stage',
        label: 'Stage',
        type: 'string',
        choices: OPEN_STAGE_CHOICES,
        default: 'lead',
      },
      { key: 'probability', label: 'Probability (%)', type: 'integer' },
      { key: 'expectedCloseAt', label: 'Expected Close Date', type: 'datetime' },
      { key: 'notes', label: 'Notes', type: 'text' },
    ],

    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/deals`,
        method: 'POST',
        body: compact({
          title: bundle.inputData.title,
          contactId: bundle.inputData.contactId,
          value: bundle.inputData.value,
          currency: bundle.inputData.currency,
          stage: bundle.inputData.stage,
          probability: bundle.inputData.probability,
          expectedCloseAt: bundle.inputData.expectedCloseAt,
          notes: bundle.inputData.notes,
        }),
      });
      return response.data;
    },

    sample: DEAL_SAMPLE,
  },
};

export const changeDealStage: Create = {
  key: 'change_deal_stage',
  noun: 'Deal',
  display: {
    label: 'Move Deal to Stage',
    description:
      'Moves a deal to another stage. Marking a deal won books revenue, so that has to be done in Pinlyx rather than from a Zap.',
  },
  operation: {
    inputFields: [
      {
        key: 'dealId',
        label: 'Deal',
        type: 'integer',
        required: true,
        dynamic: 'deal_list.id.name',
      },
      {
        key: 'stage',
        label: 'Stage',
        type: 'string',
        required: true,
        choices: MOVABLE_STAGE_CHOICES,
      },
    ],

    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/deals/${bundle.inputData.dealId}/stage`,
        method: 'POST',
        body: { stage: bundle.inputData.stage },
      });
      return response.data;
    },

    sample: DEAL_SAMPLE,
  },
};
