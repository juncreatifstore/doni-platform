import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {db} from '@/lib/db';
import {getSetting} from '@/lib/settings/service';
import {saveMetaAdsToken} from '@/services/facebook/ads';
export const runtime='nodejs';

export async function GET(req:Request){
 const auth=await requireApiUser('SUPER_ADMIN');
 if(!auth.ok)return NextResponse.redirect(new URL('/login',req.url));
 const url=new URL(req.url);
 const state=url.searchParams.get('state')||'';
 const code=url.searchParams.get('code')||'';
 const denied=url.searchParams.get('error');
 if(denied)return NextResponse.redirect(new URL(`/marketing/campaigns?meta_ads_error=${encodeURIComponent(denied)}`,req.url));
 const row=state?await db.appSetting.findUnique({where:{key:`facebook.ads.oauth.state.${state}`}}):null;
 const value=row?.value as any;
 const valid=Boolean(row&&value?.userId===auth.user.id&&new Date(value?.expiresAt||0).getTime()>Date.now());
 if(!valid||!code)return NextResponse.redirect(new URL('/marketing/campaigns?meta_ads_error=oauth_state_invalid',req.url));
 await db.appSetting.delete({where:{key:`facebook.ads.oauth.state.${state}`}}).catch(()=>{});
 const [appId,appSecret,version]=await Promise.all([getSetting<string>('facebook.app_id'),getSetting<string>('facebook.app_secret'),getSetting<string>('facebook.graph_version')]);
 if(!appId||!appSecret)return NextResponse.redirect(new URL('/marketing/campaigns?meta_ads_error=app_credentials_missing',req.url));
 const redirectUri=new URL('/api/settings/facebook/ads/callback',req.url).toString();
 const v=String(version||'v23.0').replace(/^\/+|\/+$/g,'');
 const tokenUrl=new URL(`https://graph.facebook.com/${v}/oauth/access_token`);
 tokenUrl.searchParams.set('client_id',appId);tokenUrl.searchParams.set('client_secret',appSecret);tokenUrl.searchParams.set('redirect_uri',redirectUri);tokenUrl.searchParams.set('code',code);
 const shortRes=await fetch(tokenUrl,{cache:'no-store'});const shortJson:any=await shortRes.json().catch(()=>({}));
 if(!shortRes.ok||!shortJson?.access_token)return NextResponse.redirect(new URL('/marketing/campaigns?meta_ads_error=token_exchange_failed',req.url));
 let token=String(shortJson.access_token);
 const longUrl=new URL(`https://graph.facebook.com/${v}/oauth/access_token`);longUrl.searchParams.set('grant_type','fb_exchange_token');longUrl.searchParams.set('client_id',appId);longUrl.searchParams.set('client_secret',appSecret);longUrl.searchParams.set('fb_exchange_token',token);
 const longRes=await fetch(longUrl,{cache:'no-store'});const longJson:any=await longRes.json().catch(()=>({}));if(longRes.ok&&longJson?.access_token)token=String(longJson.access_token);
 await saveMetaAdsToken(token,auth.user.id);
 return NextResponse.redirect(new URL('/marketing/campaigns?meta_ads=connected',req.url));
}
