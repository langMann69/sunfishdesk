(function () {
  const fish = document.getElementById("fish-cursor");
  if (!fish) return;

  // Image base path — set via data-base attribute on #fish-cursor
  // e.g. data-base="assets/img/" or data-base="../assets/img/"
  const imgBase = fish.dataset.base || "assets/img/";

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;

  let currentX = mouseX;
  let currentY = mouseY;
  let lastY = currentY;

  const speed = 0.015;

  let facing = "left";

  window.addEventListener("mousemove", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Returns Y of the waterline (bottom edge of animated ocean waves)
  // On pages without an ocean section this returns 0, so fish swims freely
  function getWaterlineY() {
    const surface = document.querySelector(".ocean-surface-waves");
    if (!surface) return 0;
    return surface.getBoundingClientRect().bottom;
  }

  // ─── JUMP SYSTEM ────────────────────────────────────────────────────────────

  let isJumping = false;
  let jumpStartTime = 0;
  const JUMP_DURATION = 1250;
  const JUMP_HORIZONTAL = 75;
  const JUMP_PEAK_ABOVE = 320;

  let jumpStartX = 0;
  let jumpStartY = 0;
  let jumpDirX = 1;

  function spawnParticle(x, y, vx, vy, size, life, color) {
    const el = document.createElement("div");
    el.style.cssText =
      "position:fixed;border-radius:50%;pointer-events:none;z-index:9998;" +
      "width:" + size + "px;height:" + size + "px;" +
      "background:" + color + ";" +
      "left:" + x + "px;top:" + y + "px;" +
      "transform:translate(-50%,-50%);";
    document.body.appendChild(el);
    const gravity = 580;
    let t0 = null;
    (function step(ts) {
      if (!t0) t0 = ts;
      const s = (ts - t0) / 1000;
      const frac = s / (life / 1000);
      if (frac >= 1) { el.remove(); return; }
      el.style.left = (x + vx * s) + "px";
      el.style.top = (y + vy * s + 0.5 * gravity * s * s) + "px";
      el.style.opacity = 1 - frac;
      requestAnimationFrame(step);
    })();
  }

  function spawnRipple(x, y) {
    const el = document.createElement("div");
    el.style.cssText =
      "position:fixed;pointer-events:none;z-index:9997;" +
      "left:" + x + "px;top:" + y + "px;" +
      "width:8px;height:3px;border-radius:50%;" +
      "border:1.5px solid rgba(140,220,255,0.65);" +
      "transform:translate(-50%,-50%);";
    document.body.appendChild(el);
    let t0 = null;
    (function step(ts) {
      if (!t0) t0 = ts;
      const t = (ts - t0) / 680;
      if (t >= 1) { el.remove(); return; }
      el.style.transform = "translate(-50%,-50%) scale(" + (1 + t * 8) + "," + (1 + t * 2.8) + ")";
      el.style.opacity = (1 - t) * 0.65;
      requestAnimationFrame(step);
    })();
  }

  function spawnSplashDrops(x, y, count, strong) {
    for (let i = 0; i < count; i++) {
      const angle = ((-90 + (Math.random() - 0.5) * (strong ? 130 : 85)) * Math.PI) / 180;
      const spd = strong ? 85 + Math.random() * 105 : 45 + Math.random() * 65;
      const size = strong ? 3 + Math.random() * 5 : 2 + Math.random() * 3.5;
      const life = strong ? 520 + Math.random() * 280 : 340 + Math.random() * 220;
      spawnParticle(x, y, Math.cos(angle) * spd, Math.sin(angle) * spd, size, life,
        "rgba(120,210,255,0.72)");
    }
  }

  function spawnRisingBubbles(x, y, count) {
    for (let i = 0; i < count; i++) {
      setTimeout(function () {
        const bx = x + (Math.random() - 0.5) * 44;
        const by = y + 6 + Math.random() * 18;
        const size = 3 + Math.random() * 4.5;
        const el = document.createElement("div");
        el.style.cssText =
          "position:fixed;border-radius:50%;pointer-events:none;z-index:9997;" +
          "width:" + size + "px;height:" + size + "px;" +
          "border:1px solid rgba(160,230,255,0.55);" +
          "background:rgba(190,245,255,0.12);" +
          "left:" + bx + "px;top:" + by + "px;" +
          "transform:translate(-50%,-50%);";
        document.body.appendChild(el);
        let t0 = null;
        (function step(ts) {
          if (!t0) t0 = ts;
          const t = (ts - t0) / 850;
          if (t >= 1) { el.remove(); return; }
          el.style.top = (by - t * 62) + "px";
          el.style.left = (bx + Math.sin(t * Math.PI * 3) * 5) + "px";
          el.style.opacity = (1 - t) * 0.75;
          requestAnimationFrame(step);
        })();
      }, i * 90);
    }
  }

  function triggerJump() {
    const waterlineY = getWaterlineY();
    isJumping = true;
    jumpStartTime = performance.now();
    jumpStartX = currentX;
    jumpStartY = waterlineY + 12;
    jumpDirX = facing === "right" ? 1 : -1;

    spawnSplashDrops(jumpStartX, waterlineY, 5, false);
    spawnRipple(jumpStartX, waterlineY);
  }

  setInterval(function () {
    if (!isJumping && !isStartled && mouseY < getWaterlineY()) triggerJump();
  }, 5000);

  // ─── STARTLED / DASH SYSTEM ─────────────────────────────────────────────────

  let isStartled = false;
  let startledStartTime = 0;
  const DASH_DURATION = 520;
  const DASH_DISTANCE = 190;

  let dashStartX = 0, dashStartY = 0;
  let dashEndX = 0, dashEndY = 0;
  let dashDirX = 0, dashDirY = 0;

  let dashBubbleTimer = null;

  function spawnDashBubble(x, y) {
    const size = 3 + Math.random() * 4;
    const el = document.createElement("div");
    el.style.cssText =
      "position:fixed;border-radius:50%;pointer-events:none;z-index:9997;" +
      "width:" + size + "px;height:" + size + "px;" +
      "border:1.5px solid rgba(160,230,255,.82);" +
      "background:rgba(190,245,255,.28);" +
      "left:" + x + "px;top:" + y + "px;" +
      "transform:translate(-50%,-50%);";
    document.body.appendChild(el);
    const bx = x + (Math.random() - 0.5) * 10;
    const by = y;
    let t0 = null;
    (function step(ts) {
      if (!t0) t0 = ts;
      const t = (ts - t0) / 620;
      if (t >= 1) { el.remove(); return; }
      el.style.top = (by - t * 38) + "px";
      el.style.left = (bx + Math.sin(t * Math.PI * 2) * 5) + "px";
      el.style.opacity = (1 - t) * 0.88;
      requestAnimationFrame(step);
    })();
  }

  function triggerStartled(cx, cy) {
    if (isJumping || isStartled) return;

    const dist = Math.sqrt(Math.pow(cx - currentX, 2) + Math.pow(cy - currentY, 2));
    if (dist > 38) return;

    const waterlineY = getWaterlineY();

    const dx = currentX - cx;
    const dy = currentY - cy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    dashDirX = dx / len;
    dashDirY = dy / len;

    dashStartX = currentX;
    dashStartY = currentY;
    dashEndX = currentX + dashDirX * DASH_DISTANCE;
    dashEndY = currentY + dashDirY * DASH_DISTANCE;

    if (dashEndY < waterlineY + 18) dashEndY = waterlineY + 18;

    isStartled = true;
    startledStartTime = performance.now();

    if (dashBubbleTimer) clearInterval(dashBubbleTimer);
    dashBubbleTimer = setInterval(function () {
      if (!isStartled) { clearInterval(dashBubbleTimer); dashBubbleTimer = null; return; }
      const bx = currentX - dashDirX * 14 + (Math.random() - 0.5) * 8;
      const by = currentY - dashDirY * 14 + (Math.random() - 0.5) * 8;
      spawnDashBubble(bx, by);
    }, 40);
  }

  // Mouse click
  window.addEventListener("mousedown", function (e) {
    triggerStartled(e.clientX, e.clientY);
  });

  // Touch — fish follows finger and reacts to taps on itself
  window.addEventListener("touchmove", function (e) {
    const t = e.touches[0];
    mouseX = t.clientX;
    mouseY = t.clientY;
  }, { passive: true });

  window.addEventListener("touchstart", function (e) {
    const t = e.touches[0];
    mouseX = t.clientX;
    mouseY = t.clientY;
    triggerStartled(t.clientX, t.clientY);
  }, { passive: true });

  // ─── ANIMATE ────────────────────────────────────────────────────────────────

  function animate() {
    const waterlineY = getWaterlineY();

    // ── Jump override ──────────────────────────────────────────────────────────
    if (isJumping) {
      const elapsed = performance.now() - jumpStartTime;
      const t = Math.min(elapsed / JUMP_DURATION, 1);

      const peakY = waterlineY - JUMP_PEAK_ABOVE;
      const arcFactor = 4 * t * (1 - t);
      const jumpX = jumpStartX + jumpDirX * JUMP_HORIZONTAL * t;
      const jumpY = jumpStartY + (peakY - jumpStartY) * arcFactor;

      const dydt = (peakY - jumpStartY) * 4 * (1 - 2 * t);
      const dxdt = jumpDirX * JUMP_HORIZONTAL;
      let jumpTilt = Math.atan2(dydt, Math.abs(dxdt)) * (180 / Math.PI);
      jumpTilt = Math.max(-50, Math.min(50, jumpTilt));
      if (jumpDirX < 0) jumpTilt = -jumpTilt;

      const wantFacing = jumpDirX > 0 ? "right" : "left";
      if (facing !== wantFacing) {
        facing = wantFacing;
        fish.style.backgroundImage = wantFacing === "right"
          ? "url('" + imgBase + "cursor_right.png')"
          : "url('" + imgBase + "cursor.png')";
      }

      const offsetX = -24;
      const offsetY = -18;
      fish.style.transform =
        "translate(" + (jumpX + offsetX) + "px," + (jumpY + offsetY) + "px)" +
        " rotate(" + jumpTilt + "deg)";

      currentX = jumpX;
      currentY = jumpY;

      if (t >= 1) {
        isJumping = false;
        spawnSplashDrops(jumpX, waterlineY, 8, true);
        spawnRipple(jumpX, waterlineY);
        spawnRisingBubbles(jumpX, waterlineY, 5);
      }

      lastY = currentY;
      requestAnimationFrame(animate);
      return;
    }

    // ── Startled dash override ─────────────────────────────────────────────────
    if (isStartled) {
      const elapsed = performance.now() - startledStartTime;
      const t = Math.min(elapsed / DASH_DURATION, 1);

      const ease = 1 - Math.pow(1 - t, 3);

      currentX = dashStartX + (dashEndX - dashStartX) * ease;
      currentY = dashStartY + (dashEndY - dashStartY) * ease;

      if (currentY < waterlineY + 18) currentY = waterlineY + 18;

      const wantFacing = dashDirX >= 0 ? "right" : "left";
      if (facing !== wantFacing) {
        facing = wantFacing;
        fish.style.backgroundImage = wantFacing === "right"
          ? "url('" + imgBase + "cursor_right.png')"
          : "url('" + imgBase + "cursor.png')";
      }

      let dashTilt = Math.atan2(dashDirY, Math.abs(dashDirX)) * (180 / Math.PI) * 1.4;
      dashTilt = Math.max(-36, Math.min(36, dashTilt));
      if (wantFacing === "left") dashTilt = -dashTilt;

      const offsetX = -24;
      const offsetY = -18;
      fish.style.transform =
        "translate(" + (currentX + offsetX) + "px," + (currentY + offsetY) + "px)" +
        " rotate(" + dashTilt + "deg)";

      if (t >= 1) {
        isStartled = false;
        if (dashBubbleTimer) { clearInterval(dashBubbleTimer); dashBubbleTimer = null; }
      }

      lastY = currentY;
      requestAnimationFrame(animate);
      return;
    }

    // ── Normal swim ────────────────────────────────────────────────────────────

    const cursorUnderwater = mouseY > waterlineY;
    const minCurrentY = waterlineY - 5;

    let targetX, targetY;
    if (cursorUnderwater) {
      targetX = mouseX;
      targetY = mouseY;
    } else {
      targetX = mouseX;
      targetY = waterlineY + 20;
    }

    currentX += (targetX - currentX) * speed;
    currentY += (targetY - currentY) * speed;

    if (currentY < minCurrentY) currentY = minCurrentY;

    const swimY = Math.sin(Date.now() * 0.006) * 14;
    const swimX = Math.cos(Date.now() * 0.004) * 4;

    if (currentX < targetX && facing !== "right") {
      fish.style.backgroundImage = "url('" + imgBase + "cursor_right.png')";
      facing = "right";
    }
    if (currentX >= targetX && facing !== "left") {
      fish.style.backgroundImage = "url('" + imgBase + "cursor.png')";
      facing = "left";
    }

    const dxToCursor = targetX - currentX;
    const dyToCursor = targetY - currentY;
    let tilt = Math.atan2(dyToCursor, Math.abs(dxToCursor)) * (180 / Math.PI);
    if (tilt > 22) tilt = 22;
    if (tilt < -22) tilt = -22;
    if (facing === "left") tilt = -tilt;

    const offsetX = -24;
    const offsetY = -18;

    fish.style.transform =
      "translate(" + (currentX + offsetX + swimX) + "px," +
      (currentY + offsetY + swimY) + "px) rotate(" + tilt + "deg)";

    lastY = currentY;
    requestAnimationFrame(animate);
  }

  animate();
})();
