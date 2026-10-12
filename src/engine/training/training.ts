import type { CareerProfile, PlayerAttributes } from '../../domain/career';
import type { CoachingFocus } from '../../domain/coaching';

export const TRAINING_FOCUSES = [
	'scoring',
	'finishing',
	'consistency',
	'composure',
	'stamina',
] as const;

export type TrainingFocus = (typeof TRAINING_FOCUSES)[number];
export type TrainingAllocation = Record<TrainingFocus, number>;

export type TrainingPlan = {
	id: string;
	weekStart: string;
	availableHours: number;
	allocations: TrainingAllocation;
	totalHours: number;
	completed: boolean;
};

export type TrainingResult = {
	allocations: TrainingAllocation;
	totalHours: number;
	attributeChanges: TrainingAllocation;
	progressGained: TrainingAllocation;
	progressAfter: TrainingAllocation;
	attributesAfter: PlayerAttributes;
	fatigueAdded: number;
	finalRngState: number;
};

export function emptyTrainingAllocation(): TrainingAllocation {
	return {
		scoring: 0,
		finishing: 0,
		consistency: 0,
		composure: 0,
		stamina: 0,
	};
}

export function trainingHours(allocation: TrainingAllocation): number {
	return TRAINING_FOCUSES.reduce((total, focus) => total + allocation[focus], 0);
}

export function validateTrainingAllocation(
	allocation: TrainingAllocation,
	availableHours: number,
): void {
	for (const focus of TRAINING_FOCUSES) {
		const hours = allocation[focus];
		if (!Number.isInteger(hours) || hours < 0) {
			throw new Error('Training hours must be whole, positive hours.');
		}
	}
	if (trainingHours(allocation) > availableHours) {
		throw new Error(`Training plan exceeds the ${availableHours} hours available.`);
	}
}

export function createTrainingPlan(
	weekStart: string,
	availableHours: number,
	allocations: TrainingAllocation,
): TrainingPlan {
	validateTrainingAllocation(allocations, availableHours);
	return {
		id: `training-${weekStart}`,
		weekStart,
		availableHours,
		allocations: { ...allocations },
		totalHours: trainingHours(allocations),
		completed: false,
	};
}

function ageMultiplier(age: number): number {
	if (age <= 21) {
		return 1.12;
	}
	if (age <= 25) {
		return 1;
	}
	return 0.88;
}

export function resolveTraining(
	career: CareerProfile,
	plan: TrainingPlan,
	developmentBonus = 0,
	coachingFocus: CoachingFocus = 'balanced',
): TrainingResult {
	validateTrainingAllocation(plan.allocations, plan.availableHours);
	if (developmentBonus < 0 || developmentBonus > 1) {
		throw new Error('Training development bonus must be between zero and one.');
	}
	if (plan.weekStart !== career.inGameDate) {
		throw new Error('The training plan belongs to a different career week.');
	}

	let totalImprovement = 0;
	const changes = emptyTrainingAllocation();
	const progressGained = emptyTrainingAllocation();
	const progressAfter = { ...career.developmentProgress };
	const attributesAfter = { ...career.attributes };

	for (const focus of TRAINING_FOCUSES) {
		const currentAttribute = career.attributes[focus];
		const potentialRoom = Math.max(0, career.potential - currentAttribute);
		const potentialMultiplier = 0.75 + potentialRoom / 120;
		const focusedBonus = coachingFocus === 'balanced'
			? developmentBonus
			: coachingFocus === focus
				? developmentBonus * 1.5
				: developmentBonus * 0.5;
		const earnedProgress = Math.round(
			plan.allocations[focus]
			* 10
			* ageMultiplier(career.age)
			* potentialMultiplier
			* (1 + focusedBonus),
		);
		const accumulatedProgress = career.developmentProgress[focus] + earnedProgress;
		const availableImprovement = Math.floor(accumulatedProgress / 100);
		const focusImprovement = Math.min(availableImprovement, 2, 3 - totalImprovement);
		totalImprovement += focusImprovement;
		const cappedImprovement = Math.min(focusImprovement, Math.max(0, career.potential - currentAttribute));
		changes[focus] = cappedImprovement;
		progressGained[focus] = earnedProgress;
		progressAfter[focus] = currentAttribute >= career.potential
			? 0
			: accumulatedProgress - cappedImprovement * 100;
		attributesAfter[focus] = Math.min(100, currentAttribute + cappedImprovement);
	}

	return {
		allocations: { ...plan.allocations },
		totalHours: plan.totalHours,
		attributeChanges: changes,
		progressGained,
		progressAfter,
		attributesAfter,
		fatigueAdded: Math.ceil(plan.totalHours / 2),
		finalRngState: career.rngState,
	};
}

