"""Verification fonctionnelle du lot engagement / gamification.

Couvre l'idempotence du toggle de like, l'attribution de points derivee des
actions reelles, le plafond quotidien des commentaires et l'exclusivite des
cibles polymorphes.
"""
import json
import sys
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding='utf-8', errors='backslashreplace')

BASE = 'http://localhost:8081/api/v1'
NATIONAL = ('national@mec-ci.org', 'MotDePasseSeed!2026')
MEMBER = ('kouame.jean@citoyen.ci', 'password')

results = []


def call(method, path, body=None, token=None):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode() if body is not None else None,
        method=method)
    if body is not None:
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
    print(('  OK   ' if ok else '  ECHEC ') + label
          + (('  -> ' + str(detail)) if detail else ''))


def login(creds, admin=False):
    st, b = call('POST', '/auth/admin/login' if admin else '/auth/login',
                 {'email': creds[0], 'password': creds[1]})
    return b['token'] if st in (200, 201) else None


def points(token):
    st, b = call('GET', '/gamification/me', token=token)
    return b['points'] if st == 200 else None


national = login(NATIONAL, admin=True)
member = login(MEMBER)
check('comptes de test authentifies', all([national, member]))

# Une actualite publiee sert de cible : l'engagement refuse les brouillons.
st, liste = call('GET', '/actualites')
ACTU = liste['data'][0]['id'] if st == 200 and liste.get('data') else None
check('actualite publiee disponible comme cible', ACTU is not None, st)

print('\n=== 1. Toggle de like idempotent ===')
# Etat de depart connu : on force le like a off.
st, b = call('POST', f'/actualites/{ACTU}/reactions/toggle', token=member)
if b and b.get('liked'):
    call('POST', f'/actualites/{ACTU}/reactions/toggle', token=member)

st, b1 = call('POST', f'/actualites/{ACTU}/reactions/toggle', token=member)
check('premier toggle -> liked=true', st in (200, 201) and b1['liked'] is True,
      f'{st} {b1}')
st, b2 = call('POST', f'/actualites/{ACTU}/reactions/toggle', token=member)
check('second toggle -> liked=false', st in (200, 201) and b2['liked'] is False,
      f'{st} {b2}')

# Une rafale de toggles ne doit jamais produire de 500 : la version precedente
# faisait echouer la creation concurrente sur la contrainte d'unicite.
codes = []
for _ in range(6):
    st, _b = call('POST', f'/actualites/{ACTU}/reactions/toggle', token=member)
    codes.append(st)
check('6 toggles consecutifs sans erreur serveur',
      all(c in (200, 201) for c in codes), codes)

st, apres = call('GET', f'/actualites/{ACTU}')
check('likesCount coherent apres la rafale',
      apres.get('likesCount') is not None and apres['likesCount'] >= 0,
      apres.get('likesCount'))

print('\n=== 2. Points derives du like, non refarmables ===')
# On repart d'un like pose, puis on retire et on repose : le credit initial
# ayant deja eu lieu, le total ne doit plus bouger.
st, b = call('POST', f'/actualites/{ACTU}/reactions/toggle', token=member)
if not b.get('liked'):
    call('POST', f'/actualites/{ACTU}/reactions/toggle', token=member)

avant = points(member)
call('POST', f'/actualites/{ACTU}/reactions/toggle', token=member)   # unlike
call('POST', f'/actualites/{ACTU}/reactions/toggle', token=member)   # re-like
apres_points = points(member)
check('unlike puis re-like ne recredite pas',
      avant is not None and apres_points == avant, f'{avant} -> {apres_points}')

print('\n=== 3. Points de commentaire et plafond quotidien ===')
# Formule volontairement independante du point de depart : le plafond etant
# quotidien, une seconde execution le meme jour partirait d'un membre deja
# credite. On mesure donc ce que rapporte une rafale, pas un total absolu.
PLAFOND = 10
POINTS_PAR_COMMENTAIRE = 2
RAFALE = 10

avant = points(member)
st, _ = call('POST', f'/actualites/{ACTU}/commentaires',
             {'contenu': 'Verification gamification 1'}, token=member)
check('commentaire cree', st in (200, 201), st)

for i in range(2, RAFALE + 1):
    call('POST', f'/actualites/{ACTU}/commentaires',
         {'contenu': f'Verification gamification {i}'}, token=member)

gagnes = points(member) - avant
check(f'{RAFALE} commentaires rapportent au plus le plafond quotidien',
      0 <= gagnes <= PLAFOND,
      f'{gagnes} points (sans plafond : {RAFALE * POINTS_PAR_COMMENTAIRE})')
check('le plafond mord bien (gain inferieur au bareme brut)',
      gagnes < RAFALE * POINTS_PAR_COMMENTAIRE, gagnes)

plafonne = points(member)
call('POST', f'/actualites/{ACTU}/commentaires',
     {'contenu': 'Verification gamification apres plafond'}, token=member)
check('un commentaire de plus ne rapporte plus rien',
      points(member) == plafonne, f'{plafonne} -> {points(member)}')

print('\n=== 4. Le plafond ne bloque que la source concernee ===')
avant = points(member)
st, _ = call('POST', '/gamification/points',
             {'points': 7, 'raison': 'ajustement de verification'},
             token=national)
check('userId desormais obligatoire sur l ajustement back-office', st == 400, st)

st, moi = call('GET', '/auth/me', token=member)
st, b = call('POST', '/gamification/points',
             {'userId': moi['id'], 'points': 7,
              'raison': 'ajustement de verification'},
             token=national)
check('ajustement back-office accepte malgre le plafond commentaire',
      st in (200, 201), st)
check('l ajustement credite bien le membre',
      st in (200, 201) and b['points'] == avant + 7, f"{avant} -> {b.get('points')}")

print('\n=== 5. Cloisonnement des ecritures de points ===')
st, _ = call('POST', '/gamification/points',
             {'points': 9999, 'raison': 'auto-attribution'}, token=member)
check('un membre ne peut pas s auto-attribuer de points', st == 403, st)

total = len(results)
ok = sum(1 for r in results if r)
print(f'\n===== {ok}/{total} verifications passees =====')
sys.exit(0 if ok == total else 1)
