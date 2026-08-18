'use client';
import Link from 'next/link';

export function MobileActionBar(){
 function fire(name:string){window.dispatchEvent(new CustomEvent(name));}
 return <nav className="mobileActionBar" aria-label="Actions rapides mobiles">
  <Link href="/portal/sections/home" className="mobileActionItem"><span aria-hidden>⌂</span><small>Accueil</small></Link>
  <button type="button" className="mobileActionItem" onClick={()=>fire('doni:open-search')}><span aria-hidden>⌕</span><small>Recherche</small></button>
  <button type="button" className="mobileActionItem" onClick={()=>fire('doni:open-quick-access')}><span aria-hidden>★</span><small>Favoris</small></button>
  <button type="button" className="mobileActionItem" onClick={()=>fire('doni:open-mobile-menu')}><span aria-hidden>☰</span><small>Menu</small></button>
 </nav>;
}
