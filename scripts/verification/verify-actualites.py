"""Verification fonctionnelle de la phase C (module actualites)."""
import io
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request
import uuid

sys.stdout.reconfigure(encoding='utf-8', errors='backslashreplace')

BASE = 'http://localhost:8081/api/v1'
NATIONAL = ('national@mec-ci.org', 'MotDePasseSeed!2026')
COMM = ('communication@mec-ci.org', 'MotDePasseSeed!2026')
MODERATEUR = ('moderation@mec-ci.org', 'MotDePasseSeed!2026')
MEMBER = ('kouame.jean@citoyen.ci', 'password')

results = []


def call(method, path, body=None, token=None, raw_body=None, content_type=None):
    url = BASE + path
    data = None
    if raw_body is not None:
        data = raw_body
    elif body is not None:
        data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method=method)
    if content_type:
        req.add_header('Content-Type', content_type)
    elif body is not None:
        req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(req) as r:
            txt = r.read().decode()
            return r.status, (json.loads(txt) if txt else None)
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try:
            return e.code, json.loads(txt)
        except Exception:
            return e.code, txt


def check(label, ok, detail=''):
    results.append(ok)
    print(('  OK   ' if ok else '  ECHEC ') + label + (('  -> ' + str(detail)) if detail else ''))


def login(creds, admin=False):
    st, b = call('POST', '/auth/admin/login' if admin else '/auth/login',
                 {'email': creds[0], 'password': creds[1]})
    return b['token'] if st in (200, 201) else None


def multipart(fields, file_field=None, file_name=None, file_bytes=None):
    boundary = '----verify' + uuid.uuid4().hex
    out = io.BytesIO()
    for k, v in fields.items():
        out.write(f'--{boundary}\r\n'.encode())
        out.write(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode())
        out.write(str(v).encode() + b'\r\n')
    if file_field:
        ctype = mimetypes.guess_type(file_name)[0] or 'application/octet-stream'
        out.write(f'--{boundary}\r\n'.encode())
        out.write(
            f'Content-Disposition: form-data; name="{file_field}"; filename="{file_name}"\r\n'.encode())
        out.write(f'Content-Type: {ctype}\r\n\r\n'.encode())
        out.write(file_bytes + b'\r\n')
    out.write(f'--{boundary}--\r\n'.encode())
    return out.getvalue(), f'multipart/form-data; boundary={boundary}'


national = login(NATIONAL, admin=True)
comm = login(COMM, admin=True)
mod = login(MODERATEUR, admin=True)
member = login(MEMBER)
check('tous les comptes de test authentifies',
      all([national, comm, mod, member]))

# `categorieId` est obligatoire a la redaction depuis l'ajout du classement
# editorial : on prend la premiere categorie exposee publiquement.
st, cats = call('GET', '/categorie-actualite')
check('categories exposees publiquement', st == 200 and len(cats) > 0, st)
CATEGORIE = cats[0]['id'] if st == 200 and cats else None

print('\n=== 1. Redaction reservee aux roles editoriaux ===')
payload = {'title': 'Actu de verification phase C', 'excerpt': 'extrait',
           'content': '<p>contenu</p>', 'date': '2026-08-24T10:00:00.000Z',
           'categorieId': CATEGORIE}
data, ctype = multipart(payload)

st, _ = call('POST', '/actualites', raw_body=data, content_type=ctype, token=member)
check('membre -> 403', st == 403, st)
st, _ = call('POST', '/actualites', raw_body=data, content_type=ctype, token=mod)
check('moderateur -> 403', st == 403, st)

data, ctype = multipart(payload)
st, created = call('POST', '/actualites', raw_body=data, content_type=ctype, token=comm)
check('chargee de communication -> 201', st == 201, st)
if st != 201:
    print(created)
    sys.exit(1)
ACTU = created['id']
check('statut par defaut BROUILLON', created.get('statut') == 'BROUILLON', created.get('statut'))
check('authorId derive du token',
      (created.get('author') or {}).get('id') is not None, created.get('author'))
check('likesCount/commentsCount exposes',
      'likesCount' in created and 'commentsCount' in created, list(created.keys()))

print('\n=== 2. Un brouillon est invisible publiquement ===')
st, listing = call('GET', '/actualites')
ids = [a['id'] for a in (listing or {}).get('data', [])]
check('absent de la liste publique', ACTU not in ids, st)
st, _ = call('GET', f'/actualites/{ACTU}')
check('GET par id en anonyme -> 404 (pas 403)', st == 404, st)
st, _ = call('GET', f'/actualites/{ACTU}', token=member)
check('GET par id par un membre -> 404', st == 404, st)
st, _ = call('GET', f'/actualites/{ACTU}/commentaires')
check('commentaires du brouillon -> 404', st == 404, st)
st, _ = call('POST', f'/actualites/{ACTU}/reactions/toggle', token=member)
check('like sur brouillon -> 404', st == 404, st)

print('\n=== 3. Previsualisation back-office ===')
st, preview = call('GET', f'/actualites/{ACTU}', token=comm)
check('role editorial voit le brouillon -> 200', st == 200, st)
st, admin_list = call('GET', '/actualites/admin?statut=BROUILLON', token=comm)
check('GET /actualites/admin -> 200', st == 200, st)
if st == 200:
    check('le brouillon apparait dans la liste back-office',
          ACTU in [a['id'] for a in admin_list['data']])
st, _ = call('GET', '/actualites/admin', token=mod)
check('moderateur sur /actualites/admin -> 403', st == 403, st)

print('\n=== 4. Publication ===')
st, _ = call('PATCH', f'/actualites/{ACTU}/publier', token=mod)
check('moderateur ne publie pas -> 403', st == 403, st)
st, published = call('PATCH', f'/actualites/{ACTU}/publier', token=comm)
check('chargee de communication publie -> 200', st == 200, st)
if st == 200:
    check('statut PUBLIEE', published.get('statut') == 'PUBLIEE', published.get('statut'))
    check('publishedAt renseigne', published.get('publishedAt') is not None)
st, _ = call('GET', f'/actualites/{ACTU}')
check('visible en anonyme apres publication -> 200', st == 200, st)
st, _ = call('POST', f'/actualites/{ACTU}/reactions/toggle', token=member)
check('like possible apres publication -> 200', st == 200, st)

print('\n=== 5. Depublication ===')
st, _ = call('PATCH', f'/actualites/{ACTU}/depublier', token=comm)
check('depublication -> 200', st == 200, st)
st, _ = call('GET', f'/actualites/{ACTU}')
check('redevenu invisible -> 404', st == 404, st)
call('PATCH', f'/actualites/{ACTU}/publier', token=comm)

print('\n=== 6. Recherche plein texte ===')
st, r = call('GET', '/actualites?search=verification%20phase')
check('recherche multi-mots -> 200 (etait un 500)', st == 200, st)
if st == 200:
    check('le resultat contient l actualite', ACTU in [a['id'] for a in r['data']],
          r.get('meta'))
st, r = call('GET', '/actualites?search=%40%23%24%25')
check('recherche de caracteres speciaux seuls -> 200', st == 200, st)

print('\n=== 7. Bornes de pagination et filtres ===')
st, _ = call('GET', '/actualites?limit=100000')
check('limit=100000 -> 400', st == 400, st)
st, r = call('GET', '/actualites?hasImage=false')
check('hasImage=false -> 200', st == 200, st)
if st == 200:
    sans_image = all(a.get('imageUrl') in (None, '') for a in r['data'])
    check('hasImage=false ne retourne que des actualites sans image', sans_image,
          [a.get('imageUrl') for a in r['data']][:3])

print('\n=== 8. Suppression reversible ===')
st, before = call('GET', f'/actualites/{ACTU}', token=comm)
likes_avant = before.get('likesCount') if st == 200 else None
st, _ = call('DELETE', f'/actualites/{ACTU}', token=comm)
check('suppression -> 200', st == 200, st)
st, _ = call('GET', f'/actualites/{ACTU}')
check('invisible apres suppression -> 404', st == 404, st)
st, restored = call('POST', f'/actualites/{ACTU}/restore', token=comm)
check('chargee de communication ne restaure pas -> 403', st == 403, st)
st, restored = call('POST', f'/actualites/{ACTU}/restore', token=national)
check('administrateur national restaure -> 201', st in (200, 201), st)
st, after = call('GET', f'/actualites/{ACTU}', token=comm)
check('les likes ont survecu a la suppression',
      st == 200 and after.get('likesCount') == likes_avant,
      (likes_avant, after.get('likesCount') if st == 200 else st))

print('\n=== 9. Upload ===')
png = bytes.fromhex(
    '89504e470d0a1a0a0000000d494844520000000100000001080600000'
    '01f15c4890000000a49444154789c6360000002000100ffff0300000600'
    '05570cf5a10000000049454e44ae426082')
svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
data, ctype = multipart(payload, 'image', 'test.svg', svg)
st, _ = call('POST', '/actualites', raw_body=data, content_type=ctype, token=comm)
check('SVG refuse', st >= 400, st)
data, ctype = multipart(payload, 'image', 'gros.png', b'\x00' * (6 * 1024 * 1024))
st, _ = call('POST', '/actualites', raw_body=data, content_type=ctype, token=comm)
check('fichier > 5 Mo refuse', st >= 400, st)

print('\n=== 10. Classement editorial : categorie et tags ===')
st, _ = call('POST', '/actualites',
             raw_body=multipart({k: v for k, v in payload.items()
                                 if k != 'categorieId'})[0],
             content_type=multipart(payload)[1], token=comm)
check('categorieId obligatoire a la creation', st == 400, st)

taggee = dict(payload)
taggee['title'] = 'Actu taggee de verification'
taggee['tags'] = 'Verification Alpha, verification-alpha ,  Verification Beta'
data, ctype = multipart(taggee)
st, avec_tags = call('POST', '/actualites', raw_body=data,
                     content_type=ctype, token=comm)
check('creation avec tags -> 201', st == 201, st)
TAGGEE = avec_tags['id'] if st == 201 else None

check('categorie retournee dans la reponse d ecriture',
      (avec_tags.get('categorie') or {}).get('slug') is not None,
      avec_tags.get('categorie'))
slugs = sorted(t['slug'] for t in avec_tags.get('tags', []))
# « Verification Alpha » et « verification-alpha » produisent le meme slug :
# le second doit etre absorbe, pas duplique.
check('tags dedupliques par slug', slugs == ['verification-alpha', 'verification-beta'],
      slugs)

call('PATCH', f'/actualites/{TAGGEE}/publier', token=comm)

st, liste = call('GET', '/tag-actualite')
noms = {t['slug'] for t in liste} if st == 200 else set()
check('tags listes publiquement', st == 200 and 'verification-alpha' in noms, st)

st, filtre = call('GET', '/actualites?tags=verification-alpha')
ids = [a['id'] for a in filtre.get('data', [])] if st == 200 else []
check('filtre par tag retourne l actualite taggee', TAGGEE in ids, ids)

st, filtre = call('GET', '/actualites?tags=tag-qui-n-existe-pas')
check('filtre sur un tag inconnu retourne un ensemble vide',
      st == 200 and filtre['meta']['total'] == 0, st)

slug_cat = cats[0]['slug']
st, filtre = call('GET', f'/actualites?categorie={slug_cat}')
check('filtre par categorie retourne l actualite classee',
      st == 200 and TAGGEE in [a['id'] for a in filtre.get('data', [])], st)

st, filtre = call('GET', '/actualites?categorie=categorie-inconnue')
check('filtre sur une categorie inconnue retourne un ensemble vide',
      st == 200 and filtre['meta']['total'] == 0, st)

# Retrait des tags par un PATCH : le tableau vide doit detacher, pas ignorer.
data, ctype = multipart({'tags': ''})
st, sans_tags = call('PATCH', f'/actualites/{TAGGEE}', raw_body=data,
                     content_type=ctype, token=comm)
check('PATCH sans tags conserve les tags existants',
      st == 200 and len(sans_tags.get('tags', [])) == 2, sans_tags.get('tags'))

data, ctype = multipart({'tags': 'Verification Gamma'})
st, remplaces = call('PATCH', f'/actualites/{TAGGEE}', raw_body=data,
                     content_type=ctype, token=comm)
check('PATCH avec tags remplace et ne cumule pas',
      st == 200 and [t['slug'] for t in remplaces.get('tags', [])] == ['verification-gamma'],
      remplaces.get('tags'))

print('\n=== 11. Gestion des categories reservee au back-office ===')
st, _ = call('POST', '/categorie-actualite', {'nom': 'Categorie interdite'},
             token=member)
check('membre ne peut pas creer de categorie', st == 403, st)
st, _ = call('POST', '/categorie-actualite', {'nom': 'Categorie interdite'},
             token=mod)
check('moderateur ne peut pas creer de categorie', st == 403, st)
st, cat = call('POST', '/categorie-actualite',
               {'nom': 'Categorie de verification'}, token=comm)
check('chargee de communication cree une categorie', st == 201, st)
if st == 201:
    check('slug derive du nom', cat['slug'] == 'categorie-de-verification', cat.get('slug'))
    st, _ = call('POST', '/categorie-actualite',
                 {'nom': 'Categorie de verification'}, token=comm)
    check('slug en doublon sur une categorie vivante refuse', st == 409, st)
    st, _ = call('DELETE', f"/categorie-actualite/{cat['id']}", token=comm)
    check('suppression de categorie reservee a l administrateur national',
          st == 403, st)
    st, _ = call('DELETE', f"/categorie-actualite/{cat['id']}", token=national)
    check('administrateur national retire la categorie', st == 204, st)

    st, liste = call('GET', '/categorie-actualite')
    check('categorie retiree absente de la liste publique',
          cat['id'] not in [c['id'] for c in liste], st)

    # Le slug reste occupe apres un soft-delete : recreer le meme nom doit
    # ressusciter la categorie, pas echouer en 409 pour toujours.
    st, revenue = call('POST', '/categorie-actualite',
                       {'nom': 'Categorie de verification'}, token=comm)
    check('recreer une categorie retiree la ressuscite',
          st == 201 and revenue.get('id') == cat['id'],
          f"{st} {revenue.get('id')} vs {cat['id']}")
    call('DELETE', f"/categorie-actualite/{cat['id']}", token=national)

# nettoyage
call('DELETE', f'/actualites/{ACTU}', token=national)
if TAGGEE:
    call('DELETE', f'/actualites/{TAGGEE}', token=national)

total = len(results)
ok = sum(1 for r in results if r)
print(f'\n===== {ok}/{total} verifications passees =====')
sys.exit(0 if ok == total else 1)
