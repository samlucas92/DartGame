import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { MissingCareer } from '../components/MissingCareer';
import { COACH_OPTIONS } from '../data/seed/coaching';
import type { CoachingFocus } from '../domain/coaching';
import { useCareerStore } from '../state/careerStore';
import { colors, spacing, typography } from '../theme/tokens';
import { formatCurrency, titleCase } from '../utils/format';

export default function CoachingScreen() {
	const db = useSQLiteContext();
	const career = useCareerStore((state) => state.career);
	const contract = useCareerStore((state) => state.coachingContract);
	const hireCoach = useCareerStore((state) => state.hireCoach);
	const cancelCoach = useCareerStore((state) => state.cancelCoach);
	const setCoachFocus = useCareerStore((state) => state.setCoachFocus);
	const busy = useCareerStore((state) => state.busy);
	const error = useCareerStore((state) => state.error);
	if (!career) {
		return <MissingCareer />;
	}
	const focusOptions: CoachingFocus[] = ['balanced', 'scoring', 'finishing', 'consistency', 'composure', 'stamina'];

	return (
		<AppScreen
			eyebrow="Player development"
			title="Coaching"
			subtitle="Choose one ongoing weekly arrangement. Fees are charged when the week is completed."
		>
			{contract ? (
				<Card label="Current coach" title={contract.name}>
					<Text style={styles.body}>{titleCase(contract.mode)} coaching</Text>
					<Text style={styles.muted}>
						{formatCurrency(contract.weeklyCostPence)} per week · {Math.round(contract.developmentBonus * 100)}% training development bonus
					</Text>
					<Text style={styles.insight}>“{contract.insight}”</Text>
					<Text style={styles.focusLabel}>SET THIS WEEK’S COACHING FOCUS</Text>
					<View style={styles.focusWrap}>
						{focusOptions.map((focus) => {
							const selected = contract.focus === focus;
							return (
								<Pressable
									key={focus}
									accessibilityRole="button"
									disabled={busy || selected}
									onPress={() => void setCoachFocus(db, focus)}
									style={[styles.focusChip, selected ? styles.focusChipSelected : null]}
								>
									<Text style={selected ? styles.focusTextSelected : styles.focusText}>
										{titleCase(focus)}
									</Text>
								</Pressable>
							);
						})}
					</View>
					<Text style={styles.muted}>Focused training receives the strongest bonus. Your coach will send a weekly review to Messages.</Text>
					<ActionButton
						label="End Coaching Arrangement"
						variant="secondary"
						disabled={busy}
						onPress={() => void cancelCoach(db)}
					/>
				</Card>
			) : null}

			{COACH_OPTIONS.map((coach) => {
				const active = contract?.id === coach.id;
				const affordable = career.bankBalancePence >= coach.weeklyCostPence;
				return (
					<Card key={coach.id} label={titleCase(coach.mode)} title={coach.name}>
						<Text style={styles.body}>{coach.description}</Text>
						<Text style={styles.insight}>Specialty · {titleCase(coach.specialty)}</Text>
						<View style={styles.detailRow}>
							<Text style={styles.muted}>{formatCurrency(coach.weeklyCostPence)} / week</Text>
							<Text style={styles.bonus}>+{Math.round(coach.developmentBonus * 100)}% development chance</Text>
						</View>
						<ActionButton
							label={active ? 'Currently Hired' : affordable ? `Hire ${coach.name}` : 'Insufficient Balance'}
							disabled={active || busy || !affordable}
							onPress={() => void hireCoach(db, coach)}
						/>
					</Card>
				);
			})}
			{error ? <Text style={styles.error}>{error}</Text> : null}
			<ActionButton label="Back to Training" variant="ghost" onPress={() => router.back()} />
		</AppScreen>
	);
}

const styles = StyleSheet.create({
	body: {
		color: colors.text,
		fontSize: typography.body,
		lineHeight: 21,
	},
	muted: {
		color: colors.textMuted,
		fontSize: typography.caption,
		lineHeight: 19,
	},
	detailRow: {
		alignItems: 'center',
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
		justifyContent: 'space-between',
	},
	bonus: {
		color: colors.primary,
		fontSize: typography.caption,
		fontWeight: '800',
	},
	error: {
		color: colors.danger,
		fontSize: typography.caption,
		textAlign: 'center',
	},
	insight: {
		color: colors.primary,
		fontSize: typography.caption,
		lineHeight: 19,
	},
	focusLabel: {
		color: colors.textMuted,
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 1,
	},
	focusWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
	},
	focusChip: {
		backgroundColor: colors.surfaceRaised,
		borderColor: colors.border,
		borderRadius: 999,
		borderWidth: 1,
		minHeight: 44,
		justifyContent: 'center',
		paddingHorizontal: spacing.md,
	},
	focusChipSelected: {
		backgroundColor: colors.primaryMuted,
		borderColor: colors.primary,
	},
	focusText: {
		color: colors.textMuted,
		fontSize: typography.caption,
		fontWeight: '700',
	},
	focusTextSelected: {
		color: colors.primary,
		fontSize: typography.caption,
		fontWeight: '800',
	},
});

