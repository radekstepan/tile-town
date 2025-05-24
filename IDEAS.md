Supply Chain System (High, 500 - 1070 LoC)
- Resources flow through your city (goods, services, raw materials)
- Industrial zones produce raw goods that commercial zones need
- Creating efficient routes between these increases productivity
- Traffic congestion disrupts supply chains

Tax Tuning Trade-Offs (Medium, 150 - 265 LoC)
- Higher taxes bring in more money but lower satisfaction, risking protests or population loss.
- Lower taxes keep citizens happy but limit funds for building and upgrades.

Tile-by-Tile Expansion (Medium, 160 - 250 LoC)
- Each tile has terrain (plains, mountains, water) that affects what you can build.
- Expanding costs resources, so players must pace themselves.

City Specialization (Focus Choices) (Medium, 300 - 550 LoC)
Allow the city to specialize in a simple way for unique bonuses. For instance, the player could choose a focus like Tourism, Industry, Green City, or Education early on. This choice would grant a bonus (e.g. tourism boosts commercial income but might raise upkeep for parks) and a drawback (industry focus yields high tax revenue but more pollution, etc.). It’s a one-time strategic decision that shapes the city’s development path without micromanagement. 

Taxation vs. Satisfaction Trade-off
A simple economic slider or setting for tax rates can introduce a classic strategic trade-off. Higher taxes increase the city’s treasury, letting you build more, but they gradually lower citizen satisfaction/unemployment (people might leave or protest if taxes are too high). Conversely, low taxes keep residents very happy and attract population, but force the player to operate with a tighter budget. This mechanic is easy to grasp and adjust in a casual session – the player might nudge taxes up a bit when funds are needed and ease off if people get upset

Limited Construction & Budget Phases (Medium, 140 - 250 LoC)
Instead of allowing infinite building sprees, the game can limit how much you can construct within a given time or budget cycle. For instance, each in-game year (or turn), the city gets a budget allocation or a set number of build “actions.” The player can spend these on new roads or zones, but when the budget or actions are used up, they must wait for the next cycle (which might be just a minute or two of real time, or triggered by a “Next Year” button). This creates a light turn-based rhythm to gameplay.

Random Events & Challenges (Medium to High, 230 - 460 LoC)
Introduce occasional random events or mini-scenarios to keep the city simulation dynamic. These could be minor and easy to grasp: for example, “A small festival boosts commercial revenue this month,” or “Drought: water satisfaction drops briefly,” or “Traffic jam: resolve by building an extra road or waiting it out.” Sometimes events could present a choice: e.g. “A wealthy investor offers to fund a new park if you build it now – do you accept?” or “Citizens complain about pollution – will you enforce a temporary factory shutdown at a cost?”

Simple Policy Edicts (City-wide Bonuses) (Medium, 240 - 450 LoC)
Every now and then, allow the player to enact a city policy that tweaks the simulation in a beneficial way (often with a minor cost or trade-off). These are analogous to Civ’s social policies or SimCity’s ordinances, but kept very simple and optional. For example, the player could enact a “Recycling Program” that costs a bit of money each month but reduces garbage and pollution, or a “Commerce Advertising” campaign that boosts commercial zone income at the expense of a small happiness drop (due to more tourist crowds or ads). Each policy would be a single toggle or one-time choice – no elaborate tech tree needed.

Population Growth Timer (Medium, 120 - 210 LoC)
- Citizens arrive at regular intervals (every 30 seconds)
- If you don't have housing ready, you lose them permanently

Neighboring City Competition (Medium to High, 240 - 450 LoC)
- 1-4 AI cities grow alongside yours, visible at the edges of your map
- Simple "prosperity score" comparing your city to neighbors
- If you fall too far behind, you lose citizens to neighboring cities

Resource Depletion (Low to High, 90 - 135 LoC)
- Start with limited building materials
- Each structure costs resources that regenerate slowly

Referendum Risk (Medium, 220 - 410 LoC)
A global Public Opinion bar fills if satisfaction stays high. When it maxes, citizens call a referendum—pick 1 of 2 city‑wide requests (e.g., free transit vs. lower taxes). Accept grants a bonus, decline tanks opinion.

Infrastructure Bonds (Medium, 170 - 310 LoC)
Need cash? Issue a 10‑turn bond. Immediate money, but each turn interest auto‑deducts. Pay it off early for a small fee.

Sprawl Surcharge (Low, 20 - 40 LoC)
Tiles beyond a 5‑tile radius from City Hall cost +50 % to zone (representing infrastructure length).
* In Game.ts inside handleCanvasBuildInteraction:
* Calculate distance from gridController.cityHallCoords to (gridX, gridY).
* If distance > radius (e.g., 5 tiles), apply a multiplier (e.g., 1.5) to actualCost.
* Update the message in this.messageBox.show to reflect this surcharge if applied.

Desaturate a road that is not connected to the city hall
* In Renderer.ts, drawPixiTileGraphics:
* If !tileData.hasRoadAccess (or better, !game.simulationController.isConnectedToCityHall(gridX, gridY)) AND the tile is a zone/building:
* Draw a small, distinct icon (e.g., a red "no connection" symbol, or a broken road icon) on top of the tile.
* Alternatively, slightly desaturate or overlay a subtle pattern on such tiles.
* You might want to update SimulationController.ts so tile.hasRoadAccess is more accurately reflecting connection to the main road network / City Hall rather than just any adjacent road. Your isConnectedToCityHall is good for this.

More Explicit Struggling Visual (Wobble)
* In Renderer.ts, drawPixiTileGraphics:
* When tileData.isVisuallyStruggling:
* Besides darkenColor, perhaps add a very subtle pulsing to the color's alpha, or a slight "wobble" animation if you're feeling ambitious (wobble is more LoC).
* Or draw a small icon (e.g., a tiny sad face, or a "!" in a triangle) on the building.

Citizen Classes (Medium to High, 225 - 425 LoC)
Two sliders: White‑Collar and Blue‑Collar demand. Offices satisfy one, factories the other. Imbalance lowers employment happiness.

# Balatro

Blueprint Deck & “Joker” Policies
Blueprint cards represent roads, parks, factories, etc. Policy Jokers are rare cards that slot into a 5‑card “city council” row and bend simulation math (e.g., “Green Roofs: all parks give ✕2 land‑value mult”).
Each year you draw 7 blueprints, place some, discard the rest. Jokers stack wild synergies, letting you chase outrageous land‑value ✕ happiness multipliers—exactly like Chips ✕ Mult in Balatro 

Milestone Blinds & Antes
Each “fiscal year” has three goals: Budget Review (small) ✔ Growth Review (big) ✔ Mayor Review (boss). Targets = revenue, happiness, env‑score. Clear the trio to advance to the next Term (Ante).
Fail a milestone → run ends (city voted out). Survive eight terms to “win the campaign.” Difficulty scales via higher targets and nastier Boss modifiers.

Shop Phase After Each Boss Review
After a Boss Review, enter a City Hall Lobby. Spend treasury on: • Policy Jokers (permanent) • Grant Papers (one‑shot boosts like Balatro’s Tarot) • Zoning Upgrades (per‑run building level buffs akin to Planets)
Limited cash means tough choices: double‑down on your current synergy or diversify. Items refresh only after the next Boss Review—mirroring Balatro’s cadence.

Grant Papers (Tarot / Spectral Analogues)
Grant Paper: one‑click instant (e.g., “Federal Subsidy: upgrade 3 random houses”). Patent Paper (spectral): adds unusual city‑wide rule (“Buildings two tiles from water gain ✕ 1.5 revenue”).
Perfect for “burst” plays before a tough milestone, like Tarot bombs before a Big Blind.

“Discards” as Demolitions
Limited Demolition Permits per milestone let you bulldoze & redraw blueprint cards. Holding them for the Boss Review = key late‑run skill ceiling.

Voucher Meta‑Progression
Win a run → pick 1 City Charter Amendment (e.g., “Start every run with Renewable Energy blueprint in deck”). Amendments persist between cities, steadily widening build diversity.

Risk Tags / Skip System
You may skip a Review and accept a Municipal Controversy Tag (random negative modifier) for extra money or an extra Joker slot. High‑risk rush strategies emerge.

Signature Arcology Wonder = Finisher
At final term, you must construct a Futuristic Arcology by meeting massive resource & mood thresholds in one budget cycle—your city’s “Royal Flush.” Pull it off and you trigger the equivalent of a Finisher victory screen.

# Balatro "Suits" Idea

## A “Poker‑City” System – mapping cards → buildings, hands → urban synergies

### 1.  Core loop in one sentence

*Each turn you **draw 5 building cards**, drag them onto the city grid, then hit “End Fiscal Turn”; the game scores every new **poker hand‑shaped cluster** to add **Income (💰 chips)** and **Mood (😊 multiplier)** to your city total.*

---

### 2.  The deck

| Card element            | City meaning                       | Notes                                                                                                                                                                                                     |
| ----------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Suit** (♥ ♦ ♣ ♠)      | **Building family**                | <br>♥ Hearts = Residential (people+Mood)<br>♦ Diamonds = Commercial (retail income)<br>♣ Clubs = Industrial (jobs, raw output, pollution)<br>♠ Spades = Civic / Utility (parks, clinics, police, transit) |
| **Rank** (2‑10 J Q K A) | **Size / quality tier**            | 2 = tiny house / kiosk … 10 = high‑rise … Face cards are **special variants** (see §5)                                                                                                                    |
| **Jokers**              | **Wildcard buildings or policies** | Sit in a 5‑slot “City Council” row; never placed on the map. Constantly bend rules (e.g. “Wild Road: counts as any suit for combos along connected streets”).                                             |
| **Tarot / One‑shots**   | **Grants & ordinances**            | Single‑use boosts: *“Federal Stimulus: +50 💰 this turn.”*                                                                                                                                                |

*Deck size:* 52 + 2 Jokers + 10 one‑shots.
*Reshuffle:* when empty; discard pile grows with every card you place or burn.

---

### 3.  Placing a card

1. **Pick a card** from hand.
2. Hover tiles; legal spots highlight (terrain & zoning rules check).
3. **Drop** → building appears immediately at its rank’s art variant.
4. Base yield:

   * Hearts: `+1 😊` × rank
   * Diamonds: `+1 💰` × rank
   * Clubs: `+2 💰` × rank **but** `-1 😊` city‑wide if rank ≥ 7
   * Spades: no base yield; they are *multiplier generators* (see combos).

Discard any unplaced cards (X discards per turn) → dead cards feed the discard pile.

---

### 4.  Detecting “hands” on the board

After every turn the engine scans in **card‑shaped patterns**:

| Poker hand          | City pattern (any rotation)                | Bonus effect                                                                                |
| ------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **Pair**            | 2 adjacent cards with same rank            | Both buildings +50 % base yield                                                             |
| **Three‑of‑a‑Kind** | 3 in an L or line                          | +100 % to their yield                                                                       |
| **Straight**        | Rank sequence of 3‑5 in a straight line    | Chain’s attached roads get “Express Lane”: +20 % 💰 for all connected Diamonds next 2 turns |
| **Flush**           | 3‑5 cards of same suit forming a 3×2 block | Suit‑wide global buff ×1.2 (e.g. all Hearts +20 % 😊)                                       |
| **Full House**      | 3‑of‑a‑kind + pair inside a 3×3            | Immediate lump‑sum payout: `(sum 💰 of the five) ×2`                                        |
| **Straight Flush**  | 5‑card rank sequence, same suit            | Creates a permanent **District Monument** (+10 % 💰 and 😊 city‑wide)                       |
| **Royal Flush**     | 10 J Q K A same suit in a line             | Win condition OR triggers end‑game Mega Project choice                                      |

Hands **stack**: a rank‑9 Heart inside two different pairs gets both buffs.
Spades (civic) **double the hand’s multiplier** when they’re in it (they act like wild multipliers).

---

### 5.  Special ranks  (Face cards + Ace)

| Rank  | Card name        | Placement rule                                                           | Extra ability                                                                                                   |
| ----- | ---------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **J** | *Junior* version | Cost 0 to place                                                          | No base yield, but *inherits* adjacent building’s suit for combos → handy glue card.                            |
| **Q** | *Queen Tower*    | Must touch at least 2 roads                                              | Doubles Mood bonuses of touching Hearts & Spades.                                                               |
| **K** | *King Plaza*     | 3×3 footprint, counts as **three** cards of its suit for hand detection. |                                                                                                                 |
| **A** | *Ace Landmark*   | One per suit city‑wide                                                   | When placed, instantly scores as if it finished a Flush with every touching card of same suit (gigantic burst). |

---

### 6.  Turn structure (“Blind → Ante” pacing)

1. **Draw Phase**: 5 new cards, refill to hand size.
2. **Build Phase**: Place up to *Build‑Actions* (starts at 3, +1 each Ante).
3. **Service Phase**: Pay upkeep = 10 % total 💰.
4. **Score Phase**: Evaluate hands ➜ add 💰 & 😊 (chips × mult visual).
5. **Review Objective** (the *Blind*): meet the target score before running out of hands. Pass all 3 reviews to move to next **Fiscal Ante** (higher score goal, tougher random rules).
6. **City Hall Shop**: spend 💰 on Jokers, one‑shots, deck upgrades.

---

### 7.  Designing for intuitive play

* **UI cues:** when you drag a card, highlight nearby ranks that could finish a hand.
* **Quick maths:** pop‑up shows new projected score if placed here vs. there.
* **Casual depth:** you can *just* place buildings for theme‑park fun ‑or‑ chase Flush + Straight Flush chains for explosive numbers.

---

### 8.  Why it works

* **Recognition:** players already know poker shapes → learning curve is visual, not math‑heavy.
* **City‑builder fantasy:** suits match archetypes; ranks feel like upgrading density.
* **Balatro thrill:** eruptive multipliers from Royal Flush monuments, one‑shot Grants, short “runs” (8 Antes ≈ 30 min).
* **Planning drama:** luck of the draw balanced by spatial puzzle and a discard limit.

---

### 9.  Minimal first prototype checklist

1. Grid, hand of 5 cards, drag‑drop.
2. Four suits mapped to R/C/I/S.
3. Detect Pair / Straight / Flush only (expand later).
4. Base Income & Mood bars; chips × mult readout.
5. One Joker slot (e.g., “Wildcard Road”).
6. Three escalating score goals (small/big/boss review).

Build this slice, then layer in Queens, Kings, Jokers, and meta‑progression vouchers as the game matures.
