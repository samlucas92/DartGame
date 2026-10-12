import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '../theme/tokens';

type CardProps = {
	title?: string;
	label?: string;
	children: ReactNode;
	style?: ViewStyle;
};

export function Card({ title, label, children, style }: CardProps) {
	return (
		<View style={[styles.card, style]}>
			{label ? <Text style={styles.label}>{label}</Text> : null}
			{title ? <Text style={styles.title}>{title}</Text> : null}
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: colors.surface,
		borderColor: colors.border,
		borderRadius: radii.md,
		borderWidth: 1,
		gap: spacing.sm,
		padding: spacing.md,
	},
	label: {
		color: colors.primary,
		fontSize: typography.caption,
		fontWeight: '700',
		letterSpacing: 0.8,
		textTransform: 'uppercase',
	},
	title: {
		color: colors.text,
		fontSize: typography.heading,
		fontWeight: '700',
	},
});

