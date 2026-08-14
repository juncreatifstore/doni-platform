import { DoniShell } from '@/components/DoniShell';
import { LiveOpsSummary } from '@/components/LiveOpsSummary';
import { ConversationList } from '@/components/live-ops/ConversationList';
import { requirePageUser } from '@/lib/auth/session';
import { listLiveConversations } from '@/services/live-ops/service';
export default async function Page(){const user=await requirePageUser('AGENT');const rows=await listLiveConversations(100);return <DoniShell title="Live Ops" active="/live-ops" user={user}><LiveOpsSummary/><h2 className="sectionTitle">Centre de conversations</h2><ConversationList rows={rows}/></DoniShell>}
