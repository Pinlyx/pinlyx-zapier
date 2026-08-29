import type { Bundle, Trigger, ZObject } from 'zapier-platform-core';
import { baseUrl, unwrapList } from '../client';

/**
 * Hidden triggers that back the dropdowns in action forms.
 *
 * Zapier populates a `dynamic: 'trigger_key.id.label'` field by running the named
 * trigger, so every picker in this integration is a normal polling trigger with
 * `hidden: true`. They are the difference between a user choosing "Sales pipeline >
 * Qualified" and being asked to type a stage id they have no way of knowing.
 */

interface PipelineStage {
  id: number;
  name: string;
  kind?: string;
}

interface Pipeline {
  id: number;
  name: string;
  isDefault?: boolean;
  stages?: PipelineStage[];
}

/**
 * Pipeline board columns, flattened across every board and labelled
 * "Board > Column" because stage names repeat between boards ("New" exists on all of
 * them) and a bare column name would be ambiguous in the dropdown.
 */
export const pipelineStageList: Trigger = {
  key: 'pipeline_stage_list',
  noun: 'Pipeline Stage',
  display: {
    label: 'Pipeline Stages',
    description: 'Internal dropdown of pipeline board columns.',
    hidden: true,
  },
  operation: {
    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({ url: `${baseUrl(bundle)}/v1/pipelines` });
      const pipelines = unwrapList<Pipeline>(response.data);

      return pipelines.flatMap((pipeline) =>
        (pipeline.stages || []).map((stage) => ({
          id: stage.id,
          name: `${pipeline.name} > ${stage.name}`,
          pipelineId: pipeline.id,
          pipelineName: pipeline.name,
          stageName: stage.name,
          kind: stage.kind,
        })),
      );
    },
    sample: {
      id: 11,
      name: 'Sales pipeline > Qualified',
      pipelineId: 3,
      pipelineName: 'Sales pipeline',
      stageName: 'Qualified',
      kind: 'Open',
    },
  },
};

/** Connected Telegram accounts - the sending identity for the Telegram action. */
export const telegramAccountList: Trigger = {
  key: 'telegram_account_list',
  noun: 'Telegram Account',
  display: {
    label: 'Telegram Accounts',
    description: 'Internal dropdown of connected Telegram accounts.',
    hidden: true,
  },
  operation: {
    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/accounts`,
        params: { type: 'telegram' },
      });
      return unwrapList<{ id: number; name?: string; phone?: string; status?: string }>(
        response.data,
      ).map((account) => ({
        id: account.id,
        name: account.name || account.phone || `Account ${account.id}`,
        status: account.status,
      }));
    },
    sample: { id: 5, name: '+15551234567', status: 'active' },
  },
};

/** Connected social accounts - WhatsApp, Instagram, Facebook, X and the rest. */
export const socialAccountList: Trigger = {
  key: 'social_account_list',
  noun: 'Social Account',
  display: {
    label: 'Social Accounts',
    description: 'Internal dropdown of connected social accounts.',
    hidden: true,
  },
  operation: {
    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({ url: `${baseUrl(bundle)}/v1/social/accounts` });
      return unwrapList<{ id: number; platform?: string; displayName?: string; handle?: string }>(
        response.data,
      ).map((account) => ({
        id: account.id,
        name: `${account.platform || 'social'}: ${account.displayName || account.handle || account.id}`,
        platform: account.platform,
      }));
    },
    sample: { id: 9, name: 'instagram: @analyticalengines', platform: 'instagram' },
  },
};

/** Tag dictionary, so "Tag Contact" offers the tags that already exist. */
export const tagList: Trigger = {
  key: 'tag_list',
  noun: 'Tag',
  display: {
    label: 'Tags',
    description: 'Internal dropdown of contact tags.',
    hidden: true,
  },
  operation: {
    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({ url: `${baseUrl(bundle)}/v1/tags` });
      return unwrapList<{ id: number; name?: string; color?: string }>(response.data).map((tag) => ({
        id: tag.id,
        name: tag.name || `Tag ${tag.id}`,
        color: tag.color,
      }));
    },
    sample: { id: 2, name: 'VIP', color: '#F59E0B' },
  },
};

/**
 * Record pickers.
 *
 * These exist so a Zap step asks for "Ada Lovelace" rather than for the number 4821.
 * Each returns the most recent 100 rows: enough that the record a Zap was just
 * triggered by is in the list, and Zapier always lets a user type a raw id instead when
 * it is not. Cursor pagination cannot be driven from Zapier's page counter, so these
 * deliberately do not paginate rather than paginate wrongly.
 */
const PICKER_LIMIT = 100;

export const contactList: Trigger = {
  key: 'contact_list',
  noun: 'Contact',
  display: {
    label: 'Contacts',
    description: 'Internal dropdown of recent contacts.',
    hidden: true,
  },
  operation: {
    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/contacts`,
        params: { limit: PICKER_LIMIT },
      });
      return unwrapList<{
        id: number;
        name?: string;
        username?: string;
        email?: string;
        phone?: string;
        company?: string;
      }>(response.data).map((contact) => {
        const identity =
          contact.name || contact.username || contact.email || contact.phone || `Contact ${contact.id}`;
        return {
          id: contact.id,
          name: contact.company ? `${identity} (${contact.company})` : identity,
        };
      });
    },
    sample: { id: 4821, name: 'Ada Lovelace (Analytical Engines Ltd)' },
  },
};

export const dealList: Trigger = {
  key: 'deal_list',
  noun: 'Deal',
  display: {
    label: 'Deals',
    description: 'Internal dropdown of recent deals.',
    hidden: true,
  },
  operation: {
    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/deals`,
        params: { limit: PICKER_LIMIT },
      });
      return unwrapList<{ id: number; title?: string; contactName?: string; stage?: string }>(
        response.data,
      ).map((deal) => ({
        id: deal.id,
        name: deal.contactName
          ? `${deal.title || `Deal ${deal.id}`} - ${deal.contactName}`
          : deal.title || `Deal ${deal.id}`,
      }));
    },
    sample: { id: 318, name: 'Analytical Engines - annual plan - Ada Lovelace' },
  },
};

export const taskList: Trigger = {
  key: 'task_list',
  noun: 'Task',
  display: {
    label: 'Tasks',
    description: 'Internal dropdown of open tasks.',
    hidden: true,
  },
  operation: {
    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/tasks`,
        params: { limit: PICKER_LIMIT },
      });
      return unwrapList<{ id: number; title?: string; status?: string; contactName?: string }>(
        response.data,
      ).map((task) => ({
        id: task.id,
        name: `${task.title || `Task ${task.id}`}${task.status ? ` [${task.status}]` : ''}`,
      }));
    },
    sample: { id: 902, name: 'Send the revised quote [open]' },
  },
};

export const socialConversationList: Trigger = {
  key: 'social_conversation_list',
  noun: 'Conversation',
  display: {
    label: 'Social Conversations',
    description: 'Internal dropdown of open social conversations.',
    hidden: true,
  },
  operation: {
    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/social/conversations`,
        params: { limit: PICKER_LIMIT },
      });
      return unwrapList<{
        id: number;
        platform?: string;
        contactName?: string;
        participantName?: string;
      }>(response.data).map((conversation) => ({
        id: conversation.id,
        name: `${conversation.platform || 'social'}: ${
          conversation.contactName || conversation.participantName || `Conversation ${conversation.id}`
        }`,
      }));
    },
    sample: { id: 1204, name: 'whatsapp: Ada Lovelace' },
  },
};

export const twitterAccountList: Trigger = {
  key: 'twitter_account_list',
  noun: 'X Account',
  display: {
    label: 'X Accounts',
    description: 'Internal dropdown of connected X (Twitter) accounts.',
    hidden: true,
  },
  operation: {
    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/accounts`,
        params: { type: 'twitter' },
      });
      return unwrapList<{ id: number; name?: string; status?: string }>(response.data).map(
        (account) => ({
          id: account.id,
          name: account.name ? `@${account.name}` : `X account ${account.id}`,
          status: account.status,
        }),
      );
    },
    sample: { id: 7, name: '@analyticalengines', status: 'active' },
  },
};

/**
 * No member dropdown for "Assign Contact": the public API exposes the workspaces a key
 * belongs to but not their member lists, so there is nothing to populate it from. The
 * assignee field is a plain user id with help text instead of a picker that would have
 * to guess.
 */
export const dropdownTriggers = [
  pipelineStageList,
  telegramAccountList,
  socialAccountList,
  twitterAccountList,
  tagList,
  contactList,
  dealList,
  taskList,
  socialConversationList,
];
