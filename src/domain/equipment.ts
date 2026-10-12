import type { PlayerAttributes } from './career';

export type DartsSet = {
	id: string;
	name: string;
	weightGrams: number;
	barrel: string;
	tungstenPercent: number;
	barrelLengthMm: number;
	barrelWidthMm: number;
	grip: string;
	shaft: string;
	flightShape: string;
	description: string;
	pricePence: number;
	modifiers: Partial<PlayerAttributes>;
};

export type OwnedDarts = DartsSet & {
	purchasedAt: string;
	isEquipped: boolean;
};

export function applyDartsModifiers(
	attributes: PlayerAttributes,
	darts: DartsSet | null,
): PlayerAttributes {
	if (!darts) {
		return { ...attributes };
	}
	return Object.fromEntries(Object.entries(attributes).map(([attribute, value]) => {
		const modifier = darts.modifiers[attribute as keyof PlayerAttributes] ?? 0;
		return [attribute, Math.min(100, Math.max(0, value + modifier))];
	})) as PlayerAttributes;
}

