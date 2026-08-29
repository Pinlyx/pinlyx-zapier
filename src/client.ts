import type { Bundle, HttpRequestOptions, HttpResponse, ZObject } from 'zapier-platform-core';

/**
 * Talking to the CRM Solid public API from Zapier.
 *
 * Two things about the API shape drive everything in this file:
 *
 *  1. Casing is mixed, on purpose and permanently. The API runs with
 *     `PropertyNamingPolicy = null`, so a response built from a DTO *class*
 *     (ContactDto, DealDto, the V1Error envelope) arrives PascalCase, while one built
 *     from an anonymous object (the `{ items, nextCursor, hasMore }` page wrapper,
 *     `/v1/me`, every webhook payload) arrives camelCase. A Zap's field mapping is
 *     stored by key, so a trigger that emitted `Name` one day and `name` the next would
 *     silently break every Zap built on it. `normalize` therefore lowercases the first
 *     letter of every key on the way in, and the whole integration speaks camelCase.
 *
 *  2. Collections are always `{ items, nextCursor, hasMore }` - never a bare array and
 *     never `data`. `unwrapList` is the only place that knows this.
 */

export const DEFAULT_BASE_URL = 'https://api.crmsolid.com';

/** Header the API reads to act inside a shared workspace instead of the key owner's own rows. */
const WORKSPACE_HEADER = 'X-Workspace-Id';

/**
 * Keys whose *contents* are user data, not API fields. `customFields` is a dictionary
 * keyed by the field keys a customer defined in their own CRM; rewriting those keys
 * would rename the customer's fields behind their back. The value is passed through
 * untouched.
 */
const OPAQUE_VALUE_KEYS = new Set(['customfields']);

export const baseUrl = (bundle: Bundle): string => {
  const configured = (bundle.authData?.baseUrl || '').trim();
  return (configured || DEFAULT_BASE_URL).replace(/\/+$/, '');
};

const lowerFirst = (key: string): string =>
  key.length === 0 || key[0] === key[0].toLowerCase() ? key : key[0].toLowerCase() + key.slice(1);

/**
 * Recursively camelCases object keys. Arrays are mapped, primitives pass through, and
 * a key listed in OPAQUE_VALUE_KEYS keeps its value verbatim.
 */
export const normalize = <T = unknown>(input: unknown): T => {
  if (Array.isArray(input)) return input.map((entry) => normalize(entry)) as unknown as T;
  if (input === null || typeof input !== 'object') return input as T;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const nextKey = lowerFirst(key);
    out[nextKey] = OPAQUE_VALUE_KEYS.has(nextKey.toLowerCase()) ? value : normalize(value);
  }
  return out as T;
};

/** The page envelope every v1 collection endpoint returns. */
export interface Page<T> {
  items: T[];
  nextCursor: number | null;
  hasMore: boolean;
}

/**
 * Pulls the rows out of a v1 response. Tolerates a bare array so a future endpoint
 * that returns one does not take the integration down.
 */
export const unwrapList = <T = Record<string, unknown>>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  const page = data as Partial<Page<T>> | null;
  return Array.isArray(page?.items) ? (page!.items as T[]) : [];
};

/**
 * Attaches credentials and the standard headers to every outgoing call.
 * Registered as an app-level `beforeRequest`, so no individual action has to remember.
 */
export const addAuthentication = (
  request: HttpRequestOptions,
  z: ZObject,
  bundle: Bundle,
): HttpRequestOptions => {
  request.headers = request.headers || {};

  // Every whitespace character goes, not just the ends. A key copied across a line
  // break carries an inner newline that `trim` would leave in place, and the API rejects
  // the result as a malformed token - which surfaces as a bare 401 with no explanation.
  const apiKey = (bundle.authData?.apiKey || '').replace(/\s+/g, '');
  if (apiKey) request.headers.Authorization = `Bearer ${apiKey}`;

  const workspaceId = (bundle.authData?.workspaceId || '').replace(/\s+/g, '');
  if (workspaceId) request.headers[WORKSPACE_HEADER] = workspaceId;

  request.headers['User-Agent'] = 'CRMSolid-Zapier/1.0';
  return request;
};

/** Reads the message out of a V1Error body, whichever casing it arrived in. */
const errorMessage = (response: HttpResponse): string => {
  const body = normalize<{ message?: string; error?: string }>(response.data ?? {});
  const message = (body.message || '').trim();
  if (message) return message;
  const code = (body.error || '').trim();
  if (code) return code;
  return (response.content || '').slice(0, 300) || `HTTP ${response.status}`;
};

/**
 * Turns an API failure into the Zapier error that produces the right behaviour in the
 * editor and in a running Zap. Registered as an app-level `afterResponse`.
 */
export const handleErrors = (response: HttpResponse, z: ZObject): HttpResponse => {
  if (response.status < 400) return response;

  const message = errorMessage(response);

  // Zapier shows this one as "your connection needs attention" and stops the Zap
  // instead of retrying a key that will never start working again.
  if (response.status === 401) {
    throw new z.errors.ExpiredAuthError(
      `CRM Solid rejected the API key: ${message}. Reconnect this account with a key from Settings > Developers.`,
    );
  }

  // A scope the key was never granted, or a viewer-role key trying to write. Both are
  // permanent for this key, so say which one it is rather than "403".
  if (response.status === 403) {
    throw new z.errors.Error(
      `CRM Solid refused this action: ${message}. Check that the API key carries the required scope and that your workspace role allows writes.`,
      'forbidden',
      response.status,
    );
  }

  if (response.status === 429) {
    const retryAfter = Number(response.getHeader?.('retry-after') || 0);
    throw new z.errors.ThrottledError(`CRM Solid rate limit reached: ${message}`, retryAfter || 60);
  }

  throw new z.errors.Error(message, 'crmsolid_api_error', response.status);
};

/** Normalizes casing on every successful body. Runs after `handleErrors`. */
export const normalizeResponse = (response: HttpResponse): HttpResponse => {
  if (response.data !== undefined && response.data !== null) {
    response.data = normalize(response.data);
  }
  return response;
};

/** Drops keys whose value is undefined, null or an empty string, so a blank Zap field is "leave alone". */
export const compact = <T extends Record<string, unknown>>(input: T): Partial<T> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = value;
  }
  return out as Partial<T>;
};
