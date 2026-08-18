import type {UserRole} from '@prisma/client';
import type {Department} from '@/lib/auth/departments';

export type PortalTool={href:string;icon:string;label:string;description:string;minimum?:UserRole;departments?:Department[]};
export type PortalSection={slug:string;href:string;icon:string;label:string;description:string;minimum?:UserRole;departments?:Department[];tools:PortalTool[]};

export const PORTAL_SECTIONS:PortalSection[]=[
 {slug:'home',href:'/portal/sections/home',icon:'⌂',label:'Accueil',description:'Pilotage quotidien, tâches, dossiers et supervision des opérations.',tools:[
  {href:'/overview',icon:'⌂',label:'Tableau de bord',description:'Vue générale de l’activité DONI.'},
  {href:'/tasks',icon:'✓',label:'Mes tâches',description:'Tâches personnelles et suivi du travail.'},
  {href:'/cases',icon:'▦',label:'Mes dossiers',description:'Dossiers qui nécessitent ton attention.'},
  {href:'/management',icon:'◆',label:'Cockpit Direction',description:'Pilotage exécutif et supervision globale.',minimum:'ADMIN'},
  {href:'/productivity',icon:'▥',label:'Productivité équipe',description:'Performance et charge de travail de l’équipe.',minimum:'ADMIN'},
  {href:'/escalations',icon:'!',label:'Escalades SLA',description:'Dossiers et délais nécessitant une intervention.',minimum:'ADMIN'},
  {href:'/live-ops',icon:'◉',label:'Live Ops',description:'Supervision en temps réel des opérations.',departments:['CUSTOMER_SERVICE','OPERATIONS','MANAGEMENT','RESERVATIONS']},
 ]},
 {slug:'sales',href:'/portal/sections/sales',icon:'◎',label:'Ventes & Clients',description:'CRM, réservations et parcours commercial des clients.',departments:['RESERVATIONS','CUSTOMER_SERVICE','MARKETING','OPERATIONS','MANAGEMENT'],tools:[
  {href:'/customers',icon:'◎',label:'Clients / CRM',description:'Fiches clients, historique et relation commerciale.',departments:['RESERVATIONS','CUSTOMER_SERVICE','MARKETING','OPERATIONS','MANAGEMENT']},
  {href:'/reservations',icon:'✈',label:'Réservations',description:'Gestion des réservations et dossiers voyage.',departments:['RESERVATIONS','CUSTOMER_SERVICE','TICKETING','FLIGHT_OPS','OPERATIONS','MANAGEMENT']},
  {href:'/flow-tracker',icon:'↗',label:'Parcours client',description:'Suivi du parcours depuis la demande jusqu’à la vente.',departments:['RESERVATIONS','CUSTOMER_SERVICE','MARKETING','OPERATIONS','MANAGEMENT']},
 ]},
 {slug:'customer-service',href:'/portal/sections/customer-service',icon:'◌',label:'Service client',description:'Assistance, après-vente, check-in et bagages.',departments:['CUSTOMER_SERVICE','OPERATIONS','MANAGEMENT'],tools:[
  {href:'/service-client',icon:'◌',label:'Centre service client',description:'Centre principal de traitement des demandes clients.',departments:['CUSTOMER_SERVICE','OPERATIONS','MANAGEMENT']},
  {href:'/post-booking',icon:'◇',label:'Après-vente',description:'Modifications, suivi et assistance après réservation.',departments:['CUSTOMER_SERVICE','TICKETING','OPERATIONS','MANAGEMENT']},
  {href:'/checkin',icon:'✓',label:'Check-in',description:'Suivi et assistance à l’enregistrement.',departments:['CUSTOMER_SERVICE','FLIGHT_OPS','OPERATIONS','MANAGEMENT']},
  {href:'/baggage',icon:'□',label:'Bagages',description:'Gestion des demandes et incidents bagages.',departments:['CUSTOMER_SERVICE','FLIGHT_OPS','OPERATIONS','MANAGEMENT']},
 ]},
 {slug:'operations',href:'/portal/sections/operations',icon:'▣',label:'Opérations',description:'Ticketing, opérations aériennes et inventaire.',departments:['TICKETING','FLIGHT_OPS','RESERVATIONS','OPERATIONS','MANAGEMENT'],tools:[
  {href:'/ticketing',icon:'▣',label:'Ticketing',description:'Émission, suivi et contrôle des billets.',departments:['TICKETING','OPERATIONS','MANAGEMENT']},
  {href:'/flight-ops',icon:'⌁',label:'Flight Ops',description:'Supervision des vols et opérations aériennes.',departments:['FLIGHT_OPS','OPERATIONS','MANAGEMENT']},
  {href:'/inventory',icon:'▤',label:'Inventaire',description:'Disponibilités et ressources commerciales.',departments:['RESERVATIONS','OPERATIONS','MANAGEMENT']},
 ]},
 {slug:'finance',href:'/portal/sections/finance',icon:'$',label:'Finance',description:'Paiements, contrôle financier et rapprochements.',departments:['FINANCE','OPERATIONS','MANAGEMENT'],tools:[
  {href:'/manual-payments',icon:'$',label:'Paiements manuels',description:'Contrôle et validation des paiements manuels.',departments:['FINANCE','OPERATIONS','MANAGEMENT']},
  {href:'/finance',icon:'◫',label:'Centre financier',description:'Vue consolidée des flux financiers DONI.',departments:['FINANCE','OPERATIONS','MANAGEMENT']},
 ]},
 {slug:'marketing',href:'/portal/sections/marketing',icon:'◇',label:'Marketing',description:'Accès aux six espaces Marketing simplifiés.',departments:['MARKETING','MANAGEMENT'],tools:[
  {href:'/marketing/sections/overview',icon:'⌂',label:'Vue d’ensemble',description:'Dashboard, Command Center, cockpit et readiness.',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/sections/acquisition',icon:'🎯',label:'Acquisition',description:'Leads, search intelligence, opportunités et partenariats.',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/sections/ai',icon:'✦',label:'DONI AI',description:'Copilot, Autopilot, Publisher et apprentissage.',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/sections/campaigns',icon:'%',label:'Campagnes & Ads',description:'Campagnes, Meta Ads, attribution et canaux.',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/sections/content',icon:'▦',label:'Contenu & Audience',description:'Studio, assets, publication, fidélité et réputation.',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/sections/analytics',icon:'↗',label:'Analyse & Planning',description:'Performance, objectifs, rapports et planification.',departments:['MARKETING','MANAGEMENT']},
 ]},
 {slug:'admin',href:'/portal/sections/admin',icon:'⚙',label:'Administration',description:'Utilisateurs, paramètres, audit et migration.',minimum:'ADMIN',tools:[
  {href:'/users',icon:'♙',label:'Utilisateurs',description:'Comptes, rôles et accès au portail.',minimum:'ADMIN'},
  {href:'/settings',icon:'⚙',label:'Paramètres',description:'Configuration générale de DONI.',minimum:'ADMIN'},
  {href:'/audit',icon:'≣',label:'Audit',description:'Historique des actions et contrôles.',minimum:'ADMIN'},
  {href:'/migration',icon:'⇄',label:'Migration',description:'Outils de migration et maintenance.',minimum:'ADMIN'},
 ]},
];

const PATH_SECTION:[string,string][]=[
 ['/portal/sections/home','home'],['/overview','home'],['/tasks','home'],['/cases','home'],['/management','home'],['/productivity','home'],['/escalations','home'],['/live-ops','home'],
 ['/portal/sections/sales','sales'],['/customers','sales'],['/reservations','sales'],['/flow-tracker','sales'],
 ['/portal/sections/customer-service','customer-service'],['/service-client','customer-service'],['/post-booking','customer-service'],['/checkin','customer-service'],['/baggage','customer-service'],
 ['/portal/sections/operations','operations'],['/ticketing','operations'],['/flight-ops','operations'],['/inventory','operations'],
 ['/portal/sections/finance','finance'],['/manual-payments','finance'],['/finance','finance'],
 ['/portal/sections/marketing','marketing'],['/marketing','marketing'],
 ['/portal/sections/admin','admin'],['/users','admin'],['/settings','admin'],['/audit','admin'],['/migration','admin'],
];

export function portalSectionForPath(path:string){const p=String(path||'');const hit=PATH_SECTION.find(([prefix])=>p===prefix||p.startsWith(`${prefix}/`));return hit?PORTAL_SECTIONS.find(s=>s.slug===hit[1])||null:null;}
export function portalSectionBySlug(slug:string){return PORTAL_SECTIONS.find(s=>s.slug===slug)||null;}
