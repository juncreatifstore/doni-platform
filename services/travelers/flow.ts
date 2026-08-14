import type {PassengerCounts} from '../flights/types';import type {Traveler} from './types';
export function travelerPlan(p:PassengerCounts|undefined):Array<'adult'|'child'|'infant'>{const x=p??{adults:1,children:0,infants:0};const out:Array<'adult'|'child'|'infant'>=[];for(let i=0;i<x.adults;i++)out.push('adult');for(let i=0;i<x.children;i++)out.push('child');for(let i=0;i<x.infants;i++)out.push('infant');return out;}
export function blankTraveler(type:'adult'|'child'|'infant'):Traveler{return{type,first_name:'',last_name:'',date_of_birth:'',gender:'x',nationality:'',passport_number:'',passport_expiry:'',issue_country:'',source:'manual'};}
export function validDate(v:string){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(`${v}T00:00:00Z`));}
export function normalizeCountry(v:string){return v.trim().toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);}
