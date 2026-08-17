import {randomUUID} from 'node:crypto';
import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {db} from '@/lib/db';
import {getSetting} from '@/lib/settings/service';
export const runtime='nodejs';

export async function GET(req:Request){
 const auth=await requireApiUser('SUPER_ADMIN');
 if(!auth.ok)return NextResponse.redirect(new URL('/login',req.url));
 const appId=await getSetting<string>('facebook.app_id');
 const version=await getSetting<string>('facebook.graph_version');
 if(!appId)return NextResponse.redirect(new URL('/marketing/campaigns?meta_ads_error=app_id_missing',req.url));
 const state=randomUUID();
 const expiresAt=new Date(Date.now()+10*60*1000).toISOString();
 await db.appSetting.create({data:{key:`facebook.ads.oauth.state.${state}`,category:'Meta Ads OAuth',value:{state,userId:auth.user.id,expiresAt} as any}});
 const redirectUri=new URL('/api/settings/facebook/ads/callback',req.url).toString();
 const v=String(version||'v23.0').replace(/^\/+|\/+$/g,'');
 const url=new URL(`https://www.facebook.com/${v}/dialog/oauth`);
 url.searchParams.set('client_id',appId);
 url.searchParams.set('redirect_uri',redirectUri);
 url.searchParams.set('state',state);
 url.searchParams.set('scope','ads_read,ads_management,business_management');
 url.searchParams.set('response_type','code');
 return NextResponse.redirect(url);
}
