export const LIFESTYLE_CATEGORIES = ['home', 'transport', 'practice', 'experience'] as const;

export type LifestyleCategory = (typeof LIFESTYLE_CATEGORIES)[number];

export type LifestyleItem = {
	id: string;
	category: LifestyleCategory;
	name: string;
	description: string;
	purchasePricePence: number;
	weeklyCostPence: number;
	practiceHoursBonus: number;
	weeklyRecoveryBonus: number;
	instantRecovery: number;
	effects: string[];
	imageKey: 'home' | 'darts' | 'transport' | 'experience';
};

export type LifestyleState = {
	home: LifestyleItem;
	transport: LifestyleItem;
	practice: LifestyleItem;
	ownedItemIds: string[];
};

export function lifestyleWeeklyCost(state: LifestyleState): number {
	return state.home.weeklyCostPence
		+ state.transport.weeklyCostPence
		+ state.practice.weeklyCostPence;
}

export function lifestylePracticeBonus(state: LifestyleState): number {
	return state.home.practiceHoursBonus + state.practice.practiceHoursBonus;
}

export function lifestyleWeeklyRecovery(state: LifestyleState): number {
	return state.home.weeklyRecoveryBonus + state.transport.weeklyRecoveryBonus;
}

