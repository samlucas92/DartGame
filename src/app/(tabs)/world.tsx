import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '../../components/AppScreen';
import { Card } from '../../components/Card';
import { MissingCareer } from '../../components/MissingCareer';
import { WORLD_LEAGUES } from '../../data/seed/worldLeagues';
import { WORLD_PLAYERS } from '../../data/seed/worldPlayers';
import { careerPathway } from '../../domain/career';
import {
	buildWorldRanking,
	CIRCUIT_POPULATION,
	tierLabel,
	WORLD_PLAYER_COUNT,
	WORLD_TIERS,
	type WorldTier,
} from '../../domain/world';
import { useCareerStore } from '../../state/careerStore';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export default function WorldScreen() {
	const [selectedTier, setSelectedTier] = useState<WorldTier | 'all'>('all');
	const [playerSearch, setPlayerSearch] = useState('');
	const career = useCareerStore((state) => state.career);
	const league = useCareerStore((state) => state.league);
	if (!career) {
		return <MissingCareer />;
	}
	const completedFixtures = league?.fixtures.filter((fixture) => fixture.status === 'complete').length ?? 0;
	const seasonFixtures = league?.fixtures.length ?? 0;
	const ranking = buildWorldRanking(WORLD_PLAYERS, career.weeksElapsed);
	const tierPlayers = selectedTier === 'all'
		? ranking
		: ranking.filter((player) => player.tier === selectedTier);
	const normalizedSearch = playerSearch.trim().toLocaleLowerCase();
	const filteredPlayers = normalizedSearch
		? tierPlayers.filter((player) => (
			player.name.toLocaleLowerCase().includes(normalizedSearch)
			|| player.country.toLocaleLowerCase().includes(normalizedSearch)
		))
		: tierPlayers;
	const visiblePlayers = filteredPlayers.slice(0, 100);
	const pathway = careerPathway(career);
	const relegationPlayerId = [...(league?.standings ?? [])].reverse()
		.find((standing) => standing.playerId !== career.playerId)?.playerId;

	return (
		<AppScreen
			eyebrow="Six-level career pyramid"
			title="World"
			subtitle="Follow the professional game above you and see the route out of local darts."
		>
			<Card label={pathway.label} title="Your route upward">
				<Text style={styles.name}>{career.tier}</Text>
				<Text style={styles.note}>{pathway.detail}</Text>
			</Card>

			<Card label="League pyramid" title="Road to the professional tour">
				{WORLD_LEAGUES.map((division) => (
					<View key={division.id} style={[styles.division, division.id === 'lantern' ? styles.currentDivision : null]}>
						<View style={styles.levelBadge}><Text style={styles.level}>{division.level}</Text></View>
						<View style={styles.divisionText}>
							<Text style={styles.divisionName}>{division.name}</Text>
							<Text style={styles.note}>{division.tier} · {division.scope}</Text>
							<Text style={styles.format}>{division.format}</Text>
						</View>
						<Text style={division.id === 'lantern' ? styles.youAreHere : styles.status}>{division.status}</Text>
					</View>
				))}
			</Card>

			<Card label="Simulated career world" title={`${WORLD_PLAYER_COUNT.toLocaleString()} active players`}>
				{CIRCUIT_POPULATION.map((circuit) => (
					<View key={circuit.label} style={styles.circuitRow}>
						<Text style={styles.note}>{circuit.label}</Text>
						<Text style={styles.circuitCount}>{circuit.playerCount.toLocaleString()}</Text>
					</View>
				))}
				<Text style={styles.note}>World elite players are the top 16 places within the 128-player professional tour.</Text>
			</Card>

			<Card label="Persistent fictional world" title={`${filteredPlayers.length.toLocaleString()} players in view`}>
				<TextInput
					accessibilityLabel="Search world players"
					autoCapitalize="words"
					onChangeText={setPlayerSearch}
					placeholder="Search player or country"
					placeholderTextColor={colors.textMuted}
					style={styles.searchInput}
					value={playerSearch}
				/>
				<View style={styles.filterRow}>
					{(['all', ...WORLD_TIERS] as const).map((tier) => (
						<Pressable
							key={tier}
							accessibilityRole="button"
							onPress={() => setSelectedTier(tier)}
							style={[styles.filterChip, selectedTier === tier ? styles.filterChipSelected : null]}
						>
							<Text style={selectedTier === tier ? styles.filterTextSelected : styles.filterText}>
								{tier === 'all' ? 'All' : shortTierLabel(tier)}
							</Text>
						</Pressable>
					))}
				</View>
				{visiblePlayers.map((player) => (
					<Pressable
						key={player.id}
						accessibilityRole="button"
						onPress={() => router.push(`/player/${player.id}`)}
						style={styles.proRow}
					>
						<Text style={styles.position}>{player.rank}</Text>
						<View style={styles.rankingName}>
							<Text style={styles.proName}>{player.name}</Text>
							<Text numberOfLines={1} style={styles.rankTier}>{tierLabel(player.tier)} · Est. avg {player.typicalAverage}</Text>
						</View>
						<Text style={styles.country}>{player.country}</Text>
						<Text style={player.movement === 'promoted' ? styles.promoted : player.movement === 'relegated' ? styles.relegated : styles.steady}>
							{player.movement === 'promoted' ? '▲' : player.movement === 'relegated' ? '▼' : '—'}
						</Text>
						<Text style={styles.proPoints}>{player.points.toLocaleString()}</Text>
					</Pressable>
				))}
				<Text style={styles.note}>
					Showing {visiblePlayers.length.toLocaleString()} of {filteredPlayers.length.toLocaleString()} matching players. Every 13 career weeks the ranking cut lines are recalculated; players can rise or fall through all six levels.
				</Text>
			</Card>

			<Card label="Local standings" title={league?.name ?? 'The Lantern League'}>
				<View style={styles.headerRow}>
					<Text style={styles.position}>#</Text>
					<Text style={styles.headerName}>Player</Text>
					<Text style={styles.record}>P</Text>
					<Text style={styles.record}>W</Text>
					<Text style={styles.record}>LD</Text>
					<Text style={styles.points}>Pts</Text>
					<Text style={styles.movementMark}>↕</Text>
				</View>
				{league?.standings.map((player, index) => (
					<Pressable
						key={player.playerId}
						accessibilityRole="button"
						onPress={() => router.push(`/player/${player.playerId}`)}
						style={[styles.row, player.playerId === career.playerId ? styles.humanRow : null]}
					>
						<Text style={styles.position}>{index + 1}</Text>
						<View style={styles.avatar}>
							<Text style={styles.initials}>
								{player.name.split(' ').map((part) => part[0]).join('')}
							</Text>
						</View>
						<Text style={styles.name}>{player.name}</Text>
						<Text style={styles.record}>{player.played}</Text>
						<Text style={styles.record}>{player.won}</Text>
						<Text style={styles.record}>{player.legDifference}</Text>
						<Text style={styles.points}>{player.points}</Text>
						<Text style={player.playerId === relegationPlayerId ? styles.relegated : styles.movementMark}>
							{player.playerId === relegationPlayerId ? '▼' : '—'}
						</Text>
					</Pressable>
				))}
			</Card>

			{league?.movements && league.movements.length > 0 ? (
				<Card label="Promotion and relegation" title="Latest local movement">
					{league.movements
						.filter((movement) => movement.season === league.season)
						.map((movement) => (
							<Pressable
								key={movement.id}
								accessibilityRole="button"
								onPress={() => router.push(`/player/${movement.player.id}`)}
								style={styles.movementRow}
							>
								<Text style={movement.direction === 'promoted' ? styles.promoted : styles.relegated}>
									{movement.direction === 'promoted' ? '▲' : '▼'}
								</Text>
								<View style={styles.rankingName}>
									<Text style={styles.proName}>{movement.player.name}</Text>
									<Text style={styles.note}>{movement.fromLeagueName} → {movement.toLeagueName}</Text>
								</View>
							</Pressable>
						))}
				</Card>
			) : null}

			<Card label="Northbridge district pyramid" title="Sibling local leagues">
				<Text style={styles.note}>Each league plays its own season. A champion enters the Lantern League while its lowest AI player drops into the corresponding sibling league.</Text>
				{league?.siblingLeagues?.map((sibling) => (
					<View key={sibling.id} style={styles.siblingLeague}>
						<View style={styles.siblingHeader}>
							<View>
								<Text style={styles.divisionName}>{sibling.name}</Text>
								<Text style={styles.note}>{sibling.area} · Six-player local league</Text>
							</View>
							<Text style={styles.status}>Promotion place ▲</Text>
						</View>
						{sibling.standings.map((standing, index) => (
							<Pressable
								key={standing.playerId}
								accessibilityRole="button"
								onPress={() => router.push(`/player/${standing.playerId}`)}
								style={styles.siblingRow}
							>
								<Text style={index === 0 ? styles.promoted : styles.position}>{index === 0 ? '▲' : index + 1}</Text>
								<Text style={styles.name}>{standing.name}</Text>
								<Text style={styles.record}>{standing.won}W</Text>
								<Text style={styles.points}>{standing.points}</Text>
							</Pressable>
						))}
					</View>
				))}
			</Card>

			<Card
				label={`Season ${league?.season ?? career.season} · ${completedFixtures}/${seasonFixtures} results`}
				title="Five-round local league"
			>
				<Text style={styles.name}>Six players · Best of 5 · Two points per win</Text>
				<Text style={styles.note}>Your result updates immediately. Other league results resolve when you complete the week, and a new table starts after round five.</Text>
			</Card>
		</AppScreen>
	);
}

const styles = StyleSheet.create({
	searchInput: {
		backgroundColor: colors.surfaceRaised,
		borderColor: colors.border,
		borderRadius: radii.sm,
		borderWidth: 1,
		color: colors.text,
		fontSize: typography.body,
		minHeight: 46,
		paddingHorizontal: spacing.md,
	},
	circuitRow: {
		alignItems: 'center',
		borderTopColor: colors.border,
		borderTopWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: spacing.sm,
	},
	circuitCount: {
		color: colors.primary,
		fontSize: typography.body,
		fontVariant: ['tabular-nums'],
		fontWeight: '900',
	},
	division: {
		alignItems: 'center',
		borderTopColor: colors.border,
		borderTopWidth: 1,
		flexDirection: 'row',
		gap: spacing.sm,
		paddingVertical: spacing.sm,
	},
	currentDivision: {
		backgroundColor: colors.primaryMuted,
		borderRadius: radii.sm,
		paddingHorizontal: spacing.sm,
	},
	levelBadge: {
		alignItems: 'center',
		backgroundColor: colors.surfaceRaised,
		borderRadius: radii.sm,
		height: 36,
		justifyContent: 'center',
		width: 36,
	},
	level: {
		color: colors.primary,
		fontSize: typography.body,
		fontWeight: '900',
	},
	divisionText: {
		flex: 1,
		gap: 2,
	},
	divisionName: {
		color: colors.text,
		fontSize: 14,
		fontWeight: '800',
	},
	format: {
		color: colors.textMuted,
		fontSize: 11,
	},
	status: {
		color: colors.textMuted,
		fontSize: 10,
		maxWidth: 62,
		textAlign: 'right',
	},
	youAreHere: {
		color: colors.primary,
		fontSize: 10,
		fontWeight: '900',
		maxWidth: 62,
		textAlign: 'right',
	},
	proRow: {
		alignItems: 'center',
		borderTopColor: colors.border,
		borderTopWidth: 1,
		flexDirection: 'row',
		gap: spacing.sm,
		minHeight: 42,
	},
	proName: {
		color: colors.text,
		fontSize: typography.caption,
		fontWeight: '700',
	},
	rankingName: {
		flex: 1,
		gap: 1,
	},
	rankTier: {
		color: colors.textMuted,
		fontSize: 9,
	},
	country: {
		color: colors.textMuted,
		fontSize: 11,
		width: 32,
	},
	proPoints: {
		color: colors.primary,
		fontSize: typography.caption,
		fontVariant: ['tabular-nums'],
		fontWeight: '800',
		textAlign: 'right',
		width: 52,
	},
	promoted: {
		color: colors.primary,
		fontSize: 11,
		width: 12,
	},
	relegated: {
		color: colors.danger,
		fontSize: 11,
		width: 12,
	},
	steady: {
		color: colors.textMuted,
		fontSize: 11,
		width: 12,
	},
	movementRow: {
		alignItems: 'center',
		borderTopColor: colors.border,
		borderTopWidth: 1,
		flexDirection: 'row',
		gap: spacing.sm,
		paddingVertical: spacing.sm,
	},
	siblingLeague: {
		borderTopColor: colors.border,
		borderTopWidth: 1,
		gap: spacing.xs,
		paddingTop: spacing.md,
	},
	siblingHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	siblingRow: {
		alignItems: 'center',
		backgroundColor: colors.surfaceRaised,
		borderRadius: radii.sm,
		flexDirection: 'row',
		gap: spacing.sm,
		minHeight: 38,
		paddingHorizontal: spacing.sm,
	},
	filterRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	filterChip: {
		backgroundColor: colors.surfaceRaised,
		borderColor: colors.border,
		borderRadius: radii.pill,
		borderWidth: 1,
		minHeight: 38,
		justifyContent: 'center',
		paddingHorizontal: spacing.sm,
	},
	filterChipSelected: {
		backgroundColor: colors.primaryMuted,
		borderColor: colors.primary,
	},
	filterText: {
		color: colors.textMuted,
		fontSize: 11,
		fontWeight: '700',
	},
	filterTextSelected: {
		color: colors.primary,
		fontSize: 11,
		fontWeight: '800',
	},
	row: {
		alignItems: 'center',
		borderTopColor: colors.border,
		borderTopWidth: 1,
		flexDirection: 'row',
		gap: spacing.sm,
		minHeight: 52,
		paddingHorizontal: spacing.xs,
	},
	humanRow: {
		backgroundColor: colors.primaryMuted,
		borderRadius: radii.sm,
	},
	headerRow: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: spacing.sm,
		paddingHorizontal: spacing.xs,
	},
	headerName: {
		color: colors.textMuted,
		flex: 1,
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
	},
	position: {
		color: colors.textMuted,
		fontSize: typography.caption,
		textAlign: 'center',
		width: 18,
	},
	avatar: {
		alignItems: 'center',
		backgroundColor: colors.primaryMuted,
		borderRadius: radii.pill,
		height: 34,
		justifyContent: 'center',
		width: 34,
	},
	initials: {
		color: colors.primary,
		fontSize: 11,
		fontWeight: '800',
	},
	name: {
		color: colors.text,
		flex: 1,
		fontSize: typography.body,
		fontWeight: '600',
	},
	record: {
		color: colors.textMuted,
		fontSize: typography.caption,
		textAlign: 'center',
		width: 24,
	},
	points: {
		color: colors.text,
		fontSize: typography.caption,
		fontWeight: '700',
		textAlign: 'center',
		width: 30,
	},
	movementMark: {
		color: colors.textMuted,
		fontSize: 11,
		textAlign: 'center',
		width: 12,
	},
	note: {
		color: colors.textMuted,
		fontSize: typography.caption,
		lineHeight: 19,
	},
});

function shortTierLabel(tier: WorldTier): string {
	return {
		'world-elite': 'Elite',
		professional: 'Pro',
		qualifying: 'Qualifying',
		'national-amateur': 'National',
		'regional-amateur': 'Regional',
		local: 'Local',
	}[tier];
}

