import {translate} from '../conversation/language-engine';
import type {ConversationSession, JsonObject, SegmentHandler, SegmentReply} from '../conversation/types';
export abstract class BaseSegment implements SegmentHandler{
 abstract readonly id:string;
 abstract handle(session:ConversationSession,text:string,rawMessage?:unknown):Promise<SegmentReply>|SegmentReply;
 prompt(session:ConversationSession):Promise<string>|string{return translate(session,{fr:'...',en:'...',es:'...',ht:'...'});}
 protected t(session:ConversationSession,values:Parameters<typeof translate>[1]){return translate(session,values);}
 protected reply(message:string|null,nextSegment:string|null=null,stateUpdates:JsonObject|null=null,extras:Partial<SegmentReply>={}):SegmentReply{return {message,nextSegment,stateUpdates,outcome:nextSegment?'success':'retry',normalized:null,autoChain:false,...extras};}
 protected retry(message:string,stateUpdates:JsonObject|null=null):SegmentReply{return this.reply(message,null,stateUpdates,{outcome:'retry'});}
}
