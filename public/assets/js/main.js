(() => {
  const LEVELS = [
    {
      level: 0,
      name: "Groen",
      band: "< 60% van de grenswaarde",
      min: 0,
      max: 59,
      measure:
        "Alles rustig. Blijf meten en houd de commandopost op de hoogte. Geen extra maatregelen nodig.",
      bg: "#00B050",
      fg: "#FFFFFF",
    },
    {
      level: 1,
      name: "Geel",
      band: "60–79% van de grenswaarde",
      min: 60,
      max: 79,
      measure:
        "Opletten. Informeer leveranciers en teams. Check losse onderdelen en bereid de volgende maatregelen voor.",
      bg: "#FFFF00",
      fg: "#0B1B34",
    },
    {
      level: 2,
      name: "Oranje",
      band: "80–99% van de grenswaarde",
      min: 80,
      max: 99,
      measure:
        "Maatregelen uitvoeren. Beperk gebruik van het bouwsel, zet ballast of afspanmaatregelen in, en communiceer breed.",
      bg: "#FFC000",
      fg: "#0B1B34",
    },
    {
      level: 3,
      name: "Rood",
      band: "≥ 100% van de grenswaarde",
      min: 100,
      max: 140,
      measure:
        "Actie. Bouwsel stilleggen of ontruimen volgens het protocol. Alles vastleggen in het logboek.",
      bg: "#FF0000",
      fg: "#FFFFFF",
    },
  ];

  const BOUWSELS = [
    { name: "Mainstage dak", offset: 8 },
    { name: "VIP-tent", offset: -12 },
    { name: "Cateringframe", offset: 3 },
    { name: "Ingangspoort", offset: -5 },
  ];

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function levelFromPercent(pct) {
    const value = Math.max(0, Math.min(140, Number(pct)));
    if (value >= 100) return LEVELS[3];
    if (value >= 80) return LEVELS[2];
    if (value >= 60) return LEVELS[1];
    return LEVELS[0];
  }

  function midOf(level) {
    return Math.round((level.min + Math.min(level.max, 120)) / 2);
  }

  function initLevels() {
    const stage = document.querySelector("[data-level-stage]");
    const badge = document.querySelector("[data-level-badge]");
    const nameEl = document.querySelector("[data-level-name]");
    const bandEl = document.querySelector("[data-level-band]");
    const measureEl = document.querySelector("[data-level-measure]");
    const meter = document.querySelector("[data-level-meter]");
    const slider = document.querySelector("[data-wind-slider]");
    const sliderValue = document.querySelector("[data-wind-value]");
    const tabs = Array.from(document.querySelectorAll("[data-level-tab]"));
    const bouwselList = document.querySelector("[data-bouwsel-list]");

    if (!stage || !slider || !badge || !nameEl || !bandEl || !measureEl || !meter) {
      return;
    }

    let current = Number(slider.value) || 45;

    function renderBouwsels(basePct, level) {
      if (!bouwselList) return;
      bouwselList.innerHTML = "";
      for (const item of BOUWSELS) {
        const pct = Math.max(0, Math.min(140, basePct + item.offset));
        const local = levelFromPercent(pct);
        const li = document.createElement("li");
        li.innerHTML = `
          <span class="bouwsel-dot" style="--dot:${local.bg}" aria-hidden="true"></span>
          <span class="bouwsel-name">${item.name}</span>
          <span class="bouwsel-pct">${pct}% · S${local.level}</span>
        `;
        bouwselList.appendChild(li);
      }
      // Keep a live region note for SR users when list updates with level
      bouwselList.setAttribute("aria-label", `Voorbeeld bouwsels bij S${level.level}`);
    }

    function setLevel(pct, { fromTab = false } = {}) {
      current = Math.max(0, Math.min(140, Math.round(pct)));
      const level = levelFromPercent(current);

      slider.value = String(current);
      if (sliderValue) sliderValue.textContent = `${current}%`;

      stage.dataset.level = String(level.level);
      badge.textContent = `S${level.level}`;
      badge.style.background = level.bg;
      badge.style.color = level.fg;
      if (!reduceMotion) {
        badge.classList.remove("is-pulse");
        // Force reflow so the pulse can replay.
        void badge.offsetWidth;
        badge.classList.add("is-pulse");
      }
      nameEl.textContent = level.name;
      bandEl.textContent = level.band;
      measureEl.textContent = level.measure;
      meter.style.width = `${Math.min(100, (current / 120) * 100)}%`;
      meter.parentElement?.setAttribute(
        "aria-valuenow",
        String(Math.min(100, Math.round((current / 120) * 100))),
      );

      for (const tab of tabs) {
        const active = Number(tab.dataset.levelTab) === level.level;
        tab.setAttribute("aria-pressed", active ? "true" : "false");
      }

      renderBouwsels(current, level);

      if (!fromTab) {
        stage.setAttribute("aria-live", "polite");
      }
    }

    slider.addEventListener("input", () => {
      setLevel(Number(slider.value));
    });

    for (const tab of tabs) {
      tab.addEventListener("click", () => {
        const level = LEVELS[Number(tab.dataset.levelTab)] || LEVELS[0];
        setLevel(midOf(level), { fromTab: true });
      });
    }

    setLevel(current);
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

  function initHeroWind() {
    const canvas = document.querySelector("[data-hero-canvas]");
    if (!(canvas instanceof HTMLCanvasElement) || reduceMotion) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const streaks = [];
    let width = 0;
    let height = 0;
    let raf = 0;

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

      const count = Math.floor(width / 28);
      streaks.length = 0;
      for (let i = 0; i < count; i += 1) {
        streaks.push({
          x: Math.random() * width,
          y: Math.random() * height,
          len: 40 + Math.random() * 90,
          speed: 0.35 + Math.random() * 1.1,
          alpha: 0.08 + Math.random() * 0.18,
          amber: Math.random() > 0.82,
        });
      }
    }

    function frame() {
      ctx.clearRect(0, 0, width, height);
      for (const s of streaks) {
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
      raf = window.requestAnimationFrame(frame);
    }

    resize();
    frame();
    window.addEventListener("resize", () => {
      window.cancelAnimationFrame(raf);
      resize();
      frame();
    });
  }

  function initYear() {
    const year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  initYear();
  initNav();
  initLevels();
  initHeroWind();
})();
