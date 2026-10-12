import type { SQLiteDatabase } from 'expo-sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCareerStore } from '../state/careerStore';

function resetStore(): void {
	useCareerStore.setState({
		career: null,
		latestMatch: null,
		latestWeekSummary: null,
		ledgerEntries: [],
		trainingPlan: null,
		league: null,
		coachingContract: null,
		ownedDarts: [],
		hydrationStatus: 'idle',
		busy: false,
		error: null,
	});
}

describe('career store startup', () => {
	beforeEach(resetStore);

	afterEach(() => {
		vi.useRealTimers();
	});

	it('finishes the save check when no career exists', async () => {
		const db = {
			getFirstAsync: async () => null,
			getAllAsync: async () => [],
		} as unknown as SQLiteDatabase;

		await useCareerStore.getState().hydrate(db);

		expect(useCareerStore.getState().hydrationStatus).toBe('ready');
		expect(useCareerStore.getState().career).toBeNull();
		expect(useCareerStore.getState().error).toBeNull();
	});

	it('turns a stalled database read into a retryable error', async () => {
		vi.useFakeTimers();
		const stalled = () => new Promise<never>(() => undefined);
		const db = {
			getFirstAsync: stalled,
			getAllAsync: stalled,
		} as unknown as SQLiteDatabase;
		const hydration = useCareerStore.getState().hydrate(db);

		await vi.advanceTimersByTimeAsync(10_000);
		await hydration;

		expect(useCareerStore.getState().hydrationStatus).toBe('error');
		expect(useCareerStore.getState().error).toMatch(/did not respond/i);
	});
});

