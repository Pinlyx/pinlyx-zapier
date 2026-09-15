# Pinlyx for Zapier

The Zapier integration for [Pinlyx](https://pinlyx.com). Built on the public v1
REST API and the self-service webhook system, so it adds no server-side surface of its
own: everything here is a client.

- **15 triggers**, all REST Hooks driven by the CRM's webhook events
- **13 actions**, from creating a contact to replying inside a WhatsApp conversation
- **3 searches**, each paired with a create as a Zapier "find or create" step

## Getting started

```bash
npm install
npm test          # builds, then runs the suite against mocked HTTP
npm run build     # tsc -> lib/
```

`zapier` is not installed globally here; use the local binary:

```bash
./node_modules/.bin/zapier-platform validate   # schema + Zapier's publishing checks
./node_modules/.bin/zapier-platform login
./node_modules/.bin/zapier-platform register "Pinlyx"   # first time only
./node_modules/.bin/zapier-platform push
```

`push` runs the `_zapier-build` script first, so the TypeScript is always compiled from
source rather than from whatever happens to be in `lib/`.

## How it is put together

```
src/
  client.ts         HTTP middleware: auth headers, error mapping, casing normalization
  authentication.ts API key auth, tested against /v1/me
  events.ts         The webhook event catalogue - one entry per trigger
  triggers/
    hook.ts         Builds a REST Hook trigger from an event definition
    dropdowns.ts    Hidden triggers that populate the pickers in action forms
    samples.ts      One sample record per noun
  creates/          Contact, enrichment, deal, task and messaging actions
  searches/         Find contact, deal and task
```

Every trigger comes from `EVENTS` in `events.ts` through one factory. Adding a trigger
for a new CRM event is a table entry, not a new file - which is also why `deal.won`
cannot accidentally subscribe to `deal.lost`.

## Three things about the API that shape this code

**Casing is mixed and permanent.** The API runs with `PropertyNamingPolicy = null`, so a
response built from a DTO class (`ContactDto`, `DealDto`, the error envelope) is
PascalCase, while one built from an anonymous object (the `{ items, nextCursor, hasMore }`
page wrapper, `/v1/me`, every webhook payload) is camelCase - often in the same response.
A Zap stores its field mapping by key, so a trigger that emitted `Name` one day and
`name` the next would break every Zap built on it. `normalize` in `client.ts` camelCases
every key on the way in, and the whole integration speaks camelCase. The one exception is
`customFields`, whose keys are field names the customer defined; those are passed through
untouched.

**Collections are always `{ items, nextCursor, hasMore }`** - never a bare array, never
`data`. `unwrapList` is the only place that knows this.

**There is no idempotency key.** The API accepts `Idempotency-Key` with a 24-hour window,
but Zapier's runtime exposes no per-attempt identifier, so any key this integration could
build would have to be derived from the request body. Within that window a legitimate
repeat - a daily reminder Zap, the same message deliberately sent twice - would be
silently replayed instead of sent. A swallowed send is a worse failure than a duplicate,
because nobody notices it. Deduplication is done properly instead, through `externalId`
and the Find or Create steps.

## Deliberate omissions

- **No "mark deal as won" action.** Winning a deal books an income entry in the finance
  ledger, and the API refuses that over a public key. The stage dropdown omits `won`
  rather than offering a choice that always fails.
- **No "start a new WhatsApp/Instagram conversation" action.** Those platforms only allow
  replies inside a window the customer opened, so the action takes a conversation id
  from a trigger.
- **No dropdown for the assignee field.** The public API exposes the workspaces a key
  belongs to but not their member lists, so the field takes a user id with help text
  rather than a picker that would have to guess.
- **`cleanInputData` is left at its default.** Zapier's validator suggests turning it off
  for predictability, but with it off, integer fields arrive as strings and the API's
  JSON binding rejects them.

## Scopes

A key needs the scopes for what its Zaps do. At minimum:

| To use | Scopes |
|---|---|
| Any trigger | `webhooks:read`, `webhooks:write` |
| Contact triggers, searches, pickers | `contacts:read` |
| Contact, tag, score, assignment actions | `contacts:write` |
| Deal actions and triggers | `deals:read`, `deals:write` |
| Task actions and triggers | `tasks:read`, `tasks:write` |
| Pipeline column picker | `pipelines:read` |
| Send Telegram message | `telegram:send` |
| Reply in social conversation | `social:read`, `social:write` |
| Send X direct message | `twitter:send` |
| Invoice triggers | `finance:read` |

A key missing a scope fails that action with a 403 whose message says so, rather than
failing at connection time.

## License

MIT.
