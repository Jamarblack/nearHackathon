# Haggle Town: a market that runs itself

**NEAR HACKATHON entry · Track: Games With Real Economies (`games`)**

Haggle Town is a small Nigerian market town. Three shopkeepers each own their cash, their shelves and a
NEAR testnet wallet, and **nobody sets the prices**. Each merchant prices every good from how much of
it they hold and how much people have recently bought. Flood a stall with cassava and cassava gets
cheap. Drain a merchant of cash and the shop closes. You are a trader: buy where goods are cheap,
sell where they are dear, reach 300 coins, and watch the prices react to what you did.

- Demo video: https://x.com/AyoAbdulraheem/status/2121731613432422402?a=a2r_Rz5Ns1JadXMwzQk&s=20
- Live demo: https://oja-near-hackathon.vercel.app/

## What works

- A walkable market town with 3 fields, a mill and 3 merchant stalls
- Gathering, crafting and trading, with a 300-coin goal
- Merchant prices driven by stock and demand, with all the rules in one file
- A "Why this price" explanation for every price
- Merchants that close when they run out of cash and recover over time
- A fast-forward mode that simulates one game week in about 60 seconds, with a price chart
- Every one of your trades settles as a real transaction on NEAR testnet, with a link to it
- Progress saved in your browser, with a Continue button

## Quick start (2 minutes)

1. `pnpm install`, then `pnpm dev`, and open the local URL. **See:** a cover screen. Click **Start game**.
2. Click the map, or use the arrow keys or WASD, to walk next to the **Cassava farm**, then press **E**. **See:** 1 to 3 cassava appear in "Your goods".
3. Walk to **Alhaji Musa's** stall (middle of the map). **See:** his stock, buy prices and sell prices appear below the map.
4. Click a **Sell** price for cassava. **See:** your coins go up and a message floats above your character.
5. Scroll to **On NEAR testnet**. **See:** the trade goes from pending to done, with a **view** link to the transaction.
6. Click **Simulate one week (60 s)**. **See:** the days advance, merchants trade with bots, and the price chart draws.

## How the game works

### The town
| Place | What it does |
|---|---|
| Cassava farm, Palm grove, Cotton field | Give raw goods (cassava, palm nuts, cotton) |
| Pounding mill | Turns raw goods into garri (2 cassava) or palm oil (3 palm nuts) |
| Mama Nkechi's stall | Food seller. Fair prices. Starts with 400 coins, 20% spread |
| Alhaji Musa's stall | Cloth trader. Hard bargainer. 300 coins, 30% spread |
| Baba Tunde's stall | Oil dealer. Generous but low on cash. 120 coins, 12% spread |

### Controls
Arrow keys or WASD to walk, or click the map. **E** (or Space) interacts with whatever you stand next to. On a phone, an **Interact** button appears. The white bar under the header always tells you the next step.

### Your goal
You start with 60 coins and no goods. Reach **300 coins**. The goal message appears in the header.

### Gathering
Press E at a field to pick up 1 to 3 units. Each field needs 10 seconds to recover. You can gather at most **30 items per day**. When you hit the limit, press **Sleep (next day)**.

### Crafting
At the mill, click **2 cassava → garri** or **3 palm nuts → palm oil**. Crafted goods sell for much more than raw ones.

### Trading
Stand at a stall to see a table with each good's stock, a **Buy** price and a **Sell** price. Press a price to trade one unit.
- **Buy price (ask):** what the merchant charges you.
- **Sell price (bid):** what the merchant pays you. It is always lower than the buy price, so buying and instantly reselling at the same stall always loses money.
- A merchant cannot buy if its cash is lower than the price. A merchant with no stock cannot sell.

### How merchants set prices
All rules are in `src/economy/pricing.ts`. For each good:

1. **Stock factor** = (20 / (stock + 1)) ^ 0.8. Low stock raises the price, and a glut lowers it.
2. **Demand factor** = 1 + 0.06 x recent demand. Every unit bought from a merchant raises its demand for that good by 1, and demand fades by 15% each day.
3. **Multiplier** = stock factor x demand factor, limited to between 0.4x and 3x.
4. **Buy price** = base price x multiplier, rounded. **Sell price** = buy price x (1 - the merchant's spread), rounded down.

Base prices: cassava 10, palm nuts 12, cotton 15, garri 30, palm oil 45.

**Worked example (new game):** Mama Nkechi holds 30 cassava, so she sells it for **7**. Alhaji Musa holds only 6, so he pays **16** for it. Buy at Mama's, sell at Musa's, and you make 9 coins per unit. Each trade moves both prices: her stock falls so she charges more, and his stock rises so he pays less. The gap closes by itself.

Hover any price to see the merchant's exact reasoning in the **Why this price** box.

### When a merchant goes broke
If a merchant's cash drops below 25 after buying from you, its stall turns grey and shows **(CLOSED)**. A closed stall earns 30 coins a day from family and credit, and reopens when it reaches 120.

### Days
Press **Sleep (next day)**. Your gather limit resets, demand fades, and for each open merchant 3 town customers buy random goods and farmers deliver up to 4 units of a raw good, which the merchant pays for.

### Fast-forward
**Simulate one week (60 s)** plays 7 game days in about 60 seconds. Each tick, bot traders look for a good that one merchant sells cheaper than another will pay, and move it. A day passes every 12 ticks. The chart shows each good's average buy price across open merchants. After **New game**, a fast-forward with no other actions plays out the same way every time.

### Saving
Your progress saves in this browser after each action. Reopen the page and press **Continue game**. **New game** erases the save. Gather cooldowns and the transaction list are not saved.

### On NEAR testnet
Each trade you make also moves testnet NEAR: 1 coin = 0.001 NEAR. Buying sends NEAR from the player wallet to the merchant's wallet, and selling sends it back. Trades are sent one at a time in the background, so the game never waits. The **On NEAR testnet** panel shows pending, done or failed, with a link to each transaction. If testnet is not set up, the game plays normally and the panel shows a warning. Bot trades and daily restocking are not sent on-chain.

## Run it

```
pnpm install
pnpm dev
```

### Turn on testnet settlement (once)
1. `pnpm setup:near`. It creates 5 testnet accounts (treasury, player, 3 merchants), saves their keys in `.env` (git-ignored), and prints the treasury id.
2. Request testnet NEAR for that id at https://docs.near.org/getting-started/faucet (once or twice).
3. Run `pnpm setup:near` again. It funds the player (0.5 NEAR) and each merchant (0.7 NEAR).
4. `pnpm dev`, trade at a stall, and watch **On NEAR testnet**.
5. To deploy, set the environment variable `NEAR_KEYS` to the JSON the script prints (it leaves out the treasury key).

## Project layout

| File | Purpose |
|---|---|
| `src/economy/pricing.ts` | All merchant pricing rules and constants |
| `src/economy/sim.ts` | Trading, crafting, the daily tick, bot traders |
| `src/Town.tsx` | The walkable town and its characters |
| `src/App.tsx` | The game screen, panels and fast-forward |
| `src/Intro.tsx` | Cover screen |
| `src/chain.ts`, `api/settle.ts` | Testnet settlement |
| `scripts/setup-near.mjs` | One-time testnet account setup |

## Limitations

- Merchants follow formulas; they do not use AI.
- Items are numbers inside the game. No smart contract and no NEP-245 tokens were built. Only the NEAR transfers are on-chain.
- There are no player accounts or login. A single shared testnet wallet plays the part of the player.
- Settlement is custodial: a server function holds the testnet keys and signs every trade. Testnet only; never put real funds in these accounts.
- Only your trades settle on-chain, so on-chain merchant balances and in-game cash drift apart.
- Closed merchants recover on their own; players cannot invest to reopen them.

## License

MIT. See `LICENSE`.