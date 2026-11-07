#!/usr/bin/env python3
"""Encrypt the app data and write the final single-file page.

usage: encrypt_build.py DATA.json TEMPLATE.html OUT.html ACCESS_CODE [--repo] [--reuse-from OLD.html]
  - data is gzip-compressed, then AES-256-GCM encrypted with a key derived from the
    access code by PBKDF2-HMAC-SHA256 (310,000 iterations, random 16-byte salt).
  - the page decrypts in the browser (WebCrypto + DecompressionStream) and keeps
    the derived key in localStorage so the code is asked for only once per device.
  - build/learn.js (learning aids: tag decoder, plain English, glossary ...) is inlined
    in place of __LEARN_JS__.
  - --repo keeps the <link rel="manifest"> for the GitHub Pages / offline build;
    without it the link is removed (the claude.ai artifact has no manifest file).
  - --reuse-from OLD.html takes the encrypted data block from an existing page instead of
    encrypting again (use it when only the page code changed). The salt stays the same, so
    devices that already entered the access code keep working without entering it again.
    DATA.json may then be "-"; if a file is given, the reused block must decrypt to it.
  - --keep-salt-from OLD.html encrypts NEW data but with the salt (and iteration count) of an existing
    page and a fresh random IV. The key derived from the access code is then unchanged, so devices that
    saved it keep working, while the data itself is new.
"""
import base64, gzip, hashlib, json, os, re, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ITER = 310000
HERE = os.path.dirname(os.path.abspath(__file__))


def blob_from_page(path):
    html = open(path, encoding='utf-8').read()
    m = re.search(r'<script id="data" type="application/json">(.*?)</script>', html, re.S)
    if not m:
        sys.exit('no encrypted data block in ' + path)
    return json.loads(m.group(1))


def main():
    args = [a for a in sys.argv[1:]]
    reuse = keep = None
    if '--keep-salt-from' in args:
        i = args.index('--keep-salt-from')
        keep = args[i + 1]
        del args[i:i + 2]
    if '--reuse-from' in args:
        i = args.index('--reuse-from')
        reuse = args[i + 1]
        del args[i:i + 2]
    data_path, tpl_path, out_path, code = args[0:4]
    flags = args[4:]
    repo = '--repo' in flags
    norm = re.sub(r'[^a-z0-9]', '', code.lower()).encode()

    if reuse:
        blob = blob_from_page(reuse)
        salt, iv, ct = (base64.b64decode(blob[k]) for k in ('salt', 'iv', 'ct'))
        key = hashlib.pbkdf2_hmac('sha256', norm, salt, blob['iter'], 32)
        raw = gzip.decompress(AESGCM(key).decrypt(iv, ct, None))  # fails if the code does not match
        if data_path != '-':
            assert json.loads(open(data_path, 'rb').read()) == json.loads(raw), 'reused data block differs from ' + data_path
        gz_len = len(ct)
    else:
        raw = open(data_path, 'rb').read()
        json.loads(raw)  # must be valid JSON
        gz = gzip.compress(raw, compresslevel=9, mtime=0)
        it = ITER
        if keep:
            old = blob_from_page(keep)
            salt, it = base64.b64decode(old['salt']), old['iter']
            okey = hashlib.pbkdf2_hmac('sha256', norm, salt, it, 32)
            AESGCM(okey).decrypt(base64.b64decode(old['iv']), base64.b64decode(old['ct']), None)  # the code must open the old page
        else:
            salt = os.urandom(16)
        iv = os.urandom(12)
        key = hashlib.pbkdf2_hmac('sha256', norm, salt, it, 32)
        ct = AESGCM(key).encrypt(iv, gz, None)
        blob = {"v": 1, "iter": it, "salt": base64.b64encode(salt).decode(),
                "iv": base64.b64encode(iv).decode(), "ct": base64.b64encode(ct).decode()}
        gz_len = len(gz)

    html = open(tpl_path, encoding='utf-8').read()
    if '__LEARN_JS__' in html:
        learn = open(os.path.join(HERE, 'learn.js'), encoding='utf-8').read()
        assert '</script' not in learn.lower()
        html = html.replace('__LEARN_JS__', learn.rstrip('\n'))
    full = repo or '--full' in flags
    if not repo:
        html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', '')
    if full:  # stand-alone document (GitHub Pages / local file): add the skeleton the artifact host normally adds
        html = ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
                '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>\n'
                + html + '\n</html>\n')
    assert '__ENCRYPTED_DATA__' in html
    html = html.replace('__ENCRYPTED_DATA__', json.dumps(blob, separators=(',', ':')))
    open(out_path, 'w', encoding='utf-8').write(html)
    # self-test: decrypt again from the written page
    b2 = blob_from_page(out_path)
    s2, i2, c2 = (base64.b64decode(b2[k]) for k in ('salt', 'iv', 'ct'))
    pt = AESGCM(hashlib.pbkdf2_hmac('sha256', norm, s2, b2['iter'], 32)).decrypt(i2, c2, None)
    assert gzip.decompress(pt) == raw
    print(f'data {len(raw)/1e6:.2f} MB -> gzip {gz_len/1e6:.2f} MB -> page {len(html)/1e6:.2f} MB  ({out_path})'
          + ('  [data block reused]' if reuse else '') + ('  [salt kept, new IV]' if keep else ''))


if __name__ == '__main__':
    main()
