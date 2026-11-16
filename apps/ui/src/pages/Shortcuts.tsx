import { Keyboard } from 'lucide-react';

/** Seuls les raccourcis réellement implémentés sont listés. */
const GROUPS: Array<{ title: string; items: Array<[string, string[]]> }> = [
  {
    title: 'Navigation',
    items: [
      ['Aller au convertisseur et viser le champ', ['Ctrl', 'K']],
      ['Accueil', ['G', 'puis', 'H']],
      ['Téléchargements', ['G', 'puis', 'D']],
      ['Bibliothèque', ['G', 'puis', 'B']],
      ['Paramètres', ['G', 'puis', 'S']],
      ['Raccourcis', ['?']],
    ],
  },
  {
    title: 'Convertisseur',
    items: [
      ['Coller un lien n’importe où : analyse automatique', ['Ctrl', 'V']],
      ['Analyser le lien saisi', ['Entrée']],
    ],
  },
  {
    title: 'Lecteur',
    items: [
      ['Lecture / pause', ['Espace']],
      ['Reculer de 10 s', ['J']],
      ['Avancer de 10 s', ['L']],
      ['Couper / rétablir le son', ['M']],
    ],
  },
];

export function ShortcutsPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow flex items-center gap-1.5"><Keyboard className="h-3.5 w-3.5" /> Utilisable entièrement au clavier</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Raccourcis clavier</h1>
        <p className="mt-1">Sur Mac, remplacez Ctrl par ⌘.</p>
      </header>
      <div className="grid gap-5 md:grid-cols-3">
        {GROUPS.map((g) => (
          <section key={g.title} className="card p-6" aria-labelledby={`sc-${g.title}`}>
            <h2 id={`sc-${g.title}`} className="text-lg font-bold">{g.title}</h2>
            <dl className="mt-4 space-y-3">
              {g.items.map(([label, keys]) => (
                <div key={label} className="flex items-center justify-between gap-3 text-sm">
                  <dt>{label}</dt>
                  <dd className="flex shrink-0 items-center gap-1">
                    {keys.map((k, i) =>
                      k === 'puis' ? <span key={i} className="text-xs">puis</span> : (
                        <kbd key={i} className="min-w-[28px] rounded-lg border border-hairline bg-surface px-2 py-1 text-center font-display text-xs font-bold text-ink shadow-sm">{k}</kbd>
                      ),
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <p className="text-sm">Interface en ligne de commande et personnalisation des raccourcis : prévues dans une version ultérieure.</p>
    </div>
  );
}
