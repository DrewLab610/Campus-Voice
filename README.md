# Campus-Voice (local, no backend)

A static, front-end-only Student Complaint Management System — plain
HTML5, CSS3, and vanilla JavaScript. This version has **no Supabase and
no server of any kind** — every account, complaint, and activity log
entry is stored in the browser's `localStorage`. Open the files (or
serve the folder) and it just works.

## What changed from the Supabase version

- No Supabase client, no API keys, no database to set up.
- Sign up / log in / log out for students works against data saved in
  `localStorage` (see `js/db.js`).
- No real email is ever sent, so:
  - Signup creates the account immediately — no "check your inbox"
    step.
  - "Forgot password" on the login page asks for your email and a new
    password directly, and updates it right away.
- The admin account is **fixed**, not a real signup: see `js/admin.js`.

## Project structure

```
campus-voice/
├── index.html          Landing page
├── login.html            Login + password reset
├── signup.html             Sign up (instant, no email step)
├── dashboard.html            Student portal — submit + track complaints
├── admin.html                  Admin login + all-complaints dashboard
├── css/
│   └── style.css                 All styling (unchanged)
├── js/
│   ├── utils.js                    Shared helpers (formatting, escaping, error messages)
│   ├── db.js                        All data storage — localStorage instead of Supabase
│   ├── auth.js                       Signup / login / logout / password reset
│   ├── dashboard.js                    Student dashboard logic (unchanged)
│   └── admin.js                          Admin dashboard logic + fixed admin login
└── README.md
```

Each page loads only the scripts it needs, always in this order:
`utils.js` → `db.js` → the page's own script (`auth.js`,
`dashboard.js`/`admin.js`).

## Admin login

The admin account is **not** created through sign up. It's a fixed
username/password checked directly in `js/admin.js`:

```js
const ADMIN_EMAIL = 'admin@campus-voice.local';
const ADMIN_PASSWORD = 'admin123';
```

Open `admin.html` and log in with those two values. Change them in
`js/admin.js` to whatever you'd like — since everything runs in the
browser, there's no real security here (anyone who opens the file can
read the password), so don't use this pattern for anything that needs
to be genuinely protected.

## Running it locally

No install, no build. Serve the folder rather than opening `index.html`
directly, since some browsers restrict local file requests and
`localStorage` behaves more predictably when served over `http://`:

```bash
cd campus-voice
python3 -m http.server 8080
# then open http://localhost:8080
```

## Using the app

**As a student**
1. `signup.html` → fill in name, matric number, email, and password.
   The account is created immediately.
2. Log in on `login.html`.
3. Use `dashboard.html`'s "Submit a complaint" tab to file one
   (category, urgency, description, optional attachment), and "My
   Complaints" to see it listed with a colour-coded status and full
   history.
4. A brand-new account starts with zero complaints — that's the
   intended empty state.

**As an admin**
1. Go to `admin.html` and log in with the fixed admin email/password
   from `js/admin.js` (defaults: `admin@campus-voice.local` /
   `admin123`).
2. Filter complaints by category, status, or urgency; open "Manage" on
   any row to change its status and add a resolution note (both are
   recorded in that complaint's status history); watch the stat cards
   update as you go.

## Where the data lives, and its limits

Everything is stored under one key in `localStorage`
(`cv_db_v1`), scoped to the browser + origin you're using. That means:

- Data is **per-browser** — a student who signs up in Chrome won't see
  that account in Firefox, or on a different device.
- Clearing site data / browsing data for this page wipes everything.
- There is no real access control: a student's "own complaints only"
  rule and the admin's "see everything" rule are both enforced by this
  JavaScript, not by a database. Anyone comfortable with browser
  devtools could inspect or edit the stored data directly. That's fine
  for a demo or coursework project — it is **not** appropriate for
  handling real students' real complaints.
- Passwords are only lightly obscured (a simple non-cryptographic
  hash), not securely hashed. Again: fine for a local demo, not for
  production use.

If you ever want real accounts, real access control, and multi-device
data, that's exactly what re-introducing a backend (Supabase or
otherwise) buys you back.

## Customising the look

All colours, type, spacing, and radii are CSS custom properties at the
top of `css/style.css` (`:root { --ink: …; --amber: …; }`), so the
palette and typefaces can be swapped in one place without touching
individual rules.
