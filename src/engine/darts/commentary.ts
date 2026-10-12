import { findCheckoutRoute } from './checkout';
import type { MatchPlayer, Visit } from './types';

export type MatchCommentaryEntry = {
	key: string;
	playerId: string;
	text: string;
	checkout: boolean;
};

export type CommentaryVisitGroup = {
	legNumber: number;
	visits: readonly Visit[];
	completesMatch: boolean;
};

function ordinal(value: number): string {
	const remainder = value % 100;
	if (remainder >= 11 && remainder <= 13) {
		return `${value}th`;
	}
	return `${value}${value % 10 === 1 ? 'st' : value % 10 === 2 ? 'nd' : value % 10 === 3 ? 'rd' : 'th'}`;
}

export function buildMatchCommentary(
	visitGroups: readonly CommentaryVisitGroup[],
	players: readonly [MatchPlayer, MatchPlayer],
	humanPlayerId: string,
): MatchCommentaryEntry[] {
	const playerById = Object.fromEntries(players.map((player) => [player.id, player]));
	const entries: MatchCommentaryEntry[] = [];

	visitGroups.forEach((group, groupIndex) => {
		const scores: Record<string, number> = {
			[players[0].id]: 501,
			[players[1].id]: 501,
		};

		group.visits.forEach((visit, visitIndex) => {
			scores[visit.playerId] = visit.endScore;
			const player = playerById[visit.playerId];
			const isHuman = visit.playerId === humanPlayerId;
			const hits = visit.darts.map((dart) => dart.hit.label).join(' · ');
			const subject = isHuman ? 'You' : player?.name ?? visit.playerId;
			let action: string;

			if (visit.checkout) {
				action = group.completesMatch
					? `Game shot and the match, ${player?.name ?? visit.playerId}. ${visit.score} checkout with ${hits}.`
					: `Game shot and the ${ordinal(group.legNumber)} leg, ${player?.name ?? visit.playerId}. ${visit.score} checkout with ${hits}.`;
			} else if (visit.bust) {
				action = `${subject} ${isHuman ? 'bust' : 'busts'} with ${hits}.`;
			} else {
				action = `${subject} ${isHuman ? 'score' : 'scores'} ${visit.score} with ${hits}.`;
			}

			const scoreCall = players
				.map((candidate) => `${candidate.name}: ${scores[candidate.id] ?? 501} remaining`)
				.join(' · ');
			const route = visit.checkout ? undefined : findCheckoutRoute(visit.endScore, 3);
			const finishCall = route
				? ` ${subject} ${isHuman ? 'require' : 'requires'} ${visit.endScore}: ${route.map((target) => target.label).join(', ')}.`
				: '';

			entries.push({
				key: `${groupIndex}-${visitIndex}-${visit.playerId}`,
				playerId: visit.playerId,
				text: `${action} ${scoreCall}.${finishCall}`,
				checkout: visit.checkout,
			});
		});
	});

	return entries;
}

