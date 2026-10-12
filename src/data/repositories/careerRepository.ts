import type { SQLiteDatabase } from 'expo-sqlite';

import {
	createStartingAttributes,
	ageOnDate,
	dateOfBirthForStartingAge,
	emptyCareerStats,
	startingBalancePence,
	type CareerBackground,
	type CareerProfile,
	type NewCareerInput,
	type PlayerStyle,
	type WeeklyStrategy,
} from '../../domain/career';
import type { LeagueFixture } from '../../domain/league';
import type { MatchResult } from '../../engine/darts/types';
import { normalizeSeed } from '../../engine/random/seededRandom';

const SAVE_GAME_ID = 'primary-career';
const PLAYER_ID = 'human-player';
const START_DATE = '2026-01-05';

type CareerRow = {
	save_game_id: string;
	player_id: string;
	name: string;
	age: number;
	date_of_birth: string;
	location: string;
	style: PlayerStyle;
	background: CareerBackground;
	tier: string;
	ranking_points: number;
	has_tour_card: number;
	in_game_date: string;
	season: number;
	weeks_elapsed: number;
	seed: number;
	rng_state: number;
	bank_balance_pence: number;
	potential: number;
	form: number;
	fatigue: number;
	scoring: number;
	finishing: number;
	consistency: number;
	composure: number;
	stamina: number;
	scoring_progress: number;
	finishing_progress: number;
	consistency_progress: number;
	composure_progress: number;
	stamina_progress: number;
	matches_played: number;
	matches_won: number;
	matches_lost: number;
	legs_won: number;
	legs_lost: number;
	darts_thrown: number;
	points_scored: number;
	checkout_attempts: number;
	checkouts: number;
	one_eighties: number;
	nine_darters: number;
	highest_checkout: number;
	weekly_strategy: WeeklyStrategy;
	last_manual_save_at: string | null;
};

function seedFromInput(input: NewCareerInput): number {
	let hash = 2_166_136_261;
	for (const character of `${input.name}:${input.dateOfBirth ?? input.age}:${input.style}:${input.background}`) {
		hash ^= character.charCodeAt(0);
		hash = Math.imul(hash, 16_777_619);
	}
	return normalizeSeed(hash);
}

function mapCareer(row: CareerRow): CareerProfile {
	const stats = {
		matchesPlayed: row.matches_played,
		matchesWon: row.matches_won,
		matchesLost: row.matches_lost,
		legsWon: row.legs_won,
		legsLost: row.legs_lost,
		dartsThrown: row.darts_thrown,
		pointsScored: row.points_scored,
		checkoutAttempts: row.checkout_attempts,
		checkouts: row.checkouts,
		oneEighties: row.one_eighties,
		nineDarters: row.nine_darters,
		highestCheckout: row.highest_checkout,
	};
	return {
		saveGameId: row.save_game_id,
		playerId: row.player_id,
		name: row.name,
		age: ageOnDate(row.date_of_birth, row.in_game_date),
		dateOfBirth: row.date_of_birth,
		location: row.location,
		style: row.style,
		background: row.background,
		tier: row.tier as CareerProfile['tier'],
		careerPoints: row.ranking_points,
		hasTourCard: row.has_tour_card === 1,
		weeklyStrategy: row.weekly_strategy,
		lastManualSaveAt: row.last_manual_save_at,
		inGameDate: row.in_game_date,
		season: row.season,
		weeksElapsed: row.weeks_elapsed,
		seed: row.seed,
		rngState: row.rng_state,
		bankBalancePence: row.bank_balance_pence,
		potential: row.potential,
		form: row.form,
		fatigue: row.fatigue,
		attributes: {
			scoring: row.scoring,
			finishing: row.finishing,
			consistency: row.consistency,
			composure: row.composure,
			stamina: row.stamina,
		},
		developmentProgress: {
			scoring: row.scoring_progress,
			finishing: row.finishing_progress,
			consistency: row.consistency_progress,
			composure: row.composure_progress,
			stamina: row.stamina_progress,
		},
		stats,
	};
}

export async function loadCareer(db: SQLiteDatabase): Promise<CareerProfile | null> {
	const row = await db.getFirstAsync<CareerRow>(`
		SELECT
			s.id AS save_game_id,
			s.player_id,
			s.in_game_date,
			s.season,
			s.weeks_elapsed,
			s.seed,
			s.rng_state,
			s.bank_balance_pence,
			s.weekly_strategy,
			s.last_manual_save_at,
			p.*
		FROM save_games s
		JOIN players p ON p.id = s.player_id
		WHERE s.id = ?
	`, SAVE_GAME_ID);
	return row ? mapCareer(row) : null;
}

export async function saveCareerNow(db: SQLiteDatabase): Promise<string> {
	const savedAt = new Date().toISOString();
	const result = await db.runAsync(`
		UPDATE save_games SET last_manual_save_at = ?, updated_at = ? WHERE id = ?
	`, savedAt, savedAt, SAVE_GAME_ID);
	if (result.changes !== 1) {
		throw new Error('No career is available to save.');
	}
	return savedAt;
}

export async function saveWeeklyStrategy(
	db: SQLiteDatabase,
	strategy: WeeklyStrategy,
): Promise<void> {
	await db.withTransactionAsync(async () => {
		await db.runAsync(`
			UPDATE save_games SET weekly_strategy = ?, updated_at = ? WHERE id = ?
		`, strategy, new Date().toISOString(), SAVE_GAME_ID);
		await db.runAsync(`
			DELETE FROM training_plans
			WHERE save_game_id = ? AND completed_at IS NULL
		`, SAVE_GAME_ID);
	});
}

export async function createCareer(
	db: SQLiteDatabase,
	input: NewCareerInput,
): Promise<CareerProfile> {
	const cleanName = input.name.trim();
	if (!cleanName) {
		throw new Error('Player name is required.');
	}

	const attributes = createStartingAttributes(input.style);
	const balance = startingBalancePence(input.background);
	const dateOfBirth = input.dateOfBirth?.trim()
		|| dateOfBirthForStartingAge(input.age ?? 21);
	const age = ageOnDate(dateOfBirth, START_DATE);
	if (age < 18 || age > 60) {
		throw new Error('Player must be between 18 and 60 when the career begins.');
	}
	const seed = seedFromInput(input);
	const timestamp = new Date().toISOString();

	await db.withTransactionAsync(async () => {
		await db.runAsync('DELETE FROM save_games WHERE id = ?', SAVE_GAME_ID);
		await db.runAsync(`
			INSERT INTO save_games (
				id, version, in_game_date, seed, rng_state, player_id,
				bank_balance_pence, season, created_at, updated_at
			) VALUES (?, 15, ?, ?, ?, ?, ?, 1, ?, ?)
		`, SAVE_GAME_ID, START_DATE, seed, seed, PLAYER_ID, balance, timestamp, timestamp);
		await db.runAsync(`
			INSERT INTO players (
				id, save_game_id, name, age, date_of_birth, location, style, background, tier,
				potential, form, fatigue, scoring, finishing, consistency, composure, stamina
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Local amateur', ?, 0, 0, ?, ?, ?, ?, ?)
		`,
		PLAYER_ID,
		SAVE_GAME_ID,
		cleanName,
		age,
		dateOfBirth,
		input.location,
		input.style,
		input.background,
		68,
		attributes.scoring,
		attributes.finishing,
		attributes.consistency,
		attributes.composure,
		attributes.stamina,
		);
		await db.runAsync(`
			INSERT INTO ledger_entries (
				id, save_game_id, type, amount_pence, description, in_game_date, reference_id
			) VALUES (?, ?, 'starting-funds', ?, 'Career starting funds', ?, ?)
		`, 'ledger-starting-funds', SAVE_GAME_ID, balance, START_DATE, 'career-starting-funds');
	});

	const career = await loadCareer(db);
	if (!career) {
		throw new Error('Career was created but could not be reloaded.');
	}
	return career;
}

export async function loadLatestMatch(db: SQLiteDatabase): Promise<MatchResult | null> {
	const rows = await db.getAllAsync<{ result_json: string }>(`
		SELECT result_json
		FROM matches
		WHERE save_game_id = ?
		ORDER BY created_at DESC
	`, SAVE_GAME_ID);
	for (const row of rows) {
		const result = JSON.parse(row.result_json) as MatchResult;
		if (result.players.some((player) => player.id === PLAYER_ID)) {
			return result;
		}
	}
	return null;
}

export async function persistMatchResult(
	db: SQLiteDatabase,
	result: MatchResult,
	playerId: string,
	fixture?: LeagueFixture,
): Promise<boolean> {
	const playerStats = result.stats[playerId];
	if (!playerStats) {
		throw new Error('The human player is not present in this result.');
	}
	const opponent = result.players.find((player) => player.id !== playerId);
	if (!opponent) {
		throw new Error('The match result has no opponent.');
	}

	let inserted = false;
	await db.withTransactionAsync(async () => {
		const insertion = await db.runAsync(`
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
		result.legsWon[playerId] ?? 0,
		result.legsWon[opponent.id] ?? 0,
		JSON.stringify(result),
		new Date().toISOString(),
		);

		if (insertion.changes === 0) {
			return;
		}

		inserted = true;
		const opponentLegs = result.legsWon[opponent.id] ?? 0;
		if (fixture) {
			const homeLegs = result.legsWon[fixture.homePlayerId] ?? 0;
			const awayLegs = result.legsWon[fixture.awayPlayerId] ?? 0;
			const fixtureUpdate = await db.runAsync(`
				UPDATE league_fixtures
				SET status = 'complete', winner_id = ?, home_legs = ?, away_legs = ?, match_id = ?
				WHERE id = ? AND save_game_id = ? AND status = 'scheduled'
			`,
			result.winnerId,
			homeLegs,
			awayLegs,
			result.id,
			fixture.id,
			SAVE_GAME_ID,
			);
			if (fixtureUpdate.changes !== 1) {
				throw new Error('This league fixture has already been completed.');
			}
		}
		await db.runAsync(`
			UPDATE players SET
				matches_played = matches_played + 1,
				matches_won = matches_won + ?,
				matches_lost = matches_lost + ?,
				legs_won = legs_won + ?,
				legs_lost = legs_lost + ?,
				darts_thrown = darts_thrown + ?,
				points_scored = points_scored + ?,
				checkout_attempts = checkout_attempts + ?,
				checkouts = checkouts + ?,
				one_eighties = one_eighties + ?,
				nine_darters = nine_darters + ?,
				highest_checkout = MAX(highest_checkout, ?)
			WHERE id = ? AND save_game_id = ?
		`,
		result.winnerId === playerId ? 1 : 0,
		result.winnerId === playerId ? 0 : 1,
		playerStats.legsWon,
		opponentLegs,
		playerStats.dartsThrown,
		playerStats.pointsScored,
		playerStats.checkoutAttempts,
		playerStats.checkouts,
		playerStats.oneEighties,
		playerStats.nineDarters,
		playerStats.highestCheckout,
		playerId,
		SAVE_GAME_ID,
		);
		await db.runAsync(`
			UPDATE save_games
			SET rng_state = ?, updated_at = ?
			WHERE id = ?
		`, result.finalRngState, new Date().toISOString(), SAVE_GAME_ID);
	});

	return inserted;
}

export function createEmptyCareerForTests(input: NewCareerInput): CareerProfile {
	const seed = seedFromInput(input);
	const dateOfBirth = input.dateOfBirth ?? dateOfBirthForStartingAge(input.age ?? 21);
	return {
		saveGameId: SAVE_GAME_ID,
		playerId: PLAYER_ID,
		name: input.name.trim(),
		age: ageOnDate(dateOfBirth, START_DATE),
		dateOfBirth,
		location: input.location,
		style: input.style,
		background: input.background,
		tier: 'Local amateur',
		careerPoints: 0,
		hasTourCard: false,
		weeklyStrategy: 'balanced',
		lastManualSaveAt: null,
		inGameDate: START_DATE,
		season: 1,
		weeksElapsed: 0,
		seed,
		rngState: seed,
		bankBalancePence: startingBalancePence(input.background),
		potential: 68,
		form: 0,
		fatigue: 0,
		attributes: createStartingAttributes(input.style),
		developmentProgress: {
			scoring: 0,
			finishing: 0,
			consistency: 0,
			composure: 0,
			stamina: 0,
		},
		stats: emptyCareerStats(),
	};
}

