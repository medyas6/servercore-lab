/* ============================================================
   MEDC ServerCore Lab Training — application shell
   hash router, les pages, store mchtarka, des helpers dyal UI.
   ============================================================ */

/* ---------------- store li katb9a m7fouda ---------------- */
const STORE_KEY = "servercore-lab-v1";

function defaultState() {
  return {
    v: 1,
    roles: [],
    domain: "WORKGROUP",
    hostname: "WINSRV-CORE",
    ipAddress: "192.168.10.10",
    prefixLength: "24",
    gateway: "192.168.10.1",
    dnsServer: "127.0.0.1",
    dhcp: { authorized: null },
    scopes: [],
    exclusions: [],
    reservations: [],
    options: {},
    exercises: {},
    /* شجرة Active Directory: forest وحدة، containers/OUs، وles objets لداخل */
    ad: {
      forest: "lab.local",
      domain: "lab.local",
      dc: "DC01.lab.local",
      site: "Default-First-Site-Name",
      functionalLevel: "Windows Server 2016",
      containers: [
        { name: "Domain Controllers", type: "ou" },
        { name: "Users", type: "container" },
        { name: "Computers", type: "container" },
        { name: "IT", type: "ou" },
        { name: "HR", type: "ou" },
        { name: "Students", type: "ou" },
      ],
      users: [
        { name: "Administrator", container: "Users", enabled: true, groups: ["Domain Admins"] },
        { name: "student01", container: "IT", enabled: true, groups: ["LabAdmins"] },
      ],
      computers: [
        { name: "DC01", container: "Domain Controllers" },
        { name: "PC-IT01", container: "IT" },
        { name: "PC-HR01", container: "HR" },
      ],
      groups: [
        { name: "Domain Admins", scope: "Global", container: "Users", members: ["Administrator"] },
        { name: "LabAdmins", scope: "Global", container: "IT", members: ["student01"] },
      ],
    },
  };
}

const store = {
  data: defaultState(),
  load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) this.data = Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) { this.data = defaultState(); }
  },
  save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this.data)); } catch (e) {}
  },
  reset() {
    this.data = defaultState();
    this.save();
    try { localStorage.removeItem("servercore-term-history-v1"); } catch (e) {}
  },
};
store.load();

/* ---------------- helpers ---------------- */
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function prefixToMask(plen) {
  const n = parseInt(plen, 10);
  if (isNaN(n) || n < 0 || n > 32) return "255.255.255.0";
  let mask = 0;
  for (let i = 0; i < n; i++) mask |= (1 << (31 - i));
  mask >>>= 0;
  return [(mask >>> 24) & 255, (mask >>> 16) & 255, (mask >>> 8) & 255, mask & 255].join(".");
}

/* ---------- lanimation dyal background f hero (no9at khdar tayt7rko bchwiya) ---------- */
let heroRAF = null;
function stopHeroFX() {
  if (heroRAF) { cancelAnimationFrame(heroRAF); heroRAF = null; }
}
function initHeroFX() {
  stopHeroFX();
  const cv = document.getElementById("hero-canvas");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const hero = cv.parentElement;
  const W = cv.width = hero.offsetWidth, H = cv.height = hero.offsetHeight;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    ctx.fillStyle = "rgba(61,220,132,0.05)";
    for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    return;
  }
  const N = Math.min(90, Math.floor(W * H / 9000));
  const ps = [];
  for (let i = 0; i < N; i++) ps.push({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.3) * 0.35, vy: (Math.random() - 0.6) * 0.3,
    r: Math.random() * 1.8 + 0.6, a: Math.random() * 0.5 + 0.15,
  });
  function frame() {
    ctx.clearRect(0, 0, W, H);
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.283);
      ctx.fillStyle = `rgba(61,220,132,${p.a * 0.5})`;
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(61,220,132,0.07)";
    ctx.lineWidth = 1;
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y;
      if (dx * dx + dy * dy < 7000) {
        ctx.beginPath(); ctx.moveTo(ps[i].x, ps[i].y); ctx.lineTo(ps[j].x, ps[j].y); ctx.stroke();
      }
    }
    heroRAF = requestAnimationFrame(frame);
  }
  frame();
}

let toastTimer = null;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

function copyText(text) {
  const done = () => toast("Copied to clipboard");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}
function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch (e) {}
  document.body.removeChild(ta);
  done();
}

function kvTable(rows) {
  return `<div class="card" style="padding:6px 20px">` +
    rows.map(r => `<div class="kv"><span class="k">${esc(r[0])}</span><span class="v">${esc(r[1])}</span></div>`).join("") +
    `</div>`;
}

function dataTable(headers, rows) {
  return `<div class="card" style="padding:6px 8px;overflow-x:auto"><table><thead><tr>` +
    headers.map(h => `<th>${esc(h)}</th>`).join("") +
    `</tr></thead><tbody>` +
    rows.map(r => `<tr>` + r.map(c => `<td>${esc(c)}</td>`).join("") + `</tr>`).join("") +
    `</tbody></table></div>`;
}

/* carte dyal quick-command: command + Copy + Test in Simulator */
function cmdCard(cmd, desc) {
  return `<div class="card cmd-card">
    <div class="cmd-line"><code>${esc(cmd)}</code></div>
    ${desc ? `<div style="font-size:13px;color:var(--muted)">${esc(desc)}</div>` : ""}
    <div class="btn-row">
      <button class="btn" data-copy="${esc(cmd)}">Copy</button>
      <button class="btn primary" data-test="${esc(cmd)}">Test in Simulator</button>
    </div>
  </div>`;
}

function pageHead(title, desc) {
  return `<h1>${esc(title)}</h1><p class="page-desc">${esc(desc)}</p>`;
}

/* ---------------- navigation ---------------- */
const NAV_GROUPS = [
  { title: null, items: [
    ["#/", "Dashboard", "&#8962;"],
    ["#/terminal", "Terminal", "&#9000;"],
  ]},
  { title: "Labs", items: [
    ["#/active-directory", "Active Directory", "&#128101;"],
    ["#/roles", "Roles & Features", "&#128193;"],
    ["#/dns", "DNS Server", "&#127760;"],
    ["#/dhcp", "DHCP Server", "&#128268;"],
    ["#/group-policy", "Group Policy", "&#128274;"],
    ["#/networking", "Networking", "&#128759;"],
    ["#/storage", "Storage", "&#128190;"],
    ["#/security", "Security", "&#128737;"],
    ["#/router-lab", "Router Lab", "&#128225;"],
  ]},
  { title: "Révision", items: [
    ["#/learning-lab", "Learning Lab", "&#127979;"],
    ["#/quiz", "Quiz & Défis", "&#10067;"],
  ]},
  { title: "Ressources", items: [
    ["#/command-reference", "Command Reference", "&#128218;"],
    ["#/settings", "Settings", "&#9881;"],
    ["#/about", "About", "&#9432;"],
  ]},
];

function renderNav() {
  const hash = location.hash || "#/";
  document.getElementById("nav").innerHTML = NAV_GROUPS.map(g =>
    (g.title ? `<div class="nav-group">${esc(g.title)}</div>` : "") +
    g.items.map(([href, label, ico]) =>
      `<a href="${href}" class="${href === hash ? "active" : ""}"><span class="ico">${ico}</span>${esc(label)}</a>`
    ).join("")
  ).join("");
}

/* ---------------- router ---------------- */
let currentTerm = null;

const ROUTES = {};

function render() {
  const hash = (location.hash || "#/").split("?")[0];
  stopHeroFX();
  renderNav();
  const app = document.getElementById("app");
  const fn = ROUTES[hash] || ROUTES["#/"];
  currentTerm = null;
  app.innerHTML = fn();
  if (fn.init) fn.init();
  document.getElementById("sidebar").classList.remove("open");
  window.scrollTo(0, 0);
}

function route(path, fn, init) {
  fn.init = init || null;
  ROUTES[path] = fn;
}

/* "Test in Simulator": taykhdem command f page terminal */
function testInSimulator(cmd) {
  const onTerminal = (location.hash || "#/") === "#/terminal";
  if (onTerminal && currentTerm) { currentTerm.execute(cmd); return; }
  window.__pendingCommand = cmd;
  if (onTerminal) render();
  else location.hash = "#/terminal";
}

/* ---------------- click delegation lkolchi ---------------- */
document.addEventListener("click", (e) => {
  const t = e.target;
  const closest = (sel) => t.closest(sel);

  const copyBtn = closest("[data-copy]");
  if (copyBtn) { copyText(copyBtn.getAttribute("data-copy")); return; }

  const testBtn = closest("[data-test]");
  if (testBtn) { testInSimulator(testBtn.getAttribute("data-test")); return; }

  const gotoBtn = closest("[data-goto]");
  if (gotoBtn) { location.hash = gotoBtn.getAttribute("data-goto"); return; }

  const exHead = closest(".ex-head");
  if (exHead) { exHead.parentElement.classList.toggle("open"); return; }

  const refHead = closest(".ref-head");
  if (refHead) { refHead.parentElement.classList.toggle("open"); return; }

  const exCheck = closest("[data-ex]");
  if (exCheck && exCheck.tagName === "INPUT") {
    const id = exCheck.getAttribute("data-ex");
    if (exCheck.checked) store.data.exercises[id] = true;
    else delete store.data.exercises[id];
    store.save();
    updateProgress();
    const num = exCheck.closest(".exercise").querySelector(".num");
    if (num) { num.classList.toggle("done", exCheck.checked); num.textContent = exCheck.checked ? "✓" : id; }
    return;
  }

  if (closest("#menu-toggle")) { document.getElementById("sidebar").classList.toggle("open"); return; }

  if (closest("#dora-run")) { runDora(); return; }
  if (closest("#reset-open")) { document.getElementById("reset-modal").classList.add("show"); return; }
  if (closest("#reset-cancel")) { document.getElementById("reset-modal").classList.remove("show"); return; }
  if (closest("#reset-confirm")) {
    store.reset();
    document.getElementById("reset-modal").classList.remove("show");
    toast("Lab reset — all simulated state erased");
    render();
    return;
  }
  if (closest("#export-json")) { exportState(); return; }
  if (closest("#import-file-btn")) { document.getElementById("import-file").click(); return; }
  if (closest("#import-text-btn")) { importFromText(); return; }
});

/* ============================================================
   PAGES
   ============================================================ */

/* ---------------- Dashboard ---------------- */
route("#/", () => {
  const roleBadges = store.data.roles.length
    ? store.data.roles.map(r => `<span class="badge blue">${esc(r)}</span>`).join(" ")
    : `<span class="badge">No roles installed yet</span>`;
  const doneCount = Object.keys(store.data.exercises).length;
  const d = store.data;
  const serverRows = [
    ["Hostname", d.hostname || "WINSRV-CORE"],
    ["Operating System", "Windows Server 2019 Standard"],
    ["Domain status", (d.domain || "WORKGROUP") === "WORKGROUP" ? "Workgroup" : d.domain],
    ["IPv4 address", d.ipAddress || "192.168.10.10"],
  ];
  const netRows = [
    ["Subnet mask", prefixToMask(d.prefixLength || "24")],
    ["Default gateway", d.gateway || "192.168.10.1"],
    ["DNS server", d.dnsServer || "127.0.0.1"],
    ["Adapter", "Ethernet (ifIndex 12)"],
  ];
  return `
  <div class="hero">
    <canvas class="hero-canvas" id="hero-canvas" aria-hidden="true"></canvas>
    <div class="hero-kicker"><span class="pulse-dot"></span>SIMULATED WINDOWS SERVER 2019 &middot; LIVE LAB</div>
    <h1 class="hero-title">MEDC ServerCore <span>Lab Training</span></h1>
    <p class="hero-sub">Install roles, run PowerShell commands and track your progress &mdash; everything runs in your browser, nothing touches a real server.</p>
    <div class="btn-row hero-actions">
      <button class="btn primary" data-goto="#/terminal">Open terminal</button>
      <button class="btn" data-goto="#/quiz">Start QCM quiz</button>
      <button class="btn" data-goto="#/learning-lab">Learning lab</button>
    </div>
  </div>
  <div class="card">
    <h2>&#128994; Getting started</h2>
    <div style="font-size:14px;color:var(--muted);line-height:2">
      1. Open the <a href="#/terminal" style="color:var(--accent)">Terminal</a> and run <code>Get-Command</code><br>
      2. Install a role, e.g. <code>Install-WindowsFeature DHCP</code><br>
      3. Follow the <a href="#/learning-lab" style="color:var(--accent)">Learning Lab</a> exercises step by step<br>
      4. Look up any command in the <a href="#/command-reference" style="color:var(--accent)">Command Reference</a>
    </div>
  </div>
  <div class="grid grid-3">
    <div class="card"><h2>Server</h2>${kvTable(serverRows)}</div>
    <div class="card"><h2>Network</h2>${kvTable(netRows)}</div>
    <div class="card"><h2>Lab progress</h2>
      <div style="font-size:34px;font-weight:800;color:var(--accent)">${doneCount}<span style="font-size:16px;color:var(--muted)">/15</span></div>
      <div style="font-size:13px;color:var(--muted);margin:6px 0 12px">exercises completed</div>
      <button class="btn primary" data-goto="#/learning-lab">Continue learning</button>
    </div>
  </div>
  <div class="card">
    <h2>Installed roles</h2>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">${roleBadges}</div>
    <div class="btn-row"><button class="btn" data-goto="#/roles">Manage roles</button></div>
  </div>`;
},
() => initHeroFX());

/* ---------------- Terminal page ---------------- */
route("#/terminal",
  () => `${pageHead("PowerShell Terminal", "A simulated PowerShell session. State-changing commands update the lab in real time.")}<div id="term-mount"></div>`,
  () => { currentTerm = new SimTerminal(document.getElementById("term-mount"), store); }
);

/* ---------------- Roles & Features ---------------- */
route("#/roles", () => {
  const rows = SAMPLE.roles.map(([disp, name]) => {
    const installed = store.data.roles.includes(name);
    return `<tr><td>${esc(disp)}</td><td>${esc(name)}</td>
      <td>${installed ? '<span class="badge green">Installed</span>' : '<span class="badge">Available</span>'}</td></tr>`;
  }).join("");
  return `
  ${pageHead("Roles & Features", "Install or remove server roles. The dashboard reflects every change.")}
  <div class="card" style="padding:6px 8px;overflow-x:auto"><table>
    <thead><tr><th>Display name</th><th>Name</th><th>Status</th></tr></thead><tbody>${rows}</tbody>
  </table></div>
  <h2>Quick Commands</h2>
  ${cmdCard("Install-WindowsFeature DHCP -IncludeManagementTools", "Install the DHCP server role with management tools.")}
  ${cmdCard("Install-WindowsFeature DNS -IncludeManagementTools", "Install the DNS server role.")}
  ${cmdCard("Install-WindowsFeature AD-Domain-Services -IncludeManagementTools", "Install Active Directory Domain Services.")}
  ${cmdCard("Get-WindowsFeature", "List every role and feature with its install state.")}`;
});

/* ---------------- DHCP Server ---------------- */
route("#/dhcp", () => {
  const auth = store.data.dhcp.authorized;
  const authCard = auth
    ? `<span class="badge green">Authorized in AD</span>
       <div class="kv" style="margin-top:10px"><span class="k">DNS name</span><span class="v">${esc(auth.dnsName)}</span></div>
       <div class="kv"><span class="k">IP address</span><span class="v">${esc(auth.ip)}</span></div>`
    : `<span class="badge red">Not authorized</span>
       <div style="font-size:13px;color:var(--muted);margin-top:10px">Run <code>Add-DhcpServerInDC</code> in the terminal to authorize this server.</div>`;

  const scopes = store.data.scopes;
  const scopeRows = scopes.map(s =>
    `<tr><td>${esc(s.id)}</td><td>${esc(s.name)}</td><td>${esc(s.start)}</td><td>${esc(s.end)}</td><td>${esc(s.mask)}</td></tr>`
  ).join("");
  const scopeSection = scopes.length
    ? `<div class="card" style="padding:6px 8px;overflow-x:auto"><table>
        <thead><tr><th>ScopeId</th><th>Name</th><th>Start</th><th>End</th><th>Mask</th></tr></thead>
        <tbody>${scopeRows}</tbody></table></div>`
    : `<div class="card"><span class="badge">No scopes yet</span>
        <div style="font-size:13px;color:var(--muted);margin-top:10px">Install the DHCP role, authorize it, then add a scope.</div></div>`;

  const doraSteps = [
    ["D", "Discover", "The client broadcasts a DHCPDISCOVER looking for any available server."],
    ["O", "Offer", "Servers answer with a DHCPOFFER proposing an IP address and options."],
    ["R", "Request", "The client broadcasts a DHCPREQUEST accepting one of the offers."],
    ["A", "Acknowledge", "The chosen server replies DHCPACK — the lease is now active."],
  ].map(([L, n, d]) => `
    <div class="dora-step" data-dora="${L}">
      <div class="letter">${L}</div><div class="sname">${n}</div><div class="sdesc">${d}</div>
    </div>`).join("");

  return `
  ${pageHead("DHCP Server", "Install, authorize, and configure IPv4 scopes on the simulated DHCP server.")}
  <div class="grid grid-2">
    <div class="card"><h2>Authorization</h2>${authCard}</div>
    <div class="card"><h2>Scopes (${scopes.length})</h2>${scopeSection}</div>
  </div>
  <div class="card">
    <h2>&#9889; DORA — how DHCP leasing works</h2>
    <div style="font-size:13px;color:var(--muted)">Watch the four-step handshake that happens every time a client gets an address. This visualizer is unique to this lab.</div>
    <div class="dora-steps">${doraSteps}</div>
    <div class="dora-log" id="dora-log">Press "Run simulation" to watch a DHCP handshake…</div>
    <div class="btn-row"><button class="btn primary" id="dora-run">Run simulation</button></div>
  </div>
  <h2>Quick Commands</h2>
  ${cmdCard("Install-WindowsFeature DHCP -IncludeManagementTools", "Install the DHCP role with management tools.")}
  ${cmdCard("Get-DhcpServerv4Scope", "List all configured IPv4 scopes.")}
  ${cmdCard("Add-DhcpServerInDC -DnsName DC01.lab.local -IPAddress 192.168.10.10", "Authorize this DHCP server in Active Directory.")}
  ${cmdCard("Add-DhcpServerv4Scope -Name 'Lab Clients' -StartRange 192.168.10.100 -EndRange 192.168.10.200 -SubnetMask 255.255.255.0", "Create a scope for lab clients.")}
  ${cmdCard("Set-DhcpServerv4OptionValue -ScopeId 10 -OptionId 3 -Value 192.168.10.1", "Set the router (default gateway) option on the scope.")}
  ${cmdCard("Get-DhcpServerv4Lease -ScopeId 10", "Show active leases (generated per session).")}`;
});

/* lanimation dyal DORA */
function runDora() {
  const log = document.getElementById("dora-log");
  const btn = document.getElementById("dora-run");
  if (!log || btn.disabled) return;
  btn.disabled = true;
  document.querySelectorAll(".dora-step").forEach(s => s.classList.remove("active", "done"));
  log.textContent = "";
  const script = [
    ["D", "CLIENT  →  *broadcast*   DHCPDISCOVER  (\"Is there a DHCP server out there?\")"],
    ["D", ""],
    ["O", "SERVER  →  CLIENT        DHCPOFFER     192.168.10.100  + mask 255.255.255.0, router 192.168.10.1"],
    ["O", ""],
    ["R", "CLIENT  →  *broadcast*   DHCPREQUEST   (\"I'll take 192.168.10.100, thanks!\")"],
    ["R", ""],
    ["A", "SERVER  →  CLIENT        DHCPACK       lease confirmed — address is now Active ✔"],
  ];
  let i = 0;
  const step = () => {
    if (i >= script.length) {
      document.querySelectorAll(".dora-step").forEach(s => s.classList.add("done"));
      log.textContent += "\n— handshake complete —";
      btn.disabled = false;
      return;
    }
    const [letter, line] = script[i];
    document.querySelectorAll(".dora-step").forEach(s => {
      s.classList.toggle("active", s.getAttribute("data-dora") === letter);
      if (s.getAttribute("data-dora") < letter) s.classList.add("done");
    });
    if (line) log.textContent += line + "\n";
    i++;
    setTimeout(step, 900);
  };
  step();
}

/* ---------------- DNS Server ---------------- */
route("#/dns", () => `
  ${pageHead("DNS Server", "Host forward lookup zones and records on the simulated DNS server.")}
  <div class="card"><h2>Zones</h2>
    <div class="btn-row" style="margin:0 0 10px"><span class="badge blue">lab.local — Primary</span><span class="badge">0.in-addr.arpa — Primary</span></div>
  </div>
  <h2>Records in lab.local</h2>
  ${dataTable(["Name", "Type", "Data"], SAMPLE.dnsRecords)}
  <h2>Quick Commands</h2>
  ${cmdCard("Install-WindowsFeature DNS -IncludeManagementTools", "Install the DNS server role.")}
  ${cmdCard("Add-DnsServerPrimaryZone -Name 'lab.local' -ZoneFile 'lab.local.dns'", "Create the forward lookup zone.")}
  ${cmdCard("Add-DnsServerResourceRecordA -Name 'DC01' -ZoneName 'lab.local' -IPv4Address '192.168.10.10'", "Publish the domain controller's A record.")}
  ${cmdCard("Get-DnsServerZone", "List hosted DNS zones.")}
  ${cmdCard("Resolve-DnsName -Name DC01.lab.local", "Test name resolution against the simulated DNS.")}`);

/* ---------------- Active Directory: ADUC tree b7al console l7a9i9iya ---------------- */
/* katbni DistinguishedName dyal object 7asab container li fih */
function adDN(obj, ad) {
  const cont = (ad.containers || []).find(c => c.name === obj.container);
  const pre = cont && cont.type === "ou" ? "OU" : "CN";
  return `CN=${obj.name},${pre}=${obj.container},DC=lab,DC=local`;
}

/* 7ala dyal chajara (chno m7loul / chno mselectionné) — ghir dyal session */
const ADUC = {
  expanded: { "d:lab.local": true },
  selected: "d:lab.local",
  toggle(id) {
    if (this.expanded[id]) delete this.expanded[id]; else this.expanded[id] = true;
    this.refresh();
  },
  select(id) { this.selected = id; this.refresh(); },
  refresh() {
    const root = document.getElementById("aduc-root");
    if (root) root.innerHTML = aducInner(store.data.ad);
  },
};
window.ADUC = ADUC;
/* bach la forêt tban m7loula men lowel, b7al ADUC ملي kat7elha */
(store.data.ad.containers || []).forEach(c => { ADUC.expanded["c:" + c.name] = true; });

/* paneau details 3la 7asab node li tselectionna */
function aducDetails(id, ad) {
  const kind = id[0], name = id.slice(2);
  const head = t => `<h2>${esc(t)}</h2>`;
  if (kind === "d") {
    const n = x => x.length;
    return head("Domain — " + ad.domain) + kvTable([
      ["Forest", ad.forest], ["Domain controller", ad.dc],
      ["Site", ad.site], ["Functional level", ad.functionalLevel],
      ["Organizational units", n(ad.containers.filter(c => c.type === "ou"))],
      ["Containers", n(ad.containers.filter(c => c.type === "container"))],
      ["Users", n(ad.users)], ["Computers", n(ad.computers)], ["Groups", n(ad.groups)],
    ]) + `<p class="muted">Click any node in the tree to inspect it. Changes made with the AD cmdlets in the terminal appear here.</p>`;
  }
  if (kind === "c") {
    const cont = ad.containers.find(c => c.name === name);
    if (!cont) return head(name);
    const objs = [...ad.users.filter(u => u.container === name), ...ad.computers.filter(o => o.container === name), ...ad.groups.filter(g => g.container === name)];
    return head((cont.type === "ou" ? "Organizational Unit — " : "Container — ") + name) + kvTable([
      ["Type", cont.type === "ou" ? "Organizational Unit" : "Container"],
      ["Distinguished name", (cont.type === "ou" ? "OU=" : "CN=") + name + ",DC=lab,DC=local"],
      ["Objects inside", objs.length ? objs.map(o => o.name).join(", ") : "(empty)"],
    ]);
  }
  if (kind === "u") {
    const u = ad.users.find(x => x.name === name);
    if (!u) return head(name);
    return head("User — " + u.name) + kvTable([
      ["Distinguished name", adDN(u, ad)],
      ["Account", u.enabled ? "Enabled" : "Disabled"],
      ["Location", u.container],
      ["Member of", u.groups.length ? u.groups.join(", ") : "(none)"],
    ]);
  }
  if (kind === "m") {
    const c = ad.computers.find(x => x.name === name);
    if (!c) return head(name);
    return head("Computer — " + c.name) + kvTable([
      ["Distinguished name", adDN(c, ad)],
      ["Location", c.container],
      ["Operating system", c.name === "DC01" ? "Windows Server 2019 Standard" : "Windows 10 Pro (simulated)"],
    ]);
  }
  if (kind === "g") {
    const g = ad.groups.find(x => x.name === name);
    if (!g) return head(name);
    return head("Group — " + g.name) + kvTable([
      ["Distinguished name", adDN(g, ad)],
      ["Group scope", g.scope],
      ["Location", g.container],
      ["Members", g.members.length ? g.members.join(", ") : "(none)"],
    ]);
  }
  return head("Active Directory");
}

/* chajara kamla: domain ← containers/OUs ← users/computers/groups */
function aducInner(ad) {
  ad = ad || store.data.ad;
  const icons = { m: "🖥️", u: "👤", g: "👥" };
  const contNodes = (ad.containers || []).map(c => {
    const cid = "c:" + c.name;
    const objs = [
      ...ad.computers.filter(o => o.container === c.name).map(o => ({ k: "m", o })),
      ...ad.users.filter(o => o.container === c.name).map(o => ({ k: "u", o })),
      ...ad.groups.filter(o => o.container === c.name).map(o => ({ k: "g", o })),
    ];
    const objHTML = objs.length
      ? objs.map(({ k, o }) => {
          const oid = k + ":" + o.name;
          const sel = ADUC.selected === oid ? " sel" : "";
          const extra = k === "u" && !o.enabled ? ' <span class="badge">disabled</span>' : "";
          return `<li><span class="tnode${sel}" onclick="ADUC.select('${oid}')"><span class="caret"></span>${icons[k]} ${esc(o.name)}${extra}</span></li>`;
        }).join("")
      : `<li><span class="tnode empty"><span class="caret"></span>(empty)</span></li>`;
    const open = ADUC.expanded[cid];
    const sel = ADUC.selected === cid ? " sel" : "";
    const cicon = c.type === "ou" ? "📁" : "📦";
    return `<li><span class="tnode${sel}"><span class="caret" onclick="ADUC.toggle('${cid}')">${open ? "▾" : "▸"}</span><span onclick="ADUC.select('${cid}')">${cicon} ${esc(c.name)}</span></span>${open ? `<ul class="tree">${objHTML}</ul>` : ""}</li>`;
  }).join("");
  const did = "d:" + ad.domain;
  const dsel = ADUC.selected === did ? " sel" : "";
  const dopen = ADUC.expanded[did];
  return `<div class="aduc">
    <div class="card aduc-tree"><h2>🌲 Forest</h2>
      <ul class="tree"><li><span class="tnode${dsel}"><span class="caret" onclick="ADUC.toggle('${did}')">${dopen ? "▾" : "▸"}</span><span onclick="ADUC.select('${did}')">🌐 ${esc(ad.domain)}</span></span>${dopen ? `<ul class="tree">${contNodes}</ul>` : ""}</li></ul>
    </div>
    <div class="card aduc-detail">${aducDetails(ADUC.selected, ad)}</div>
  </div>`;
}

route("#/active-directory", () => `
  ${pageHead("Active Directory", "Simulated lab.local domain with a real ADUC-style forest tree. Click nodes to inspect; manage everything from the terminal.")}
  <div id="aduc-root">${aducInner(store.data.ad)}</div>
  <h2>Quick Commands</h2>
  ${cmdCard("Get-ADForest", "Show the simulated forest.")}
  ${cmdCard("Get-ADDomain", "Show the simulated domain.")}
  ${cmdCard("Get-ADDomainController", "Show the domain controller.")}
  ${cmdCard("Get-ADUser -Filter *", "List all domain users.")}
  ${cmdCard("Get-ADUser -Identity 'student01'", "Show one user in detail.")}
  ${cmdCard("New-ADUser -Name 'yassine' -Path 'OU=Students,DC=lab,DC=local'", "Create a user inside the Students OU.")}
  ${cmdCard("Disable-ADAccount -Identity 'student01'", "Disable a user account.")}
  ${cmdCard("Enable-ADAccount -Identity 'student01'", "Re-enable a user account.")}
  ${cmdCard("Get-ADComputer -Filter *", "List all domain computers.")}
  ${cmdCard("New-ADComputer -Name 'PC-ST01' -Path 'OU=Students,DC=lab,DC=local'", "Join a computer object to the domain.")}
  ${cmdCard("Get-ADOrganizationalUnit -Filter *", "List all OUs and containers.")}
  ${cmdCard("New-ADOrganizationalUnit -Name 'Compta'", "Create a new OU at the domain root.")}
  ${cmdCard("Get-ADGroup -Filter *", "List all groups.")}
  ${cmdCard("Get-ADGroupMember -Identity 'LabAdmins'", "List the members of a group.")}
  ${cmdCard("New-ADGroup -Name 'ComptaGrp' -GroupScope Global", "Create a global security group.")}
  ${cmdCard("Add-ADGroupMember -Identity 'LabAdmins' -Members 'yassine'", "Add a user to a group.")}
  ${cmdCard("Install-ADDSForest -DomainName 'lab.local' -InstallDns", "Create the lab.local forest on this server.")}
  ${cmdCard("dcdiag", "Run domain controller diagnostics.")}`);

/* ---------------- Group Policy ---------------- */
route("#/group-policy", () => `
  ${pageHead("Group Policy", "Define and link Group Policy Objects in the simulated domain.")}
  <div class="card"><h2>Password policy (Default Domain Policy)</h2>${kvTable(SAMPLE.passwordPolicy)}</div>
  <h2>Linked GPOs</h2>
  ${dataTable(["Name", "Link target", "Status"], [["Default Domain Policy", "DC=lab,DC=local", "Enabled"], ["Lab Password Policy", "DC=lab,DC=local", "Not created yet"]])}
  <h2>Quick Commands</h2>
  ${cmdCard("New-GPO -Name 'Lab Password Policy'", "Create a new Group Policy Object.")}
  ${cmdCard("New-GPLink -Name 'Lab Password Policy' -Target 'DC=lab,DC=local'", "Link the GPO at the domain level.")}
  ${cmdCard("Get-GPO -All", "List all Group Policy Objects.")}
  ${cmdCard("gpupdate /force", "Force a policy refresh.")}`);

/* ---------------- Networking ---------------- */
route("#/networking", () => `
  ${pageHead("Networking", "Adapters, addressing and firewall rules on the simulated server.")}
  <div class="grid grid-2">
    <div class="card"><h2>Adapter — Ethernet</h2>${kvTable([["Status", "Up"], ["ifIndex", "12"], ["IPv4", "192.168.10.10/24"], ["Gateway", "192.168.10.1"], ["DNS", "127.0.0.1"]])}</div>
    <div class="card"><h2>Connectivity</h2>
      <div style="font-size:13px;color:var(--muted);margin-bottom:10px">Try the simulated diagnostics:</div>
      <div class="btn-row" style="margin-top:0">
        <button class="btn primary" data-test="Test-Connection -ComputerName 192.168.10.1 -Count 2">Ping gateway</button>
        <button class="btn primary" data-test="Test-NetConnection -ComputerName 192.168.10.1 -Port 53">Test port 53</button>
      </div>
    </div>
  </div>
  <h2>Firewall rules</h2>
  ${dataTable(["Display name", "Direction", "Action", "Enabled"], SAMPLE.firewall)}
  <h2>Quick Commands</h2>
  ${cmdCard("Get-NetAdapter", "List network adapters.")}
  ${cmdCard("Get-NetIPAddress", "Show the IPv4 configuration.")}
  ${cmdCard("New-NetFirewallRule -DisplayName 'Allow RDP' -Direction Inbound -Action Allow", "Create an inbound firewall rule.")}
  ${cmdCard("Test-Connection -ComputerName 192.168.10.1 -Count 2", "Simulated ping with replies.")}`);

/* ---------------- Storage ---------------- */
route("#/storage", () => `
  ${pageHead("Storage and File Services", "Disks, volumes and SMB shares on the simulated server.")}
  <h2>Disks</h2>
  ${dataTable(["#", "Friendly name", "Size", "Partition style", "Status"], SAMPLE.disks)}
  <h2>Volumes</h2>
  ${dataTable(["Drive", "Label", "File system", "Size", "Free"], SAMPLE.volumes)}
  <h2>SMB shares</h2>
  ${dataTable(["Name", "Path", "Description"], SAMPLE.shares)}
  <h2>Quick Commands</h2>
  ${cmdCard("Get-Disk", "List physical disks.")}
  ${cmdCard("Initialize-Disk -Number 1 -PartitionStyle GPT", "Initialize the RAW disk.")}
  ${cmdCard("New-Partition -DiskNumber 1 -UseMaximumSize -DriveLetter D", "Create a partition on disk 1.")}
  ${cmdCard("Format-Volume -DriveLetter D -FileSystem NTFS", "Format the new volume.")}
  ${cmdCard("New-SmbShare -Name 'Data' -Path 'D:\\Data'", "Publish an SMB file share.")}`);

/* ---------------- Security ---------------- */
route("#/security", () => {
  const services = (typeof SimTerminal !== "undefined" && SimTerminal.sharedServices) || SAMPLE.services;
  const rows = services
    .map(s => `<tr><td>${esc(s[0])}</td><td>${esc(s[1])}</td>
      <td>${s[2] === "Running" ? '<span class="badge green">Running</span>' : '<span class="badge">Stopped</span>'}</td></tr>`).join("");
  return `
  ${pageHead("Security and Administration", "Services, events and local accounts. Service changes made in the terminal appear here.")}
  <h2>Services</h2>
  <div class="card" style="padding:6px 8px;overflow-x:auto"><table>
    <thead><tr><th>Name</th><th>Display name</th><th>Status</th></tr></thead><tbody>${rows}</tbody>
  </table></div>
  <div class="btn-row">
    <button class="btn primary" data-test="Start-Service -Name Spooler">Start Spooler (test)</button>
    <button class="btn" data-test="Get-Service">Refresh via terminal</button>
  </div>
  <h2 style="margin-top:22px">Recent events</h2>
  ${dataTable(["Time", "Id", "Log", "Message"], SAMPLE.events)}
  <h2>Quick Commands</h2>
  ${cmdCard("Get-Service", "List services and their status.")}
  ${cmdCard("Start-Service -Name Spooler", "Start a stopped service.")}
  ${cmdCard("Get-EventLog -LogName System -Newest 5", "Read the most recent system events.")}`;
});

/* ---------------- Learning Lab ---------------- */
function updateProgress() {
  const el = document.getElementById("lab-progress");
  if (el) {
    const n = Object.keys(store.data.exercises).length;
    el.textContent = `Progress: ${n}/15 exercises`;
  }
}

/* ---------------- Quiz QCM ---------------- */
route("#/quiz",
  () => `${pageHead("Quiz & Défis — M202", "Révise à ta façon : QCM chronométré, ou missions PowerShell à taper au clavier.")}<div class="qtabs"><button class="qtab on" data-qtab="qcm">❓ QCM</button><button class="qtab" data-qtab="defi">⚡ Défi Commandes <span class="navbadge">NEW</span></button></div><div id="quiz-mount"></div>`,
  () => {
    const mount = document.getElementById("quiz-mount");
    const tabs = [...document.querySelectorAll("[data-qtab]")];
    const show = (which) => {
      tabs.forEach(b => b.classList.toggle("on", b.dataset.qtab === which));
      QuizApp.stopTimer(); QuizApp.unbindKeys(); DefiApp.stopAll();
      if (which === "qcm") QuizApp.mount(mount); else DefiApp.mount(mount);
    };
    tabs.forEach(b => b.onclick = () => show(b.dataset.qtab));
    show("qcm");
  }
);

/* ---------------- Router Lab ---------------- */
route("#/router-lab",
  () => `${pageHead("Router Lab", "Un routeur ZTE simulé : panneau admin complet, diagnostics, et modèle 3D interactif.")}<div id="router-mount"></div>`,
  () => { RouterLab.mount(document.getElementById("router-mount")); }
);

route("#/learning-lab", () => {
  const n = Object.keys(store.data.exercises).length;
  const items = EXERCISES.map((ex, i) => {
    const id = String(i + 1);
    const done = !!store.data.exercises[id];
    const steps = ex.steps.map(s => `
      <div class="step">
        <code>${esc(s.cmd)}</code>
        <div class="step-desc">${esc(s.desc)}</div>
        <div class="btn-row" style="margin-top:8px">
          <button class="btn" data-copy="${esc(s.cmd)}">Copy</button>
          <button class="btn primary" data-test="${esc(s.cmd)}">Test in Simulator</button>
        </div>
      </div>`).join("");
    return `
    <div class="exercise">
      <div class="ex-head">
        <span class="num ${done ? "done" : ""}">${done ? "✓" : id}</span>
        <span class="title">${esc(ex.title)}</span>
        <button class="btn">Show</button>
      </div>
      <div class="ex-body">
        <div class="label">Objective</div><div style="font-size:14px">${esc(ex.objective)}</div>
        <div class="label">Prerequisites</div><div style="font-size:14px">${esc(ex.prerequisites)}</div>
        <div class="label">Steps</div>${steps}
        <div class="label">Expected result</div><div style="font-size:14px">${esc(ex.expected)}</div>
        <div class="label">Validation</div><div style="font-size:14px">${esc(ex.validation)}</div>
        <div class="label">Common errors</div><div style="font-size:14px;color:var(--amber)">${esc(ex.errors)}</div>
        <label class="check-row"><input type="checkbox" data-ex="${id}" ${done ? "checked" : ""}> Mark this exercise as complete</label>
      </div>
    </div>`;
  }).join("");
  return `
  ${pageHead("Learning Lab", "Fifteen guided exercises that build your complete lab, step by step.")}
  <div class="card"><h2 id="lab-progress">Progress: ${n}/15 exercises</h2>
    <div style="font-size:13px;color:var(--muted)">Tick the checkbox when you finish an exercise — your progress is saved in this browser.</div>
  </div>
  ${items}`;
});

/* ---------------- Command Reference ---------------- */
const CATEGORIES = ["All categories", ...new Set(COMMANDS.map(c => c.category))];

route("#/command-reference",
  () => `
  ${pageHead("Command Reference", "Every simulated command, searchable, with syntax, examples and expected output.")}
  <div class="ref-toolbar">
    <input id="ref-search" placeholder="Search commands, syntax, or descriptions…" aria-label="Search commands">
    <select id="ref-cat" aria-label="Filter by category">
      ${CATEGORIES.map(c => `<option>${esc(c)}</option>`).join("")}
    </select>
  </div>
  <div class="ref-count" id="ref-count"></div>
  <div id="ref-list"></div>`,
  () => {
    const searchEl = document.getElementById("ref-search");
    const catEl = document.getElementById("ref-cat");
    const draw = () => {
      const q = searchEl.value.trim().toLowerCase();
      const cat = catEl.value;
      const list = COMMANDS.filter(c => {
        if (cat !== "All categories" && c.category !== cat) return false;
        if (!q) return true;
        return (c.name + " " + c.description + " " + c.syntax).toLowerCase().includes(q);
      });
      document.getElementById("ref-count").textContent = `${list.length} command(s) found`;
      document.getElementById("ref-list").innerHTML = list.map(c => `
        <div class="ref-item">
          <div class="ref-head">
            <span class="rname">${esc(c.name)}</span>
            <span class="badge">${esc(c.category)}</span>
            <span class="badge ${c.badge === "Reference" ? "amber" : "blue"}">${esc(c.badge || "Simulated")}</span>
          </div>
          <div class="ref-body">
            <div style="font-size:14px;margin:10px 0">${esc(c.description)}</div>
            <div class="label">Syntax</div><pre class="code">${esc(c.syntax)}</pre>
            <div class="label">Example</div><pre class="code">${esc(c.example)}</pre>
            <div class="label">Expected output</div><div style="font-size:13px">${esc(c.expected)}</div>
            <div class="label">Prerequisites</div><div style="font-size:13px">${esc(c.prerequisites)}</div>
            <div class="label">Privileges</div><div style="font-size:13px">${esc(c.privileges)}</div>
            <div class="label">Common errors</div><div style="font-size:13px;color:var(--amber)">${esc(c.errors)}</div>
            <div class="btn-row">
              <button class="btn" data-copy="${esc(c.example)}">Copy example</button>
              ${c.badge === "Reference" ? "" : `<button class="btn primary" data-test="${esc(c.example)}">Test in Simulator</button>`}
            </div>
          </div>
        </div>`).join("") || `<div class="card">No commands match your search.</div>`;
    };
    searchEl.addEventListener("input", draw);
    catEl.addEventListener("change", draw);
    draw();
  }
);

/* ---------------- Settings ---------------- */
function exportState() {
  const blob = new Blob([JSON.stringify(store.data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "servercore-lab-export.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  toast("Configuration exported as JSON");
}

function importFromText() {
  const ta = document.getElementById("import-text");
  try {
    const parsed = JSON.parse(ta.value);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.roles)) throw new Error("bad shape");
    store.data = Object.assign(defaultState(), parsed);
    store.save();
    toast("Configuration imported");
    render();
  } catch (e) {
    toast("Import failed — invalid JSON");
  }
}

route("#/settings", () => `
  ${pageHead("Settings", "Manage your local lab state. Everything is stored locally in your browser.")}
  <div class="card">
    <h2>Reset Lab</h2>
    <div style="font-size:13px;color:var(--muted);margin-bottom:12px">Erase all simulated state (roles, DHCP config, progress) and start over.</div>
    <button class="btn danger" id="reset-open">Reset Lab</button>
  </div>
  <div class="card">
    <h2>Export JSON</h2>
    <div style="font-size:13px;color:var(--muted);margin-bottom:12px">Download your current lab configuration as a JSON file.</div>
    <button class="btn" id="export-json">Export JSON</button>
  </div>
  <div class="card">
    <h2>Import Configuration</h2>
    <div class="btn-row" style="margin-top:0">
      <button class="btn" id="import-file-btn">Choose file</button>
      <input type="file" id="import-file" accept=".json,application/json" style="display:none">
    </div>
    <textarea id="import-text" placeholder="…or paste exported JSON here"></textarea>
    <button class="btn primary" id="import-text-btn">Import from text</button>
  </div>
  <div class="modal-backdrop" id="reset-modal">
    <div class="modal">
      <h2>Reset the entire lab?</h2>
      <p>This erases all simulated state stored in your browser and cannot be undone. Consider exporting your configuration first.</p>
      <div class="btn-row">
        <button class="btn" id="reset-cancel">Cancel</button>
        <button class="btn danger" id="reset-confirm">Reset</button>
      </div>
    </div>
  </div>`,
  () => {
    document.getElementById("import-file").addEventListener("change", (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => { document.getElementById("import-text").value = r.result; importFromText(); };
      r.readAsText(f);
    });
  }
);

/* ---------------- About ---------------- */
route("#/about", () => `
  ${pageHead("About & License", "What this project is and how you may use it.")}
  <div class="card"><h2>MEDC ServerCore Lab Training</h2>
    ${kvTable([
      ["Version", "1.1.0"],
      ["Released", "2026-10-09"],
      ["Created by", "medyas"],
      ["Type", "Educational simulator (client-side)"],
      ["Backend", "None — runs entirely in the browser"],
    ])}
  </div>
  <div class="card"><h2>Why I built this</h2>
    <div class="human-note">
      I'm Yassine. Here's what I realized: most students don't have a PC they can
      actually practice on — and the ones who do, their machines are too weak for
      VMs and heavy server setups. So I built the lab I wished existed: a Windows
      Server simulator that runs entirely in your browser. Nothing to install, no
      powerful PC needed — it even works from your phone. Type commands, break
      things safely, and quiz yourself like it's the real exam. Good luck on the
      EFM — and try to beat my high score.
    </div>
  </div>
  <div class="card"><h2>Changelog</h2>
    <ul class="changelog">
      <li><span class="ver">v1.7.1</span><span class="date">2026-10-26</span> — Nebula, exact mockup match: brighter nebula background, glass cards with gradient top line, glowing sidebar mark, gradient buttons — same labs and terminal.</li>
      <li><span class="ver">v1.7.0</span><span class="date">2026-10-26</span> — Nebula redesign: galaxy colours (cyan / violet / magenta), holographic sidebar, gradient hero and glowing terminal — same labs, same terminal, no heavy 3D, so it stays fast on phones.</li>
      <li><span class="ver">v1.6.1</span><span class="date">2026-10-19</span> — Sidebar reorganized: grouped navigation (Principal / Labs / Révision / Ressources) with a more modern look.</li>
      <li><span class="ver">v1.6.0</span><span class="date">2026-10-19</span> — New: Défi Commandes — l'inverse du QCM : je te donne une mission en français, tu tapes la commande PowerShell. 54 missions (dont 18 tirées des EFM officiels Rabat + Casa), chrono, séries et record local.</li>
      <li><span class="ver">v1.5.1</span><span class="date">2026-10-19</span> — Removed the AI Assistant: the DeepSeek API needs paid credit, so it made no sense for a free site. My bad for the detour — the aurora background stays, now across the whole app.</li>
      <li><span class="ver">v1.5.0</span><span class="date">2026-10-19</span> — New: AI Assistant (DeepSeek) — a tutor specialized in networks + Windows Server administration. You enter your own DeepSeek API key (stored only in your browser); no key or offline = no AI, the rest works as usual. Plus: animated aurora background across the whole app.</li>
      <li><span class="ver">v1.4.1</span><span class="date">2026-10-19</span> — Fixed: the Router Lab page was showing empty (the panel failed to mount). It renders correctly now — my bad.</li>
      <li><span class="ver">v1.4.0</span><span class="date">2026-10-19</span> — Router Lab goes full ZTE: the admin panel now looks exactly like a real ZTE page (white theme, live clock, dark tab bar), and the 3D router is white with 2 antennas, yellow LAN ports and a red WPS button — like the real box. Also fixed the 3D view sometimes staying black.</li>
      <li><span class="ver">v1.3.0</span><span class="date">2026-10-19</span> — Router Lab: a simulated ZTE router with a full admin panel (Home, Internet, Local Network, VoIP, Management & Diagnosis), a diagnostics test zone (WAN, internet, DNS, DHCP, WiFi checks + ping), break-it-fix-it scenarios, and an interactive 3D router with live LEDs and clickable ports.</li>
      <li><span class="ver">v1.2.0</span><span class="date">2026-10-18</span> — Active Directory goes full ADUC: a real forest tree (domain → OUs/containers → users, computers, groups) you can browse and click, plus ~25 working AD cmdlets in the terminal (Get/New/Set/Remove-ADUser, ADComputer, ADGroup, ADOrganizationalUnit, dcdiag…). 4 new ADUC quiz questions.</li>
      <li><span class="ver">v1.1.0</span><span class="date">2026-10-18</span> — New phosphor-green design, animated dashboard, QCM quiz (96 questions incl. real EFM ones), human About page. The site finally looks like I wanted.</li>
      <li><span class="ver">v1.0.1</span><span class="date">2026-10-18</span> — Fixed: terminal commands (rename, IP, DNS) now actually update the dashboard. Before that they just printed ✔ and changed nothing — my bad.</li>
      <li><span class="ver">v1.0.0</span><span class="date">2026-10-09</span> — First release: PowerShell simulator, DHCP/DNS/AD labs, 15 exercises, command reference.</li>
    </ul>
  </div>
  <div class="card"><h2>Please note</h2>
    <div style="font-size:14px;color:var(--muted);line-height:1.7">
      This is a training simulator. Commands are simulated and do not execute on a real operating system.
      All lab state is stored locally in your browser.
    </div>
  </div>
  <div class="card"><h2>License</h2>
    <ul style="font-size:14px;color:var(--muted);line-height:1.9;margin:0;padding-left:20px">
      <li>Personal and educational use, including classroom use, is allowed.</li>
      <li>Redistribution of the application is not permitted.</li>
      <li>Attribution to the creator is required when referencing this work.</li>
      <li>Microsoft, Windows, Windows Server, PowerShell and Active Directory are trademarks of Microsoft.</li>
      <li>This is an independent educational project, not affiliated with or endorsed by Microsoft.</li>
    </ul>
  </div>`);

/* ---------------- init ---------------- */
window.addEventListener("hashchange", render);
if (!location.hash) location.hash = "#/";
render();
