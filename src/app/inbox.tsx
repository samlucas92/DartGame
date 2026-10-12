import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { MissingCareer } from '../components/MissingCareer';
import { useCareerStore } from '../state/careerStore';
import { colors, radii, spacing, typography } from '../theme/tokens';

export default function InboxScreen() {
	const career = useCareerStore((state) => state.career);
	const messages = useCareerStore((state) => state.messages);
	if (!career) {
		return <MissingCareer />;
	}
	const unread = messages.filter((message) => !message.isRead).length;

	return (
		<AppScreen
			eyebrow={`${unread} unread`}
			title="Inbox"
			subtitle="League officials, work, home life and career opportunities will contact you here."
		>
			<Card label="Career correspondence" title="Latest messages">
				{messages.map((message) => (
					<Pressable
						key={message.id}
						accessibilityRole="button"
						onPress={() => router.push(`/message/${message.id}`)}
						style={[styles.message, !message.isRead ? styles.unread : null]}
					>
						<View style={[styles.dot, message.isRead ? styles.readDot : null]} />
						<View style={styles.messageText}>
							<View style={styles.metaRow}>
								<Text numberOfLines={1} style={styles.sender}>{message.sender}</Text>
								<Text style={styles.date}>{message.receivedDate.slice(5)}</Text>
							</View>
							<Text numberOfLines={1} style={styles.subject}>{message.subject}</Text>
							<Text numberOfLines={2} style={styles.preview}>{message.preview}</Text>
						</View>
					</Pressable>
				))}
			</Card>
		</AppScreen>
	);
}

const styles = StyleSheet.create({
	message: {
		alignItems: 'flex-start',
		borderTopColor: colors.border,
		borderTopWidth: 1,
		flexDirection: 'row',
		gap: spacing.sm,
		paddingVertical: spacing.sm,
	},
	unread: {
		backgroundColor: colors.primaryMuted,
		borderRadius: radii.sm,
		paddingHorizontal: spacing.sm,
	},
	dot: {
		backgroundColor: colors.primary,
		borderRadius: radii.pill,
		height: 9,
		marginTop: 6,
		width: 9,
	},
	readDot: {
		backgroundColor: colors.border,
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
});

