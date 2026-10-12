import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, {
	Circle,
	G,
	Line,
	Path,
	Text as SvgText,
} from 'react-native-svg';

import type { DartThrow, Visit } from '../engine/darts/types';
import { colors, radii, spacing, typography } from '../theme/tokens';

const SIZE = 300;
const CENTER = SIZE / 2;
const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const BLACK = '#171b19';
const CREAM = '#e7d8b7';
const RED = '#b52d3b';
const GREEN = '#17704c';
const WIRE = '#d7d9d8';

type Point = { x: number; y: number };

function polar(radius: number, angleDegrees: number): Point {
	const angle = (angleDegrees * Math.PI) / 180;
	return {
		x: CENTER + Math.cos(angle) * radius,
		y: CENTER + Math.sin(angle) * radius,
	};
}

function annularSector(innerRadius: number, outerRadius: number, start: number, end: number): string {
	const outerStart = polar(outerRadius, start);
	const outerEnd = polar(outerRadius, end);
	const innerEnd = polar(innerRadius, end);
	const innerStart = polar(innerRadius, start);
	return [
		`M ${outerStart.x} ${outerStart.y}`,
		`A ${outerRadius} ${outerRadius} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
		`L ${innerEnd.x} ${innerEnd.y}`,
		`A ${innerRadius} ${innerRadius} 0 0 0 ${innerStart.x} ${innerStart.y}`,
		'Z',
	].join(' ');
}

function impactPoint(dart: DartThrow, index: number): Point {
	const segment = dart.hit.segment ?? dart.target.segment ?? 20;
	const segmentIndex = Math.max(0, BOARD_ORDER.indexOf(segment));
	const angle = segmentIndex * 18 - 90 + [-2.8, 1.1, 3.2][index % 3]!;
	const radius = dart.hit.bed === 'bull'
		? 3 + index * 1.5
		: dart.hit.bed === 'outer-bull'
			? 11 + index
			: dart.hit.bed === 'treble'
				? 77
				: dart.hit.bed === 'double'
					? 131
					: dart.hit.bed === 'miss'
						? 142
						: index % 2 === 0 ? 103 : 49;
	return polar(radius, angle);
}

function FlyingDart({ point, index, boardScale }: { point: Point; index: number; boardScale: number }) {
	const [progress] = useState(() => new Animated.Value(0));
	const dartSize = 40 * Math.max(0.58, boardScale);
	useEffect(() => {
		Animated.spring(progress, {
			toValue: 1,
			useNativeDriver: true,
			speed: 24,
			bounciness: 5,
		}).start();
	}, [progress]);

	return (
		<Animated.View
			style={[
				styles.flyingDart,
				{
					height: dartSize,
					left: point.x * boardScale - dartSize / 2,
					top: point.y * boardScale - dartSize / 2,
					width: dartSize,
					opacity: progress,
					transform: [
						{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) },
						{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-70, 0] }) },
						{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1.35, 1] }) },
					],
				},
			]}
		>
			<Svg width={dartSize} height={dartSize} viewBox="0 0 40 40">
				<Line x1="35" y1="5" x2="20" y2="20" stroke="#d8e4df" strokeWidth="2.5" />
				<Path d="M 35 5 L 34 13 L 27 6 Z" fill={index === 0 ? colors.warning : index === 1 ? colors.primary : '#6db6ff'} />
				<Path d="M 20 20 L 17 24 L 21 21 Z" fill="#f1f5f3" />
				<Circle cx="19" cy="21" r="3.5" fill={colors.background} stroke={colors.white} strokeWidth="1.5" />
				<SvgText x="19" y="23.5" fill={colors.white} fontSize="7" fontWeight="900" textAnchor="middle">
					{index + 1}
				</SvgText>
			</Svg>
		</Animated.View>
	);
}

function BoardFace({ size }: { size: number }) {
	return (
		<Svg width={size} height={size} viewBox={`0 0 ${SIZE} ${SIZE}`}>
			<Circle cx={CENTER} cy={CENTER} r="149" fill="#0b0d0c" stroke="#454b48" strokeWidth="3" />
			<Circle cx={CENTER} cy={CENTER} r="139" fill="#111412" />
			<G>
				{BOARD_ORDER.map((segment, index) => {
					const start = index * 18 - 99;
					const end = start + 18;
					const dark = index % 2 === 0;
					return (
						<G key={segment}>
							<Path d={annularSector(16, 72, start, end)} fill={dark ? BLACK : CREAM} />
							<Path d={annularSector(72, 82, start, end)} fill={dark ? RED : GREEN} />
							<Path d={annularSector(82, 126, start, end)} fill={dark ? BLACK : CREAM} />
							<Path d={annularSector(126, 136, start, end)} fill={dark ? RED : GREEN} />
						</G>
					);
				})}
			</G>
			{BOARD_ORDER.map((segment, index) => {
				const boundary = polar(136, index * 18 - 99);
				const inner = polar(16, index * 18 - 99);
				const number = polar(144, index * 18 - 90);
				return (
					<G key={`wire-${segment}`}>
						<Line x1={inner.x} y1={inner.y} x2={boundary.x} y2={boundary.y} stroke={WIRE} strokeWidth="0.7" />
						<SvgText
							x={number.x}
							y={number.y + 3.5}
							fill="#f5f7f6"
							fontSize="10"
							fontWeight="800"
							textAnchor="middle"
						>
							{segment}
						</SvgText>
					</G>
				);
			})}
			{[16, 72, 82, 126, 136].map((radius) => (
				<Circle key={radius} cx={CENTER} cy={CENTER} r={radius} fill="none" stroke={WIRE} strokeWidth="0.9" />
			))}
			<Circle cx={CENTER} cy={CENTER} r="16" fill={GREEN} stroke={WIRE} strokeWidth="0.9" />
			<Circle cx={CENTER} cy={CENTER} r="7" fill={RED} stroke={WIRE} strokeWidth="0.9" />
		</Svg>
	);
}

export function Dartboard({
	visit,
	playerName,
	visibleDarts,
	compact = false,
	maxSize = SIZE,
}: {
	visit?: Visit;
	playerName?: string;
	visibleDarts?: number;
	compact?: boolean;
	maxSize?: number;
}) {
	const { width } = useWindowDimensions();
	const availableWidth = compact ? width - 168 : width - 64;
	const boardSize = Math.max(120, Math.min(maxSize, availableWidth));
	const boardScale = boardSize / SIZE;
	const shownDarts = visit?.darts.slice(0, visibleDarts ?? visit.darts.length) ?? [];
	const board = (
		<View style={[styles.boardWrap, { height: boardSize, width: boardSize }]}> 
			<BoardFace size={boardSize} />
			{shownDarts.map((dart, index) => (
				<FlyingDart
					key={`${visit?.playerId}-${index}-${dart.hit.label}`}
					point={impactPoint(dart, index)}
					index={index}
					boardScale={boardScale}
				/>
			))}
		</View>
	);
	if (compact) {
		return board;
	}
	return (
		<View style={styles.card}>
			<View style={styles.headingRow}>
				<View>
					<Text style={styles.label}>LIVE AT THE OCHE</Text>
					<Text style={styles.title}>{visit ? playerName ?? 'Player' : 'Ready to play'}</Text>
				</View>
				<Text style={styles.hits}>{shownDarts.map((dart) => dart.hit.label).join(' · ') || '—'}</Text>
			</View>
			{board}
			<Text style={styles.caption}>
				{visit
					? `${shownDarts.length}/${visit.darts.length} darts · ${shownDarts.reduce((total, dart) => total + dart.hit.score, 0)} scored`
					: 'Press Start Match once. Every visit then plays automatically.'}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderColor: colors.border,
		borderRadius: radii.lg,
		borderWidth: 1,
		gap: spacing.sm,
		padding: spacing.sm,
	},
	headingRow: {
		alignItems: 'flex-end',
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: spacing.sm,
		width: '100%',
	},
	label: {
		color: colors.primary,
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 1,
	},
	title: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '800',
	},
	hits: {
		color: colors.textMuted,
		fontSize: typography.caption,
		fontWeight: '700',
	},
	boardWrap: {
		borderRadius: radii.pill,
		position: 'relative',
	},
	flyingDart: {
		height: 40,
		position: 'absolute',
		width: 40,
	},
	caption: {
		color: colors.textMuted,
		fontSize: 11,
		lineHeight: 16,
		paddingBottom: spacing.xs,
		textAlign: 'center',
	},
});

