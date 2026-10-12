import {
	bullTarget,
	doubleTarget,
	outerBullTarget,
	singleTarget,
	trebleTarget,
} from './rules';
import type { DartTarget } from './types';

const MAX_CHECKOUT = 170;

function directFinish(remaining: number): DartTarget | undefined {
	if (remaining === 50) {
		return bullTarget();
	}
	if (remaining >= 2 && remaining <= 40 && remaining % 2 === 0) {
		return doubleTarget(remaining / 2);
	}
	return undefined;
}

function setupTargets(): DartTarget[] {
	const targets: DartTarget[] = [];
	for (let segment = 20; segment >= 1; segment -= 1) {
		targets.push(trebleTarget(segment));
	}
	targets.push(outerBullTarget());
	for (let segment = 20; segment >= 1; segment -= 1) {
		targets.push(singleTarget(segment));
	}
	return targets;
}

const SETUP_TARGETS = setupTargets();

export function findCheckoutRoute(remaining: number, dartsLeft: number): DartTarget[] | undefined {
	if (remaining < 2 || remaining > MAX_CHECKOUT || dartsLeft < 1) {
		return undefined;
	}

	const finish = directFinish(remaining);
	if (finish) {
		return [finish];
	}
	if (dartsLeft === 1) {
		return undefined;
	}

	for (const target of SETUP_TARGETS) {
		const nextRemaining = remaining - target.score;
		if (nextRemaining <= 1) {
			continue;
		}
		const continuation = findCheckoutRoute(nextRemaining, dartsLeft - 1);
		if (continuation) {
			return [target, ...continuation];
		}
	}

	return undefined;
}

export function chooseTarget(remaining: number, dartsLeft: number): DartTarget {
	const checkoutRoute = findCheckoutRoute(remaining, dartsLeft);
	if (checkoutRoute?.[0]) {
		return checkoutRoute[0];
	}

	if (remaining <= 60) {
		for (let segment = 20; segment >= 1; segment -= 1) {
			const leave = remaining - segment;
			if (leave >= 2 && leave <= 40 && leave % 2 === 0) {
				return singleTarget(segment);
			}
		}
	}

	if (remaining === 169) {
		return trebleTarget(19);
	}
	if (remaining === 168) {
		return trebleTarget(18);
	}
	if (remaining === 166) {
		return trebleTarget(20);
	}
	return trebleTarget(20);
}

