# MatchD Rating System

## Overview

Each player has a single visible rating per sport (scale **1.0 – 10.0**, starting at **2.0**).  
Internally it is the weighted combination of two independent sub-ratings:

| Sub-rating | Source | Bias resistance |
|---|---|---|
| `peer_rating` | Scores given by opponents after each match | Moderate (bias-corrected EMA) |
| `elo_rating` | Match outcomes (win / draw / loss) | High (outcome-based, can't be faked) |

Both sub-ratings start at **2.0**. Players earn their rating — there is no placement phase.

---

## Sub-rating A — Peer Rating

### When it updates
After every match, players rate their opponents (1–10). Each score submitted to `match_ratings` triggers the peer update for the rated player.

### Bias correction
Friends tend to rate each other generously. To counteract this, each incoming score is adjusted by how generous that rater has historically been:

```
rater_avg     = average of all scores this rater has ever given (excluding current)
adjusted_score = CLAMP(score − (rater_avg − 5.0), 1.0, 10.0)
```

**Example:** A rater whose lifetime average is 8.0 gives a score of 8.0.  
`adjusted = 8.0 − (8.0 − 5.0) = 5.0` → treated as average, not great.  
If the rater has never given a score before, no correction is applied.

### Exponential Moving Average (EMA)
Instead of a simple mean (which is permanently skewed by early friend ratings), the peer rating uses an EMA with α = 0.18 (≈ 10-rating window):

```
peer_new = 0.82 × peer_old + 0.18 × adjusted_score
peer_new = CLAMP(peer_new, 1.0, 10.0)
```

With α = 0.18, a burst of 5 perfect friend scores in one match shifts `peer_rating` by at most ~0.9 points, and that effect decays within ~10 subsequent unbiased reviews.

---

## Sub-rating B — Elo Rating

### When it updates
Only when a match result is **confirmed** through the dispute resolution flow (see below). If no result is submitted, or the result is abandoned after two rounds of disagreement, `elo_rating` does not change.

### Team-vs-team expected score
Elo compares **team averages**, not individual vs opponent. This means a weak player on a strong team isn't falsely rewarded for an easy win, and a strong player on a weak team isn't harshly punished for an expected loss.

```
R_home_avg = AVG(elo_rating) of all confirmed home team players
R_away_avg = AVG(elo_rating) of all confirmed away team players

E_home = 1 / (1 + 10 ^ ((R_away_avg − R_home_avg) / 3))
E_away = 1 − E_home
```

The divisor **D = 3** is calibrated for a 1–10 scale (equivalent to 400 on the standard chess scale).

### Outcome (S)
| Result | S for winning team | S for losing team |
|---|---|---|
| Win | 1.0 | 0.0 |
| Draw | 0.5 | 0.5 |
| Loss | 0.0 | 1.0 |

### K-factor — dampened by team size
In large team sports, a single player controls less of the outcome, so the maximum Elo shift per match is smaller:

```
K = 0.8 / sqrt(team_size)
```

| Sport | team_size | K |
|---|---|---|
| Tennis | 1 | 0.80 |
| Padel | 2 | 0.57 |
| 5v5 mini football | 5 | 0.36 |
| Basketball | 5 | 0.36 |
| Volleyball | 6 | 0.33 |
| 8v8 mini football | 8 | 0.28 |
| Football 11v11 | 11 | 0.24 |

### Elo update
Every confirmed participant on both teams is updated individually:

```
ΔElo  = K × (S − E)           # S and E are the values for their team side
elo_new = CLAMP(elo_old + ΔElo, 1.0, 10.0)
```

The delta uses the **team-level E** but is applied to each player's **own elo_rating**, so players diverge individually over time even when playing on the same team.

### Worked example — 5v5, even teams

Home team avg = Away team avg = 5.0 → E_home = E_away = 0.50, K = 0.36

| Result | ΔElo |
|---|---|
| Win | +0.18 |
| Draw | 0.00 |
| Loss | −0.18 |

### Worked example — 5v5, underdog wins

Home team avg = 4.0, Away team avg = 6.5 → E_home = 0.17, K = 0.36

| Result | ΔElo for home team players |
|---|---|
| Win (upset) | +0.30 |
| Loss (expected) | −0.06 |

Upset wins are rewarded more. Expected results move the needle less.

---

## Combined Rating

### Formula
```
w_elo  = 0.8 / (1 + 0.5 × ln(team_size))
w_peer = 1 − w_elo

combined = w_elo × elo_rating + w_peer × peer_rating
combined = CLAMP(combined, 1.0, 10.0)
```

In individual sports (tennis) the outcome is a perfect signal of individual skill, so Elo dominates. In large team sports (11v11 football) the outcome says little about any one player, so peer reviews carry more weight.

### Weights by sport

| Sport | team_size | Elo weight | Peer weight |
|---|---|---|---|
| Tennis | 1 | **80%** | 20% |
| Padel | 2 | 59% | 41% |
| 5v5 mini football | 5 | 44% | 56% |
| Basketball | 5 | 44% | 56% |
| Volleyball | 6 | 42% | 58% |
| 8v8 mini football | 8 | 39% | 61% |
| Football 11v11 | 11 | **36%** | 64% |

### Before the first confirmed result
Until `elo_applied = true` (i.e. the player has at least one confirmed match result), the combined rating equals `peer_rating` only. The Elo component is not included in the blend until there is a real outcome to base it on.

---

## Result Dispute Flow

Match results are submitted voluntarily by players. The flow has two rounds before giving up:

```
Team A submits score
        │
        ├── Team B accepts  →  CONFIRMED  →  Elo + peer both apply
        │
        └── Team B disputes (submits counter-score)
                   │
                   ├── Team A accepts  →  CONFIRMED  →  Elo + peer (counter version)
                   │
                   └── Team A rejects  →  ABANDONED  →  peer only, no Elo update
```

If nobody submits a result, the match stays in **PENDING** state: peer reviews apply, Elo does not.

---

## Match Completion Notifications

When a match ends (at `scheduled_at + duration_minutes`), a pg_cron job fires and inserts a `match_completed` notification for every confirmed participant. The notification navigates to the match detail page where both result reporting and player rating are available.

The cron job is scheduled at match creation and self-unschedules after running. If the match is cancelled beforehand, the cron job is removed immediately.

---

## Database Tables

| Table | Role |
|---|---|
| `match_ratings` | Raw peer scores (1–10) submitted by raters |
| `player_ratings` | Aggregated per `(player_id, sport)`: `rating`, `peer_rating`, `elo_rating`, `elo_applied`, `total_matches`, `wins`, `rating_count` |
| `match_results` | One row per match: dispute state machine, final winner, `elo_applied` flag |

## Database Triggers

| Trigger | Table | Fires on | Action |
|---|---|---|---|
| `update_player_rating` | `match_ratings` | INSERT | Bias-corrects score, applies EMA to `peer_rating`, recalculates `combined` |
| `update_elo_rating` | `match_results` | UPDATE → `status = 'confirmed'` | Computes team averages, applies K×(S−E) to each player's `elo_rating`, recalculates `combined` |
| `schedule_match_completion_notification` | `matches` | INSERT | Schedules a pg_cron job at match end time |
| `unschedule_on_cancel` | `matches` | UPDATE → `status = 'cancelled'` | Removes the pending pg_cron job |
