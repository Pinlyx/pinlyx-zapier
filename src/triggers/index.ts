import type { Trigger } from 'zapier-platform-core';
import { EVENTS } from '../events';
import { buildHookTrigger } from './hook';
import { dropdownTriggers } from './dropdowns';

/**
 * Every event in the catalogue becomes a REST Hook trigger, and the hidden dropdown
 * triggers are appended. Keyed by trigger key, which is the shape Zapier's app
 * definition wants.
 */
export const triggers: Record<string, Trigger> = [
  ...EVENTS.map(buildHookTrigger),
  ...dropdownTriggers,
].reduce<Record<string, Trigger>>((all, trigger) => {
  all[trigger.key] = trigger;
  return all;
}, {});
