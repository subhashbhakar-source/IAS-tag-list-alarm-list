#!/usr/bin/env python3
"""Parse the Jiangnan 'E/R Monitoring and Alarm List' 70401004JL (H2700-H2705) into schema records.

Method: pdftotext -bbox-layout gives every word with coordinates; pdftoppm at 72 dpi gives an image in the
same coordinate frame, from which the table rules (horizontal row borders, vertical column borders) are
detected. Each word is placed in its row band and column band. No OCR.
"""
import re, json, subprocess, os, sys, collections
import numpy as np, cv2

SCR = '/tmp/claude-0/-home-user-IAS-tag-list-alarm-list/f7dd660a-d3c3-58fa-8bdd-148b39e88f46/scratchpad'
PDF = SCR + '/pdf_er/ER_alarm_list.pdf'
BBOX = SCR + '/pdf_er/all_bbox.html'
IMG = SCR + '/pdf_er/img'
OUT = SCR + '/extract/er_alarm_list.json'
os.makedirs(IMG, exist_ok=True)

COLS = ['no', 'tag', 'desc', 'sysdesc', 'sysno', 'inst', 'dtype', 'stype', 'min', 'max', 'unit', 'LL', 'L', 'H', 'HH', 'delay', 'group', 'remark']
BLOCK = {0: 'Common', 1: 'Power', 2: 'Propulsion', 3: 'Machinery', 4: 'Ballast', 5: 'Cargo', 6: 'Bilge', 7: 'Fire&Gas', 8: 'ESD', 9: 'System',
         14: 'N2Generator', 15: 'HDCompHeat', 16: 'GCU', 17: 'IGGenerator', 18: 'FirePumps', 19: 'Navigation', 21: 'CTSAlarm', 22: 'CTS',
         23: 'FOTransfer', 24: 'GasManagement', 26: 'Subcooler'}

def rules(img):
    dark = img < 200
    h, w = img.shape
    rows = dark[:, 30:w - 30].mean(axis=1)
    ys = [y for y in range(h) if rows[y] > 0.55]
    hl = []
    for y in ys:
        if hl and y - hl[-1][-1] <= 1: hl[-1].append(y)
        else: hl.append([y])
    cols = dark[130:h - 30, :].mean(axis=0)
    xs = [x for x in range(w) if cols[x] > 0.55]
    vl = []
    for x in xs:
        if vl and x - vl[-1][-1] <= 1: vl[-1].append(x)
        else: vl.append([x])
    return [sum(l) / len(l) for l in hl], [sum(l) / len(l) for l in vl]

# ---- words per page
pages = {}
cur = None
for m in re.finditer(r'<page width="([\d.]+)" height="([\d.]+)">|<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', open(BBOX, encoding='utf-8').read()):
    if m.group(1):
        cur = len(pages) + 1; pages[cur] = {'w': float(m.group(1)), 'h': float(m.group(2)), 'words': []}
    else:
        pages[cur]['words'].append((float(m.group(3)), float(m.group(4)), float(m.group(5)), float(m.group(6)), m.group(7)))
print('pages', len(pages), file=sys.stderr)

rows_out = []
stats = collections.Counter()
for pn in range(1, len(pages) + 1):
    pg = pages[pn]
    if pg['w'] < 1000: stats['skipped_portrait'] += 1; continue
    png = f'{IMG}/p{pn:03d}.png'
    if not os.path.exists(png):
        subprocess.run(['pdftoppm', '-r', '72', '-gray', '-f', str(pn), '-l', str(pn), '-png', '-singlefile', PDF, png[:-4]], check=True)
    img = cv2.imread(png, 0)
    hl, vl = rules(img)
    if len(vl) < 15: stats['skipped_no_table'] += 1; print('no table rules on page', pn, len(vl), file=sys.stderr); continue
    # vertical rules: expect 19; take the 19 closest to the template if more are found
    template = [23, 60, 189, 430, 549, 592, 647, 673, 734, 771, 825, 868, 895, 921, 953, 985, 1017, 1049, 1161]
    vsel = []
    for t in template:
        c = min(vl, key=lambda x: abs(x - t))
        if abs(c - t) > 8: c = t
        vsel.append(c)
    hb = [y for y in hl if y > 120]  # row borders below the header
    if len(hb) < 2: stats['skipped_no_rows'] += 1; continue
    bands = list(zip(hb[:-1], hb[1:]))
    cells = collections.defaultdict(list)  # (band index, col) -> words
    for (x0, y0, x1, y1, t) in pg['words']:
        yc = (y0 + y1) / 2; xc = (x0 + x1) / 2
        if yc < hb[0] or yc > hb[-1]: continue
        bi = next((i for i, (a, b) in enumerate(bands) if a <= yc < b), None)
        if bi is None: continue
        ci = next((i for i in range(18) if vsel[i] <= xc < vsel[i + 1]), None)
        if ci is None: stats['word_outside_cols'] += 1; continue
        cells[(bi, ci)].append((y0, x0, t))
    for bi in range(len(bands)):
        rec = {}
        for ci, name in enumerate(COLS):
            ws = sorted(cells.get((bi, ci), []))
            # join: words on the same line by x, lines by y
            lines = []
            for y0, x0, t in ws:
                if lines and abs(lines[-1][0] - y0) < 4: lines[-1][1].append((x0, t))
                else: lines.append([y0, [(x0, t)]])
            rec[name] = ' '.join(' '.join(t for _, t in sorted(l[1])) for l in lines).strip()
        if not re.fullmatch(r'\d{1,5}', rec['no']):
            if rec['tag'] or rec['desc']: stats['row_without_no'] += 1
            continue
        rec['page'] = pn
        rows_out.append(rec)
    stats['pages_parsed'] += 1

print(json.dumps(stats), file=sys.stderr)
print('rows', len(rows_out), 'first no', rows_out[0]['no'], 'last no', rows_out[-1]['no'], file=sys.stderr)
nos = [int(r['no']) for r in rows_out]
missing = sorted(set(range(1, max(nos) + 1)) - set(nos))
print('missing NO. count', len(missing), missing[:40], file=sys.stderr)
dups = [n for n, c in collections.Counter(nos).items() if c > 1]
print('duplicate NO.', len(dups), dups[:20], file=sys.stderr)
json.dump(rows_out, open(SCR + '/pdf_er/rows.json', 'w'), ensure_ascii=False, indent=0)
