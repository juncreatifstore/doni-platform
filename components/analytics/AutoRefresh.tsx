'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
export function AutoRefresh({seconds=30}:{seconds?:number}){const r=useRouter();useEffect(()=>{const id=setInterval(()=>r.refresh(),seconds*1000);return()=>clearInterval(id)},[r,seconds]);return null}
