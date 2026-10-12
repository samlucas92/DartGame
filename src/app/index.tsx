import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { useCareerStore } from '../state/careerStore';
import { colors, spacing, typography } from '../theme/tokens';

export default function WelcomeScreen() {
	const db = useSQLiteContext();
	const career = useCareerStore((state) => state.career);
	const error = useCareerStore((state) => state.error);
	const hydrationStatus = useCareerStore((state) => state.hydrationStatus);
	const hydrate = useCareerStore((state) => state.hydrate);
	const checkingSave = hydrationStatus === 'idle' || hydrationStatus === 'loading';
	const saveReady = hydrationStatus === 'ready';

	return (
		<AppScreen
			showCareerAction={false}
			eyebrow="A darts career simulator"
			title="Build your legacy"
			subtitle="Start in the local leagues. Build your game, balance your week and earn every step up."
			contentContainerStyle={styles.content}
		>
			<View style={styles.heroMark}>
				<Text style={styles.heroTitle}>OCHEBOUND</Text>
				<Text style={styles.heroCaption}>YOUR CAREER · YOUR THROW</Text>
			</View>

			{checkingSave ? (
				<Card label="Local storage" title="Checking for a saved career…">
					<Text style={styles.muted}>You can continue as soon as the local save check completes.</Text>
				</Card>
			) : career ? (
				<Card label="Current save" title={career.name}>
					<Text style={styles.body}>{career.tier} · Season {career.season}</Text>
					<Text style={styles.muted}>{career.location} · Age {career.age}</Text>
				</Card>
			) : (
				<Card label="No saved career" title="Your board is waiting">
					<Text style={styles.muted}>Create a player to unlock the five career areas.</Text>
				</Card>
			)}

			{error ? (
				<Card label="Storage error" title="Couldn’t check your career">
					<Text style={styles.error}>{error}</Text>
					<ActionButton
						label="Retry save check"
						variant="secondary"
						onPress={() => void hydrate(db, true)}
					/>
				</Card>
			) : null}

			<View style={styles.actions}>
				<ActionButton
					label="Continue"
					disabled={!saveReady || !career}
					onPress={() => router.replace('/(tabs)')}
				/>
				<ActionButton
					label={career ? 'Start a new career' : 'New Career'}
					disabled={!saveReady}
					variant="secondary"
					onPress={() => router.push('/new-career')}
				/>
			</View>
		</AppScreen>
	);
}

const styles = StyleSheet.create({
	content: {
		flexGrow: 1,
		justifyContent: 'center',
	},
	heroMark: {
		alignItems: 'center',
		backgroundColor: colors.primaryMuted,
		borderColor: colors.primary,
		borderRadius: 120,
		borderWidth: 1,
		height: 190,
		justifyContent: 'center',
		marginVertical: spacing.md,
		width: 190,
		alignSelf: 'center',
	},
	heroTitle: {
		color: colors.text,
		fontSize: 28,
		fontWeight: '900',
		letterSpacing: -1,
	},
	heroCaption: {
		color: colors.primary,
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 1,
	},
	body: {
		color: colors.text,
		fontSize: typography.body,
	},
	muted: {
		color: colors.textMuted,
		fontSize: typography.body,
	},
	error: {
		color: colors.danger,
		fontSize: typography.caption,
	},
	actions: {
		gap: spacing.sm,
	},
});

