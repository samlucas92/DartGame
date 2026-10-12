import type { SponsorOffer } from '../../domain/sponsorship';

export const SPONSOR_OFFERS: SponsorOffer[] = [
	{
		id: 'sponsor-northbridge-flights',
		name: 'Northbridge Flights',
		tagline: 'A local flights and stems maker backing emerging league players.',
		signingBonusPence: 10_000,
		weeklyPaymentPence: 4_000,
		requiredMatches: 2,
		requiredWins: 0,
		minimumWinsPerFour: 1,
	},
	{
		id: 'sponsor-iron-ring',
		name: 'Iron Ring Darts',
		tagline: 'Independent equipment support for proven local competitors.',
		signingBonusPence: 25_000,
		weeklyPaymentPence: 8_500,
		requiredMatches: 5,
		requiredWins: 2,
		minimumWinsPerFour: 1,
	},
	{
		id: 'sponsor-lantern-apparel',
		name: 'Lantern Apparel',
		tagline: 'A regional shirt partner looking for a recognisable winner.',
		signingBonusPence: 50_000,
		weeklyPaymentPence: 15_000,
		requiredMatches: 10,
		requiredWins: 6,
		minimumWinsPerFour: 2,
	},
];

