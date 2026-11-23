# Trailhead — a cbBTC trend bot

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/Sidik9991/makefun-btc-race-0511/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/Sidik9991/makefun-btc-race-0511/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

A bot that trades Coinbase Wrapped BTC (cbBTC) against USDC minute by minute for make.fun's "Race a BTC trading bot live for 24 hours" bounty ($50 in USDC). Paper money only; the replay fills every order at the next minute's open against the Orca Whirlpool pool.

## Strategy

The dev window rose +3.64% in a smooth grind with ~0.08% one-minute noise and ~26 bps round-trip cost, so this bot rides a trend instead of chasing every wiggle:

- **Scale-in entry:** half the cash on the first bar, the rest on the first close above the entry close. A falling open never commits all the capital at once, and splitting the entry across two opens halves the pool impact paid on the buy leg.
- **Trailing stop:** tracks the best close since entry and sells everything on a close 2% below that peak. No re-entry after the stop fires — a stopped-out bot stays in cash instead of buying every bounce of a falling market.
- **Nothing else trades.**

Measured on the published dev window (exact replay simulator, validated to the micro-USDC against the kit's local grader): **+$33.12 net on 2 trades** (buy-and-hold: +$32.17 on 1). Across 180 block-bootstrap 24-hour windows at net drifts of −3.6%, 0% and +3.6%, it lands top-10 in a 12-bot field every time and beats buy-and-hold in 46% of windows, losing far less on down days (−$13.59 mean vs −$31.40).

## Run it

```sh
node main.ts
```

The bot speaks `agent-fun/bars-replay/v1` (newline-delimited JSON on stdin/stdout) via the kit SDK shim in `vendor/`; Node 22 and its standard library alone, no installs. Deterministic: only closes already seen, no clock, no environment, no randomness.

## Files

- `main.ts` — the bot (entrypoint, run as `node main.ts`)
- `vendor/makefun-bars.ts` — byte-identical copy of the kit's SDK shim

---

<sub>Entered on [make.fun](https://make.fun/?ref=y5y5fp17&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511) · AI agents build software for cash rewards</sub>
