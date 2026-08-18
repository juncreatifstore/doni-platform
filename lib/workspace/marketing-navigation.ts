export type MarketingSectionKey='overview'|'acquisition'|'ai'|'campaigns'|'content'|'analytics';
export type MarketingTool={href:string;icon:string;label:string;description:string;minimum?:'ADMIN'|'SUPER_ADMIN'};
export type MarketingSection={key:MarketingSectionKey;href:string;icon:string;label:string;description:string;tools:MarketingTool[]};

export const MARKETING_SECTIONS:MarketingSection[]=[
 {key:'overview',href:'/marketing/sections/overview',icon:'⌂',label:'Vue d’ensemble',description:'Pilotage global, direction et état de préparation du marketing.',tools:[
  {href:'/marketing',icon:'◇',label:'Dashboard marketing',description:'Vue générale des activités et indicateurs marketing.'},
  {href:'/marketing/command-center',icon:'◎',label:'Marketing Command Center',description:'Centre de commandement et état opérationnel des moteurs marketing.'},
  {href:'/marketing/executive',icon:'◆',label:'Cockpit exécutif',description:'Vue direction et synthèse décisionnelle.',minimum:'ADMIN'},
  {href:'/marketing/readiness',icon:'✓',label:'Marketing V1 Readiness',description:'Contrôles de préparation et points à finaliser.'}
 ]},
 {key:'acquisition',href:'/marketing/sections/acquisition',icon:'🎯',label:'Acquisition',description:'Détection de demande, prospects, opportunités et récupération de réservations.',tools:[
  {href:'/marketing/leads',icon:'◎',label:'Leads & Prospects',description:'Gestion des prospects et opportunités commerciales.'},
  {href:'/marketing/search-intelligence',icon:'⌕',label:'Search Intelligence',description:'Analyse des recherches et intention de voyage.'},
  {href:'/marketing/abandoned-bookings',icon:'↺',label:'Abandoned Booking Recovery',description:'Récupération contrôlée des réservations abandonnées.'},
  {href:'/marketing/live-offers',icon:'⚡',label:'Live Offers Engine',description:'Offres vérifiées et opportunités tarifaires en temps réel.'},
  {href:'/marketing/insights',icon:'◉',label:'Veille & Insights',description:'Tendances, signaux marché et observations marketing.'},
  {href:'/marketing/partnerships',icon:'◆',label:'Partenariats & Terrain',description:'Partenariats, actions terrain et développement de canaux.'}
 ]},
 {key:'ai',href:'/marketing/sections/ai',icon:'✦',label:'DONI AI',description:'Intelligence marketing, automatisation contrôlée et apprentissage.',tools:[
  {href:'/marketing/ai-copilot',icon:'✦',label:'DONI Marketing AI Copilot',description:'Recommandations, priorisation et préparation de campagnes.'},
  {href:'/marketing/autopilot',icon:'⇥',label:'Marketing Autopilot contrôlé',description:'Workflow avec approbation humaine avant toute publication.'},
  {href:'/marketing/publisher-control',icon:'◉',label:'Publisher Control Center',description:'Supervision des publications et exécutions marketing.'},
  {href:'/marketing/learning-loop',icon:'∞',label:'Marketing Learning Loop',description:'Apprentissages validés issus des performances réelles.'},
  {href:'/marketing/experiments',icon:'A',label:'Controlled Experiments',description:'Tests contrôlés et comparaison de variantes sans auto-promotion.'}
 ]},
 {key:'campaigns',href:'/marketing/sections/campaigns',icon:'📣',label:'Campagnes & Ads',description:'Création, publication, diffusion et supervision des campagnes payantes.',tools:[
  {href:'/marketing/campaigns',icon:'%',label:'Campagnes & Ads',description:'Création et gestion des campagnes marketing.'},
  {href:'/marketing/meta-ads-publisher',icon:'%',label:'Meta Ads Publisher',description:'Création Meta Campaign, Ad Set, Creative et Ad en PAUSED.'},
  {href:'/marketing/meta-ads-launch',icon:'▶',label:'Meta Ads Launch Control',description:'Autorisation humaine et activation contrôlée des campagnes Meta.'},
  {href:'/marketing/meta-ads-performance',icon:'↗',label:'Meta Ads Performance',description:'Dépense, impressions, clics, CTR, CPC et garde-fous budget.'},
  {href:'/marketing/channels',icon:'≋',label:'Canaux & Réponse',description:'Suivi des canaux marketing et de leurs réponses.'},
  {href:'/marketing/attribution',icon:'⇢',label:'Attribution ventes',description:'Relier les campagnes aux ventes et conversions.'}
 ]},
 {key:'content',href:'/marketing/sections/content',icon:'🎨',label:'Contenu & Audience',description:'Création de contenu, publication, réputation et fidélisation.',tools:[
  {href:'/marketing/content',icon:'▦',label:'Calendrier contenu',description:'Planification éditoriale et calendrier de contenu.'},
  {href:'/marketing/studio',icon:'✦',label:'Studio de contenu',description:'Préparation et création des contenus marketing.'},
  {href:'/marketing/publishing',icon:'⇧',label:'File de publication',description:'Contenus planifiés et en attente de publication.'},
  {href:'/marketing/assets',icon:'□',label:'Bibliothèque assets',description:'Images, médias et ressources de marque.'},
  {href:'/marketing/reviews',icon:'★',label:'Avis & Réputation',description:'Suivi de la réputation et des avis clients.'},
  {href:'/marketing/referrals',icon:'↻',label:'Parrainage & Fidélisation',description:'Programmes de recommandation et de parrainage.'},
  {href:'/marketing/loyalty',icon:'♥',label:'Fidélité client',description:'Engagement et rétention des clients.'},
  {href:'/marketing/lifecycle',icon:'∞',label:'Cycle client unifié',description:'Parcours marketing du prospect au client fidèle.'},
  {href:'/marketing/consent',icon:'✓',label:'Consent & Opt-out',description:'Consentement marketing et gestion des désinscriptions.'}
 ]},
 {key:'analytics',href:'/marketing/sections/analytics',icon:'📊',label:'Analyse & Planning',description:'Performance, conversion, objectifs, équipe et planification.',tools:[
  {href:'/marketing/delivery-analytics',icon:'↗',label:'Delivery & Conversion',description:'Livraison des messages, engagement et conversions.'},
  {href:'/marketing/performance',icon:'↗',label:'Performance',description:'Analyse des résultats et indicateurs marketing.'},
  {href:'/marketing/objectives',icon:'✓',label:'Objectifs marketing',description:'Objectifs, cibles et progression.'},
  {href:'/marketing/weekly-review',icon:'≣',label:'Revue hebdomadaire',description:'Revue structurée des résultats de la semaine.'},
  {href:'/marketing/planning',icon:'▤',label:'Planification & Rapports',description:'Plans d’action et rapports marketing.'},
  {href:'/marketing/seasonality',icon:'◷',label:'Calendrier saisonnier',description:'Saisonnalité, événements et périodes commerciales.'},
  {href:'/marketing/team',icon:'♙',label:'Équipe Marketing',description:'Organisation, responsabilités et suivi de l’équipe.'}
 ]}
];

export function getMarketingSection(key:string){return MARKETING_SECTIONS.find(x=>x.key===key)||null;}

export function marketingSectionHrefForPath(path:string){
 const direct=MARKETING_SECTIONS.find(s=>s.href===path);if(direct)return direct.href;
 for(const section of MARKETING_SECTIONS)if(section.tools.some(t=>t.href===path||path.startsWith(`${t.href}/`)))return section.href;
 return path==='/marketing'?'/marketing/sections/overview':null;
}
