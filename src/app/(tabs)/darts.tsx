import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { AttributeBar } from '../../components/AttributeBar';
import { Card } from '../../components/Card';
import { MissingCareer } from '../../components/MissingCareer';
import { DartsImage } from '../../components/DartsImage';
import { StatTile } from '../../components/StatTile';
import { currentHumanFixture, fixtureOpponent } from '../../data/repositories/leagueRepository';
import { useCareerStore } from '../../state/careerStore';
import { colors, spacing, typography } from '../../theme/tokens';
import { formatAverage, formatPercent, titleCase } from '../../utils/format';

export default function DartsScreen() {
	const career = useCareerStore((state) => state.career);
	const trainingPlan = useCareerStore((state) => state.trainingPlan);
	const league = useCareerStore((state) => state.league);
	const equippedDarts = useCareerStore((state) => state.ownedDarts.find((darts) => darts.isEquipped) ?? null);
	if (!career) {
		return <MissingCareer />;
	}

	const checkoutPercent = career.stats.checkoutAttempts === 0
		? 0
		: (career.stats.checkouts / career.stats.checkoutAttempts) * 100;
	const fixture = league ? currentHumanFixture(league, career) : null;
	const opponent = fixture && league ? fixtureOpponent(league, fixture, career.playerId) : null;

	return (
		<AppScreen
			eyebrow={`${career.tier} · Season ${career.season}`}
			title={career.name}
			subtitle={`${career.location} · Age ${career.age} · ${titleCase(career.style)}`}
		>
			<DartsImage dartsId={equippedDarts?.id} />
			<Card label="Player profile" title={`${career.stats.matchesWon}W – ${career.stats.matchesLost}L`}>
				<View style={styles.identityRow}>
					<View style={styles.avatar}>
						<Text style={styles.initials}>{initials(career.name)}</Text>
					</View>
					<View style={styles.identityText}>
						<Text style={styles.body}>Week {career.weeksElapsed + 1} · Potential {career.potential}</Text>
						<Text style={styles.muted}>Form {career.form >= 0 ? '+' : ''}{career.form} · Fatigue {career.fatigue}%</Text>
					</View>
				</View>
				<ActionButton
					label="Detailed Career History"
					variant="secondary"
					onPress={() => router.push(`/player/${career.playerId}`)}
				/>
			</Card>
			<Card title="Attributes">
				<AttributeBar label="Scoring" value={career.attributes.scoring} />
				<AttributeBar label="Finishing" value={career.attributes.finishing} />
				<AttributeBar label="Consistency" value={career.attributes.consistency} />
				<AttributeBar label="Composure" value={career.attributes.composure} />
				<AttributeBar label="Stamina" value={career.attributes.stamina} />
			</Card>

			<Card label="Equipped darts" title={equippedDarts?.name ?? 'Club darts'}>
				<Text style={styles.muted}>
					{equippedDarts ? `${equippedDarts.weightGrams}g · ${equippedDarts.description}` : 'Neutral starter setup'}
				</Text>
				<ActionButton label="Manage Darts" onPress={() => router.push('/equipment')} />
			</Card>

			<Card title="Observed career stats">
				<View style={styles.statsRow}>
					<StatTile
						label="3-dart avg"
						value={formatAverage(career.stats.pointsScored, career.stats.dartsThrown)}
					/>
					<StatTile label="Checkout" value={career.stats.checkoutAttempts ? formatPercent(checkoutPercent) : '—'} />
					<StatTile label="High out" value={career.stats.highestCheckout ? `${career.stats.highestCheckout}` : '—'} />
				</View>
				<Text style={styles.muted}>Only completed, persisted matches contribute to these figures.</Text>
			</Card>

			<Card label="Training plan" title={trainingPlan ? `${trainingPlan.totalHours} hours allocated` : 'Not planned'}>
				<Text style={styles.muted}>
					{trainingPlan
						? 'The plan will resolve when the week is completed.'
						: 'Allocate this week’s available practice hours before advancing.'}
				</Text>
				<ActionButton label={trainingPlan ? 'Edit Training Plan' : 'Plan Training'} onPress={() => router.push('/training')} />
			</Card>

			<Card label="League fixture" title={fixture ? `Round ${fixture.round} · Best of ${fixture.bestOf}` : 'Season schedule complete'}>
				<Text style={styles.body}>
					{fixture ? `Play ${opponent?.name ?? 'your next opponent'} visit by visit, by leg, or instantly.` : 'No remaining local league fixture this week.'}
				</Text>
				<ActionButton
					label={fixture?.status === 'complete' ? 'Fixture Complete' : `Start vs ${opponent?.name ?? 'Opponent'}`}
					disabled={!fixture || fixture.status === 'complete'}
					onPress={() => fixture && router.push(`/match/${fixture.id}`)}
				/>
			</Card>
		</AppScreen>
	);
}

const styles = StyleSheet.create({
	identityRow: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: spacing.md,
	},
	avatar: {
		alignItems: 'center',
		backgroundColor: colors.primaryMuted,
		borderRadius: 999,
		height: 58,
		justifyContent: 'center',
		width: 58,
	},
	initials: {
		color: colors.primary,
		fontSize: typography.heading,
		fontWeight: '900',
	},
	identityText: {
		flex: 1,
		gap: 3,
	},
	statsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
	},
	body: {
		color: colors.text,
		fontSize: typography.body,
	},
	muted: {
		color: colors.textMuted,
		fontSize: typography.caption,
		lineHeight: 19,
	},
});

function initials(name: string): string {
	return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

