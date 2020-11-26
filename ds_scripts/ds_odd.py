#!/usr/bin/env python3

import json
import urllib.request
import sys

GOALSERVE_URL = "https://www.goalserve.com/getfeed/30d7e29edaba41579db708d879c8db2e/{}/nfl-shedule?date1={}&date2={}&showodds=1&json=1"


def make_json_request(url):
    return json.loads(urllib.request.urlopen(url).read())


def main(category, date1, date2, contest_id, odds_type, bookmaker_id):
    res = make_json_request(GOALSERVE_URL.format(category, date1, date2))
    tournaments = res["shedules"]["tournament"]

    def find_main_1(l):
        if type(l) is not list:
            l = [l]
        for x in l:
            if x.get("main") == "1":
                return x.get("odd", [])
        return []

    def find_odds():
        for tournament in tournaments:
            for week in tournament.get("week", []):
                matches = week.get("matches", [])
                if type(matches) is not list:
                    matches = [matches]
                for match in matches:
                    if type(match) is dict:
                        matches_inner = match.get("match")
                        if type(matches_inner) is not list:
                            matches_inner = [matches_inner]
                        for m in matches_inner:
                            if m.get("contestID") == contest_id:
                                types = m.get("odds", {}).get("type", [])
                                if type(types) is not list:
                                    types = [types]
                                for t in types:
                                    if (
                                        type(t) is dict
                                        and t.get("value").lower() == odds_type.lower()
                                    ):
                                        bookmakers = t.get("bookmaker", [])
                                        if type(bookmakers) is not list:
                                            bookmakers = [bookmakers]
                                        for bookmaker in bookmakers:
                                            if (
                                                type(bookmaker) is dict
                                                and bookmaker.get("id") == bookmaker_id
                                            ):
                                                if odds_type.lower() == "over/under":
                                                    return find_main_1(bookmaker.get("total", {}))
                                                elif odds_type.lower() == "handicap":
                                                    return find_main_1(
                                                        bookmaker.get("handicap", {})
                                                    )
        return []

    odds = find_odds()
    if len(odds) < 2:
        return None

    result = [
        odds[0].get("value", None),
        odds[0].get("dp3", None),
        odds[1].get("value", None),
        odds[1].get("dp3", None),
    ]

    if None in result:
        return None

    return "{} {} {} {}".format(result[0], result[1], result[2], result[3])


if __name__ == "__main__":
    try:
        print(main(*sys.argv[1:]))
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
