import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../theme/tokens';
import { CareerContinueBar } from './CareerContinueBar';

type AppScreenProps = ScrollViewProps & {
	eyebrow?: string;
	title: string;
	subtitle?: string;
	children?: ReactNode;
	showCareerAction?: boolean;
};

export function AppScreen({
	eyebrow,
	title,
	subtitle,
	children,
	showCareerAction = true,
	contentContainerStyle,
	...props
}: AppScreenProps) {
	return (
		<SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
			<ScrollView
				contentContainerStyle={[styles.content, contentContainerStyle]}
				showsVerticalScrollIndicator={false}
				{...props}
			>
				<View style={styles.header}>
					{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
					<Text style={styles.title}>{title}</Text>
					{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
				</View>
				{showCareerAction ? <CareerContinueBar /> : null}
				{children}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
	content: {
		paddingHorizontal: spacing.md,
		paddingBottom: spacing.xl,
		gap: spacing.md,
	},
	header: {
		paddingTop: spacing.sm,
		paddingBottom: spacing.sm,
		gap: spacing.xs,
	},
	eyebrow: {
		color: colors.primary,
		fontSize: typography.caption,
		fontWeight: '700',
		letterSpacing: 1.2,
		textTransform: 'uppercase',
	},
	title: {
		color: colors.text,
		fontSize: typography.title,
		fontWeight: '800',
		letterSpacing: -0.8,
	},
	subtitle: {
		color: colors.textMuted,
		fontSize: typography.body,
		lineHeight: 23,
	},
});

