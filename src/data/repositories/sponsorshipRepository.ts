import type { SQLiteDatabase } from 'expo-sqlite';

import type { SponsorOffer, SponsorshipContract } from '../../domain/sponsorship';
import type { MatchResult } from '../../engine/darts/types';
import { SPONSOR_OFFERS } from '../seed/sponsorships';

const SAVE_GAME_ID = 'primary-career';

type SponsorshipRow = {
	sponsor_id: string;
	signed_at: string;
};

export async function loadSponsorshipContract(
	db: SQLiteDatabase,
): Promise<SponsorshipContract | null> {
	const row = await db.getFirstAsync<SponsorshipRow>(`
		SELECT sponsor_id, signed_at FROM sponsorship_contracts WHERE save_game_id = ?
	`, SAVE_GAME_ID);
	if (!row) {
		return null;
	}
	const offer = SPONSOR_OFFERS.find((option) => option.id === row.sponsor_id);
	return offer ? { ...offer, signedAt: row.signed_at } : null;
}

export async function loadClaimedSponsorIds(db: SQLiteDatabase): Promise<string[]> {
	const rows = await db.getAllAsync<{ sponsor_id: string }>(`
		SELECT sponsor_id FROM claimed_sponsorships WHERE save_game_id = ?
	`, SAVE_GAME_ID);
	return rows.map((row) => row.sponsor_id);
}

export async function signSponsorship(db: SQLiteDatabase, offer: SponsorOffer): Promise<void> {
	const now = new Date().toISOString();
	await db.withTransactionAsync(async () => {
		const claim = await db.runAsync(`
			INSERT OR IGNORE INTO claimed_sponsorships (save_game_id, sponsor_id, claimed_at)
			VALUES (?, ?, ?)
		`, SAVE_GAME_ID, offer.id, now);
		if (claim.changes !== 1) {
			throw new Error('This sponsorship signing bonus has already been claimed.');
		}
		await db.runAsync(`
			INSERT INTO sponsorship_contracts (
				save_game_id, sponsor_id, weekly_payment_pence, signed_at
			) VALUES (?, ?, ?, ?)
			ON CONFLICT(save_game_id) DO UPDATE SET
				sponsor_id = excluded.sponsor_id,
				weekly_payment_pence = excluded.weekly_payment_pence,
				signed_at = excluded.signed_at
		`, SAVE_GAME_ID, offer.id, offer.weeklyPaymentPence, now);
		await db.runAsync(`
			UPDATE save_games SET bank_balance_pence = bank_balance_pence + ?, updated_at = ?
			WHERE id = ?
		`, offer.signingBonusPence, now, SAVE_GAME_ID);
		await db.runAsync(`
			INSERT INTO ledger_entries (
				id, save_game_id, type, amount_pence, description, in_game_date, reference_id
			)
			SELECT ?, ?, 'sponsorship', ?, ?, in_game_date, ? FROM save_games WHERE id = ?
		`, `ledger-sponsor-${offer.id}`, SAVE_GAME_ID, offer.signingBonusPence,
		`${offer.name} signing bonus`, `sponsorship:${offer.id}`, SAVE_GAME_ID);
	});
}

export async function evaluateSponsorRetention(
	db: SQLiteDatabase,
	playerId: string,
): Promise<SponsorOffer | null> {
	const contract = await loadSponsorshipContract(db);
	if (!contract) {
		return null;
	}
	const rows = await db.getAllAsync<{ result_json: string }>(`
		SELECT result_json FROM matches
		WHERE save_game_id = ?
		ORDER BY created_at DESC
		LIMIT 24
	`, SAVE_GAME_ID);
	const humanResults = rows
		.map((row) => JSON.parse(row.result_json) as MatchResult)
		.filter((result) => result.players.some((player) => player.id === playerId))
		.slice(0, 4);
	if (humanResults.length < 4) {
		return null;
	}
	const wins = humanResults.filter((result) => result.winnerId === playerId).length;
	if (wins >= contract.minimumWinsPerFour) {
		return null;
	}
	await db.runAsync('DELETE FROM sponsorship_contracts WHERE save_game_id = ?', SAVE_GAME_ID);
	return contract;
}

