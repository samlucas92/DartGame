export const COACHING_MODES = ['online', 'in-person', 'retainer'] as const;

export type CoachingMode = (typeof COACHING_MODES)[number];
export type CoachingFocus = 'balanced' | 'scoring' | 'finishing' | 'consistency' | 'composure' | 'stamina';

export type CoachOption = {
	id: string;
	name: string;
	mode: CoachingMode;
	description: string;
	weeklyCostPence: number;
	developmentBonus: number;
	specialty: Exclude<CoachingFocus, 'balanced'>;
	insight: string;
};

export type CoachingContract = CoachOption & {
	hiredAt: string;
	focus: CoachingFocus;
};

