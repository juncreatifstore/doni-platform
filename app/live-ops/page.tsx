import { DoniShell } from '@/components/DoniShell';
import { LiveOpsSummary } from '@/components/LiveOpsSummary';
import { ConversationList } from '@/components/live-ops/ConversationList';
import { requirePageUser } from '@/lib/auth/session';
import { listLiveConversations } from '@/services/live-ops/service';
import {canAccessDepartments} from '@/lib/auth/data-scope';
export default async function Page(){const user=await requirePageUser('AGENT');if(!canAccessDepartments(user,['CUSTOMER_SERVICE','OPERATIONS','MANAGEMENT','RESERVATIONS']))return <DoniShell title="Live Ops" active="/live-ops" user={user}><div className="card"><strong>Accès Live Ops non autorisé pour ce département.</strong></div></DoniShell>;const rows=await listLiveConversations(100,user);return <DoniShell title="Live Ops" active="/live-ops" user={user}><LiveOpsSummary/><h2 className="sectionTitle">Centre de conversations</h2><ConversationList rows={rows}/></DoniShell>}
