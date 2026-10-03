"""
Worked example: one 5v5 mini-football match, reviews arriving at
different times. Every number is produced by the trigger-faithful
simulator (rating_sim.py), so this is exactly what the deployed SQL does.

    python web/supabase/example_5v5_walkthrough.py

Scenario:
  HOME  Alex, Bilal, Chris, Dario, Elias     (win 5-3)
  AWAY  Felix, Goran, Hugo, Ivan, Jonas
  All ten players are brand new: elo 2.0, peer 2.0, 0 reviews.
  We follow DARIO in detail; he receives 4 reviews (2 teammates,
  2 opponents) spread across the 7-day review window.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rating_sim import Sim, ALPHA, CRED_FULL, CRED_FLOOR, BOOST_CAP, w_peer_for

SPORT = 'mini_football_5v5'
HOME = ['Alex', 'Bilal', 'Chris', 'Dario', 'Elias']
AWAY = ['Felix', 'Goran', 'Hugo', 'Ivan', 'Jonas']
PARTS = [(p, 'home') for p in HOME] + [(p, 'away') for p in AWAY]

sim = Sim()


def rater_stats(rater):
    prior = [x['score'] for x in sim.ratings if x['rater'] == rater]
    distinct = len({x['rated'] for x in sim.ratings if x['rater'] == rater})
    avg = sum(prior) / len(prior) if prior else None
    return avg, distinct


def review(when, rater, rated, score, detail=True):
    avg, distinct = rater_stats(rater)
    peer_old = sim.row(rated, SPORT)['peer']
    adj, _, eff_a = sim.review(rater, rated, SPORT, score, 5)
    r = sim.get(rated, SPORT)
    if not detail:
        print(f"{when}  {rater} -> {rated}: {score}   (peer {peer_old:.3f} -> {r['peer']:.3f})")
        return
    print(f"\n{when}  {rater} reviews {rated}: score {score}")
    if avg is None:
        print(f"   correction : rater has no history -> adjusted = {adj:.3f}")
    else:
        corr = 5.0 - avg
        capped = ' (capped at +1)' if corr > BOOST_CAP else ''
        print(f"   correction : 5 - {avg:.3f} (rater avg) = {corr:+.3f}{capped} -> adjusted = {adj:.3f}")
    cred = max(CRED_FLOOR, min(1.0, distinct / CRED_FULL))
    print(f"   credibility: {distinct} distinct ratees -> cred {cred:.2f} -> pull a = {ALPHA} x {cred:.2f} = {eff_a:.3f}")
    print(f"   peer       : (1-{eff_a:.3f}) x {peer_old:.3f} + {eff_a:.3f} x {adj:.3f} = {r['peer']:.3f}")
    n = r['rating_count']
    w = w_peer_for(n)
    if r['elo_applied']:
        print(f"   blend      : n={n} reviews -> w = min(0.6, {n}/{n+4}) = {w:.3f}")
        print(f"   RATING     : (1-{w:.3f}) x {r['elo']:.3f} (elo) + {w:.3f} x {r['peer']:.3f} (peer) = {r['rating']:.3f}")
    else:
        print(f"   blend      : no confirmed result yet -> RATING = peer = {r['rating']:.3f}")


def fmt(p):
    r = sim.get(p, SPORT)
    n = r['rating_count']
    return (f"{p:6}  elo {r['elo']:.3f}  peer {r['peer']:.3f}  n={n}  "
            f"w={w_peer_for(n):.3f}  rating {r['rating']:.3f}")


print("=" * 70)
print("MONDAY 21:30 - match ends, home won 5-3. Everyone: elo 2.0, peer 2.0")
print("=" * 70)

review("MON 22:00", 'Goran', 'Dario', 7)

review("TUE 08:30", 'Bilal', 'Alex', 6, detail=False)
review("TUE 08:32", 'Bilal', 'Felix', 5, detail=False)

print("\nTUE 09:00  away team accepts the result -> ELO APPLIES (once, for all)")
deltas, Eh, Ea = sim.confirm(SPORT, 5, PARTS, 'home')
print(f"   expected  : E_home = 1/(1+10^((2.0-2.0)/3)) = {Eh:.3f}  (equal teams)")
print(f"   K-factor  : 0.8/sqrt(5) = {0.8 / 5 ** 0.5:.4f}")
print(f"   home elo  : 2.0 + {0.8 / 5 ** 0.5:.4f} x (1 - {Eh:.1f}) = {sim.get('Alex', SPORT)['elo']:.3f}")
print(f"   away elo  : 2.0 + {0.8 / 5 ** 0.5:.4f} x (0 - {Ea:.1f}) = {sim.get('Felix', SPORT)['elo']:.3f}")
d = sim.get('Dario', SPORT)
print(f"   Dario     : n=1 -> w = {w_peer_for(1):.1f} -> rating = 0.8 x {d['elo']:.3f} + 0.2 x {d['peer']:.3f} = {d['rating']:.3f}")
f = sim.get('Felix', SPORT)
print(f"   Felix     : n=1 -> w = {w_peer_for(1):.1f} -> rating = 0.8 x {f['elo']:.3f} + 0.2 x {f['peer']:.3f} = {f['rating']:.3f}")
i = sim.get('Ivan', SPORT)
print(f"   Ivan      : n=0 -> w = 0   -> rating = elo = {i['rating']:.3f}  (nobody reviewed him yet)")

review("TUE 18:00", 'Bilal', 'Dario', 8)

review("WED 12:00", 'Ivan', 'Goran', 4, detail=False)
review("WED 12:01", 'Ivan', 'Jonas', 5, detail=False)
review("WED 12:03", 'Ivan', 'Alex', 4, detail=False)

review("THU 14:00", 'Ivan', 'Dario', 6)

review("FRI 19:00", 'Elias', 'Bilal', 8, detail=False)
review("FRI 19:02", 'Elias', 'Goran', 9, detail=False)
review("FRI 19:03", 'Elias', 'Hugo', 9, detail=False)

review("SAT 11:00", 'Elias', 'Dario', 9)

print("\nMON+8d     Hugo opens the rate page -> REJECTED: review window")
print("           closed 7 days after match start (enforce_review_deadline)")

print("\n" + "=" * 70)
print("FINAL STATE (rating = (1-w) x elo + w x peer,  w = min(0.6, n/(n+4)))")
print("=" * 70)
for p in HOME + AWAY:
    print("  " + fmt(p))

print("\nDario's journey: 2.000 (start) -> 2.225 (1st review, no elo yet)")
print("-> result confirmed -> blends -> three more reviews, each moving")
print("peer one EMA step and re-mixing the displayed rating. Elo was")
print("written exactly once (TUE 09:00) and never changed afterwards.")
