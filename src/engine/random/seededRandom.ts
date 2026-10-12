export type RandomSample = {
	value: number;
	state: number;
};

const UINT32_RANGE = 4_294_967_296;

export function normalizeSeed(seed: number): number {
	const normalized = seed >>> 0;
	return normalized === 0 ? 0x6d2b79f5 : normalized;
}

export function nextRandom(state: number): RandomSample {
	let nextState = normalizeSeed(state);
	nextState ^= nextState << 13;
	nextState ^= nextState >>> 17;
	nextState ^= nextState << 5;
	nextState >>>= 0;

	return {
		value: nextState / UINT32_RANGE,
		state: nextState,
	};
}

export function randomInt(state: number, minimum: number, maximum: number): RandomSample {
	const sample = nextRandom(state);
	return {
		value: Math.floor(sample.value * (maximum - minimum + 1)) + minimum,
		state: sample.state,
	};
}

