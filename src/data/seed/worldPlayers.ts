import type { PlayerStyle } from '../../domain/career';
import {
	averageRangeForTier,
	WORLD_PLAYER_COUNT,
	worldTierForRank,
	type WorldPlayerSeed,
	type WorldTier,
} from '../../domain/world';

function worldPlayer(
	id: string,
	name: string,
	country: string,
	age: number,
	style: PlayerStyle,
	tier: WorldTier,
	basePoints: number,
	momentum: number,
	ability: number,
): WorldPlayerSeed {
	const [minimumAverage, maximumAverage] = averageRangeForTier(tier);
	return {
		id,
		name,
		country,
		age,
		style,
		tier,
		typicalAverage: Math.max(minimumAverage, Math.min(maximumAverage, ability + 8)),
		basePoints,
		momentum,
		form: Math.max(-5, Math.min(5, Math.round(momentum / 8))),
		fatigue: 8,
		attributes: {
			scoring: ability + (style === 'scorer' ? 4 : 0),
			finishing: ability + (style === 'finisher' ? 4 : 0),
			consistency: ability + (style === 'all-rounder' ? 2 : -1),
			composure: ability + (style === 'clutch' ? 4 : 0),
			stamina: ability,
		},
	};
}

const FEATURED_WORLD_PLAYERS: WorldPlayerSeed[] = [
	worldPlayer('world-marek-voss', 'Marek Voss', 'NED', 31, 'scorer', 'world-elite', 11_840, 9, 96),
	worldPlayer('world-callum-price', 'Callum Price', 'WAL', 34, 'clutch', 'world-elite', 11_220, 7, 95),
	worldPlayer('world-jonas-keller', 'Jonas Keller', 'GER', 28, 'all-rounder', 'world-elite', 10_975, 12, 95),
	worldPlayer('world-soren-lind', 'Soren Lind', 'DEN', 37, 'finisher', 'world-elite', 10_310, -3, 94),
	worldPlayer('world-riku-aalto', 'Riku Aalto', 'FIN', 25, 'scorer', 'world-elite', 9_980, 18, 93),
	worldPlayer('world-lucas-moreau', 'Lucas Moreau', 'FRA', 39, 'all-rounder', 'world-elite', 9_740, -7, 93),
	worldPlayer('world-owen-rees', 'Owen Rees', 'WAL', 30, 'finisher', 'world-elite', 9_510, 5, 92),
	worldPlayer('world-tomas-novak', 'Tomas Novak', 'CZE', 42, 'clutch', 'world-elite', 9_260, -18, 92),
	worldPlayer('world-ryan-clarke', 'Ryan Clarke', 'ENG', 27, 'scorer', 'world-elite', 8_980, 22, 91),
	worldPlayer('world-euan-kerr', 'Euan Kerr', 'SCO', 33, 'all-rounder', 'world-elite', 8_730, 13, 91),
	worldPlayer('world-finn-mercer', 'Finn Mercer', 'ENG', 22, 'scorer', 'world-elite', 8_440, 28, 90),
	worldPlayer('world-haris-beg', 'Haris Beg', 'BIH', 35, 'finisher', 'world-elite', 8_250, 4, 90),
	worldPlayer('world-nico-ward', 'Nico Ward', 'ENG', 29, 'clutch', 'world-elite', 8_010, 17, 89),
	worldPlayer('world-aiden-frost', 'Aiden Frost', 'IRL', 41, 'all-rounder', 'world-elite', 7_890, -13, 89),
	worldPlayer('world-benji-cole', 'Benji Cole', 'ENG', 24, 'scorer', 'world-elite', 7_650, 24, 88),
	worldPlayer('world-fraser-watt', 'Fraser Watt', 'SCO', 38, 'finisher', 'world-elite', 7_510, -9, 88),
	worldPlayer('world-maya-sandhu', 'Maya Sandhu', 'ENG', 26, 'all-rounder', 'professional', 7_260, 29, 87),
	worldPlayer('world-leo-byrne', 'Leo Byrne', 'IRL', 21, 'scorer', 'professional', 7_020, 34, 86),
	worldPlayer('world-gareth-wynn', 'Gareth Wynn', 'WAL', 36, 'clutch', 'professional', 6_780, 8, 87),
	worldPlayer('world-ines-costa', 'Ines Costa', 'POR', 29, 'finisher', 'professional', 6_540, 21, 86),
	worldPlayer('world-theo-marsh', 'Theo Marsh', 'ENG', 32, 'all-rounder', 'professional', 6_390, 11, 86),
	worldPlayer('world-erin-moss', 'Erin Moss', 'SCO', 23, 'scorer', 'professional', 6_120, 31, 85),
	worldPlayer('world-jakub-ziel', 'Jakub Ziel', 'POL', 40, 'finisher', 'professional', 5_980, -12, 85),
	worldPlayer('world-noah-rhodes', 'Noah Rhodes', 'ENG', 27, 'clutch', 'professional', 5_760, 16, 84),
	worldPlayer('world-imani-cross', 'Imani Cross', 'ENG', 24, 'scorer', 'professional', 5_510, 38, 84),
	worldPlayer('world-kit-mercer', 'Kit Mercer', 'ENG', 31, 'finisher', 'professional', 5_280, 14, 83),
	worldPlayer('world-dev-shah', 'Dev Shah', 'ENG', 29, 'all-rounder', 'professional', 5_070, 19, 83),
	worldPlayer('world-nia-hart', 'Nia Hart', 'WAL', 22, 'clutch', 'professional', 4_830, 35, 82),
	worldPlayer('world-rowan-vale', 'Rowan Vale', 'ENG', 35, 'all-rounder', 'professional', 4_590, 7, 82),
	worldPlayer('world-amy-nash', 'Amy Nash', 'ENG', 19, 'scorer', 'professional', 4_320, 41, 81),
	worldPlayer('world-kofi-bell', 'Kofi Bell', 'SCO', 28, 'finisher', 'professional', 4_110, 23, 81),
	worldPlayer('world-selma-ray', 'Selma Ray', 'ENG', 33, 'clutch', 'professional', 3_940, 10, 80),
];

const FIRST_NAMES = [
	'Ari', 'Bea', 'Cian', 'Dara', 'Eli', 'Faye', 'Gio', 'Hope',
	'Ivo', 'Jade', 'Kai', 'Lena', 'Milo', 'Nora', 'Omar', 'Pia',
	'Quinn', 'Rafi', 'Sara', 'Tao', 'Una', 'Vera', 'Will', 'Xavi',
	'Yara', 'Zane', 'Alba', 'Bryn', 'Cleo', 'Dion', 'Esme', 'Flynn',
] as const;

const LAST_NAMES = [
	'Arden', 'Baird', 'Cato', 'Dale', 'Eames', 'Farrow', 'Gale', 'Hale',
	'Irwin', 'Jory', 'Keane', 'Lane', 'Morrow', 'North', 'Orme', 'Pike',
	'Quill', 'Rook', 'Stone', 'Tate', 'Upton', 'Venn', 'Wade', 'York',
	'Abbott', 'Briggs', 'Crewe', 'Drake', 'Ellis', 'Fenn', 'Grant', 'Hyde',
] as const;

const COUNTRIES = [
	'ENG', 'SCO', 'WAL', 'IRL', 'NED', 'GER', 'BEL', 'FRA', 'ESP', 'POR',
	'DEN', 'SWE', 'NOR', 'FIN', 'POL', 'CZE', 'AUT', 'CAN', 'AUS', 'NZL',
] as const;
const STYLES: readonly PlayerStyle[] = ['scorer', 'finisher', 'all-rounder', 'clutch'];

function generatedName(index: number): string {
	const first = FIRST_NAMES[index % FIRST_NAMES.length] ?? 'Alex';
	const lastIndex = Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length;
	const last = LAST_NAMES[lastIndex] ?? 'North';
	const nameCycle = Math.floor(index / (FIRST_NAMES.length * LAST_NAMES.length));
	if (nameCycle === 0) {
		return `${first} ${last}`;
	}
	return `${first} ${last}-${LAST_NAMES[(lastIndex + nameCycle * 7) % LAST_NAMES.length] ?? 'Vale'}`;
}

function generateWorldPlayers(): WorldPlayerSeed[] {
	return Array.from({ length: WORLD_PLAYER_COUNT - FEATURED_WORLD_PLAYERS.length }, (_, index) => {
		const rankIndex = FEATURED_WORLD_PLAYERS.length + index;
		const tier = worldTierForRank(rankIndex);
		const [minimumAverage, maximumAverage] = averageRangeForTier(tier);
		const average = minimumAverage + ((index * 7) % (maximumAverage - minimumAverage + 1));
		return worldPlayer(
			`world-generated-${index + 1}`,
			generatedName(index),
			COUNTRIES[(index * 11) % COUNTRIES.length] ?? 'ENG',
			18 + ((index * 13) % 35),
			STYLES[index % STYLES.length] ?? 'all-rounder',
			tier,
			3_900 - index * 2,
			((index * 37) % 61) - 30,
			Math.max(28, average - 8),
		);
	});
}

export const WORLD_PLAYERS: WorldPlayerSeed[] = [
	...FEATURED_WORLD_PLAYERS,
	...generateWorldPlayers(),
];

