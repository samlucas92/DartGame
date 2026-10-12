export type WorldLeague = {
	id: string;
	level: number;
	name: string;
	tier: string;
	scope: string;
	format: string;
	status: string;
	leaders: { name: string; country: string; points: number }[];
};

export const WORLD_LEAGUES: WorldLeague[] = [
	{
		id: 'world-elite',
		level: 6,
		name: 'World Elite',
		tier: 'Elite televised competition',
		scope: 'International',
		format: 'Top 16 · 95–110+ typical average',
		status: 'Distant target',
		leaders: [
			{ name: 'Marek Voss', country: 'NED', points: 11840 },
			{ name: 'Callum Price', country: 'WAL', points: 11220 },
			{ name: 'Jonas Keller', country: 'GER', points: 10975 },
		],
	},
	{
		id: 'professional-tour',
		level: 5,
		name: 'Professional Tour',
		tier: 'Professional',
		scope: 'International · 128 tour places',
		format: 'Tour events and majors · 85–100 average',
		status: 'Promotion target',
		leaders: [
			{ name: 'Ryan Clarke', country: 'ENG', points: 6420 },
			{ name: 'Euan Kerr', country: 'SCO', points: 6175 },
			{ name: 'Finn Mercer', country: 'ENG', points: 5990 },
		],
	},
	{
		id: 'qualifying',
		level: 4,
		name: 'Secondary & Qualifying Tours',
		tier: 'Qualifying circuit',
		scope: '300 players',
		format: 'Pro Qualifying Academy route · 75–95 average',
		status: 'Final tour gate',
		leaders: [],
	},
	{
		id: 'national-amateur',
		level: 3,
		name: 'National Amateur Circuits',
		tier: 'National amateur',
		scope: '500 players',
		format: 'National ranking events · 65–85 average',
		status: 'National target',
		leaders: [],
	},
	{
		id: 'regional-amateur',
		level: 2,
		name: 'Regional Amateur Circuits',
		tier: 'Regional amateur',
		scope: '400 simulated players',
		format: 'Weekend opens and county events · 50–70 average',
		status: 'Next career tier',
		leaders: [],
	},
	{
		id: 'lantern',
		level: 1,
		name: 'Local Pub Leagues',
		tier: 'Local amateur',
		scope: '600 simulated players · Northbridge district included',
		format: 'Club and pub leagues · 35–55 average',
		status: 'Your league',
		leaders: [],
	},
];

