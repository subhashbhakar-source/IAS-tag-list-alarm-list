# IAS Alarm & Tag Finder

Offline, phone-friendly search of the Al Areef IAS (Kongsberg K-Chief 700), AutoChief 600 / ESU safety system and
WinGD X72DF-2.1 engine signals, built for troubleshooting alarms.

For any tag or alarm text it shows:

- the tag as printed in each manual, its description, sensor type, signal type and range
- alarm limits (LL / L / H / HH), set point, action (alarm, slowdown, shutdown, standby start ...) and delay
- the **signal path**: sensor location → engine box → Kongsberg DPU, module, channel and terminal → cabinet → system
- the **sensor group**: every sensor that measures the same thing, counted per system
  (alarm system A, safety system S, control system C, local L), so you can cross-check a suspect reading
- follow-up tags, the IAS / AutoChief logic that uses the signal and the IAS mimic screen it belongs to
- the manual and PDF page for every value

## Learning help (added 6 Nov 2026)

A **Help** row under the search box has four switches. Each stays as you leave it on the device.

- **Decode tag**: splits every form of the tag into its parts. Examples: `TE3721A` = TE (temperature element) + 3721 (WinGD point) + A (alarm system).
  `MEP-TE-3721A_IT` = Port ME + TE + 3721A, ending `_IT`. `SLD-PR-12` = slowdown channel 12 of the Port ME, as received in the Stbd system.
  Endings like `_IT` and `_NA` are explained by how they are used in this ship's list. The manuals do not define them.
- **Plain English**: writes the short yard description out in full ("M/E T/C IN. EXH. GAS TEMP" -> "Main engine turbocharger inlet exhaust gas temperature").
- **What it means**: the card's fields as a few sentences: who uses the signal, limits, what happens, the wire route, cross-check tags and guides.
- **Explain words**: underlines terms (DPU, ESU, 4-20 mA, N.C., HH, slowdown, gas trip ...) and field names; tap one to read a short explanation. A **Glossary** page lists them all,
  together with the short forms used in descriptions and the Kongsberg abbreviation lists.

Always on: plain-word search ("turbocharger exhaust temperature", "starboard turbo"), a bar that shows the measuring range with the
LL / L / H / HH limits, coloured action steps (Alarm -> Slowdown), and links between sensor cards and the guides that name them or cover their action.
The code is in `build/learn.js`, inlined into the page at build time.

## Status

First build (5 Nov 2026). Verification was deferred at the owner's request to save credits, but seven sources had already
been checked line by line before the cancel: the Kongsberg AutoChief tag database (IO list, connection arrangement,
project parameters), the AutoChief manual, the WiCE control signal list, the DENIS-WiCE safety list, the Machinery & Ballast
KFDD and part 1 of the machinery operating manual. **Not yet verified:** instrument list, IM failure IDs, cargo / PMS /
ESD / GMS / vapour-handling KFDDs, K-Chief system docs, machinery manual parts 2-3, K-Chief operator / GVU / DCM guides.
Treat every value as "check on the page before acting"; values read by OCR are marked in the app.

## Files

| File | What it is |
|---|---|
| `index.html` | The app. All data is inside it, **encrypted** (AES-256-GCM, key from the access code by PBKDF2-SHA256, 310,000 rounds). Without the access code the page shows nothing. |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Offline support when the page is served over https (e.g. GitHub Pages): open it once with signal, then it works with none. |
| `build/` | The scripts that turn the extracted manual data into `index.html`. The extracted data itself is **not** in this repository, because the manuals are Kongsberg / WinGD proprietary documents. |

## Use

1. Open `index.html` from an https address (GitHub Pages, or the private claude.ai page).
2. Enter the access code once per device.
3. Search a tag (`PS2002S`, `S TE2101A`), words (`main bearing oil`), a DPU (`DPU 1820`), a cabinet, a screen name or a set-point word (`slowdown`).
   Filter by Alarm / Safety / Control / Local, sensor groups, logic, IAS screens, units & cables or guides, and pick ME Port or ME Stbd.

## Sources

Jiangnan **E/R Monitoring and Alarm List 70401004JL** (final drawing 2024-06-06, H2700-H2705): the yard's IAS point list, 10,221 rows with
channel tag, description, instrument tag, data/signal type, range, LL/L/H/HH limits, delay and alarm block group. Parsed from the PDF text
(table rules detected on the page image, words placed by coordinates), every row number present once.

Kongsberg: KFDD 5354199 (Common), 5354200 (Machinery & Ballast), 5354202 (Cargo), 5354203 (PMS), 5354204 (ESD),
5354205 (Vapour handling), 5354206 (GMS), 5354208 (General description), 5354209 (External interface), 5354210 (SPM),
5355814 (IMS), MIMIC book 5354211 (screen titles), AutoChief 600 installation manual 5314542 for H2701 with
the project tag database 5314700/C (IO instrument list, connection arrangement, project parameters, cable list).
WinGD / CSSC-MES: WiCE control signal list DAAD139037, DENIS-WiCE signal list DAAD139034 (scanned, read by OCR),
list of instruments 50089765, control & safety block diagram, engine control diagram, IM X72DF-2.1 (failure IDs).
Pentatech: Al Rahba (H2701) machinery operating manual 2025.

Al Rahba (H2701) is Al Areef's sister ship. Addresses and set points can differ between hulls; always confirm on the
ship's own IAS and on the source page before acting on a value. Values read by OCR are marked in the app.

## Rebuild

```
python3 build/merge.py        # extract/*.json  -> data_raw.json
python3 build/finalize.py     # adds footer and examples -> data.json
python3 build/encrypt_build.py data.json build/template.html index.html "<access code>" --repo
```

When only the page code changed (template or `learn.js`), keep the existing encrypted data block so devices do not have to enter the
access code again:

```
python3 build/encrypt_build.py - build/template.html index.html "<access code>" --repo --reuse-from index.html
```
