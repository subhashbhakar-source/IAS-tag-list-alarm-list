#!/usr/bin/env python3
"""Merge all extraction files into the compact app data (app/data.json).

Inputs : $SCR/extract/*.json   (schema in $SCR/SCHEMA.md; *.verify.md ignored)
         $SCR/extract/groups.json (optional: sensor groups made by the grouping step)
Output : $SCR/app/data.json  +  $SCR/app/merge_report.txt
"""
import glob, json, os, re, sys, collections, datetime

SCR = '/tmp/claude-0/-home-user-IAS-tag-list-alarm-list/f7dd660a-d3c3-58fa-8bdd-148b39e88f46/scratchpad'
SYSTEMS = ["ME lubricating oil", "ME cooling water", "ME fuel oil & pilot fuel", "ME fuel gas & GVU", "ME starting & control air",
  "ME exhaust, scavenge air & turbocharger", "ME bearings, cylinders & crank", "ME safety system (shutdown/slowdown)",
  "ME remote control (AutoChief)", "ME engine control (WiCE/WECS)", "ME iCER / EGR", "ME general",
  "Generators (DG) & PMS", "Electrical power & switchboards", "Boilers, EGE & steam", "Fuel oil transfer & purification",
  "LO transfer & purification", "Sea water & FW cooling", "Compressed air", "Bilge, ballast & BWTS",
  "Cargo system", "Vapour handling (compressors, vaporizers, heaters)", "Gas management (GMS)", "GCU", "ESD system",
  "Fire & gas detection", "Ventilation & fans", "Steering, navigation & bridge", "Accommodation & HVAC",
  "IAS system (OS, DPU, network, alarm handling)", "External interfaces", "Other"]
SYSIDX = {s: i for i, s in enumerate(SYSTEMS)}
SYS_ALIASES = {s.lower(): s for s in SYSTEMS}

def sys_of(v):
    if not v: return SYSIDX['Other']
    s = SYS_ALIASES.get(str(v).strip().lower())
    if s: return SYSIDX[s]
    lv = str(v).lower()
    for k in SYSTEMS:  # loose match on the first words
        if lv.startswith(k.lower()[:10]): return SYSIDX[k]
    return SYSIDX['Other']

def clean(s):
    if s is None: return None
    if isinstance(s, (int, float)): s = str(s)
    if not isinstance(s, str): return s
    s = re.sub(r'\s+', ' ', s).strip()
    return s or None

ENG = {'port': 'P', 'p': 'P', 'stbd': 'S', 's': 'S', 'starboard': 'S', 'both': 'B'}
PREFIX = re.compile(r'^(P|S)(?:\s+|_(?=[A-Z]))(.+)$')

def norm_key(tag):
    t = clean(tag) or ''
    return re.sub(r'\s+', ' ', t.upper())

def strip_engine(tag, engine):
    """'S PS2002S' -> ('PS2002S','S'); 'SME_SHD_PREW' (engine Stbd) -> ('ME_SHD_PREW','S')."""
    t = norm_key(tag)
    m = PREFIX.match(t)
    if m:
        return m.group(2).strip(), m.group(1)
    e = ENG.get(str(engine or '').lower())
    if e in ('P', 'S') and len(t) > 3 and t[0] == e and t[1:3] in ('ME',) :
        return t[1:].lstrip('_ '), e
    return t, (e if e in ('P', 'S', 'B') else None)

def wingd_core(k):
    """Compact WinGD-style tag 'PT 2001 A' -> 'PT2001A' when the result looks like a WinGD signal number."""
    c = re.sub(r'[\s-]', '', k)
    if re.fullmatch(r'[A-Z]{1,4}\d{3,5}(?:-\d{1,2})?[A-Z]\d?', c):
        return c
    return k

# ---------------------------------------------------------------- docs
DOCS, DOCIDX = [], {}
def doc_id(name):
    name = clean(name) or '?'
    if name not in DOCIDX:
        DOCIDX[name] = len(DOCS); DOCS.append({'t': name})
    return DOCIDX[name]

def ref_list(refs):
    out = []
    for r in refs or []:
        if isinstance(r, str): out.append([doc_id(r), '', '']); continue
        if not isinstance(r, dict): continue
        out.append([doc_id(r.get('doc')), clean(r.get('page')) or '', clean(r.get('section')) or ''])
    return out

def add_refs(dst, refs):
    have = {tuple(x) for x in dst}
    for x in refs:
        if tuple(x) not in have: dst.append(x); have.add(tuple(x))

# ---------------------------------------------------------------- load
files = sorted(f for f in glob.glob(SCR + '/extract/*.json') if not f.endswith('groups.json'))
report = []
recs = []
for f in files:
    try:
        d = json.load(open(f))
    except Exception as e:
        report.append(f'!! cannot read {f}: {e}'); continue
    sid = d.get('source_id') or os.path.basename(f)[:-5]
    rr = d.get('records') or []
    report.append(f'{os.path.basename(f)}: {len(rr)} records')
    for r in rr:
        if isinstance(r, dict):
            r['_src'] = sid; recs.append(r)

kinds = collections.Counter(r.get('kind') for r in recs)
report.append('kinds: ' + json.dumps(kinds))

# ---------------------------------------------------------------- signals
SIG = {}          # key -> merged signal
order = []
def get_sig(key):
    if key not in SIG:
        SIG[key] = {'k': key, 't': [], 'rl': [], 'ref': [], 'io': [], 'rel': [], '_src': set(), '_notes': [], '_desc': [], '_sys': collections.Counter()}
        order.append(key)
    return SIG[key]

PRIORITY = {'wice': 9, 'denis': 9, 'instruments': 8, 'ac_conn_params': 6, 'ac_iolist': 6, 'im_failures': 7,
            'kfdd_vapour': 5, 'kfdd_esd_gms': 5, 'kfdd_cargo': 5, 'kfdd_pms': 5, 'kfdd_machinery': 5, 'kchief_system': 5,
            'ac_docs': 4, 'misc_manuals': 4, 'mom_1': 3, 'mom_2': 3, 'mom_3': 3}

def setf(s, field, val, src):
    val = clean(val)
    if not val: return
    pr = PRIORITY.get(src, 1)
    cur = s.get('_p_' + field, -1)
    if field not in s or pr > cur:
        s[field] = val; s['_p_' + field] = pr

def io_entry(r, eng):
    e = {'e': eng if eng in ('P', 'S') else None, 'tag': clean(r.get('tag')), 'd': clean(r.get('desc')),
         'dpu': clean(r.get('dpu')), 'mod': clean(r.get('module')), 'cab': clean(r.get('cabinet')), 'ch': clean(r.get('channel')),
         'term': clean(r.get('terminal')), 'fc': clean(r.get('func_code')), 'ag': clean(r.get('alarm_group')),
         'sp': clean(' · '.join(x for x in [clean(r.get('action')), clean(r.get('setpoint')), clean(r.get('delay'))] if x)),
         'n': clean(r.get('notes')), 'src': r['_src']}
    if isinstance(r.get('limits'), dict) and r['limits']:
        e['lim'] = {k: clean(v) for k, v in r['limits'].items() if clean(v)}
    if clean(r.get('inhibit_by')):
        e['n'] = clean(((e['n'] + ' · ') if e['n'] else '') + 'Inhibited by ' + clean(r.get('inhibit_by')))
    return {k: v for k, v in e.items() if v}

def is_cfg(r):
    """AutoChief 'Project Parameters' shutdown/slowdown input references (not physical I/O)."""
    txt = ' '.join(str(r.get(k) or '') for k in ('notes', 'to'))
    refs = ' '.join(str((x or {}).get('doc', '')) if isinstance(x, dict) else str(x) for x in (r.get('refs') or []))
    if r['_src'] != 'ac_conn_params' or r.get('terminal'):
        return False
    return 'Input tag ref' in txt or 'TagRef@' in txt or ('Project Parameters' in refs and 'Connection Arrangement' not in refs)

ROLEMAP = {'A': 'A', 'S': 'S', 'C': 'C', 'I': 'I', 'L': 'L', 'X': 'X', 'M': 'L'}
for r in recs:
    if r.get('kind') != 'signal': continue
    tag = clean(r.get('tag'))
    if not tag: continue
    core, eng = strip_engine(r.get('tag_core') or tag, r.get('engine'))
    if r.get('tag_core'):
        _, eng2 = strip_engine(tag, r.get('engine'))
        eng = eng or eng2
    key = wingd_core(core)
    s = get_sig(key)
    src = r['_src']
    s['_src'].add(src)
    if tag not in s['t']: s['t'].append(tag)
    role = ROLEMAP.get(str(r.get('role') or 'X').strip()[:1].upper(), 'X')
    if role not in s['rl']: s['rl'].append(role)
    if eng in ('P', 'S', 'B'):
        s.setdefault('_eng', set()).add(eng)
    d = clean(r.get('desc'))
    if d: s['_desc'].append((PRIORITY.get(src, 1), d))
    s['_sys'][sys_of(r.get('system'))] += PRIORITY.get(src, 1)
    for f_src, f_dst in [('equipment', 'eq'), ('sensor_type', 'st'), ('signal_type', 'sg'), ('range', 'rg'), ('unit', 'u'),
                         ('setpoint', 'sp'), ('action', 'ac'), ('delay', 'dl'), ('from', 'from'), ('to', 'to'),
                         ('box', 'box'), ('part_no', 'pn'), ('cylinder', 'cy')]:
        if r.get('dpu') and f_src in ('setpoint', 'action', 'delay', 'from', 'to'):  # engine-specific: keep with the I/O row
            continue
        setf(s, f_dst, r.get(f_src), src)
    if isinstance(r.get('limits'), dict) and r['limits'] and not r.get('dpu'):
        lim = {k: clean(v) for k, v in r['limits'].items() if clean(v)}
        if lim and PRIORITY.get(src, 1) >= s.get('_p_lim', -1):
            s['lim'] = lim; s['_p_lim'] = PRIORITY.get(src, 1)
    if is_cfg(r):
        e = 'Port' if eng == 'P' else 'Stbd' if eng == 'S' else ''
        func = next((t for t in (r.get('related_tags') or []) if 'SAFETY' in str(t).upper()), '') or clean(r.get('to')) or ''
        line = ' '.join(x for x in [e + ':' if e else '', clean(r.get('action')) or '', 'input of', func,
                                    '(DPU ' + clean(r.get('dpu')) + ' ch ' + (clean(r.get('channel')) or '') + ')' if r.get('dpu') else '',
                                    '· ' + clean(r.get('delay')) if clean(r.get('delay')) else ''] if x)
        s.setdefault('cf', [])
        if line not in s['cf']: s['cf'].append(line)
        role = 'S'
    elif r.get('dpu') or r.get('channel') or r.get('terminal'):
        s['io'].append(io_entry(r, eng))
    for t in r.get('related_tags') or []:
        t = clean(t)
        if t: s['rel'].append(t)
    if clean(r.get('inhibit_by')) and not r.get('dpu'): s['rel'].append(clean(r.get('inhibit_by')))
    n = clean(r.get('notes'))
    if n and not r.get('dpu'): s['_notes'].append(n)
    if r.get('ocr'): s['ocr'] = 1
    if r.get('screens'): s.setdefault('_scr', []).extend(r['screens'])
    add_refs(s['ref'], ref_list(r.get('refs')))

# merge I/O rows for the same DPU+channel (IO list + connection list) into one row
def merge_io(rows):
    out, idx = [], {}
    for x in rows:
        key = (x.get('e'), x.get('dpu'), x.get('ch'), norm_key(x.get('tag') or ''))
        if x.get('dpu') and x.get('ch') and key in idx:
            y = out[idx[key]]
            for k, v in x.items():
                if k not in y: y[k] = v
                elif k == 'n' and v not in y[k]: y[k] = y[k] + ' · ' + v
        else:
            if x.get('dpu') and x.get('ch'): idx[key] = len(out)
            out.append(dict(x))
    for y in out: y.pop('src', None)
    return out

for s in SIG.values():
    s['io'] = merge_io(s['io'])
    if s['_desc']:
        best = max(s['_desc'], key=lambda x: (x[0], len(x[1])))
        s['d'] = best[1]
    else:
        s['d'] = s['k']
    s['s'] = s['_sys'].most_common(1)[0][0] if s['_sys'] else SYSIDX['Other']
    eng = s.get('_eng') or set()
    if eng == {'P'}: s['e'] = 'P'
    elif eng == {'S'}: s['e'] = 'S'
    elif eng: s['e'] = 'B'
    notes = []
    for n in s['_notes']:
        if n not in notes: notes.append(n)
    if notes: s['n'] = '\n'.join(notes[:6])
    rel = []
    for t in s['rel']:
        c = wingd_core(strip_engine(t, None)[0])
        if c != s['k'] and c not in rel: rel.append(c)
    s['rel'] = rel
    s['rl'] = sorted(set(s['rl']), key='ASCLIX'.index)
    if len(s['rl']) > 1 and 'X' in s['rl']: s['rl'].remove('X')

# ---------------------------------------------------------------- functions, guides, units, cables, screens
FN, HOW, UNIT, CAB, SCR_ = [], [], [], [], []
for r in recs:
    k = r.get('kind')
    if k == 'function':
        items = []
        for it in r.get('items') or []:
            if isinstance(it, dict): items.append([clean(it.get('name')) or '', clean(it.get('text')) or ''])
            elif isinstance(it, str): items.append(['', clean(it)])
        al = []
        for a in r.get('alarms') or []:
            if isinstance(a, dict): al.append([clean(a.get('text')) or '', clean(a.get('setpoint')) or '', clean(a.get('action')) or '', clean(a.get('delay')) or ''])
            elif isinstance(a, str): al.append([clean(a), '', '', ''])
        FN.append({'title': clean(r.get('title')) or '?', 's': sys_of(r.get('system')), 'eq': clean(r.get('equipment')),
                   'items': items, 'al': al, 'tags': [clean(t) for t in (r.get('tags') or []) if clean(t)],
                   'n': clean(r.get('notes')), 'ref': ref_list(r.get('refs')), '_scr': r.get('screens') or []})
    elif k == 'howto':
        HOW.append({'title': clean(r.get('title')) or '?', 's': sys_of(r.get('system')),
                    'steps': [clean(x) for x in (r.get('steps') or []) if clean(x)], 'ref': ref_list(r.get('refs'))})
    elif k == 'unit':
        UNIT.append({'name': clean(r.get('name')) or '?', 'type': clean(r.get('type')), 'loc': clean(r.get('location')), 's': sys_of(r.get('system')),
                     'conn': [clean(x) for x in (r.get('connects_to') or []) if clean(x)] if isinstance(r.get('connects_to'), list) else clean(r.get('connects_to')),
                     'fn': [clean(x) for x in (r.get('functions') or []) if clean(x)] if isinstance(r.get('functions'), list) else ([clean(r.get('functions'))] if clean(r.get('functions')) else []),
                     'n': clean(r.get('notes')), 'ref': ref_list(r.get('refs'))})
    elif k == 'cable':
        CAB.append({'no': clean(r.get('cable_no')) or '?', 'type': clean(r.get('cable_type')), 'sig': clean(r.get('signal')),
                    'from': clean(r.get('from')), 'to': clean(r.get('to')), 'n': clean(r.get('notes')), 'ref': ref_list(r.get('refs'))})
    elif k == 'screen':
        SCR_.append({'title': r['title'], 'sec': r.get('section'), 'page': r.get('page'), 'sys': [sys_of(x) for x in r.get('systems') or []],
                     'tags': r.get('tags') or [], 'e': ENG.get(str(r.get('engine') or '').lower()), 'n': clean(r.get('notes'))})

# de-duplicate units by name (merge connections)
um = collections.OrderedDict()
for u in UNIT:
    key = norm_key(u['name'])
    if key in um:
        v = um[key]
        for f in ('type', 'loc', 'n'):
            if not v.get(f) and u.get(f): v[f] = u[f]
        if isinstance(v.get('conn'), list) and isinstance(u.get('conn'), list):
            v['conn'] += [c for c in u['conn'] if c not in v['conn']]
        v['fn'] += [c for c in u['fn'] if c not in v['fn']]
        add_refs(v['ref'], u['ref'])
    else:
        um[key] = u
UNIT = list(um.values())

# ---------------------------------------------------------------- links
keyset = set(SIG)
def resolve(t):
    t = clean(t)
    if not t: return None
    c = wingd_core(strip_engine(t, None)[0])
    return c if c in keyset else None

for i, f in enumerate(FN):
    resolved = []
    for t in f['tags']:
        c = resolve(t)
        if c:
            SIG[c].setdefault('fn', []).append(i)
            if c not in resolved: resolved.append(c)
    f['tags'] = resolved + [t for t in f['tags'] if not resolve(t) and t not in resolved][:0]  # only linkable tags as chips
for s in SIG.values():
    s['rel'] = [t for t in s['rel'] if t in keyset]
    if 'fn' in s: s['fn'] = sorted(set(s['fn']))[:12]

# screens: explicit names from records
scr_by_title = {norm_key(x['title']): i for i, x in enumerate(SCR_)}
for s in SIG.values():
    ids = []
    for nm in s.get('_scr', []):
        i = scr_by_title.get(norm_key(nm))
        if i is not None and i not in ids: ids.append(i)
    if ids: s['scr'] = ids

# ---------------------------------------------------------------- groups
GRP = []
gpath = SCR + '/extract/groups.json'
if os.path.exists(gpath):
    for g in json.load(open(gpath)).get('groups', []):
        mem = [m for m in (resolve(x) for x in g.get('members', [])) if m]
        mem = list(dict.fromkeys(mem))
        if len(mem) < 2: continue
        gi = len(GRP)
        GRP.append({'title': clean(g.get('title')), 's': sys_of(g.get('system')), 'note': clean(g.get('note')), '_mem': mem})
        for m in mem:
            SIG[m].setdefault('_g', []).append(gi)

# ---------------------------------------------------------------- finalize
keys = [k for k in order]
pos = {k: i for i, k in enumerate(keys)}
sig_out = []
for k in keys:
    s = SIG[k]
    o = {f: s[f] for f in ('k', 't', 'd', 's', 'eq', 'rl', 'st', 'sg', 'rg', 'u', 'lim', 'sp', 'ac', 'dl', 'from', 'to', 'box', 'pn', 'cy', 'e', 'n', 'ocr', 'scr', 'fn', 'rel', 'io', 'cf', 'ref') if s.get(f) not in (None, [], '', {})}
    if o.get('t') == [k]: o.pop('t')
    if s.get('_g'): o['g'] = s['_g'][0]
    sig_out.append(o)
for g in GRP:
    g['sig'] = [pos[m] for m in g.pop('_mem')]
    cnt = collections.Counter()
    for i in g['sig']:
        for r in sig_out[i].get('rl', ['X']): cnt[r] += 1
    g['cnt'] = dict(cnt)
for f in FN: f.pop('_scr', None)

data = {
    'meta': {}, 'sys': SYSTEMS, 'docs': DOCS, 'sig': sig_out, 'grp': GRP, 'fn': FN, 'scr': SCR_, 'unit': UNIT, 'cab': CAB, 'how': HOW,
    'examples': [],
}
json.dump(data, open(SCR + '/app/data_raw.json', 'w'), separators=(',', ':'))

# input for the sensor-grouping step
gin = []
for o in sig_out:
    sysn = SYSTEMS[o['s']]
    wingd = re.fullmatch(r'[A-Z]{1,4}\d{4}[A-Z]\d?', o['k']) is not None
    if not (sysn.startswith('ME ') or wingd): continue
    if not (wingd or re.match(r'^(SLD|SHD)[- ]', o['k']) or set(o.get('rl', [])) & {'A', 'S', 'L'}): continue
    if o.get('st') == 'Software tag' and not wingd: continue
    gin.append({k: o[k] for k in ('k', 't', 'd', 'rl', 'rg', 'sp', 'ac', 'dl', 'st', 'cy', 'e') if o.get(k)} | {'s': sysn, 'src': sorted(SIG[o['k']]['_src'])})
json.dump(gin, open(SCR + '/app/group_input.json', 'w'), indent=0)
report.append(f'group input: {len(gin)} signals')
report.append(f"signals {len(sig_out)}  groups {len(GRP)}  functions {len(FN)}  screens {len(SCR_)}  units {len(UNIT)}  cables {len(CAB)}  guides {len(HOW)}  docs {len(DOCS)}")
report.append('signals with I/O address: %d' % sum(1 for s in sig_out if s.get('io')))
report.append('roles: ' + json.dumps(collections.Counter(r for s in sig_out for r in s.get('rl', []))))
open(SCR + '/app/merge_report.txt', 'w').write('\n'.join(report) + '\n')
print('\n'.join(report))
