import type { LifestyleItem } from '../../domain/lifestyle';

export const DEFAULT_LIFESTYLE_IDS = {
	home: 'home-shared-flat',
	transport: 'transport-bus',
	practice: 'practice-club-board',
} as const;

export const LIFESTYLE_CATALOGUE: LifestyleItem[] = [
	{
		id: 'home-shared-flat', category: 'home', name: 'Shared Flat',
		description: 'A practical room in a shared flat. Rent, utilities and a share of council tax are included.',
		purchasePricePence: 0, weeklyCostPence: 22_000, practiceHoursBonus: 0,
		weeklyRecoveryBonus: 0, instantRecovery: 0,
		effects: ['Low starting rent', 'Home practice must stay limited'], imageKey: 'home',
	},
	{
		id: 'home-studio', category: 'home', name: 'Town Studio',
		description: 'More privacy and enough space for quiet daytime practice, with a meaningful jump in bills.',
		purchasePricePence: 95_000, weeklyCostPence: 32_000, practiceHoursBonus: 1,
		weeklyRecoveryBonus: 2, instantRecovery: 0,
		effects: ['+1 practice hour each week', '−2 weekly fatigue'], imageKey: 'home',
	},
	{
		id: 'home-one-bed', category: 'home', name: 'One-Bed Flat',
		description: 'A comfortable place of your own near the local circuit, with room for a permanent practice area.',
		purchasePricePence: 145_000, weeklyCostPence: 36_500, practiceHoursBonus: 2,
		weeklyRecoveryBonus: 4, instantRecovery: 0,
		effects: ['+2 practice hours each week', '−4 weekly fatigue'], imageKey: 'home',
	},
	{
		id: 'transport-bus', category: 'transport', name: 'Bus & Rail Pass',
		description: 'Reliable local travel without repair or fuel surprises.',
		purchasePricePence: 0, weeklyCostPence: 3_200, practiceHoursBonus: 0,
		weeklyRecoveryBonus: 0, instantRecovery: 0,
		effects: ['Covers local league travel', 'No ownership costs'], imageKey: 'transport',
	},
	{
		id: 'transport-bike', category: 'transport', name: 'Reliable Commuter Bike',
		description: 'Cuts waiting time on local practice nights and keeps weekly running costs low.',
		purchasePricePence: 28_000, weeklyCostPence: 600, practiceHoursBonus: 0,
		weeklyRecoveryBonus: 1, instantRecovery: 0,
		effects: ['−1 weekly fatigue', 'Very low upkeep'], imageKey: 'transport',
	},
	{
		id: 'transport-hatchback', category: 'transport', name: 'Used Hatchback',
		description: 'Makes away events simpler. Weekly costs include fuel, insurance, tax and maintenance.',
		purchasePricePence: 320_000, weeklyCostPence: 7_000, practiceHoursBonus: 0,
		weeklyRecoveryBonus: 3, instantRecovery: 0,
		effects: ['−3 weekly fatigue from easier travel', 'Ready for distant events'], imageKey: 'transport',
	},
	{
		id: 'practice-club-board', category: 'practice', name: 'Local Club Board',
		description: 'Shared club practice sessions with a modest weekly board fee.',
		purchasePricePence: 0, weeklyCostPence: 1_800, practiceHoursBonus: 0,
		weeklyRecoveryBonus: 0, instantRecovery: 0,
		effects: ['Social practice environment', 'Limited opening hours'], imageKey: 'darts',
	},
	{
		id: 'practice-home-board', category: 'practice', name: 'Home Practice Board',
		description: 'A regulation sisal board, surround and fixing kit for focused solo practice.',
		purchasePricePence: 12_000, weeklyCostPence: 0, practiceHoursBonus: 2,
		weeklyRecoveryBonus: 0, instantRecovery: 0,
		effects: ['+2 practice hours each week', 'No weekly fee'], imageKey: 'darts',
	},
	{
		id: 'practice-lit-oche', category: 'practice', name: 'Lit Home Oche',
		description: 'Board, full-ring lighting, mat and a regulation throw line for repeatable sessions.',
		purchasePricePence: 45_000, weeklyCostPence: 0, practiceHoursBonus: 4,
		weeklyRecoveryBonus: 0, instantRecovery: 0,
		effects: ['+4 practice hours each week', 'Regulation home setup'], imageKey: 'darts',
	},
	{
		id: 'practice-video-lane', category: 'practice', name: 'Video Analysis Lane',
		description: 'A permanent oche with overhead camera and tablet mount for reviewing mechanics.',
		purchasePricePence: 82_000, weeklyCostPence: 500, practiceHoursBonus: 6,
		weeklyRecoveryBonus: 0, instantRecovery: 0,
		effects: ['+6 practice hours each week', '£5 weekly software cost'], imageKey: 'darts',
	},
	{
		id: 'experience-finals-night', category: 'experience', name: 'Regional Finals Night',
		description: 'Take an evening away from the board and watch the region’s best players under stage lights.',
		purchasePricePence: 6_500, weeklyCostPence: 0, practiceHoursBonus: 0,
		weeklyRecoveryBonus: 0, instantRecovery: 5,
		effects: ['Instantly removes 5 fatigue', 'One-off career memory'], imageKey: 'experience',
	},
	{
		id: 'experience-weekend-break', category: 'experience', name: 'Quiet Weekend Away',
		description: 'A proper two-day reset between league rounds, with the darts left at home.',
		purchasePricePence: 22_000, weeklyCostPence: 0, practiceHoursBonus: 0,
		weeklyRecoveryBonus: 0, instantRecovery: 18,
		effects: ['Instantly removes 18 fatigue', 'One-off recovery experience'], imageKey: 'experience',
	},
	{
		id: 'experience-stage-session', category: 'experience', name: 'Stage Practice Session',
		description: 'Hire a small theatre setup and practise with lights, walk-on music and a caller.',
		purchasePricePence: 12_500, weeklyCostPence: 0, practiceHoursBonus: 0,
		weeklyRecoveryBonus: 0, instantRecovery: 7,
		effects: ['Instantly removes 7 fatigue', 'One-off stage experience'], imageKey: 'experience',
	},
];

