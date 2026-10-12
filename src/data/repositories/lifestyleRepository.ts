import type { SQLiteDatabase } from 'expo-sqlite';

import type { LifestyleItem, LifestyleState } from '../../domain/lifestyle';
import { DEFAULT_LIFESTYLE_IDS, LIFESTYLE_CATALOGUE } from '../seed/lifestyle';

const SAVE_GAME_ID = 'primary-career';

type LifestyleRow = {
	home_id: string;
	transport_id: string;
	practice_id: string;
};

function catalogueItem(id: string): LifestyleItem {
	const item = LIFESTYLE_CATALOGUE.find((option) => option.id === id);
	if (!item) {
		throw new Error(`Unknown lifestyle item: ${id}`);
	}
	return item;
}

export async function ensureLifestyleState(db: SQLiteDatabase): Promise<void> {
	await db.runAsync(`
		INSERT OR IGNORE INTO lifestyle_state (save_game_id, home_id, transport_id, practice_id)
		VALUES (?, ?, ?, ?)
	`, SAVE_GAME_ID, DEFAULT_LIFESTYLE_IDS.home, DEFAULT_LIFESTYLE_IDS.transport, DEFAULT_LIFESTYLE_IDS.practice);
	const timestamp = new Date().toISOString();
	for (const itemId of Object.values(DEFAULT_LIFESTYLE_IDS)) {
		await db.runAsync(`
			INSERT OR IGNORE INTO owned_lifestyle_items (save_game_id, item_id, purchased_at)
			VALUES (?, ?, ?)
		`, SAVE_GAME_ID, itemId, timestamp);
	}
}

export async function loadLifestyleState(db: SQLiteDatabase): Promise<LifestyleState> {
	await ensureLifestyleState(db);
	const row = await db.getFirstAsync<LifestyleRow>(`
		SELECT home_id, transport_id, practice_id
		FROM lifestyle_state WHERE save_game_id = ?
	`, SAVE_GAME_ID);
	if (!row) {
		throw new Error('Lifestyle state could not be loaded.');
	}
	const owned = await db.getAllAsync<{ item_id: string }>(`
		SELECT item_id FROM owned_lifestyle_items WHERE save_game_id = ?
	`, SAVE_GAME_ID);
	return {
		home: catalogueItem(row.home_id),
		transport: catalogueItem(row.transport_id),
		practice: catalogueItem(row.practice_id),
		ownedItemIds: owned.map((item) => item.item_id),
	};
}

export async function purchaseOrSelectLifestyleItem(
	db: SQLiteDatabase,
	item: LifestyleItem,
): Promise<{ purchased: boolean }> {
	let purchased = false;
	await db.withTransactionAsync(async () => {
		const owned = await db.getFirstAsync<{ count: number }>(`
			SELECT COUNT(*) AS count FROM owned_lifestyle_items
			WHERE save_game_id = ? AND item_id = ?
		`, SAVE_GAME_ID, item.id);
		if ((owned?.count ?? 0) === 0) {
			purchased = true;
			const balanceUpdate = await db.runAsync(`
				UPDATE save_games SET bank_balance_pence = bank_balance_pence - ?, updated_at = ?
				WHERE id = ? AND bank_balance_pence >= ?
			`, item.purchasePricePence, new Date().toISOString(), SAVE_GAME_ID, item.purchasePricePence);
			if (balanceUpdate.changes !== 1) {
				throw new Error(`You cannot afford ${item.name}.`);
			}
			await db.runAsync(`
				INSERT INTO owned_lifestyle_items (save_game_id, item_id, purchased_at)
				VALUES (?, ?, ?)
			`, SAVE_GAME_ID, item.id, new Date().toISOString());
			if (item.purchasePricePence > 0) {
				await db.runAsync(`
					INSERT INTO ledger_entries (
						id, save_game_id, type, amount_pence, description, in_game_date, reference_id
					)
					SELECT ?, ?, 'lifestyle', ?, ?, in_game_date, ? FROM save_games WHERE id = ?
				`, `ledger-lifestyle-${item.id}`, SAVE_GAME_ID, -item.purchasePricePence,
				`Purchased ${item.name}`, `lifestyle:${item.id}`, SAVE_GAME_ID);
			}
			if (item.instantRecovery > 0) {
				await db.runAsync(`
					UPDATE players
					SET fatigue = MAX(0, fatigue - ?)
					WHERE save_game_id = ?
						AND id = (SELECT player_id FROM save_games WHERE id = ?)
				`, item.instantRecovery, SAVE_GAME_ID, SAVE_GAME_ID);
			}
		}
		if (item.category === 'experience') {
			return;
		}
		const column = item.category === 'home'
			? 'home_id'
			: item.category === 'transport'
				? 'transport_id'
				: 'practice_id';
		await db.runAsync(`UPDATE lifestyle_state SET ${column} = ? WHERE save_game_id = ?`, item.id, SAVE_GAME_ID);
	});
	return { purchased };
}

