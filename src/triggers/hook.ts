import type { Bundle, Trigger, ZObject } from 'zapier-platform-core';
import { baseUrl, normalize, unwrapList } from '../client';
import type { EventDefinition } from '../events';
import { sampleFor } from './samples';

/**
 * Builds one REST Hook trigger from an event definition.
 *
 * The CRM's webhook endpoints map onto Zapier's subscribe/unsubscribe contract almost
 * exactly: `POST /v1/webhooks` registers a URL against a list of event types and
 * returns the row, `DELETE /v1/webhooks/{id}` retires it. What Zapier stores between
 * the two calls is whatever `performSubscribe` returns, so the endpoint id has to
 * survive in that object - it is the only handle we get back at unsubscribe time.
 */

/** The wire envelope of a delivery: `{ event, id, deliveredAt, data }`. */
interface DeliveryEnvelope {
  event?: string;
  id?: string;
  deliveredAt?: string;
  data?: Record<string, unknown>;
}

/**
 * Flattens a delivery into the record a Zap acts on, keeping the event name alongside
 * the fields so a single Zap can branch on which event arrived.
 *
 * The payload is normalized here rather than by the app-level middleware: an inbound
 * hook never passes through `afterResponse`, so this is the only place that runs.
 */
const flattenDelivery = (raw: unknown, fallbackEvent: string): Record<string, unknown> => {
  const envelope = normalize<DeliveryEnvelope>(raw ?? {});
  const record = envelope.data && typeof envelope.data === 'object' ? envelope.data : {};

  // Zapier rejects any trigger result without an `id`, so a delivery that arrives
  // without one - a malformed body, a future event whose payload is not record-shaped -
  // would fail the whole Zap rather than the single event. Falling back to the delivery
  // id keeps the run alive and still gives Zapier something unique to work with.
  const recordId = (record as { id?: unknown }).id;

  return {
    ...record,
    id: recordId ?? envelope.id ?? null,
    event: envelope.event || fallbackEvent,
    deliveredAt: envelope.deliveredAt || null,
    deliveryId: envelope.id || null,
  };
};

export const buildHookTrigger = (definition: EventDefinition): Trigger => {
  const { key, event, label, noun, description, sampleEndpoint } = definition;

  const performSubscribe = async (z: ZObject, bundle: Bundle) => {
    const response = await z.request({
      url: `${baseUrl(bundle)}/v1/webhooks`,
      method: 'POST',
      body: {
        url: bundle.targetUrl,
        eventTypes: [event],
        description: `Zapier: ${label}`,
      },
    });

    // Create does not answer with a bare endpoint: it wraps it as
    // `{ endpoint, secret }` so the signing secret can be shown exactly once. Only the
    // endpoint is kept - `id` is the handle performUnsubscribe needs, while the secret
    // has no use here (Zapier's hook URL is itself the shared secret) and storing it
    // in subscribeData would park a live credential in another system for no reason.
    const body = (response.data ?? {}) as { endpoint?: Record<string, unknown> } & Record<string, unknown>;
    return body.endpoint ?? body;
  };

  const performUnsubscribe = async (z: ZObject, bundle: Bundle) => {
    const endpointId = (bundle.subscribeData as { id?: number | string } | undefined)?.id;

    // Nothing to delete if the subscribe never completed. Returning quietly is right:
    // throwing here would leave the Zap undeletable in the editor.
    if (endpointId === undefined || endpointId === null) return {};

    // `hard=true` matters. The default is a soft delete that only flips IsActive, and
    // the endpoint quota counts rows rather than active ones - so a user who switches a
    // Zap off and on twenty times would hit "endpoint limit reached" and be unable to
    // create any more hooks. Zapier never returns to an endpoint it has unsubscribed.
    const response = await z.request({
      url: `${baseUrl(bundle)}/v1/webhooks/${endpointId}`,
      method: 'DELETE',
      params: { hard: 'true' },
    });
    return response.data ?? {};
  };

  /**
   * Runs on each inbound delivery. Zapier does not de-duplicate hook results.
   *
   * An empty request body means there is no delivery to report - which happens when
   * the operation is run outside a real hook, as `zapier invoke` does. Returning no
   * rows is the honest answer there; inventing one would fail validation for missing
   * an `id`.
   */
  const perform = async (z: ZObject, bundle: Bundle) => {
    const raw = bundle.cleanedRequest;
    if (!raw || (typeof raw === 'object' && Object.keys(raw).length === 0)) return [];

    const record = flattenDelivery(raw, event);
    return record.id === null || record.id === undefined ? [] : [record];
  };

  /**
   * Sample data for the editor's "test trigger" step. A hook has no history to replay,
   * so this polls the matching collection instead. The records are shaped like the
   * list DTO rather than the webhook payload; the fields a Zap normally maps - id,
   * name, title, stage, amounts, timestamps - are present in both.
   */
  const performList = async (z: ZObject, bundle: Bundle) => {
    const separator = sampleEndpoint.includes('?') ? '&' : '?';
    const response = await z.request({
      url: `${baseUrl(bundle)}${sampleEndpoint}${separator}`.replace(/[?&]$/, ''),
      method: 'GET',
    });

    return unwrapList<Record<string, unknown>>(response.data).map((record) => ({
      ...record,
      event,
      deliveredAt: null,
      deliveryId: null,
    }));
  };

  return {
    key,
    noun,
    display: { label, description },
    operation: {
      type: 'hook',
      performSubscribe,
      performUnsubscribe,
      perform,
      performList,
      sample: sampleFor(noun, event),
    },
  };
};
