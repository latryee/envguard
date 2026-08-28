import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { execSync } from 'node:child_process';

const assetsDir = path.resolve('assets');
const tempFramesDir = path.join(assetsDir, 'temp_frames');

if (!fs.existsSync(tempFramesDir)) {
  fs.mkdirSync(tempFramesDir, { recursive: true });
}

function renderSvgFrame(svgContent, index) {
  const resvg = new Resvg(svgContent, {
    fitTo: {
      mode: 'width',
      value: 940
    }
  });
  const pngBuffer = resvg.render().asPng();
  const filePath = path.join(tempFramesDir, `frame_${String(index).padStart(4, '0')}.png`);
  fs.writeFileSync(filePath, pngBuffer);
  return filePath;
}

function buildSvg(bodyContent, title = 'latryee@macbook: ~/envguard-demo (zsh)') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 540" width="940" height="540">
  <defs>
    <linearGradient id="termGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1b26" />
      <stop offset="100%" stop-color="#16161e" />
    </linearGradient>
    <filter id="termShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000000" flood-opacity="0.65" />
    </filter>
  </defs>

  <g filter="url(#termShadow)">
    <rect x="20" y="20" width="900" height="500" rx="12" fill="url(#termGrad)" stroke="#292e42" stroke-width="1.5" />
    
    <!-- Titlebar -->
    <path d="M 20 32 C 20 25.37 25.37 20 32 20 L 908 20 C 914.63 20 920 25.37 920 32 L 920 62 L 20 62 Z" fill="#1f2335" />
    <circle cx="46" cy="41" r="6" fill="#f7768e" />
    <circle cx="66" cy="41" r="6" fill="#e0af68" />
    <circle cx="86" cy="41" r="6" fill="#9ece6a" />
    <text x="470" y="45" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#7aa2f7" text-anchor="middle">${title}</text>
    
    <!-- Terminal Body with TokyoNight Syntax Colors -->
    <g font-family="'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, Monaco, monospace" font-size="13" line-height="1.5">
      ${bodyContent}
    </g>
  </g>
</svg>`;
}

const frames = [];

function addTypingFrames(prefix, text, precedingHtml = '', charDelay = 70) {
  for (let i = 1; i <= text.length; i++) {
    const typed = text.slice(0, i);
    frames.push({
      duration: charDelay,
      svg: buildSvg(`
        ${precedingHtml}
        <text x="45" y="${95 + (precedingHtml ? 220 : 0)}" fill="#a9b1d6">${prefix} ${typed}<tspan fill="#7aa2f7" font-weight="700">█</tspan></text>
      `)
    });
  }
}

const promptStr = `<tspan fill="#73daca">➜</tspan> <tspan fill="#7aa2f7" font-weight="600">my-project</tspan> <tspan fill="#bb9af7">git:(main)</tspan>`;

// 1. Initial Prompt
frames.push({
  duration: 600,
  svg: buildSvg(`
    <text x="45" y="95" fill="#a9b1d6">${promptStr} <tspan fill="#7aa2f7" font-weight="700">█</tspan></text>
  `)
});

// 2. Type "npx envguard"
addTypingFrames(promptStr, 'npx envguard', '', 70);

// 3. Enter & Show Scan Output
const scanOutputHtml = `
  <text x="45" y="95" fill="#a9b1d6">${promptStr} npx envguard</text>
  <text x="45" y="125" fill="#7aa2f7" font-weight="700">  ███████╗███╗   ██╗██╗   ██╗ ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗</text>
  <text x="45" y="142" fill="#7aa2f7" font-weight="700">  ██╔════╝████╗  ██║██║   ██║██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗</text>
  <text x="45" y="159" fill="#7aa2f7" font-weight="700">  █████╗  ██╔██╗ ██║██║   ██║██║  ███╗██║   ██║███████║██████╔╝██║  ██║</text>
  <text x="45" y="176" fill="#565f89">  v1.0.0 — <tspan fill="#9ece6a">Zero-Config Git Secret Leaks &amp; Type Validator</tspan></text>

  <text x="45" y="210" fill="#f7768e" font-weight="700">🚨 CRITICAL: SECRET LEAKS DETECTED</text>
  <text x="45" y="230" fill="#f7768e">  ● <tspan font-weight="700">Stripe Secret Key</tspan> in variable <tspan font-weight="700">STRIPE_KEY</tspan> <tspan fill="#565f89">at .env.example:6</tspan></text>
  <text x="45" y="248" fill="#565f89">    Masked: <tspan fill="#e0af68">sk_t...WxYz</tspan> | Fix: <tspan fill="#73daca">Roll key and replace with placeholder</tspan></text>

  <text x="45" y="280" fill="#f7768e" font-weight="700">❌ Type &amp; Format Mismatches [1]</text>
  <text x="45" y="298" fill="#f7768e">  ✖ <tspan font-weight="700">PORT</tspan> <tspan fill="#565f89">(line 1)</tspan>: Expected valid port number (1-65535), got "999999".</text>

  <text x="45" y="330" fill="#e0af68" font-weight="700">⚠️ Drift: Missing in .env.example (Undocumented Keys) [1]</text>
  <text x="45" y="348" fill="#e0af68">  ▲ <tspan font-weight="700">REDIS_URL</tspan> <tspan fill="#565f89">(used in src/lib/redis.ts:8)</tspan></text>
  <text x="45" y="366" fill="#565f89">  💡 Fix: Run <tspan fill="#7aa2f7" font-weight="600">npx envguard sync</tspan> to automatically update .env.example</text>

  <line x1="45" y1="386" x2="875" y2="386" stroke="#292e42" stroke-width="1" stroke-dasharray="4 4" />
  <text x="45" y="408" fill="#f7768e" font-weight="700">  ✖ Failed: <tspan fill="#f7768e">2 errors</tspan>, <tspan fill="#e0af68">1 warning</tspan> <tspan fill="#565f89">(scan took 16ms)</tspan></text>
`;

frames.push({
  duration: 3500,
  svg: buildSvg(scanOutputHtml)
});

// 4. Clear & Type "npx envguard sync"
frames.push({
  duration: 400,
  svg: buildSvg(`
    <text x="45" y="95" fill="#a9b1d6">${promptStr} <tspan fill="#7aa2f7" font-weight="700">█</tspan></text>
  `)
});

addTypingFrames(promptStr, 'npx envguard sync', '', 65);

// 5. Result of sync
const syncResultHtml = `
  <text x="45" y="95" fill="#a9b1d6">${promptStr} npx envguard sync</text>
  <text x="45" y="130" fill="#9ece6a" font-weight="600">✔ Synchronized .env.example template successfully:</text>
  <text x="45" y="155" fill="#9ece6a">  + <tspan fill="#c0caf5" font-weight="600">REDIS_URL</tspan> <tspan fill="#565f89">(redis://localhost:6379 # @type url)</tspan></text>
  <text x="45" y="175" fill="#9ece6a">  ✔ <tspan fill="#c0caf5" font-weight="600">STRIPE_KEY</tspan> <tspan fill="#565f89">masked with safe placeholder (sk_test_your_stripe_key_here)</tspan></text>
  
  <text x="45" y="215" fill="#a9b1d6">${promptStr} <tspan fill="#7aa2f7" font-weight="700">█</tspan></text>
`;

frames.push({
  duration: 2500,
  svg: buildSvg(syncResultHtml)
});

// 6. Type "npx envguard" again
addTypingFrames(promptStr, 'npx envguard', `
  <text x="45" y="95" fill="#a9b1d6">${promptStr} npx envguard sync</text>
  <text x="45" y="130" fill="#9ece6a" font-weight="600">✔ Synchronized .env.example template successfully:</text>
  <text x="45" y="155" fill="#9ece6a">  + <tspan fill="#c0caf5" font-weight="600">REDIS_URL</tspan> <tspan fill="#565f89">(redis://localhost:6379 # @type url)</tspan></text>
  <text x="45" y="175" fill="#9ece6a">  ✔ <tspan fill="#c0caf5" font-weight="600">STRIPE_KEY</tspan> <tspan fill="#565f89">masked with safe placeholder (sk_test_your_stripe_key_here)</tspan></text>
`, 65);

// 7. Final All Checks Passed Output!
const finalPassedHtml = `
  <text x="45" y="95" fill="#a9b1d6">${promptStr} npx envguard</text>
  <text x="45" y="125" fill="#7aa2f7" font-weight="700">  ███████╗███╗   ██╗██╗   ██╗ ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗</text>
  <text x="45" y="142" fill="#7aa2f7" font-weight="700">  ██╔════╝████╗  ██║██║   ██║██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗</text>
  <text x="45" y="159" fill="#7aa2f7" font-weight="700">  █████╗  ██╔██╗ ██║██║   ██║██║  ███╗██║   ██║███████║██████╔╝██║  ██║</text>
  <text x="45" y="176" fill="#565f89">  v1.0.0 — <tspan fill="#9ece6a">Zero-Config Git Secret Leaks &amp; Type Validator</tspan></text>

  <line x1="45" y1="210" x2="875" y2="210" stroke="#292e42" stroke-width="1" stroke-dasharray="4 4" />
  <text x="45" y="238" fill="#9ece6a" font-weight="700">  ✔ Environment Guard: All checks passed!</text>
  <text x="45" y="258" fill="#565f89">    (14 code references, 6 env keys, 6 example keys in 13ms)</text>
  <line x1="45" y1="280" x2="875" y2="280" stroke="#292e42" stroke-width="1" stroke-dasharray="4 4" />

  <text x="45" y="325" fill="#a9b1d6">${promptStr} <tspan fill="#7aa2f7" font-weight="700">█</tspan></text>
`;

frames.push({
  duration: 4000,
  svg: buildSvg(finalPassedHtml)
});

console.log(`Rendering ${frames.length} animated frames...`);

// Render frames
const frameData = [];
for (let i = 0; i < frames.length; i++) {
  const filePath = renderSvgFrame(frames[i].svg, i);
  frameData.push({ path: filePath, duration: frames[i].duration });
}

// Assemble into GIF via Pillow with optimized palette
const pyScript = `
import os
from PIL import Image

frames_info = ${JSON.stringify(frameData)}
images = []
durations = []

for item in frames_info:
    img = Image.open(item['path']).convert('RGBA')
    bg = Image.new('RGB', img.size, (26, 27, 38))
    bg.paste(img, mask=img.split()[3])
    quantized = bg.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    images.append(quantized)
    durations.append(item['duration'])

out_gif = os.path.join(r"${assetsDir.replace(/\\/g, '\\\\')}", "demo.gif")
images[0].save(
    out_gif,
    save_all=True,
    append_images=images[1:],
    duration=durations,
    loop=0,
    optimize=True
)
print(f"Generated {out_gif} ({os.path.getsize(out_gif)} bytes)")
`;

fs.writeFileSync(path.join(tempFramesDir, 'assemble.py'), pyScript, 'utf8');
execSync(`python "${path.join(tempFramesDir, 'assemble.py')}"`, { stdio: 'inherit' });

// Cleanup temp frames
fs.rmSync(tempFramesDir, { recursive: true, force: true });
console.log('Real Terminal Demo GIF generation complete!');
