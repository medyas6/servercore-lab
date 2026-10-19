/* ============================================================
   Defi Commandes — l3aks dyal QCM: lmouhim bl fr, o nta
   katkteb cmdlet f terminal. Points + timer + streak.
   ============================================================ */

/* m: module (nafs QUIZ_MODULES), t: lmouhim bl fr, answers: li ma9boul */
const DEFI_BANK = [
  /* ---------- Active Directory ---------- */
  { m: "ad", t: "Crée un utilisateur AD nommé « sara ».",
    hint: "New-ADUser -Name ...",
    answers: ["new-aduser -name sara", 'new-aduser -name "sara"'] },
  { m: "ad", t: "Crée l'utilisateur « mehdi » dans l'OU « IT » du domaine lab.local.",
    hint: "New-ADUser -Name ... -Path \"OU=...\"",
    answers: ['new-aduser -name mehdi -path "ou=it,dc=lab,dc=local"', "new-aduser -name mehdi -path ou=it,dc=lab,dc=local"] },
  { m: "ad", t: "Crée un groupe global de sécurité nommé « Compta ».",
    hint: "New-ADGroup -Name ... -GroupScope ... -GroupCategory ...",
    answers: ["new-adgroup -name compta -groupscope global -groupcategory security", 'new-adgroup -name "compta" -groupscope global -groupcategory security'] },
  { m: "ad", t: "Crée une unité d'organisation nommée « Ventes ».",
    hint: "New-OrganizationalUnit ...",
    answers: ["new-organizationalunit -name ventes", 'new-organizationalunit -name "ventes"'] },
  { m: "ad", t: "Active le compte de l'utilisateur « sara ».",
    hint: "Enable-ADAccount ...",
    answers: ["enable-adaccount -identity sara", 'enable-adaccount -identity "sara"'] },
  { m: "ad", t: "Ajoute l'utilisateur « sara » au groupe « Compta ».",
    hint: "Add-ADGroupMember ...",
    answers: ["add-adgroupmember -identity compta -members sara"] },
  { m: "ad", t: "Affiche tous les utilisateurs de l'OU « IT » (lab.local).",
    hint: "Get-ADUser -Filter ... -SearchBase ...",
    answers: ['get-aduser -filter * -searchbase "ou=it,dc=lab,dc=local"'] },
  { m: "ad", t: "Vérifie la santé des contrôleurs de domaine.",
    hint: "dcdiag",
    answers: ["dcdiag"] },

  /* ---------- DHCP ---------- */
  { m: "dhcp", t: "Crée une étendue DHCP de 192.168.1.10 à 192.168.1.100 (masque /24).",
    hint: "Add-DhcpServerv4Scope -StartRange ... -EndRange ... -SubnetMask ...",
    answers: ["add-dhcpserverv4scope -startrange 192.168.1.10 -endrange 192.168.1.100 -subnetmask 255.255.255.0"] },
  { m: "dhcp", t: "Exclus la plage 192.168.1.10 à 192.168.1.20 de la distribution DHCP.",
    hint: "Add-DhcpServerv4ExclusionRange ...",
    answers: ["add-dhcpserverv4exclusionrange -startrange 192.168.1.10 -endrange 192.168.1.20"] },
  { m: "dhcp", t: "Réserve l'IP 192.168.1.50 pour la MAC AA-BB-CC-DD-EE-FF.",
    hint: "Add-DhcpServerv4Reservation -IPAddress ... -ClientId ...",
    answers: ['add-dhcpserverv4reservation -ipaddress 192.168.1.50 -clientid "aa-bb-cc-dd-ee-ff"', "add-dhcpserverv4reservation -ipaddress 192.168.1.50 -clientid aa-bb-cc-dd-ee-ff"] },
  { m: "dhcp", t: "Affiche les étendues DHCP configurées sur le serveur.",
    hint: "Get-DhcpServerv4Scope",
    answers: ["get-dhcpserverv4scope"] },
  { m: "dhcp", t: "Définit la passerelle 192.168.1.1 (option 003) pour le scope 192.168.1.0.",
    hint: "Set-DhcpServerv4OptionValue -ScopeId ... -Router ...",
    answers: ["set-dhcpserverv4optionvalue -scopeid 192.168.1.0 -router 192.168.1.1"] },
  { m: "dhcp", t: "Redémarre le service DHCP.",
    hint: "Restart-Service ...",
    answers: ["restart-service dhcpserver"] },

  /* ---------- DNS ---------- */
  { m: "dns", t: "Crée un enregistrement A « srv1 » → 192.168.1.10 dans la zone lab.local.",
    hint: "Add-DnsServerResourceRecordA -Name ... -ZoneName ... -IPv4Address ...",
    answers: ["add-dnsserverresourcerecorda -name srv1 -zonename lab.local -ipv4address 192.168.1.10"] },
  { m: "dns", t: "Crée un alias (CNAME) « intranet » vers srv1.lab.local.",
    hint: "Add-DnsServerResourceRecordCName ... -HostNameAlias ...",
    answers: ["add-dnsserverresourcerecordcname -name intranet -zonename lab.local -hostnamealias srv1.lab.local"] },
  { m: "dns", t: "Crée une zone DNS primaire nommée « lab.local ».",
    hint: "Add-DnsServerPrimaryZone -Name ... -ZoneFile ...",
    answers: ["add-dnsserverprimaryzone -name lab.local -zonefile lab.local.dns"] },
  { m: "dns", t: "Affiche les zones DNS hébergées par le serveur.",
    hint: "Get-DnsServerZone",
    answers: ["get-dnsserverzone"] },
  { m: "dns", t: "Teste la résolution du nom « srv1.lab.local ».",
    hint: "nslookup ... / Resolve-DnsName ...",
    answers: ["nslookup srv1.lab.local", "resolve-dnsname srv1.lab.local"] },
  { m: "dns", t: "Vide le cache du serveur DNS.",
    hint: "Clear-DnsServerCache",
    answers: ["clear-dnsservercache"] },

  /* ---------- GPO ---------- */
  { m: "gpo", t: "Crée une GPO nommée « Securite-PC ».",
    hint: "New-GPO -Name ...",
    answers: ["new-gpo -name securite-pc", 'new-gpo -name "securite-pc"'] },
  { m: "gpo", t: "Lie la GPO « Securite-PC » à l'OU « IT » (lab.local).",
    hint: "New-GPLink -Name ... -Target ...",
    answers: ['new-gplink -name securite-pc -target "ou=it,dc=lab,dc=local"'] },
  { m: "gpo", t: "Applique immédiatement les stratégies de groupe.",
    hint: "gpupdate ...",
    answers: ["gpupdate /force"] },
  { m: "gpo", t: "Affiche les GPO appliquées à cet ordinateur.",
    hint: "gpresult ...",
    answers: ["gpresult /r"] },
  { m: "gpo", t: "Sauvegarde toutes les GPO dans C:\\Backup.",
    hint: "Backup-GPO -All -Path ...",
    answers: ["backup-gpo -all -path c:\\backup", 'backup-gpo -all -path "c:\\backup"'] },

  /* ---------- Fichiers ---------- */
  { m: "fichiers", t: "Crée un dossier « Partage » à la racine de C:.",
    hint: "New-Item -Path ... -ItemType Directory",
    answers: ["new-item -path c:\\partage -itemtype directory"] },
  { m: "fichiers", t: "Partage le dossier C:\\Partage sous le nom « Docs ».",
    hint: "New-SmbShare -Name ... -Path ...",
    answers: ["new-smbshare -name docs -path c:\\partage"] },
  { m: "fichiers", t: "Affiche les partages SMB du serveur.",
    hint: "Get-SmbShare",
    answers: ["get-smbshare"] },
  { m: "fichiers", t: "Donne un accès total au groupe « Compta » sur le partage « Docs ».",
    hint: "Grant-SmbShareAccess -Name ... -AccountName ... -AccessRight Full",
    answers: ["grant-smbshareaccess -name docs -accountname compta -accessright full"] },
  { m: "fichiers", t: "Crée un espace de noms DFS « \\\\lab.local\\Public » vers \\\\srv1\\Public.",
    hint: "New-DfsnRoot -Path ... -TargetPath ...",
    answers: ["new-dfsnroot -path \\\\lab.local\\public -targetpath \\\\srv1\\public"] },

  /* ---------- Core & réseau ---------- */
  { m: "core", t: "Renomme cet ordinateur en « SRV1 ».",
    hint: "Rename-Computer ...",
    answers: ["rename-computer -newname srv1", 'rename-computer -newname "srv1"'] },
  { m: "core", t: "Configure l'IP 192.168.1.10/24 avec la passerelle 192.168.1.1.",
    hint: "New-NetIPAddress -IPAddress ... -PrefixLength ... -DefaultGateway ...",
    answers: ["new-netipaddress -ipaddress 192.168.1.10 -prefixlength 24 -defaultgateway 192.168.1.1"] },
  { m: "core", t: "Définit 192.168.1.1 comme serveur DNS de la carte réseau.",
    hint: "Set-DnsClientServerAddress -ServerAddresses ...",
    answers: ["set-dnsclientserveraddress -serveraddresses 192.168.1.1"] },
  { m: "core", t: "Teste la connectivité vers 192.168.1.1.",
    hint: "Test-Connection ... / ping ...",
    answers: ["test-connection 192.168.1.1", "ping 192.168.1.1"] },
  { m: "core", t: "Affiche la configuration IP complète de la machine.",
    hint: "ipconfig ...",
    answers: ["ipconfig /all"] },
  { m: "install", t: "Installe le rôle DHCP sur le serveur.",
    hint: "Install-WindowsFeature ...",
    answers: ["install-windowsfeature dhcp", "install-windowsfeature -name dhcp"] },

  /* ---------- EFM officiels (Rabat 2022/2023 + Casa Dec 2022) ---------- */
  { m: "ad", efm: true, t: "[EFM] Promouvois ce serveur en contrôleur de domaine d'une nouvelle forêt « ofppt.ma » (avec DNS).",
    hint: "Install-ADDSForest -DomainName ... -InstallDNS",
    answers: ["install-addsforest -domainname ofppt.ma -installdns"] },
  { m: "ad-objets", efm: true, t: "[EFM] Crée l'utilisateur « Mamadou » dans l'OU « Informatique » du domaine formation.com.",
    hint: "New-ADUser -Name ... -Path \"OU=...\"",
    answers: ['new-aduser -name mamadou -path "ou=informatique,dc=formation,dc=com"', 'dsadd user "cn=mamadou,ou=informatique,dc=formation,dc=com"'] },
  { m: "ad-objets", efm: true, t: "[EFM] Crée un groupe de distribution universel « groupe1 » dans l'OU « tri » (sous l'OU « organe », domaine formation.com).",
    hint: "New-ADGroup ... -GroupCategory Distribution -GroupScope Universal -Path ...",
    answers: ['new-adgroup groupe1 -groupcategory distribution -groupscope universal -path "ou=tri,ou=organe,dc=formation,dc=com"'] },
  { m: "ad-objets", efm: true, t: "[EFM] Crée le compte d'ordinateur « pc1 » dans le domaine formation.com.",
    hint: "dsadd computer ... / New-ADComputer ...",
    answers: ['dsadd computer "cn=pc1,dc=formation,dc=com"', 'new-adcomputer -name pc1 -path "dc=formation,dc=com"'] },
  { m: "ad-objets", efm: true, t: "[EFM] Redirige le conteneur par défaut des utilisateurs vers « OU=tri,OU=organe,DC=formation,DC=com ».",
    hint: "redirusr ... / rediruser ...",
    answers: ['redirusr "ou=tri,ou=organe,dc=formation,dc=com"', 'rediruser "ou=tri,ou=organe,dc=formation,dc=com"'] },
  { m: "dhcp", efm: true, t: "[EFM] Installe le service DHCP avec les outils d'administration.",
    hint: "Install-WindowsFeature DHCP ...",
    answers: ["install-windowsfeature dhcp -includemanagementtools"] },
  { m: "dhcp", efm: true, t: "[EFM] Crée l'étendue « NTIC » : 192.168.10.1 → 192.168.10.126, masque 255.255.255.128.",
    hint: "Add-DhcpServerv4Scope -Name ... -StartRange ... -EndRange ... -SubnetMask ...",
    answers: ['add-dhcpserverv4scope -name "ntic" -startrange 192.168.10.1 -endrange 192.168.10.126 -subnetmask 255.255.255.128', "add-dhcpserverv4scope -name ntic -startrange 192.168.10.1 -endrange 192.168.10.126 -subnetmask 255.255.255.128"] },
  { m: "dhcp", efm: true, t: "[EFM] Exclus les adresses 192.168.10.5 à 192.168.10.15 (scope 192.168.10.0).",
    hint: "Add-DhcpServerv4ExclusionRange -ScopeId ... -StartRange ... -EndRange ...",
    answers: ["add-dhcpserverv4exclusionrange -scopeid 192.168.10.0 -startrange 192.168.10.5 -endrange 192.168.10.15"] },
  { m: "dhcp", efm: true, t: "[EFM] Réserve l'IP 192.168.10.20 pour la MAC 00-0D-EA-5B-DF-FF (scope 192.168.10.0).",
    hint: "Add-DhcpServerv4Reservation -ScopeId ... -ClientId ... -IPAddress ...",
    answers: ["add-dhcpserverv4reservation -scopeid 192.168.10.0 -clientid 00-0d-ea-5b-df-ff -ipaddress 192.168.10.20"] },
  { m: "dhcp", efm: true, t: "[EFM] Configure l'option 6 (DNS = 192.168.10.1) sur le serveur DHCP « serv2 ».",
    hint: "Set-DhcpServerv4OptionValue -ComputerName ... -OptionId 6 -Value ...",
    answers: ["set-dhcpserverv4optionvalue -computername serv2 -optionid 6 -value 192.168.10.1"] },
  { m: "dhcp", efm: true, t: "[EFM] Configure l'option 6 (DNS = 192.168.10.126) sur l'étendue 192.168.10.0.",
    hint: "Set-DhcpServerv4OptionValue -ScopeId ... -OptionId 6 -Value ...",
    answers: ["set-dhcpserverv4optionvalue -optionid 6 -value 192.168.10.126 -scopeid 192.168.10.0", "set-dhcpserverv4optionvalue -scopeid 192.168.10.0 -optionid 6 -value 192.168.10.126"] },
  { m: "dns", efm: true, t: "[EFM] Crée un enregistrement AAAA pour « pc1 » (2001::1) dans la zone « zone1 ».",
    hint: "Add-DnsServerResourceRecordAAAA -ZoneName ... -Name ... -IPv6Address ...",
    answers: ["add-dnsserverresourcerecordaaaa -zonename zone1 -name pc1 -ipv6address 2001::1"] },
  { m: "dns", efm: true, t: "[EFM] Crée la zone secondaire « zone1 » (maître 192.168.1.10, fichier zone1.dns).",
    hint: "Add-DnsServerSecondaryZone -Name ... -MasterServers ... -ZoneFile ...",
    answers: ["add-dnsserversecondaryzone -name zone1 -masterservers 192.168.1.10 -zonefile zone1.dns"] },
  { m: "core", efm: true, t: "[EFM] Attribue l'IP statique 10.10.10.10/24 en ligne de commande (netsh).",
    hint: "netsh interface ipv4 set address ...",
    answers: ['netsh interface ipv4 set address "nom-interface" static 10.10.10.10 255.255.255.0'] },
  { m: "ad", efm: true, t: "[EFM Casa] Crée l'unité d'organisation « responsable ».",
    hint: "New-OrganizationalUnit ... / dsadd ou ...",
    answers: ["new-organizationalunit -name responsable", 'new-organizationalunit -name "responsable"', "dsadd ou ou=responsable,dc=detic,dc=ma"] },
  { m: "ad", efm: true, t: "[EFM Casa] Crée l'OU « TS » dans l'OU « responsable » (domaine DETIC.ma).",
    hint: "New-OrganizationalUnit -Name ... -Path ...",
    answers: ['new-organizationalunit -name ts -path "ou=responsable,dc=detic,dc=ma"'] },
  { m: "ad", efm: true, t: "[EFM Casa] Crée l'utilisateur « WARDI » dans l'OU « responsable » (domaine DETIC.ma).",
    hint: "New-ADUser -Name ... -Path ...",
    answers: ['new-aduser -name wardi -path "ou=responsable,dc=detic,dc=ma"'] },
  { m: "ad", efm: true, t: "[EFM Casa] Affiche les utilisateurs dont l'attribut « company » commence par « ma ».",
    hint: "Get-ADUser -Filter ...",
    answers: ['get-aduser -filter "company -like \'ma*\'"', "get-aduser -filter 'company -like \"ma*\"'"] },
];

/* ============================================================
   Moteur du défi
   ============================================================ */
const DefiApp = {
  KEY: "servercore-defi-v1",
  TIME_PER_Q: 60,
  mountEl: null, timer: null, timeLeft: 0,
  tasks: [], idx: 0, score: 0, streak: 0, results: [], hintUsed: false,

  /* normalisi ljawab bach lmo9arana tkun 3adla */
  norm(s) {
    return String(s || "").toLowerCase().trim()
      .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
      .replace(/\s+/g, " ").replace(/;+\s*$/g, "");
  },
  check(input, task) {
    const n = this.norm(input);
    return task.answers.some(a => this.norm(a) === n);
  },

  load() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '{"board":[],"best":0}'); }
    catch (e) { return { board: [], best: 0 }; }
  },
  save(data) { try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch (e) {} },
  stopTimer() { if (this.timer) { clearInterval(this.timer); this.timer = null; } },
  stopAll() { this.stopTimer(); },
  shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  modName(id) { const m = QUIZ_MODULES.find(x => x.id === id); return m ? m.name : id; },

  mount(el) {
    this.stopTimer();
    this.mountEl = el;
    const data = this.load();
    const mods = QUIZ_MODULES.filter(m => DEFI_BANK.some(t => t.m === m.id));
    el.innerHTML = `
    <div class="card"><h2>⚡ Défi Commandes</h2>
      <div style="font-size:13px;color:var(--muted)">Je te donne une mission en français, tu tapes la commande PowerShell. +10 points par bonne réponse, bonus de rapidité jusqu'à +5. Série de 3 bonnes réponses d'affilée = +2 bonus.</div>
      <div class="quiz-mod-grid">
        ${mods.map(m => {
          const n = DEFI_BANK.filter(t => t.m === m.id).length;
          return `<label class="quiz-mod"><input type="checkbox" data-mod="${m.id}" checked> ${esc(m.name)} <span style="color:var(--muted)">(${n})</span></label>`;
        }).join("")}
      </div>
      <div class="btn-row" style="align-items:center">
        <label style="font-size:13px">Missions :
          <select id="defi-count" class="btn">
            <option value="10">10</option><option value="20" selected>20</option>
            <option value="30">30</option><option value="0">Tout (${DEFI_BANK.length})</option>
          </select>
        </label>
        <button class="btn primary" id="defi-start">Lancer le défi</button>
      </div>
      <label class="quiz-efm-toggle"><input type="checkbox" id="defi-efm-only"> Missions EFM uniquement <span style="color:var(--amber)">(${DEFI_BANK.filter(t => t.efm).length} missions officielles)</span></label>
      ${data.best ? `<div style="font-size:13px;color:var(--muted);margin-top:8px">Ton record : <b style="color:var(--accent)">${data.best} pts</b></div>` : ""}
    </div>
    <div class="card"><h2>Meilleurs scores (cet appareil)</h2>
      ${data.board.length ? `<ol class="quiz-board">${data.board.slice(0, 5).map(b => `<li><b>${b.score} pts</b> <span style="color:var(--muted)">${b.n}/${b.total} — ${esc(b.date)}</span></li>`).join("")}</ol>` : `<div class="muted">Aucun score pour l'instant. À toi de jouer !</div>`}
    </div>`;
    el.querySelector("#defi-start").onclick = () => this.start();
  },

  start() {
    const mods = [...this.mountEl.querySelectorAll("[data-mod]:checked")].map(c => c.dataset.mod);
    let n = parseInt(this.mountEl.querySelector("#defi-count").value, 10);
    const efmOnly = this.mountEl.querySelector("#defi-efm-only").checked;
    let pool = this.shuffle(DEFI_BANK.filter(t => mods.includes(t.m) && (!efmOnly || t.efm)));
    if (!pool.length) { toast("Choisis au moins un module"); return; }
    if (n > 0) pool = pool.slice(0, n);
    this.tasks = pool; this.idx = 0; this.score = 0; this.streak = 0; this.results = [];
    this.renderTask();
  },

  renderTask() {
    const t = this.tasks[this.idx], el = this.mountEl;
    this.hintUsed = false;
    el.innerHTML = `
    <div class="card">
      <div class="quiz-top"><span>Mission ${this.idx + 1}/${this.tasks.length}${t.efm ? ' · <span style="color:#f5a524">EFM</span>' : ""}</span>
        <span id="defi-timer" class="quiz-timer">⏱ ${this.TIME_PER_Q}s</span>
        <span>Score : <b style="color:var(--accent)">${this.score}</b></span>
        ${this.streak >= 2 ? `<span class="defi-streak">🔥 x${this.streak}</span>` : ""}
      </div>
      <div class="defi-task"><span class="defi-label">🎯 Mission</span><p>${t.t}</p>
        <div class="defi-mod">${esc(this.modName(t.m))}</div>
      </div>
      <div class="defi-hint" id="defi-hint" hidden>💡 ${esc(t.hint)}</div>
      <div class="defi-input-row">
        <span class="defi-ps">PS&gt;</span>
        <input id="defi-input" class="defi-input" placeholder="Tape la commande PowerShell…" autocomplete="off" spellcheck="false">
      </div>
      <div class="btn-row">
        <button class="btn" id="defi-show-hint">Indice (-2 pts)</button>
        <button class="btn primary" id="defi-send">Valider <kbd>Entrée</kbd></button>
      </div>
      <div id="defi-feedback"></div>
    </div>`;
    const input = el.querySelector("#defi-input");
    input.focus();
    input.addEventListener("keydown", e => { if (e.key === "Enter") this.submit(); });
    el.querySelector("#defi-send").onclick = () => this.submit();
    el.querySelector("#defi-show-hint").onclick = () => {
      el.querySelector("#defi-hint").hidden = false;
      this.hintUsed = true;
    };
    this.timeLeft = this.TIME_PER_Q;
    this.stopTimer();
    this.timer = setInterval(() => {
      this.timeLeft--;
      const tt = el.querySelector("#defi-timer");
      if (tt) tt.textContent = `⏱ ${this.timeLeft}s`;
      if (this.timeLeft <= 0) { this.submit(true); }
    }, 1000);
  },

  submit(timeout) {
    this.stopTimer();
    const t = this.tasks[this.idx], el = this.mountEl;
    const input = el.querySelector("#defi-input");
    const val = timeout ? "" : (input ? input.value : "");
    const ok = !timeout && this.check(val, t);
    let pts = 0;
    if (ok) {
      pts = 10 + Math.floor((this.timeLeft / this.TIME_PER_Q) * 5);
      this.streak++;
      if (this.streak >= 3) pts += 2;
      if (this.hintUsed) pts = Math.max(1, pts - 2);
      this.score += pts;
    } else {
      this.streak = 0;
    }
    this.results.push({ t: t.t, ok, pts, good: t.answers[0], mod: t.m });
    const fb = el.querySelector("#defi-feedback");
    fb.innerHTML = ok
      ? `<div class="defi-ok">✔ Bonne réponse ! +${pts} pts${this.streak >= 3 ? " (série 🔥)" : ""}<div class="muted" style="margin-top:6px"><code>${esc(t.answers[0])}</code></div></div>`
      : `<div class="defi-ko">${timeout ? "⏱ Temps écoulé !" : "✘ Raté."} <div style="margin-top:6px">Bonne réponse : <code>${esc(t.answers[0])}</code></div></div>`;
    const row = el.querySelector(".defi-input-row");
    if (row) row.innerHTML = `<button class="btn primary" id="defi-next">Mission suivante <kbd>Entrée</kbd></button>`;
    const next = () => {
      this.idx++;
      if (this.idx >= this.tasks.length) this.end();
      else this.renderTask();
    };
    el.querySelector("#defi-next").onclick = next;
    this._nextHandler = (e) => {
      if (e.key === "Enter" && document.body.contains(el)) { document.removeEventListener("keydown", this._nextHandler); next(); }
    };
    document.addEventListener("keydown", this._nextHandler);
  },

  end() {
    this.stopTimer();
    const el = this.mountEl, total = this.tasks.length;
    const good = this.results.filter(r => r.ok).length;
    const pct = Math.round((good / total) * 100);
    const data = this.load();
    const date = new Date().toLocaleDateString("fr-FR");
    data.board.push({ score: this.score, n: good, total, date });
    data.board.sort((a, b) => b.score - a.score);
    data.board = data.board.slice(0, 10);
    if (this.score > data.best) data.best = this.score;
    this.save(data);
    const errors = this.results.filter(r => !r.ok);
    el.innerHTML = `
    <div class="card"><h2>🏁 Défi terminé !</h2>
      <div class="quiz-score"><span class="big">${this.score}</span> pts</div>
      <div style="color:var(--muted)">${good}/${total} missions réussies (${pct}%)</div>
      <div class="btn-row"><button class="btn primary" id="defi-again">Rejouer</button></div>
      ${data.best ? `<div style="font-size:13px;color:var(--muted)">Record : <b style="color:var(--accent)">${data.best} pts</b></div>` : ""}
    </div>
    ${errors.length ? `<div class="card"><h2>À revoir 👀</h2>
      ${errors.map(r => `<div class="defi-review"><div>🎯 ${r.t}</div><div><code>${esc(r.good)}</code></div></div>`).join("")}
    </div>` : `<div class="card"><h2>Parfait ! 🌟</h2><div class="muted">Zéro faute — t'es prêt pour l'EFM.</div></div>`}`;
    el.querySelector("#defi-again").onclick = () => this.mount(el);
  },
};

if (typeof module !== "undefined") module.exports = { DEFI_BANK, DefiApp };
