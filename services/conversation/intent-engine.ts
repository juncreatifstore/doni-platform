export type DoniIntent='flight'|'hotel'|'visa'|'agent'|'greeting'|'unknown';
const KEYWORDS:Record<Exclude<DoniIntent,'unknown'>,string[]>={
 flight:['vol','flight','vuelo','vòl','avion','avión','plane','billet','boleto','ticket','tikèt','biye','volar','voler','fly','fligye','aller','go to','ir a'],
 hotel:['hotel','hôtel','otel','lodging','hospedaje','habitación','chambre','room','chanm','stay','séjour','reserva hotel','hotel booking','réserver hôtel'],
 visa:['visa','visado','visado de turista','tourist visa','visa touristique','visa ameriken','visa pwofesyonèl','dossier visa','application visa','demande visa','embajada','embassy','ambassade'],
 agent:['agent','agente','ajan','persona','humano','human','humain','moun','assistant','parler','speak','hablar','pale'],
 greeting:['bonjour','bonsoir','salut','hello','hi','hey','hola','buenos días','buenas','bonjou','bòn jou','good morning','good afternoon']
};
export function detectIntent(input:string):DoniIntent{
 const text=(input??'').trim().toLocaleLowerCase(); if(!text)return'unknown';
 const scores:Record<Exclude<DoniIntent,'unknown'>,number>={flight:0,hotel:0,visa:0,agent:0,greeting:0};
 for(const [intent,words] of Object.entries(KEYWORDS) as [Exclude<DoniIntent,'unknown'>,string[]][]) for(const word of words) if(text.includes(word)) scores[intent]+=word.length>4?3:1;
 const ranked=(Object.entries(scores) as [Exclude<DoniIntent,'unknown'>,number][]).sort((a,b)=>b[1]-a[1]);
 let [winner,score]=ranked[0]; if(score===0)return'unknown';
 // WordPress parity: when flight ties the current winner, flight wins.
 if(scores.flight===score && winner!=='flight') winner='flight';
 return winner;
}
export function isFlightIntent(input:string){return detectIntent(input)==='flight';}
