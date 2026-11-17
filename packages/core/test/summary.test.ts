import { describe, expect, it } from 'vitest';
import {
  OLLAMA_DEFAULT_URL,
  SUMMARY_MESSAGES,
  buildMergePrompt,
  buildSummaryMarkdown,
  buildSummaryPrompt,
  cleanModelOutput,
  isLoopbackUrl,
  isOllamaModelName,
  parseOllamaTags,
  splitForSummary,
  summaryPathFor,
  transcriptToPlainText,
} from '../src/index.js';

describe('Ollama local uniquement', () => {
  it('n’accepte que la boucle locale en http', () => {
    expect(isLoopbackUrl(OLLAMA_DEFAULT_URL)).toBe(true);
    expect(isLoopbackUrl('http://localhost:11434')).toBe(true);
    expect(isLoopbackUrl('http://[::1]:11434')).toBe(true);
    expect(isLoopbackUrl('http://127.5.0.1:1')).toBe(true);
    expect(isLoopbackUrl('https://api.ollama.com')).toBe(false);
    expect(isLoopbackUrl('http://192.168.1.10:11434')).toBe(false);
    expect(isLoopbackUrl('http://127.0.0.1.evil.com:11434')).toBe(false);
    expect(isLoopbackUrl('http://user:pw@127.0.0.1:11434')).toBe(false);
    expect(isLoopbackUrl('pas une url')).toBe(false);
  });

  it('lit la liste des modèles installés et écarte les modèles d’embedding', () => {
    const models = parseOllamaTags({
      models: [
        { name: 'mistral:7b', size: 4_100_000_000, details: { parameter_size: '7.2B' } },
        { model: 'llama3.2:3b' },
        { name: 'nomic-embed-text:latest', size: 1 },
        { name: '../etc/passwd; rm' },
        null,
      ],
    });
    expect(models).toEqual([
      { name: 'llama3.2:3b', sizeBytes: null, parameterSize: null },
      { name: 'mistral:7b', sizeBytes: 4_100_000_000, parameterSize: '7.2B' },
    ]);
    expect(parseOllamaTags(null)).toEqual([]);
    expect(parseOllamaTags({ models: 'x' })).toEqual([]);
    expect(isOllamaModelName('qwen2.5:3b')).toBe(true);
    expect(isOllamaModelName('-rf')).toBe(false);
  });
});

describe('préparation du texte', () => {
  const md = '# Titre\n\nSource : https://x  \nLangue : fr\n\n> Transcription automatique\n\n**[00:00]** Bonjour.\n\n**[00:31]** Suite.\n';
  it('garde les paragraphes horodatés en texte brut', () => {
    expect(transcriptToPlainText(md)).toBe('[00:00] Bonjour.\n[00:31] Suite.');
  });
  it('découpe les longs textes sans perdre de contenu', () => {
    const text = Array.from({ length: 50 }, (_, i) => `[${i}] ${'mot '.repeat(40)}`).join('\n');
    const parts = splitForSummary(text, 1000);
    expect(parts.length).toBeGreaterThan(5);
    expect(parts.every((p) => p.length <= 1000)).toBe(true);
    expect(parts.join('\n')).toBe(text);
    expect(splitForSummary('court', 10_000)).toEqual(['court']);
    const long = 'x'.repeat(1200);
    expect(splitForSummary(`a\n${long}`, 500)).toEqual(['a', 'x'.repeat(500), 'x'.repeat(500), 'x'.repeat(200)]);
  });
});

describe('consignes de résumé en français', () => {
  it('encadre la transcription et interdit l’invention', () => {
    const p = buildSummaryPrompt({ title: 'Conférence', text: '[00:00] Bonjour' });
    expect(p).toContain('Réponds uniquement en français');
    expect(p).toContain('n’invente aucun fait');
    expect(p).toContain('## Points clés');
    expect(p).toContain('<<<TRANSCRIPTION\n\n[00:00] Bonjour\n\nTRANSCRIPTION>>>');
    expect(p).toContain('Voici la transcription complète.');
  });
  it('gère les parties et la fusion', () => {
    expect(buildSummaryPrompt({ title: 'T', text: 'a', part: 2, total: 3 })).toContain('partie 2 sur 3');
    const merged = buildMergePrompt({ title: 'T', partials: ['- a', '- b'] });
    expect(merged).toContain('### Partie 2\n- b');
    expect(merged).toContain('à fusionner');
  });
  it('nettoie la sortie du modèle et écrit le fichier final', () => {
    expect(cleanModelOutput('<think>réflexion</think>\n## En bref\nOk')).toBe('## En bref\nOk');
    expect(cleanModelOutput('<think>coupé')).toBe('');
    const out = buildSummaryMarkdown({ title: 'T', model: 'mistral:7b', summary: '## En bref\nOk', source: 'https://x', date: new Date('2026-11-17T10:00:00Z') });
    expect(out).toContain('# Résumé : T');
    expect(out).toContain('Modèle : mistral:7b (Ollama, exécuté sur cet ordinateur) — 2026-11-17');
    expect(out).toContain('vérifiez les informations importantes');
    expect(buildSummaryMarkdown({ title: 'T', model: 'm', summary: 's', source: 'x' })).toContain('# Résumé');
  });
  it('enregistre le résumé à côté de la transcription', () => {
    expect(summaryPathFor('/d/Vidéo [id].transcription.md')).toBe('/d/Vidéo [id].resume.md');
    expect(summaryPathFor('/d/notes.md')).toBe('/d/notes.resume.md');
    expect(Object.keys(SUMMARY_MESSAGES)).toContain('unavailable');
  });
});
