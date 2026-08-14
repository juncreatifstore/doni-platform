import type {ConversationSession, DetectableLanguage, DoniLanguage} from './types';

const STRONG: Record<DetectableLanguage,string[]> = {
  ht:['bonjou','bonswa','mèsi','kijan','tanpri','mwen vle','biye','vòl','rezèvasyon','kreyòl','ayisyen','paspò','avyon','tikèt','konbyen','kòman','eske','èske','ki kote','ki lè','ki sa','m vle','mwen ye','m ap','m gen','ti bebe','nan ki','mwen','mwen pa','mwen ka','mwen genyen','sèlman','pi bon','pi bon pri','plizyè','plizyè vòl','m bezwen','mwen bezwen','si gen','sa k pase','demen','jodi a','pou kont'],
  fr:['bonjour','bonsoir','salut','merci','comment','je veux','billet','vol ','réservation','français',"s'il vous plaît",'svp','avion','aller-retour','partir','pour aller','je réserve','je voudrais','pourrais','aller simple','classe affaires','classe','affaires','seulement','uniquement','éviter','évite','remboursable','arrivée avant','avant midi','multi destinations','destinations','je sais pas','meilleur','aérienne','compagnie aérienne','vol direct'],
  es:['hola','gracias','cómo','quiero','boleto','vuelo','reserva','español','por favor','avión','pasaporte','ida y vuelta','salir','necesito','puedo','me gustaría','aerolínea','pagué','pago','ya pagué','solo','sólo','clase ejecutiva','ejecutiva','multiciudad','escenario','aeromexico','avianca','volaris','aerolíneas','directo','más barato','más rápido','cuál','mejor','cuál es mejor','destino','playa','barato','fin de semana','mañana'],
  en:['hello','thank','how','i want','ticket','flight','booking','english','please','airport','passport','round trip','one way','i need','can i','i would','i will','fly','travel','i paid','twice','cancel','business class','business','economy','premium','only','avoid','direct','fastest','cheapest','morning','multi city','multi-city','multicity','compare','option','weekend','tomorrow','today','under','refundable','delta','jetblue','spirit','american airlines','united']
};
const WEAK: Record<DetectableLanguage,string[]> = {
  ht:['ak','nan','pa','pwen','ki sa'], fr:['le','la','les','avec','pour','dans'], es:['el','la','los','con','para','es'], en:['the','with','for','in','is','a']
};
const HT_WORDS=['mwen','kijan','tanpri','pyès','ayisyen','kreyòl','paspò','biye','tikèt','tikè','rezèvasyon','bonjou','mèsi','bagaj','ladan','jwenn','sèl','avyon','eske','èske','gen','sèlman','pi bon','plizyè','m bezwen','sa k pase','pou kont','okenn','demen','jodi a'];
const ONE_WORD: Record<string,DetectableLanguage|null>={oui:'fr',non:'fr','sí':'es',si:null,yes:'en',no:null,wi:'ht',bonjour:'fr',hola:'es',hello:'en',hi:'en',bonjou:'ht'};

function containsWord(text:string, marker:string){
  const escaped=marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  try{return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}([^\\p{L}\\p{N}_]|$)`,'iu').test(text);}catch{return text.includes(marker);}
}
export function detectLanguage(input:string): DetectableLanguage|null {
  const text=(input??'').trim().toLocaleLowerCase();
  if(text.length<2 || /^[\d\s+\-.,]+$/.test(text)) return null;
  if(Object.prototype.hasOwnProperty.call(ONE_WORD,text)) return ONE_WORD[text];
  const scores:Record<DetectableLanguage,number>={fr:0,en:0,es:0,ht:0};
  (Object.keys(STRONG) as DetectableLanguage[]).forEach(lang=>STRONG[lang].forEach(m=>{if(containsWord(text,m)) scores[lang]+=5;}));
  (Object.keys(WEAK) as DetectableLanguage[]).forEach(lang=>WEAK[lang].forEach(m=>{if(containsWord(text,m)) scores[lang]+=1;}));
  if(Math.max(...Object.values(scores))===0){
    if(/[âçêëîïôûùüÿœæ]/u.test(text)) scores.fr+=3;
    if(/[áíóúñ¿¡]/u.test(text)) scores.es+=3;
  }
  if(HT_WORDS.some(w=>containsWord(text,w))) scores.ht+=3;
  const sorted=(Object.entries(scores) as [DetectableLanguage,number][]).sort((a,b)=>b[1]-a[1]);
  return sorted[0][1]>=3?sorted[0][0]:null;
}
export function sessionLanguage(session: Pick<ConversationSession,'lockedLanguage'>): DoniLanguage { return session.lockedLanguage ?? 'es'; }
export function translate(session: Pick<ConversationSession,'lockedLanguage'>, values:Partial<Record<DoniLanguage,string>>):string{
  const lang=sessionLanguage(session);
  if(values[lang]) return values[lang]!;
  if(lang==='fil'||lang==='ceb') return values.en ?? values.es ?? '';
  return values.es ?? values.en ?? '';
}
export function nativeLanguageName(lang:DoniLanguage){return ({fr:'Français',en:'English',es:'Español',ht:'Kreyòl',fil:'Filipino',ceb:'Bisaya'} as const)[lang] ?? lang;}
