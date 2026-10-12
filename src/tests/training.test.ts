import { describe, expect, it } from 'vitest';

import { createEmptyCareerForTests } from '../data/repositories/careerRepository';
import {
	createTrainingPlan,
	emptyTrainingAllocation,
	resolveTraining,
	TRAINING_FOCUSES,
} from '../engine/training/training';

const career = createEmptyCareerForTests({
	name: 'Alex North',
	age: 21,
	location: 'Northbridge',
	style: 'all-rounder',
	background: 'working-amateur',
});

describe('training engine', () => {
	it('rejects plans that exceed available hours', () => {
		expect(() => createTrainingPlan('2026-01-05', 8, {
			...emptyTrainingAllocation(),
			scoring: 9,
		})).toThrow(/exceeds/i);
	});

	it('resolves the same plan and RNG state deterministically', () => {
		const plan = createTrainingPlan(career.inGameDate, 8, {
			...emptyTrainingAllocation(),
			scoring: 3,
			finishing: 3,
			composure: 2,
		});

		expect(resolveTraining(career, plan)).toEqual(resolveTraining(career, plan));
	});

	it('adds visible progress to every trained attribute without random rolls', () => {
		const plan = createTrainingPlan(career.inGameDate, 8, {
			...emptyTrainingAllocation(),
			scoring: 2,
			finishing: 2,
			consistency: 2,
			composure: 2,
		});
		const result = resolveTraining(career, plan);

		expect(result.progressGained.scoring).toBeGreaterThan(0);
		expect(result.progressGained.finishing).toBeGreaterThan(0);
		expect(result.progressGained.consistency).toBeGreaterThan(0);
		expect(result.progressGained.composure).toBeGreaterThan(0);
		expect(result.progressGained.stamina).toBe(0);
		expect(result.finalRngState).toBe(career.rngState);
	});

	it('caps weekly development and never exceeds potential', () => {
		const plan = createTrainingPlan(career.inGameDate, 8, {
			...emptyTrainingAllocation(),
			scoring: 8,
		});
		const result = resolveTraining(career, plan);
		const totalImprovement = TRAINING_FOCUSES.reduce(
			(total, focus) => total + result.attributeChanges[focus],
			0,
		);

		expect(totalImprovement).toBeLessThanOrEqual(3);
		expect(result.attributeChanges.scoring).toBeLessThanOrEqual(2);
		expect(result.attributesAfter.scoring).toBeLessThanOrEqual(career.potential);
		expect(result.fatigueAdded).toBe(4);
	});

	it('allows a saved rest week without consuming random state', () => {
		const plan = createTrainingPlan(career.inGameDate, 8, emptyTrainingAllocation());
		const result = resolveTraining(career, plan);

		expect(result.totalHours).toBe(0);
		expect(result.fatigueAdded).toBe(0);
		expect(result.finalRngState).toBe(career.rngState);
		expect(result.attributesAfter).toEqual(career.attributes);
	});

	it('applies coaching as a deterministic progress bonus without bypassing weekly caps', () => {
		const plan = createTrainingPlan(career.inGameDate, 8, {
			...emptyTrainingAllocation(),
			scoring: 4,
			finishing: 4,
		});
		const uncoached = resolveTraining(career, plan);
		const coached = resolveTraining(career, plan, 0.25);
		const improvement = (result: typeof coached) => TRAINING_FOCUSES.reduce(
			(total, focus) => total + result.attributeChanges[focus],
			0,
		);

		expect(improvement(coached)).toBeGreaterThanOrEqual(improvement(uncoached));
		expect(coached.progressGained.scoring).toBeGreaterThan(uncoached.progressGained.scoring);
		expect(improvement(coached)).toBeLessThanOrEqual(3);
	});
});

