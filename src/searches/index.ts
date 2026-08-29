import type { Bundle, Search, ZObject } from 'zapier-platform-core';
import { baseUrl, unwrapList } from '../client';
import { CONTACT_SAMPLE, DEAL_SAMPLE, TASK_SAMPLE } from '../triggers/samples';

/**
 * Searches. Each returns an array; Zapier uses the first element and treats an empty
 * array as "not found", which is what drives the find-or-create steps in index.ts.
 *
 * The contact search deliberately prefers exact keys over fuzzy ones. `externalId` and
 * `email` are indexed exact matches, while `q` is an ILIKE across six columns - useful
 * for a human, dangerous as a dedupe key, because "Ada" matching "Adam" is how two
 * customers become one record. Passing the exact keys first means a Zap that has them
 * never falls back to the fuzzy path.
 */

export const findContact: Search = {
  key: 'find_contact',
  noun: 'Contact',
  display: {
    label: 'Find Contact',
    description:
      'Finds a contact by external ID, email, or a text search across name, username, phone, email and company.',
  },
  operation: {
    inputFields: [
      {
        key: 'externalId',
        label: 'External ID',
        type: 'string',
        helpText: 'The most reliable key if you stored one when the contact was created.',
      },
      { key: 'email', label: 'Email', type: 'string', helpText: 'Exact match, case-insensitive.' },
      {
        key: 'q',
        label: 'Search Text',
        type: 'string',
        helpText:
          'Partial match across name, username, phone, email, company and external ID. Used only when the fields above are empty.',
      },
    ],

    perform: async (z: ZObject, bundle: Bundle) => {
      const { externalId, email, q } = bundle.inputData;

      const params: Record<string, string | number> = { limit: 5 };
      if (externalId) params.externalId = String(externalId);
      else if (email) params.email = String(email);
      else if (q) params.q = String(q);
      else {
        throw new z.errors.Error(
          'Provide an external ID, an email address, or search text.',
          'missing_search_input',
          400,
        );
      }

      const response = await z.request({ url: `${baseUrl(bundle)}/v1/contacts`, params });
      return unwrapList(response.data);
    },

    sample: CONTACT_SAMPLE,
  },
};

export const findDeal: Search = {
  key: 'find_deal',
  noun: 'Deal',
  display: {
    label: 'Find Deal',
    description: 'Finds a deal by title, contact or stage.',
  },
  operation: {
    inputFields: [
      { key: 'q', label: 'Title Contains', type: 'string' },
      { key: 'contactId', label: 'Contact', type: 'integer', dynamic: 'contact_list.id.name' },
      {
        key: 'stage',
        label: 'Stage',
        type: 'string',
        choices: {
          lead: 'Lead',
          qualified: 'Qualified',
          proposal: 'Proposal',
          negotiation: 'Negotiation',
          won: 'Won',
          lost: 'Lost',
        },
      },
    ],

    perform: async (z: ZObject, bundle: Bundle) => {
      const { q, contactId, stage } = bundle.inputData;
      const params: Record<string, string | number> = { limit: 5 };
      if (q) params.q = String(q);
      if (contactId) params.contactId = Number(contactId);
      if (stage) params.stage = String(stage);

      const response = await z.request({ url: `${baseUrl(bundle)}/v1/deals`, params });
      return unwrapList(response.data);
    },

    sample: DEAL_SAMPLE,
  },
};

export const findTask: Search = {
  key: 'find_task',
  noun: 'Task',
  display: {
    label: 'Find Task',
    description: 'Finds a task by contact, deal, status or priority.',
  },
  operation: {
    inputFields: [
      { key: 'contactId', label: 'Contact', type: 'integer', dynamic: 'contact_list.id.name' },
      { key: 'dealId', label: 'Deal', type: 'integer', dynamic: 'deal_list.id.name' },
      {
        key: 'status',
        label: 'Status',
        type: 'string',
        choices: { open: 'Open', inprogress: 'In progress', done: 'Done' },
      },
      {
        key: 'priority',
        label: 'Priority',
        type: 'string',
        choices: { low: 'Low', medium: 'Medium', high: 'High' },
      },
      { key: 'overdue', label: 'Overdue Only', type: 'boolean' },
    ],

    perform: async (z: ZObject, bundle: Bundle) => {
      const { contactId, dealId, status, priority, overdue } = bundle.inputData;
      const params: Record<string, string | number | boolean> = { limit: 5 };
      if (contactId) params.contactId = Number(contactId);
      if (dealId) params.dealId = Number(dealId);
      if (status) params.status = String(status);
      if (priority) params.priority = String(priority);
      if (overdue === true) params.overdue = true;

      const response = await z.request({ url: `${baseUrl(bundle)}/v1/tasks`, params });
      return unwrapList(response.data);
    },

    sample: TASK_SAMPLE,
  },
};
