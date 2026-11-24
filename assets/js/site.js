// Visionneuse de CV (<dialog>), bouton « Copier » et formulaire de contact.
// Aucun stockage local, aucun cookie.
(() => {
  /* ---------- visionneuse de CV ---------- */
  const dlg = document.getElementById("cv");
  if (dlg && typeof dlg.showModal === "function") {
    document.querySelectorAll("[data-cv-open]").forEach((b) =>
      b.addEventListener("click", () => dlg.showModal())
    );
    dlg.querySelectorAll("[data-cv-close]").forEach((b) =>
      b.addEventListener("click", () => dlg.close())
    );
    // clic sur le fond (hors contenu) = fermer
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });
  } else {
    // navigateur sans <dialog> : ouvrir le PDF directement
    document.querySelectorAll("[data-cv-open]").forEach((b) =>
      b.addEventListener("click", () => window.open("assets/cv.pdf", "_blank", "noopener"))
    );
  }

  /* ---------- bouton « Copier » ---------- */
  document.querySelectorAll("[data-copy]").forEach((b) => {
    const label = b.textContent;
    b.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        b.textContent = "Copié ✓";
      } catch {
        b.textContent = "Sélectionnez le texte";
      }
      setTimeout(() => (b.textContent = label), 1800);
    });
  });



  /* ---------- panneaux détaillés (centres d'intérêt) ---------- */
  const panels = [...document.querySelectorAll("dialog.panel")];
  const show = (d) => {
    if (typeof d.showModal !== "function") return;
    d.showModal();
    const body = d.querySelector(".pn-body");
    if (body) body.scrollTop = 0;
    d.querySelectorAll(".tile").forEach((tile, i) => tile.style.setProperty("--i", i));
  };
  document.querySelectorAll("[data-open]").forEach((b) =>
    b.addEventListener("click", () => show(document.getElementById(b.dataset.open)))
  );
  panels.forEach((d, i) => {
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
    d.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => d.close()));
    d.querySelectorAll("[data-step]").forEach((b) =>
      b.addEventListener("click", () => {
        const next = panels[(i + Number(b.dataset.step) + panels.length) % panels.length];
        d.close();
        show(next);
      })
    );
  });


  /* ---------- carrousel de projets : boutons, clavier, glisser à la souris ---------- */
  const car = document.querySelector("[data-carousel]");
  if (car) {
    const items = [...car.children];
    const counter = document.querySelector("[data-car-i]");
    const step = () => (items[1] ? items[1].offsetLeft - items[0].offsetLeft : car.clientWidth);
    const page = () => Math.max(1, Math.floor(car.clientWidth / step()));
    const go = (dir, n) => car.scrollBy({ left: dir * step() * n, behavior: "smooth" });
    document.querySelectorAll("[data-car]").forEach((b) =>
      b.addEventListener("click", () => go(Number(b.dataset.car), page()))
    );
    car.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(1, 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1, 1); }
    });
    const update = () => {
      const i = Math.round(car.scrollLeft / step());
      if (counter) counter.textContent = String(Math.min(items.length, i + 1)).padStart(2, "0");
    };
    car.addEventListener("scroll", update, { passive: true });
    // boutons et compteur seulement si les cartes dépassent de l'écran
    const bar = document.querySelector(".car-bar");
    const fit = () => { if (bar) bar.hidden = car.scrollWidth <= car.clientWidth + 2; };
    fit(); window.addEventListener("resize", fit);
    // glisser à la souris (le tactile défile déjà nativement)
    let down = false, moved = false, sx = 0, sl = 0;
    car.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = false; sx = e.clientX; sl = car.scrollLeft;
    });
    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 6) { moved = true; car.classList.add("drag"); }
      if (moved) car.scrollLeft = sl - dx;
    });
    window.addEventListener("pointerup", () => {
      if (!down) return;
      down = false;
      car.classList.remove("drag");
    });
    // un glissement ne doit pas ouvrir la carte sous le curseur
    car.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  }

  /* ---------- apparition des sections au défilement ----------
     (le CSS ne masque rien si l'utilisateur a demandé de réduire les animations) */
  const items = document.querySelectorAll(
    ".split, .block, .items > li, .log > li, .flow > li"
  );
  document.querySelectorAll(".tl, .skills, .kv").forEach((list) =>
    [...list.children].forEach((el, i) => el.style.setProperty("--i", i))
  );
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    );
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add("in"));
  }

  /* ---------- formulaire de contact ----------
     Sans JavaScript : envoi classique vers FormSubmit (action du formulaire).
     Avec JavaScript : envoi en arrière-plan (endpoint /ajax/), sans quitter la page. */
  const form = document.getElementById("contact-form");
  if (form) {
    const status = form.querySelector(".form-status");
    const submit = form.querySelector('[type="submit"]');
    const say = (cls, text) => {
      status.className = "form-status full " + cls;
      status.textContent = text;
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (form.elements["_honey"] && form.elements["_honey"].value) return; // robot
      if (form.hasAttribute("data-demo")) { // version sans envoi
        say("err", "Le formulaire n'est pas actif sur ce site pour le moment.");
        return;
      }
      submit.disabled = true;
      say("", "Envoi en cours…");
      try {
        const data = Object.fromEntries(new FormData(form));
        const res = await fetch(form.action.replace("formsubmit.co/", "formsubmit.co/ajax/"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && (json.success === true || json.success === "true")) {
          form.reset();
          say("ok", "✓ Message envoyé. Merci, je vous réponds dès que possible.");
        } else {
          throw new Error(json.message || "échec");
        }
      } catch {
        say("err", "✗ L'envoi a échoué. Écrivez-moi directement : " + (form.dataset.fallback || "par email"));
      } finally {
        submit.disabled = false;
      }
    });
  }
})();

/* ---------- fond spatial en ASCII : étoiles + planète à anneau ----------
   Tout est généré en caractères (aucune image). La planète tourne lentement ;
   elle reste figée si l'utilisateur a demandé de réduire les animations. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const layer = document.createElement("div");
  layer.className = "space";
  layer.setAttribute("aria-hidden", "true");
  const stars = document.createElement("pre");
  const planet = document.createElement("pre");
  const ring = document.createElement("pre");
  stars.className = "stars";
  planet.className = "planet";
  ring.className = "ring";
  layer.append(stars, planet, ring);
  document.body.prepend(layer);

  /* étoiles : positions fixes (générateur pseudo-aléatoire à graine) */
  const rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const drawStars = () => {
    const cols = Math.ceil(innerWidth / 9.6) + 1; // police 16px : 9,6 px de large
    const rows = Math.ceil(innerHeight / 16) + 1;
    const r = rng(7);
    let out = "";
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        const v = r();
        line += v < 0.0025 ? "*" : v < 0.011 ? "+" : v < 0.04 ? "." : " ";
      }
      out += line + "\n";
    }
    stars.textContent = out;
  };
  drawStars();
  let resizeTimer;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawStars, 200);
  });

  /* planète : sphère ombrée (bandes + rotation) et anneau incliné */
  const R = 20;                  // rayon en lignes
  const ASP = 1 / 0.6;           // une ligne = 1,67 colonne (police à chasse fixe)
  const W = 117, H = 47;
  const cx = W / 2, cy = H / 2;
  const RAMP = " .:-=+*"; // pas de caractères denses (# % @) : le texte par-dessus reste lisible
  const L = (() => { const v = [0.55, -0.45, 0.7]; const n = Math.hypot(...v); return v.map((a) => a / n); })();
  const tilt = -0.38, cT = Math.cos(tilt), sT = Math.sin(tilt);
  const A = 1.9, K = 0.27;       // anneau : demi-grand axe et aplatissement

  const cells = [];              // type : 1 = sphère, 2 = anneau
  let ringText = "";
  for (let r = 0; r < H; r++) {
    let ringLine = "";
    for (let c = 0; c < W; c++) {
      const dx = (c - cx) / (R * ASP), dy = (r - cy) / R;
      const d2 = dx * dx + dy * dy;
      const u = dx * cT + dy * sT, v = -dx * sT + dy * cT;
      const rho = Math.hypot(u / A, v / (A * K));
      const onRing = rho > 0.66 && rho < 1 && !(rho > 0.83 && rho < 0.88);
      const inSphere = d2 <= 1;
      let ch = " ";
      let type = 0;
      if (onRing && (!inSphere || v > 0)) {
        ch = rho < 0.83 ? "=" : "-";
        type = 2;
      } else if (inSphere) {
        type = 1;
      }
      ringLine += type === 2 ? ch : " ";
      if (type === 1) {
        const z = Math.sqrt(1 - d2);
        const lit = Math.max(0, dx * L[0] + dy * L[1] + z * L[2]);
        cells.push({ i: r * (W + 1) + c, lon: Math.atan2(dx, z), lat: Math.asin(Math.max(-1, Math.min(1, -dy))), lit, rim: d2 > 0.92 });
      }
    }
    ringText += ringLine + "\n";
  }
  ring.textContent = ringText;

  const render = (rot) => {
    const buf = new Array(H * (W + 1)).fill(" ");
    for (let r = 0; r < H; r++) buf[r * (W + 1) + W] = "\n";
    for (const p of cells) {
      const lon = p.lon + rot;
      const t = 0.5 + 0.28 * Math.sin(p.lat * 11 + 1.6 * Math.sin(lon * 2 + p.lat * 3)) + 0.16 * Math.sin(lon * 4 + p.lat * 7 + 1);
      const b = (p.lit + 0.09) * (0.45 + 0.65 * t); // 0,09 = lumière ambiante (face sombre)
      const k = Math.min(RAMP.length - 1, Math.floor(b * RAMP.length * 1.05));
      buf[p.i] = k > 0 ? RAMP[k] : p.rim ? "." : " ";
    }
    planet.textContent = buf.join("");
  };

  let rot = 0.9, last = 0;
  render(rot);
  if (!reduce) {
    const tick = (now) => {
      if (now - last > 120 && !document.hidden) {
        last = now;
        rot += 0.03;
        render(rot);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
})();
