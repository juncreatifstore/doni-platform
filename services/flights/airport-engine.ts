import rawAirports from './data/airports-iata.json';import type {Airport} from './types';
type RawAirport={iata:string;name:string;city:string;country:string;subd?:string;tz?:string;lat?:number;lon?:number};
let cache:Airport[]|null=null;
function norm(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();}
function load(){if(cache)return cache;const raw=rawAirports as RawAirport[];cache=raw.filter(a=>/^[A-Z0-9]{3}$/.test(a.iata||'')).map(a=>({code:a.iata,name:a.name,city:a.city,country:a.country,subd:a.subd,tz:a.tz,lat:a.lat,lon:a.lon}));return cache;}
export function getByIata(code:string){const c=code.toUpperCase().trim();return load().find(a=>a.code===c)??null;}
export function findAirportsByCity(input:string,limit=5){const q=norm(input);if(!q)return[];const direct=/^[a-z0-9]{3}$/i.test(input)?getByIata(input):null;if(direct)return[direct];return load().map(a=>{const city=norm(a.city||''),name=norm(a.name||'');let score=99;if(city===q)score=0;else if(city.startsWith(q))score=1;else if(city.includes(q))score=2;else if(name.startsWith(q))score=3;else if(name.includes(q))score=4;return{a,score};}).filter(x=>x.score<99).sort((x,y)=>x.score-y.score||x.a.code.localeCompare(y.a.code)).slice(0,limit).map(x=>x.a);}
export function formatAirportChoices(matches:Airport[]){return matches.map((a,i)=>`*${i+1}* — ${a.city} (${a.code}) — ${a.name}`).join('\n');}
