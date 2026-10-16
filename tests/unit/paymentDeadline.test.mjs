import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paymentDeadlineMillis, paymentWindow} from '../../src/utils/paymentDeadline.js';

test('payment window closes exactly at the captured instant, without changing financial state', () => {
  const operation = {status:'pending', expiresAt:{toMillis:()=>2000}};
  assert.equal(paymentWindow(operation,1999),'open');
  assert.equal(paymentWindow(operation,2000),'elapsed');
  assert.equal(paymentWindow(operation,2001),'elapsed');
  assert.equal(operation.status,'pending');
});
test('missing, malformed and unrepresentable payment timestamps require review', () => {
  for (const expiresAt of [null,undefined,'2099-01-01',{}, {toMillis:()=>NaN}, {toMillis:()=>Infinity}, {toMillis:()=>1e20}, {toMillis:()=>{throw Error('bad timestamp');}}]) {
    assert.equal(paymentDeadlineMillis({expiresAt}),null);
    assert.equal(paymentWindow({expiresAt},0),'unresolved');
  }
});
