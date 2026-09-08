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

  /* Guided enquiry chat. Scripted, private, nothing leaves the page until the
     visitor chooses to send. */
  const chat = $("#chat");
  const launch = $("#chat-launch");
  if (chat && launch) {
    const log = $("#chat-log");
    const actions = $("#chat-actions");
    const to = "admin@surelets.co.uk";
    const phone = "+44 (0)20 8158 8434";
    const state = {};
    let opened = false;

    const say = (text, who = "them") => {
      const p = document.createElement("p");
      p.className = `chat-msg chat-${who}`;
      p.innerHTML = text;
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
    };
    const choices = (items) => {
      actions.innerHTML = "";
      items.forEach(([label, fn]) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "chip"; b.textContent = label;
        b.addEventListener("click", () => { say(label, "me"); fn(); });
        actions.appendChild(b);
      });
    };
    const ask = (placeholder, key, next, type = "text") => {
      actions.innerHTML = "";
      const f = document.createElement("form");
      f.className = "chat-form";
      f.innerHTML = `<label class="sr-only" for="chat-in">${placeholder}</label><input id="chat-in" type="${type}" placeholder="${placeholder}" required autocomplete="on"><button class="btn btn-primary btn-sm" type="submit">Next</button>`;
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        const v = f.querySelector("input").value.trim();
        if (!v) return;
        state[key] = v; say(v, "me"); next();
      });
      actions.appendChild(f);
      f.querySelector("input").focus();
    };

    const finish = () => {
      const body = Object.entries(state).map(([k, v]) => `${k}: ${v}`).join("\n");
      const href = `mailto:${to}?subject=${encodeURIComponent("Website enquiry: " + (state.Interest || state.Topic || "General"))}&body=${encodeURIComponent(body + "\n\nSent from the chat on surelets.co.uk")}`;
      say(`Thanks ${state.Name ? state.Name.split(" ")[0] : ""}. Send that to us and a person will reply the same working day.`);
      actions.innerHTML = `<a class="btn btn-primary btn-sm" href="${href}">Send by email</a><a class="btn btn-ghost btn-sm" href="tel:+442081588434">Call ${phone}</a>`;
    };
    const contact = () => ask("Your name", "Name", () => ask("Email address", "Email", () => ask("Phone (optional, press Next to skip)", "Phone", finish, "tel"), "email"));

    const landlord = () => {
      say("Good to meet you. Where is the property?");
      ask("Postcode or area, e.g. E10", "Area", () => {
        say("And how is it let at the moment?");
        choices([
          ["Currently let, with an agent", () => { state.Situation = "Let via another agent"; interest(); }],
          ["Currently let, self managed", () => { state.Situation = "Self managed"; interest(); }],
          ["Empty or about to be", () => { state.Situation = "Vacant"; interest(); }],
          ["Buying, not completed yet", () => { state.Situation = "Purchasing"; interest(); }],
        ]);
      });
    };
    const interest = () => {
      say("What would you like from us?");
      choices([
        ["Fully managed", () => { state.Interest = "Fully managed"; say("That is most of what we do. Last thing, how do we reach you?"); contact(); }],
        ["Rent collection only", () => { state.Interest = "Rent collection"; say("Noted. How do we reach you?"); contact(); }],
        ["Find a tenant only", () => { state.Interest = "Let only"; say("Noted. How do we reach you?"); contact(); }],
        ["Not sure yet", () => { state.Interest = "Advice"; say("No problem, we will talk it through. How do we reach you?"); contact(); }],
      ]);
    };
    const tenant = () => {
      say("Hello. What do you need?");
      choices([
        ["Report a repair", () => { state.Topic = "Repair"; say(`For anything urgent, ring ${phone}. Otherwise tell us the address and the problem.`); ask("Address and what has gone wrong", "Details", contact); }],
        ["Ask about my tenancy", () => { state.Topic = "Tenancy question"; ask("What would you like to know?", "Details", contact); }],
        ["Enquire about a property", () => { state.Topic = "Viewing"; ask("Which property, and when could you view?", "Details", contact); }],
      ]);
    };
    const start = () => {
      say("Hello. This is a short guided form, not a bot pretending to be a person. Are you a landlord or a tenant?");
      choices([
        ["I am a landlord", () => { state.Role = "Landlord"; landlord(); }],
        ["I am a tenant", () => { state.Role = "Tenant"; tenant(); }],
        ["Something else", () => { state.Role = "Other"; ask("Tell us briefly what it is about", "Details", contact); }],
      ]);
    };

    const setOpen = (open) => {
      chat.hidden = !open;
      launch.setAttribute("aria-expanded", String(open));
      launch.classList.toggle("is-open", open);
      if (open && !opened) { opened = true; start(); }
    };
    launch.addEventListener("click", () => setOpen(chat.hidden));
    $(".chat-close", chat).addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !chat.hidden) setOpen(false); });
  }

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
