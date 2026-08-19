export type OriginCheck={ok:true}|{ok:false;status:403;error:'invalid_origin'|'origin_required'};

function normalizedOrigin(value:string|null|undefined){
 if(!value)return null;
 try{return new URL(value).origin;}catch{return null;}
}

function allowedOrigins(req:Request){
 const values=new Set<string>();
 const requestOrigin=normalizedOrigin(req.url);
 if(requestOrigin)values.add(requestOrigin);
 for(const raw of [process.env.AUTH_WEBAUTHN_ORIGIN,process.env.PUBLIC_APP_URL]){
  const origin=normalizedOrigin(raw);
  if(origin)values.add(origin);
 }
 return values;
}

export function requireSameOrigin(req:Request):OriginCheck{
 const allowed=allowedOrigins(req);
 const origin=normalizedOrigin(req.headers.get('origin'));
 if(origin)return allowed.has(origin)?{ok:true}:{ok:false,status:403,error:'invalid_origin'};
 const referer=normalizedOrigin(req.headers.get('referer'));
 if(referer)return allowed.has(referer)?{ok:true}:{ok:false,status:403,error:'invalid_origin'};
 const fetchSite=(req.headers.get('sec-fetch-site')||'').toLowerCase();
 if(fetchSite==='same-origin')return {ok:true};
 if(process.env.NODE_ENV!=='production'&&fetchSite!=='cross-site')return {ok:true};
 return {ok:false,status:403,error:'origin_required'};
}
