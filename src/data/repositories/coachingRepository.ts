import type { SQLiteDatabase } from 'expo-sqlite';

import type {
	CoachOption,
	CoachingContract,
	CoachingFocus,
	CoachingMode,
} from '../../domain/coaching';
import { COACH_OPTIONS } from '../seed/coaching';

const SAVE_GAME_ID = 'primary-career';

type CoachingRow = {
	coach_id: string;
	mode: CoachingMode;
	weekly_cost_pence: number;
	development_bonus_bps: number;
	hired_at: string;
	focus: CoachingFocus;
};

export async function loadCoachingContract(
	db: SQLiteDatabase,
): Promise<CoachingContract | null> {
	const row = await db.getFirstAsync<CoachingRow>(`
		SELECT coach_id, mode, weekly_cost_pence, development_bonus_bps, hired_at, focus
		FROM coaching_contracts
		WHERE save_game_id = ?
	`, SAVE_GAME_ID);
	if (!row) {
		return null;
	}
	const definition = COACH_OPTIONS.find((coach) => coach.id === row.coach_id);
	return {
		id: row.coach_id,
		name: definition?.name ?? row.coach_id,
		mode: row.mode,
		description: definition?.description ?? 'Career coaching support.',
		weeklyCostPence: row.weekly_cost_pence,
		developmentBonus: row.development_bonus_bps / 10_000,
		specialty: definition?.specialty ?? 'consistency',
		insight: definition?.insight ?? 'Keep the plan simple and review the numbers after each match.',
		hiredAt: row.hired_at,
		focus: row.focus,
	};
}

export async function hireCoach(
	db: SQLiteDatabase,
	coach: CoachOption,
	availableBalancePence: number,
): Promise<CoachingContract> {
	if (availableBalancePence < coach.weeklyCostPence) {
		throw new Error('Your current balance does not cover this coach’s next weekly fee.');
	}
	const hiredAt = new Date().toISOString();
	await db.runAsync(`
		INSERT INTO coaching_contracts (
			save_game_id, coach_id, mode, weekly_cost_pence, development_bonus_bps, hired_at, focus
		) VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(save_game_id) DO UPDATE SET
			coach_id = excluded.coach_id,
			mode = excluded.mode,
			weekly_cost_pence = excluded.weekly_cost_pence,
			development_bonus_bps = excluded.development_bonus_bps,
			hired_at = excluded.hired_at,
			focus = excluded.focus
	`,
	SAVE_GAME_ID,
	coach.id,
	coach.mode,
	coach.weeklyCostPence,
	Math.round(coach.developmentBonus * 10_000),
	hiredAt,
	coach.specialty,
	);
	return { ...coach, hiredAt, focus: coach.specialty };
}

export async function setCoachFocus(
	db: SQLiteDatabase,
	focus: CoachingFocus,
): Promise<void> {
	const result = await db.runAsync(`
		UPDATE coaching_contracts SET focus = ? WHERE save_game_id = ?
	`, focus, SAVE_GAME_ID);
	if (result.changes !== 1) {
		throw new Error('Hire a coach before setting a coaching focus.');
	}
}

export async function cancelCoach(db: SQLiteDatabase): Promise<void> {
	await db.runAsync('DELETE FROM coaching_contracts WHERE save_game_id = ?', SAVE_GAME_ID);
}

