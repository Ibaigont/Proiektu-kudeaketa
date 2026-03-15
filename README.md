# ESTIM - Bideojokoen Salmenta Web

ESTIM bideojokoak kudeatzeko eta kontsultatzeko CRUD (Create, Read, Update, Delete) web aplikazio bat da.
SPA + REST API arkitektura betetzen du eta frontend, backend eta datuen persistentzia bereizten ditu.

## Arkitektura

- `frontend/`: SPA (HTML, CSS, JavaScript).
- `backend/`: Express-ekin REST API eta negozio-logika.
- `data/`: SQLite-rekin persistentzia (`stim.sqlite`).

## Inplementatutako eskakizunak

1. Rol sistema:
- `admin`: bideojokoak sortu, editatu eta ezabatu ditzake.
- `standard`: katalogoa kontsultatu eta zerrenda pertsonala gorde dezake.

2. Erregistroa eta identifikazioa:
- Erregistroa erabiltzaile estandarrentzat eskuragarri.
- Saio-hasiera erabiltzaile guztientzat.
- Rola datu-basean gordeta dagoenaren arabera esleitzen da.

3. CRUD administratzaile rolaren azpian:
- Sortu: `POST /api/games`
- Kontsultatu: `GET /api/games`
- Eguneratu: `PUT /api/games/:id`
- Ezabatu: `DELETE /api/games/:id`

4. Erabiltzaile estandarrentzako datu-kontsulta:
- Bideojokoen zerrenda orokorra (`GET /api/games`).

5. Erabiltzaile estandarrentzako zerrenda pertsonala:
- Zerrenda pertsonalean gorde: `POST /api/favorites/:gameId`
- Zerrenda pertsonala ikusi: `GET /api/favorites`
- Zerrenda pertsonaletik kendu: `DELETE /api/favorites/:gameId`

## Teknologiak

- Node.js + Express
- SQLite
- JavaScript (frontend SPA)
- JWT autentifikaziorako

## Abian jartzea

1. Mendekotasunak instalatu:

```bash
npm install
```

2. Garapen moduan abiarazi:

```bash
npm run dev
```

Aukerakoa (aldaketetan berrabiarazte automatikoa, Node modernoa):

```bash
npm run dev:watch
```

3. Modu normalean abiarazi:

```bash
npm start
```

4. Nabigatzailean ireki:

`http://localhost:3000`

## Hasierako administratzaile erabiltzailea

Lehen abiaraztean automatikoki sortzen da:

- Erabiltzailea: `admin`
- Pasahitza: `admin123`

## Endpoint nagusiak

- Sistemaren osasuna: `GET /api/health`
- Erregistroa: `POST /api/auth/register`
- Saio-hasiera: `POST /api/auth/login`
- Uneko profila: `GET /api/auth/me`
- Bideojokoak: `/api/games`
- Zerrenda pertsonala: `/api/favorites`

## Oharrak

- Datu-basea automatikoki sortzen da `data/stim.sqlite`-n.
- JWT gakoak aldatzeko `JWT_SECRET` ingurune-aldagaia erabil daiteke.
