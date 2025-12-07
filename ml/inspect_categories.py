import csv
from collections import defaultdict

CSV = 'monobank_transactions_augmented2.csv'

samples = defaultdict(list)
counts = defaultdict(int)

with open(CSV, encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for r in reader:
        cat = r.get('category_id')
        text = (r.get('text_features') or '').strip()
        counts[cat] += 1
        if len(samples[cat]) < 8:
            samples[cat].append(text)

for cat in sorted(counts, key=lambda x: int(x) if x is not None and x!='' else -1):
    print(f"Category ID: {cat} — count={counts[cat]}")
    for s in samples[cat]:
        print('   -', s)
    print()