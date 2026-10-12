import type { LeagueFixture, LeaguePlayer, LeagueStanding } from '../../domain/league';
import { addInGameDays } from '../calendar/weeklyAdvance';

export function createRoundRobinFixtures(
	playerIds: string[],
	seasonStart: string,
	season = 1,
	sequenceOffset = 0,
): LeagueFixture[] {
	if (playerIds.length < 2 || playerIds.length % 2 !== 0) {
		throw new Error('A local league needs an even number of at least two players.');
	}

	const rotation = [...playerIds];
	const fixtures: LeagueFixture[] = [];
	for (let roundIndex = 0; roundIndex < playerIds.length - 1; roundIndex += 1) {
		const weekStart = addInGameDays(seasonStart, roundIndex * 7);
		for (let pairIndex = 0; pairIndex < playerIds.length / 2; pairIndex += 1) {
			const first = rotation[pairIndex];
			const second = rotation[rotation.length - 1 - pairIndex];
			if (!first || !second) {
				throw new Error('Could not build the local league schedule.');
			}
			const swapHome = (roundIndex + pairIndex) % 2 === 1;
			const homePlayerId = swapHome ? second : first;
			const awayPlayerId = swapHome ? first : second;
			const round = roundIndex + 1;
			const sequence = sequenceOffset + round;
			fixtures.push({
				id: `lantern-s${season}-r${round}-${homePlayerId}-${awayPlayerId}`,
				season,
				round,
				sequence,
				weekStart,
				date: addInGameDays(weekStart, 4),
				homePlayerId,
				awayPlayerId,
				bestOf: 5,
				status: 'scheduled',
				winnerId: null,
				homeLegs: null,
				awayLegs: null,
				matchId: null,
			});
		}

		const last = rotation.pop();
		if (!last) {
			throw new Error('Could not rotate the local league schedule.');
		}
		rotation.splice(1, 0, last);
	}

	return fixtures;
}

export function calculateStandings(
	players: LeaguePlayer[],
	fixtures: LeagueFixture[],
): LeagueStanding[] {
	const table = new Map<string, LeagueStanding>(players.map((player) => [player.id, {
		playerId: player.id,
		name: player.name,
		played: 0,
		won: 0,
		lost: 0,
		legsFor: 0,
		legsAgainst: 0,
		legDifference: 0,
		points: 0,
	}]));

	for (const fixture of fixtures) {
		if (fixture.status !== 'complete' || fixture.homeLegs === null || fixture.awayLegs === null) {
			continue;
		}
		const home = table.get(fixture.homePlayerId);
		const away = table.get(fixture.awayPlayerId);
		if (!home || !away || !fixture.winnerId) {
			continue;
		}
		home.played += 1;
		away.played += 1;
		home.legsFor += fixture.homeLegs;
		home.legsAgainst += fixture.awayLegs;
		away.legsFor += fixture.awayLegs;
		away.legsAgainst += fixture.homeLegs;
		const winner = fixture.winnerId === home.playerId ? home : away;
		const loser = winner === home ? away : home;
		winner.won += 1;
		winner.points += 2;
		loser.lost += 1;
	}

	for (const standing of table.values()) {
		standing.legDifference = standing.legsFor - standing.legsAgainst;
	}

	return [...table.values()].sort((first, second) => (
		second.points - first.points
		|| second.legDifference - first.legDifference
		|| second.legsFor - first.legsFor
		|| first.name.localeCompare(second.name)
	));
}

