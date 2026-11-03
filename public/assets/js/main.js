(() => {
  /** ECC windlevels 0–4 — protocolkleuren Frank / @ewap/domain-wind ECC_LEVEL_COLORS */
  const LEVELS = [
    {
      level: 0,
      name: "Groen",
      band: "Normaal · piek tot ±40 km/h",
      gust: 28,
      measure:
        "Alles rustig. Blijf meten en houd ECC / CP op de hoogte. Geen extra maatregelen nodig.",
      bg: "#00B050",
      fg: "#FFFFFF",
    },
    {
      level: 1,
      name: "Geel",
      band: "Opletten · piek tot ±72 km/h",
      gust: 55,
      measure:
        "Informeer leveranciers en teams. Check losse onderdelen en bereid de volgende maatregelen voor.",
      bg: "#FFFF00",
      fg: "#0B1B34",
    },
    {
      level: 2,
      name: "Oranje",
      band: "Verhoogd · piek tot ±80 km/h",
      gust: 76,
      measure:
        "Maatregelen uitvoeren. Beperk gebruik van het bouwsel, zet ballast of afspanmaatregelen in, en communiceer breed.",
      bg: "#FFC000",
      fg: "#0B1B34",
    },
    {
      level: 3,
      name: "Rood",
      band: "Actie · piek tot ±90 km/h",
      gust: 85,
      measure:
        "Actie. Bouwsel stilleggen of beperken volgens het protocol. Alles vastleggen in het logboek.",
      bg: "#FF0000",
      fg: "#FFFFFF",
    },
    {
      level: 4,
      name: "Paars",
      band: "Extreem · piek boven 90 km/h",
      gust: 105,
      measure:
        "Hoogste niveau. Ontruimen of site-evacuatie volgens het ECC-protocol. Iedereen op de hoogte.",
      bg: "#7030A0",
      fg: "#FFFFFF",
    },
  ];

  /**
   * Per bouwsel: welk ECC-level (0–4) bij site-level 0–4.
   * Springkussen escaleert sneller (L1 al oranje). Ingangspoort volgt de standaardkleuren.
   */
  const BOUWSELS = [
    { name: "Hoofdpodium", map: [0, 1, 2, 3, 4] },
    { name: "VIP-tent", map: [0, 1, 2, 3, 4] },
    { name: "Springkussen", map: [0, 2, 3, 4, 4] },
    { name: "Ingangspoort", map: [0, 1, 2, 3, 4] },
  ];

  const GUST_BOUNDS = [40, 72, 80, 90];
  const AUTO_LEVEL_MS = 3200;
  const AUTO_RESUME_MS = 12000;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function levelFromGust(gustKmh) {
    const value = Math.max(0, Math.min(120, Number(gustKmh)));
    for (let i = 0; i < GUST_BOUNDS.length; i += 1) {
      if (value <= GUST_BOUNDS[i]) return LEVELS[i];
    }
    return LEVELS[4];
  }

  function bouwselLevel(item, siteLevel) {
    const mapped = item.map[Math.min(4, Math.max(0, siteLevel))] ?? siteLevel;
    return LEVELS[mapped] || LEVELS[0];
  }

  function initLevels() {
    const stage = document.querySelector("[data-level-stage]");
    const badge = document.querySelector("[data-level-badge]");
    const nameEl = document.querySelector("[data-level-name]");
    const bandEl = document.querySelector("[data-level-band]");
    const measureEl = document.querySelector("[data-level-measure]");
    const meter = document.querySelector("[data-level-meter]");
    const slider = document.querySelector("[data-wind-slider]");
    const windKmhEl = document.querySelector("[data-wind-kmh]");
    const windMsEl = document.querySelector("[data-wind-ms]");
    const tabs = Array.from(document.querySelectorAll("[data-level-tab]"));
    const bouwselList = document.querySelector("[data-bouwsel-list]");
    const playPause = document.querySelector("[data-level-auto]");

    if (!stage || !slider || !badge || !nameEl || !bandEl || !measureEl || !meter) {
      return;
    }

    function formatMs(kmh) {
      return (kmh / 3.6).toFixed(1).replace(".", ",");
    }

    let currentGust = Number(slider.value) || 28;
    let autoTimer = 0;
    let resumeTimer = 0;
    let autoOn = !reduceMotion;
    let autoLevelIndex = 0;

    function renderBouwsels(siteLevel) {
      if (!bouwselList) return;
      bouwselList.innerHTML = "";
      for (const item of BOUWSELS) {
        const local = bouwselLevel(item, siteLevel);
        const ahead = local.level > siteLevel;
        const note = ahead ? "strenger dan event" : local.level < siteLevel ? "lager dan event" : "gelijk aan event";
        const li = document.createElement("li");
        li.className = "bouwsel-card";
        li.dataset.bouwselLevel = String(local.level);
        li.style.setProperty("--bouwsel-bg", local.bg);
        li.style.setProperty("--bouwsel-fg", local.fg);
        li.innerHTML = `
          <span class="bouwsel-dot" aria-hidden="true"></span>
          <span class="bouwsel-meta">
            <span class="bouwsel-name">${item.name}</span>
            <span class="bouwsel-note">${note}</span>
          </span>
          <span class="bouwsel-pct">
            <span class="bouwsel-level-pill">L${local.level}</span>
            ${local.name}
          </span>
        `;
        bouwselList.appendChild(li);
      }
      bouwselList.setAttribute(
        "aria-label",
        `Bouwsel-levels bij evenement-level ${siteLevel}`,
      );
    }

    function setGust(gustKmh, { pulse = true } = {}) {
      currentGust = Math.max(20, Math.min(120, Math.round(gustKmh)));
      const level = levelFromGust(currentGust);
      autoLevelIndex = level.level;

      slider.value = String(currentGust);
      if (windKmhEl) windKmhEl.textContent = String(currentGust);
      if (windMsEl) windMsEl.textContent = formatMs(currentGust);

      stage.dataset.level = String(level.level);
      badge.textContent = String(level.level);
      badge.style.background = level.bg;
      badge.style.color = level.fg;
      if (pulse && !reduceMotion) {
        badge.classList.remove("is-pulse");
        void badge.offsetWidth;
        badge.classList.add("is-pulse");
        stage.classList.remove("is-level-flash");
        void stage.offsetWidth;
        stage.classList.add("is-level-flash");
      }
      nameEl.textContent = level.name;
      bandEl.textContent = level.band;
      measureEl.textContent = level.measure;
      const meterPct = Math.min(100, ((currentGust - 20) / 100) * 100);
      meter.style.width = `${meterPct}%`;
      meter.style.background = level.bg;
      meter.parentElement?.setAttribute("aria-valuenow", String(Math.round(meterPct)));

      for (const tab of tabs) {
        const active = Number(tab.dataset.levelTab) === level.level;
        tab.setAttribute("aria-pressed", active ? "true" : "false");
      }

      renderBouwsels(level.level);
      if (playPause) {
        playPause.setAttribute("aria-pressed", autoOn ? "true" : "false");
        playPause.textContent = autoOn ? "Animatie aan" : "Animatie uit";
      }
    }

    function stopAuto() {
      window.clearInterval(autoTimer);
      autoTimer = 0;
    }

    function startAuto() {
      stopAuto();
      if (!autoOn || reduceMotion) return;
      autoTimer = window.setInterval(() => {
        autoLevelIndex = (autoLevelIndex + 1) % LEVELS.length;
        setGust(LEVELS[autoLevelIndex].gust);
      }, AUTO_LEVEL_MS);
    }

    function pauseAutoTemporarily() {
      if (!autoOn) return;
      stopAuto();
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        if (autoOn) startAuto();
      }, AUTO_RESUME_MS);
    }

    slider.addEventListener("input", () => {
      pauseAutoTemporarily();
      setGust(Number(slider.value));
    });

    for (const tab of tabs) {
      tab.addEventListener("click", () => {
        pauseAutoTemporarily();
        const level = LEVELS[Number(tab.dataset.levelTab)] || LEVELS[0];
        setGust(level.gust);
      });
    }

    if (playPause) {
      playPause.addEventListener("click", () => {
        autoOn = !autoOn;
        window.clearTimeout(resumeTimer);
        if (autoOn) startAuto();
        else stopAuto();
        setGust(currentGust, { pulse: false });
      });
    }

    setGust(currentGust, { pulse: false });
    startAuto();
  }

  function initNav() {
    const toggle = document.querySelector("[data-menu-toggle]");
    const panel = document.querySelector("[data-mobile-nav]");
    if (!toggle || !panel) return;

    toggle.addEventListener("click", () => {
      const open = panel.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    panel.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        panel.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  function initHeroWeather() {
    const canvas = document.querySelector("[data-hero-canvas]");
    const hero = canvas?.closest(".hero");
    const label = document.querySelector("[data-weather-label]");
    if (!(canvas instanceof HTMLCanvasElement) || !hero) return;

    const modes = [
      { id: "wind", label: "Wind" },
      { id: "lightning", label: "Bliksem" },
      { id: "rain", label: "Regen" },
      { id: "sun", label: "Zon & hitte" },
    ];
    const MODE_MS = 7000;
    const FADE_MS = 900;

    if (reduceMotion) {
      hero.dataset.weather = "wind";
      if (label) label.textContent = modes[0].label;
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let raf = 0;
    let modeIndex = 0;
    let modeStarted = performance.now();
    let particles = [];
    let bolts = [];
    let flash = 0;

    function currentMode() {
      return modes[modeIndex].id;
    }

    function setMode(index, now) {
      modeIndex = index % modes.length;
      modeStarted = now;
      hero.dataset.weather = modes[modeIndex].id;
      if (label) label.textContent = modes[modeIndex].label;
      rebuildParticles();
      bolts = [];
      flash = 0;
    }

    function rebuildParticles() {
      particles = [];
      const mode = currentMode();
      if (mode === "wind") {
        const count = Math.floor(width / 26);
        for (let i = 0; i < count; i += 1) {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            len: 40 + Math.random() * 90,
            speed: 0.4 + Math.random() * 1.2,
            alpha: 0.1 + Math.random() * 0.2,
            amber: Math.random() > 0.8,
          });
        }
        return;
      }
      if (mode === "rain") {
        const count = Math.floor(width / 10);
        for (let i = 0; i < count; i += 1) {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            len: 12 + Math.random() * 18,
            speed: 4 + Math.random() * 5,
            alpha: 0.12 + Math.random() * 0.25,
            drift: -0.6 + Math.random() * -0.8,
          });
        }
        return;
      }
      if (mode === "sun") {
        const count = 18;
        for (let i = 0; i < count; i += 1) {
          particles.push({
            x: width * (0.55 + Math.random() * 0.4),
            y: height * (0.05 + Math.random() * 0.45),
            r: 1.5 + Math.random() * 3.5,
            speed: 0.15 + Math.random() * 0.35,
            alpha: 0.15 + Math.random() * 0.35,
            phase: Math.random() * Math.PI * 2,
          });
        }
        return;
      }
      // lightning: soft residual streaks + occasional bolts
      const count = Math.floor(width / 40);
      for (let i = 0; i < count; i += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          len: 20 + Math.random() * 50,
          speed: 0.15 + Math.random() * 0.4,
          alpha: 0.04 + Math.random() * 0.08,
        });
      }
    }

    function makeBolt() {
      const startX = width * (0.15 + Math.random() * 0.7);
      const segments = [];
      let x = startX;
      let y = 0;
      const steps = 8 + Math.floor(Math.random() * 6);
      for (let i = 0; i < steps; i += 1) {
        const nx = x + (Math.random() - 0.5) * 70;
        const ny = y + height / steps + Math.random() * 20;
        segments.push({ x, y, nx, ny });
        x = nx;
        y = ny;
      }
      return { segments, life: 1, branch: Math.random() > 0.55 };
    }

    function resize() {
      const rect = canvas.parentElement?.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect?.width || window.innerWidth));
      height = Math.max(1, Math.floor(rect?.height || window.innerHeight));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildParticles();
    }

    function drawWind() {
      for (const s of particles) {
        ctx.strokeStyle = s.amber
          ? `rgba(245, 165, 36, ${s.alpha})`
          : `rgba(230, 234, 242, ${s.alpha})`;
        ctx.lineWidth = s.amber ? 2.2 : 1.4;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.quadraticCurveTo(s.x + s.len * 0.45, s.y - 8, s.x + s.len, s.y + 2);
        ctx.stroke();
        s.x += s.speed * 2.4;
        s.y += Math.sin((s.x + s.y) * 0.01) * 0.25;
        if (s.x > width + 40) {
          s.x = -60;
          s.y = Math.random() * height;
        }
      }
    }

    function drawRain() {
      ctx.lineWidth = 1.2;
      for (const d of particles) {
        ctx.strokeStyle = `rgba(180, 210, 255, ${d.alpha})`;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.drift * 4, d.y + d.len);
        ctx.stroke();
        d.x += d.drift;
        d.y += d.speed;
        if (d.y > height + 20) {
          d.y = -20;
          d.x = Math.random() * width;
        }
      }
    }

    function drawSun(now) {
      const cx = width * 0.78;
      const cy = height * 0.22;
      const pulse = 0.55 + Math.sin(now / 900) * 0.08;
      const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.min(width, height) * 0.42);
      glow.addColorStop(0, `rgba(245, 165, 36, ${0.42 * pulse})`);
      glow.addColorStop(0.45, `rgba(245, 165, 36, ${0.12 * pulse})`);
      glow.addColorStop(1, "rgba(245, 165, 36, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(width, height) * 0.42, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 214, 120, ${0.85 * pulse})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.fill();

      for (const p of particles) {
        const twinkle = 0.5 + Math.sin(now / 500 + p.phase) * 0.5;
        ctx.fillStyle = `rgba(255, 220, 140, ${p.alpha * twinkle})`;
        ctx.beginPath();
        ctx.arc(
          p.x + Math.sin(now / 1200 + p.phase) * 8,
          p.y + Math.cos(now / 1400 + p.phase) * 6,
          p.r,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    function drawLightning(now) {
      for (const s of particles) {
        ctx.strokeStyle = `rgba(200, 210, 255, ${s.alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.len, s.y + 4);
        ctx.stroke();
        s.x += s.speed;
        if (s.x > width + 20) {
          s.x = -30;
          s.y = Math.random() * height;
        }
      }

      if (Math.random() < 0.018 && bolts.length < 2) {
        bolts.push(makeBolt());
        flash = 0.35 + Math.random() * 0.35;
      }

      if (flash > 0) {
        ctx.fillStyle = `rgba(220, 230, 255, ${flash * 0.22})`;
        ctx.fillRect(0, 0, width, height);
        flash *= 0.88;
        if (flash < 0.02) flash = 0;
      }

      for (let i = bolts.length - 1; i >= 0; i -= 1) {
        const bolt = bolts[i];
        ctx.strokeStyle = `rgba(255, 255, 255, ${bolt.life})`;
        ctx.lineWidth = 2.4;
        ctx.shadowColor = "rgba(160, 190, 255, 0.9)";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        for (const seg of bolt.segments) {
          ctx.moveTo(seg.x, seg.y);
          ctx.lineTo(seg.nx, seg.ny);
          if (bolt.branch && Math.random() > 0.7) {
            ctx.moveTo(seg.nx, seg.ny);
            ctx.lineTo(seg.nx + 18, seg.ny + 24);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        bolt.life -= 0.06;
        if (bolt.life <= 0) bolts.splice(i, 1);
      }

      // keep linter quiet about unused now in bolt timing
      void now;
    }

    function frame(now) {
      const elapsed = now - modeStarted;
      if (elapsed >= MODE_MS) {
        setMode(modeIndex + 1, now);
      }

      const mode = currentMode();
      // Crossfade at edges via globalAlpha on scene
      let alpha = 1;
      if (elapsed < FADE_MS) alpha = elapsed / FADE_MS;
      else if (elapsed > MODE_MS - FADE_MS) alpha = (MODE_MS - elapsed) / FADE_MS;
      alpha = Math.max(0.15, Math.min(1, alpha));

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (mode === "wind") drawWind();
      else if (mode === "rain") drawRain();
      else if (mode === "sun") drawSun(now);
      else drawLightning(now);
      ctx.restore();

      raf = window.requestAnimationFrame(frame);
    }

    resize();
    setMode(0, performance.now());
    raf = window.requestAnimationFrame(frame);
    window.addEventListener("resize", () => {
      window.cancelAnimationFrame(raf);
      resize();
      raf = window.requestAnimationFrame(frame);
    });
  }

  function initAudience() {
    const tabs = Array.from(document.querySelectorAll("[data-audience-tab]"));
    const panels = Array.from(document.querySelectorAll("[data-audience-panel]"));
    if (!tabs.length || !panels.length) return;

    function activate(id) {
      for (const tab of tabs) {
        const selected = tab.dataset.audienceTab === id;
        tab.setAttribute("aria-selected", selected ? "true" : "false");
        tab.tabIndex = selected ? 0 : -1;
      }
      for (const panel of panels) {
        const active = panel.dataset.audiencePanel === id;
        panel.hidden = !active;
        panel.classList.toggle("is-active", active);
      }
    }

    for (const tab of tabs) {
      tab.addEventListener("click", () => {
        activate(tab.dataset.audienceTab || "lokaal");
      });
      tab.addEventListener("keydown", (event) => {
        const index = tabs.indexOf(tab);
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          const dir = event.key === "ArrowRight" ? 1 : -1;
          const next = tabs[(index + dir + tabs.length) % tabs.length];
          next.focus();
          activate(next.dataset.audienceTab || "lokaal");
        }
      });
    }

    activate("lokaal");
  }

  function initYear() {
    const year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  initYear();
  initNav();
  initLevels();
  initHeroWeather();
  initAudience();
})();
