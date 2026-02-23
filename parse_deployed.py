#!/usr/bin/env python3
"""Parse firebase functions:list output to extract deployed functions."""
import re
import sys

with open('C:/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/firebase_list_raw.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove ANSI escape codes
content = re.sub(r'\x1b\[[0-9;]*m', '', content)

# Split by lines and parse table rows
lines = content.split('\n')
functions = []
for line in lines:
    # Table data rows contain │ (box drawing character)
    if '│' in line:
        parts = line.split('│')
        if len(parts) >= 7:
            name = parts[1].strip()
            version = parts[2].strip()
            trigger = parts[3].strip()
            location = parts[4].strip()
            memory = parts[5].strip()
            runtime = parts[6].strip()
            # Skip header row and empty rows
            if name and name != 'Function' and not name.startswith('─'):
                functions.append({
                    'name': name,
                    'version': version,
                    'trigger': trigger,
                    'location': location,
                    'memory': memory,
                    'runtime': runtime
                })

# Sort by name
functions.sort(key=lambda x: x['name'])

# Write full list
with open('C:/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/deployed_functions.txt', 'w', encoding='utf-8') as f:
    for func in functions:
        f.write(f"{func['name']}|{func['trigger']}|{func['location']}|{func['memory']}|{func['runtime']}\n")

# Stats
regions = {}
triggers = {}
runtimes = {}
for func in functions:
    loc = func['location']
    trig = func['trigger']
    rt = func['runtime']
    regions[loc] = regions.get(loc, 0) + 1
    triggers[trig] = triggers.get(trig, 0) + 1
    runtimes[rt] = runtimes.get(rt, 0) + 1

print(f"TOTAL DEPLOYED FUNCTIONS: {len(functions)}")
print(f"\nBy Region:")
for r, c in sorted(regions.items()):
    print(f"  {r}: {c}")
print(f"\nBy Trigger Type:")
for t, c in sorted(triggers.items()):
    print(f"  {t}: {c}")
print(f"\nBy Runtime:")
for r, c in sorted(runtimes.items()):
    print(f"  {r}: {c}")

# Write just names for comparison
with open('C:/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/deployed_names.txt', 'w', encoding='utf-8') as f:
    for func in functions:
        f.write(func['name'] + '\n')
