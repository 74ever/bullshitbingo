// Utility: seeded PRNG (xorshift32)
function rng(seed) {
  let x = seed >>> 0 || 123456789;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i=0;i<s.length;i++) { h ^= s.charCodeAt(i); h += (h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24); }
  return h >>> 0;
}

// Read params from URL
const params = new URLSearchParams(location.search);
const listKey = params.get("list") || "general";
const seedParam = params.get("s") || Math.floor(Math.random()*1e9).toString();

const listSelect = document.getElementById("listSelect");
listSelect.value = window.WORDLISTS[listKey] ? listKey : "general";

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const newBtn = document.getElementById("newBoardBtn");
const shareBtn = document.getElementById("shareBtn");

function pick25(words, seeded) {
  const arr = [...words];
  // Fisher–Yates shuffle via seeded RNG
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(seeded() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Ensure at least 25 items by cycling if list too short
  while (arr.length < 25) arr.push(...words);
  return arr.slice(0, 25);
}

function buildBoard({listKey, seed, freeCenter=true}) {
  const words = window.WORDLISTS[listKey] || window.WORDLISTS.general;
  const seeded = rng(typeof seed === "number" ? seed : hashStr(String(seed)));
  const tiles = pick25(words, seeded);

  boardEl.innerHTML = "";
  const marks = new Set();

  tiles.forEach((w, idx) => {
    const btn = document.createElement("button");
    btn.className = "tile";
    btn.setAttribute("role", "gridcell");
    btn.setAttribute("aria-pressed", "false");
    btn.textContent = w;
    btn.addEventListener("click", () => toggle(idx, btn));
    boardEl.appendChild(btn);
  });

  // Free center
  if (freeCenter) {
    const center = boardEl.children[12];
    center.classList.add("free");
    setPressed(12, boardEl.children[12], true);
  }

  function setPressed(i, el, on) {
    if (on) { marks.add(i); el.setAttribute("aria-pressed","true"); }
    else { marks.delete(i); el.setAttribute("aria-pressed","false"); }
  }
  function toggle(i, el) {
    const on = el.getAttribute("aria-pressed") !== "true";
    setPressed(i, el, on);
    const win = checkWin(marks);
    statusEl.textContent = win ? "BINGO! 🎉" : "";
    boardEl.classList.toggle("win", !!win);
    if (win) shootConfetti();
  }

  function checkWin(marksSet) {
    const lines = [];
    // Rows
    for (let r=0;r<5;r++) lines.push([0,1,2,3,4].map(c => r*5+c));
    // Cols
    for (let c=0;c<5;c++) lines.push([0,1,2,3,4].map(r => r*5+c));
    // Diagonals
    lines.push([0,6,12,18,24], [4,8,12,16,20]);
    return lines.some(line => line.every(i => marksSet.has(i)));
  }
}

// Confetti (tiny, no dependency)
function shootConfetti() {
  const n = 80;
  for (let i=0;i<n;i++) {
    const s = document.createElement("span");
    s.style.position="fixed";
    s.style.left = Math.random()*100+"vw";
    s.style.top = "-10px";
    s.style.width = s.style.height = (6+Math.random()*6)+"px";
    s.style.background = `hsl(${Math.floor(Math.random()*360)} 80% 60%)`;
    s.style.transform = `rotate(${Math.random()*360}deg)`;
    s.style.borderRadius = "2px";
    s.style.zIndex = 9999;
    document.body.appendChild(s);
    const duration = 1000 + Math.random()*1200;
    s.animate([
      { transform: s.style.transform, top: "-10px", opacity: 1 },
      { transform: `rotate(${Math.random()*720}deg)`, top: "110vh", opacity: 0.8 }
    ], { duration, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" })
    .onfinish = () => s.remove();
  }
}

// Initialisieren
function applyStateFromURL() {
  const s = params.get("s") || seedParam;
  const l = params.get("list") || listKey;
  buildBoard({ listKey: l, seed: s, freeCenter: true });
}
applyStateFromURL();

// UI Events
newBtn.addEventListener("click", () => {
  const newSeed = Math.floor(Math.random()*1e9);
  const l = listSelect.value;
  const url = new URL(location.href);
  url.searchParams.set("s", String(newSeed));
  url.searchParams.set("list", l);
  history.replaceState(null, "", url.toString());
  buildBoard({ listKey: l, seed: newSeed });
});
shareBtn.addEventListener("click", async () => {
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
    statusEl.textContent = "Link kopiert ✅";
    setTimeout(()=> statusEl.textContent="", 2000);
  } catch {
    prompt("Link kopieren:", url);
  }
});
listSelect.addEventListener("change", () => {
  const url = new URL(location.href);
  url.searchParams.set("list", listSelect.value);
  history.replaceState(null, "", url.toString());
  applyStateFromURL();
});
