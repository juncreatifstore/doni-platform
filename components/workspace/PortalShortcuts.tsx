'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';

type Item={href:string;label:string;icon:string};
export function PortalShortcuts({items}:{items:Item[]}){
 const[open,setOpen]=useState(false);const router=useRouter();
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{
  const tag=(e.target as HTMLElement|null)?.tagName;const typing=tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(e.target as HTMLElement|null)?.isContentEditable;
  if(e.key==='Escape'){setOpen(false);return}
  if(!typing&&e.altKey&&/^[1-7]$/.test(e.key)){const i=Number(e.key)-1;const item=items[i];if(item){e.preventDefault();router.push(item.href)}}
  if(!typing&&e.altKey&&e.key==='/'){e.preventDefault();setOpen(v=>!v)}
 };window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[items,router]);
 return <div className="portalShortcuts">
  <button type="button" className="portalShortcutsTrigger" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-haspopup="dialog" aria-label="Raccourcis clavier DONI"><span aria-hidden>⌨</span><span className="portalShortcutsText">Raccourcis</span><kbd>Alt /</kbd></button>
  {open?<div className="portalShortcutsBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><section className="portalShortcutsDialog" role="dialog" aria-modal="true" aria-label="Raccourcis clavier DONI">
   <header><div><strong>Raccourcis DONI</strong><small>Navigation rapide sans quitter le clavier</small></div><button type="button" className="btn" onClick={()=>setOpen(false)}>Fermer</button></header>
   <div className="portalShortcutsGrid">{items.map((item,i)=><button type="button" key={item.href} onClick={()=>{setOpen(false);router.push(item.href)}}><span className="portalShortcutsIcon" aria-hidden>{item.icon}</span><span><strong>{item.label}</strong><small>Ouvrir la section</small></span><kbd>Alt {i+1}</kbd></button>)}</div>
   <div className="portalShortcutsUtility"><div><span>⌕ Recherche globale</span><kbd>⌘/Ctrl K</kbd></div><div><span>★ Favoris & Récents</span><kbd>Alt Q</kbd></div><div><span>⌨ Afficher cette aide</span><kbd>Alt /</kbd></div></div>
  </section></div>:null}
 </div>;
}
