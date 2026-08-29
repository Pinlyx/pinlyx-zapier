import { version as platformVersion } from 'zapier-platform-core';
import authentication from './authentication';
import { addAuthentication, handleErrors, normalizeResponse } from './client';
import { triggers } from './triggers';
import { createContact, updateContact } from './creates/contact';
import { assignContact, setLeadScore, tagContact, untagContact } from './creates/enrichment';
import { changeDealStage, createDeal } from './creates/deal';
import { changeTaskStatus, createTask } from './creates/task';
import { sendSocialMessage, sendTelegramMessage, sendTwitterDm } from './creates/message';
import { findContact, findDeal, findTask } from './searches';

// Read at runtime from the package manifest rather than duplicated as a constant, so
// the published app version cannot drift from the one in package.json. From the
// compiled lib/src/index.js this resolves to the project root.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../../package.json') as { version: string };

const App = {
  version,
  platformVersion,

  authentication,

  // Credentials and standard headers go on every request; every response is checked
  // for an error and then camelCased. Order matters in afterResponse: errors are
  // raised before normalization so a failure never depends on body shape.
  beforeRequest: [addAuthentication],
  afterResponse: [handleErrors, normalizeResponse],

  triggers,

  creates: {
    [createContact.key]: createContact,
    [updateContact.key]: updateContact,
    [tagContact.key]: tagContact,
    [untagContact.key]: untagContact,
    [setLeadScore.key]: setLeadScore,
    [assignContact.key]: assignContact,
    [createDeal.key]: createDeal,
    [changeDealStage.key]: changeDealStage,
    [createTask.key]: createTask,
    [changeTaskStatus.key]: changeTaskStatus,
    [sendTelegramMessage.key]: sendTelegramMessage,
    [sendSocialMessage.key]: sendSocialMessage,
    [sendTwitterDm.key]: sendTwitterDm,
  },

  searches: {
    [findContact.key]: findContact,
    [findDeal.key]: findDeal,
    [findTask.key]: findTask,
  },

  /**
   * Find-or-create pairs. Without these a user builds "search, then create if the
   * search found nothing" by hand with a filter step, and gets it subtly wrong: the
   * create runs on every pass because an empty search result is not an error.
   */
  searchOrCreates: {
    [findContact.key]: {
      key: findContact.key,
      display: {
        label: 'Find or Create Contact',
        description: 'Finds a contact, and creates one when there is no match.',
      },
      search: findContact.key,
      create: createContact.key,
    },
    [findDeal.key]: {
      key: findDeal.key,
      display: {
        label: 'Find or Create Deal',
        description: 'Finds a deal, and opens one when there is no match.',
      },
      search: findDeal.key,
      create: createDeal.key,
    },
    [findTask.key]: {
      key: findTask.key,
      display: {
        label: 'Find or Create Task',
        description: 'Finds a task, and creates one when there is no match.',
      },
      search: findTask.key,
      create: createTask.key,
    },
  },
};

export default App;
module.exports = App;
