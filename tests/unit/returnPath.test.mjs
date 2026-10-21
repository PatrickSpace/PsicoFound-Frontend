import test from 'node:test';
import assert from 'node:assert/strict';
import {safeReturnPath} from '../../src/utils/returnPath.js';
test('legal acceptance preserves a local destination, query and fragment',()=>{
 assert.equal(safeReturnPath('/encuesta?source=registro#continuar'),'/encuesta?source=registro#continuar');
 assert.equal(safeReturnPath('/sesiones?notification=one'),'/sesiones?notification=one');
});
test('legal acceptance refuses external destinations, controls and authentication loops',()=>{
 for(const value of ['https://external.test','//external.test','/\\external.test','javascript:alert(1)','/registro?redirect=/registro','/login','/verificar-correo','/registro/','/a/../registro',null,['/encuesta'],'/\n/external.test']){
  assert.equal(safeReturnPath(value),'/dashboard',String(value));
 }
});
