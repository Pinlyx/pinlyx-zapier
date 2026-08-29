import type { Bundle, Create, ZObject } from 'zapier-platform-core';
import { baseUrl, unwrapList } from '../client';
import { CONTACT_SAMPLE } from '../triggers/samples';

/**
 * The enrichment actions: tag, score, assign.
 *
 * These are the steps that sit in the middle of a Zap rather than at the end - a lead
 * arrives, something decides what it is worth, and this writes that judgement back onto
 * the contact. Each maps to a single-purpose endpoint rather than a PATCH, because the
 * API records them as distinct activity-timeline entries.
 */

export const tagContact: Create = {
  key: 'tag_contact',
  noun: 'Tag',
  display: {
    label: 'Tag Contact',
    description: 'Adds a tag to a contact. The tag is created if it does not exist yet.',
  },
  operation: {
    inputFields: [
      {
        key: 'contactId',
        label: 'Contact',
        type: 'integer',
        required: true,
        dynamic: 'contact_list.id.name',
      },
      {
        key: 'tagName',
        label: 'Tag Name',
        type: 'string',
        required: true,
        dynamic: 'tag_list.name.name',
        altersDynamicFields: false,
        helpText:
          'Pick an existing tag or type a new one. A name that does not exist yet is added to your tag dictionary.',
      },
    ],

    perform: async (z: ZObject, bundle: Bundle) => {
      const contactId = bundle.inputData.contactId;
      const tagName = String(bundle.inputData.tagName);

      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/contacts/${contactId}/tags`,
        method: 'POST',
        body: { tagName },
      });

      // The endpoint answers with the contact's whole tag list in a page envelope.
      // Handing that back raw would give the Zap an `items` array to dig through, so
      // the tag that was just applied is lifted out and the full set kept alongside.
      const tags = unwrapList<{ id: number; name?: string; color?: string }>(response.data);
      const applied = tags.find((t) => (t.name || '').toLowerCase() === tagName.toLowerCase());

      return {
        id: applied?.id ?? null,
        contactId,
        tagName,
        color: applied?.color ?? null,
        tags,
      };
    },

    sample: {
      id: 2,
      contactId: 4821,
      tagName: 'VIP',
      color: '#F59E0B',
      tags: [{ id: 2, name: 'VIP', color: '#F59E0B' }],
    },
  },
};

export const untagContact: Create = {
  key: 'untag_contact',
  noun: 'Tag',
  display: {
    label: 'Remove Tag From Contact',
    description: 'Removes a tag from a contact.',
  },
  operation: {
    inputFields: [
      {
        key: 'contactId',
        label: 'Contact',
        type: 'integer',
        required: true,
        dynamic: 'contact_list.id.name',
      },
      {
        key: 'tagId',
        label: 'Tag',
        type: 'integer',
        required: true,
        dynamic: 'tag_list.id.name',
      },
    ],

    perform: async (z: ZObject, bundle: Bundle) => {
      const contactId = bundle.inputData.contactId;
      const tagId = bundle.inputData.tagId;

      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/contacts/${contactId}/tags/${tagId}`,
        method: 'DELETE',
      });

      return {
        id: tagId,
        contactId,
        tagId,
        tags: unwrapList<{ id: number; name?: string }>(response.data),
      };
    },

    sample: { id: 2, contactId: 4821, tagId: 2, tags: [] },
  },
};

export const setLeadScore: Create = {
  key: 'set_lead_score',
  noun: 'Lead Score',
  display: {
    label: 'Set Lead Score',
    description:
      'Sets a contact\'s lead score, 0 to 100. Writing a score here replaces any score the AI had assigned.',
  },
  operation: {
    inputFields: [
      {
        key: 'contactId',
        label: 'Contact',
        type: 'integer',
        required: true,
        dynamic: 'contact_list.id.name',
      },
      {
        key: 'score',
        label: 'Score',
        type: 'integer',
        required: true,
        helpText: 'Between 0 and 100. Values outside that range are rejected by the API.',
      },
    ],

    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/contacts/${bundle.inputData.contactId}/score`,
        method: 'PUT',
        body: { score: bundle.inputData.score },
      });
      return response.data;
    },

    sample: { ...CONTACT_SAMPLE, leadScore: 85, leadScoreIsAi: false },
  },
};

export const assignContact: Create = {
  key: 'assign_contact',
  noun: 'Assignment',
  display: {
    label: 'Assign Contact to Team Member',
    description: 'Assigns a contact to a workspace member, or clears the assignment.',
  },
  operation: {
    inputFields: [
      {
        key: 'contactId',
        label: 'Contact',
        type: 'integer',
        required: true,
        dynamic: 'contact_list.id.name',
      },
      {
        key: 'userId',
        label: 'Assign To (User ID)',
        type: 'integer',
        required: false,
        helpText:
          'The numeric user id of the team member. Find it in CRM Solid under Settings > Team. Leave blank to unassign the contact.',
      },
    ],

    perform: async (z: ZObject, bundle: Bundle) => {
      // An absent userId is the documented way to unassign, so null is sent
      // deliberately here rather than being stripped as an empty field.
      const raw = bundle.inputData.userId;
      const userId = raw === undefined || raw === null || raw === '' ? null : Number(raw);

      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/contacts/${bundle.inputData.contactId}/assignee`,
        method: 'PUT',
        body: { userId },
      });
      return response.data;
    },

    sample: { ...CONTACT_SAMPLE, assignedToUserId: 17 },
  },
};
