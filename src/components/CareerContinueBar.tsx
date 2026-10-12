import { router, usePathname } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { currentHumanFixture, fixtureOpponent } from '../data/repositories/leagueRepository';
import { blockingCareerMessages } from '../domain/inbox';
import { useCareerStore } from '../state/careerStore';
import { QuickActionBar } from './QuickActionBar';

export function CareerContinueBar() {
	const db = useSQLiteContext();
	const pathname = usePathname();
	const career = useCareerStore((state) => state.career);
	const trainingPlan = useCareerStore((state) => state.trainingPlan);
	const league = useCareerStore((state) => state.league);
	const busy = useCareerStore((state) => state.busy);
	const messages = useCareerStore((state) => state.messages);
	const tournamentMatches = useCareerStore((state) => state.tournamentMatches);
	const advanceWeek = useCareerStore((state) => state.advanceWeek);

	if (!career || pathname === '/new-career' || pathname === '/week-summary') {
		return null;
	}

	const fixture = league ? currentHumanFixture(league, career) : null;
	const opponent = fixture && league ? fixtureOpponent(league, fixture, career.playerId) : null;
	const requiredMessage = blockingCareerMessages(messages)[0];

	if (requiredMessage) {
		return (
			<QuickActionBar
				title={requiredMessage.requiresResponse ? 'Message needs your decision' : 'Message requires attention'}
				detail={requiredMessage.subject}
				buttonLabel={requiredMessage.requiresResponse ? 'Respond' : 'Read'}
				onPress={() => router.push(`/message/${requiredMessage.id}`)}
			/>
		);
	}

	const tournamentMatch = tournamentMatches.find((match) => match.status === 'scheduled');
	if (tournamentMatch) {
		return (
			<QuickActionBar
				title={`Tournament · ${tournamentMatch.roundLabel}`}
				detail={`Next opponent · ${tournamentMatch.opponent.name}`}
				buttonLabel={pathname.startsWith('/match/') ? 'Playing' : 'Play'}
				disabled={pathname.startsWith('/match/')}
				onPress={() => router.push(`/match/${tournamentMatch.id}`)}
			/>
		);
	}

	if (!trainingPlan) {
		return (
			<QuickActionBar
				title="Next step · Plan training"
				detail="Your saved plan will repeat each week."
				buttonLabel="Plan"
				onPress={() => router.push('/training')}
			/>
		);
	}
	if (!fixture) {
		return (
			<QuickActionBar
				title="Schedule updating"
				detail="Open Calendar to refresh the next league round."
				buttonLabel="Calendar"
				onPress={() => router.push('/calendar')}
			/>
		);
	}
	if (fixture.status !== 'complete') {
		return (
			<QuickActionBar
				title={pathname.startsWith('/match/') ? 'Match in progress' : `Next · ${opponent?.name ?? 'League fixture'}`}
				detail={`Round ${fixture.round} · Best of ${fixture.bestOf}`}
				buttonLabel={pathname.startsWith('/match/') ? 'Playing' : 'Play'}
				disabled={pathname.startsWith('/match/')}
				onPress={() => router.push(`/match/${fixture.id}`)}
			/>
		);
	}

	const completeWeek = async () => {
		try {
			await advanceWeek(db);
			router.push('/week-summary');
		} catch {
			// The active screen and store surface the actionable error.
		}
	};
	return (
		<QuickActionBar
			title="Week ready"
			detail="Training and fixture complete."
			buttonLabel={busy ? 'Saving…' : 'Complete Week'}
			disabled={busy}
			onPress={() => void completeWeek()}
		/>
	);
}

