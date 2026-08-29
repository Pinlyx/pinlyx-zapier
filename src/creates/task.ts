import type { Bundle, Create, ZObject } from 'zapier-platform-core';
import { baseUrl, compact } from '../client';
import { TASK_SAMPLE } from '../triggers/samples';

/** Task writes: create one, and mark one done. */

export const createTask: Create = {
  key: 'create_task',
  noun: 'Task',
  display: {
    label: 'Create Task',
    description: 'Creates a task, optionally attached to a contact or a deal.',
  },
  operation: {
    inputFields: [
      { key: 'title', label: 'Title', type: 'string', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'contactId', label: 'Contact', type: 'integer', dynamic: 'contact_list.id.name' },
      { key: 'dealId', label: 'Deal', type: 'integer', dynamic: 'deal_list.id.name' },
      {
        key: 'priority',
        label: 'Priority',
        type: 'string',
        choices: { low: 'Low', medium: 'Medium', high: 'High' },
        default: 'medium',
      },
      { key: 'dueAt', label: 'Due Date', type: 'datetime' },
    ],

    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/tasks`,
        method: 'POST',
        body: compact({
          title: bundle.inputData.title,
          description: bundle.inputData.description,
          contactId: bundle.inputData.contactId,
          dealId: bundle.inputData.dealId,
          priority: bundle.inputData.priority,
          dueAt: bundle.inputData.dueAt,
        }),
      });
      return response.data;
    },

    sample: TASK_SAMPLE,
  },
};

export const changeTaskStatus: Create = {
  key: 'change_task_status',
  noun: 'Task',
  display: {
    label: 'Change Task Status',
    description: 'Moves a task to open, in progress or done.',
  },
  operation: {
    inputFields: [
      {
        key: 'taskId',
        label: 'Task',
        type: 'integer',
        required: true,
        dynamic: 'task_list.id.name',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'string',
        required: true,
        choices: { open: 'Open', inprogress: 'In progress', done: 'Done' },
        default: 'done',
      },
    ],

    perform: async (z: ZObject, bundle: Bundle) => {
      const response = await z.request({
        url: `${baseUrl(bundle)}/v1/tasks/${bundle.inputData.taskId}/status`,
        method: 'POST',
        body: { status: bundle.inputData.status },
      });
      return response.data;
    },

    sample: { ...TASK_SAMPLE, status: 'done', completedAt: '2026-08-29T10:02:00Z' },
  },
};
