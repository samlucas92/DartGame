import type { SQLiteDatabase } from 'expo-sqlite';

import type { LedgerEntry } from '../../domain/finances';

const SAVE_GAME_ID = 'primary-career';

type LedgerRow = {
	id: string;
	type: LedgerEntry['type'];
	amount_pence: number;
	description: string;
	in_game_date: string;
	reference_id: string;
};

export async function loadLedgerEntries(db: SQLiteDatabase): Promise<LedgerEntry[]> {
	const rows = await db.getAllAsync<LedgerRow>(`
		SELECT id, type, amount_pence, description, in_game_date, reference_id
		FROM ledger_entries
		WHERE save_game_id = ?
		ORDER BY in_game_date DESC, rowid DESC
	`, SAVE_GAME_ID);

	return rows.map((row) => ({
		id: row.id,
		type: row.type,
		amountPence: row.amount_pence,
		description: row.description,
		inGameDate: row.in_game_date,
		referenceId: row.reference_id,
	}));
}

