import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';

import {
	createCareer as createCareerRecord,
	loadCareer,
	loadLatestMatch,
	persistMatchResult,
	saveCareerNow as saveCareerNowRecord,
	saveWeeklyStrategy as saveWeeklyStrategyRecord,
} from '../data/repositories/careerRepository';
import {
	cancelCoach as cancelCoachRecord,
	hireCoach as hireCoachRecord,
	loadCoachingContract,
	setCoachFocus as setCoachFocusRecord,
} from '../data/repositories/coachingRepository';
import {
	ensureStarterDarts,
	equipDarts as equipDartsRecord,
	loadOwnedDarts,
	purchaseAndEquipDarts,
} from '../data/repositories/equipmentRepository';
import {
	advanceCareerWeek,
	loadLatestWeekSummary,
} from '../data/repositories/calendarRepository';
import { loadLedgerEntries } from '../data/repositories/ledgerRepository';
import {
	addWeekMessage,
	addMatchMessage,
	addLifestyleMessage,
	addLeagueMovementMessage,
	addSponsorDroppedMessage,
	addTournamentEntryMessage,
	acceptTournamentRegistrationMessages,
	ensureCareerMessages,
	loadCareerMessages,
	markAllCareerMessagesRead,
	markCareerMessageRead as markCareerMessageReadRecord,
	respondToCareerMessage,
	syncOpportunityMessages,
} from '../data/repositories/inboxRepository';
import { ensureLocalLeague, loadLocalLeague } from '../data/repositories/leagueRepository';
import {
	loadLifestyleState,
	purchaseOrSelectLifestyleItem,
} from '../data/repositories/lifestyleRepository';
import {
	completeTournamentMatch,
	ensureTournamentMatches,
	enterTournament,
	loadTournamentEntries,
	loadTournamentMatches,
} from '../data/repositories/tournamentRepository';
import { TOURNAMENT_CALENDAR } from '../data/seed/tournaments';
import {
	loadClaimedSponsorIds,
	loadSponsorshipContract,
	evaluateSponsorRetention,
	signSponsorship as signSponsorshipRecord,
} from '../data/repositories/sponsorshipRepository';
import {
	loadTrainingPlan,
	saveTrainingPlan as saveTrainingPlanRecord,
} from '../data/repositories/trainingRepository';
import type { CareerProfile, NewCareerInput, WeeklyStrategy } from '../domain/career';
import type { CoachOption, CoachingContract, CoachingFocus } from '../domain/coaching';
import type { DartsSet, OwnedDarts } from '../domain/equipment';
import type { LedgerEntry } from '../domain/finances';
import type { CareerMessage, CareerMessageResponse } from '../domain/inbox';
import { blockingCareerMessages } from '../domain/inbox';
import type { LeagueFixture, LocalLeague } from '../domain/league';
import type { LifestyleItem, LifestyleState } from '../domain/lifestyle';
import { sponsorUnlocked, type SponsorOffer, type SponsorshipContract } from '../domain/sponsorship';
import {
	tournamentEdition,
	type TournamentDefinition,
	type TournamentEntry,
	type TournamentMatch,
} from '../domain/tournaments';
import type { WeekSummary } from '../engine/calendar/weeklyAdvance';
import type { MatchResult } from '../engine/darts/types';
import type { TrainingAllocation, TrainingPlan } from '../engine/training/training';

type CareerStore = {
	career: CareerProfile | null;
	latestMatch: MatchResult | null;
	latestWeekSummary: WeekSummary | null;
	ledgerEntries: LedgerEntry[];
	trainingPlan: TrainingPlan | null;
	league: LocalLeague | null;
	coachingContract: CoachingContract | null;
	ownedDarts: OwnedDarts[];
	lifestyle: LifestyleState | null;
	sponsorshipContract: SponsorshipContract | null;
	claimedSponsorIds: string[];
	tournamentEntries: TournamentEntry[];
	tournamentMatches: TournamentMatch[];
	messages: CareerMessage[];
	hydrationStatus: 'idle' | 'loading' | 'ready' | 'error';
	busy: boolean;
	error: string | null;
	hydrate: (db: SQLiteDatabase, force?: boolean) => Promise<void>;
	createCareer: (db: SQLiteDatabase, input: NewCareerInput) => Promise<void>;
	recordMatch: (
		db: SQLiteDatabase,
		result: MatchResult,
		fixture?: LeagueFixture,
		tournamentMatch?: TournamentMatch,
	) => Promise<boolean>;
	saveTrainingPlan: (db: SQLiteDatabase, allocations: TrainingAllocation) => Promise<TrainingPlan>;
	hireCoach: (db: SQLiteDatabase, coach: CoachOption) => Promise<void>;
	cancelCoach: (db: SQLiteDatabase) => Promise<void>;
	setCoachFocus: (db: SQLiteDatabase, focus: CoachingFocus) => Promise<void>;
	purchaseDarts: (db: SQLiteDatabase, darts: DartsSet) => Promise<void>;
	equipDarts: (db: SQLiteDatabase, dartsId: string) => Promise<void>;
	purchaseLifestyleItem: (db: SQLiteDatabase, item: LifestyleItem) => Promise<void>;
	enterTournament: (db: SQLiteDatabase, tournament: TournamentDefinition) => Promise<void>;
	signSponsorship: (db: SQLiteDatabase, offer: SponsorOffer) => Promise<void>;
	markMessageRead: (db: SQLiteDatabase, id: string) => Promise<void>;
	markAllMessagesRead: (db: SQLiteDatabase) => Promise<void>;
	respondToTournamentMessage: (
		db: SQLiteDatabase,
		messageId: string,
		tournament: TournamentDefinition,
		response: CareerMessageResponse,
	) => Promise<void>;
	setWeeklyStrategy: (db: SQLiteDatabase, strategy: WeeklyStrategy) => Promise<void>;
	saveCareerNow: (db: SQLiteDatabase) => Promise<string>;
	advanceWeek: (db: SQLiteDatabase) => Promise<WeekSummary>;
	clearError: () => void;
};

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Something went wrong.';
}

function withTimeout<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error('The local career database did not respond. Please retry.'));
		}, milliseconds);

		operation.then(
			(value) => {
				clearTimeout(timeout);
				resolve(value);
			},
			(error: unknown) => {
				clearTimeout(timeout);
				reject(error);
			},
		);
	});
}

export const useCareerStore = create<CareerStore>((set, get) => ({
	career: null,
	latestMatch: null,
	latestWeekSummary: null,
	ledgerEntries: [],
	trainingPlan: null,
	league: null,
	coachingContract: null,
	ownedDarts: [],
	lifestyle: null,
	sponsorshipContract: null,
	claimedSponsorIds: [],
	tournamentEntries: [],
	tournamentMatches: [],
	messages: [],
	hydrationStatus: 'idle',
	busy: false,
	error: null,
	hydrate: async (db, force = false) => {
		const status = get().hydrationStatus;
		if (!force && (status === 'loading' || status === 'ready')) {
			return;
		}
		set({ hydrationStatus: 'loading', error: null });
		try {
			const {
				career,
				latestMatch,
				latestWeekSummary,
				ledgerEntries,
				trainingPlan,
				league,
				coachingContract,
				ownedDarts,
				lifestyle,
				sponsorshipContract,
				claimedSponsorIds,
				tournamentEntries,
				tournamentMatches,
				messages,
			} = await withTimeout((async () => {
				let storedCareer = await loadCareer(db);
				if (storedCareer) {
					await ensureLocalLeague(db, storedCareer);
					const ensuredLeague = await loadLocalLeague(db);
					await addLeagueMovementMessage(
						db,
						ensuredLeague.movements?.filter((movement) => movement.season === ensuredLeague.season) ?? [],
						storedCareer.inGameDate,
					);
					await ensureStarterDarts(db);
					await ensureCareerMessages(db, storedCareer);
					await ensureTournamentMatches(db, TOURNAMENT_CALENDAR);
					storedCareer = await loadCareer(db);
				}
				const [
					storedMatch,
					storedWeekSummary,
					storedLedgerEntries,
					storedTrainingPlan,
					storedLeague,
					storedCoaching,
					storedDarts,
					storedLifestyle,
					storedSponsorship,
					storedClaimedSponsors,
					storedTournamentEntries,
					storedTournamentMatches,
					storedMessages,
				] = await Promise.all([
					loadLatestMatch(db),
					loadLatestWeekSummary(db),
					loadLedgerEntries(db),
					storedCareer ? loadTrainingPlan(db, storedCareer.inGameDate) : Promise.resolve(null),
					storedCareer ? loadLocalLeague(db) : Promise.resolve(null),
					storedCareer ? loadCoachingContract(db) : Promise.resolve(null),
					storedCareer ? loadOwnedDarts(db) : Promise.resolve([]),
					storedCareer ? loadLifestyleState(db) : Promise.resolve(null),
					storedCareer ? loadSponsorshipContract(db) : Promise.resolve(null),
					storedCareer ? loadClaimedSponsorIds(db) : Promise.resolve([]),
					storedCareer ? loadTournamentEntries(db) : Promise.resolve([]),
					storedCareer ? loadTournamentMatches(db) : Promise.resolve([]),
					storedCareer ? loadCareerMessages(db) : Promise.resolve([]),
				]);
				if (storedCareer) {
					await syncOpportunityMessages(
						db,
						storedCareer,
						storedSponsorship,
						storedClaimedSponsors,
					);
				}
				return {
					career: storedCareer,
					latestMatch: storedMatch,
					latestWeekSummary: storedWeekSummary,
					ledgerEntries: storedLedgerEntries,
					trainingPlan: storedTrainingPlan,
					league: storedLeague,
					coachingContract: storedCoaching,
					ownedDarts: storedDarts,
					lifestyle: storedLifestyle,
					sponsorshipContract: storedSponsorship,
					claimedSponsorIds: storedClaimedSponsors,
					tournamentEntries: storedTournamentEntries,
					tournamentMatches: storedTournamentMatches,
					messages: storedCareer ? await loadCareerMessages(db) : storedMessages,
				};
			})(), 10_000);
			set({
				career,
				latestMatch,
				latestWeekSummary,
				ledgerEntries,
				trainingPlan,
				league,
				coachingContract,
				ownedDarts,
				lifestyle,
				sponsorshipContract,
				claimedSponsorIds,
				tournamentEntries,
				tournamentMatches,
				messages,
				hydrationStatus: 'ready',
				error: null,
			});
		} catch (error) {
			set({ hydrationStatus: 'error', error: errorMessage(error) });
		}
	},
	createCareer: async (db, input) => {
		set({ busy: true, error: null });
		try {
			const career = await createCareerRecord(db, input);
			await ensureLocalLeague(db, career);
			await ensureStarterDarts(db);
			await ensureCareerMessages(db, career);
			await syncOpportunityMessages(db, career, null, []);
			const [ledgerEntries, league, ownedDarts, lifestyle, tournamentEntries, tournamentMatches, messages] = await Promise.all([
				loadLedgerEntries(db),
				loadLocalLeague(db),
				loadOwnedDarts(db),
				loadLifestyleState(db),
				loadTournamentEntries(db),
				loadTournamentMatches(db),
				loadCareerMessages(db),
			]);
			set({
				career,
				latestMatch: null,
				latestWeekSummary: null,
				ledgerEntries,
				trainingPlan: null,
				league,
				coachingContract: null,
				ownedDarts,
				lifestyle,
				sponsorshipContract: null,
				claimedSponsorIds: [],
				tournamentEntries,
				tournamentMatches,
				messages,
				busy: false,
			});
		} catch (error) {
			set({ busy: false, error: errorMessage(error) });
			throw error;
		}
	},
	recordMatch: async (db, result, fixture, tournamentMatch) => {
		const career = get().career;
		if (!career) {
			throw new Error('Create or load a career before recording a match.');
		}
		set({ busy: true, error: null });
		try {
			const inserted = await persistMatchResult(db, result, career.playerId, fixture);
			if (tournamentMatch) {
				const tournament = TOURNAMENT_CALENDAR.find((candidate) => candidate.id === tournamentMatch.tournamentId);
				if (!tournament) {
					throw new Error('The tournament definition could not be found.');
				}
				await completeTournamentMatch(db, career, tournament, tournamentMatch, result);
			}
			const [refreshedCareer, league, tournamentEntries, tournamentMatches, ledgerEntries] = await Promise.all([
				loadCareer(db),
				loadLocalLeague(db),
				loadTournamentEntries(db),
				loadTournamentMatches(db),
				loadLedgerEntries(db),
			]);
			if (!refreshedCareer) {
				throw new Error('The saved career could not be reloaded after the match.');
			}
			await addMatchMessage(db, result, refreshedCareer);
			const droppedSponsor = await evaluateSponsorRetention(db, career.playerId);
			if (droppedSponsor) {
				await addSponsorDroppedMessage(db, droppedSponsor, refreshedCareer.inGameDate);
			}
			const [sponsorshipContract, claimedSponsorIds] = await Promise.all([
				loadSponsorshipContract(db),
				loadClaimedSponsorIds(db),
			]);
			await syncOpportunityMessages(db, refreshedCareer, sponsorshipContract, claimedSponsorIds);
			const messages = await loadCareerMessages(db);
			set({
				career: refreshedCareer,
				latestMatch: result,
				league,
				tournamentEntries,
				tournamentMatches,
				ledgerEntries,
				sponsorshipContract,
				claimedSponsorIds,
				messages,
				busy: false,
			});
			return inserted;
		} catch (error) {
			set({ busy: false, error: errorMessage(error) });
			throw error;
		}
	},
	saveTrainingPlan: async (db, allocations) => {
		const career = get().career;
		if (!career) {
			throw new Error('Create or load a career before planning training.');
		}
		set({ busy: true, error: null });
		try {
			const trainingPlan = await saveTrainingPlanRecord(db, career, allocations, get().lifestyle);
			set({ trainingPlan, busy: false });
			return trainingPlan;
		} catch (error) {
			set({ busy: false, error: errorMessage(error) });
			throw error;
		}
	},
	hireCoach: async (db, coach) => {
		const career = get().career;
		if (!career) {
			throw new Error('Create or load a career before hiring a coach.');
		}
		set({ busy: true, error: null });
		try {
			const coachingContract = await hireCoachRecord(db, coach, career.bankBalancePence);
			set({ coachingContract, busy: false });
		} catch (error) {
			set({ busy: false, error: errorMessage(error) });
			throw error;
		}
	},
	cancelCoach: async (db) => {
		set({ busy: true, error: null });
		try {
			await cancelCoachRecord(db);
			set({ coachingContract: null, busy: false });
		} catch (error) {
			set({ busy: false, error: errorMessage(error) });
			throw error;
		}
	},
	setCoachFocus: async (db, focus) => {
		set({ busy: true, error: null });
		try {
			await setCoachFocusRecord(db, focus);
			set({ coachingContract: await loadCoachingContract(db), busy: false });
		} catch (error) {
			set({ busy: false, error: errorMessage(error) });
			throw error;
		}
	},
	purchaseDarts: async (db, darts) => {
		set({ busy: true, error: null });
		try {
			await purchaseAndEquipDarts(db, darts);
			const [career, ledgerEntries, ownedDarts] = await Promise.all([
				loadCareer(db),
				loadLedgerEntries(db),
				loadOwnedDarts(db),
			]);
			set({ career, ledgerEntries, ownedDarts, busy: false });
		} catch (error) {
			set({ busy: false, error: errorMessage(error) });
			throw error;
		}
	},
	equipDarts: async (db, dartsId) => {
		set({ busy: true, error: null });
		try {
			await equipDartsRecord(db, dartsId);
			set({ ownedDarts: await loadOwnedDarts(db), busy: false });
		} catch (error) {
			set({ busy: false, error: errorMessage(error) });
			throw error;
		}
	},
	purchaseLifestyleItem: async (db, item) => {
		set({ busy: true, error: null });
		try {
			const result = await purchaseOrSelectLifestyleItem(db, item);
			const currentCareer = get().career;
			if (result.purchased && currentCareer) {
				await addLifestyleMessage(db, item, currentCareer.inGameDate);
			}
			const [career, lifestyle, ledgerEntries, messages] = await Promise.all([
				loadCareer(db),
				loadLifestyleState(db),
				loadLedgerEntries(db),
				loadCareerMessages(db),
			]);
			set({ career, lifestyle, ledgerEntries, messages, busy: false });
		} catch (error) {
			set({ busy: false, error: errorMessage(error) });
			throw error;
		}
	},
	enterTournament: async (db, tournament) => {
		const career = get().career;
		if (!career) {
			throw new Error('Create or load a career before entering a tournament.');
		}
		set({ busy: true, error: null });
		try {
			await enterTournament(db, career, tournament);
			await acceptTournamentRegistrationMessages(db, tournament.id);
			await addTournamentEntryMessage(db, tournament, career.inGameDate);
			const [refreshedCareer, tournamentEntries, tournamentMatches, ledgerEntries, messages] = await Promise.all([
				loadCareer(db),
				loadTournamentEntries(db),
				loadTournamentMatches(db),
				loadLedgerEntries(db),
				loadCareerMessages(db),
			]);
			set({
				career: refreshedCareer,
				tournamentEntries,
				tournamentMatches,
				ledgerEntries,
				messages,
				busy: false,
			});
		} catch (error) {
			set({ busy: false, error: errorMessage(error) });
			throw error;
		}
	},
	signSponsorship: async (db, offer) => {
		const career = get().career;
		if (!career) {
			throw new Error('Create or load a career before signing a sponsor.');
		}
		if (!sponsorUnlocked(offer, career)) {
			throw new Error('This sponsorship offer has not been unlocked yet.');
		}
		set({ busy: true, error: null });
		try {
			await signSponsorshipRecord(db, offer);
			const [refreshedCareer, sponsorshipContract, claimedSponsorIds, ledgerEntries] = await Promise.all([
				loadCareer(db),
				loadSponsorshipContract(db),
				loadClaimedSponsorIds(db),
				loadLedgerEntries(db),
			]);
			set({
				career: refreshedCareer,
				sponsorshipContract,
				claimedSponsorIds,
				ledgerEntries,
				busy: false,
			});
		} catch (error) {
			set({ busy: false, error: errorMessage(error) });
			throw error;
		}
	},
	markMessageRead: async (db, id) => {
		await markCareerMessageReadRecord(db, id);
		set({ messages: await loadCareerMessages(db) });
	},
	markAllMessagesRead: async (db) => {
		await markAllCareerMessagesRead(db);
		set({ messages: await loadCareerMessages(db) });
	},
	respondToTournamentMessage: async (db, messageId, tournament, response) => {
		const career = get().career;
		if (!career) {
			throw new Error('Create or load a career before responding.');
		}
		set({ busy: true, error: null });
		try {
			if (response === 'accepted') {
				const edition = tournamentEdition(career.weeksElapsed, tournament.week);
				const alreadyEntered = get().tournamentEntries.some((entry) => (
					entry.tournamentId === tournament.id && entry.edition === edition
				));
				if (!alreadyEntered) {
					await enterTournament(db, career, tournament, true);
					await addTournamentEntryMessage(db, tournament, career.inGameDate);
				}
			}
			await respondToCareerMessage(db, messageId, response);
			const [refreshedCareer, tournamentEntries, tournamentMatches, ledgerEntries, messages] = await Promise.all([
				loadCareer(db),
				loadTournamentEntries(db),
				loadTournamentMatches(db),
				loadLedgerEntries(db),
				loadCareerMessages(db),
			]);
			set({
				career: refreshedCareer,
				tournamentEntries,
				tournamentMatches,
				ledgerEntries,
				messages,
				busy: false,
			});
		} catch (error) {
			set({ busy: false, error: errorMessage(error) });
			throw error;
		}
	},
	setWeeklyStrategy: async (db, strategy) => {
		set({ busy: true, error: null });
		try {
			await saveWeeklyStrategyRecord(db, strategy);
			set({ career: await loadCareer(db), trainingPlan: null, busy: false });
		} catch (error) {
			set({ busy: false, error: errorMessage(error) });
			throw error;
		}
	},
	saveCareerNow: async (db) => {
		set({ busy: true, error: null });
		try {
			const savedAt = await saveCareerNowRecord(db);
			set({ career: await loadCareer(db), busy: false });
			return savedAt;
		} catch (error) {
			set({ busy: false, error: errorMessage(error) });
			throw error;
		}
	},
	advanceWeek: async (db) => {
		const career = get().career;
		if (!career) {
			throw new Error('Create or load a career before advancing the calendar.');
		}
		const trainingPlan = get().trainingPlan;
		const requiredMessages = blockingCareerMessages(get().messages);
		const requiredMessage = requiredMessages[0];
		if (requiredMessage) {
			throw new Error(
				requiredMessage.requiresResponse
					? `Respond to “${requiredMessage.subject}” in Messages before advancing the week.`
					: `Read “${requiredMessage.subject}” in Messages before advancing the week.`,
			);
		}
		if (!trainingPlan) {
			throw new Error('Save a training plan before advancing the week.');
		}
		const tournamentMatch = get().tournamentMatches.find((match) => match.status === 'scheduled');
		if (tournamentMatch) {
			throw new Error(`Play your ${tournamentMatch.roundLabel} tournament match before advancing the week.`);
		}
		const league = get().league;
		if (!league) {
			throw new Error('The local league could not be loaded.');
		}
		if (get().busy) {
			throw new Error('Another career action is still being saved.');
		}
		set({ busy: true, error: null });
		try {
			const result = await advanceCareerWeek(
				db,
				career,
				trainingPlan,
				league,
				get().coachingContract,
				get().lifestyle,
				get().sponsorshipContract,
			);
			const messageLeague = await loadLocalLeague(db);
			await addWeekMessage(
				db,
				result.summary,
				get().coachingContract,
				messageLeague,
				career.playerId,
			);
			let [refreshedCareer, ledgerEntries] = await Promise.all([
				loadCareer(db),
				loadLedgerEntries(db),
			]);
			if (!refreshedCareer) {
				throw new Error('The advanced career could not be reloaded.');
			}
			await syncOpportunityMessages(
				db,
				refreshedCareer,
				get().sponsorshipContract,
				get().claimedSponsorIds,
			);
			await ensureLocalLeague(db, refreshedCareer);
			refreshedCareer = await loadCareer(db);
			if (!refreshedCareer) {
				throw new Error('The advanced career could not be reloaded after season setup.');
			}
			const movementLeague = await loadLocalLeague(db);
			await addLeagueMovementMessage(
				db,
				movementLeague.movements?.filter((movement) => movement.season === movementLeague.season) ?? [],
				refreshedCareer.inGameDate,
			);
			const [refreshedLeague, nextTrainingPlan, messages] = await Promise.all([
				loadLocalLeague(db),
				loadTrainingPlan(db, refreshedCareer.inGameDate),
				loadCareerMessages(db),
			]);
			set({
				career: refreshedCareer,
				latestWeekSummary: result.summary,
				ledgerEntries,
				trainingPlan: nextTrainingPlan,
				league: refreshedLeague,
				messages,
				busy: false,
			});
			return result.summary;
		} catch (error) {
			set({ busy: false, error: errorMessage(error) });
			throw error;
		}
	},
	clearError: () => set({ error: null }),
}));

