import type { PlayerAttributes, PlayerStyle } from './career';

export const WORLD_TIERS = [
	'world-elite',
	'professional',
	'qualifying',
	'national-amateur',
	'regional-amateur',
	'local',
] as const;
export type WorldTier = (typeof WORLD_TIERS)[number];

export type CompetitionLevel = {
	level: number;
	tier: WorldTier;
	label: string;
	averageRange: readonly [number, number];
	playerCount: number;
};

export const COMPETITION_LEVELS: readonly CompetitionLevel[] = [
	{ level: 6, tier: 'world-elite', label: 'World elite', averageRange: [95, 110], playerCount: 16 },
	{ level: 5, tier: 'professional', label: 'Professional tour', averageRange: [85, 100], playerCount: 112 },
	{ level: 4, tier: 'qualifying', label: 'Qualifying circuit', averageRange: [75, 95], playerCount: 300 },
	{ level: 3, tier: 'national-amateur', label: 'National amateur', averageRange: [65, 85], playerCount: 500 },
	{ level: 2, tier: 'regional-amateur', label: 'Regional amateur', averageRange: [50, 70], playerCount: 400 },
	{ level: 1, tier: 'local', label: 'Local pub leagues', averageRange: [35, 55], playerCount: 600 },
] as const;

export const CIRCUIT_POPULATION = [
	{ label: 'Professional tour', playerCount: 128 },
	{ label: 'Secondary / qualifying tours', playerCount: 300 },
	{ label: 'National amateur circuits', playerCount: 500 },
	{ label: 'Regional / local players', playerCount: 1_000 },
] as const;

export const WORLD_PLAYER_COUNT = CIRCUIT_POPULATION.reduce(
	(total, circuit) => total + circuit.playerCount,
	0,
);

export type WorldPlayerSeed = {
	id: string;
	name: string;
	country: string;
	age: number;
	style: PlayerStyle;
	tier: WorldTier;
	typicalAverage: number;
	basePoints: number;
	momentum: number;
	form: number;
	fatigue: number;
	attributes: PlayerAttributes;
};

export type RankedWorldPlayer = WorldPlayerSeed & {
	rank: number;
	points: number;
	previousTier: WorldTier;
	movement: 'promoted' | 'relegated' | 'steady';
};

const TIER_ORDER: Record<WorldTier, number> = {
	'world-elite': 0,
	professional: 1,
	qualifying: 2,
	'national-amateur': 3,
	'regional-amateur': 4,
	local: 5,
};

export function tierLabel(tier: WorldTier): string {
	return COMPETITION_LEVELS.find((level) => level.tier === tier)?.label ?? tier;
}

export function worldTierForRank(rankIndex: number): WorldTier {
	let upperBound = 0;
	for (const level of COMPETITION_LEVELS) {
		upperBound += level.playerCount;
		if (rankIndex < upperBound) {
			return level.tier;
		}
	}
	return 'local';
}

export function averageRangeForTier(tier: WorldTier): readonly [number, number] {
	return COMPETITION_LEVELS.find((level) => level.tier === tier)?.averageRange ?? [35, 55];
}

export function buildWorldRanking(seeds: readonly WorldPlayerSeed[], weeksElapsed: number): RankedWorldPlayer[] {
	const cycle = Math.floor(weeksElapsed / 13);
	const ranked = seeds
		.map((player) => ({
			...player,
			points: Math.max(0, player.basePoints + weeksElapsed * player.momentum + cycle * player.momentum * 5),
		}))
		.sort((left, right) => right.points - left.points || left.name.localeCompare(right.name));

	return ranked.map((player, index) => {
		const tier = worldTierForRank(index);
		const difference = TIER_ORDER[tier] - TIER_ORDER[player.tier];
		return {
			...player,
			rank: index + 1,
			tier,
			previousTier: player.tier,
			movement: difference < 0 ? 'promoted' : difference > 0 ? 'relegated' : 'steady',
		};
	});
}

