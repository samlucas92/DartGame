import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { ActionButton } from '../components/ActionButton';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { ChoiceChips } from '../components/ChoiceChips';
import { ageOnDate, type CareerBackground, type NewCareerInput, type PlayerStyle } from '../domain/career';
import { useCareerStore } from '../state/careerStore';
import { colors, radii, spacing, typography } from '../theme/tokens';

const CAREER_START_DATE = '2026-01-05';
const STYLE_CHOICES: { value: PlayerStyle; label: string }[] = [
	{ value: 'scorer', label: 'Scorer' },
	{ value: 'finisher', label: 'Finisher' },
	{ value: 'all-rounder', label: 'All-rounder' },
	{ value: 'clutch', label: 'Clutch' },
];
const BACKGROUND_CHOICES: { value: CareerBackground; label: string }[] = [
	{ value: 'working-amateur', label: 'Working Amateur' },
	{ value: 'supported-prospect', label: 'Supported Prospect' },
	{ value: 'independent-amateur', label: 'Independent Amateur' },
];
const LOCATION_CHOICES = [
	{ value: 'Northbridge', label: 'Northbridge' },
	{ value: 'Ashford Vale', label: 'Ashford Vale' },
	{ value: 'Merehaven', label: 'Merehaven' },
] as const;

export default function NewCareerScreen() {
	const db = useSQLiteContext();
	const createCareer = useCareerStore((state) => state.createCareer);
	const busy = useCareerStore((state) => state.busy);
	const error = useCareerStore((state) => state.error);
	const existingCareer = useCareerStore((state) => state.career);
	const [form, setForm] = useState<NewCareerInput>({
		name: '',
		dateOfBirth: '2004-07-01',
		location: 'Northbridge',
		style: 'all-rounder',
		background: 'working-amateur',
	});
	const startingAge = validStartingAge(form.dateOfBirth);

	const submit = async () => {
		if (!form.name.trim()) {
			return;
		}
		try {
			await createCareer(db, form);
			router.replace('/(tabs)');
		} catch {
			// The store exposes the actionable error directly in this screen.
		}
	};

	return (
		<AppScreen
			showCareerAction={false}
			eyebrow="Career setup"
			title="Create your player"
			subtitle="Your style changes the starting attribute spread, but no choice guarantees results."
		>
			{existingCareer ? (
				<Text style={styles.warning}>Saving this player will replace {existingCareer.name}’s local save.</Text>
			) : null}
			<Card title="Identity">
				<Text style={styles.label}>Player name</Text>
				<TextInput
					accessibilityLabel="Player name"
					autoCapitalize="words"
					maxLength={32}
					onChangeText={(name) => setForm((current) => ({ ...current, name }))}
					placeholder="e.g. Alex Morgan"
					placeholderTextColor={colors.textMuted}
					style={styles.input}
					value={form.name}
				/>
				<Text style={styles.label}>Date of birth</Text>
				<TextInput
					accessibilityLabel="Date of birth"
					autoCorrect={false}
					keyboardType="numbers-and-punctuation"
					maxLength={10}
					onChangeText={(dateOfBirth) => setForm((current) => ({ ...current, dateOfBirth }))}
					placeholder="YYYY-MM-DD"
					placeholderTextColor={colors.textMuted}
					style={styles.input}
					value={form.dateOfBirth}
				/>
				<Text style={startingAge === null ? styles.error : styles.help}>
					{startingAge === null
						? 'Enter a valid date. Players must be 18 to 60 on 5 January 2026.'
						: `Age ${startingAge} when the career begins. Your age changes on your in-game birthday.`}
				</Text>
				<ChoiceChips
					label="Home region"
					value={form.location}
					choices={LOCATION_CHOICES}
					onChange={(location) => setForm((current) => ({ ...current, location }))}
				/>
			</Card>

			<Card title="Playing profile">
				<ChoiceChips
					label="Style"
					value={form.style}
					choices={STYLE_CHOICES}
					onChange={(style) => setForm((current) => ({ ...current, style }))}
				/>
				<ChoiceChips
					label="Background"
					value={form.background}
					choices={BACKGROUND_CHOICES}
					onChange={(background) => setForm((current) => ({ ...current, background }))}
				/>
			</Card>

			{error ? <Text style={styles.error}>{error}</Text> : null}
			<ActionButton
				label={busy ? 'Creating career…' : 'Begin local season'}
				disabled={busy || !form.name.trim() || startingAge === null}
				onPress={() => void submit()}
			/>
			<ActionButton label="Back" variant="ghost" onPress={() => router.back()} />
		</AppScreen>
	);
}

const styles = StyleSheet.create({
	label: {
		color: colors.textMuted,
		fontSize: typography.caption,
		fontWeight: '700',
		textTransform: 'uppercase',
	},
	help: {
		color: colors.textMuted,
		fontSize: typography.caption,
		lineHeight: 19,
	},
	input: {
		backgroundColor: colors.surfaceRaised,
		borderColor: colors.border,
		borderRadius: radii.sm,
		borderWidth: 1,
		color: colors.text,
		fontSize: typography.body,
		minHeight: 48,
		paddingHorizontal: spacing.md,
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

function validStartingAge(dateOfBirth?: string): number | null {
	if (!dateOfBirth) {
		return null;
	}
	try {
		const age = ageOnDate(dateOfBirth, CAREER_START_DATE);
		return age >= 18 && age <= 60 ? age : null;
	} catch {
		return null;
	}
}

