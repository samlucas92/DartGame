import { useSQLiteContext } from 'expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { Card } from '../../components/Card';
import { Dartboard } from '../../components/Dartboard';
import { MissingCareer } from '../../components/MissingCareer';
import { fixtureOpponent } from '../../data/repositories/leagueRepository';
import type { CareerProfile } from '../../domain/career';
import { applyDartsModifiers, type OwnedDarts } from '../../domain/equipment';
import type { LeagueFixture, LeaguePlayer } from '../../domain/league';
import type { TournamentMatch } from '../../domain/tournaments';
import { TOURNAMENT_CALENDAR } from '../../data/seed/tournaments';
import { findCheckoutRoute } from '../../engine/darts/checkout';
import { buildMatchCommentary } from '../../engine/darts/commentary';
import {
	aggregatePlayerStats,
	createMatch,
	finishMatch,
	matchResult,
	simulateNextLeg,
	simulateNextVisit,
} from '../../engine/darts/simulation';
import type { MatchConfig, MatchState, Visit } from '../../engine/darts/types';
import { normalizeSeed } from '../../engine/random/seededRandom';
import { useCareerStore } from '../../state/careerStore';
import { colors, radii, spacing, typography } from '../../theme/tokens';

const DART_DELAY_MS = 650;
const VISIT_DELAY_MS = 900;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'duplicate' | 'error';
type MatchMode = 'watch' | 'manual' | null;
type MatchSpeed = 0.5 | 1 | 2;

function visitsInMatch(match: MatchState): Visit[] {
	const completedVisits = match.completedLegs.flatMap((leg) => leg.visits);
	return match.status === 'complete'
		? completedVisits
		: [...completedVisits, ...match.currentLeg.visits];
}

function visitGroupsInMatch(match: MatchState) {
	const groups = match.completedLegs.map((leg, index) => ({
		legNumber: leg.legNumber,
		visits: leg.visits,
		completesMatch: match.status === 'complete' && index === match.completedLegs.length - 1,
	}));
	return match.status === 'in-progress' && match.currentLeg.visits.length > 0
		? [...groups, {
			legNumber: match.currentLeg.legNumber,
			visits: match.currentLeg.visits,
			completesMatch: false,
		}]
		: groups;
}

function MatchGame({
	career,
	fixture,
	opponent,
	darts,
	tournamentMatch,
	eventTitle = 'The Lantern League',
}: {
	career: CareerProfile;
	fixture: LeagueFixture;
	opponent: LeaguePlayer;
	darts: OwnedDarts | null;
	tournamentMatch?: TournamentMatch;
	eventTitle?: string;
}) {
	const db = useSQLiteContext();
	const recordMatch = useCareerStore((state) => state.recordMatch);
	const busy = useCareerStore((state) => state.busy);
	const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
	const [config] = useState<MatchConfig>(() => ({
		id: fixture.id,
		seed: normalizeSeed(career.rngState ^ fixture.round),
		bestOf: fixture.bestOf,
		inGameDate: fixture.date,
		players: fixture.homePlayerId === career.playerId
			? [
				{
					id: career.playerId,
					name: career.name,
					attributes: applyDartsModifiers(career.attributes, darts),
					form: career.form,
					fatigue: career.fatigue,
				},
				opponent,
			]
			: [
				opponent,
				{
					id: career.playerId,
					name: career.name,
					attributes: applyDartsModifiers(career.attributes, darts),
					form: career.form,
					fatigue: career.fatigue,
				},
			],
	}));
	const [match, setMatch] = useState<MatchState>(() => createMatch(config));
	const [mode, setMode] = useState<MatchMode>(null);
	const [speed, setSpeed] = useState<MatchSpeed>(1);
	const [pendingMatch, setPendingMatch] = useState<MatchState | null>(null);
	const [pendingVisit, setPendingVisit] = useState<Visit | null>(null);
	const [visibleDarts, setVisibleDarts] = useState(0);

	const playersById = Object.fromEntries(config.players.map((player) => [player.id, player]));
	const allVisits = visitsInMatch(match);
	const latestVisit = allVisits[allVisits.length - 1];
	const displayedVisit = pendingVisit ?? latestVisit;
	const result = match.status === 'complete' ? matchResult(match) : null;
	const commentary = buildMatchCommentary(visitGroupsInMatch(match), config.players, career.playerId);
	const recentCommentary = commentary.slice(-10).reverse();

	const persistIfComplete = useCallback(async (nextMatch: MatchState) => {
		if (
			nextMatch.status !== 'complete'
			|| saveStatus === 'saving'
			|| saveStatus === 'saved'
			|| saveStatus === 'duplicate'
		) {
			return;
		}
		setSaveStatus('saving');
		try {
			const inserted = await recordMatch(
				db,
				matchResult(nextMatch),
				tournamentMatch ? undefined : fixture,
				tournamentMatch,
			);
			setSaveStatus(inserted ? 'saved' : 'duplicate');
		} catch {
			setSaveStatus('error');
		}
	}, [db, fixture, recordMatch, saveStatus, tournamentMatch]);

	const beginVisit = useCallback((currentMatch: MatchState) => {
		const nextMatch = simulateNextVisit(currentMatch);
		const visit = visitsInMatch(nextMatch).at(-1);
		if (!visit) {
			return;
		}
		setPendingMatch(nextMatch);
		setPendingVisit(visit);
		setVisibleDarts(0);
	}, []);

	const watchMatch = () => {
		setMode('watch');
		beginVisit(match);
	};

	const useManualControls = () => {
		setMode('manual');
	};

	const runManualAction = (operation: (current: MatchState) => MatchState) => {
		const nextMatch = operation(match);
		setMatch(nextMatch);
		setPendingMatch(null);
		setPendingVisit(null);
		setVisibleDarts(0);
		if (nextMatch.status === 'complete') {
			void persistIfComplete(nextMatch);
		}
	};

	useEffect(() => {
		if (mode !== 'watch' || !pendingVisit || !pendingMatch) {
			return;
		}
		if (visibleDarts < pendingVisit.darts.length) {
			const timer = setTimeout(() => {
				setVisibleDarts((current) => current + 1);
			}, DART_DELAY_MS / speed);
			return () => clearTimeout(timer);
		}
		const timer = setTimeout(() => {
			setMatch(pendingMatch);
			if (pendingMatch.status === 'complete') {
				setPendingMatch(null);
				setPendingVisit(null);
				void persistIfComplete(pendingMatch);
			} else {
				beginVisit(pendingMatch);
			}
		}, VISIT_DELAY_MS / speed);
		return () => clearTimeout(timer);
	}, [beginVisit, mode, pendingMatch, pendingVisit, persistIfComplete, speed, visibleDarts]);

	const playerStats = result?.stats[career.playerId]
		?? liveStats(career.playerId, allVisits, match.legsWon[career.playerId] ?? 0);
	const opponentStats = result?.stats[opponent.id]
		?? liveStats(opponent.id, allVisits, match.legsWon[opponent.id] ?? 0);
	const displayedRemaining = (playerId: string): number => {
		const committed = match.currentLeg.scores[playerId] ?? 501;
		if (pendingVisit?.playerId !== playerId || visibleDarts === 0) {
			return committed;
		}
		return pendingVisit.darts[Math.min(visibleDarts, pendingVisit.darts.length) - 1]?.remainingAfter
			?? committed;
	};
	const throwingPlayerId = pendingVisit?.playerId
		?? config.players[match.currentLeg.currentPlayerIndex].id;
	const liveCommentary = commentaryLine({
		careerPlayerId: career.playerId,
		commentary: commentary.at(-1)?.text,
		match,
		pendingVisit,
		playersById,
		throwingPlayerId,
		visibleDarts,
	});

	return (
		<AppScreen
			eyebrow={`${eventTitle} · ${tournamentMatch?.roundLabel ?? `Round ${fixture.round}`} · Best of ${config.bestOf}`}
			title={match.status === 'complete' ? 'Match complete' : mode ? `Leg ${match.currentLeg.legNumber} · Live` : 'Match Centre'}
			subtitle={`Seed ${config.seed} · ${darts?.name ?? 'Club darts'}`}
		>
			<View style={styles.broadcastStage}>
				<PlayerScore
					name={career.name}
					legs={match.legsWon[career.playerId] ?? 0}
					remaining={displayedRemaining(career.playerId)}
					average={playerStats.threeDartAverage}
					checkoutPercent={playerStats.checkoutPercent}
					active={throwingPlayerId === career.playerId && match.status === 'in-progress'}
					isHuman
				/>
				<Dartboard
					compact
					maxSize={174}
					visit={displayedVisit}
					playerName={displayedVisit ? playersById[displayedVisit.playerId]?.name : undefined}
					visibleDarts={pendingVisit ? visibleDarts : undefined}
				/>
				<PlayerScore
					name={opponent.name}
					legs={match.legsWon[opponent.id] ?? 0}
					remaining={displayedRemaining(opponent.id)}
					average={opponentStats.threeDartAverage}
					checkoutPercent={opponentStats.checkoutPercent}
					active={throwingPlayerId === opponent.id && match.status === 'in-progress'}
				/>
			</View>
			<VisitScoreDisplay
				visit={displayedVisit}
				visibleDarts={pendingVisit ? visibleDarts : undefined}
				playerName={displayedVisit ? playersById[displayedVisit.playerId]?.name : undefined}
			/>

			{match.status === 'in-progress' && mode === null ? (
				<Card label="Match presentation" title="How do you want to play?">
					<Text style={styles.muted}>Watch the entire match play itself dart by dart, or use the original controls to advance it yourself.</Text>
					<View style={styles.modeButtons}>
						<ActionButton
							label="Watch Match"
							disabled={busy}
							onPress={watchMatch}
							style={styles.flexButton}
						/>
						<ActionButton
							label="Manual Controls"
							variant="secondary"
							disabled={busy}
							onPress={useManualControls}
							style={styles.flexButton}
						/>
					</View>
				</Card>
			) : match.status === 'in-progress' && mode === 'watch' ? (
				<View style={styles.liveStrip}>
					<View style={styles.liveStatus}>
						<View style={styles.liveDot} />
						<View style={styles.liveText}>
							<Text style={styles.liveTitle}>Watching live</Text>
							<Text style={styles.muted}>
								{pendingVisit
									? `${playersById[pendingVisit.playerId]?.name ?? 'Player'} · Dart ${Math.min(visibleDarts + 1, pendingVisit.darts.length)} of ${pendingVisit.darts.length}`
									: 'Next player approaching the oche…'}
							</Text>
						</View>
					</View>
					<View style={styles.speedControls}>
						{([0.5, 1, 2] as const).map((option) => (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={`Set match speed to ${option} times`}
								key={option}
								onPress={() => setSpeed(option)}
								style={[styles.speedButton, speed === option && styles.speedButtonActive]}
							>
								<Text style={[styles.speedText, speed === option && styles.speedTextActive]}>{option}×</Text>
							</Pressable>
						))}
					</View>
				</View>
			) : match.status === 'in-progress' ? (
				<Card label="Manual simulation" title="You control the pace">
					<Text style={styles.muted}>Advance one visit, skip to the end of this leg, or finish the full match.</Text>
					<View style={styles.manualButtons}>
						<ActionButton label="Next Visit" disabled={busy} onPress={() => runManualAction(simulateNextVisit)} />
						<ActionButton label="Next Leg" variant="secondary" disabled={busy} onPress={() => runManualAction(simulateNextLeg)} />
						<ActionButton
							label="Finish Match"
							variant="ghost"
							disabled={busy}
							onPress={() => runManualAction(finishMatch)}
						/>
					</View>
				</Card>
			) : (
				<Card
					label={saveStatus === 'saved' ? 'Saved to career' : 'Persistence status'}
					title={`${playersById[match.winnerId ?? '']?.name ?? 'Winner'} wins`}
				>
					<Text style={styles.muted}>{saveStatusMessage(saveStatus)}</Text>
					{saveStatus === 'error' ? (
						<ActionButton label="Retry save" onPress={() => void persistIfComplete(match)} />
					) : null}
					{saveStatus === 'saved' || saveStatus === 'duplicate' ? (
						<ActionButton
							label={tournamentMatch ? 'Return to Tournament' : 'Read Match Messages'}
							onPress={() => tournamentMatch
								? router.replace(`/tournament/${tournamentMatch.tournamentId}`)
								: router.replace('/(tabs)')}
						/>
					) : null}
				</Card>
			)}

			<Card label="Live commentary" title={liveCommentary}>
				{recentCommentary.length === 0 ? (
					<Text style={styles.muted}>Choose Watch Match or Manual Controls to begin.</Text>
				) : recentCommentary.map((entry) => (
					<View key={entry.key} style={styles.feedRow}>
						<Text style={entry.checkout ? styles.checkoutDot : styles.feedDot}>●</Text>
						<Text style={styles.feedText}>
							{entry.text}
						</Text>
					</View>
				))}
			</Card>
		</AppScreen>
	);
}

function PlayerScore({
	name,
	legs,
	remaining,
	average,
	checkoutPercent,
	active,
	isHuman = false,
}: {
	name: string;
	legs: number;
	remaining: number;
	average: number;
	checkoutPercent: number;
	active: boolean;
	isHuman?: boolean;
}) {
	return (
		<View style={[styles.playerScore, active && styles.playerScoreActive]}>
			<Text style={styles.playerRole}>{isHuman ? 'YOU' : 'OPPONENT'}</Text>
			<Text numberOfLines={2} style={styles.playerName}>{name}</Text>
			<Text style={styles.legs}>{legs}</Text>
			<Text style={styles.remaining}>{remaining}</Text>
			<Text style={styles.average}>{average.toFixed(2)} avg</Text>
			<Text style={styles.average}>{checkoutPercent.toFixed(0)}% CO</Text>
		</View>
	);
}

function VisitScoreDisplay({
	visit,
	visibleDarts,
	playerName,
}: {
	visit?: Visit;
	visibleDarts?: number;
	playerName?: string;
}) {
	const shownCount = visibleDarts ?? visit?.darts.length ?? 0;
	const shownDarts = visit?.darts.slice(0, shownCount) ?? [];
	const total = shownDarts.reduce((sum, dart) => sum + dart.hit.score, 0);
	return (
		<View style={styles.visitDisplay}>
			<View style={styles.visitHeading}>
				<Text numberOfLines={1} style={styles.visitPlayer}>{playerName ?? 'Visit score'}</Text>
				<Text style={styles.visitStatus}>{visit?.bust && shownCount >= visit.darts.length ? 'BUST · 0 SCORED' : 'CURRENT VISIT'}</Text>
			</View>
			<View style={styles.dartScoreRow}>
				{[0, 1, 2].map((index) => {
					const dart = shownDarts[index];
					return (
						<View key={index} style={styles.dartScore}>
							<Text style={styles.dartLabel}>DART {index + 1}</Text>
							<Text style={styles.dartHit}>{dart?.hit.label ?? '—'}</Text>
							<Text style={styles.dartPoints}>{dart ? `${dart.hit.score} pts` : 'waiting'}</Text>
						</View>
					);
				})}
				<View style={styles.visitTotal}>
					<Text style={styles.totalLabel}>TOTAL</Text>
					<Text style={styles.totalValue}>{visit?.bust && shownCount >= visit.darts.length ? 0 : total}</Text>
				</View>
			</View>
		</View>
	);
}

function commentaryLine({
	careerPlayerId,
	commentary,
	match,
	pendingVisit,
	playersById,
	throwingPlayerId,
	visibleDarts,
}: {
	careerPlayerId: string;
	commentary?: string;
	match: MatchState;
	pendingVisit: Visit | null;
	playersById: Record<string, MatchConfig['players'][number]>;
	throwingPlayerId: string;
	visibleDarts: number;
}): string {
	const player = playersById[throwingPlayerId];
	const subject = throwingPlayerId === careerPlayerId ? 'You' : player?.name ?? 'Player';
	if (pendingVisit && visibleDarts > 0) {
		const shown = pendingVisit.darts.slice(0, visibleDarts);
		const visitTotal = shown.reduce((total, dart) => total + dart.hit.score, 0);
		const remaining = shown.at(-1)?.remainingAfter ?? pendingVisit.startScore;
		const hit = shown.at(-1)?.hit.label ?? 'the board';
		return `${subject} hit ${hit}. ${visitTotal} scored this visit, ${remaining} remaining.`;
	}

	const remaining = pendingVisit?.startScore ?? match.currentLeg.scores[throwingPlayerId] ?? 501;
	const route = findCheckoutRoute(remaining, 3);
	if (route) {
		return `${subject} ${throwingPlayerId === careerPlayerId ? 'require' : 'requires'} ${remaining}: ${route.map((target) => target.label).join(', ')}.`;
	}
	return commentary ?? `${subject} at the oche with ${remaining} remaining.`;
}

function liveStats(playerId: string, visits: readonly Visit[], legsWon: number) {
	return aggregatePlayerStats(playerId, [{
		legNumber: 0,
		startingPlayerId: playerId,
		winnerId: legsWon ? playerId : '',
		visits: [...visits],
		dartsByPlayer: {},
	}]);
}

function saveStatusMessage(status: SaveStatus): string {
	if (status === 'saved') {
		return 'Result and observed career statistics were committed atomically.';
	}
	if (status === 'duplicate') {
		return 'This result was already saved; statistics were not counted twice.';
	}
	if (status === 'error') {
		return 'The match finished, but saving failed. Retry without replaying the match.';
	}
	return status === 'saving' ? 'Saving result…' : 'Result ready to save.';
}

export default function MatchCentreScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const career = useCareerStore((state) => state.career);
	const league = useCareerStore((state) => state.league);
	const tournamentMatches = useCareerStore((state) => state.tournamentMatches);
	const darts = useCareerStore((state) => state.ownedDarts.find((set) => set.isEquipped) ?? null);
	if (!career) {
		return <MissingCareer />;
	}
	const fixture = league?.fixtures.find((candidate) => candidate.id === id);
	const opponent = fixture && league ? fixtureOpponent(league, fixture, career.playerId) : null;
	const tournamentMatch = tournamentMatches.find((candidate) => candidate.id === id);
	if (tournamentMatch) {
		const tournament = TOURNAMENT_CALENDAR.find((candidate) => candidate.id === tournamentMatch.tournamentId);
		const tournamentFixture: LeagueFixture = {
			id: tournamentMatch.id,
			season: tournamentMatch.edition,
			round: tournamentMatch.round,
			sequence: tournamentMatch.round,
			weekStart: career.inGameDate,
			date: tournamentMatch.date,
			homePlayerId: career.playerId,
			awayPlayerId: tournamentMatch.opponent.id,
			bestOf: tournamentMatch.bestOf,
			status: tournamentMatch.status,
			winnerId: tournamentMatch.winnerId,
			homeLegs: null,
			awayLegs: null,
			matchId: tournamentMatch.result?.id ?? null,
		};
		const tournamentOpponent: LeaguePlayer = {
			...tournamentMatch.opponent,
			isHuman: false,
			style: 'all-rounder',
		};
		return (
			<MatchGame
				key={tournamentMatch.id}
				career={career}
				fixture={tournamentFixture}
				opponent={tournamentOpponent}
				darts={darts}
				tournamentMatch={tournamentMatch}
				eventTitle={tournament?.name ?? 'Tournament'}
			/>
		);
	}
	if (!fixture || !opponent) {
		return (
			<AppScreen title="Fixture unavailable" subtitle="This league fixture could not be loaded.">
				<Card><Text style={styles.muted}>Return to Calendar and choose the current scheduled fixture.</Text></Card>
			</AppScreen>
		);
	}
	return <MatchGame key={fixture.id} career={career} fixture={fixture} opponent={opponent} darts={darts} />;
}

const styles = StyleSheet.create({
	broadcastStage: {
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderColor: colors.border,
		borderRadius: radii.lg,
		borderWidth: 1,
		flexDirection: 'row',
		gap: spacing.xs,
		justifyContent: 'center',
		paddingHorizontal: spacing.xs,
		paddingVertical: spacing.sm,
	},
	playerScore: {
		alignItems: 'center',
		borderColor: 'transparent',
		borderRadius: radii.md,
		borderWidth: 1,
		flex: 1,
		gap: 2,
		justifyContent: 'center',
		minHeight: 150,
		paddingHorizontal: 2,
	},
	playerScoreActive: {
		backgroundColor: colors.primaryMuted,
		borderColor: colors.primary,
	},
	visitDisplay: {
		backgroundColor: colors.surface,
		borderColor: colors.border,
		borderRadius: radii.md,
		borderWidth: 1,
		gap: spacing.sm,
		padding: spacing.sm,
	},
	visitHeading: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	visitPlayer: {
		color: colors.text,
		flex: 1,
		fontSize: typography.caption,
		fontWeight: '800',
	},
	visitStatus: {
		color: colors.primary,
		fontSize: 9,
		fontWeight: '900',
		letterSpacing: 0.7,
	},
	dartScoreRow: {
		flexDirection: 'row',
		gap: spacing.xs,
	},
	dartScore: {
		alignItems: 'center',
		backgroundColor: colors.surfaceRaised,
		borderRadius: radii.sm,
		flex: 1,
		gap: 1,
		minHeight: 62,
		justifyContent: 'center',
	},
	dartLabel: {
		color: colors.textMuted,
		fontSize: 8,
		fontWeight: '800',
	},
	dartHit: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '900',
	},
	dartPoints: {
		color: colors.textMuted,
		fontSize: 9,
	},
	visitTotal: {
		alignItems: 'center',
		backgroundColor: colors.primaryMuted,
		borderColor: colors.primary,
		borderRadius: radii.sm,
		borderWidth: 1,
		flex: 1.08,
		justifyContent: 'center',
	},
	totalLabel: {
		color: colors.primary,
		fontSize: 8,
		fontWeight: '900',
	},
	totalValue: {
		color: colors.text,
		fontSize: 24,
		fontVariant: ['tabular-nums'],
		fontWeight: '900',
	},
	playerRole: {
		color: colors.primary,
		fontSize: 8,
		fontWeight: '900',
		letterSpacing: 0.8,
	},
	playerName: {
		color: colors.text,
		fontSize: 11,
		fontWeight: '800',
		minHeight: 28,
		textAlign: 'center',
	},
	legs: {
		color: colors.primary,
		fontSize: 32,
		fontWeight: '900',
		fontVariant: ['tabular-nums'],
	},
	remaining: {
		color: colors.text,
		fontSize: 22,
		fontWeight: '800',
		fontVariant: ['tabular-nums'],
	},
	average: {
		color: colors.textMuted,
		fontSize: 12,
		fontVariant: ['tabular-nums'],
	},
	liveStrip: {
		backgroundColor: colors.primaryMuted,
		borderColor: colors.primary,
		borderRadius: radii.md,
		borderWidth: 1,
		gap: spacing.sm,
		padding: spacing.md,
	},
	liveStatus: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: spacing.sm,
	},
	liveDot: {
		backgroundColor: colors.primary,
		borderRadius: radii.pill,
		height: 12,
		width: 12,
	},
	liveText: {
		flex: 1,
		gap: 2,
	},
	liveTitle: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '800',
	},
	modeButtons: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	flexButton: {
		flex: 1,
	},
	manualButtons: {
		gap: spacing.sm,
	},
	speedControls: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	speedButton: {
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderColor: colors.border,
		borderRadius: radii.pill,
		borderWidth: 1,
		flex: 1,
		minHeight: 36,
		justifyContent: 'center',
	},
	speedButtonActive: {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
	},
	speedText: {
		color: colors.textMuted,
		fontSize: typography.caption,
		fontWeight: '800',
	},
	speedTextActive: {
		color: colors.background,
	},
	muted: {
		color: colors.textMuted,
		fontSize: typography.caption,
		lineHeight: 19,
	},
	feedRow: {
		alignItems: 'flex-start',
		borderTopColor: colors.border,
		borderTopWidth: 1,
		flexDirection: 'row',
		gap: spacing.sm,
		paddingTop: spacing.sm,
	},
	feedDot: {
		color: colors.textMuted,
		fontSize: 9,
		paddingTop: 4,
	},
	checkoutDot: {
		color: colors.primary,
		fontSize: 9,
		paddingTop: 4,
	},
	feedText: {
		color: colors.text,
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
	},
});

