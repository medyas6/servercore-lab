/* ============================================================
   MEDC ServerCore Lab Training — PowerShell simulator
   ghir client-side. les commands li kaybdlo state tay updataw
   store lmchtarka (m7fouda f localStorage); leases ghir dyal session.
   ============================================================ */

/* origin id dyal lab — kaytsta3mel f Get-Medyas */
const ORIGIN_FP = "MEDYAS-2026-7F3A-91C4";

/* ---------- tokenizer sghir dyal shell (tay7tarem quotes) ---------- */
function tokenize(line) {
  const out = [];
  let cur = "", quote = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (/\s/.test(ch)) {
      if (cur) { out.push(cur); cur = ""; }
    } else {
      cur += ch;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/* parse: awal token hiya command, lba9i: -Name value / flags / positionals */
function parseLine(line) {
  const tokens = tokenize(line.trim());
  if (!tokens.length) return null;
  const name = tokens[0];
  const named = {}, positional = [];
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith("-") && t.length > 1) {
      const key = t.replace(/^-+/, "");
      const next = tokens[i + 1];
      if (next && !next.startsWith("-")) { named[key.toLowerCase()] = next; i++; }
      else named[key.toLowerCase()] = true;
    } else {
      positional.push(t);
    }
  }
  return { name, named, positional, raw: line.trim() };
}

function ipToInt(ip) {
  const p = String(ip).split(".").map(Number);
  if (p.length !== 4 || p.some(n => isNaN(n) || n < 0 || n > 255)) return null;
  return ((p[0] * 256 + p[1]) * 256 + p[2]) * 256 + p[3];
}

/* mask 255.255.255.0 -> 24 (bach netsh set address) */
function maskToPrefix(mask) {
  const n = ipToInt(mask);
  if (n === null) return null;
  let bits = 0, v = n >>> 0;
  while (v & 0x80000000) { bits++; v = (v << 1) >>> 0; }
  return v === 0 ? bits : null;
}

/* Reservations may sit anywhere in the scope's subnet (e.g. a /24),
   not necessarily inside the distribution range — like real DHCP. */
function sameSubnet24(a, b) {
  const pa = String(a).split("."), pb = String(b).split(".");
  return pa.length === 4 && pb.length === 4 && pa.slice(0, 3).join(".") === pb.slice(0, 3).join(".");
}

function pad(str, len, ch) {
  str = String(str);
  ch = ch || " ";
  return str.length >= len ? str : str + ch.repeat(len - str.length);
}

/* ============================================================
   SimTerminal
   ============================================================ */
class SimTerminal {
  constructor(rootEl, store) {
    this.root = rootEl;
    this.store = store;
    this.sessionLeases = {};   // scopeId -> leases (ma kayttsajalch, ghir dyal session)
    this.sessionServices = SAMPLE.services.map(r => [...r]);
    SimTerminal.sharedServices = this.sessionServices; // katban f page Security
    this.histKey = "servercore-term-history-v1";
    this.history = [];
    try { this.history = JSON.parse(localStorage.getItem(this.histKey) || "[]"); } catch (e) { this.history = []; }
    this.histIdx = this.history.length;
    this.lastOutput = "";
    this.build();
    this.printBanner();
    this.appendInputLine();
    // bach ykhdem "Test in Simulator"
    if (window.__pendingCommand) {
      const cmd = window.__pendingCommand;
      window.__pendingCommand = null;
      setTimeout(() => this.execute(cmd), 60);
    }
  }

  build() {
    // input ma b9ach lfo9: kay3ich t7t fixe f terminal, b7al PowerShell l7a9i9i —
    // transcript (banner + output) kay-scroller lfo9, w prompt line li katkteb
    // fiha dayman las9a l t7t dyal pane, 7ta ملي terminal khawi.
    this.root.innerHTML = `
      <div class="term">
        <div class="term-output" id="term-output" aria-label="Terminal output">
          <div class="term-transcript" id="term-transcript"></div>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn" id="term-copy">Copy last output</button>
        <button class="btn" id="term-clear">Clear screen</button>
      </div>
      <div class="term-hint">Enter to run &middot; &uarr;&darr; history &middot; Tab completes commands and -parameters &middot; type - then Tab</div>`;
    this.out = this.root.querySelector("#term-output");
    this.transcript = this.root.querySelector("#term-transcript");
    this.input = document.createElement("input");
    this.input.id = "term-input";
    this.input.autocomplete = "off";
    this.input.spellcheck = false;
    this.input.setAttribute("aria-label", "PowerShell command input");
    this.input.placeholder = "Type a command...";

    this.input.addEventListener("keydown", (e) => this.onKey(e));
    // klik f ay blassa f terminal tay7et focus f input li t7t
    this.out.addEventListener("click", () => this.input.focus());
    this.root.querySelector("#term-copy").addEventListener("click", () => {
      copyText(this.lastOutput || "(no output yet)");
    });
    this.root.querySelector("#term-clear").addEventListener("click", () => this.clear());
  }

  /* ---------- output ---------- */
  esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  print(lines) {
    // lines: array dyal strings wla [text, className]
    const html = lines.map(l => {
      if (Array.isArray(l)) return `<span class="${l[1]}">${this.esc(l[0])}</span>`;
      return this.esc(l);
    }).join("\n");
    const plain = lines.map(l => Array.isArray(l) ? l[0] : l).join("\n");
    this.lastOutput = plain;
    // insertAdjacentHTML, machi innerHTML += : innerHTML tay3awd ybni ga3
    // children men jdid, w input li 3aych t7t f output kan ghadi yt7yed
    this.transcript.insertAdjacentHTML("beforeend", html + "\n");
    this.transcript.scrollTop = this.transcript.scrollHeight;
  }

  printBanner() {
    this.print([
      ["MEDC ServerCore Lab Training — PowerShell Simulator", "t-dim"],
      ["Created by medyas. © 2026 medyas. All rights reserved.", "t-dim"],
      ["Type 'help' for a quick start, 'Get-Command' to list supported commands.", "t-dim"],
      ["⚠ Commands are simulated and do not execute on a real operating system.", "t-err"],
      ["", ""],
    ]);
    this.lastOutput = "";
  }

  /* prompt+input jdid t7t, b7al PowerShell: hadi hiya line li katkteb fiha.
     las9a l t7t dyal pane (flex column: transcript lfo9, input line t7t). */
  appendInputLine() {
    const div = document.createElement("div");
    div.className = "term-input-line";
    const prompt = document.createElement("span");
    prompt.className = "t-prompt";
    prompt.textContent = "PS C:\\Users\\Administrator>";
    div.appendChild(prompt);
    div.appendChild(this.input);
    this.out.appendChild(div);
    this.transcript.scrollTop = this.transcript.scrollHeight;
    this.input.focus();
  }

  /* men ba3d Enter: line li ktebti fiha katwli texte fixe (echo dyal command)
     w katmchi l transcript, w input kaymchi l line jdida t7t fixe */
  freezeInputLine(text) {
    const lineDiv = this.input.parentElement;
    if (!lineDiv) return;
    const span = document.createElement("span");
    span.textContent = text ? " " + text : "";
    lineDiv.replaceChild(span, this.input);
    this.transcript.appendChild(lineDiv);
    this.transcript.scrollTop = this.transcript.scrollHeight;
  }

  clear() {
    this.transcript.innerHTML = "";
    this.printBanner();
    this.appendInputLine();
  }

  /* ---------- input handling ---------- */
  allCommandNames() {
    return COMMANDS.map(c => c.name).concat(["help", "cls", "clear", "history"]);
  }

  onKey(e) {
    if (e.key === "Enter") {
      const line = this.input.value;
      this.execute(line);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (this.histIdx > 0) { this.histIdx--; this.input.value = this.history[this.histIdx] || ""; }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (this.histIdx < this.history.length) { this.histIdx++; this.input.value = this.history[this.histIdx] || ""; }
    } else if (e.key === "Tab") {
      e.preventDefault();
      this.complete();
    } else {
      this._tab = null;
    }
  }

  paramsFor(cmdName) {
    const found = COMMANDS.find(c => c.name.toLowerCase() === String(cmdName || "").toLowerCase());
    if (!found || !found.syntax) return [];
    const out = [];
    const rest = found.syntax.split(" ").slice(1).join(" ");
    const re = /-([A-Za-z][A-Za-z0-9]*)/g;
    let m;
    while ((m = re.exec(rest))) if (!out.includes(m[1])) out.push(m[1]);
    return out;
  }
  paramValues(param) {
    const map = {
      interfacealias: ["'Ethernet'"],
      ipaddress: ["192.168.10.10"],
      prefixlength: ["24"],
      defaultgateway: ["192.168.10.1"],
      serveraddresses: ["192.168.10.10"],
      dnsname: ["DC01.lab.local"],
      zonename: ["lab.local"],
      name: ["'Lab Clients'"],
      computername: ["DC01.lab.local"],
      domainname: ["lab.local"],
      identity: ["student01"]
    };
    return map[String(param || "").toLowerCase()] || [];
  }
  closestWord(word, list) {
    const a = String(word || "").toLowerCase();
    let best = null, bestD = 99;
    const dist = (x, y) => {
      const d = [];
      for (let j = 0; j <= y.length; j++) d[j] = j;
      for (let i = 1; i <= x.length; i++) {
        let prev = d[0]; d[0] = i;
        for (let j = 1; j <= y.length; j++) {
          const tmp = d[j];
          const cost = x[i-1] === y[j-1] ? 0 : 1;
          d[j] = Math.min(d[j] + 1, d[j-1] + 1, prev + cost);
          prev = tmp;
        }
      }
      return d[y.length];
    };
    list.forEach(w => { const dd = dist(a, String(w).toLowerCase()); if (dd < bestD) { bestD = dd; best = w; } });
    // <= 2 bach suggestion tb9a 9riba bss7: "nnn" ma 3ndha 3ala9a b "cls" (distance 3)
    return bestD <= 2 ? best : null;
  }
  completionMatches() {
    const val = this.input.value;
    const pos = this.input.selectionStart != null ? this.input.selectionStart : val.length;
    const before = val.slice(0, pos);
    const parts = before.split(" ");
    const frag = before.endsWith(" ") ? "" : parts[parts.length - 1];
    const tokens = before.trim() ? before.trim().split(" ").filter(t => t) : [];
    if (!tokens.length) return null;
    const cmd = tokens[0];
    const prefix = before.slice(0, before.length - frag.length);
    if (frag.startsWith("-")) {
      const list = this.paramsFor(cmd).filter(n => ("-" + n).toLowerCase().startsWith(frag.toLowerCase())).map(n => "-" + n);
      return { frag, list, prefix, kind: "param" };
    }
    if (tokens.length === 1) {
      const list = this.allCommandNames().filter(n => n.toLowerCase().startsWith(frag.toLowerCase()));
      return { frag, list, prefix, kind: "command" };
    }
    const prevTok = frag ? tokens[tokens.length - 2] : tokens[tokens.length - 1];
    if (prevTok && prevTok.startsWith("-")) {
      const list = this.paramValues(prevTok.replace(/^-+/, "")).filter(v => v.toLowerCase().startsWith(frag.toLowerCase()));
      return { frag, list, prefix, kind: "value" };
    }
    return null;
  }
  complete() {
    const matches = this.completionMatches();
    if (!matches || !matches.list.length) return;
    const key = matches.kind + ":" + matches.frag.toLowerCase();
    if (this._tab && this._tab.key === key) {
      this._tab.idx = (this._tab.idx + 1) % matches.list.length;
    } else {
      this._tab = { key, idx: 0, list: matches.list, prefix: matches.prefix };
    }
    const name = this._tab.list[this._tab.idx];
    this.input.value = matches.prefix + name + " ";
    if (this.input.setSelectionRange) this.input.setSelectionRange(this.input.value.length, this.input.value.length);
  }

  pushHistory(line) {
    if (!line.trim()) return;
    this.history.push(line.trim());
    if (this.history.length > 100) this.history = this.history.slice(-100);
    this.histIdx = this.history.length;
    try { localStorage.setItem(this.histKey, JSON.stringify(this.history)); } catch (e) {}
  }

  /* ---------- execution ---------- */
  execute(line) {
    const text = line.trim();
    // line li ktebti fiha katwli echo fixe, w input kaymchi l line jdida t7t
    this.freezeInputLine(text);
    this.input.value = "";
    if (!text) { this.appendInputLine(); return; }
    this.pushHistory(line);
    const parsed = parseLine(line);
    if (!parsed) { this.appendInputLine(); return; }
    const foundCmd = COMMANDS.find(c => c.name.toLowerCase() === parsed.name.toLowerCase());
    if (foundCmd) {
      const params = this.paramsFor(foundCmd.name).map(x => x.toLowerCase());
      // A20: 7ta les commands li syntax dyalhom bla params kaytrefdo -Named
      // (help/history/cls ma 3ndhomch params 7a9i9iyin, kaykhdmo bla validation)
      const bad = Object.keys(parsed.named).find(k => !params.includes(k));
      if (bad && !["help", "history", "cls", "clear"].includes(parsed.name.toLowerCase())) {
        const sug = this.closestWord(bad, this.paramsFor(foundCmd.name));
        this.print([["'" + foundCmd.name + "' does not have a parameter named '-" + bad + "'." + (sug ? " Did you mean '-" + sug + "'?" : " Type the command, then '-' and press Tab to complete it."), "t-err"]]);
        if (this.onStateChange) this.onStateChange();
        this.appendInputLine();
        return;
      }
    }
    const key = parsed.name.toLowerCase();

    const handler = this.handlers[key];
    let out;
    if (handler) {
      out = handler.call(this, parsed);
    } else {
      out = this.genericHandler(parsed);
    }
    if (out && out.length) this.print(out);
    else this.lastOutput = "";
    if (this.onStateChange) this.onStateChange();
    // cls/clear deja 3awdo banner + input line, bla ma nzido wa7ed akhor
    if (key !== "cls" && key !== "clear") this.appendInputLine();
  }

  unknownError(name) {
    const sug = this.closestWord(name, this.allCommandNames());
    return [[`The term '${name}' is not recognized as the name of a cmdlet, function, or supported simulated command.` + (sug ? ` Did you mean '${sug}'?` : '') + ` Type 'Get-Command' for a list, or open the Command Reference page.`, "t-err"]];
  }

  /* Fallback: use the command catalog's "expected" text as simulated output */
  genericHandler(parsed) {
    const found = COMMANDS.find(c => c.name.toLowerCase() === parsed.name.toLowerCase());
    if (!found) return this.unknownError(parsed.name);
    if (found.badge === "Reference") {
      return [
        [`${found.name} is a reference entry and is not simulated.`, "t-err"],
        found.description,
      ];
    }
    return [[`✔ ${found.expected}  (simulated)`, "t-ok"]];
  }

  get handlers() {
    if (this._handlers) return this._handlers;
    const T = this;
    this._handlers = {
      /* ----- basics ----- */
      "help"() {
        return [
          "Getting started:",
          "  Get-Command            list supported commands",
          "  Get-Help <command>     detailed help for a command",
          "  Get-ComputerInfo       server identity summary",
          "  Get-Service            list services and status",
          "  history                show commands typed this session",
          "  cls  (clear)            clear the screen",
          "",
          "Open the Command Reference page for the full catalog with examples.",
        ];
      },
      "get-medyas"() {
        return [
          "MEDC ServerCore Lab Training — Original author proof",
          "Author              : medyas (Mohamed Yassine)",
          "Original repository : https://github.com/medyas6/servercore-lab",
          "First published     : October 2026",
          "Fingerprint         : " + ORIGIN_FP,
          "License             : All rights reserved — redistribution without written permission is not permitted.",
        ];
      },
      "get-command"(p) {
        const filter = (p.named.name || p.positional[0] || "").toLowerCase().replace(/\*/g, "");
        const cats = {};
        COMMANDS.forEach(c => {
          if (filter && !c.name.toLowerCase().includes(filter)) return;
          (cats[c.category] = cats[c.category] || []).push(c.name);
        });
        const out = ["", "CommandType  Name"];
        out.push("-----------  ----");
        Object.keys(cats).sort().forEach(cat => {
          out.push([`-- ${cat} --`, "t-dim"]);
          cats[cat].forEach(n => out.push(`Cmdlet       ${n}`));
        });
        const total = Object.values(cats).reduce((a, b) => a + b.length, 0);
        out.push("", `${total} command(s) listed. Aliases: help, cls, clear, history.`);
        return out;
      },
      "get-help"(p) {
        const target = p.positional[0] || p.named.name;
        if (!target) return [["Usage: Get-Help <command-name>", "t-err"]];
        const c = COMMANDS.find(x => x.name.toLowerCase() === String(target).toLowerCase());
        if (!c) return [[`Get-Help: no help topic found for '${target}'.`, "t-err"]];
        return [
          `NAME        ${c.name}`,
          `CATEGORY    ${c.category}`,
          `SYNOPSIS    ${c.description}`,
          `SYNTAX      ${c.syntax}`,
          `EXAMPLE     ${c.example}`,
          `PREREQUISITES  ${c.prerequisites}`,
          `PRIVILEGES     ${c.privileges}`,
        ];
      },
      "history"() {
        if (!T.history.length) return ["(no commands in history yet)"];
        return T.history.map((h, i) => `  ${i + 1}  ${h}`);
      },
      "cls"() { T.clear(); return []; },
      "clear"() { T.clear(); return []; },

      "get-computerinfo"() {
        const d = T.store.data;
        return [
          "Hostname          : " + (d.hostname || "WINSRV-CORE"),
          "OS                : Windows Server 2019 Standard (simulated)",
          "Domain            : " + (d.domain || "WORKGROUP"),
          "IPv4              : " + (d.ipAddress || "192.168.10.10"),
          "Roles installed   : " + (d.roles.join(", ") || "(none)"),
        ];
      },
      "get-process"() {
        return ["Handles  Name", "-------  ----",
          "    412  svchost", "    188  lsass", "     96  dns",
          "     74  dhcpd-sim", "     51  explorer(sim)"];
      },
      "get-executionpolicy"() { return ["RemoteSigned"]; },
      "set-executionpolicy"(p) {
        const v = p.positional[0] || p.named.executionpolicy;
        const valid = ["Restricted", "AllSigned", "RemoteSigned", "Unrestricted", "Bypass"];
        if (!valid.includes(v)) return [[`Set-ExecutionPolicy: '${v}' is not valid. Valid values: ${valid.join(", ")}`, "t-err"]];
        return [[`✔ Execution policy set to ${v}. (simulated)`, "t-ok"]];
      },

      /* ----- services ----- */
      "get-service"(p) {
        const f = (p.named.name || p.positional[0] || "").toLowerCase();
        const rows = T.sessionServices.filter(r => !f || r[0].toLowerCase().includes(f));
        const out = [pad("Name", 12) + pad("DisplayName", 38) + "Status", pad("", 12, "-") + " " + pad("", 36, "-") + " ------"];
        rows.forEach(r => out.push(pad(r[0], 12) + pad(r[1], 38) + r[2]));
        return out.length > 2 ? out : ["(no matching services)"];
      },
      "start-service"(p) { return T.setServiceState(p, "Running"); },
      "stop-service"(p) { return T.setServiceState(p, "Stopped"); },
      "restart-service"(p) {
        const r = T.setServiceState(p, "Running");
        return r;
      },
      "get-localuser"() {
        return [pad("Name", 16) + "Enabled", pad("", 16, "-") + " -------",
          pad("Administrator", 16) + "True", pad("Guest", 16) + "False"];
      },

      /* ----- roles & features ----- */
      "get-windowsfeature"() {
        const out = [pad("DisplayName", 36) + pad("Name", 22) + "InstallState",
                     pad("", 36, "-") + " " + pad("", 20, "-") + " ------------"];
        SAMPLE.roles.forEach(([disp, name]) => {
          const st = T.store.data.roles.includes(name) ? "Installed" : "Available";
          out.push(pad(disp, 36) + pad(name, 22) + st);
        });
        return out;
      },
      "install-windowsfeature"(p) {
        const raw = p.positional[0] || p.named.name;
        if (!raw) return [["Install-WindowsFeature: a feature name is required. Example: Install-WindowsFeature DHCP", "t-err"]];
        const role = SAMPLE.roles.find(([d, n]) => n.toLowerCase() === String(raw).toLowerCase());
        if (!role) return [[`Install-WindowsFeature: feature '${raw}' not found. Run Get-WindowsFeature for valid names.`, "t-err"]];
        if (T.store.data.roles.includes(role[1])) return [`${role[1]} is already installed.`];
        T.store.data.roles.push(role[1]);
        T.store.save();
        return [
          "Success RestartNeeded FeatureResult",
          "------- ------------- -------------",
          `True    No            ${role[0]}`,
          "",
          [`✔ Role '${role[1]}' installed. Dashboard updated.`, "t-ok"],
        ];
      },
      "uninstall-windowsfeature"(p) {
        const raw = p.positional[0] || p.named.name;
        const role = SAMPLE.roles.find(([d, n]) => n.toLowerCase() === String(raw || "").toLowerCase());
        if (!role) return [[`Uninstall-WindowsFeature: feature '${raw}' not found.`, "t-err"]];
        const i = T.store.data.roles.indexOf(role[1]);
        if (i < 0) return [`${role[1]} is not installed.`];
        T.store.data.roles.splice(i, 1);
        T.store.save();
        return [[`✔ Role '${role[1]}' removed.`, "t-ok"]];
      },

      /* ----- DHCP ----- */
      "add-dhcpserverindc"(p) {
        if (!T.store.data.roles.includes("DHCP"))
          return [["Add-DhcpServerInDC: the DHCP role is not installed. Run 'Install-WindowsFeature DHCP -IncludeManagementTools' first.", "t-err"]];
        const dns = p.named.dnsname || "DC01.lab.local";
        const ip = p.named.ipaddress || "192.168.10.10";
        T.store.data.dhcp.authorized = { dnsName: dns, ip };
        T.store.save();
        return [[`DHCP server '${dns}' (${ip}) authorized in AD.`, "t-ok"]];
      },
      "get-dhcpserverindc"() {
        const a = T.store.data.dhcp.authorized;
        if (!a) return ["No DHCP servers are authorized in Active Directory."];
        return [pad("DnsName", 22) + pad("IPAddress", 16) + "Authorized",
                pad("", 22, "-") + " " + pad("", 14, "-") + " ----------",
                pad(a.dnsName, 22) + pad(a.ip, 16) + "True"];
      },
      "add-dhcpserverv4scope"(p) {
        if (!T.store.data.roles.includes("DHCP"))
          return [["Add-DhcpServerv4Scope: the DHCP role is not installed.", "t-err"]];
        const name = p.named.name, start = p.named.startrange, end = p.named.endrange, mask = p.named.subnetmask;
        if (!name || !start || !end || !mask)
          return [["Usage: Add-DhcpServerv4Scope -Name <name> -StartRange <ip> -EndRange <ip> -SubnetMask <mask>", "t-err"]];
        const s = ipToInt(start), e = ipToInt(end);
        if (s === null || e === null || s >= e)
          return [[`Add-DhcpServerv4Scope: invalid range ${start} - ${end}.`, "t-err"]];
        const overlap = T.store.data.scopes.some(sc => s <= ipToInt(sc.end) && e >= ipToInt(sc.start));
        if (overlap) return [["Add-DhcpServerv4Scope: the range overlaps an existing scope.", "t-err"]];
        const scopeId = parseInt(String(start).split(".")[2], 10);
        T.store.data.scopes.push({ id: scopeId, name, start, end, mask });
        T.store.save();
        return [[`Scope '${name}' created (${start} - ${end}).`, "t-ok"]];
      },
      "get-dhcpserverv4scope"() {
        const scopes = T.store.data.scopes;
        if (!scopes.length) return ["No scopes configured. Install the DHCP role, authorize it, then add a scope."];
        const out = [pad("ScopeId", 9) + pad("Name", 18) + pad("Start", 17) + pad("End", 17) + "Mask",
                     pad("", 9, "-") + " " + pad("", 16, "-") + " " + pad("", 15, "-") + " " + pad("", 15, "-") + " ----"];
        scopes.forEach(sc => out.push(pad(sc.id, 9) + pad(sc.name, 18) + pad(sc.start, 17) + pad(sc.end, 17) + sc.mask));
        return out;
      },
      "add-dhcpserverv4exclusionrange"(p) {
        const sc = T.findScope(p.named.scopeid);
        if (!sc) return [[`Add-DhcpServerv4ExclusionRange: scope '${p.named.scopeid}' not found.`, "t-err"]];
        const start = p.named.startrange, end = p.named.endrange;
        if (ipToInt(start) !== null && ipToInt(end) !== null && ipToInt(start) > ipToInt(end))
          return [[`Add-DhcpServerv4ExclusionRange: StartRange ${start} is greater than EndRange ${end}.`, "t-err"]];
        if (ipToInt(start) === null || ipToInt(end) === null || ipToInt(start) > ipToInt(sc.end) || ipToInt(end) < ipToInt(sc.start))
          return [[`Add-DhcpServerv4ExclusionRange: range ${start} - ${end} is outside scope '${sc.name}'.`, "t-err"]];
        T.store.data.exclusions.push({ scopeId: sc.id, start, end });
        T.store.save();
        return [[`Exclusion ${start} - ${end} added to scope '${sc.name}'.`, "t-ok"]];
      },
      "add-dhcpserverv4reservation"(p) {
        const sc = T.findScope(p.named.scopeid);
        if (!sc) return [[`Add-DhcpServerv4Reservation: scope '${p.named.scopeid}' not found.`, "t-err"]];
        const ip = p.named.ipaddress, cid = p.named.clientid;
        if (ipToInt(ip) === null || !sameSubnet24(ip, sc.start))
          return [[`Add-DhcpServerv4Reservation: ${ip} is outside the subnet of scope '${sc.name}'.`, "t-err"]];
        T.store.data.reservations.push({ scopeId: sc.id, ip, clientId: cid || "(none)" });
        T.store.save();
        return [[`Reservation ${ip} -> ${cid || "(none)"} added to scope '${sc.name}'.`, "t-ok"]];
      },
      "set-dhcpserverv4optionvalue"(p) {
        // -Router = option 3, -DnsServer = option 6, -DnsDomain = option 15
        let oid = p.named.optionid, val = p.named.value;
        if (p.named.router !== undefined) { oid = "3"; val = String(p.named.router); }
        else if (p.named.dnsserver !== undefined) { oid = "6"; val = String(p.named.dnsserver); }
        else if (p.named.dnsdomain !== undefined) { oid = "15"; val = String(p.named.dnsdomain); }
        if (!val) return [["Usage: Set-DhcpServerv4OptionValue -ScopeId <id> -OptionId <id> -Value <value>", "t-err"]];
        T.store.data.options = T.store.data.options || {};
        // -ComputerName bla -ScopeId: option dyal server kamel (local sim)
        if (p.named.scopeid === undefined) {
          if (p.named.computername !== undefined) {
            T.store.data.options.__server__ = T.store.data.options.__server__ || {};
            T.store.data.options.__server__[oid] = val;
            T.store.save();
            return [[`Option ${oid} = ${val} set on server '${p.named.computername}'. (simulated)`, "t-ok"]];
          }
          return [[`Set-DhcpServerv4OptionValue: scope 'undefined' not found.`, "t-err"]];
        }
        const sc = T.findScope(p.named.scopeid);
        if (!sc) return [[`Set-DhcpServerv4OptionValue: scope '${p.named.scopeid}' not found.`, "t-err"]];
        T.store.data.options[sc.id] = T.store.data.options[sc.id] || {};
        T.store.data.options[sc.id][oid] = val;
        T.store.save();
        return [[`Option ${oid} = ${val} set on scope '${sc.name}'.`, "t-ok"]];
      },
      "get-dhcpserverv4lease"(p) {
        const sc = T.findScope(p.named.scopeid || p.positional[0]);
        if (!sc) return [[`Get-DhcpServerv4Lease: scope '${p.named.scopeid || p.positional[0]}' not found.`, "t-err"]];
        if (!T.sessionLeases[sc.id]) T.sessionLeases[sc.id] = T.makeLeases(sc);
        const leases = T.sessionLeases[sc.id];
        const out = [pad("IPAddress", 17) + pad("ClientId", 20) + pad("HostName", 14) + "AddressState",
                     pad("", 15, "-") + " " + pad("", 18, "-") + " " + pad("", 12, "-") + " ------------"];
        leases.forEach(l => out.push(pad(l.ip, 17) + pad(l.mac, 20) + pad(l.host, 14) + l.state));
        out.push("", "(leases are generated per session and are not persisted)");
        return out;
      },

      /* ----- DNS: zones w records stateful (v1.8.0) ----- */
      "add-dnsserverprimaryzone"(p) {
        const name = p.named.name || p.positional[0];
        if (!name) return [["Usage: Add-DnsServerPrimaryZone -Name <zone> -ZoneFile <file>", "t-err"]];
        const zones = T.dnsZones();
        if (zones.some(z => z.name.toLowerCase() === String(name).toLowerCase()))
          return [[`✔ Primary zone '${name}' is already hosted on this server.`, "t-ok"]];
        zones.push({ name: String(name), type: "Primary", file: p.named.zonefile || (name + ".dns") });
        T.store.save();
        return [[`✔ Primary zone '${name}' created.`, "t-ok"]];
      },
      "get-dnsserverzone"() {
        const zones = T.dnsZones();
        const out = [pad("ZoneName", 32) + pad("ZoneType", 12) + "IsAutoCreated",
                     pad("", 32, "-") + " " + pad("", 10, "-") + " -------------"];
        zones.forEach(z => out.push(pad(z.name, 32) + pad(z.type, 12) + "False"));
        // reverse zone dyal lab (default) b7al li kaygol catalog
        out.push(pad("10.168.192.in-addr.arpa", 32) + pad("Primary", 12) + "True");
        return out;
      },
      "remove-dnsserverzone"(p) {
        const name = p.named.name || p.positional[0];
        if (!name) return [["Usage: Remove-DnsServerZone -Name <zone>", "t-err"]];
        if (String(name).toLowerCase() === "lab.local")
          return [[`Remove-DnsServerZone: the zone 'lab.local' is protected and cannot be deleted in the simulator.`, "t-err"]];
        const zones = T.dnsZones();
        const i = zones.findIndex(z => z.name.toLowerCase() === String(name).toLowerCase());
        if (i < 0) return [[`Remove-DnsServerZone: zone '${name}' was not found.`, "t-err"]];
        zones.splice(i, 1);
        T.store.data.dnsRecords = T.dnsRecords().filter(r => r.zone.toLowerCase() !== String(name).toLowerCase());
        T.store.save();
        return [[`✔ Zone '${name}' removed.`, "t-ok"]];
      },
      "add-dnsserverresourcerecorda"(p) {
        const zone = p.named.zonename, name = p.named.name || p.positional[0], ip = p.named.ipv4address;
        if (!zone || !name || !ip) return [["Usage: Add-DnsServerResourceRecordA -Name <name> -ZoneName <zone> -IPv4Address <ip>", "t-err"]];
        if (!T.dnsZones().some(z => z.name.toLowerCase() === String(zone).toLowerCase()))
          return [[`Add-DnsServerResourceRecordA: zone '${zone}' was not found.`, "t-err"]];
        if (ipToInt(ip) === null) return [[`Add-DnsServerResourceRecordA: '${ip}' is not a valid IPv4 address.`, "t-err"]];
        const recs = T.dnsRecords();
        const dup = recs.find(r => r.zone.toLowerCase() === String(zone).toLowerCase() && r.name.toLowerCase() === String(name).toLowerCase() && r.type === "A");
        if (dup) {
          if (dup.data === ip) return [[`✔ A record '${name}' -> ${ip} is already present in zone '${zone}'.`, "t-ok"]];
          return [[`Add-DnsServerResourceRecordA: record '${name}' (A) already exists in zone '${zone}' with a different address.`, "t-err"]];
        }
        recs.push({ zone: String(zone), name: String(name), type: "A", data: ip });
        T.store.save();
        return [[`✔ A record '${name}' -> ${ip} created in zone '${zone}'.`, "t-ok"]];
      },
      "add-dnsserverresourcerecordcname"(p) {
        const zone = p.named.zonename, name = p.named.name || p.positional[0], alias = p.named.hostnamealias;
        if (!zone || !name || !alias) return [["Usage: Add-DnsServerResourceRecordCName -Name <name> -ZoneName <zone> -HostNameAlias <target>", "t-err"]];
        if (!T.dnsZones().some(z => z.name.toLowerCase() === String(zone).toLowerCase()))
          return [[`Add-DnsServerResourceRecordCName: zone '${zone}' was not found.`, "t-err"]];
        const recs = T.dnsRecords();
        const dup = recs.find(r => r.zone.toLowerCase() === String(zone).toLowerCase() && r.name.toLowerCase() === String(name).toLowerCase() && r.type === "CNAME");
        if (dup) {
          if (dup.data === String(alias)) return [[`✔ CNAME record '${name}' -> ${alias} is already present in zone '${zone}'.`, "t-ok"]];
          return [[`Add-DnsServerResourceRecordCName: record '${name}' (CNAME) already exists in zone '${zone}' with a different target.`, "t-err"]];
        }
        recs.push({ zone: String(zone), name: String(name), type: "CNAME", data: String(alias) });
        T.store.save();
        return [[`✔ CNAME record '${name}' -> ${alias} created in zone '${zone}'.`, "t-ok"]];
      },
      "add-dnsserverresourcerecordaaaa"(p) {
        const zone = p.named.zonename, name = p.named.name || p.positional[0], ip = p.named.ipv6address;
        if (!zone || !name || !ip) return [["Usage: Add-DnsServerResourceRecordAAAA -Name <name> -ZoneName <zone> -IPv6Address <ipv6>", "t-err"]];
        if (!T.dnsZones().some(z => z.name.toLowerCase() === String(zone).toLowerCase()))
          return [[`Add-DnsServerResourceRecordAAAA: zone '${zone}' was not found.`, "t-err"]];
        const recs = T.dnsRecords();
        const dup = recs.find(r => r.zone.toLowerCase() === String(zone).toLowerCase() && r.name.toLowerCase() === String(name).toLowerCase() && r.type === "AAAA");
        if (dup) {
          if (dup.data === String(ip)) return [[`✔ AAAA record '${name}' -> ${ip} is already present in zone '${zone}'.`, "t-ok"]];
          return [[`Add-DnsServerResourceRecordAAAA: record '${name}' (AAAA) already exists in zone '${zone}' with a different address.`, "t-err"]];
        }
        recs.push({ zone: String(zone), name: String(name), type: "AAAA", data: String(ip) });
        T.store.save();
        return [[`✔ AAAA record '${name}' -> ${ip} created in zone '${zone}'.`, "t-ok"]];
      },
      "add-dnsserversecondaryzone"(p) {
        const name = p.named.name || p.positional[0];
        if (!name) return [["Usage: Add-DnsServerSecondaryZone -Name <zone> -ZoneFile <file> -MasterServers <ip>", "t-err"]];
        const zones = T.dnsZones();
        if (zones.some(z => z.name.toLowerCase() === String(name).toLowerCase()))
          return [[`Add-DnsServerSecondaryZone: zone '${name}' already exists.`, "t-err"]];
        zones.push({ name: String(name), type: "Secondary", file: p.named.zonefile || (name + ".dns"), master: p.named.masterservers || "" });
        T.store.save();
        return [[`✔ Secondary zone '${name}' created (master: ${p.named.masterservers || "(none)"}).`, "t-ok"]];
      },
      "get-dnsserverresourcerecord"(p) {
        const zone = p.named.zonename || p.positional[0];
        if (!zone) return [["Usage: Get-DnsServerResourceRecord -ZoneName <zone>", "t-err"]];
        if (!T.dnsZones().some(z => z.name.toLowerCase() === String(zone).toLowerCase()))
          return [[`Get-DnsServerResourceRecord: zone '${zone}' was not found.`, "t-err"]];
        const rows = T.dnsRecords().filter(r => r.zone.toLowerCase() === String(zone).toLowerCase());
        const out = [pad("HostName", 14) + pad("RecordType", 12) + "RecordData",
                     pad("", 14, "-") + " " + pad("", 10, "-") + " ----------"];
        rows.forEach(r => out.push(pad(r.name, 14) + pad(r.type, 12) + r.data));
        // defaults dyal lab.local (NS/SOA) men SAMPLE
        if (String(zone).toLowerCase() === "lab.local") {
          SAMPLE.dnsRecords.filter(r => r[0] === "@").forEach(r => out.push(pad(r[0], 14) + pad(r[1], 12) + r[2]));
        }
        if (out.length === 2) out.push(`(no records in zone '${zone}')`);
        return out;
      },
      "clear-dnsservercache"() {
        return [[`✔ DNS server cache cleared. (simulated)`, "t-ok"]];
      },

      /* ----- routes w network summary (v1.8.0) ----- */
      "get-netroute"(p) {
        const f = (p.named.destinationprefix || p.positional[0] || "").toLowerCase();
        const rows = T.routes().filter(r => !f || r.dest.toLowerCase().includes(f));
        if (!rows.length) return [`(no route to '${p.named.destinationprefix || p.positional[0]}' was found)`];
        const out = [pad("DestinationPrefix", 20) + pad("NextHop", 17) + "InterfaceAlias",
                     pad("", 19, "-") + " " + pad("", 15, "-") + " --------------"];
        rows.forEach(r => out.push(pad(r.dest, 20) + pad(r.nextHop, 17) + r.iface));
        return out;
      },
      "new-netroute"(p) {
        const dest = p.named.destinationprefix, hop = p.named.nexthop, iface = p.named.interfacealias || "Ethernet";
        if (!dest || !hop) return [["Usage: New-NetRoute -DestinationPrefix <prefix> -NextHop <ip> [-InterfaceAlias <name>]", "t-err"]];
        const routes = T.routes();
        if (routes.some(r => r.dest.toLowerCase() === String(dest).toLowerCase()))
          return [[`New-NetRoute: a route to '${dest}' already exists.`, "t-err"]];
        routes.push({ dest: String(dest), nextHop: String(hop), iface: String(iface) });
        T.store.save();
        return [[`✔ Route to ${dest} via ${hop} added on '${iface}'.`, "t-ok"]];
      },
      "remove-netroute"(p) {
        const dest = p.named.destinationprefix || p.positional[0];
        if (!dest) return [["Usage: Remove-NetRoute -DestinationPrefix <prefix>", "t-err"]];
        const routes = T.routes();
        const i = routes.findIndex(r => r.dest.toLowerCase() === String(dest).toLowerCase());
        if (i < 0) return [[`Remove-NetRoute: no route to '${dest}' was found.`, "t-err"]];
        routes.splice(i, 1);
        T.store.save();
        return [[`✔ Route to '${dest}' removed.`, "t-ok"]];
      },
      "get-dnsclientserveraddress"(p) {
        const d = T.store.data;
        const dns = d.dnsServer || "127.0.0.1";
        return [pad("InterfaceAlias", 16) + pad("AddressFamily", 15) + "ServerAddresses",
                pad("", 16, "-") + " " + pad("", 13, "-") + " ---------------",
                pad(p.named.interfacealias || "Ethernet", 16) + pad("IPv4", 15) + dns];
      },
      "get-netipconfiguration"(p) {
        const d = T.store.data;
        const ip = d.ipAddress || "192.168.10.10";
        const plen = parseInt(d.prefixLength || "24", 10) || 24;
        const m = (0xFFFFFFFF << (32 - plen)) >>> 0;
        const mask = [(m >>> 24) & 255, (m >>> 16) & 255, (m >>> 8) & 255, m & 255].join(".");
        return ["InterfaceAlias : " + (p.named.interfacealias || "Ethernet"),
          "IPv4Address    : " + ip,
          "SubnetMask     : " + mask,
          "DefaultGateway : " + (d.gateway || "192.168.10.1"),
          "DNSServer      : " + (d.dnsServer || "127.0.0.1")];
      },

      /* ----- DHCP: read/remove sides (v1.8.0) ----- */
      "get-dhcpserverv4optionvalue"(p) {
        T.store.data.options = T.store.data.options || {};
        if (p.named.scopeid !== undefined) {
          const sc = T.findScope(p.named.scopeid);
          if (!sc) return [[`Get-DhcpServerv4OptionValue: scope '${p.named.scopeid}' not found.`, "t-err"]];
          const opts = T.store.data.options[sc.id] || {};
          if (p.named.optionid !== undefined) {
            const v = opts[String(p.named.optionid)];
            if (v === undefined) return [`Option ${p.named.optionid} is not set on scope '${sc.name}'.`];
            return [`Option ${p.named.optionid} = ${v} (scope '${sc.name}')`];
          }
          const ids = Object.keys(opts);
          if (!ids.length) return [`(no options set on scope '${sc.name}')`];
          const names = { 3: "Router", 6: "DNS Server", 15: "DNS Domain" };
          const out = [pad("OptionId", 10) + pad("Name", 14) + "Value", pad("", 10, "-") + " " + pad("", 12, "-") + " -----"];
          ids.forEach(id => out.push(pad(id, 10) + pad(names[id] || "", 14) + opts[id]));
          return out;
        }
        const srv = T.store.data.options.__server__ || {};
        const ids = Object.keys(srv);
        if (p.named.optionid !== undefined) {
          const v = srv[String(p.named.optionid)];
          if (v === undefined) return [`Option ${p.named.optionid} is not set on this server.`];
          return [`Option ${p.named.optionid} = ${v} (server)`];
        }
        if (!ids.length) return ["(no server-level options set)"];
        const out = [pad("OptionId", 10) + "Value", pad("", 10, "-") + " -----"];
        ids.forEach(id => out.push(pad(id, 10) + srv[id]));
        return out;
      },
      "remove-dhcpserverv4scope"(p) {
        const sc = T.findScope(p.named.scopeid || p.positional[0]);
        if (!sc) return [[`Remove-DhcpServerv4Scope: scope '${p.named.scopeid || p.positional[0]}' not found.`, "t-err"]];
        T.store.data.scopes = T.store.data.scopes.filter(s => s.id !== sc.id);
        T.store.data.exclusions = (T.store.data.exclusions || []).filter(e => e.scopeId !== sc.id);
        T.store.data.reservations = (T.store.data.reservations || []).filter(r => r.scopeId !== sc.id);
        T.store.data.options = T.store.data.options || {};
        delete T.store.data.options[sc.id];
        delete T.sessionLeases[sc.id];
        T.store.save();
        return [[`✔ Scope '${sc.name}' removed with its exclusions, reservations and options.`, "t-ok"]];
      },
      "get-dhcpserverv4exclusionrange"(p) {
        const sc = T.findScope(p.named.scopeid || p.positional[0]);
        if (!sc) return [[`Get-DhcpServerv4ExclusionRange: scope '${p.named.scopeid || p.positional[0]}' not found.`, "t-err"]];
        const rows = (T.store.data.exclusions || []).filter(e => e.scopeId === sc.id);
        if (!rows.length) return [`(no exclusion ranges on scope '${sc.name}')`];
        const out = [pad("StartRange", 17) + "EndRange", pad("", 15, "-") + " --------"];
        rows.forEach(e => out.push(pad(e.start, 17) + e.end));
        return out;
      },
      "remove-dhcpserverv4reservation"(p) {
        const sc = T.findScope(p.named.scopeid);
        if (!sc) return [[`Remove-DhcpServerv4Reservation: scope '${p.named.scopeid}' not found.`, "t-err"]];
        const cid = p.named.clientid;
        if (!cid) return [["Usage: Remove-DhcpServerv4Reservation -ScopeId <id> -ClientId <mac>", "t-err"]];
        const list = T.store.data.reservations || [];
        const i = list.findIndex(r => r.scopeId === sc.id && String(r.clientId).toLowerCase() === String(cid).toLowerCase());
        if (i < 0) return [[`Remove-DhcpServerv4Reservation: no reservation for client '${cid}' was found on scope '${sc.name}'.`, "t-err"]];
        const gone = list.splice(i, 1)[0];
        T.store.save();
        return [[`✔ Reservation ${gone.ip} (${gone.clientId}) removed from scope '${sc.name}'.`, "t-ok"]];
      },

      /* ----- server config ----- */
      "rename-computer"(p) {
        const n = p.named.newname || p.positional[0];
        if (!n) return [["Usage: Rename-Computer -NewName <name> [-Restart]", "t-err"]];
        if (n.length > 15) return [[`Rename-Computer: '${n}' is longer than 15 characters.`, "t-err"]];
        T.store.data.hostname = n;
        T.store.save();
        return [[`✔ Computer renamed to '${n}'. A restart is required (simulated).`, "t-ok"]];
      },
      "new-netipaddress"(p) {
        const ip = p.named.ipaddress, plen = p.named.prefixlength || "24";
        if (ipToInt(ip) === null) return [[`New-NetIPAddress: '${ip}' is not a valid IPv4 address.`, "t-err"]];
        T.store.data.ipAddress = ip;
        T.store.data.prefixLength = plen;
        if (p.named.defaultgateway) T.store.data.gateway = p.named.defaultgateway;
        T.store.save();
        return [[`✔ IP address ${ip}/${plen} assigned to adapter '${p.named.interfacealias || "Ethernet"}'. (simulated)`, "t-ok"]];
      },
      "get-netipaddress"() {
        const d = T.store.data;
        const ip = d.ipAddress || "192.168.10.10", plen = d.prefixLength || "24";
        return [pad("InterfaceAlias", 16) + pad("IPAddress", 17) + "PrefixLength",
                pad("", 16, "-") + " " + pad("", 15, "-") + " ------------",
                pad("Ethernet", 16) + pad(ip, 17) + plen];
      },
      "ipconfig"(p) {
        const d = T.store.data;
        const ip = d.ipAddress || "192.168.10.10";
        const plen = parseInt(d.prefixLength || "24", 10) || 24;
        const m = (0xFFFFFFFF << (32 - plen)) >>> 0;
        const mask = [(m >>> 24) & 255, (m >>> 16) & 255, (m >>> 8) & 255, m & 255].join(".");
        const gw = d.gateway || "192.168.10.1";
        const dns = d.dnsServer || "127.0.0.1";
        const sw = (p.positional[0] || "").toLowerCase();
        if (sw && sw !== "/all") return [[`ipconfig: unknown switch '${p.positional[0]}'. Usage: ipconfig [/all]`, "t-err"]];
        const all = sw === "/all";
        const out = ["Windows IP Configuration", "", "Ethernet adapter Ethernet:", "",
          "   Connection-specific DNS Suffix  . : lab.local"];
        if (all) out.push("   Physical Address. . . . . . . . . : 00-15-5D-01-02-0A", "   DHCP Enabled. . . . . . . . . . . : No");
        out.push("   IPv4 Address. . . . . . . . . . . : " + ip,
          "   Subnet Mask . . . . . . . . . . . : " + mask,
          "   Default Gateway . . . . . . . . . : " + gw);
        if (all) out.push("   DNS Servers . . . . . . . . . . . : " + dns);
        return out;
      },
      "set-dnsclientserveraddress"(p) {
        const s = p.named.serveraddresses || p.positional[0];
        if (ipToInt(s) === null) return [[`Set-DnsClientServerAddress: '${s}' is not valid.`, "t-err"]];
        T.store.data.dnsServer = s;
        T.store.save();
        return [[`✔ Preferred DNS server set to ${s} on '${p.named.interfacealias || "Ethernet"}'. (simulated)`, "t-ok"]];
      },
      "get-netadapter"() {
        return [pad("Name", 12) + pad("Status", 10) + "ifIndex",
                pad("", 12, "-") + " " + pad("", 8, "-") + " -------",
                pad("Ethernet", 12) + pad("Up", 10) + "12"];
      },
      "test-connection"(p) {
        const target = p.named.computername || p.positional[0] || "127.0.0.1";
        const count = parseInt(p.named.count || "4", 10) || 4;
        const out = [];
        for (let i = 0; i < Math.min(count, 4); i++)
          out.push(`Reply from ${target}: bytes=32 time=${3 + i * 2}ms TTL=128`);
        out.push("", `Ping statistics for ${target}: Sent = ${Math.min(count, 4)}, Received = ${Math.min(count, 4)}, Lost = 0`);
        return out;
      },
      "test-netconnection"(p) {
        const target = p.named.computername || p.positional[0] || "127.0.0.1";
        const port = p.named.port;
        const out = [`ComputerName     : ${target}`, `RemoteAddress    : ${target}`,
          `PingSucceeded    : True`, `PingReplyDetails : 4ms`];
        if (port) out.push(`TcpTestSucceeded : True   (port ${port}, simulated)`);
        return out;
      },
      "resolve-dnsname"(p) {
        const n = (p.named.name || p.positional[0] || "").toLowerCase();
        /* n9leb f records dyal DNS (b7al nslookup), machi ghir dc01 */
        const hit = T.dnsRecords().find(r => (r.name + "." + r.zone).toLowerCase() === n || r.name.toLowerCase() === n);
        if (hit) return [`Name                           Type   IPAddress`, `----                           ----   ---------`, pad(hit.name + "." + hit.zone, 31) + pad(hit.type, 7) + hit.data];
        return [[`Resolve-DnsName: '${p.named.name || p.positional[0]}' could not be resolved (simulated).`, "t-err"]];
      },
      "restart-computer"() {
        return ["The server will restart now. (simulated — your lab state is preserved)"];
      },

      /* ----- logs & storage ----- */
      "get-eventlog"(p) {
        const rawLog = p.named.logname || "System";
        const log = String(rawLog).toLowerCase();
        // Application 3ndha sample dyalha, machi nafs System
        const appEvents = [
          ["2026-10-09 08:13:20", "1000", "Application", "Application 'dns.exe' started successfully."],
          ["2026-10-09 08:15:47", "1001", "Application", "The DHCP Server service entered the running state."],
          ["2026-10-09 09:02:11", "1002", "Application", "Group Policy settings were applied successfully."],
        ];
        const sets = { system: SAMPLE.events, application: appEvents };
        if (!sets[log])
          return [[`Get-EventLog: log '${rawLog}' not found. Try 'System' or 'Application'.`, "t-err"]];
        const rows = sets[log];
        const label = log === "application" ? "Application" : "System";
        const n = Math.min(parseInt(p.named.newest || "5", 10) || 5, rows.length);
        const out = [pad("Time", 20) + pad("Id", 7) + pad("Log", 12) + "Message", pad("", 20, "-") + " " + pad("", 5, "-") + " " + pad("", 10, "-") + " -------"];
        rows.slice(0, n).forEach(e => out.push(pad(e[0], 20) + pad(e[1], 7) + pad(label, 12) + e[3]));
        return out;
      },
      "get-winevent"(p) {
        // -MaxEvents hiya nafs -Newest dyal Get-EventLog
        const q = { named: Object.assign({}, p.named, { newest: p.named.maxevents || "5" }), positional: p.positional, raw: p.raw };
        return T.handlers["get-eventlog"].call(T, q);
      },
      "get-disk"() {
        const out = [pad("Number", 8) + pad("FriendlyName", 20) + pad("Size", 9) + pad("PartitionStyle", 16) + "OperationalStatus",
                     pad("", 8, "-") + " " + pad("", 18, "-") + " " + pad("", 7, "-") + " " + pad("", 15, "-") + " -----------------"];
        T.disks().forEach(d => out.push(pad(d.number, 8) + pad(d.name, 20) + pad(d.size, 9) + pad(d.style, 16) + d.status));
        return out;
      },
      "get-volume"() {
        const out = [pad("DriveLetter", 12) + pad("Label", 10) + pad("FileSystem", 12) + pad("Size", 9) + "SizeRemaining",
                     pad("", 12, "-") + " " + pad("", 8, "-") + " " + pad("", 11, "-") + " " + pad("", 7, "-") + " -------------"];
        T.volumes().forEach(v => out.push(pad(v.letter, 12) + pad(v.label, 10) + pad(v.fs, 12) + pad(v.size, 9) + v.remaining));
        return out;
      },
      "get-netfirewallrule"() {
        const out = [pad("DisplayName", 28) + pad("Direction", 11) + pad("Action", 8) + "Enabled",
                     pad("", 28, "-") + " " + pad("", 10, "-") + " " + pad("", 7, "-") + " -------"];
        T.fwRules().forEach(f => out.push(pad(f.name, 28) + pad(f.direction, 11) + pad(f.action, 8) + f.enabled));
        return out;
      },

      /* ----- Active Directory: forest lab.local kamla, state m7fouda f store ----- */
      "get-adforest"() {
        const ad = T.store.data.ad;
        return ["ForestMode             : " + ad.functionalLevel,
          "Name                   : " + ad.forest,
          "Domains                : {" + ad.domain + "}",
          "SchemaMaster           : " + ad.dc,
          "DomainNamingMaster     : " + ad.dc];
      },
      "get-addomain"() {
        const ad = T.store.data.ad;
        return ["DNSRoot                : " + ad.domain,
          "NetBIOSName            : LAB",
          "DomainControllers      : {" + ad.dc + "}",
          "DomainMode             : " + ad.functionalLevel];
      },
      "get-addomaincontroller"() {
        const ad = T.store.data.ad;
        return ["Name                   : " + ad.dc,
          "Domain                 : " + ad.domain,
          "Site                   : " + ad.site,
          "IsGlobalCatalog        : True",
          "OperatingSystem        : Windows Server 2019 Standard"];
      },
      "install-addsforest"(p) {
        if (!T.store.data.roles.includes("AD-Domain-Services"))
          return [["Install-ADDSForest: the AD DS role is not installed. Run 'Install-WindowsFeature AD-Domain-Services' first.", "t-err"]];
        const dn = String(p.named.domainname || p.positional[0] || "lab.local").replace(/['"]/g, "");
        T.store.data.domain = dn;
        T.store.data.ad.domain = dn;
        T.store.data.ad.forest = dn;
        T.store.save();
        return [[`✔ Forest ${dn} created; this server is now a domain controller. (simulated)`, "t-ok"]];
      },
      "add-computer"(p) {
        const dn = String(p.named.domainname || p.positional[0] || "").replace(/['"]/g, "");
        if (!dn) return [["Usage: Add-Computer -DomainName <domain>", "t-err"]];
        // bla forest, domain join ma ymknch — WORKGROUP hiya l7ala l2asliya
        if (!T.store.data.domain || T.store.data.domain === "WORKGROUP")
          return [[`Add-Computer: the domain '${dn}' cannot be contacted. No forest exists yet — run 'Install-ADDSForest -DomainName ${dn}' first.`, "t-err"]];
        T.store.data.domain = dn;
        T.store.save();
        return [[`✔ Computer joined to domain '${dn}'. A restart is required (simulated).`, "t-ok"]];
      },
      "test-computersecurechannel"() {
        // workgroup = False, domain-joined = True
        if (!T.store.data.domain || T.store.data.domain === "WORKGROUP")
          return ["False", "(the server is in a workgroup — join a domain first)"];
        return ["True"];
      },
      "get-aduser"(p) {
        const ad = T.store.data.ad;
        const id = p.named.identity || p.positional[0];
        if (id) {
          const u = ad.users.find(x => x.name.toLowerCase() === String(id).toLowerCase());
          if (!u) return [[`Get-ADUser: Cannot find an object with identity: '${id}'.`, "t-err"]];
          return ["DistinguishedName : " + adDN(u, ad),
            "Enabled           : " + (u.enabled ? "True" : "False"),
            "Name              : " + u.name,
            "SamAccountName    : " + u.name,
            "MemberOf          : " + (u.groups.join(", ") || "(none)")];
        }
        // -Filter * = ga3 users; -Filter "prop -like 'x*'" = match sghir b wildcard
        let list = ad.users.slice();
        const sb = p.named.searchbase;
        if (sb) {
          const m = /OU=([^,;]+)/i.exec(String(sb));
          if (m) list = list.filter(u => u.container && u.container.toLowerCase() === m[1].toLowerCase());
        }
        if (p.named.filter !== undefined && p.named.filter !== true) {
          const f = String(p.named.filter).trim();
          if (f !== "*") {
            const m = /^\s*([A-Za-z]+)\s+-(like|eq)\s+['"]?(.*?)['"]?\s*$/i.exec(f);
            if (!m) return [[`Get-ADUser: filter '${f}' is not supported in the simulator. Use -Filter * or "property -like 'x*'".`, "t-err"]];
            const prop = m[1].toLowerCase(), op = m[2].toLowerCase(), pat = m[3];
            list = list.filter(u => {
              const v = String(u[prop] !== undefined && u[prop] !== null ? u[prop] : "");
              if (op === "like") {
                const re = new RegExp("^" + pat.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$", "i");
                return re.test(v);
              }
              return v.toLowerCase() === pat.toLowerCase();
            });
          }
        }
        if (!list.length) return ["(no users match the filter)"];
        const out = ["Name         Enabled  DistinguishedName", "----         -------  -----------------"];
        list.forEach(u => out.push(pad(u.name, 13) + pad(u.enabled ? "True" : "False", 9) + adDN(u, ad)));
        return out;
      },
      "new-aduser"(p) {
        const name = p.named.name || p.positional[0];
        if (!name) return [["Usage: New-ADUser -Name <name> [-Path <OU>] [-Enabled $true|$false]", "t-err"]];
        const ad = T.store.data.ad;
        if (ad.users.some(x => x.name.toLowerCase() === String(name).toLowerCase()))
          return [[`New-ADUser: An object with the name '${name}' already exists.`, "t-err"]];
        let container = "Users";
        const m = /OU=([^,;]+)/i.exec(p.named.path || "");
        if (m) {
          const ou = ad.containers.find(c => c.name.toLowerCase() === m[1].toLowerCase());
          if (!ou) return [[`New-ADUser: OU '${m[1]}' was not found.`, "t-err"]];
          container = ou.name;
        }
        const raw = p.named.enabled !== undefined ? String(p.named.enabled).toLowerCase() : "$true";
        ad.users.push({ name: String(name), container, enabled: !(raw === "$false" || raw === "false"), groups: [] });
        T.store.save();
        return [[`✔ User '${name}' created in ${container}.`, "t-ok"]];
      },
      "set-aduser"(p) {
        const id = p.named.identity || p.positional[0];
        const ad = T.store.data.ad;
        const u = id && ad.users.find(x => x.name.toLowerCase() === String(id).toLowerCase());
        if (!u) return [["Usage: Set-ADUser -Identity <name> [-Enabled $true|$false]", "t-err"]];
        if (p.named.enabled !== undefined) {
          const raw = String(p.named.enabled).toLowerCase();
          u.enabled = !(raw === "$false" || raw === "false");
        }
        T.store.save();
        return [[`✔ User '${u.name}' updated.`, "t-ok"]];
      },
      "enable-adaccount"(p) {
        const id = p.named.identity || p.positional[0];
        const u = id && T.store.data.ad.users.find(x => x.name.toLowerCase() === String(id).toLowerCase());
        if (!u) return [["Usage: Enable-ADAccount -Identity <name>", "t-err"]];
        u.enabled = true; T.store.save();
        return [[`✔ Account '${u.name}' enabled.`, "t-ok"]];
      },
      "disable-adaccount"(p) {
        const id = p.named.identity || p.positional[0];
        const u = id && T.store.data.ad.users.find(x => x.name.toLowerCase() === String(id).toLowerCase());
        if (!u) return [["Usage: Disable-ADAccount -Identity <name>", "t-err"]];
        u.enabled = false; T.store.save();
        return [[`✔ Account '${u.name}' disabled.`, "t-ok"]];
      },
      "remove-aduser"(p) {
        const id = p.named.identity || p.positional[0];
        if (!id) return [["Usage: Remove-ADUser -Identity <name>", "t-err"]];
        const ad = T.store.data.ad;
        const i = ad.users.findIndex(x => x.name.toLowerCase() === String(id).toLowerCase());
        if (i < 0) return [[`Remove-ADUser: Cannot find an object with identity: '${id}'.`, "t-err"]];
        const gone = ad.users.splice(i, 1)[0];
        ad.groups.forEach(g => { g.members = g.members.filter(m => m.toLowerCase() !== gone.name.toLowerCase()); });
        T.store.save();
        return [[`✔ User '${gone.name}' removed.`, "t-ok"]];
      },
      "get-adcomputer"(p) {
        const ad = T.store.data.ad;
        const id = p.named.identity || p.positional[0];
        if (id) {
          const c = ad.computers.find(x => x.name.toLowerCase() === String(id).toLowerCase());
          if (!c) return [[`Get-ADComputer: Cannot find an object with identity: '${id}'.`, "t-err"]];
          return ["DistinguishedName : " + adDN(c, ad),
            "Name              : " + c.name,
            "DNSHostName       : " + c.name + "." + ad.domain];
        }
        const out = ["Name         DistinguishedName", "----         -----------------"];
        ad.computers.forEach(c => out.push(pad(c.name, 13) + adDN(c, ad)));
        return out;
      },
      "new-adcomputer"(p) {
        const name = p.named.name || p.positional[0];
        if (!name) return [["Usage: New-ADComputer -Name <name> [-Path <OU>]", "t-err"]];
        const ad = T.store.data.ad;
        if (ad.computers.some(x => x.name.toLowerCase() === String(name).toLowerCase()))
          return [[`New-ADComputer: An object with the name '${name}' already exists.`, "t-err"]];
        let container = "Computers";
        const m = /OU=([^,;]+)/i.exec(p.named.path || "");
        if (m) {
          const ou = ad.containers.find(c => c.name.toLowerCase() === m[1].toLowerCase());
          if (!ou) return [[`New-ADComputer: OU '${m[1]}' was not found.`, "t-err"]];
          container = ou.name;
        }
        ad.computers.push({ name: String(name), container });
        T.store.save();
        return [[`✔ Computer '${name}' created in ${container}.`, "t-ok"]];
      },
      "remove-adcomputer"(p) {
        const id = p.named.identity || p.positional[0];
        if (!id) return [["Usage: Remove-ADComputer -Identity <name>", "t-err"]];
        const ad = T.store.data.ad;
        const i = ad.computers.findIndex(x => x.name.toLowerCase() === String(id).toLowerCase());
        if (i < 0) return [[`Remove-ADComputer: Cannot find an object with identity: '${id}'.`, "t-err"]];
        const gone = ad.computers.splice(i, 1)[0];
        T.store.save();
        return [[`✔ Computer '${gone.name}' removed.`, "t-ok"]];
      },
      "get-adorganizationalunit"(p) {
        const ad = T.store.data.ad;
        const id = p.named.identity || p.positional[0];
        /* suffix DC 7asab domain li kayn daba (b7al adDomainSuffix f app.js) */
        const dom = (T.store.data.domain && T.store.data.domain !== "WORKGROUP") ? T.store.data.domain : (ad.domain || "lab.local");
        const dc = String(dom).split(".").filter(Boolean).map(x => "DC=" + x).join(",");
        const dnOf = c => (c.type === "ou" ? "OU=" : "CN=") + c.name + "," + dc;
        if (id) {
          const c = ad.containers.find(x => x.name.toLowerCase() === String(id).toLowerCase());
          if (!c) return [[`Get-ADOrganizationalUnit: Cannot find an object with identity: '${id}'.`, "t-err"]];
          return ["DistinguishedName : " + dnOf(c),
            "Name              : " + c.name,
            "ObjectClass       : " + (c.type === "ou" ? "organizationalUnit" : "container")];
        }
        const out = ["Name                  DistinguishedName", "----                  -----------------"];
        ad.containers.forEach(c => out.push(pad(c.name, 22) + dnOf(c)));
        return out;
      },
      "new-adorganizationalunit"(p) {
        const name = p.named.name || p.positional[0];
        if (!name) return [["Usage: New-ADOrganizationalUnit -Name <name>", "t-err"]];
        const ad = T.store.data.ad;
        if (ad.containers.some(x => x.name.toLowerCase() === String(name).toLowerCase()))
          return [[`New-ADOrganizationalUnit: An object with the name '${name}' already exists.`, "t-err"]];
        ad.containers.push({ name: String(name), type: "ou" });
        T.store.save();
        return [[`✔ Organizational unit '${name}' created.`, "t-ok"]];
      },
      "remove-adorganizationalunit"(p) {
        const id = p.named.identity || p.positional[0];
        if (!id) return [["Usage: Remove-ADOrganizationalUnit -Identity <OU-name>", "t-err"]];
        const ad = T.store.data.ad;
        const i = ad.containers.findIndex(x => x.name.toLowerCase() === String(id).toLowerCase() && x.type === "ou");
        if (i < 0) return [[`Remove-ADOrganizationalUnit: Cannot find an object with identity: '${id}'.`, "t-err"]];
        const gone = ad.containers[i];
        const hasKids = ad.users.some(u => u.container === gone.name) || ad.computers.some(c => c.container === gone.name) || ad.groups.some(g => g.container === gone.name);
        const rec = String(p.named.recursive || "").toLowerCase();
        if (hasKids && rec !== "$true" && rec !== "true")
          return [[`Remove-ADOrganizationalUnit: '${gone.name}' is not empty. Use -Recursive to delete it with its objects.`, "t-err"]];
        ad.users = ad.users.filter(u => u.container !== gone.name);
        ad.computers = ad.computers.filter(c => c.container !== gone.name);
        ad.groups = ad.groups.filter(g => g.container !== gone.name);
        ad.containers.splice(i, 1);
        T.store.save();
        return [[`✔ Organizational unit '${gone.name}' removed.`, "t-ok"]];
      },
      "get-adgroup"(p) {
        const ad = T.store.data.ad;
        const id = p.named.identity || p.positional[0];
        if (id) {
          const g = ad.groups.find(x => x.name.toLowerCase() === String(id).toLowerCase());
          if (!g) return [[`Get-ADGroup: Cannot find an object with identity: '${id}'.`, "t-err"]];
          return ["DistinguishedName : " + adDN(g, ad),
            "Name              : " + g.name,
            "GroupScope        : " + g.scope,
            "GroupCategory     : " + (g.category || "Security"),
            "Members           : " + (g.members.join(", ") || "(none)")];
        }
        const out = ["Name             Scope     DistinguishedName", "----             -----     -----------------"];
        ad.groups.forEach(g => out.push(pad(g.name, 17) + pad(g.scope, 10) + adDN(g, ad)));
        return out;
      },
      "new-adgroup"(p) {
        const name = p.named.name || p.positional[0];
        if (!name) return [["Usage: New-ADGroup -Name <name> -GroupScope <Global|DomainLocal|Universal>", "t-err"]];
        const ad = T.store.data.ad;
        if (ad.groups.some(x => x.name.toLowerCase() === String(name).toLowerCase()))
          return [[`New-ADGroup: An object with the name '${name}' already exists.`, "t-err"]];
        const want = String(p.named.groupscope || "Global").toLowerCase();
        const scope = ["Global", "DomainLocal", "Universal"].find(s => s.toLowerCase() === want) || "Global";
        const catRaw = String(p.named.groupcategory || "Security").toLowerCase();
        const category = ["security", "distribution"].find(c => c.toLowerCase() === catRaw);
        if (!category) return [[`New-ADGroup: '${p.named.groupcategory}' is not a valid GroupCategory. Valid values: Security, Distribution.`, "t-err"]];
        const cat = category.charAt(0).toUpperCase() + category.slice(1);
        let container = "Users";
        const m = /OU=([^,;]+)/i.exec(p.named.path || "");
        if (m) {
          const ou = ad.containers.find(c => c.name.toLowerCase() === m[1].toLowerCase());
          if (!ou) return [[`New-ADGroup: OU '${m[1]}' was not found.`, "t-err"]];
          container = ou.name;
        }
        ad.groups.push({ name: String(name), scope, category: cat, container, members: [] });
        T.store.save();
        return [[`✔ Group '${name}' (${scope}) created in ${container}.`, "t-ok"]];
      },
      "remove-adgroup"(p) {
        const id = p.named.identity || p.positional[0];
        if (!id) return [["Usage: Remove-ADGroup -Identity <name>", "t-err"]];
        const ad = T.store.data.ad;
        const i = ad.groups.findIndex(x => x.name.toLowerCase() === String(id).toLowerCase());
        if (i < 0) return [[`Remove-ADGroup: Cannot find an object with identity: '${id}'.`, "t-err"]];
        const gone = ad.groups.splice(i, 1)[0];
        ad.users.forEach(u => { u.groups = u.groups.filter(g => g.toLowerCase() !== gone.name.toLowerCase()); });
        T.store.save();
        return [[`✔ Group '${gone.name}' removed.`, "t-ok"]];
      },
      "get-adgroupmember"(p) {
        const id = p.named.identity || p.positional[0];
        const ad = T.store.data.ad;
        const g = id && ad.groups.find(x => x.name.toLowerCase() === String(id).toLowerCase());
        if (!g) return [["Usage: Get-ADGroupMember -Identity <group>", "t-err"]];
        if (!g.members.length) return [`(group '${g.name}' has no members)`];
        return ["Name", "----", ...g.members];
      },
      "add-adgroupmember"(p) {
        const id = p.named.identity || p.positional[0];
        const ad = T.store.data.ad;
        const g = id && ad.groups.find(x => x.name.toLowerCase() === String(id).toLowerCase());
        if (!g) return [["Usage: Add-ADGroupMember -Identity <group> -Members <user,...>", "t-err"]];
        // -Members wla positionals: ila -Identity named, members f positional[0..],
        // ila identity positional, members f positional[1..]
        const memberTokens = p.named.identity !== undefined ? p.positional : p.positional.slice(1);
        const members = p.named.members !== undefined
          ? String(p.named.members).split(",").map(s => s.trim()).filter(Boolean)
          : memberTokens.flatMap(s => String(s).split(",")).map(s => s.trim()).filter(Boolean);
        if (!members.length) return [["Add-ADGroupMember: no member names supplied.", "t-err"]];
        const added = [], already = [], missing = [];
        members.forEach(mn => {
          const u = ad.users.find(x => x.name.toLowerCase() === mn.toLowerCase());
          if (!u) { missing.push(mn); return; }
          if (g.members.some(x => x.toLowerCase() === u.name.toLowerCase())) { already.push(u.name); return; }
          g.members.push(u.name);
          if (!u.groups.some(x => x.toLowerCase() === g.name.toLowerCase())) u.groups.push(g.name);
          added.push(u.name);
        });
        T.store.save();
        const out = [];
        missing.forEach(mn => out.push([`Add-ADGroupMember: Cannot find an object with identity: '${mn}'.`, "t-err"]));
        already.forEach(mn => out.push(`${mn} is already a member of '${g.name}'.`));
        if (added.length) out.push([`✔ Added ${added.join(", ")} to '${g.name}'.`, "t-ok"]);
        return out;
      },
      "remove-adgroupmember"(p) {
        const id = p.named.identity || p.positional[0];
        const ad = T.store.data.ad;
        const g = id && ad.groups.find(x => x.name.toLowerCase() === String(id).toLowerCase());
        if (!g) return [["Usage: Remove-ADGroupMember -Identity <group> -Members <user,...>", "t-err"]];
        const memberTokens = p.named.identity !== undefined ? p.positional : p.positional.slice(1);
        const members = p.named.members !== undefined
          ? String(p.named.members).split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
          : memberTokens.flatMap(s => String(s).split(",")).map(s => s.trim().toLowerCase()).filter(Boolean);
        g.members = g.members.filter(m => !members.includes(m.toLowerCase()));
        ad.users.forEach(u => { if (members.includes(u.name.toLowerCase())) u.groups = u.groups.filter(x => x.toLowerCase() !== g.name.toLowerCase()); });
        T.store.save();
        return [[`✔ Members removed from '${g.name}'.`, "t-ok"]];
      },
      /* ----- GPO: stateful (v1.8.0) ----- */
      "new-gpo"(p) {
        const name = p.named.name || p.positional[0];
        if (!name) return [["Usage: New-GPO -Name <name>", "t-err"]];
        const gpos = T.gpos();
        if (gpos.some(g => g.name.toLowerCase() === String(name).toLowerCase()))
          return [[`New-GPO: a GPO with the name '${name}' already exists.`, "t-err"]];
        const guid = "{" + [8, 4, 4, 4, 12].map(n => Array.from({ length: n }, () => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("")).join("-") + "}";
        gpos.push({ name: String(name), id: guid, links: [], created: new Date().toISOString().slice(0, 10) });
        T.store.save();
        return [[`✔ GPO '${name}' created (ID: ${guid}).`, "t-ok"]];
      },
      "get-gpo"(p) {
        const gpos = T.gpos();
        const name = p.named.name || p.positional[0];
        if (name) {
          const g = gpos.find(x => x.name.toLowerCase() === String(name).toLowerCase());
          if (!g) return [[`Get-GPO: GPO '${name}' was not found.`, "t-err"]];
          return ["DisplayName : " + g.name, "Id          : " + g.id, "Status      : Enabled", "Links       : " + (g.links.join(", ") || "(none)")];
        }
        if (!gpos.length) return ["(no GPOs yet — use New-GPO to create one)"];
        const out = [pad("DisplayName", 24) + pad("Status", 10) + pad("Created", 12) + "Links",
                     pad("", 24, "-") + " " + pad("", 8, "-") + " " + pad("", 10, "-") + " -----"];
        gpos.forEach(g => out.push(pad(g.name, 24) + pad("Enabled", 10) + pad(g.created, 12) + (g.links.join(", ") || "(none)")));
        return out;
      },
      "new-gplink"(p) {
        const name = p.named.name || p.positional[0], target = p.named.target;
        if (!name || !target) return [["Usage: New-GPLink -Name <gpo> -Target <dn>", "t-err"]];
        const g = T.gpos().find(x => x.name.toLowerCase() === String(name).toLowerCase());
        if (!g) return [[`New-GPLink: GPO '${name}' was not found.`, "t-err"]];
        if (!g.links.includes(target)) g.links.push(target);
        T.store.save();
        return [[`✔ GPO '${g.name}' linked to '${target}'.`, "t-ok"]];
      },
      "remove-gpo"(p) {
        const name = p.named.name || p.positional[0];
        if (!name) return [["Usage: Remove-GPO -Name <name>", "t-err"]];
        if (String(name).toLowerCase() === "default domain policy")
          return [[`Remove-GPO: the Default Domain Policy is protected in the simulator.`, "t-err"]];
        const gpos = T.gpos();
        const i = gpos.findIndex(x => x.name.toLowerCase() === String(name).toLowerCase());
        if (i < 0) return [[`Remove-GPO: GPO '${name}' was not found.`, "t-err"]];
        gpos.splice(i, 1);
        T.store.save();
        return [[`✔ GPO '${name}' removed.`, "t-ok"]];
      },
      "gpupdate"() {
        const applied = T.gpos().filter(g => g.links.length);
        const out = ["Updating policy...", "",
          "Computer Policy update has completed successfully.",
          "User Policy update has completed successfully."];
        if (applied.length) {
          out.push("", "Applied GPOs:");
          applied.forEach(g => out.push("    " + g.name + "  (linked to " + g.links.join(", ") + ")"));
        } else {
          out.push("", "(no GPOs are linked — nothing to apply)");
        }
        return out;
      },
      "gpresult"(p) {
        const sw = (p.positional[0] || "").toLowerCase();
        if (sw !== "/r") return [["Usage: gpresult /r", "t-err"]];
        const applied = T.gpos().filter(g => g.links.length);
        const d = T.store.data;
        const out = ["RSOP summary for " + (d.hostname || "WINSRV-CORE") + " (simulated)", "",
          "COMPUTER SETTINGS", "------------------",
          "    CN=" + (d.hostname || "WINSRV-CORE") + ",OU=Domain Controllers,DC=lab,DC=local", "",
          "    Applied Group Policy Objects", "    -----------------------------"];
        if (applied.length) applied.forEach(g => out.push("        " + g.name));
        else out.push("        (none — no GPOs are linked)");
        out.push("", "USER SETTINGS", "------------------",
          "    Applied Group Policy Objects", "    -----------------------------");
        if (applied.length) applied.forEach(g => out.push("        " + g.name));
        else out.push("        (none — no GPOs are linked)");
        return out;
      },
      "backup-gpo"(p) {
        const path = p.named.path || p.positional[0];
        if (!path) return [["Usage: Backup-GPO [-Name <gpo> | -All] -Path <folder>", "t-err"]];
        const gpos = T.gpos();
        if (p.named.all !== undefined) {
          if (!gpos.length) return ["(no GPOs to back up)"];
          return [[`✔ Backed up ${gpos.length} GPO(s) to '${path}'.`, "t-ok"]];
        }
        const name = p.named.name || p.positional[0];
        if (!name) return [["Usage: Backup-GPO [-Name <gpo> | -All] -Path <folder>", "t-err"]];
        const g = gpos.find(x => x.name.toLowerCase() === String(name).toLowerCase());
        if (!g) return [[`Backup-GPO: GPO '${name}' was not found.`, "t-err"]];
        return [[`✔ GPO '${g.name}' backed up to '${path}'.`, "t-ok"]];
      },

      /* ----- firewall: stateful (v1.8.0) ----- */
      "new-netfirewallrule"(p) {
        const name = p.named.displayname || p.positional[0];
        const dir = p.named.direction, act = p.named.action;
        if (!name || !dir || !act) return [["Usage: New-NetFirewallRule -DisplayName <name> -Direction <Inbound|Outbound> -Action <Allow|Block>", "t-err"]];
        const d = String(dir).toLowerCase(), a = String(act).toLowerCase();
        if (d !== "inbound" && d !== "outbound") return [[`New-NetFirewallRule: '${dir}' is not a valid Direction. Valid values: Inbound, Outbound.`, "t-err"]];
        if (a !== "allow" && a !== "block") return [[`New-NetFirewallRule: '${act}' is not a valid Action. Valid values: Allow, Block.`, "t-err"]];
        const rules = T.fwRules();
        if (rules.some(r => r.name.toLowerCase() === String(name).toLowerCase()))
          return [[`✔ Firewall rule '${name}' is already present.`, "t-ok"]];
        rules.push({ name: String(name), direction: d === "inbound" ? "Inbound" : "Outbound", action: a === "allow" ? "Allow" : "Block", enabled: "Enabled" });
        T.store.save();
        return [[`✔ Firewall rule '${name}' created.`, "t-ok"]];
      },
      "enable-netfirewallrule"(p) {
        const name = p.named.displayname || p.positional[0];
        if (!name) return [["Usage: Enable-NetFirewallRule -DisplayName <name>", "t-err"]];
        const r = T.fwRules().find(x => x.name.toLowerCase() === String(name).toLowerCase());
        if (!r) return [[`Enable-NetFirewallRule: rule '${name}' was not found.`, "t-err"]];
        r.enabled = "Enabled"; T.store.save();
        return [[`✔ Firewall rule '${r.name}' enabled.`, "t-ok"]];
      },
      "disable-netfirewallrule"(p) {
        const name = p.named.displayname || p.positional[0];
        if (!name) return [["Usage: Disable-NetFirewallRule -DisplayName <name>", "t-err"]];
        const r = T.fwRules().find(x => x.name.toLowerCase() === String(name).toLowerCase());
        if (!r) return [[`Disable-NetFirewallRule: rule '${name}' was not found.`, "t-err"]];
        r.enabled = "Disabled"; T.store.save();
        return [[`✔ Firewall rule '${r.name}' disabled.`, "t-ok"]];
      },

      /* ----- storage: stateful (v1.8.0) ----- */
      "initialize-disk"(p) {
        const num = String(p.named.number || p.positional[0] || "");
        const style = String(p.named.partitionstyle || "GPT");
        const disk = T.disks().find(d => d.number === num);
        if (!disk) return [[`Initialize-Disk: disk ${num || "(none)"} was not found.`, "t-err"]];
        if (disk.style !== "RAW") return [`Disk ${num} is already initialized (${disk.style}).`];
        const st = style.toLowerCase();
        if (st !== "gpt" && st !== "mbr") return [[`Initialize-Disk: '${style}' is not a valid PartitionStyle. Valid values: GPT, MBR.`, "t-err"]];
        disk.style = st === "gpt" ? "GPT" : "MBR";
        disk.status = "Online";
        T.store.save();
        return [[`✔ Disk ${num} initialized as ${disk.style} and moved Online.`, "t-ok"]];
      },
      "new-partition"(p) {
        const num = String(p.named.disknumber || p.positional[0] || "");
        const letter = String(p.named.driveletter || "").replace(/[:]/g, "").toUpperCase();
        if (!num || !letter) return [["Usage: New-Partition -DiskNumber <n> -UseMaximumSize -DriveLetter <letter>", "t-err"]];
        const disk = T.disks().find(d => d.number === num);
        if (!disk) return [[`New-Partition: disk ${num} was not found.`, "t-err"]];
        if (disk.style === "RAW") return [[`New-Partition: disk ${num} is not initialized. Run Initialize-Disk first.`, "t-err"]];
        const vols = T.volumes();
        if (vols.some(v => v.letter.toUpperCase() === letter))
          return [[`New-Partition: drive letter '${letter}' is already in use.`, "t-err"]];
        vols.push({ letter, label: "New Volume", fs: "RAW", size: disk.size, remaining: disk.size + " free" });
        T.store.save();
        return [[`✔ Partition created on disk ${num} as drive ${letter}:.`, "t-ok"]];
      },
      "format-volume"(p) {
        const letter = String(p.named.driveletter || p.positional[0] || "").replace(/[:]/g, "").toUpperCase();
        const fs = p.named.filesystem || "NTFS";
        if (!letter) return [["Usage: Format-Volume -DriveLetter <letter> -FileSystem <fs>", "t-err"]];
        const v = T.volumes().find(x => x.letter.toUpperCase() === letter);
        if (!v) return [[`Format-Volume: volume '${letter}:' was not found. Create a partition first.`, "t-err"]];
        v.fs = String(fs).toUpperCase();
        T.store.save();
        return [[`✔ Volume ${letter}: formatted as ${v.fs}.`, "t-ok"]];
      },

      /* ----- shares w files (v1.8.0) ----- */
      "new-item"(p) {
        const path = p.named.path || p.positional[0];
        const type = p.named.itemtype || "Directory";
        if (!path) return [["Usage: New-Item -Path <path> -ItemType <Directory|File>", "t-err"]];
        const items = T.store.data.items || (T.store.data.items = []);
        if (items.some(i => String(i.path).toLowerCase() === String(path).toLowerCase()))
          return [[`New-Item: '${path}' already exists.`, "t-err"]];
        items.push({ path: String(path), type: String(type) });
        T.store.save();
        const kind = String(type).toLowerCase() === "file" ? "File" : "Directory";
        return [[`✔ ${kind} '${path}' created.`, "t-ok"]];
      },
      "new-smbshare"(p) {
        const name = p.named.name || p.positional[0], path = p.named.path;
        if (!name || !path) return [["Usage: New-SmbShare -Name <name> -Path <folder>", "t-err"]];
        const shares = T.shares();
        if (shares.some(s => s.name.toLowerCase() === String(name).toLowerCase()))
          return [[`New-SmbShare: a share with the name '${name}' already exists.`, "t-err"]];
        shares.push({ name: String(name), path: String(path), description: "" });
        T.store.save();
        return [[`✔ Share \\\\${T.store.data.hostname || "WINSRV-CORE"}\\${name} created.`, "t-ok"]];
      },
      "get-smbshare"(p) {
        const name = p.named.name || p.positional[0];
        const shares = T.shares();
        if (name) {
          const s = shares.find(x => x.name.toLowerCase() === String(name).toLowerCase());
          if (!s) return [[`Get-SmbShare: share '${name}' was not found.`, "t-err"]];
          return ["Name        : " + s.name, "Path        : " + s.path, "Description : " + (s.description || "(none)")];
        }
        const out = [pad("Name", 12) + pad("Path", 16) + "Description",
                     pad("", 12, "-") + " " + pad("", 14, "-") + " -----------"];
        shares.forEach(s => out.push(pad(s.name, 12) + pad(s.path, 16) + (s.description || "")));
        return out;
      },
      "grant-smbshareaccess"(p) {
        const name = p.named.name, account = p.named.accountname, right = p.named.accessright;
        if (!name || !account || !right) return [["Usage: Grant-SmbShareAccess -Name <share> -AccountName <account> -AccessRight <Full|Change|Read>", "t-err"]];
        const s = T.shares().find(x => x.name.toLowerCase() === String(name).toLowerCase());
        if (!s) return [[`Grant-SmbShareAccess: share '${name}' was not found.`, "t-err"]];
        const r = String(right).toLowerCase();
        if (!["full", "change", "read"].includes(r))
          return [[`Grant-SmbShareAccess: '${right}' is not a valid AccessRight. Valid values: Full, Change, Read.`, "t-err"]];
        s.access = s.access || [];
        s.access.push({ account: String(account), right: r.charAt(0).toUpperCase() + r.slice(1) });
        T.store.save();
        return [[`✔ Granted ${account} ${r.charAt(0).toUpperCase() + r.slice(1)} access to share '${s.name}'.`, "t-ok"]];
      },
      "new-dfsnroot"(p) {
        const path = p.named.path, target = p.named.targetpath;
        if (!path || !target) return [["Usage: New-DfsnRoot -Path <namespace> -TargetPath <target>", "t-err"]];
        const roots = T.store.data.dfsRoots || (T.store.data.dfsRoots = []);
        if (roots.some(r => String(r.path).toLowerCase() === String(path).toLowerCase()))
          return [[`New-DfsnRoot: a DFS namespace '${path}' already exists.`, "t-err"]];
        roots.push({ path: String(path), targetPath: String(target) });
        T.store.save();
        return [[`✔ DFS namespace '${path}' created with target '${target}'.`, "t-ok"]];
      },

      /* ----- AD: move/object/policy (v1.8.0) ----- */
      "move-adobject"(p) {
        const id = p.named.identity || p.positional[0];
        const target = p.named.targetpath;
        if (!id || !target) return [["Usage: Move-ADObject -Identity <object> -TargetPath <OU-DN>", "t-err"]];
        const found = T.findADObject(id);
        if (!found) return [[`Move-ADObject: Cannot find an object with identity: '${id}'.`, "t-err"]];
        const ouName = T.ouFromDN(target);
        if (!ouName) return [[`Move-ADObject: TargetPath '${target}' does not name an OU.`, "t-err"]];
        const ad = T.store.data.ad;
        const ou = ad.containers.find(c => c.name.toLowerCase() === ouName.toLowerCase());
        if (!ou) return [[`Move-ADObject: OU '${ouName}' was not found.`, "t-err"]];
        found.obj.container = ou.name;
        T.store.save();
        return [[`✔ Object '${found.obj.name}' moved to '${ou.name}'.`, "t-ok"]];
      },
      "get-adobject"(p) {
        const ad = T.store.data.ad;
        const id = p.named.identity || p.positional[0];
        const typeOf = o => o.kind;
        /* suffix DC 7asab domain li kayn daba (b7al adDomainSuffix f app.js) */
        const dom = (T.store.data.domain && T.store.data.domain !== "WORKGROUP") ? T.store.data.domain : (ad.domain || "lab.local");
        const dc = String(dom).split(".").filter(Boolean).map(x => "DC=" + x).join(",");
        const dnOf = o => {
          const cont = (ad.containers || []).find(c => c.name === o.obj.container);
          const pre = cont && cont.type === "ou" ? "OU" : "CN";
          return `CN=${o.obj.name},${pre}=${o.obj.container},${dc}`;
        };
        if (id) {
          const found = T.findADObject(id);
          if (!found) return [[`Get-ADObject: Cannot find an object with identity: '${id}'.`, "t-err"]];
          return ["DistinguishedName : " + dnOf(found),
            "Name              : " + found.obj.name,
            "ObjectClass       : " + found.kind];
        }
        let rows = [];
        ad.users.forEach(u => rows.push({ obj: u, kind: "user" }));
        ad.computers.forEach(c => rows.push({ obj: c, kind: "computer" }));
        ad.groups.forEach(g => rows.push({ obj: g, kind: "group" }));
        ad.containers.forEach(c => rows.push({ obj: { name: c.name, container: "" }, kind: c.type === "ou" ? "organizationalUnit" : "container" }));
        const sb = p.named.searchbase;
        if (sb) {
          const ouName = T.ouFromDN(sb);
          if (ouName) rows = rows.filter(r => (r.obj.container && r.obj.container.toLowerCase() === ouName.toLowerCase()) || r.obj.name.toLowerCase() === ouName.toLowerCase());
        }
        if (p.named.filter !== undefined && p.named.filter !== true && String(p.named.filter).trim() !== "*")
          return [[`Get-ADObject: only -Filter * is supported in the simulator.`, "t-err"]];
        if (!rows.length) return ["(no objects found)"];
        const out = [pad("Name", 18) + pad("ObjectClass", 20) + "DistinguishedName",
                     pad("", 18, "-") + " " + pad("", 18, "-") + " -----------------"];
        rows.forEach(r => {
          const dn = r.kind === "organizationalUnit" || r.kind === "container"
            ? ((r.kind === "organizationalUnit" ? "OU=" : "CN=") + r.obj.name + "," + dc)
            : dnOf(r);
          out.push(pad(r.obj.name, 18) + pad(r.kind, 20) + dn);
        });
        return out;
      },
      "get-addefaultdomainpasswordpolicy"(p) {
        const rows = SAMPLE.passwordPolicy;
        const get = k => (rows.find(r => r[0] === k) || [])[1] || "";
        return ["ComplexityEnabled           : " + (get("Complexity requirements") === "Enabled" ? "True" : "False"),
          "LockoutDuration             : 00:30:00",
          "LockoutObservationWindow    : 00:30:00",
          "LockoutThreshold            : " + get("Account lockout threshold"),
          "MaxPasswordAge              : " + get("Maximum password age"),
          "MinPasswordAge              : 1.00:00:00",
          "MinPasswordLength           : " + get("Minimum password length"),
          "PasswordHistoryCount        : 24",
          "ReversibleEncryptionEnabled : False"];
      },

      /* ----- remoting (v1.8.0) ----- */
      "enable-psremoting"() {
        T.store.data.psRemoting = true;
        T.store.save();
        return ["WinRM is set up to receive requests on this computer. (simulated)",
          [`✔ PS Remoting enabled.`, "t-ok"]];
      },
      "enter-pssession"(p) {
        const cn = p.named.computername || p.positional[0];
        if (!cn) return [["Usage: Enter-PSSession -ComputerName <computer>", "t-err"]];
        return [`Connected to ${cn} via WinRM. (simulated — commands still run locally on this server.)`,
          `[${cn}]: PS C:\\Users\\Administrator>`];
      },

      /* ----- outils .exe: nslookup / ping / dsadd / redirusr / netdom / netsh (v1.8.0) ----- */
      "nslookup"(p) {
        const name = (p.positional[0] || "").toLowerCase();
        if (!name) return [["Usage: nslookup <name>", "t-err"]];
        const recs = T.dnsRecords();
        const hit = recs.find(r => (r.name + "." + r.zone).toLowerCase() === name || r.name.toLowerCase() === name);
        if (!hit) return [[`*** 127.0.0.1 can't find ${p.positional[0]}: Non-existent domain`, "t-err"]];
        return ["Server:  127.0.0.1", "Address:  127.0.0.1", "",
          "Name:    " + hit.name + "." + hit.zone, "Address:  " + hit.data];
      },
      "ping"(p) {
        const target = p.positional[0];
        if (!target) return [["Usage: ping <target>", "t-err"]];
        const out = [`Pinging ${target} with 32 bytes of data:`];
        for (let i = 0; i < 4; i++) out.push(`Reply from ${target}: bytes=32 time<1ms TTL=128`);
        out.push("", `Ping statistics for ${target}:`,
          "    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),",
          "Approximate round trip times in milli-seconds:",
          "    Minimum = 0ms, Maximum = 1ms, Average = 0ms");
        return out;
      },
      "dsadd"(p) {
        const kind = (p.positional[0] || "").toLowerCase();
        const dn = p.positional[1] || "";
        if (!kind || !dn) return [["Usage: dsadd <user|computer|ou|group> \"<DN>\"", "t-err"]];
        const ad = T.store.data.ad;
        const cn = /CN=([^,;]+)/i.exec(dn);
        const ouName = T.ouFromDN(dn);
        const name = cn ? cn[1] : (kind === "ou" ? (ouName || "") : "");
        if (!name) return [[`dsadd: could not read a name from '${dn}'.`, "t-err"]];
        if (kind === "ou") {
          if (ad.containers.some(c => c.name.toLowerCase() === name.toLowerCase()))
            return [[`dsadd: An object with the name '${name}' already exists.`, "t-err"]];
          ad.containers.push({ name, type: "ou" });
          T.store.save();
          return [[`✔ Organizational unit '${name}' created.`, "t-ok"]];
        }
        let container = kind === "computer" ? "Computers" : "Users";
        if (ouName) {
          const ou = ad.containers.find(c => c.name.toLowerCase() === ouName.toLowerCase());
          if (!ou) return [[`dsadd: OU '${ouName}' was not found.`, "t-err"]];
          container = ou.name;
        }
        if (kind === "user") {
          if (ad.users.some(x => x.name.toLowerCase() === name.toLowerCase()))
            return [[`dsadd: An object with the name '${name}' already exists.`, "t-err"]];
          ad.users.push({ name, container, enabled: true, groups: [] });
          T.store.save();
          return [[`✔ User '${name}' created in ${container}.`, "t-ok"]];
        }
        if (kind === "computer") {
          if (ad.computers.some(x => x.name.toLowerCase() === name.toLowerCase()))
            return [[`dsadd: An object with the name '${name}' already exists.`, "t-err"]];
          ad.computers.push({ name, container });
          T.store.save();
          return [[`✔ Computer '${name}' created in ${container}.`, "t-ok"]];
        }
        if (kind === "group") {
          if (ad.groups.some(x => x.name.toLowerCase() === name.toLowerCase()))
            return [[`dsadd: An object with the name '${name}' already exists.`, "t-err"]];
          ad.groups.push({ name, scope: "Global", category: "Security", container, members: [] });
          T.store.save();
          return [[`✔ Group '${name}' (Global) created in ${container}.`, "t-ok"]];
        }
        return [[`dsadd: unknown object type '${kind}'. Use user, computer, ou or group.`, "t-err"]];
      },
      "dsmod"(p) {
        const kind = (p.positional[0] || "").toLowerCase();
        const dn = p.positional[1] || "";
        if (kind !== "user" || !dn) return [["Usage: dsmod user <dn> [-disabled <yes|no>]", "t-err"]];
        const ad = T.store.data.ad;
        const cn = /CN=([^,;]+)/i.exec(dn);
        const name = cn ? cn[1] : dn;
        const u = ad.users.find(x => x.name.toLowerCase() === String(name).toLowerCase());
        if (!u) return [[`dsmod: Cannot find an object with identity: '${name}'.`, "t-err"]];
        if (p.named.disabled === undefined) return [["Usage: dsmod user <dn> -disabled <yes|no>", "t-err"]];
        const dis = String(p.named.disabled).toLowerCase();
        if (dis !== "yes" && dis !== "no") return [[`dsmod: '-disabled' must be yes or no.`, "t-err"]];
        u.enabled = dis === "no";
        T.store.save();
        return [[`✔ User '${u.name}' ${u.enabled ? "enabled" : "disabled"}.`, "t-ok"]];
      },
      "dsrm"(p) {
        const dn = p.positional[0] || "";
        if (!dn) return [["Usage: dsrm <dn>", "t-err"]];
        const ad = T.store.data.ad;
        const found = T.findADObject(dn);
        if (found) {
          if (found.kind === "user") {
            ad.users = ad.users.filter(x => x !== found.obj);
            ad.groups.forEach(g => { g.members = g.members.filter(m => m.toLowerCase() !== found.obj.name.toLowerCase()); });
          } else if (found.kind === "computer") {
            ad.computers = ad.computers.filter(x => x !== found.obj);
          } else {
            ad.groups = ad.groups.filter(x => x !== found.obj);
            ad.users.forEach(u => { u.groups = u.groups.filter(g => g.toLowerCase() !== found.obj.name.toLowerCase()); });
          }
          T.store.save();
          return [[`✔ Object '${found.obj.name}' deleted.`, "t-ok"]];
        }
        // OU (wla container) — ghir ila DN bla CN= (CN= kay3ni object ldakhel OU)
        const hasCN = /CN=/i.test(dn);
        const ouName = !hasCN ? T.ouFromDN(dn) : null;
        if (ouName) {
          const c = ad.containers.find(x => x.name.toLowerCase() === ouName.toLowerCase());
          if (!c) return [[`dsrm: Cannot find an object with identity: '${dn}'.`, "t-err"]];
          if (c.type !== "ou") return [[`dsrm: container '${c.name}' cannot be removed.`, "t-err"]];
          const hasKids = ad.users.some(u => u.container === c.name) || ad.computers.some(x => x.container === c.name) || ad.groups.some(g => g.container === c.name);
          if (hasKids) return [[`dsrm: OU '${c.name}' is not empty.`, "t-err"]];
          ad.containers = ad.containers.filter(x => x !== c);
          T.store.save();
          return [[`✔ Organizational unit '${c.name}' deleted.`, "t-ok"]];
        }
        return [[`dsrm: Cannot find an object with identity: '${dn}'.`, "t-err"]];
      },
      "redirusr"(p) {
        const dn = p.positional[0];
        if (!dn) return [["Usage: redirusr \"<OU-DN>\"", "t-err"]];
        T.store.data.ad.defaultUserContainer = String(dn);
        T.store.save();
        return [[`✔ Default users container redirected to '${dn}'.`, "t-ok"]];
      },
      "rediruser"(p) {
        return T.handlers["redirusr"].call(T, p);
      },
      "netdom"(p) {
        const sub = (p.positional[0] || "").toLowerCase();
        const ad = T.store.data.ad;
        if (sub === "query") {
          const what = (p.positional[1] || "").toLowerCase();
          if (what === "fsmo") {
            return ["Schema master               " + ad.dc,
              "Domain naming master        " + ad.dc,
              "PDC                         " + ad.dc,
              "RID pool manager            " + ad.dc,
              "Infrastructure master       " + ad.dc,
              "The command completed successfully."];
          }
          if (what === "dc") {
            return ["List of domain controllers:", "    " + ad.dc, "The command completed successfully."];
          }
          return [[`netdom query: unknown query '${p.positional[1] || ""}'. Use 'query fsmo' or 'query dc'.`, "t-err"]];
        }
        if (sub === "join") {
          const domTok = p.positional.find(t => /^\/domain:/i.test(t));
          const dom = domTok ? domTok.split(":")[1] : "";
          if (!dom) return [["Usage: netdom join <computer> /domain:<domain> /UserD:<user> /passwordD:*", "t-err"]];
          if (!T.store.data.domain || T.store.data.domain === "WORKGROUP")
            return [[`netdom: the domain '${dom}' cannot be contacted. No forest exists yet — run 'Install-ADDSForest -DomainName ${dom}' first.`, "t-err"]];
          T.store.data.domain = dom;
          T.store.save();
          return [`The computer ${p.positional[1] || ad.dc.split(".")[0]} joined domain ${dom} successfully. A restart is required. (simulated)`];
        }
        if (sub === "renamecomputer") {
          const nn = p.positional.find(t => /^\/newname:/i.test(t));
          const n = nn ? nn.split(":")[1] : "";
          if (!n) return [["Usage: netdom renamecomputer <computer> /NewName:<name>", "t-err"]];
          if (n.length > 15) return [[`netdom: '${n}' is longer than 15 characters.`, "t-err"]];
          T.store.data.hostname = n;
          T.store.save();
          return [`The computer was renamed to '${n}'. A restart is required. (simulated)`];
        }
        return [["Usage: netdom <query fsmo|query dc|join|renamecomputer>", "t-err"]];
      },
      "netsh"(p) {
        const toks = p.positional.map(t => String(t).toLowerCase());
        if (toks[0] === "interface" && (toks[1] === "ipv4" || toks[1] === "ip")) {
          if (toks[2] === "set" && toks[3] === "address") {
            const iface = p.positional[4] || "Ethernet";
            if (toks[5] !== "static") return [["Usage: netsh interface ipv4 set address \"<iface>\" static <ip> <mask> [gateway]", "t-err"]];
            const ip = p.positional[6], mask = p.positional[7], gw = p.positional[8];
            if (ipToInt(ip) === null) return [[`netsh: '${ip}' is not a valid IPv4 address.`, "t-err"]];
            const plen = maskToPrefix(mask);
            if (plen === null) return [[`netsh: '${mask}' is not a valid subnet mask.`, "t-err"]];
            T.store.data.ipAddress = ip;
            T.store.data.prefixLength = String(plen);
            if (gw) T.store.data.gateway = gw;
            T.store.save();
            return [[`✔ IP address ${ip}/${plen} assigned to adapter '${iface}'. (simulated)`, "t-ok"]];
          }
          if (toks[2] === "show" && toks[3] === "config") {
            const d = T.store.data;
            const ip = d.ipAddress || "192.168.10.10";
            const plen = parseInt(d.prefixLength || "24", 10) || 24;
            const m = (0xFFFFFFFF << (32 - plen)) >>> 0;
            const mask = [(m >>> 24) & 255, (m >>> 16) & 255, (m >>> 8) & 255, m & 255].join(".");
            return ["Configuration for interface \"Ethernet\"",
              "    DHCP enabled:                         No",
              "    IP Address:                           " + ip,
              "    Subnet Prefix:                        " + ip + "/" + plen + " (mask " + mask + ")",
              "    Default Gateway:                      " + (d.gateway || "192.168.10.1"),
              "    DNS servers configured through DHCP:  No",
              "    Preferred DNS server:                 " + (d.dnsServer || "127.0.0.1")];
          }
          return [["Usage: netsh interface ipv4 <set address|show config>", "t-err"]];
        }
        if (toks[0] === "advfirewall" && toks[1] === "show" && toks[2] === "allprofiles") {
          const rules = T.fwRules().length;
          return ["Domain Profile Settings:", "    State                                 ON",
            "Private Profile Settings:", "    State                                 ON",
            "Public Profile Settings:", "    State                                 ON",
            "", `(${rules} firewall rule(s) configured — see Get-NetFirewallRule)`];
        }
        return [["Usage: netsh <interface ipv4 set address|interface ip show config|advfirewall show allprofiles>", "t-err"]];
      },
      "dcdiag"() {
        const ad = T.store.data.ad;
        const dc = ad.dc.split(".")[0];
        return ["Directory Server Diagnosis", "",
          "Performing initial setup:",
          "   * Identified AD Forest.",
          "      Done gathering initial info.", "",
          "Doing initial required tests:",
          `   Testing server: ${ad.site}\\${dc}`,
          "      Starting test: Connectivity",
          `         ......................... ${dc} passed test Connectivity`,
          "      Starting test: Advertising",
          `         ......................... ${dc} passed test Advertising`, "",
          "All tests passed. (simulated)"];
      },
    };
    return this._handlers;
  }

  /* ---------- helpers ---------- */
  /* lazy-init dyal stores jdad (v1.8.0): les stores 9dam ma fihomch had fields,
     donc || fallback bach l'upgrade ma ykessrch l'etat l9dim */
  dnsZones() {
    const d = this.store.data;
    if (!d.dnsZones) d.dnsZones = [{ name: "lab.local", type: "Primary" }];
    return d.dnsZones;
  }
  dnsRecords() {
    const d = this.store.data;
    if (!d.dnsRecords) d.dnsRecords = [{ zone: "lab.local", name: "dc01", type: "A", data: "192.168.10.10" }, { zone: "lab.local", name: "srv1", type: "A", data: "192.168.1.10" }];
    return d.dnsRecords;
  }
  gpos() {
    const d = this.store.data;
    if (!d.gpos) d.gpos = [];
    return d.gpos;
  }
  fwRules() {
    const d = this.store.data;
    if (!d.firewallRules) d.firewallRules = SAMPLE.firewall.map(f => ({ name: f[0], direction: f[1], action: f[2], enabled: f[3] }));
    return d.firewallRules;
  }
  disks() {
    const d = this.store.data;
    if (!d.disks) d.disks = SAMPLE.disks.map(x => ({ number: x[0], name: x[1], size: x[2], style: x[3], status: x[4] }));
    return d.disks;
  }
  volumes() {
    const d = this.store.data;
    if (!d.volumes) d.volumes = SAMPLE.volumes.map(v => ({ letter: v[0], label: v[1], fs: v[2], size: v[3], remaining: v[4] }));
    return d.volumes;
  }
  shares() {
    const d = this.store.data;
    if (!d.shares) d.shares = SAMPLE.shares.map(s => ({ name: s[0], path: s[1], description: s[2] || "" }));
    return d.shares;
  }
  routes() {
    const d = this.store.data;
    if (!d.routes) d.routes = [
      { dest: "192.168.10.0/24", nextHop: "0.0.0.0", iface: "Ethernet" },
      { dest: "0.0.0.0/0", nextHop: d.gateway || "192.168.10.1", iface: "Ethernet" },
      /* route statique dyal lab (M201): bach l'exemple dyal Remove-NetRoute ykhdem */
      { dest: "192.168.2.0/24", nextHop: "192.168.10.1", iface: "Ethernet" },
    ];
    return d.routes;
  }
  /* l9a object AD (user/computer/group) b smiya wla DN */
  findADObject(id) {
    const ad = this.store.data.ad;
    let name = String(id || "");
    const cn = /CN=([^,;]+)/i.exec(name);
    if (cn) name = cn[1];
    name = name.replace(/['"]/g, "").trim();
    const low = name.toLowerCase();
    const u = ad.users.find(x => x.name.toLowerCase() === low);
    if (u) return { obj: u, kind: "user" };
    const c = ad.computers.find(x => x.name.toLowerCase() === low);
    if (c) return { obj: c, kind: "computer" };
    const g = ad.groups.find(x => x.name.toLowerCase() === low);
    if (g) return { obj: g, kind: "group" };
    return null;
  }
  /* OU name men DN: "OU=IT,DC=lab,DC=local" -> "IT" */
  ouFromDN(dn) {
    const m = /OU=([^,;]+)/i.exec(String(dn || ""));
    return m ? m[1] : null;
  }
  findScope(id) {
    if (id === undefined || id === null) return null;
    const s = String(id);
    if (s.includes(".")) {
      // network address (192.168.10.0): match scope li start dyalha f nafs network,
      // sinon 3rd octet (10) b7al l'id l9dim
      const net = s.split(".").slice(0, 3).join(".");
      const byNet = this.store.data.scopes.find(sc => String(sc.start).split(".").slice(0, 3).join(".") === net);
      if (byNet) return byNet;
      const third = parseInt(s.split(".")[2], 10);
      if (!isNaN(third)) return this.store.data.scopes.find(sc => sc.id === third) || null;
      return null;
    }
    const n = parseInt(s, 10);
    return this.store.data.scopes.find(sc => sc.id === n) || null;
  }

  setServiceState(p, state) {
    const name = p.named.name || p.positional[0];
    if (!name) return [["Usage: <cmd> -Name <service-name>", "t-err"]];
    const svc = this.sessionServices.find(r => r[0].toLowerCase() === String(name).toLowerCase());
    if (!svc) return [[`Service '${name}' was not found.`, "t-err"]];
    if (svc[0] === "EventLog" && state === "Stopped")
      return [["Stop-Service: 'EventLog' is a protected system service and cannot be stopped in the simulator.", "t-err"]];
    svc[2] = state;
    return [[`✔ Service '${svc[0]}' is now ${state}. (simulated)`, "t-ok"]];
  }

  makeLeases(scope) {
    const base = scope.start.split(".").slice(0, 3).join(".");
    const startOctet = parseInt(scope.start.split(".")[3], 10);
    const hosts = ["CLIENT-PC", "DESKTOP-02", "LAPTOP-07"];
    return hosts.map((h, i) => ({
      ip: `${base}.${startOctet + i}`,
      mac: `00-15-5D-01-02-0${4 + i}`,
      host: h,
      state: "Active",
    }));
  }
}
