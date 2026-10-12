import type { PlayerAttributes } from '../../domain/career';

export type DartBed = 'miss' | 'single' | 'double' | 'treble' | 'outer-bull' | 'bull';

export type DartTarget = {
	bed: Exclude<DartBed, 'miss'>;
	segment?: number;
	label: string;
	score: number;
};

export type DartHit = {
	bed: DartBed;
	segment?: number;
	label: string;
	score: number;
};

export type DartThrow = {
	target: DartTarget;
	hit: DartHit;
	remainingBefore: number;
	remainingAfter: number;
	checkoutAttempt: boolean;
	winningDouble: boolean;
};

export type Visit = {
	playerId: string;
	startScore: number;
	endScore: number;
	score: number;
	darts: DartThrow[];
	bust: boolean;
	checkout: boolean;
};

export type MatchPlayer = {
	id: string;
	name: string;
	attributes: PlayerAttributes;
	form: number;
	fatigue: number;
};

export type LegResult = {
	legNumber: number;
	startingPlayerId: string;
	winnerId: string;
	visits: Visit[];
	dartsByPlayer: Record<string, number>;
};

export type PlayerMatchStats = {
	playerId: string;
	legsWon: number;
	dartsThrown: number;
	pointsScored: number;
	threeDartAverage: number;
	checkoutAttempts: number;
	checkouts: number;
	checkoutPercent: number;
	oneEighties: number;
	nineDarters: number;
	highestCheckout: number;
};

export type MatchConfig = {
	id: string;
	seed: number;
	bestOf: 3 | 5 | 7 | 11;
	inGameDate: string;
	players: readonly [MatchPlayer, MatchPlayer];
};

export type MatchState = {
	config: MatchConfig;
	rngState: number;
	legsToWin: number;
	legsWon: Record<string, number>;
	completedLegs: LegResult[];
	currentLeg: {
		legNumber: number;
		startingPlayerIndex: 0 | 1;
		currentPlayerIndex: 0 | 1;
		scores: Record<string, number>;
		visits: Visit[];
	};
	status: 'in-progress' | 'complete';
	winnerId?: string;
};

export type MatchResult = {
	id: string;
	seed: number;
	bestOf: MatchConfig['bestOf'];
	inGameDate: string;
	players: MatchConfig['players'];
	winnerId: string;
	legsWon: Record<string, number>;
	legs: LegResult[];
	stats: Record<string, PlayerMatchStats>;
	finalRngState: number;
};

