var Su={};/**
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
 */const ul=function(r){const e=[];let t=0;for(let n=0;n<r.length;n++){let i=r.charCodeAt(n);i<128?e[t++]=i:i<2048?(e[t++]=i>>6|192,e[t++]=i&63|128):(i&64512)===55296&&n+1<r.length&&(r.charCodeAt(n+1)&64512)===56320?(i=65536+((i&1023)<<10)+(r.charCodeAt(++n)&1023),e[t++]=i>>18|240,e[t++]=i>>12&63|128,e[t++]=i>>6&63|128,e[t++]=i&63|128):(e[t++]=i>>12|224,e[t++]=i>>6&63|128,e[t++]=i&63|128)}return e},Ff=function(r){const e=[];let t=0,n=0;for(;t<r.length;){const i=r[t++];if(i<128)e[n++]=String.fromCharCode(i);else if(i>191&&i<224){const s=r[t++];e[n++]=String.fromCharCode((i&31)<<6|s&63)}else if(i>239&&i<365){const s=r[t++],a=r[t++],u=r[t++],c=((i&7)<<18|(s&63)<<12|(a&63)<<6|u&63)-65536;e[n++]=String.fromCharCode(55296+(c>>10)),e[n++]=String.fromCharCode(56320+(c&1023))}else{const s=r[t++],a=r[t++];e[n++]=String.fromCharCode((i&15)<<12|(s&63)<<6|a&63)}}return e.join("")},cl={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(r,e){if(!Array.isArray(r))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,n=[];for(let i=0;i<r.length;i+=3){const s=r[i],a=i+1<r.length,u=a?r[i+1]:0,c=i+2<r.length,d=c?r[i+2]:0,m=s>>2,p=(s&3)<<4|u>>4;let E=(u&15)<<2|d>>6,S=d&63;c||(S=64,a||(E=64)),n.push(t[m],t[p],t[E],t[S])}return n.join("")},encodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(r):this.encodeByteArray(ul(r),e)},decodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(r):Ff(this.decodeStringToByteArray(r,e))},decodeStringToByteArray(r,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,n=[];for(let i=0;i<r.length;){const s=t[r.charAt(i++)],u=i<r.length?t[r.charAt(i)]:0;++i;const d=i<r.length?t[r.charAt(i)]:64;++i;const p=i<r.length?t[r.charAt(i)]:64;if(++i,s==null||u==null||d==null||p==null)throw new Uf;const E=s<<2|u>>4;if(n.push(E),d!==64){const S=u<<4&240|d>>2;if(n.push(S),p!==64){const V=d<<6&192|p;n.push(V)}}}return n},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let r=0;r<this.ENCODED_VALS.length;r++)this.byteToCharMap_[r]=this.ENCODED_VALS.charAt(r),this.charToByteMap_[this.byteToCharMap_[r]]=r,this.byteToCharMapWebSafe_[r]=this.ENCODED_VALS_WEBSAFE.charAt(r),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[r]]=r,r>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(r)]=r,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(r)]=r)}}};class Uf extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const Bf=function(r){const e=ul(r);return cl.encodeByteArray(e,!0)},ll=function(r){return Bf(r).replace(/\./g,"")},hl=function(r){try{return cl.decodeString(r,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
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
 */function jf(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
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
 */const qf=()=>jf().__FIREBASE_DEFAULTS__,zf=()=>{if(typeof process>"u"||typeof Su>"u")return;const r=Su.__FIREBASE_DEFAULTS__;if(r)return JSON.parse(r)},Kf=()=>{if(typeof document>"u")return;let r;try{r=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=r&&hl(r[1]);return e&&JSON.parse(e)},Xi=()=>{try{return qf()||zf()||Kf()}catch(r){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${r}`);return}},$f=r=>{var e,t;return(t=(e=Xi())===null||e===void 0?void 0:e.emulatorHosts)===null||t===void 0?void 0:t[r]},dl=()=>{var r;return(r=Xi())===null||r===void 0?void 0:r.config},fl=r=>{var e;return(e=Xi())===null||e===void 0?void 0:e[`_${r}`]};/**
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
 */class Gf{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,n)=>{t?this.reject(t):this.resolve(n),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,n))}}}/**
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
 */function fe(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function Wf(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(fe())}function Hf(){var r;const e=(r=Xi())===null||r===void 0?void 0:r.forceEnvironment;if(e==="node")return!0;if(e==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function Qf(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function Jf(){const r=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof r=="object"&&r.id!==void 0}function Yf(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function Xf(){const r=fe();return r.indexOf("MSIE ")>=0||r.indexOf("Trident/")>=0}function ml(){return!Hf()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function pl(){try{return typeof indexedDB=="object"}catch{return!1}}function Zf(){return new Promise((r,e)=>{try{let t=!0;const n="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(n);i.onsuccess=()=>{i.result.close(),t||self.indexedDB.deleteDatabase(n),r(!0)},i.onupgradeneeded=()=>{t=!1},i.onerror=()=>{var s;e(((s=i.error)===null||s===void 0?void 0:s.message)||"")}}catch(t){e(t)}})}/**
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
 */const em="FirebaseError";class rt extends Error{constructor(e,t,n){super(t),this.code=e,this.customData=n,this.name=em,Object.setPrototypeOf(this,rt.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,Lr.prototype.create)}}class Lr{constructor(e,t,n){this.service=e,this.serviceName=t,this.errors=n}create(e,...t){const n=t[0]||{},i=`${this.service}/${e}`,s=this.errors[e],a=s?tm(s,n):"Error",u=`${this.serviceName}: ${a} (${i}).`;return new rt(i,u,n)}}function tm(r,e){return r.replace(nm,(t,n)=>{const i=e[n];return i!=null?String(i):`<${n}?>`})}const nm=/\{\$([^}]+)}/g;function rm(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}function Tr(r,e){if(r===e)return!0;const t=Object.keys(r),n=Object.keys(e);for(const i of t){if(!n.includes(i))return!1;const s=r[i],a=e[i];if(Pu(s)&&Pu(a)){if(!Tr(s,a))return!1}else if(s!==a)return!1}for(const i of n)if(!t.includes(i))return!1;return!0}function Pu(r){return r!==null&&typeof r=="object"}/**
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
 */function Fr(r){const e=[];for(const[t,n]of Object.entries(r))Array.isArray(n)?n.forEach(i=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(i))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(n));return e.length?"&"+e.join("&"):""}function im(r,e){const t=new sm(r,e);return t.subscribe.bind(t)}class sm{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(n=>{this.error(n)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,n){let i;if(e===void 0&&t===void 0&&n===void 0)throw new Error("Missing Observer.");om(e,["next","error","complete"])?i=e:i={next:e,error:t,complete:n},i.next===void 0&&(i.next=Ks),i.error===void 0&&(i.error=Ks),i.complete===void 0&&(i.complete=Ks);const s=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?i.error(this.finalError):i.complete()}catch{}}),this.observers.push(i),s}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(n){typeof console<"u"&&console.error&&console.error(n)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function om(r,e){if(typeof r!="object"||r===null)return!1;for(const t of e)if(t in r&&typeof r[t]=="function")return!0;return!1}function Ks(){}/**
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
 */function Fe(r){return r&&r._delegate?r._delegate:r}class $t{constructor(e,t,n){this.name=e,this.instanceFactory=t,this.type=n,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
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
 */const Lt="[DEFAULT]";/**
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
 */class am{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const n=new Gf;if(this.instancesDeferred.set(t,n),this.isInitialized(t)||this.shouldAutoInitialize())try{const i=this.getOrInitializeService({instanceIdentifier:t});i&&n.resolve(i)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){var t;const n=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),i=(t=e==null?void 0:e.optional)!==null&&t!==void 0?t:!1;if(this.isInitialized(n)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:n})}catch(s){if(i)return null;throw s}else{if(i)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(cm(e))try{this.getOrInitializeService({instanceIdentifier:Lt})}catch{}for(const[t,n]of this.instancesDeferred.entries()){const i=this.normalizeInstanceIdentifier(t);try{const s=this.getOrInitializeService({instanceIdentifier:i});n.resolve(s)}catch{}}}}clearInstance(e=Lt){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=Lt){return this.instances.has(e)}getOptions(e=Lt){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,n=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(n))throw Error(`${this.name}(${n}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const i=this.getOrInitializeService({instanceIdentifier:n,options:t});for(const[s,a]of this.instancesDeferred.entries()){const u=this.normalizeInstanceIdentifier(s);n===u&&a.resolve(i)}return i}onInit(e,t){var n;const i=this.normalizeInstanceIdentifier(t),s=(n=this.onInitCallbacks.get(i))!==null&&n!==void 0?n:new Set;s.add(e),this.onInitCallbacks.set(i,s);const a=this.instances.get(i);return a&&e(a,i),()=>{s.delete(e)}}invokeOnInitCallbacks(e,t){const n=this.onInitCallbacks.get(t);if(n)for(const i of n)try{i(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let n=this.instances.get(e);if(!n&&this.component&&(n=this.component.instanceFactory(this.container,{instanceIdentifier:um(e),options:t}),this.instances.set(e,n),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(n,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,n)}catch{}return n||null}normalizeInstanceIdentifier(e=Lt){return this.component?this.component.multipleInstances?e:Lt:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function um(r){return r===Lt?void 0:r}function cm(r){return r.instantiationMode==="EAGER"}/**
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
 */class lm{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new am(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
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
 */var W;(function(r){r[r.DEBUG=0]="DEBUG",r[r.VERBOSE=1]="VERBOSE",r[r.INFO=2]="INFO",r[r.WARN=3]="WARN",r[r.ERROR=4]="ERROR",r[r.SILENT=5]="SILENT"})(W||(W={}));const hm={debug:W.DEBUG,verbose:W.VERBOSE,info:W.INFO,warn:W.WARN,error:W.ERROR,silent:W.SILENT},dm=W.INFO,fm={[W.DEBUG]:"log",[W.VERBOSE]:"log",[W.INFO]:"info",[W.WARN]:"warn",[W.ERROR]:"error"},mm=(r,e,...t)=>{if(e<r.logLevel)return;const n=new Date().toISOString(),i=fm[e];if(i)console[i](`[${n}]  ${r.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class xo{constructor(e){this.name=e,this._logLevel=dm,this._logHandler=mm,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in W))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?hm[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,W.DEBUG,...e),this._logHandler(this,W.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,W.VERBOSE,...e),this._logHandler(this,W.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,W.INFO,...e),this._logHandler(this,W.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,W.WARN,...e),this._logHandler(this,W.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,W.ERROR,...e),this._logHandler(this,W.ERROR,...e)}}const pm=(r,e)=>e.some(t=>r instanceof t);let Cu,Vu;function gm(){return Cu||(Cu=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function _m(){return Vu||(Vu=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const gl=new WeakMap,ro=new WeakMap,_l=new WeakMap,$s=new WeakMap,No=new WeakMap;function ym(r){const e=new Promise((t,n)=>{const i=()=>{r.removeEventListener("success",s),r.removeEventListener("error",a)},s=()=>{t(_t(r.result)),i()},a=()=>{n(r.error),i()};r.addEventListener("success",s),r.addEventListener("error",a)});return e.then(t=>{t instanceof IDBCursor&&gl.set(t,r)}).catch(()=>{}),No.set(e,r),e}function Im(r){if(ro.has(r))return;const e=new Promise((t,n)=>{const i=()=>{r.removeEventListener("complete",s),r.removeEventListener("error",a),r.removeEventListener("abort",a)},s=()=>{t(),i()},a=()=>{n(r.error||new DOMException("AbortError","AbortError")),i()};r.addEventListener("complete",s),r.addEventListener("error",a),r.addEventListener("abort",a)});ro.set(r,e)}let io={get(r,e,t){if(r instanceof IDBTransaction){if(e==="done")return ro.get(r);if(e==="objectStoreNames")return r.objectStoreNames||_l.get(r);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return _t(r[e])},set(r,e,t){return r[e]=t,!0},has(r,e){return r instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in r}};function vm(r){io=r(io)}function Tm(r){return r===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const n=r.call(Gs(this),e,...t);return _l.set(n,e.sort?e.sort():[e]),_t(n)}:_m().includes(r)?function(...e){return r.apply(Gs(this),e),_t(gl.get(this))}:function(...e){return _t(r.apply(Gs(this),e))}}function Em(r){return typeof r=="function"?Tm(r):(r instanceof IDBTransaction&&Im(r),pm(r,gm())?new Proxy(r,io):r)}function _t(r){if(r instanceof IDBRequest)return ym(r);if($s.has(r))return $s.get(r);const e=Em(r);return e!==r&&($s.set(r,e),No.set(e,r)),e}const Gs=r=>No.get(r);function wm(r,e,{blocked:t,upgrade:n,blocking:i,terminated:s}={}){const a=indexedDB.open(r,e),u=_t(a);return n&&a.addEventListener("upgradeneeded",c=>{n(_t(a.result),c.oldVersion,c.newVersion,_t(a.transaction),c)}),t&&a.addEventListener("blocked",c=>t(c.oldVersion,c.newVersion,c)),u.then(c=>{s&&c.addEventListener("close",()=>s()),i&&c.addEventListener("versionchange",d=>i(d.oldVersion,d.newVersion,d))}).catch(()=>{}),u}const Am=["get","getKey","getAll","getAllKeys","count"],Rm=["put","add","delete","clear"],Ws=new Map;function Du(r,e){if(!(r instanceof IDBDatabase&&!(e in r)&&typeof e=="string"))return;if(Ws.get(e))return Ws.get(e);const t=e.replace(/FromIndex$/,""),n=e!==t,i=Rm.includes(t);if(!(t in(n?IDBIndex:IDBObjectStore).prototype)||!(i||Am.includes(t)))return;const s=async function(a,...u){const c=this.transaction(a,i?"readwrite":"readonly");let d=c.store;return n&&(d=d.index(u.shift())),(await Promise.all([d[t](...u),i&&c.done]))[0]};return Ws.set(e,s),s}vm(r=>({...r,get:(e,t,n)=>Du(e,t)||r.get(e,t,n),has:(e,t)=>!!Du(e,t)||r.has(e,t)}));/**
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
 */class bm{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(Sm(t)){const n=t.getImmediate();return`${n.library}/${n.version}`}else return null}).filter(t=>t).join(" ")}}function Sm(r){const e=r.getComponent();return(e==null?void 0:e.type)==="VERSION"}const so="@firebase/app",ku="0.10.13";/**
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
 */const Ze=new xo("@firebase/app"),Pm="@firebase/app-compat",Cm="@firebase/analytics-compat",Vm="@firebase/analytics",Dm="@firebase/app-check-compat",km="@firebase/app-check",xm="@firebase/auth",Nm="@firebase/auth-compat",Om="@firebase/database",Mm="@firebase/data-connect",Lm="@firebase/database-compat",Fm="@firebase/functions",Um="@firebase/functions-compat",Bm="@firebase/installations",jm="@firebase/installations-compat",qm="@firebase/messaging",zm="@firebase/messaging-compat",Km="@firebase/performance",$m="@firebase/performance-compat",Gm="@firebase/remote-config",Wm="@firebase/remote-config-compat",Hm="@firebase/storage",Qm="@firebase/storage-compat",Jm="@firebase/firestore",Ym="@firebase/vertexai-preview",Xm="@firebase/firestore-compat",Zm="firebase",ep="10.14.1";/**
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
 */const oo="[DEFAULT]",tp={[so]:"fire-core",[Pm]:"fire-core-compat",[Vm]:"fire-analytics",[Cm]:"fire-analytics-compat",[km]:"fire-app-check",[Dm]:"fire-app-check-compat",[xm]:"fire-auth",[Nm]:"fire-auth-compat",[Om]:"fire-rtdb",[Mm]:"fire-data-connect",[Lm]:"fire-rtdb-compat",[Fm]:"fire-fn",[Um]:"fire-fn-compat",[Bm]:"fire-iid",[jm]:"fire-iid-compat",[qm]:"fire-fcm",[zm]:"fire-fcm-compat",[Km]:"fire-perf",[$m]:"fire-perf-compat",[Gm]:"fire-rc",[Wm]:"fire-rc-compat",[Hm]:"fire-gcs",[Qm]:"fire-gcs-compat",[Jm]:"fire-fst",[Xm]:"fire-fst-compat",[Ym]:"fire-vertex","fire-js":"fire-js",[Zm]:"fire-js-all"};/**
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
 */const ki=new Map,np=new Map,ao=new Map;function xu(r,e){try{r.container.addComponent(e)}catch(t){Ze.debug(`Component ${e.name} failed to register with FirebaseApp ${r.name}`,t)}}function Tn(r){const e=r.name;if(ao.has(e))return Ze.debug(`There were multiple attempts to register component ${e}.`),!1;ao.set(e,r);for(const t of ki.values())xu(t,r);for(const t of np.values())xu(t,r);return!0}function Oo(r,e){const t=r.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),r.container.getProvider(e)}function He(r){return r.settings!==void 0}/**
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
 */const rp={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},yt=new Lr("app","Firebase",rp);/**
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
 */class ip{constructor(e,t,n){this._isDeleted=!1,this._options=Object.assign({},e),this._config=Object.assign({},t),this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=n,this.container.addComponent(new $t("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw yt.create("app-deleted",{appName:this._name})}}/**
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
 */const Nn=ep;function sp(r,e={}){let t=r;typeof e!="object"&&(e={name:e});const n=Object.assign({name:oo,automaticDataCollectionEnabled:!1},e),i=n.name;if(typeof i!="string"||!i)throw yt.create("bad-app-name",{appName:String(i)});if(t||(t=dl()),!t)throw yt.create("no-options");const s=ki.get(i);if(s){if(Tr(t,s.options)&&Tr(n,s.config))return s;throw yt.create("duplicate-app",{appName:i})}const a=new lm(i);for(const c of ao.values())a.addComponent(c);const u=new ip(t,n,a);return ki.set(i,u),u}function op(r=oo){const e=ki.get(r);if(!e&&r===oo&&dl())return sp();if(!e)throw yt.create("no-app",{appName:r});return e}function It(r,e,t){var n;let i=(n=tp[r])!==null&&n!==void 0?n:r;t&&(i+=`-${t}`);const s=i.match(/\s|\//),a=e.match(/\s|\//);if(s||a){const u=[`Unable to register library "${i}" with version "${e}":`];s&&u.push(`library name "${i}" contains illegal characters (whitespace or "/")`),s&&a&&u.push("and"),a&&u.push(`version name "${e}" contains illegal characters (whitespace or "/")`),Ze.warn(u.join(" "));return}Tn(new $t(`${i}-version`,()=>({library:i,version:e}),"VERSION"))}/**
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
 */const ap="firebase-heartbeat-database",up=1,Er="firebase-heartbeat-store";let Hs=null;function yl(){return Hs||(Hs=wm(ap,up,{upgrade:(r,e)=>{switch(e){case 0:try{r.createObjectStore(Er)}catch(t){console.warn(t)}}}}).catch(r=>{throw yt.create("idb-open",{originalErrorMessage:r.message})})),Hs}async function cp(r){try{const t=(await yl()).transaction(Er),n=await t.objectStore(Er).get(Il(r));return await t.done,n}catch(e){if(e instanceof rt)Ze.warn(e.message);else{const t=yt.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});Ze.warn(t.message)}}}async function Nu(r,e){try{const n=(await yl()).transaction(Er,"readwrite");await n.objectStore(Er).put(e,Il(r)),await n.done}catch(t){if(t instanceof rt)Ze.warn(t.message);else{const n=yt.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});Ze.warn(n.message)}}}function Il(r){return`${r.name}!${r.options.appId}`}/**
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
 */const lp=1024,hp=30*24*60*60*1e3;class dp{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new mp(t),this._heartbeatsCachePromise=this._storage.read().then(n=>(this._heartbeatsCache=n,n))}async triggerHeartbeat(){var e,t;try{const i=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),s=Ou();return((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)===null||t===void 0?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===s||this._heartbeatsCache.heartbeats.some(a=>a.date===s)?void 0:(this._heartbeatsCache.heartbeats.push({date:s,agent:i}),this._heartbeatsCache.heartbeats=this._heartbeatsCache.heartbeats.filter(a=>{const u=new Date(a.date).valueOf();return Date.now()-u<=hp}),this._storage.overwrite(this._heartbeatsCache))}catch(n){Ze.warn(n)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=Ou(),{heartbeatsToSend:n,unsentEntries:i}=fp(this._heartbeatsCache.heartbeats),s=ll(JSON.stringify({version:2,heartbeats:n}));return this._heartbeatsCache.lastSentHeartbeatDate=t,i.length>0?(this._heartbeatsCache.heartbeats=i,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(t){return Ze.warn(t),""}}}function Ou(){return new Date().toISOString().substring(0,10)}function fp(r,e=lp){const t=[];let n=r.slice();for(const i of r){const s=t.find(a=>a.agent===i.agent);if(s){if(s.dates.push(i.date),Mu(t)>e){s.dates.pop();break}}else if(t.push({agent:i.agent,dates:[i.date]}),Mu(t)>e){t.pop();break}n=n.slice(1)}return{heartbeatsToSend:t,unsentEntries:n}}class mp{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return pl()?Zf().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await cp(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){var t;if(await this._canUseIndexedDBPromise){const i=await this.read();return Nu(this.app,{lastSentHeartbeatDate:(t=e.lastSentHeartbeatDate)!==null&&t!==void 0?t:i.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){var t;if(await this._canUseIndexedDBPromise){const i=await this.read();return Nu(this.app,{lastSentHeartbeatDate:(t=e.lastSentHeartbeatDate)!==null&&t!==void 0?t:i.lastSentHeartbeatDate,heartbeats:[...i.heartbeats,...e.heartbeats]})}else return}}function Mu(r){return ll(JSON.stringify({version:2,heartbeats:r})).length}/**
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
 */function pp(r){Tn(new $t("platform-logger",e=>new bm(e),"PRIVATE")),Tn(new $t("heartbeat",e=>new dp(e),"PRIVATE")),It(so,ku,r),It(so,ku,"esm2017"),It("fire-js","")}pp("");var gp="firebase",_p="10.14.1";/**
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
 */It(gp,_p,"app");var Lu=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var zt,vl;(function(){var r;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(I,g){function y(){}y.prototype=g.prototype,I.D=g.prototype,I.prototype=new y,I.prototype.constructor=I,I.C=function(v,T,R){for(var _=Array(arguments.length-2),$e=2;$e<arguments.length;$e++)_[$e-2]=arguments[$e];return g.prototype[T].apply(v,_)}}function t(){this.blockSize=-1}function n(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.B=Array(this.blockSize),this.o=this.h=0,this.s()}e(n,t),n.prototype.s=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function i(I,g,y){y||(y=0);var v=Array(16);if(typeof g=="string")for(var T=0;16>T;++T)v[T]=g.charCodeAt(y++)|g.charCodeAt(y++)<<8|g.charCodeAt(y++)<<16|g.charCodeAt(y++)<<24;else for(T=0;16>T;++T)v[T]=g[y++]|g[y++]<<8|g[y++]<<16|g[y++]<<24;g=I.g[0],y=I.g[1],T=I.g[2];var R=I.g[3],_=g+(R^y&(T^R))+v[0]+3614090360&4294967295;g=y+(_<<7&4294967295|_>>>25),_=R+(T^g&(y^T))+v[1]+3905402710&4294967295,R=g+(_<<12&4294967295|_>>>20),_=T+(y^R&(g^y))+v[2]+606105819&4294967295,T=R+(_<<17&4294967295|_>>>15),_=y+(g^T&(R^g))+v[3]+3250441966&4294967295,y=T+(_<<22&4294967295|_>>>10),_=g+(R^y&(T^R))+v[4]+4118548399&4294967295,g=y+(_<<7&4294967295|_>>>25),_=R+(T^g&(y^T))+v[5]+1200080426&4294967295,R=g+(_<<12&4294967295|_>>>20),_=T+(y^R&(g^y))+v[6]+2821735955&4294967295,T=R+(_<<17&4294967295|_>>>15),_=y+(g^T&(R^g))+v[7]+4249261313&4294967295,y=T+(_<<22&4294967295|_>>>10),_=g+(R^y&(T^R))+v[8]+1770035416&4294967295,g=y+(_<<7&4294967295|_>>>25),_=R+(T^g&(y^T))+v[9]+2336552879&4294967295,R=g+(_<<12&4294967295|_>>>20),_=T+(y^R&(g^y))+v[10]+4294925233&4294967295,T=R+(_<<17&4294967295|_>>>15),_=y+(g^T&(R^g))+v[11]+2304563134&4294967295,y=T+(_<<22&4294967295|_>>>10),_=g+(R^y&(T^R))+v[12]+1804603682&4294967295,g=y+(_<<7&4294967295|_>>>25),_=R+(T^g&(y^T))+v[13]+4254626195&4294967295,R=g+(_<<12&4294967295|_>>>20),_=T+(y^R&(g^y))+v[14]+2792965006&4294967295,T=R+(_<<17&4294967295|_>>>15),_=y+(g^T&(R^g))+v[15]+1236535329&4294967295,y=T+(_<<22&4294967295|_>>>10),_=g+(T^R&(y^T))+v[1]+4129170786&4294967295,g=y+(_<<5&4294967295|_>>>27),_=R+(y^T&(g^y))+v[6]+3225465664&4294967295,R=g+(_<<9&4294967295|_>>>23),_=T+(g^y&(R^g))+v[11]+643717713&4294967295,T=R+(_<<14&4294967295|_>>>18),_=y+(R^g&(T^R))+v[0]+3921069994&4294967295,y=T+(_<<20&4294967295|_>>>12),_=g+(T^R&(y^T))+v[5]+3593408605&4294967295,g=y+(_<<5&4294967295|_>>>27),_=R+(y^T&(g^y))+v[10]+38016083&4294967295,R=g+(_<<9&4294967295|_>>>23),_=T+(g^y&(R^g))+v[15]+3634488961&4294967295,T=R+(_<<14&4294967295|_>>>18),_=y+(R^g&(T^R))+v[4]+3889429448&4294967295,y=T+(_<<20&4294967295|_>>>12),_=g+(T^R&(y^T))+v[9]+568446438&4294967295,g=y+(_<<5&4294967295|_>>>27),_=R+(y^T&(g^y))+v[14]+3275163606&4294967295,R=g+(_<<9&4294967295|_>>>23),_=T+(g^y&(R^g))+v[3]+4107603335&4294967295,T=R+(_<<14&4294967295|_>>>18),_=y+(R^g&(T^R))+v[8]+1163531501&4294967295,y=T+(_<<20&4294967295|_>>>12),_=g+(T^R&(y^T))+v[13]+2850285829&4294967295,g=y+(_<<5&4294967295|_>>>27),_=R+(y^T&(g^y))+v[2]+4243563512&4294967295,R=g+(_<<9&4294967295|_>>>23),_=T+(g^y&(R^g))+v[7]+1735328473&4294967295,T=R+(_<<14&4294967295|_>>>18),_=y+(R^g&(T^R))+v[12]+2368359562&4294967295,y=T+(_<<20&4294967295|_>>>12),_=g+(y^T^R)+v[5]+4294588738&4294967295,g=y+(_<<4&4294967295|_>>>28),_=R+(g^y^T)+v[8]+2272392833&4294967295,R=g+(_<<11&4294967295|_>>>21),_=T+(R^g^y)+v[11]+1839030562&4294967295,T=R+(_<<16&4294967295|_>>>16),_=y+(T^R^g)+v[14]+4259657740&4294967295,y=T+(_<<23&4294967295|_>>>9),_=g+(y^T^R)+v[1]+2763975236&4294967295,g=y+(_<<4&4294967295|_>>>28),_=R+(g^y^T)+v[4]+1272893353&4294967295,R=g+(_<<11&4294967295|_>>>21),_=T+(R^g^y)+v[7]+4139469664&4294967295,T=R+(_<<16&4294967295|_>>>16),_=y+(T^R^g)+v[10]+3200236656&4294967295,y=T+(_<<23&4294967295|_>>>9),_=g+(y^T^R)+v[13]+681279174&4294967295,g=y+(_<<4&4294967295|_>>>28),_=R+(g^y^T)+v[0]+3936430074&4294967295,R=g+(_<<11&4294967295|_>>>21),_=T+(R^g^y)+v[3]+3572445317&4294967295,T=R+(_<<16&4294967295|_>>>16),_=y+(T^R^g)+v[6]+76029189&4294967295,y=T+(_<<23&4294967295|_>>>9),_=g+(y^T^R)+v[9]+3654602809&4294967295,g=y+(_<<4&4294967295|_>>>28),_=R+(g^y^T)+v[12]+3873151461&4294967295,R=g+(_<<11&4294967295|_>>>21),_=T+(R^g^y)+v[15]+530742520&4294967295,T=R+(_<<16&4294967295|_>>>16),_=y+(T^R^g)+v[2]+3299628645&4294967295,y=T+(_<<23&4294967295|_>>>9),_=g+(T^(y|~R))+v[0]+4096336452&4294967295,g=y+(_<<6&4294967295|_>>>26),_=R+(y^(g|~T))+v[7]+1126891415&4294967295,R=g+(_<<10&4294967295|_>>>22),_=T+(g^(R|~y))+v[14]+2878612391&4294967295,T=R+(_<<15&4294967295|_>>>17),_=y+(R^(T|~g))+v[5]+4237533241&4294967295,y=T+(_<<21&4294967295|_>>>11),_=g+(T^(y|~R))+v[12]+1700485571&4294967295,g=y+(_<<6&4294967295|_>>>26),_=R+(y^(g|~T))+v[3]+2399980690&4294967295,R=g+(_<<10&4294967295|_>>>22),_=T+(g^(R|~y))+v[10]+4293915773&4294967295,T=R+(_<<15&4294967295|_>>>17),_=y+(R^(T|~g))+v[1]+2240044497&4294967295,y=T+(_<<21&4294967295|_>>>11),_=g+(T^(y|~R))+v[8]+1873313359&4294967295,g=y+(_<<6&4294967295|_>>>26),_=R+(y^(g|~T))+v[15]+4264355552&4294967295,R=g+(_<<10&4294967295|_>>>22),_=T+(g^(R|~y))+v[6]+2734768916&4294967295,T=R+(_<<15&4294967295|_>>>17),_=y+(R^(T|~g))+v[13]+1309151649&4294967295,y=T+(_<<21&4294967295|_>>>11),_=g+(T^(y|~R))+v[4]+4149444226&4294967295,g=y+(_<<6&4294967295|_>>>26),_=R+(y^(g|~T))+v[11]+3174756917&4294967295,R=g+(_<<10&4294967295|_>>>22),_=T+(g^(R|~y))+v[2]+718787259&4294967295,T=R+(_<<15&4294967295|_>>>17),_=y+(R^(T|~g))+v[9]+3951481745&4294967295,I.g[0]=I.g[0]+g&4294967295,I.g[1]=I.g[1]+(T+(_<<21&4294967295|_>>>11))&4294967295,I.g[2]=I.g[2]+T&4294967295,I.g[3]=I.g[3]+R&4294967295}n.prototype.u=function(I,g){g===void 0&&(g=I.length);for(var y=g-this.blockSize,v=this.B,T=this.h,R=0;R<g;){if(T==0)for(;R<=y;)i(this,I,R),R+=this.blockSize;if(typeof I=="string"){for(;R<g;)if(v[T++]=I.charCodeAt(R++),T==this.blockSize){i(this,v),T=0;break}}else for(;R<g;)if(v[T++]=I[R++],T==this.blockSize){i(this,v),T=0;break}}this.h=T,this.o+=g},n.prototype.v=function(){var I=Array((56>this.h?this.blockSize:2*this.blockSize)-this.h);I[0]=128;for(var g=1;g<I.length-8;++g)I[g]=0;var y=8*this.o;for(g=I.length-8;g<I.length;++g)I[g]=y&255,y/=256;for(this.u(I),I=Array(16),g=y=0;4>g;++g)for(var v=0;32>v;v+=8)I[y++]=this.g[g]>>>v&255;return I};function s(I,g){var y=u;return Object.prototype.hasOwnProperty.call(y,I)?y[I]:y[I]=g(I)}function a(I,g){this.h=g;for(var y=[],v=!0,T=I.length-1;0<=T;T--){var R=I[T]|0;v&&R==g||(y[T]=R,v=!1)}this.g=y}var u={};function c(I){return-128<=I&&128>I?s(I,function(g){return new a([g|0],0>g?-1:0)}):new a([I|0],0>I?-1:0)}function d(I){if(isNaN(I)||!isFinite(I))return p;if(0>I)return D(d(-I));for(var g=[],y=1,v=0;I>=y;v++)g[v]=I/y|0,y*=4294967296;return new a(g,0)}function m(I,g){if(I.length==0)throw Error("number format error: empty string");if(g=g||10,2>g||36<g)throw Error("radix out of range: "+g);if(I.charAt(0)=="-")return D(m(I.substring(1),g));if(0<=I.indexOf("-"))throw Error('number format error: interior "-" character');for(var y=d(Math.pow(g,8)),v=p,T=0;T<I.length;T+=8){var R=Math.min(8,I.length-T),_=parseInt(I.substring(T,T+R),g);8>R?(R=d(Math.pow(g,R)),v=v.j(R).add(d(_))):(v=v.j(y),v=v.add(d(_)))}return v}var p=c(0),E=c(1),S=c(16777216);r=a.prototype,r.m=function(){if(x(this))return-D(this).m();for(var I=0,g=1,y=0;y<this.g.length;y++){var v=this.i(y);I+=(0<=v?v:4294967296+v)*g,g*=4294967296}return I},r.toString=function(I){if(I=I||10,2>I||36<I)throw Error("radix out of range: "+I);if(V(this))return"0";if(x(this))return"-"+D(this).toString(I);for(var g=d(Math.pow(I,6)),y=this,v="";;){var T=Q(y,g).g;y=K(y,T.j(g));var R=((0<y.g.length?y.g[0]:y.h)>>>0).toString(I);if(y=T,V(y))return R+v;for(;6>R.length;)R="0"+R;v=R+v}},r.i=function(I){return 0>I?0:I<this.g.length?this.g[I]:this.h};function V(I){if(I.h!=0)return!1;for(var g=0;g<I.g.length;g++)if(I.g[g]!=0)return!1;return!0}function x(I){return I.h==-1}r.l=function(I){return I=K(this,I),x(I)?-1:V(I)?0:1};function D(I){for(var g=I.g.length,y=[],v=0;v<g;v++)y[v]=~I.g[v];return new a(y,~I.h).add(E)}r.abs=function(){return x(this)?D(this):this},r.add=function(I){for(var g=Math.max(this.g.length,I.g.length),y=[],v=0,T=0;T<=g;T++){var R=v+(this.i(T)&65535)+(I.i(T)&65535),_=(R>>>16)+(this.i(T)>>>16)+(I.i(T)>>>16);v=_>>>16,R&=65535,_&=65535,y[T]=_<<16|R}return new a(y,y[y.length-1]&-2147483648?-1:0)};function K(I,g){return I.add(D(g))}r.j=function(I){if(V(this)||V(I))return p;if(x(this))return x(I)?D(this).j(D(I)):D(D(this).j(I));if(x(I))return D(this.j(D(I)));if(0>this.l(S)&&0>I.l(S))return d(this.m()*I.m());for(var g=this.g.length+I.g.length,y=[],v=0;v<2*g;v++)y[v]=0;for(v=0;v<this.g.length;v++)for(var T=0;T<I.g.length;T++){var R=this.i(v)>>>16,_=this.i(v)&65535,$e=I.i(T)>>>16,jn=I.i(T)&65535;y[2*v+2*T]+=_*jn,j(y,2*v+2*T),y[2*v+2*T+1]+=R*jn,j(y,2*v+2*T+1),y[2*v+2*T+1]+=_*$e,j(y,2*v+2*T+1),y[2*v+2*T+2]+=R*$e,j(y,2*v+2*T+2)}for(v=0;v<g;v++)y[v]=y[2*v+1]<<16|y[2*v];for(v=g;v<2*g;v++)y[v]=0;return new a(y,0)};function j(I,g){for(;(I[g]&65535)!=I[g];)I[g+1]+=I[g]>>>16,I[g]&=65535,g++}function B(I,g){this.g=I,this.h=g}function Q(I,g){if(V(g))throw Error("division by zero");if(V(I))return new B(p,p);if(x(I))return g=Q(D(I),g),new B(D(g.g),D(g.h));if(x(g))return g=Q(I,D(g)),new B(D(g.g),g.h);if(30<I.g.length){if(x(I)||x(g))throw Error("slowDivide_ only works with positive integers.");for(var y=E,v=g;0>=v.l(I);)y=X(y),v=X(v);var T=G(y,1),R=G(v,1);for(v=G(v,2),y=G(y,2);!V(v);){var _=R.add(v);0>=_.l(I)&&(T=T.add(y),R=_),v=G(v,1),y=G(y,1)}return g=K(I,T.j(g)),new B(T,g)}for(T=p;0<=I.l(g);){for(y=Math.max(1,Math.floor(I.m()/g.m())),v=Math.ceil(Math.log(y)/Math.LN2),v=48>=v?1:Math.pow(2,v-48),R=d(y),_=R.j(g);x(_)||0<_.l(I);)y-=v,R=d(y),_=R.j(g);V(R)&&(R=E),T=T.add(R),I=K(I,_)}return new B(T,I)}r.A=function(I){return Q(this,I).h},r.and=function(I){for(var g=Math.max(this.g.length,I.g.length),y=[],v=0;v<g;v++)y[v]=this.i(v)&I.i(v);return new a(y,this.h&I.h)},r.or=function(I){for(var g=Math.max(this.g.length,I.g.length),y=[],v=0;v<g;v++)y[v]=this.i(v)|I.i(v);return new a(y,this.h|I.h)},r.xor=function(I){for(var g=Math.max(this.g.length,I.g.length),y=[],v=0;v<g;v++)y[v]=this.i(v)^I.i(v);return new a(y,this.h^I.h)};function X(I){for(var g=I.g.length+1,y=[],v=0;v<g;v++)y[v]=I.i(v)<<1|I.i(v-1)>>>31;return new a(y,I.h)}function G(I,g){var y=g>>5;g%=32;for(var v=I.g.length-y,T=[],R=0;R<v;R++)T[R]=0<g?I.i(R+y)>>>g|I.i(R+y+1)<<32-g:I.i(R+y);return new a(T,I.h)}n.prototype.digest=n.prototype.v,n.prototype.reset=n.prototype.s,n.prototype.update=n.prototype.u,vl=n,a.prototype.add=a.prototype.add,a.prototype.multiply=a.prototype.j,a.prototype.modulo=a.prototype.A,a.prototype.compare=a.prototype.l,a.prototype.toNumber=a.prototype.m,a.prototype.toString=a.prototype.toString,a.prototype.getBits=a.prototype.i,a.fromNumber=d,a.fromString=m,zt=a}).apply(typeof Lu<"u"?Lu:typeof self<"u"?self:typeof window<"u"?window:{});var di=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Tl,cr,El,Ii,uo,wl,Al,Rl;(function(){var r,e=typeof Object.defineProperties=="function"?Object.defineProperty:function(o,l,h){return o==Array.prototype||o==Object.prototype||(o[l]=h.value),o};function t(o){o=[typeof globalThis=="object"&&globalThis,o,typeof window=="object"&&window,typeof self=="object"&&self,typeof di=="object"&&di];for(var l=0;l<o.length;++l){var h=o[l];if(h&&h.Math==Math)return h}throw Error("Cannot find global object")}var n=t(this);function i(o,l){if(l)e:{var h=n;o=o.split(".");for(var f=0;f<o.length-1;f++){var w=o[f];if(!(w in h))break e;h=h[w]}o=o[o.length-1],f=h[o],l=l(f),l!=f&&l!=null&&e(h,o,{configurable:!0,writable:!0,value:l})}}function s(o,l){o instanceof String&&(o+="");var h=0,f=!1,w={next:function(){if(!f&&h<o.length){var b=h++;return{value:l(b,o[b]),done:!1}}return f=!0,{done:!0,value:void 0}}};return w[Symbol.iterator]=function(){return w},w}i("Array.prototype.values",function(o){return o||function(){return s(this,function(l,h){return h})}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var a=a||{},u=this||self;function c(o){var l=typeof o;return l=l!="object"?l:o?Array.isArray(o)?"array":l:"null",l=="array"||l=="object"&&typeof o.length=="number"}function d(o){var l=typeof o;return l=="object"&&o!=null||l=="function"}function m(o,l,h){return o.call.apply(o.bind,arguments)}function p(o,l,h){if(!o)throw Error();if(2<arguments.length){var f=Array.prototype.slice.call(arguments,2);return function(){var w=Array.prototype.slice.call(arguments);return Array.prototype.unshift.apply(w,f),o.apply(l,w)}}return function(){return o.apply(l,arguments)}}function E(o,l,h){return E=Function.prototype.bind&&Function.prototype.bind.toString().indexOf("native code")!=-1?m:p,E.apply(null,arguments)}function S(o,l){var h=Array.prototype.slice.call(arguments,1);return function(){var f=h.slice();return f.push.apply(f,arguments),o.apply(this,f)}}function V(o,l){function h(){}h.prototype=l.prototype,o.aa=l.prototype,o.prototype=new h,o.prototype.constructor=o,o.Qb=function(f,w,b){for(var k=Array(arguments.length-2),te=2;te<arguments.length;te++)k[te-2]=arguments[te];return l.prototype[w].apply(f,k)}}function x(o){const l=o.length;if(0<l){const h=Array(l);for(let f=0;f<l;f++)h[f]=o[f];return h}return[]}function D(o,l){for(let h=1;h<arguments.length;h++){const f=arguments[h];if(c(f)){const w=o.length||0,b=f.length||0;o.length=w+b;for(let k=0;k<b;k++)o[w+k]=f[k]}else o.push(f)}}class K{constructor(l,h){this.i=l,this.j=h,this.h=0,this.g=null}get(){let l;return 0<this.h?(this.h--,l=this.g,this.g=l.next,l.next=null):l=this.i(),l}}function j(o){return/^[\s\xa0]*$/.test(o)}function B(){var o=u.navigator;return o&&(o=o.userAgent)?o:""}function Q(o){return Q[" "](o),o}Q[" "]=function(){};var X=B().indexOf("Gecko")!=-1&&!(B().toLowerCase().indexOf("webkit")!=-1&&B().indexOf("Edge")==-1)&&!(B().indexOf("Trident")!=-1||B().indexOf("MSIE")!=-1)&&B().indexOf("Edge")==-1;function G(o,l,h){for(const f in o)l.call(h,o[f],f,o)}function I(o,l){for(const h in o)l.call(void 0,o[h],h,o)}function g(o){const l={};for(const h in o)l[h]=o[h];return l}const y="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function v(o,l){let h,f;for(let w=1;w<arguments.length;w++){f=arguments[w];for(h in f)o[h]=f[h];for(let b=0;b<y.length;b++)h=y[b],Object.prototype.hasOwnProperty.call(f,h)&&(o[h]=f[h])}}function T(o){var l=1;o=o.split(":");const h=[];for(;0<l&&o.length;)h.push(o.shift()),l--;return o.length&&h.push(o.join(":")),h}function R(o){u.setTimeout(()=>{throw o},0)}function _(){var o=vs;let l=null;return o.g&&(l=o.g,o.g=o.g.next,o.g||(o.h=null),l.next=null),l}class $e{constructor(){this.h=this.g=null}add(l,h){const f=jn.get();f.set(l,h),this.h?this.h.next=f:this.g=f,this.h=f}}var jn=new K(()=>new nf,o=>o.reset());class nf{constructor(){this.next=this.g=this.h=null}set(l,h){this.h=l,this.g=h,this.next=null}reset(){this.next=this.g=this.h=null}}let qn,zn=!1,vs=new $e,Sa=()=>{const o=u.Promise.resolve(void 0);qn=()=>{o.then(rf)}};var rf=()=>{for(var o;o=_();){try{o.h.call(o.g)}catch(h){R(h)}var l=jn;l.j(o),100>l.h&&(l.h++,o.next=l.g,l.g=o)}zn=!1};function it(){this.s=this.s,this.C=this.C}it.prototype.s=!1,it.prototype.ma=function(){this.s||(this.s=!0,this.N())},it.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function ye(o,l){this.type=o,this.g=this.target=l,this.defaultPrevented=!1}ye.prototype.h=function(){this.defaultPrevented=!0};var sf=function(){if(!u.addEventListener||!Object.defineProperty)return!1;var o=!1,l=Object.defineProperty({},"passive",{get:function(){o=!0}});try{const h=()=>{};u.addEventListener("test",h,l),u.removeEventListener("test",h,l)}catch{}return o}();function Kn(o,l){if(ye.call(this,o?o.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,o){var h=this.type=o.type,f=o.changedTouches&&o.changedTouches.length?o.changedTouches[0]:null;if(this.target=o.target||o.srcElement,this.g=l,l=o.relatedTarget){if(X){e:{try{Q(l.nodeName);var w=!0;break e}catch{}w=!1}w||(l=null)}}else h=="mouseover"?l=o.fromElement:h=="mouseout"&&(l=o.toElement);this.relatedTarget=l,f?(this.clientX=f.clientX!==void 0?f.clientX:f.pageX,this.clientY=f.clientY!==void 0?f.clientY:f.pageY,this.screenX=f.screenX||0,this.screenY=f.screenY||0):(this.clientX=o.clientX!==void 0?o.clientX:o.pageX,this.clientY=o.clientY!==void 0?o.clientY:o.pageY,this.screenX=o.screenX||0,this.screenY=o.screenY||0),this.button=o.button,this.key=o.key||"",this.ctrlKey=o.ctrlKey,this.altKey=o.altKey,this.shiftKey=o.shiftKey,this.metaKey=o.metaKey,this.pointerId=o.pointerId||0,this.pointerType=typeof o.pointerType=="string"?o.pointerType:of[o.pointerType]||"",this.state=o.state,this.i=o,o.defaultPrevented&&Kn.aa.h.call(this)}}V(Kn,ye);var of={2:"touch",3:"pen",4:"mouse"};Kn.prototype.h=function(){Kn.aa.h.call(this);var o=this.i;o.preventDefault?o.preventDefault():o.returnValue=!1};var Wr="closure_listenable_"+(1e6*Math.random()|0),af=0;function uf(o,l,h,f,w){this.listener=o,this.proxy=null,this.src=l,this.type=h,this.capture=!!f,this.ha=w,this.key=++af,this.da=this.fa=!1}function Hr(o){o.da=!0,o.listener=null,o.proxy=null,o.src=null,o.ha=null}function Qr(o){this.src=o,this.g={},this.h=0}Qr.prototype.add=function(o,l,h,f,w){var b=o.toString();o=this.g[b],o||(o=this.g[b]=[],this.h++);var k=Es(o,l,f,w);return-1<k?(l=o[k],h||(l.fa=!1)):(l=new uf(l,this.src,b,!!f,w),l.fa=h,o.push(l)),l};function Ts(o,l){var h=l.type;if(h in o.g){var f=o.g[h],w=Array.prototype.indexOf.call(f,l,void 0),b;(b=0<=w)&&Array.prototype.splice.call(f,w,1),b&&(Hr(l),o.g[h].length==0&&(delete o.g[h],o.h--))}}function Es(o,l,h,f){for(var w=0;w<o.length;++w){var b=o[w];if(!b.da&&b.listener==l&&b.capture==!!h&&b.ha==f)return w}return-1}var ws="closure_lm_"+(1e6*Math.random()|0),As={};function Pa(o,l,h,f,w){if(Array.isArray(l)){for(var b=0;b<l.length;b++)Pa(o,l[b],h,f,w);return null}return h=Da(h),o&&o[Wr]?o.K(l,h,d(f)?!!f.capture:!1,w):cf(o,l,h,!1,f,w)}function cf(o,l,h,f,w,b){if(!l)throw Error("Invalid event type");var k=d(w)?!!w.capture:!!w,te=bs(o);if(te||(o[ws]=te=new Qr(o)),h=te.add(l,h,f,k,b),h.proxy)return h;if(f=lf(),h.proxy=f,f.src=o,f.listener=h,o.addEventListener)sf||(w=k),w===void 0&&(w=!1),o.addEventListener(l.toString(),f,w);else if(o.attachEvent)o.attachEvent(Va(l.toString()),f);else if(o.addListener&&o.removeListener)o.addListener(f);else throw Error("addEventListener and attachEvent are unavailable.");return h}function lf(){function o(h){return l.call(o.src,o.listener,h)}const l=hf;return o}function Ca(o,l,h,f,w){if(Array.isArray(l))for(var b=0;b<l.length;b++)Ca(o,l[b],h,f,w);else f=d(f)?!!f.capture:!!f,h=Da(h),o&&o[Wr]?(o=o.i,l=String(l).toString(),l in o.g&&(b=o.g[l],h=Es(b,h,f,w),-1<h&&(Hr(b[h]),Array.prototype.splice.call(b,h,1),b.length==0&&(delete o.g[l],o.h--)))):o&&(o=bs(o))&&(l=o.g[l.toString()],o=-1,l&&(o=Es(l,h,f,w)),(h=-1<o?l[o]:null)&&Rs(h))}function Rs(o){if(typeof o!="number"&&o&&!o.da){var l=o.src;if(l&&l[Wr])Ts(l.i,o);else{var h=o.type,f=o.proxy;l.removeEventListener?l.removeEventListener(h,f,o.capture):l.detachEvent?l.detachEvent(Va(h),f):l.addListener&&l.removeListener&&l.removeListener(f),(h=bs(l))?(Ts(h,o),h.h==0&&(h.src=null,l[ws]=null)):Hr(o)}}}function Va(o){return o in As?As[o]:As[o]="on"+o}function hf(o,l){if(o.da)o=!0;else{l=new Kn(l,this);var h=o.listener,f=o.ha||o.src;o.fa&&Rs(o),o=h.call(f,l)}return o}function bs(o){return o=o[ws],o instanceof Qr?o:null}var Ss="__closure_events_fn_"+(1e9*Math.random()>>>0);function Da(o){return typeof o=="function"?o:(o[Ss]||(o[Ss]=function(l){return o.handleEvent(l)}),o[Ss])}function Ie(){it.call(this),this.i=new Qr(this),this.M=this,this.F=null}V(Ie,it),Ie.prototype[Wr]=!0,Ie.prototype.removeEventListener=function(o,l,h,f){Ca(this,o,l,h,f)};function Ae(o,l){var h,f=o.F;if(f)for(h=[];f;f=f.F)h.push(f);if(o=o.M,f=l.type||l,typeof l=="string")l=new ye(l,o);else if(l instanceof ye)l.target=l.target||o;else{var w=l;l=new ye(f,o),v(l,w)}if(w=!0,h)for(var b=h.length-1;0<=b;b--){var k=l.g=h[b];w=Jr(k,f,!0,l)&&w}if(k=l.g=o,w=Jr(k,f,!0,l)&&w,w=Jr(k,f,!1,l)&&w,h)for(b=0;b<h.length;b++)k=l.g=h[b],w=Jr(k,f,!1,l)&&w}Ie.prototype.N=function(){if(Ie.aa.N.call(this),this.i){var o=this.i,l;for(l in o.g){for(var h=o.g[l],f=0;f<h.length;f++)Hr(h[f]);delete o.g[l],o.h--}}this.F=null},Ie.prototype.K=function(o,l,h,f){return this.i.add(String(o),l,!1,h,f)},Ie.prototype.L=function(o,l,h,f){return this.i.add(String(o),l,!0,h,f)};function Jr(o,l,h,f){if(l=o.i.g[String(l)],!l)return!0;l=l.concat();for(var w=!0,b=0;b<l.length;++b){var k=l[b];if(k&&!k.da&&k.capture==h){var te=k.listener,ge=k.ha||k.src;k.fa&&Ts(o.i,k),w=te.call(ge,f)!==!1&&w}}return w&&!f.defaultPrevented}function ka(o,l,h){if(typeof o=="function")h&&(o=E(o,h));else if(o&&typeof o.handleEvent=="function")o=E(o.handleEvent,o);else throw Error("Invalid listener argument");return 2147483647<Number(l)?-1:u.setTimeout(o,l||0)}function xa(o){o.g=ka(()=>{o.g=null,o.i&&(o.i=!1,xa(o))},o.l);const l=o.h;o.h=null,o.m.apply(null,l)}class df extends it{constructor(l,h){super(),this.m=l,this.l=h,this.h=null,this.i=!1,this.g=null}j(l){this.h=arguments,this.g?this.i=!0:xa(this)}N(){super.N(),this.g&&(u.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function $n(o){it.call(this),this.h=o,this.g={}}V($n,it);var Na=[];function Oa(o){G(o.g,function(l,h){this.g.hasOwnProperty(h)&&Rs(l)},o),o.g={}}$n.prototype.N=function(){$n.aa.N.call(this),Oa(this)},$n.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Ps=u.JSON.stringify,ff=u.JSON.parse,mf=class{stringify(o){return u.JSON.stringify(o,void 0)}parse(o){return u.JSON.parse(o,void 0)}};function Cs(){}Cs.prototype.h=null;function Ma(o){return o.h||(o.h=o.i())}function La(){}var Gn={OPEN:"a",kb:"b",Ja:"c",wb:"d"};function Vs(){ye.call(this,"d")}V(Vs,ye);function Ds(){ye.call(this,"c")}V(Ds,ye);var kt={},Fa=null;function Yr(){return Fa=Fa||new Ie}kt.La="serverreachability";function Ua(o){ye.call(this,kt.La,o)}V(Ua,ye);function Wn(o){const l=Yr();Ae(l,new Ua(l))}kt.STAT_EVENT="statevent";function Ba(o,l){ye.call(this,kt.STAT_EVENT,o),this.stat=l}V(Ba,ye);function Re(o){const l=Yr();Ae(l,new Ba(l,o))}kt.Ma="timingevent";function ja(o,l){ye.call(this,kt.Ma,o),this.size=l}V(ja,ye);function Hn(o,l){if(typeof o!="function")throw Error("Fn must not be null and must be a function");return u.setTimeout(function(){o()},l)}function Qn(){this.g=!0}Qn.prototype.xa=function(){this.g=!1};function pf(o,l,h,f,w,b){o.info(function(){if(o.g)if(b)for(var k="",te=b.split("&"),ge=0;ge<te.length;ge++){var Y=te[ge].split("=");if(1<Y.length){var ve=Y[0];Y=Y[1];var Te=ve.split("_");k=2<=Te.length&&Te[1]=="type"?k+(ve+"="+Y+"&"):k+(ve+"=redacted&")}}else k=null;else k=b;return"XMLHTTP REQ ("+f+") [attempt "+w+"]: "+l+`
`+h+`
`+k})}function gf(o,l,h,f,w,b,k){o.info(function(){return"XMLHTTP RESP ("+f+") [ attempt "+w+"]: "+l+`
`+h+`
`+b+" "+k})}function tn(o,l,h,f){o.info(function(){return"XMLHTTP TEXT ("+l+"): "+yf(o,h)+(f?" "+f:"")})}function _f(o,l){o.info(function(){return"TIMEOUT: "+l})}Qn.prototype.info=function(){};function yf(o,l){if(!o.g)return l;if(!l)return null;try{var h=JSON.parse(l);if(h){for(o=0;o<h.length;o++)if(Array.isArray(h[o])){var f=h[o];if(!(2>f.length)){var w=f[1];if(Array.isArray(w)&&!(1>w.length)){var b=w[0];if(b!="noop"&&b!="stop"&&b!="close")for(var k=1;k<w.length;k++)w[k]=""}}}}return Ps(h)}catch{return l}}var Xr={NO_ERROR:0,gb:1,tb:2,sb:3,nb:4,rb:5,ub:6,Ia:7,TIMEOUT:8,xb:9},qa={lb:"complete",Hb:"success",Ja:"error",Ia:"abort",zb:"ready",Ab:"readystatechange",TIMEOUT:"timeout",vb:"incrementaldata",yb:"progress",ob:"downloadprogress",Pb:"uploadprogress"},ks;function Zr(){}V(Zr,Cs),Zr.prototype.g=function(){return new XMLHttpRequest},Zr.prototype.i=function(){return{}},ks=new Zr;function st(o,l,h,f){this.j=o,this.i=l,this.l=h,this.R=f||1,this.U=new $n(this),this.I=45e3,this.H=null,this.o=!1,this.m=this.A=this.v=this.L=this.F=this.S=this.B=null,this.D=[],this.g=null,this.C=0,this.s=this.u=null,this.X=-1,this.J=!1,this.O=0,this.M=null,this.W=this.K=this.T=this.P=!1,this.h=new za}function za(){this.i=null,this.g="",this.h=!1}var Ka={},xs={};function Ns(o,l,h){o.L=1,o.v=ri(Ge(l)),o.m=h,o.P=!0,$a(o,null)}function $a(o,l){o.F=Date.now(),ei(o),o.A=Ge(o.v);var h=o.A,f=o.R;Array.isArray(f)||(f=[String(f)]),su(h.i,"t",f),o.C=0,h=o.j.J,o.h=new za,o.g=wu(o.j,h?l:null,!o.m),0<o.O&&(o.M=new df(E(o.Y,o,o.g),o.O)),l=o.U,h=o.g,f=o.ca;var w="readystatechange";Array.isArray(w)||(w&&(Na[0]=w.toString()),w=Na);for(var b=0;b<w.length;b++){var k=Pa(h,w[b],f||l.handleEvent,!1,l.h||l);if(!k)break;l.g[k.key]=k}l=o.H?g(o.H):{},o.m?(o.u||(o.u="POST"),l["Content-Type"]="application/x-www-form-urlencoded",o.g.ea(o.A,o.u,o.m,l)):(o.u="GET",o.g.ea(o.A,o.u,null,l)),Wn(),pf(o.i,o.u,o.A,o.l,o.R,o.m)}st.prototype.ca=function(o){o=o.target;const l=this.M;l&&We(o)==3?l.j():this.Y(o)},st.prototype.Y=function(o){try{if(o==this.g)e:{const Te=We(this.g);var l=this.g.Ba();const sn=this.g.Z();if(!(3>Te)&&(Te!=3||this.g&&(this.h.h||this.g.oa()||du(this.g)))){this.J||Te!=4||l==7||(l==8||0>=sn?Wn(3):Wn(2)),Os(this);var h=this.g.Z();this.X=h;t:if(Ga(this)){var f=du(this.g);o="";var w=f.length,b=We(this.g)==4;if(!this.h.i){if(typeof TextDecoder>"u"){xt(this),Jn(this);var k="";break t}this.h.i=new u.TextDecoder}for(l=0;l<w;l++)this.h.h=!0,o+=this.h.i.decode(f[l],{stream:!(b&&l==w-1)});f.length=0,this.h.g+=o,this.C=0,k=this.h.g}else k=this.g.oa();if(this.o=h==200,gf(this.i,this.u,this.A,this.l,this.R,Te,h),this.o){if(this.T&&!this.K){t:{if(this.g){var te,ge=this.g;if((te=ge.g?ge.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!j(te)){var Y=te;break t}}Y=null}if(h=Y)tn(this.i,this.l,h,"Initial handshake response via X-HTTP-Initial-Response"),this.K=!0,Ms(this,h);else{this.o=!1,this.s=3,Re(12),xt(this),Jn(this);break e}}if(this.P){h=!0;let Ue;for(;!this.J&&this.C<k.length;)if(Ue=If(this,k),Ue==xs){Te==4&&(this.s=4,Re(14),h=!1),tn(this.i,this.l,null,"[Incomplete Response]");break}else if(Ue==Ka){this.s=4,Re(15),tn(this.i,this.l,k,"[Invalid Chunk]"),h=!1;break}else tn(this.i,this.l,Ue,null),Ms(this,Ue);if(Ga(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),Te!=4||k.length!=0||this.h.h||(this.s=1,Re(16),h=!1),this.o=this.o&&h,!h)tn(this.i,this.l,k,"[Invalid Chunked Response]"),xt(this),Jn(this);else if(0<k.length&&!this.W){this.W=!0;var ve=this.j;ve.g==this&&ve.ba&&!ve.M&&(ve.j.info("Great, no buffering proxy detected. Bytes received: "+k.length),qs(ve),ve.M=!0,Re(11))}}else tn(this.i,this.l,k,null),Ms(this,k);Te==4&&xt(this),this.o&&!this.J&&(Te==4?Iu(this.j,this):(this.o=!1,ei(this)))}else Mf(this.g),h==400&&0<k.indexOf("Unknown SID")?(this.s=3,Re(12)):(this.s=0,Re(13)),xt(this),Jn(this)}}}catch{}finally{}};function Ga(o){return o.g?o.u=="GET"&&o.L!=2&&o.j.Ca:!1}function If(o,l){var h=o.C,f=l.indexOf(`
`,h);return f==-1?xs:(h=Number(l.substring(h,f)),isNaN(h)?Ka:(f+=1,f+h>l.length?xs:(l=l.slice(f,f+h),o.C=f+h,l)))}st.prototype.cancel=function(){this.J=!0,xt(this)};function ei(o){o.S=Date.now()+o.I,Wa(o,o.I)}function Wa(o,l){if(o.B!=null)throw Error("WatchDog timer not null");o.B=Hn(E(o.ba,o),l)}function Os(o){o.B&&(u.clearTimeout(o.B),o.B=null)}st.prototype.ba=function(){this.B=null;const o=Date.now();0<=o-this.S?(_f(this.i,this.A),this.L!=2&&(Wn(),Re(17)),xt(this),this.s=2,Jn(this)):Wa(this,this.S-o)};function Jn(o){o.j.G==0||o.J||Iu(o.j,o)}function xt(o){Os(o);var l=o.M;l&&typeof l.ma=="function"&&l.ma(),o.M=null,Oa(o.U),o.g&&(l=o.g,o.g=null,l.abort(),l.ma())}function Ms(o,l){try{var h=o.j;if(h.G!=0&&(h.g==o||Ls(h.h,o))){if(!o.K&&Ls(h.h,o)&&h.G==3){try{var f=h.Da.g.parse(l)}catch{f=null}if(Array.isArray(f)&&f.length==3){var w=f;if(w[0]==0){e:if(!h.u){if(h.g)if(h.g.F+3e3<o.F)ci(h),ai(h);else break e;js(h),Re(18)}}else h.za=w[1],0<h.za-h.T&&37500>w[2]&&h.F&&h.v==0&&!h.C&&(h.C=Hn(E(h.Za,h),6e3));if(1>=Ja(h.h)&&h.ca){try{h.ca()}catch{}h.ca=void 0}}else Ot(h,11)}else if((o.K||h.g==o)&&ci(h),!j(l))for(w=h.Da.g.parse(l),l=0;l<w.length;l++){let Y=w[l];if(h.T=Y[0],Y=Y[1],h.G==2)if(Y[0]=="c"){h.K=Y[1],h.ia=Y[2];const ve=Y[3];ve!=null&&(h.la=ve,h.j.info("VER="+h.la));const Te=Y[4];Te!=null&&(h.Aa=Te,h.j.info("SVER="+h.Aa));const sn=Y[5];sn!=null&&typeof sn=="number"&&0<sn&&(f=1.5*sn,h.L=f,h.j.info("backChannelRequestTimeoutMs_="+f)),f=h;const Ue=o.g;if(Ue){const hi=Ue.g?Ue.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(hi){var b=f.h;b.g||hi.indexOf("spdy")==-1&&hi.indexOf("quic")==-1&&hi.indexOf("h2")==-1||(b.j=b.l,b.g=new Set,b.h&&(Fs(b,b.h),b.h=null))}if(f.D){const zs=Ue.g?Ue.g.getResponseHeader("X-HTTP-Session-Id"):null;zs&&(f.ya=zs,ie(f.I,f.D,zs))}}h.G=3,h.l&&h.l.ua(),h.ba&&(h.R=Date.now()-o.F,h.j.info("Handshake RTT: "+h.R+"ms")),f=h;var k=o;if(f.qa=Eu(f,f.J?f.ia:null,f.W),k.K){Ya(f.h,k);var te=k,ge=f.L;ge&&(te.I=ge),te.B&&(Os(te),ei(te)),f.g=k}else _u(f);0<h.i.length&&ui(h)}else Y[0]!="stop"&&Y[0]!="close"||Ot(h,7);else h.G==3&&(Y[0]=="stop"||Y[0]=="close"?Y[0]=="stop"?Ot(h,7):Bs(h):Y[0]!="noop"&&h.l&&h.l.ta(Y),h.v=0)}}Wn(4)}catch{}}var vf=class{constructor(o,l){this.g=o,this.map=l}};function Ha(o){this.l=o||10,u.PerformanceNavigationTiming?(o=u.performance.getEntriesByType("navigation"),o=0<o.length&&(o[0].nextHopProtocol=="hq"||o[0].nextHopProtocol=="h2")):o=!!(u.chrome&&u.chrome.loadTimes&&u.chrome.loadTimes()&&u.chrome.loadTimes().wasFetchedViaSpdy),this.j=o?this.l:1,this.g=null,1<this.j&&(this.g=new Set),this.h=null,this.i=[]}function Qa(o){return o.h?!0:o.g?o.g.size>=o.j:!1}function Ja(o){return o.h?1:o.g?o.g.size:0}function Ls(o,l){return o.h?o.h==l:o.g?o.g.has(l):!1}function Fs(o,l){o.g?o.g.add(l):o.h=l}function Ya(o,l){o.h&&o.h==l?o.h=null:o.g&&o.g.has(l)&&o.g.delete(l)}Ha.prototype.cancel=function(){if(this.i=Xa(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const o of this.g.values())o.cancel();this.g.clear()}};function Xa(o){if(o.h!=null)return o.i.concat(o.h.D);if(o.g!=null&&o.g.size!==0){let l=o.i;for(const h of o.g.values())l=l.concat(h.D);return l}return x(o.i)}function Tf(o){if(o.V&&typeof o.V=="function")return o.V();if(typeof Map<"u"&&o instanceof Map||typeof Set<"u"&&o instanceof Set)return Array.from(o.values());if(typeof o=="string")return o.split("");if(c(o)){for(var l=[],h=o.length,f=0;f<h;f++)l.push(o[f]);return l}l=[],h=0;for(f in o)l[h++]=o[f];return l}function Ef(o){if(o.na&&typeof o.na=="function")return o.na();if(!o.V||typeof o.V!="function"){if(typeof Map<"u"&&o instanceof Map)return Array.from(o.keys());if(!(typeof Set<"u"&&o instanceof Set)){if(c(o)||typeof o=="string"){var l=[];o=o.length;for(var h=0;h<o;h++)l.push(h);return l}l=[],h=0;for(const f in o)l[h++]=f;return l}}}function Za(o,l){if(o.forEach&&typeof o.forEach=="function")o.forEach(l,void 0);else if(c(o)||typeof o=="string")Array.prototype.forEach.call(o,l,void 0);else for(var h=Ef(o),f=Tf(o),w=f.length,b=0;b<w;b++)l.call(void 0,f[b],h&&h[b],o)}var eu=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function wf(o,l){if(o){o=o.split("&");for(var h=0;h<o.length;h++){var f=o[h].indexOf("="),w=null;if(0<=f){var b=o[h].substring(0,f);w=o[h].substring(f+1)}else b=o[h];l(b,w?decodeURIComponent(w.replace(/\+/g," ")):"")}}}function Nt(o){if(this.g=this.o=this.j="",this.s=null,this.m=this.l="",this.h=!1,o instanceof Nt){this.h=o.h,ti(this,o.j),this.o=o.o,this.g=o.g,ni(this,o.s),this.l=o.l;var l=o.i,h=new Zn;h.i=l.i,l.g&&(h.g=new Map(l.g),h.h=l.h),tu(this,h),this.m=o.m}else o&&(l=String(o).match(eu))?(this.h=!1,ti(this,l[1]||"",!0),this.o=Yn(l[2]||""),this.g=Yn(l[3]||"",!0),ni(this,l[4]),this.l=Yn(l[5]||"",!0),tu(this,l[6]||"",!0),this.m=Yn(l[7]||"")):(this.h=!1,this.i=new Zn(null,this.h))}Nt.prototype.toString=function(){var o=[],l=this.j;l&&o.push(Xn(l,nu,!0),":");var h=this.g;return(h||l=="file")&&(o.push("//"),(l=this.o)&&o.push(Xn(l,nu,!0),"@"),o.push(encodeURIComponent(String(h)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),h=this.s,h!=null&&o.push(":",String(h))),(h=this.l)&&(this.g&&h.charAt(0)!="/"&&o.push("/"),o.push(Xn(h,h.charAt(0)=="/"?bf:Rf,!0))),(h=this.i.toString())&&o.push("?",h),(h=this.m)&&o.push("#",Xn(h,Pf)),o.join("")};function Ge(o){return new Nt(o)}function ti(o,l,h){o.j=h?Yn(l,!0):l,o.j&&(o.j=o.j.replace(/:$/,""))}function ni(o,l){if(l){if(l=Number(l),isNaN(l)||0>l)throw Error("Bad port number "+l);o.s=l}else o.s=null}function tu(o,l,h){l instanceof Zn?(o.i=l,Cf(o.i,o.h)):(h||(l=Xn(l,Sf)),o.i=new Zn(l,o.h))}function ie(o,l,h){o.i.set(l,h)}function ri(o){return ie(o,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^Date.now()).toString(36)),o}function Yn(o,l){return o?l?decodeURI(o.replace(/%25/g,"%2525")):decodeURIComponent(o):""}function Xn(o,l,h){return typeof o=="string"?(o=encodeURI(o).replace(l,Af),h&&(o=o.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),o):null}function Af(o){return o=o.charCodeAt(0),"%"+(o>>4&15).toString(16)+(o&15).toString(16)}var nu=/[#\/\?@]/g,Rf=/[#\?:]/g,bf=/[#\?]/g,Sf=/[#\?@]/g,Pf=/#/g;function Zn(o,l){this.h=this.g=null,this.i=o||null,this.j=!!l}function ot(o){o.g||(o.g=new Map,o.h=0,o.i&&wf(o.i,function(l,h){o.add(decodeURIComponent(l.replace(/\+/g," ")),h)}))}r=Zn.prototype,r.add=function(o,l){ot(this),this.i=null,o=nn(this,o);var h=this.g.get(o);return h||this.g.set(o,h=[]),h.push(l),this.h+=1,this};function ru(o,l){ot(o),l=nn(o,l),o.g.has(l)&&(o.i=null,o.h-=o.g.get(l).length,o.g.delete(l))}function iu(o,l){return ot(o),l=nn(o,l),o.g.has(l)}r.forEach=function(o,l){ot(this),this.g.forEach(function(h,f){h.forEach(function(w){o.call(l,w,f,this)},this)},this)},r.na=function(){ot(this);const o=Array.from(this.g.values()),l=Array.from(this.g.keys()),h=[];for(let f=0;f<l.length;f++){const w=o[f];for(let b=0;b<w.length;b++)h.push(l[f])}return h},r.V=function(o){ot(this);let l=[];if(typeof o=="string")iu(this,o)&&(l=l.concat(this.g.get(nn(this,o))));else{o=Array.from(this.g.values());for(let h=0;h<o.length;h++)l=l.concat(o[h])}return l},r.set=function(o,l){return ot(this),this.i=null,o=nn(this,o),iu(this,o)&&(this.h-=this.g.get(o).length),this.g.set(o,[l]),this.h+=1,this},r.get=function(o,l){return o?(o=this.V(o),0<o.length?String(o[0]):l):l};function su(o,l,h){ru(o,l),0<h.length&&(o.i=null,o.g.set(nn(o,l),x(h)),o.h+=h.length)}r.toString=function(){if(this.i)return this.i;if(!this.g)return"";const o=[],l=Array.from(this.g.keys());for(var h=0;h<l.length;h++){var f=l[h];const b=encodeURIComponent(String(f)),k=this.V(f);for(f=0;f<k.length;f++){var w=b;k[f]!==""&&(w+="="+encodeURIComponent(String(k[f]))),o.push(w)}}return this.i=o.join("&")};function nn(o,l){return l=String(l),o.j&&(l=l.toLowerCase()),l}function Cf(o,l){l&&!o.j&&(ot(o),o.i=null,o.g.forEach(function(h,f){var w=f.toLowerCase();f!=w&&(ru(this,f),su(this,w,h))},o)),o.j=l}function Vf(o,l){const h=new Qn;if(u.Image){const f=new Image;f.onload=S(at,h,"TestLoadImage: loaded",!0,l,f),f.onerror=S(at,h,"TestLoadImage: error",!1,l,f),f.onabort=S(at,h,"TestLoadImage: abort",!1,l,f),f.ontimeout=S(at,h,"TestLoadImage: timeout",!1,l,f),u.setTimeout(function(){f.ontimeout&&f.ontimeout()},1e4),f.src=o}else l(!1)}function Df(o,l){const h=new Qn,f=new AbortController,w=setTimeout(()=>{f.abort(),at(h,"TestPingServer: timeout",!1,l)},1e4);fetch(o,{signal:f.signal}).then(b=>{clearTimeout(w),b.ok?at(h,"TestPingServer: ok",!0,l):at(h,"TestPingServer: server error",!1,l)}).catch(()=>{clearTimeout(w),at(h,"TestPingServer: error",!1,l)})}function at(o,l,h,f,w){try{w&&(w.onload=null,w.onerror=null,w.onabort=null,w.ontimeout=null),f(h)}catch{}}function kf(){this.g=new mf}function xf(o,l,h){const f=h||"";try{Za(o,function(w,b){let k=w;d(w)&&(k=Ps(w)),l.push(f+b+"="+encodeURIComponent(k))})}catch(w){throw l.push(f+"type="+encodeURIComponent("_badmap")),w}}function ii(o){this.l=o.Ub||null,this.j=o.eb||!1}V(ii,Cs),ii.prototype.g=function(){return new si(this.l,this.j)},ii.prototype.i=function(o){return function(){return o}}({});function si(o,l){Ie.call(this),this.D=o,this.o=l,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.u=new Headers,this.h=null,this.B="GET",this.A="",this.g=!1,this.v=this.j=this.l=null}V(si,Ie),r=si.prototype,r.open=function(o,l){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.B=o,this.A=l,this.readyState=1,tr(this)},r.send=function(o){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");this.g=!0;const l={headers:this.u,method:this.B,credentials:this.m,cache:void 0};o&&(l.body=o),(this.D||u).fetch(new Request(this.A,l)).then(this.Sa.bind(this),this.ga.bind(this))},r.abort=function(){this.response=this.responseText="",this.u=new Headers,this.status=0,this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),1<=this.readyState&&this.g&&this.readyState!=4&&(this.g=!1,er(this)),this.readyState=0},r.Sa=function(o){if(this.g&&(this.l=o,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=o.headers,this.readyState=2,tr(this)),this.g&&(this.readyState=3,tr(this),this.g)))if(this.responseType==="arraybuffer")o.arrayBuffer().then(this.Qa.bind(this),this.ga.bind(this));else if(typeof u.ReadableStream<"u"&&"body"in o){if(this.j=o.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.v=new TextDecoder;ou(this)}else o.text().then(this.Ra.bind(this),this.ga.bind(this))};function ou(o){o.j.read().then(o.Pa.bind(o)).catch(o.ga.bind(o))}r.Pa=function(o){if(this.g){if(this.o&&o.value)this.response.push(o.value);else if(!this.o){var l=o.value?o.value:new Uint8Array(0);(l=this.v.decode(l,{stream:!o.done}))&&(this.response=this.responseText+=l)}o.done?er(this):tr(this),this.readyState==3&&ou(this)}},r.Ra=function(o){this.g&&(this.response=this.responseText=o,er(this))},r.Qa=function(o){this.g&&(this.response=o,er(this))},r.ga=function(){this.g&&er(this)};function er(o){o.readyState=4,o.l=null,o.j=null,o.v=null,tr(o)}r.setRequestHeader=function(o,l){this.u.append(o,l)},r.getResponseHeader=function(o){return this.h&&this.h.get(o.toLowerCase())||""},r.getAllResponseHeaders=function(){if(!this.h)return"";const o=[],l=this.h.entries();for(var h=l.next();!h.done;)h=h.value,o.push(h[0]+": "+h[1]),h=l.next();return o.join(`\r
`)};function tr(o){o.onreadystatechange&&o.onreadystatechange.call(o)}Object.defineProperty(si.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(o){this.m=o?"include":"same-origin"}});function au(o){let l="";return G(o,function(h,f){l+=f,l+=":",l+=h,l+=`\r
`}),l}function Us(o,l,h){e:{for(f in h){var f=!1;break e}f=!0}f||(h=au(h),typeof o=="string"?h!=null&&encodeURIComponent(String(h)):ie(o,l,h))}function ue(o){Ie.call(this),this.headers=new Map,this.o=o||null,this.h=!1,this.v=this.g=null,this.D="",this.m=0,this.l="",this.j=this.B=this.u=this.A=!1,this.I=null,this.H="",this.J=!1}V(ue,Ie);var Nf=/^https?$/i,Of=["POST","PUT"];r=ue.prototype,r.Ha=function(o){this.J=o},r.ea=function(o,l,h,f){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+o);l=l?l.toUpperCase():"GET",this.D=o,this.l="",this.m=0,this.A=!1,this.h=!0,this.g=this.o?this.o.g():ks.g(),this.v=this.o?Ma(this.o):Ma(ks),this.g.onreadystatechange=E(this.Ea,this);try{this.B=!0,this.g.open(l,String(o),!0),this.B=!1}catch(b){uu(this,b);return}if(o=h||"",h=new Map(this.headers),f)if(Object.getPrototypeOf(f)===Object.prototype)for(var w in f)h.set(w,f[w]);else if(typeof f.keys=="function"&&typeof f.get=="function")for(const b of f.keys())h.set(b,f.get(b));else throw Error("Unknown input type for opt_headers: "+String(f));f=Array.from(h.keys()).find(b=>b.toLowerCase()=="content-type"),w=u.FormData&&o instanceof u.FormData,!(0<=Array.prototype.indexOf.call(Of,l,void 0))||f||w||h.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[b,k]of h)this.g.setRequestHeader(b,k);this.H&&(this.g.responseType=this.H),"withCredentials"in this.g&&this.g.withCredentials!==this.J&&(this.g.withCredentials=this.J);try{hu(this),this.u=!0,this.g.send(o),this.u=!1}catch(b){uu(this,b)}};function uu(o,l){o.h=!1,o.g&&(o.j=!0,o.g.abort(),o.j=!1),o.l=l,o.m=5,cu(o),oi(o)}function cu(o){o.A||(o.A=!0,Ae(o,"complete"),Ae(o,"error"))}r.abort=function(o){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.m=o||7,Ae(this,"complete"),Ae(this,"abort"),oi(this))},r.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),oi(this,!0)),ue.aa.N.call(this)},r.Ea=function(){this.s||(this.B||this.u||this.j?lu(this):this.bb())},r.bb=function(){lu(this)};function lu(o){if(o.h&&typeof a<"u"&&(!o.v[1]||We(o)!=4||o.Z()!=2)){if(o.u&&We(o)==4)ka(o.Ea,0,o);else if(Ae(o,"readystatechange"),We(o)==4){o.h=!1;try{const k=o.Z();e:switch(k){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var l=!0;break e;default:l=!1}var h;if(!(h=l)){var f;if(f=k===0){var w=String(o.D).match(eu)[1]||null;!w&&u.self&&u.self.location&&(w=u.self.location.protocol.slice(0,-1)),f=!Nf.test(w?w.toLowerCase():"")}h=f}if(h)Ae(o,"complete"),Ae(o,"success");else{o.m=6;try{var b=2<We(o)?o.g.statusText:""}catch{b=""}o.l=b+" ["+o.Z()+"]",cu(o)}}finally{oi(o)}}}}function oi(o,l){if(o.g){hu(o);const h=o.g,f=o.v[0]?()=>{}:null;o.g=null,o.v=null,l||Ae(o,"ready");try{h.onreadystatechange=f}catch{}}}function hu(o){o.I&&(u.clearTimeout(o.I),o.I=null)}r.isActive=function(){return!!this.g};function We(o){return o.g?o.g.readyState:0}r.Z=function(){try{return 2<We(this)?this.g.status:-1}catch{return-1}},r.oa=function(){try{return this.g?this.g.responseText:""}catch{return""}},r.Oa=function(o){if(this.g){var l=this.g.responseText;return o&&l.indexOf(o)==0&&(l=l.substring(o.length)),ff(l)}};function du(o){try{if(!o.g)return null;if("response"in o.g)return o.g.response;switch(o.H){case"":case"text":return o.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in o.g)return o.g.mozResponseArrayBuffer}return null}catch{return null}}function Mf(o){const l={};o=(o.g&&2<=We(o)&&o.g.getAllResponseHeaders()||"").split(`\r
`);for(let f=0;f<o.length;f++){if(j(o[f]))continue;var h=T(o[f]);const w=h[0];if(h=h[1],typeof h!="string")continue;h=h.trim();const b=l[w]||[];l[w]=b,b.push(h)}I(l,function(f){return f.join(", ")})}r.Ba=function(){return this.m},r.Ka=function(){return typeof this.l=="string"?this.l:String(this.l)};function nr(o,l,h){return h&&h.internalChannelParams&&h.internalChannelParams[o]||l}function fu(o){this.Aa=0,this.i=[],this.j=new Qn,this.ia=this.qa=this.I=this.W=this.g=this.ya=this.D=this.H=this.m=this.S=this.o=null,this.Ya=this.U=0,this.Va=nr("failFast",!1,o),this.F=this.C=this.u=this.s=this.l=null,this.X=!0,this.za=this.T=-1,this.Y=this.v=this.B=0,this.Ta=nr("baseRetryDelayMs",5e3,o),this.cb=nr("retryDelaySeedMs",1e4,o),this.Wa=nr("forwardChannelMaxRetries",2,o),this.wa=nr("forwardChannelRequestTimeoutMs",2e4,o),this.pa=o&&o.xmlHttpFactory||void 0,this.Xa=o&&o.Tb||void 0,this.Ca=o&&o.useFetchStreams||!1,this.L=void 0,this.J=o&&o.supportsCrossDomainXhr||!1,this.K="",this.h=new Ha(o&&o.concurrentRequestLimit),this.Da=new kf,this.P=o&&o.fastHandshake||!1,this.O=o&&o.encodeInitMessageHeaders||!1,this.P&&this.O&&(this.O=!1),this.Ua=o&&o.Rb||!1,o&&o.xa&&this.j.xa(),o&&o.forceLongPolling&&(this.X=!1),this.ba=!this.P&&this.X&&o&&o.detectBufferingProxy||!1,this.ja=void 0,o&&o.longPollingTimeout&&0<o.longPollingTimeout&&(this.ja=o.longPollingTimeout),this.ca=void 0,this.R=0,this.M=!1,this.ka=this.A=null}r=fu.prototype,r.la=8,r.G=1,r.connect=function(o,l,h,f){Re(0),this.W=o,this.H=l||{},h&&f!==void 0&&(this.H.OSID=h,this.H.OAID=f),this.F=this.X,this.I=Eu(this,null,this.W),ui(this)};function Bs(o){if(mu(o),o.G==3){var l=o.U++,h=Ge(o.I);if(ie(h,"SID",o.K),ie(h,"RID",l),ie(h,"TYPE","terminate"),rr(o,h),l=new st(o,o.j,l),l.L=2,l.v=ri(Ge(h)),h=!1,u.navigator&&u.navigator.sendBeacon)try{h=u.navigator.sendBeacon(l.v.toString(),"")}catch{}!h&&u.Image&&(new Image().src=l.v,h=!0),h||(l.g=wu(l.j,null),l.g.ea(l.v)),l.F=Date.now(),ei(l)}Tu(o)}function ai(o){o.g&&(qs(o),o.g.cancel(),o.g=null)}function mu(o){ai(o),o.u&&(u.clearTimeout(o.u),o.u=null),ci(o),o.h.cancel(),o.s&&(typeof o.s=="number"&&u.clearTimeout(o.s),o.s=null)}function ui(o){if(!Qa(o.h)&&!o.s){o.s=!0;var l=o.Ga;qn||Sa(),zn||(qn(),zn=!0),vs.add(l,o),o.B=0}}function Lf(o,l){return Ja(o.h)>=o.h.j-(o.s?1:0)?!1:o.s?(o.i=l.D.concat(o.i),!0):o.G==1||o.G==2||o.B>=(o.Va?0:o.Wa)?!1:(o.s=Hn(E(o.Ga,o,l),vu(o,o.B)),o.B++,!0)}r.Ga=function(o){if(this.s)if(this.s=null,this.G==1){if(!o){this.U=Math.floor(1e5*Math.random()),o=this.U++;const w=new st(this,this.j,o);let b=this.o;if(this.S&&(b?(b=g(b),v(b,this.S)):b=this.S),this.m!==null||this.O||(w.H=b,b=null),this.P)e:{for(var l=0,h=0;h<this.i.length;h++){t:{var f=this.i[h];if("__data__"in f.map&&(f=f.map.__data__,typeof f=="string")){f=f.length;break t}f=void 0}if(f===void 0)break;if(l+=f,4096<l){l=h;break e}if(l===4096||h===this.i.length-1){l=h+1;break e}}l=1e3}else l=1e3;l=gu(this,w,l),h=Ge(this.I),ie(h,"RID",o),ie(h,"CVER",22),this.D&&ie(h,"X-HTTP-Session-Id",this.D),rr(this,h),b&&(this.O?l="headers="+encodeURIComponent(String(au(b)))+"&"+l:this.m&&Us(h,this.m,b)),Fs(this.h,w),this.Ua&&ie(h,"TYPE","init"),this.P?(ie(h,"$req",l),ie(h,"SID","null"),w.T=!0,Ns(w,h,null)):Ns(w,h,l),this.G=2}}else this.G==3&&(o?pu(this,o):this.i.length==0||Qa(this.h)||pu(this))};function pu(o,l){var h;l?h=l.l:h=o.U++;const f=Ge(o.I);ie(f,"SID",o.K),ie(f,"RID",h),ie(f,"AID",o.T),rr(o,f),o.m&&o.o&&Us(f,o.m,o.o),h=new st(o,o.j,h,o.B+1),o.m===null&&(h.H=o.o),l&&(o.i=l.D.concat(o.i)),l=gu(o,h,1e3),h.I=Math.round(.5*o.wa)+Math.round(.5*o.wa*Math.random()),Fs(o.h,h),Ns(h,f,l)}function rr(o,l){o.H&&G(o.H,function(h,f){ie(l,f,h)}),o.l&&Za({},function(h,f){ie(l,f,h)})}function gu(o,l,h){h=Math.min(o.i.length,h);var f=o.l?E(o.l.Na,o.l,o):null;e:{var w=o.i;let b=-1;for(;;){const k=["count="+h];b==-1?0<h?(b=w[0].g,k.push("ofs="+b)):b=0:k.push("ofs="+b);let te=!0;for(let ge=0;ge<h;ge++){let Y=w[ge].g;const ve=w[ge].map;if(Y-=b,0>Y)b=Math.max(0,w[ge].g-100),te=!1;else try{xf(ve,k,"req"+Y+"_")}catch{f&&f(ve)}}if(te){f=k.join("&");break e}}}return o=o.i.splice(0,h),l.D=o,f}function _u(o){if(!o.g&&!o.u){o.Y=1;var l=o.Fa;qn||Sa(),zn||(qn(),zn=!0),vs.add(l,o),o.v=0}}function js(o){return o.g||o.u||3<=o.v?!1:(o.Y++,o.u=Hn(E(o.Fa,o),vu(o,o.v)),o.v++,!0)}r.Fa=function(){if(this.u=null,yu(this),this.ba&&!(this.M||this.g==null||0>=this.R)){var o=2*this.R;this.j.info("BP detection timer enabled: "+o),this.A=Hn(E(this.ab,this),o)}},r.ab=function(){this.A&&(this.A=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.M=!0,Re(10),ai(this),yu(this))};function qs(o){o.A!=null&&(u.clearTimeout(o.A),o.A=null)}function yu(o){o.g=new st(o,o.j,"rpc",o.Y),o.m===null&&(o.g.H=o.o),o.g.O=0;var l=Ge(o.qa);ie(l,"RID","rpc"),ie(l,"SID",o.K),ie(l,"AID",o.T),ie(l,"CI",o.F?"0":"1"),!o.F&&o.ja&&ie(l,"TO",o.ja),ie(l,"TYPE","xmlhttp"),rr(o,l),o.m&&o.o&&Us(l,o.m,o.o),o.L&&(o.g.I=o.L);var h=o.g;o=o.ia,h.L=1,h.v=ri(Ge(l)),h.m=null,h.P=!0,$a(h,o)}r.Za=function(){this.C!=null&&(this.C=null,ai(this),js(this),Re(19))};function ci(o){o.C!=null&&(u.clearTimeout(o.C),o.C=null)}function Iu(o,l){var h=null;if(o.g==l){ci(o),qs(o),o.g=null;var f=2}else if(Ls(o.h,l))h=l.D,Ya(o.h,l),f=1;else return;if(o.G!=0){if(l.o)if(f==1){h=l.m?l.m.length:0,l=Date.now()-l.F;var w=o.B;f=Yr(),Ae(f,new ja(f,h)),ui(o)}else _u(o);else if(w=l.s,w==3||w==0&&0<l.X||!(f==1&&Lf(o,l)||f==2&&js(o)))switch(h&&0<h.length&&(l=o.h,l.i=l.i.concat(h)),w){case 1:Ot(o,5);break;case 4:Ot(o,10);break;case 3:Ot(o,6);break;default:Ot(o,2)}}}function vu(o,l){let h=o.Ta+Math.floor(Math.random()*o.cb);return o.isActive()||(h*=2),h*l}function Ot(o,l){if(o.j.info("Error code "+l),l==2){var h=E(o.fb,o),f=o.Xa;const w=!f;f=new Nt(f||"//www.google.com/images/cleardot.gif"),u.location&&u.location.protocol=="http"||ti(f,"https"),ri(f),w?Vf(f.toString(),h):Df(f.toString(),h)}else Re(2);o.G=0,o.l&&o.l.sa(l),Tu(o),mu(o)}r.fb=function(o){o?(this.j.info("Successfully pinged google.com"),Re(2)):(this.j.info("Failed to ping google.com"),Re(1))};function Tu(o){if(o.G=0,o.ka=[],o.l){const l=Xa(o.h);(l.length!=0||o.i.length!=0)&&(D(o.ka,l),D(o.ka,o.i),o.h.i.length=0,x(o.i),o.i.length=0),o.l.ra()}}function Eu(o,l,h){var f=h instanceof Nt?Ge(h):new Nt(h);if(f.g!="")l&&(f.g=l+"."+f.g),ni(f,f.s);else{var w=u.location;f=w.protocol,l=l?l+"."+w.hostname:w.hostname,w=+w.port;var b=new Nt(null);f&&ti(b,f),l&&(b.g=l),w&&ni(b,w),h&&(b.l=h),f=b}return h=o.D,l=o.ya,h&&l&&ie(f,h,l),ie(f,"VER",o.la),rr(o,f),f}function wu(o,l,h){if(l&&!o.J)throw Error("Can't create secondary domain capable XhrIo object.");return l=o.Ca&&!o.pa?new ue(new ii({eb:h})):new ue(o.pa),l.Ha(o.J),l}r.isActive=function(){return!!this.l&&this.l.isActive(this)};function Au(){}r=Au.prototype,r.ua=function(){},r.ta=function(){},r.sa=function(){},r.ra=function(){},r.isActive=function(){return!0},r.Na=function(){};function li(){}li.prototype.g=function(o,l){return new ke(o,l)};function ke(o,l){Ie.call(this),this.g=new fu(l),this.l=o,this.h=l&&l.messageUrlParams||null,o=l&&l.messageHeaders||null,l&&l.clientProtocolHeaderRequired&&(o?o["X-Client-Protocol"]="webchannel":o={"X-Client-Protocol":"webchannel"}),this.g.o=o,o=l&&l.initMessageHeaders||null,l&&l.messageContentType&&(o?o["X-WebChannel-Content-Type"]=l.messageContentType:o={"X-WebChannel-Content-Type":l.messageContentType}),l&&l.va&&(o?o["X-WebChannel-Client-Profile"]=l.va:o={"X-WebChannel-Client-Profile":l.va}),this.g.S=o,(o=l&&l.Sb)&&!j(o)&&(this.g.m=o),this.v=l&&l.supportsCrossDomainXhr||!1,this.u=l&&l.sendRawJson||!1,(l=l&&l.httpSessionIdParam)&&!j(l)&&(this.g.D=l,o=this.h,o!==null&&l in o&&(o=this.h,l in o&&delete o[l])),this.j=new rn(this)}V(ke,Ie),ke.prototype.m=function(){this.g.l=this.j,this.v&&(this.g.J=!0),this.g.connect(this.l,this.h||void 0)},ke.prototype.close=function(){Bs(this.g)},ke.prototype.o=function(o){var l=this.g;if(typeof o=="string"){var h={};h.__data__=o,o=h}else this.u&&(h={},h.__data__=Ps(o),o=h);l.i.push(new vf(l.Ya++,o)),l.G==3&&ui(l)},ke.prototype.N=function(){this.g.l=null,delete this.j,Bs(this.g),delete this.g,ke.aa.N.call(this)};function Ru(o){Vs.call(this),o.__headers__&&(this.headers=o.__headers__,this.statusCode=o.__status__,delete o.__headers__,delete o.__status__);var l=o.__sm__;if(l){e:{for(const h in l){o=h;break e}o=void 0}(this.i=o)&&(o=this.i,l=l!==null&&o in l?l[o]:void 0),this.data=l}else this.data=o}V(Ru,Vs);function bu(){Ds.call(this),this.status=1}V(bu,Ds);function rn(o){this.g=o}V(rn,Au),rn.prototype.ua=function(){Ae(this.g,"a")},rn.prototype.ta=function(o){Ae(this.g,new Ru(o))},rn.prototype.sa=function(o){Ae(this.g,new bu)},rn.prototype.ra=function(){Ae(this.g,"b")},li.prototype.createWebChannel=li.prototype.g,ke.prototype.send=ke.prototype.o,ke.prototype.open=ke.prototype.m,ke.prototype.close=ke.prototype.close,Rl=function(){return new li},Al=function(){return Yr()},wl=kt,uo={mb:0,pb:1,qb:2,Jb:3,Ob:4,Lb:5,Mb:6,Kb:7,Ib:8,Nb:9,PROXY:10,NOPROXY:11,Gb:12,Cb:13,Db:14,Bb:15,Eb:16,Fb:17,ib:18,hb:19,jb:20},Xr.NO_ERROR=0,Xr.TIMEOUT=8,Xr.HTTP_ERROR=6,Ii=Xr,qa.COMPLETE="complete",El=qa,La.EventType=Gn,Gn.OPEN="a",Gn.CLOSE="b",Gn.ERROR="c",Gn.MESSAGE="d",Ie.prototype.listen=Ie.prototype.K,cr=La,ue.prototype.listenOnce=ue.prototype.L,ue.prototype.getLastError=ue.prototype.Ka,ue.prototype.getLastErrorCode=ue.prototype.Ba,ue.prototype.getStatus=ue.prototype.Z,ue.prototype.getResponseJson=ue.prototype.Oa,ue.prototype.getResponseText=ue.prototype.oa,ue.prototype.send=ue.prototype.ea,ue.prototype.setWithCredentials=ue.prototype.Ha,Tl=ue}).apply(typeof di<"u"?di:typeof self<"u"?self:typeof window<"u"?window:{});const Fu="@firebase/firestore";/**
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
 */class we{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}we.UNAUTHENTICATED=new we(null),we.GOOGLE_CREDENTIALS=new we("google-credentials-uid"),we.FIRST_PARTY=new we("first-party-uid"),we.MOCK_USER=new we("mock-user");/**
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
 */let On="10.14.0";/**
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
 */const Gt=new xo("@firebase/firestore");function ln(){return Gt.logLevel}function C(r,...e){if(Gt.logLevel<=W.DEBUG){const t=e.map(Mo);Gt.debug(`Firestore (${On}): ${r}`,...t)}}function le(r,...e){if(Gt.logLevel<=W.ERROR){const t=e.map(Mo);Gt.error(`Firestore (${On}): ${r}`,...t)}}function wr(r,...e){if(Gt.logLevel<=W.WARN){const t=e.map(Mo);Gt.warn(`Firestore (${On}): ${r}`,...t)}}function Mo(r){if(typeof r=="string")return r;try{/**
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
*/return function(t){return JSON.stringify(t)}(r)}catch{return r}}/**
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
 */function M(r="Unexpected state"){const e=`FIRESTORE (${On}) INTERNAL ASSERTION FAILED: `+r;throw le(e),new Error(e)}function F(r,e){r||M()}function L(r,e){return r}/**
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
 */const P={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class O extends rt{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
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
 */class vt{constructor(){this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}}/**
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
 */class yp{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class Ip{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable(()=>t(we.UNAUTHENTICATED))}shutdown(){}}class vp{constructor(e){this.t=e,this.currentUser=we.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){F(this.o===void 0);let n=this.i;const i=c=>this.i!==n?(n=this.i,t(c)):Promise.resolve();let s=new vt;this.o=()=>{this.i++,this.currentUser=this.u(),s.resolve(),s=new vt,e.enqueueRetryable(()=>i(this.currentUser))};const a=()=>{const c=s;e.enqueueRetryable(async()=>{await c.promise,await i(this.currentUser)})},u=c=>{C("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=c,this.o&&(this.auth.addAuthTokenListener(this.o),a())};this.t.onInit(c=>u(c)),setTimeout(()=>{if(!this.auth){const c=this.t.getImmediate({optional:!0});c?u(c):(C("FirebaseAuthCredentialsProvider","Auth not yet detected"),s.resolve(),s=new vt)}},0),a()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then(n=>this.i!==e?(C("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):n?(F(typeof n.accessToken=="string"),new yp(n.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return F(e===null||typeof e=="string"),new we(e)}}class Tp{constructor(e,t,n){this.l=e,this.h=t,this.P=n,this.type="FirstParty",this.user=we.FIRST_PARTY,this.I=new Map}T(){return this.P?this.P():null}get headers(){this.I.set("X-Goog-AuthUser",this.l);const e=this.T();return e&&this.I.set("Authorization",e),this.h&&this.I.set("X-Goog-Iam-Authorization-Token",this.h),this.I}}class Ep{constructor(e,t,n){this.l=e,this.h=t,this.P=n}getToken(){return Promise.resolve(new Tp(this.l,this.h,this.P))}start(e,t){e.enqueueRetryable(()=>t(we.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class wp{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class Ap{constructor(e){this.A=e,this.forceRefresh=!1,this.appCheck=null,this.R=null}start(e,t){F(this.o===void 0);const n=s=>{s.error!=null&&C("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${s.error.message}`);const a=s.token!==this.R;return this.R=s.token,C("FirebaseAppCheckTokenProvider",`Received ${a?"new":"existing"} token.`),a?t(s.token):Promise.resolve()};this.o=s=>{e.enqueueRetryable(()=>n(s))};const i=s=>{C("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=s,this.o&&this.appCheck.addTokenListener(this.o)};this.A.onInit(s=>i(s)),setTimeout(()=>{if(!this.appCheck){const s=this.A.getImmediate({optional:!0});s?i(s):C("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(t=>t?(F(typeof t.token=="string"),this.R=t.token,new wp(t.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
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
 */function Rp(r){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(r);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let n=0;n<r;n++)t[n]=Math.floor(256*Math.random());return t}/**
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
 */class bl{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=Math.floor(256/e.length)*e.length;let n="";for(;n.length<20;){const i=Rp(40);for(let s=0;s<i.length;++s)n.length<20&&i[s]<t&&(n+=e.charAt(i[s]%e.length))}return n}}function z(r,e){return r<e?-1:r>e?1:0}function En(r,e,t){return r.length===e.length&&r.every((n,i)=>t(n,e[i]))}function Sl(r){return r+"\0"}/**
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
 */class ae{constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new O(P.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new O(P.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<-62135596800)throw new O(P.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new O(P.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}static now(){return ae.fromMillis(Date.now())}static fromDate(e){return ae.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),n=Math.floor(1e6*(e-1e3*t));return new ae(t,n)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/1e6}_compareTo(e){return this.seconds===e.seconds?z(this.nanoseconds,e.nanoseconds):z(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{seconds:this.seconds,nanoseconds:this.nanoseconds}}valueOf(){const e=this.seconds- -62135596800;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}/**
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
 */class U{constructor(e){this.timestamp=e}static fromTimestamp(e){return new U(e)}static min(){return new U(new ae(0,0))}static max(){return new U(new ae(253402300799,999999999))}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
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
 */class Ar{constructor(e,t,n){t===void 0?t=0:t>e.length&&M(),n===void 0?n=e.length-t:n>e.length-t&&M(),this.segments=e,this.offset=t,this.len=n}get length(){return this.len}isEqual(e){return Ar.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof Ar?e.forEach(n=>{t.push(n)}):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,n=this.limit();t<n;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const n=Math.min(e.length,t.length);for(let i=0;i<n;i++){const s=e.get(i),a=t.get(i);if(s<a)return-1;if(s>a)return 1}return e.length<t.length?-1:e.length>t.length?1:0}}class ne extends Ar{construct(e,t,n){return new ne(e,t,n)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const n of e){if(n.indexOf("//")>=0)throw new O(P.INVALID_ARGUMENT,`Invalid segment (${n}). Paths must not contain // in them.`);t.push(...n.split("/").filter(i=>i.length>0))}return new ne(t)}static emptyPath(){return new ne([])}}const bp=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class oe extends Ar{construct(e,t,n){return new oe(e,t,n)}static isValidIdentifier(e){return bp.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),oe.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)==="__name__"}static keyField(){return new oe(["__name__"])}static fromServerFormat(e){const t=[];let n="",i=0;const s=()=>{if(n.length===0)throw new O(P.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(n),n=""};let a=!1;for(;i<e.length;){const u=e[i];if(u==="\\"){if(i+1===e.length)throw new O(P.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const c=e[i+1];if(c!=="\\"&&c!=="."&&c!=="`")throw new O(P.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);n+=c,i+=2}else u==="`"?(a=!a,i++):u!=="."||a?(n+=u,i++):(s(),i++)}if(s(),a)throw new O(P.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new oe(t)}static emptyPath(){return new oe([])}}/**
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
 */class N{constructor(e){this.path=e}static fromPath(e){return new N(ne.fromString(e))}static fromName(e){return new N(ne.fromString(e).popFirst(5))}static empty(){return new N(ne.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&ne.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,t){return ne.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new N(new ne(e.slice()))}}/**
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
 */class xi{constructor(e,t,n,i){this.indexId=e,this.collectionGroup=t,this.fields=n,this.indexState=i}}function co(r){return r.fields.find(e=>e.kind===2)}function Ft(r){return r.fields.filter(e=>e.kind!==2)}xi.UNKNOWN_ID=-1;class vi{constructor(e,t){this.fieldPath=e,this.kind=t}}class Rr{constructor(e,t){this.sequenceNumber=e,this.offset=t}static empty(){return new Rr(0,Oe.min())}}function Pl(r,e){const t=r.toTimestamp().seconds,n=r.toTimestamp().nanoseconds+1,i=U.fromTimestamp(n===1e9?new ae(t+1,0):new ae(t,n));return new Oe(i,N.empty(),e)}function Cl(r){return new Oe(r.readTime,r.key,-1)}class Oe{constructor(e,t,n){this.readTime=e,this.documentKey=t,this.largestBatchId=n}static min(){return new Oe(U.min(),N.empty(),-1)}static max(){return new Oe(U.max(),N.empty(),-1)}}function Lo(r,e){let t=r.readTime.compareTo(e.readTime);return t!==0?t:(t=N.comparator(r.documentKey,e.documentKey),t!==0?t:z(r.largestBatchId,e.largestBatchId))}/**
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
 */const Vl="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class Dl{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}/**
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
 */async function St(r){if(r.code!==P.FAILED_PRECONDITION||r.message!==Vl)throw r;C("LocalStore","Unexpectedly lost primary lease")}/**
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
 */class A{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t)},t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t)})}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&M(),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new A((n,i)=>{this.nextCallback=s=>{this.wrapSuccess(e,s).next(n,i)},this.catchCallback=s=>{this.wrapFailure(t,s).next(n,i)}})}toPromise(){return new Promise((e,t)=>{this.next(e,t)})}wrapUserFunction(e){try{const t=e();return t instanceof A?t:A.resolve(t)}catch(t){return A.reject(t)}}wrapSuccess(e,t){return e?this.wrapUserFunction(()=>e(t)):A.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction(()=>e(t)):A.reject(t)}static resolve(e){return new A((t,n)=>{t(e)})}static reject(e){return new A((t,n)=>{n(e)})}static waitFor(e){return new A((t,n)=>{let i=0,s=0,a=!1;e.forEach(u=>{++i,u.next(()=>{++s,a&&s===i&&t()},c=>n(c))}),a=!0,s===i&&t()})}static or(e){let t=A.resolve(!1);for(const n of e)t=t.next(i=>i?A.resolve(i):n());return t}static forEach(e,t){const n=[];return e.forEach((i,s)=>{n.push(t.call(this,i,s))}),this.waitFor(n)}static mapArray(e,t){return new A((n,i)=>{const s=e.length,a=new Array(s);let u=0;for(let c=0;c<s;c++){const d=c;t(e[d]).next(m=>{a[d]=m,++u,u===s&&n(a)},m=>i(m))}})}static doWhile(e,t){return new A((n,i)=>{const s=()=>{e()===!0?t().next(()=>{s()},i):n()};s()})}}/**
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
 */class Zi{constructor(e,t){this.action=e,this.transaction=t,this.aborted=!1,this.V=new vt,this.transaction.oncomplete=()=>{this.V.resolve()},this.transaction.onabort=()=>{t.error?this.V.reject(new mr(e,t.error)):this.V.resolve()},this.transaction.onerror=n=>{const i=Fo(n.target.error);this.V.reject(new mr(e,i))}}static open(e,t,n,i){try{return new Zi(t,e.transaction(i,n))}catch(s){throw new mr(t,s)}}get m(){return this.V.promise}abort(e){e&&this.V.reject(e),this.aborted||(C("SimpleDb","Aborting transaction:",e?e.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}g(){const e=this.transaction;this.aborted||typeof e.commit!="function"||e.commit()}store(e){const t=this.transaction.objectStore(e);return new Pp(t)}}class Tt{constructor(e,t,n){this.name=e,this.version=t,this.p=n,Tt.S(fe())===12.2&&le("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}static delete(e){return C("SimpleDb","Removing database:",e),Ut(window.indexedDB.deleteDatabase(e)).toPromise()}static D(){if(!pl())return!1;if(Tt.v())return!0;const e=fe(),t=Tt.S(e),n=0<t&&t<10,i=kl(e),s=0<i&&i<4.5;return!(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||n||s)}static v(){var e;return typeof process<"u"&&((e=process.__PRIVATE_env)===null||e===void 0?void 0:e.C)==="YES"}static F(e,t){return e.store(t)}static S(e){const t=e.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=t?t[1].split("_").slice(0,2).join("."):"-1";return Number(n)}async M(e){return this.db||(C("SimpleDb","Opening database:",this.name),this.db=await new Promise((t,n)=>{const i=indexedDB.open(this.name,this.version);i.onsuccess=s=>{const a=s.target.result;t(a)},i.onblocked=()=>{n(new mr(e,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},i.onerror=s=>{const a=s.target.error;a.name==="VersionError"?n(new O(P.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):a.name==="InvalidStateError"?n(new O(P.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+a)):n(new mr(e,a))},i.onupgradeneeded=s=>{C("SimpleDb",'Database "'+this.name+'" requires upgrade from version:',s.oldVersion);const a=s.target.result;this.p.O(a,i.transaction,s.oldVersion,this.version).next(()=>{C("SimpleDb","Database upgrade to version "+this.version+" complete")})}})),this.N&&(this.db.onversionchange=t=>this.N(t)),this.db}L(e){this.N=e,this.db&&(this.db.onversionchange=t=>e(t))}async runTransaction(e,t,n,i){const s=t==="readonly";let a=0;for(;;){++a;try{this.db=await this.M(e);const u=Zi.open(this.db,e,s?"readonly":"readwrite",n),c=i(u).next(d=>(u.g(),d)).catch(d=>(u.abort(d),A.reject(d))).toPromise();return c.catch(()=>{}),await u.m,c}catch(u){const c=u,d=c.name!=="FirebaseError"&&a<3;if(C("SimpleDb","Transaction failed with error:",c.message,"Retrying:",d),this.close(),!d)return Promise.reject(c)}}}close(){this.db&&this.db.close(),this.db=void 0}}function kl(r){const e=r.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t)}class Sp{constructor(e){this.B=e,this.k=!1,this.q=null}get isDone(){return this.k}get K(){return this.q}set cursor(e){this.B=e}done(){this.k=!0}$(e){this.q=e}delete(){return Ut(this.B.delete())}}class mr extends O{constructor(e,t){super(P.UNAVAILABLE,`IndexedDB transaction '${e}' failed: ${t}`),this.name="IndexedDbTransactionError"}}function Pt(r){return r.name==="IndexedDbTransactionError"}class Pp{constructor(e){this.store=e}put(e,t){let n;return t!==void 0?(C("SimpleDb","PUT",this.store.name,e,t),n=this.store.put(t,e)):(C("SimpleDb","PUT",this.store.name,"<auto-key>",e),n=this.store.put(e)),Ut(n)}add(e){return C("SimpleDb","ADD",this.store.name,e,e),Ut(this.store.add(e))}get(e){return Ut(this.store.get(e)).next(t=>(t===void 0&&(t=null),C("SimpleDb","GET",this.store.name,e,t),t))}delete(e){return C("SimpleDb","DELETE",this.store.name,e),Ut(this.store.delete(e))}count(){return C("SimpleDb","COUNT",this.store.name),Ut(this.store.count())}U(e,t){const n=this.options(e,t),i=n.index?this.store.index(n.index):this.store;if(typeof i.getAll=="function"){const s=i.getAll(n.range);return new A((a,u)=>{s.onerror=c=>{u(c.target.error)},s.onsuccess=c=>{a(c.target.result)}})}{const s=this.cursor(n),a=[];return this.W(s,(u,c)=>{a.push(c)}).next(()=>a)}}G(e,t){const n=this.store.getAll(e,t===null?void 0:t);return new A((i,s)=>{n.onerror=a=>{s(a.target.error)},n.onsuccess=a=>{i(a.target.result)}})}j(e,t){C("SimpleDb","DELETE ALL",this.store.name);const n=this.options(e,t);n.H=!1;const i=this.cursor(n);return this.W(i,(s,a,u)=>u.delete())}J(e,t){let n;t?n=e:(n={},t=e);const i=this.cursor(n);return this.W(i,t)}Y(e){const t=this.cursor({});return new A((n,i)=>{t.onerror=s=>{const a=Fo(s.target.error);i(a)},t.onsuccess=s=>{const a=s.target.result;a?e(a.primaryKey,a.value).next(u=>{u?a.continue():n()}):n()}})}W(e,t){const n=[];return new A((i,s)=>{e.onerror=a=>{s(a.target.error)},e.onsuccess=a=>{const u=a.target.result;if(!u)return void i();const c=new Sp(u),d=t(u.primaryKey,u.value,c);if(d instanceof A){const m=d.catch(p=>(c.done(),A.reject(p)));n.push(m)}c.isDone?i():c.K===null?u.continue():u.continue(c.K)}}).next(()=>A.waitFor(n))}options(e,t){let n;return e!==void 0&&(typeof e=="string"?n=e:t=e),{index:n,range:t}}cursor(e){let t="next";if(e.reverse&&(t="prev"),e.index){const n=this.store.index(e.index);return e.H?n.openKeyCursor(e.range,t):n.openCursor(e.range,t)}return this.store.openCursor(e.range,t)}}function Ut(r){return new A((e,t)=>{r.onsuccess=n=>{const i=n.target.result;e(i)},r.onerror=n=>{const i=Fo(n.target.error);t(i)}})}let Uu=!1;function Fo(r){const e=Tt.S(fe());if(e>=12.2&&e<13){const t="An internal error was encountered in the Indexed Database server";if(r.message.indexOf(t)>=0){const n=new O("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return Uu||(Uu=!0,setTimeout(()=>{throw n},0)),n}}return r}class Cp{constructor(e,t){this.asyncQueue=e,this.Z=t,this.task=null}start(){this.X(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return this.task!==null}X(e){C("IndexBackfiller",`Scheduled in ${e}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",e,async()=>{this.task=null;try{C("IndexBackfiller",`Documents written: ${await this.Z.ee()}`)}catch(t){Pt(t)?C("IndexBackfiller","Ignoring IndexedDB error during index backfill: ",t):await St(t)}await this.X(6e4)})}}class Vp{constructor(e,t){this.localStore=e,this.persistence=t}async ee(e=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",t=>this.te(t,e))}te(e,t){const n=new Set;let i=t,s=!0;return A.doWhile(()=>s===!0&&i>0,()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next(a=>{if(a!==null&&!n.has(a))return C("IndexBackfiller",`Processing collection: ${a}`),this.ne(e,a,i).next(u=>{i-=u,n.add(a)});s=!1})).next(()=>t-i)}ne(e,t,n){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e,t).next(i=>this.localStore.localDocuments.getNextDocuments(e,t,i,n).next(s=>{const a=s.changes;return this.localStore.indexManager.updateIndexEntries(e,a).next(()=>this.re(i,s)).next(u=>(C("IndexBackfiller",`Updating offset: ${u}`),this.localStore.indexManager.updateCollectionGroup(e,t,u))).next(()=>a.size)}))}re(e,t){let n=e;return t.changes.forEach((i,s)=>{const a=Cl(s);Lo(a,n)>0&&(n=a)}),new Oe(n.readTime,n.documentKey,Math.max(t.batchId,e.largestBatchId))}}/**
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
 */class Ve{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=n=>this.ie(n),this.se=n=>t.writeSequenceNumber(n))}ie(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.se&&this.se(e),e}}Ve.oe=-1;function es(r){return r==null}function br(r){return r===0&&1/r==-1/0}function xl(r){return typeof r=="number"&&Number.isInteger(r)&&!br(r)&&r<=Number.MAX_SAFE_INTEGER&&r>=Number.MIN_SAFE_INTEGER}/**
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
 */function be(r){let e="";for(let t=0;t<r.length;t++)e.length>0&&(e=Bu(e)),e=Dp(r.get(t),e);return Bu(e)}function Dp(r,e){let t=e;const n=r.length;for(let i=0;i<n;i++){const s=r.charAt(i);switch(s){case"\0":t+="";break;case"":t+="";break;default:t+=s}}return t}function Bu(r){return r+""}function Be(r){const e=r.length;if(F(e>=2),e===2)return F(r.charAt(0)===""&&r.charAt(1)===""),ne.emptyPath();const t=e-2,n=[];let i="";for(let s=0;s<e;){const a=r.indexOf("",s);switch((a<0||a>t)&&M(),r.charAt(a+1)){case"":const u=r.substring(s,a);let c;i.length===0?c=u:(i+=u,c=i,i=""),n.push(c);break;case"":i+=r.substring(s,a),i+="\0";break;case"":i+=r.substring(s,a+1);break;default:M()}s=a+2}return new ne(n)}/**
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
 */const ju=["userId","batchId"];/**
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
 */function Ti(r,e){return[r,be(e)]}function Nl(r,e,t){return[r,be(e),t]}const kp={},xp=["prefixPath","collectionGroup","readTime","documentId"],Np=["prefixPath","collectionGroup","documentId"],Op=["collectionGroup","readTime","prefixPath","documentId"],Mp=["canonicalId","targetId"],Lp=["targetId","path"],Fp=["path","targetId"],Up=["collectionId","parent"],Bp=["indexId","uid"],jp=["uid","sequenceNumber"],qp=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],zp=["indexId","uid","orderedDocumentKey"],Kp=["userId","collectionPath","documentId"],$p=["userId","collectionPath","largestBatchId"],Gp=["userId","collectionGroup","largestBatchId"],Ol=["mutationQueues","mutations","documentMutations","remoteDocuments","targets","owner","targetGlobal","targetDocuments","clientMetadata","remoteDocumentGlobal","collectionParents","bundles","namedQueries"],Wp=[...Ol,"documentOverlays"],Ml=["mutationQueues","mutations","documentMutations","remoteDocumentsV14","targets","owner","targetGlobal","targetDocuments","clientMetadata","remoteDocumentGlobal","collectionParents","bundles","namedQueries","documentOverlays"],Ll=Ml,Uo=[...Ll,"indexConfiguration","indexState","indexEntries"],Hp=Uo,Qp=[...Uo,"globals"];/**
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
 */class lo extends Dl{constructor(e,t){super(),this._e=e,this.currentSequenceNumber=t}}function me(r,e){const t=L(r);return Tt.F(t._e,e)}/**
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
 */function qu(r){let e=0;for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e++;return e}function Mn(r,e){for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e(t,r[t])}function Fl(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}/**
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
 */class re{constructor(e,t){this.comparator=e,this.root=t||_e.EMPTY}insert(e,t){return new re(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,_e.BLACK,null,null))}remove(e){return new re(this.comparator,this.root.remove(e,this.comparator).copy(null,null,_e.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const n=this.comparator(e,t.key);if(n===0)return t.value;n<0?t=t.left:n>0&&(t=t.right)}return null}indexOf(e){let t=0,n=this.root;for(;!n.isEmpty();){const i=this.comparator(e,n.key);if(i===0)return t+n.left.size;i<0?n=n.left:(t+=n.left.size+1,n=n.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((t,n)=>(e(t,n),!1))}toString(){const e=[];return this.inorderTraversal((t,n)=>(e.push(`${t}:${n}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new fi(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new fi(this.root,e,this.comparator,!1)}getReverseIterator(){return new fi(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new fi(this.root,e,this.comparator,!0)}}class fi{constructor(e,t,n,i){this.isReverse=i,this.nodeStack=[];let s=1;for(;!e.isEmpty();)if(s=t?n(e.key,t):1,t&&i&&(s*=-1),s<0)e=this.isReverse?e.left:e.right;else{if(s===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class _e{constructor(e,t,n,i,s){this.key=e,this.value=t,this.color=n??_e.RED,this.left=i??_e.EMPTY,this.right=s??_e.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,n,i,s){return new _e(e??this.key,t??this.value,n??this.color,i??this.left,s??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,n){let i=this;const s=n(e,i.key);return i=s<0?i.copy(null,null,null,i.left.insert(e,t,n),null):s===0?i.copy(null,t,null,null,null):i.copy(null,null,null,null,i.right.insert(e,t,n)),i.fixUp()}removeMin(){if(this.left.isEmpty())return _e.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let n,i=this;if(t(e,i.key)<0)i.left.isEmpty()||i.left.isRed()||i.left.left.isRed()||(i=i.moveRedLeft()),i=i.copy(null,null,null,i.left.remove(e,t),null);else{if(i.left.isRed()&&(i=i.rotateRight()),i.right.isEmpty()||i.right.isRed()||i.right.left.isRed()||(i=i.moveRedRight()),t(e,i.key)===0){if(i.right.isEmpty())return _e.EMPTY;n=i.right.min(),i=i.copy(n.key,n.value,null,null,i.right.removeMin())}i=i.copy(null,null,null,null,i.right.remove(e,t))}return i.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,_e.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,_e.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed()||this.right.isRed())throw M();const e=this.left.check();if(e!==this.right.check())throw M();return e+(this.isRed()?0:1)}}_e.EMPTY=null,_e.RED=!0,_e.BLACK=!1;_e.EMPTY=new class{constructor(){this.size=0}get key(){throw M()}get value(){throw M()}get color(){throw M()}get left(){throw M()}get right(){throw M()}copy(e,t,n,i,s){return this}insert(e,t,n){return new _e(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
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
 */class ee{constructor(e){this.comparator=e,this.data=new re(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((t,n)=>(e(t),!1))}forEachInRange(e,t){const n=this.data.getIteratorFrom(e[0]);for(;n.hasNext();){const i=n.getNext();if(this.comparator(i.key,e[1])>=0)return;t(i.key)}}forEachWhile(e,t){let n;for(n=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();n.hasNext();)if(!e(n.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new zu(this.data.getIterator())}getIteratorFrom(e){return new zu(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach(n=>{t=t.add(n)}),t}isEqual(e){if(!(e instanceof ee)||this.size!==e.size)return!1;const t=this.data.getIterator(),n=e.data.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=n.getNext().key;if(this.comparator(i,s)!==0)return!1}return!0}toArray(){const e=[];return this.forEach(t=>{e.push(t)}),e}toString(){const e=[];return this.forEach(t=>e.push(t)),"SortedSet("+e.toString()+")"}copy(e){const t=new ee(this.comparator);return t.data=e,t}}class zu{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function on(r){return r.hasNext()?r.getNext():void 0}/**
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
 */class Me{constructor(e){this.fields=e,e.sort(oe.comparator)}static empty(){return new Me([])}unionWith(e){let t=new ee(oe.comparator);for(const n of this.fields)t=t.add(n);for(const n of e)t=t.add(n);return new Me(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return En(this.fields,e.fields,(t,n)=>t.isEqual(n))}}/**
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
 */class Ul extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
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
 */class he{constructor(e){this.binaryString=e}static fromBase64String(e){const t=function(i){try{return atob(i)}catch(s){throw typeof DOMException<"u"&&s instanceof DOMException?new Ul("Invalid base64 string: "+s):s}}(e);return new he(t)}static fromUint8Array(e){const t=function(i){let s="";for(let a=0;a<i.length;++a)s+=String.fromCharCode(i[a]);return s}(e);return new he(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(t){return btoa(t)}(this.binaryString)}toUint8Array(){return function(t){const n=new Uint8Array(t.length);for(let i=0;i<t.length;i++)n[i]=t.charCodeAt(i);return n}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return z(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}he.EMPTY_BYTE_STRING=new he("");const Jp=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function et(r){if(F(!!r),typeof r=="string"){let e=0;const t=Jp.exec(r);if(F(!!t),t[1]){let i=t[1];i=(i+"000000000").substr(0,9),e=Number(i)}const n=new Date(r);return{seconds:Math.floor(n.getTime()/1e3),nanos:e}}return{seconds:se(r.seconds),nanos:se(r.nanos)}}function se(r){return typeof r=="number"?r:typeof r=="string"?Number(r):0}function wt(r){return typeof r=="string"?he.fromBase64String(r):he.fromUint8Array(r)}/**
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
 */function Bo(r){var e,t;return((t=(((e=r==null?void 0:r.mapValue)===null||e===void 0?void 0:e.fields)||{}).__type__)===null||t===void 0?void 0:t.stringValue)==="server_timestamp"}function jo(r){const e=r.mapValue.fields.__previous_value__;return Bo(e)?jo(e):e}function Sr(r){const e=et(r.mapValue.fields.__local_write_time__.timestampValue);return new ae(e.seconds,e.nanos)}/**
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
 */class Yp{constructor(e,t,n,i,s,a,u,c,d){this.databaseId=e,this.appId=t,this.persistenceKey=n,this.host=i,this.ssl=s,this.forceLongPolling=a,this.autoDetectLongPolling=u,this.longPollingOptions=c,this.useFetchStreams=d}}class Wt{constructor(e,t){this.projectId=e,this.database=t||"(default)"}static empty(){return new Wt("","")}get isDefaultDatabase(){return this.database==="(default)"}isEqual(e){return e instanceof Wt&&e.projectId===this.projectId&&e.database===this.database}}/**
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
 */const gt={mapValue:{fields:{__type__:{stringValue:"__max__"}}}},Ei={nullValue:"NULL_VALUE"};function Ht(r){return"nullValue"in r?0:"booleanValue"in r?1:"integerValue"in r||"doubleValue"in r?2:"timestampValue"in r?3:"stringValue"in r?5:"bytesValue"in r?6:"referenceValue"in r?7:"geoPointValue"in r?8:"arrayValue"in r?9:"mapValue"in r?Bo(r)?4:Bl(r)?9007199254740991:ts(r)?10:11:M()}function Ke(r,e){if(r===e)return!0;const t=Ht(r);if(t!==Ht(e))return!1;switch(t){case 0:case 9007199254740991:return!0;case 1:return r.booleanValue===e.booleanValue;case 4:return Sr(r).isEqual(Sr(e));case 3:return function(i,s){if(typeof i.timestampValue=="string"&&typeof s.timestampValue=="string"&&i.timestampValue.length===s.timestampValue.length)return i.timestampValue===s.timestampValue;const a=et(i.timestampValue),u=et(s.timestampValue);return a.seconds===u.seconds&&a.nanos===u.nanos}(r,e);case 5:return r.stringValue===e.stringValue;case 6:return function(i,s){return wt(i.bytesValue).isEqual(wt(s.bytesValue))}(r,e);case 7:return r.referenceValue===e.referenceValue;case 8:return function(i,s){return se(i.geoPointValue.latitude)===se(s.geoPointValue.latitude)&&se(i.geoPointValue.longitude)===se(s.geoPointValue.longitude)}(r,e);case 2:return function(i,s){if("integerValue"in i&&"integerValue"in s)return se(i.integerValue)===se(s.integerValue);if("doubleValue"in i&&"doubleValue"in s){const a=se(i.doubleValue),u=se(s.doubleValue);return a===u?br(a)===br(u):isNaN(a)&&isNaN(u)}return!1}(r,e);case 9:return En(r.arrayValue.values||[],e.arrayValue.values||[],Ke);case 10:case 11:return function(i,s){const a=i.mapValue.fields||{},u=s.mapValue.fields||{};if(qu(a)!==qu(u))return!1;for(const c in a)if(a.hasOwnProperty(c)&&(u[c]===void 0||!Ke(a[c],u[c])))return!1;return!0}(r,e);default:return M()}}function Pr(r,e){return(r.values||[]).find(t=>Ke(t,e))!==void 0}function At(r,e){if(r===e)return 0;const t=Ht(r),n=Ht(e);if(t!==n)return z(t,n);switch(t){case 0:case 9007199254740991:return 0;case 1:return z(r.booleanValue,e.booleanValue);case 2:return function(s,a){const u=se(s.integerValue||s.doubleValue),c=se(a.integerValue||a.doubleValue);return u<c?-1:u>c?1:u===c?0:isNaN(u)?isNaN(c)?0:-1:1}(r,e);case 3:return Ku(r.timestampValue,e.timestampValue);case 4:return Ku(Sr(r),Sr(e));case 5:return z(r.stringValue,e.stringValue);case 6:return function(s,a){const u=wt(s),c=wt(a);return u.compareTo(c)}(r.bytesValue,e.bytesValue);case 7:return function(s,a){const u=s.split("/"),c=a.split("/");for(let d=0;d<u.length&&d<c.length;d++){const m=z(u[d],c[d]);if(m!==0)return m}return z(u.length,c.length)}(r.referenceValue,e.referenceValue);case 8:return function(s,a){const u=z(se(s.latitude),se(a.latitude));return u!==0?u:z(se(s.longitude),se(a.longitude))}(r.geoPointValue,e.geoPointValue);case 9:return $u(r.arrayValue,e.arrayValue);case 10:return function(s,a){var u,c,d,m;const p=s.fields||{},E=a.fields||{},S=(u=p.value)===null||u===void 0?void 0:u.arrayValue,V=(c=E.value)===null||c===void 0?void 0:c.arrayValue,x=z(((d=S==null?void 0:S.values)===null||d===void 0?void 0:d.length)||0,((m=V==null?void 0:V.values)===null||m===void 0?void 0:m.length)||0);return x!==0?x:$u(S,V)}(r.mapValue,e.mapValue);case 11:return function(s,a){if(s===gt.mapValue&&a===gt.mapValue)return 0;if(s===gt.mapValue)return 1;if(a===gt.mapValue)return-1;const u=s.fields||{},c=Object.keys(u),d=a.fields||{},m=Object.keys(d);c.sort(),m.sort();for(let p=0;p<c.length&&p<m.length;++p){const E=z(c[p],m[p]);if(E!==0)return E;const S=At(u[c[p]],d[m[p]]);if(S!==0)return S}return z(c.length,m.length)}(r.mapValue,e.mapValue);default:throw M()}}function Ku(r,e){if(typeof r=="string"&&typeof e=="string"&&r.length===e.length)return z(r,e);const t=et(r),n=et(e),i=z(t.seconds,n.seconds);return i!==0?i:z(t.nanos,n.nanos)}function $u(r,e){const t=r.values||[],n=e.values||[];for(let i=0;i<t.length&&i<n.length;++i){const s=At(t[i],n[i]);if(s)return s}return z(t.length,n.length)}function wn(r){return ho(r)}function ho(r){return"nullValue"in r?"null":"booleanValue"in r?""+r.booleanValue:"integerValue"in r?""+r.integerValue:"doubleValue"in r?""+r.doubleValue:"timestampValue"in r?function(t){const n=et(t);return`time(${n.seconds},${n.nanos})`}(r.timestampValue):"stringValue"in r?r.stringValue:"bytesValue"in r?function(t){return wt(t).toBase64()}(r.bytesValue):"referenceValue"in r?function(t){return N.fromName(t).toString()}(r.referenceValue):"geoPointValue"in r?function(t){return`geo(${t.latitude},${t.longitude})`}(r.geoPointValue):"arrayValue"in r?function(t){let n="[",i=!0;for(const s of t.values||[])i?i=!1:n+=",",n+=ho(s);return n+"]"}(r.arrayValue):"mapValue"in r?function(t){const n=Object.keys(t.fields||{}).sort();let i="{",s=!0;for(const a of n)s?s=!1:i+=",",i+=`${a}:${ho(t.fields[a])}`;return i+"}"}(r.mapValue):M()}function qo(r,e){return{referenceValue:`projects/${r.projectId}/databases/${r.database}/documents/${e.path.canonicalString()}`}}function fo(r){return!!r&&"integerValue"in r}function Cr(r){return!!r&&"arrayValue"in r}function Gu(r){return!!r&&"nullValue"in r}function Wu(r){return!!r&&"doubleValue"in r&&isNaN(Number(r.doubleValue))}function wi(r){return!!r&&"mapValue"in r}function ts(r){var e,t;return((t=(((e=r==null?void 0:r.mapValue)===null||e===void 0?void 0:e.fields)||{}).__type__)===null||t===void 0?void 0:t.stringValue)==="__vector__"}function pr(r){if(r.geoPointValue)return{geoPointValue:Object.assign({},r.geoPointValue)};if(r.timestampValue&&typeof r.timestampValue=="object")return{timestampValue:Object.assign({},r.timestampValue)};if(r.mapValue){const e={mapValue:{fields:{}}};return Mn(r.mapValue.fields,(t,n)=>e.mapValue.fields[t]=pr(n)),e}if(r.arrayValue){const e={arrayValue:{values:[]}};for(let t=0;t<(r.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=pr(r.arrayValue.values[t]);return e}return Object.assign({},r)}function Bl(r){return(((r.mapValue||{}).fields||{}).__type__||{}).stringValue==="__max__"}const jl={mapValue:{fields:{__type__:{stringValue:"__vector__"},value:{arrayValue:{}}}}};function Xp(r){return"nullValue"in r?Ei:"booleanValue"in r?{booleanValue:!1}:"integerValue"in r||"doubleValue"in r?{doubleValue:NaN}:"timestampValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in r?{stringValue:""}:"bytesValue"in r?{bytesValue:""}:"referenceValue"in r?qo(Wt.empty(),N.empty()):"geoPointValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in r?{arrayValue:{}}:"mapValue"in r?ts(r)?jl:{mapValue:{}}:M()}function Zp(r){return"nullValue"in r?{booleanValue:!1}:"booleanValue"in r?{doubleValue:NaN}:"integerValue"in r||"doubleValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in r?{stringValue:""}:"stringValue"in r?{bytesValue:""}:"bytesValue"in r?qo(Wt.empty(),N.empty()):"referenceValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in r?{arrayValue:{}}:"arrayValue"in r?jl:"mapValue"in r?ts(r)?{mapValue:{}}:gt:M()}function Hu(r,e){const t=At(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?-1:!r.inclusive&&e.inclusive?1:0}function Qu(r,e){const t=At(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?1:!r.inclusive&&e.inclusive?-1:0}/**
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
 */class Ce{constructor(e){this.value=e}static empty(){return new Ce({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let n=0;n<e.length-1;++n)if(t=(t.mapValue.fields||{})[e.get(n)],!wi(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=pr(t)}setAll(e){let t=oe.emptyPath(),n={},i=[];e.forEach((a,u)=>{if(!t.isImmediateParentOf(u)){const c=this.getFieldsMap(t);this.applyChanges(c,n,i),n={},i=[],t=u.popLast()}a?n[u.lastSegment()]=pr(a):i.push(u.lastSegment())});const s=this.getFieldsMap(t);this.applyChanges(s,n,i)}delete(e){const t=this.field(e.popLast());wi(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return Ke(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let n=0;n<e.length;++n){let i=t.mapValue.fields[e.get(n)];wi(i)&&i.mapValue.fields||(i={mapValue:{fields:{}}},t.mapValue.fields[e.get(n)]=i),t=i}return t.mapValue.fields}applyChanges(e,t,n){Mn(t,(i,s)=>e[i]=s);for(const i of n)delete e[i]}clone(){return new Ce(pr(this.value))}}function ql(r){const e=[];return Mn(r.fields,(t,n)=>{const i=new oe([t]);if(wi(n)){const s=ql(n.mapValue).fields;if(s.length===0)e.push(i);else for(const a of s)e.push(i.child(a))}else e.push(i)}),new Me(e)}/**
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
 */class ce{constructor(e,t,n,i,s,a,u){this.key=e,this.documentType=t,this.version=n,this.readTime=i,this.createTime=s,this.data=a,this.documentState=u}static newInvalidDocument(e){return new ce(e,0,U.min(),U.min(),U.min(),Ce.empty(),0)}static newFoundDocument(e,t,n,i){return new ce(e,1,t,U.min(),n,i,0)}static newNoDocument(e,t){return new ce(e,2,t,U.min(),U.min(),Ce.empty(),0)}static newUnknownDocument(e,t){return new ce(e,3,t,U.min(),U.min(),Ce.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(U.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=Ce.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=Ce.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=U.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof ce&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new ce(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
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
 */class An{constructor(e,t){this.position=e,this.inclusive=t}}function Ju(r,e,t){let n=0;for(let i=0;i<r.position.length;i++){const s=e[i],a=r.position[i];if(s.field.isKeyField()?n=N.comparator(N.fromName(a.referenceValue),t.key):n=At(a,t.data.field(s.field)),s.dir==="desc"&&(n*=-1),n!==0)break}return n}function Yu(r,e){if(r===null)return e===null;if(e===null||r.inclusive!==e.inclusive||r.position.length!==e.position.length)return!1;for(let t=0;t<r.position.length;t++)if(!Ke(r.position[t],e.position[t]))return!1;return!0}/**
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
 */class Ni{constructor(e,t="asc"){this.field=e,this.dir=t}}function eg(r,e){return r.dir===e.dir&&r.field.isEqual(e.field)}/**
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
 */class zl{}class H extends zl{constructor(e,t,n){super(),this.field=e,this.op=t,this.value=n}static create(e,t,n){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,n):new tg(e,t,n):t==="array-contains"?new ig(e,n):t==="in"?new Ql(e,n):t==="not-in"?new sg(e,n):t==="array-contains-any"?new og(e,n):new H(e,t,n)}static createKeyFieldInFilter(e,t,n){return t==="in"?new ng(e,n):new rg(e,n)}matches(e){const t=e.data.field(this.field);return this.op==="!="?t!==null&&this.matchesComparison(At(t,this.value)):t!==null&&Ht(this.value)===Ht(t)&&this.matchesComparison(At(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return M()}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class Z extends zl{constructor(e,t){super(),this.filters=e,this.op=t,this.ae=null}static create(e,t){return new Z(e,t)}matches(e){return Rn(this)?this.filters.find(t=>!t.matches(e))===void 0:this.filters.find(t=>t.matches(e))!==void 0}getFlattenedFilters(){return this.ae!==null||(this.ae=this.filters.reduce((e,t)=>e.concat(t.getFlattenedFilters()),[])),this.ae}getFilters(){return Object.assign([],this.filters)}}function Rn(r){return r.op==="and"}function mo(r){return r.op==="or"}function zo(r){return Kl(r)&&Rn(r)}function Kl(r){for(const e of r.filters)if(e instanceof Z)return!1;return!0}function po(r){if(r instanceof H)return r.field.canonicalString()+r.op.toString()+wn(r.value);if(zo(r))return r.filters.map(e=>po(e)).join(",");{const e=r.filters.map(t=>po(t)).join(",");return`${r.op}(${e})`}}function $l(r,e){return r instanceof H?function(n,i){return i instanceof H&&n.op===i.op&&n.field.isEqual(i.field)&&Ke(n.value,i.value)}(r,e):r instanceof Z?function(n,i){return i instanceof Z&&n.op===i.op&&n.filters.length===i.filters.length?n.filters.reduce((s,a,u)=>s&&$l(a,i.filters[u]),!0):!1}(r,e):void M()}function Gl(r,e){const t=r.filters.concat(e);return Z.create(t,r.op)}function Wl(r){return r instanceof H?function(t){return`${t.field.canonicalString()} ${t.op} ${wn(t.value)}`}(r):r instanceof Z?function(t){return t.op.toString()+" {"+t.getFilters().map(Wl).join(" ,")+"}"}(r):"Filter"}class tg extends H{constructor(e,t,n){super(e,t,n),this.key=N.fromName(n.referenceValue)}matches(e){const t=N.comparator(e.key,this.key);return this.matchesComparison(t)}}class ng extends H{constructor(e,t){super(e,"in",t),this.keys=Hl("in",t)}matches(e){return this.keys.some(t=>t.isEqual(e.key))}}class rg extends H{constructor(e,t){super(e,"not-in",t),this.keys=Hl("not-in",t)}matches(e){return!this.keys.some(t=>t.isEqual(e.key))}}function Hl(r,e){var t;return(((t=e.arrayValue)===null||t===void 0?void 0:t.values)||[]).map(n=>N.fromName(n.referenceValue))}class ig extends H{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return Cr(t)&&Pr(t.arrayValue,this.value)}}class Ql extends H{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return t!==null&&Pr(this.value.arrayValue,t)}}class sg extends H{constructor(e,t){super(e,"not-in",t)}matches(e){if(Pr(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return t!==null&&!Pr(this.value.arrayValue,t)}}class og extends H{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!Cr(t)||!t.arrayValue.values)&&t.arrayValue.values.some(n=>Pr(this.value.arrayValue,n))}}/**
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
 */class ag{constructor(e,t=null,n=[],i=[],s=null,a=null,u=null){this.path=e,this.collectionGroup=t,this.orderBy=n,this.filters=i,this.limit=s,this.startAt=a,this.endAt=u,this.ue=null}}function go(r,e=null,t=[],n=[],i=null,s=null,a=null){return new ag(r,e,t,n,i,s,a)}function Qt(r){const e=L(r);if(e.ue===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map(n=>po(n)).join(","),t+="|ob:",t+=e.orderBy.map(n=>function(s){return s.field.canonicalString()+s.dir}(n)).join(","),es(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map(n=>wn(n)).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map(n=>wn(n)).join(",")),e.ue=t}return e.ue}function Ur(r,e){if(r.limit!==e.limit||r.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<r.orderBy.length;t++)if(!eg(r.orderBy[t],e.orderBy[t]))return!1;if(r.filters.length!==e.filters.length)return!1;for(let t=0;t<r.filters.length;t++)if(!$l(r.filters[t],e.filters[t]))return!1;return r.collectionGroup===e.collectionGroup&&!!r.path.isEqual(e.path)&&!!Yu(r.startAt,e.startAt)&&Yu(r.endAt,e.endAt)}function Oi(r){return N.isDocumentKey(r.path)&&r.collectionGroup===null&&r.filters.length===0}function Mi(r,e){return r.filters.filter(t=>t instanceof H&&t.field.isEqual(e))}function Xu(r,e,t){let n=Ei,i=!0;for(const s of Mi(r,e)){let a=Ei,u=!0;switch(s.op){case"<":case"<=":a=Xp(s.value);break;case"==":case"in":case">=":a=s.value;break;case">":a=s.value,u=!1;break;case"!=":case"not-in":a=Ei}Hu({value:n,inclusive:i},{value:a,inclusive:u})<0&&(n=a,i=u)}if(t!==null){for(let s=0;s<r.orderBy.length;++s)if(r.orderBy[s].field.isEqual(e)){const a=t.position[s];Hu({value:n,inclusive:i},{value:a,inclusive:t.inclusive})<0&&(n=a,i=t.inclusive);break}}return{value:n,inclusive:i}}function Zu(r,e,t){let n=gt,i=!0;for(const s of Mi(r,e)){let a=gt,u=!0;switch(s.op){case">=":case">":a=Zp(s.value),u=!1;break;case"==":case"in":case"<=":a=s.value;break;case"<":a=s.value,u=!1;break;case"!=":case"not-in":a=gt}Qu({value:n,inclusive:i},{value:a,inclusive:u})>0&&(n=a,i=u)}if(t!==null){for(let s=0;s<r.orderBy.length;++s)if(r.orderBy[s].field.isEqual(e)){const a=t.position[s];Qu({value:n,inclusive:i},{value:a,inclusive:t.inclusive})>0&&(n=a,i=t.inclusive);break}}return{value:n,inclusive:i}}/**
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
 */class ns{constructor(e,t=null,n=[],i=[],s=null,a="F",u=null,c=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=n,this.filters=i,this.limit=s,this.limitType=a,this.startAt=u,this.endAt=c,this.ce=null,this.le=null,this.he=null,this.startAt,this.endAt}}function Jl(r,e,t,n,i,s,a,u){return new ns(r,e,t,n,i,s,a,u)}function rs(r){return new ns(r)}function ec(r){return r.filters.length===0&&r.limit===null&&r.startAt==null&&r.endAt==null&&(r.explicitOrderBy.length===0||r.explicitOrderBy.length===1&&r.explicitOrderBy[0].field.isKeyField())}function ug(r){return r.collectionGroup!==null}function gr(r){const e=L(r);if(e.ce===null){e.ce=[];const t=new Set;for(const s of e.explicitOrderBy)e.ce.push(s),t.add(s.field.canonicalString());const n=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(a){let u=new ee(oe.comparator);return a.filters.forEach(c=>{c.getFlattenedFilters().forEach(d=>{d.isInequality()&&(u=u.add(d.field))})}),u})(e).forEach(s=>{t.has(s.canonicalString())||s.isKeyField()||e.ce.push(new Ni(s,n))}),t.has(oe.keyField().canonicalString())||e.ce.push(new Ni(oe.keyField(),n))}return e.ce}function Ne(r){const e=L(r);return e.le||(e.le=cg(e,gr(r))),e.le}function cg(r,e){if(r.limitType==="F")return go(r.path,r.collectionGroup,e,r.filters,r.limit,r.startAt,r.endAt);{e=e.map(i=>{const s=i.dir==="desc"?"asc":"desc";return new Ni(i.field,s)});const t=r.endAt?new An(r.endAt.position,r.endAt.inclusive):null,n=r.startAt?new An(r.startAt.position,r.startAt.inclusive):null;return go(r.path,r.collectionGroup,e,r.filters,r.limit,t,n)}}function _o(r,e,t){return new ns(r.path,r.collectionGroup,r.explicitOrderBy.slice(),r.filters.slice(),e,t,r.startAt,r.endAt)}function is(r,e){return Ur(Ne(r),Ne(e))&&r.limitType===e.limitType}function Yl(r){return`${Qt(Ne(r))}|lt:${r.limitType}`}function hn(r){return`Query(target=${function(t){let n=t.path.canonicalString();return t.collectionGroup!==null&&(n+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(n+=`, filters: [${t.filters.map(i=>Wl(i)).join(", ")}]`),es(t.limit)||(n+=", limit: "+t.limit),t.orderBy.length>0&&(n+=`, orderBy: [${t.orderBy.map(i=>function(a){return`${a.field.canonicalString()} (${a.dir})`}(i)).join(", ")}]`),t.startAt&&(n+=", startAt: ",n+=t.startAt.inclusive?"b:":"a:",n+=t.startAt.position.map(i=>wn(i)).join(",")),t.endAt&&(n+=", endAt: ",n+=t.endAt.inclusive?"a:":"b:",n+=t.endAt.position.map(i=>wn(i)).join(",")),`Target(${n})`}(Ne(r))}; limitType=${r.limitType})`}function Br(r,e){return e.isFoundDocument()&&function(n,i){const s=i.key.path;return n.collectionGroup!==null?i.key.hasCollectionId(n.collectionGroup)&&n.path.isPrefixOf(s):N.isDocumentKey(n.path)?n.path.isEqual(s):n.path.isImmediateParentOf(s)}(r,e)&&function(n,i){for(const s of gr(n))if(!s.field.isKeyField()&&i.data.field(s.field)===null)return!1;return!0}(r,e)&&function(n,i){for(const s of n.filters)if(!s.matches(i))return!1;return!0}(r,e)&&function(n,i){return!(n.startAt&&!function(a,u,c){const d=Ju(a,u,c);return a.inclusive?d<=0:d<0}(n.startAt,gr(n),i)||n.endAt&&!function(a,u,c){const d=Ju(a,u,c);return a.inclusive?d>=0:d>0}(n.endAt,gr(n),i))}(r,e)}function Xl(r){return r.collectionGroup||(r.path.length%2==1?r.path.lastSegment():r.path.get(r.path.length-2))}function Zl(r){return(e,t)=>{let n=!1;for(const i of gr(r)){const s=lg(i,e,t);if(s!==0)return s;n=n||i.field.isKeyField()}return 0}}function lg(r,e,t){const n=r.field.isKeyField()?N.comparator(e.key,t.key):function(s,a,u){const c=a.data.field(s),d=u.data.field(s);return c!==null&&d!==null?At(c,d):M()}(r.field,e,t);switch(r.dir){case"asc":return n;case"desc":return-1*n;default:return M()}}/**
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
 */class Ct{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n!==void 0){for(const[i,s]of n)if(this.equalsFn(i,e))return s}}has(e){return this.get(e)!==void 0}set(e,t){const n=this.mapKeyFn(e),i=this.inner[n];if(i===void 0)return this.inner[n]=[[e,t]],void this.innerSize++;for(let s=0;s<i.length;s++)if(this.equalsFn(i[s][0],e))return void(i[s]=[e,t]);i.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n===void 0)return!1;for(let i=0;i<n.length;i++)if(this.equalsFn(n[i][0],e))return n.length===1?delete this.inner[t]:n.splice(i,1),this.innerSize--,!0;return!1}forEach(e){Mn(this.inner,(t,n)=>{for(const[i,s]of n)e(i,s)})}isEmpty(){return Fl(this.inner)}size(){return this.innerSize}}/**
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
 */const hg=new re(N.comparator);function xe(){return hg}const eh=new re(N.comparator);function lr(...r){let e=eh;for(const t of r)e=e.insert(t.key,t);return e}function th(r){let e=eh;return r.forEach((t,n)=>e=e.insert(t,n.overlayedDocument)),e}function je(){return _r()}function nh(){return _r()}function _r(){return new Ct(r=>r.toString(),(r,e)=>r.isEqual(e))}const dg=new re(N.comparator),fg=new ee(N.comparator);function $(...r){let e=fg;for(const t of r)e=e.add(t);return e}const mg=new ee(z);function Ko(){return mg}/**
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
 */function $o(r,e){if(r.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:br(e)?"-0":e}}function rh(r){return{integerValue:""+r}}function pg(r,e){return xl(e)?rh(e):$o(r,e)}/**
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
 */class ss{constructor(){this._=void 0}}function gg(r,e,t){return r instanceof Vr?function(i,s){const a={fields:{__type__:{stringValue:"server_timestamp"},__local_write_time__:{timestampValue:{seconds:i.seconds,nanos:i.nanoseconds}}}};return s&&Bo(s)&&(s=jo(s)),s&&(a.fields.__previous_value__=s),{mapValue:a}}(t,e):r instanceof bn?sh(r,e):r instanceof Sn?oh(r,e):function(i,s){const a=ih(i,s),u=tc(a)+tc(i.Pe);return fo(a)&&fo(i.Pe)?rh(u):$o(i.serializer,u)}(r,e)}function _g(r,e,t){return r instanceof bn?sh(r,e):r instanceof Sn?oh(r,e):t}function ih(r,e){return r instanceof Dr?function(n){return fo(n)||function(s){return!!s&&"doubleValue"in s}(n)}(e)?e:{integerValue:0}:null}class Vr extends ss{}class bn extends ss{constructor(e){super(),this.elements=e}}function sh(r,e){const t=ah(e);for(const n of r.elements)t.some(i=>Ke(i,n))||t.push(n);return{arrayValue:{values:t}}}class Sn extends ss{constructor(e){super(),this.elements=e}}function oh(r,e){let t=ah(e);for(const n of r.elements)t=t.filter(i=>!Ke(i,n));return{arrayValue:{values:t}}}class Dr extends ss{constructor(e,t){super(),this.serializer=e,this.Pe=t}}function tc(r){return se(r.integerValue||r.doubleValue)}function ah(r){return Cr(r)&&r.arrayValue.values?r.arrayValue.values.slice():[]}/**
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
 */class yg{constructor(e,t){this.field=e,this.transform=t}}function Ig(r,e){return r.field.isEqual(e.field)&&function(n,i){return n instanceof bn&&i instanceof bn||n instanceof Sn&&i instanceof Sn?En(n.elements,i.elements,Ke):n instanceof Dr&&i instanceof Dr?Ke(n.Pe,i.Pe):n instanceof Vr&&i instanceof Vr}(r.transform,e.transform)}class vg{constructor(e,t){this.version=e,this.transformResults=t}}class De{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new De}static exists(e){return new De(void 0,e)}static updateTime(e){return new De(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function Ai(r,e){return r.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(r.updateTime):r.exists===void 0||r.exists===e.isFoundDocument()}class os{}function uh(r,e){if(!r.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return r.isNoDocument()?new as(r.key,De.none()):new Ln(r.key,r.data,De.none());{const t=r.data,n=Ce.empty();let i=new ee(oe.comparator);for(let s of e.fields)if(!i.has(s)){let a=t.field(s);a===null&&s.length>1&&(s=s.popLast(),a=t.field(s)),a===null?n.delete(s):n.set(s,a),i=i.add(s)}return new Vt(r.key,n,new Me(i.toArray()),De.none())}}function Tg(r,e,t){r instanceof Ln?function(i,s,a){const u=i.value.clone(),c=rc(i.fieldTransforms,s,a.transformResults);u.setAll(c),s.convertToFoundDocument(a.version,u).setHasCommittedMutations()}(r,e,t):r instanceof Vt?function(i,s,a){if(!Ai(i.precondition,s))return void s.convertToUnknownDocument(a.version);const u=rc(i.fieldTransforms,s,a.transformResults),c=s.data;c.setAll(ch(i)),c.setAll(u),s.convertToFoundDocument(a.version,c).setHasCommittedMutations()}(r,e,t):function(i,s,a){s.convertToNoDocument(a.version).setHasCommittedMutations()}(0,e,t)}function yr(r,e,t,n){return r instanceof Ln?function(s,a,u,c){if(!Ai(s.precondition,a))return u;const d=s.value.clone(),m=ic(s.fieldTransforms,c,a);return d.setAll(m),a.convertToFoundDocument(a.version,d).setHasLocalMutations(),null}(r,e,t,n):r instanceof Vt?function(s,a,u,c){if(!Ai(s.precondition,a))return u;const d=ic(s.fieldTransforms,c,a),m=a.data;return m.setAll(ch(s)),m.setAll(d),a.convertToFoundDocument(a.version,m).setHasLocalMutations(),u===null?null:u.unionWith(s.fieldMask.fields).unionWith(s.fieldTransforms.map(p=>p.field))}(r,e,t,n):function(s,a,u){return Ai(s.precondition,a)?(a.convertToNoDocument(a.version).setHasLocalMutations(),null):u}(r,e,t)}function Eg(r,e){let t=null;for(const n of r.fieldTransforms){const i=e.data.field(n.field),s=ih(n.transform,i||null);s!=null&&(t===null&&(t=Ce.empty()),t.set(n.field,s))}return t||null}function nc(r,e){return r.type===e.type&&!!r.key.isEqual(e.key)&&!!r.precondition.isEqual(e.precondition)&&!!function(n,i){return n===void 0&&i===void 0||!(!n||!i)&&En(n,i,(s,a)=>Ig(s,a))}(r.fieldTransforms,e.fieldTransforms)&&(r.type===0?r.value.isEqual(e.value):r.type!==1||r.data.isEqual(e.data)&&r.fieldMask.isEqual(e.fieldMask))}class Ln extends os{constructor(e,t,n,i=[]){super(),this.key=e,this.value=t,this.precondition=n,this.fieldTransforms=i,this.type=0}getFieldMask(){return null}}class Vt extends os{constructor(e,t,n,i,s=[]){super(),this.key=e,this.data=t,this.fieldMask=n,this.precondition=i,this.fieldTransforms=s,this.type=1}getFieldMask(){return this.fieldMask}}function ch(r){const e=new Map;return r.fieldMask.fields.forEach(t=>{if(!t.isEmpty()){const n=r.data.field(t);e.set(t,n)}}),e}function rc(r,e,t){const n=new Map;F(r.length===t.length);for(let i=0;i<t.length;i++){const s=r[i],a=s.transform,u=e.data.field(s.field);n.set(s.field,_g(a,u,t[i]))}return n}function ic(r,e,t){const n=new Map;for(const i of r){const s=i.transform,a=t.data.field(i.field);n.set(i.field,gg(s,a,e))}return n}class as extends os{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class lh extends os{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
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
 */class Go{constructor(e,t,n,i){this.batchId=e,this.localWriteTime=t,this.baseMutations=n,this.mutations=i}applyToRemoteDocument(e,t){const n=t.mutationResults;for(let i=0;i<this.mutations.length;i++){const s=this.mutations[i];s.key.isEqual(e.key)&&Tg(s,e,n[i])}}applyToLocalView(e,t){for(const n of this.baseMutations)n.key.isEqual(e.key)&&(t=yr(n,e,t,this.localWriteTime));for(const n of this.mutations)n.key.isEqual(e.key)&&(t=yr(n,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const n=nh();return this.mutations.forEach(i=>{const s=e.get(i.key),a=s.overlayedDocument;let u=this.applyToLocalView(a,s.mutatedFields);u=t.has(i.key)?null:u;const c=uh(a,u);c!==null&&n.set(i.key,c),a.isValidDocument()||a.convertToNoDocument(U.min())}),n}keys(){return this.mutations.reduce((e,t)=>e.add(t.key),$())}isEqual(e){return this.batchId===e.batchId&&En(this.mutations,e.mutations,(t,n)=>nc(t,n))&&En(this.baseMutations,e.baseMutations,(t,n)=>nc(t,n))}}class Wo{constructor(e,t,n,i){this.batch=e,this.commitVersion=t,this.mutationResults=n,this.docVersions=i}static from(e,t,n){F(e.mutations.length===n.length);let i=function(){return dg}();const s=e.mutations;for(let a=0;a<s.length;a++)i=i.insert(s[a].key,n[a].version);return new Wo(e,t,n,i)}}/**
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
 */class Ho{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
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
 */class wg{constructor(e,t){this.count=e,this.unchangedNames=t}}/**
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
 */var de,J;function Ag(r){switch(r){default:return M();case P.CANCELLED:case P.UNKNOWN:case P.DEADLINE_EXCEEDED:case P.RESOURCE_EXHAUSTED:case P.INTERNAL:case P.UNAVAILABLE:case P.UNAUTHENTICATED:return!1;case P.INVALID_ARGUMENT:case P.NOT_FOUND:case P.ALREADY_EXISTS:case P.PERMISSION_DENIED:case P.FAILED_PRECONDITION:case P.ABORTED:case P.OUT_OF_RANGE:case P.UNIMPLEMENTED:case P.DATA_LOSS:return!0}}function hh(r){if(r===void 0)return le("GRPC error has no .code"),P.UNKNOWN;switch(r){case de.OK:return P.OK;case de.CANCELLED:return P.CANCELLED;case de.UNKNOWN:return P.UNKNOWN;case de.DEADLINE_EXCEEDED:return P.DEADLINE_EXCEEDED;case de.RESOURCE_EXHAUSTED:return P.RESOURCE_EXHAUSTED;case de.INTERNAL:return P.INTERNAL;case de.UNAVAILABLE:return P.UNAVAILABLE;case de.UNAUTHENTICATED:return P.UNAUTHENTICATED;case de.INVALID_ARGUMENT:return P.INVALID_ARGUMENT;case de.NOT_FOUND:return P.NOT_FOUND;case de.ALREADY_EXISTS:return P.ALREADY_EXISTS;case de.PERMISSION_DENIED:return P.PERMISSION_DENIED;case de.FAILED_PRECONDITION:return P.FAILED_PRECONDITION;case de.ABORTED:return P.ABORTED;case de.OUT_OF_RANGE:return P.OUT_OF_RANGE;case de.UNIMPLEMENTED:return P.UNIMPLEMENTED;case de.DATA_LOSS:return P.DATA_LOSS;default:return M()}}(J=de||(de={}))[J.OK=0]="OK",J[J.CANCELLED=1]="CANCELLED",J[J.UNKNOWN=2]="UNKNOWN",J[J.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",J[J.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",J[J.NOT_FOUND=5]="NOT_FOUND",J[J.ALREADY_EXISTS=6]="ALREADY_EXISTS",J[J.PERMISSION_DENIED=7]="PERMISSION_DENIED",J[J.UNAUTHENTICATED=16]="UNAUTHENTICATED",J[J.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",J[J.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",J[J.ABORTED=10]="ABORTED",J[J.OUT_OF_RANGE=11]="OUT_OF_RANGE",J[J.UNIMPLEMENTED=12]="UNIMPLEMENTED",J[J.INTERNAL=13]="INTERNAL",J[J.UNAVAILABLE=14]="UNAVAILABLE",J[J.DATA_LOSS=15]="DATA_LOSS";/**
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
 */function Rg(){return new TextEncoder}/**
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
 */const bg=new zt([4294967295,4294967295],0);function sc(r){const e=Rg().encode(r),t=new vl;return t.update(e),new Uint8Array(t.digest())}function oc(r){const e=new DataView(r.buffer),t=e.getUint32(0,!0),n=e.getUint32(4,!0),i=e.getUint32(8,!0),s=e.getUint32(12,!0);return[new zt([t,n],0),new zt([i,s],0)]}class Qo{constructor(e,t,n){if(this.bitmap=e,this.padding=t,this.hashCount=n,t<0||t>=8)throw new hr(`Invalid padding: ${t}`);if(n<0)throw new hr(`Invalid hash count: ${n}`);if(e.length>0&&this.hashCount===0)throw new hr(`Invalid hash count: ${n}`);if(e.length===0&&t!==0)throw new hr(`Invalid padding when bitmap length is 0: ${t}`);this.Ie=8*e.length-t,this.Te=zt.fromNumber(this.Ie)}Ee(e,t,n){let i=e.add(t.multiply(zt.fromNumber(n)));return i.compare(bg)===1&&(i=new zt([i.getBits(0),i.getBits(1)],0)),i.modulo(this.Te).toNumber()}de(e){return(this.bitmap[Math.floor(e/8)]&1<<e%8)!=0}mightContain(e){if(this.Ie===0)return!1;const t=sc(e),[n,i]=oc(t);for(let s=0;s<this.hashCount;s++){const a=this.Ee(n,i,s);if(!this.de(a))return!1}return!0}static create(e,t,n){const i=e%8==0?0:8-e%8,s=new Uint8Array(Math.ceil(e/8)),a=new Qo(s,i,t);return n.forEach(u=>a.insert(u)),a}insert(e){if(this.Ie===0)return;const t=sc(e),[n,i]=oc(t);for(let s=0;s<this.hashCount;s++){const a=this.Ee(n,i,s);this.Ae(a)}}Ae(e){const t=Math.floor(e/8),n=e%8;this.bitmap[t]|=1<<n}}class hr extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
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
 */class jr{constructor(e,t,n,i,s){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=n,this.documentUpdates=i,this.resolvedLimboDocuments=s}static createSynthesizedRemoteEventForCurrentChange(e,t,n){const i=new Map;return i.set(e,qr.createSynthesizedTargetChangeForCurrentChange(e,t,n)),new jr(U.min(),i,new re(z),xe(),$())}}class qr{constructor(e,t,n,i,s){this.resumeToken=e,this.current=t,this.addedDocuments=n,this.modifiedDocuments=i,this.removedDocuments=s}static createSynthesizedTargetChangeForCurrentChange(e,t,n){return new qr(n,t,$(),$(),$())}}/**
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
 */class Ri{constructor(e,t,n,i){this.Re=e,this.removedTargetIds=t,this.key=n,this.Ve=i}}class dh{constructor(e,t){this.targetId=e,this.me=t}}class fh{constructor(e,t,n=he.EMPTY_BYTE_STRING,i=null){this.state=e,this.targetIds=t,this.resumeToken=n,this.cause=i}}class ac{constructor(){this.fe=0,this.ge=cc(),this.pe=he.EMPTY_BYTE_STRING,this.ye=!1,this.we=!0}get current(){return this.ye}get resumeToken(){return this.pe}get Se(){return this.fe!==0}get be(){return this.we}De(e){e.approximateByteSize()>0&&(this.we=!0,this.pe=e)}ve(){let e=$(),t=$(),n=$();return this.ge.forEach((i,s)=>{switch(s){case 0:e=e.add(i);break;case 2:t=t.add(i);break;case 1:n=n.add(i);break;default:M()}}),new qr(this.pe,this.ye,e,t,n)}Ce(){this.we=!1,this.ge=cc()}Fe(e,t){this.we=!0,this.ge=this.ge.insert(e,t)}Me(e){this.we=!0,this.ge=this.ge.remove(e)}xe(){this.fe+=1}Oe(){this.fe-=1,F(this.fe>=0)}Ne(){this.we=!0,this.ye=!0}}class Sg{constructor(e){this.Le=e,this.Be=new Map,this.ke=xe(),this.qe=uc(),this.Qe=new re(z)}Ke(e){for(const t of e.Re)e.Ve&&e.Ve.isFoundDocument()?this.$e(t,e.Ve):this.Ue(t,e.key,e.Ve);for(const t of e.removedTargetIds)this.Ue(t,e.key,e.Ve)}We(e){this.forEachTarget(e,t=>{const n=this.Ge(t);switch(e.state){case 0:this.ze(t)&&n.De(e.resumeToken);break;case 1:n.Oe(),n.Se||n.Ce(),n.De(e.resumeToken);break;case 2:n.Oe(),n.Se||this.removeTarget(t);break;case 3:this.ze(t)&&(n.Ne(),n.De(e.resumeToken));break;case 4:this.ze(t)&&(this.je(t),n.De(e.resumeToken));break;default:M()}})}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.Be.forEach((n,i)=>{this.ze(i)&&t(i)})}He(e){const t=e.targetId,n=e.me.count,i=this.Je(t);if(i){const s=i.target;if(Oi(s))if(n===0){const a=new N(s.path);this.Ue(t,a,ce.newNoDocument(a,U.min()))}else F(n===1);else{const a=this.Ye(t);if(a!==n){const u=this.Ze(e),c=u?this.Xe(u,e,a):1;if(c!==0){this.je(t);const d=c===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Qe=this.Qe.insert(t,d)}}}}}Ze(e){const t=e.me.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:n="",padding:i=0},hashCount:s=0}=t;let a,u;try{a=wt(n).toUint8Array()}catch(c){if(c instanceof Ul)return wr("Decoding the base64 bloom filter in existence filter failed ("+c.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw c}try{u=new Qo(a,i,s)}catch(c){return wr(c instanceof hr?"BloomFilter error: ":"Applying bloom filter failed: ",c),null}return u.Ie===0?null:u}Xe(e,t,n){return t.me.count===n-this.nt(e,t.targetId)?0:2}nt(e,t){const n=this.Le.getRemoteKeysForTarget(t);let i=0;return n.forEach(s=>{const a=this.Le.tt(),u=`projects/${a.projectId}/databases/${a.database}/documents/${s.path.canonicalString()}`;e.mightContain(u)||(this.Ue(t,s,null),i++)}),i}rt(e){const t=new Map;this.Be.forEach((s,a)=>{const u=this.Je(a);if(u){if(s.current&&Oi(u.target)){const c=new N(u.target.path);this.ke.get(c)!==null||this.it(a,c)||this.Ue(a,c,ce.newNoDocument(c,e))}s.be&&(t.set(a,s.ve()),s.Ce())}});let n=$();this.qe.forEach((s,a)=>{let u=!0;a.forEachWhile(c=>{const d=this.Je(c);return!d||d.purpose==="TargetPurposeLimboResolution"||(u=!1,!1)}),u&&(n=n.add(s))}),this.ke.forEach((s,a)=>a.setReadTime(e));const i=new jr(e,t,this.Qe,this.ke,n);return this.ke=xe(),this.qe=uc(),this.Qe=new re(z),i}$e(e,t){if(!this.ze(e))return;const n=this.it(e,t.key)?2:0;this.Ge(e).Fe(t.key,n),this.ke=this.ke.insert(t.key,t),this.qe=this.qe.insert(t.key,this.st(t.key).add(e))}Ue(e,t,n){if(!this.ze(e))return;const i=this.Ge(e);this.it(e,t)?i.Fe(t,1):i.Me(t),this.qe=this.qe.insert(t,this.st(t).delete(e)),n&&(this.ke=this.ke.insert(t,n))}removeTarget(e){this.Be.delete(e)}Ye(e){const t=this.Ge(e).ve();return this.Le.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}xe(e){this.Ge(e).xe()}Ge(e){let t=this.Be.get(e);return t||(t=new ac,this.Be.set(e,t)),t}st(e){let t=this.qe.get(e);return t||(t=new ee(z),this.qe=this.qe.insert(e,t)),t}ze(e){const t=this.Je(e)!==null;return t||C("WatchChangeAggregator","Detected inactive target",e),t}Je(e){const t=this.Be.get(e);return t&&t.Se?null:this.Le.ot(e)}je(e){this.Be.set(e,new ac),this.Le.getRemoteKeysForTarget(e).forEach(t=>{this.Ue(e,t,null)})}it(e,t){return this.Le.getRemoteKeysForTarget(e).has(t)}}function uc(){return new re(N.comparator)}function cc(){return new re(N.comparator)}const Pg={asc:"ASCENDING",desc:"DESCENDING"},Cg={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},Vg={and:"AND",or:"OR"};class Dg{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function yo(r,e){return r.useProto3Json||es(e)?e:{value:e}}function Pn(r,e){return r.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function mh(r,e){return r.useProto3Json?e.toBase64():e.toUint8Array()}function kg(r,e){return Pn(r,e.toTimestamp())}function Se(r){return F(!!r),U.fromTimestamp(function(t){const n=et(t);return new ae(n.seconds,n.nanos)}(r))}function Jo(r,e){return Io(r,e).canonicalString()}function Io(r,e){const t=function(i){return new ne(["projects",i.projectId,"databases",i.database])}(r).child("documents");return e===void 0?t:t.child(e)}function ph(r){const e=ne.fromString(r);return F(Ah(e)),e}function Li(r,e){return Jo(r.databaseId,e.path)}function Kt(r,e){const t=ph(e);if(t.get(1)!==r.databaseId.projectId)throw new O(P.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+r.databaseId.projectId);if(t.get(3)!==r.databaseId.database)throw new O(P.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+r.databaseId.database);return new N(yh(t))}function gh(r,e){return Jo(r.databaseId,e)}function _h(r){const e=ph(r);return e.length===4?ne.emptyPath():yh(e)}function vo(r){return new ne(["projects",r.databaseId.projectId,"databases",r.databaseId.database]).canonicalString()}function yh(r){return F(r.length>4&&r.get(4)==="documents"),r.popFirst(5)}function lc(r,e,t){return{name:Li(r,e),fields:t.value.mapValue.fields}}function xg(r,e,t){const n=Kt(r,e.name),i=Se(e.updateTime),s=e.createTime?Se(e.createTime):U.min(),a=new Ce({mapValue:{fields:e.fields}}),u=ce.newFoundDocument(n,i,s,a);return t&&u.setHasCommittedMutations(),t?u.setHasCommittedMutations():u}function Ng(r,e){let t;if("targetChange"in e){e.targetChange;const n=function(d){return d==="NO_CHANGE"?0:d==="ADD"?1:d==="REMOVE"?2:d==="CURRENT"?3:d==="RESET"?4:M()}(e.targetChange.targetChangeType||"NO_CHANGE"),i=e.targetChange.targetIds||[],s=function(d,m){return d.useProto3Json?(F(m===void 0||typeof m=="string"),he.fromBase64String(m||"")):(F(m===void 0||m instanceof Buffer||m instanceof Uint8Array),he.fromUint8Array(m||new Uint8Array))}(r,e.targetChange.resumeToken),a=e.targetChange.cause,u=a&&function(d){const m=d.code===void 0?P.UNKNOWN:hh(d.code);return new O(m,d.message||"")}(a);t=new fh(n,i,s,u||null)}else if("documentChange"in e){e.documentChange;const n=e.documentChange;n.document,n.document.name,n.document.updateTime;const i=Kt(r,n.document.name),s=Se(n.document.updateTime),a=n.document.createTime?Se(n.document.createTime):U.min(),u=new Ce({mapValue:{fields:n.document.fields}}),c=ce.newFoundDocument(i,s,a,u),d=n.targetIds||[],m=n.removedTargetIds||[];t=new Ri(d,m,c.key,c)}else if("documentDelete"in e){e.documentDelete;const n=e.documentDelete;n.document;const i=Kt(r,n.document),s=n.readTime?Se(n.readTime):U.min(),a=ce.newNoDocument(i,s),u=n.removedTargetIds||[];t=new Ri([],u,a.key,a)}else if("documentRemove"in e){e.documentRemove;const n=e.documentRemove;n.document;const i=Kt(r,n.document),s=n.removedTargetIds||[];t=new Ri([],s,i,null)}else{if(!("filter"in e))return M();{e.filter;const n=e.filter;n.targetId;const{count:i=0,unchangedNames:s}=n,a=new wg(i,s),u=n.targetId;t=new dh(u,a)}}return t}function Fi(r,e){let t;if(e instanceof Ln)t={update:lc(r,e.key,e.value)};else if(e instanceof as)t={delete:Li(r,e.key)};else if(e instanceof Vt)t={update:lc(r,e.key,e.data),updateMask:Bg(e.fieldMask)};else{if(!(e instanceof lh))return M();t={verify:Li(r,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map(n=>function(s,a){const u=a.transform;if(u instanceof Vr)return{fieldPath:a.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(u instanceof bn)return{fieldPath:a.field.canonicalString(),appendMissingElements:{values:u.elements}};if(u instanceof Sn)return{fieldPath:a.field.canonicalString(),removeAllFromArray:{values:u.elements}};if(u instanceof Dr)return{fieldPath:a.field.canonicalString(),increment:u.Pe};throw M()}(0,n))),e.precondition.isNone||(t.currentDocument=function(i,s){return s.updateTime!==void 0?{updateTime:kg(i,s.updateTime)}:s.exists!==void 0?{exists:s.exists}:M()}(r,e.precondition)),t}function To(r,e){const t=e.currentDocument?function(s){return s.updateTime!==void 0?De.updateTime(Se(s.updateTime)):s.exists!==void 0?De.exists(s.exists):De.none()}(e.currentDocument):De.none(),n=e.updateTransforms?e.updateTransforms.map(i=>function(a,u){let c=null;if("setToServerValue"in u)F(u.setToServerValue==="REQUEST_TIME"),c=new Vr;else if("appendMissingElements"in u){const m=u.appendMissingElements.values||[];c=new bn(m)}else if("removeAllFromArray"in u){const m=u.removeAllFromArray.values||[];c=new Sn(m)}else"increment"in u?c=new Dr(a,u.increment):M();const d=oe.fromServerFormat(u.fieldPath);return new yg(d,c)}(r,i)):[];if(e.update){e.update.name;const i=Kt(r,e.update.name),s=new Ce({mapValue:{fields:e.update.fields}});if(e.updateMask){const a=function(c){const d=c.fieldPaths||[];return new Me(d.map(m=>oe.fromServerFormat(m)))}(e.updateMask);return new Vt(i,s,a,t,n)}return new Ln(i,s,t,n)}if(e.delete){const i=Kt(r,e.delete);return new as(i,t)}if(e.verify){const i=Kt(r,e.verify);return new lh(i,t)}return M()}function Og(r,e){return r&&r.length>0?(F(e!==void 0),r.map(t=>function(i,s){let a=i.updateTime?Se(i.updateTime):Se(s);return a.isEqual(U.min())&&(a=Se(s)),new vg(a,i.transformResults||[])}(t,e))):[]}function Ih(r,e){return{documents:[gh(r,e.path)]}}function vh(r,e){const t={structuredQuery:{}},n=e.path;let i;e.collectionGroup!==null?(i=n,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(i=n.popLast(),t.structuredQuery.from=[{collectionId:n.lastSegment()}]),t.parent=gh(r,i);const s=function(d){if(d.length!==0)return wh(Z.create(d,"and"))}(e.filters);s&&(t.structuredQuery.where=s);const a=function(d){if(d.length!==0)return d.map(m=>function(E){return{field:dn(E.field),direction:Lg(E.dir)}}(m))}(e.orderBy);a&&(t.structuredQuery.orderBy=a);const u=yo(r,e.limit);return u!==null&&(t.structuredQuery.limit=u),e.startAt&&(t.structuredQuery.startAt=function(d){return{before:d.inclusive,values:d.position}}(e.startAt)),e.endAt&&(t.structuredQuery.endAt=function(d){return{before:!d.inclusive,values:d.position}}(e.endAt)),{_t:t,parent:i}}function Th(r){let e=_h(r.parent);const t=r.structuredQuery,n=t.from?t.from.length:0;let i=null;if(n>0){F(n===1);const m=t.from[0];m.allDescendants?i=m.collectionId:e=e.child(m.collectionId)}let s=[];t.where&&(s=function(p){const E=Eh(p);return E instanceof Z&&zo(E)?E.getFilters():[E]}(t.where));let a=[];t.orderBy&&(a=function(p){return p.map(E=>function(V){return new Ni(fn(V.field),function(D){switch(D){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(V.direction))}(E))}(t.orderBy));let u=null;t.limit&&(u=function(p){let E;return E=typeof p=="object"?p.value:p,es(E)?null:E}(t.limit));let c=null;t.startAt&&(c=function(p){const E=!!p.before,S=p.values||[];return new An(S,E)}(t.startAt));let d=null;return t.endAt&&(d=function(p){const E=!p.before,S=p.values||[];return new An(S,E)}(t.endAt)),Jl(e,i,a,s,u,"F",c,d)}function Mg(r,e){const t=function(i){switch(i){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return M()}}(e.purpose);return t==null?null:{"goog-listen-tags":t}}function Eh(r){return r.unaryFilter!==void 0?function(t){switch(t.unaryFilter.op){case"IS_NAN":const n=fn(t.unaryFilter.field);return H.create(n,"==",{doubleValue:NaN});case"IS_NULL":const i=fn(t.unaryFilter.field);return H.create(i,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const s=fn(t.unaryFilter.field);return H.create(s,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const a=fn(t.unaryFilter.field);return H.create(a,"!=",{nullValue:"NULL_VALUE"});default:return M()}}(r):r.fieldFilter!==void 0?function(t){return H.create(fn(t.fieldFilter.field),function(i){switch(i){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";default:return M()}}(t.fieldFilter.op),t.fieldFilter.value)}(r):r.compositeFilter!==void 0?function(t){return Z.create(t.compositeFilter.filters.map(n=>Eh(n)),function(i){switch(i){case"AND":return"and";case"OR":return"or";default:return M()}}(t.compositeFilter.op))}(r):M()}function Lg(r){return Pg[r]}function Fg(r){return Cg[r]}function Ug(r){return Vg[r]}function dn(r){return{fieldPath:r.canonicalString()}}function fn(r){return oe.fromServerFormat(r.fieldPath)}function wh(r){return r instanceof H?function(t){if(t.op==="=="){if(Wu(t.value))return{unaryFilter:{field:dn(t.field),op:"IS_NAN"}};if(Gu(t.value))return{unaryFilter:{field:dn(t.field),op:"IS_NULL"}}}else if(t.op==="!="){if(Wu(t.value))return{unaryFilter:{field:dn(t.field),op:"IS_NOT_NAN"}};if(Gu(t.value))return{unaryFilter:{field:dn(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:dn(t.field),op:Fg(t.op),value:t.value}}}(r):r instanceof Z?function(t){const n=t.getFilters().map(i=>wh(i));return n.length===1?n[0]:{compositeFilter:{op:Ug(t.op),filters:n}}}(r):M()}function Bg(r){const e=[];return r.fields.forEach(t=>e.push(t.canonicalString())),{fieldPaths:e}}function Ah(r){return r.length>=4&&r.get(0)==="projects"&&r.get(2)==="databases"}/**
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
 */class Qe{constructor(e,t,n,i,s=U.min(),a=U.min(),u=he.EMPTY_BYTE_STRING,c=null){this.target=e,this.targetId=t,this.purpose=n,this.sequenceNumber=i,this.snapshotVersion=s,this.lastLimboFreeSnapshotVersion=a,this.resumeToken=u,this.expectedCount=c}withSequenceNumber(e){return new Qe(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new Qe(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new Qe(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new Qe(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
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
 */class Rh{constructor(e){this.ct=e}}function jg(r,e){let t;if(e.document)t=xg(r.ct,e.document,!!e.hasCommittedMutations);else if(e.noDocument){const n=N.fromSegments(e.noDocument.path),i=Yt(e.noDocument.readTime);t=ce.newNoDocument(n,i),e.hasCommittedMutations&&t.setHasCommittedMutations()}else{if(!e.unknownDocument)return M();{const n=N.fromSegments(e.unknownDocument.path),i=Yt(e.unknownDocument.version);t=ce.newUnknownDocument(n,i)}}return e.readTime&&t.setReadTime(function(i){const s=new ae(i[0],i[1]);return U.fromTimestamp(s)}(e.readTime)),t}function hc(r,e){const t=e.key,n={prefixPath:t.getCollectionPath().popLast().toArray(),collectionGroup:t.collectionGroup,documentId:t.path.lastSegment(),readTime:Ui(e.readTime),hasCommittedMutations:e.hasCommittedMutations};if(e.isFoundDocument())n.document=function(s,a){return{name:Li(s,a.key),fields:a.data.value.mapValue.fields,updateTime:Pn(s,a.version.toTimestamp()),createTime:Pn(s,a.createTime.toTimestamp())}}(r.ct,e);else if(e.isNoDocument())n.noDocument={path:t.path.toArray(),readTime:Jt(e.version)};else{if(!e.isUnknownDocument())return M();n.unknownDocument={path:t.path.toArray(),version:Jt(e.version)}}return n}function Ui(r){const e=r.toTimestamp();return[e.seconds,e.nanoseconds]}function Jt(r){const e=r.toTimestamp();return{seconds:e.seconds,nanoseconds:e.nanoseconds}}function Yt(r){const e=new ae(r.seconds,r.nanoseconds);return U.fromTimestamp(e)}function Bt(r,e){const t=(e.baseMutations||[]).map(s=>To(r.ct,s));for(let s=0;s<e.mutations.length-1;++s){const a=e.mutations[s];if(s+1<e.mutations.length&&e.mutations[s+1].transform!==void 0){const u=e.mutations[s+1];a.updateTransforms=u.transform.fieldTransforms,e.mutations.splice(s+1,1),++s}}const n=e.mutations.map(s=>To(r.ct,s)),i=ae.fromMillis(e.localWriteTimeMs);return new Go(e.batchId,i,t,n)}function dr(r){const e=Yt(r.readTime),t=r.lastLimboFreeSnapshotVersion!==void 0?Yt(r.lastLimboFreeSnapshotVersion):U.min();let n;return n=function(s){return s.documents!==void 0}(r.query)?function(s){return F(s.documents.length===1),Ne(rs(_h(s.documents[0])))}(r.query):function(s){return Ne(Th(s))}(r.query),new Qe(n,r.targetId,"TargetPurposeListen",r.lastListenSequenceNumber,e,t,he.fromBase64String(r.resumeToken))}function bh(r,e){const t=Jt(e.snapshotVersion),n=Jt(e.lastLimboFreeSnapshotVersion);let i;i=Oi(e.target)?Ih(r.ct,e.target):vh(r.ct,e.target)._t;const s=e.resumeToken.toBase64();return{targetId:e.targetId,canonicalId:Qt(e.target),readTime:t,resumeToken:s,lastListenSequenceNumber:e.sequenceNumber,lastLimboFreeSnapshotVersion:n,query:i}}function Sh(r){const e=Th({parent:r.parent,structuredQuery:r.structuredQuery});return r.limitType==="LAST"?_o(e,e.limit,"L"):e}function Qs(r,e){return new Ho(e.largestBatchId,To(r.ct,e.overlayMutation))}function dc(r,e){const t=e.path.lastSegment();return[r,be(e.path.popLast()),t]}function fc(r,e,t,n){return{indexId:r,uid:e,sequenceNumber:t,readTime:Jt(n.readTime),documentKey:be(n.documentKey.path),largestBatchId:n.largestBatchId}}/**
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
 */class qg{getBundleMetadata(e,t){return mc(e).get(t).next(n=>{if(n)return function(s){return{id:s.bundleId,createTime:Yt(s.createTime),version:s.version}}(n)})}saveBundleMetadata(e,t){return mc(e).put(function(i){return{bundleId:i.id,createTime:Jt(Se(i.createTime)),version:i.version}}(t))}getNamedQuery(e,t){return pc(e).get(t).next(n=>{if(n)return function(s){return{name:s.name,query:Sh(s.bundledQuery),readTime:Yt(s.readTime)}}(n)})}saveNamedQuery(e,t){return pc(e).put(function(i){return{name:i.name,readTime:Jt(Se(i.readTime)),bundledQuery:i.bundledQuery}}(t))}}function mc(r){return me(r,"bundles")}function pc(r){return me(r,"namedQueries")}/**
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
 */class us{constructor(e,t){this.serializer=e,this.userId=t}static lt(e,t){const n=t.uid||"";return new us(e,n)}getOverlay(e,t){return ir(e).get(dc(this.userId,t)).next(n=>n?Qs(this.serializer,n):null)}getOverlays(e,t){const n=je();return A.forEach(t,i=>this.getOverlay(e,i).next(s=>{s!==null&&n.set(i,s)})).next(()=>n)}saveOverlays(e,t,n){const i=[];return n.forEach((s,a)=>{const u=new Ho(t,a);i.push(this.ht(e,u))}),A.waitFor(i)}removeOverlaysForBatchId(e,t,n){const i=new Set;t.forEach(a=>i.add(be(a.getCollectionPath())));const s=[];return i.forEach(a=>{const u=IDBKeyRange.bound([this.userId,a,n],[this.userId,a,n+1],!1,!0);s.push(ir(e).j("collectionPathOverlayIndex",u))}),A.waitFor(s)}getOverlaysForCollection(e,t,n){const i=je(),s=be(t),a=IDBKeyRange.bound([this.userId,s,n],[this.userId,s,Number.POSITIVE_INFINITY],!0);return ir(e).U("collectionPathOverlayIndex",a).next(u=>{for(const c of u){const d=Qs(this.serializer,c);i.set(d.getKey(),d)}return i})}getOverlaysForCollectionGroup(e,t,n,i){const s=je();let a;const u=IDBKeyRange.bound([this.userId,t,n],[this.userId,t,Number.POSITIVE_INFINITY],!0);return ir(e).J({index:"collectionGroupOverlayIndex",range:u},(c,d,m)=>{const p=Qs(this.serializer,d);s.size()<i||p.largestBatchId===a?(s.set(p.getKey(),p),a=p.largestBatchId):m.done()}).next(()=>s)}ht(e,t){return ir(e).put(function(i,s,a){const[u,c,d]=dc(s,a.mutation.key);return{userId:s,collectionPath:c,documentId:d,collectionGroup:a.mutation.key.getCollectionGroup(),largestBatchId:a.largestBatchId,overlayMutation:Fi(i.ct,a.mutation)}}(this.serializer,this.userId,t))}}function ir(r){return me(r,"documentOverlays")}/**
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
 */class zg{Pt(e){return me(e,"globals")}getSessionToken(e){return this.Pt(e).get("sessionToken").next(t=>{const n=t==null?void 0:t.value;return n?he.fromUint8Array(n):he.EMPTY_BYTE_STRING})}setSessionToken(e,t){return this.Pt(e).put({name:"sessionToken",value:t.toUint8Array()})}}/**
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
 */class jt{constructor(){}It(e,t){this.Tt(e,t),t.Et()}Tt(e,t){if("nullValue"in e)this.dt(t,5);else if("booleanValue"in e)this.dt(t,10),t.At(e.booleanValue?1:0);else if("integerValue"in e)this.dt(t,15),t.At(se(e.integerValue));else if("doubleValue"in e){const n=se(e.doubleValue);isNaN(n)?this.dt(t,13):(this.dt(t,15),br(n)?t.At(0):t.At(n))}else if("timestampValue"in e){let n=e.timestampValue;this.dt(t,20),typeof n=="string"&&(n=et(n)),t.Rt(`${n.seconds||""}`),t.At(n.nanos||0)}else if("stringValue"in e)this.Vt(e.stringValue,t),this.ft(t);else if("bytesValue"in e)this.dt(t,30),t.gt(wt(e.bytesValue)),this.ft(t);else if("referenceValue"in e)this.yt(e.referenceValue,t);else if("geoPointValue"in e){const n=e.geoPointValue;this.dt(t,45),t.At(n.latitude||0),t.At(n.longitude||0)}else"mapValue"in e?Bl(e)?this.dt(t,Number.MAX_SAFE_INTEGER):ts(e)?this.wt(e.mapValue,t):(this.St(e.mapValue,t),this.ft(t)):"arrayValue"in e?(this.bt(e.arrayValue,t),this.ft(t)):M()}Vt(e,t){this.dt(t,25),this.Dt(e,t)}Dt(e,t){t.Rt(e)}St(e,t){const n=e.fields||{};this.dt(t,55);for(const i of Object.keys(n))this.Vt(i,t),this.Tt(n[i],t)}wt(e,t){var n,i;const s=e.fields||{};this.dt(t,53);const a="value",u=((i=(n=s[a].arrayValue)===null||n===void 0?void 0:n.values)===null||i===void 0?void 0:i.length)||0;this.dt(t,15),t.At(se(u)),this.Vt(a,t),this.Tt(s[a],t)}bt(e,t){const n=e.values||[];this.dt(t,50);for(const i of n)this.Tt(i,t)}yt(e,t){this.dt(t,37),N.fromName(e).path.forEach(n=>{this.dt(t,60),this.Dt(n,t)})}dt(e,t){e.At(t)}ft(e){e.At(2)}}jt.vt=new jt;function Kg(r){if(r===0)return 8;let e=0;return!(r>>4)&&(e+=4,r<<=4),!(r>>6)&&(e+=2,r<<=2),!(r>>7)&&(e+=1),e}function gc(r){const e=64-function(n){let i=0;for(let s=0;s<8;++s){const a=Kg(255&n[s]);if(i+=a,a!==8)break}return i}(r);return Math.ceil(e/8)}class $g{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Ct(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Ft(n.value),n=t.next();this.Mt()}xt(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Ot(n.value),n=t.next();this.Nt()}Lt(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Ft(n);else if(n<2048)this.Ft(960|n>>>6),this.Ft(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Ft(480|n>>>12),this.Ft(128|63&n>>>6),this.Ft(128|63&n);else{const i=t.codePointAt(0);this.Ft(240|i>>>18),this.Ft(128|63&i>>>12),this.Ft(128|63&i>>>6),this.Ft(128|63&i)}}this.Mt()}Bt(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Ot(n);else if(n<2048)this.Ot(960|n>>>6),this.Ot(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Ot(480|n>>>12),this.Ot(128|63&n>>>6),this.Ot(128|63&n);else{const i=t.codePointAt(0);this.Ot(240|i>>>18),this.Ot(128|63&i>>>12),this.Ot(128|63&i>>>6),this.Ot(128|63&i)}}this.Nt()}kt(e){const t=this.qt(e),n=gc(t);this.Qt(1+n),this.buffer[this.position++]=255&n;for(let i=t.length-n;i<t.length;++i)this.buffer[this.position++]=255&t[i]}Kt(e){const t=this.qt(e),n=gc(t);this.Qt(1+n),this.buffer[this.position++]=~(255&n);for(let i=t.length-n;i<t.length;++i)this.buffer[this.position++]=~(255&t[i])}$t(){this.Ut(255),this.Ut(255)}Wt(){this.Gt(255),this.Gt(255)}reset(){this.position=0}seed(e){this.Qt(e.length),this.buffer.set(e,this.position),this.position+=e.length}zt(){return this.buffer.slice(0,this.position)}qt(e){const t=function(s){const a=new DataView(new ArrayBuffer(8));return a.setFloat64(0,s,!1),new Uint8Array(a.buffer)}(e),n=(128&t[0])!=0;t[0]^=n?255:128;for(let i=1;i<t.length;++i)t[i]^=n?255:0;return t}Ft(e){const t=255&e;t===0?(this.Ut(0),this.Ut(255)):t===255?(this.Ut(255),this.Ut(0)):this.Ut(t)}Ot(e){const t=255&e;t===0?(this.Gt(0),this.Gt(255)):t===255?(this.Gt(255),this.Gt(0)):this.Gt(e)}Mt(){this.Ut(0),this.Ut(1)}Nt(){this.Gt(0),this.Gt(1)}Ut(e){this.Qt(1),this.buffer[this.position++]=e}Gt(e){this.Qt(1),this.buffer[this.position++]=~e}Qt(e){const t=e+this.position;if(t<=this.buffer.length)return;let n=2*this.buffer.length;n<t&&(n=t);const i=new Uint8Array(n);i.set(this.buffer),this.buffer=i}}class Gg{constructor(e){this.jt=e}gt(e){this.jt.Ct(e)}Rt(e){this.jt.Lt(e)}At(e){this.jt.kt(e)}Et(){this.jt.$t()}}class Wg{constructor(e){this.jt=e}gt(e){this.jt.xt(e)}Rt(e){this.jt.Bt(e)}At(e){this.jt.Kt(e)}Et(){this.jt.Wt()}}class sr{constructor(){this.jt=new $g,this.Ht=new Gg(this.jt),this.Jt=new Wg(this.jt)}seed(e){this.jt.seed(e)}Yt(e){return e===0?this.Ht:this.Jt}zt(){return this.jt.zt()}reset(){this.jt.reset()}}/**
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
 */class qt{constructor(e,t,n,i){this.indexId=e,this.documentKey=t,this.arrayValue=n,this.directionalValue=i}Zt(){const e=this.directionalValue.length,t=e===0||this.directionalValue[e-1]===255?e+1:e,n=new Uint8Array(t);return n.set(this.directionalValue,0),t!==e?n.set([0],this.directionalValue.length):++n[n.length-1],new qt(this.indexId,this.documentKey,this.arrayValue,n)}}function ut(r,e){let t=r.indexId-e.indexId;return t!==0?t:(t=_c(r.arrayValue,e.arrayValue),t!==0?t:(t=_c(r.directionalValue,e.directionalValue),t!==0?t:N.comparator(r.documentKey,e.documentKey)))}function _c(r,e){for(let t=0;t<r.length&&t<e.length;++t){const n=r[t]-e[t];if(n!==0)return n}return r.length-e.length}/**
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
 */class yc{constructor(e){this.Xt=new ee((t,n)=>oe.comparator(t.field,n.field)),this.collectionId=e.collectionGroup!=null?e.collectionGroup:e.path.lastSegment(),this.en=e.orderBy,this.tn=[];for(const t of e.filters){const n=t;n.isInequality()?this.Xt=this.Xt.add(n):this.tn.push(n)}}get nn(){return this.Xt.size>1}rn(e){if(F(e.collectionGroup===this.collectionId),this.nn)return!1;const t=co(e);if(t!==void 0&&!this.sn(t))return!1;const n=Ft(e);let i=new Set,s=0,a=0;for(;s<n.length&&this.sn(n[s]);++s)i=i.add(n[s].fieldPath.canonicalString());if(s===n.length)return!0;if(this.Xt.size>0){const u=this.Xt.getIterator().getNext();if(!i.has(u.field.canonicalString())){const c=n[s];if(!this.on(u,c)||!this._n(this.en[a++],c))return!1}++s}for(;s<n.length;++s){const u=n[s];if(a>=this.en.length||!this._n(this.en[a++],u))return!1}return!0}an(){if(this.nn)return null;let e=new ee(oe.comparator);const t=[];for(const n of this.tn)if(!n.field.isKeyField())if(n.op==="array-contains"||n.op==="array-contains-any")t.push(new vi(n.field,2));else{if(e.has(n.field))continue;e=e.add(n.field),t.push(new vi(n.field,0))}for(const n of this.en)n.field.isKeyField()||e.has(n.field)||(e=e.add(n.field),t.push(new vi(n.field,n.dir==="asc"?0:1)));return new xi(xi.UNKNOWN_ID,this.collectionId,t,Rr.empty())}sn(e){for(const t of this.tn)if(this.on(t,e))return!0;return!1}on(e,t){if(e===void 0||!e.field.isEqual(t.fieldPath))return!1;const n=e.op==="array-contains"||e.op==="array-contains-any";return t.kind===2===n}_n(e,t){return!!e.field.isEqual(t.fieldPath)&&(t.kind===0&&e.dir==="asc"||t.kind===1&&e.dir==="desc")}}/**
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
 */function Ph(r){var e,t;if(F(r instanceof H||r instanceof Z),r instanceof H){if(r instanceof Ql){const i=((t=(e=r.value.arrayValue)===null||e===void 0?void 0:e.values)===null||t===void 0?void 0:t.map(s=>H.create(r.field,"==",s)))||[];return Z.create(i,"or")}return r}const n=r.filters.map(i=>Ph(i));return Z.create(n,r.op)}function Hg(r){if(r.getFilters().length===0)return[];const e=Ao(Ph(r));return F(Ch(e)),Eo(e)||wo(e)?[e]:e.getFilters()}function Eo(r){return r instanceof H}function wo(r){return r instanceof Z&&zo(r)}function Ch(r){return Eo(r)||wo(r)||function(t){if(t instanceof Z&&mo(t)){for(const n of t.getFilters())if(!Eo(n)&&!wo(n))return!1;return!0}return!1}(r)}function Ao(r){if(F(r instanceof H||r instanceof Z),r instanceof H)return r;if(r.filters.length===1)return Ao(r.filters[0]);const e=r.filters.map(n=>Ao(n));let t=Z.create(e,r.op);return t=Bi(t),Ch(t)?t:(F(t instanceof Z),F(Rn(t)),F(t.filters.length>1),t.filters.reduce((n,i)=>Yo(n,i)))}function Yo(r,e){let t;return F(r instanceof H||r instanceof Z),F(e instanceof H||e instanceof Z),t=r instanceof H?e instanceof H?function(i,s){return Z.create([i,s],"and")}(r,e):Ic(r,e):e instanceof H?Ic(e,r):function(i,s){if(F(i.filters.length>0&&s.filters.length>0),Rn(i)&&Rn(s))return Gl(i,s.getFilters());const a=mo(i)?i:s,u=mo(i)?s:i,c=a.filters.map(d=>Yo(d,u));return Z.create(c,"or")}(r,e),Bi(t)}function Ic(r,e){if(Rn(e))return Gl(e,r.getFilters());{const t=e.filters.map(n=>Yo(r,n));return Z.create(t,"or")}}function Bi(r){if(F(r instanceof H||r instanceof Z),r instanceof H)return r;const e=r.getFilters();if(e.length===1)return Bi(e[0]);if(Kl(r))return r;const t=e.map(i=>Bi(i)),n=[];return t.forEach(i=>{i instanceof H?n.push(i):i instanceof Z&&(i.op===r.op?n.push(...i.filters):n.push(i))}),n.length===1?n[0]:Z.create(n,r.op)}/**
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
 */class Qg{constructor(){this.un=new Xo}addToCollectionParentIndex(e,t){return this.un.add(t),A.resolve()}getCollectionParents(e,t){return A.resolve(this.un.getEntries(t))}addFieldIndex(e,t){return A.resolve()}deleteFieldIndex(e,t){return A.resolve()}deleteAllFieldIndexes(e){return A.resolve()}createTargetIndexes(e,t){return A.resolve()}getDocumentsMatchingTarget(e,t){return A.resolve(null)}getIndexType(e,t){return A.resolve(0)}getFieldIndexes(e,t){return A.resolve([])}getNextCollectionGroupToUpdate(e){return A.resolve(null)}getMinOffset(e,t){return A.resolve(Oe.min())}getMinOffsetFromCollectionGroup(e,t){return A.resolve(Oe.min())}updateCollectionGroup(e,t,n){return A.resolve()}updateIndexEntries(e,t){return A.resolve()}}class Xo{constructor(){this.index={}}add(e){const t=e.lastSegment(),n=e.popLast(),i=this.index[t]||new ee(ne.comparator),s=!i.has(n);return this.index[t]=i.add(n),s}has(e){const t=e.lastSegment(),n=e.popLast(),i=this.index[t];return i&&i.has(n)}getEntries(e){return(this.index[e]||new ee(ne.comparator)).toArray()}}/**
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
 */const mi=new Uint8Array(0);class Jg{constructor(e,t){this.databaseId=t,this.cn=new Xo,this.ln=new Ct(n=>Qt(n),(n,i)=>Ur(n,i)),this.uid=e.uid||""}addToCollectionParentIndex(e,t){if(!this.cn.has(t)){const n=t.lastSegment(),i=t.popLast();e.addOnCommittedListener(()=>{this.cn.add(t)});const s={collectionId:n,parent:be(i)};return vc(e).put(s)}return A.resolve()}getCollectionParents(e,t){const n=[],i=IDBKeyRange.bound([t,""],[Sl(t),""],!1,!0);return vc(e).U(i).next(s=>{for(const a of s){if(a.collectionId!==t)break;n.push(Be(a.parent))}return n})}addFieldIndex(e,t){const n=or(e),i=function(u){return{indexId:u.indexId,collectionGroup:u.collectionGroup,fields:u.fields.map(c=>[c.fieldPath.canonicalString(),c.kind])}}(t);delete i.indexId;const s=n.add(i);if(t.indexState){const a=un(e);return s.next(u=>{a.put(fc(u,this.uid,t.indexState.sequenceNumber,t.indexState.offset))})}return s.next()}deleteFieldIndex(e,t){const n=or(e),i=un(e),s=an(e);return n.delete(t.indexId).next(()=>i.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0))).next(()=>s.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0)))}deleteAllFieldIndexes(e){const t=or(e),n=an(e),i=un(e);return t.j().next(()=>n.j()).next(()=>i.j())}createTargetIndexes(e,t){return A.forEach(this.hn(t),n=>this.getIndexType(e,n).next(i=>{if(i===0||i===1){const s=new yc(n).an();if(s!=null)return this.addFieldIndex(e,s)}}))}getDocumentsMatchingTarget(e,t){const n=an(e);let i=!0;const s=new Map;return A.forEach(this.hn(t),a=>this.Pn(e,a).next(u=>{i&&(i=!!u),s.set(a,u)})).next(()=>{if(i){let a=$();const u=[];return A.forEach(s,(c,d)=>{C("IndexedDbIndexManager",`Using index ${function(B){return`id=${B.indexId}|cg=${B.collectionGroup}|f=${B.fields.map(Q=>`${Q.fieldPath}:${Q.kind}`).join(",")}`}(c)} to execute ${Qt(t)}`);const m=function(B,Q){const X=co(Q);if(X===void 0)return null;for(const G of Mi(B,X.fieldPath))switch(G.op){case"array-contains-any":return G.value.arrayValue.values||[];case"array-contains":return[G.value]}return null}(d,c),p=function(B,Q){const X=new Map;for(const G of Ft(Q))for(const I of Mi(B,G.fieldPath))switch(I.op){case"==":case"in":X.set(G.fieldPath.canonicalString(),I.value);break;case"not-in":case"!=":return X.set(G.fieldPath.canonicalString(),I.value),Array.from(X.values())}return null}(d,c),E=function(B,Q){const X=[];let G=!0;for(const I of Ft(Q)){const g=I.kind===0?Xu(B,I.fieldPath,B.startAt):Zu(B,I.fieldPath,B.startAt);X.push(g.value),G&&(G=g.inclusive)}return new An(X,G)}(d,c),S=function(B,Q){const X=[];let G=!0;for(const I of Ft(Q)){const g=I.kind===0?Zu(B,I.fieldPath,B.endAt):Xu(B,I.fieldPath,B.endAt);X.push(g.value),G&&(G=g.inclusive)}return new An(X,G)}(d,c),V=this.In(c,d,E),x=this.In(c,d,S),D=this.Tn(c,d,p),K=this.En(c.indexId,m,V,E.inclusive,x,S.inclusive,D);return A.forEach(K,j=>n.G(j,t.limit).next(B=>{B.forEach(Q=>{const X=N.fromSegments(Q.documentKey);a.has(X)||(a=a.add(X),u.push(X))})}))}).next(()=>u)}return A.resolve(null)})}hn(e){let t=this.ln.get(e);return t||(e.filters.length===0?t=[e]:t=Hg(Z.create(e.filters,"and")).map(n=>go(e.path,e.collectionGroup,e.orderBy,n.getFilters(),e.limit,e.startAt,e.endAt)),this.ln.set(e,t),t)}En(e,t,n,i,s,a,u){const c=(t!=null?t.length:1)*Math.max(n.length,s.length),d=c/(t!=null?t.length:1),m=[];for(let p=0;p<c;++p){const E=t?this.dn(t[p/d]):mi,S=this.An(e,E,n[p%d],i),V=this.Rn(e,E,s[p%d],a),x=u.map(D=>this.An(e,E,D,!0));m.push(...this.createRange(S,V,x))}return m}An(e,t,n,i){const s=new qt(e,N.empty(),t,n);return i?s:s.Zt()}Rn(e,t,n,i){const s=new qt(e,N.empty(),t,n);return i?s.Zt():s}Pn(e,t){const n=new yc(t),i=t.collectionGroup!=null?t.collectionGroup:t.path.lastSegment();return this.getFieldIndexes(e,i).next(s=>{let a=null;for(const u of s)n.rn(u)&&(!a||u.fields.length>a.fields.length)&&(a=u);return a})}getIndexType(e,t){let n=2;const i=this.hn(t);return A.forEach(i,s=>this.Pn(e,s).next(a=>{a?n!==0&&a.fields.length<function(c){let d=new ee(oe.comparator),m=!1;for(const p of c.filters)for(const E of p.getFlattenedFilters())E.field.isKeyField()||(E.op==="array-contains"||E.op==="array-contains-any"?m=!0:d=d.add(E.field));for(const p of c.orderBy)p.field.isKeyField()||(d=d.add(p.field));return d.size+(m?1:0)}(s)&&(n=1):n=0})).next(()=>function(a){return a.limit!==null}(t)&&i.length>1&&n===2?1:n)}Vn(e,t){const n=new sr;for(const i of Ft(e)){const s=t.data.field(i.fieldPath);if(s==null)return null;const a=n.Yt(i.kind);jt.vt.It(s,a)}return n.zt()}dn(e){const t=new sr;return jt.vt.It(e,t.Yt(0)),t.zt()}mn(e,t){const n=new sr;return jt.vt.It(qo(this.databaseId,t),n.Yt(function(s){const a=Ft(s);return a.length===0?0:a[a.length-1].kind}(e))),n.zt()}Tn(e,t,n){if(n===null)return[];let i=[];i.push(new sr);let s=0;for(const a of Ft(e)){const u=n[s++];for(const c of i)if(this.fn(t,a.fieldPath)&&Cr(u))i=this.gn(i,a,u);else{const d=c.Yt(a.kind);jt.vt.It(u,d)}}return this.pn(i)}In(e,t,n){return this.Tn(e,t,n.position)}pn(e){const t=[];for(let n=0;n<e.length;++n)t[n]=e[n].zt();return t}gn(e,t,n){const i=[...e],s=[];for(const a of n.arrayValue.values||[])for(const u of i){const c=new sr;c.seed(u.zt()),jt.vt.It(a,c.Yt(t.kind)),s.push(c)}return s}fn(e,t){return!!e.filters.find(n=>n instanceof H&&n.field.isEqual(t)&&(n.op==="in"||n.op==="not-in"))}getFieldIndexes(e,t){const n=or(e),i=un(e);return(t?n.U("collectionGroupIndex",IDBKeyRange.bound(t,t)):n.U()).next(s=>{const a=[];return A.forEach(s,u=>i.get([u.indexId,this.uid]).next(c=>{a.push(function(m,p){const E=p?new Rr(p.sequenceNumber,new Oe(Yt(p.readTime),new N(Be(p.documentKey)),p.largestBatchId)):Rr.empty(),S=m.fields.map(([V,x])=>new vi(oe.fromServerFormat(V),x));return new xi(m.indexId,m.collectionGroup,S,E)}(u,c))})).next(()=>a)})}getNextCollectionGroupToUpdate(e){return this.getFieldIndexes(e).next(t=>t.length===0?null:(t.sort((n,i)=>{const s=n.indexState.sequenceNumber-i.indexState.sequenceNumber;return s!==0?s:z(n.collectionGroup,i.collectionGroup)}),t[0].collectionGroup))}updateCollectionGroup(e,t,n){const i=or(e),s=un(e);return this.yn(e).next(a=>i.U("collectionGroupIndex",IDBKeyRange.bound(t,t)).next(u=>A.forEach(u,c=>s.put(fc(c.indexId,this.uid,a,n)))))}updateIndexEntries(e,t){const n=new Map;return A.forEach(t,(i,s)=>{const a=n.get(i.collectionGroup);return(a?A.resolve(a):this.getFieldIndexes(e,i.collectionGroup)).next(u=>(n.set(i.collectionGroup,u),A.forEach(u,c=>this.wn(e,i,c).next(d=>{const m=this.Sn(s,c);return d.isEqual(m)?A.resolve():this.bn(e,s,c,d,m)}))))})}Dn(e,t,n,i){return an(e).put({indexId:i.indexId,uid:this.uid,arrayValue:i.arrayValue,directionalValue:i.directionalValue,orderedDocumentKey:this.mn(n,t.key),documentKey:t.key.path.toArray()})}vn(e,t,n,i){return an(e).delete([i.indexId,this.uid,i.arrayValue,i.directionalValue,this.mn(n,t.key),t.key.path.toArray()])}wn(e,t,n){const i=an(e);let s=new ee(ut);return i.J({index:"documentKeyIndex",range:IDBKeyRange.only([n.indexId,this.uid,this.mn(n,t)])},(a,u)=>{s=s.add(new qt(n.indexId,t,u.arrayValue,u.directionalValue))}).next(()=>s)}Sn(e,t){let n=new ee(ut);const i=this.Vn(t,e);if(i==null)return n;const s=co(t);if(s!=null){const a=e.data.field(s.fieldPath);if(Cr(a))for(const u of a.arrayValue.values||[])n=n.add(new qt(t.indexId,e.key,this.dn(u),i))}else n=n.add(new qt(t.indexId,e.key,mi,i));return n}bn(e,t,n,i,s){C("IndexedDbIndexManager","Updating index entries for document '%s'",t.key);const a=[];return function(c,d,m,p,E){const S=c.getIterator(),V=d.getIterator();let x=on(S),D=on(V);for(;x||D;){let K=!1,j=!1;if(x&&D){const B=m(x,D);B<0?j=!0:B>0&&(K=!0)}else x!=null?j=!0:K=!0;K?(p(D),D=on(V)):j?(E(x),x=on(S)):(x=on(S),D=on(V))}}(i,s,ut,u=>{a.push(this.Dn(e,t,n,u))},u=>{a.push(this.vn(e,t,n,u))}),A.waitFor(a)}yn(e){let t=1;return un(e).J({index:"sequenceNumberIndex",reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},(n,i,s)=>{s.done(),t=i.sequenceNumber+1}).next(()=>t)}createRange(e,t,n){n=n.sort((a,u)=>ut(a,u)).filter((a,u,c)=>!u||ut(a,c[u-1])!==0);const i=[];i.push(e);for(const a of n){const u=ut(a,e),c=ut(a,t);if(u===0)i[0]=e.Zt();else if(u>0&&c<0)i.push(a),i.push(a.Zt());else if(c>0)break}i.push(t);const s=[];for(let a=0;a<i.length;a+=2){if(this.Cn(i[a],i[a+1]))return[];const u=[i[a].indexId,this.uid,i[a].arrayValue,i[a].directionalValue,mi,[]],c=[i[a+1].indexId,this.uid,i[a+1].arrayValue,i[a+1].directionalValue,mi,[]];s.push(IDBKeyRange.bound(u,c))}return s}Cn(e,t){return ut(e,t)>0}getMinOffsetFromCollectionGroup(e,t){return this.getFieldIndexes(e,t).next(Tc)}getMinOffset(e,t){return A.mapArray(this.hn(t),n=>this.Pn(e,n).next(i=>i||M())).next(Tc)}}function vc(r){return me(r,"collectionParents")}function an(r){return me(r,"indexEntries")}function or(r){return me(r,"indexConfiguration")}function un(r){return me(r,"indexState")}function Tc(r){F(r.length!==0);let e=r[0].indexState.offset,t=e.largestBatchId;for(let n=1;n<r.length;n++){const i=r[n].indexState.offset;Lo(i,e)<0&&(e=i),t<i.largestBatchId&&(t=i.largestBatchId)}return new Oe(e.readTime,e.documentKey,t)}/**
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
 */const Ec={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0};class Pe{constructor(e,t,n){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=n}static withCacheSize(e){return new Pe(e,Pe.DEFAULT_COLLECTION_PERCENTILE,Pe.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}}/**
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
 */function Vh(r,e,t){const n=r.store("mutations"),i=r.store("documentMutations"),s=[],a=IDBKeyRange.only(t.batchId);let u=0;const c=n.J({range:a},(m,p,E)=>(u++,E.delete()));s.push(c.next(()=>{F(u===1)}));const d=[];for(const m of t.mutations){const p=Nl(e,m.key.path,t.batchId);s.push(i.delete(p)),d.push(m.key)}return A.waitFor(s).next(()=>d)}function ji(r){if(!r)return 0;let e;if(r.document)e=r.document;else if(r.unknownDocument)e=r.unknownDocument;else{if(!r.noDocument)throw M();e=r.noDocument}return JSON.stringify(e).length}/**
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
 */Pe.DEFAULT_COLLECTION_PERCENTILE=10,Pe.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,Pe.DEFAULT=new Pe(41943040,Pe.DEFAULT_COLLECTION_PERCENTILE,Pe.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),Pe.DISABLED=new Pe(-1,0,0);class cs{constructor(e,t,n,i){this.userId=e,this.serializer=t,this.indexManager=n,this.referenceDelegate=i,this.Fn={}}static lt(e,t,n,i){F(e.uid!=="");const s=e.isAuthenticated()?e.uid:"";return new cs(s,t,n,i)}checkEmpty(e){let t=!0;const n=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return ct(e).J({index:"userMutationsIndex",range:n},(i,s,a)=>{t=!1,a.done()}).next(()=>t)}addMutationBatch(e,t,n,i){const s=mn(e),a=ct(e);return a.add({}).next(u=>{F(typeof u=="number");const c=new Go(u,t,n,i),d=function(S,V,x){const D=x.baseMutations.map(j=>Fi(S.ct,j)),K=x.mutations.map(j=>Fi(S.ct,j));return{userId:V,batchId:x.batchId,localWriteTimeMs:x.localWriteTime.toMillis(),baseMutations:D,mutations:K}}(this.serializer,this.userId,c),m=[];let p=new ee((E,S)=>z(E.canonicalString(),S.canonicalString()));for(const E of i){const S=Nl(this.userId,E.key.path,u);p=p.add(E.key.path.popLast()),m.push(a.put(d)),m.push(s.put(S,kp))}return p.forEach(E=>{m.push(this.indexManager.addToCollectionParentIndex(e,E))}),e.addOnCommittedListener(()=>{this.Fn[u]=c.keys()}),A.waitFor(m).next(()=>c)})}lookupMutationBatch(e,t){return ct(e).get(t).next(n=>n?(F(n.userId===this.userId),Bt(this.serializer,n)):null)}Mn(e,t){return this.Fn[t]?A.resolve(this.Fn[t]):this.lookupMutationBatch(e,t).next(n=>{if(n){const i=n.keys();return this.Fn[t]=i,i}return null})}getNextMutationBatchAfterBatchId(e,t){const n=t+1,i=IDBKeyRange.lowerBound([this.userId,n]);let s=null;return ct(e).J({index:"userMutationsIndex",range:i},(a,u,c)=>{u.userId===this.userId&&(F(u.batchId>=n),s=Bt(this.serializer,u)),c.done()}).next(()=>s)}getHighestUnacknowledgedBatchId(e){const t=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let n=-1;return ct(e).J({index:"userMutationsIndex",range:t,reverse:!0},(i,s,a)=>{n=s.batchId,a.done()}).next(()=>n)}getAllMutationBatches(e){const t=IDBKeyRange.bound([this.userId,-1],[this.userId,Number.POSITIVE_INFINITY]);return ct(e).U("userMutationsIndex",t).next(n=>n.map(i=>Bt(this.serializer,i)))}getAllMutationBatchesAffectingDocumentKey(e,t){const n=Ti(this.userId,t.path),i=IDBKeyRange.lowerBound(n),s=[];return mn(e).J({range:i},(a,u,c)=>{const[d,m,p]=a,E=Be(m);if(d===this.userId&&t.path.isEqual(E))return ct(e).get(p).next(S=>{if(!S)throw M();F(S.userId===this.userId),s.push(Bt(this.serializer,S))});c.done()}).next(()=>s)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new ee(z);const i=[];return t.forEach(s=>{const a=Ti(this.userId,s.path),u=IDBKeyRange.lowerBound(a),c=mn(e).J({range:u},(d,m,p)=>{const[E,S,V]=d,x=Be(S);E===this.userId&&s.path.isEqual(x)?n=n.add(V):p.done()});i.push(c)}),A.waitFor(i).next(()=>this.xn(e,n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,i=n.length+1,s=Ti(this.userId,n),a=IDBKeyRange.lowerBound(s);let u=new ee(z);return mn(e).J({range:a},(c,d,m)=>{const[p,E,S]=c,V=Be(E);p===this.userId&&n.isPrefixOf(V)?V.length===i&&(u=u.add(S)):m.done()}).next(()=>this.xn(e,u))}xn(e,t){const n=[],i=[];return t.forEach(s=>{i.push(ct(e).get(s).next(a=>{if(a===null)throw M();F(a.userId===this.userId),n.push(Bt(this.serializer,a))}))}),A.waitFor(i).next(()=>n)}removeMutationBatch(e,t){return Vh(e._e,this.userId,t).next(n=>(e.addOnCommittedListener(()=>{this.On(t.batchId)}),A.forEach(n,i=>this.referenceDelegate.markPotentiallyOrphaned(e,i))))}On(e){delete this.Fn[e]}performConsistencyCheck(e){return this.checkEmpty(e).next(t=>{if(!t)return A.resolve();const n=IDBKeyRange.lowerBound(function(a){return[a]}(this.userId)),i=[];return mn(e).J({range:n},(s,a,u)=>{if(s[0]===this.userId){const c=Be(s[1]);i.push(c)}else u.done()}).next(()=>{F(i.length===0)})})}containsKey(e,t){return Dh(e,this.userId,t)}Nn(e){return kh(e).get(this.userId).next(t=>t||{userId:this.userId,lastAcknowledgedBatchId:-1,lastStreamToken:""})}}function Dh(r,e,t){const n=Ti(e,t.path),i=n[1],s=IDBKeyRange.lowerBound(n);let a=!1;return mn(r).J({range:s,H:!0},(u,c,d)=>{const[m,p,E]=u;m===e&&p===i&&(a=!0),d.done()}).next(()=>a)}function ct(r){return me(r,"mutations")}function mn(r){return me(r,"documentMutations")}function kh(r){return me(r,"mutationQueues")}/**
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
 */class Xt{constructor(e){this.Ln=e}next(){return this.Ln+=2,this.Ln}static Bn(){return new Xt(0)}static kn(){return new Xt(-1)}}/**
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
 */class Yg{constructor(e,t){this.referenceDelegate=e,this.serializer=t}allocateTargetId(e){return this.qn(e).next(t=>{const n=new Xt(t.highestTargetId);return t.highestTargetId=n.next(),this.Qn(e,t).next(()=>t.highestTargetId)})}getLastRemoteSnapshotVersion(e){return this.qn(e).next(t=>U.fromTimestamp(new ae(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds)))}getHighestSequenceNumber(e){return this.qn(e).next(t=>t.highestListenSequenceNumber)}setTargetsMetadata(e,t,n){return this.qn(e).next(i=>(i.highestListenSequenceNumber=t,n&&(i.lastRemoteSnapshotVersion=n.toTimestamp()),t>i.highestListenSequenceNumber&&(i.highestListenSequenceNumber=t),this.Qn(e,i)))}addTargetData(e,t){return this.Kn(e,t).next(()=>this.qn(e).next(n=>(n.targetCount+=1,this.$n(t,n),this.Qn(e,n))))}updateTargetData(e,t){return this.Kn(e,t)}removeTargetData(e,t){return this.removeMatchingKeysForTargetId(e,t.targetId).next(()=>cn(e).delete(t.targetId)).next(()=>this.qn(e)).next(n=>(F(n.targetCount>0),n.targetCount-=1,this.Qn(e,n)))}removeTargets(e,t,n){let i=0;const s=[];return cn(e).J((a,u)=>{const c=dr(u);c.sequenceNumber<=t&&n.get(c.targetId)===null&&(i++,s.push(this.removeTargetData(e,c)))}).next(()=>A.waitFor(s)).next(()=>i)}forEachTarget(e,t){return cn(e).J((n,i)=>{const s=dr(i);t(s)})}qn(e){return wc(e).get("targetGlobalKey").next(t=>(F(t!==null),t))}Qn(e,t){return wc(e).put("targetGlobalKey",t)}Kn(e,t){return cn(e).put(bh(this.serializer,t))}$n(e,t){let n=!1;return e.targetId>t.highestTargetId&&(t.highestTargetId=e.targetId,n=!0),e.sequenceNumber>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=e.sequenceNumber,n=!0),n}getTargetCount(e){return this.qn(e).next(t=>t.targetCount)}getTargetData(e,t){const n=Qt(t),i=IDBKeyRange.bound([n,Number.NEGATIVE_INFINITY],[n,Number.POSITIVE_INFINITY]);let s=null;return cn(e).J({range:i,index:"queryTargetsIndex"},(a,u,c)=>{const d=dr(u);Ur(t,d.target)&&(s=d,c.done())}).next(()=>s)}addMatchingKeys(e,t,n){const i=[],s=ht(e);return t.forEach(a=>{const u=be(a.path);i.push(s.put({targetId:n,path:u})),i.push(this.referenceDelegate.addReference(e,n,a))}),A.waitFor(i)}removeMatchingKeys(e,t,n){const i=ht(e);return A.forEach(t,s=>{const a=be(s.path);return A.waitFor([i.delete([n,a]),this.referenceDelegate.removeReference(e,n,s)])})}removeMatchingKeysForTargetId(e,t){const n=ht(e),i=IDBKeyRange.bound([t],[t+1],!1,!0);return n.delete(i)}getMatchingKeysForTargetId(e,t){const n=IDBKeyRange.bound([t],[t+1],!1,!0),i=ht(e);let s=$();return i.J({range:n,H:!0},(a,u,c)=>{const d=Be(a[1]),m=new N(d);s=s.add(m)}).next(()=>s)}containsKey(e,t){const n=be(t.path),i=IDBKeyRange.bound([n],[Sl(n)],!1,!0);let s=0;return ht(e).J({index:"documentTargetsIndex",H:!0,range:i},([a,u],c,d)=>{a!==0&&(s++,d.done())}).next(()=>s>0)}ot(e,t){return cn(e).get(t).next(n=>n?dr(n):null)}}function cn(r){return me(r,"targets")}function wc(r){return me(r,"targetGlobal")}function ht(r){return me(r,"targetDocuments")}/**
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
 */function Ac([r,e],[t,n]){const i=z(r,t);return i===0?z(e,n):i}class Xg{constructor(e){this.Un=e,this.buffer=new ee(Ac),this.Wn=0}Gn(){return++this.Wn}zn(e){const t=[e,this.Gn()];if(this.buffer.size<this.Un)this.buffer=this.buffer.add(t);else{const n=this.buffer.last();Ac(t,n)<0&&(this.buffer=this.buffer.delete(n).add(t))}}get maxValue(){return this.buffer.last()[0]}}class Zg{constructor(e,t,n){this.garbageCollector=e,this.asyncQueue=t,this.localStore=n,this.jn=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Hn(6e4)}stop(){this.jn&&(this.jn.cancel(),this.jn=null)}get started(){return this.jn!==null}Hn(e){C("LruGarbageCollector",`Garbage collection scheduled in ${e}ms`),this.jn=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,async()=>{this.jn=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(t){Pt(t)?C("LruGarbageCollector","Ignoring IndexedDB error during garbage collection: ",t):await St(t)}await this.Hn(3e5)})}}class e_{constructor(e,t){this.Jn=e,this.params=t}calculateTargetCount(e,t){return this.Jn.Yn(e).next(n=>Math.floor(t/100*n))}nthSequenceNumber(e,t){if(t===0)return A.resolve(Ve.oe);const n=new Xg(t);return this.Jn.forEachTarget(e,i=>n.zn(i.sequenceNumber)).next(()=>this.Jn.Zn(e,i=>n.zn(i))).next(()=>n.maxValue)}removeTargets(e,t,n){return this.Jn.removeTargets(e,t,n)}removeOrphanedDocuments(e,t){return this.Jn.removeOrphanedDocuments(e,t)}collect(e,t){return this.params.cacheSizeCollectionThreshold===-1?(C("LruGarbageCollector","Garbage collection skipped; disabled"),A.resolve(Ec)):this.getCacheSize(e).next(n=>n<this.params.cacheSizeCollectionThreshold?(C("LruGarbageCollector",`Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),Ec):this.Xn(e,t))}getCacheSize(e){return this.Jn.getCacheSize(e)}Xn(e,t){let n,i,s,a,u,c,d;const m=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(p=>(p>this.params.maximumSequenceNumbersToCollect?(C("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${p}`),i=this.params.maximumSequenceNumbersToCollect):i=p,a=Date.now(),this.nthSequenceNumber(e,i))).next(p=>(n=p,u=Date.now(),this.removeTargets(e,n,t))).next(p=>(s=p,c=Date.now(),this.removeOrphanedDocuments(e,n))).next(p=>(d=Date.now(),ln()<=W.DEBUG&&C("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${a-m}ms
	Determined least recently used ${i} in `+(u-a)+`ms
	Removed ${s} targets in `+(c-u)+`ms
	Removed ${p} documents in `+(d-c)+`ms
Total Duration: ${d-m}ms`),A.resolve({didRun:!0,sequenceNumbersCollected:i,targetsRemoved:s,documentsRemoved:p})))}}function t_(r,e){return new e_(r,e)}/**
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
 */class n_{constructor(e,t){this.db=e,this.garbageCollector=t_(this,t)}Yn(e){const t=this.er(e);return this.db.getTargetCache().getTargetCount(e).next(n=>t.next(i=>n+i))}er(e){let t=0;return this.Zn(e,n=>{t++}).next(()=>t)}forEachTarget(e,t){return this.db.getTargetCache().forEachTarget(e,t)}Zn(e,t){return this.tr(e,(n,i)=>t(i))}addReference(e,t,n){return pi(e,n)}removeReference(e,t,n){return pi(e,n)}removeTargets(e,t,n){return this.db.getTargetCache().removeTargets(e,t,n)}markPotentiallyOrphaned(e,t){return pi(e,t)}nr(e,t){return function(i,s){let a=!1;return kh(i).Y(u=>Dh(i,u,s).next(c=>(c&&(a=!0),A.resolve(!c)))).next(()=>a)}(e,t)}removeOrphanedDocuments(e,t){const n=this.db.getRemoteDocumentCache().newChangeBuffer(),i=[];let s=0;return this.tr(e,(a,u)=>{if(u<=t){const c=this.nr(e,a).next(d=>{if(!d)return s++,n.getEntry(e,a).next(()=>(n.removeEntry(a,U.min()),ht(e).delete(function(p){return[0,be(p.path)]}(a))))});i.push(c)}}).next(()=>A.waitFor(i)).next(()=>n.apply(e)).next(()=>s)}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(e,n)}updateLimboDocument(e,t){return pi(e,t)}tr(e,t){const n=ht(e);let i,s=Ve.oe;return n.J({index:"documentTargetsIndex"},([a,u],{path:c,sequenceNumber:d})=>{a===0?(s!==Ve.oe&&t(new N(Be(i)),s),s=d,i=c):s=Ve.oe}).next(()=>{s!==Ve.oe&&t(new N(Be(i)),s)})}getCacheSize(e){return this.db.getRemoteDocumentCache().getSize(e)}}function pi(r,e){return ht(r).put(function(n,i){return{targetId:0,path:be(n.path),sequenceNumber:i}}(e,r.currentSequenceNumber))}/**
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
 */class xh{constructor(){this.changes=new Ct(e=>e.toString(),(e,t)=>e.isEqual(t)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,ce.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const n=this.changes.get(t);return n!==void 0?A.resolve(n):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
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
 */class r_{constructor(e){this.serializer=e}setIndexManager(e){this.indexManager=e}addEntry(e,t,n){return Mt(e).put(n)}removeEntry(e,t,n){return Mt(e).delete(function(s,a){const u=s.path.toArray();return[u.slice(0,u.length-2),u[u.length-2],Ui(a),u[u.length-1]]}(t,n))}updateMetadata(e,t){return this.getMetadata(e).next(n=>(n.byteSize+=t,this.rr(e,n)))}getEntry(e,t){let n=ce.newInvalidDocument(t);return Mt(e).J({index:"documentKeyIndex",range:IDBKeyRange.only(ar(t))},(i,s)=>{n=this.ir(t,s)}).next(()=>n)}sr(e,t){let n={size:0,document:ce.newInvalidDocument(t)};return Mt(e).J({index:"documentKeyIndex",range:IDBKeyRange.only(ar(t))},(i,s)=>{n={document:this.ir(t,s),size:ji(s)}}).next(()=>n)}getEntries(e,t){let n=xe();return this._r(e,t,(i,s)=>{const a=this.ir(i,s);n=n.insert(i,a)}).next(()=>n)}ar(e,t){let n=xe(),i=new re(N.comparator);return this._r(e,t,(s,a)=>{const u=this.ir(s,a);n=n.insert(s,u),i=i.insert(s,ji(a))}).next(()=>({documents:n,ur:i}))}_r(e,t,n){if(t.isEmpty())return A.resolve();let i=new ee(Sc);t.forEach(c=>i=i.add(c));const s=IDBKeyRange.bound(ar(i.first()),ar(i.last())),a=i.getIterator();let u=a.getNext();return Mt(e).J({index:"documentKeyIndex",range:s},(c,d,m)=>{const p=N.fromSegments([...d.prefixPath,d.collectionGroup,d.documentId]);for(;u&&Sc(u,p)<0;)n(u,null),u=a.getNext();u&&u.isEqual(p)&&(n(u,d),u=a.hasNext()?a.getNext():null),u?m.$(ar(u)):m.done()}).next(()=>{for(;u;)n(u,null),u=a.hasNext()?a.getNext():null})}getDocumentsMatchingQuery(e,t,n,i,s){const a=t.path,u=[a.popLast().toArray(),a.lastSegment(),Ui(n.readTime),n.documentKey.path.isEmpty()?"":n.documentKey.path.lastSegment()],c=[a.popLast().toArray(),a.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return Mt(e).U(IDBKeyRange.bound(u,c,!0)).next(d=>{s==null||s.incrementDocumentReadCount(d.length);let m=xe();for(const p of d){const E=this.ir(N.fromSegments(p.prefixPath.concat(p.collectionGroup,p.documentId)),p);E.isFoundDocument()&&(Br(t,E)||i.has(E.key))&&(m=m.insert(E.key,E))}return m})}getAllFromCollectionGroup(e,t,n,i){let s=xe();const a=bc(t,n),u=bc(t,Oe.max());return Mt(e).J({index:"collectionGroupIndex",range:IDBKeyRange.bound(a,u,!0)},(c,d,m)=>{const p=this.ir(N.fromSegments(d.prefixPath.concat(d.collectionGroup,d.documentId)),d);s=s.insert(p.key,p),s.size===i&&m.done()}).next(()=>s)}newChangeBuffer(e){return new i_(this,!!e&&e.trackRemovals)}getSize(e){return this.getMetadata(e).next(t=>t.byteSize)}getMetadata(e){return Rc(e).get("remoteDocumentGlobalKey").next(t=>(F(!!t),t))}rr(e,t){return Rc(e).put("remoteDocumentGlobalKey",t)}ir(e,t){if(t){const n=jg(this.serializer,t);if(!(n.isNoDocument()&&n.version.isEqual(U.min())))return n}return ce.newInvalidDocument(e)}}function Nh(r){return new r_(r)}class i_ extends xh{constructor(e,t){super(),this.cr=e,this.trackRemovals=t,this.lr=new Ct(n=>n.toString(),(n,i)=>n.isEqual(i))}applyChanges(e){const t=[];let n=0,i=new ee((s,a)=>z(s.canonicalString(),a.canonicalString()));return this.changes.forEach((s,a)=>{const u=this.lr.get(s);if(t.push(this.cr.removeEntry(e,s,u.readTime)),a.isValidDocument()){const c=hc(this.cr.serializer,a);i=i.add(s.path.popLast());const d=ji(c);n+=d-u.size,t.push(this.cr.addEntry(e,s,c))}else if(n-=u.size,this.trackRemovals){const c=hc(this.cr.serializer,a.convertToNoDocument(U.min()));t.push(this.cr.addEntry(e,s,c))}}),i.forEach(s=>{t.push(this.cr.indexManager.addToCollectionParentIndex(e,s))}),t.push(this.cr.updateMetadata(e,n)),A.waitFor(t)}getFromCache(e,t){return this.cr.sr(e,t).next(n=>(this.lr.set(t,{size:n.size,readTime:n.document.readTime}),n.document))}getAllFromCache(e,t){return this.cr.ar(e,t).next(({documents:n,ur:i})=>(i.forEach((s,a)=>{this.lr.set(s,{size:a,readTime:n.get(s).readTime})}),n))}}function Rc(r){return me(r,"remoteDocumentGlobal")}function Mt(r){return me(r,"remoteDocumentsV14")}function ar(r){const e=r.path.toArray();return[e.slice(0,e.length-2),e[e.length-2],e[e.length-1]]}function bc(r,e){const t=e.documentKey.path.toArray();return[r,Ui(e.readTime),t.slice(0,t.length-2),t.length>0?t[t.length-1]:""]}function Sc(r,e){const t=r.path.toArray(),n=e.path.toArray();let i=0;for(let s=0;s<t.length-2&&s<n.length-2;++s)if(i=z(t[s],n[s]),i)return i;return i=z(t.length,n.length),i||(i=z(t[t.length-2],n[n.length-2]),i||z(t[t.length-1],n[n.length-1]))}/**
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
 */class s_{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
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
 */class Oh{constructor(e,t,n,i){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=n,this.indexManager=i}getDocument(e,t){let n=null;return this.documentOverlayCache.getOverlay(e,t).next(i=>(n=i,this.remoteDocumentCache.getEntry(e,t))).next(i=>(n!==null&&yr(n.mutation,i,Me.empty(),ae.now()),i))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next(n=>this.getLocalViewOfDocuments(e,n,$()).next(()=>n))}getLocalViewOfDocuments(e,t,n=$()){const i=je();return this.populateOverlays(e,i,t).next(()=>this.computeViews(e,t,i,n).next(s=>{let a=lr();return s.forEach((u,c)=>{a=a.insert(u,c.overlayedDocument)}),a}))}getOverlayedDocuments(e,t){const n=je();return this.populateOverlays(e,n,t).next(()=>this.computeViews(e,t,n,$()))}populateOverlays(e,t,n){const i=[];return n.forEach(s=>{t.has(s)||i.push(s)}),this.documentOverlayCache.getOverlays(e,i).next(s=>{s.forEach((a,u)=>{t.set(a,u)})})}computeViews(e,t,n,i){let s=xe();const a=_r(),u=function(){return _r()}();return t.forEach((c,d)=>{const m=n.get(d.key);i.has(d.key)&&(m===void 0||m.mutation instanceof Vt)?s=s.insert(d.key,d):m!==void 0?(a.set(d.key,m.mutation.getFieldMask()),yr(m.mutation,d,m.mutation.getFieldMask(),ae.now())):a.set(d.key,Me.empty())}),this.recalculateAndSaveOverlays(e,s).next(c=>(c.forEach((d,m)=>a.set(d,m)),t.forEach((d,m)=>{var p;return u.set(d,new s_(m,(p=a.get(d))!==null&&p!==void 0?p:null))}),u))}recalculateAndSaveOverlays(e,t){const n=_r();let i=new re((a,u)=>a-u),s=$();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next(a=>{for(const u of a)u.keys().forEach(c=>{const d=t.get(c);if(d===null)return;let m=n.get(c)||Me.empty();m=u.applyToLocalView(d,m),n.set(c,m);const p=(i.get(u.batchId)||$()).add(c);i=i.insert(u.batchId,p)})}).next(()=>{const a=[],u=i.getReverseIterator();for(;u.hasNext();){const c=u.getNext(),d=c.key,m=c.value,p=nh();m.forEach(E=>{if(!s.has(E)){const S=uh(t.get(E),n.get(E));S!==null&&p.set(E,S),s=s.add(E)}}),a.push(this.documentOverlayCache.saveOverlays(e,d,p))}return A.waitFor(a)}).next(()=>n)}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next(n=>this.recalculateAndSaveOverlays(e,n))}getDocumentsMatchingQuery(e,t,n,i){return function(a){return N.isDocumentKey(a.path)&&a.collectionGroup===null&&a.filters.length===0}(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):ug(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,n,i):this.getDocumentsMatchingCollectionQuery(e,t,n,i)}getNextDocuments(e,t,n,i){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,n,i).next(s=>{const a=i-s.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,n.largestBatchId,i-s.size):A.resolve(je());let u=-1,c=s;return a.next(d=>A.forEach(d,(m,p)=>(u<p.largestBatchId&&(u=p.largestBatchId),s.get(m)?A.resolve():this.remoteDocumentCache.getEntry(e,m).next(E=>{c=c.insert(m,E)}))).next(()=>this.populateOverlays(e,d,s)).next(()=>this.computeViews(e,c,d,$())).next(m=>({batchId:u,changes:th(m)})))})}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new N(t)).next(n=>{let i=lr();return n.isFoundDocument()&&(i=i.insert(n.key,n)),i})}getDocumentsMatchingCollectionGroupQuery(e,t,n,i){const s=t.collectionGroup;let a=lr();return this.indexManager.getCollectionParents(e,s).next(u=>A.forEach(u,c=>{const d=function(p,E){return new ns(E,null,p.explicitOrderBy.slice(),p.filters.slice(),p.limit,p.limitType,p.startAt,p.endAt)}(t,c.child(s));return this.getDocumentsMatchingCollectionQuery(e,d,n,i).next(m=>{m.forEach((p,E)=>{a=a.insert(p,E)})})}).next(()=>a))}getDocumentsMatchingCollectionQuery(e,t,n,i){let s;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,n.largestBatchId).next(a=>(s=a,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,n,s,i))).next(a=>{s.forEach((c,d)=>{const m=d.getKey();a.get(m)===null&&(a=a.insert(m,ce.newInvalidDocument(m)))});let u=lr();return a.forEach((c,d)=>{const m=s.get(c);m!==void 0&&yr(m.mutation,d,Me.empty(),ae.now()),Br(t,d)&&(u=u.insert(c,d))}),u})}}/**
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
 */class o_{constructor(e){this.serializer=e,this.hr=new Map,this.Pr=new Map}getBundleMetadata(e,t){return A.resolve(this.hr.get(t))}saveBundleMetadata(e,t){return this.hr.set(t.id,function(i){return{id:i.id,version:i.version,createTime:Se(i.createTime)}}(t)),A.resolve()}getNamedQuery(e,t){return A.resolve(this.Pr.get(t))}saveNamedQuery(e,t){return this.Pr.set(t.name,function(i){return{name:i.name,query:Sh(i.bundledQuery),readTime:Se(i.readTime)}}(t)),A.resolve()}}/**
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
 */class a_{constructor(){this.overlays=new re(N.comparator),this.Ir=new Map}getOverlay(e,t){return A.resolve(this.overlays.get(t))}getOverlays(e,t){const n=je();return A.forEach(t,i=>this.getOverlay(e,i).next(s=>{s!==null&&n.set(i,s)})).next(()=>n)}saveOverlays(e,t,n){return n.forEach((i,s)=>{this.ht(e,t,s)}),A.resolve()}removeOverlaysForBatchId(e,t,n){const i=this.Ir.get(n);return i!==void 0&&(i.forEach(s=>this.overlays=this.overlays.remove(s)),this.Ir.delete(n)),A.resolve()}getOverlaysForCollection(e,t,n){const i=je(),s=t.length+1,a=new N(t.child("")),u=this.overlays.getIteratorFrom(a);for(;u.hasNext();){const c=u.getNext().value,d=c.getKey();if(!t.isPrefixOf(d.path))break;d.path.length===s&&c.largestBatchId>n&&i.set(c.getKey(),c)}return A.resolve(i)}getOverlaysForCollectionGroup(e,t,n,i){let s=new re((d,m)=>d-m);const a=this.overlays.getIterator();for(;a.hasNext();){const d=a.getNext().value;if(d.getKey().getCollectionGroup()===t&&d.largestBatchId>n){let m=s.get(d.largestBatchId);m===null&&(m=je(),s=s.insert(d.largestBatchId,m)),m.set(d.getKey(),d)}}const u=je(),c=s.getIterator();for(;c.hasNext()&&(c.getNext().value.forEach((d,m)=>u.set(d,m)),!(u.size()>=i)););return A.resolve(u)}ht(e,t,n){const i=this.overlays.get(n.key);if(i!==null){const a=this.Ir.get(i.largestBatchId).delete(n.key);this.Ir.set(i.largestBatchId,a)}this.overlays=this.overlays.insert(n.key,new Ho(t,n));let s=this.Ir.get(t);s===void 0&&(s=$(),this.Ir.set(t,s)),this.Ir.set(t,s.add(n.key))}}/**
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
 */class u_{constructor(){this.sessionToken=he.EMPTY_BYTE_STRING}getSessionToken(e){return A.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,A.resolve()}}/**
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
 */class Zo{constructor(){this.Tr=new ee(pe.Er),this.dr=new ee(pe.Ar)}isEmpty(){return this.Tr.isEmpty()}addReference(e,t){const n=new pe(e,t);this.Tr=this.Tr.add(n),this.dr=this.dr.add(n)}Rr(e,t){e.forEach(n=>this.addReference(n,t))}removeReference(e,t){this.Vr(new pe(e,t))}mr(e,t){e.forEach(n=>this.removeReference(n,t))}gr(e){const t=new N(new ne([])),n=new pe(t,e),i=new pe(t,e+1),s=[];return this.dr.forEachInRange([n,i],a=>{this.Vr(a),s.push(a.key)}),s}pr(){this.Tr.forEach(e=>this.Vr(e))}Vr(e){this.Tr=this.Tr.delete(e),this.dr=this.dr.delete(e)}yr(e){const t=new N(new ne([])),n=new pe(t,e),i=new pe(t,e+1);let s=$();return this.dr.forEachInRange([n,i],a=>{s=s.add(a.key)}),s}containsKey(e){const t=new pe(e,0),n=this.Tr.firstAfterOrEqual(t);return n!==null&&e.isEqual(n.key)}}class pe{constructor(e,t){this.key=e,this.wr=t}static Er(e,t){return N.comparator(e.key,t.key)||z(e.wr,t.wr)}static Ar(e,t){return z(e.wr,t.wr)||N.comparator(e.key,t.key)}}/**
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
 */class c_{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.Sr=1,this.br=new ee(pe.Er)}checkEmpty(e){return A.resolve(this.mutationQueue.length===0)}addMutationBatch(e,t,n,i){const s=this.Sr;this.Sr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const a=new Go(s,t,n,i);this.mutationQueue.push(a);for(const u of i)this.br=this.br.add(new pe(u.key,s)),this.indexManager.addToCollectionParentIndex(e,u.key.path.popLast());return A.resolve(a)}lookupMutationBatch(e,t){return A.resolve(this.Dr(t))}getNextMutationBatchAfterBatchId(e,t){const n=t+1,i=this.vr(n),s=i<0?0:i;return A.resolve(this.mutationQueue.length>s?this.mutationQueue[s]:null)}getHighestUnacknowledgedBatchId(){return A.resolve(this.mutationQueue.length===0?-1:this.Sr-1)}getAllMutationBatches(e){return A.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const n=new pe(t,0),i=new pe(t,Number.POSITIVE_INFINITY),s=[];return this.br.forEachInRange([n,i],a=>{const u=this.Dr(a.wr);s.push(u)}),A.resolve(s)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new ee(z);return t.forEach(i=>{const s=new pe(i,0),a=new pe(i,Number.POSITIVE_INFINITY);this.br.forEachInRange([s,a],u=>{n=n.add(u.wr)})}),A.resolve(this.Cr(n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,i=n.length+1;let s=n;N.isDocumentKey(s)||(s=s.child(""));const a=new pe(new N(s),0);let u=new ee(z);return this.br.forEachWhile(c=>{const d=c.key.path;return!!n.isPrefixOf(d)&&(d.length===i&&(u=u.add(c.wr)),!0)},a),A.resolve(this.Cr(u))}Cr(e){const t=[];return e.forEach(n=>{const i=this.Dr(n);i!==null&&t.push(i)}),t}removeMutationBatch(e,t){F(this.Fr(t.batchId,"removed")===0),this.mutationQueue.shift();let n=this.br;return A.forEach(t.mutations,i=>{const s=new pe(i.key,t.batchId);return n=n.delete(s),this.referenceDelegate.markPotentiallyOrphaned(e,i.key)}).next(()=>{this.br=n})}On(e){}containsKey(e,t){const n=new pe(t,0),i=this.br.firstAfterOrEqual(n);return A.resolve(t.isEqual(i&&i.key))}performConsistencyCheck(e){return this.mutationQueue.length,A.resolve()}Fr(e,t){return this.vr(e)}vr(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Dr(e){const t=this.vr(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}/**
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
 */class l_{constructor(e){this.Mr=e,this.docs=function(){return new re(N.comparator)}(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const n=t.key,i=this.docs.get(n),s=i?i.size:0,a=this.Mr(t);return this.docs=this.docs.insert(n,{document:t.mutableCopy(),size:a}),this.size+=a-s,this.indexManager.addToCollectionParentIndex(e,n.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const n=this.docs.get(t);return A.resolve(n?n.document.mutableCopy():ce.newInvalidDocument(t))}getEntries(e,t){let n=xe();return t.forEach(i=>{const s=this.docs.get(i);n=n.insert(i,s?s.document.mutableCopy():ce.newInvalidDocument(i))}),A.resolve(n)}getDocumentsMatchingQuery(e,t,n,i){let s=xe();const a=t.path,u=new N(a.child("")),c=this.docs.getIteratorFrom(u);for(;c.hasNext();){const{key:d,value:{document:m}}=c.getNext();if(!a.isPrefixOf(d.path))break;d.path.length>a.length+1||Lo(Cl(m),n)<=0||(i.has(m.key)||Br(t,m))&&(s=s.insert(m.key,m.mutableCopy()))}return A.resolve(s)}getAllFromCollectionGroup(e,t,n,i){M()}Or(e,t){return A.forEach(this.docs,n=>t(n))}newChangeBuffer(e){return new h_(this)}getSize(e){return A.resolve(this.size)}}class h_ extends xh{constructor(e){super(),this.cr=e}applyChanges(e){const t=[];return this.changes.forEach((n,i)=>{i.isValidDocument()?t.push(this.cr.addEntry(e,i)):this.cr.removeEntry(n)}),A.waitFor(t)}getFromCache(e,t){return this.cr.getEntry(e,t)}getAllFromCache(e,t){return this.cr.getEntries(e,t)}}/**
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
 */class d_{constructor(e){this.persistence=e,this.Nr=new Ct(t=>Qt(t),Ur),this.lastRemoteSnapshotVersion=U.min(),this.highestTargetId=0,this.Lr=0,this.Br=new Zo,this.targetCount=0,this.kr=Xt.Bn()}forEachTarget(e,t){return this.Nr.forEach((n,i)=>t(i)),A.resolve()}getLastRemoteSnapshotVersion(e){return A.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return A.resolve(this.Lr)}allocateTargetId(e){return this.highestTargetId=this.kr.next(),A.resolve(this.highestTargetId)}setTargetsMetadata(e,t,n){return n&&(this.lastRemoteSnapshotVersion=n),t>this.Lr&&(this.Lr=t),A.resolve()}Kn(e){this.Nr.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this.kr=new Xt(t),this.highestTargetId=t),e.sequenceNumber>this.Lr&&(this.Lr=e.sequenceNumber)}addTargetData(e,t){return this.Kn(t),this.targetCount+=1,A.resolve()}updateTargetData(e,t){return this.Kn(t),A.resolve()}removeTargetData(e,t){return this.Nr.delete(t.target),this.Br.gr(t.targetId),this.targetCount-=1,A.resolve()}removeTargets(e,t,n){let i=0;const s=[];return this.Nr.forEach((a,u)=>{u.sequenceNumber<=t&&n.get(u.targetId)===null&&(this.Nr.delete(a),s.push(this.removeMatchingKeysForTargetId(e,u.targetId)),i++)}),A.waitFor(s).next(()=>i)}getTargetCount(e){return A.resolve(this.targetCount)}getTargetData(e,t){const n=this.Nr.get(t)||null;return A.resolve(n)}addMatchingKeys(e,t,n){return this.Br.Rr(t,n),A.resolve()}removeMatchingKeys(e,t,n){this.Br.mr(t,n);const i=this.persistence.referenceDelegate,s=[];return i&&t.forEach(a=>{s.push(i.markPotentiallyOrphaned(e,a))}),A.waitFor(s)}removeMatchingKeysForTargetId(e,t){return this.Br.gr(t),A.resolve()}getMatchingKeysForTargetId(e,t){const n=this.Br.yr(t);return A.resolve(n)}containsKey(e,t){return A.resolve(this.Br.containsKey(t))}}/**
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
 */class Mh{constructor(e,t){this.qr={},this.overlays={},this.Qr=new Ve(0),this.Kr=!1,this.Kr=!0,this.$r=new u_,this.referenceDelegate=e(this),this.Ur=new d_(this),this.indexManager=new Qg,this.remoteDocumentCache=function(i){return new l_(i)}(n=>this.referenceDelegate.Wr(n)),this.serializer=new Rh(t),this.Gr=new o_(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.Kr=!1,Promise.resolve()}get started(){return this.Kr}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new a_,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let n=this.qr[e.toKey()];return n||(n=new c_(t,this.referenceDelegate),this.qr[e.toKey()]=n),n}getGlobalsCache(){return this.$r}getTargetCache(){return this.Ur}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Gr}runTransaction(e,t,n){C("MemoryPersistence","Starting transaction:",e);const i=new f_(this.Qr.next());return this.referenceDelegate.zr(),n(i).next(s=>this.referenceDelegate.jr(i).next(()=>s)).toPromise().then(s=>(i.raiseOnCommittedEvent(),s))}Hr(e,t){return A.or(Object.values(this.qr).map(n=>()=>n.containsKey(e,t)))}}class f_ extends Dl{constructor(e){super(),this.currentSequenceNumber=e}}class ls{constructor(e){this.persistence=e,this.Jr=new Zo,this.Yr=null}static Zr(e){return new ls(e)}get Xr(){if(this.Yr)return this.Yr;throw M()}addReference(e,t,n){return this.Jr.addReference(n,t),this.Xr.delete(n.toString()),A.resolve()}removeReference(e,t,n){return this.Jr.removeReference(n,t),this.Xr.add(n.toString()),A.resolve()}markPotentiallyOrphaned(e,t){return this.Xr.add(t.toString()),A.resolve()}removeTarget(e,t){this.Jr.gr(t.targetId).forEach(i=>this.Xr.add(i.toString()));const n=this.persistence.getTargetCache();return n.getMatchingKeysForTargetId(e,t.targetId).next(i=>{i.forEach(s=>this.Xr.add(s.toString()))}).next(()=>n.removeTargetData(e,t))}zr(){this.Yr=new Set}jr(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return A.forEach(this.Xr,n=>{const i=N.fromPath(n);return this.ei(e,i).next(s=>{s||t.removeEntry(i,U.min())})}).next(()=>(this.Yr=null,t.apply(e)))}updateLimboDocument(e,t){return this.ei(e,t).next(n=>{n?this.Xr.delete(t.toString()):this.Xr.add(t.toString())})}Wr(e){return 0}ei(e,t){return A.or([()=>A.resolve(this.Jr.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Hr(e,t)])}}/**
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
 */class m_{constructor(e){this.serializer=e}O(e,t,n,i){const s=new Zi("createOrUpgrade",t);n<1&&i>=1&&(function(c){c.createObjectStore("owner")}(e),function(c){c.createObjectStore("mutationQueues",{keyPath:"userId"}),c.createObjectStore("mutations",{keyPath:"batchId",autoIncrement:!0}).createIndex("userMutationsIndex",ju,{unique:!0}),c.createObjectStore("documentMutations")}(e),Pc(e),function(c){c.createObjectStore("remoteDocuments")}(e));let a=A.resolve();return n<3&&i>=3&&(n!==0&&(function(c){c.deleteObjectStore("targetDocuments"),c.deleteObjectStore("targets"),c.deleteObjectStore("targetGlobal")}(e),Pc(e)),a=a.next(()=>function(c){const d=c.store("targetGlobal"),m={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:U.min().toTimestamp(),targetCount:0};return d.put("targetGlobalKey",m)}(s))),n<4&&i>=4&&(n!==0&&(a=a.next(()=>function(c,d){return d.store("mutations").U().next(m=>{c.deleteObjectStore("mutations"),c.createObjectStore("mutations",{keyPath:"batchId",autoIncrement:!0}).createIndex("userMutationsIndex",ju,{unique:!0});const p=d.store("mutations"),E=m.map(S=>p.put(S));return A.waitFor(E)})}(e,s))),a=a.next(()=>{(function(c){c.createObjectStore("clientMetadata",{keyPath:"clientId"})})(e)})),n<5&&i>=5&&(a=a.next(()=>this.ni(s))),n<6&&i>=6&&(a=a.next(()=>(function(c){c.createObjectStore("remoteDocumentGlobal")}(e),this.ri(s)))),n<7&&i>=7&&(a=a.next(()=>this.ii(s))),n<8&&i>=8&&(a=a.next(()=>this.si(e,s))),n<9&&i>=9&&(a=a.next(()=>{(function(c){c.objectStoreNames.contains("remoteDocumentChanges")&&c.deleteObjectStore("remoteDocumentChanges")})(e)})),n<10&&i>=10&&(a=a.next(()=>this.oi(s))),n<11&&i>=11&&(a=a.next(()=>{(function(c){c.createObjectStore("bundles",{keyPath:"bundleId"})})(e),function(c){c.createObjectStore("namedQueries",{keyPath:"name"})}(e)})),n<12&&i>=12&&(a=a.next(()=>{(function(c){const d=c.createObjectStore("documentOverlays",{keyPath:Kp});d.createIndex("collectionPathOverlayIndex",$p,{unique:!1}),d.createIndex("collectionGroupOverlayIndex",Gp,{unique:!1})})(e)})),n<13&&i>=13&&(a=a.next(()=>function(c){const d=c.createObjectStore("remoteDocumentsV14",{keyPath:xp});d.createIndex("documentKeyIndex",Np),d.createIndex("collectionGroupIndex",Op)}(e)).next(()=>this._i(e,s)).next(()=>e.deleteObjectStore("remoteDocuments"))),n<14&&i>=14&&(a=a.next(()=>this.ai(e,s))),n<15&&i>=15&&(a=a.next(()=>function(c){c.createObjectStore("indexConfiguration",{keyPath:"indexId",autoIncrement:!0}).createIndex("collectionGroupIndex","collectionGroup",{unique:!1}),c.createObjectStore("indexState",{keyPath:Bp}).createIndex("sequenceNumberIndex",jp,{unique:!1}),c.createObjectStore("indexEntries",{keyPath:qp}).createIndex("documentKeyIndex",zp,{unique:!1})}(e))),n<16&&i>=16&&(a=a.next(()=>{t.objectStore("indexState").clear()}).next(()=>{t.objectStore("indexEntries").clear()})),n<17&&i>=17&&(a=a.next(()=>{(function(c){c.createObjectStore("globals",{keyPath:"name"})})(e)})),a}ri(e){let t=0;return e.store("remoteDocuments").J((n,i)=>{t+=ji(i)}).next(()=>{const n={byteSize:t};return e.store("remoteDocumentGlobal").put("remoteDocumentGlobalKey",n)})}ni(e){const t=e.store("mutationQueues"),n=e.store("mutations");return t.U().next(i=>A.forEach(i,s=>{const a=IDBKeyRange.bound([s.userId,-1],[s.userId,s.lastAcknowledgedBatchId]);return n.U("userMutationsIndex",a).next(u=>A.forEach(u,c=>{F(c.userId===s.userId);const d=Bt(this.serializer,c);return Vh(e,s.userId,d).next(()=>{})}))}))}ii(e){const t=e.store("targetDocuments"),n=e.store("remoteDocuments");return e.store("targetGlobal").get("targetGlobalKey").next(i=>{const s=[];return n.J((a,u)=>{const c=new ne(a),d=function(p){return[0,be(p)]}(c);s.push(t.get(d).next(m=>m?A.resolve():(p=>t.put({targetId:0,path:be(p),sequenceNumber:i.highestListenSequenceNumber}))(c)))}).next(()=>A.waitFor(s))})}si(e,t){e.createObjectStore("collectionParents",{keyPath:Up});const n=t.store("collectionParents"),i=new Xo,s=a=>{if(i.add(a)){const u=a.lastSegment(),c=a.popLast();return n.put({collectionId:u,parent:be(c)})}};return t.store("remoteDocuments").J({H:!0},(a,u)=>{const c=new ne(a);return s(c.popLast())}).next(()=>t.store("documentMutations").J({H:!0},([a,u,c],d)=>{const m=Be(u);return s(m.popLast())}))}oi(e){const t=e.store("targets");return t.J((n,i)=>{const s=dr(i),a=bh(this.serializer,s);return t.put(a)})}_i(e,t){const n=t.store("remoteDocuments"),i=[];return n.J((s,a)=>{const u=t.store("remoteDocumentsV14"),c=function(p){return p.document?new N(ne.fromString(p.document.name).popFirst(5)):p.noDocument?N.fromSegments(p.noDocument.path):p.unknownDocument?N.fromSegments(p.unknownDocument.path):M()}(a).path.toArray(),d={prefixPath:c.slice(0,c.length-2),collectionGroup:c[c.length-2],documentId:c[c.length-1],readTime:a.readTime||[0,0],unknownDocument:a.unknownDocument,noDocument:a.noDocument,document:a.document,hasCommittedMutations:!!a.hasCommittedMutations};i.push(u.put(d))}).next(()=>A.waitFor(i))}ai(e,t){const n=t.store("mutations"),i=Nh(this.serializer),s=new Mh(ls.Zr,this.serializer.ct);return n.U().next(a=>{const u=new Map;return a.forEach(c=>{var d;let m=(d=u.get(c.userId))!==null&&d!==void 0?d:$();Bt(this.serializer,c).keys().forEach(p=>m=m.add(p)),u.set(c.userId,m)}),A.forEach(u,(c,d)=>{const m=new we(d),p=us.lt(this.serializer,m),E=s.getIndexManager(m),S=cs.lt(m,this.serializer,E,s.referenceDelegate);return new Oh(i,S,p,E).recalculateAndSaveOverlaysForDocumentKeys(new lo(t,Ve.oe),c).next()})})}}function Pc(r){r.createObjectStore("targetDocuments",{keyPath:Lp}).createIndex("documentTargetsIndex",Fp,{unique:!0}),r.createObjectStore("targets",{keyPath:"targetId"}).createIndex("queryTargetsIndex",Mp,{unique:!0}),r.createObjectStore("targetGlobal")}const Js="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.";class ea{constructor(e,t,n,i,s,a,u,c,d,m,p=17){if(this.allowTabSynchronization=e,this.persistenceKey=t,this.clientId=n,this.ui=s,this.window=a,this.document=u,this.ci=d,this.li=m,this.hi=p,this.Qr=null,this.Kr=!1,this.isPrimary=!1,this.networkEnabled=!0,this.Pi=null,this.inForeground=!1,this.Ii=null,this.Ti=null,this.Ei=Number.NEGATIVE_INFINITY,this.di=E=>Promise.resolve(),!ea.D())throw new O(P.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new n_(this,i),this.Ai=t+"main",this.serializer=new Rh(c),this.Ri=new Tt(this.Ai,this.hi,new m_(this.serializer)),this.$r=new zg,this.Ur=new Yg(this.referenceDelegate,this.serializer),this.remoteDocumentCache=Nh(this.serializer),this.Gr=new qg,this.window&&this.window.localStorage?this.Vi=this.window.localStorage:(this.Vi=null,m===!1&&le("IndexedDbPersistence","LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.mi().then(()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new O(P.FAILED_PRECONDITION,Js);return this.fi(),this.gi(),this.pi(),this.runTransaction("getHighestListenSequenceNumber","readonly",e=>this.Ur.getHighestSequenceNumber(e))}).then(e=>{this.Qr=new Ve(e,this.ci)}).then(()=>{this.Kr=!0}).catch(e=>(this.Ri&&this.Ri.close(),Promise.reject(e)))}yi(e){return this.di=async t=>{if(this.started)return e(t)},e(this.isPrimary)}setDatabaseDeletedListener(e){this.Ri.L(async t=>{t.newVersion===null&&await e()})}setNetworkEnabled(e){this.networkEnabled!==e&&(this.networkEnabled=e,this.ui.enqueueAndForget(async()=>{this.started&&await this.mi()}))}mi(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",e=>gi(e).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next(()=>{if(this.isPrimary)return this.wi(e).next(t=>{t||(this.isPrimary=!1,this.ui.enqueueRetryable(()=>this.di(!1)))})}).next(()=>this.Si(e)).next(t=>this.isPrimary&&!t?this.bi(e).next(()=>!1):!!t&&this.Di(e).next(()=>!0))).catch(e=>{if(Pt(e))return C("IndexedDbPersistence","Failed to extend owner lease: ",e),this.isPrimary;if(!this.allowTabSynchronization)throw e;return C("IndexedDbPersistence","Releasing owner lease after error during lease refresh",e),!1}).then(e=>{this.isPrimary!==e&&this.ui.enqueueRetryable(()=>this.di(e)),this.isPrimary=e})}wi(e){return ur(e).get("owner").next(t=>A.resolve(this.vi(t)))}Ci(e){return gi(e).delete(this.clientId)}async Fi(){if(this.isPrimary&&!this.Mi(this.Ei,18e5)){this.Ei=Date.now();const e=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",t=>{const n=me(t,"clientMetadata");return n.U().next(i=>{const s=this.xi(i,18e5),a=i.filter(u=>s.indexOf(u)===-1);return A.forEach(a,u=>n.delete(u.clientId)).next(()=>a)})}).catch(()=>[]);if(this.Vi)for(const t of e)this.Vi.removeItem(this.Oi(t.clientId))}}pi(){this.Ti=this.ui.enqueueAfterDelay("client_metadata_refresh",4e3,()=>this.mi().then(()=>this.Fi()).then(()=>this.pi()))}vi(e){return!!e&&e.ownerId===this.clientId}Si(e){return this.li?A.resolve(!0):ur(e).get("owner").next(t=>{if(t!==null&&this.Mi(t.leaseTimestampMs,5e3)&&!this.Ni(t.ownerId)){if(this.vi(t)&&this.networkEnabled)return!0;if(!this.vi(t)){if(!t.allowTabSynchronization)throw new O(P.FAILED_PRECONDITION,Js);return!1}}return!(!this.networkEnabled||!this.inForeground)||gi(e).U().next(n=>this.xi(n,5e3).find(i=>{if(this.clientId!==i.clientId){const s=!this.networkEnabled&&i.networkEnabled,a=!this.inForeground&&i.inForeground,u=this.networkEnabled===i.networkEnabled;if(s||a&&u)return!0}return!1})===void 0)}).next(t=>(this.isPrimary!==t&&C("IndexedDbPersistence",`Client ${t?"is":"is not"} eligible for a primary lease.`),t))}async shutdown(){this.Kr=!1,this.Li(),this.Ti&&(this.Ti.cancel(),this.Ti=null),this.Bi(),this.ki(),await this.Ri.runTransaction("shutdown","readwrite",["owner","clientMetadata"],e=>{const t=new lo(e,Ve.oe);return this.bi(t).next(()=>this.Ci(t))}),this.Ri.close(),this.qi()}xi(e,t){return e.filter(n=>this.Mi(n.updateTimeMs,t)&&!this.Ni(n.clientId))}Qi(){return this.runTransaction("getActiveClients","readonly",e=>gi(e).U().next(t=>this.xi(t,18e5).map(n=>n.clientId)))}get started(){return this.Kr}getGlobalsCache(){return this.$r}getMutationQueue(e,t){return cs.lt(e,this.serializer,t,this.referenceDelegate)}getTargetCache(){return this.Ur}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(e){return new Jg(e,this.serializer.ct.databaseId)}getDocumentOverlayCache(e){return us.lt(this.serializer,e)}getBundleCache(){return this.Gr}runTransaction(e,t,n){C("IndexedDbPersistence","Starting transaction:",e);const i=t==="readonly"?"readonly":"readwrite",s=function(c){return c===17?Qp:c===16?Hp:c===15?Uo:c===14?Ll:c===13?Ml:c===12?Wp:c===11?Ol:void M()}(this.hi);let a;return this.Ri.runTransaction(e,i,s,u=>(a=new lo(u,this.Qr?this.Qr.next():Ve.oe),t==="readwrite-primary"?this.wi(a).next(c=>!!c||this.Si(a)).next(c=>{if(!c)throw le(`Failed to obtain primary lease for action '${e}'.`),this.isPrimary=!1,this.ui.enqueueRetryable(()=>this.di(!1)),new O(P.FAILED_PRECONDITION,Vl);return n(a)}).next(c=>this.Di(a).next(()=>c)):this.Ki(a).next(()=>n(a)))).then(u=>(a.raiseOnCommittedEvent(),u))}Ki(e){return ur(e).get("owner").next(t=>{if(t!==null&&this.Mi(t.leaseTimestampMs,5e3)&&!this.Ni(t.ownerId)&&!this.vi(t)&&!(this.li||this.allowTabSynchronization&&t.allowTabSynchronization))throw new O(P.FAILED_PRECONDITION,Js)})}Di(e){const t={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return ur(e).put("owner",t)}static D(){return Tt.D()}bi(e){const t=ur(e);return t.get("owner").next(n=>this.vi(n)?(C("IndexedDbPersistence","Releasing primary lease."),t.delete("owner")):A.resolve())}Mi(e,t){const n=Date.now();return!(e<n-t)&&(!(e>n)||(le(`Detected an update time that is in the future: ${e} > ${n}`),!1))}fi(){this.document!==null&&typeof this.document.addEventListener=="function"&&(this.Ii=()=>{this.ui.enqueueAndForget(()=>(this.inForeground=this.document.visibilityState==="visible",this.mi()))},this.document.addEventListener("visibilitychange",this.Ii),this.inForeground=this.document.visibilityState==="visible")}Bi(){this.Ii&&(this.document.removeEventListener("visibilitychange",this.Ii),this.Ii=null)}gi(){var e;typeof((e=this.window)===null||e===void 0?void 0:e.addEventListener)=="function"&&(this.Pi=()=>{this.Li();const t=/(?:Version|Mobile)\/1[456]/;ml()&&(navigator.appVersion.match(t)||navigator.userAgent.match(t))&&this.ui.enterRestrictedMode(!0),this.ui.enqueueAndForget(()=>this.shutdown())},this.window.addEventListener("pagehide",this.Pi))}ki(){this.Pi&&(this.window.removeEventListener("pagehide",this.Pi),this.Pi=null)}Ni(e){var t;try{const n=((t=this.Vi)===null||t===void 0?void 0:t.getItem(this.Oi(e)))!==null;return C("IndexedDbPersistence",`Client '${e}' ${n?"is":"is not"} zombied in LocalStorage`),n}catch(n){return le("IndexedDbPersistence","Failed to get zombied client id.",n),!1}}Li(){if(this.Vi)try{this.Vi.setItem(this.Oi(this.clientId),String(Date.now()))}catch(e){le("Failed to set zombie client id.",e)}}qi(){if(this.Vi)try{this.Vi.removeItem(this.Oi(this.clientId))}catch{}}Oi(e){return`firestore_zombie_${this.persistenceKey}_${e}`}}function ur(r){return me(r,"owner")}function gi(r){return me(r,"clientMetadata")}function Lh(r,e){let t=r.projectId;return r.isDefaultDatabase||(t+="."+r.database),"firestore/"+e+"/"+t+"/"}/**
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
 */class ta{constructor(e,t,n,i){this.targetId=e,this.fromCache=t,this.$i=n,this.Ui=i}static Wi(e,t){let n=$(),i=$();for(const s of t.docChanges)switch(s.type){case 0:n=n.add(s.doc.key);break;case 1:i=i.add(s.doc.key)}return new ta(e,t.fromCache,n,i)}}/**
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
 */class p_{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
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
 */class Fh{constructor(){this.Gi=!1,this.zi=!1,this.ji=100,this.Hi=function(){return ml()?8:kl(fe())>0?6:4}()}initialize(e,t){this.Ji=e,this.indexManager=t,this.Gi=!0}getDocumentsMatchingQuery(e,t,n,i){const s={result:null};return this.Yi(e,t).next(a=>{s.result=a}).next(()=>{if(!s.result)return this.Zi(e,t,i,n).next(a=>{s.result=a})}).next(()=>{if(s.result)return;const a=new p_;return this.Xi(e,t,a).next(u=>{if(s.result=u,this.zi)return this.es(e,t,a,u.size)})}).next(()=>s.result)}es(e,t,n,i){return n.documentReadCount<this.ji?(ln()<=W.DEBUG&&C("QueryEngine","SDK will not create cache indexes for query:",hn(t),"since it only creates cache indexes for collection contains","more than or equal to",this.ji,"documents"),A.resolve()):(ln()<=W.DEBUG&&C("QueryEngine","Query:",hn(t),"scans",n.documentReadCount,"local documents and returns",i,"documents as results."),n.documentReadCount>this.Hi*i?(ln()<=W.DEBUG&&C("QueryEngine","The SDK decides to create cache indexes for query:",hn(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,Ne(t))):A.resolve())}Yi(e,t){if(ec(t))return A.resolve(null);let n=Ne(t);return this.indexManager.getIndexType(e,n).next(i=>i===0?null:(t.limit!==null&&i===1&&(t=_o(t,null,"F"),n=Ne(t)),this.indexManager.getDocumentsMatchingTarget(e,n).next(s=>{const a=$(...s);return this.Ji.getDocuments(e,a).next(u=>this.indexManager.getMinOffset(e,n).next(c=>{const d=this.ts(t,u);return this.ns(t,d,a,c.readTime)?this.Yi(e,_o(t,null,"F")):this.rs(e,d,t,c)}))})))}Zi(e,t,n,i){return ec(t)||i.isEqual(U.min())?A.resolve(null):this.Ji.getDocuments(e,n).next(s=>{const a=this.ts(t,s);return this.ns(t,a,n,i)?A.resolve(null):(ln()<=W.DEBUG&&C("QueryEngine","Re-using previous result from %s to execute query: %s",i.toString(),hn(t)),this.rs(e,a,t,Pl(i,-1)).next(u=>u))})}ts(e,t){let n=new ee(Zl(e));return t.forEach((i,s)=>{Br(e,s)&&(n=n.add(s))}),n}ns(e,t,n,i){if(e.limit===null)return!1;if(n.size!==t.size)return!0;const s=e.limitType==="F"?t.last():t.first();return!!s&&(s.hasPendingWrites||s.version.compareTo(i)>0)}Xi(e,t,n){return ln()<=W.DEBUG&&C("QueryEngine","Using full collection scan to execute query:",hn(t)),this.Ji.getDocumentsMatchingQuery(e,t,Oe.min(),n)}rs(e,t,n,i){return this.Ji.getDocumentsMatchingQuery(e,n,i).next(s=>(t.forEach(a=>{s=s.insert(a.key,a)}),s))}}/**
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
 */class g_{constructor(e,t,n,i){this.persistence=e,this.ss=t,this.serializer=i,this.os=new re(z),this._s=new Ct(s=>Qt(s),Ur),this.us=new Map,this.cs=e.getRemoteDocumentCache(),this.Ur=e.getTargetCache(),this.Gr=e.getBundleCache(),this.ls(n)}ls(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new Oh(this.cs,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.cs.setIndexManager(this.indexManager),this.ss.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",t=>e.collect(t,this.os))}}function Uh(r,e,t,n){return new g_(r,e,t,n)}async function Bh(r,e){const t=L(r);return await t.persistence.runTransaction("Handle user change","readonly",n=>{let i;return t.mutationQueue.getAllMutationBatches(n).next(s=>(i=s,t.ls(e),t.mutationQueue.getAllMutationBatches(n))).next(s=>{const a=[],u=[];let c=$();for(const d of i){a.push(d.batchId);for(const m of d.mutations)c=c.add(m.key)}for(const d of s){u.push(d.batchId);for(const m of d.mutations)c=c.add(m.key)}return t.localDocuments.getDocuments(n,c).next(d=>({hs:d,removedBatchIds:a,addedBatchIds:u}))})})}function __(r,e){const t=L(r);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",n=>{const i=e.batch.keys(),s=t.cs.newChangeBuffer({trackRemovals:!0});return function(u,c,d,m){const p=d.batch,E=p.keys();let S=A.resolve();return E.forEach(V=>{S=S.next(()=>m.getEntry(c,V)).next(x=>{const D=d.docVersions.get(V);F(D!==null),x.version.compareTo(D)<0&&(p.applyToRemoteDocument(x,d),x.isValidDocument()&&(x.setReadTime(d.commitVersion),m.addEntry(x)))})}),S.next(()=>u.mutationQueue.removeMutationBatch(c,p))}(t,n,e,s).next(()=>s.apply(n)).next(()=>t.mutationQueue.performConsistencyCheck(n)).next(()=>t.documentOverlayCache.removeOverlaysForBatchId(n,i,e.batch.batchId)).next(()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(n,function(u){let c=$();for(let d=0;d<u.mutationResults.length;++d)u.mutationResults[d].transformResults.length>0&&(c=c.add(u.batch.mutations[d].key));return c}(e))).next(()=>t.localDocuments.getDocuments(n,i))})}function jh(r){const e=L(r);return e.persistence.runTransaction("Get last remote snapshot version","readonly",t=>e.Ur.getLastRemoteSnapshotVersion(t))}function y_(r,e){const t=L(r),n=e.snapshotVersion;let i=t.os;return t.persistence.runTransaction("Apply remote event","readwrite-primary",s=>{const a=t.cs.newChangeBuffer({trackRemovals:!0});i=t.os;const u=[];e.targetChanges.forEach((m,p)=>{const E=i.get(p);if(!E)return;u.push(t.Ur.removeMatchingKeys(s,m.removedDocuments,p).next(()=>t.Ur.addMatchingKeys(s,m.addedDocuments,p)));let S=E.withSequenceNumber(s.currentSequenceNumber);e.targetMismatches.get(p)!==null?S=S.withResumeToken(he.EMPTY_BYTE_STRING,U.min()).withLastLimboFreeSnapshotVersion(U.min()):m.resumeToken.approximateByteSize()>0&&(S=S.withResumeToken(m.resumeToken,n)),i=i.insert(p,S),function(x,D,K){return x.resumeToken.approximateByteSize()===0||D.snapshotVersion.toMicroseconds()-x.snapshotVersion.toMicroseconds()>=3e8?!0:K.addedDocuments.size+K.modifiedDocuments.size+K.removedDocuments.size>0}(E,S,m)&&u.push(t.Ur.updateTargetData(s,S))});let c=xe(),d=$();if(e.documentUpdates.forEach(m=>{e.resolvedLimboDocuments.has(m)&&u.push(t.persistence.referenceDelegate.updateLimboDocument(s,m))}),u.push(I_(s,a,e.documentUpdates).next(m=>{c=m.Ps,d=m.Is})),!n.isEqual(U.min())){const m=t.Ur.getLastRemoteSnapshotVersion(s).next(p=>t.Ur.setTargetsMetadata(s,s.currentSequenceNumber,n));u.push(m)}return A.waitFor(u).next(()=>a.apply(s)).next(()=>t.localDocuments.getLocalViewOfDocuments(s,c,d)).next(()=>c)}).then(s=>(t.os=i,s))}function I_(r,e,t){let n=$(),i=$();return t.forEach(s=>n=n.add(s)),e.getEntries(r,n).next(s=>{let a=xe();return t.forEach((u,c)=>{const d=s.get(u);c.isFoundDocument()!==d.isFoundDocument()&&(i=i.add(u)),c.isNoDocument()&&c.version.isEqual(U.min())?(e.removeEntry(u,c.readTime),a=a.insert(u,c)):!d.isValidDocument()||c.version.compareTo(d.version)>0||c.version.compareTo(d.version)===0&&d.hasPendingWrites?(e.addEntry(c),a=a.insert(u,c)):C("LocalStore","Ignoring outdated watch update for ",u,". Current version:",d.version," Watch version:",c.version)}),{Ps:a,Is:i}})}function v_(r,e){const t=L(r);return t.persistence.runTransaction("Get next mutation batch","readonly",n=>(e===void 0&&(e=-1),t.mutationQueue.getNextMutationBatchAfterBatchId(n,e)))}function qi(r,e){const t=L(r);return t.persistence.runTransaction("Allocate target","readwrite",n=>{let i;return t.Ur.getTargetData(n,e).next(s=>s?(i=s,A.resolve(i)):t.Ur.allocateTargetId(n).next(a=>(i=new Qe(e,a,"TargetPurposeListen",n.currentSequenceNumber),t.Ur.addTargetData(n,i).next(()=>i))))}).then(n=>{const i=t.os.get(n.targetId);return(i===null||n.snapshotVersion.compareTo(i.snapshotVersion)>0)&&(t.os=t.os.insert(n.targetId,n),t._s.set(e,n.targetId)),n})}async function Cn(r,e,t){const n=L(r),i=n.os.get(e),s=t?"readwrite":"readwrite-primary";try{t||await n.persistence.runTransaction("Release target",s,a=>n.persistence.referenceDelegate.removeTarget(a,i))}catch(a){if(!Pt(a))throw a;C("LocalStore",`Failed to update sequence numbers for target ${e}: ${a}`)}n.os=n.os.remove(e),n._s.delete(i.target)}function Ro(r,e,t){const n=L(r);let i=U.min(),s=$();return n.persistence.runTransaction("Execute query","readwrite",a=>function(c,d,m){const p=L(c),E=p._s.get(m);return E!==void 0?A.resolve(p.os.get(E)):p.Ur.getTargetData(d,m)}(n,a,Ne(e)).next(u=>{if(u)return i=u.lastLimboFreeSnapshotVersion,n.Ur.getMatchingKeysForTargetId(a,u.targetId).next(c=>{s=c})}).next(()=>n.ss.getDocumentsMatchingQuery(a,e,t?i:U.min(),t?s:$())).next(u=>(Kh(n,Xl(e),u),{documents:u,Ts:s})))}function qh(r,e){const t=L(r),n=L(t.Ur),i=t.os.get(e);return i?Promise.resolve(i.target):t.persistence.runTransaction("Get target data","readonly",s=>n.ot(s,e).next(a=>a?a.target:null))}function zh(r,e){const t=L(r),n=t.us.get(e)||U.min();return t.persistence.runTransaction("Get new document changes","readonly",i=>t.cs.getAllFromCollectionGroup(i,e,Pl(n,-1),Number.MAX_SAFE_INTEGER)).then(i=>(Kh(t,e,i),i))}function Kh(r,e,t){let n=r.us.get(e)||U.min();t.forEach((i,s)=>{s.readTime.compareTo(n)>0&&(n=s.readTime)}),r.us.set(e,n)}function Cc(r,e){return`firestore_clients_${r}_${e}`}function Vc(r,e,t){let n=`firestore_mutations_${r}_${t}`;return e.isAuthenticated()&&(n+=`_${e.uid}`),n}function Ys(r,e){return`firestore_targets_${r}_${e}`}class zi{constructor(e,t,n,i){this.user=e,this.batchId=t,this.state=n,this.error=i}static Rs(e,t,n){const i=JSON.parse(n);let s,a=typeof i=="object"&&["pending","acknowledged","rejected"].indexOf(i.state)!==-1&&(i.error===void 0||typeof i.error=="object");return a&&i.error&&(a=typeof i.error.message=="string"&&typeof i.error.code=="string",a&&(s=new O(i.error.code,i.error.message))),a?new zi(e,t,i.state,s):(le("SharedClientState",`Failed to parse mutation state for ID '${t}': ${n}`),null)}Vs(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Ir{constructor(e,t,n){this.targetId=e,this.state=t,this.error=n}static Rs(e,t){const n=JSON.parse(t);let i,s=typeof n=="object"&&["not-current","current","rejected"].indexOf(n.state)!==-1&&(n.error===void 0||typeof n.error=="object");return s&&n.error&&(s=typeof n.error.message=="string"&&typeof n.error.code=="string",s&&(i=new O(n.error.code,n.error.message))),s?new Ir(e,n.state,i):(le("SharedClientState",`Failed to parse target state for ID '${e}': ${t}`),null)}Vs(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Ki{constructor(e,t){this.clientId=e,this.activeTargetIds=t}static Rs(e,t){const n=JSON.parse(t);let i=typeof n=="object"&&n.activeTargetIds instanceof Array,s=Ko();for(let a=0;i&&a<n.activeTargetIds.length;++a)i=xl(n.activeTargetIds[a]),s=s.add(n.activeTargetIds[a]);return i?new Ki(e,s):(le("SharedClientState",`Failed to parse client data for instance '${e}': ${t}`),null)}}class na{constructor(e,t){this.clientId=e,this.onlineState=t}static Rs(e){const t=JSON.parse(e);return typeof t=="object"&&["Unknown","Online","Offline"].indexOf(t.onlineState)!==-1&&typeof t.clientId=="string"?new na(t.clientId,t.onlineState):(le("SharedClientState",`Failed to parse online state: ${e}`),null)}}class bo{constructor(){this.activeTargetIds=Ko()}fs(e){this.activeTargetIds=this.activeTargetIds.add(e)}gs(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Vs(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class Xs{constructor(e,t,n,i,s){this.window=e,this.ui=t,this.persistenceKey=n,this.ps=i,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.ys=this.ws.bind(this),this.Ss=new re(z),this.started=!1,this.bs=[];const a=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=s,this.Ds=Cc(this.persistenceKey,this.ps),this.vs=function(c){return`firestore_sequence_number_${c}`}(this.persistenceKey),this.Ss=this.Ss.insert(this.ps,new bo),this.Cs=new RegExp(`^firestore_clients_${a}_([^_]*)$`),this.Fs=new RegExp(`^firestore_mutations_${a}_(\\d+)(?:_(.*))?$`),this.Ms=new RegExp(`^firestore_targets_${a}_(\\d+)$`),this.xs=function(c){return`firestore_online_state_${c}`}(this.persistenceKey),this.Os=function(c){return`firestore_bundle_loaded_v2_${c}`}(this.persistenceKey),this.window.addEventListener("storage",this.ys)}static D(e){return!(!e||!e.localStorage)}async start(){const e=await this.syncEngine.Qi();for(const n of e){if(n===this.ps)continue;const i=this.getItem(Cc(this.persistenceKey,n));if(i){const s=Ki.Rs(n,i);s&&(this.Ss=this.Ss.insert(s.clientId,s))}}this.Ns();const t=this.storage.getItem(this.xs);if(t){const n=this.Ls(t);n&&this.Bs(n)}for(const n of this.bs)this.ws(n);this.bs=[],this.window.addEventListener("pagehide",()=>this.shutdown()),this.started=!0}writeSequenceNumber(e){this.setItem(this.vs,JSON.stringify(e))}getAllActiveQueryTargets(){return this.ks(this.Ss)}isActiveQueryTarget(e){let t=!1;return this.Ss.forEach((n,i)=>{i.activeTargetIds.has(e)&&(t=!0)}),t}addPendingMutation(e){this.qs(e,"pending")}updateMutationState(e,t,n){this.qs(e,t,n),this.Qs(e)}addLocalQueryTarget(e,t=!0){let n="not-current";if(this.isActiveQueryTarget(e)){const i=this.storage.getItem(Ys(this.persistenceKey,e));if(i){const s=Ir.Rs(e,i);s&&(n=s.state)}}return t&&this.Ks.fs(e),this.Ns(),n}removeLocalQueryTarget(e){this.Ks.gs(e),this.Ns()}isLocalQueryTarget(e){return this.Ks.activeTargetIds.has(e)}clearQueryState(e){this.removeItem(Ys(this.persistenceKey,e))}updateQueryState(e,t,n){this.$s(e,t,n)}handleUserChange(e,t,n){t.forEach(i=>{this.Qs(i)}),this.currentUser=e,n.forEach(i=>{this.addPendingMutation(i)})}setOnlineState(e){this.Us(e)}notifyBundleLoaded(e){this.Ws(e)}shutdown(){this.started&&(this.window.removeEventListener("storage",this.ys),this.removeItem(this.Ds),this.started=!1)}getItem(e){const t=this.storage.getItem(e);return C("SharedClientState","READ",e,t),t}setItem(e,t){C("SharedClientState","SET",e,t),this.storage.setItem(e,t)}removeItem(e){C("SharedClientState","REMOVE",e),this.storage.removeItem(e)}ws(e){const t=e;if(t.storageArea===this.storage){if(C("SharedClientState","EVENT",t.key,t.newValue),t.key===this.Ds)return void le("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.ui.enqueueRetryable(async()=>{if(this.started){if(t.key!==null){if(this.Cs.test(t.key)){if(t.newValue==null){const n=this.Gs(t.key);return this.zs(n,null)}{const n=this.js(t.key,t.newValue);if(n)return this.zs(n.clientId,n)}}else if(this.Fs.test(t.key)){if(t.newValue!==null){const n=this.Hs(t.key,t.newValue);if(n)return this.Js(n)}}else if(this.Ms.test(t.key)){if(t.newValue!==null){const n=this.Ys(t.key,t.newValue);if(n)return this.Zs(n)}}else if(t.key===this.xs){if(t.newValue!==null){const n=this.Ls(t.newValue);if(n)return this.Bs(n)}}else if(t.key===this.vs){const n=function(s){let a=Ve.oe;if(s!=null)try{const u=JSON.parse(s);F(typeof u=="number"),a=u}catch(u){le("SharedClientState","Failed to read sequence number from WebStorage",u)}return a}(t.newValue);n!==Ve.oe&&this.sequenceNumberHandler(n)}else if(t.key===this.Os){const n=this.Xs(t.newValue);await Promise.all(n.map(i=>this.syncEngine.eo(i)))}}}else this.bs.push(t)})}}get Ks(){return this.Ss.get(this.ps)}Ns(){this.setItem(this.Ds,this.Ks.Vs())}qs(e,t,n){const i=new zi(this.currentUser,e,t,n),s=Vc(this.persistenceKey,this.currentUser,e);this.setItem(s,i.Vs())}Qs(e){const t=Vc(this.persistenceKey,this.currentUser,e);this.removeItem(t)}Us(e){const t={clientId:this.ps,onlineState:e};this.storage.setItem(this.xs,JSON.stringify(t))}$s(e,t,n){const i=Ys(this.persistenceKey,e),s=new Ir(e,t,n);this.setItem(i,s.Vs())}Ws(e){const t=JSON.stringify(Array.from(e));this.setItem(this.Os,t)}Gs(e){const t=this.Cs.exec(e);return t?t[1]:null}js(e,t){const n=this.Gs(e);return Ki.Rs(n,t)}Hs(e,t){const n=this.Fs.exec(e),i=Number(n[1]),s=n[2]!==void 0?n[2]:null;return zi.Rs(new we(s),i,t)}Ys(e,t){const n=this.Ms.exec(e),i=Number(n[1]);return Ir.Rs(i,t)}Ls(e){return na.Rs(e)}Xs(e){return JSON.parse(e)}async Js(e){if(e.user.uid===this.currentUser.uid)return this.syncEngine.no(e.batchId,e.state,e.error);C("SharedClientState",`Ignoring mutation for non-active user ${e.user.uid}`)}Zs(e){return this.syncEngine.ro(e.targetId,e.state,e.error)}zs(e,t){const n=t?this.Ss.insert(e,t):this.Ss.remove(e),i=this.ks(this.Ss),s=this.ks(n),a=[],u=[];return s.forEach(c=>{i.has(c)||a.push(c)}),i.forEach(c=>{s.has(c)||u.push(c)}),this.syncEngine.io(a,u).then(()=>{this.Ss=n})}Bs(e){this.Ss.get(e.clientId)&&this.onlineStateHandler(e.onlineState)}ks(e){let t=Ko();return e.forEach((n,i)=>{t=t.unionWith(i.activeTargetIds)}),t}}class $h{constructor(){this.so=new bo,this.oo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,n){}addLocalQueryTarget(e,t=!0){return t&&this.so.fs(e),this.oo[e]||"not-current"}updateQueryState(e,t,n){this.oo[e]=t}removeLocalQueryTarget(e){this.so.gs(e)}isLocalQueryTarget(e){return this.so.activeTargetIds.has(e)}clearQueryState(e){delete this.oo[e]}getAllActiveQueryTargets(){return this.so.activeTargetIds}isActiveQueryTarget(e){return this.so.activeTargetIds.has(e)}start(){return this.so=new bo,Promise.resolve()}handleUserChange(e,t,n){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
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
 */class T_{_o(e){}shutdown(){}}/**
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
 */class Dc{constructor(){this.ao=()=>this.uo(),this.co=()=>this.lo(),this.ho=[],this.Po()}_o(e){this.ho.push(e)}shutdown(){window.removeEventListener("online",this.ao),window.removeEventListener("offline",this.co)}Po(){window.addEventListener("online",this.ao),window.addEventListener("offline",this.co)}uo(){C("ConnectivityMonitor","Network connectivity changed: AVAILABLE");for(const e of this.ho)e(0)}lo(){C("ConnectivityMonitor","Network connectivity changed: UNAVAILABLE");for(const e of this.ho)e(1)}static D(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
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
 */let _i=null;function Zs(){return _i===null?_i=function(){return 268435456+Math.round(2147483648*Math.random())}():_i++,"0x"+_i.toString(16)}/**
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
 */const E_={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};/**
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
 */class w_{constructor(e){this.Io=e.Io,this.To=e.To}Eo(e){this.Ao=e}Ro(e){this.Vo=e}mo(e){this.fo=e}onMessage(e){this.po=e}close(){this.To()}send(e){this.Io(e)}yo(){this.Ao()}wo(){this.Vo()}So(e){this.fo(e)}bo(e){this.po(e)}}/**
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
 */const Ee="WebChannelConnection";class A_ extends class{constructor(t){this.databaseInfo=t,this.databaseId=t.databaseId;const n=t.ssl?"https":"http",i=encodeURIComponent(this.databaseId.projectId),s=encodeURIComponent(this.databaseId.database);this.Do=n+"://"+t.host,this.vo=`projects/${i}/databases/${s}`,this.Co=this.databaseId.database==="(default)"?`project_id=${i}`:`project_id=${i}&database_id=${s}`}get Fo(){return!1}Mo(t,n,i,s,a){const u=Zs(),c=this.xo(t,n.toUriEncodedString());C("RestConnection",`Sending RPC '${t}' ${u}:`,c,i);const d={"google-cloud-resource-prefix":this.vo,"x-goog-request-params":this.Co};return this.Oo(d,s,a),this.No(t,c,d,i).then(m=>(C("RestConnection",`Received RPC '${t}' ${u}: `,m),m),m=>{throw wr("RestConnection",`RPC '${t}' ${u} failed with error: `,m,"url: ",c,"request:",i),m})}Lo(t,n,i,s,a,u){return this.Mo(t,n,i,s,a)}Oo(t,n,i){t["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+On}(),t["Content-Type"]="text/plain",this.databaseInfo.appId&&(t["X-Firebase-GMPID"]=this.databaseInfo.appId),n&&n.headers.forEach((s,a)=>t[a]=s),i&&i.headers.forEach((s,a)=>t[a]=s)}xo(t,n){const i=E_[t];return`${this.Do}/v1/${n}:${i}`}terminate(){}}{constructor(e){super(e),this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}No(e,t,n,i){const s=Zs();return new Promise((a,u)=>{const c=new Tl;c.setWithCredentials(!0),c.listenOnce(El.COMPLETE,()=>{try{switch(c.getLastErrorCode()){case Ii.NO_ERROR:const m=c.getResponseJson();C(Ee,`XHR for RPC '${e}' ${s} received:`,JSON.stringify(m)),a(m);break;case Ii.TIMEOUT:C(Ee,`RPC '${e}' ${s} timed out`),u(new O(P.DEADLINE_EXCEEDED,"Request time out"));break;case Ii.HTTP_ERROR:const p=c.getStatus();if(C(Ee,`RPC '${e}' ${s} failed with status:`,p,"response text:",c.getResponseText()),p>0){let E=c.getResponseJson();Array.isArray(E)&&(E=E[0]);const S=E==null?void 0:E.error;if(S&&S.status&&S.message){const V=function(D){const K=D.toLowerCase().replace(/_/g,"-");return Object.values(P).indexOf(K)>=0?K:P.UNKNOWN}(S.status);u(new O(V,S.message))}else u(new O(P.UNKNOWN,"Server responded with status "+c.getStatus()))}else u(new O(P.UNAVAILABLE,"Connection failed."));break;default:M()}}finally{C(Ee,`RPC '${e}' ${s} completed.`)}});const d=JSON.stringify(i);C(Ee,`RPC '${e}' ${s} sending request:`,i),c.send(t,"POST",d,n,15)})}Bo(e,t,n){const i=Zs(),s=[this.Do,"/","google.firestore.v1.Firestore","/",e,"/channel"],a=Rl(),u=Al(),c={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},d=this.longPollingOptions.timeoutSeconds;d!==void 0&&(c.longPollingTimeout=Math.round(1e3*d)),this.useFetchStreams&&(c.useFetchStreams=!0),this.Oo(c.initMessageHeaders,t,n),c.encodeInitMessageHeaders=!0;const m=s.join("");C(Ee,`Creating RPC '${e}' stream ${i}: ${m}`,c);const p=a.createWebChannel(m,c);let E=!1,S=!1;const V=new w_({Io:D=>{S?C(Ee,`Not sending because RPC '${e}' stream ${i} is closed:`,D):(E||(C(Ee,`Opening RPC '${e}' stream ${i} transport.`),p.open(),E=!0),C(Ee,`RPC '${e}' stream ${i} sending:`,D),p.send(D))},To:()=>p.close()}),x=(D,K,j)=>{D.listen(K,B=>{try{j(B)}catch(Q){setTimeout(()=>{throw Q},0)}})};return x(p,cr.EventType.OPEN,()=>{S||(C(Ee,`RPC '${e}' stream ${i} transport opened.`),V.yo())}),x(p,cr.EventType.CLOSE,()=>{S||(S=!0,C(Ee,`RPC '${e}' stream ${i} transport closed`),V.So())}),x(p,cr.EventType.ERROR,D=>{S||(S=!0,wr(Ee,`RPC '${e}' stream ${i} transport errored:`,D),V.So(new O(P.UNAVAILABLE,"The operation could not be completed")))}),x(p,cr.EventType.MESSAGE,D=>{var K;if(!S){const j=D.data[0];F(!!j);const B=j,Q=B.error||((K=B[0])===null||K===void 0?void 0:K.error);if(Q){C(Ee,`RPC '${e}' stream ${i} received error:`,Q);const X=Q.status;let G=function(y){const v=de[y];if(v!==void 0)return hh(v)}(X),I=Q.message;G===void 0&&(G=P.INTERNAL,I="Unknown error status: "+X+" with message "+Q.message),S=!0,V.So(new O(G,I)),p.close()}else C(Ee,`RPC '${e}' stream ${i} received:`,j),V.bo(j)}}),x(u,wl.STAT_EVENT,D=>{D.stat===uo.PROXY?C(Ee,`RPC '${e}' stream ${i} detected buffering proxy`):D.stat===uo.NOPROXY&&C(Ee,`RPC '${e}' stream ${i} detected no buffering proxy`)}),setTimeout(()=>{V.wo()},0),V}}/**
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
 */function Gh(){return typeof window<"u"?window:null}function bi(){return typeof document<"u"?document:null}/**
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
 */function hs(r){return new Dg(r,!0)}/**
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
 */class Wh{constructor(e,t,n=1e3,i=1.5,s=6e4){this.ui=e,this.timerId=t,this.ko=n,this.qo=i,this.Qo=s,this.Ko=0,this.$o=null,this.Uo=Date.now(),this.reset()}reset(){this.Ko=0}Wo(){this.Ko=this.Qo}Go(e){this.cancel();const t=Math.floor(this.Ko+this.zo()),n=Math.max(0,Date.now()-this.Uo),i=Math.max(0,t-n);i>0&&C("ExponentialBackoff",`Backing off for ${i} ms (base delay: ${this.Ko} ms, delay with jitter: ${t} ms, last attempt: ${n} ms ago)`),this.$o=this.ui.enqueueAfterDelay(this.timerId,i,()=>(this.Uo=Date.now(),e())),this.Ko*=this.qo,this.Ko<this.ko&&(this.Ko=this.ko),this.Ko>this.Qo&&(this.Ko=this.Qo)}jo(){this.$o!==null&&(this.$o.skipDelay(),this.$o=null)}cancel(){this.$o!==null&&(this.$o.cancel(),this.$o=null)}zo(){return(Math.random()-.5)*this.Ko}}/**
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
 */class Hh{constructor(e,t,n,i,s,a,u,c){this.ui=e,this.Ho=n,this.Jo=i,this.connection=s,this.authCredentialsProvider=a,this.appCheckCredentialsProvider=u,this.listener=c,this.state=0,this.Yo=0,this.Zo=null,this.Xo=null,this.stream=null,this.e_=0,this.t_=new Wh(e,t)}n_(){return this.state===1||this.state===5||this.r_()}r_(){return this.state===2||this.state===3}start(){this.e_=0,this.state!==4?this.auth():this.i_()}async stop(){this.n_()&&await this.close(0)}s_(){this.state=0,this.t_.reset()}o_(){this.r_()&&this.Zo===null&&(this.Zo=this.ui.enqueueAfterDelay(this.Ho,6e4,()=>this.__()))}a_(e){this.u_(),this.stream.send(e)}async __(){if(this.r_())return this.close(0)}u_(){this.Zo&&(this.Zo.cancel(),this.Zo=null)}c_(){this.Xo&&(this.Xo.cancel(),this.Xo=null)}async close(e,t){this.u_(),this.c_(),this.t_.cancel(),this.Yo++,e!==4?this.t_.reset():t&&t.code===P.RESOURCE_EXHAUSTED?(le(t.toString()),le("Using maximum backoff delay to prevent overloading the backend."),this.t_.Wo()):t&&t.code===P.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.l_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.mo(t)}l_(){}auth(){this.state=1;const e=this.h_(this.Yo),t=this.Yo;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([n,i])=>{this.Yo===t&&this.P_(n,i)},n=>{e(()=>{const i=new O(P.UNKNOWN,"Fetching auth token failed: "+n.message);return this.I_(i)})})}P_(e,t){const n=this.h_(this.Yo);this.stream=this.T_(e,t),this.stream.Eo(()=>{n(()=>this.listener.Eo())}),this.stream.Ro(()=>{n(()=>(this.state=2,this.Xo=this.ui.enqueueAfterDelay(this.Jo,1e4,()=>(this.r_()&&(this.state=3),Promise.resolve())),this.listener.Ro()))}),this.stream.mo(i=>{n(()=>this.I_(i))}),this.stream.onMessage(i=>{n(()=>++this.e_==1?this.E_(i):this.onNext(i))})}i_(){this.state=5,this.t_.Go(async()=>{this.state=0,this.start()})}I_(e){return C("PersistentStream",`close with error: ${e}`),this.stream=null,this.close(4,e)}h_(e){return t=>{this.ui.enqueueAndForget(()=>this.Yo===e?t():(C("PersistentStream","stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class R_ extends Hh{constructor(e,t,n,i,s,a){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,n,i,a),this.serializer=s}T_(e,t){return this.connection.Bo("Listen",e,t)}E_(e){return this.onNext(e)}onNext(e){this.t_.reset();const t=Ng(this.serializer,e),n=function(s){if(!("targetChange"in s))return U.min();const a=s.targetChange;return a.targetIds&&a.targetIds.length?U.min():a.readTime?Se(a.readTime):U.min()}(e);return this.listener.d_(t,n)}A_(e){const t={};t.database=vo(this.serializer),t.addTarget=function(s,a){let u;const c=a.target;if(u=Oi(c)?{documents:Ih(s,c)}:{query:vh(s,c)._t},u.targetId=a.targetId,a.resumeToken.approximateByteSize()>0){u.resumeToken=mh(s,a.resumeToken);const d=yo(s,a.expectedCount);d!==null&&(u.expectedCount=d)}else if(a.snapshotVersion.compareTo(U.min())>0){u.readTime=Pn(s,a.snapshotVersion.toTimestamp());const d=yo(s,a.expectedCount);d!==null&&(u.expectedCount=d)}return u}(this.serializer,e);const n=Mg(this.serializer,e);n&&(t.labels=n),this.a_(t)}R_(e){const t={};t.database=vo(this.serializer),t.removeTarget=e,this.a_(t)}}class b_ extends Hh{constructor(e,t,n,i,s,a){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,n,i,a),this.serializer=s}get V_(){return this.e_>0}start(){this.lastStreamToken=void 0,super.start()}l_(){this.V_&&this.m_([])}T_(e,t){return this.connection.Bo("Write",e,t)}E_(e){return F(!!e.streamToken),this.lastStreamToken=e.streamToken,F(!e.writeResults||e.writeResults.length===0),this.listener.f_()}onNext(e){F(!!e.streamToken),this.lastStreamToken=e.streamToken,this.t_.reset();const t=Og(e.writeResults,e.commitTime),n=Se(e.commitTime);return this.listener.g_(n,t)}p_(){const e={};e.database=vo(this.serializer),this.a_(e)}m_(e){const t={streamToken:this.lastStreamToken,writes:e.map(n=>Fi(this.serializer,n))};this.a_(t)}}/**
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
 */class S_ extends class{}{constructor(e,t,n,i){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=n,this.serializer=i,this.y_=!1}w_(){if(this.y_)throw new O(P.FAILED_PRECONDITION,"The client has already been terminated.")}Mo(e,t,n,i){return this.w_(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([s,a])=>this.connection.Mo(e,Io(t,n),i,s,a)).catch(s=>{throw s.name==="FirebaseError"?(s.code===P.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),s):new O(P.UNKNOWN,s.toString())})}Lo(e,t,n,i,s){return this.w_(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([a,u])=>this.connection.Lo(e,Io(t,n),i,a,u,s)).catch(a=>{throw a.name==="FirebaseError"?(a.code===P.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),a):new O(P.UNKNOWN,a.toString())})}terminate(){this.y_=!0,this.connection.terminate()}}class P_{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.S_=0,this.b_=null,this.D_=!0}v_(){this.S_===0&&(this.C_("Unknown"),this.b_=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this.b_=null,this.F_("Backend didn't respond within 10 seconds."),this.C_("Offline"),Promise.resolve())))}M_(e){this.state==="Online"?this.C_("Unknown"):(this.S_++,this.S_>=1&&(this.x_(),this.F_(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.C_("Offline")))}set(e){this.x_(),this.S_=0,e==="Online"&&(this.D_=!1),this.C_(e)}C_(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}F_(e){const t=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.D_?(le(t),this.D_=!1):C("OnlineStateTracker",t)}x_(){this.b_!==null&&(this.b_.cancel(),this.b_=null)}}/**
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
 */class C_{constructor(e,t,n,i,s){this.localStore=e,this.datastore=t,this.asyncQueue=n,this.remoteSyncer={},this.O_=[],this.N_=new Map,this.L_=new Set,this.B_=[],this.k_=s,this.k_._o(a=>{n.enqueueAndForget(async()=>{en(this)&&(C("RemoteStore","Restarting streams for network reachability change."),await async function(c){const d=L(c);d.L_.add(4),await zr(d),d.q_.set("Unknown"),d.L_.delete(4),await ds(d)}(this))})}),this.q_=new P_(n,i)}}async function ds(r){if(en(r))for(const e of r.B_)await e(!0)}async function zr(r){for(const e of r.B_)await e(!1)}function fs(r,e){const t=L(r);t.N_.has(e.targetId)||(t.N_.set(e.targetId,e),sa(t)?ia(t):Un(t).r_()&&ra(t,e))}function Vn(r,e){const t=L(r),n=Un(t);t.N_.delete(e),n.r_()&&Qh(t,e),t.N_.size===0&&(n.r_()?n.o_():en(t)&&t.q_.set("Unknown"))}function ra(r,e){if(r.Q_.xe(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(U.min())>0){const t=r.remoteSyncer.getRemoteKeysForTarget(e.targetId).size;e=e.withExpectedCount(t)}Un(r).A_(e)}function Qh(r,e){r.Q_.xe(e),Un(r).R_(e)}function ia(r){r.Q_=new Sg({getRemoteKeysForTarget:e=>r.remoteSyncer.getRemoteKeysForTarget(e),ot:e=>r.N_.get(e)||null,tt:()=>r.datastore.serializer.databaseId}),Un(r).start(),r.q_.v_()}function sa(r){return en(r)&&!Un(r).n_()&&r.N_.size>0}function en(r){return L(r).L_.size===0}function Jh(r){r.Q_=void 0}async function V_(r){r.q_.set("Online")}async function D_(r){r.N_.forEach((e,t)=>{ra(r,e)})}async function k_(r,e){Jh(r),sa(r)?(r.q_.M_(e),ia(r)):r.q_.set("Unknown")}async function x_(r,e,t){if(r.q_.set("Online"),e instanceof fh&&e.state===2&&e.cause)try{await async function(i,s){const a=s.cause;for(const u of s.targetIds)i.N_.has(u)&&(await i.remoteSyncer.rejectListen(u,a),i.N_.delete(u),i.Q_.removeTarget(u))}(r,e)}catch(n){C("RemoteStore","Failed to remove targets %s: %s ",e.targetIds.join(","),n),await $i(r,n)}else if(e instanceof Ri?r.Q_.Ke(e):e instanceof dh?r.Q_.He(e):r.Q_.We(e),!t.isEqual(U.min()))try{const n=await jh(r.localStore);t.compareTo(n)>=0&&await function(s,a){const u=s.Q_.rt(a);return u.targetChanges.forEach((c,d)=>{if(c.resumeToken.approximateByteSize()>0){const m=s.N_.get(d);m&&s.N_.set(d,m.withResumeToken(c.resumeToken,a))}}),u.targetMismatches.forEach((c,d)=>{const m=s.N_.get(c);if(!m)return;s.N_.set(c,m.withResumeToken(he.EMPTY_BYTE_STRING,m.snapshotVersion)),Qh(s,c);const p=new Qe(m.target,c,d,m.sequenceNumber);ra(s,p)}),s.remoteSyncer.applyRemoteEvent(u)}(r,t)}catch(n){C("RemoteStore","Failed to raise snapshot:",n),await $i(r,n)}}async function $i(r,e,t){if(!Pt(e))throw e;r.L_.add(1),await zr(r),r.q_.set("Offline"),t||(t=()=>jh(r.localStore)),r.asyncQueue.enqueueRetryable(async()=>{C("RemoteStore","Retrying IndexedDB access"),await t(),r.L_.delete(1),await ds(r)})}function Yh(r,e){return e().catch(t=>$i(r,t,e))}async function Fn(r){const e=L(r),t=Rt(e);let n=e.O_.length>0?e.O_[e.O_.length-1].batchId:-1;for(;N_(e);)try{const i=await v_(e.localStore,n);if(i===null){e.O_.length===0&&t.o_();break}n=i.batchId,O_(e,i)}catch(i){await $i(e,i)}Xh(e)&&Zh(e)}function N_(r){return en(r)&&r.O_.length<10}function O_(r,e){r.O_.push(e);const t=Rt(r);t.r_()&&t.V_&&t.m_(e.mutations)}function Xh(r){return en(r)&&!Rt(r).n_()&&r.O_.length>0}function Zh(r){Rt(r).start()}async function M_(r){Rt(r).p_()}async function L_(r){const e=Rt(r);for(const t of r.O_)e.m_(t.mutations)}async function F_(r,e,t){const n=r.O_.shift(),i=Wo.from(n,e,t);await Yh(r,()=>r.remoteSyncer.applySuccessfulWrite(i)),await Fn(r)}async function U_(r,e){e&&Rt(r).V_&&await async function(n,i){if(function(a){return Ag(a)&&a!==P.ABORTED}(i.code)){const s=n.O_.shift();Rt(n).s_(),await Yh(n,()=>n.remoteSyncer.rejectFailedWrite(s.batchId,i)),await Fn(n)}}(r,e),Xh(r)&&Zh(r)}async function kc(r,e){const t=L(r);t.asyncQueue.verifyOperationInProgress(),C("RemoteStore","RemoteStore received new credentials");const n=en(t);t.L_.add(3),await zr(t),n&&t.q_.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.L_.delete(3),await ds(t)}async function So(r,e){const t=L(r);e?(t.L_.delete(2),await ds(t)):e||(t.L_.add(2),await zr(t),t.q_.set("Unknown"))}function Un(r){return r.K_||(r.K_=function(t,n,i){const s=L(t);return s.w_(),new R_(n,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(r.datastore,r.asyncQueue,{Eo:V_.bind(null,r),Ro:D_.bind(null,r),mo:k_.bind(null,r),d_:x_.bind(null,r)}),r.B_.push(async e=>{e?(r.K_.s_(),sa(r)?ia(r):r.q_.set("Unknown")):(await r.K_.stop(),Jh(r))})),r.K_}function Rt(r){return r.U_||(r.U_=function(t,n,i){const s=L(t);return s.w_(),new b_(n,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(r.datastore,r.asyncQueue,{Eo:()=>Promise.resolve(),Ro:M_.bind(null,r),mo:U_.bind(null,r),f_:L_.bind(null,r),g_:F_.bind(null,r)}),r.B_.push(async e=>{e?(r.U_.s_(),await Fn(r)):(await r.U_.stop(),r.O_.length>0&&(C("RemoteStore",`Stopping write stream with ${r.O_.length} pending writes`),r.O_=[]))})),r.U_}/**
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
 */class oa{constructor(e,t,n,i,s){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=n,this.op=i,this.removalCallback=s,this.deferred=new vt,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(a=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,t,n,i,s){const a=Date.now()+n,u=new oa(e,t,a,i,s);return u.start(n),u}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new O(P.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function aa(r,e){if(le("AsyncQueue",`${e}: ${r}`),Pt(r))return new O(P.UNAVAILABLE,`${e}: ${r}`);throw r}/**
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
 */class gn{constructor(e){this.comparator=e?(t,n)=>e(t,n)||N.comparator(t.key,n.key):(t,n)=>N.comparator(t.key,n.key),this.keyedMap=lr(),this.sortedSet=new re(this.comparator)}static emptySet(e){return new gn(e.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((t,n)=>(e(t),!1))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof gn)||this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),n=e.sortedSet.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=n.getNext().key;if(!i.isEqual(s))return!1}return!0}toString(){const e=[];return this.forEach(t=>{e.push(t.toString())}),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,t){const n=new gn;return n.comparator=this.comparator,n.keyedMap=e,n.sortedSet=t,n}}/**
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
 */class xc{constructor(){this.W_=new re(N.comparator)}track(e){const t=e.doc.key,n=this.W_.get(t);n?e.type!==0&&n.type===3?this.W_=this.W_.insert(t,e):e.type===3&&n.type!==1?this.W_=this.W_.insert(t,{type:n.type,doc:e.doc}):e.type===2&&n.type===2?this.W_=this.W_.insert(t,{type:2,doc:e.doc}):e.type===2&&n.type===0?this.W_=this.W_.insert(t,{type:0,doc:e.doc}):e.type===1&&n.type===0?this.W_=this.W_.remove(t):e.type===1&&n.type===2?this.W_=this.W_.insert(t,{type:1,doc:n.doc}):e.type===0&&n.type===1?this.W_=this.W_.insert(t,{type:2,doc:e.doc}):M():this.W_=this.W_.insert(t,e)}G_(){const e=[];return this.W_.inorderTraversal((t,n)=>{e.push(n)}),e}}class Dn{constructor(e,t,n,i,s,a,u,c,d){this.query=e,this.docs=t,this.oldDocs=n,this.docChanges=i,this.mutatedKeys=s,this.fromCache=a,this.syncStateChanged=u,this.excludesMetadataChanges=c,this.hasCachedResults=d}static fromInitialDocuments(e,t,n,i,s){const a=[];return t.forEach(u=>{a.push({type:0,doc:u})}),new Dn(e,t,gn.emptySet(t),a,n,i,!0,!1,s)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&is(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,n=e.docChanges;if(t.length!==n.length)return!1;for(let i=0;i<t.length;i++)if(t[i].type!==n[i].type||!t[i].doc.isEqual(n[i].doc))return!1;return!0}}/**
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
 */class B_{constructor(){this.z_=void 0,this.j_=[]}H_(){return this.j_.some(e=>e.J_())}}class j_{constructor(){this.queries=Nc(),this.onlineState="Unknown",this.Y_=new Set}terminate(){(function(t,n){const i=L(t),s=i.queries;i.queries=Nc(),s.forEach((a,u)=>{for(const c of u.j_)c.onError(n)})})(this,new O(P.ABORTED,"Firestore shutting down"))}}function Nc(){return new Ct(r=>Yl(r),is)}async function q_(r,e){const t=L(r);let n=3;const i=e.query;let s=t.queries.get(i);s?!s.H_()&&e.J_()&&(n=2):(s=new B_,n=e.J_()?0:1);try{switch(n){case 0:s.z_=await t.onListen(i,!0);break;case 1:s.z_=await t.onListen(i,!1);break;case 2:await t.onFirstRemoteStoreListen(i)}}catch(a){const u=aa(a,`Initialization of query '${hn(e.query)}' failed`);return void e.onError(u)}t.queries.set(i,s),s.j_.push(e),e.Z_(t.onlineState),s.z_&&e.X_(s.z_)&&ua(t)}async function z_(r,e){const t=L(r),n=e.query;let i=3;const s=t.queries.get(n);if(s){const a=s.j_.indexOf(e);a>=0&&(s.j_.splice(a,1),s.j_.length===0?i=e.J_()?0:1:!s.H_()&&e.J_()&&(i=2))}switch(i){case 0:return t.queries.delete(n),t.onUnlisten(n,!0);case 1:return t.queries.delete(n),t.onUnlisten(n,!1);case 2:return t.onLastRemoteStoreUnlisten(n);default:return}}function K_(r,e){const t=L(r);let n=!1;for(const i of e){const s=i.query,a=t.queries.get(s);if(a){for(const u of a.j_)u.X_(i)&&(n=!0);a.z_=i}}n&&ua(t)}function $_(r,e,t){const n=L(r),i=n.queries.get(e);if(i)for(const s of i.j_)s.onError(t);n.queries.delete(e)}function ua(r){r.Y_.forEach(e=>{e.next()})}var Po,Oc;(Oc=Po||(Po={})).ea="default",Oc.Cache="cache";class G_{constructor(e,t,n){this.query=e,this.ta=t,this.na=!1,this.ra=null,this.onlineState="Unknown",this.options=n||{}}X_(e){if(!this.options.includeMetadataChanges){const n=[];for(const i of e.docChanges)i.type!==3&&n.push(i);e=new Dn(e.query,e.docs,e.oldDocs,n,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.na?this.ia(e)&&(this.ta.next(e),t=!0):this.sa(e,this.onlineState)&&(this.oa(e),t=!0),this.ra=e,t}onError(e){this.ta.error(e)}Z_(e){this.onlineState=e;let t=!1;return this.ra&&!this.na&&this.sa(this.ra,e)&&(this.oa(this.ra),t=!0),t}sa(e,t){if(!e.fromCache||!this.J_())return!0;const n=t!=="Offline";return(!this.options._a||!n)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline")}ia(e){if(e.docChanges.length>0)return!0;const t=this.ra&&this.ra.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0}oa(e){e=Dn.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.na=!0,this.ta.next(e)}J_(){return this.options.source!==Po.Cache}}/**
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
 */class ed{constructor(e){this.key=e}}class td{constructor(e){this.key=e}}class W_{constructor(e,t){this.query=e,this.Ta=t,this.Ea=null,this.hasCachedResults=!1,this.current=!1,this.da=$(),this.mutatedKeys=$(),this.Aa=Zl(e),this.Ra=new gn(this.Aa)}get Va(){return this.Ta}ma(e,t){const n=t?t.fa:new xc,i=t?t.Ra:this.Ra;let s=t?t.mutatedKeys:this.mutatedKeys,a=i,u=!1;const c=this.query.limitType==="F"&&i.size===this.query.limit?i.last():null,d=this.query.limitType==="L"&&i.size===this.query.limit?i.first():null;if(e.inorderTraversal((m,p)=>{const E=i.get(m),S=Br(this.query,p)?p:null,V=!!E&&this.mutatedKeys.has(E.key),x=!!S&&(S.hasLocalMutations||this.mutatedKeys.has(S.key)&&S.hasCommittedMutations);let D=!1;E&&S?E.data.isEqual(S.data)?V!==x&&(n.track({type:3,doc:S}),D=!0):this.ga(E,S)||(n.track({type:2,doc:S}),D=!0,(c&&this.Aa(S,c)>0||d&&this.Aa(S,d)<0)&&(u=!0)):!E&&S?(n.track({type:0,doc:S}),D=!0):E&&!S&&(n.track({type:1,doc:E}),D=!0,(c||d)&&(u=!0)),D&&(S?(a=a.add(S),s=x?s.add(m):s.delete(m)):(a=a.delete(m),s=s.delete(m)))}),this.query.limit!==null)for(;a.size>this.query.limit;){const m=this.query.limitType==="F"?a.last():a.first();a=a.delete(m.key),s=s.delete(m.key),n.track({type:1,doc:m})}return{Ra:a,fa:n,ns:u,mutatedKeys:s}}ga(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,n,i){const s=this.Ra;this.Ra=e.Ra,this.mutatedKeys=e.mutatedKeys;const a=e.fa.G_();a.sort((m,p)=>function(S,V){const x=D=>{switch(D){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return M()}};return x(S)-x(V)}(m.type,p.type)||this.Aa(m.doc,p.doc)),this.pa(n),i=i!=null&&i;const u=t&&!i?this.ya():[],c=this.da.size===0&&this.current&&!i?1:0,d=c!==this.Ea;return this.Ea=c,a.length!==0||d?{snapshot:new Dn(this.query,e.Ra,s,a,e.mutatedKeys,c===0,d,!1,!!n&&n.resumeToken.approximateByteSize()>0),wa:u}:{wa:u}}Z_(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({Ra:this.Ra,fa:new xc,mutatedKeys:this.mutatedKeys,ns:!1},!1)):{wa:[]}}Sa(e){return!this.Ta.has(e)&&!!this.Ra.has(e)&&!this.Ra.get(e).hasLocalMutations}pa(e){e&&(e.addedDocuments.forEach(t=>this.Ta=this.Ta.add(t)),e.modifiedDocuments.forEach(t=>{}),e.removedDocuments.forEach(t=>this.Ta=this.Ta.delete(t)),this.current=e.current)}ya(){if(!this.current)return[];const e=this.da;this.da=$(),this.Ra.forEach(n=>{this.Sa(n.key)&&(this.da=this.da.add(n.key))});const t=[];return e.forEach(n=>{this.da.has(n)||t.push(new td(n))}),this.da.forEach(n=>{e.has(n)||t.push(new ed(n))}),t}ba(e){this.Ta=e.Ts,this.da=$();const t=this.ma(e.documents);return this.applyChanges(t,!0)}Da(){return Dn.fromInitialDocuments(this.query,this.Ra,this.mutatedKeys,this.Ea===0,this.hasCachedResults)}}class H_{constructor(e,t,n){this.query=e,this.targetId=t,this.view=n}}class Q_{constructor(e){this.key=e,this.va=!1}}class J_{constructor(e,t,n,i,s,a){this.localStore=e,this.remoteStore=t,this.eventManager=n,this.sharedClientState=i,this.currentUser=s,this.maxConcurrentLimboResolutions=a,this.Ca={},this.Fa=new Ct(u=>Yl(u),is),this.Ma=new Map,this.xa=new Set,this.Oa=new re(N.comparator),this.Na=new Map,this.La=new Zo,this.Ba={},this.ka=new Map,this.qa=Xt.kn(),this.onlineState="Unknown",this.Qa=void 0}get isPrimaryClient(){return this.Qa===!0}}async function Y_(r,e,t=!0){const n=ms(r);let i;const s=n.Fa.get(e);return s?(n.sharedClientState.addLocalQueryTarget(s.targetId),i=s.view.Da()):i=await nd(n,e,t,!0),i}async function X_(r,e){const t=ms(r);await nd(t,e,!0,!1)}async function nd(r,e,t,n){const i=await qi(r.localStore,Ne(e)),s=i.targetId,a=r.sharedClientState.addLocalQueryTarget(s,t);let u;return n&&(u=await ca(r,e,s,a==="current",i.resumeToken)),r.isPrimaryClient&&t&&fs(r.remoteStore,i),u}async function ca(r,e,t,n,i){r.Ka=(p,E,S)=>async function(x,D,K,j){let B=D.view.ma(K);B.ns&&(B=await Ro(x.localStore,D.query,!1).then(({documents:I})=>D.view.ma(I,B)));const Q=j&&j.targetChanges.get(D.targetId),X=j&&j.targetMismatches.get(D.targetId)!=null,G=D.view.applyChanges(B,x.isPrimaryClient,Q,X);return Co(x,D.targetId,G.wa),G.snapshot}(r,p,E,S);const s=await Ro(r.localStore,e,!0),a=new W_(e,s.Ts),u=a.ma(s.documents),c=qr.createSynthesizedTargetChangeForCurrentChange(t,n&&r.onlineState!=="Offline",i),d=a.applyChanges(u,r.isPrimaryClient,c);Co(r,t,d.wa);const m=new H_(e,t,a);return r.Fa.set(e,m),r.Ma.has(t)?r.Ma.get(t).push(e):r.Ma.set(t,[e]),d.snapshot}async function Z_(r,e,t){const n=L(r),i=n.Fa.get(e),s=n.Ma.get(i.targetId);if(s.length>1)return n.Ma.set(i.targetId,s.filter(a=>!is(a,e))),void n.Fa.delete(e);n.isPrimaryClient?(n.sharedClientState.removeLocalQueryTarget(i.targetId),n.sharedClientState.isActiveQueryTarget(i.targetId)||await Cn(n.localStore,i.targetId,!1).then(()=>{n.sharedClientState.clearQueryState(i.targetId),t&&Vn(n.remoteStore,i.targetId),kn(n,i.targetId)}).catch(St)):(kn(n,i.targetId),await Cn(n.localStore,i.targetId,!0))}async function ey(r,e){const t=L(r),n=t.Fa.get(e),i=t.Ma.get(n.targetId);t.isPrimaryClient&&i.length===1&&(t.sharedClientState.removeLocalQueryTarget(n.targetId),Vn(t.remoteStore,n.targetId))}async function ty(r,e,t){const n=fa(r);try{const i=await function(a,u){const c=L(a),d=ae.now(),m=u.reduce((S,V)=>S.add(V.key),$());let p,E;return c.persistence.runTransaction("Locally write mutations","readwrite",S=>{let V=xe(),x=$();return c.cs.getEntries(S,m).next(D=>{V=D,V.forEach((K,j)=>{j.isValidDocument()||(x=x.add(K))})}).next(()=>c.localDocuments.getOverlayedDocuments(S,V)).next(D=>{p=D;const K=[];for(const j of u){const B=Eg(j,p.get(j.key).overlayedDocument);B!=null&&K.push(new Vt(j.key,B,ql(B.value.mapValue),De.exists(!0)))}return c.mutationQueue.addMutationBatch(S,d,K,u)}).next(D=>{E=D;const K=D.applyToLocalDocumentSet(p,x);return c.documentOverlayCache.saveOverlays(S,D.batchId,K)})}).then(()=>({batchId:E.batchId,changes:th(p)}))}(n.localStore,e);n.sharedClientState.addPendingMutation(i.batchId),function(a,u,c){let d=a.Ba[a.currentUser.toKey()];d||(d=new re(z)),d=d.insert(u,c),a.Ba[a.currentUser.toKey()]=d}(n,i.batchId,t),await Dt(n,i.changes),await Fn(n.remoteStore)}catch(i){const s=aa(i,"Failed to persist write");t.reject(s)}}async function rd(r,e){const t=L(r);try{const n=await y_(t.localStore,e);e.targetChanges.forEach((i,s)=>{const a=t.Na.get(s);a&&(F(i.addedDocuments.size+i.modifiedDocuments.size+i.removedDocuments.size<=1),i.addedDocuments.size>0?a.va=!0:i.modifiedDocuments.size>0?F(a.va):i.removedDocuments.size>0&&(F(a.va),a.va=!1))}),await Dt(t,n,e)}catch(n){await St(n)}}function Mc(r,e,t){const n=L(r);if(n.isPrimaryClient&&t===0||!n.isPrimaryClient&&t===1){const i=[];n.Fa.forEach((s,a)=>{const u=a.view.Z_(e);u.snapshot&&i.push(u.snapshot)}),function(a,u){const c=L(a);c.onlineState=u;let d=!1;c.queries.forEach((m,p)=>{for(const E of p.j_)E.Z_(u)&&(d=!0)}),d&&ua(c)}(n.eventManager,e),i.length&&n.Ca.d_(i),n.onlineState=e,n.isPrimaryClient&&n.sharedClientState.setOnlineState(e)}}async function ny(r,e,t){const n=L(r);n.sharedClientState.updateQueryState(e,"rejected",t);const i=n.Na.get(e),s=i&&i.key;if(s){let a=new re(N.comparator);a=a.insert(s,ce.newNoDocument(s,U.min()));const u=$().add(s),c=new jr(U.min(),new Map,new re(z),a,u);await rd(n,c),n.Oa=n.Oa.remove(s),n.Na.delete(e),da(n)}else await Cn(n.localStore,e,!1).then(()=>kn(n,e,t)).catch(St)}async function ry(r,e){const t=L(r),n=e.batch.batchId;try{const i=await __(t.localStore,e);ha(t,n,null),la(t,n),t.sharedClientState.updateMutationState(n,"acknowledged"),await Dt(t,i)}catch(i){await St(i)}}async function iy(r,e,t){const n=L(r);try{const i=await function(a,u){const c=L(a);return c.persistence.runTransaction("Reject batch","readwrite-primary",d=>{let m;return c.mutationQueue.lookupMutationBatch(d,u).next(p=>(F(p!==null),m=p.keys(),c.mutationQueue.removeMutationBatch(d,p))).next(()=>c.mutationQueue.performConsistencyCheck(d)).next(()=>c.documentOverlayCache.removeOverlaysForBatchId(d,m,u)).next(()=>c.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(d,m)).next(()=>c.localDocuments.getDocuments(d,m))})}(n.localStore,e);ha(n,e,t),la(n,e),n.sharedClientState.updateMutationState(e,"rejected",t),await Dt(n,i)}catch(i){await St(i)}}function la(r,e){(r.ka.get(e)||[]).forEach(t=>{t.resolve()}),r.ka.delete(e)}function ha(r,e,t){const n=L(r);let i=n.Ba[n.currentUser.toKey()];if(i){const s=i.get(e);s&&(t?s.reject(t):s.resolve(),i=i.remove(e)),n.Ba[n.currentUser.toKey()]=i}}function kn(r,e,t=null){r.sharedClientState.removeLocalQueryTarget(e);for(const n of r.Ma.get(e))r.Fa.delete(n),t&&r.Ca.$a(n,t);r.Ma.delete(e),r.isPrimaryClient&&r.La.gr(e).forEach(n=>{r.La.containsKey(n)||id(r,n)})}function id(r,e){r.xa.delete(e.path.canonicalString());const t=r.Oa.get(e);t!==null&&(Vn(r.remoteStore,t),r.Oa=r.Oa.remove(e),r.Na.delete(t),da(r))}function Co(r,e,t){for(const n of t)n instanceof ed?(r.La.addReference(n.key,e),sy(r,n)):n instanceof td?(C("SyncEngine","Document no longer in limbo: "+n.key),r.La.removeReference(n.key,e),r.La.containsKey(n.key)||id(r,n.key)):M()}function sy(r,e){const t=e.key,n=t.path.canonicalString();r.Oa.get(t)||r.xa.has(n)||(C("SyncEngine","New document in limbo: "+t),r.xa.add(n),da(r))}function da(r){for(;r.xa.size>0&&r.Oa.size<r.maxConcurrentLimboResolutions;){const e=r.xa.values().next().value;r.xa.delete(e);const t=new N(ne.fromString(e)),n=r.qa.next();r.Na.set(n,new Q_(t)),r.Oa=r.Oa.insert(t,n),fs(r.remoteStore,new Qe(Ne(rs(t.path)),n,"TargetPurposeLimboResolution",Ve.oe))}}async function Dt(r,e,t){const n=L(r),i=[],s=[],a=[];n.Fa.isEmpty()||(n.Fa.forEach((u,c)=>{a.push(n.Ka(c,e,t).then(d=>{var m;if((d||t)&&n.isPrimaryClient){const p=d?!d.fromCache:(m=t==null?void 0:t.targetChanges.get(c.targetId))===null||m===void 0?void 0:m.current;n.sharedClientState.updateQueryState(c.targetId,p?"current":"not-current")}if(d){i.push(d);const p=ta.Wi(c.targetId,d);s.push(p)}}))}),await Promise.all(a),n.Ca.d_(i),await async function(c,d){const m=L(c);try{await m.persistence.runTransaction("notifyLocalViewChanges","readwrite",p=>A.forEach(d,E=>A.forEach(E.$i,S=>m.persistence.referenceDelegate.addReference(p,E.targetId,S)).next(()=>A.forEach(E.Ui,S=>m.persistence.referenceDelegate.removeReference(p,E.targetId,S)))))}catch(p){if(!Pt(p))throw p;C("LocalStore","Failed to update sequence numbers: "+p)}for(const p of d){const E=p.targetId;if(!p.fromCache){const S=m.os.get(E),V=S.snapshotVersion,x=S.withLastLimboFreeSnapshotVersion(V);m.os=m.os.insert(E,x)}}}(n.localStore,s))}async function oy(r,e){const t=L(r);if(!t.currentUser.isEqual(e)){C("SyncEngine","User change. New user:",e.toKey());const n=await Bh(t.localStore,e);t.currentUser=e,function(s,a){s.ka.forEach(u=>{u.forEach(c=>{c.reject(new O(P.CANCELLED,a))})}),s.ka.clear()}(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,n.removedBatchIds,n.addedBatchIds),await Dt(t,n.hs)}}function ay(r,e){const t=L(r),n=t.Na.get(e);if(n&&n.va)return $().add(n.key);{let i=$();const s=t.Ma.get(e);if(!s)return i;for(const a of s){const u=t.Fa.get(a);i=i.unionWith(u.view.Va)}return i}}async function uy(r,e){const t=L(r),n=await Ro(t.localStore,e.query,!0),i=e.view.ba(n);return t.isPrimaryClient&&Co(t,e.targetId,i.wa),i}async function cy(r,e){const t=L(r);return zh(t.localStore,e).then(n=>Dt(t,n))}async function ly(r,e,t,n){const i=L(r),s=await function(u,c){const d=L(u),m=L(d.mutationQueue);return d.persistence.runTransaction("Lookup mutation documents","readonly",p=>m.Mn(p,c).next(E=>E?d.localDocuments.getDocuments(p,E):A.resolve(null)))}(i.localStore,e);s!==null?(t==="pending"?await Fn(i.remoteStore):t==="acknowledged"||t==="rejected"?(ha(i,e,n||null),la(i,e),function(u,c){L(L(u).mutationQueue).On(c)}(i.localStore,e)):M(),await Dt(i,s)):C("SyncEngine","Cannot apply mutation batch with id: "+e)}async function hy(r,e){const t=L(r);if(ms(t),fa(t),e===!0&&t.Qa!==!0){const n=t.sharedClientState.getAllActiveQueryTargets(),i=await Lc(t,n.toArray());t.Qa=!0,await So(t.remoteStore,!0);for(const s of i)fs(t.remoteStore,s)}else if(e===!1&&t.Qa!==!1){const n=[];let i=Promise.resolve();t.Ma.forEach((s,a)=>{t.sharedClientState.isLocalQueryTarget(a)?n.push(a):i=i.then(()=>(kn(t,a),Cn(t.localStore,a,!0))),Vn(t.remoteStore,a)}),await i,await Lc(t,n),function(a){const u=L(a);u.Na.forEach((c,d)=>{Vn(u.remoteStore,d)}),u.La.pr(),u.Na=new Map,u.Oa=new re(N.comparator)}(t),t.Qa=!1,await So(t.remoteStore,!1)}}async function Lc(r,e,t){const n=L(r),i=[],s=[];for(const a of e){let u;const c=n.Ma.get(a);if(c&&c.length!==0){u=await qi(n.localStore,Ne(c[0]));for(const d of c){const m=n.Fa.get(d),p=await uy(n,m);p.snapshot&&s.push(p.snapshot)}}else{const d=await qh(n.localStore,a);u=await qi(n.localStore,d),await ca(n,sd(d),a,!1,u.resumeToken)}i.push(u)}return n.Ca.d_(s),i}function sd(r){return Jl(r.path,r.collectionGroup,r.orderBy,r.filters,r.limit,"F",r.startAt,r.endAt)}function dy(r){return function(t){return L(L(t).persistence).Qi()}(L(r).localStore)}async function fy(r,e,t,n){const i=L(r);if(i.Qa)return void C("SyncEngine","Ignoring unexpected query state notification.");const s=i.Ma.get(e);if(s&&s.length>0)switch(t){case"current":case"not-current":{const a=await zh(i.localStore,Xl(s[0])),u=jr.createSynthesizedRemoteEventForCurrentChange(e,t==="current",he.EMPTY_BYTE_STRING);await Dt(i,a,u);break}case"rejected":await Cn(i.localStore,e,!0),kn(i,e,n);break;default:M()}}async function my(r,e,t){const n=ms(r);if(n.Qa){for(const i of e){if(n.Ma.has(i)&&n.sharedClientState.isActiveQueryTarget(i)){C("SyncEngine","Adding an already active target "+i);continue}const s=await qh(n.localStore,i),a=await qi(n.localStore,s);await ca(n,sd(s),a.targetId,!1,a.resumeToken),fs(n.remoteStore,a)}for(const i of t)n.Ma.has(i)&&await Cn(n.localStore,i,!1).then(()=>{Vn(n.remoteStore,i),kn(n,i)}).catch(St)}}function ms(r){const e=L(r);return e.remoteStore.remoteSyncer.applyRemoteEvent=rd.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=ay.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=ny.bind(null,e),e.Ca.d_=K_.bind(null,e.eventManager),e.Ca.$a=$_.bind(null,e.eventManager),e}function fa(r){const e=L(r);return e.remoteStore.remoteSyncer.applySuccessfulWrite=ry.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=iy.bind(null,e),e}class kr{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=hs(e.databaseInfo.databaseId),this.sharedClientState=this.Wa(e),this.persistence=this.Ga(e),await this.persistence.start(),this.localStore=this.za(e),this.gcScheduler=this.ja(e,this.localStore),this.indexBackfillerScheduler=this.Ha(e,this.localStore)}ja(e,t){return null}Ha(e,t){return null}za(e){return Uh(this.persistence,new Fh,e.initialUser,this.serializer)}Ga(e){return new Mh(ls.Zr,this.serializer)}Wa(e){return new $h}async terminate(){var e,t;(e=this.gcScheduler)===null||e===void 0||e.stop(),(t=this.indexBackfillerScheduler)===null||t===void 0||t.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}kr.provider={build:()=>new kr};class od extends kr{constructor(e,t,n){super(),this.Ja=e,this.cacheSizeBytes=t,this.forceOwnership=n,this.kind="persistent",this.synchronizeTabs=!1}async initialize(e){await super.initialize(e),await this.Ja.initialize(this,e),await fa(this.Ja.syncEngine),await Fn(this.Ja.remoteStore),await this.persistence.yi(()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve()))}za(e){return Uh(this.persistence,new Fh,e.initialUser,this.serializer)}ja(e,t){const n=this.persistence.referenceDelegate.garbageCollector;return new Zg(n,e.asyncQueue,t)}Ha(e,t){const n=new Vp(t,this.persistence);return new Cp(e.asyncQueue,n)}Ga(e){const t=Lh(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey),n=this.cacheSizeBytes!==void 0?Pe.withCacheSize(this.cacheSizeBytes):Pe.DEFAULT;return new ea(this.synchronizeTabs,t,e.clientId,n,e.asyncQueue,Gh(),bi(),this.serializer,this.sharedClientState,!!this.forceOwnership)}Wa(e){return new $h}}class py extends od{constructor(e,t){super(e,t,!1),this.Ja=e,this.cacheSizeBytes=t,this.synchronizeTabs=!0}async initialize(e){await super.initialize(e);const t=this.Ja.syncEngine;this.sharedClientState instanceof Xs&&(this.sharedClientState.syncEngine={no:ly.bind(null,t),ro:fy.bind(null,t),io:my.bind(null,t),Qi:dy.bind(null,t),eo:cy.bind(null,t)},await this.sharedClientState.start()),await this.persistence.yi(async n=>{await hy(this.Ja.syncEngine,n),this.gcScheduler&&(n&&!this.gcScheduler.started?this.gcScheduler.start():n||this.gcScheduler.stop()),this.indexBackfillerScheduler&&(n&&!this.indexBackfillerScheduler.started?this.indexBackfillerScheduler.start():n||this.indexBackfillerScheduler.stop())})}Wa(e){const t=Gh();if(!Xs.D(t))throw new O(P.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const n=Lh(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey);return new Xs(t,e.asyncQueue,n,e.clientId,e.initialUser)}}class xr{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=n=>Mc(this.syncEngine,n,1),this.remoteStore.remoteSyncer.handleCredentialChange=oy.bind(null,this.syncEngine),await So(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return function(){return new j_}()}createDatastore(e){const t=hs(e.databaseInfo.databaseId),n=function(s){return new A_(s)}(e.databaseInfo);return function(s,a,u,c){return new S_(s,a,u,c)}(e.authCredentials,e.appCheckCredentials,n,t)}createRemoteStore(e){return function(n,i,s,a,u){return new C_(n,i,s,a,u)}(this.localStore,this.datastore,e.asyncQueue,t=>Mc(this.syncEngine,t,0),function(){return Dc.D()?new Dc:new T_}())}createSyncEngine(e,t){return function(i,s,a,u,c,d,m){const p=new J_(i,s,a,u,c,d);return m&&(p.Qa=!0),p}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){var e,t;await async function(i){const s=L(i);C("RemoteStore","RemoteStore shutting down."),s.L_.add(5),await zr(s),s.k_.shutdown(),s.q_.set("Unknown")}(this.remoteStore),(e=this.datastore)===null||e===void 0||e.terminate(),(t=this.eventManager)===null||t===void 0||t.terminate()}}xr.provider={build:()=>new xr};/**
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
 */class gy{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.Ya(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Ya(this.observer.error,e):le("Uncaught Error in snapshot listener:",e.toString()))}Za(){this.muted=!0}Ya(e,t){setTimeout(()=>{this.muted||e(t)},0)}}/**
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
 */class _y{constructor(e,t,n,i,s){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=n,this.databaseInfo=i,this.user=we.UNAUTHENTICATED,this.clientId=bl.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=s,this.authCredentials.start(n,async a=>{C("FirestoreClient","Received user=",a.uid),await this.authCredentialListener(a),this.user=a}),this.appCheckCredentials.start(n,a=>(C("FirestoreClient","Received new app check token=",a),this.appCheckCredentialListener(a,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new vt;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const n=aa(t,"Failed to shutdown persistence");e.reject(n)}}),e.promise}}async function eo(r,e){r.asyncQueue.verifyOperationInProgress(),C("FirestoreClient","Initializing OfflineComponentProvider");const t=r.configuration;await e.initialize(t);let n=t.initialUser;r.setCredentialChangeListener(async i=>{n.isEqual(i)||(await Bh(e.localStore,i),n=i)}),e.persistence.setDatabaseDeletedListener(()=>r.terminate()),r._offlineComponents=e}async function Fc(r,e){r.asyncQueue.verifyOperationInProgress();const t=await yy(r);C("FirestoreClient","Initializing OnlineComponentProvider"),await e.initialize(t,r.configuration),r.setCredentialChangeListener(n=>kc(e.remoteStore,n)),r.setAppCheckTokenChangeListener((n,i)=>kc(e.remoteStore,i)),r._onlineComponents=e}async function yy(r){if(!r._offlineComponents)if(r._uninitializedComponentsProvider){C("FirestoreClient","Using user provided OfflineComponentProvider");try{await eo(r,r._uninitializedComponentsProvider._offline)}catch(e){const t=e;if(!function(i){return i.name==="FirebaseError"?i.code===P.FAILED_PRECONDITION||i.code===P.UNIMPLEMENTED:!(typeof DOMException<"u"&&i instanceof DOMException)||i.code===22||i.code===20||i.code===11}(t))throw t;wr("Error using user provided cache. Falling back to memory cache: "+t),await eo(r,new kr)}}else C("FirestoreClient","Using default OfflineComponentProvider"),await eo(r,new kr);return r._offlineComponents}async function ad(r){return r._onlineComponents||(r._uninitializedComponentsProvider?(C("FirestoreClient","Using user provided OnlineComponentProvider"),await Fc(r,r._uninitializedComponentsProvider._online)):(C("FirestoreClient","Using default OnlineComponentProvider"),await Fc(r,new xr))),r._onlineComponents}function Iy(r){return ad(r).then(e=>e.syncEngine)}async function Uc(r){const e=await ad(r),t=e.eventManager;return t.onListen=Y_.bind(null,e.syncEngine),t.onUnlisten=Z_.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=X_.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=ey.bind(null,e.syncEngine),t}/**
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
 */function ud(r){const e={};return r.timeoutSeconds!==void 0&&(e.timeoutSeconds=r.timeoutSeconds),e}/**
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
 */const Bc=new Map;/**
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
 */function vy(r,e,t){if(!t)throw new O(P.INVALID_ARGUMENT,`Function ${r}() cannot be called with an empty ${e}.`)}function Ty(r,e,t,n){if(e===!0&&n===!0)throw new O(P.INVALID_ARGUMENT,`${r} and ${t} cannot be used together.`)}function jc(r){if(!N.isDocumentKey(r))throw new O(P.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${r} has ${r.length}.`)}function ma(r){if(r===void 0)return"undefined";if(r===null)return"null";if(typeof r=="string")return r.length>20&&(r=`${r.substring(0,20)}...`),JSON.stringify(r);if(typeof r=="number"||typeof r=="boolean")return""+r;if(typeof r=="object"){if(r instanceof Array)return"an array";{const e=function(n){return n.constructor?n.constructor.name:null}(r);return e?`a custom ${e} object`:"an object"}}return typeof r=="function"?"a function":M()}function _n(r,e){if("_delegate"in r&&(r=r._delegate),!(r instanceof e)){if(e.name===r.constructor.name)throw new O(P.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=ma(r);throw new O(P.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return r}/**
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
 */class qc{constructor(e){var t,n;if(e.host===void 0){if(e.ssl!==void 0)throw new O(P.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host="firestore.googleapis.com",this.ssl=!0}else this.host=e.host,this.ssl=(t=e.ssl)===null||t===void 0||t;if(this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=41943040;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<1048576)throw new O(P.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}Ty("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=ud((n=e.experimentalLongPollingOptions)!==null&&n!==void 0?n:{}),function(s){if(s.timeoutSeconds!==void 0){if(isNaN(s.timeoutSeconds))throw new O(P.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (must not be NaN)`);if(s.timeoutSeconds<5)throw new O(P.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (minimum allowed value is 5)`);if(s.timeoutSeconds>30)throw new O(P.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(n,i){return n.timeoutSeconds===i.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class cd{constructor(e,t,n,i){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=n,this._app=i,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new qc({}),this._settingsFrozen=!1,this._terminateTask="notTerminated"}get app(){if(!this._app)throw new O(P.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new O(P.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new qc(e),e.credentials!==void 0&&(this._authCredentials=function(n){if(!n)return new Ip;switch(n.type){case"firstParty":return new Ep(n.sessionIndex||"0",n.iamToken||null,n.authTokenFactory||null);case"provider":return n.client;default:throw new O(P.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(t){const n=Bc.get(t);n&&(C("ComponentProvider","Removing Datastore"),Bc.delete(t),n.terminate())}(this),Promise.resolve()}}/**
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
 */class ps{constructor(e,t,n){this.converter=t,this._query=n,this.type="query",this.firestore=e}withConverter(e){return new ps(this.firestore,e,this._query)}}class Le{constructor(e,t,n){this.converter=t,this._key=n,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new Nr(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new Le(this.firestore,e,this._key)}}class Nr extends ps{constructor(e,t,n){super(e,t,rs(n)),this._path=n,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new Le(this.firestore,null,new N(e))}withConverter(e){return new Nr(this.firestore,e,this._path)}}function jv(r,e,...t){if(r=Fe(r),arguments.length===1&&(e=bl.newId()),vy("doc","path",e),r instanceof cd){const n=ne.fromString(e,...t);return jc(n),new Le(r,null,new N(n))}{if(!(r instanceof Le||r instanceof Nr))throw new O(P.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(ne.fromString(e,...t));return jc(n),new Le(r.firestore,r instanceof Nr?r.converter:null,new N(n))}}/**
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
 */class zc{constructor(e=Promise.resolve()){this.Pu=[],this.Iu=!1,this.Tu=[],this.Eu=null,this.du=!1,this.Au=!1,this.Ru=[],this.t_=new Wh(this,"async_queue_retry"),this.Vu=()=>{const n=bi();n&&C("AsyncQueue","Visibility state changed to "+n.visibilityState),this.t_.jo()},this.mu=e;const t=bi();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this.Vu)}get isShuttingDown(){return this.Iu}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.fu(),this.gu(e)}enterRestrictedMode(e){if(!this.Iu){this.Iu=!0,this.Au=e||!1;const t=bi();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this.Vu)}}enqueue(e){if(this.fu(),this.Iu)return new Promise(()=>{});const t=new vt;return this.gu(()=>this.Iu&&this.Au?Promise.resolve():(e().then(t.resolve,t.reject),t.promise)).then(()=>t.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.Pu.push(e),this.pu()))}async pu(){if(this.Pu.length!==0){try{await this.Pu[0](),this.Pu.shift(),this.t_.reset()}catch(e){if(!Pt(e))throw e;C("AsyncQueue","Operation failed with retryable error: "+e)}this.Pu.length>0&&this.t_.Go(()=>this.pu())}}gu(e){const t=this.mu.then(()=>(this.du=!0,e().catch(n=>{this.Eu=n,this.du=!1;const i=function(a){let u=a.message||"";return a.stack&&(u=a.stack.includes(a.message)?a.stack:a.message+`
`+a.stack),u}(n);throw le("INTERNAL UNHANDLED ERROR: ",i),n}).then(n=>(this.du=!1,n))));return this.mu=t,t}enqueueAfterDelay(e,t,n){this.fu(),this.Ru.indexOf(e)>-1&&(t=0);const i=oa.createAndSchedule(this,e,t,n,s=>this.yu(s));return this.Tu.push(i),i}fu(){this.Eu&&M()}verifyOperationInProgress(){}async wu(){let e;do e=this.mu,await e;while(e!==this.mu)}Su(e){for(const t of this.Tu)if(t.timerId===e)return!0;return!1}bu(e){return this.wu().then(()=>{this.Tu.sort((t,n)=>t.targetTimeMs-n.targetTimeMs);for(const t of this.Tu)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.wu()})}Du(e){this.Ru.push(e)}yu(e){const t=this.Tu.indexOf(e);this.Tu.splice(t,1)}}function Kc(r){return function(t,n){if(typeof t!="object"||t===null)return!1;const i=t;for(const s of n)if(s in i&&typeof i[s]=="function")return!0;return!1}(r,["next","error","complete"])}class Or extends cd{constructor(e,t,n,i){super(e,t,n,i),this.type="firestore",this._queue=new zc,this._persistenceKey=(i==null?void 0:i.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new zc(e),this._firestoreClient=void 0,await e}}}function qv(r,e,t){t||(t="(default)");const n=Oo(r,"firestore");if(n.isInitialized(t)){const i=n.getImmediate({identifier:t}),s=n.getOptions(t);if(Tr(s,e))return i;throw new O(P.FAILED_PRECONDITION,"initializeFirestore() has already been called with different options. To avoid this error, call initializeFirestore() with the same options as when it was originally called, or call getFirestore() to return the already initialized instance.")}if(e.cacheSizeBytes!==void 0&&e.localCache!==void 0)throw new O(P.INVALID_ARGUMENT,"cache and cacheSizeBytes cannot be specified at the same time as cacheSizeBytes willbe deprecated. Instead, specify the cache size in the cache object");if(e.cacheSizeBytes!==void 0&&e.cacheSizeBytes!==-1&&e.cacheSizeBytes<1048576)throw new O(P.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");return n.initialize({options:e,instanceIdentifier:t})}function ld(r){if(r._terminated)throw new O(P.FAILED_PRECONDITION,"The client has already been terminated.");return r._firestoreClient||Ey(r),r._firestoreClient}function Ey(r){var e,t,n;const i=r._freezeSettings(),s=function(u,c,d,m){return new Yp(u,c,d,m.host,m.ssl,m.experimentalForceLongPolling,m.experimentalAutoDetectLongPolling,ud(m.experimentalLongPollingOptions),m.useFetchStreams)}(r._databaseId,((e=r._app)===null||e===void 0?void 0:e.options.appId)||"",r._persistenceKey,i);r._componentsProvider||!((t=i.localCache)===null||t===void 0)&&t._offlineComponentProvider&&(!((n=i.localCache)===null||n===void 0)&&n._onlineComponentProvider)&&(r._componentsProvider={_offline:i.localCache._offlineComponentProvider,_online:i.localCache._onlineComponentProvider}),r._firestoreClient=new _y(r._authCredentials,r._appCheckCredentials,r._queue,s,r._componentsProvider&&function(u){const c=u==null?void 0:u._online.build();return{_offline:u==null?void 0:u._offline.build(c),_online:c}}(r._componentsProvider))}/**
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
 */class xn{constructor(e){this._byteString=e}static fromBase64String(e){try{return new xn(he.fromBase64String(e))}catch(t){throw new O(P.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new xn(he.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}}/**
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
 */class pa{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new O(P.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new oe(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}/**
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
 */class hd{constructor(e){this._methodName=e}}/**
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
 */class ga{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new O(P.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new O(P.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}toJSON(){return{latitude:this._lat,longitude:this._long}}_compareTo(e){return z(this._lat,e._lat)||z(this._long,e._long)}}/**
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
 */class _a{constructor(e){this._values=(e||[]).map(t=>t)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(n,i){if(n.length!==i.length)return!1;for(let s=0;s<n.length;++s)if(n[s]!==i[s])return!1;return!0}(this._values,e._values)}}/**
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
 */const wy=/^__.*__$/;class Ay{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return this.fieldMask!==null?new Vt(e,this.data,this.fieldMask,t,this.fieldTransforms):new Ln(e,this.data,t,this.fieldTransforms)}}function dd(r){switch(r){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw M()}}class ya{constructor(e,t,n,i,s,a){this.settings=e,this.databaseId=t,this.serializer=n,this.ignoreUndefinedProperties=i,s===void 0&&this.vu(),this.fieldTransforms=s||[],this.fieldMask=a||[]}get path(){return this.settings.path}get Cu(){return this.settings.Cu}Fu(e){return new ya(Object.assign(Object.assign({},this.settings),e),this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}Mu(e){var t;const n=(t=this.path)===null||t===void 0?void 0:t.child(e),i=this.Fu({path:n,xu:!1});return i.Ou(e),i}Nu(e){var t;const n=(t=this.path)===null||t===void 0?void 0:t.child(e),i=this.Fu({path:n,xu:!1});return i.vu(),i}Lu(e){return this.Fu({path:void 0,xu:!0})}Bu(e){return Gi(e,this.settings.methodName,this.settings.ku||!1,this.path,this.settings.qu)}contains(e){return this.fieldMask.find(t=>e.isPrefixOf(t))!==void 0||this.fieldTransforms.find(t=>e.isPrefixOf(t.field))!==void 0}vu(){if(this.path)for(let e=0;e<this.path.length;e++)this.Ou(this.path.get(e))}Ou(e){if(e.length===0)throw this.Bu("Document fields must not be empty");if(dd(this.Cu)&&wy.test(e))throw this.Bu('Document fields cannot begin and end with "__"')}}class Ry{constructor(e,t,n){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=n||hs(e)}Qu(e,t,n,i=!1){return new ya({Cu:e,methodName:t,qu:n,path:oe.emptyPath(),xu:!1,ku:i},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function by(r){const e=r._freezeSettings(),t=hs(r._databaseId);return new Ry(r._databaseId,!!e.ignoreUndefinedProperties,t)}function Sy(r,e,t,n,i,s={}){const a=r.Qu(s.merge||s.mergeFields?2:0,e,t,i);gd("Data must be an object, but it was:",a,n);const u=md(n,a);let c,d;if(s.merge)c=new Me(a.fieldMask),d=a.fieldTransforms;else if(s.mergeFields){const m=[];for(const p of s.mergeFields){const E=Py(e,p,t);if(!a.contains(E))throw new O(P.INVALID_ARGUMENT,`Field '${E}' is specified in your field mask but missing from your input data.`);Vy(m,E)||m.push(E)}c=new Me(m),d=a.fieldTransforms.filter(p=>c.covers(p.field))}else c=null,d=a.fieldTransforms;return new Ay(new Ce(u),c,d)}function fd(r,e){if(pd(r=Fe(r)))return gd("Unsupported field value:",e,r),md(r,e);if(r instanceof hd)return function(n,i){if(!dd(i.Cu))throw i.Bu(`${n._methodName}() can only be used with update() and set()`);if(!i.path)throw i.Bu(`${n._methodName}() is not currently supported inside arrays`);const s=n._toFieldTransform(i);s&&i.fieldTransforms.push(s)}(r,e),null;if(r===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),r instanceof Array){if(e.settings.xu&&e.Cu!==4)throw e.Bu("Nested arrays are not supported");return function(n,i){const s=[];let a=0;for(const u of n){let c=fd(u,i.Lu(a));c==null&&(c={nullValue:"NULL_VALUE"}),s.push(c),a++}return{arrayValue:{values:s}}}(r,e)}return function(n,i){if((n=Fe(n))===null)return{nullValue:"NULL_VALUE"};if(typeof n=="number")return pg(i.serializer,n);if(typeof n=="boolean")return{booleanValue:n};if(typeof n=="string")return{stringValue:n};if(n instanceof Date){const s=ae.fromDate(n);return{timestampValue:Pn(i.serializer,s)}}if(n instanceof ae){const s=new ae(n.seconds,1e3*Math.floor(n.nanoseconds/1e3));return{timestampValue:Pn(i.serializer,s)}}if(n instanceof ga)return{geoPointValue:{latitude:n.latitude,longitude:n.longitude}};if(n instanceof xn)return{bytesValue:mh(i.serializer,n._byteString)};if(n instanceof Le){const s=i.databaseId,a=n.firestore._databaseId;if(!a.isEqual(s))throw i.Bu(`Document reference is for database ${a.projectId}/${a.database} but should be for database ${s.projectId}/${s.database}`);return{referenceValue:Jo(n.firestore._databaseId||i.databaseId,n._key.path)}}if(n instanceof _a)return function(a,u){return{mapValue:{fields:{__type__:{stringValue:"__vector__"},value:{arrayValue:{values:a.toArray().map(c=>{if(typeof c!="number")throw u.Bu("VectorValues must only contain numeric values.");return $o(u.serializer,c)})}}}}}}(n,i);throw i.Bu(`Unsupported field value: ${ma(n)}`)}(r,e)}function md(r,e){const t={};return Fl(r)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):Mn(r,(n,i)=>{const s=fd(i,e.Mu(n));s!=null&&(t[n]=s)}),{mapValue:{fields:t}}}function pd(r){return!(typeof r!="object"||r===null||r instanceof Array||r instanceof Date||r instanceof ae||r instanceof ga||r instanceof xn||r instanceof Le||r instanceof hd||r instanceof _a)}function gd(r,e,t){if(!pd(t)||!function(i){return typeof i=="object"&&i!==null&&(Object.getPrototypeOf(i)===Object.prototype||Object.getPrototypeOf(i)===null)}(t)){const n=ma(t);throw n==="an object"?e.Bu(r+" a custom object"):e.Bu(r+" "+n)}}function Py(r,e,t){if((e=Fe(e))instanceof pa)return e._internalPath;if(typeof e=="string")return _d(r,e);throw Gi("Field path arguments must be of type string or ",r,!1,void 0,t)}const Cy=new RegExp("[~\\*/\\[\\]]");function _d(r,e,t){if(e.search(Cy)>=0)throw Gi(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,r,!1,void 0,t);try{return new pa(...e.split("."))._internalPath}catch{throw Gi(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,r,!1,void 0,t)}}function Gi(r,e,t,n,i){const s=n&&!n.isEmpty(),a=i!==void 0;let u=`Function ${e}() called with invalid data`;t&&(u+=" (via `toFirestore()`)"),u+=". ";let c="";return(s||a)&&(c+=" (found",s&&(c+=` in field ${n}`),a&&(c+=` in document ${i}`),c+=")"),new O(P.INVALID_ARGUMENT,u+r+c)}function Vy(r,e){return r.some(t=>t.isEqual(e))}/**
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
 */class yd{constructor(e,t,n,i,s){this._firestore=e,this._userDataWriter=t,this._key=n,this._document=i,this._converter=s}get id(){return this._key.path.lastSegment()}get ref(){return new Le(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new Dy(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){const t=this._document.data.field(Id("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}}class Dy extends yd{data(){return super.data()}}function Id(r,e){return typeof e=="string"?_d(r,e):e instanceof pa?e._internalPath:e._delegate._internalPath}/**
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
 */function ky(r){if(r.limitType==="L"&&r.explicitOrderBy.length===0)throw new O(P.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class xy{convertValue(e,t="none"){switch(Ht(e)){case 0:return null;case 1:return e.booleanValue;case 2:return se(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(wt(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw M()}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const n={};return Mn(e,(i,s)=>{n[i]=this.convertValue(s,t)}),n}convertVectorValue(e){var t,n,i;const s=(i=(n=(t=e.fields)===null||t===void 0?void 0:t.value.arrayValue)===null||n===void 0?void 0:n.values)===null||i===void 0?void 0:i.map(a=>se(a.doubleValue));return new _a(s)}convertGeoPoint(e){return new ga(se(e.latitude),se(e.longitude))}convertArray(e,t){return(e.values||[]).map(n=>this.convertValue(n,t))}convertServerTimestamp(e,t){switch(t){case"previous":const n=jo(e);return n==null?null:this.convertValue(n,t);case"estimate":return this.convertTimestamp(Sr(e));default:return null}}convertTimestamp(e){const t=et(e);return new ae(t.seconds,t.nanos)}convertDocumentKey(e,t){const n=ne.fromString(e);F(Ah(n));const i=new Wt(n.get(1),n.get(3)),s=new N(n.popFirst(5));return i.isEqual(t)||le(`Document ${s} contains a document reference within a different database (${i.projectId}/${i.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),s}}/**
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
 */function Ny(r,e,t){let n;return n=r?r.toFirestore(e):e,n}/**
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
 */class fr{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class vd extends yd{constructor(e,t,n,i,s,a){super(e,t,n,i,a),this._firestore=e,this._firestoreImpl=e,this.metadata=s}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new Si(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const n=this._document.data.field(Id("DocumentSnapshot.get",e));if(n!==null)return this._userDataWriter.convertValue(n,t.serverTimestamps)}}}class Si extends vd{data(e={}){return super.data(e)}}class Oy{constructor(e,t,n,i){this._firestore=e,this._userDataWriter=t,this._snapshot=i,this.metadata=new fr(i.hasPendingWrites,i.fromCache),this.query=n}get docs(){const e=[];return this.forEach(t=>e.push(t)),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach(n=>{e.call(t,new Si(this._firestore,this._userDataWriter,n.key,n,new fr(this._snapshot.mutatedKeys.has(n.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new O(P.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=function(i,s){if(i._snapshot.oldDocs.isEmpty()){let a=0;return i._snapshot.docChanges.map(u=>{const c=new Si(i._firestore,i._userDataWriter,u.doc.key,u.doc,new fr(i._snapshot.mutatedKeys.has(u.doc.key),i._snapshot.fromCache),i.query.converter);return u.doc,{type:"added",doc:c,oldIndex:-1,newIndex:a++}})}{let a=i._snapshot.oldDocs;return i._snapshot.docChanges.filter(u=>s||u.type!==3).map(u=>{const c=new Si(i._firestore,i._userDataWriter,u.doc.key,u.doc,new fr(i._snapshot.mutatedKeys.has(u.doc.key),i._snapshot.fromCache),i.query.converter);let d=-1,m=-1;return u.type!==0&&(d=a.indexOf(u.doc.key),a=a.delete(u.doc.key)),u.type!==1&&(a=a.add(u.doc),m=a.indexOf(u.doc.key)),{type:My(u.type),doc:c,oldIndex:d,newIndex:m}})}}(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}}function My(r){switch(r){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return M()}}class Td extends xy{constructor(e){super(),this.firestore=e}convertBytes(e){return new xn(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new Le(this.firestore,null,t)}}function zv(r,e,t){r=_n(r,Le);const n=_n(r.firestore,Or),i=Ny(r.converter,e);return Ed(n,[Sy(by(n),"setDoc",r._key,i,r.converter!==null,t).toMutation(r._key,De.none())])}function Kv(r){return Ed(_n(r.firestore,Or),[new as(r._key,De.none())])}function $v(r,...e){var t,n,i;r=Fe(r);let s={includeMetadataChanges:!1,source:"default"},a=0;typeof e[a]!="object"||Kc(e[a])||(s=e[a],a++);const u={includeMetadataChanges:s.includeMetadataChanges,source:s.source};if(Kc(e[a])){const p=e[a];e[a]=(t=p.next)===null||t===void 0?void 0:t.bind(p),e[a+1]=(n=p.error)===null||n===void 0?void 0:n.bind(p),e[a+2]=(i=p.complete)===null||i===void 0?void 0:i.bind(p)}let c,d,m;if(r instanceof Le)d=_n(r.firestore,Or),m=rs(r._key.path),c={next:p=>{e[a]&&e[a](Ly(d,r,p))},error:e[a+1],complete:e[a+2]};else{const p=_n(r,ps);d=_n(p.firestore,Or),m=p._query;const E=new Td(d);c={next:S=>{e[a]&&e[a](new Oy(d,E,p,S))},error:e[a+1],complete:e[a+2]},ky(r._query)}return function(E,S,V,x){const D=new gy(x),K=new G_(S,D,V);return E.asyncQueue.enqueueAndForget(async()=>q_(await Uc(E),K)),()=>{D.Za(),E.asyncQueue.enqueueAndForget(async()=>z_(await Uc(E),K))}}(ld(d),m,u,c)}function Ed(r,e){return function(n,i){const s=new vt;return n.asyncQueue.enqueueAndForget(async()=>ty(await Iy(n),i,s)),s.promise}(ld(r),e)}function Ly(r,e,t){const n=t.docs.get(e._key),i=new Td(r);return new vd(r,i,e._key,n,new fr(t.hasPendingWrites,t.fromCache),e.converter)}class Fy{constructor(e){let t;this.kind="persistent",e!=null&&e.tabManager?(e.tabManager._initialize(e),t=e.tabManager):(t=jy(),t._initialize(e)),this._onlineComponentProvider=t._onlineComponentProvider,this._offlineComponentProvider=t._offlineComponentProvider}toJSON(){return{kind:this.kind}}}function Gv(r){return new Fy(r)}class Uy{constructor(e){this.forceOwnership=e,this.kind="persistentSingleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=xr.provider,this._offlineComponentProvider={build:t=>new od(t,e==null?void 0:e.cacheSizeBytes,this.forceOwnership)}}}class By{constructor(){this.kind="PersistentMultipleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=xr.provider,this._offlineComponentProvider={build:t=>new py(t,e==null?void 0:e.cacheSizeBytes)}}}function jy(r){return new Uy(void 0)}function Wv(){return new By}(function(e,t=!0){(function(i){On=i})(Nn),Tn(new $t("firestore",(n,{instanceIdentifier:i,options:s})=>{const a=n.getProvider("app").getImmediate(),u=new Or(new vp(n.getProvider("auth-internal")),new Ap(n.getProvider("app-check-internal")),function(d,m){if(!Object.prototype.hasOwnProperty.apply(d.options,["projectId"]))throw new O(P.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new Wt(d.options.projectId,m)}(a,i),a);return s=Object.assign({useFetchStreams:t},s),u._setSettings(s),u},"PUBLIC").setMultipleInstances(!0)),It(Fu,"4.7.3",e),It(Fu,"4.7.3","esm2017")})();function Ia(r,e){var t={};for(var n in r)Object.prototype.hasOwnProperty.call(r,n)&&e.indexOf(n)<0&&(t[n]=r[n]);if(r!=null&&typeof Object.getOwnPropertySymbols=="function")for(var i=0,n=Object.getOwnPropertySymbols(r);i<n.length;i++)e.indexOf(n[i])<0&&Object.prototype.propertyIsEnumerable.call(r,n[i])&&(t[n[i]]=r[n[i]]);return t}function wd(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const qy=wd,Ad=new Lr("auth","Firebase",wd());/**
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
 */const Wi=new xo("@firebase/auth");function zy(r,...e){Wi.logLevel<=W.WARN&&Wi.warn(`Auth (${Nn}): ${r}`,...e)}function Pi(r,...e){Wi.logLevel<=W.ERROR&&Wi.error(`Auth (${Nn}): ${r}`,...e)}/**
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
 */function tt(r,...e){throw va(r,...e)}function qe(r,...e){return va(r,...e)}function Rd(r,e,t){const n=Object.assign(Object.assign({},qy()),{[e]:t});return new Lr("auth","Firebase",n).create(e,{appName:r.name})}function Et(r){return Rd(r,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function va(r,...e){if(typeof r!="string"){const t=e[0],n=[...e.slice(1)];return n[0]&&(n[0].appName=r.name),r._errorFactory.create(t,...n)}return Ad.create(r,...e)}function q(r,e,...t){if(!r)throw va(e,...t)}function Je(r){const e="INTERNAL ASSERTION FAILED: "+r;throw Pi(e),new Error(e)}function nt(r,e){r||Je(e)}/**
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
 */function Vo(){var r;return typeof self<"u"&&((r=self.location)===null||r===void 0?void 0:r.href)||""}function Ky(){return $c()==="http:"||$c()==="https:"}function $c(){var r;return typeof self<"u"&&((r=self.location)===null||r===void 0?void 0:r.protocol)||null}/**
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
 */function $y(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(Ky()||Jf()||"connection"in navigator)?navigator.onLine:!0}function Gy(){if(typeof navigator>"u")return null;const r=navigator;return r.languages&&r.languages[0]||r.language||null}/**
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
 */class Kr{constructor(e,t){this.shortDelay=e,this.longDelay=t,nt(t>e,"Short delay should be less than long delay!"),this.isMobile=Wf()||Yf()}get(){return $y()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
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
 */function Ta(r,e){nt(r.emulator,"Emulator should always be set here");const{url:t}=r.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
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
 */class bd{static initialize(e,t,n){this.fetchImpl=e,t&&(this.headersImpl=t),n&&(this.responseImpl=n)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;Je("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;Je("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;Je("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
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
 */const Wy={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
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
 */const Hy=new Kr(3e4,6e4);function gs(r,e){return r.tenantId&&!e.tenantId?Object.assign(Object.assign({},e),{tenantId:r.tenantId}):e}async function Bn(r,e,t,n,i={}){return Sd(r,i,async()=>{let s={},a={};n&&(e==="GET"?a=n:s={body:JSON.stringify(n)});const u=Fr(Object.assign({key:r.config.apiKey},a)).slice(1),c=await r._getAdditionalHeaders();c["Content-Type"]="application/json",r.languageCode&&(c["X-Firebase-Locale"]=r.languageCode);const d=Object.assign({method:e,headers:c},s);return Qf()||(d.referrerPolicy="no-referrer"),bd.fetch()(Cd(r,r.config.apiHost,t,u),d)})}async function Sd(r,e,t){r._canInitEmulator=!1;const n=Object.assign(Object.assign({},Wy),e);try{const i=new Qy(r),s=await Promise.race([t(),i.promise]);i.clearNetworkTimeout();const a=await s.json();if("needConfirmation"in a)throw yi(r,"account-exists-with-different-credential",a);if(s.ok&&!("errorMessage"in a))return a;{const u=s.ok?a.errorMessage:a.error.message,[c,d]=u.split(" : ");if(c==="FEDERATED_USER_ID_ALREADY_LINKED")throw yi(r,"credential-already-in-use",a);if(c==="EMAIL_EXISTS")throw yi(r,"email-already-in-use",a);if(c==="USER_DISABLED")throw yi(r,"user-disabled",a);const m=n[c]||c.toLowerCase().replace(/[_\s]+/g,"-");if(d)throw Rd(r,m,d);tt(r,m)}}catch(i){if(i instanceof rt)throw i;tt(r,"network-request-failed",{message:String(i)})}}async function Pd(r,e,t,n,i={}){const s=await Bn(r,e,t,n,i);return"mfaPendingCredential"in s&&tt(r,"multi-factor-auth-required",{_serverResponse:s}),s}function Cd(r,e,t,n){const i=`${e}${t}?${n}`;return r.config.emulator?Ta(r.config,i):`${r.config.apiScheme}://${i}`}class Qy{constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,n)=>{this.timer=setTimeout(()=>n(qe(this.auth,"network-request-failed")),Hy.get())})}clearNetworkTimeout(){clearTimeout(this.timer)}}function yi(r,e,t){const n={appName:r.name};t.email&&(n.email=t.email),t.phoneNumber&&(n.phoneNumber=t.phoneNumber);const i=qe(r,e,n);return i.customData._tokenResponse=t,i}/**
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
 */async function Jy(r,e){return Bn(r,"POST","/v1/accounts:delete",e)}async function Vd(r,e){return Bn(r,"POST","/v1/accounts:lookup",e)}/**
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
 */function vr(r){if(r)try{const e=new Date(Number(r));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function Yy(r,e=!1){const t=Fe(r),n=await t.getIdToken(e),i=Ea(n);q(i&&i.exp&&i.auth_time&&i.iat,t.auth,"internal-error");const s=typeof i.firebase=="object"?i.firebase:void 0,a=s==null?void 0:s.sign_in_provider;return{claims:i,token:n,authTime:vr(to(i.auth_time)),issuedAtTime:vr(to(i.iat)),expirationTime:vr(to(i.exp)),signInProvider:a||null,signInSecondFactor:(s==null?void 0:s.sign_in_second_factor)||null}}function to(r){return Number(r)*1e3}function Ea(r){const[e,t,n]=r.split(".");if(e===void 0||t===void 0||n===void 0)return Pi("JWT malformed, contained fewer than 3 sections"),null;try{const i=hl(t);return i?JSON.parse(i):(Pi("Failed to decode base64 JWT payload"),null)}catch(i){return Pi("Caught error parsing JWT payload as JSON",i==null?void 0:i.toString()),null}}function Gc(r){const e=Ea(r);return q(e,"internal-error"),q(typeof e.exp<"u","internal-error"),q(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
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
 */async function Mr(r,e,t=!1){if(t)return e;try{return await e}catch(n){throw n instanceof rt&&Xy(n)&&r.auth.currentUser===r&&await r.auth.signOut(),n}}function Xy({code:r}){return r==="auth/user-disabled"||r==="auth/user-token-expired"}/**
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
 */class Zy{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){var t;if(e){const n=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),n}else{this.errorBackoff=3e4;const i=((t=this.user.stsTokenManager.expirationTime)!==null&&t!==void 0?t:0)-Date.now()-3e5;return Math.max(0,i)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
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
 */class Do{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=vr(this.lastLoginAt),this.creationTime=vr(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
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
 */async function Hi(r){var e;const t=r.auth,n=await r.getIdToken(),i=await Mr(r,Vd(t,{idToken:n}));q(i==null?void 0:i.users.length,t,"internal-error");const s=i.users[0];r._notifyReloadListener(s);const a=!((e=s.providerUserInfo)===null||e===void 0)&&e.length?Dd(s.providerUserInfo):[],u=tI(r.providerData,a),c=r.isAnonymous,d=!(r.email&&s.passwordHash)&&!(u!=null&&u.length),m=c?d:!1,p={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:u,metadata:new Do(s.createdAt,s.lastLoginAt),isAnonymous:m};Object.assign(r,p)}async function eI(r){const e=Fe(r);await Hi(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function tI(r,e){return[...r.filter(n=>!e.some(i=>i.providerId===n.providerId)),...e]}function Dd(r){return r.map(e=>{var{providerId:t}=e,n=Ia(e,["providerId"]);return{providerId:t,uid:n.rawId||"",displayName:n.displayName||null,email:n.email||null,phoneNumber:n.phoneNumber||null,photoURL:n.photoUrl||null}})}/**
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
 */async function nI(r,e){const t=await Sd(r,{},async()=>{const n=Fr({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:i,apiKey:s}=r.config,a=Cd(r,i,"/v1/token",`key=${s}`),u=await r._getAdditionalHeaders();return u["Content-Type"]="application/x-www-form-urlencoded",bd.fetch()(a,{method:"POST",headers:u,body:n})});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function rI(r,e){return Bn(r,"POST","/v2/accounts:revokeToken",gs(r,e))}/**
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
 */class yn{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){q(e.idToken,"internal-error"),q(typeof e.idToken<"u","internal-error"),q(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):Gc(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){q(e.length!==0,"internal-error");const t=Gc(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(q(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:n,refreshToken:i,expiresIn:s}=await nI(e,t);this.updateTokensAndExpiration(n,i,Number(s))}updateTokensAndExpiration(e,t,n){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+n*1e3}static fromJSON(e,t){const{refreshToken:n,accessToken:i,expirationTime:s}=t,a=new yn;return n&&(q(typeof n=="string","internal-error",{appName:e}),a.refreshToken=n),i&&(q(typeof i=="string","internal-error",{appName:e}),a.accessToken=i),s&&(q(typeof s=="number","internal-error",{appName:e}),a.expirationTime=s),a}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new yn,this.toJSON())}_performRefresh(){return Je("not implemented")}}/**
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
 */function lt(r,e){q(typeof r=="string"||typeof r>"u","internal-error",{appName:e})}class Ye{constructor(e){var{uid:t,auth:n,stsTokenManager:i}=e,s=Ia(e,["uid","auth","stsTokenManager"]);this.providerId="firebase",this.proactiveRefresh=new Zy(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=t,this.auth=n,this.stsTokenManager=i,this.accessToken=i.accessToken,this.displayName=s.displayName||null,this.email=s.email||null,this.emailVerified=s.emailVerified||!1,this.phoneNumber=s.phoneNumber||null,this.photoURL=s.photoURL||null,this.isAnonymous=s.isAnonymous||!1,this.tenantId=s.tenantId||null,this.providerData=s.providerData?[...s.providerData]:[],this.metadata=new Do(s.createdAt||void 0,s.lastLoginAt||void 0)}async getIdToken(e){const t=await Mr(this,this.stsTokenManager.getToken(this.auth,e));return q(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return Yy(this,e)}reload(){return eI(this)}_assign(e){this!==e&&(q(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>Object.assign({},t)),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new Ye(Object.assign(Object.assign({},this),{auth:e,stsTokenManager:this.stsTokenManager._clone()}));return t.metadata._copy(this.metadata),t}_onReload(e){q(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let n=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),n=!0),t&&await Hi(this),await this.auth._persistUserIfCurrent(this),n&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(He(this.auth.app))return Promise.reject(Et(this.auth));const e=await this.getIdToken();return await Mr(this,Jy(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return Object.assign(Object.assign({uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>Object.assign({},e)),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId},this.metadata.toJSON()),{apiKey:this.auth.config.apiKey,appName:this.auth.name})}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){var n,i,s,a,u,c,d,m;const p=(n=t.displayName)!==null&&n!==void 0?n:void 0,E=(i=t.email)!==null&&i!==void 0?i:void 0,S=(s=t.phoneNumber)!==null&&s!==void 0?s:void 0,V=(a=t.photoURL)!==null&&a!==void 0?a:void 0,x=(u=t.tenantId)!==null&&u!==void 0?u:void 0,D=(c=t._redirectEventId)!==null&&c!==void 0?c:void 0,K=(d=t.createdAt)!==null&&d!==void 0?d:void 0,j=(m=t.lastLoginAt)!==null&&m!==void 0?m:void 0,{uid:B,emailVerified:Q,isAnonymous:X,providerData:G,stsTokenManager:I}=t;q(B&&I,e,"internal-error");const g=yn.fromJSON(this.name,I);q(typeof B=="string",e,"internal-error"),lt(p,e.name),lt(E,e.name),q(typeof Q=="boolean",e,"internal-error"),q(typeof X=="boolean",e,"internal-error"),lt(S,e.name),lt(V,e.name),lt(x,e.name),lt(D,e.name),lt(K,e.name),lt(j,e.name);const y=new Ye({uid:B,auth:e,email:E,emailVerified:Q,displayName:p,isAnonymous:X,photoURL:V,phoneNumber:S,tenantId:x,stsTokenManager:g,createdAt:K,lastLoginAt:j});return G&&Array.isArray(G)&&(y.providerData=G.map(v=>Object.assign({},v))),D&&(y._redirectEventId=D),y}static async _fromIdTokenResponse(e,t,n=!1){const i=new yn;i.updateFromServerResponse(t);const s=new Ye({uid:t.localId,auth:e,stsTokenManager:i,isAnonymous:n});return await Hi(s),s}static async _fromGetAccountInfoResponse(e,t,n){const i=t.users[0];q(i.localId!==void 0,"internal-error");const s=i.providerUserInfo!==void 0?Dd(i.providerUserInfo):[],a=!(i.email&&i.passwordHash)&&!(s!=null&&s.length),u=new yn;u.updateFromIdToken(n);const c=new Ye({uid:i.localId,auth:e,stsTokenManager:u,isAnonymous:a}),d={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:s,metadata:new Do(i.createdAt,i.lastLoginAt),isAnonymous:!(i.email&&i.passwordHash)&&!(s!=null&&s.length)};return Object.assign(c,d),c}}/**
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
 */const Wc=new Map;function Xe(r){nt(r instanceof Function,"Expected a class definition");let e=Wc.get(r);return e?(nt(e instanceof r,"Instance stored in cache mismatched with class"),e):(e=new r,Wc.set(r,e),e)}/**
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
 */class kd{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}kd.type="NONE";const Hc=kd;/**
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
 */function Ci(r,e,t){return`firebase:${r}:${e}:${t}`}class In{constructor(e,t,n){this.persistence=e,this.auth=t,this.userKey=n;const{config:i,name:s}=this.auth;this.fullUserKey=Ci(this.userKey,i.apiKey,s),this.fullPersistenceKey=Ci("persistence",i.apiKey,s),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);return e?Ye._fromJSON(this.auth,e):null}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,n="authUser"){if(!t.length)return new In(Xe(Hc),e,n);const i=(await Promise.all(t.map(async d=>{if(await d._isAvailable())return d}))).filter(d=>d);let s=i[0]||Xe(Hc);const a=Ci(n,e.config.apiKey,e.name);let u=null;for(const d of t)try{const m=await d._get(a);if(m){const p=Ye._fromJSON(e,m);d!==s&&(u=p),s=d;break}}catch{}const c=i.filter(d=>d._shouldAllowMigration);return!s._shouldAllowMigration||!c.length?new In(s,e,n):(s=c[0],u&&await s._set(a,u.toJSON()),await Promise.all(t.map(async d=>{if(d!==s)try{await d._remove(a)}catch{}})),new In(s,e,n))}}/**
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
 */function Qc(r){const e=r.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(Md(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(xd(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(Fd(e))return"Blackberry";if(Ud(e))return"Webos";if(Nd(e))return"Safari";if((e.includes("chrome/")||Od(e))&&!e.includes("edge/"))return"Chrome";if(Ld(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,n=r.match(t);if((n==null?void 0:n.length)===2)return n[1]}return"Other"}function xd(r=fe()){return/firefox\//i.test(r)}function Nd(r=fe()){const e=r.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function Od(r=fe()){return/crios\//i.test(r)}function Md(r=fe()){return/iemobile/i.test(r)}function Ld(r=fe()){return/android/i.test(r)}function Fd(r=fe()){return/blackberry/i.test(r)}function Ud(r=fe()){return/webos/i.test(r)}function wa(r=fe()){return/iphone|ipad|ipod/i.test(r)||/macintosh/i.test(r)&&/mobile/i.test(r)}function iI(r=fe()){var e;return wa(r)&&!!(!((e=window.navigator)===null||e===void 0)&&e.standalone)}function sI(){return Xf()&&document.documentMode===10}function Bd(r=fe()){return wa(r)||Ld(r)||Ud(r)||Fd(r)||/windows phone/i.test(r)||Md(r)}/**
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
 */function jd(r,e=[]){let t;switch(r){case"Browser":t=Qc(fe());break;case"Worker":t=`${Qc(fe())}-${r}`;break;default:t=r}const n=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${Nn}/${n}`}/**
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
 */class oI{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const n=s=>new Promise((a,u)=>{try{const c=e(s);a(c)}catch(c){u(c)}});n.onAbort=t,this.queue.push(n);const i=this.queue.length-1;return()=>{this.queue[i]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const n of this.queue)await n(e),n.onAbort&&t.push(n.onAbort)}catch(n){t.reverse();for(const i of t)try{i()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:n==null?void 0:n.message})}}}/**
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
 */async function aI(r,e={}){return Bn(r,"GET","/v2/passwordPolicy",gs(r,e))}/**
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
 */const uI=6;class cI{constructor(e){var t,n,i,s;const a=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=(t=a.minPasswordLength)!==null&&t!==void 0?t:uI,a.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=a.maxPasswordLength),a.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=a.containsLowercaseCharacter),a.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=a.containsUppercaseCharacter),a.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=a.containsNumericCharacter),a.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=a.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=(i=(n=e.allowedNonAlphanumericCharacters)===null||n===void 0?void 0:n.join(""))!==null&&i!==void 0?i:"",this.forceUpgradeOnSignin=(s=e.forceUpgradeOnSignin)!==null&&s!==void 0?s:!1,this.schemaVersion=e.schemaVersion}validatePassword(e){var t,n,i,s,a,u;const c={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,c),this.validatePasswordCharacterOptions(e,c),c.isValid&&(c.isValid=(t=c.meetsMinPasswordLength)!==null&&t!==void 0?t:!0),c.isValid&&(c.isValid=(n=c.meetsMaxPasswordLength)!==null&&n!==void 0?n:!0),c.isValid&&(c.isValid=(i=c.containsLowercaseLetter)!==null&&i!==void 0?i:!0),c.isValid&&(c.isValid=(s=c.containsUppercaseLetter)!==null&&s!==void 0?s:!0),c.isValid&&(c.isValid=(a=c.containsNumericCharacter)!==null&&a!==void 0?a:!0),c.isValid&&(c.isValid=(u=c.containsNonAlphanumericCharacter)!==null&&u!==void 0?u:!0),c}validatePasswordLengthOptions(e,t){const n=this.customStrengthOptions.minPasswordLength,i=this.customStrengthOptions.maxPasswordLength;n&&(t.meetsMinPasswordLength=e.length>=n),i&&(t.meetsMaxPasswordLength=e.length<=i)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let n;for(let i=0;i<e.length;i++)n=e.charAt(i),this.updatePasswordCharacterOptionsStatuses(t,n>="a"&&n<="z",n>="A"&&n<="Z",n>="0"&&n<="9",this.allowedNonAlphanumericCharacters.includes(n))}updatePasswordCharacterOptionsStatuses(e,t,n,i,s){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=n)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=i)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=s))}}/**
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
 */class lI{constructor(e,t,n,i){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=n,this.config=i,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Jc(this),this.idTokenSubscription=new Jc(this),this.beforeStateQueue=new oI(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=Ad,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=i.sdkClientVersion}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=Xe(t)),this._initializationPromise=this.queue(async()=>{var n,i;if(!this._deleted&&(this.persistenceManager=await In.create(this,e),!this._deleted)){if(!((n=this._popupRedirectResolver)===null||n===void 0)&&n._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=((i=this.currentUser)===null||i===void 0?void 0:i.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await Vd(this,{idToken:e}),n=await Ye._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(n)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var t;if(He(this.app)){const a=this.app.settings.authIdToken;return a?new Promise(u=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(a).then(u,u))}):this.directlySetCurrentUser(null)}const n=await this.assertedPersistence.getCurrentUser();let i=n,s=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const a=(t=this.redirectUser)===null||t===void 0?void 0:t._redirectEventId,u=i==null?void 0:i._redirectEventId,c=await this.tryRedirectSignIn(e);(!a||a===u)&&(c!=null&&c.user)&&(i=c.user,s=!0)}if(!i)return this.directlySetCurrentUser(null);if(!i._redirectEventId){if(s)try{await this.beforeStateQueue.runMiddleware(i)}catch(a){i=n,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(a))}return i?this.reloadAndSetCurrentUserOrClear(i):this.directlySetCurrentUser(null)}return q(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===i._redirectEventId?this.directlySetCurrentUser(i):this.reloadAndSetCurrentUserOrClear(i)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await Hi(e)}catch(t){if((t==null?void 0:t.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=Gy()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(He(this.app))return Promise.reject(Et(this));const t=e?Fe(e):null;return t&&q(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&q(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return He(this.app)?Promise.reject(Et(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return He(this.app)?Promise.reject(Et(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(Xe(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await aI(this),t=new cI(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistence(){return this.assertedPersistence.persistence.type}_updateErrorMap(e){this._errorFactory=new Lr("auth","Firebase",e())}onAuthStateChanged(e,t,n){return this.registerStateListener(this.authStateSubscription,e,t,n)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,n){return this.registerStateListener(this.idTokenSubscription,e,t,n)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const n=this.onAuthStateChanged(()=>{n(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),n={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(n.tenantId=this.tenantId),await rI(this,n)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)===null||e===void 0?void 0:e.toJSON()}}async _setRedirectUser(e,t){const n=await this.getOrInitRedirectPersistenceManager(t);return e===null?n.removeCurrentUser():n.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&Xe(e)||this._popupRedirectResolver;q(t,this,"argument-error"),this.redirectPersistenceManager=await In.create(this,[Xe(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var t,n;return this._isInitialized&&await this.queue(async()=>{}),((t=this._currentUser)===null||t===void 0?void 0:t._redirectEventId)===e?this._currentUser:((n=this.redirectUser)===null||n===void 0?void 0:n._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var e,t;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const n=(t=(e=this.currentUser)===null||e===void 0?void 0:e.uid)!==null&&t!==void 0?t:null;this.lastNotifiedUid!==n&&(this.lastNotifiedUid=n,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,n,i){if(this._deleted)return()=>{};const s=typeof t=="function"?t:t.next.bind(t);let a=!1;const u=this._isInitialized?Promise.resolve():this._initializationPromise;if(q(u,this,"internal-error"),u.then(()=>{a||s(this.currentUser)}),typeof t=="function"){const c=e.addObserver(t,n,i);return()=>{a=!0,c()}}else{const c=e.addObserver(t);return()=>{a=!0,c()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return q(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=jd(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var e;const t={"X-Client-Version":this.clientVersion};this.app.options.appId&&(t["X-Firebase-gmpid"]=this.app.options.appId);const n=await((e=this.heartbeatServiceProvider.getImmediate({optional:!0}))===null||e===void 0?void 0:e.getHeartbeatsHeader());n&&(t["X-Firebase-Client"]=n);const i=await this._getAppCheckToken();return i&&(t["X-Firebase-AppCheck"]=i),t}async _getAppCheckToken(){var e;const t=await((e=this.appCheckServiceProvider.getImmediate({optional:!0}))===null||e===void 0?void 0:e.getToken());return t!=null&&t.error&&zy(`Error while retrieving App Check token: ${t.error}`),t==null?void 0:t.token}}function _s(r){return Fe(r)}class Jc{constructor(e){this.auth=e,this.observer=null,this.addObserver=im(t=>this.observer=t)}get next(){return q(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
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
 */let Aa={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function hI(r){Aa=r}function dI(r){return Aa.loadJS(r)}function fI(){return Aa.gapiScript}function mI(r){return`__${r}${Math.floor(Math.random()*1e6)}`}/**
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
 */function pI(r,e){const t=Oo(r,"auth");if(t.isInitialized()){const i=t.getImmediate(),s=t.getOptions();if(Tr(s,e??{}))return i;tt(i,"already-initialized")}return t.initialize({options:e})}function gI(r,e){const t=(e==null?void 0:e.persistence)||[],n=(Array.isArray(t)?t:[t]).map(Xe);e!=null&&e.errorMap&&r._updateErrorMap(e.errorMap),r._initializeWithPersistence(n,e==null?void 0:e.popupRedirectResolver)}function _I(r,e,t){const n=_s(r);q(n._canInitEmulator,n,"emulator-config-failed"),q(/^https?:\/\//.test(e),n,"invalid-emulator-scheme");const i=!1,s=qd(e),{host:a,port:u}=yI(e),c=u===null?"":`:${u}`;n.config.emulator={url:`${s}//${a}${c}/`},n.settings.appVerificationDisabledForTesting=!0,n.emulatorConfig=Object.freeze({host:a,port:u,protocol:s.replace(":",""),options:Object.freeze({disableWarnings:i})}),II()}function qd(r){const e=r.indexOf(":");return e<0?"":r.substr(0,e+1)}function yI(r){const e=qd(r),t=/(\/\/)?([^?#/]+)/.exec(r.substr(e.length));if(!t)return{host:"",port:null};const n=t[2].split("@").pop()||"",i=/^(\[[^\]]+\])(:|$)/.exec(n);if(i){const s=i[1];return{host:s,port:Yc(n.substr(s.length+1))}}else{const[s,a]=n.split(":");return{host:s,port:Yc(a)}}}function Yc(r){if(!r)return null;const e=Number(r);return isNaN(e)?null:e}function II(){function r(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",r):r())}/**
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
 */class zd{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return Je("not implemented")}_getIdTokenResponse(e){return Je("not implemented")}_linkToIdToken(e,t){return Je("not implemented")}_getReauthenticationResolver(e){return Je("not implemented")}}/**
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
 */async function vn(r,e){return Pd(r,"POST","/v1/accounts:signInWithIdp",gs(r,e))}/**
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
 */const vI="http://localhost";class Zt extends zd{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new Zt(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):tt("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:n,signInMethod:i}=t,s=Ia(t,["providerId","signInMethod"]);if(!n||!i)return null;const a=new Zt(n,i);return a.idToken=s.idToken||void 0,a.accessToken=s.accessToken||void 0,a.secret=s.secret,a.nonce=s.nonce,a.pendingToken=s.pendingToken||null,a}_getIdTokenResponse(e){const t=this.buildRequest();return vn(e,t)}_linkToIdToken(e,t){const n=this.buildRequest();return n.idToken=t,vn(e,n)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,vn(e,t)}buildRequest(){const e={requestUri:vI,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=Fr(t)}return e}}/**
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
 */class Kd{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
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
 */class $r extends Kd{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
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
 */class dt extends $r{constructor(){super("facebook.com")}static credential(e){return Zt._fromParams({providerId:dt.PROVIDER_ID,signInMethod:dt.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return dt.credentialFromTaggedObject(e)}static credentialFromError(e){return dt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return dt.credential(e.oauthAccessToken)}catch{return null}}}dt.FACEBOOK_SIGN_IN_METHOD="facebook.com";dt.PROVIDER_ID="facebook.com";/**
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
 */class ft extends $r{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return Zt._fromParams({providerId:ft.PROVIDER_ID,signInMethod:ft.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return ft.credentialFromTaggedObject(e)}static credentialFromError(e){return ft.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:n}=e;if(!t&&!n)return null;try{return ft.credential(t,n)}catch{return null}}}ft.GOOGLE_SIGN_IN_METHOD="google.com";ft.PROVIDER_ID="google.com";/**
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
 */class mt extends $r{constructor(){super("github.com")}static credential(e){return Zt._fromParams({providerId:mt.PROVIDER_ID,signInMethod:mt.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return mt.credentialFromTaggedObject(e)}static credentialFromError(e){return mt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return mt.credential(e.oauthAccessToken)}catch{return null}}}mt.GITHUB_SIGN_IN_METHOD="github.com";mt.PROVIDER_ID="github.com";/**
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
 */class pt extends $r{constructor(){super("twitter.com")}static credential(e,t){return Zt._fromParams({providerId:pt.PROVIDER_ID,signInMethod:pt.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return pt.credentialFromTaggedObject(e)}static credentialFromError(e){return pt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:n}=e;if(!t||!n)return null;try{return pt.credential(t,n)}catch{return null}}}pt.TWITTER_SIGN_IN_METHOD="twitter.com";pt.PROVIDER_ID="twitter.com";/**
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
 */async function TI(r,e){return Pd(r,"POST","/v1/accounts:signUp",gs(r,e))}/**
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
 */class bt{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,n,i=!1){const s=await Ye._fromIdTokenResponse(e,n,i),a=Xc(n);return new bt({user:s,providerId:a,_tokenResponse:n,operationType:t})}static async _forOperation(e,t,n){await e._updateTokensIfNecessary(n,!0);const i=Xc(n);return new bt({user:e,providerId:i,_tokenResponse:n,operationType:t})}}function Xc(r){return r.providerId?r.providerId:"phoneNumber"in r?"phone":null}/**
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
 */async function Hv(r){var e;if(He(r.app))return Promise.reject(Et(r));const t=_s(r);if(await t._initializationPromise,!((e=t.currentUser)===null||e===void 0)&&e.isAnonymous)return new bt({user:t.currentUser,providerId:null,operationType:"signIn"});const n=await TI(t,{returnSecureToken:!0}),i=await bt._fromIdTokenResponse(t,"signIn",n,!0);return await t._updateCurrentUser(i.user),i}/**
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
 */class Qi extends rt{constructor(e,t,n,i){var s;super(t.code,t.message),this.operationType=n,this.user=i,Object.setPrototypeOf(this,Qi.prototype),this.customData={appName:e.name,tenantId:(s=e.tenantId)!==null&&s!==void 0?s:void 0,_serverResponse:t.customData._serverResponse,operationType:n}}static _fromErrorAndOperation(e,t,n,i){return new Qi(e,t,n,i)}}function $d(r,e,t,n){return(e==="reauthenticate"?t._getReauthenticationResolver(r):t._getIdTokenResponse(r)).catch(s=>{throw s.code==="auth/multi-factor-auth-required"?Qi._fromErrorAndOperation(r,s,e,n):s})}async function EI(r,e,t=!1){const n=await Mr(r,e._linkToIdToken(r.auth,await r.getIdToken()),t);return bt._forOperation(r,"link",n)}/**
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
 */async function wI(r,e,t=!1){const{auth:n}=r;if(He(n.app))return Promise.reject(Et(n));const i="reauthenticate";try{const s=await Mr(r,$d(n,i,e,r),t);q(s.idToken,n,"internal-error");const a=Ea(s.idToken);q(a,n,"internal-error");const{sub:u}=a;return q(r.uid===u,n,"user-mismatch"),bt._forOperation(r,i,s)}catch(s){throw(s==null?void 0:s.code)==="auth/user-not-found"&&tt(n,"user-mismatch"),s}}/**
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
 */async function AI(r,e,t=!1){if(He(r.app))return Promise.reject(Et(r));const n="signIn",i=await $d(r,n,e),s=await bt._fromIdTokenResponse(r,n,i);return t||await r._updateCurrentUser(s.user),s}function RI(r,e,t,n){return Fe(r).onIdTokenChanged(e,t,n)}function bI(r,e,t){return Fe(r).beforeAuthStateChanged(e,t)}function Qv(r,e,t,n){return Fe(r).onAuthStateChanged(e,t,n)}const Ji="__sak";/**
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
 */class Gd{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(Ji,"1"),this.storage.removeItem(Ji),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
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
 */const SI=1e3,PI=10;class Wd extends Gd{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=Bd(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const n=this.storage.getItem(t),i=this.localCache[t];n!==i&&e(t,i,n)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((a,u,c)=>{this.notifyListeners(a,c)});return}const n=e.key;t?this.detachListener():this.stopPolling();const i=()=>{const a=this.storage.getItem(n);!t&&this.localCache[n]===a||this.notifyListeners(n,a)},s=this.storage.getItem(n);sI()&&s!==e.newValue&&e.newValue!==e.oldValue?setTimeout(i,PI):i()}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const i of Array.from(n))i(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,n)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:n}),!0)})},SI)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}Wd.type="LOCAL";const CI=Wd;/**
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
 */class Hd extends Gd{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}Hd.type="SESSION";const Qd=Hd;/**
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
 */function VI(r){return Promise.all(r.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
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
 */class ys{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(i=>i.isListeningto(e));if(t)return t;const n=new ys(e);return this.receivers.push(n),n}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:n,eventType:i,data:s}=t.data,a=this.handlersMap[i];if(!(a!=null&&a.size))return;t.ports[0].postMessage({status:"ack",eventId:n,eventType:i});const u=Array.from(a).map(async d=>d(t.origin,s)),c=await VI(u);t.ports[0].postMessage({status:"done",eventId:n,eventType:i,response:c})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}ys.receivers=[];/**
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
 */function Ra(r="",e=10){let t="";for(let n=0;n<e;n++)t+=Math.floor(Math.random()*10);return r+t}/**
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
 */class DI{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,n=50){const i=typeof MessageChannel<"u"?new MessageChannel:null;if(!i)throw new Error("connection_unavailable");let s,a;return new Promise((u,c)=>{const d=Ra("",20);i.port1.start();const m=setTimeout(()=>{c(new Error("unsupported_event"))},n);a={messageChannel:i,onMessage(p){const E=p;if(E.data.eventId===d)switch(E.data.status){case"ack":clearTimeout(m),s=setTimeout(()=>{c(new Error("timeout"))},3e3);break;case"done":clearTimeout(s),u(E.data.response);break;default:clearTimeout(m),clearTimeout(s),c(new Error("invalid_response"));break}}},this.handlers.add(a),i.port1.addEventListener("message",a.onMessage),this.target.postMessage({eventType:e,eventId:d,data:t},[i.port2])}).finally(()=>{a&&this.removeMessageHandler(a)})}}/**
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
 */function ze(){return window}function kI(r){ze().location.href=r}/**
 * @license
 * Copyright 2020 Google LLC.
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
 */function Jd(){return typeof ze().WorkerGlobalScope<"u"&&typeof ze().importScripts=="function"}async function xI(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function NI(){var r;return((r=navigator==null?void 0:navigator.serviceWorker)===null||r===void 0?void 0:r.controller)||null}function OI(){return Jd()?self:null}/**
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
 */const Yd="firebaseLocalStorageDb",MI=1,Yi="firebaseLocalStorage",Xd="fbase_key";class Gr{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function Is(r,e){return r.transaction([Yi],e?"readwrite":"readonly").objectStore(Yi)}function LI(){const r=indexedDB.deleteDatabase(Yd);return new Gr(r).toPromise()}function ko(){const r=indexedDB.open(Yd,MI);return new Promise((e,t)=>{r.addEventListener("error",()=>{t(r.error)}),r.addEventListener("upgradeneeded",()=>{const n=r.result;try{n.createObjectStore(Yi,{keyPath:Xd})}catch(i){t(i)}}),r.addEventListener("success",async()=>{const n=r.result;n.objectStoreNames.contains(Yi)?e(n):(n.close(),await LI(),e(await ko()))})})}async function Zc(r,e,t){const n=Is(r,!0).put({[Xd]:e,value:t});return new Gr(n).toPromise()}async function FI(r,e){const t=Is(r,!1).get(e),n=await new Gr(t).toPromise();return n===void 0?null:n.value}function el(r,e){const t=Is(r,!0).delete(e);return new Gr(t).toPromise()}const UI=800,BI=3;class Zd{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await ko(),this.db)}async _withRetries(e){let t=0;for(;;)try{const n=await this._openDb();return await e(n)}catch(n){if(t++>BI)throw n;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return Jd()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=ys._getInstance(OI()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){var e,t;if(this.activeServiceWorker=await xI(),!this.activeServiceWorker)return;this.sender=new DI(this.activeServiceWorker);const n=await this.sender._send("ping",{},800);n&&!((e=n[0])===null||e===void 0)&&e.fulfilled&&!((t=n[0])===null||t===void 0)&&t.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||NI()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await ko();return await Zc(e,Ji,"1"),await el(e,Ji),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(n=>Zc(n,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(n=>FI(n,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>el(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(i=>{const s=Is(i,!1).getAll();return new Gr(s).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],n=new Set;if(e.length!==0)for(const{fbase_key:i,value:s}of e)n.add(i),JSON.stringify(this.localCache[i])!==JSON.stringify(s)&&(this.notifyListeners(i,s),t.push(i));for(const i of Object.keys(this.localCache))this.localCache[i]&&!n.has(i)&&(this.notifyListeners(i,null),t.push(i));return t}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const i of Array.from(n))i(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),UI)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}Zd.type="LOCAL";const jI=Zd;new Kr(3e4,6e4);/**
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
 */function qI(r,e){return e?Xe(e):(q(r._popupRedirectResolver,r,"argument-error"),r._popupRedirectResolver)}/**
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
 */class ba extends zd{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return vn(e,this._buildIdpRequest())}_linkToIdToken(e,t){return vn(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return vn(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function zI(r){return AI(r.auth,new ba(r),r.bypassAuthState)}function KI(r){const{auth:e,user:t}=r;return q(t,e,"internal-error"),wI(t,new ba(r),r.bypassAuthState)}async function $I(r){const{auth:e,user:t}=r;return q(t,e,"internal-error"),EI(t,new ba(r),r.bypassAuthState)}/**
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
 */class ef{constructor(e,t,n,i,s=!1){this.auth=e,this.resolver=n,this.user=i,this.bypassAuthState=s,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(n){this.reject(n)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:n,postBody:i,tenantId:s,error:a,type:u}=e;if(a){this.reject(a);return}const c={auth:this.auth,requestUri:t,sessionId:n,tenantId:s||void 0,postBody:i||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(u)(c))}catch(d){this.reject(d)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return zI;case"linkViaPopup":case"linkViaRedirect":return $I;case"reauthViaPopup":case"reauthViaRedirect":return KI;default:tt(this.auth,"internal-error")}}resolve(e){nt(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){nt(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
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
 */const GI=new Kr(2e3,1e4);class pn extends ef{constructor(e,t,n,i,s){super(e,t,i,s),this.provider=n,this.authWindow=null,this.pollId=null,pn.currentPopupAction&&pn.currentPopupAction.cancel(),pn.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return q(e,this.auth,"internal-error"),e}async onExecution(){nt(this.filter.length===1,"Popup operations only handle one event");const e=Ra();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(qe(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)===null||e===void 0?void 0:e.associatedEvent)||null}cancel(){this.reject(qe(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,pn.currentPopupAction=null}pollUserCancellation(){const e=()=>{var t,n;if(!((n=(t=this.authWindow)===null||t===void 0?void 0:t.window)===null||n===void 0)&&n.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(qe(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,GI.get())};e()}}pn.currentPopupAction=null;/**
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
 */const WI="pendingRedirect",Vi=new Map;class HI extends ef{constructor(e,t,n=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,n),this.eventId=null}async execute(){let e=Vi.get(this.auth._key());if(!e){try{const n=await QI(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(n)}catch(t){e=()=>Promise.reject(t)}Vi.set(this.auth._key(),e)}return this.bypassAuthState||Vi.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function QI(r,e){const t=XI(e),n=YI(r);if(!await n._isAvailable())return!1;const i=await n._get(t)==="true";return await n._remove(t),i}function JI(r,e){Vi.set(r._key(),e)}function YI(r){return Xe(r._redirectPersistence)}function XI(r){return Ci(WI,r.config.apiKey,r.name)}async function ZI(r,e,t=!1){if(He(r.app))return Promise.reject(Et(r));const n=_s(r),i=qI(n,e),a=await new HI(n,i,t).execute();return a&&!t&&(delete a.user._redirectEventId,await n._persistUserIfCurrent(a.user),await n._setRedirectUser(null,e)),a}/**
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
 */const ev=10*60*1e3;class tv{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(n=>{this.isEventForConsumer(e,n)&&(t=!0,this.sendToConsumer(e,n),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!nv(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){var n;if(e.error&&!tf(e)){const i=((n=e.error.code)===null||n===void 0?void 0:n.split("auth/")[1])||"internal-error";t.onError(qe(this.auth,i))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const n=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&n}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=ev&&this.cachedEventUids.clear(),this.cachedEventUids.has(tl(e))}saveEventToCache(e){this.cachedEventUids.add(tl(e)),this.lastProcessedEventTime=Date.now()}}function tl(r){return[r.type,r.eventId,r.sessionId,r.tenantId].filter(e=>e).join("-")}function tf({type:r,error:e}){return r==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function nv(r){switch(r.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return tf(r);default:return!1}}/**
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
 */async function rv(r,e={}){return Bn(r,"GET","/v1/projects",e)}/**
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
 */const iv=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,sv=/^https?/;async function ov(r){if(r.config.emulator)return;const{authorizedDomains:e}=await rv(r);for(const t of e)try{if(av(t))return}catch{}tt(r,"unauthorized-domain")}function av(r){const e=Vo(),{protocol:t,hostname:n}=new URL(e);if(r.startsWith("chrome-extension://")){const a=new URL(r);return a.hostname===""&&n===""?t==="chrome-extension:"&&r.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&a.hostname===n}if(!sv.test(t))return!1;if(iv.test(r))return n===r;const i=r.replace(/\./g,"\\.");return new RegExp("^(.+\\."+i+"|"+i+")$","i").test(n)}/**
 * @license
 * Copyright 2020 Google LLC.
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
 */const uv=new Kr(3e4,6e4);function nl(){const r=ze().___jsl;if(r!=null&&r.H){for(const e of Object.keys(r.H))if(r.H[e].r=r.H[e].r||[],r.H[e].L=r.H[e].L||[],r.H[e].r=[...r.H[e].L],r.CP)for(let t=0;t<r.CP.length;t++)r.CP[t]=null}}function cv(r){return new Promise((e,t)=>{var n,i,s;function a(){nl(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{nl(),t(qe(r,"network-request-failed"))},timeout:uv.get()})}if(!((i=(n=ze().gapi)===null||n===void 0?void 0:n.iframes)===null||i===void 0)&&i.Iframe)e(gapi.iframes.getContext());else if(!((s=ze().gapi)===null||s===void 0)&&s.load)a();else{const u=mI("iframefcb");return ze()[u]=()=>{gapi.load?a():t(qe(r,"network-request-failed"))},dI(`${fI()}?onload=${u}`).catch(c=>t(c))}}).catch(e=>{throw Di=null,e})}let Di=null;function lv(r){return Di=Di||cv(r),Di}/**
 * @license
 * Copyright 2020 Google LLC.
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
 */const hv=new Kr(5e3,15e3),dv="__/auth/iframe",fv="emulator/auth/iframe",mv={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},pv=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function gv(r){const e=r.config;q(e.authDomain,r,"auth-domain-config-required");const t=e.emulator?Ta(e,fv):`https://${r.config.authDomain}/${dv}`,n={apiKey:e.apiKey,appName:r.name,v:Nn},i=pv.get(r.config.apiHost);i&&(n.eid=i);const s=r._getFrameworks();return s.length&&(n.fw=s.join(",")),`${t}?${Fr(n).slice(1)}`}async function _v(r){const e=await lv(r),t=ze().gapi;return q(t,r,"internal-error"),e.open({where:document.body,url:gv(r),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:mv,dontclear:!0},n=>new Promise(async(i,s)=>{await n.restyle({setHideOnLeave:!1});const a=qe(r,"network-request-failed"),u=ze().setTimeout(()=>{s(a)},hv.get());function c(){ze().clearTimeout(u),i(n)}n.ping(c).then(c,()=>{s(a)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
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
 */const yv={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},Iv=500,vv=600,Tv="_blank",Ev="http://localhost";class rl{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function wv(r,e,t,n=Iv,i=vv){const s=Math.max((window.screen.availHeight-i)/2,0).toString(),a=Math.max((window.screen.availWidth-n)/2,0).toString();let u="";const c=Object.assign(Object.assign({},yv),{width:n.toString(),height:i.toString(),top:s,left:a}),d=fe().toLowerCase();t&&(u=Od(d)?Tv:t),xd(d)&&(e=e||Ev,c.scrollbars="yes");const m=Object.entries(c).reduce((E,[S,V])=>`${E}${S}=${V},`,"");if(iI(d)&&u!=="_self")return Av(e||"",u),new rl(null);const p=window.open(e||"",u,m);q(p,r,"popup-blocked");try{p.focus()}catch{}return new rl(p)}function Av(r,e){const t=document.createElement("a");t.href=r,t.target=e;const n=document.createEvent("MouseEvent");n.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(n)}/**
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
 */const Rv="__/auth/handler",bv="emulator/auth/handler",Sv=encodeURIComponent("fac");async function il(r,e,t,n,i,s){q(r.config.authDomain,r,"auth-domain-config-required"),q(r.config.apiKey,r,"invalid-api-key");const a={apiKey:r.config.apiKey,appName:r.name,authType:t,redirectUrl:n,v:Nn,eventId:i};if(e instanceof Kd){e.setDefaultLanguage(r.languageCode),a.providerId=e.providerId||"",rm(e.getCustomParameters())||(a.customParameters=JSON.stringify(e.getCustomParameters()));for(const[m,p]of Object.entries({}))a[m]=p}if(e instanceof $r){const m=e.getScopes().filter(p=>p!=="");m.length>0&&(a.scopes=m.join(","))}r.tenantId&&(a.tid=r.tenantId);const u=a;for(const m of Object.keys(u))u[m]===void 0&&delete u[m];const c=await r._getAppCheckToken(),d=c?`#${Sv}=${encodeURIComponent(c)}`:"";return`${Pv(r)}?${Fr(u).slice(1)}${d}`}function Pv({config:r}){return r.emulator?Ta(r,bv):`https://${r.authDomain}/${Rv}`}/**
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
 */const no="webStorageSupport";class Cv{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=Qd,this._completeRedirectFn=ZI,this._overrideRedirectResult=JI}async _openPopup(e,t,n,i){var s;nt((s=this.eventManagers[e._key()])===null||s===void 0?void 0:s.manager,"_initialize() not called before _openPopup()");const a=await il(e,t,n,Vo(),i);return wv(e,a,Ra())}async _openRedirect(e,t,n,i){await this._originValidation(e);const s=await il(e,t,n,Vo(),i);return kI(s),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:i,promise:s}=this.eventManagers[t];return i?Promise.resolve(i):(nt(s,"If manager is not set, promise should be"),s)}const n=this.initAndGetManager(e);return this.eventManagers[t]={promise:n},n.catch(()=>{delete this.eventManagers[t]}),n}async initAndGetManager(e){const t=await _v(e),n=new tv(e);return t.register("authEvent",i=>(q(i==null?void 0:i.authEvent,e,"invalid-auth-event"),{status:n.onEvent(i.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:n},this.iframes[e._key()]=t,n}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(no,{type:no},i=>{var s;const a=(s=i==null?void 0:i[0])===null||s===void 0?void 0:s[no];a!==void 0&&t(!!a),tt(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=ov(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return Bd()||Nd()||wa()}}const Vv=Cv;var sl="@firebase/auth",ol="1.7.9";/**
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
 */class Dv{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)===null||e===void 0?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(n=>{e((n==null?void 0:n.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){q(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
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
 */function kv(r){switch(r){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function xv(r){Tn(new $t("auth",(e,{options:t})=>{const n=e.getProvider("app").getImmediate(),i=e.getProvider("heartbeat"),s=e.getProvider("app-check-internal"),{apiKey:a,authDomain:u}=n.options;q(a&&!a.includes(":"),"invalid-api-key",{appName:n.name});const c={apiKey:a,authDomain:u,clientPlatform:r,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:jd(r)},d=new lI(n,i,s,c);return gI(d,t),d},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,n)=>{e.getProvider("auth-internal").initialize()})),Tn(new $t("auth-internal",e=>{const t=_s(e.getProvider("auth").getImmediate());return(n=>new Dv(n))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),It(sl,ol,kv(r)),It(sl,ol,"esm2017")}/**
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
 */const Nv=5*60,Ov=fl("authIdTokenMaxAge")||Nv;let al=null;const Mv=r=>async e=>{const t=e&&await e.getIdTokenResult(),n=t&&(new Date().getTime()-Date.parse(t.issuedAtTime))/1e3;if(n&&n>Ov)return;const i=t==null?void 0:t.token;al!==i&&(al=i,await fetch(r,{method:i?"POST":"DELETE",headers:i?{Authorization:`Bearer ${i}`}:{}}))};function Jv(r=op()){const e=Oo(r,"auth");if(e.isInitialized())return e.getImmediate();const t=pI(r,{popupRedirectResolver:Vv,persistence:[jI,CI,Qd]}),n=fl("authTokenSyncURL");if(n&&typeof isSecureContext=="boolean"&&isSecureContext){const s=new URL(n,location.origin);if(location.origin===s.origin){const a=Mv(s.toString());bI(t,a,()=>a(t.currentUser)),RI(t,u=>a(u))}}const i=$f("auth");return i&&_I(t,`http://${i}`),t}function Lv(){var r,e;return(e=(r=document.getElementsByTagName("head"))===null||r===void 0?void 0:r[0])!==null&&e!==void 0?e:document}hI({loadJS(r){return new Promise((e,t)=>{const n=document.createElement("script");n.setAttribute("src",r),n.onload=e,n.onerror=i=>{const s=qe("internal-error");s.customData=i,t(s)},n.type="text/javascript",n.charset="UTF-8",Lv().appendChild(n)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});xv("Browser");export{jv as a,qv as b,$v as c,Kv as d,Wv as e,Hv as f,Jv as g,sp as i,Qv as o,Gv as p,zv as s};
