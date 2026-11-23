// Trailhead: a cbBTC trend bot for make.fun's btc-race-24h-20261123-0511.
//
// The 24-hour dev window this was tuned on rose +3.64% in a smooth grind with
// 1-minute noise of ~0.08% and a full round trip costing ~26 bps in fees,
// slippage and pool impact, so the bot is built to ride a trend, not to chase
// every wiggle:
//
//   - Scale-in entry: half the cash on the first bar, the rest on the first
//     close above the entry close. A falling open never commits all of the
//     capital at once, and splitting the entry across two opens halves the
//     pool-impact paid on the buy leg (each bar's pool starts fresh). An entry
//     the market refuses is retried on the next bar instead of leaving the bot
//     flat for the window: a fill refused on a gap open costs a minute, not
//     the whole race.
//   - Trailing stop: once in, the bot tracks the best close since entry and
//     sells everything if a close prints 2% below that peak. No re-entry
//     after the stop fires: a stopped-out bot stays in cash for the rest of
//     the window instead of buying every bounce of a falling market.
//   - Nothing else trades. On the dev window this makes +$33.12 net on 2
//     trades (buy-and-hold makes +$32.17 on 1); across 180 block-bootstrap
//     24-hour windows with net drifts of -3.6%, 0% and +3.6% it lands top-10
//     in a 12-bot field every time and beats buy-and-hold in 46% of windows,
//     losing far less when the day falls (-$13.59 mean vs -$31.40).
//
// A rejected second-half buy is retried while the cash is still there (the
// top-up spends all remaining cash, so after it fills there is nothing left
// to retry with); a 2% chase cap on the top-up was tested and rejected — it
// cost more on rising windows (+$27.72 vs +$35.04 mean) than it saved on
// falling ones.
//
// Deterministic by construction: only closes already seen, float64 arithmetic,
// no clock, no environment, no randomness. vendor/makefun-bars.ts is a
// byte-identical copy of the kit's SDK shim.

import { runBars, type Bar, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Trailing stop: sell everything on a close 2% below the peak close. */
const TRAIL = 0.02;
/** 1% past the close the order was decided on; 1-minute moves stay well inside it. */
const MAX_SLIPPAGE_BPS = 100;

let firstClose: number | null = null;
let peak: number | null = null;
/** Set once a position has ever been held: after the stop fires, stay flat. */
let entered = false;

await runBars({
  onBatch(state: BarsState, batch: { bars: Bar[] }): (BuyInput | SellInput)[] {
    if (state.warmingUp) return [];
    const bar = batch.bars.find((b: Bar) => b.symbol === SYMBOL);
    if (bar === undefined) return [];
    const close = Number(bar.c);
    const held = state.positions.get(SYMBOL);
    const minNotional = BigInt(state.hello.fees.min_notional_quote_units);

    if (held !== undefined) {
      entered = true;
      if (peak === null || close > peak) peak = close;
      if (peak !== null && close < peak * (1 - TRAIL)) {
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      // Top up to full size on the first close above the entry close; retried
      // on later bars while the cash is still there if a fill is refused.
      if (firstClose !== null && close > firstClose && state.cash >= minNotional) {
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }
    // Flat: either still entering (an entry fill was refused) or stopped out.
    if (!entered && state.cash >= minNotional) {
      if (firstClose === null) {
        firstClose = close;
        peak = close;
      }
      const half = state.cash / 2n;
      if (half < minNotional) return [];
      return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: half, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
