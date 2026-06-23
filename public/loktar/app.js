// app.js - Loktar Midnight UI controller

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initial State
  let currentClassId = "demon-hunter";
  let currentSpecName = "Havoc";
  let soundMuted = false;

  // 2. Sound Effects System (Web Audio API Synthesizer)
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playClickSound(soundType = "click") {
    if (soundMuted) return;
    try {
      initAudio();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;

      if (soundType === "click") {
        // Synthesizing a crisp WoW-like wood-metal button click
        // Primary high pulse
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(1400, now);
        osc1.frequency.exponentialRampToValueAtTime(100, now + 0.04);
        
        gain1.gain.setValueAtTime(0.04, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.05);

        // Secondary mid-frequency thud
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(220, now);
        osc2.frequency.exponentialRampToValueAtTime(80, now + 0.06);

        gain2.gain.setValueAtTime(0.08, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now);
        osc2.stop(now + 0.07);

      } else if (soundType === "hover") {
        // Very subtle soft scroll tick
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(600, now + 0.005);
        
        gain.gain.setValueAtTime(0.015, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.015);

      } else if (soundType === "success") {
        // Classic loot/quest item click
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.15);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      console.warn("AudioContext failed to initialize: ", e);
    }
  }

  // Bind sound toggle
  const soundToggle = document.getElementById("sound-toggle");
  soundToggle.addEventListener("click", () => {
    soundMuted = !soundMuted;
    if (soundMuted) {
      soundToggle.classList.add("muted");
      soundToggle.querySelector("span").innerText = "SOUND: OFF";
    } else {
      soundToggle.classList.remove("muted");
      soundToggle.querySelector("span").innerText = "SOUND: ON";
      playClickSound("success");
    }
  });

  // 3. Fel Particle Animation Background
  const canvas = document.getElementById("particle-canvas");
  const ctx = canvas.getContext("2d");
  let particles = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = 360; // Confine particle sparks to header area
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  class FelParticle {
    constructor() {
      this.reset();
      this.y = Math.random() * canvas.height;
    }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = canvas.height + 20;
      this.size = Math.random() * 3 + 1;
      this.speedY = -(Math.random() * 1.2 + 0.4);
      this.speedX = Math.random() * 0.8 - 0.4;
      this.alpha = Math.random() * 0.5 + 0.3;
      this.decay = Math.random() * 0.005 + 0.002;
    }
    update() {
      this.y += this.speedY;
      this.x += this.speedX;
      this.alpha -= this.decay;
      if (this.alpha <= 0 || this.y < 0) {
        this.reset();
      }
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.shadowBlur = this.size * 2;
      ctx.shadowColor = "#39ff14";
      ctx.fillStyle = `rgba(0, 255, 102, ${this.alpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Populate particles
  const particleCount = 45;
  for (let i = 0; i < particleCount; i++) {
    particles.push(new FelParticle());
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animateParticles);
  }
  animateParticles();

  // 4. WoW-Style Tooltip Logic
  const tooltip = document.getElementById("wow-tooltip");
  const toolTitle = document.getElementById("tooltip-title");
  const toolIlvl = document.getElementById("tooltip-ilvl");
  const toolSlot = document.getElementById("tooltip-slot");
  const toolType = document.getElementById("tooltip-type");
  const toolStats = document.getElementById("tooltip-stats");
  const toolEquip = document.getElementById("tooltip-equip");
  const toolSource = document.getElementById("tooltip-source");
  const slotModalBackdrop = document.getElementById("slot-modal-backdrop");
  const slotModalTitle = document.getElementById("slot-modal-title");
  const slotModalSource = document.getElementById("slot-modal-source");
  const slotModalList = document.getElementById("slot-modal-list");
  const slotModalClose = document.getElementById("slot-modal-close");

  function showTooltip(e, data) {
    if (!data) return;

    toolTitle.textContent = data.name || "Unknown Item";
    toolTitle.className = "tooltip-header " + (data.quality || "common");

    if (data.ilvl) {
      toolIlvl.textContent = `Item Level ${data.ilvl}`;
      toolIlvl.style.display = "block";
    } else {
      toolIlvl.style.display = "none";
    }

    if (data.slot) {
      toolSlot.textContent = data.slot;
      toolSlot.style.display = "inline";
    } else {
      toolSlot.style.display = "none";
    }

    if (data.type) {
      toolType.textContent = data.type;
      toolType.style.display = "inline";
    } else {
      toolType.style.display = "none";
    }

    if (data.stats) {
      toolStats.innerHTML = data.stats.replace(/\n/g, "<br>");
      toolStats.style.display = "block";
    } else {
      toolStats.style.display = "none";
    }

    if (data.description) {
      const lines = data.description.split(/\n+/).filter(Boolean);
      toolEquip.innerHTML = lines.map(line => line.startsWith("(") ? line : `Equip: ${line}`).join("<br>");
      toolEquip.style.display = "block";
    } else {
      toolEquip.style.display = "none";
    }

    if (data.dropInfo) {
      const parts = [data.dropInfo.locationType, data.dropInfo.instance, data.dropInfo.boss].filter(Boolean);
      let sourceText = parts.join(" · ");
      if (data.dropInfo.sourceMethod) sourceText += ` · ${data.dropInfo.sourceMethod}`;
      if (data.dropInfo.alternative) sourceText += ` · Alt: ${data.dropInfo.alternative}`;
      toolSource.textContent = `Source: ${sourceText}`;
      toolSource.style.display = "block";
    } else if (data.source) {
      toolSource.textContent = `Source: ${data.source}`;
      toolSource.style.display = "block";
    } else {
      toolSource.style.display = "none";
    }

    tooltip.style.display = "block";
    positionTooltip(e);
  }

  function positionTooltip(e) {
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    
    let x = e.pageX + 15;
    let y = e.pageY + 15;

    // Check boundaries (prevent clipping off-screen)
    if (x + tooltipWidth > window.innerWidth) {
      x = e.pageX - tooltipWidth - 15;
    }
    if (y + tooltipHeight > window.scrollY + window.innerHeight) {
      y = e.pageY - tooltipHeight - 15;
    }

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  function hideTooltip() {
    tooltip.style.display = "none";
  }

  document.addEventListener("mousemove", (e) => {
    if (tooltip.style.display === "block") {
      positionTooltip(e);
    }
  });

  function openSlotModal(slotKey, specData) {
    const slotChoices = specData.slotChoices?.[slotKey];
    if (!slotChoices) return;

    slotModalTitle.textContent = `${specData.summary?.title || currentSpecName} · ${slotChoices.slot}`;
    slotModalSource.textContent = slotChoices.source || specData.summary?.source || "Loktar static profile";
    slotModalList.innerHTML = "";

    slotChoices.items.forEach(item => {
      const row = document.createElement("div");
      row.className = "slot-choice-item";
      const sourceParts = [];
      if (item.dropInfo?.locationType) sourceParts.push(item.dropInfo.locationType);
      if (item.dropInfo?.instance) sourceParts.push(item.dropInfo.instance);
      if (item.dropInfo?.boss) sourceParts.push(item.dropInfo.boss);
      if (item.dropInfo?.sourceMethod) sourceParts.push(item.dropInfo.sourceMethod);
      if (item.dropInfo?.alternative) sourceParts.push(`Alt: ${item.dropInfo.alternative}`);
      const sourceLine = sourceParts.join(" · ") || slotChoices.source || specData.summary?.source || "Loktar static profile";
      const statsHtml = item.stats ? item.stats.replace(/\n/g, "<br>") : "";
      const descHtml = item.description ? item.description.replace(/\n/g, "<br>") : "";
      row.innerHTML = `
        <div class="slot-choice-rank">#${item.rank}</div>
        <div class="slot-choice-icon"><img src="https://wow.zamimg.com/images/wow/icons/large/${item.icon}.jpg" alt="${item.name}"></div>
        <div>
          <div class="slot-choice-name">${item.name}</div>
          <div class="slot-choice-meta">${item.tag || "Item"} · ilvl ${item.ilvl || "?"} · ${item.type || ""}</div>
          ${statsHtml ? `<div class="slot-choice-stats">${statsHtml}</div>` : ""}
          ${descHtml ? `<div class="slot-choice-desc">${descHtml}</div>` : ""}
          <div class="slot-choice-note">${sourceLine}</div>
        </div>
        <div class="slot-choice-count">${item.count}/50</div>
      `;
      slotModalList.appendChild(row);
    });

    document.body.classList.add("modal-open");
    slotModalBackdrop.classList.add("open");
    slotModalBackdrop.setAttribute("aria-hidden", "false");
  }

  function closeSlotModal() {
    document.body.classList.remove("modal-open");
    slotModalBackdrop.classList.remove("open");
    slotModalBackdrop.setAttribute("aria-hidden", "true");
    hideTooltip();
  }

  slotModalClose.addEventListener("click", closeSlotModal);
  slotModalBackdrop.addEventListener("click", (e) => {
    if (e.target === slotModalBackdrop) closeSlotModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSlotModal();
  });

  // Helper to determine item slot types dynamically
  function inferSlotType(slot, classId) {
    if (["head", "shoulders", "chest", "legs", "hands", "waist", "feet"].includes(slot)) {
      if (["death-knight", "paladin", "warrior"].includes(classId)) return "Plate";
      if (["demon-hunter", "rogue", "druid", "monk"].includes(classId)) return "Leather";
      if (["shaman", "hunter", "evoker"].includes(classId)) return "Mail";
      return "Cloth";
    }
    if (["ring1", "ring2"].includes(slot)) return "Finger";
    if (["neck"].includes(slot)) return "Neck";
    if (["back"].includes(slot)) return "Back";
    if (["trinket1", "trinket2"].includes(slot)) return "Trinket";
    if (slot === "mainhand") return "One-Hand";
    if (slot === "offhand") return "Shield / Offhand";
    return "";
  }

  // 5. Render App Dashboard Details
  function renderDashboard() {
    const specData = getSpecData(currentClassId, currentSpecName);
    const activeClass = wowClasses.find(c => c.id === currentClassId);

    // Apply class colors globally
    document.documentElement.style.setProperty('--class-color', activeClass.color);
    document.documentElement.style.setProperty('--class-color-glow', activeClass.color + "2b");
    document.documentElement.style.setProperty('--class-btn-glow', activeClass.color + "4f");

    // Headings
    document.getElementById("doll-spec-name").innerText = specData.summary?.title || currentSpecName;
    document.getElementById("doll-class-name").innerText = activeClass.name;
    document.getElementById("doll-class-name").style.color = activeClass.color;

    // Detect Role
    let roleText = "DAMAGE";
    if (currentSpecName.includes("Protection") || currentSpecName === "Blood" || currentSpecName === "Guardian" || currentSpecName === "Brewmaster" || currentSpecName === "Vengeance") {
      roleText = "TANK";
    } else if (currentSpecName.includes("Restoration") || currentSpecName === "Holy" || currentSpecName === "Preservation" || currentSpecName === "Mistweaver" || currentSpecName === "Discipline") {
      roleText = "HEALER";
    }
    if (specData.summary?.role) {
      const normalizedRole = specData.summary.role.toUpperCase();
      if (normalizedRole.includes("TANK")) roleText = "TANK";
      else if (normalizedRole.includes("HEAL")) roleText = "HEALER";
      else roleText = specData.summary.role.toUpperCase();
    }
    document.getElementById("doll-role-text").innerText = roleText;

    // A. Stats priority
    const statsContainer = document.getElementById("stats-container");
    statsContainer.innerHTML = "";

    const maxStatRating = Math.max(...specData.stats.map(stat => stat.rating || 0), 1);

    specData.stats.forEach(stat => {
      const statEl = document.createElement("div");
      statEl.className = "stat-item";
      statEl.innerHTML = `
        <div class="stat-info">
          <div class="stat-name-label">
            <div class="item-icon-box" style="width: 16px; height: 16px; border: none;">
              <img src="https://wow.zamimg.com/images/wow/icons/large/${stat.icon}.jpg" alt="${stat.name}">
            </div>
            <span>${stat.name}</span>
          </div>
          <span>+${stat.rating ?? 0} · ${stat.value}%</span>
        </div>
        <div class="stat-bar-bg">
          <div class="stat-bar-fill" style="width: 0%;"></div>
        </div>
      `;
      statEl.addEventListener("mouseenter", (e) => {
        showTooltip(e, {
          name: `${stat.name} Priority`,
          quality: "rare",
          slot: "Stat Weight",
          description: `${specData.summary?.statsNote || "Live stat priority."} Current value shown: +${stat.rating ?? 0} rating, ${stat.value}%.`,
          source: specData.summary?.source || "Loktar static profile"
        });
      });
      statEl.addEventListener("mouseleave", hideTooltip);
      statsContainer.appendChild(statEl);

      // Trigger width growth animation based on actual rating value, not percentage
      setTimeout(() => {
        const fillBar = statEl.querySelector(".stat-bar-fill");
        if (fillBar) fillBar.style.width = `${Math.max(2, ((stat.rating || 0) / maxStatRating) * 100)}%`;
      }, 50);
    });

    // B. Consumables
    const consumablesContainer = document.getElementById("consumables-container");
    consumablesContainer.innerHTML = "";
    specData.consumables.forEach(c => {
      const consEl = document.createElement("div");
      consEl.className = "consumable-item";
      consEl.innerHTML = `
        <div class="item-icon-box">
          <img src="https://wow.zamimg.com/images/wow/icons/large/${c.icon}.jpg" alt="${c.name}">
        </div>
        <div class="item-details">
          <div class="item-name">${c.name}</div>
          <div class="item-usage">${c.category}</div>
        </div>
        <div class="usage-badge">${c.percentage}%</div>
      `;
      
      consEl.addEventListener("mouseenter", (e) => {
        playClickSound("hover");
        showTooltip(e, {
          name: c.name,
          quality: "epic",
          slot: c.category,
          description: c.description,
          source: specData.summary?.gearNote || "Mythic+ Consumables"
        });
      });
      consEl.addEventListener("mouseleave", hideTooltip);
      consumablesContainer.appendChild(consEl);
    });

    // C. Equipment Paper Doll Slots
    const allSlots = [
      "head", "neck", "shoulders", "back", "chest", "wrists",
      "hands", "waist", "legs", "feet", "ring1", "ring2", "trinket1", "trinket2",
      "mainhand", "offhand"
    ];

    allSlots.forEach(slotKey => {
      const slotEl = document.getElementById(`slot-${slotKey}`);
      if (!slotEl) return;

      const itemData = specData.items[slotKey];

      // Remove existing event listeners by replacing node
      const newSlotEl = slotEl.cloneNode(true);
      slotEl.parentNode.replaceChild(newSlotEl, slotEl);

      if (itemData) {
        newSlotEl.style.display = "flex";
        newSlotEl.className = `equip-slot quality-${itemData.quality}`;
        newSlotEl.innerHTML = `
          <img src="https://wow.zamimg.com/images/wow/icons/large/${itemData.icon}.jpg" alt="${itemData.name}">
          <div class="slot-percent">${itemData.percentage}%</div>
        `;

        newSlotEl.addEventListener("mouseenter", (e) => {
          playClickSound("hover");
          showTooltip(e, {
            name: itemData.name,
            quality: itemData.quality,
            ilvl: itemData.ilvl,
            slot: slotKey.toUpperCase().replace(/\d/g, ""),
            type: itemData.type !== undefined ? itemData.type : inferSlotType(slotKey, currentClassId),
            stats: itemData.stats,
            description: itemData.description,
            dropInfo: itemData.dropInfo,
            source: itemData.source
          });
        });
        newSlotEl.addEventListener("mouseleave", hideTooltip);

        newSlotEl.addEventListener("click", () => {
          playClickSound("click");
          if (specData.slotChoices?.[slotKey]) {
            openSlotModal(slotKey, specData);
          }
        });
      } else {
        // No item in slot (e.g. 2-handers don't have offhand)
        if (slotKey === "offhand") {
          newSlotEl.style.display = "none";
        } else {
          newSlotEl.className = "equip-slot";
          newSlotEl.innerHTML = `<span class="slot-placeholder">${slotKey}</span>`;
        }
      }
    });

    // D. Gems & Embellishments
    const gemsContainer = document.getElementById("gems-embellishments-container");
    gemsContainer.innerHTML = "";
    
    // Merge Gems and Embellishments for single card summary
    const extrasList = [
      ...specData.gems.map(g => ({ ...g, type: "Gem" })),
      ...specData.embellishments.map(em => ({ ...em, type: "Embellishment" }))
    ];

    extrasList.forEach(gem => {
      const row = document.createElement("div");
      row.className = "detail-row";
      row.innerHTML = `
        <div class="detail-left">
          <div class="item-icon-box" style="width: 24px; height: 24px;">
            <img src="https://wow.zamimg.com/images/wow/icons/large/${gem.icon}.jpg" alt="${gem.name}">
          </div>
          <div>
            <div class="detail-title">${gem.name}</div>
            <div class="detail-subtitle">${gem.type}</div>
          </div>
        </div>
        <div class="usage-badge">${gem.percentage}%</div>
      `;

      row.addEventListener("mouseenter", (e) => {
        playClickSound("hover");
        showTooltip(e, {
          name: gem.name,
          quality: gem.type === "Gem" ? "rare" : "epic",
          slot: gem.type,
          description: gem.type === "Gem" ? "Socket into equipped prismatic sockets." : "Armor Embellishment effect.",
          source: specData.summary?.gearNote || `Best in Slot ${gem.type}`
        });
      });
      row.addEventListener("mouseleave", hideTooltip);
      gemsContainer.appendChild(row);
    });

    // E. Enchants Summary
    const enchantsContainer = document.getElementById("enchants-container");
    enchantsContainer.innerHTML = "";
    specData.enchants.forEach(enc => {
      const row = document.createElement("div");
      row.className = "detail-row";
      row.innerHTML = `
        <div class="detail-left">
          <div class="item-icon-box" style="width: 24px; height: 24px;">
            <img src="https://wow.zamimg.com/images/wow/icons/large/${enc.icon}.jpg" alt="${enc.name}">
          </div>
          <div>
            <div class="detail-title">${enc.name}</div>
            <div class="detail-subtitle">${enc.slot} Enchant</div>
          </div>
        </div>
        <div class="usage-badge">${enc.percentage}%</div>
      `;

      row.addEventListener("mouseenter", (e) => {
        playClickSound("hover");
        showTooltip(e, {
          name: enc.name,
          quality: "common",
          slot: `${enc.slot} Enchant`,
          description: `Permanently enchant your ${enc.slot} item.`,
          source: specData.summary?.gearNote || "Enchanting"
        });
      });
      row.addEventListener("mouseleave", hideTooltip);
      enchantsContainer.appendChild(row);
    });

    // F. Talents Section
    document.getElementById("talent-string-display").innerText = specData.talents.code;
    const talentList = document.getElementById("talent-list-container");
    talentList.innerHTML = "";
    specData.talents.list.forEach(t => {
      const row = document.createElement("div");
      row.className = "talent-row";
      row.innerHTML = `
        <img class="talent-icon" src="https://wow.zamimg.com/images/wow/icons/large/${t.icon}.jpg" alt="${t.name}">
        <div class="talent-info">
          <div class="talent-name">${t.name}</div>
          <div class="talent-desc">${t.desc}</div>
        </div>
      `;
      talentList.appendChild(row);
    });

    // Bind copy talents button
    const copyBtn = document.getElementById("copy-talent-btn");
    copyBtn.innerText = "COPY";
    copyBtn.addEventListener("click", () => {
      playClickSound("success");
      navigator.clipboard.writeText(specData.talents.code).then(() => {
        copyBtn.innerText = "COPIED!";
        setTimeout(() => {
          copyBtn.innerText = "COPY";
        }, 1500);
      });
    });
  }

  // 6. Init Buttons and Navigation Selector Event Listeners
  function renderClassMenu() {
    const classSelectors = document.getElementById("class-selectors");
    classSelectors.innerHTML = "";

    wowClasses.forEach(c => {
      const btn = document.createElement("button");
      btn.className = `class-btn ${c.id === currentClassId ? 'active' : ''}`;
      // Inject CSS variables custom to this class button
      btn.style.setProperty('--class-btn-color', c.color);
      btn.style.setProperty('--class-btn-glow', c.color + "25");

      btn.innerHTML = `
        <div class="class-icon-circle"></div>
        <span>${c.name}</span>
      `;

      btn.addEventListener("click", () => {
        playClickSound("click");
        currentClassId = c.id;
        currentSpecName = c.specs[0]; // Set default spec to the first spec of class
        renderClassMenu();
        renderSpecMenu();
        renderDashboard();
      });

      btn.addEventListener("mouseenter", () => {
        playClickSound("hover");
      });

      classSelectors.appendChild(btn);
    });
  }

  function renderSpecMenu() {
    const specSelectors = document.getElementById("spec-selectors");
    specSelectors.innerHTML = "";

    const activeClass = wowClasses.find(c => c.id === currentClassId);
    activeClass.specs.forEach(spec => {
      const btn = document.createElement("button");
      btn.className = `spec-btn ${spec === currentSpecName ? 'active' : ''}`;
      btn.innerText = spec;

      btn.addEventListener("click", () => {
        playClickSound("click");
        currentSpecName = spec;
        renderSpecMenu();
        renderDashboard();
      });

      btn.addEventListener("mouseenter", () => {
        playClickSound("hover");
      });

      specSelectors.appendChild(btn);
    });
  }

  // Start Application
  renderClassMenu();
  renderSpecMenu();
  renderDashboard();
});
