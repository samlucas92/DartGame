import type { SQLiteDatabase } from 'expo-sqlite';
import { describe, expect, it } from 'vitest';

import { createEmptyCareerForTests } from '../data/repositories/careerRepository';
import { enterTournament } from '../data/repositories/tournamentRepository';
import { TOURNAMENT_CALENDAR } from '../data/seed/tournaments';

function openTournament() {
	const tournament = TOURNAMENT_CALENDAR.find((candidate) => candidate.id === 'lantern-league-singles');
	if (!tournament) {
		throw new Error('Missing Lantern League Singles test event.');
	}
	return tournament;
}

describe('tournament entry persistence', () => {
	it('charges and records an eligible entry atomically', async () => {
		const statements: string[] = [];
		const db = {
			getFirstAsync: async () => null,
			runAsync: async (sql: string) => {
				statements.push(sql);
				return { changes: 1, lastInsertRowId: 1 };
			},
			withTransactionAsync: async (task: () => Promise<void>) => task(),
		} as unknown as SQLiteDatabase;
		const career = createEmptyCareerForTests({
			name: 'Alex North',
			age: 21,
			location: 'Northbridge',
			style: 'all-rounder',
			background: 'working-amateur',
		});

		const entry = await enterTournament(db, career, openTournament());

		expect(entry.tournamentId).toBe('lantern-league-singles');
		expect(statements.some((sql) => sql.includes('bank_balance_pence = bank_balance_pence -'))).toBe(true);
		expect(statements.some((sql) => sql.includes('INSERT INTO tournament_entries'))).toBe(true);
		expect(statements.some((sql) => sql.includes('INSERT OR IGNORE INTO tournament_matches'))).toBe(true);
		expect(statements.some((sql) => sql.includes("'tournament-entry'"))).toBe(true);
	});

	it('rejects an entry when the registration window has not opened', async () => {
		const db = {} as SQLiteDatabase;
		const career = createEmptyCareerForTests({
			name: 'Alex North',
			age: 21,
			location: 'Northbridge',
			style: 'all-rounder',
			background: 'working-amateur',
		});
		const future = TOURNAMENT_CALENDAR.find((candidate) => candidate.id === 'railway-rooms-cup');
		if (!future) {
			throw new Error('Missing Railway Rooms Cup test event.');
		}

		await expect(enterTournament(db, career, future)).rejects.toThrow(/not open/i);
	});

	it('honours a response-required registration invitation outside the calculated window', async () => {
		const db = {
			getFirstAsync: async () => null,
			runAsync: async () => ({ changes: 1, lastInsertRowId: 1 }),
			withTransactionAsync: async (task: () => Promise<void>) => task(),
		} as unknown as SQLiteDatabase;
		const career = createEmptyCareerForTests({
			name: 'Alex North',
			age: 21,
			location: 'Northbridge',
			style: 'all-rounder',
			background: 'working-amateur',
		});
		const future = TOURNAMENT_CALENDAR.find((candidate) => candidate.id === 'railway-rooms-cup');
		if (!future) {
			throw new Error('Missing Railway Rooms Cup test event.');
		}

		await expect(enterTournament(db, career, future, true)).resolves.toMatchObject({
			tournamentId: 'railway-rooms-cup',
		});
	});
});

