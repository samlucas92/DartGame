import type { SQLiteDatabase } from 'expo-sqlite';

import type { CareerProfile } from '../../domain/career';
import type { LifestyleState } from '../../domain/lifestyle';
import { weeklyCommitments } from '../../engine/calendar/weeklyAdvance';
import {
	createTrainingPlan,
	type TrainingAllocation,
	type TrainingPlan,
} from '../../engine/training/training';

const SAVE_GAME_ID = 'primary-career';

type TrainingPlanRow = {
	id: string;
	week_start: string;
	available_hours: number;
	allocations_json: string;
	total_hours: number;
	completed_at: string | null;
};

function mapTrainingPlan(row: TrainingPlanRow): TrainingPlan {
	return {
		id: row.id,
		weekStart: row.week_start,
		availableHours: row.available_hours,
		allocations: JSON.parse(row.allocations_json) as TrainingAllocation,
		totalHours: row.total_hours,
		completed: row.completed_at !== null,
	};
}

export async function loadTrainingPlan(
	db: SQLiteDatabase,
	weekStart: string,
): Promise<TrainingPlan | null> {
	const row = await db.getFirstAsync<TrainingPlanRow>(`
		SELECT id, week_start, available_hours, allocations_json, total_hours, completed_at
		FROM training_plans
		WHERE save_game_id = ? AND week_start = ?
	`, SAVE_GAME_ID, weekStart);
	return row ? mapTrainingPlan(row) : null;
}

export async function saveTrainingPlan(
	db: SQLiteDatabase,
	career: CareerProfile,
	allocations: TrainingAllocation,
	lifestyle?: LifestyleState | null,
): Promise<TrainingPlan> {
	const availableHours = weeklyCommitments(
		career.background,
		lifestyle,
		career.weeklyStrategy,
	).practiceHours;
	const plan = createTrainingPlan(career.inGameDate, availableHours, allocations);
	const timestamp = new Date().toISOString();
	const result = await db.runAsync(`
		INSERT INTO training_plans (
			id, save_game_id, week_start, available_hours, allocations_json,
			total_hours, completed_at, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
		ON CONFLICT(save_game_id, week_start) DO UPDATE SET
			available_hours = excluded.available_hours,
			allocations_json = excluded.allocations_json,
			total_hours = excluded.total_hours,
			updated_at = excluded.updated_at
		WHERE training_plans.completed_at IS NULL
	`,
	plan.id,
	SAVE_GAME_ID,
	plan.weekStart,
	plan.availableHours,
	JSON.stringify(plan.allocations),
	plan.totalHours,
	timestamp,
	timestamp,
	);

	if (result.changes !== 1) {
		throw new Error('This training week is already complete and cannot be edited.');
	}
	return plan;
}

