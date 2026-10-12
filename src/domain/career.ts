export const PLAYER_STYLES = ['scorer', 'finisher', 'all-rounder', 'clutch'] as const;
export const CAREER_BACKGROUNDS = [
	'working-amateur',
	'supported-prospect',
	'independent-amateur',
] as const;

export type PlayerStyle = (typeof PLAYER_STYLES)[number];
export type CareerBackground = (typeof CAREER_BACKGROUNDS)[number];

export const WEEKLY_STRATEGIES = ['balanced', 'overtime', 'all-in', 'recovery'] as const;
export type WeeklyStrategy = (typeof WEEKLY_STRATEGIES)[number];

export const CAREER_TIERS = [
	'Local amateur',
	'Regional amateur',
	'National amateur',
	'Q School contender',
	'Professional',
] as const;
export type CareerTier = (typeof CAREER_TIERS)[number];

export type PlayerAttributes = {
	scoring: number;
	finishing: number;
	consistency: number;
	composure: number;
	stamina: number;
};

export type DevelopmentProgress = PlayerAttributes;

export type CareerStats = {
	matchesPlayed: number;
	matchesWon: number;
	matchesLost: number;
	legsWon: number;
	legsLost: number;
	dartsThrown: number;
	pointsScored: number;
	checkoutAttempts: number;
	checkouts: number;
	oneEighties: number;
	nineDarters: number;
	highestCheckout: number;
};

export type CareerProfile = {
	saveGameId: string;
	playerId: string;
	name: string;
	age: number;
	dateOfBirth: string;
	location: string;
	style: PlayerStyle;
	background: CareerBackground;
	tier: CareerTier;
	careerPoints: number;
	hasTourCard: boolean;
	weeklyStrategy: WeeklyStrategy;
	lastManualSaveAt: string | null;
	inGameDate: string;
	season: number;
	weeksElapsed: number;
	seed: number;
	rngState: number;
	bankBalancePence: number;
	potential: number;
	form: number;
	fatigue: number;
	attributes: PlayerAttributes;
	developmentProgress: DevelopmentProgress;
	stats: CareerStats;
};

export function careerPathway(career: Pick<CareerProfile, 'tier' | 'hasTourCard' | 'careerPoints'>): {
	label: string;
	detail: string;
	progress: number;
} {
	if (career.hasTourCard) {
		return {
			label: `${career.careerPoints} professional ranking points`,
			detail: 'Only eligible professional ranking events build your tour standing. Finish inside the retention line to keep your card.',
			progress: Math.min(100, Math.round(career.careerPoints / 10)),
		};
	}
	const pathway: Record<Exclude<CareerTier, 'Professional'>, { detail: string; progress: number }> = {
		'Local amateur': {
			detail: 'League results build form, not professional ranking points. Win local events to reach regional competition.',
			progress: 15,
		},
		'Regional amateur': {
			detail: 'Win major regional events to reach the national circuit and earn a route into Q School.',
			progress: 35,
		},
		'National amateur': {
			detail: 'National results can earn a Q School invitation, or you can fund an eligible Q School entry.',
			progress: 55,
		},
		'Q School contender': {
			detail: 'Your next gate is Q School. A Tour Card must be won there before professional ranking points begin.',
			progress: 75,
		},
	};
	const current = career.tier === 'Professional' ? pathway['Q School contender'] : pathway[career.tier];
	return { label: 'Amateur pathway · no ranking points', ...current };
}

export type NewCareerInput = {
	name: string;
	dateOfBirth?: string;
	age?: 18 | 21 | 25 | 30;
	location: string;
	style: PlayerStyle;
	background: CareerBackground;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function ageOnDate(dateOfBirth: string, onDate: string): number {
	if (!ISO_DATE.test(dateOfBirth) || !ISO_DATE.test(onDate)) {
		throw new Error('Dates must use YYYY-MM-DD format.');
	}
	const birth = new Date(`${dateOfBirth}T00:00:00.000Z`);
	const current = new Date(`${onDate}T00:00:00.000Z`);
	if (
		Number.isNaN(birth.getTime())
		|| Number.isNaN(current.getTime())
		|| birth.toISOString().slice(0, 10) !== dateOfBirth
		|| current.toISOString().slice(0, 10) !== onDate
		|| birth > current
	) {
		throw new Error('Enter a valid date of birth.');
	}
	let age = current.getUTCFullYear() - birth.getUTCFullYear();
	const birthdayPassed = current.getUTCMonth() > birth.getUTCMonth()
		|| (current.getUTCMonth() === birth.getUTCMonth() && current.getUTCDate() >= birth.getUTCDate());
	if (!birthdayPassed) {
		age -= 1;
	}
	return age;
}

export function dateOfBirthForStartingAge(age: number): string {
	return `${2026 - age - 1}-07-01`;
}

export function createStartingAttributes(style: PlayerStyle): PlayerAttributes {
	const base: PlayerAttributes = {
		scoring: 46,
		finishing: 44,
		consistency: 47,
		composure: 45,
		stamina: 52,
	};

	const adjustments: Record<PlayerStyle, Partial<PlayerAttributes>> = {
		scorer: { scoring: 54, finishing: 40 },
		finisher: { scoring: 42, finishing: 53 },
		'all-rounder': { scoring: 48, finishing: 47, consistency: 49 },
		clutch: { scoring: 43, finishing: 49, composure: 55 },
	};

	return { ...base, ...adjustments[style] };
}

export function startingBalancePence(background: CareerBackground): number {
	const balances: Record<CareerBackground, number> = {
		'working-amateur': 45_000,
		'supported-prospect': 120_000,
		'independent-amateur': 75_000,
	};

	return balances[background];
}

export function emptyCareerStats(): CareerStats {
	return {
		matchesPlayed: 0,
		matchesWon: 0,
		matchesLost: 0,
		legsWon: 0,
		legsLost: 0,
		dartsThrown: 0,
		pointsScored: 0,
		checkoutAttempts: 0,
		checkouts: 0,
		oneEighties: 0,
		nineDarters: 0,
		highestCheckout: 0,
	};
}

