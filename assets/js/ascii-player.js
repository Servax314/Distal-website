const player = document.getElementById("ascii-player");

const totalFrames = 46;      // how many frames you have
const fps = 24;               // animation speed
const framePath = "../../public/ascii/";  // folder path
const pad = 4;                // number padding (0001)

function frameName(i) {
  return `frame_${String(i).padStart(pad, "0")}.txt`;
}

async function loadFrame(i) {
  const response = await fetch(framePath + frameName(i));
  return await response.text();
}

let frames = [];
let current = 0;

// Preload all frames first (recommended)
async function preload() {
  for (let i = 1; i <= totalFrames; i++) {
    frames.push(await loadFrame(i));
  }
  start();
}

function start() {
  setInterval(() => {
    player.textContent = frames[current];
    current = (current + 1) % frames.length;
  }, 1000 / fps);
}

preload();