#!/usr/bin/env python3

import json
import urllib.request
import sys

GOALSERVE_URL = "https://www.goalserve.com/getfeed/30d7e29edaba41579db708d879c8db2e/{}/nfl-scores?date={}&json=1"


def make_json_request(url):
    return json.loads(urllib.request.urlopen(url).read())


def main(category, date, contest_id):
    res = make_json_request(GOALSERVE_URL.format(category, date))
    matches = res["scores"]["category"]["match"]
    if type(matches) is not list:
        matches = [matches]

    for match in matches:
        if match["contestID"] == contest_id:
            return "{} {} {}".format(
                match["status"], match["hometeam"]["totalscore"], match["awayteam"]["totalscore"]
            )

    return None


if __name__ == "__main__":
    try:
        print(main(*sys.argv[1:]))
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
