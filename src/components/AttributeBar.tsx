import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../theme/tokens';

type AttributeBarProps = {
	label: string;
	value: number;
};

export function AttributeBar({ label, value }: AttributeBarProps) {
	return (
		<View style={styles.row}>
			<Text style={styles.label}>{label}</Text>
			<View style={styles.track}>
				<View style={[styles.fill, { width: `${Math.max(0, Math.min(100, value))}%` }]} />
			</View>
			<Text style={styles.value}>{value}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: spacing.sm,
		minHeight: 28,
	},
	label: {
		color: colors.textMuted,
		fontSize: 14,
		width: 88,
	},
	track: {
		backgroundColor: colors.surfaceRaised,
		borderRadius: radii.pill,
		flex: 1,
		height: 7,
		overflow: 'hidden',
	},
	fill: {
		backgroundColor: colors.primary,
		borderRadius: radii.pill,
		height: '100%',
	},
	value: {
		color: colors.text,
		fontSize: 14,
		fontVariant: ['tabular-nums'],
		textAlign: 'right',
		width: 26,
	},
});

