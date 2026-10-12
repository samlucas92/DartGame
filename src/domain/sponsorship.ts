import type { CareerProfile } from './career';

export type SponsorOffer = {
	id: string;
	name: string;
	tagline: string;
	signingBonusPence: number;
	weeklyPaymentPence: number;
	requiredMatches: number;
	requiredWins: number;
	minimumWinsPerFour: number;
};

export type SponsorshipContract = SponsorOffer & {
	signedAt: string;
};

export function sponsorUnlocked(offer: SponsorOffer, career: CareerProfile): boolean {
	return career.stats.matchesPlayed >= offer.requiredMatches
		&& career.stats.matchesWon >= offer.requiredWins;
}

