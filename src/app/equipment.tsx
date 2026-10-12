import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { MissingCareer } from '../components/MissingCareer';
import { DartsImage } from '../components/DartsImage';
import { DARTS_CATALOGUE } from '../data/seed/equipment';
import type { PlayerAttributes } from '../domain/career';
import { useCareerStore } from '../state/careerStore';
import { colors, spacing, typography } from '../theme/tokens';
import { formatCurrency, titleCase } from '../utils/format';

export default function EquipmentScreen() {
	const db = useSQLiteContext();
	const career = useCareerStore((state) => state.career);
	const ownedDarts = useCareerStore((state) => state.ownedDarts);
	const purchaseDarts = useCareerStore((state) => state.purchaseDarts);
	const equipDarts = useCareerStore((state) => state.equipDarts);
	const busy = useCareerStore((state) => state.busy);
	const error = useCareerStore((state) => state.error);
	if (!career) {
		return <MissingCareer />;
	}

	return (
		<AppScreen
			eyebrow={`Balance ${formatCurrency(career.bankBalancePence)}`}
			title="Your Darts"
			subtitle="Own several sets and equip one. Each setup has a small trade-off, not a permanent skill increase."
		>
			{DARTS_CATALOGUE.map((darts) => {
				const owned = ownedDarts.find((set) => set.id === darts.id);
				const affordable = career.bankBalancePence >= darts.pricePence;
				return (
					<Card
						key={darts.id}
						label={`${darts.weightGrams}g · ${darts.barrel}`}
						title={darts.name}
					>
						<DartsImage dartsId={darts.id} />
						<Text style={styles.body}>{darts.description}</Text>
						<View style={styles.specGrid}>
							<Text style={styles.muted}>{darts.tungstenPercent > 0 ? `${darts.tungstenPercent}% tungsten` : 'Brass barrel'}</Text>
							<Text style={styles.muted}>{darts.barrelLengthMm} × {darts.barrelWidthMm}mm</Text>
							<Text style={styles.muted}>{darts.grip}</Text>
							<Text style={styles.muted}>{darts.shaft}</Text>
							<Text style={styles.muted}>{darts.flightShape}</Text>
						</View>
						<View style={styles.modifiers}>
							{modifierLabels(darts.modifiers).map((label) => (
								<Text key={label} style={styles.modifier}>{label}</Text>
							))}
						</View>
						<ActionButton
							label={owned?.isEquipped
								? 'Currently Equipped'
								: owned
									? 'Equip This Set'
									: affordable
										? `Buy & Equip · ${formatCurrency(darts.pricePence)}`
										: 'Insufficient Balance'}
							disabled={busy || owned?.isEquipped || (!owned && !affordable)}
							onPress={() => owned
								? void equipDarts(db, darts.id)
								: void purchaseDarts(db, darts)}
						/>
					</Card>
				);
			})}
			{error ? <Text style={styles.error}>{error}</Text> : null}
			<ActionButton label="Back to Darts" variant="ghost" onPress={() => router.back()} />
		</AppScreen>
	);
}

function modifierLabels(modifiers: Partial<PlayerAttributes>): string[] {
	const labels = Object.entries(modifiers).map(([attribute, value]) => (
		`${titleCase(attribute)} ${value && value > 0 ? '+' : ''}${value}`
	));
	return labels.length > 0 ? labels : ['Neutral setup'];
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
	},
	specGrid: {
		backgroundColor: colors.surfaceRaised,
		gap: spacing.xs,
		padding: spacing.sm,
	},
	modifiers: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	modifier: {
		backgroundColor: colors.primaryMuted,
		color: colors.primary,
		fontSize: typography.caption,
		fontWeight: '800',
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
	},
	error: {
		color: colors.danger,
		fontSize: typography.caption,
		textAlign: 'center',
	},
});

