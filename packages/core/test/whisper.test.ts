import { describe, expect, it } from 'vitest';
import {
  TRANSCRIPTION_MESSAGES,
  WHISPER_ENGINE_ASSETS,
  WHISPER_MODELS,
  WhisperArgsError,
  buildAudioExtractArgs,
  buildTranscript,
  buildWhisperArgs,
  getWhisperEngineAsset,
  isAbsolutePath,
  isSha256Hex,
  isWhisperLanguage,
  isWhisperModelId,
  parseWhisperDetectedLanguage,
  parseWhisperProgress,
  parseWhisperSrt,
  recommendWhisperModel,
  selectWhisperModel,
  sha256Matches,
  unsupportedPlatformMessage,
  whisperPlatform,
  whisperThreads,
  whisperTranscriptNote,
} from '../src/index.js';

describe('sources officielles épinglées', () => {
  it('chaque moteur et modèle a une URL officielle HTTPS et une empreinte SHA-256 valide', () => {
    for (const a of Object.values(WHISPER_ENGINE_ASSETS)) {
      expect(a.url).toMatch(/^https:\/\/github\.com\/ggml-org\/whisper\.cpp\/releases\/download\/b\d+\//);
      expect(a.url.endsWith(a.file)).toBe(true);
      expect(isSha256Hex(a.sha256)).toBe(true);
      expect(a.approxBytes).toBeGreaterThan(1_000_000);
    }
    for (const m of Object.values(WHISPER_MODELS)) {
      expect(m.url).toBe(`https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${m.file}`);
      expect(isSha256Hex(m.sha256)).toBe(true);
    }
    expect(WHISPER_MODELS.base.sizeBytes).toBe(147_951_465);
    expect(WHISPER_MODELS.small.sizeBytes).toBe(487_601_967);
  });

  it('associe la plate-forme au binaire officiel et refuse macOS (aucun binaire publié)', () => {
    expect(whisperPlatform('linux', 'x64')).toBe('linux-x64');
    expect(getWhisperEngineAsset('win32', 'x64')?.binaryName).toBe('whisper-cli.exe');
    expect(getWhisperEngineAsset('linux', 'arm64')?.archive).toBe('tar.gz');
    expect(getWhisperEngineAsset('darwin', 'arm64')).toBeNull();
    expect(getWhisperEngineAsset('freebsd', 'x64')).toBeNull();
    expect(unsupportedPlatformMessage('darwin', 'arm64')).toMatch(/macOS \(arm64\)/);
    expect(unsupportedPlatformMessage('win32', 'ia32')).toMatch(/Windows/);
    expect(unsupportedPlatformMessage('linux', 'ppc64')).toMatch(/Linux/);
    expect(unsupportedPlatformMessage('aix', 'ppc64')).toMatch(/aix/);
  });
});

describe('validation SHA-256', () => {
  const h = 'a'.repeat(64);
  it('compare sans tenir compte de la casse', () => {
    expect(sha256Matches(h, h.toUpperCase())).toBe(true);
    expect(sha256Matches(h, 'b'.repeat(64))).toBe(false);
  });
  it('refuse une empreinte attendue absente ou mal formée (jamais d’empreinte inventée)', () => {
    expect(sha256Matches(h, null)).toBe(false);
    expect(sha256Matches(h, undefined)).toBe(false);
    expect(sha256Matches(h, 'à-remplir')).toBe(false);
    expect(sha256Matches('zz', h)).toBe(false);
    expect(isSha256Hex(42)).toBe(false);
  });
});

describe('choix du modèle et réglages', () => {
  it('prend le modèle préféré, sinon le plus léger installé, sinon rien', () => {
    expect(selectWhisperModel('small', ['base', 'small'])).toBe('small');
    expect(selectWhisperModel('small', ['base'])).toBe('base');
    expect(selectWhisperModel('base', ['small'])).toBe('small');
    expect(selectWhisperModel('base', [])).toBeNull();
  });
  it('recommande selon la mémoire vive', () => {
    expect(recommendWhisperModel(4 * 1024 ** 3)).toBe('base');
    expect(recommendWhisperModel(16 * 1024 ** 3)).toBe('small');
  });
  it('valide identifiants, langues et nombre de fils', () => {
    expect(isWhisperModelId('base')).toBe(true);
    expect(isWhisperModelId('large')).toBe(false);
    expect(isWhisperModelId('toString')).toBe(false);
    expect(isWhisperLanguage('fr')).toBe(true);
    expect(isWhisperLanguage('fr; rm -rf')).toBe(false);
    expect(whisperThreads(1)).toBe(1);
    expect(whisperThreads(4)).toBe(3);
    expect(whisperThreads(64)).toBe(8);
    expect(whisperThreads(Number.NaN)).toBe(1);
  });
});

describe('arguments ffmpeg et whisper (tableaux, chemins absolus)', () => {
  it('convertit en WAV 16 kHz mono', () => {
    const args = buildAudioExtractArgs('/media/vidéo.mp4', '/tmp/x/audio.wav');
    expect(args.join(' ')).toContain('-ac 1 -ar 16000 -c:a pcm_s16le');
    expect(args.at(-1)).toBe('/tmp/x/audio.wav');
    expect(args[args.indexOf('-i') + 1]).toBe('/media/vidéo.mp4');
    expect(buildAudioExtractArgs('C:\\Media\\a.mp4', 'C:\\t\\a.wav')).toContain('C:\\Media\\a.mp4');
  });
  it('refuse les chemins relatifs, les options déguisées et les caractères de contrôle', () => {
    expect(() => buildAudioExtractArgs('-i', '/tmp/a.wav')).toThrow(WhisperArgsError);
    expect(() => buildAudioExtractArgs('relatif.mp4', '/tmp/a.wav')).toThrow(/source/);
    expect(() => buildAudioExtractArgs('/a.mp4', '/tmp/a\n.wav')).toThrow(WhisperArgsError);
    expect(isAbsolutePath('\\\\serveur\\partage')).toBe(true);
    expect(isAbsolutePath('./a')).toBe(false);
  });
  it('construit la commande whisper-cli avec sortie SRT et progression', () => {
    const args = buildWhisperArgs({ modelPath: '/d/ggml-base.bin', wavPath: '/t/a.wav', outputBase: '/t/out', language: 'auto', threads: 3 });
    expect(args).toEqual(['-m', '/d/ggml-base.bin', '-f', '/t/a.wav', '-l', 'auto', '-t', '3', '-osrt', '-of', '/t/out', '-pp']);
    expect(buildWhisperArgs({ modelPath: '/m', wavPath: '/w', outputBase: '/o', language: 'fr', threads: 0 })).toContain('1');
    expect(() => buildWhisperArgs({ modelPath: '/m', wavPath: '/w', outputBase: '/o', language: 'xx', threads: 2 })).toThrow(/Langue/);
    expect(() => buildWhisperArgs({ modelPath: 'm', wavPath: '/w', outputBase: '/o', language: 'fr', threads: 2 })).toThrow(/modèle/);
  });
});

describe('lecture de la sortie whisper', () => {
  it('lit la progression et la langue détectée', () => {
    expect(parseWhisperProgress('whisper_print_progress_callback: progress =  45%')).toBe(45);
    expect(parseWhisperProgress('progress = 250%')).toBeNull();
    expect(parseWhisperProgress('[00:00:00.000 --> 00:00:02.000] Bonjour')).toBeNull();
    expect(parseWhisperDetectedLanguage('whisper_full_with_state: auto-detected language: FR (p = 0.98)')).toBe('fr');
    expect(parseWhisperDetectedLanguage('rien')).toBeNull();
  });
  it('convertit le SRT en répliques en retirant les jetons de silence', () => {
    const srt = '1\n00:00:00,000 --> 00:00:02,000\n Bonjour à tous.\n\n2\n00:00:02,000 --> 00:00:05,000\n [BLANK_AUDIO]\n\n3\n00:00:31,000 --> 00:00:33,500\n Deuxième partie [BLANK_AUDIO] ici.\n';
    const cues = parseWhisperSrt(srt);
    expect(cues).toEqual([
      { start: 0, text: 'Bonjour à tous.' },
      { start: 31, text: 'Deuxième partie ici.' },
    ]);
  });
  it('produit le même Markdown horodaté que les sous-titres, avec une mention honnête', () => {
    const cues = parseWhisperSrt('1\n00:00:01,000 --> 00:00:02,000\nSalut\n');
    const md = buildTranscript(cues, { title: 'Démo', source: 'https://exemple.fr/v', lang: 'fr', note: whisperTranscriptNote('base') });
    expect(md).toContain('# Démo');
    expect(md).toContain('> Transcription automatique générée sur cet ordinateur par whisper.cpp (modèle base)');
    expect(md).toContain('**[00:01]** Salut');
    // Sans mention : format inchangé.
    expect(buildTranscript(cues, { title: 'D', source: 's', lang: 'fr' })).not.toContain('>');
  });
  it('fournit un message français pour chaque code d’erreur', () => {
    for (const msg of Object.values(TRANSCRIPTION_MESSAGES)) expect(msg.length).toBeGreaterThan(10);
  });
});
