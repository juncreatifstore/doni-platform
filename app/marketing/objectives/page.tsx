import {redirect} from 'next/navigation';
import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {hasRole} from '@/lib/auth/permissions';
import {getMarketingScorecard} from '@/services/workspace/marketing-scorecard';
export const dynamic='force-dynamic';

type GoalRow={key:string;label:string;value:number;target:number;progress:number};
function Goal({row}:{row:GoalRow}){return <div className={`marketingGoal ${row.progress>=100?'goalMet':''}`}><div><span>{row.label}</span><strong>{row.value} <small>/ {row.target}</small></strong></div><div className="marketingGoalTrack"><i style={{width:`${row.progress}%`}}/></div><small>{row.progress>=100?'Objectif minimum atteint':`${row.progress}% de l'objectif minimum`}</small></div>}
function GoalPanel({title,rows}:{title:string;rows:GoalRow[]}){return <section className="card marketingGoalPanel"><h3>{title}</h3>{rows.map(row=><Goal key={row.key} row={row}/>)}</section>}
function money(v:number){return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(v)}

export default async function Page(){
 const user=await requirePageUser('AGENT');
 if(!hasRole(user.role,'ADMIN')&&user.department!=='MARKETING')redirect('/overview?forbidden=1');
 const d=await getMarketingScorecard();
 return <DoniShell title="Objectifs marketing" active="/marketing/objectives" user={user}>
  <section className="workspaceWelcome"><div><span className="workspaceKicker">Plan Doni Travel · Scorecard réel</span><h2>Revue jour / semaine / mois</h2><p>Les objectifs du guide sont comparés aux données réellement enregistrées dans DONI. Aucun résultat n'est simulé et les montants restent séparés par devise.</p></div></section>
  <div className="marketingKpis"><div className="card"><span>Indicateurs suivis</span><strong>{d.summary.tracked}</strong></div><div className="card"><span>Objectifs atteints</span><strong>{d.summary.met}</strong></div><div className={`card ${d.summary.atRisk?'danger':''}`}><span>À rattraper</span><strong>{d.summary.atRisk}</strong></div><div className="card"><span>Progression moyenne</span><strong>{d.summary.completion}%</strong></div></div>
  <div className="marketingGoalColumns"><GoalPanel title="Aujourd'hui" rows={d.goalRows.daily}/><GoalPanel title="Cette semaine" rows={d.goalRows.weekly}/><GoalPanel title="Ce mois" rows={d.goalRows.monthly}/></div>
  <div className="marketingScorecardGrid">
   <section className="card marketingGoalPanel"><h3>Réactivité</h3><div className="marketingManualGoal"><span>Temps de réponse cible</span><strong>&lt; {d.manual.responseMinutes} min</strong><small>La mesure automatique multi-canal n'est pas encore disponible; DONI n'invente donc aucun temps de réponse.</small></div></section>
   <section className="card marketingGoalPanel"><h3>Ads · performance réelle</h3>{d.realCurrencyPerformance.length?d.realCurrencyPerformance.map(x=><div className="marketingCurrencyScore" key={x.currency}><div><strong>{x.currency}</strong><span>{x.sales} vente{x.sales>1?'s':''} attribuée{x.sales>1?'s':''}</span></div><div><span>Dépense {money(x.spend)}</span><span>Revenu {money(x.revenue)}</span><strong className={x.targetMet?'scoreOk':'scoreWarn'}>ROAS {x.roas===null?'—':x.roas.toFixed(2)}</strong></div></div>):<p className="muted">Aucune campagne avec données réelles attribuées.</p>}<small>Le seuil opérationnel affiché est ≥ {d.goals.monthly.roiTarget} sur le ROAS disponible dans DONI. Les devises ne sont jamais additionnées entre elles.</small></section>
  </div>
 </DoniShell>
}
