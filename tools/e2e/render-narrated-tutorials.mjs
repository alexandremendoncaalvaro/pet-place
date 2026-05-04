import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const generatedDir = join(root, 'docs', 'tutorials', 'generated');
const tempDir = join(root, 'test-results', 'tutorial-narration');
const piperDir = join(root, 'tools', 'e2e', 'tts', 'piper');
const piperModel = join(piperDir, 'pt-br-faber-medium.onnx');
const piperConfig = join(piperDir, 'pt-br-faber-medium.onnx.json');
const piperBaseUrl = 'https://huggingface.co/Trelis/piper-pt-br-faber-medium/resolve/main';
const narration = JSON.parse(readFileSync(join(root, 'tools', 'e2e', 'tutorial-narration.json'), 'utf8'));
const ttsEngine = process.env.TUTORIAL_TTS || 'piper';

mkdirSync(tempDir, { recursive: true });

if (ttsEngine === 'piper') {
  await ensurePiperVoice();
}

for (const item of narration) {
  const inputVideo = join(generatedDir, `${item.id}.webm`);
  if (!existsSync(inputVideo)) {
    throw new Error(`Missing ${inputVideo}. Run pnpm run test:e2e:tutorial first.`);
  }

  const textPath = join(tempDir, `${item.id}.txt`);
  const wavPath = join(tempDir, `${item.id}.wav`);
  const outputVideo = join(generatedDir, `${item.id}-narrado.webm`);
  writeFileSync(textPath, buildNarrationText(item), 'utf8');
  rmSync(wavPath, { force: true });
  rmSync(outputVideo, { force: true });

  synthesize(textPath, wavPath);
  muxNarration(inputVideo, wavPath, outputVideo);
  console.log(`created ${outputVideo}`);
}

function buildNarrationText(item) {
  return item.segments.map((segment) => segment.text).join('\n');
}

async function ensurePiperVoice() {
  mkdirSync(piperDir, { recursive: true });
  await downloadIfMissing(`${piperBaseUrl}/model.onnx`, piperModel);
  await downloadIfMissing(`${piperBaseUrl}/model.onnx.json`, piperConfig);
}

async function downloadIfMissing(url, filePath) {
  if (existsSync(filePath)) return;
  console.log(`downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(filePath));
}

function synthesize(textPath, wavPath) {
  if (ttsEngine === 'piper') {
    synthesizeWithPiper(textPath, wavPath);
    return;
  }
  if (ttsEngine === 'sapi') {
    synthesizeWithWindowsVoice(textPath, wavPath);
    return;
  }
  throw new Error(`Unsupported TUTORIAL_TTS=${ttsEngine}. Use piper or sapi.`);
}

function synthesizeWithPiper(textPath, wavPath) {
  const result = spawnSync('uvx', [
    '--from',
    'piper-tts',
    'piper',
    '-m',
    piperModel,
    '-c',
    piperConfig,
    '-i',
    textPath,
    '-f',
    wavPath,
    '--sentence-silence',
    '0.25',
    '--length-scale',
    '1.05',
    '--noise-scale',
    '0.55',
    '--noise-w-scale',
    '0.65',
  ], { stdio: 'pipe', encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(`Piper speech synthesis failed:\n${result.stderr || result.stdout}`);
  }
}

function synthesizeWithWindowsVoice(textPath, wavPath) {
  const script = `
    Add-Type -AssemblyName System.Speech
    $text = Get-Content -LiteralPath '${escapePowerShell(textPath)}' -Raw
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -eq 'Microsoft Maria Desktop' } | Select-Object -First 1
    if ($voice) { $synth.SelectVoice($voice.VoiceInfo.Name) }
    $synth.Rate = -1
    $synth.Volume = 95
    $synth.SetOutputToWaveFile('${escapePowerShell(wavPath)}')
    $synth.Speak($text)
    $synth.Dispose()
  `;
  const result = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], { stdio: 'pipe', encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Windows speech synthesis failed:\n${result.stderr || result.stdout}`);
  }
}

function muxNarration(videoPath, wavPath, outputPath) {
  const result = spawnSync('ffmpeg', [
    '-y',
    '-i',
    videoPath,
    '-i',
    wavPath,
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-c:v',
    'copy',
    '-c:a',
    'libopus',
    '-mapping_family',
    '0',
    '-b:a',
    '96k',
    outputPath,
  ], { stdio: 'pipe', encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(`ffmpeg narration mux failed:\n${result.stderr || result.stdout}`);
  }
}

function escapePowerShell(value) {
  return value.replace(/'/g, "''");
}
