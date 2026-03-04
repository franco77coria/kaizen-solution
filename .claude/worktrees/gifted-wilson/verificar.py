import csv

with open(r'consolidado_dashboard.csv', 'r', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

out = []
out.append(f'Total rows: {len(rows)}')
out.append(f'Rows with LIDER: {sum(1 for r in rows if r["NOMBRE_LIDER"] != "null")}')
out.append(f'Rows with MUNICIPIO: {sum(1 for r in rows if r["MUNICIPIO"] != "null")}')
out.append(f'Rows with PARENTESCO: {sum(1 for r in rows if r["RELACION_PARENTESCO"] != "null")}')
out.append(f'Rows with DOCUMENTO: {sum(1 for r in rows if r["NUMERO_DOCUMENTO"] != "null")}')
out.append(f'Rows with TELEFONO: {sum(1 for r in rows if r["TELEFONO"] != "null")}')
out.append(f'Rows with A_QUIEN_REFIERE: {sum(1 for r in rows if r["A_QUIEN_REFIERE"] != "null")}')

lideres = set(r['NOMBRE_LIDER'] for r in rows if r['NOMBRE_LIDER'] != 'null')
out.append(f'\nUnique lideres: {len(lideres)}')
for l in sorted(lideres):
    out.append(f'  - {l}')

out.append('\nSample rows with LIDER data:')
count = 0
for r in rows:
    if r['NOMBRE_LIDER'] != 'null' and count < 5:
        out.append(f"  LIDER={r['NOMBRE_LIDER']} | A_QUIEN={r['A_QUIEN_REFIERE']} | DOC={r['NUMERO_DOCUMENTO']} | TEL={r['TELEFONO']} | MUN={r['MUNICIPIO']}")
        count += 1

out.append('\nSample rows with PARENTESCO:')
count = 0
for r in rows:
    if r['RELACION_PARENTESCO'] != 'null' and count < 5:
        out.append(f"  PARENTESCO={r['RELACION_PARENTESCO']} | LIDER={r['NOMBRE_LIDER']} | A_QUIEN={r['A_QUIEN_REFIERE']}")
        count += 1

with open('verificacion.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))

print('DONE')
