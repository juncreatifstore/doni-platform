'use client';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';

type Item={href:string;title:string;section?:string|null;visitedAt:number};
const FAVORITES='doni.portal.favorites.v1';
const RECENTS='doni.portal.recents.v1';
function read(key:string):Item[]{try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v.filter(x=>x&&typeof x.href==='string').slice(0,10):[]}catch{return[]}}
function save(key:string,items:Item[]){try{localStorage.setItem(key,JSON.stringify(items.slice(0,10)))}catch{}}

export function PortalQuickAccess({active,title,section}:{active:string;title:string;section?:string|null}){
 const[open,setOpen]=useState(false),[favorites,setFavorites]=useState<Item[]>([]),[recents,setRecents]=useState<Item[]>([]);const panel=useRef<HTMLDivElement>(null);
 useEffect(()=>{setFavorites(read(FAVORITES));const old=read(RECENTS);const current:Item={href:active,title,section,visitedAt:Date.now()};const next=[current,...old.filter(x=>x.href!==active)].slice(0,8);setRecents(next);save(RECENTS,next)},[active,title,section]);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.altKey&&e.key.toLowerCase()==='q'){e.preventDefault();setOpen(v=>!v)}if(e.key==='Escape')setOpen(false)};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[]);
 useEffect(()=>{if(!open)return;const onDown=(e:MouseEvent)=>{if(panel.current&&!panel.current.contains(e.target as Node))setOpen(false)};document.addEventListener('mousedown',onDown);return()=>document.removeEventListener('mousedown',onDown)},[open]);
 const isFavorite=useMemo(()=>favorites.some(x=>x.href===active),[favorites,active]);
 function toggleFavorite(){const current:Item={href:active,title,section,visitedAt:Date.now()};const next=isFavorite?favorites.filter(x=>x.href!==active):[current,...favorites.filter(x=>x.href!==active)].slice(0,8);setFavorites(next);save(FAVORITES,next)}
 function clearRecents(){setRecents([]);save(RECENTS,[])}
 return <div className="portalQuickAccess" ref={panel}>
  <button type="button" className="portalQuickTrigger" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-haspopup="dialog" aria-label="Favoris et accès récents"><span aria-hidden>★</span><span className="portalQuickTriggerText">Accès rapide</span><kbd>Alt Q</kbd></button>
  {open?<div className="portalQuickPanel" role="dialog" aria-label="Accès rapide DONI">
   <div className="portalQuickHead"><div><strong>Accès rapide</strong><small>Favoris et pages récentes</small></div><button className="btn" type="button" onClick={toggleFavorite}>{isFavorite?'★ Retirer le favori':'☆ Ajouter cette page'}</button></div>
   <section><div className="portalQuickSectionTitle"><strong>Favoris</strong><span>{favorites.length}/8</span></div>{favorites.length?<div className="portalQuickList">{favorites.map(x=><Link key={x.href} href={x.href} onClick={()=>setOpen(false)}><span>★</span><div><strong>{x.title}</strong><small>{x.section||'DONI'}</small></div><b>›</b></Link>)}</div>:<p className="portalQuickEmpty">Ajoute les pages utilisées chaque jour pour les retrouver ici.</p>}</section>
   <section><div className="portalQuickSectionTitle"><strong>Récents</strong>{recents.length?<button type="button" onClick={clearRecents}>Effacer</button>:null}</div>{recents.length?<div className="portalQuickList">{recents.map(x=><Link key={x.href} href={x.href} onClick={()=>setOpen(false)}><span>↺</span><div><strong>{x.title}</strong><small>{x.section||'DONI'}</small></div><b>›</b></Link>)}</div>:<p className="portalQuickEmpty">Les pages ouvertes récemment apparaîtront ici.</p>}</section>
  </div>:null}
 </div>;
}
