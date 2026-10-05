# RescueBase 

Integrated Shelter Management and Adoption Information System  RESCUEBASE 

**Stack:** React + Vite (frontend) · Node.js + Express (backend) · MongoDB Atlas + Mongoose (database) · Firebase Authentication (Google Sign-In)

---

## Project Structure

```
Rescuebasev2/
├── rescue-base/          # Frontend (React + Vite)
└── rescuebase-server/    # Backend (Node.js + Express API)
```

You need to run **both** the backend and the frontend at the same time, in two separate terminals.

---

## 1. Requirements

Install these first:

| Tool | Version | Check with |
|---|---|---|
| [Node.js](https://nodejs.org) (LTS) | 20 or higher | `node -v` |
| npm (comes with Node.js) | 10 or higher | `npm -v` |
| [Git](https://git-scm.com) | any | `git -v` |
| [MongoDB Compass](https://www.mongodb.com/products/compass) (optional) | any | — for viewing the database |

You also need access to:
- The team's **MongoDB Atlas** cluster (ask the team lead to add your IP under *Network Access*).
- The team's **Firebase** project config.

---

## 2. Clone the Project

```bash
git clone <repository-url>
cd Rescuebasev2
```

---

## 3. Set Up the Backend (`rescuebase-server`)

```bash
cd rescuebase-server
npm install
```

Create a file named **`.env`** inside `rescuebase-server/`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/rescuebase
```

> Ask the team lead for the real values. **Never commit `.env` to GitHub.**

Start the server:

```bash
npm run dev     
# or
npm start
```

You should see the server running on `http://localhost:5000` and a MongoDB connected message.

---

## 4. Set Up the Frontend (`rescue-base`)

Open a **second terminal**:

```bash
cd rescue-base
npm install
```

Create a file named **`.env`** inside `rescue-base/`:

```env
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

> Vite only reads variables that start with `VITE_`. Restart `npm run dev` after editing `.env`.

Start the frontend:

```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 5. Daily Workflow

```bash
git pull                      # get the latest changes
npm install                   # run again in BOTH folders if package.json changed
# Terminal 1
cd rescuebase-server && npm run dev
# Terminal 2
cd rescue-base && npm run dev
```

---

## 6. Available Scripts

**Frontend (`rescue-base`)**

| Command | What it does |
|---|---|
| `npm run dev` | Starts the dev server with hot reload |
| `npm run build` | Builds the production version into `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Checks code with ESLint |

**Backend (`rescuebase-server`)**

| Command | What it does |
|---|---|
| `npm run dev` | Starts the API with auto-restart (nodemon) |
| `npm start` | Starts the API normally |

---

## 7. Test Data (Optional)

To load sample dogs and cats, open MongoDB Compass → connect to the cluster → open the **`>_ MONGOSH`** tab → run the seed script shared by the team.

To clear all animals (keeps the collection):

```js
use rescuebase
db.animals.deleteMany({})
```

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| `'vite' is not recognized` / missing modules | Run `npm install` in that folder |
| `MongoServerSelectionError` / can't connect | Your IP isn't allowed in Atlas → *Network Access* → add your current IP |
| Frontend loads but no data shows | Backend isn't running, or `VITE_API_URL` is wrong |
| Google Sign-In popup fails | Check the Firebase values in `rescue-base/.env`; add `localhost` to Firebase → Authentication → *Authorized domains* |
| `Port 5000 already in use` | Close the other terminal running the server, or change `PORT` in `.env` |
| Changes to `.env` not working | Stop and restart `npm run dev` |
| `npm install` errors after pulling | Delete `node_modules` and `package-lock.json`, then run `npm install` again |

---

## 9. Git Rules for the Team

- Pull before you start working: `git pull`
- Work on your own branch: `git checkout -b feature/<your-feature>`
- Never commit `.env` or `node_modules/` (both should be in `.gitignore`)
- Write clear commit messages, e.g. `Add matching quiz submit endpoint`