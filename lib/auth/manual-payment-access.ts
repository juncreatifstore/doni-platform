import {db} from '@/lib/db';
import type {SafeUser} from '@/lib/auth/session';
import {canAccessDepartments,dataScopeForUser} from '@/lib/auth/data-scope';

export function canAccessManualPayments(user:SafeUser){
 return canAccessDepartments(user,['FINANCE']);
}

export function filterManualPaymentRowsForUser<T extends {payment?:{conversation?:{country?:string|null}|null}|null}>(rows:T[],user:SafeUser){
 if(!canAccessManualPayments(user))return [];
 const scope=dataScopeForUser(user);
 if(scope.mode==='global')return rows;
 if(scope.mode==='none')return [];
 return rows.filter(row=>String(row.payment?.conversation?.country||'')===scope.country);
}

export async function assertManualPaymentReviewAccess(id:string,user:SafeUser){
 if(!canAccessManualPayments(user))throw new Error('forbidden_department');
 const scope=dataScopeForUser(user);
 if(scope.mode==='global')return true;
 if(scope.mode==='none')throw new Error('forbidden_scope');
 const row=await db.manualPaymentReview.findUnique({where:{id},select:{payment:{select:{conversation:{select:{country:true}}}}}});
 if(!row)throw new Error('review_not_found');
 if(String(row.payment.conversation?.country||'')!==scope.country)throw new Error('forbidden_scope');
 return true;
}
