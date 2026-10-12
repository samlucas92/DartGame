import type { SQLiteDatabase } from 'expo-sqlite';
import { describe, expect, it } from 'vitest';

import { advanceCareerWeek } from '../data/repositories/calendarRepository';
import { createEmptyCareerForTests } from '../data/repositories/careerRepository';
import { resolveWeek } from '../engine/calendar/weeklyAdvance';
import { createTrainingPlan, emptyTrainingAllocation } from '../engine/training/training';
import type { CoachingContract } from '../domain/coaching';
import type { LocalLeague } from '../domain/league';

const career = createEmptyCareerForTests({
	name: 'Alex North',
	age: 21,
	location: 'Northbridge',
	style: 'all-rounder',
	background: 'working-amateur',
});
const trainingPlan = createTrainingPlan(career.inGameDate, 8, {
	...emptyTrainingAllocation(),
	scoring: 4,
	finishing: 4,
});
const league: LocalLeague = {
	id: 'lantern-league',
	name: 'The Lantern League',
	season: 1,
	players: [],
	fixtures: [{
		id: 'fixture-1',
		season: 1,
		round: 1,
		sequence: 1,
		weekStart: career.inGameDate,
		date: '2026-01-09',
		homePlayerId: career.playerId,
		awayPlayerId: 'ai-rowan-vale',
		bestOf: 5,
		status: 'complete',
		winnerId: career.playerId,
		homeLegs: 3,
		awayLegs: 1,
		matchId: 'fixture-1',
	}],
	standings: [],
};
const coaching: CoachingContract = {
	id: 'coach-online-mara-vale',
	name: 'Mara Vale',
	mode: 'online',
	description: 'Remote coaching',
	weeklyCostPence: 3_500,
	developmentBonus: 0.08,
	specialty: 'consistency',
	insight: 'Test insight',
	hiredAt: '2026-01-05T00:00:00.000Z',
	focus: 'balanced',
};

function weekDatabase(
	weekInsertChanges: number,
	saveUpdateChanges = 1,
): { db: SQLiteDatabase; statements: string[] } {
	const statements: string[] = [];
	const summary = resolveWeek(career, trainingPlan);
	const db = {
		runAsync: async (sql: string) => {
			statements.push(sql);
			if (sql.includes('INSERT OR IGNORE INTO week_advancements')) {
				return { changes: weekInsertChanges, lastInsertRowId: 1 };
			}
			if (sql.includes('UPDATE save_games')) {
				return { changes: saveUpdateChanges, lastInsertRowId: 1 };
			}
			return { changes: 1, lastInsertRowId: 1 };
		},
		getFirstAsync: async () => ({ summary_json: JSON.stringify(summary) }),
		withTransactionAsync: async (task: () => Promise<void>) => task(),
	} as unknown as SQLiteDatabase;

	return { db, statements };
}

describe('calendar persistence', () => {
	it('commits date, fatigue and the two ledger actions together', async () => {
		const { db, statements } = weekDatabase(1);
		const result = await advanceCareerWeek(db, career, trainingPlan, league);

		expect(result.advanced).toBe(true);
		expect(statements.filter((sql) => sql.includes('UPDATE save_games'))).toHaveLength(1);
		expect(statements.filter((sql) => sql.includes('UPDATE players'))).toHaveLength(1);
		expect(statements.filter((sql) => sql.includes('UPDATE training_plans'))).toHaveLength(1);
		expect(statements.filter((sql) => sql.includes('INSERT OR IGNORE INTO training_plans'))).toHaveLength(1);
		expect(statements.filter((sql) => sql.includes('INSERT OR IGNORE INTO ledger_entries'))).toHaveLength(2);
	});

	it('charges active coaching once inside the weekly transaction', async () => {
		const { db, statements } = weekDatabase(1);
		const result = await advanceCareerWeek(db, career, trainingPlan, league, coaching);

		expect(result.summary.coachingCostPence).toBe(3_500);
		expect(result.summary.netChangePence).toBe(203_700);
		expect(statements.filter((sql) => sql.includes("'coaching'"))).toHaveLength(1);
	});

	it('recovers an existing summary without paying the same week twice', async () => {
		const { db, statements } = weekDatabase(0);
		const result = await advanceCareerWeek(db, career, trainingPlan, league);

		expect(result.advanced).toBe(false);
		expect(statements.some((sql) => sql.includes('UPDATE save_games'))).toBe(false);
		expect(statements.some((sql) => sql.includes('INSERT OR IGNORE INTO ledger_entries'))).toBe(false);
	});

	it('rejects a stale calendar write', async () => {
		const { db } = weekDatabase(1, 0);

		await expect(advanceCareerWeek(db, career, trainingPlan, league)).rejects.toThrow(/career changed/i);
	});
});

