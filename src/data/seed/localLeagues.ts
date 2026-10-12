import type {
	LeaguePlayer,
	LeagueStanding,
	LocalLeagueMovement,
	SiblingLocalLeague,
} from '../../domain/league';

function player(
	id: string,
	name: string,
	style: string,
	scoring: number,
	finishing: number,
	consistency: number,
): LeaguePlayer {
	return {
		id,
		name,
		isHuman: false,
		style,
		attributes: {
			scoring,
			finishing,
			consistency,
			composure: Math.round((finishing + consistency) / 2),
			stamina: 48,
		},
		form: 0,
		fatigue: 0,
	};
}

export const SIBLING_LOCAL_LEAGUE_SEEDS: Omit<SiblingLocalLeague, 'standings'>[] = [
	{
		id: 'harbour-league',
		name: 'Harbour & Dock League',
		area: 'East Northbridge',
		players: [
			player('ai-jules-arden', 'Jules Arden', 'all-rounder', 48, 50, 51),
			player('ai-sam-riggs', 'Sam Riggs', 'scorer', 51, 44, 47),
			player('ai-lena-finch', 'Lena Finch', 'finisher', 45, 51, 49),
			player('ai-ollie-dunn', 'Ollie Dunn', 'clutch', 46, 48, 50),
			player('ai-faye-winter', 'Faye Winter', 'all-rounder', 47, 46, 48),
			player('ai-milo-banks', 'Milo Banks', 'scorer', 49, 43, 45),
		],
	},
	{
		id: 'crown-league',
		name: 'Crown District League',
		area: 'West Northbridge',
		players: [
			player('ai-ada-quinn', 'Ada Quinn', 'finisher', 47, 52, 50),
			player('ai-lewis-gray', 'Lewis Gray', 'all-rounder', 49, 48, 49),
			player('ai-tariq-booth', 'Tariq Booth', 'scorer', 52, 43, 46),
			player('ai-marnie-holt', 'Marnie Holt', 'clutch', 45, 50, 51),
			player('ai-ben-ames', 'Ben Ames', 'all-rounder', 46, 47, 48),
			player('ai-suki-lane', 'Suki Lane', 'finisher', 44, 50, 47),
		],
	},
];

function nameSeed(value: string): number {
	return [...value].reduce((total, character) => total + character.charCodeAt(0), 0);
}

function siblingStandings(players: LeaguePlayer[], season: number): LeagueStanding[] {
	return players.map((candidate) => {
		const rating = (
			candidate.attributes.scoring
			+ candidate.attributes.finishing
			+ candidate.attributes.consistency
		) / 3;
		const swing = ((nameSeed(candidate.id) + season * 3) % 5) - 2;
		const won = Math.max(0, Math.min(5, Math.round((rating - 39) / 3) + swing));
		const lost = 5 - won;
		const legDifference = (won - lost) * 2 + swing;
		return {
			playerId: candidate.id,
			name: candidate.name,
			played: 5,
			won,
			lost,
			legsFor: 8 + won * 2,
			legsAgainst: 8 + lost * 2,
			legDifference,
			points: won * 2,
		};
	}).sort((left, right) => (
		right.points - left.points
		|| right.legDifference - left.legDifference
		|| left.name.localeCompare(right.name)
	));
}

export function buildSiblingLocalLeagues(
	season: number,
	movements: readonly LocalLeagueMovement[] = [],
): SiblingLocalLeague[] {
	const leagues = SIBLING_LOCAL_LEAGUE_SEEDS.map((league) => ({
		...league,
		players: [...league.players],
	}));
	for (const movement of [...movements].sort((left, right) => left.season - right.season)) {
		const from = leagues.find((league) => league.id === movement.fromLeagueId);
		if (from) {
			from.players = from.players.filter((candidate) => candidate.id !== movement.player.id);
		}
		const to = leagues.find((league) => league.id === movement.toLeagueId);
		if (to && !to.players.some((candidate) => candidate.id === movement.player.id)) {
			to.players.push(movement.player);
		}
	}
	return leagues.map((league) => ({
		...league,
		standings: siblingStandings(league.players, season),
	}));
}

export function selectSiblingPromotion(
	targetSeason: number,
	currentPlayerIds: readonly string[],
	movements: readonly LocalLeagueMovement[],
): { league: SiblingLocalLeague; player: LeaguePlayer } | null {
	const leagues = buildSiblingLocalLeagues(Math.max(1, targetSeason - 1), movements);
	const firstIndex = Math.abs(targetSeason - 2) % leagues.length;
	for (let offset = 0; offset < leagues.length; offset += 1) {
		const league = leagues[(firstIndex + offset) % leagues.length];
		const standing = league?.standings.find((entry) => !currentPlayerIds.includes(entry.playerId));
		const promoted = league?.players.find((candidate) => candidate.id === standing?.playerId);
		if (league && promoted) {
			return { league, player: promoted };
		}
	}
	return null;
}

