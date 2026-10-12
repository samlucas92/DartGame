import type { SQLiteDatabase } from 'expo-sqlite';

import type { CareerProfile } from '../../domain/career';
import type { CoachingContract } from '../../domain/coaching';
import type { CareerMessage, CareerMessageKind, CareerMessageResponse } from '../../domain/inbox';
import type { LocalLeague, LocalLeagueMovement } from '../../domain/league';
import type { LifestyleItem } from '../../domain/lifestyle';
import type { SponsorOffer, SponsorshipContract } from '../../domain/sponsorship';
import { sponsorUnlocked } from '../../domain/sponsorship';
import type { MatchResult } from '../../engine/darts/types';
import type { WeekSummary } from '../../engine/calendar/weeklyAdvance';
import { TOURNAMENT_CALENDAR } from '../seed/tournaments';
import {
	tournamentEdition,
	tournamentEntryEligible,
	tournamentRegistrationStatus,
	weeksUntilTournament,
	type TournamentDefinition,
} from '../../domain/tournaments';
import { SPONSOR_OFFERS } from '../seed/sponsorships';
import { WORLD_PLAYERS } from '../seed/worldPlayers';
import { buildWorldRanking, tierLabel } from '../../domain/world';

const SAVE_GAME_ID = 'primary-career';

type MessageRow = {
	id: string;
	kind: CareerMessageKind;
	sender: string;
	subject: string;
	preview: string;
	body: string;
	received_date: string;
	is_read: number;
	requires_acknowledgement: number;
	requires_response: number;
	response: CareerMessageResponse | null;
	action_path: string | null;
	action_label: string | null;
};

function mapMessage(row: MessageRow): CareerMessage {
	return {
		id: row.id,
		kind: row.kind,
		sender: row.sender,
		subject: row.subject,
		preview: row.preview,
		body: row.body,
		receivedDate: row.received_date,
		isRead: row.is_read === 1,
		requiresAcknowledgement: row.requires_acknowledgement === 1,
		requiresResponse: row.requires_response === 1,
		response: row.response ?? undefined,
		actionPath: row.action_path ?? undefined,
		actionLabel: row.action_label ?? undefined,
	};
}

type NewCareerMessage = Omit<CareerMessage, 'isRead' | 'requiresAcknowledgement' | 'requiresResponse' | 'response'> & {
	requiresAcknowledgement?: boolean;
	requiresResponse?: boolean;
};

async function insertMessage(db: SQLiteDatabase, message: NewCareerMessage): Promise<void> {
	await db.runAsync(`
		INSERT OR IGNORE INTO career_messages (
			id, save_game_id, kind, sender, subject, preview, body, received_date, is_read,
			requires_acknowledgement, requires_response, action_path, action_label
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
	`, message.id, SAVE_GAME_ID, message.kind, message.sender, message.subject,
	message.preview, message.body, message.receivedDate, message.requiresAcknowledgement ? 1 : 0,
	message.requiresResponse ? 1 : 0, message.actionPath ?? null,
	message.actionLabel ?? null);
}

export async function ensureCareerMessages(db: SQLiteDatabase, career: CareerProfile): Promise<void> {
	await insertMessage(db, {
		id: 'message-welcome-league',
		kind: 'league',
		sender: 'June Mercer · League Secretary',
		subject: 'Welcome to the Lantern League',
		preview: 'Your registration is confirmed. Here is what your first season will involve.',
		body: `Hi ${career.name},\n\nYour registration for the Lantern League is confirmed. Fixtures are played every Friday and the format is best of five legs. Results are sent to the district office after each round.\n\nThis is the bottom rung, but scouts do watch players who dominate a season. Turn up, keep your averages moving and make the table notice you.\n\nJune`,
		receivedDate: career.inGameDate,
		requiresAcknowledgement: true,
		actionPath: '/calendar',
		actionLabel: 'View schedule',
	});
	await insertMessage(db, {
		id: 'message-first-payday',
		kind: 'finance',
		sender: 'Payroll',
		subject: 'Monthly pay schedule',
		preview: 'Your employment income will now arrive as one monthly payment.',
		body: 'Your wages are paid every four career weeks. Work commitments still take place each week, but only payday creates an income entry in your account. Keep enough cash aside for rent, travel, practice and coaching between payments.',
		receivedDate: career.inGameDate,
	});
	await insertMessage(db, {
		id: 'message-neighbour-board',
		kind: 'life',
		sender: 'Maya · Flatmate',
		subject: 'About practising at home…',
		preview: 'A home board would help, but the walls are thin.',
		body: 'The club board is fine for now. If you buy a home setup, use a proper surround and keep the late-night sessions sensible. A dedicated oche will give you more practice time, but the flat is still shared space.',
		receivedDate: career.inGameDate,
	});
	await insertMessage(db, {
		id: 'message-rival-rowan-introduction',
		kind: 'league',
		sender: 'Rowan Vale',
		subject: 'New name on the fixture list',
		preview: 'One of the Lantern League regulars has noticed your arrival.',
		body: `Welcome to the league, ${career.name}. People will tell you it is only pub darts, but nobody here likes losing. The room gets louder when a new player starts climbing the table.\n\nI will see you at the oche.`,
		receivedDate: career.inGameDate,
		actionPath: '/world',
		actionLabel: 'View local standings',
	});
	await insertMessage(db, {
		id: 'message-world-opening-week',
		kind: 'world',
		sender: 'World Darts Wire',
		subject: 'Marek Voss begins the year at number one',
		preview: 'The professional rankings open with challengers gathering below the cut line.',
		body: 'Marek Voss starts the year at the top of the fictional world ranking, but Riku Aalto and Finn Mercer carry stronger early momentum.\n\nFurther down, regional players are trying to reach the challenger places while established professionals defend their status. Their results and movement will reach your inbox as your own career advances.',
		receivedDate: career.inGameDate,
		actionPath: '/player/world-marek-voss',
		actionLabel: 'View number one',
	});
}

export async function addMatchMessage(
	db: SQLiteDatabase,
	result: MatchResult,
	career: CareerProfile,
): Promise<void> {
	const opponent = result.players.find((player) => player.id !== career.playerId);
	const won = result.winnerId === career.playerId;
	const playerLegs = result.legsWon[career.playerId] ?? 0;
	const opponentLegs = opponent ? result.legsWon[opponent.id] ?? 0 : 0;
	await insertMessage(db, {
		id: `message-result-${result.id}`,
		kind: 'league',
		sender: 'Northbridge Darts Desk',
		subject: `${won ? 'Win' : 'Defeat'} against ${opponent?.name ?? 'your opponent'}`,
		preview: `${playerLegs}–${opponentLegs} in the Lantern League. The table has been updated.`,
		body: `${career.name} ${won ? 'beat' : 'lost to'} ${opponent?.name ?? 'the opposition'} ${playerLegs}–${opponentLegs}.\n\nYour result is now part of your persistent playing record. Amateur and local-league matches do not award professional ranking points; tournament qualification and Q School determine your route to a Tour Card.`,
		receivedDate: result.inGameDate,
		actionPath: '/world',
		actionLabel: 'View rankings',
	});
	if (opponent) {
		const opponentAverage = result.stats[opponent.id]?.threeDartAverage ?? 0;
		await insertMessage(db, {
			id: `message-rival-${result.id}`,
			kind: 'league',
			sender: opponent.name,
			subject: won ? 'We will meet again' : 'That was decided on the doubles',
			preview: won
				? `${opponent.name} reacted after your ${playerLegs}–${opponentLegs} win.`
				: `${opponent.name} had something to say after the match.`,
			body: won
				? `Fair result today, ${career.name}. You punished the loose visits and deserved the points. I averaged ${opponentAverage.toFixed(2)}, but it was not enough.\n\nEnjoy it—the return fixture will have a little more edge now.`
				: `That was tight where it mattered. I averaged ${opponentAverage.toFixed(2)}, but the doubles settled it.\n\nYou are better than the scoreline suggests. I expect the next one to be much closer.`,
			receivedDate: result.inGameDate,
			actionPath: `/player/${opponent.id}`,
			actionLabel: 'View rival profile',
		});
	}
}

export async function addLifestyleMessage(
	db: SQLiteDatabase,
	item: LifestyleItem,
	receivedDate: string,
): Promise<void> {
	await insertMessage(db, {
		id: `message-lifestyle-${item.id}`,
		kind: 'life',
		sender: item.category === 'experience' ? 'Career Journal' : 'Lifestyle Services',
		subject: item.category === 'experience' ? `${item.name} booked` : `${item.name} confirmed`,
		preview: item.effects.join(' · '),
		body: `${item.description}\n\nCareer effects:\n${item.effects.map((effect) => `• ${effect}`).join('\n')}\n\n${item.weeklyCostPence > 0 ? `The ongoing cost is £${(item.weeklyCostPence / 100).toFixed(2)} per week.` : 'There is no recurring weekly cost.'}`,
		receivedDate,
		actionPath: '/lifestyle',
		actionLabel: 'View lifestyle',
	});
}

export async function addTournamentEntryMessage(
	db: SQLiteDatabase,
	tournament: TournamentDefinition,
	receivedDate: string,
): Promise<void> {
	await insertMessage(db, {
		id: `message-tournament-entry-${tournament.id}-${receivedDate}`,
		kind: 'tournament',
		sender: `${tournament.name} · Entries Office`,
		subject: 'Entry confirmed',
		preview: `${tournament.venue} · ${tournament.format}`,
		body: `Your entry into ${tournament.name} is confirmed. The £${(tournament.entryFeePence / 100).toFixed(2)} fee has been taken from your career balance.\n\nVenue: ${tournament.venue}\nFormat: ${tournament.format}\nRecommended average: ${tournament.recommendedAverage}\nFirst prize: £${(tournament.firstPrizePence / 100).toFixed(2)}\n\nThe event now appears as entered in your calendar.`,
		receivedDate,
		actionPath: `/tournament/${tournament.id}`,
		actionLabel: 'View tournament',
	});
}

export async function addLeagueMovementMessage(
	db: SQLiteDatabase,
	movements: readonly LocalLeagueMovement[],
	receivedDate: string,
): Promise<void> {
	const promoted = movements.find((movement) => movement.direction === 'promoted');
	const relegated = movements.find((movement) => movement.direction === 'relegated');
	if (!promoted || !relegated) {
		return;
	}
	await insertMessage(db, {
		id: `message-league-movement-s${promoted.season}`,
		kind: 'league',
		sender: 'Northbridge District Darts Committee',
		subject: `${promoted.player.name} promoted into the Lantern League`,
		preview: `${relegated.player.name} drops to ${relegated.toLeagueName} for season ${promoted.season}.`,
		body: `The local league places have been reviewed for season ${promoted.season}.\n\n${promoted.player.name} has earned promotion from ${promoted.fromLeagueName} into the Lantern League. ${relegated.player.name} finished in the relegation place and moves to ${relegated.toLeagueName}.\n\nBoth players now appear in their new league rosters and next season’s fixtures reflect the change.`,
		receivedDate,
		requiresAcknowledgement: true,
		actionPath: '/world',
		actionLabel: 'View local leagues',
	});
}

export async function syncOpportunityMessages(
	db: SQLiteDatabase,
	career: CareerProfile,
	contract: SponsorshipContract | null,
	claimedSponsorIds: readonly string[],
): Promise<void> {
	await repairTournamentMessageActions(db);
	for (const offer of SPONSOR_OFFERS) {
		if (!sponsorUnlocked(offer, career) || claimedSponsorIds.includes(offer.id) || contract?.id === offer.id) {
			continue;
		}
		await insertMessage(db, sponsorOfferMessage(offer, career.inGameDate));
	}

	for (const tournament of TOURNAMENT_CALENDAR) {
		if (!tournamentEntryEligible(career.tier, tournament)) {
			continue;
		}
		const weeksAway = weeksUntilTournament(career.weeksElapsed, tournament.week);
		const weeksUntilRegistration = weeksAway - tournament.registrationOpensWeeksBefore;
		const edition = tournamentEdition(career.weeksElapsed, tournament.week);
		const registration = tournamentRegistrationStatus(career.weeksElapsed, tournament);
		if (registration === 'upcoming' && weeksUntilRegistration <= 2) {
			await insertMessage(db, {
				id: `message-tournament-preview-${edition}-${tournament.id}`,
				kind: 'tournament',
				sender: 'Northern Events Office',
				subject: `${tournament.name} registration approaching`,
				preview: `Entries open in ${weeksUntilRegistration} week${weeksUntilRegistration === 1 ? '' : 's'} · Recommended average ${tournament.recommendedAverage}`,
				body: `${tournament.name} registration opens in ${weeksUntilRegistration} week${weeksUntilRegistration === 1 ? '' : 's'}, with the event ${weeksAway} weeks away.

Venue: ${tournament.venue}
Format: ${tournament.format}
Entry fee: £${(tournament.entryFeePence / 100).toFixed(2)}
Recommended three-dart average: ${tournament.recommendedAverage}

${tournament.decision}

This is an early reminder. A priority message will arrive when entries open.`,
				receivedDate: career.inGameDate,
				actionPath: `/tournament/${tournament.id}`,
				actionLabel: 'Preview tournament',
			});
		}
		if (registration === 'open') {
			await insertMessage(db, {
				id: `message-tournament-${Math.floor(career.weeksElapsed / 52)}-${tournament.id}`,
				kind: 'tournament',
				sender: 'Northern Events Office',
				subject: `${tournament.name} entries open`,
				preview: `${weeksAway === 0 ? 'This week' : `In ${weeksAway} weeks`} · ${tournament.format}`,
				body: `${tournament.name} is accepting entries now. Registration closes ${tournament.registrationClosesWeeksBefore} week${tournament.registrationClosesWeeksBefore === 1 ? '' : 's'} before tournament week.\n\n${tournament.decision}\n\nRecommended three-dart average: ${tournament.recommendedAverage}.${tournament.entryPolicy === 'open' ? ' This is guidance only—no qualification is required.' : ` Entry requires ${tournament.minimumTier} status.`}\n\nChoose Register to pay the fee and secure a place, or Decline Entry to skip this edition. The career cannot continue until you answer.`,
				receivedDate: career.inGameDate,
				requiresResponse: true,
				actionPath: `/tournament/${tournament.id}`,
				actionLabel: 'Review entry',
			});
		}
	}
}

async function repairTournamentMessageActions(db: SQLiteDatabase): Promise<void> {
	for (const tournament of TOURNAMENT_CALENDAR) {
		await db.runAsync(`
			UPDATE career_messages
			SET action_path = ?, action_label = 'Review entry',
				requires_response = 1, requires_acknowledgement = 0
			WHERE save_game_id = ? AND kind = 'tournament' AND subject = ?
		`, `/tournament/${tournament.id}`, SAVE_GAME_ID, `${tournament.name} entries open`);
	}
}

function sponsorOfferMessage(offer: SponsorOffer, receivedDate: string): NewCareerMessage {
	return {
		id: `message-sponsor-offer-${offer.id}`,
		kind: 'sponsor',
		sender: `${offer.name} · Partnerships`,
		subject: 'We would like to sponsor you',
		preview: `${offer.name} has noticed your results and sent a contract offer.`,
		body: `Your recent performances have put you on our radar. We would like to offer a weekly partnership with a signing bonus.\n\nThis is performance-based: we expect at least ${offer.minimumWinsPerFour} win${offer.minimumWinsPerFour === 1 ? '' : 's'} in every four matches. A sustained run below that level may end the deal.`,
		receivedDate,
		requiresAcknowledgement: true,
		actionPath: '/sponsorships',
		actionLabel: 'Review offer',
	};
}

export async function addSponsorDroppedMessage(
	db: SQLiteDatabase,
	offer: SponsorOffer,
	receivedDate: string,
): Promise<void> {
	await insertMessage(db, {
		id: `message-sponsor-dropped-${offer.id}-${receivedDate}`,
		kind: 'sponsor',
		sender: `${offer.name} · Partnerships`,
		subject: 'Partnership ended',
		preview: 'Recent results have fallen below the agreed performance level.',
		body: `We have reviewed the last four matches and the results are below the ${offer.minimumWinsPerFour}-win performance clause. The weekly partnership ends immediately.\n\nA future sponsor can still approach if your form improves.`,
		receivedDate,
		requiresAcknowledgement: true,
		actionPath: '/sponsorships',
		actionLabel: 'View sponsorships',
	});
}

export async function addWeekMessage(
	db: SQLiteDatabase,
	summary: WeekSummary,
	coaching?: CoachingContract | null,
	league?: LocalLeague | null,
	humanPlayerId?: string,
): Promise<void> {
	const worldRanking = buildWorldRanking(WORLD_PLAYERS, summary.weeksElapsedAfter);
	const leader = worldRanking[0];
	const movers = worldRanking.filter((player) => player.movement !== 'steady').slice(0, 3);
	const movementReport = movers.length > 0
		? movers.map((player) => `${player.name} ${player.movement === 'promoted' ? 'rose to' : 'dropped into'} ${tierLabel(player.tier)}`).join('; ')
		: 'The current circuit cut lines held steady this week.';
	const improvements = summary.training
		? Object.entries(summary.training.attributeChanges)
			.filter(([, change]) => change > 0)
			.map(([attribute, change]) => `${attribute} +${change}`)
			.join(', ')
		: '';
	await insertMessage(db, {
		id: `message-week-${summary.toDate}`,
		kind: 'league',
		sender: 'Career Journal',
		subject: `Week ending ${summary.toDate}`,
		preview: improvements || 'A steady week—the work is accumulating even without an attribute increase.',
		body: `Another week is complete.\n\nTraining: ${summary.training?.totalHours ?? 0} hours.${improvements ? ` Improvements: ${improvements}.` : ' Development progress was banked for future gains.'}\n\nFinances moved by ${summary.netChangePence >= 0 ? '+' : '-'}£${(Math.abs(summary.netChangePence) / 100).toFixed(2)}. Fatigue finished at ${summary.fatigueAfter}%.\n\nThe next fixture and training week are ready.`,
		receivedDate: summary.toDate,
		actionPath: '/week-summary',
		actionLabel: 'Review week',
	});
	await insertMessage(db, {
		id: `message-world-${summary.toDate}`,
		kind: 'world',
		sender: 'World Darts Wire',
		subject: `${leader?.name ?? 'The field'} leads the world ranking`,
		preview: `${leader?.points.toLocaleString() ?? 0} points at the top. ${movementReport}`,
		body: `The latest ranking has ${leader?.name ?? 'the leader'} at number one on ${leader?.points.toLocaleString() ?? 0} points.\n\n${movementReport}\n\nThe top three are ${worldRanking.slice(0, 3).map((player) => `${player.rank}. ${player.name}`).join(', ')}. Ranking cut lines are recalculated every 13 career weeks, so rising amateurs can take a professional place while struggling tour players fall back.`,
		receivedDate: summary.toDate,
		actionPath: '/world',
		actionLabel: 'Open world rankings',
	});
	const spotlight = worldRanking[(summary.weeksElapsedAfter * 7) % worldRanking.length];
	if (spotlight) {
		const direction = spotlight.momentum >= 0 ? 'building momentum' : 'searching for form';
		await insertMessage(db, {
			id: `message-player-watch-${summary.toDate}`,
			kind: 'world',
			sender: 'The Oche Report',
			subject: `${spotlight.name} is ${direction}`,
			preview: `World #${spotlight.rank} · ${tierLabel(spotlight.tier)} · Form ${spotlight.form >= 0 ? '+' : ''}${spotlight.form}`,
			body: `${spotlight.name}, the ${spotlight.age}-year-old ${spotlight.country} ${spotlight.style}, is ${direction}.\n\nThe latest ranking places ${spotlight.name} at number ${spotlight.rank} with ${spotlight.points.toLocaleString()} points. Scoring is rated ${spotlight.attributes.scoring}, finishing ${spotlight.attributes.finishing}, and composure ${spotlight.attributes.composure}.\n\nThese are the careers unfolding above the local circuit while you build your own route upward.`,
			receivedDate: summary.toDate,
			actionPath: `/player/${spotlight.id}`,
			actionLabel: 'View player profile',
		});
	}
	const humanIndex = humanPlayerId
		? league?.standings.findIndex((standing) => standing.playerId === humanPlayerId) ?? -1
		: -1;
	const rival = humanIndex >= 0
		? league?.standings[humanIndex === 0 ? 1 : humanIndex - 1]
		: undefined;
	if (rival && league) {
		await insertMessage(db, {
			id: `message-rival-watch-${summary.toDate}`,
			kind: 'league',
			sender: 'Lantern League Insider',
			subject: `${rival.name} is your nearest table rival`,
			preview: `${rival.points} points · ${rival.won} wins · leg difference ${rival.legDifference >= 0 ? '+' : ''}${rival.legDifference}`,
			body: `${rival.name} currently sits closest to you in the Lantern League table. The gap is small enough that one result can change the order.\n\n${rival.name}: ${rival.played} played, ${rival.won} won, ${rival.points} points, ${rival.legDifference >= 0 ? '+' : ''}${rival.legDifference} leg difference.\n\nKeep an eye on their results—the local season is becoming a rivalry rather than a list of fixtures.`,
			receivedDate: summary.toDate,
			actionPath: `/player/${rival.playerId}`,
			actionLabel: 'View rival profile',
		});
	}
	if (coaching) {
		const focus = coaching.focus === 'balanced' ? coaching.specialty : coaching.focus;
		await insertMessage(db, {
			id: `message-coach-${summary.toDate}`,
			kind: 'coach',
			sender: coaching.name,
			subject: `Weekly review · ${focus}`,
			preview: coaching.insight,
			body: `${coaching.insight}\n\nThis week we focused on ${focus}. I applied the strongest development bonus there and a smaller supporting benefit to the rest of your training plan. Change next week’s focus if the schedule or opponent calls for it.`,
			receivedDate: summary.toDate,
			actionPath: '/coaching',
			actionLabel: 'Set coaching focus',
		});
	}
}

export async function loadCareerMessages(db: SQLiteDatabase): Promise<CareerMessage[]> {
	const rows = await db.getAllAsync<MessageRow>(`
		SELECT id, kind, sender, subject, preview, body, received_date, is_read,
			requires_acknowledgement, requires_response, response, action_path, action_label
		FROM career_messages WHERE save_game_id = ?
		ORDER BY received_date DESC, id DESC
	`, SAVE_GAME_ID);
	return rows.map(mapMessage);
}

export async function markCareerMessageRead(db: SQLiteDatabase, id: string): Promise<void> {
	await db.runAsync(`
		UPDATE career_messages SET is_read = 1 WHERE id = ? AND save_game_id = ?
	`, id, SAVE_GAME_ID);
}

export async function markAllCareerMessagesRead(db: SQLiteDatabase): Promise<void> {
	await db.runAsync(`
		UPDATE career_messages SET is_read = 1 WHERE save_game_id = ?
	`, SAVE_GAME_ID);
}

export async function respondToCareerMessage(
	db: SQLiteDatabase,
	id: string,
	response: CareerMessageResponse,
): Promise<void> {
	const result = await db.runAsync(`
		UPDATE career_messages
		SET response = ?, is_read = 1
		WHERE id = ? AND save_game_id = ? AND requires_response = 1 AND response IS NULL
	`, response, id, SAVE_GAME_ID);
	if (result.changes !== 1) {
		throw new Error('This message has already been answered or no longer requires a response.');
	}
}

export async function acceptTournamentRegistrationMessages(
	db: SQLiteDatabase,
	tournamentId: string,
): Promise<void> {
	await db.runAsync(`
		UPDATE career_messages
		SET response = 'accepted', is_read = 1
		WHERE save_game_id = ? AND action_path = ? AND requires_response = 1
	`, SAVE_GAME_ID, `/tournament/${tournamentId}`);
}

