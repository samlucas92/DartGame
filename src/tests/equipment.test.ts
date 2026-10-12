import { describe, expect, it } from 'vitest';

import { createStartingAttributes } from '../domain/career';
import { applyDartsModifiers } from '../domain/equipment';
import { DARTS_CATALOGUE } from '../data/seed/equipment';

describe('darts equipment', () => {
	it('applies equipment trade-offs without mutating underlying attributes', () => {
		const attributes = createStartingAttributes('all-rounder');
		const original = { ...attributes };
		const harrier = DARTS_CATALOGUE.find((darts) => darts.id === 'darts-harrier-22');

		expect(harrier).toBeDefined();
		const effective = applyDartsModifiers(attributes, harrier ?? null);
		expect(effective.scoring).toBe(attributes.scoring + 2);
		expect(effective.finishing).toBe(attributes.finishing - 1);
		expect(attributes).toEqual(original);
	});

	it('keeps the starter darts neutral', () => {
		const attributes = createStartingAttributes('finisher');
		const starter = DARTS_CATALOGUE.find((darts) => darts.id === 'darts-house-23');

		expect(applyDartsModifiers(attributes, starter ?? null)).toEqual(attributes);
	});
});

