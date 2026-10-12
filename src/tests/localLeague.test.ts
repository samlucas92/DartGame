import { describe, expect, it } from 'vitest';

import { createEmptyCareerForTests } from '../data/repositories/careerRepository';
import {
	fixtureOpponent,
	prepareAiLeagueResults,
} from '../data/repositories/leagueRepository';
import { LOCAL_LEAGUE_AI_PLAYERS } from '../data/seed/demoWorld';
import { buildSiblingLocalLeagues, selectSiblingPromotion } from '../data/seed/localLeagues';
import type { LeagueFixture, LeaguePlayer, LocalLeague } from '../domain/league';
import { calculateStandings, createRoundRobinFixtures } from '../engine/league/localLeague';

const career = createEmptyCareerForTests({
	name: 'Alex North',
	age: 21,
	location: 'Northbridge',
	style: 'all-rounder',
	background: 'working-amateur',
});

const human: LeaguePlayer = {
	id: career.playerId,
	name: career.name,
	isHuman: true,
	style: career.style,
	attributes: career.attributes,
	form: career.form,
	fatigue: career.fatigue,
};

function createLeague(fixtures: LeagueFixture[]): LocalLeague {
	const players = [human, ...LOCAL_LEAGUE_AI_PLAYERS];
	return {
		id: 'lantern-league',
		name: 'The Lantern League',
		season: 1,
		players,
		fixtures,
		standings: calculateStandings(players, fixtures),
	};
}

describe('local league', () => {
	it('creates a five-round schedule with every pairing exactly once', () => {
		const playerIds = [human, ...LOCAL_LEAGUE_AI_PLAYERS].map((player) => player.id);
		const fixtures = createRoundRobinFixtures(playerIds, '2026-01-05');
		const pairings = fixtures.map((fixture) => (
			[fixture.homePlayerId, fixture.awayPlayerId].sort().join(':')
		));

		expect(fixtures).toHaveLength(15);
		expect(new Set(fixtures.map((fixture) => fixture.round)).size).toBe(5);
		expect(new Set(pairings).size).toBe(15);
		for (let round = 1; round <= 5; round += 1) {
			const roundPlayers = fixtures
				.filter((fixture) => fixture.round === round)
				.flatMap((fixture) => [fixture.homePlayerId, fixture.awayPlayerId]);
			expect(new Set(roundPlayers).size).toBe(6);
		}
	});

	it('can create another season without reusing fixture identities', () => {
		const playerIds = [human, ...LOCAL_LEAGUE_AI_PLAYERS].map((player) => player.id);
		const firstSeason = createRoundRobinFixtures(playerIds, '2026-01-05', 1, 0);
		const secondSeason = createRoundRobinFixtures(playerIds, '2026-02-09', 2, 5);

		expect(secondSeason[0]?.season).toBe(2);
		expect(secondSeason[0]?.sequence).toBe(6);
		expect(new Set([...firstSeason, ...secondSeason].map((fixture) => fixture.id)).size).toBe(30);
	});

	it('calculates points and uses leg difference as the tie-breaker', () => {
		const fixtures = createRoundRobinFixtures(
			[human, ...LOCAL_LEAGUE_AI_PLAYERS].map((player) => player.id),
			'2026-01-05',
		);
		const completed = fixtures.slice(0, 3).map((fixture, index) => ({
			...fixture,
			status: 'complete' as const,
			winnerId: fixture.homePlayerId,
			homeLegs: 3,
			awayLegs: index === 0 ? 0 : 2,
			matchId: fixture.id,
		}));
		const standings = calculateStandings(
			[human, ...LOCAL_LEAGUE_AI_PLAYERS],
			[...completed, ...fixtures.slice(3)],
		);

		expect(standings[0]).toMatchObject({ played: 1, won: 1, points: 2, legDifference: 3 });
		expect(standings.filter((standing) => standing.played === 1)).toHaveLength(6);
	});

	it('resolves the two AI fixtures deterministically and leaves the human fixture alone', () => {
		const fixtures = createRoundRobinFixtures(
			[human, ...LOCAL_LEAGUE_AI_PLAYERS].map((player) => player.id),
			'2026-01-05',
		);
		const league = createLeague(fixtures);
		const first = prepareAiLeagueResults(league, '2026-01-05', 12345);
		const second = prepareAiLeagueResults(league, '2026-01-05', 12345);
		const humanFixture = fixtures.find((fixture) => (
			fixture.homePlayerId === human.id || fixture.awayPlayerId === human.id
		));

		expect(first).toEqual(second);
		expect(first.results).toHaveLength(2);
		expect(first.results.some(({ fixture }) => fixture.id === humanFixture?.id)).toBe(false);
		expect(humanFixture && fixtureOpponent(league, humanFixture, human.id)).not.toBeNull();
	});

	it('connects sibling leagues through promotion and relegation', () => {
		const opening = buildSiblingLocalLeagues(1);
		const promotion = selectSiblingPromotion(2, [human.id, ...LOCAL_LEAGUE_AI_PLAYERS.map((player) => player.id)], []);
		expect(opening).toHaveLength(2);
		expect(opening.every((league) => league.players.length === 6)).toBe(true);
		expect(promotion).not.toBeNull();

		if (!promotion) {
			return;
		}
		const demoted = LOCAL_LEAGUE_AI_PLAYERS[0]!;
		const moved = buildSiblingLocalLeagues(2, [
			{
				id: 'promotion',
				season: 2,
				player: promotion.player,
				fromLeagueId: promotion.league.id,
				fromLeagueName: promotion.league.name,
				toLeagueId: 'lantern-league',
				toLeagueName: 'The Lantern League',
				direction: 'promoted',
			},
			{
				id: 'relegation',
				season: 2,
				player: demoted,
				fromLeagueId: 'lantern-league',
				fromLeagueName: 'The Lantern League',
				toLeagueId: promotion.league.id,
				toLeagueName: promotion.league.name,
				direction: 'relegated',
			},
		]);
		const destination = moved.find((league) => league.id === promotion.league.id);
		expect(destination?.players.some((player) => player.id === promotion.player.id)).toBe(false);
		expect(destination?.players.some((player) => player.id === demoted.id)).toBe(true);
	});
});

