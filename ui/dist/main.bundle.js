var sf=Object.create;var _c=Object.defineProperty;var af=Object.getOwnPropertyDescriptor;var rf=Object.getOwnPropertyNames;var lf=Object.getPrototypeOf,of=Object.prototype.hasOwnProperty;var Cn=(e,t)=>()=>{try{return t||e((t={exports:{}}).exports,t),t.exports}catch(n){throw t=0,n}};var cf=(e,t,n,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let i of rf(t))!of.call(e,i)&&i!==n&&_c(e,i,{get:()=>t[i],enumerable:!(s=af(t,i))||s.enumerable});return e};var Ar=(e,t,n)=>(n=e!=null?sf(lf(e)):{},cf(t||!e||!e.__esModule?_c(n,"default",{value:e,enumerable:!0}):n,e));var Mc=Cn(ae=>{"use strict";var Ms=Symbol.for("react.element"),uf=Symbol.for("react.portal"),df=Symbol.for("react.fragment"),pf=Symbol.for("react.strict_mode"),mf=Symbol.for("react.profiler"),ff=Symbol.for("react.provider"),vf=Symbol.for("react.context"),yf=Symbol.for("react.forward_ref"),hf=Symbol.for("react.suspense"),gf=Symbol.for("react.memo"),$f=Symbol.for("react.lazy"),Sc=Symbol.iterator;function Nf(e){return e===null||typeof e!="object"?null:(e=Sc&&e[Sc]||e["@@iterator"],typeof e=="function"?e:null)}var Tc={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},Ac=Object.assign,xc={};function Jn(e,t,n){this.props=e,this.context=t,this.refs=xc,this.updater=n||Tc}Jn.prototype.isReactComponent={};Jn.prototype.setState=function(e,t){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,t,"setState")};Jn.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function Dc(){}Dc.prototype=Jn.prototype;function Dr(e,t,n){this.props=e,this.context=t,this.refs=xc,this.updater=n||Tc}var Rr=Dr.prototype=new Dc;Rr.constructor=Dr;Ac(Rr,Jn.prototype);Rr.isPureReactComponent=!0;var Ec=Array.isArray,Rc=Object.prototype.hasOwnProperty,Ir={current:null},Ic={key:!0,ref:!0,__self:!0,__source:!0};function Lc(e,t,n){var s,i={},a=null,r=null;if(t!=null)for(s in t.ref!==void 0&&(r=t.ref),t.key!==void 0&&(a=""+t.key),t)Rc.call(t,s)&&!Ic.hasOwnProperty(s)&&(i[s]=t[s]);var l=arguments.length-2;if(l===1)i.children=n;else if(1<l){for(var u=Array(l),c=0;c<l;c++)u[c]=arguments[c+2];i.children=u}if(e&&e.defaultProps)for(s in l=e.defaultProps,l)i[s]===void 0&&(i[s]=l[s]);return{$$typeof:Ms,type:e,key:a,ref:r,props:i,_owner:Ir.current}}function wf(e,t){return{$$typeof:Ms,type:e.type,key:t,ref:e.ref,props:e.props,_owner:e._owner}}function Lr(e){return typeof e=="object"&&e!==null&&e.$$typeof===Ms}function bf(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(n){return t[n]})}var Cc=/\/+/g;function xr(e,t){return typeof e=="object"&&e!==null&&e.key!=null?bf(""+e.key):t.toString(36)}function Hi(e,t,n,s,i){var a=typeof e;(a==="undefined"||a==="boolean")&&(e=null);var r=!1;if(e===null)r=!0;else switch(a){case"string":case"number":r=!0;break;case"object":switch(e.$$typeof){case Ms:case uf:r=!0}}if(r)return r=e,i=i(r),e=s===""?"."+xr(r,0):s,Ec(i)?(n="",e!=null&&(n=e.replace(Cc,"$&/")+"/"),Hi(i,t,n,"",function(c){return c})):i!=null&&(Lr(i)&&(i=wf(i,n+(!i.key||r&&r.key===i.key?"":(""+i.key).replace(Cc,"$&/")+"/")+e)),t.push(i)),1;if(r=0,s=s===""?".":s+":",Ec(e))for(var l=0;l<e.length;l++){a=e[l];var u=s+xr(a,l);r+=Hi(a,t,n,u,i)}else if(u=Nf(e),typeof u=="function")for(e=u.call(e),l=0;!(a=e.next()).done;)a=a.value,u=s+xr(a,l++),r+=Hi(a,t,n,u,i);else if(a==="object")throw t=String(e),Error("Objects are not valid as a React child (found: "+(t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t)+"). If you meant to render a collection of children, use an array instead.");return r}function zi(e,t,n){if(e==null)return e;var s=[],i=0;return Hi(e,s,"","",function(a){return t.call(n,a,i++)}),s}function kf(e){if(e._status===-1){var t=e._result;t=t(),t.then(function(n){(e._status===0||e._status===-1)&&(e._status=1,e._result=n)},function(n){(e._status===0||e._status===-1)&&(e._status=2,e._result=n)}),e._status===-1&&(e._status=0,e._result=t)}if(e._status===1)return e._result.default;throw e._result}var je={current:null},Fi={transition:null},_f={ReactCurrentDispatcher:je,ReactCurrentBatchConfig:Fi,ReactCurrentOwner:Ir};function Pc(){throw Error("act(...) is not supported in production builds of React.")}ae.Children={map:zi,forEach:function(e,t,n){zi(e,function(){t.apply(this,arguments)},n)},count:function(e){var t=0;return zi(e,function(){t++}),t},toArray:function(e){return zi(e,function(t){return t})||[]},only:function(e){if(!Lr(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};ae.Component=Jn;ae.Fragment=df;ae.Profiler=mf;ae.PureComponent=Dr;ae.StrictMode=pf;ae.Suspense=hf;ae.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=_f;ae.act=Pc;ae.cloneElement=function(e,t,n){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var s=Ac({},e.props),i=e.key,a=e.ref,r=e._owner;if(t!=null){if(t.ref!==void 0&&(a=t.ref,r=Ir.current),t.key!==void 0&&(i=""+t.key),e.type&&e.type.defaultProps)var l=e.type.defaultProps;for(u in t)Rc.call(t,u)&&!Ic.hasOwnProperty(u)&&(s[u]=t[u]===void 0&&l!==void 0?l[u]:t[u])}var u=arguments.length-2;if(u===1)s.children=n;else if(1<u){l=Array(u);for(var c=0;c<u;c++)l[c]=arguments[c+2];s.children=l}return{$$typeof:Ms,type:e.type,key:i,ref:a,props:s,_owner:r}};ae.createContext=function(e){return e={$$typeof:vf,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:ff,_context:e},e.Consumer=e};ae.createElement=Lc;ae.createFactory=function(e){var t=Lc.bind(null,e);return t.type=e,t};ae.createRef=function(){return{current:null}};ae.forwardRef=function(e){return{$$typeof:yf,render:e}};ae.isValidElement=Lr;ae.lazy=function(e){return{$$typeof:$f,_payload:{_status:-1,_result:e},_init:kf}};ae.memo=function(e,t){return{$$typeof:gf,type:e,compare:t===void 0?null:t}};ae.startTransition=function(e){var t=Fi.transition;Fi.transition={};try{e()}finally{Fi.transition=t}};ae.unstable_act=Pc;ae.useCallback=function(e,t){return je.current.useCallback(e,t)};ae.useContext=function(e){return je.current.useContext(e)};ae.useDebugValue=function(){};ae.useDeferredValue=function(e){return je.current.useDeferredValue(e)};ae.useEffect=function(e,t){return je.current.useEffect(e,t)};ae.useId=function(){return je.current.useId()};ae.useImperativeHandle=function(e,t,n){return je.current.useImperativeHandle(e,t,n)};ae.useInsertionEffect=function(e,t){return je.current.useInsertionEffect(e,t)};ae.useLayoutEffect=function(e,t){return je.current.useLayoutEffect(e,t)};ae.useMemo=function(e,t){return je.current.useMemo(e,t)};ae.useReducer=function(e,t,n){return je.current.useReducer(e,t,n)};ae.useRef=function(e){return je.current.useRef(e)};ae.useState=function(e){return je.current.useState(e)};ae.useSyncExternalStore=function(e,t,n){return je.current.useSyncExternalStore(e,t,n)};ae.useTransition=function(){return je.current.useTransition()};ae.version="18.3.1"});var qi=Cn((lg,Oc)=>{"use strict";Oc.exports=Mc()});var Wc=Cn(fe=>{"use strict";function Ur(e,t){var n=e.length;e.push(t);e:for(;0<n;){var s=n-1>>>1,i=e[s];if(0<Gi(i,t))e[s]=t,e[n]=i,n=s;else break e}}function kt(e){return e.length===0?null:e[0]}function Wi(e){if(e.length===0)return null;var t=e[0],n=e.pop();if(n!==t){e[0]=n;e:for(var s=0,i=e.length,a=i>>>1;s<a;){var r=2*(s+1)-1,l=e[r],u=r+1,c=e[u];if(0>Gi(l,n))u<i&&0>Gi(c,l)?(e[s]=c,e[u]=n,s=u):(e[s]=l,e[r]=n,s=r);else if(u<i&&0>Gi(c,n))e[s]=c,e[u]=n,s=u;else break e}}return t}function Gi(e,t){var n=e.sortIndex-t.sortIndex;return n!==0?n:e.id-t.id}typeof performance=="object"&&typeof performance.now=="function"?(Uc=performance,fe.unstable_now=function(){return Uc.now()}):(Pr=Date,Bc=Pr.now(),fe.unstable_now=function(){return Pr.now()-Bc});var Uc,Pr,Bc,Lt=[],sn=[],Sf=1,ft=null,Be=3,ji=!1,Tn=!1,Us=!1,Hc=typeof setTimeout=="function"?setTimeout:null,Fc=typeof clearTimeout=="function"?clearTimeout:null,Kc=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function Br(e){for(var t=kt(sn);t!==null;){if(t.callback===null)Wi(sn);else if(t.startTime<=e)Wi(sn),t.sortIndex=t.expirationTime,Ur(Lt,t);else break;t=kt(sn)}}function Kr(e){if(Us=!1,Br(e),!Tn)if(kt(Lt)!==null)Tn=!0,Hr(zr);else{var t=kt(sn);t!==null&&Fr(Kr,t.startTime-e)}}function zr(e,t){Tn=!1,Us&&(Us=!1,Fc(Bs),Bs=-1),ji=!0;var n=Be;try{for(Br(t),ft=kt(Lt);ft!==null&&(!(ft.expirationTime>t)||e&&!Vc());){var s=ft.callback;if(typeof s=="function"){ft.callback=null,Be=ft.priorityLevel;var i=s(ft.expirationTime<=t);t=fe.unstable_now(),typeof i=="function"?ft.callback=i:ft===kt(Lt)&&Wi(Lt),Br(t)}else Wi(Lt);ft=kt(Lt)}if(ft!==null)var a=!0;else{var r=kt(sn);r!==null&&Fr(Kr,r.startTime-t),a=!1}return a}finally{ft=null,Be=n,ji=!1}}var Yi=!1,Vi=null,Bs=-1,qc=5,Gc=-1;function Vc(){return!(fe.unstable_now()-Gc<qc)}function Mr(){if(Vi!==null){var e=fe.unstable_now();Gc=e;var t=!0;try{t=Vi(!0,e)}finally{t?Os():(Yi=!1,Vi=null)}}else Yi=!1}var Os;typeof Kc=="function"?Os=function(){Kc(Mr)}:typeof MessageChannel<"u"?(Or=new MessageChannel,zc=Or.port2,Or.port1.onmessage=Mr,Os=function(){zc.postMessage(null)}):Os=function(){Hc(Mr,0)};var Or,zc;function Hr(e){Vi=e,Yi||(Yi=!0,Os())}function Fr(e,t){Bs=Hc(function(){e(fe.unstable_now())},t)}fe.unstable_IdlePriority=5;fe.unstable_ImmediatePriority=1;fe.unstable_LowPriority=4;fe.unstable_NormalPriority=3;fe.unstable_Profiling=null;fe.unstable_UserBlockingPriority=2;fe.unstable_cancelCallback=function(e){e.callback=null};fe.unstable_continueExecution=function(){Tn||ji||(Tn=!0,Hr(zr))};fe.unstable_forceFrameRate=function(e){0>e||125<e?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):qc=0<e?Math.floor(1e3/e):5};fe.unstable_getCurrentPriorityLevel=function(){return Be};fe.unstable_getFirstCallbackNode=function(){return kt(Lt)};fe.unstable_next=function(e){switch(Be){case 1:case 2:case 3:var t=3;break;default:t=Be}var n=Be;Be=t;try{return e()}finally{Be=n}};fe.unstable_pauseExecution=function(){};fe.unstable_requestPaint=function(){};fe.unstable_runWithPriority=function(e,t){switch(e){case 1:case 2:case 3:case 4:case 5:break;default:e=3}var n=Be;Be=e;try{return t()}finally{Be=n}};fe.unstable_scheduleCallback=function(e,t,n){var s=fe.unstable_now();switch(typeof n=="object"&&n!==null?(n=n.delay,n=typeof n=="number"&&0<n?s+n:s):n=s,e){case 1:var i=-1;break;case 2:i=250;break;case 5:i=1073741823;break;case 4:i=1e4;break;default:i=5e3}return i=n+i,e={id:Sf++,callback:t,priorityLevel:e,startTime:n,expirationTime:i,sortIndex:-1},n>s?(e.sortIndex=n,Ur(sn,e),kt(Lt)===null&&e===kt(sn)&&(Us?(Fc(Bs),Bs=-1):Us=!0,Fr(Kr,n-s))):(e.sortIndex=i,Ur(Lt,e),Tn||ji||(Tn=!0,Hr(zr))),e};fe.unstable_shouldYield=Vc;fe.unstable_wrapCallback=function(e){var t=Be;return function(){var n=Be;Be=t;try{return e.apply(this,arguments)}finally{Be=n}}}});var Yc=Cn((cg,jc)=>{"use strict";jc.exports=Wc()});var Zp=Cn(pt=>{"use strict";var Ef=qi(),ut=Yc();function z(e){for(var t="https://reactjs.org/docs/error-decoder.html?invariant="+e,n=1;n<arguments.length;n++)t+="&args[]="+encodeURIComponent(arguments[n]);return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var nd=new Set,li={};function zn(e,t){$s(e,t),$s(e+"Capture",t)}function $s(e,t){for(li[e]=t,e=0;e<t.length;e++)nd.add(t[e])}var Yt=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),pl=Object.prototype.hasOwnProperty,Cf=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,Qc={},Xc={};function Tf(e){return pl.call(Xc,e)?!0:pl.call(Qc,e)?!1:Cf.test(e)?Xc[e]=!0:(Qc[e]=!0,!1)}function Af(e,t,n,s){if(n!==null&&n.type===0)return!1;switch(typeof t){case"function":case"symbol":return!0;case"boolean":return s?!1:n!==null?!n.acceptsBooleans:(e=e.toLowerCase().slice(0,5),e!=="data-"&&e!=="aria-");default:return!1}}function xf(e,t,n,s){if(t===null||typeof t>"u"||Af(e,t,n,s))return!0;if(s)return!1;if(n!==null)switch(n.type){case 3:return!t;case 4:return t===!1;case 5:return isNaN(t);case 6:return isNaN(t)||1>t}return!1}function Xe(e,t,n,s,i,a,r){this.acceptsBooleans=t===2||t===3||t===4,this.attributeName=s,this.attributeNamespace=i,this.mustUseProperty=n,this.propertyName=e,this.type=t,this.sanitizeURL=a,this.removeEmptyString=r}var Oe={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e){Oe[e]=new Xe(e,0,!1,e,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(e){var t=e[0];Oe[t]=new Xe(t,1,!1,e[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(e){Oe[e]=new Xe(e,2,!1,e.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(e){Oe[e]=new Xe(e,2,!1,e,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e){Oe[e]=new Xe(e,3,!1,e.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(e){Oe[e]=new Xe(e,3,!0,e,null,!1,!1)});["capture","download"].forEach(function(e){Oe[e]=new Xe(e,4,!1,e,null,!1,!1)});["cols","rows","size","span"].forEach(function(e){Oe[e]=new Xe(e,6,!1,e,null,!1,!1)});["rowSpan","start"].forEach(function(e){Oe[e]=new Xe(e,5,!1,e.toLowerCase(),null,!1,!1)});var io=/[\-:]([a-z])/g;function ao(e){return e[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e){var t=e.replace(io,ao);Oe[t]=new Xe(t,1,!1,e,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e){var t=e.replace(io,ao);Oe[t]=new Xe(t,1,!1,e,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(e){var t=e.replace(io,ao);Oe[t]=new Xe(t,1,!1,e,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(e){Oe[e]=new Xe(e,1,!1,e.toLowerCase(),null,!1,!1)});Oe.xlinkHref=new Xe("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(e){Oe[e]=new Xe(e,1,!1,e.toLowerCase(),null,!0,!0)});function ro(e,t,n,s){var i=Oe.hasOwnProperty(t)?Oe[t]:null;(i!==null?i.type!==0:s||!(2<t.length)||t[0]!=="o"&&t[0]!=="O"||t[1]!=="n"&&t[1]!=="N")&&(xf(t,n,i,s)&&(n=null),s||i===null?Tf(t)&&(n===null?e.removeAttribute(t):e.setAttribute(t,""+n)):i.mustUseProperty?e[i.propertyName]=n===null?i.type===3?!1:"":n:(t=i.attributeName,s=i.attributeNamespace,n===null?e.removeAttribute(t):(i=i.type,n=i===3||i===4&&n===!0?"":""+n,s?e.setAttributeNS(s,t,n):e.setAttribute(t,n))))}var Zt=Ef.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,Qi=Symbol.for("react.element"),ts=Symbol.for("react.portal"),ns=Symbol.for("react.fragment"),lo=Symbol.for("react.strict_mode"),ml=Symbol.for("react.profiler"),sd=Symbol.for("react.provider"),id=Symbol.for("react.context"),oo=Symbol.for("react.forward_ref"),fl=Symbol.for("react.suspense"),vl=Symbol.for("react.suspense_list"),co=Symbol.for("react.memo"),rn=Symbol.for("react.lazy"),ad=Symbol.for("react.offscreen"),Jc=Symbol.iterator;function Ks(e){return e===null||typeof e!="object"?null:(e=Jc&&e[Jc]||e["@@iterator"],typeof e=="function"?e:null)}var Se=Object.assign,qr;function js(e){if(qr===void 0)try{throw Error()}catch(n){var t=n.stack.trim().match(/\n( *(at )?)/);qr=t&&t[1]||""}return`
`+qr+e}var Gr=!1;function Vr(e,t){if(!e||Gr)return"";Gr=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(t)if(t=function(){throw Error()},Object.defineProperty(t.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(t,[])}catch(c){var s=c}Reflect.construct(e,[],t)}else{try{t.call()}catch(c){s=c}e.call(t.prototype)}else{try{throw Error()}catch(c){s=c}e()}}catch(c){if(c&&s&&typeof c.stack=="string"){for(var i=c.stack.split(`
`),a=s.stack.split(`
`),r=i.length-1,l=a.length-1;1<=r&&0<=l&&i[r]!==a[l];)l--;for(;1<=r&&0<=l;r--,l--)if(i[r]!==a[l]){if(r!==1||l!==1)do if(r--,l--,0>l||i[r]!==a[l]){var u=`
`+i[r].replace(" at new "," at ");return e.displayName&&u.includes("<anonymous>")&&(u=u.replace("<anonymous>",e.displayName)),u}while(1<=r&&0<=l);break}}}finally{Gr=!1,Error.prepareStackTrace=n}return(e=e?e.displayName||e.name:"")?js(e):""}function Df(e){switch(e.tag){case 5:return js(e.type);case 16:return js("Lazy");case 13:return js("Suspense");case 19:return js("SuspenseList");case 0:case 2:case 15:return e=Vr(e.type,!1),e;case 11:return e=Vr(e.type.render,!1),e;case 1:return e=Vr(e.type,!0),e;default:return""}}function yl(e){if(e==null)return null;if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case ns:return"Fragment";case ts:return"Portal";case ml:return"Profiler";case lo:return"StrictMode";case fl:return"Suspense";case vl:return"SuspenseList"}if(typeof e=="object")switch(e.$$typeof){case id:return(e.displayName||"Context")+".Consumer";case sd:return(e._context.displayName||"Context")+".Provider";case oo:var t=e.render;return e=e.displayName,e||(e=t.displayName||t.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case co:return t=e.displayName||null,t!==null?t:yl(e.type)||"Memo";case rn:t=e._payload,e=e._init;try{return yl(e(t))}catch{}}return null}function Rf(e){var t=e.type;switch(e.tag){case 24:return"Cache";case 9:return(t.displayName||"Context")+".Consumer";case 10:return(t._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return e=t.render,e=e.displayName||e.name||"",t.displayName||(e!==""?"ForwardRef("+e+")":"ForwardRef");case 7:return"Fragment";case 5:return t;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return yl(t);case 8:return t===lo?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t}return null}function Nn(e){switch(typeof e){case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function rd(e){var t=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(t==="checkbox"||t==="radio")}function If(e){var t=rd(e)?"checked":"value",n=Object.getOwnPropertyDescriptor(e.constructor.prototype,t),s=""+e[t];if(!e.hasOwnProperty(t)&&typeof n<"u"&&typeof n.get=="function"&&typeof n.set=="function"){var i=n.get,a=n.set;return Object.defineProperty(e,t,{configurable:!0,get:function(){return i.call(this)},set:function(r){s=""+r,a.call(this,r)}}),Object.defineProperty(e,t,{enumerable:n.enumerable}),{getValue:function(){return s},setValue:function(r){s=""+r},stopTracking:function(){e._valueTracker=null,delete e[t]}}}}function Xi(e){e._valueTracker||(e._valueTracker=If(e))}function ld(e){if(!e)return!1;var t=e._valueTracker;if(!t)return!0;var n=t.getValue(),s="";return e&&(s=rd(e)?e.checked?"true":"false":e.value),e=s,e!==n?(t.setValue(e),!0):!1}function Sa(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}function hl(e,t){var n=t.checked;return Se({},t,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:n??e._wrapperState.initialChecked})}function Zc(e,t){var n=t.defaultValue==null?"":t.defaultValue,s=t.checked!=null?t.checked:t.defaultChecked;n=Nn(t.value!=null?t.value:n),e._wrapperState={initialChecked:s,initialValue:n,controlled:t.type==="checkbox"||t.type==="radio"?t.checked!=null:t.value!=null}}function od(e,t){t=t.checked,t!=null&&ro(e,"checked",t,!1)}function gl(e,t){od(e,t);var n=Nn(t.value),s=t.type;if(n!=null)s==="number"?(n===0&&e.value===""||e.value!=n)&&(e.value=""+n):e.value!==""+n&&(e.value=""+n);else if(s==="submit"||s==="reset"){e.removeAttribute("value");return}t.hasOwnProperty("value")?$l(e,t.type,n):t.hasOwnProperty("defaultValue")&&$l(e,t.type,Nn(t.defaultValue)),t.checked==null&&t.defaultChecked!=null&&(e.defaultChecked=!!t.defaultChecked)}function eu(e,t,n){if(t.hasOwnProperty("value")||t.hasOwnProperty("defaultValue")){var s=t.type;if(!(s!=="submit"&&s!=="reset"||t.value!==void 0&&t.value!==null))return;t=""+e._wrapperState.initialValue,n||t===e.value||(e.value=t),e.defaultValue=t}n=e.name,n!==""&&(e.name=""),e.defaultChecked=!!e._wrapperState.initialChecked,n!==""&&(e.name=n)}function $l(e,t,n){(t!=="number"||Sa(e.ownerDocument)!==e)&&(n==null?e.defaultValue=""+e._wrapperState.initialValue:e.defaultValue!==""+n&&(e.defaultValue=""+n))}var Ys=Array.isArray;function ms(e,t,n,s){if(e=e.options,t){t={};for(var i=0;i<n.length;i++)t["$"+n[i]]=!0;for(n=0;n<e.length;n++)i=t.hasOwnProperty("$"+e[n].value),e[n].selected!==i&&(e[n].selected=i),i&&s&&(e[n].defaultSelected=!0)}else{for(n=""+Nn(n),t=null,i=0;i<e.length;i++){if(e[i].value===n){e[i].selected=!0,s&&(e[i].defaultSelected=!0);return}t!==null||e[i].disabled||(t=e[i])}t!==null&&(t.selected=!0)}}function Nl(e,t){if(t.dangerouslySetInnerHTML!=null)throw Error(z(91));return Se({},t,{value:void 0,defaultValue:void 0,children:""+e._wrapperState.initialValue})}function tu(e,t){var n=t.value;if(n==null){if(n=t.children,t=t.defaultValue,n!=null){if(t!=null)throw Error(z(92));if(Ys(n)){if(1<n.length)throw Error(z(93));n=n[0]}t=n}t==null&&(t=""),n=t}e._wrapperState={initialValue:Nn(n)}}function cd(e,t){var n=Nn(t.value),s=Nn(t.defaultValue);n!=null&&(n=""+n,n!==e.value&&(e.value=n),t.defaultValue==null&&e.defaultValue!==n&&(e.defaultValue=n)),s!=null&&(e.defaultValue=""+s)}function nu(e){var t=e.textContent;t===e._wrapperState.initialValue&&t!==""&&t!==null&&(e.value=t)}function ud(e){switch(e){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function wl(e,t){return e==null||e==="http://www.w3.org/1999/xhtml"?ud(t):e==="http://www.w3.org/2000/svg"&&t==="foreignObject"?"http://www.w3.org/1999/xhtml":e}var Ji,dd=(function(e){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(t,n,s,i){MSApp.execUnsafeLocalFunction(function(){return e(t,n,s,i)})}:e})(function(e,t){if(e.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in e)e.innerHTML=t;else{for(Ji=Ji||document.createElement("div"),Ji.innerHTML="<svg>"+t.valueOf().toString()+"</svg>",t=Ji.firstChild;e.firstChild;)e.removeChild(e.firstChild);for(;t.firstChild;)e.appendChild(t.firstChild)}});function oi(e,t){if(t){var n=e.firstChild;if(n&&n===e.lastChild&&n.nodeType===3){n.nodeValue=t;return}}e.textContent=t}var Js={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},Lf=["Webkit","ms","Moz","O"];Object.keys(Js).forEach(function(e){Lf.forEach(function(t){t=t+e.charAt(0).toUpperCase()+e.substring(1),Js[t]=Js[e]})});function pd(e,t,n){return t==null||typeof t=="boolean"||t===""?"":n||typeof t!="number"||t===0||Js.hasOwnProperty(e)&&Js[e]?(""+t).trim():t+"px"}function md(e,t){e=e.style;for(var n in t)if(t.hasOwnProperty(n)){var s=n.indexOf("--")===0,i=pd(n,t[n],s);n==="float"&&(n="cssFloat"),s?e.setProperty(n,i):e[n]=i}}var Pf=Se({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function bl(e,t){if(t){if(Pf[e]&&(t.children!=null||t.dangerouslySetInnerHTML!=null))throw Error(z(137,e));if(t.dangerouslySetInnerHTML!=null){if(t.children!=null)throw Error(z(60));if(typeof t.dangerouslySetInnerHTML!="object"||!("__html"in t.dangerouslySetInnerHTML))throw Error(z(61))}if(t.style!=null&&typeof t.style!="object")throw Error(z(62))}}function kl(e,t){if(e.indexOf("-")===-1)return typeof t.is=="string";switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var _l=null;function uo(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var Sl=null,fs=null,vs=null;function su(e){if(e=Ei(e)){if(typeof Sl!="function")throw Error(z(280));var t=e.stateNode;t&&(t=Za(t),Sl(e.stateNode,e.type,t))}}function fd(e){fs?vs?vs.push(e):vs=[e]:fs=e}function vd(){if(fs){var e=fs,t=vs;if(vs=fs=null,su(e),t)for(e=0;e<t.length;e++)su(t[e])}}function yd(e,t){return e(t)}function hd(){}var Wr=!1;function gd(e,t,n){if(Wr)return e(t,n);Wr=!0;try{return yd(e,t,n)}finally{Wr=!1,(fs!==null||vs!==null)&&(hd(),vd())}}function ci(e,t){var n=e.stateNode;if(n===null)return null;var s=Za(n);if(s===null)return null;n=s[t];e:switch(t){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(s=!s.disabled)||(e=e.type,s=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!s;break e;default:e=!1}if(e)return null;if(n&&typeof n!="function")throw Error(z(231,t,typeof n));return n}var El=!1;if(Yt)try{Zn={},Object.defineProperty(Zn,"passive",{get:function(){El=!0}}),window.addEventListener("test",Zn,Zn),window.removeEventListener("test",Zn,Zn)}catch{El=!1}var Zn;function Mf(e,t,n,s,i,a,r,l,u){var c=Array.prototype.slice.call(arguments,3);try{t.apply(n,c)}catch(h){this.onError(h)}}var Zs=!1,Ea=null,Ca=!1,Cl=null,Of={onError:function(e){Zs=!0,Ea=e}};function Uf(e,t,n,s,i,a,r,l,u){Zs=!1,Ea=null,Mf.apply(Of,arguments)}function Bf(e,t,n,s,i,a,r,l,u){if(Uf.apply(this,arguments),Zs){if(Zs){var c=Ea;Zs=!1,Ea=null}else throw Error(z(198));Ca||(Ca=!0,Cl=c)}}function Hn(e){var t=e,n=e;if(e.alternate)for(;t.return;)t=t.return;else{e=t;do t=e,(t.flags&4098)!==0&&(n=t.return),e=t.return;while(e)}return t.tag===3?n:null}function $d(e){if(e.tag===13){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function iu(e){if(Hn(e)!==e)throw Error(z(188))}function Kf(e){var t=e.alternate;if(!t){if(t=Hn(e),t===null)throw Error(z(188));return t!==e?null:e}for(var n=e,s=t;;){var i=n.return;if(i===null)break;var a=i.alternate;if(a===null){if(s=i.return,s!==null){n=s;continue}break}if(i.child===a.child){for(a=i.child;a;){if(a===n)return iu(i),e;if(a===s)return iu(i),t;a=a.sibling}throw Error(z(188))}if(n.return!==s.return)n=i,s=a;else{for(var r=!1,l=i.child;l;){if(l===n){r=!0,n=i,s=a;break}if(l===s){r=!0,s=i,n=a;break}l=l.sibling}if(!r){for(l=a.child;l;){if(l===n){r=!0,n=a,s=i;break}if(l===s){r=!0,s=a,n=i;break}l=l.sibling}if(!r)throw Error(z(189))}}if(n.alternate!==s)throw Error(z(190))}if(n.tag!==3)throw Error(z(188));return n.stateNode.current===n?e:t}function Nd(e){return e=Kf(e),e!==null?wd(e):null}function wd(e){if(e.tag===5||e.tag===6)return e;for(e=e.child;e!==null;){var t=wd(e);if(t!==null)return t;e=e.sibling}return null}var bd=ut.unstable_scheduleCallback,au=ut.unstable_cancelCallback,zf=ut.unstable_shouldYield,Hf=ut.unstable_requestPaint,Ce=ut.unstable_now,Ff=ut.unstable_getCurrentPriorityLevel,po=ut.unstable_ImmediatePriority,kd=ut.unstable_UserBlockingPriority,Ta=ut.unstable_NormalPriority,qf=ut.unstable_LowPriority,_d=ut.unstable_IdlePriority,Ya=null,Ut=null;function Gf(e){if(Ut&&typeof Ut.onCommitFiberRoot=="function")try{Ut.onCommitFiberRoot(Ya,e,void 0,(e.current.flags&128)===128)}catch{}}var Tt=Math.clz32?Math.clz32:jf,Vf=Math.log,Wf=Math.LN2;function jf(e){return e>>>=0,e===0?32:31-(Vf(e)/Wf|0)|0}var Zi=64,ea=4194304;function Qs(e){switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return e&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return e}}function Aa(e,t){var n=e.pendingLanes;if(n===0)return 0;var s=0,i=e.suspendedLanes,a=e.pingedLanes,r=n&268435455;if(r!==0){var l=r&~i;l!==0?s=Qs(l):(a&=r,a!==0&&(s=Qs(a)))}else r=n&~i,r!==0?s=Qs(r):a!==0&&(s=Qs(a));if(s===0)return 0;if(t!==0&&t!==s&&(t&i)===0&&(i=s&-s,a=t&-t,i>=a||i===16&&(a&4194240)!==0))return t;if((s&4)!==0&&(s|=n&16),t=e.entangledLanes,t!==0)for(e=e.entanglements,t&=s;0<t;)n=31-Tt(t),i=1<<n,s|=e[n],t&=~i;return s}function Yf(e,t){switch(e){case 1:case 2:case 4:return t+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Qf(e,t){for(var n=e.suspendedLanes,s=e.pingedLanes,i=e.expirationTimes,a=e.pendingLanes;0<a;){var r=31-Tt(a),l=1<<r,u=i[r];u===-1?((l&n)===0||(l&s)!==0)&&(i[r]=Yf(l,t)):u<=t&&(e.expiredLanes|=l),a&=~l}}function Tl(e){return e=e.pendingLanes&-1073741825,e!==0?e:e&1073741824?1073741824:0}function Sd(){var e=Zi;return Zi<<=1,(Zi&4194240)===0&&(Zi=64),e}function jr(e){for(var t=[],n=0;31>n;n++)t.push(e);return t}function _i(e,t,n){e.pendingLanes|=t,t!==536870912&&(e.suspendedLanes=0,e.pingedLanes=0),e=e.eventTimes,t=31-Tt(t),e[t]=n}function Xf(e,t){var n=e.pendingLanes&~t;e.pendingLanes=t,e.suspendedLanes=0,e.pingedLanes=0,e.expiredLanes&=t,e.mutableReadLanes&=t,e.entangledLanes&=t,t=e.entanglements;var s=e.eventTimes;for(e=e.expirationTimes;0<n;){var i=31-Tt(n),a=1<<i;t[i]=0,s[i]=-1,e[i]=-1,n&=~a}}function mo(e,t){var n=e.entangledLanes|=t;for(e=e.entanglements;n;){var s=31-Tt(n),i=1<<s;i&t|e[s]&t&&(e[s]|=t),n&=~i}}var de=0;function Ed(e){return e&=-e,1<e?4<e?(e&268435455)!==0?16:536870912:4:1}var Cd,fo,Td,Ad,xd,Al=!1,ta=[],pn=null,mn=null,fn=null,ui=new Map,di=new Map,on=[],Jf="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function ru(e,t){switch(e){case"focusin":case"focusout":pn=null;break;case"dragenter":case"dragleave":mn=null;break;case"mouseover":case"mouseout":fn=null;break;case"pointerover":case"pointerout":ui.delete(t.pointerId);break;case"gotpointercapture":case"lostpointercapture":di.delete(t.pointerId)}}function zs(e,t,n,s,i,a){return e===null||e.nativeEvent!==a?(e={blockedOn:t,domEventName:n,eventSystemFlags:s,nativeEvent:a,targetContainers:[i]},t!==null&&(t=Ei(t),t!==null&&fo(t)),e):(e.eventSystemFlags|=s,t=e.targetContainers,i!==null&&t.indexOf(i)===-1&&t.push(i),e)}function Zf(e,t,n,s,i){switch(t){case"focusin":return pn=zs(pn,e,t,n,s,i),!0;case"dragenter":return mn=zs(mn,e,t,n,s,i),!0;case"mouseover":return fn=zs(fn,e,t,n,s,i),!0;case"pointerover":var a=i.pointerId;return ui.set(a,zs(ui.get(a)||null,e,t,n,s,i)),!0;case"gotpointercapture":return a=i.pointerId,di.set(a,zs(di.get(a)||null,e,t,n,s,i)),!0}return!1}function Dd(e){var t=Dn(e.target);if(t!==null){var n=Hn(t);if(n!==null){if(t=n.tag,t===13){if(t=$d(n),t!==null){e.blockedOn=t,xd(e.priority,function(){Td(n)});return}}else if(t===3&&n.stateNode.current.memoizedState.isDehydrated){e.blockedOn=n.tag===3?n.stateNode.containerInfo:null;return}}}e.blockedOn=null}function va(e){if(e.blockedOn!==null)return!1;for(var t=e.targetContainers;0<t.length;){var n=xl(e.domEventName,e.eventSystemFlags,t[0],e.nativeEvent);if(n===null){n=e.nativeEvent;var s=new n.constructor(n.type,n);_l=s,n.target.dispatchEvent(s),_l=null}else return t=Ei(n),t!==null&&fo(t),e.blockedOn=n,!1;t.shift()}return!0}function lu(e,t,n){va(e)&&n.delete(t)}function ev(){Al=!1,pn!==null&&va(pn)&&(pn=null),mn!==null&&va(mn)&&(mn=null),fn!==null&&va(fn)&&(fn=null),ui.forEach(lu),di.forEach(lu)}function Hs(e,t){e.blockedOn===t&&(e.blockedOn=null,Al||(Al=!0,ut.unstable_scheduleCallback(ut.unstable_NormalPriority,ev)))}function pi(e){function t(i){return Hs(i,e)}if(0<ta.length){Hs(ta[0],e);for(var n=1;n<ta.length;n++){var s=ta[n];s.blockedOn===e&&(s.blockedOn=null)}}for(pn!==null&&Hs(pn,e),mn!==null&&Hs(mn,e),fn!==null&&Hs(fn,e),ui.forEach(t),di.forEach(t),n=0;n<on.length;n++)s=on[n],s.blockedOn===e&&(s.blockedOn=null);for(;0<on.length&&(n=on[0],n.blockedOn===null);)Dd(n),n.blockedOn===null&&on.shift()}var ys=Zt.ReactCurrentBatchConfig,xa=!0;function tv(e,t,n,s){var i=de,a=ys.transition;ys.transition=null;try{de=1,vo(e,t,n,s)}finally{de=i,ys.transition=a}}function nv(e,t,n,s){var i=de,a=ys.transition;ys.transition=null;try{de=4,vo(e,t,n,s)}finally{de=i,ys.transition=a}}function vo(e,t,n,s){if(xa){var i=xl(e,t,n,s);if(i===null)tl(e,t,s,Da,n),ru(e,s);else if(Zf(i,e,t,n,s))s.stopPropagation();else if(ru(e,s),t&4&&-1<Jf.indexOf(e)){for(;i!==null;){var a=Ei(i);if(a!==null&&Cd(a),a=xl(e,t,n,s),a===null&&tl(e,t,s,Da,n),a===i)break;i=a}i!==null&&s.stopPropagation()}else tl(e,t,s,null,n)}}var Da=null;function xl(e,t,n,s){if(Da=null,e=uo(s),e=Dn(e),e!==null)if(t=Hn(e),t===null)e=null;else if(n=t.tag,n===13){if(e=$d(t),e!==null)return e;e=null}else if(n===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;e=null}else t!==e&&(e=null);return Da=e,null}function Rd(e){switch(e){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(Ff()){case po:return 1;case kd:return 4;case Ta:case qf:return 16;case _d:return 536870912;default:return 16}default:return 16}}var un=null,yo=null,ya=null;function Id(){if(ya)return ya;var e,t=yo,n=t.length,s,i="value"in un?un.value:un.textContent,a=i.length;for(e=0;e<n&&t[e]===i[e];e++);var r=n-e;for(s=1;s<=r&&t[n-s]===i[a-s];s++);return ya=i.slice(e,1<s?1-s:void 0)}function ha(e){var t=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&t===13&&(e=13)):e=t,e===10&&(e=13),32<=e||e===13?e:0}function na(){return!0}function ou(){return!1}function dt(e){function t(n,s,i,a,r){this._reactName=n,this._targetInst=i,this.type=s,this.nativeEvent=a,this.target=r,this.currentTarget=null;for(var l in e)e.hasOwnProperty(l)&&(n=e[l],this[l]=n?n(a):a[l]);return this.isDefaultPrevented=(a.defaultPrevented!=null?a.defaultPrevented:a.returnValue===!1)?na:ou,this.isPropagationStopped=ou,this}return Se(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var n=this.nativeEvent;n&&(n.preventDefault?n.preventDefault():typeof n.returnValue!="unknown"&&(n.returnValue=!1),this.isDefaultPrevented=na)},stopPropagation:function(){var n=this.nativeEvent;n&&(n.stopPropagation?n.stopPropagation():typeof n.cancelBubble!="unknown"&&(n.cancelBubble=!0),this.isPropagationStopped=na)},persist:function(){},isPersistent:na}),t}var Es={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},ho=dt(Es),Si=Se({},Es,{view:0,detail:0}),sv=dt(Si),Yr,Qr,Fs,Qa=Se({},Si,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:go,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==Fs&&(Fs&&e.type==="mousemove"?(Yr=e.screenX-Fs.screenX,Qr=e.screenY-Fs.screenY):Qr=Yr=0,Fs=e),Yr)},movementY:function(e){return"movementY"in e?e.movementY:Qr}}),cu=dt(Qa),iv=Se({},Qa,{dataTransfer:0}),av=dt(iv),rv=Se({},Si,{relatedTarget:0}),Xr=dt(rv),lv=Se({},Es,{animationName:0,elapsedTime:0,pseudoElement:0}),ov=dt(lv),cv=Se({},Es,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),uv=dt(cv),dv=Se({},Es,{data:0}),uu=dt(dv),pv={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},mv={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},fv={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function vv(e){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(e):(e=fv[e])?!!t[e]:!1}function go(){return vv}var yv=Se({},Si,{key:function(e){if(e.key){var t=pv[e.key]||e.key;if(t!=="Unidentified")return t}return e.type==="keypress"?(e=ha(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?mv[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:go,charCode:function(e){return e.type==="keypress"?ha(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?ha(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),hv=dt(yv),gv=Se({},Qa,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),du=dt(gv),$v=Se({},Si,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:go}),Nv=dt($v),wv=Se({},Es,{propertyName:0,elapsedTime:0,pseudoElement:0}),bv=dt(wv),kv=Se({},Qa,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),_v=dt(kv),Sv=[9,13,27,32],$o=Yt&&"CompositionEvent"in window,ei=null;Yt&&"documentMode"in document&&(ei=document.documentMode);var Ev=Yt&&"TextEvent"in window&&!ei,Ld=Yt&&(!$o||ei&&8<ei&&11>=ei),pu=" ",mu=!1;function Pd(e,t){switch(e){case"keyup":return Sv.indexOf(t.keyCode)!==-1;case"keydown":return t.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function Md(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}var ss=!1;function Cv(e,t){switch(e){case"compositionend":return Md(t);case"keypress":return t.which!==32?null:(mu=!0,pu);case"textInput":return e=t.data,e===pu&&mu?null:e;default:return null}}function Tv(e,t){if(ss)return e==="compositionend"||!$o&&Pd(e,t)?(e=Id(),ya=yo=un=null,ss=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case"compositionend":return Ld&&t.locale!=="ko"?null:t.data;default:return null}}var Av={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function fu(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t==="input"?!!Av[e.type]:t==="textarea"}function Od(e,t,n,s){fd(s),t=Ra(t,"onChange"),0<t.length&&(n=new ho("onChange","change",null,n,s),e.push({event:n,listeners:t}))}var ti=null,mi=null;function xv(e){jd(e,0)}function Xa(e){var t=rs(e);if(ld(t))return e}function Dv(e,t){if(e==="change")return t}var Ud=!1;Yt&&(Yt?(ia="oninput"in document,ia||(Jr=document.createElement("div"),Jr.setAttribute("oninput","return;"),ia=typeof Jr.oninput=="function"),sa=ia):sa=!1,Ud=sa&&(!document.documentMode||9<document.documentMode));var sa,ia,Jr;function vu(){ti&&(ti.detachEvent("onpropertychange",Bd),mi=ti=null)}function Bd(e){if(e.propertyName==="value"&&Xa(mi)){var t=[];Od(t,mi,e,uo(e)),gd(xv,t)}}function Rv(e,t,n){e==="focusin"?(vu(),ti=t,mi=n,ti.attachEvent("onpropertychange",Bd)):e==="focusout"&&vu()}function Iv(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return Xa(mi)}function Lv(e,t){if(e==="click")return Xa(t)}function Pv(e,t){if(e==="input"||e==="change")return Xa(t)}function Mv(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var xt=typeof Object.is=="function"?Object.is:Mv;function fi(e,t){if(xt(e,t))return!0;if(typeof e!="object"||e===null||typeof t!="object"||t===null)return!1;var n=Object.keys(e),s=Object.keys(t);if(n.length!==s.length)return!1;for(s=0;s<n.length;s++){var i=n[s];if(!pl.call(t,i)||!xt(e[i],t[i]))return!1}return!0}function yu(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function hu(e,t){var n=yu(e);e=0;for(var s;n;){if(n.nodeType===3){if(s=e+n.textContent.length,e<=t&&s>=t)return{node:n,offset:t-e};e=s}e:{for(;n;){if(n.nextSibling){n=n.nextSibling;break e}n=n.parentNode}n=void 0}n=yu(n)}}function Kd(e,t){return e&&t?e===t?!0:e&&e.nodeType===3?!1:t&&t.nodeType===3?Kd(e,t.parentNode):"contains"in e?e.contains(t):e.compareDocumentPosition?!!(e.compareDocumentPosition(t)&16):!1:!1}function zd(){for(var e=window,t=Sa();t instanceof e.HTMLIFrameElement;){try{var n=typeof t.contentWindow.location.href=="string"}catch{n=!1}if(n)e=t.contentWindow;else break;t=Sa(e.document)}return t}function No(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t&&(t==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||t==="textarea"||e.contentEditable==="true")}function Ov(e){var t=zd(),n=e.focusedElem,s=e.selectionRange;if(t!==n&&n&&n.ownerDocument&&Kd(n.ownerDocument.documentElement,n)){if(s!==null&&No(n)){if(t=s.start,e=s.end,e===void 0&&(e=t),"selectionStart"in n)n.selectionStart=t,n.selectionEnd=Math.min(e,n.value.length);else if(e=(t=n.ownerDocument||document)&&t.defaultView||window,e.getSelection){e=e.getSelection();var i=n.textContent.length,a=Math.min(s.start,i);s=s.end===void 0?a:Math.min(s.end,i),!e.extend&&a>s&&(i=s,s=a,a=i),i=hu(n,a);var r=hu(n,s);i&&r&&(e.rangeCount!==1||e.anchorNode!==i.node||e.anchorOffset!==i.offset||e.focusNode!==r.node||e.focusOffset!==r.offset)&&(t=t.createRange(),t.setStart(i.node,i.offset),e.removeAllRanges(),a>s?(e.addRange(t),e.extend(r.node,r.offset)):(t.setEnd(r.node,r.offset),e.addRange(t)))}}for(t=[],e=n;e=e.parentNode;)e.nodeType===1&&t.push({element:e,left:e.scrollLeft,top:e.scrollTop});for(typeof n.focus=="function"&&n.focus(),n=0;n<t.length;n++)e=t[n],e.element.scrollLeft=e.left,e.element.scrollTop=e.top}}var Uv=Yt&&"documentMode"in document&&11>=document.documentMode,is=null,Dl=null,ni=null,Rl=!1;function gu(e,t,n){var s=n.window===n?n.document:n.nodeType===9?n:n.ownerDocument;Rl||is==null||is!==Sa(s)||(s=is,"selectionStart"in s&&No(s)?s={start:s.selectionStart,end:s.selectionEnd}:(s=(s.ownerDocument&&s.ownerDocument.defaultView||window).getSelection(),s={anchorNode:s.anchorNode,anchorOffset:s.anchorOffset,focusNode:s.focusNode,focusOffset:s.focusOffset}),ni&&fi(ni,s)||(ni=s,s=Ra(Dl,"onSelect"),0<s.length&&(t=new ho("onSelect","select",null,t,n),e.push({event:t,listeners:s}),t.target=is)))}function aa(e,t){var n={};return n[e.toLowerCase()]=t.toLowerCase(),n["Webkit"+e]="webkit"+t,n["Moz"+e]="moz"+t,n}var as={animationend:aa("Animation","AnimationEnd"),animationiteration:aa("Animation","AnimationIteration"),animationstart:aa("Animation","AnimationStart"),transitionend:aa("Transition","TransitionEnd")},Zr={},Hd={};Yt&&(Hd=document.createElement("div").style,"AnimationEvent"in window||(delete as.animationend.animation,delete as.animationiteration.animation,delete as.animationstart.animation),"TransitionEvent"in window||delete as.transitionend.transition);function Ja(e){if(Zr[e])return Zr[e];if(!as[e])return e;var t=as[e],n;for(n in t)if(t.hasOwnProperty(n)&&n in Hd)return Zr[e]=t[n];return e}var Fd=Ja("animationend"),qd=Ja("animationiteration"),Gd=Ja("animationstart"),Vd=Ja("transitionend"),Wd=new Map,$u="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function bn(e,t){Wd.set(e,t),zn(t,[e])}for(ra=0;ra<$u.length;ra++)la=$u[ra],Nu=la.toLowerCase(),wu=la[0].toUpperCase()+la.slice(1),bn(Nu,"on"+wu);var la,Nu,wu,ra;bn(Fd,"onAnimationEnd");bn(qd,"onAnimationIteration");bn(Gd,"onAnimationStart");bn("dblclick","onDoubleClick");bn("focusin","onFocus");bn("focusout","onBlur");bn(Vd,"onTransitionEnd");$s("onMouseEnter",["mouseout","mouseover"]);$s("onMouseLeave",["mouseout","mouseover"]);$s("onPointerEnter",["pointerout","pointerover"]);$s("onPointerLeave",["pointerout","pointerover"]);zn("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));zn("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));zn("onBeforeInput",["compositionend","keypress","textInput","paste"]);zn("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));zn("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));zn("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var Xs="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),Bv=new Set("cancel close invalid load scroll toggle".split(" ").concat(Xs));function bu(e,t,n){var s=e.type||"unknown-event";e.currentTarget=n,Bf(s,t,void 0,e),e.currentTarget=null}function jd(e,t){t=(t&4)!==0;for(var n=0;n<e.length;n++){var s=e[n],i=s.event;s=s.listeners;e:{var a=void 0;if(t)for(var r=s.length-1;0<=r;r--){var l=s[r],u=l.instance,c=l.currentTarget;if(l=l.listener,u!==a&&i.isPropagationStopped())break e;bu(i,l,c),a=u}else for(r=0;r<s.length;r++){if(l=s[r],u=l.instance,c=l.currentTarget,l=l.listener,u!==a&&i.isPropagationStopped())break e;bu(i,l,c),a=u}}}if(Ca)throw e=Cl,Ca=!1,Cl=null,e}function ye(e,t){var n=t[Ol];n===void 0&&(n=t[Ol]=new Set);var s=e+"__bubble";n.has(s)||(Yd(t,e,2,!1),n.add(s))}function el(e,t,n){var s=0;t&&(s|=4),Yd(n,e,s,t)}var oa="_reactListening"+Math.random().toString(36).slice(2);function vi(e){if(!e[oa]){e[oa]=!0,nd.forEach(function(n){n!=="selectionchange"&&(Bv.has(n)||el(n,!1,e),el(n,!0,e))});var t=e.nodeType===9?e:e.ownerDocument;t===null||t[oa]||(t[oa]=!0,el("selectionchange",!1,t))}}function Yd(e,t,n,s){switch(Rd(t)){case 1:var i=tv;break;case 4:i=nv;break;default:i=vo}n=i.bind(null,t,n,e),i=void 0,!El||t!=="touchstart"&&t!=="touchmove"&&t!=="wheel"||(i=!0),s?i!==void 0?e.addEventListener(t,n,{capture:!0,passive:i}):e.addEventListener(t,n,!0):i!==void 0?e.addEventListener(t,n,{passive:i}):e.addEventListener(t,n,!1)}function tl(e,t,n,s,i){var a=s;if((t&1)===0&&(t&2)===0&&s!==null)e:for(;;){if(s===null)return;var r=s.tag;if(r===3||r===4){var l=s.stateNode.containerInfo;if(l===i||l.nodeType===8&&l.parentNode===i)break;if(r===4)for(r=s.return;r!==null;){var u=r.tag;if((u===3||u===4)&&(u=r.stateNode.containerInfo,u===i||u.nodeType===8&&u.parentNode===i))return;r=r.return}for(;l!==null;){if(r=Dn(l),r===null)return;if(u=r.tag,u===5||u===6){s=a=r;continue e}l=l.parentNode}}s=s.return}gd(function(){var c=a,h=uo(n),$=[];e:{var v=Wd.get(e);if(v!==void 0){var N=ho,_=e;switch(e){case"keypress":if(ha(n)===0)break e;case"keydown":case"keyup":N=hv;break;case"focusin":_="focus",N=Xr;break;case"focusout":_="blur",N=Xr;break;case"beforeblur":case"afterblur":N=Xr;break;case"click":if(n.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":N=cu;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":N=av;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":N=Nv;break;case Fd:case qd:case Gd:N=ov;break;case Vd:N=bv;break;case"scroll":N=sv;break;case"wheel":N=_v;break;case"copy":case"cut":case"paste":N=uv;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":N=du}var w=(t&4)!==0,E=!w&&e==="scroll",y=w?v!==null?v+"Capture":null:v;w=[];for(var f=c,p;f!==null;){p=f;var k=p.stateNode;if(p.tag===5&&k!==null&&(p=k,y!==null&&(k=ci(f,y),k!=null&&w.push(yi(f,k,p)))),E)break;f=f.return}0<w.length&&(v=new N(v,_,null,n,h),$.push({event:v,listeners:w}))}}if((t&7)===0){e:{if(v=e==="mouseover"||e==="pointerover",N=e==="mouseout"||e==="pointerout",v&&n!==_l&&(_=n.relatedTarget||n.fromElement)&&(Dn(_)||_[Qt]))break e;if((N||v)&&(v=h.window===h?h:(v=h.ownerDocument)?v.defaultView||v.parentWindow:window,N?(_=n.relatedTarget||n.toElement,N=c,_=_?Dn(_):null,_!==null&&(E=Hn(_),_!==E||_.tag!==5&&_.tag!==6)&&(_=null)):(N=null,_=c),N!==_)){if(w=cu,k="onMouseLeave",y="onMouseEnter",f="mouse",(e==="pointerout"||e==="pointerover")&&(w=du,k="onPointerLeave",y="onPointerEnter",f="pointer"),E=N==null?v:rs(N),p=_==null?v:rs(_),v=new w(k,f+"leave",N,n,h),v.target=E,v.relatedTarget=p,k=null,Dn(h)===c&&(w=new w(y,f+"enter",_,n,h),w.target=p,w.relatedTarget=E,k=w),E=k,N&&_)t:{for(w=N,y=_,f=0,p=w;p;p=es(p))f++;for(p=0,k=y;k;k=es(k))p++;for(;0<f-p;)w=es(w),f--;for(;0<p-f;)y=es(y),p--;for(;f--;){if(w===y||y!==null&&w===y.alternate)break t;w=es(w),y=es(y)}w=null}else w=null;N!==null&&ku($,v,N,w,!1),_!==null&&E!==null&&ku($,E,_,w,!0)}}e:{if(v=c?rs(c):window,N=v.nodeName&&v.nodeName.toLowerCase(),N==="select"||N==="input"&&v.type==="file")var b=Dv;else if(fu(v))if(Ud)b=Pv;else{b=Iv;var x=Rv}else(N=v.nodeName)&&N.toLowerCase()==="input"&&(v.type==="checkbox"||v.type==="radio")&&(b=Lv);if(b&&(b=b(e,c))){Od($,b,n,h);break e}x&&x(e,v,c),e==="focusout"&&(x=v._wrapperState)&&x.controlled&&v.type==="number"&&$l(v,"number",v.value)}switch(x=c?rs(c):window,e){case"focusin":(fu(x)||x.contentEditable==="true")&&(is=x,Dl=c,ni=null);break;case"focusout":ni=Dl=is=null;break;case"mousedown":Rl=!0;break;case"contextmenu":case"mouseup":case"dragend":Rl=!1,gu($,n,h);break;case"selectionchange":if(Uv)break;case"keydown":case"keyup":gu($,n,h)}var g;if($o)e:{switch(e){case"compositionstart":var S="onCompositionStart";break e;case"compositionend":S="onCompositionEnd";break e;case"compositionupdate":S="onCompositionUpdate";break e}S=void 0}else ss?Pd(e,n)&&(S="onCompositionEnd"):e==="keydown"&&n.keyCode===229&&(S="onCompositionStart");S&&(Ld&&n.locale!=="ko"&&(ss||S!=="onCompositionStart"?S==="onCompositionEnd"&&ss&&(g=Id()):(un=h,yo="value"in un?un.value:un.textContent,ss=!0)),x=Ra(c,S),0<x.length&&(S=new uu(S,e,null,n,h),$.push({event:S,listeners:x}),g?S.data=g:(g=Md(n),g!==null&&(S.data=g)))),(g=Ev?Cv(e,n):Tv(e,n))&&(c=Ra(c,"onBeforeInput"),0<c.length&&(h=new uu("onBeforeInput","beforeinput",null,n,h),$.push({event:h,listeners:c}),h.data=g))}jd($,t)})}function yi(e,t,n){return{instance:e,listener:t,currentTarget:n}}function Ra(e,t){for(var n=t+"Capture",s=[];e!==null;){var i=e,a=i.stateNode;i.tag===5&&a!==null&&(i=a,a=ci(e,n),a!=null&&s.unshift(yi(e,a,i)),a=ci(e,t),a!=null&&s.push(yi(e,a,i))),e=e.return}return s}function es(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5);return e||null}function ku(e,t,n,s,i){for(var a=t._reactName,r=[];n!==null&&n!==s;){var l=n,u=l.alternate,c=l.stateNode;if(u!==null&&u===s)break;l.tag===5&&c!==null&&(l=c,i?(u=ci(n,a),u!=null&&r.unshift(yi(n,u,l))):i||(u=ci(n,a),u!=null&&r.push(yi(n,u,l)))),n=n.return}r.length!==0&&e.push({event:t,listeners:r})}var Kv=/\r\n?/g,zv=/\u0000|\uFFFD/g;function _u(e){return(typeof e=="string"?e:""+e).replace(Kv,`
`).replace(zv,"")}function ca(e,t,n){if(t=_u(t),_u(e)!==t&&n)throw Error(z(425))}function Ia(){}var Il=null,Ll=null;function Pl(e,t){return e==="textarea"||e==="noscript"||typeof t.children=="string"||typeof t.children=="number"||typeof t.dangerouslySetInnerHTML=="object"&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}var Ml=typeof setTimeout=="function"?setTimeout:void 0,Hv=typeof clearTimeout=="function"?clearTimeout:void 0,Su=typeof Promise=="function"?Promise:void 0,Fv=typeof queueMicrotask=="function"?queueMicrotask:typeof Su<"u"?function(e){return Su.resolve(null).then(e).catch(qv)}:Ml;function qv(e){setTimeout(function(){throw e})}function nl(e,t){var n=t,s=0;do{var i=n.nextSibling;if(e.removeChild(n),i&&i.nodeType===8)if(n=i.data,n==="/$"){if(s===0){e.removeChild(i),pi(t);return}s--}else n!=="$"&&n!=="$?"&&n!=="$!"||s++;n=i}while(n);pi(t)}function vn(e){for(;e!=null;e=e.nextSibling){var t=e.nodeType;if(t===1||t===3)break;if(t===8){if(t=e.data,t==="$"||t==="$!"||t==="$?")break;if(t==="/$")return null}}return e}function Eu(e){e=e.previousSibling;for(var t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="$"||n==="$!"||n==="$?"){if(t===0)return e;t--}else n==="/$"&&t++}e=e.previousSibling}return null}var Cs=Math.random().toString(36).slice(2),Ot="__reactFiber$"+Cs,hi="__reactProps$"+Cs,Qt="__reactContainer$"+Cs,Ol="__reactEvents$"+Cs,Gv="__reactListeners$"+Cs,Vv="__reactHandles$"+Cs;function Dn(e){var t=e[Ot];if(t)return t;for(var n=e.parentNode;n;){if(t=n[Qt]||n[Ot]){if(n=t.alternate,t.child!==null||n!==null&&n.child!==null)for(e=Eu(e);e!==null;){if(n=e[Ot])return n;e=Eu(e)}return t}e=n,n=e.parentNode}return null}function Ei(e){return e=e[Ot]||e[Qt],!e||e.tag!==5&&e.tag!==6&&e.tag!==13&&e.tag!==3?null:e}function rs(e){if(e.tag===5||e.tag===6)return e.stateNode;throw Error(z(33))}function Za(e){return e[hi]||null}var Ul=[],ls=-1;function kn(e){return{current:e}}function he(e){0>ls||(e.current=Ul[ls],Ul[ls]=null,ls--)}function ve(e,t){ls++,Ul[ls]=e.current,e.current=t}var wn={},Fe=kn(wn),st=kn(!1),Mn=wn;function Ns(e,t){var n=e.type.contextTypes;if(!n)return wn;var s=e.stateNode;if(s&&s.__reactInternalMemoizedUnmaskedChildContext===t)return s.__reactInternalMemoizedMaskedChildContext;var i={},a;for(a in n)i[a]=t[a];return s&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=t,e.__reactInternalMemoizedMaskedChildContext=i),i}function it(e){return e=e.childContextTypes,e!=null}function La(){he(st),he(Fe)}function Cu(e,t,n){if(Fe.current!==wn)throw Error(z(168));ve(Fe,t),ve(st,n)}function Qd(e,t,n){var s=e.stateNode;if(t=t.childContextTypes,typeof s.getChildContext!="function")return n;s=s.getChildContext();for(var i in s)if(!(i in t))throw Error(z(108,Rf(e)||"Unknown",i));return Se({},n,s)}function Pa(e){return e=(e=e.stateNode)&&e.__reactInternalMemoizedMergedChildContext||wn,Mn=Fe.current,ve(Fe,e),ve(st,st.current),!0}function Tu(e,t,n){var s=e.stateNode;if(!s)throw Error(z(169));n?(e=Qd(e,t,Mn),s.__reactInternalMemoizedMergedChildContext=e,he(st),he(Fe),ve(Fe,e)):he(st),ve(st,n)}var Gt=null,er=!1,sl=!1;function Xd(e){Gt===null?Gt=[e]:Gt.push(e)}function Wv(e){er=!0,Xd(e)}function _n(){if(!sl&&Gt!==null){sl=!0;var e=0,t=de;try{var n=Gt;for(de=1;e<n.length;e++){var s=n[e];do s=s(!0);while(s!==null)}Gt=null,er=!1}catch(i){throw Gt!==null&&(Gt=Gt.slice(e+1)),bd(po,_n),i}finally{de=t,sl=!1}}return null}var os=[],cs=0,Ma=null,Oa=0,vt=[],yt=0,On=null,Vt=1,Wt="";function An(e,t){os[cs++]=Oa,os[cs++]=Ma,Ma=e,Oa=t}function Jd(e,t,n){vt[yt++]=Vt,vt[yt++]=Wt,vt[yt++]=On,On=e;var s=Vt;e=Wt;var i=32-Tt(s)-1;s&=~(1<<i),n+=1;var a=32-Tt(t)+i;if(30<a){var r=i-i%5;a=(s&(1<<r)-1).toString(32),s>>=r,i-=r,Vt=1<<32-Tt(t)+i|n<<i|s,Wt=a+e}else Vt=1<<a|n<<i|s,Wt=e}function wo(e){e.return!==null&&(An(e,1),Jd(e,1,0))}function bo(e){for(;e===Ma;)Ma=os[--cs],os[cs]=null,Oa=os[--cs],os[cs]=null;for(;e===On;)On=vt[--yt],vt[yt]=null,Wt=vt[--yt],vt[yt]=null,Vt=vt[--yt],vt[yt]=null}var ct=null,ot=null,be=!1,Ct=null;function Zd(e,t){var n=ht(5,null,null,0);n.elementType="DELETED",n.stateNode=t,n.return=e,t=e.deletions,t===null?(e.deletions=[n],e.flags|=16):t.push(n)}function Au(e,t){switch(e.tag){case 5:var n=e.type;return t=t.nodeType!==1||n.toLowerCase()!==t.nodeName.toLowerCase()?null:t,t!==null?(e.stateNode=t,ct=e,ot=vn(t.firstChild),!0):!1;case 6:return t=e.pendingProps===""||t.nodeType!==3?null:t,t!==null?(e.stateNode=t,ct=e,ot=null,!0):!1;case 13:return t=t.nodeType!==8?null:t,t!==null?(n=On!==null?{id:Vt,overflow:Wt}:null,e.memoizedState={dehydrated:t,treeContext:n,retryLane:1073741824},n=ht(18,null,null,0),n.stateNode=t,n.return=e,e.child=n,ct=e,ot=null,!0):!1;default:return!1}}function Bl(e){return(e.mode&1)!==0&&(e.flags&128)===0}function Kl(e){if(be){var t=ot;if(t){var n=t;if(!Au(e,t)){if(Bl(e))throw Error(z(418));t=vn(n.nextSibling);var s=ct;t&&Au(e,t)?Zd(s,n):(e.flags=e.flags&-4097|2,be=!1,ct=e)}}else{if(Bl(e))throw Error(z(418));e.flags=e.flags&-4097|2,be=!1,ct=e}}}function xu(e){for(e=e.return;e!==null&&e.tag!==5&&e.tag!==3&&e.tag!==13;)e=e.return;ct=e}function ua(e){if(e!==ct)return!1;if(!be)return xu(e),be=!0,!1;var t;if((t=e.tag!==3)&&!(t=e.tag!==5)&&(t=e.type,t=t!=="head"&&t!=="body"&&!Pl(e.type,e.memoizedProps)),t&&(t=ot)){if(Bl(e))throw ep(),Error(z(418));for(;t;)Zd(e,t),t=vn(t.nextSibling)}if(xu(e),e.tag===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(z(317));e:{for(e=e.nextSibling,t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="/$"){if(t===0){ot=vn(e.nextSibling);break e}t--}else n!=="$"&&n!=="$!"&&n!=="$?"||t++}e=e.nextSibling}ot=null}}else ot=ct?vn(e.stateNode.nextSibling):null;return!0}function ep(){for(var e=ot;e;)e=vn(e.nextSibling)}function ws(){ot=ct=null,be=!1}function ko(e){Ct===null?Ct=[e]:Ct.push(e)}var jv=Zt.ReactCurrentBatchConfig;function qs(e,t,n){if(e=n.ref,e!==null&&typeof e!="function"&&typeof e!="object"){if(n._owner){if(n=n._owner,n){if(n.tag!==1)throw Error(z(309));var s=n.stateNode}if(!s)throw Error(z(147,e));var i=s,a=""+e;return t!==null&&t.ref!==null&&typeof t.ref=="function"&&t.ref._stringRef===a?t.ref:(t=function(r){var l=i.refs;r===null?delete l[a]:l[a]=r},t._stringRef=a,t)}if(typeof e!="string")throw Error(z(284));if(!n._owner)throw Error(z(290,e))}return e}function da(e,t){throw e=Object.prototype.toString.call(t),Error(z(31,e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e))}function Du(e){var t=e._init;return t(e._payload)}function tp(e){function t(y,f){if(e){var p=y.deletions;p===null?(y.deletions=[f],y.flags|=16):p.push(f)}}function n(y,f){if(!e)return null;for(;f!==null;)t(y,f),f=f.sibling;return null}function s(y,f){for(y=new Map;f!==null;)f.key!==null?y.set(f.key,f):y.set(f.index,f),f=f.sibling;return y}function i(y,f){return y=$n(y,f),y.index=0,y.sibling=null,y}function a(y,f,p){return y.index=p,e?(p=y.alternate,p!==null?(p=p.index,p<f?(y.flags|=2,f):p):(y.flags|=2,f)):(y.flags|=1048576,f)}function r(y){return e&&y.alternate===null&&(y.flags|=2),y}function l(y,f,p,k){return f===null||f.tag!==6?(f=ul(p,y.mode,k),f.return=y,f):(f=i(f,p),f.return=y,f)}function u(y,f,p,k){var b=p.type;return b===ns?h(y,f,p.props.children,k,p.key):f!==null&&(f.elementType===b||typeof b=="object"&&b!==null&&b.$$typeof===rn&&Du(b)===f.type)?(k=i(f,p.props),k.ref=qs(y,f,p),k.return=y,k):(k=_a(p.type,p.key,p.props,null,y.mode,k),k.ref=qs(y,f,p),k.return=y,k)}function c(y,f,p,k){return f===null||f.tag!==4||f.stateNode.containerInfo!==p.containerInfo||f.stateNode.implementation!==p.implementation?(f=dl(p,y.mode,k),f.return=y,f):(f=i(f,p.children||[]),f.return=y,f)}function h(y,f,p,k,b){return f===null||f.tag!==7?(f=Pn(p,y.mode,k,b),f.return=y,f):(f=i(f,p),f.return=y,f)}function $(y,f,p){if(typeof f=="string"&&f!==""||typeof f=="number")return f=ul(""+f,y.mode,p),f.return=y,f;if(typeof f=="object"&&f!==null){switch(f.$$typeof){case Qi:return p=_a(f.type,f.key,f.props,null,y.mode,p),p.ref=qs(y,null,f),p.return=y,p;case ts:return f=dl(f,y.mode,p),f.return=y,f;case rn:var k=f._init;return $(y,k(f._payload),p)}if(Ys(f)||Ks(f))return f=Pn(f,y.mode,p,null),f.return=y,f;da(y,f)}return null}function v(y,f,p,k){var b=f!==null?f.key:null;if(typeof p=="string"&&p!==""||typeof p=="number")return b!==null?null:l(y,f,""+p,k);if(typeof p=="object"&&p!==null){switch(p.$$typeof){case Qi:return p.key===b?u(y,f,p,k):null;case ts:return p.key===b?c(y,f,p,k):null;case rn:return b=p._init,v(y,f,b(p._payload),k)}if(Ys(p)||Ks(p))return b!==null?null:h(y,f,p,k,null);da(y,p)}return null}function N(y,f,p,k,b){if(typeof k=="string"&&k!==""||typeof k=="number")return y=y.get(p)||null,l(f,y,""+k,b);if(typeof k=="object"&&k!==null){switch(k.$$typeof){case Qi:return y=y.get(k.key===null?p:k.key)||null,u(f,y,k,b);case ts:return y=y.get(k.key===null?p:k.key)||null,c(f,y,k,b);case rn:var x=k._init;return N(y,f,p,x(k._payload),b)}if(Ys(k)||Ks(k))return y=y.get(p)||null,h(f,y,k,b,null);da(f,k)}return null}function _(y,f,p,k){for(var b=null,x=null,g=f,S=f=0,R=null;g!==null&&S<p.length;S++){g.index>S?(R=g,g=null):R=g.sibling;var D=v(y,g,p[S],k);if(D===null){g===null&&(g=R);break}e&&g&&D.alternate===null&&t(y,g),f=a(D,f,S),x===null?b=D:x.sibling=D,x=D,g=R}if(S===p.length)return n(y,g),be&&An(y,S),b;if(g===null){for(;S<p.length;S++)g=$(y,p[S],k),g!==null&&(f=a(g,f,S),x===null?b=g:x.sibling=g,x=g);return be&&An(y,S),b}for(g=s(y,g);S<p.length;S++)R=N(g,y,S,p[S],k),R!==null&&(e&&R.alternate!==null&&g.delete(R.key===null?S:R.key),f=a(R,f,S),x===null?b=R:x.sibling=R,x=R);return e&&g.forEach(function(H){return t(y,H)}),be&&An(y,S),b}function w(y,f,p,k){var b=Ks(p);if(typeof b!="function")throw Error(z(150));if(p=b.call(p),p==null)throw Error(z(151));for(var x=b=null,g=f,S=f=0,R=null,D=p.next();g!==null&&!D.done;S++,D=p.next()){g.index>S?(R=g,g=null):R=g.sibling;var H=v(y,g,D.value,k);if(H===null){g===null&&(g=R);break}e&&g&&H.alternate===null&&t(y,g),f=a(H,f,S),x===null?b=H:x.sibling=H,x=H,g=R}if(D.done)return n(y,g),be&&An(y,S),b;if(g===null){for(;!D.done;S++,D=p.next())D=$(y,D.value,k),D!==null&&(f=a(D,f,S),x===null?b=D:x.sibling=D,x=D);return be&&An(y,S),b}for(g=s(y,g);!D.done;S++,D=p.next())D=N(g,y,S,D.value,k),D!==null&&(e&&D.alternate!==null&&g.delete(D.key===null?S:D.key),f=a(D,f,S),x===null?b=D:x.sibling=D,x=D);return e&&g.forEach(function(W){return t(y,W)}),be&&An(y,S),b}function E(y,f,p,k){if(typeof p=="object"&&p!==null&&p.type===ns&&p.key===null&&(p=p.props.children),typeof p=="object"&&p!==null){switch(p.$$typeof){case Qi:e:{for(var b=p.key,x=f;x!==null;){if(x.key===b){if(b=p.type,b===ns){if(x.tag===7){n(y,x.sibling),f=i(x,p.props.children),f.return=y,y=f;break e}}else if(x.elementType===b||typeof b=="object"&&b!==null&&b.$$typeof===rn&&Du(b)===x.type){n(y,x.sibling),f=i(x,p.props),f.ref=qs(y,x,p),f.return=y,y=f;break e}n(y,x);break}else t(y,x);x=x.sibling}p.type===ns?(f=Pn(p.props.children,y.mode,k,p.key),f.return=y,y=f):(k=_a(p.type,p.key,p.props,null,y.mode,k),k.ref=qs(y,f,p),k.return=y,y=k)}return r(y);case ts:e:{for(x=p.key;f!==null;){if(f.key===x)if(f.tag===4&&f.stateNode.containerInfo===p.containerInfo&&f.stateNode.implementation===p.implementation){n(y,f.sibling),f=i(f,p.children||[]),f.return=y,y=f;break e}else{n(y,f);break}else t(y,f);f=f.sibling}f=dl(p,y.mode,k),f.return=y,y=f}return r(y);case rn:return x=p._init,E(y,f,x(p._payload),k)}if(Ys(p))return _(y,f,p,k);if(Ks(p))return w(y,f,p,k);da(y,p)}return typeof p=="string"&&p!==""||typeof p=="number"?(p=""+p,f!==null&&f.tag===6?(n(y,f.sibling),f=i(f,p),f.return=y,y=f):(n(y,f),f=ul(p,y.mode,k),f.return=y,y=f),r(y)):n(y,f)}return E}var bs=tp(!0),np=tp(!1),Ua=kn(null),Ba=null,us=null,_o=null;function So(){_o=us=Ba=null}function Eo(e){var t=Ua.current;he(Ua),e._currentValue=t}function zl(e,t,n){for(;e!==null;){var s=e.alternate;if((e.childLanes&t)!==t?(e.childLanes|=t,s!==null&&(s.childLanes|=t)):s!==null&&(s.childLanes&t)!==t&&(s.childLanes|=t),e===n)break;e=e.return}}function hs(e,t){Ba=e,_o=us=null,e=e.dependencies,e!==null&&e.firstContext!==null&&((e.lanes&t)!==0&&(nt=!0),e.firstContext=null)}function $t(e){var t=e._currentValue;if(_o!==e)if(e={context:e,memoizedValue:t,next:null},us===null){if(Ba===null)throw Error(z(308));us=e,Ba.dependencies={lanes:0,firstContext:e}}else us=us.next=e;return t}var Rn=null;function Co(e){Rn===null?Rn=[e]:Rn.push(e)}function sp(e,t,n,s){var i=t.interleaved;return i===null?(n.next=n,Co(t)):(n.next=i.next,i.next=n),t.interleaved=n,Xt(e,s)}function Xt(e,t){e.lanes|=t;var n=e.alternate;for(n!==null&&(n.lanes|=t),n=e,e=e.return;e!==null;)e.childLanes|=t,n=e.alternate,n!==null&&(n.childLanes|=t),n=e,e=e.return;return n.tag===3?n.stateNode:null}var ln=!1;function To(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function ip(e,t){e=e.updateQueue,t.updateQueue===e&&(t.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,effects:e.effects})}function jt(e,t){return{eventTime:e,lane:t,tag:0,payload:null,callback:null,next:null}}function yn(e,t,n){var s=e.updateQueue;if(s===null)return null;if(s=s.shared,(ce&2)!==0){var i=s.pending;return i===null?t.next=t:(t.next=i.next,i.next=t),s.pending=t,Xt(e,n)}return i=s.interleaved,i===null?(t.next=t,Co(s)):(t.next=i.next,i.next=t),s.interleaved=t,Xt(e,n)}function ga(e,t,n){if(t=t.updateQueue,t!==null&&(t=t.shared,(n&4194240)!==0)){var s=t.lanes;s&=e.pendingLanes,n|=s,t.lanes=n,mo(e,n)}}function Ru(e,t){var n=e.updateQueue,s=e.alternate;if(s!==null&&(s=s.updateQueue,n===s)){var i=null,a=null;if(n=n.firstBaseUpdate,n!==null){do{var r={eventTime:n.eventTime,lane:n.lane,tag:n.tag,payload:n.payload,callback:n.callback,next:null};a===null?i=a=r:a=a.next=r,n=n.next}while(n!==null);a===null?i=a=t:a=a.next=t}else i=a=t;n={baseState:s.baseState,firstBaseUpdate:i,lastBaseUpdate:a,shared:s.shared,effects:s.effects},e.updateQueue=n;return}e=n.lastBaseUpdate,e===null?n.firstBaseUpdate=t:e.next=t,n.lastBaseUpdate=t}function Ka(e,t,n,s){var i=e.updateQueue;ln=!1;var a=i.firstBaseUpdate,r=i.lastBaseUpdate,l=i.shared.pending;if(l!==null){i.shared.pending=null;var u=l,c=u.next;u.next=null,r===null?a=c:r.next=c,r=u;var h=e.alternate;h!==null&&(h=h.updateQueue,l=h.lastBaseUpdate,l!==r&&(l===null?h.firstBaseUpdate=c:l.next=c,h.lastBaseUpdate=u))}if(a!==null){var $=i.baseState;r=0,h=c=u=null,l=a;do{var v=l.lane,N=l.eventTime;if((s&v)===v){h!==null&&(h=h.next={eventTime:N,lane:0,tag:l.tag,payload:l.payload,callback:l.callback,next:null});e:{var _=e,w=l;switch(v=t,N=n,w.tag){case 1:if(_=w.payload,typeof _=="function"){$=_.call(N,$,v);break e}$=_;break e;case 3:_.flags=_.flags&-65537|128;case 0:if(_=w.payload,v=typeof _=="function"?_.call(N,$,v):_,v==null)break e;$=Se({},$,v);break e;case 2:ln=!0}}l.callback!==null&&l.lane!==0&&(e.flags|=64,v=i.effects,v===null?i.effects=[l]:v.push(l))}else N={eventTime:N,lane:v,tag:l.tag,payload:l.payload,callback:l.callback,next:null},h===null?(c=h=N,u=$):h=h.next=N,r|=v;if(l=l.next,l===null){if(l=i.shared.pending,l===null)break;v=l,l=v.next,v.next=null,i.lastBaseUpdate=v,i.shared.pending=null}}while(!0);if(h===null&&(u=$),i.baseState=u,i.firstBaseUpdate=c,i.lastBaseUpdate=h,t=i.shared.interleaved,t!==null){i=t;do r|=i.lane,i=i.next;while(i!==t)}else a===null&&(i.shared.lanes=0);Bn|=r,e.lanes=r,e.memoizedState=$}}function Iu(e,t,n){if(e=t.effects,t.effects=null,e!==null)for(t=0;t<e.length;t++){var s=e[t],i=s.callback;if(i!==null){if(s.callback=null,s=n,typeof i!="function")throw Error(z(191,i));i.call(s)}}}var Ci={},Bt=kn(Ci),gi=kn(Ci),$i=kn(Ci);function In(e){if(e===Ci)throw Error(z(174));return e}function Ao(e,t){switch(ve($i,t),ve(gi,e),ve(Bt,Ci),e=t.nodeType,e){case 9:case 11:t=(t=t.documentElement)?t.namespaceURI:wl(null,"");break;default:e=e===8?t.parentNode:t,t=e.namespaceURI||null,e=e.tagName,t=wl(t,e)}he(Bt),ve(Bt,t)}function ks(){he(Bt),he(gi),he($i)}function ap(e){In($i.current);var t=In(Bt.current),n=wl(t,e.type);t!==n&&(ve(gi,e),ve(Bt,n))}function xo(e){gi.current===e&&(he(Bt),he(gi))}var ke=kn(0);function za(e){for(var t=e;t!==null;){if(t.tag===13){var n=t.memoizedState;if(n!==null&&(n=n.dehydrated,n===null||n.data==="$?"||n.data==="$!"))return t}else if(t.tag===19&&t.memoizedProps.revealOrder!==void 0){if((t.flags&128)!==0)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}var il=[];function Do(){for(var e=0;e<il.length;e++)il[e]._workInProgressVersionPrimary=null;il.length=0}var $a=Zt.ReactCurrentDispatcher,al=Zt.ReactCurrentBatchConfig,Un=0,_e=null,xe=null,Re=null,Ha=!1,si=!1,Ni=0,Yv=0;function Ke(){throw Error(z(321))}function Ro(e,t){if(t===null)return!1;for(var n=0;n<t.length&&n<e.length;n++)if(!xt(e[n],t[n]))return!1;return!0}function Io(e,t,n,s,i,a){if(Un=a,_e=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,$a.current=e===null||e.memoizedState===null?Zv:ey,e=n(s,i),si){a=0;do{if(si=!1,Ni=0,25<=a)throw Error(z(301));a+=1,Re=xe=null,t.updateQueue=null,$a.current=ty,e=n(s,i)}while(si)}if($a.current=Fa,t=xe!==null&&xe.next!==null,Un=0,Re=xe=_e=null,Ha=!1,t)throw Error(z(300));return e}function Lo(){var e=Ni!==0;return Ni=0,e}function Mt(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Re===null?_e.memoizedState=Re=e:Re=Re.next=e,Re}function Nt(){if(xe===null){var e=_e.alternate;e=e!==null?e.memoizedState:null}else e=xe.next;var t=Re===null?_e.memoizedState:Re.next;if(t!==null)Re=t,xe=e;else{if(e===null)throw Error(z(310));xe=e,e={memoizedState:xe.memoizedState,baseState:xe.baseState,baseQueue:xe.baseQueue,queue:xe.queue,next:null},Re===null?_e.memoizedState=Re=e:Re=Re.next=e}return Re}function wi(e,t){return typeof t=="function"?t(e):t}function rl(e){var t=Nt(),n=t.queue;if(n===null)throw Error(z(311));n.lastRenderedReducer=e;var s=xe,i=s.baseQueue,a=n.pending;if(a!==null){if(i!==null){var r=i.next;i.next=a.next,a.next=r}s.baseQueue=i=a,n.pending=null}if(i!==null){a=i.next,s=s.baseState;var l=r=null,u=null,c=a;do{var h=c.lane;if((Un&h)===h)u!==null&&(u=u.next={lane:0,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null}),s=c.hasEagerState?c.eagerState:e(s,c.action);else{var $={lane:h,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null};u===null?(l=u=$,r=s):u=u.next=$,_e.lanes|=h,Bn|=h}c=c.next}while(c!==null&&c!==a);u===null?r=s:u.next=l,xt(s,t.memoizedState)||(nt=!0),t.memoizedState=s,t.baseState=r,t.baseQueue=u,n.lastRenderedState=s}if(e=n.interleaved,e!==null){i=e;do a=i.lane,_e.lanes|=a,Bn|=a,i=i.next;while(i!==e)}else i===null&&(n.lanes=0);return[t.memoizedState,n.dispatch]}function ll(e){var t=Nt(),n=t.queue;if(n===null)throw Error(z(311));n.lastRenderedReducer=e;var s=n.dispatch,i=n.pending,a=t.memoizedState;if(i!==null){n.pending=null;var r=i=i.next;do a=e(a,r.action),r=r.next;while(r!==i);xt(a,t.memoizedState)||(nt=!0),t.memoizedState=a,t.baseQueue===null&&(t.baseState=a),n.lastRenderedState=a}return[a,s]}function rp(){}function lp(e,t){var n=_e,s=Nt(),i=t(),a=!xt(s.memoizedState,i);if(a&&(s.memoizedState=i,nt=!0),s=s.queue,Po(up.bind(null,n,s,e),[e]),s.getSnapshot!==t||a||Re!==null&&Re.memoizedState.tag&1){if(n.flags|=2048,bi(9,cp.bind(null,n,s,i,t),void 0,null),Ie===null)throw Error(z(349));(Un&30)!==0||op(n,t,i)}return i}function op(e,t,n){e.flags|=16384,e={getSnapshot:t,value:n},t=_e.updateQueue,t===null?(t={lastEffect:null,stores:null},_e.updateQueue=t,t.stores=[e]):(n=t.stores,n===null?t.stores=[e]:n.push(e))}function cp(e,t,n,s){t.value=n,t.getSnapshot=s,dp(t)&&pp(e)}function up(e,t,n){return n(function(){dp(t)&&pp(e)})}function dp(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!xt(e,n)}catch{return!0}}function pp(e){var t=Xt(e,1);t!==null&&At(t,e,1,-1)}function Lu(e){var t=Mt();return typeof e=="function"&&(e=e()),t.memoizedState=t.baseState=e,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:wi,lastRenderedState:e},t.queue=e,e=e.dispatch=Jv.bind(null,_e,e),[t.memoizedState,e]}function bi(e,t,n,s){return e={tag:e,create:t,destroy:n,deps:s,next:null},t=_e.updateQueue,t===null?(t={lastEffect:null,stores:null},_e.updateQueue=t,t.lastEffect=e.next=e):(n=t.lastEffect,n===null?t.lastEffect=e.next=e:(s=n.next,n.next=e,e.next=s,t.lastEffect=e)),e}function mp(){return Nt().memoizedState}function Na(e,t,n,s){var i=Mt();_e.flags|=e,i.memoizedState=bi(1|t,n,void 0,s===void 0?null:s)}function tr(e,t,n,s){var i=Nt();s=s===void 0?null:s;var a=void 0;if(xe!==null){var r=xe.memoizedState;if(a=r.destroy,s!==null&&Ro(s,r.deps)){i.memoizedState=bi(t,n,a,s);return}}_e.flags|=e,i.memoizedState=bi(1|t,n,a,s)}function Pu(e,t){return Na(8390656,8,e,t)}function Po(e,t){return tr(2048,8,e,t)}function fp(e,t){return tr(4,2,e,t)}function vp(e,t){return tr(4,4,e,t)}function yp(e,t){if(typeof t=="function")return e=e(),t(e),function(){t(null)};if(t!=null)return e=e(),t.current=e,function(){t.current=null}}function hp(e,t,n){return n=n!=null?n.concat([e]):null,tr(4,4,yp.bind(null,t,e),n)}function Mo(){}function gp(e,t){var n=Nt();t=t===void 0?null:t;var s=n.memoizedState;return s!==null&&t!==null&&Ro(t,s[1])?s[0]:(n.memoizedState=[e,t],e)}function $p(e,t){var n=Nt();t=t===void 0?null:t;var s=n.memoizedState;return s!==null&&t!==null&&Ro(t,s[1])?s[0]:(e=e(),n.memoizedState=[e,t],e)}function Np(e,t,n){return(Un&21)===0?(e.baseState&&(e.baseState=!1,nt=!0),e.memoizedState=n):(xt(n,t)||(n=Sd(),_e.lanes|=n,Bn|=n,e.baseState=!0),t)}function Qv(e,t){var n=de;de=n!==0&&4>n?n:4,e(!0);var s=al.transition;al.transition={};try{e(!1),t()}finally{de=n,al.transition=s}}function wp(){return Nt().memoizedState}function Xv(e,t,n){var s=gn(e);if(n={lane:s,action:n,hasEagerState:!1,eagerState:null,next:null},bp(e))kp(t,n);else if(n=sp(e,t,n,s),n!==null){var i=Qe();At(n,e,s,i),_p(n,t,s)}}function Jv(e,t,n){var s=gn(e),i={lane:s,action:n,hasEagerState:!1,eagerState:null,next:null};if(bp(e))kp(t,i);else{var a=e.alternate;if(e.lanes===0&&(a===null||a.lanes===0)&&(a=t.lastRenderedReducer,a!==null))try{var r=t.lastRenderedState,l=a(r,n);if(i.hasEagerState=!0,i.eagerState=l,xt(l,r)){var u=t.interleaved;u===null?(i.next=i,Co(t)):(i.next=u.next,u.next=i),t.interleaved=i;return}}catch{}n=sp(e,t,i,s),n!==null&&(i=Qe(),At(n,e,s,i),_p(n,t,s))}}function bp(e){var t=e.alternate;return e===_e||t!==null&&t===_e}function kp(e,t){si=Ha=!0;var n=e.pending;n===null?t.next=t:(t.next=n.next,n.next=t),e.pending=t}function _p(e,t,n){if((n&4194240)!==0){var s=t.lanes;s&=e.pendingLanes,n|=s,t.lanes=n,mo(e,n)}}var Fa={readContext:$t,useCallback:Ke,useContext:Ke,useEffect:Ke,useImperativeHandle:Ke,useInsertionEffect:Ke,useLayoutEffect:Ke,useMemo:Ke,useReducer:Ke,useRef:Ke,useState:Ke,useDebugValue:Ke,useDeferredValue:Ke,useTransition:Ke,useMutableSource:Ke,useSyncExternalStore:Ke,useId:Ke,unstable_isNewReconciler:!1},Zv={readContext:$t,useCallback:function(e,t){return Mt().memoizedState=[e,t===void 0?null:t],e},useContext:$t,useEffect:Pu,useImperativeHandle:function(e,t,n){return n=n!=null?n.concat([e]):null,Na(4194308,4,yp.bind(null,t,e),n)},useLayoutEffect:function(e,t){return Na(4194308,4,e,t)},useInsertionEffect:function(e,t){return Na(4,2,e,t)},useMemo:function(e,t){var n=Mt();return t=t===void 0?null:t,e=e(),n.memoizedState=[e,t],e},useReducer:function(e,t,n){var s=Mt();return t=n!==void 0?n(t):t,s.memoizedState=s.baseState=t,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:t},s.queue=e,e=e.dispatch=Xv.bind(null,_e,e),[s.memoizedState,e]},useRef:function(e){var t=Mt();return e={current:e},t.memoizedState=e},useState:Lu,useDebugValue:Mo,useDeferredValue:function(e){return Mt().memoizedState=e},useTransition:function(){var e=Lu(!1),t=e[0];return e=Qv.bind(null,e[1]),Mt().memoizedState=e,[t,e]},useMutableSource:function(){},useSyncExternalStore:function(e,t,n){var s=_e,i=Mt();if(be){if(n===void 0)throw Error(z(407));n=n()}else{if(n=t(),Ie===null)throw Error(z(349));(Un&30)!==0||op(s,t,n)}i.memoizedState=n;var a={value:n,getSnapshot:t};return i.queue=a,Pu(up.bind(null,s,a,e),[e]),s.flags|=2048,bi(9,cp.bind(null,s,a,n,t),void 0,null),n},useId:function(){var e=Mt(),t=Ie.identifierPrefix;if(be){var n=Wt,s=Vt;n=(s&~(1<<32-Tt(s)-1)).toString(32)+n,t=":"+t+"R"+n,n=Ni++,0<n&&(t+="H"+n.toString(32)),t+=":"}else n=Yv++,t=":"+t+"r"+n.toString(32)+":";return e.memoizedState=t},unstable_isNewReconciler:!1},ey={readContext:$t,useCallback:gp,useContext:$t,useEffect:Po,useImperativeHandle:hp,useInsertionEffect:fp,useLayoutEffect:vp,useMemo:$p,useReducer:rl,useRef:mp,useState:function(){return rl(wi)},useDebugValue:Mo,useDeferredValue:function(e){var t=Nt();return Np(t,xe.memoizedState,e)},useTransition:function(){var e=rl(wi)[0],t=Nt().memoizedState;return[e,t]},useMutableSource:rp,useSyncExternalStore:lp,useId:wp,unstable_isNewReconciler:!1},ty={readContext:$t,useCallback:gp,useContext:$t,useEffect:Po,useImperativeHandle:hp,useInsertionEffect:fp,useLayoutEffect:vp,useMemo:$p,useReducer:ll,useRef:mp,useState:function(){return ll(wi)},useDebugValue:Mo,useDeferredValue:function(e){var t=Nt();return xe===null?t.memoizedState=e:Np(t,xe.memoizedState,e)},useTransition:function(){var e=ll(wi)[0],t=Nt().memoizedState;return[e,t]},useMutableSource:rp,useSyncExternalStore:lp,useId:wp,unstable_isNewReconciler:!1};function St(e,t){if(e&&e.defaultProps){t=Se({},t),e=e.defaultProps;for(var n in e)t[n]===void 0&&(t[n]=e[n]);return t}return t}function Hl(e,t,n,s){t=e.memoizedState,n=n(s,t),n=n==null?t:Se({},t,n),e.memoizedState=n,e.lanes===0&&(e.updateQueue.baseState=n)}var nr={isMounted:function(e){return(e=e._reactInternals)?Hn(e)===e:!1},enqueueSetState:function(e,t,n){e=e._reactInternals;var s=Qe(),i=gn(e),a=jt(s,i);a.payload=t,n!=null&&(a.callback=n),t=yn(e,a,i),t!==null&&(At(t,e,i,s),ga(t,e,i))},enqueueReplaceState:function(e,t,n){e=e._reactInternals;var s=Qe(),i=gn(e),a=jt(s,i);a.tag=1,a.payload=t,n!=null&&(a.callback=n),t=yn(e,a,i),t!==null&&(At(t,e,i,s),ga(t,e,i))},enqueueForceUpdate:function(e,t){e=e._reactInternals;var n=Qe(),s=gn(e),i=jt(n,s);i.tag=2,t!=null&&(i.callback=t),t=yn(e,i,s),t!==null&&(At(t,e,s,n),ga(t,e,s))}};function Mu(e,t,n,s,i,a,r){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(s,a,r):t.prototype&&t.prototype.isPureReactComponent?!fi(n,s)||!fi(i,a):!0}function Sp(e,t,n){var s=!1,i=wn,a=t.contextType;return typeof a=="object"&&a!==null?a=$t(a):(i=it(t)?Mn:Fe.current,s=t.contextTypes,a=(s=s!=null)?Ns(e,i):wn),t=new t(n,a),e.memoizedState=t.state!==null&&t.state!==void 0?t.state:null,t.updater=nr,e.stateNode=t,t._reactInternals=e,s&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=i,e.__reactInternalMemoizedMaskedChildContext=a),t}function Ou(e,t,n,s){e=t.state,typeof t.componentWillReceiveProps=="function"&&t.componentWillReceiveProps(n,s),typeof t.UNSAFE_componentWillReceiveProps=="function"&&t.UNSAFE_componentWillReceiveProps(n,s),t.state!==e&&nr.enqueueReplaceState(t,t.state,null)}function Fl(e,t,n,s){var i=e.stateNode;i.props=n,i.state=e.memoizedState,i.refs={},To(e);var a=t.contextType;typeof a=="object"&&a!==null?i.context=$t(a):(a=it(t)?Mn:Fe.current,i.context=Ns(e,a)),i.state=e.memoizedState,a=t.getDerivedStateFromProps,typeof a=="function"&&(Hl(e,t,a,n),i.state=e.memoizedState),typeof t.getDerivedStateFromProps=="function"||typeof i.getSnapshotBeforeUpdate=="function"||typeof i.UNSAFE_componentWillMount!="function"&&typeof i.componentWillMount!="function"||(t=i.state,typeof i.componentWillMount=="function"&&i.componentWillMount(),typeof i.UNSAFE_componentWillMount=="function"&&i.UNSAFE_componentWillMount(),t!==i.state&&nr.enqueueReplaceState(i,i.state,null),Ka(e,n,i,s),i.state=e.memoizedState),typeof i.componentDidMount=="function"&&(e.flags|=4194308)}function _s(e,t){try{var n="",s=t;do n+=Df(s),s=s.return;while(s);var i=n}catch(a){i=`
Error generating stack: `+a.message+`
`+a.stack}return{value:e,source:t,stack:i,digest:null}}function ol(e,t,n){return{value:e,source:null,stack:n??null,digest:t??null}}function ql(e,t){try{console.error(t.value)}catch(n){setTimeout(function(){throw n})}}var ny=typeof WeakMap=="function"?WeakMap:Map;function Ep(e,t,n){n=jt(-1,n),n.tag=3,n.payload={element:null};var s=t.value;return n.callback=function(){Ga||(Ga=!0,eo=s),ql(e,t)},n}function Cp(e,t,n){n=jt(-1,n),n.tag=3;var s=e.type.getDerivedStateFromError;if(typeof s=="function"){var i=t.value;n.payload=function(){return s(i)},n.callback=function(){ql(e,t)}}var a=e.stateNode;return a!==null&&typeof a.componentDidCatch=="function"&&(n.callback=function(){ql(e,t),typeof s!="function"&&(hn===null?hn=new Set([this]):hn.add(this));var r=t.stack;this.componentDidCatch(t.value,{componentStack:r!==null?r:""})}),n}function Uu(e,t,n){var s=e.pingCache;if(s===null){s=e.pingCache=new ny;var i=new Set;s.set(t,i)}else i=s.get(t),i===void 0&&(i=new Set,s.set(t,i));i.has(n)||(i.add(n),e=yy.bind(null,e,t,n),t.then(e,e))}function Bu(e){do{var t;if((t=e.tag===13)&&(t=e.memoizedState,t=t!==null?t.dehydrated!==null:!0),t)return e;e=e.return}while(e!==null);return null}function Ku(e,t,n,s,i){return(e.mode&1)===0?(e===t?e.flags|=65536:(e.flags|=128,n.flags|=131072,n.flags&=-52805,n.tag===1&&(n.alternate===null?n.tag=17:(t=jt(-1,1),t.tag=2,yn(n,t,1))),n.lanes|=1),e):(e.flags|=65536,e.lanes=i,e)}var sy=Zt.ReactCurrentOwner,nt=!1;function Ye(e,t,n,s){t.child=e===null?np(t,null,n,s):bs(t,e.child,n,s)}function zu(e,t,n,s,i){n=n.render;var a=t.ref;return hs(t,i),s=Io(e,t,n,s,a,i),n=Lo(),e!==null&&!nt?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~i,Jt(e,t,i)):(be&&n&&wo(t),t.flags|=1,Ye(e,t,s,i),t.child)}function Hu(e,t,n,s,i){if(e===null){var a=n.type;return typeof a=="function"&&!qo(a)&&a.defaultProps===void 0&&n.compare===null&&n.defaultProps===void 0?(t.tag=15,t.type=a,Tp(e,t,a,s,i)):(e=_a(n.type,null,s,t,t.mode,i),e.ref=t.ref,e.return=t,t.child=e)}if(a=e.child,(e.lanes&i)===0){var r=a.memoizedProps;if(n=n.compare,n=n!==null?n:fi,n(r,s)&&e.ref===t.ref)return Jt(e,t,i)}return t.flags|=1,e=$n(a,s),e.ref=t.ref,e.return=t,t.child=e}function Tp(e,t,n,s,i){if(e!==null){var a=e.memoizedProps;if(fi(a,s)&&e.ref===t.ref)if(nt=!1,t.pendingProps=s=a,(e.lanes&i)!==0)(e.flags&131072)!==0&&(nt=!0);else return t.lanes=e.lanes,Jt(e,t,i)}return Gl(e,t,n,s,i)}function Ap(e,t,n){var s=t.pendingProps,i=s.children,a=e!==null?e.memoizedState:null;if(s.mode==="hidden")if((t.mode&1)===0)t.memoizedState={baseLanes:0,cachePool:null,transitions:null},ve(ps,lt),lt|=n;else{if((n&1073741824)===0)return e=a!==null?a.baseLanes|n:n,t.lanes=t.childLanes=1073741824,t.memoizedState={baseLanes:e,cachePool:null,transitions:null},t.updateQueue=null,ve(ps,lt),lt|=e,null;t.memoizedState={baseLanes:0,cachePool:null,transitions:null},s=a!==null?a.baseLanes:n,ve(ps,lt),lt|=s}else a!==null?(s=a.baseLanes|n,t.memoizedState=null):s=n,ve(ps,lt),lt|=s;return Ye(e,t,i,n),t.child}function xp(e,t){var n=t.ref;(e===null&&n!==null||e!==null&&e.ref!==n)&&(t.flags|=512,t.flags|=2097152)}function Gl(e,t,n,s,i){var a=it(n)?Mn:Fe.current;return a=Ns(t,a),hs(t,i),n=Io(e,t,n,s,a,i),s=Lo(),e!==null&&!nt?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~i,Jt(e,t,i)):(be&&s&&wo(t),t.flags|=1,Ye(e,t,n,i),t.child)}function Fu(e,t,n,s,i){if(it(n)){var a=!0;Pa(t)}else a=!1;if(hs(t,i),t.stateNode===null)wa(e,t),Sp(t,n,s),Fl(t,n,s,i),s=!0;else if(e===null){var r=t.stateNode,l=t.memoizedProps;r.props=l;var u=r.context,c=n.contextType;typeof c=="object"&&c!==null?c=$t(c):(c=it(n)?Mn:Fe.current,c=Ns(t,c));var h=n.getDerivedStateFromProps,$=typeof h=="function"||typeof r.getSnapshotBeforeUpdate=="function";$||typeof r.UNSAFE_componentWillReceiveProps!="function"&&typeof r.componentWillReceiveProps!="function"||(l!==s||u!==c)&&Ou(t,r,s,c),ln=!1;var v=t.memoizedState;r.state=v,Ka(t,s,r,i),u=t.memoizedState,l!==s||v!==u||st.current||ln?(typeof h=="function"&&(Hl(t,n,h,s),u=t.memoizedState),(l=ln||Mu(t,n,l,s,v,u,c))?($||typeof r.UNSAFE_componentWillMount!="function"&&typeof r.componentWillMount!="function"||(typeof r.componentWillMount=="function"&&r.componentWillMount(),typeof r.UNSAFE_componentWillMount=="function"&&r.UNSAFE_componentWillMount()),typeof r.componentDidMount=="function"&&(t.flags|=4194308)):(typeof r.componentDidMount=="function"&&(t.flags|=4194308),t.memoizedProps=s,t.memoizedState=u),r.props=s,r.state=u,r.context=c,s=l):(typeof r.componentDidMount=="function"&&(t.flags|=4194308),s=!1)}else{r=t.stateNode,ip(e,t),l=t.memoizedProps,c=t.type===t.elementType?l:St(t.type,l),r.props=c,$=t.pendingProps,v=r.context,u=n.contextType,typeof u=="object"&&u!==null?u=$t(u):(u=it(n)?Mn:Fe.current,u=Ns(t,u));var N=n.getDerivedStateFromProps;(h=typeof N=="function"||typeof r.getSnapshotBeforeUpdate=="function")||typeof r.UNSAFE_componentWillReceiveProps!="function"&&typeof r.componentWillReceiveProps!="function"||(l!==$||v!==u)&&Ou(t,r,s,u),ln=!1,v=t.memoizedState,r.state=v,Ka(t,s,r,i);var _=t.memoizedState;l!==$||v!==_||st.current||ln?(typeof N=="function"&&(Hl(t,n,N,s),_=t.memoizedState),(c=ln||Mu(t,n,c,s,v,_,u)||!1)?(h||typeof r.UNSAFE_componentWillUpdate!="function"&&typeof r.componentWillUpdate!="function"||(typeof r.componentWillUpdate=="function"&&r.componentWillUpdate(s,_,u),typeof r.UNSAFE_componentWillUpdate=="function"&&r.UNSAFE_componentWillUpdate(s,_,u)),typeof r.componentDidUpdate=="function"&&(t.flags|=4),typeof r.getSnapshotBeforeUpdate=="function"&&(t.flags|=1024)):(typeof r.componentDidUpdate!="function"||l===e.memoizedProps&&v===e.memoizedState||(t.flags|=4),typeof r.getSnapshotBeforeUpdate!="function"||l===e.memoizedProps&&v===e.memoizedState||(t.flags|=1024),t.memoizedProps=s,t.memoizedState=_),r.props=s,r.state=_,r.context=u,s=c):(typeof r.componentDidUpdate!="function"||l===e.memoizedProps&&v===e.memoizedState||(t.flags|=4),typeof r.getSnapshotBeforeUpdate!="function"||l===e.memoizedProps&&v===e.memoizedState||(t.flags|=1024),s=!1)}return Vl(e,t,n,s,a,i)}function Vl(e,t,n,s,i,a){xp(e,t);var r=(t.flags&128)!==0;if(!s&&!r)return i&&Tu(t,n,!1),Jt(e,t,a);s=t.stateNode,sy.current=t;var l=r&&typeof n.getDerivedStateFromError!="function"?null:s.render();return t.flags|=1,e!==null&&r?(t.child=bs(t,e.child,null,a),t.child=bs(t,null,l,a)):Ye(e,t,l,a),t.memoizedState=s.state,i&&Tu(t,n,!0),t.child}function Dp(e){var t=e.stateNode;t.pendingContext?Cu(e,t.pendingContext,t.pendingContext!==t.context):t.context&&Cu(e,t.context,!1),Ao(e,t.containerInfo)}function qu(e,t,n,s,i){return ws(),ko(i),t.flags|=256,Ye(e,t,n,s),t.child}var Wl={dehydrated:null,treeContext:null,retryLane:0};function jl(e){return{baseLanes:e,cachePool:null,transitions:null}}function Rp(e,t,n){var s=t.pendingProps,i=ke.current,a=!1,r=(t.flags&128)!==0,l;if((l=r)||(l=e!==null&&e.memoizedState===null?!1:(i&2)!==0),l?(a=!0,t.flags&=-129):(e===null||e.memoizedState!==null)&&(i|=1),ve(ke,i&1),e===null)return Kl(t),e=t.memoizedState,e!==null&&(e=e.dehydrated,e!==null)?((t.mode&1)===0?t.lanes=1:e.data==="$!"?t.lanes=8:t.lanes=1073741824,null):(r=s.children,e=s.fallback,a?(s=t.mode,a=t.child,r={mode:"hidden",children:r},(s&1)===0&&a!==null?(a.childLanes=0,a.pendingProps=r):a=ar(r,s,0,null),e=Pn(e,s,n,null),a.return=t,e.return=t,a.sibling=e,t.child=a,t.child.memoizedState=jl(n),t.memoizedState=Wl,e):Oo(t,r));if(i=e.memoizedState,i!==null&&(l=i.dehydrated,l!==null))return iy(e,t,r,s,l,i,n);if(a){a=s.fallback,r=t.mode,i=e.child,l=i.sibling;var u={mode:"hidden",children:s.children};return(r&1)===0&&t.child!==i?(s=t.child,s.childLanes=0,s.pendingProps=u,t.deletions=null):(s=$n(i,u),s.subtreeFlags=i.subtreeFlags&14680064),l!==null?a=$n(l,a):(a=Pn(a,r,n,null),a.flags|=2),a.return=t,s.return=t,s.sibling=a,t.child=s,s=a,a=t.child,r=e.child.memoizedState,r=r===null?jl(n):{baseLanes:r.baseLanes|n,cachePool:null,transitions:r.transitions},a.memoizedState=r,a.childLanes=e.childLanes&~n,t.memoizedState=Wl,s}return a=e.child,e=a.sibling,s=$n(a,{mode:"visible",children:s.children}),(t.mode&1)===0&&(s.lanes=n),s.return=t,s.sibling=null,e!==null&&(n=t.deletions,n===null?(t.deletions=[e],t.flags|=16):n.push(e)),t.child=s,t.memoizedState=null,s}function Oo(e,t){return t=ar({mode:"visible",children:t},e.mode,0,null),t.return=e,e.child=t}function pa(e,t,n,s){return s!==null&&ko(s),bs(t,e.child,null,n),e=Oo(t,t.pendingProps.children),e.flags|=2,t.memoizedState=null,e}function iy(e,t,n,s,i,a,r){if(n)return t.flags&256?(t.flags&=-257,s=ol(Error(z(422))),pa(e,t,r,s)):t.memoizedState!==null?(t.child=e.child,t.flags|=128,null):(a=s.fallback,i=t.mode,s=ar({mode:"visible",children:s.children},i,0,null),a=Pn(a,i,r,null),a.flags|=2,s.return=t,a.return=t,s.sibling=a,t.child=s,(t.mode&1)!==0&&bs(t,e.child,null,r),t.child.memoizedState=jl(r),t.memoizedState=Wl,a);if((t.mode&1)===0)return pa(e,t,r,null);if(i.data==="$!"){if(s=i.nextSibling&&i.nextSibling.dataset,s)var l=s.dgst;return s=l,a=Error(z(419)),s=ol(a,s,void 0),pa(e,t,r,s)}if(l=(r&e.childLanes)!==0,nt||l){if(s=Ie,s!==null){switch(r&-r){case 4:i=2;break;case 16:i=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:i=32;break;case 536870912:i=268435456;break;default:i=0}i=(i&(s.suspendedLanes|r))!==0?0:i,i!==0&&i!==a.retryLane&&(a.retryLane=i,Xt(e,i),At(s,e,i,-1))}return Fo(),s=ol(Error(z(421))),pa(e,t,r,s)}return i.data==="$?"?(t.flags|=128,t.child=e.child,t=hy.bind(null,e),i._reactRetry=t,null):(e=a.treeContext,ot=vn(i.nextSibling),ct=t,be=!0,Ct=null,e!==null&&(vt[yt++]=Vt,vt[yt++]=Wt,vt[yt++]=On,Vt=e.id,Wt=e.overflow,On=t),t=Oo(t,s.children),t.flags|=4096,t)}function Gu(e,t,n){e.lanes|=t;var s=e.alternate;s!==null&&(s.lanes|=t),zl(e.return,t,n)}function cl(e,t,n,s,i){var a=e.memoizedState;a===null?e.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:s,tail:n,tailMode:i}:(a.isBackwards=t,a.rendering=null,a.renderingStartTime=0,a.last=s,a.tail=n,a.tailMode=i)}function Ip(e,t,n){var s=t.pendingProps,i=s.revealOrder,a=s.tail;if(Ye(e,t,s.children,n),s=ke.current,(s&2)!==0)s=s&1|2,t.flags|=128;else{if(e!==null&&(e.flags&128)!==0)e:for(e=t.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&Gu(e,n,t);else if(e.tag===19)Gu(e,n,t);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break e;for(;e.sibling===null;){if(e.return===null||e.return===t)break e;e=e.return}e.sibling.return=e.return,e=e.sibling}s&=1}if(ve(ke,s),(t.mode&1)===0)t.memoizedState=null;else switch(i){case"forwards":for(n=t.child,i=null;n!==null;)e=n.alternate,e!==null&&za(e)===null&&(i=n),n=n.sibling;n=i,n===null?(i=t.child,t.child=null):(i=n.sibling,n.sibling=null),cl(t,!1,i,n,a);break;case"backwards":for(n=null,i=t.child,t.child=null;i!==null;){if(e=i.alternate,e!==null&&za(e)===null){t.child=i;break}e=i.sibling,i.sibling=n,n=i,i=e}cl(t,!0,n,null,a);break;case"together":cl(t,!1,null,null,void 0);break;default:t.memoizedState=null}return t.child}function wa(e,t){(t.mode&1)===0&&e!==null&&(e.alternate=null,t.alternate=null,t.flags|=2)}function Jt(e,t,n){if(e!==null&&(t.dependencies=e.dependencies),Bn|=t.lanes,(n&t.childLanes)===0)return null;if(e!==null&&t.child!==e.child)throw Error(z(153));if(t.child!==null){for(e=t.child,n=$n(e,e.pendingProps),t.child=n,n.return=t;e.sibling!==null;)e=e.sibling,n=n.sibling=$n(e,e.pendingProps),n.return=t;n.sibling=null}return t.child}function ay(e,t,n){switch(t.tag){case 3:Dp(t),ws();break;case 5:ap(t);break;case 1:it(t.type)&&Pa(t);break;case 4:Ao(t,t.stateNode.containerInfo);break;case 10:var s=t.type._context,i=t.memoizedProps.value;ve(Ua,s._currentValue),s._currentValue=i;break;case 13:if(s=t.memoizedState,s!==null)return s.dehydrated!==null?(ve(ke,ke.current&1),t.flags|=128,null):(n&t.child.childLanes)!==0?Rp(e,t,n):(ve(ke,ke.current&1),e=Jt(e,t,n),e!==null?e.sibling:null);ve(ke,ke.current&1);break;case 19:if(s=(n&t.childLanes)!==0,(e.flags&128)!==0){if(s)return Ip(e,t,n);t.flags|=128}if(i=t.memoizedState,i!==null&&(i.rendering=null,i.tail=null,i.lastEffect=null),ve(ke,ke.current),s)break;return null;case 22:case 23:return t.lanes=0,Ap(e,t,n)}return Jt(e,t,n)}var Lp,Yl,Pp,Mp;Lp=function(e,t){for(var n=t.child;n!==null;){if(n.tag===5||n.tag===6)e.appendChild(n.stateNode);else if(n.tag!==4&&n.child!==null){n.child.return=n,n=n.child;continue}if(n===t)break;for(;n.sibling===null;){if(n.return===null||n.return===t)return;n=n.return}n.sibling.return=n.return,n=n.sibling}};Yl=function(){};Pp=function(e,t,n,s){var i=e.memoizedProps;if(i!==s){e=t.stateNode,In(Bt.current);var a=null;switch(n){case"input":i=hl(e,i),s=hl(e,s),a=[];break;case"select":i=Se({},i,{value:void 0}),s=Se({},s,{value:void 0}),a=[];break;case"textarea":i=Nl(e,i),s=Nl(e,s),a=[];break;default:typeof i.onClick!="function"&&typeof s.onClick=="function"&&(e.onclick=Ia)}bl(n,s);var r;n=null;for(c in i)if(!s.hasOwnProperty(c)&&i.hasOwnProperty(c)&&i[c]!=null)if(c==="style"){var l=i[c];for(r in l)l.hasOwnProperty(r)&&(n||(n={}),n[r]="")}else c!=="dangerouslySetInnerHTML"&&c!=="children"&&c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&c!=="autoFocus"&&(li.hasOwnProperty(c)?a||(a=[]):(a=a||[]).push(c,null));for(c in s){var u=s[c];if(l=i?.[c],s.hasOwnProperty(c)&&u!==l&&(u!=null||l!=null))if(c==="style")if(l){for(r in l)!l.hasOwnProperty(r)||u&&u.hasOwnProperty(r)||(n||(n={}),n[r]="");for(r in u)u.hasOwnProperty(r)&&l[r]!==u[r]&&(n||(n={}),n[r]=u[r])}else n||(a||(a=[]),a.push(c,n)),n=u;else c==="dangerouslySetInnerHTML"?(u=u?u.__html:void 0,l=l?l.__html:void 0,u!=null&&l!==u&&(a=a||[]).push(c,u)):c==="children"?typeof u!="string"&&typeof u!="number"||(a=a||[]).push(c,""+u):c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&(li.hasOwnProperty(c)?(u!=null&&c==="onScroll"&&ye("scroll",e),a||l===u||(a=[])):(a=a||[]).push(c,u))}n&&(a=a||[]).push("style",n);var c=a;(t.updateQueue=c)&&(t.flags|=4)}};Mp=function(e,t,n,s){n!==s&&(t.flags|=4)};function Gs(e,t){if(!be)switch(e.tailMode){case"hidden":t=e.tail;for(var n=null;t!==null;)t.alternate!==null&&(n=t),t=t.sibling;n===null?e.tail=null:n.sibling=null;break;case"collapsed":n=e.tail;for(var s=null;n!==null;)n.alternate!==null&&(s=n),n=n.sibling;s===null?t||e.tail===null?e.tail=null:e.tail.sibling=null:s.sibling=null}}function ze(e){var t=e.alternate!==null&&e.alternate.child===e.child,n=0,s=0;if(t)for(var i=e.child;i!==null;)n|=i.lanes|i.childLanes,s|=i.subtreeFlags&14680064,s|=i.flags&14680064,i.return=e,i=i.sibling;else for(i=e.child;i!==null;)n|=i.lanes|i.childLanes,s|=i.subtreeFlags,s|=i.flags,i.return=e,i=i.sibling;return e.subtreeFlags|=s,e.childLanes=n,t}function ry(e,t,n){var s=t.pendingProps;switch(bo(t),t.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return ze(t),null;case 1:return it(t.type)&&La(),ze(t),null;case 3:return s=t.stateNode,ks(),he(st),he(Fe),Do(),s.pendingContext&&(s.context=s.pendingContext,s.pendingContext=null),(e===null||e.child===null)&&(ua(t)?t.flags|=4:e===null||e.memoizedState.isDehydrated&&(t.flags&256)===0||(t.flags|=1024,Ct!==null&&(so(Ct),Ct=null))),Yl(e,t),ze(t),null;case 5:xo(t);var i=In($i.current);if(n=t.type,e!==null&&t.stateNode!=null)Pp(e,t,n,s,i),e.ref!==t.ref&&(t.flags|=512,t.flags|=2097152);else{if(!s){if(t.stateNode===null)throw Error(z(166));return ze(t),null}if(e=In(Bt.current),ua(t)){s=t.stateNode,n=t.type;var a=t.memoizedProps;switch(s[Ot]=t,s[hi]=a,e=(t.mode&1)!==0,n){case"dialog":ye("cancel",s),ye("close",s);break;case"iframe":case"object":case"embed":ye("load",s);break;case"video":case"audio":for(i=0;i<Xs.length;i++)ye(Xs[i],s);break;case"source":ye("error",s);break;case"img":case"image":case"link":ye("error",s),ye("load",s);break;case"details":ye("toggle",s);break;case"input":Zc(s,a),ye("invalid",s);break;case"select":s._wrapperState={wasMultiple:!!a.multiple},ye("invalid",s);break;case"textarea":tu(s,a),ye("invalid",s)}bl(n,a),i=null;for(var r in a)if(a.hasOwnProperty(r)){var l=a[r];r==="children"?typeof l=="string"?s.textContent!==l&&(a.suppressHydrationWarning!==!0&&ca(s.textContent,l,e),i=["children",l]):typeof l=="number"&&s.textContent!==""+l&&(a.suppressHydrationWarning!==!0&&ca(s.textContent,l,e),i=["children",""+l]):li.hasOwnProperty(r)&&l!=null&&r==="onScroll"&&ye("scroll",s)}switch(n){case"input":Xi(s),eu(s,a,!0);break;case"textarea":Xi(s),nu(s);break;case"select":case"option":break;default:typeof a.onClick=="function"&&(s.onclick=Ia)}s=i,t.updateQueue=s,s!==null&&(t.flags|=4)}else{r=i.nodeType===9?i:i.ownerDocument,e==="http://www.w3.org/1999/xhtml"&&(e=ud(n)),e==="http://www.w3.org/1999/xhtml"?n==="script"?(e=r.createElement("div"),e.innerHTML="<script><\/script>",e=e.removeChild(e.firstChild)):typeof s.is=="string"?e=r.createElement(n,{is:s.is}):(e=r.createElement(n),n==="select"&&(r=e,s.multiple?r.multiple=!0:s.size&&(r.size=s.size))):e=r.createElementNS(e,n),e[Ot]=t,e[hi]=s,Lp(e,t,!1,!1),t.stateNode=e;e:{switch(r=kl(n,s),n){case"dialog":ye("cancel",e),ye("close",e),i=s;break;case"iframe":case"object":case"embed":ye("load",e),i=s;break;case"video":case"audio":for(i=0;i<Xs.length;i++)ye(Xs[i],e);i=s;break;case"source":ye("error",e),i=s;break;case"img":case"image":case"link":ye("error",e),ye("load",e),i=s;break;case"details":ye("toggle",e),i=s;break;case"input":Zc(e,s),i=hl(e,s),ye("invalid",e);break;case"option":i=s;break;case"select":e._wrapperState={wasMultiple:!!s.multiple},i=Se({},s,{value:void 0}),ye("invalid",e);break;case"textarea":tu(e,s),i=Nl(e,s),ye("invalid",e);break;default:i=s}bl(n,i),l=i;for(a in l)if(l.hasOwnProperty(a)){var u=l[a];a==="style"?md(e,u):a==="dangerouslySetInnerHTML"?(u=u?u.__html:void 0,u!=null&&dd(e,u)):a==="children"?typeof u=="string"?(n!=="textarea"||u!=="")&&oi(e,u):typeof u=="number"&&oi(e,""+u):a!=="suppressContentEditableWarning"&&a!=="suppressHydrationWarning"&&a!=="autoFocus"&&(li.hasOwnProperty(a)?u!=null&&a==="onScroll"&&ye("scroll",e):u!=null&&ro(e,a,u,r))}switch(n){case"input":Xi(e),eu(e,s,!1);break;case"textarea":Xi(e),nu(e);break;case"option":s.value!=null&&e.setAttribute("value",""+Nn(s.value));break;case"select":e.multiple=!!s.multiple,a=s.value,a!=null?ms(e,!!s.multiple,a,!1):s.defaultValue!=null&&ms(e,!!s.multiple,s.defaultValue,!0);break;default:typeof i.onClick=="function"&&(e.onclick=Ia)}switch(n){case"button":case"input":case"select":case"textarea":s=!!s.autoFocus;break e;case"img":s=!0;break e;default:s=!1}}s&&(t.flags|=4)}t.ref!==null&&(t.flags|=512,t.flags|=2097152)}return ze(t),null;case 6:if(e&&t.stateNode!=null)Mp(e,t,e.memoizedProps,s);else{if(typeof s!="string"&&t.stateNode===null)throw Error(z(166));if(n=In($i.current),In(Bt.current),ua(t)){if(s=t.stateNode,n=t.memoizedProps,s[Ot]=t,(a=s.nodeValue!==n)&&(e=ct,e!==null))switch(e.tag){case 3:ca(s.nodeValue,n,(e.mode&1)!==0);break;case 5:e.memoizedProps.suppressHydrationWarning!==!0&&ca(s.nodeValue,n,(e.mode&1)!==0)}a&&(t.flags|=4)}else s=(n.nodeType===9?n:n.ownerDocument).createTextNode(s),s[Ot]=t,t.stateNode=s}return ze(t),null;case 13:if(he(ke),s=t.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(be&&ot!==null&&(t.mode&1)!==0&&(t.flags&128)===0)ep(),ws(),t.flags|=98560,a=!1;else if(a=ua(t),s!==null&&s.dehydrated!==null){if(e===null){if(!a)throw Error(z(318));if(a=t.memoizedState,a=a!==null?a.dehydrated:null,!a)throw Error(z(317));a[Ot]=t}else ws(),(t.flags&128)===0&&(t.memoizedState=null),t.flags|=4;ze(t),a=!1}else Ct!==null&&(so(Ct),Ct=null),a=!0;if(!a)return t.flags&65536?t:null}return(t.flags&128)!==0?(t.lanes=n,t):(s=s!==null,s!==(e!==null&&e.memoizedState!==null)&&s&&(t.child.flags|=8192,(t.mode&1)!==0&&(e===null||(ke.current&1)!==0?De===0&&(De=3):Fo())),t.updateQueue!==null&&(t.flags|=4),ze(t),null);case 4:return ks(),Yl(e,t),e===null&&vi(t.stateNode.containerInfo),ze(t),null;case 10:return Eo(t.type._context),ze(t),null;case 17:return it(t.type)&&La(),ze(t),null;case 19:if(he(ke),a=t.memoizedState,a===null)return ze(t),null;if(s=(t.flags&128)!==0,r=a.rendering,r===null)if(s)Gs(a,!1);else{if(De!==0||e!==null&&(e.flags&128)!==0)for(e=t.child;e!==null;){if(r=za(e),r!==null){for(t.flags|=128,Gs(a,!1),s=r.updateQueue,s!==null&&(t.updateQueue=s,t.flags|=4),t.subtreeFlags=0,s=n,n=t.child;n!==null;)a=n,e=s,a.flags&=14680066,r=a.alternate,r===null?(a.childLanes=0,a.lanes=e,a.child=null,a.subtreeFlags=0,a.memoizedProps=null,a.memoizedState=null,a.updateQueue=null,a.dependencies=null,a.stateNode=null):(a.childLanes=r.childLanes,a.lanes=r.lanes,a.child=r.child,a.subtreeFlags=0,a.deletions=null,a.memoizedProps=r.memoizedProps,a.memoizedState=r.memoizedState,a.updateQueue=r.updateQueue,a.type=r.type,e=r.dependencies,a.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext}),n=n.sibling;return ve(ke,ke.current&1|2),t.child}e=e.sibling}a.tail!==null&&Ce()>Ss&&(t.flags|=128,s=!0,Gs(a,!1),t.lanes=4194304)}else{if(!s)if(e=za(r),e!==null){if(t.flags|=128,s=!0,n=e.updateQueue,n!==null&&(t.updateQueue=n,t.flags|=4),Gs(a,!0),a.tail===null&&a.tailMode==="hidden"&&!r.alternate&&!be)return ze(t),null}else 2*Ce()-a.renderingStartTime>Ss&&n!==1073741824&&(t.flags|=128,s=!0,Gs(a,!1),t.lanes=4194304);a.isBackwards?(r.sibling=t.child,t.child=r):(n=a.last,n!==null?n.sibling=r:t.child=r,a.last=r)}return a.tail!==null?(t=a.tail,a.rendering=t,a.tail=t.sibling,a.renderingStartTime=Ce(),t.sibling=null,n=ke.current,ve(ke,s?n&1|2:n&1),t):(ze(t),null);case 22:case 23:return Ho(),s=t.memoizedState!==null,e!==null&&e.memoizedState!==null!==s&&(t.flags|=8192),s&&(t.mode&1)!==0?(lt&1073741824)!==0&&(ze(t),t.subtreeFlags&6&&(t.flags|=8192)):ze(t),null;case 24:return null;case 25:return null}throw Error(z(156,t.tag))}function ly(e,t){switch(bo(t),t.tag){case 1:return it(t.type)&&La(),e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 3:return ks(),he(st),he(Fe),Do(),e=t.flags,(e&65536)!==0&&(e&128)===0?(t.flags=e&-65537|128,t):null;case 5:return xo(t),null;case 13:if(he(ke),e=t.memoizedState,e!==null&&e.dehydrated!==null){if(t.alternate===null)throw Error(z(340));ws()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 19:return he(ke),null;case 4:return ks(),null;case 10:return Eo(t.type._context),null;case 22:case 23:return Ho(),null;case 24:return null;default:return null}}var ma=!1,He=!1,oy=typeof WeakSet=="function"?WeakSet:Set,Q=null;function ds(e,t){var n=e.ref;if(n!==null)if(typeof n=="function")try{n(null)}catch(s){Ee(e,t,s)}else n.current=null}function Ql(e,t,n){try{n()}catch(s){Ee(e,t,s)}}var Vu=!1;function cy(e,t){if(Il=xa,e=zd(),No(e)){if("selectionStart"in e)var n={start:e.selectionStart,end:e.selectionEnd};else e:{n=(n=e.ownerDocument)&&n.defaultView||window;var s=n.getSelection&&n.getSelection();if(s&&s.rangeCount!==0){n=s.anchorNode;var i=s.anchorOffset,a=s.focusNode;s=s.focusOffset;try{n.nodeType,a.nodeType}catch{n=null;break e}var r=0,l=-1,u=-1,c=0,h=0,$=e,v=null;t:for(;;){for(var N;$!==n||i!==0&&$.nodeType!==3||(l=r+i),$!==a||s!==0&&$.nodeType!==3||(u=r+s),$.nodeType===3&&(r+=$.nodeValue.length),(N=$.firstChild)!==null;)v=$,$=N;for(;;){if($===e)break t;if(v===n&&++c===i&&(l=r),v===a&&++h===s&&(u=r),(N=$.nextSibling)!==null)break;$=v,v=$.parentNode}$=N}n=l===-1||u===-1?null:{start:l,end:u}}else n=null}n=n||{start:0,end:0}}else n=null;for(Ll={focusedElem:e,selectionRange:n},xa=!1,Q=t;Q!==null;)if(t=Q,e=t.child,(t.subtreeFlags&1028)!==0&&e!==null)e.return=t,Q=e;else for(;Q!==null;){t=Q;try{var _=t.alternate;if((t.flags&1024)!==0)switch(t.tag){case 0:case 11:case 15:break;case 1:if(_!==null){var w=_.memoizedProps,E=_.memoizedState,y=t.stateNode,f=y.getSnapshotBeforeUpdate(t.elementType===t.type?w:St(t.type,w),E);y.__reactInternalSnapshotBeforeUpdate=f}break;case 3:var p=t.stateNode.containerInfo;p.nodeType===1?p.textContent="":p.nodeType===9&&p.documentElement&&p.removeChild(p.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(z(163))}}catch(k){Ee(t,t.return,k)}if(e=t.sibling,e!==null){e.return=t.return,Q=e;break}Q=t.return}return _=Vu,Vu=!1,_}function ii(e,t,n){var s=t.updateQueue;if(s=s!==null?s.lastEffect:null,s!==null){var i=s=s.next;do{if((i.tag&e)===e){var a=i.destroy;i.destroy=void 0,a!==void 0&&Ql(t,n,a)}i=i.next}while(i!==s)}}function sr(e,t){if(t=t.updateQueue,t=t!==null?t.lastEffect:null,t!==null){var n=t=t.next;do{if((n.tag&e)===e){var s=n.create;n.destroy=s()}n=n.next}while(n!==t)}}function Xl(e){var t=e.ref;if(t!==null){var n=e.stateNode;e.tag,e=n,typeof t=="function"?t(e):t.current=e}}function Op(e){var t=e.alternate;t!==null&&(e.alternate=null,Op(t)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(t=e.stateNode,t!==null&&(delete t[Ot],delete t[hi],delete t[Ol],delete t[Gv],delete t[Vv])),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}function Up(e){return e.tag===5||e.tag===3||e.tag===4}function Wu(e){e:for(;;){for(;e.sibling===null;){if(e.return===null||Up(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.flags&2||e.child===null||e.tag===4)continue e;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function Jl(e,t,n){var s=e.tag;if(s===5||s===6)e=e.stateNode,t?n.nodeType===8?n.parentNode.insertBefore(e,t):n.insertBefore(e,t):(n.nodeType===8?(t=n.parentNode,t.insertBefore(e,n)):(t=n,t.appendChild(e)),n=n._reactRootContainer,n!=null||t.onclick!==null||(t.onclick=Ia));else if(s!==4&&(e=e.child,e!==null))for(Jl(e,t,n),e=e.sibling;e!==null;)Jl(e,t,n),e=e.sibling}function Zl(e,t,n){var s=e.tag;if(s===5||s===6)e=e.stateNode,t?n.insertBefore(e,t):n.appendChild(e);else if(s!==4&&(e=e.child,e!==null))for(Zl(e,t,n),e=e.sibling;e!==null;)Zl(e,t,n),e=e.sibling}var Pe=null,Et=!1;function an(e,t,n){for(n=n.child;n!==null;)Bp(e,t,n),n=n.sibling}function Bp(e,t,n){if(Ut&&typeof Ut.onCommitFiberUnmount=="function")try{Ut.onCommitFiberUnmount(Ya,n)}catch{}switch(n.tag){case 5:He||ds(n,t);case 6:var s=Pe,i=Et;Pe=null,an(e,t,n),Pe=s,Et=i,Pe!==null&&(Et?(e=Pe,n=n.stateNode,e.nodeType===8?e.parentNode.removeChild(n):e.removeChild(n)):Pe.removeChild(n.stateNode));break;case 18:Pe!==null&&(Et?(e=Pe,n=n.stateNode,e.nodeType===8?nl(e.parentNode,n):e.nodeType===1&&nl(e,n),pi(e)):nl(Pe,n.stateNode));break;case 4:s=Pe,i=Et,Pe=n.stateNode.containerInfo,Et=!0,an(e,t,n),Pe=s,Et=i;break;case 0:case 11:case 14:case 15:if(!He&&(s=n.updateQueue,s!==null&&(s=s.lastEffect,s!==null))){i=s=s.next;do{var a=i,r=a.destroy;a=a.tag,r!==void 0&&((a&2)!==0||(a&4)!==0)&&Ql(n,t,r),i=i.next}while(i!==s)}an(e,t,n);break;case 1:if(!He&&(ds(n,t),s=n.stateNode,typeof s.componentWillUnmount=="function"))try{s.props=n.memoizedProps,s.state=n.memoizedState,s.componentWillUnmount()}catch(l){Ee(n,t,l)}an(e,t,n);break;case 21:an(e,t,n);break;case 22:n.mode&1?(He=(s=He)||n.memoizedState!==null,an(e,t,n),He=s):an(e,t,n);break;default:an(e,t,n)}}function ju(e){var t=e.updateQueue;if(t!==null){e.updateQueue=null;var n=e.stateNode;n===null&&(n=e.stateNode=new oy),t.forEach(function(s){var i=gy.bind(null,e,s);n.has(s)||(n.add(s),s.then(i,i))})}}function _t(e,t){var n=t.deletions;if(n!==null)for(var s=0;s<n.length;s++){var i=n[s];try{var a=e,r=t,l=r;e:for(;l!==null;){switch(l.tag){case 5:Pe=l.stateNode,Et=!1;break e;case 3:Pe=l.stateNode.containerInfo,Et=!0;break e;case 4:Pe=l.stateNode.containerInfo,Et=!0;break e}l=l.return}if(Pe===null)throw Error(z(160));Bp(a,r,i),Pe=null,Et=!1;var u=i.alternate;u!==null&&(u.return=null),i.return=null}catch(c){Ee(i,t,c)}}if(t.subtreeFlags&12854)for(t=t.child;t!==null;)Kp(t,e),t=t.sibling}function Kp(e,t){var n=e.alternate,s=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:if(_t(t,e),Pt(e),s&4){try{ii(3,e,e.return),sr(3,e)}catch(w){Ee(e,e.return,w)}try{ii(5,e,e.return)}catch(w){Ee(e,e.return,w)}}break;case 1:_t(t,e),Pt(e),s&512&&n!==null&&ds(n,n.return);break;case 5:if(_t(t,e),Pt(e),s&512&&n!==null&&ds(n,n.return),e.flags&32){var i=e.stateNode;try{oi(i,"")}catch(w){Ee(e,e.return,w)}}if(s&4&&(i=e.stateNode,i!=null)){var a=e.memoizedProps,r=n!==null?n.memoizedProps:a,l=e.type,u=e.updateQueue;if(e.updateQueue=null,u!==null)try{l==="input"&&a.type==="radio"&&a.name!=null&&od(i,a),kl(l,r);var c=kl(l,a);for(r=0;r<u.length;r+=2){var h=u[r],$=u[r+1];h==="style"?md(i,$):h==="dangerouslySetInnerHTML"?dd(i,$):h==="children"?oi(i,$):ro(i,h,$,c)}switch(l){case"input":gl(i,a);break;case"textarea":cd(i,a);break;case"select":var v=i._wrapperState.wasMultiple;i._wrapperState.wasMultiple=!!a.multiple;var N=a.value;N!=null?ms(i,!!a.multiple,N,!1):v!==!!a.multiple&&(a.defaultValue!=null?ms(i,!!a.multiple,a.defaultValue,!0):ms(i,!!a.multiple,a.multiple?[]:"",!1))}i[hi]=a}catch(w){Ee(e,e.return,w)}}break;case 6:if(_t(t,e),Pt(e),s&4){if(e.stateNode===null)throw Error(z(162));i=e.stateNode,a=e.memoizedProps;try{i.nodeValue=a}catch(w){Ee(e,e.return,w)}}break;case 3:if(_t(t,e),Pt(e),s&4&&n!==null&&n.memoizedState.isDehydrated)try{pi(t.containerInfo)}catch(w){Ee(e,e.return,w)}break;case 4:_t(t,e),Pt(e);break;case 13:_t(t,e),Pt(e),i=e.child,i.flags&8192&&(a=i.memoizedState!==null,i.stateNode.isHidden=a,!a||i.alternate!==null&&i.alternate.memoizedState!==null||(Ko=Ce())),s&4&&ju(e);break;case 22:if(h=n!==null&&n.memoizedState!==null,e.mode&1?(He=(c=He)||h,_t(t,e),He=c):_t(t,e),Pt(e),s&8192){if(c=e.memoizedState!==null,(e.stateNode.isHidden=c)&&!h&&(e.mode&1)!==0)for(Q=e,h=e.child;h!==null;){for($=Q=h;Q!==null;){switch(v=Q,N=v.child,v.tag){case 0:case 11:case 14:case 15:ii(4,v,v.return);break;case 1:ds(v,v.return);var _=v.stateNode;if(typeof _.componentWillUnmount=="function"){s=v,n=v.return;try{t=s,_.props=t.memoizedProps,_.state=t.memoizedState,_.componentWillUnmount()}catch(w){Ee(s,n,w)}}break;case 5:ds(v,v.return);break;case 22:if(v.memoizedState!==null){Qu($);continue}}N!==null?(N.return=v,Q=N):Qu($)}h=h.sibling}e:for(h=null,$=e;;){if($.tag===5){if(h===null){h=$;try{i=$.stateNode,c?(a=i.style,typeof a.setProperty=="function"?a.setProperty("display","none","important"):a.display="none"):(l=$.stateNode,u=$.memoizedProps.style,r=u!=null&&u.hasOwnProperty("display")?u.display:null,l.style.display=pd("display",r))}catch(w){Ee(e,e.return,w)}}}else if($.tag===6){if(h===null)try{$.stateNode.nodeValue=c?"":$.memoizedProps}catch(w){Ee(e,e.return,w)}}else if(($.tag!==22&&$.tag!==23||$.memoizedState===null||$===e)&&$.child!==null){$.child.return=$,$=$.child;continue}if($===e)break e;for(;$.sibling===null;){if($.return===null||$.return===e)break e;h===$&&(h=null),$=$.return}h===$&&(h=null),$.sibling.return=$.return,$=$.sibling}}break;case 19:_t(t,e),Pt(e),s&4&&ju(e);break;case 21:break;default:_t(t,e),Pt(e)}}function Pt(e){var t=e.flags;if(t&2){try{e:{for(var n=e.return;n!==null;){if(Up(n)){var s=n;break e}n=n.return}throw Error(z(160))}switch(s.tag){case 5:var i=s.stateNode;s.flags&32&&(oi(i,""),s.flags&=-33);var a=Wu(e);Zl(e,a,i);break;case 3:case 4:var r=s.stateNode.containerInfo,l=Wu(e);Jl(e,l,r);break;default:throw Error(z(161))}}catch(u){Ee(e,e.return,u)}e.flags&=-3}t&4096&&(e.flags&=-4097)}function uy(e,t,n){Q=e,zp(e,t,n)}function zp(e,t,n){for(var s=(e.mode&1)!==0;Q!==null;){var i=Q,a=i.child;if(i.tag===22&&s){var r=i.memoizedState!==null||ma;if(!r){var l=i.alternate,u=l!==null&&l.memoizedState!==null||He;l=ma;var c=He;if(ma=r,(He=u)&&!c)for(Q=i;Q!==null;)r=Q,u=r.child,r.tag===22&&r.memoizedState!==null?Xu(i):u!==null?(u.return=r,Q=u):Xu(i);for(;a!==null;)Q=a,zp(a,t,n),a=a.sibling;Q=i,ma=l,He=c}Yu(e,t,n)}else(i.subtreeFlags&8772)!==0&&a!==null?(a.return=i,Q=a):Yu(e,t,n)}}function Yu(e){for(;Q!==null;){var t=Q;if((t.flags&8772)!==0){var n=t.alternate;try{if((t.flags&8772)!==0)switch(t.tag){case 0:case 11:case 15:He||sr(5,t);break;case 1:var s=t.stateNode;if(t.flags&4&&!He)if(n===null)s.componentDidMount();else{var i=t.elementType===t.type?n.memoizedProps:St(t.type,n.memoizedProps);s.componentDidUpdate(i,n.memoizedState,s.__reactInternalSnapshotBeforeUpdate)}var a=t.updateQueue;a!==null&&Iu(t,a,s);break;case 3:var r=t.updateQueue;if(r!==null){if(n=null,t.child!==null)switch(t.child.tag){case 5:n=t.child.stateNode;break;case 1:n=t.child.stateNode}Iu(t,r,n)}break;case 5:var l=t.stateNode;if(n===null&&t.flags&4){n=l;var u=t.memoizedProps;switch(t.type){case"button":case"input":case"select":case"textarea":u.autoFocus&&n.focus();break;case"img":u.src&&(n.src=u.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(t.memoizedState===null){var c=t.alternate;if(c!==null){var h=c.memoizedState;if(h!==null){var $=h.dehydrated;$!==null&&pi($)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(z(163))}He||t.flags&512&&Xl(t)}catch(v){Ee(t,t.return,v)}}if(t===e){Q=null;break}if(n=t.sibling,n!==null){n.return=t.return,Q=n;break}Q=t.return}}function Qu(e){for(;Q!==null;){var t=Q;if(t===e){Q=null;break}var n=t.sibling;if(n!==null){n.return=t.return,Q=n;break}Q=t.return}}function Xu(e){for(;Q!==null;){var t=Q;try{switch(t.tag){case 0:case 11:case 15:var n=t.return;try{sr(4,t)}catch(u){Ee(t,n,u)}break;case 1:var s=t.stateNode;if(typeof s.componentDidMount=="function"){var i=t.return;try{s.componentDidMount()}catch(u){Ee(t,i,u)}}var a=t.return;try{Xl(t)}catch(u){Ee(t,a,u)}break;case 5:var r=t.return;try{Xl(t)}catch(u){Ee(t,r,u)}}}catch(u){Ee(t,t.return,u)}if(t===e){Q=null;break}var l=t.sibling;if(l!==null){l.return=t.return,Q=l;break}Q=t.return}}var dy=Math.ceil,qa=Zt.ReactCurrentDispatcher,Uo=Zt.ReactCurrentOwner,gt=Zt.ReactCurrentBatchConfig,ce=0,Ie=null,Ae=null,Me=0,lt=0,ps=kn(0),De=0,ki=null,Bn=0,ir=0,Bo=0,ai=null,tt=null,Ko=0,Ss=1/0,qt=null,Ga=!1,eo=null,hn=null,fa=!1,dn=null,Va=0,ri=0,to=null,ba=-1,ka=0;function Qe(){return(ce&6)!==0?Ce():ba!==-1?ba:ba=Ce()}function gn(e){return(e.mode&1)===0?1:(ce&2)!==0&&Me!==0?Me&-Me:jv.transition!==null?(ka===0&&(ka=Sd()),ka):(e=de,e!==0||(e=window.event,e=e===void 0?16:Rd(e.type)),e)}function At(e,t,n,s){if(50<ri)throw ri=0,to=null,Error(z(185));_i(e,n,s),((ce&2)===0||e!==Ie)&&(e===Ie&&((ce&2)===0&&(ir|=n),De===4&&cn(e,Me)),at(e,s),n===1&&ce===0&&(t.mode&1)===0&&(Ss=Ce()+500,er&&_n()))}function at(e,t){var n=e.callbackNode;Qf(e,t);var s=Aa(e,e===Ie?Me:0);if(s===0)n!==null&&au(n),e.callbackNode=null,e.callbackPriority=0;else if(t=s&-s,e.callbackPriority!==t){if(n!=null&&au(n),t===1)e.tag===0?Wv(Ju.bind(null,e)):Xd(Ju.bind(null,e)),Fv(function(){(ce&6)===0&&_n()}),n=null;else{switch(Ed(s)){case 1:n=po;break;case 4:n=kd;break;case 16:n=Ta;break;case 536870912:n=_d;break;default:n=Ta}n=Yp(n,Hp.bind(null,e))}e.callbackPriority=t,e.callbackNode=n}}function Hp(e,t){if(ba=-1,ka=0,(ce&6)!==0)throw Error(z(327));var n=e.callbackNode;if(gs()&&e.callbackNode!==n)return null;var s=Aa(e,e===Ie?Me:0);if(s===0)return null;if((s&30)!==0||(s&e.expiredLanes)!==0||t)t=Wa(e,s);else{t=s;var i=ce;ce|=2;var a=qp();(Ie!==e||Me!==t)&&(qt=null,Ss=Ce()+500,Ln(e,t));do try{fy();break}catch(l){Fp(e,l)}while(!0);So(),qa.current=a,ce=i,Ae!==null?t=0:(Ie=null,Me=0,t=De)}if(t!==0){if(t===2&&(i=Tl(e),i!==0&&(s=i,t=no(e,i))),t===1)throw n=ki,Ln(e,0),cn(e,s),at(e,Ce()),n;if(t===6)cn(e,s);else{if(i=e.current.alternate,(s&30)===0&&!py(i)&&(t=Wa(e,s),t===2&&(a=Tl(e),a!==0&&(s=a,t=no(e,a))),t===1))throw n=ki,Ln(e,0),cn(e,s),at(e,Ce()),n;switch(e.finishedWork=i,e.finishedLanes=s,t){case 0:case 1:throw Error(z(345));case 2:xn(e,tt,qt);break;case 3:if(cn(e,s),(s&130023424)===s&&(t=Ko+500-Ce(),10<t)){if(Aa(e,0)!==0)break;if(i=e.suspendedLanes,(i&s)!==s){Qe(),e.pingedLanes|=e.suspendedLanes&i;break}e.timeoutHandle=Ml(xn.bind(null,e,tt,qt),t);break}xn(e,tt,qt);break;case 4:if(cn(e,s),(s&4194240)===s)break;for(t=e.eventTimes,i=-1;0<s;){var r=31-Tt(s);a=1<<r,r=t[r],r>i&&(i=r),s&=~a}if(s=i,s=Ce()-s,s=(120>s?120:480>s?480:1080>s?1080:1920>s?1920:3e3>s?3e3:4320>s?4320:1960*dy(s/1960))-s,10<s){e.timeoutHandle=Ml(xn.bind(null,e,tt,qt),s);break}xn(e,tt,qt);break;case 5:xn(e,tt,qt);break;default:throw Error(z(329))}}}return at(e,Ce()),e.callbackNode===n?Hp.bind(null,e):null}function no(e,t){var n=ai;return e.current.memoizedState.isDehydrated&&(Ln(e,t).flags|=256),e=Wa(e,t),e!==2&&(t=tt,tt=n,t!==null&&so(t)),e}function so(e){tt===null?tt=e:tt.push.apply(tt,e)}function py(e){for(var t=e;;){if(t.flags&16384){var n=t.updateQueue;if(n!==null&&(n=n.stores,n!==null))for(var s=0;s<n.length;s++){var i=n[s],a=i.getSnapshot;i=i.value;try{if(!xt(a(),i))return!1}catch{return!1}}}if(n=t.child,t.subtreeFlags&16384&&n!==null)n.return=t,t=n;else{if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function cn(e,t){for(t&=~Bo,t&=~ir,e.suspendedLanes|=t,e.pingedLanes&=~t,e=e.expirationTimes;0<t;){var n=31-Tt(t),s=1<<n;e[n]=-1,t&=~s}}function Ju(e){if((ce&6)!==0)throw Error(z(327));gs();var t=Aa(e,0);if((t&1)===0)return at(e,Ce()),null;var n=Wa(e,t);if(e.tag!==0&&n===2){var s=Tl(e);s!==0&&(t=s,n=no(e,s))}if(n===1)throw n=ki,Ln(e,0),cn(e,t),at(e,Ce()),n;if(n===6)throw Error(z(345));return e.finishedWork=e.current.alternate,e.finishedLanes=t,xn(e,tt,qt),at(e,Ce()),null}function zo(e,t){var n=ce;ce|=1;try{return e(t)}finally{ce=n,ce===0&&(Ss=Ce()+500,er&&_n())}}function Kn(e){dn!==null&&dn.tag===0&&(ce&6)===0&&gs();var t=ce;ce|=1;var n=gt.transition,s=de;try{if(gt.transition=null,de=1,e)return e()}finally{de=s,gt.transition=n,ce=t,(ce&6)===0&&_n()}}function Ho(){lt=ps.current,he(ps)}function Ln(e,t){e.finishedWork=null,e.finishedLanes=0;var n=e.timeoutHandle;if(n!==-1&&(e.timeoutHandle=-1,Hv(n)),Ae!==null)for(n=Ae.return;n!==null;){var s=n;switch(bo(s),s.tag){case 1:s=s.type.childContextTypes,s!=null&&La();break;case 3:ks(),he(st),he(Fe),Do();break;case 5:xo(s);break;case 4:ks();break;case 13:he(ke);break;case 19:he(ke);break;case 10:Eo(s.type._context);break;case 22:case 23:Ho()}n=n.return}if(Ie=e,Ae=e=$n(e.current,null),Me=lt=t,De=0,ki=null,Bo=ir=Bn=0,tt=ai=null,Rn!==null){for(t=0;t<Rn.length;t++)if(n=Rn[t],s=n.interleaved,s!==null){n.interleaved=null;var i=s.next,a=n.pending;if(a!==null){var r=a.next;a.next=i,s.next=r}n.pending=s}Rn=null}return e}function Fp(e,t){do{var n=Ae;try{if(So(),$a.current=Fa,Ha){for(var s=_e.memoizedState;s!==null;){var i=s.queue;i!==null&&(i.pending=null),s=s.next}Ha=!1}if(Un=0,Re=xe=_e=null,si=!1,Ni=0,Uo.current=null,n===null||n.return===null){De=1,ki=t,Ae=null;break}e:{var a=e,r=n.return,l=n,u=t;if(t=Me,l.flags|=32768,u!==null&&typeof u=="object"&&typeof u.then=="function"){var c=u,h=l,$=h.tag;if((h.mode&1)===0&&($===0||$===11||$===15)){var v=h.alternate;v?(h.updateQueue=v.updateQueue,h.memoizedState=v.memoizedState,h.lanes=v.lanes):(h.updateQueue=null,h.memoizedState=null)}var N=Bu(r);if(N!==null){N.flags&=-257,Ku(N,r,l,a,t),N.mode&1&&Uu(a,c,t),t=N,u=c;var _=t.updateQueue;if(_===null){var w=new Set;w.add(u),t.updateQueue=w}else _.add(u);break e}else{if((t&1)===0){Uu(a,c,t),Fo();break e}u=Error(z(426))}}else if(be&&l.mode&1){var E=Bu(r);if(E!==null){(E.flags&65536)===0&&(E.flags|=256),Ku(E,r,l,a,t),ko(_s(u,l));break e}}a=u=_s(u,l),De!==4&&(De=2),ai===null?ai=[a]:ai.push(a),a=r;do{switch(a.tag){case 3:a.flags|=65536,t&=-t,a.lanes|=t;var y=Ep(a,u,t);Ru(a,y);break e;case 1:l=u;var f=a.type,p=a.stateNode;if((a.flags&128)===0&&(typeof f.getDerivedStateFromError=="function"||p!==null&&typeof p.componentDidCatch=="function"&&(hn===null||!hn.has(p)))){a.flags|=65536,t&=-t,a.lanes|=t;var k=Cp(a,l,t);Ru(a,k);break e}}a=a.return}while(a!==null)}Vp(n)}catch(b){t=b,Ae===n&&n!==null&&(Ae=n=n.return);continue}break}while(!0)}function qp(){var e=qa.current;return qa.current=Fa,e===null?Fa:e}function Fo(){(De===0||De===3||De===2)&&(De=4),Ie===null||(Bn&268435455)===0&&(ir&268435455)===0||cn(Ie,Me)}function Wa(e,t){var n=ce;ce|=2;var s=qp();(Ie!==e||Me!==t)&&(qt=null,Ln(e,t));do try{my();break}catch(i){Fp(e,i)}while(!0);if(So(),ce=n,qa.current=s,Ae!==null)throw Error(z(261));return Ie=null,Me=0,De}function my(){for(;Ae!==null;)Gp(Ae)}function fy(){for(;Ae!==null&&!zf();)Gp(Ae)}function Gp(e){var t=jp(e.alternate,e,lt);e.memoizedProps=e.pendingProps,t===null?Vp(e):Ae=t,Uo.current=null}function Vp(e){var t=e;do{var n=t.alternate;if(e=t.return,(t.flags&32768)===0){if(n=ry(n,t,lt),n!==null){Ae=n;return}}else{if(n=ly(n,t),n!==null){n.flags&=32767,Ae=n;return}if(e!==null)e.flags|=32768,e.subtreeFlags=0,e.deletions=null;else{De=6,Ae=null;return}}if(t=t.sibling,t!==null){Ae=t;return}Ae=t=e}while(t!==null);De===0&&(De=5)}function xn(e,t,n){var s=de,i=gt.transition;try{gt.transition=null,de=1,vy(e,t,n,s)}finally{gt.transition=i,de=s}return null}function vy(e,t,n,s){do gs();while(dn!==null);if((ce&6)!==0)throw Error(z(327));n=e.finishedWork;var i=e.finishedLanes;if(n===null)return null;if(e.finishedWork=null,e.finishedLanes=0,n===e.current)throw Error(z(177));e.callbackNode=null,e.callbackPriority=0;var a=n.lanes|n.childLanes;if(Xf(e,a),e===Ie&&(Ae=Ie=null,Me=0),(n.subtreeFlags&2064)===0&&(n.flags&2064)===0||fa||(fa=!0,Yp(Ta,function(){return gs(),null})),a=(n.flags&15990)!==0,(n.subtreeFlags&15990)!==0||a){a=gt.transition,gt.transition=null;var r=de;de=1;var l=ce;ce|=4,Uo.current=null,cy(e,n),Kp(n,e),Ov(Ll),xa=!!Il,Ll=Il=null,e.current=n,uy(n,e,i),Hf(),ce=l,de=r,gt.transition=a}else e.current=n;if(fa&&(fa=!1,dn=e,Va=i),a=e.pendingLanes,a===0&&(hn=null),Gf(n.stateNode,s),at(e,Ce()),t!==null)for(s=e.onRecoverableError,n=0;n<t.length;n++)i=t[n],s(i.value,{componentStack:i.stack,digest:i.digest});if(Ga)throw Ga=!1,e=eo,eo=null,e;return(Va&1)!==0&&e.tag!==0&&gs(),a=e.pendingLanes,(a&1)!==0?e===to?ri++:(ri=0,to=e):ri=0,_n(),null}function gs(){if(dn!==null){var e=Ed(Va),t=gt.transition,n=de;try{if(gt.transition=null,de=16>e?16:e,dn===null)var s=!1;else{if(e=dn,dn=null,Va=0,(ce&6)!==0)throw Error(z(331));var i=ce;for(ce|=4,Q=e.current;Q!==null;){var a=Q,r=a.child;if((Q.flags&16)!==0){var l=a.deletions;if(l!==null){for(var u=0;u<l.length;u++){var c=l[u];for(Q=c;Q!==null;){var h=Q;switch(h.tag){case 0:case 11:case 15:ii(8,h,a)}var $=h.child;if($!==null)$.return=h,Q=$;else for(;Q!==null;){h=Q;var v=h.sibling,N=h.return;if(Op(h),h===c){Q=null;break}if(v!==null){v.return=N,Q=v;break}Q=N}}}var _=a.alternate;if(_!==null){var w=_.child;if(w!==null){_.child=null;do{var E=w.sibling;w.sibling=null,w=E}while(w!==null)}}Q=a}}if((a.subtreeFlags&2064)!==0&&r!==null)r.return=a,Q=r;else e:for(;Q!==null;){if(a=Q,(a.flags&2048)!==0)switch(a.tag){case 0:case 11:case 15:ii(9,a,a.return)}var y=a.sibling;if(y!==null){y.return=a.return,Q=y;break e}Q=a.return}}var f=e.current;for(Q=f;Q!==null;){r=Q;var p=r.child;if((r.subtreeFlags&2064)!==0&&p!==null)p.return=r,Q=p;else e:for(r=f;Q!==null;){if(l=Q,(l.flags&2048)!==0)try{switch(l.tag){case 0:case 11:case 15:sr(9,l)}}catch(b){Ee(l,l.return,b)}if(l===r){Q=null;break e}var k=l.sibling;if(k!==null){k.return=l.return,Q=k;break e}Q=l.return}}if(ce=i,_n(),Ut&&typeof Ut.onPostCommitFiberRoot=="function")try{Ut.onPostCommitFiberRoot(Ya,e)}catch{}s=!0}return s}finally{de=n,gt.transition=t}}return!1}function Zu(e,t,n){t=_s(n,t),t=Ep(e,t,1),e=yn(e,t,1),t=Qe(),e!==null&&(_i(e,1,t),at(e,t))}function Ee(e,t,n){if(e.tag===3)Zu(e,e,n);else for(;t!==null;){if(t.tag===3){Zu(t,e,n);break}else if(t.tag===1){var s=t.stateNode;if(typeof t.type.getDerivedStateFromError=="function"||typeof s.componentDidCatch=="function"&&(hn===null||!hn.has(s))){e=_s(n,e),e=Cp(t,e,1),t=yn(t,e,1),e=Qe(),t!==null&&(_i(t,1,e),at(t,e));break}}t=t.return}}function yy(e,t,n){var s=e.pingCache;s!==null&&s.delete(t),t=Qe(),e.pingedLanes|=e.suspendedLanes&n,Ie===e&&(Me&n)===n&&(De===4||De===3&&(Me&130023424)===Me&&500>Ce()-Ko?Ln(e,0):Bo|=n),at(e,t)}function Wp(e,t){t===0&&((e.mode&1)===0?t=1:(t=ea,ea<<=1,(ea&130023424)===0&&(ea=4194304)));var n=Qe();e=Xt(e,t),e!==null&&(_i(e,t,n),at(e,n))}function hy(e){var t=e.memoizedState,n=0;t!==null&&(n=t.retryLane),Wp(e,n)}function gy(e,t){var n=0;switch(e.tag){case 13:var s=e.stateNode,i=e.memoizedState;i!==null&&(n=i.retryLane);break;case 19:s=e.stateNode;break;default:throw Error(z(314))}s!==null&&s.delete(t),Wp(e,n)}var jp;jp=function(e,t,n){if(e!==null)if(e.memoizedProps!==t.pendingProps||st.current)nt=!0;else{if((e.lanes&n)===0&&(t.flags&128)===0)return nt=!1,ay(e,t,n);nt=(e.flags&131072)!==0}else nt=!1,be&&(t.flags&1048576)!==0&&Jd(t,Oa,t.index);switch(t.lanes=0,t.tag){case 2:var s=t.type;wa(e,t),e=t.pendingProps;var i=Ns(t,Fe.current);hs(t,n),i=Io(null,t,s,e,i,n);var a=Lo();return t.flags|=1,typeof i=="object"&&i!==null&&typeof i.render=="function"&&i.$$typeof===void 0?(t.tag=1,t.memoizedState=null,t.updateQueue=null,it(s)?(a=!0,Pa(t)):a=!1,t.memoizedState=i.state!==null&&i.state!==void 0?i.state:null,To(t),i.updater=nr,t.stateNode=i,i._reactInternals=t,Fl(t,s,e,n),t=Vl(null,t,s,!0,a,n)):(t.tag=0,be&&a&&wo(t),Ye(null,t,i,n),t=t.child),t;case 16:s=t.elementType;e:{switch(wa(e,t),e=t.pendingProps,i=s._init,s=i(s._payload),t.type=s,i=t.tag=Ny(s),e=St(s,e),i){case 0:t=Gl(null,t,s,e,n);break e;case 1:t=Fu(null,t,s,e,n);break e;case 11:t=zu(null,t,s,e,n);break e;case 14:t=Hu(null,t,s,St(s.type,e),n);break e}throw Error(z(306,s,""))}return t;case 0:return s=t.type,i=t.pendingProps,i=t.elementType===s?i:St(s,i),Gl(e,t,s,i,n);case 1:return s=t.type,i=t.pendingProps,i=t.elementType===s?i:St(s,i),Fu(e,t,s,i,n);case 3:e:{if(Dp(t),e===null)throw Error(z(387));s=t.pendingProps,a=t.memoizedState,i=a.element,ip(e,t),Ka(t,s,null,n);var r=t.memoizedState;if(s=r.element,a.isDehydrated)if(a={element:s,isDehydrated:!1,cache:r.cache,pendingSuspenseBoundaries:r.pendingSuspenseBoundaries,transitions:r.transitions},t.updateQueue.baseState=a,t.memoizedState=a,t.flags&256){i=_s(Error(z(423)),t),t=qu(e,t,s,n,i);break e}else if(s!==i){i=_s(Error(z(424)),t),t=qu(e,t,s,n,i);break e}else for(ot=vn(t.stateNode.containerInfo.firstChild),ct=t,be=!0,Ct=null,n=np(t,null,s,n),t.child=n;n;)n.flags=n.flags&-3|4096,n=n.sibling;else{if(ws(),s===i){t=Jt(e,t,n);break e}Ye(e,t,s,n)}t=t.child}return t;case 5:return ap(t),e===null&&Kl(t),s=t.type,i=t.pendingProps,a=e!==null?e.memoizedProps:null,r=i.children,Pl(s,i)?r=null:a!==null&&Pl(s,a)&&(t.flags|=32),xp(e,t),Ye(e,t,r,n),t.child;case 6:return e===null&&Kl(t),null;case 13:return Rp(e,t,n);case 4:return Ao(t,t.stateNode.containerInfo),s=t.pendingProps,e===null?t.child=bs(t,null,s,n):Ye(e,t,s,n),t.child;case 11:return s=t.type,i=t.pendingProps,i=t.elementType===s?i:St(s,i),zu(e,t,s,i,n);case 7:return Ye(e,t,t.pendingProps,n),t.child;case 8:return Ye(e,t,t.pendingProps.children,n),t.child;case 12:return Ye(e,t,t.pendingProps.children,n),t.child;case 10:e:{if(s=t.type._context,i=t.pendingProps,a=t.memoizedProps,r=i.value,ve(Ua,s._currentValue),s._currentValue=r,a!==null)if(xt(a.value,r)){if(a.children===i.children&&!st.current){t=Jt(e,t,n);break e}}else for(a=t.child,a!==null&&(a.return=t);a!==null;){var l=a.dependencies;if(l!==null){r=a.child;for(var u=l.firstContext;u!==null;){if(u.context===s){if(a.tag===1){u=jt(-1,n&-n),u.tag=2;var c=a.updateQueue;if(c!==null){c=c.shared;var h=c.pending;h===null?u.next=u:(u.next=h.next,h.next=u),c.pending=u}}a.lanes|=n,u=a.alternate,u!==null&&(u.lanes|=n),zl(a.return,n,t),l.lanes|=n;break}u=u.next}}else if(a.tag===10)r=a.type===t.type?null:a.child;else if(a.tag===18){if(r=a.return,r===null)throw Error(z(341));r.lanes|=n,l=r.alternate,l!==null&&(l.lanes|=n),zl(r,n,t),r=a.sibling}else r=a.child;if(r!==null)r.return=a;else for(r=a;r!==null;){if(r===t){r=null;break}if(a=r.sibling,a!==null){a.return=r.return,r=a;break}r=r.return}a=r}Ye(e,t,i.children,n),t=t.child}return t;case 9:return i=t.type,s=t.pendingProps.children,hs(t,n),i=$t(i),s=s(i),t.flags|=1,Ye(e,t,s,n),t.child;case 14:return s=t.type,i=St(s,t.pendingProps),i=St(s.type,i),Hu(e,t,s,i,n);case 15:return Tp(e,t,t.type,t.pendingProps,n);case 17:return s=t.type,i=t.pendingProps,i=t.elementType===s?i:St(s,i),wa(e,t),t.tag=1,it(s)?(e=!0,Pa(t)):e=!1,hs(t,n),Sp(t,s,i),Fl(t,s,i,n),Vl(null,t,s,!0,e,n);case 19:return Ip(e,t,n);case 22:return Ap(e,t,n)}throw Error(z(156,t.tag))};function Yp(e,t){return bd(e,t)}function $y(e,t,n,s){this.tag=e,this.key=n,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=s,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function ht(e,t,n,s){return new $y(e,t,n,s)}function qo(e){return e=e.prototype,!(!e||!e.isReactComponent)}function Ny(e){if(typeof e=="function")return qo(e)?1:0;if(e!=null){if(e=e.$$typeof,e===oo)return 11;if(e===co)return 14}return 2}function $n(e,t){var n=e.alternate;return n===null?(n=ht(e.tag,t,e.key,e.mode),n.elementType=e.elementType,n.type=e.type,n.stateNode=e.stateNode,n.alternate=e,e.alternate=n):(n.pendingProps=t,n.type=e.type,n.flags=0,n.subtreeFlags=0,n.deletions=null),n.flags=e.flags&14680064,n.childLanes=e.childLanes,n.lanes=e.lanes,n.child=e.child,n.memoizedProps=e.memoizedProps,n.memoizedState=e.memoizedState,n.updateQueue=e.updateQueue,t=e.dependencies,n.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},n.sibling=e.sibling,n.index=e.index,n.ref=e.ref,n}function _a(e,t,n,s,i,a){var r=2;if(s=e,typeof e=="function")qo(e)&&(r=1);else if(typeof e=="string")r=5;else e:switch(e){case ns:return Pn(n.children,i,a,t);case lo:r=8,i|=8;break;case ml:return e=ht(12,n,t,i|2),e.elementType=ml,e.lanes=a,e;case fl:return e=ht(13,n,t,i),e.elementType=fl,e.lanes=a,e;case vl:return e=ht(19,n,t,i),e.elementType=vl,e.lanes=a,e;case ad:return ar(n,i,a,t);default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case sd:r=10;break e;case id:r=9;break e;case oo:r=11;break e;case co:r=14;break e;case rn:r=16,s=null;break e}throw Error(z(130,e==null?e:typeof e,""))}return t=ht(r,n,t,i),t.elementType=e,t.type=s,t.lanes=a,t}function Pn(e,t,n,s){return e=ht(7,e,s,t),e.lanes=n,e}function ar(e,t,n,s){return e=ht(22,e,s,t),e.elementType=ad,e.lanes=n,e.stateNode={isHidden:!1},e}function ul(e,t,n){return e=ht(6,e,null,t),e.lanes=n,e}function dl(e,t,n){return t=ht(4,e.children!==null?e.children:[],e.key,t),t.lanes=n,t.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},t}function wy(e,t,n,s,i){this.tag=t,this.containerInfo=e,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=jr(0),this.expirationTimes=jr(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=jr(0),this.identifierPrefix=s,this.onRecoverableError=i,this.mutableSourceEagerHydrationData=null}function Go(e,t,n,s,i,a,r,l,u){return e=new wy(e,t,n,l,u),t===1?(t=1,a===!0&&(t|=8)):t=0,a=ht(3,null,null,t),e.current=a,a.stateNode=e,a.memoizedState={element:s,isDehydrated:n,cache:null,transitions:null,pendingSuspenseBoundaries:null},To(a),e}function by(e,t,n){var s=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:ts,key:s==null?null:""+s,children:e,containerInfo:t,implementation:n}}function Qp(e){if(!e)return wn;e=e._reactInternals;e:{if(Hn(e)!==e||e.tag!==1)throw Error(z(170));var t=e;do{switch(t.tag){case 3:t=t.stateNode.context;break e;case 1:if(it(t.type)){t=t.stateNode.__reactInternalMemoizedMergedChildContext;break e}}t=t.return}while(t!==null);throw Error(z(171))}if(e.tag===1){var n=e.type;if(it(n))return Qd(e,n,t)}return t}function Xp(e,t,n,s,i,a,r,l,u){return e=Go(n,s,!0,e,i,a,r,l,u),e.context=Qp(null),n=e.current,s=Qe(),i=gn(n),a=jt(s,i),a.callback=t??null,yn(n,a,i),e.current.lanes=i,_i(e,i,s),at(e,s),e}function rr(e,t,n,s){var i=t.current,a=Qe(),r=gn(i);return n=Qp(n),t.context===null?t.context=n:t.pendingContext=n,t=jt(a,r),t.payload={element:e},s=s===void 0?null:s,s!==null&&(t.callback=s),e=yn(i,t,r),e!==null&&(At(e,i,r,a),ga(e,i,r)),r}function ja(e){return e=e.current,e.child?(e.child.tag===5,e.child.stateNode):null}function ed(e,t){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var n=e.retryLane;e.retryLane=n!==0&&n<t?n:t}}function Vo(e,t){ed(e,t),(e=e.alternate)&&ed(e,t)}function ky(){return null}var Jp=typeof reportError=="function"?reportError:function(e){console.error(e)};function Wo(e){this._internalRoot=e}lr.prototype.render=Wo.prototype.render=function(e){var t=this._internalRoot;if(t===null)throw Error(z(409));rr(e,t,null,null)};lr.prototype.unmount=Wo.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var t=e.containerInfo;Kn(function(){rr(null,e,null,null)}),t[Qt]=null}};function lr(e){this._internalRoot=e}lr.prototype.unstable_scheduleHydration=function(e){if(e){var t=Ad();e={blockedOn:null,target:e,priority:t};for(var n=0;n<on.length&&t!==0&&t<on[n].priority;n++);on.splice(n,0,e),n===0&&Dd(e)}};function jo(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function or(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11&&(e.nodeType!==8||e.nodeValue!==" react-mount-point-unstable "))}function td(){}function _y(e,t,n,s,i){if(i){if(typeof s=="function"){var a=s;s=function(){var c=ja(r);a.call(c)}}var r=Xp(t,s,e,0,null,!1,!1,"",td);return e._reactRootContainer=r,e[Qt]=r.current,vi(e.nodeType===8?e.parentNode:e),Kn(),r}for(;i=e.lastChild;)e.removeChild(i);if(typeof s=="function"){var l=s;s=function(){var c=ja(u);l.call(c)}}var u=Go(e,0,!1,null,null,!1,!1,"",td);return e._reactRootContainer=u,e[Qt]=u.current,vi(e.nodeType===8?e.parentNode:e),Kn(function(){rr(t,u,n,s)}),u}function cr(e,t,n,s,i){var a=n._reactRootContainer;if(a){var r=a;if(typeof i=="function"){var l=i;i=function(){var u=ja(r);l.call(u)}}rr(t,r,e,i)}else r=_y(n,t,e,i,s);return ja(r)}Cd=function(e){switch(e.tag){case 3:var t=e.stateNode;if(t.current.memoizedState.isDehydrated){var n=Qs(t.pendingLanes);n!==0&&(mo(t,n|1),at(t,Ce()),(ce&6)===0&&(Ss=Ce()+500,_n()))}break;case 13:Kn(function(){var s=Xt(e,1);if(s!==null){var i=Qe();At(s,e,1,i)}}),Vo(e,1)}};fo=function(e){if(e.tag===13){var t=Xt(e,134217728);if(t!==null){var n=Qe();At(t,e,134217728,n)}Vo(e,134217728)}};Td=function(e){if(e.tag===13){var t=gn(e),n=Xt(e,t);if(n!==null){var s=Qe();At(n,e,t,s)}Vo(e,t)}};Ad=function(){return de};xd=function(e,t){var n=de;try{return de=e,t()}finally{de=n}};Sl=function(e,t,n){switch(t){case"input":if(gl(e,n),t=n.name,n.type==="radio"&&t!=null){for(n=e;n.parentNode;)n=n.parentNode;for(n=n.querySelectorAll("input[name="+JSON.stringify(""+t)+'][type="radio"]'),t=0;t<n.length;t++){var s=n[t];if(s!==e&&s.form===e.form){var i=Za(s);if(!i)throw Error(z(90));ld(s),gl(s,i)}}}break;case"textarea":cd(e,n);break;case"select":t=n.value,t!=null&&ms(e,!!n.multiple,t,!1)}};yd=zo;hd=Kn;var Sy={usingClientEntryPoint:!1,Events:[Ei,rs,Za,fd,vd,zo]},Vs={findFiberByHostInstance:Dn,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},Ey={bundleType:Vs.bundleType,version:Vs.version,rendererPackageName:Vs.rendererPackageName,rendererConfig:Vs.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:Zt.ReactCurrentDispatcher,findHostInstanceByFiber:function(e){return e=Nd(e),e===null?null:e.stateNode},findFiberByHostInstance:Vs.findFiberByHostInstance||ky,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"&&(Ws=__REACT_DEVTOOLS_GLOBAL_HOOK__,!Ws.isDisabled&&Ws.supportsFiber))try{Ya=Ws.inject(Ey),Ut=Ws}catch{}var Ws;pt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Sy;pt.createPortal=function(e,t){var n=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!jo(t))throw Error(z(200));return by(e,t,null,n)};pt.createRoot=function(e,t){if(!jo(e))throw Error(z(299));var n=!1,s="",i=Jp;return t!=null&&(t.unstable_strictMode===!0&&(n=!0),t.identifierPrefix!==void 0&&(s=t.identifierPrefix),t.onRecoverableError!==void 0&&(i=t.onRecoverableError)),t=Go(e,1,!1,null,null,n,!1,s,i),e[Qt]=t.current,vi(e.nodeType===8?e.parentNode:e),new Wo(t)};pt.findDOMNode=function(e){if(e==null)return null;if(e.nodeType===1)return e;var t=e._reactInternals;if(t===void 0)throw typeof e.render=="function"?Error(z(188)):(e=Object.keys(e).join(","),Error(z(268,e)));return e=Nd(t),e=e===null?null:e.stateNode,e};pt.flushSync=function(e){return Kn(e)};pt.hydrate=function(e,t,n){if(!or(t))throw Error(z(200));return cr(null,e,t,!0,n)};pt.hydrateRoot=function(e,t,n){if(!jo(e))throw Error(z(405));var s=n!=null&&n.hydratedSources||null,i=!1,a="",r=Jp;if(n!=null&&(n.unstable_strictMode===!0&&(i=!0),n.identifierPrefix!==void 0&&(a=n.identifierPrefix),n.onRecoverableError!==void 0&&(r=n.onRecoverableError)),t=Xp(t,null,e,1,n??null,i,!1,a,r),e[Qt]=t.current,vi(e),s)for(e=0;e<s.length;e++)n=s[e],i=n._getVersion,i=i(n._source),t.mutableSourceEagerHydrationData==null?t.mutableSourceEagerHydrationData=[n,i]:t.mutableSourceEagerHydrationData.push(n,i);return new lr(t)};pt.render=function(e,t,n){if(!or(t))throw Error(z(200));return cr(null,e,t,!1,n)};pt.unmountComponentAtNode=function(e){if(!or(e))throw Error(z(40));return e._reactRootContainer?(Kn(function(){cr(null,null,e,!1,function(){e._reactRootContainer=null,e[Qt]=null})}),!0):!1};pt.unstable_batchedUpdates=zo;pt.unstable_renderSubtreeIntoContainer=function(e,t,n,s){if(!or(n))throw Error(z(200));if(e==null||e._reactInternals===void 0)throw Error(z(38));return cr(e,t,n,!1,s)};pt.version="18.3.1-next-f1338f8080-20240426"});var nm=Cn((dg,tm)=>{"use strict";function em(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(em)}catch(e){console.error(e)}}em(),tm.exports=Zp()});var im=Cn(Yo=>{"use strict";var sm=nm();Yo.createRoot=sm.createRoot,Yo.hydrateRoot=sm.hydrateRoot;var pg});var Qm=Ar(im(),1);var om=Ar(qi());var rm=function(e,t,n,s){var i;t[0]=0;for(var a=1;a<t.length;a++){var r=t[a++],l=t[a]?(t[0]|=r?1:2,n[t[a++]]):t[++a];r===3?s[0]=l:r===4?s[1]=Object.assign(s[1]||{},l):r===5?(s[1]=s[1]||{})[t[++a]]=l:r===6?s[1][t[++a]]+=l+"":r?(i=e.apply(l,rm(e,l,n,["",null])),s.push(i),l[0]?t[0]|=2:(t[a-2]=0,t[a]=i)):s.push(l)}return s},am=new Map;function lm(e){var t=am.get(this);return t||(t=new Map,am.set(this,t)),(t=rm(this,t.get(e)||(t.set(e,t=(function(n){for(var s,i,a=1,r="",l="",u=[0],c=function(v){a===1&&(v||(r=r.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?u.push(0,v,r):a===3&&(v||r)?(u.push(3,v,r),a=2):a===2&&r==="..."&&v?u.push(4,v,0):a===2&&r&&!v?u.push(5,0,!0,r):a>=5&&((r||!v&&a===5)&&(u.push(a,0,r,i),a=6),v&&(u.push(a,v,0,i),a=6)),r=""},h=0;h<n.length;h++){h&&(a===1&&c(),c(h));for(var $=0;$<n[h].length;$++)s=n[h][$],a===1?s==="<"?(c(),u=[u],a=3):r+=s:a===4?r==="--"&&s===">"?(a=1,r=""):r=s+r[0]:l?s===l?l="":r+=s:s==='"'||s==="'"?l=s:s===">"?(c(),a=1):a&&(s==="="?(a=5,i=r,r=""):s==="/"&&(a<5||n[h][$+1]===">")?(c(),a===3&&(u=u[0]),a=u,(u=u[0]).push(2,0,a),a=0):s===" "||s==="	"||s===`
`||s==="\r"?(c(),a=2):r+=s),a===3&&r==="!--"&&(a=4,u=u[0])}return c(),u})(e)),t),arguments,[])).length>1?t:t[0]}var o=lm.bind(om.createElement);var d=Ar(qi(),1);function Ti({size:e=64,animated:t=!1}){return o`
    <svg
      width=${e}
      height=${e}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className=${t?"logo-svg logo-pulse":"logo-svg"}
    >
      <defs>
        <radialGradient id="peerGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7ee787" />
          <stop offset="100%" stopColor="#238636" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="30" r="5" fill="url(#peerGrad)" />
      <circle cx="42" cy="52" r="6" fill="url(#peerGrad)" />
      <circle cx="78" cy="52" r="6" fill="url(#peerGrad)" />
      <circle cx="60" cy="72" r="7" fill="url(#peerGrad)" />
      <circle cx="36" cy="90" r="7.5" fill="url(#peerGrad)" />
      <circle cx="84" cy="90" r="7.5" fill="url(#peerGrad)" />
      <circle cx="60" cy="104" r="8.5" fill="url(#peerGrad)" />
    </svg>
  `}function ur(){return o`
    <div className="wordmark">
      <span className="wordmark-bold">Pear</span><span className="wordmark-light">Browser</span>
    </div>
  `}var dr="ybndrfg8ejkmcpqxot1uwisza345h769",cm=(()=>{let e=new Map;for(let t=0;t<dr.length;t++)e.set(dr[t],t);return e})();function Cy(e){if(!/^[0-9a-f]+$/i.test(e)||e.length%2!==0)return null;let t=new Uint8Array(e.length/2);for(let n=0;n<t.length;n++)t[n]=parseInt(e.slice(n*2,n*2+2),16);return t}function Ty(e){return Array.from(e,t=>t.toString(16).padStart(2,"0")).join("")}function Ay(e){let t=e.byteLength*8,n="";for(let s=0;s<t;s+=5){let i=s>>>3,a=s&7;if(a<=3){n+=dr[e[i]>>>3-a&31];continue}let r=a-3,l=e[i]<<r&31,u=(i+1>=e.byteLength?0:e[i+1])>>>8-r;n+=dr[l|u]}return n}function xy(e){let t=String(e||"").toLowerCase(),n=new Uint8Array(Math.ceil(t.length*5/8)),s=0,i=0,a=()=>{let E=t[i++];if(!cm.has(E))throw new Error("invalid z-base-32");return cm.get(E)},r=t.length&7,l=(t.length-r)/8;for(let E=0;E<l;E++){let y=a(),f=a(),p=a(),k=a(),b=a(),x=a(),g=a(),S=a();n[s++]=y<<3|f>>>2,n[s++]=(f&3)<<6|p<<1|k>>>4,n[s++]=(k&15)<<4|b>>>1,n[s++]=(b&1)<<7|x<<2|g>>>3,n[s++]=(g&7)<<5|S}if(r===0)return n.subarray(0,s);let u=a(),c=a();if(n[s++]=u<<3|c>>>2,r<=2)return n.subarray(0,s);let h=a(),$=a();if(n[s++]=(c&3)<<6|h<<1|$>>>4,r<=4)return n.subarray(0,s);let v=a();if(n[s++]=($&15)<<4|v>>>1,r<=5)return n.subarray(0,s);let N=a(),_=a();if(n[s++]=(v&1)<<7|N<<2|_>>>3,r<=7)return n.subarray(0,s);let w=a();return n[s++]=(_&7)<<5|w,n.subarray(0,s)}function um(e){let t=Cy(e);return t?Ay(t):null}function pr(e){try{let t=xy(e);return t.length===32?Ty(t):null}catch{return null}}function mr(e){let t=Number(e)||0;if(t<1024)return`${t} B`;let n=["KB","MB","GB","TB"],s=t/1024,i=n[0];for(let a=1;a<n.length&&s>=1024;a++)s/=1024,i=n[a];return`${s>=10?s.toFixed(1):s.toFixed(2)} ${i}`}function ge(e){return!e||typeof e!="string"?"":e.length<=16?e:e.slice(0,8)+"\u2026"+e.slice(-6)}function Qo(e){let t=String(e||"").trim();return t?/^hyper:\/\//i.test(t)||/^https?:\/\//i.test(t)?t:/^(?:pear|file):\/\//i.test(t)?null:/^[0-9a-f]{64}$/i.test(t)?`hyper://${t.toLowerCase()}/`:/^[13-9a-km-uw-z]{52}$/i.test(t)?`hyper://${t}/`:/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::\d{1,5})?(?:[/?#].*)?$/i.test(t)?`https://${t.replace(/^\/+/,"")}`:t.includes("/")?t:`hyper://${t}`:null}function dm(e){try{let t=new URL(String(e||"").trim());if(t.protocol!=="http:"&&t.protocol!=="https:")return!1;let n=(t.hostname||"").toLowerCase();return n!=="127.0.0.1"&&n!=="localhost"&&n!=="[::1]"}catch{return!1}}function Ts(e){let t=String(e||"").trim();if(!t)return null;let s=t.replace(/^hyper:\/\//i,"").split("/")[0].trim();return/^[0-9a-f]{64}$/i.test(s)?s.toLowerCase():/^[13-9a-km-uw-z]{52}$/i.test(s)?pr(s):null}function Xo(e){let t=String(e||"").trim();return t?/^[0-9a-f]{64}$/i.test(t)?t.toLowerCase():t.length<=300&&/^hyper:\/\/.+/i.test(t)?t:null:null}function pm(e){let t=String(e||"").normalize("NFKC").trim();return!(!/^[\p{L}\p{N}][\p{L}\p{N}_-]{0,127}$/u.test(t)||/^[0-9a-f]{64}$/i.test(t)||/^[13-9a-km-uw-z]{52}$/i.test(t))}function Kt(e){let t=String(e||"").trim();if(!t)return null;let n=(t.match(/^([a-z][a-z0-9+.-]*):\/\//i)?.[1]||"hyper").toLowerCase(),s=n==="autobee"?"autobee":n==="hyperbee"?"hyperbee":n==="sheets"?"sheets":n==="hiveindex"?"hiveindex":"drive",i=t.replace(/^(autobee|hyperbee|hiveindex|sheets|hyper):\/\//i,"").replace(/\/+$/,"").trim();return i?{key:i,bee:s==="hyperbee",autobee:s==="autobee",kind:s}:null}function Jo(e){let t=String(e||"").trim();if(!t)return"";if(/^(bee|sheets|hiveindex|autobee):(?!\/\/)/i.test(t))return t;let n=Kt(t);if(!n)return t;if(n.autobee)return`autobee:${n.key}`;if(n.bee)return`bee:${n.key}`;if(n.kind==="sheets"||n.kind==="hiveindex"){let s=pr(n.key);return`${n.kind}:${s||n.key}`}return n.key}function Zo(e){let n=String(e||"").trim().replace(/^sync:\/\//i,"").replace(/\/+$/,"").match(/^([0-9a-f]{64}):([0-9a-f]{64})$/i);return n?{key:n[1].toLowerCase(),encKey:n[2].toLowerCase()}:null}function mm(e,t){let n=String(e||"").trim().toLowerCase(),s=String(t||"").trim().toLowerCase();return!/^[0-9a-f]{64}$/.test(n)||!/^[0-9a-f]{64}$/.test(s)?"":`sync://${n}:${s}`}function fm(e){let t=String(e||"").trim().replace(/^pearname:\/\//i,"").replace(/\/+$/,"");return/^[^\s/]{1,253}$/.test(t)?t:null}var ym=50,fr=20,vm=0;function Dy(){return vm+=1,"tab-"+vm+"-"+Date.now().toString(36)}function Je(e){return typeof e=="string"?e.trim():""}function en(e,t="New tab"){return typeof e=="string"&&e.trim()?e:t}function tc(e,t=""){let n=[];if(Array.isArray(e))for(let i of e){let a=Je(i);a&&n[n.length-1]!==a&&n.push(a)}let s=Je(t);return n.length===0&&s&&n.push(s),n.slice(-ym)}function Ai(e,t){if(!Array.isArray(e)||e.length===0)return-1;let n=Number.isInteger(t)?t:e.length-1;return Math.max(0,Math.min(n,e.length-1))}function nc(e,t,n){let s=Je(n),i=tc(e),a=Ai(i,t),r=a>=0?i.slice(0,a+1):[];s&&r[r.length-1]!==s&&r.push(s);let l=Math.max(0,r.length-ym),u=r.slice(l);return{history:u,histIdx:u.length?u.length-1:-1}}function As(e){if(!e||typeof e!="object")return null;let t=Je(e.url),n=tc(e.history,t),s=Ai(n,e.histIdx);if(t&&(s<0||n[s]!==t)){let r=nc(n,s,t);n=r.history,s=r.histIdx}let i=s>=0?n[s]:t,a=Je(e.displayUrl)||i||t;return!i&&!a&&n.length===0?null:{url:i||t,displayUrl:a,title:en(e.title,i||"New tab"),history:n,histIdx:s,pinned:!!e.pinned}}function hm(e,t){return{...As(e)||{url:"",displayUrl:"",title:en(e?.title),history:[],histIdx:-1,pinned:!!e?.pinned},active:e?.id===t}}function sc(e){if(!e||typeof e!="object")return null;let t=As(e)||{url:"",displayUrl:"",title:en(e.title),history:[],histIdx:-1,pinned:!!e.pinned};return vr(t.url,t)}function Ry(e){return typeof e=="string"?{url:Je(e),title:""}:!e||typeof e!="object"?{url:"",title:""}:{url:Je(e.url),title:en(e.title,"")}}function gm(e,t=[]){let n=[],s=new Set,i=r=>{if(!r)return;let l=Je(r.url||r.displayUrl);l&&s.has(l)||(l&&s.add(l),n.push(r))};for(let r of t){let{url:l,title:u}=Ry(r);(l||u)&&i(vr(l,u?{title:u}:{}))}let a=Array.isArray(e)?e.map(r=>({saved:r,tab:sc(r)})).filter(r=>r.tab&&(r.tab.url||r.tab.displayUrl)):[];for(let r of a)i(r.tab);if(n.length===0&&a.length>0)for(let r of a)i(r.tab);return{tabs:n,activeId:n[0]?.id||""}}function ic(e){return[...e.filter(t=>t.pinned),...e.filter(t=>!t.pinned)]}function ec(e){let t=Je(e);if(!t)return"";let n=Ts(t);if(n)return n;try{let s=new URL(t);if(s.protocol!=="http:"||s.hostname!=="127.0.0.1"&&s.hostname!=="localhost")return"";let i=s.pathname.match(/^\/(?:hyper|app)\/([0-9a-f]{64})(?:\/|$)/i);return i?i[1].toLowerCase():""}catch{return""}}function xi(e){return!e||typeof e!="object"?"":ec(e.url)||ec(e.displayUrl)||ec(e.src)}function $m(e,t){let n=typeof t=="string"?t.toLowerCase():"";return!/^[0-9a-f]{64}$/.test(n)||!Array.isArray(e)?!1:e.some(s=>xi(s)===n)}function vr(e="",t={}){let n=Array.isArray(t.history)?tc(t.history,e):[],s=Ai(n,t.histIdx),i=s>=0?n[s]:"",a=Je(i||e),r=t.kind==="clearnet"||t.kind==="hyper"||t.kind==="loopback"?t.kind:a&&/^https?:\/\//i.test(a)&&!/^https?:\/\/(?:127\.0\.0\.1|localhost)\b/i.test(a)?"clearnet":"hyper";return{id:Dy(),url:a,displayUrl:Je(t.displayUrl)||a,src:null,history:n,histIdx:s,status:"",title:en(t.title),pinned:!!t.pinned,kind:r,clearnetMode:t.clearnetMode||null}}var ac=Object.freeze({maxUrlBytes:2048,maxTitleBytes:512,maxTextBytes:16384}),Iy=new Set(["done","cancelled","error"]),rc=0;function hr(){let e=globalThis.crypto;if(e&&typeof e.randomUUID=="function")return`ask-${e.randomUUID()}`;if(e&&typeof e.getRandomValues=="function"){let t=new Uint32Array(3);return e.getRandomValues(t),`ask-${[...t].map(n=>n.toString(36)).join("-")}`}return rc=rc+1>>>0,`ask-${Date.now().toString(36)}-${rc.toString(36)}`}function gr(e,t,n={}){let s=Ly(n),i=tn(t)?t:{},a=tn(e)?e:null,r=qe(i.id),l=qe(i.url)||qe(i.displayUrl),u=qe(i.title)||l||"Untitled page",c=yr(l,s.maxUrlBytes),h=yr(u,s.maxTitleBytes),$=a?qe(a.tabId):"",v=!!(r&&$&&r!==$),N=a&&tn(a.context)?a.context:null,_=N?My(N.selection,N.body):"",w=a&&typeof a.text=="string"?a.text:_,E=!v&&!!a&&typeof w=="string"&&w.length>0,y=yr(E?w:"",s.maxTextBytes),f=a?yr(qe(a.source),80).value:"";return{tabId:r,url:c.value,title:h.value,text:y.value,textBytes:y.bytes,available:!!E,stale:v,truncated:!!(E&&(a.truncated===!0||a.flags?.truncated===!0||y.truncated)),source:f||(E?"browser-page":"unavailable"),provenance:{tabId:"trusted-tab",url:"trusted-tab",title:"trusted-tab",text:E?"context-response":"none"}}}function Sn(e=""){let t=qe(e);return{streamId:t,status:t?"starting":"idle",text:"",modelProgress:null,stats:null,finishReason:null,error:null}}function Fn(e,t){if(!tn(e)||!tn(t))return e;let n=qe(t.streamId)||qe(t.requestId);if(!e.streamId||!n||n!==e.streamId||Iy.has(e.status))return e;let s=tn(t.event)?t.event:t,i=qe(s.type);if(i==="model-progress"){let a=Oy(s.progress);return Number.isFinite(a)?{...e,status:"loading-model",modelProgress:Math.max(0,Math.min(1,a)),error:null}:e}if(i==="text")return typeof s.delta!="string"||s.delta.length===0?e:{...e,status:"streaming",text:e.text+s.delta,error:null};if(i==="stats")return tn(s.stats)?{...e,stats:{...s.stats}}:e;if(i==="done"){let a=qe(s.finishReason)||"eos";return{...e,status:a==="cancelled"?"cancelled":"done",finishReason:a,error:null}}if(i==="error"){let a=qe(s.message)||"Local AI request failed",r=qe(s.code)||"inference-failed";return{...e,status:"error",finishReason:"error",error:{code:r,message:a}}}return e}function oc(e){let t=qe(e);return t?t.split(/[-_\s]+/).filter(Boolean).map(n=>/^(qvac|qwen|gguf|cpu|gpu)$/i.test(n)?n.toUpperCase():n.charAt(0).toUpperCase()+n.slice(1)).join(" "):"Local model"}function $r(e){if(!Number.isFinite(e)||e<0)return"\u2014";if(e<1024)return`${Math.round(e)} B`;let t=["KB","MB","GB","TB"],n=e,s=-1;do n/=1024,s++;while(n>=1024&&s<t.length-1);let i=n>=100?0:n>=10?1:2;return`${Number(n.toFixed(i))} ${t[s]}`}function Di(e){let t=typeof e=="string"?e:"",n=t.toLowerCase(),s=n.lastIndexOf("<think>"),i=n.lastIndexOf("</think>");return s>i&&(t=t.slice(0,s)),t.replace(/<think>[\s\S]*?<\/think>/gi,"").replace(/<\/?think>/gi,"").trim()}function Ly(e){let t=tn(e)?e:{};return{maxUrlBytes:lc(t.maxUrlBytes,ac.maxUrlBytes),maxTitleBytes:lc(t.maxTitleBytes,ac.maxTitleBytes),maxTextBytes:lc(t.maxTextBytes,ac.maxTextBytes)}}function lc(e,t){return!Number.isFinite(e)||e<0?t:Math.floor(e)}function yr(e,t){let n=typeof e=="string"?e:"",s=0,i=0;for(let a of n){let r=Py(a.codePointAt(0));if(s+r>t)break;s+=r,i+=a.length}return{value:n.slice(0,i),bytes:s,truncated:i<n.length}}function Py(e){return e<=127?1:e<=2047?2:e<=65535?3:4}function qe(e){return typeof e=="string"?e.trim():""}function My(e,t){let n=qe(e),s=qe(t);return n&&s?`Selected text:
${n}

Page text:
${s}`:n?`Selected text:
${n}`:s}function Oy(e){if(Number.isFinite(e))return e;if(!tn(e))return NaN;let t=Number(e.percentage);if(Number.isFinite(t))return t>1?t/100:t;let n=Number(e.completed??e.downloaded),s=Number(e.total);return Number.isFinite(n)&&Number.isFinite(s)&&s>0?n/s:NaN}function tn(e){return!!e&&typeof e=="object"&&!Array.isArray(e)}function cc(e){let t=Ri(e)?e:null,n=t&&Array.isArray(t.models)?t.models.filter(Ri).map(By).filter(i=>i.alias):[],s=n.filter(i=>i.installed);return!t||t.available!==!0||n.length===0?{available:!1,reason:wt(t?.reason)||(t&&n.length===0&&t.available===!0?"no-models":"")||(t?"runtime-unavailable":"no-capabilities"),busy:!1,queueDepth:0,modelCount:n.length,loadedCount:0,models:n}:{available:!0,reason:"",busy:t.busy===!0,queueDepth:Number.isFinite(t.queueDepth)?Math.max(0,t.queueDepth):0,modelCount:n.length,loadedCount:s.length,models:n}}function Nm(e,t=""){let n=Array.isArray(e)?e.filter(Ri):[],s=wt(t);if(s&&n.some(a=>a.alias===s))return s;let i=n.find(a=>a.recommended===!0)||n.find(a=>a.provider==="ollama")||n[0];return wt(i?.alias)}function uc(e){let t=Ri(e)?e:cc(null);if(!t.available){let s=wt(t.reason);return s?`Local AI unavailable \xB7 ${s}`:"Local AI unavailable"}let n=t.modelCount===1?"1 local model":`${t.modelCount} local models`;return t.busy||t.queueDepth>0?`${n} \xB7 generating`:t.loadedCount>0?`${n} \xB7 ready in memory`:`${n} \xB7 loads on first use`}function wm({streamId:e,model:t,question:n,history:s}={}){let i=wt(e),a=wt(t),r=wt(n).slice(0,2e3);if(!i)throw new Error("A quick ask requires a stream id");if(!a)throw new Error("A quick ask requires a browser-approved model alias");if(!r)throw new Error("A quick ask requires a non-empty question");return{streamId:i,model:a,question:r,history:Uy(s),page:{},maxTokens:192,temperature:.3}}function Uy(e){return Array.isArray(e)?e.filter(t=>Ri(t)&&(t.role==="user"||t.role==="assistant")).map(t=>({role:t.role,content:wt(t.content)})).filter(t=>t.content).slice(-6):[]}function By(e){return{alias:wt(e.alias),label:wt(e.label),provider:wt(e.provider),installed:e.installed===!0,recommended:e.recommended===!0,expectedSize:Number.isFinite(e.expectedSize)?e.expectedSize:void 0,quantization:wt(e.quantization)}}function wt(e){return typeof e=="string"?e.trim():""}function Ri(e){return!!e&&typeof e=="object"&&!Array.isArray(e)}var Nr=Object.freeze({name:"DuckDuckGo",origin:"https://duckduckgo.com/"});function Ky(e){return String(e||"").normalize("NFKC").trim().replace(/\s+/gu," ").slice(0,2048)}function bm(e){let t=Ky(e);if(!t)return null;let n=new URL(Nr.origin);return n.searchParams.set("q",t),n.toString()}function qn(e,t){if(typeof e!="string"||!/^[0-9]+$/.test(e))return String(e??"");if(!Number.isSafeInteger(t)||t<0)return e;if(t===0)return e.replace(/^0+(?=\d)/,"");let n=e.padStart(t+1,"0"),s=n.slice(0,-t).replace(/^0+(?=\d)/,""),i=n.slice(-t).replace(/0+$/,"");return i?`${s}.${i}`:s}function wr(e){return!e||typeof e!="string"?"":e.length<=14?e:e.slice(0,6)+"\u2026"+e.slice(-4)}function km(e){if(typeof e!="string")return null;let t=e.trim().toLowerCase().split(/\s+/).filter(Boolean);return t.length!==12&&t.length!==24?null:t}var xs="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",zy=(()=>{let e=new Map;for(let t=0;t<xs.length;t++)e.set(xs[t],t);return e})();function Hy(e){return new TextEncoder().encode(e)}function Fy(e){return new TextDecoder().decode(e)}function qy(e){let t="";for(let n=0;n<e.length;n+=3){let s=e[n],i=n+1<e.length?e[n+1]:null,a=n+2<e.length?e[n+2]:null;t+=xs[s>>2],t+=xs[(s&3)<<4|(i===null?0:i>>4)],t+=i===null?"=":xs[(i&15)<<2|(a===null?0:a>>6)],t+=a===null?"=":xs[a&63]}return t}function Gy(e){if(typeof e!="string")return null;let t=e.replace(/=+$/,"");if(!/^[A-Za-z0-9+/]*$/.test(t))return null;let n=[],s=0,i=0;for(let a of t)s=s<<6|zy.get(a),i+=6,i>=8&&(i-=8,n.push(s>>i&255));return new Uint8Array(n)}function _m(e){return qy(Hy(e))}function Sm(e){let t=Gy(e);return t===null?null:Fy(t)}function Dt(e){let t=typeof e=="string"?e:String(e?.message||e||""),n=t.toLowerCase();return n.includes("bad-passphrase")||n.includes("passphrase is incorrect")?"Wrong passphrase \u2014 check it and try again.":n.includes("wallet-exists")||n.includes("vault already exists")?"A wallet already exists on this device. Unlock it, or reset app data to start over.":n.includes("wallet-locked")||n.includes("wallet is locked")?"The wallet is locked \u2014 unlock it first.":n.includes("lock the wallet before starting a backup")?"Lock the wallet before starting a backup.":n.includes("rate-limited")||n.includes("rate limit")?"Rate limited \u2014 wait a moment and try again.":n.includes("prompt-expired")?"That approval prompt expired \u2014 try the action again.":n.includes("at least 12")?"The passphrase must be at least 12 characters long.":n.includes("bad-request")||n.includes("24 words")||n.includes("invalid mnemonic")||n.includes("checksum")?"That recovery phrase isn't valid \u2014 check each word and its order, and enter the full 24-word phrase.":n.includes("vault-corrupt")||n.includes("corrupt or tampered")?"The wallet vault is corrupt or tampered. Reset app data, then restore from your recovery phrase.":n.includes("restart required")||n.includes("recovery-required")?"The wallet engine hit an internal fault \u2014 restart PearBrowser, then try again.":n.includes("wallet-busy")?"The wallet is busy with another operation \u2014 wait a moment and try again.":n.includes("insufficient-funds")?"Insufficient balance to cover this payment and its network fee.":n.includes("ceremony-active")?"A recovery-phrase reveal is already open \u2014 finish or cancel it first.":n.includes("ceremony-failed")||n.includes("initialization-failed")||n.includes("operation-failed")?"The wallet operation failed \u2014 please try again. If you were importing, double-check every word of the recovery phrase.":n.includes("not-authorized")?"That action is not authorized for this app.":n.includes("not-found")||n.includes("not available")||n.includes("vault is absent")?"The wallet is not available yet \u2014 the worklet may still be booting. Try again in a moment.":n.includes("not-implemented")||n.includes("not implemented")?"This wallet feature is not implemented in this build.":t||"Something went wrong."}var Ii=12;function Vy(e){return typeof e!="string"?0:Array.from(e).length}function Gn(e){return Vy(e)>=Ii}function Em(e){if(typeof e!="string"||e.length===0)return{score:0,label:"",hint:"Use 12+ characters \u2014 a short sentence works well."};let t=0;return e.length>=8&&t++,e.length>=12&&t++,e.length>=16&&t++,/[a-z]/.test(e)&&/[A-Z]/.test(e)&&t++,/[0-9]/.test(e)&&t++,/[^a-zA-Z0-9\s]/.test(e)&&t++,/^[a-z]+$/.test(e)&&e.length<12&&(t=Math.min(t,1)),t<=2?{score:t,label:"weak",hint:"Too easy to guess \u2014 make it longer and mix words, digits, symbols."}:t<=4?{score:t,label:"fair",hint:"Okay \u2014 longer is better. Losing this passphrase loses the wallet."}:{score:t,label:"strong",hint:"Strong. Store it safely \u2014 there is no reset."}}function Cm(e){if(!e||typeof e!="object")return"";switch(e.type){case"intent":return e.intentType==="payment"?"Payment requested":e.intentType==="sign-app"?"App signature requested":"Request";case"prompt":return"Approval prompt opened";case"approval":return"Approved";case"rejection":return"Rejected";case"broadcast":return"Broadcast to network";case"outcome":return{submitted:"Payment submitted",expired:"Prompt expired",cancelled:"Cancelled",error:"Failed"}[e.state]||(e.state?`Outcome: ${e.state}`:"Outcome");case"connect":return"App connected";case"disconnect":return"App disconnected";case"sign-app":return"App payload signed";default:return e.type}}function Oi(e){try{navigator.clipboard?.writeText(e)}catch{}}var Tm="appearanceTheme",Pm="pearbrowser.appearanceTheme",Wy=new Set(["light","dark"]);function Mm(e){return Wy.has(e)?e:"light"}function fc(){try{return Mm(localStorage.getItem(Pm))}catch{return"light"}}function br(e){let t=Mm(e);try{document.documentElement.dataset.theme=t,document.documentElement.style.colorScheme=t,localStorage.setItem(Pm,t)}catch{}return t}br(fc());var jy=[{id:"keet",name:"Keet",nativeDelivery:{status:"migration-required"},tagline:"End-to-end encrypted P2P chat, voice, and video calls by Holepunch.",legacyMigrationId:"oeeoz3w6fjjt7bym3ndpa6hhicm8f8naxyk11z4iypeoupn6jzpo",initial:"K",gradient:"linear-gradient(135deg, #fbbf24, #f97316)"},{id:"pearpass",name:"PearPass",nativeDelivery:{status:"migration-required"},tagline:"Peer-to-peer password manager from Tether \u2014 synced across devices without a cloud.",legacyMigrationId:"tywsat7gz8m65ejx4zjn3773pbdc4j8m66tukis8dgzekraymtzo",initial:"P",gradient:"linear-gradient(135deg, #3fb950, #58a6ff)"},{id:"anongpt",name:"anonGPT",nativeDelivery:{status:"migration-required"},tagline:"Private P2P AI chat \u2014 pay-per-inference from a HiveMind seller, with signed receipts.",legacyMigrationId:"rpzh3fsgg38kfir9nmae7x3o8ubofddzzixr5js4mxd6a6drb6wo",initial:"A",gradient:"linear-gradient(135deg, #22d3ee, #6366f1)"},{id:"pearpaste",name:"Paste",nativeDelivery:{status:"migration-required"},tagline:"Local-first, end-to-end encrypted notes & clipboard sync for your own devices \u2014 no account, no cloud.",legacyMigrationId:"qnax5k8ojtod51ci9qwkrawdof1hx5w3a7gqbueoqnzzq9dw5hfo",initial:"\u{1F4CB}",gradient:"linear-gradient(135deg, #4ade80, #22d3ee)"},{id:"peercord",name:"Peercord",nativeDelivery:{status:"migration-required"},tagline:"Decentralized Discord-style chat with text, voice, video, screen sharing, and P2P file transfer.",legacyMigrationId:"wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy",initial:"P",gradient:"linear-gradient(135deg, #5865f2, #22d3ee)"}],Yy={browse:{label:"Browse"},apps:{label:"Apps"},sites:{label:"P2P Sites"},library:{label:"Library"},settings:{label:"Settings"}},Om="hyper://03f0060a35451cfb6b68ad1dda1b8474ebb43fd9100071ccf7d67679a83ebb4f/",Um="ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4",Qy="hyper://"+Um+"/",Xy="ac1977a75cc84b46af0af8bb559cd4ebbe10507eb0f51d863e289d09635f6d74",Bm="hyper://"+Xy+"/",vc=[{url:"",title:"PearBrowser Home"},{url:Om,title:"PearBrowser"},{url:Bm,title:"P2P Builders"},{url:Qy,title:"peerit"}],dc=new Map(vc.map(e=>[e.url,e.title]));function Km(e){let t=Je(e).replace(/#.*$/,"");if(!t)return"";if(dc.has(t))return dc.get(t);try{let n=new URL(t);return n.protocol!=="hyper:"||!n.hostname?"":dc.get(`hyper://${n.hostname}/`)||""}catch{return""}}function Jy(e){let t=String(e||"").replace(/^\/+/,"").split("/").filter(Boolean).pop();if(!t)return"";try{return decodeURIComponent(t)}catch{return t}}function _r(e){let t=Je(e);if(!t)return"New tab";let n=Km(t);if(n)return n;try{let i=new URL(t);if(i.protocol==="hyper:"&&i.hostname){let a=ge(i.hostname),r=Jy(i.pathname);return r?`${a} / ${r}`:a}if(i.hostname)return i.hostname}catch{}let s=t.replace(/^hyper:\/\//i,"");return s.length>40?s.slice(0,37)+"...":s}function Zy(e,t){let n=Km(t);if(n)return n;let s=en(e,"").trim();return s&&s!==t&&!/^hyper:\/\//i.test(s)?s:_r(t)}function Pi(e="",t={}){let n=Je(e);return vr(n,{...t,title:en(t.title,n?_r(n):"New tab")})}function zm(e){return en(e?.title,_r(e?.displayUrl||e?.url||""))}function eh(e){let t=zm(e),n=e?.displayUrl||e?.url||"";return n&&n!==t?`${t}
${n}`:t}var pc="hyperbee://f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d",Ds="hyperbee://5d961fdc2f56215463e5d4656dd4a3f22bb5e15b93f9bfc8439a63a18f974d75",th="0c35d12fd9b1115dd2d1fb1cd1751817c9173d3196ac7c62ae37d023340dcb75";function Am(e,t){return e.kind==="sheets"?{cmd:t.CMD_SHEETS_LOAD,payload:{link:e.key},persistRef:`sheets://${e.key}`}:e.kind==="hiveindex"?{cmd:t.CMD_LOAD_CATALOG_INDEX,payload:{link:e.key},persistRef:`hiveindex://${e.key}`}:e.autobee?{cmd:t.CMD_LOAD_CATALOG_AUTOBEE,persistRef:`autobee://${e.key}`}:e.bee?{cmd:t.CMD_LOAD_CATALOG_BEE,persistRef:`hyperbee://${e.key}`}:{cmd:t.CMD_LOAD_CATALOG,persistRef:e.key}}function nh(e){if(!e||typeof e!="string")return null;let t;try{t=new URL(e)}catch{return null}let n=t.protocol.replace(":","");if(n!=="hyper"&&n!=="pear")return null;let s=t.hostname||t.pathname.split("/")[0]||"";if(!s)return null;let i=null,a=null;return/^[0-9a-f]{64}$/i.test(s)?(i=s.toLowerCase(),a=um(i)):/^[13-9a-km-uw-z]{52}$/i.test(s)&&(a=s.toLowerCase(),i=pr(a)),{proto:n,raw:s,hex:i,z32:a,path:t.pathname||"/",urlStr:e}}function Li(e,t,n=t+"s"){let s=Number.isFinite(e)?e:0;return`${s} ${s===1?t:n}`}function sh(e,t){if(t)return{tone:"warn",text:`Live metadata unavailable: ${t}`};if(!e)return{tone:"pending",text:"Checking live drive metadata\u2026"};let n=e.relay||{};return n.available?n.advertisedRelays>0?{tone:"ok",text:`Pinned: advertised by ${Li(n.advertisedRelays,"relay")}.`}:n.seedAcceptances>0&&n.durable?{tone:"ok",text:`Pinned by this client: ${Li(n.seedAcceptances,"relay")} accepted and ${Li(n.activePeers,"peer")} is replicating.`}:n.seedAcceptances>0?{tone:"warn",text:`${Li(n.seedAcceptances,"relay")} accepted the pin request; waiting for a live replication peer.`}:n.connectedRelays>0?{tone:"neutral",text:`No pin signal for this drive from ${Li(n.connectedRelays,"connected relay")}.`}:{tone:"warn",text:"No HiveRelay connections yet; discovery is currently pure P2P."}:{tone:"warn",text:"HiveRelay client is unavailable; using pure P2P discovery."}}function ih({rpc:e,C:t,url:n,onClose:s,onBookmarkToggle:i}){let a=nh(n),r=a?.hex||"",[l,u]=(0,d.useState)(null),[c,h]=(0,d.useState)(null),[$,v]=(0,d.useState)(""),[N,_]=(0,d.useState)(null),[w,E]=(0,d.useState)({});(0,d.useEffect)(()=>{n&&e.request(t.CMD_USERDATA_LIST_BOOKMARKS).then(x=>{let g=x?.bookmarks||[];u(g.some(S=>S&&S.url===n))}).catch(()=>u(!1))},[n,e,t]),(0,d.useEffect)(()=>{if(!r){h(null),v("");return}let x=!1;h(null),v("");let g=async()=>{try{let R=await e.request(t.CMD_GET_DRIVE_INFO,{keyHex:r},1e4);x||(h(R),v(""))}catch(R){x||v(R.message||"unknown error")}};g();let S=setInterval(g,5e3);return()=>{x=!0,clearInterval(S)}},[r,e,t]);let y=(x,g)=>{try{navigator.clipboard?.writeText(g),E({...w,[x]:!0}),setTimeout(()=>E(S=>({...S,[x]:!1})),1500)}catch{}},f=async()=>{if(!N){_("bookmark");try{l?(await e.request(t.CMD_USERDATA_REMOVE_BOOKMARK,{url:n}),u(!1)):(await e.request(t.CMD_USERDATA_ADD_BOOKMARK,{url:n,title:n}),u(!0)),i?.()}catch{}finally{_(null)}}},p=sh(c,$),k=Number(c?.updatedAt),b=Number.isFinite(k)&&k>0?new Date(k).toLocaleTimeString():"";return o`
    <div className="modal-overlay" role="dialog" aria-modal="true"
         onClick=${x=>x.target.classList.contains("modal-overlay")&&s()}>
      <div className="modal-card about-card">
        <div className="about-head">
          <div className="about-title">About this site</div>
          <button className="about-close" onClick=${s} title="Close">×</button>
        </div>

        <div className="about-section-label">FULL URL</div>
        <div className="about-row">
          <code className="about-mono">${n||"(no URL loaded)"}</code>
          <button className="copy-btn-small ${w.url?"copied":""}"
                  onClick=${()=>y("url",n)} disabled=${!n}>
            ${w.url?"\u2713":"Copy"}
          </button>
        </div>

        ${a&&a.hex&&o`
          <div className="about-section-label">DRIVE KEY (hex)</div>
          <div className="about-row">
            <code className="about-mono">${a.hex}</code>
            <button className="copy-btn-small ${w.hex?"copied":""}"
                    onClick=${()=>y("hex",a.hex)}>
              ${w.hex?"\u2713":"Copy"}
            </button>
          </div>
        `}

        ${a&&a.z32&&o`
          <div className="about-section-label">DRIVE KEY (z-base-32)</div>
          <div className="about-row">
            <code className="about-mono">${a.z32}</code>
            <button className="copy-btn-small ${w.z32?"copied":""}"
                    onClick=${()=>y("z32",a.z32)}>
              ${w.z32?"\u2713":"Copy"}
            </button>
          </div>
        `}

        ${a&&o`
          <div className="about-meta-grid">
            <div>
              <div className="about-meta-label">Scheme</div>
              <div className="about-meta-value">${a.proto}://</div>
            </div>
            <div>
              <div className="about-meta-label">Path</div>
              <div className="about-meta-value">${a.path}</div>
            </div>
          </div>
        `}

        ${a&&a.hex&&o`
          <div className="about-section-label">LIVE DRIVE</div>
          <div className="about-meta-grid about-live-grid">
            <div>
              <div className="about-meta-label">Version</div>
              <div className="about-meta-value">${c?c.version??"\u2014":"\u2026"}</div>
            </div>
            <div>
              <div className="about-meta-label">Peers</div>
              <div className="about-meta-value" title=${c?`${c.metadataPeerCount||0} metadata \xB7 ${c.blobPeerCount||0} blob`:""}>
                ${c?c.peerCount||0:"\u2026"}
              </div>
            </div>
            <div>
              <div className="about-meta-label">Relays</div>
              <div className="about-meta-value">${c?c.relay?.connectedRelays||0:"\u2026"}</div>
            </div>
            <div>
              <div className="about-meta-label">Cached</div>
              <div className="about-meta-value">${c?mr(c.byteLength):"\u2026"}</div>
            </div>
            <div>
              <div className="about-meta-label">Mode</div>
              <div className="about-meta-value">${c?c.writable?"writable":"read-only":"\u2026"}</div>
            </div>
            <div>
              <div className="about-meta-label">Fetch</div>
              <div className="about-meta-value">${c?c.relay?.hybridFetchEnabled?"hybrid":"P2P":"\u2026"}</div>
            </div>
          </div>
          <div className=${"about-pin-status "+p.tone}>${p.text}</div>
        `}

        ${c&&c.discoveryKey&&o`
          <div className="about-section-label">DISCOVERY KEY</div>
          <div className="about-row">
            <code className="about-mono">${c.discoveryKey}</code>
            <button className="copy-btn-small ${w.discovery?"copied":""}"
                    onClick=${()=>y("discovery",c.discoveryKey)}>
              ${w.discovery?"\u2713":"Copy"}
            </button>
          </div>
        `}

        <div className="about-section-label">YOUR LIBRARY</div>
        <div className="about-row about-bookmark-row">
          <div>
            ${l===null?o`<span className="settings-subtle">Checking…</span>`:l?o`<span style=${{color:"#ff9500"}}>★ Bookmarked</span>`:o`<span className="settings-subtle">Not in your bookmarks</span>`}
          </div>
          <button className="btn ${l?"subtle":"primary"}"
                  onClick=${f}
                  disabled=${N==="bookmark"||l===null||!n}>
            ${N==="bookmark"?"\u2026":l?"Remove bookmark":"Bookmark this site"}
          </button>
        </div>

        ${c&&o`
          <div className="about-foot">
            ${b?`Updated ${b} \xB7 `:""}
            ${c.relay?.hybridFetchEnabled?"hybrid relay fetch enabled":"pure P2P fetch"}
          </div>
        `}
      </div>
    </div>
  `}var ah=["Summarize this page","What are the key claims?","Explain this simply","What should I verify?"];function rh({rpc:e,C:t,activeTab:n,captureContext:s,onClose:i}){let[a,r]=(0,d.useState)(null),[l,u]=(0,d.useState)(""),[c,h]=(0,d.useState)(""),[$,v]=(0,d.useState)(""),[N,_]=(0,d.useState)([]),[w,E]=(0,d.useState)(()=>Sn()),[y,f]=(0,d.useState)(""),[p,k]=(0,d.useState)(null),[b,x]=(0,d.useState)(!1),g=(0,d.useRef)(""),S=(0,d.useRef)(""),R=(0,d.useRef)(null),D=(0,d.useRef)(""),H=(0,d.useRef)(null),W=(0,d.useRef)(0),G=(0,d.useRef)(`${n?.id||""}
${n?.url||""}`),F=["starting","loading-model","streaming"].includes(w.status),B=Array.isArray(a?.models)?a.models:[],A=B.find(M=>M.alias===c)||null;(0,d.useEffect)(()=>{let M=!1;return u(""),e.request(t.CMD_ASK_BROWSER_CAPABILITIES).then(K=>{if(M)return;r(K);let V=Array.isArray(K?.models)?K.models:[],T=V.find(L=>L.recommended)||V.find(L=>L.provider==="ollama")||V[0];h(L=>V.some(ie=>ie.alias===L)?L:T?.alias||"")}).catch(K=>{M||u(K.message||"Local AI runtime is unavailable")}),()=>{M=!0}},[e,t]),(0,d.useEffect)(()=>{let M=K=>{let V=K.detail;!V||V.streamId!==g.current||E(T=>Fn(T,V))};return e.addEventListener(`event:${t.EVT_ASK_BROWSER_STREAM}`,M),()=>e.removeEventListener(`event:${t.EVT_ASK_BROWSER_STREAM}`,M)},[e,t]),(0,d.useEffect)(()=>{if(!["done","cancelled","error"].includes(w.status)||!w.streamId||D.current===w.streamId)return;D.current=w.streamId;let K=S.current;K&&_(V=>[...V,{id:w.streamId,question:K,answer:Di(w.text),error:w.error,finishReason:w.finishReason,stats:w.stats,source:R.current}].slice(-20)),w.status==="done"&&r(V=>V&&{...V,models:(V.models||[]).map(T=>T.alias===c?{...T,installed:!0}:T)}),g.current="",S.current="",f(""),x(!1)},[w]),(0,d.useEffect)(()=>{let M=H.current;M&&(M.scrollTop=M.scrollHeight)},[N,w.text,w.status]),(0,d.useEffect)(()=>{let M=`${n?.id||""}
${n?.url||""}`;if(G.current===M)return;G.current=M,W.current++;let K=g.current;K&&e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:K}).catch(()=>{}),g.current="",S.current="",R.current=null,D.current="",_([]),E(Sn()),f(""),k(null),x(!1)},[n?.id,n?.url,e,t]),(0,d.useEffect)(()=>()=>{W.current++;let M=g.current;g.current="",M&&e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:M}).catch(()=>{})},[e,t]);let J=async M=>{M?.preventDefault?.();let K=$.trim();if(!K||F||!c)return;let V=hr(),T=++W.current;D.current="",g.current=V,S.current=K,R.current=null,f(K),k(null),x(!1),v(""),E(Sn(V));try{let L=await s();if(W.current!==T||g.current!==V)return;let ie={tabId:L.tabId,url:L.url,title:L.title,textBytes:L.textBytes,available:L.available,truncated:L.truncated,source:L.source};R.current=ie,k(ie);let $e=N.filter(me=>me.source?.tabId===L.tabId&&me.source?.url===L.url).slice(-3).flatMap(me=>{let mt=[{role:"user",content:me.question}];return me.answer&&mt.push({role:"assistant",content:me.answer}),mt}),ee=await e.request(t.CMD_ASK_BROWSER_START,{streamId:V,model:c,question:K,history:$e,page:L,maxTokens:256,temperature:.2},3e4);if(W.current!==T||g.current!==V){e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:V}).catch(()=>{});return}let j={...ie,...ee?.source||{}};R.current=j,k(j)}catch(L){if(W.current!==T||g.current!==V)return;E(ie=>Fn(ie,{streamId:V,event:{type:"error",code:L?.code||"ask-browser-failed",message:L?.message||"Ask Browser failed"}}))}},P=async()=>{let M=g.current;if(!(!M||b)){W.current++,x(!0),E(K=>Fn(K,{streamId:M,event:{type:"done",finishReason:"cancelled"}}));try{await e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:M})}catch{}}},ne=()=>{if(g.current){W.current++;let M=g.current;g.current="",S.current="",f(""),E(Sn()),x(!1),e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:M}).catch(()=>{})}R.current=null,k(null),_([])},ue=()=>{W.current++;let M=g.current;g.current="",M&&e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:M}).catch(()=>{}),i()},O=Di(w.text),I=p||N[N.length-1]?.source||{tabId:n?.id||"",url:n?.url||"",title:n?.title||n?.url||"No active page"},Z=b?"Stopping\u2026":w.status==="starting"?"Reading current page\u2026":w.status==="loading-model"?`Loading model${Number.isFinite(w.modelProgress)?` \xB7 ${Math.round(w.modelProgress*100)}%`:"\u2026"}`:w.status==="streaming"?"Generating locally\u2026":"";return o`
    <aside id="ask-browser-panel" className="ask-browser-panel" aria-label="Ask Browser" data-testid="ask-browser-panel">
      <div className="ask-browser-header">
        <div>
          <div className="ask-browser-title">Ask Browser</div>
          <div className="ask-browser-local"><span></span>Local only</div>
        </div>
        <div className="ask-browser-header-actions">
          <button type="button" className="ask-browser-text-button" onClick=${ne} disabled=${N.length===0&&!F}>Clear</button>
          <button type="button" className="ask-browser-close" aria-label="Close Ask Browser" onClick=${ue}>×</button>
        </div>
      </div>

      <div className="ask-browser-model-row">
        <label htmlFor="ask-browser-model">Model</label>
        <select id="ask-browser-model" data-testid="ask-browser-model" value=${c} disabled=${F||B.length===0}
          onChange=${M=>h(M.target.value)}>
          ${B.map(M=>o`<option key=${M.alias} value=${M.alias}>${M.label||oc(M.alias)}${M.expectedSize?` \xB7 ${$r(M.expectedSize)}`:""}</option>`)}
        </select>
        ${A&&o`<div className="ask-browser-model-meta">${A.provider||"local"}${A.quantization?` \xB7 ${A.quantization}`:""}${A.installed?" \xB7 loaded":" \xB7 loads on first use"}</div>`}
      </div>

      <div className="ask-browser-source" title=${I.url||""}>
        <div className="ask-browser-source-kicker">Source [1] · current tab</div>
        <div className="ask-browser-source-title">${I.title||I.url||"No active page"}</div>
        <div className="ask-browser-source-url">${I.url||"Open a page to add context"}</div>
        ${p&&o`<div className="ask-browser-source-meta">${p.available||p.hasText?`${$r(p.textBytes||0)} captured`:"Metadata only"}${p.truncated?" \xB7 truncated":""}</div>`}
      </div>

      <div className="ask-browser-transcript" ref=${H}>
        ${N.length===0&&!y&&o`
          <div className="ask-browser-empty">
            <div className="ask-browser-spark">✦</div>
            <div className="ask-browser-empty-title">Ask about what you’re viewing</div>
            <div className="ask-browser-empty-copy">Page context stays on this device and is sent only to the selected local model.</div>
            <div className="ask-browser-quick-grid">
              ${ah.map(M=>o`<button type="button" key=${M} onClick=${()=>v(M)}>${M}</button>`)}
            </div>
          </div>
        `}
        ${N.map(M=>o`
          <div className="ask-browser-turn" key=${M.id}>
            <div className="ask-browser-message ask-browser-user">${M.question}</div>
            <div className=${`ask-browser-message ask-browser-assistant${M.error?" error":""}`}>
              ${M.error?M.error.message:M.answer||(M.finishReason==="cancelled"?"Stopped.":"No answer returned.")}
              ${M.finishReason==="cancelled"&&M.answer?o`<span className="ask-browser-interrupted"> Response stopped.</span>`:null}
            </div>
            ${M.source&&o`<div className="ask-browser-turn-source">[1] ${M.source.title||M.source.url||"Captured page"}</div>`}
            ${M.stats&&o`<div className="ask-browser-stats">${Number.isFinite(M.stats.tokensPerSecond)?`${M.stats.tokensPerSecond.toFixed(1)} tok/s`:""}${M.stats.backendDevice?` \xB7 ${M.stats.backendDevice}`:""}</div>`}
          </div>
        `)}
        ${y&&o`
          <div className="ask-browser-turn active">
            <div className="ask-browser-message ask-browser-user">${y}</div>
            <div className="ask-browser-message ask-browser-assistant">
              ${O||o`<span className="ask-browser-thinking">${Z||"Thinking locally\u2026"}</span>`}
            </div>
          </div>
        `}
      </div>

      <form className="ask-browser-composer" onSubmit=${J}>
        <div className="ask-browser-live-status" role="status" aria-live="polite">${Z}</div>
        ${l&&o`<div className="ask-browser-error">${l}</div>`}
        ${a&&a.available===!1&&o`<div className="ask-browser-error">${a.reason||"Local AI runtime is unavailable"}</div>`}
        <textarea data-testid="ask-browser-input" value=${$}
          aria-label="Question about the current page"
          onInput=${M=>v(M.target.value)}
          onKeyDown=${M=>{M.key==="Enter"&&(M.metaKey||M.ctrlKey)&&J(M)}}
          placeholder="Ask about this page…" rows="3" disabled=${F||!a?.available}></textarea>
        <div className="ask-browser-compose-row">
          <span>⌘↵ to send</span>
          ${F?o`<button type="button" className="ask-browser-stop" data-testid="ask-browser-stop" onClick=${P} disabled=${b}>${b?"Stopping\u2026":"Stop"}</button>`:o`<button type="submit" className="ask-browser-send" data-testid="ask-browser-send" disabled=${!$.trim()||!c||!a?.available}>Ask</button>`}
        </div>
      </form>
    </aside>
  `}var lh=["What is the peer-to-peer web?","Summarize what a Hyperdrive is","Draft a short intro post for peerit"];function oh({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[i,a]=(0,d.useState)(""),[r,l]=(0,d.useState)(""),[u,c]=(0,d.useState)(""),[h,$]=(0,d.useState)([]),[v,N]=(0,d.useState)(()=>Sn()),[_,w]=(0,d.useState)(""),[E,y]=(0,d.useState)(!1),f=(0,d.useRef)(""),p=(0,d.useRef)(""),k=(0,d.useRef)(""),b=(0,d.useRef)(null),x=(0,d.useMemo)(()=>cc(n),[n]),g=["starting","loading-model","streaming"].includes(v.status),S=x.models,R=S.find(B=>B.alias===r)||null;(0,d.useEffect)(()=>{let B=!1;return a(""),e.request(t.CMD_ASK_BROWSER_CAPABILITIES).then(A=>{if(B)return;s(A);let J=Array.isArray(A?.models)?A.models:[];l(P=>Nm(J,P))}).catch(A=>{B||a(A.message||"Local AI runtime is unavailable")}),()=>{B=!0}},[e,t]),(0,d.useEffect)(()=>{let B=A=>{let J=A.detail;!J||J.streamId!==f.current||N(P=>Fn(P,J))};return e.addEventListener(`event:${t.EVT_ASK_BROWSER_STREAM}`,B),()=>e.removeEventListener(`event:${t.EVT_ASK_BROWSER_STREAM}`,B)},[e,t]),(0,d.useEffect)(()=>{if(!["done","cancelled","error"].includes(v.status)||!v.streamId||k.current===v.streamId)return;k.current=v.streamId;let A=p.current;A&&$(J=>[...J,{id:v.streamId,question:A,answer:Di(v.text),error:v.error,finishReason:v.finishReason,stats:v.stats}].slice(-8)),v.status==="done"&&s(J=>J&&{...J,models:(J.models||[]).map(P=>P.alias===r?{...P,installed:!0}:P)}),f.current="",p.current="",w(""),y(!1)},[v]),(0,d.useEffect)(()=>{let B=b.current;B&&(B.scrollTop=B.scrollHeight)},[h,v.text,v.status]),(0,d.useEffect)(()=>()=>{let B=f.current;f.current="",B&&e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:B}).catch(()=>{})},[e,t]);let D=async B=>{B?.preventDefault?.();let A=u.trim();if(!A||g||!r)return;let J=hr();k.current="",f.current=J,p.current=A,w(A),y(!1),c(""),N(Sn(J));try{let P=h.slice(-3).flatMap(ne=>{let ue=[{role:"user",content:ne.question}];return ne.answer&&ue.push({role:"assistant",content:ne.answer}),ue});await e.request(t.CMD_ASK_BROWSER_START,wm({streamId:J,model:r,question:A,history:P}),3e4)}catch(P){if(f.current!==J)return;N(ne=>Fn(ne,{streamId:J,event:{type:"error",code:P?.code||"quick-ask-failed",message:P?.message||"Local AI request failed"}}))}},H=async()=>{let B=f.current;if(!(!B||E)){y(!0),N(A=>Fn(A,{streamId:B,event:{type:"done",finishReason:"cancelled"}}));try{await e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:B})}catch{}}},W=()=>{let B=f.current;f.current="",p.current="",B&&e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:B}).catch(()=>{}),$([]),N(Sn()),w(""),y(!1)},G=Di(v.text),F=E?"Stopping\u2026":v.status==="starting"?"Starting locally\u2026":v.status==="loading-model"?`Loading model${Number.isFinite(v.modelProgress)?` \xB7 ${Math.round(v.modelProgress*100)}%`:"\u2026"}`:v.status==="streaming"?"Generating locally\u2026":"";return i||n&&!x.available?o`
      <section className="qvac-widget unavailable" data-testid="qvac-widget" aria-label="Local AI">
        <div className="qvac-widget-header">
          <span className="qvac-widget-spark">✦</span>
          <span className="qvac-widget-title">Local AI</span>
          <span className="qvac-widget-badge">QVAC · on-device</span>
        </div>
        <div className="qvac-widget-status" data-testid="qvac-widget-status">
          ${i||uc(x)}
        </div>
      </section>
    `:n?o`
    <section className="qvac-widget" data-testid="qvac-widget" aria-label="Local AI">
      <div className="qvac-widget-header">
        <span className="qvac-widget-spark">✦</span>
        <span className="qvac-widget-title">Local AI</span>
        <span className="qvac-widget-badge">QVAC · on-device</span>
        <span className="qvac-widget-header-space"></span>
        ${(h.length>0||g)&&o`<button type="button" className="qvac-widget-text-button" onClick=${W}>Clear</button>`}
      </div>
      <div className="qvac-widget-status" data-testid="qvac-widget-status">${uc(x)}</div>

      ${(h.length>0||_)&&o`
        <div className="qvac-widget-transcript" ref=${b} data-testid="qvac-widget-transcript">
          ${h.map(B=>o`
            <div className="qvac-widget-turn" key=${B.id}>
              <div className="qvac-widget-question">${B.question}</div>
              <div className=${`qvac-widget-answer${B.error?" error":""}`}>
                ${B.error?B.error.message:B.answer||(B.finishReason==="cancelled"?"Stopped.":"No answer returned.")}
              </div>
              ${B.stats&&o`<div className="qvac-widget-stats">${Number.isFinite(B.stats.tokensPerSecond)?`${B.stats.tokensPerSecond.toFixed(1)} tok/s`:""}${B.stats.backendDevice?` \xB7 ${B.stats.backendDevice}`:""}</div>`}
            </div>
          `)}
          ${_&&o`
            <div className="qvac-widget-turn active">
              <div className="qvac-widget-question">${_}</div>
              <div className="qvac-widget-answer">
                ${G||o`<span className="qvac-widget-thinking">${F||"Thinking locally\u2026"}</span>`}
              </div>
            </div>
          `}
        </div>
      `}

      ${h.length===0&&!_&&o`
        <div className="qvac-widget-quick-grid">
          ${lh.map(B=>o`<button type="button" key=${B} onClick=${()=>c(B)}>${B}</button>`)}
        </div>
      `}

      <form className="qvac-widget-composer" onSubmit=${D}>
        <input
          type="text"
          data-testid="qvac-widget-input"
          value=${u}
          aria-label="Ask the local model"
          onInput=${B=>c(B.target.value)}
          placeholder="Ask anything — answered on this device…"
          disabled=${g}
        />
        ${g?o`<button type="button" className="qvac-widget-stop" data-testid="qvac-widget-stop" onClick=${H} disabled=${E}>${E?"\u2026":"Stop"}</button>`:o`<button type="submit" className="qvac-widget-send" data-testid="qvac-widget-send" disabled=${!u.trim()||!r}>Ask</button>`}
      </form>

      <div className="qvac-widget-footer">
        <select
          className="qvac-widget-model"
          data-testid="qvac-widget-model"
          value=${r}
          disabled=${g||S.length===0}
          aria-label="Local model"
          onChange=${B=>l(B.target.value)}>
          ${S.map(B=>o`<option key=${B.alias} value=${B.alias}>${B.label||oc(B.alias)}</option>`)}
        </select>
        ${R&&o`<span className="qvac-widget-model-meta">${R.installed?"ready":R.expectedSize?`${$r(R.expectedSize)} \xB7 loads on first use`:"loads on first use"}</span>`}
        <span className="qvac-widget-live" role="status" aria-live="polite">${F}</span>
      </div>
    </section>
  `:null}function ch({rpc:e,C:t,navUrl:n,onNavigated:s,tabs:i,setTabs:a,activeId:r,setActiveId:l,closedTabs:u,setClosedTabs:c,sessionReady:h,onOpenSettings:$}){let v=(0,d.useRef)(null),N=(0,d.useRef)({}),_=(0,d.useRef)({}),w=(0,d.useRef)(r),E=(0,d.useRef)(new Set),[y,f]=(0,d.useState)(""),[p,k]=(0,d.useState)(""),[b,x]=(0,d.useState)(!1),[g,S]=(0,d.useState)(!1),[R,D]=(0,d.useState)([]),[H,W]=(0,d.useState)(!1),[G,F]=(0,d.useState)(-1),B=(0,d.useRef)(0),A=i.find(C=>C.id===r)||i[0];w.current=r;let J=async()=>{let C=i.find(Te=>Te.id===w.current)||A;if(!C)return gr(null,{});let U=N.current[C.id],Y=U?.contentWindow,se=_.current[C.id]||0,re=()=>{let Te="";try{Te=U?.contentDocument?.body?.innerText||""}catch{}return gr({tabId:C.id,text:Te,source:Te?"renderer-dom":"metadata"},C,{maxTextBytes:5*1024})};if(!Y||!C.contextToken||typeof MessageChannel>"u")return re();let te;try{te=new URL(C.src).origin}catch{return re()}let le=hr(),pe=new MessageChannel;return await new Promise((Te,zt)=>{let Ge=!1,Ht=()=>w.current===C.id&&N.current[C.id]?.contentWindow===Y&&(_.current[C.id]||0)===se,Ne=(Ve,We)=>{if(!Ge){Ge=!0,clearTimeout(bt);try{pe.port1.close()}catch{}Ve?zt(Ve):Te(We)}},rt=()=>{if(!Ht()){Ne(new Error("The active tab changed while Ask Browser was reading it"));return}Ne(null,re())},bt=setTimeout(rt,1500);pe.port1.onmessage=Ve=>{let We=Ve.data;if(!(!We||We.type!=="pearbrowser:context-response"||We.v!==1||We.requestId!==le)){if(!Ht()){Ne(new Error("The active tab changed while Ask Browser was reading it"));return}Ne(null,gr({...We,tabId:C.id,source:"authenticated-page-context"},C,{maxTextBytes:5*1024}))}},pe.port1.start?.();try{Y.postMessage({type:"pearbrowser:context-request",v:1,requestId:le,contextToken:C.contextToken},te,[pe.port2])}catch{rt()}})};(0,d.useEffect)(()=>{r==="placeholder"&&i.length>0&&l(i[0].id)},[r,i]);let P=(C,U)=>a(Y=>Y.map(se=>se.id===C?{...se,...U}:se)),ne=C=>{l(C);let U=i.find(Y=>Y.id===C);U&&f(U.displayUrl||"")},ue=(C,U)=>{t.CMD_RELEASE_ORIGIN&&(!C||$m(U,C)||e.request(t.CMD_RELEASE_ORIGIN,{keyHex:C}).catch(()=>{}))},[O,I]=(0,d.useState)(!1),[Z,M]=(0,d.useState)(!1);(0,d.useEffect)(()=>{let C=!1;return e.request(t.CMD_USERDATA_GET_SETTINGS).then(U=>{if(C)return;let Y=Rt(U)||{};I(Y.historyEnabled===!0),M(Y.searchIndexEnabled===!0)}).catch(()=>{}),()=>{C=!0}},[e,t]),(0,d.useEffect)(()=>{A&&f(A.displayUrl||"")},[A?.id,A?.displayUrl]);let K=async(C,U,Y={})=>{let se=U||r,re=Y.recordHistory!==!1,te=O&&(Y.rememberVisit??re),le=null,pe=null,Te=String(C??"").trim(),Ge=(/^pearname:\/\//i.test(Te)?fm(Te):null)||(pm(Te)?Te:null);if(Ge)try{let{resolved:Ne}=await e.request(t.CMD_NAME_RESOLVE,{name:Ge});if(Ne?.legacyMigrationId){P(se,{status:`migration required for ${Ne.label||Ge} \xB7 ${Ne.provenance}\u2026`});try{let rt=await e.request(t.CMD_LEGACY_APP_MIGRATION,{legacyMigrationId:Ne.legacyMigrationId},1e4);P(se,{status:rt?.message||"A verified native v3 package is required."})}catch(rt){P(se,{status:`error: ${rt.message}`})}return}Ne&&(Ne.link||Ne.key)&&(le=Ne.link||`hyper://${Ne.key}/`,pe={provenance:Ne.provenance,label:Ne.label||Ge,name:Ge,source:Ne.source||null})}catch{}if(le||(le=Qo(C)),!le)return;let Ht=pe?pe.label:_r(le);P(se,{status:`resolving ${Ht}\u2026`,displayUrl:le,title:Ht});try{let Ne=i.find(We=>We.id===se),rt=xi(Ne),bt=Ts(le),Ve=await e.request(t.CMD_NAVIGATE,{url:le});a(We=>We.map(Ue=>{if(Ue.id!==se)return Ue;let nn=Array.isArray(Ue.history)?Ue.history:[],jn=Number.isInteger(Ue.histIdx)?Ue.histIdx:-1;if(re){let Ls=nc(nn,jn,le);nn=Ls.history,jn=Ls.histIdx}else Number.isInteger(Y.historyIndex)&&(jn=Ai(nn,Y.historyIndex));let Yn=Ve.kind||(dm(Ve.url||le)?"clearnet":"hyper"),Qn=Ve.url||le;return{...Ue,src:Ve.localUrl,status:"",history:nn,histIdx:jn,url:Qn,displayUrl:Qn,title:Ht,nameProv:pe,contextToken:Ve.contextToken||null,kind:Yn,clearnetMode:Ve.mode||null,shieldActive:Ve.shieldActive!==!1&&Yn!=="clearnet"?!0:!!Ve.shieldActive}})),rt&&rt!==bt&&ue(rt,i.filter(We=>We.id!==se)),te&&e.request(t.CMD_USERDATA_ADD_HISTORY,{url:le,title:Ht}).catch(()=>{})}catch(Ne){P(se,{status:`error: ${Ne.message}`})}},V=(C,U)=>{try{if(!Z)return;let Y=C&&(C.url||C.displayUrl)||"";if(!/^hyper:\/\//i.test(Y))return;let se=Y.replace(/^hyper:\/\//i,""),re=se.indexOf("/"),te=re>=0?se.slice(0,re):se,le=re>=0?se.slice(re):"/",pe="",Te="";try{let Ge=U&&U.contentDocument;Ge&&(pe=Ge.title||"",Te=(Ge.body&&Ge.body.innerText||"").slice(0,2e5))}catch{}let zt=Zy(pe,Y);zt&&zt!==C.title&&P(C.id,{title:zt}),e.request(t.CMD_SEARCH_INDEX,{driveKey:te,path:le,title:pe||Y,text:Te}).catch(()=>{})}catch{}},T=async()=>{let C=Qo(y);if(C)try{await e.request(t.CMD_USERDATA_ADD_BOOKMARK,{url:C,title:C}),P(r,{status:`bookmarked ${C}`}),setTimeout(()=>P(r,{status:""}),1500)}catch(U){P(r,{status:`bookmark failed: ${U.message}`})}},L=()=>{let C=A?.history||[];if(!A||A.histIdx<=0)return;let U=A.histIdx-1,Y=C[U];K(Y,A.id,{recordHistory:!1,rememberVisit:!1,historyIndex:U})},ie=()=>{let C=A?.history||[];if(!A||A.histIdx>=C.length-1)return;let U=A.histIdx+1,Y=C[U];K(Y,A.id,{recordHistory:!1,rememberVisit:!1,historyIndex:U})},$e=()=>{let C=N.current[r];C&&C.src&&(C.src=C.src)},ee=(C="")=>{let U=Pi(C);a(Y=>[...Y,U]),l(U.id),f(C||"")},j=C=>{C?.preventDefault?.();let U=bm(p);U&&(k(""),K(U,r,{rememberVisit:!1}))},me=C=>{let U=i.find(te=>te.id===C),Y=As(U);Y&&c(te=>[Y,...te].slice(0,fr));let se=i.findIndex(te=>te.id===C);if(se===-1)return;let re=i.filter(te=>te.id!==C);if(ue(xi(U),re),delete N.current[C],delete _.current[C],re.length===0){let te=Pi("");a([te]),l(te.id),f("");return}if(a(re),C===r){let te=re[Math.min(se,re.length-1)];l(te.id),f(te.displayUrl||"")}},mt=()=>{let C=u[0];if(!C)return;let U=sc(C);U&&(c(Y=>Y.slice(1)),a(Y=>ic([...Y,U])),l(U.id),f(U.displayUrl||""))},Rs=C=>{a(U=>ic(U.map(Y=>Y.id===C?{...Y,pinned:!Y.pinned}:Y)))},Wn=()=>{try{if(!N.current[r]?.contentWindow)return;if(globalThis.pearbrowserRuntime?.openDevTools){globalThis.pearbrowserRuntime.openDevTools();return}console.log("[devtools] native host does not expose openDevTools"),P(r,{status:"devtools are unavailable in this native build"}),setTimeout(()=>P(r,{status:""}),3e3)}catch(C){console.error("[devtools] failed:",C)}};(0,d.useEffect)(()=>{let C=U=>{if(U.metaKey||U.ctrlKey){if(U.key==="t"||U.key==="T")U.preventDefault(),U.shiftKey?mt():ee();else if(U.key==="w"||U.key==="W")U.preventDefault(),me(r);else if(U.key==="l"||U.key==="L")U.preventDefault(),v.current?.focus(),v.current?.select?.();else if(U.key==="r"||U.key==="R")U.preventDefault(),$e();else if((U.key==="i"||U.key==="I")&&(U.shiftKey||U.altKey))U.preventDefault(),Wn();else if(U.key>="1"&&U.key<="9"){let se=parseInt(U.key,10)-1;i[se]&&(U.preventDefault(),ne(i[se].id))}}};return document.addEventListener("keydown",C),()=>document.removeEventListener("keydown",C)},[r,i,u]),(0,d.useEffect)(()=>{let C=U=>{let Y=U.data;if(!Y)return;let se=i.find(te=>N.current[te.id]?.contentWindow===U.source);if(!se)return;if(Y.type==="pearbrowser:clearnet-direct-fallback"){if(se.kind!=="clearnet"||se.clearnetMode!=="proxy")return;let te;try{let le=new URL(se.url||se.displayUrl),pe=new URL(typeof Y.url=="string"?Y.url.trim():""),Te=le.hostname===pe.hostname||le.hostname.endsWith(`.${pe.hostname}`)||pe.hostname.endsWith(`.${le.hostname}`);if(!/^https?:$/.test(pe.protocol)||!Te)return;te=pe.toString()}catch{return}a(le=>le.map(pe=>pe.id===se.id?{...pe,src:te,url:te,displayUrl:te,contextToken:null,clearnetMode:"direct",shieldActive:!1,status:"Publisher blocked the privacy proxy \u2014 loaded direct; Content Shield is unavailable for this tab."}:pe)),se.id===w.current&&f(te);return}if(Y.type!=="pearbrowser:navigate")return;let re=typeof Y.url=="string"?Y.url.trim():"";if(/^hyper:\/\//i.test(re)){if(Y.openInNewTab){let te=Pi(re);a(le=>[...le,te]),l(te.id),f(re),K(re,te.id);return}l(se.id),f(re),K(re,se.id)}};return window.addEventListener("message",C),()=>window.removeEventListener("message",C)},[i]),(0,d.useEffect)(()=>{if(h)for(let C of i){if(!C||C.src||!C.url)continue;let U=`${C.id}:${C.url}`;if(E.current.has(U))continue;E.current.add(U);let Y=Array.isArray(C.history)&&C.history.length>0;K(C.url,C.id,{recordHistory:!Y,rememberVisit:!Y,historyIndex:C.histIdx})}},[h,A?.id,i]),(0,d.useEffect)(()=>{if(n){if(A&&(A.src||A.url)){let C=Pi(n);a(U=>[...U,C]),l(C.id),f(n),K(n,C.id)}else K(n,A?.id);s?.()}},[n]);let Le=(0,d.useMemo)(()=>{let C=(y||"").trim().toLowerCase();if(!C)return R.slice(0,8);let U=new Set,Y=[],se=te=>{let le=(te.url||"").toLowerCase(),pe=(te.title||"").toLowerCase();return le.startsWith(C)?0:pe.startsWith(C)?1:le.includes(C)?2:pe.includes(C)?3:99},re=R.map(te=>({e:te,s:se(te)})).filter(({s:te})=>te<99).sort((te,le)=>te.s-le.s||(te.e.kind==="bookmark"?-1:1));for(let{e:te}of re)if(!U.has(te.url)&&(U.add(te.url),Y.push(te),Y.length>=8))break;return Y},[y,R]),Is=async()=>{if(!(Date.now()-B.current<3e4&&R.length>0))try{let[C,U]=await Promise.all([e.request(t.CMD_USERDATA_LIST_BOOKMARKS).catch(()=>({})),e.request(t.CMD_USERDATA_LIST_HISTORY,{limit:100}).catch(()=>({}))]),Y=(C&&C.bookmarks||[]).map(re=>({kind:"bookmark",url:re.url,title:re.title||re.url})),se=(U&&U.history||[]).map(re=>({kind:"history",url:re.url,title:re.title||re.url}));D([...Y,...se]),B.current=Date.now()}catch{}},Ze=C=>{if(H&&Le.length>0){if(C.key==="ArrowDown"){C.preventDefault(),F(U=>(U+1)%Le.length);return}if(C.key==="ArrowUp"){C.preventDefault(),F(U=>U<=0?Le.length-1:U-1);return}if(C.key==="Escape"){W(!1),F(-1);return}if(C.key==="Enter"&&G>=0&&Le[G]){C.preventDefault();let U=Le[G];f(U.url),W(!1),F(-1),K(U.url);return}}C.key==="Enter"&&K(y)};return o`
    <div className="browse">
      <div className="tabstrip">
        ${i.map((C,U)=>o`
          <button
            key=${C.id}
            className=${"tabchip"+(C.id===r?" active":"")+(C.pinned?" pinned":"")}
            onClick=${()=>ne(C.id)}
            title=${eh(C)}
          >
            <span
              className=${"tabchip-pin"+(C.pinned?" on":"")}
              title=${C.pinned?"Unpin tab":"Pin tab"}
              onClick=${Y=>{Y.stopPropagation(),Rs(C.id)}}
            >${C.pinned?"\u25CF":"\u25CB"}</span>
            <span className="tabchip-title">${zm(C)}</span>
            <span className="tabchip-close" onClick=${Y=>{Y.stopPropagation(),me(C.id)}}>×</span>
          </button>
        `)}
        <button className="tabchip-new" onClick=${()=>ee()} title="New tab (⌘T)">+</button>
        <button className="tabchip-new tabchip-restore" onClick=${mt} disabled=${u.length===0} title="Reopen closed tab (⌘⇧T)">↺</button>
      </div>
      <div className="urlbar">
        <button className="nav" onClick=${L} disabled=${!A||A.histIdx<=0} title="Back">◀</button>
        <button className="nav" onClick=${ie} disabled=${!A||A.histIdx>=(A.history||[]).length-1} title="Forward">▶</button>
        <button className="nav" onClick=${$e} disabled=${!A?.src} title="Reload (⌘R)">⟳</button>
        <input
          ref=${v}
          type="text"
          value=${y}
          onInput=${C=>{f(C.target.value),W(!0),F(-1)}}
          onFocus=${()=>{Is(),W(!0),F(-1)}}
          onBlur=${()=>{setTimeout(()=>W(!1),120)}}
          onKeyDown=${Ze}
          placeholder="hyper://… or https://… or example.com"
          spellCheck="false"
        />
        <button className="nav" onClick=${T} disabled=${!y?.trim?.()} title="Bookmark this URL">☆</button>
        <button className="nav" onClick=${()=>x(!0)} disabled=${!A?.url} title="About this site">ⓘ</button>
        <${zh} rpc=${e} C=${t} activeUrl=${A?.url||y||""} onOpenSettings=${$} />
        <button className=${`nav ask-browser-toggle${g?" active":""}`} data-testid="ask-browser-toggle"
          aria-expanded=${g} aria-controls="ask-browser-panel"
          onClick=${()=>S(C=>!C)} disabled=${!A?.url} title="Ask Browser about this page">✦ Ask</button>
        <button className="nav" onClick=${Wn} disabled=${!A?.src} title="Devtools (⌘⇧I)">⚙</button>
        <button className="nav go" onClick=${()=>K(y)}>Go</button>
        ${H&&Le.length>0&&o`
          <div className="urlbar-suggestions">
            ${Le.map((C,U)=>o`
              <div
                key=${C.url}
                className=${"urlbar-suggestion"+(U===G?" active":"")}
                onMouseDown=${Y=>{Y.preventDefault(),f(C.url),W(!1),F(-1),K(C.url)}}
                onMouseEnter=${()=>F(U)}
              >
                <span className="urlbar-suggestion-icon">${C.kind==="bookmark"?"\u2605":"\u{1F558}"}</span>
                <div className="urlbar-suggestion-text">
                  ${C.title&&C.title!==C.url?o`<div className="urlbar-suggestion-title">${C.title}</div>`:null}
                  <div className="urlbar-suggestion-url">${C.url}</div>
                </div>
              </div>
            `)}
          </div>
        `}
      </div>
      ${A?.status&&o`<div className="browse-status">${A.status}</div>`}
      ${A?.nameProv&&o`
        <div className=${`name-prov-chip name-prov-${A.nameProv.provenance}`}
             title=${`\u201C${A.nameProv.name}\u201D resolved to ${A.displayUrl}`}>
          <span className="name-prov-name">${A.nameProv.label}</span>
          <span className="name-prov-tier">${A.nameProv.provenance==="petname"?"your saved name":A.nameProv.provenance==="registry"?"name registry":A.nameProv.provenance==="contact"?`from ${A.nameProv.source||"a contact"}`:"curated"}</span>
        </div>
      `}
      <div className="browse-workspace">
        <div className="browse-stage">
          ${i.map(C=>C.src?C.kind==="clearnet"&&C.clearnetMode==="direct"?typeof window<"u"&&window.customElements?.get?.("webview")?o`<webview
                      key=${C.id}
                      ref=${U=>{U&&(N.current[C.id]=U)}}
                      className=${"webview"+(C.id===r?"":" hidden")}
                      src=${C.src}
                      partition=${"persist:clearnet-"+(()=>{try{return new URL(C.url||C.src).hostname}catch{return"site"}})()}
                      allowpopups=${!0}
                      data-testid="clearnet-webview"
                    ></webview>`:o`<iframe
                      key=${C.id}
                      ref=${U=>{U&&(N.current[C.id]=U)}}
                      className=${"webview"+(C.id===r?"":" hidden")}
                      src=${C.src}
                      data-testid="clearnet-iframe-direct"
                      onLoad=${U=>{_.current[C.id]=(_.current[C.id]||0)+1}}
                      sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-pointer-lock"
                    ></iframe>`:o`<iframe
                  key=${C.id}
                  ref=${U=>{U&&(N.current[C.id]=U)}}
                  className=${"webview"+(C.id===r?"":" hidden")}
                  src=${C.src}
                  data-testid=${C.kind==="clearnet"?"clearnet-iframe-proxy":"hyper-iframe"}
                  onLoad=${U=>{_.current[C.id]=(_.current[C.id]||0)+1,V(C,U.target)}}
                  sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-pointer-lock"
                ></iframe>`:C.id===r?C.url?o`<div key=${C.id} className="browse-welcome">
                      <div className="browse-welcome-inner">
                        <div className="browse-welcome-logo">🍐</div>
                        ${C.status&&/^error/i.test(C.status)?o`<div className="browse-welcome-copy">
                              <h2>Couldn't load this page</h2>
                              <p>${String(C.status).replace(/^error:\s*/i,"")}</p>
                            </div>`:o`<div className="browse-welcome-copy">
                              <h2>Loading…</h2>
                              <p>Fetching <code>${C.url}</code> ${C.kind==="clearnet"?"over the clearnet proxy \u2014 shields and the privacy ladder apply.":"directly from its peers \u2014 first load of a cold drive can take a moment."}</p>
                            </div>`}
                        <div className="browse-welcome-actions">
                          <button className="btn primary" onClick=${()=>K(C.url,C.id)}>${C.status&&/^error/i.test(C.status)?"Retry":"Reload"}</button>
                          <button className="btn subtle" onClick=${()=>{v.current?.focus(),v.current?.select?.()}}>Edit URL</button>
                        </div>
                      </div>
                    </div>`:o`<div key=${C.id} className="browse-welcome">
                      <div className="browse-welcome-inner start-page">
                        <div className="browse-welcome-logo">🍐</div>
                        <h2>Search without a profile</h2>
                        <p className="start-page-lede">PearBrowser sends no search analytics and never adds a query to its optional persistent visit history.</p>
                        <section className="private-search-card" aria-labelledby="private-search-title">
                          <div className="private-search-heading">
                            <span id="private-search-title">Private web search</span>
                            <span className="private-search-provider">${Nr.name}</span>
                          </div>
                          <form className="private-search-form" data-testid="private-search-form" onSubmit=${j}>
                            <input
                              type="search"
                              value=${p}
                              data-testid="private-search-input"
                              aria-label="Search the web privately"
                              placeholder="Search the web"
                              autoComplete="off"
                              autoFocus
                              spellCheck="false"
                              onInput=${U=>k(U.target.value)}
                            />
                            <button type="submit" className="private-search-submit" data-testid="private-search-submit" disabled=${!p.trim()}>Search</button>
                          </form>
                          <div className="private-search-disclosure">
                            Content Shield stays on. ${Nr.name} receives your query and network address to return results; its published policy says it does not save or share search history. Private search is not anonymity.
                          </div>
                        </section>
                        <div className="start-page-p2p">Or paste a <code>hyper://</code> address above to fetch a site directly from its peers — no DNS, server, or CDN.</div>
                        <div className="browse-welcome-actions">
                          <button className="btn primary" onClick=${()=>K(Om)}>Open the PearBrowser site</button>
                          <button className="btn subtle" onClick=${()=>{v.current?.focus(),v.current?.select?.()}}>Focus the URL bar</button>
                        </div>
                        <div className="browse-welcome-tip">Tip: <code>⌘T</code> opens a new tab, <code>⌘⇧T</code> reopens one, <code>⌘W</code> closes one, <code>⌘L</code> jumps to the URL bar, <code>⌘1</code>–<code>⌘9</code> switches between tabs.</div>
                        <${oh} rpc=${e} C=${t} />
                      </div>
                      </div>`:null)}
        </div>
        ${g&&o`<${rh}
          rpc=${e}
          C=${t}
          activeTab=${A}
          captureContext=${J}
          onClose=${()=>S(!1)}
        />`}
      </div>
      ${b&&o`<${ih}
        rpc=${e}
        C=${t}
        url=${A?.url||""}
        onClose=${()=>x(!1)}
      />`}
    </div>
  `}var Hm={"profile:name":{label:"Display name",detail:"Your chosen public name"},"profile:avatar":{label:"Avatar",detail:"Your profile picture URL"},"profile:email":{label:"Email",detail:"Email you put in your profile"},"profile:website":{label:"Website",detail:"Personal site URL on your profile"},"profile:read":{label:"Full profile",detail:"All filled profile fields"},"profile:contact":{label:"Contact profile",detail:"Email and website fields"},"contacts:read":{label:"Contacts",detail:"Your saved contacts list"}};function uh({rpc:e,C:t,request:n,identity:s,onClose:i}){let a=new Set(n.scopes||[]),[r,l]=(0,d.useState)(a),[u,c]=(0,d.useState)(null),[h,$]=(0,d.useState)(""),v=E=>{l(y=>{let f=new Set(y);return f.has(E)?f.delete(E):f.add(E),f})},N=async E=>{$(""),c(E?"approve":"deny");try{let y=E?Array.from(r):[];await e.request(t.CMD_LOGIN_RESOLVE,{requestId:n.requestId,approved:E,scopes:y}),i()}catch(y){$(`could not resolve: ${y.message}`),c(null)}},_=n.appName||"A Pear app",w=ge(n.driveKey);return o`
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick=${E=>E.target.classList.contains("modal-overlay")&&N(!1)}>
      <div className="modal-card login-consent">
        <div className="login-header">
          <div className="login-app-icon">🍐</div>
          <div className="login-header-text">
            <div className="login-app-name">${_}</div>
            <div className="login-app-sub">wants to sign you in</div>
            <div className="login-app-key" title=${n.driveKey}>${w}</div>
          </div>
        </div>

        ${n.reason&&o`<div className="login-reason">"${n.reason}"</div>`}

        <div className="login-section-label">SIGNING IN AS</div>
        <div className="login-identity">
          <div className="login-identity-avatar">🍐</div>
          <div className="login-identity-meta">
            <div className="login-identity-label">You</div>
            <code className="login-identity-key">${ge(s?.publicKey||"")}</code>
          </div>
        </div>

        <div className="login-section-label">${_} WILL SEE</div>
        <div className="login-scopes">
          ${(n.scopes||[]).length===0?o`<div className="login-scope-empty">Nothing — sign-in only confirms it's you.</div>`:(n.scopes||[]).map(E=>{let y=Hm[E]||{label:E,detail:""},f=r.has(E);return o`
                  <label className=${"login-scope"+(f?" on":"")} key=${E}>
                    <input type="checkbox" checked=${f} onChange=${()=>v(E)} />
                    <div className="login-scope-meta">
                      <div className="login-scope-label">${y.label}</div>
                      <div className="login-scope-detail">${y.detail||E}</div>
                    </div>
                  </label>
                `})}
        </div>

        ${n.currentGrant&&o`
          <div className="login-existing">
            You previously granted this app on
            ${" "+new Date(n.currentGrant.grantedAt).toLocaleDateString()}.
          </div>
        `}

        ${h&&o`<div className="apps-error">${h}</div>`}

        <div className="login-actions">
          <button className="btn subtle" onClick=${()=>N(!1)} disabled=${u!==null}>
            ${u==="deny"?"Cancelling\u2026":"Cancel"}
          </button>
          <button className="btn primary" onClick=${()=>N(!0)} disabled=${u!==null}>
            ${u==="approve"?"Signing in\u2026":"Sign in"}
          </button>
        </div>
      </div>
    </div>
  `}function dh({rpc:e,C:t,request:n,identity:s,onClose:i}){let[a,r]=(0,d.useState)(null),[l,u]=(0,d.useState)(""),c=async N=>{u(""),r(N?"approve":"deny");try{await e.request(t.CMD_SWARM_RESOLVE,{requestId:n.requestId,approved:N}),i()}catch(_){u(`could not resolve: ${_.message}`),r(null)}},h=n.appName||"A Pear app",$=ge(n.driveKey),v=ge(n.topicHex);return o`
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick=${N=>N.target.classList.contains("modal-overlay")&&c(!1)}>
      <div className="modal-card login-consent">
        <div className="login-header">
          <div className="login-app-icon" style=${{background:"linear-gradient(135deg, #58a6ff, #a371f7)"}}>📡</div>
          <div className="login-header-text">
            <div className="login-app-name">${h}</div>
            <div className="login-app-sub">wants to connect to peers on a swarm topic</div>
            <div className="login-app-key" title=${n.driveKey}>${$}</div>
          </div>
        </div>

        ${n.reason&&o`<div className="login-reason">"${n.reason}"</div>`}

        <div className="login-section-label">SWARM TOPIC</div>
        <div className="login-identity">
          <div className="login-identity-avatar">🔑</div>
          <div className="login-identity-meta">
            <div className="login-identity-label">${n.protocol||"pear.swarm.v1"}</div>
            <code className="login-identity-key">${v}</code>
          </div>
        </div>

        <div className="login-section-label">WHAT THIS MEANS</div>
        <div className="login-scopes">
          <div className="login-scope on">
            <div className="login-scope-meta">
              <div className="login-scope-label">Discover peers via DHT</div>
              <div className="login-scope-detail">Other devices on this topic will see your IP address.</div>
            </div>
          </div>
          <div className="login-scope on">
            <div className="login-scope-meta">
              <div className="login-scope-label">Send and receive messages directly</div>
              <div className="login-scope-detail">No relay between your peers and you. Messages aren't logged by PearBrowser.</div>
            </div>
          </div>
        </div>

        <div className="login-existing">
          Approving stores a grant for this app + this topic. You can revoke it any time in <strong>Settings → Connected Apps</strong>.
        </div>

        ${l&&o`<div className="apps-error">${l}</div>`}

        <div className="login-actions">
          <button className="btn subtle" onClick=${()=>c(!1)} disabled=${a!==null}>
            ${a==="deny"?"Cancelling\u2026":"Cancel"}
          </button>
          <button className="btn primary" onClick=${()=>c(!0)} disabled=${a!==null}>
            ${a==="approve"?"Connecting\u2026":"Approve & Connect"}
          </button>
        </div>
      </div>
    </div>
  `}function ph(e){if(typeof e!="string"||!/^[0-9]+$/.test(e))return String(e??"");let t=e.padStart(7,"0");return`${t.slice(0,-6).replace(/^0+(?=\d)/,"")}.${t.slice(-6)}`}function mh({rpc:e,C:t,request:n,onClose:s}){let[i,a]=(0,d.useState)(null),[r,l]=(0,d.useState)(""),[u,c]=(0,d.useState)(Date.now()),[h,$]=(0,d.useState)(!1);(0,d.useEffect)(()=>{let x=setInterval(()=>c(Date.now()),1e3);return()=>clearInterval(x)},[]);let v=Math.max(0,Math.ceil(((n.expiresAt||0)-u)/1e3)),N=async x=>{l(""),a(x?"approve":"deny");try{let g=n.type==="connect"?t.CMD_WALLET_CONNECT_RESOLVE:t.CMD_WALLET_PAYMENT_RESOLVE;await e.request(g,{intentId:n.intentId,approved:x}),s()}catch(g){l(Dt(g)),a(null)}},_=()=>{if(n.recipient)try{navigator.clipboard.writeText(n.recipient),$(!0),setTimeout(()=>$(!1),1500)}catch{}},w=n.appName||"A Pear app",E=ge(n.driveKey||""),y=ge(n.manifestSha256||""),f={connect:"wants to connect to your wallet",payment:"requests a test payment","sign-app":"wants an app-payload attestation"},p={connect:["Connecting\u2026","Approve & Connect"],payment:["Paying\u2026","Approve & Pay"],"sign-app":["Signing\u2026","Approve & Sign"]},[k,b]=p[n.type]||["Working\u2026","Approve"];return o`
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card login-consent">
        <div className="login-header">
          <div className="login-app-icon" style=${{background:"linear-gradient(135deg, #f7b731, #e25822)"}}>👛</div>
          <div className="login-header-text">
            <div className="login-app-name">${w}</div>
            <div className="login-app-sub">${f[n.type]||"requests wallet approval"}</div>
            <div className="login-app-key" title=${n.driveKey||""}>${E}</div>
          </div>
          <div style=${{marginLeft:"auto",alignSelf:"flex-start",padding:"4px 8px",borderRadius:"6px",background:"#e25822",color:"#fff",fontSize:"11px",fontWeight:700,letterSpacing:"0.05em",whiteSpace:"nowrap"}}>TESTNET · NO REAL FUNDS</div>
        </div>

        <div className="login-section-label">APP IDENTITY</div>
        <div className="login-identity">
          <div className="login-identity-avatar">🔑</div>
          <div className="login-identity-meta">
            <div className="login-identity-label">manifest fingerprint</div>
            <code className="login-identity-key" title=${n.manifestSha256||""}>${y}</code>
          </div>
        </div>

        ${n.type==="payment"&&o`
          <div className="login-section-label">PAYMENT · STABLE TESTNET · TEST USD₮0</div>
          <div className="login-scopes">
            <div className="login-scope on">
              <div className="login-scope-meta">
                <div className="login-scope-label">${ph(n.amountAtomic)} USD₮0</div>
                <div className="login-scope-detail">${n.amountAtomic} atomic</div>
              </div>
            </div>
            <div className="login-scope on">
              <div className="login-scope-meta">
                <div className="login-scope-label">Recipient</div>
                <div className="login-scope-detail" style=${{wordBreak:"break-all"}}>${n.recipient}</div>
              </div>
              <button className="btn small subtle" onClick=${_} data-testid="wallet-consent-copy-recipient">
                ${h?"Copied":"Copy"}
              </button>
            </div>
            ${n.estimatedFeeAtomic&&o`
              <div className="login-scope on">
                <div className="login-scope-meta">
                  <div className="login-scope-label">Network fee — est. ${qn(n.estimatedFeeAtomic,18)} USDT0</div>
                  <div className="login-scope-detail">never more than ${qn(n.maxFeeAtomic,18)} USDT0 (test gas)</div>
                </div>
              </div>
              <div className="login-scope on">
                <div className="login-scope-meta">
                  <div className="login-scope-label">Total debit (max) ${qn(n.maxTotalDebitAtomic,18)} USD₮0</div>
                  <div className="login-scope-detail">payment amount + maximum network fee</div>
                </div>
              </div>
            `}
          </div>
          ${!n.estimatedFeeAtomic&&o`
            <div className="login-existing">The network fee could not be estimated (the testnet may be unreachable). The enforced fee ceiling still applies after approval.</div>
          `}
          ${n.reference&&o`<div className="login-reason">"${n.reference}"</div>`}
        `}

        ${n.type==="sign-app"&&o`
          <div className="login-section-label">APP PAYLOAD</div>
          <div className="login-identity">
            <div className="login-identity-avatar">✍️</div>
            <div className="login-identity-meta">
              <div className="login-identity-label">payload hash</div>
              <code className="login-identity-key" title=${n.payloadHash||""}>${ge(n.payloadHash||"")}</code>
            </div>
          </div>
          <div className="login-existing">
            This attests the app payload with your wallet identity. <strong>No funds move.</strong>
          </div>
        `}

        ${n.type==="connect"&&o`
          <div className="login-existing">
            Connects this app to your wallet on <strong>Stable Testnet</strong> (test USD₮0).
            Every payment will still require a fresh approval. Connecting does not reveal
            your address or balance.
          </div>
          <div className="login-existing">
            This app will be able to: see its connection status
            ${n.permissions?.pay?o` · <strong>request payments</strong> (each one still needs your approval)`:""}
            ${n.permissions?.signApp?o` · <strong>request app-payload signatures</strong>`:""}
            ${!n.permissions?.pay&&!n.permissions?.signApp?" \u2014 nothing else":""}
          </div>
        `}

        ${n.expiresAt?o`<div className="login-existing">Prompt expires in ${v}s.</div>`:o`<div className="login-existing">This prompt stays open until you decide.</div>`}

        ${r&&o`<div className="apps-error">${r}</div>`}

        <div className="login-actions">
          <button className="btn subtle" onClick=${()=>N(!1)} disabled=${i!==null}>
            ${i==="deny"?"Rejecting\u2026":"Reject"}
          </button>
          <button className="btn primary" onClick=${()=>N(!0)} disabled=${i!==null}>
            ${i==="approve"?k:b}
          </button>
        </div>
      </div>
    </div>
  `}var fh=[{id:"home",title:"PearBrowser homepage",subtitle:"The landing page \u2014 what this app is, who built it",url:"hyper://2d6c2be92f07e10ed5a4b07b5c1286a56f0c1220c79ad3c3293b069f8c946763/",initial:"\u{1F350}",gradient:"linear-gradient(135deg, #7ee787, #58a6ff)"},{id:"hiveworm",title:"HiveWorm",subtitle:"Legacy native app \u2014 a verified v3 package is required",legacyMigrationId:"d1xbkcpcbi1xa8dexp49rsendra5r67w3qh5a9k8t44oemm4k16y",initial:"\u{1F41B}",gradient:"linear-gradient(135deg, #a371f7, #d946ef)"},{id:"hiverelay",title:"HiveRelay",subtitle:"The relay backbone keeping it all online",url:"hyper://ea607230f7b9a5f854c664901b2c34faf1c6f5b7cee6fc3bca02ac682fd02754/",initial:"\u{1F7E2}",gradient:"linear-gradient(135deg, #00ff41, #3eaf55)"},{id:"p2pbuilders",title:"P2P Builders",subtitle:"Permissionless P2P hacker news",url:Bm,initial:"\u{1F527}",gradient:"linear-gradient(135deg, #ff6600, #fbbf24)"}];function vh({rpc:e,C:t,onPickSite:n,onClose:s}){let[i,a]=(0,d.useState)(0),r=async l=>{if(e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{onboardingDone:!0,onboardingDoneAt:Date.now()}}).catch(()=>{}),l?.legacyMigrationId)try{await e.request(t.CMD_LEGACY_APP_MIGRATION,{legacyMigrationId:l.legacyMigrationId},1e4)}catch{}else l?.url&&n(l.url);s()};return o`
    <div className="modal-overlay onboarding-overlay" role="dialog" aria-modal="true">
      <div className="modal-card onboarding-card">
        ${i===0&&o`
          <div className="onb-slide onb-slide-welcome">
            <div className="onb-hero">
              <${Ti} size=${72} />
            </div>
            <h1 className="onb-title">Welcome to <strong>PearBrowser</strong></h1>
            <p className="onb-subtitle">The web that doesn't go down.</p>
            <p className="onb-blurb">
              A peer-to-peer browser, app store, and site publisher. Pages
              live as Hyperdrives, identified by 32-byte keys, replicated
              by their readers. No DNS. No servers. No accounts.
            </p>
            <div className="onb-actions">
              <button className="btn primary" onClick=${()=>a(1)}>Get started →</button>
            </div>
          </div>
        `}
        ${i===1&&o`
          <div className="onb-slide">
            <h2 className="onb-stepname">Three things at once</h2>
            <div className="onb-pitch-grid">
              <div className="onb-pitch">
                <div className="onb-pitch-icon">🌐</div>
                <div className="onb-pitch-title">Browse hyper://</div>
                <div className="onb-pitch-body">Paste a drive key, fetch from peers, render in-app.</div>
              </div>
              <div className="onb-pitch">
                <div className="onb-pitch-icon">📦</div>
                <div className="onb-pitch-title">Use verified native apps</div>
                <div className="onb-pitch-body">Legacy entries explain the migration path; native code comes from a verified local package.</div>
              </div>
              <div className="onb-pitch">
                <div className="onb-pitch-icon">✒️</div>
                <div className="onb-pitch-title">Publish your own</div>
                <div className="onb-pitch-body">Block editor → publish → pinned 24/7 on HiveRelay.</div>
              </div>
            </div>
            <p className="onb-blurb onb-foot">
              Your identity is generated automatically and stored on this
              machine. You can back it up later in <em>Settings → Identity</em>
              if you want to use it on another device.
            </p>
            <div className="onb-actions">
              <button className="btn subtle" onClick=${()=>a(0)}>← Back</button>
              <button className="btn primary" onClick=${()=>a(2)}>Continue →</button>
            </div>
          </div>
        `}
        ${i===2&&o`
          <div className="onb-slide">
            <h2 className="onb-stepname">Try a site</h2>
            <p className="onb-blurb">Pick one to start with — you can always come back here.</p>
            <div className="onb-sites">
              ${fh.map(l=>o`
                <button
                  className="onb-site-card"
                  key=${l.id}
                  onClick=${()=>r(l)}
                  title=${l.url||"Legacy native app"}
                >
                  <div className="onb-site-icon" style=${{background:l.gradient}}>${l.initial}</div>
                  <div className="onb-site-text">
                    <div className="onb-site-title">${l.title}</div>
                    <div className="onb-site-subtitle">${l.subtitle}</div>
                  </div>
                </button>
              `)}
            </div>
            <div className="onb-actions">
              <button className="btn subtle" onClick=${()=>a(1)}>← Back</button>
              <button className="onb-skip" onClick=${()=>r(null)}>Skip — I'll explore</button>
            </div>
          </div>
        `}
        <div className="onb-dots">
          ${[0,1,2].map(l=>o`
            <span className=${"onb-dot"+(l===i?" on":"")} key=${l}></span>
          `)}
        </div>
      </div>
    </div>
  `}function Ui(e){return typeof e!="string"?null:/^data:image\//i.test(e)||/^https?:\/\//i.test(e)?e:null}function Mi({rpc:e,C:t,driveKey:n,iconRef:s,iconData:i,name:a}){let[r,l]=(0,d.useState)(Ui(i));return(0,d.useEffect)(()=>{if(r||!n||!/^[0-9a-f]{64}$/i.test(n)||!(t&&t.CMD_GET_APP_ICON))return;let u=!0;return e.request(t.CMD_GET_APP_ICON,{driveKey:n,iconRef:s}).then(c=>{let h=Ui(c&&c.iconData);u&&h&&l(h)}).catch(()=>{}),()=>{u=!1}},[n,s]),r?o`<img src=${r} alt="" className="app-icon" />`:o`<div className="app-icon app-icon-fallback">${(a||"?").charAt(0)}</div>`}function kr(e){return Array.isArray(e.categories)?e.categories.map(t=>String(t)).filter(Boolean):e.category?[String(e.category)]:[]}function yh(e){return!e||typeof e!="object"?"":[e.name,e.description,e.author,e.id,e.version,e.source,e.catalogName,e.verification,e.link,e.driveKey,...kr(e),...Array.isArray(e._sources)?e._sources:[]].filter(t=>t!=null&&t!=="").map(t=>String(t).normalize("NFKC").toLowerCase()).join(" ")}function Rt(e){return e&&typeof e.settings=="object"&&e.settings!==null?e.settings:e||{}}function hh({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[i,a]=(0,d.useState)(null),[r,l]=(0,d.useState)(null),[u,c]=(0,d.useState)(""),[h,$]=(0,d.useState)(""),[v,N]=(0,d.useState)(""),[_,w]=(0,d.useState)(""),[E,y]=(0,d.useState)(""),[f,p]=(0,d.useState)(""),[k,b]=(0,d.useState)(""),[x,g]=(0,d.useState)("");(0,d.useEffect)(()=>{e.request(t.CMD_USERDATA_GET_SETTINGS).then(A=>{let J=Rt(A);s(!!J?.experimentalAutobeeCatalogs);let P=typeof J?.autobeeOwnedKey=="string"?J.autobeeOwnedKey:null;J?.experimentalAutobeeCatalogs&&P&&e.request(t.CMD_AUTOBEE_GET,{keyHex:P}).then(a).catch(()=>{})}).catch(()=>s(!1))},[]);let S=A=>e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{autobeeOwnedKey:A}}).catch(()=>{}),R=A=>{$(A),setTimeout(()=>$(""),1800)},D=(A,J)=>{try{navigator.clipboard.writeText(A),g(J),setTimeout(()=>g(""),1500)}catch{}},H=async()=>{c(""),l("create");try{let A=await e.request(t.CMD_AUTOBEE_CREATE,{name:v||"Collaborative Catalog"},6e4);a(A),N(""),S(A.keyHex),R("Catalog created.")}catch(A){c(A.message)}finally{l(null)}},W=async()=>{let A=Kt(_);if(A){c(""),l("open");try{let J=await e.request(t.CMD_AUTOBEE_GET,{keyHex:A.key},6e4);a(J),w(""),S(J.keyHex),R(J.writable?"Opened \u2014 you are a writer.":"Opened read-only \u2014 share your writer key to be invited.")}catch(J){c(J.message)}finally{l(null)}}},G=async()=>{let A=(Kt(E)?.key||E).trim();c(""),l("invite");try{await e.request(t.CMD_AUTOBEE_ADD_WRITER,{keyHex:i.keyHex,writerKey:A},6e4),y(""),R("Writer added \u2014 they can edit once they sync.")}catch(J){c(J.message)}finally{l(null)}},F=async()=>{let A=f.trim();if(!A)return;if(/^(?:pear|file):\/\//i.test(A)){c("Remote executable app links are not accepted. Add browsable hyper:// content only.");return}let J={driveKey:Ts(A),name:k||A};if(!J.driveKey){c("Enter a valid hyper:// drive key.");return}c(""),l("addapp");try{let P=await e.request(t.CMD_AUTOBEE_ADD_APP,{keyHex:i.keyHex,app:J},6e4);a(P),p(""),b(""),R("App added.")}catch(P){c(P.message)}finally{l(null)}},B=async A=>{c(""),l("rm:"+A);try{let J=await e.request(t.CMD_AUTOBEE_REMOVE_APP,{keyHex:i.keyHex,id:A},6e4);a(J)}catch(J){c(J.message)}finally{l(null)}};return n?o`
    <div className="collab-catalog">
      <h2>Collaborative catalog <span className="settings-subtle">(experimental)</span></h2>
      <p className="subtitle">An app catalog several people can co-edit, synced peer-to-peer. Not pinned on relays yet — reachable only while a writer is online.</p>
      <div className="settings-card">
        ${u&&o`<div className="apps-error">${u}</div>`}
        ${h&&o`<div className="apps-ok">${h}</div>`}

        ${!i&&o`
          <div className="collab-empty">
            <div className="settings-row">
              <div className="profile-field">
                <div className="settings-label">Create a new collaborative catalog</div>
                <input className="profile-input" placeholder="Catalog name" value=${v} onInput=${A=>N(A.target.value)} />
              </div>
              <button className="btn primary" onClick=${H} disabled=${r==="create"}>${r==="create"?"Creating\u2026":"Create"}</button>
            </div>
            <div className="settings-row">
              <div className="profile-field">
                <div className="settings-label">…or open one by key</div>
                <input className="profile-input" placeholder="autobee://… or 64-hex key" value=${_} onInput=${A=>w(A.target.value)} onKeyDown=${A=>A.key==="Enter"&&W()} />
              </div>
              <button className="btn" onClick=${W} disabled=${r==="open"||!_.trim()}>${r==="open"?"Opening\u2026":"Open"}</button>
            </div>
          </div>
        `}

        ${i&&o`
          <div className="collab-open">
            <div className="settings-row">
              <div>
                <div className="settings-label">${i.name} ${i.writable?"":o`<span className="settings-subtle">· read-only</span>`}</div>
                <div className="settings-subtle">${i.apps.length} app(s)</div>
              </div>
              <button className="btn subtle" onClick=${()=>{a(null),S("")}}>Close</button>
            </div>
            <div className="settings-row">
              <div className="profile-field">
                <div className="settings-label">Share key — anyone can load this in the Apps tab</div>
                <code className="settings-code">${i.shareKey}</code>
              </div>
              <button className="btn small" onClick=${()=>D(i.shareKey,"share")}>${x==="share"?"Copied":"Copy"}</button>
            </div>
            <div className="settings-row">
              <div className="profile-field">
                <div className="settings-label">Your writer key — give this to the owner to be invited</div>
                <code className="settings-code">${i.writerKey}</code>
              </div>
              <button className="btn small" onClick=${()=>D(i.writerKey,"writer")}>${x==="writer"?"Copied":"Copy"}</button>
            </div>

            ${i.writable&&o`
              <div className="collab-writable">
                <div className="settings-row">
                  <div className="profile-field">
                    <div className="settings-label">Invite a writer (paste their writer key)</div>
                    <input className="profile-input" placeholder="64-hex writer key" value=${E} onInput=${A=>y(A.target.value)} />
                  </div>
                  <button className="btn" onClick=${G} disabled=${r==="invite"||!E.trim()}>${r==="invite"?"Adding\u2026":"Invite"}</button>
                </div>
                <div className="settings-row">
                  <div className="profile-field">
                    <div className="settings-label">Add an app</div>
                    <input className="profile-input" placeholder="App name (optional)" value=${k} onInput=${A=>b(A.target.value)} />
                    <input className="profile-input" placeholder="hyper:// drive key" value=${f} onInput=${A=>p(A.target.value)} onKeyDown=${A=>A.key==="Enter"&&F()} />
                  </div>
                  <button className="btn primary" onClick=${F} disabled=${r==="addapp"||!f.trim()}>${r==="addapp"?"Adding\u2026":"Add app"}</button>
                </div>
              </div>
            `}

            ${i.apps.length>0&&o`
              <div className="collab-apps">
                <div className="settings-row"><div className="settings-label">Apps</div></div>
                ${i.apps.map(A=>o`
                  <div className="settings-row" key=${A.id||A.driveKey||A.link||A.name}>
                    <div>
                      <div className="settings-label">${A.name||A.id}</div>
                      <div className="settings-subtle">${A.driveKey||A.link||""}</div>
                    </div>
                    ${i.writable&&o`<button className="btn small subtle" onClick=${()=>B(A.id)} disabled=${r==="rm:"+A.id}>Remove</button>`}
                  </div>
                `)}
              </div>
            `}
          </div>
        `}
      </div>
    </div>
  `:null}function gh({rpc:e,C:t}){let[n,s]=(0,d.useState)("pear-v3"),[i,a]=(0,d.useState)(""),[r,l]=(0,d.useState)(""),[u,c]=(0,d.useState)(""),[h,$]=(0,d.useState)(""),[v,N]=(0,d.useState)([]),[_,w]=(0,d.useState)(!1),[E,y]=(0,d.useState)(""),[f,p]=(0,d.useState)(""),[k,b]=(0,d.useState)(""),[x,g]=(0,d.useState)(""),[S,R]=(0,d.useState)(""),[D,H]=(0,d.useState)(!1),[W,G]=(0,d.useState)(""),[F,B]=(0,d.useState)(""),A=n==="pear-v3",J=[["darwin-arm64","macOS Apple silicon"],["darwin-x64","macOS Intel"],["linux-arm64","Linux ARM64"],["linux-x64","Linux x64"],["win32-arm64","Windows ARM64"],["win32-x64","Windows x64"]],P=I=>{s(I),l(""),B(""),G(""),w(!1)},ne=I=>{N(Z=>Z.includes(I)?Z.filter(M=>M!==I):[...Z,I])},ue=I=>{G(""),g(""),R("");let Z=I.target.files&&I.target.files[0];if(!Z)return;if(!["image/png","image/jpeg","image/webp","image/gif","image/svg+xml"].includes(Z.type)){G("Choose a PNG, JPEG, WebP, GIF, or SVG icon.");return}if(Z.size>14*1024){G("Keep the icon under 14 KB so it fits the shared catalogue record.");return}let K=new FileReader;K.onerror=()=>G("The icon could not be read."),K.onload=()=>{let V=typeof K.result=="string"?K.result:"";if(!V||V.length>2e4){G("The encoded icon is too large for the catalogue.");return}g(V),R(Z.name)},K.readAsDataURL(Z)},O=async()=>{if(G(""),B(""),!i.trim()){G("App name is required.");return}if(!r.trim()){G(A?"Paste the production pear:// release link.":"Paste a hyper:// link or drive key.");return}if(A&&!u.trim()){G("Enter the version currently published on this Pear release line.");return}if(A&&v.length===0){G("Select every operating-system target included in the release.");return}if(A&&!_){G("Confirm that the root link is the seeded production provision or multisig release line.");return}if(!A&&/^(?:pear|file):\/\//i.test(r.trim())){G("Choose Pear v3 app for native release links.");return}H(!0);try{let I=await e.request(t.CMD_SUBMIT_APP,{submissionKind:n,name:i.trim(),link:r.trim(),version:u.trim(),productName:h.trim()||i.trim(),targets:v,releaseConfirmed:_,description:E.trim(),author:f.trim(),categories:k,iconData:x},9e4),Z=I&&I.manifest&&I.manifest.name||i.trim(),M;if(I&&I.status==="pending-review"){let V=Number(I.queuedForReview)||0,T=Number(I.acceptances)||0;M=`${V} relay${V===1?"":"s"} queued the catalogue receipt for human review.${T>0?` ${T} other relay${T===1?"":"s"} accepted receipt replication.`:""}`}else if(I&&I.status==="relay-accepted"){let V=Number(I.acceptances)||0;M=`${V} relay${V===1?"":"s"} accepted receipt replication, but no human-review queue acknowledgement was observed.`}else M="The receipt request was broadcast, but no relay accepted it or confirmed a review queue entry within the initial window; the client will retry.";let K=I&&I.receiptWarning?` ${I.receiptWarning}`:"";B(`Submitted "${Z}". ${M}${K} Catalogue publication remains a separate final gate.`),a(""),l(""),c(""),$(""),N([]),w(!1),y(""),p(""),b(""),g(""),R("")}catch(I){G(I&&I.message||String(I))}finally{H(!1)}};return o`
    <div className="community-submit">
      <h2>Submit your app <span className="settings-subtle">→ Community list</span></h2>
      <p className="subtitle">Submit release metadata for review. Pear v3 native apps must already be built, staged, provisioned or multisig-gated, and seeded under a stable root <code>pear://</code> production identity. This form does not release or execute the app.</p>
      <div className="settings-card">
        ${W&&o`<div className="apps-error">${W}</div>`}
        ${F&&o`<div className="apps-ok">${F}</div>`}
        <div className="community-kind" role="group" aria-label="Submission type">
          <button className=${"btn "+(A?"primary":"subtle")} onClick=${()=>P("pear-v3")}>Pear v3 app</button>
          <button className=${"btn "+(A?"subtle":"primary")} onClick=${()=>P("hyper")}>Hyper site</button>
        </div>
        <div className="community-release-note">
          ${A?o`<span><strong>Pear v3 flow:</strong> <code>pear build</code> → <code>pear stage</code> → <code>pear provision</code> / multisig → keep the root release link seeded.</span>`:o`<span><strong>Hyper flow:</strong> publish and seed a drive with a root <code>/index.html</code>. The review receipt points to it but does not pin it automatically.</span>`}
        </div>
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">App name *</div>
            <input className="profile-input" placeholder="My Cool App" value=${i} onInput=${I=>a(I.target.value)} />
          </div>
        </div>
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">${A?"Production Pear release link *":"Hyper content link *"}</div>
            <input className="profile-input" spellCheck="false" placeholder=${A?"pear://<52-character production key>":"hyper://\u2026 (or a 64-hex / z-base-32 key)"} value=${r} onInput=${I=>l(I.target.value)} />
          </div>
        </div>
        ${A&&o`
          <div className="settings-row">
            <div className="profile-field">
              <div className="settings-label">Released version *</div>
              <input className="profile-input" placeholder="1.2.3" value=${u} onInput=${I=>c(I.target.value)} />
            </div>
            <div className="profile-field">
              <div className="settings-label">Installed product name *</div>
              <input className="profile-input" placeholder=${i.trim()||"Must match the Pear package"} value=${h} onInput=${I=>$(I.target.value)} />
            </div>
          </div>
          <div className="profile-field">
            <div className="settings-label">Published targets *</div>
            <div className="community-targets">
              ${J.map(([I,Z])=>o`
                <label key=${I}>
                  <input type="checkbox" checked=${v.includes(I)} onChange=${()=>ne(I)} />
                  <span>${Z}</span>
                </label>
              `)}
            </div>
          </div>
        `}
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">Description</div>
            <input className="profile-input" placeholder="What does it do?" value=${E} onInput=${I=>y(I.target.value)} />
          </div>
        </div>
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">Author</div>
            <input className="profile-input" placeholder="Your name or handle" value=${f} onInput=${I=>p(I.target.value)} />
          </div>
          <div className="profile-field">
            <div className="settings-label">Categories</div>
            <input className="profile-input" placeholder="tools, social" value=${k} onInput=${I=>b(I.target.value)} />
          </div>
        </div>
        <div className="profile-field">
          <div className="settings-label">App icon <span className="settings-subtle">PNG, JPEG, WebP, GIF, or safe SVG · max 14 KB</span></div>
          <div className="community-icon-upload">
            ${x?o`<img src=${Ui(x)} alt="Selected app icon" />`:o`<div className="app-icon app-icon-fallback">${(i||"?").charAt(0)}</div>`}
            <label className="btn">
              ${x?"Replace icon":"Choose icon"}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange=${ue} />
            </label>
            ${S&&o`<span className="settings-subtle">${S}</span>`}
            ${x&&o`<button className="btn subtle" onClick=${()=>{g(""),R("")}}>Remove</button>`}
          </div>
        </div>
        ${A&&o`
          <label className="community-release-confirm">
            <input type="checkbox" checked=${_} onChange=${I=>w(I.target.checked)} />
            <span>I confirm this root link is the currently seeded production provision or multisig release line, not a versioned stage link.</span>
          </label>
        `}
        <div className="settings-row">
          <button className="btn primary" onClick=${O} disabled=${D||!i.trim()||!r.trim()||A&&(!u.trim()||v.length===0||!_)}>${D?"Submitting\u2026":"Submit catalogue receipt"}</button>
        </div>
      </div>
    </div>
  `}function $h({rpc:e,C:t,onPreview:n}){let[s,i]=(0,d.useState)(!1),[a,r]=(0,d.useState)(""),[l,u]=(0,d.useState)(""),[c,h]=(0,d.useState)(!1),[$,v]=(0,d.useState)(null),[N,_]=(0,d.useState)(null),[w,E]=(0,d.useState)({}),[y,f]=(0,d.useState)({}),[p,k]=(0,d.useState)({}),[b,x]=(0,d.useState)({}),[g,S]=(0,d.useState)([]),[R,D]=(0,d.useState)(null),[H,W]=(0,d.useState)(""),[G,F]=(0,d.useState)("");(0,d.useEffect)(()=>{e.request(t.CMD_USERDATA_GET_SETTINGS).then(O=>{let I=Rt(O)||{};typeof I.relayManageUrl=="string"&&r(I.relayManageUrl),typeof I.relayManageKey=="string"&&u(I.relayManageKey)}).catch(()=>{})},[]);let B=O=>{F(O),setTimeout(()=>F(""),3500)},A=async()=>{W("");try{await e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{relayManageUrl:a.trim(),relayManageKey:l.trim()}}),h(!0),setTimeout(()=>h(!1),1500),B("Saved.")}catch(O){W(O.message)}},J=async()=>{W(""),D("load");try{let O=await e.request(t.CMD_MOD_PENDING,{},3e4);v(O.pending||[]),_(O.mode||null),S(O.audit||[]),E({}),f({})}catch(O){W(O.message),v([])}finally{D(null)}},P=async(O,I=!1)=>{let Z=O.appKey;W(""),D("v:"+Z);try{let M=await e.request(t.CMD_MOD_REVIEW,{appKey:Z,publisherPubkey:O.publisherPubkey,force:I},45e3);E(K=>({...K,[Z]:M})),f(K=>({...K,[Z]:!1}))}catch(M){W(M.message)}finally{D(null)}},ne=async(O,I)=>{let Z=O.appKey,M=w[Z],K=(b[Z]||"").trim(),V=(p[Z]||"").trim();if(I&&!M){W("Run due diligence before approving.");return}if(I&&!V){W("Record what you checked in the reviewer note before approving.");return}if(!I&&!K){W("Add a rejection reason before rejecting.");return}W(""),D((I?"a:":"r:")+Z);try{let T=await e.request(I?t.CMD_MOD_APPROVE:t.CMD_MOD_REJECT,{appKey:Z,acknowledged:y[Z]===!0,reviewedAt:M&&M.checkedAt,reviewedReceiptDriveVersion:M&&M.evidence&&M.evidence.receiptDriveVersion,reviewedTargetDriveVersion:M&&M.evidence&&M.evidence.targetDriveVersion,note:V,reason:K},6e4);v(L=>(L||[]).filter(ie=>ie.appKey!==Z)),T&&T.audit&&S(L=>[T.audit,...L].slice(0,50)),E(L=>{let ie={...L};return delete ie[Z],ie}),B(T&&T.auditWarning?T.auditWarning:I?T&&T.promoted&&T.promoted.deferred?"Catalogue receipt approved. Community catalogue publication is still pending.":"Catalogue receipt approved and audited.":"Rejected with an audit reason.")}catch(T){W(T.message)}finally{D(null)}},ue=O=>O?O.approvalAllowed?"Needs human review":"Blocked":"Not checked";return o`
    <div className="moderator-panel">
      <h2>
        <button className="btn subtle small" onClick=${()=>i(O=>!O)} style=${{marginRight:"8px"}}>${s?"\u25BE":"\u25B8"}</button>
        Moderator tools <span className="settings-subtle">(operator)</span>
      </h2>
      ${s&&o`
        <div className="settings-card">
          ${H&&o`<div className="apps-error">${H}</div>`}
          ${G&&o`<div className="apps-ok">${G}</div>`}
          <p className="subtitle">Review signed catalogue receipts. A receipt points to separately distributed Hyper content or a Pear v3 production identity; native release bytes stay on Pear's release line. Approval authorizes receipt replication only, while shared catalogue publication remains a separate release step.</p>
          <div className="mod-process">
            <span><strong>1</strong> Queue</span><span>→</span>
            <span><strong>2</strong> Fetch receipt + target</span><span>→</span>
            <span><strong>3</strong> Review + decide</span><span>→</span>
            <span><strong>4</strong> Publish catalogue</span>
          </div>
          <div className="settings-row">
            <div className="profile-field">
              <div className="settings-label">Relay management URL</div>
              <input className="profile-input" placeholder="https://relay-eu.p2phiverelay.xyz or http://127.0.0.1:9100" value=${a} onInput=${O=>r(O.target.value)} />
            </div>
          </div>
          <div className="settings-row">
            <div className="profile-field">
              <div className="settings-label">Operator API key</div>
              <input className="profile-input" type="password" placeholder="Bearer token" value=${l} onInput=${O=>u(O.target.value)} />
            </div>
            <button className="btn" onClick=${A}>${c?"Saved":"Save"}</button>
          </div>
          <div className="settings-row">
            <button className="btn primary" onClick=${J} disabled=${R==="load"||!a.trim()}>${R==="load"?"Loading\u2026":"Load pending"}</button>
            ${N&&o`<span className=${"mod-mode "+(N==="review"?"pass":"warning")}>relay mode: ${N}</span>`}
            ${$&&o`<span className="settings-subtle">${$.length} queued</span>`}
          </div>
          ${N&&N!=="review"&&o`<div className="apps-error">This relay is not in review mode. Queue decisions are unsafe until its acceptance policy is set to <code>review</code>.</div>`}
          ${$&&$.length===0&&o`<div className="settings-subtle" style=${{padding:"6px 0"}}>No pending submissions.</div>`}
          ${$&&$.length>0&&o`
            <div className="mod-pending">
              ${$.map(O=>{let I=w[O.appKey],Z=I&&I.summary?I.summary.warning:0,M=[O.source,O.contentType,O.privacyTier,O.storageClass,O.availabilityClass].filter(Boolean);return o`
                <div className="mod-review-card" key=${O.appKey}>
                  <div className="mod-review-head">
                    <div style=${{minWidth:0}}>
                      <div className="app-name">${I&&I.manifest&&I.manifest.name||O.name||O.appId||"Unidentified app"}</div>
                      <div className="mod-key">${O.appKey}</div>
                      <div className="settings-subtle">publisher ${(O.publisherPubkey||"unknown").slice(0,16)}…${O.currentRelays?` \xB7 ${O.currentRelays} current relay(s)`:""}${O.replicationFactor?` \xB7 requests ${O.replicationFactor}`:""}</div>
                      ${M.length>0&&o`<div className="settings-subtle">relay metadata · ${M.join(" \xB7 ")}</div>`}
                      ${O.discoveredAt&&o`<div className="settings-subtle">queued ${new Date(O.discoveredAt).toLocaleString()}</div>`}
                    </div>
                    <span className=${"mod-mode "+(I?I.approvalAllowed?"warning":"block":"")}>${ue(I)}</span>
                  </div>
                  <div className="mod-review-actions">
                    <button className="btn small" onClick=${()=>P(O,!!I)} disabled=${!!R}>${R==="v:"+O.appKey?"Checking\u2026":I?"Re-run checks":"Run due diligence"}</button>
                    ${I&&I.previewUrl&&o`<button className="btn small subtle" onClick=${()=>n&&n(I.previewUrl)} disabled=${!!R}>Open target preview</button>`}
                  </div>
                  ${I&&o`
                    <div className="mod-summary">
                      <span className="mod-check pass">${I.summary.pass} pass</span>
                      <span className="mod-check warning">${I.summary.warning} warning${I.summary.warning===1?"":"s"}</span>
                      <span className="mod-check block">${I.summary.block} blocker${I.summary.block===1?"":"s"}</span>
                    </div>
                    ${I.manifest&&o`
                      <div className="mod-manifest">
                        <strong>${I.manifest.name}</strong>${I.manifest.version?` \xB7 v${I.manifest.version}`:""}${I.manifest.author?` \xB7 ${I.manifest.author}`:""}
                        ${I.manifest.description&&o`<div>${I.manifest.description}</div>`}
                        ${I.manifest.categories&&I.manifest.categories.length>0&&o`<div className="settings-subtle">${I.manifest.categories.join(" \xB7 ")}</div>`}
                        ${I.manifest.nativeDelivery?.installLink&&o`<div className="mod-key">${I.manifest.nativeDelivery.installLink}</div>`}
                      </div>
                    `}
                    <div className="mod-checks">
                      ${I.checks.map(K=>o`
                        <div className=${"mod-check-row "+K.status} key=${K.id}>
                          <span className="mod-check-icon">${K.status==="pass"?"\u2713":K.status==="block"?"\xD7":"!"}</span>
                          <div><strong>${K.label}</strong><div>${K.detail}</div></div>
                        </div>
                      `)}
                    </div>
                    <label className="mod-ack">
                      <input type="checkbox" checked=${y[O.appKey]===!0} onChange=${K=>f(V=>({...V,[O.appKey]:K.target.checked}))} />
                      ${I.submissionKind==="pear-v3"?"I independently checked the publisher and Pear release metadata, reviewed every warning, and understand that receipt checks are not a safety endorsement.":"I opened the target preview, reviewed every warning, and understand that automated checks are not a safety endorsement."}
                    </label>
                  `}
                  <div className="profile-field">
                    <div className="settings-label">Reviewer note <span className="settings-subtle">(required for approval)</span></div>
                    <textarea className="profile-input mod-textarea" placeholder="What did you inspect? Record relevant provenance or caveats." value=${p[O.appKey]||""} onInput=${K=>k(V=>({...V,[O.appKey]:K.target.value}))}></textarea>
                  </div>
                  <div className="profile-field">
                    <div className="settings-label">Rejection reason</div>
                    <input className="profile-input" placeholder="Required only when rejecting" value=${b[O.appKey]||""} onInput=${K=>x(V=>({...V,[O.appKey]:K.target.value}))} />
                  </div>
                  <div className="mod-decision-actions">
                    <button className="btn small primary" onClick=${()=>ne(O,!0)} disabled=${!!R||N!=="review"||!I||!I.approvalAllowed||!(p[O.appKey]||"").trim()||Z>0&&y[O.appKey]!==!0}>${R==="a:"+O.appKey?"Approving\u2026":"Approve receipt"}</button>
                    <button className="btn small subtle" onClick=${()=>ne(O,!1)} disabled=${!!R||N!=="review"||!(b[O.appKey]||"").trim()}>${R==="r:"+O.appKey?"Rejecting\u2026":"Reject with reason"}</button>
                  </div>
                </div>
              `})}
            </div>
          `}
          ${g.length>0&&o`
            <details className="mod-audit">
              <summary>Recent local decision audit · ${g.length}</summary>
              ${g.slice(0,20).map(O=>o`
                <div className="mod-audit-row" key=${O.appKey+":"+O.decidedAt}>
                  <span className=${"mod-mode "+(O.action==="approve"?"pass":"block")}>${O.action}</span>
                  <code>${(O.appKey||"").slice(0,16)}…</code>
                  <span>${O.reason||O.note||"No note"}</span>
                  <time>${O.decidedAt?new Date(O.decidedAt).toLocaleString():""}</time>
                </div>
              `)}
            </details>
          `}
        </div>
      `}
    </div>
  `}var xm={"author-signed":3,"relay-listed":2,unverified:1};function Dm(e,t){let n=String(e||"0").split(".").map(i=>parseInt(i,10)||0),s=String(t||"0").split(".").map(i=>parseInt(i,10)||0);for(let i=0;i<Math.max(n.length,s.length);i++){let a=n[i]||0,r=s[i]||0;if(a!==r)return a>r}return!1}function Nh(e,t){let n=xm[e.verification]||1,s=xm[t.verification]||1;return n!==s?n>s?e:t:Dm(e.version,t.version)?e:(Dm(t.version,e.version),t)}function wh(e){let t=String(e||"").trim();return t?t.replace(/^([a-z][a-z0-9+.-]*):\/\//i,(n,s)=>s.toLowerCase()+"://"):""}function bh(e){if(!e||typeof e!="object")return"";let t=/^[0-9a-f]{64}$/i.test(String(e.driveKey||"").trim())?String(e.driveKey).trim().toLowerCase():"",n=wh(e.link),s=/^hyper:\/\//i.test(n)?Ts(n):"";if(t||s)return"drive:"+(t||s);if(/^hyper:\/\/.+/i.test(n))return"link:"+n;let i=String(e.nativeDelivery?.installLink||"").trim().toLowerCase().replace(/\/$/,"");if(e.nativeDelivery?.status==="available"&&e.nativeDelivery?.kind==="pear-v3"&&/^pear:\/\/[13-9a-km-uw-z]{52}$/.test(i))return"native:"+i;let a=String(e.legacyMigrationId||"").trim().toLowerCase();if(/^[13-9a-km-uw-z]{52}$/.test(a))return"legacy:"+a;let r=String(e.id||"").trim();return r?"id:"+r:""}function yc(e){let t=new Map,n=[];for(let s of e){let i=bh(s);if(!i){n.push(s);continue}let a=t.get(i);if(!a){t.set(i,{...s,_sources:s.catalogName?[s.catalogName]:[]});continue}let r=[...new Set([...a._sources||[],s.catalogName].filter(Boolean))],l=Nh(s,a),u=l===s?a:s,c={...l};!c.iconData&&u.iconData&&(c.iconData=u.iconData),!c.icon&&u.icon&&(c.icon=u.icon),t.set(i,{...c,_sources:r})}return[...t.values(),...n]}function kh(e){return e&&/^[0-9a-f]{64}$/i.test(e.driveKey||"")?e.driveKey.toLowerCase():null}function _h({rpc:e,C:t,app:n}){let s=kh(n),i=n&&n.link?n.link:n&&/^[0-9a-f]{64}$/i.test(n.driveKey||"")?"hyper://"+n.driveKey+"/":null,[a,r]=(0,d.useState)(null);if((0,d.useEffect)(()=>{if(!s||!(t&&t.CMD_GET_DRIVE_INFO)){r(null);return}let h=!1,$=async()=>{try{let N=await e.request(t.CMD_GET_DRIVE_INFO,{keyHex:s},12e3);h||r(N)}catch{}};$();let v=setInterval($,15e3);return()=>{h=!0,clearInterval(v)}},[s,e,t]),!i)return null;let l=i.length>30?i.slice(0,20)+"\u2026"+i.slice(-6):i,u=a?a.peerCount||0:null,c=a&&a.byteLength?mr(a.byteLength):null;return o`
    <div className="app-p2p-meta" style=${{display:"flex",flexWrap:"wrap",alignItems:"center",gap:"8px",marginTop:"5px",fontSize:"11px"}}>
      <button title=${"Copy "+i} onClick=${h=>{h.stopPropagation(),Oi(i)}} style=${{background:"none",border:"none",padding:0,color:"#6e7681",cursor:"pointer",fontFamily:"ui-monospace, monospace",fontSize:"11px"}}>${l} ⧉</button>
      ${c?o`<span style=${{color:"#8b949e"}}>${c}</span>`:""}
      <span title="Peers currently serving this app" style=${{display:"inline-flex",alignItems:"center",gap:"4px",color:u>0?"#3fb950":"#6e7681"}}>
        <span style=${{width:"6px",height:"6px",borderRadius:"50%",background:u>0?"#3fb950":"#484f58",display:"inline-block"}}></span>
        ${u==null?"\u2026":u+" "+(u===1?"peer":"peers")}
      </span>
    </div>
  `}function Sh({rpc:e,C:t,onLaunch:n}){let[s,i]=(0,d.useState)(""),[a,r]=(0,d.useState)([]),[l,u]=(0,d.useState)([]),[c,h]=(0,d.useState)(null),[$,v]=(0,d.useState)(""),[N,_]=(0,d.useState)("all"),[w,E]=(0,d.useState)("all"),[y,f]=(0,d.useState)({}),[p,k]=(0,d.useState)(null),[b,x]=(0,d.useState)(""),[g,S]=(0,d.useState)(!1),[R,D]=(0,d.useState)(""),[H,W]=(0,d.useState)(null),[G,F]=(0,d.useState)(null),[B,A]=(0,d.useState)(!1),[J,P]=(0,d.useState)([]),[ne,ue]=(0,d.useState)([]),[O,I]=(0,d.useState)([]),[Z,M]=(0,d.useState)(null),[K,V]=(0,d.useState)(null),[T,L]=(0,d.useState)(""),[ie,$e]=(0,d.useState)(!1),[ee,j]=(0,d.useState)(""),me=async m=>{let q=String(m?.legacyMigrationId||"").trim().toLowerCase();if(!q){L(`${m?.name||"This app"} has no verified native v3 package yet.`);return}L(""),V("legacy-migration"),j("");try{let X=await e.request(t.CMD_LEGACY_APP_MIGRATION,{legacyMigrationId:q},1e4);L(X?.message||"A verified native v3 package is required.")}catch(X){L(`migration: ${X.message}`)}finally{V(null)}},mt=m=>{if(m?.nativeDelivery?.status==="migration-required"){me(m);return}let q=(m.link||"").trim();if(q){if(q.startsWith("hyper://")||q.startsWith("http://")||q.startsWith("https://")){L(""),n?.(q),j(`Launched ${m.name} in Browse \u2014 window.pear.${m.id}.* shim will inject if the manifest gate passes.`),setTimeout(()=>j(""),4e3);return}L(`launch: unsupported scheme for featured app "${m.name}" \u2014 ${q.slice(0,32)}`)}},Rs=async m=>{if(m&&m.type!=="hypersite"){L(`${m.name||"This app"} is window-only: its catalogue type is "${m.type||"standalone"}", not "hypersite".`);return}L(""),V("run-in-tab"),j("");try{let q=await e.request(t.CMD_RUN_APP_IN_TAB,{link:m.link},3e4);if(q?.action==="legacy-migration-required"){L(q.message||"A verified native v3 package is required.");return}n?.(q.url),j(`Running ${m.name} headless in a tab.`),setTimeout(()=>j(""),4e3)}catch(q){L(`run in tab: ${q.message}`)}finally{V(null)}},Wn=m=>{!m||!m.driveKey||(L(""),j(""),n?.("hyper://"+m.driveKey+"/"),j(`Opened ${m.name}.`),setTimeout(()=>j(""),3500))},Le=async()=>{try{let m=await e.request(t.CMD_LIST_INSTALLED);ue(Array.isArray(m)?m:m?.apps??[])}catch(m){L(`saved copies: ${m.message}`)}},Is=async()=>{try{let m=globalThis.pearbrowserRuntime;if(!m||typeof m.listPearApps!="function")return I([]);let q=await m.listPearApps();I(Array.isArray(q)?q:[])}catch(m){L(`native apps: ${m.message}`)}},Ze=m=>m?.nativeDelivery?.status==="available"&&m?.nativeDelivery?.kind==="pear-v3"?String(m.nativeDelivery.installLink||""):"",C=m=>{let q=Ze(m);return q&&O.find(X=>X.link===q)||null},U=async m=>{let q=globalThis.pearbrowserRuntime;if(!q||typeof q.installPearApp!="function"){L("Native Pear v3 installation is unavailable in this build.");return}let X=Ze(m);if(!X){L(`${m?.name||"This app"} has no valid Pear v3 install link.`);return}L(""),j(""),M(null),V(`native-install:${X}`);try{let oe=await q.installPearApp({id:m.id,name:m.name,verification:m.verification,nativeDelivery:m.nativeDelivery});if(oe?.cancelled)return;await Is(),j(oe?.exists?`${oe.app||m.name} is already installed.`:`Installed ${oe?.app||m.name} as a native Pear v3 app.`),setTimeout(()=>j(""),5e3)}catch(oe){L(`install ${m.name}: ${oe.message}`)}finally{V(null),M(null)}},Y=async m=>{let q=globalThis.pearbrowserRuntime;if(!q||typeof q.launchPearApp!="function"){L("Native Pear v3 launching is unavailable in this build.");return}let X=Ze(m)||m?.link||m?.id;L(""),j(""),V(`native-launch:${X}`);try{let oe=await q.launchPearApp({link:X,id:m?.id});j(`Opened ${oe?.app||m?.name||"Pear app"} in its native window.`),setTimeout(()=>j(""),4e3),await Is()}catch(oe){L(`launch ${m?.name||"app"}: ${oe.message}`)}finally{V(null)}},se=async()=>{try{let m=await e.request(t.CMD_CHECK_UPDATES),q={};for(let X of Array.isArray(m)?m:[])X&&X.id&&(q[X.id]=X.newVersion);f(q)}catch{}},re=async m=>{let q=a.find(X=>X.id===m);if(!q){L(`refresh ${m}: not in any loaded catalog`);return}await Yn(q),await se()},te=m=>{let q=Array.isArray(m)?m.filter(Boolean):[m].filter(Boolean);return!p||!q.length||!Array.isArray(p.apps)?!1:p.apps.some(X=>q.some(oe=>X.id===oe||X.driveKey===oe||X.link===oe))},le=!!(p&&p.writable),pe=m=>{try{navigator.clipboard.writeText(m),A(!0),setTimeout(()=>A(!1),1500)}catch{}},Te=async()=>{L(""),V("mycatalog");try{let m=await e.request(t.CMD_MYCATALOG_CREATE,{name:b},6e4);k(m),x(""),e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{myCatalogKey:m.keyHex}}).catch(()=>{}),await nn(m.keyHex)}catch(m){L(`catalog create: ${m.message}`)}finally{V(null)}},zt=async m=>{if(!p)return;if(!p.writable){L("This catalog is not editable on this device.");return}let q=m.id||m.driveKey||m.link;L(""),V(`addcat:${q}`);try{let X=await e.request(t.CMD_MYCATALOG_ADD_APP,{keyHex:p.keyHex,app:m},6e4);k(X),await Ue(),se()}catch(X){L(`add to catalog: ${X.message}`)}finally{V(null)}},Ge=async m=>{if(p){if(!p.writable){L("This catalog is not editable on this device.");return}L(""),V(`rmcat:${m}`);try{let q=await e.request(t.CMD_MYCATALOG_REMOVE_APP,{keyHex:p.keyHex,id:m},6e4);k(q),H===m&&(W(null),F(null)),await Ue(),se()}catch(q){L(`remove from catalog: ${q.message}`)}finally{V(null)}}},Ht=()=>{p&&(D(p.name||"My Catalog"),S(!0))},Ne=async()=>{if(p){if(!p.writable){L("This catalog is not editable on this device.");return}L(""),V("renamecat");try{let m=await e.request(t.CMD_MYCATALOG_RENAME,{keyHex:p.keyHex,name:R},6e4);k(m),S(!1),await Ue(),se()}catch(m){L(`rename catalog: ${m.message}`)}finally{V(null)}}},rt=m=>{let q=m.id||m.driveKey||m.link;q&&(W(q),F({name:m.name||"",type:m.type||"standalone",description:m.description||"",version:m.version||"",author:m.author||"",categories:kr(m).join(", "),icon:m.icon||m.iconRef||""}))},bt=(m,q)=>{F(X=>({...X||{},[m]:q}))},Ve=()=>{W(null),F(null)},We=async m=>{if(!p||!G)return;if(!p.writable){L("This catalog is not editable on this device.");return}let q=String(G.categories||"").split(",").map(X=>X.trim()).filter(Boolean);L(""),V(`editcat:${m}`);try{let X=await e.request(t.CMD_MYCATALOG_UPDATE_APP,{keyHex:p.keyHex,id:m,app:{name:G.name,type:G.type,description:G.description,version:G.version,author:G.author,categories:q,icon:G.icon}},6e4);k(X),W(null),F(null),await Ue(),se()}catch(X){L(`edit app: ${X.message}`)}finally{V(null)}},Ue=async()=>{try{let m=await e.request(t.CMD_GET_CATALOG_APPS);r(Array.isArray(m?.apps)?m.apps:[]),u(Array.isArray(m?.catalogs)?m.catalogs:[])}catch(m){L(`catalog: ${m.message}`)}},nn=async m=>{let q=(typeof m=="string"?m:s).trim(),X=Kt(q);if(X){L(""),V("catalog");try{let{cmd:oe,payload:It,persistRef:we}=Am(X,t);await e.request(oe,It||{keyHex:X.key},6e4),i(""),await Ue(),se(),P(Xn=>{let Ps=[we,...Xn.filter(Tr=>Tr!==we)].slice(0,8);return e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{lastCatalogKey:we,recentCatalogs:Ps}}).catch(()=>{}),Ps})}catch(oe){L(`catalog: ${oe.message}`)}finally{V(null)}}},jn=async m=>{L("");try{await e.request(t.CMD_UNLOAD_CATALOG,{keyHex:m}),w===m&&E("all"),await Ue();let q=Jo(m);P(X=>{let oe=X.filter(It=>Jo(It)!==q);return e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{recentCatalogs:oe}}).catch(()=>{}),oe})}catch(q){L(`unload: ${q.message}`)}};(0,d.useEffect)(()=>{Le(),Is(),Ue(),(async()=>{try{let m=Rt(await e.request(t.CMD_USERDATA_GET_SETTINGS)),q=Array.isArray(m?.recentCatalogs)?m.recentCatalogs:[],X=m?.lastCatalogKey,oe=typeof m?.myCatalogKey=="string"?m.myCatalogKey:null,It=et=>Kt(et)?.key===th?pc:et,we=q.map(It);we.some((et,Ft)=>et!==q[Ft])&&e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{recentCatalogs:we}}).catch(()=>{});let Xn=[...new Set([...we,...X?[It(X)]:[],...oe?[oe]:[]])];we.length&&P(we),oe&&e.request(t.CMD_MYCATALOG_GET,{keyHex:oe}).then(k).catch(()=>{});let Ps=m?.defaultCatalogSeeded===!0,Tr=m?.communityCatalogSeeded===!0,Jm=Kt(Ds)?.key,Zm=Xn.some(et=>Kt(et)?.key===Jm),Bi=Xn.length?[...Xn]:Ps?[]:[pc,Ds],kc=!Zm&&!Tr;if(kc&&(Bi=[...new Set([...Bi,Ds])]),Bi.length){V("catalog"),await Promise.allSettled(Bi.map(Ft=>{let Ki=Kt(Ft);if(!Ki)return Promise.resolve();let{cmd:ef,payload:tf}=Am(Ki,t),nf=Kt(Ds)?.key===Ki.key;return e.request(ef,tf||{keyHex:Ki.key},nf?25e3:6e4)}));let et={};if(!Xn.length&&!Ps){let Ft=[pc,Ds];P(Ft),et.recentCatalogs=Ft,et.defaultCatalogSeeded=!0,et.communityCatalogSeeded=!0}else if(kc){let Ft=[...new Set([...we,Ds])];P(Ft),et.recentCatalogs=Ft,et.communityCatalogSeeded=!0}Object.keys(et).length&&e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:et}).catch(()=>{}),await Ue(),se(),V(null)}}catch{}finally{$e(!0)}})()},[]),(0,d.useEffect)(()=>{let m=globalThis.pearbrowserRuntime;if(!(!m||typeof m.onPearAppProgress!="function"))return m.onPearAppProgress(q=>M(q||null))},[]);let Yn=async m=>{L(""),V(`save-offline:${m.id}`);try{await e.request(t.CMD_INSTALL_APP,m,12e4),await Le()}catch(q){L(`save ${m.name} offline: ${q.message}`)}finally{V(null)}},Qn=async m=>{L(""),V(`remove-saved:${m.id}`);try{await e.request(t.CMD_UNINSTALL_APP,{id:m.id}),await Le()}catch(q){L(`remove saved copy of ${m.name}: ${q.message}`)}finally{V(null)}},Ls=async m=>{L(""),V(`open-saved:${m.id}`);try{let q=await e.request(t.CMD_LAUNCH_APP,{id:m.id});n(q.localUrl)}catch(q){L(`open ${m.name}: ${q.message}`)}finally{V(null)}},Cr=m=>ne.some(q=>q.id===m),$c=m=>{if(Cr(m.id))return Ls(m);Wn(m)},Nc=(0,d.useMemo)(()=>{let m=new Set;for(let q of a)kr(q).forEach(X=>m.add(X));return["all",...[...m].sort()]},[a]),wc=(0,d.useMemo)(()=>{let m=$.normalize("NFKC").trim().toLowerCase(),q=a.filter(X=>!X||!X.link&&!X.legacyMigrationId&&!Ze(X)||w!=="all"&&X.catalogKey!==w||N!=="all"&&!kr(X).includes(N)?!1:m?yh(X).includes(m):!0);return yc(q)},[a,$,N,w]),bc=(0,d.useMemo)(()=>yc(a.filter(m=>m&&(m.link||m.legacyMigrationId||Ze(m)))).length,[a]),Xm=m=>{let q=m.id||m.driveKey||m.name||"untitled",X=m.id||m.driveKey,oe=H===X&&G,It=!!(G&&String(G.name||"").trim());return o`
      <div className=${"app-card"+(oe?" editing":"")} key=${q}>
        <${Mi} rpc=${e} C=${t} driveKey=${m.driveKey} iconRef=${m.icon} iconData=${m.iconData} name=${m.name} />
        <div className="app-info">
          ${oe?o`
              <div className="catalog-edit-wrap">
                <div className="catalog-edit-form">
                  <label>
                    Name
                    <input type="text" value=${G.name} onInput=${we=>bt("name",we.target.value)} />
                  </label>
                  <label>
                    Type <span style=${{opacity:.6,fontWeight:"normal"}}>(how it launches — required)</span>
                    <select value=${G.type||"standalone"} onChange=${we=>bt("type",we.target.value)} style=${{width:"100%",padding:"8px",borderRadius:"6px",background:"#0d1117",color:"#c9d1d9",border:"1px solid #30363d"}}>
                      <option value="hypersite">hypersite — browsable P2P content</option>
                    </select>
                  </label>
                  <label>
                    Description
                    <textarea rows="3" value=${G.description} onInput=${we=>bt("description",we.target.value)}></textarea>
                  </label>
                  <div className="catalog-form-grid">
                    <label>
                      Version
                      <input type="text" value=${G.version} onInput=${we=>bt("version",we.target.value)} />
                    </label>
                    <label>
                      Author
                      <input type="text" value=${G.author} onInput=${we=>bt("author",we.target.value)} />
                    </label>
                  </div>
                  <label>
                    Categories
                    <input type="text" value=${G.categories} onInput=${we=>bt("categories",we.target.value)} />
                  </label>
                  <label>
                    Icon <span style=${{opacity:.6,fontWeight:"normal"}}>(path inside your drive, e.g. /icon.svg)</span>
                    <input type="text" placeholder="/icon.svg" value=${G.icon||""} onInput=${we=>bt("icon",we.target.value)} />
                  </label>
                  ${(m.link||m.driveKey)&&o`<div className="app-meta" style=${{marginTop:"2px",fontFamily:"ui-monospace, monospace",fontSize:"11px",color:"#6e7681",wordBreak:"break-all"}}>launch: ${m.link||"hyper://"+m.driveKey+"/"}</div>`}
                </div>
              </div>
            `:o`
              <div className="app-info-copy">
                <div className="app-name">${m.name||m.id}</div>
                <div className="app-desc">${m.description||""}</div>
                <div className="app-meta">${m.version?"v"+m.version:""} ${m.author?"\xB7 "+m.author:""}</div>
              </div>
            `}
        </div>
        <div className="app-actions">
          ${oe?o`
              <div className="app-actions-group">
                <button key="save" className="btn primary" onClick=${()=>We(X)} disabled=${K===`editcat:${X}`||!It}>
                  ${K===`editcat:${X}`?"Saving\u2026":"Save"}
                </button>
                <button key="cancel" className="btn subtle" onClick=${Ve} disabled=${K===`editcat:${X}`}>Cancel</button>
              </div>
            `:o`
              <div className="app-actions-group">
                ${le&&X&&o`
                  <button key="edit" className="btn subtle" onClick=${()=>rt(m)} disabled=${K===`rmcat:${X}`}>Edit</button>
                  <button key="remove" className="btn subtle" onClick=${()=>Ge(X)} disabled=${K===`rmcat:${X}`}>Remove</button>
                `}
              </div>
            `}
        </div>
      </div>
    `};return o`
    <div className="apps">
      <h1>Apps</h1>
      <p className="subtitle">Browse P2P content or find verified native v3 package guidance in a HiveRelay catalog.</p>

      <h2>Featured</h2>
      <div className="app-grid">
        ${jy.map(m=>o`
          <div className="app-card" key=${m.id}>
            <div className="app-icon app-icon-fallback" style=${{background:m.gradient,color:"#0b0e14"}}>${m.initial}</div>
            <div className="app-info">
              <div className="app-name">${m.name}</div>
              <div className="app-desc">${m.tagline}</div>
              <div className="app-meta" title=${m.legacyMigrationId}>Legacy native release · migration required</div>
            </div>
            <div className="app-actions">
              ${m.type==="hypersite"?o`<button key="run-featured" className="btn primary" onClick=${()=>Rs(m)} disabled=${K==="run-in-tab"} title="Run headless — the app's UI streams into a tab over a pipe">Run in tab</button>`:o`<button key="open-featured" className="btn primary" onClick=${()=>mt(m)} disabled=${K==="legacy-migration"} title="Requires a verified native v3 package">Migration status</button>`}
            </div>
          </div>
        `)}
      </div>

      <h2>Legacy native apps</h2>
      <div className="catalog-loader">
        <p className="placeholder">Older remote app links cannot run in PearBrowser. Install only a publisher-provided, verified native v3 package.</p>
      </div>
      ${ee&&o`<div className="apps-ok">${ee}</div>`}
      ${Z&&o`<div className="apps-ok">
        ${Z.phase==="downloading"?`Downloading native app \xB7 ${mr(Z.download?.bytes||0)} \xB7 ${Z.peers||0} peer${Z.peers===1?"":"s"}`:Z.phase==="connecting"?"Finding Pear v3 release peers\u2026":Z.phase==="installing"?`Installing ${Z.app||"native app"}${Z.version?` v${Z.version}`:""}\u2026`:"Preparing native app\u2026"}
      </div>`}

      <h2>App Catalog</h2>
      <div className="catalog-loader">
        <input
          type="text"
          placeholder="Catalog key: hex, z32, hyperbee://…, autobee://…, sheets://… or hiveindex://…"
          value=${s}
          onInput=${m=>i(m.target.value)}
          onKeyDown=${m=>m.key==="Enter"&&nn()}
          spellCheck="false"
        />
        <button className="btn primary" onClick=${()=>nn()} disabled=${!s||K==="catalog"}>
          ${K==="catalog"?"Loading\u2026":"Add catalog"}
        </button>
      </div>

      ${l.length>0&&o`
        <div className="catalog-sources">
          <button
            className=${"catalog-chip"+(w==="all"?" active":"")}
            onClick=${()=>E("all")}
          >All · ${bc}</button>
          ${l.map(m=>o`
            <span className="catalog-source" key=${m.key}>
              <button
                className=${"catalog-chip"+(w===m.key?" active":"")}
                title=${m.key}
                onClick=${()=>E(m.key)}
              >${m.name} · ${m.count}</button>
              <button className="catalog-source-x" title="Remove this catalog" onClick=${()=>jn(m.key)}>×</button>
            </span>
          `)}
        </div>
      `}

      ${T&&o`<div className="apps-error">${T}</div>`}

      ${K==="catalog"&&a.length===0&&o`
        <div className="catalog-loading">
          <span className="spinner"></span>
          <span>Loading catalogs from peers…</span>
        </div>
      `}

      ${ie&&a.length===0&&!K&&!T&&o`
        <div className="catalog-empty">
          <strong>No catalogs loaded.</strong>
          Paste a catalog drive key above, or use one of the featured Pear apps to launch directly.
          The browser remembers catalogs you've loaded before — they'll reload here next time.
        </div>
      `}

      ${a.length>0&&o`
        <div className="catalog-results">
          <h2>All apps · ${bc}${l.length?` across ${l.length} ${l.length===1?"catalog":"catalogs"}`:""}</h2>

          <div className="catalog-filter">
            <input
              type="text"
              className="catalog-search"
              placeholder="Search apps by name, category, catalogue, or author…"
              value=${$}
              onInput=${m=>v(m.target.value)}
              spellCheck="false"
            />
            ${Nc.length>1&&o`
              <div className="catalog-categories">
                ${Nc.map(m=>o`
                  <button
                    className=${"catalog-chip"+(m===N?" active":"")}
                    key=${m}
                    onClick=${()=>_(m)}
                  >${m==="all"?"All":m}</button>
                `)}
              </div>
            `}
          </div>

          ${wc.length===0?o`<p className="placeholder">No apps match ${$?`"${$}"`:"this filter"}.</p>`:o`<div className="app-grid">
              ${wc.map(m=>o`
              <div className="app-card" key=${m.id}>
                <${Mi} rpc=${e} C=${t} driveKey=${m.driveKey} iconRef=${m.icon} iconData=${m.iconData} name=${m.name} />
                <div className="app-info" onClick=${()=>h(m)} style=${{cursor:"pointer"}} title="View details">
                  <div className="app-name">
                    ${m.name||m.id||"Untitled app"}
                    ${m.verification==="relay-listed"?o`<span title="Relay-listed" style=${{marginLeft:"5px",color:"#58a6ff",fontSize:"12px"}}>✓</span>`:""}
                    ${m.verification==="author-signed"?o`<span title="Author-signed" style=${{marginLeft:"5px",color:"#3fb950",fontSize:"12px"}}>✦</span>`:""}
                  </div>
                  <div className="app-desc">${m.description||""}</div>
                  <div className="app-meta">
                    ${m.version?"v"+m.version:""} ${m.author?"\xB7 "+m.author:""}
                    ${m.nativeDelivery?.status==="migration-required"?o`<span style=${{marginLeft:"6px",opacity:.75}}>· verified native package required</span>`:Ze(m)?o`<span style=${{marginLeft:"6px",opacity:.75}}>· Pear v3 native app</span>`:m.type==="hypersite"?o`<span style=${{marginLeft:"6px",opacity:.75}}>· opens in a tab</span>`:""}
                  </div>
                  ${m.catalogName&&o`<div className="app-source-tag">${m.catalogName}</div>`}
                  <${_h} rpc=${e} C=${t} app=${m} />
                </div>
                <div className="app-actions">
                  ${(()=>{let q=Ze(m),X=C(m),oe=!!(m.driveKey&&/^[0-9a-f]{64}$/i.test(m.driveKey)),It=Cr(m.id);return o`
                      ${oe?o`<button key="open-content" className=${"btn "+(q||m.nativeDelivery?.status==="migration-required"?"subtle":"primary")} onClick=${()=>$c(m)} title="Open this browsable Hyperdrive content in a tab">Open</button>`:""}
                      ${oe?It?o`<button key="remove-saved-copy" className="btn subtle" onClick=${()=>Qn(m)} disabled=${K===`remove-saved:${m.id}`} title="Remove this device's saved content while keeping the catalogue entry">${K===`remove-saved:${m.id}`?"Removing\u2026":"Remove saved copy"}</button>`:o`<button key="save-offline" className="btn subtle" onClick=${()=>Yn(m)} disabled=${K===`save-offline:${m.id}`} title="Save browsable content on this device for offline use">${K===`save-offline:${m.id}`?"Saving\u2026":"Save offline"}</button>`:""}
                      ${q?X?.installed?o`<button key="open-native" className="btn primary" onClick=${()=>Y(m)} disabled=${K===`native-launch:${q}`} title="Open the installed native application">Open app</button>`:o`<button key="install-native" className="btn primary" onClick=${()=>U(m)} disabled=${K===`native-install:${q}`} title="Install the Pear v3 build into your operating system">${K===`native-install:${q}`?"Installing\u2026":"Install app"}</button>`:m.nativeDelivery?.status==="migration-required"?o`<button key="migration" className="btn primary" onClick=${()=>me(m)} disabled=${K==="legacy-migration"} title="Requires a verified native v3 package">Migration status</button>`:""}
                      ${le&&m.catalogKey!==p.keyHex&&!te([m.id,m.driveKey,m.link])&&o`
                        <button key="add-catalog" className="btn subtle" title="Add to my catalog" onClick=${()=>zt(m)} disabled=${K===`addcat:${m.id||m.driveKey||m.link}`}>+ Catalog</button>
                      `}
                    `})()}
                </div>
              </div>
            `)}
            </div>
          `}
        </div>
      `}

      <h2>My Catalog</h2>
      ${p?o`
          <div className="mycatalog">
            <div className="mycatalog-head">
              <div className="mycatalog-title">
                ${g?o`
                    <div className="mycatalog-title-edit">
                      <input
                        className="mycatalog-title-input"
                        type="text"
                        value=${R}
                        onInput=${m=>D(m.target.value)}
                        onKeyDown=${m=>{m.key==="Enter"&&Ne(),m.key==="Escape"&&S(!1)}}
                        spellCheck="false"
                        autoFocus
                      />
                    <button key="save-name" className="btn primary small" onClick=${Ne} disabled=${K==="renamecat"||!R.trim()}>
                      ${K==="renamecat"?"Saving\u2026":"Save"}
                    </button>
                    <button key="cancel-name" className="btn subtle small" onClick=${()=>S(!1)} disabled=${K==="renamecat"}>Cancel</button>
                    </div>
                  `:o`
                    <div className="mycatalog-title-row">
                      <div className="app-name">${p.name}</div>
                      ${le&&o`<button key="rename" className="btn subtle small" onClick=${Ht}>Rename</button>`}
                    </div>
                  `}
                <div className="app-meta">${p.apps.length} app${p.apps.length===1?"":"s"}${p.writable?"":" \xB7 read-only on this device"}</div>
              </div>
              <button className="btn subtle" onClick=${()=>pe(p.keyHex)}>${B?"Copied!":"Copy share key"}</button>
            </div>
            <div className="mycatalog-key" title=${p.keyHex}>${p.keyHex}</div>
            ${p.apps.length===0?o`<p className="placeholder">${p.writable?"No apps yet. Use + Catalog on any app above to add it.":"This catalog has no saved apps."}</p>`:o`<div className="app-grid">
                  ${p.apps.map(Xm)}
                </div>`}
          </div>
        `:o`
          <div className="catalog-empty">
            <strong>Publish your own catalog.</strong>
            Create a catalog, add apps you want to share, then hand out its key — anyone can load it above to discover your picks. It's pinned to the relays, so it stays reachable even when you're offline.
            <div className="catalog-loader" style=${{marginTop:"10px"}}>
              <input
                type="text"
                placeholder="Catalog name (e.g. My Picks)"
                value=${b}
                onInput=${m=>x(m.target.value)}
                onKeyDown=${m=>m.key==="Enter"&&Te()}
                spellCheck="false"
              />
              <button className="btn primary" onClick=${Te} disabled=${K==="mycatalog"}>
                ${K==="mycatalog"?"Creating\u2026":"Create catalog"}
              </button>
            </div>
          </div>
        `}

      <h2>Native Pear apps</h2>
      ${O.length===0?o`<p className="placeholder">No native Pear v3 apps installed through PearBrowser yet.</p>`:o`<div className="app-grid">
            ${O.map(m=>o`
              <div className="app-card" key=${m.link}>
                <div className="app-icon app-icon-fallback">${(m.app||m.displayName||"?").charAt(0)}</div>
                <div className="app-info">
                  <div className="app-name">${m.app||m.displayName}</div>
                  <div className="app-meta">v${m.version||"?"} · native ${m.platform||""}${m.installed?"":" \xB7 not found at recorded OS location"}</div>
                </div>
                <div className="app-actions">
                  <button key="launch-native-installed" className="btn primary" onClick=${()=>Y({id:m.id,name:m.app,nativeDelivery:{status:"available",kind:"pear-v3",installLink:m.link}})} disabled=${!m.installed||K===`native-launch:${m.link}`}>Open app</button>
                </div>
              </div>
            `)}
          </div>`}

      <h2>Saved for offline use</h2>
      ${ne.length===0?o`<p className="placeholder">No Hyperdrive content saved for offline use yet.</p>`:o`<div className="app-grid">
            ${ne.map(m=>o`
              <div className="app-card" key=${m.id}>
                <${Mi} rpc=${e} C=${t} driveKey=${m.driveKey} iconRef=${m.icon} iconData=${m.iconData} name=${m.name} />
                <div className="app-info">
                  <div className="app-name">${m.name}</div>
                  <div className="app-meta">Saved v${m.version||"?"}${y[m.id]?` \xB7 newer content available \u2192 v${y[m.id]}`:""}</div>
                </div>
                <div className="app-actions">
                  ${y[m.id]&&o`
                    <button key="refresh-saved-copy" className="btn primary" onClick=${()=>re(m.id)} disabled=${K===`save-offline:${m.id}`}>
                      ${K===`save-offline:${m.id}`?"Refreshing\u2026":"Refresh saved copy"}
                    </button>
                  `}
                  <button key="open-saved" className="btn" onClick=${()=>Ls(m)} disabled=${K===`open-saved:${m.id}`}>Open</button>
                  <button key="remove-saved" className="btn subtle" onClick=${()=>Qn(m)} disabled=${K===`remove-saved:${m.id}`}>${K===`remove-saved:${m.id}`?"Removing\u2026":"Remove saved copy"}</button>
                  ${le&&!te([m.id,m.driveKey,m.link])&&o`
                    <button key="add-installed" className="btn subtle" title="Add to my catalog" onClick=${()=>zt(m)} disabled=${K===`addcat:${m.id||m.driveKey||m.link}`}>+ Catalog</button>
                  `}
                </div>
              </div>
            `)}
          </div>`}

      <${gh} rpc=${e} C=${t} />

      <${hh} rpc=${e} C=${t} />

      <${$h} rpc=${e} C=${t} onPreview=${n} />

      ${c&&o`
        <div onClick=${()=>h(null)} style=${{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3,padding:"24px"}}>
          <div onClick=${m=>m.stopPropagation()} style=${{background:"#11161f",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"14px",padding:"20px 24px 24px",maxWidth:"480px",width:"100%",maxHeight:"82vh",overflowY:"auto"}}>
            <div style=${{display:"flex",justifyContent:"flex-end"}}>
              <button className="btn subtle" title="Close" onClick=${()=>h(null)} style=${{padding:"2px 9px"}}>✕</button>
            </div>
            <div style=${{display:"flex",gap:"14px",alignItems:"center",marginBottom:"14px"}}>
              ${Ui(c.iconData)?o`<img src=${Ui(c.iconData)} alt="" style=${{width:"56px",height:"56px",borderRadius:"12px"}} />`:o`<div style=${{width:"56px",height:"56px",borderRadius:"12px",background:"#1f2733",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",fontWeight:600}}>${(c.name||"?").charAt(0)}</div>`}
              <div style=${{minWidth:0}}>
                <div style=${{fontSize:"18px",fontWeight:600}}>
                  ${c.name||"Untitled app"}
                  ${c.verification==="relay-listed"?o`<span title="Relay-listed" style=${{marginLeft:"6px",color:"#58a6ff",fontSize:"14px"}}>✓</span>`:""}
                  ${c.verification==="author-signed"?o`<span title="Author-signed" style=${{marginLeft:"6px",color:"#3fb950",fontSize:"14px"}}>✦</span>`:""}
                </div>
                <div style=${{color:"#8b949e",fontSize:"13px"}}>${c.author||""}</div>
              </div>
            </div>
            <p style=${{color:"#c9d1d9",lineHeight:1.6,margin:"0 0 14px"}}>${c.description||"No description."}</p>
            ${c.categories&&c.categories.length?o`
              <div style=${{display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:"14px"}}>
                ${c.categories.map(m=>o`<span key=${m} style=${{fontSize:"12px",padding:"2px 9px",borderRadius:"8px",background:"rgba(255,255,255,0.06)",color:"#8b949e"}}>${m}</span>`)}
              </div>`:""}
            <div style=${{fontSize:"13px",color:"#8b949e",display:"grid",gap:"6px",marginBottom:"18px"}}>
              <div><strong style=${{color:"#c9d1d9"}}>Delivery:</strong> ${c.driveKey?`browsable Hyperdrive content opened in a browser tab${Ze(c)?"; signed Pear v3 native package also available":""}`:Ze(c)?"signed Pear v3 native OS application":c.nativeDelivery?.status==="migration-required"?"legacy native record; verified Pear v3 package required":"catalogue link"}</div>
              ${c.version?o`<div><strong style=${{color:"#c9d1d9"}}>Version:</strong> v${c.version}</div>`:""}
              <div><strong style=${{color:"#c9d1d9"}}>Verification:</strong> ${c.verification||"unverified"}</div>
              ${c.homepage?o`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Homepage:</strong> ${c.homepage}</div>`:""}
              ${c.sourceUrl?o`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Source:</strong> ${c.sourceUrl}</div>`:""}
              ${c.license?o`<div><strong style=${{color:"#c9d1d9"}}>License:</strong> ${c.license}</div>`:""}
              ${c.link?o`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Link:</strong> ${c.link}</div>`:""}
              ${Ze(c)?o`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Install:</strong> ${Ze(c)}</div>`:""}
              ${c.driveKey?o`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Drive:</strong> ${c.driveKey}</div>`:""}
              ${c._sources&&c._sources.length?o`<div><strong style=${{color:"#c9d1d9"}}>Catalogue${c._sources.length>1?"s":""}:</strong> ${c._sources.join(", ")}</div>`:c.catalogName?o`<div><strong style=${{color:"#c9d1d9"}}>Catalogue:</strong> ${c.catalogName}</div>`:""}
              ${c.publisherKey?o`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Publisher:</strong> ${ge(c.publisherKey)}</div>`:""}
            </div>
            <div style=${{display:"flex",gap:"8px"}}>
              ${c.driveKey&&o`
                <button key="detail-open-site" className="btn primary" onClick=${()=>{$c(c),h(null)}}>Open</button>
                ${Cr(c.id)?o`<button key="detail-remove-saved" className="btn subtle" onClick=${()=>{Qn(c),h(null)}}>Remove saved copy</button>`:o`<button key="detail-save-offline" className="btn subtle" onClick=${()=>{Yn(c),h(null)}}>Save offline</button>`}
              `}
              ${Ze(c)?C(c)?.installed?o`<button key="detail-open-native" className="btn primary" onClick=${()=>{Y(c),h(null)}}>Open app</button>`:o`<button key="detail-install-native" className="btn primary" onClick=${()=>{U(c),h(null)}}>Install app</button>`:c.nativeDelivery?.status==="migration-required"?o`<button key="detail-migration" className="btn primary" onClick=${()=>{me(c),h(null)}}>Migration status</button>`:!c.driveKey&&c.type==="hypersite"?o`<button key="detail-run-tab" className="btn primary" onClick=${()=>{Rs(c),h(null)}}>Run in tab</button>`:c.driveKey?"":o`<button key="detail-open-window" className="btn primary" onClick=${()=>{mt(c),h(null)}}>Open</button>`}
              <button key="detail-close" className="btn" onClick=${()=>h(null)}>Close</button>
            </div>
          </div>
        </div>
      `}
    </div>
  `}function Eh({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[i,a]=(0,d.useState)([]),[r,l]=(0,d.useState)(""),[u,c]=(0,d.useState)(""),[h,$]=(0,d.useState)(!1),v=async()=>{try{s(await e.request(t.CMD_CONTACTS_MY_INVITE));let w=await e.request(t.CMD_CONTACTS_LIST,{limit:200});a(Array.isArray(w?.contacts)?w.contacts:[])}catch(w){c(w.message)}};(0,d.useEffect)(()=>{v()},[]);let N=async()=>{try{await navigator.clipboard.writeText(n.url),$(!0),setTimeout(()=>$(!1),1500)}catch{}},_=async()=>{let w=r.trim();if(w){c("");try{let y=(await e.request(t.CMD_CONTACTS_ADD_INVITE,{url:w}))?.contact||{};l(""),c(`Added ${y.displayName||(y.pubkey?y.pubkey.slice(0,12)+"\u2026":"contact")}${y.bindingKey?" \u2014 searchable":""}`),v()}catch(E){c(`Couldn't add: ${E.message}`)}}};return o`
    <details className="trusted-peers">
      <summary>Trusted peers for federated search (${i.length})</summary>
      <div className="tp-body">
        <p className="subtitle">Share your invite so a peer can add you; paste theirs to search their content. Peer results are cryptographically verified before they're shown.</p>
        ${n&&o`
          <div className="tp-field">
            <label>Your invite</label>
            <div className="tp-row">
              <input className="profile-input" readOnly value=${n.url} onClick=${w=>w.target.select()} />
              <button className="btn small" onClick=${N}>${h?"Copied":"Copy"}</button>
            </div>
          </div>`}
        <div className="tp-field">
          <label>Add a peer</label>
          <div className="tp-row">
            <input className="profile-input" placeholder="Paste a p2p-contact://invite…" value=${r}
                   onInput=${w=>l(w.target.value)} onKeyDown=${w=>w.key==="Enter"&&_()} />
            <button className="btn small primary" onClick=${_} disabled=${!r.trim()}>Add</button>
          </div>
        </div>
        ${u&&o`<div className="tp-msg">${u}</div>`}
        ${i.length>0&&o`
          <ul className="tp-list">
            ${i.map(w=>o`
              <li key=${w.pubkey}>
                <span className="tp-name">${w.displayName||w.pubkey.slice(0,16)+"\u2026"}</span>
                ${w.verifiedAt?o`<span className="src-badge followed">verified</span>`:o`<span className="src-badge other">unverified</span>`}
                ${w.bindingKey?o`<span className="src-badge self">searchable</span>`:""}
              </li>`)}
          </ul>`}
      </div>
    </details>`}function Fm({meta:e}){let t=e&&(e.provenance||e);return t?o`<span className="search-provenance">
    ${t.digestHit?o`<span className="src-badge self">digest hit</span>`:""}
    ${t.fallbackPull?o`<span className="src-badge other">fallback pull</span>`:""}
    ${t.partial?o`<span className="src-badge other">partial</span>`:""}
    ${e.verifyBudgetExhausted?o`<span className="src-badge other">verify budget</span>`:""}
  </span>`:null}function Ch({rpc:e,C:t,onBrowse:n}){let[s,i]=(0,d.useState)([]),[a,r]=(0,d.useState)([]),[l,u]=(0,d.useState)(!1),[c,h]=(0,d.useState)(!1),[$,v]=(0,d.useState)(""),[N,_]=(0,d.useState)(""),[w,E]=(0,d.useState)(null),[y,f]=(0,d.useState)(0),[p,k]=(0,d.useState)(!1),[b,x]=(0,d.useState)(!1),[g,S]=(0,d.useState)(!1),[R,D]=(0,d.useState)(null),H=(0,d.useRef)(0),W=async()=>{let P=N.trim();if(!P){E(null),S(!1),D(null);return}k(!0),S(!1),D(null);try{let ne=await e.request(t.CMD_SEARCH,{query:P,limit:50,federated:b});H.current=ne?.queryId||0,E(Array.isArray(ne?.results)?ne.results:[]),f(ne?.stats?.docs||0),ne?.federating&&S(!0)}catch(ne){v(`search: ${ne.message}`)}finally{k(!1)}},G=P=>P&&P.link?P.link:P&&/^(?:pear|file|hyper):\/\//i.test(P.driveKey||"")?P.driveKey:`hyper://${P.driveKey}${P.path&&P.path!=="/"?P.path:"/"}`,F=P=>!P.tier||P.tier==="self"?o`<span className="src-badge self">you</span>`:P.tier==="followed"?o`<span className="src-badge followed">trusted · hop ${P.trustHop??1}</span>`:o`<span className="src-badge other">${P.tier}</span>`;(0,d.useEffect)(()=>{let P=ne=>{let ue=ne&&ne.detail||{};ue.queryId===H.current&&(Array.isArray(ue.results)&&E(ue.results),D(ue),S(!1))};return e.addEventListener(`event:${t.EVT_SEARCH_FEDERATED}`,P),()=>e.removeEventListener(`event:${t.EVT_SEARCH_FEDERATED}`,P)},[]);let B=async()=>{try{let P=await e.request(t.CMD_USERDATA_LIST_BOOKMARKS);i(Array.isArray(P)?P:P?.bookmarks??[]);let ne=await e.request(t.CMD_USERDATA_LIST_HISTORY,{limit:200});r(Array.isArray(ne)?ne:ne?.history??[]),typeof ne?.historyEnabled=="boolean"&&u(ne.historyEnabled);let ue=Rt(await e.request(t.CMD_USERDATA_GET_SETTINGS).catch(()=>null));ue&&(u(ue.historyEnabled===!0),h(ue.searchIndexEnabled===!0))}catch(P){v(P.message)}};(0,d.useEffect)(()=>{B();let P=setInterval(B,5e3);return()=>clearInterval(P)},[]);let A=async P=>{try{await e.request(t.CMD_USERDATA_REMOVE_BOOKMARK,{url:P}),B()}catch(ne){v(ne.message)}},J=async()=>{if(confirm("Clear all browsing history?"))try{await e.request(t.CMD_USERDATA_CLEAR_HISTORY),B()}catch(P){v(P.message)}};return o`
    <div className="library">
      <h1>Library</h1>
      <p className="subtitle">Bookmarks you choose to save, and optional history — all local on this device. No browse data is uploaded.</p>
      ${$&&o`<div className="apps-error">${$}</div>`}

      <h2>Search your P2P content</h2>
      <p className="subtitle">${c?o`Full-text search over pages you've opened, fully local — no query ever leaves your device.${y?` ${y} page(s) indexed.`:""}`:o`Local page indexing is OFF (privacy default). Enable it in Settings → Clearnet & privacy if you want Library search to learn from pages you open.`}</p>
      <div className="urlbar" style=${{marginBottom:"12px"}}>
        <input
          type="text"
          className="url-input"
          placeholder="Search pages you've visited…"
          value=${N}
          onInput=${P=>_(P.target.value)}
          onKeyDown=${P=>P.key==="Enter"&&W()}
        />
        <button className="btn primary" onClick=${W} disabled=${p||!N.trim()}>${p?"Searching\u2026":"Search"}</button>
      </div>
      <label className="search-fed-toggle">
        <input type="checkbox" checked=${b} onChange=${P=>x(P.target.checked)} />
        Include trusted peers${g?o` <span className="fed-status">· searching peers…</span>`:""}
        <${Fm} meta=${R} />
      </label>
      <${Eh} rpc=${e} C=${t} />
      ${w!==null&&(w.length===0?o`<p className="placeholder">No matches${y===0?" yet \u2014 browse some hyper:// pages first to build your index.":"."}</p>`:o`<div className="library-list">
            ${w.map(P=>o`
              <div className="library-row" key=${P.docId||P.driveKey+P.path}>
                <div className="library-row-main">
                  <div className="library-title">${P.title||G(P)}${b?F(P):""}</div>
                  <div className="library-url">${G(P)}</div>
                </div>
                <button className="btn small" onClick=${()=>n(G(P))}>Open</button>
              </div>
            `)}
          </div>`)}

      <h2>Bookmarks (${s.length})</h2>
      ${s.length===0?o`<p className="placeholder">No bookmarks yet. Use the star button in Browse, or open About this site and choose Bookmark this site.</p>`:o`<div className="library-list">
            ${s.map(P=>o`
              <div className="library-row" key=${P.url}>
                <div className="library-row-main">
                  <div className="library-title">${P.title||P.url}</div>
                  <div className="library-url">${P.url}</div>
                </div>
                <button className="btn small" onClick=${()=>n(P.url)}>Open</button>
                <button className="btn small subtle" onClick=${()=>A(P.url)}>Remove</button>
              </div>
            `)}
          </div>`}

      <div className="library-history-head">
        <h2>History ${l?`(${a.length})`:"(off)"}</h2>
        ${l&&a.length>0&&o`<button className="btn small subtle" onClick=${J}>Clear history</button>`}
      </div>
      ${l?a.length===0?o`<p className="placeholder">No browsing history yet.</p>`:o`<div className="library-list">
              ${a.slice(0,100).map((P,ne)=>o`
                <div className="library-row" key=${(P.url||"")+":"+ne}>
                  <div className="library-row-main">
                    <div className="library-title">${P.title||P.url}</div>
                    <div className="library-url">${P.url} ${P.visitedAt?"\xB7 "+new Date(P.visitedAt).toLocaleString():""}</div>
                  </div>
                  <button className="btn small" onClick=${()=>n(P.url)}>Open</button>
                </div>
              `)}
            </div>`:o`<p className="placeholder" data-testid="history-disabled-note">Browsing history is OFF by default. Nothing is recorded. Turn it on in Settings → Clearnet &amp; privacy if you want a local visit log on this device only.</p>`}
    </div>
  `}var mc=[{key:"displayName",label:"Display name",placeholder:"How apps will refer to you"},{key:"bio",label:"Bio",placeholder:"A short bio (optional)",textarea:!0},{key:"avatar",label:"Avatar URL",placeholder:"https://\u2026 or hyper://\u2026 (optional)"},{key:"website",label:"Website",placeholder:"https://your.site (optional)"},{key:"email",label:"Email",placeholder:"name@example.com (optional)"}];function Th(e){let t={...e||{}};return!t.displayName&&t.name&&(t.displayName=t.name),t}function Ah(e){let t=e?.driveKey||e?.driveKeyHex||"";return{...e||{},driveKey:t,driveKeyHex:t}}function xh(e){return Hm[e]||{label:e,detail:e}}function Rm(e){return(Array.isArray(e)?e:[]).map(t=>xh(t).label)}function Im(e){let t=new Set(Array.isArray(e)?e:[]);if(t.has("profile:read"))return["Display name","Avatar","Bio","Email","Website","Pronouns","Location"];let n=[];return t.has("profile:name")&&n.push("Display name"),t.has("profile:avatar")&&n.push("Avatar"),t.has("profile:email")&&n.push("Email"),t.has("profile:website")&&n.push("Website"),t.has("profile:contact")&&(n.includes("Email")||n.push("Email"),n.includes("Website")||n.push("Website")),n}function Dh({rpc:e,C:t}){let[n,s]=(0,d.useState)({}),[i,a]=(0,d.useState)({}),[r,l]=(0,d.useState)(null),[u,c]=(0,d.useState)(""),[h,$]=(0,d.useState)(""),v=async()=>{c("");try{let E=await e.request(t.CMD_PROFILE_GET),y=Th(E?.profile||{});s(y),a(y)}catch(E){c(`profile: ${E.message}`)}};(0,d.useEffect)(()=>{v()},[]);let N=mc.some(({key:E})=>(i[E]||"")!==(n[E]||"")),_=async()=>{c(""),$(""),l("save");try{let E={};for(let{key:p}of mc){let k=(i[p]||"").trim();k!==(n[p]||"")&&(E[p]=k)}let f=(await e.request(t.CMD_PROFILE_UPDATE,{updates:E}))?.profile||E;s(f),a(f),$("Saved."),setTimeout(()=>$(""),1500)}catch(E){c(`save: ${E.message}`)}finally{l(null)}},w=async()=>{if(confirm("Clear ALL profile fields? Apps that already have grants will see empty values from now on.")){c(""),l("clear");try{await e.request(t.CMD_PROFILE_CLEAR),s({}),a({}),$("Profile cleared."),setTimeout(()=>$(""),1500)}catch(E){c(`clear: ${E.message}`)}finally{l(null)}}};return o`
    <div className="settings-card">
      ${u&&o`<div className="apps-error">${u}</div>`}
      ${h&&o`<div className="apps-ok">${h}</div>`}
      ${mc.map(({key:E,label:y,placeholder:f,textarea:p})=>o`
        <div className="settings-row" key=${E}>
          <div className="profile-field">
            <div className="settings-label">${y}</div>
            ${p?o`<textarea
                  className="profile-input"
                  rows="2"
                  placeholder=${f}
                  value=${i[E]||""}
                  onInput=${k=>a({...i,[E]:k.target.value})}
                ></textarea>`:o`<input
                  type="text"
                  className="profile-input"
                  placeholder=${f}
                  value=${i[E]||""}
                  onInput=${k=>a({...i,[E]:k.target.value})}
                />`}
          </div>
        </div>
      `)}
      <div className="settings-row settings-row-actions">
        <button className="btn subtle" onClick=${w} disabled=${r!==null}>
          ${r==="clear"?"Clearing\u2026":"Clear all"}
        </button>
        <button className="btn primary" onClick=${_} disabled=${!N||r!==null}>
          ${r==="save"?"Saving\u2026":"Save profile"}
        </button>
      </div>
    </div>
  `}function Rh({rpc:e,C:t}){let[n,s]=(0,d.useState)([]),[i,a]=(0,d.useState)([]),[r,l]=(0,d.useState)([]),[u,c]=(0,d.useState)(null),[h,$]=(0,d.useState)(""),[v,N]=(0,d.useState)(!1),_=async()=>{$("");try{let[g,S,R]=await Promise.all([e.request(t.CMD_LOGIN_LIST_GRANTS).catch(D=>({error:D})),e.request(t.CMD_SWARM_LIST_GRANTS).catch(()=>({grants:[]})),e.request(t.CMD_CONTACTS_LIST,{limit:1e3}).catch(()=>({contacts:[]}))]);if(g?.error)throw g.error;s((Array.isArray(g?.grants)?g.grants:[]).map(Ah).filter(D=>D.driveKey)),a(Array.isArray(S?.grants)?S.grants.filter(D=>D?.driveKey):[]),l(Array.isArray(R?.contacts)?R.contacts:[])}catch(g){$(`permissions: ${g.message}`)}finally{N(!0)}};(0,d.useEffect)(()=>{_()},[]);let w=(0,d.useMemo)(()=>{let g=new Map,S=R=>(g.has(R)||g.set(R,{driveKey:R,appName:null,login:null,swarm:[]}),g.get(R));for(let R of n){let D=S(R.driveKey);D.login=R,D.appName=R.appName||D.appName}for(let R of i){let D=S(R.driveKey);D.swarm.push(R),D.appName=D.appName||R.appName}return[...g.values()].sort((R,D)=>{let H=Math.max(R.login?.grantedAt||0,...R.swarm.map(G=>G.grantedAt||0));return Math.max(D.login?.grantedAt||0,...D.swarm.map(G=>G.grantedAt||0))-H})},[n,i]),E=n.filter(g=>(g.scopes||[]).includes("contacts:read")),y=n.filter(g=>Im(g.scopes).length>0),f=async g=>{let S=g.appName||ge(g.driveKey);if(confirm(`Revoke sign-in for ${S}? It will need to ask again next time.`)){$(""),c(`login:${g.driveKey}`);try{await e.request(t.CMD_LOGIN_REVOKE_GRANT,{driveKeyHex:g.driveKey}),await _()}catch(R){$(`revoke sign-in: ${R.message}`)}finally{c(null)}}},p=async g=>{let S=g.appName||ge(g.driveKey);if(confirm(`Revoke ${S}'s access to topic ${ge(g.topicHex)}?`)){$(""),c(`swarm:${g.driveKey}:${g.topicHex}`);try{await e.request(t.CMD_SWARM_REVOKE_GRANT,{driveKey:g.driveKey,topicHex:g.topicHex}),await _()}catch(R){$(`revoke topic: ${R.message}`)}finally{c(null)}}},k=async g=>{if(!g.swarm.length)return;let S=g.appName||ge(g.driveKey);if(confirm(`Revoke all ${g.swarm.length} swarm topic grant(s) for ${S}?`)){$(""),c(`swarm-all:${g.driveKey}`);try{await e.request(t.CMD_SWARM_REVOKE_ALL_FOR_APP,{driveKey:g.driveKey}),await _()}catch(R){$(`revoke topics: ${R.message}`)}finally{c(null)}}},b=async g=>{let S=g.appName||ge(g.driveKey);if(confirm(`Revoke every stored permission for ${S}?`)){$(""),c(`app:${g.driveKey}`);try{g.login&&await e.request(t.CMD_LOGIN_REVOKE_GRANT,{driveKeyHex:g.driveKey}),g.swarm.length&&await e.request(t.CMD_SWARM_REVOKE_ALL_FOR_APP,{driveKey:g.driveKey}),await _()}catch(R){$(`revoke app: ${R.message}`)}finally{c(null)}}},x=async()=>{if(n.length&&confirm(`Revoke all ${n.length} sign-in grant(s)?`)){$(""),c("login-all");try{await e.request(t.CMD_LOGIN_REVOKE_ALL),await _()}catch(g){$(`revoke all sign-ins: ${g.message}`)}finally{c(null)}}};return o`
    <div className="settings-card permission-center">
      ${h&&o`<div className="apps-error">${h}</div>`}

      <div className="permission-summary">
        <div className="permission-stat">
          <div className="permission-stat-value">${n.length}</div>
          <div className="permission-stat-label">sign-in grants</div>
        </div>
        <div className="permission-stat">
          <div className="permission-stat-value">${y.length}</div>
          <div className="permission-stat-label">profile readers</div>
        </div>
        <div className="permission-stat">
          <div className="permission-stat-value">${E.length}</div>
          <div className="permission-stat-label">contact readers</div>
        </div>
        <div className="permission-stat">
          <div className="permission-stat-value">${i.length}</div>
          <div className="permission-stat-label">swarm topics</div>
        </div>
      </div>

      <div className="settings-subsection-label">Apps and sites</div>
      ${v?w.length===0?o`<div className="settings-subtle">No stored app permissions yet.</div>`:w.map(g=>{let S=Im(g.login?.scopes||[]),R=(g.login?.scopes||[]).includes("contacts:read");return o`
                <div className="permission-app" key=${g.driveKey}>
                  <div className="permission-app-head">
                    <div>
                      <div className="settings-label">${g.appName||ge(g.driveKey)}</div>
                      <code className="settings-code">${ge(g.driveKey)}</code>
                    </div>
                    <button className="btn subtle danger" onClick=${()=>b(g)}
                            disabled=${u===`app:${g.driveKey}`}>
                      ${u===`app:${g.driveKey}`?"Revoking\u2026":"Revoke app"}
                    </button>
                  </div>

                  <div className="permission-cap-grid">
                    <div className="permission-cap">
                      <div className="permission-cap-label">Sign-in</div>
	                      ${g.login?o`<div className="permission-cap-body">
	                          <div className="permission-chip-row">
	                            ${(Rm(g.login.scopes).length?Rm(g.login.scopes):["sign-in only"]).map(D=>o`
	                              <span className="permission-chip" key=${D}>${D}</span>
	                            `)}
	                          </div>
                          <div className="settings-subtle">
                            Granted ${new Date(g.login.grantedAt).toLocaleDateString()}
                            ${g.login.expiresAt?o` · expires ${new Date(g.login.expiresAt).toLocaleDateString()}`:""}
	                          </div>
	                          <button className="btn subtle danger small" onClick=${()=>f(g.login)}
	                                  disabled=${u===`login:${g.driveKey}`}>Revoke sign-in</button>
	                        </div>`:o`<div className="settings-subtle">No sign-in grant.</div>`}
                    </div>

                    <div className="permission-cap">
                      <div className="permission-cap-label">Profile fields</div>
                      ${S.length?o`<div className="permission-chip-row">
                            ${S.map(D=>o`<span className="permission-chip" key=${D}>${D}</span>`)}
                          </div>`:o`<div className="settings-subtle">No profile fields shared.</div>`}
                    </div>

                    <div className="permission-cap">
                      <div className="permission-cap-label">Contacts</div>
	                      ${R?o`<div className="permission-cap-body">
	                          <div className="permission-chip-row"><span className="permission-chip warn">contacts:read</span></div>
	                          <div className="settings-subtle">${r.length} saved contact${r.length===1?"":"s"} visible through this scope.</div>
	                        </div>`:o`<div className="settings-subtle">No contact access.</div>`}
                    </div>

                    <div className="permission-cap">
                      <div className="permission-cap-label">Swarm topics</div>
	                      ${g.swarm.length?o`<div className="permission-cap-body">
	                          <div className="settings-subtle">${g.swarm.length} persisted topic${g.swarm.length===1?"":"s"}.</div>
	                          ${g.swarm.map(D=>o`
	                            <div className="permission-topic" key=${D.topicHex}>
	                              <div>
	                                <code className="settings-code">${D.protocol||"pear.swarm.v1"} · ${ge(D.topicHex)}</code>
                                <div className="settings-subtle">
                                  Granted ${new Date(D.grantedAt).toLocaleDateString()}
                                  ${D.lastUsedAt&&D.lastUsedAt!==D.grantedAt?o` · last used ${new Date(D.lastUsedAt).toLocaleDateString()}`:""}
                                </div>
                              </div>
                              <button className="btn subtle danger small" onClick=${()=>p(D)}
                                      disabled=${u===`swarm:${D.driveKey}:${D.topicHex}`}>Revoke</button>
                            </div>
	                          `)}
	                          <button className="btn subtle danger small" onClick=${()=>k(g)}
	                                  disabled=${u===`swarm-all:${g.driveKey}`}>Revoke all topics</button>
	                        </div>`:o`<div className="settings-subtle">No arbitrary topic grants.</div>`}
                    </div>
                  </div>
                </div>
              `}):o`<div className="settings-subtle">Loading…</div>`}

      ${n.length>0&&o`
        <div className="settings-row settings-row-actions">
          <button className="btn subtle danger" onClick=${x} disabled=${u==="login-all"}>
            ${u==="login-all"?"Revoking\u2026":"Revoke all sign-ins"}
          </button>
        </div>
      `}
    </div>
  `}function Ih(e){return Array.isArray(e?.supported_transports)?e.supported_transports:Array.isArray(e?.transports)?e.transports:[]}function Lh({rpc:e,C:t}){let[n,s]=(0,d.useState)({relays:[],enabled:!0}),[i,a]=(0,d.useState)(""),[r,l]=(0,d.useState)(null),[u,c]=(0,d.useState)(""),[h,$]=(0,d.useState)(!1),[v,N]=(0,d.useState)({}),_=async()=>{c("");try{let p=await e.request(t.CMD_GET_RELAYS);s({relays:Array.isArray(p?.relays)?p.relays:[],enabled:p?.enabled!==!1})}catch(p){c(`relays: ${p.message}`)}finally{$(!0)}};(0,d.useEffect)(()=>{_()},[]),(0,d.useEffect)(()=>{if(!n.relays.length)return;let p=!1,k={};for(let b of n.relays)k[b]=v[b]||null;return N(k),n.relays.forEach(async b=>{try{if(p)return;let x=await e.request(t.CMD_CHECK_RELAY_CAPABILITY,{url:b},1e4);if(p)return;N(g=>({...g,[b]:x}))}catch(x){if(p)return;N(g=>({...g,[b]:{ok:!1,error:x.message||"unreachable"}}))}}),()=>{p=!0}},[n.relays.join("|")]);let w=async p=>{c(""),l("save");try{let k=await e.request(t.CMD_SET_RELAYS,{relays:p});s({relays:Array.isArray(k?.relays)?k.relays:p,enabled:k?.enabled!==!1})}catch(k){c(`set: ${k.message}`)}finally{l(null)}},E=async p=>{c(""),l("toggle");try{await e.request(t.CMD_SET_RELAY_ENABLED,{enabled:p}),s(k=>({...k,enabled:p}))}catch(k){c(`toggle: ${k.message}`)}finally{l(null)}},y=async()=>{let p=i.trim().replace(/\/$/,"");if(p){if(!/^https?:\/\//.test(p)){c("Relay URLs must start with http:// or https://");return}if(n.relays.includes(p)){c("Already in the list.");return}a(""),await w([...n.relays,p])}},f=async p=>{n.relays.length<=1&&!confirm("Removing your last relay will switch to pure-P2P mode (slower first paint). Continue?")||await w(n.relays.filter(k=>k!==p))};return o`
    <div className="settings-card">
      ${u&&o`<div className="apps-error">${u}</div>`}
      <div className="settings-row">
        <div>
          <div className="settings-label">${n.enabled?"Hybrid fetch":"Pure P2P mode"}</div>
          <div className="settings-subtle">${n.enabled?"Try a relay first (1-2s first paint), fall back to P2P. Recommended for most users.":"P2P only \u2014 slower first paint, no relay dependency. Toggle this on to use relays."}</div>
        </div>
        <button className="btn subtle" onClick=${()=>E(!n.enabled)} disabled=${r==="toggle"}>
          ${n.enabled?"Disable":"Enable"}
        </button>
      </div>
      ${h&&n.relays.length===0&&o`
        <div className="settings-subtle">No relays configured.</div>
      `}
      ${n.relays.map((p,k)=>{let b=v[p];return o`
        <div className="settings-row relay-row" key=${p}>
          <div className="relay-info">
            <div className="relay-url-line">
              <code className="settings-code">${p}</code>
              ${k===0?o`<span className="settings-pill">primary</span>`:""}
            </div>
            ${b==null?o`<div className="relay-caps relay-caps-loading">probing capability advertisement…</div>`:b.ok?o`<div className="relay-caps">
                    <span className="relay-cap-label">v${b.doc?.version||"?"}</span>
                    ${b.doc?.region?o`<span className="relay-cap-label">${b.doc.region}</span>`:""}
                    ${Ih(b.doc).map(x=>o`
                      <span className=${"relay-cap-pill"+(x==="dht-relay-ws"?" relay-cap-pill-new":"")} key=${x}>${x}</span>
                    `)}
                  </div>`:o`<div className="relay-caps relay-caps-err">capability check failed: ${b.error}</div>`}
          </div>
          ${n.relays.length>1?o`
            <button className="btn subtle" onClick=${()=>f(p)} disabled=${r==="save"}>
              Remove
            </button>
          `:""}
        </div>
      `})}
      <div className="settings-row">
        <input
          type="text"
          className="profile-input"
          placeholder="https://relay.example.com"
          value=${i}
          onInput=${p=>a(p.target.value)}
          onKeyDown=${p=>p.key==="Enter"&&y()}
          spellCheck="false"
        />
        <button className="btn primary" onClick=${y} disabled=${!i.trim()||r==="save"}>
          Add
        </button>
      </div>
    </div>
  `}function Ph({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[i,a]=(0,d.useState)(null),[r,l]=(0,d.useState)(""),[u,c]=(0,d.useState)(!1),h=async()=>{try{s(await e.request(t.CMD_NOSTR_GET_IDENTITY)),l("")}catch(b){l(b.message)}};(0,d.useEffect)(()=>{h()},[]);let $=async()=>{if(n?.npub)try{await navigator.clipboard.writeText(n.npub),c(!0),setTimeout(()=>c(!1),1500)}catch{}},v=async(b,x)=>{a(x),l("");try{s(await e.request(b))}catch(g){l(g.message)}finally{a(null)}},N=n?.npub||"",_=N?N.slice(0,14)+"\u2026"+N.slice(-6):"\u2014",w=n?.status||(n?.linked?"linked":"unverified"),E=w==="linked",y=n?.epoch||0,f=w==="linked"?"self":w==="revoked"?"other danger":"other",p=w==="linked"?`linked (attested) \xB7 epoch ${y}`:w==="revoked"?`revoked \xB7 epoch ${y}`:w==="stale"?`stale \xB7 epoch ${y}`:"not linked",k=w==="linked"?"Your pear root and this Nostr key are mutually signed.":w==="revoked"?"The last attestation was revoked and is no longer trusted.":w==="stale"?"The stored attestation points at an older Nostr key.":"Mint a mutual attestation binding your pear root \u2194 Nostr key.";return o`
    <div className="settings-card">
      <div className="settings-row">
        <div>
          <div className="settings-label">Your Nostr key</div>
          <div className="settings-subtle">${n?_:"Loading\u2026"}</div>
        </div>
        <button className="btn small" onClick=${$} disabled=${!N}>${u?"Copied":"Copy npub"}</button>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Link status</div>
          <div className="settings-subtle">
            <span className=${`src-badge ${f}`}>${p}</span> ${k}
          </div>
        </div>
        ${E?o`<button className="btn subtle danger" onClick=${()=>v(t.CMD_NOSTR_REVOKE,"revoke")} disabled=${i!=null}>${i==="revoke"?"Revoking\u2026":"Revoke"}</button>`:o`<button className="btn primary" onClick=${()=>v(t.CMD_NOSTR_BIND,"bind")} disabled=${i!=null}>${i==="bind"?"Linking\u2026":"Link (attest)"}</button>`}
      </div>
      ${r&&o`<div className="tp-msg">${r}</div>`}
    </div>
  `}function Mh({rpc:e,C:t}){let[n,s]=(0,d.useState)([]),[i,a]=(0,d.useState)(""),[r,l]=(0,d.useState)(!1),[u,c]=(0,d.useState)(""),[h,$]=(0,d.useState)(!1),[v,N]=(0,d.useState)(null),_=64*1024,w=async()=>{try{let k=await e.request(t.CMD_NOSTR_QUERY,{filter:{kinds:[1],limit:50},federated:h});s(Array.isArray(k?.events)?k.events:[]),N(k?.hidden||null),c("")}catch(k){c(k.message)}};(0,d.useEffect)(()=>{w()},[h]);let E=async()=>{let k=i.trim();if(k){l(!0),c("");try{await e.request(t.CMD_NOSTR_PUBLISH,{kind:1,content:k}),a(""),await w()}catch(b){c(b.message)}finally{l(!1)}}},y=k=>{let b=Date.now()/1e3-k;return b<60?"just now":b<3600?Math.floor(b/60)+"m":b<86400?Math.floor(b/3600)+"h":Math.floor(b/86400)+"d"},f=v?(v.quarantined||0)+(v.dropped||0)+(v.futureDated||0)+(v.bindingMissing||0)+(v.bindingUntrusted||0)+(v.contactFailures||0):0,p=v?.byReason?Object.entries(v.byReason).filter(([,k])=>k>0).map(([k,b])=>`${k}: ${b}`).join(" \xB7 "):"";return o`
    <div className="settings-card">
      <div className="tp-field">
        <label>Post a note</label>
        <textarea className="profile-input" rows="2" maxLength=${_} placeholder="What's happening?" value=${i}
                  onInput=${k=>a(k.target.value)}></textarea>
        <button className="btn small primary" onClick=${E} disabled=${r||!i.trim()}>${r?"Posting\u2026":"Post"}</button>
      </div>
      ${u&&o`<div className="tp-msg">${u}</div>`}
      <div className="settings-row">
        <label className="login-scope${h?" on":""}">
          <input type="checkbox" checked=${h} onChange=${()=>$(k=>!k)} />
          Include trusted contacts' notes
        </label>
      </div>
      ${h&&f>0&&o`
        <div className="settings-subtle">
          Hidden contact activity: ${f}${p?` \xB7 ${p}`:""}
        </div>
      `}
      <div className="nostr-feed">
        ${n.length===0?o`<div className="settings-subtle">No notes yet — post one above. Each is signed with your Nostr key and stored in your local event log.</div>`:n.map(k=>o`
            <div className="nostr-note" key=${k.id}>
              <div className="nostr-note-content">${k.content}</div>
              <div className="settings-subtle">
                ${k._via?o`<span className="src-badge followed">from ${k._via}</span>`:o`<span className="src-badge self">you</span>`}
                kind ${k.kind} · ${y(k.created_at)}
              </div>
            </div>`)}
      </div>
    </div>
  `}function Oh({rpc:e,C:t}){let[n,s]=(0,d.useState)([]),[i,a]=(0,d.useState)(null),[r,l]=(0,d.useState)(""),[u,c]=(0,d.useState)(""),[h,$]=(0,d.useState)(null),[v,N]=(0,d.useState)(""),[_,w]=(0,d.useState)(""),E=async()=>{try{let b=await e.request(t.CMD_NAMEREG_STATUS);if(a(b),b.created){let x=await e.request(t.CMD_NAMEREG_LIST);s(Array.isArray(x?.names)?x.names:[])}else s([])}catch(b){N(b.message)}};(0,d.useEffect)(()=>{E()},[]);let y=async()=>{let b=r.trim(),x=Xo(u);if(!x){N("Enter a 64-hex drive key or hyper:// link.");return}let g=n.find(S=>S.normalized===b.toLowerCase()||(S.name||"").toLowerCase()===b.toLowerCase());$("submit"),N("");try{await e.request(g?t.CMD_NAMEREG_ROTATE:t.CMD_NAMEREG_CLAIM,{name:b,target:x}),l(""),c(""),await E()}catch(S){N(S.message)}finally{$(null)}},f=async(b,x)=>{$(x+b),N("");try{await e.request(b,{name:x}),await E()}catch(g){N(g.message)}finally{$(null)}},p=async b=>{try{await navigator.clipboard.writeText("pearname://"+b),w(b),setTimeout(()=>w(""),1500)}catch{}},k=Xo(u)!=null;return o`
    <div className="settings-card">
	      ${i&&!i.enabled?o`<div className="settings-subtle">Turn on “Names” in Experimental (below) to claim registry names.</div>`:o`<div className="namereg-body">
	        <div className="settings-row">
	          <div>
	            <div className="settings-label">Claim or update a name</div>
            <div className="settings-subtle">A memorable name → browsable P2P content. First claim wins; confusable look-alikes are rejected. Re-submitting a name you own updates its target.</div>
          </div>
        </div>
        <div className="tp-row">
          <input className="profile-input" placeholder="name (e.g. alice)" value=${r} onInput=${b=>l(b.target.value)} />
          <input className="profile-input" placeholder="64-hex key or hyper:// link" value=${u} onInput=${b=>c(b.target.value)} />
          <button className="btn small primary" onClick=${y} disabled=${h!=null||!r.trim()||!k}>${h==="submit"?"Saving\u2026":"Save"}</button>
        </div>
        ${n.length>0&&o`<div className="namereg-list">
          ${n.map(b=>o`
            <div className="settings-row" key=${b.normalized}>
              <div>
                <div className="settings-label">${b.name} <span className="src-badge self">pearname://${b.normalized}</span></div>
                <div className="settings-subtle" title=${b.link||b.key||b.target}>→ ${ge(b.link||b.key||b.target)} · v${b.version}</div>
              </div>
              <div>
                <button className="btn small" onClick=${()=>p(b.normalized)}>${_===b.normalized?"Copied":"Copy"}</button>
                <button className="btn small" onClick=${()=>f(t.CMD_NAMEREG_RELEASE,b.normalized)} disabled=${h!=null}>Release</button>
                <button className="btn subtle danger" onClick=${()=>f(t.CMD_NAMEREG_REVOKE,b.normalized)} disabled=${h!=null}>Revoke</button>
              </div>
            </div>`)}
	        </div>`}
	        ${i&&i.created&&n.length===0&&o`<div className="settings-subtle">No names yet — claim one above.</div>`}
	      </div>`}
      ${v&&o`<div className="tp-msg">${v}</div>`}
    </div>
  `}function Uh({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[i,a]=(0,d.useState)(null),[r,l]=(0,d.useState)(""),[u,c]=(0,d.useState)(""),[h,$]=(0,d.useState)(""),[v,N]=(0,d.useState)(""),[_,w]=(0,d.useState)(""),E=F=>{c(F),setTimeout(()=>c(""),2200)},y=(F,B)=>{if(F)try{navigator.clipboard.writeText(F),w(B),setTimeout(()=>w(""),1500)}catch{}},f=async()=>{l("");try{s(await e.request(t.CMD_SYNC_STATUS))}catch(F){l(F.message),s({enabled:!0,paired:!1})}};(0,d.useEffect)(()=>{f()},[]);let p=async()=>{a("refresh");try{await f()}finally{a(null)}},k=async()=>{l(""),a("create");try{await e.request(t.CMD_SYNC_CREATE,{},6e4),await f(),E("Sync is on \u2014 this device is the first writer.")}catch(F){l(F.message)}finally{a(null)}},b=async()=>{let F=Zo(h);if(!F){l("That is not a valid sync invite \u2014 expected sync://<64-hex>:<64-hex>.");return}l(""),a("join");try{await e.request(t.CMD_SYNC_JOIN,F,6e4),$(""),await f(),E("Paired. Copy this device\u2019s writer key below, then add it from a writer device.")}catch(B){l(B.message)}finally{a(null)}},x=async()=>{let F=(Zo(v)?.key||v).trim().toLowerCase();l(""),a("writer");try{await e.request(t.CMD_SYNC_ADD_WRITER,{writerKey:F},6e4),N(""),E("Device added \u2014 it becomes a writer once it syncs.")}catch(B){l(B.message)}finally{a(null)}},g=async()=>{l(""),a("push");try{let F=await e.request(t.CMD_SYNC_PUSH_LOCAL,{},6e4);await f(),E(`Imported ${F?.pushed??0} local bookmark(s) into the synced set.`)}catch(F){l(F.message)}finally{a(null)}},S=async F=>{l(""),a("rm:"+F);try{await e.request(t.CMD_SYNC_REMOVE_BOOKMARK,{url:F},6e4),await f()}catch(B){l(B.message)}finally{a(null)}};if(n===null)return o`<div className="settings-card"><div className="settings-subtle">Loading…</div></div>`;let R=!!n.paired,D=!!n.writable,H=mm(n.key,n.encKey),W=Array.isArray(n.bookmarks)?n.bookmarks:[],G=n.count&&Number.isFinite(n.count.bookmarks)?n.count.bookmarks:W.length;return o`
    <div className="settings-card">
      ${r&&o`<div className="apps-error">${r}</div>`}
      ${u&&o`<div className="apps-ok">${u}</div>`}

	      ${!R&&o`<div className="sync-setup">
	        <div className="settings-row">
	          <div>
	            <div className="settings-label">Set up sync on this device</div>
	            <div className="settings-subtle">Creates a private, encrypted bookmark store. This device becomes the first writer; pair your other devices to it.</div>
          </div>
          <button className="btn primary" onClick=${k} disabled=${i==="create"}>${i==="create"?"Setting up\u2026":"Set up sync"}</button>
        </div>
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">…or pair this device with another</div>
            <input className="profile-input" placeholder="sync://<key>:<encryption-key>" value=${h}
                   onInput=${F=>$(F.target.value)} onKeyDown=${F=>F.key==="Enter"&&b()} />
	          </div>
	          <button className="btn" onClick=${b} disabled=${i==="join"||!h.trim()}>${i==="join"?"Pairing\u2026":"Pair"}</button>
	        </div>
	      </div>`}

	      ${R&&o`<div className="sync-paired">
	        <div className="settings-row">
	          <div>
	            <div className="settings-label">Syncing ${D?"":o`<span className="settings-subtle">· read-only on this device</span>`}</div>
	            <div className="settings-subtle">${G} bookmark(s) in the synced set</div>
          </div>
          <div className="settings-row-actions">
            <button className="btn subtle small" onClick=${p} disabled=${i==="refresh"} title="Re-check sync status (e.g. after another device added this one as a writer)">${i==="refresh"?"Refreshing\u2026":"Refresh"}</button>
            ${D&&o`<button className="btn subtle" onClick=${g} disabled=${i==="push"}>${i==="push"?"Importing\u2026":"Import local bookmarks"}</button>`}
          </div>
        </div>

        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">Pairing invite — open this on another device to sync it</div>
            <code className="settings-code">${H||"(unavailable)"}</code>
            <div className="settings-subtle">Carries your encryption key. Anyone with it can read your synced bookmarks — treat it like a password.</div>
          </div>
          <button className="btn small" onClick=${()=>y(H,"invite")} disabled=${!H}>${_==="invite"?"Copied":"Copy"}</button>
        </div>

        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">This device’s writer key${D?"":" \u2014 give it to a writer device to be added"}</div>
            <code className="settings-code">${n.writerKey||"(unavailable)"}</code>
          </div>
          <button className="btn small" onClick=${()=>y(n.writerKey,"writer")} disabled=${!n.writerKey}>${_==="writer"?"Copied":"Copy"}</button>
        </div>

        ${D&&o`
          <div className="settings-row">
            <div className="profile-field">
              <div className="settings-label">Add another device (paste its writer key)</div>
              <input className="profile-input" placeholder="64-hex writer key" value=${v}
                     onInput=${F=>N(F.target.value)} onKeyDown=${F=>F.key==="Enter"&&x()} />
            </div>
            <button className="btn" onClick=${x} disabled=${i==="writer"||!v.trim()}>${i==="writer"?"Adding\u2026":"Add device"}</button>
          </div>
        `}

        ${!D&&o`<div className="settings-subtle">This device is read-only until a writer device adds the key above. Synced bookmarks still replicate here in the meantime.</div>`}

	        ${W.length>0&&o`<div className="sync-bookmarks">
	          <div className="settings-row"><div className="settings-label">Synced bookmarks</div></div>
	          ${W.map(F=>o`
	            <div className="settings-row" key=${F.url}>
	              <div>
                <div className="settings-label">${F.title||F.url}</div>
                <div className="settings-subtle">${F.url}</div>
              </div>
	              ${D&&o`<button className="btn small subtle" onClick=${()=>S(F.url)} disabled=${i==="rm:"+F.url}>Remove</button>`}
	            </div>
	          `)}
	        </div>`}
	      </div>`}
    </div>
  `}function Bh({rpc:e,C:t,activeDriveKey:n="",onBrowse:s}){let[i,a]=(0,d.useState)(!0),[r,l]=(0,d.useState)(null),[u,c]=(0,d.useState)([]),[h,$]=(0,d.useState)(!1),[v,N]=(0,d.useState)(""),[_,w]=(0,d.useState)(""),[E,y]=(0,d.useState)(""),[f,p]=(0,d.useState)(null),[k,b]=(0,d.useState)(null),[x,g]=(0,d.useState)({entries:[],sources:[]}),[S,R]=(0,d.useState)(""),D=typeof n=="string"&&/^[0-9a-f]{64}$/i.test(n)?n.toLowerCase():"";(0,d.useEffect)(()=>{let T=!1;e.request(t.CMD_USERDATA_GET_SETTINGS).then($e=>{if(T)return;let ee=Rt($e);a(ee?.contentShield!==!1)}).catch(()=>{});let L=()=>{let $e=D?{driveKey:D}:{};e.request(t.CMD_SHIELD_STATUS,$e).then(ee=>{T||l(ee)}).catch(()=>{}),t.CMD_PLUGIN_LIST!=null&&e.request(t.CMD_PLUGIN_LIST).then(ee=>{T||c(ee?.plugins||[])}).catch(()=>{}),t.CMD_PLUGIN_CATALOG!=null&&e.request(t.CMD_PLUGIN_CATALOG).then(ee=>{!T&&ee&&g({entries:ee.entries||[],sources:ee.sources||[]})}).catch(()=>{})};L();let ie=setInterval(L,5e3);return()=>{T=!0,clearInterval(ie)}},[e,t,D]);let H=async()=>{let T=!i;$(!0),N("");try{await e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{contentShield:T}}),a(T);let L=await e.request(t.CMD_SHIELD_STATUS,D?{driveKey:D}:{}).catch(()=>null);L&&l(L)}catch(L){N(`save: ${L.message}`)}finally{$(!1)}},W=async()=>{if(!(!D||t.CMD_SHIELD_SET_ALLOW==null)){$(!0),N("");try{let T=!(r&&r.driveAllowlisted);await e.request(t.CMD_SHIELD_SET_ALLOW,{driveKey:D,allow:T});let L=await e.request(t.CMD_SHIELD_STATUS,{driveKey:D}).catch(()=>null);L&&l(L)}catch(T){N(`allowlist: ${T.message}`)}finally{$(!1)}}},G=async()=>{if(!(!D||t.CMD_SHIELD_SET_STRICT==null)){$(!0),N("");try{let T=!(r&&r.driveStrict);await e.request(t.CMD_SHIELD_SET_STRICT,{driveKey:D,strict:T});let L=await e.request(t.CMD_SHIELD_STATUS,{driveKey:D}).catch(()=>null);L&&l(L)}catch(T){N(`strict: ${T.message}`)}finally{$(!1)}}},F=async(T,L)=>{if(t.CMD_PLUGIN_SET_ENABLED!=null){$(!0),N("");try{await e.request(t.CMD_PLUGIN_SET_ENABLED,{id:T,enabled:!L});let ie=await e.request(t.CMD_PLUGIN_LIST).catch(()=>null);ie&&c(ie.plugins||[])}catch(ie){N(`plugin: ${ie.message}`)}finally{$(!1)}}},B=async()=>{let T=await e.request(t.CMD_SHIELD_STATUS,D?{driveKey:D}:{}).catch(()=>null);T&&l(T);let L=await e.request(t.CMD_PLUGIN_LIST).catch(()=>null);if(L&&c(L.plugins||[]),t.CMD_PLUGIN_CATALOG!=null){let ie=await e.request(t.CMD_PLUGIN_CATALOG).catch(()=>null);ie&&g({entries:ie.entries||[],sources:ie.sources||[]})}},A=async()=>{let T=_.trim().toLowerCase();if(!(!/^[0-9a-f]{64}$/.test(T)||t.CMD_SHIELD_SUBSCRIBE_LIST==null)){$(!0),N("");try{await e.request(t.CMD_SHIELD_SUBSCRIBE_LIST,{driveKey:T},3e4),w(""),await B()}catch(L){N(`subscribe: ${L.message}`)}finally{$(!1)}}},J=async T=>{if(t.CMD_SHIELD_UNSUBSCRIBE_LIST!=null){$(!0),N("");try{await e.request(t.CMD_SHIELD_UNSUBSCRIBE_LIST,{driveKey:T}),await B()}catch(L){N(`unsubscribe: ${L.message}`)}finally{$(!1)}}},P=async T=>{if(t.CMD_SHIELD_REFRESH_LISTS!=null){$(!0),N("");try{await e.request(t.CMD_SHIELD_REFRESH_LISTS,T?{driveKey:T,force:!0}:{},3e4),await B()}catch(L){N(`refresh: ${L.message}`)}finally{$(!1)}}},ne=async(T,L=null)=>{let ie=String(T||"").trim().toLowerCase();if(!(!/^[0-9a-f]{64}$/.test(ie)||t.CMD_PLUGIN_INSTALL_DRIVE==null)){$(!0),N("");try{let $e={driveKey:ie};L&&($e.granted=L.requested||[],$e.reviewedFingerprint=L.fingerprint);let ee=await e.request(t.CMD_PLUGIN_INSTALL_DRIVE,$e,3e4);p(ee&&ee.consentRequired?ee:null),await B()}catch($e){N(`install: ${$e.message}`)}finally{$(!1)}}},ue=async()=>{await ne(E),y("")},O=async()=>{let T=S.trim().toLowerCase();if(!(!/^[0-9a-f]{64}$/.test(T)||t.CMD_PLUGIN_CATALOG_LOAD_DRIVE==null)){$(!0),N("");try{await e.request(t.CMD_PLUGIN_CATALOG_LOAD_DRIVE,{driveKey:T},3e4),R(""),await B()}catch(L){N(`catalog: ${L.message}`)}finally{$(!1)}}},I=async T=>{if(t.CMD_PLUGIN_CATALOG_REMOVE_SOURCE!=null){$(!0),N("");try{await e.request(t.CMD_PLUGIN_CATALOG_REMOVE_SOURCE,{driveKey:T}),await B()}catch(L){N(`catalog: ${L.message}`)}finally{$(!1)}}},Z=async(T,L=null)=>{if(t.CMD_PLUGIN_UPDATE_DRIVE!=null){$(!0),N("");try{let ie={driveKey:T};L&&(ie.granted=L.capabilities||[],ie.reviewedFingerprint=L.fingerprint);let $e=await e.request(t.CMD_PLUGIN_UPDATE_DRIVE,ie,3e4);b($e&&$e.escalated?{driveKey:T,...$e}:null),await B()}catch(ie){N(`update: ${ie.message}`)}finally{$(!1)}}},M=async T=>{if(t.CMD_PLUGIN_UNINSTALL!=null){$(!0),N("");try{await e.request(t.CMD_PLUGIN_UNINSTALL,{driveKey:T}),k?.driveKey===T&&b(null),await B()}catch(L){N(`uninstall: ${L.message}`)}finally{$(!1)}}},K=r&&(r.listDetails||r.lists)||[],V=Array.isArray(K)?K.map(T=>typeof T=="string"?T:T.name).join(", "):"";return o`
    <div className="settings-card" data-testid="content-shield-card">
      ${v&&o`<div className="apps-error">${v}</div>`}
      <div className="settings-row">
        <div>
          <div className="settings-label">Block ads and trackers</div>
          <div className="settings-subtle">Requests matching the shield's filter rules are refused inside the browser before any peer or relay is contacted, and matching page elements are hidden. Counters only — the shield never keeps a log of what you visit. Named lists hot-swap and reload offline after first acquisition.</div>
        </div>
        <label className="login-scope${i?" on":""}">
          <input type="checkbox" checked=${i} disabled=${h}
                 onChange=${H} data-testid="content-shield-toggle" />
        </label>
      </div>
      ${r&&o`
        <div className="settings-row">
          <div>
            <div className="settings-label" data-testid="content-shield-counters">${r.blocked} blocked · ${r.allowed} allowed this session</div>
            <div className="settings-subtle" data-testid="content-shield-lists">${r.blockRules} block · ${r.cosmeticRules} cosmetic · ${r.scriptletRules||0} scriptlet · lists: ${V||"none"}</div>
          </div>
        </div>
      `}
      ${D&&o`
        <div className="settings-row" data-testid="content-shield-drive-controls">
          <div>
            <div className="settings-label">This drive (${D.slice(0,12)}…)</div>
            <div className="settings-subtle">Allowlist exempts only this drive from blocking. Strict mode injects a CSP that confines third-party subresources to the page origin.</div>
          </div>
          <div className="settings-inline-actions">
            <label className="login-scope${r?.driveAllowlisted?" on":""}" title="Allowlist this drive">
              <span className="settings-subtle">Allow</span>
              <input type="checkbox" checked=${!!r?.driveAllowlisted} disabled=${h}
                     onChange=${W} data-testid="content-shield-allow-toggle" />
            </label>
            <label className="login-scope${r?.driveStrict?" on":""}" title="Strict third-party mode">
              <span className="settings-subtle">Strict</span>
              <input type="checkbox" checked=${!!r?.driveStrict} disabled=${h}
                     onChange=${G} data-testid="content-shield-strict-toggle" />
            </label>
          </div>
        </div>
      `}
      ${r&&Array.isArray(r.topRules)&&r.topRules.length>0&&o`
        <div className="settings-subtle">Top rules: ${r.topRules.slice(0,3).map(T=>`${T.rule} (${T.hits})`).join(" \xB7 ")}</div>
      `}

      <div className="settings-row" data-testid="content-shield-list-sync">
        <div style=${{width:"100%"}}>
          <div className="settings-label">Filter lists from the swarm</div>
          <div className="settings-subtle">Subscribe to a filter-list Hyperdrive by key. Rules sync peer-to-peer, hot-swap when the publisher updates, and keep working offline — no CDN, no list-fetch fingerprint.</div>
          <div className="settings-row">
            <div className="profile-field" style=${{flex:1}}>
              <input className="profile-input" placeholder="64-hex filter-list drive key" value=${_}
                     data-testid="content-shield-subscribe-input"
                     onInput=${T=>w(T.target.value)}
                     onKeyDown=${T=>T.key==="Enter"&&A()} />
            </div>
            <button className="btn" data-testid="content-shield-subscribe" onClick=${A}
                    disabled=${h||!/^[0-9a-f]{64}$/i.test(_.trim())}>Subscribe</button>
            <button className="btn subtle" onClick=${()=>P()} disabled=${h||!r?.subscriptions?.length}>Refresh all</button>
          </div>
          ${(r?.subscriptions||[]).map(T=>o`
            <div className="settings-row" key=${T.driveKey} data-testid=${"shield-list-row-"+T.driveKey}>
              <div>
                <div className="settings-label">${T.name||T.driveKey.slice(0,12)+"\u2026"}${T.version?` \xB7 v${T.version}`:""}</div>
                <div className="settings-subtle">${T.rules||0} rules · ${T.driveKey.slice(0,16)}…</div>
              </div>
              <div className="settings-inline-actions">
                <button className="btn small subtle" onClick=${()=>P(T.driveKey)} disabled=${h}>Refresh</button>
                <button className="btn small subtle danger" onClick=${()=>J(T.driveKey)} disabled=${h}>Remove</button>
              </div>
            </div>
          `)}
        </div>
      </div>

      <div className="settings-row" data-testid="plugin-catalog">
        <div style=${{width:"100%"}}>
          <div className="settings-label">Plugin catalog</div>
          <div className="settings-subtle">Curated plugins and AI add-ons you can add yourself. Installing a plugin shows its declared capabilities and records your grant; app entries open as ordinary P2P apps gated by their own manifests. Load more catalogues from a drive key below.</div>
          ${x.entries.map(T=>o`
            <div className="settings-row" key=${T.id} data-testid=${"catalog-entry-"+T.id}>
              <div>
                <div className="settings-label">${T.name}${T.source==="builtin"&&T.verified?o`<span title="Curated entry" style=${{marginLeft:"5px",color:"#3fb950",fontSize:"12px"}}>✦</span>`:""}</div>
                <div className="settings-subtle">${T.description}</div>
                <div className="settings-subtle">${T.kind==="app"?"P2P app":"plugin"}${T.capabilities?.length?` \xB7 ${T.capabilities.join(", ")}`:""}${T.source!=="builtin"?` \xB7 from ${String(T.source).slice(0,8)}\u2026`:""}</div>
              </div>
              <div className="settings-inline-actions">
                ${T.kind==="app"&&T.driveKey&&o`
                  <button className="btn small" data-testid=${"catalog-open-"+T.id}
                          onClick=${()=>s&&s(`hyper://${T.driveKey}/`)}
                          disabled=${h||!s}>Open</button>
                `}
                ${T.kind==="plugin"&&T.driveKey&&!T.installed&&o`
                  <button className="btn small" data-testid=${"catalog-install-"+T.id}
                          onClick=${()=>ne(T.driveKey)} disabled=${h}>Install</button>
                `}
                ${T.kind==="plugin"&&T.installed&&o`<span className="settings-subtle">Installed</span>`}
                ${T.kind==="plugin"&&!T.driveKey&&o`<span className="settings-subtle" title=${T.unpublished?`Publish ${T.unpublished} to enable`:""}>Publish pending</span>`}
              </div>
            </div>
          `)}
          <div className="settings-row">
            <div className="profile-field" style=${{flex:1}}>
              <input className="profile-input" placeholder="64-hex catalogue drive key" value=${S}
                     data-testid="plugin-catalog-source-input"
                     onInput=${T=>R(T.target.value)}
                     onKeyDown=${T=>T.key==="Enter"&&O()} />
            </div>
            <button className="btn subtle" data-testid="plugin-catalog-load" onClick=${O}
                    disabled=${h||!/^[0-9a-f]{64}$/i.test(S.trim())}>Load catalogue</button>
          </div>
          ${x.sources.map(T=>o`
            <div className="settings-row" key=${T.driveKey}>
              <div className="settings-subtle">${T.name} · ${T.entryCount} entries · ${T.driveKey.slice(0,16)}…</div>
              <button className="btn small subtle danger" onClick=${()=>I(T.driveKey)} disabled=${h}>Remove</button>
            </div>
          `)}
        </div>
      </div>

      <div className="settings-row" data-testid="content-shield-plugins">
        <div style=${{width:"100%"}}>
          <div className="settings-label">Pear Plugins</div>
          <div className="settings-subtle">Plugins are Hyperdrives with declared capabilities. An update that requests new capabilities is disabled automatically until you re-approve it. Kill-switch disables a plugin's filter/style/script contributions without uninstalling it.</div>
          <div className="settings-row">
            <div className="profile-field" style=${{flex:1}}>
              <input className="profile-input" placeholder="64-hex plugin drive key" value=${E}
                     data-testid="plugin-install-input"
                     onInput=${T=>y(T.target.value)}
                     onKeyDown=${T=>T.key==="Enter"&&ue()} />
            </div>
            <button className="btn" data-testid="plugin-install" onClick=${ue}
                    disabled=${h||!/^[0-9a-f]{64}$/i.test(E.trim())}>Install</button>
          </div>
          ${f&&o`
            <div className="apps-error" data-testid="plugin-install-consent">
              ${f.name} ${f.version?`v${f.version}`:""} requests:
              ${(f.requested||[]).join(", ")||"no capabilities"}.
              Review this grant before installing; catalogue labels are not trusted permissions.
              <button className="btn small" onClick=${()=>ne(f.driveKey,f)} disabled=${h}>Grant and install</button>
              <button className="btn small subtle" onClick=${()=>p(null)} disabled=${h}>Cancel</button>
            </div>
          `}
          ${k&&o`
            <div className="apps-error" data-testid="plugin-escalation">
              Update for ${k.driveKey.slice(0,12)}… requests new capabilities: ${k.added.join(", ")}.
              ${k.changedSinceReview?" The plugin changed after the previous review; inspect this new request.":""}
              <button className="btn small" onClick=${()=>Z(k.driveKey,k)} disabled=${h}>Accept and re-enable</button>
            </div>
          `}
          ${u.map(T=>o`
            <div className="settings-row" key=${T.id} data-testid=${"plugin-row-"+T.id}>
              <div>
                <div className="settings-label">${T.name||T.id}</div>
                <div className="settings-subtle">${(T.capabilities||[]).join(", ")||"no capabilities"}${T.version?` \xB7 v${T.version}`:""}</div>
              </div>
              <div className="settings-inline-actions">
                ${/^[0-9a-f]{64}$/.test(T.id)&&o`
                  <button className="btn small subtle" data-testid=${"plugin-update-"+T.id} onClick=${()=>Z(T.id)} disabled=${h}>Update</button>
                  <button className="btn small subtle danger" data-testid=${"plugin-uninstall-"+T.id} onClick=${()=>M(T.id)} disabled=${h}>Uninstall</button>
                `}
                <label className="login-scope${T.enabled?" on":""}">
                  <input type="checkbox" checked=${!!T.enabled} disabled=${h}
                         onChange=${()=>F(T.id,T.enabled)} data-testid=${"plugin-enabled-"+T.id} />
                </label>
              </div>
            </div>
          `)}
        </div>
      </div>
    </div>
  `}function Kh({rpc:e,C:t}){let[n,s]=(0,d.useState)({httpsOnly:!0,stripTrackingParams:!0,blockThirdPartyCookies:!0,fingerprintFarbling:!0,clearnetMode:"proxy",historyEnabled:!1,searchIndexEnabled:!1,telemetryEnabled:!1,contentShield:!0}),[i,a]=(0,d.useState)(null),[r,l]=(0,d.useState)(!1),[u,c]=(0,d.useState)("");(0,d.useEffect)(()=>{let v=!1;return e.request(t.CMD_USERDATA_GET_SETTINGS).then(N=>{if(v)return;let _=Rt(N)||{};s(w=>({...w,httpsOnly:_.httpsOnly!==!1,stripTrackingParams:_.stripTrackingParams!==!1,blockThirdPartyCookies:_.blockThirdPartyCookies!==!1,fingerprintFarbling:_.fingerprintFarbling!==!1,clearnetMode:_.clearnetMode==="direct"?"direct":"proxy",historyEnabled:_.historyEnabled===!0,searchIndexEnabled:_.searchIndexEnabled===!0,telemetryEnabled:!1,contentShield:_.contentShield!==!1}))}).catch(()=>{}),t.CMD_PRIVACY_STATUS!=null&&e.request(t.CMD_PRIVACY_STATUS).then(N=>{v||a(N)}).catch(()=>{}),()=>{v=!0}},[e,t]);let h=async v=>{let N={...n,...v,telemetryEnabled:!1};l(!0),c("");try{if(await e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:N}),s(N),t.CMD_PRIVACY_STATUS!=null){let _=await e.request(t.CMD_PRIVACY_STATUS).catch(()=>null);_&&a(_)}}catch(_){c(`save: ${_.message}`)}finally{l(!1)}},$=v=>{v!=="telemetryEnabled"&&h({[v]:!n[v]})};return o`
    <div className="settings-card" data-testid="privacy-clearnet-card">
      ${u&&o`<div className="apps-error">${u}</div>`}
      <div className="settings-row" data-testid="privacy-zero-collection">
        <div>
          <div className="settings-label">Zero remote data collection</div>
          <div className="settings-subtle">PearBrowser does not ship telemetry, crash beacons, usage analytics, or third-party trackers in the browser chrome. Nothing you browse is sent to a PearBrowser server — there is no PearBrowser server for that.</div>
        </div>
        <span className="settings-subtle" data-testid="privacy-telemetry-status">Telemetry: never</span>
      </div>
      ${[["historyEnabled","Save browsing history (opt-in)","OFF by default. When enabled, visited URLs are stored only on this device in your local Hyperbee. Disabling clears stored history."],["searchIndexEnabled","Index pages for local search (opt-in)","OFF by default. When enabled, text from hyper:// pages you open is indexed on-device for Library search. No query ever leaves the device."],["contentShield","Block ads and trackers","ON by default. Refuses known ad/tracker requests inside the browser before peers or the network are contacted."],["httpsOnly","HTTPS-only mode","Upgrade http:// navigations to https:// before loading."],["stripTrackingParams","Strip tracking parameters","Remove utm_*, fbclid, gclid and similar click-ids from URLs."],["blockThirdPartyCookies","Block third-party cookies (proxy)","Drop Set-Cookie from proxied clearnet responses so sites cannot share a jar with hyper tabs."],["fingerprintFarbling","Fingerprint farbling","Noise canvas/audio fingerprints on proxied pages (per-origin seed)."]].map(([v,N,_])=>o`
        <div className="settings-row" key=${v}>
          <div>
            <div className="settings-label">${N}</div>
            <div className="settings-subtle">${_}</div>
          </div>
          <label className=${"login-scope"+(n[v]?" on":"")}>
            <input type="checkbox" checked=${!!n[v]} disabled=${r}
                   onChange=${()=>$(v)} data-testid=${"privacy-"+v} />
          </label>
        </div>
      `)}
      <div className="settings-row">
        <div>
          <div className="settings-label">Clearnet mode</div>
          <div className="settings-subtle">Proxy (default): https pages load through the browser proxy so Content Shield blocks ads/trackers. Direct: load the real https URL (shields need a future session bridge).</div>
        </div>
        <div className="theme-segmented" role="group" aria-label="Clearnet mode">
          ${["proxy","direct"].map(v=>o`
            <button key=${v} type="button"
              className=${"theme-segment"+(n.clearnetMode===v?" active":"")}
              data-testid=${"clearnet-mode-"+v}
              disabled=${r}
              onClick=${()=>h({clearnetMode:v})}>
              ${v==="proxy"?"Proxy + shield":"Direct"}
            </button>
          `)}
        </div>
      </div>
      ${i&&o`
        <div className="settings-subtle" data-testid="privacy-session-status">
          Data collection: telemetry=${String(i.dataCollection?.telemetry??!1)}
          · history=${String(i.dataCollection?.history??!1)}
          · searchIndex=${String(i.dataCollection?.searchIndex??!1)}
          · shield=${i.privacy?.contentShield!==!1?"on":"off"}
          ${i.session?.proxyPort?` \xB7 proxy :${i.session.proxyPort}`:""}
        </div>
      `}
    </div>
  `}function zh({rpc:e,C:t,activeUrl:n,onOpenSettings:s}){let[i,a]=(0,d.useState)(null),r=(0,d.useMemo)(()=>{let v=String(n||"").match(/(?:hyper:\/\/|\/(?:hyper|app)\/)([0-9a-fA-F]{64})/);return v?v[1].toLowerCase():""},[n]);if((0,d.useEffect)(()=>{if(!e||!t?.CMD_SHIELD_STATUS)return;let v=!1,N=()=>{e.request(t.CMD_SHIELD_STATUS,r?{driveKey:r}:{}).then(w=>{v||a(w)}).catch(()=>{})};N();let _=setInterval(N,4e3);return()=>{v=!0,clearInterval(_)}},[e,t,r]),!i)return null;let l=i.blocked||0,u=i.enabled!==!1,c=!!(r&&i.driveAllowlisted),h=u?c?"Allowlisted":`${l}`:"Shield off",$=u?c?"This drive is allowlisted \u2014 click for shield settings":`${l} blocked this session \u2014 click for shield settings`:"Content Shield is off";return o`
    <button
      type="button"
      className=${`nav shield-chip${u?" on":""}${c?" allowlisted":""}`}
      data-testid="shield-status-chip"
      title=${$}
      onClick=${()=>s&&s()}
    >🛡 ${h}</button>
  `}function Hh({rpc:e,C:t,onAutobeeChange:n,onDeviceSyncChange:s}){let[i,a]=(0,d.useState)(!1),[r,l]=(0,d.useState)(!1),[u,c]=(0,d.useState)(!1),[h,$]=(0,d.useState)(null),[v,N]=(0,d.useState)("");(0,d.useEffect)(()=>{e.request(t.CMD_USERDATA_GET_SETTINGS).then(w=>{let E=Rt(w);a(!!E?.experimentalNaming),l(!!E?.experimentalAutobeeCatalogs),c(!!E?.experimentalDeviceSync)}).catch(()=>{})},[]);let _=async(w,E,y,f)=>{$(w),N("");try{await e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{[w]:E}}),y(E),f?.(E)}catch(p){N(`save: ${p.message}`)}finally{$(null)}};return o`
    <div className="settings-card">
      ${v&&o`<div className="apps-error">${v}</div>`}
      <div className="settings-row">
        <div>
          <div className="settings-label">Names (petnames)</div>
          <div className="settings-subtle">Type friendly names like <code>keet</code> in the address bar instead of 52-character keys. Resolves your own saved petnames plus a curated set of well-known names, fully local — a provenance chip shows how each name resolved. Experimental.</div>
        </div>
        <label className="login-scope${i?" on":""}">
          <input type="checkbox" checked=${i} disabled=${h==="experimentalNaming"}
                 onChange=${()=>_("experimentalNaming",!i,a)} />
        </label>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Collaborative catalogs (Autobee)</div>
          <div className="settings-subtle">Create app catalogs several people can co-edit, synced peer-to-peer with no server. Experimental — load or create them with <code>autobee://</code> keys in the Apps tab. Not yet pinned on relays, so a catalog is reachable only while a writer is online.</div>
        </div>
        <label className="login-scope${r?" on":""}">
          <input type="checkbox" checked=${r} disabled=${h==="experimentalAutobeeCatalogs"}
                 onChange=${()=>_("experimentalAutobeeCatalogs",!r,l,n)} />
        </label>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Device sync (encrypted bookmarks)</div>
          <div className="settings-subtle">Sync your bookmarks across your own devices, encrypted end-to-end with no server or account. Once enabled, pair devices in the <strong>Device sync</strong> section below. Experimental — your synced data is readable only on devices that hold the pairing invite.</div>
        </div>
        <label className="login-scope${u?" on":""}">
          <input type="checkbox" checked=${u} disabled=${h==="experimentalDeviceSync"}
                 onChange=${()=>_("experimentalDeviceSync",!u,c,s)} />
        </label>
      </div>
    </div>
  `}function qm(){return o`
    <span style=${{padding:"4px 8px",borderRadius:"6px",background:"#e25822",color:"#fff",fontSize:"11px",fontWeight:700,letterSpacing:"0.05em",whiteSpace:"nowrap"}}
          data-testid="wallet-testnet-badge">TESTNET · NO REAL FUNDS</span>
  `}function Fh({rpc:e,C:t,onChanged:n,onError:s,onNotice:i}){let[a,r]=(0,d.useState)(""),[l,u]=(0,d.useState)(""),[c,h]=(0,d.useState)(null),[$,v]=(0,d.useState)(!1),[N,_]=(0,d.useState)(""),[w,E]=(0,d.useState)(""),[y,f]=(0,d.useState)(""),p=Em(a),k=$?km(N):null,b=!!(k&&k.length===24),x=async()=>{if(!(!Gn(a)||a!==l||c)){s(""),h("create");try{await e.request(t.CMD_WALLET_CREATE,{passphrase:a},12e4),r(""),u(""),n(),i("Wallet created. Now back it up: open \u201CBack up\u2026\u201D below, write the 24 words down offline and keep them safe \u2014 they are the only way back if the passphrase is lost.")}catch(S){s(Dt(S))}finally{h(null)}}},g=async()=>{if(!(!b||!Gn(w)||w!==y||c)){s(""),h("import");try{await e.request(t.CMD_WALLET_IMPORT,{passphrase:w,mnemonicB64:_m(k.join(" "))},12e4),_(""),E(""),f(""),v(!1),n(),i("Wallet imported. Unlock it with your new passphrase to use it.")}catch(S){s(Dt(S))}finally{h(null)}}};return o`
    <div className="settings-row">
      <div>
        <div className="settings-label">Create wallet</div>
        <div className="settings-subtle">
          Sets up a testnet wallet on this device, encrypted with your passphrase.
          <strong> Losing the passphrase loses the wallet</strong> — right after creating, open “Back up…” below and write down the 24-word recovery phrase. There is no reset.
        </div>
      </div>
    </div>
    <div className="restore-form">
      <input className="profile-input" type="password" placeholder="Passphrase" value=${a}
             autoComplete="new-password" data-testid="wallet-create-passphrase"
             onInput=${S=>r(S.target.value)} />
      <input className="profile-input" type="password" placeholder="Confirm passphrase" value=${l}
             autoComplete="new-password" data-testid="wallet-create-confirm"
             onInput=${S=>u(S.target.value)} />
      <div className="settings-subtle" data-testid="wallet-create-strength">
        ${a?`Strength: ${p.label} \u2014 ${p.hint}`:`A passphrase of at least ${Ii} characters is required \u2014 a short sentence works well.`}
      </div>
      ${a&&!Gn(a)&&o`<div className="apps-error">Passphrase must be at least ${Ii} characters long.</div>`}
      ${l&&a!==l&&o`<div className="apps-error">Passphrases do not match.</div>`}
      <div className="restore-actions">
        <button className="btn primary" onClick=${x} disabled=${!Gn(a)||a!==l||c!==null} data-testid="wallet-create-submit">
          ${c==="create"?"Creating\u2026":"Create wallet"}
        </button>
      </div>
    </div>
    <div className="settings-row">
      <div>
        <div className="settings-label">Import from recovery phrase</div>
        <div className="settings-subtle">Restore an existing wallet from its 24-word recovery phrase and protect it with a new passphrase.</div>
      </div>
      <button className="btn subtle" onClick=${()=>{v(S=>!S),s("")}} disabled=${c==="import"} data-testid="wallet-import-toggle">
        ${$?"Cancel":"Import\u2026"}
      </button>
    </div>
    ${$&&o`
      <div className="restore-form">
        <textarea className="restore-textarea" rows="3" spellCheck="false" autoCapitalize="none"
                  placeholder="Paste your 24-word recovery phrase here, separated by spaces"
                  value=${N} data-testid="wallet-import-mnemonic"
                  onInput=${S=>_(S.target.value)}></textarea>
        ${N.trim()&&!b&&o`<div className="apps-error">Enter the full 24-word recovery phrase.</div>`}
        <input className="profile-input" type="password" placeholder="New passphrase for this device" value=${w}
               autoComplete="new-password" data-testid="wallet-import-passphrase"
               onInput=${S=>E(S.target.value)} />
        <input className="profile-input" type="password" placeholder="Confirm new passphrase" value=${y}
               autoComplete="new-password" data-testid="wallet-import-confirm"
               onInput=${S=>f(S.target.value)} />
        ${w&&!Gn(w)&&o`<div className="apps-error">Passphrase must be at least ${Ii} characters long.</div>`}
        ${y&&w!==y&&o`<div className="apps-error">Passphrases do not match.</div>`}
        <div className="restore-actions">
          <button className="btn primary" onClick=${g} disabled=${!b||!Gn(w)||w!==y||c!==null} data-testid="wallet-import-submit">
            ${c==="import"?"Importing\u2026":"Import wallet"}
          </button>
        </div>
        <div className="settings-warning">The phrase is imported on-device and never sent anywhere. Anyone with these words controls the wallet.</div>
      </div>
    `}
  `}function qh({rpc:e,C:t,onChanged:n,onError:s,onNotice:i}){let[a,r]=(0,d.useState)(""),[l,u]=(0,d.useState)(null),[c,h]=(0,d.useState)(!1),[$,v]=(0,d.useState)(""),[N,_]=(0,d.useState)(null),w=(0,d.useRef)(null);w.current=N,(0,d.useEffect)(()=>()=>{let p=w.current;p&&e.request(t.CMD_WALLET_BACKUP,{phase:"finish",ceremonyId:p.ceremonyId,outcome:"cancel"}).catch(()=>{})},[e,t]);let E=async()=>{if(!(!a||l)){s(""),u("unlock");try{await e.request(t.CMD_WALLET_UNLOCK,{passphrase:a},12e4),r(""),n()}catch(p){s(Dt(p))}finally{u(null)}}},y=async()=>{if(!(!$||l)){s(""),u("backup");try{let p=await e.request(t.CMD_WALLET_BACKUP,{phase:"begin",passphrase:$},12e4),k=Sm(p.mnemonicB64);if(!k)throw new Error("could not decode the recovery phrase");_({ceremonyId:p.ceremonyId,words:k.split(" ")}),v(""),h(!1)}catch(p){s(Dt(p))}finally{u(null)}}},f=async p=>{let k=N;if(_(null),!!k){s(""),u("backup-finish");try{await e.request(t.CMD_WALLET_BACKUP,{phase:"finish",ceremonyId:k.ceremonyId,outcome:p}),p==="complete"&&i("Backup complete. The phrase is gone from this screen \u2014 it is your only way back if the passphrase is lost.")}catch(b){s(Dt(b))}finally{u(null)}}};return N?o`
      <div className="settings-card" data-testid="wallet-backup-ceremony">
        <div className="settings-row">
          <div>
            <div className="settings-label">Your recovery phrase <${qm} /></div>
            <div className="settings-subtle">Shown once, on this device only — it never leaves the device and is cleared from the screen when you finish or cancel.</div>
          </div>
        </div>
        <div className="seed-phrase" style=${{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"6px 12px"}} data-testid="wallet-backup-words">
          ${N.words.map((p,k)=>o`<div key=${k}><span className="settings-subtle">${k+1}.</span> ${p}</div>`)}
        </div>
        <div className="settings-warning">
          Write these ${N.words.length} words down offline, in order. Anyone with them controls this wallet — never type them into a website or show them on a shared screen.
        </div>
        <div className="restore-actions">
          <button className="btn subtle" onClick=${()=>f("cancel")} disabled=${l==="backup-finish"} data-testid="wallet-backup-cancel">Cancel</button>
          <button className="btn primary" onClick=${()=>f("complete")} disabled=${l==="backup-finish"} data-testid="wallet-backup-done">
            ${l==="backup-finish"?"Finishing\u2026":"I have written it down"}
          </button>
        </div>
      </div>
    `:o`
    <div className="settings-row">
      <div>
        <div className="settings-label">Unlock wallet</div>
        <div className="settings-subtle">The wallet auto-locks after 15 minutes idle. Unlocking never exposes the keys — apps still need your per-action approval.</div>
      </div>
    </div>
    <div className="restore-form">
      <input className="profile-input" type="password" placeholder="Passphrase" value=${a}
             autoComplete="current-password" data-testid="wallet-unlock-passphrase"
             onInput=${p=>r(p.target.value)}
             onKeyDown=${p=>p.key==="Enter"&&E()} />
      <div className="restore-actions">
        <button className="btn primary" onClick=${E} disabled=${!a||l!==null} data-testid="wallet-unlock-submit">
          ${l==="unlock"?"Unlocking\u2026":"Unlock"}
        </button>
      </div>
    </div>
    <div className="settings-row">
      <div>
        <div className="settings-label">Back up recovery phrase</div>
        <div className="settings-subtle">Reveal the 24-word recovery phrase once to write it down. Requires your passphrase; the wallet stays locked.</div>
      </div>
      <button className="btn subtle" onClick=${()=>{h(p=>!p),s("")}} disabled=${l!==null} data-testid="wallet-backup-toggle">
        ${c?"Cancel":"Back up\u2026"}
      </button>
    </div>
    ${c&&o`
      <div className="restore-form">
        <input className="profile-input" type="password" placeholder="Passphrase" value=${$}
               autoComplete="current-password" data-testid="wallet-backup-passphrase"
               onInput=${p=>v(p.target.value)} />
        <div className="restore-actions">
          <button className="btn primary" onClick=${y} disabled=${!$||l!==null} data-testid="wallet-backup-begin">
            ${l==="backup"?"Verifying\u2026":"Reveal phrase"}
          </button>
        </div>
      </div>
    `}
  `}function Gh({rpc:e,C:t,status:n,onChanged:s,onError:i}){let[a,r]=(0,d.useState)(null),[l,u]=(0,d.useState)([]),[c,h]=(0,d.useState)([]),[$,v]=(0,d.useState)(null),[N,_]=(0,d.useState)(!1),w=g=>{let S=String(g?.message||g||"").toLowerCase();return S.includes("wallet-locked")||S.includes("wallet is locked")?(s(),!0):!1},E=()=>e.request(t.CMD_WALLET_BALANCES).then(r).catch(g=>{w(g)||r({unavailable:!0,code:"unavailable"})}),y=()=>e.request(t.CMD_WALLET_TRANSACTIONS,{limit:20}).then(g=>u(g?.transactions||[])).catch(g=>{w(g)}),f=()=>e.request(t.CMD_WALLET_CONNECTIONS_LIST).then(g=>h(g?.connections||[])).catch(g=>{w(g)});(0,d.useEffect)(()=>{E(),y(),f()},[e,t]);let p=()=>{if(n.address)try{navigator.clipboard.writeText(n.address),_(!0),setTimeout(()=>_(!1),1500)}catch{}},k=async()=>{i(""),v("lock");try{await e.request(t.CMD_WALLET_LOCK),s()}catch(g){i(Dt(g))}finally{v(null)}},b=async g=>{let S=g.driveKey;i(""),v(S);try{await e.request(t.CMD_WALLET_CONNECTION_REVOKE,{browserSessionId:g.browserSessionId,tabId:g.tabId,driveKey:g.driveKey}),await f()}catch(R){i(Dt(R))}finally{v(null)}},x=async()=>{v("balances");try{await E()}finally{v(null)}};return o`
    <div className="settings-row">
      <div>
        <div className="settings-label">Address</div>
        <code className="settings-code" title=${n.address||""} data-testid="wallet-address">${wr(n.address||"")}</code>
      </div>
      <button className="btn small subtle" onClick=${p} disabled=${!n.address} data-testid="wallet-address-copy">
        ${N?"Copied":"Copy"}
      </button>
    </div>
    <div className="settings-row">
      <div>
        <div className="settings-label">Balances</div>
        ${a===null&&o`<div className="settings-subtle">Loading…</div>`}
        ${a&&a.unavailable&&o`
          <div className="settings-subtle" data-testid="wallet-balances-unavailable">
            Unavailable — the testnet RPC is not reachable right now. Funds are safe; retry when online.
          </div>
        `}
        ${a&&!a.unavailable&&o`
          <div className="settings-subtle" data-testid="wallet-balances">
            ${qn(a.paymentAmountAtomic,6)} USD₮0 (test payment token)
            · ${qn(a.nativeFeeAmountAtomic,18)} native (test gas)
          </div>
        `}
      </div>
      <button className="btn small subtle" onClick=${x} disabled=${$!==null} data-testid="wallet-balances-refresh">
        ${$==="balances"?"Refreshing\u2026":"Refresh"}
      </button>
    </div>
    <div className="settings-row">
      <div style=${{width:"100%"}}>
        <div className="settings-label">Recent activity</div>
        ${l.length===0?o`<div className="settings-subtle" data-testid="wallet-activity-empty">No wallet activity yet.</div>`:o`
            <div data-testid="wallet-activity">
              ${l.map((g,S)=>o`
                <div className="settings-row" key=${g.intentId||S} style=${{paddingTop:"4px",paddingBottom:"4px"}}>
                  <div>
                    <div className="settings-label" style=${{fontSize:"13px"}}>${Cm(g)}</div>
                    <div className="settings-subtle">
                      ${g.ts?new Date(g.ts).toLocaleString():""}
                      ${g.amountAtomic?` \xB7 ${qn(g.amountAtomic,6)} USD\u20AE0 \u2192 ${wr(g.recipient||"")}`:""}
                      ${g.transactionHash?` \xB7 tx ${wr(g.transactionHash)}`:""}
                    </div>
                  </div>
                </div>
              `)}
            </div>
          `}
      </div>
    </div>
    <div className="settings-row">
      <div style=${{width:"100%"}}>
        <div className="settings-label">Connected apps</div>
        ${c.length===0?o`<div className="settings-subtle" data-testid="wallet-connections-empty">No apps connected.</div>`:o`
            <div data-testid="wallet-connections">
              ${c.map(g=>o`
                <div className="settings-row" key=${g.driveKey+":"+g.tabId} style=${{paddingTop:"4px",paddingBottom:"4px"}}>
                  <div>
                    <div className="settings-label" style=${{fontSize:"13px"}}>${g.appName||ge(g.driveKey)}</div>
                    <div className="settings-subtle">
                      ${g.appName?`${ge(g.driveKey)} \xB7 `:""}
                      ${["connect",g.permissions?.pay&&"pay",g.permissions?.signApp&&"sign"].filter(Boolean).join(" \xB7 ")}
                      ${g.connectedAt?` \xB7 since ${new Date(g.connectedAt).toLocaleDateString()}`:""}
                    </div>
                  </div>
                  <button className="btn small subtle danger" onClick=${()=>b(g)} disabled=${$!==null} data-testid=${"wallet-revoke-"+g.driveKey.slice(0,8)}>
                    ${$===g.driveKey?"Revoking\u2026":"Revoke"}
                  </button>
                </div>
              `)}
            </div>
          `}
      </div>
    </div>
    <div className="settings-row">
      <div>
        <div className="settings-label">Lock wallet</div>
        <div className="settings-subtle">Revokes every connected app and clears the keys from memory.</div>
      </div>
      <button className="btn subtle danger" onClick=${k} disabled=${$!==null} data-testid="wallet-lock">
        ${$==="lock"?"Locking\u2026":"Lock"}
      </button>
    </div>
  `}function Vh({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[i,a]=(0,d.useState)(""),[r,l]=(0,d.useState)(""),[u,c]=(0,d.useState)(!1),[h,$]=(0,d.useState)(!1),v=()=>{e.request(t.CMD_WALLET_STATUS).then(E=>{s(E),a(y=>y&&y.startsWith("status:")?"":y)}).catch(E=>{s(null),a("status: "+Dt(E))})};(0,d.useEffect)(()=>{v(),e.request(t.CMD_USERDATA_GET_SETTINGS).then(E=>c(!!Rt(E)?.experimentalWalletWdk)).catch(()=>{})},[e,t]);let N=()=>{l(""),v()},_=async()=>{a(""),$(!0);try{await e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{experimentalWalletWdk:!u}}),c(!u)}catch(E){a(Dt(E))}finally{$(!1)}},w=n?.state||"absent";return o`
    <div className="settings-card" data-testid="wallet-card">
      <div className="settings-row">
        <div>
          <div className="settings-label">Testnet wallet <${qm} /></div>
          <div className="settings-subtle">
            ${n===null&&"Wallet status unavailable."}
            ${n&&w==="absent"&&"No wallet on this device yet."}
            ${n&&w==="locked"&&"Wallet locked."}
            ${n&&w==="unlocked"&&"Wallet unlocked."}
            ${n?.networkId?` Network: ${n.networkId}.`:""}
          </div>
        </div>
        ${n===null&&o`
          <button className="btn small subtle" onClick=${v} data-testid="wallet-status-retry">Retry</button>
        `}
      </div>
      ${i&&o`<div className="apps-error">${i.replace(/^status: /,"")}</div>`}
      ${r&&o`<div className="apps-ok">${r}</div>`}
      ${n&&w==="absent"&&o`<${Fh} rpc=${e} C=${t} onChanged=${N} onError=${a} onNotice=${l} />`}
      ${n&&w==="locked"&&o`<${qh} rpc=${e} C=${t} onChanged=${N} onError=${a} onNotice=${l} />`}
      ${n&&w==="unlocked"&&o`<${Gh} rpc=${e} C=${t} status=${n} onChanged=${N} onError=${a} />`}
      <div className="settings-row">
        <div>
          <div className="settings-label">Wallet provider for apps</div>
          <div className="settings-subtle">Enables the wallet provider injection for apps that declare wallet permissions (connect / pay / app-sign). Turning this off stops new wallet connections — it does <strong>not</strong> delete your wallet or affect your recovery phrase.</div>
        </div>
        <label className="login-scope${u?" on":""}">
          <input type="checkbox" checked=${u} disabled=${h}
                 onChange=${_} data-testid="wallet-experimental-toggle" />
        </label>
      </div>
    </div>
  `}function Wh({rpc:e,C:t,status:n,storagePath:s,log:i,appearanceTheme:a,onAppearanceThemeChange:r,activeDriveKey:l="",onBrowse:u}){let[c,h]=(0,d.useState)(null),[$,v]=(0,d.useState)(null),[N,_]=(0,d.useState)(""),[w,E]=(0,d.useState)(null),[y,f]=(0,d.useState)(!1),[p,k]=(0,d.useState)(""),[b,x]=(0,d.useState)(""),[g,S]=(0,d.useState)(!1),[R,D]=(0,d.useState)(""),[H,W]=(0,d.useState)(!1),[G,F]=(0,d.useState)(""),[B,A]=(0,d.useState)(""),J=t?.CMD_GET_IDENTITY??31,P=t?.CMD_IDENTITY_EXPORT_PHRASE??70,ne=t?.CMD_IDENTITY_IMPORT_PHRASE??71,ue=t?.CMD_IDENTITY_VALIDATE_PHRASE??73,O=t?.CMD_DEVICE_LINK_CREATE_INVITE??76,I=t?.CMD_DEVICE_LINK_JOIN??77,Z=t?.CMD_CLEAR_CACHE??30,M=t?.CMD_RESET_APP??29,K=()=>e.request(J).then(h).catch(j=>_(j.message));(0,d.useEffect)(()=>{K()},[]),(0,d.useEffect)(()=>{e.request(t.CMD_USERDATA_GET_SETTINGS).then(j=>S(!!Rt(j)?.experimentalDeviceSync)).catch(()=>{})},[]);let V=async()=>{if($){v(null);return}_(""),E("reveal");try{let j=await e.request(P);v(j.mnemonic)}catch(j){_(j.message)}finally{E(null)}},T=async()=>{let j=p.trim().split(/\s+/).join(" ");if(j){_(""),x(""),E("restore-validate");try{if(!(await e.request(ue,{mnemonic:j}))?.valid){_("That phrase is not a valid 12 or 24-word BIP-39 mnemonic."),E(null);return}}catch(me){_(`validate: ${me.message}`),E(null);return}if(!confirm(`Restoring will REPLACE this device's identity.

All Hyperbees (bookmarks, history, profile, contacts) on this device stay in place but get re-keyed under the restored identity. This cannot be undone unless you also kept the previous backup phrase.

Proceed?`)){E(null);return}E("restore-apply");try{await e.request(ne,{mnemonic:j},3e4),k(""),f(!1),v(null),x("Identity restored. Your peer key has rotated \u2014 running apps may need to re-pair."),await K()}catch(me){_(`restore: ${me.message}`)}finally{E(null)}}},L=async()=>{_(""),A(""),E("link-invite");try{let j=await e.request(O,{},3e4);D(j.invite)}catch(j){_(`link: ${j.message}`)}finally{E(null)}},ie=async()=>{let j=G.trim();if(j&&confirm(`Linking will REPLACE this device's identity with the one from your other device.

This device's current identity is discarded (make sure its phrase is saved if you need it). Proceed?`)){_(""),A(""),E("link-join");try{await e.request(I,{invite:j,device:"this device"},12e4),F(""),W(!1),A("Device linked \u2014 your peer key has rotated. Restart PearBrowser for the linked identity to take effect."),await K()}catch(me){_(`link: ${me.message}`)}finally{E(null)}}},$e=async()=>{if(confirm("Clear all cached drives + proxy cache? Installed apps and your sites are NOT affected.")){_(""),E("cache");try{let j=await e.request(Z);alert(`Cleared: ${j.message||j.cleared+" items"}`)}catch(j){_(j.message)}finally{E(null)}}},ee=async()=>{if(confirm(`Reset app data?

This will:
  1. Unseed every pinned site from HiveRelay
  2. Wipe all local state (sites, apps, bookmarks, identity)
  3. PERMANENTLY DELETE the testnet wallet on this device \u2014 without its 24-word recovery phrase it is gone forever
  4. Quit the app

Back up your wallet recovery phrase (Settings \u2192 Wallet \u2192 Back up\u2026) and copy any drive keys you want to keep first!`)&&confirm("Are you ABSOLUTELY sure? This cannot be undone.")){_(""),E("reset");try{let j=await e.request(M,{},6e4);alert(`Unseeded ${j.unseeded?.length??0} site(s). App will now quit. Relaunch to start fresh.`)}catch(j){_(j.message)}finally{E(null)}}};return o`
    <div className="settings">
      <h1>Settings</h1>
      <p className="subtitle">Identity, appearance, infrastructure, and diagnostics for your peer-to-peer browser.</p>
      ${N&&o`<div className="apps-error">${N}</div>`}

      <h2>Appearance</h2>
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Browser theme</div>
            <div className="settings-subtle">Choose the chrome appearance for tabs, toolbars, settings, and dialogs.</div>
          </div>
          <div className="theme-segmented" role="group" aria-label="Browser theme">
            ${["light","dark"].map(j=>o`
              <button
                key=${j}
                type="button"
                className=${"theme-segment"+(a===j?" active":"")}
                aria-pressed=${a===j}
                onClick=${()=>r?.(j)}
              >
                ${j==="light"?"Light":"Dark"}
              </button>
            `)}
          </div>
        </div>
      </div>

      <h2>Identity</h2>
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Your peer public key</div>
            <code className="settings-code">${c?.publicKey||"(loading\u2026)"}</code>
          </div>
        </div>
      </div>

      <h2>Moving to a new device?</h2>
      <p className="subtitle">Your identity lives on this machine. To use the same identity on another computer or after a wipe, write down your backup phrase (or use <em>Link a device</em> below). Anyone with the phrase can sign in as you — store it like a password.</p>
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Backup phrase</div>
            <div className="settings-subtle">${c?.hasBackupPhrase?`${c.mnemonicWordCount}-word BIP-39 mnemonic. Reveal once to write down \u2014 never display on a shared screen.`:"not available"}</div>
          </div>
          <button className="btn" onClick=${V} disabled=${w==="reveal"||!c?.hasBackupPhrase}>
            ${$?"Hide":"Reveal phrase"}
          </button>
        </div>
        ${$&&o`
          <pre className="seed-phrase">${$}</pre>
          <div className="settings-warning">Write this down somewhere offline. Anyone with these words controls your identity — and we can't reset it for you.</div>
        `}
        <div className="settings-row">
          <div>
            <div className="settings-label">Restore from phrase</div>
            <div className="settings-subtle">Replace this device's identity with one recovered from a saved 12 or 24-word phrase. Use this on a fresh PearBrowser install to bring your existing identity over.</div>
          </div>
          <button className="btn subtle" onClick=${()=>{f(j=>!j),x(""),_("")}}
                  disabled=${w?.startsWith?.("restore")}>
            ${y?"Cancel":"Restore\u2026"}
          </button>
        </div>
        ${y&&o`
          <div className="restore-form">
            <textarea
              className="restore-textarea"
              placeholder="Paste your 12 or 24-word backup phrase here, separated by spaces"
              value=${p}
              rows="3"
              spellCheck="false"
              autoCapitalize="none"
              onInput=${j=>k(j.target.value)}
            ></textarea>
            <div className="restore-actions">
              <button className="btn primary" onClick=${T}
                      disabled=${!p.trim()||w?.startsWith?.("restore")}>
                ${w==="restore-validate"?"Checking\u2026":w==="restore-apply"?"Restoring\u2026":"Restore identity"}
              </button>
            </div>
            <div className="settings-warning">This destroys the current identity on disk. Make sure you've saved its phrase first.</div>
          </div>
        `}
        ${b&&o`<div className="apps-ok">${b}</div>`}
      </div>

      <h2>Link a device</h2>
      <p className="subtitle">Move this identity to another device without typing your phrase. Devices pair directly over the P2P network (blind-pairing) — no server, no account. The invite is a one-time secret that hands over your identity, so only share it with your own device.</p>
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Link a new device</div>
            <div className="settings-subtle">Generate an invite here, then paste it into <em>Link this device</em> on your other device to copy this identity across.</div>
          </div>
          <button className="btn" onClick=${L} disabled=${w==="link-invite"||!c?.hasBackupPhrase}>
            ${w==="link-invite"?"Creating\u2026":"Create invite"}
          </button>
        </div>
        ${R&&o`
          <pre className="seed-phrase">${R}</pre>
          <div className="settings-warning">One-time invite — anyone who receives it can adopt your identity. Paste it into your other device now; it expires when you close this screen.</div>
        `}
        <div className="settings-row">
          <div>
            <div className="settings-label">Link this device</div>
            <div className="settings-subtle">Paste an invite from your other device to adopt its identity here. Replaces this device's current identity.</div>
          </div>
          <button className="btn subtle" onClick=${()=>{W(j=>!j),A(""),_("")}}
                  disabled=${w?.startsWith?.("link")}>
            ${H?"Cancel":"Paste invite\u2026"}
          </button>
        </div>
        ${H&&o`
          <div className="restore-form">
            <textarea
              className="restore-textarea"
              placeholder="Paste the invite from your other device"
              value=${G}
              rows="2"
              spellCheck="false"
              autoCapitalize="none"
              onInput=${j=>F(j.target.value)}
            ></textarea>
            <div className="restore-actions">
              <button className="btn primary" onClick=${ie}
                      disabled=${!G.trim()||w==="link-join"}>
                ${w==="link-join"?"Linking\u2026":"Link this device"}
              </button>
            </div>
            <div className="settings-warning">This destroys the current identity on disk. Make sure you've saved its phrase first.</div>
          </div>
        `}
        ${B&&o`<div className="apps-ok">${B}</div>`}
      </div>

      <h2>Profile</h2>
      <p className="subtitle">What apps see when you grant a sign-in. Each field is opt-in — leave blank to share nothing.</p>
      <${Dh} rpc=${e} C=${t} />

      <h2>Permission Center</h2>
      <p className="subtitle">Persistent app grants grouped by drive: sign-in, profile fields, contacts, and arbitrary swarm topics.</p>
      <${Rh} rpc=${e} C=${t} />

      <h2>Content Shield</h2>
      <p className="subtitle">Brave-style ad and tracker blocking, enforced inside the browser's own proxy — blocked requests never reach a peer, a relay, or the network. Named filter lists hot-swap offline; per-drive allowlist and strict mode live here; Pear Plugins feed the same engine with a kill switch.</p>
      <${Bh} rpc=${e} C=${t} activeDriveKey=${l} onBrowse=${u} />

      <h2>Clearnet &amp; privacy</h2>
      <p className="subtitle">Browse https:// sites through the browser-owned clearnet proxy (shields on) or direct load. Privacy ladder: HTTPS-only upgrades, tracking-parameter stripping, referrer policy, fingerprint farbling, third-party cookie isolation in proxy mode.</p>
      <${Kh} rpc=${e} C=${t} />

      <h2>Wallet</h2>
      <p className="subtitle">The built-in testnet wallet (USD₮0 on Stable Testnet — no real funds). Create or import it here, unlock it with your passphrase, back up the recovery phrase, and manage which apps may connect.</p>
      <${Vh} rpc=${e} C=${t} />

      <h2>Relays</h2>
      <p className="subtitle">HiveRelay endpoints used for fast first-paint and persistence. Hybrid mode falls back to pure P2P if a relay is down.</p>
      <${Lh} rpc=${e} C=${t} />

      <h2>Nostr identity</h2>
      <p className="subtitle">A portable Nostr key (npub), linked to your pear identity by a mutual, revocable attestation. "Linked (attested)" is a trust assertion the two keys mutually signed — never proof of the same person.</p>
      <${Ph} rpc=${e} C=${t} />

      <h2>Nostr feed</h2>
      <p className="subtitle">Post NIP-01 notes signed with your Nostr key. Toggle "Include trusted contacts" to also see notes a verified contact authored with their attested Nostr key, replicated peer-to-peer.</p>
      <${Mh} rpc=${e} C=${t} />

      <h2>Name registry</h2>
      <p className="subtitle">Claim memorable names that resolve to your drives or app links — type the name (or pearname://name) in the URL bar. Owner-signed, durable across devices, first-claim-wins with a homograph guard.</p>
      <${Oh} rpc=${e} C=${t} />

      <h2>HiveRelay Network</h2>
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Connected relays</div>
            <div className="settings-subtle">${n.hiveRelays||0} HiveRelay(s) reachable via the DHT right now</div>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Default replication factor</div>
            <div className="settings-subtle">3 relays per published site (configurable per-publish in a future release)</div>
          </div>
        </div>
      </div>

      <h2>Live status</h2>
      <pre className="boot-log">${JSON.stringify(n,null,2)}</pre>

      <h2>Storage</h2>
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Path</div>
            <code className="settings-code">${s}</code>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Usage</div>
            <div className="settings-subtle">${n.storageUsed?(n.storageUsed/1048576).toFixed(1)+" MB":"\u2014"} / ${n.storageLimit?(n.storageLimit/1048576).toFixed(0)+" MB":"\u2014"}</div>
          </div>
          <button className="btn subtle" onClick=${$e} disabled=${w==="cache"}>Clear cache</button>
        </div>
      </div>

      <h2>Experimental</h2>
      <p className="subtitle">Early features behind a flag. They may change, break, or be removed.</p>
      <${Hh} rpc=${e} C=${t} onDeviceSyncChange=${S} />

	      ${g&&o`<div className="settings-section-device-sync">
	        <h2>Device sync <span className="settings-subtle">(experimental)</span></h2>
	        <p className="subtitle">Your bookmarks, encrypted and synced across your own devices — no server, no account. Set up sync here, then pair your other devices with the invite.</p>
	        <${Uh} rpc=${e} C=${t} />
	      </div>`}

      <h2>Danger zone</h2>
      <div className="settings-card danger">
        <div className="settings-row">
          <div>
            <div className="settings-label">Reset app data</div>
            <div className="settings-subtle">Unseeds every published site from HiveRelay first (only possible while your publisher keypair is intact), then wipes local storage and quits. You'll start fresh on next launch. <strong>Copy your drive keys before doing this.</strong> <strong>This also deletes the testnet wallet on this device</strong> — back up its 24-word recovery phrase (Wallet → Back up…) first, or the wallet is unrecoverable.</div>
          </div>
          <button className="btn subtle danger" onClick=${ee} disabled=${w==="reset"}>${w==="reset"?"Resetting\u2026":"Reset data"}</button>
        </div>
      </div>

      <h2>Boot log</h2>
      <pre className="boot-log">${i.join(`
`)||"(events arrived pre-mount \u2014 check status above)"}</pre>
    </div>
  `}var Lm={heading:()=>({type:"heading",level:1,text:"New heading"}),text:()=>({type:"text",text:"Write something."}),image:()=>({type:"image",src:"https://",alt:""}),link:()=>({type:"link",href:"https://",text:"Link text"}),html:()=>({type:"html",text:`<div>
  <!-- Raw HTML / CSS / JS \u2014 rendered as-is -->
</div>`}),code:()=>({type:"code",text:"// code sample \u2014 shown as text"}),quote:()=>({type:"quote",text:"A quote."}),list:()=>({type:"list",items:["Item 1","Item 2"]}),divider:()=>({type:"divider"})};function jh({block:e,onChange:t}){let n=s=>t({...e,...s});switch(e.type){case"heading":return o`
        <div className="block-fields">
          <select value=${e.level} onChange=${s=>n({level:+s.target.value})}>
            ${[1,2,3].map(s=>o`<option key=${s} value=${s}>H${s}</option>`)}
          </select>
          <input type="text" value=${e.text} onInput=${s=>n({text:s.target.value})} />
        </div>
      `;case"text":case"quote":case"code":case"html":return o`<textarea rows=${e.type==="html"?8:e.type==="code"?4:2} value=${e.text} placeholder=${e.type==="html"?"Paste raw HTML, CSS, or <script> \u2014 rendered as part of the page":""} onInput=${s=>n({text:s.target.value})}></textarea>`;case"image":return o`
        <div className="block-fields">
          <input type="text" placeholder="src (https://…)" value=${e.src} onInput=${s=>n({src:s.target.value})} />
          <input type="text" placeholder="alt text" value=${e.alt} onInput=${s=>n({alt:s.target.value})} />
        </div>
      `;case"link":return o`
        <div className="block-fields">
          <input type="text" placeholder="href" value=${e.href} onInput=${s=>n({href:s.target.value})} />
          <input type="text" placeholder="text" value=${e.text} onInput=${s=>n({text:s.target.value})} />
        </div>
      `;case"list":return o`<textarea rows=${Math.max(2,e.items.length)} placeholder="One item per line" value=${e.items.join(`
`)} onInput=${s=>n({items:s.target.value.split(`
`)})}></textarea>`;case"divider":return o`<div className="placeholder">— divider —</div>`;default:return o`<div className="placeholder">unknown block: ${e.type}</div>`}}function Yh({site:e,rpc:t,C:n,onBack:s,onBrowse:i}){let[a,r]=(0,d.useState)(e.name||""),[l,u]=(0,d.useState)(e.blocks||[]),[c,h]=(0,d.useState)(null),[$,v]=(0,d.useState)(""),[N,_]=(0,d.useState)({keyHex:e.keyHex,published:e.published}),[w,E]=(0,d.useState)(!e.published);(0,d.useEffect)(()=>{w||!e.siteId||(async()=>{try{let H=await t.request(n.CMD_GET_SITE_BLOCKS,{siteId:e.siteId});Array.isArray(H?.blocks)&&H.blocks.length>0&&u(H.blocks)}catch{}E(!0)})()},[e.siteId]);let y=H=>u(W=>[...W,Lm[H]()]),f=(H,W)=>u(G=>G.map((F,B)=>B===H?W:F)),p=H=>u(W=>W.filter((G,F)=>F!==H)),k=(H,W)=>u(G=>{let F=H+W;if(F<0||F>=G.length)return G;let B=[...G];return[B[H],B[F]]=[B[F],B[H]],B}),b=async()=>{v(""),h("save");try{await t.request(n.CMD_UPDATE_SITE,{siteId:e.siteId,blocks:l,name:a})}catch(H){v(`save: ${H.message}`)}finally{h(null)}},x=async()=>{v(""),h("publish");try{await t.request(n.CMD_UPDATE_SITE,{siteId:e.siteId,blocks:l,name:a});let H=await t.request(n.CMD_PUBLISH_SITE,{siteId:e.siteId},12e4);_({keyHex:H.keyHex,published:!0,pin:H.pin})}catch(H){v(`publish: ${H.message}`)}finally{h(null)}},g=async()=>{v(""),h("unpublish");try{await t.request(n.CMD_UNPUBLISH_SITE,{siteId:e.siteId}),_(H=>({...H,published:!1}))}catch(H){v(`unpublish: ${H.message}`)}finally{h(null)}},[S,R]=(0,d.useState)(!1);return o`
    <div className="site-editor">
      <div className="site-editor-bar">
        <button className="btn subtle" onClick=${s}>← Sites</button>
        <input className="site-name-input" type="text" placeholder="Site name" value=${a} onInput=${H=>r(H.target.value)} />
        <div className="spacer"></div>
        <label className="btn subtle" title="Upload a site icon (SVG/PNG/JPEG/WebP, ≤512KB) — shows in the browser's site list">
          ${c==="icon"?"Uploading\u2026":S?"\u2713 Icon set":"\u{1F5BC} Icon"}
          <input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" style=${{display:"none"}} onChange=${H=>{let W=H.target.files&&H.target.files[0];if(!W)return;if(W.size>512*1024){v("icon: too large (max 512KB)"),H.target.value="";return}let G=new FileReader;G.onload=async()=>{v(""),R(!1),h("icon");try{await t.request(n.CMD_SET_SITE_ICON,{siteId:e.siteId,dataUrl:G.result}),R(!0),setTimeout(()=>R(!1),2500)}catch(F){v(`icon: ${F.message}`)}finally{h(null),H.target&&(H.target.value="")}},G.readAsDataURL(W)}} />
        </label>
        <button className="btn" onClick=${b} disabled=${c==="save"} title="Write block changes to the drive — peers see updates live">${c==="save"?"Saving\u2026":"Save"}</button>
        ${N.published?o`<button key="unpublish" className="btn subtle" onClick=${g} disabled=${c==="unpublish"}>${c==="unpublish"?"Unpublishing\u2026":"Unpublish"}</button>`:o`<button key="publish" className="btn primary" onClick=${x} disabled=${c==="publish"} title="Seeds via Hyperswarm and pins to HiveRelay for 24/7 availability">${c==="publish"?"Publishing\u2026":"Publish & Pin"}</button>`}
      </div>

      ${$&&o`<div className="apps-error">${$}</div>`}

      ${N.published&&N.keyHex&&o`
        <div className="site-published">
          <div className="site-published-row">
            <span>Published at</span>
            <code>hyper://${N.keyHex}/</code>
            <button className="btn small" onClick=${()=>Oi(`hyper://${N.keyHex}/`)} title="Copy hyper:// URL">📋 Copy</button>
            <button className="btn" onClick=${()=>i(`hyper://${N.keyHex}/`)}>Open in Browse</button>
          </div>
          <div className="site-published-row subtle">
            <span>Drive key</span>
            <code className="key-mono">${N.keyHex}</code>
            <button className="btn small subtle" onClick=${()=>Oi(N.keyHex)} title="Copy raw key">📋 Key</button>
          </div>
          <div className="site-pin-row ${N.pin?.replicatedPeers>0?"ok":"warn"}">
            ${N.pin?.replicatedPeers>0?o`<span>📌 Replicated to ${N.pin.replicatedPeers} HiveRelay peer${N.pin.replicatedPeers===1?"":"s"} (of ${N.pin.acceptances} accepted). Safe to close the app — stays online 24/7.</span>`:N.pin?.ok?o`<span>📡 <strong>${N.pin.acceptances} relay${N.pin.acceptances===1?"":"s"} accepted</strong> your pin request, but none have pulled the content yet. The public HiveRelay network may take minutes or may not replicate at all. Your site is reachable via Hyperswarm as long as this app is running. Share your drive key now; keep the app open until you're sure someone's replicated it.</span>`:o`<span>⚠️ Seeded P2P locally only. ${N.pin?.connectedRelays>0?`Connected to ${N.pin.connectedRelays} relay(s) but none accepted the seed request.`:"No HiveRelays connected yet; retry in a moment."} Site is reachable while this app is running.</span>`}
          </div>
          <div className="site-save-warning">
            💾 <strong>Save this key now.</strong> It's the only way to recover this site if you reset app data. Anyone with the key can reach your site; only this machine's publisher keypair can unseed it.
          </div>
        </div>
      `}

      <div className="blocks">
        ${l.length===0&&o`<p className="placeholder">No blocks yet. Add one below.</p>`}
        ${l.map((H,W)=>o`
          <div className="block" key=${W}>
            <div className="block-header">
              <span className="block-type">${H.type}</span>
              <div className="spacer"></div>
              <button className="btn subtle small" onClick=${()=>k(W,-1)} disabled=${W===0}>↑</button>
              <button className="btn subtle small" onClick=${()=>k(W,1)} disabled=${W===l.length-1}>↓</button>
              <button className="btn subtle small" onClick=${()=>p(W)}>✕</button>
            </div>
            <${jh} block=${H} onChange=${G=>f(W,G)} />
          </div>
        `)}
      </div>

      <div className="add-block-row">
        <span className="placeholder">Add:</span>
        ${Object.keys(Lm).map(H=>o`
          <button key=${H} className="btn subtle small" onClick=${()=>y(H)}>${H}</button>
        `)}
      </div>
    </div>
  `}function Qh({rpc:e,C:t,onBrowse:n,placeholder:s}){let[i,a]=(0,d.useState)(""),[r,l]=(0,d.useState)(null),[u,c]=(0,d.useState)(0),[h,$]=(0,d.useState)(!1),[v,N]=(0,d.useState)(!1),[_,w]=(0,d.useState)(!1),[E,y]=(0,d.useState)(null),[f,p]=(0,d.useState)(""),k=(0,d.useRef)(0),b=async()=>{let S=i.trim();if(!S){l(null),w(!1),y(null);return}$(!0),w(!1),y(null);try{let R=await e.request(t.CMD_SEARCH,{query:S,limit:50,federated:v});k.current=R?.queryId||0,l(Array.isArray(R?.results)?R.results:[]),c(R?.stats?.docs||0),R?.federating&&w(!0)}catch(R){p(`search: ${R.message}`)}finally{$(!1)}},x=S=>S&&S.link?S.link:S&&/^(?:pear|file|hyper):\/\//i.test(S.driveKey||"")?S.driveKey:`hyper://${S.driveKey}${S.path&&S.path!=="/"?S.path:"/"}`,g=S=>!S.tier||S.tier==="self"?o`<span className="src-badge self">you</span>`:S.tier==="followed"?o`<span className="src-badge followed">trusted · hop ${S.trustHop??1}</span>`:o`<span className="src-badge other">${S.tier}</span>`;return(0,d.useEffect)(()=>{let S=R=>{let D=R&&R.detail||{};D.queryId===k.current&&(Array.isArray(D.results)&&l(D.results),y(D),w(!1))};return e.addEventListener(`event:${t.EVT_SEARCH_FEDERATED}`,S),()=>e.removeEventListener(`event:${t.EVT_SEARCH_FEDERATED}`,S)},[]),o`
    <div className="fed-search">
      ${f&&o`<div className="apps-error">${f}</div>`}
      <div className="urlbar" style=${{marginBottom:"10px"}}>
        <input type="text" className="url-input"
          placeholder=${s||"Search the peer-to-peer web\u2026"}
          value=${i}
          onInput=${S=>a(S.target.value)}
          onKeyDown=${S=>S.key==="Enter"&&b()} />
        <button className="btn primary" onClick=${b} disabled=${h||!i.trim()}>${h?"Searching\u2026":"Search"}</button>
      </div>
      <label className="search-fed-toggle">
        <input type="checkbox" checked=${v} onChange=${S=>N(S.target.checked)} />
        Include trusted peers${_?o` <span className="fed-status">· searching peers…</span>`:""}
        <${Fm} meta=${E} />
      </label>
      ${u?o`<span className="search-indexed" style=${{marginLeft:"10px",opacity:.6,fontSize:"12px"}}>${u} page(s) indexed</span>`:""}
      ${r!==null&&(r.length===0?o`<p className="placeholder">No matches${u===0?" yet \u2014 browse some hyper:// pages first to build your index.":"."}</p>`:o`<div className="library-list">
            ${r.map(S=>o`
              <div className="library-row" key=${S.docId||S.driveKey+S.path}>
                <div className="library-row-main">
                  <div className="library-title">${S.title||x(S)}${v?g(S):""}</div>
                  <div className="library-url">${x(S)}</div>
                </div>
                <button className="btn small" onClick=${()=>n(x(S))}>Open</button>
              </div>
            `)}
          </div>`)}
    </div>
  `}function Xh({rpc:e,C:t,onBrowse:n}){let[s,i]=(0,d.useState)([]),[a,r]=(0,d.useState)(null),[l,u]=(0,d.useState)(null),[c,h]=(0,d.useState)(""),[$,v]=(0,d.useState)(""),N=(0,d.useRef)({el:null}),_=b=>{N.current.el=b},w=async()=>{try{let b=await e.request(t.CMD_LIST_SITES);i(Array.isArray(b)?b:b?.sites??[])}catch(b){h(`list: ${b.message}`)}},[E,y]=(0,d.useState)([]),f=async()=>{try{let b=await e.request(t.CMD_GET_CATALOG_APPS),g=(Array.isArray(b)?b:b?.apps??[]).filter(D=>D&&typeof D.driveKey=="string"&&/^[0-9a-f]{64}$/i.test(D.driveKey)),S=D=>D.driveKey===Um?0:Array.isArray(D.categories)&&D.categories.includes("featured")?1:2,R=yc(g).map((D,H)=>({a:D,i:H})).sort((D,H)=>S(D.a)-S(H.a)||D.i-H.i).map(D=>D.a);y(R)}catch{}};(0,d.useEffect)(()=>{w(),f()},[]);let p=async()=>{if(l==="create")return;let b=document.querySelector(".site-name-field"),g=(b?.value??"").trim()||"Untitled";h(""),u("create");try{let S=await e.request(t.CMD_CREATE_SITE,{name:g},12e4);b&&(b.value=""),await w(),r({siteId:S.siteId??S.id,name:g,blocks:[]})}catch(S){h(`create: ${S.message}`)}finally{u(null)}},k=async b=>{if(confirm(`Delete "${b.name}"?`)){h(""),u(`del:${b.siteId}`);try{await e.request(t.CMD_DELETE_SITE,{siteId:b.siteId}),await w()}catch(x){h(`delete: ${x.message}`)}finally{u(null)}}};return a?o`<${Yh} site=${a} rpc=${e} C=${t} onBack=${()=>{r(null),w()}} onBrowse=${n} />`:o`
    <div className="sites">
      <h1>P2P Sites</h1>
      <p className="subtitle">Search the peer-to-peer web, browse published sites, or create your own — all served 24/7 on the HiveRelay network.</p>

      <h2>Search the P2P web</h2>
      <${Qh} rpc=${e} C=${t} onBrowse=${n} placeholder="Search the peer-to-peer web…" />

      <h2>Published sites${E.length?` (${E.length})`:""}</h2>
      <p className="subtitle">Live hyper:// sites pinned on the relay network — open any one in a tab.</p>
      ${E.length===0?o`<p className="placeholder">Loading published sites…</p>`:o`<div className="app-grid">
            ${E.map(b=>o`
              <div className="app-card" key=${b.driveKey}>
                <${Mi} rpc=${e} C=${t} driveKey=${b.driveKey} iconRef=${b.icon} iconData=${b.iconData} name=${b.name} />
                <div className="app-info">
                  <div className="app-name">${b.name}</div>
                  <div className="app-meta">${b.description||"hyper://"+b.driveKey.slice(0,10)+"\u2026"}</div>
                </div>
                <div className="app-actions">
                  <button className="btn primary" onClick=${()=>n("hyper://"+b.driveKey+"/")}>Open</button>
                  <button className="btn subtle" onClick=${()=>Oi("hyper://"+b.driveKey+"/")}>📋 Copy</button>
                </div>
              </div>
            `)}
          </div>`}

      <h2>Your sites</h2>
      <p className="subtitle">Create and publish your own P2P site — auto-pinned to HiveRelay for 24/7 availability.</p>
      <div className="catalog-loader">
        <input
          className="site-name-field"
          type="text"
          placeholder="New site name…"
          onKeyDown=${b=>b.key==="Enter"&&p()}
        />
        <button className="btn primary" onClick=${p} disabled=${l==="create"}>
          ${l==="create"?"Creating\u2026":"Create site"}
        </button>
      </div>
      ${c&&o`<div className="apps-error">${c}</div>`}

      ${s.length===0?o`<p className="placeholder">No sites yet. Create one above.</p>`:o`<div className="app-grid">
            ${s.map(b=>o`
              <div className="app-card" key=${b.siteId}>
                <${Mi} rpc=${e} C=${t} driveKey=${b.keyHex} name=${b.name} />
                <div className="app-info">
                  <div className="app-name">${b.name}</div>
                  <div className="app-meta">${b.published?"published \xB7 "+(b.keyHex?.slice(0,8)??"")+"\u2026":"draft"}</div>
                </div>
                <div className="app-actions">
                  <button className="btn" onClick=${()=>r(b)}>Edit</button>
                  ${b.published&&b.keyHex&&o`<button className="btn subtle" onClick=${()=>n(`hyper://${b.keyHex}/`)}>Open</button>`}
                  ${b.published&&b.keyHex&&o`<button className="btn subtle" onClick=${()=>Oi(`hyper://${b.keyHex}/`)}>📋 Copy</button>`}
                  <button className="btn subtle" onClick=${()=>k(b)} disabled=${l===`del:${b.siteId}`}>Delete</button>
                </div>
              </div>
            `)}
          </div>`}
    </div>
  `}function Gm({rpc:e,C:t,storagePath:n}){let[s,i]=(0,d.useState)("browse"),[a,r]=(0,d.useState)(null),[l,u]=(0,d.useState)(()=>br(fc())),[c,h]=(0,d.useState)({stage:"booting",peerCount:0,dhtConnected:!1,ready:!1,proxyPort:null}),[$,v]=(0,d.useState)([]),[N,_]=(0,d.useState)(null),[w,E]=(0,d.useState)(null),[y,f]=(0,d.useState)(null),[p,k]=(0,d.useState)(null),[b,x]=(0,d.useState)("pending"),[g,S]=(0,d.useState)(()=>vc.map(O=>Pi(O.url,{title:O.title}))),[R,D]=(0,d.useState)(()=>"placeholder"),[H,W]=(0,d.useState)(()=>[]),[G,F]=(0,d.useState)(!1);(0,d.useEffect)(()=>{let O=ee=>v(j=>[...j.slice(-200),ee]),I=ee=>{O(`[${ee.detail.stage}] ${ee.detail.message||""}`),h(j=>({...j,stage:ee.detail.stage}))},Z=ee=>{O(`[ready] HTTP proxy on port ${ee.detail.port}`),h(j=>({...j,ready:!0,proxyPort:ee.detail.port,stage:"ready"})),e.request(t.CMD_GET_IDENTITY).then(k).catch(()=>{}),e.request(t.CMD_USERDATA_GET_SETTINGS).then(j=>{let me=Rt(j);u(br(me?.[Tm]||fc())),x(me?.onboardingDone?"done":"show");let mt=Array.isArray(me?.browseTabs)?me.browseTabs:null;if(mt&&mt.length>0){let Le=gm(mt,vc);Le.tabs.length>0&&(S(Le.tabs),D(Le.activeId))}let Wn=(Array.isArray(me?.browseClosedTabs)?me.browseClosedTabs:[]).map(Le=>As(Le)).filter(Boolean).slice(0,fr);W(Wn)}).catch(()=>{x("done")}).finally(()=>{F(!0)})},M=ee=>h(j=>({...j,peerCount:ee.detail.peerCount})),K=ee=>O(`[error] ${ee.detail?.message||JSON.stringify(ee.detail)}`),V=ee=>{O(`[login] ${ee.detail?.appName||ge(ee.detail?.driveKey)} requested ${(ee.detail?.scopes||[]).join(",")||"sign-in"}`),_(ee.detail)},T=ee=>{O(`[swarm] ${ee.detail?.appName||ge(ee.detail?.driveKey)} wants topic ${ge(ee.detail?.topicHex||"")}`),E(ee.detail)},L=ee=>{O(`[wallet] ${ee.detail?.type} consent requested by ${ge(ee.detail?.driveKey||"")}`),f(ee.detail)},ie=ee=>{O(`[wallet] intent ${ee.detail?.intentId} \u2192 ${ee.detail?.state}`)};e.addEventListener(`event:${t.EVT_BOOT_PROGRESS}`,I),e.addEventListener(`event:${t.EVT_READY}`,Z),e.addEventListener(`event:${t.EVT_PEER_COUNT}`,M),e.addEventListener(`event:${t.EVT_ERROR}`,K),e.addEventListener(`event:${t.EVT_LOGIN_REQUEST}`,V),e.addEventListener(`event:${t.EVT_SWARM_REQUEST}`,T),e.addEventListener(`event:${t.EVT_WALLET_CONNECT_REQUEST}`,L),e.addEventListener(`event:${t.EVT_WALLET_PAYMENT_REQUEST}`,L),e.addEventListener(`event:${t.EVT_WALLET_TX_UPDATE}`,ie);let $e=setInterval(async()=>{try{let ee=await e.request(t.CMD_GET_STATUS);h(j=>({...j,...ee}))}catch{}},3e3);return()=>{clearInterval($e),e.removeEventListener(`event:${t.EVT_BOOT_PROGRESS}`,I),e.removeEventListener(`event:${t.EVT_READY}`,Z),e.removeEventListener(`event:${t.EVT_PEER_COUNT}`,M),e.removeEventListener(`event:${t.EVT_ERROR}`,K),e.removeEventListener(`event:${t.EVT_LOGIN_REQUEST}`,V),e.removeEventListener(`event:${t.EVT_SWARM_REQUEST}`,T),e.removeEventListener(`event:${t.EVT_WALLET_CONNECT_REQUEST}`,L),e.removeEventListener(`event:${t.EVT_WALLET_PAYMENT_REQUEST}`,L),e.removeEventListener(`event:${t.EVT_WALLET_TX_UPDATE}`,ie)}},[e,t]),(0,d.useEffect)(()=>{if(!G)return;let O=setTimeout(()=>{let I=g.map(M=>hm(M,R)),Z=H.map(M=>As(M)).filter(Boolean).slice(0,fr);e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{browseTabs:I,browseClosedTabs:Z}}).catch(()=>{})},800);return()=>clearTimeout(O)},[g,H,R,G,e,t]);let B=O=>{r(O),i("browse")},A=O=>{let I=br(O);u(I),e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{[Tm]:I}}).catch(Z=>{v(M=>[...M.slice(-200),`[settings] theme save failed: ${Z.message}`])})},J=()=>{A(l==="dark"?"light":"dark")},P=c.ready||!!c.proxyPort,ne=P?c.dhtConnected?"ok":"err":"booting",ue=P?`DHT \xB7 ${c.peerCount} peer${c.peerCount===1?"":"s"} \xB7 ${c.hiveRelays||0} relay${c.hiveRelays===1?"":"s"} \xB7 proxy :${c.proxyPort}`:`Booting: ${c.stage}`;return o`
    <div className=${`app theme-${l}`} data-theme=${l}>
      <div className="topbar">
        <div className="brand">
          <${Ti} size=${22} />
          <${ur} />
        </div>
        <div className="tabs">
          ${Object.entries(Yy).map(([O,I])=>o`
            <button className=${"tab"+(s===O?" active":"")} onClick=${()=>i(O)} key=${O}>
              <span className="tab-label">${I.label}</span>
            </button>
          `)}
        </div>
        <div className="topbar-spacer"></div>
        <div className="topbar-tools">
          <button
            type="button"
            className="theme-toggle"
            aria-label=${l==="dark"?"Switch to light theme":"Switch to dark theme"}
            aria-pressed=${l==="dark"}
            title=${l==="dark"?"Switch to light theme":"Switch to dark theme"}
            onClick=${J}
          >
            <span className="theme-toggle-track" aria-hidden="true">
              <span className="theme-toggle-thumb">${l==="dark"?"\u263E":"\u2600"}</span>
            </span>
          </button>
        </div>
      </div>

      <div className=${"panel"+(s==="browse"?" panel-browse":"")}>
        ${s==="browse"&&o`<${ch} rpc=${e} C=${t} navUrl=${a} onNavigated=${()=>r(null)} tabs=${g} setTabs=${S} activeId=${R} setActiveId=${D} closedTabs=${H} setClosedTabs=${W} sessionReady=${G} onOpenSettings=${()=>i("settings")} />`}
        ${s==="apps"&&o`<${Sh} rpc=${e} C=${t} onLaunch=${B} />`}
        ${s==="sites"&&o`<${Xh} rpc=${e} C=${t} onBrowse=${B} />`}
        ${s==="library"&&o`<${Ch} rpc=${e} C=${t} onBrowse=${B} />`}
        ${s==="settings"&&o`<${Wh} rpc=${e} C=${t} status=${c} storagePath=${n} log=${$} appearanceTheme=${l} onAppearanceThemeChange=${A} activeDriveKey=${g.find(O=>O.id===R)&&xi(g.find(O=>O.id===R))||""} onBrowse=${B} />`}
      </div>

      <div className=${"status "+ne}>
        <span className="dot"></span>${ue}
      </div>

      ${N&&o`<${uh}
        rpc=${e}
        C=${t}
        request=${N}
        identity=${p}
        onClose=${()=>_(null)}
      />`}

      ${w&&o`<${dh}
        rpc=${e}
        C=${t}
        request=${w}
        identity=${p}
        onClose=${()=>E(null)}
      />`}

      ${y&&o`<${mh}
        rpc=${e}
        C=${t}
        request=${y}
        onClose=${()=>f(null)}
      />`}

      ${b==="show"&&o`<${vh}
        rpc=${e}
        C=${t}
        onPickSite=${O=>B(O)}
        onClose=${()=>x("done")}
      />`}
    </div>
  `}var Sr=class extends EventTarget{constructor(t){super(),this._pipe=t,this._nextId=1,this._pending=new Map,this._buffer="",this._connected=t.connected!==!1,t.on("data",n=>this._onData(n)),t.on("open",()=>{this._connected=!0,this.dispatchEvent(new CustomEvent("open"))}),t.on("close",()=>{this._disconnect("RPC connection closed"),this.dispatchEvent(new CustomEvent("close"))}),t.on("error",n=>{this._disconnect("RPC connection failed"),this.dispatchEvent(new CustomEvent("error",{detail:n}))})}request(t,n={},s=3e4){return t==null?Promise.reject(new Error("RPC command is missing. Renderer constants are out of sync with backend/constants.js.")):this._connected?new Promise((i,a)=>{let r=this._nextId++,l=setTimeout(()=>{this._pending.has(r)&&(this._pending.delete(r),a(new Error(`RPC timeout: ${t}`)))},s);this._pending.set(r,{resolve:i,reject:a,timer:l});try{this._send({id:r,cmd:t,data:n})}catch(u){clearTimeout(l),this._pending.delete(r),a(u)}}):Promise.reject(new Error(`RPC unavailable: ${t} (backend disconnected; reconnecting)`))}on(t,n){return this.addEventListener(t,s=>n(s.detail)),this}_send(t){let n=JSON.stringify(t),s=n.length.toString(16).padStart(8,"0")+n;if(this._pipe.write(s)===!1)throw new Error("RPC connection is not writable")}_disconnect(t){this._connected=!1;for(let n of this._pending.values())clearTimeout(n.timer),n.reject(new Error(t));this._pending.clear()}_onData(t){for(this._buffer+=typeof t=="string"?t:t.toString();this._buffer.length>=8;){let n=parseInt(this._buffer.slice(0,8),16);if(isNaN(n)||n<=0){this._buffer="";return}if(this._buffer.length<8+n)break;let s=this._buffer.slice(8,8+n);this._buffer=this._buffer.slice(8+n);let i;try{i=JSON.parse(s)}catch{continue}this._dispatch(i)}}_dispatch(t){if(t.id&&(t.result!==void 0||t.error)){let n=this._pending.get(t.id);n&&(clearTimeout(n.timer),this._pending.delete(t.id),t.error?n.reject(new Error(t.error)):n.resolve(t.result));return}t.event&&(this.dispatchEvent(new CustomEvent(`event:${t.event}`,{detail:t.data})),this.dispatchEvent(new CustomEvent("event",{detail:{name:t.event,data:t.data}})))}};var Er=9876,Vm=5,Wm=900000001,hc=String(globalThis.pearbrowserRuntime?.sessionToken||""),jm={CMD_NAVIGATE:1,CMD_GET_STATUS:2,CMD_GET_DRIVE_INFO:3,CMD_RELEASE_ORIGIN:4,CMD_LOAD_CATALOG:10,CMD_INSTALL_APP:11,CMD_UNINSTALL_APP:12,CMD_LAUNCH_APP:13,CMD_LIST_INSTALLED:14,CMD_CHECK_UPDATES:15,CMD_LOAD_CATALOG_BEE:16,CMD_GET_CATALOG_APPS:17,CMD_UNLOAD_CATALOG:18,CMD_LOAD_CATALOG_AUTOBEE:19,CMD_SHEETS_LOAD:170,CMD_SHEETS_LIST:171,CMD_SHEETS_LIST_SCHEMAS:175,CMD_LOAD_CATALOG_INDEX:176,CMD_SEARCH:177,CMD_SEARCH_INDEX:178,CMD_CREATE_SITE:20,CMD_UPDATE_SITE:21,CMD_PUBLISH_SITE:22,CMD_UNPUBLISH_SITE:23,CMD_LIST_SITES:24,CMD_DELETE_SITE:25,CMD_LOAD_TEMPLATE:26,CMD_GET_SITE_BLOCKS:27,CMD_LEGACY_APP_MIGRATION:28,CMD_RUN_APP_IN_TAB:201,CMD_RESET_APP:29,CMD_CLEAR_CACHE:30,CMD_GET_IDENTITY:31,CMD_GET_APP_ICON:32,CMD_SET_SITE_ICON:33,CMD_GET_RELAYS:40,CMD_SET_RELAYS:41,CMD_SET_RELAY_ENABLED:42,CMD_CHECK_RELAY_CAPABILITY:43,CMD_USERDATA_LIST_BOOKMARKS:50,CMD_USERDATA_ADD_BOOKMARK:51,CMD_USERDATA_REMOVE_BOOKMARK:52,CMD_USERDATA_LIST_HISTORY:53,CMD_USERDATA_ADD_HISTORY:54,CMD_USERDATA_CLEAR_HISTORY:55,CMD_USERDATA_GET_SETTINGS:56,CMD_USERDATA_SET_SETTINGS:57,CMD_USERDATA_GET_SESSION:58,CMD_USERDATA_SAVE_SESSION:59,CMD_USERDATA_IMPORT:60,CMD_IDENTITY_EXPORT_PHRASE:70,CMD_IDENTITY_IMPORT_PHRASE:71,CMD_IDENTITY_ROTATE:72,CMD_IDENTITY_VALIDATE_PHRASE:73,CMD_IDENTITY_SIGN:74,CMD_IDENTITY_VERIFY:75,CMD_PROFILE_GET:80,CMD_PROFILE_UPDATE:81,CMD_PROFILE_CLEAR:82,CMD_LOGIN_LIST_GRANTS:83,CMD_LOGIN_REVOKE_GRANT:84,CMD_LOGIN_REVOKE_ALL:85,CMD_LOGIN_RESOLVE:86,CMD_CONTACTS_LIST:90,CMD_CONTACTS_LOOKUP:91,CMD_CONTACTS_ADD:92,CMD_CONTACTS_UPDATE:93,CMD_CONTACTS_REMOVE:94,CMD_CONTACTS_MY_INVITE:95,CMD_CONTACTS_ADD_INVITE:96,CMD_STOP:99,CMD_SWARM_RESOLVE:120,CMD_SWARM_LIST_GRANTS:121,CMD_SWARM_REVOKE_GRANT:122,CMD_SWARM_REVOKE_ALL_FOR_APP:123,CMD_MYCATALOG_GET:150,CMD_MYCATALOG_CREATE:151,CMD_MYCATALOG_ADD_APP:152,CMD_MYCATALOG_REMOVE_APP:153,CMD_MYCATALOG_RENAME:154,CMD_MYCATALOG_UPDATE_APP:155,CMD_AUTOBEE_CREATE:160,CMD_AUTOBEE_GET:161,CMD_AUTOBEE_ADD_APP:162,CMD_AUTOBEE_REMOVE_APP:163,CMD_AUTOBEE_RENAME:164,CMD_AUTOBEE_ADD_WRITER:165,CMD_SYNC_STATUS:180,CMD_SYNC_CREATE:181,CMD_SYNC_JOIN:182,CMD_SYNC_ADD_WRITER:183,CMD_SYNC_GET_BOOKMARKS:184,CMD_SYNC_ADD_BOOKMARK:185,CMD_SYNC_REMOVE_BOOKMARK:186,CMD_SYNC_PUSH_LOCAL:187,CMD_NAME_RESOLVE:250,CMD_NAME_PETNAME_LIST:251,CMD_NAME_PETNAME_SET:252,CMD_NAME_PETNAME_REMOVE:253,CMD_NAMEREG_CLAIM:264,CMD_NAMEREG_ROTATE:265,CMD_NAMEREG_RELEASE:266,CMD_NAMEREG_REVOKE:267,CMD_NAMEREG_LIST:268,CMD_NAMEREG_RESOLVE:269,CMD_NAMEREG_STATUS:270,CMD_IDENTITY_BINDING_PUBLISH:260,CMD_IDENTITY_BINDING_RESOLVE:261,CMD_SEARCH_FEDERATED:262,CMD_NOSTR_GET_IDENTITY:188,CMD_NOSTR_BIND:189,CMD_NOSTR_REVOKE:190,CMD_NOSTR_PUBLISH:191,CMD_NOSTR_QUERY:192,CMD_SUBMIT_APP:210,CMD_MOD_PENDING:211,CMD_MOD_APPROVE:212,CMD_MOD_REJECT:213,CMD_MOD_REVIEW:214,CMD_ASK_BROWSER_CAPABILITIES:220,CMD_ASK_BROWSER_START:221,CMD_ASK_BROWSER_CANCEL:222,CMD_SHIELD_STATUS:230,CMD_SHIELD_LOAD_LIST:231,CMD_SHIELD_REMOVE_LIST:232,CMD_SHIELD_SET_ALLOW:233,CMD_SHIELD_SET_STRICT:234,CMD_PLUGIN_LIST:235,CMD_PLUGIN_SET_ENABLED:236,CMD_PLUGIN_REGISTER:237,CMD_SHIELD_SUBSCRIBE_LIST:239,CMD_SHIELD_UNSUBSCRIBE_LIST:240,CMD_SHIELD_REFRESH_LISTS:241,CMD_PLUGIN_INSTALL_DRIVE:242,CMD_PLUGIN_UPDATE_DRIVE:243,CMD_PLUGIN_UNINSTALL:244,CMD_PLUGIN_CATALOG:245,CMD_PLUGIN_CATALOG_LOAD_DRIVE:246,CMD_PLUGIN_CATALOG_REMOVE_SOURCE:247,CMD_PRIVACY_STATUS:238,CMD_WALLET_STATUS:300,CMD_WALLET_CREATE:301,CMD_WALLET_IMPORT:302,CMD_WALLET_BACKUP:303,CMD_WALLET_UNLOCK:304,CMD_WALLET_LOCK:305,CMD_WALLET_ADDRESS:306,CMD_WALLET_BALANCES:307,CMD_WALLET_TRANSACTIONS:308,CMD_WALLET_CONNECTIONS_LIST:309,CMD_WALLET_CONNECTION_REVOKE:310,CMD_WALLET_CONNECT_RESOLVE:311,CMD_WALLET_PAYMENT_RESOLVE:312,CMD_WALLET_RECONCILE:313,CMD_BRIDGE:200,EVT_READY:100,EVT_PEER_COUNT:101,EVT_ERROR:102,EVT_INSTALL_PROGRESS:103,EVT_SITE_PUBLISHED:104,EVT_BOOT_PROGRESS:105,EVT_LOGIN_REQUEST:106,EVT_SWARM_REQUEST:107,EVT_SEARCH_FEDERATED:108,EVT_IDENTITY_BINDING_PUBLISHED:109,EVT_LAUNCH_PROGRESS:110,EVT_ASK_BROWSER_STREAM:111,EVT_WALLET_CONNECT_REQUEST:112,EVT_WALLET_PAYMENT_REQUEST:113,EVT_WALLET_TX_UPDATE:114},gc=class{constructor(t,n={}){this._listeners={data:[],close:[],error:[],open:[],reconnecting:[],"reconnect-failed":[]},this._url=t,this._connected=!1,this._connecting=!1,this._destroyed=!1,this._reconnectEnabled=!1,this._reconnectTimer=null,this._reconnectAttempt=0,this._maxReconnectAttempts=Number.isInteger(n.maxReconnectAttempts)?n.maxReconnectAttempts:8,this._reconnectBaseMs=Number.isFinite(n.reconnectBaseMs)?n.reconnectBaseMs:100,this._reconnectMaxMs=Number.isFinite(n.reconnectMaxMs)?n.reconnectMaxMs:1e3,this._failedSocket=null,this._ws=null,this._connect()}get connected(){return this._connected}enableReconnect(){this._destroyed||(this._reconnectEnabled=!0,!this._connected&&!this._connecting&&this._scheduleReconnect())}destroy(){this._destroyed=!0,this._reconnectEnabled=!1,this._connected=!1,this._connecting=!1,this._reconnectTimer&&clearTimeout(this._reconnectTimer),this._reconnectTimer=null;let t=this._ws;this._ws=null;try{t?.close()}catch{}}_emit(t,n){for(let s of this._listeners[t]||[])s(n)}_connect(){if(this._destroyed||this._connecting||this._connected)return;this._connecting=!0,console.log("[ws] connecting to",this._url);let t=new WebSocket(this._url);this._ws=t,this._failedSocket=null,t.binaryType="arraybuffer",t.addEventListener("open",()=>{if(this._destroyed||t!==this._ws){try{t.close()}catch{}return}console.log("[ws] open"),this._connecting=!1,this._connected=!0,this._reconnectAttempt=0,this._emit("open")}),t.addEventListener("message",n=>{if(t!==this._ws||!this._connected)return;let s=typeof n.data=="string"?n.data:new TextDecoder().decode(n.data);this._emit("data",s)}),t.addEventListener("close",n=>{console.log("[ws] close",n.code,n.reason),this._handleDisconnect(t)}),t.addEventListener("error",n=>{console.error("[ws] error",n),this._handleDisconnect(t,n);try{t.close()}catch{}})}_handleDisconnect(t,n=null){this._destroyed||t!==this._ws||this._failedSocket===t||(this._failedSocket=t,this._connected=!1,this._connecting=!1,n&&this._emit("error",n),this._emit("close"),this._scheduleReconnect())}_scheduleReconnect(){if(!this._reconnectEnabled||this._destroyed||this._connected||this._connecting||this._reconnectTimer)return;if(this._reconnectAttempt>=this._maxReconnectAttempts){this._emit("reconnect-failed",{attempts:this._reconnectAttempt});return}let t=++this._reconnectAttempt,n=Math.min(this._reconnectBaseMs*2**(t-1),this._reconnectMaxMs);this._emit("reconnecting",{attempt:t,delay:n}),this._reconnectTimer=setTimeout(()=>{this._reconnectTimer=null,this._connect()},n)}on(t,n){return this._listeners[t]&&this._listeners[t].push(n),this}write(t){if(!this._connected||!this._ws)throw new Error("WebSocket RPC connection is not open");return this._ws.send(t),!0}};function Jh(e){let t=JSON.stringify(e);return t.length.toString(16).padStart(8,"0")+t}function Zh(e){let t=new URL(e);return t.pathname="/status-smoke",t.search=`?session=${encodeURIComponent(hc)}`,t.hash="",t.toString()}function eg(e){if(!hc)throw new Error("PearBrowser v3 runtime session token is unavailable");return`ws://127.0.0.1:${e}/?session=${encodeURIComponent(hc)}`}function tg(e,t){e.buffer+=typeof t=="string"?t:new TextDecoder().decode(t);let n=[];for(;e.buffer.length>=8;){let s=parseInt(e.buffer.slice(0,8),16);if(isNaN(s)||s<=0||s>1e7)throw new Error("invalid rpc frame");if(e.buffer.length<8+s)break;let i=e.buffer.slice(8,8+s);e.buffer=e.buffer.slice(8+s),n.push(JSON.parse(i))}return n}function ng(e,t){return new Promise((n,s)=>{let i=Zh(e),a=new WebSocket(i);a.binaryType="arraybuffer";let r={buffer:""},l=!1,u=setTimeout(()=>c(new Error("probe timeout")),t);function c(h){if(!l){l=!0,clearTimeout(u);try{a.close()}catch{}h?s(h):n()}}a.addEventListener("open",()=>{a.send(Jh({id:Wm,cmd:jm.CMD_GET_STATUS,data:{}}))}),a.addEventListener("message",h=>{let $;try{$=tg(r,h.data)}catch(v){c(v);return}for(let v of $){if(v?.event==="backend-boot-failed")return c(null);if(v?.id===Wm)return v.error?c(new Error(v.error)):c(null)}}),a.addEventListener("error",()=>c(new Error("probe error"))),a.addEventListener("close",()=>c(new Error("probe closed")))})}function sg(e,t){return ng(e,t).then(()=>new Promise((n,s)=>{let i=new gc(e),a=!1,r=(u=null)=>{a||(a=!0,clearTimeout(l),u?(i.destroy(),s(u)):(i.enableReconnect(),n(i)))},l=setTimeout(()=>r(new Error("timeout")),t);i.on("open",()=>r()),i.on("error",()=>r(new Error("ws error"))),i.on("close",()=>r(new Error("ws closed")))}))}async function Ym(){let e=null,t=null,n=[],s=Date.now()+25e3;do{n=[];for(let a=Er;a<Er+Vm;a++)try{e=await sg(eg(a),1500),t=a,console.log("[rpc] connected on :"+a);break}catch(r){n.push(`:${a} ${r.message}`)}if(e)break;await new Promise(a=>setTimeout(a,1e3))}while(Date.now()<s);if(!e)throw new Error(`Could not reach backend on any port ${Er}-${Er+Vm-1} (${n.join("; ")}). The Bare main process is not running, or is running but unresponsive. Relaunch the app first; if that does not help, reinstall the verified signed native package.`);return{rpc:new Sr(e),C:jm,pipe:e,storagePath:`(backend in main Bare process, WS :${t})`}}var ig=document.getElementById("app"),En=(0,Qm.createRoot)(ig);function Vn({message:e,detail:t,failed:n}){return o`
    <div className="splash">
      <div className="splash-inner">
        <${Ti} size=${96} animated=${!n} />
        <${ur} />
        <div className="splash-tagline">P2P browser, app store, and publishing — no servers required.</div>
        <div className=${"splash-status"+(n?" failed":"")}>
          <span className="splash-spinner"></span>
          <span>${e}</span>
        </div>
        ${t&&o`<pre className="splash-detail">${t}</pre>`}
      </div>
    </div>
  `}En.render(o`<${Vn} message="Connecting to backend…" />`);try{let{rpc:e,C:t,storagePath:n,pipe:s}=await Ym(),i=!1;e.on("event:backend-boot-failed",l=>{i=!0,console.error("Backend boot failed in main process:"),console.error(l?.message),l?.stack&&console.error(l.stack);let u=[l?.message||"(no message)",l?.code?`
Code: `+l.code:"",l?.stack?`

`+l.stack:"",`

Likely fix: reinstall the verified signed native package, then relaunch it.`].join("");En.render(o`<${Vn}
      message="Backend failed to boot"
      detail=${u}
      failed=${!0} />`)});let a=!1,r=()=>{i||a||!s.connected||(a=!0,En.render(o`<${Gm} rpc=${e} C=${t} storagePath=${n} />`))};s.on("open",()=>{i||(En.render(o`<${Vn} message="Handshake restored · resuming…" />`),setTimeout(r,50))}),s.on("error",l=>{console.error("Backend RPC connection error:",l)}),s.on("close",()=>{i||(a=!1,En.render(o`<${Vn} message="Backend connection lost · reconnecting…" />`))}),s.on("reconnecting",({attempt:l}={})=>{i||En.render(o`<${Vn} message=${`Reconnecting to backend${l?` \xB7 attempt ${l}`:""}\u2026`} />`)}),s.on("reconnect-failed",()=>{i||(a=!1,En.render(o`<${Vn}
      message="Backend disconnected"
      detail="Automatic reconnect failed. Fully quit and relaunch PearBrowser; your profile and application storage are safe."
      failed=${!0} />`))}),setTimeout(r,250)}catch(e){console.error("Boot failed:",e),En.render(o`<${Vn} message="Boot failed" detail=${e.stack||e.message} failed=${!0} />`)}
/*! Bundled license information:

react/cjs/react.production.min.js:
  (**
   * @license React
   * react.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

scheduler/cjs/scheduler.production.min.js:
  (**
   * @license React
   * scheduler.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react-dom/cjs/react-dom.production.min.js:
  (**
   * @license React
   * react-dom.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
