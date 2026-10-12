import type { SQLiteDatabase } from 'expo-sqlite';

import type { CareerProfile } from '../../domain/career';
import type {
	LeagueFixture,
	LeaguePlayer,
	LocalLeague,
	LocalLeagueMovement,
} from '../../domain/league';
import { createRoundRobinFixtures, calculateStandings } from '../../engine/league/localLeague';
import { simulateMatch } from '../../engine/darts/simulation';
import type { MatchResult } from '../../engine/darts/types';
import { normalizeSeed } from '../../engine/random/seededRandom';
import { LOCAL_LEAGUE_AI_PLAYERS } from '../seed/demoWorld';
import { buildSiblingLocalLeagues, selectSiblingPromotion } from '../seed/localLeagues';

const SAVE_GAME_ID = 'primary-career';

type PlayerRow = {
	id: string;
	name: string;
	is_human: number;
	style: string;
	scoring: number;
	finishing: number;
	consistency: number;
	composure: number;
	stamina: number;
	form: number;
	fatigue: number;
};

type FixtureRow = {
	id: string;
	round: number;
	season: number;
	season_round: number;
	week_start: string;
	in_game_date: string;
	home_player_id: string;
	away_player_id: string;
	best_of: 3 | 5 | 7 | 11;
	status: 'scheduled' | 'complete';
	winner_id: string | null;
	home_legs: number | null;
	away_legs: number | null;
	match_id: string | null;
};

type MovementRow = {
	id: string;
	season: number;
	player_json: string;
	from_league_id: string;
	from_league_name: string;
	to_league_id: string;
	to_league_name: string;
	direction: 'promoted' | 'relegated';
};

export type PreparedLeagueResult = {
	fixture: LeagueFixture;
	result: MatchResult;
};

function mapPlayer(row: PlayerRow): LeaguePlayer {
	return {
		id: row.id,
		name: row.name,
		isHuman: row.is_human === 1,
		style: row.style,
		attributes: {
			scoring: row.scoring,
			finishing: row.finishing,
			consistency: row.consistency,
			composure: row.composure,
			stamina: row.stamina,
		},
		form: row.form,
		fatigue: row.fatigue,
	};
}

function mapFixture(row: FixtureRow): LeagueFixture {
	return {
		id: row.id,
		season: row.season,
		round: row.season_round,
		sequence: row.round,
		weekStart: row.week_start,
		date: row.in_game_date,
		homePlayerId: row.home_player_id,
		awayPlayerId: row.away_player_id,
		bestOf: row.best_of,
		status: row.status,
		winnerId: row.winner_id,
		homeLegs: row.home_legs,
		awayLegs: row.away_legs,
		matchId: row.match_id,
	};
}

function mapMovement(row: MovementRow): LocalLeagueMovement {
	return {
		id: row.id,
		season: row.season,
		player: JSON.parse(row.player_json) as LeaguePlayer,
		fromLeagueId: row.from_league_id,
		fromLeagueName: row.from_league_name,
		toLeagueId: row.to_league_id,
		toLeagueName: row.to_league_name,
		direction: row.direction,
	};
}

export async function loadLocalLeagueMovements(db: SQLiteDatabase): Promise<LocalLeagueMovement[]> {
	const rows = await db.getAllAsync<MovementRow>(`
		SELECT id, season, player_json, from_league_id, from_league_name,
			to_league_id, to_league_name, direction
		FROM local_league_movements
		WHERE save_game_id = ?
		ORDER BY season DESC, direction DESC, id
	`, SAVE_GAME_ID);
	return rows.map(mapMovement);
}

export async function ensureLocalLeague(db: SQLiteDatabase, career: CareerProfile): Promise<void> {
	const human: LeaguePlayer = {
		id: career.playerId,
		name: career.name,
		isHuman: true,
		style: career.style,
		attributes: career.attributes,
		form: career.form,
		fatigue: career.fatigue,
	};
	const seasonState = await db.getFirstAsync<{
		fixture_count: number;
		current_count: number;
		future_count: number;
		max_sequence: number | null;
	}>(`
		SELECT
			COUNT(*) AS fixture_count,
			SUM(CASE WHEN season = ? AND week_start = ? THEN 1 ELSE 0 END) AS current_count,
			SUM(CASE WHEN season = ? AND week_start > ? THEN 1 ELSE 0 END) AS future_count,
			MAX(round) AS max_sequence
		FROM league_fixtures
		WHERE save_game_id = ? AND season = ?
	`, career.season, career.inGameDate, career.season, career.inGameDate, SAVE_GAME_ID, career.season);
	const shouldRollSeason = (seasonState?.fixture_count ?? 0) > 0
		&& (seasonState?.current_count ?? 0) === 0
		&& (seasonState?.future_count ?? 0) === 0;
	const targetSeason = shouldRollSeason ? career.season + 1 : career.season;
	const existingTarget = targetSeason === career.season
		? seasonState?.fixture_count ?? 0
		: await db.getFirstAsync<{ fixture_count: number }>(`
			SELECT COUNT(*) AS fixture_count
			FROM league_fixtures
			WHERE save_game_id = ? AND season = ?
		`, SAVE_GAME_ID, targetSeason).then((row) => row?.fixture_count ?? 0);
	const maxSequenceRow = await db.getFirstAsync<{ max_sequence: number | null }>(`
		SELECT MAX(round) AS max_sequence
		FROM league_fixtures
		WHERE save_game_id = ?
	`, SAVE_GAME_ID);
	const [existingPlayerRows, currentFixtureRows, existingMovements] = await Promise.all([
		db.getAllAsync<PlayerRow>(`
			SELECT id, name, is_human, style, scoring, finishing, consistency,
				composure, stamina, form, fatigue
			FROM league_players WHERE save_game_id = ?
		`, SAVE_GAME_ID),
		db.getAllAsync<FixtureRow>(`
			SELECT id, round, season, season_round, week_start, in_game_date,
				home_player_id, away_player_id, best_of, status, winner_id,
				home_legs, away_legs, match_id
			FROM league_fixtures WHERE save_game_id = ? AND season = ?
		`, SAVE_GAME_ID, career.season),
		loadLocalLeagueMovements(db),
	]);
	let players = existingPlayerRows.length > 0
		? existingPlayerRows.map(mapPlayer).map((candidate) => candidate.isHuman ? human : candidate)
		: [human, ...LOCAL_LEAGUE_AI_PLAYERS];
	let promotedMovement: LocalLeagueMovement | null = null;
	let relegatedMovement: LocalLeagueMovement | null = null;
	if (shouldRollSeason && existingTarget === 0) {
		const standings = calculateStandings(players, currentFixtureRows.map(mapFixture));
		const relegatedStanding = [...standings].reverse()
			.find((standing) => standing.playerId !== career.playerId);
		const relegated = players.find((candidate) => candidate.id === relegatedStanding?.playerId);
		const promotion = selectSiblingPromotion(
			targetSeason,
			players.map((candidate) => candidate.id),
			existingMovements,
		);
		if (relegated && promotion) {
			players = [
				...players.filter((candidate) => candidate.id !== relegated.id),
				promotion.player,
			];
			promotedMovement = {
				id: `movement-s${targetSeason}-${promotion.player.id}-promoted`,
				season: targetSeason,
				player: promotion.player,
				fromLeagueId: promotion.league.id,
				fromLeagueName: promotion.league.name,
				toLeagueId: 'lantern-league',
				toLeagueName: 'The Lantern League',
				direction: 'promoted',
			};
			relegatedMovement = {
				id: `movement-s${targetSeason}-${relegated.id}-relegated`,
				season: targetSeason,
				player: relegated,
				fromLeagueId: 'lantern-league',
				fromLeagueName: 'The Lantern League',
				toLeagueId: promotion.league.id,
				toLeagueName: promotion.league.name,
				direction: 'relegated',
			};
		}
	}
	const fixtures = existingTarget === 0
		? createRoundRobinFixtures(
			players.map((player) => player.id),
			career.inGameDate,
			targetSeason,
			maxSequenceRow?.max_sequence ?? 0,
		)
		: [];

	await db.withTransactionAsync(async () => {
		if (shouldRollSeason) {
			await db.runAsync(`
				UPDATE save_games
				SET season = ?, updated_at = ?
				WHERE id = ? AND season = ?
			`, targetSeason, new Date().toISOString(), SAVE_GAME_ID, career.season);
		}
		if (relegatedMovement) {
			await db.runAsync(`
				DELETE FROM league_players WHERE save_game_id = ? AND id = ?
			`, SAVE_GAME_ID, relegatedMovement.player.id);
		}
		for (const player of players) {
			await db.runAsync(`
				INSERT INTO league_players (
					save_game_id, id, name, is_human, style, scoring, finishing,
					consistency, composure, stamina, form, fatigue
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(save_game_id, id) DO UPDATE SET
					name = excluded.name,
					style = excluded.style,
					scoring = CASE WHEN excluded.is_human = 1 THEN excluded.scoring ELSE league_players.scoring END,
					finishing = CASE WHEN excluded.is_human = 1 THEN excluded.finishing ELSE league_players.finishing END,
					consistency = CASE WHEN excluded.is_human = 1 THEN excluded.consistency ELSE league_players.consistency END,
					composure = CASE WHEN excluded.is_human = 1 THEN excluded.composure ELSE league_players.composure END,
					stamina = CASE WHEN excluded.is_human = 1 THEN excluded.stamina ELSE league_players.stamina END,
					form = CASE WHEN excluded.is_human = 1 THEN excluded.form ELSE league_players.form END,
					fatigue = CASE WHEN excluded.is_human = 1 THEN excluded.fatigue ELSE league_players.fatigue END
			`,
			SAVE_GAME_ID,
			player.id,
			player.name,
			player.isHuman ? 1 : 0,
			player.style,
			player.attributes.scoring,
			player.attributes.finishing,
			player.attributes.consistency,
			player.attributes.composure,
			player.attributes.stamina,
			player.form,
			player.fatigue,
			);
		}
		for (const movement of [promotedMovement, relegatedMovement]) {
			if (!movement) {
				continue;
			}
			await db.runAsync(`
				INSERT OR IGNORE INTO local_league_movements (
					id, save_game_id, season, player_id, player_json, from_league_id,
					from_league_name, to_league_id, to_league_name, direction, created_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`, movement.id, SAVE_GAME_ID, movement.season, movement.player.id,
			JSON.stringify(movement.player), movement.fromLeagueId, movement.fromLeagueName,
			movement.toLeagueId, movement.toLeagueName, movement.direction, new Date().toISOString());
		}

		for (const fixture of fixtures) {
			await db.runAsync(`
				INSERT OR IGNORE INTO league_fixtures (
					id, save_game_id, round, season, season_round, week_start, in_game_date,
					home_player_id, away_player_id, best_of, status
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
			`,
			fixture.id,
			SAVE_GAME_ID,
			fixture.sequence,
			fixture.season,
			fixture.round,
			fixture.weekStart,
			fixture.date,
			fixture.homePlayerId,
			fixture.awayPlayerId,
			fixture.bestOf,
			);
		}
	});
}

export async function loadLocalLeague(db: SQLiteDatabase): Promise<LocalLeague> {
	const seasonRow = await db.getFirstAsync<{ season: number }>(`
		SELECT season FROM save_games WHERE id = ?
	`, SAVE_GAME_ID);
	const season = seasonRow?.season ?? 1;
	const [playerRows, fixtureRows, movements] = await Promise.all([
		db.getAllAsync<PlayerRow>(`
			SELECT id, name, is_human, style, scoring, finishing, consistency,
				composure, stamina, form, fatigue
			FROM league_players WHERE save_game_id = ?
			ORDER BY is_human DESC, name
		`, SAVE_GAME_ID),
		db.getAllAsync<FixtureRow>(`
			SELECT id, round, season, season_round, week_start, in_game_date, home_player_id, away_player_id,
				best_of, status, winner_id, home_legs, away_legs, match_id
			FROM league_fixtures WHERE save_game_id = ? AND season = ?
			ORDER BY season_round, in_game_date, id
		`, SAVE_GAME_ID, season),
		loadLocalLeagueMovements(db),
	]);
	const players = playerRows.map(mapPlayer);
	const fixtures = fixtureRows.map(mapFixture);
	return {
		id: 'lantern-league',
		name: 'The Lantern League',
		season,
		players,
		fixtures,
		standings: calculateStandings(players, fixtures),
		siblingLeagues: buildSiblingLocalLeagues(season, movements),
		movements,
	};
}

export function currentHumanFixture(league: LocalLeague, career: CareerProfile): LeagueFixture | null {
	return league.fixtures.find((fixture) => (
		fixture.weekStart === career.inGameDate
		&& (fixture.homePlayerId === career.playerId || fixture.awayPlayerId === career.playerId)
	)) ?? null;
}

export function fixtureOpponent(
	league: LocalLeague,
	fixture: LeagueFixture,
	playerId: string,
): LeaguePlayer | null {
	const opponentId = fixture.homePlayerId === playerId ? fixture.awayPlayerId : fixture.homePlayerId;
	return league.players.find((player) => player.id === opponentId) ?? null;
}

export function prepareAiLeagueResults(
	league: LocalLeague,
	weekStart: string,
	rngState: number,
): { results: PreparedLeagueResult[]; finalRngState: number } {
	let state = rngState;
	const results: PreparedLeagueResult[] = [];
	for (const fixture of league.fixtures) {
		if (fixture.weekStart !== weekStart || fixture.status !== 'scheduled') {
			continue;
		}
		const home = league.players.find((player) => player.id === fixture.homePlayerId);
		const away = league.players.find((player) => player.id === fixture.awayPlayerId);
		if (!home || !away || home.isHuman || away.isHuman) {
			continue;
		}
		const result = simulateMatch({
			id: fixture.id,
			seed: normalizeSeed(state ^ fixture.sequence ^ results.length),
			bestOf: fixture.bestOf,
			inGameDate: fixture.date,
			players: [home, away],
		});
		state = result.finalRngState;
		results.push({ fixture, result });
	}
	return { results, finalRngState: state };
}

export async function persistAiLeagueResults(
	db: SQLiteDatabase,
	prepared: PreparedLeagueResult[],
): Promise<void> {
	for (const { fixture, result } of prepared) {
		const homeLegs = result.legsWon[fixture.homePlayerId] ?? 0;
		const awayLegs = result.legsWon[fixture.awayPlayerId] ?? 0;
		await db.runAsync(`
			INSERT OR IGNORE INTO matches (
				id, save_game_id, seed, in_game_date, best_of, winner_id,
				player_legs, opponent_legs, result_json, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
		result.id,
		SAVE_GAME_ID,
		result.seed,
		result.inGameDate,
		result.bestOf,
		result.winnerId,
		homeLegs,
		awayLegs,
		JSON.stringify(result),
		new Date().toISOString(),
		);
		await db.runAsync(`
			UPDATE league_fixtures
			SET status = 'complete', winner_id = ?, home_legs = ?, away_legs = ?, match_id = ?
			WHERE id = ? AND save_game_id = ? AND status = 'scheduled'
		`, result.winnerId, homeLegs, awayLegs, result.id, fixture.id, SAVE_GAME_ID);
	}
}

