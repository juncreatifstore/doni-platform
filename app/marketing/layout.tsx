import {redirect} from 'next/navigation';
import {requirePageUser} from '@/lib/auth/session';
import {canAccessDepartments} from '@/lib/auth/data-scope';

export default async function MarketingLayout({children}:{children:React.ReactNode}){
 const user=await requirePageUser('AGENT');
 if(!canAccessDepartments(user,['MARKETING','MANAGEMENT']))redirect('/overview?forbidden=1');
 return children;
}
