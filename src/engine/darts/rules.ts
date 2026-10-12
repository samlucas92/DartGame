import type { DartHit, DartTarget, DartThrow, Visit } from './types';

const DOUBLE_BULL_SCORE = 50;

export function isWinningDouble(hit: DartHit): boolean {
	return hit.bed === 'double' || hit.bed === 'bull';
}

export function targetForHit(hit: DartHit): DartTarget {
	if (hit.bed === 'miss') {
		return singleTarget(20);
	}

	return {
		bed: hit.bed,
		segment: hit.segment,
		label: hit.label,
		score: hit.score,
	};
}

export function singleTarget(segment: number): DartTarget {
	return { bed: 'single', segment, label: `S${segment}`, score: segment };
}

export function doubleTarget(segment: number): DartTarget {
	return { bed: 'double', segment, label: `D${segment}`, score: segment * 2 };
}

export function trebleTarget(segment: number): DartTarget {
	return { bed: 'treble', segment, label: `T${segment}`, score: segment * 3 };
}

export function outerBullTarget(): DartTarget {
	return { bed: 'outer-bull', label: '25', score: 25 };
}

export function bullTarget(): DartTarget {
	return { bed: 'bull', label: 'BULL', score: DOUBLE_BULL_SCORE };
}

export function missHit(): DartHit {
	return { bed: 'miss', label: 'MISS', score: 0 };
}

export function hitTarget(target: DartTarget): DartHit {
	return { ...target };
}

export function scoreVisit(playerId: string, startScore: number, hits: readonly DartHit[]): Visit {
	if (startScore <= 1) {
		throw new Error('A visit must begin with a finishable positive score.');
	}

	let remaining = startScore;
	let bust = false;
	let checkout = false;
	const darts: DartThrow[] = [];

	for (const hit of hits.slice(0, 3)) {
		if (checkout || bust) {
			break;
		}

		const remainingBefore = remaining;
		const candidate = remainingBefore - hit.score;
		const winningDouble = candidate === 0 && isWinningDouble(hit);
		const invalidZero = candidate === 0 && !winningDouble;
		const isBust = candidate < 0 || candidate === 1 || invalidZero;
		const checkoutAttempt = hit.score === remainingBefore && isWinningDouble(hit);

		if (isBust) {
			bust = true;
			remaining = startScore;
		} else {
			remaining = candidate;
			checkout = winningDouble;
		}

		darts.push({
			target: targetForHit(hit),
			hit,
			remainingBefore,
			remainingAfter: remaining,
			checkoutAttempt,
			winningDouble,
		});
	}

	return {
		playerId,
		startScore,
		endScore: remaining,
		score: bust ? 0 : startScore - remaining,
		darts,
		bust,
		checkout,
	};
}

export function isLegalHit(hit: DartHit): boolean {
	if (hit.bed === 'miss') {
		return hit.score === 0 && hit.segment === undefined;
	}
	if (hit.bed === 'outer-bull') {
		return hit.score === 25 && hit.segment === undefined;
	}
	if (hit.bed === 'bull') {
		return hit.score === 50 && hit.segment === undefined;
	}
	if (hit.segment === undefined || hit.segment < 1 || hit.segment > 20) {
		return false;
	}

	const multiplier = hit.bed === 'single' ? 1 : hit.bed === 'double' ? 2 : 3;
	return hit.score === hit.segment * multiplier;
}

