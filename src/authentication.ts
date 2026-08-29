import type { Authentication, Bundle, ZObject } from 'zapier-platform-core';
import { baseUrl } from './client';

/**
 * API key authentication.
 *
 * There is deliberately no "API base URL" field. A public integration talks to exactly
 * one host, and an editable API host on an auth form is the shape that lets a
 * mistyped - or malicious - domain collect a working key.
 *
 * The key is minted in the panel under Settings > Developers and carries the scopes the
 * user granted it, so a key without `contacts:write` will fail those actions with 403
 * rather than being rejected here. The connection test is deliberately the cheapest
 * authenticated call in the API.
 *
 * `workspaceId` is optional and exists because a key can belong to someone who is a
 * member of several shared workspaces. Left blank, the API falls back to the key
 * owner's own records, which is what a single-workspace account wants.
 */
const test = async (z: ZObject, bundle: Bundle) => {
  const response = await z.request({ url: `${baseUrl(bundle)}/v1/me` });
  return response.data;
};

const authentication: Authentication = {
  type: 'custom',

  fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      helpText:
        'Create one at [app.crmsolid.com/settings/developers](https://app.crmsolid.com/settings/developers). Keys start with `csk_live_` or `csk_test_`. Grant it the scopes for the actions you plan to use here - at minimum `contacts:read` and `webhooks:write`.',
    },
    {
      key: 'workspaceId',
      label: 'Workspace ID',
      type: 'string',
      required: false,
      helpText:
        'Only needed if you belong to more than one CRM Solid workspace and want this connection to act inside a specific one. Find the id at [app.crmsolid.com/settings/workspace](https://app.crmsolid.com/settings/workspace). Leave blank to use your own records.',
    },
  ],

  test,

  // Shown on the connection label in the Zap editor, so a user with two connections can
  // tell them apart. /v1/me returns a camelCase anonymous object, hence lowercase keys.
  connectionLabel: '{{email}}',
};

export default authentication;
