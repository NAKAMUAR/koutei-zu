import{a as Rh,b as Vh,C as Ph,r as Sa,F as Sh,L as Qt,_ as bh,d as Ch,h as Bu,e as Hr,f as xh,c as Ot,S as Dh}from"./firebase-l-5fplHV.js";var ba=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Ve,Uu;(function(){var r;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function t(T,p){function y(){}y.prototype=p.prototype,T.D=p.prototype,T.prototype=new y,T.prototype.constructor=T,T.C=function(E,v,R){for(var _=Array(arguments.length-2),jt=2;jt<arguments.length;jt++)_[jt-2]=arguments[jt];return p.prototype[v].apply(E,_)}}function e(){this.blockSize=-1}function n(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.B=Array(this.blockSize),this.o=this.h=0,this.s()}t(n,e),n.prototype.s=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function i(T,p,y){y||(y=0);var E=Array(16);if(typeof p=="string")for(var v=0;16>v;++v)E[v]=p.charCodeAt(y++)|p.charCodeAt(y++)<<8|p.charCodeAt(y++)<<16|p.charCodeAt(y++)<<24;else for(v=0;16>v;++v)E[v]=p[y++]|p[y++]<<8|p[y++]<<16|p[y++]<<24;p=T.g[0],y=T.g[1],v=T.g[2];var R=T.g[3],_=p+(R^y&(v^R))+E[0]+3614090360&4294967295;p=y+(_<<7&4294967295|_>>>25),_=R+(v^p&(y^v))+E[1]+3905402710&4294967295,R=p+(_<<12&4294967295|_>>>20),_=v+(y^R&(p^y))+E[2]+606105819&4294967295,v=R+(_<<17&4294967295|_>>>15),_=y+(p^v&(R^p))+E[3]+3250441966&4294967295,y=v+(_<<22&4294967295|_>>>10),_=p+(R^y&(v^R))+E[4]+4118548399&4294967295,p=y+(_<<7&4294967295|_>>>25),_=R+(v^p&(y^v))+E[5]+1200080426&4294967295,R=p+(_<<12&4294967295|_>>>20),_=v+(y^R&(p^y))+E[6]+2821735955&4294967295,v=R+(_<<17&4294967295|_>>>15),_=y+(p^v&(R^p))+E[7]+4249261313&4294967295,y=v+(_<<22&4294967295|_>>>10),_=p+(R^y&(v^R))+E[8]+1770035416&4294967295,p=y+(_<<7&4294967295|_>>>25),_=R+(v^p&(y^v))+E[9]+2336552879&4294967295,R=p+(_<<12&4294967295|_>>>20),_=v+(y^R&(p^y))+E[10]+4294925233&4294967295,v=R+(_<<17&4294967295|_>>>15),_=y+(p^v&(R^p))+E[11]+2304563134&4294967295,y=v+(_<<22&4294967295|_>>>10),_=p+(R^y&(v^R))+E[12]+1804603682&4294967295,p=y+(_<<7&4294967295|_>>>25),_=R+(v^p&(y^v))+E[13]+4254626195&4294967295,R=p+(_<<12&4294967295|_>>>20),_=v+(y^R&(p^y))+E[14]+2792965006&4294967295,v=R+(_<<17&4294967295|_>>>15),_=y+(p^v&(R^p))+E[15]+1236535329&4294967295,y=v+(_<<22&4294967295|_>>>10),_=p+(v^R&(y^v))+E[1]+4129170786&4294967295,p=y+(_<<5&4294967295|_>>>27),_=R+(y^v&(p^y))+E[6]+3225465664&4294967295,R=p+(_<<9&4294967295|_>>>23),_=v+(p^y&(R^p))+E[11]+643717713&4294967295,v=R+(_<<14&4294967295|_>>>18),_=y+(R^p&(v^R))+E[0]+3921069994&4294967295,y=v+(_<<20&4294967295|_>>>12),_=p+(v^R&(y^v))+E[5]+3593408605&4294967295,p=y+(_<<5&4294967295|_>>>27),_=R+(y^v&(p^y))+E[10]+38016083&4294967295,R=p+(_<<9&4294967295|_>>>23),_=v+(p^y&(R^p))+E[15]+3634488961&4294967295,v=R+(_<<14&4294967295|_>>>18),_=y+(R^p&(v^R))+E[4]+3889429448&4294967295,y=v+(_<<20&4294967295|_>>>12),_=p+(v^R&(y^v))+E[9]+568446438&4294967295,p=y+(_<<5&4294967295|_>>>27),_=R+(y^v&(p^y))+E[14]+3275163606&4294967295,R=p+(_<<9&4294967295|_>>>23),_=v+(p^y&(R^p))+E[3]+4107603335&4294967295,v=R+(_<<14&4294967295|_>>>18),_=y+(R^p&(v^R))+E[8]+1163531501&4294967295,y=v+(_<<20&4294967295|_>>>12),_=p+(v^R&(y^v))+E[13]+2850285829&4294967295,p=y+(_<<5&4294967295|_>>>27),_=R+(y^v&(p^y))+E[2]+4243563512&4294967295,R=p+(_<<9&4294967295|_>>>23),_=v+(p^y&(R^p))+E[7]+1735328473&4294967295,v=R+(_<<14&4294967295|_>>>18),_=y+(R^p&(v^R))+E[12]+2368359562&4294967295,y=v+(_<<20&4294967295|_>>>12),_=p+(y^v^R)+E[5]+4294588738&4294967295,p=y+(_<<4&4294967295|_>>>28),_=R+(p^y^v)+E[8]+2272392833&4294967295,R=p+(_<<11&4294967295|_>>>21),_=v+(R^p^y)+E[11]+1839030562&4294967295,v=R+(_<<16&4294967295|_>>>16),_=y+(v^R^p)+E[14]+4259657740&4294967295,y=v+(_<<23&4294967295|_>>>9),_=p+(y^v^R)+E[1]+2763975236&4294967295,p=y+(_<<4&4294967295|_>>>28),_=R+(p^y^v)+E[4]+1272893353&4294967295,R=p+(_<<11&4294967295|_>>>21),_=v+(R^p^y)+E[7]+4139469664&4294967295,v=R+(_<<16&4294967295|_>>>16),_=y+(v^R^p)+E[10]+3200236656&4294967295,y=v+(_<<23&4294967295|_>>>9),_=p+(y^v^R)+E[13]+681279174&4294967295,p=y+(_<<4&4294967295|_>>>28),_=R+(p^y^v)+E[0]+3936430074&4294967295,R=p+(_<<11&4294967295|_>>>21),_=v+(R^p^y)+E[3]+3572445317&4294967295,v=R+(_<<16&4294967295|_>>>16),_=y+(v^R^p)+E[6]+76029189&4294967295,y=v+(_<<23&4294967295|_>>>9),_=p+(y^v^R)+E[9]+3654602809&4294967295,p=y+(_<<4&4294967295|_>>>28),_=R+(p^y^v)+E[12]+3873151461&4294967295,R=p+(_<<11&4294967295|_>>>21),_=v+(R^p^y)+E[15]+530742520&4294967295,v=R+(_<<16&4294967295|_>>>16),_=y+(v^R^p)+E[2]+3299628645&4294967295,y=v+(_<<23&4294967295|_>>>9),_=p+(v^(y|~R))+E[0]+4096336452&4294967295,p=y+(_<<6&4294967295|_>>>26),_=R+(y^(p|~v))+E[7]+1126891415&4294967295,R=p+(_<<10&4294967295|_>>>22),_=v+(p^(R|~y))+E[14]+2878612391&4294967295,v=R+(_<<15&4294967295|_>>>17),_=y+(R^(v|~p))+E[5]+4237533241&4294967295,y=v+(_<<21&4294967295|_>>>11),_=p+(v^(y|~R))+E[12]+1700485571&4294967295,p=y+(_<<6&4294967295|_>>>26),_=R+(y^(p|~v))+E[3]+2399980690&4294967295,R=p+(_<<10&4294967295|_>>>22),_=v+(p^(R|~y))+E[10]+4293915773&4294967295,v=R+(_<<15&4294967295|_>>>17),_=y+(R^(v|~p))+E[1]+2240044497&4294967295,y=v+(_<<21&4294967295|_>>>11),_=p+(v^(y|~R))+E[8]+1873313359&4294967295,p=y+(_<<6&4294967295|_>>>26),_=R+(y^(p|~v))+E[15]+4264355552&4294967295,R=p+(_<<10&4294967295|_>>>22),_=v+(p^(R|~y))+E[6]+2734768916&4294967295,v=R+(_<<15&4294967295|_>>>17),_=y+(R^(v|~p))+E[13]+1309151649&4294967295,y=v+(_<<21&4294967295|_>>>11),_=p+(v^(y|~R))+E[4]+4149444226&4294967295,p=y+(_<<6&4294967295|_>>>26),_=R+(y^(p|~v))+E[11]+3174756917&4294967295,R=p+(_<<10&4294967295|_>>>22),_=v+(p^(R|~y))+E[2]+718787259&4294967295,v=R+(_<<15&4294967295|_>>>17),_=y+(R^(v|~p))+E[9]+3951481745&4294967295,T.g[0]=T.g[0]+p&4294967295,T.g[1]=T.g[1]+(v+(_<<21&4294967295|_>>>11))&4294967295,T.g[2]=T.g[2]+v&4294967295,T.g[3]=T.g[3]+R&4294967295}n.prototype.u=function(T,p){p===void 0&&(p=T.length);for(var y=p-this.blockSize,E=this.B,v=this.h,R=0;R<p;){if(v==0)for(;R<=y;)i(this,T,R),R+=this.blockSize;if(typeof T=="string"){for(;R<p;)if(E[v++]=T.charCodeAt(R++),v==this.blockSize){i(this,E),v=0;break}}else for(;R<p;)if(E[v++]=T[R++],v==this.blockSize){i(this,E),v=0;break}}this.h=v,this.o+=p},n.prototype.v=function(){var T=Array((56>this.h?this.blockSize:2*this.blockSize)-this.h);T[0]=128;for(var p=1;p<T.length-8;++p)T[p]=0;var y=8*this.o;for(p=T.length-8;p<T.length;++p)T[p]=y&255,y/=256;for(this.u(T),T=Array(16),p=y=0;4>p;++p)for(var E=0;32>E;E+=8)T[y++]=this.g[p]>>>E&255;return T};function s(T,p){var y=u;return Object.prototype.hasOwnProperty.call(y,T)?y[T]:y[T]=p(T)}function a(T,p){this.h=p;for(var y=[],E=!0,v=T.length-1;0<=v;v--){var R=T[v]|0;E&&R==p||(y[v]=R,E=!1)}this.g=y}var u={};function c(T){return-128<=T&&128>T?s(T,function(p){return new a([p|0],0>p?-1:0)}):new a([T|0],0>T?-1:0)}function d(T){if(isNaN(T)||!isFinite(T))return g;if(0>T)return D(d(-T));for(var p=[],y=1,E=0;T>=y;E++)p[E]=T/y|0,y*=4294967296;return new a(p,0)}function f(T,p){if(T.length==0)throw Error("number format error: empty string");if(p=p||10,2>p||36<p)throw Error("radix out of range: "+p);if(T.charAt(0)=="-")return D(f(T.substring(1),p));if(0<=T.indexOf("-"))throw Error('number format error: interior "-" character');for(var y=d(Math.pow(p,8)),E=g,v=0;v<T.length;v+=8){var R=Math.min(8,T.length-v),_=parseInt(T.substring(v,v+R),p);8>R?(R=d(Math.pow(p,R)),E=E.j(R).add(d(_))):(E=E.j(y),E=E.add(d(_)))}return E}var g=c(0),I=c(1),V=c(16777216);r=a.prototype,r.m=function(){if(N(this))return-D(this).m();for(var T=0,p=1,y=0;y<this.g.length;y++){var E=this.i(y);T+=(0<=E?E:4294967296+E)*p,p*=4294967296}return T},r.toString=function(T){if(T=T||10,2>T||36<T)throw Error("radix out of range: "+T);if(x(this))return"0";if(N(this))return"-"+D(this).toString(T);for(var p=d(Math.pow(T,6)),y=this,E="";;){var v=H(y,p).g;y=j(y,v.j(p));var R=((0<y.g.length?y.g[0]:y.h)>>>0).toString(T);if(y=v,x(y))return R+E;for(;6>R.length;)R="0"+R;E=R+E}},r.i=function(T){return 0>T?0:T<this.g.length?this.g[T]:this.h};function x(T){if(T.h!=0)return!1;for(var p=0;p<T.g.length;p++)if(T.g[p]!=0)return!1;return!0}function N(T){return T.h==-1}r.l=function(T){return T=j(this,T),N(T)?-1:x(T)?0:1};function D(T){for(var p=T.g.length,y=[],E=0;E<p;E++)y[E]=~T.g[E];return new a(y,~T.h).add(I)}r.abs=function(){return N(this)?D(this):this},r.add=function(T){for(var p=Math.max(this.g.length,T.g.length),y=[],E=0,v=0;v<=p;v++){var R=E+(this.i(v)&65535)+(T.i(v)&65535),_=(R>>>16)+(this.i(v)>>>16)+(T.i(v)>>>16);E=_>>>16,R&=65535,_&=65535,y[v]=_<<16|R}return new a(y,y[y.length-1]&-2147483648?-1:0)};function j(T,p){return T.add(D(p))}r.j=function(T){if(x(this)||x(T))return g;if(N(this))return N(T)?D(this).j(D(T)):D(D(this).j(T));if(N(T))return D(this.j(D(T)));if(0>this.l(V)&&0>T.l(V))return d(this.m()*T.m());for(var p=this.g.length+T.g.length,y=[],E=0;E<2*p;E++)y[E]=0;for(E=0;E<this.g.length;E++)for(var v=0;v<T.g.length;v++){var R=this.i(E)>>>16,_=this.i(E)&65535,jt=T.i(v)>>>16,In=T.i(v)&65535;y[2*E+2*v]+=_*In,G(y,2*E+2*v),y[2*E+2*v+1]+=R*In,G(y,2*E+2*v+1),y[2*E+2*v+1]+=_*jt,G(y,2*E+2*v+1),y[2*E+2*v+2]+=R*jt,G(y,2*E+2*v+2)}for(E=0;E<p;E++)y[E]=y[2*E+1]<<16|y[2*E];for(E=p;E<2*p;E++)y[E]=0;return new a(y,0)};function G(T,p){for(;(T[p]&65535)!=T[p];)T[p+1]+=T[p]>>>16,T[p]&=65535,p++}function U(T,p){this.g=T,this.h=p}function H(T,p){if(x(p))throw Error("division by zero");if(x(T))return new U(g,g);if(N(T))return p=H(D(T),p),new U(D(p.g),D(p.h));if(N(p))return p=H(T,D(p)),new U(D(p.g),p.h);if(30<T.g.length){if(N(T)||N(p))throw Error("slowDivide_ only works with positive integers.");for(var y=I,E=p;0>=E.l(T);)y=tt(y),E=tt(E);var v=$(y,1),R=$(E,1);for(E=$(E,2),y=$(y,2);!x(E);){var _=R.add(E);0>=_.l(T)&&(v=v.add(y),R=_),E=$(E,1),y=$(y,1)}return p=j(T,v.j(p)),new U(v,p)}for(v=g;0<=T.l(p);){for(y=Math.max(1,Math.floor(T.m()/p.m())),E=Math.ceil(Math.log(y)/Math.LN2),E=48>=E?1:Math.pow(2,E-48),R=d(y),_=R.j(p);N(_)||0<_.l(T);)y-=E,R=d(y),_=R.j(p);x(R)&&(R=I),v=v.add(R),T=j(T,_)}return new U(v,T)}r.A=function(T){return H(this,T).h},r.and=function(T){for(var p=Math.max(this.g.length,T.g.length),y=[],E=0;E<p;E++)y[E]=this.i(E)&T.i(E);return new a(y,this.h&T.h)},r.or=function(T){for(var p=Math.max(this.g.length,T.g.length),y=[],E=0;E<p;E++)y[E]=this.i(E)|T.i(E);return new a(y,this.h|T.h)},r.xor=function(T){for(var p=Math.max(this.g.length,T.g.length),y=[],E=0;E<p;E++)y[E]=this.i(E)^T.i(E);return new a(y,this.h^T.h)};function tt(T){for(var p=T.g.length+1,y=[],E=0;E<p;E++)y[E]=T.i(E)<<1|T.i(E-1)>>>31;return new a(y,T.h)}function $(T,p){var y=p>>5;p%=32;for(var E=T.g.length-y,v=[],R=0;R<E;R++)v[R]=0<p?T.i(R+y)>>>p|T.i(R+y+1)<<32-p:T.i(R+y);return new a(v,T.h)}n.prototype.digest=n.prototype.v,n.prototype.reset=n.prototype.s,n.prototype.update=n.prototype.u,Uu=n,a.prototype.add=a.prototype.add,a.prototype.multiply=a.prototype.j,a.prototype.modulo=a.prototype.A,a.prototype.compare=a.prototype.l,a.prototype.toNumber=a.prototype.m,a.prototype.toString=a.prototype.toString,a.prototype.getBits=a.prototype.i,a.fromNumber=d,a.fromString=f,Ve=a}).apply(typeof ba<"u"?ba:typeof self<"u"?self:typeof window<"u"?window:{});var kr=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var qu,qn,Gu,Ur,as,ju,Ku,zu;(function(){var r,t=typeof Object.defineProperties=="function"?Object.defineProperty:function(o,l,h){return o==Array.prototype||o==Object.prototype||(o[l]=h.value),o};function e(o){o=[typeof globalThis=="object"&&globalThis,o,typeof window=="object"&&window,typeof self=="object"&&self,typeof kr=="object"&&kr];for(var l=0;l<o.length;++l){var h=o[l];if(h&&h.Math==Math)return h}throw Error("Cannot find global object")}var n=e(this);function i(o,l){if(l)t:{var h=n;o=o.split(".");for(var m=0;m<o.length-1;m++){var w=o[m];if(!(w in h))break t;h=h[w]}o=o[o.length-1],m=h[o],l=l(m),l!=m&&l!=null&&t(h,o,{configurable:!0,writable:!0,value:l})}}function s(o,l){o instanceof String&&(o+="");var h=0,m=!1,w={next:function(){if(!m&&h<o.length){var P=h++;return{value:l(P,o[P]),done:!1}}return m=!0,{done:!0,value:void 0}}};return w[Symbol.iterator]=function(){return w},w}i("Array.prototype.values",function(o){return o||function(){return s(this,function(l,h){return h})}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var a=a||{},u=this||self;function c(o){var l=typeof o;return l=l!="object"?l:o?Array.isArray(o)?"array":l:"null",l=="array"||l=="object"&&typeof o.length=="number"}function d(o){var l=typeof o;return l=="object"&&o!=null||l=="function"}function f(o,l,h){return o.call.apply(o.bind,arguments)}function g(o,l,h){if(!o)throw Error();if(2<arguments.length){var m=Array.prototype.slice.call(arguments,2);return function(){var w=Array.prototype.slice.call(arguments);return Array.prototype.unshift.apply(w,m),o.apply(l,w)}}return function(){return o.apply(l,arguments)}}function I(o,l,h){return I=Function.prototype.bind&&Function.prototype.bind.toString().indexOf("native code")!=-1?f:g,I.apply(null,arguments)}function V(o,l){var h=Array.prototype.slice.call(arguments,1);return function(){var m=h.slice();return m.push.apply(m,arguments),o.apply(this,m)}}function x(o,l){function h(){}h.prototype=l.prototype,o.aa=l.prototype,o.prototype=new h,o.prototype.constructor=o,o.Qb=function(m,w,P){for(var k=Array(arguments.length-2),Z=2;Z<arguments.length;Z++)k[Z-2]=arguments[Z];return l.prototype[w].apply(m,k)}}function N(o){const l=o.length;if(0<l){const h=Array(l);for(let m=0;m<l;m++)h[m]=o[m];return h}return[]}function D(o,l){for(let h=1;h<arguments.length;h++){const m=arguments[h];if(c(m)){const w=o.length||0,P=m.length||0;o.length=w+P;for(let k=0;k<P;k++)o[w+k]=m[k]}else o.push(m)}}class j{constructor(l,h){this.i=l,this.j=h,this.h=0,this.g=null}get(){let l;return 0<this.h?(this.h--,l=this.g,this.g=l.next,l.next=null):l=this.i(),l}}function G(o){return/^[\s\xa0]*$/.test(o)}function U(){var o=u.navigator;return o&&(o=o.userAgent)?o:""}function H(o){return H[" "](o),o}H[" "]=function(){};var tt=U().indexOf("Gecko")!=-1&&!(U().toLowerCase().indexOf("webkit")!=-1&&U().indexOf("Edge")==-1)&&!(U().indexOf("Trident")!=-1||U().indexOf("MSIE")!=-1)&&U().indexOf("Edge")==-1;function $(o,l,h){for(const m in o)l.call(h,o[m],m,o)}function T(o,l){for(const h in o)l.call(void 0,o[h],h,o)}function p(o){const l={};for(const h in o)l[h]=o[h];return l}const y="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function E(o,l){let h,m;for(let w=1;w<arguments.length;w++){m=arguments[w];for(h in m)o[h]=m[h];for(let P=0;P<y.length;P++)h=y[P],Object.prototype.hasOwnProperty.call(m,h)&&(o[h]=m[h])}}function v(o){var l=1;o=o.split(":");const h=[];for(;0<l&&o.length;)h.push(o.shift()),l--;return o.length&&h.push(o.join(":")),h}function R(o){u.setTimeout(()=>{throw o},0)}function _(){var o=Ci;let l=null;return o.g&&(l=o.g,o.g=o.g.next,o.g||(o.h=null),l.next=null),l}class jt{constructor(){this.h=this.g=null}add(l,h){const m=In.get();m.set(l,h),this.h?this.h.next=m:this.g=m,this.h=m}}var In=new j(()=>new Kc,o=>o.reset());class Kc{constructor(){this.next=this.g=this.h=null}set(l,h){this.h=l,this.g=h,this.next=null}reset(){this.next=this.g=this.h=null}}let Tn,En=!1,Ci=new jt,So=()=>{const o=u.Promise.resolve(void 0);Tn=()=>{o.then(zc)}};var zc=()=>{for(var o;o=_();){try{o.h.call(o.g)}catch(h){R(h)}var l=In;l.j(o),100>l.h&&(l.h++,o.next=l.g,l.g=o)}En=!1};function Yt(){this.s=this.s,this.C=this.C}Yt.prototype.s=!1,Yt.prototype.ma=function(){this.s||(this.s=!0,this.N())},Yt.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function pt(o,l){this.type=o,this.g=this.target=l,this.defaultPrevented=!1}pt.prototype.h=function(){this.defaultPrevented=!0};var Qc=function(){if(!u.addEventListener||!Object.defineProperty)return!1;var o=!1,l=Object.defineProperty({},"passive",{get:function(){o=!0}});try{const h=()=>{};u.addEventListener("test",h,l),u.removeEventListener("test",h,l)}catch{}return o}();function vn(o,l){if(pt.call(this,o?o.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,o){var h=this.type=o.type,m=o.changedTouches&&o.changedTouches.length?o.changedTouches[0]:null;if(this.target=o.target||o.srcElement,this.g=l,l=o.relatedTarget){if(tt){t:{try{H(l.nodeName);var w=!0;break t}catch{}w=!1}w||(l=null)}}else h=="mouseover"?l=o.fromElement:h=="mouseout"&&(l=o.toElement);this.relatedTarget=l,m?(this.clientX=m.clientX!==void 0?m.clientX:m.pageX,this.clientY=m.clientY!==void 0?m.clientY:m.pageY,this.screenX=m.screenX||0,this.screenY=m.screenY||0):(this.clientX=o.clientX!==void 0?o.clientX:o.pageX,this.clientY=o.clientY!==void 0?o.clientY:o.pageY,this.screenX=o.screenX||0,this.screenY=o.screenY||0),this.button=o.button,this.key=o.key||"",this.ctrlKey=o.ctrlKey,this.altKey=o.altKey,this.shiftKey=o.shiftKey,this.metaKey=o.metaKey,this.pointerId=o.pointerId||0,this.pointerType=typeof o.pointerType=="string"?o.pointerType:$c[o.pointerType]||"",this.state=o.state,this.i=o,o.defaultPrevented&&vn.aa.h.call(this)}}x(vn,pt);var $c={2:"touch",3:"pen",4:"mouse"};vn.prototype.h=function(){vn.aa.h.call(this);var o=this.i;o.preventDefault?o.preventDefault():o.returnValue=!1};var gr="closure_listenable_"+(1e6*Math.random()|0),Wc=0;function Hc(o,l,h,m,w){this.listener=o,this.proxy=null,this.src=l,this.type=h,this.capture=!!m,this.ha=w,this.key=++Wc,this.da=this.fa=!1}function pr(o){o.da=!0,o.listener=null,o.proxy=null,o.src=null,o.ha=null}function _r(o){this.src=o,this.g={},this.h=0}_r.prototype.add=function(o,l,h,m,w){var P=o.toString();o=this.g[P],o||(o=this.g[P]=[],this.h++);var k=Di(o,l,m,w);return-1<k?(l=o[k],h||(l.fa=!1)):(l=new Hc(l,this.src,P,!!m,w),l.fa=h,o.push(l)),l};function xi(o,l){var h=l.type;if(h in o.g){var m=o.g[h],w=Array.prototype.indexOf.call(m,l,void 0),P;(P=0<=w)&&Array.prototype.splice.call(m,w,1),P&&(pr(l),o.g[h].length==0&&(delete o.g[h],o.h--))}}function Di(o,l,h,m){for(var w=0;w<o.length;++w){var P=o[w];if(!P.da&&P.listener==l&&P.capture==!!h&&P.ha==m)return w}return-1}var Ni="closure_lm_"+(1e6*Math.random()|0),ki={};function bo(o,l,h,m,w){if(Array.isArray(l)){for(var P=0;P<l.length;P++)bo(o,l[P],h,m,w);return null}return h=Do(h),o&&o[gr]?o.K(l,h,d(m)?!!m.capture:!1,w):Jc(o,l,h,!1,m,w)}function Jc(o,l,h,m,w,P){if(!l)throw Error("Invalid event type");var k=d(w)?!!w.capture:!!w,Z=Oi(o);if(Z||(o[Ni]=Z=new _r(o)),h=Z.add(l,h,m,k,P),h.proxy)return h;if(m=Yc(),h.proxy=m,m.src=o,m.listener=h,o.addEventListener)Qc||(w=k),w===void 0&&(w=!1),o.addEventListener(l.toString(),m,w);else if(o.attachEvent)o.attachEvent(xo(l.toString()),m);else if(o.addListener&&o.removeListener)o.addListener(m);else throw Error("addEventListener and attachEvent are unavailable.");return h}function Yc(){function o(h){return l.call(o.src,o.listener,h)}const l=Xc;return o}function Co(o,l,h,m,w){if(Array.isArray(l))for(var P=0;P<l.length;P++)Co(o,l[P],h,m,w);else m=d(m)?!!m.capture:!!m,h=Do(h),o&&o[gr]?(o=o.i,l=String(l).toString(),l in o.g&&(P=o.g[l],h=Di(P,h,m,w),-1<h&&(pr(P[h]),Array.prototype.splice.call(P,h,1),P.length==0&&(delete o.g[l],o.h--)))):o&&(o=Oi(o))&&(l=o.g[l.toString()],o=-1,l&&(o=Di(l,h,m,w)),(h=-1<o?l[o]:null)&&Mi(h))}function Mi(o){if(typeof o!="number"&&o&&!o.da){var l=o.src;if(l&&l[gr])xi(l.i,o);else{var h=o.type,m=o.proxy;l.removeEventListener?l.removeEventListener(h,m,o.capture):l.detachEvent?l.detachEvent(xo(h),m):l.addListener&&l.removeListener&&l.removeListener(m),(h=Oi(l))?(xi(h,o),h.h==0&&(h.src=null,l[Ni]=null)):pr(o)}}}function xo(o){return o in ki?ki[o]:ki[o]="on"+o}function Xc(o,l){if(o.da)o=!0;else{l=new vn(l,this);var h=o.listener,m=o.ha||o.src;o.fa&&Mi(o),o=h.call(m,l)}return o}function Oi(o){return o=o[Ni],o instanceof _r?o:null}var Fi="__closure_events_fn_"+(1e9*Math.random()>>>0);function Do(o){return typeof o=="function"?o:(o[Fi]||(o[Fi]=function(l){return o.handleEvent(l)}),o[Fi])}function _t(){Yt.call(this),this.i=new _r(this),this.M=this,this.F=null}x(_t,Yt),_t.prototype[gr]=!0,_t.prototype.removeEventListener=function(o,l,h,m){Co(this,o,l,h,m)};function At(o,l){var h,m=o.F;if(m)for(h=[];m;m=m.F)h.push(m);if(o=o.M,m=l.type||l,typeof l=="string")l=new pt(l,o);else if(l instanceof pt)l.target=l.target||o;else{var w=l;l=new pt(m,o),E(l,w)}if(w=!0,h)for(var P=h.length-1;0<=P;P--){var k=l.g=h[P];w=yr(k,m,!0,l)&&w}if(k=l.g=o,w=yr(k,m,!0,l)&&w,w=yr(k,m,!1,l)&&w,h)for(P=0;P<h.length;P++)k=l.g=h[P],w=yr(k,m,!1,l)&&w}_t.prototype.N=function(){if(_t.aa.N.call(this),this.i){var o=this.i,l;for(l in o.g){for(var h=o.g[l],m=0;m<h.length;m++)pr(h[m]);delete o.g[l],o.h--}}this.F=null},_t.prototype.K=function(o,l,h,m){return this.i.add(String(o),l,!1,h,m)},_t.prototype.L=function(o,l,h,m){return this.i.add(String(o),l,!0,h,m)};function yr(o,l,h,m){if(l=o.i.g[String(l)],!l)return!0;l=l.concat();for(var w=!0,P=0;P<l.length;++P){var k=l[P];if(k&&!k.da&&k.capture==h){var Z=k.listener,ft=k.ha||k.src;k.fa&&xi(o.i,k),w=Z.call(ft,m)!==!1&&w}}return w&&!m.defaultPrevented}function No(o,l,h){if(typeof o=="function")h&&(o=I(o,h));else if(o&&typeof o.handleEvent=="function")o=I(o.handleEvent,o);else throw Error("Invalid listener argument");return 2147483647<Number(l)?-1:u.setTimeout(o,l||0)}function ko(o){o.g=No(()=>{o.g=null,o.i&&(o.i=!1,ko(o))},o.l);const l=o.h;o.h=null,o.m.apply(null,l)}class Zc extends Yt{constructor(l,h){super(),this.m=l,this.l=h,this.h=null,this.i=!1,this.g=null}j(l){this.h=arguments,this.g?this.i=!0:ko(this)}N(){super.N(),this.g&&(u.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function wn(o){Yt.call(this),this.h=o,this.g={}}x(wn,Yt);var Mo=[];function Oo(o){$(o.g,function(l,h){this.g.hasOwnProperty(h)&&Mi(l)},o),o.g={}}wn.prototype.N=function(){wn.aa.N.call(this),Oo(this)},wn.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Li=u.JSON.stringify,th=u.JSON.parse,eh=class{stringify(o){return u.JSON.stringify(o,void 0)}parse(o){return u.JSON.parse(o,void 0)}};function Bi(){}Bi.prototype.h=null;function Fo(o){return o.h||(o.h=o.i())}function Lo(){}var An={OPEN:"a",kb:"b",Ja:"c",wb:"d"};function Ui(){pt.call(this,"d")}x(Ui,pt);function qi(){pt.call(this,"c")}x(qi,pt);var pe={},Bo=null;function Ir(){return Bo=Bo||new _t}pe.La="serverreachability";function Uo(o){pt.call(this,pe.La,o)}x(Uo,pt);function Rn(o){const l=Ir();At(l,new Uo(l))}pe.STAT_EVENT="statevent";function qo(o,l){pt.call(this,pe.STAT_EVENT,o),this.stat=l}x(qo,pt);function Rt(o){const l=Ir();At(l,new qo(l,o))}pe.Ma="timingevent";function Go(o,l){pt.call(this,pe.Ma,o),this.size=l}x(Go,pt);function Vn(o,l){if(typeof o!="function")throw Error("Fn must not be null and must be a function");return u.setTimeout(function(){o()},l)}function Pn(){this.g=!0}Pn.prototype.xa=function(){this.g=!1};function nh(o,l,h,m,w,P){o.info(function(){if(o.g)if(P)for(var k="",Z=P.split("&"),ft=0;ft<Z.length;ft++){var W=Z[ft].split("=");if(1<W.length){var yt=W[0];W=W[1];var It=yt.split("_");k=2<=It.length&&It[1]=="type"?k+(yt+"="+W+"&"):k+(yt+"=redacted&")}}else k=null;else k=P;return"XMLHTTP REQ ("+m+") [attempt "+w+"]: "+l+`
`+h+`
`+k})}function rh(o,l,h,m,w,P,k){o.info(function(){return"XMLHTTP RESP ("+m+") [ attempt "+w+"]: "+l+`
`+h+`
`+P+" "+k})}function Le(o,l,h,m){o.info(function(){return"XMLHTTP TEXT ("+l+"): "+sh(o,h)+(m?" "+m:"")})}function ih(o,l){o.info(function(){return"TIMEOUT: "+l})}Pn.prototype.info=function(){};function sh(o,l){if(!o.g)return l;if(!l)return null;try{var h=JSON.parse(l);if(h){for(o=0;o<h.length;o++)if(Array.isArray(h[o])){var m=h[o];if(!(2>m.length)){var w=m[1];if(Array.isArray(w)&&!(1>w.length)){var P=w[0];if(P!="noop"&&P!="stop"&&P!="close")for(var k=1;k<w.length;k++)w[k]=""}}}}return Li(h)}catch{return l}}var Tr={NO_ERROR:0,gb:1,tb:2,sb:3,nb:4,rb:5,ub:6,Ia:7,TIMEOUT:8,xb:9},jo={lb:"complete",Hb:"success",Ja:"error",Ia:"abort",zb:"ready",Ab:"readystatechange",TIMEOUT:"timeout",vb:"incrementaldata",yb:"progress",ob:"downloadprogress",Pb:"uploadprogress"},Gi;function Er(){}x(Er,Bi),Er.prototype.g=function(){return new XMLHttpRequest},Er.prototype.i=function(){return{}},Gi=new Er;function Xt(o,l,h,m){this.j=o,this.i=l,this.l=h,this.R=m||1,this.U=new wn(this),this.I=45e3,this.H=null,this.o=!1,this.m=this.A=this.v=this.L=this.F=this.S=this.B=null,this.D=[],this.g=null,this.C=0,this.s=this.u=null,this.X=-1,this.J=!1,this.O=0,this.M=null,this.W=this.K=this.T=this.P=!1,this.h=new Ko}function Ko(){this.i=null,this.g="",this.h=!1}var zo={},ji={};function Ki(o,l,h){o.L=1,o.v=Rr(Kt(l)),o.m=h,o.P=!0,Qo(o,null)}function Qo(o,l){o.F=Date.now(),vr(o),o.A=Kt(o.v);var h=o.A,m=o.R;Array.isArray(m)||(m=[String(m)]),oa(h.i,"t",m),o.C=0,h=o.j.J,o.h=new Ko,o.g=Aa(o.j,h?l:null,!o.m),0<o.O&&(o.M=new Zc(I(o.Y,o,o.g),o.O)),l=o.U,h=o.g,m=o.ca;var w="readystatechange";Array.isArray(w)||(w&&(Mo[0]=w.toString()),w=Mo);for(var P=0;P<w.length;P++){var k=bo(h,w[P],m||l.handleEvent,!1,l.h||l);if(!k)break;l.g[k.key]=k}l=o.H?p(o.H):{},o.m?(o.u||(o.u="POST"),l["Content-Type"]="application/x-www-form-urlencoded",o.g.ea(o.A,o.u,o.m,l)):(o.u="GET",o.g.ea(o.A,o.u,null,l)),Rn(),nh(o.i,o.u,o.A,o.l,o.R,o.m)}Xt.prototype.ca=function(o){o=o.target;const l=this.M;l&&zt(o)==3?l.j():this.Y(o)},Xt.prototype.Y=function(o){try{if(o==this.g)t:{const It=zt(this.g);var l=this.g.Ba();const qe=this.g.Z();if(!(3>It)&&(It!=3||this.g&&(this.h.h||this.g.oa()||fa(this.g)))){this.J||It!=4||l==7||(l==8||0>=qe?Rn(3):Rn(2)),zi(this);var h=this.g.Z();this.X=h;e:if($o(this)){var m=fa(this.g);o="";var w=m.length,P=zt(this.g)==4;if(!this.h.i){if(typeof TextDecoder>"u"){_e(this),Sn(this);var k="";break e}this.h.i=new u.TextDecoder}for(l=0;l<w;l++)this.h.h=!0,o+=this.h.i.decode(m[l],{stream:!(P&&l==w-1)});m.length=0,this.h.g+=o,this.C=0,k=this.h.g}else k=this.g.oa();if(this.o=h==200,rh(this.i,this.u,this.A,this.l,this.R,It,h),this.o){if(this.T&&!this.K){e:{if(this.g){var Z,ft=this.g;if((Z=ft.g?ft.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!G(Z)){var W=Z;break e}}W=null}if(h=W)Le(this.i,this.l,h,"Initial handshake response via X-HTTP-Initial-Response"),this.K=!0,Qi(this,h);else{this.o=!1,this.s=3,Rt(12),_e(this),Sn(this);break t}}if(this.P){h=!0;let Ft;for(;!this.J&&this.C<k.length;)if(Ft=oh(this,k),Ft==ji){It==4&&(this.s=4,Rt(14),h=!1),Le(this.i,this.l,null,"[Incomplete Response]");break}else if(Ft==zo){this.s=4,Rt(15),Le(this.i,this.l,k,"[Invalid Chunk]"),h=!1;break}else Le(this.i,this.l,Ft,null),Qi(this,Ft);if($o(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),It!=4||k.length!=0||this.h.h||(this.s=1,Rt(16),h=!1),this.o=this.o&&h,!h)Le(this.i,this.l,k,"[Invalid Chunked Response]"),_e(this),Sn(this);else if(0<k.length&&!this.W){this.W=!0;var yt=this.j;yt.g==this&&yt.ba&&!yt.M&&(yt.j.info("Great, no buffering proxy detected. Bytes received: "+k.length),Xi(yt),yt.M=!0,Rt(11))}}else Le(this.i,this.l,k,null),Qi(this,k);It==4&&_e(this),this.o&&!this.J&&(It==4?Ta(this.j,this):(this.o=!1,vr(this)))}else wh(this.g),h==400&&0<k.indexOf("Unknown SID")?(this.s=3,Rt(12)):(this.s=0,Rt(13)),_e(this),Sn(this)}}}catch{}finally{}};function $o(o){return o.g?o.u=="GET"&&o.L!=2&&o.j.Ca:!1}function oh(o,l){var h=o.C,m=l.indexOf(`
`,h);return m==-1?ji:(h=Number(l.substring(h,m)),isNaN(h)?zo:(m+=1,m+h>l.length?ji:(l=l.slice(m,m+h),o.C=m+h,l)))}Xt.prototype.cancel=function(){this.J=!0,_e(this)};function vr(o){o.S=Date.now()+o.I,Wo(o,o.I)}function Wo(o,l){if(o.B!=null)throw Error("WatchDog timer not null");o.B=Vn(I(o.ba,o),l)}function zi(o){o.B&&(u.clearTimeout(o.B),o.B=null)}Xt.prototype.ba=function(){this.B=null;const o=Date.now();0<=o-this.S?(ih(this.i,this.A),this.L!=2&&(Rn(),Rt(17)),_e(this),this.s=2,Sn(this)):Wo(this,this.S-o)};function Sn(o){o.j.G==0||o.J||Ta(o.j,o)}function _e(o){zi(o);var l=o.M;l&&typeof l.ma=="function"&&l.ma(),o.M=null,Oo(o.U),o.g&&(l=o.g,o.g=null,l.abort(),l.ma())}function Qi(o,l){try{var h=o.j;if(h.G!=0&&(h.g==o||$i(h.h,o))){if(!o.K&&$i(h.h,o)&&h.G==3){try{var m=h.Da.g.parse(l)}catch{m=null}if(Array.isArray(m)&&m.length==3){var w=m;if(w[0]==0){t:if(!h.u){if(h.g)if(h.g.F+3e3<o.F)xr(h),br(h);else break t;Yi(h),Rt(18)}}else h.za=w[1],0<h.za-h.T&&37500>w[2]&&h.F&&h.v==0&&!h.C&&(h.C=Vn(I(h.Za,h),6e3));if(1>=Yo(h.h)&&h.ca){try{h.ca()}catch{}h.ca=void 0}}else Ie(h,11)}else if((o.K||h.g==o)&&xr(h),!G(l))for(w=h.Da.g.parse(l),l=0;l<w.length;l++){let W=w[l];if(h.T=W[0],W=W[1],h.G==2)if(W[0]=="c"){h.K=W[1],h.ia=W[2];const yt=W[3];yt!=null&&(h.la=yt,h.j.info("VER="+h.la));const It=W[4];It!=null&&(h.Aa=It,h.j.info("SVER="+h.Aa));const qe=W[5];qe!=null&&typeof qe=="number"&&0<qe&&(m=1.5*qe,h.L=m,h.j.info("backChannelRequestTimeoutMs_="+m)),m=h;const Ft=o.g;if(Ft){const Nr=Ft.g?Ft.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(Nr){var P=m.h;P.g||Nr.indexOf("spdy")==-1&&Nr.indexOf("quic")==-1&&Nr.indexOf("h2")==-1||(P.j=P.l,P.g=new Set,P.h&&(Wi(P,P.h),P.h=null))}if(m.D){const Zi=Ft.g?Ft.g.getResponseHeader("X-HTTP-Session-Id"):null;Zi&&(m.ya=Zi,nt(m.I,m.D,Zi))}}h.G=3,h.l&&h.l.ua(),h.ba&&(h.R=Date.now()-o.F,h.j.info("Handshake RTT: "+h.R+"ms")),m=h;var k=o;if(m.qa=wa(m,m.J?m.ia:null,m.W),k.K){Xo(m.h,k);var Z=k,ft=m.L;ft&&(Z.I=ft),Z.B&&(zi(Z),vr(Z)),m.g=k}else ya(m);0<h.i.length&&Cr(h)}else W[0]!="stop"&&W[0]!="close"||Ie(h,7);else h.G==3&&(W[0]=="stop"||W[0]=="close"?W[0]=="stop"?Ie(h,7):Ji(h):W[0]!="noop"&&h.l&&h.l.ta(W),h.v=0)}}Rn(4)}catch{}}var ah=class{constructor(o,l){this.g=o,this.map=l}};function Ho(o){this.l=o||10,u.PerformanceNavigationTiming?(o=u.performance.getEntriesByType("navigation"),o=0<o.length&&(o[0].nextHopProtocol=="hq"||o[0].nextHopProtocol=="h2")):o=!!(u.chrome&&u.chrome.loadTimes&&u.chrome.loadTimes()&&u.chrome.loadTimes().wasFetchedViaSpdy),this.j=o?this.l:1,this.g=null,1<this.j&&(this.g=new Set),this.h=null,this.i=[]}function Jo(o){return o.h?!0:o.g?o.g.size>=o.j:!1}function Yo(o){return o.h?1:o.g?o.g.size:0}function $i(o,l){return o.h?o.h==l:o.g?o.g.has(l):!1}function Wi(o,l){o.g?o.g.add(l):o.h=l}function Xo(o,l){o.h&&o.h==l?o.h=null:o.g&&o.g.has(l)&&o.g.delete(l)}Ho.prototype.cancel=function(){if(this.i=Zo(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const o of this.g.values())o.cancel();this.g.clear()}};function Zo(o){if(o.h!=null)return o.i.concat(o.h.D);if(o.g!=null&&o.g.size!==0){let l=o.i;for(const h of o.g.values())l=l.concat(h.D);return l}return N(o.i)}function uh(o){if(o.V&&typeof o.V=="function")return o.V();if(typeof Map<"u"&&o instanceof Map||typeof Set<"u"&&o instanceof Set)return Array.from(o.values());if(typeof o=="string")return o.split("");if(c(o)){for(var l=[],h=o.length,m=0;m<h;m++)l.push(o[m]);return l}l=[],h=0;for(m in o)l[h++]=o[m];return l}function lh(o){if(o.na&&typeof o.na=="function")return o.na();if(!o.V||typeof o.V!="function"){if(typeof Map<"u"&&o instanceof Map)return Array.from(o.keys());if(!(typeof Set<"u"&&o instanceof Set)){if(c(o)||typeof o=="string"){var l=[];o=o.length;for(var h=0;h<o;h++)l.push(h);return l}l=[],h=0;for(const m in o)l[h++]=m;return l}}}function ta(o,l){if(o.forEach&&typeof o.forEach=="function")o.forEach(l,void 0);else if(c(o)||typeof o=="string")Array.prototype.forEach.call(o,l,void 0);else for(var h=lh(o),m=uh(o),w=m.length,P=0;P<w;P++)l.call(void 0,m[P],h&&h[P],o)}var ea=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function ch(o,l){if(o){o=o.split("&");for(var h=0;h<o.length;h++){var m=o[h].indexOf("="),w=null;if(0<=m){var P=o[h].substring(0,m);w=o[h].substring(m+1)}else P=o[h];l(P,w?decodeURIComponent(w.replace(/\+/g," ")):"")}}}function ye(o){if(this.g=this.o=this.j="",this.s=null,this.m=this.l="",this.h=!1,o instanceof ye){this.h=o.h,wr(this,o.j),this.o=o.o,this.g=o.g,Ar(this,o.s),this.l=o.l;var l=o.i,h=new xn;h.i=l.i,l.g&&(h.g=new Map(l.g),h.h=l.h),na(this,h),this.m=o.m}else o&&(l=String(o).match(ea))?(this.h=!1,wr(this,l[1]||"",!0),this.o=bn(l[2]||""),this.g=bn(l[3]||"",!0),Ar(this,l[4]),this.l=bn(l[5]||"",!0),na(this,l[6]||"",!0),this.m=bn(l[7]||"")):(this.h=!1,this.i=new xn(null,this.h))}ye.prototype.toString=function(){var o=[],l=this.j;l&&o.push(Cn(l,ra,!0),":");var h=this.g;return(h||l=="file")&&(o.push("//"),(l=this.o)&&o.push(Cn(l,ra,!0),"@"),o.push(encodeURIComponent(String(h)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),h=this.s,h!=null&&o.push(":",String(h))),(h=this.l)&&(this.g&&h.charAt(0)!="/"&&o.push("/"),o.push(Cn(h,h.charAt(0)=="/"?fh:dh,!0))),(h=this.i.toString())&&o.push("?",h),(h=this.m)&&o.push("#",Cn(h,gh)),o.join("")};function Kt(o){return new ye(o)}function wr(o,l,h){o.j=h?bn(l,!0):l,o.j&&(o.j=o.j.replace(/:$/,""))}function Ar(o,l){if(l){if(l=Number(l),isNaN(l)||0>l)throw Error("Bad port number "+l);o.s=l}else o.s=null}function na(o,l,h){l instanceof xn?(o.i=l,ph(o.i,o.h)):(h||(l=Cn(l,mh)),o.i=new xn(l,o.h))}function nt(o,l,h){o.i.set(l,h)}function Rr(o){return nt(o,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^Date.now()).toString(36)),o}function bn(o,l){return o?l?decodeURI(o.replace(/%25/g,"%2525")):decodeURIComponent(o):""}function Cn(o,l,h){return typeof o=="string"?(o=encodeURI(o).replace(l,hh),h&&(o=o.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),o):null}function hh(o){return o=o.charCodeAt(0),"%"+(o>>4&15).toString(16)+(o&15).toString(16)}var ra=/[#\/\?@]/g,dh=/[#\?:]/g,fh=/[#\?]/g,mh=/[#\?@]/g,gh=/#/g;function xn(o,l){this.h=this.g=null,this.i=o||null,this.j=!!l}function Zt(o){o.g||(o.g=new Map,o.h=0,o.i&&ch(o.i,function(l,h){o.add(decodeURIComponent(l.replace(/\+/g," ")),h)}))}r=xn.prototype,r.add=function(o,l){Zt(this),this.i=null,o=Be(this,o);var h=this.g.get(o);return h||this.g.set(o,h=[]),h.push(l),this.h+=1,this};function ia(o,l){Zt(o),l=Be(o,l),o.g.has(l)&&(o.i=null,o.h-=o.g.get(l).length,o.g.delete(l))}function sa(o,l){return Zt(o),l=Be(o,l),o.g.has(l)}r.forEach=function(o,l){Zt(this),this.g.forEach(function(h,m){h.forEach(function(w){o.call(l,w,m,this)},this)},this)},r.na=function(){Zt(this);const o=Array.from(this.g.values()),l=Array.from(this.g.keys()),h=[];for(let m=0;m<l.length;m++){const w=o[m];for(let P=0;P<w.length;P++)h.push(l[m])}return h},r.V=function(o){Zt(this);let l=[];if(typeof o=="string")sa(this,o)&&(l=l.concat(this.g.get(Be(this,o))));else{o=Array.from(this.g.values());for(let h=0;h<o.length;h++)l=l.concat(o[h])}return l},r.set=function(o,l){return Zt(this),this.i=null,o=Be(this,o),sa(this,o)&&(this.h-=this.g.get(o).length),this.g.set(o,[l]),this.h+=1,this},r.get=function(o,l){return o?(o=this.V(o),0<o.length?String(o[0]):l):l};function oa(o,l,h){ia(o,l),0<h.length&&(o.i=null,o.g.set(Be(o,l),N(h)),o.h+=h.length)}r.toString=function(){if(this.i)return this.i;if(!this.g)return"";const o=[],l=Array.from(this.g.keys());for(var h=0;h<l.length;h++){var m=l[h];const P=encodeURIComponent(String(m)),k=this.V(m);for(m=0;m<k.length;m++){var w=P;k[m]!==""&&(w+="="+encodeURIComponent(String(k[m]))),o.push(w)}}return this.i=o.join("&")};function Be(o,l){return l=String(l),o.j&&(l=l.toLowerCase()),l}function ph(o,l){l&&!o.j&&(Zt(o),o.i=null,o.g.forEach(function(h,m){var w=m.toLowerCase();m!=w&&(ia(this,m),oa(this,w,h))},o)),o.j=l}function _h(o,l){const h=new Pn;if(u.Image){const m=new Image;m.onload=V(te,h,"TestLoadImage: loaded",!0,l,m),m.onerror=V(te,h,"TestLoadImage: error",!1,l,m),m.onabort=V(te,h,"TestLoadImage: abort",!1,l,m),m.ontimeout=V(te,h,"TestLoadImage: timeout",!1,l,m),u.setTimeout(function(){m.ontimeout&&m.ontimeout()},1e4),m.src=o}else l(!1)}function yh(o,l){const h=new Pn,m=new AbortController,w=setTimeout(()=>{m.abort(),te(h,"TestPingServer: timeout",!1,l)},1e4);fetch(o,{signal:m.signal}).then(P=>{clearTimeout(w),P.ok?te(h,"TestPingServer: ok",!0,l):te(h,"TestPingServer: server error",!1,l)}).catch(()=>{clearTimeout(w),te(h,"TestPingServer: error",!1,l)})}function te(o,l,h,m,w){try{w&&(w.onload=null,w.onerror=null,w.onabort=null,w.ontimeout=null),m(h)}catch{}}function Ih(){this.g=new eh}function Th(o,l,h){const m=h||"";try{ta(o,function(w,P){let k=w;d(w)&&(k=Li(w)),l.push(m+P+"="+encodeURIComponent(k))})}catch(w){throw l.push(m+"type="+encodeURIComponent("_badmap")),w}}function Vr(o){this.l=o.Ub||null,this.j=o.eb||!1}x(Vr,Bi),Vr.prototype.g=function(){return new Pr(this.l,this.j)},Vr.prototype.i=function(o){return function(){return o}}({});function Pr(o,l){_t.call(this),this.D=o,this.o=l,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.u=new Headers,this.h=null,this.B="GET",this.A="",this.g=!1,this.v=this.j=this.l=null}x(Pr,_t),r=Pr.prototype,r.open=function(o,l){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.B=o,this.A=l,this.readyState=1,Nn(this)},r.send=function(o){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");this.g=!0;const l={headers:this.u,method:this.B,credentials:this.m,cache:void 0};o&&(l.body=o),(this.D||u).fetch(new Request(this.A,l)).then(this.Sa.bind(this),this.ga.bind(this))},r.abort=function(){this.response=this.responseText="",this.u=new Headers,this.status=0,this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),1<=this.readyState&&this.g&&this.readyState!=4&&(this.g=!1,Dn(this)),this.readyState=0},r.Sa=function(o){if(this.g&&(this.l=o,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=o.headers,this.readyState=2,Nn(this)),this.g&&(this.readyState=3,Nn(this),this.g)))if(this.responseType==="arraybuffer")o.arrayBuffer().then(this.Qa.bind(this),this.ga.bind(this));else if(typeof u.ReadableStream<"u"&&"body"in o){if(this.j=o.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.v=new TextDecoder;aa(this)}else o.text().then(this.Ra.bind(this),this.ga.bind(this))};function aa(o){o.j.read().then(o.Pa.bind(o)).catch(o.ga.bind(o))}r.Pa=function(o){if(this.g){if(this.o&&o.value)this.response.push(o.value);else if(!this.o){var l=o.value?o.value:new Uint8Array(0);(l=this.v.decode(l,{stream:!o.done}))&&(this.response=this.responseText+=l)}o.done?Dn(this):Nn(this),this.readyState==3&&aa(this)}},r.Ra=function(o){this.g&&(this.response=this.responseText=o,Dn(this))},r.Qa=function(o){this.g&&(this.response=o,Dn(this))},r.ga=function(){this.g&&Dn(this)};function Dn(o){o.readyState=4,o.l=null,o.j=null,o.v=null,Nn(o)}r.setRequestHeader=function(o,l){this.u.append(o,l)},r.getResponseHeader=function(o){return this.h&&this.h.get(o.toLowerCase())||""},r.getAllResponseHeaders=function(){if(!this.h)return"";const o=[],l=this.h.entries();for(var h=l.next();!h.done;)h=h.value,o.push(h[0]+": "+h[1]),h=l.next();return o.join(`\r
`)};function Nn(o){o.onreadystatechange&&o.onreadystatechange.call(o)}Object.defineProperty(Pr.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(o){this.m=o?"include":"same-origin"}});function ua(o){let l="";return $(o,function(h,m){l+=m,l+=":",l+=h,l+=`\r
`}),l}function Hi(o,l,h){t:{for(m in h){var m=!1;break t}m=!0}m||(h=ua(h),typeof o=="string"?h!=null&&encodeURIComponent(String(h)):nt(o,l,h))}function ot(o){_t.call(this),this.headers=new Map,this.o=o||null,this.h=!1,this.v=this.g=null,this.D="",this.m=0,this.l="",this.j=this.B=this.u=this.A=!1,this.I=null,this.H="",this.J=!1}x(ot,_t);var Eh=/^https?$/i,vh=["POST","PUT"];r=ot.prototype,r.Ha=function(o){this.J=o},r.ea=function(o,l,h,m){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+o);l=l?l.toUpperCase():"GET",this.D=o,this.l="",this.m=0,this.A=!1,this.h=!0,this.g=this.o?this.o.g():Gi.g(),this.v=this.o?Fo(this.o):Fo(Gi),this.g.onreadystatechange=I(this.Ea,this);try{this.B=!0,this.g.open(l,String(o),!0),this.B=!1}catch(P){la(this,P);return}if(o=h||"",h=new Map(this.headers),m)if(Object.getPrototypeOf(m)===Object.prototype)for(var w in m)h.set(w,m[w]);else if(typeof m.keys=="function"&&typeof m.get=="function")for(const P of m.keys())h.set(P,m.get(P));else throw Error("Unknown input type for opt_headers: "+String(m));m=Array.from(h.keys()).find(P=>P.toLowerCase()=="content-type"),w=u.FormData&&o instanceof u.FormData,!(0<=Array.prototype.indexOf.call(vh,l,void 0))||m||w||h.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[P,k]of h)this.g.setRequestHeader(P,k);this.H&&(this.g.responseType=this.H),"withCredentials"in this.g&&this.g.withCredentials!==this.J&&(this.g.withCredentials=this.J);try{da(this),this.u=!0,this.g.send(o),this.u=!1}catch(P){la(this,P)}};function la(o,l){o.h=!1,o.g&&(o.j=!0,o.g.abort(),o.j=!1),o.l=l,o.m=5,ca(o),Sr(o)}function ca(o){o.A||(o.A=!0,At(o,"complete"),At(o,"error"))}r.abort=function(o){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.m=o||7,At(this,"complete"),At(this,"abort"),Sr(this))},r.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Sr(this,!0)),ot.aa.N.call(this)},r.Ea=function(){this.s||(this.B||this.u||this.j?ha(this):this.bb())},r.bb=function(){ha(this)};function ha(o){if(o.h&&typeof a<"u"&&(!o.v[1]||zt(o)!=4||o.Z()!=2)){if(o.u&&zt(o)==4)No(o.Ea,0,o);else if(At(o,"readystatechange"),zt(o)==4){o.h=!1;try{const k=o.Z();t:switch(k){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var l=!0;break t;default:l=!1}var h;if(!(h=l)){var m;if(m=k===0){var w=String(o.D).match(ea)[1]||null;!w&&u.self&&u.self.location&&(w=u.self.location.protocol.slice(0,-1)),m=!Eh.test(w?w.toLowerCase():"")}h=m}if(h)At(o,"complete"),At(o,"success");else{o.m=6;try{var P=2<zt(o)?o.g.statusText:""}catch{P=""}o.l=P+" ["+o.Z()+"]",ca(o)}}finally{Sr(o)}}}}function Sr(o,l){if(o.g){da(o);const h=o.g,m=o.v[0]?()=>{}:null;o.g=null,o.v=null,l||At(o,"ready");try{h.onreadystatechange=m}catch{}}}function da(o){o.I&&(u.clearTimeout(o.I),o.I=null)}r.isActive=function(){return!!this.g};function zt(o){return o.g?o.g.readyState:0}r.Z=function(){try{return 2<zt(this)?this.g.status:-1}catch{return-1}},r.oa=function(){try{return this.g?this.g.responseText:""}catch{return""}},r.Oa=function(o){if(this.g){var l=this.g.responseText;return o&&l.indexOf(o)==0&&(l=l.substring(o.length)),th(l)}};function fa(o){try{if(!o.g)return null;if("response"in o.g)return o.g.response;switch(o.H){case"":case"text":return o.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in o.g)return o.g.mozResponseArrayBuffer}return null}catch{return null}}function wh(o){const l={};o=(o.g&&2<=zt(o)&&o.g.getAllResponseHeaders()||"").split(`\r
`);for(let m=0;m<o.length;m++){if(G(o[m]))continue;var h=v(o[m]);const w=h[0];if(h=h[1],typeof h!="string")continue;h=h.trim();const P=l[w]||[];l[w]=P,P.push(h)}T(l,function(m){return m.join(", ")})}r.Ba=function(){return this.m},r.Ka=function(){return typeof this.l=="string"?this.l:String(this.l)};function kn(o,l,h){return h&&h.internalChannelParams&&h.internalChannelParams[o]||l}function ma(o){this.Aa=0,this.i=[],this.j=new Pn,this.ia=this.qa=this.I=this.W=this.g=this.ya=this.D=this.H=this.m=this.S=this.o=null,this.Ya=this.U=0,this.Va=kn("failFast",!1,o),this.F=this.C=this.u=this.s=this.l=null,this.X=!0,this.za=this.T=-1,this.Y=this.v=this.B=0,this.Ta=kn("baseRetryDelayMs",5e3,o),this.cb=kn("retryDelaySeedMs",1e4,o),this.Wa=kn("forwardChannelMaxRetries",2,o),this.wa=kn("forwardChannelRequestTimeoutMs",2e4,o),this.pa=o&&o.xmlHttpFactory||void 0,this.Xa=o&&o.Tb||void 0,this.Ca=o&&o.useFetchStreams||!1,this.L=void 0,this.J=o&&o.supportsCrossDomainXhr||!1,this.K="",this.h=new Ho(o&&o.concurrentRequestLimit),this.Da=new Ih,this.P=o&&o.fastHandshake||!1,this.O=o&&o.encodeInitMessageHeaders||!1,this.P&&this.O&&(this.O=!1),this.Ua=o&&o.Rb||!1,o&&o.xa&&this.j.xa(),o&&o.forceLongPolling&&(this.X=!1),this.ba=!this.P&&this.X&&o&&o.detectBufferingProxy||!1,this.ja=void 0,o&&o.longPollingTimeout&&0<o.longPollingTimeout&&(this.ja=o.longPollingTimeout),this.ca=void 0,this.R=0,this.M=!1,this.ka=this.A=null}r=ma.prototype,r.la=8,r.G=1,r.connect=function(o,l,h,m){Rt(0),this.W=o,this.H=l||{},h&&m!==void 0&&(this.H.OSID=h,this.H.OAID=m),this.F=this.X,this.I=wa(this,null,this.W),Cr(this)};function Ji(o){if(ga(o),o.G==3){var l=o.U++,h=Kt(o.I);if(nt(h,"SID",o.K),nt(h,"RID",l),nt(h,"TYPE","terminate"),Mn(o,h),l=new Xt(o,o.j,l),l.L=2,l.v=Rr(Kt(h)),h=!1,u.navigator&&u.navigator.sendBeacon)try{h=u.navigator.sendBeacon(l.v.toString(),"")}catch{}!h&&u.Image&&(new Image().src=l.v,h=!0),h||(l.g=Aa(l.j,null),l.g.ea(l.v)),l.F=Date.now(),vr(l)}va(o)}function br(o){o.g&&(Xi(o),o.g.cancel(),o.g=null)}function ga(o){br(o),o.u&&(u.clearTimeout(o.u),o.u=null),xr(o),o.h.cancel(),o.s&&(typeof o.s=="number"&&u.clearTimeout(o.s),o.s=null)}function Cr(o){if(!Jo(o.h)&&!o.s){o.s=!0;var l=o.Ga;Tn||So(),En||(Tn(),En=!0),Ci.add(l,o),o.B=0}}function Ah(o,l){return Yo(o.h)>=o.h.j-(o.s?1:0)?!1:o.s?(o.i=l.D.concat(o.i),!0):o.G==1||o.G==2||o.B>=(o.Va?0:o.Wa)?!1:(o.s=Vn(I(o.Ga,o,l),Ea(o,o.B)),o.B++,!0)}r.Ga=function(o){if(this.s)if(this.s=null,this.G==1){if(!o){this.U=Math.floor(1e5*Math.random()),o=this.U++;const w=new Xt(this,this.j,o);let P=this.o;if(this.S&&(P?(P=p(P),E(P,this.S)):P=this.S),this.m!==null||this.O||(w.H=P,P=null),this.P)t:{for(var l=0,h=0;h<this.i.length;h++){e:{var m=this.i[h];if("__data__"in m.map&&(m=m.map.__data__,typeof m=="string")){m=m.length;break e}m=void 0}if(m===void 0)break;if(l+=m,4096<l){l=h;break t}if(l===4096||h===this.i.length-1){l=h+1;break t}}l=1e3}else l=1e3;l=_a(this,w,l),h=Kt(this.I),nt(h,"RID",o),nt(h,"CVER",22),this.D&&nt(h,"X-HTTP-Session-Id",this.D),Mn(this,h),P&&(this.O?l="headers="+encodeURIComponent(String(ua(P)))+"&"+l:this.m&&Hi(h,this.m,P)),Wi(this.h,w),this.Ua&&nt(h,"TYPE","init"),this.P?(nt(h,"$req",l),nt(h,"SID","null"),w.T=!0,Ki(w,h,null)):Ki(w,h,l),this.G=2}}else this.G==3&&(o?pa(this,o):this.i.length==0||Jo(this.h)||pa(this))};function pa(o,l){var h;l?h=l.l:h=o.U++;const m=Kt(o.I);nt(m,"SID",o.K),nt(m,"RID",h),nt(m,"AID",o.T),Mn(o,m),o.m&&o.o&&Hi(m,o.m,o.o),h=new Xt(o,o.j,h,o.B+1),o.m===null&&(h.H=o.o),l&&(o.i=l.D.concat(o.i)),l=_a(o,h,1e3),h.I=Math.round(.5*o.wa)+Math.round(.5*o.wa*Math.random()),Wi(o.h,h),Ki(h,m,l)}function Mn(o,l){o.H&&$(o.H,function(h,m){nt(l,m,h)}),o.l&&ta({},function(h,m){nt(l,m,h)})}function _a(o,l,h){h=Math.min(o.i.length,h);var m=o.l?I(o.l.Na,o.l,o):null;t:{var w=o.i;let P=-1;for(;;){const k=["count="+h];P==-1?0<h?(P=w[0].g,k.push("ofs="+P)):P=0:k.push("ofs="+P);let Z=!0;for(let ft=0;ft<h;ft++){let W=w[ft].g;const yt=w[ft].map;if(W-=P,0>W)P=Math.max(0,w[ft].g-100),Z=!1;else try{Th(yt,k,"req"+W+"_")}catch{m&&m(yt)}}if(Z){m=k.join("&");break t}}}return o=o.i.splice(0,h),l.D=o,m}function ya(o){if(!o.g&&!o.u){o.Y=1;var l=o.Fa;Tn||So(),En||(Tn(),En=!0),Ci.add(l,o),o.v=0}}function Yi(o){return o.g||o.u||3<=o.v?!1:(o.Y++,o.u=Vn(I(o.Fa,o),Ea(o,o.v)),o.v++,!0)}r.Fa=function(){if(this.u=null,Ia(this),this.ba&&!(this.M||this.g==null||0>=this.R)){var o=2*this.R;this.j.info("BP detection timer enabled: "+o),this.A=Vn(I(this.ab,this),o)}},r.ab=function(){this.A&&(this.A=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.M=!0,Rt(10),br(this),Ia(this))};function Xi(o){o.A!=null&&(u.clearTimeout(o.A),o.A=null)}function Ia(o){o.g=new Xt(o,o.j,"rpc",o.Y),o.m===null&&(o.g.H=o.o),o.g.O=0;var l=Kt(o.qa);nt(l,"RID","rpc"),nt(l,"SID",o.K),nt(l,"AID",o.T),nt(l,"CI",o.F?"0":"1"),!o.F&&o.ja&&nt(l,"TO",o.ja),nt(l,"TYPE","xmlhttp"),Mn(o,l),o.m&&o.o&&Hi(l,o.m,o.o),o.L&&(o.g.I=o.L);var h=o.g;o=o.ia,h.L=1,h.v=Rr(Kt(l)),h.m=null,h.P=!0,Qo(h,o)}r.Za=function(){this.C!=null&&(this.C=null,br(this),Yi(this),Rt(19))};function xr(o){o.C!=null&&(u.clearTimeout(o.C),o.C=null)}function Ta(o,l){var h=null;if(o.g==l){xr(o),Xi(o),o.g=null;var m=2}else if($i(o.h,l))h=l.D,Xo(o.h,l),m=1;else return;if(o.G!=0){if(l.o)if(m==1){h=l.m?l.m.length:0,l=Date.now()-l.F;var w=o.B;m=Ir(),At(m,new Go(m,h)),Cr(o)}else ya(o);else if(w=l.s,w==3||w==0&&0<l.X||!(m==1&&Ah(o,l)||m==2&&Yi(o)))switch(h&&0<h.length&&(l=o.h,l.i=l.i.concat(h)),w){case 1:Ie(o,5);break;case 4:Ie(o,10);break;case 3:Ie(o,6);break;default:Ie(o,2)}}}function Ea(o,l){let h=o.Ta+Math.floor(Math.random()*o.cb);return o.isActive()||(h*=2),h*l}function Ie(o,l){if(o.j.info("Error code "+l),l==2){var h=I(o.fb,o),m=o.Xa;const w=!m;m=new ye(m||"//www.google.com/images/cleardot.gif"),u.location&&u.location.protocol=="http"||wr(m,"https"),Rr(m),w?_h(m.toString(),h):yh(m.toString(),h)}else Rt(2);o.G=0,o.l&&o.l.sa(l),va(o),ga(o)}r.fb=function(o){o?(this.j.info("Successfully pinged google.com"),Rt(2)):(this.j.info("Failed to ping google.com"),Rt(1))};function va(o){if(o.G=0,o.ka=[],o.l){const l=Zo(o.h);(l.length!=0||o.i.length!=0)&&(D(o.ka,l),D(o.ka,o.i),o.h.i.length=0,N(o.i),o.i.length=0),o.l.ra()}}function wa(o,l,h){var m=h instanceof ye?Kt(h):new ye(h);if(m.g!="")l&&(m.g=l+"."+m.g),Ar(m,m.s);else{var w=u.location;m=w.protocol,l=l?l+"."+w.hostname:w.hostname,w=+w.port;var P=new ye(null);m&&wr(P,m),l&&(P.g=l),w&&Ar(P,w),h&&(P.l=h),m=P}return h=o.D,l=o.ya,h&&l&&nt(m,h,l),nt(m,"VER",o.la),Mn(o,m),m}function Aa(o,l,h){if(l&&!o.J)throw Error("Can't create secondary domain capable XhrIo object.");return l=o.Ca&&!o.pa?new ot(new Vr({eb:h})):new ot(o.pa),l.Ha(o.J),l}r.isActive=function(){return!!this.l&&this.l.isActive(this)};function Ra(){}r=Ra.prototype,r.ua=function(){},r.ta=function(){},r.sa=function(){},r.ra=function(){},r.isActive=function(){return!0},r.Na=function(){};function Dr(){}Dr.prototype.g=function(o,l){return new xt(o,l)};function xt(o,l){_t.call(this),this.g=new ma(l),this.l=o,this.h=l&&l.messageUrlParams||null,o=l&&l.messageHeaders||null,l&&l.clientProtocolHeaderRequired&&(o?o["X-Client-Protocol"]="webchannel":o={"X-Client-Protocol":"webchannel"}),this.g.o=o,o=l&&l.initMessageHeaders||null,l&&l.messageContentType&&(o?o["X-WebChannel-Content-Type"]=l.messageContentType:o={"X-WebChannel-Content-Type":l.messageContentType}),l&&l.va&&(o?o["X-WebChannel-Client-Profile"]=l.va:o={"X-WebChannel-Client-Profile":l.va}),this.g.S=o,(o=l&&l.Sb)&&!G(o)&&(this.g.m=o),this.v=l&&l.supportsCrossDomainXhr||!1,this.u=l&&l.sendRawJson||!1,(l=l&&l.httpSessionIdParam)&&!G(l)&&(this.g.D=l,o=this.h,o!==null&&l in o&&(o=this.h,l in o&&delete o[l])),this.j=new Ue(this)}x(xt,_t),xt.prototype.m=function(){this.g.l=this.j,this.v&&(this.g.J=!0),this.g.connect(this.l,this.h||void 0)},xt.prototype.close=function(){Ji(this.g)},xt.prototype.o=function(o){var l=this.g;if(typeof o=="string"){var h={};h.__data__=o,o=h}else this.u&&(h={},h.__data__=Li(o),o=h);l.i.push(new ah(l.Ya++,o)),l.G==3&&Cr(l)},xt.prototype.N=function(){this.g.l=null,delete this.j,Ji(this.g),delete this.g,xt.aa.N.call(this)};function Va(o){Ui.call(this),o.__headers__&&(this.headers=o.__headers__,this.statusCode=o.__status__,delete o.__headers__,delete o.__status__);var l=o.__sm__;if(l){t:{for(const h in l){o=h;break t}o=void 0}(this.i=o)&&(o=this.i,l=l!==null&&o in l?l[o]:void 0),this.data=l}else this.data=o}x(Va,Ui);function Pa(){qi.call(this),this.status=1}x(Pa,qi);function Ue(o){this.g=o}x(Ue,Ra),Ue.prototype.ua=function(){At(this.g,"a")},Ue.prototype.ta=function(o){At(this.g,new Va(o))},Ue.prototype.sa=function(o){At(this.g,new Pa)},Ue.prototype.ra=function(){At(this.g,"b")},Dr.prototype.createWebChannel=Dr.prototype.g,xt.prototype.send=xt.prototype.o,xt.prototype.open=xt.prototype.m,xt.prototype.close=xt.prototype.close,zu=function(){return new Dr},Ku=function(){return Ir()},ju=pe,as={mb:0,pb:1,qb:2,Jb:3,Ob:4,Lb:5,Mb:6,Kb:7,Ib:8,Nb:9,PROXY:10,NOPROXY:11,Gb:12,Cb:13,Db:14,Bb:15,Eb:16,Fb:17,ib:18,hb:19,jb:20},Tr.NO_ERROR=0,Tr.TIMEOUT=8,Tr.HTTP_ERROR=6,Ur=Tr,jo.COMPLETE="complete",Gu=jo,Lo.EventType=An,An.OPEN="a",An.CLOSE="b",An.ERROR="c",An.MESSAGE="d",_t.prototype.listen=_t.prototype.K,qn=Lo,ot.prototype.listenOnce=ot.prototype.L,ot.prototype.getLastError=ot.prototype.Ka,ot.prototype.getLastErrorCode=ot.prototype.Ba,ot.prototype.getStatus=ot.prototype.Z,ot.prototype.getResponseJson=ot.prototype.Oa,ot.prototype.getResponseText=ot.prototype.oa,ot.prototype.send=ot.prototype.ea,ot.prototype.setWithCredentials=ot.prototype.Ha,qu=ot}).apply(typeof kr<"u"?kr:typeof self<"u"?self:typeof window<"u"?window:{});const Ca="@firebase/firestore";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Et{constructor(t){this.uid=t}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(t){return t.uid===this.uid}}Et.UNAUTHENTICATED=new Et(null),Et.GOOGLE_CREDENTIALS=new Et("google-credentials-uid"),Et.FIRST_PARTY=new Et("first-party-uid"),Et.MOCK_USER=new Et("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let mn="10.14.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Se=new Rh("@firebase/firestore");function Qe(){return Se.logLevel}function b(r,...t){if(Se.logLevel<=Qt.DEBUG){const e=t.map(Cs);Se.debug(`Firestore (${mn}): ${r}`,...e)}}function ut(r,...t){if(Se.logLevel<=Qt.ERROR){const e=t.map(Cs);Se.error(`Firestore (${mn}): ${r}`,...e)}}function Jn(r,...t){if(Se.logLevel<=Qt.WARN){const e=t.map(Cs);Se.warn(`Firestore (${mn}): ${r}`,...e)}}function Cs(r){if(typeof r=="string")return r;try{/**
* @license
* Copyright 2020 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/return function(e){return JSON.stringify(e)}(r)}catch{return r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function O(r="Unexpected state"){const t=`FIRESTORE (${mn}) INTERNAL ASSERTION FAILED: `+r;throw ut(t),new Error(t)}function L(r,t){r||O()}function F(r,t){return r}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const S={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class C extends Sh{constructor(t,e){super(t,e),this.code=t,this.message=e,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lt{constructor(){this.promise=new Promise((t,e)=>{this.resolve=t,this.reject=e})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nh{constructor(t,e){this.user=e,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${t}`)}}class kh{getToken(){return Promise.resolve(null)}invalidateToken(){}start(t,e){t.enqueueRetryable(()=>e(Et.UNAUTHENTICATED))}shutdown(){}}class Mh{constructor(t){this.t=t,this.currentUser=Et.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(t,e){L(this.o===void 0);let n=this.i;const i=c=>this.i!==n?(n=this.i,e(c)):Promise.resolve();let s=new Lt;this.o=()=>{this.i++,this.currentUser=this.u(),s.resolve(),s=new Lt,t.enqueueRetryable(()=>i(this.currentUser))};const a=()=>{const c=s;t.enqueueRetryable(async()=>{await c.promise,await i(this.currentUser)})},u=c=>{b("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=c,this.o&&(this.auth.addAuthTokenListener(this.o),a())};this.t.onInit(c=>u(c)),setTimeout(()=>{if(!this.auth){const c=this.t.getImmediate({optional:!0});c?u(c):(b("FirebaseAuthCredentialsProvider","Auth not yet detected"),s.resolve(),s=new Lt)}},0),a()}getToken(){const t=this.i,e=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(e).then(n=>this.i!==t?(b("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):n?(L(typeof n.accessToken=="string"),new Nh(n.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const t=this.auth&&this.auth.getUid();return L(t===null||typeof t=="string"),new Et(t)}}class Oh{constructor(t,e,n){this.l=t,this.h=e,this.P=n,this.type="FirstParty",this.user=Et.FIRST_PARTY,this.I=new Map}T(){return this.P?this.P():null}get headers(){this.I.set("X-Goog-AuthUser",this.l);const t=this.T();return t&&this.I.set("Authorization",t),this.h&&this.I.set("X-Goog-Iam-Authorization-Token",this.h),this.I}}class Fh{constructor(t,e,n){this.l=t,this.h=e,this.P=n}getToken(){return Promise.resolve(new Oh(this.l,this.h,this.P))}start(t,e){t.enqueueRetryable(()=>e(Et.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class Lh{constructor(t){this.value=t,this.type="AppCheck",this.headers=new Map,t&&t.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class Bh{constructor(t){this.A=t,this.forceRefresh=!1,this.appCheck=null,this.R=null}start(t,e){L(this.o===void 0);const n=s=>{s.error!=null&&b("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${s.error.message}`);const a=s.token!==this.R;return this.R=s.token,b("FirebaseAppCheckTokenProvider",`Received ${a?"new":"existing"} token.`),a?e(s.token):Promise.resolve()};this.o=s=>{t.enqueueRetryable(()=>n(s))};const i=s=>{b("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=s,this.o&&this.appCheck.addTokenListener(this.o)};this.A.onInit(s=>i(s)),setTimeout(()=>{if(!this.appCheck){const s=this.A.getImmediate({optional:!0});s?i(s):b("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){const t=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(t).then(e=>e?(L(typeof e.token=="string"),this.R=e.token,new Lh(e.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Uh(r){const t=typeof self<"u"&&(self.crypto||self.msCrypto),e=new Uint8Array(r);if(t&&typeof t.getRandomValues=="function")t.getRandomValues(e);else for(let n=0;n<r;n++)e[n]=Math.floor(256*Math.random());return e}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qu{static newId(){const t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",e=Math.floor(256/t.length)*t.length;let n="";for(;n.length<20;){const i=Uh(40);for(let s=0;s<i.length;++s)n.length<20&&i[s]<e&&(n+=t.charAt(i[s]%t.length))}return n}}function q(r,t){return r<t?-1:r>t?1:0}function tn(r,t,e){return r.length===t.length&&r.every((n,i)=>e(n,t[i]))}function $u(r){return r+"\0"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class st{constructor(t,e){if(this.seconds=t,this.nanoseconds=e,e<0)throw new C(S.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+e);if(e>=1e9)throw new C(S.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+e);if(t<-62135596800)throw new C(S.INVALID_ARGUMENT,"Timestamp seconds out of range: "+t);if(t>=253402300800)throw new C(S.INVALID_ARGUMENT,"Timestamp seconds out of range: "+t)}static now(){return st.fromMillis(Date.now())}static fromDate(t){return st.fromMillis(t.getTime())}static fromMillis(t){const e=Math.floor(t/1e3),n=Math.floor(1e6*(t-1e3*e));return new st(e,n)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/1e6}_compareTo(t){return this.seconds===t.seconds?q(this.nanoseconds,t.nanoseconds):q(this.seconds,t.seconds)}isEqual(t){return t.seconds===this.seconds&&t.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{seconds:this.seconds,nanoseconds:this.nanoseconds}}valueOf(){const t=this.seconds- -62135596800;return String(t).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class B{constructor(t){this.timestamp=t}static fromTimestamp(t){return new B(t)}static min(){return new B(new st(0,0))}static max(){return new B(new st(253402300799,999999999))}compareTo(t){return this.timestamp._compareTo(t.timestamp)}isEqual(t){return this.timestamp.isEqual(t.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yn{constructor(t,e,n){e===void 0?e=0:e>t.length&&O(),n===void 0?n=t.length-e:n>t.length-e&&O(),this.segments=t,this.offset=e,this.len=n}get length(){return this.len}isEqual(t){return Yn.comparator(this,t)===0}child(t){const e=this.segments.slice(this.offset,this.limit());return t instanceof Yn?t.forEach(n=>{e.push(n)}):e.push(t),this.construct(e)}limit(){return this.offset+this.length}popFirst(t){return t=t===void 0?1:t,this.construct(this.segments,this.offset+t,this.length-t)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(t){return this.segments[this.offset+t]}isEmpty(){return this.length===0}isPrefixOf(t){if(t.length<this.length)return!1;for(let e=0;e<this.length;e++)if(this.get(e)!==t.get(e))return!1;return!0}isImmediateParentOf(t){if(this.length+1!==t.length)return!1;for(let e=0;e<this.length;e++)if(this.get(e)!==t.get(e))return!1;return!0}forEach(t){for(let e=this.offset,n=this.limit();e<n;e++)t(this.segments[e])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(t,e){const n=Math.min(t.length,e.length);for(let i=0;i<n;i++){const s=t.get(i),a=e.get(i);if(s<a)return-1;if(s>a)return 1}return t.length<e.length?-1:t.length>e.length?1:0}}class J extends Yn{construct(t,e,n){return new J(t,e,n)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...t){const e=[];for(const n of t){if(n.indexOf("//")>=0)throw new C(S.INVALID_ARGUMENT,`Invalid segment (${n}). Paths must not contain // in them.`);e.push(...n.split("/").filter(i=>i.length>0))}return new J(e)}static emptyPath(){return new J([])}}const qh=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class it extends Yn{construct(t,e,n){return new it(t,e,n)}static isValidIdentifier(t){return qh.test(t)}canonicalString(){return this.toArray().map(t=>(t=t.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),it.isValidIdentifier(t)||(t="`"+t+"`"),t)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)==="__name__"}static keyField(){return new it(["__name__"])}static fromServerFormat(t){const e=[];let n="",i=0;const s=()=>{if(n.length===0)throw new C(S.INVALID_ARGUMENT,`Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);e.push(n),n=""};let a=!1;for(;i<t.length;){const u=t[i];if(u==="\\"){if(i+1===t.length)throw new C(S.INVALID_ARGUMENT,"Path has trailing escape character: "+t);const c=t[i+1];if(c!=="\\"&&c!=="."&&c!=="`")throw new C(S.INVALID_ARGUMENT,"Path has invalid escape sequence: "+t);n+=c,i+=2}else u==="`"?(a=!a,i++):u!=="."||a?(n+=u,i++):(s(),i++)}if(s(),a)throw new C(S.INVALID_ARGUMENT,"Unterminated ` in path: "+t);return new it(e)}static emptyPath(){return new it([])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class M{constructor(t){this.path=t}static fromPath(t){return new M(J.fromString(t))}static fromName(t){return new M(J.fromString(t).popFirst(5))}static empty(){return new M(J.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(t){return this.path.length>=2&&this.path.get(this.path.length-2)===t}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(t){return t!==null&&J.comparator(this.path,t.path)===0}toString(){return this.path.toString()}static comparator(t,e){return J.comparator(t.path,e.path)}static isDocumentKey(t){return t.length%2==0}static fromSegments(t){return new M(new J(t.slice()))}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jr{constructor(t,e,n,i){this.indexId=t,this.collectionGroup=e,this.fields=n,this.indexState=i}}function us(r){return r.fields.find(t=>t.kind===2)}function Ee(r){return r.fields.filter(t=>t.kind!==2)}Jr.UNKNOWN_ID=-1;class qr{constructor(t,e){this.fieldPath=t,this.kind=e}}class Xn{constructor(t,e){this.sequenceNumber=t,this.offset=e}static empty(){return new Xn(0,Mt.min())}}function Wu(r,t){const e=r.toTimestamp().seconds,n=r.toTimestamp().nanoseconds+1,i=B.fromTimestamp(n===1e9?new st(e+1,0):new st(e,n));return new Mt(i,M.empty(),t)}function Hu(r){return new Mt(r.readTime,r.key,-1)}class Mt{constructor(t,e,n){this.readTime=t,this.documentKey=e,this.largestBatchId=n}static min(){return new Mt(B.min(),M.empty(),-1)}static max(){return new Mt(B.max(),M.empty(),-1)}}function xs(r,t){let e=r.readTime.compareTo(t.readTime);return e!==0?e:(e=M.comparator(r.documentKey,t.documentKey),e!==0?e:q(r.largestBatchId,t.largestBatchId))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ju="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class Yu{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(t){this.onCommittedListeners.push(t)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(t=>t())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function he(r){if(r.code!==S.FAILED_PRECONDITION||r.message!==Ju)throw r;b("LocalStore","Unexpectedly lost primary lease")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class A{constructor(t){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,t(e=>{this.isDone=!0,this.result=e,this.nextCallback&&this.nextCallback(e)},e=>{this.isDone=!0,this.error=e,this.catchCallback&&this.catchCallback(e)})}catch(t){return this.next(void 0,t)}next(t,e){return this.callbackAttached&&O(),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(e,this.error):this.wrapSuccess(t,this.result):new A((n,i)=>{this.nextCallback=s=>{this.wrapSuccess(t,s).next(n,i)},this.catchCallback=s=>{this.wrapFailure(e,s).next(n,i)}})}toPromise(){return new Promise((t,e)=>{this.next(t,e)})}wrapUserFunction(t){try{const e=t();return e instanceof A?e:A.resolve(e)}catch(e){return A.reject(e)}}wrapSuccess(t,e){return t?this.wrapUserFunction(()=>t(e)):A.resolve(e)}wrapFailure(t,e){return t?this.wrapUserFunction(()=>t(e)):A.reject(e)}static resolve(t){return new A((e,n)=>{e(t)})}static reject(t){return new A((e,n)=>{n(t)})}static waitFor(t){return new A((e,n)=>{let i=0,s=0,a=!1;t.forEach(u=>{++i,u.next(()=>{++s,a&&s===i&&e()},c=>n(c))}),a=!0,s===i&&e()})}static or(t){let e=A.resolve(!1);for(const n of t)e=e.next(i=>i?A.resolve(i):n());return e}static forEach(t,e){const n=[];return t.forEach((i,s)=>{n.push(e.call(this,i,s))}),this.waitFor(n)}static mapArray(t,e){return new A((n,i)=>{const s=t.length,a=new Array(s);let u=0;for(let c=0;c<s;c++){const d=c;e(t[d]).next(f=>{a[d]=f,++u,u===s&&n(a)},f=>i(f))}})}static doWhile(t,e){return new A((n,i)=>{const s=()=>{t()===!0?e().next(()=>{s()},i):n()};s()})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ci{constructor(t,e){this.action=t,this.transaction=e,this.aborted=!1,this.V=new Lt,this.transaction.oncomplete=()=>{this.V.resolve()},this.transaction.onabort=()=>{e.error?this.V.reject(new zn(t,e.error)):this.V.resolve()},this.transaction.onerror=n=>{const i=Ds(n.target.error);this.V.reject(new zn(t,i))}}static open(t,e,n,i){try{return new ci(e,t.transaction(i,n))}catch(s){throw new zn(e,s)}}get m(){return this.V.promise}abort(t){t&&this.V.reject(t),this.aborted||(b("SimpleDb","Aborting transaction:",t?t.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}g(){const t=this.transaction;this.aborted||typeof t.commit!="function"||t.commit()}store(t){const e=this.transaction.objectStore(t);return new jh(e)}}class se{constructor(t,e,n){this.name=t,this.version=e,this.p=n,se.S(Hr())===12.2&&ut("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}static delete(t){return b("SimpleDb","Removing database:",t),ve(window.indexedDB.deleteDatabase(t)).toPromise()}static D(){if(!xh())return!1;if(se.v())return!0;const t=Hr(),e=se.S(t),n=0<e&&e<10,i=Xu(t),s=0<i&&i<4.5;return!(t.indexOf("MSIE ")>0||t.indexOf("Trident/")>0||t.indexOf("Edge/")>0||n||s)}static v(){var t;return typeof process<"u"&&((t=process.__PRIVATE_env)===null||t===void 0?void 0:t.C)==="YES"}static F(t,e){return t.store(e)}static S(t){const e=t.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=e?e[1].split("_").slice(0,2).join("."):"-1";return Number(n)}async M(t){return this.db||(b("SimpleDb","Opening database:",this.name),this.db=await new Promise((e,n)=>{const i=indexedDB.open(this.name,this.version);i.onsuccess=s=>{const a=s.target.result;e(a)},i.onblocked=()=>{n(new zn(t,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},i.onerror=s=>{const a=s.target.error;a.name==="VersionError"?n(new C(S.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):a.name==="InvalidStateError"?n(new C(S.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+a)):n(new zn(t,a))},i.onupgradeneeded=s=>{b("SimpleDb",'Database "'+this.name+'" requires upgrade from version:',s.oldVersion);const a=s.target.result;this.p.O(a,i.transaction,s.oldVersion,this.version).next(()=>{b("SimpleDb","Database upgrade to version "+this.version+" complete")})}})),this.N&&(this.db.onversionchange=e=>this.N(e)),this.db}L(t){this.N=t,this.db&&(this.db.onversionchange=e=>t(e))}async runTransaction(t,e,n,i){const s=e==="readonly";let a=0;for(;;){++a;try{this.db=await this.M(t);const u=ci.open(this.db,t,s?"readonly":"readwrite",n),c=i(u).next(d=>(u.g(),d)).catch(d=>(u.abort(d),A.reject(d))).toPromise();return c.catch(()=>{}),await u.m,c}catch(u){const c=u,d=c.name!=="FirebaseError"&&a<3;if(b("SimpleDb","Transaction failed with error:",c.message,"Retrying:",d),this.close(),!d)return Promise.reject(c)}}}close(){this.db&&this.db.close(),this.db=void 0}}function Xu(r){const t=r.match(/Android ([\d.]+)/i),e=t?t[1].split(".").slice(0,2).join("."):"-1";return Number(e)}class Gh{constructor(t){this.B=t,this.k=!1,this.q=null}get isDone(){return this.k}get K(){return this.q}set cursor(t){this.B=t}done(){this.k=!0}$(t){this.q=t}delete(){return ve(this.B.delete())}}class zn extends C{constructor(t,e){super(S.UNAVAILABLE,`IndexedDB transaction '${t}' failed: ${e}`),this.name="IndexedDbTransactionError"}}function de(r){return r.name==="IndexedDbTransactionError"}class jh{constructor(t){this.store=t}put(t,e){let n;return e!==void 0?(b("SimpleDb","PUT",this.store.name,t,e),n=this.store.put(e,t)):(b("SimpleDb","PUT",this.store.name,"<auto-key>",t),n=this.store.put(t)),ve(n)}add(t){return b("SimpleDb","ADD",this.store.name,t,t),ve(this.store.add(t))}get(t){return ve(this.store.get(t)).next(e=>(e===void 0&&(e=null),b("SimpleDb","GET",this.store.name,t,e),e))}delete(t){return b("SimpleDb","DELETE",this.store.name,t),ve(this.store.delete(t))}count(){return b("SimpleDb","COUNT",this.store.name),ve(this.store.count())}U(t,e){const n=this.options(t,e),i=n.index?this.store.index(n.index):this.store;if(typeof i.getAll=="function"){const s=i.getAll(n.range);return new A((a,u)=>{s.onerror=c=>{u(c.target.error)},s.onsuccess=c=>{a(c.target.result)}})}{const s=this.cursor(n),a=[];return this.W(s,(u,c)=>{a.push(c)}).next(()=>a)}}G(t,e){const n=this.store.getAll(t,e===null?void 0:e);return new A((i,s)=>{n.onerror=a=>{s(a.target.error)},n.onsuccess=a=>{i(a.target.result)}})}j(t,e){b("SimpleDb","DELETE ALL",this.store.name);const n=this.options(t,e);n.H=!1;const i=this.cursor(n);return this.W(i,(s,a,u)=>u.delete())}J(t,e){let n;e?n=t:(n={},e=t);const i=this.cursor(n);return this.W(i,e)}Y(t){const e=this.cursor({});return new A((n,i)=>{e.onerror=s=>{const a=Ds(s.target.error);i(a)},e.onsuccess=s=>{const a=s.target.result;a?t(a.primaryKey,a.value).next(u=>{u?a.continue():n()}):n()}})}W(t,e){const n=[];return new A((i,s)=>{t.onerror=a=>{s(a.target.error)},t.onsuccess=a=>{const u=a.target.result;if(!u)return void i();const c=new Gh(u),d=e(u.primaryKey,u.value,c);if(d instanceof A){const f=d.catch(g=>(c.done(),A.reject(g)));n.push(f)}c.isDone?i():c.K===null?u.continue():u.continue(c.K)}}).next(()=>A.waitFor(n))}options(t,e){let n;return t!==void 0&&(typeof t=="string"?n=t:e=t),{index:n,range:e}}cursor(t){let e="next";if(t.reverse&&(e="prev"),t.index){const n=this.store.index(t.index);return t.H?n.openKeyCursor(t.range,e):n.openCursor(t.range,e)}return this.store.openCursor(t.range,e)}}function ve(r){return new A((t,e)=>{r.onsuccess=n=>{const i=n.target.result;t(i)},r.onerror=n=>{const i=Ds(n.target.error);e(i)}})}let xa=!1;function Ds(r){const t=se.S(Hr());if(t>=12.2&&t<13){const e="An internal error was encountered in the Indexed Database server";if(r.message.indexOf(e)>=0){const n=new C("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${e}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return xa||(xa=!0,setTimeout(()=>{throw n},0)),n}}return r}class Kh{constructor(t,e){this.asyncQueue=t,this.Z=e,this.task=null}start(){this.X(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return this.task!==null}X(t){b("IndexBackfiller",`Scheduled in ${t}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",t,async()=>{this.task=null;try{b("IndexBackfiller",`Documents written: ${await this.Z.ee()}`)}catch(e){de(e)?b("IndexBackfiller","Ignoring IndexedDB error during index backfill: ",e):await he(e)}await this.X(6e4)})}}class zh{constructor(t,e){this.localStore=t,this.persistence=e}async ee(t=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",e=>this.te(e,t))}te(t,e){const n=new Set;let i=e,s=!0;return A.doWhile(()=>s===!0&&i>0,()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(t).next(a=>{if(a!==null&&!n.has(a))return b("IndexBackfiller",`Processing collection: ${a}`),this.ne(t,a,i).next(u=>{i-=u,n.add(a)});s=!1})).next(()=>e-i)}ne(t,e,n){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(t,e).next(i=>this.localStore.localDocuments.getNextDocuments(t,e,i,n).next(s=>{const a=s.changes;return this.localStore.indexManager.updateIndexEntries(t,a).next(()=>this.re(i,s)).next(u=>(b("IndexBackfiller",`Updating offset: ${u}`),this.localStore.indexManager.updateCollectionGroup(t,e,u))).next(()=>a.size)}))}re(t,e){let n=t;return e.changes.forEach((i,s)=>{const a=Hu(s);xs(a,n)>0&&(n=a)}),new Mt(n.readTime,n.documentKey,Math.max(e.batchId,t.largestBatchId))}}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bt{constructor(t,e){this.previousValue=t,e&&(e.sequenceNumberHandler=n=>this.ie(n),this.se=n=>e.writeSequenceNumber(n))}ie(t){return this.previousValue=Math.max(t,this.previousValue),this.previousValue}next(){const t=++this.previousValue;return this.se&&this.se(t),t}}bt.oe=-1;function hi(r){return r==null}function Zn(r){return r===0&&1/r==-1/0}function Zu(r){return typeof r=="number"&&Number.isInteger(r)&&!Zn(r)&&r<=Number.MAX_SAFE_INTEGER&&r>=Number.MIN_SAFE_INTEGER}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Vt(r){let t="";for(let e=0;e<r.length;e++)t.length>0&&(t=Da(t)),t=Qh(r.get(e),t);return Da(t)}function Qh(r,t){let e=t;const n=r.length;for(let i=0;i<n;i++){const s=r.charAt(i);switch(s){case"\0":e+="";break;case"":e+="";break;default:e+=s}}return e}function Da(r){return r+""}function Bt(r){const t=r.length;if(L(t>=2),t===2)return L(r.charAt(0)===""&&r.charAt(1)===""),J.emptyPath();const e=t-2,n=[];let i="";for(let s=0;s<t;){const a=r.indexOf("",s);switch((a<0||a>e)&&O(),r.charAt(a+1)){case"":const u=r.substring(s,a);let c;i.length===0?c=u:(i+=u,c=i,i=""),n.push(c);break;case"":i+=r.substring(s,a),i+="\0";break;case"":i+=r.substring(s,a+1);break;default:O()}s=a+2}return new J(n)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Na=["userId","batchId"];/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Gr(r,t){return[r,Vt(t)]}function tl(r,t,e){return[r,Vt(t),e]}const $h={},Wh=["prefixPath","collectionGroup","readTime","documentId"],Hh=["prefixPath","collectionGroup","documentId"],Jh=["collectionGroup","readTime","prefixPath","documentId"],Yh=["canonicalId","targetId"],Xh=["targetId","path"],Zh=["path","targetId"],td=["collectionId","parent"],ed=["indexId","uid"],nd=["uid","sequenceNumber"],rd=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],id=["indexId","uid","orderedDocumentKey"],sd=["userId","collectionPath","documentId"],od=["userId","collectionPath","largestBatchId"],ad=["userId","collectionGroup","largestBatchId"],el=["mutationQueues","mutations","documentMutations","remoteDocuments","targets","owner","targetGlobal","targetDocuments","clientMetadata","remoteDocumentGlobal","collectionParents","bundles","namedQueries"],ud=[...el,"documentOverlays"],nl=["mutationQueues","mutations","documentMutations","remoteDocumentsV14","targets","owner","targetGlobal","targetDocuments","clientMetadata","remoteDocumentGlobal","collectionParents","bundles","namedQueries","documentOverlays"],rl=nl,Ns=[...rl,"indexConfiguration","indexState","indexEntries"],ld=Ns,cd=[...Ns,"globals"];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ls extends Yu{constructor(t,e){super(),this._e=t,this.currentSequenceNumber=e}}function ht(r,t){const e=F(r);return se.F(e._e,t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ka(r){let t=0;for(const e in r)Object.prototype.hasOwnProperty.call(r,e)&&t++;return t}function Oe(r,t){for(const e in r)Object.prototype.hasOwnProperty.call(r,e)&&t(e,r[e])}function il(r){for(const t in r)if(Object.prototype.hasOwnProperty.call(r,t))return!1;return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class et{constructor(t,e){this.comparator=t,this.root=e||mt.EMPTY}insert(t,e){return new et(this.comparator,this.root.insert(t,e,this.comparator).copy(null,null,mt.BLACK,null,null))}remove(t){return new et(this.comparator,this.root.remove(t,this.comparator).copy(null,null,mt.BLACK,null,null))}get(t){let e=this.root;for(;!e.isEmpty();){const n=this.comparator(t,e.key);if(n===0)return e.value;n<0?e=e.left:n>0&&(e=e.right)}return null}indexOf(t){let e=0,n=this.root;for(;!n.isEmpty();){const i=this.comparator(t,n.key);if(i===0)return e+n.left.size;i<0?n=n.left:(e+=n.left.size+1,n=n.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(t){return this.root.inorderTraversal(t)}forEach(t){this.inorderTraversal((e,n)=>(t(e,n),!1))}toString(){const t=[];return this.inorderTraversal((e,n)=>(t.push(`${e}:${n}`),!1)),`{${t.join(", ")}}`}reverseTraversal(t){return this.root.reverseTraversal(t)}getIterator(){return new Mr(this.root,null,this.comparator,!1)}getIteratorFrom(t){return new Mr(this.root,t,this.comparator,!1)}getReverseIterator(){return new Mr(this.root,null,this.comparator,!0)}getReverseIteratorFrom(t){return new Mr(this.root,t,this.comparator,!0)}}class Mr{constructor(t,e,n,i){this.isReverse=i,this.nodeStack=[];let s=1;for(;!t.isEmpty();)if(s=e?n(t.key,e):1,e&&i&&(s*=-1),s<0)t=this.isReverse?t.left:t.right;else{if(s===0){this.nodeStack.push(t);break}this.nodeStack.push(t),t=this.isReverse?t.right:t.left}}getNext(){let t=this.nodeStack.pop();const e={key:t.key,value:t.value};if(this.isReverse)for(t=t.left;!t.isEmpty();)this.nodeStack.push(t),t=t.right;else for(t=t.right;!t.isEmpty();)this.nodeStack.push(t),t=t.left;return e}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const t=this.nodeStack[this.nodeStack.length-1];return{key:t.key,value:t.value}}}class mt{constructor(t,e,n,i,s){this.key=t,this.value=e,this.color=n??mt.RED,this.left=i??mt.EMPTY,this.right=s??mt.EMPTY,this.size=this.left.size+1+this.right.size}copy(t,e,n,i,s){return new mt(t??this.key,e??this.value,n??this.color,i??this.left,s??this.right)}isEmpty(){return!1}inorderTraversal(t){return this.left.inorderTraversal(t)||t(this.key,this.value)||this.right.inorderTraversal(t)}reverseTraversal(t){return this.right.reverseTraversal(t)||t(this.key,this.value)||this.left.reverseTraversal(t)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(t,e,n){let i=this;const s=n(t,i.key);return i=s<0?i.copy(null,null,null,i.left.insert(t,e,n),null):s===0?i.copy(null,e,null,null,null):i.copy(null,null,null,null,i.right.insert(t,e,n)),i.fixUp()}removeMin(){if(this.left.isEmpty())return mt.EMPTY;let t=this;return t.left.isRed()||t.left.left.isRed()||(t=t.moveRedLeft()),t=t.copy(null,null,null,t.left.removeMin(),null),t.fixUp()}remove(t,e){let n,i=this;if(e(t,i.key)<0)i.left.isEmpty()||i.left.isRed()||i.left.left.isRed()||(i=i.moveRedLeft()),i=i.copy(null,null,null,i.left.remove(t,e),null);else{if(i.left.isRed()&&(i=i.rotateRight()),i.right.isEmpty()||i.right.isRed()||i.right.left.isRed()||(i=i.moveRedRight()),e(t,i.key)===0){if(i.right.isEmpty())return mt.EMPTY;n=i.right.min(),i=i.copy(n.key,n.value,null,null,i.right.removeMin())}i=i.copy(null,null,null,null,i.right.remove(t,e))}return i.fixUp()}isRed(){return this.color}fixUp(){let t=this;return t.right.isRed()&&!t.left.isRed()&&(t=t.rotateLeft()),t.left.isRed()&&t.left.left.isRed()&&(t=t.rotateRight()),t.left.isRed()&&t.right.isRed()&&(t=t.colorFlip()),t}moveRedLeft(){let t=this.colorFlip();return t.right.left.isRed()&&(t=t.copy(null,null,null,null,t.right.rotateRight()),t=t.rotateLeft(),t=t.colorFlip()),t}moveRedRight(){let t=this.colorFlip();return t.left.left.isRed()&&(t=t.rotateRight(),t=t.colorFlip()),t}rotateLeft(){const t=this.copy(null,null,mt.RED,null,this.right.left);return this.right.copy(null,null,this.color,t,null)}rotateRight(){const t=this.copy(null,null,mt.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,t)}colorFlip(){const t=this.left.copy(null,null,!this.left.color,null,null),e=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,t,e)}checkMaxDepth(){const t=this.check();return Math.pow(2,t)<=this.size+1}check(){if(this.isRed()&&this.left.isRed()||this.right.isRed())throw O();const t=this.left.check();if(t!==this.right.check())throw O();return t+(this.isRed()?0:1)}}mt.EMPTY=null,mt.RED=!0,mt.BLACK=!1;mt.EMPTY=new class{constructor(){this.size=0}get key(){throw O()}get value(){throw O()}get color(){throw O()}get left(){throw O()}get right(){throw O()}copy(t,e,n,i,s){return this}insert(t,e,n){return new mt(t,e)}remove(t,e){return this}isEmpty(){return!0}inorderTraversal(t){return!1}reverseTraversal(t){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class X{constructor(t){this.comparator=t,this.data=new et(this.comparator)}has(t){return this.data.get(t)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(t){return this.data.indexOf(t)}forEach(t){this.data.inorderTraversal((e,n)=>(t(e),!1))}forEachInRange(t,e){const n=this.data.getIteratorFrom(t[0]);for(;n.hasNext();){const i=n.getNext();if(this.comparator(i.key,t[1])>=0)return;e(i.key)}}forEachWhile(t,e){let n;for(n=e!==void 0?this.data.getIteratorFrom(e):this.data.getIterator();n.hasNext();)if(!t(n.getNext().key))return}firstAfterOrEqual(t){const e=this.data.getIteratorFrom(t);return e.hasNext()?e.getNext().key:null}getIterator(){return new Ma(this.data.getIterator())}getIteratorFrom(t){return new Ma(this.data.getIteratorFrom(t))}add(t){return this.copy(this.data.remove(t).insert(t,!0))}delete(t){return this.has(t)?this.copy(this.data.remove(t)):this}isEmpty(){return this.data.isEmpty()}unionWith(t){let e=this;return e.size<t.size&&(e=t,t=this),t.forEach(n=>{e=e.add(n)}),e}isEqual(t){if(!(t instanceof X)||this.size!==t.size)return!1;const e=this.data.getIterator(),n=t.data.getIterator();for(;e.hasNext();){const i=e.getNext().key,s=n.getNext().key;if(this.comparator(i,s)!==0)return!1}return!0}toArray(){const t=[];return this.forEach(e=>{t.push(e)}),t}toString(){const t=[];return this.forEach(e=>t.push(e)),"SortedSet("+t.toString()+")"}copy(t){const e=new X(this.comparator);return e.data=t,e}}class Ma{constructor(t){this.iter=t}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function Ge(r){return r.hasNext()?r.getNext():void 0}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ct{constructor(t){this.fields=t,t.sort(it.comparator)}static empty(){return new Ct([])}unionWith(t){let e=new X(it.comparator);for(const n of this.fields)e=e.add(n);for(const n of t)e=e.add(n);return new Ct(e.toArray())}covers(t){for(const e of this.fields)if(e.isPrefixOf(t))return!0;return!1}isEqual(t){return tn(this.fields,t.fields,(e,n)=>e.isEqual(n))}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sl extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lt{constructor(t){this.binaryString=t}static fromBase64String(t){const e=function(i){try{return atob(i)}catch(s){throw typeof DOMException<"u"&&s instanceof DOMException?new sl("Invalid base64 string: "+s):s}}(t);return new lt(e)}static fromUint8Array(t){const e=function(i){let s="";for(let a=0;a<i.length;++a)s+=String.fromCharCode(i[a]);return s}(t);return new lt(e)}[Symbol.iterator](){let t=0;return{next:()=>t<this.binaryString.length?{value:this.binaryString.charCodeAt(t++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(e){return btoa(e)}(this.binaryString)}toUint8Array(){return function(e){const n=new Uint8Array(e.length);for(let i=0;i<e.length;i++)n[i]=e.charCodeAt(i);return n}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(t){return q(this.binaryString,t.binaryString)}isEqual(t){return this.binaryString===t.binaryString}}lt.EMPTY_BYTE_STRING=new lt("");const hd=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function Wt(r){if(L(!!r),typeof r=="string"){let t=0;const e=hd.exec(r);if(L(!!e),e[1]){let i=e[1];i=(i+"000000000").substr(0,9),t=Number(i)}const n=new Date(r);return{seconds:Math.floor(n.getTime()/1e3),nanos:t}}return{seconds:rt(r.seconds),nanos:rt(r.nanos)}}function rt(r){return typeof r=="number"?r:typeof r=="string"?Number(r):0}function ae(r){return typeof r=="string"?lt.fromBase64String(r):lt.fromUint8Array(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function di(r){var t,e;return((e=(((t=r==null?void 0:r.mapValue)===null||t===void 0?void 0:t.fields)||{}).__type__)===null||e===void 0?void 0:e.stringValue)==="server_timestamp"}function ks(r){const t=r.mapValue.fields.__previous_value__;return di(t)?ks(t):t}function tr(r){const t=Wt(r.mapValue.fields.__local_write_time__.timestampValue);return new st(t.seconds,t.nanos)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dd{constructor(t,e,n,i,s,a,u,c,d){this.databaseId=t,this.appId=e,this.persistenceKey=n,this.host=i,this.ssl=s,this.forceLongPolling=a,this.autoDetectLongPolling=u,this.longPollingOptions=c,this.useFetchStreams=d}}class be{constructor(t,e){this.projectId=t,this.database=e||"(default)"}static empty(){return new be("","")}get isDefaultDatabase(){return this.database==="(default)"}isEqual(t){return t instanceof be&&t.projectId===this.projectId&&t.database===this.database}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ie={mapValue:{fields:{__type__:{stringValue:"__max__"}}}},jr={nullValue:"NULL_VALUE"};function Ce(r){return"nullValue"in r?0:"booleanValue"in r?1:"integerValue"in r||"doubleValue"in r?2:"timestampValue"in r?3:"stringValue"in r?5:"bytesValue"in r?6:"referenceValue"in r?7:"geoPointValue"in r?8:"arrayValue"in r?9:"mapValue"in r?di(r)?4:ol(r)?9007199254740991:fi(r)?10:11:O()}function qt(r,t){if(r===t)return!0;const e=Ce(r);if(e!==Ce(t))return!1;switch(e){case 0:case 9007199254740991:return!0;case 1:return r.booleanValue===t.booleanValue;case 4:return tr(r).isEqual(tr(t));case 3:return function(i,s){if(typeof i.timestampValue=="string"&&typeof s.timestampValue=="string"&&i.timestampValue.length===s.timestampValue.length)return i.timestampValue===s.timestampValue;const a=Wt(i.timestampValue),u=Wt(s.timestampValue);return a.seconds===u.seconds&&a.nanos===u.nanos}(r,t);case 5:return r.stringValue===t.stringValue;case 6:return function(i,s){return ae(i.bytesValue).isEqual(ae(s.bytesValue))}(r,t);case 7:return r.referenceValue===t.referenceValue;case 8:return function(i,s){return rt(i.geoPointValue.latitude)===rt(s.geoPointValue.latitude)&&rt(i.geoPointValue.longitude)===rt(s.geoPointValue.longitude)}(r,t);case 2:return function(i,s){if("integerValue"in i&&"integerValue"in s)return rt(i.integerValue)===rt(s.integerValue);if("doubleValue"in i&&"doubleValue"in s){const a=rt(i.doubleValue),u=rt(s.doubleValue);return a===u?Zn(a)===Zn(u):isNaN(a)&&isNaN(u)}return!1}(r,t);case 9:return tn(r.arrayValue.values||[],t.arrayValue.values||[],qt);case 10:case 11:return function(i,s){const a=i.mapValue.fields||{},u=s.mapValue.fields||{};if(ka(a)!==ka(u))return!1;for(const c in a)if(a.hasOwnProperty(c)&&(u[c]===void 0||!qt(a[c],u[c])))return!1;return!0}(r,t);default:return O()}}function er(r,t){return(r.values||[]).find(e=>qt(e,t))!==void 0}function ue(r,t){if(r===t)return 0;const e=Ce(r),n=Ce(t);if(e!==n)return q(e,n);switch(e){case 0:case 9007199254740991:return 0;case 1:return q(r.booleanValue,t.booleanValue);case 2:return function(s,a){const u=rt(s.integerValue||s.doubleValue),c=rt(a.integerValue||a.doubleValue);return u<c?-1:u>c?1:u===c?0:isNaN(u)?isNaN(c)?0:-1:1}(r,t);case 3:return Oa(r.timestampValue,t.timestampValue);case 4:return Oa(tr(r),tr(t));case 5:return q(r.stringValue,t.stringValue);case 6:return function(s,a){const u=ae(s),c=ae(a);return u.compareTo(c)}(r.bytesValue,t.bytesValue);case 7:return function(s,a){const u=s.split("/"),c=a.split("/");for(let d=0;d<u.length&&d<c.length;d++){const f=q(u[d],c[d]);if(f!==0)return f}return q(u.length,c.length)}(r.referenceValue,t.referenceValue);case 8:return function(s,a){const u=q(rt(s.latitude),rt(a.latitude));return u!==0?u:q(rt(s.longitude),rt(a.longitude))}(r.geoPointValue,t.geoPointValue);case 9:return Fa(r.arrayValue,t.arrayValue);case 10:return function(s,a){var u,c,d,f;const g=s.fields||{},I=a.fields||{},V=(u=g.value)===null||u===void 0?void 0:u.arrayValue,x=(c=I.value)===null||c===void 0?void 0:c.arrayValue,N=q(((d=V==null?void 0:V.values)===null||d===void 0?void 0:d.length)||0,((f=x==null?void 0:x.values)===null||f===void 0?void 0:f.length)||0);return N!==0?N:Fa(V,x)}(r.mapValue,t.mapValue);case 11:return function(s,a){if(s===ie.mapValue&&a===ie.mapValue)return 0;if(s===ie.mapValue)return 1;if(a===ie.mapValue)return-1;const u=s.fields||{},c=Object.keys(u),d=a.fields||{},f=Object.keys(d);c.sort(),f.sort();for(let g=0;g<c.length&&g<f.length;++g){const I=q(c[g],f[g]);if(I!==0)return I;const V=ue(u[c[g]],d[f[g]]);if(V!==0)return V}return q(c.length,f.length)}(r.mapValue,t.mapValue);default:throw O()}}function Oa(r,t){if(typeof r=="string"&&typeof t=="string"&&r.length===t.length)return q(r,t);const e=Wt(r),n=Wt(t),i=q(e.seconds,n.seconds);return i!==0?i:q(e.nanos,n.nanos)}function Fa(r,t){const e=r.values||[],n=t.values||[];for(let i=0;i<e.length&&i<n.length;++i){const s=ue(e[i],n[i]);if(s)return s}return q(e.length,n.length)}function en(r){return cs(r)}function cs(r){return"nullValue"in r?"null":"booleanValue"in r?""+r.booleanValue:"integerValue"in r?""+r.integerValue:"doubleValue"in r?""+r.doubleValue:"timestampValue"in r?function(e){const n=Wt(e);return`time(${n.seconds},${n.nanos})`}(r.timestampValue):"stringValue"in r?r.stringValue:"bytesValue"in r?function(e){return ae(e).toBase64()}(r.bytesValue):"referenceValue"in r?function(e){return M.fromName(e).toString()}(r.referenceValue):"geoPointValue"in r?function(e){return`geo(${e.latitude},${e.longitude})`}(r.geoPointValue):"arrayValue"in r?function(e){let n="[",i=!0;for(const s of e.values||[])i?i=!1:n+=",",n+=cs(s);return n+"]"}(r.arrayValue):"mapValue"in r?function(e){const n=Object.keys(e.fields||{}).sort();let i="{",s=!0;for(const a of n)s?s=!1:i+=",",i+=`${a}:${cs(e.fields[a])}`;return i+"}"}(r.mapValue):O()}function xe(r,t){return{referenceValue:`projects/${r.projectId}/databases/${r.database}/documents/${t.path.canonicalString()}`}}function hs(r){return!!r&&"integerValue"in r}function nr(r){return!!r&&"arrayValue"in r}function La(r){return!!r&&"nullValue"in r}function Ba(r){return!!r&&"doubleValue"in r&&isNaN(Number(r.doubleValue))}function Kr(r){return!!r&&"mapValue"in r}function fi(r){var t,e;return((e=(((t=r==null?void 0:r.mapValue)===null||t===void 0?void 0:t.fields)||{}).__type__)===null||e===void 0?void 0:e.stringValue)==="__vector__"}function Qn(r){if(r.geoPointValue)return{geoPointValue:Object.assign({},r.geoPointValue)};if(r.timestampValue&&typeof r.timestampValue=="object")return{timestampValue:Object.assign({},r.timestampValue)};if(r.mapValue){const t={mapValue:{fields:{}}};return Oe(r.mapValue.fields,(e,n)=>t.mapValue.fields[e]=Qn(n)),t}if(r.arrayValue){const t={arrayValue:{values:[]}};for(let e=0;e<(r.arrayValue.values||[]).length;++e)t.arrayValue.values[e]=Qn(r.arrayValue.values[e]);return t}return Object.assign({},r)}function ol(r){return(((r.mapValue||{}).fields||{}).__type__||{}).stringValue==="__max__"}const al={mapValue:{fields:{__type__:{stringValue:"__vector__"},value:{arrayValue:{}}}}};function fd(r){return"nullValue"in r?jr:"booleanValue"in r?{booleanValue:!1}:"integerValue"in r||"doubleValue"in r?{doubleValue:NaN}:"timestampValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in r?{stringValue:""}:"bytesValue"in r?{bytesValue:""}:"referenceValue"in r?xe(be.empty(),M.empty()):"geoPointValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in r?{arrayValue:{}}:"mapValue"in r?fi(r)?al:{mapValue:{}}:O()}function md(r){return"nullValue"in r?{booleanValue:!1}:"booleanValue"in r?{doubleValue:NaN}:"integerValue"in r||"doubleValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in r?{stringValue:""}:"stringValue"in r?{bytesValue:""}:"bytesValue"in r?xe(be.empty(),M.empty()):"referenceValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in r?{arrayValue:{}}:"arrayValue"in r?al:"mapValue"in r?fi(r)?{mapValue:{}}:ie:O()}function Ua(r,t){const e=ue(r.value,t.value);return e!==0?e:r.inclusive&&!t.inclusive?-1:!r.inclusive&&t.inclusive?1:0}function qa(r,t){const e=ue(r.value,t.value);return e!==0?e:r.inclusive&&!t.inclusive?1:!r.inclusive&&t.inclusive?-1:0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vt{constructor(t){this.value=t}static empty(){return new vt({mapValue:{}})}field(t){if(t.isEmpty())return this.value;{let e=this.value;for(let n=0;n<t.length-1;++n)if(e=(e.mapValue.fields||{})[t.get(n)],!Kr(e))return null;return e=(e.mapValue.fields||{})[t.lastSegment()],e||null}}set(t,e){this.getFieldsMap(t.popLast())[t.lastSegment()]=Qn(e)}setAll(t){let e=it.emptyPath(),n={},i=[];t.forEach((a,u)=>{if(!e.isImmediateParentOf(u)){const c=this.getFieldsMap(e);this.applyChanges(c,n,i),n={},i=[],e=u.popLast()}a?n[u.lastSegment()]=Qn(a):i.push(u.lastSegment())});const s=this.getFieldsMap(e);this.applyChanges(s,n,i)}delete(t){const e=this.field(t.popLast());Kr(e)&&e.mapValue.fields&&delete e.mapValue.fields[t.lastSegment()]}isEqual(t){return qt(this.value,t.value)}getFieldsMap(t){let e=this.value;e.mapValue.fields||(e.mapValue={fields:{}});for(let n=0;n<t.length;++n){let i=e.mapValue.fields[t.get(n)];Kr(i)&&i.mapValue.fields||(i={mapValue:{fields:{}}},e.mapValue.fields[t.get(n)]=i),e=i}return e.mapValue.fields}applyChanges(t,e,n){Oe(e,(i,s)=>t[i]=s);for(const i of n)delete t[i]}clone(){return new vt(Qn(this.value))}}function ul(r){const t=[];return Oe(r.fields,(e,n)=>{const i=new it([e]);if(Kr(n)){const s=ul(n.mapValue).fields;if(s.length===0)t.push(i);else for(const a of s)t.push(i.child(a))}else t.push(i)}),new Ct(t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class at{constructor(t,e,n,i,s,a,u){this.key=t,this.documentType=e,this.version=n,this.readTime=i,this.createTime=s,this.data=a,this.documentState=u}static newInvalidDocument(t){return new at(t,0,B.min(),B.min(),B.min(),vt.empty(),0)}static newFoundDocument(t,e,n,i){return new at(t,1,e,B.min(),n,i,0)}static newNoDocument(t,e){return new at(t,2,e,B.min(),B.min(),vt.empty(),0)}static newUnknownDocument(t,e){return new at(t,3,e,B.min(),B.min(),vt.empty(),2)}convertToFoundDocument(t,e){return!this.createTime.isEqual(B.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=t),this.version=t,this.documentType=1,this.data=e,this.documentState=0,this}convertToNoDocument(t){return this.version=t,this.documentType=2,this.data=vt.empty(),this.documentState=0,this}convertToUnknownDocument(t){return this.version=t,this.documentType=3,this.data=vt.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=B.min(),this}setReadTime(t){return this.readTime=t,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(t){return t instanceof at&&this.key.isEqual(t.key)&&this.version.isEqual(t.version)&&this.documentType===t.documentType&&this.documentState===t.documentState&&this.data.isEqual(t.data)}mutableCopy(){return new at(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class le{constructor(t,e){this.position=t,this.inclusive=e}}function Ga(r,t,e){let n=0;for(let i=0;i<r.position.length;i++){const s=t[i],a=r.position[i];if(s.field.isKeyField()?n=M.comparator(M.fromName(a.referenceValue),e.key):n=ue(a,e.data.field(s.field)),s.dir==="desc"&&(n*=-1),n!==0)break}return n}function ja(r,t){if(r===null)return t===null;if(t===null||r.inclusive!==t.inclusive||r.position.length!==t.position.length)return!1;for(let e=0;e<r.position.length;e++)if(!qt(r.position[e],t.position[e]))return!1;return!0}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rr{constructor(t,e="asc"){this.field=t,this.dir=e}}function gd(r,t){return r.dir===t.dir&&r.field.isEqual(t.field)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ll{}class z extends ll{constructor(t,e,n){super(),this.field=t,this.op=e,this.value=n}static create(t,e,n){return t.isKeyField()?e==="in"||e==="not-in"?this.createKeyFieldInFilter(t,e,n):new pd(t,e,n):e==="array-contains"?new Id(t,n):e==="in"?new gl(t,n):e==="not-in"?new Td(t,n):e==="array-contains-any"?new Ed(t,n):new z(t,e,n)}static createKeyFieldInFilter(t,e,n){return e==="in"?new _d(t,n):new yd(t,n)}matches(t){const e=t.data.field(this.field);return this.op==="!="?e!==null&&this.matchesComparison(ue(e,this.value)):e!==null&&Ce(this.value)===Ce(e)&&this.matchesComparison(ue(e,this.value))}matchesComparison(t){switch(this.op){case"<":return t<0;case"<=":return t<=0;case"==":return t===0;case"!=":return t!==0;case">":return t>0;case">=":return t>=0;default:return O()}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class Y extends ll{constructor(t,e){super(),this.filters=t,this.op=e,this.ae=null}static create(t,e){return new Y(t,e)}matches(t){return nn(this)?this.filters.find(e=>!e.matches(t))===void 0:this.filters.find(e=>e.matches(t))!==void 0}getFlattenedFilters(){return this.ae!==null||(this.ae=this.filters.reduce((t,e)=>t.concat(e.getFlattenedFilters()),[])),this.ae}getFilters(){return Object.assign([],this.filters)}}function nn(r){return r.op==="and"}function ds(r){return r.op==="or"}function Ms(r){return cl(r)&&nn(r)}function cl(r){for(const t of r.filters)if(t instanceof Y)return!1;return!0}function fs(r){if(r instanceof z)return r.field.canonicalString()+r.op.toString()+en(r.value);if(Ms(r))return r.filters.map(t=>fs(t)).join(",");{const t=r.filters.map(e=>fs(e)).join(",");return`${r.op}(${t})`}}function hl(r,t){return r instanceof z?function(n,i){return i instanceof z&&n.op===i.op&&n.field.isEqual(i.field)&&qt(n.value,i.value)}(r,t):r instanceof Y?function(n,i){return i instanceof Y&&n.op===i.op&&n.filters.length===i.filters.length?n.filters.reduce((s,a,u)=>s&&hl(a,i.filters[u]),!0):!1}(r,t):void O()}function dl(r,t){const e=r.filters.concat(t);return Y.create(e,r.op)}function fl(r){return r instanceof z?function(e){return`${e.field.canonicalString()} ${e.op} ${en(e.value)}`}(r):r instanceof Y?function(e){return e.op.toString()+" {"+e.getFilters().map(fl).join(" ,")+"}"}(r):"Filter"}class pd extends z{constructor(t,e,n){super(t,e,n),this.key=M.fromName(n.referenceValue)}matches(t){const e=M.comparator(t.key,this.key);return this.matchesComparison(e)}}class _d extends z{constructor(t,e){super(t,"in",e),this.keys=ml("in",e)}matches(t){return this.keys.some(e=>e.isEqual(t.key))}}class yd extends z{constructor(t,e){super(t,"not-in",e),this.keys=ml("not-in",e)}matches(t){return!this.keys.some(e=>e.isEqual(t.key))}}function ml(r,t){var e;return(((e=t.arrayValue)===null||e===void 0?void 0:e.values)||[]).map(n=>M.fromName(n.referenceValue))}class Id extends z{constructor(t,e){super(t,"array-contains",e)}matches(t){const e=t.data.field(this.field);return nr(e)&&er(e.arrayValue,this.value)}}class gl extends z{constructor(t,e){super(t,"in",e)}matches(t){const e=t.data.field(this.field);return e!==null&&er(this.value.arrayValue,e)}}class Td extends z{constructor(t,e){super(t,"not-in",e)}matches(t){if(er(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const e=t.data.field(this.field);return e!==null&&!er(this.value.arrayValue,e)}}class Ed extends z{constructor(t,e){super(t,"array-contains-any",e)}matches(t){const e=t.data.field(this.field);return!(!nr(e)||!e.arrayValue.values)&&e.arrayValue.values.some(n=>er(this.value.arrayValue,n))}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vd{constructor(t,e=null,n=[],i=[],s=null,a=null,u=null){this.path=t,this.collectionGroup=e,this.orderBy=n,this.filters=i,this.limit=s,this.startAt=a,this.endAt=u,this.ue=null}}function ms(r,t=null,e=[],n=[],i=null,s=null,a=null){return new vd(r,t,e,n,i,s,a)}function De(r){const t=F(r);if(t.ue===null){let e=t.path.canonicalString();t.collectionGroup!==null&&(e+="|cg:"+t.collectionGroup),e+="|f:",e+=t.filters.map(n=>fs(n)).join(","),e+="|ob:",e+=t.orderBy.map(n=>function(s){return s.field.canonicalString()+s.dir}(n)).join(","),hi(t.limit)||(e+="|l:",e+=t.limit),t.startAt&&(e+="|lb:",e+=t.startAt.inclusive?"b:":"a:",e+=t.startAt.position.map(n=>en(n)).join(",")),t.endAt&&(e+="|ub:",e+=t.endAt.inclusive?"a:":"b:",e+=t.endAt.position.map(n=>en(n)).join(",")),t.ue=e}return t.ue}function or(r,t){if(r.limit!==t.limit||r.orderBy.length!==t.orderBy.length)return!1;for(let e=0;e<r.orderBy.length;e++)if(!gd(r.orderBy[e],t.orderBy[e]))return!1;if(r.filters.length!==t.filters.length)return!1;for(let e=0;e<r.filters.length;e++)if(!hl(r.filters[e],t.filters[e]))return!1;return r.collectionGroup===t.collectionGroup&&!!r.path.isEqual(t.path)&&!!ja(r.startAt,t.startAt)&&ja(r.endAt,t.endAt)}function Yr(r){return M.isDocumentKey(r.path)&&r.collectionGroup===null&&r.filters.length===0}function Xr(r,t){return r.filters.filter(e=>e instanceof z&&e.field.isEqual(t))}function Ka(r,t,e){let n=jr,i=!0;for(const s of Xr(r,t)){let a=jr,u=!0;switch(s.op){case"<":case"<=":a=fd(s.value);break;case"==":case"in":case">=":a=s.value;break;case">":a=s.value,u=!1;break;case"!=":case"not-in":a=jr}Ua({value:n,inclusive:i},{value:a,inclusive:u})<0&&(n=a,i=u)}if(e!==null){for(let s=0;s<r.orderBy.length;++s)if(r.orderBy[s].field.isEqual(t)){const a=e.position[s];Ua({value:n,inclusive:i},{value:a,inclusive:e.inclusive})<0&&(n=a,i=e.inclusive);break}}return{value:n,inclusive:i}}function za(r,t,e){let n=ie,i=!0;for(const s of Xr(r,t)){let a=ie,u=!0;switch(s.op){case">=":case">":a=md(s.value),u=!1;break;case"==":case"in":case"<=":a=s.value;break;case"<":a=s.value,u=!1;break;case"!=":case"not-in":a=ie}qa({value:n,inclusive:i},{value:a,inclusive:u})>0&&(n=a,i=u)}if(e!==null){for(let s=0;s<r.orderBy.length;++s)if(r.orderBy[s].field.isEqual(t)){const a=e.position[s];qa({value:n,inclusive:i},{value:a,inclusive:e.inclusive})>0&&(n=a,i=e.inclusive);break}}return{value:n,inclusive:i}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fe{constructor(t,e=null,n=[],i=[],s=null,a="F",u=null,c=null){this.path=t,this.collectionGroup=e,this.explicitOrderBy=n,this.filters=i,this.limit=s,this.limitType=a,this.startAt=u,this.endAt=c,this.ce=null,this.le=null,this.he=null,this.startAt,this.endAt}}function pl(r,t,e,n,i,s,a,u){return new fe(r,t,e,n,i,s,a,u)}function ar(r){return new fe(r)}function Qa(r){return r.filters.length===0&&r.limit===null&&r.startAt==null&&r.endAt==null&&(r.explicitOrderBy.length===0||r.explicitOrderBy.length===1&&r.explicitOrderBy[0].field.isKeyField())}function Os(r){return r.collectionGroup!==null}function Xe(r){const t=F(r);if(t.ce===null){t.ce=[];const e=new Set;for(const s of t.explicitOrderBy)t.ce.push(s),e.add(s.field.canonicalString());const n=t.explicitOrderBy.length>0?t.explicitOrderBy[t.explicitOrderBy.length-1].dir:"asc";(function(a){let u=new X(it.comparator);return a.filters.forEach(c=>{c.getFlattenedFilters().forEach(d=>{d.isInequality()&&(u=u.add(d.field))})}),u})(t).forEach(s=>{e.has(s.canonicalString())||s.isKeyField()||t.ce.push(new rr(s,n))}),e.has(it.keyField().canonicalString())||t.ce.push(new rr(it.keyField(),n))}return t.ce}function Nt(r){const t=F(r);return t.le||(t.le=wd(t,Xe(r))),t.le}function wd(r,t){if(r.limitType==="F")return ms(r.path,r.collectionGroup,t,r.filters,r.limit,r.startAt,r.endAt);{t=t.map(i=>{const s=i.dir==="desc"?"asc":"desc";return new rr(i.field,s)});const e=r.endAt?new le(r.endAt.position,r.endAt.inclusive):null,n=r.startAt?new le(r.startAt.position,r.startAt.inclusive):null;return ms(r.path,r.collectionGroup,t,r.filters,r.limit,e,n)}}function gs(r,t){const e=r.filters.concat([t]);return new fe(r.path,r.collectionGroup,r.explicitOrderBy.slice(),e,r.limit,r.limitType,r.startAt,r.endAt)}function ps(r,t,e){return new fe(r.path,r.collectionGroup,r.explicitOrderBy.slice(),r.filters.slice(),t,e,r.startAt,r.endAt)}function mi(r,t){return or(Nt(r),Nt(t))&&r.limitType===t.limitType}function _l(r){return`${De(Nt(r))}|lt:${r.limitType}`}function $e(r){return`Query(target=${function(e){let n=e.path.canonicalString();return e.collectionGroup!==null&&(n+=" collectionGroup="+e.collectionGroup),e.filters.length>0&&(n+=`, filters: [${e.filters.map(i=>fl(i)).join(", ")}]`),hi(e.limit)||(n+=", limit: "+e.limit),e.orderBy.length>0&&(n+=`, orderBy: [${e.orderBy.map(i=>function(a){return`${a.field.canonicalString()} (${a.dir})`}(i)).join(", ")}]`),e.startAt&&(n+=", startAt: ",n+=e.startAt.inclusive?"b:":"a:",n+=e.startAt.position.map(i=>en(i)).join(",")),e.endAt&&(n+=", endAt: ",n+=e.endAt.inclusive?"a:":"b:",n+=e.endAt.position.map(i=>en(i)).join(",")),`Target(${n})`}(Nt(r))}; limitType=${r.limitType})`}function ur(r,t){return t.isFoundDocument()&&function(n,i){const s=i.key.path;return n.collectionGroup!==null?i.key.hasCollectionId(n.collectionGroup)&&n.path.isPrefixOf(s):M.isDocumentKey(n.path)?n.path.isEqual(s):n.path.isImmediateParentOf(s)}(r,t)&&function(n,i){for(const s of Xe(n))if(!s.field.isKeyField()&&i.data.field(s.field)===null)return!1;return!0}(r,t)&&function(n,i){for(const s of n.filters)if(!s.matches(i))return!1;return!0}(r,t)&&function(n,i){return!(n.startAt&&!function(a,u,c){const d=Ga(a,u,c);return a.inclusive?d<=0:d<0}(n.startAt,Xe(n),i)||n.endAt&&!function(a,u,c){const d=Ga(a,u,c);return a.inclusive?d>=0:d>0}(n.endAt,Xe(n),i))}(r,t)}function yl(r){return r.collectionGroup||(r.path.length%2==1?r.path.lastSegment():r.path.get(r.path.length-2))}function Il(r){return(t,e)=>{let n=!1;for(const i of Xe(r)){const s=Ad(i,t,e);if(s!==0)return s;n=n||i.field.isKeyField()}return 0}}function Ad(r,t,e){const n=r.field.isKeyField()?M.comparator(t.key,e.key):function(s,a,u){const c=a.data.field(s),d=u.data.field(s);return c!==null&&d!==null?ue(c,d):O()}(r.field,t,e);switch(r.dir){case"asc":return n;case"desc":return-1*n;default:return O()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class me{constructor(t,e){this.mapKeyFn=t,this.equalsFn=e,this.inner={},this.innerSize=0}get(t){const e=this.mapKeyFn(t),n=this.inner[e];if(n!==void 0){for(const[i,s]of n)if(this.equalsFn(i,t))return s}}has(t){return this.get(t)!==void 0}set(t,e){const n=this.mapKeyFn(t),i=this.inner[n];if(i===void 0)return this.inner[n]=[[t,e]],void this.innerSize++;for(let s=0;s<i.length;s++)if(this.equalsFn(i[s][0],t))return void(i[s]=[t,e]);i.push([t,e]),this.innerSize++}delete(t){const e=this.mapKeyFn(t),n=this.inner[e];if(n===void 0)return!1;for(let i=0;i<n.length;i++)if(this.equalsFn(n[i][0],t))return n.length===1?delete this.inner[e]:n.splice(i,1),this.innerSize--,!0;return!1}forEach(t){Oe(this.inner,(e,n)=>{for(const[i,s]of n)t(i,s)})}isEmpty(){return il(this.inner)}size(){return this.innerSize}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rd=new et(M.comparator);function Dt(){return Rd}const Tl=new et(M.comparator);function Gn(...r){let t=Tl;for(const e of r)t=t.insert(e.key,e);return t}function El(r){let t=Tl;return r.forEach((e,n)=>t=t.insert(e,n.overlayedDocument)),t}function Ut(){return $n()}function vl(){return $n()}function $n(){return new me(r=>r.toString(),(r,t)=>r.isEqual(t))}const Vd=new et(M.comparator),Pd=new X(M.comparator);function K(...r){let t=Pd;for(const e of r)t=t.add(e);return t}const Sd=new X(q);function Fs(){return Sd}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ls(r,t){if(r.useProto3Json){if(isNaN(t))return{doubleValue:"NaN"};if(t===1/0)return{doubleValue:"Infinity"};if(t===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:Zn(t)?"-0":t}}function wl(r){return{integerValue:""+r}}function bd(r,t){return Zu(t)?wl(t):Ls(r,t)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gi{constructor(){this._=void 0}}function Cd(r,t,e){return r instanceof ir?function(i,s){const a={fields:{__type__:{stringValue:"server_timestamp"},__local_write_time__:{timestampValue:{seconds:i.seconds,nanos:i.nanoseconds}}}};return s&&di(s)&&(s=ks(s)),s&&(a.fields.__previous_value__=s),{mapValue:a}}(e,t):r instanceof rn?Rl(r,t):r instanceof sn?Vl(r,t):function(i,s){const a=Al(i,s),u=$a(a)+$a(i.Pe);return hs(a)&&hs(i.Pe)?wl(u):Ls(i.serializer,u)}(r,t)}function xd(r,t,e){return r instanceof rn?Rl(r,t):r instanceof sn?Vl(r,t):e}function Al(r,t){return r instanceof sr?function(n){return hs(n)||function(s){return!!s&&"doubleValue"in s}(n)}(t)?t:{integerValue:0}:null}class ir extends gi{}class rn extends gi{constructor(t){super(),this.elements=t}}function Rl(r,t){const e=Pl(t);for(const n of r.elements)e.some(i=>qt(i,n))||e.push(n);return{arrayValue:{values:e}}}class sn extends gi{constructor(t){super(),this.elements=t}}function Vl(r,t){let e=Pl(t);for(const n of r.elements)e=e.filter(i=>!qt(i,n));return{arrayValue:{values:e}}}class sr extends gi{constructor(t,e){super(),this.serializer=t,this.Pe=e}}function $a(r){return rt(r.integerValue||r.doubleValue)}function Pl(r){return nr(r)&&r.arrayValue.values?r.arrayValue.values.slice():[]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Dd{constructor(t,e){this.field=t,this.transform=e}}function Nd(r,t){return r.field.isEqual(t.field)&&function(n,i){return n instanceof rn&&i instanceof rn||n instanceof sn&&i instanceof sn?tn(n.elements,i.elements,qt):n instanceof sr&&i instanceof sr?qt(n.Pe,i.Pe):n instanceof ir&&i instanceof ir}(r.transform,t.transform)}class kd{constructor(t,e){this.version=t,this.transformResults=e}}class gt{constructor(t,e){this.updateTime=t,this.exists=e}static none(){return new gt}static exists(t){return new gt(void 0,t)}static updateTime(t){return new gt(t)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(t){return this.exists===t.exists&&(this.updateTime?!!t.updateTime&&this.updateTime.isEqual(t.updateTime):!t.updateTime)}}function zr(r,t){return r.updateTime!==void 0?t.isFoundDocument()&&t.version.isEqual(r.updateTime):r.exists===void 0||r.exists===t.isFoundDocument()}class pi{}function Sl(r,t){if(!r.hasLocalMutations||t&&t.fields.length===0)return null;if(t===null)return r.isNoDocument()?new lr(r.key,gt.none()):new gn(r.key,r.data,gt.none());{const e=r.data,n=vt.empty();let i=new X(it.comparator);for(let s of t.fields)if(!i.has(s)){let a=e.field(s);a===null&&s.length>1&&(s=s.popLast(),a=e.field(s)),a===null?n.delete(s):n.set(s,a),i=i.add(s)}return new Jt(r.key,n,new Ct(i.toArray()),gt.none())}}function Md(r,t,e){r instanceof gn?function(i,s,a){const u=i.value.clone(),c=Ha(i.fieldTransforms,s,a.transformResults);u.setAll(c),s.convertToFoundDocument(a.version,u).setHasCommittedMutations()}(r,t,e):r instanceof Jt?function(i,s,a){if(!zr(i.precondition,s))return void s.convertToUnknownDocument(a.version);const u=Ha(i.fieldTransforms,s,a.transformResults),c=s.data;c.setAll(bl(i)),c.setAll(u),s.convertToFoundDocument(a.version,c).setHasCommittedMutations()}(r,t,e):function(i,s,a){s.convertToNoDocument(a.version).setHasCommittedMutations()}(0,t,e)}function Wn(r,t,e,n){return r instanceof gn?function(s,a,u,c){if(!zr(s.precondition,a))return u;const d=s.value.clone(),f=Ja(s.fieldTransforms,c,a);return d.setAll(f),a.convertToFoundDocument(a.version,d).setHasLocalMutations(),null}(r,t,e,n):r instanceof Jt?function(s,a,u,c){if(!zr(s.precondition,a))return u;const d=Ja(s.fieldTransforms,c,a),f=a.data;return f.setAll(bl(s)),f.setAll(d),a.convertToFoundDocument(a.version,f).setHasLocalMutations(),u===null?null:u.unionWith(s.fieldMask.fields).unionWith(s.fieldTransforms.map(g=>g.field))}(r,t,e,n):function(s,a,u){return zr(s.precondition,a)?(a.convertToNoDocument(a.version).setHasLocalMutations(),null):u}(r,t,e)}function Od(r,t){let e=null;for(const n of r.fieldTransforms){const i=t.data.field(n.field),s=Al(n.transform,i||null);s!=null&&(e===null&&(e=vt.empty()),e.set(n.field,s))}return e||null}function Wa(r,t){return r.type===t.type&&!!r.key.isEqual(t.key)&&!!r.precondition.isEqual(t.precondition)&&!!function(n,i){return n===void 0&&i===void 0||!(!n||!i)&&tn(n,i,(s,a)=>Nd(s,a))}(r.fieldTransforms,t.fieldTransforms)&&(r.type===0?r.value.isEqual(t.value):r.type!==1||r.data.isEqual(t.data)&&r.fieldMask.isEqual(t.fieldMask))}class gn extends pi{constructor(t,e,n,i=[]){super(),this.key=t,this.value=e,this.precondition=n,this.fieldTransforms=i,this.type=0}getFieldMask(){return null}}class Jt extends pi{constructor(t,e,n,i,s=[]){super(),this.key=t,this.data=e,this.fieldMask=n,this.precondition=i,this.fieldTransforms=s,this.type=1}getFieldMask(){return this.fieldMask}}function bl(r){const t=new Map;return r.fieldMask.fields.forEach(e=>{if(!e.isEmpty()){const n=r.data.field(e);t.set(e,n)}}),t}function Ha(r,t,e){const n=new Map;L(r.length===e.length);for(let i=0;i<e.length;i++){const s=r[i],a=s.transform,u=t.data.field(s.field);n.set(s.field,xd(a,u,e[i]))}return n}function Ja(r,t,e){const n=new Map;for(const i of r){const s=i.transform,a=e.data.field(i.field);n.set(i.field,Cd(s,a,t))}return n}class lr extends pi{constructor(t,e){super(),this.key=t,this.precondition=e,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class Cl extends pi{constructor(t,e){super(),this.key=t,this.precondition=e,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bs{constructor(t,e,n,i){this.batchId=t,this.localWriteTime=e,this.baseMutations=n,this.mutations=i}applyToRemoteDocument(t,e){const n=e.mutationResults;for(let i=0;i<this.mutations.length;i++){const s=this.mutations[i];s.key.isEqual(t.key)&&Md(s,t,n[i])}}applyToLocalView(t,e){for(const n of this.baseMutations)n.key.isEqual(t.key)&&(e=Wn(n,t,e,this.localWriteTime));for(const n of this.mutations)n.key.isEqual(t.key)&&(e=Wn(n,t,e,this.localWriteTime));return e}applyToLocalDocumentSet(t,e){const n=vl();return this.mutations.forEach(i=>{const s=t.get(i.key),a=s.overlayedDocument;let u=this.applyToLocalView(a,s.mutatedFields);u=e.has(i.key)?null:u;const c=Sl(a,u);c!==null&&n.set(i.key,c),a.isValidDocument()||a.convertToNoDocument(B.min())}),n}keys(){return this.mutations.reduce((t,e)=>t.add(e.key),K())}isEqual(t){return this.batchId===t.batchId&&tn(this.mutations,t.mutations,(e,n)=>Wa(e,n))&&tn(this.baseMutations,t.baseMutations,(e,n)=>Wa(e,n))}}class Us{constructor(t,e,n,i){this.batch=t,this.commitVersion=e,this.mutationResults=n,this.docVersions=i}static from(t,e,n){L(t.mutations.length===n.length);let i=function(){return Vd}();const s=t.mutations;for(let a=0;a<s.length;a++)i=i.insert(s[a].key,n[a].version);return new Us(t,e,n,i)}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qs{constructor(t,e){this.largestBatchId=t,this.mutation=e}getKey(){return this.mutation.key}isEqual(t){return t!==null&&this.mutation===t.mutation}toString(){return`Overlay{
      largestBatchId: ${this.largestBatchId},
      mutation: ${this.mutation.toString()}
    }`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fd{constructor(t,e){this.count=t,this.unchangedNames=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ct,Q;function Ld(r){switch(r){default:return O();case S.CANCELLED:case S.UNKNOWN:case S.DEADLINE_EXCEEDED:case S.RESOURCE_EXHAUSTED:case S.INTERNAL:case S.UNAVAILABLE:case S.UNAUTHENTICATED:return!1;case S.INVALID_ARGUMENT:case S.NOT_FOUND:case S.ALREADY_EXISTS:case S.PERMISSION_DENIED:case S.FAILED_PRECONDITION:case S.ABORTED:case S.OUT_OF_RANGE:case S.UNIMPLEMENTED:case S.DATA_LOSS:return!0}}function xl(r){if(r===void 0)return ut("GRPC error has no .code"),S.UNKNOWN;switch(r){case ct.OK:return S.OK;case ct.CANCELLED:return S.CANCELLED;case ct.UNKNOWN:return S.UNKNOWN;case ct.DEADLINE_EXCEEDED:return S.DEADLINE_EXCEEDED;case ct.RESOURCE_EXHAUSTED:return S.RESOURCE_EXHAUSTED;case ct.INTERNAL:return S.INTERNAL;case ct.UNAVAILABLE:return S.UNAVAILABLE;case ct.UNAUTHENTICATED:return S.UNAUTHENTICATED;case ct.INVALID_ARGUMENT:return S.INVALID_ARGUMENT;case ct.NOT_FOUND:return S.NOT_FOUND;case ct.ALREADY_EXISTS:return S.ALREADY_EXISTS;case ct.PERMISSION_DENIED:return S.PERMISSION_DENIED;case ct.FAILED_PRECONDITION:return S.FAILED_PRECONDITION;case ct.ABORTED:return S.ABORTED;case ct.OUT_OF_RANGE:return S.OUT_OF_RANGE;case ct.UNIMPLEMENTED:return S.UNIMPLEMENTED;case ct.DATA_LOSS:return S.DATA_LOSS;default:return O()}}(Q=ct||(ct={}))[Q.OK=0]="OK",Q[Q.CANCELLED=1]="CANCELLED",Q[Q.UNKNOWN=2]="UNKNOWN",Q[Q.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",Q[Q.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",Q[Q.NOT_FOUND=5]="NOT_FOUND",Q[Q.ALREADY_EXISTS=6]="ALREADY_EXISTS",Q[Q.PERMISSION_DENIED=7]="PERMISSION_DENIED",Q[Q.UNAUTHENTICATED=16]="UNAUTHENTICATED",Q[Q.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",Q[Q.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",Q[Q.ABORTED=10]="ABORTED",Q[Q.OUT_OF_RANGE=11]="OUT_OF_RANGE",Q[Q.UNIMPLEMENTED=12]="UNIMPLEMENTED",Q[Q.INTERNAL=13]="INTERNAL",Q[Q.UNAVAILABLE=14]="UNAVAILABLE",Q[Q.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Bd(){return new TextEncoder}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ud=new Ve([4294967295,4294967295],0);function Ya(r){const t=Bd().encode(r),e=new Uu;return e.update(t),new Uint8Array(e.digest())}function Xa(r){const t=new DataView(r.buffer),e=t.getUint32(0,!0),n=t.getUint32(4,!0),i=t.getUint32(8,!0),s=t.getUint32(12,!0);return[new Ve([e,n],0),new Ve([i,s],0)]}class Gs{constructor(t,e,n){if(this.bitmap=t,this.padding=e,this.hashCount=n,e<0||e>=8)throw new jn(`Invalid padding: ${e}`);if(n<0)throw new jn(`Invalid hash count: ${n}`);if(t.length>0&&this.hashCount===0)throw new jn(`Invalid hash count: ${n}`);if(t.length===0&&e!==0)throw new jn(`Invalid padding when bitmap length is 0: ${e}`);this.Ie=8*t.length-e,this.Te=Ve.fromNumber(this.Ie)}Ee(t,e,n){let i=t.add(e.multiply(Ve.fromNumber(n)));return i.compare(Ud)===1&&(i=new Ve([i.getBits(0),i.getBits(1)],0)),i.modulo(this.Te).toNumber()}de(t){return(this.bitmap[Math.floor(t/8)]&1<<t%8)!=0}mightContain(t){if(this.Ie===0)return!1;const e=Ya(t),[n,i]=Xa(e);for(let s=0;s<this.hashCount;s++){const a=this.Ee(n,i,s);if(!this.de(a))return!1}return!0}static create(t,e,n){const i=t%8==0?0:8-t%8,s=new Uint8Array(Math.ceil(t/8)),a=new Gs(s,i,e);return n.forEach(u=>a.insert(u)),a}insert(t){if(this.Ie===0)return;const e=Ya(t),[n,i]=Xa(e);for(let s=0;s<this.hashCount;s++){const a=this.Ee(n,i,s);this.Ae(a)}}Ae(t){const e=Math.floor(t/8),n=t%8;this.bitmap[e]|=1<<n}}class jn extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cr{constructor(t,e,n,i,s){this.snapshotVersion=t,this.targetChanges=e,this.targetMismatches=n,this.documentUpdates=i,this.resolvedLimboDocuments=s}static createSynthesizedRemoteEventForCurrentChange(t,e,n){const i=new Map;return i.set(t,hr.createSynthesizedTargetChangeForCurrentChange(t,e,n)),new cr(B.min(),i,new et(q),Dt(),K())}}class hr{constructor(t,e,n,i,s){this.resumeToken=t,this.current=e,this.addedDocuments=n,this.modifiedDocuments=i,this.removedDocuments=s}static createSynthesizedTargetChangeForCurrentChange(t,e,n){return new hr(n,e,K(),K(),K())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qr{constructor(t,e,n,i){this.Re=t,this.removedTargetIds=e,this.key=n,this.Ve=i}}class Dl{constructor(t,e){this.targetId=t,this.me=e}}class Nl{constructor(t,e,n=lt.EMPTY_BYTE_STRING,i=null){this.state=t,this.targetIds=e,this.resumeToken=n,this.cause=i}}class Za{constructor(){this.fe=0,this.ge=eu(),this.pe=lt.EMPTY_BYTE_STRING,this.ye=!1,this.we=!0}get current(){return this.ye}get resumeToken(){return this.pe}get Se(){return this.fe!==0}get be(){return this.we}De(t){t.approximateByteSize()>0&&(this.we=!0,this.pe=t)}ve(){let t=K(),e=K(),n=K();return this.ge.forEach((i,s)=>{switch(s){case 0:t=t.add(i);break;case 2:e=e.add(i);break;case 1:n=n.add(i);break;default:O()}}),new hr(this.pe,this.ye,t,e,n)}Ce(){this.we=!1,this.ge=eu()}Fe(t,e){this.we=!0,this.ge=this.ge.insert(t,e)}Me(t){this.we=!0,this.ge=this.ge.remove(t)}xe(){this.fe+=1}Oe(){this.fe-=1,L(this.fe>=0)}Ne(){this.we=!0,this.ye=!0}}class qd{constructor(t){this.Le=t,this.Be=new Map,this.ke=Dt(),this.qe=tu(),this.Qe=new et(q)}Ke(t){for(const e of t.Re)t.Ve&&t.Ve.isFoundDocument()?this.$e(e,t.Ve):this.Ue(e,t.key,t.Ve);for(const e of t.removedTargetIds)this.Ue(e,t.key,t.Ve)}We(t){this.forEachTarget(t,e=>{const n=this.Ge(e);switch(t.state){case 0:this.ze(e)&&n.De(t.resumeToken);break;case 1:n.Oe(),n.Se||n.Ce(),n.De(t.resumeToken);break;case 2:n.Oe(),n.Se||this.removeTarget(e);break;case 3:this.ze(e)&&(n.Ne(),n.De(t.resumeToken));break;case 4:this.ze(e)&&(this.je(e),n.De(t.resumeToken));break;default:O()}})}forEachTarget(t,e){t.targetIds.length>0?t.targetIds.forEach(e):this.Be.forEach((n,i)=>{this.ze(i)&&e(i)})}He(t){const e=t.targetId,n=t.me.count,i=this.Je(e);if(i){const s=i.target;if(Yr(s))if(n===0){const a=new M(s.path);this.Ue(e,a,at.newNoDocument(a,B.min()))}else L(n===1);else{const a=this.Ye(e);if(a!==n){const u=this.Ze(t),c=u?this.Xe(u,t,a):1;if(c!==0){this.je(e);const d=c===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Qe=this.Qe.insert(e,d)}}}}}Ze(t){const e=t.me.unchangedNames;if(!e||!e.bits)return null;const{bits:{bitmap:n="",padding:i=0},hashCount:s=0}=e;let a,u;try{a=ae(n).toUint8Array()}catch(c){if(c instanceof sl)return Jn("Decoding the base64 bloom filter in existence filter failed ("+c.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw c}try{u=new Gs(a,i,s)}catch(c){return Jn(c instanceof jn?"BloomFilter error: ":"Applying bloom filter failed: ",c),null}return u.Ie===0?null:u}Xe(t,e,n){return e.me.count===n-this.nt(t,e.targetId)?0:2}nt(t,e){const n=this.Le.getRemoteKeysForTarget(e);let i=0;return n.forEach(s=>{const a=this.Le.tt(),u=`projects/${a.projectId}/databases/${a.database}/documents/${s.path.canonicalString()}`;t.mightContain(u)||(this.Ue(e,s,null),i++)}),i}rt(t){const e=new Map;this.Be.forEach((s,a)=>{const u=this.Je(a);if(u){if(s.current&&Yr(u.target)){const c=new M(u.target.path);this.ke.get(c)!==null||this.it(a,c)||this.Ue(a,c,at.newNoDocument(c,t))}s.be&&(e.set(a,s.ve()),s.Ce())}});let n=K();this.qe.forEach((s,a)=>{let u=!0;a.forEachWhile(c=>{const d=this.Je(c);return!d||d.purpose==="TargetPurposeLimboResolution"||(u=!1,!1)}),u&&(n=n.add(s))}),this.ke.forEach((s,a)=>a.setReadTime(t));const i=new cr(t,e,this.Qe,this.ke,n);return this.ke=Dt(),this.qe=tu(),this.Qe=new et(q),i}$e(t,e){if(!this.ze(t))return;const n=this.it(t,e.key)?2:0;this.Ge(t).Fe(e.key,n),this.ke=this.ke.insert(e.key,e),this.qe=this.qe.insert(e.key,this.st(e.key).add(t))}Ue(t,e,n){if(!this.ze(t))return;const i=this.Ge(t);this.it(t,e)?i.Fe(e,1):i.Me(e),this.qe=this.qe.insert(e,this.st(e).delete(t)),n&&(this.ke=this.ke.insert(e,n))}removeTarget(t){this.Be.delete(t)}Ye(t){const e=this.Ge(t).ve();return this.Le.getRemoteKeysForTarget(t).size+e.addedDocuments.size-e.removedDocuments.size}xe(t){this.Ge(t).xe()}Ge(t){let e=this.Be.get(t);return e||(e=new Za,this.Be.set(t,e)),e}st(t){let e=this.qe.get(t);return e||(e=new X(q),this.qe=this.qe.insert(t,e)),e}ze(t){const e=this.Je(t)!==null;return e||b("WatchChangeAggregator","Detected inactive target",t),e}Je(t){const e=this.Be.get(t);return e&&e.Se?null:this.Le.ot(t)}je(t){this.Be.set(t,new Za),this.Le.getRemoteKeysForTarget(t).forEach(e=>{this.Ue(t,e,null)})}it(t,e){return this.Le.getRemoteKeysForTarget(t).has(e)}}function tu(){return new et(M.comparator)}function eu(){return new et(M.comparator)}const Gd={asc:"ASCENDING",desc:"DESCENDING"},jd={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},Kd={and:"AND",or:"OR"};class zd{constructor(t,e){this.databaseId=t,this.useProto3Json=e}}function _s(r,t){return r.useProto3Json||hi(t)?t:{value:t}}function on(r,t){return r.useProto3Json?`${new Date(1e3*t.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+t.nanoseconds).slice(-9)}Z`:{seconds:""+t.seconds,nanos:t.nanoseconds}}function kl(r,t){return r.useProto3Json?t.toBase64():t.toUint8Array()}function Qd(r,t){return on(r,t.toTimestamp())}function Pt(r){return L(!!r),B.fromTimestamp(function(e){const n=Wt(e);return new st(n.seconds,n.nanos)}(r))}function js(r,t){return ys(r,t).canonicalString()}function ys(r,t){const e=function(i){return new J(["projects",i.projectId,"databases",i.database])}(r).child("documents");return t===void 0?e:e.child(t)}function Ml(r){const t=J.fromString(r);return L(Kl(t)),t}function Zr(r,t){return js(r.databaseId,t.path)}function Pe(r,t){const e=Ml(t);if(e.get(1)!==r.databaseId.projectId)throw new C(S.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+e.get(1)+" vs "+r.databaseId.projectId);if(e.get(3)!==r.databaseId.database)throw new C(S.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+e.get(3)+" vs "+r.databaseId.database);return new M(Ll(e))}function Ol(r,t){return js(r.databaseId,t)}function Fl(r){const t=Ml(r);return t.length===4?J.emptyPath():Ll(t)}function Is(r){return new J(["projects",r.databaseId.projectId,"databases",r.databaseId.database]).canonicalString()}function Ll(r){return L(r.length>4&&r.get(4)==="documents"),r.popFirst(5)}function nu(r,t,e){return{name:Zr(r,t),fields:e.value.mapValue.fields}}function $d(r,t,e){const n=Pe(r,t.name),i=Pt(t.updateTime),s=t.createTime?Pt(t.createTime):B.min(),a=new vt({mapValue:{fields:t.fields}}),u=at.newFoundDocument(n,i,s,a);return e&&u.setHasCommittedMutations(),e?u.setHasCommittedMutations():u}function Wd(r,t){let e;if("targetChange"in t){t.targetChange;const n=function(d){return d==="NO_CHANGE"?0:d==="ADD"?1:d==="REMOVE"?2:d==="CURRENT"?3:d==="RESET"?4:O()}(t.targetChange.targetChangeType||"NO_CHANGE"),i=t.targetChange.targetIds||[],s=function(d,f){return d.useProto3Json?(L(f===void 0||typeof f=="string"),lt.fromBase64String(f||"")):(L(f===void 0||f instanceof Buffer||f instanceof Uint8Array),lt.fromUint8Array(f||new Uint8Array))}(r,t.targetChange.resumeToken),a=t.targetChange.cause,u=a&&function(d){const f=d.code===void 0?S.UNKNOWN:xl(d.code);return new C(f,d.message||"")}(a);e=new Nl(n,i,s,u||null)}else if("documentChange"in t){t.documentChange;const n=t.documentChange;n.document,n.document.name,n.document.updateTime;const i=Pe(r,n.document.name),s=Pt(n.document.updateTime),a=n.document.createTime?Pt(n.document.createTime):B.min(),u=new vt({mapValue:{fields:n.document.fields}}),c=at.newFoundDocument(i,s,a,u),d=n.targetIds||[],f=n.removedTargetIds||[];e=new Qr(d,f,c.key,c)}else if("documentDelete"in t){t.documentDelete;const n=t.documentDelete;n.document;const i=Pe(r,n.document),s=n.readTime?Pt(n.readTime):B.min(),a=at.newNoDocument(i,s),u=n.removedTargetIds||[];e=new Qr([],u,a.key,a)}else if("documentRemove"in t){t.documentRemove;const n=t.documentRemove;n.document;const i=Pe(r,n.document),s=n.removedTargetIds||[];e=new Qr([],s,i,null)}else{if(!("filter"in t))return O();{t.filter;const n=t.filter;n.targetId;const{count:i=0,unchangedNames:s}=n,a=new Fd(i,s),u=n.targetId;e=new Dl(u,a)}}return e}function ti(r,t){let e;if(t instanceof gn)e={update:nu(r,t.key,t.value)};else if(t instanceof lr)e={delete:Zr(r,t.key)};else if(t instanceof Jt)e={update:nu(r,t.key,t.data),updateMask:tf(t.fieldMask)};else{if(!(t instanceof Cl))return O();e={verify:Zr(r,t.key)}}return t.fieldTransforms.length>0&&(e.updateTransforms=t.fieldTransforms.map(n=>function(s,a){const u=a.transform;if(u instanceof ir)return{fieldPath:a.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(u instanceof rn)return{fieldPath:a.field.canonicalString(),appendMissingElements:{values:u.elements}};if(u instanceof sn)return{fieldPath:a.field.canonicalString(),removeAllFromArray:{values:u.elements}};if(u instanceof sr)return{fieldPath:a.field.canonicalString(),increment:u.Pe};throw O()}(0,n))),t.precondition.isNone||(e.currentDocument=function(i,s){return s.updateTime!==void 0?{updateTime:Qd(i,s.updateTime)}:s.exists!==void 0?{exists:s.exists}:O()}(r,t.precondition)),e}function Ts(r,t){const e=t.currentDocument?function(s){return s.updateTime!==void 0?gt.updateTime(Pt(s.updateTime)):s.exists!==void 0?gt.exists(s.exists):gt.none()}(t.currentDocument):gt.none(),n=t.updateTransforms?t.updateTransforms.map(i=>function(a,u){let c=null;if("setToServerValue"in u)L(u.setToServerValue==="REQUEST_TIME"),c=new ir;else if("appendMissingElements"in u){const f=u.appendMissingElements.values||[];c=new rn(f)}else if("removeAllFromArray"in u){const f=u.removeAllFromArray.values||[];c=new sn(f)}else"increment"in u?c=new sr(a,u.increment):O();const d=it.fromServerFormat(u.fieldPath);return new Dd(d,c)}(r,i)):[];if(t.update){t.update.name;const i=Pe(r,t.update.name),s=new vt({mapValue:{fields:t.update.fields}});if(t.updateMask){const a=function(c){const d=c.fieldPaths||[];return new Ct(d.map(f=>it.fromServerFormat(f)))}(t.updateMask);return new Jt(i,s,a,e,n)}return new gn(i,s,e,n)}if(t.delete){const i=Pe(r,t.delete);return new lr(i,e)}if(t.verify){const i=Pe(r,t.verify);return new Cl(i,e)}return O()}function Hd(r,t){return r&&r.length>0?(L(t!==void 0),r.map(e=>function(i,s){let a=i.updateTime?Pt(i.updateTime):Pt(s);return a.isEqual(B.min())&&(a=Pt(s)),new kd(a,i.transformResults||[])}(e,t))):[]}function Bl(r,t){return{documents:[Ol(r,t.path)]}}function Ul(r,t){const e={structuredQuery:{}},n=t.path;let i;t.collectionGroup!==null?(i=n,e.structuredQuery.from=[{collectionId:t.collectionGroup,allDescendants:!0}]):(i=n.popLast(),e.structuredQuery.from=[{collectionId:n.lastSegment()}]),e.parent=Ol(r,i);const s=function(d){if(d.length!==0)return jl(Y.create(d,"and"))}(t.filters);s&&(e.structuredQuery.where=s);const a=function(d){if(d.length!==0)return d.map(f=>function(I){return{field:We(I.field),direction:Yd(I.dir)}}(f))}(t.orderBy);a&&(e.structuredQuery.orderBy=a);const u=_s(r,t.limit);return u!==null&&(e.structuredQuery.limit=u),t.startAt&&(e.structuredQuery.startAt=function(d){return{before:d.inclusive,values:d.position}}(t.startAt)),t.endAt&&(e.structuredQuery.endAt=function(d){return{before:!d.inclusive,values:d.position}}(t.endAt)),{_t:e,parent:i}}function ql(r){let t=Fl(r.parent);const e=r.structuredQuery,n=e.from?e.from.length:0;let i=null;if(n>0){L(n===1);const f=e.from[0];f.allDescendants?i=f.collectionId:t=t.child(f.collectionId)}let s=[];e.where&&(s=function(g){const I=Gl(g);return I instanceof Y&&Ms(I)?I.getFilters():[I]}(e.where));let a=[];e.orderBy&&(a=function(g){return g.map(I=>function(x){return new rr(He(x.field),function(D){switch(D){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(x.direction))}(I))}(e.orderBy));let u=null;e.limit&&(u=function(g){let I;return I=typeof g=="object"?g.value:g,hi(I)?null:I}(e.limit));let c=null;e.startAt&&(c=function(g){const I=!!g.before,V=g.values||[];return new le(V,I)}(e.startAt));let d=null;return e.endAt&&(d=function(g){const I=!g.before,V=g.values||[];return new le(V,I)}(e.endAt)),pl(t,i,a,s,u,"F",c,d)}function Jd(r,t){const e=function(i){switch(i){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return O()}}(t.purpose);return e==null?null:{"goog-listen-tags":e}}function Gl(r){return r.unaryFilter!==void 0?function(e){switch(e.unaryFilter.op){case"IS_NAN":const n=He(e.unaryFilter.field);return z.create(n,"==",{doubleValue:NaN});case"IS_NULL":const i=He(e.unaryFilter.field);return z.create(i,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const s=He(e.unaryFilter.field);return z.create(s,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const a=He(e.unaryFilter.field);return z.create(a,"!=",{nullValue:"NULL_VALUE"});default:return O()}}(r):r.fieldFilter!==void 0?function(e){return z.create(He(e.fieldFilter.field),function(i){switch(i){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";default:return O()}}(e.fieldFilter.op),e.fieldFilter.value)}(r):r.compositeFilter!==void 0?function(e){return Y.create(e.compositeFilter.filters.map(n=>Gl(n)),function(i){switch(i){case"AND":return"and";case"OR":return"or";default:return O()}}(e.compositeFilter.op))}(r):O()}function Yd(r){return Gd[r]}function Xd(r){return jd[r]}function Zd(r){return Kd[r]}function We(r){return{fieldPath:r.canonicalString()}}function He(r){return it.fromServerFormat(r.fieldPath)}function jl(r){return r instanceof z?function(e){if(e.op==="=="){if(Ba(e.value))return{unaryFilter:{field:We(e.field),op:"IS_NAN"}};if(La(e.value))return{unaryFilter:{field:We(e.field),op:"IS_NULL"}}}else if(e.op==="!="){if(Ba(e.value))return{unaryFilter:{field:We(e.field),op:"IS_NOT_NAN"}};if(La(e.value))return{unaryFilter:{field:We(e.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:We(e.field),op:Xd(e.op),value:e.value}}}(r):r instanceof Y?function(e){const n=e.getFilters().map(i=>jl(i));return n.length===1?n[0]:{compositeFilter:{op:Zd(e.op),filters:n}}}(r):O()}function tf(r){const t=[];return r.fields.forEach(e=>t.push(e.canonicalString())),{fieldPaths:t}}function Kl(r){return r.length>=4&&r.get(0)==="projects"&&r.get(2)==="databases"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $t{constructor(t,e,n,i,s=B.min(),a=B.min(),u=lt.EMPTY_BYTE_STRING,c=null){this.target=t,this.targetId=e,this.purpose=n,this.sequenceNumber=i,this.snapshotVersion=s,this.lastLimboFreeSnapshotVersion=a,this.resumeToken=u,this.expectedCount=c}withSequenceNumber(t){return new $t(this.target,this.targetId,this.purpose,t,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(t,e){return new $t(this.target,this.targetId,this.purpose,this.sequenceNumber,e,this.lastLimboFreeSnapshotVersion,t,null)}withExpectedCount(t){return new $t(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,t)}withLastLimboFreeSnapshotVersion(t){return new $t(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,t,this.resumeToken,this.expectedCount)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zl{constructor(t){this.ct=t}}function ef(r,t){let e;if(t.document)e=$d(r.ct,t.document,!!t.hasCommittedMutations);else if(t.noDocument){const n=M.fromSegments(t.noDocument.path),i=ke(t.noDocument.readTime);e=at.newNoDocument(n,i),t.hasCommittedMutations&&e.setHasCommittedMutations()}else{if(!t.unknownDocument)return O();{const n=M.fromSegments(t.unknownDocument.path),i=ke(t.unknownDocument.version);e=at.newUnknownDocument(n,i)}}return t.readTime&&e.setReadTime(function(i){const s=new st(i[0],i[1]);return B.fromTimestamp(s)}(t.readTime)),e}function ru(r,t){const e=t.key,n={prefixPath:e.getCollectionPath().popLast().toArray(),collectionGroup:e.collectionGroup,documentId:e.path.lastSegment(),readTime:ei(t.readTime),hasCommittedMutations:t.hasCommittedMutations};if(t.isFoundDocument())n.document=function(s,a){return{name:Zr(s,a.key),fields:a.data.value.mapValue.fields,updateTime:on(s,a.version.toTimestamp()),createTime:on(s,a.createTime.toTimestamp())}}(r.ct,t);else if(t.isNoDocument())n.noDocument={path:e.path.toArray(),readTime:Ne(t.version)};else{if(!t.isUnknownDocument())return O();n.unknownDocument={path:e.path.toArray(),version:Ne(t.version)}}return n}function ei(r){const t=r.toTimestamp();return[t.seconds,t.nanoseconds]}function Ne(r){const t=r.toTimestamp();return{seconds:t.seconds,nanoseconds:t.nanoseconds}}function ke(r){const t=new st(r.seconds,r.nanoseconds);return B.fromTimestamp(t)}function we(r,t){const e=(t.baseMutations||[]).map(s=>Ts(r.ct,s));for(let s=0;s<t.mutations.length-1;++s){const a=t.mutations[s];if(s+1<t.mutations.length&&t.mutations[s+1].transform!==void 0){const u=t.mutations[s+1];a.updateTransforms=u.transform.fieldTransforms,t.mutations.splice(s+1,1),++s}}const n=t.mutations.map(s=>Ts(r.ct,s)),i=st.fromMillis(t.localWriteTimeMs);return new Bs(t.batchId,i,e,n)}function Kn(r){const t=ke(r.readTime),e=r.lastLimboFreeSnapshotVersion!==void 0?ke(r.lastLimboFreeSnapshotVersion):B.min();let n;return n=function(s){return s.documents!==void 0}(r.query)?function(s){return L(s.documents.length===1),Nt(ar(Fl(s.documents[0])))}(r.query):function(s){return Nt(ql(s))}(r.query),new $t(n,r.targetId,"TargetPurposeListen",r.lastListenSequenceNumber,t,e,lt.fromBase64String(r.resumeToken))}function Ql(r,t){const e=Ne(t.snapshotVersion),n=Ne(t.lastLimboFreeSnapshotVersion);let i;i=Yr(t.target)?Bl(r.ct,t.target):Ul(r.ct,t.target)._t;const s=t.resumeToken.toBase64();return{targetId:t.targetId,canonicalId:De(t.target),readTime:e,resumeToken:s,lastListenSequenceNumber:t.sequenceNumber,lastLimboFreeSnapshotVersion:n,query:i}}function $l(r){const t=ql({parent:r.parent,structuredQuery:r.structuredQuery});return r.limitType==="LAST"?ps(t,t.limit,"L"):t}function ts(r,t){return new qs(t.largestBatchId,Ts(r.ct,t.overlayMutation))}function iu(r,t){const e=t.path.lastSegment();return[r,Vt(t.path.popLast()),e]}function su(r,t,e,n){return{indexId:r,uid:t,sequenceNumber:e,readTime:Ne(n.readTime),documentKey:Vt(n.documentKey.path),largestBatchId:n.largestBatchId}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nf{getBundleMetadata(t,e){return ou(t).get(e).next(n=>{if(n)return function(s){return{id:s.bundleId,createTime:ke(s.createTime),version:s.version}}(n)})}saveBundleMetadata(t,e){return ou(t).put(function(i){return{bundleId:i.id,createTime:Ne(Pt(i.createTime)),version:i.version}}(e))}getNamedQuery(t,e){return au(t).get(e).next(n=>{if(n)return function(s){return{name:s.name,query:$l(s.bundledQuery),readTime:ke(s.readTime)}}(n)})}saveNamedQuery(t,e){return au(t).put(function(i){return{name:i.name,readTime:Ne(Pt(i.readTime)),bundledQuery:i.bundledQuery}}(e))}}function ou(r){return ht(r,"bundles")}function au(r){return ht(r,"namedQueries")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _i{constructor(t,e){this.serializer=t,this.userId=e}static lt(t,e){const n=e.uid||"";return new _i(t,n)}getOverlay(t,e){return On(t).get(iu(this.userId,e)).next(n=>n?ts(this.serializer,n):null)}getOverlays(t,e){const n=Ut();return A.forEach(e,i=>this.getOverlay(t,i).next(s=>{s!==null&&n.set(i,s)})).next(()=>n)}saveOverlays(t,e,n){const i=[];return n.forEach((s,a)=>{const u=new qs(e,a);i.push(this.ht(t,u))}),A.waitFor(i)}removeOverlaysForBatchId(t,e,n){const i=new Set;e.forEach(a=>i.add(Vt(a.getCollectionPath())));const s=[];return i.forEach(a=>{const u=IDBKeyRange.bound([this.userId,a,n],[this.userId,a,n+1],!1,!0);s.push(On(t).j("collectionPathOverlayIndex",u))}),A.waitFor(s)}getOverlaysForCollection(t,e,n){const i=Ut(),s=Vt(e),a=IDBKeyRange.bound([this.userId,s,n],[this.userId,s,Number.POSITIVE_INFINITY],!0);return On(t).U("collectionPathOverlayIndex",a).next(u=>{for(const c of u){const d=ts(this.serializer,c);i.set(d.getKey(),d)}return i})}getOverlaysForCollectionGroup(t,e,n,i){const s=Ut();let a;const u=IDBKeyRange.bound([this.userId,e,n],[this.userId,e,Number.POSITIVE_INFINITY],!0);return On(t).J({index:"collectionGroupOverlayIndex",range:u},(c,d,f)=>{const g=ts(this.serializer,d);s.size()<i||g.largestBatchId===a?(s.set(g.getKey(),g),a=g.largestBatchId):f.done()}).next(()=>s)}ht(t,e){return On(t).put(function(i,s,a){const[u,c,d]=iu(s,a.mutation.key);return{userId:s,collectionPath:c,documentId:d,collectionGroup:a.mutation.key.getCollectionGroup(),largestBatchId:a.largestBatchId,overlayMutation:ti(i.ct,a.mutation)}}(this.serializer,this.userId,e))}}function On(r){return ht(r,"documentOverlays")}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rf{Pt(t){return ht(t,"globals")}getSessionToken(t){return this.Pt(t).get("sessionToken").next(e=>{const n=e==null?void 0:e.value;return n?lt.fromUint8Array(n):lt.EMPTY_BYTE_STRING})}setSessionToken(t,e){return this.Pt(t).put({name:"sessionToken",value:e.toUint8Array()})}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ae{constructor(){}It(t,e){this.Tt(t,e),e.Et()}Tt(t,e){if("nullValue"in t)this.dt(e,5);else if("booleanValue"in t)this.dt(e,10),e.At(t.booleanValue?1:0);else if("integerValue"in t)this.dt(e,15),e.At(rt(t.integerValue));else if("doubleValue"in t){const n=rt(t.doubleValue);isNaN(n)?this.dt(e,13):(this.dt(e,15),Zn(n)?e.At(0):e.At(n))}else if("timestampValue"in t){let n=t.timestampValue;this.dt(e,20),typeof n=="string"&&(n=Wt(n)),e.Rt(`${n.seconds||""}`),e.At(n.nanos||0)}else if("stringValue"in t)this.Vt(t.stringValue,e),this.ft(e);else if("bytesValue"in t)this.dt(e,30),e.gt(ae(t.bytesValue)),this.ft(e);else if("referenceValue"in t)this.yt(t.referenceValue,e);else if("geoPointValue"in t){const n=t.geoPointValue;this.dt(e,45),e.At(n.latitude||0),e.At(n.longitude||0)}else"mapValue"in t?ol(t)?this.dt(e,Number.MAX_SAFE_INTEGER):fi(t)?this.wt(t.mapValue,e):(this.St(t.mapValue,e),this.ft(e)):"arrayValue"in t?(this.bt(t.arrayValue,e),this.ft(e)):O()}Vt(t,e){this.dt(e,25),this.Dt(t,e)}Dt(t,e){e.Rt(t)}St(t,e){const n=t.fields||{};this.dt(e,55);for(const i of Object.keys(n))this.Vt(i,e),this.Tt(n[i],e)}wt(t,e){var n,i;const s=t.fields||{};this.dt(e,53);const a="value",u=((i=(n=s[a].arrayValue)===null||n===void 0?void 0:n.values)===null||i===void 0?void 0:i.length)||0;this.dt(e,15),e.At(rt(u)),this.Vt(a,e),this.Tt(s[a],e)}bt(t,e){const n=t.values||[];this.dt(e,50);for(const i of n)this.Tt(i,e)}yt(t,e){this.dt(e,37),M.fromName(t).path.forEach(n=>{this.dt(e,60),this.Dt(n,e)})}dt(t,e){t.At(e)}ft(t){t.At(2)}}Ae.vt=new Ae;function sf(r){if(r===0)return 8;let t=0;return!(r>>4)&&(t+=4,r<<=4),!(r>>6)&&(t+=2,r<<=2),!(r>>7)&&(t+=1),t}function uu(r){const t=64-function(n){let i=0;for(let s=0;s<8;++s){const a=sf(255&n[s]);if(i+=a,a!==8)break}return i}(r);return Math.ceil(t/8)}class of{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Ct(t){const e=t[Symbol.iterator]();let n=e.next();for(;!n.done;)this.Ft(n.value),n=e.next();this.Mt()}xt(t){const e=t[Symbol.iterator]();let n=e.next();for(;!n.done;)this.Ot(n.value),n=e.next();this.Nt()}Lt(t){for(const e of t){const n=e.charCodeAt(0);if(n<128)this.Ft(n);else if(n<2048)this.Ft(960|n>>>6),this.Ft(128|63&n);else if(e<"\uD800"||"\uDBFF"<e)this.Ft(480|n>>>12),this.Ft(128|63&n>>>6),this.Ft(128|63&n);else{const i=e.codePointAt(0);this.Ft(240|i>>>18),this.Ft(128|63&i>>>12),this.Ft(128|63&i>>>6),this.Ft(128|63&i)}}this.Mt()}Bt(t){for(const e of t){const n=e.charCodeAt(0);if(n<128)this.Ot(n);else if(n<2048)this.Ot(960|n>>>6),this.Ot(128|63&n);else if(e<"\uD800"||"\uDBFF"<e)this.Ot(480|n>>>12),this.Ot(128|63&n>>>6),this.Ot(128|63&n);else{const i=e.codePointAt(0);this.Ot(240|i>>>18),this.Ot(128|63&i>>>12),this.Ot(128|63&i>>>6),this.Ot(128|63&i)}}this.Nt()}kt(t){const e=this.qt(t),n=uu(e);this.Qt(1+n),this.buffer[this.position++]=255&n;for(let i=e.length-n;i<e.length;++i)this.buffer[this.position++]=255&e[i]}Kt(t){const e=this.qt(t),n=uu(e);this.Qt(1+n),this.buffer[this.position++]=~(255&n);for(let i=e.length-n;i<e.length;++i)this.buffer[this.position++]=~(255&e[i])}$t(){this.Ut(255),this.Ut(255)}Wt(){this.Gt(255),this.Gt(255)}reset(){this.position=0}seed(t){this.Qt(t.length),this.buffer.set(t,this.position),this.position+=t.length}zt(){return this.buffer.slice(0,this.position)}qt(t){const e=function(s){const a=new DataView(new ArrayBuffer(8));return a.setFloat64(0,s,!1),new Uint8Array(a.buffer)}(t),n=(128&e[0])!=0;e[0]^=n?255:128;for(let i=1;i<e.length;++i)e[i]^=n?255:0;return e}Ft(t){const e=255&t;e===0?(this.Ut(0),this.Ut(255)):e===255?(this.Ut(255),this.Ut(0)):this.Ut(e)}Ot(t){const e=255&t;e===0?(this.Gt(0),this.Gt(255)):e===255?(this.Gt(255),this.Gt(0)):this.Gt(t)}Mt(){this.Ut(0),this.Ut(1)}Nt(){this.Gt(0),this.Gt(1)}Ut(t){this.Qt(1),this.buffer[this.position++]=t}Gt(t){this.Qt(1),this.buffer[this.position++]=~t}Qt(t){const e=t+this.position;if(e<=this.buffer.length)return;let n=2*this.buffer.length;n<e&&(n=e);const i=new Uint8Array(n);i.set(this.buffer),this.buffer=i}}class af{constructor(t){this.jt=t}gt(t){this.jt.Ct(t)}Rt(t){this.jt.Lt(t)}At(t){this.jt.kt(t)}Et(){this.jt.$t()}}class uf{constructor(t){this.jt=t}gt(t){this.jt.xt(t)}Rt(t){this.jt.Bt(t)}At(t){this.jt.Kt(t)}Et(){this.jt.Wt()}}class Fn{constructor(){this.jt=new of,this.Ht=new af(this.jt),this.Jt=new uf(this.jt)}seed(t){this.jt.seed(t)}Yt(t){return t===0?this.Ht:this.Jt}zt(){return this.jt.zt()}reset(){this.jt.reset()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Re{constructor(t,e,n,i){this.indexId=t,this.documentKey=e,this.arrayValue=n,this.directionalValue=i}Zt(){const t=this.directionalValue.length,e=t===0||this.directionalValue[t-1]===255?t+1:t,n=new Uint8Array(e);return n.set(this.directionalValue,0),e!==t?n.set([0],this.directionalValue.length):++n[n.length-1],new Re(this.indexId,this.documentKey,this.arrayValue,n)}}function ee(r,t){let e=r.indexId-t.indexId;return e!==0?e:(e=lu(r.arrayValue,t.arrayValue),e!==0?e:(e=lu(r.directionalValue,t.directionalValue),e!==0?e:M.comparator(r.documentKey,t.documentKey)))}function lu(r,t){for(let e=0;e<r.length&&e<t.length;++e){const n=r[e]-t[e];if(n!==0)return n}return r.length-t.length}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cu{constructor(t){this.Xt=new X((e,n)=>it.comparator(e.field,n.field)),this.collectionId=t.collectionGroup!=null?t.collectionGroup:t.path.lastSegment(),this.en=t.orderBy,this.tn=[];for(const e of t.filters){const n=e;n.isInequality()?this.Xt=this.Xt.add(n):this.tn.push(n)}}get nn(){return this.Xt.size>1}rn(t){if(L(t.collectionGroup===this.collectionId),this.nn)return!1;const e=us(t);if(e!==void 0&&!this.sn(e))return!1;const n=Ee(t);let i=new Set,s=0,a=0;for(;s<n.length&&this.sn(n[s]);++s)i=i.add(n[s].fieldPath.canonicalString());if(s===n.length)return!0;if(this.Xt.size>0){const u=this.Xt.getIterator().getNext();if(!i.has(u.field.canonicalString())){const c=n[s];if(!this.on(u,c)||!this._n(this.en[a++],c))return!1}++s}for(;s<n.length;++s){const u=n[s];if(a>=this.en.length||!this._n(this.en[a++],u))return!1}return!0}an(){if(this.nn)return null;let t=new X(it.comparator);const e=[];for(const n of this.tn)if(!n.field.isKeyField())if(n.op==="array-contains"||n.op==="array-contains-any")e.push(new qr(n.field,2));else{if(t.has(n.field))continue;t=t.add(n.field),e.push(new qr(n.field,0))}for(const n of this.en)n.field.isKeyField()||t.has(n.field)||(t=t.add(n.field),e.push(new qr(n.field,n.dir==="asc"?0:1)));return new Jr(Jr.UNKNOWN_ID,this.collectionId,e,Xn.empty())}sn(t){for(const e of this.tn)if(this.on(e,t))return!0;return!1}on(t,e){if(t===void 0||!t.field.isEqual(e.fieldPath))return!1;const n=t.op==="array-contains"||t.op==="array-contains-any";return e.kind===2===n}_n(t,e){return!!t.field.isEqual(e.fieldPath)&&(e.kind===0&&t.dir==="asc"||e.kind===1&&t.dir==="desc")}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Wl(r){var t,e;if(L(r instanceof z||r instanceof Y),r instanceof z){if(r instanceof gl){const i=((e=(t=r.value.arrayValue)===null||t===void 0?void 0:t.values)===null||e===void 0?void 0:e.map(s=>z.create(r.field,"==",s)))||[];return Y.create(i,"or")}return r}const n=r.filters.map(i=>Wl(i));return Y.create(n,r.op)}function lf(r){if(r.getFilters().length===0)return[];const t=ws(Wl(r));return L(Hl(t)),Es(t)||vs(t)?[t]:t.getFilters()}function Es(r){return r instanceof z}function vs(r){return r instanceof Y&&Ms(r)}function Hl(r){return Es(r)||vs(r)||function(e){if(e instanceof Y&&ds(e)){for(const n of e.getFilters())if(!Es(n)&&!vs(n))return!1;return!0}return!1}(r)}function ws(r){if(L(r instanceof z||r instanceof Y),r instanceof z)return r;if(r.filters.length===1)return ws(r.filters[0]);const t=r.filters.map(n=>ws(n));let e=Y.create(t,r.op);return e=ni(e),Hl(e)?e:(L(e instanceof Y),L(nn(e)),L(e.filters.length>1),e.filters.reduce((n,i)=>Ks(n,i)))}function Ks(r,t){let e;return L(r instanceof z||r instanceof Y),L(t instanceof z||t instanceof Y),e=r instanceof z?t instanceof z?function(i,s){return Y.create([i,s],"and")}(r,t):hu(r,t):t instanceof z?hu(t,r):function(i,s){if(L(i.filters.length>0&&s.filters.length>0),nn(i)&&nn(s))return dl(i,s.getFilters());const a=ds(i)?i:s,u=ds(i)?s:i,c=a.filters.map(d=>Ks(d,u));return Y.create(c,"or")}(r,t),ni(e)}function hu(r,t){if(nn(t))return dl(t,r.getFilters());{const e=t.filters.map(n=>Ks(r,n));return Y.create(e,"or")}}function ni(r){if(L(r instanceof z||r instanceof Y),r instanceof z)return r;const t=r.getFilters();if(t.length===1)return ni(t[0]);if(cl(r))return r;const e=t.map(i=>ni(i)),n=[];return e.forEach(i=>{i instanceof z?n.push(i):i instanceof Y&&(i.op===r.op?n.push(...i.filters):n.push(i))}),n.length===1?n[0]:Y.create(n,r.op)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cf{constructor(){this.un=new zs}addToCollectionParentIndex(t,e){return this.un.add(e),A.resolve()}getCollectionParents(t,e){return A.resolve(this.un.getEntries(e))}addFieldIndex(t,e){return A.resolve()}deleteFieldIndex(t,e){return A.resolve()}deleteAllFieldIndexes(t){return A.resolve()}createTargetIndexes(t,e){return A.resolve()}getDocumentsMatchingTarget(t,e){return A.resolve(null)}getIndexType(t,e){return A.resolve(0)}getFieldIndexes(t,e){return A.resolve([])}getNextCollectionGroupToUpdate(t){return A.resolve(null)}getMinOffset(t,e){return A.resolve(Mt.min())}getMinOffsetFromCollectionGroup(t,e){return A.resolve(Mt.min())}updateCollectionGroup(t,e,n){return A.resolve()}updateIndexEntries(t,e){return A.resolve()}}class zs{constructor(){this.index={}}add(t){const e=t.lastSegment(),n=t.popLast(),i=this.index[e]||new X(J.comparator),s=!i.has(n);return this.index[e]=i.add(n),s}has(t){const e=t.lastSegment(),n=t.popLast(),i=this.index[e];return i&&i.has(n)}getEntries(t){return(this.index[t]||new X(J.comparator)).toArray()}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Or=new Uint8Array(0);class hf{constructor(t,e){this.databaseId=e,this.cn=new zs,this.ln=new me(n=>De(n),(n,i)=>or(n,i)),this.uid=t.uid||""}addToCollectionParentIndex(t,e){if(!this.cn.has(e)){const n=e.lastSegment(),i=e.popLast();t.addOnCommittedListener(()=>{this.cn.add(e)});const s={collectionId:n,parent:Vt(i)};return du(t).put(s)}return A.resolve()}getCollectionParents(t,e){const n=[],i=IDBKeyRange.bound([e,""],[$u(e),""],!1,!0);return du(t).U(i).next(s=>{for(const a of s){if(a.collectionId!==e)break;n.push(Bt(a.parent))}return n})}addFieldIndex(t,e){const n=Ln(t),i=function(u){return{indexId:u.indexId,collectionGroup:u.collectionGroup,fields:u.fields.map(c=>[c.fieldPath.canonicalString(),c.kind])}}(e);delete i.indexId;const s=n.add(i);if(e.indexState){const a=Ke(t);return s.next(u=>{a.put(su(u,this.uid,e.indexState.sequenceNumber,e.indexState.offset))})}return s.next()}deleteFieldIndex(t,e){const n=Ln(t),i=Ke(t),s=je(t);return n.delete(e.indexId).next(()=>i.delete(IDBKeyRange.bound([e.indexId],[e.indexId+1],!1,!0))).next(()=>s.delete(IDBKeyRange.bound([e.indexId],[e.indexId+1],!1,!0)))}deleteAllFieldIndexes(t){const e=Ln(t),n=je(t),i=Ke(t);return e.j().next(()=>n.j()).next(()=>i.j())}createTargetIndexes(t,e){return A.forEach(this.hn(e),n=>this.getIndexType(t,n).next(i=>{if(i===0||i===1){const s=new cu(n).an();if(s!=null)return this.addFieldIndex(t,s)}}))}getDocumentsMatchingTarget(t,e){const n=je(t);let i=!0;const s=new Map;return A.forEach(this.hn(e),a=>this.Pn(t,a).next(u=>{i&&(i=!!u),s.set(a,u)})).next(()=>{if(i){let a=K();const u=[];return A.forEach(s,(c,d)=>{b("IndexedDbIndexManager",`Using index ${function(U){return`id=${U.indexId}|cg=${U.collectionGroup}|f=${U.fields.map(H=>`${H.fieldPath}:${H.kind}`).join(",")}`}(c)} to execute ${De(e)}`);const f=function(U,H){const tt=us(H);if(tt===void 0)return null;for(const $ of Xr(U,tt.fieldPath))switch($.op){case"array-contains-any":return $.value.arrayValue.values||[];case"array-contains":return[$.value]}return null}(d,c),g=function(U,H){const tt=new Map;for(const $ of Ee(H))for(const T of Xr(U,$.fieldPath))switch(T.op){case"==":case"in":tt.set($.fieldPath.canonicalString(),T.value);break;case"not-in":case"!=":return tt.set($.fieldPath.canonicalString(),T.value),Array.from(tt.values())}return null}(d,c),I=function(U,H){const tt=[];let $=!0;for(const T of Ee(H)){const p=T.kind===0?Ka(U,T.fieldPath,U.startAt):za(U,T.fieldPath,U.startAt);tt.push(p.value),$&&($=p.inclusive)}return new le(tt,$)}(d,c),V=function(U,H){const tt=[];let $=!0;for(const T of Ee(H)){const p=T.kind===0?za(U,T.fieldPath,U.endAt):Ka(U,T.fieldPath,U.endAt);tt.push(p.value),$&&($=p.inclusive)}return new le(tt,$)}(d,c),x=this.In(c,d,I),N=this.In(c,d,V),D=this.Tn(c,d,g),j=this.En(c.indexId,f,x,I.inclusive,N,V.inclusive,D);return A.forEach(j,G=>n.G(G,e.limit).next(U=>{U.forEach(H=>{const tt=M.fromSegments(H.documentKey);a.has(tt)||(a=a.add(tt),u.push(tt))})}))}).next(()=>u)}return A.resolve(null)})}hn(t){let e=this.ln.get(t);return e||(t.filters.length===0?e=[t]:e=lf(Y.create(t.filters,"and")).map(n=>ms(t.path,t.collectionGroup,t.orderBy,n.getFilters(),t.limit,t.startAt,t.endAt)),this.ln.set(t,e),e)}En(t,e,n,i,s,a,u){const c=(e!=null?e.length:1)*Math.max(n.length,s.length),d=c/(e!=null?e.length:1),f=[];for(let g=0;g<c;++g){const I=e?this.dn(e[g/d]):Or,V=this.An(t,I,n[g%d],i),x=this.Rn(t,I,s[g%d],a),N=u.map(D=>this.An(t,I,D,!0));f.push(...this.createRange(V,x,N))}return f}An(t,e,n,i){const s=new Re(t,M.empty(),e,n);return i?s:s.Zt()}Rn(t,e,n,i){const s=new Re(t,M.empty(),e,n);return i?s.Zt():s}Pn(t,e){const n=new cu(e),i=e.collectionGroup!=null?e.collectionGroup:e.path.lastSegment();return this.getFieldIndexes(t,i).next(s=>{let a=null;for(const u of s)n.rn(u)&&(!a||u.fields.length>a.fields.length)&&(a=u);return a})}getIndexType(t,e){let n=2;const i=this.hn(e);return A.forEach(i,s=>this.Pn(t,s).next(a=>{a?n!==0&&a.fields.length<function(c){let d=new X(it.comparator),f=!1;for(const g of c.filters)for(const I of g.getFlattenedFilters())I.field.isKeyField()||(I.op==="array-contains"||I.op==="array-contains-any"?f=!0:d=d.add(I.field));for(const g of c.orderBy)g.field.isKeyField()||(d=d.add(g.field));return d.size+(f?1:0)}(s)&&(n=1):n=0})).next(()=>function(a){return a.limit!==null}(e)&&i.length>1&&n===2?1:n)}Vn(t,e){const n=new Fn;for(const i of Ee(t)){const s=e.data.field(i.fieldPath);if(s==null)return null;const a=n.Yt(i.kind);Ae.vt.It(s,a)}return n.zt()}dn(t){const e=new Fn;return Ae.vt.It(t,e.Yt(0)),e.zt()}mn(t,e){const n=new Fn;return Ae.vt.It(xe(this.databaseId,e),n.Yt(function(s){const a=Ee(s);return a.length===0?0:a[a.length-1].kind}(t))),n.zt()}Tn(t,e,n){if(n===null)return[];let i=[];i.push(new Fn);let s=0;for(const a of Ee(t)){const u=n[s++];for(const c of i)if(this.fn(e,a.fieldPath)&&nr(u))i=this.gn(i,a,u);else{const d=c.Yt(a.kind);Ae.vt.It(u,d)}}return this.pn(i)}In(t,e,n){return this.Tn(t,e,n.position)}pn(t){const e=[];for(let n=0;n<t.length;++n)e[n]=t[n].zt();return e}gn(t,e,n){const i=[...t],s=[];for(const a of n.arrayValue.values||[])for(const u of i){const c=new Fn;c.seed(u.zt()),Ae.vt.It(a,c.Yt(e.kind)),s.push(c)}return s}fn(t,e){return!!t.filters.find(n=>n instanceof z&&n.field.isEqual(e)&&(n.op==="in"||n.op==="not-in"))}getFieldIndexes(t,e){const n=Ln(t),i=Ke(t);return(e?n.U("collectionGroupIndex",IDBKeyRange.bound(e,e)):n.U()).next(s=>{const a=[];return A.forEach(s,u=>i.get([u.indexId,this.uid]).next(c=>{a.push(function(f,g){const I=g?new Xn(g.sequenceNumber,new Mt(ke(g.readTime),new M(Bt(g.documentKey)),g.largestBatchId)):Xn.empty(),V=f.fields.map(([x,N])=>new qr(it.fromServerFormat(x),N));return new Jr(f.indexId,f.collectionGroup,V,I)}(u,c))})).next(()=>a)})}getNextCollectionGroupToUpdate(t){return this.getFieldIndexes(t).next(e=>e.length===0?null:(e.sort((n,i)=>{const s=n.indexState.sequenceNumber-i.indexState.sequenceNumber;return s!==0?s:q(n.collectionGroup,i.collectionGroup)}),e[0].collectionGroup))}updateCollectionGroup(t,e,n){const i=Ln(t),s=Ke(t);return this.yn(t).next(a=>i.U("collectionGroupIndex",IDBKeyRange.bound(e,e)).next(u=>A.forEach(u,c=>s.put(su(c.indexId,this.uid,a,n)))))}updateIndexEntries(t,e){const n=new Map;return A.forEach(e,(i,s)=>{const a=n.get(i.collectionGroup);return(a?A.resolve(a):this.getFieldIndexes(t,i.collectionGroup)).next(u=>(n.set(i.collectionGroup,u),A.forEach(u,c=>this.wn(t,i,c).next(d=>{const f=this.Sn(s,c);return d.isEqual(f)?A.resolve():this.bn(t,s,c,d,f)}))))})}Dn(t,e,n,i){return je(t).put({indexId:i.indexId,uid:this.uid,arrayValue:i.arrayValue,directionalValue:i.directionalValue,orderedDocumentKey:this.mn(n,e.key),documentKey:e.key.path.toArray()})}vn(t,e,n,i){return je(t).delete([i.indexId,this.uid,i.arrayValue,i.directionalValue,this.mn(n,e.key),e.key.path.toArray()])}wn(t,e,n){const i=je(t);let s=new X(ee);return i.J({index:"documentKeyIndex",range:IDBKeyRange.only([n.indexId,this.uid,this.mn(n,e)])},(a,u)=>{s=s.add(new Re(n.indexId,e,u.arrayValue,u.directionalValue))}).next(()=>s)}Sn(t,e){let n=new X(ee);const i=this.Vn(e,t);if(i==null)return n;const s=us(e);if(s!=null){const a=t.data.field(s.fieldPath);if(nr(a))for(const u of a.arrayValue.values||[])n=n.add(new Re(e.indexId,t.key,this.dn(u),i))}else n=n.add(new Re(e.indexId,t.key,Or,i));return n}bn(t,e,n,i,s){b("IndexedDbIndexManager","Updating index entries for document '%s'",e.key);const a=[];return function(c,d,f,g,I){const V=c.getIterator(),x=d.getIterator();let N=Ge(V),D=Ge(x);for(;N||D;){let j=!1,G=!1;if(N&&D){const U=f(N,D);U<0?G=!0:U>0&&(j=!0)}else N!=null?G=!0:j=!0;j?(g(D),D=Ge(x)):G?(I(N),N=Ge(V)):(N=Ge(V),D=Ge(x))}}(i,s,ee,u=>{a.push(this.Dn(t,e,n,u))},u=>{a.push(this.vn(t,e,n,u))}),A.waitFor(a)}yn(t){let e=1;return Ke(t).J({index:"sequenceNumberIndex",reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},(n,i,s)=>{s.done(),e=i.sequenceNumber+1}).next(()=>e)}createRange(t,e,n){n=n.sort((a,u)=>ee(a,u)).filter((a,u,c)=>!u||ee(a,c[u-1])!==0);const i=[];i.push(t);for(const a of n){const u=ee(a,t),c=ee(a,e);if(u===0)i[0]=t.Zt();else if(u>0&&c<0)i.push(a),i.push(a.Zt());else if(c>0)break}i.push(e);const s=[];for(let a=0;a<i.length;a+=2){if(this.Cn(i[a],i[a+1]))return[];const u=[i[a].indexId,this.uid,i[a].arrayValue,i[a].directionalValue,Or,[]],c=[i[a+1].indexId,this.uid,i[a+1].arrayValue,i[a+1].directionalValue,Or,[]];s.push(IDBKeyRange.bound(u,c))}return s}Cn(t,e){return ee(t,e)>0}getMinOffsetFromCollectionGroup(t,e){return this.getFieldIndexes(t,e).next(fu)}getMinOffset(t,e){return A.mapArray(this.hn(e),n=>this.Pn(t,n).next(i=>i||O())).next(fu)}}function du(r){return ht(r,"collectionParents")}function je(r){return ht(r,"indexEntries")}function Ln(r){return ht(r,"indexConfiguration")}function Ke(r){return ht(r,"indexState")}function fu(r){L(r.length!==0);let t=r[0].indexState.offset,e=t.largestBatchId;for(let n=1;n<r.length;n++){const i=r[n].indexState.offset;xs(i,t)<0&&(t=i),e<i.largestBatchId&&(e=i.largestBatchId)}return new Mt(t.readTime,t.documentKey,e)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const mu={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0};class St{constructor(t,e,n){this.cacheSizeCollectionThreshold=t,this.percentileToCollect=e,this.maximumSequenceNumbersToCollect=n}static withCacheSize(t){return new St(t,St.DEFAULT_COLLECTION_PERCENTILE,St.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Jl(r,t,e){const n=r.store("mutations"),i=r.store("documentMutations"),s=[],a=IDBKeyRange.only(e.batchId);let u=0;const c=n.J({range:a},(f,g,I)=>(u++,I.delete()));s.push(c.next(()=>{L(u===1)}));const d=[];for(const f of e.mutations){const g=tl(t,f.key.path,e.batchId);s.push(i.delete(g)),d.push(f.key)}return A.waitFor(s).next(()=>d)}function ri(r){if(!r)return 0;let t;if(r.document)t=r.document;else if(r.unknownDocument)t=r.unknownDocument;else{if(!r.noDocument)throw O();t=r.noDocument}return JSON.stringify(t).length}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */St.DEFAULT_COLLECTION_PERCENTILE=10,St.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,St.DEFAULT=new St(41943040,St.DEFAULT_COLLECTION_PERCENTILE,St.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),St.DISABLED=new St(-1,0,0);class yi{constructor(t,e,n,i){this.userId=t,this.serializer=e,this.indexManager=n,this.referenceDelegate=i,this.Fn={}}static lt(t,e,n,i){L(t.uid!=="");const s=t.isAuthenticated()?t.uid:"";return new yi(s,e,n,i)}checkEmpty(t){let e=!0;const n=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return ne(t).J({index:"userMutationsIndex",range:n},(i,s,a)=>{e=!1,a.done()}).next(()=>e)}addMutationBatch(t,e,n,i){const s=Je(t),a=ne(t);return a.add({}).next(u=>{L(typeof u=="number");const c=new Bs(u,e,n,i),d=function(V,x,N){const D=N.baseMutations.map(G=>ti(V.ct,G)),j=N.mutations.map(G=>ti(V.ct,G));return{userId:x,batchId:N.batchId,localWriteTimeMs:N.localWriteTime.toMillis(),baseMutations:D,mutations:j}}(this.serializer,this.userId,c),f=[];let g=new X((I,V)=>q(I.canonicalString(),V.canonicalString()));for(const I of i){const V=tl(this.userId,I.key.path,u);g=g.add(I.key.path.popLast()),f.push(a.put(d)),f.push(s.put(V,$h))}return g.forEach(I=>{f.push(this.indexManager.addToCollectionParentIndex(t,I))}),t.addOnCommittedListener(()=>{this.Fn[u]=c.keys()}),A.waitFor(f).next(()=>c)})}lookupMutationBatch(t,e){return ne(t).get(e).next(n=>n?(L(n.userId===this.userId),we(this.serializer,n)):null)}Mn(t,e){return this.Fn[e]?A.resolve(this.Fn[e]):this.lookupMutationBatch(t,e).next(n=>{if(n){const i=n.keys();return this.Fn[e]=i,i}return null})}getNextMutationBatchAfterBatchId(t,e){const n=e+1,i=IDBKeyRange.lowerBound([this.userId,n]);let s=null;return ne(t).J({index:"userMutationsIndex",range:i},(a,u,c)=>{u.userId===this.userId&&(L(u.batchId>=n),s=we(this.serializer,u)),c.done()}).next(()=>s)}getHighestUnacknowledgedBatchId(t){const e=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let n=-1;return ne(t).J({index:"userMutationsIndex",range:e,reverse:!0},(i,s,a)=>{n=s.batchId,a.done()}).next(()=>n)}getAllMutationBatches(t){const e=IDBKeyRange.bound([this.userId,-1],[this.userId,Number.POSITIVE_INFINITY]);return ne(t).U("userMutationsIndex",e).next(n=>n.map(i=>we(this.serializer,i)))}getAllMutationBatchesAffectingDocumentKey(t,e){const n=Gr(this.userId,e.path),i=IDBKeyRange.lowerBound(n),s=[];return Je(t).J({range:i},(a,u,c)=>{const[d,f,g]=a,I=Bt(f);if(d===this.userId&&e.path.isEqual(I))return ne(t).get(g).next(V=>{if(!V)throw O();L(V.userId===this.userId),s.push(we(this.serializer,V))});c.done()}).next(()=>s)}getAllMutationBatchesAffectingDocumentKeys(t,e){let n=new X(q);const i=[];return e.forEach(s=>{const a=Gr(this.userId,s.path),u=IDBKeyRange.lowerBound(a),c=Je(t).J({range:u},(d,f,g)=>{const[I,V,x]=d,N=Bt(V);I===this.userId&&s.path.isEqual(N)?n=n.add(x):g.done()});i.push(c)}),A.waitFor(i).next(()=>this.xn(t,n))}getAllMutationBatchesAffectingQuery(t,e){const n=e.path,i=n.length+1,s=Gr(this.userId,n),a=IDBKeyRange.lowerBound(s);let u=new X(q);return Je(t).J({range:a},(c,d,f)=>{const[g,I,V]=c,x=Bt(I);g===this.userId&&n.isPrefixOf(x)?x.length===i&&(u=u.add(V)):f.done()}).next(()=>this.xn(t,u))}xn(t,e){const n=[],i=[];return e.forEach(s=>{i.push(ne(t).get(s).next(a=>{if(a===null)throw O();L(a.userId===this.userId),n.push(we(this.serializer,a))}))}),A.waitFor(i).next(()=>n)}removeMutationBatch(t,e){return Jl(t._e,this.userId,e).next(n=>(t.addOnCommittedListener(()=>{this.On(e.batchId)}),A.forEach(n,i=>this.referenceDelegate.markPotentiallyOrphaned(t,i))))}On(t){delete this.Fn[t]}performConsistencyCheck(t){return this.checkEmpty(t).next(e=>{if(!e)return A.resolve();const n=IDBKeyRange.lowerBound(function(a){return[a]}(this.userId)),i=[];return Je(t).J({range:n},(s,a,u)=>{if(s[0]===this.userId){const c=Bt(s[1]);i.push(c)}else u.done()}).next(()=>{L(i.length===0)})})}containsKey(t,e){return Yl(t,this.userId,e)}Nn(t){return Xl(t).get(this.userId).next(e=>e||{userId:this.userId,lastAcknowledgedBatchId:-1,lastStreamToken:""})}}function Yl(r,t,e){const n=Gr(t,e.path),i=n[1],s=IDBKeyRange.lowerBound(n);let a=!1;return Je(r).J({range:s,H:!0},(u,c,d)=>{const[f,g,I]=u;f===t&&g===i&&(a=!0),d.done()}).next(()=>a)}function ne(r){return ht(r,"mutations")}function Je(r){return ht(r,"documentMutations")}function Xl(r){return ht(r,"mutationQueues")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Me{constructor(t){this.Ln=t}next(){return this.Ln+=2,this.Ln}static Bn(){return new Me(0)}static kn(){return new Me(-1)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class df{constructor(t,e){this.referenceDelegate=t,this.serializer=e}allocateTargetId(t){return this.qn(t).next(e=>{const n=new Me(e.highestTargetId);return e.highestTargetId=n.next(),this.Qn(t,e).next(()=>e.highestTargetId)})}getLastRemoteSnapshotVersion(t){return this.qn(t).next(e=>B.fromTimestamp(new st(e.lastRemoteSnapshotVersion.seconds,e.lastRemoteSnapshotVersion.nanoseconds)))}getHighestSequenceNumber(t){return this.qn(t).next(e=>e.highestListenSequenceNumber)}setTargetsMetadata(t,e,n){return this.qn(t).next(i=>(i.highestListenSequenceNumber=e,n&&(i.lastRemoteSnapshotVersion=n.toTimestamp()),e>i.highestListenSequenceNumber&&(i.highestListenSequenceNumber=e),this.Qn(t,i)))}addTargetData(t,e){return this.Kn(t,e).next(()=>this.qn(t).next(n=>(n.targetCount+=1,this.$n(e,n),this.Qn(t,n))))}updateTargetData(t,e){return this.Kn(t,e)}removeTargetData(t,e){return this.removeMatchingKeysForTargetId(t,e.targetId).next(()=>ze(t).delete(e.targetId)).next(()=>this.qn(t)).next(n=>(L(n.targetCount>0),n.targetCount-=1,this.Qn(t,n)))}removeTargets(t,e,n){let i=0;const s=[];return ze(t).J((a,u)=>{const c=Kn(u);c.sequenceNumber<=e&&n.get(c.targetId)===null&&(i++,s.push(this.removeTargetData(t,c)))}).next(()=>A.waitFor(s)).next(()=>i)}forEachTarget(t,e){return ze(t).J((n,i)=>{const s=Kn(i);e(s)})}qn(t){return gu(t).get("targetGlobalKey").next(e=>(L(e!==null),e))}Qn(t,e){return gu(t).put("targetGlobalKey",e)}Kn(t,e){return ze(t).put(Ql(this.serializer,e))}$n(t,e){let n=!1;return t.targetId>e.highestTargetId&&(e.highestTargetId=t.targetId,n=!0),t.sequenceNumber>e.highestListenSequenceNumber&&(e.highestListenSequenceNumber=t.sequenceNumber,n=!0),n}getTargetCount(t){return this.qn(t).next(e=>e.targetCount)}getTargetData(t,e){const n=De(e),i=IDBKeyRange.bound([n,Number.NEGATIVE_INFINITY],[n,Number.POSITIVE_INFINITY]);let s=null;return ze(t).J({range:i,index:"queryTargetsIndex"},(a,u,c)=>{const d=Kn(u);or(e,d.target)&&(s=d,c.done())}).next(()=>s)}addMatchingKeys(t,e,n){const i=[],s=re(t);return e.forEach(a=>{const u=Vt(a.path);i.push(s.put({targetId:n,path:u})),i.push(this.referenceDelegate.addReference(t,n,a))}),A.waitFor(i)}removeMatchingKeys(t,e,n){const i=re(t);return A.forEach(e,s=>{const a=Vt(s.path);return A.waitFor([i.delete([n,a]),this.referenceDelegate.removeReference(t,n,s)])})}removeMatchingKeysForTargetId(t,e){const n=re(t),i=IDBKeyRange.bound([e],[e+1],!1,!0);return n.delete(i)}getMatchingKeysForTargetId(t,e){const n=IDBKeyRange.bound([e],[e+1],!1,!0),i=re(t);let s=K();return i.J({range:n,H:!0},(a,u,c)=>{const d=Bt(a[1]),f=new M(d);s=s.add(f)}).next(()=>s)}containsKey(t,e){const n=Vt(e.path),i=IDBKeyRange.bound([n],[$u(n)],!1,!0);let s=0;return re(t).J({index:"documentTargetsIndex",H:!0,range:i},([a,u],c,d)=>{a!==0&&(s++,d.done())}).next(()=>s>0)}ot(t,e){return ze(t).get(e).next(n=>n?Kn(n):null)}}function ze(r){return ht(r,"targets")}function gu(r){return ht(r,"targetGlobal")}function re(r){return ht(r,"targetDocuments")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pu([r,t],[e,n]){const i=q(r,e);return i===0?q(t,n):i}class ff{constructor(t){this.Un=t,this.buffer=new X(pu),this.Wn=0}Gn(){return++this.Wn}zn(t){const e=[t,this.Gn()];if(this.buffer.size<this.Un)this.buffer=this.buffer.add(e);else{const n=this.buffer.last();pu(e,n)<0&&(this.buffer=this.buffer.delete(n).add(e))}}get maxValue(){return this.buffer.last()[0]}}class mf{constructor(t,e,n){this.garbageCollector=t,this.asyncQueue=e,this.localStore=n,this.jn=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Hn(6e4)}stop(){this.jn&&(this.jn.cancel(),this.jn=null)}get started(){return this.jn!==null}Hn(t){b("LruGarbageCollector",`Garbage collection scheduled in ${t}ms`),this.jn=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",t,async()=>{this.jn=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(e){de(e)?b("LruGarbageCollector","Ignoring IndexedDB error during garbage collection: ",e):await he(e)}await this.Hn(3e5)})}}class gf{constructor(t,e){this.Jn=t,this.params=e}calculateTargetCount(t,e){return this.Jn.Yn(t).next(n=>Math.floor(e/100*n))}nthSequenceNumber(t,e){if(e===0)return A.resolve(bt.oe);const n=new ff(e);return this.Jn.forEachTarget(t,i=>n.zn(i.sequenceNumber)).next(()=>this.Jn.Zn(t,i=>n.zn(i))).next(()=>n.maxValue)}removeTargets(t,e,n){return this.Jn.removeTargets(t,e,n)}removeOrphanedDocuments(t,e){return this.Jn.removeOrphanedDocuments(t,e)}collect(t,e){return this.params.cacheSizeCollectionThreshold===-1?(b("LruGarbageCollector","Garbage collection skipped; disabled"),A.resolve(mu)):this.getCacheSize(t).next(n=>n<this.params.cacheSizeCollectionThreshold?(b("LruGarbageCollector",`Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),mu):this.Xn(t,e))}getCacheSize(t){return this.Jn.getCacheSize(t)}Xn(t,e){let n,i,s,a,u,c,d;const f=Date.now();return this.calculateTargetCount(t,this.params.percentileToCollect).next(g=>(g>this.params.maximumSequenceNumbersToCollect?(b("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${g}`),i=this.params.maximumSequenceNumbersToCollect):i=g,a=Date.now(),this.nthSequenceNumber(t,i))).next(g=>(n=g,u=Date.now(),this.removeTargets(t,n,e))).next(g=>(s=g,c=Date.now(),this.removeOrphanedDocuments(t,n))).next(g=>(d=Date.now(),Qe()<=Qt.DEBUG&&b("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${a-f}ms
	Determined least recently used ${i} in `+(u-a)+`ms
	Removed ${s} targets in `+(c-u)+`ms
	Removed ${g} documents in `+(d-c)+`ms
Total Duration: ${d-f}ms`),A.resolve({didRun:!0,sequenceNumbersCollected:i,targetsRemoved:s,documentsRemoved:g})))}}function pf(r,t){return new gf(r,t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _f{constructor(t,e){this.db=t,this.garbageCollector=pf(this,e)}Yn(t){const e=this.er(t);return this.db.getTargetCache().getTargetCount(t).next(n=>e.next(i=>n+i))}er(t){let e=0;return this.Zn(t,n=>{e++}).next(()=>e)}forEachTarget(t,e){return this.db.getTargetCache().forEachTarget(t,e)}Zn(t,e){return this.tr(t,(n,i)=>e(i))}addReference(t,e,n){return Fr(t,n)}removeReference(t,e,n){return Fr(t,n)}removeTargets(t,e,n){return this.db.getTargetCache().removeTargets(t,e,n)}markPotentiallyOrphaned(t,e){return Fr(t,e)}nr(t,e){return function(i,s){let a=!1;return Xl(i).Y(u=>Yl(i,u,s).next(c=>(c&&(a=!0),A.resolve(!c)))).next(()=>a)}(t,e)}removeOrphanedDocuments(t,e){const n=this.db.getRemoteDocumentCache().newChangeBuffer(),i=[];let s=0;return this.tr(t,(a,u)=>{if(u<=e){const c=this.nr(t,a).next(d=>{if(!d)return s++,n.getEntry(t,a).next(()=>(n.removeEntry(a,B.min()),re(t).delete(function(g){return[0,Vt(g.path)]}(a))))});i.push(c)}}).next(()=>A.waitFor(i)).next(()=>n.apply(t)).next(()=>s)}removeTarget(t,e){const n=e.withSequenceNumber(t.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(t,n)}updateLimboDocument(t,e){return Fr(t,e)}tr(t,e){const n=re(t);let i,s=bt.oe;return n.J({index:"documentTargetsIndex"},([a,u],{path:c,sequenceNumber:d})=>{a===0?(s!==bt.oe&&e(new M(Bt(i)),s),s=d,i=c):s=bt.oe}).next(()=>{s!==bt.oe&&e(new M(Bt(i)),s)})}getCacheSize(t){return this.db.getRemoteDocumentCache().getSize(t)}}function Fr(r,t){return re(r).put(function(n,i){return{targetId:0,path:Vt(n.path),sequenceNumber:i}}(t,r.currentSequenceNumber))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zl{constructor(){this.changes=new me(t=>t.toString(),(t,e)=>t.isEqual(e)),this.changesApplied=!1}addEntry(t){this.assertNotApplied(),this.changes.set(t.key,t)}removeEntry(t,e){this.assertNotApplied(),this.changes.set(t,at.newInvalidDocument(t).setReadTime(e))}getEntry(t,e){this.assertNotApplied();const n=this.changes.get(e);return n!==void 0?A.resolve(n):this.getFromCache(t,e)}getEntries(t,e){return this.getAllFromCache(t,e)}apply(t){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(t)}assertNotApplied(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yf{constructor(t){this.serializer=t}setIndexManager(t){this.indexManager=t}addEntry(t,e,n){return Te(t).put(n)}removeEntry(t,e,n){return Te(t).delete(function(s,a){const u=s.path.toArray();return[u.slice(0,u.length-2),u[u.length-2],ei(a),u[u.length-1]]}(e,n))}updateMetadata(t,e){return this.getMetadata(t).next(n=>(n.byteSize+=e,this.rr(t,n)))}getEntry(t,e){let n=at.newInvalidDocument(e);return Te(t).J({index:"documentKeyIndex",range:IDBKeyRange.only(Bn(e))},(i,s)=>{n=this.ir(e,s)}).next(()=>n)}sr(t,e){let n={size:0,document:at.newInvalidDocument(e)};return Te(t).J({index:"documentKeyIndex",range:IDBKeyRange.only(Bn(e))},(i,s)=>{n={document:this.ir(e,s),size:ri(s)}}).next(()=>n)}getEntries(t,e){let n=Dt();return this._r(t,e,(i,s)=>{const a=this.ir(i,s);n=n.insert(i,a)}).next(()=>n)}ar(t,e){let n=Dt(),i=new et(M.comparator);return this._r(t,e,(s,a)=>{const u=this.ir(s,a);n=n.insert(s,u),i=i.insert(s,ri(a))}).next(()=>({documents:n,ur:i}))}_r(t,e,n){if(e.isEmpty())return A.resolve();let i=new X(Iu);e.forEach(c=>i=i.add(c));const s=IDBKeyRange.bound(Bn(i.first()),Bn(i.last())),a=i.getIterator();let u=a.getNext();return Te(t).J({index:"documentKeyIndex",range:s},(c,d,f)=>{const g=M.fromSegments([...d.prefixPath,d.collectionGroup,d.documentId]);for(;u&&Iu(u,g)<0;)n(u,null),u=a.getNext();u&&u.isEqual(g)&&(n(u,d),u=a.hasNext()?a.getNext():null),u?f.$(Bn(u)):f.done()}).next(()=>{for(;u;)n(u,null),u=a.hasNext()?a.getNext():null})}getDocumentsMatchingQuery(t,e,n,i,s){const a=e.path,u=[a.popLast().toArray(),a.lastSegment(),ei(n.readTime),n.documentKey.path.isEmpty()?"":n.documentKey.path.lastSegment()],c=[a.popLast().toArray(),a.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return Te(t).U(IDBKeyRange.bound(u,c,!0)).next(d=>{s==null||s.incrementDocumentReadCount(d.length);let f=Dt();for(const g of d){const I=this.ir(M.fromSegments(g.prefixPath.concat(g.collectionGroup,g.documentId)),g);I.isFoundDocument()&&(ur(e,I)||i.has(I.key))&&(f=f.insert(I.key,I))}return f})}getAllFromCollectionGroup(t,e,n,i){let s=Dt();const a=yu(e,n),u=yu(e,Mt.max());return Te(t).J({index:"collectionGroupIndex",range:IDBKeyRange.bound(a,u,!0)},(c,d,f)=>{const g=this.ir(M.fromSegments(d.prefixPath.concat(d.collectionGroup,d.documentId)),d);s=s.insert(g.key,g),s.size===i&&f.done()}).next(()=>s)}newChangeBuffer(t){return new If(this,!!t&&t.trackRemovals)}getSize(t){return this.getMetadata(t).next(e=>e.byteSize)}getMetadata(t){return _u(t).get("remoteDocumentGlobalKey").next(e=>(L(!!e),e))}rr(t,e){return _u(t).put("remoteDocumentGlobalKey",e)}ir(t,e){if(e){const n=ef(this.serializer,e);if(!(n.isNoDocument()&&n.version.isEqual(B.min())))return n}return at.newInvalidDocument(t)}}function tc(r){return new yf(r)}class If extends Zl{constructor(t,e){super(),this.cr=t,this.trackRemovals=e,this.lr=new me(n=>n.toString(),(n,i)=>n.isEqual(i))}applyChanges(t){const e=[];let n=0,i=new X((s,a)=>q(s.canonicalString(),a.canonicalString()));return this.changes.forEach((s,a)=>{const u=this.lr.get(s);if(e.push(this.cr.removeEntry(t,s,u.readTime)),a.isValidDocument()){const c=ru(this.cr.serializer,a);i=i.add(s.path.popLast());const d=ri(c);n+=d-u.size,e.push(this.cr.addEntry(t,s,c))}else if(n-=u.size,this.trackRemovals){const c=ru(this.cr.serializer,a.convertToNoDocument(B.min()));e.push(this.cr.addEntry(t,s,c))}}),i.forEach(s=>{e.push(this.cr.indexManager.addToCollectionParentIndex(t,s))}),e.push(this.cr.updateMetadata(t,n)),A.waitFor(e)}getFromCache(t,e){return this.cr.sr(t,e).next(n=>(this.lr.set(e,{size:n.size,readTime:n.document.readTime}),n.document))}getAllFromCache(t,e){return this.cr.ar(t,e).next(({documents:n,ur:i})=>(i.forEach((s,a)=>{this.lr.set(s,{size:a,readTime:n.get(s).readTime})}),n))}}function _u(r){return ht(r,"remoteDocumentGlobal")}function Te(r){return ht(r,"remoteDocumentsV14")}function Bn(r){const t=r.path.toArray();return[t.slice(0,t.length-2),t[t.length-2],t[t.length-1]]}function yu(r,t){const e=t.documentKey.path.toArray();return[r,ei(t.readTime),e.slice(0,e.length-2),e.length>0?e[e.length-1]:""]}function Iu(r,t){const e=r.path.toArray(),n=t.path.toArray();let i=0;for(let s=0;s<e.length-2&&s<n.length-2;++s)if(i=q(e[s],n[s]),i)return i;return i=q(e.length,n.length),i||(i=q(e[e.length-2],n[n.length-2]),i||q(e[e.length-1],n[n.length-1]))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tf{constructor(t,e){this.overlayedDocument=t,this.mutatedFields=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ec{constructor(t,e,n,i){this.remoteDocumentCache=t,this.mutationQueue=e,this.documentOverlayCache=n,this.indexManager=i}getDocument(t,e){let n=null;return this.documentOverlayCache.getOverlay(t,e).next(i=>(n=i,this.remoteDocumentCache.getEntry(t,e))).next(i=>(n!==null&&Wn(n.mutation,i,Ct.empty(),st.now()),i))}getDocuments(t,e){return this.remoteDocumentCache.getEntries(t,e).next(n=>this.getLocalViewOfDocuments(t,n,K()).next(()=>n))}getLocalViewOfDocuments(t,e,n=K()){const i=Ut();return this.populateOverlays(t,i,e).next(()=>this.computeViews(t,e,i,n).next(s=>{let a=Gn();return s.forEach((u,c)=>{a=a.insert(u,c.overlayedDocument)}),a}))}getOverlayedDocuments(t,e){const n=Ut();return this.populateOverlays(t,n,e).next(()=>this.computeViews(t,e,n,K()))}populateOverlays(t,e,n){const i=[];return n.forEach(s=>{e.has(s)||i.push(s)}),this.documentOverlayCache.getOverlays(t,i).next(s=>{s.forEach((a,u)=>{e.set(a,u)})})}computeViews(t,e,n,i){let s=Dt();const a=$n(),u=function(){return $n()}();return e.forEach((c,d)=>{const f=n.get(d.key);i.has(d.key)&&(f===void 0||f.mutation instanceof Jt)?s=s.insert(d.key,d):f!==void 0?(a.set(d.key,f.mutation.getFieldMask()),Wn(f.mutation,d,f.mutation.getFieldMask(),st.now())):a.set(d.key,Ct.empty())}),this.recalculateAndSaveOverlays(t,s).next(c=>(c.forEach((d,f)=>a.set(d,f)),e.forEach((d,f)=>{var g;return u.set(d,new Tf(f,(g=a.get(d))!==null&&g!==void 0?g:null))}),u))}recalculateAndSaveOverlays(t,e){const n=$n();let i=new et((a,u)=>a-u),s=K();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(t,e).next(a=>{for(const u of a)u.keys().forEach(c=>{const d=e.get(c);if(d===null)return;let f=n.get(c)||Ct.empty();f=u.applyToLocalView(d,f),n.set(c,f);const g=(i.get(u.batchId)||K()).add(c);i=i.insert(u.batchId,g)})}).next(()=>{const a=[],u=i.getReverseIterator();for(;u.hasNext();){const c=u.getNext(),d=c.key,f=c.value,g=vl();f.forEach(I=>{if(!s.has(I)){const V=Sl(e.get(I),n.get(I));V!==null&&g.set(I,V),s=s.add(I)}}),a.push(this.documentOverlayCache.saveOverlays(t,d,g))}return A.waitFor(a)}).next(()=>n)}recalculateAndSaveOverlaysForDocumentKeys(t,e){return this.remoteDocumentCache.getEntries(t,e).next(n=>this.recalculateAndSaveOverlays(t,n))}getDocumentsMatchingQuery(t,e,n,i){return function(a){return M.isDocumentKey(a.path)&&a.collectionGroup===null&&a.filters.length===0}(e)?this.getDocumentsMatchingDocumentQuery(t,e.path):Os(e)?this.getDocumentsMatchingCollectionGroupQuery(t,e,n,i):this.getDocumentsMatchingCollectionQuery(t,e,n,i)}getNextDocuments(t,e,n,i){return this.remoteDocumentCache.getAllFromCollectionGroup(t,e,n,i).next(s=>{const a=i-s.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(t,e,n.largestBatchId,i-s.size):A.resolve(Ut());let u=-1,c=s;return a.next(d=>A.forEach(d,(f,g)=>(u<g.largestBatchId&&(u=g.largestBatchId),s.get(f)?A.resolve():this.remoteDocumentCache.getEntry(t,f).next(I=>{c=c.insert(f,I)}))).next(()=>this.populateOverlays(t,d,s)).next(()=>this.computeViews(t,c,d,K())).next(f=>({batchId:u,changes:El(f)})))})}getDocumentsMatchingDocumentQuery(t,e){return this.getDocument(t,new M(e)).next(n=>{let i=Gn();return n.isFoundDocument()&&(i=i.insert(n.key,n)),i})}getDocumentsMatchingCollectionGroupQuery(t,e,n,i){const s=e.collectionGroup;let a=Gn();return this.indexManager.getCollectionParents(t,s).next(u=>A.forEach(u,c=>{const d=function(g,I){return new fe(I,null,g.explicitOrderBy.slice(),g.filters.slice(),g.limit,g.limitType,g.startAt,g.endAt)}(e,c.child(s));return this.getDocumentsMatchingCollectionQuery(t,d,n,i).next(f=>{f.forEach((g,I)=>{a=a.insert(g,I)})})}).next(()=>a))}getDocumentsMatchingCollectionQuery(t,e,n,i){let s;return this.documentOverlayCache.getOverlaysForCollection(t,e.path,n.largestBatchId).next(a=>(s=a,this.remoteDocumentCache.getDocumentsMatchingQuery(t,e,n,s,i))).next(a=>{s.forEach((c,d)=>{const f=d.getKey();a.get(f)===null&&(a=a.insert(f,at.newInvalidDocument(f)))});let u=Gn();return a.forEach((c,d)=>{const f=s.get(c);f!==void 0&&Wn(f.mutation,d,Ct.empty(),st.now()),ur(e,d)&&(u=u.insert(c,d))}),u})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ef{constructor(t){this.serializer=t,this.hr=new Map,this.Pr=new Map}getBundleMetadata(t,e){return A.resolve(this.hr.get(e))}saveBundleMetadata(t,e){return this.hr.set(e.id,function(i){return{id:i.id,version:i.version,createTime:Pt(i.createTime)}}(e)),A.resolve()}getNamedQuery(t,e){return A.resolve(this.Pr.get(e))}saveNamedQuery(t,e){return this.Pr.set(e.name,function(i){return{name:i.name,query:$l(i.bundledQuery),readTime:Pt(i.readTime)}}(e)),A.resolve()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vf{constructor(){this.overlays=new et(M.comparator),this.Ir=new Map}getOverlay(t,e){return A.resolve(this.overlays.get(e))}getOverlays(t,e){const n=Ut();return A.forEach(e,i=>this.getOverlay(t,i).next(s=>{s!==null&&n.set(i,s)})).next(()=>n)}saveOverlays(t,e,n){return n.forEach((i,s)=>{this.ht(t,e,s)}),A.resolve()}removeOverlaysForBatchId(t,e,n){const i=this.Ir.get(n);return i!==void 0&&(i.forEach(s=>this.overlays=this.overlays.remove(s)),this.Ir.delete(n)),A.resolve()}getOverlaysForCollection(t,e,n){const i=Ut(),s=e.length+1,a=new M(e.child("")),u=this.overlays.getIteratorFrom(a);for(;u.hasNext();){const c=u.getNext().value,d=c.getKey();if(!e.isPrefixOf(d.path))break;d.path.length===s&&c.largestBatchId>n&&i.set(c.getKey(),c)}return A.resolve(i)}getOverlaysForCollectionGroup(t,e,n,i){let s=new et((d,f)=>d-f);const a=this.overlays.getIterator();for(;a.hasNext();){const d=a.getNext().value;if(d.getKey().getCollectionGroup()===e&&d.largestBatchId>n){let f=s.get(d.largestBatchId);f===null&&(f=Ut(),s=s.insert(d.largestBatchId,f)),f.set(d.getKey(),d)}}const u=Ut(),c=s.getIterator();for(;c.hasNext()&&(c.getNext().value.forEach((d,f)=>u.set(d,f)),!(u.size()>=i)););return A.resolve(u)}ht(t,e,n){const i=this.overlays.get(n.key);if(i!==null){const a=this.Ir.get(i.largestBatchId).delete(n.key);this.Ir.set(i.largestBatchId,a)}this.overlays=this.overlays.insert(n.key,new qs(e,n));let s=this.Ir.get(e);s===void 0&&(s=K(),this.Ir.set(e,s)),this.Ir.set(e,s.add(n.key))}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wf{constructor(){this.sessionToken=lt.EMPTY_BYTE_STRING}getSessionToken(t){return A.resolve(this.sessionToken)}setSessionToken(t,e){return this.sessionToken=e,A.resolve()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qs{constructor(){this.Tr=new X(dt.Er),this.dr=new X(dt.Ar)}isEmpty(){return this.Tr.isEmpty()}addReference(t,e){const n=new dt(t,e);this.Tr=this.Tr.add(n),this.dr=this.dr.add(n)}Rr(t,e){t.forEach(n=>this.addReference(n,e))}removeReference(t,e){this.Vr(new dt(t,e))}mr(t,e){t.forEach(n=>this.removeReference(n,e))}gr(t){const e=new M(new J([])),n=new dt(e,t),i=new dt(e,t+1),s=[];return this.dr.forEachInRange([n,i],a=>{this.Vr(a),s.push(a.key)}),s}pr(){this.Tr.forEach(t=>this.Vr(t))}Vr(t){this.Tr=this.Tr.delete(t),this.dr=this.dr.delete(t)}yr(t){const e=new M(new J([])),n=new dt(e,t),i=new dt(e,t+1);let s=K();return this.dr.forEachInRange([n,i],a=>{s=s.add(a.key)}),s}containsKey(t){const e=new dt(t,0),n=this.Tr.firstAfterOrEqual(e);return n!==null&&t.isEqual(n.key)}}class dt{constructor(t,e){this.key=t,this.wr=e}static Er(t,e){return M.comparator(t.key,e.key)||q(t.wr,e.wr)}static Ar(t,e){return q(t.wr,e.wr)||M.comparator(t.key,e.key)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Af{constructor(t,e){this.indexManager=t,this.referenceDelegate=e,this.mutationQueue=[],this.Sr=1,this.br=new X(dt.Er)}checkEmpty(t){return A.resolve(this.mutationQueue.length===0)}addMutationBatch(t,e,n,i){const s=this.Sr;this.Sr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const a=new Bs(s,e,n,i);this.mutationQueue.push(a);for(const u of i)this.br=this.br.add(new dt(u.key,s)),this.indexManager.addToCollectionParentIndex(t,u.key.path.popLast());return A.resolve(a)}lookupMutationBatch(t,e){return A.resolve(this.Dr(e))}getNextMutationBatchAfterBatchId(t,e){const n=e+1,i=this.vr(n),s=i<0?0:i;return A.resolve(this.mutationQueue.length>s?this.mutationQueue[s]:null)}getHighestUnacknowledgedBatchId(){return A.resolve(this.mutationQueue.length===0?-1:this.Sr-1)}getAllMutationBatches(t){return A.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(t,e){const n=new dt(e,0),i=new dt(e,Number.POSITIVE_INFINITY),s=[];return this.br.forEachInRange([n,i],a=>{const u=this.Dr(a.wr);s.push(u)}),A.resolve(s)}getAllMutationBatchesAffectingDocumentKeys(t,e){let n=new X(q);return e.forEach(i=>{const s=new dt(i,0),a=new dt(i,Number.POSITIVE_INFINITY);this.br.forEachInRange([s,a],u=>{n=n.add(u.wr)})}),A.resolve(this.Cr(n))}getAllMutationBatchesAffectingQuery(t,e){const n=e.path,i=n.length+1;let s=n;M.isDocumentKey(s)||(s=s.child(""));const a=new dt(new M(s),0);let u=new X(q);return this.br.forEachWhile(c=>{const d=c.key.path;return!!n.isPrefixOf(d)&&(d.length===i&&(u=u.add(c.wr)),!0)},a),A.resolve(this.Cr(u))}Cr(t){const e=[];return t.forEach(n=>{const i=this.Dr(n);i!==null&&e.push(i)}),e}removeMutationBatch(t,e){L(this.Fr(e.batchId,"removed")===0),this.mutationQueue.shift();let n=this.br;return A.forEach(e.mutations,i=>{const s=new dt(i.key,e.batchId);return n=n.delete(s),this.referenceDelegate.markPotentiallyOrphaned(t,i.key)}).next(()=>{this.br=n})}On(t){}containsKey(t,e){const n=new dt(e,0),i=this.br.firstAfterOrEqual(n);return A.resolve(e.isEqual(i&&i.key))}performConsistencyCheck(t){return this.mutationQueue.length,A.resolve()}Fr(t,e){return this.vr(t)}vr(t){return this.mutationQueue.length===0?0:t-this.mutationQueue[0].batchId}Dr(t){const e=this.vr(t);return e<0||e>=this.mutationQueue.length?null:this.mutationQueue[e]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rf{constructor(t){this.Mr=t,this.docs=function(){return new et(M.comparator)}(),this.size=0}setIndexManager(t){this.indexManager=t}addEntry(t,e){const n=e.key,i=this.docs.get(n),s=i?i.size:0,a=this.Mr(e);return this.docs=this.docs.insert(n,{document:e.mutableCopy(),size:a}),this.size+=a-s,this.indexManager.addToCollectionParentIndex(t,n.path.popLast())}removeEntry(t){const e=this.docs.get(t);e&&(this.docs=this.docs.remove(t),this.size-=e.size)}getEntry(t,e){const n=this.docs.get(e);return A.resolve(n?n.document.mutableCopy():at.newInvalidDocument(e))}getEntries(t,e){let n=Dt();return e.forEach(i=>{const s=this.docs.get(i);n=n.insert(i,s?s.document.mutableCopy():at.newInvalidDocument(i))}),A.resolve(n)}getDocumentsMatchingQuery(t,e,n,i){let s=Dt();const a=e.path,u=new M(a.child("")),c=this.docs.getIteratorFrom(u);for(;c.hasNext();){const{key:d,value:{document:f}}=c.getNext();if(!a.isPrefixOf(d.path))break;d.path.length>a.length+1||xs(Hu(f),n)<=0||(i.has(f.key)||ur(e,f))&&(s=s.insert(f.key,f.mutableCopy()))}return A.resolve(s)}getAllFromCollectionGroup(t,e,n,i){O()}Or(t,e){return A.forEach(this.docs,n=>e(n))}newChangeBuffer(t){return new Vf(this)}getSize(t){return A.resolve(this.size)}}class Vf extends Zl{constructor(t){super(),this.cr=t}applyChanges(t){const e=[];return this.changes.forEach((n,i)=>{i.isValidDocument()?e.push(this.cr.addEntry(t,i)):this.cr.removeEntry(n)}),A.waitFor(e)}getFromCache(t,e){return this.cr.getEntry(t,e)}getAllFromCache(t,e){return this.cr.getEntries(t,e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pf{constructor(t){this.persistence=t,this.Nr=new me(e=>De(e),or),this.lastRemoteSnapshotVersion=B.min(),this.highestTargetId=0,this.Lr=0,this.Br=new Qs,this.targetCount=0,this.kr=Me.Bn()}forEachTarget(t,e){return this.Nr.forEach((n,i)=>e(i)),A.resolve()}getLastRemoteSnapshotVersion(t){return A.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(t){return A.resolve(this.Lr)}allocateTargetId(t){return this.highestTargetId=this.kr.next(),A.resolve(this.highestTargetId)}setTargetsMetadata(t,e,n){return n&&(this.lastRemoteSnapshotVersion=n),e>this.Lr&&(this.Lr=e),A.resolve()}Kn(t){this.Nr.set(t.target,t);const e=t.targetId;e>this.highestTargetId&&(this.kr=new Me(e),this.highestTargetId=e),t.sequenceNumber>this.Lr&&(this.Lr=t.sequenceNumber)}addTargetData(t,e){return this.Kn(e),this.targetCount+=1,A.resolve()}updateTargetData(t,e){return this.Kn(e),A.resolve()}removeTargetData(t,e){return this.Nr.delete(e.target),this.Br.gr(e.targetId),this.targetCount-=1,A.resolve()}removeTargets(t,e,n){let i=0;const s=[];return this.Nr.forEach((a,u)=>{u.sequenceNumber<=e&&n.get(u.targetId)===null&&(this.Nr.delete(a),s.push(this.removeMatchingKeysForTargetId(t,u.targetId)),i++)}),A.waitFor(s).next(()=>i)}getTargetCount(t){return A.resolve(this.targetCount)}getTargetData(t,e){const n=this.Nr.get(e)||null;return A.resolve(n)}addMatchingKeys(t,e,n){return this.Br.Rr(e,n),A.resolve()}removeMatchingKeys(t,e,n){this.Br.mr(e,n);const i=this.persistence.referenceDelegate,s=[];return i&&e.forEach(a=>{s.push(i.markPotentiallyOrphaned(t,a))}),A.waitFor(s)}removeMatchingKeysForTargetId(t,e){return this.Br.gr(e),A.resolve()}getMatchingKeysForTargetId(t,e){const n=this.Br.yr(e);return A.resolve(n)}containsKey(t,e){return A.resolve(this.Br.containsKey(e))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nc{constructor(t,e){this.qr={},this.overlays={},this.Qr=new bt(0),this.Kr=!1,this.Kr=!0,this.$r=new wf,this.referenceDelegate=t(this),this.Ur=new Pf(this),this.indexManager=new cf,this.remoteDocumentCache=function(i){return new Rf(i)}(n=>this.referenceDelegate.Wr(n)),this.serializer=new zl(e),this.Gr=new Ef(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.Kr=!1,Promise.resolve()}get started(){return this.Kr}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(t){return this.indexManager}getDocumentOverlayCache(t){let e=this.overlays[t.toKey()];return e||(e=new vf,this.overlays[t.toKey()]=e),e}getMutationQueue(t,e){let n=this.qr[t.toKey()];return n||(n=new Af(e,this.referenceDelegate),this.qr[t.toKey()]=n),n}getGlobalsCache(){return this.$r}getTargetCache(){return this.Ur}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Gr}runTransaction(t,e,n){b("MemoryPersistence","Starting transaction:",t);const i=new Sf(this.Qr.next());return this.referenceDelegate.zr(),n(i).next(s=>this.referenceDelegate.jr(i).next(()=>s)).toPromise().then(s=>(i.raiseOnCommittedEvent(),s))}Hr(t,e){return A.or(Object.values(this.qr).map(n=>()=>n.containsKey(t,e)))}}class Sf extends Yu{constructor(t){super(),this.currentSequenceNumber=t}}class Ii{constructor(t){this.persistence=t,this.Jr=new Qs,this.Yr=null}static Zr(t){return new Ii(t)}get Xr(){if(this.Yr)return this.Yr;throw O()}addReference(t,e,n){return this.Jr.addReference(n,e),this.Xr.delete(n.toString()),A.resolve()}removeReference(t,e,n){return this.Jr.removeReference(n,e),this.Xr.add(n.toString()),A.resolve()}markPotentiallyOrphaned(t,e){return this.Xr.add(e.toString()),A.resolve()}removeTarget(t,e){this.Jr.gr(e.targetId).forEach(i=>this.Xr.add(i.toString()));const n=this.persistence.getTargetCache();return n.getMatchingKeysForTargetId(t,e.targetId).next(i=>{i.forEach(s=>this.Xr.add(s.toString()))}).next(()=>n.removeTargetData(t,e))}zr(){this.Yr=new Set}jr(t){const e=this.persistence.getRemoteDocumentCache().newChangeBuffer();return A.forEach(this.Xr,n=>{const i=M.fromPath(n);return this.ei(t,i).next(s=>{s||e.removeEntry(i,B.min())})}).next(()=>(this.Yr=null,e.apply(t)))}updateLimboDocument(t,e){return this.ei(t,e).next(n=>{n?this.Xr.delete(e.toString()):this.Xr.add(e.toString())})}Wr(t){return 0}ei(t,e){return A.or([()=>A.resolve(this.Jr.containsKey(e)),()=>this.persistence.getTargetCache().containsKey(t,e),()=>this.persistence.Hr(t,e)])}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bf{constructor(t){this.serializer=t}O(t,e,n,i){const s=new ci("createOrUpgrade",e);n<1&&i>=1&&(function(c){c.createObjectStore("owner")}(t),function(c){c.createObjectStore("mutationQueues",{keyPath:"userId"}),c.createObjectStore("mutations",{keyPath:"batchId",autoIncrement:!0}).createIndex("userMutationsIndex",Na,{unique:!0}),c.createObjectStore("documentMutations")}(t),Tu(t),function(c){c.createObjectStore("remoteDocuments")}(t));let a=A.resolve();return n<3&&i>=3&&(n!==0&&(function(c){c.deleteObjectStore("targetDocuments"),c.deleteObjectStore("targets"),c.deleteObjectStore("targetGlobal")}(t),Tu(t)),a=a.next(()=>function(c){const d=c.store("targetGlobal"),f={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:B.min().toTimestamp(),targetCount:0};return d.put("targetGlobalKey",f)}(s))),n<4&&i>=4&&(n!==0&&(a=a.next(()=>function(c,d){return d.store("mutations").U().next(f=>{c.deleteObjectStore("mutations"),c.createObjectStore("mutations",{keyPath:"batchId",autoIncrement:!0}).createIndex("userMutationsIndex",Na,{unique:!0});const g=d.store("mutations"),I=f.map(V=>g.put(V));return A.waitFor(I)})}(t,s))),a=a.next(()=>{(function(c){c.createObjectStore("clientMetadata",{keyPath:"clientId"})})(t)})),n<5&&i>=5&&(a=a.next(()=>this.ni(s))),n<6&&i>=6&&(a=a.next(()=>(function(c){c.createObjectStore("remoteDocumentGlobal")}(t),this.ri(s)))),n<7&&i>=7&&(a=a.next(()=>this.ii(s))),n<8&&i>=8&&(a=a.next(()=>this.si(t,s))),n<9&&i>=9&&(a=a.next(()=>{(function(c){c.objectStoreNames.contains("remoteDocumentChanges")&&c.deleteObjectStore("remoteDocumentChanges")})(t)})),n<10&&i>=10&&(a=a.next(()=>this.oi(s))),n<11&&i>=11&&(a=a.next(()=>{(function(c){c.createObjectStore("bundles",{keyPath:"bundleId"})})(t),function(c){c.createObjectStore("namedQueries",{keyPath:"name"})}(t)})),n<12&&i>=12&&(a=a.next(()=>{(function(c){const d=c.createObjectStore("documentOverlays",{keyPath:sd});d.createIndex("collectionPathOverlayIndex",od,{unique:!1}),d.createIndex("collectionGroupOverlayIndex",ad,{unique:!1})})(t)})),n<13&&i>=13&&(a=a.next(()=>function(c){const d=c.createObjectStore("remoteDocumentsV14",{keyPath:Wh});d.createIndex("documentKeyIndex",Hh),d.createIndex("collectionGroupIndex",Jh)}(t)).next(()=>this._i(t,s)).next(()=>t.deleteObjectStore("remoteDocuments"))),n<14&&i>=14&&(a=a.next(()=>this.ai(t,s))),n<15&&i>=15&&(a=a.next(()=>function(c){c.createObjectStore("indexConfiguration",{keyPath:"indexId",autoIncrement:!0}).createIndex("collectionGroupIndex","collectionGroup",{unique:!1}),c.createObjectStore("indexState",{keyPath:ed}).createIndex("sequenceNumberIndex",nd,{unique:!1}),c.createObjectStore("indexEntries",{keyPath:rd}).createIndex("documentKeyIndex",id,{unique:!1})}(t))),n<16&&i>=16&&(a=a.next(()=>{e.objectStore("indexState").clear()}).next(()=>{e.objectStore("indexEntries").clear()})),n<17&&i>=17&&(a=a.next(()=>{(function(c){c.createObjectStore("globals",{keyPath:"name"})})(t)})),a}ri(t){let e=0;return t.store("remoteDocuments").J((n,i)=>{e+=ri(i)}).next(()=>{const n={byteSize:e};return t.store("remoteDocumentGlobal").put("remoteDocumentGlobalKey",n)})}ni(t){const e=t.store("mutationQueues"),n=t.store("mutations");return e.U().next(i=>A.forEach(i,s=>{const a=IDBKeyRange.bound([s.userId,-1],[s.userId,s.lastAcknowledgedBatchId]);return n.U("userMutationsIndex",a).next(u=>A.forEach(u,c=>{L(c.userId===s.userId);const d=we(this.serializer,c);return Jl(t,s.userId,d).next(()=>{})}))}))}ii(t){const e=t.store("targetDocuments"),n=t.store("remoteDocuments");return t.store("targetGlobal").get("targetGlobalKey").next(i=>{const s=[];return n.J((a,u)=>{const c=new J(a),d=function(g){return[0,Vt(g)]}(c);s.push(e.get(d).next(f=>f?A.resolve():(g=>e.put({targetId:0,path:Vt(g),sequenceNumber:i.highestListenSequenceNumber}))(c)))}).next(()=>A.waitFor(s))})}si(t,e){t.createObjectStore("collectionParents",{keyPath:td});const n=e.store("collectionParents"),i=new zs,s=a=>{if(i.add(a)){const u=a.lastSegment(),c=a.popLast();return n.put({collectionId:u,parent:Vt(c)})}};return e.store("remoteDocuments").J({H:!0},(a,u)=>{const c=new J(a);return s(c.popLast())}).next(()=>e.store("documentMutations").J({H:!0},([a,u,c],d)=>{const f=Bt(u);return s(f.popLast())}))}oi(t){const e=t.store("targets");return e.J((n,i)=>{const s=Kn(i),a=Ql(this.serializer,s);return e.put(a)})}_i(t,e){const n=e.store("remoteDocuments"),i=[];return n.J((s,a)=>{const u=e.store("remoteDocumentsV14"),c=function(g){return g.document?new M(J.fromString(g.document.name).popFirst(5)):g.noDocument?M.fromSegments(g.noDocument.path):g.unknownDocument?M.fromSegments(g.unknownDocument.path):O()}(a).path.toArray(),d={prefixPath:c.slice(0,c.length-2),collectionGroup:c[c.length-2],documentId:c[c.length-1],readTime:a.readTime||[0,0],unknownDocument:a.unknownDocument,noDocument:a.noDocument,document:a.document,hasCommittedMutations:!!a.hasCommittedMutations};i.push(u.put(d))}).next(()=>A.waitFor(i))}ai(t,e){const n=e.store("mutations"),i=tc(this.serializer),s=new nc(Ii.Zr,this.serializer.ct);return n.U().next(a=>{const u=new Map;return a.forEach(c=>{var d;let f=(d=u.get(c.userId))!==null&&d!==void 0?d:K();we(this.serializer,c).keys().forEach(g=>f=f.add(g)),u.set(c.userId,f)}),A.forEach(u,(c,d)=>{const f=new Et(d),g=_i.lt(this.serializer,f),I=s.getIndexManager(f),V=yi.lt(f,this.serializer,I,s.referenceDelegate);return new ec(i,V,g,I).recalculateAndSaveOverlaysForDocumentKeys(new ls(e,bt.oe),c).next()})})}}function Tu(r){r.createObjectStore("targetDocuments",{keyPath:Xh}).createIndex("documentTargetsIndex",Zh,{unique:!0}),r.createObjectStore("targets",{keyPath:"targetId"}).createIndex("queryTargetsIndex",Yh,{unique:!0}),r.createObjectStore("targetGlobal")}const es="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.";class $s{constructor(t,e,n,i,s,a,u,c,d,f,g=17){if(this.allowTabSynchronization=t,this.persistenceKey=e,this.clientId=n,this.ui=s,this.window=a,this.document=u,this.ci=d,this.li=f,this.hi=g,this.Qr=null,this.Kr=!1,this.isPrimary=!1,this.networkEnabled=!0,this.Pi=null,this.inForeground=!1,this.Ii=null,this.Ti=null,this.Ei=Number.NEGATIVE_INFINITY,this.di=I=>Promise.resolve(),!$s.D())throw new C(S.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new _f(this,i),this.Ai=e+"main",this.serializer=new zl(c),this.Ri=new se(this.Ai,this.hi,new bf(this.serializer)),this.$r=new rf,this.Ur=new df(this.referenceDelegate,this.serializer),this.remoteDocumentCache=tc(this.serializer),this.Gr=new nf,this.window&&this.window.localStorage?this.Vi=this.window.localStorage:(this.Vi=null,f===!1&&ut("IndexedDbPersistence","LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.mi().then(()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new C(S.FAILED_PRECONDITION,es);return this.fi(),this.gi(),this.pi(),this.runTransaction("getHighestListenSequenceNumber","readonly",t=>this.Ur.getHighestSequenceNumber(t))}).then(t=>{this.Qr=new bt(t,this.ci)}).then(()=>{this.Kr=!0}).catch(t=>(this.Ri&&this.Ri.close(),Promise.reject(t)))}yi(t){return this.di=async e=>{if(this.started)return t(e)},t(this.isPrimary)}setDatabaseDeletedListener(t){this.Ri.L(async e=>{e.newVersion===null&&await t()})}setNetworkEnabled(t){this.networkEnabled!==t&&(this.networkEnabled=t,this.ui.enqueueAndForget(async()=>{this.started&&await this.mi()}))}mi(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",t=>Lr(t).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next(()=>{if(this.isPrimary)return this.wi(t).next(e=>{e||(this.isPrimary=!1,this.ui.enqueueRetryable(()=>this.di(!1)))})}).next(()=>this.Si(t)).next(e=>this.isPrimary&&!e?this.bi(t).next(()=>!1):!!e&&this.Di(t).next(()=>!0))).catch(t=>{if(de(t))return b("IndexedDbPersistence","Failed to extend owner lease: ",t),this.isPrimary;if(!this.allowTabSynchronization)throw t;return b("IndexedDbPersistence","Releasing owner lease after error during lease refresh",t),!1}).then(t=>{this.isPrimary!==t&&this.ui.enqueueRetryable(()=>this.di(t)),this.isPrimary=t})}wi(t){return Un(t).get("owner").next(e=>A.resolve(this.vi(e)))}Ci(t){return Lr(t).delete(this.clientId)}async Fi(){if(this.isPrimary&&!this.Mi(this.Ei,18e5)){this.Ei=Date.now();const t=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",e=>{const n=ht(e,"clientMetadata");return n.U().next(i=>{const s=this.xi(i,18e5),a=i.filter(u=>s.indexOf(u)===-1);return A.forEach(a,u=>n.delete(u.clientId)).next(()=>a)})}).catch(()=>[]);if(this.Vi)for(const e of t)this.Vi.removeItem(this.Oi(e.clientId))}}pi(){this.Ti=this.ui.enqueueAfterDelay("client_metadata_refresh",4e3,()=>this.mi().then(()=>this.Fi()).then(()=>this.pi()))}vi(t){return!!t&&t.ownerId===this.clientId}Si(t){return this.li?A.resolve(!0):Un(t).get("owner").next(e=>{if(e!==null&&this.Mi(e.leaseTimestampMs,5e3)&&!this.Ni(e.ownerId)){if(this.vi(e)&&this.networkEnabled)return!0;if(!this.vi(e)){if(!e.allowTabSynchronization)throw new C(S.FAILED_PRECONDITION,es);return!1}}return!(!this.networkEnabled||!this.inForeground)||Lr(t).U().next(n=>this.xi(n,5e3).find(i=>{if(this.clientId!==i.clientId){const s=!this.networkEnabled&&i.networkEnabled,a=!this.inForeground&&i.inForeground,u=this.networkEnabled===i.networkEnabled;if(s||a&&u)return!0}return!1})===void 0)}).next(e=>(this.isPrimary!==e&&b("IndexedDbPersistence",`Client ${e?"is":"is not"} eligible for a primary lease.`),e))}async shutdown(){this.Kr=!1,this.Li(),this.Ti&&(this.Ti.cancel(),this.Ti=null),this.Bi(),this.ki(),await this.Ri.runTransaction("shutdown","readwrite",["owner","clientMetadata"],t=>{const e=new ls(t,bt.oe);return this.bi(e).next(()=>this.Ci(e))}),this.Ri.close(),this.qi()}xi(t,e){return t.filter(n=>this.Mi(n.updateTimeMs,e)&&!this.Ni(n.clientId))}Qi(){return this.runTransaction("getActiveClients","readonly",t=>Lr(t).U().next(e=>this.xi(e,18e5).map(n=>n.clientId)))}get started(){return this.Kr}getGlobalsCache(){return this.$r}getMutationQueue(t,e){return yi.lt(t,this.serializer,e,this.referenceDelegate)}getTargetCache(){return this.Ur}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(t){return new hf(t,this.serializer.ct.databaseId)}getDocumentOverlayCache(t){return _i.lt(this.serializer,t)}getBundleCache(){return this.Gr}runTransaction(t,e,n){b("IndexedDbPersistence","Starting transaction:",t);const i=e==="readonly"?"readonly":"readwrite",s=function(c){return c===17?cd:c===16?ld:c===15?Ns:c===14?rl:c===13?nl:c===12?ud:c===11?el:void O()}(this.hi);let a;return this.Ri.runTransaction(t,i,s,u=>(a=new ls(u,this.Qr?this.Qr.next():bt.oe),e==="readwrite-primary"?this.wi(a).next(c=>!!c||this.Si(a)).next(c=>{if(!c)throw ut(`Failed to obtain primary lease for action '${t}'.`),this.isPrimary=!1,this.ui.enqueueRetryable(()=>this.di(!1)),new C(S.FAILED_PRECONDITION,Ju);return n(a)}).next(c=>this.Di(a).next(()=>c)):this.Ki(a).next(()=>n(a)))).then(u=>(a.raiseOnCommittedEvent(),u))}Ki(t){return Un(t).get("owner").next(e=>{if(e!==null&&this.Mi(e.leaseTimestampMs,5e3)&&!this.Ni(e.ownerId)&&!this.vi(e)&&!(this.li||this.allowTabSynchronization&&e.allowTabSynchronization))throw new C(S.FAILED_PRECONDITION,es)})}Di(t){const e={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return Un(t).put("owner",e)}static D(){return se.D()}bi(t){const e=Un(t);return e.get("owner").next(n=>this.vi(n)?(b("IndexedDbPersistence","Releasing primary lease."),e.delete("owner")):A.resolve())}Mi(t,e){const n=Date.now();return!(t<n-e)&&(!(t>n)||(ut(`Detected an update time that is in the future: ${t} > ${n}`),!1))}fi(){this.document!==null&&typeof this.document.addEventListener=="function"&&(this.Ii=()=>{this.ui.enqueueAndForget(()=>(this.inForeground=this.document.visibilityState==="visible",this.mi()))},this.document.addEventListener("visibilitychange",this.Ii),this.inForeground=this.document.visibilityState==="visible")}Bi(){this.Ii&&(this.document.removeEventListener("visibilitychange",this.Ii),this.Ii=null)}gi(){var t;typeof((t=this.window)===null||t===void 0?void 0:t.addEventListener)=="function"&&(this.Pi=()=>{this.Li();const e=/(?:Version|Mobile)\/1[456]/;Bu()&&(navigator.appVersion.match(e)||navigator.userAgent.match(e))&&this.ui.enterRestrictedMode(!0),this.ui.enqueueAndForget(()=>this.shutdown())},this.window.addEventListener("pagehide",this.Pi))}ki(){this.Pi&&(this.window.removeEventListener("pagehide",this.Pi),this.Pi=null)}Ni(t){var e;try{const n=((e=this.Vi)===null||e===void 0?void 0:e.getItem(this.Oi(t)))!==null;return b("IndexedDbPersistence",`Client '${t}' ${n?"is":"is not"} zombied in LocalStorage`),n}catch(n){return ut("IndexedDbPersistence","Failed to get zombied client id.",n),!1}}Li(){if(this.Vi)try{this.Vi.setItem(this.Oi(this.clientId),String(Date.now()))}catch(t){ut("Failed to set zombie client id.",t)}}qi(){if(this.Vi)try{this.Vi.removeItem(this.Oi(this.clientId))}catch{}}Oi(t){return`firestore_zombie_${this.persistenceKey}_${t}`}}function Un(r){return ht(r,"owner")}function Lr(r){return ht(r,"clientMetadata")}function rc(r,t){let e=r.projectId;return r.isDefaultDatabase||(e+="."+r.database),"firestore/"+t+"/"+e+"/"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ws{constructor(t,e,n,i){this.targetId=t,this.fromCache=e,this.$i=n,this.Ui=i}static Wi(t,e){let n=K(),i=K();for(const s of e.docChanges)switch(s.type){case 0:n=n.add(s.doc.key);break;case 1:i=i.add(s.doc.key)}return new Ws(t,e.fromCache,n,i)}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cf{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(t){this._documentReadCount+=t}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ic{constructor(){this.Gi=!1,this.zi=!1,this.ji=100,this.Hi=function(){return Bu()?8:Xu(Hr())>0?6:4}()}initialize(t,e){this.Ji=t,this.indexManager=e,this.Gi=!0}getDocumentsMatchingQuery(t,e,n,i){const s={result:null};return this.Yi(t,e).next(a=>{s.result=a}).next(()=>{if(!s.result)return this.Zi(t,e,i,n).next(a=>{s.result=a})}).next(()=>{if(s.result)return;const a=new Cf;return this.Xi(t,e,a).next(u=>{if(s.result=u,this.zi)return this.es(t,e,a,u.size)})}).next(()=>s.result)}es(t,e,n,i){return n.documentReadCount<this.ji?(Qe()<=Qt.DEBUG&&b("QueryEngine","SDK will not create cache indexes for query:",$e(e),"since it only creates cache indexes for collection contains","more than or equal to",this.ji,"documents"),A.resolve()):(Qe()<=Qt.DEBUG&&b("QueryEngine","Query:",$e(e),"scans",n.documentReadCount,"local documents and returns",i,"documents as results."),n.documentReadCount>this.Hi*i?(Qe()<=Qt.DEBUG&&b("QueryEngine","The SDK decides to create cache indexes for query:",$e(e),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(t,Nt(e))):A.resolve())}Yi(t,e){if(Qa(e))return A.resolve(null);let n=Nt(e);return this.indexManager.getIndexType(t,n).next(i=>i===0?null:(e.limit!==null&&i===1&&(e=ps(e,null,"F"),n=Nt(e)),this.indexManager.getDocumentsMatchingTarget(t,n).next(s=>{const a=K(...s);return this.Ji.getDocuments(t,a).next(u=>this.indexManager.getMinOffset(t,n).next(c=>{const d=this.ts(e,u);return this.ns(e,d,a,c.readTime)?this.Yi(t,ps(e,null,"F")):this.rs(t,d,e,c)}))})))}Zi(t,e,n,i){return Qa(e)||i.isEqual(B.min())?A.resolve(null):this.Ji.getDocuments(t,n).next(s=>{const a=this.ts(e,s);return this.ns(e,a,n,i)?A.resolve(null):(Qe()<=Qt.DEBUG&&b("QueryEngine","Re-using previous result from %s to execute query: %s",i.toString(),$e(e)),this.rs(t,a,e,Wu(i,-1)).next(u=>u))})}ts(t,e){let n=new X(Il(t));return e.forEach((i,s)=>{ur(t,s)&&(n=n.add(s))}),n}ns(t,e,n,i){if(t.limit===null)return!1;if(n.size!==e.size)return!0;const s=t.limitType==="F"?e.last():e.first();return!!s&&(s.hasPendingWrites||s.version.compareTo(i)>0)}Xi(t,e,n){return Qe()<=Qt.DEBUG&&b("QueryEngine","Using full collection scan to execute query:",$e(e)),this.Ji.getDocumentsMatchingQuery(t,e,Mt.min(),n)}rs(t,e,n,i){return this.Ji.getDocumentsMatchingQuery(t,n,i).next(s=>(e.forEach(a=>{s=s.insert(a.key,a)}),s))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xf{constructor(t,e,n,i){this.persistence=t,this.ss=e,this.serializer=i,this.os=new et(q),this._s=new me(s=>De(s),or),this.us=new Map,this.cs=t.getRemoteDocumentCache(),this.Ur=t.getTargetCache(),this.Gr=t.getBundleCache(),this.ls(n)}ls(t){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(t),this.indexManager=this.persistence.getIndexManager(t),this.mutationQueue=this.persistence.getMutationQueue(t,this.indexManager),this.localDocuments=new ec(this.cs,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.cs.setIndexManager(this.indexManager),this.ss.initialize(this.localDocuments,this.indexManager)}collectGarbage(t){return this.persistence.runTransaction("Collect garbage","readwrite-primary",e=>t.collect(e,this.os))}}function sc(r,t,e,n){return new xf(r,t,e,n)}async function oc(r,t){const e=F(r);return await e.persistence.runTransaction("Handle user change","readonly",n=>{let i;return e.mutationQueue.getAllMutationBatches(n).next(s=>(i=s,e.ls(t),e.mutationQueue.getAllMutationBatches(n))).next(s=>{const a=[],u=[];let c=K();for(const d of i){a.push(d.batchId);for(const f of d.mutations)c=c.add(f.key)}for(const d of s){u.push(d.batchId);for(const f of d.mutations)c=c.add(f.key)}return e.localDocuments.getDocuments(n,c).next(d=>({hs:d,removedBatchIds:a,addedBatchIds:u}))})})}function Df(r,t){const e=F(r);return e.persistence.runTransaction("Acknowledge batch","readwrite-primary",n=>{const i=t.batch.keys(),s=e.cs.newChangeBuffer({trackRemovals:!0});return function(u,c,d,f){const g=d.batch,I=g.keys();let V=A.resolve();return I.forEach(x=>{V=V.next(()=>f.getEntry(c,x)).next(N=>{const D=d.docVersions.get(x);L(D!==null),N.version.compareTo(D)<0&&(g.applyToRemoteDocument(N,d),N.isValidDocument()&&(N.setReadTime(d.commitVersion),f.addEntry(N)))})}),V.next(()=>u.mutationQueue.removeMutationBatch(c,g))}(e,n,t,s).next(()=>s.apply(n)).next(()=>e.mutationQueue.performConsistencyCheck(n)).next(()=>e.documentOverlayCache.removeOverlaysForBatchId(n,i,t.batch.batchId)).next(()=>e.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(n,function(u){let c=K();for(let d=0;d<u.mutationResults.length;++d)u.mutationResults[d].transformResults.length>0&&(c=c.add(u.batch.mutations[d].key));return c}(t))).next(()=>e.localDocuments.getDocuments(n,i))})}function ac(r){const t=F(r);return t.persistence.runTransaction("Get last remote snapshot version","readonly",e=>t.Ur.getLastRemoteSnapshotVersion(e))}function Nf(r,t){const e=F(r),n=t.snapshotVersion;let i=e.os;return e.persistence.runTransaction("Apply remote event","readwrite-primary",s=>{const a=e.cs.newChangeBuffer({trackRemovals:!0});i=e.os;const u=[];t.targetChanges.forEach((f,g)=>{const I=i.get(g);if(!I)return;u.push(e.Ur.removeMatchingKeys(s,f.removedDocuments,g).next(()=>e.Ur.addMatchingKeys(s,f.addedDocuments,g)));let V=I.withSequenceNumber(s.currentSequenceNumber);t.targetMismatches.get(g)!==null?V=V.withResumeToken(lt.EMPTY_BYTE_STRING,B.min()).withLastLimboFreeSnapshotVersion(B.min()):f.resumeToken.approximateByteSize()>0&&(V=V.withResumeToken(f.resumeToken,n)),i=i.insert(g,V),function(N,D,j){return N.resumeToken.approximateByteSize()===0||D.snapshotVersion.toMicroseconds()-N.snapshotVersion.toMicroseconds()>=3e8?!0:j.addedDocuments.size+j.modifiedDocuments.size+j.removedDocuments.size>0}(I,V,f)&&u.push(e.Ur.updateTargetData(s,V))});let c=Dt(),d=K();if(t.documentUpdates.forEach(f=>{t.resolvedLimboDocuments.has(f)&&u.push(e.persistence.referenceDelegate.updateLimboDocument(s,f))}),u.push(kf(s,a,t.documentUpdates).next(f=>{c=f.Ps,d=f.Is})),!n.isEqual(B.min())){const f=e.Ur.getLastRemoteSnapshotVersion(s).next(g=>e.Ur.setTargetsMetadata(s,s.currentSequenceNumber,n));u.push(f)}return A.waitFor(u).next(()=>a.apply(s)).next(()=>e.localDocuments.getLocalViewOfDocuments(s,c,d)).next(()=>c)}).then(s=>(e.os=i,s))}function kf(r,t,e){let n=K(),i=K();return e.forEach(s=>n=n.add(s)),t.getEntries(r,n).next(s=>{let a=Dt();return e.forEach((u,c)=>{const d=s.get(u);c.isFoundDocument()!==d.isFoundDocument()&&(i=i.add(u)),c.isNoDocument()&&c.version.isEqual(B.min())?(t.removeEntry(u,c.readTime),a=a.insert(u,c)):!d.isValidDocument()||c.version.compareTo(d.version)>0||c.version.compareTo(d.version)===0&&d.hasPendingWrites?(t.addEntry(c),a=a.insert(u,c)):b("LocalStore","Ignoring outdated watch update for ",u,". Current version:",d.version," Watch version:",c.version)}),{Ps:a,Is:i}})}function Mf(r,t){const e=F(r);return e.persistence.runTransaction("Get next mutation batch","readonly",n=>(t===void 0&&(t=-1),e.mutationQueue.getNextMutationBatchAfterBatchId(n,t)))}function ii(r,t){const e=F(r);return e.persistence.runTransaction("Allocate target","readwrite",n=>{let i;return e.Ur.getTargetData(n,t).next(s=>s?(i=s,A.resolve(i)):e.Ur.allocateTargetId(n).next(a=>(i=new $t(t,a,"TargetPurposeListen",n.currentSequenceNumber),e.Ur.addTargetData(n,i).next(()=>i))))}).then(n=>{const i=e.os.get(n.targetId);return(i===null||n.snapshotVersion.compareTo(i.snapshotVersion)>0)&&(e.os=e.os.insert(n.targetId,n),e._s.set(t,n.targetId)),n})}async function an(r,t,e){const n=F(r),i=n.os.get(t),s=e?"readwrite":"readwrite-primary";try{e||await n.persistence.runTransaction("Release target",s,a=>n.persistence.referenceDelegate.removeTarget(a,i))}catch(a){if(!de(a))throw a;b("LocalStore",`Failed to update sequence numbers for target ${t}: ${a}`)}n.os=n.os.remove(t),n._s.delete(i.target)}function As(r,t,e){const n=F(r);let i=B.min(),s=K();return n.persistence.runTransaction("Execute query","readwrite",a=>function(c,d,f){const g=F(c),I=g._s.get(f);return I!==void 0?A.resolve(g.os.get(I)):g.Ur.getTargetData(d,f)}(n,a,Nt(t)).next(u=>{if(u)return i=u.lastLimboFreeSnapshotVersion,n.Ur.getMatchingKeysForTargetId(a,u.targetId).next(c=>{s=c})}).next(()=>n.ss.getDocumentsMatchingQuery(a,t,e?i:B.min(),e?s:K())).next(u=>(cc(n,yl(t),u),{documents:u,Ts:s})))}function uc(r,t){const e=F(r),n=F(e.Ur),i=e.os.get(t);return i?Promise.resolve(i.target):e.persistence.runTransaction("Get target data","readonly",s=>n.ot(s,t).next(a=>a?a.target:null))}function lc(r,t){const e=F(r),n=e.us.get(t)||B.min();return e.persistence.runTransaction("Get new document changes","readonly",i=>e.cs.getAllFromCollectionGroup(i,t,Wu(n,-1),Number.MAX_SAFE_INTEGER)).then(i=>(cc(e,t,i),i))}function cc(r,t,e){let n=r.us.get(t)||B.min();e.forEach((i,s)=>{s.readTime.compareTo(n)>0&&(n=s.readTime)}),r.us.set(t,n)}function Eu(r,t){return`firestore_clients_${r}_${t}`}function vu(r,t,e){let n=`firestore_mutations_${r}_${e}`;return t.isAuthenticated()&&(n+=`_${t.uid}`),n}function ns(r,t){return`firestore_targets_${r}_${t}`}class si{constructor(t,e,n,i){this.user=t,this.batchId=e,this.state=n,this.error=i}static Rs(t,e,n){const i=JSON.parse(n);let s,a=typeof i=="object"&&["pending","acknowledged","rejected"].indexOf(i.state)!==-1&&(i.error===void 0||typeof i.error=="object");return a&&i.error&&(a=typeof i.error.message=="string"&&typeof i.error.code=="string",a&&(s=new C(i.error.code,i.error.message))),a?new si(t,e,i.state,s):(ut("SharedClientState",`Failed to parse mutation state for ID '${e}': ${n}`),null)}Vs(){const t={state:this.state,updateTimeMs:Date.now()};return this.error&&(t.error={code:this.error.code,message:this.error.message}),JSON.stringify(t)}}class Hn{constructor(t,e,n){this.targetId=t,this.state=e,this.error=n}static Rs(t,e){const n=JSON.parse(e);let i,s=typeof n=="object"&&["not-current","current","rejected"].indexOf(n.state)!==-1&&(n.error===void 0||typeof n.error=="object");return s&&n.error&&(s=typeof n.error.message=="string"&&typeof n.error.code=="string",s&&(i=new C(n.error.code,n.error.message))),s?new Hn(t,n.state,i):(ut("SharedClientState",`Failed to parse target state for ID '${t}': ${e}`),null)}Vs(){const t={state:this.state,updateTimeMs:Date.now()};return this.error&&(t.error={code:this.error.code,message:this.error.message}),JSON.stringify(t)}}class oi{constructor(t,e){this.clientId=t,this.activeTargetIds=e}static Rs(t,e){const n=JSON.parse(e);let i=typeof n=="object"&&n.activeTargetIds instanceof Array,s=Fs();for(let a=0;i&&a<n.activeTargetIds.length;++a)i=Zu(n.activeTargetIds[a]),s=s.add(n.activeTargetIds[a]);return i?new oi(t,s):(ut("SharedClientState",`Failed to parse client data for instance '${t}': ${e}`),null)}}class Hs{constructor(t,e){this.clientId=t,this.onlineState=e}static Rs(t){const e=JSON.parse(t);return typeof e=="object"&&["Unknown","Online","Offline"].indexOf(e.onlineState)!==-1&&typeof e.clientId=="string"?new Hs(e.clientId,e.onlineState):(ut("SharedClientState",`Failed to parse online state: ${t}`),null)}}class Rs{constructor(){this.activeTargetIds=Fs()}fs(t){this.activeTargetIds=this.activeTargetIds.add(t)}gs(t){this.activeTargetIds=this.activeTargetIds.delete(t)}Vs(){const t={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(t)}}class rs{constructor(t,e,n,i,s){this.window=t,this.ui=e,this.persistenceKey=n,this.ps=i,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.ys=this.ws.bind(this),this.Ss=new et(q),this.started=!1,this.bs=[];const a=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=s,this.Ds=Eu(this.persistenceKey,this.ps),this.vs=function(c){return`firestore_sequence_number_${c}`}(this.persistenceKey),this.Ss=this.Ss.insert(this.ps,new Rs),this.Cs=new RegExp(`^firestore_clients_${a}_([^_]*)$`),this.Fs=new RegExp(`^firestore_mutations_${a}_(\\d+)(?:_(.*))?$`),this.Ms=new RegExp(`^firestore_targets_${a}_(\\d+)$`),this.xs=function(c){return`firestore_online_state_${c}`}(this.persistenceKey),this.Os=function(c){return`firestore_bundle_loaded_v2_${c}`}(this.persistenceKey),this.window.addEventListener("storage",this.ys)}static D(t){return!(!t||!t.localStorage)}async start(){const t=await this.syncEngine.Qi();for(const n of t){if(n===this.ps)continue;const i=this.getItem(Eu(this.persistenceKey,n));if(i){const s=oi.Rs(n,i);s&&(this.Ss=this.Ss.insert(s.clientId,s))}}this.Ns();const e=this.storage.getItem(this.xs);if(e){const n=this.Ls(e);n&&this.Bs(n)}for(const n of this.bs)this.ws(n);this.bs=[],this.window.addEventListener("pagehide",()=>this.shutdown()),this.started=!0}writeSequenceNumber(t){this.setItem(this.vs,JSON.stringify(t))}getAllActiveQueryTargets(){return this.ks(this.Ss)}isActiveQueryTarget(t){let e=!1;return this.Ss.forEach((n,i)=>{i.activeTargetIds.has(t)&&(e=!0)}),e}addPendingMutation(t){this.qs(t,"pending")}updateMutationState(t,e,n){this.qs(t,e,n),this.Qs(t)}addLocalQueryTarget(t,e=!0){let n="not-current";if(this.isActiveQueryTarget(t)){const i=this.storage.getItem(ns(this.persistenceKey,t));if(i){const s=Hn.Rs(t,i);s&&(n=s.state)}}return e&&this.Ks.fs(t),this.Ns(),n}removeLocalQueryTarget(t){this.Ks.gs(t),this.Ns()}isLocalQueryTarget(t){return this.Ks.activeTargetIds.has(t)}clearQueryState(t){this.removeItem(ns(this.persistenceKey,t))}updateQueryState(t,e,n){this.$s(t,e,n)}handleUserChange(t,e,n){e.forEach(i=>{this.Qs(i)}),this.currentUser=t,n.forEach(i=>{this.addPendingMutation(i)})}setOnlineState(t){this.Us(t)}notifyBundleLoaded(t){this.Ws(t)}shutdown(){this.started&&(this.window.removeEventListener("storage",this.ys),this.removeItem(this.Ds),this.started=!1)}getItem(t){const e=this.storage.getItem(t);return b("SharedClientState","READ",t,e),e}setItem(t,e){b("SharedClientState","SET",t,e),this.storage.setItem(t,e)}removeItem(t){b("SharedClientState","REMOVE",t),this.storage.removeItem(t)}ws(t){const e=t;if(e.storageArea===this.storage){if(b("SharedClientState","EVENT",e.key,e.newValue),e.key===this.Ds)return void ut("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.ui.enqueueRetryable(async()=>{if(this.started){if(e.key!==null){if(this.Cs.test(e.key)){if(e.newValue==null){const n=this.Gs(e.key);return this.zs(n,null)}{const n=this.js(e.key,e.newValue);if(n)return this.zs(n.clientId,n)}}else if(this.Fs.test(e.key)){if(e.newValue!==null){const n=this.Hs(e.key,e.newValue);if(n)return this.Js(n)}}else if(this.Ms.test(e.key)){if(e.newValue!==null){const n=this.Ys(e.key,e.newValue);if(n)return this.Zs(n)}}else if(e.key===this.xs){if(e.newValue!==null){const n=this.Ls(e.newValue);if(n)return this.Bs(n)}}else if(e.key===this.vs){const n=function(s){let a=bt.oe;if(s!=null)try{const u=JSON.parse(s);L(typeof u=="number"),a=u}catch(u){ut("SharedClientState","Failed to read sequence number from WebStorage",u)}return a}(e.newValue);n!==bt.oe&&this.sequenceNumberHandler(n)}else if(e.key===this.Os){const n=this.Xs(e.newValue);await Promise.all(n.map(i=>this.syncEngine.eo(i)))}}}else this.bs.push(e)})}}get Ks(){return this.Ss.get(this.ps)}Ns(){this.setItem(this.Ds,this.Ks.Vs())}qs(t,e,n){const i=new si(this.currentUser,t,e,n),s=vu(this.persistenceKey,this.currentUser,t);this.setItem(s,i.Vs())}Qs(t){const e=vu(this.persistenceKey,this.currentUser,t);this.removeItem(e)}Us(t){const e={clientId:this.ps,onlineState:t};this.storage.setItem(this.xs,JSON.stringify(e))}$s(t,e,n){const i=ns(this.persistenceKey,t),s=new Hn(t,e,n);this.setItem(i,s.Vs())}Ws(t){const e=JSON.stringify(Array.from(t));this.setItem(this.Os,e)}Gs(t){const e=this.Cs.exec(t);return e?e[1]:null}js(t,e){const n=this.Gs(t);return oi.Rs(n,e)}Hs(t,e){const n=this.Fs.exec(t),i=Number(n[1]),s=n[2]!==void 0?n[2]:null;return si.Rs(new Et(s),i,e)}Ys(t,e){const n=this.Ms.exec(t),i=Number(n[1]);return Hn.Rs(i,e)}Ls(t){return Hs.Rs(t)}Xs(t){return JSON.parse(t)}async Js(t){if(t.user.uid===this.currentUser.uid)return this.syncEngine.no(t.batchId,t.state,t.error);b("SharedClientState",`Ignoring mutation for non-active user ${t.user.uid}`)}Zs(t){return this.syncEngine.ro(t.targetId,t.state,t.error)}zs(t,e){const n=e?this.Ss.insert(t,e):this.Ss.remove(t),i=this.ks(this.Ss),s=this.ks(n),a=[],u=[];return s.forEach(c=>{i.has(c)||a.push(c)}),i.forEach(c=>{s.has(c)||u.push(c)}),this.syncEngine.io(a,u).then(()=>{this.Ss=n})}Bs(t){this.Ss.get(t.clientId)&&this.onlineStateHandler(t.onlineState)}ks(t){let e=Fs();return t.forEach((n,i)=>{e=e.unionWith(i.activeTargetIds)}),e}}class hc{constructor(){this.so=new Rs,this.oo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(t){}updateMutationState(t,e,n){}addLocalQueryTarget(t,e=!0){return e&&this.so.fs(t),this.oo[t]||"not-current"}updateQueryState(t,e,n){this.oo[t]=e}removeLocalQueryTarget(t){this.so.gs(t)}isLocalQueryTarget(t){return this.so.activeTargetIds.has(t)}clearQueryState(t){delete this.oo[t]}getAllActiveQueryTargets(){return this.so.activeTargetIds}isActiveQueryTarget(t){return this.so.activeTargetIds.has(t)}start(){return this.so=new Rs,Promise.resolve()}handleUserChange(t,e,n){}setOnlineState(t){}shutdown(){}writeSequenceNumber(t){}notifyBundleLoaded(t){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Of{_o(t){}shutdown(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wu{constructor(){this.ao=()=>this.uo(),this.co=()=>this.lo(),this.ho=[],this.Po()}_o(t){this.ho.push(t)}shutdown(){window.removeEventListener("online",this.ao),window.removeEventListener("offline",this.co)}Po(){window.addEventListener("online",this.ao),window.addEventListener("offline",this.co)}uo(){b("ConnectivityMonitor","Network connectivity changed: AVAILABLE");for(const t of this.ho)t(0)}lo(){b("ConnectivityMonitor","Network connectivity changed: UNAVAILABLE");for(const t of this.ho)t(1)}static D(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Br=null;function is(){return Br===null?Br=function(){return 268435456+Math.round(2147483648*Math.random())}():Br++,"0x"+Br.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ff={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lf{constructor(t){this.Io=t.Io,this.To=t.To}Eo(t){this.Ao=t}Ro(t){this.Vo=t}mo(t){this.fo=t}onMessage(t){this.po=t}close(){this.To()}send(t){this.Io(t)}yo(){this.Ao()}wo(){this.Vo()}So(t){this.fo(t)}bo(t){this.po(t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Tt="WebChannelConnection";class Bf extends class{constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const n=e.ssl?"https":"http",i=encodeURIComponent(this.databaseId.projectId),s=encodeURIComponent(this.databaseId.database);this.Do=n+"://"+e.host,this.vo=`projects/${i}/databases/${s}`,this.Co=this.databaseId.database==="(default)"?`project_id=${i}`:`project_id=${i}&database_id=${s}`}get Fo(){return!1}Mo(e,n,i,s,a){const u=is(),c=this.xo(e,n.toUriEncodedString());b("RestConnection",`Sending RPC '${e}' ${u}:`,c,i);const d={"google-cloud-resource-prefix":this.vo,"x-goog-request-params":this.Co};return this.Oo(d,s,a),this.No(e,c,d,i).then(f=>(b("RestConnection",`Received RPC '${e}' ${u}: `,f),f),f=>{throw Jn("RestConnection",`RPC '${e}' ${u} failed with error: `,f,"url: ",c,"request:",i),f})}Lo(e,n,i,s,a,u){return this.Mo(e,n,i,s,a)}Oo(e,n,i){e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+mn}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),n&&n.headers.forEach((s,a)=>e[a]=s),i&&i.headers.forEach((s,a)=>e[a]=s)}xo(e,n){const i=Ff[e];return`${this.Do}/v1/${n}:${i}`}terminate(){}}{constructor(t){super(t),this.forceLongPolling=t.forceLongPolling,this.autoDetectLongPolling=t.autoDetectLongPolling,this.useFetchStreams=t.useFetchStreams,this.longPollingOptions=t.longPollingOptions}No(t,e,n,i){const s=is();return new Promise((a,u)=>{const c=new qu;c.setWithCredentials(!0),c.listenOnce(Gu.COMPLETE,()=>{try{switch(c.getLastErrorCode()){case Ur.NO_ERROR:const f=c.getResponseJson();b(Tt,`XHR for RPC '${t}' ${s} received:`,JSON.stringify(f)),a(f);break;case Ur.TIMEOUT:b(Tt,`RPC '${t}' ${s} timed out`),u(new C(S.DEADLINE_EXCEEDED,"Request time out"));break;case Ur.HTTP_ERROR:const g=c.getStatus();if(b(Tt,`RPC '${t}' ${s} failed with status:`,g,"response text:",c.getResponseText()),g>0){let I=c.getResponseJson();Array.isArray(I)&&(I=I[0]);const V=I==null?void 0:I.error;if(V&&V.status&&V.message){const x=function(D){const j=D.toLowerCase().replace(/_/g,"-");return Object.values(S).indexOf(j)>=0?j:S.UNKNOWN}(V.status);u(new C(x,V.message))}else u(new C(S.UNKNOWN,"Server responded with status "+c.getStatus()))}else u(new C(S.UNAVAILABLE,"Connection failed."));break;default:O()}}finally{b(Tt,`RPC '${t}' ${s} completed.`)}});const d=JSON.stringify(i);b(Tt,`RPC '${t}' ${s} sending request:`,i),c.send(e,"POST",d,n,15)})}Bo(t,e,n){const i=is(),s=[this.Do,"/","google.firestore.v1.Firestore","/",t,"/channel"],a=zu(),u=Ku(),c={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},d=this.longPollingOptions.timeoutSeconds;d!==void 0&&(c.longPollingTimeout=Math.round(1e3*d)),this.useFetchStreams&&(c.useFetchStreams=!0),this.Oo(c.initMessageHeaders,e,n),c.encodeInitMessageHeaders=!0;const f=s.join("");b(Tt,`Creating RPC '${t}' stream ${i}: ${f}`,c);const g=a.createWebChannel(f,c);let I=!1,V=!1;const x=new Lf({Io:D=>{V?b(Tt,`Not sending because RPC '${t}' stream ${i} is closed:`,D):(I||(b(Tt,`Opening RPC '${t}' stream ${i} transport.`),g.open(),I=!0),b(Tt,`RPC '${t}' stream ${i} sending:`,D),g.send(D))},To:()=>g.close()}),N=(D,j,G)=>{D.listen(j,U=>{try{G(U)}catch(H){setTimeout(()=>{throw H},0)}})};return N(g,qn.EventType.OPEN,()=>{V||(b(Tt,`RPC '${t}' stream ${i} transport opened.`),x.yo())}),N(g,qn.EventType.CLOSE,()=>{V||(V=!0,b(Tt,`RPC '${t}' stream ${i} transport closed`),x.So())}),N(g,qn.EventType.ERROR,D=>{V||(V=!0,Jn(Tt,`RPC '${t}' stream ${i} transport errored:`,D),x.So(new C(S.UNAVAILABLE,"The operation could not be completed")))}),N(g,qn.EventType.MESSAGE,D=>{var j;if(!V){const G=D.data[0];L(!!G);const U=G,H=U.error||((j=U[0])===null||j===void 0?void 0:j.error);if(H){b(Tt,`RPC '${t}' stream ${i} received error:`,H);const tt=H.status;let $=function(y){const E=ct[y];if(E!==void 0)return xl(E)}(tt),T=H.message;$===void 0&&($=S.INTERNAL,T="Unknown error status: "+tt+" with message "+H.message),V=!0,x.So(new C($,T)),g.close()}else b(Tt,`RPC '${t}' stream ${i} received:`,G),x.bo(G)}}),N(u,ju.STAT_EVENT,D=>{D.stat===as.PROXY?b(Tt,`RPC '${t}' stream ${i} detected buffering proxy`):D.stat===as.NOPROXY&&b(Tt,`RPC '${t}' stream ${i} detected no buffering proxy`)}),setTimeout(()=>{x.wo()},0),x}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function dc(){return typeof window<"u"?window:null}function $r(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ti(r){return new zd(r,!0)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fc{constructor(t,e,n=1e3,i=1.5,s=6e4){this.ui=t,this.timerId=e,this.ko=n,this.qo=i,this.Qo=s,this.Ko=0,this.$o=null,this.Uo=Date.now(),this.reset()}reset(){this.Ko=0}Wo(){this.Ko=this.Qo}Go(t){this.cancel();const e=Math.floor(this.Ko+this.zo()),n=Math.max(0,Date.now()-this.Uo),i=Math.max(0,e-n);i>0&&b("ExponentialBackoff",`Backing off for ${i} ms (base delay: ${this.Ko} ms, delay with jitter: ${e} ms, last attempt: ${n} ms ago)`),this.$o=this.ui.enqueueAfterDelay(this.timerId,i,()=>(this.Uo=Date.now(),t())),this.Ko*=this.qo,this.Ko<this.ko&&(this.Ko=this.ko),this.Ko>this.Qo&&(this.Ko=this.Qo)}jo(){this.$o!==null&&(this.$o.skipDelay(),this.$o=null)}cancel(){this.$o!==null&&(this.$o.cancel(),this.$o=null)}zo(){return(Math.random()-.5)*this.Ko}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mc{constructor(t,e,n,i,s,a,u,c){this.ui=t,this.Ho=n,this.Jo=i,this.connection=s,this.authCredentialsProvider=a,this.appCheckCredentialsProvider=u,this.listener=c,this.state=0,this.Yo=0,this.Zo=null,this.Xo=null,this.stream=null,this.e_=0,this.t_=new fc(t,e)}n_(){return this.state===1||this.state===5||this.r_()}r_(){return this.state===2||this.state===3}start(){this.e_=0,this.state!==4?this.auth():this.i_()}async stop(){this.n_()&&await this.close(0)}s_(){this.state=0,this.t_.reset()}o_(){this.r_()&&this.Zo===null&&(this.Zo=this.ui.enqueueAfterDelay(this.Ho,6e4,()=>this.__()))}a_(t){this.u_(),this.stream.send(t)}async __(){if(this.r_())return this.close(0)}u_(){this.Zo&&(this.Zo.cancel(),this.Zo=null)}c_(){this.Xo&&(this.Xo.cancel(),this.Xo=null)}async close(t,e){this.u_(),this.c_(),this.t_.cancel(),this.Yo++,t!==4?this.t_.reset():e&&e.code===S.RESOURCE_EXHAUSTED?(ut(e.toString()),ut("Using maximum backoff delay to prevent overloading the backend."),this.t_.Wo()):e&&e.code===S.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.l_(),this.stream.close(),this.stream=null),this.state=t,await this.listener.mo(e)}l_(){}auth(){this.state=1;const t=this.h_(this.Yo),e=this.Yo;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([n,i])=>{this.Yo===e&&this.P_(n,i)},n=>{t(()=>{const i=new C(S.UNKNOWN,"Fetching auth token failed: "+n.message);return this.I_(i)})})}P_(t,e){const n=this.h_(this.Yo);this.stream=this.T_(t,e),this.stream.Eo(()=>{n(()=>this.listener.Eo())}),this.stream.Ro(()=>{n(()=>(this.state=2,this.Xo=this.ui.enqueueAfterDelay(this.Jo,1e4,()=>(this.r_()&&(this.state=3),Promise.resolve())),this.listener.Ro()))}),this.stream.mo(i=>{n(()=>this.I_(i))}),this.stream.onMessage(i=>{n(()=>++this.e_==1?this.E_(i):this.onNext(i))})}i_(){this.state=5,this.t_.Go(async()=>{this.state=0,this.start()})}I_(t){return b("PersistentStream",`close with error: ${t}`),this.stream=null,this.close(4,t)}h_(t){return e=>{this.ui.enqueueAndForget(()=>this.Yo===t?e():(b("PersistentStream","stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class Uf extends mc{constructor(t,e,n,i,s,a){super(t,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",e,n,i,a),this.serializer=s}T_(t,e){return this.connection.Bo("Listen",t,e)}E_(t){return this.onNext(t)}onNext(t){this.t_.reset();const e=Wd(this.serializer,t),n=function(s){if(!("targetChange"in s))return B.min();const a=s.targetChange;return a.targetIds&&a.targetIds.length?B.min():a.readTime?Pt(a.readTime):B.min()}(t);return this.listener.d_(e,n)}A_(t){const e={};e.database=Is(this.serializer),e.addTarget=function(s,a){let u;const c=a.target;if(u=Yr(c)?{documents:Bl(s,c)}:{query:Ul(s,c)._t},u.targetId=a.targetId,a.resumeToken.approximateByteSize()>0){u.resumeToken=kl(s,a.resumeToken);const d=_s(s,a.expectedCount);d!==null&&(u.expectedCount=d)}else if(a.snapshotVersion.compareTo(B.min())>0){u.readTime=on(s,a.snapshotVersion.toTimestamp());const d=_s(s,a.expectedCount);d!==null&&(u.expectedCount=d)}return u}(this.serializer,t);const n=Jd(this.serializer,t);n&&(e.labels=n),this.a_(e)}R_(t){const e={};e.database=Is(this.serializer),e.removeTarget=t,this.a_(e)}}class qf extends mc{constructor(t,e,n,i,s,a){super(t,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",e,n,i,a),this.serializer=s}get V_(){return this.e_>0}start(){this.lastStreamToken=void 0,super.start()}l_(){this.V_&&this.m_([])}T_(t,e){return this.connection.Bo("Write",t,e)}E_(t){return L(!!t.streamToken),this.lastStreamToken=t.streamToken,L(!t.writeResults||t.writeResults.length===0),this.listener.f_()}onNext(t){L(!!t.streamToken),this.lastStreamToken=t.streamToken,this.t_.reset();const e=Hd(t.writeResults,t.commitTime),n=Pt(t.commitTime);return this.listener.g_(n,e)}p_(){const t={};t.database=Is(this.serializer),this.a_(t)}m_(t){const e={streamToken:this.lastStreamToken,writes:t.map(n=>ti(this.serializer,n))};this.a_(e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gf extends class{}{constructor(t,e,n,i){super(),this.authCredentials=t,this.appCheckCredentials=e,this.connection=n,this.serializer=i,this.y_=!1}w_(){if(this.y_)throw new C(S.FAILED_PRECONDITION,"The client has already been terminated.")}Mo(t,e,n,i){return this.w_(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([s,a])=>this.connection.Mo(t,ys(e,n),i,s,a)).catch(s=>{throw s.name==="FirebaseError"?(s.code===S.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),s):new C(S.UNKNOWN,s.toString())})}Lo(t,e,n,i,s){return this.w_(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([a,u])=>this.connection.Lo(t,ys(e,n),i,a,u,s)).catch(a=>{throw a.name==="FirebaseError"?(a.code===S.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),a):new C(S.UNKNOWN,a.toString())})}terminate(){this.y_=!0,this.connection.terminate()}}class jf{constructor(t,e){this.asyncQueue=t,this.onlineStateHandler=e,this.state="Unknown",this.S_=0,this.b_=null,this.D_=!0}v_(){this.S_===0&&(this.C_("Unknown"),this.b_=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this.b_=null,this.F_("Backend didn't respond within 10 seconds."),this.C_("Offline"),Promise.resolve())))}M_(t){this.state==="Online"?this.C_("Unknown"):(this.S_++,this.S_>=1&&(this.x_(),this.F_(`Connection failed 1 times. Most recent error: ${t.toString()}`),this.C_("Offline")))}set(t){this.x_(),this.S_=0,t==="Online"&&(this.D_=!1),this.C_(t)}C_(t){t!==this.state&&(this.state=t,this.onlineStateHandler(t))}F_(t){const e=`Could not reach Cloud Firestore backend. ${t}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.D_?(ut(e),this.D_=!1):b("OnlineStateTracker",e)}x_(){this.b_!==null&&(this.b_.cancel(),this.b_=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kf{constructor(t,e,n,i,s){this.localStore=t,this.datastore=e,this.asyncQueue=n,this.remoteSyncer={},this.O_=[],this.N_=new Map,this.L_=new Set,this.B_=[],this.k_=s,this.k_._o(a=>{n.enqueueAndForget(async()=>{Fe(this)&&(b("RemoteStore","Restarting streams for network reachability change."),await async function(c){const d=F(c);d.L_.add(4),await dr(d),d.q_.set("Unknown"),d.L_.delete(4),await Ei(d)}(this))})}),this.q_=new jf(n,i)}}async function Ei(r){if(Fe(r))for(const t of r.B_)await t(!0)}async function dr(r){for(const t of r.B_)await t(!1)}function vi(r,t){const e=F(r);e.N_.has(t.targetId)||(e.N_.set(t.targetId,t),Xs(e)?Ys(e):_n(e).r_()&&Js(e,t))}function un(r,t){const e=F(r),n=_n(e);e.N_.delete(t),n.r_()&&gc(e,t),e.N_.size===0&&(n.r_()?n.o_():Fe(e)&&e.q_.set("Unknown"))}function Js(r,t){if(r.Q_.xe(t.targetId),t.resumeToken.approximateByteSize()>0||t.snapshotVersion.compareTo(B.min())>0){const e=r.remoteSyncer.getRemoteKeysForTarget(t.targetId).size;t=t.withExpectedCount(e)}_n(r).A_(t)}function gc(r,t){r.Q_.xe(t),_n(r).R_(t)}function Ys(r){r.Q_=new qd({getRemoteKeysForTarget:t=>r.remoteSyncer.getRemoteKeysForTarget(t),ot:t=>r.N_.get(t)||null,tt:()=>r.datastore.serializer.databaseId}),_n(r).start(),r.q_.v_()}function Xs(r){return Fe(r)&&!_n(r).n_()&&r.N_.size>0}function Fe(r){return F(r).L_.size===0}function pc(r){r.Q_=void 0}async function zf(r){r.q_.set("Online")}async function Qf(r){r.N_.forEach((t,e)=>{Js(r,t)})}async function $f(r,t){pc(r),Xs(r)?(r.q_.M_(t),Ys(r)):r.q_.set("Unknown")}async function Wf(r,t,e){if(r.q_.set("Online"),t instanceof Nl&&t.state===2&&t.cause)try{await async function(i,s){const a=s.cause;for(const u of s.targetIds)i.N_.has(u)&&(await i.remoteSyncer.rejectListen(u,a),i.N_.delete(u),i.Q_.removeTarget(u))}(r,t)}catch(n){b("RemoteStore","Failed to remove targets %s: %s ",t.targetIds.join(","),n),await ai(r,n)}else if(t instanceof Qr?r.Q_.Ke(t):t instanceof Dl?r.Q_.He(t):r.Q_.We(t),!e.isEqual(B.min()))try{const n=await ac(r.localStore);e.compareTo(n)>=0&&await function(s,a){const u=s.Q_.rt(a);return u.targetChanges.forEach((c,d)=>{if(c.resumeToken.approximateByteSize()>0){const f=s.N_.get(d);f&&s.N_.set(d,f.withResumeToken(c.resumeToken,a))}}),u.targetMismatches.forEach((c,d)=>{const f=s.N_.get(c);if(!f)return;s.N_.set(c,f.withResumeToken(lt.EMPTY_BYTE_STRING,f.snapshotVersion)),gc(s,c);const g=new $t(f.target,c,d,f.sequenceNumber);Js(s,g)}),s.remoteSyncer.applyRemoteEvent(u)}(r,e)}catch(n){b("RemoteStore","Failed to raise snapshot:",n),await ai(r,n)}}async function ai(r,t,e){if(!de(t))throw t;r.L_.add(1),await dr(r),r.q_.set("Offline"),e||(e=()=>ac(r.localStore)),r.asyncQueue.enqueueRetryable(async()=>{b("RemoteStore","Retrying IndexedDB access"),await e(),r.L_.delete(1),await Ei(r)})}function _c(r,t){return t().catch(e=>ai(r,e,t))}async function pn(r){const t=F(r),e=ce(t);let n=t.O_.length>0?t.O_[t.O_.length-1].batchId:-1;for(;Hf(t);)try{const i=await Mf(t.localStore,n);if(i===null){t.O_.length===0&&e.o_();break}n=i.batchId,Jf(t,i)}catch(i){await ai(t,i)}yc(t)&&Ic(t)}function Hf(r){return Fe(r)&&r.O_.length<10}function Jf(r,t){r.O_.push(t);const e=ce(r);e.r_()&&e.V_&&e.m_(t.mutations)}function yc(r){return Fe(r)&&!ce(r).n_()&&r.O_.length>0}function Ic(r){ce(r).start()}async function Yf(r){ce(r).p_()}async function Xf(r){const t=ce(r);for(const e of r.O_)t.m_(e.mutations)}async function Zf(r,t,e){const n=r.O_.shift(),i=Us.from(n,t,e);await _c(r,()=>r.remoteSyncer.applySuccessfulWrite(i)),await pn(r)}async function tm(r,t){t&&ce(r).V_&&await async function(n,i){if(function(a){return Ld(a)&&a!==S.ABORTED}(i.code)){const s=n.O_.shift();ce(n).s_(),await _c(n,()=>n.remoteSyncer.rejectFailedWrite(s.batchId,i)),await pn(n)}}(r,t),yc(r)&&Ic(r)}async function Au(r,t){const e=F(r);e.asyncQueue.verifyOperationInProgress(),b("RemoteStore","RemoteStore received new credentials");const n=Fe(e);e.L_.add(3),await dr(e),n&&e.q_.set("Unknown"),await e.remoteSyncer.handleCredentialChange(t),e.L_.delete(3),await Ei(e)}async function Vs(r,t){const e=F(r);t?(e.L_.delete(2),await Ei(e)):t||(e.L_.add(2),await dr(e),e.q_.set("Unknown"))}function _n(r){return r.K_||(r.K_=function(e,n,i){const s=F(e);return s.w_(),new Uf(n,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(r.datastore,r.asyncQueue,{Eo:zf.bind(null,r),Ro:Qf.bind(null,r),mo:$f.bind(null,r),d_:Wf.bind(null,r)}),r.B_.push(async t=>{t?(r.K_.s_(),Xs(r)?Ys(r):r.q_.set("Unknown")):(await r.K_.stop(),pc(r))})),r.K_}function ce(r){return r.U_||(r.U_=function(e,n,i){const s=F(e);return s.w_(),new qf(n,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(r.datastore,r.asyncQueue,{Eo:()=>Promise.resolve(),Ro:Yf.bind(null,r),mo:tm.bind(null,r),f_:Xf.bind(null,r),g_:Zf.bind(null,r)}),r.B_.push(async t=>{t?(r.U_.s_(),await pn(r)):(await r.U_.stop(),r.O_.length>0&&(b("RemoteStore",`Stopping write stream with ${r.O_.length} pending writes`),r.O_=[]))})),r.U_}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zs{constructor(t,e,n,i,s){this.asyncQueue=t,this.timerId=e,this.targetTimeMs=n,this.op=i,this.removalCallback=s,this.deferred=new Lt,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(a=>{})}get promise(){return this.deferred.promise}static createAndSchedule(t,e,n,i,s){const a=Date.now()+n,u=new Zs(t,e,a,i,s);return u.start(n),u}start(t){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),t)}skipDelay(){return this.handleDelayElapsed()}cancel(t){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new C(S.CANCELLED,"Operation cancelled"+(t?": "+t:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(t=>this.deferred.resolve(t))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function wi(r,t){if(ut("AsyncQueue",`${t}: ${r}`),de(r))return new C(S.UNAVAILABLE,`${t}: ${r}`);throw r}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ze{constructor(t){this.comparator=t?(e,n)=>t(e,n)||M.comparator(e.key,n.key):(e,n)=>M.comparator(e.key,n.key),this.keyedMap=Gn(),this.sortedSet=new et(this.comparator)}static emptySet(t){return new Ze(t.comparator)}has(t){return this.keyedMap.get(t)!=null}get(t){return this.keyedMap.get(t)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(t){const e=this.keyedMap.get(t);return e?this.sortedSet.indexOf(e):-1}get size(){return this.sortedSet.size}forEach(t){this.sortedSet.inorderTraversal((e,n)=>(t(e),!1))}add(t){const e=this.delete(t.key);return e.copy(e.keyedMap.insert(t.key,t),e.sortedSet.insert(t,null))}delete(t){const e=this.get(t);return e?this.copy(this.keyedMap.remove(t),this.sortedSet.remove(e)):this}isEqual(t){if(!(t instanceof Ze)||this.size!==t.size)return!1;const e=this.sortedSet.getIterator(),n=t.sortedSet.getIterator();for(;e.hasNext();){const i=e.getNext().key,s=n.getNext().key;if(!i.isEqual(s))return!1}return!0}toString(){const t=[];return this.forEach(e=>{t.push(e.toString())}),t.length===0?"DocumentSet ()":`DocumentSet (
  `+t.join(`  
`)+`
)`}copy(t,e){const n=new Ze;return n.comparator=this.comparator,n.keyedMap=t,n.sortedSet=e,n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ru{constructor(){this.W_=new et(M.comparator)}track(t){const e=t.doc.key,n=this.W_.get(e);n?t.type!==0&&n.type===3?this.W_=this.W_.insert(e,t):t.type===3&&n.type!==1?this.W_=this.W_.insert(e,{type:n.type,doc:t.doc}):t.type===2&&n.type===2?this.W_=this.W_.insert(e,{type:2,doc:t.doc}):t.type===2&&n.type===0?this.W_=this.W_.insert(e,{type:0,doc:t.doc}):t.type===1&&n.type===0?this.W_=this.W_.remove(e):t.type===1&&n.type===2?this.W_=this.W_.insert(e,{type:1,doc:n.doc}):t.type===0&&n.type===1?this.W_=this.W_.insert(e,{type:2,doc:t.doc}):O():this.W_=this.W_.insert(e,t)}G_(){const t=[];return this.W_.inorderTraversal((e,n)=>{t.push(n)}),t}}class ln{constructor(t,e,n,i,s,a,u,c,d){this.query=t,this.docs=e,this.oldDocs=n,this.docChanges=i,this.mutatedKeys=s,this.fromCache=a,this.syncStateChanged=u,this.excludesMetadataChanges=c,this.hasCachedResults=d}static fromInitialDocuments(t,e,n,i,s){const a=[];return e.forEach(u=>{a.push({type:0,doc:u})}),new ln(t,e,Ze.emptySet(e),a,n,i,!0,!1,s)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(t){if(!(this.fromCache===t.fromCache&&this.hasCachedResults===t.hasCachedResults&&this.syncStateChanged===t.syncStateChanged&&this.mutatedKeys.isEqual(t.mutatedKeys)&&mi(this.query,t.query)&&this.docs.isEqual(t.docs)&&this.oldDocs.isEqual(t.oldDocs)))return!1;const e=this.docChanges,n=t.docChanges;if(e.length!==n.length)return!1;for(let i=0;i<e.length;i++)if(e[i].type!==n[i].type||!e[i].doc.isEqual(n[i].doc))return!1;return!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class em{constructor(){this.z_=void 0,this.j_=[]}H_(){return this.j_.some(t=>t.J_())}}class nm{constructor(){this.queries=Vu(),this.onlineState="Unknown",this.Y_=new Set}terminate(){(function(e,n){const i=F(e),s=i.queries;i.queries=Vu(),s.forEach((a,u)=>{for(const c of u.j_)c.onError(n)})})(this,new C(S.ABORTED,"Firestore shutting down"))}}function Vu(){return new me(r=>_l(r),mi)}async function to(r,t){const e=F(r);let n=3;const i=t.query;let s=e.queries.get(i);s?!s.H_()&&t.J_()&&(n=2):(s=new em,n=t.J_()?0:1);try{switch(n){case 0:s.z_=await e.onListen(i,!0);break;case 1:s.z_=await e.onListen(i,!1);break;case 2:await e.onFirstRemoteStoreListen(i)}}catch(a){const u=wi(a,`Initialization of query '${$e(t.query)}' failed`);return void t.onError(u)}e.queries.set(i,s),s.j_.push(t),t.Z_(e.onlineState),s.z_&&t.X_(s.z_)&&no(e)}async function eo(r,t){const e=F(r),n=t.query;let i=3;const s=e.queries.get(n);if(s){const a=s.j_.indexOf(t);a>=0&&(s.j_.splice(a,1),s.j_.length===0?i=t.J_()?0:1:!s.H_()&&t.J_()&&(i=2))}switch(i){case 0:return e.queries.delete(n),e.onUnlisten(n,!0);case 1:return e.queries.delete(n),e.onUnlisten(n,!1);case 2:return e.onLastRemoteStoreUnlisten(n);default:return}}function rm(r,t){const e=F(r);let n=!1;for(const i of t){const s=i.query,a=e.queries.get(s);if(a){for(const u of a.j_)u.X_(i)&&(n=!0);a.z_=i}}n&&no(e)}function im(r,t,e){const n=F(r),i=n.queries.get(t);if(i)for(const s of i.j_)s.onError(e);n.queries.delete(t)}function no(r){r.Y_.forEach(t=>{t.next()})}var Ps,Pu;(Pu=Ps||(Ps={})).ea="default",Pu.Cache="cache";class ro{constructor(t,e,n){this.query=t,this.ta=e,this.na=!1,this.ra=null,this.onlineState="Unknown",this.options=n||{}}X_(t){if(!this.options.includeMetadataChanges){const n=[];for(const i of t.docChanges)i.type!==3&&n.push(i);t=new ln(t.query,t.docs,t.oldDocs,n,t.mutatedKeys,t.fromCache,t.syncStateChanged,!0,t.hasCachedResults)}let e=!1;return this.na?this.ia(t)&&(this.ta.next(t),e=!0):this.sa(t,this.onlineState)&&(this.oa(t),e=!0),this.ra=t,e}onError(t){this.ta.error(t)}Z_(t){this.onlineState=t;let e=!1;return this.ra&&!this.na&&this.sa(this.ra,t)&&(this.oa(this.ra),e=!0),e}sa(t,e){if(!t.fromCache||!this.J_())return!0;const n=e!=="Offline";return(!this.options._a||!n)&&(!t.docs.isEmpty()||t.hasCachedResults||e==="Offline")}ia(t){if(t.docChanges.length>0)return!0;const e=this.ra&&this.ra.hasPendingWrites!==t.hasPendingWrites;return!(!t.syncStateChanged&&!e)&&this.options.includeMetadataChanges===!0}oa(t){t=ln.fromInitialDocuments(t.query,t.docs,t.mutatedKeys,t.fromCache,t.hasCachedResults),this.na=!0,this.ta.next(t)}J_(){return this.options.source!==Ps.Cache}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tc{constructor(t){this.key=t}}class Ec{constructor(t){this.key=t}}class sm{constructor(t,e){this.query=t,this.Ta=e,this.Ea=null,this.hasCachedResults=!1,this.current=!1,this.da=K(),this.mutatedKeys=K(),this.Aa=Il(t),this.Ra=new Ze(this.Aa)}get Va(){return this.Ta}ma(t,e){const n=e?e.fa:new Ru,i=e?e.Ra:this.Ra;let s=e?e.mutatedKeys:this.mutatedKeys,a=i,u=!1;const c=this.query.limitType==="F"&&i.size===this.query.limit?i.last():null,d=this.query.limitType==="L"&&i.size===this.query.limit?i.first():null;if(t.inorderTraversal((f,g)=>{const I=i.get(f),V=ur(this.query,g)?g:null,x=!!I&&this.mutatedKeys.has(I.key),N=!!V&&(V.hasLocalMutations||this.mutatedKeys.has(V.key)&&V.hasCommittedMutations);let D=!1;I&&V?I.data.isEqual(V.data)?x!==N&&(n.track({type:3,doc:V}),D=!0):this.ga(I,V)||(n.track({type:2,doc:V}),D=!0,(c&&this.Aa(V,c)>0||d&&this.Aa(V,d)<0)&&(u=!0)):!I&&V?(n.track({type:0,doc:V}),D=!0):I&&!V&&(n.track({type:1,doc:I}),D=!0,(c||d)&&(u=!0)),D&&(V?(a=a.add(V),s=N?s.add(f):s.delete(f)):(a=a.delete(f),s=s.delete(f)))}),this.query.limit!==null)for(;a.size>this.query.limit;){const f=this.query.limitType==="F"?a.last():a.first();a=a.delete(f.key),s=s.delete(f.key),n.track({type:1,doc:f})}return{Ra:a,fa:n,ns:u,mutatedKeys:s}}ga(t,e){return t.hasLocalMutations&&e.hasCommittedMutations&&!e.hasLocalMutations}applyChanges(t,e,n,i){const s=this.Ra;this.Ra=t.Ra,this.mutatedKeys=t.mutatedKeys;const a=t.fa.G_();a.sort((f,g)=>function(V,x){const N=D=>{switch(D){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return O()}};return N(V)-N(x)}(f.type,g.type)||this.Aa(f.doc,g.doc)),this.pa(n),i=i!=null&&i;const u=e&&!i?this.ya():[],c=this.da.size===0&&this.current&&!i?1:0,d=c!==this.Ea;return this.Ea=c,a.length!==0||d?{snapshot:new ln(this.query,t.Ra,s,a,t.mutatedKeys,c===0,d,!1,!!n&&n.resumeToken.approximateByteSize()>0),wa:u}:{wa:u}}Z_(t){return this.current&&t==="Offline"?(this.current=!1,this.applyChanges({Ra:this.Ra,fa:new Ru,mutatedKeys:this.mutatedKeys,ns:!1},!1)):{wa:[]}}Sa(t){return!this.Ta.has(t)&&!!this.Ra.has(t)&&!this.Ra.get(t).hasLocalMutations}pa(t){t&&(t.addedDocuments.forEach(e=>this.Ta=this.Ta.add(e)),t.modifiedDocuments.forEach(e=>{}),t.removedDocuments.forEach(e=>this.Ta=this.Ta.delete(e)),this.current=t.current)}ya(){if(!this.current)return[];const t=this.da;this.da=K(),this.Ra.forEach(n=>{this.Sa(n.key)&&(this.da=this.da.add(n.key))});const e=[];return t.forEach(n=>{this.da.has(n)||e.push(new Ec(n))}),this.da.forEach(n=>{t.has(n)||e.push(new Tc(n))}),e}ba(t){this.Ta=t.Ts,this.da=K();const e=this.ma(t.documents);return this.applyChanges(e,!0)}Da(){return ln.fromInitialDocuments(this.query,this.Ra,this.mutatedKeys,this.Ea===0,this.hasCachedResults)}}class om{constructor(t,e,n){this.query=t,this.targetId=e,this.view=n}}class am{constructor(t){this.key=t,this.va=!1}}class um{constructor(t,e,n,i,s,a){this.localStore=t,this.remoteStore=e,this.eventManager=n,this.sharedClientState=i,this.currentUser=s,this.maxConcurrentLimboResolutions=a,this.Ca={},this.Fa=new me(u=>_l(u),mi),this.Ma=new Map,this.xa=new Set,this.Oa=new et(M.comparator),this.Na=new Map,this.La=new Qs,this.Ba={},this.ka=new Map,this.qa=Me.kn(),this.onlineState="Unknown",this.Qa=void 0}get isPrimaryClient(){return this.Qa===!0}}async function lm(r,t,e=!0){const n=Ai(r);let i;const s=n.Fa.get(t);return s?(n.sharedClientState.addLocalQueryTarget(s.targetId),i=s.view.Da()):i=await vc(n,t,e,!0),i}async function cm(r,t){const e=Ai(r);await vc(e,t,!0,!1)}async function vc(r,t,e,n){const i=await ii(r.localStore,Nt(t)),s=i.targetId,a=r.sharedClientState.addLocalQueryTarget(s,e);let u;return n&&(u=await io(r,t,s,a==="current",i.resumeToken)),r.isPrimaryClient&&e&&vi(r.remoteStore,i),u}async function io(r,t,e,n,i){r.Ka=(g,I,V)=>async function(N,D,j,G){let U=D.view.ma(j);U.ns&&(U=await As(N.localStore,D.query,!1).then(({documents:T})=>D.view.ma(T,U)));const H=G&&G.targetChanges.get(D.targetId),tt=G&&G.targetMismatches.get(D.targetId)!=null,$=D.view.applyChanges(U,N.isPrimaryClient,H,tt);return Ss(N,D.targetId,$.wa),$.snapshot}(r,g,I,V);const s=await As(r.localStore,t,!0),a=new sm(t,s.Ts),u=a.ma(s.documents),c=hr.createSynthesizedTargetChangeForCurrentChange(e,n&&r.onlineState!=="Offline",i),d=a.applyChanges(u,r.isPrimaryClient,c);Ss(r,e,d.wa);const f=new om(t,e,a);return r.Fa.set(t,f),r.Ma.has(e)?r.Ma.get(e).push(t):r.Ma.set(e,[t]),d.snapshot}async function hm(r,t,e){const n=F(r),i=n.Fa.get(t),s=n.Ma.get(i.targetId);if(s.length>1)return n.Ma.set(i.targetId,s.filter(a=>!mi(a,t))),void n.Fa.delete(t);n.isPrimaryClient?(n.sharedClientState.removeLocalQueryTarget(i.targetId),n.sharedClientState.isActiveQueryTarget(i.targetId)||await an(n.localStore,i.targetId,!1).then(()=>{n.sharedClientState.clearQueryState(i.targetId),e&&un(n.remoteStore,i.targetId),cn(n,i.targetId)}).catch(he)):(cn(n,i.targetId),await an(n.localStore,i.targetId,!0))}async function dm(r,t){const e=F(r),n=e.Fa.get(t),i=e.Ma.get(n.targetId);e.isPrimaryClient&&i.length===1&&(e.sharedClientState.removeLocalQueryTarget(n.targetId),un(e.remoteStore,n.targetId))}async function fm(r,t,e){const n=uo(r);try{const i=await function(a,u){const c=F(a),d=st.now(),f=u.reduce((V,x)=>V.add(x.key),K());let g,I;return c.persistence.runTransaction("Locally write mutations","readwrite",V=>{let x=Dt(),N=K();return c.cs.getEntries(V,f).next(D=>{x=D,x.forEach((j,G)=>{G.isValidDocument()||(N=N.add(j))})}).next(()=>c.localDocuments.getOverlayedDocuments(V,x)).next(D=>{g=D;const j=[];for(const G of u){const U=Od(G,g.get(G.key).overlayedDocument);U!=null&&j.push(new Jt(G.key,U,ul(U.value.mapValue),gt.exists(!0)))}return c.mutationQueue.addMutationBatch(V,d,j,u)}).next(D=>{I=D;const j=D.applyToLocalDocumentSet(g,N);return c.documentOverlayCache.saveOverlays(V,D.batchId,j)})}).then(()=>({batchId:I.batchId,changes:El(g)}))}(n.localStore,t);n.sharedClientState.addPendingMutation(i.batchId),function(a,u,c){let d=a.Ba[a.currentUser.toKey()];d||(d=new et(q)),d=d.insert(u,c),a.Ba[a.currentUser.toKey()]=d}(n,i.batchId,e),await ge(n,i.changes),await pn(n.remoteStore)}catch(i){const s=wi(i,"Failed to persist write");e.reject(s)}}async function wc(r,t){const e=F(r);try{const n=await Nf(e.localStore,t);t.targetChanges.forEach((i,s)=>{const a=e.Na.get(s);a&&(L(i.addedDocuments.size+i.modifiedDocuments.size+i.removedDocuments.size<=1),i.addedDocuments.size>0?a.va=!0:i.modifiedDocuments.size>0?L(a.va):i.removedDocuments.size>0&&(L(a.va),a.va=!1))}),await ge(e,n,t)}catch(n){await he(n)}}function Su(r,t,e){const n=F(r);if(n.isPrimaryClient&&e===0||!n.isPrimaryClient&&e===1){const i=[];n.Fa.forEach((s,a)=>{const u=a.view.Z_(t);u.snapshot&&i.push(u.snapshot)}),function(a,u){const c=F(a);c.onlineState=u;let d=!1;c.queries.forEach((f,g)=>{for(const I of g.j_)I.Z_(u)&&(d=!0)}),d&&no(c)}(n.eventManager,t),i.length&&n.Ca.d_(i),n.onlineState=t,n.isPrimaryClient&&n.sharedClientState.setOnlineState(t)}}async function mm(r,t,e){const n=F(r);n.sharedClientState.updateQueryState(t,"rejected",e);const i=n.Na.get(t),s=i&&i.key;if(s){let a=new et(M.comparator);a=a.insert(s,at.newNoDocument(s,B.min()));const u=K().add(s),c=new cr(B.min(),new Map,new et(q),a,u);await wc(n,c),n.Oa=n.Oa.remove(s),n.Na.delete(t),ao(n)}else await an(n.localStore,t,!1).then(()=>cn(n,t,e)).catch(he)}async function gm(r,t){const e=F(r),n=t.batch.batchId;try{const i=await Df(e.localStore,t);oo(e,n,null),so(e,n),e.sharedClientState.updateMutationState(n,"acknowledged"),await ge(e,i)}catch(i){await he(i)}}async function pm(r,t,e){const n=F(r);try{const i=await function(a,u){const c=F(a);return c.persistence.runTransaction("Reject batch","readwrite-primary",d=>{let f;return c.mutationQueue.lookupMutationBatch(d,u).next(g=>(L(g!==null),f=g.keys(),c.mutationQueue.removeMutationBatch(d,g))).next(()=>c.mutationQueue.performConsistencyCheck(d)).next(()=>c.documentOverlayCache.removeOverlaysForBatchId(d,f,u)).next(()=>c.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(d,f)).next(()=>c.localDocuments.getDocuments(d,f))})}(n.localStore,t);oo(n,t,e),so(n,t),n.sharedClientState.updateMutationState(t,"rejected",e),await ge(n,i)}catch(i){await he(i)}}function so(r,t){(r.ka.get(t)||[]).forEach(e=>{e.resolve()}),r.ka.delete(t)}function oo(r,t,e){const n=F(r);let i=n.Ba[n.currentUser.toKey()];if(i){const s=i.get(t);s&&(e?s.reject(e):s.resolve(),i=i.remove(t)),n.Ba[n.currentUser.toKey()]=i}}function cn(r,t,e=null){r.sharedClientState.removeLocalQueryTarget(t);for(const n of r.Ma.get(t))r.Fa.delete(n),e&&r.Ca.$a(n,e);r.Ma.delete(t),r.isPrimaryClient&&r.La.gr(t).forEach(n=>{r.La.containsKey(n)||Ac(r,n)})}function Ac(r,t){r.xa.delete(t.path.canonicalString());const e=r.Oa.get(t);e!==null&&(un(r.remoteStore,e),r.Oa=r.Oa.remove(t),r.Na.delete(e),ao(r))}function Ss(r,t,e){for(const n of e)n instanceof Tc?(r.La.addReference(n.key,t),_m(r,n)):n instanceof Ec?(b("SyncEngine","Document no longer in limbo: "+n.key),r.La.removeReference(n.key,t),r.La.containsKey(n.key)||Ac(r,n.key)):O()}function _m(r,t){const e=t.key,n=e.path.canonicalString();r.Oa.get(e)||r.xa.has(n)||(b("SyncEngine","New document in limbo: "+e),r.xa.add(n),ao(r))}function ao(r){for(;r.xa.size>0&&r.Oa.size<r.maxConcurrentLimboResolutions;){const t=r.xa.values().next().value;r.xa.delete(t);const e=new M(J.fromString(t)),n=r.qa.next();r.Na.set(n,new am(e)),r.Oa=r.Oa.insert(e,n),vi(r.remoteStore,new $t(Nt(ar(e.path)),n,"TargetPurposeLimboResolution",bt.oe))}}async function ge(r,t,e){const n=F(r),i=[],s=[],a=[];n.Fa.isEmpty()||(n.Fa.forEach((u,c)=>{a.push(n.Ka(c,t,e).then(d=>{var f;if((d||e)&&n.isPrimaryClient){const g=d?!d.fromCache:(f=e==null?void 0:e.targetChanges.get(c.targetId))===null||f===void 0?void 0:f.current;n.sharedClientState.updateQueryState(c.targetId,g?"current":"not-current")}if(d){i.push(d);const g=Ws.Wi(c.targetId,d);s.push(g)}}))}),await Promise.all(a),n.Ca.d_(i),await async function(c,d){const f=F(c);try{await f.persistence.runTransaction("notifyLocalViewChanges","readwrite",g=>A.forEach(d,I=>A.forEach(I.$i,V=>f.persistence.referenceDelegate.addReference(g,I.targetId,V)).next(()=>A.forEach(I.Ui,V=>f.persistence.referenceDelegate.removeReference(g,I.targetId,V)))))}catch(g){if(!de(g))throw g;b("LocalStore","Failed to update sequence numbers: "+g)}for(const g of d){const I=g.targetId;if(!g.fromCache){const V=f.os.get(I),x=V.snapshotVersion,N=V.withLastLimboFreeSnapshotVersion(x);f.os=f.os.insert(I,N)}}}(n.localStore,s))}async function ym(r,t){const e=F(r);if(!e.currentUser.isEqual(t)){b("SyncEngine","User change. New user:",t.toKey());const n=await oc(e.localStore,t);e.currentUser=t,function(s,a){s.ka.forEach(u=>{u.forEach(c=>{c.reject(new C(S.CANCELLED,a))})}),s.ka.clear()}(e,"'waitForPendingWrites' promise is rejected due to a user change."),e.sharedClientState.handleUserChange(t,n.removedBatchIds,n.addedBatchIds),await ge(e,n.hs)}}function Im(r,t){const e=F(r),n=e.Na.get(t);if(n&&n.va)return K().add(n.key);{let i=K();const s=e.Ma.get(t);if(!s)return i;for(const a of s){const u=e.Fa.get(a);i=i.unionWith(u.view.Va)}return i}}async function Tm(r,t){const e=F(r),n=await As(e.localStore,t.query,!0),i=t.view.ba(n);return e.isPrimaryClient&&Ss(e,t.targetId,i.wa),i}async function Em(r,t){const e=F(r);return lc(e.localStore,t).then(n=>ge(e,n))}async function vm(r,t,e,n){const i=F(r),s=await function(u,c){const d=F(u),f=F(d.mutationQueue);return d.persistence.runTransaction("Lookup mutation documents","readonly",g=>f.Mn(g,c).next(I=>I?d.localDocuments.getDocuments(g,I):A.resolve(null)))}(i.localStore,t);s!==null?(e==="pending"?await pn(i.remoteStore):e==="acknowledged"||e==="rejected"?(oo(i,t,n||null),so(i,t),function(u,c){F(F(u).mutationQueue).On(c)}(i.localStore,t)):O(),await ge(i,s)):b("SyncEngine","Cannot apply mutation batch with id: "+t)}async function wm(r,t){const e=F(r);if(Ai(e),uo(e),t===!0&&e.Qa!==!0){const n=e.sharedClientState.getAllActiveQueryTargets(),i=await bu(e,n.toArray());e.Qa=!0,await Vs(e.remoteStore,!0);for(const s of i)vi(e.remoteStore,s)}else if(t===!1&&e.Qa!==!1){const n=[];let i=Promise.resolve();e.Ma.forEach((s,a)=>{e.sharedClientState.isLocalQueryTarget(a)?n.push(a):i=i.then(()=>(cn(e,a),an(e.localStore,a,!0))),un(e.remoteStore,a)}),await i,await bu(e,n),function(a){const u=F(a);u.Na.forEach((c,d)=>{un(u.remoteStore,d)}),u.La.pr(),u.Na=new Map,u.Oa=new et(M.comparator)}(e),e.Qa=!1,await Vs(e.remoteStore,!1)}}async function bu(r,t,e){const n=F(r),i=[],s=[];for(const a of t){let u;const c=n.Ma.get(a);if(c&&c.length!==0){u=await ii(n.localStore,Nt(c[0]));for(const d of c){const f=n.Fa.get(d),g=await Tm(n,f);g.snapshot&&s.push(g.snapshot)}}else{const d=await uc(n.localStore,a);u=await ii(n.localStore,d),await io(n,Rc(d),a,!1,u.resumeToken)}i.push(u)}return n.Ca.d_(s),i}function Rc(r){return pl(r.path,r.collectionGroup,r.orderBy,r.filters,r.limit,"F",r.startAt,r.endAt)}function Am(r){return function(e){return F(F(e).persistence).Qi()}(F(r).localStore)}async function Rm(r,t,e,n){const i=F(r);if(i.Qa)return void b("SyncEngine","Ignoring unexpected query state notification.");const s=i.Ma.get(t);if(s&&s.length>0)switch(e){case"current":case"not-current":{const a=await lc(i.localStore,yl(s[0])),u=cr.createSynthesizedRemoteEventForCurrentChange(t,e==="current",lt.EMPTY_BYTE_STRING);await ge(i,a,u);break}case"rejected":await an(i.localStore,t,!0),cn(i,t,n);break;default:O()}}async function Vm(r,t,e){const n=Ai(r);if(n.Qa){for(const i of t){if(n.Ma.has(i)&&n.sharedClientState.isActiveQueryTarget(i)){b("SyncEngine","Adding an already active target "+i);continue}const s=await uc(n.localStore,i),a=await ii(n.localStore,s);await io(n,Rc(s),a.targetId,!1,a.resumeToken),vi(n.remoteStore,a)}for(const i of e)n.Ma.has(i)&&await an(n.localStore,i,!1).then(()=>{un(n.remoteStore,i),cn(n,i)}).catch(he)}}function Ai(r){const t=F(r);return t.remoteStore.remoteSyncer.applyRemoteEvent=wc.bind(null,t),t.remoteStore.remoteSyncer.getRemoteKeysForTarget=Im.bind(null,t),t.remoteStore.remoteSyncer.rejectListen=mm.bind(null,t),t.Ca.d_=rm.bind(null,t.eventManager),t.Ca.$a=im.bind(null,t.eventManager),t}function uo(r){const t=F(r);return t.remoteStore.remoteSyncer.applySuccessfulWrite=gm.bind(null,t),t.remoteStore.remoteSyncer.rejectFailedWrite=pm.bind(null,t),t}class hn{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(t){this.serializer=Ti(t.databaseInfo.databaseId),this.sharedClientState=this.Wa(t),this.persistence=this.Ga(t),await this.persistence.start(),this.localStore=this.za(t),this.gcScheduler=this.ja(t,this.localStore),this.indexBackfillerScheduler=this.Ha(t,this.localStore)}ja(t,e){return null}Ha(t,e){return null}za(t){return sc(this.persistence,new ic,t.initialUser,this.serializer)}Ga(t){return new nc(Ii.Zr,this.serializer)}Wa(t){return new hc}async terminate(){var t,e;(t=this.gcScheduler)===null||t===void 0||t.stop(),(e=this.indexBackfillerScheduler)===null||e===void 0||e.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}hn.provider={build:()=>new hn};class Vc extends hn{constructor(t,e,n){super(),this.Ja=t,this.cacheSizeBytes=e,this.forceOwnership=n,this.kind="persistent",this.synchronizeTabs=!1}async initialize(t){await super.initialize(t),await this.Ja.initialize(this,t),await uo(this.Ja.syncEngine),await pn(this.Ja.remoteStore),await this.persistence.yi(()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve()))}za(t){return sc(this.persistence,new ic,t.initialUser,this.serializer)}ja(t,e){const n=this.persistence.referenceDelegate.garbageCollector;return new mf(n,t.asyncQueue,e)}Ha(t,e){const n=new zh(e,this.persistence);return new Kh(t.asyncQueue,n)}Ga(t){const e=rc(t.databaseInfo.databaseId,t.databaseInfo.persistenceKey),n=this.cacheSizeBytes!==void 0?St.withCacheSize(this.cacheSizeBytes):St.DEFAULT;return new $s(this.synchronizeTabs,e,t.clientId,n,t.asyncQueue,dc(),$r(),this.serializer,this.sharedClientState,!!this.forceOwnership)}Wa(t){return new hc}}class Pm extends Vc{constructor(t,e){super(t,e,!1),this.Ja=t,this.cacheSizeBytes=e,this.synchronizeTabs=!0}async initialize(t){await super.initialize(t);const e=this.Ja.syncEngine;this.sharedClientState instanceof rs&&(this.sharedClientState.syncEngine={no:vm.bind(null,e),ro:Rm.bind(null,e),io:Vm.bind(null,e),Qi:Am.bind(null,e),eo:Em.bind(null,e)},await this.sharedClientState.start()),await this.persistence.yi(async n=>{await wm(this.Ja.syncEngine,n),this.gcScheduler&&(n&&!this.gcScheduler.started?this.gcScheduler.start():n||this.gcScheduler.stop()),this.indexBackfillerScheduler&&(n&&!this.indexBackfillerScheduler.started?this.indexBackfillerScheduler.start():n||this.indexBackfillerScheduler.stop())})}Wa(t){const e=dc();if(!rs.D(e))throw new C(S.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const n=rc(t.databaseInfo.databaseId,t.databaseInfo.persistenceKey);return new rs(e,t.asyncQueue,n,t.clientId,t.initialUser)}}class dn{async initialize(t,e){this.localStore||(this.localStore=t.localStore,this.sharedClientState=t.sharedClientState,this.datastore=this.createDatastore(e),this.remoteStore=this.createRemoteStore(e),this.eventManager=this.createEventManager(e),this.syncEngine=this.createSyncEngine(e,!t.synchronizeTabs),this.sharedClientState.onlineStateHandler=n=>Su(this.syncEngine,n,1),this.remoteStore.remoteSyncer.handleCredentialChange=ym.bind(null,this.syncEngine),await Vs(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(t){return function(){return new nm}()}createDatastore(t){const e=Ti(t.databaseInfo.databaseId),n=function(s){return new Bf(s)}(t.databaseInfo);return function(s,a,u,c){return new Gf(s,a,u,c)}(t.authCredentials,t.appCheckCredentials,n,e)}createRemoteStore(t){return function(n,i,s,a,u){return new Kf(n,i,s,a,u)}(this.localStore,this.datastore,t.asyncQueue,e=>Su(this.syncEngine,e,0),function(){return wu.D()?new wu:new Of}())}createSyncEngine(t,e){return function(i,s,a,u,c,d,f){const g=new um(i,s,a,u,c,d);return f&&(g.Qa=!0),g}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,t.initialUser,t.maxConcurrentLimboResolutions,e)}async terminate(){var t,e;await async function(i){const s=F(i);b("RemoteStore","RemoteStore shutting down."),s.L_.add(5),await dr(s),s.k_.shutdown(),s.q_.set("Unknown")}(this.remoteStore),(t=this.datastore)===null||t===void 0||t.terminate(),(e=this.eventManager)===null||e===void 0||e.terminate()}}dn.provider={build:()=>new dn};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lo{constructor(t){this.observer=t,this.muted=!1}next(t){this.muted||this.observer.next&&this.Ya(this.observer.next,t)}error(t){this.muted||(this.observer.error?this.Ya(this.observer.error,t):ut("Uncaught Error in snapshot listener:",t.toString()))}Za(){this.muted=!0}Ya(t,e){setTimeout(()=>{this.muted||t(e)},0)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sm{constructor(t,e,n,i,s){this.authCredentials=t,this.appCheckCredentials=e,this.asyncQueue=n,this.databaseInfo=i,this.user=Et.UNAUTHENTICATED,this.clientId=Qu.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=s,this.authCredentials.start(n,async a=>{b("FirestoreClient","Received user=",a.uid),await this.authCredentialListener(a),this.user=a}),this.appCheckCredentials.start(n,a=>(b("FirestoreClient","Received new app check token=",a),this.appCheckCredentialListener(a,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(t){this.authCredentialListener=t}setAppCheckTokenChangeListener(t){this.appCheckCredentialListener=t}terminate(){this.asyncQueue.enterRestrictedMode();const t=new Lt;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),t.resolve()}catch(e){const n=wi(e,"Failed to shutdown persistence");t.reject(n)}}),t.promise}}async function ss(r,t){r.asyncQueue.verifyOperationInProgress(),b("FirestoreClient","Initializing OfflineComponentProvider");const e=r.configuration;await t.initialize(e);let n=e.initialUser;r.setCredentialChangeListener(async i=>{n.isEqual(i)||(await oc(t.localStore,i),n=i)}),t.persistence.setDatabaseDeletedListener(()=>r.terminate()),r._offlineComponents=t}async function Cu(r,t){r.asyncQueue.verifyOperationInProgress();const e=await Pc(r);b("FirestoreClient","Initializing OnlineComponentProvider"),await t.initialize(e,r.configuration),r.setCredentialChangeListener(n=>Au(t.remoteStore,n)),r.setAppCheckTokenChangeListener((n,i)=>Au(t.remoteStore,i)),r._onlineComponents=t}async function Pc(r){if(!r._offlineComponents)if(r._uninitializedComponentsProvider){b("FirestoreClient","Using user provided OfflineComponentProvider");try{await ss(r,r._uninitializedComponentsProvider._offline)}catch(t){const e=t;if(!function(i){return i.name==="FirebaseError"?i.code===S.FAILED_PRECONDITION||i.code===S.UNIMPLEMENTED:!(typeof DOMException<"u"&&i instanceof DOMException)||i.code===22||i.code===20||i.code===11}(e))throw e;Jn("Error using user provided cache. Falling back to memory cache: "+e),await ss(r,new hn)}}else b("FirestoreClient","Using default OfflineComponentProvider"),await ss(r,new hn);return r._offlineComponents}async function Sc(r){return r._onlineComponents||(r._uninitializedComponentsProvider?(b("FirestoreClient","Using user provided OnlineComponentProvider"),await Cu(r,r._uninitializedComponentsProvider._online)):(b("FirestoreClient","Using default OnlineComponentProvider"),await Cu(r,new dn))),r._onlineComponents}function bm(r){return Pc(r).then(t=>t.localStore)}function Cm(r){return Sc(r).then(t=>t.syncEngine)}async function ui(r){const t=await Sc(r),e=t.eventManager;return e.onListen=lm.bind(null,t.syncEngine),e.onUnlisten=hm.bind(null,t.syncEngine),e.onFirstRemoteStoreListen=cm.bind(null,t.syncEngine),e.onLastRemoteStoreUnlisten=dm.bind(null,t.syncEngine),e}function xm(r,t){const e=new Lt;return r.asyncQueue.enqueueAndForget(async()=>async function(i,s,a){try{const u=await function(d,f){const g=F(d);return g.persistence.runTransaction("read document","readonly",I=>g.localDocuments.getDocument(I,f))}(i,s);u.isFoundDocument()?a.resolve(u):u.isNoDocument()?a.resolve(null):a.reject(new C(S.UNAVAILABLE,"Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)"))}catch(u){const c=wi(u,`Failed to get document '${s} from cache`);a.reject(c)}}(await bm(r),t,e)),e.promise}function Dm(r,t,e={}){const n=new Lt;return r.asyncQueue.enqueueAndForget(async()=>function(s,a,u,c,d){const f=new lo({next:I=>{f.Za(),a.enqueueAndForget(()=>eo(s,g));const V=I.docs.has(u);!V&&I.fromCache?d.reject(new C(S.UNAVAILABLE,"Failed to get document because the client is offline.")):V&&I.fromCache&&c&&c.source==="server"?d.reject(new C(S.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):d.resolve(I)},error:I=>d.reject(I)}),g=new ro(ar(u.path),f,{includeMetadataChanges:!0,_a:!0});return to(s,g)}(await ui(r),r.asyncQueue,t,e,n)),n.promise}function Nm(r,t,e={}){const n=new Lt;return r.asyncQueue.enqueueAndForget(async()=>function(s,a,u,c,d){const f=new lo({next:I=>{f.Za(),a.enqueueAndForget(()=>eo(s,g)),I.fromCache&&c.source==="server"?d.reject(new C(S.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):d.resolve(I)},error:I=>d.reject(I)}),g=new ro(u,f,{includeMetadataChanges:!0,_a:!0});return to(s,g)}(await ui(r),r.asyncQueue,t,e,n)),n.promise}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function bc(r){const t={};return r.timeoutSeconds!==void 0&&(t.timeoutSeconds=r.timeoutSeconds),t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xu=new Map;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Cc(r,t,e){if(!e)throw new C(S.INVALID_ARGUMENT,`Function ${r}() cannot be called with an empty ${t}.`)}function km(r,t,e,n){if(t===!0&&n===!0)throw new C(S.INVALID_ARGUMENT,`${r} and ${e} cannot be used together.`)}function Du(r){if(!M.isDocumentKey(r))throw new C(S.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${r} has ${r.length}.`)}function Nu(r){if(M.isDocumentKey(r))throw new C(S.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${r} has ${r.length}.`)}function Ri(r){if(r===void 0)return"undefined";if(r===null)return"null";if(typeof r=="string")return r.length>20&&(r=`${r.substring(0,20)}...`),JSON.stringify(r);if(typeof r=="number"||typeof r=="boolean")return""+r;if(typeof r=="object"){if(r instanceof Array)return"an array";{const t=function(n){return n.constructor?n.constructor.name:null}(r);return t?`a custom ${t} object`:"an object"}}return typeof r=="function"?"a function":O()}function kt(r,t){if("_delegate"in r&&(r=r._delegate),!(r instanceof t)){if(t.name===r.constructor.name)throw new C(S.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const e=Ri(r);throw new C(S.INVALID_ARGUMENT,`Expected type '${t.name}', but it was: ${e}`)}}return r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ku{constructor(t){var e,n;if(t.host===void 0){if(t.ssl!==void 0)throw new C(S.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host="firestore.googleapis.com",this.ssl=!0}else this.host=t.host,this.ssl=(e=t.ssl)===null||e===void 0||e;if(this.credentials=t.credentials,this.ignoreUndefinedProperties=!!t.ignoreUndefinedProperties,this.localCache=t.localCache,t.cacheSizeBytes===void 0)this.cacheSizeBytes=41943040;else{if(t.cacheSizeBytes!==-1&&t.cacheSizeBytes<1048576)throw new C(S.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=t.cacheSizeBytes}km("experimentalForceLongPolling",t.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",t.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!t.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:t.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!t.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=bc((n=t.experimentalLongPollingOptions)!==null&&n!==void 0?n:{}),function(s){if(s.timeoutSeconds!==void 0){if(isNaN(s.timeoutSeconds))throw new C(S.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (must not be NaN)`);if(s.timeoutSeconds<5)throw new C(S.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (minimum allowed value is 5)`);if(s.timeoutSeconds>30)throw new C(S.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!t.useFetchStreams}isEqual(t){return this.host===t.host&&this.ssl===t.ssl&&this.credentials===t.credentials&&this.cacheSizeBytes===t.cacheSizeBytes&&this.experimentalForceLongPolling===t.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===t.experimentalAutoDetectLongPolling&&function(n,i){return n.timeoutSeconds===i.timeoutSeconds}(this.experimentalLongPollingOptions,t.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===t.ignoreUndefinedProperties&&this.useFetchStreams===t.useFetchStreams}}class co{constructor(t,e,n,i){this._authCredentials=t,this._appCheckCredentials=e,this._databaseId=n,this._app=i,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new ku({}),this._settingsFrozen=!1,this._terminateTask="notTerminated"}get app(){if(!this._app)throw new C(S.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(t){if(this._settingsFrozen)throw new C(S.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new ku(t),t.credentials!==void 0&&(this._authCredentials=function(n){if(!n)return new kh;switch(n.type){case"firstParty":return new Fh(n.sessionIndex||"0",n.iamToken||null,n.authTokenFactory||null);case"provider":return n.client;default:throw new C(S.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(t.credentials))}_getSettings(){return this._settings}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(e){const n=xu.get(e);n&&(b("ComponentProvider","Removing Datastore"),xu.delete(e),n.terminate())}(this),Promise.resolve()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gt{constructor(t,e,n){this.converter=e,this._query=n,this.type="query",this.firestore=t}withConverter(t){return new Gt(this.firestore,t,this._query)}}class wt{constructor(t,e,n){this.converter=e,this._key=n,this.type="document",this.firestore=t}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new oe(this.firestore,this.converter,this._key.path.popLast())}withConverter(t){return new wt(this.firestore,t,this._key)}}class oe extends Gt{constructor(t,e,n){super(t,e,ar(n)),this._path=n,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const t=this._path.popLast();return t.isEmpty()?null:new wt(this.firestore,null,new M(t))}withConverter(t){return new oe(this.firestore,t,this._path)}}function eg(r,t,...e){if(r=Ot(r),Cc("collection","path",t),r instanceof co){const n=J.fromString(t,...e);return Nu(n),new oe(r,null,n)}{if(!(r instanceof wt||r instanceof oe))throw new C(S.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(J.fromString(t,...e));return Nu(n),new oe(r.firestore,null,n)}}function ng(r,t,...e){if(r=Ot(r),arguments.length===1&&(t=Qu.newId()),Cc("doc","path",t),r instanceof co){const n=J.fromString(t,...e);return Du(n),new wt(r,null,new M(n))}{if(!(r instanceof wt||r instanceof oe))throw new C(S.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(J.fromString(t,...e));return Du(n),new wt(r.firestore,r instanceof oe?r.converter:null,new M(n))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mu{constructor(t=Promise.resolve()){this.Pu=[],this.Iu=!1,this.Tu=[],this.Eu=null,this.du=!1,this.Au=!1,this.Ru=[],this.t_=new fc(this,"async_queue_retry"),this.Vu=()=>{const n=$r();n&&b("AsyncQueue","Visibility state changed to "+n.visibilityState),this.t_.jo()},this.mu=t;const e=$r();e&&typeof e.addEventListener=="function"&&e.addEventListener("visibilitychange",this.Vu)}get isShuttingDown(){return this.Iu}enqueueAndForget(t){this.enqueue(t)}enqueueAndForgetEvenWhileRestricted(t){this.fu(),this.gu(t)}enterRestrictedMode(t){if(!this.Iu){this.Iu=!0,this.Au=t||!1;const e=$r();e&&typeof e.removeEventListener=="function"&&e.removeEventListener("visibilitychange",this.Vu)}}enqueue(t){if(this.fu(),this.Iu)return new Promise(()=>{});const e=new Lt;return this.gu(()=>this.Iu&&this.Au?Promise.resolve():(t().then(e.resolve,e.reject),e.promise)).then(()=>e.promise)}enqueueRetryable(t){this.enqueueAndForget(()=>(this.Pu.push(t),this.pu()))}async pu(){if(this.Pu.length!==0){try{await this.Pu[0](),this.Pu.shift(),this.t_.reset()}catch(t){if(!de(t))throw t;b("AsyncQueue","Operation failed with retryable error: "+t)}this.Pu.length>0&&this.t_.Go(()=>this.pu())}}gu(t){const e=this.mu.then(()=>(this.du=!0,t().catch(n=>{this.Eu=n,this.du=!1;const i=function(a){let u=a.message||"";return a.stack&&(u=a.stack.includes(a.message)?a.stack:a.message+`
`+a.stack),u}(n);throw ut("INTERNAL UNHANDLED ERROR: ",i),n}).then(n=>(this.du=!1,n))));return this.mu=e,e}enqueueAfterDelay(t,e,n){this.fu(),this.Ru.indexOf(t)>-1&&(e=0);const i=Zs.createAndSchedule(this,t,e,n,s=>this.yu(s));return this.Tu.push(i),i}fu(){this.Eu&&O()}verifyOperationInProgress(){}async wu(){let t;do t=this.mu,await t;while(t!==this.mu)}Su(t){for(const e of this.Tu)if(e.timerId===t)return!0;return!1}bu(t){return this.wu().then(()=>{this.Tu.sort((e,n)=>e.targetTimeMs-n.targetTimeMs);for(const e of this.Tu)if(e.skipDelay(),t!=="all"&&e.timerId===t)break;return this.wu()})}Du(t){this.Ru.push(t)}yu(t){const e=this.Tu.indexOf(t);this.Tu.splice(e,1)}}function Ou(r){return function(e,n){if(typeof e!="object"||e===null)return!1;const i=e;for(const s of n)if(s in i&&typeof i[s]=="function")return!0;return!1}(r,["next","error","complete"])}class Ht extends co{constructor(t,e,n,i){super(t,e,n,i),this.type="firestore",this._queue=new Mu,this._persistenceKey=(i==null?void 0:i.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const t=this._firestoreClient.terminate();this._queue=new Mu(t),this._firestoreClient=void 0,await t}}}function rg(r,t,e){const n=bh(r,"firestore");if(n.isInitialized(e)){const i=n.getImmediate({identifier:e}),s=n.getOptions(e);if(Ch(s,t))return i;throw new C(S.FAILED_PRECONDITION,"initializeFirestore() has already been called with different options. To avoid this error, call initializeFirestore() with the same options as when it was originally called, or call getFirestore() to return the already initialized instance.")}if(t.cacheSizeBytes!==void 0&&t.localCache!==void 0)throw new C(S.INVALID_ARGUMENT,"cache and cacheSizeBytes cannot be specified at the same time as cacheSizeBytes willbe deprecated. Instead, specify the cache size in the cache object");if(t.cacheSizeBytes!==void 0&&t.cacheSizeBytes!==-1&&t.cacheSizeBytes<1048576)throw new C(S.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");return n.initialize({options:t,instanceIdentifier:e})}function yn(r){if(r._terminated)throw new C(S.FAILED_PRECONDITION,"The client has already been terminated.");return r._firestoreClient||Mm(r),r._firestoreClient}function Mm(r){var t,e,n;const i=r._freezeSettings(),s=function(u,c,d,f){return new dd(u,c,d,f.host,f.ssl,f.experimentalForceLongPolling,f.experimentalAutoDetectLongPolling,bc(f.experimentalLongPollingOptions),f.useFetchStreams)}(r._databaseId,((t=r._app)===null||t===void 0?void 0:t.options.appId)||"",r._persistenceKey,i);r._componentsProvider||!((e=i.localCache)===null||e===void 0)&&e._offlineComponentProvider&&(!((n=i.localCache)===null||n===void 0)&&n._onlineComponentProvider)&&(r._componentsProvider={_offline:i.localCache._offlineComponentProvider,_online:i.localCache._onlineComponentProvider}),r._firestoreClient=new Sm(r._authCredentials,r._appCheckCredentials,r._queue,s,r._componentsProvider&&function(u){const c=u==null?void 0:u._online.build();return{_offline:u==null?void 0:u._offline.build(c),_online:c}}(r._componentsProvider))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fn{constructor(t){this._byteString=t}static fromBase64String(t){try{return new fn(lt.fromBase64String(t))}catch(e){throw new C(S.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+e)}}static fromUint8Array(t){return new fn(lt.fromUint8Array(t))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(t){return this._byteString.isEqual(t._byteString)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fr{constructor(...t){for(let e=0;e<t.length;++e)if(t[e].length===0)throw new C(S.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new it(t)}isEqual(t){return this._internalPath.isEqual(t._internalPath)}}function ig(){return new fr("__name__")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ho{constructor(t){this._methodName=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fo{constructor(t,e){if(!isFinite(t)||t<-90||t>90)throw new C(S.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+t);if(!isFinite(e)||e<-180||e>180)throw new C(S.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+e);this._lat=t,this._long=e}get latitude(){return this._lat}get longitude(){return this._long}isEqual(t){return this._lat===t._lat&&this._long===t._long}toJSON(){return{latitude:this._lat,longitude:this._long}}_compareTo(t){return q(this._lat,t._lat)||q(this._long,t._long)}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mo{constructor(t){this._values=(t||[]).map(e=>e)}toArray(){return this._values.map(t=>t)}isEqual(t){return function(n,i){if(n.length!==i.length)return!1;for(let s=0;s<n.length;++s)if(n[s]!==i[s])return!1;return!0}(this._values,t._values)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Om=/^__.*__$/;class Fm{constructor(t,e,n){this.data=t,this.fieldMask=e,this.fieldTransforms=n}toMutation(t,e){return this.fieldMask!==null?new Jt(t,this.data,this.fieldMask,e,this.fieldTransforms):new gn(t,this.data,e,this.fieldTransforms)}}class xc{constructor(t,e,n){this.data=t,this.fieldMask=e,this.fieldTransforms=n}toMutation(t,e){return new Jt(t,this.data,this.fieldMask,e,this.fieldTransforms)}}function Dc(r){switch(r){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw O()}}class go{constructor(t,e,n,i,s,a){this.settings=t,this.databaseId=e,this.serializer=n,this.ignoreUndefinedProperties=i,s===void 0&&this.vu(),this.fieldTransforms=s||[],this.fieldMask=a||[]}get path(){return this.settings.path}get Cu(){return this.settings.Cu}Fu(t){return new go(Object.assign(Object.assign({},this.settings),t),this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}Mu(t){var e;const n=(e=this.path)===null||e===void 0?void 0:e.child(t),i=this.Fu({path:n,xu:!1});return i.Ou(t),i}Nu(t){var e;const n=(e=this.path)===null||e===void 0?void 0:e.child(t),i=this.Fu({path:n,xu:!1});return i.vu(),i}Lu(t){return this.Fu({path:void 0,xu:!0})}Bu(t){return li(t,this.settings.methodName,this.settings.ku||!1,this.path,this.settings.qu)}contains(t){return this.fieldMask.find(e=>t.isPrefixOf(e))!==void 0||this.fieldTransforms.find(e=>t.isPrefixOf(e.field))!==void 0}vu(){if(this.path)for(let t=0;t<this.path.length;t++)this.Ou(this.path.get(t))}Ou(t){if(t.length===0)throw this.Bu("Document fields must not be empty");if(Dc(this.Cu)&&Om.test(t))throw this.Bu('Document fields cannot begin and end with "__"')}}class Lm{constructor(t,e,n){this.databaseId=t,this.ignoreUndefinedProperties=e,this.serializer=n||Ti(t)}Qu(t,e,n,i=!1){return new go({Cu:t,methodName:e,qu:n,path:it.emptyPath(),xu:!1,ku:i},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function Vi(r){const t=r._freezeSettings(),e=Ti(r._databaseId);return new Lm(r._databaseId,!!t.ignoreUndefinedProperties,e)}function Nc(r,t,e,n,i,s={}){const a=r.Qu(s.merge||s.mergeFields?2:0,t,e,i);po("Data must be an object, but it was:",a,n);const u=Mc(n,a);let c,d;if(s.merge)c=new Ct(a.fieldMask),d=a.fieldTransforms;else if(s.mergeFields){const f=[];for(const g of s.mergeFields){const I=bs(t,g,e);if(!a.contains(I))throw new C(S.INVALID_ARGUMENT,`Field '${I}' is specified in your field mask but missing from your input data.`);Fc(f,I)||f.push(I)}c=new Ct(f),d=a.fieldTransforms.filter(g=>c.covers(g.field))}else c=null,d=a.fieldTransforms;return new Fm(new vt(u),c,d)}class Pi extends ho{_toFieldTransform(t){if(t.Cu!==2)throw t.Cu===1?t.Bu(`${this._methodName}() can only appear at the top level of your update data`):t.Bu(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return t.fieldMask.push(t.path),null}isEqual(t){return t instanceof Pi}}function Bm(r,t,e,n){const i=r.Qu(1,t,e);po("Data must be an object, but it was:",i,n);const s=[],a=vt.empty();Oe(n,(c,d)=>{const f=_o(t,c,e);d=Ot(d);const g=i.Nu(f);if(d instanceof Pi)s.push(f);else{const I=mr(d,g);I!=null&&(s.push(f),a.set(f,I))}});const u=new Ct(s);return new xc(a,u,i.fieldTransforms)}function Um(r,t,e,n,i,s){const a=r.Qu(1,t,e),u=[bs(t,n,e)],c=[i];if(s.length%2!=0)throw new C(S.INVALID_ARGUMENT,`Function ${t}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let I=0;I<s.length;I+=2)u.push(bs(t,s[I])),c.push(s[I+1]);const d=[],f=vt.empty();for(let I=u.length-1;I>=0;--I)if(!Fc(d,u[I])){const V=u[I];let x=c[I];x=Ot(x);const N=a.Nu(V);if(x instanceof Pi)d.push(V);else{const D=mr(x,N);D!=null&&(d.push(V),f.set(V,D))}}const g=new Ct(d);return new xc(f,g,a.fieldTransforms)}function kc(r,t,e,n=!1){return mr(e,r.Qu(n?4:3,t))}function mr(r,t){if(Oc(r=Ot(r)))return po("Unsupported field value:",t,r),Mc(r,t);if(r instanceof ho)return function(n,i){if(!Dc(i.Cu))throw i.Bu(`${n._methodName}() can only be used with update() and set()`);if(!i.path)throw i.Bu(`${n._methodName}() is not currently supported inside arrays`);const s=n._toFieldTransform(i);s&&i.fieldTransforms.push(s)}(r,t),null;if(r===void 0&&t.ignoreUndefinedProperties)return null;if(t.path&&t.fieldMask.push(t.path),r instanceof Array){if(t.settings.xu&&t.Cu!==4)throw t.Bu("Nested arrays are not supported");return function(n,i){const s=[];let a=0;for(const u of n){let c=mr(u,i.Lu(a));c==null&&(c={nullValue:"NULL_VALUE"}),s.push(c),a++}return{arrayValue:{values:s}}}(r,t)}return function(n,i){if((n=Ot(n))===null)return{nullValue:"NULL_VALUE"};if(typeof n=="number")return bd(i.serializer,n);if(typeof n=="boolean")return{booleanValue:n};if(typeof n=="string")return{stringValue:n};if(n instanceof Date){const s=st.fromDate(n);return{timestampValue:on(i.serializer,s)}}if(n instanceof st){const s=new st(n.seconds,1e3*Math.floor(n.nanoseconds/1e3));return{timestampValue:on(i.serializer,s)}}if(n instanceof fo)return{geoPointValue:{latitude:n.latitude,longitude:n.longitude}};if(n instanceof fn)return{bytesValue:kl(i.serializer,n._byteString)};if(n instanceof wt){const s=i.databaseId,a=n.firestore._databaseId;if(!a.isEqual(s))throw i.Bu(`Document reference is for database ${a.projectId}/${a.database} but should be for database ${s.projectId}/${s.database}`);return{referenceValue:js(n.firestore._databaseId||i.databaseId,n._key.path)}}if(n instanceof mo)return function(a,u){return{mapValue:{fields:{__type__:{stringValue:"__vector__"},value:{arrayValue:{values:a.toArray().map(c=>{if(typeof c!="number")throw u.Bu("VectorValues must only contain numeric values.");return Ls(u.serializer,c)})}}}}}}(n,i);throw i.Bu(`Unsupported field value: ${Ri(n)}`)}(r,t)}function Mc(r,t){const e={};return il(r)?t.path&&t.path.length>0&&t.fieldMask.push(t.path):Oe(r,(n,i)=>{const s=mr(i,t.Mu(n));s!=null&&(e[n]=s)}),{mapValue:{fields:e}}}function Oc(r){return!(typeof r!="object"||r===null||r instanceof Array||r instanceof Date||r instanceof st||r instanceof fo||r instanceof fn||r instanceof wt||r instanceof ho||r instanceof mo)}function po(r,t,e){if(!Oc(e)||!function(i){return typeof i=="object"&&i!==null&&(Object.getPrototypeOf(i)===Object.prototype||Object.getPrototypeOf(i)===null)}(e)){const n=Ri(e);throw n==="an object"?t.Bu(r+" a custom object"):t.Bu(r+" "+n)}}function bs(r,t,e){if((t=Ot(t))instanceof fr)return t._internalPath;if(typeof t=="string")return _o(r,t);throw li("Field path arguments must be of type string or ",r,!1,void 0,e)}const qm=new RegExp("[~\\*/\\[\\]]");function _o(r,t,e){if(t.search(qm)>=0)throw li(`Invalid field path (${t}). Paths must not contain '~', '*', '/', '[', or ']'`,r,!1,void 0,e);try{return new fr(...t.split("."))._internalPath}catch{throw li(`Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,r,!1,void 0,e)}}function li(r,t,e,n,i){const s=n&&!n.isEmpty(),a=i!==void 0;let u=`Function ${t}() called with invalid data`;e&&(u+=" (via `toFirestore()`)"),u+=". ";let c="";return(s||a)&&(c+=" (found",s&&(c+=` in field ${n}`),a&&(c+=` in document ${i}`),c+=")"),new C(S.INVALID_ARGUMENT,u+r+c)}function Fc(r,t){return r.some(e=>e.isEqual(t))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yo{constructor(t,e,n,i,s){this._firestore=t,this._userDataWriter=e,this._key=n,this._document=i,this._converter=s}get id(){return this._key.path.lastSegment()}get ref(){return new wt(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const t=new Gm(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(t)}return this._userDataWriter.convertValue(this._document.data.value)}}get(t){if(this._document){const e=this._document.data.field(Io("DocumentSnapshot.get",t));if(e!==null)return this._userDataWriter.convertValue(e)}}}class Gm extends yo{data(){return super.data()}}function Io(r,t){return typeof t=="string"?_o(r,t):t instanceof fr?t._internalPath:t._delegate._internalPath}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Lc(r){if(r.limitType==="L"&&r.explicitOrderBy.length===0)throw new C(S.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class To{}class Si extends To{}function sg(r,t,...e){let n=[];t instanceof To&&n.push(t),n=n.concat(e),function(s){const a=s.filter(c=>c instanceof vo).length,u=s.filter(c=>c instanceof Eo).length;if(a>1||a>0&&u>0)throw new C(S.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}(n);for(const i of n)r=i._apply(r);return r}class Eo extends Si{constructor(t,e,n){super(),this._field=t,this._op=e,this._value=n,this.type="where"}static _create(t,e,n){return new Eo(t,e,n)}_apply(t){const e=this._parse(t);return Uc(t._query,e),new Gt(t.firestore,t.converter,gs(t._query,e))}_parse(t){const e=Vi(t.firestore);return function(s,a,u,c,d,f,g){let I;if(d.isKeyField()){if(f==="array-contains"||f==="array-contains-any")throw new C(S.INVALID_ARGUMENT,`Invalid Query. You can't perform '${f}' queries on documentId().`);if(f==="in"||f==="not-in"){Lu(g,f);const V=[];for(const x of g)V.push(Fu(c,s,x));I={arrayValue:{values:V}}}else I=Fu(c,s,g)}else f!=="in"&&f!=="not-in"&&f!=="array-contains-any"||Lu(g,f),I=kc(u,a,g,f==="in"||f==="not-in");return z.create(d,f,I)}(t._query,"where",e,t.firestore._databaseId,this._field,this._op,this._value)}}class vo extends To{constructor(t,e){super(),this.type=t,this._queryConstraints=e}static _create(t,e){return new vo(t,e)}_parse(t){const e=this._queryConstraints.map(n=>n._parse(t)).filter(n=>n.getFilters().length>0);return e.length===1?e[0]:Y.create(e,this._getOperator())}_apply(t){const e=this._parse(t);return e.getFilters().length===0?t:(function(i,s){let a=i;const u=s.getFlattenedFilters();for(const c of u)Uc(a,c),a=gs(a,c)}(t._query,e),new Gt(t.firestore,t.converter,gs(t._query,e)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class wo extends Si{constructor(t,e){super(),this._field=t,this._direction=e,this.type="orderBy"}static _create(t,e){return new wo(t,e)}_apply(t){const e=function(i,s,a){if(i.startAt!==null)throw new C(S.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(i.endAt!==null)throw new C(S.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new rr(s,a)}(t._query,this._field,this._direction);return new Gt(t.firestore,t.converter,function(i,s){const a=i.explicitOrderBy.concat([s]);return new fe(i.path,i.collectionGroup,a,i.filters.slice(),i.limit,i.limitType,i.startAt,i.endAt)}(t._query,e))}}function og(r,t="asc"){const e=t,n=Io("orderBy",r);return wo._create(n,e)}class Ao extends Si{constructor(t,e,n){super(),this.type=t,this._docOrFields=e,this._inclusive=n}static _create(t,e,n){return new Ao(t,e,n)}_apply(t){const e=Bc(t,this.type,this._docOrFields,this._inclusive);return new Gt(t.firestore,t.converter,function(i,s){return new fe(i.path,i.collectionGroup,i.explicitOrderBy.slice(),i.filters.slice(),i.limit,i.limitType,s,i.endAt)}(t._query,e))}}function ag(...r){return Ao._create("startAt",r,!0)}class Ro extends Si{constructor(t,e,n){super(),this.type=t,this._docOrFields=e,this._inclusive=n}static _create(t,e,n){return new Ro(t,e,n)}_apply(t){const e=Bc(t,this.type,this._docOrFields,this._inclusive);return new Gt(t.firestore,t.converter,function(i,s){return new fe(i.path,i.collectionGroup,i.explicitOrderBy.slice(),i.filters.slice(),i.limit,i.limitType,i.startAt,s)}(t._query,e))}}function ug(...r){return Ro._create("endAt",r,!0)}function Bc(r,t,e,n){if(e[0]=Ot(e[0]),e[0]instanceof yo)return function(s,a,u,c,d){if(!c)throw new C(S.NOT_FOUND,`Can't use a DocumentSnapshot that doesn't exist for ${u}().`);const f=[];for(const g of Xe(s))if(g.field.isKeyField())f.push(xe(a,c.key));else{const I=c.data.field(g.field);if(di(I))throw new C(S.INVALID_ARGUMENT,'Invalid query. You are trying to start or end a query using a document for which the field "'+g.field+'" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');if(I===null){const V=g.field.canonicalString();throw new C(S.INVALID_ARGUMENT,`Invalid query. You are trying to start or end a query using a document for which the field '${V}' (used as the orderBy) does not exist.`)}f.push(I)}return new le(f,d)}(r._query,r.firestore._databaseId,t,e[0]._document,n);{const i=Vi(r.firestore);return function(a,u,c,d,f,g){const I=a.explicitOrderBy;if(f.length>I.length)throw new C(S.INVALID_ARGUMENT,`Too many arguments provided to ${d}(). The number of arguments must be less than or equal to the number of orderBy() clauses`);const V=[];for(let x=0;x<f.length;x++){const N=f[x];if(I[x].field.isKeyField()){if(typeof N!="string")throw new C(S.INVALID_ARGUMENT,`Invalid query. Expected a string for document ID in ${d}(), but got a ${typeof N}`);if(!Os(a)&&N.indexOf("/")!==-1)throw new C(S.INVALID_ARGUMENT,`Invalid query. When querying a collection and ordering by documentId(), the value passed to ${d}() must be a plain document ID, but '${N}' contains a slash.`);const D=a.path.child(J.fromString(N));if(!M.isDocumentKey(D))throw new C(S.INVALID_ARGUMENT,`Invalid query. When querying a collection group and ordering by documentId(), the value passed to ${d}() must result in a valid document path, but '${D}' is not because it contains an odd number of segments.`);const j=new M(D);V.push(xe(u,j))}else{const D=kc(c,d,N);V.push(D)}}return new le(V,g)}(r._query,r.firestore._databaseId,i,t,e,n)}}function Fu(r,t,e){if(typeof(e=Ot(e))=="string"){if(e==="")throw new C(S.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!Os(t)&&e.indexOf("/")!==-1)throw new C(S.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${e}' contains a '/' character.`);const n=t.path.child(J.fromString(e));if(!M.isDocumentKey(n))throw new C(S.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${n}' is not because it has an odd number of segments (${n.length}).`);return xe(r,new M(n))}if(e instanceof wt)return xe(r,e._key);throw new C(S.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${Ri(e)}.`)}function Lu(r,t){if(!Array.isArray(r)||r.length===0)throw new C(S.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${t.toString()}' filters.`)}function Uc(r,t){const e=function(i,s){for(const a of i)for(const u of a.getFlattenedFilters())if(s.indexOf(u.op)>=0)return u.op;return null}(r.filters,function(i){switch(i){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(t.op));if(e!==null)throw e===t.op?new C(S.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${t.op.toString()}' filter.`):new C(S.INVALID_ARGUMENT,`Invalid query. You cannot use '${t.op.toString()}' filters with '${e.toString()}' filters.`)}class jm{convertValue(t,e="none"){switch(Ce(t)){case 0:return null;case 1:return t.booleanValue;case 2:return rt(t.integerValue||t.doubleValue);case 3:return this.convertTimestamp(t.timestampValue);case 4:return this.convertServerTimestamp(t,e);case 5:return t.stringValue;case 6:return this.convertBytes(ae(t.bytesValue));case 7:return this.convertReference(t.referenceValue);case 8:return this.convertGeoPoint(t.geoPointValue);case 9:return this.convertArray(t.arrayValue,e);case 11:return this.convertObject(t.mapValue,e);case 10:return this.convertVectorValue(t.mapValue);default:throw O()}}convertObject(t,e){return this.convertObjectMap(t.fields,e)}convertObjectMap(t,e="none"){const n={};return Oe(t,(i,s)=>{n[i]=this.convertValue(s,e)}),n}convertVectorValue(t){var e,n,i;const s=(i=(n=(e=t.fields)===null||e===void 0?void 0:e.value.arrayValue)===null||n===void 0?void 0:n.values)===null||i===void 0?void 0:i.map(a=>rt(a.doubleValue));return new mo(s)}convertGeoPoint(t){return new fo(rt(t.latitude),rt(t.longitude))}convertArray(t,e){return(t.values||[]).map(n=>this.convertValue(n,e))}convertServerTimestamp(t,e){switch(e){case"previous":const n=ks(t);return n==null?null:this.convertValue(n,e);case"estimate":return this.convertTimestamp(tr(t));default:return null}}convertTimestamp(t){const e=Wt(t);return new st(e.seconds,e.nanos)}convertDocumentKey(t,e){const n=J.fromString(t);L(Kl(n));const i=new be(n.get(1),n.get(3)),s=new M(n.popFirst(5));return i.isEqual(e)||ut(`Document ${s} contains a document reference within a different database (${i.projectId}/${i.database}) which is not supported. It will be treated as a reference in the current database (${e.projectId}/${e.database}) instead.`),s}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qc(r,t,e){let n;return n=r?e&&(e.merge||e.mergeFields)?r.toFirestore(t,e):r.toFirestore(t):t,n}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ye{constructor(t,e){this.hasPendingWrites=t,this.fromCache=e}isEqual(t){return this.hasPendingWrites===t.hasPendingWrites&&this.fromCache===t.fromCache}}class Vo extends yo{constructor(t,e,n,i,s,a){super(t,e,n,i,a),this._firestore=t,this._firestoreImpl=t,this.metadata=s}exists(){return super.exists()}data(t={}){if(this._document){if(this._converter){const e=new Wr(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(e,t)}return this._userDataWriter.convertValue(this._document.data.value,t.serverTimestamps)}}get(t,e={}){if(this._document){const n=this._document.data.field(Io("DocumentSnapshot.get",t));if(n!==null)return this._userDataWriter.convertValue(n,e.serverTimestamps)}}}class Wr extends Vo{data(t={}){return super.data(t)}}class Gc{constructor(t,e,n,i){this._firestore=t,this._userDataWriter=e,this._snapshot=i,this.metadata=new Ye(i.hasPendingWrites,i.fromCache),this.query=n}get docs(){const t=[];return this.forEach(e=>t.push(e)),t}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(t,e){this._snapshot.docs.forEach(n=>{t.call(e,new Wr(this._firestore,this._userDataWriter,n.key,n,new Ye(this._snapshot.mutatedKeys.has(n.key),this._snapshot.fromCache),this.query.converter))})}docChanges(t={}){const e=!!t.includeMetadataChanges;if(e&&this._snapshot.excludesMetadataChanges)throw new C(S.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===e||(this._cachedChanges=function(i,s){if(i._snapshot.oldDocs.isEmpty()){let a=0;return i._snapshot.docChanges.map(u=>{const c=new Wr(i._firestore,i._userDataWriter,u.doc.key,u.doc,new Ye(i._snapshot.mutatedKeys.has(u.doc.key),i._snapshot.fromCache),i.query.converter);return u.doc,{type:"added",doc:c,oldIndex:-1,newIndex:a++}})}{let a=i._snapshot.oldDocs;return i._snapshot.docChanges.filter(u=>s||u.type!==3).map(u=>{const c=new Wr(i._firestore,i._userDataWriter,u.doc.key,u.doc,new Ye(i._snapshot.mutatedKeys.has(u.doc.key),i._snapshot.fromCache),i.query.converter);let d=-1,f=-1;return u.type!==0&&(d=a.indexOf(u.doc.key),a=a.delete(u.doc.key)),u.type!==1&&(a=a.add(u.doc),f=a.indexOf(u.doc.key)),{type:Km(u.type),doc:c,oldIndex:d,newIndex:f}})}}(this,e),this._cachedChangesIncludeMetadataChanges=e),this._cachedChanges}}function Km(r){switch(r){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return O()}}class bi extends jm{constructor(t){super(),this.firestore=t}convertBytes(t){return new fn(t)}convertReference(t){const e=this.convertDocumentKey(t,this.firestore._databaseId);return new wt(this.firestore,null,e)}}function lg(r){r=kt(r,wt);const t=kt(r.firestore,Ht),e=yn(t),n=new bi(t);return xm(e,r._key).then(i=>new Vo(t,n,r._key,i,new Ye(i!==null&&i.hasLocalMutations,!0),r.converter))}function cg(r){r=kt(r,wt);const t=kt(r.firestore,Ht);return Dm(yn(t),r._key,{source:"server"}).then(e=>jc(t,r,e))}function hg(r){r=kt(r,Gt);const t=kt(r.firestore,Ht),e=yn(t),n=new bi(t);return Lc(r._query),Nm(e,r._query).then(i=>new Gc(t,n,r,i))}function dg(r,t,e){r=kt(r,wt);const n=kt(r.firestore,Ht),i=qc(r.converter,t,e);return Po(n,[Nc(Vi(n),"setDoc",r._key,i,r.converter!==null,e).toMutation(r._key,gt.none())])}function fg(r){return Po(kt(r.firestore,Ht),[new lr(r._key,gt.none())])}function mg(r,...t){var e,n,i;r=Ot(r);let s={includeMetadataChanges:!1,source:"default"},a=0;typeof t[a]!="object"||Ou(t[a])||(s=t[a],a++);const u={includeMetadataChanges:s.includeMetadataChanges,source:s.source};if(Ou(t[a])){const g=t[a];t[a]=(e=g.next)===null||e===void 0?void 0:e.bind(g),t[a+1]=(n=g.error)===null||n===void 0?void 0:n.bind(g),t[a+2]=(i=g.complete)===null||i===void 0?void 0:i.bind(g)}let c,d,f;if(r instanceof wt)d=kt(r.firestore,Ht),f=ar(r._key.path),c={next:g=>{t[a]&&t[a](jc(d,r,g))},error:t[a+1],complete:t[a+2]};else{const g=kt(r,Gt);d=kt(g.firestore,Ht),f=g._query;const I=new bi(d);c={next:V=>{t[a]&&t[a](new Gc(d,I,g,V))},error:t[a+1],complete:t[a+2]},Lc(r._query)}return function(I,V,x,N){const D=new lo(N),j=new ro(V,D,x);return I.asyncQueue.enqueueAndForget(async()=>to(await ui(I),j)),()=>{D.Za(),I.asyncQueue.enqueueAndForget(async()=>eo(await ui(I),j))}}(yn(d),f,u,c)}function Po(r,t){return function(n,i){const s=new Lt;return n.asyncQueue.enqueueAndForget(async()=>fm(await Cm(n),i,s)),s.promise}(yn(r),t)}function jc(r,t,e){const n=e.docs.get(t._key),i=new bi(r);return new Vo(r,i,t._key,n,new Ye(e.hasPendingWrites,e.fromCache),t.converter)}class zm{constructor(t){this.kind="memory",this._onlineComponentProvider=dn.provider,t!=null&&t.garbageCollector?this._offlineComponentProvider=t.garbageCollector._offlineComponentProvider:this._offlineComponentProvider=hn.provider}toJSON(){return{kind:this.kind}}}class Qm{constructor(t){let e;this.kind="persistent",t!=null&&t.tabManager?(t.tabManager._initialize(t),e=t.tabManager):(e=Hm(),e._initialize(t)),this._onlineComponentProvider=e._onlineComponentProvider,this._offlineComponentProvider=e._offlineComponentProvider}toJSON(){return{kind:this.kind}}}function gg(r){return new zm(r)}function pg(r){return new Qm(r)}class $m{constructor(t){this.forceOwnership=t,this.kind="persistentSingleTab"}toJSON(){return{kind:this.kind}}_initialize(t){this._onlineComponentProvider=dn.provider,this._offlineComponentProvider={build:e=>new Vc(e,t==null?void 0:t.cacheSizeBytes,this.forceOwnership)}}}class Wm{constructor(){this.kind="PersistentMultipleTab"}toJSON(){return{kind:this.kind}}_initialize(t){this._onlineComponentProvider=dn.provider,this._offlineComponentProvider={build:e=>new Pm(e,t==null?void 0:t.cacheSizeBytes)}}}function Hm(r){return new $m(void 0)}function _g(){return new Wm}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jm{constructor(t,e){this._firestore=t,this._commitHandler=e,this._mutations=[],this._committed=!1,this._dataReader=Vi(t)}set(t,e,n){this._verifyNotCommitted();const i=os(t,this._firestore),s=qc(i.converter,e,n),a=Nc(this._dataReader,"WriteBatch.set",i._key,s,i.converter!==null,n);return this._mutations.push(a.toMutation(i._key,gt.none())),this}update(t,e,n,...i){this._verifyNotCommitted();const s=os(t,this._firestore);let a;return a=typeof(e=Ot(e))=="string"||e instanceof fr?Um(this._dataReader,"WriteBatch.update",s._key,e,n,i):Bm(this._dataReader,"WriteBatch.update",s._key,e),this._mutations.push(a.toMutation(s._key,gt.exists(!0))),this}delete(t){this._verifyNotCommitted();const e=os(t,this._firestore);return this._mutations=this._mutations.concat(new lr(e._key,gt.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new C(S.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}}function os(r,t){if((r=Ot(r)).firestore!==t)throw new C(S.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yg(r){return yn(r=kt(r,Ht)),new Jm(r,t=>Po(r,t))}(function(t,e=!0){(function(i){mn=i})(Dh),Vh(new Ph("firestore",(n,{instanceIdentifier:i,options:s})=>{const a=n.getProvider("app").getImmediate(),u=new Ht(new Mh(n.getProvider("auth-internal")),new Bh(n.getProvider("app-check-internal")),function(d,f){if(!Object.prototype.hasOwnProperty.apply(d.options,["projectId"]))throw new C(S.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new be(d.options.projectId,f)}(a,i),a);return s=Object.assign({useFetchStreams:e},s),u._setSettings(s),u},"PUBLIC").setMultipleInstances(!0)),Sa(Ca,"4.7.3",t),Sa(Ca,"4.7.3","esm2017")})();export{ng as a,ig as b,eg as c,fg as d,ug as e,cg as f,lg as g,hg as h,rg as i,og as j,_g as k,ag as l,gg as m,mg as o,pg as p,sg as q,dg as s,yg as w};
