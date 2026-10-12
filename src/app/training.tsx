import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { MissingCareer } from '../components/MissingCareer';
import { weeklyCommitments } from '../engine/calendar/weeklyAdvance';
import {
	emptyTrainingAllocation,
	TRAINING_FOCUSES,
	trainingHours,
	type TrainingAllocation,
	type TrainingFocus,
} from '../engine/training/training';
import { useCareerStore } from '../state/careerStore';
import { colors, radii, spacing, typography } from '../theme/tokens';

const FOCUS_DETAILS: Record<TrainingFocus, { label: string; detail: string; color: string }> = {
	scoring: { label: 'Scoring', detail: 'Treble accuracy and scoring power', color: '#3c74bf' },
	finishing: { label: 'Finishing', detail: 'Doubles and checkout execution', color: '#b77d13' },
	consistency: { label: 'Consistency', detail: 'Reduces visit-to-visit variance', color: '#6b4cb4' },
	composure: { label: 'Composure', detail: 'Performance under pressure', color: '#208a56' },
	stamina: { label: 'Stamina', detail: 'Maintains form through long matches', color: '#a83b67' },
};

export default function TrainingScreen() {
	const db = useSQLiteContext();
	const career = useCareerStore((state) => state.career);
	const storedPlan = useCareerStore((state) => state.trainingPlan);
	const saveTrainingPlan = useCareerStore((state) => state.saveTrainingPlan);
	const busy = useCareerStore((state) => state.busy);
	const error = useCareerStore((state) => state.error);
	const coaching = useCareerStore((state) => state.coachingContract);
	const lifestyle = useCareerStore((state) => state.lifestyle);
	const [allocation, setAllocation] = useState<TrainingAllocation>(() => (
		storedPlan?.allocations ?? emptyTrainingAllocation()
	));

	if (!career) {
		return <MissingCareer />;
	}

	const availableHours = weeklyCommitments(
		career.background,
		lifestyle,
		career.weeklyStrategy,
	).practiceHours;
	const allocatedHours = trainingHours(allocation);
	const remainingHours = availableHours - allocatedHours;

	const changeHours = (focus: TrainingFocus, change: number) => {
		setAllocation((current) => {
			const nextValue = current[focus] + change;
			if (nextValue < 0 || (change > 0 && trainingHours(current) >= availableHours)) {
				return current;
			}
			return { ...current, [focus]: nextValue };
		});
	};

	const useBalancedPlan = () => {
		const baseHours = Math.floor(availableHours / TRAINING_FOCUSES.length);
		const extraHours = availableHours % TRAINING_FOCUSES.length;
		setAllocation(Object.fromEntries(TRAINING_FOCUSES.map((focus, index) => (
			[focus, baseHours + (index < extraHours ? 1 : 0)]
		))) as TrainingAllocation);
	};

	const save = async () => {
		try {
			await saveTrainingPlan(db, allocation);
			router.back();
		} catch {
			// The store exposes the actionable error below the controls.
		}
	};

	return (
		<AppScreen
			eyebrow={`Week of ${career.inGameDate}`}
			title="Training Plan"
			subtitle="Your saved allocation repeats every week. Every trained area earns visible, predictable development progress."
		>
			<View style={styles.capacityRow}>
				<View>
					<Text style={styles.capacityNumber}>{remainingHours}</Text>
					<Text style={styles.capacityLabel}>Hours remaining</Text>
				</View>
				<View style={styles.capacityMeta}>
					<Text style={styles.metaValue}>{allocatedHours} / {availableHours}</Text>
					<Text style={styles.capacityLabel}>Allocated</Text>
				</View>
			</View>

			<Card label="Weekly focus" title="Practice allocation">
				{TRAINING_FOCUSES.map((focus) => (
					<TrainingRow
						key={focus}
						focus={focus}
						hours={allocation[focus]}
						attribute={career.attributes[focus]}
						progress={career.developmentProgress[focus]}
						canAdd={remainingHours > 0}
						onChange={changeHours}
					/>
				))}
			</Card>

			<ActionButton label="Use Balanced Plan" variant="ghost" onPress={useBalancedPlan} />
			<ActionButton
				label={coaching ? `Coach · ${coaching.name}` : 'Find a Coach'}
				variant="secondary"
				onPress={() => router.push('/coaching')}
			/>
			<ActionButton
				label={busy ? 'Saving plan…' : allocatedHours === 0 ? 'Save Rest Week' : 'Save Training Plan'}
				disabled={busy}
				onPress={() => void save()}
			/>
			{error ? <Text style={styles.error}>{error}</Text> : null}
		</AppScreen>
	);
}

function TrainingRow({
	focus,
	hours,
	attribute,
	progress,
	canAdd,
	onChange,
}: {
	focus: TrainingFocus;
	hours: number;
	attribute: number;
	progress: number;
	canAdd: boolean;
	onChange: (focus: TrainingFocus, change: number) => void;
}) {
	const details = FOCUS_DETAILS[focus];
	return (
		<View style={styles.trainingRow}>
			<View style={[styles.focusMark, { backgroundColor: details.color }]}>
				<Text style={styles.focusValue}>{attribute}</Text>
			</View>
			<View style={styles.focusText}>
				<Text style={styles.focusTitle}>{details.label}</Text>
				<Text style={styles.focusDetail}>{details.detail}</Text>
				<View style={styles.progressTrack}>
					<View style={[styles.progressFill, { width: `${Math.min(100, progress)}%` }]} />
				</View>
				<Text style={styles.progressText}>{progress}/100 development</Text>
			</View>
			<View style={styles.stepper}>
				<Pressable
					accessibilityLabel={`Remove one ${details.label} hour`}
					accessibilityRole="button"
					disabled={hours === 0}
					onPress={() => onChange(focus, -1)}
					style={[styles.stepButton, hours === 0 ? styles.disabled : null]}
				>
					<Text style={styles.stepText}>−</Text>
				</Pressable>
				<Text style={styles.hours}>{hours}h</Text>
				<Pressable
					accessibilityLabel={`Add one ${details.label} hour`}
					accessibilityRole="button"
					disabled={!canAdd}
					onPress={() => onChange(focus, 1)}
					style={[styles.stepButton, !canAdd ? styles.disabled : null]}
				>
					<Text style={styles.stepText}>+</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	capacityRow: {
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderColor: colors.border,
		borderRadius: radii.md,
		borderWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		padding: spacing.md,
	},
	capacityNumber: {
		color: colors.primary,
		fontSize: 36,
		fontWeight: '900',
	},
	capacityLabel: {
		color: colors.textMuted,
		fontSize: typography.caption,
	},
	capacityMeta: {
		alignItems: 'flex-end',
	},
	metaValue: {
		color: colors.text,
		fontSize: typography.heading,
		fontWeight: '800',
	},
	trainingRow: {
		alignItems: 'center',
		backgroundColor: colors.surfaceRaised,
		borderRadius: radii.sm,
		flexDirection: 'row',
		gap: spacing.sm,
		minHeight: 64,
		padding: spacing.sm,
	},
	focusMark: {
		alignItems: 'center',
		borderRadius: radii.sm,
		height: 42,
		justifyContent: 'center',
		width: 42,
	},
	focusValue: {
		color: colors.white,
		fontSize: typography.body,
		fontWeight: '900',
	},
	focusText: {
		flex: 1,
		gap: 2,
	},
	focusTitle: {
		color: colors.text,
		fontSize: 14,
		fontWeight: '800',
	},
	focusDetail: {
		color: colors.textMuted,
		fontSize: 11,
	},
	progressTrack: {
		backgroundColor: colors.border,
		borderRadius: radii.pill,
		height: 4,
		overflow: 'hidden',
	},
	progressFill: {
		backgroundColor: colors.primary,
		height: '100%',
	},
	progressText: {
		color: colors.textMuted,
		fontSize: 10,
	},
	stepper: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: spacing.xs,
	},
	stepButton: {
		alignItems: 'center',
		backgroundColor: colors.primaryMuted,
		borderRadius: radii.sm,
		height: 44,
		justifyContent: 'center',
		width: 36,
	},
	disabled: {
		opacity: 0.3,
	},
	stepText: {
		color: colors.primary,
		fontSize: typography.heading,
		fontWeight: '900',
	},
	hours: {
		color: colors.text,
		fontSize: typography.caption,
		fontVariant: ['tabular-nums'],
		fontWeight: '800',
		textAlign: 'center',
		width: 28,
	},
	error: {
		color: colors.danger,
		fontSize: typography.caption,
		textAlign: 'center',
	},
});

