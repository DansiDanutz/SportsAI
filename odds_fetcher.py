#!/usr/bin/env python3
"""
Real Odds Fetcher — Uses football-data.co.uk fixtures.csv (FREE, no API key needed)
Provides real bookmaker odds from Bet365, Betfair, Betway, Pinnacle, etc.
"""

import csv
import json
import io
import urllib.request
from datetime import datetime, timedelta

FIXTURES_URL = "https://www.football-data.co.uk/fixtures.csv"
RESULTS_URLS = {
    "EPL": "https://www.football-data.co.uk/mmz4281/2526/E0.csv",
    "La Liga": "https://www.football-data.co.uk/mmz4281/2526/SP1.csv",
    "Serie A": "https://www.football-data.co.uk/mmz4281/2526/I1.csv",
    "Bundesliga": "https://www.football-data.co.uk/mmz4281/2526/D1.csv",
    "Ligue 1": "https://www.football-data.co.uk/mmz4281/2526/F1.csv",
}

LEAGUE_NAMES = {
    "E0": "EPL", "E1": "Championship", "E2": "League 1", "E3": "League 2",
    "SP1": "La Liga", "SP2": "La Liga 2",
    "I1": "Serie A", "I2": "Serie B",
    "D1": "Bundesliga", "D2": "Bundesliga 2",
    "F1": "Ligue 1", "F2": "Ligue 2",
    "N1": "Eredivisie", "B1": "Jupiler League",
    "P1": "Liga Portugal", "T1": "Super Lig",
    "G1": "Super League Greece", "SC0": "Scottish Premiership",
}

TOP_LEAGUES = {"E0", "SP1", "I1", "D1", "F1"}


def fetch_csv(url):
    """Fetch CSV from URL and return list of dicts."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        text = resp.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


def get_upcoming_fixtures(top_leagues_only=True, days_ahead=7):
    """Get upcoming fixtures with real bookmaker odds."""
    rows = fetch_csv(FIXTURES_URL)
    fixtures = []
    cutoff = datetime.now() + timedelta(days=days_ahead)

    for r in rows:
        div = r.get("Div", "")
        if top_leagues_only and div not in TOP_LEAGUES:
            continue

        date_str = r.get("Date", "")
        time_str = r.get("Time", "00:00")
        try:
            dt = datetime.strptime(f"{date_str} {time_str}", "%d/%m/%Y %H:%M")
        except ValueError:
            continue

        if dt > cutoff:
            continue

        def safe_float(val):
            try:
                return float(val)
            except (ValueError, TypeError):
                return None

        fixture = {
            "league": LEAGUE_NAMES.get(div, div),
            "league_code": div,
            "date": dt.strftime("%Y-%m-%d"),
            "time": time_str,
            "datetime": dt.isoformat(),
            "home": r.get("HomeTeam", ""),
            "away": r.get("AwayTeam", ""),
            "odds": {
                "bet365": {"home": safe_float(r.get("B365H")), "draw": safe_float(r.get("B365D")), "away": safe_float(r.get("B365A"))},
                "betfair": {"home": safe_float(r.get("BFDH")), "draw": safe_float(r.get("BFDD")), "away": safe_float(r.get("BFDA"))},
                "betway": {"home": safe_float(r.get("BWH")), "draw": safe_float(r.get("BWD")), "away": safe_float(r.get("BWA"))},
                "pinnacle": {"home": safe_float(r.get("PSH")), "draw": safe_float(r.get("PSD")), "away": safe_float(r.get("PSA"))},
                "avg": {"home": safe_float(r.get("AvgH")), "draw": safe_float(r.get("AvgD")), "away": safe_float(r.get("AvgA"))},
                "max": {"home": safe_float(r.get("MaxH")), "draw": safe_float(r.get("MaxD")), "away": safe_float(r.get("MaxA"))},
            },
            "over_under_2_5": {
                "bet365_over": safe_float(r.get("B365>2.5")),
                "bet365_under": safe_float(r.get("B365<2.5")),
                "avg_over": safe_float(r.get("Avg>2.5")),
                "avg_under": safe_float(r.get("Avg<2.5")),
            },
            "asian_handicap": safe_float(r.get("AHh")),
        }
        fixtures.append(fixture)

    fixtures.sort(key=lambda x: x["datetime"])
    return fixtures


def get_league_form(league_code="E0", last_n=5):
    """Get recent form for teams in a league from results CSV."""
    url = None
    for name, u in RESULTS_URLS.items():
        if league_code in u:
            url = u
            break
    if not url:
        return {}

    rows = fetch_csv(url)
    form = {}
    for r in rows:
        ht = r.get("HomeTeam", "")
        at = r.get("AwayTeam", "")
        ftr = r.get("FTR", "")
        if ht not in form:
            form[ht] = []
        if at not in form:
            form[at] = []
        if ftr == "H":
            form[ht].append("W")
            form[at].append("L")
        elif ftr == "A":
            form[ht].append("L")
            form[at].append("W")
        else:
            form[ht].append("D")
            form[at].append("D")

    return {team: results[-last_n:] for team, results in form.items()}


def build_accumulator(fixtures, min_combined_odds=2.0, max_legs=4, strategy="safe"):
    """
    Build accumulator from real odds data.
    strategy: 'safe' (strong favorites), 'value' (higher odds), 'btts' (goals)
    """
    if not fixtures:
        return None

    legs = []
    for f in fixtures:
        avg = f["odds"]["avg"]
        if not avg["home"] or not avg["away"]:
            continue

        if strategy == "safe":
            # Pick strong home favorites (odds < 1.60)
            if avg["home"] and avg["home"] < 1.60:
                legs.append({
                    "match": f"{f['home']} vs {f['away']}",
                    "league": f["league"],
                    "date": f["date"],
                    "time": f["time"],
                    "pick": "Home Win",
                    "odds": avg["home"],
                    "bet365_odds": f["odds"]["bet365"]["home"],
                    "reasoning": f"{f['home']} strong favorite at home"
                })
            # Also pick strong away favorites
            elif avg["away"] and avg["away"] < 1.60:
                legs.append({
                    "match": f"{f['home']} vs {f['away']}",
                    "league": f["league"],
                    "date": f["date"],
                    "time": f["time"],
                    "pick": "Away Win",
                    "odds": avg["away"],
                    "bet365_odds": f["odds"]["bet365"]["away"],
                    "reasoning": f"{f['away']} strong favorite away"
                })

        elif strategy == "value":
            # Pick moderate favorites (1.60 - 2.20) for higher combined odds
            for pick_type, odds_val in [("Home Win", avg["home"]), ("Away Win", avg["away"])]:
                if odds_val and 1.50 <= odds_val <= 2.20:
                    legs.append({
                        "match": f"{f['home']} vs {f['away']}",
                        "league": f["league"],
                        "date": f["date"],
                        "time": f["time"],
                        "pick": pick_type,
                        "odds": odds_val,
                        "bet365_odds": f["odds"]["bet365"]["home" if "Home" in pick_type else "away"],
                        "reasoning": f"Value pick at {odds_val:.2f}"
                    })

    # Sort by lowest odds (safest picks first)
    legs.sort(key=lambda x: x["odds"])

    # Build accumulator trying to hit min_combined_odds
    selected = []
    combined = 1.0
    for leg in legs[:max_legs * 2]:  # consider more than needed
        if len(selected) >= max_legs:
            break
        # Don't pick two matches from same day if possible (diversify)
        combined_new = combined * leg["odds"]
        selected.append(leg)
        combined = combined_new
        if combined >= min_combined_odds and len(selected) >= 2:
            break

    if not selected:
        return None

    combined_odds = 1.0
    for s in selected:
        combined_odds *= s["odds"]

    return {
        "legs": selected,
        "combined_odds": round(combined_odds, 2),
        "num_legs": len(selected),
        "strategy": strategy,
    }


if __name__ == "__main__":
    print("Fetching real upcoming fixtures with bookmaker odds...")
    fixtures = get_upcoming_fixtures(top_leagues_only=True, days_ahead=14)
    print(f"\n📅 {len(fixtures)} upcoming top-league fixtures found\n")

    for f in fixtures:
        avg = f["odds"]["avg"]
        b365 = f["odds"]["bet365"]
        print(f"{f['date']} {f['time']} | {f['league']:12} | {f['home']:20} vs {f['away']:20} | "
              f"B365: {b365['home'] or '-':>5} {b365['draw'] or '-':>5} {b365['away'] or '-':>5} | "
              f"Avg: {avg['home'] or '-':>5} {avg['draw'] or '-':>5} {avg['away'] or '-':>5}")

    print("\n--- ACCUMULATORS ---\n")

    # Safe ticket
    safe = build_accumulator(fixtures, min_combined_odds=2.0, max_legs=3, strategy="safe")
    if safe:
        print(f"🎫 SAFE TICKET (combined: {safe['combined_odds']})")
        for leg in safe["legs"]:
            print(f"  • {leg['match']} ({leg['league']}) → {leg['pick']} @ {leg['odds']:.2f}")

    # Value ticket
    value = build_accumulator(fixtures, min_combined_odds=3.0, max_legs=4, strategy="value")
    if value:
        print(f"\n🎫 VALUE TICKET (combined: {value['combined_odds']})")
        for leg in value["legs"]:
            print(f"  • {leg['match']} ({leg['league']}) → {leg['pick']} @ {leg['odds']:.2f}")

    # Save to JSON
    output = {
        "generated_at": datetime.now().isoformat(),
        "source": "football-data.co.uk (real bookmaker odds)",
        "fixtures_count": len(fixtures),
        "fixtures": fixtures,
        "accumulators": {
            "safe": safe,
            "value": value,
        }
    }
    with open("/home/Memo1981/SportsAI/Sports_Ai/data/daily_accumulators.json", "w") as f:
        json.dump(output, f, indent=2)
    print("\n✅ Saved to data/daily_accumulators.json")
