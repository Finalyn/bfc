export interface FournisseurConfig {
  id: string;
  nom: string;
  nomComplet: string;
  adresse?: string;
  siret?: string;
  tva?: string;
  email?: string;
  tel?: string;
  themes: {
    categorie: string;
    items: string[];
  }[];
  cgv: string;
}

export const FOURNISSEURS_CONFIG: FournisseurConfig[] = [
  {
    id: "BDIS",
    nom: "BDIS",
    nomComplet: "B DIS BOISSELLERIE DISTRIBUTION",
    themes: [
      {
        categorie: "TOUTE L'ANNÉE",
        items: [
          "MENAGER / PATISSERIE",
          "FOIRE TOP VENTE",
          "BRICOLAGE",
          "RANGEMENT / ENTRETIEN",
          "HIGH TECH",
          "CHAUSSETTES",
          "SENTEUR",
          "COLORIAGE",
          "SPORT",
          "ANIMAUX",
          "SUPPORTER",
        ],
      },
      {
        categorie: "SAISONNIER",
        items: [
          "JARDIN",
          "PÂQUES",
          "BARBECUE",
          "MAILLOT DE BAIN",
          "JOUETS ÉTÉ",
          "CITRONNELLE",
          "RENTREE DES CLASSES",
          "HALLOWEEN",
          "TEXTILE HIVER",
          "CHAUSSETTES HIVER",
          "NOEL",
          "DECO DE TABLE",
        ],
      },
    ],
    cgv: `CONDITIONS GÉNÉRALES DE VENTE BDIS 2026

1. Champ d'application
Toutes nos opérations commerciales sont soumises aux présentes conditions générales.

2. Mise en place
Les présentoirs devront être exposés dans le magasin en allée centrale.
Les produits sont étiquetés avec code-barres et prix de vente TTC.

3. Propriété des marchandises
Les marchandises restent la propriété de BDIS jusqu'à leur règlement complet.

4. Reprise des invendus
Reprise intégrale des invendus en fin de promotion.
Comptage effectué par nos soins.

5. Conditions de paiement
Règlement à réception de facture.
Pénalités de retard conformément à l'article L441-10 du Code de commerce.`,
  },
  {
    id: "VDH",
    nom: "VDH Lots",
    nomComplet: "VDH Lots",
    adresse: "Rue de l'Epau, 59230 Sars et Rosières",
    tva: "FR 91 434 237 954",
    email: "contact@vdh-lots.fr",
    themes: [
      {
        categorie: "PRODUITS",
        items: [
          "PRÉSENTOIR STANDARD",
          "PRÉSENTOIR PREMIUM",
          "BOX DÉCOUVERTE",
        ],
      },
    ],
    cgv: `CONDITIONS GÉNÉRALES VDH LOTS 2026
Vente avec reprise totale des invendus

1. Champ d'application
Toutes nos opérations commerciales sont soumises aux présentes conditions générales, sauf dérogation formelle et expresse accordée par écrit par la société VDH Lots.

2. Engagement du dépositaire
Le dépositaire s'engage à placer les présentoirs pour une durée minimale de trois (3) semaines dans l'allée centrale du magasin.

3. Mise en place et conditions de vente
Les présentoirs devront être exposés dans le magasin au plus tard dans les soixante-douze (72) heures suivant la date de livraison.
Les produits fournis par VDH Lots sont étiquetés avec un code-barres, une référence article et un prix de vente public TTC fixé contractuellement.
Le coefficient appliqué au prix de vente magasin est de 1,50.
Les frais de transport aller et retour sont à la charge de VDH Lots (hors Corse).

4. Propriété des matériels et marchandises
Tous les matériels, marchandises ou accessoires confiés au dépositaire restent la propriété exclusive de VDH Lots.

5. Prix de vente public
Les articles sont étiquetés avec un prix de vente public TTC fixé contractuellement.
Toute modification non autorisée de ces prix par le dépositaire entraînera une facturation complémentaire de 1,00 € HT par article.

6. Conditions de paiement
En cas de retard de paiement, pénalités calculées conformément à l'article L441-10 du Code de commerce : taux directeur BCE majoré de dix (10) points.
Indemnité forfaitaire de recouvrement : 40,00 €.

7. Annulation de commande
Toute annulation doit être notifiée par mail à contact@vdh-lots.fr au plus tard six (6) jours ouvrables avant la date de livraison prévue.

8. Refus ou non-exposition
Tout refus injustifié de livraison ou palette non exposée : forfait transport de 200 € HT/palette.

9. Invendus
Au-delà de 90 jours à compter de la livraison, aucun retour d'invendus ne sera accepté.

10. Compétence juridictionnelle
Tribunal de commerce de Valenciennes.`,
  },
  {
    id: "COTTREAU",
    nom: "Éditions G. Cottreau",
    nomComplet: "Éditions G. Cottreau",
    adresse: "9, rue de la Croix Blanche, BP 70002 Pringy, 77981 St-Fargeau-Pthierry Cedex",
    siret: "972 201 594 00033",
    tva: "FR64 972 201 594",
    email: "contact@editionscottreau.com",
    tel: "01 64 09 91 50",
    themes: [
      {
        categorie: "BOX PRESSE",
        items: [
          "Box 100% Enfant (CA potentiel: 1 300€)",
          "Box Adulte – Presse – Jeux (CA potentiel: 1 400€)",
          "Le Mixte (CA potentiel: 1 350€)",
          "100% Jeux en complément (CA potentiel: 900€)",
        ],
      },
    ],
    cgv: `PROTOCOLE DE COMMANDE - ÉDITIONS G. COTTREAU
PRESSE BOX AVEC REPRISE

OBLIGATIONS DU VENDEUR
• Marchandise livrée sur Box présentoir.
• Mise à disposition de la marchandise 4 semaines en magasin minimum à compter de la livraison.
• Reprise intégrale des invendus en fin de promotion.
• Comptage en fin d'opération par nos soins (avec contrôle en magasin).
• Envoi d'un transporteur après comptage dans un délai de 5 jours.
• Remise d'un BON DE LIVRAISON à l'expédition.
• Édition de la FACTURE en fin de promotion après retour de la marchandise.
• Livraison et Reprise en Franco de port.
• Prix de vente étiquetés (PVP et Gencod).

OBLIGATIONS DE L'ACHETEUR
• Mettre en vente tous les produits durant 30 jours minimum.
• Placer les marchandises en ALLÉE CENTRALE.
• Les marchandises restent la propriété du vendeur jusqu'à complet paiement du prix (loi N°80336 du 12 mai 1980).
• L'acheteur s'engage à payer le prix convenu dans le cas où la marchandise serait endommagée ou détruite.
• En cas de litige, le Tribunal de Commerce de Melun est seul compétent.
• Le magasin s'engage à nous fournir le bordereau d'enlèvement attestant l'enlèvement des palettes en fin d'opération.
• Règlement à réception de facture.

En cas de refus d'une foire ou de sa non mise en vente, les frais de livraison et de retour seront à la charge du client.`,
  },
  {
    id: "SIROCO",
    nom: "SIROCO",
    nomComplet: "SIROCO SAS",
    adresse: "BP 30 - ZA de Champagne - 07305 TOURNON / RHONE cedex",
    siret: "519 083 158 00039",
    tva: "FR40519083158",
    email: "contact@siroco-box.fr",
    tel: "04 75 08 63 60",
    themes: [
      {
        categorie: "OPÉRATIONS SAISONNIÈRES",
        items: [
          "CHANDELEUR (S1 à S4)",
          "BBQ PARTY (S12 à S33)",
          "KILL INSECT 1/2 (S12 à S33)",
          "KILL INSECT maxi palette (S12 à S33)",
          "TOUS À LA PLAGE 1/2 (S12 à S33)",
          "TOUS À LA PLAGE (S12 à S33)",
          "HAPPY HALLOWEEN (S38 à S42)",
          "DÉGUISEMENT HALLOWEEN (S38 à S42)",
          "JOYEUX NOËL (S45 à S51)",
        ],
      },
      {
        categorie: "OPÉRATIONS PERMANENTES",
        items: [
          "SHOP'IN 1 (S1 à S17)",
          "SHOP'IN 2 (S34 à S52)",
          "C'EST PRATIQUE 1 (S9 à S17)",
          "C'EST PRATIQUE 2 (S35 à S39)",
          "ULTRA PROPRE 1 (S1 à S9)",
          "ULTRA PROPRE 2 (S36 à S39)",
          "C'EST VOUS LE CHEF 1 (S1 à S18)",
          "C'EST VOUS LE CHEF 2 (S36 à S39)",
          "BOX BRICO 1 (S1 à S13)",
          "BOX BRICO 2 1/2 (S34 à S48)",
          "BOXELEC 1 (S1 à S13)",
          "BOXELEC 2 1/2 (S34 à S48)",
        ],
      },
    ],
    cgv: `CONDITIONS GÉNÉRALES DE VENTE SIROCO

• Durée de la foire : 3 semaines minimum.
• Reprise intégrale des invendus.
• Comptage invendus par nos soins.
• Pour toute palette non mise en vente ou refusée, les frais de transport et de souffrance seront facturés à la charge exclusive du magasin (minimum 150€ par palette).

MODALITÉS
• Toutes nos opérations commerciales sont soumises aux présentes conditions générales.
• Toute commande implique l'adhésion sans réserves aux présentes conditions générales de vente.
• Les opérations foires sont livrées en franco de port.
• Les délais de livraison sont donnés à titre indicatif.

PROPRIÉTÉ
• Les produits vendus sont sous réserve de propriété.
• Tous les matériels, présentoirs, marchandises confiés au dépositaire restent notre entière propriété.
• Le dépositaire devra assurer à ses frais les marchandises contre le vol, l'incendie et tout dommage.

PRIX ET PAIEMENT
• Prix de vente étiquetés pour les foires avec reprise d'invendu.
• Le dépositaire est tenu de vendre au tarif SIROCO. Tout changement d'étiquette annule la reprise.
• Facturation à la reprise des invendus.
• La date d'échéance est le dixième jour à compter de la date de facturation.
• Aucun escompte pour règlement anticipé.

Tout retard de règlement entraînera des pénalités égales à une fois et demi le taux d'intérêt légal.
Tous les paiements sont réputés être effectués à Tournon sur Rhône.
En cas de litige, le tribunal de commerce d'Aubenas est le seul compétent.`,
  },
  {
    id: "MAEVA",
    nom: "MAEVA Créations",
    nomComplet: "MAEVA Créations",
    adresse: "880 ZI la plaine - 01580 IZERNORE",
    email: "marketing@maevacreations.fr",
    tel: "05.56.49.39.31",
    themes: [
      {
        categorie: "PLANTAINER TOUSSAINT",
        items: [
          "Plantainer Toussaint - Compositions (env. 110 pièces)",
          "Plantainer Toussaint - Bouquets & Résines (env. 60 pièces)",
        ],
      },
    ],
    cgv: `RÉSERVATION / PRÉ-COMMANDE MAEVA CRÉATIONS
PLANTAINER TOUSSAINT 2026 - DÉPÔT VENTE

CONDITIONS DE LIVRAISON
• Date de livraison : à partir du 14 septembre et au plus tard le 01 octobre 2026
• Tous les Produits sont gencodés et étiquetés (désignation, prix de vente public)
• Offre proposée sur Plantainer (Box palette) Bois 5 étages - 80*120 cm renforcé

CONDITIONS COMMERCIALES
• Franco de Port aller/retour
• Facturation et Avoir des produits établi après réception et contrôle du retour
• Délais de règlement : À réception de l'avoir

REMISES COMMERCIALES
• En cas de non retour de marchandise : Remise commerciale de 15% sur facture

REPRISE DES INVENDUS
• Inventaire et comptage réalisé par BFC et transmis à MAEVA CRÉATIONS à partir du 12 novembre et avant le 23 novembre 2026
• Non reprise des produits dégradés/cassés
• Retour EXCLUSIVEMENT des produits de cette opération sur Présentoir Bois MAEVA CRÉATIONS
• En cas de retour sur un autre support : facturation du Présentoir : 35€ HT
• Enlèvement des invendus par le transporteur du Fournisseur
• Reprise des invendus avant le 4/12/2026 impératif`,
  },
  {
    id: "NAYATS",
    nom: "NAYATS",
    nomComplet: "SARL NAYATS",
    adresse: "Z.I Les Loges, 85400 CHASNAIS",
    siret: "447 563 297 00012",
    tva: "FR92 447 563 297",
    email: "sarlnayats@gmail.com",
    tel: "02.51.56.62.25",
    themes: [
      {
        categorie: "BAZAR - VENTE FERME",
        items: [
          "Palette 68 Tabourets bois tamarin (24,90€)",
          "Palette 48 Tabourets bois tamarin (24,90€)",
        ],
      },
      {
        categorie: "BAZAR - DÉPÔT VENTE",
        items: [
          "Carillon à vent H55/D8 - 140 pcs (9,90€)",
          "Porte Clefs Tissu Animal - 100 pcs (4,90€)",
          "Mobile Tissu 3 Animaux + Perles - 100 pcs (9,90€)",
          "Eventail coton & bambou - 150 pcs (5,90€)",
          "Coussin de Yoga/Méditation kapok - 30 pcs (18,90€)",
        ],
      },
    ],
    cgv: `BON DE COMMANDE NAYATS - BAZAR

CONDITIONS GÉNÉRALES
• Meubles présentoirs consignés
• Si pas de retour, facturation :
  - Grand présentoir : 140€ TTC
  - Moyen présentoir : 160€ TTC
  - Petit présentoir : 110€ TTC
  - Tourniquet : 70€ TTC

QUANTITÉS FRANCO DE PORT
• Porte clefs / mobile : 100 pièces minimum
• Carillons : 140 pièces minimum

IMPORTANT
• Aucune reprise d'invendus si PVC non appliqué

CONDITIONS DE PAIEMENT
• Vente ferme : 30 jours fin de mois
• Dépôt vente : paiement comptant à la fin du dépôt vente`,
  },
];

export function getFournisseurConfig(fournisseurId: string): FournisseurConfig | undefined {
  return FOURNISSEURS_CONFIG.find((f) => f.id === fournisseurId);
}

export function getFournisseurThemes(fournisseurId: string): { categorie: string; items: string[] }[] {
  const config = getFournisseurConfig(fournisseurId);
  return config?.themes || [];
}

export function getFournisseurCGV(fournisseurId: string): string {
  const config = getFournisseurConfig(fournisseurId);
  return config?.cgv || "";
}
