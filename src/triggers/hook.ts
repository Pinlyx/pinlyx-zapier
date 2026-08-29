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

  return {
    ...record,
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

    // Response is an EndpointDto, so PascalCase on the wire; the app-level
    // afterResponse has already camelCased it by the time we read `id`.
    return response.data;
  };

  const performUnsubscribe = async (z: ZObject, bundle: Bundle) => {
    const endpointId = (bundle.subscribeData as { id?: number | string } | undefined)?.id;

    // Nothing to delete if the subscribe never completed. Returning quietly is right:
    // throwing here would leave the Zap undeletable in the editor.
    if (endpointId === undefined || endpointId === null) return {};

    const response = await z.request({
      url: `${baseUrl(bundle)}/v1/webhooks/${endpointId}`,
      method: 'DELETE',
    });
    return response.data ?? {};
  };

  /** Runs on each inbound delivery. Zapier does not de-duplicate hook results. */
  const perform = async (z: ZObject, bundle: Bundle) => [
    flattenDelivery(bundle.cleanedRequest, event),
  ];

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
