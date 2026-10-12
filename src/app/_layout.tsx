import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ActionButton } from '../components/ActionButton';
import { migrateDatabase } from '../data/database/migrations';
import { useCareerStore } from '../state/careerStore';
import { colors, spacing } from '../theme/tokens';

const navigationTheme = {
	...DarkTheme,
	colors: {
		...DarkTheme.colors,
		primary: colors.primary,
		background: colors.background,
		card: colors.surface,
		text: colors.text,
		border: colors.border,
	},
};

function DatabaseErrorScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
	return (
		<View style={styles.loading}>
			<Text style={styles.errorTitle}>Couldn’t open career storage</Text>
			<Text style={styles.loadingText}>{error.message}</Text>
			<ActionButton label="Retry" onPress={onRetry} />
		</View>
	);
}

function RootNavigator() {
	const db = useSQLiteContext();
	const hydrate = useCareerStore((state) => state.hydrate);

	useEffect(() => {
		void hydrate(db);
	}, [db, hydrate]);

	return (
		<Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen name="new-career" options={{ headerShown: false }} />
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			<Stack.Screen name="week-summary" options={{ headerShown: false }} />
			<Stack.Screen name="training" options={{ headerShown: false }} />
			<Stack.Screen name="coaching" options={{ headerShown: false }} />
			<Stack.Screen name="equipment" options={{ headerShown: false }} />
			<Stack.Screen name="lifestyle" options={{ headerShown: false }} />
			<Stack.Screen name="sponsorships" options={{ headerShown: false }} />
			<Stack.Screen name="settings" options={{ headerShown: false }} />
			<Stack.Screen name="inbox" options={{ headerShown: false }} />
			<Stack.Screen
				name="message/[id]"
				options={{
					headerBackTitle: 'Inbox',
					headerStyle: { backgroundColor: colors.surface },
					headerTintColor: colors.text,
					title: 'Message',
				}}
			/>
			<Stack.Screen
				name="player/[id]"
				options={{
					headerBackTitle: 'Darts',
					headerStyle: { backgroundColor: colors.surface },
					headerTintColor: colors.text,
					title: 'Player Profile',
				}}
			/>
			<Stack.Screen
				name="match/[id]"
				options={{
					headerBackTitle: 'Darts',
					headerStyle: { backgroundColor: colors.surface },
					headerTintColor: colors.text,
					title: 'Match Centre',
				}}
			/>
			<Stack.Screen
				name="tournament/[id]"
				options={{
					headerBackTitle: 'Calendar',
					headerStyle: { backgroundColor: colors.surface },
					headerTintColor: colors.text,
					title: 'Tournament',
				}}
			/>
		</Stack>
	);
}

export default function RootLayout() {
	const [databaseError, setDatabaseError] = useState<Error | null>(null);
	const [databaseKey, setDatabaseKey] = useState(0);

	const retryDatabase = () => {
		setDatabaseError(null);
		setDatabaseKey((current) => current + 1);
	};

	return (
		<SafeAreaProvider>
			<ThemeProvider value={navigationTheme}>
				<StatusBar style="light" />
				{databaseError ? (
					<DatabaseErrorScreen error={databaseError} onRetry={retryDatabase} />
				) : (
					<SQLiteProvider
						key={databaseKey}
						databaseName="darts-manager.db"
						onInit={migrateDatabase}
						onError={setDatabaseError}
					>
						<RootNavigator />
					</SQLiteProvider>
				)}
			</ThemeProvider>
		</SafeAreaProvider>
	);
}

const styles = StyleSheet.create({
	loading: {
		alignItems: 'center',
		backgroundColor: colors.background,
		flex: 1,
		gap: spacing.md,
		justifyContent: 'center',
	},
	loadingText: {
		color: colors.textMuted,
		fontSize: 16,
		lineHeight: 23,
		maxWidth: 320,
		textAlign: 'center',
	},
	errorTitle: {
		color: colors.text,
		fontSize: 22,
		fontWeight: '800',
	},
});

