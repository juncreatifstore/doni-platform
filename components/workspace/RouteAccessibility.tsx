'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';

export function RouteAccessibility(){
 const pathname=usePathname();
 const first=useRef(true);
 const[announcement,setAnnouncement]=useState('');
 useEffect(()=>{
  if(first.current){first.current=false;return}
  const id=window.requestAnimationFrame(()=>{
   const main=document.getElementById('main-content');
   const active=document.activeElement as HTMLElement|null;
   const focusIsLost=!active||active===document.body||active===document.documentElement||!document.contains(active);
   if(main&&focusIsLost)main.focus({preventScroll:true});
   const heading=main?.querySelector('h1')?.textContent?.trim();
   setAnnouncement(heading?`Page chargée : ${heading}`:'Nouvelle page chargée');
  });
  return()=>window.cancelAnimationFrame(id);
 },[pathname]);
 return <div aria-live="polite" aria-atomic="true" style={{position:'absolute',width:1,height:1,padding:0,margin:-1,overflow:'hidden',clip:'rect(0,0,0,0)',whiteSpace:'nowrap',border:0}}>{announcement}</div>
}
