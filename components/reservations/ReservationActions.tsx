'use client';

import {useState} from 'react';

type Props={reference:string;checkinEligible:boolean;trackingReady:boolean;resendEnabled:boolean};

const buttonStyle:React.CSSProperties={
  display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,
  minHeight:36,padding:'8px 12px',borderRadius:8,border:'1px solid #cbd5e1',
  background:'#fff',color:'#0f2742',fontWeight:700,fontSize:13,textDecoration:'none',cursor:'pointer'
};

export function ReservationActions({reference,checkinEligible,trackingReady,resendEnabled}:Props){
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  async function resend(){
    if(!resendEnabled){setMessage('Renvoi désactivé par sécurité. Activez temporairement la livraison dans Settings.');return;}
    setBusy(true);setMessage('');
    try{
      const res=await fetch('/api/ticketing/deliver',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reference})});
      const data=await res.json().catch(()=>({}));
      if(res.ok&&data?.success){setMessage(data.status==='PARTIAL'?'E-ticket renvoyé sur au moins un canal.':'E-ticket renvoyé avec succès.');return;}
      if(res.status===403&&data?.error==='ticketing_delivery_disabled'){setMessage('Renvoi désactivé par sécurité. Activez temporairement la livraison dans Settings.');return;}
      setMessage(`Renvoi impossible${data?.error?`: ${data.error}`:''}`);
    }catch{setMessage('Renvoi impossible : erreur réseau.');}
    finally{setBusy(false);}
  }

  return <div style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center'}}>
    <a href={`/api/ticketing/${encodeURIComponent(reference)}/pdf`} target="_blank" rel="noreferrer" style={buttonStyle}>📄 Voir e-ticket</a>
    <button type="button" onClick={resend} disabled={busy||!resendEnabled} title={resendEnabled?'Renvoyer le billet':'Activez temporairement ticketing.delivery_enabled dans Settings'} style={{...buttonStyle,opacity:busy||!resendEnabled?.5:1,cursor:busy||!resendEnabled?'not-allowed':'pointer'}}>{busy?'Envoi…':'📨 Renvoyer e-ticket'}</button>
    <a href={trackingReady?`/flight-ops?reference=${encodeURIComponent(reference)}`:'#'} aria-disabled={!trackingReady} style={{...buttonStyle,opacity:trackingReady?1:.45,pointerEvents:trackingReady?'auto':'none'}}>🛫 Suivi du vol</a>
    <a href={checkinEligible?`/checkin?reference=${encodeURIComponent(reference)}`:'#'} aria-disabled={!checkinEligible} style={{...buttonStyle,opacity:checkinEligible?1:.45,pointerEvents:checkinEligible?'auto':'none'}}>✅ Check-in</a>
    {message?<span style={{fontSize:12,color:'#475569',maxWidth:360}}>{message}</span>:null}
  </div>;
}
