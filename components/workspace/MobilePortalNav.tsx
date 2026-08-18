'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';

type Item={href:string;icon:string;label:string;active:boolean};
export function MobilePortalNav({items}:{items:Item[]}){
 const[open,setOpen]=useState(false);const closeRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!open)return;const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};document.addEventListener('keydown',onKey);const prev=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=prev}},[open]);
 return <div className="mobilePortalNav">
  <button className="mobileMenuButton" type="button" aria-expanded={open} aria-controls="mobile-portal-drawer" onClick={()=>setOpen(true)}><span aria-hidden>☰</span><span>Menu</span></button>
  {open?<div className="mobileNavOverlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
   <aside id="mobile-portal-drawer" className="mobileNavDrawer" aria-label="Navigation mobile DONI">
    <div className="mobileNavHead"><div><strong>DONI</strong><small>Portail principal</small></div><button ref={closeRef} type="button" className="mobileNavClose" aria-label="Fermer le menu" onClick={()=>setOpen(false)}>×</button></div>
    <nav className="mobileNavLinks" aria-label="Sections du portail">{items.map(item=><Link key={item.href} href={item.href} className={item.active?'active':''} aria-current={item.active?'page':undefined} onClick={()=>setOpen(false)}><span className="mobileNavIcon" aria-hidden>{item.icon}</span><span>{item.label}</span><b aria-hidden>›</b></Link>)}</nav>
    <div className="mobileNavHint">Échap pour fermer</div>
   </aside>
  </div>:null}
 </div>;
}
