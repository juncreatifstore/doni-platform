'use client';
import {useEffect,useState} from 'react';

const PREFIX='doni.draft.v1:';
const SENSITIVE=/pass|password|token|secret|key|card|cvv|cvc|iban|account/i;
const SAFE_TYPES=new Set(['text','search','email','tel','number','date','datetime-local','time','url']);
type Saved={values:Record<string,string>;savedAt:number};

function draftKey(el:Element){const root=el.closest<HTMLElement>('[data-doni-draft],.taskCreate');if(!root)return null;const name=root.dataset.doniDraft||(root.classList.contains('taskCreate')?'new-task':null);return name?`${PREFIX}${location.pathname}:${name}`:null}
function fields(root:Element){return Array.from(root.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('input,textarea,select')).filter((el)=>{if(!el.name&&!(el instanceof HTMLInputElement&&el.placeholder))return true;if(SENSITIVE.test(`${el.name} ${(el as HTMLInputElement).placeholder||''}`))return false;if(el instanceof HTMLInputElement){if(['password','file','hidden','checkbox','radio'].includes(el.type))return false;if(el.type&&!SAFE_TYPES.has(el.type))return false}return true})}
function fieldId(el:HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement,index:number){return el.name||el.id||(el instanceof HTMLInputElement?el.placeholder:'')||`field-${index}`}
function read(key:string):Saved|null{try{const raw=sessionStorage.getItem(key);return raw?JSON.parse(raw):null}catch{return null}}
function save(key:string,root:Element){const values:Record<string,string>={};fields(root).forEach((el,i)=>{values[fieldId(el,i)]=el.value});try{sessionStorage.setItem(key,JSON.stringify({values,savedAt:Date.now()}))}catch{}}
function restore(key:string,root:Element){const saved=read(key);if(!saved)return false;let restored=false;fields(root).forEach((el,i)=>{const value=saved.values[fieldId(el,i)];if(value!==undefined&&!el.value){const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value')?.set;setter?.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));restored=true}});return restored}

export function DraftRecovery(){
 const[status,setStatus]=useState<'idle'|'saved'|'restored'>('idle');
 useEffect(()=>{
  let timer:number|undefined;let createPending=false;
  const roots=new WeakSet<Element>();
  const prepare=(root:Element)=>{if(roots.has(root))return;roots.add(root);const key=draftKey(root);if(key&&restore(key,root)){setStatus('restored');window.setTimeout(()=>setStatus('idle'),2600)}};
  const scan=()=>document.querySelectorAll('[data-doni-draft],.taskCreate').forEach(prepare);scan();
  const observer=new MutationObserver(()=>{scan();if(createPending&&!document.querySelector('.taskCreate')){try{sessionStorage.removeItem(`${PREFIX}${location.pathname}:new-task`)}catch{}createPending=false;setStatus('idle')}});observer.observe(document.body,{childList:true,subtree:true});
  const onInput=(e:Event)=>{const target=e.target as Element|null;if(!target)return;const root=target.closest('[data-doni-draft],.taskCreate');const key=root&&draftKey(root);if(!root||!key)return;window.clearTimeout(timer);timer=window.setTimeout(()=>{save(key,root);setStatus('saved');window.setTimeout(()=>setStatus('idle'),1800)},450)};
  const onClick=(e:MouseEvent)=>{const target=e.target as HTMLElement|null;const root=target?.closest('.taskCreate');if(root&&target?.closest('button')?.textContent?.trim()==='Créer')createPending=true};
  const onClear=(e:Event)=>{const detail=(e as CustomEvent<{name?:string}>).detail;const name=detail?.name;if(!name)return;try{sessionStorage.removeItem(`${PREFIX}${location.pathname}:${name}`)}catch{}setStatus('idle')};
  const onBeforeUnload=(e:BeforeUnloadEvent)=>{const active=document.querySelector('[data-doni-draft],.taskCreate');if(!active)return;const key=draftKey(active);if(key&&read(key)){e.preventDefault();e.returnValue=''}};
  document.addEventListener('input',onInput,true);document.addEventListener('change',onInput,true);document.addEventListener('click',onClick,true);window.addEventListener('doni:draft-clear',onClear as EventListener);window.addEventListener('beforeunload',onBeforeUnload);
  return()=>{observer.disconnect();window.clearTimeout(timer);document.removeEventListener('input',onInput,true);document.removeEventListener('change',onInput,true);document.removeEventListener('click',onClick,true);window.removeEventListener('doni:draft-clear',onClear as EventListener);window.removeEventListener('beforeunload',onBeforeUnload)};
 },[]);
 return status!=='idle'?<div className={`draftRecoveryStatus ${status}`} role="status" aria-live="polite"><span aria-hidden>{status==='saved'?'✓':'↺'}</span>{status==='saved'?'Brouillon enregistré sur cet appareil':'Brouillon restauré automatiquement'}</div>:null;
}
