'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';

type Item={href:string;label:string;icon:string};
function discover():Item[]{if(typeof document==='undefined')return[];return Array.from(document.querySelectorAll<HTMLAnchorElement>('.sidebar .nav a')).slice(0,7).map(a=>({href:a.getAttribute('href')||'/',label:(a.querySelector('.label')?.textContent||a.getAttribute('title')||'Section').trim(),icon:(a.querySelector('.navIcon')?.textContent||'•').trim()})).filter(x=>x.href)}
export function PortalShortcuts(){
 const[open,setOpen]=useState(false),[items,setItems]=useState<Item[]>([]);const router=useRouter();
 useEffect(()=>{const refresh=()=>setItems(discover());refresh();const id=setTimeout(refresh,250);return()=>clearTimeout(id)},[]);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{const el=e.target as HTMLElement|null;const tag=el?.tagName;const typing=tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||Boolean(el?.isContentEditable);if(e.key==='Escape'){setOpen(false);return}if(!typing&&e.altKey&&/^[1-7]$/.test(e.key)){const item=items[Number(e.key)-1];if(item){e.preventDefault();router.push(item.href)}}if(!typing&&e.altKey&&e.key==='/'){e.preventDefault();setOpen(v=>!v)}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[items,router]);
 if(!items.length)return null;
 return <div className="portalShortcuts">
  <button type="button" className="portalShortcutsTrigger" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-haspopup="dialog" aria-label="Raccourcis clavier DONI"><span aria-hidden>⌨</span><span className="portalShortcutsText">Raccourcis</span><kbd>Alt /</kbd></button>
  {open?<div className="portalShortcutsBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><section className="portalShortcutsDialog" role="dialog" aria-modal="true" aria-label="Raccourcis clavier DONI"><header><div><strong>Raccourcis DONI</strong><small>Navigation rapide sans quitter le clavier</small></div><button type="button" className="btn" onClick={()=>setOpen(false)}>Fermer</button></header><div className="portalShortcutsGrid">{items.map((item,i)=><button type="button" key={item.href} onClick={()=>{setOpen(false);router.push(item.href)}}><span className="portalShortcutsIcon" aria-hidden>{item.icon}</span><span><strong>{item.label}</strong><small>Ouvrir la section</small></span><kbd>Alt {i+1}</kbd></button>)}</div><div className="portalShortcutsUtility"><div><span>⌕ Recherche globale</span><kbd>⌘/Ctrl K</kbd></div><div><span>★ Favoris & Récents</span><kbd>Alt Q</kbd></div><div><span>⌨ Afficher cette aide</span><kbd>Alt /</kbd></div></div></section></div>:null}
 </div>;
}
