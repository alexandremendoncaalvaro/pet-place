import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const generatedDir = join(root, 'docs', 'tutorials', 'generated');
const tempDir = join(root, 'test-results', 'tutorial-narration');
const narration = JSON.parse(readFileSync(join(root, 'tools', 'e2e', 'tutorial-narration.json'), 'utf8'));

mkdirSync(tempDir, { recursive: true });

for (const item of narration) {
  const inputVideo = join(generatedDir, `${item.id}.webm`);
  if (!existsSync(inputVideo)) {
    throw new Error(`Missing ${inputVideo}. Run npm run test:e2e:tutorial first.`);
  }

  const textPath = join(tempDir, `${item.id}.txt`);
  const wavPath = join(tempDir, `${item.id}.wav`);
  const outputVideo = join(generatedDir, `${item.id}-narrado.webm`);
  writeFileSync(textPath, item.text, 'utf8');
  rmSync(wavPath, { force: true });
  rmSync(outputVideo, { force: true });

  synthesizeWithWindowsVoice(textPath, wavPath);
  muxNarration(inputVideo, wavPath, outputVideo);
  console.log(`created ${outputVideo}`);
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
    '-i', videoPath,
    '-i', wavPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'copy',
    '-c:a', 'libopus',
    '-mapping_family', '0',
    '-b:a', '96k',
    outputPath,
  ], { stdio: 'pipe', encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(`ffmpeg narration mux failed:\n${result.stderr || result.stdout}`);
  }
}

function escapePowerShell(value) {
  return value.replace(/'/g, "''");
}
