"""
Rating-system simulator — faithful port of the two Postgres triggers:
  • update_player_rating   (peer EMA + capped bias correction + credibility weight)
  • update_elo_rating      (team-vs-team Elo on confirmed result)

Purpose: run many scenarios (1v1 and 5v5, Elo + reviews together), check
mathematical invariants, and surface anything wrong with the calculation.

This MIRRORS the SQL in rating_weight_by_reviews.sql (which supersedes the
blend weight in rating_hardening.sql / elo_trigger_fix.sql). If you change
the SQL, change this too (or trust the SQL harness test_combined.sql).

Run:  python web/supabase/rating_sim.py
"""

import math

# ── tunables (must match the SQL constants) ──
ALPHA      = 0.18
BOOST_CAP  = 1.0
CRED_FULL  = 4
CRED_FLOOR = 0.25
ELO_DIV    = 3.0          # divisor in the expected-score formula
BASE       = 2.0          # starting rating
W_PEER_CAP = 0.6          # max review weight in the combined blend
W_HALF     = 4.0          # reviews received for a 50/50 blend


def w_peer_for(count):
    """Review-side blend weight from reviews RECEIVED (per sport)."""
    return min(W_PEER_CAP, count / (count + W_HALF))


def clamp(x, lo=1.0, hi=10.0):
    return max(lo, min(hi, x))


class Sim:
    def __init__(self):
        # (player, sport) -> dict
        self.pr = {}
        # list of dicts: rater, rated, sport, score
        self.ratings = []

    def row(self, player, sport):
        key = (player, sport)
        if key not in self.pr:
            self.pr[key] = dict(rating=BASE, peer=BASE, elo=BASE,
                                elo_applied=False, rating_count=0,
                                total_matches=0, wins=0)
        return self.pr[key]

    # ── update_player_rating (peer trigger), hardened ──
    # team_size is accepted for call-site compatibility but no longer
    # affects the blend — the weight comes from reviews received.
    def review(self, rater, rated, sport, score, team_size=None):
        r = self.row(rated, sport)
        peer_old, elo_old, elo_applied = r['peer'], r['elo'], r['elo_applied']

        # rater lifetime avg, EXCLUDING current row, across ALL sports (matches SQL)
        prior = [x['score'] for x in self.ratings if x['rater'] == rater]
        rater_avg = sum(prior) / len(prior) if prior else None

        if rater_avg is None:
            adj = score
        else:
            corr = 5.0 - rater_avg
            if corr > BOOST_CAP:          # cap ONLY upward boost
                corr = BOOST_CAP
            adj = clamp(score + corr)

        # distinct players rated before, across ALL sports (matches SQL)
        distinct = len({x['rated'] for x in self.ratings if x['rater'] == rater})
        cred = clamp(distinct / CRED_FULL, CRED_FLOOR, 1.0)
        eff_alpha = ALPHA * cred

        peer_new = clamp((1.0 - eff_alpha) * peer_old + eff_alpha * adj)

        if elo_applied:
            w_peer = w_peer_for(r['rating_count'] + 1)   # incl. this review
            combined = clamp((1.0 - w_peer) * elo_old + w_peer * peer_new)
        else:
            combined = peer_new

        r['peer'] = peer_new
        r['rating'] = combined
        r['rating_count'] += 1
        self.ratings.append(dict(rater=rater, rated=rated, sport=sport, score=score))
        return adj, rater_avg, eff_alpha

    # ── update_elo_rating (Elo trigger) on confirmed ──
    def confirm(self, sport, team_size, participants, winner):
        # participants: list of (player, side)  side in {'home','away'}
        K = 0.8 / math.sqrt(max(team_size, 1))

        home = [p for p, s in participants if s == 'home']
        away = [p for p, s in participants if s == 'away']
        home_avg = sum(self.row(p, sport)['elo'] for p in home) / len(home) if home else BASE
        away_avg = sum(self.row(p, sport)['elo'] for p in away) / len(away) if away else BASE

        E_home = 1.0 / (1.0 + 10 ** ((away_avg - home_avg) / ELO_DIV))
        E_away = 1.0 - E_home

        deltas = []
        for p, side in participants:
            r = self.row(p, sport)
            elo_old, peer_old = r['elo'], r['peer']
            if side == 'home':
                E = E_home
                S = 1.0 if winner == 'home' else (0.0 if winner == 'away' else 0.5)
            else:
                E = E_away
                S = 1.0 if winner == 'away' else (0.0 if winner == 'home' else 0.5)
            elo_new = clamp(elo_old + K * (S - E))
            w_peer = w_peer_for(r['rating_count'])       # per-player weight
            combined = clamp((1.0 - w_peer) * elo_new + w_peer * peer_old)
            deltas.append(elo_new - elo_old)
            r['elo'] = elo_new
            r['rating'] = combined
            r['elo_applied'] = True
            r['total_matches'] += 1
            if S == 1.0:
                r['wins'] += 1
        return deltas, E_home, E_away

    def abandon(self, sport, participants):
        for p, _ in participants:
            self.row(p, sport)['total_matches'] += 1

    def get(self, player, sport):
        return self.row(player, sport)


# ════════════════════════════════════════════════════════════════
#  Invariant checks
# ════════════════════════════════════════════════════════════════
PROBLEMS = []

def check(cond, msg):
    if not cond:
        PROBLEMS.append(msg)
    return cond


def all_in_range(sim):
    for (p, s), r in sim.pr.items():
        for k in ('rating', 'peer', 'elo'):
            check(1.0 - 1e-9 <= r[k] <= 10.0 + 1e-9,
                  f"{p}/{s} {k}={r[k]} out of [1,10]")


def fmt(r):
    return f"rating={r['rating']:.3f} peer={r['peer']:.3f} elo={r['elo']:.3f} mt={r['total_matches']} w={r['wins']}"


# ════════════════════════════════════════════════════════════════
#  Scenarios
# ════════════════════════════════════════════════════════════════
def sc_1v1_combined():
    print("\n=== Scenario 1: 1v1, Elo + honest reviews together (6 matches) ===")
    sim = Sim()
    sport, ts = 'football', 1
    # A=home, B=away. Both rate each other an honest 5 each match.
    seq = ['home', 'away', 'draw', 'home', 'away', 'draw']
    for i, w in enumerate(seq, 1):
        parts = [('A', 'home'), ('B', 'away')]
        sim.review('A', 'B', sport, 5, ts)
        sim.review('B', 'A', sport, 5, ts)
        sim.confirm(sport, ts, parts, w)
        a, b = sim.get('A', sport), sim.get('B', sport)
        print(f" M{i} {w:5} | A {fmt(a)} | B {fmt(b)}")
    all_in_range(sim)


def sc_5v5_single():
    print("\n=== Scenario 2: 5v5 single match, mixed individual Elos ===")
    sim = Sim()
    sport, ts = 'football', 5
    # Team H avg 4 (elos 2,3,4,5,6), Team A all 2. Seed elos.
    H = ['H1', 'H2', 'H3', 'H4', 'H5']
    A = ['A1', 'A2', 'A3', 'A4', 'A5']
    for p, e in zip(H, [2, 3, 4, 5, 6]):
        sim.row(p, sport).update(elo=e, peer=e, rating=e, elo_applied=True)
    for p in A:
        sim.row(p, sport).update(elo=2, peer=2, rating=2, elo_applied=True)
    parts = [(p, 'home') for p in H] + [(p, 'away') for p in A]
    deltas, Eh, Ea = sim.confirm(sport, ts, parts, 'home')  # home wins
    print(f" E_home={Eh:.4f} E_away={Ea:.4f}  K={0.8/math.sqrt(5):.4f}")
    for p in H:
        print(f"  {p} -> {fmt(sim.get(p, sport))}")
    for p in A:
        print(f"  {p} -> {fmt(sim.get(p, sport))}")
    # conservation: equal team sizes, mid-range => sum of deltas ~ 0
    s = sum(deltas)
    print(f" sum(elo deltas) = {s:.2e}  (should be ~0 for equal teams, no clamp)")
    check(abs(s) < 1e-9, f"5v5 Elo not conserved: sum delta = {s}")
    # all home players got the SAME delta regardless of individual elo?
    home_deltas = deltas[:5]
    same = max(home_deltas) - min(home_deltas)
    print(f" home delta spread = {same:.2e}  (team-vs-team => identical per teammate)")
    all_in_range(sim)


def sc_5v5_many():
    print("\n=== Scenario 3: 5v5, 10 matches, reviews every match, stomp pattern ===")
    sim = Sim()
    sport, ts = 'football', 5
    H = ['H1', 'H2', 'H3', 'H4', 'H5']
    A = ['A1', 'A2', 'A3', 'A4', 'A5']
    parts = [(p, 'home') for p in H] + [(p, 'away') for p in A]
    import random
    random.seed(7)
    for i in range(1, 11):
        # everyone rates one opponent honestly ~ their current rating
        for hp in H:
            ap = random.choice(A)
            sim.review(hp, ap, sport, 6, ts)
        for ap in A:
            hp = random.choice(H)
            sim.review(ap, hp, sport, 6, ts)
        sim.confirm(sport, ts, parts, 'home')  # home always wins
    print(f" After 10 home wins:")
    print(f"  H1 -> {fmt(sim.get('H1', sport))}")
    print(f"  A1 -> {fmt(sim.get('A1', sport))}")
    all_in_range(sim)


def sc_weight_stability():
    print("\n=== Scenario 4: blend weight from reviews RECEIVED, not team size ===")
    sim = Sim()
    sport = 'football'
    # Force a player to elo=7, peer=3 with elo applied
    sim.row('P', sport).update(elo=7.0, peer=3.0, elo_applied=True, rating=0)
    # A review in a 1v1 (team_size 1)
    sim.review('Z1', 'P', sport, 3, 1)   # Z1 gives a 3, peer stays ~3
    r1 = sim.get('P', sport)['rating']
    # reset to the identical state, then the same review in a 5v5
    # (fresh rater so the rater-bias correction is identical too)
    sim.row('P', sport).update(peer=3.0, rating_count=0)
    sim.review('Z2', 'P', sport, 3, 5)
    r5 = sim.get('P', sport)['rating']
    print(f"  combined after 1v1 review: {r1:.3f}")
    print(f"  combined after 5v5 review: {r5:.3f}")
    print(f"  identical state => identical rating (diff {abs(r1 - r5):.1e}); "
          f"team size no longer matters")
    print("  weight ramp: " + "  ".join(
        f"n={n}->w_peer={w_peer_for(n):.2f}" for n in [0, 1, 2, 4, 6, 10]))
    check(abs(r1 - r5) < 1e-12, "blend weight still depends on team size")


def sc_total_matches_gate():
    print("\n=== Scenario 5: reviews but NO confirmed result => total_matches stays 0 ===")
    sim = Sim()
    sport, ts = 'football', 1
    for _ in range(8):
        sim.review('R', 'T', sport, 7, ts)   # T reviewed 8 times, no results
    t = sim.get('T', sport)
    print(f"  T after 8 reviews: {fmt(t)}  rating_count={t['rating_count']}")
    print(f"  -> total_matches={t['total_matches']} (display gate needs >=5)")


def sc_sockpuppet_with_elo():
    print("\n=== Scenario 6: sock-puppet inflation WITH elo applied (1v1) ===")
    sim = Sim()
    sport, ts = 'football', 1
    # T has some elo history first
    sim.row('T', sport).update(elo=4.0, peer=2.0, elo_applied=True, rating=0)
    for i, s in enumerate([4, 4, 9, 9, 9, 9], 1):
        adj, ravg, ea = sim.review('F', 'T', sport, s, ts)
        t = sim.get('T', sport)
        print(f"  rev{i} score={s} adj={adj:.3f} eff_a={ea:.3f} -> peer={t['peer']:.3f} rating={t['rating']:.3f}")
    all_in_range(sim)


# ════════════════════════════════════════════════════════════════
#  Review assignment — faithful port of web/lib/reviewAssignment.ts
#  (xmur3 hash + mulberry32 PRNG + seeded shuffle + circular pick)
# ════════════════════════════════════════════════════════════════
MASK = 0xFFFFFFFF
MAX_PER_SIDE = 2


def _i32(x):
    x &= MASK
    return x - 0x100000000 if x & 0x80000000 else x


def _u32(x):
    return x & MASK


def _imul(a, b):
    return _i32((_u32(a) * _u32(b)) & MASK)


def _js_round(x):
    # JS Math.round rounds halves toward +inf (Python's round() is banker's)
    return math.floor(x + 0.5)


def _hash_string(s):
    h = _i32(1779033703 ^ len(s))
    for ch in s:
        h = _imul(_i32(h ^ ord(ch)), 3432918353)
        h = _i32(((_u32(h) << 13) & MASK) | (_u32(h) >> 19))
    return _u32(_i32(h ^ (_u32(h) >> 16)))


def _mulberry32(seed):
    a = _i32(seed)

    def rng():
        nonlocal a
        a = _i32(a + 0x6D2B79F5)
        t = _imul(_i32(_u32(a) ^ (_u32(a) >> 15)), _i32(1 | _u32(a)))
        t = _i32(_i32(t + _imul(_i32(_u32(t) ^ (_u32(t) >> 7)), _i32(61 | _u32(t)))) ^ t)
        return _u32(_i32(t ^ (_u32(t) >> 14))) / 4294967296.0

    return rng


def _seeded_shuffle(arr, seed):
    rng = _mulberry32(_hash_string(seed))
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = int(rng() * (i + 1))  # Math.floor
        a[i], a[j] = a[j], a[i]
    return a


def review_side_count(available):
    if available <= 0:
        return 0
    return min(MAX_PER_SIDE, _js_round(available / 2))


def get_review_assignment(participants, my_id, my_team_id, match_id):
    confirmed = [p for p in participants if p['status'] == 'confirmed']
    my_team_all = _seeded_shuffle(
        sorted((p for p in confirmed if p['team_id'] == my_team_id), key=lambda p: p['player_id']),
        match_id + ':team')
    opp_all = _seeded_shuffle(
        sorted((p for p in confirmed if p['team_id'] != my_team_id), key=lambda p: p['player_id']),
        match_id + ':opp')
    n, m = len(my_team_all), len(opp_all)
    my_pos = next((i for i, p in enumerate(my_team_all) if p['player_id'] == my_id), 0)
    k_team = review_side_count(n - 1)
    k_opp = review_side_count(m)

    assigned_team, step = [], 1
    while len(assigned_team) < k_team and step < n:
        assigned_team.append(my_team_all[(my_pos + step) % n]); step += 1
    assigned_opp, step = [], 0
    while len(assigned_opp) < k_opp and step < m:
        assigned_opp.append(opp_all[(my_pos + step) % m]); step += 1
    return assigned_team, assigned_opp


def _make_match(ts):
    home = [{'player_id': f'H{i}', 'team_id': 'home', 'status': 'confirmed'} for i in range(ts)]
    away = [{'player_id': f'A{i}', 'team_id': 'away', 'status': 'confirmed'} for i in range(ts)]
    return home + away


def _assignment_edges(parts, match_id):
    edges = {}
    for p in parts:
        at, ao = get_review_assignment(parts, p['player_id'], p['team_id'], match_id)
        edges[p['player_id']] = [x['player_id'] for x in at] + [x['player_id'] for x in ao]
    return edges


def sc_review_balance():
    print("\n=== Scenario 7: review assignment — balanced across team sizes ===")
    for ts in [1, 2, 3, 5, 6, 8]:
        parts = _make_match(ts)
        edges = _assignment_edges(parts, 'match-abc-123')
        given = {p: len(v) for p, v in edges.items()}
        recv = {p['player_id']: 0 for p in parts}
        for vs in edges.values():
            for t in vs:
                recv[t] += 1
        gv, rv = list(given.values()), list(recv.values())
        print(f"  {ts}v{ts}: gives=[{min(gv)}..{max(gv)}]  receives=[{min(rv)}..{max(rv)}]")
        # equal teams => every player must receive an identical count
        check(min(rv) == max(rv), f"{ts}v{ts}: received not balanced [{min(rv)}..{max(rv)}]")
        check(min(gv) == max(gv), f"{ts}v{ts}: given not balanced [{min(gv)}..{max(gv)}]")

    # concrete sample table (compare to the hand-built example)
    parts = _make_match(5)
    edges = _assignment_edges(parts, 'match-abc-123')
    print("  sample 5v5 assignment (match-abc-123):")
    for p in parts:
        print(f"    {p['player_id']} -> {', '.join(edges[p['player_id']])}")


def sc_review_random():
    print("\n=== Scenario 8: review assignment — random per match, still balanced ===")
    parts = _make_match(5)
    seen = set()
    for mid in ['m1', 'm2', 'm3', 'm4', 'm5']:
        edges = _assignment_edges(parts, mid)
        sig = tuple(sorted((r, tuple(sorted(vs))) for r, vs in edges.items()))
        seen.add(sig)
        recv = {p['player_id']: 0 for p in parts}
        for vs in edges.values():
            for t in vs:
                recv[t] += 1
        rv = list(recv.values())
        status = 'balanced' if min(rv) == max(rv) else f'UNBALANCED[{min(rv)}..{max(rv)}]'
        print(f"  {mid}: {status}  (received {min(rv)} each)")
        check(min(rv) == max(rv), f"{mid}: 5v5 received not balanced")
    print(f"  distinct assignments across 5 match ids: {len(seen)}  (random => > 1)")
    check(len(seen) > 1, "assignment identical across all match ids — not random")


if __name__ == '__main__':
    import sys
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sc_1v1_combined()
    sc_5v5_single()
    sc_5v5_many()
    sc_weight_stability()
    sc_total_matches_gate()
    sc_sockpuppet_with_elo()
    sc_review_balance()
    sc_review_random()

    print("\n" + "=" * 60)
    if PROBLEMS:
        print(f"INVARIANT FAILURES ({len(PROBLEMS)}):")
        for p in PROBLEMS:
            print("  ✗ " + p)
    else:
        print("All invariant checks passed (clamping, Elo conservation).")
    print("=" * 60)
