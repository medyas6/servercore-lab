# 🖥️ MEDC ServerCore Lab Training

A **client-side Windows Server administration simulator** for training and self-study.
Practice PowerShell, DHCP, DNS, Active Directory, Group Policy and more — right in
your browser, with zero backend and zero risk.

Created by **medyas** · © 2026 medyas. All rights reserved.

> **Update 18/10/2026** — I redesigned the dashboard (new charcoal-black theme, animated
> header, phosphor-green glow) and added a **QCM quiz mode**: 96 questions across
> 10 modules, including 25 real EFM questions, timed answers with a speed bonus,
> keyboard shortcuts, and a local leaderboard. If you're in my class — try to beat
> my score.

## ✨ Features

- **QCM quiz mode** — 96 questions (25 from real EFM exams), 30s timer per question,
  speed bonus, explanations after each answer, "review my mistakes" mode, EFM-only
  filter, and a local top-10 leaderboard
- **PowerShell simulator** — 60+ simulated cmdlets with `↑↓` history, `Tab` completion,
  `Get-Help`, `Get-Command`, and persistent command history
- **15 lab sections** — Dashboard, Terminal, Quiz QCM, Active Directory, Roles & Features, DNS,
  DHCP, Group Policy, Networking, Storage, Security, Learning Lab, Command Reference,
  Settings, About
- **Live lab state** — installing roles, authorizing DHCP, creating scopes… everything
  updates the UI in real time and persists in `localStorage`
- **DHCP DORA visualizer** — animated Discover → Offer → Request → Acknowledge handshake
- **Learning Lab** — 15 guided exercises with copy-and-run steps and progress tracking
- **Command Reference** — searchable catalog with syntax, examples and expected output
- **Settings** — reset the lab, export/import your configuration as JSON
- **No build step** — plain HTML/CSS/JS, no frameworks; the new fonts load from Google
  Fonts when you're online, with system fallbacks offline

## 🚀 Run it

Just open `index.html` in any modern browser. Or serve it locally:

```bash
cd servercore-lab
python3 -m http.server 8080
# open http://localhost:8080
```

## 🌐 Deploy to GitHub Pages (free hosting)

1. Create a new repository on GitHub (e.g. `servercore-lab`)
2. Push this folder:
   ```bash
   git init
   git add .
   git commit -m "MEDC ServerCore Lab Training v1.1.0"
   git branch -M main
   git remote add origin https://github.com/USERNAME/servercore-lab.git
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Deploy from a branch → `main` / `/ (root)`**
4. Your lab is live at `https://USERNAME.github.io/servercore-lab/`

## 🗂️ Project structure

```
servercore-lab/
├── index.html              # app shell (sidebar, banner, footer)
├── assets/
│   ├── css/style.css       # dark theme, responsive layout
│   └── js/
│       ├── data.js         # command catalog, exercises, sample data
│       ├── terminal.js     # PowerShell simulator engine
│       ├── quiz.js         # QCM quiz engine (96 questions, timer, leaderboard)
│       └── app.js          # hash router + page renderers + store
├── README.md
├── LICENSE
└── .gitignore
```

## 🧠 How it works

- `app.js` owns a tiny hash router (`#/dhcp`, `#/terminal`, …) and renders each page
  from templates. Shared lab state lives in `store` (persisted to `localStorage`).
- `terminal.js` tokenizes input (quote-aware), parses `-Named` parameters, and
  dispatches to simulated cmdlet handlers. Unknown commands produce the classic
  PowerShell "not recognized" error. DHCP leases are generated per session and
  intentionally not persisted — just like a real lab that reboots.
- "Test in Simulator" buttons anywhere in the app jump to the terminal and run
  the command for you.

## ⚠️ Disclaimer

Educational simulator. Commands are simulated and do not execute on a real
operating system. Independent project — not affiliated with or endorsed by Microsoft.

## 📄 License

See [LICENSE](LICENSE). Personal and educational (including classroom) use allowed;
redistribution not permitted; attribution required.
