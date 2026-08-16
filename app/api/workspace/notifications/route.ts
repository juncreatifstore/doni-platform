import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {listInternalNotifications,markAllInternalNotificationsRead,unreadInternalNotificationCount} from '@/lib/workspace/notifications';
export async function GET(){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});const [notifications,unread]=await Promise.all([listInternalNotifications(auth.user.id),unreadInternalNotificationCount(auth.user.id)]);return NextResponse.json({success:true,notifications,unread});}
export async function PATCH(){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});const count=await markAllInternalNotificationsRead(auth.user.id);return NextResponse.json({success:true,count});}
