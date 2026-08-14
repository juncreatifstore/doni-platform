export interface Traveler { type:'adult'|'child'|'infant'; first_name:string; last_name:string; date_of_birth:string; gender:'m'|'f'|'x'; nationality:string; passport_number:string; passport_expiry:string; issue_country:string; source:'ocr'|'manual'; }
export const travelerFields=['first_name','last_name','date_of_birth','gender','nationality','passport_number','passport_expiry','issue_country'] as const;
export type TravelerField=typeof travelerFields[number];
