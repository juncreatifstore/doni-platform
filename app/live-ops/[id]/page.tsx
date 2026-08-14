import {notFound} from 'next/navigation';
import {DoniShell} from '@/components/DoniShell';
import {ConversationViewer} from '@/components/live-ops/ConversationViewer';
import {requirePageUser} from '@/lib/auth/session';
import {getConversationDetail} from '@/services/live-ops/service';
export default async function Page({params}:{params:Promise<{id:string}>}){const user=await requirePageUser('AGENT');const {id}=await params;const row=await getConversationDetail(id);if(!row)notFound();return <DoniShell title="Conversation" active="/live-ops" user={user}><ConversationViewer initial={JSON.parse(JSON.stringify(row))} user={user}/></DoniShell>}
