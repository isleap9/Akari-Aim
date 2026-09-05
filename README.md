# Akari Aim

A sensitivity converter for **Apex Legends**. Match any player's aim at your own DPI, then check your effective sensitivity behind every scope.

## What it does

- **DPI conversion** — enter a reference DPI + sensitivity (e.g. a pro's setup), then your own DPI, and get the sensitivity that keeps the exact same `cm/360°`.
- **cm/360°** — the universal reference number, shown for both setups so you can verify two configs feel identical.
- **ADS sensitivity** — enter your in-game per-optic multipliers (1× through 10×) to see the effective sensitivity and `cm/360°` behind each scope.

## The math

Sensitivity is converted so that the physical distance for a full 360° turn stays constant:

```
sens₂ = sens₁ × (dpi₁ ÷ dpi₂)
```

`cm/360°` is derived from the Apex yaw constant (`0.022` degrees per count at sensitivity 1):

```
cm/360° = (360 × 2.54) ÷ (sens × dpi × 0.022)
```

Effective ADS sensitivity is simply your hipfire sensitivity times the per-optic multiplier:

```
effective = hipfire × multiplier
```

> Note: ADS multipliers are DPI-independent — the multiplier sits on top of your already-converted base sensitivity, so a reference player's `1× = 1.0` is `1.0` for you too.

## Running locally

It's a static site — no build step. Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server
# then visit http://localhost:8000
```

## Deploying

Works as-is on any static host:

- **GitHub Pages** — push to a repo, enable Pages on the branch.
- **Netlify / Vercel** — drag the folder in, or connect the repo. No build command needed.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Markup and page structure |
| `styles.css` | Lantern-light dark theme |
| `app.js` | Converter logic |

## Disclaimer

Not affiliated with or endorsed by Electronic Arts or Respawn Entertainment. Apex Legends is a trademark of its respective owners.
