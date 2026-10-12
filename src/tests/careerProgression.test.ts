import { describe, expect, it } from 'vitest';

import { createEmptyCareerForTests } from '../data/repositories/careerRepository';
import { WORLD_PLAYERS } from '../data/seed/worldPlayers';
import { TOURNAMENT_CALENDAR } from '../data/seed/tournaments';
import { careerPathway } from '../domain/career';
import { blockingCareerMessages, type CareerMessage } from '../domain/inbox';
import {
	tournamentEdition,
	tournamentEntryEligible,
	tournamentForMessage,
	tournamentRegistrationStatus,
} from '../domain/tournaments';
import { buildWorldRanking, COMPETITION_LEVELS, WORLD_PLAYER_COUNT } from '../domain/world';
import { weeklyCommitments } from '../engine/calendar/weeklyAdvance';
import { createTrainingPlan, emptyTrainingAllocation, resolveTraining } from '../engine/training/training';

describe('career progression and decisions', () => {
	it('blocks progression for unread priority mail and unanswered decisions', () => {
		const message = (
			id: string,
			isRead: boolean,
			requiresAcknowledgement: boolean,
			requiresResponse = false,
			response?: 'accepted' | 'declined',
		): CareerMessage => ({
			id,
			kind: 'tournament',
			sender: 'Events Office',
			subject: id,
			preview: 'Registration update',
			body: 'Review the event.',
			receivedDate: '2026-01-05',
			isRead,
			requiresAcknowledgement,
			requiresResponse,
			response,
		});
		const messages = [
			message('ordinary-unread', false, false),
			message('priority-read', true, true),
			message('priority-unread', false, true),
			message('decision-read-unanswered', true, false, true),
			message('decision-declined', true, false, true, 'declined'),
		];

		expect(blockingCareerMessages(messages).map((item) => item.id)).toEqual([
			'priority-unread',
			'decision-read-unanswered',
		]);
	});

	it('keeps amateur results outside the professional ranking', () => {
		const career = createEmptyCareerForTests({
			name: 'Alex North',
			age: 21,
			location: 'Northbridge',
			style: 'all-rounder',
			background: 'working-amateur',
		});

		expect(career.careerPoints).toBe(0);
		expect(careerPathway(career)).toMatchObject({
			label: 'Amateur pathway · no ranking points',
		});
	});

	it('makes weekly career strategies trade money, practice and fatigue', () => {
		const balanced = weeklyCommitments('working-amateur', null, 'balanced');
		const overtime = weeklyCommitments('working-amateur', null, 'overtime');
		const allIn = weeklyCommitments('working-amateur', null, 'all-in');
		const recovery = weeklyCommitments('working-amateur', null, 'recovery');

		expect(overtime.incomePence).toBeGreaterThan(balanced.incomePence);
		expect(overtime.practiceHours).toBeLessThan(balanced.practiceHours);
		expect(allIn.practiceHours).toBeGreaterThan(balanced.practiceHours);
		expect(allIn.incomePence).toBeLessThan(balanced.incomePence);
		expect(recovery.fatigueDelta).toBeLessThan(0);
	});

	it('uses a chosen coaching focus rather than applying a flat bonus', () => {
		const career = createEmptyCareerForTests({
			name: 'Alex North',
			age: 21,
			location: 'Northbridge',
			style: 'all-rounder',
			background: 'working-amateur',
		});
		const plan = createTrainingPlan(career.inGameDate, 8, {
			...emptyTrainingAllocation(),
			scoring: 4,
			finishing: 4,
		});
		const result = resolveTraining(career, plan, 0.2, 'scoring');

		expect(result.progressGained.scoring).toBeGreaterThan(result.progressGained.finishing);
	});

	it('moves players between professional and amateur circuits at ranking cuts', () => {
		const opening = buildWorldRanking(WORLD_PLAYERS, 0);
		const later = buildWorldRanking(WORLD_PLAYERS, 13);

		expect(opening).toHaveLength(WORLD_PLAYER_COUNT);
		expect(WORLD_PLAYER_COUNT).toBe(1_928);
		for (const level of COMPETITION_LEVELS) {
			const players = opening.filter((player) => player.tier === level.tier);
			expect(players).toHaveLength(level.playerCount);
			expect(players.every((player) => (
				player.typicalAverage >= level.averageRange[0]
				&& player.typicalAverage <= level.averageRange[1]
			))).toBe(true);
		}
		expect(later.some((player) => player.movement === 'promoted')).toBe(true);
		expect(later.some((player) => player.movement === 'relegated')).toBe(true);
		expect(later.map((player) => player.rank)).toEqual(Array.from({ length: WORLD_PLAYER_COUNT }, (_, index) => index + 1));
	});

	it('offers several local tournaments with real registration windows', () => {
		const localEvents = TOURNAMENT_CALENDAR.filter((tournament) => tournament.minimumTier === 'Local amateur');
		const lantern = TOURNAMENT_CALENDAR.find((tournament) => tournament.id === 'lantern-league-singles');
		const railway = TOURNAMENT_CALENDAR.find((tournament) => tournament.id === 'railway-rooms-cup');

		expect(localEvents.length).toBeGreaterThanOrEqual(4);
		expect(lantern && tournamentRegistrationStatus(0, lantern)).toBe('open');
		expect(railway && tournamentRegistrationStatus(0, railway)).toBe('upcoming');
		expect(tournamentEdition(6, 5)).toBe(2);
	});

	it('treats an open tournament average as guidance rather than qualification', () => {
		const openRegional = TOURNAMENT_CALENDAR.find((tournament) => tournament.id === 'northern-classic');
		const qualifiedMajor = TOURNAMENT_CALENDAR.find((tournament) => tournament.id === 'foundry-masters');

		expect(openRegional?.recommendedAverage).toBeGreaterThan(50);
		expect(openRegional && tournamentEntryEligible('Local amateur', openRegional)).toBe(true);
		expect(qualifiedMajor && tournamentEntryEligible('Local amateur', qualifiedMajor)).toBe(false);
	});

	it('includes the fictional professional tournament circuit', () => {
		const names = TOURNAMENT_CALENDAR.map((tournament) => tournament.name);
		expect(names).toEqual(expect.arrayContaining([
			'World Arrow Championship',
			'Grand Premier League',
			'World Matchplay Masters',
			'Grand Prix of Arrows',
			'National Open Championship',
			'World Arrow Series',
			'Pro Circuit Events',
			'European Arrow Tour',
			'Pro Qualifying Academy',
		]));
	});

	it('resolves legacy calendar-linked registration mail to its tournament', () => {
		const tournament = tournamentForMessage(
			TOURNAMENT_CALENDAR,
			'/calendar',
			'National Amateur Finals entries open',
		);

		expect(tournament?.id).toBe('national-amateur-finals');
	});
});

