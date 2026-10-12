import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { HousingImage } from '../components/HousingImage';
import { MissingCareer } from '../components/MissingCareer';
import { LIFESTYLE_CATALOGUE } from '../data/seed/lifestyle';
import type { LifestyleCategory } from '../domain/lifestyle';
import { useCareerStore } from '../state/careerStore';
import { colors, spacing, typography } from '../theme/tokens';
import { formatCurrency, titleCase } from '../utils/format';

const CATEGORIES: LifestyleCategory[] = ['home', 'transport', 'practice', 'experience'];

const CATEGORY_INTRO: Record<LifestyleCategory, string> = {
	home: 'Your home sets recurring costs and can create more practice space and weekly recovery.',
	transport: 'Travel choices trade purchase price and upkeep against the fatigue of getting to events.',
	practice: 'Practice facilities increase the real hours available in each training week.',
	experience: 'One-off purchases reduce fatigue immediately and become permanent career memories.',
};

export default function LifestyleScreen() {
	const db = useSQLiteContext();
	const career = useCareerStore((state) => state.career);
	const lifestyle = useCareerStore((state) => state.lifestyle);
	const purchase = useCareerStore((state) => state.purchaseLifestyleItem);
	const busy = useCareerStore((state) => state.busy);
	const error = useCareerStore((state) => state.error);
	if (!career || !lifestyle) {
		return <MissingCareer />;
	}

	return (
		<AppScreen
			eyebrow={`Balance ${formatCurrency(career.bankBalancePence)}`}
			title="Lifestyle"
			subtitle="Spend career earnings on meaningful upgrades and one-off experiences. Every purchase has a saved gameplay effect."
		>
			{CATEGORIES.map((category) => (
				<View key={category} style={styles.section}>
					<Text style={styles.heading}>{titleCase(category)}</Text>
					<Text style={styles.body}>{CATEGORY_INTRO[category]}</Text>
					{LIFESTYLE_CATALOGUE.filter((item) => item.category === category).map((item) => {
						const active = category !== 'experience' && lifestyle[category].id === item.id;
						const owned = lifestyle.ownedItemIds.includes(item.id);
						const affordable = career.bankBalancePence >= item.purchasePricePence;
						const buttonLabel = active
							? 'Currently Active'
							: category === 'experience' && owned
								? 'Experience Completed'
								: owned
									? 'Select'
									: affordable
										? `Buy · ${formatCurrency(item.purchasePricePence)}`
										: `Need ${formatCurrency(item.purchasePricePence)}`;
						return (
							<Card
								key={item.id}
								label={category === 'experience'
									? 'One-off experience'
									: `${formatCurrency(item.weeklyCostPence)}/week${active ? ' · Active' : owned ? ' · Owned' : ''}`}
								title={item.name}
							>
								{item.category === 'home' ? <HousingImage homeId={item.id} /> : null}
								<Text style={styles.body}>{item.description}</Text>
								<View style={styles.effects}>
									{item.effects.map((effect) => (
										<Text key={effect} style={styles.bonus}>✓ {effect}</Text>
									))}
								</View>
								<ActionButton
									label={buttonLabel}
									disabled={active || busy || (category === 'experience' && owned) || (!owned && !affordable)}
									onPress={() => void purchase(db, item)}
								/>
							</Card>
						);
					})}
				</View>
			))}
			{error ? <Text style={styles.error}>{error}</Text> : null}
			<ActionButton label="Back to Life" variant="ghost" onPress={() => router.back()} />
		</AppScreen>
	);
}

const styles = StyleSheet.create({
	section: {
		gap: spacing.sm,
	},
	heading: {
		color: colors.text,
		fontSize: typography.heading,
		fontWeight: '900',
	},
	body: {
		color: colors.textMuted,
		fontSize: typography.caption,
		lineHeight: 19,
	},
	bonus: {
		color: colors.primary,
		fontSize: typography.caption,
		fontWeight: '800',
	},
	effects: {
		backgroundColor: colors.primaryMuted,
		borderRadius: 10,
		gap: spacing.xs,
		padding: spacing.sm,
	},
	error: {
		color: colors.danger,
		fontSize: typography.caption,
		textAlign: 'center',
	},
});

