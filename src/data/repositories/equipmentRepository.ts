import type { SQLiteDatabase } from 'expo-sqlite';

import type { DartsSet, OwnedDarts } from '../../domain/equipment';
import { DARTS_CATALOGUE } from '../seed/equipment';

const SAVE_GAME_ID = 'primary-career';
const STARTER_DARTS_ID = 'darts-house-23';

type OwnedDartsRow = {
	darts_id: string;
	purchased_at: string;
	is_equipped: number;
};

export async function ensureStarterDarts(db: SQLiteDatabase): Promise<void> {
	const timestamp = new Date().toISOString();
	await db.runAsync(`
		INSERT OR IGNORE INTO owned_darts (save_game_id, darts_id, purchased_at, is_equipped)
		VALUES (?, ?, ?, 1)
	`, SAVE_GAME_ID, STARTER_DARTS_ID, timestamp);
	const equipped = await db.getFirstAsync<{ count: number }>(`
		SELECT COUNT(*) AS count FROM owned_darts
		WHERE save_game_id = ? AND is_equipped = 1
	`, SAVE_GAME_ID);
	if ((equipped?.count ?? 0) === 0) {
		await db.runAsync(`
			UPDATE owned_darts SET is_equipped = 1
			WHERE save_game_id = ? AND darts_id = ?
		`, SAVE_GAME_ID, STARTER_DARTS_ID);
	}
}

export async function loadOwnedDarts(db: SQLiteDatabase): Promise<OwnedDarts[]> {
	const rows = await db.getAllAsync<OwnedDartsRow>(`
		SELECT darts_id, purchased_at, is_equipped
		FROM owned_darts
		WHERE save_game_id = ?
		ORDER BY purchased_at, darts_id
	`, SAVE_GAME_ID);
	return rows.flatMap((row) => {
		const darts = DARTS_CATALOGUE.find((option) => option.id === row.darts_id);
		return darts ? [{ ...darts, purchasedAt: row.purchased_at, isEquipped: row.is_equipped === 1 }] : [];
	});
}

export async function purchaseAndEquipDarts(
	db: SQLiteDatabase,
	darts: DartsSet,
): Promise<void> {
	await db.withTransactionAsync(async () => {
		const insertion = await db.runAsync(`
			INSERT OR IGNORE INTO owned_darts (save_game_id, darts_id, purchased_at, is_equipped)
			VALUES (?, ?, ?, 0)
		`, SAVE_GAME_ID, darts.id, new Date().toISOString());
		if (insertion.changes === 1) {
			const balanceUpdate = await db.runAsync(`
				UPDATE save_games
				SET bank_balance_pence = bank_balance_pence - ?, updated_at = ?
				WHERE id = ? AND bank_balance_pence >= ?
			`, darts.pricePence, new Date().toISOString(), SAVE_GAME_ID, darts.pricePence);
			if (balanceUpdate.changes !== 1) {
				throw new Error('You cannot afford this set of darts.');
			}
			await db.runAsync(`
				INSERT INTO ledger_entries (
					id, save_game_id, type, amount_pence, description, in_game_date, reference_id
				)
				SELECT ?, ?, 'equipment', ?, ?, in_game_date, ?
				FROM save_games WHERE id = ?
			`,
			`ledger-equipment-${darts.id}`,
			SAVE_GAME_ID,
			-darts.pricePence,
			`Purchased ${darts.name}`,
			`equipment:${darts.id}`,
			SAVE_GAME_ID,
			);
		}
		await equipDartsInsideTransaction(db, darts.id);
	});
}

export async function equipDarts(db: SQLiteDatabase, dartsId: string): Promise<void> {
	await db.withTransactionAsync(async () => {
		await equipDartsInsideTransaction(db, dartsId);
	});
}

async function equipDartsInsideTransaction(db: SQLiteDatabase, dartsId: string): Promise<void> {
	const owned = await db.getFirstAsync<{ count: number }>(`
		SELECT COUNT(*) AS count FROM owned_darts
		WHERE save_game_id = ? AND darts_id = ?
	`, SAVE_GAME_ID, dartsId);
	if ((owned?.count ?? 0) !== 1) {
		throw new Error('Purchase these darts before equipping them.');
	}
	await db.runAsync('UPDATE owned_darts SET is_equipped = 0 WHERE save_game_id = ?', SAVE_GAME_ID);
	await db.runAsync(`
		UPDATE owned_darts SET is_equipped = 1
		WHERE save_game_id = ? AND darts_id = ?
	`, SAVE_GAME_ID, dartsId);
}

