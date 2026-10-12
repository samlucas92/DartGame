# Ochebound

Ochebound is a mobile-only, offline-first darts career game built with Expo, React Native and strict TypeScript. The playable career now centres on a message inbox, weekly work/training/recovery decisions, directed coaching, performance-based sponsorships, a persistent fictional world ranking and an explicit local save.

## Requirements

- A current Node.js LTS release
- npm
- Expo Go on an iOS or Android phone, or a configured iOS/Android simulator

The project uses Expo SDK 57 and is portrait/phone-first. Browser support is available as a development preview; iOS and Android remain the release targets.

## Setup and run

```bash
npm install
npm start
```

From the Expo terminal, scan the QR code with Expo Go or open a configured simulator. These shortcuts are also available:

```bash
npm run ios
npm run android
npm run web
```

The browser preview uses Expo SQLite's WebAssembly build. Its save data is separate from native device saves and remains an experimental testing path because Expo currently marks SQLite web support as alpha.

No API keys, accounts or backend services are required. Saves live locally in `darts-manager.db` through `expo-sqlite`.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run validate
```

The test suite covers double-out rules, bull checkout, bust restoration, leaving one, invalid zero, early checkout dart counts, legal dart outcomes, best-of match termination, deterministic seeded replay, visit-derived aggregation, match-write idempotency, weekly date/balance rules, training limits and deterministic development, round-robin scheduling, AI league resolution, week-write idempotency and a 1,000-match termination stress run.

## What works

- New Career captures name, date of birth, fictional home region, playing style and background. Age is recalculated from the in-game date and changes when the career crosses the player's birthday.
- The player, starting attributes, in-game date, balance and starting ledger entry are stored in SQLite.
- Continue restores the saved career after an app restart.
- Messages, Calendar, Darts, Life and World are persistent bottom tabs with a shared accessible dark theme. Messages is the main career screen, carries an attention badge, places priority correspondence above the broader inbox and provides a Mark All as Read action.
- Match Centre offers a hands-off broadcast mode or manual visit/leg/match controls. Animated darts land on an accurate segmented board, with individual dart values, visit totals, speed controls and darts-caller commentary.
- 501 uses straight-in, double-out, alternating visits and alternating leg starters.
- Bull counts as a valid 50 checkout; busts restore the start-of-visit score; a winning visit stops on the finishing dart.
- Visits retain dart targets, actual beds hit, remaining scores, checkout attempts and event-derived commentary.
- Completed match results and granular visits are serialized to SQLite.
- Career match, leg, average, checkout, 180 and nine-darter statistics update in the same transaction as the result insert and appear on the player profile.
- Match IDs are unique and inserted with `INSERT OR IGNORE`; statistics only update when the insert succeeds, preventing duplicate results from being counted twice.
- Calendar shows a real background-specific weekly schedule and a 16-event annual tournament circuit, including four local events available to a new amateur, regional and national events, the Pro Qualifying Academy and eight named professional competitions.
- Every tournament has a venue, registration window, recommended average, fee and reward. The inbox sends advance registration reminders and red decision messages when every eligible window opens. Those messages persist a Register or Decline response and block week progression until answered; Mark All as Read cannot bypass them. Open events let any player pay to enter even below the recommendation; selected majors retain genuine career-tier qualification. Entry is persisted atomically, deducts the fee once, writes to the ledger and sends an inbox confirmation.
- Every week requires a strategy choice: balanced, overtime, all-in practice or recovery. Each changes actual income, practice capacity and fatigue.
- Training hours are constrained by the player background. Plans persist, resolve from the career RNG and apply bounded probabilistic attribute development and fatigue.
- A saved training allocation automatically carries into each new week until the player edits it.
- Online, in-person and retainer coaching arrangements persist, charge a weekly ledger fee and let the player direct a focused development bonus. Coaches send weekly feedback messages.
- The Lantern League has six fictional players, 15 persisted fixtures and a deterministic five-round schedule.
- Two sibling Northbridge leagues have their own visible rosters and tables. At each Lantern League season boundary, the lowest AI player is relegated and a sibling-league leader is promoted into the persisted roster and next fixture list.
- The player’s current fixture is loaded from that schedule; completed results update the fixture and live standings atomically.
- Completing the final round rolls into a fresh season with new fixtures and reset seasonal standings, so the calendar cannot dead-end without an opponent.
- The human player and fictional league competitors have navigable player profiles backed by their real attributes and competition records.
- Four darts setups can be owned and equipped. Their small match-only attribute trade-offs do not alter underlying player development.
- A training plan and the weekly fixture must both be completed before the calendar can advance.
- Completing a week atomically advances the date, resolves the two off-screen AI fixtures, applies wages and living costs, updates attributes/fatigue, stores a summary and prevents duplicate payouts.
- Week Summary survives a reload, and Life displays the persisted ledger rather than preview finance data.
- Career points from real results unlock regional, national and Q School status, with the next threshold visible on the main screen.
- Sponsors approach through the inbox after requirements are met, include explicit four-match performance clauses and can end a contract after sustained poor results.
- Opponents react after matches, and weekly inbox stories track the nearest local rival plus individual players elsewhere in the fictional world. Match and week-complete flows return to Messages, while unread priority mail such as tournament windows, sponsor decisions and league registration blocks week progression until opened.
- World displays the persisted local table plus a searchable 1,928-player fictional population: 128 professionals, 300 secondary/qualifying players, 500 national amateurs and 1,000 regional/local players. Six competition levels use the intended 35–55 through 95–110+ average bands, and ranking cut lines recalculate every 13 weeks so players can move between levels.
- The professional calendar includes the World Arrow Championship, Grand Premier League, World Matchplay Masters, Grand Prix of Arrows, National Open Championship, World Arrow Series, Pro Circuit Events and European Arrow Tour.
- Career actions auto-save to SQLite, and Life exposes a manual save checkpoint with the last save time.

Housing, transport and practice facilities have explicit weekly cost, practice and recovery effects. One-off experiences cost real career money, immediately reduce fatigue and persist as completed memories. Darts equipment, coaching and sponsorships feed the same finance model.

## Architecture

```text
src/app/                    Expo Router routes and five-tab shell
src/components/             Shared mobile UI building blocks
src/data/database/          Versioned SQLite migrations
src/data/repositories/      Atomic career and match persistence
src/data/seed/              Fictional milestone fixtures/roster
src/domain/                 Career models and starting rules
src/engine/darts/           Pure targets, checkout, rules and simulation
src/engine/calendar/        Pure in-game date and weekly progression rules
src/engine/training/        Pure allocation and player-development rules
src/engine/league/          Pure round-robin scheduling and standings
src/engine/random/          Seeded PRNG with explicit state
src/state/                  Zustand UI/session orchestration
src/tests/                  Deterministic pure-domain tests
src/theme/                  Central dark design tokens
```

The engine has no React, Zustand or database dependencies. Random state is passed explicitly instead of calling `Math.random`, so training, player matches and AI matches are reproducible. SQLite uses `PRAGMA user_version` migrations, WAL mode and foreign keys. Schema version 14 includes durable week summaries, repeating training plans, weekly strategy, focused coaching, priority and response-required career messages, sponsorships, lifestyle state, tournament entries, local-league movement history, date-of-birth age progression, nine-darter records and manual-save metadata; one `saveGameId` owns all career records. Existing saves infer a 1 July birthday from their stored age so they migrate without losing progress.

Zustand coordinates loaded UI state, while repositories remain responsible for durable mutations. Monetary values are integer pence and the UI formats them as GBP.

## Known gaps at this milestone

- There is one local save slot. Sibling local leagues and Lantern League movement are modelled, but sibling fixtures are represented through deterministic tables rather than stored match-by-match histories.
- Season rollover works, and career-point thresholds expose the route upward, but a dedicated end-of-season awards screen is not implemented yet.
- Tournament registration and paid entry are implemented; knockout brackets, playable rounds, prize resolution and the playable Pro Qualifying Academy are the next gameplay milestone.
- The wider roster and circuit movement are deterministic from saved career time; individual off-screen world match histories are not yet stored.
- Weekly pay and aggregate living costs are implemented; detailed job selection and a dedicated Finances screen are not.
- The match model is deliberately tunable but has not yet been calibrated against a larger statistical target dataset.
- SQLite match idempotency is unit-tested at the repository boundary; native integration tests still need a device/simulator harness.
- No physical iOS or Android device run has been performed as part of this milestone.

## Exact next tasks

1. Continue from the persisted Northbridge Open entry into travel choice, bracket simulation, playable rounds, prizes and ranking points.
2. Add a season summary with awards and promotion decisions, then make the Pro Qualifying Academy a multi-day playable event rather than a points-only status.
3. Add a dedicated Finances screen with income/expense breakdowns over the persisted ledger.
4. Add native repository integration tests and calibrate simulation output across skill bands.

Full professional tour scheduling and retained-card rules remain later expansion work; the current world model establishes the roster, ranking cuts and career route they will use.
