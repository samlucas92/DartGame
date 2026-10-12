import { router } from 'expo-router';
import { Text } from 'react-native';

import { colors } from '../theme/tokens';
import { ActionButton } from './ActionButton';
import { AppScreen } from './AppScreen';
import { Card } from './Card';

export function MissingCareer() {
	return (
		<AppScreen title="No career loaded">
			<Card title="Create a player first">
				<Text style={{ color: colors.textMuted }}>Career tabs use your persisted player data.</Text>
			</Card>
			<ActionButton label="Return to start" onPress={() => router.replace('/')} />
		</AppScreen>
	);
}

