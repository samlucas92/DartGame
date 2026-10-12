import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme/tokens';

type StatTileProps = {
	label: string;
	value: string;
};

export function StatTile({ label, value }: StatTileProps) {
	return (
		<View style={styles.tile}>
			<Text style={styles.value}>{value}</Text>
			<Text style={styles.label}>{label}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	tile: {
		backgroundColor: colors.surfaceRaised,
		borderRadius: radii.sm,
		flex: 1,
		gap: spacing.xs,
		minWidth: 92,
		padding: 12,
	},
	value: {
		color: colors.text,
		fontSize: typography.heading,
		fontWeight: '800',
		fontVariant: ['tabular-nums'],
	},
	label: {
		color: colors.textMuted,
		fontSize: typography.caption,
	},
});

