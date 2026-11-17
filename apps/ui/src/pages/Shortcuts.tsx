import { PageHeader } from '../components/Shell';

/** Seuls les raccourcis réellement implémentés sont listés. */
const GROUPS: Array<{ title: string; items: Array<[string, string[]]> }> = [
  {
    title: 'Navigation',
    items: [
      ['Aller au convertisseur et viser le champ', ['Ctrl', 'K']],
      ['Accueil', ['G', 'puis', 'H']],
      ['Téléchargements', ['G', 'puis', 'D']],
      ['Bibliothèque', ['G', 'puis', 'B']],
      ['Abonnements', ['G', 'puis', 'A']],
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
    <div className="space-y-10">
      <PageHeader title="Raccourcis clavier" lead="Toute l’application s’utilise au clavier. Sur Mac, remplacez Ctrl par ⌘." />
      <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        {GROUPS.map((g) => (
          <section key={g.title} aria-labelledby={`sc-${g.title}`}>
            <h2 id={`sc-${g.title}`} className="text-lead font-semibold">{g.title}</h2>
            <dl className="mt-3 divide-y divide-hairline border-y border-hairline">
              {g.items.map(([label, keys]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-2.5 text-small">
                  <dt>{label}</dt>
                  <dd className="flex shrink-0 items-center gap-1.5">
                    {keys.map((k, i) =>
                      k === 'puis' ? <span key={i} className="text-meta">puis</span> : <kbd key={i} className="kbd">{k}</kbd>,
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <p className="text-small">La personnalisation des raccourcis et une interface en ligne de commande sont prévues dans une version ultérieure.</p>
    </div>
  );
}
