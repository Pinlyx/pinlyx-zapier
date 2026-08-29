import type { Bundle, Create, ZObject } from 'zapier-platform-core';
import { baseUrl, compact } from '../client';
import { CONTACT_SAMPLE } from '../triggers/samples';

/**
 * Contact writes.
 *
 * `createContact` maps onto `POST /v1/contacts`, which rejects a body with no
 * identifying field and returns 409 when `externalId` is already taken. That 409 is a
 * feature for Zapier: paired with the "Find Contact" search in a Zapier "find or
 * create" step, it stops a Zap from quietly forking one customer into two records.
 */

const STAGE_CHOICES = {
  novalue: 'No stage',
  lead: 'Lead',
  conversation: 'In conversation',
  proposal: 'Proposal sent',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

const PLATFORM_CHOICES = {
  telegram: 'Telegram',
  twitter: 'X (Twitter)',
};

export const createContact: Create = {
  key: 'create_contact',
  noun: 'Contact',
  display: {
    label: 'Create Contact',
    description:
      'Adds a contact to your CRM. At least one of name, username, phone, email or external ID is required.',
  },
  operation: {
    inputFields: [
      { key: 'name', label: 'Name', type: 'string' },
      {
        key: 'email',
        label: 'Email',
        type: 'string',
        helpText: 'Used by the Find Contact search as an exact-match key.',
      },
      { key: 'phone', label: 'Phone', type: 'string' },
      {
        key: 'username',
        label: 'Username',
        type: 'string',
        helpText: 'Telegram or X handle, without the leading @.',
      },
      {
        key: 'externalId',
        label: 'External ID',
        type: 'string',
        helpText:
          "This contact's id in the system the Zap came from. Store it and later Zaps can find the same person again without guessing on name or email. Must be unique in your workspace.",
      },
      { key: 'company', label: 'Company', type: 'string' },
      {
        key: 'platform',
        label: 'Platform',
        type: 'string',
        choices: PLATFORM_CHOICES,
        default: 'telegram',
      },
      { key: 'stage', label: 'Stage', type: 'string', choices: STAGE_CHOICES },
      {
        key: 'pipelineStageId',
        label: 'Pipeline Column',
        type: 'integer',
        dynamic: 'pipeline_stage_list.id.name',
        helpText: 'Which column of which board this contact lands in.',
      },
      {
        key: 'tags',
        label: 'Tags',
        type: 'string',
        list: true,
        helpText: 'Tag names. Any that do not exist yet are created.',
      },
      { key: 'leadScore', label: 'Lead Score', type: 'integer', helpText: '0 to 100.' },
      { key: 'country', label: 'Country', type: 'string' },
      { key: 'city', label: 'City', type: 'string' },
      { key: 'notes', label: 'Notes', type: 'text' },
    ],

    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/contacts`,
        method: 'POST',
        body: compact({
          name: bundle.inputData.name,
          email: bundle.inputData.email,
          phone: bundle.inputData.phone,
          username: bundle.inputData.username,
          externalId: bundle.inputData.externalId,
          company: bundle.inputData.company,
          platform: bundle.inputData.platform,
          stage: bundle.inputData.stage,
          pipelineStageId: bundle.inputData.pipelineStageId,
          tags: bundle.inputData.tags,
          leadScore: bundle.inputData.leadScore,
          country: bundle.inputData.country,
          city: bundle.inputData.city,
          notes: bundle.inputData.notes,
          // No `source`: the API parses it into the ContactSource enum, which has no
          // Zapier member, so sending one is a 400 on every create. Adding the enum
          // value is an API change and a deploy; until then the API's own default
          // applies and `externalId` is what ties the record back to its origin.
        }),
      });
      return response.data;
    },

    sample: CONTACT_SAMPLE,
  },
};

/**
 * Partial update. The API distinguishes an absent property (leave alone) from an
 * explicit null (clear the column), and `compact` drops blanks, so an untouched Zap
 * field never wipes CRM data.
 */
export const updateContact: Create = {
  key: 'update_contact',
  noun: 'Contact',
  display: {
    label: 'Update Contact',
    description: 'Updates an existing contact. Fields left blank in this step are not changed.',
  },
  operation: {
    inputFields: [
      {
        key: 'contactId',
        label: 'Contact',
        type: 'integer',
        required: true,
        dynamic: 'contact_list.id.name',
        helpText: 'Pick a contact, or map an ID from a trigger or a Find Contact step.',
      },
      { key: 'name', label: 'Name', type: 'string' },
      { key: 'email', label: 'Email', type: 'string' },
      { key: 'phone', label: 'Phone', type: 'string' },
      { key: 'company', label: 'Company', type: 'string' },
      { key: 'externalId', label: 'External ID', type: 'string' },
      { key: 'stage', label: 'Stage', type: 'string', choices: STAGE_CHOICES },
      {
        key: 'pipelineStageId',
        label: 'Pipeline Column',
        type: 'integer',
        dynamic: 'pipeline_stage_list.id.name',
      },
      { key: 'country', label: 'Country', type: 'string' },
      { key: 'city', label: 'City', type: 'string' },
      { key: 'notes', label: 'Notes', type: 'text' },
      {
        key: 'tags',
        label: 'Tags',
        type: 'string',
        list: true,
        helpText:
          'Replaces the whole tag set when provided. Leave empty to keep the existing tags.',
      },
    ],

    perform: async (z: ZObject, bundle: Bundle) => {
      const { contactId, ...rest } = bundle.inputData;
      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/contacts/${contactId}`,
        method: 'PATCH',
        body: compact(rest),
      });
      return response.data;
    },

    sample: CONTACT_SAMPLE,
  },
};
