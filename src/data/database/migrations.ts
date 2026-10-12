import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 15;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
	await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
	const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
	const currentVersion = versionRow?.user_version ?? 0;

	if (currentVersion > DATABASE_VERSION) {
		throw new Error(`Database version ${currentVersion} is newer than this app supports.`);
	}
	if (currentVersion === 0) {
		await db.execAsync(`
			CREATE TABLE save_games (
				id TEXT PRIMARY KEY NOT NULL,
				version INTEGER NOT NULL,
				in_game_date TEXT NOT NULL,
				seed INTEGER NOT NULL,
				rng_state INTEGER NOT NULL,
				player_id TEXT NOT NULL,
				bank_balance_pence INTEGER NOT NULL,
				season INTEGER NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);

			CREATE TABLE players (
				id TEXT PRIMARY KEY NOT NULL,
				save_game_id TEXT NOT NULL,
				name TEXT NOT NULL,
				age INTEGER NOT NULL,
				location TEXT NOT NULL,
				style TEXT NOT NULL,
				background TEXT NOT NULL,
				tier TEXT NOT NULL,
				potential INTEGER NOT NULL,
				form INTEGER NOT NULL,
				fatigue INTEGER NOT NULL,
				scoring INTEGER NOT NULL,
				finishing INTEGER NOT NULL,
				consistency INTEGER NOT NULL,
				composure INTEGER NOT NULL,
				stamina INTEGER NOT NULL,
				matches_played INTEGER NOT NULL DEFAULT 0,
				matches_won INTEGER NOT NULL DEFAULT 0,
				matches_lost INTEGER NOT NULL DEFAULT 0,
				legs_won INTEGER NOT NULL DEFAULT 0,
				legs_lost INTEGER NOT NULL DEFAULT 0,
				darts_thrown INTEGER NOT NULL DEFAULT 0,
				points_scored INTEGER NOT NULL DEFAULT 0,
				checkout_attempts INTEGER NOT NULL DEFAULT 0,
				checkouts INTEGER NOT NULL DEFAULT 0,
				one_eighties INTEGER NOT NULL DEFAULT 0,
				highest_checkout INTEGER NOT NULL DEFAULT 0,
				FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE
			);

			CREATE TABLE matches (
				id TEXT PRIMARY KEY NOT NULL,
				save_game_id TEXT NOT NULL,
				seed INTEGER NOT NULL,
				in_game_date TEXT NOT NULL,
				best_of INTEGER NOT NULL,
				winner_id TEXT NOT NULL,
				player_legs INTEGER NOT NULL,
				opponent_legs INTEGER NOT NULL,
				result_json TEXT NOT NULL,
				created_at TEXT NOT NULL,
				FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE
			);

			CREATE TABLE ledger_entries (
				id TEXT PRIMARY KEY NOT NULL,
				save_game_id TEXT NOT NULL,
				type TEXT NOT NULL,
				amount_pence INTEGER NOT NULL,
				description TEXT NOT NULL,
				in_game_date TEXT NOT NULL,
				reference_id TEXT NOT NULL UNIQUE,
				FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE
			);

			CREATE INDEX matches_save_game_idx ON matches(save_game_id, created_at DESC);
			CREATE INDEX ledger_save_game_idx ON ledger_entries(save_game_id, in_game_date DESC);
		`);
	}
	if (currentVersion < 2) {
		await db.execAsync(`
			CREATE TABLE week_advancements (
				id TEXT PRIMARY KEY NOT NULL,
				save_game_id TEXT NOT NULL,
				from_date TEXT NOT NULL,
				to_date TEXT NOT NULL,
				summary_json TEXT NOT NULL,
				created_at TEXT NOT NULL,
				FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE,
				UNIQUE (save_game_id, from_date)
			);

			CREATE INDEX week_advancements_save_game_idx
			ON week_advancements(save_game_id, to_date DESC);

			UPDATE save_games SET version = 2;
		`);
	}
	if (currentVersion < 3) {
		await db.execAsync(`
			CREATE TABLE training_plans (
				id TEXT PRIMARY KEY NOT NULL,
				save_game_id TEXT NOT NULL,
				week_start TEXT NOT NULL,
				available_hours INTEGER NOT NULL,
				allocations_json TEXT NOT NULL,
				total_hours INTEGER NOT NULL,
				completed_at TEXT,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE,
				UNIQUE (save_game_id, week_start)
			);

			CREATE INDEX training_plans_save_game_idx
			ON training_plans(save_game_id, week_start DESC);

			UPDATE save_games SET version = 3;
		`);
	}
	if (currentVersion < 4) {
		await db.execAsync(`
			CREATE TABLE league_players (
				save_game_id TEXT NOT NULL,
				id TEXT NOT NULL,
				name TEXT NOT NULL,
				is_human INTEGER NOT NULL,
				style TEXT NOT NULL,
				scoring INTEGER NOT NULL,
				finishing INTEGER NOT NULL,
				consistency INTEGER NOT NULL,
				composure INTEGER NOT NULL,
				stamina INTEGER NOT NULL,
				form INTEGER NOT NULL,
				fatigue INTEGER NOT NULL,
				PRIMARY KEY (save_game_id, id),
				FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE
			);

			CREATE TABLE league_fixtures (
				id TEXT PRIMARY KEY NOT NULL,
				save_game_id TEXT NOT NULL,
				round INTEGER NOT NULL,
				week_start TEXT NOT NULL,
				in_game_date TEXT NOT NULL,
				home_player_id TEXT NOT NULL,
				away_player_id TEXT NOT NULL,
				best_of INTEGER NOT NULL,
				status TEXT NOT NULL,
				winner_id TEXT,
				home_legs INTEGER,
				away_legs INTEGER,
				match_id TEXT,
				FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE,
				UNIQUE (save_game_id, round, home_player_id, away_player_id)
			);

			CREATE INDEX league_fixtures_save_game_idx
			ON league_fixtures(save_game_id, week_start, status);

			UPDATE save_games SET version = 4;
		`);
	}
	if (currentVersion < 5) {
		await db.execAsync(`
			ALTER TABLE league_fixtures ADD COLUMN season INTEGER NOT NULL DEFAULT 1;
			ALTER TABLE league_fixtures ADD COLUMN season_round INTEGER;

			UPDATE league_fixtures
			SET season_round = round
			WHERE season_round IS NULL;

			CREATE TABLE coaching_contracts (
				save_game_id TEXT PRIMARY KEY NOT NULL,
				coach_id TEXT NOT NULL,
				mode TEXT NOT NULL,
				weekly_cost_pence INTEGER NOT NULL,
				development_bonus_bps INTEGER NOT NULL,
				hired_at TEXT NOT NULL,
				FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE
			);

			CREATE TABLE owned_darts (
				save_game_id TEXT NOT NULL,
				darts_id TEXT NOT NULL,
				purchased_at TEXT NOT NULL,
				is_equipped INTEGER NOT NULL DEFAULT 0,
				PRIMARY KEY (save_game_id, darts_id),
				FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE
			);

			UPDATE save_games SET version = 5;
		`);
	}
	if (currentVersion < 6) {
		await db.execAsync(`
			ALTER TABLE save_games ADD COLUMN weeks_elapsed INTEGER NOT NULL DEFAULT 0;
			ALTER TABLE players ADD COLUMN scoring_progress INTEGER NOT NULL DEFAULT 0;
			ALTER TABLE players ADD COLUMN finishing_progress INTEGER NOT NULL DEFAULT 0;
			ALTER TABLE players ADD COLUMN consistency_progress INTEGER NOT NULL DEFAULT 0;
			ALTER TABLE players ADD COLUMN composure_progress INTEGER NOT NULL DEFAULT 0;
			ALTER TABLE players ADD COLUMN stamina_progress INTEGER NOT NULL DEFAULT 0;

			UPDATE save_games
			SET weeks_elapsed = (
				SELECT COUNT(*) FROM week_advancements
				WHERE week_advancements.save_game_id = save_games.id
			);

			CREATE TABLE sponsorship_contracts (
				save_game_id TEXT PRIMARY KEY NOT NULL,
				sponsor_id TEXT NOT NULL,
				weekly_payment_pence INTEGER NOT NULL,
				signed_at TEXT NOT NULL,
				FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE
			);

			CREATE TABLE claimed_sponsorships (
				save_game_id TEXT NOT NULL,
				sponsor_id TEXT NOT NULL,
				claimed_at TEXT NOT NULL,
				PRIMARY KEY (save_game_id, sponsor_id),
				FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE
			);

			CREATE TABLE lifestyle_state (
				save_game_id TEXT PRIMARY KEY NOT NULL,
				home_id TEXT NOT NULL,
				transport_id TEXT NOT NULL,
				practice_id TEXT NOT NULL,
				FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE
			);

			CREATE TABLE owned_lifestyle_items (
				save_game_id TEXT NOT NULL,
				item_id TEXT NOT NULL,
				purchased_at TEXT NOT NULL,
				PRIMARY KEY (save_game_id, item_id),
				FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE
			);

			UPDATE save_games SET version = 6;
		`);
	}
	if (currentVersion < 7) {
		await db.execAsync(`
			CREATE TABLE career_messages (
				id TEXT PRIMARY KEY NOT NULL,
				save_game_id TEXT NOT NULL,
				kind TEXT NOT NULL,
				sender TEXT NOT NULL,
				subject TEXT NOT NULL,
				preview TEXT NOT NULL,
				body TEXT NOT NULL,
				received_date TEXT NOT NULL,
				is_read INTEGER NOT NULL DEFAULT 0,
				FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE
			);

			CREATE INDEX career_messages_save_game_idx
			ON career_messages(save_game_id, received_date DESC);

			UPDATE save_games SET version = 7;
		`);
	}
	if (currentVersion < 8) {
		await db.execAsync(`
			ALTER TABLE save_games ADD COLUMN weekly_strategy TEXT NOT NULL DEFAULT 'balanced';
			ALTER TABLE save_games ADD COLUMN last_manual_save_at TEXT;
			ALTER TABLE coaching_contracts ADD COLUMN focus TEXT NOT NULL DEFAULT 'balanced';
			ALTER TABLE career_messages ADD COLUMN action_path TEXT;
			ALTER TABLE career_messages ADD COLUMN action_label TEXT;

			UPDATE save_games SET version = 8;
		`);
	}
	if (currentVersion < 9) {
		await db.execAsync(`
			CREATE TABLE tournament_entries (
				id TEXT PRIMARY KEY NOT NULL,
				save_game_id TEXT NOT NULL,
				tournament_id TEXT NOT NULL,
				edition INTEGER NOT NULL,
				entry_fee_pence INTEGER NOT NULL,
				entered_date TEXT NOT NULL,
				created_at TEXT NOT NULL,
				FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE,
				UNIQUE (save_game_id, tournament_id, edition)
			);

			CREATE INDEX tournament_entries_save_game_idx
			ON tournament_entries(save_game_id, edition, tournament_id);

			UPDATE save_games SET version = 9;
		`);
	}
	if (currentVersion < 10) {
		await db.execAsync(`
			CREATE TABLE local_league_movements (
				id TEXT PRIMARY KEY NOT NULL,
				save_game_id TEXT NOT NULL,
				season INTEGER NOT NULL,
				player_id TEXT NOT NULL,
				player_json TEXT NOT NULL,
				from_league_id TEXT NOT NULL,
				from_league_name TEXT NOT NULL,
				to_league_id TEXT NOT NULL,
				to_league_name TEXT NOT NULL,
				direction TEXT NOT NULL,
				created_at TEXT NOT NULL,
				FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE
			);

			CREATE INDEX local_league_movements_save_game_idx
			ON local_league_movements(save_game_id, season DESC);

			UPDATE save_games SET version = 10;
		`);
	}
	if (currentVersion < 11) {
		await db.execAsync(`
			ALTER TABLE players ADD COLUMN date_of_birth TEXT;

			UPDATE players
			SET date_of_birth = printf('%04d-07-01', 2026 - age - 1)
			WHERE date_of_birth IS NULL;

			UPDATE save_games SET version = 11;
		`);
	}
	if (currentVersion < 12) {
		await db.execAsync(`
			ALTER TABLE players ADD COLUMN nine_darters INTEGER NOT NULL DEFAULT 0;
			UPDATE save_games SET version = 12;
		`);
	}
	if (currentVersion < 13) {
		await db.execAsync(`
			ALTER TABLE career_messages
			ADD COLUMN requires_acknowledgement INTEGER NOT NULL DEFAULT 0;

			UPDATE career_messages
			SET requires_acknowledgement = 1
			WHERE id = 'message-welcome-league'
				OR (kind = 'tournament' AND subject LIKE '%entries open%')
				OR (kind = 'sponsor' AND subject = 'We would like to sponsor you');

			UPDATE save_games SET version = 13;
		`);
	}
	if (currentVersion < 14) {
		await db.execAsync(`
			ALTER TABLE career_messages
			ADD COLUMN requires_response INTEGER NOT NULL DEFAULT 0;
			ALTER TABLE career_messages ADD COLUMN response TEXT;

			UPDATE career_messages
			SET requires_response = 1,
				requires_acknowledgement = 0
			WHERE kind = 'tournament' AND subject LIKE '%entries open%';

			UPDATE save_games SET version = 14;
		`);
	}
	if (currentVersion < 15) {
		await db.execAsync(`
			ALTER TABLE players ADD COLUMN ranking_points INTEGER NOT NULL DEFAULT 0;
			ALTER TABLE players ADD COLUMN has_tour_card INTEGER NOT NULL DEFAULT 0;

			ALTER TABLE tournament_entries ADD COLUMN status TEXT NOT NULL DEFAULT 'entered';
			ALTER TABLE tournament_entries ADD COLUMN matches_won INTEGER NOT NULL DEFAULT 0;
			ALTER TABLE tournament_entries ADD COLUMN prize_money_pence INTEGER NOT NULL DEFAULT 0;

			CREATE TABLE tournament_matches (
				id TEXT PRIMARY KEY NOT NULL,
				save_game_id TEXT NOT NULL,
				entry_id TEXT NOT NULL,
				tournament_id TEXT NOT NULL,
				edition INTEGER NOT NULL,
				round INTEGER NOT NULL,
				total_rounds INTEGER NOT NULL,
				round_label TEXT NOT NULL,
				in_game_date TEXT NOT NULL,
				opponent_json TEXT NOT NULL,
				best_of INTEGER NOT NULL,
				status TEXT NOT NULL DEFAULT 'scheduled',
				winner_id TEXT,
				result_json TEXT,
				created_at TEXT NOT NULL,
				FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE,
				FOREIGN KEY (entry_id) REFERENCES tournament_entries(id) ON DELETE CASCADE,
				UNIQUE (entry_id, round)
			);

			CREATE INDEX tournament_matches_save_game_idx
			ON tournament_matches(save_game_id, status, in_game_date);

			UPDATE players SET tier = 'Local amateur', ranking_points = 0, has_tour_card = 0;
			UPDATE save_games SET version = 15;
		`);
	}

	await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

