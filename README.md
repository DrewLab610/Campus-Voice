# Campus-Voice

A static, front-end-only Student Complaint Management System — plain HTML5,
CSS3, and vanilla JavaScript. No backend, no external service of any kind:
every account, complaint, and status update lives in the browser's
**localStorage**. There is nothing to configure, no email to arrive, no
network call that can fail — open the page and it works.

## Why fully local

Earlier versions of this project used Firebase, then Supabase, for real
accounts and email verification. Both work, but both also depend on
external services (email delivery, database policies, API keys) that can
break in ways unrelated to the app itself — exactly the kind of friction
that isn't worth it for a class project you need to demo reliably. This
version trades "real" backend infrastructure for **guaranteed reliability**:
everything runs client-side, so there's nothing external that can go wrong.

The trade-off, to be upfront about it: data lives only in the browser that
created it. A different browser or device won't see the same accounts or
complaints, and clearing browser data wipes everything. For a coursework
demo this is a reasonable trade — for real deployment you'd want a real
backend.

## Project structure

```
campus-voice/
├── index.html          Landing page
├── login.html            Login + forgot password (via matric confirmation)
├── signup.html             Sign up — account works immediately, no email step
├── dashboard.html            Student portal — submit + track complaints
├── admin.html                 Admin login + all-complaints dashboard
├── css/
│   └── style.css                Design tokens + all styling
├── js/
│   ├── utils.js                    Shared helpers
│   ├── db.js                        localStorage data layer
│   ├── auth.js                       Signup / login / logout / password reset
│   ├── dashboard.js                   Student dashboard logic
│   └── admin.js                        Admin dashboard logic
└── README.md
```

## Running it

No install, no build, no accounts to create anywhere. Serve the folder
(some browsers restrict local file access, so avoid double-clicking
`index.html` directly):

```bash
cd campus-voice
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploying to GitHub Pages

1. Push this folder's contents to a GitHub repository.
2. **Settings → Pages** → Source: "Deploy from a branch" → pick your
   branch and the `/ (root)` folder → Save.
3. GitHub gives you a URL like `https://<username>.github.io/<repo>/` —
   that's the whole app, live, with nothing else to configure.

## Using it

**As a student**
1. `signup.html` → fill in name, matric number, email, password → you're
   taken straight to the dashboard, logged in.
2. "Submit a complaint" → pick category and urgency, describe the issue,
   optionally attach an image or PDF.
3. "My Complaints" → see every complaint you've filed with a colour-coded
   status and its full history. A new account correctly starts with zero
   complaints.
4. "Log out" clears your session — logging back in (or opening the site
   in another browser) never shows another student's data, since every
   complaint is looked up by your own account only.
5. Forgot your password? Use "Forgot password?" on the login page —
   confirming your email + matric number lets you set a new one, no
   email required.

**As an admin**
1. `admin.html` → log in with **admin** / **admin123** (change this
   under "Change admin password" once you're in).
2. See every complaint from every student — filter by category, status,
   or urgency.
3. Click **Manage** on any complaint to see the full detail, add an
   optional note, and choose one of four actions: **Approve**,
   **Process** (marks it "In Progress"), **Resolve**, or **Reject**.
   Each action is recorded in that complaint's status history with a
   timestamp, so the student sees exactly what happened and when.
4. Stat cards at the top update live: total complaints, awaiting review,
   approved, in progress, resolved, and rejected.

## Data model (localStorage keys)

| Key | Shape | Purpose |
|---|---|---|
| `cv_users` | `{ [email]: { name, matric, email, passwordHash, createdAt } }` | Student accounts |
| `cv_complaints` | `[ { id, studentEmail, studentName, studentMatric, category, urgency, description, attachment, status, statusHistory: [...], createdAt } ]` | All complaints |
| `cv_activity` | `[ { id, email, action, detail, timestamp } ]` | Login/logout/submit/view/admin-action log |
| `cv_session` | `{ email } \| null` | Current signed-in student |
| `cv_admin_session` | `{ at } \| null` | Current admin session |
| `cv_admin_creds` | `{ username, passwordHash }` | Admin login (defaults to admin / admin123, changeable in the admin dashboard) |

## Customising the look

All colours, type, spacing, and radii are CSS custom properties at the top
of `css/style.css` (`:root { --ink: …; --amber: …; }`).
