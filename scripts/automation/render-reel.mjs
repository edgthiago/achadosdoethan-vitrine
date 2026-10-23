import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const inputPath = path.join(root, 'automation/output/content-package.json');
const outputDir = path.join(root, 'automation/output');
const workDir = path.join(outputDir, 'reel-work');
const outputPath = path.join(outputDir, 'reel-instagram.mp4');
const productImagePath = path.join(workDir, 'product.webp');
const fontBold = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const fontRegular = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} terminou com código ${code}`));
    });
  });
}

async function download(url, destination) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 AchadosDoEthan/1.0' },
  });
  if (!response.ok) {
    throw new Error(`Falha ao baixar imagem do produto: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destination, buffer);
}

function escapeFilterPath(value) {
  return value.replaceAll('\\', '\\\\').replaceAll(':', '\\:').replaceAll("'", "\\'");
}

const raw = await fs.readFile(inputPath, 'utf8');
const pkg = JSON.parse(raw);
const scenes = pkg?.content?.reel?.scenes;

if (!pkg?.selectedProduct?.image) {
  throw new Error('Pacote sem imagem do produto.');
}
if (!Array.isArray(scenes) || scenes.length !== 6) {
  throw new Error('Pacote precisa ter exatamente 6 cenas.');
}

await fs.rm(workDir, { recursive: true, force: true });
await fs.mkdir(workDir, { recursive: true });
await download(pkg.selectedProduct.image, productImagePath);

const clipPaths = [];
for (let i = 0; i < scenes.length; i += 1) {
  const scene = scenes[i];
  const textPath = path.join(workDir, `scene-${i + 1}.txt`);
  const ctaPath = path.join(workDir, `cta-${i + 1}.txt`);
  const clipPath = path.join(workDir, `scene-${i + 1}.mp4`);
  clipPaths.push(clipPath);

  const primaryText = String(scene.text || '').trim().slice(0, 60);
  const cta = i === scenes.length - 1
    ? 'Confira na vitrine • siga @achadosdoethan'
    : '@achadosdoethan';

  await fs.writeFile(textPath, `${primaryText}\n`, 'utf8');
  await fs.writeFile(ctaPath, `${cta}\n`, 'utf8');

  const zoomRate = 0.00055 + i * 0.00008;
  const filter = [
    '[0:v]split=2[bg][fg]',
    '[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=28[bgv]',
    `[fg]scale=900:1280:force_original_aspect_ratio=decrease,pad=900:1280:(ow-iw)/2:(oh-ih)/2:color=white,zoompan=z='min(1.0+${zoomRate}*on,1.055)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=90:s=900x1280:fps=30[fgv]`,
    `[bgv][fgv]overlay=(W-w)/2:300,drawbox=x=70:y=95:w=940:h=170:color=black@0.58:t=fill,drawtext=fontfile='${escapeFilterPath(fontBold)}':textfile='${escapeFilterPath(textPath)}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=145:shadowcolor=black@0.55:shadowx=2:shadowy=2,drawbox=x=70:y=1660:w=940:h=150:color=black@0.48:t=fill,drawtext=fontfile='${escapeFilterPath(fontBold)}':textfile='${escapeFilterPath(ctaPath)}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=1712,drawtext=fontfile='${escapeFilterPath(fontRegular)}':text='Publicidade • preço e disponibilidade podem mudar':fontcolor=white@0.86:fontsize=24:x=(w-text_w)/2:y=1845[out]`,
  ].join(';');

  await run('ffmpeg', [
    '-y',
    '-loop', '1',
    '-i', productImagePath,
    '-t', '3',
    '-filter_complex', filter,
    '-map', '[out]',
    '-an',
    '-r', '30',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '19',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    clipPath,
  ]);
}

const concatPath = path.join(workDir, 'concat.txt');
await fs.writeFile(
  concatPath,
  clipPaths.map((p) => `file '${p.replaceAll("'", "'\\''")}'`).join('\n') + '\n',
  'utf8',
);

await run('ffmpeg', [
  '-y',
  '-f', 'concat',
  '-safe', '0',
  '-i', concatPath,
  '-c', 'copy',
  '-movflags', '+faststart',
  outputPath,
]);

console.log(`Reel criado: ${path.relative(root, outputPath)}`);
console.log('Formato: 1080x1920, 18 segundos, H.264, sem áudio.');
