import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '../../components/AppScreen';
import { ActionButton } from '../../components/ActionButton';
import { Card } from '../../components/Card';
import { MissingCareer } from '../../components/MissingCareer';
import { TOURNAMENT_CALENDAR } from '../../data/seed/tournaments';
import { tournamentForMessage } from '../../domain/tournaments';
import { useCareerStore } from '../../state/careerStore';
import { colors, spacing, typography } from '../../theme/tokens';
import { formatCurrency } from '../../utils/format';

export default function MessageScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const db = useSQLiteContext();
	const career = useCareerStore((state) => state.career);
	const message = useCareerStore((state) => state.messages.find((item) => item.id === id));
	const markRead = useCareerStore((state) => state.markMessageRead);
	const respondToTournamentMessage = useCareerStore((state) => state.respondToTournamentMessage);
	const busy = useCareerStore((state) => state.busy);
	const error = useCareerStore((state) => state.error);

	useEffect(() => {
		if (message && !message.isRead) {
			void markRead(db, message.id);
		}
	}, [db, markRead, message]);

	if (!career) {
		return <MissingCareer />;
	}
	if (!message) {
		return <AppScreen title="Message unavailable" subtitle="This career message could not be found." />;
	}
	const tournament = tournamentForMessage(TOURNAMENT_CALENDAR, message.actionPath, message.subject);
	const tournamentPath = tournament ? `/tournament/${tournament.id}` : message.actionPath;
	const responseRequired = message.requiresResponse && !message.response;
	const respond = async (response: 'accepted' | 'declined') => {
		if (!tournament) {
			return;
		}
		try {
			await respondToTournamentMessage(db, message.id, tournament, response);
		} catch {
			// The store exposes the actionable error in this message.
		}
	};

	return (
		<AppScreen eyebrow={message.receivedDate} title={message.subject} subtitle={message.sender}>
			<Card label={responseRequired ? 'Important · response required' : message.requiresAcknowledgement ? 'Priority · acknowledgement required' : message.kind}>
				<Text style={styles.body}>{message.body}</Text>
				{responseRequired && tournament ? (
					<>
						<Text style={styles.required}>Choose an answer before the career can continue.</Text>
						<View style={styles.actions}>
							<ActionButton
								label={`Register · ${formatCurrency(tournament.entryFeePence)}`}
								disabled={busy}
								onPress={() => void respond('accepted')}
							/>
							<ActionButton
								label="Decline Entry"
								variant="secondary"
								disabled={busy}
								onPress={() => void respond('declined')}
							/>
						</View>
					</>
				) : message.response ? (
					<>
						<Text style={styles.responded}>
							Response recorded · {message.response === 'accepted' ? 'Registered' : 'Entry declined'}
						</Text>
						{tournamentPath ? (
							<ActionButton label="View Tournament" variant="secondary" onPress={() => router.push(tournamentPath as never)} />
						) : null}
					</>
				) : message.actionPath && message.actionLabel ? (
					<ActionButton label={message.actionLabel} onPress={() => router.push(message.actionPath as never)} />
				) : null}
				{error ? <Text style={styles.error}>{error}</Text> : null}
			</Card>
		</AppScreen>
	);
}

const styles = StyleSheet.create({
	body: {
		color: colors.text,
		fontSize: typography.body,
		lineHeight: 25,
	},
	actions: {
		gap: spacing.sm,
	},
	required: {
		color: colors.danger,
		fontSize: typography.body,
		fontWeight: '900',
	},
	responded: {
		color: colors.primary,
		fontSize: typography.body,
		fontWeight: '800',
	},
	error: {
		color: colors.danger,
		fontSize: typography.caption,
	},
});

