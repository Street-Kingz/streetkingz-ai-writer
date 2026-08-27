import crypto from "node:crypto";
import { validateWooOrigin } from "./woocommerceEgress.js";
export function createWooAuthUrl({ origin, appName, returnUrl, callbackUrl, userId }) { const base=new URL(origin); if(base.protocol!=='https:'||base.username||base.password) throw new Error('INVALID_STORE_URL'); const url=new URL('/wc-auth/v1/authorize',base); for(const [k,v] of Object.entries({app_name:appName,scope:'read',user_id:userId,return_url:returnUrl,callback_url:callbackUrl})) url.searchParams.set(k,v); return url.toString(); }
export function newAttemptToken(){ return crypto.randomBytes(32).toString('base64url'); }
