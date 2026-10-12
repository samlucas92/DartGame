import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme/tokens';
import { ActionButton } from './ActionButton';

export function QuickActionBar({
	title,
	detail,
	buttonLabel,
	disabled = false,
	onPress,
}: {
	title: string;
	detail: string;
	buttonLabel: string;
	disabled?: boolean;
	onPress: () => void;
}) {
	return (
		<View style={styles.bar}>
			<View style={styles.text}>
				<Text style={styles.title}>{title}</Text>
				<Text style={styles.detail}>{detail}</Text>
			</View>
			<ActionButton label={buttonLabel} disabled={disabled} onPress={onPress} style={styles.button} />
		</View>
	);
}

const styles = StyleSheet.create({
	bar: {
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderColor: colors.primary,
		borderRadius: radii.md,
		borderWidth: 1,
		flexDirection: 'row',
		gap: spacing.sm,
		padding: spacing.sm,
	},
	text: {
		flex: 1,
		gap: 2,
	},
	title: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '800',
	},
	detail: {
		color: colors.textMuted,
		fontSize: 11,
	},
	button: {
		minHeight: 44,
		paddingHorizontal: spacing.sm,
	},
});

