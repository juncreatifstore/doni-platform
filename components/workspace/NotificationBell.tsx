'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
export function NotificationBell(){const[unread,setUnread]=useState(0);async function load(){try{const r=await fetch('/api/workspace/notifications',{cache:'no-store'});const j=await r.json();if(j.success)setUnread(Number(j.unread||0));}catch{}}useEffect(()=>{load();const id=setInterval(load,30000);return()=>clearInterval(id)},[]);return <Link href="/notifications" className="notificationBell" aria-label={`${unread} notification(s) non lue(s)`}><span aria-hidden>♢</span>{unread>0?<b>{unread>99?'99+':unread}</b>:null}</Link>}
