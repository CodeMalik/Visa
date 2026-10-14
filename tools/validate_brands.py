#!/usr/bin/env python3
"""Validate brands.json: structure, monotonicity, and the straddle behaviour.

Reports anomalies. Does NOT fix anything — a value that disagrees with its
source must be re-checked against the source, not quietly corrected here.
"""
import json
import sys

PATH = sys.argv[1] if len(sys.argv) > 1 else "data/brands.json"

with open(PATH, encoding="utf-8") as fh:
    db = json.load(fh)

errors, warnings = [], []
FIELDS = ("bust", "waist", "hips")

for brand in db["brands"]:
    bid = brand["brand_id"]

    for key in ("source_url", "captured", "units", "sizes", "notes"):
        if not brand.get(key):
            errors.append(f"{bid}: missing required field '{key}'")

    if brand.get("units") not in ("in", "cm"):
        errors.append(f"{bid}: units must be 'in' or 'cm'")

    sizes = brand.get("sizes", [])
    if len(sizes) < 2:
        errors.append(f"{bid}: needs at least 2 sizes")
        continue

    # every row complete
    for row in sizes:
        for f in FIELDS:
            if not isinstance(row.get(f), (int, float)):
                errors.append(f"{bid} size {row.get('size')}: '{f}' missing or non-numeric")

    # measurements must increase with size — a break means a transcription error
    for f in FIELDS:
        vals = [r[f] for r in sizes if isinstance(r.get(f), (int, float))]
        for i in range(1, len(vals)):
            if vals[i] <= vals[i - 1]:
                errors.append(
                    f"{bid}: {f} not increasing at size "
                    f"{sizes[i]['size']} ({vals[i-1]} -> {vals[i]})"
                )

    # Flag values at odd precision for their unit. Inch charts are published
    # on halves; cm charts on whole numbers. A lone .6 among .5s is almost
    # always a typo in the source — catch it, don't correct it.
    unit = brand.get("units")
    for f in FIELDS:
        for row in sizes:
            v = row.get(f)
            if not isinstance(v, (int, float)):
                continue
            frac = round(v - int(v), 3)
            odd = frac not in (0.0, 0.5) if unit == "in" else frac != 0.0
            if odd:
                warnings.append(
                    f"{bid}: {f} at size {row['size']} is {v}{unit} — "
                    f"unexpected precision for a {unit} chart; verify against source"
                )

print(f"brands: {len(db['brands'])}   excluded: {len(db.get('excluded_brands', []))}")
for b in db["brands"]:
    u = b["units"]
    s = b["sizes"]
    print(
        f"  {b['brand_name']:<16} {len(s):>2} sizes  "
        f"{s[0]['size']}–{s[-1]['size']}  "
        f"bust {s[0]['bust']}–{s[-1]['bust']}{u}  [{b['captured']}]"
    )

# --- demonstrate the straddle case across brands -------------------------

def size_for(brand, bust, waist, hips):
    """Smallest size whose every listed measurement >= the body's."""
    idx = {}
    for f, v in (("bust", bust), ("waist", waist), ("hips", hips)):
        hit = next(
            (i for i, r in enumerate(brand["sizes"]) if r[f] >= v), None
        )
        idx[f] = hit
    if None in idx.values():
        return None, idx
    top = max(idx.values())
    return brand["sizes"][top]["size"], idx


print("\nworked example — body 36 / 30 / 40 in:")
for brand in db["brands"]:
    if brand["units"] == "cm":
        body = (36 * 2.54, 30 * 2.54, 40 * 2.54)
    else:
        body = (36, 30, 40)
    rec, idx = size_for(brand, *body)
    if rec is None:
        print(f"  {brand['brand_name']:<16} above chart maximum")
        continue
    parts = ", ".join(
        f"{f} -> {brand['sizes'][i]['size']}" for f, i in idx.items()
    )
    straddle = len(set(idx.values()))
    print(f"  {brand['brand_name']:<16} {rec:<6} ({parts}; straddle {straddle})")

print()
if warnings:
    print(f"WARNINGS ({len(warnings)}) — verify against source, do not auto-fix:")
    for w in warnings:
        print("  !", w)
if errors:
    print(f"\nERRORS ({len(errors)}):")
    for e in errors:
        print("  x", e)
    sys.exit(1)

print("\nstructure OK")
