import type { ImageSourcePropType } from 'react-native';

import { HeroImage } from './HeroImage';

const HOUSING_IMAGES: Record<string, ImageSourcePropType> = {
	'home-shared-flat': require('../../assets/images/home-shared-flat.png'),
	'home-studio': require('../../assets/images/home-studio.png'),
	'home-one-bed': require('../../assets/images/home-one-bed.png'),
};

const FALLBACK_HOUSING_IMAGE = require('../../assets/images/home-shared-flat.png') as ImageSourcePropType;

export function HousingImage({ homeId }: { homeId?: string | null }) {
	return <HeroImage source={HOUSING_IMAGES[homeId ?? ''] ?? FALLBACK_HOUSING_IMAGE} />;
}

