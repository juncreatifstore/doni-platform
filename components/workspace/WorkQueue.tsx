import Link from 'next/link';

export function WorkQueue({title,note,items,empty='Aucune action en attente.'}:{title:string;note?:string;items:Array<{key:string;title:string;meta?:string;href:string;tone?:'normal'|'warn'|'bad';badge?:string}>;empty?:string}){
 return <section className="workQueue card"><div className="workQueueHead"><div><h3>{title}</h3>{note?<p>{note}</p>:null}</div><span className="queueCount">{items.length}</span></div><div className="workQueueList">{items.length?items.map(item=><Link href={item.href} className={`workQueueRow ${item.tone||'normal'}`} key={item.key}><div><strong>{item.title}</strong>{item.meta?<span>{item.meta}</span>:null}</div><div className="queueEnd">{item.badge?<em>{item.badge}</em>:null}<b>›</b></div></Link>):<div className="queueEmpty">{empty}</div>}</div></section>;
}

export function WorkCenterHeader({kicker,title,description,actions=[]}:{kicker:string;title:string;description:string;actions?:Array<{label:string;href:string}>}){
 return <section className="workCenterHeader"><div><span className="workspaceKicker">{kicker}</span><h2>{title}</h2><p>{description}</p></div>{actions.length?<div className="workCenterActions">{actions.map(a=><Link className="btn" href={a.href} key={a.href}>{a.label}</Link>)}</div>:null}</section>;
}
