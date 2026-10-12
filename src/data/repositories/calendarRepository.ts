import type { SQLiteDatabase } from 'expo-sqlite';

import type { CareerProfile } from '../../domain/career';
import type { CoachingContract } from '../../domain/coaching';
import type { LocalLeague } from '../../domain/league';
import type { LifestyleState } from '../../domain/lifestyle';
import type { SponsorshipContract } from '../../domain/sponsorship';
import { resolveWeek, type WeekSummary } from '../../engine/calendar/weeklyAdvance';
import type { TrainingPlan } from '../../engine/training/training';
import {
	currentHumanFixture,
	persistAiLeagueResults,
	prepareAiLeagueResults,
} from './leagueRepository';

const SAVE_GAME_ID = 'primary-career';

type WeekSummaryRow = {
	summary_json: string;
};

export type WeekAdvanceResult = {
	advanced: boolean;
	summary: WeekSummary;
};

function parseSummary(row: WeekSummaryRow): WeekSummary {
	return JSON.parse(row.summary_json) as WeekSummary;
}

export async function loadLatestWeekSummary(db: SQLiteDatabase): Promise<WeekSummary | null> {
	const row = await db.getFirstAsync<WeekSummaryRow>(`
		SELECT summary_json
		FROM week_advancements
		WHERE save_game_id = ?
		ORDER BY to_date DESC
		LIMIT 1
	`, SAVE_GAME_ID);
	return row ? parseSummary(row) : null;
}

export async function advanceCareerWeek(
	db: SQLiteDatabase,
	career: CareerProfile,
	trainingPlan: TrainingPlan,
	league: LocalLeague,
	coaching?: CoachingContract | null,
	lifestyle?: LifestyleState | null,
	sponsorship?: SponsorshipContract | null,
): Promise<WeekAdvanceResult> {
	const summary = resolveWeek(career, trainingPlan, coaching, lifestyle, sponsorship);
	if (!summary.training) {
		throw new Error('Save a training plan before advancing the week.');
	}
	const training = summary.training;
	const humanFixture = currentHumanFixture(league, career);
	if (!humanFixture || humanFixture.status !== 'complete') {
		throw new Error('Complete this week’s league fixture before advancing.');
	}
	const aiRound = prepareAiLeagueResults(league, career.inGameDate, summary.rngStateAfter);
	summary.rngStateAfter = aiRound.finalRngState;
	let advanced = false;

	await db.withTransactionAsync(async () => {
		const insertion = await db.runAsync(`
			INSERT OR IGNORE INTO week_advancements (
				id, save_game_id, from_date, to_date, summary_json, created_at
			) VALUES (?, ?, ?, ?, ?, ?)
		`,
		summary.id,
		SAVE_GAME_ID,
		summary.fromDate,
		summary.toDate,
		JSON.stringify(summary),
		new Date().toISOString(),
		);

		if (insertion.changes === 0) {
			return;
		}

		await persistAiLeagueResults(db, aiRound.results);

		const saveUpdate = await db.runAsync(`
			UPDATE save_games
			SET in_game_date = ?, bank_balance_pence = ?, rng_state = ?, weeks_elapsed = ?, updated_at = ?
			WHERE id = ? AND in_game_date = ?
		`,
		summary.toDate,
		summary.endingBalancePence,
		summary.rngStateAfter,
		summary.weeksElapsedAfter,
		new Date().toISOString(),
		SAVE_GAME_ID,
		summary.fromDate,
		);
		if (saveUpdate.changes !== 1) {
			throw new Error('The career changed while the week was advancing. Please retry.');
		}

		await db.runAsync(`
			UPDATE players
			SET age = ?, fatigue = ?, scoring = ?, finishing = ?, consistency = ?, composure = ?, stamina = ?,
				scoring_progress = ?, finishing_progress = ?, consistency_progress = ?,
				composure_progress = ?, stamina_progress = ?
			WHERE id = ? AND save_game_id = ?
		`,
		summary.ageAfter,
		summary.fatigueAfter,
		training.attributesAfter.scoring,
		training.attributesAfter.finishing,
		training.attributesAfter.consistency,
		training.attributesAfter.composure,
		training.attributesAfter.stamina,
		training.progressAfter.scoring,
		training.progressAfter.finishing,
		training.progressAfter.consistency,
		training.progressAfter.composure,
		training.progressAfter.stamina,
		career.playerId,
		SAVE_GAME_ID,
		);

		const trainingUpdate = await db.runAsync(`
			UPDATE training_plans
			SET completed_at = ?, updated_at = ?
			WHERE id = ? AND save_game_id = ? AND completed_at IS NULL
		`, new Date().toISOString(), new Date().toISOString(), trainingPlan.id, SAVE_GAME_ID);
		if (trainingUpdate.changes !== 1) {
			throw new Error('The training plan was already completed.');
		}

		await db.runAsync(`
			INSERT OR IGNORE INTO training_plans (
				id, save_game_id, week_start, available_hours, allocations_json,
				total_hours, completed_at, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
		`,
		`training-${summary.toDate}`,
		SAVE_GAME_ID,
		summary.toDate,
		Math.max(summary.practiceHours, trainingPlan.totalHours),
		JSON.stringify(trainingPlan.allocations),
		trainingPlan.totalHours,
		new Date().toISOString(),
		new Date().toISOString(),
		);

		if (summary.incomePence > 0) {
			await db.runAsync(`
				INSERT OR IGNORE INTO ledger_entries (
					id, save_game_id, type, amount_pence, description, in_game_date, reference_id
				) VALUES (?, ?, 'work-pay', ?, ?, ?, ?)
			`,
			`ledger-${summary.id}-income`,
			SAVE_GAME_ID,
			summary.incomePence,
			summary.incomeDescription,
			summary.toDate,
			`${summary.id}:income`,
			);
		}
		await db.runAsync(`
			INSERT OR IGNORE INTO ledger_entries (
				id, save_game_id, type, amount_pence, description, in_game_date, reference_id
			) VALUES (?, ?, 'living-cost', ?, 'Weekly living costs', ?, ?)
		`,
		`ledger-${summary.id}-living-cost`,
		SAVE_GAME_ID,
		-summary.livingCostPence,
		summary.toDate,
		`${summary.id}:living-cost`,
		);
		if (summary.coachingCostPence > 0 && summary.coachName) {
			await db.runAsync(`
				INSERT OR IGNORE INTO ledger_entries (
					id, save_game_id, type, amount_pence, description, in_game_date, reference_id
				) VALUES (?, ?, 'coaching', ?, ?, ?, ?)
			`,
			`ledger-${summary.id}-coaching`,
			SAVE_GAME_ID,
			-summary.coachingCostPence,
			`${summary.coachName} coaching`,
			summary.toDate,
			`${summary.id}:coaching`,
			);
		}
		if (summary.sponsorshipIncomePence > 0 && summary.sponsorName) {
			await db.runAsync(`
				INSERT OR IGNORE INTO ledger_entries (
					id, save_game_id, type, amount_pence, description, in_game_date, reference_id
				) VALUES (?, ?, 'sponsorship', ?, ?, ?, ?)
			`,
			`ledger-${summary.id}-sponsorship`,
			SAVE_GAME_ID,
			summary.sponsorshipIncomePence,
			`${summary.sponsorName} weekly sponsorship`,
			summary.toDate,
			`${summary.id}:sponsorship`,
			);
		}
		advanced = true;
	});

	if (advanced) {
		return { advanced: true, summary };
	}

	const existing = await db.getFirstAsync<WeekSummaryRow>(`
		SELECT summary_json
		FROM week_advancements
		WHERE id = ? AND save_game_id = ?
	`, summary.id, SAVE_GAME_ID);
	if (!existing) {
		throw new Error('The week could not be advanced or recovered.');
	}

	return { advanced: false, summary: parseSummary(existing) };
}

