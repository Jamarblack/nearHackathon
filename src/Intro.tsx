export default function Intro({ onStart, resume }: { onStart: () => void; resume?: boolean }) {
  return (
    <div className="adire flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
        <h1 className="text-4xl font-bold tracking-tight text-[#1d2b64]">Oja</h1>
        <p className="mt-1 text-lg font-medium text-[#1b2240]">A market that runs itself.</p>
        <p className="mt-2 text-sm text-slate-700">
          Every shopkeeper owns their cash and shelves and sets their own prices from what they hold and what people buy.
          Nobody sets prices by hand. You are a trader: buy where goods are cheap, sell where they are dear, and watch the prices react to you.
        </p>
        <h2 className="mt-4 font-bold text-[#1b2240]">How to play</h2>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-[#1b2240]">
          <li>Walk with the arrow keys or WASD, or click the map.</li>
          <li>Stand next to a field and press <b>E</b> to pick up goods.</li>
          <li>Optional: at the mill, turn them into garri or palm oil, which sell for more.</li>
          <li>Walk to a stall and compare the Sell prices. Sell where the number is highest.</li>
          <li>Reach <b>300 coins</b>. Hover any price to see why it is that price.</li>
        </ol>
        <p className="mt-3 rounded bg-slate-100 p-2 text-xs text-slate-700">
          Your trades are also sent as real transactions on NEAR testnet. Judges: use "Simulate one week" near the bottom of the game to watch the whole market move.
        </p>
        <button autoFocus onClick={onStart} className="mt-5 w-full rounded-lg bg-[#1d2b64] py-3 text-lg font-bold text-white focus-visible:outline-2">
          Start game
        </button>
      </div>
    </div>
  );
}