import { describe, expect, it } from 'vitest';

import type { PlayerAttributes } from '../domain/career';
import { buildMatchCommentary } from '../engine/darts/commentary';
import {
	bullTarget,
	doubleTarget,
	hitTarget,
	isLegalHit,
	scoreVisit,
	singleTarget,
	trebleTarget,
} from '../engine/darts/rules';
import {
	aggregatePlayerStats,
	createMatch,
	finishMatch,
	matchResult,
	simulateMatch,
	simulateNextVisit,
} from '../engine/darts/simulation';
import type { MatchConfig } from '../engine/darts/types';
import { nextRandom } from '../engine/random/seededRandom';

const STANDARD_ATTRIBUTES: PlayerAttributes = {
	scoring: 48,
	finishing: 46,
	consistency: 50,
	composure: 47,
	stamina: 54,
};

function config(seed: number, bestOf: MatchConfig['bestOf'] = 5): MatchConfig {
	return {
		id: `test-match-${seed}`,
		seed,
		bestOf,
		inGameDate: '2026-01-05',
		players: [
			{ id: 'player-a', name: 'Alex North', attributes: STANDARD_ATTRIBUTES, form: 0, fatigue: 0 },
			{ id: 'player-b', name: 'Rowan Vale', attributes: STANDARD_ATTRIBUTES, form: 0, fatigue: 0 },
		],
	};
}

describe('seeded random generator', () => {
	it('replays an identical sequence from the same seed', () => {
		let firstState = 42;
		let secondState = 42;
		const first: number[] = [];
		const second: number[] = [];

		for (let index = 0; index < 20; index += 1) {
			const firstSample = nextRandom(firstState);
			const secondSample = nextRandom(secondState);
			first.push(firstSample.value);
			second.push(secondSample.value);
			firstState = firstSample.state;
			secondState = secondSample.state;
		}

		expect(first).toEqual(second);
	});
});

describe('501 visit rules', () => {
	it('checks out 50 on the bull and stops immediately', () => {
		const visit = scoreVisit('player-a', 50, [
			hitTarget(bullTarget()),
			hitTarget(singleTarget(20)),
		]);

		expect(visit.checkout).toBe(true);
		expect(visit.endScore).toBe(0);
		expect(visit.darts).toHaveLength(1);
		expect(visit.darts[0]?.winningDouble).toBe(true);
	});

	it('treats leaving one as a bust and restores the visit score', () => {
		const visit = scoreVisit('player-a', 2, [hitTarget(singleTarget(1))]);

		expect(visit.bust).toBe(true);
		expect(visit.endScore).toBe(2);
		expect(visit.score).toBe(0);
	});

	it('restores the start-of-visit score after overshooting', () => {
		const visit = scoreVisit('player-a', 32, [
			hitTarget(singleTarget(20)),
			hitTarget(trebleTarget(20)),
		]);

		expect(visit.bust).toBe(true);
		expect(visit.endScore).toBe(32);
		expect(visit.score).toBe(0);
	});

	it('rejects zero reached without a double', () => {
		const visit = scoreVisit('player-a', 20, [hitTarget(singleTarget(20))]);

		expect(visit.bust).toBe(true);
		expect(visit.checkout).toBe(false);
		expect(visit.endScore).toBe(20);
	});

	it('wins on an exact double and counts only darts used', () => {
		const visit = scoreVisit('player-a', 80, [
			hitTarget(singleTarget(20)),
			hitTarget(singleTarget(20)),
			hitTarget(doubleTarget(20)),
		]);

		expect(visit.checkout).toBe(true);
		expect(visit.endScore).toBe(0);
		expect(visit.darts).toHaveLength(3);
		expect(visit.score).toBe(80);
	});
});

describe('match commentary', () => {
	it('reports both remaining scores and calls a human checkout', () => {
		const matchConfig = config(42);
		const setupVisit = scoreVisit('player-a', 100, [
			hitTarget(singleTarget(20)),
			hitTarget(singleTarget(20)),
		]);
		const entries = buildMatchCommentary([{
			legNumber: 1,
			visits: [setupVisit],
			completesMatch: false,
		}], matchConfig.players, 'player-a');

		expect(entries[0]?.text).toContain('Alex North: 60 remaining · Rowan Vale: 501 remaining');
		expect(entries[0]?.text).toContain('You require 60');
	});

	it('uses leg and match-winning caller language', () => {
		const matchConfig = config(43);
		const checkout = scoreVisit('player-a', 40, [hitTarget(doubleTarget(20))]);
		const legCall = buildMatchCommentary([{
			legNumber: 2,
			visits: [checkout],
			completesMatch: false,
		}], matchConfig.players, 'player-a');
		const matchCall = buildMatchCommentary([{
			legNumber: 3,
			visits: [checkout],
			completesMatch: true,
		}], matchConfig.players, 'player-a');

		expect(legCall[0]?.text).toContain('Game shot and the 2nd leg, Alex North');
		expect(matchCall[0]?.text).toContain('Game shot and the match, Alex North');
	});
});

describe('match simulation', () => {
	it('produces the same complete result for the same seed', () => {
		expect(simulateMatch(config(88))).toEqual(simulateMatch(config(88)));
	});

	it('finishes at the required legs and never continues after zero', () => {
		const completed = finishMatch(createMatch(config(301, 5)));
		const winnerId = completed.winnerId;

		expect(completed.status).toBe('complete');
		expect(winnerId).toBeDefined();
		expect(completed.legsWon[winnerId ?? '']).toBe(3);
		expect(completed.completedLegs.length).toBeGreaterThanOrEqual(3);
		expect(completed.completedLegs.length).toBeLessThanOrEqual(5);
		expect(simulateNextVisit(completed)).toBe(completed);
	});

	it('records only legal dart hits and never a negative remaining score', () => {
		const result = simulateMatch(config(902));
		for (const leg of result.legs) {
			const scores: Record<string, number> = { 'player-a': 501, 'player-b': 501 };
			expect(leg.startingPlayerId).toBe(leg.legNumber % 2 === 1 ? 'player-a' : 'player-b');
			for (const visit of leg.visits) {
				expect(visit.startScore).toBe(scores[visit.playerId]);
				expect(visit.endScore).toBeGreaterThanOrEqual(0);
				expect(visit.darts.length).toBeGreaterThan(0);
				expect(visit.darts.length).toBeLessThanOrEqual(3);
				for (const dart of visit.darts) {
					expect(isLegalHit(dart.hit)).toBe(true);
					expect(dart.remainingAfter).toBeGreaterThanOrEqual(0);
				}
				scores[visit.playerId] = visit.endScore;
			}
			expect(scores[leg.winnerId]).toBe(0);
		}
	});

	it('aggregates stats directly from the recorded visits', () => {
		const result = simulateMatch(config(1_105));
		const stats = aggregatePlayerStats('player-a', result.legs);
		const visits = result.legs.flatMap((leg) => leg.visits).filter((visit) => visit.playerId === 'player-a');
		const darts = visits.reduce((total, visit) => total + visit.darts.length, 0);
		const points = visits.reduce((total, visit) => total + visit.score, 0);

		expect(stats).toEqual(result.stats['player-a']);
		expect(stats.dartsThrown).toBe(darts);
		expect(stats.pointsScored).toBe(points);
		expect(stats.threeDartAverage).toBeCloseTo((points / darts) * 3, 10);
		expect(stats.checkouts).toBe(stats.legsWon);
	});

	it('records a won leg completed in exactly nine darts', () => {
		const stats = aggregatePlayerStats('player-a', [{
			legNumber: 1,
			startingPlayerId: 'player-a',
			winnerId: 'player-a',
			visits: [],
			dartsByPlayer: { 'player-a': 9, 'player-b': 6 },
		}]);

		expect(stats.nineDarters).toBe(1);
	});

	it('terminates 1,000 seeded matches within the safety bound', () => {
		for (let seed = 1; seed <= 1_000; seed += 1) {
			const result = simulateMatch(config(seed, seed % 2 === 0 ? 3 : 5));
			const winningLegs = result.legsWon[result.winnerId] ?? 0;
			expect(winningLegs).toBe(Math.floor(result.bestOf / 2) + 1);
			expect(result.legs.length).toBeLessThanOrEqual(result.bestOf);
		}
	}, 20_000);

	it('exposes a complete result only after the match ends', () => {
		const state = createMatch(config(77));
		expect(() => matchResult(state)).toThrow(/before the match is complete/i);
	});
});

