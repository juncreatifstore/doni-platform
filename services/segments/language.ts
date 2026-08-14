import {BaseSegment} from './base'; import {detectLanguage} from '../conversation/language-engine'; import type {ConversationSession} from '../conversation/types';
const greetings={
 fr:"👋 Bonjour ! Je suis *DONI*, l'assistant intelligent de *Créatif Travel* ✈️\n\nJe peux vous aider pour les vols, hôtels, visas et services de voyage.\n\nQue souhaitez-vous faire aujourd'hui ?\n\n1 — ✈️ Vols\n2 — 🛂 Visa\n3 — 🏨 Hôtel\n4 — 📋 Mes réservations\n5 — 🛫 Statut de vol",
 en:"👋 Hello! I'm *DONI*, *Créatif Travel*'s intelligent assistant ✈️\n\nI can help with flights, hotels, visas, and travel services.\n\nWhat would you like to do today?\n\n1 — ✈️ Flights\n2 — 🛂 Visa\n3 — 🏨 Hotel\n4 — 📋 My Bookings\n5 — 🛫 Flight status",
 es:"👋 ¡Hola! Soy *DONI*, el asistente inteligente de *Créatif Travel* ✈️\n\nPuedo ayudarte con vuelos, hoteles, visas y servicios de viaje.\n\n¿Qué deseas hacer hoy?\n\n1 — ✈️ Vuelos\n2 — 🛂 Visa\n3 — 🏨 Hotel\n4 — 📋 Mis reservas\n5 — 🛫 Estado de vuelo",
 ht:"👋 Bonjou! Mwen se *DONI*, asistan entèlijan *Créatif Travel* ✈️\n\nMwen ka ede w ak vòl, otèl, visa, ak sèvis vwayaj.\n\nKisa ou vle fè jodi a?\n\n1 — ✈️ Vòl\n2 — 🛂 Visa\n3 — 🏨 Otèl\n4 — 📋 Rezèvasyon mwen yo\n5 — 🛫 Estati vòl"
};
export class LanguageSegment extends BaseSegment{readonly id='segment_language';handle(session:ConversationSession,text:string){
 const explicit=this.detectExplicit(text); const detected=explicit??detectLanguage(text)??session.lockedLanguage;
 if(detected && ['fr','en','es','ht'].includes(detected)) return this.reply(greetings[detected as keyof typeof greetings],'segment_service_selection',{service_awaiting:true,language_locked_at:new Date().toISOString(),locked_language:detected},{normalized:detected});
 return this.retry("👋 Hello / Bonjour / Hola / Bonjou\n\nChoose your language / Choisissez votre langue / Elija su idioma / Chwazi lang ou:\n\n1️⃣ Français\n2️⃣ English\n3️⃣ Español\n4️⃣ Kreyòl");
 }
 prompt(){return "👋 Hello / Bonjour / Hola / Bonjou\n\n1️⃣ Français\n2️⃣ English\n3️⃣ Español\n4️⃣ Kreyòl";}
 private detectExplicit(text:string){const t=text.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); if(/^(1|francais|french)$/.test(t)||t.includes('en francais'))return'fr';if(/^(2|english|anglais)$/.test(t)||t.includes('in english'))return'en';if(/^(3|espanol|spanish)$/.test(t)||t.includes('en espanol'))return'es';if(/^(4|kreyol|creole)$/.test(t)||t.includes('an kreyol'))return'ht';return null;}}
