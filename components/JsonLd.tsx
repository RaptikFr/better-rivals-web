import { siteUrl } from '@/lib/site';

// Données structurées schema.org (JSON-LD) pour Google.
// Les noms de circuits/voitures/pseudos viennent des joueurs : `<` est échappé
// pour qu'un nom contenant « </script> » ne puisse pas sortir de la balise.
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

/** Fil d'Ariane schema.org à partir de couples [libellé, chemin relatif]. */
export function filAriane(etapes: [nom: string, chemin: string][]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: etapes.map(([name, chemin], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: `${siteUrl}${chemin}`,
    })),
  };
}

/** Liste schema.org des records d'une page (une entrée par config classée). */
export function listeRecords(nom: string, records: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: nom,
    numberOfItems: records.length,
    itemListElement: records.map((name, i) => ({ '@type': 'ListItem', position: i + 1, name })),
  };
}
