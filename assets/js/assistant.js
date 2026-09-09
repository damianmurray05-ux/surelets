/* Sure Lets & Manage assistant.
   Landlords: questions about the services and fees, then a proposal request.
   Tenants: verify with tenancy reference + one-time code, then report a
   repair with the AI. Prospective tenants: tenancy terms.
   The site is static; the assistant runs on Vercel. If that is unreachable it
   degrades to phone, email and a pre-filled email. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const chat = $("#chat");
  const launch = $("#chat-launch");
  if (!chat || !launch) return;
  const log = $("#chat-log");
  const actions = $("#chat-actions");
  const status = $("#chat-status");
  const PHONE = "+44 (0)20 8158 8434", PHONE_HREF = "tel:+442081588434", EMAIL = "admin@surelets.co.uk";
  const metaBase = (document.querySelector('meta[name="sl-api"]') || {}).content || "";
  const sameOrigin = /\.vercel\.app$/.test(location.hostname) || location.port === "3000";
  const BASE = sameOrigin ? "" : metaBase.replace(/\/$/, "");
  const API = { chat: `${BASE}/api/chat`, verify: `${BASE}/api/verify` };

  const state = load() || { mode: null, session: null, tenant: null, history: [], transcript: [] };
  let opened = false;

  function save() { try { sessionStorage.setItem("sl-assistant", JSON.stringify({ ...state, history: state.history.slice(-40) })); } catch {} }
  function load() { try { return JSON.parse(sessionStorage.getItem("sl-assistant")); } catch { return null; } }

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>");
  const say = (text, who = "them", record = true) => {
    const p = document.createElement("div");
    p.className = `chat-msg chat-${who}`;
    p.innerHTML = who === "me" ? esc(text) : `<p>${md(text)}</p>`;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
    if (record) { state.transcript.push({ who, text }); save(); }
  };
  const typing = () => {
    const t = document.createElement("div");
    t.className = "chat-msg chat-them chat-typing"; t.innerHTML = "<i></i><i></i><i></i>";
    log.appendChild(t); log.scrollTop = log.scrollHeight;
    return () => t.remove();
  };
  const chips = (items) => {
    actions.innerHTML = "";
    items.forEach(([label, fn]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = label;
      b.addEventListener("click", () => { say(label, "me"); fn(); });
      actions.appendChild(b);
    });
  };
  const ask = (placeholder, next, opts = {}) => {
    actions.innerHTML = "";
    const f = document.createElement("form");
    f.className = "chat-form";
    const multi = opts.multiline;
    f.innerHTML = `<label class="sr-only" for="chat-in">${placeholder}</label>${multi ? `<textarea id="chat-in" rows="2" placeholder="${placeholder}"></textarea>` : `<input id="chat-in" type="${opts.type || "text"}" inputmode="${opts.inputmode || "text"}" autocomplete="${opts.autocomplete || "off"}" placeholder="${placeholder}" required>`}${opts.photos ? `<label class="btn btn-ghost btn-sm chat-photo" title="Add a photo"><span class="sr-only">Add a photo</span><svg class="ic" aria-hidden="true"><use href="/assets/icons.svg#camera"/></svg><input type="file" accept="image/*" multiple hidden></label>` : ""}<button class="btn btn-primary btn-sm" type="submit" aria-label="Send"><svg class="ic" aria-hidden="true"><use href="/assets/icons.svg#arrow-up-right"/></svg></button>`;
    const input = f.querySelector("#chat-in");
    let photos = [];
    const fileIn = f.querySelector("input[type=file]");
    if (fileIn) fileIn.addEventListener("change", async () => {
      for (const file of [...fileIn.files].slice(0, 2 - photos.length)) photos.push(await shrink(file));
      say(`${photos.length} photo${photos.length === 1 ? "" : "s"} attached`, "sys", false);
    });
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (!v && !photos.length) return;
      say(v || "(photo)", "me");
      const p = photos; photos = [];
      next(v, p);
    });
    if (multi) input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } });
    actions.appendChild(f);
    input.focus();
  };
  async function shrink(file) {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.8);
    return { media_type: "image/jpeg", data: dataUrl.split(",")[1] };
  }
  const setStatus = (t) => { if (status) status.textContent = t; };
  const post = async (url, body) => {
    let r;
    try {
      r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    } catch (e) { throw Object.assign(new Error("network"), { status: 0 }); }
    let data = null;
    try { data = await r.json(); } catch {}
    if (!r.ok) throw Object.assign(new Error((data && data.error) || `HTTP ${r.status}`), { status: r.status, data });
    return data;
  };

  /* Fallback when the assistant cannot be reached: the transcript so far is
     handed to the visitor's email app, so nothing they typed is lost. */
  const offline = () => {
    setStatus("Assistant offline");
    say(`The assistant is not available right now. You can ring ${PHONE}, or send what you have written so far by email and a person will pick it up.`);
    const text = state.transcript.filter((m) => m.who === "me").map((m) => m.text).join("\n");
    const href = `mailto:${EMAIL}?subject=${encodeURIComponent("Enquiry via surelets.co.uk")}&body=${encodeURIComponent(text + "\n\nSent from the assistant on surelets.co.uk")}`;
    actions.innerHTML = `<a class="btn btn-primary btn-sm" href="${href}">Send by email</a><a class="btn btn-ghost btn-sm" href="${PHONE_HREF}">Ring ${PHONE}</a>`;
  };

  /* --- Conversation with the model --- */
  async function send(text, photos = []) {
    const content = [];
    for (const p of photos) content.push({ type: "image", source: { type: "base64", media_type: p.media_type, data: p.data } });
    content.push({ type: "text", text: text || "Here is a photo." });
    state.history.push({ role: "user", content });
    save();
    actions.innerHTML = "";
    const stop = typing();
    try {
      const res = await post(API.chat, { mode: state.mode, session: state.session, messages: state.history });
      stop();
      state.history.push({ role: "assistant", content: res.reply });
      say(res.reply);
      if (res.raised && res.raised.length) {
        for (const r of res.raised) say(`Reference ${r.reference}. ${r.note || ""}`.trim(), "sys");
      }
      if (res.done) {
        chips([["Ask something else", () => start()], ["That is all, thanks", () => { say("Thank you. The team will be in touch."); actions.innerHTML = ""; }]]);
      } else {
        ask("Type your reply", send, { multiline: true, photos: state.mode === "repair" || state.mode === "repair-unverified" });
      }
    } catch (e) {
      stop();
      if (e.status === 404 || e.status === 405 || e.status === 503 || e.status === 0 || !e.status) return offline();
      say(e.message === "rate_limited" ? "Too many messages in a short time. Please wait a minute and try again." : "Something went wrong at our end. Please try again, or ring us if it is urgent.");
      ask("Type your reply", send, { multiline: true, photos: state.mode.startsWith("repair") });
    }
  }
  function begin(mode, opener) {
    state.mode = mode; state.history = []; save();
    say(opener);
    ask("Type your reply", send, { multiline: true, photos: mode.startsWith("repair") });
  }

  /* --- Tenant verification --- */
  function startRepair() {
    if (state.session && state.tenant) {
      begin("repair", `Hello ${state.tenant.firstName}. Tell me what has gone wrong at ${state.tenant.address}, where in the property it is, and when it started. You can add up to two photos.`);
      return;
    }
    setStatus("Verifying you first");
    say("To make sure I am talking to the right person, I need your rent payment reference. It is the reference you use when you pay your rent, and it is on your tenancy agreement and in our emails.");
    say(`If you cannot find it, ring ${PHONE} or choose "I do not have my reference".`, "sys", false);
    askReference();
  }
  function askReference(attempt = 1) {
    ask("Rent payment reference", async (ref) => {
      const stop = typing();
      try {
        const res = await post(API.verify, { action: "lookup", reference: ref });
        stop();
        state.pendingRef = ref;
        const opts = [];
        if (res.phone) opts.push([`Text a code to ${res.phone}`, () => sendCode("sms")]);
        if (res.email) opts.push([`Email a code to ${res.email}`, () => sendCode("email")]);
        say("Found you. Where should I send your one-time code?");
        chips(opts.concat([["I cannot receive either", () => unverified("The contact details we hold may be out of date.")]]));
      } catch (e) {
        stop();
        if (e.status === 404 && e.data && e.data.error === "not_found") {
          if (attempt < 2) { say("I could not find that reference. Check it and try once more."); askReference(attempt + 1); }
          else { say("Still no match. I can take the report without verification and the team will check it against your file, or you can ring us."); chips([["Continue without verification", () => unverified("Reference not matched.")], [`Ring ${PHONE}`, () => { window.location.href = PHONE_HREF; }]]); }
        } else if (e.status === 503) {
          unverified("Verification is not switched on yet.");
        } else if (e.status === 404 || !e.status) offline();
        else { say("Something went wrong checking that. Try again in a moment."); askReference(attempt); }
      }
    }, { autocomplete: "off" });
    if (attempt === 1) {
      const skip = document.createElement("button");
      skip.type = "button"; skip.className = "chip"; skip.textContent = "I do not have my reference";
      skip.addEventListener("click", () => { say("I do not have my reference", "me"); unverified("No reference given."); });
      actions.appendChild(skip);
    }
  }
  async function sendCode(channel) {
    const stop = typing();
    try {
      const res = await post(API.verify, { action: "start", reference: state.pendingRef, channel });
      stop();
      state.verifyToken = res.token; state.lastChannel = channel; save();
      say(`Sent. Enter the six-digit code${res.devCode ? ` (dev: ${res.devCode})` : ""}. It expires in ten minutes.`);
      askCode();
    } catch (e) {
      stop();
      if (e.status === 503) return unverified("We could not send a code right now.");
      say("The code could not be sent. Try the other option, or continue without verification.");
      chips([["Try again", () => sendCode(channel)], ["Continue without verification", () => unverified("Code could not be sent.")]]);
    }
  }
  function askCode(attempt = 1) {
    ask("Six-digit code", async (code) => {
      const stop = typing();
      try {
        const res = await post(API.verify, { action: "check", token: state.verifyToken, code: code.replace(/\s+/g, "") });
        stop();
        state.session = res.session; state.tenant = res.tenant; state.verifyToken = null; save();
        setStatus(`Verified: ${res.tenant.firstName}`);
        say(`Thanks ${res.tenant.firstName}, you are verified.`, "sys");
        begin("repair", `Tell me what has gone wrong at ${res.tenant.address}, where in the property it is, and when it started. You can add up to two photos. If it is dangerous, ring ${PHONE} now.`);
      } catch (e) {
        stop();
        const again = () => sendCode(state.lastChannel || "sms");
        if (e.status === 400 && attempt < 3) { say("That code does not match. Try again."); askCode(attempt + 1); }
        else if (e.status === 410) { say("That code has expired."); chips([["Send a new code", again], ["Continue without verification", () => unverified("Code expired.")]]); }
        else { say("I could not verify that code."); chips([["Send a new code", again], ["Continue without verification", () => unverified("Verification failed.")]]); }
      }
    }, { inputmode: "numeric", autocomplete: "one-time-code" });
  }
  function unverified(reason) {
    state.session = null; state.tenant = null; save();
    setStatus("Not verified");
    say(`${reason} I will take the details now and the team will confirm them against your file before anything is booked.`, "sys");
    begin("repair-unverified", "Tell me your full name, the address of the property, and what has gone wrong. You can add up to two photos.");
  }

  /* --- Entry points --- */
  const openers = {
    landlord: () => { setStatus("Landlord enquiries"); begin("landlord", "Tell me about the property: where it is, what it is, and how it is let at the moment. I can explain the services and fees, and set up a free appraisal."); },
    tenancy: () => { setStatus("Tenancy questions"); begin("tenancy", "Happy to help. Are you renting with us already, or thinking about it? Tell me what you would like to know."); },
    repair: startRepair,
  };
  function start() {
    setStatus("Landlords, tenants and repairs");
    say("Hello. I am the Sure Lets & Manage assistant. What do you need?");
    chips([
      ["I am a landlord", openers.landlord],
      ["Report a repair", openers.repair],
      ["Ask about renting with us", openers.tenancy],
    ]);
  }
  const restore = () => {
    if (!state.transcript.length) return start();
    state.transcript.forEach((m) => say(m.text, m.who, false));
    if (state.mode && state.history.length) ask("Type your reply", send, { multiline: true, photos: state.mode.startsWith("repair") });
    else start();
  };
  const setOpen = (open) => {
    chat.hidden = !open;
    launch.setAttribute("aria-expanded", String(open));
    launch.classList.toggle("is-open", open);
    if (open && !opened) { opened = true; restore(); }
    if (open) { const i = $("#chat-in"); if (i) i.focus(); }
  };
  launch.addEventListener("click", () => setOpen(chat.hidden));
  $(".chat-close", chat).addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !chat.hidden) setOpen(false); });
  const openWith = (which) => {
    setOpen(true);
    const label = { repair: "Report a repair", tenancy: "Ask about renting with us", landlord: "I am a landlord" }[which];
    if (label && openers[which]) { say(label, "me"); openers[which](); }
  };
  document.querySelectorAll("[data-open-chat]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); openWith(b.dataset.openChat); }));
  /* Deep links for emails and letters: /tenants/#repair opens the repair flow, #assistant just opens the assistant. */
  const hash = location.hash.replace("#", "");
  if (hash === "repair" || hash === "tenancy" || hash === "landlord") { state.transcript = []; state.history = []; save(); opened = true; openWith(hash); }
  else if (hash === "assistant") setOpen(true);
})();
