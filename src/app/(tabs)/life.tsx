import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { Card } from '../../components/Card';
import { MissingCareer } from '../../components/MissingCareer';
import { HousingImage } from '../../components/HousingImage';
import { StatTile } from '../../components/StatTile';
import { weeklyCommitments } from '../../engine/calendar/weeklyAdvance';
import { useCareerStore } from '../../state/careerStore';
import { colors, spacing, typography } from '../../theme/tokens';
import { formatCurrency, titleCase } from '../../utils/format';

export default function LifeScreen() {
	const career = useCareerStore((state) => state.career);
	const ledgerEntries = useCareerStore((state) => state.ledgerEntries);
	const lifestyle = useCareerStore((state) => state.lifestyle);
	const sponsorship = useCareerStore((state) => state.sponsorshipContract);
	if (!career) {
		return <MissingCareer />;
	}
	const commitments = weeklyCommitments(career.background, lifestyle, career.weeklyStrategy);

	return (
		<AppScreen
			eyebrow={titleCase(career.background)}
			title="Life"
			subtitle="One balance covers career and lifestyle decisions."
		>
			<HousingImage homeId={lifestyle?.home.id} />
			<View style={styles.statsRow}>
				<StatTile label="Available" value={formatCurrency(career.bankBalancePence)} />
				<StatTile label="Fatigue" value={`${career.fatigue}%`} />
			</View>

			<Card label="Current lifestyle" title={lifestyle?.home.name ?? 'Shared Flat'}>
				<Text style={styles.body}>
					{lifestyle?.transport.name ?? 'Bus & Rail Pass'} · {lifestyle?.practice.name ?? 'Local Club Board'}
				</Text>
				<Text style={styles.muted}>
					Essentials and active lifestyle cost {formatCurrency(commitments.livingCostPence)} each week.
				</Text>
				<ActionButton label="Lifestyle Shop & Experiences" onPress={() => router.push('/lifestyle')} />
			</Card>

			<Card label="Commercial" title={sponsorship?.name ?? 'No active sponsor'}>
				<Text style={styles.body}>
					{sponsorship
						? `${formatCurrency(sponsorship.weeklyPaymentPence)} weekly partner income`
						: 'Match experience and wins unlock local sponsorship offers.'}
				</Text>
				<ActionButton label="View Sponsorship Offers" variant="secondary" onPress={() => router.push('/sponsorships')} />
			</Card>

			<Card label="Real ledger" title="Recent activity">
				{ledgerEntries.slice(0, 6).map((entry) => (
					<View key={entry.id} style={styles.ledgerRow}>
						<View style={styles.ledgerText}>
							<Text style={styles.body}>{entry.description}</Text>
							<Text style={styles.muted}>{entry.inGameDate}</Text>
						</View>
						<Text style={entry.amountPence >= 0 ? styles.income : styles.expense}>
							{entry.amountPence >= 0 ? '+' : '−'}{formatCurrency(Math.abs(entry.amountPence))}
						</Text>
					</View>
				))}
			</Card>

			<Card label="Career support" title="Coaching and equipment">
				<Text style={styles.body}>Improve your practice support or change the darts you take into matches.</Text>
				<ActionButton label="Manage Coaching" variant="secondary" onPress={() => router.push('/coaching')} />
				<ActionButton label="Manage Darts" variant="secondary" onPress={() => router.push('/equipment')} />
			</Card>

			<Card label="Offline career" title="Save and settings">
				<Text style={styles.muted}>Career actions auto-save to the device. You can also create an explicit save checkpoint.</Text>
				<ActionButton label="Save Career" variant="secondary" onPress={() => router.push('/settings')} />
			</Card>
		</AppScreen>
	);
}

const styles = StyleSheet.create({
	statsRow: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	ledgerRow: {
		alignItems: 'center',
		borderTopColor: colors.border,
		borderTopWidth: 1,
		flexDirection: 'row',
		gap: spacing.sm,
		justifyContent: 'space-between',
		paddingTop: spacing.sm,
	},
	ledgerText: {
		flex: 1,
		gap: 2,
	},
	body: {
		color: colors.text,
		fontSize: typography.body,
	},
	muted: {
		color: colors.textMuted,
		fontSize: typography.caption,
		lineHeight: 19,
	},
	income: {
		color: colors.primary,
		fontSize: typography.body,
		fontWeight: '700',
		fontVariant: ['tabular-nums'],
	},
	expense: {
		color: colors.danger,
		fontSize: typography.body,
		fontWeight: '700',
		fontVariant: ['tabular-nums'],
	},
});

