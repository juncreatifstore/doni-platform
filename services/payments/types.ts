export type PaymentCountry='MX'|'US'|'HT'|'DO'|'PH'|'default';
export type PaymentProvider='stripe'|'mercado_pago'|'paypal'|'bazik_moncash'|'manual_zelle'|'manual_us_bank';
export type PaymentMethod='stripe_card'|'paypal'|'zelle'|'bank_wire'|'bazik_moncash'|'mercado_pago_card'|'mercado_pago_balance'|'mercado_pago_oxxo'|'mercado_pago_cash';
export interface PaymentOption{key:string;method:PaymentMethod;provider:PaymentProvider;currency:string;label:string;manual:boolean}
export interface PaymentIntentInput{reference:string;amount:number;currency:string;conversationId:string;description:string;successUrl?:string;cancelUrl?:string}
export interface PaymentIntentResult{success:boolean;provider:string;providerIntentId?:string;checkoutUrl?:string;error?:string;raw?:unknown}
