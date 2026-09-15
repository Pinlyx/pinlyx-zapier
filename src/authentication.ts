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
/**
 * A Pinlyx bearer key is `csk_<env>_` followed by exactly 44 characters (a 12-char
 * key id and a 32-char secret). Checking that here turns the most common setup mistake -
 * a paste that lost or gained a character - into a message that says so, instead of an
 * unexplained 401 from the API.
 */
const KEY_SHAPE = /^csk_[a-z0-9]+_[A-Za-z0-9]{44}$/;

const test = async (z: ZObject, bundle: Bundle) => {
  const apiKey = (bundle.authData?.apiKey || '').replace(/\s+/g, '');

  if (!KEY_SHAPE.test(apiKey)) {
    throw new z.errors.Error(
      `That does not look like a complete Pinlyx API key. Expected \`csk_live_\` or \`csk_test_\` followed by 44 characters (53 in total); this one has ${apiKey.length}. Copy the whole key from Settings > Developers - it is shown once, when you create it.`,
      'malformed_api_key',
      400,
    );
  }

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
        'Only needed if you belong to more than one Pinlyx workspace and want this connection to act inside a specific one. Find the id at [app.crmsolid.com/settings/workspace](https://app.crmsolid.com/settings/workspace). Leave blank to use your own records.',
    },
  ],

  test,

  // Shown on the connection label in the Zap editor, so a user with two connections can
  // tell them apart. /v1/me returns a camelCase anonymous object, hence lowercase keys.
  connectionLabel: '{{email}}',
};

export default authentication;
