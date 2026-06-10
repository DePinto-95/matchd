"""
Combined Elo + review-rating test suite, focused on 5v5.

Builds on the trigger-faithful simulator in rating_sim.py (same folder),
which mirrors the deployed SQL in rating_hardening.sql / elo_trigger_fix.sql.
Every case here is a hard assertion: the run ends with a PASS/FAIL table
and a non-zero exit code if anything fails, so you can re-run it yourself
any time:

    python web/supabase/rating_tests_5v5.py

If a case fails after you change the SQL, either the SQL has a bug or
rating_sim.py needs to be updated to match it (they must stay in sync).

Sections:
  A. Elo mechanics (5v5)        — expected score, K-factor, zero-sum, clamps
  B. Review (peer) mechanics    — bias correction, credibility, EMA, sybil
  C. Combined rating            — w_elo blend, gating, star players, seasons
  D. Review assignment pipeline — validity + full 20-match season simulation
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rating_sim import (Sim, ALPHA, BOOST_CAP, CRED_FLOOR, ELO_DIV, BASE,
                        get_review_assignment, _make_match)

SPORT = 'football'
K5 = 0.8 / math.sqrt(5)                    # 5v5 K-factor      ≈ 0.3578
W5 = 0.8 / (1.0 + 0.5 * math.log(5))       # 5v5 elo weight    ≈ 0.4433

TESTS = []
FINDINGS = []   # informational observations, not failures


def test(fn):
    TESTS.append(fn)
    return fn


def parts5():
    H = [f'H{i}' for i in range(5)]
    A = [f'A{i}' for i in range(5)]
    return H, A, [(p, 'home') for p in H] + [(p, 'away') for p in A]


def seed(sim, players, elo, peer=None):
    for p in players:
        sim.row(p, SPORT).update(elo=float(elo), peer=float(peer if peer is not None else elo),
                                 rating=float(elo), elo_applied=True)


# ════════════════════════════════════════════════════════════════
#  A. Elo mechanics (5v5)
# ════════════════════════════════════════════════════════════════

@test
def elo_equal_teams_home_win(expect):
    """Fresh 5v5, home wins: every home +K/2, every away -K/2 exactly."""
    sim = Sim()
    H, A, parts = parts5()
    deltas, Eh, Ea = sim.confirm(SPORT, 5, parts, 'home')
    expect(abs(Eh - 0.5) < 1e-12, f"equal teams must have E=0.5, got {Eh}")
    for d in deltas[:5]:
        expect(abs(d - K5 / 2) < 1e-12, f"home delta {d} != K/2 {K5/2}")
    for d in deltas[5:]:
        expect(abs(d + K5 / 2) < 1e-12, f"away delta {d} != -K/2")
    expect(abs(sim.get('H0', SPORT)['elo'] - (BASE + K5 / 2)) < 1e-12,
           "home elo must be 2 + K/2")


@test
def elo_equal_teams_draw_no_change(expect):
    """Equal teams, draw: nobody's elo moves."""
    sim = Sim()
    _, _, parts = parts5()
    deltas, _, _ = sim.confirm(SPORT, 5, parts, 'draw')
    expect(all(abs(d) < 1e-12 for d in deltas), f"draw moved elo: {deltas}")


@test
def elo_underdog_gains_more(expect):
    """Underdog (avg 2) beats favorite (avg 4): gain > K/2; favorite loses the same."""
    sim = Sim()
    H, A, parts = parts5()
    seed(sim, H, 2.0)
    seed(sim, A, 4.0)
    deltas, Eh, _ = sim.confirm(SPORT, 5, parts, 'home')
    exp_E = 1.0 / (1.0 + 10 ** ((4.0 - 2.0) / ELO_DIV))
    expect(abs(Eh - exp_E) < 1e-12, f"E_home {Eh} != formula {exp_E}")
    expect(deltas[0] > K5 / 2, f"underdog gain {deltas[0]} should exceed K/2 {K5/2}")
    expect(abs(deltas[0] + deltas[5]) < 1e-12, "underdog gain != favorite loss")


@test
def elo_favorite_gains_little(expect):
    """Favorite (avg 4) beats underdog (avg 2): gain < K/2 (expected win)."""
    sim = Sim()
    H, A, parts = parts5()
    seed(sim, H, 4.0)
    seed(sim, A, 2.0)
    deltas, Eh, _ = sim.confirm(SPORT, 5, parts, 'home')
    expect(Eh > 0.5, "favorite must have E > 0.5")
    expect(0 < deltas[0] < K5 / 2, f"favorite gain {deltas[0]} should be in (0, K/2)")


@test
def elo_zero_sum_equal_sizes(expect):
    """Mid-range elos, no clamping: sum of all deltas is 0 (zero-sum)."""
    sim = Sim()
    H, A, parts = parts5()
    rng = random.Random(1)
    for p in H + A:
        seed(sim, [p], rng.uniform(3.0, 7.0))
    for w in ['home', 'away', 'draw', 'home']:
        deltas, _, _ = sim.confirm(SPORT, 5, parts, w)
        expect(abs(sum(deltas)) < 1e-9, f"zero-sum violated: {sum(deltas)}")


@test
def elo_teammates_get_identical_delta(expect):
    """Team-vs-team Elo: every teammate moves by the same amount,
    regardless of individual elo."""
    sim = Sim()
    H, A, parts = parts5()
    for p, e in zip(H, [2, 3, 4, 5, 6]):
        seed(sim, [p], e)
    seed(sim, A, 3.0)
    deltas, _, _ = sim.confirm(SPORT, 5, parts, 'home')
    expect(max(deltas[:5]) - min(deltas[:5]) < 1e-12, "home deltas differ across teammates")
    expect(max(deltas[5:]) - min(deltas[5:]) < 1e-12, "away deltas differ across teammates")


@test
def elo_floor_clamp(expect):
    """Team already at elo 1.0 loses: stays exactly 1.0 (floor clamp).
    Winner still gains, so zero-sum intentionally breaks at the clamp."""
    sim = Sim()
    H, A, parts = parts5()
    seed(sim, H, 2.0)
    seed(sim, A, 1.0)
    deltas, _, _ = sim.confirm(SPORT, 5, parts, 'home')
    for p in A:
        expect(sim.get(p, SPORT)['elo'] == 1.0, f"{p} elo dropped below floor")
    expect(deltas[0] > 0, "winner must still gain at opponent floor")


@test
def elo_ceiling_clamp(expect):
    """Team at elo 10.0 wins: stays exactly 10.0 (ceiling clamp)."""
    sim = Sim()
    H, A, parts = parts5()
    seed(sim, H, 10.0)
    seed(sim, A, 5.0)
    sim.confirm(SPORT, 5, parts, 'home')
    for p in H:
        expect(sim.get(p, SPORT)['elo'] == 10.0, f"{p} elo exceeded ceiling")


@test
def elo_outcome_monotonic(expect):
    """Same starting state: elo(win) > elo(draw) > elo(loss)."""
    out = {}
    for w in ['home', 'draw', 'away']:
        sim = Sim()
        H, A, parts = parts5()
        seed(sim, H, 4.0)
        seed(sim, A, 5.0)
        sim.confirm(SPORT, 5, parts, w)
        out[w] = sim.get('H0', SPORT)['elo']
    expect(out['home'] > out['draw'] > out['away'],
           f"not monotonic: win={out['home']} draw={out['draw']} loss={out['away']}")


@test
def elo_max_swing_bounded(expect):
    """No single 5v5 match can move elo by more than K ≈ 0.358 — even the
    most extreme upset."""
    sim = Sim()
    H, A, parts = parts5()
    seed(sim, H, 1.0)
    seed(sim, A, 10.0)
    deltas, _, _ = sim.confirm(SPORT, 5, parts, 'home')   # 1.0 team beats 10.0 team
    expect(all(abs(d) <= K5 + 1e-12 for d in deltas),
           f"delta exceeded K={K5}: {max(abs(d) for d in deltas)}")
    expect(deltas[0] > 0.95 * K5, "extreme upset should gain nearly the full K")


@test
def elo_streaks_are_path_dependent(expect):
    """5 home wins then 5 home losses (equal start): home ends BELOW 2.0.
    This is inherent Elo behavior, not a bug — losses taken while highly
    rated cost more than the early wins earned. Zero-sum still holds, so
    the away team ends above 2.0 by the exact same amount."""
    sim = Sim()
    _, _, parts = parts5()
    for w in ['home'] * 5 + ['away'] * 5:
        sim.confirm(SPORT, 5, parts, w)
    h, a = sim.get('H0', SPORT)['elo'], sim.get('A0', SPORT)['elo']
    expect(h < BASE, f"home should end below start after 5W-then-5L, got {h}")
    expect(abs((h - BASE) + (a - BASE)) < 1e-9, "streaks broke zero-sum symmetry")
    expect(BASE - h < K5 * 1.5, f"path-dependence drift {BASE - h:.3f} unreasonably large")
    FINDINGS.append(f"order matters in Elo: 5W then 5L ends at {h:.3f} "
                    f"(-{BASE - h:.3f}); the team that won late ends at {a:.3f}")


# ════════════════════════════════════════════════════════════════
#  B. Review (peer) mechanics
# ════════════════════════════════════════════════════════════════

@test
def review_fresh_rater_raw_score(expect):
    """First-ever review from a rater: no bias correction, credibility floor.
    eff_alpha = 0.18 * 0.25 = 0.045; peer = 0.955*2 + 0.045*score."""
    sim = Sim()
    adj, ravg, ea = sim.review('R', 'T', SPORT, 7, 5)
    expect(ravg is None, "fresh rater must have no average")
    expect(adj == 7, f"adjusted {adj} != raw 7")
    expect(abs(ea - ALPHA * CRED_FLOOR) < 1e-12, f"eff_alpha {ea} != 0.045")
    expect(abs(sim.get('T', SPORT)['peer'] - (0.955 * BASE + 0.045 * 7)) < 1e-12,
           "first-review EMA wrong")


@test
def review_generous_rater_suppressed(expect):
    """Rater whose lifetime average is 9 gives another 9: correction is
    5-9 = -4 (uncapped downward), adjusted score becomes 5."""
    sim = Sim()
    sim.review('G', 'D1', SPORT, 9, 5)
    sim.review('G', 'D2', SPORT, 9, 5)
    adj, ravg, _ = sim.review('G', 'T', SPORT, 9, 5)
    expect(ravg == 9.0, f"rater avg {ravg} != 9")
    expect(adj == 5.0, f"generous 9 should adjust to 5, got {adj}")


@test
def review_harsh_rater_boost_capped(expect):
    """Rater whose lifetime average is 1 gives a 5: raw correction would be
    +4 but the upward boost is capped at +1, so adjusted = 6."""
    sim = Sim()
    sim.review('H', 'D1', SPORT, 1, 5)
    sim.review('H', 'D2', SPORT, 1, 5)
    adj, ravg, _ = sim.review('H', 'T', SPORT, 5, 5)
    expect(ravg == 1.0, f"rater avg {ravg} != 1")
    expect(adj == 5.0 + BOOST_CAP, f"harsh boost should cap at +{BOOST_CAP}, got adj {adj}")


@test
def review_credibility_ramp(expect):
    """Credibility scales with DISTINCT players rated: 0,1 -> 0.25 (floor);
    2 -> 0.5; 3 -> 0.75; 4+ -> 1.0. eff_alpha = 0.18 * cred."""
    sim = Sim()
    expected = {0: 0.25, 1: 0.25, 2: 0.5, 3: 0.75, 4: 1.0, 5: 1.0}
    for k in range(6):
        _, _, ea = sim.review('R', f'T{k}', SPORT, 5, 5)
        cred = ea / ALPHA
        expect(abs(cred - expected[k]) < 1e-12,
               f"after {k} distinct ratees cred={cred}, expected {expected[k]}")


@test
def review_credibility_distinct_not_volume(expect):
    """Spamming the SAME target many times does not raise credibility."""
    sim = Sim()
    for _ in range(10):
        _, _, ea = sim.review('F', 'T', SPORT, 9, 5)
    expect(abs(ea - ALPHA * CRED_FLOOR) < 1e-12,
           f"credibility rose from volume alone: eff_alpha={ea}")


@test
def review_peer_converges_with_many_raters(expect):
    """100 distinct fresh raters all score 8: peer EMA converges toward 8."""
    sim = Sim()
    for i in range(100):
        sim.review(f'R{i}', 'T', SPORT, 8, 5)
    peer = sim.get('T', SPORT)['peer']
    expect(peer > 7.8, f"peer {peer} did not converge toward 8")
    expect(peer <= 8.0 + 1e-9, f"peer {peer} overshot the target")


@test
def review_peer_monotonic_in_score(expect):
    """Identical state, higher score -> higher resulting peer."""
    peers = []
    for s in [3, 6, 9]:
        sim = Sim()
        sim.review('R', 'T', SPORT, s, 5)
        peers.append(sim.get('T', SPORT)['peer'])
    expect(peers[0] < peers[1] < peers[2], f"peer not monotonic in score: {peers}")


@test
def review_habitual_rater_normalizes(expect):
    """A rater who ALWAYS gives 8 eventually contributes a neutral 5:
    lifetime avg -> 8, correction -> -3, adjusted -> 5. Bias correction
    makes constant raters informationless by design."""
    sim = Sim()
    for i in range(30):
        sim.review('R', f'D{i}', SPORT, 8, 5)
    adj, _, _ = sim.review('R', 'T', SPORT, 8, 5)
    expect(abs(adj - 5.0) < 1e-9, f"habitual 8-giver should adjust to 5, got {adj}")


@test
def review_sockpuppet_bounded(expect):
    """Sybil attack: one friend (rates ONLY the target) spams 9s twenty times
    on a 5v5 player with elo 4 / peer 2. Inflation must stay bounded:
    peer ends below 4.0 (not anywhere near 9)."""
    sim = Sim()
    seed(sim, ['T'], 4.0, peer=2.0)
    for _ in range(20):
        sim.review('F', 'T', SPORT, 9, 5)
    t = sim.get('T', SPORT)
    expect(t['peer'] < 4.0, f"sock-puppet inflated peer to {t['peer']}")
    expect(t['rating'] < 4.0, f"sock-puppet inflated combined to {t['rating']}")
    FINDINGS.append(f"20x sock-puppet 9s on peer 2.0 -> peer {t['peer']:.3f}, "
                    f"combined {t['rating']:.3f} (bounded)")


# ════════════════════════════════════════════════════════════════
#  C. Combined rating (Elo + reviews together)
# ════════════════════════════════════════════════════════════════

@test
def combined_blend_exact(expect):
    """After a confirmed result, rating == w_elo*elo + (1-w_elo)*peer with
    w_elo(5v5) = 0.8/(1+0.5*ln 5) ≈ 0.4433."""
    sim = Sim()
    H, A, parts = parts5()
    seed(sim, H, 5.0, peer=3.0)
    seed(sim, A, 5.0, peer=7.0)
    sim.confirm(SPORT, 5, parts, 'home')
    for p in ['H0', 'A0']:
        r = sim.get(p, SPORT)
        want = W5 * r['elo'] + (1 - W5) * r['peer']
        expect(abs(r['rating'] - want) < 1e-12,
               f"{p} combined {r['rating']} != blend {want}")


@test
def combined_between_components(expect):
    """Once elo is applied, combined always lies between peer and elo
    (it is a convex blend)."""
    sim = Sim()
    H, A, parts = parts5()
    rng = random.Random(3)
    for p in H + A:
        sim.row(p, SPORT).update(elo=rng.uniform(1, 10), peer=rng.uniform(1, 10),
                                 elo_applied=True)
    sim.confirm(SPORT, 5, parts, 'home')
    for p in H + A:
        r = sim.get(p, SPORT)
        lo, hi = sorted([r['peer'], r['elo']])
        expect(lo - 1e-9 <= r['rating'] <= hi + 1e-9,
               f"{p} combined {r['rating']} outside [{lo}, {hi}]")


@test
def combined_reviews_only_until_first_result(expect):
    """Before any confirmed result the displayed rating IS the peer rating
    (elo untouched, elo_applied false). The first confirmation blends elo in."""
    sim = Sim()
    H, A, parts = parts5()
    for i in range(5):
        sim.review(f'R{i}', 'H0', SPORT, 8, 5)
    r = sim.get('H0', SPORT)
    expect(r['rating'] == r['peer'], "rating must equal peer before first result")
    expect(r['elo'] == BASE and not r['elo_applied'], "elo must be untouched before result")
    before = r['rating']
    sim.confirm(SPORT, 5, parts, 'home')
    r = sim.get('H0', SPORT)
    expect(r['elo_applied'], "elo_applied must flip on first confirm")
    expect(r['rating'] < before, "elo (still ~2) should pull a review-built 3+ rating down")


@test
def combined_star_on_losing_team(expect):
    """8 straight 5v5 losses; opponents rate the star (A0) 9 and a rotating
    teammate 4 each match (varied scores keep the raters' bias correction
    informative — a rater who only ever gives one constant score is
    deliberately normalized to neutral). All away elos are equal (team
    delta), yet the star's combined must end clearly above the teammates'."""
    sim = Sim()
    H, A, parts = parts5()
    for m in range(8):
        for i, h in enumerate(H):
            sim.review(h, 'A0', SPORT, 9, 5)
            sim.review(h, f'A{1 + (m + i) % 4}', SPORT, 4, 5)
        sim.confirm(SPORT, 5, parts, 'home')
    star, mate = sim.get('A0', SPORT), sim.get('A1', SPORT)
    expect(abs(star['elo'] - mate['elo']) < 1e-9, "teammates must share elo")
    expect(star['rating'] > mate['rating'] + 1.0,
           f"star combined {star['rating']:.3f} not above teammate {mate['rating']:.3f}")
    FINDINGS.append(f"star on 8-loss team: combined {star['rating']:.3f} vs "
                    f"teammate {mate['rating']:.3f} (same elo {star['elo']:.3f})")


@test
def combined_abandoned_counts_but_no_rating_change(expect):
    """Abandoned (disputed, unresolved) match: total_matches increments for
    the display gate, but elo / peer / rating stay untouched."""
    sim = Sim()
    H, A, parts = parts5()
    seed(sim, H + A, 4.0, peer=5.0)
    before = {p: dict(sim.get(p, SPORT)) for p in H + A}
    sim.abandon(SPORT, parts)
    for p in H + A:
        r = sim.get(p, SPORT)
        expect(r['total_matches'] == before[p]['total_matches'] + 1,
               f"{p} total_matches not incremented on abandon")
        for k in ('rating', 'peer', 'elo', 'wins'):
            expect(r[k] == before[p][k], f"{p} {k} changed on abandoned match")


@test
def combined_display_gate_mixed(expect):
    """Display gate counts confirmed AND abandoned matches: 3 confirmed +
    2 abandoned = total_matches 5."""
    sim = Sim()
    _, _, parts = parts5()
    for _ in range(3):
        sim.confirm(SPORT, 5, parts, 'home')
    for _ in range(2):
        sim.abandon(SPORT, parts)
    expect(sim.get('H0', SPORT)['total_matches'] == 5,
           f"gate count {sim.get('H0', SPORT)['total_matches']} != 5")


@test
def combined_draws_dont_count_as_wins(expect):
    """Draws increment total_matches but never wins."""
    sim = Sim()
    _, _, parts = parts5()
    for w in ['draw', 'home', 'draw']:
        sim.confirm(SPORT, 5, parts, w)
    r = sim.get('H0', SPORT)
    expect(r['total_matches'] == 3 and r['wins'] == 1,
           f"mt={r['total_matches']} wins={r['wins']}, expected 3/1")


@test
def combined_team_size_weight_quirk(expect):
    """KNOWN QUIRK (documented, not a failure): w_elo depends on the team
    size of the LAST event that recomputed the rating. Same elo=7/peer=3
    gives combined 6.20 after a 1v1 review but 4.80 after a 5v5 review."""
    sim = Sim()
    sim.row('P', SPORT).update(elo=7.0, peer=3.0, elo_applied=True)
    sim.review('Z', 'P', SPORT, 3, 1)
    r1 = sim.get('P', SPORT)['rating']
    sim.row('P', SPORT).update(peer=3.0)
    sim.review('Z', 'P', SPORT, 3, 5)
    r5 = sim.get('P', SPORT)['rating']
    expect(abs(r1 - r5) > 0.5, "quirk vanished — team-size weight now stable? "
                               "update this test if intentional")
    FINDINGS.append(f"team-size quirk: same elo/peer -> combined {r1:.3f} (1v1) "
                    f"vs {r5:.3f} (5v5); displayed rating depends on last match size")


@test
def combined_no_nan_no_escape_long_season(expect):
    """Stress: 200 random 5v5 matches with random reviews. Every value must
    stay in [1,10] with no NaN/inf."""
    sim = Sim()
    H, A, parts = parts5()
    rng = random.Random(99)
    for m in range(200):
        for p in H:
            sim.review(p, rng.choice(A), SPORT, rng.randint(1, 10), 5)
        for p in A:
            sim.review(p, rng.choice(H), SPORT, rng.randint(1, 10), 5)
        sim.confirm(SPORT, 5, parts, rng.choices(['home', 'away', 'draw'], [45, 45, 10])[0])
    for p in H + A:
        r = sim.get(p, SPORT)
        for k in ('rating', 'peer', 'elo'):
            expect(math.isfinite(r[k]), f"{p} {k} is not finite")
            expect(1.0 <= r[k] <= 10.0, f"{p} {k}={r[k]} escaped [1,10]")
    elos = [sim.get(p, SPORT)['elo'] for p in H + A]
    FINDINGS.append(f"200-match stress: elo range [{min(elos):.2f}, {max(elos):.2f}], "
                    f"mean {sum(elos)/len(elos):.2f}")


# ════════════════════════════════════════════════════════════════
#  D. Review assignment + full pipeline
# ════════════════════════════════════════════════════════════════

@test
def assignment_validity(expect):
    """For 1v1..8v8 and unbalanced 5v4: nobody reviews themselves, no
    duplicate targets, teammates/opponents land on the correct side."""
    rosters = [_make_match(ts) for ts in (1, 2, 3, 5, 6, 8)]
    lop = ([{'player_id': f'H{i}', 'team_id': 'home', 'status': 'confirmed'} for i in range(5)] +
           [{'player_id': f'A{i}', 'team_id': 'away', 'status': 'confirmed'} for i in range(4)])
    rosters.append(lop)
    for parts in rosters:
        for p in parts:
            at, ao = get_review_assignment(parts, p['player_id'], p['team_id'], 'match-x')
            ids = [x['player_id'] for x in at + ao]
            expect(p['player_id'] not in ids, f"{p['player_id']} assigned to review self")
            expect(len(ids) == len(set(ids)), f"{p['player_id']} has duplicate targets")
            expect(all(x['team_id'] == p['team_id'] for x in at), "teammate list crossed sides")
            expect(all(x['team_id'] != p['team_id'] for x in ao), "opponent list crossed sides")


@test
def pipeline_full_season_5v5(expect):
    """End-to-end: 20 5v5 matches. Each match, the seeded review assignment
    decides who reviews whom (2 teammates + 2 opponents each); raters score
    the target's hidden quality; the favorite wins per expected score.
    Checks: every player gives and receives exactly 4 reviews per match,
    all values stay in range, and final peer ordering reflects quality."""
    sim = Sim()
    parts = _make_match(5)
    plist = [(p['player_id'], 'home' if p['team_id'] == 'home' else 'away') for p in parts]
    quality = {'H0': 3, 'H1': 4, 'H2': 5, 'H3': 6, 'H4': 7,
               'A0': 3, 'A1': 4, 'A2': 5, 'A3': 6, 'A4': 7}
    rng = random.Random(42)
    for m in range(20):
        mid = f'season-match-{m}'
        recv = {p['player_id']: 0 for p in parts}
        for p in parts:
            at, ao = get_review_assignment(parts, p['player_id'], p['team_id'], mid)
            targets = [x['player_id'] for x in at + ao]
            expect(len(targets) == 4, f"{p['player_id']} gives {len(targets)} != 4")
            for t in targets:
                sim.review(p['player_id'], t, SPORT, quality[t], 5)
                recv[t] += 1
        expect(min(recv.values()) == max(recv.values()) == 4,
               f"match {m}: received counts unbalanced {sorted(recv.values())}")
        h_avg = sum(sim.get(f'H{i}', SPORT)['elo'] for i in range(5)) / 5
        a_avg = sum(sim.get(f'A{i}', SPORT)['elo'] for i in range(5)) / 5
        E = 1.0 / (1.0 + 10 ** ((a_avg - h_avg) / ELO_DIV))
        sim.confirm(SPORT, 5, plist, 'home' if rng.random() < E else 'away')
    for p, _ in plist:
        r = sim.get(p, SPORT)
        expect(r['total_matches'] == 20, f"{p} total_matches {r['total_matches']} != 20")
        for k in ('rating', 'peer', 'elo'):
            expect(1.0 <= r[k] <= 10.0, f"{p} {k}={r[k]} out of range")
    expect(sim.get('H4', SPORT)['peer'] > sim.get('H0', SPORT)['peer'],
           "quality-7 player's peer should beat quality-3 teammate's")
    expect(sim.get('A4', SPORT)['rating'] > sim.get('A0', SPORT)['rating'],
           "quality-7 player's combined should beat quality-3 teammate's")
    FINDINGS.append("20-match season, H-team finals: " + ", ".join(
        f"{p}(q{quality[p]})={sim.get(p, SPORT)['rating']:.2f}" for p in
        ['H0', 'H1', 'H2', 'H3', 'H4']))


# ════════════════════════════════════════════════════════════════
#  Runner
# ════════════════════════════════════════════════════════════════

def main():
    # Windows consoles often default to cp1252, which chokes on ≈ / ✗ / •
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    passed, failed = 0, 0
    for fn in TESTS:
        errs = []

        def expect(cond, msg):
            if not cond:
                errs.append(msg)
            return cond

        try:
            fn(expect)
        except Exception as e:                       # noqa: BLE001
            errs.append(f"exception: {e!r}")
        doc = (fn.__doc__ or '').strip().splitlines()[0]
        if errs:
            failed += 1
            print(f"FAIL  {fn.__name__} — {doc}")
            for e in errs:
                print(f"      ✗ {e}")
        else:
            passed += 1
            print(f"ok    {fn.__name__} — {doc}")

    print("\n" + "=" * 64)
    print(f"{passed} passed, {failed} failed (of {len(TESTS)})")
    if FINDINGS:
        print("\nObservations (informational, not failures):")
        for f in FINDINGS:
            print(f"  • {f}")
    print("=" * 64)
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
