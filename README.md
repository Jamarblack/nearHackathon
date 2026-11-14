# Oja: a market that runs itself

**NEAR HACKATHON entry · Track: Games With Real Economies (`games`)**

Oja is a small Nigerian market town. Every shopkeeper is a rules-driven agent with its own cash,
its own shelves and its own testnet wallet, and **nobody sets the prices**. Merchants price each
good from how much of it they hold and how much people have recently bought. Flood a stall with
cassava and cassava gets cheap. Drain a merchant of cash and the shop closes. You are a trader:
buy where goods are cheap, sell where they are dear, and watch the prices react to what you did.

- Demo video: <<< paste your X post link here >>>
- Live demo: <<< paste your Vercel link here, or delete this line if you did not deploy >>>

## What is real and what is not

| Part | Status |
|---|---|
| Walkable market town, gathering, crafting, trading | Built, runs in the browser |
| Merchants set prices from stock and demand, one readable rules file | Built (`src/economy/pricing.ts`) |
| Reasoning tooltip ("Why this price") | Built |
| Fast-forward: one game week in about 60 seconds, with a price chart | Built, seeded so every run is identical |
| A merchant with no cash closes, then slowly recovers | Built |
| Your own trades settle on **NEAR testnet** (1 coin = 0.001 testnet NEAR) | Built, needs a one-time setup below |
| Merchant wallets | Each merchant has its own testnet account |
| Items as NEP-245 multi tokens | **Not built.** No custom smart contract was written. |
| Social or email login | **Not built.** There is no player login. |
| Player investment that reopens a broke merchant | **Not built.** Closed merchants recover on their own each day. |

## Try it

1. `pnpm install`, then `pnpm dev`, and open the printed local URL. **See:** a top-down market town with a hint bar under the header.
2. Walk with the arrow keys or WASD, or click the map. Walk next to the **Cassava farm** and press **E**. **See:** you pick up 1 to 3 cassava, a floating message appears, and the field needs 10 seconds to recover.
3. Gather 2 cassava, walk to the **Pounding mill**, and click **2 cassava → garri**. **See:** one garri in "Your goods".
4. Walk up to a stall (Mama Nkechi, Alhaji Musa, Baba Tunde). **See:** that merchant's stock, buy prices, sell prices and cash.
5. Hover a price. **See:** the "Why this price" panel explains it: stock against target, recent demand, any clamp, and the merchant's spread.
6. Sell several of the same good to one merchant. **See:** that merchant's stock rises and its prices for that good fall. A merchant that runs out of cash turns grey and closes.
7. Buy and sell the same good at one stall. **See:** you lose money, because every merchant buys below its selling price.
8. After any trade, look at **On NEAR testnet**. **See:** the trade goes from pending to done, with a link to the transaction. If keys are not set up it shows a warning, and the game still plays normally.
9. Click **Simulate one week (60 s)**. **See:** bot traders move goods between merchants, the day counter advances, and the chart draws the average price of each good over the week.
10. Click **New game** and run step 9 again. **See:** the same chart, because the simulation is seeded.

## Turn on testnet settlement (once)

Without this the game still works, but trades are not sent to NEAR.

1. `pnpm setup:near`. It creates 5 testnet accounts (treasury, player, three merchants), saves their keys in `.env` (git-ignored), and prints the treasury account id.
2. Request testnet NEAR for that id at https://docs.near.org/getting-started/faucet. Repeat once or twice if the amount is small.
3. Run `pnpm setup:near` again. It funds the player and the three merchants.
4. `pnpm dev`, make a trade at a stall, and watch **On NEAR testnet**.
5. To deploy, set the environment variable `NEAR_KEYS` to the JSON the script prints at the end (it leaves out the treasury key).

## How it works

- **Pricing** (`src/economy/pricing.ts`): price = base price x stock factor x demand factor, clamped to 0.4x to 3x of base. The stock factor compares a merchant's stock with a target of 20. Demand rises when players buy and fades each tick. Every merchant sells above what it pays (its spread).
- **Simulation** (`src/economy/sim.ts`): trades, crafting, the daily tick (town customers buy, farmers deliver, closed shops recover), and the bot traders used by fast-forward.
- **Town** (`src/Town.tsx`): the walkable canvas map.
- **Settlement** (`api/settle.ts`, `src/chain.ts`): each player trade becomes a testnet NEAR transfer, sent one at a time so a key never reuses a nonce. The game never waits for the chain.

## Exploit limits

Prices are clamped. Every merchant has a spread. The daily gather limit is 30 items. A merchant cannot pay more cash than it has. Bot traders cannot create money; they only move goods.

## Known limits

- Merchants are rules engines, not language models.
- Settlement is **custodial**: a server function holds the testnet keys and signs every trade, so the player never sees a wallet. Testnet only. Never put real funds in these accounts.
- Only the player's own trades settle on-chain. The town simulation and bot traders stay off-chain, so on-chain merchant balances and in-game merchant cash drift apart over time.
- The settle endpoint is open and rate-limited. It only moves testnet NEAR.
- No custom smart contract and no NEP-245 items: the Rust toolchain was not available in time.
- The transaction link format for the testnet explorer was not checked against every explorer page.

## License

MIT. See `LICENSE`.