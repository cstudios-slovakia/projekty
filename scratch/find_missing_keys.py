import json
import os

keys_file = 'keys.txt'
i18n_dir = 'frontend/src/i18n'

with open(keys_file, 'r') as f:
    used_keys = [line.strip() for line in f if line.strip() and '.' in line]

languages = ['en', 'sk', 'hu']

for lang in languages:
    path = os.path.join(i18n_dir, f'{lang}.json')
    if not os.path.exists(path):
        print(f"File {path} not found")
        continue
    
    with open(path, 'r') as f:
        data = json.load(f)
    
    missing = []
    for key in used_keys:
        parts = key.split('.')
        curr = data
        found = True
        for p in parts:
            if isinstance(curr, dict) and p in curr:
                curr = curr[p]
            else:
                found = False
                break
        if not found:
            missing.append(key)
    
    print(f"\nMissing keys for {lang}:")
    for m in missing:
        print(m)
