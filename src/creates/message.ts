import type { Bundle, Create, ZObject } from 'zapier-platform-core';
import { baseUrl, compact } from '../client';

/**
 * Outbound messaging - the actions that make this integration something other than
 * another CRM row-writer.
 *
 * Three channels, three shapes, and the differences matter to whoever builds a Zap:
 *
 *  - Telegram is *queued*, not sent. The endpoint returns a job id and the background
 *    worker sends it under the account's rate limits, so a Zap that "succeeds" here has
 *    scheduled a message, not delivered one. The Find Message Job search exists to
 *    close that loop.
 *  - Social (WhatsApp, Instagram, Facebook, and the rest) can only reply *inside an
 *    existing conversation*. There is no "start a new WhatsApp chat" endpoint, because
 *    on those platforms there is no such thing outside a customer-initiated window.
 *  - X direct messages go to a contact, and send synchronously.
 */

export const sendTelegramMessage: Create = {
  key: 'send_telegram_message',
  noun: 'Telegram Message',
  display: {
    label: 'Send Telegram Message',
    description:
      'Queues a Telegram message. Sending happens in the background under your account\'s rate limits, so this step returns a job rather than a delivered message.',
  },
  operation: {
    inputFields: [
      {
        key: 'accountId',
        label: 'From Account',
        type: 'integer',
        required: true,
        dynamic: 'telegram_account_list.id.name',
      },
      {
        key: 'contactId',
        label: 'Contact',
        type: 'integer',
        dynamic: 'contact_list.id.name',
        helpText:
          'Who to message. Provide this, or a username, or a Telegram user id - at least one is required.',
      },
      {
        key: 'username',
        label: 'Telegram Username',
        type: 'string',
        helpText: 'Without the leading @.',
      },
      { key: 'telegramUserId', label: 'Telegram User ID', type: 'integer' },
      {
        key: 'text',
        label: 'Message',
        type: 'text',
        required: true,
        helpText: 'Up to 4000 characters.',
      },
      {
        key: 'runAt',
        label: 'Send At',
        type: 'datetime',
        helpText: 'Leave blank to send as soon as the rate limiter allows.',
      },
    ],

    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/telegram/messages`,
        method: 'POST',
        body: compact({
          accountId: bundle.inputData.accountId,
          contactId: bundle.inputData.contactId,
          username: bundle.inputData.username,
          telegramUserId: bundle.inputData.telegramUserId,
          text: bundle.inputData.text,
          runAt: bundle.inputData.runAt,
        }),
      });
      return response.data;
    },

    sample: {
      id: 88213,
      accountId: 5,
      status: 'queued',
      runAt: '2026-08-29T09:40:00Z',
      createdAt: '2026-08-29T09:39:58Z',
    },
  },
};

export const sendSocialMessage: Create = {
  key: 'send_social_message',
  noun: 'Social Message',
  display: {
    label: 'Reply in Social Conversation',
    description:
      'Sends a message into an existing WhatsApp, Instagram, Facebook or other social conversation. Map the conversation ID from a New Inbound Message trigger.',
  },
  operation: {
    inputFields: [
      {
        key: 'conversationId',
        label: 'Conversation',
        type: 'integer',
        required: true,
        dynamic: 'social_conversation_list.id.name',
        helpText:
          'Comes from a New Inbound Message or Outreach Reply trigger. These platforms only allow replies inside a conversation the contact started.',
      },
      { key: 'text', label: 'Message', type: 'text' },
      {
        key: 'mediaUrl',
        label: 'Attachment URL',
        type: 'string',
        helpText:
          'Publicly reachable URL of an image, video, audio clip or document to attach.',
      },
      {
        key: 'replyToMessageId',
        label: 'Reply To Message ID',
        type: 'string',
        helpText: 'External id of the message being replied to, on platforms that thread.',
      },
    ],

    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/social/conversations/${bundle.inputData.conversationId}/messages`,
        method: 'POST',
        body: compact({
          text: bundle.inputData.text,
          mediaUrl: bundle.inputData.mediaUrl,
          replyToMessageId: bundle.inputData.replyToMessageId,
        }),
      });
      return response.data;
    },

    sample: {
      id: 55211,
      conversationId: 1204,
      platform: 'whatsapp',
      direction: 'outbound',
      text: 'Sending the revised quote now.',
      status: 'sent',
      createdAt: '2026-08-29T09:41:12Z',
    },
  },
};

export const sendTwitterDm: Create = {
  key: 'send_twitter_dm',
  noun: 'Direct Message',
  display: {
    label: 'Send X Direct Message',
    description: 'Sends a direct message on X (Twitter) to a contact.',
  },
  operation: {
    inputFields: [
      {
        key: 'xAccountId',
        label: 'From X Account',
        type: 'integer',
        required: true,
        dynamic: 'twitter_account_list.id.name',
      },
      {
        key: 'contactId',
        label: 'Contact',
        type: 'integer',
        required: true,
        dynamic: 'contact_list.id.name',
      },
      { key: 'text', label: 'Message', type: 'text', required: true },
    ],

    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/twitter/messages`,
        method: 'POST',
        body: {
          xAccountId: bundle.inputData.xAccountId,
          contactId: bundle.inputData.contactId,
          text: bundle.inputData.text,
        },
      });
      return response.data;
    },

    sample: {
      status: 'sent',
      xDmId: 4412,
      messageId: '1799001122334455667',
      text: 'Thanks for reaching out.',
    },
  },
};
