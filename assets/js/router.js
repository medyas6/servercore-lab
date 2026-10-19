/* ============================================================
   MEDC ServerCore Lab Training — Router Lab
   ZTE-style router simulator: admin panel, diagnostics, 3D.
   Kolchi client-side: state f localStorage, 3D b Three.js (CDN).
   ============================================================ */

const RouterLab = (() => {
  /* ---------- default state: kifach kaykoun router ملي كيتصنع ---------- */
  function defaultRouter() {
    return {
      wan: { plugged: true, type: "DHCP", ip: "41.140.22.18", gateway: "41.140.22.1", dns: "8.8.8.8" },
      internetUp: true,   /* jiha dyal ISP: wach l'internet wasel bsa7 */
      dnsUp: true,
      wifi: {
        on: true, ssid: "ZTE_Home_2G", ssid5: "ZTE_Home_5G",
        password: "changeme123", security: "WPA2",
        channel: 6, channel5: 36, hidden: false,
        congested: false, /* true = jiran 3amrin l channel */
      },
      lan: { ip: "192.168.1.1", mask: "255.255.255.0", dhcp: true, dhcpStart: "192.168.1.100", dhcpEnd: "192.168.1.200" },
      usb: { plugged: false, mode: "storage" },
      voip: { enabled: true, number: "+212 6 61 00 00 00", registered: true },
      firewall: true,
      devices: [
        { name: "MacBook", mac: "f0:18:98:57:99:5e", ip: "192.168.1.23", kind: "wlan", known: true },
        { name: "PC-01", mac: "ba:34:50:8d:16:98", ip: "192.168.1.26", kind: "wlan", known: true },
        { name: "Phone", mac: "8e:d5:76:18:72:76", ip: "192.168.1.7", kind: "wlan", known: true },
        { name: "PC-Fixe", mac: "a4:5e:60:c2:11:9a", ip: "192.168.1.50", kind: "lan", known: true },
      ],
      adminPass: "admin",
      scenario: null, /* 'slow-wifi' | 'neighbor' | 'challenge' | null */
    };
  }

  function getState() {
    const d = store.data;
    if (!d.router) { d.router = defaultRouter(); store.save(); }
    return d.router;
  }
  function save() {
    store.save();
    if (typeof Router3D !== "undefined" && Router3D.refresh) { try { Router3D.refresh(); } catch (e) {} }
  }
  function reset() {
    const sc = getState().scenario;
    store.data.router = defaultRouter();
    store.data.router.scenario = sc;
    save();
  }

  /* ============================================================
     DIAGNOSTICS — moteur dyal checks (pure, bla DOM)
     Kol check: { id, label, status: ok|warn|fail, detail, fix }
     ============================================================ */
  function runChecks(s) {
    const out = [];
    const inet = s.wan.plugged && s.internetUp;

    out.push({
      id: "wan-cable", label: "WAN cable",
      status: s.wan.plugged ? "ok" : "fail",
      detail: s.wan.plugged ? "Cable connected on the WAN port" : "WAN cable unplugged",
      fix: s.wan.plugged ? "" : "Plug the WAN cable back into the yellow WAN port (Internet tab).",
    });
    out.push({
      id: "internet", label: "Internet access",
      status: !s.wan.plugged ? "fail" : (s.internetUp ? "ok" : "fail"),
      detail: !s.wan.plugged ? "No link — check the WAN cable first" : (s.internetUp ? "ISP link is up (" + s.wan.ip + ")" : "ISP outage simulated"),
      fix: (!s.wan.plugged || s.internetUp) ? "" : "The ISP side is down (simulated). Toggle it back in Management & Diagnosis.",
    });
    out.push({
      id: "dns", label: "DNS resolution",
      status: !inet ? "fail" : (s.dnsUp ? "ok" : "fail"),
      detail: !inet ? "Cannot test without internet" : (s.dnsUp ? "DNS replies (" + s.wan.dns + ")" : "DNS server not answering"),
      fix: (!inet || s.dnsUp) ? "" : "Change the DNS server in Internet settings (try 8.8.8.8).",
    });
    out.push({
      id: "dhcp", label: "DHCP server",
      status: s.lan.dhcp ? "ok" : "fail",
      detail: s.lan.dhcp ? "Serving " + s.lan.dhcpStart + " – " + s.lan.dhcpEnd : "DHCP is OFF — new devices get no IP",
      fix: s.lan.dhcp ? "" : "Turn DHCP back ON in Local Network settings.",
    });
    out.push({
      id: "wifi", label: "WiFi broadcast",
      status: s.wifi.on ? "ok" : "fail",
      detail: s.wifi.on ? "Broadcasting \"" + s.wifi.ssid + "\"" + (s.wifi.hidden ? " (hidden)" : "") : "WiFi radio is OFF",
      fix: s.wifi.on ? "" : "Turn the WiFi radio back ON in Local Network settings.",
    });
    const weakPass = !s.wifi.password || s.wifi.password.length < 8;
    const weakSec = s.wifi.security === "Open" || s.wifi.security === "WEP";
    out.push({
      id: "wifi-sec", label: "WiFi security",
      status: (weakPass || weakSec) ? "fail" : "ok",
      detail: weakSec ? "Encryption is " + s.wifi.security + " — crackable in minutes"
        : (weakPass ? "Password too short (< 8 chars)" : s.wifi.security + ", strong password"),
      fix: (weakPass || weakSec) ? "Use WPA2/WPA3 with a password of 8+ characters." : "",
    });
    out.push({
      id: "wifi-channel", label: "WiFi channel",
      status: !s.wifi.on ? "fail" : (s.wifi.congested ? "warn" : "ok"),
      detail: !s.wifi.on ? "WiFi is off" : ("Channel " + s.wifi.channel + (s.wifi.congested ? " — crowded by neighbours, speed degraded" : " — clear")),
      fix: (!s.wifi.on || !s.wifi.congested) ? "" : "Switch to channel 1 or 11 (Local Network → WLAN).",
    });
    const intruders = s.devices.filter(d => d.kind === "wlan" && !d.known);
    out.push({
      id: "intruder", label: "Unknown devices",
      status: intruders.length ? "warn" : "ok",
      detail: intruders.length ? intruders.length + " unknown device(s) on your WiFi!" : "All connected devices are known",
      fix: intruders.length ? "Change the WiFi password (kicks everyone) or enable MAC filtering." : "",
    });
    return out;
  }

  function overall(checks) {
    if (checks.some(c => c.status === "fail")) return "fail";
    if (checks.some(c => c.status === "warn")) return "warn";
    return "ok";
  }

  /* ---------- ping simulé (pure) ---------- */
  function pingLines(host, s) {
    host = (host || "").trim();
    const lines = [];
    if (!host) return ["Usage: ping <host>  —  e.g. ping 8.8.8.8"];
    const inet = s.wan.plugged && s.internetUp;
    const lanIps = s.devices.map(d => d.ip).concat([s.lan.ip]);
    const target = host.toLowerCase();
    const isLan = lanIps.includes(target) || target === "192.168.1.1";
    if (isLan && s.lan.dhcp === false && false) { /* jamais: lan local dima */ }
    if (isLan) {
      for (let i = 0; i < 4; i++) lines.push("Reply from " + host + ": bytes=32 time=" + (1 + i) + "ms TTL=64");
      lines.push("Ping statistics: 4 sent, 4 received, 0% loss");
      return lines;
    }
    if (!inet) {
      for (let i = 0; i < 4; i++) lines.push("Request timed out.");
      lines.push("Ping statistics: 4 sent, 0 received, 100% loss  —  no internet route.");
      return lines;
    }
    if (!s.dnsUp && isNaN(parseInt(target.split(".").pop(), 10))) {
      return ["Ping request could not find host " + host + ". Check DNS."];
    }
    for (let i = 0; i < 4; i++) lines.push("Reply from " + host + ": bytes=32 time=" + (18 + i * 3) + "ms TTL=117");
    lines.push("Ping statistics: 4 sent, 4 received, 0% loss");
    return lines;
  }

  /* ============================================================
     SCENARIOS — wad3iyat mkhrrb9a: l user kay9ad, diagnostics kay7kem
     ============================================================ */
  const SCENARIOS = {
    "slow-wifi": {
      title: "Why is the WiFi so slow?",
      story: "Video calls keep freezing. The neighbours probably crowd your channel.",
      setup(s) { s.wifi.on = true; s.wifi.channel = 6; s.wifi.congested = true; },
      goal: "Move to a clear channel (1 or 11) and re-run diagnostics.",
      done(s) { return !s.wifi.congested && (s.wifi.channel === 1 || s.wifi.channel === 11); },
      hint: "Local Network → WLAN Settings → Channel.",
    },
    "neighbor": {
      title: "Someone is on your WiFi!",
      story: "An unknown device appeared in the WLAN list. Kick the intruder out.",
      setup(s) {
        if (!s.devices.some(d => d.mac === "de:ad:be:ef:00:01")) {
          s.devices.push({ name: "Unknown-Phone", mac: "de:ad:be:ef:00:01", ip: "192.168.1.66", kind: "wlan", known: false });
        }
      },
      goal: "Change the WiFi password (kicks everyone, intruder included).",
      done(s) { return !s.devices.some(d => d.kind === "wlan" && !d.known); },
      hint: "Local Network → WLAN Settings → change the password. The intruder loses access.",
    },
    "challenge": {
      title: "Total breakdown",
      story: "Nothing works: no internet, new devices get no IP, and the WiFi password is \"1234\". Fix everything, then prove it with diagnostics.",
      setup(s) { s.wan.plugged = false; s.lan.dhcp = false; s.wifi.password = "1234"; s.wifi.security = "WPA2"; },
      goal: "Replug WAN, turn DHCP back on, set a strong password — then all checks green.",
      done(s) {
        const c = runChecks(s);
        return c.every(x => x.status === "ok");
      },
      hint: "Three problems: Internet tab (WAN cable), Local Network (DHCP), WLAN (password).",
    },
  };

  function startScenario(id) {
    const s = getState();
    reset();
    const sc = SCENARIOS[id];
    if (sc) { sc.setup(getState()); }
    getState().scenario = id;
    save();
  }
  function stopScenario() { getState().scenario = null; save(); }
  function scenarioDone(id) {
    const sc = SCENARIOS[id];
    return sc ? sc.done(getState()) : false;
  }
  /* ila tbdl password: l intruder kaymchi (koulchi khass y3awd yconnecta) */
  function changeWifiPassword(pw) {
    const s = getState();
    s.wifi.password = pw;
    s.devices = s.devices.filter(d => d.known);
    save();
  }

  /* ============================================================
     UI — ZTE-style admin panel
     ============================================================ */
  const TABS = [
    ["home", "Home"],
    ["internet", "Internet"],
    ["lan", "Local Network"],
    ["voip", "VoIP"],
    ["mgmt", "Management & Diagnosis"],
    ["3d", "3D Router"],
  ];
  let curTab = "home";
  let devFilter = "wlan";
  let mountEl = null;

  function tabBtn(id, label) {
    return `<button class="ztab ${curTab === id ? "active" : ""}" data-rtab="${id}">${label}</button>`;
  }

  function mount(el) {
    mountEl = el;
    bindEvents();
    render();
  }

  function render() {
    if (!mountEl) return;
    const s = getState();
    const checks = runChecks(s);
    const ov = overall(checks);
    const dot = ov === "ok" ? "🟢" : (ov === "warn" ? "🟡" : "🔴");
    mountEl.innerHTML = `
      <div class="rhead">
        <div>
          <h2>Router Lab <span class="badge ${ov === "ok" ? "green" : (ov === "warn" ? "yellow" : "red")}">${dot} ${ov === "ok" ? "Healthy" : (ov === "warn" ? "Warnings" : "Issues found")}</span></h2>
          <p class="muted">ZTE-style simulator — configure everything, watch the 3D router and diagnostics react live.</p>
        </div>
        ${s.scenario ? `<div class="scen-banner">🎯 Scenario: <b>${esc(SCENARIOS[s.scenario].title)}</b>
          <button class="btn small" data-raction="scen-quit">Quit</button></div>` : ""}
      </div>
      <div class="ztabs">${TABS.map(([id, l]) => tabBtn(id, l)).join("")}</div>
      <div class="zpanel" id="zpanel">${renderTab(s, checks)}</div>`;
    if (curTab === "3d") Router3D.init(document.getElementById("r3d-mount"), s);
    else Router3D.destroy();
  }

  function renderTab(s, checks) {
    switch (curTab) {
      case "internet": return tabInternet(s);
      case "lan": return tabLan(s);
      case "voip": return tabVoip(s);
      case "mgmt": return tabMgmt(s, checks);
      case "3d": return `<div id="r3d-mount" class="r3d-mount"></div><div id="r3d-info" class="r3d-info">Click a port or LED for details. Drag to rotate.</div>`;
      default: return tabHome(s, checks);
    }
  }

  /* ---------- Home: diagram + device list (bhal screenshot ZTE) ---------- */
  function tabHome(s, checks) {
    const inet = s.wan.plugged && s.internetUp;
    const wlans = s.devices.filter(d => d.kind === "wlan");
    const lans = s.devices.filter(d => d.kind === "lan");
    const rows = (list) => list.length
      ? list.map(d => `<tr class="${d.known ? "" : "intruder"}">
          <td>${esc(d.name)}${d.known ? "" : " ⚠️"}</td><td class="mono">${esc(d.mac)}</td>
          <td class="mono">${esc(d.ip)}</td><td class="mono">—</td></tr>`).join("")
      : `<tr><td colspan="4" class="muted">No devices</td></tr>`;
    let devTable;
    if (devFilter === "wlan") devTable = rows(wlans);
    else if (devFilter === "lan") devTable = rows(lans);
    else if (devFilter === "usb") devTable = s.usb.plugged
      ? `<tr><td>USB ${esc(s.usb.mode)}</td><td class="mono">—</td><td class="mono">—</td><td class="mono">—</td></tr>`
      : `<tr><td colspan="4" class="muted">No USB device</td></tr>`;
    else devTable = (s.voip.enabled && s.voip.registered)
      ? `<tr><td>${esc(s.voip.number)}</td><td class="mono">—</td><td class="mono">—</td><td class="mono">—</td></tr>`
      : `<tr><td colspan="4" class="muted">VoIP not registered</td></tr>`;

    return `
    <div class="zdiagram">
      <div class="znode"><div class="zglobe">🌐</div><b>WAN Setting</b><br><span class="muted">${s.wan.plugged ? esc(s.wan.ip) : "unplugged"}</span></div>
      <div class="zlink ${inet ? "up" : "down"}"></div>
      <div class="znode"><div class="zshield">🛡️</div><b>Firewall</b><br><span class="muted">${s.firewall ? "ON" : "OFF"}</span></div>
      <div class="zlink ${inet ? "up" : "down"}"></div>
      <div class="znode"><div class="zrouter">📶</div><b>ZTE Router</b><br><span class="muted">${esc(s.lan.ip)}</span></div>
    </div>
    <div class="zcols">
      <div class="zdevmenu">
        <div class="zdevmenu-title">Device List</div>
        ${[["wlan", "WLAN Devices"], ["lan", "LAN Devices"], ["usb", "USB Devices"], ["voip", "VoIP Devices"]]
          .map(([id, l]) => `<button class="zdev ${devFilter === id ? "active" : ""}" data-rdev="${id}">${l}</button>`).join("")}
      </div>
      <div class="zdevtable">
        <div class="zdevtable-head"><b>${devFilter === "wlan" ? "WLAN" : devFilter === "lan" ? "LAN" : devFilter === "usb" ? "USB" : "VoIP"} Device List</b>
        ${devFilter === "wlan" ? `<button class="btn small" data-raction="goto-wlan">WLAN Setting</button>` : ""}</div>
        <table class="ztable"><thead><tr><th>Name</th><th>MAC Address</th><th>IPv4 Address</th><th>IPv6 Address</th></tr></thead>
        <tbody>${devTable}</tbody></table>
      </div>
    </div>
    <div class="zchecks-mini">${checks.map(c =>
      `<span class="zchk ${c.status}" title="${esc(c.detail)}">${c.status === "ok" ? "✓" : (c.status === "warn" ? "!" : "✗")} ${esc(c.label)}</span>`).join("")}
      <button class="btn small" data-raction="goto-diag">Full diagnostics</button>
    </div>`;
  }

  /* ---------- Internet tab ---------- */
  function tabInternet(s) {
    return `
    <h3>WAN Settings</h3>
    <div class="zform">
      <label>WAN cable
        <button class="btn small ${s.wan.plugged ? "danger" : "green-btn"}" data-raction="wan-toggle">${s.wan.plugged ? "Unplug cable" : "Plug cable"}</button>
        <span class="muted">${s.wan.plugged ? "Connected on WAN port" : "Unplugged — no internet"}</span>
      </label>
      <label>Connection type
        <select data-rfield="wan.type">
          ${["DHCP", "PPPoE", "Static"].map(t => `<option ${s.wan.type === t ? "selected" : ""}>${t}</option>`).join("")}
        </select>
      </label>
      <label>IP address <input class="zin" data-rfield="wan.ip" value="${esc(s.wan.ip)}" ${s.wan.type !== "Static" ? "disabled" : ""}></label>
      <label>Gateway <input class="zin" data-rfield="wan.gateway" value="${esc(s.wan.gateway)}" ${s.wan.type !== "Static" ? "disabled" : ""}></label>
      <label>DNS server <input class="zin" data-rfield="wan.dns" value="${esc(s.wan.dns)}"></label>
      <label>Firewall <input type="checkbox" data-rcheck="firewall" ${s.firewall ? "checked" : ""}></label>
    </div>
    <p class="muted">Tip: unplug the WAN cable and watch the 3D router LED turn red + diagnostics fail. Then plug it back.</p>`;
  }

  /* ---------- Local Network tab ---------- */
  function tabLan(s) {
    const w = s.wifi;
    return `
    <h3>WLAN Settings (WiFi)</h3>
    <div class="zform">
      <label>WiFi radio <input type="checkbox" data-rcheck="wifi.on" ${w.on ? "checked" : ""}></label>
      <label>SSID (2.4 GHz) <input class="zin" data-rfield="wifi.ssid" value="${esc(w.ssid)}"></label>
      <label>SSID (5 GHz) <input class="zin" data-rfield="wifi.ssid5" value="${esc(w.ssid5)}"></label>
      <label>Password <input class="zin" data-rfield="wifi.password" value="${esc(w.password)}"></label>
      <label>Security <select data-rfield="wifi.security">
        ${["Open", "WEP", "WPA2", "WPA3"].map(t => `<option ${w.security === t ? "selected" : ""}>${t}</option>`).join("")}
      </select></label>
      <label>Channel (2.4 GHz) <select data-rfield="wifi.channel">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(c => `<option value="${c}" ${w.channel === c ? "selected" : ""}>${c}${c === 6 && w.congested ? " (crowded!)" : ""}</option>`).join("")}
      </select></label>
      <label>Hide SSID <input type="checkbox" data-rcheck="wifi.hidden" ${w.hidden ? "checked" : ""}></label>
    </div>
    <h3>LAN Settings</h3>
    <div class="zform">
      <label>Router IP <input class="zin" data-rfield="lan.ip" value="${esc(s.lan.ip)}"></label>
      <label>DHCP server <input type="checkbox" data-rcheck="lan.dhcp" ${s.lan.dhcp ? "checked" : ""}></label>
      <label>DHCP range <input class="zin sm" data-rfield="lan.dhcpStart" value="${esc(s.lan.dhcpStart)}"> – <input class="zin sm" data-rfield="lan.dhcpEnd" value="${esc(s.lan.dhcpEnd)}"></label>
    </div>
    <h3>USB</h3>
    <div class="zform">
      <label>USB device
        <button class="btn small" data-raction="usb-toggle">${s.usb.plugged ? "Unplug" : "Plug a USB stick"}</button>
        <span class="muted">${s.usb.plugged ? "USB storage connected" : "Nothing plugged"}</span>
      </label>
      <label>Share mode <select data-rfield="usb.mode" ${s.usb.plugged ? "" : "disabled"}>
        ${["storage", "printer"].map(t => `<option ${s.usb.mode === t ? "selected" : ""}>${t}</option>`).join("")}
      </select></label>
    </div>`;
  }

  /* ---------- VoIP tab ---------- */
  function tabVoip(s) {
    const v = s.voip;
    const inet = s.wan.plugged && s.internetUp;
    const reg = v.enabled && inet;
    return `
    <h3>VoIP Settings (phone jack)</h3>
    <div class="zform">
      <label>VoIP enabled <input type="checkbox" data-rcheck="voip.enabled" ${v.enabled ? "checked" : ""}></label>
      <label>SIP number <input class="zin" data-rfield="voip.number" value="${esc(v.number)}"></label>
      <label>Status <span class="badge ${reg ? "green" : "red"}">${reg ? "Registered ✓" : "Not registered ✗"}</span></label>
    </div>
    <p class="muted">The phone LED on the 3D router follows this status. Registration needs internet.</p>`;
  }

  /* ---------- Management & Diagnosis tab ---------- */
  function tabMgmt(s, checks) {
    const ov = overall(checks);
    return `
    <h3>Diagnosis — test zone</h3>
    <p class="muted">One click checks the whole router. Green = healthy, red = broken (with the fix).</p>
    <button class="btn" data-raction="diag-run">▶ Run diagnostics</button>
    <span class="badge ${ov === "ok" ? "green" : (ov === "warn" ? "yellow" : "red" )}">${ov === "ok" ? "All green ✓" : (ov === "warn" ? "Warnings ⚠" : "Issues found ✗")}</span>
    <div id="diag-out" class="zdiag">${checks.map(diagRow).join("")}</div>
    <h3>Ping test</h3>
    <div class="zping">
      <input class="zin" id="ping-host" placeholder="8.8.8.8 or 192.168.1.1" value="8.8.8.8">
      <button class="btn small" data-raction="ping-run">Ping</button>
    </div>
    <pre id="ping-out" class="zterm">Ready.</pre>
    <h3>Scenarios — break it, fix it, prove it</h3>
    <div class="zscens">
      ${Object.entries(SCENARIOS).map(([id, sc]) => `
        <div class="zscen ${s.scenario === id ? "active" : ""}">
          <b>${esc(sc.title)}</b>
          <p class="muted">${esc(sc.story)}</p>
          ${s.scenario === id ? `
            <p>🎯 ${esc(sc.goal)}</p>
            <p class="muted">💡 ${esc(sc.hint)}</p>
            <button class="btn small" data-raction="scen-verify">Verify fix</button>
            <button class="btn small danger" data-raction="scen-quit">Quit</button>
            <div class="scen-result" id="scen-result"></div>` : `
            <button class="btn small" data-rscen="${id}">Start scenario</button>`}
        </div>`).join("")}
    </div>
    <h3>Administration</h3>
    <div class="zform">
      <label>ISP link (simulate outage) <input type="checkbox" data-rcheck="internetUp" ${s.internetUp ? "checked" : ""}></label>
      <label>DNS server up <input type="checkbox" data-rcheck="dnsUp" ${s.dnsUp ? "checked" : ""}></label>
      <label>Admin password <input class="zin" data-rfield="adminPass" value="${esc(s.adminPass)}"></label>
      <label>Firmware <button class="btn small" data-raction="fw-check">Check for update</button> <span class="muted" id="fw-out">V1.0.3 — up to date</span></label>
      <label>Reboot <button class="btn small" data-raction="reboot">Reboot router</button></label>
      <label>Factory reset <button class="btn small danger" data-raction="factory">Reset all</button></label>
    </div>`;
  }

  function diagRow(c) {
    return `<div class="zcheck ${c.status}">
      <span class="zico">${c.status === "ok" ? "✓" : (c.status === "warn" ? "!" : "✗")}</span>
      <div><b>${esc(c.label)}</b><br><span class="muted">${esc(c.detail)}</span>
      ${c.fix ? `<br><span class="zfix">🔧 ${esc(c.fix)}</span>` : ""}</div>
    </div>`;
  }

  /* ============================================================
     EVENTS — clicks w inputs (delegation 3la mountEl)
     ============================================================ */
  function setPath(path, val) {
    const s = getState();
    const parts = path.split(".");
    let o = s;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    const last = parts[parts.length - 1];
    if (last === "channel") val = parseInt(val, 10) || 6;
    o[last] = val;
    if (path === "wifi.password") changeWifiPassword(val);
    else save();
  }
  function setCheck(path, on) {
    const s = getState();
    const parts = path.split(".");
    let o = s;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = on;
    save();
  }

  function bindEvents() {
    mountEl.addEventListener("click", (e) => {
      const t = e.target;
      const rt = t.closest("[data-rtab]");
      if (rt) { curTab = rt.getAttribute("data-rtab"); render(); return; }
      const rd = t.closest("[data-rdev]");
      if (rd) { devFilter = rd.getAttribute("data-rdev"); render(); return; }
      const sc = t.closest("[data-rscen]");
      if (sc) { startScenario(sc.getAttribute("data-rscen")); curTab = "mgmt"; render(); toast("Scenario started — go break things, then fix them"); return; }
      const b = t.closest("[data-raction]");
      if (!b) return;
      const a = b.getAttribute("data-raction");
      const s = getState();
      if (a === "wan-toggle") { s.wan.plugged = !s.wan.plugged; save(); render(); }
      else if (a === "usb-toggle") { s.usb.plugged = !s.usb.plugged; save(); render(); }
      else if (a === "goto-wlan") { curTab = "lan"; render(); }
      else if (a === "goto-diag") { curTab = "mgmt"; render(); }
      else if (a === "diag-run") {
        document.getElementById("diag-out").innerHTML = runChecks(getState()).map(diagRow).join("");
        toast("Diagnostics complete");
      }
      else if (a === "ping-run") {
        const host = document.getElementById("ping-host").value;
        const out = document.getElementById("ping-out");
        out.textContent = "Pinging " + host + "...";
        setTimeout(() => { out.textContent = pingLines(host, getState()).join("\n"); }, 600);
      }
      else if (a === "scen-verify") {
        const id = getState().scenario;
        const ok = scenarioDone(id);
        const r = document.getElementById("scen-result");
        if (r) r.innerHTML = ok
          ? `<span class="badge green">✓ Fixed! Diagnostics would be all green.</span>`
          : `<span class="badge red">✗ Not yet — ${esc(SCENARIOS[id].hint)}</span>`;
      }
      else if (a === "scen-quit") { stopScenario(); reset(); render(); }
      else if (a === "fw-check") { document.getElementById("fw-out").textContent = "V1.0.3 — already the latest"; }
      else if (a === "reboot") { toast("Rebooting… (simulated 3s)"); setTimeout(() => { render(); toast("Router back online"); }, 1500); }
      else if (a === "factory") { if (confirm("Reset the router to factory defaults?")) { reset(); stopScenario(); render(); } }
    });
    mountEl.addEventListener("change", (e) => {
      const t = e.target;
      if (t.matches("[data-rfield]")) { setPath(t.getAttribute("data-rfield"), t.value); render(); }
      else if (t.matches("[data-rcheck]")) { setCheck(t.getAttribute("data-rcheck"), t.checked); render(); }
    });
  }

  /* mount kayt3ayet 3liha app.js */
  return {
    mount,
    runChecks, overall, defaultRouter, pingLines,
    startScenario, stopScenario, scenarioDone, SCENARIOS,
    getState, reset,
  };
})();

/* ============================================================
   Router3D — router b 3D: ports, LEDs, clickable, signal waves
   Three.js katloada ghir hna (lazy), ila makanetch internet kayban msg.
   ============================================================ */
const Router3D = (() => {
  let renderer = null, scene = null, camera = null, group = null;
  let raf = null, leds = {}, portMeshes = [], waves = [], waveT = 0;
  let mountEl = null, dragX = 0, dragging = false, lastX = 0;

  function loadThree(cb) {
    if (window.THREE) return cb();
    const sc = document.createElement("script");
    sc.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    sc.onload = cb;
    sc.onerror = () => {
      if (mountEl) mountEl.innerHTML = '<p class="muted" style="padding:2rem">3D needs internet once (Three.js CDN). The admin panel works fully offline.</p>';
    };
    document.head.appendChild(sc);
  }

  function ledColor(name, s) {
    const inet = s.wan.plugged && s.internetUp;
    const voipReg = s.voip.enabled && s.wan.plugged && s.internetUp;
    switch (name) {
      case "power": return 0x3ddc84;
      case "internet": return !s.wan.plugged ? 0x222222 : (s.internetUp ? 0x3ddc84 : 0xff4444);
      case "wifi24": case "wifi5": return s.wifi.on ? 0x3ddc84 : 0x222222;
      case "lan1": return s.devices.some(d => d.kind === "lan") ? 0x3ddc84 : 0x222222;
      case "lan2": case "lan3": case "lan4": return 0x222222;
      case "usb": return s.usb.plugged ? 0x3ddc84 : 0x222222;
      case "phone": return !s.voip.enabled ? 0x222222 : (voipReg ? 0x3ddc84 : 0xff4444);
      case "wps": return 0x222222;
      default: return 0x222222;
    }
  }

  function build(s) {
    scene = new THREE.Scene();
    scene.background = null;
    /* tele: bla antialias + pixelRatio na9s bach maylagich */
    const isMobile = (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) || mountEl.clientWidth < 520;
    camera = new THREE.PerspectiveCamera(45, mountEl.clientWidth / 400, 0.1, 100);
    camera.position.set(0, 2.6, 5.4);
    camera.lookAt(0, 0.2, 0);

    renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.setSize(mountEl.clientWidth, 400);
    mountEl.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(3, 6, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x3ddc84, 0.35);
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    group = new THREE.Group();
    scene.add(group);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x161a22, roughness: 0.55, metalness: 0.35 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 2.3), bodyMat);
    body.position.y = 0.28;
    group.add(body);
    /* khat akhdar bhal l theme */
    const strip = new THREE.Mesh(new THREE.BoxGeometry(3.42, 0.06, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x3ddc84, emissive: 0x3ddc84, emissiveIntensity: 0.7 }));
    strip.position.set(0, 0.42, 1.16);
    group.add(strip);

    /* antennas */
    const antMat = new THREE.MeshStandardMaterial({ color: 0x0c0e13, roughness: 0.6 });
    [-1.1, 0, 1.1].forEach(x => {
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.5, 10), antMat);
      a.position.set(x, 1.25, -0.95);
      a.rotation.x = -0.12;
      group.add(a);
    });

    /* LEDs l9dam */
    const ledNames = ["power", "internet", "wifi24", "wifi5", "lan1", "lan2", "lan3", "lan4", "usb", "phone", "wps"];
    leds = {};
    ledNames.forEach((n, i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x111111, emissive: ledColor(n, s), emissiveIntensity: 1.4 }));
      m.position.set(-1.5 + i * 0.3, 0.32, 1.16);
      m.userData = { kind: "led", name: n };
      group.add(m); leds[n] = m; portMeshes.push(m);
    });

    /* ports lor */
    function port(x, color, w, kind, name) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, 0.1),
        new THREE.MeshStandardMaterial({ color: color, roughness: 0.5 }));
      m.position.set(x, 0.3, -1.16);
      m.userData = { kind: "port", name: name, pkind: kind };
      group.add(m); portMeshes.push(m);
      return m;
    }
    port(-1.35, 0x2266cc, 0.34, "wan", "WAN");
    port(-0.85, 0xccaa22, 0.3, "lan", "LAN1");
    port(-0.45, 0xccaa22, 0.3, "lan", "LAN2");
    port(-0.05, 0xccaa22, 0.3, "lan", "LAN3");
    port(0.35, 0xccaa22, 0.3, "lan", "LAN4");
    port(0.8, 0x333944, 0.26, "usb", "USB");
    port(1.15, 0x333944, 0.2, "phone", "Phone");
    const pw = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 12),
      new THREE.MeshStandardMaterial({ color: 0x0c0e13 }));
    pw.rotation.x = Math.PI / 2; pw.position.set(1.5, 0.3, -1.16);
    pw.userData = { kind: "port", name: "Power", pkind: "power" };
    group.add(pw); portMeshes.push(pw);

    /* cable dyal WAN */
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.6, 8),
      new THREE.MeshStandardMaterial({ color: 0xccaa22 - 0x444400, roughness: 0.7 }));
    cable.rotation.x = Math.PI / 2.3;
    cable.position.set(-1.35, 0.15, -1.9);
    cable.userData = { kind: "cable" };
    cable.visible = s.wan.plugged;
    group.add(cable);
    leds.__cable = cable;

    /* waves dyal wifi */
    waves = [];
    const ringSeg = isMobile ? 24 : 40;
    for (let i = 0; i < 3; i++) {
      const wmesh = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.52, ringSeg),
        new THREE.MeshBasicMaterial({ color: 0x3ddc84, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
      wmesh.rotation.x = -Math.PI / 2;
      wmesh.position.y = 1.6;
      wmesh.visible = s.wifi.on;
      group.add(wmesh); waves.push(wmesh);
    }

    /* dell khfif ta7t router bach yban 3D bsa7 */
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    scene.add(shadow);

    /* ch9ou9 thwiya lfo9 (detail) */
    const ventMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.8 });
    for (let i = 0; i < 8; i++) {
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 1.2), ventMat);
      v.position.set(-1.2 + i * 0.18, 0.56, 0.2);
      group.add(v);
    }

    /* drag bach ydور */
    const cv = renderer.domElement;
    cv.style.cursor = "grab";
    cv.addEventListener("pointerdown", ev => { dragging = true; lastX = ev.clientX; });
    window.addEventListener("pointerup", () => { dragging = false; });
    window.addEventListener("pointermove", ev => {
      if (!dragging) return;
      dragX += (ev.clientX - lastX) * 0.01;
      lastX = ev.clientX;
    });

    /* click 3la port/LED */
    const ray = new THREE.Raycaster(), mv = new THREE.Vector2();
    cv.addEventListener("click", ev => {
      const r = cv.getBoundingClientRect();
      mv.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
      mv.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(mv, camera);
      const hit = ray.intersectObjects(portMeshes)[0];
      const info = document.getElementById("r3d-info");
      if (info) info.innerHTML = hit ? portInfo(hit.object.userData, getStateSafe()) : "Click a port or LED for details. Drag to rotate.";
    });

    animate();
  }

  function getStateSafe() {
    try { return RouterLab.getState(); } catch (e) { return null; }
  }

  function portInfo(u, s) {
    if (!s) return "";
    if (u.kind === "led") {
      const labels = { power: "Power — 12V adapter", internet: "Internet LED", wifi24: "WiFi 2.4 GHz", wifi5: "WiFi 5 GHz", usb: "USB LED", phone: "Phone LED", wps: "WPS LED" };
      const l = labels[u.name] || (u.name.toUpperCase() + " LED");
      return `<b>${l}</b> — ${ledColor(u.name, s) === 0x3ddc84 ? "🟢 on" : (ledColor(u.name, s) === 0xff4444 ? "🔴 fault" : "⚫ off")}`;
    }
    if (u.pkind === "wan") return `<b>WAN port</b> — ${s.wan.plugged ? "connected, ISP IP " + esc(s.wan.ip) : "🔴 cable unplugged!"}`;
    if (u.pkind === "lan") {
      const dev = s.devices.find(d => d.kind === "lan");
      const n = u.name.replace("LAN", "");
      return `<b>${u.name}</b> — ${n === "1" && dev ? esc(dev.name) + " (" + esc(dev.ip) + ")" : "empty"}`;
    }
    if (u.pkind === "usb") return `<b>USB port</b> — ${s.usb.plugged ? "USB " + esc(s.usb.mode) + " connected" : "empty"}`;
    if (u.pkind === "phone") return `<b>Phone jack (RJ11)</b> — ${s.voip.enabled ? (s.voip.registered !== false && s.wan.plugged && s.internetUp ? "registered " + esc(s.voip.number) : "not registered") : "VoIP disabled"}`;
    if (u.pkind === "power") return `<b>Power jack</b> — 12V DC`;
    return "";
  }

  function animate() {
    raf = requestAnimationFrame(animate);
    if (document.hidden) return; /* economi CPU/battery ملي tab makhdomch */
    if (group) group.rotation.y += ((dragX) - group.rotation.y) * 0.08;
    waveT += 0.03;
    waves.forEach((w, i) => {
      const ph = (waveT + i / 3) % 1;
      const sc = 0.6 + ph * 2.2;
      w.scale.set(sc, sc, 1);
      w.material.opacity = 0.55 * (1 - ph);
    });
    renderer.render(scene, camera);
  }

  const Router3D = {
    init(el, s) {
      destroy();
      mountEl = el;
      loadThree(() => { if (mountEl === el) build(RouterLab.getState()); });
    },
    refresh() {
      if (!scene) return;
      const s = RouterLab.getState();
      Object.keys(leds).forEach(n => {
        if (n === "__cable") { leds[n].visible = s.wan.plugged; return; }
        leds[n].material.emissive.setHex(ledColor(n, s));
      });
      waves.forEach(w => { w.visible = s.wifi.on; });
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      if (renderer && mountEl && renderer.domElement.parentNode === mountEl) mountEl.removeChild(renderer.domElement);
      renderer = null; scene = null; group = null; portMeshes = []; waves = [];
      mountEl = null;
    },
  };
  return Router3D;
})();
