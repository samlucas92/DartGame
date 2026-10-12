import type { SQLiteDatabase } from 'expo-sqlite';

import type { CareerProfile } from '../../domain/career';
import type { MatchPlayer, MatchResult } from '../../engine/darts/types';
import {
	tournamentEdition,
	tournamentEntryEligible,
	tournamentRegistrationStatus,
	type TournamentDefinition,
	type TournamentEntry,
	type TournamentMatch,
} from '../../domain/tournaments';
import { WORLD_PLAYERS } from '../seed/worldPlayers';

const SAVE_GAME_ID = 'primary-career';

type TournamentEntryRow = {
	id: string;
	tournament_id: string;
	edition: number;
	entry_fee_pence: number;
	entered_date: string;
	status: TournamentEntry['status'];
	matches_won: number;
	prize_money_pence: number;
};

type TournamentMatchRow = {
	id: string;
	entry_id: string;
	tournament_id: string;
	edition: number;
	round: number;
	total_rounds: number;
	round_label: string;
	in_game_date: string;
	opponent_json: string;
	best_of: 3 | 5 | 7 | 11;
	status: TournamentMatch['status'];
	winner_id: string | null;
	result_json: string | null;
};

function mapEntry(row: TournamentEntryRow): TournamentEntry {
	return {
		id: row.id,
		tournamentId: row.tournament_id,
		edition: row.edition,
		entryFeePence: row.entry_fee_pence,
		enteredDate: row.entered_date,
		status: row.status,
		matchesWon: row.matches_won,
		prizeMoneyPence: row.prize_money_pence,
	};
}

function mapMatch(row: TournamentMatchRow): TournamentMatch {
	return {
		id: row.id,
		entryId: row.entry_id,
		tournamentId: row.tournament_id,
		edition: row.edition,
		round: row.round,
		totalRounds: row.total_rounds,
		roundLabel: row.round_label,
		date: row.in_game_date,
		bestOf: row.best_of,
		status: row.status,
		opponent: JSON.parse(row.opponent_json) as MatchPlayer,
		winnerId: row.winner_id,
		result: row.result_json ? JSON.parse(row.result_json) as MatchResult : null,
	};
}

function stringHash(value: string): number {
	let hash = 2_166_136_261;
	for (const character of value) {
		hash ^= character.charCodeAt(0);
		hash = Math.imul(hash, 16_777_619);
	}
	return hash >>> 0;
}

function tournamentWorldTier(tournament: TournamentDefinition) {
	if (tournament.minimumTier === 'Professional') return 'professional';
	if (tournament.minimumTier === 'Q School contender') return 'qualifying';
	if (tournament.minimumTier === 'National amateur') return 'national-amateur';
	if (tournament.minimumTier === 'Regional amateur') return 'regional-amateur';
	return 'local';
}

function tournamentOpponent(
	tournament: TournamentDefinition,
	edition: number,
	round: number,
): MatchPlayer {
	const tier = tournamentWorldTier(tournament);
	const field = WORLD_PLAYERS.filter((player) => player.tier === tier);
	const index = stringHash(`${tournament.id}:${edition}:${round}`) % field.length;
	const player = field[index] ?? WORLD_PLAYERS[WORLD_PLAYERS.length - 1];
	if (!player) {
		throw new Error('The tournament field could not be generated.');
	}
	return {
		id: player.id,
		name: player.name,
		attributes: player.attributes,
		form: player.form,
		fatigue: player.fatigue,
	};
}

function totalTournamentRounds(tournament: TournamentDefinition): number {
	const fieldSize = Number(tournament.format.match(/^(\d+)-player/)?.[1] ?? 0);
	if (fieldSize > 0) {
		return Math.ceil(Math.log2(fieldSize));
	}
	if (tournament.id === 'tour-qualifying-school') return 4;
	if (tournament.id === 'grand-premier-league') return 7;
	if (tournament.id === 'foundry-masters') return 4;
	return 5;
}

function tournamentBestOf(tournament: TournamentDefinition): TournamentMatch['bestOf'] {
	const parsed = Number(tournament.format.match(/Best of (\d+)/)?.[1]);
	if (parsed === 3 || parsed === 5 || parsed === 7 || parsed === 11) return parsed;
	if (tournament.recommendedAverage >= 85) return 11;
	if (tournament.recommendedAverage >= 55) return 7;
	return 5;
}

function roundLabel(round: number, totalRounds: number): string {
	const remaining = totalRounds - round;
	if (remaining === 0) return 'Final';
	if (remaining === 1) return 'Semi-final';
	if (remaining === 2) return 'Quarter-final';
	return `Round ${round}`;
}

async function insertTournamentMatch(
	db: SQLiteDatabase,
	entry: TournamentEntry,
	tournament: TournamentDefinition,
	round: number,
	date: string,
): Promise<void> {
	const totalRounds = totalTournamentRounds(tournament);
	const opponent = tournamentOpponent(tournament, entry.edition, round);
	await db.runAsync(`
		INSERT OR IGNORE INTO tournament_matches (
			id, save_game_id, entry_id, tournament_id, edition, round, total_rounds,
			round_label, in_game_date, opponent_json, best_of, status, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
	`, `tournament-match-${entry.edition}-${tournament.id}-r${round}`, SAVE_GAME_ID,
	entry.id, tournament.id, entry.edition, round, totalRounds, roundLabel(round, totalRounds),
	date, JSON.stringify(opponent), tournamentBestOf(tournament), new Date().toISOString());
}

export async function loadTournamentEntries(db: SQLiteDatabase): Promise<TournamentEntry[]> {
	const rows = await db.getAllAsync<TournamentEntryRow>(`
		SELECT id, tournament_id, edition, entry_fee_pence, entered_date,
			status, matches_won, prize_money_pence
		FROM tournament_entries
		WHERE save_game_id = ?
		ORDER BY edition DESC, entered_date DESC, tournament_id
	`, SAVE_GAME_ID);
	return rows.map(mapEntry);
}

export async function loadTournamentMatches(db: SQLiteDatabase): Promise<TournamentMatch[]> {
	const rows = await db.getAllAsync<TournamentMatchRow>(`
		SELECT id, entry_id, tournament_id, edition, round, total_rounds, round_label,
			in_game_date, opponent_json, best_of, status, winner_id, result_json
		FROM tournament_matches
		WHERE save_game_id = ?
		ORDER BY edition DESC, in_game_date, round
	`, SAVE_GAME_ID);
	return rows.map(mapMatch);
}

export async function ensureTournamentMatches(
	db: SQLiteDatabase,
	tournaments: readonly TournamentDefinition[],
): Promise<void> {
	const [entries, matches] = await Promise.all([
		loadTournamentEntries(db),
		loadTournamentMatches(db),
	]);
	for (const entry of entries) {
		if (entry.status === 'eliminated' || entry.status === 'champion') continue;
		if (matches.some((match) => match.entryId === entry.id)) continue;
		const tournament = tournaments.find((candidate) => candidate.id === entry.tournamentId);
		if (!tournament) continue;
		await insertTournamentMatch(db, entry, tournament, Math.max(1, entry.matchesWon + 1), entry.enteredDate);
	}
}

export async function enterTournament(
	db: SQLiteDatabase,
	career: CareerProfile,
	tournament: TournamentDefinition,
	registrationInvitation = false,
): Promise<TournamentEntry> {
	if (!tournamentEntryEligible(career.tier, tournament)) {
		throw new Error(`${tournament.name} requires ${tournament.minimumTier} status.`);
	}
	if (!registrationInvitation && tournamentRegistrationStatus(career.weeksElapsed, tournament) !== 'open') {
		throw new Error(`Registration for ${tournament.name} is not open.`);
	}

	const edition = tournamentEdition(career.weeksElapsed, tournament.week);
	const entry: TournamentEntry = {
		id: `tournament-entry-${edition}-${tournament.id}`,
		tournamentId: tournament.id,
		edition,
		entryFeePence: tournament.entryFeePence,
		enteredDate: career.inGameDate,
		status: 'entered',
		matchesWon: 0,
		prizeMoneyPence: 0,
	};

	await db.withTransactionAsync(async () => {
		const existing = await db.getFirstAsync<{ id: string }>(`
			SELECT id FROM tournament_entries
			WHERE save_game_id = ? AND tournament_id = ? AND edition = ?
		`, SAVE_GAME_ID, tournament.id, edition);
		if (existing) {
			throw new Error(`You are already entered in ${tournament.name}.`);
		}

		const balanceUpdate = await db.runAsync(`
			UPDATE save_games
			SET bank_balance_pence = bank_balance_pence - ?, updated_at = ?
			WHERE id = ? AND bank_balance_pence >= ?
		`, tournament.entryFeePence, new Date().toISOString(), SAVE_GAME_ID, tournament.entryFeePence);
		if (balanceUpdate.changes !== 1) {
			throw new Error(`You need £${(tournament.entryFeePence / 100).toFixed(2)} to enter ${tournament.name}.`);
		}

		await db.runAsync(`
			INSERT INTO tournament_entries (
				id, save_game_id, tournament_id, edition, entry_fee_pence, entered_date, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?)
		`, entry.id, SAVE_GAME_ID, tournament.id, edition, tournament.entryFeePence,
		career.inGameDate, new Date().toISOString());

		await insertTournamentMatch(db, entry, tournament, 1, career.inGameDate);

		await db.runAsync(`
			INSERT INTO ledger_entries (
				id, save_game_id, type, amount_pence, description, in_game_date, reference_id
			) VALUES (?, ?, 'tournament-entry', ?, ?, ?, ?)
		`, `ledger-${entry.id}`, SAVE_GAME_ID, -tournament.entryFeePence,
		`${tournament.name} entry fee`, career.inGameDate, entry.id);
	});

	return entry;
}

export async function completeTournamentMatch(
	db: SQLiteDatabase,
	career: CareerProfile,
	tournament: TournamentDefinition,
	match: TournamentMatch,
	result: MatchResult,
): Promise<void> {
	const won = result.winnerId === career.playerId;
	await db.withTransactionAsync(async () => {
		const update = await db.runAsync(`
			UPDATE tournament_matches
			SET status = 'complete', winner_id = ?, result_json = ?
			WHERE id = ? AND save_game_id = ? AND status = 'scheduled'
		`, result.winnerId, JSON.stringify(result), match.id, SAVE_GAME_ID);
		if (update.changes === 0) return;

		if (!won) {
			await db.runAsync(`
				UPDATE tournament_entries SET status = 'eliminated'
				WHERE id = ? AND save_game_id = ?
			`, match.entryId, SAVE_GAME_ID);
			return;
		}

		if (match.round < match.totalRounds) {
			await db.runAsync(`
				UPDATE tournament_entries
				SET status = 'in-progress', matches_won = matches_won + 1
				WHERE id = ? AND save_game_id = ?
			`, match.entryId, SAVE_GAME_ID);
			const entry: TournamentEntry = {
				id: match.entryId,
				tournamentId: match.tournamentId,
				edition: match.edition,
				entryFeePence: 0,
				enteredDate: match.date,
				status: 'in-progress',
				matchesWon: match.round,
				prizeMoneyPence: 0,
			};
			await insertTournamentMatch(db, entry, tournament, match.round + 1, match.date);
			return;
		}

		await db.runAsync(`
			UPDATE tournament_entries
			SET status = 'champion', matches_won = matches_won + 1, prize_money_pence = ?
			WHERE id = ? AND save_game_id = ?
		`, tournament.firstPrizePence, match.entryId, SAVE_GAME_ID);
		if (tournament.firstPrizePence > 0) {
			await db.runAsync(`
				UPDATE save_games SET bank_balance_pence = bank_balance_pence + ?, updated_at = ?
				WHERE id = ?
			`, tournament.firstPrizePence, new Date().toISOString(), SAVE_GAME_ID);
			await db.runAsync(`
				INSERT OR IGNORE INTO ledger_entries (
					id, save_game_id, type, amount_pence, description, in_game_date, reference_id
				) VALUES (?, ?, 'tournament-prize', ?, ?, ?, ?)
			`, `ledger-${match.entryId}-prize`, SAVE_GAME_ID, tournament.firstPrizePence,
			`${tournament.name} winner's prize`, match.date, `${match.entryId}:prize`);
		}
	});
}

