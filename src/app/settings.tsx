import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { MissingCareer } from '../components/MissingCareer';
import { useCareerStore } from '../state/careerStore';
import { colors, typography } from '../theme/tokens';

export default function SettingsScreen() {
	const db = useSQLiteContext();
	const career = useCareerStore((state) => state.career);
	const saveCareerNow = useCareerStore((state) => state.saveCareerNow);
	const busy = useCareerStore((state) => state.busy);
	const error = useCareerStore((state) => state.error);
	const [confirmation, setConfirmation] = useState<string | null>(null);
	if (!career) {
		return <MissingCareer />;
	}

	const save = async () => {
		try {
			const savedAt = await saveCareerNow(db);
			setConfirmation(`Saved locally at ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
		} catch {
			setConfirmation(null);
		}
	};

	return (
		<AppScreen
			eyebrow="Offline save"
			title="Save Career"
			subtitle="Your career is stored only on this device and every completed action auto-saves."
		>
			<Card label="Current slot" title={career.name}>
				<Text style={styles.body}>{career.tier} · Season {career.season} · {career.inGameDate}</Text>
				<Text style={styles.muted}>
					{career.lastManualSaveAt
						? `Last manual save: ${new Date(career.lastManualSaveAt).toLocaleString()}`
						: 'No manual checkpoint yet. Automatic saving is active.'}
				</Text>
				<ActionButton
					label={busy ? 'Saving…' : 'Save Career Now'}
					disabled={busy}
					onPress={() => void save()}
				/>
				{confirmation ? <Text style={styles.success}>{confirmation}</Text> : null}
				{error ? <Text style={styles.error}>{error}</Text> : null}
			</Card>
			<Card label="Save behaviour" title="Safe by default">
				<Text style={styles.muted}>Matches, weekly advancement, purchases, training plans and contract changes are written to SQLite immediately and protected against duplicate payouts or results.</Text>
			</Card>
			<ActionButton label="Back to Life" variant="ghost" onPress={() => router.back()} />
		</AppScreen>
	);
}

const styles = StyleSheet.create({
	body: {
		color: colors.text,
		fontSize: typography.body,
	},
	muted: {
		color: colors.textMuted,
		fontSize: typography.caption,
		lineHeight: 20,
	},
	success: {
		color: colors.primary,
		fontSize: typography.caption,
		fontWeight: '800',
	},
	error: {
		color: colors.danger,
		fontSize: typography.caption,
	},
});

