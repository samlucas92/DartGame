import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme/tokens';

type Choice<T extends string | number> = {
	value: T;
	label: string;
};

type ChoiceChipsProps<T extends string | number> = {
	label: string;
	value: T;
	choices: readonly Choice<T>[];
	onChange: (value: T) => void;
};

export function ChoiceChips<T extends string | number>({
	label,
	value,
	choices,
	onChange,
}: ChoiceChipsProps<T>) {
	return (
		<View style={styles.group}>
			<Text style={styles.label}>{label}</Text>
			<View style={styles.choices}>
				{choices.map((choice) => {
					const selected = choice.value === value;
					return (
						<Pressable
							accessibilityRole="radio"
							accessibilityState={{ checked: selected }}
							key={choice.value}
							onPress={() => onChange(choice.value)}
							style={[styles.choice, selected ? styles.selectedChoice : null]}
						>
							<Text style={[styles.choiceText, selected ? styles.selectedText : null]}>
								{choice.label}
							</Text>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	group: {
		gap: spacing.sm,
	},
	label: {
		color: colors.textMuted,
		fontSize: typography.caption,
		fontWeight: '700',
		textTransform: 'uppercase',
	},
	choices: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
	},
	choice: {
		borderColor: colors.border,
		borderRadius: radii.pill,
		borderWidth: 1,
		justifyContent: 'center',
		minHeight: 44,
		paddingHorizontal: 14,
	},
	selectedChoice: {
		backgroundColor: colors.primaryMuted,
		borderColor: colors.primary,
	},
	choiceText: {
		color: colors.textMuted,
		fontSize: 14,
		fontWeight: '600',
	},
	selectedText: {
		color: colors.primary,
	},
});

