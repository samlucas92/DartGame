import { ageOnDate, type CareerBackground, type CareerProfile, type WeeklyStrategy } from '../../domain/career';
import type { CoachingContract } from '../../domain/coaching';
import type { LifestyleState } from '../../domain/lifestyle';
import { lifestylePracticeBonus, lifestyleWeeklyCost, lifestyleWeeklyRecovery } from '../../domain/lifestyle';
import type { SponsorshipContract } from '../../domain/sponsorship';
import { resolveTraining, type TrainingPlan, type TrainingResult } from '../training/training';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type WeekEventKind = 'work' | 'training' | 'fixture' | 'expense';

export type WeekEvent = {
	id: string;
	date: string;
	dayLabel: string;
	kind: WeekEventKind;
	title: string;
	detail: string;
};

export type WeeklyCommitments = {
	workHours: number;
	practiceHours: number;
	incomePence: number;
	livingCostPence: number;
	fatigueDelta: number;
	incomeDescription: string;
};

export type WeekPlan = WeeklyCommitments & {
	id: string;
	fromDate: string;
	toDate: string;
	events: WeekEvent[];
};

export type WeekSummary = WeekPlan & {
	strategy: WeeklyStrategy;
	openingBalancePence: number;
	endingBalancePence: number;
	netChangePence: number;
	fatigueBefore: number;
	fatigueAfter: number;
	rngStateAfter: number;
	coachingCostPence: number;
	coachName: string | null;
	sponsorshipIncomePence: number;
	sponsorName: string | null;
	ageBefore: number;
	ageAfter: number;
	weeksElapsedAfter: number;
	training?: TrainingResult;
};

export const WEEKLY_STRATEGY_DETAILS: Record<WeeklyStrategy, {
	label: string;
	description: string;
}> = {
	balanced: {
		label: 'Balanced week',
		description: 'Keep the usual work, practice and recovery rhythm.',
	},
	overtime: {
		label: 'Take overtime',
		description: 'Earn more at the cost of practice time and energy.',
	},
	'all-in': {
		label: 'Back your darts',
		description: 'Cut paid work for a serious practice block and accept lower income.',
	},
	recovery: {
		label: 'Recovery week',
		description: 'Reduce work and practice to bring fatigue down.',
	},
};

const WEEKLY_COMMITMENTS: Record<CareerBackground, WeeklyCommitments> = {
	'working-amateur': {
		workHours: 32,
		practiceHours: 8,
		incomePence: 61_300,
		livingCostPence: 38_000,
		fatigueDelta: 8,
		incomeDescription: 'Weekly wages',
	},
	'supported-prospect': {
		workHours: 12,
		practiceHours: 14,
		incomePence: 38_000,
		livingCostPence: 38_000,
		fatigueDelta: 3,
		incomeDescription: 'Family support',
	},
	'independent-amateur': {
		workHours: 20,
		practiceHours: 11,
		incomePence: 44_000,
		livingCostPence: 38_000,
		fatigueDelta: 5,
		incomeDescription: 'Freelance work',
	},
};

function parseIsoDate(value: string): Date {
	if (!ISO_DATE_PATTERN.test(value)) {
		throw new Error(`Invalid in-game date: ${value}`);
	}
	const date = new Date(`${value}T00:00:00.000Z`);
	if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
		throw new Error(`Invalid in-game date: ${value}`);
	}
	return date;
}

export function addInGameDays(value: string, days: number): string {
	const date = parseIsoDate(value);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

export function dayLabel(value: string): string {
	return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseIsoDate(value).getUTCDay()] ?? '';
}

export function weeklyCommitments(
	background: CareerBackground,
	lifestyle?: LifestyleState | null,
	strategy: WeeklyStrategy = 'balanced',
): WeeklyCommitments {
	const commitments = { ...WEEKLY_COMMITMENTS[background] };
	if (lifestyle) {
		commitments.practiceHours += lifestylePracticeBonus(lifestyle);
		commitments.livingCostPence = 11_000 + lifestyleWeeklyCost(lifestyle);
		commitments.fatigueDelta -= lifestyleWeeklyRecovery(lifestyle);
	}
	if (strategy === 'overtime') {
		commitments.workHours += 10;
		commitments.practiceHours = Math.max(2, commitments.practiceHours - 3);
		commitments.incomePence += 18_000;
		commitments.fatigueDelta += 5;
	} else if (strategy === 'all-in') {
		commitments.workHours = Math.max(0, commitments.workHours - 16);
		commitments.practiceHours += 7;
		commitments.incomePence = Math.max(0, commitments.incomePence - 30_000);
		commitments.fatigueDelta += 2;
	} else if (strategy === 'recovery') {
		commitments.workHours = Math.max(0, commitments.workHours - 8);
		commitments.practiceHours = Math.max(0, commitments.practiceHours - 4);
		commitments.incomePence = Math.max(0, commitments.incomePence - 15_000);
		commitments.fatigueDelta = -12;
	}
	return commitments;
}

export function createWeekPlan(
	fromDate: string,
	background: CareerBackground,
	lifestyle?: LifestyleState | null,
	weeksElapsed = 0,
	strategy: WeeklyStrategy = 'balanced',
): WeekPlan {
	const commitments = weeklyCommitments(background, lifestyle, strategy);
	const isPayWeek = weeksElapsed % 4 === 0;
	const payWeeksAway = 4 - (weeksElapsed % 4);
	commitments.incomePence = isPayWeek ? commitments.incomePence * 4 : 0;
	commitments.incomeDescription = isPayWeek
		? 'Monthly payday'
		: `Work shift · payday in ${payWeeksAway} week${payWeeksAway === 1 ? '' : 's'}`;
	const workDate = addInGameDays(fromDate, 1);
	const trainingDate = addInGameDays(fromDate, 2);
	const fixtureDate = addInGameDays(fromDate, 4);
	const expenseDate = addInGameDays(fromDate, 6);

	return {
		id: `week-${fromDate}`,
		fromDate,
		toDate: addInGameDays(fromDate, 7),
		...commitments,
		events: [
			{
				id: `work-${workDate}`,
				date: workDate,
				dayLabel: dayLabel(workDate),
				kind: 'work',
				title: commitments.incomeDescription,
				detail: `${commitments.workHours} hours committed`,
			},
			{
				id: `training-${trainingDate}`,
				date: trainingDate,
				dayLabel: dayLabel(trainingDate),
				kind: 'training',
				title: 'Practice capacity',
				detail: `${commitments.practiceHours} hours available`,
			},
			{
				id: `fixture-${fixtureDate}`,
				date: fixtureDate,
				dayLabel: dayLabel(fixtureDate),
				kind: 'fixture',
				title: 'The Lantern League',
				detail: 'Rowan Vale · Best of 5',
			},
			{
				id: `expense-${expenseDate}`,
				date: expenseDate,
				dayLabel: dayLabel(expenseDate),
				kind: 'expense',
				title: 'Weekly living costs',
				detail: 'Housing, food and local travel',
			},
		],
	};
}

export function resolveWeek(
	career: CareerProfile,
	trainingPlan?: TrainingPlan,
	coaching?: CoachingContract | null,
	lifestyle?: LifestyleState | null,
	sponsorship?: SponsorshipContract | null,
): WeekSummary {
	const plan = createWeekPlan(
		career.inGameDate,
		career.background,
		lifestyle,
		career.weeksElapsed,
		career.weeklyStrategy,
	);
	const coachingCostPence = coaching?.weeklyCostPence ?? 0;
	const sponsorshipIncomePence = sponsorship?.weeklyPaymentPence ?? 0;
	const netChangePence = plan.incomePence + sponsorshipIncomePence
		- plan.livingCostPence - coachingCostPence;
	const training = trainingPlan
		? resolveTraining(
			career,
			trainingPlan,
			coaching?.developmentBonus ?? 0,
			coaching?.focus ?? 'balanced',
		)
		: undefined;
	const trainingFatigue = training?.fatigueAdded ?? 0;
	const weeksElapsedAfter = career.weeksElapsed + 1;
	const ageAfter = ageOnDate(career.dateOfBirth, plan.toDate);

	return {
		...plan,
		strategy: career.weeklyStrategy,
		openingBalancePence: career.bankBalancePence,
		endingBalancePence: career.bankBalancePence + netChangePence,
		netChangePence,
		fatigueBefore: career.fatigue,
		fatigueAfter: Math.min(100, Math.max(0, career.fatigue + plan.fatigueDelta + trainingFatigue)),
		rngStateAfter: training?.finalRngState ?? career.rngState,
		coachingCostPence,
		coachName: coaching?.name ?? null,
		sponsorshipIncomePence,
		sponsorName: sponsorship?.name ?? null,
		ageBefore: career.age,
		ageAfter,
		weeksElapsedAfter,
		training,
	};
}

