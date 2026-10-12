import type { CareerTier } from './career';
import type { MatchPlayer, MatchResult } from '../engine/darts/types';

export type TournamentDefinition = {
	id: string;
	name: string;
	week: number;
	level: string;
	venue: string;
	format: string;
	entryFeePence: number;
	firstPrizePence: number;
	entryPolicy: 'open' | 'qualified';
	recommendedAverage: number;
	minimumTier: CareerTier;
	registrationOpensWeeksBefore: number;
	registrationClosesWeeksBefore: number;
	decision: string;
};

export type TournamentEntry = {
	id: string;
	tournamentId: string;
	edition: number;
	entryFeePence: number;
	enteredDate: string;
	status: 'entered' | 'in-progress' | 'eliminated' | 'champion';
	matchesWon: number;
	prizeMoneyPence: number;
};

export type TournamentMatch = {
	id: string;
	entryId: string;
	tournamentId: string;
	edition: number;
	round: number;
	totalRounds: number;
	roundLabel: string;
	date: string;
	bestOf: 3 | 5 | 7 | 11;
	status: 'scheduled' | 'complete';
	opponent: MatchPlayer;
	winnerId: string | null;
	result: MatchResult | null;
};

export type TournamentRegistrationStatus = 'upcoming' | 'open' | 'closed';

const TIER_LEVEL: Record<CareerTier, number> = {
	'Local amateur': 0,
	'Regional amateur': 1,
	'National amateur': 2,
	'Q School contender': 3,
	Professional: 4,
};

export function tournamentEligible(playerTier: CareerTier, minimumTier: CareerTier): boolean {
	return TIER_LEVEL[playerTier] >= TIER_LEVEL[minimumTier];
}

export function tournamentEntryEligible(
	playerTier: CareerTier,
	tournament: TournamentDefinition,
): boolean {
	return tournament.entryPolicy === 'open'
		|| tournamentEligible(playerTier, tournament.minimumTier);
}

export function weeksUntilTournament(currentWeek: number, tournamentWeek: number): number {
	const weekInYear = currentWeek % 52;
	return tournamentWeek >= weekInYear ? tournamentWeek - weekInYear : 52 - weekInYear + tournamentWeek;
}

export function tournamentEdition(currentWeek: number, tournamentWeek: number): number {
	const currentEdition = Math.floor(currentWeek / 52) + 1;
	return tournamentWeek < currentWeek % 52 ? currentEdition + 1 : currentEdition;
}

export function tournamentRegistrationStatus(
	currentWeek: number,
	tournament: TournamentDefinition,
): TournamentRegistrationStatus {
	const weeksAway = weeksUntilTournament(currentWeek, tournament.week);
	if (weeksAway > tournament.registrationOpensWeeksBefore) {
		return 'upcoming';
	}
	if (weeksAway < tournament.registrationClosesWeeksBefore) {
		return 'closed';
	}
	return 'open';
}

export function tournamentForMessage(
	tournaments: readonly TournamentDefinition[],
	actionPath: string | undefined,
	subject: string,
): TournamentDefinition | undefined {
	return tournaments.find((tournament) => (
		actionPath === `/tournament/${tournament.id}`
		|| subject === `${tournament.name} entries open`
	));
}

