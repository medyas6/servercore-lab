/* ============================================================
   Router Lab — ZTE-style simulator (kima ZTE b 100%)
   state + diagnostics + scenarios — kolchi local, bla backend
   ============================================================ */
const RouterLab = (() => {

  /* ---------- state ---------- */
  function deepMerge(base, over) {
    const out = Array.isArray(base) ? [...base] : { ...base };
    for (const k of Object.keys(over || {})) {
      if (over[k] && typeof over[k] === "object" && !Array.isArray(over[k]) && base[k] && typeof base[k] === "object") {
        out[k] = deepMerge(base[k], over[k]);
      } else out[k] = over[k];
    }
    return out;
  }

  function defaultRouter() {
    return {
      wan: { plugged: true, type: "DHCP", ip: "41.142.10.5", gateway: "41.142.10.1", dns: "8.8.8.8" },
      internetUp: true,   /* outage simule mn ISP */
      dnsUp: true,
      wifi: { on: true, ssid: "ZTE_2.4G_AB12", ssid5: "ZTE_5G_AB12", password: "yassine2024", security: "WPA2", channel: 6, channel5: 36, hidden: false, congested: false },
      lan: { ip: "192.168.1.1", mask: "255.255.255.0", dhcp: true, dhcpStart: "192.168.1.10", dhcpEnd: "192.168.1.100" },
      usb: { plugged: false, mode: "Storage" },
      voip: { enabled: false, number: "", registered: false },
      firewall: true,
      devices: [
        { name: "MacBook", mac: "f0:18:98:57:99:5e", ip: "192.168.1.23", kind: "wlan", known: true },
        { name: "PC-01", mac: "ba:34:50:8d:16:98", ip: "192.168.1.26", kind: "wlan", known: true },
        { name: "Phone", mac: "8e:d5:76:18:72:76", ip: "192.168.1.7", kind: "wlan", known: true },
        { name: "PC-Fixe", mac: "4c:72:b9:02:aa:11", ip: "192.168.1.50", kind: "lan", known: true },
      ],
      adminPass: "admin",
      scenario: null,
    };
  }

  function getState() {
    if (!store.data.router) store.data.router = defaultRouter();
    return store.data.router;
  }

  function save() {
    store.save();
    if (typeof Router3D !== "undefined" && Router3D.refresh) { try { Router3D.refresh(); } catch (e) {} }
    if (typeof document !== "undefined" && document.getElementById) render();
  }

  /* ---------- diagnostics ---------- */
  function ledColor(n, s) {
    switch (n) {
      case "power": return 1;
      case "internet": return s.internetUp && s.wan.plugged ? 1 : 0;
      case "wifi24": return s.wifi.on ? 1 : 0;
      case "wifi5": return s.wifi.on ? 1 : 0;
      case "usb": return s.usb.plugged ? 1 : 0;
      case "phone": return s.voip.enabled && s.voip.registered ? 1 : 0;
      default: return 0;
    }
  }

  /* checks dyal test zone — kol wa7da: status + detail + fix */
  function runChecks(s) {
    const c = [];
    c.push(s.wan.plugged
      ? { id: "wan-cable", status: "ok", t: "WAN cable", d: "Cable plugged, link up.", fix: "" }
      : { id: "wan-cable", status: "fail", t: "WAN cable", d: "No link on WAN port.", fix: "Plug the WAN cable (Internet tab)." });
    const net = s.wan.plugged && s.internetUp;
    c.push(net
      ? { id: "internet", status: "ok", t: "Internet", d: "Upstream reachable (" + s.wan.type + " " + s.wan.ip + ").", fix: "" }
      : { id: "internet", status: "fail", t: "Internet", d: s.wan.plugged ? "ISP outage simulated." : "No WAN link.", fix: s.wan.plugged ? "Disable the ISP-outage simulation." : "Plug the WAN cable." });
    c.push(s.dnsUp && net
      ? { id: "dns", status: "ok", t: "DNS", d: "Resolver " + s.wan.dns + " answers.", fix: "" }
      : { id: "dns", status: "fail", t: "DNS", d: "Name resolution broken.", fix: "Fix DNS server or the outage toggle." });
    c.push(s.lan.dhcp
      ? { id: "dhcp", status: "ok", t: "DHCP", d: "Pool " + s.lan.dhcpStart + " – " + s.lan.dhcpEnd + ".", fix: "" }
      : { id: "dhcp", status: "fail", t: "DHCP", d: "DHCP off — devices get no IP.", fix: "Enable DHCP (Local Network tab)." });
    c.push(s.wifi.on
      ? { id: "wifi", status: "ok", t: "WiFi broadcast", d: s.wifi.ssid + (s.wifi.hidden ? " (hidden)" : "") + " + " + s.wifi.ssid5 + ".", fix: "" }
      : { id: "wifi", status: "fail", t: "WiFi broadcast", d: "Radios off.", fix: "Enable WiFi (Local Network tab)." });
    const weak = ["WPA2", "WPA3"].indexOf(s.wifi.security) === -1 || String(s.wifi.password).length < 8;
    c.push(!weak
      ? { id: "wifi-sec", status: "ok", t: "WiFi security", d: s.wifi.security + ", password set.", fix: "" }
      : { id: "wifi-sec", status: "fail", t: "WiFi security", d: "Open/weak encryption or short password.", fix: "Set WPA2 with 8+ chars." });
    c.push(!s.wifi.congested
      ? { id: "wifi-channel", status: "ok", t: "WiFi channel", d: "Channel " + s.wifi.channel + " clear.", fix: "" }
      : { id: "wifi-channel", status: "warn", t: "WiFi channel", d: "Channel " + s.wifi.channel + " congested.", fix: "Switch to 1 or 11." });
    const intr = s.devices.filter(d => d.kind === "wlan" && !d.known);
    c.push(intr.length === 0
      ? { id: "intruder", status: "ok", t: "Unknown devices", d: "No intruders on WLAN.", fix: "" }
      : { id: "intruder", status: "warn", t: "Unknown devices", d: intr.length + " unknown device(s): " + intr.map(d => d.name).join(", ") + ".", fix: "Change the WiFi password to kick them." });
    return c;
  }

  function overall(checks) {
    if (checks.some(c => c.status === "fail")) return "fail";
    if (checks.some(c => c.status === "warn")) return "warn";
    return "ok";
  }

  /* ping simule — 4 replies wla timeouts */
  function pingLines(host, s) {
    host = String(host == null ? "" : host).trim();
    if (!host) return ["Usage: ping <host> — try 8.8.8.8 or a device IP."];
    const net = s.wan.plugged && s.internetUp;
    const lines = [];
    const lanDev = s.devices.find(d => d.ip === host || d.name.toLowerCase() === host.toLowerCase()) ||
      (s.lan && s.lan.ip === host ? { ip: host } : null);
    if (lanDev) {
      for (let i = 0; i < 4; i++) lines.push("Reply from " + lanDev.ip + ": bytes=32 time<1ms TTL=64");
      return lines;
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      if (!net) { for (let i = 0; i < 4; i++) lines.push("Request timed out."); return lines; }
      for (let i = 0; i < 4; i++) lines.push("Reply from " + host + ": bytes=32 time=" + (18 + i * 3) + "ms TTL=117");
      return lines;
    }
    if (!net) { for (let i = 0; i < 4; i++) lines.push("Request timed out."); return lines; }
    if (!s.dnsUp) return lines.concat(["Ping request could not find host " + host + ". Check DNS."]);
    for (let i = 0; i < 4; i++) lines.push("Reply from " + host + ": bytes=32 time=" + (22 + i * 2) + "ms TTL=117");
    return lines;
  }

  /* ---------- scenarios ---------- */
  const SCENARIOS = {
    "slow-wifi": {
      title: "Slow WiFi", story: "Streaming keeps buffering. The neighbor's router is blasting on your channel.",
      goal: "Fix the slow WiFi.", hint: "Check the channel in Local Network → WLAN.",
      setup(s) { s.wifi.congested = true; s.wifi.channel = 6; },
      done(s) { const ch = Number(s.wifi.channel); return !s.wifi.congested && (ch === 1 || ch === 11); },
    },
    "neighbor": {
      title: "Neighbor on my WiFi", story: "An unknown phone appeared in your device list. Someone is stealing your WiFi.",
      goal: "Kick the intruder out.", hint: "Change the WiFi password.",
      setup(s) { s.devices.push({ name: "Unknown-Phone", mac: "de:ad:be:ef:00:01", ip: "192.168.1.77", kind: "wlan", known: false }); },
      done(s) { return !s.devices.some(d => d.kind === "wlan" && !d.known); },
    },
    "challenge": {
      title: "Total outage", story: "Nothing works: no internet, no WiFi security, DHCP is off, WAN cable unplugged.",
      goal: "Bring everything back to green.", hint: "Run diagnostics and fix every red row.",
      setup(s) { s.wan.plugged = false; s.lan.dhcp = false; s.wifi.password = "1234"; },
      done(s) { return overall(runChecks(s)) === "ok"; },
    },
  };

  function startScenario(k) {
    const s = getState();
    s.scenario = k;
    SCENARIOS[k].setup(s);
    save();
  }
  function scenarioDone(k) { return SCENARIOS[k].done(getState()); }
  function stopScenario() { const s = getState(); s.scenario = null; save(); }

  function changeWifiPassword(s, npw) {
    s.wifi.password = npw;
    s.devices = s.devices.filter(d => d.known); /* intruders kicked */
  }

  function reset() {
    store.data.router = defaultRouter();
    save();
  }

  /* expose l tests */
  if (typeof module !== "undefined") {
    module.exports = { defaultRouter, runChecks, overall, pingLines, SCENARIOS, changeWifiPassword, deepMerge, startScenario, scenarioDone, stopScenario, reset };
  }

  /* ============================================================
     3D router — Three.js (CDN), khfif 3la tele o PC
     ============================================================ */
  const Router3D = (() => {
    let scene, camera, renderer, group, mountEl = null, raf = null;
    let portMeshes = [], waves = [], leds = {};
    let dragX = 0, dragging = false, lastX = 0;

    function loadThree(cb) {
      if (window.THREE) return cb();
      const sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
      sc.onload = cb;
      sc.onerror = () => { if (mountEl) mountEl.innerHTML = '<p class="muted" style="padding:2rem">3D needs internet once (Three.js CDN). The admin panel works offline.</p>'; };
      document.head.appendChild(sc);
    }

    function ledMat(on) {
      return new THREE.MeshStandardMaterial({
        color: 0x111111, emissive: on ? 0x3ddc84 : 0x330000,
        emissiveIntensity: on ? 2.2 : 0.6, roughness: 0.4,
      });
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
      key.position.set(4, 6, 4); scene.add(key);
      const rim = new THREE.DirectionalLight(0x3ddc84, 0.35);
      rim.position.set(-5, 3, -4); scene.add(rim);

      group = new THREE.Group();
      scene.add(group);

      /* corps byed kima ZTE dyal bsa7 */
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe9edf1, roughness: 0.6, metalness: 0.15 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.55, 2.3), bodyMat);
      body.position.y = 0.28; group.add(body);

      /* 2 antennes bydin */
      const antMat = new THREE.MeshStandardMaterial({ color: 0xdfe4e9, roughness: 0.55, metalness: 0.1 });
      [-1.5, 1.5].forEach(x => {
        const a = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.5, 12), antMat);
        a.position.set(x, 1.25, -0.9); a.rotation.x = -0.12; group.add(a);
      });

      /* LEDs l9oddam */
      const ledNames = ["power", "internet", "wifi24", "wifi5", "lan1", "lan2", "lan3", "lan4", "usb", "phone", "wps"];
      leds = {};
      ledNames.forEach((n, i) => {
        const on = n.startsWith("lan") ? 1 : ledColor(n, s);
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.04), ledMat(on));
        m.position.set(-2.0 + i * 0.4, 0.18, 1.16);
        m.userData = { kind: "led", name: n };
        group.add(m); leds[n] = m; portMeshes.push(m);
      });

      /* ports lor */
      const mkPort = (w, color, x, name, label) => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(w, 0.34, 0.1),
          new THREE.MeshStandardMaterial({ color: color, roughness: 0.6 }));
        p.position.set(x, 0.28, -1.16);
        p.userData = { kind: "port", name: name, label: label };
        group.add(p); portMeshes.push(p);
      };
      /* power jack */
      const pw = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 16),
        new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.5 }));
      pw.rotation.x = Math.PI / 2; pw.position.set(-2.1, 0.28, -1.16);
      pw.userData = { kind: "port", name: "power", label: "Power" };
      group.add(pw); portMeshes.push(pw);
      mkPort(0.42, 0x1d4ed8, -1.55, "wan", "WAN — " + (s.wan.plugged ? "plugged" : "unplugged"));
      [0, 1, 2, 3].forEach(i => mkPort(0.42, 0xd7a91f, -0.95 + i * 0.55, "lan" + (i + 1), "LAN" + (i + 1)));
      mkPort(0.34, 0x2a2f3a, 1.3, "usb", "USB — " + (s.usb.plugged ? "plugged" : "empty"));
      /* RJ11 telephon */
      const rj = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.6 }));
      rj.position.set(1.72, 0.28, -1.16);
      rj.userData = { kind: "port", name: "rj11", label: "Phone — " + (s.voip.enabled ? "enabled" : "disabled") };
      group.add(rj); portMeshes.push(rj);
      /* bouton 7mer (WPS) */
      const wps = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16),
        new THREE.MeshStandardMaterial({ color: 0xc22e2e, roughness: 0.5 }));
      wps.rotation.x = Math.PI / 2; wps.position.set(2.12, 0.28, -1.16);
      wps.userData = { kind: "port", name: "wps", label: "WPS button" };
      group.add(wps); portMeshes.push(wps);

      /* cable WAN */
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 }));
      cable.position.set(-1.55, -0.4, -1.7); cable.rotation.x = 0.5;
      cable.visible = s.wan.plugged;
      group.add(cable); leds.__cable = cable;

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
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.9, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.01;
      scene.add(shadow);

      /* ch9ou9 thwiya lfo9 (2 sfouf kima l2asli) */
      const ventMat = new THREE.MeshStandardMaterial({ color: 0xc9cfd6, roughness: 0.8 });
      for (let r = 0; r < 2; r++) {
        for (let i = 0; i < 8; i++) {
          const v = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.1), ventMat);
          v.position.set(-1.55 + i * 0.44, 0.56, -0.3 + r * 0.5);
          group.add(v);
        }
      }

      /* drag bach ddor */
      const cv = renderer.domElement;
      cv.style.cursor = "grab";
      cv.addEventListener("pointerdown", e => { dragging = true; lastX = e.clientX; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener("pointermove", e => { if (dragging) { dragX += (e.clientX - lastX) * 0.01; lastX = e.clientX; } });
      cv.addEventListener("pointerup", () => dragging = false);

      /* click 3la port wla LED */
      const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
      cv.addEventListener("click", e => {
        const r = cv.getBoundingClientRect();
        ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
        ray.setFromCamera(ptr, camera);
        const hit = ray.intersectObjects(portMeshes)[0];
        const info = document.getElementById("r3d-info");
        if (hit && info) info.textContent = hit.object.userData.label || hit.object.userData.name;
      });

      animate();
    }

    function animate() {
      raf = requestAnimationFrame(animate);
      if (document.hidden) return; /* economi CPU/battery ملي tab makhdomch */
      if (group) group.rotation.y += ((dragX) - group.rotation.y) * 0.08;
      const t = Date.now() / 1000;
      waves.forEach((w, i) => {
        const ph = (t * 0.7 + i * 0.33) % 1;
        w.scale.set(0.6 + ph * 1.6, 0.6 + ph * 1.6, 1);
        w.material.opacity = 0.55 * (1 - ph);
      });
      renderer.render(scene, camera);
    }

    const Router3D = {
      init(el, s) {
        Router3D.destroy();
        mountEl = el;
        if (mountEl) mountEl.innerHTML = '<p class="muted" style="padding:2rem">Loading 3D…</p>';
        loadThree(() => { if (mountEl === el) { try { build(s || {}); } catch (err) { if (mountEl) mountEl.innerHTML = '<p class="muted" style="padding:2rem">3D failed to start (WebGL unavailable?). The admin panel works fully.</p>'; } } });
      },
      refresh() {
        if (!group) return;
        let s = {};
        try { s = RouterLab.getState(); } catch (e) { return; }
        Object.keys(leds).forEach(n => {
          if (n === "__cable") { leds[n].visible = s.wan.plugged; return; }
          const on = n.startsWith("lan") ? 1 : ledColor(n, s);
          leds[n].material = ledMat(on);
        });
        waves.forEach(w => w.visible = s.wifi.on);
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

  /* ============================================================
     ZTE view — bdeb kima la page dyal ZTE, background byed
     ============================================================ */
  let curTab = "home", devFilter = "wlan", clockTimer = null, mountNode = null;

  function mount(el) { mountNode = el || null; render(); }

  const ZBLUE = "#0067b1";
  const ICO = {
    globe: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="' + ZBLUE + '" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18"/></svg>',
    shield: '<svg width="26" height="26" viewBox="0 0 24 24" fill="' + ZBLUE + '"><path d="M12 2l8 3v6c0 5-3.5 9.3-8 11-4.5-1.7-8-6-8-11V5z" opacity="0.9"/><path d="M8.5 12l2.5 2.5 4.5-5" stroke="#fff" stroke-width="1.8" fill="none"/></svg>',
    wifi: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="' + ZBLUE + '" stroke-width="2"><path d="M2.5 9a15 15 0 0 1 19 0M5.5 12.5a10 10 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19" r="1.4" fill="' + ZBLUE + '"/></svg>',
    usb: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="' + ZBLUE + '" stroke-width="1.8"><path d="M12 3v10m0 0l-4-4m4 4l4-4"/><circle cx="12" cy="3" r="1.6" fill="' + ZBLUE + '"/><path d="M8 13l-3 8m11-8l3 8" /><circle cx="5" cy="21" r="1.4" fill="' + ZBLUE + '"/><circle cx="19" cy="21" r="1.4" fill="' + ZBLUE + '"/></svg>',
    phone: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="' + ZBLUE + '" stroke-width="1.8"><path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    pc: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="' + ZBLUE + '" stroke-width="1.8"><rect x="3" y="4" width="18" height="12" rx="1"/><path d="M9 20h6M12 16v4"/></svg>',
    router: '<svg width="72" height="40" viewBox="0 0 72 40"><rect x="6" y="14" width="60" height="18" rx="4" fill="#e8edf2" stroke="#9aa7b4"/><rect x="14" y="20" width="6" height="6" fill="#7ed492"/><rect x="24" y="20" width="6" height="6" fill="#7ed492"/><rect x="34" y="20" width="6" height="6" fill="#7ed492"/><rect x="44" y="20" width="6" height="6" fill="#e8b93e"/><line x1="20" y1="14" x2="16" y2="2" stroke="#5a6672" stroke-width="3"/><line x1="52" y1="14" x2="56" y2="2" stroke="#5a6672" stroke-width="3"/></svg>',
  };

  function zteTime() {
    const d = new Date(), p = n => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }

  function ztabs() {
    const tabs = [["home", "Home"], ["internet", "Internet"], ["lan", "Local Network"], ["voip", "VoIP"], ["mgmt", "Management & Diagnosis"], ["3d", "3D Router"]];
    return '<div class="ztabs">' + tabs.map(t =>
      '<button class="ztab' + (curTab === t[0] ? " on" : "") + '" data-ztab="' + t[0] + '">' + t[1] + "</button>"
    ).join("") + "</div>";
  }

  function zfieldRow(label, inner) {
    return '<div class="zrow"><label>' + label + "</label>" + inner + "</div>";
  }
  function zin(path, val, type) {
    return '<input class="zin2" data-zfield="' + path + '" value="' + esc(val == null ? "" : val) + '"' + (type ? ' type="' + type + '"' : "") + ">";
  }
  function zsel(path, opts, val) {
    return '<select class="zin2" data-zfield="' + path + '">' + opts.map(o =>
      '<option value="' + o + '"' + (String(val) === String(o) ? " selected" : "") + ">" + o + "</option>").join("") + "</select>";
  }
  function zchk(path, on, label) {
    return '<label class="zchk"><input type="checkbox" data-zcheck="' + path + '"' + (on ? " checked" : "") + "> " + label + "</label>";
  }
  function zbtn(act, label) {
    return '<button class="zbtn" data-zact="' + act + '">' + label + "</button>";
  }

  /* ---------- Home (bdeb kima screenshot) ---------- */
  function zteHome(s) {
    const devs = s.devices.filter(d => d.kind === devFilter);
    const filtName = { wlan: "WLAN", lan: "LAN", usb: "USB", voip: "VoIP" }[devFilter];
    const rows = devs.map(d =>
      "<tr><td>" + esc(d.name) + "</td><td class=\"mono\">" + esc(d.mac) + "</td><td class=\"mono\">" + esc(d.ip) + "</td><td class=\"mono\">—</td></tr>"
    ).join("") || '<tr><td colspan="4" class="zempty">No devices.</td></tr>';
    const items = [["wlan", "WLAN Devices", ICO.wifi], ["lan", "LAN Devices", ICO.pc], ["usb", "USB Devices", ICO.usb], ["voip", "VoIP Devices", ICO.phone]];
    return '' +
      '<div class="zdiagram">' +
        '<button class="zbox" data-zgoto="internet">' + ICO.globe + '<span>WAN Setting</span></button>' +
        '<div class="zline"></div>' +
        '<button class="zbox sm" data-zgoto="internet">' + ICO.shield + '<span class="zlink2">Firewall</span></button>' +
        '<div class="zline"></div>' +
        '<button class="zbox" data-zgoto="3d">' + ICO.router + ICO.wifi + "</button>" +
      "</div>" +
      '<div class="zdevwrap">' +
        '<div class="zdevlist"><div class="zdevlist-h">Device List</div>' +
          items.map(i => '<button class="zdevitem' + (devFilter === i[0] ? " on" : "") + '" data-zdev="' + i[0] + '">' + i[2] + "<span>" + i[1] + "</span></button>").join("") +
        "</div>" +
        '<div class="zdevtable"><div class="zdevtable-h"><span>' + filtName + ' Device List</span><button class="zlink2" data-zgoto="lan">' + filtName + ' Setting</button></div>' +
          '<table class="ztable"><thead><tr><th>Name</th><th>MAC Address</th><th>IPv4 Address</th><th>IPv6 Address</th></tr></thead>' +
          "<tbody>" + rows + "</tbody></table>" +
        "</div>" +
      "</div>";
  }

  /* ---------- Internet ---------- */
  function zteInternet(s) {
    return '' +
      '<div class="zsec"><div class="zsec-h">WAN Setting</div><div class="zsec-b">' +
      zfieldRow("WAN port", zchk("wan.plugged", s.wan.plugged, s.wan.plugged ? "Cable plugged" : "Cable unplugged")) +
      zfieldRow("Connection type", zsel("wan.type", ["DHCP", "PPPoE", "Static"], s.wan.type)) +
      zfieldRow("IP address", zin("wan.ip", s.wan.ip)) +
      zfieldRow("Gateway", zin("wan.gateway", s.wan.gateway)) +
      zfieldRow("DNS server", zin("wan.dns", s.wan.dns)) +
      zfieldRow("ISP outage (sim)", zchk("internetUp", s.internetUp, "Internet up")) +
      "</div></div>" +
      '<div class="zsec"><div class="zsec-h">Firewall</div><div class="zsec-b">' +
      zfieldRow("Firewall", zchk("firewall", s.firewall, s.firewall ? "Enabled" : "Disabled")) +
      '<p class="znote">Blocks unsolicited inbound traffic from the WAN side.</p>' +
      "</div></div>";
  }

  /* ---------- Local Network ---------- */
  function zteLan(s) {
    return '' +
      '<div class="zsec"><div class="zsec-h">WLAN Setting</div><div class="zsec-b">' +
      zfieldRow("WiFi", zchk("wifi.on", s.wifi.on, s.wifi.on ? "On" : "Off")) +
      zfieldRow("SSID (2.4G)", zin("wifi.ssid", s.wifi.ssid)) +
      zfieldRow("SSID (5G)", zin("wifi.ssid5", s.wifi.ssid5)) +
      zfieldRow("Security", zsel("wifi.security", ["WPA2", "WPA3", "WPA/WPA2", "Open"], s.wifi.security)) +
      zfieldRow("Password", zin("wifi.password", s.wifi.password, "text")) +
      zfieldRow("Channel (2.4G)", zsel("wifi.channel", ["1", "6", "11", "Auto"], s.wifi.channel)) +
      zfieldRow("Channel (5G)", zsel("wifi.channel5", ["36", "40", "44", "Auto"], s.wifi.channel5)) +
      zfieldRow("Options", zchk("wifi.hidden", s.wifi.hidden, "Hide SSID") + " " + zchk("wifi.congested", s.wifi.congested, "Channel congested (sim)")) +
      zfieldRow("", zbtn("wifi-pw", "Apply password (kicks intruders)")) +
      "</div></div>" +
      '<div class="zsec"><div class="zsec-h">LAN & DHCP</div><div class="zsec-b">' +
      zfieldRow("Router IP", zin("lan.ip", s.lan.ip)) +
      zfieldRow("Subnet mask", zin("lan.mask", s.lan.mask)) +
      zfieldRow("DHCP", zchk("lan.dhcp", s.lan.dhcp, s.lan.dhcp ? "Enabled" : "Disabled")) +
      zfieldRow("Pool start", zin("lan.dhcpStart", s.lan.dhcpStart)) +
      zfieldRow("Pool end", zin("lan.dhcpEnd", s.lan.dhcpEnd)) +
      "</div></div>" +
      '<div class="zsec"><div class="zsec-h">USB</div><div class="zsec-b">' +
      zfieldRow("USB device", zchk("usb.plugged", s.usb.plugged, s.usb.plugged ? "Plugged" : "Empty")) +
      zfieldRow("Mode", zsel("usb.mode", ["Storage", "Printer", "3G/4G Modem"], s.usb.mode)) +
      "</div></div>";
  }

  /* ---------- VoIP ---------- */
  function zteVoip(s) {
    return '<div class="zsec"><div class="zsec-h">VoIP Setting</div><div class="zsec-b">' +
      zfieldRow("VoIP", zchk("voip.enabled", s.voip.enabled, s.voip.enabled ? "Enabled" : "Disabled")) +
      zfieldRow("SIP number", zin("voip.number", s.voip.number)) +
      zfieldRow("Registration", '<b class="' + (s.voip.registered ? "zok" : "zfail") + '">' + (s.voip.registered ? "Registered" : "Not registered") + "</b>") +
      '<p class="znote">Registration succeeds when a number is set and internet is up.</p>' +
      "</div></div>";
  }

  /* ---------- Management & Diagnosis ---------- */
  function zteMgmt(s) {
    const checks = runChecks(s), ov = overall(checks);
    const dot = st => st === "ok" ? "zok" : st === "warn" ? "zwarn" : "zfail";
    const scenBtns = Object.keys(SCENARIOS).map(k =>
      '<div class="zscen"><b>' + SCENARIOS[k].title + "</b><p>" + SCENARIOS[k].story + "</p>" +
      zbtn("scen-" + k, "Start") + "</div>").join("");
    return '' +
      '<div class="zsec"><div class="zsec-h">Diagnosis <span class="zbadge ' + dot(ov) + '">' +
        (ov === "ok" ? "Healthy" : ov === "warn" ? "Warnings" : "Failures") + "</span></div>" +
      '<div class="zsec-b"><table class="ztable"><thead><tr><th>Check</th><th>Status</th><th>Detail</th><th>Fix</th></tr></thead><tbody>' +
      checks.map(c => "<tr><td>" + c.t + '</td><td class="' + dot(c.status) + '">' + c.status.toUpperCase() + "</td><td>" + c.d + "</td><td>" + (c.fix || "—") + "</td></tr>").join("") +
      '</tbody></table><div class="zrow"><label></label>' + zbtn("diag", "Run diagnostics") + "</div></div></div>" +
      '<div class="zsec"><div class="zsec-h">Ping test</div><div class="zsec-b">' +
      zfieldRow("Host", zin("pingHost", "8.8.8.8") + " " + zbtn("ping", "Ping")) +
      '<pre class="zping" id="zping">—</pre>' +
      '<p class="znote">Try: 8.8.8.8, google.com, 192.168.1.23 (MacBook).</p>' +
      "</div></div>" +
      '<div class="zsec"><div class="zsec-h">Troubleshoot scenarios</div><div class="zsec-b">' +
      (s.scenario
        ? '<div class="zscen on"><b>' + SCENARIOS[s.scenario].title + "</b><p><b>Goal:</b> " + SCENARIOS[s.scenario].goal + "</p><p><b>Hint:</b> " + SCENARIOS[s.scenario].hint + "</p>" +
          zbtn("scen-check", "Verify fix") + " " + zbtn("scen-stop", "Stop") + ' <span id="zscen-msg"></span></div>'
        : '<div class="zscens">' + scenBtns + "</div>") +
      "</div></div>" +
      '<div class="zsec"><div class="zsec-h">Management</div><div class="zsec-b">' +
      zfieldRow("DNS up (sim)", zchk("dnsUp", s.dnsUp, s.dnsUp ? "Resolver answers" : "Resolver down")) +
      zfieldRow("Admin password", zin("adminPass", s.adminPass, "text")) +
      zfieldRow("Firmware", '<span class="znote">V1.0.0 — </span>' + zbtn("fw", "Check update")) +
      zfieldRow("Device", zbtn("reboot", "Reboot") + " " + zbtn("reset", "Factory reset")) +
      "</div></div>";
  }

  /* ---------- 3D ---------- */
  function zte3d() {
    return '<div class="z3d"><div id="r3d-mount" class="r3d-mount"></div>' +
      '<div id="r3d-info" class="r3d-info">Click a port or LED for details. Drag to rotate.</div></div>';
  }

  function render() {
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
    Router3D.destroy();
    const s = getState();
    const mount = mountNode || document.getElementById("zpanel") || document.getElementById("router-mount");
    if (!mount) return;
    const body = curTab === "home" ? zteHome(s) : curTab === "internet" ? zteInternet(s) :
      curTab === "lan" ? zteLan(s) : curTab === "voip" ? zteVoip(s) :
      curTab === "mgmt" ? zteMgmt(s) : zte3d();
    mount.innerHTML =
      '<div class="zte">' +
        '<div class="ztop"><div class="zte-logo">ZTE</div>' +
        '<div class="ztime">Current Time: <span id="zte-clock">' + zteTime() + "</span></div>" +
        '<div class="zuser"><span>user</span><a href="#" data-zact="logout">Logout</a><span>中文 | English</span></div></div>' +
        ztabs() +
        '<div class="zbody">' + body + "</div>" +
      "</div>";
    clockTimer = setInterval(() => {
      const c = document.getElementById("zte-clock");
      if (c) c.textContent = zteTime(); else { clearInterval(clockTimer); clockTimer = null; }
    }, 1000);
    wire(mount);
    if (curTab === "3d") Router3D.init(document.getElementById("r3d-mount"), s);
  }

  function setPath(path, val) {
    const s = getState(), parts = path.split(".");
    let o = s;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = val;
    if (path === "voip.enabled" || path === "voip.number") s.voip.registered = s.voip.enabled && !!s.voip.number && s.internetUp && s.wan.plugged;
    save();
  }

  function wire(mount) {
    mount.onclick = e => {
      const t = e.target.closest("[data-ztab],[data-zdev],[data-zact],[data-zgoto]");
      if (!t) return;
      if (t.hasAttribute("data-ztab")) { curTab = t.getAttribute("data-ztab"); render(); return; }
      if (t.hasAttribute("data-zdev")) { devFilter = t.getAttribute("data-zdev"); render(); return; }
      if (t.hasAttribute("data-zgoto")) { curTab = t.getAttribute("data-zgoto"); render(); return; }
      const act = t.getAttribute("data-zact");
      const s = getState();
      if (act === "diag") { toast("Diagnostics refreshed"); render(); }
      else if (act === "ping") {
        const inp = mount.querySelector('[data-zfield="pingHost"]');
        const host = inp && inp.value.trim() ? inp.value.trim() : "8.8.8.8";
        const pre = document.getElementById("zping");
        if (pre) pre.textContent = pingLines(host, s).join("\n");
      }
      else if (act === "wifi-pw") { const inp = mount.querySelector('[data-zfield="wifi.password"]'); changeWifiPassword(s, inp ? inp.value : s.wifi.password); save(); toast("Password applied — intruders kicked"); }
      else if (act === "reboot") { toast("Rebooting… (simulated)"); }
      else if (act === "fw") { toast("Firmware V1.0.0 is the latest"); }
      else if (act === "reset") { if (confirm("Factory reset? All settings lost.")) { reset(); toast("Factory defaults restored"); } }
      else if (act === "logout") { e.preventDefault(); toast("Logged out (simulated)"); }
      else if (act && act.startsWith("scen-")) {
        const k = act.slice(5);
        if (k === "stop") { s.scenario = null; save(); }
        else if (k === "check") {
          const ok = SCENARIOS[s.scenario].done(s);
          const m = document.getElementById("zscen-msg");
          if (m) m.innerHTML = ok ? '<b class="zok">Fixed! Well done.</b>' : '<b class="zfail">Not yet — ' + SCENARIOS[s.scenario].hint + "</b>";
          if (ok) { s.scenario = null; save(); }
        } else { s.scenario = k; SCENARIOS[k].setup(s); save(); toast("Scenario started: " + SCENARIOS[k].title); }
      }
    };
    mount.onchange = e => {
      const f = e.target.closest("[data-zfield]");
      const c = e.target.closest("[data-zcheck]");
      if (f && f.getAttribute("data-zfield") !== "pingHost") setPath(f.getAttribute("data-zfield"), f.value);
      if (c) setPath(c.getAttribute("data-zcheck"), c.checked);
    };
  }

  return {
    render, mount,
    _homeHtml() { return zteHome(getState()); }, /* preview static */
    getState, runChecks, overall, pingLines, SCENARIOS, changeWifiPassword, reset,
    defaultRouter, deepMerge, startScenario, scenarioDone, stopScenario,
    _R3D: Router3D, /* test hook */
  };
})();

if (typeof window !== "undefined") window.RouterLab = RouterLab;
