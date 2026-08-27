import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWooOrigin } from '../product-kernel/woocommerceEgress.js';
import { newAttemptToken, createWooAuthUrl } from '../product-kernel/woocommerceAuth.js';

test('V1-03 WooCommerce auth token is opaque high entropy', () => { const a=newAttemptToken(); assert.ok(a.length>=40); assert.ok(!a.includes('@')); });
test('V1-03 auth URL uses only approved parameters', () => { const u=new URL(createWooAuthUrl({origin:'https://example.com',appName:'Product',returnUrl:'https://product.example/return',callbackUrl:'https://product.example/callback',userId:'opaque'})); assert.equal(u.pathname,'/wc-auth/v1/authorize'); assert.equal(u.searchParams.get('scope'),'read'); assert.equal(u.searchParams.get('state'),null); });
test('V1-03 egress rejects unsafe origins', async () => { for (const value of ['http://shop.example','https://localhost','https://127.0.0.1','https://user:pass@shop.example']) await assert.rejects(validateWooOrigin(value)); });
