import { compact, normalize, unwrapList } from '../src/client';

/**
 * The casing layer is the part of this integration most likely to break a customer's
 * Zaps silently, so it is the part with the most tests. The API returns PascalCase from
 * DTO classes and camelCase from anonymous objects, in the same response.
 */
describe('normalize', () => {
  it('camelCases PascalCase keys from DTO classes', () => {
    expect(normalize({ Id: 1, ExternalId: 'x-9', LeadScoreIsAi: true })).toEqual({
      id: 1,
      externalId: 'x-9',
      leadScoreIsAi: true,
    });
  });

  it('leaves already-camelCase keys alone', () => {
    expect(normalize({ items: [], nextCursor: null, hasMore: false })).toEqual({
      items: [],
      nextCursor: null,
      hasMore: false,
    });
  });

  it('handles the mixed envelope the API actually returns', () => {
    const wire = { items: [{ Id: 4821, Name: 'Ada' }], nextCursor: 4820, hasMore: true };
    expect(normalize(wire)).toEqual({
      items: [{ id: 4821, name: 'Ada' }],
      nextCursor: 4820,
      hasMore: true,
    });
  });

  it('recurses into nested objects and arrays', () => {
    const wire = { Deal: { Tasks: [{ Id: 1, Title: 'Call' }] } };
    expect(normalize(wire)).toEqual({ deal: { tasks: [{ id: 1, title: 'Call' }] } });
  });

  it('never rewrites the keys inside customFields', () => {
    // Those keys are field names the customer defined. Renaming "VAT_Number" to
    // "vAT_Number" would quietly break every Zap mapping that reads it.
    const wire = { Id: 1, CustomFields: { VAT_Number: 'GB123', Region: 'EU' } };
    expect(normalize(wire)).toEqual({
      id: 1,
      customFields: { VAT_Number: 'GB123', Region: 'EU' },
    });
  });

  it('passes primitives and null through untouched', () => {
    expect(normalize(null)).toBeNull();
    expect(normalize('Ada')).toBe('Ada');
    expect(normalize(42)).toBe(42);
  });
});

describe('unwrapList', () => {
  it('reads the items array out of a page envelope', () => {
    expect(unwrapList({ items: [{ id: 1 }], nextCursor: null, hasMore: false })).toEqual([
      { id: 1 },
    ]);
  });

  it('returns an empty array when the envelope has no items', () => {
    expect(unwrapList({ nextCursor: null, hasMore: false })).toEqual([]);
    expect(unwrapList(null)).toEqual([]);
  });

  it('tolerates a bare array', () => {
    expect(unwrapList([{ id: 1 }])).toEqual([{ id: 1 }]);
  });

  it('does not mistake a "data" key for the item list', () => {
    // The v1 API never wraps in `data`; if a caller ever assumes it does, they get an
    // empty list rather than a wrong one.
    expect(unwrapList({ data: [{ id: 1 }] })).toEqual([]);
  });
});

describe('compact', () => {
  it('drops undefined, null and empty-string fields', () => {
    expect(compact({ name: 'Ada', email: '', phone: null, company: undefined, score: 0 })).toEqual({
      name: 'Ada',
      score: 0,
    });
  });

  it('keeps false and zero, which are real values', () => {
    expect(compact({ overdue: false, leadScore: 0 })).toEqual({ overdue: false, leadScore: 0 });
  });
});
