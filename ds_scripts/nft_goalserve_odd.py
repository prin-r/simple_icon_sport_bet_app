#!/usr/bin/env python3

import json
import urllib.request
import sys
from time import time

GOALSERVE_URL = "https://www.goalserve.com/getfeed/30d7e29edaba41579db708d879c8db2e/{}/nfl-shedule?date1={}&date2={}&showodds=1&bm={},&json=1"

MOCK_URL = "http://liquidsports.bet/Football"


def make_json_request(url):
    return json.loads(urllib.request.urlopen(url).read())


def main(category, date1, date2, tournament_name, contest_id, odds_type, bookmaker_id):
    res = make_json_request(MOCK_URL)
    tournaments = res["shedules"]["tournament"]

    def find_main_1(l):
        if type(l) is not list:
            l = [l]
        for x in l:
            if x.get("main") == "1":
                return x.get("odd", [])
        return []

    for tournament in tournaments:
        if tournament_name.lower().replace(" ", "") != tournament.get("name", None).lower().replace(
            " ", ""
        ):
            continue
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
                                if type(t) is dict and t.get("value").lower() == odds_type.lower():
                                    bookmaker = t.get("bookmaker", {})
                                    if odds_type.lower() == "over/under":
                                        total = bookmaker.get("total", [])
                                        odds = find_main_1(total)
                                        if len(odds) < 2:
                                            return None
                                        return "{} {} {} {} {} {} {}".format(
                                            total[0]["name"],
                                            odds[0]["name"],
                                            odds[0]["value"],
                                            odds[0]["us"],
                                            odds[1]["name"],
                                            odds[1]["value"],
                                            odds[1]["us"],
                                        )
                                    elif odds_type.lower() == "handicap":
                                        odds = find_main_1(bookmaker.get("handicap", {}))
                                        if len(odds) < 2:
                                            return None
                                        return "{} {} {} {} {} {} {} {}".format(
                                            odds[0]["name"],
                                            odds[0]["handicap"],
                                            odds[0]["value"],
                                            odds[0]["us"],
                                            odds[1]["name"],
                                            odds[1]["handicap"],
                                            odds[1]["value"],
                                            odds[1]["us"],
                                        )
    return None


if __name__ == "__main__":
    try:
        print(main(*sys.argv[1:]))
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
