import { nextRandom, randomInt } from '../random/seededRandom';
import { chooseTarget } from './checkout';
import { bullTarget, hitTarget, isWinningDouble, missHit, singleTarget } from './rules';
import type {
	DartHit,
	DartTarget,
	DartThrow,
	LegResult,
	MatchConfig,
	MatchPlayer,
	MatchResult,
	MatchState,
	PlayerMatchStats,
	Visit,
} from './types';

const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const MAX_MATCH_VISITS = 5_000;

type HitSample = {
	hit: DartHit;
	state: number;
};

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(maximum, Math.max(minimum, value));
}

function adjacentSegment(segment: number, random: number): number {
	const index = BOARD_ORDER.indexOf(segment);
	if (index < 0) {
		return 20;
	}
	const offset = random < 0.5 ? -1 : 1;
	return BOARD_ORDER[(index + offset + BOARD_ORDER.length) % BOARD_ORDER.length] ?? 20;
}

function effectiveAccuracy(player: MatchPlayer, target: DartTarget): number {
	const base = target.bed === 'double' || target.bed === 'bull'
		? player.attributes.finishing
		: player.attributes.scoring;
	const consistencyAdjustment = (player.attributes.consistency - 50) * 0.08;
	const formAdjustment = player.form * 0.18;
	const fatiguePenalty = player.fatigue * 0.2;
	return clamp(base + consistencyAdjustment + formAdjustment - fatiguePenalty, 0, 100);
}

function sampleHit(target: DartTarget, player: MatchPlayer, state: number): HitSample {
	const first = nextRandom(state);
	const accuracy = effectiveAccuracy(player, target);
	const random = first.value;

	if (target.bed === 'treble') {
		const trebleChance = clamp(0.05 + accuracy * 0.0024, 0.05, 0.29);
		if (random < trebleChance) {
			return { hit: hitTarget(target), state: first.state };
		}
		if (random < trebleChance + 0.47) {
			return { hit: hitTarget(singleTarget(target.segment ?? 20)), state: first.state };
		}
		if (random < trebleChance + 0.77) {
			const second = nextRandom(first.state);
			return {
				hit: hitTarget(singleTarget(adjacentSegment(target.segment ?? 20, second.value))),
				state: second.state,
			};
		}
		return { hit: missHit(), state: first.state };
	}

	if (target.bed === 'double') {
		const doubleChance = clamp(0.06 + accuracy * 0.0032, 0.06, 0.38);
		if (random < doubleChance) {
			return { hit: hitTarget(target), state: first.state };
		}
		if (random < doubleChance + 0.36) {
			return { hit: hitTarget(singleTarget(target.segment ?? 20)), state: first.state };
		}
		if (random < doubleChance + 0.56) {
			const second = nextRandom(first.state);
			return {
				hit: hitTarget(singleTarget(adjacentSegment(target.segment ?? 20, second.value))),
				state: second.state,
			};
		}
		return { hit: missHit(), state: first.state };
	}

	if (target.bed === 'bull' || target.bed === 'outer-bull') {
		const bullChance = clamp(0.04 + accuracy * 0.0025, 0.04, 0.29);
		if (random < bullChance) {
			return { hit: hitTarget(bullTarget()), state: first.state };
		}
		if (random < bullChance + 0.28) {
			return { hit: { bed: 'outer-bull', label: '25', score: 25 }, state: first.state };
		}
		const segmentSample = randomInt(first.state, 1, 20);
		return {
			hit: random < bullChance + 0.78
				? hitTarget(singleTarget(segmentSample.value))
				: missHit(),
			state: segmentSample.state,
		};
	}

	const singleChance = clamp(0.58 + accuracy * 0.0028, 0.58, 0.86);
	if (random < singleChance) {
		return { hit: hitTarget(target), state: first.state };
	}
	if (random < singleChance + 0.11) {
		const second = nextRandom(first.state);
		return {
			hit: hitTarget(singleTarget(adjacentSegment(target.segment ?? 20, second.value))),
			state: second.state,
		};
	}
	return { hit: missHit(), state: first.state };
}

function simulateVisit(player: MatchPlayer, startScore: number, rngState: number): {
	visit: Visit;
	rngState: number;
} {
	let remaining = startScore;
	let state = rngState;
	let bust = false;
	let checkout = false;
	const darts: DartThrow[] = [];

	for (let dartIndex = 0; dartIndex < 3; dartIndex += 1) {
		const target = chooseTarget(remaining, 3 - dartIndex);
		const sample = sampleHit(target, player, state);
		state = sample.state;
		const remainingBefore = remaining;
		const candidate = remainingBefore - sample.hit.score;
		const winningDouble = candidate === 0 && isWinningDouble(sample.hit);
		const invalidZero = candidate === 0 && !winningDouble;
		const isBust = candidate < 0 || candidate === 1 || invalidZero;
		const checkoutAttempt = target.score === remainingBefore
			&& (target.bed === 'double' || target.bed === 'bull');

		if (isBust) {
			bust = true;
			remaining = startScore;
		} else {
			remaining = candidate;
			checkout = winningDouble;
		}

		darts.push({
			target,
			hit: sample.hit,
			remainingBefore,
			remainingAfter: remaining,
			checkoutAttempt,
			winningDouble,
		});

		if (bust || checkout) {
			break;
		}
	}

	return {
		visit: {
			playerId: player.id,
			startScore,
			endScore: remaining,
			score: bust ? 0 : startScore - remaining,
			darts,
			bust,
			checkout,
		},
		rngState: state,
	};
}

export function createMatch(config: MatchConfig): MatchState {
	if (config.players[0].id === config.players[1].id) {
		throw new Error('Match players must have unique ids.');
	}

	return {
		config,
		rngState: config.seed,
		legsToWin: Math.floor(config.bestOf / 2) + 1,
		legsWon: { [config.players[0].id]: 0, [config.players[1].id]: 0 },
		completedLegs: [],
		currentLeg: {
			legNumber: 1,
			startingPlayerIndex: 0,
			currentPlayerIndex: 0,
			scores: { [config.players[0].id]: 501, [config.players[1].id]: 501 },
			visits: [],
		},
		status: 'in-progress',
	};
}

function dartsByPlayer(visits: readonly Visit[], players: MatchConfig['players']): Record<string, number> {
	return {
		[players[0].id]: visits
			.filter((visit) => visit.playerId === players[0].id)
			.reduce((total, visit) => total + visit.darts.length, 0),
		[players[1].id]: visits
			.filter((visit) => visit.playerId === players[1].id)
			.reduce((total, visit) => total + visit.darts.length, 0),
	};
}

export function simulateNextVisit(state: MatchState): MatchState {
	if (state.status === 'complete') {
		return state;
	}

	const playerIndex = state.currentLeg.currentPlayerIndex;
	const player = state.config.players[playerIndex];
	const startScore = state.currentLeg.scores[player.id] ?? 501;
	const simulation = simulateVisit(player, startScore, state.rngState);
	const visits = [...state.currentLeg.visits, simulation.visit];
	const scores = { ...state.currentLeg.scores, [player.id]: simulation.visit.endScore };

	if (!simulation.visit.checkout) {
		return {
			...state,
			rngState: simulation.rngState,
			currentLeg: {
				...state.currentLeg,
				currentPlayerIndex: playerIndex === 0 ? 1 : 0,
				scores,
				visits,
			},
		};
	}

	const leg: LegResult = {
		legNumber: state.currentLeg.legNumber,
		startingPlayerId: state.config.players[state.currentLeg.startingPlayerIndex].id,
		winnerId: player.id,
		visits,
		dartsByPlayer: dartsByPlayer(visits, state.config.players),
	};
	const legsWon = { ...state.legsWon, [player.id]: (state.legsWon[player.id] ?? 0) + 1 };
	const completedLegs = [...state.completedLegs, leg];
	const matchComplete = (legsWon[player.id] ?? 0) >= state.legsToWin;

	if (matchComplete) {
		return {
			...state,
			rngState: simulation.rngState,
			legsWon,
			completedLegs,
			currentLeg: { ...state.currentLeg, scores, visits },
			status: 'complete',
			winnerId: player.id,
		};
	}

	const nextLegNumber = state.currentLeg.legNumber + 1;
	const nextStarter = state.currentLeg.startingPlayerIndex === 0 ? 1 : 0;
	return {
		...state,
		rngState: simulation.rngState,
		legsWon,
		completedLegs,
		currentLeg: {
			legNumber: nextLegNumber,
			startingPlayerIndex: nextStarter,
			currentPlayerIndex: nextStarter,
			scores: { [state.config.players[0].id]: 501, [state.config.players[1].id]: 501 },
			visits: [],
		},
	};
}

export function simulateNextLeg(state: MatchState): MatchState {
	const completedCount = state.completedLegs.length;
	let nextState = state;
	let guard = 0;
	while (nextState.status === 'in-progress' && nextState.completedLegs.length === completedCount) {
		nextState = simulateNextVisit(nextState);
		guard += 1;
		if (guard > MAX_MATCH_VISITS) {
			throw new Error('Leg simulation exceeded the visit safety limit.');
		}
	}
	return nextState;
}

export function finishMatch(state: MatchState): MatchState {
	let nextState = state;
	let guard = 0;
	while (nextState.status === 'in-progress') {
		nextState = simulateNextVisit(nextState);
		guard += 1;
		if (guard > MAX_MATCH_VISITS) {
			throw new Error('Match simulation exceeded the visit safety limit.');
		}
	}
	return nextState;
}

export function aggregatePlayerStats(
	playerId: string,
	legs: readonly LegResult[],
): PlayerMatchStats {
	const visits = legs.flatMap((leg) => leg.visits).filter((visit) => visit.playerId === playerId);
	const dartsThrown = visits.reduce((total, visit) => total + visit.darts.length, 0);
	const pointsScored = visits.reduce((total, visit) => total + visit.score, 0);
	const checkoutAttempts = visits.reduce(
		(total, visit) => total + visit.darts.filter((dart) => dart.checkoutAttempt).length,
		0,
	);
	const checkouts = visits.filter((visit) => visit.checkout).length;

	return {
		playerId,
		legsWon: legs.filter((leg) => leg.winnerId === playerId).length,
		dartsThrown,
		pointsScored,
		threeDartAverage: dartsThrown === 0 ? 0 : (pointsScored / dartsThrown) * 3,
		checkoutAttempts,
		checkouts,
		checkoutPercent: checkoutAttempts === 0 ? 0 : (checkouts / checkoutAttempts) * 100,
		oneEighties: visits.filter((visit) => visit.score === 180).length,
		nineDarters: legs.filter((leg) => (
			leg.winnerId === playerId && leg.dartsByPlayer[playerId] === 9
		)).length,
		highestCheckout: visits.reduce(
			(highest, visit) => visit.checkout ? Math.max(highest, visit.score) : highest,
			0,
		),
	};
}

export function matchResult(state: MatchState): MatchResult {
	if (state.status !== 'complete' || !state.winnerId) {
		throw new Error('Cannot create a result before the match is complete.');
	}

	return {
		id: state.config.id,
		seed: state.config.seed,
		bestOf: state.config.bestOf,
		inGameDate: state.config.inGameDate,
		players: state.config.players,
		winnerId: state.winnerId,
		legsWon: state.legsWon,
		legs: state.completedLegs,
		stats: {
			[state.config.players[0].id]: aggregatePlayerStats(state.config.players[0].id, state.completedLegs),
			[state.config.players[1].id]: aggregatePlayerStats(state.config.players[1].id, state.completedLegs),
		},
		finalRngState: state.rngState,
	};
}

export function simulateMatch(config: MatchConfig): MatchResult {
	return matchResult(finishMatch(createMatch(config)));
}

export function describeVisit(visit: Visit, playerName: string): string {
	const hits = visit.darts.map((dart) => dart.hit.label).join(' · ');
	if (visit.checkout) {
		return `${playerName} checks out ${visit.score} (${hits})`;
	}
	if (visit.bust) {
		return `${playerName} busts (${hits})`;
	}
	return `${playerName} scores ${visit.score} (${hits})`;
}

