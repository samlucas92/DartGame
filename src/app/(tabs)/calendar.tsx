import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { Card } from '../../components/Card';
import { MissingCareer } from '../../components/MissingCareer';
import {
	addInGameDays,
	createWeekPlan,
	WEEKLY_STRATEGY_DETAILS,
	type WeekEventKind,
} from '../../engine/calendar/weeklyAdvance';
import { currentHumanFixture, fixtureOpponent } from '../../data/repositories/leagueRepository';
import { TOURNAMENT_CALENDAR } from '../../data/seed/tournaments';
import { WEEKLY_STRATEGIES } from '../../domain/career';
import { blockingCareerMessages } from '../../domain/inbox';
import {
	tournamentEdition,
	tournamentEntryEligible,
	tournamentRegistrationStatus,
	weeksUntilTournament,
} from '../../domain/tournaments';
import { useCareerStore } from '../../state/careerStore';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import { formatCurrency } from '../../utils/format';

const EVENT_MARKS: Record<WeekEventKind, string> = {
	work: 'W',
	training: 'T',
	fixture: '◎',
	expense: '£',
};

export default function CalendarScreen() {
	const db = useSQLiteContext();
	const career = useCareerStore((state) => state.career);
	const trainingPlan = useCareerStore((state) => state.trainingPlan);
	const league = useCareerStore((state) => state.league);
	const coaching = useCareerStore((state) => state.coachingContract);
	const lifestyle = useCareerStore((state) => state.lifestyle);
	const sponsorship = useCareerStore((state) => state.sponsorshipContract);
	const tournamentEntries = useCareerStore((state) => state.tournamentEntries);
	const tournamentMatches = useCareerStore((state) => state.tournamentMatches);
	const messages = useCareerStore((state) => state.messages);
	const error = useCareerStore((state) => state.error);
	const busy = useCareerStore((state) => state.busy);
	const setWeeklyStrategy = useCareerStore((state) => state.setWeeklyStrategy);
	if (!career) {
		return <MissingCareer />;
	}
	const plan = createWeekPlan(
		career.inGameDate,
		career.background,
		lifestyle,
		career.weeksElapsed,
		career.weeklyStrategy,
	);
	const fixture = league ? currentHumanFixture(league, career) : null;
	const opponent = fixture && league ? fixtureOpponent(league, fixture, career.playerId) : null;
	const fixturePlayed = fixture?.status === 'complete';
	const requiredMessages = blockingCareerMessages(messages);
	const requiredMessage = requiredMessages[0];
	const pendingTournamentMatch = tournamentMatches.find((match) => match.status === 'scheduled');
	const canAdvance = fixturePlayed && trainingPlan !== null && requiredMessages.length === 0 && !pendingTournamentMatch;
	const upcomingTournaments = TOURNAMENT_CALENDAR
		.map((tournament) => ({
			...tournament,
			weeksAway: weeksUntilTournament(career.weeksElapsed, tournament.week),
			edition: tournamentEdition(career.weeksElapsed, tournament.week),
			registration: tournamentRegistrationStatus(career.weeksElapsed, tournament),
		}))
		.sort((left, right) => left.weeksAway - right.weeksAway)
		.slice(0, 6);
	let advanceHelper = 'Complete this week’s fixture before moving forward.';
	if (requiredMessages.length > 0) {
		advanceHelper = requiredMessage?.requiresResponse
			? 'Respond to the highlighted important message before moving forward.'
			: 'Read the highlighted priority message before moving forward.';
	} else if (pendingTournamentMatch) {
		advanceHelper = `Play your ${pendingTournamentMatch.roundLabel} tournament match before moving forward.`;
	} else if (!trainingPlan && !fixturePlayed) {
		advanceHelper = 'Save a training plan and complete the fixture before moving forward.';
	} else if (!trainingPlan) {
		advanceHelper = 'Save this week’s training plan before moving forward.';
	}


	return (
		<AppScreen
			eyebrow={`Season ${career.season}`}
			title="Calendar"
			subtitle={`${plan.fromDate} – ${plan.toDate}`}
		>
			{pendingTournamentMatch ? (
				<Card label="Tournament match due" title={`${pendingTournamentMatch.roundLabel} · ${pendingTournamentMatch.opponent.name}`}>
					<Text style={styles.warning}>Your entered tournament must be played before the calendar can advance.</Text>
					<ActionButton label="Play Tournament Match" onPress={() => router.push(`/match/${pendingTournamentMatch.id}`)} />
				</Card>
			) : null}
			{requiredMessage ? (
				<Card label="Progression paused" title={requiredMessage.requiresResponse ? 'A message needs your decision' : 'Read your priority messages'}>
					<Text style={styles.warning}>{requiredMessage.subject}</Text>
					<Text style={styles.detail}>
						{requiredMessage.requiresResponse
							? 'The week cannot be completed until you respond to this important correspondence.'
							: 'The week cannot be completed until required career correspondence has been opened.'}
					</Text>
					<ActionButton label="Open Messages" onPress={() => router.push('/(tabs)')} />
				</Card>
			) : null}
			<Card label="Career decision" title={WEEKLY_STRATEGY_DETAILS[career.weeklyStrategy].label}>
				<Text style={styles.detail}>{WEEKLY_STRATEGY_DETAILS[career.weeklyStrategy].description}</Text>
				<View style={styles.strategyGrid}>
					{WEEKLY_STRATEGIES.map((strategy) => {
						const selected = strategy === career.weeklyStrategy;
						return (
							<Pressable
								key={strategy}
								accessibilityRole="button"
								disabled={busy || selected}
								onPress={() => void setWeeklyStrategy(db, strategy)}
								style={[styles.strategy, selected ? styles.strategySelected : null]}
							>
								<Text style={selected ? styles.strategyTitleSelected : styles.strategyTitle}>
									{WEEKLY_STRATEGY_DETAILS[strategy].label}
								</Text>
								<Text style={styles.strategyDetail} numberOfLines={2}>
									{WEEKLY_STRATEGY_DETAILS[strategy].description}
								</Text>
							</Pressable>
						);
					})}
				</View>
				<Text style={styles.warning}>Changing strategy clears this week’s training plan.</Text>
			</Card>

			<Card label="This week" title="Local season schedule">
				{plan.events.map((event) => (
					<View
						key={event.id}
						style={[styles.event, event.kind === 'fixture' ? styles.fixtureEvent : null]}
					>
						<View style={styles.dayBadge}>
							<Text style={styles.day}>{event.dayLabel}</Text>
							<Text style={styles.dateNumber}>{Number(event.date.slice(8))}</Text>
						</View>
						<View style={[styles.kindBadge, styles[`${event.kind}Badge`]]}>
							<Text style={styles.kindMark}>{EVENT_MARKS[event.kind]}</Text>
						</View>
						<View style={styles.eventText}>
							<Text style={styles.eventTitle}>
								{event.kind === 'fixture' ? league?.name ?? event.title : event.title}
							</Text>
							<Text style={styles.detail}>
								{event.kind === 'fixture' && fixture
									? `${opponent?.name ?? 'Opponent'} · Best of ${fixture.bestOf}`
									: event.detail}
							</Text>
						</View>
					</View>
				))}
			</Card>

			<Card label="Four local events available this year" title="Tournament registration">
				{upcomingTournaments.map((tournament) => {
					const eligible = tournamentEntryEligible(career.tier, tournament);
					const entered = tournamentEntries.some((entry) => (
						entry.tournamentId === tournament.id && entry.edition === tournament.edition
					));
					const eventDate = addInGameDays(plan.fromDate, tournament.weeksAway * 7 + 5);
					const registrationText = entered
						? 'ENTRY CONFIRMED'
						: !eligible
							? `LOCKED · REQUIRES ${tournament.minimumTier.toUpperCase()}`
							: tournament.registration === 'open'
								? `${tournament.entryPolicy === 'open' ? 'OPEN ENTRY' : 'REGISTRATION OPEN'} · ${formatCurrency(tournament.entryFeePence)}`
								: tournament.registration === 'closed'
									? 'REGISTRATION CLOSED'
									: `OPENS IN ${tournament.weeksAway - tournament.registrationOpensWeeksBefore} WEEKS`;
					return (
						<Pressable
							key={tournament.id}
							accessibilityRole="button"
							onPress={() => router.push(`/tournament/${tournament.id}`)}
							style={styles.tournamentRow}
						>
							<View style={styles.weekPill}>
								<Text style={styles.weekNumber}>{tournament.weeksAway === 0 ? 'NOW' : tournament.weeksAway}</Text>
								<Text style={styles.weekLabel}>{tournament.weeksAway === 1 ? 'WK' : tournament.weeksAway === 0 ? 'LIVE' : 'WKS'}</Text>
							</View>
							<View style={styles.eventText}>
								<Text style={styles.eventTitle}>{tournament.name}</Text>
								<Text style={styles.detail}>{eventDate} · Recommended avg {tournament.recommendedAverage}</Text>
								<Text style={entered || (eligible && tournament.registration === 'open') ? styles.eligible : styles.locked}>
									{registrationText}
								</Text>
							</View>
							<Text style={styles.chevron}>›</Text>
						</Pressable>
					);
				})}
				<Text style={styles.detail}>Open an event to review its window, eligibility, format, prize and entry fee. Paid entries are saved and added to your finance ledger.</Text>
			</Card>

			<Card
				label={trainingPlan ? 'Repeating training plan' : 'Weekly balance'}
				title={trainingPlan
					? `${trainingPlan.totalHours}/${plan.practiceHours} practice hours planned`
					: `${plan.practiceHours} practice hours available`}
			>
				<View style={styles.moneyRow}>
					<Text style={styles.detail}>{plan.incomeDescription}</Text>
					<Text style={styles.income}>{plan.incomePence > 0 ? `+${formatCurrency(plan.incomePence)}` : 'Accruing'}</Text>
				</View>
				<View style={styles.moneyRow}>
					<Text style={styles.detail}>Living costs</Text>
					<Text style={styles.expense}>−{formatCurrency(plan.livingCostPence)}</Text>
				</View>
				{coaching ? (
					<View style={styles.moneyRow}>
						<Text style={styles.detail}>{coaching.name} coaching</Text>
						<Text style={styles.expense}>−{formatCurrency(coaching.weeklyCostPence)}</Text>
					</View>
				) : null}
				{sponsorship ? (
					<View style={styles.moneyRow}>
						<Text style={styles.detail}>{sponsorship.name}</Text>
						<Text style={styles.income}>+{formatCurrency(sponsorship.weeklyPaymentPence)}</Text>
					</View>
				) : null}
				<View style={styles.divider} />
				<Text style={styles.detail}>Work adds {plan.fatigueDelta}% fatigue before training load.</Text>
			</Card>

			<ActionButton
				label={trainingPlan ? 'Edit Training Plan' : 'Plan Training'}
				variant="secondary"
				onPress={() => router.push('/training')}
			/>
			{canAdvance ? <Text style={styles.ready}>All requirements complete · use the green action above.</Text> : null}
			{!canAdvance ? (
				<Text style={styles.helper}>{advanceHelper}</Text>
			) : null}
			{error ? <Text style={styles.error}>{error}</Text> : null}
		</AppScreen>
	);
}

const styles = StyleSheet.create({
	event: {
		alignItems: 'center',
		backgroundColor: colors.surfaceRaised,
		borderColor: colors.surfaceRaised,
		borderRadius: radii.sm,
		borderWidth: 1,
		flexDirection: 'row',
		gap: spacing.sm,
		minHeight: 62,
		padding: spacing.sm,
	},
	fixtureEvent: {
		borderColor: colors.primary,
	},
	dayBadge: {
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 44,
		width: 42,
	},
	day: {
		color: colors.textMuted,
		fontSize: 11,
		fontWeight: '800',
	},
	dateNumber: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '800',
	},
	kindBadge: {
		alignItems: 'center',
		borderRadius: radii.sm,
		height: 42,
		justifyContent: 'center',
		width: 42,
	},
	workBadge: {
		backgroundColor: '#593322',
	},
	trainingBadge: {
		backgroundColor: '#164532',
	},
	fixtureBadge: {
		backgroundColor: '#69510f',
	},
	expenseBadge: {
		backgroundColor: '#263f62',
	},
	kindMark: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '900',
	},
	eventText: {
		flex: 1,
		gap: 2,
	},
	eventTitle: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '600',
	},
	detail: {
		color: colors.textMuted,
		fontSize: typography.caption,
		lineHeight: 18,
	},
	moneyRow: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	income: {
		color: colors.primary,
		fontSize: typography.caption,
		fontWeight: '800',
	},
	expense: {
		color: colors.danger,
		fontSize: typography.caption,
		fontWeight: '800',
	},
	divider: {
		backgroundColor: colors.border,
		height: 1,
	},
	helper: {
		color: colors.textMuted,
		fontSize: typography.caption,
		textAlign: 'center',
	},
	error: {
		color: colors.danger,
		fontSize: typography.caption,
		textAlign: 'center',
	},
	ready: {
		color: colors.primary,
		fontSize: typography.caption,
		fontWeight: '800',
		textAlign: 'center',
	},
	strategyGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
	},
	strategy: {
		backgroundColor: colors.surfaceRaised,
		borderColor: colors.border,
		borderRadius: radii.sm,
		borderWidth: 1,
		minHeight: 78,
		padding: spacing.sm,
		width: '48%',
	},
	strategySelected: {
		backgroundColor: colors.primaryMuted,
		borderColor: colors.primary,
	},
	strategyTitle: {
		color: colors.text,
		fontSize: typography.caption,
		fontWeight: '800',
	},
	strategyTitleSelected: {
		color: colors.primary,
		fontSize: typography.caption,
		fontWeight: '800',
	},
	strategyDetail: {
		color: colors.textMuted,
		fontSize: 11,
		lineHeight: 15,
		marginTop: spacing.xs,
	},
	warning: {
		color: colors.warning,
		fontSize: 11,
	},
	tournamentRow: {
		alignItems: 'center',
		borderTopColor: colors.border,
		borderTopWidth: 1,
		flexDirection: 'row',
		gap: spacing.sm,
		paddingVertical: spacing.sm,
	},
	weekPill: {
		alignItems: 'center',
		backgroundColor: colors.surfaceRaised,
		borderRadius: radii.sm,
		justifyContent: 'center',
		minHeight: 48,
		width: 48,
	},
	weekNumber: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '900',
	},
	weekLabel: {
		color: colors.textMuted,
		fontSize: 9,
		fontWeight: '800',
	},
	eligible: {
		color: colors.primary,
		fontSize: 11,
		fontWeight: '700',
	},
	locked: {
		color: colors.warning,
		fontSize: 11,
		fontWeight: '700',
	},
	chevron: {
		color: colors.textMuted,
		fontSize: 26,
	},
});

