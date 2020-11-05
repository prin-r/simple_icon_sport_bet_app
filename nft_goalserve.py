#!/usr/bin/env python3

import json
import urllib.request
import sys

GOALSERVE_URL = "https://www.goalserve.com/getfeed/30d7e29edaba41579db708d879c8db2e/football/nfl-shedule?date1={}&date2={}&showodds={}"


def extract_odd_point(x):
    i = x.find('value="')
    x = x[i + 7 :]
    j = x.find('"')
    t1 = x[:j]
    x = x[j:]

    i = x.find('dp3="')
    x = x[i + 5 :]
    j = x.find('"')
    t2 = x[:j]
    x = x[j:]

    return t1 + " " + t2


def main(date1, date2, showodds, bookmakerid):
    res = str(urllib.request.urlopen(GOALSERVE_URL.format(date1, date2, showodds)).read())
    lines = res.split("<")
    for i in range(len(lines)):
        l = lines[i]
        if "bookmaker" in l and 'id="{}"'.format(bookmakerid) in l:
            if lines[i + 1].find("odd") >= 0 and lines[i + 2].find("odd") >= 0:
                return extract_odd_point(lines[i + 1]) + " " + extract_odd_point(lines[i + 2])
            else:
                continue
    return "None"


if __name__ == "__main__":
    try:
        print(main(*sys.argv[1:]))
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
