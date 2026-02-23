import csv
from collections import Counter

rows = []
with open(r'c:\Users\Usuario\OneDrive\Escritorio\Pagina web\Base de datos para DASHBOARD - Base Dash (2)_limpio.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        rows.append(row)

print(f'Total: {len(rows)}')

sexo = Counter(r['SEXO'] for r in rows)
obs = Counter(r['OBSERVACIONES'] for r in rows)

print('\nSEXO:')
for k, v in sexo.most_common():
    label = k if k else '(vacio)'
    print(f'  {label}: {v}')

print('\nOBSERVACIONES:')
for k, v in obs.most_common():
    print(f'  {k}: {v}')
