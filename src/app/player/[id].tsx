import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '../../components/AppScreen';
import { AttributeBar } from '../../components/AttributeBar';
import { Card } from '../../components/Card';
import { MissingCareer } from '../../components/MissingCareer';
import { DartsImage } from '../../components/DartsImage';
import { StatTile } from '../../components/StatTile';
import { WORLD_PLAYERS } from '../../data/seed/worldPlayers';
import { buildWorldRanking, tierLabel } from '../../domain/world';
import { useCareerStore } from '../../state/careerStore';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import { formatAverage, formatPercent, titleCase } from '../../utils/format';

export default function PlayerProfileScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const career = useCareerStore((state) => state.career);
	const league = useCareerStore((state) => state.league);
	const coaching = useCareerStore((state) => state.coachingContract);
	const equippedDarts = useCareerStore((state) => state.ownedDarts.find((darts) => darts.isEquipped) ?? null);
	if (!career) {
		return <MissingCareer />;
	}
	const isHuman = id === career.playerId;
	const leaguePlayer = league?.players.find((player) => player.id === id);
	const siblingLeague = league?.siblingLeagues?.find((candidate) => (
		candidate.players.some((player) => player.id === id)
	));
	const siblingPlayer = siblingLeague?.players.find((player) => player.id === id);
	const worldPlayer = buildWorldRanking(WORLD_PLAYERS, career.weeksElapsed)
		.find((player) => player.id === id);
	const standing = league?.standings.find((entry) => entry.playerId === id);
	const player = isHuman ? {
		name: career.name,
		style: career.style,
		attributes: career.attributes,
		form: career.form,
		fatigue: career.fatigue,
	} : leaguePlayer ?? siblingPlayer ?? worldPlayer;

	if (!player) {
		return (
			<AppScreen title="Player unavailable" subtitle="This player profile could not be loaded.">
				<Text style={styles.muted}>Return to the World or Darts tab and choose a current player.</Text>
			</AppScreen>
		);
	}

	const checkoutPercent = career.stats.checkoutAttempts > 0
		? (career.stats.checkouts / career.stats.checkoutAttempts) * 100
		: 0;
	const winPercent = career.stats.matchesPlayed > 0
		? (career.stats.matchesWon / career.stats.matchesPlayed) * 100
		: 0;

	return (
		<AppScreen
			eyebrow={isHuman
				? `${career.tier} · Season ${career.season}`
				: worldPlayer
					? `${tierLabel(worldPlayer.tier)} · World #${worldPlayer.rank}`
					: siblingLeague?.name ?? league?.name}
			title={player.name}
			subtitle={`${titleCase(player.style)} · Form ${signed(player.form)} · Fatigue ${player.fatigue}%`}
		>
			{isHuman ? <DartsImage dartsId={equippedDarts?.id} /> : null}
			<View style={styles.identityCard}>
				<View style={styles.avatar}>
					<Text style={styles.initials}>{initials(player.name)}</Text>
				</View>
				<View style={styles.identityText}>
					<Text style={styles.name}>{player.name}</Text>
					<Text style={styles.muted}>{isHuman
						? `${career.location} · Born ${career.dateOfBirth} · Age ${career.age} · Week ${career.weeksElapsed + 1}`
						: worldPlayer
							? `${worldPlayer.country} · Age ${worldPlayer.age} · Est. avg ${worldPlayer.typicalAverage} · ${worldPlayer.points.toLocaleString()} points`
							: siblingLeague ? `${siblingLeague.area} local competitor` : 'Northbridge district competitor'}</Text>
				</View>
			</View>

			<Card title="Underlying attributes">
				<AttributeBar label="Scoring" value={player.attributes.scoring} />
				<AttributeBar label="Finishing" value={player.attributes.finishing} />
				<AttributeBar label="Consistency" value={player.attributes.consistency} />
				<AttributeBar label="Composure" value={player.attributes.composure} />
				<AttributeBar label="Stamina" value={player.attributes.stamina} />
			</Card>

			{isHuman ? (
				<Card label={`${career.stats.matchesPlayed} completed matches`} title="Career statistics">
					<View style={styles.statsGrid}>
						<StatTile label="3-dart average" value={formatAverage(career.stats.pointsScored, career.stats.dartsThrown)} />
						<StatTile label="Checkout rate" value={career.stats.checkoutAttempts ? formatPercent(checkoutPercent) : '—'} />
						<StatTile label="Highest checkout" value={career.stats.highestCheckout ? `${career.stats.highestCheckout}` : '—'} />
						<StatTile label="180s" value={`${career.stats.oneEighties}`} />
						<StatTile label="9-darters" value={`${career.stats.nineDarters}`} />
						<StatTile label="Match win rate" value={career.stats.matchesPlayed ? formatPercent(winPercent) : '—'} />
					</View>
					<Text style={styles.body}>Matches: {career.stats.matchesWon} won · {career.stats.matchesLost} lost</Text>
					<Text style={styles.body}>Legs: {career.stats.legsWon} won · {career.stats.legsLost} lost</Text>
					<Text style={styles.muted}>Only completed, saved matches contribute to your career record.</Text>
				</Card>
			) : worldPlayer ? (
				<Card label="Persistent world record" title={`World ranking #${worldPlayer.rank}`}>
					<Text style={styles.body}>{worldPlayer.points.toLocaleString()} points · {tierLabel(worldPlayer.tier)}</Text>
					<Text style={worldPlayer.movement === 'promoted' ? styles.positive : worldPlayer.movement === 'relegated' ? styles.negative : styles.muted}>
						{worldPlayer.movement === 'promoted'
							? `Promoted from ${tierLabel(worldPlayer.previousTier)}`
							: worldPlayer.movement === 'relegated'
								? `Relegated from ${tierLabel(worldPlayer.previousTier)}`
								: 'Holding current circuit place'}
					</Text>
				</Card>
			) : (
				<Card label={`Season ${league?.season ?? career.season}`} title="League record">
					<Text style={styles.body}>{siblingLeague
						? `${siblingLeague.standings.find((entry) => entry.playerId === id)?.played ?? 0} played · ${siblingLeague.standings.find((entry) => entry.playerId === id)?.won ?? 0} won · ${siblingLeague.standings.find((entry) => entry.playerId === id)?.points ?? 0} points`
						: `${standing?.played ?? 0} played · ${standing?.won ?? 0} won · ${standing?.points ?? 0} points`}</Text>
					<Text style={styles.muted}>Only competition-derived records are shown for AI players.</Text>
				</Card>
			)}

			{isHuman ? (
				<Card label="Current setup" title={equippedDarts?.name ?? 'Club darts'}>
					<Text style={styles.body}>{equippedDarts ? `${equippedDarts.weightGrams}g · ${equippedDarts.barrel}` : 'Neutral starter setup'}</Text>
					<Text style={styles.muted}>Coach: {coaching ? `${coaching.name} · ${titleCase(coaching.mode)}` : 'None hired'}</Text>
				</Card>
			) : null}
		</AppScreen>
	);
}

function initials(name: string): string {
	return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function signed(value: number): string {
	return value > 0 ? `+${value}` : `${value}`;
}

const styles = StyleSheet.create({
	identityCard: {
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderColor: colors.border,
		borderRadius: radii.md,
		borderWidth: 1,
		flexDirection: 'row',
		gap: spacing.md,
		padding: spacing.md,
	},
	avatar: {
		alignItems: 'center',
		backgroundColor: colors.primaryMuted,
		borderRadius: radii.pill,
		height: 62,
		justifyContent: 'center',
		width: 62,
	},
	initials: {
		color: colors.primary,
		fontSize: typography.heading,
		fontWeight: '900',
	},
	identityText: {
		flex: 1,
		gap: spacing.xs,
	},
	statsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
	},
	name: {
		color: colors.text,
		fontSize: typography.heading,
		fontWeight: '900',
	},
	body: {
		color: colors.text,
		fontSize: typography.body,
		lineHeight: 21,
	},
	muted: {
		color: colors.textMuted,
		fontSize: typography.caption,
		lineHeight: 19,
	},
	positive: {
		color: colors.primary,
		fontSize: typography.caption,
		fontWeight: '800',
	},
	negative: {
		color: colors.danger,
		fontSize: typography.caption,
		fontWeight: '800',
	},
});

