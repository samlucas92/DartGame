import type { MatchPlayer } from '../../engine/darts/types';
import type { LeaguePlayer } from '../../domain/league';

export const DEMO_OPPONENT: MatchPlayer = {
	id: 'ai-rowan-vale',
	name: 'Rowan Vale',
	attributes: {
		scoring: 49,
		finishing: 46,
		consistency: 51,
		composure: 48,
		stamina: 54,
	},
	form: 1,
	fatigue: 0,
};

export const LOCAL_LEAGUE_AI_PLAYERS: LeaguePlayer[] = [
	{
		...DEMO_OPPONENT,
		isHuman: false,
		style: 'all-rounder',
	},
	{
		id: 'ai-imani-cross',
		name: 'Imani Cross',
		attributes: { scoring: 51, finishing: 43, consistency: 48, composure: 52, stamina: 50 },
		form: 0,
		fatigue: 0,
		isHuman: false,
		style: 'scorer',
	},
	{
		id: 'ai-kit-mercer',
		name: 'Kit Mercer',
		attributes: { scoring: 45, finishing: 52, consistency: 46, composure: 49, stamina: 48 },
		form: 1,
		fatigue: 0,
		isHuman: false,
		style: 'finisher',
	},
	{
		id: 'ai-dev-shah',
		name: 'Dev Shah',
		attributes: { scoring: 47, finishing: 45, consistency: 53, composure: 46, stamina: 51 },
		form: -1,
		fatigue: 0,
		isHuman: false,
		style: 'all-rounder',
	},
	{
		id: 'ai-nia-hart',
		name: 'Nia Hart',
		attributes: { scoring: 44, finishing: 48, consistency: 47, composure: 55, stamina: 49 },
		form: 0,
		fatigue: 0,
		isHuman: false,
		style: 'clutch',
	},
];

