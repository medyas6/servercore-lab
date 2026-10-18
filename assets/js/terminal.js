/* ============================================================
   MEDC ServerCore Lab Training — PowerShell simulator
   ghir client-side. les commands li kaybdlo state tay updataw
   store lmchtarka (m7fouda f localStorage); leases ghir dyal session.
   ============================================================ */

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
    // bach ykhdem "Test in Simulator"
    if (window.__pendingCommand) {
      const cmd = window.__pendingCommand;
      window.__pendingCommand = null;
      setTimeout(() => this.execute(cmd), 60);
    }
  }

  build() {
    this.root.innerHTML = `
      <div class="term">
        <div class="term-output" id="term-output" aria-label="Terminal output"></div>
        <div class="term-suggest" id="term-suggest"></div>
        <div class="term-input-row">
          <span class="t-prompt">PS C:\\Users\\Administrator&gt;</span>
          <input id="term-input" autocomplete="off" spellcheck="false"
                 aria-label="PowerShell command input" placeholder="Type a command…">
        </div>
      </div>
      <div class="btn-row">
        <button class="btn" id="term-copy">Copy last output</button>
        <button class="btn" id="term-clear">Clear screen</button>
      </div>
      <div class="term-hint">Enter to run &middot; &uarr;&darr; history &middot; Tab to complete</div>`;
    this.out = this.root.querySelector("#term-output");
    this.input = this.root.querySelector("#term-input");
    this.suggest = this.root.querySelector("#term-suggest");

    this.input.addEventListener("keydown", (e) => this.onKey(e));
    this.root.querySelector("#term-copy").addEventListener("click", () => {
      copyText(this.lastOutput || "(no output yet)");
    });
    this.root.querySelector("#term-clear").addEventListener("click", () => this.clear());
    this.input.focus();
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
    this.out.innerHTML += html + "\n";
    this.out.scrollTop = this.out.scrollHeight;
  }

  printBanner() {
    this.print([
      ["MEDC ServerCore Lab Training — PowerShell Simulator v1.0.0", "t-dim"],
      ["Created by medyas. © 2026 medyas. All rights reserved.", "t-dim"],
      ["Type 'help' for a quick start, 'Get-Command' to list supported commands.", "t-dim"],
      ["⚠ Commands are simulated and do not execute on a real operating system.", "t-err"],
      ["", ""],
    ]);
    this.lastOutput = "";
  }

  clear() {
    this.out.innerHTML = "";
    this.printBanner();
  }

  /* ---------- input handling ---------- */
  allCommandNames() {
    return COMMANDS.map(c => c.name).concat(["help", "cls", "clear", "history"]);
  }

  onKey(e) {
    if (e.key === "Enter") {
      const line = this.input.value;
      this.input.value = "";
      this.hideSuggest();
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
      this.hideSuggest();
    }
  }

  complete() {
    const val = this.input.value;
    const m = val.match(/([^\s]*)$/);
    const frag = (m ? m[1] : "").toLowerCase();
    if (!frag) return;
    const matches = this.allCommandNames().filter(n => n.toLowerCase().startsWith(frag));
    if (matches.length === 1) {
      this.input.value = val.slice(0, val.length - frag.length) + matches[0] + " ";
      this.hideSuggest();
    } else if (matches.length > 1) {
      this.suggest.innerHTML = "";
      matches.slice(0, 12).forEach(name => {
        const b = document.createElement("button");
        b.className = "suggest-pill";
        b.textContent = name;
        b.addEventListener("click", () => {
          this.input.value = val.slice(0, val.length - frag.length) + name + " ";
          this.hideSuggest();
          this.input.focus();
        });
        this.suggest.appendChild(b);
      });
      this.suggest.classList.add("show");
    }
  }

  hideSuggest() { this.suggest.classList.remove("show"); }

  pushHistory(line) {
    if (!line.trim()) return;
    this.history.push(line.trim());
    if (this.history.length > 100) this.history = this.history.slice(-100);
    this.histIdx = this.history.length;
    try { localStorage.setItem(this.histKey, JSON.stringify(this.history)); } catch (e) {}
  }

  /* ---------- execution ---------- */
  execute(line) {
    if (!line.trim()) return;
    this.print([[`PS C:\\Users\\Administrator> ${line.trim()}`, "t-prompt"]]);
    this.pushHistory(line);
    const parsed = parseLine(line);
    if (!parsed) return;
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
  }

  unknownError(name) {
    return [[`The term '${name}' is not recognized as the name of a cmdlet, function, or supported simulated command. Type 'Get-Command' for a list, or open the Command Reference page.`, "t-err"]];
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
        const sc = T.findScope(p.named.scopeid);
        if (!sc) return [[`Set-DhcpServerv4OptionValue: scope '${p.named.scopeid}' not found.`, "t-err"]];
        const oid = p.named.optionid || "3", val = p.named.value;
        if (!val) return [["Usage: Set-DhcpServerv4OptionValue -ScopeId <id> -OptionId <id> -Value <value>", "t-err"]];
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
        if (n.includes("dc01")) return [`Name                           Type   IPAddress`, `----                           ----   ---------`, `dc01.lab.local                 A      192.168.10.10`];
        return [[`Resolve-DnsName: '${p.named.name || p.positional[0]}' could not be resolved (simulated).`, "t-err"]];
      },
      "restart-computer"() {
        return ["The server will restart now. (simulated — your lab state is preserved)"];
      },

      /* ----- logs & storage ----- */
      "get-eventlog"(p) {
        const log = (p.named.logname || "System").toLowerCase();
        if (log !== "system" && log !== "application")
          return [[`Get-EventLog: log '${p.named.logname}' not found. Try 'System'.`, "t-err"]];
        const n = Math.min(parseInt(p.named.newest || "5", 10) || 5, SAMPLE.events.length);
        const out = [pad("Time", 20) + pad("Id", 7) + pad("Log", 9) + "Message", pad("", 20, "-") + " " + pad("", 5, "-") + " " + pad("", 7, "-") + " -------"];
        SAMPLE.events.slice(0, n).forEach(e => out.push(pad(e[0], 20) + pad(e[1], 7) + pad("System", 9) + e[3]));
        return out;
      },
      "get-winevent"(p) {
        return T.handlers["get-eventlog"].call(T, p);
      },
      "get-disk"() {
        const out = [pad("Number", 8) + pad("FriendlyName", 20) + pad("Size", 9) + pad("PartitionStyle", 16) + "OperationalStatus",
                     pad("", 8, "-") + " " + pad("", 18, "-") + " " + pad("", 7, "-") + " " + pad("", 15, "-") + " -----------------"];
        SAMPLE.disks.forEach(d => out.push(pad(d[0], 8) + pad(d[1], 20) + pad(d[2], 9) + pad(d[3], 16) + d[4]));
        return out;
      },
      "get-volume"() {
        const out = [pad("DriveLetter", 12) + pad("Label", 10) + pad("FileSystem", 12) + pad("Size", 9) + "SizeRemaining",
                     pad("", 12, "-") + " " + pad("", 8, "-") + " " + pad("", 11, "-") + " " + pad("", 7, "-") + " -------------"];
        SAMPLE.volumes.forEach(v => out.push(pad(v[0], 12) + pad(v[1], 10) + pad(v[2], 12) + pad(v[3], 9) + v[4]));
        return out;
      },
      "get-netfirewallrule"() {
        const out = [pad("DisplayName", 28) + pad("Direction", 11) + pad("Action", 8) + "Enabled",
                     pad("", 28, "-") + " " + pad("", 10, "-") + " " + pad("", 7, "-") + " -------"];
        SAMPLE.firewall.forEach(f => out.push(pad(f[0], 28) + pad(f[1], 11) + pad(f[2], 8) + f[3]));
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
        const dn = String(p.named.domainname || p.positional[0] || "lab.local").replace(/['"]/g, "");
        T.store.data.domain = dn;
        T.store.save();
        return [[`✔ Forest ${dn} created; this server is now a domain controller. (simulated)`, "t-ok"]];
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
        const out = ["Name         Enabled  DistinguishedName", "----         -------  -----------------"];
        ad.users.forEach(u => out.push(pad(u.name, 13) + pad(u.enabled ? "True" : "False", 9) + adDN(u, ad)));
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
        const ad = T.store.data.ad;
        const i = id ? ad.users.findIndex(x => x.name.toLowerCase() === String(id).toLowerCase()) : -1;
        if (i < 0) return [["Usage: Remove-ADUser -Identity <name>", "t-err"]];
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
        const ad = T.store.data.ad;
        const i = id ? ad.computers.findIndex(x => x.name.toLowerCase() === String(id).toLowerCase()) : -1;
        if (i < 0) return [["Usage: Remove-ADComputer -Identity <name>", "t-err"]];
        const gone = ad.computers.splice(i, 1)[0];
        T.store.save();
        return [[`✔ Computer '${gone.name}' removed.`, "t-ok"]];
      },
      "get-adorganizationalunit"(p) {
        const ad = T.store.data.ad;
        const id = p.named.identity || p.positional[0];
        const dnOf = c => (c.type === "ou" ? "OU=" : "CN=") + c.name + ",DC=lab,DC=local";
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
        const ad = T.store.data.ad;
        const i = id ? ad.containers.findIndex(x => x.name.toLowerCase() === String(id).toLowerCase() && x.type === "ou") : -1;
        if (i < 0) return [["Usage: Remove-ADOrganizationalUnit -Identity <OU-name>", "t-err"]];
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
        ad.groups.push({ name: String(name), scope, container: "Users", members: [] });
        T.store.save();
        return [[`✔ Group '${name}' (${scope}) created in Users.`, "t-ok"]];
      },
      "remove-adgroup"(p) {
        const id = p.named.identity || p.positional[0];
        const ad = T.store.data.ad;
        const i = id ? ad.groups.findIndex(x => x.name.toLowerCase() === String(id).toLowerCase()) : -1;
        if (i < 0) return [["Usage: Remove-ADGroup -Identity <name>", "t-err"]];
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
        const id = p.named.identity;
        const ad = T.store.data.ad;
        const g = id && ad.groups.find(x => x.name.toLowerCase() === String(id).toLowerCase());
        if (!g) return [["Usage: Add-ADGroupMember -Identity <group> -Members <user,...>", "t-err"]];
        const members = String(p.named.members || p.positional[0] || "").split(",").map(s => s.trim()).filter(Boolean);
        if (!members.length) return [["Add-ADGroupMember: no member names supplied.", "t-err"]];
        const added = [];
        members.forEach(mn => {
          const u = ad.users.find(x => x.name.toLowerCase() === mn.toLowerCase());
          if (!u) return;
          if (!g.members.some(x => x.toLowerCase() === u.name.toLowerCase())) { g.members.push(u.name); added.push(u.name); }
          if (!u.groups.some(x => x.toLowerCase() === g.name.toLowerCase())) u.groups.push(g.name);
        });
        T.store.save();
        return [[`✔ Added ${added.length ? added.join(", ") : "(none — check the user names)"} to '${g.name}'.`, "t-ok"]];
      },
      "remove-adgroupmember"(p) {
        const id = p.named.identity;
        const ad = T.store.data.ad;
        const g = id && ad.groups.find(x => x.name.toLowerCase() === String(id).toLowerCase());
        if (!g) return [["Usage: Remove-ADGroupMember -Identity <group> -Members <user,...>", "t-err"]];
        const members = String(p.named.members || p.positional[0] || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
        g.members = g.members.filter(m => !members.includes(m.toLowerCase()));
        ad.users.forEach(u => { if (members.includes(u.name.toLowerCase())) u.groups = u.groups.filter(x => x.toLowerCase() !== g.name.toLowerCase()); });
        T.store.save();
        return [[`✔ Members removed from '${g.name}'.`, "t-ok"]];
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
  findScope(id) {
    if (id === undefined || id === null) return null;
    const n = parseInt(id, 10);
    return this.store.data.scopes.find(s => s.id === n) || null;
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
