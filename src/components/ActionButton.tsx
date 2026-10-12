import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { colors, radii, spacing, typography } from '../theme/tokens';

type ActionButtonProps = PressableProps & {
	label: string;
	variant?: 'primary' | 'secondary' | 'ghost';
};

export function ActionButton({
	label,
	variant = 'primary',
	disabled,
	style,
	...props
}: ActionButtonProps) {
	return (
		<Pressable
			accessibilityRole="button"
			disabled={disabled}
			style={(state) => [
				styles.base,
				styles[variant],
				state.pressed && !disabled ? styles.pressed : null,
				disabled ? styles.disabled : null,
				typeof style === 'function' ? style(state) : style,
			]}
			{...props}
		>
			<Text style={[styles.label, variant === 'primary' ? styles.primaryLabel : null]}>
				{label}
			</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	base: {
		alignItems: 'center',
		borderRadius: radii.md,
		justifyContent: 'center',
		minHeight: 48,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
	},
	primary: {
		backgroundColor: colors.primary,
	},
	secondary: {
		backgroundColor: colors.surfaceRaised,
		borderColor: colors.border,
		borderWidth: 1,
	},
	ghost: {
		backgroundColor: 'transparent',
		borderColor: colors.border,
		borderWidth: 1,
	},
	pressed: {
		opacity: 0.78,
	},
	disabled: {
		opacity: 0.38,
	},
	label: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '700',
	},
	primaryLabel: {
		color: colors.background,
	},
});

