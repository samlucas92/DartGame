import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { Card } from '../../components/Card';
import { MissingCareer } from '../../components/MissingCareer';
import { StatTile } from '../../components/StatTile';
import { currentHumanFixture, fixtureOpponent } from '../../data/repositories/leagueRepository';
import { careerPathway } from '../../domain/career';
import { blockingCareerMessages, type CareerMessage, type CareerMessageKind } from '../../domain/inbox';
import { useCareerStore } from '../../state/careerStore';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import { formatAverage, formatCurrency } from '../../utils/format';

const KIND_LABELS: Record<CareerMessageKind, string> = {
	league: 'League',
	life: 'Life',
	finance: 'Finance',
	sponsor: 'Sponsor',
	coach: 'Coach',
	world: 'World',
	tournament: 'Tournament',
	career: 'Career',
};

export default function MessagesScreen() {
	const db = useSQLiteContext();
	const career = useCareerStore((state) => state.career);
	const league = useCareerStore((state) => state.league);
	const messages = useCareerStore((state) => state.messages);
	const markAllMessagesRead = useCareerStore((state) => state.markAllMessagesRead);
	if (!career) {
		return <MissingCareer />;
	}
	const fixture = league ? currentHumanFixture(league, career) : null;
	const opponent = fixture && league ? fixtureOpponent(league, fixture, career.playerId) : null;
	const unread = messages.filter((message) => !message.isRead).length;
	const blockingMessages = blockingCareerMessages(messages);
	const requiredMessage = blockingMessages[0];
	const orderedMessages = [...messages].sort((left, right) => (
		messagePriority(right) - messagePriority(left)
	));
	const pathway = careerPathway(career);

	return (
		<AppScreen
			eyebrow={`${unread} unread · Season ${career.season}`}
			title="Messages"
			subtitle="Your career happens here: results, selections, contracts, coaching and news from the wider darts world."
		>
			<View style={styles.statsRow}>
				<StatTile label="Balance" value={formatCurrency(career.bankBalancePence)} />
				<StatTile label="Career average" value={formatAverage(career.stats.pointsScored, career.stats.dartsThrown)} />
			</View>

			{requiredMessage ? (
				<Card
					label={requiredMessage.requiresResponse && !requiredMessage.response ? 'Response required' : 'Action required'}
					title={`${blockingMessages.length} message${blockingMessages.length === 1 ? '' : 's'} blocking progress`}
				>
					<Text style={styles.priorityText}>{requiredMessage.subject}</Text>
					<Text style={styles.muted}>
						{requiredMessage.requiresResponse
							? 'Marking this as read will not clear it. Open the message and choose Register or Decline.'
							: 'Read this priority correspondence before completing the career week.'}
					</Text>
					<ActionButton label={requiredMessage.requiresResponse ? 'Respond Now' : 'Read Now'} onPress={() => router.push(`/message/${requiredMessage.id}`)} />
				</Card>
			) : null}

			<Card label={pathway.label} title={career.tier}>
				<View style={styles.progressTrack}>
					<View style={[styles.progressFill, { width: `${pathway.progress}%` }]} />
				</View>
				<Text style={styles.muted}>{pathway.detail}</Text>
				<ActionButton
					label={fixture?.status === 'complete' ? 'Review This Week' : `Next Match · ${opponent?.name ?? 'TBC'}`}
					variant="secondary"
					disabled={!fixture}
					onPress={() => {
						if (fixture?.status === 'complete') {
							router.push('/calendar');
						} else if (fixture) {
							router.push(`/match/${fixture.id}`);
						}
					}}
				/>
			</Card>

			<Card label="Career correspondence" title="Inbox">
				<ActionButton
					label="Mark All as Read"
					variant="secondary"
					disabled={unread === 0}
					onPress={() => void markAllMessagesRead(db)}
				/>
				{messages.length === 0 ? (
					<Text style={styles.muted}>No messages yet.</Text>
				) : orderedMessages.map((message) => (
					<Pressable
						key={message.id}
						accessibilityRole="button"
						onPress={() => router.push(`/message/${message.id}`)}
						style={[
							styles.message,
							!message.isRead ? styles.unread : null,
							message.requiresResponse && !message.response ? styles.responseRequired : null,
						]}
					>
						<View style={[styles.kindBadge, !message.isRead ? styles.kindBadgeUnread : null]}>
							{message.requiresResponse && !message.response ? <View style={styles.importantMarker} /> : null}
							<Text style={styles.kindText}>{KIND_LABELS[message.kind].slice(0, 1)}</Text>
						</View>
						<View style={styles.messageText}>
							<View style={styles.metaRow}>
								<Text numberOfLines={1} style={styles.sender}>{message.sender}</Text>
								<Text style={styles.date}>{message.receivedDate.slice(5)}</Text>
							</View>
							<Text numberOfLines={1} style={styles.subject}>{message.subject}</Text>
							<Text numberOfLines={2} style={styles.preview}>{message.preview}</Text>
							<Text style={styles.kindLabel}>{KIND_LABELS[message.kind]}</Text>
							{message.requiresResponse ? (
								<Text style={message.response ? styles.responded : styles.responseLabel}>
									{message.response === 'accepted'
										? 'REGISTERED'
										: message.response === 'declined'
											? 'DECLINED'
											: 'RESPONSE REQUIRED'}
								</Text>
							) : message.requiresAcknowledgement ? (
								<Text style={message.isRead ? styles.acknowledged : styles.actionRequired}>
									{message.isRead ? 'ACKNOWLEDGED' : 'READ TO CONTINUE'}
								</Text>
							) : null}
						</View>
					</Pressable>
				))}
			</Card>
		</AppScreen>
	);
}

const styles = StyleSheet.create({
	statsRow: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	progressTrack: {
		backgroundColor: colors.border,
		borderRadius: radii.pill,
		height: 8,
		overflow: 'hidden',
	},
	progressFill: {
		backgroundColor: colors.primary,
		height: '100%',
	},
	muted: {
		color: colors.textMuted,
		fontSize: typography.caption,
		lineHeight: 19,
	},
	priorityText: {
		color: colors.warning,
		fontSize: typography.body,
		fontWeight: '800',
	},
	message: {
		alignItems: 'flex-start',
		borderTopColor: colors.border,
		borderTopWidth: 1,
		flexDirection: 'row',
		gap: spacing.sm,
		paddingVertical: spacing.sm,
	},
	responseRequired: {
		borderColor: colors.danger,
		borderWidth: 1,
	},
	unread: {
		backgroundColor: colors.primaryMuted,
		borderRadius: radii.sm,
		paddingHorizontal: spacing.sm,
	},
	kindBadge: {
		alignItems: 'center',
		backgroundColor: colors.surfaceRaised,
		borderRadius: radii.sm,
		height: 36,
		justifyContent: 'center',
		marginTop: 2,
		width: 36,
	},
	kindBadgeUnread: {
		backgroundColor: colors.primary,
	},
	importantMarker: {
		backgroundColor: colors.danger,
		borderColor: colors.background,
		borderRadius: radii.pill,
		borderWidth: 2,
		height: 12,
		position: 'absolute',
		right: -4,
		top: -4,
		width: 12,
	},
	kindText: {
		color: colors.background,
		fontSize: typography.caption,
		fontWeight: '900',
	},
	messageText: {
		flex: 1,
		gap: 3,
	},
	metaRow: {
		flexDirection: 'row',
		gap: spacing.sm,
		justifyContent: 'space-between',
	},
	sender: {
		color: colors.primary,
		flex: 1,
		fontSize: 11,
		fontWeight: '800',
		textTransform: 'uppercase',
	},
	date: {
		color: colors.textMuted,
		fontSize: 11,
	},
	subject: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '800',
	},
	preview: {
		color: colors.textMuted,
		fontSize: typography.caption,
		lineHeight: 18,
	},
	kindLabel: {
		color: colors.textMuted,
		fontSize: 10,
		fontWeight: '800',
		textTransform: 'uppercase',
	},
	actionRequired: {
		color: colors.warning,
		fontSize: 10,
		fontWeight: '900',
		letterSpacing: 0.6,
	},
	responseLabel: {
		color: colors.danger,
		fontSize: 10,
		fontWeight: '900',
		letterSpacing: 0.6,
	},
	responded: {
		color: colors.primary,
		fontSize: 10,
		fontWeight: '900',
		letterSpacing: 0.6,
	},
	acknowledged: {
		color: colors.primary,
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 0.6,
	},
});

function messagePriority(message: CareerMessage): number {
	if (message.requiresResponse && !message.response) {
		return 2;
	}
	if (message.requiresAcknowledgement && !message.isRead) {
		return 1;
	}
	return 0;
}

