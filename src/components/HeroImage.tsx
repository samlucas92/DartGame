import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';

import { radii } from '../theme/tokens';

export function HeroImage({ source }: { source: ImageSourcePropType }) {
	return <Image source={source} resizeMode="cover" style={styles.image} />;
}

const styles = StyleSheet.create({
	image: {
		borderRadius: radii.sm,
		height: 156,
		width: '100%',
	},
});

