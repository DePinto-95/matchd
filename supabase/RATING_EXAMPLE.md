# Worked Example: How a Rating Evolves in a 5v5 Match

A complete, real-numbers walkthrough of the rating system for one mini
football 5v5 match, with reviews arriving at different times during the
7-day review window.

Every number here is produced by the exact trigger math. To regenerate
this output (or tweak the scenario), run:

```bash
python web/supabase/example_5v5_walkthrough.py
```

---

## The three equations

**1. Review processing** (fires per review, the moment it is submitted):

```
adjusted = score + (5 − rater's lifetime avg)      boost capped at +1,
                                                   suppression uncapped
α        = 0.18 × credibility                      credibility = how many
                                                   DISTINCT players the
                                                   rater has rated:
                                                   0–1 → 0.25, 2 → 0.5,
                                                   3 → 0.75, 4+ → 1.0
peer'    = (1 − α) · peer + α · adjusted           EMA step
```

**2. Elo** (fires exactly once per match, when the result is confirmed):

```
E_home = 1 / (1 + 10^((away_avg_elo − home_avg_elo) / 3))
K      = 0.8 / √(team_size)                        5v5 → K ≈ 0.358
elo'   = elo + K · (S − E)                         S = 1 win, 0.5 draw, 0 loss
```

Every teammate gets the same Elo delta (team-vs-team). Reviews NEVER
touch elo.

**3. Displayed rating** (recomposed whenever peer, elo, or n changes):

```
w      = min(0.6, n / (n + 4))                     n = reviews RECEIVED
                                                   in that sport, lifetime
rating = (1 − w) · elo + w · peer
```

| n (reviews received) | review weight w | elo weight |
|---|---|---|
| 0 | 0.00 | 1.00 |
| 1 | 0.20 | 0.80 |
| 2 | 0.33 | 0.67 |
| 4 (one full 5v5) | 0.50 | 0.50 |
| 6+ | 0.60 (cap) | 0.40 |

---

## The match

**Monday 21:30, mini football 5v5.**
HOME — Alex, Bilal, Chris, **Dario**, Elias — beat
AWAY — Felix, Goran, Hugo, Ivan, Jonas — 5–3.

All ten players are brand new: **elo 2.0, peer 2.0, 0 reviews**.
We follow **Dario**, who receives 4 reviews (2 opponents + 2 teammates,
the standard assignment) spread across the week.

---

## Timeline

### MON 22:00 — Goran (opponent) reviews Dario: **7**
*(the result isn't even confirmed yet)*

- Goran's first-ever review → no bias correction, credibility floor:
  α = 0.18 × 0.25 = **0.045**
- peer: 0.955 × 2.000 + 0.045 × 7.000 = **2.225**
- No confirmed result yet → **rating = peer = 2.225**

### TUE 09:00 — away accepts the result → **Elo applies** (once, for everyone)

- Equal teams: E_home = 1/(1+10⁰) = 0.5;  K = 0.8/√5 = 0.3578
- Home players: 2.0 + 0.3578 × (1 − 0.5) = **2.179**
- Away players: 2.0 + 0.3578 × (0 − 0.5) = **1.821**
- Dario (n=1 → w=0.2): rating = 0.8 × 2.179 + 0.2 × 2.225 = **2.188**
- Ivan (n=0 → w=0): rating = elo = **1.821** — nobody reviewed him, pure Elo

### TUE 18:00 — Bilal (teammate) reviews Dario: **8**

- Bilal earlier gave a 6 and a 5 → avg 5.5 → correction −0.5 →
  adjusted **7.5**;  2 distinct ratees → α = 0.090
- peer: 0.910 × 2.225 + 0.090 × 7.5 = **2.700**
- n=2 → w = 2/6 = 0.333 →
  rating = 0.667 × 2.179 + 0.333 × 2.700 = **2.353**

### THU 14:00 — Ivan (opponent) reviews Dario: **6**

- Ivan's history avg 4.33 (slightly harsh) → correction **+0.667** →
  adjusted 6.667;  3 distinct → α = 0.135
- peer: 0.865 × 2.700 + 0.135 × 6.667 = **3.235**
- n=3 → w = 3/7 = 0.429 →
  rating = 0.571 × 2.179 + 0.429 × 3.235 = **2.632**

### SAT 11:00 — Elias (teammate) reviews Dario: **9**

- Elias is generous (avg 8.667) → correction **−3.667** → his 9 becomes
  adjusted **5.333**;  α = 0.135
- peer: 0.865 × 3.235 + 0.135 × 5.333 = **3.519**
- n=4 → w = 4/8 = 0.5 →
  rating = 0.5 × 2.179 + 0.5 × 3.519 = **2.849**

### MON +8 days — Hugo tries to review late → **rejected**

The 7-day review window has closed (`enforce_review_deadline` trigger,
`review_deadline.sql`). Nothing needs recalculating: ratings were always
correct for the reviews that existed at each moment.

---

## Final state after the week

| Player | elo | peer | n | w | **rating** |
|---|---|---|---|---|---|
| **Dario** | 2.179 | 3.519 | 4 | 0.50 | **2.849** |
| Alex | 2.179 | 2.389 | 2 | 0.33 | 2.249 |
| Bilal | 2.179 | 2.270 | 1 | 0.20 | 2.197 |
| Chris | 2.179 | 2.000 | 0 | 0.00 | 2.179 = elo |
| Elias | 2.179 | 2.000 | 0 | 0.00 | 2.179 = elo |
| Felix | 1.821 | 2.090 | 1 | 0.20 | 1.875 |
| Goran | 1.821 | 2.266 | 2 | 0.33 | 1.969 |
| Hugo | 1.821 | 2.315 | 1 | 0.20 | 1.920 |
| Ivan | 1.821 | 2.000 | 0 | 0.00 | 1.821 = elo |
| Jonas | 1.821 | 2.180 | 1 | 0.20 | 1.893 |

---

## What this one match demonstrates

1. **Ratings update per event, never in batch.** Dario's displayed rating
   changed 5 times (1 review before confirmation, the Elo application,
   3 more reviews) — each instant, it was the correct blend of the
   information that existed so far.
2. **Elo is written exactly once** (TUE 09:00) and reviews never touch it.
   Reviews only move `peer` and re-mix the displayed number.
3. **Skipped reviews need no handling.** Chris, Elias and Ivan got no
   reviews — their rating is simply pure Elo. Missing information leaves
   weight on Elo; it never blocks or distorts anything.
4. **Rater bias is normalized.** Generous Elias's 9 counted as 5.33;
   harsh Ivan's 6 counted as 6.67. A constant rater carries no signal.
5. **Same match result, different ratings.** All five home players have
   identical elo 2.179, but Dario ends at 2.849 vs Chris's 2.179 —
   that separation is purely review-driven.
6. **Event order doesn't matter.** The displayed rating is a pure
   function of (elo, peer, n), so reviews arriving before or after the
   result confirmation end at the same final number (proven by
   `combined_order_independent_within_match` in rating_tests_5v5.py).

Related docs: `RATING_TESTS.md` (test suite + how to verify the live DB),
`rating_weight_by_reviews.sql` (the deployed blend), `review_deadline.sql`
(the 7-day window).
