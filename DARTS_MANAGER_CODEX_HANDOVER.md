# Darts Manager Mobile — Codex Development Handover

## Role and objective
You are the lead engineer building **Darts Manager**, a single-player, offline-first mobile darts career management game. Build a maintainable, testable, playable foundation, not just static screens. Implement incrementally, run validation, and report precisely what works and what remains incomplete.

The game blends the depth of Football Manager with a player-led darts career and a *balanced* lifestyle system. A player starts as an amateur in local/pub competitions, improves through training and matches, progresses to regional and national events, attempts a fictional professional qualifying school, and aims to become world champion. Prize money is spent on career costs and optional lifestyle upgrades.

**Initial platform:** iOS + Android phone apps only, portrait-first. No web application, backend, authentication, multiplayer, ads, real-money payments or microtransactions in the MVP.

## Core product principles
1. Darts is the main game (roughly 70% darts, 20% finances/lifestyle, 10% career events).
2. Time passes in a weekly calendar; advance to the next meaningful event, with day-by-day detail where needed.
3. Every meaningful decision has a trade-off. Training competes with paid work, tournaments, fatigue and living costs.
4. One in-game GBP bank balance pays for everything. Never introduce premium currency.
5. A believable darts scoring and match engine matters more than decorative animation.
6. The game world persists: AI players have careers, tournaments, rankings and results even when the human player is absent.
7. Progress isn't guaranteed; poor performance and financial setbacks are possible, but don't force an arbitrary game over.
8. Keep the MVP focused on one complete local amateur season. Design for higher circuits without implementing everything immediately.

## UI reference and style
A previous design mockup defines the general look; use it as inspiration if it is available in the working context. Do not block progress if the mockup file isn't available.

- Premium dark sports-dashboard look: near-black/navy surfaces, restrained vibrant green for primary actions and success, white text, muted secondary text.
- Clear legible numbers, compact stat cards, rounded corners, subtle borders, no cluttered gradients.
- Mobile touch targets at least 44 x 44 points, accessible contrast and readable typography.
- Native safe areas, portrait layouts, scrollable content where necessary.
- Persistent bottom tabs: **Home, Calendar, Darts, Life, World**.
- Secondary screens include Player Details, Match Centre, Tournament, Training Plan, Finances, Shop, Career Event, Week Summary and Settings.
- Do not require player photos, real-world logos or licensed assets. Use initials/abstract avatars and locally bundled icons as needed.

## Technology decisions
- Expo + React Native + TypeScript in strict mode.
- Expo Router for file-based navigation.
- NativeWind if integration is stable in the installed Expo version; otherwise use React Native StyleSheet with central design tokens. Avoid wasting implementation time on tooling conflicts.
- Zustand for UI/session state; domain simulation stays independent of React and Zustand.
- expo-sqlite for persistent offline saves and migrations.
- A seeded PRNG for reproducible simulations and test fixtures; do not rely on Math.random directly inside the simulation engine.
- Vitest or Jest (whichever integrates cleanly) for unit tests on pure game logic.
- Use maintained versions compatible with the actual installed Expo SDK; verify dependencies rather than blindly pinning hypothetical versions.
- **Indent with tabs** in source files. Use a consistent formatter/linter and avoid unrelated refactors.

Suggested structure (adapt to best practices where justified):

```text
app/
  _layout.tsx
  index.tsx
  new-career.tsx
  (tabs)/
    _layout.tsx
    index.tsx          # Home
    calendar.tsx
    darts.tsx
    life.tsx
    world.tsx
  match/[id].tsx
  player/[id].tsx
  tournament/[id].tsx
  finances.tsx
  training.tsx
  shop.tsx
  event/[id].tsx
  week-summary.tsx
src/
  components/
  theme/
  features/
    career/
    calendar/
    darts/
    finances/
    lifestyle/
    world/
  engine/
    random/
    darts/
    career/
    calendar/
    tournaments/
    rankings/
  data/
    database/
    repositories/
    seed/
  domain/
    models/
    rules/
  state/
  utils/
  tests/
```

## Initial game flow
1. First launch: **New Career** / **Continue** (Continue disabled when no save exists).
2. New Career: enter name, starting age (18/21/25/30 as presets), fictional nationality/location selection if useful, playing style (Scorer, Finisher, All-rounder, Clutch), and background (Working Amateur, Supported Prospect, Independent Amateur).
3. Create starting amateur player, local league fixtures, a selection of nearby fictional regional knockout competitions, starting money/job/lifestyle, and a population of fictional AI players.
4. Home dashboard displays age, amateur status, current average, key attributes, balance, next fixture and available training hours.
5. Player plans weekly training, optionally enters an eligible tournament, advances time, views simulated match/results, sees finances update, and continues.
6. At the season end, display league standings, tournament results, progression and career summary; offer **Continue to next season**.

## MVP feature specification

### A. Player model and development
Distinguish **underlying attributes** from **observed statistics**.

Underlying attributes (0–100): scoring, finishing, consistency, composure/mental, stamina. Include hidden potential, age, form and fatigue. Different starting styles adjust attribute distributions without being hard-coded automatic wins. Improvement is gradual and probabilistic based on training allocation, facilities, age/potential and diminishing returns; cap extreme changes per week. Fatigue and form affect match outcomes. The displayed three-dart average is an observed statistic, not a skill attribute.

Historical stats to persist or derive: matches played/won/lost, legs won/lost, three-dart average, first-nine average (where captured), checkout attempts/successes and %, 180s, highest checkout, tournament finishes, rankings and prize money. Avoid showing unsupported statistics as factual: every UI statistic must come from actual stored simulation output or be marked as an estimate.

### B. Darts match simulation — highest priority
Implement the domain engine as pure TypeScript functions independent of rendering and persistence. MVP uses standard **501, straight-in, double-out**. Support selectable best-of-odd-leg formats such as best of 3, 5, 7 and 11. Player and opponent alternate visits, with correct starting throw and leg progression; each visit consists of up to three darts, stopping immediately on a valid winning double. Enforce exact-zero double-out, bust rules (including leaving 1 and reaching zero without a double), score restoration after bust, and match termination at the required legs.

Model dart outcomes with valid segment numbers, singles/doubles/trebles, 25 and bullseye, misses; ability-driven accuracy; sensible targets and checkout choices. Keep the model configurable and tune against plausible amateur averages/checkout distributions rather than hard-coding a desired final average. Record visits, darts thrown, turns, checkout attempts, scoring and leg/match results. Generate commentary from events, not the other way around.

MVP match display: competitors, legs score, current remaining scores, visit feed, three-dart averages, checkout rates, **Simulate Next Visit / Next Leg / Finish Match**. One-tap instant result is allowed for speed but must use the same simulation engine and produce consistent recorded stats. A future key-moments mode can be added later. No swipe-to-throw, 3D physics or real-time online play.

**Test thoroughly:** valid 501 progression; 50 checkout on bull; leaving 1 bust; bust restores start-of-visit score; invalid zero bust; winning only with double; zero remaining cannot continue; no negative remaining; correct darts-used counts for early checkout; legal scoring visits; best-of finish; same seed gives same result; stats aggregation matches visits. Include deterministic test fixtures and property-style stress tests to ensure thousands of matches always terminate within reasonable bounds.

### C. Calendar and time progression
Model in-game dates independently of device clock. Schedule local league fixtures, tournament dates, jobs, training, rest and expenses. Training hours constrained by work and commitments. Advancing days/weeks resolves scheduled actions exactly once, simulates off-screen AI events, applies transactions and generates a clear week summary. No duplicate payouts, fixtures or expenses when reopening the app or resuming a save. Use an explicit advancement pipeline/transaction boundary.

### D. Local season and tournaments
Create at least one fictional pub/local league with a manageable number of competitors and round-robin fixtures. Include a few fictional regional knockout tournaments with entry requirements, dates, fees, prize money, knockout brackets and advancement. Show standings, fixtures, results, brackets and player profiles. Eligibility and money checks happen before joining. Different tournaments can use different best-of-leg formats. AI matches progress even when the user is not in their draw.

### E. Finances and work
One GBP balance; persist **ledger entries** with type, amount, description, in-game date and reference to triggering event. Use integer pence internally; format in GBP in the interface. Sources: work pay, prize money and later sponsorship. Uses: recurring living expenses, entry fees, travel, equipment, property/vehicle payments and experiences. Prevent unaffordable purchases and entries; never accidentally pay a prize twice. MVP job options offer different guaranteed pay and time/energy trade-offs. Do not make the player manage each grocery receipt. Tax can be a simplified later feature.

### F. Lifestyle (balanced, not a life simulator)
Purchases grouped into **Housing, Transport, Practice Facilities, Experiences**. Add a lightweight **Relationships** status/events area later; do not create a dating simulator in MVP. At least one meaningful purchasable item in each of the first four categories. Define cost, optional recurring upkeep, ownership state and small gameplay effects. Houses affect cost/happiness/practice capacity; transport affects tournament travel cost/convenience; training gear affects practice efficiency; experiences affect temporary happiness/recovery but consume money/time. Avoid pay-to-win-style linear equipment buffs, and do not let cars directly improve dart accuracy.

### G. Career events
A small event system with conditions, options and consequences. MVP can include two or three examples: work shift versus training, unexpected travel cost, small sponsorship approach after a successful tournament. Events should pause advancement only when a player decision is required. Store selected decisions to avoid repeating them.

### H. World and rankings
Create fictional persistent AI competitors with nationality, age, attributes, playing style, form and career history. MVP includes local standings and a basic regional points ranking. Show player profiles and prior results. Make rankings and AI fixtures consistent with competition results. Design extensible interfaces for future circuits, qualification and retirements.

## Future professional progression — design for it, don't implement fully in the first milestone
Career tiers: local pub league → regional amateur → national amateur → pro qualifying academy (fictional Q School) → professional tour → elite televised events. Future seasons include a fictional pro tour with ~128 cardholders, secondary tour, qualifying events, major championships, world order of merit, card retention/loss, ageing, retirement and newly generated prospects. All tournaments and players must be fictional and original. Do not scrape or ship real professional names, headshots, logos or event branding; near-spelling lookalikes can still create IP/personality-rights risks. Tournament formats can draw inspiration from the sport while names/branding remain distinct.

Implemented world population target: 128 professional-tour players (including a top-16 world elite), 300 secondary/qualifying-tour players, 500 national amateurs and 1,000 regional/local players, for 1,928 simulated players in total. Competition average bands are local 35–55, regional 50–70, national 65–85, qualifying 75–95, professional 85–100 and world elite 95–110+.

The fictional professional calendar uses World Arrow Championship, Grand Premier League, World Matchplay Masters, Grand Prix of Arrows, National Open Championship, World Arrow Series, Pro Circuit Events, European Arrow Tour and Pro Qualifying Academy. These names and branding must remain distinct from real competitions.

## Persistence/data model
Implement schema migrations from day one. Suggested entities:
- `SaveGame`: id, version, inGameDate, seed/PRNG state, playerId, created/updated timestamps.
- `Player`: id, name, nationality, birth date/age, isHuman, style, potential, attributes, form, fatigue, reputation.
- `Career`: playerId, startingBackground, currentJobId, amateur/pro status, club/league membership.
- `Job`: type, paySchedule, netPayPence, timeCost, fatigueCost.
- `Competition`: id, type, seasonId, dates, entryFeePence, prizeStructure, rules, eligibility.
- `Entry`, `Fixture`, `Match`, `Leg`, `Visit`, optionally `DartThrow` for reproducible granular stats.
- `RankingEntry`, `TrainingPlan`, `TrainingSession`, `LedgerEntry`.
- `LifestyleItem`, `OwnedItem`, `EventDefinition`, `CareerEventInstance`, `EventChoice`.

Prefer keeping save entities keyed by `saveGameId` and ensure mutations are atomic. Persist enough details for old results to remain visible even after players age or retire. A save must round-trip, including the in-game date, current tournaments, bank balance, player stats and simulation random state. Consider snapshot plus normalized history if suitable; document the choice.

## Navigation / screen requirements
1. **Home:** name, age, tier, balance, season, current average/important attributes, upcoming event, action buttons.
2. **Calendar:** week view with work, training, fixtures/tournaments; advance to next day/event; current week training allocation.
3. **Darts:** own profile, attributes/stats/history, fixtures and access to Match Centre.
4. **Life:** overview, current housing/transport/practice area, balance and finance entry points, shop and relevant life events.
5. **World:** league table/regional ranking, tournaments, AI player profiles.
6. **Match Centre:** live score and visit-by-visit/skip controls, post-match results.
7. **Training:** hours allocation with remaining-hours validation, save plan.
8. **Finances:** real ledger, balance, income and expense breakdown.
9. **Shop:** purchasable item cards with availability, actual effects, buy confirmation.
10. **Season summary:** results, career stats, earnings, improvements and next season action.

All UI elements must be backed by actual state. No dead navigation, fake hardcoded finances or buttons that pretend to work.

## Execution plan for Codex

### Phase 0 — scaffold and validate
Initialize Expo + strict TypeScript, routing, theme tokens, tabs, linting, tests, local database/migrations and a basic app shell. Verify the app launches, tabs render, and database initializes.

### Phase 1 — domain simulation
Implement seeded RNG, dart/visit/leg/match logic, statistics aggregation, and extensive deterministic tests. Provide a dev-only engine sandbox/fixture to run simulated matches and inspect results. Do **not** start with polished mock screens instead of engine correctness.

### Phase 2 — playable vertical slice
Create New Career → Home → Calendar → Training → Local Match → Result → Finances → Advance Week. Support saving/resuming and a simple AI local league. This is the first real playable loop.

### Phase 3 — season systems
Complete a local season with standings, a regional knockout, eligibility/entry fees, season summary, career progression and historical records.

### Phase 4 — lifestyle polish
Implement housing/transport/practice upgrades, purchase/upkeep ledger, one-off events, small sponsorship, accessible UI polish and performance optimization.

### Phase 5 — expansion (later)
Qualifying academy, multi-tour pro circuit, rankings/card status, careers of AI pros, richer contracts/relationships, larger world, more news and records. Do not start here.

## First Codex assignment — implement now
1. Inspect the repository and identify whether this is a new or existing Expo application. Preserve existing files if present.
2. Scaffold/configure the mobile app, strict TypeScript, tab navigation and consistent dark theme.
3. Create minimal usable Home, Calendar, Darts, Life and World screens with shared components and clearly labeled seed/demo data if simulation is not wired up yet.
4. Implement the **pure 501 darts engine** with seeded randomness, match rules and tests. Make it possible to run a sample best-of-5 legs between two seeded fictional players and display the result in a Match Centre screen.
5. Add SQLite initialization/migration, create/save/load a basic career profile and persist the result of a match.
6. Add a README with setup, run/test commands, architecture decisions, what is working and exact next tasks.
7. Run TypeScript checking and tests; fix errors. Don't claim device testing unless actually performed.

**Stop at this functional milestone and report back.** Do not generate the full professional circuit or implement dozens of speculative features in one pass. Ask only if genuinely blocked by missing credentials or irreversible external decisions; otherwise choose sensible defaults and document them.

## Initial acceptance criteria
- App can launch on Expo-supported iOS/Android environments and navigate all five tabs.
- New Career creates a persisted human player and Continue restores that career after reopening.
- A match can be simulated from 501 with correct double-out and bust behaviour; score and visit details display accurately.
- Deterministic seeded replay and match-rule tests pass.
- Match results persist with no double-counted statistics or payments.
- Code uses tabs for indentation, strict types, separated domain logic, and migrations.
- README documents all run/test steps and known gaps.

## Product scope decisions already made
- Phone-only release; portrait-first.
- Balanced lifestyle, **not** a full Sims-style simulation.
- Career is player-led rather than managing a team.
- Matches are simulated rather than swipe-to-throw. Simple visit controls may be included; strategy interventions are an optional later enhancement.
- Fictional players and competition branding, with believable sports-inspired structures.
- Genuine in-game money earned from work, sponsorship and tournaments; spend on both darts and life.
- Avoid web backend, accounts, multiplayer and in-app purchases for the MVP.

## Working style
Work in small verified milestones. Make the actual changes rather than only describing them. Provide concise file-level summaries, tests run, any errors/limitations, and the next recommended implementation step after each milestone. Prioritize correctness of game rules and persistence before visual detail.
