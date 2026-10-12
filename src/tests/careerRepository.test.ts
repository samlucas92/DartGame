import type { SQLiteDatabase } from 'expo-sqlite';
import { describe, expect, it } from 'vitest';

import { persistMatchResult } from '../data/repositories/careerRepository';
import { simulateMatch } from '../engine/darts/simulation';
import type { MatchConfig } from '../engine/darts/types';

const config: MatchConfig = {
	id: 'persisted-match-1',
	seed: 41,
	bestOf: 3,
	inGameDate: '2026-01-05',
	players: [
		{
			id: 'human-player',
			name: 'Alex North',
			attributes: { scoring: 48, finishing: 47, consistency: 49, composure: 46, stamina: 52 },
			form: 0,
			fatigue: 0,
		},
		{
			id: 'ai-rowan-vale',
			name: 'Rowan Vale',
			attributes: { scoring: 49, finishing: 46, consistency: 51, composure: 48, stamina: 54 },
			form: 0,
			fatigue: 0,
		},
	],
};

function databaseWithInsertChanges(insertChanges: number): {
	db: SQLiteDatabase;
	statements: string[];
} {
	const statements: string[] = [];
	const transaction = {
		runAsync: async (sql: string) => {
			statements.push(sql);
			return {
				changes: sql.includes('INSERT OR IGNORE INTO matches') ? insertChanges : 1,
				lastInsertRowId: 1,
			};
		},
	};
	const db = {
		runAsync: transaction.runAsync,
		withTransactionAsync: async (task: () => Promise<void>) => task(),
	} as unknown as SQLiteDatabase;

	return { db, statements };
}

describe('match persistence idempotency', () => {
	it('updates career statistics when a result is inserted', async () => {
		const { db, statements } = databaseWithInsertChanges(1);
		const inserted = await persistMatchResult(db, simulateMatch(config), 'human-player');

		expect(inserted).toBe(true);
		expect(statements.filter((sql) => sql.includes('UPDATE players'))).toHaveLength(1);
		expect(statements.some((sql) => sql.includes('ranking_points = ranking_points +'))).toBe(false);
		expect(statements.filter((sql) => sql.includes('UPDATE save_games'))).toHaveLength(1);
	});

	it('does not update statistics when the match id already exists', async () => {
		const { db, statements } = databaseWithInsertChanges(0);
		const inserted = await persistMatchResult(db, simulateMatch(config), 'human-player');

		expect(inserted).toBe(false);
		expect(statements.filter((sql) => sql.includes('UPDATE players'))).toHaveLength(0);
		expect(statements.filter((sql) => sql.includes('UPDATE save_games'))).toHaveLength(0);
	});
});

