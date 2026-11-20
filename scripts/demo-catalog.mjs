/**
 * Produits fictifs des pages de test et des visuels. Aucune vraie commande ne doit
 * apparaître dans le dépôt ni sur le Store : un historique d'achats est personnel,
 * et il peut contenir des cadeaux.
 *
 * Une entrée par carte de commande, dans l'ordre de la page ; une ligne par article.
 * L'histoire des visuels : Leo offre le coffret de thés à Emma (carte 2),
 * Emma offre le jeu de société à Leo (carte 3).
 */
export const CATALOG = [
  [{ img: 'filter', fr: 'Filtres de rechange pour aspirateur balai, lot de 2, lavables et réutilisables', en: 'Replacement Filters for Stick Vacuum, 2-Pack, Washable and Reusable' }],
  [{ img: null, fr: 'Abonnement streaming', en: 'Streaming subscription' }],
  [{ img: 'tea', fr: 'Coffret de thés du monde, 24 sachets dans une boîte en bois', en: 'World Tea Gift Box, 24 Tea Bags in a Wooden Case' }],
  [
    { img: 'game', fr: 'Jeu de société L’Île aux Lucioles, coopératif, à partir de 8 ans', en: 'Firefly Island Board Game, Cooperative, Ages 8+' },
    { img: 'game-exp', fr: 'L’Île aux Lucioles : extension Marée haute', en: 'Firefly Island: High Tide Expansion' },
  ],
  [
    { img: 'book-cook', fr: 'Cuisine du quotidien : 120 recettes simples et de saison', en: 'Everyday Cooking: 120 Simple Seasonal Recipes' },
    { img: 'book-garden', fr: 'Le Petit Guide du jardin en pot', en: 'The Little Guide to Container Gardening' },
  ],
  [{ img: 'phone-mount', fr: 'Support de téléphone pour vélo, étanche, rotation 360°', en: 'Waterproof Bike Phone Mount, 360° Rotation' }],
  [{ img: 'towels', fr: 'Lot de 6 torchons en coton', en: 'Cotton Tea Towels, 6-Pack' }],
  [{ img: 'lamp', fr: 'Lampe de bureau LED, 3 intensités', en: 'LED Desk Lamp, 3 Brightness Levels' }],
  [{ img: 'mug', fr: 'Tasse isotherme 350 ml, inox', en: 'Insulated Travel Mug, 12 oz, Stainless Steel' }],
  [
    { img: 'blanket', fr: 'Plaid en polaire 130 × 170 cm', en: 'Fleece Throw Blanket, 50 × 60 in' },
    { img: 'pillow', fr: 'Coussin déco 45 × 45 cm', en: 'Decorative Pillow, 18 × 18 in' },
  ],
];

/** Prénoms des visuels et des pages de test (« Commandé par »). */
export const PEOPLE = ['Emma', 'Leo'];
