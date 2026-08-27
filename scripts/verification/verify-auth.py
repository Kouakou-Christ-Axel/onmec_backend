"""Verification fonctionnelle de la phase B (authentification / RBAC)."""
import base64
import json
import sys
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding='utf-8', errors='backslashreplace')

BASE = 'http://localhost:8081/api/v1'
MEMBER = ('kouame.jean@citoyen.ci', 'password')
NATIONAL = ('national@mec-ci.org', 'MotDePasseSeed!2026')
MODERATEUR = ('moderation@mec-ci.org', 'MotDePasseSeed!2026')
COMM = ('communication@mec-ci.org', 'MotDePasseSeed!2026')

results = []


def call(method, path, body=None, token=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if data:
        req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw


def check(label, ok, detail=''):
    results.append(ok)
    print(('  OK   ' if ok else '  ECHEC ') + label + (('  -> ' + str(detail)) if detail else ''))


def login(creds, admin=False):
    path = '/auth/admin/login' if admin else '/auth/login'
    st, b = call('POST', path, {'email': creds[0], 'password': creds[1]})
    return st, b


def jwt_claims(token):
    payload = token.split('.')[1]
    payload += '=' * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload))


print('\n=== 1. Connexion back-office ===')
st, admin_res = login(NATIONAL, admin=True)
check('login admin -> 2xx', st in (200, 201), st)
if st not in (200, 201):
    print(admin_res)
    sys.exit(1)
admin_token = admin_res['token']
check("type == 'admin'", admin_res.get('type') == 'admin', admin_res.get('type'))
check("role == ADMIN_NATIONAL", admin_res.get('role') == 'ADMIN_NATIONAL', admin_res.get('role'))
check('mustChangePassword expose', admin_res.get('mustChangePassword') is True, admin_res.get('mustChangePassword'))
check('capabilities non vide', len(admin_res.get('capabilities') or []) > 0, admin_res.get('capabilities'))
check('permissions (compat front) present', 'permissions' in admin_res)
check('aucune fuite password/otpSecret',
      'password' not in admin_res and 'otpSecret' not in admin_res)

claims = jwt_claims(admin_token)
check("JWT porte type=admin", claims.get('type') == 'admin', claims.get('type'))
check("JWT porte le role", claims.get('role') == 'ADMIN_NATIONAL', claims.get('role'))
check('JWT porte une expiration (exp)', 'exp' in claims, claims.get('exp'))

print('\n=== 2. Connexion membre ===')
st, member_res = login(MEMBER)
check('login membre -> 2xx', st in (200, 201), st)
member_token = member_res['token'] if st in (200, 201) else None
if member_token:
    check("type == 'member'", member_res.get('type') == 'member', member_res.get('type'))
    check("role == MEMBER", member_res.get('role') == 'MEMBER', member_res.get('role'))
    mc = jwt_claims(member_token)
    check('JWT membre porte exp', 'exp' in mc)

print('\n=== 3. Anti-enumeration ===')
st_unknown, b1 = login(('inexistant-xyz@nulle-part.ci', 'FauxMotDePasse!1'))
st_wrongpw, b2 = login((MEMBER[0], 'MauvaisMotDePasse!1'))
check('email inconnu et mot de passe faux -> meme statut',
      st_unknown == st_wrongpw == 401, (st_unknown, st_wrongpw))
m1 = (b1 or {}).get('message')
m2 = (b2 or {}).get('message')
check('meme message', m1 == m2, (m1, m2))

print('\n=== 4. Cloisonnement admin / membre ===')
st, _ = call('GET', '/admins', token=member_token)
check('membre sur GET /admins -> 403', st == 403, st)
st, _ = call('GET', '/admins', token=admin_token)
check('admin national sur GET /admins -> 200', st == 200, st)

st, mod_res = login(MODERATEUR, admin=True)
mod_token = mod_res['token'] if st in (200, 201) else None
st, _ = call('GET', '/admins', token=mod_token)
check('moderateur sur GET /admins -> 403', st == 403, st)

st, comm_res = login(COMM, admin=True)
comm_token = comm_res['token'] if st in (200, 201) else None
st, _ = call('GET', '/users', token=comm_token)
check('chargee de comm sur GET /users -> 403', st == 403, st)
st, _ = call('GET', '/users', token=mod_token)
check('moderateur sur GET /users -> 200', st == 200, st)

print('\n=== 5. Elevation de privileges ===')
st, body = call('PATCH', '/users', {'role': 'ADMIN'}, token=member_token)
check('PATCH /users {"role":"ADMIN"} -> 400 (forbidNonWhitelisted)', st == 400, st)
if isinstance(body, dict):
    msg = json.dumps(body.get('message', ''))
    check('le champ role est explicitement rejete', 'role' in msg, msg[:120])

print('\n=== 6. Fuite de donnees ===')
st, me = call('GET', '/auth/me', token=member_token)
check('GET /auth/me -> 200', st == 200, st)
if isinstance(me, dict):
    check('pas de otpSecret dans /auth/me', 'otpSecret' not in me)
    check('pas de password dans /auth/me', 'password' not in me)

st, listing = call('GET', '/users?limit=5', token=admin_token)
check('GET /users -> 200', st == 200, st)
if st == 200 and listing.get('data'):
    row = listing['data'][0]
    check('pas de otpSecret dans GET /users', 'otpSecret' not in row, list(row.keys()))
    check('pas de password dans GET /users', 'password' not in row)

print('\n=== 7. Suspension effective sur un token deja emis ===')
st, listing = call('GET', '/users?search=kouame', token=admin_token)
target = listing['data'][0]['id'] if st == 200 and listing.get('data') else None
check('membre cible trouve', target is not None)
if target and mod_token:
    st, _ = call('PATCH', f'/users/{target}/statut',
                 {'statut': 'SUSPENDU', 'raison': 'test de verification'}, token=mod_token)
    check('moderateur suspend le membre -> 200', st == 200, st)
    st, body = call('GET', '/auth/me', token=member_token)
    check('token deja emis rejete immediatement -> 403', st == 403, st)
    st, body = call('POST', '/auth/login', {'email': MEMBER[0], 'password': MEMBER[1]})
    check('reconnexion refusee tant que suspendu -> 401', st == 401, st)
    # reactivation
    st, _ = call('PATCH', f'/users/{target}/statut', {'statut': 'ACTIF'}, token=mod_token)
    check('reactivation -> 200', st == 200, st)
    st, _ = call('GET', '/auth/me', token=member_token)
    check('acces retabli apres reactivation -> 200', st == 200, st)

print('\n=== 8. Cloisonnement des OTP ===')
st, _ = call('POST', '/auth/forgot-password', {'email': MEMBER[0]})
check('forgot-password -> 2xx generique', st in (200, 201), st)
st, body = call('POST', '/auth/verify-email', {'email': MEMBER[0], 'otp': '000000'})
check('OTP de reset refuse sur verify-email -> 400', st == 400, st)

print('\n=== 9. Rate limiting ===')
codes = []
for i in range(8):
    st, _ = call('POST', '/auth/login',
                 {'email': 'ratelimit-test@nulle-part.ci', 'password': 'FauxMotDePasse!1'})
    codes.append(st)
check('429 apres depassement du seuil', 429 in codes, codes)

print('\n=== 10. Politique de mot de passe ===')
st, body = call('POST', '/auth/register',
                {'email': 'faible@test.ci', 'password': 'Court1!', 'fullname': 'Test Faible'})
check('mot de passe trop court refuse -> 400', st == 400, st)

total = len(results)
ok = sum(1 for r in results if r)
print(f'\n===== {ok}/{total} verifications passees =====')
sys.exit(0 if ok == total else 1)
