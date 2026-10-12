import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { QuickActionBar } from '../components/QuickActionBar';
import { useCareerStore } from '../state/careerStore';
import { TRAINING_FOCUSES } from '../engine/training/training';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatCurrency } from '../utils/format';

export default function WeekSummaryScreen() {
	const career = useCareerStore((state) => state.career);
	const latestMatch = useCareerStore((state) => state.latestMatch);
	const summary = useCareerStore((state) => state.latestWeekSummary);
	const league = useCareerStore((state) => state.league);

	if (!career || !summary) {
		return (
			<AppScreen title="Week Complete" subtitle="No completed week is available yet.">
				<ActionButton label="Return to Calendar" onPress={() => router.replace('/calendar')} />
			</AppScreen>
		);
	}

	const weekFixture = league?.fixtures.find((fixture) => (
		fixture.weekStart === summary.fromDate
		&& (fixture.homePlayerId === career.playerId || fixture.awayPlayerId === career.playerId)
	));
	const weekMatch = latestMatch && weekFixture?.matchId === latestMatch.id ? latestMatch : null;
	const opponent = weekMatch?.players.find((player) => player.id !== career.playerId);
	const matchDetail = weekMatch && opponent
		? `${weekMatch.winnerId === career.playerId ? 'Won' : 'Lost'} ${weekMatch.legsWon[career.playerId] ?? 0}–${weekMatch.legsWon[opponent.id] ?? 0} vs ${opponent.name}`
		: 'No fixture result recorded';
	const trainingDetail = summary.training
		? `${summary.training.totalHours} hours · ${trainingChangeLabel(summary.training.attributeChanges)}`
		: 'No training plan was resolved';

	return (
		<AppScreen
			eyebrow={`${summary.fromDate} – ${summary.toDate}`}
			title="Week Complete"
			subtitle="Every scheduled transaction was committed once to your local career save."
		>
			<QuickActionBar
				title="Next week is ready"
				detail={`Season ${career.season} · ${career.inGameDate}`}
				buttonLabel="Check Messages"
				onPress={() => router.replace('/(tabs)')}
			/>
			<Card>
				<SummaryRow mark="T" title="Training" detail={trainingDetail} />
				{summary.coachingCostPence > 0 ? (
					<SummaryRow
						mark="C"
						title="Coaching"
						detail={`${summary.coachName ?? 'Coach'} · −${formatCurrency(summary.coachingCostPence)}`}
					/>
				) : null}
				<SummaryRow
					mark="W"
					title="Work"
					detail={summary.incomePence > 0
						? `${summary.workHours} hours · payday +${formatCurrency(summary.incomePence)}`
						: `${summary.workHours} hours · wages accruing until monthly payday`}
				/>
				{summary.sponsorshipIncomePence > 0 ? (
					<SummaryRow mark="S" title="Sponsorship" detail={`${summary.sponsorName} · +${formatCurrency(summary.sponsorshipIncomePence)}`} />
				) : null}
				<SummaryRow mark="◎" title="Lantern League" detail={matchDetail} />
				<SummaryRow mark="£" title="Living costs" detail={`−${formatCurrency(summary.livingCostPence)}`} />
				<SummaryRow mark="✓" title="Calendar saved" detail={`Now ${summary.toDate}`} success />
				{summary.ageAfter > summary.ageBefore ? (
					<SummaryRow mark="★" title="Birthday" detail={`You are now ${summary.ageAfter}`} success />
				) : null}
			</Card>

			<Card label="Finances" title={`${summary.netChangePence >= 0 ? '+' : '−'}${formatCurrency(Math.abs(summary.netChangePence))} this week`}>
				<View style={styles.balanceRow}>
					<Text style={styles.muted}>New balance</Text>
					<Text style={styles.balance}>{formatCurrency(summary.endingBalancePence)}</Text>
				</View>
				<View style={styles.balanceRow}>
					<Text style={styles.muted}>Fatigue</Text>
					<Text style={styles.body}>{summary.fatigueBefore}% → {summary.fatigueAfter}%</Text>
				</View>
			</Card>

			<Card label="Next week" title={`${summary.practiceHours} practice hours already planned`}>
				<Text style={styles.muted}>
					Your current training allocation will repeat automatically. Edit it only when you want to change focus.
				</Text>
			</Card>

			<ActionButton label="Continue to Messages" onPress={() => router.replace('/(tabs)')} />
		</AppScreen>
	);
}

function trainingChangeLabel(changes: Record<(typeof TRAINING_FOCUSES)[number], number>): string {
	const improvements = TRAINING_FOCUSES
		.filter((focus) => changes[focus] > 0)
		.map((focus) => `${focus} +${changes[focus]}`);
	return improvements.length > 0 ? improvements.join(', ') : 'no attribute gain this week';
}

function SummaryRow({
	mark,
	title,
	detail,
	success = false,
}: {
	mark: string;
	title: string;
	detail: string;
	success?: boolean;
}) {
	return (
		<View style={styles.summaryRow}>
			<View style={[styles.summaryMark, success ? styles.successMark : null]}>
				<Text style={styles.markText}>{mark}</Text>
			</View>
			<View style={styles.summaryText}>
				<Text style={styles.body}>{title}</Text>
				<Text style={styles.muted}>{detail}</Text>
			</View>
			<View style={styles.check}>
				<Text style={styles.checkText}>✓</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	summaryRow: {
		alignItems: 'center',
		backgroundColor: colors.surfaceRaised,
		borderRadius: radii.sm,
		flexDirection: 'row',
		gap: spacing.sm,
		minHeight: 62,
		padding: spacing.sm,
	},
	summaryMark: {
		alignItems: 'center',
		backgroundColor: '#263f62',
		borderRadius: radii.sm,
		height: 42,
		justifyContent: 'center',
		width: 42,
	},
	successMark: {
		backgroundColor: colors.primaryMuted,
	},
	markText: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '900',
	},
	summaryText: {
		flex: 1,
		gap: 2,
	},
	body: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '700',
	},
	muted: {
		color: colors.textMuted,
		fontSize: typography.caption,
		lineHeight: 18,
	},
	check: {
		alignItems: 'center',
		backgroundColor: colors.primary,
		borderRadius: radii.pill,
		height: 24,
		justifyContent: 'center',
		width: 24,
	},
	checkText: {
		color: colors.background,
		fontSize: typography.caption,
		fontWeight: '900',
	},
	balanceRow: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	balance: {
		color: colors.primary,
		fontSize: typography.heading,
		fontWeight: '900',
		fontVariant: ['tabular-nums'],
	},
});

