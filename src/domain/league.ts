import type { MatchPlayer } from '../engine/darts/types';

export type LeaguePlayer = MatchPlayer & {
	isHuman: boolean;
	style: string;
};

export type LeagueFixture = {
	id: string;
	season: number;
	round: number;
	sequence: number;
	weekStart: string;
	date: string;
	homePlayerId: string;
	awayPlayerId: string;
	bestOf: 3 | 5 | 7 | 11;
	status: 'scheduled' | 'complete';
	winnerId: string | null;
	homeLegs: number | null;
	awayLegs: number | null;
	matchId: string | null;
};

export type LeagueStanding = {
	playerId: string;
	name: string;
	played: number;
	won: number;
	lost: number;
	legsFor: number;
	legsAgainst: number;
	legDifference: number;
	points: number;
};

export type LocalLeague = {
	id: 'lantern-league';
	name: 'The Lantern League';
	season: number;
	players: LeaguePlayer[];
	fixtures: LeagueFixture[];
	standings: LeagueStanding[];
	siblingLeagues?: SiblingLocalLeague[];
	movements?: LocalLeagueMovement[];
};

export type SiblingLocalLeague = {
	id: string;
	name: string;
	area: string;
	players: LeaguePlayer[];
	standings: LeagueStanding[];
};

export type LocalLeagueMovement = {
	id: string;
	season: number;
	player: LeaguePlayer;
	fromLeagueId: string;
	fromLeagueName: string;
	toLeagueId: string;
	toLeagueName: string;
	direction: 'promoted' | 'relegated';
};

