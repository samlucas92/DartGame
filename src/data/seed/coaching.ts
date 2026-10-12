import type { CoachOption } from '../../domain/coaching';

export const COACH_OPTIONS: CoachOption[] = [
	{
		id: 'coach-online-mara-vale',
		name: 'Mara Vale',
		mode: 'online',
		description: 'Remote video review and a written weekly practice plan.',
		weeklyCostPence: 3_500,
		developmentBonus: 0.08,
		specialty: 'consistency',
		insight: 'Your grouping opens late in visits. Consistency work will make the scoring base less volatile.',
	},
	{
		id: 'coach-in-person-ellis-ward',
		name: 'Ellis Ward',
		mode: 'in-person',
		description: 'A weekly face-to-face session focused on mechanics and doubles.',
		weeklyCostPence: 8_000,
		developmentBonus: 0.16,
		specialty: 'finishing',
		insight: 'Your setup routes are sound, but the first dart at a double needs a calmer tempo.',
	},
	{
		id: 'coach-retainer-jules-mercer',
		name: 'Jules Mercer',
		mode: 'retainer',
		description: 'Ongoing planning, match review and priority support throughout the week.',
		weeklyCostPence: 15_000,
		developmentBonus: 0.25,
		specialty: 'composure',
		insight: 'We will review every match and adjust the plan around the moments where pressure changed your rhythm.',
	},
];

