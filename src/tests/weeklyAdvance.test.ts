import { describe, expect, it } from 'vitest';

import { createEmptyCareerForTests } from '../data/repositories/careerRepository';
import { ageOnDate } from '../domain/career';
import {
	addInGameDays,
	createWeekPlan,
	resolveWeek,
	weeklyCommitments,
} from '../engine/calendar/weeklyAdvance';

describe('weekly calendar engine', () => {
	it('advances ISO dates independently of the device timezone', () => {
		expect(addInGameDays('2026-01-26', 7)).toBe('2026-02-02');
		expect(addInGameDays('2028-02-26', 3)).toBe('2028-02-29');
	});

	it('rejects impossible in-game dates', () => {
		expect(() => addInGameDays('2026-02-30', 1)).toThrow(/invalid in-game date/i);
	});

	it('gives backgrounds distinct work and practice trade-offs', () => {
		const working = weeklyCommitments('working-amateur');
		const supported = weeklyCommitments('supported-prospect');

		expect(working.workHours).toBeGreaterThan(supported.workHours);
		expect(working.practiceHours).toBeLessThan(supported.practiceHours);
		expect(working.incomePence).toBeGreaterThan(supported.incomePence);
	});

	it('creates a stable week schedule and balance summary', () => {
		const career = createEmptyCareerForTests({
			name: 'Alex North',
			age: 21,
			location: 'Northbridge',
			style: 'all-rounder',
			background: 'working-amateur',
		});
		const plan = createWeekPlan(career.inGameDate, career.background);
		const summary = resolveWeek(career);

		expect(plan.id).toBe('week-2026-01-05');
		expect(plan.toDate).toBe('2026-01-12');
		expect(plan.events.map((event) => event.kind)).toEqual([
			'work',
			'training',
			'fixture',
			'expense',
		]);
		expect(summary.netChangePence).toBe(207_200);
		expect(summary.endingBalancePence).toBe(252_200);
		expect(summary.incomeDescription).toBe('Monthly payday');
		expect(summary.fatigueAfter).toBe(8);
		expect(summary.weeksElapsedAfter).toBe(1);
		expect(summary.ageAfter).toBe(21);
	});

	it('pays employment income every four career weeks', () => {
		const career = {
			...createEmptyCareerForTests({
				name: 'Alex North',
				age: 21,
				location: 'Northbridge',
				style: 'all-rounder' as const,
				background: 'working-amateur' as const,
			}),
			weeksElapsed: 1,
		};
		const summary = resolveWeek(career);

		expect(summary.incomePence).toBe(0);
		expect(summary.incomeDescription).toMatch(/payday in 3 weeks/i);
	});

	it('increases age when an in-game week crosses the player birthday', () => {
		const career = {
			...createEmptyCareerForTests({
				name: 'Alex North',
				dateOfBirth: '2004-01-10',
				location: 'Northbridge',
				style: 'all-rounder' as const,
				background: 'working-amateur' as const,
			}),
		};

		expect(resolveWeek(career).ageAfter).toBe(22);
	});

	it('calculates age from the exact in-game birthday', () => {
		expect(ageOnDate('2007-07-01', '2026-06-30')).toBe(18);
		expect(ageOnDate('2007-07-01', '2026-07-01')).toBe(19);
	});

	it('caps fatigue at one hundred', () => {
		const career = {
			...createEmptyCareerForTests({
				name: 'Alex North',
				age: 21,
				location: 'Northbridge',
				style: 'all-rounder',
				background: 'working-amateur',
			}),
			fatigue: 97,
		};

		expect(resolveWeek(career).fatigueAfter).toBe(100);
	});
});

