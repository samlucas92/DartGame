import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, Text } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { HeroImage } from '../components/HeroImage';
import { MissingCareer } from '../components/MissingCareer';
import { SPONSOR_OFFERS } from '../data/seed/sponsorships';
import { sponsorUnlocked } from '../domain/sponsorship';
import { useCareerStore } from '../state/careerStore';
import { colors, typography } from '../theme/tokens';
import { formatCurrency } from '../utils/format';

export default function SponsorshipsScreen() {
	const db = useSQLiteContext();
	const career = useCareerStore((state) => state.career);
	const contract = useCareerStore((state) => state.sponsorshipContract);
	const claimed = useCareerStore((state) => state.claimedSponsorIds);
	const sign = useCareerStore((state) => state.signSponsorship);
	const busy = useCareerStore((state) => state.busy);
	const error = useCareerStore((state) => state.error);
	const messages = useCareerStore((state) => state.messages);
	if (!career) {
		return <MissingCareer />;
	}

	return (
		<AppScreen
			eyebrow={contract ? `Partner · ${contract.name}` : 'Commercial'}
			title="Sponsorships"
			subtitle="Earn better offers through match experience and wins. One sponsor can be active at a time."
		>
			<HeroImage source={require('../../assets/images/sponsorship-hero.png')} />
			{SPONSOR_OFFERS.map((offer) => {
				const unlocked = sponsorUnlocked(offer, career);
				const approached = messages.some((message) => message.id === `message-sponsor-offer-${offer.id}`);
				const active = contract?.id === offer.id;
				const alreadyClaimed = claimed.includes(offer.id);
				return (
					<Card key={offer.id} label={`${formatCurrency(offer.weeklyPaymentPence)}/week`} title={offer.name}>
						<Text style={styles.body}>{offer.tagline}</Text>
						<Text style={styles.reward}>Signing bonus · {formatCurrency(offer.signingBonusPence)}</Text>
						<Text style={styles.muted}>Requires {offer.requiredMatches} matches and {offer.requiredWins} wins · then the sponsor contacts you</Text>
						<Text style={styles.muted}>Performance clause · {offer.minimumWinsPerFour} win{offer.minimumWinsPerFour === 1 ? '' : 's'} per four matches</Text>
						<ActionButton
							label={active
								? 'Active Sponsor'
								: alreadyClaimed
									? 'Offer Previously Used'
									: unlocked && approached
										? 'Accept Contract Offer'
										: 'Offer Locked'}
							disabled={active || alreadyClaimed || !unlocked || !approached || busy}
							onPress={() => void sign(db, offer)}
						/>
					</Card>
				);
			})}
			{error ? <Text style={styles.error}>{error}</Text> : null}
			<ActionButton label="Back to Life" variant="ghost" onPress={() => router.back()} />
		</AppScreen>
	);
}

const styles = StyleSheet.create({
	body: {
		color: colors.text,
		fontSize: typography.body,
		lineHeight: 21,
	},
	reward: {
		color: colors.primary,
		fontSize: typography.caption,
		fontWeight: '800',
	},
	muted: {
		color: colors.textMuted,
		fontSize: typography.caption,
	},
	error: {
		color: colors.danger,
		fontSize: typography.caption,
		textAlign: 'center',
	},
});

