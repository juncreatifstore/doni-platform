'use client';
import {useEffect,useRef,useState} from 'react';

type Tone='success'|'error'|'info';
type Detail={tone?:Tone;title?:string;message:string};
type Item=Detail&{id:number;tone:Tone};
export function notifyAction(detail:Detail){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('doni:action-feedback',{detail}))}
export function ActionFeedback(){
 const[items,setItems]=useState<Item[]>([]);const next=useRef(1);
 useEffect(()=>{const onFeedback=(e:Event)=>{const d=(e as CustomEvent<Detail>).detail;if(!d?.message)return;const item:Item={id:next.current++,tone:d.tone||'info',title:d.title,message:d.message};setItems(v=>[...v.slice(-2),item]);window.setTimeout(()=>setItems(v=>v.filter(x=>x.id!==item.id)),4200)};window.addEventListener('doni:action-feedback',onFeedback as EventListener);return()=>window.removeEventListener('doni:action-feedback',onFeedback as EventListener)},[]);
 return <div className="actionFeedbackStack" aria-live="polite" aria-atomic="false">{items.map(item=><div key={item.id} className={`actionFeedbackToast ${item.tone}`} role={item.tone==='error'?'alert':'status'}><span className="actionFeedbackIcon" aria-hidden>{item.tone==='success'?'✓':item.tone==='error'?'!':'i'}</span><div><strong>{item.title|| (item.tone==='success'?'Action enregistrée':item.tone==='error'?'Action non enregistrée':'Information')}</strong><small>{item.message}</small></div><button type="button" aria-label="Fermer" onClick={()=>setItems(v=>v.filter(x=>x.id!==item.id))}>×</button></div>)}</div>
}
