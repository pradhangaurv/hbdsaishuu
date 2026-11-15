/* Structure: helpers → storage → router → pages → boot */
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls = "", html = "") => Object.assign(document.createElement(tag), { className: cls, innerHTML: html });
const C = CONFIG;
const edit = new URLSearchParams(location.search).has("edit"); // add ?edit to the URL to upload/change things
document.body.classList.toggle("edit", edit);
document.title = `Happy Birthday ${C.name} ♡`;

/* ---------- storage: IndexedDB (uploads survive refresh, this browser only) ---------- */
const store = (() => {
  const db = new Promise(res => {
    const r = indexedDB.open("bday", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
  });
  const run = async (mode, fn) => new Promise(res => {
    db.then(d => { const q = fn(d.transaction("kv", mode).objectStore("kv")); q.onsuccess = () => res(q.result); q.onerror = () => res(); });
  });
  return { get: async (k, d) => (await run("readonly", s => s.get(k))) ?? d, set: (k, v) => run("readwrite", s => s.put(v, k)) };
})();

/* ---------- small UI helpers ---------- */
const pick = (accept, multiple = false) => new Promise(res => {
  const i = Object.assign(document.createElement("input"), { type: "file", accept, multiple, onchange: () => res([...i.files]) });
  i.click();
});
const confetti = () => {
  const colors = ["#c9b6ee", "#f2b8c6", "#f8e08e", "#fff", "#9d84d6"];
  for (let i = 0; i < 90; i++) {
    const p = el("i", "confetti");
    p.style.cssText = `left:${Math.random() * 100}vw;background:${colors[i % 5]};--d:${2 + Math.random() * 2}s;--x:${Math.random() * 200 - 100}px;animation-delay:${Math.random() * .6}s`;
    document.body.append(p);
    setTimeout(() => p.remove(), 5000);
  }
};
const lightbox = (tag, src, caption) => {
  $("#lbbody").innerHTML = tag === "img" ? `<img src="${src}">` : `<video src="${src}" controls autoplay playsinline></video>`;
  $("#lbcap").textContent = caption || "";
  $("#lb").showModal();
};
$("#lb .x").onclick = () => $("#lb").close();
$("#lb").onclick = e => e.target.id === "lb" && e.target.close();
$("#lb").onclose = () => ($("#lbbody").innerHTML = "");


/* ---------- router ---------- */
const show = id => {
  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("leave");
    p.classList.toggle("on", p.id === id);
  });

  sessionStorage.page = id;

  // Run the birthday countdown whenever the cake page opens
  if (id === "cake") {
    cakePage();
  }

  scrollTo(0, 0);
};
document.addEventListener("click", e => {
  const t = e.target.closest("[data-go]");
  if (!t) return;

  show(t.dataset.go);
});
/* ---------- page 1: password ---------- */
const lockPage = async () => {
  const target = C.password.toUpperCase();
  let typed = "";
  const draw = () => {
    $("#code").innerHTML = Array.from({ length: Math.max(target.length, typed.length) }, (_, i) => `<b>${typed[i] === " " ? "·" : typed[i] || ""}</b>`).join("");
  };
  const press = k => {
    typed = k === "DELETE" ? typed.slice(0, -1) : k === "CLEAR" ? "" : typed + (k === "SPACE" ? " " : k);
    $("#err").textContent = "";
    draw();
  };
  const submit = () => {
    if (typed.trim() === target) { $("#lock").classList.add("leave"); setTimeout(() => show("cake"), 700); return; }
    $("#err").textContent = C.wrongMessage;
    $("#code").classList.add("shake");
    setTimeout(() => $("#code").classList.remove("shake"), 500);
  };
  const row = (keys, cls = "") => el("div", "row", keys.map(k => `<button class="k ${cls}" data-k="${k}">${k}</button>`).join(""));
  $("#keys").append(...["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].map(r => row([...r])), row(["SPACE", "DELETE", "CLEAR"], "w"));
  $("#keys").onclick = e => e.target.dataset.k && press(e.target.dataset.k);
  $("#unlock").onclick = submit;
  document.addEventListener("keydown", e => {
    if (!$("#lock").classList.contains("on")) return;
    if (/^[a-z]$/i.test(e.key)) press(e.key.toUpperCase());
    else if (e.key === " ") { e.preventDefault(); press("SPACE"); }
    else if (e.key === "Backspace") press("DELETE");
    else if (e.key === "Enter") submit();
  });
  draw();

  // her circular photo (scalloped frame + owner upload)
  $("#frame").prepend(...Array.from({ length: 20 }, (_, i) => { const s = el("i"); s.style.setProperty("--a", i * 18 + "deg"); return s; }));
  const setPhoto = async () => {
    const blob = await store.get("her");
    const src = blob ? URL.createObjectURL(blob) : C.photo;
    if (src) { $("#her").style.backgroundImage = `url("${src}")`; $("#her").textContent = ""; }
  };
  $("#frame").onclick = async () => {
    if (!edit) return;
    const [f] = await pick("image/*");
    if (f) { await store.set("her", f); setPhoto(); }
  };
  setPhoto();
};


/* ---------- page 2: birthday countdown + candles ---------- */
const cakePage = () => {
  const heading = $("#hb");
  const wish = $("#wish");
  const number = $("#countdown-number");
  const cake = $("#cake-svg");
  const afterMessage = $("#after-message");
  const after = $("#after");

  // Personal birthday greeting
  heading.textContent = `Happy Birthday, ${C.name}!! 🎉`;

  // Reset the cake whenever this page is opened
  cake.classList.remove("out");
  wish.textContent = "Blow the candles in...";
  number.hidden = false;
  number.textContent = "3";
  afterMessage.hidden = true;
  after.hidden = true;

  // Prevent multiple countdowns from running together
  if (window.cakeCountdown) {
    clearTimeout(window.cakeCountdown);
  }

  let count = 3;

  const countdown = () => {
    if (count > 1) {
      count--;

      number.textContent = count;

      // Restart the number animation
      number.style.animation = "none";
      void number.offsetWidth;
      number.style.animation = "";

      window.cakeCountdown = setTimeout(countdown, 1000);
    } else {
      // Countdown finished: blow out all three candles
      number.hidden = true;
      wish.textContent = "Welcome to the budimau world, cutie ♡";

      cake.classList.add("out");

      afterMessage.hidden = false;
      after.hidden = false;

      confetti();
    }
  };

  // Start the countdown
  window.cakeCountdown = setTimeout(countdown, 1000);
};


/* ---------- pages 4 + 6: polaroid galleries (config items + owner uploads) ---------- */
const gallery = async ({ key, accept, root, tag, add, emptyText }) => {
  let mine = await store.get(key, []);
  const save = () => store.set(key, mine);
  const draw = () => {
    root.replaceChildren(...[...C[key], ...mine].map((it, n) => {
      const own = mine.includes(it);
      const src = it.blob ? URL.createObjectURL(it.blob) : it.src;
      const media = tag === "img" ? `<img src="${src}" alt="">` : `<video src="${src}" muted preload="metadata" playsinline></video>`;
      const f = el("figure", "polaroid" + (tag === "video" ? " vid" : ""), `<span class="tape"></span>${media}<figcaption></figcaption>${own && edit ? '<button class="x">✕</button>' : ""}`);
      f.style.setProperty("--r", ((n * 37) % 7) - 3 + "deg");
      const cap = $("figcaption", f);
      cap.textContent = it.caption || "";
      f.onclick = e => { if (!e.target.closest("button, [contenteditable]")) lightbox(tag, src, it.caption); };
      if (own && edit) {
        cap.contentEditable = true;
        cap.onblur = () => { it.caption = cap.textContent; save(); };
        $(".x", f).onclick = () => { mine = mine.filter(x => x !== it); save(); draw(); };
      }
      return f;
    }));
    if (!root.children.length) root.append(el("p", "empty", emptyText));
  };
  $(add).onclick = async () => {
    for (const blob of await pick(accept, true)) mine.push({ blob, caption: "Add a caption ♡" });
    save(); draw();
  };
  draw();
};

/* ---------- page 5: letter ---------- */
const letterPage = async () => {
  const box = $("#letter");
  box.textContent = await store.get("letter", C.letter);
  if (edit) { box.contentEditable = true; box.onblur = () => store.set("letter", box.innerText); }
};

/* ---------- page 6: music ---------- */
const musicPage = async () => {
  const a = $("#aud");
  const blob = await store.get("song");
  const src = blob ? URL.createObjectURL(blob) : C.song.src;
  a.src = src || "";
  $("#player").classList.toggle("none", !src);
  $("#play").onclick = () => (a.paused ? a.play() : a.pause());
  a.onplay = a.onpause = () => ($("#play").textContent = a.paused ? "▶" : "❚❚");
  a.ontimeupdate = () => ($("#seek").value = (a.currentTime / (a.duration || 1)) * 100);
  $("#seek").oninput = e => (a.currentTime = (e.target.value / 100) * (a.duration || 0));
  $("#vol").oninput = e => (a.volume = e.target.value);
  a.volume = $("#vol").value;
  $("#add-song").onclick = async () => {
    const [f] = await pick("audio/*");
    if (f) { await store.set("song", f); musicPage(); }
  };
};

/* ---------- boot ---------- */
$("#bg").append(...Array.from({ length: 22 }, (_, i) => {
  const s = el("span", "", "♡✦★✿"[i % 4]);
  s.style.cssText = `left:${i * 4.5}%;font-size:${14 + (i % 4) * 8}px;color:${["#c9b6ee", "#f2b8c6", "#f8d36a"][i % 3]};animation-duration:${10 + (i % 7) * 2}s;animation-delay:-${(i % 9) * 2}s`;
  return s;
}));
lockPage();
letterPage();
musicPage();
gallery({ key: "photos", accept: "image/*", root: $("#photos"), tag: "img", add: "[data-add=photos]", emptyText: "No photos yet — memories will appear here ♡" });
gallery({ key: "videos", accept: "video/*", root: $("#clips"), tag: "video", add: "[data-add=clips]", emptyText: "No videos yet — little clips will appear here 🎞️" });
show("lock");
