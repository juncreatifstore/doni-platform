import type {JsonObject} from './types';
export function deepMerge(a:JsonObject,b:JsonObject):JsonObject{
 const out:{[k:string]:unknown}={...a};
 for(const [k,v] of Object.entries(b)){
   if(v===null){delete out[k];continue;}
   const av=out[k];
   if(v && typeof v==='object' && !Array.isArray(v) && av && typeof av==='object' && !Array.isArray(av)) out[k]=deepMerge(av as JsonObject,v as JsonObject);
   else out[k]=v;
 }
 return out;
}
export function getState<T>(state:JsonObject,key:string,fallback:T):T { const v=state[key]; return (v===undefined||v===null)?fallback:v as T; }
