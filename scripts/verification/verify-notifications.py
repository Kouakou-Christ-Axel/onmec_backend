"""Verification fonctionnelle du lot notifications.

Couvre la fermeture des endpoints d'envoi, le rattachement des appareils, le
fil in-app et les quatre declencheurs.

Note : Firebase n'est pas joignable en developpement (identifiants factices).
C'est voulu — les verifications ci-dessous exigent justement que le fil soit
ecrit meme quand la push echoue.
"""
import json
import sys
import urllib.error
import urllib.request
import uuid

sys.stdout.reconfigure(encoding='utf-8', errors='backslashreplace')

BASE = 'http://localhost:8081/api/v1'
NATIONAL = ('national@mec-ci.org', 'MotDePasseSeed!2026')
COMM = ('communication@mec-ci.org', 'MotDePasseSeed!2026')
MEMBER = ('kouame.jean@citoyen.ci', 'password')
AUTRE_MEMBER = ('aya.fatou@citoyen.ci', 'password')

results = []


def call(method, path, body=None, token=None, raw_body=None, content_type=None):
    data = raw_body if raw_body is not None else (
        json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(BASE + path, data=data, method=method)
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
    print(('  OK   ' if ok else '  ECHEC ') + label
          + (('  -> ' + str(detail)) if detail else ''))


def login(creds, admin=False):
    st, b = call('POST', '/auth/admin/login' if admin else '/auth/login',
                 {'email': creds[0], 'password': creds[1]})
    return b['token'] if st in (200, 201) else None


def multipart(fields):
    boundary = '----verify' + uuid.uuid4().hex
    out = b''
    for k, v in fields.items():
        out += f'--{boundary}\r\n'.encode()
        out += f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode()
        out += str(v).encode() + b'\r\n'
    out += f'--{boundary}--\r\n'.encode()
    return out, f'multipart/form-data; boundary={boundary}'


def non_lues(token):
    st, b = call('GET', '/notification/unread-count', token=token)
    return b['nonLues'] if st == 200 else None


national = login(NATIONAL, admin=True)
comm = login(COMM, admin=True)
member = login(MEMBER)
autre = login(AUTRE_MEMBER)
check('comptes de test authentifies', all([national, comm, member, autre]))
if not all([national, comm, member, autre]):
    # Cause quasi systematique : rate limiting sur les routes de connexion
    # apres une execution rapprochee (voir la limite connue du README).
    print('\nArret : au moins un compte n a pas pu se connecter. '
          'Attendre la fenetre de rate limiting avant de relancer.')
    sys.exit(1)

print('\n=== 1. Les endpoints d envoi ne sont plus ouverts ===')
push = {'token': 'faux', 'title': 't', 'body': 'b', 'icon': ''}
st, _ = call('POST', '/notification/send-notification', push)
check('send-notification en anonyme -> 401', st == 401, st)
st, _ = call('POST', '/notification/send-multiple-notifications',
             {'tokens': ['faux'], 'title': 't', 'body': 'b', 'icon': ''})
check('send-multiple-notifications en anonyme -> 401', st == 401, st)
st, _ = call('POST', '/notification/send-topic-notification',
             {'topic': 'tous', 'title': 't', 'body': 'b', 'icon': ''})
check('send-topic-notification en anonyme -> 401', st == 401, st)
st, _ = call('POST', '/notification/send-topic-notification',
             {'topic': 'tous', 'title': 't', 'body': 'b', 'icon': ''},
             token=member)
check('send-topic-notification par un membre -> 403', st == 403, st)

print('\n=== 2. Rattachement des appareils ===')
st, moi = call('GET', '/auth/me', token=member)
MOI = moi['id']
st, lui = call('GET', '/auth/me', token=autre)
LUI = lui['id']

jeton = 'verif-' + uuid.uuid4().hex
st, appareil = call('POST', '/notification/register-device',
                    {'token': jeton, 'platform': 'android', 'userId': LUI},
                    token=member)
check('appareil enregistre -> 201', st == 201, st)
check('le userId du corps de requete est ignore',
      appareil.get('userId') == MOI, f"{appareil.get('userId')} attendu {MOI}")

st, _ = call('POST', '/notification/delete-device', {'token': jeton},
             token=autre)
check('un autre membre ne peut pas retirer cet appareil -> 403', st == 403, st)
st, _ = call('POST', '/notification/delete-device', {'token': jeton},
             token=member)
check('le proprietaire retire son appareil', st in (200, 201), st)

anonyme = 'verif-anon-' + uuid.uuid4().hex
st, sans_compte = call('POST', '/notification/register-device',
                       {'token': anonyme, 'platform': 'web'})
check('enregistrement anonyme toujours accepte', st == 201, st)
check('appareil anonyme non rattache',
      sans_compte.get('userId') is None, sans_compte.get('userId'))
call('POST', '/notification/delete-device', {'token': anonyme})

print('\n=== 3. Publication d une actualite : diffusion a tous ===')
st, cats = call('GET', '/categorie-actualite')
avant = non_lues(member)

payload = {'title': 'Actu de verification notifications',
           'excerpt': 'extrait', 'content': '<p>contenu</p>',
           'date': '2026-08-24T10:00:00.000Z',
           'categorieId': cats[0]['id']}
data, ctype = multipart(payload)
st, actu = call('POST', '/actualites', raw_body=data, content_type=ctype,
                token=comm)
check('actualite creee en brouillon', st == 201, st)
if st != 201:
    # Le plus souvent : rate limiting sur /auth/admin/login apres une execution
    # rapprochee. Sans cette sortie, la suite plantait sur une KeyError plutot
    # que de nommer la cause.
    print(actu)
    print('\nArret : impossible de creer l actualite support des verifications.')
    sys.exit(1)
ACTU = actu['id']

check('un brouillon ne notifie personne', non_lues(member) == avant,
      f'{avant} -> {non_lues(member)}')

call('PATCH', f'/actualites/{ACTU}/publier', token=comm)
apres = non_lues(member)
check('la publication notifie le membre', apres == avant + 1,
      f'{avant} -> {apres}')

# Le contrat le plus important du lot : `publier` est idempotent et le
# back-office peut depublier puis republier pour corriger une coquille.
call('PATCH', f'/actualites/{ACTU}/publier', token=comm)
check('republier ne notifie pas une seconde fois', non_lues(member) == apres,
      f'{apres} -> {non_lues(member)}')

call('PATCH', f'/actualites/{ACTU}/depublier', token=comm)
call('PATCH', f'/actualites/{ACTU}/publier', token=comm)
check('depublier puis republier ne notifie pas non plus',
      non_lues(member) == apres, f'{apres} -> {non_lues(member)}')

print('\n=== 4. Fil in-app ===')
st, fil = call('GET', '/notification', token=member)
check('fil accessible -> 200', st == 200, st)
recente = fil['data'][0] if st == 200 and fil['data'] else None
check('la notification de publication est en tete',
      recente is not None and recente['type'] == 'actualite_publiee',
      recente.get('type') if recente else None)
check('le lien pointe vers l actualite',
      recente is not None and recente['lien'] == f"/actualites/{actu['slug']}",
      recente.get('lien') if recente else None)
check('le fil expose le compteur de non lues',
      isinstance(fil.get('nonLues'), int), fil.get('nonLues'))

st, _ = call('GET', '/notification')
check('fil inaccessible en anonyme -> 401', st == 401, st)

st, filtre = call('GET', '/notification?nonLues=false', token=member)
check('nonLues=false ne filtre pas (piege du booleen)',
      st == 200 and filtre['total'] >= fil['total'],
      f"{filtre.get('total')} vs {fil.get('total')}")

print('\n=== 5. Lecture ===')
st, lue = call('PATCH', f"/notification/{recente['id']}/read", token=member)
check('marquer lue -> 200', st == 200 and lue['isRead'] is True, st)
check('readAt renseigne', lue.get('readAt') is not None, lue.get('readAt'))
st, _ = call('PATCH', f"/notification/{recente['id']}/read", token=member)
check('marquer lue est idempotent', st == 200, st)
st, _ = call('PATCH', f"/notification/{recente['id']}/read", token=autre)
check('un autre membre -> 404 (pas 403)', st == 404, st)

st, tout = call('PATCH', '/notification/read-all', token=member)
check('tout marquer lu -> 200', st == 200, st)
check('plus aucune non lue', non_lues(member) == 0, non_lues(member))

print('\n=== 6. Commentaire sur un signalement ===')
st, sigs = call('GET', '/signalement-citoyen?limit=50', token=national)
mien = None
for s in (sigs or {}).get('data', []):
    if s.get('citoyenId') == MOI:
        mien = s
        break

if mien is None:
    check('un signalement du membre est disponible', False,
          'aucun signalement rattache au membre de test')
else:
    avant = non_lues(member)
    call('POST', f"/signalement-citoyen/{mien['id']}/commentaires",
         {'contenu': 'Commentaire de verification par un tiers'}, token=autre)
    check('un commentaire d un tiers notifie l auteur',
          non_lues(member) == avant + 1, f'{avant} -> {non_lues(member)}')

    avant = non_lues(member)
    call('POST', f"/signalement-citoyen/{mien['id']}/commentaires",
         {'contenu': 'Commentaire de verification par moi-meme'}, token=member)
    check('commenter son propre signalement ne s auto-notifie pas',
          non_lues(member) == avant, f'{avant} -> {non_lues(member)}')

    print('\n=== 6bis. Changement de statut d un signalement ===')
    # Le back-office edite un signalement pour bien d'autres raisons qu'un
    # changement d'etat : la notification doit suivre le changement, pas l'appel.
    depart = mien.get('statut')
    cible = 'EN_COURS' if depart != 'EN_COURS' else 'RESOLU'

    avant = non_lues(member)
    data, ctype = multipart({'titre': mien['titre']})
    st, _ = call('PATCH', f"/signalement-citoyen/{mien['id']}",
                 raw_body=data, content_type=ctype, token=national)
    check('une edition sans changement de statut ne notifie pas',
          st in (200, 201) and non_lues(member) == avant,
          f'{st} : {avant} -> {non_lues(member)}')

    avant = non_lues(member)
    data, ctype = multipart({'statut': cible})
    st, _ = call('PATCH', f"/signalement-citoyen/{mien['id']}",
                 raw_body=data, content_type=ctype, token=national)
    check('le changement de statut notifie le citoyen',
          st in (200, 201) and non_lues(member) == avant + 1,
          f'{st} : {avant} -> {non_lues(member)}')

    # Retour a l'etat initial pour que le script reste rejouable.
    data, ctype = multipart({'statut': depart})
    call('PATCH', f"/signalement-citoyen/{mien['id']}",
         raw_body=data, content_type=ctype, token=national)

print('\n=== 7. Moderation d un commentaire ===')
st, c = call('POST', f'/actualites/{ACTU}/commentaires',
             {'contenu': 'Commentaire a moderer'}, token=member)
if st in (200, 201):
    avant = non_lues(member)
    st, _ = call('PATCH', f"/commentaires/{c['id']}/masquer", {'masque': True},
                 token=national)
    check('masquer un commentaire notifie son auteur',
          st in (200, 201) and non_lues(member) == avant + 1,
          f'{st} : {avant} -> {non_lues(member)}')

    avant = non_lues(member)
    call('PATCH', f"/commentaires/{c['id']}/masquer", {'masque': False},
         token=national)
    check('demasquer ne notifie pas', non_lues(member) == avant,
          f'{avant} -> {non_lues(member)}')
else:
    check('commentaire cree pour la moderation', False, st)

# nettoyage
if ACTU:
    call('DELETE', f'/actualites/{ACTU}', token=national)

total = len(results)
ok = sum(1 for r in results if r)
print(f'\n===== {ok}/{total} verifications passees =====')
sys.exit(0 if ok == total else 1)
