#!/usr/bin/env python3
"""Add meta/footer/examples to data_raw.json -> data.json (run after merge.py)."""
import json, sys, datetime, collections
SCR = '/tmp/claude-0/-home-user-IAS-tag-list-alarm-list/f7dd660a-d3c3-58fa-8bdd-148b39e88f46/scratchpad'
d = json.load(open(SCR + '/app/data_raw.json'))
built = sys.argv[1] if len(sys.argv) > 1 else datetime.date.today().isoformat()
keys = {s['k'] for s in d['sig']}
ex = [x for x in ['PS2002S', 'TE2101A', 'main bearing oil', 'slowdown', 'DPU 1820', 'XV-375', 'cargo pump', 'blackout', 'standby start', 'gas trip', 'OS041'] ]
d['examples'] = ex
d['meta'] = {'built': built, 'foot':
  'Built ' + built + ' from Kongsberg K-Chief 700 KFDDs (H2700–H2705), MIMIC book 5354211, AutoChief 600 manual for H2701 (Al Rahba, sister ship) incl. tag database 5314700/C, '
  'WinGD WiCE control list DAAD139037, DENIS-WiCE list DAAD139034, instrument list 50089765, IM X72DF-2.1 and the Al Rahba machinery manual. '
  'Build of ' + built + ': 7 of 17 sources were checked line by line against the source pages (AutoChief tag database and manual, WiCE and DENIS lists, Machinery KFDD, machinery manual part 1); the rest is NOT yet verified. '
  'Set points and addresses can differ between sister ships: confirm on your own IAS and the source page before acting.'}
json.dump(d, open(SCR + '/app/data.json', 'w'), separators=(',', ':'))
print('data.json', round(len(json.dumps(d, separators=(",", ":"))) / 1e6, 2), 'MB')
