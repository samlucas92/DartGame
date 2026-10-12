import { describe, expect, it } from 'vitest';

import { createEmptyCareerForTests } from '../data/repositories/careerRepository';
import { LIFESTYLE_CATALOGUE } from '../data/seed/lifestyle';
import { SPONSOR_OFFERS } from '../data/seed/sponsorships';
import type { LifestyleState } from '../domain/lifestyle';
import { lifestylePracticeBonus, lifestyleWeeklyCost, lifestyleWeeklyRecovery } from '../domain/lifestyle';
import { sponsorUnlocked, type SponsorshipContract } from '../domain/sponsorship';
import { resolveWeek, weeklyCommitments } from '../engine/calendar/weeklyAdvance';

const career = createEmptyCareerForTests({
	name: 'Alex North',
	age: 21,
	location: 'Northbridge',
	style: 'all-rounder',
	background: 'working-amateur',
});

function item(id: string) {
	const result = LIFESTYLE_CATALOGUE.find((entry) => entry.id === id);
	if (!result) {
		throw new Error(`Missing test lifestyle item ${id}`);
	}
	return result;
}

function sponsor(id: string) {
	const result = SPONSOR_OFFERS.find((entry) => entry.id === id);
	if (!result) {
		throw new Error(`Missing test sponsor ${id}`);
	}
	return result;
}

describe('career systems', () => {
	it('uses active lifestyle choices for recurring costs and practice time', () => {
		const lifestyle: LifestyleState = {
			home: item('home-shared-flat'),
			transport: item('transport-bus'),
			practice: item('practice-lit-oche'),
			ownedItemIds: [],
		};
		const commitments = weeklyCommitments(career.background, lifestyle);

		expect(lifestyleWeeklyCost(lifestyle)).toBe(25_200);
		expect(lifestylePracticeBonus(lifestyle)).toBe(4);
		expect(commitments.practiceHours).toBe(12);
		expect(commitments.livingCostPence).toBe(36_200);
	});

	it('gives upgraded homes and transport real weekly recovery effects', () => {
		const lifestyle: LifestyleState = {
			home: item('home-one-bed'),
			transport: item('transport-hatchback'),
			practice: item('practice-home-board'),
			ownedItemIds: [],
		};
		const commitments = weeklyCommitments(career.background, lifestyle);

		expect(lifestylePracticeBonus(lifestyle)).toBe(4);
		expect(lifestyleWeeklyRecovery(lifestyle)).toBe(7);
		expect(commitments.fatigueDelta).toBe(1);
		expect(item('experience-weekend-break').instantRecovery).toBe(18);
	});

	it('locks sponsorships until their match and win requirements are met', () => {
		const starter = sponsor('sponsor-northbridge-flights');
		expect(sponsorUnlocked(starter, career)).toBe(false);
		expect(sponsorUnlocked(starter, {
			...career,
			stats: { ...career.stats, matchesPlayed: 2 },
		})).toBe(true);
	});

	it('includes active sponsorship income in the weekly balance', () => {
		const offer = sponsor('sponsor-northbridge-flights');
		const sponsorship: SponsorshipContract = {
			...offer,
			signedAt: '2026-01-05T00:00:00.000Z',
		};
		const summary = resolveWeek(career, undefined, null, null, sponsorship);

		expect(summary.sponsorshipIncomePence).toBe(offer.weeklyPaymentPence);
		expect(summary.netChangePence).toBe(211_200);
	});
});

