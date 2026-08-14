export interface Airport { code:string; name:string; city:string; country:string; subd?:string; tz?:string; lat?:number; lon?:number; }
export interface PassengerCounts { adults:number; children:number; infants:number; }
export interface FlightCriteria { trip_type?:'oneway'|'roundtrip'; origin?:string; origin_city?:string; destination?:string; destination_city?:string; depart_date?:string; return_date?:string|null; passengers?:PassengerCounts; cabin_class?:'economy'; cabin_source?:string; cabin_locked?:boolean; max_stops?:number|null; airline_preference?:string|null; airline_name?:string; airline_request_raw?:string; }
export interface FlightSegment { origin:string; destination:string; departure_at:string|null; arrival_at:string|null; airline_code:string; airline_name:string; flight_number:string; duration_minutes:number; }
export interface FlightOffer { offer_id:string; provider:string; price_total:number; currency:string; segments:FlightSegment[]; expires_at?:string|null; _total_duration?:number; _stops?:number; }
export interface ProviderSearchResult { offers:FlightOffer[]; request_id?:string|null; error?:string; }
export interface AggregatedSearchResult { offers:FlightOffer[]; providers_used:string[]; errors:Record<string,string>; }
