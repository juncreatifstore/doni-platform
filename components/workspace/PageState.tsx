import Link from 'next/link';
import type {ReactNode} from 'react';

type Tone='empty'|'success'|'warning'|'error';
export function PageState({tone='empty',icon,title,message,actionHref,actionLabel,children}:{tone?:Tone;icon?:string;title:string;message:string;actionHref?:string;actionLabel?:string;children?:ReactNode}){
 return <section className={`pageState pageState-${tone}`} role={tone==='error'?'alert':'status'}>
  <div className="pageStateIcon" aria-hidden>{icon||(tone==='success'?'✓':tone==='warning'?'!':tone==='error'?'×':'◇')}</div>
  <div className="pageStateCopy"><h2>{title}</h2><p>{message}</p>{children}</div>
  {actionHref&&actionLabel?<Link href={actionHref} className="btn primary">{actionLabel}</Link>:null}
 </section>;
}
