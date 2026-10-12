import { useSQLiteContext } from 'expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { Card } from '../../components/Card';
import { MissingCareer } from '../../components/MissingCareer';
import { TOURNAMENT_CALENDAR } from '../../data/seed/tournaments';
import {
	tournamentEdition,
	tournamentEntryEligible,
	tournamentRegistrationStatus,
	weeksUntilTournament,
} from '../../domain/tournaments';
import { addInGameDays } from '../../engine/calendar/weeklyAdvance';
import { useCareerStore } from '../../state/careerStore';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import { formatAverage, formatCurrency } from '../../utils/format';

export default function TournamentScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const db = useSQLiteContext();
	const career = useCareerStore((state) => state.career);
	const entries = useCareerStore((state) => state.tournamentEntries);
	const tournamentMatches = useCareerStore((state) => state.tournamentMatches);
	const enter = useCareerStore((state) => state.enterTournament);
	const busy = useCareerStore((state) => state.busy);
	const error = useCareerStore((state) => state.error);
	if (!career) {
		return <MissingCareer />;
	}
	const tournament = TOURNAMENT_CALENDAR.find((candidate) => candidate.id === id);
	if (!tournament) {
		return <AppScreen title="Tournament unavailable" subtitle="This event could not be found." />;
	}

	const weeksAway = weeksUntilTournament(career.weeksElapsed, tournament.week);
	const edition = tournamentEdition(career.weeksElapsed, tournament.week);
	const registration = tournamentRegistrationStatus(career.weeksElapsed, tournament);
	const eligible = tournamentEntryEligible(career.tier, tournament);
	const careerAverage = Number(formatAverage(career.stats.pointsScored, career.stats.dartsThrown)) || 0;
	const entry = entries.find((candidate) => (
		candidate.tournamentId === tournament.id && candidate.edition === edition
	));
	const entered = Boolean(entry);
	const activeMatch = entry ? tournamentMatches.find((match) => (
		match.entryId === entry.id && match.status === 'scheduled'
	)) : undefined;
	const affordable = career.bankBalancePence >= tournament.entryFeePence;
	const eventDate = addInGameDays(career.inGameDate, weeksAway * 7 + 5);
	const opensDate = addInGameDays(eventDate, -tournament.registrationOpensWeeksBefore * 7);
	const closesDate = addInGameDays(eventDate, -tournament.registrationClosesWeeksBefore * 7);
	const canEnter = registration === 'open' && eligible && affordable && !entered;
	const buttonLabel = entered
		? 'Entry Confirmed'
		: !eligible
			? `Requires ${tournament.minimumTier}`
			: registration === 'upcoming'
				? `Registration opens ${opensDate}`
				: registration === 'closed'
					? 'Registration Closed'
					: !affordable
						? `Need ${formatCurrency(tournament.entryFeePence)}`
						: `Enter · ${formatCurrency(tournament.entryFeePence)}`;

	const handleEntry = async () => {
		try {
			await enter(db, tournament);
		} catch {
			// The store exposes the actionable error below the entry button.
		}
	};

	return (
		<AppScreen
			eyebrow={`${tournament.level} · Edition ${edition}`}
			title={tournament.name}
			subtitle={`${tournament.venue} · ${eventDate}`}
		>
			{entry ? (
				<Card
					label={entry.status === 'champion' ? 'Tournament won' : entry.status === 'eliminated' ? 'Tournament complete' : 'Your next match'}
					title={entry.status === 'champion'
						? 'Champion'
						: entry.status === 'eliminated'
							? `Eliminated after ${entry.matchesWon} win${entry.matchesWon === 1 ? '' : 's'}`
							: activeMatch
								? `${activeMatch.roundLabel} · ${activeMatch.opponent.name}`
								: 'Draw processing'}
				>
					{activeMatch ? (
						<>
							<Text style={styles.body}>Best of {activeMatch.bestOf} · Match {activeMatch.round} of {activeMatch.totalRounds} on the route to the title.</Text>
							<ActionButton label={`Play ${activeMatch.roundLabel}`} onPress={() => router.push(`/match/${activeMatch.id}`)} />
						</>
					) : (
						<Text style={styles.body}>
							{entry.status === 'champion'
								? `${formatCurrency(entry.prizeMoneyPence)} has been added to your balance.`
								: 'Your result and tournament record have been saved.'}
						</Text>
					)}
				</Card>
			) : null}

			<Card
				label={entered ? 'You are entered' : registration === 'open' ? 'Registration open' : 'Registration window'}
				title={weeksAway === 0 ? 'Tournament week' : `${weeksAway} week${weeksAway === 1 ? '' : 's'} away`}
			>
				<View style={styles.dateRow}>
					<DateItem label="Opens" value={opensDate} active={registration === 'open'} />
					<DateItem label="Closes" value={closesDate} active={registration === 'open'} />
					<DateItem label="Plays" value={eventDate} active={weeksAway === 0} />
				</View>
				<ActionButton label={buttonLabel} disabled={!canEnter || busy} onPress={() => void handleEntry()} />
				{error ? <Text style={styles.error}>{error}</Text> : null}
			</Card>

			<Card label="Competition" title={tournament.format}>
				<Text style={styles.body}>{tournament.decision}</Text>
				<View style={styles.prizeRow}>
					<View style={styles.prize}>
						<Text style={styles.value}>{formatCurrency(tournament.entryFeePence)}</Text>
						<Text style={styles.label}>ENTRY FEE</Text>
					</View>
					<View style={styles.prize}>
						<Text style={styles.value}>{tournament.firstPrizePence > 0 ? formatCurrency(tournament.firstPrizePence) : 'Tour card'}</Text>
						<Text style={styles.label}>TOP REWARD</Text>
					</View>
				</View>
			</Card>

			<Card
				label={tournament.entryPolicy === 'open' ? 'Open entry' : 'Entry conditions'}
				title={tournament.entryPolicy === 'open' ? 'No qualification required' : eligible ? 'Career level accepted' : 'Career level locked'}
			>
				<Text style={eligible ? styles.eligible : styles.locked}>
					{tournament.entryPolicy === 'open'
						? `Recommended average ${tournament.recommendedAverage} · Your recorded average ${careerAverage || '—'}`
						: `Your status: ${career.tier} · Minimum: ${tournament.minimumTier}`}
				</Text>
				{tournament.entryPolicy === 'open' && careerAverage > 0 && careerAverage < tournament.recommendedAverage ? (
					<Text style={styles.warning}>The field is likely above your current average, but you may still pay and enter.</Text>
				) : null}
				<Text style={styles.body}>
					Entry is saved permanently for this edition. The fee is taken immediately and appears in your finance ledger.
				</Text>
			</Card>
		</AppScreen>
	);
}

function DateItem({ label, value, active }: { label: string; value: string; active: boolean }) {
	return (
		<View style={[styles.dateItem, active ? styles.dateItemActive : null]}>
			<Text style={styles.label}>{label}</Text>
			<Text style={styles.dateValue}>{value.slice(5)}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	dateRow: {
		flexDirection: 'row',
		gap: spacing.xs,
	},
	dateItem: {
		alignItems: 'center',
		backgroundColor: colors.surfaceRaised,
		borderColor: colors.border,
		borderRadius: radii.sm,
		borderWidth: 1,
		flex: 1,
		gap: 2,
		padding: spacing.sm,
	},
	dateItemActive: {
		backgroundColor: colors.primaryMuted,
		borderColor: colors.primary,
	},
	label: {
		color: colors.textMuted,
		fontSize: 9,
		fontWeight: '800',
		letterSpacing: 0.7,
	},
	dateValue: {
		color: colors.text,
		fontSize: typography.caption,
		fontWeight: '800',
	},
	body: {
		color: colors.textMuted,
		fontSize: typography.caption,
		lineHeight: 19,
	},
	prizeRow: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	prize: {
		backgroundColor: colors.surfaceRaised,
		borderRadius: radii.sm,
		flex: 1,
		gap: spacing.xs,
		padding: spacing.md,
	},
	value: {
		color: colors.text,
		fontSize: typography.heading,
		fontWeight: '900',
	},
	eligible: {
		color: colors.primary,
		fontSize: typography.caption,
		fontWeight: '800',
	},
	locked: {
		color: colors.warning,
		fontSize: typography.caption,
		fontWeight: '800',
	},
	warning: {
		color: colors.warning,
		fontSize: typography.caption,
		lineHeight: 19,
	},
	error: {
		color: colors.danger,
		fontSize: typography.caption,
	},
});

