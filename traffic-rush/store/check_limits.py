#!/usr/bin/env python3
"""Checks store-listing character limits in listing-*.md.

Each field is a markdown heading containing "(≤N" followed by a ```text block.
For "What's new" the strictest store limit (Play: 500) is enforced.
iOS keywords are also checked for spaces after commas and duplicate words.
Usage: python3 store/check_limits.py   (exit code 1 if any limit is exceeded)
"""
import glob, os, re, sys

here = os.path.dirname(os.path.abspath(__file__))
FIELD = re.compile(r"^## ([^\n]+)\n```text\n(.*?)\n```", re.S | re.M)
ok = True
for path in sorted(glob.glob(os.path.join(here, "listing-*.md"))):
    print(f"== {os.path.basename(path)}")
    text = open(path, encoding="utf-8").read()
    for title, body in FIELD.findall(text):
        m = re.search(r"≤(\d+)", title)
        if not m:
            print(f"   {'-':>5}        {title}")
            continue
        limit = int(m.group(1))
        if "500 Play" in title:
            limit = 500
        n = len(body)  # App Store Connect & Play count Unicode characters
        flag = "OK " if n <= limit else "TOO LONG"
        ok &= n <= limit
        print(f"   {n:>5}/{limit:<5} {flag} {title}")
        if title.lower().startswith(("keywords", "fjalët kyçe")):
            words = body.split(",")
            if any(w != w.strip() or not w for w in words):
                print("         !! keywords: remove spaces/empty items"); ok = False
            if len(set(words)) != len(words):
                print("         !! keywords: duplicates"); ok = False
sys.exit(0 if ok else 1)
