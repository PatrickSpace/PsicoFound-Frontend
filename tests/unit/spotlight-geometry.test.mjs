import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spotlightPlacement} from '../../src/utils/spotlightGeometry.js';
function overlaps(a,b,h) {return !(a.left+a.width<=b.left || a.left>=b.left+b.width || a.top+Math.min(h,a.maxHeight)<=b.top || a.top>=b.top+b.height);}
for (const [label,viewport,target,height] of [
 ['mobile button',{width:390,height:844},{left:100,top:390,width:200,height:48},280],
 ['mobile privacy',{width:390,height:844},{left:45,top:80,width:300,height:170},330],
 ['desktop navigation',{width:1440,height:1000},{left:0,top:0,width:320,height:1000},300],
 ['short viewport',{width:390,height:400},{left:35,top:140,width:320,height:50},300],
 ['bottom button',{width:1440,height:900},{left:1200,top:810,width:180,height:44},250],
]) test(`spotlight avoids covering ${label}`,()=>{
 const result=spotlightPlacement(target,viewport,height);
 assert.equal(overlaps(result,target,height),false);
 assert.ok(result.left>=0 && result.left+result.width<=viewport.width);
 assert.ok(result.top>=0 && result.top+Math.min(height,result.maxHeight)<=viewport.height);
});
test('missing target still provides a visible exit panel',()=>{
 const p=spotlightPlacement(null,{width:320,height:568},280);
 assert.equal(p.width,288); assert.equal(p.top,16);
});
