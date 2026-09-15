import { createAppTester } from 'zapier-platform-core';
import nock from 'nock';
import App from '../src/index';

const appTester = createAppTester(App as never);
const API = 'https://api.crmsolid.com';
// Shaped like a real key: csk_<env>_ plus 12 char id and 32 char secret.
const authData = { apiKey: 'csk_test_abcdefghijkl0123456789abcdef0123456789abcdef' };

// The app definition is typed loosely here on purpose: reaching into
// `triggers.x.operation.perform` collapses to a union of every operation shape, and
// asserting through it adds noise without catching anything a test would not.
const app = App as never as Record<string, Record<string, { operation: Record<string, unknown> }>>;

/**
 * Zapier's tester types `subscribeData.id` as a required string, but the CRM returns a
 * numeric endpoint id and that is what actually round-trips through a Zap. The cast
 * keeps the tests exercising the real shape instead of a shape that never occurs.
 */
const bundleOf = (bundle: Record<string, unknown>) => bundle as never;

afterEach(() => nock.cleanAll());

describe('authentication', () => {
  it('identifies the workspace behind the key', async () => {
    nock(API)
      .get('/v1/me')
      .matchHeader('authorization', 'Bearer csk_test_abcdefghijkl0123456789abcdef0123456789abcdef')
      .reply(200, { id: 17, email: 'ada@analytical.co', name: 'Ada Lovelace' });

    const result = await appTester(App.authentication.test as never, { authData });
    expect(result).toMatchObject({ id: 17, email: 'ada@analytical.co' });
  });

  it('sends the workspace header only when one is configured', async () => {
    nock(API).get('/v1/me').matchHeader('x-workspace-id', '42').reply(200, { id: 17 });

    const result = await appTester(App.authentication.test as never, {
      authData: { ...authData, workspaceId: '42' },
    });
    expect(result).toMatchObject({ id: 17 });
  });

  it('rejects a truncated key before spending a request on it', async () => {
    // No nock interceptor: reaching the network here would itself be the failure.
    await expect(
      appTester(App.authentication.test as never, { authData: { apiKey: 'csk_live_tooshort' } }),
    ).rejects.toThrow(/does not look like a complete Pinlyx API key/);
  });

  it('accepts a key that was pasted across a line break', async () => {
    nock(API)
      .get('/v1/me')
      .matchHeader('authorization', 'Bearer csk_test_abcdefghijkl0123456789abcdef0123456789abcdef')
      .reply(200, { id: 17 });

    const result = await appTester(App.authentication.test as never, {
      authData: { apiKey: 'csk_test_abcdefghijkl012345678\n 9abcdef0123456789abcdef' },
    });
    expect(result).toMatchObject({ id: 17 });
  });

  it('turns a rejected key into an auth error the user is asked to fix', async () => {
    nock(API).get('/v1/me').reply(401, { Error: 'unauthorized', Message: 'api key revoked' });

    await expect(appTester(App.authentication.test as never, { authData })).rejects.toThrow(
      /api key revoked/,
    );
  });

  it('surfaces the API message from a PascalCase error envelope', async () => {
    nock(API)
      .post('/v1/contacts')
      .reply(400, {
        Error: 'bad_request',
        Message: 'name, username, phone, email or externalId is required',
      });

    await expect(
      appTester(app.creates.create_contact.operation.perform as never, {
        authData,
        inputData: { company: 'Analytical Engines' },
      }),
    ).rejects.toThrow(/externalId is required/);
  });
});

describe('create contact', () => {
  it('posts only the fields the user filled in, and tags the source', async () => {
    let body: Record<string, unknown> = {};
    nock(API)
      .post('/v1/contacts', (posted) => {
        body = posted;
        return true;
      })
      .reply(201, { Id: 4821, Name: 'Ada Lovelace', ExternalId: 'x-9', LeadScore: null });

    const result = await appTester(app.creates.create_contact.operation.perform as never, {
      authData,
      inputData: { name: 'Ada Lovelace', externalId: 'x-9', email: '', company: undefined },
    });

    expect(body).toEqual({ name: 'Ada Lovelace', externalId: 'x-9' });
    // And the PascalCase response comes back camelCased for field mapping.
    expect(result).toEqual({ id: 4821, name: 'Ada Lovelace', externalId: 'x-9', leadScore: null });
  });
});

describe('rest hooks', () => {
  it('subscribes the Zap target URL to exactly one event type', async () => {
    let body: Record<string, unknown> = {};
    nock(API)
      .post('/v1/webhooks', (posted) => {
        body = posted;
        return true;
      })
      // The live API wraps the row: { endpoint, secret }. A bare DTO here would let a
      // broken performSubscribe pass its test and then strand webhooks in production.
      .reply(201, {
        endpoint: { Id: 55, Url: 'https://hooks.zapier.com/abc', EventTypes: ['deal.won'] },
        secret: 'TjyRp9yXvDfb7JmqahdnX1yLoBdk/5utR7ntU7Oa7Uw=',
      });

    const result = await appTester(app.triggers.deal_won.operation.performSubscribe as never, {
      authData,
      targetUrl: 'https://hooks.zapier.com/abc',
    });

    expect(body).toMatchObject({
      url: 'https://hooks.zapier.com/abc',
      eventTypes: ['deal.won'],
    });
    // The endpoint id has to survive into subscribeData: it is the only handle
    // performUnsubscribe gets.
    expect(result).toMatchObject({ id: 55 });
    // The signing secret must not be parked in Zapier's stored subscribeData.
    expect(result).not.toHaveProperty('secret');
  });

  it('deletes the endpoint it created', async () => {
    // hard=true: the default soft delete leaves the row counting against the user's
    // endpoint quota, so a Zap toggled off and on repeatedly would exhaust it.
    const scope = nock(API).delete('/v1/webhooks/55').query({ hard: 'true' }).reply(200, {});

    await appTester(
      app.triggers.deal_won.operation.performUnsubscribe as never,
      bundleOf({ authData, subscribeData: { id: 55 } }),
    );

    expect(scope.isDone()).toBe(true);
  });

  it('does not call the API when there is nothing to unsubscribe', async () => {
    const result = await appTester(
      app.triggers.deal_won.operation.performUnsubscribe as never,
      bundleOf({ authData, subscribeData: {} }),
    );
    expect(result).toEqual({});
  });

  it('flattens a delivery into the record plus the event name', async () => {
    const result = (await appTester(app.triggers.contact_created.operation.perform as never, {
      authData,
      cleanedRequest: {
        event: 'contact.created',
        id: 'a1b2c3',
        deliveredAt: '2026-08-29T09:14:23Z',
        data: { id: 4821, name: 'Ada Lovelace', source: 'inboundMessage' },
      },
    })) as Array<Record<string, unknown>>;

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 4821,
      name: 'Ada Lovelace',
      source: 'inboundMessage',
      event: 'contact.created',
      deliveredAt: '2026-08-29T09:14:23Z',
      deliveryId: 'a1b2c3',
    });
  });

  it('falls back to the delivery id when the payload carries no record id', async () => {
    // Zapier rejects a trigger result with no `id`, which would fail the whole Zap
    // rather than the one malformed event.
    const result = (await appTester(app.triggers.contact_created.operation.perform as never, {
      authData,
      cleanedRequest: { event: 'contact.created', id: 'deliv-77', data: {} },
    })) as Array<Record<string, unknown>>;

    expect(result[0]).toMatchObject({ id: 'deliv-77', deliveryId: 'deliv-77' });
  });

  it('keeps the record id when the payload has one', async () => {
    const result = (await appTester(app.triggers.contact_created.operation.perform as never, {
      authData,
      cleanedRequest: { event: 'contact.created', id: 'deliv-77', data: { id: 4821 } },
    })) as Array<Record<string, unknown>>;

    expect(result[0]).toMatchObject({ id: 4821, deliveryId: 'deliv-77' });
  });

  it('falls back to the trigger event when a delivery arrives without one', async () => {
    const result = (await appTester(app.triggers.deal_lost.operation.perform as never, {
      authData,
      cleanedRequest: { data: { id: 318, title: 'Annual plan' } },
    })) as Array<Record<string, unknown>>;

    expect(result[0]).toMatchObject({ id: 318, event: 'deal.lost' });
  });

  it('polls a real list for the editor sample and stamps the event on it', async () => {
    nock(API)
      .get('/v1/deals')
      .query({ stage: 'won', limit: '3' })
      .reply(200, { items: [{ Id: 318, Title: 'Annual plan' }], nextCursor: null, hasMore: false });

    const result = (await appTester(app.triggers.deal_won.operation.performList as never, {
      authData,
    })) as Array<Record<string, unknown>>;

    expect(result).toEqual([
      { id: 318, title: 'Annual plan', event: 'deal.won', deliveredAt: null, deliveryId: null },
    ]);
  });
});

describe('find contact', () => {
  it('prefers the exact external id over the fuzzy text search', async () => {
    nock(API)
      .get('/v1/contacts')
      .query({ limit: '5', externalId: 'x-9' })
      .reply(200, { items: [{ Id: 4821 }], nextCursor: null, hasMore: false });

    const result = await appTester(app.searches.find_contact.operation.perform as never, {
      authData,
      inputData: { externalId: 'x-9', email: 'ada@analytical.co', q: 'Ada' },
    });

    expect(result).toEqual([{ id: 4821 }]);
  });

  it('falls back to email before free text', async () => {
    nock(API)
      .get('/v1/contacts')
      .query({ limit: '5', email: 'ada@analytical.co' })
      .reply(200, { items: [], nextCursor: null, hasMore: false });

    const result = await appTester(app.searches.find_contact.operation.perform as never, {
      authData,
      inputData: { email: 'ada@analytical.co', q: 'Ada' },
    });

    // An empty array is "not found", which is what drives Find or Create.
    expect(result).toEqual([]);
  });

  it('refuses to search with no criteria rather than returning everything', async () => {
    await expect(
      appTester(app.searches.find_contact.operation.perform as never, {
        authData,
        inputData: {},
      }),
    ).rejects.toThrow(/external ID, an email address, or search text/);
  });
});

describe('app definition', () => {
  it('exposes one trigger per catalogued event, all with samples', () => {
    for (const [key, trigger] of Object.entries(App.triggers)) {
      expect(trigger.key).toBe(key);
      expect(trigger.operation.sample).toBeDefined();
    }
  });

  it('never offers a deal stage the API rejects', () => {
    // Moving a deal to `won` books revenue and is panel-only, so it must not appear
    // as a choice that always fails.
    const choices = (
      app.creates.change_deal_stage.operation.inputFields as Array<{
        key: string;
        choices?: Record<string, string>;
      }>
    ).find((field) => field.key === 'stage')?.choices;

    expect(choices).toBeDefined();
    expect(Object.keys(choices as Record<string, string>)).not.toContain('won');
  });
});
