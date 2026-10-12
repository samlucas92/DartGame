import { Tabs } from 'expo-router';
import { StyleSheet, Text, type ColorValue } from 'react-native';

import { colors } from '../../theme/tokens';
import { useCareerStore } from '../../state/careerStore';

function TabIcon({ symbol, color }: { symbol: string; color: ColorValue }) {
	return <Text style={[styles.icon, { color }]}>{symbol}</Text>;
}

export default function TabLayout() {
	const attentionCount = useCareerStore((state) => state.messages.filter((message) => (
		!message.isRead || (message.requiresResponse && !message.response)
	)).length);
	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: colors.primary,
				tabBarInactiveTintColor: colors.textMuted,
				tabBarStyle: styles.tabBar,
				tabBarLabelStyle: styles.label,
				tabBarHideOnKeyboard: true,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Messages',
					tabBarIcon: ({ color }) => <TabIcon symbol="✉" color={color} />,
					tabBarBadge: attentionCount > 0 ? attentionCount : undefined,
					tabBarBadgeStyle: styles.badge,
				}}
			/>
			<Tabs.Screen
				name="calendar"
				options={{
					title: 'Calendar',
					tabBarIcon: ({ color }) => <TabIcon symbol="▦" color={color} />,
				}}
			/>
			<Tabs.Screen
				name="darts"
				options={{
					title: 'Player',
					tabBarIcon: ({ color }) => <TabIcon symbol="♙" color={color} />,
				}}
			/>
			<Tabs.Screen
				name="life"
				options={{
					title: 'Life',
					tabBarIcon: ({ color }) => <TabIcon symbol="◇" color={color} />,
				}}
			/>
			<Tabs.Screen
				name="world"
				options={{
					title: 'World',
					tabBarIcon: ({ color }) => <TabIcon symbol="◉" color={color} />,
				}}
			/>
		</Tabs>
	);
}

const styles = StyleSheet.create({
	tabBar: {
		backgroundColor: colors.surface,
		borderTopColor: colors.border,
		height: 66,
		paddingBottom: 7,
		paddingTop: 6,
	},
	label: {
		fontSize: 11,
		fontWeight: '700',
	},
	badge: {
		backgroundColor: colors.warning,
		color: colors.background,
		fontWeight: '900',
	},
	icon: {
		fontSize: 22,
		fontWeight: '700',
	},
});

