import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const assetsDir = path.resolve('assets');

const files = [
  { input: 'social-preview.svg', output: 'social-preview.png', width: 1200 },
  { input: 'demo.svg', output: 'demo.png', width: 1200 },
  { input: 'hook-demo.svg', output: 'hook-demo.png', width: 1200 }
];

for (const f of files) {
  const inputPath = path.join(assetsDir, f.input);
  const outputPath = path.join(assetsDir, f.output);

  if (fs.existsSync(inputPath)) {
    const svg = fs.readFileSync(inputPath, 'utf8');
    const resvg = new Resvg(svg, {
      fitTo: {
        mode: 'width',
        value: f.width
      }
    });

    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    fs.writeFileSync(outputPath, pngBuffer);
    console.log(`Generated ${f.output} (${pngBuffer.length} bytes)`);
  }
}
