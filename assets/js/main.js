/* Sure Lets & Manage. Progressive enhancement only: the site works without this file. */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* Header: condense once scrolled, via IntersectionObserver on a sentinel. */
  const header = $(".site-header");
  if (header) {
    const sentinel = document.createElement("div");
    sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px;pointer-events:none";
    document.body.prepend(sentinel);
    new IntersectionObserver(([e]) => header.classList.toggle("is-scrolled", !e.isIntersecting), { rootMargin: "-40px 0px 0px 0px" }).observe(sentinel);
  }

  /* Mobile menu */
  const toggle = $(".menu-toggle");
  const mobile = $("#mobile-nav");
  if (toggle && mobile) {
    const set = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.classList.toggle("menu-open", open);
      if (open) {
        mobile.hidden = false;
        requestAnimationFrame(() => mobile.classList.add("is-open"));
      } else {
        mobile.classList.remove("is-open");
        setTimeout(() => { if (!mobile.classList.contains("is-open")) mobile.hidden = true; }, reduce ? 0 : 500);
      }
    };
    toggle.addEventListener("click", () => set(toggle.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") set(false); });
  }

  /* Scroll reveal: opacity/transform only, once. */
  const revealables = $$("[data-reveal]");
  if (revealables.length && !reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("is-in"));
  }

  /* Fee calculator (fees page) */
  const calc = $("#fee-calc");
  if (calc) {
    const rent = $("#calc-rent");
    const out = $$("[data-fee]", calc);
    const fmt = (n) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
    const update = () => {
      const r = Math.max(0, Number(rent.value) || 0);
      out.forEach((el) => {
        const pct = Number(el.dataset.fee);
        el.textContent = r ? fmt((r * pct) / 100) : "-";
      });
      $("#calc-rent-out").textContent = r ? fmt(r) : "-";
    };
    rent.addEventListener("input", update);
    update();
  }

  /* Contact form: no server on static hosting, so we hand the message to the
     visitor's mail client with everything filled in. */
  const form = $("#enquiry-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const d = new FormData(form);
      const required = ["name", "email", "message"];
      let ok = true;
      required.forEach((k) => {
        const field = form.elements[k];
        const err = $(`[data-error-for="${k}"]`, form);
        const bad = !String(d.get(k) || "").trim() || (k === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.get(k)));
        field.setAttribute("aria-invalid", String(bad));
        if (err) err.hidden = !bad;
        if (bad) ok = false;
      });
      if (!ok) { form.querySelector("[aria-invalid='true']").focus(); return; }
      const lines = [
        `Name: ${d.get("name")}`,
        `Email: ${d.get("email")}`,
        `Phone: ${d.get("phone") || "-"}`,
        `I am a: ${d.get("role") || "-"}`,
        `Property: ${d.get("property") || "-"}`,
        "",
        d.get("message"),
      ];
      const subject = encodeURIComponent(`Enquiry from ${d.get("name")} via surelets.co.uk`);
      window.location.href = `mailto:${form.dataset.to}?subject=${subject}&body=${encodeURIComponent(lines.join("\n"))}`;
      $("#form-sent").hidden = false;
    });
  }

  /* The assistant lives in assistant.js. */

  /* Pointer-lit surfaces: a soft highlight follows the cursor over cards and
     tiers. Pure CSS custom properties, transform-free, disabled for touch and
     reduced motion. */
  if (!reduce && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    $$(".cell, .tier, .group, .cta").forEach((el) => {
      el.classList.add("lit");
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      });
    });

    /* Magnetic pull on primary buttons: the button drifts a few pixels toward
       the cursor and springs back. */
    $$(".btn-primary").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        btn.style.transform = `translate(${dx * 6}px, ${dy * 6}px)`;
      });
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });
  }

  /* Hero photograph: a slow drift that settles as you scroll away, using a
     CSS scroll-driven animation where supported and nothing otherwise. */

  /* Accordions: native details, but only one open at a time per group. */
  $$("[data-accordion]").forEach((group) => {
    group.addEventListener("toggle", (e) => {
      if (e.target.open) $$("details[open]", group).forEach((d) => { if (d !== e.target) d.open = false; });
    }, true);
  });
})();
