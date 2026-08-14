export function MetricCard({label,value,note,tone='default'}:{label:string;value:string|number;note?:string;tone?:'default'|'good'|'warn'|'bad'}){
 return <div className={`card metricCard ${tone}`}><div className="statLabel">{label}</div><div className="statValue">{value}</div>{note?<div className="metricNote">{note}</div>:null}</div>
}
