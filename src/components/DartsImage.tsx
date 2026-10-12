import type { ImageSourcePropType } from 'react-native';

import { HeroImage } from './HeroImage';

const DARTS_IMAGES: Record<string, ImageSourcePropType> = {
	'darts-house-23': require('../../assets/images/darts-house-23.png'),
	'darts-harrier-22': require('../../assets/images/darts-harrier-22.png'),
	'darts-vector-24': require('../../assets/images/darts-vector-24.png'),
	'darts-balance-21': require('../../assets/images/darts-balance-21.png'),
};

const FALLBACK_DARTS_IMAGE = require('../../assets/images/darts-house-23.png') as ImageSourcePropType;

export function DartsImage({ dartsId }: { dartsId?: string | null }) {
	return <HeroImage source={DARTS_IMAGES[dartsId ?? ''] ?? FALLBACK_DARTS_IMAGE} />;
}

