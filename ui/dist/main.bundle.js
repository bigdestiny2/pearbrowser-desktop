var vm=Object.create;var xc=Object.defineProperty;var ym=Object.getOwnPropertyDescriptor;var hm=Object.getOwnPropertyNames;var gm=Object.getPrototypeOf,$m=Object.prototype.hasOwnProperty;var on=(e,t)=>()=>{try{return t||e((t={exports:{}}).exports,t),t.exports}catch(n){throw t=0,n}};var wm=(e,t,n,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of hm(t))!$m.call(e,r)&&r!==n&&xc(e,r,{get:()=>t[r],enumerable:!(s=ym(t,r))||s.enumerable});return e};var Hs=(e,t,n)=>(n=e!=null?vm(gm(e)):{},wm(t||!e||!e.__esModule?xc(n,"default",{value:e,enumerable:!0}):n,e));var Hc=on(oe=>{"use strict";var Fs=Symbol.for("react.element"),bm=Symbol.for("react.portal"),Nm=Symbol.for("react.fragment"),km=Symbol.for("react.strict_mode"),_m=Symbol.for("react.profiler"),Sm=Symbol.for("react.provider"),Em=Symbol.for("react.context"),Cm=Symbol.for("react.forward_ref"),Tm=Symbol.for("react.suspense"),Am=Symbol.for("react.memo"),xm=Symbol.for("react.lazy"),Dc=Symbol.iterator;function Dm(e){return e===null||typeof e!="object"?null:(e=Dc&&e[Dc]||e["@@iterator"],typeof e=="function"?e:null)}var Lc={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},Pc=Object.assign,Mc={};function ss(e,t,n){this.props=e,this.context=t,this.refs=Mc,this.updater=n||Lc}ss.prototype.isReactComponent={};ss.prototype.setState=function(e,t){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,t,"setState")};ss.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function Oc(){}Oc.prototype=ss.prototype;function Ka(e,t,n){this.props=e,this.context=t,this.refs=Mc,this.updater=n||Lc}var za=Ka.prototype=new Oc;za.constructor=Ka;Pc(za,ss.prototype);za.isPureReactComponent=!0;var Rc=Array.isArray,Uc=Object.prototype.hasOwnProperty,Ha={current:null},Bc={key:!0,ref:!0,__self:!0,__source:!0};function Kc(e,t,n){var s,r={},i=null,a=null;if(t!=null)for(s in t.ref!==void 0&&(a=t.ref),t.key!==void 0&&(i=""+t.key),t)Uc.call(t,s)&&!Bc.hasOwnProperty(s)&&(r[s]=t[s]);var l=arguments.length-2;if(l===1)r.children=n;else if(1<l){for(var u=Array(l),o=0;o<l;o++)u[o]=arguments[o+2];r.children=u}if(e&&e.defaultProps)for(s in l=e.defaultProps,l)r[s]===void 0&&(r[s]=l[s]);return{$$typeof:Fs,type:e,key:i,ref:a,props:r,_owner:Ha.current}}function Rm(e,t){return{$$typeof:Fs,type:e.type,key:t,ref:e.ref,props:e.props,_owner:e._owner}}function Fa(e){return typeof e=="object"&&e!==null&&e.$$typeof===Fs}function Im(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(n){return t[n]})}var Ic=/\/+/g;function Ba(e,t){return typeof e=="object"&&e!==null&&e.key!=null?Im(""+e.key):t.toString(36)}function Jr(e,t,n,s,r){var i=typeof e;(i==="undefined"||i==="boolean")&&(e=null);var a=!1;if(e===null)a=!0;else switch(i){case"string":case"number":a=!0;break;case"object":switch(e.$$typeof){case Fs:case bm:a=!0}}if(a)return a=e,r=r(a),e=s===""?"."+Ba(a,0):s,Rc(r)?(n="",e!=null&&(n=e.replace(Ic,"$&/")+"/"),Jr(r,t,n,"",function(o){return o})):r!=null&&(Fa(r)&&(r=Rm(r,n+(!r.key||a&&a.key===r.key?"":(""+r.key).replace(Ic,"$&/")+"/")+e)),t.push(r)),1;if(a=0,s=s===""?".":s+":",Rc(e))for(var l=0;l<e.length;l++){i=e[l];var u=s+Ba(i,l);a+=Jr(i,t,n,u,r)}else if(u=Dm(e),typeof u=="function")for(e=u.call(e),l=0;!(i=e.next()).done;)i=i.value,u=s+Ba(i,l++),a+=Jr(i,t,n,u,r);else if(i==="object")throw t=String(e),Error("Objects are not valid as a React child (found: "+(t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t)+"). If you meant to render a collection of children, use an array instead.");return a}function Xr(e,t,n){if(e==null)return e;var s=[],r=0;return Jr(e,s,"","",function(i){return t.call(n,i,r++)}),s}function Lm(e){if(e._status===-1){var t=e._result;t=t(),t.then(function(n){(e._status===0||e._status===-1)&&(e._status=1,e._result=n)},function(n){(e._status===0||e._status===-1)&&(e._status=2,e._result=n)}),e._status===-1&&(e._status=0,e._result=t)}if(e._status===1)return e._result.default;throw e._result}var je={current:null},Zr={transition:null},Pm={ReactCurrentDispatcher:je,ReactCurrentBatchConfig:Zr,ReactCurrentOwner:Ha};function zc(){throw Error("act(...) is not supported in production builds of React.")}oe.Children={map:Xr,forEach:function(e,t,n){Xr(e,function(){t.apply(this,arguments)},n)},count:function(e){var t=0;return Xr(e,function(){t++}),t},toArray:function(e){return Xr(e,function(t){return t})||[]},only:function(e){if(!Fa(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};oe.Component=ss;oe.Fragment=Nm;oe.Profiler=_m;oe.PureComponent=Ka;oe.StrictMode=km;oe.Suspense=Tm;oe.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Pm;oe.act=zc;oe.cloneElement=function(e,t,n){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var s=Pc({},e.props),r=e.key,i=e.ref,a=e._owner;if(t!=null){if(t.ref!==void 0&&(i=t.ref,a=Ha.current),t.key!==void 0&&(r=""+t.key),e.type&&e.type.defaultProps)var l=e.type.defaultProps;for(u in t)Uc.call(t,u)&&!Bc.hasOwnProperty(u)&&(s[u]=t[u]===void 0&&l!==void 0?l[u]:t[u])}var u=arguments.length-2;if(u===1)s.children=n;else if(1<u){l=Array(u);for(var o=0;o<u;o++)l[o]=arguments[o+2];s.children=l}return{$$typeof:Fs,type:e.type,key:r,ref:i,props:s,_owner:a}};oe.createContext=function(e){return e={$$typeof:Em,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:Sm,_context:e},e.Consumer=e};oe.createElement=Kc;oe.createFactory=function(e){var t=Kc.bind(null,e);return t.type=e,t};oe.createRef=function(){return{current:null}};oe.forwardRef=function(e){return{$$typeof:Cm,render:e}};oe.isValidElement=Fa;oe.lazy=function(e){return{$$typeof:xm,_payload:{_status:-1,_result:e},_init:Lm}};oe.memo=function(e,t){return{$$typeof:Am,type:e,compare:t===void 0?null:t}};oe.startTransition=function(e){var t=Zr.transition;Zr.transition={};try{e()}finally{Zr.transition=t}};oe.unstable_act=zc;oe.useCallback=function(e,t){return je.current.useCallback(e,t)};oe.useContext=function(e){return je.current.useContext(e)};oe.useDebugValue=function(){};oe.useDeferredValue=function(e){return je.current.useDeferredValue(e)};oe.useEffect=function(e,t){return je.current.useEffect(e,t)};oe.useId=function(){return je.current.useId()};oe.useImperativeHandle=function(e,t,n){return je.current.useImperativeHandle(e,t,n)};oe.useInsertionEffect=function(e,t){return je.current.useInsertionEffect(e,t)};oe.useLayoutEffect=function(e,t){return je.current.useLayoutEffect(e,t)};oe.useMemo=function(e,t){return je.current.useMemo(e,t)};oe.useReducer=function(e,t,n){return je.current.useReducer(e,t,n)};oe.useRef=function(e){return je.current.useRef(e)};oe.useState=function(e){return je.current.useState(e)};oe.useSyncExternalStore=function(e,t,n){return je.current.useSyncExternalStore(e,t,n)};oe.useTransition=function(){return je.current.useTransition()};oe.version="18.3.1"});var ei=on((Ng,Fc)=>{"use strict";Fc.exports=Hc()});var Zc=on(ve=>{"use strict";function Wa(e,t){var n=e.length;e.push(t);e:for(;0<n;){var s=n-1>>>1,r=e[s];if(0<ti(r,t))e[s]=t,e[n]=r,n=s;else break e}}function Et(e){return e.length===0?null:e[0]}function si(e){if(e.length===0)return null;var t=e[0],n=e.pop();if(n!==t){e[0]=n;e:for(var s=0,r=e.length,i=r>>>1;s<i;){var a=2*(s+1)-1,l=e[a],u=a+1,o=e[u];if(0>ti(l,n))u<r&&0>ti(o,l)?(e[s]=o,e[u]=n,s=u):(e[s]=l,e[a]=n,s=a);else if(u<r&&0>ti(o,n))e[s]=o,e[u]=n,s=u;else break e}}return t}function ti(e,t){var n=e.sortIndex-t.sortIndex;return n!==0?n:e.id-t.id}typeof performance=="object"&&typeof performance.now=="function"?(qc=performance,ve.unstable_now=function(){return qc.now()}):(qa=Date,Gc=qa.now(),ve.unstable_now=function(){return qa.now()-Gc});var qc,qa,Gc,Ut=[],cn=[],Mm=1,vt=null,ze=3,ri=!1,Pn=!1,Gs=!1,jc=typeof setTimeout=="function"?setTimeout:null,Yc=typeof clearTimeout=="function"?clearTimeout:null,Vc=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function ja(e){for(var t=Et(cn);t!==null;){if(t.callback===null)si(cn);else if(t.startTime<=e)si(cn),t.sortIndex=t.expirationTime,Wa(Ut,t);else break;t=Et(cn)}}function Ya(e){if(Gs=!1,ja(e),!Pn)if(Et(Ut)!==null)Pn=!0,Xa(Qa);else{var t=Et(cn);t!==null&&Ja(Ya,t.startTime-e)}}function Qa(e,t){Pn=!1,Gs&&(Gs=!1,Yc(Vs),Vs=-1),ri=!0;var n=ze;try{for(ja(t),vt=Et(Ut);vt!==null&&(!(vt.expirationTime>t)||e&&!Jc());){var s=vt.callback;if(typeof s=="function"){vt.callback=null,ze=vt.priorityLevel;var r=s(vt.expirationTime<=t);t=ve.unstable_now(),typeof r=="function"?vt.callback=r:vt===Et(Ut)&&si(Ut),ja(t)}else si(Ut);vt=Et(Ut)}if(vt!==null)var i=!0;else{var a=Et(cn);a!==null&&Ja(Ya,a.startTime-t),i=!1}return i}finally{vt=null,ze=n,ri=!1}}var ii=!1,ni=null,Vs=-1,Qc=5,Xc=-1;function Jc(){return!(ve.unstable_now()-Xc<Qc)}function Ga(){if(ni!==null){var e=ve.unstable_now();Xc=e;var t=!0;try{t=ni(!0,e)}finally{t?qs():(ii=!1,ni=null)}}else ii=!1}var qs;typeof Vc=="function"?qs=function(){Vc(Ga)}:typeof MessageChannel<"u"?(Va=new MessageChannel,Wc=Va.port2,Va.port1.onmessage=Ga,qs=function(){Wc.postMessage(null)}):qs=function(){jc(Ga,0)};var Va,Wc;function Xa(e){ni=e,ii||(ii=!0,qs())}function Ja(e,t){Vs=jc(function(){e(ve.unstable_now())},t)}ve.unstable_IdlePriority=5;ve.unstable_ImmediatePriority=1;ve.unstable_LowPriority=4;ve.unstable_NormalPriority=3;ve.unstable_Profiling=null;ve.unstable_UserBlockingPriority=2;ve.unstable_cancelCallback=function(e){e.callback=null};ve.unstable_continueExecution=function(){Pn||ri||(Pn=!0,Xa(Qa))};ve.unstable_forceFrameRate=function(e){0>e||125<e?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):Qc=0<e?Math.floor(1e3/e):5};ve.unstable_getCurrentPriorityLevel=function(){return ze};ve.unstable_getFirstCallbackNode=function(){return Et(Ut)};ve.unstable_next=function(e){switch(ze){case 1:case 2:case 3:var t=3;break;default:t=ze}var n=ze;ze=t;try{return e()}finally{ze=n}};ve.unstable_pauseExecution=function(){};ve.unstable_requestPaint=function(){};ve.unstable_runWithPriority=function(e,t){switch(e){case 1:case 2:case 3:case 4:case 5:break;default:e=3}var n=ze;ze=e;try{return t()}finally{ze=n}};ve.unstable_scheduleCallback=function(e,t,n){var s=ve.unstable_now();switch(typeof n=="object"&&n!==null?(n=n.delay,n=typeof n=="number"&&0<n?s+n:s):n=s,e){case 1:var r=-1;break;case 2:r=250;break;case 5:r=1073741823;break;case 4:r=1e4;break;default:r=5e3}return r=n+r,e={id:Mm++,callback:t,priorityLevel:e,startTime:n,expirationTime:r,sortIndex:-1},n>s?(e.sortIndex=n,Wa(cn,e),Et(Ut)===null&&e===Et(cn)&&(Gs?(Yc(Vs),Vs=-1):Gs=!0,Ja(Ya,n-s))):(e.sortIndex=r,Wa(Ut,e),Pn||ri||(Pn=!0,Xa(Qa))),e};ve.unstable_shouldYield=Jc;ve.unstable_wrapCallback=function(e){var t=ze;return function(){var n=ze;ze=t;try{return e.apply(this,arguments)}finally{ze=n}}}});var tu=on((_g,eu)=>{"use strict";eu.exports=Zc()});var af=on(ft=>{"use strict";var Om=ei(),dt=tu();function F(e){for(var t="https://reactjs.org/docs/error-decoder.html?invariant="+e,n=1;n<arguments.length;n++)t+="&args[]="+encodeURIComponent(arguments[n]);return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var od=new Set,mr={};function jn(e,t){_s(e,t),_s(e+"Capture",t)}function _s(e,t){for(mr[e]=t,e=0;e<t.length;e++)od.add(t[e])}var Zt=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),bl=Object.prototype.hasOwnProperty,Um=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,nu={},su={};function Bm(e){return bl.call(su,e)?!0:bl.call(nu,e)?!1:Um.test(e)?su[e]=!0:(nu[e]=!0,!1)}function Km(e,t,n,s){if(n!==null&&n.type===0)return!1;switch(typeof t){case"function":case"symbol":return!0;case"boolean":return s?!1:n!==null?!n.acceptsBooleans:(e=e.toLowerCase().slice(0,5),e!=="data-"&&e!=="aria-");default:return!1}}function zm(e,t,n,s){if(t===null||typeof t>"u"||Km(e,t,n,s))return!0;if(s)return!1;if(n!==null)switch(n.type){case 3:return!t;case 4:return t===!1;case 5:return isNaN(t);case 6:return isNaN(t)||1>t}return!1}function Xe(e,t,n,s,r,i,a){this.acceptsBooleans=t===2||t===3||t===4,this.attributeName=s,this.attributeNamespace=r,this.mustUseProperty=n,this.propertyName=e,this.type=t,this.sanitizeURL=i,this.removeEmptyString=a}var Be={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e){Be[e]=new Xe(e,0,!1,e,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(e){var t=e[0];Be[t]=new Xe(t,1,!1,e[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(e){Be[e]=new Xe(e,2,!1,e.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(e){Be[e]=new Xe(e,2,!1,e,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e){Be[e]=new Xe(e,3,!1,e.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(e){Be[e]=new Xe(e,3,!0,e,null,!1,!1)});["capture","download"].forEach(function(e){Be[e]=new Xe(e,4,!1,e,null,!1,!1)});["cols","rows","size","span"].forEach(function(e){Be[e]=new Xe(e,6,!1,e,null,!1,!1)});["rowSpan","start"].forEach(function(e){Be[e]=new Xe(e,5,!1,e.toLowerCase(),null,!1,!1)});var mo=/[\-:]([a-z])/g;function vo(e){return e[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e){var t=e.replace(mo,vo);Be[t]=new Xe(t,1,!1,e,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e){var t=e.replace(mo,vo);Be[t]=new Xe(t,1,!1,e,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(e){var t=e.replace(mo,vo);Be[t]=new Xe(t,1,!1,e,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(e){Be[e]=new Xe(e,1,!1,e.toLowerCase(),null,!1,!1)});Be.xlinkHref=new Xe("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(e){Be[e]=new Xe(e,1,!1,e.toLowerCase(),null,!0,!0)});function yo(e,t,n,s){var r=Be.hasOwnProperty(t)?Be[t]:null;(r!==null?r.type!==0:s||!(2<t.length)||t[0]!=="o"&&t[0]!=="O"||t[1]!=="n"&&t[1]!=="N")&&(zm(t,n,r,s)&&(n=null),s||r===null?Bm(t)&&(n===null?e.removeAttribute(t):e.setAttribute(t,""+n)):r.mustUseProperty?e[r.propertyName]=n===null?r.type===3?!1:"":n:(t=r.attributeName,s=r.attributeNamespace,n===null?e.removeAttribute(t):(r=r.type,n=r===3||r===4&&n===!0?"":""+n,s?e.setAttributeNS(s,t,n):e.setAttribute(t,n))))}var sn=Om.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,ai=Symbol.for("react.element"),as=Symbol.for("react.portal"),ls=Symbol.for("react.fragment"),ho=Symbol.for("react.strict_mode"),Nl=Symbol.for("react.profiler"),cd=Symbol.for("react.provider"),ud=Symbol.for("react.context"),go=Symbol.for("react.forward_ref"),kl=Symbol.for("react.suspense"),_l=Symbol.for("react.suspense_list"),$o=Symbol.for("react.memo"),dn=Symbol.for("react.lazy"),dd=Symbol.for("react.offscreen"),ru=Symbol.iterator;function Ws(e){return e===null||typeof e!="object"?null:(e=ru&&e[ru]||e["@@iterator"],typeof e=="function"?e:null)}var Ce=Object.assign,Za;function tr(e){if(Za===void 0)try{throw Error()}catch(n){var t=n.stack.trim().match(/\n( *(at )?)/);Za=t&&t[1]||""}return`
`+Za+e}var el=!1;function tl(e,t){if(!e||el)return"";el=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(t)if(t=function(){throw Error()},Object.defineProperty(t.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(t,[])}catch(o){var s=o}Reflect.construct(e,[],t)}else{try{t.call()}catch(o){s=o}e.call(t.prototype)}else{try{throw Error()}catch(o){s=o}e()}}catch(o){if(o&&s&&typeof o.stack=="string"){for(var r=o.stack.split(`
`),i=s.stack.split(`
`),a=r.length-1,l=i.length-1;1<=a&&0<=l&&r[a]!==i[l];)l--;for(;1<=a&&0<=l;a--,l--)if(r[a]!==i[l]){if(a!==1||l!==1)do if(a--,l--,0>l||r[a]!==i[l]){var u=`
`+r[a].replace(" at new "," at ");return e.displayName&&u.includes("<anonymous>")&&(u=u.replace("<anonymous>",e.displayName)),u}while(1<=a&&0<=l);break}}}finally{el=!1,Error.prepareStackTrace=n}return(e=e?e.displayName||e.name:"")?tr(e):""}function Hm(e){switch(e.tag){case 5:return tr(e.type);case 16:return tr("Lazy");case 13:return tr("Suspense");case 19:return tr("SuspenseList");case 0:case 2:case 15:return e=tl(e.type,!1),e;case 11:return e=tl(e.type.render,!1),e;case 1:return e=tl(e.type,!0),e;default:return""}}function Sl(e){if(e==null)return null;if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case ls:return"Fragment";case as:return"Portal";case Nl:return"Profiler";case ho:return"StrictMode";case kl:return"Suspense";case _l:return"SuspenseList"}if(typeof e=="object")switch(e.$$typeof){case ud:return(e.displayName||"Context")+".Consumer";case cd:return(e._context.displayName||"Context")+".Provider";case go:var t=e.render;return e=e.displayName,e||(e=t.displayName||t.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case $o:return t=e.displayName||null,t!==null?t:Sl(e.type)||"Memo";case dn:t=e._payload,e=e._init;try{return Sl(e(t))}catch{}}return null}function Fm(e){var t=e.type;switch(e.tag){case 24:return"Cache";case 9:return(t.displayName||"Context")+".Consumer";case 10:return(t._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return e=t.render,e=e.displayName||e.name||"",t.displayName||(e!==""?"ForwardRef("+e+")":"ForwardRef");case 7:return"Fragment";case 5:return t;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return Sl(t);case 8:return t===ho?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t}return null}function Sn(e){switch(typeof e){case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function pd(e){var t=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(t==="checkbox"||t==="radio")}function qm(e){var t=pd(e)?"checked":"value",n=Object.getOwnPropertyDescriptor(e.constructor.prototype,t),s=""+e[t];if(!e.hasOwnProperty(t)&&typeof n<"u"&&typeof n.get=="function"&&typeof n.set=="function"){var r=n.get,i=n.set;return Object.defineProperty(e,t,{configurable:!0,get:function(){return r.call(this)},set:function(a){s=""+a,i.call(this,a)}}),Object.defineProperty(e,t,{enumerable:n.enumerable}),{getValue:function(){return s},setValue:function(a){s=""+a},stopTracking:function(){e._valueTracker=null,delete e[t]}}}}function li(e){e._valueTracker||(e._valueTracker=qm(e))}function fd(e){if(!e)return!1;var t=e._valueTracker;if(!t)return!0;var n=t.getValue(),s="";return e&&(s=pd(e)?e.checked?"true":"false":e.value),e=s,e!==n?(t.setValue(e),!0):!1}function Pi(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}function El(e,t){var n=t.checked;return Ce({},t,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:n??e._wrapperState.initialChecked})}function iu(e,t){var n=t.defaultValue==null?"":t.defaultValue,s=t.checked!=null?t.checked:t.defaultChecked;n=Sn(t.value!=null?t.value:n),e._wrapperState={initialChecked:s,initialValue:n,controlled:t.type==="checkbox"||t.type==="radio"?t.checked!=null:t.value!=null}}function md(e,t){t=t.checked,t!=null&&yo(e,"checked",t,!1)}function Cl(e,t){md(e,t);var n=Sn(t.value),s=t.type;if(n!=null)s==="number"?(n===0&&e.value===""||e.value!=n)&&(e.value=""+n):e.value!==""+n&&(e.value=""+n);else if(s==="submit"||s==="reset"){e.removeAttribute("value");return}t.hasOwnProperty("value")?Tl(e,t.type,n):t.hasOwnProperty("defaultValue")&&Tl(e,t.type,Sn(t.defaultValue)),t.checked==null&&t.defaultChecked!=null&&(e.defaultChecked=!!t.defaultChecked)}function au(e,t,n){if(t.hasOwnProperty("value")||t.hasOwnProperty("defaultValue")){var s=t.type;if(!(s!=="submit"&&s!=="reset"||t.value!==void 0&&t.value!==null))return;t=""+e._wrapperState.initialValue,n||t===e.value||(e.value=t),e.defaultValue=t}n=e.name,n!==""&&(e.name=""),e.defaultChecked=!!e._wrapperState.initialChecked,n!==""&&(e.name=n)}function Tl(e,t,n){(t!=="number"||Pi(e.ownerDocument)!==e)&&(n==null?e.defaultValue=""+e._wrapperState.initialValue:e.defaultValue!==""+n&&(e.defaultValue=""+n))}var nr=Array.isArray;function gs(e,t,n,s){if(e=e.options,t){t={};for(var r=0;r<n.length;r++)t["$"+n[r]]=!0;for(n=0;n<e.length;n++)r=t.hasOwnProperty("$"+e[n].value),e[n].selected!==r&&(e[n].selected=r),r&&s&&(e[n].defaultSelected=!0)}else{for(n=""+Sn(n),t=null,r=0;r<e.length;r++){if(e[r].value===n){e[r].selected=!0,s&&(e[r].defaultSelected=!0);return}t!==null||e[r].disabled||(t=e[r])}t!==null&&(t.selected=!0)}}function Al(e,t){if(t.dangerouslySetInnerHTML!=null)throw Error(F(91));return Ce({},t,{value:void 0,defaultValue:void 0,children:""+e._wrapperState.initialValue})}function lu(e,t){var n=t.value;if(n==null){if(n=t.children,t=t.defaultValue,n!=null){if(t!=null)throw Error(F(92));if(nr(n)){if(1<n.length)throw Error(F(93));n=n[0]}t=n}t==null&&(t=""),n=t}e._wrapperState={initialValue:Sn(n)}}function vd(e,t){var n=Sn(t.value),s=Sn(t.defaultValue);n!=null&&(n=""+n,n!==e.value&&(e.value=n),t.defaultValue==null&&e.defaultValue!==n&&(e.defaultValue=n)),s!=null&&(e.defaultValue=""+s)}function ou(e){var t=e.textContent;t===e._wrapperState.initialValue&&t!==""&&t!==null&&(e.value=t)}function yd(e){switch(e){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function xl(e,t){return e==null||e==="http://www.w3.org/1999/xhtml"?yd(t):e==="http://www.w3.org/2000/svg"&&t==="foreignObject"?"http://www.w3.org/1999/xhtml":e}var oi,hd=(function(e){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(t,n,s,r){MSApp.execUnsafeLocalFunction(function(){return e(t,n,s,r)})}:e})(function(e,t){if(e.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in e)e.innerHTML=t;else{for(oi=oi||document.createElement("div"),oi.innerHTML="<svg>"+t.valueOf().toString()+"</svg>",t=oi.firstChild;e.firstChild;)e.removeChild(e.firstChild);for(;t.firstChild;)e.appendChild(t.firstChild)}});function vr(e,t){if(t){var n=e.firstChild;if(n&&n===e.lastChild&&n.nodeType===3){n.nodeValue=t;return}}e.textContent=t}var ir={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},Gm=["Webkit","ms","Moz","O"];Object.keys(ir).forEach(function(e){Gm.forEach(function(t){t=t+e.charAt(0).toUpperCase()+e.substring(1),ir[t]=ir[e]})});function gd(e,t,n){return t==null||typeof t=="boolean"||t===""?"":n||typeof t!="number"||t===0||ir.hasOwnProperty(e)&&ir[e]?(""+t).trim():t+"px"}function $d(e,t){e=e.style;for(var n in t)if(t.hasOwnProperty(n)){var s=n.indexOf("--")===0,r=gd(n,t[n],s);n==="float"&&(n="cssFloat"),s?e.setProperty(n,r):e[n]=r}}var Vm=Ce({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Dl(e,t){if(t){if(Vm[e]&&(t.children!=null||t.dangerouslySetInnerHTML!=null))throw Error(F(137,e));if(t.dangerouslySetInnerHTML!=null){if(t.children!=null)throw Error(F(60));if(typeof t.dangerouslySetInnerHTML!="object"||!("__html"in t.dangerouslySetInnerHTML))throw Error(F(61))}if(t.style!=null&&typeof t.style!="object")throw Error(F(62))}}function Rl(e,t){if(e.indexOf("-")===-1)return typeof t.is=="string";switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Il=null;function wo(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var Ll=null,$s=null,ws=null;function cu(e){if(e=Ir(e)){if(typeof Ll!="function")throw Error(F(280));var t=e.stateNode;t&&(t=ca(t),Ll(e.stateNode,e.type,t))}}function wd(e){$s?ws?ws.push(e):ws=[e]:$s=e}function bd(){if($s){var e=$s,t=ws;if(ws=$s=null,cu(e),t)for(e=0;e<t.length;e++)cu(t[e])}}function Nd(e,t){return e(t)}function kd(){}var nl=!1;function _d(e,t,n){if(nl)return e(t,n);nl=!0;try{return Nd(e,t,n)}finally{nl=!1,($s!==null||ws!==null)&&(kd(),bd())}}function yr(e,t){var n=e.stateNode;if(n===null)return null;var s=ca(n);if(s===null)return null;n=s[t];e:switch(t){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(s=!s.disabled)||(e=e.type,s=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!s;break e;default:e=!1}if(e)return null;if(n&&typeof n!="function")throw Error(F(231,t,typeof n));return n}var Pl=!1;if(Zt)try{rs={},Object.defineProperty(rs,"passive",{get:function(){Pl=!0}}),window.addEventListener("test",rs,rs),window.removeEventListener("test",rs,rs)}catch{Pl=!1}var rs;function Wm(e,t,n,s,r,i,a,l,u){var o=Array.prototype.slice.call(arguments,3);try{t.apply(n,o)}catch(h){this.onError(h)}}var ar=!1,Mi=null,Oi=!1,Ml=null,jm={onError:function(e){ar=!0,Mi=e}};function Ym(e,t,n,s,r,i,a,l,u){ar=!1,Mi=null,Wm.apply(jm,arguments)}function Qm(e,t,n,s,r,i,a,l,u){if(Ym.apply(this,arguments),ar){if(ar){var o=Mi;ar=!1,Mi=null}else throw Error(F(198));Oi||(Oi=!0,Ml=o)}}function Yn(e){var t=e,n=e;if(e.alternate)for(;t.return;)t=t.return;else{e=t;do t=e,(t.flags&4098)!==0&&(n=t.return),e=t.return;while(e)}return t.tag===3?n:null}function Sd(e){if(e.tag===13){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function uu(e){if(Yn(e)!==e)throw Error(F(188))}function Xm(e){var t=e.alternate;if(!t){if(t=Yn(e),t===null)throw Error(F(188));return t!==e?null:e}for(var n=e,s=t;;){var r=n.return;if(r===null)break;var i=r.alternate;if(i===null){if(s=r.return,s!==null){n=s;continue}break}if(r.child===i.child){for(i=r.child;i;){if(i===n)return uu(r),e;if(i===s)return uu(r),t;i=i.sibling}throw Error(F(188))}if(n.return!==s.return)n=r,s=i;else{for(var a=!1,l=r.child;l;){if(l===n){a=!0,n=r,s=i;break}if(l===s){a=!0,s=r,n=i;break}l=l.sibling}if(!a){for(l=i.child;l;){if(l===n){a=!0,n=i,s=r;break}if(l===s){a=!0,s=i,n=r;break}l=l.sibling}if(!a)throw Error(F(189))}}if(n.alternate!==s)throw Error(F(190))}if(n.tag!==3)throw Error(F(188));return n.stateNode.current===n?e:t}function Ed(e){return e=Xm(e),e!==null?Cd(e):null}function Cd(e){if(e.tag===5||e.tag===6)return e;for(e=e.child;e!==null;){var t=Cd(e);if(t!==null)return t;e=e.sibling}return null}var Td=dt.unstable_scheduleCallback,du=dt.unstable_cancelCallback,Jm=dt.unstable_shouldYield,Zm=dt.unstable_requestPaint,Ae=dt.unstable_now,ev=dt.unstable_getCurrentPriorityLevel,bo=dt.unstable_ImmediatePriority,Ad=dt.unstable_UserBlockingPriority,Ui=dt.unstable_NormalPriority,tv=dt.unstable_LowPriority,xd=dt.unstable_IdlePriority,ia=null,Ht=null;function nv(e){if(Ht&&typeof Ht.onCommitFiberRoot=="function")try{Ht.onCommitFiberRoot(ia,e,void 0,(e.current.flags&128)===128)}catch{}}var Dt=Math.clz32?Math.clz32:iv,sv=Math.log,rv=Math.LN2;function iv(e){return e>>>=0,e===0?32:31-(sv(e)/rv|0)|0}var ci=64,ui=4194304;function sr(e){switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return e&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return e}}function Bi(e,t){var n=e.pendingLanes;if(n===0)return 0;var s=0,r=e.suspendedLanes,i=e.pingedLanes,a=n&268435455;if(a!==0){var l=a&~r;l!==0?s=sr(l):(i&=a,i!==0&&(s=sr(i)))}else a=n&~r,a!==0?s=sr(a):i!==0&&(s=sr(i));if(s===0)return 0;if(t!==0&&t!==s&&(t&r)===0&&(r=s&-s,i=t&-t,r>=i||r===16&&(i&4194240)!==0))return t;if((s&4)!==0&&(s|=n&16),t=e.entangledLanes,t!==0)for(e=e.entanglements,t&=s;0<t;)n=31-Dt(t),r=1<<n,s|=e[n],t&=~r;return s}function av(e,t){switch(e){case 1:case 2:case 4:return t+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function lv(e,t){for(var n=e.suspendedLanes,s=e.pingedLanes,r=e.expirationTimes,i=e.pendingLanes;0<i;){var a=31-Dt(i),l=1<<a,u=r[a];u===-1?((l&n)===0||(l&s)!==0)&&(r[a]=av(l,t)):u<=t&&(e.expiredLanes|=l),i&=~l}}function Ol(e){return e=e.pendingLanes&-1073741825,e!==0?e:e&1073741824?1073741824:0}function Dd(){var e=ci;return ci<<=1,(ci&4194240)===0&&(ci=64),e}function sl(e){for(var t=[],n=0;31>n;n++)t.push(e);return t}function Dr(e,t,n){e.pendingLanes|=t,t!==536870912&&(e.suspendedLanes=0,e.pingedLanes=0),e=e.eventTimes,t=31-Dt(t),e[t]=n}function ov(e,t){var n=e.pendingLanes&~t;e.pendingLanes=t,e.suspendedLanes=0,e.pingedLanes=0,e.expiredLanes&=t,e.mutableReadLanes&=t,e.entangledLanes&=t,t=e.entanglements;var s=e.eventTimes;for(e=e.expirationTimes;0<n;){var r=31-Dt(n),i=1<<r;t[r]=0,s[r]=-1,e[r]=-1,n&=~i}}function No(e,t){var n=e.entangledLanes|=t;for(e=e.entanglements;n;){var s=31-Dt(n),r=1<<s;r&t|e[s]&t&&(e[s]|=t),n&=~r}}var pe=0;function Rd(e){return e&=-e,1<e?4<e?(e&268435455)!==0?16:536870912:4:1}var Id,ko,Ld,Pd,Md,Ul=!1,di=[],hn=null,gn=null,$n=null,hr=new Map,gr=new Map,fn=[],cv="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function pu(e,t){switch(e){case"focusin":case"focusout":hn=null;break;case"dragenter":case"dragleave":gn=null;break;case"mouseover":case"mouseout":$n=null;break;case"pointerover":case"pointerout":hr.delete(t.pointerId);break;case"gotpointercapture":case"lostpointercapture":gr.delete(t.pointerId)}}function js(e,t,n,s,r,i){return e===null||e.nativeEvent!==i?(e={blockedOn:t,domEventName:n,eventSystemFlags:s,nativeEvent:i,targetContainers:[r]},t!==null&&(t=Ir(t),t!==null&&ko(t)),e):(e.eventSystemFlags|=s,t=e.targetContainers,r!==null&&t.indexOf(r)===-1&&t.push(r),e)}function uv(e,t,n,s,r){switch(t){case"focusin":return hn=js(hn,e,t,n,s,r),!0;case"dragenter":return gn=js(gn,e,t,n,s,r),!0;case"mouseover":return $n=js($n,e,t,n,s,r),!0;case"pointerover":var i=r.pointerId;return hr.set(i,js(hr.get(i)||null,e,t,n,s,r)),!0;case"gotpointercapture":return i=r.pointerId,gr.set(i,js(gr.get(i)||null,e,t,n,s,r)),!0}return!1}function Od(e){var t=Un(e.target);if(t!==null){var n=Yn(t);if(n!==null){if(t=n.tag,t===13){if(t=Sd(n),t!==null){e.blockedOn=t,Md(e.priority,function(){Ld(n)});return}}else if(t===3&&n.stateNode.current.memoizedState.isDehydrated){e.blockedOn=n.tag===3?n.stateNode.containerInfo:null;return}}}e.blockedOn=null}function Si(e){if(e.blockedOn!==null)return!1;for(var t=e.targetContainers;0<t.length;){var n=Bl(e.domEventName,e.eventSystemFlags,t[0],e.nativeEvent);if(n===null){n=e.nativeEvent;var s=new n.constructor(n.type,n);Il=s,n.target.dispatchEvent(s),Il=null}else return t=Ir(n),t!==null&&ko(t),e.blockedOn=n,!1;t.shift()}return!0}function fu(e,t,n){Si(e)&&n.delete(t)}function dv(){Ul=!1,hn!==null&&Si(hn)&&(hn=null),gn!==null&&Si(gn)&&(gn=null),$n!==null&&Si($n)&&($n=null),hr.forEach(fu),gr.forEach(fu)}function Ys(e,t){e.blockedOn===t&&(e.blockedOn=null,Ul||(Ul=!0,dt.unstable_scheduleCallback(dt.unstable_NormalPriority,dv)))}function $r(e){function t(r){return Ys(r,e)}if(0<di.length){Ys(di[0],e);for(var n=1;n<di.length;n++){var s=di[n];s.blockedOn===e&&(s.blockedOn=null)}}for(hn!==null&&Ys(hn,e),gn!==null&&Ys(gn,e),$n!==null&&Ys($n,e),hr.forEach(t),gr.forEach(t),n=0;n<fn.length;n++)s=fn[n],s.blockedOn===e&&(s.blockedOn=null);for(;0<fn.length&&(n=fn[0],n.blockedOn===null);)Od(n),n.blockedOn===null&&fn.shift()}var bs=sn.ReactCurrentBatchConfig,Ki=!0;function pv(e,t,n,s){var r=pe,i=bs.transition;bs.transition=null;try{pe=1,_o(e,t,n,s)}finally{pe=r,bs.transition=i}}function fv(e,t,n,s){var r=pe,i=bs.transition;bs.transition=null;try{pe=4,_o(e,t,n,s)}finally{pe=r,bs.transition=i}}function _o(e,t,n,s){if(Ki){var r=Bl(e,t,n,s);if(r===null)ul(e,t,s,zi,n),pu(e,s);else if(uv(r,e,t,n,s))s.stopPropagation();else if(pu(e,s),t&4&&-1<cv.indexOf(e)){for(;r!==null;){var i=Ir(r);if(i!==null&&Id(i),i=Bl(e,t,n,s),i===null&&ul(e,t,s,zi,n),i===r)break;r=i}r!==null&&s.stopPropagation()}else ul(e,t,s,null,n)}}var zi=null;function Bl(e,t,n,s){if(zi=null,e=wo(s),e=Un(e),e!==null)if(t=Yn(e),t===null)e=null;else if(n=t.tag,n===13){if(e=Sd(t),e!==null)return e;e=null}else if(n===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;e=null}else t!==e&&(e=null);return zi=e,null}function Ud(e){switch(e){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(ev()){case bo:return 1;case Ad:return 4;case Ui:case tv:return 16;case xd:return 536870912;default:return 16}default:return 16}}var vn=null,So=null,Ei=null;function Bd(){if(Ei)return Ei;var e,t=So,n=t.length,s,r="value"in vn?vn.value:vn.textContent,i=r.length;for(e=0;e<n&&t[e]===r[e];e++);var a=n-e;for(s=1;s<=a&&t[n-s]===r[i-s];s++);return Ei=r.slice(e,1<s?1-s:void 0)}function Ci(e){var t=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&t===13&&(e=13)):e=t,e===10&&(e=13),32<=e||e===13?e:0}function pi(){return!0}function mu(){return!1}function pt(e){function t(n,s,r,i,a){this._reactName=n,this._targetInst=r,this.type=s,this.nativeEvent=i,this.target=a,this.currentTarget=null;for(var l in e)e.hasOwnProperty(l)&&(n=e[l],this[l]=n?n(i):i[l]);return this.isDefaultPrevented=(i.defaultPrevented!=null?i.defaultPrevented:i.returnValue===!1)?pi:mu,this.isPropagationStopped=mu,this}return Ce(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var n=this.nativeEvent;n&&(n.preventDefault?n.preventDefault():typeof n.returnValue!="unknown"&&(n.returnValue=!1),this.isDefaultPrevented=pi)},stopPropagation:function(){var n=this.nativeEvent;n&&(n.stopPropagation?n.stopPropagation():typeof n.cancelBubble!="unknown"&&(n.cancelBubble=!0),this.isPropagationStopped=pi)},persist:function(){},isPersistent:pi}),t}var Ds={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Eo=pt(Ds),Rr=Ce({},Ds,{view:0,detail:0}),mv=pt(Rr),rl,il,Qs,aa=Ce({},Rr,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Co,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==Qs&&(Qs&&e.type==="mousemove"?(rl=e.screenX-Qs.screenX,il=e.screenY-Qs.screenY):il=rl=0,Qs=e),rl)},movementY:function(e){return"movementY"in e?e.movementY:il}}),vu=pt(aa),vv=Ce({},aa,{dataTransfer:0}),yv=pt(vv),hv=Ce({},Rr,{relatedTarget:0}),al=pt(hv),gv=Ce({},Ds,{animationName:0,elapsedTime:0,pseudoElement:0}),$v=pt(gv),wv=Ce({},Ds,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),bv=pt(wv),Nv=Ce({},Ds,{data:0}),yu=pt(Nv),kv={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},_v={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},Sv={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function Ev(e){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(e):(e=Sv[e])?!!t[e]:!1}function Co(){return Ev}var Cv=Ce({},Rr,{key:function(e){if(e.key){var t=kv[e.key]||e.key;if(t!=="Unidentified")return t}return e.type==="keypress"?(e=Ci(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?_v[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Co,charCode:function(e){return e.type==="keypress"?Ci(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?Ci(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),Tv=pt(Cv),Av=Ce({},aa,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),hu=pt(Av),xv=Ce({},Rr,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Co}),Dv=pt(xv),Rv=Ce({},Ds,{propertyName:0,elapsedTime:0,pseudoElement:0}),Iv=pt(Rv),Lv=Ce({},aa,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),Pv=pt(Lv),Mv=[9,13,27,32],To=Zt&&"CompositionEvent"in window,lr=null;Zt&&"documentMode"in document&&(lr=document.documentMode);var Ov=Zt&&"TextEvent"in window&&!lr,Kd=Zt&&(!To||lr&&8<lr&&11>=lr),gu=" ",$u=!1;function zd(e,t){switch(e){case"keyup":return Mv.indexOf(t.keyCode)!==-1;case"keydown":return t.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function Hd(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}var os=!1;function Uv(e,t){switch(e){case"compositionend":return Hd(t);case"keypress":return t.which!==32?null:($u=!0,gu);case"textInput":return e=t.data,e===gu&&$u?null:e;default:return null}}function Bv(e,t){if(os)return e==="compositionend"||!To&&zd(e,t)?(e=Bd(),Ei=So=vn=null,os=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case"compositionend":return Kd&&t.locale!=="ko"?null:t.data;default:return null}}var Kv={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function wu(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t==="input"?!!Kv[e.type]:t==="textarea"}function Fd(e,t,n,s){wd(s),t=Hi(t,"onChange"),0<t.length&&(n=new Eo("onChange","change",null,n,s),e.push({event:n,listeners:t}))}var or=null,wr=null;function zv(e){ep(e,0)}function la(e){var t=ds(e);if(fd(t))return e}function Hv(e,t){if(e==="change")return t}var qd=!1;Zt&&(Zt?(mi="oninput"in document,mi||(ll=document.createElement("div"),ll.setAttribute("oninput","return;"),mi=typeof ll.oninput=="function"),fi=mi):fi=!1,qd=fi&&(!document.documentMode||9<document.documentMode));var fi,mi,ll;function bu(){or&&(or.detachEvent("onpropertychange",Gd),wr=or=null)}function Gd(e){if(e.propertyName==="value"&&la(wr)){var t=[];Fd(t,wr,e,wo(e)),_d(zv,t)}}function Fv(e,t,n){e==="focusin"?(bu(),or=t,wr=n,or.attachEvent("onpropertychange",Gd)):e==="focusout"&&bu()}function qv(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return la(wr)}function Gv(e,t){if(e==="click")return la(t)}function Vv(e,t){if(e==="input"||e==="change")return la(t)}function Wv(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var It=typeof Object.is=="function"?Object.is:Wv;function br(e,t){if(It(e,t))return!0;if(typeof e!="object"||e===null||typeof t!="object"||t===null)return!1;var n=Object.keys(e),s=Object.keys(t);if(n.length!==s.length)return!1;for(s=0;s<n.length;s++){var r=n[s];if(!bl.call(t,r)||!It(e[r],t[r]))return!1}return!0}function Nu(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function ku(e,t){var n=Nu(e);e=0;for(var s;n;){if(n.nodeType===3){if(s=e+n.textContent.length,e<=t&&s>=t)return{node:n,offset:t-e};e=s}e:{for(;n;){if(n.nextSibling){n=n.nextSibling;break e}n=n.parentNode}n=void 0}n=Nu(n)}}function Vd(e,t){return e&&t?e===t?!0:e&&e.nodeType===3?!1:t&&t.nodeType===3?Vd(e,t.parentNode):"contains"in e?e.contains(t):e.compareDocumentPosition?!!(e.compareDocumentPosition(t)&16):!1:!1}function Wd(){for(var e=window,t=Pi();t instanceof e.HTMLIFrameElement;){try{var n=typeof t.contentWindow.location.href=="string"}catch{n=!1}if(n)e=t.contentWindow;else break;t=Pi(e.document)}return t}function Ao(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t&&(t==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||t==="textarea"||e.contentEditable==="true")}function jv(e){var t=Wd(),n=e.focusedElem,s=e.selectionRange;if(t!==n&&n&&n.ownerDocument&&Vd(n.ownerDocument.documentElement,n)){if(s!==null&&Ao(n)){if(t=s.start,e=s.end,e===void 0&&(e=t),"selectionStart"in n)n.selectionStart=t,n.selectionEnd=Math.min(e,n.value.length);else if(e=(t=n.ownerDocument||document)&&t.defaultView||window,e.getSelection){e=e.getSelection();var r=n.textContent.length,i=Math.min(s.start,r);s=s.end===void 0?i:Math.min(s.end,r),!e.extend&&i>s&&(r=s,s=i,i=r),r=ku(n,i);var a=ku(n,s);r&&a&&(e.rangeCount!==1||e.anchorNode!==r.node||e.anchorOffset!==r.offset||e.focusNode!==a.node||e.focusOffset!==a.offset)&&(t=t.createRange(),t.setStart(r.node,r.offset),e.removeAllRanges(),i>s?(e.addRange(t),e.extend(a.node,a.offset)):(t.setEnd(a.node,a.offset),e.addRange(t)))}}for(t=[],e=n;e=e.parentNode;)e.nodeType===1&&t.push({element:e,left:e.scrollLeft,top:e.scrollTop});for(typeof n.focus=="function"&&n.focus(),n=0;n<t.length;n++)e=t[n],e.element.scrollLeft=e.left,e.element.scrollTop=e.top}}var Yv=Zt&&"documentMode"in document&&11>=document.documentMode,cs=null,Kl=null,cr=null,zl=!1;function _u(e,t,n){var s=n.window===n?n.document:n.nodeType===9?n:n.ownerDocument;zl||cs==null||cs!==Pi(s)||(s=cs,"selectionStart"in s&&Ao(s)?s={start:s.selectionStart,end:s.selectionEnd}:(s=(s.ownerDocument&&s.ownerDocument.defaultView||window).getSelection(),s={anchorNode:s.anchorNode,anchorOffset:s.anchorOffset,focusNode:s.focusNode,focusOffset:s.focusOffset}),cr&&br(cr,s)||(cr=s,s=Hi(Kl,"onSelect"),0<s.length&&(t=new Eo("onSelect","select",null,t,n),e.push({event:t,listeners:s}),t.target=cs)))}function vi(e,t){var n={};return n[e.toLowerCase()]=t.toLowerCase(),n["Webkit"+e]="webkit"+t,n["Moz"+e]="moz"+t,n}var us={animationend:vi("Animation","AnimationEnd"),animationiteration:vi("Animation","AnimationIteration"),animationstart:vi("Animation","AnimationStart"),transitionend:vi("Transition","TransitionEnd")},ol={},jd={};Zt&&(jd=document.createElement("div").style,"AnimationEvent"in window||(delete us.animationend.animation,delete us.animationiteration.animation,delete us.animationstart.animation),"TransitionEvent"in window||delete us.transitionend.transition);function oa(e){if(ol[e])return ol[e];if(!us[e])return e;var t=us[e],n;for(n in t)if(t.hasOwnProperty(n)&&n in jd)return ol[e]=t[n];return e}var Yd=oa("animationend"),Qd=oa("animationiteration"),Xd=oa("animationstart"),Jd=oa("transitionend"),Zd=new Map,Su="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function Cn(e,t){Zd.set(e,t),jn(t,[e])}for(yi=0;yi<Su.length;yi++)hi=Su[yi],Eu=hi.toLowerCase(),Cu=hi[0].toUpperCase()+hi.slice(1),Cn(Eu,"on"+Cu);var hi,Eu,Cu,yi;Cn(Yd,"onAnimationEnd");Cn(Qd,"onAnimationIteration");Cn(Xd,"onAnimationStart");Cn("dblclick","onDoubleClick");Cn("focusin","onFocus");Cn("focusout","onBlur");Cn(Jd,"onTransitionEnd");_s("onMouseEnter",["mouseout","mouseover"]);_s("onMouseLeave",["mouseout","mouseover"]);_s("onPointerEnter",["pointerout","pointerover"]);_s("onPointerLeave",["pointerout","pointerover"]);jn("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));jn("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));jn("onBeforeInput",["compositionend","keypress","textInput","paste"]);jn("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));jn("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));jn("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var rr="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),Qv=new Set("cancel close invalid load scroll toggle".split(" ").concat(rr));function Tu(e,t,n){var s=e.type||"unknown-event";e.currentTarget=n,Qm(s,t,void 0,e),e.currentTarget=null}function ep(e,t){t=(t&4)!==0;for(var n=0;n<e.length;n++){var s=e[n],r=s.event;s=s.listeners;e:{var i=void 0;if(t)for(var a=s.length-1;0<=a;a--){var l=s[a],u=l.instance,o=l.currentTarget;if(l=l.listener,u!==i&&r.isPropagationStopped())break e;Tu(r,l,o),i=u}else for(a=0;a<s.length;a++){if(l=s[a],u=l.instance,o=l.currentTarget,l=l.listener,u!==i&&r.isPropagationStopped())break e;Tu(r,l,o),i=u}}}if(Oi)throw e=Ml,Oi=!1,Ml=null,e}function he(e,t){var n=t[Vl];n===void 0&&(n=t[Vl]=new Set);var s=e+"__bubble";n.has(s)||(tp(t,e,2,!1),n.add(s))}function cl(e,t,n){var s=0;t&&(s|=4),tp(n,e,s,t)}var gi="_reactListening"+Math.random().toString(36).slice(2);function Nr(e){if(!e[gi]){e[gi]=!0,od.forEach(function(n){n!=="selectionchange"&&(Qv.has(n)||cl(n,!1,e),cl(n,!0,e))});var t=e.nodeType===9?e:e.ownerDocument;t===null||t[gi]||(t[gi]=!0,cl("selectionchange",!1,t))}}function tp(e,t,n,s){switch(Ud(t)){case 1:var r=pv;break;case 4:r=fv;break;default:r=_o}n=r.bind(null,t,n,e),r=void 0,!Pl||t!=="touchstart"&&t!=="touchmove"&&t!=="wheel"||(r=!0),s?r!==void 0?e.addEventListener(t,n,{capture:!0,passive:r}):e.addEventListener(t,n,!0):r!==void 0?e.addEventListener(t,n,{passive:r}):e.addEventListener(t,n,!1)}function ul(e,t,n,s,r){var i=s;if((t&1)===0&&(t&2)===0&&s!==null)e:for(;;){if(s===null)return;var a=s.tag;if(a===3||a===4){var l=s.stateNode.containerInfo;if(l===r||l.nodeType===8&&l.parentNode===r)break;if(a===4)for(a=s.return;a!==null;){var u=a.tag;if((u===3||u===4)&&(u=a.stateNode.containerInfo,u===r||u.nodeType===8&&u.parentNode===r))return;a=a.return}for(;l!==null;){if(a=Un(l),a===null)return;if(u=a.tag,u===5||u===6){s=i=a;continue e}l=l.parentNode}}s=s.return}_d(function(){var o=i,h=wo(n),g=[];e:{var v=Zd.get(e);if(v!==void 0){var w=Eo,S=e;switch(e){case"keypress":if(Ci(n)===0)break e;case"keydown":case"keyup":w=Tv;break;case"focusin":S="focus",w=al;break;case"focusout":S="blur",w=al;break;case"beforeblur":case"afterblur":w=al;break;case"click":if(n.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":w=vu;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":w=yv;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":w=Dv;break;case Yd:case Qd:case Xd:w=$v;break;case Jd:w=Iv;break;case"scroll":w=mv;break;case"wheel":w=Pv;break;case"copy":case"cut":case"paste":w=bv;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":w=hu}var b=(t&4)!==0,C=!b&&e==="scroll",y=b?v!==null?v+"Capture":null:v;b=[];for(var m=o,p;m!==null;){p=m;var _=p.stateNode;if(p.tag===5&&_!==null&&(p=_,y!==null&&(_=yr(m,y),_!=null&&b.push(kr(m,_,p)))),C)break;m=m.return}0<b.length&&(v=new w(v,S,null,n,h),g.push({event:v,listeners:b}))}}if((t&7)===0){e:{if(v=e==="mouseover"||e==="pointerover",w=e==="mouseout"||e==="pointerout",v&&n!==Il&&(S=n.relatedTarget||n.fromElement)&&(Un(S)||S[en]))break e;if((w||v)&&(v=h.window===h?h:(v=h.ownerDocument)?v.defaultView||v.parentWindow:window,w?(S=n.relatedTarget||n.toElement,w=o,S=S?Un(S):null,S!==null&&(C=Yn(S),S!==C||S.tag!==5&&S.tag!==6)&&(S=null)):(w=null,S=o),w!==S)){if(b=vu,_="onMouseLeave",y="onMouseEnter",m="mouse",(e==="pointerout"||e==="pointerover")&&(b=hu,_="onPointerLeave",y="onPointerEnter",m="pointer"),C=w==null?v:ds(w),p=S==null?v:ds(S),v=new b(_,m+"leave",w,n,h),v.target=C,v.relatedTarget=p,_=null,Un(h)===o&&(b=new b(y,m+"enter",S,n,h),b.target=p,b.relatedTarget=C,_=b),C=_,w&&S)t:{for(b=w,y=S,m=0,p=b;p;p=is(p))m++;for(p=0,_=y;_;_=is(_))p++;for(;0<m-p;)b=is(b),m--;for(;0<p-m;)y=is(y),p--;for(;m--;){if(b===y||y!==null&&b===y.alternate)break t;b=is(b),y=is(y)}b=null}else b=null;w!==null&&Au(g,v,w,b,!1),S!==null&&C!==null&&Au(g,C,S,b,!0)}}e:{if(v=o?ds(o):window,w=v.nodeName&&v.nodeName.toLowerCase(),w==="select"||w==="input"&&v.type==="file")var k=Hv;else if(wu(v))if(qd)k=Vv;else{k=qv;var T=Fv}else(w=v.nodeName)&&w.toLowerCase()==="input"&&(v.type==="checkbox"||v.type==="radio")&&(k=Gv);if(k&&(k=k(e,o))){Fd(g,k,n,h);break e}T&&T(e,v,o),e==="focusout"&&(T=v._wrapperState)&&T.controlled&&v.type==="number"&&Tl(v,"number",v.value)}switch(T=o?ds(o):window,e){case"focusin":(wu(T)||T.contentEditable==="true")&&(cs=T,Kl=o,cr=null);break;case"focusout":cr=Kl=cs=null;break;case"mousedown":zl=!0;break;case"contextmenu":case"mouseup":case"dragend":zl=!1,_u(g,n,h);break;case"selectionchange":if(Yv)break;case"keydown":case"keyup":_u(g,n,h)}var $;if(To)e:{switch(e){case"compositionstart":var E="onCompositionStart";break e;case"compositionend":E="onCompositionEnd";break e;case"compositionupdate":E="onCompositionUpdate";break e}E=void 0}else os?zd(e,n)&&(E="onCompositionEnd"):e==="keydown"&&n.keyCode===229&&(E="onCompositionStart");E&&(Kd&&n.locale!=="ko"&&(os||E!=="onCompositionStart"?E==="onCompositionEnd"&&os&&($=Bd()):(vn=h,So="value"in vn?vn.value:vn.textContent,os=!0)),T=Hi(o,E),0<T.length&&(E=new yu(E,e,null,n,h),g.push({event:E,listeners:T}),$?E.data=$:($=Hd(n),$!==null&&(E.data=$)))),($=Ov?Uv(e,n):Bv(e,n))&&(o=Hi(o,"onBeforeInput"),0<o.length&&(h=new yu("onBeforeInput","beforeinput",null,n,h),g.push({event:h,listeners:o}),h.data=$))}ep(g,t)})}function kr(e,t,n){return{instance:e,listener:t,currentTarget:n}}function Hi(e,t){for(var n=t+"Capture",s=[];e!==null;){var r=e,i=r.stateNode;r.tag===5&&i!==null&&(r=i,i=yr(e,n),i!=null&&s.unshift(kr(e,i,r)),i=yr(e,t),i!=null&&s.push(kr(e,i,r))),e=e.return}return s}function is(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5);return e||null}function Au(e,t,n,s,r){for(var i=t._reactName,a=[];n!==null&&n!==s;){var l=n,u=l.alternate,o=l.stateNode;if(u!==null&&u===s)break;l.tag===5&&o!==null&&(l=o,r?(u=yr(n,i),u!=null&&a.unshift(kr(n,u,l))):r||(u=yr(n,i),u!=null&&a.push(kr(n,u,l)))),n=n.return}a.length!==0&&e.push({event:t,listeners:a})}var Xv=/\r\n?/g,Jv=/\u0000|\uFFFD/g;function xu(e){return(typeof e=="string"?e:""+e).replace(Xv,`
`).replace(Jv,"")}function $i(e,t,n){if(t=xu(t),xu(e)!==t&&n)throw Error(F(425))}function Fi(){}var Hl=null,Fl=null;function ql(e,t){return e==="textarea"||e==="noscript"||typeof t.children=="string"||typeof t.children=="number"||typeof t.dangerouslySetInnerHTML=="object"&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}var Gl=typeof setTimeout=="function"?setTimeout:void 0,Zv=typeof clearTimeout=="function"?clearTimeout:void 0,Du=typeof Promise=="function"?Promise:void 0,ey=typeof queueMicrotask=="function"?queueMicrotask:typeof Du<"u"?function(e){return Du.resolve(null).then(e).catch(ty)}:Gl;function ty(e){setTimeout(function(){throw e})}function dl(e,t){var n=t,s=0;do{var r=n.nextSibling;if(e.removeChild(n),r&&r.nodeType===8)if(n=r.data,n==="/$"){if(s===0){e.removeChild(r),$r(t);return}s--}else n!=="$"&&n!=="$?"&&n!=="$!"||s++;n=r}while(n);$r(t)}function wn(e){for(;e!=null;e=e.nextSibling){var t=e.nodeType;if(t===1||t===3)break;if(t===8){if(t=e.data,t==="$"||t==="$!"||t==="$?")break;if(t==="/$")return null}}return e}function Ru(e){e=e.previousSibling;for(var t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="$"||n==="$!"||n==="$?"){if(t===0)return e;t--}else n==="/$"&&t++}e=e.previousSibling}return null}var Rs=Math.random().toString(36).slice(2),zt="__reactFiber$"+Rs,_r="__reactProps$"+Rs,en="__reactContainer$"+Rs,Vl="__reactEvents$"+Rs,ny="__reactListeners$"+Rs,sy="__reactHandles$"+Rs;function Un(e){var t=e[zt];if(t)return t;for(var n=e.parentNode;n;){if(t=n[en]||n[zt]){if(n=t.alternate,t.child!==null||n!==null&&n.child!==null)for(e=Ru(e);e!==null;){if(n=e[zt])return n;e=Ru(e)}return t}e=n,n=e.parentNode}return null}function Ir(e){return e=e[zt]||e[en],!e||e.tag!==5&&e.tag!==6&&e.tag!==13&&e.tag!==3?null:e}function ds(e){if(e.tag===5||e.tag===6)return e.stateNode;throw Error(F(33))}function ca(e){return e[_r]||null}var Wl=[],ps=-1;function Tn(e){return{current:e}}function ge(e){0>ps||(e.current=Wl[ps],Wl[ps]=null,ps--)}function ye(e,t){ps++,Wl[ps]=e.current,e.current=t}var En={},Ge=Tn(En),nt=Tn(!1),Fn=En;function Ss(e,t){var n=e.type.contextTypes;if(!n)return En;var s=e.stateNode;if(s&&s.__reactInternalMemoizedUnmaskedChildContext===t)return s.__reactInternalMemoizedMaskedChildContext;var r={},i;for(i in n)r[i]=t[i];return s&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=t,e.__reactInternalMemoizedMaskedChildContext=r),r}function st(e){return e=e.childContextTypes,e!=null}function qi(){ge(nt),ge(Ge)}function Iu(e,t,n){if(Ge.current!==En)throw Error(F(168));ye(Ge,t),ye(nt,n)}function np(e,t,n){var s=e.stateNode;if(t=t.childContextTypes,typeof s.getChildContext!="function")return n;s=s.getChildContext();for(var r in s)if(!(r in t))throw Error(F(108,Fm(e)||"Unknown",r));return Ce({},n,s)}function Gi(e){return e=(e=e.stateNode)&&e.__reactInternalMemoizedMergedChildContext||En,Fn=Ge.current,ye(Ge,e),ye(nt,nt.current),!0}function Lu(e,t,n){var s=e.stateNode;if(!s)throw Error(F(169));n?(e=np(e,t,Fn),s.__reactInternalMemoizedMergedChildContext=e,ge(nt),ge(Ge),ye(Ge,e)):ge(nt),ye(nt,n)}var Yt=null,ua=!1,pl=!1;function sp(e){Yt===null?Yt=[e]:Yt.push(e)}function ry(e){ua=!0,sp(e)}function An(){if(!pl&&Yt!==null){pl=!0;var e=0,t=pe;try{var n=Yt;for(pe=1;e<n.length;e++){var s=n[e];do s=s(!0);while(s!==null)}Yt=null,ua=!1}catch(r){throw Yt!==null&&(Yt=Yt.slice(e+1)),Td(bo,An),r}finally{pe=t,pl=!1}}return null}var fs=[],ms=0,Vi=null,Wi=0,yt=[],ht=0,qn=null,Qt=1,Xt="";function Mn(e,t){fs[ms++]=Wi,fs[ms++]=Vi,Vi=e,Wi=t}function rp(e,t,n){yt[ht++]=Qt,yt[ht++]=Xt,yt[ht++]=qn,qn=e;var s=Qt;e=Xt;var r=32-Dt(s)-1;s&=~(1<<r),n+=1;var i=32-Dt(t)+r;if(30<i){var a=r-r%5;i=(s&(1<<a)-1).toString(32),s>>=a,r-=a,Qt=1<<32-Dt(t)+r|n<<r|s,Xt=i+e}else Qt=1<<i|n<<r|s,Xt=e}function xo(e){e.return!==null&&(Mn(e,1),rp(e,1,0))}function Do(e){for(;e===Vi;)Vi=fs[--ms],fs[ms]=null,Wi=fs[--ms],fs[ms]=null;for(;e===qn;)qn=yt[--ht],yt[ht]=null,Xt=yt[--ht],yt[ht]=null,Qt=yt[--ht],yt[ht]=null}var ut=null,ct=null,Ne=!1,xt=null;function ip(e,t){var n=gt(5,null,null,0);n.elementType="DELETED",n.stateNode=t,n.return=e,t=e.deletions,t===null?(e.deletions=[n],e.flags|=16):t.push(n)}function Pu(e,t){switch(e.tag){case 5:var n=e.type;return t=t.nodeType!==1||n.toLowerCase()!==t.nodeName.toLowerCase()?null:t,t!==null?(e.stateNode=t,ut=e,ct=wn(t.firstChild),!0):!1;case 6:return t=e.pendingProps===""||t.nodeType!==3?null:t,t!==null?(e.stateNode=t,ut=e,ct=null,!0):!1;case 13:return t=t.nodeType!==8?null:t,t!==null?(n=qn!==null?{id:Qt,overflow:Xt}:null,e.memoizedState={dehydrated:t,treeContext:n,retryLane:1073741824},n=gt(18,null,null,0),n.stateNode=t,n.return=e,e.child=n,ut=e,ct=null,!0):!1;default:return!1}}function jl(e){return(e.mode&1)!==0&&(e.flags&128)===0}function Yl(e){if(Ne){var t=ct;if(t){var n=t;if(!Pu(e,t)){if(jl(e))throw Error(F(418));t=wn(n.nextSibling);var s=ut;t&&Pu(e,t)?ip(s,n):(e.flags=e.flags&-4097|2,Ne=!1,ut=e)}}else{if(jl(e))throw Error(F(418));e.flags=e.flags&-4097|2,Ne=!1,ut=e}}}function Mu(e){for(e=e.return;e!==null&&e.tag!==5&&e.tag!==3&&e.tag!==13;)e=e.return;ut=e}function wi(e){if(e!==ut)return!1;if(!Ne)return Mu(e),Ne=!0,!1;var t;if((t=e.tag!==3)&&!(t=e.tag!==5)&&(t=e.type,t=t!=="head"&&t!=="body"&&!ql(e.type,e.memoizedProps)),t&&(t=ct)){if(jl(e))throw ap(),Error(F(418));for(;t;)ip(e,t),t=wn(t.nextSibling)}if(Mu(e),e.tag===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(F(317));e:{for(e=e.nextSibling,t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="/$"){if(t===0){ct=wn(e.nextSibling);break e}t--}else n!=="$"&&n!=="$!"&&n!=="$?"||t++}e=e.nextSibling}ct=null}}else ct=ut?wn(e.stateNode.nextSibling):null;return!0}function ap(){for(var e=ct;e;)e=wn(e.nextSibling)}function Es(){ct=ut=null,Ne=!1}function Ro(e){xt===null?xt=[e]:xt.push(e)}var iy=sn.ReactCurrentBatchConfig;function Xs(e,t,n){if(e=n.ref,e!==null&&typeof e!="function"&&typeof e!="object"){if(n._owner){if(n=n._owner,n){if(n.tag!==1)throw Error(F(309));var s=n.stateNode}if(!s)throw Error(F(147,e));var r=s,i=""+e;return t!==null&&t.ref!==null&&typeof t.ref=="function"&&t.ref._stringRef===i?t.ref:(t=function(a){var l=r.refs;a===null?delete l[i]:l[i]=a},t._stringRef=i,t)}if(typeof e!="string")throw Error(F(284));if(!n._owner)throw Error(F(290,e))}return e}function bi(e,t){throw e=Object.prototype.toString.call(t),Error(F(31,e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e))}function Ou(e){var t=e._init;return t(e._payload)}function lp(e){function t(y,m){if(e){var p=y.deletions;p===null?(y.deletions=[m],y.flags|=16):p.push(m)}}function n(y,m){if(!e)return null;for(;m!==null;)t(y,m),m=m.sibling;return null}function s(y,m){for(y=new Map;m!==null;)m.key!==null?y.set(m.key,m):y.set(m.index,m),m=m.sibling;return y}function r(y,m){return y=_n(y,m),y.index=0,y.sibling=null,y}function i(y,m,p){return y.index=p,e?(p=y.alternate,p!==null?(p=p.index,p<m?(y.flags|=2,m):p):(y.flags|=2,m)):(y.flags|=1048576,m)}function a(y){return e&&y.alternate===null&&(y.flags|=2),y}function l(y,m,p,_){return m===null||m.tag!==6?(m=$l(p,y.mode,_),m.return=y,m):(m=r(m,p),m.return=y,m)}function u(y,m,p,_){var k=p.type;return k===ls?h(y,m,p.props.children,_,p.key):m!==null&&(m.elementType===k||typeof k=="object"&&k!==null&&k.$$typeof===dn&&Ou(k)===m.type)?(_=r(m,p.props),_.ref=Xs(y,m,p),_.return=y,_):(_=Li(p.type,p.key,p.props,null,y.mode,_),_.ref=Xs(y,m,p),_.return=y,_)}function o(y,m,p,_){return m===null||m.tag!==4||m.stateNode.containerInfo!==p.containerInfo||m.stateNode.implementation!==p.implementation?(m=wl(p,y.mode,_),m.return=y,m):(m=r(m,p.children||[]),m.return=y,m)}function h(y,m,p,_,k){return m===null||m.tag!==7?(m=Hn(p,y.mode,_,k),m.return=y,m):(m=r(m,p),m.return=y,m)}function g(y,m,p){if(typeof m=="string"&&m!==""||typeof m=="number")return m=$l(""+m,y.mode,p),m.return=y,m;if(typeof m=="object"&&m!==null){switch(m.$$typeof){case ai:return p=Li(m.type,m.key,m.props,null,y.mode,p),p.ref=Xs(y,null,m),p.return=y,p;case as:return m=wl(m,y.mode,p),m.return=y,m;case dn:var _=m._init;return g(y,_(m._payload),p)}if(nr(m)||Ws(m))return m=Hn(m,y.mode,p,null),m.return=y,m;bi(y,m)}return null}function v(y,m,p,_){var k=m!==null?m.key:null;if(typeof p=="string"&&p!==""||typeof p=="number")return k!==null?null:l(y,m,""+p,_);if(typeof p=="object"&&p!==null){switch(p.$$typeof){case ai:return p.key===k?u(y,m,p,_):null;case as:return p.key===k?o(y,m,p,_):null;case dn:return k=p._init,v(y,m,k(p._payload),_)}if(nr(p)||Ws(p))return k!==null?null:h(y,m,p,_,null);bi(y,p)}return null}function w(y,m,p,_,k){if(typeof _=="string"&&_!==""||typeof _=="number")return y=y.get(p)||null,l(m,y,""+_,k);if(typeof _=="object"&&_!==null){switch(_.$$typeof){case ai:return y=y.get(_.key===null?p:_.key)||null,u(m,y,_,k);case as:return y=y.get(_.key===null?p:_.key)||null,o(m,y,_,k);case dn:var T=_._init;return w(y,m,p,T(_._payload),k)}if(nr(_)||Ws(_))return y=y.get(p)||null,h(m,y,_,k,null);bi(m,_)}return null}function S(y,m,p,_){for(var k=null,T=null,$=m,E=m=0,D=null;$!==null&&E<p.length;E++){$.index>E?(D=$,$=null):D=$.sibling;var x=v(y,$,p[E],_);if(x===null){$===null&&($=D);break}e&&$&&x.alternate===null&&t(y,$),m=i(x,m,E),T===null?k=x:T.sibling=x,T=x,$=D}if(E===p.length)return n(y,$),Ne&&Mn(y,E),k;if($===null){for(;E<p.length;E++)$=g(y,p[E],_),$!==null&&(m=i($,m,E),T===null?k=$:T.sibling=$,T=$);return Ne&&Mn(y,E),k}for($=s(y,$);E<p.length;E++)D=w($,y,E,p[E],_),D!==null&&(e&&D.alternate!==null&&$.delete(D.key===null?E:D.key),m=i(D,m,E),T===null?k=D:T.sibling=D,T=D);return e&&$.forEach(function(q){return t(y,q)}),Ne&&Mn(y,E),k}function b(y,m,p,_){var k=Ws(p);if(typeof k!="function")throw Error(F(150));if(p=k.call(p),p==null)throw Error(F(151));for(var T=k=null,$=m,E=m=0,D=null,x=p.next();$!==null&&!x.done;E++,x=p.next()){$.index>E?(D=$,$=null):D=$.sibling;var q=v(y,$,x.value,_);if(q===null){$===null&&($=D);break}e&&$&&q.alternate===null&&t(y,$),m=i(q,m,E),T===null?k=q:T.sibling=q,T=q,$=D}if(x.done)return n(y,$),Ne&&Mn(y,E),k;if($===null){for(;!x.done;E++,x=p.next())x=g(y,x.value,_),x!==null&&(m=i(x,m,E),T===null?k=x:T.sibling=x,T=x);return Ne&&Mn(y,E),k}for($=s(y,$);!x.done;E++,x=p.next())x=w($,y,E,x.value,_),x!==null&&(e&&x.alternate!==null&&$.delete(x.key===null?E:x.key),m=i(x,m,E),T===null?k=x:T.sibling=x,T=x);return e&&$.forEach(function(X){return t(y,X)}),Ne&&Mn(y,E),k}function C(y,m,p,_){if(typeof p=="object"&&p!==null&&p.type===ls&&p.key===null&&(p=p.props.children),typeof p=="object"&&p!==null){switch(p.$$typeof){case ai:e:{for(var k=p.key,T=m;T!==null;){if(T.key===k){if(k=p.type,k===ls){if(T.tag===7){n(y,T.sibling),m=r(T,p.props.children),m.return=y,y=m;break e}}else if(T.elementType===k||typeof k=="object"&&k!==null&&k.$$typeof===dn&&Ou(k)===T.type){n(y,T.sibling),m=r(T,p.props),m.ref=Xs(y,T,p),m.return=y,y=m;break e}n(y,T);break}else t(y,T);T=T.sibling}p.type===ls?(m=Hn(p.props.children,y.mode,_,p.key),m.return=y,y=m):(_=Li(p.type,p.key,p.props,null,y.mode,_),_.ref=Xs(y,m,p),_.return=y,y=_)}return a(y);case as:e:{for(T=p.key;m!==null;){if(m.key===T)if(m.tag===4&&m.stateNode.containerInfo===p.containerInfo&&m.stateNode.implementation===p.implementation){n(y,m.sibling),m=r(m,p.children||[]),m.return=y,y=m;break e}else{n(y,m);break}else t(y,m);m=m.sibling}m=wl(p,y.mode,_),m.return=y,y=m}return a(y);case dn:return T=p._init,C(y,m,T(p._payload),_)}if(nr(p))return S(y,m,p,_);if(Ws(p))return b(y,m,p,_);bi(y,p)}return typeof p=="string"&&p!==""||typeof p=="number"?(p=""+p,m!==null&&m.tag===6?(n(y,m.sibling),m=r(m,p),m.return=y,y=m):(n(y,m),m=$l(p,y.mode,_),m.return=y,y=m),a(y)):n(y,m)}return C}var Cs=lp(!0),op=lp(!1),ji=Tn(null),Yi=null,vs=null,Io=null;function Lo(){Io=vs=Yi=null}function Po(e){var t=ji.current;ge(ji),e._currentValue=t}function Ql(e,t,n){for(;e!==null;){var s=e.alternate;if((e.childLanes&t)!==t?(e.childLanes|=t,s!==null&&(s.childLanes|=t)):s!==null&&(s.childLanes&t)!==t&&(s.childLanes|=t),e===n)break;e=e.return}}function Ns(e,t){Yi=e,Io=vs=null,e=e.dependencies,e!==null&&e.firstContext!==null&&((e.lanes&t)!==0&&(tt=!0),e.firstContext=null)}function wt(e){var t=e._currentValue;if(Io!==e)if(e={context:e,memoizedValue:t,next:null},vs===null){if(Yi===null)throw Error(F(308));vs=e,Yi.dependencies={lanes:0,firstContext:e}}else vs=vs.next=e;return t}var Bn=null;function Mo(e){Bn===null?Bn=[e]:Bn.push(e)}function cp(e,t,n,s){var r=t.interleaved;return r===null?(n.next=n,Mo(t)):(n.next=r.next,r.next=n),t.interleaved=n,tn(e,s)}function tn(e,t){e.lanes|=t;var n=e.alternate;for(n!==null&&(n.lanes|=t),n=e,e=e.return;e!==null;)e.childLanes|=t,n=e.alternate,n!==null&&(n.childLanes|=t),n=e,e=e.return;return n.tag===3?n.stateNode:null}var pn=!1;function Oo(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function up(e,t){e=e.updateQueue,t.updateQueue===e&&(t.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,effects:e.effects})}function Jt(e,t){return{eventTime:e,lane:t,tag:0,payload:null,callback:null,next:null}}function bn(e,t,n){var s=e.updateQueue;if(s===null)return null;if(s=s.shared,(ue&2)!==0){var r=s.pending;return r===null?t.next=t:(t.next=r.next,r.next=t),s.pending=t,tn(e,n)}return r=s.interleaved,r===null?(t.next=t,Mo(s)):(t.next=r.next,r.next=t),s.interleaved=t,tn(e,n)}function Ti(e,t,n){if(t=t.updateQueue,t!==null&&(t=t.shared,(n&4194240)!==0)){var s=t.lanes;s&=e.pendingLanes,n|=s,t.lanes=n,No(e,n)}}function Uu(e,t){var n=e.updateQueue,s=e.alternate;if(s!==null&&(s=s.updateQueue,n===s)){var r=null,i=null;if(n=n.firstBaseUpdate,n!==null){do{var a={eventTime:n.eventTime,lane:n.lane,tag:n.tag,payload:n.payload,callback:n.callback,next:null};i===null?r=i=a:i=i.next=a,n=n.next}while(n!==null);i===null?r=i=t:i=i.next=t}else r=i=t;n={baseState:s.baseState,firstBaseUpdate:r,lastBaseUpdate:i,shared:s.shared,effects:s.effects},e.updateQueue=n;return}e=n.lastBaseUpdate,e===null?n.firstBaseUpdate=t:e.next=t,n.lastBaseUpdate=t}function Qi(e,t,n,s){var r=e.updateQueue;pn=!1;var i=r.firstBaseUpdate,a=r.lastBaseUpdate,l=r.shared.pending;if(l!==null){r.shared.pending=null;var u=l,o=u.next;u.next=null,a===null?i=o:a.next=o,a=u;var h=e.alternate;h!==null&&(h=h.updateQueue,l=h.lastBaseUpdate,l!==a&&(l===null?h.firstBaseUpdate=o:l.next=o,h.lastBaseUpdate=u))}if(i!==null){var g=r.baseState;a=0,h=o=u=null,l=i;do{var v=l.lane,w=l.eventTime;if((s&v)===v){h!==null&&(h=h.next={eventTime:w,lane:0,tag:l.tag,payload:l.payload,callback:l.callback,next:null});e:{var S=e,b=l;switch(v=t,w=n,b.tag){case 1:if(S=b.payload,typeof S=="function"){g=S.call(w,g,v);break e}g=S;break e;case 3:S.flags=S.flags&-65537|128;case 0:if(S=b.payload,v=typeof S=="function"?S.call(w,g,v):S,v==null)break e;g=Ce({},g,v);break e;case 2:pn=!0}}l.callback!==null&&l.lane!==0&&(e.flags|=64,v=r.effects,v===null?r.effects=[l]:v.push(l))}else w={eventTime:w,lane:v,tag:l.tag,payload:l.payload,callback:l.callback,next:null},h===null?(o=h=w,u=g):h=h.next=w,a|=v;if(l=l.next,l===null){if(l=r.shared.pending,l===null)break;v=l,l=v.next,v.next=null,r.lastBaseUpdate=v,r.shared.pending=null}}while(!0);if(h===null&&(u=g),r.baseState=u,r.firstBaseUpdate=o,r.lastBaseUpdate=h,t=r.shared.interleaved,t!==null){r=t;do a|=r.lane,r=r.next;while(r!==t)}else i===null&&(r.shared.lanes=0);Vn|=a,e.lanes=a,e.memoizedState=g}}function Bu(e,t,n){if(e=t.effects,t.effects=null,e!==null)for(t=0;t<e.length;t++){var s=e[t],r=s.callback;if(r!==null){if(s.callback=null,s=n,typeof r!="function")throw Error(F(191,r));r.call(s)}}}var Lr={},Ft=Tn(Lr),Sr=Tn(Lr),Er=Tn(Lr);function Kn(e){if(e===Lr)throw Error(F(174));return e}function Uo(e,t){switch(ye(Er,t),ye(Sr,e),ye(Ft,Lr),e=t.nodeType,e){case 9:case 11:t=(t=t.documentElement)?t.namespaceURI:xl(null,"");break;default:e=e===8?t.parentNode:t,t=e.namespaceURI||null,e=e.tagName,t=xl(t,e)}ge(Ft),ye(Ft,t)}function Ts(){ge(Ft),ge(Sr),ge(Er)}function dp(e){Kn(Er.current);var t=Kn(Ft.current),n=xl(t,e.type);t!==n&&(ye(Sr,e),ye(Ft,n))}function Bo(e){Sr.current===e&&(ge(Ft),ge(Sr))}var Se=Tn(0);function Xi(e){for(var t=e;t!==null;){if(t.tag===13){var n=t.memoizedState;if(n!==null&&(n=n.dehydrated,n===null||n.data==="$?"||n.data==="$!"))return t}else if(t.tag===19&&t.memoizedProps.revealOrder!==void 0){if((t.flags&128)!==0)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}var fl=[];function Ko(){for(var e=0;e<fl.length;e++)fl[e]._workInProgressVersionPrimary=null;fl.length=0}var Ai=sn.ReactCurrentDispatcher,ml=sn.ReactCurrentBatchConfig,Gn=0,Ee=null,Re=null,Le=null,Ji=!1,ur=!1,Cr=0,ay=0;function He(){throw Error(F(321))}function zo(e,t){if(t===null)return!1;for(var n=0;n<t.length&&n<e.length;n++)if(!It(e[n],t[n]))return!1;return!0}function Ho(e,t,n,s,r,i){if(Gn=i,Ee=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,Ai.current=e===null||e.memoizedState===null?uy:dy,e=n(s,r),ur){i=0;do{if(ur=!1,Cr=0,25<=i)throw Error(F(301));i+=1,Le=Re=null,t.updateQueue=null,Ai.current=py,e=n(s,r)}while(ur)}if(Ai.current=Zi,t=Re!==null&&Re.next!==null,Gn=0,Le=Re=Ee=null,Ji=!1,t)throw Error(F(300));return e}function Fo(){var e=Cr!==0;return Cr=0,e}function Kt(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Le===null?Ee.memoizedState=Le=e:Le=Le.next=e,Le}function bt(){if(Re===null){var e=Ee.alternate;e=e!==null?e.memoizedState:null}else e=Re.next;var t=Le===null?Ee.memoizedState:Le.next;if(t!==null)Le=t,Re=e;else{if(e===null)throw Error(F(310));Re=e,e={memoizedState:Re.memoizedState,baseState:Re.baseState,baseQueue:Re.baseQueue,queue:Re.queue,next:null},Le===null?Ee.memoizedState=Le=e:Le=Le.next=e}return Le}function Tr(e,t){return typeof t=="function"?t(e):t}function vl(e){var t=bt(),n=t.queue;if(n===null)throw Error(F(311));n.lastRenderedReducer=e;var s=Re,r=s.baseQueue,i=n.pending;if(i!==null){if(r!==null){var a=r.next;r.next=i.next,i.next=a}s.baseQueue=r=i,n.pending=null}if(r!==null){i=r.next,s=s.baseState;var l=a=null,u=null,o=i;do{var h=o.lane;if((Gn&h)===h)u!==null&&(u=u.next={lane:0,action:o.action,hasEagerState:o.hasEagerState,eagerState:o.eagerState,next:null}),s=o.hasEagerState?o.eagerState:e(s,o.action);else{var g={lane:h,action:o.action,hasEagerState:o.hasEagerState,eagerState:o.eagerState,next:null};u===null?(l=u=g,a=s):u=u.next=g,Ee.lanes|=h,Vn|=h}o=o.next}while(o!==null&&o!==i);u===null?a=s:u.next=l,It(s,t.memoizedState)||(tt=!0),t.memoizedState=s,t.baseState=a,t.baseQueue=u,n.lastRenderedState=s}if(e=n.interleaved,e!==null){r=e;do i=r.lane,Ee.lanes|=i,Vn|=i,r=r.next;while(r!==e)}else r===null&&(n.lanes=0);return[t.memoizedState,n.dispatch]}function yl(e){var t=bt(),n=t.queue;if(n===null)throw Error(F(311));n.lastRenderedReducer=e;var s=n.dispatch,r=n.pending,i=t.memoizedState;if(r!==null){n.pending=null;var a=r=r.next;do i=e(i,a.action),a=a.next;while(a!==r);It(i,t.memoizedState)||(tt=!0),t.memoizedState=i,t.baseQueue===null&&(t.baseState=i),n.lastRenderedState=i}return[i,s]}function pp(){}function fp(e,t){var n=Ee,s=bt(),r=t(),i=!It(s.memoizedState,r);if(i&&(s.memoizedState=r,tt=!0),s=s.queue,qo(yp.bind(null,n,s,e),[e]),s.getSnapshot!==t||i||Le!==null&&Le.memoizedState.tag&1){if(n.flags|=2048,Ar(9,vp.bind(null,n,s,r,t),void 0,null),Pe===null)throw Error(F(349));(Gn&30)!==0||mp(n,t,r)}return r}function mp(e,t,n){e.flags|=16384,e={getSnapshot:t,value:n},t=Ee.updateQueue,t===null?(t={lastEffect:null,stores:null},Ee.updateQueue=t,t.stores=[e]):(n=t.stores,n===null?t.stores=[e]:n.push(e))}function vp(e,t,n,s){t.value=n,t.getSnapshot=s,hp(t)&&gp(e)}function yp(e,t,n){return n(function(){hp(t)&&gp(e)})}function hp(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!It(e,n)}catch{return!0}}function gp(e){var t=tn(e,1);t!==null&&Rt(t,e,1,-1)}function Ku(e){var t=Kt();return typeof e=="function"&&(e=e()),t.memoizedState=t.baseState=e,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:Tr,lastRenderedState:e},t.queue=e,e=e.dispatch=cy.bind(null,Ee,e),[t.memoizedState,e]}function Ar(e,t,n,s){return e={tag:e,create:t,destroy:n,deps:s,next:null},t=Ee.updateQueue,t===null?(t={lastEffect:null,stores:null},Ee.updateQueue=t,t.lastEffect=e.next=e):(n=t.lastEffect,n===null?t.lastEffect=e.next=e:(s=n.next,n.next=e,e.next=s,t.lastEffect=e)),e}function $p(){return bt().memoizedState}function xi(e,t,n,s){var r=Kt();Ee.flags|=e,r.memoizedState=Ar(1|t,n,void 0,s===void 0?null:s)}function da(e,t,n,s){var r=bt();s=s===void 0?null:s;var i=void 0;if(Re!==null){var a=Re.memoizedState;if(i=a.destroy,s!==null&&zo(s,a.deps)){r.memoizedState=Ar(t,n,i,s);return}}Ee.flags|=e,r.memoizedState=Ar(1|t,n,i,s)}function zu(e,t){return xi(8390656,8,e,t)}function qo(e,t){return da(2048,8,e,t)}function wp(e,t){return da(4,2,e,t)}function bp(e,t){return da(4,4,e,t)}function Np(e,t){if(typeof t=="function")return e=e(),t(e),function(){t(null)};if(t!=null)return e=e(),t.current=e,function(){t.current=null}}function kp(e,t,n){return n=n!=null?n.concat([e]):null,da(4,4,Np.bind(null,t,e),n)}function Go(){}function _p(e,t){var n=bt();t=t===void 0?null:t;var s=n.memoizedState;return s!==null&&t!==null&&zo(t,s[1])?s[0]:(n.memoizedState=[e,t],e)}function Sp(e,t){var n=bt();t=t===void 0?null:t;var s=n.memoizedState;return s!==null&&t!==null&&zo(t,s[1])?s[0]:(e=e(),n.memoizedState=[e,t],e)}function Ep(e,t,n){return(Gn&21)===0?(e.baseState&&(e.baseState=!1,tt=!0),e.memoizedState=n):(It(n,t)||(n=Dd(),Ee.lanes|=n,Vn|=n,e.baseState=!0),t)}function ly(e,t){var n=pe;pe=n!==0&&4>n?n:4,e(!0);var s=ml.transition;ml.transition={};try{e(!1),t()}finally{pe=n,ml.transition=s}}function Cp(){return bt().memoizedState}function oy(e,t,n){var s=kn(e);if(n={lane:s,action:n,hasEagerState:!1,eagerState:null,next:null},Tp(e))Ap(t,n);else if(n=cp(e,t,n,s),n!==null){var r=Qe();Rt(n,e,s,r),xp(n,t,s)}}function cy(e,t,n){var s=kn(e),r={lane:s,action:n,hasEagerState:!1,eagerState:null,next:null};if(Tp(e))Ap(t,r);else{var i=e.alternate;if(e.lanes===0&&(i===null||i.lanes===0)&&(i=t.lastRenderedReducer,i!==null))try{var a=t.lastRenderedState,l=i(a,n);if(r.hasEagerState=!0,r.eagerState=l,It(l,a)){var u=t.interleaved;u===null?(r.next=r,Mo(t)):(r.next=u.next,u.next=r),t.interleaved=r;return}}catch{}n=cp(e,t,r,s),n!==null&&(r=Qe(),Rt(n,e,s,r),xp(n,t,s))}}function Tp(e){var t=e.alternate;return e===Ee||t!==null&&t===Ee}function Ap(e,t){ur=Ji=!0;var n=e.pending;n===null?t.next=t:(t.next=n.next,n.next=t),e.pending=t}function xp(e,t,n){if((n&4194240)!==0){var s=t.lanes;s&=e.pendingLanes,n|=s,t.lanes=n,No(e,n)}}var Zi={readContext:wt,useCallback:He,useContext:He,useEffect:He,useImperativeHandle:He,useInsertionEffect:He,useLayoutEffect:He,useMemo:He,useReducer:He,useRef:He,useState:He,useDebugValue:He,useDeferredValue:He,useTransition:He,useMutableSource:He,useSyncExternalStore:He,useId:He,unstable_isNewReconciler:!1},uy={readContext:wt,useCallback:function(e,t){return Kt().memoizedState=[e,t===void 0?null:t],e},useContext:wt,useEffect:zu,useImperativeHandle:function(e,t,n){return n=n!=null?n.concat([e]):null,xi(4194308,4,Np.bind(null,t,e),n)},useLayoutEffect:function(e,t){return xi(4194308,4,e,t)},useInsertionEffect:function(e,t){return xi(4,2,e,t)},useMemo:function(e,t){var n=Kt();return t=t===void 0?null:t,e=e(),n.memoizedState=[e,t],e},useReducer:function(e,t,n){var s=Kt();return t=n!==void 0?n(t):t,s.memoizedState=s.baseState=t,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:t},s.queue=e,e=e.dispatch=oy.bind(null,Ee,e),[s.memoizedState,e]},useRef:function(e){var t=Kt();return e={current:e},t.memoizedState=e},useState:Ku,useDebugValue:Go,useDeferredValue:function(e){return Kt().memoizedState=e},useTransition:function(){var e=Ku(!1),t=e[0];return e=ly.bind(null,e[1]),Kt().memoizedState=e,[t,e]},useMutableSource:function(){},useSyncExternalStore:function(e,t,n){var s=Ee,r=Kt();if(Ne){if(n===void 0)throw Error(F(407));n=n()}else{if(n=t(),Pe===null)throw Error(F(349));(Gn&30)!==0||mp(s,t,n)}r.memoizedState=n;var i={value:n,getSnapshot:t};return r.queue=i,zu(yp.bind(null,s,i,e),[e]),s.flags|=2048,Ar(9,vp.bind(null,s,i,n,t),void 0,null),n},useId:function(){var e=Kt(),t=Pe.identifierPrefix;if(Ne){var n=Xt,s=Qt;n=(s&~(1<<32-Dt(s)-1)).toString(32)+n,t=":"+t+"R"+n,n=Cr++,0<n&&(t+="H"+n.toString(32)),t+=":"}else n=ay++,t=":"+t+"r"+n.toString(32)+":";return e.memoizedState=t},unstable_isNewReconciler:!1},dy={readContext:wt,useCallback:_p,useContext:wt,useEffect:qo,useImperativeHandle:kp,useInsertionEffect:wp,useLayoutEffect:bp,useMemo:Sp,useReducer:vl,useRef:$p,useState:function(){return vl(Tr)},useDebugValue:Go,useDeferredValue:function(e){var t=bt();return Ep(t,Re.memoizedState,e)},useTransition:function(){var e=vl(Tr)[0],t=bt().memoizedState;return[e,t]},useMutableSource:pp,useSyncExternalStore:fp,useId:Cp,unstable_isNewReconciler:!1},py={readContext:wt,useCallback:_p,useContext:wt,useEffect:qo,useImperativeHandle:kp,useInsertionEffect:wp,useLayoutEffect:bp,useMemo:Sp,useReducer:yl,useRef:$p,useState:function(){return yl(Tr)},useDebugValue:Go,useDeferredValue:function(e){var t=bt();return Re===null?t.memoizedState=e:Ep(t,Re.memoizedState,e)},useTransition:function(){var e=yl(Tr)[0],t=bt().memoizedState;return[e,t]},useMutableSource:pp,useSyncExternalStore:fp,useId:Cp,unstable_isNewReconciler:!1};function Tt(e,t){if(e&&e.defaultProps){t=Ce({},t),e=e.defaultProps;for(var n in e)t[n]===void 0&&(t[n]=e[n]);return t}return t}function Xl(e,t,n,s){t=e.memoizedState,n=n(s,t),n=n==null?t:Ce({},t,n),e.memoizedState=n,e.lanes===0&&(e.updateQueue.baseState=n)}var pa={isMounted:function(e){return(e=e._reactInternals)?Yn(e)===e:!1},enqueueSetState:function(e,t,n){e=e._reactInternals;var s=Qe(),r=kn(e),i=Jt(s,r);i.payload=t,n!=null&&(i.callback=n),t=bn(e,i,r),t!==null&&(Rt(t,e,r,s),Ti(t,e,r))},enqueueReplaceState:function(e,t,n){e=e._reactInternals;var s=Qe(),r=kn(e),i=Jt(s,r);i.tag=1,i.payload=t,n!=null&&(i.callback=n),t=bn(e,i,r),t!==null&&(Rt(t,e,r,s),Ti(t,e,r))},enqueueForceUpdate:function(e,t){e=e._reactInternals;var n=Qe(),s=kn(e),r=Jt(n,s);r.tag=2,t!=null&&(r.callback=t),t=bn(e,r,s),t!==null&&(Rt(t,e,s,n),Ti(t,e,s))}};function Hu(e,t,n,s,r,i,a){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(s,i,a):t.prototype&&t.prototype.isPureReactComponent?!br(n,s)||!br(r,i):!0}function Dp(e,t,n){var s=!1,r=En,i=t.contextType;return typeof i=="object"&&i!==null?i=wt(i):(r=st(t)?Fn:Ge.current,s=t.contextTypes,i=(s=s!=null)?Ss(e,r):En),t=new t(n,i),e.memoizedState=t.state!==null&&t.state!==void 0?t.state:null,t.updater=pa,e.stateNode=t,t._reactInternals=e,s&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=r,e.__reactInternalMemoizedMaskedChildContext=i),t}function Fu(e,t,n,s){e=t.state,typeof t.componentWillReceiveProps=="function"&&t.componentWillReceiveProps(n,s),typeof t.UNSAFE_componentWillReceiveProps=="function"&&t.UNSAFE_componentWillReceiveProps(n,s),t.state!==e&&pa.enqueueReplaceState(t,t.state,null)}function Jl(e,t,n,s){var r=e.stateNode;r.props=n,r.state=e.memoizedState,r.refs={},Oo(e);var i=t.contextType;typeof i=="object"&&i!==null?r.context=wt(i):(i=st(t)?Fn:Ge.current,r.context=Ss(e,i)),r.state=e.memoizedState,i=t.getDerivedStateFromProps,typeof i=="function"&&(Xl(e,t,i,n),r.state=e.memoizedState),typeof t.getDerivedStateFromProps=="function"||typeof r.getSnapshotBeforeUpdate=="function"||typeof r.UNSAFE_componentWillMount!="function"&&typeof r.componentWillMount!="function"||(t=r.state,typeof r.componentWillMount=="function"&&r.componentWillMount(),typeof r.UNSAFE_componentWillMount=="function"&&r.UNSAFE_componentWillMount(),t!==r.state&&pa.enqueueReplaceState(r,r.state,null),Qi(e,n,r,s),r.state=e.memoizedState),typeof r.componentDidMount=="function"&&(e.flags|=4194308)}function As(e,t){try{var n="",s=t;do n+=Hm(s),s=s.return;while(s);var r=n}catch(i){r=`
Error generating stack: `+i.message+`
`+i.stack}return{value:e,source:t,stack:r,digest:null}}function hl(e,t,n){return{value:e,source:null,stack:n??null,digest:t??null}}function Zl(e,t){try{console.error(t.value)}catch(n){setTimeout(function(){throw n})}}var fy=typeof WeakMap=="function"?WeakMap:Map;function Rp(e,t,n){n=Jt(-1,n),n.tag=3,n.payload={element:null};var s=t.value;return n.callback=function(){ta||(ta=!0,co=s),Zl(e,t)},n}function Ip(e,t,n){n=Jt(-1,n),n.tag=3;var s=e.type.getDerivedStateFromError;if(typeof s=="function"){var r=t.value;n.payload=function(){return s(r)},n.callback=function(){Zl(e,t)}}var i=e.stateNode;return i!==null&&typeof i.componentDidCatch=="function"&&(n.callback=function(){Zl(e,t),typeof s!="function"&&(Nn===null?Nn=new Set([this]):Nn.add(this));var a=t.stack;this.componentDidCatch(t.value,{componentStack:a!==null?a:""})}),n}function qu(e,t,n){var s=e.pingCache;if(s===null){s=e.pingCache=new fy;var r=new Set;s.set(t,r)}else r=s.get(t),r===void 0&&(r=new Set,s.set(t,r));r.has(n)||(r.add(n),e=Cy.bind(null,e,t,n),t.then(e,e))}function Gu(e){do{var t;if((t=e.tag===13)&&(t=e.memoizedState,t=t!==null?t.dehydrated!==null:!0),t)return e;e=e.return}while(e!==null);return null}function Vu(e,t,n,s,r){return(e.mode&1)===0?(e===t?e.flags|=65536:(e.flags|=128,n.flags|=131072,n.flags&=-52805,n.tag===1&&(n.alternate===null?n.tag=17:(t=Jt(-1,1),t.tag=2,bn(n,t,1))),n.lanes|=1),e):(e.flags|=65536,e.lanes=r,e)}var my=sn.ReactCurrentOwner,tt=!1;function Ye(e,t,n,s){t.child=e===null?op(t,null,n,s):Cs(t,e.child,n,s)}function Wu(e,t,n,s,r){n=n.render;var i=t.ref;return Ns(t,r),s=Ho(e,t,n,s,i,r),n=Fo(),e!==null&&!tt?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~r,nn(e,t,r)):(Ne&&n&&xo(t),t.flags|=1,Ye(e,t,s,r),t.child)}function ju(e,t,n,s,r){if(e===null){var i=n.type;return typeof i=="function"&&!Zo(i)&&i.defaultProps===void 0&&n.compare===null&&n.defaultProps===void 0?(t.tag=15,t.type=i,Lp(e,t,i,s,r)):(e=Li(n.type,null,s,t,t.mode,r),e.ref=t.ref,e.return=t,t.child=e)}if(i=e.child,(e.lanes&r)===0){var a=i.memoizedProps;if(n=n.compare,n=n!==null?n:br,n(a,s)&&e.ref===t.ref)return nn(e,t,r)}return t.flags|=1,e=_n(i,s),e.ref=t.ref,e.return=t,t.child=e}function Lp(e,t,n,s,r){if(e!==null){var i=e.memoizedProps;if(br(i,s)&&e.ref===t.ref)if(tt=!1,t.pendingProps=s=i,(e.lanes&r)!==0)(e.flags&131072)!==0&&(tt=!0);else return t.lanes=e.lanes,nn(e,t,r)}return eo(e,t,n,s,r)}function Pp(e,t,n){var s=t.pendingProps,r=s.children,i=e!==null?e.memoizedState:null;if(s.mode==="hidden")if((t.mode&1)===0)t.memoizedState={baseLanes:0,cachePool:null,transitions:null},ye(hs,ot),ot|=n;else{if((n&1073741824)===0)return e=i!==null?i.baseLanes|n:n,t.lanes=t.childLanes=1073741824,t.memoizedState={baseLanes:e,cachePool:null,transitions:null},t.updateQueue=null,ye(hs,ot),ot|=e,null;t.memoizedState={baseLanes:0,cachePool:null,transitions:null},s=i!==null?i.baseLanes:n,ye(hs,ot),ot|=s}else i!==null?(s=i.baseLanes|n,t.memoizedState=null):s=n,ye(hs,ot),ot|=s;return Ye(e,t,r,n),t.child}function Mp(e,t){var n=t.ref;(e===null&&n!==null||e!==null&&e.ref!==n)&&(t.flags|=512,t.flags|=2097152)}function eo(e,t,n,s,r){var i=st(n)?Fn:Ge.current;return i=Ss(t,i),Ns(t,r),n=Ho(e,t,n,s,i,r),s=Fo(),e!==null&&!tt?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~r,nn(e,t,r)):(Ne&&s&&xo(t),t.flags|=1,Ye(e,t,n,r),t.child)}function Yu(e,t,n,s,r){if(st(n)){var i=!0;Gi(t)}else i=!1;if(Ns(t,r),t.stateNode===null)Di(e,t),Dp(t,n,s),Jl(t,n,s,r),s=!0;else if(e===null){var a=t.stateNode,l=t.memoizedProps;a.props=l;var u=a.context,o=n.contextType;typeof o=="object"&&o!==null?o=wt(o):(o=st(n)?Fn:Ge.current,o=Ss(t,o));var h=n.getDerivedStateFromProps,g=typeof h=="function"||typeof a.getSnapshotBeforeUpdate=="function";g||typeof a.UNSAFE_componentWillReceiveProps!="function"&&typeof a.componentWillReceiveProps!="function"||(l!==s||u!==o)&&Fu(t,a,s,o),pn=!1;var v=t.memoizedState;a.state=v,Qi(t,s,a,r),u=t.memoizedState,l!==s||v!==u||nt.current||pn?(typeof h=="function"&&(Xl(t,n,h,s),u=t.memoizedState),(l=pn||Hu(t,n,l,s,v,u,o))?(g||typeof a.UNSAFE_componentWillMount!="function"&&typeof a.componentWillMount!="function"||(typeof a.componentWillMount=="function"&&a.componentWillMount(),typeof a.UNSAFE_componentWillMount=="function"&&a.UNSAFE_componentWillMount()),typeof a.componentDidMount=="function"&&(t.flags|=4194308)):(typeof a.componentDidMount=="function"&&(t.flags|=4194308),t.memoizedProps=s,t.memoizedState=u),a.props=s,a.state=u,a.context=o,s=l):(typeof a.componentDidMount=="function"&&(t.flags|=4194308),s=!1)}else{a=t.stateNode,up(e,t),l=t.memoizedProps,o=t.type===t.elementType?l:Tt(t.type,l),a.props=o,g=t.pendingProps,v=a.context,u=n.contextType,typeof u=="object"&&u!==null?u=wt(u):(u=st(n)?Fn:Ge.current,u=Ss(t,u));var w=n.getDerivedStateFromProps;(h=typeof w=="function"||typeof a.getSnapshotBeforeUpdate=="function")||typeof a.UNSAFE_componentWillReceiveProps!="function"&&typeof a.componentWillReceiveProps!="function"||(l!==g||v!==u)&&Fu(t,a,s,u),pn=!1,v=t.memoizedState,a.state=v,Qi(t,s,a,r);var S=t.memoizedState;l!==g||v!==S||nt.current||pn?(typeof w=="function"&&(Xl(t,n,w,s),S=t.memoizedState),(o=pn||Hu(t,n,o,s,v,S,u)||!1)?(h||typeof a.UNSAFE_componentWillUpdate!="function"&&typeof a.componentWillUpdate!="function"||(typeof a.componentWillUpdate=="function"&&a.componentWillUpdate(s,S,u),typeof a.UNSAFE_componentWillUpdate=="function"&&a.UNSAFE_componentWillUpdate(s,S,u)),typeof a.componentDidUpdate=="function"&&(t.flags|=4),typeof a.getSnapshotBeforeUpdate=="function"&&(t.flags|=1024)):(typeof a.componentDidUpdate!="function"||l===e.memoizedProps&&v===e.memoizedState||(t.flags|=4),typeof a.getSnapshotBeforeUpdate!="function"||l===e.memoizedProps&&v===e.memoizedState||(t.flags|=1024),t.memoizedProps=s,t.memoizedState=S),a.props=s,a.state=S,a.context=u,s=o):(typeof a.componentDidUpdate!="function"||l===e.memoizedProps&&v===e.memoizedState||(t.flags|=4),typeof a.getSnapshotBeforeUpdate!="function"||l===e.memoizedProps&&v===e.memoizedState||(t.flags|=1024),s=!1)}return to(e,t,n,s,i,r)}function to(e,t,n,s,r,i){Mp(e,t);var a=(t.flags&128)!==0;if(!s&&!a)return r&&Lu(t,n,!1),nn(e,t,i);s=t.stateNode,my.current=t;var l=a&&typeof n.getDerivedStateFromError!="function"?null:s.render();return t.flags|=1,e!==null&&a?(t.child=Cs(t,e.child,null,i),t.child=Cs(t,null,l,i)):Ye(e,t,l,i),t.memoizedState=s.state,r&&Lu(t,n,!0),t.child}function Op(e){var t=e.stateNode;t.pendingContext?Iu(e,t.pendingContext,t.pendingContext!==t.context):t.context&&Iu(e,t.context,!1),Uo(e,t.containerInfo)}function Qu(e,t,n,s,r){return Es(),Ro(r),t.flags|=256,Ye(e,t,n,s),t.child}var no={dehydrated:null,treeContext:null,retryLane:0};function so(e){return{baseLanes:e,cachePool:null,transitions:null}}function Up(e,t,n){var s=t.pendingProps,r=Se.current,i=!1,a=(t.flags&128)!==0,l;if((l=a)||(l=e!==null&&e.memoizedState===null?!1:(r&2)!==0),l?(i=!0,t.flags&=-129):(e===null||e.memoizedState!==null)&&(r|=1),ye(Se,r&1),e===null)return Yl(t),e=t.memoizedState,e!==null&&(e=e.dehydrated,e!==null)?((t.mode&1)===0?t.lanes=1:e.data==="$!"?t.lanes=8:t.lanes=1073741824,null):(a=s.children,e=s.fallback,i?(s=t.mode,i=t.child,a={mode:"hidden",children:a},(s&1)===0&&i!==null?(i.childLanes=0,i.pendingProps=a):i=va(a,s,0,null),e=Hn(e,s,n,null),i.return=t,e.return=t,i.sibling=e,t.child=i,t.child.memoizedState=so(n),t.memoizedState=no,e):Vo(t,a));if(r=e.memoizedState,r!==null&&(l=r.dehydrated,l!==null))return vy(e,t,a,s,l,r,n);if(i){i=s.fallback,a=t.mode,r=e.child,l=r.sibling;var u={mode:"hidden",children:s.children};return(a&1)===0&&t.child!==r?(s=t.child,s.childLanes=0,s.pendingProps=u,t.deletions=null):(s=_n(r,u),s.subtreeFlags=r.subtreeFlags&14680064),l!==null?i=_n(l,i):(i=Hn(i,a,n,null),i.flags|=2),i.return=t,s.return=t,s.sibling=i,t.child=s,s=i,i=t.child,a=e.child.memoizedState,a=a===null?so(n):{baseLanes:a.baseLanes|n,cachePool:null,transitions:a.transitions},i.memoizedState=a,i.childLanes=e.childLanes&~n,t.memoizedState=no,s}return i=e.child,e=i.sibling,s=_n(i,{mode:"visible",children:s.children}),(t.mode&1)===0&&(s.lanes=n),s.return=t,s.sibling=null,e!==null&&(n=t.deletions,n===null?(t.deletions=[e],t.flags|=16):n.push(e)),t.child=s,t.memoizedState=null,s}function Vo(e,t){return t=va({mode:"visible",children:t},e.mode,0,null),t.return=e,e.child=t}function Ni(e,t,n,s){return s!==null&&Ro(s),Cs(t,e.child,null,n),e=Vo(t,t.pendingProps.children),e.flags|=2,t.memoizedState=null,e}function vy(e,t,n,s,r,i,a){if(n)return t.flags&256?(t.flags&=-257,s=hl(Error(F(422))),Ni(e,t,a,s)):t.memoizedState!==null?(t.child=e.child,t.flags|=128,null):(i=s.fallback,r=t.mode,s=va({mode:"visible",children:s.children},r,0,null),i=Hn(i,r,a,null),i.flags|=2,s.return=t,i.return=t,s.sibling=i,t.child=s,(t.mode&1)!==0&&Cs(t,e.child,null,a),t.child.memoizedState=so(a),t.memoizedState=no,i);if((t.mode&1)===0)return Ni(e,t,a,null);if(r.data==="$!"){if(s=r.nextSibling&&r.nextSibling.dataset,s)var l=s.dgst;return s=l,i=Error(F(419)),s=hl(i,s,void 0),Ni(e,t,a,s)}if(l=(a&e.childLanes)!==0,tt||l){if(s=Pe,s!==null){switch(a&-a){case 4:r=2;break;case 16:r=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:r=32;break;case 536870912:r=268435456;break;default:r=0}r=(r&(s.suspendedLanes|a))!==0?0:r,r!==0&&r!==i.retryLane&&(i.retryLane=r,tn(e,r),Rt(s,e,r,-1))}return Jo(),s=hl(Error(F(421))),Ni(e,t,a,s)}return r.data==="$?"?(t.flags|=128,t.child=e.child,t=Ty.bind(null,e),r._reactRetry=t,null):(e=i.treeContext,ct=wn(r.nextSibling),ut=t,Ne=!0,xt=null,e!==null&&(yt[ht++]=Qt,yt[ht++]=Xt,yt[ht++]=qn,Qt=e.id,Xt=e.overflow,qn=t),t=Vo(t,s.children),t.flags|=4096,t)}function Xu(e,t,n){e.lanes|=t;var s=e.alternate;s!==null&&(s.lanes|=t),Ql(e.return,t,n)}function gl(e,t,n,s,r){var i=e.memoizedState;i===null?e.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:s,tail:n,tailMode:r}:(i.isBackwards=t,i.rendering=null,i.renderingStartTime=0,i.last=s,i.tail=n,i.tailMode=r)}function Bp(e,t,n){var s=t.pendingProps,r=s.revealOrder,i=s.tail;if(Ye(e,t,s.children,n),s=Se.current,(s&2)!==0)s=s&1|2,t.flags|=128;else{if(e!==null&&(e.flags&128)!==0)e:for(e=t.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&Xu(e,n,t);else if(e.tag===19)Xu(e,n,t);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break e;for(;e.sibling===null;){if(e.return===null||e.return===t)break e;e=e.return}e.sibling.return=e.return,e=e.sibling}s&=1}if(ye(Se,s),(t.mode&1)===0)t.memoizedState=null;else switch(r){case"forwards":for(n=t.child,r=null;n!==null;)e=n.alternate,e!==null&&Xi(e)===null&&(r=n),n=n.sibling;n=r,n===null?(r=t.child,t.child=null):(r=n.sibling,n.sibling=null),gl(t,!1,r,n,i);break;case"backwards":for(n=null,r=t.child,t.child=null;r!==null;){if(e=r.alternate,e!==null&&Xi(e)===null){t.child=r;break}e=r.sibling,r.sibling=n,n=r,r=e}gl(t,!0,n,null,i);break;case"together":gl(t,!1,null,null,void 0);break;default:t.memoizedState=null}return t.child}function Di(e,t){(t.mode&1)===0&&e!==null&&(e.alternate=null,t.alternate=null,t.flags|=2)}function nn(e,t,n){if(e!==null&&(t.dependencies=e.dependencies),Vn|=t.lanes,(n&t.childLanes)===0)return null;if(e!==null&&t.child!==e.child)throw Error(F(153));if(t.child!==null){for(e=t.child,n=_n(e,e.pendingProps),t.child=n,n.return=t;e.sibling!==null;)e=e.sibling,n=n.sibling=_n(e,e.pendingProps),n.return=t;n.sibling=null}return t.child}function yy(e,t,n){switch(t.tag){case 3:Op(t),Es();break;case 5:dp(t);break;case 1:st(t.type)&&Gi(t);break;case 4:Uo(t,t.stateNode.containerInfo);break;case 10:var s=t.type._context,r=t.memoizedProps.value;ye(ji,s._currentValue),s._currentValue=r;break;case 13:if(s=t.memoizedState,s!==null)return s.dehydrated!==null?(ye(Se,Se.current&1),t.flags|=128,null):(n&t.child.childLanes)!==0?Up(e,t,n):(ye(Se,Se.current&1),e=nn(e,t,n),e!==null?e.sibling:null);ye(Se,Se.current&1);break;case 19:if(s=(n&t.childLanes)!==0,(e.flags&128)!==0){if(s)return Bp(e,t,n);t.flags|=128}if(r=t.memoizedState,r!==null&&(r.rendering=null,r.tail=null,r.lastEffect=null),ye(Se,Se.current),s)break;return null;case 22:case 23:return t.lanes=0,Pp(e,t,n)}return nn(e,t,n)}var Kp,ro,zp,Hp;Kp=function(e,t){for(var n=t.child;n!==null;){if(n.tag===5||n.tag===6)e.appendChild(n.stateNode);else if(n.tag!==4&&n.child!==null){n.child.return=n,n=n.child;continue}if(n===t)break;for(;n.sibling===null;){if(n.return===null||n.return===t)return;n=n.return}n.sibling.return=n.return,n=n.sibling}};ro=function(){};zp=function(e,t,n,s){var r=e.memoizedProps;if(r!==s){e=t.stateNode,Kn(Ft.current);var i=null;switch(n){case"input":r=El(e,r),s=El(e,s),i=[];break;case"select":r=Ce({},r,{value:void 0}),s=Ce({},s,{value:void 0}),i=[];break;case"textarea":r=Al(e,r),s=Al(e,s),i=[];break;default:typeof r.onClick!="function"&&typeof s.onClick=="function"&&(e.onclick=Fi)}Dl(n,s);var a;n=null;for(o in r)if(!s.hasOwnProperty(o)&&r.hasOwnProperty(o)&&r[o]!=null)if(o==="style"){var l=r[o];for(a in l)l.hasOwnProperty(a)&&(n||(n={}),n[a]="")}else o!=="dangerouslySetInnerHTML"&&o!=="children"&&o!=="suppressContentEditableWarning"&&o!=="suppressHydrationWarning"&&o!=="autoFocus"&&(mr.hasOwnProperty(o)?i||(i=[]):(i=i||[]).push(o,null));for(o in s){var u=s[o];if(l=r?.[o],s.hasOwnProperty(o)&&u!==l&&(u!=null||l!=null))if(o==="style")if(l){for(a in l)!l.hasOwnProperty(a)||u&&u.hasOwnProperty(a)||(n||(n={}),n[a]="");for(a in u)u.hasOwnProperty(a)&&l[a]!==u[a]&&(n||(n={}),n[a]=u[a])}else n||(i||(i=[]),i.push(o,n)),n=u;else o==="dangerouslySetInnerHTML"?(u=u?u.__html:void 0,l=l?l.__html:void 0,u!=null&&l!==u&&(i=i||[]).push(o,u)):o==="children"?typeof u!="string"&&typeof u!="number"||(i=i||[]).push(o,""+u):o!=="suppressContentEditableWarning"&&o!=="suppressHydrationWarning"&&(mr.hasOwnProperty(o)?(u!=null&&o==="onScroll"&&he("scroll",e),i||l===u||(i=[])):(i=i||[]).push(o,u))}n&&(i=i||[]).push("style",n);var o=i;(t.updateQueue=o)&&(t.flags|=4)}};Hp=function(e,t,n,s){n!==s&&(t.flags|=4)};function Js(e,t){if(!Ne)switch(e.tailMode){case"hidden":t=e.tail;for(var n=null;t!==null;)t.alternate!==null&&(n=t),t=t.sibling;n===null?e.tail=null:n.sibling=null;break;case"collapsed":n=e.tail;for(var s=null;n!==null;)n.alternate!==null&&(s=n),n=n.sibling;s===null?t||e.tail===null?e.tail=null:e.tail.sibling=null:s.sibling=null}}function Fe(e){var t=e.alternate!==null&&e.alternate.child===e.child,n=0,s=0;if(t)for(var r=e.child;r!==null;)n|=r.lanes|r.childLanes,s|=r.subtreeFlags&14680064,s|=r.flags&14680064,r.return=e,r=r.sibling;else for(r=e.child;r!==null;)n|=r.lanes|r.childLanes,s|=r.subtreeFlags,s|=r.flags,r.return=e,r=r.sibling;return e.subtreeFlags|=s,e.childLanes=n,t}function hy(e,t,n){var s=t.pendingProps;switch(Do(t),t.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return Fe(t),null;case 1:return st(t.type)&&qi(),Fe(t),null;case 3:return s=t.stateNode,Ts(),ge(nt),ge(Ge),Ko(),s.pendingContext&&(s.context=s.pendingContext,s.pendingContext=null),(e===null||e.child===null)&&(wi(t)?t.flags|=4:e===null||e.memoizedState.isDehydrated&&(t.flags&256)===0||(t.flags|=1024,xt!==null&&(fo(xt),xt=null))),ro(e,t),Fe(t),null;case 5:Bo(t);var r=Kn(Er.current);if(n=t.type,e!==null&&t.stateNode!=null)zp(e,t,n,s,r),e.ref!==t.ref&&(t.flags|=512,t.flags|=2097152);else{if(!s){if(t.stateNode===null)throw Error(F(166));return Fe(t),null}if(e=Kn(Ft.current),wi(t)){s=t.stateNode,n=t.type;var i=t.memoizedProps;switch(s[zt]=t,s[_r]=i,e=(t.mode&1)!==0,n){case"dialog":he("cancel",s),he("close",s);break;case"iframe":case"object":case"embed":he("load",s);break;case"video":case"audio":for(r=0;r<rr.length;r++)he(rr[r],s);break;case"source":he("error",s);break;case"img":case"image":case"link":he("error",s),he("load",s);break;case"details":he("toggle",s);break;case"input":iu(s,i),he("invalid",s);break;case"select":s._wrapperState={wasMultiple:!!i.multiple},he("invalid",s);break;case"textarea":lu(s,i),he("invalid",s)}Dl(n,i),r=null;for(var a in i)if(i.hasOwnProperty(a)){var l=i[a];a==="children"?typeof l=="string"?s.textContent!==l&&(i.suppressHydrationWarning!==!0&&$i(s.textContent,l,e),r=["children",l]):typeof l=="number"&&s.textContent!==""+l&&(i.suppressHydrationWarning!==!0&&$i(s.textContent,l,e),r=["children",""+l]):mr.hasOwnProperty(a)&&l!=null&&a==="onScroll"&&he("scroll",s)}switch(n){case"input":li(s),au(s,i,!0);break;case"textarea":li(s),ou(s);break;case"select":case"option":break;default:typeof i.onClick=="function"&&(s.onclick=Fi)}s=r,t.updateQueue=s,s!==null&&(t.flags|=4)}else{a=r.nodeType===9?r:r.ownerDocument,e==="http://www.w3.org/1999/xhtml"&&(e=yd(n)),e==="http://www.w3.org/1999/xhtml"?n==="script"?(e=a.createElement("div"),e.innerHTML="<script><\/script>",e=e.removeChild(e.firstChild)):typeof s.is=="string"?e=a.createElement(n,{is:s.is}):(e=a.createElement(n),n==="select"&&(a=e,s.multiple?a.multiple=!0:s.size&&(a.size=s.size))):e=a.createElementNS(e,n),e[zt]=t,e[_r]=s,Kp(e,t,!1,!1),t.stateNode=e;e:{switch(a=Rl(n,s),n){case"dialog":he("cancel",e),he("close",e),r=s;break;case"iframe":case"object":case"embed":he("load",e),r=s;break;case"video":case"audio":for(r=0;r<rr.length;r++)he(rr[r],e);r=s;break;case"source":he("error",e),r=s;break;case"img":case"image":case"link":he("error",e),he("load",e),r=s;break;case"details":he("toggle",e),r=s;break;case"input":iu(e,s),r=El(e,s),he("invalid",e);break;case"option":r=s;break;case"select":e._wrapperState={wasMultiple:!!s.multiple},r=Ce({},s,{value:void 0}),he("invalid",e);break;case"textarea":lu(e,s),r=Al(e,s),he("invalid",e);break;default:r=s}Dl(n,r),l=r;for(i in l)if(l.hasOwnProperty(i)){var u=l[i];i==="style"?$d(e,u):i==="dangerouslySetInnerHTML"?(u=u?u.__html:void 0,u!=null&&hd(e,u)):i==="children"?typeof u=="string"?(n!=="textarea"||u!=="")&&vr(e,u):typeof u=="number"&&vr(e,""+u):i!=="suppressContentEditableWarning"&&i!=="suppressHydrationWarning"&&i!=="autoFocus"&&(mr.hasOwnProperty(i)?u!=null&&i==="onScroll"&&he("scroll",e):u!=null&&yo(e,i,u,a))}switch(n){case"input":li(e),au(e,s,!1);break;case"textarea":li(e),ou(e);break;case"option":s.value!=null&&e.setAttribute("value",""+Sn(s.value));break;case"select":e.multiple=!!s.multiple,i=s.value,i!=null?gs(e,!!s.multiple,i,!1):s.defaultValue!=null&&gs(e,!!s.multiple,s.defaultValue,!0);break;default:typeof r.onClick=="function"&&(e.onclick=Fi)}switch(n){case"button":case"input":case"select":case"textarea":s=!!s.autoFocus;break e;case"img":s=!0;break e;default:s=!1}}s&&(t.flags|=4)}t.ref!==null&&(t.flags|=512,t.flags|=2097152)}return Fe(t),null;case 6:if(e&&t.stateNode!=null)Hp(e,t,e.memoizedProps,s);else{if(typeof s!="string"&&t.stateNode===null)throw Error(F(166));if(n=Kn(Er.current),Kn(Ft.current),wi(t)){if(s=t.stateNode,n=t.memoizedProps,s[zt]=t,(i=s.nodeValue!==n)&&(e=ut,e!==null))switch(e.tag){case 3:$i(s.nodeValue,n,(e.mode&1)!==0);break;case 5:e.memoizedProps.suppressHydrationWarning!==!0&&$i(s.nodeValue,n,(e.mode&1)!==0)}i&&(t.flags|=4)}else s=(n.nodeType===9?n:n.ownerDocument).createTextNode(s),s[zt]=t,t.stateNode=s}return Fe(t),null;case 13:if(ge(Se),s=t.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(Ne&&ct!==null&&(t.mode&1)!==0&&(t.flags&128)===0)ap(),Es(),t.flags|=98560,i=!1;else if(i=wi(t),s!==null&&s.dehydrated!==null){if(e===null){if(!i)throw Error(F(318));if(i=t.memoizedState,i=i!==null?i.dehydrated:null,!i)throw Error(F(317));i[zt]=t}else Es(),(t.flags&128)===0&&(t.memoizedState=null),t.flags|=4;Fe(t),i=!1}else xt!==null&&(fo(xt),xt=null),i=!0;if(!i)return t.flags&65536?t:null}return(t.flags&128)!==0?(t.lanes=n,t):(s=s!==null,s!==(e!==null&&e.memoizedState!==null)&&s&&(t.child.flags|=8192,(t.mode&1)!==0&&(e===null||(Se.current&1)!==0?Ie===0&&(Ie=3):Jo())),t.updateQueue!==null&&(t.flags|=4),Fe(t),null);case 4:return Ts(),ro(e,t),e===null&&Nr(t.stateNode.containerInfo),Fe(t),null;case 10:return Po(t.type._context),Fe(t),null;case 17:return st(t.type)&&qi(),Fe(t),null;case 19:if(ge(Se),i=t.memoizedState,i===null)return Fe(t),null;if(s=(t.flags&128)!==0,a=i.rendering,a===null)if(s)Js(i,!1);else{if(Ie!==0||e!==null&&(e.flags&128)!==0)for(e=t.child;e!==null;){if(a=Xi(e),a!==null){for(t.flags|=128,Js(i,!1),s=a.updateQueue,s!==null&&(t.updateQueue=s,t.flags|=4),t.subtreeFlags=0,s=n,n=t.child;n!==null;)i=n,e=s,i.flags&=14680066,a=i.alternate,a===null?(i.childLanes=0,i.lanes=e,i.child=null,i.subtreeFlags=0,i.memoizedProps=null,i.memoizedState=null,i.updateQueue=null,i.dependencies=null,i.stateNode=null):(i.childLanes=a.childLanes,i.lanes=a.lanes,i.child=a.child,i.subtreeFlags=0,i.deletions=null,i.memoizedProps=a.memoizedProps,i.memoizedState=a.memoizedState,i.updateQueue=a.updateQueue,i.type=a.type,e=a.dependencies,i.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext}),n=n.sibling;return ye(Se,Se.current&1|2),t.child}e=e.sibling}i.tail!==null&&Ae()>xs&&(t.flags|=128,s=!0,Js(i,!1),t.lanes=4194304)}else{if(!s)if(e=Xi(a),e!==null){if(t.flags|=128,s=!0,n=e.updateQueue,n!==null&&(t.updateQueue=n,t.flags|=4),Js(i,!0),i.tail===null&&i.tailMode==="hidden"&&!a.alternate&&!Ne)return Fe(t),null}else 2*Ae()-i.renderingStartTime>xs&&n!==1073741824&&(t.flags|=128,s=!0,Js(i,!1),t.lanes=4194304);i.isBackwards?(a.sibling=t.child,t.child=a):(n=i.last,n!==null?n.sibling=a:t.child=a,i.last=a)}return i.tail!==null?(t=i.tail,i.rendering=t,i.tail=t.sibling,i.renderingStartTime=Ae(),t.sibling=null,n=Se.current,ye(Se,s?n&1|2:n&1),t):(Fe(t),null);case 22:case 23:return Xo(),s=t.memoizedState!==null,e!==null&&e.memoizedState!==null!==s&&(t.flags|=8192),s&&(t.mode&1)!==0?(ot&1073741824)!==0&&(Fe(t),t.subtreeFlags&6&&(t.flags|=8192)):Fe(t),null;case 24:return null;case 25:return null}throw Error(F(156,t.tag))}function gy(e,t){switch(Do(t),t.tag){case 1:return st(t.type)&&qi(),e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 3:return Ts(),ge(nt),ge(Ge),Ko(),e=t.flags,(e&65536)!==0&&(e&128)===0?(t.flags=e&-65537|128,t):null;case 5:return Bo(t),null;case 13:if(ge(Se),e=t.memoizedState,e!==null&&e.dehydrated!==null){if(t.alternate===null)throw Error(F(340));Es()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 19:return ge(Se),null;case 4:return Ts(),null;case 10:return Po(t.type._context),null;case 22:case 23:return Xo(),null;case 24:return null;default:return null}}var ki=!1,qe=!1,$y=typeof WeakSet=="function"?WeakSet:Set,ee=null;function ys(e,t){var n=e.ref;if(n!==null)if(typeof n=="function")try{n(null)}catch(s){Te(e,t,s)}else n.current=null}function io(e,t,n){try{n()}catch(s){Te(e,t,s)}}var Ju=!1;function wy(e,t){if(Hl=Ki,e=Wd(),Ao(e)){if("selectionStart"in e)var n={start:e.selectionStart,end:e.selectionEnd};else e:{n=(n=e.ownerDocument)&&n.defaultView||window;var s=n.getSelection&&n.getSelection();if(s&&s.rangeCount!==0){n=s.anchorNode;var r=s.anchorOffset,i=s.focusNode;s=s.focusOffset;try{n.nodeType,i.nodeType}catch{n=null;break e}var a=0,l=-1,u=-1,o=0,h=0,g=e,v=null;t:for(;;){for(var w;g!==n||r!==0&&g.nodeType!==3||(l=a+r),g!==i||s!==0&&g.nodeType!==3||(u=a+s),g.nodeType===3&&(a+=g.nodeValue.length),(w=g.firstChild)!==null;)v=g,g=w;for(;;){if(g===e)break t;if(v===n&&++o===r&&(l=a),v===i&&++h===s&&(u=a),(w=g.nextSibling)!==null)break;g=v,v=g.parentNode}g=w}n=l===-1||u===-1?null:{start:l,end:u}}else n=null}n=n||{start:0,end:0}}else n=null;for(Fl={focusedElem:e,selectionRange:n},Ki=!1,ee=t;ee!==null;)if(t=ee,e=t.child,(t.subtreeFlags&1028)!==0&&e!==null)e.return=t,ee=e;else for(;ee!==null;){t=ee;try{var S=t.alternate;if((t.flags&1024)!==0)switch(t.tag){case 0:case 11:case 15:break;case 1:if(S!==null){var b=S.memoizedProps,C=S.memoizedState,y=t.stateNode,m=y.getSnapshotBeforeUpdate(t.elementType===t.type?b:Tt(t.type,b),C);y.__reactInternalSnapshotBeforeUpdate=m}break;case 3:var p=t.stateNode.containerInfo;p.nodeType===1?p.textContent="":p.nodeType===9&&p.documentElement&&p.removeChild(p.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(F(163))}}catch(_){Te(t,t.return,_)}if(e=t.sibling,e!==null){e.return=t.return,ee=e;break}ee=t.return}return S=Ju,Ju=!1,S}function dr(e,t,n){var s=t.updateQueue;if(s=s!==null?s.lastEffect:null,s!==null){var r=s=s.next;do{if((r.tag&e)===e){var i=r.destroy;r.destroy=void 0,i!==void 0&&io(t,n,i)}r=r.next}while(r!==s)}}function fa(e,t){if(t=t.updateQueue,t=t!==null?t.lastEffect:null,t!==null){var n=t=t.next;do{if((n.tag&e)===e){var s=n.create;n.destroy=s()}n=n.next}while(n!==t)}}function ao(e){var t=e.ref;if(t!==null){var n=e.stateNode;e.tag,e=n,typeof t=="function"?t(e):t.current=e}}function Fp(e){var t=e.alternate;t!==null&&(e.alternate=null,Fp(t)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(t=e.stateNode,t!==null&&(delete t[zt],delete t[_r],delete t[Vl],delete t[ny],delete t[sy])),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}function qp(e){return e.tag===5||e.tag===3||e.tag===4}function Zu(e){e:for(;;){for(;e.sibling===null;){if(e.return===null||qp(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.flags&2||e.child===null||e.tag===4)continue e;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function lo(e,t,n){var s=e.tag;if(s===5||s===6)e=e.stateNode,t?n.nodeType===8?n.parentNode.insertBefore(e,t):n.insertBefore(e,t):(n.nodeType===8?(t=n.parentNode,t.insertBefore(e,n)):(t=n,t.appendChild(e)),n=n._reactRootContainer,n!=null||t.onclick!==null||(t.onclick=Fi));else if(s!==4&&(e=e.child,e!==null))for(lo(e,t,n),e=e.sibling;e!==null;)lo(e,t,n),e=e.sibling}function oo(e,t,n){var s=e.tag;if(s===5||s===6)e=e.stateNode,t?n.insertBefore(e,t):n.appendChild(e);else if(s!==4&&(e=e.child,e!==null))for(oo(e,t,n),e=e.sibling;e!==null;)oo(e,t,n),e=e.sibling}var Oe=null,At=!1;function un(e,t,n){for(n=n.child;n!==null;)Gp(e,t,n),n=n.sibling}function Gp(e,t,n){if(Ht&&typeof Ht.onCommitFiberUnmount=="function")try{Ht.onCommitFiberUnmount(ia,n)}catch{}switch(n.tag){case 5:qe||ys(n,t);case 6:var s=Oe,r=At;Oe=null,un(e,t,n),Oe=s,At=r,Oe!==null&&(At?(e=Oe,n=n.stateNode,e.nodeType===8?e.parentNode.removeChild(n):e.removeChild(n)):Oe.removeChild(n.stateNode));break;case 18:Oe!==null&&(At?(e=Oe,n=n.stateNode,e.nodeType===8?dl(e.parentNode,n):e.nodeType===1&&dl(e,n),$r(e)):dl(Oe,n.stateNode));break;case 4:s=Oe,r=At,Oe=n.stateNode.containerInfo,At=!0,un(e,t,n),Oe=s,At=r;break;case 0:case 11:case 14:case 15:if(!qe&&(s=n.updateQueue,s!==null&&(s=s.lastEffect,s!==null))){r=s=s.next;do{var i=r,a=i.destroy;i=i.tag,a!==void 0&&((i&2)!==0||(i&4)!==0)&&io(n,t,a),r=r.next}while(r!==s)}un(e,t,n);break;case 1:if(!qe&&(ys(n,t),s=n.stateNode,typeof s.componentWillUnmount=="function"))try{s.props=n.memoizedProps,s.state=n.memoizedState,s.componentWillUnmount()}catch(l){Te(n,t,l)}un(e,t,n);break;case 21:un(e,t,n);break;case 22:n.mode&1?(qe=(s=qe)||n.memoizedState!==null,un(e,t,n),qe=s):un(e,t,n);break;default:un(e,t,n)}}function ed(e){var t=e.updateQueue;if(t!==null){e.updateQueue=null;var n=e.stateNode;n===null&&(n=e.stateNode=new $y),t.forEach(function(s){var r=Ay.bind(null,e,s);n.has(s)||(n.add(s),s.then(r,r))})}}function Ct(e,t){var n=t.deletions;if(n!==null)for(var s=0;s<n.length;s++){var r=n[s];try{var i=e,a=t,l=a;e:for(;l!==null;){switch(l.tag){case 5:Oe=l.stateNode,At=!1;break e;case 3:Oe=l.stateNode.containerInfo,At=!0;break e;case 4:Oe=l.stateNode.containerInfo,At=!0;break e}l=l.return}if(Oe===null)throw Error(F(160));Gp(i,a,r),Oe=null,At=!1;var u=r.alternate;u!==null&&(u.return=null),r.return=null}catch(o){Te(r,t,o)}}if(t.subtreeFlags&12854)for(t=t.child;t!==null;)Vp(t,e),t=t.sibling}function Vp(e,t){var n=e.alternate,s=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:if(Ct(t,e),Bt(e),s&4){try{dr(3,e,e.return),fa(3,e)}catch(b){Te(e,e.return,b)}try{dr(5,e,e.return)}catch(b){Te(e,e.return,b)}}break;case 1:Ct(t,e),Bt(e),s&512&&n!==null&&ys(n,n.return);break;case 5:if(Ct(t,e),Bt(e),s&512&&n!==null&&ys(n,n.return),e.flags&32){var r=e.stateNode;try{vr(r,"")}catch(b){Te(e,e.return,b)}}if(s&4&&(r=e.stateNode,r!=null)){var i=e.memoizedProps,a=n!==null?n.memoizedProps:i,l=e.type,u=e.updateQueue;if(e.updateQueue=null,u!==null)try{l==="input"&&i.type==="radio"&&i.name!=null&&md(r,i),Rl(l,a);var o=Rl(l,i);for(a=0;a<u.length;a+=2){var h=u[a],g=u[a+1];h==="style"?$d(r,g):h==="dangerouslySetInnerHTML"?hd(r,g):h==="children"?vr(r,g):yo(r,h,g,o)}switch(l){case"input":Cl(r,i);break;case"textarea":vd(r,i);break;case"select":var v=r._wrapperState.wasMultiple;r._wrapperState.wasMultiple=!!i.multiple;var w=i.value;w!=null?gs(r,!!i.multiple,w,!1):v!==!!i.multiple&&(i.defaultValue!=null?gs(r,!!i.multiple,i.defaultValue,!0):gs(r,!!i.multiple,i.multiple?[]:"",!1))}r[_r]=i}catch(b){Te(e,e.return,b)}}break;case 6:if(Ct(t,e),Bt(e),s&4){if(e.stateNode===null)throw Error(F(162));r=e.stateNode,i=e.memoizedProps;try{r.nodeValue=i}catch(b){Te(e,e.return,b)}}break;case 3:if(Ct(t,e),Bt(e),s&4&&n!==null&&n.memoizedState.isDehydrated)try{$r(t.containerInfo)}catch(b){Te(e,e.return,b)}break;case 4:Ct(t,e),Bt(e);break;case 13:Ct(t,e),Bt(e),r=e.child,r.flags&8192&&(i=r.memoizedState!==null,r.stateNode.isHidden=i,!i||r.alternate!==null&&r.alternate.memoizedState!==null||(Yo=Ae())),s&4&&ed(e);break;case 22:if(h=n!==null&&n.memoizedState!==null,e.mode&1?(qe=(o=qe)||h,Ct(t,e),qe=o):Ct(t,e),Bt(e),s&8192){if(o=e.memoizedState!==null,(e.stateNode.isHidden=o)&&!h&&(e.mode&1)!==0)for(ee=e,h=e.child;h!==null;){for(g=ee=h;ee!==null;){switch(v=ee,w=v.child,v.tag){case 0:case 11:case 14:case 15:dr(4,v,v.return);break;case 1:ys(v,v.return);var S=v.stateNode;if(typeof S.componentWillUnmount=="function"){s=v,n=v.return;try{t=s,S.props=t.memoizedProps,S.state=t.memoizedState,S.componentWillUnmount()}catch(b){Te(s,n,b)}}break;case 5:ys(v,v.return);break;case 22:if(v.memoizedState!==null){nd(g);continue}}w!==null?(w.return=v,ee=w):nd(g)}h=h.sibling}e:for(h=null,g=e;;){if(g.tag===5){if(h===null){h=g;try{r=g.stateNode,o?(i=r.style,typeof i.setProperty=="function"?i.setProperty("display","none","important"):i.display="none"):(l=g.stateNode,u=g.memoizedProps.style,a=u!=null&&u.hasOwnProperty("display")?u.display:null,l.style.display=gd("display",a))}catch(b){Te(e,e.return,b)}}}else if(g.tag===6){if(h===null)try{g.stateNode.nodeValue=o?"":g.memoizedProps}catch(b){Te(e,e.return,b)}}else if((g.tag!==22&&g.tag!==23||g.memoizedState===null||g===e)&&g.child!==null){g.child.return=g,g=g.child;continue}if(g===e)break e;for(;g.sibling===null;){if(g.return===null||g.return===e)break e;h===g&&(h=null),g=g.return}h===g&&(h=null),g.sibling.return=g.return,g=g.sibling}}break;case 19:Ct(t,e),Bt(e),s&4&&ed(e);break;case 21:break;default:Ct(t,e),Bt(e)}}function Bt(e){var t=e.flags;if(t&2){try{e:{for(var n=e.return;n!==null;){if(qp(n)){var s=n;break e}n=n.return}throw Error(F(160))}switch(s.tag){case 5:var r=s.stateNode;s.flags&32&&(vr(r,""),s.flags&=-33);var i=Zu(e);oo(e,i,r);break;case 3:case 4:var a=s.stateNode.containerInfo,l=Zu(e);lo(e,l,a);break;default:throw Error(F(161))}}catch(u){Te(e,e.return,u)}e.flags&=-3}t&4096&&(e.flags&=-4097)}function by(e,t,n){ee=e,Wp(e,t,n)}function Wp(e,t,n){for(var s=(e.mode&1)!==0;ee!==null;){var r=ee,i=r.child;if(r.tag===22&&s){var a=r.memoizedState!==null||ki;if(!a){var l=r.alternate,u=l!==null&&l.memoizedState!==null||qe;l=ki;var o=qe;if(ki=a,(qe=u)&&!o)for(ee=r;ee!==null;)a=ee,u=a.child,a.tag===22&&a.memoizedState!==null?sd(r):u!==null?(u.return=a,ee=u):sd(r);for(;i!==null;)ee=i,Wp(i,t,n),i=i.sibling;ee=r,ki=l,qe=o}td(e,t,n)}else(r.subtreeFlags&8772)!==0&&i!==null?(i.return=r,ee=i):td(e,t,n)}}function td(e){for(;ee!==null;){var t=ee;if((t.flags&8772)!==0){var n=t.alternate;try{if((t.flags&8772)!==0)switch(t.tag){case 0:case 11:case 15:qe||fa(5,t);break;case 1:var s=t.stateNode;if(t.flags&4&&!qe)if(n===null)s.componentDidMount();else{var r=t.elementType===t.type?n.memoizedProps:Tt(t.type,n.memoizedProps);s.componentDidUpdate(r,n.memoizedState,s.__reactInternalSnapshotBeforeUpdate)}var i=t.updateQueue;i!==null&&Bu(t,i,s);break;case 3:var a=t.updateQueue;if(a!==null){if(n=null,t.child!==null)switch(t.child.tag){case 5:n=t.child.stateNode;break;case 1:n=t.child.stateNode}Bu(t,a,n)}break;case 5:var l=t.stateNode;if(n===null&&t.flags&4){n=l;var u=t.memoizedProps;switch(t.type){case"button":case"input":case"select":case"textarea":u.autoFocus&&n.focus();break;case"img":u.src&&(n.src=u.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(t.memoizedState===null){var o=t.alternate;if(o!==null){var h=o.memoizedState;if(h!==null){var g=h.dehydrated;g!==null&&$r(g)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(F(163))}qe||t.flags&512&&ao(t)}catch(v){Te(t,t.return,v)}}if(t===e){ee=null;break}if(n=t.sibling,n!==null){n.return=t.return,ee=n;break}ee=t.return}}function nd(e){for(;ee!==null;){var t=ee;if(t===e){ee=null;break}var n=t.sibling;if(n!==null){n.return=t.return,ee=n;break}ee=t.return}}function sd(e){for(;ee!==null;){var t=ee;try{switch(t.tag){case 0:case 11:case 15:var n=t.return;try{fa(4,t)}catch(u){Te(t,n,u)}break;case 1:var s=t.stateNode;if(typeof s.componentDidMount=="function"){var r=t.return;try{s.componentDidMount()}catch(u){Te(t,r,u)}}var i=t.return;try{ao(t)}catch(u){Te(t,i,u)}break;case 5:var a=t.return;try{ao(t)}catch(u){Te(t,a,u)}}}catch(u){Te(t,t.return,u)}if(t===e){ee=null;break}var l=t.sibling;if(l!==null){l.return=t.return,ee=l;break}ee=t.return}}var Ny=Math.ceil,ea=sn.ReactCurrentDispatcher,Wo=sn.ReactCurrentOwner,$t=sn.ReactCurrentBatchConfig,ue=0,Pe=null,xe=null,Ue=0,ot=0,hs=Tn(0),Ie=0,xr=null,Vn=0,ma=0,jo=0,pr=null,et=null,Yo=0,xs=1/0,jt=null,ta=!1,co=null,Nn=null,_i=!1,yn=null,na=0,fr=0,uo=null,Ri=-1,Ii=0;function Qe(){return(ue&6)!==0?Ae():Ri!==-1?Ri:Ri=Ae()}function kn(e){return(e.mode&1)===0?1:(ue&2)!==0&&Ue!==0?Ue&-Ue:iy.transition!==null?(Ii===0&&(Ii=Dd()),Ii):(e=pe,e!==0||(e=window.event,e=e===void 0?16:Ud(e.type)),e)}function Rt(e,t,n,s){if(50<fr)throw fr=0,uo=null,Error(F(185));Dr(e,n,s),((ue&2)===0||e!==Pe)&&(e===Pe&&((ue&2)===0&&(ma|=n),Ie===4&&mn(e,Ue)),rt(e,s),n===1&&ue===0&&(t.mode&1)===0&&(xs=Ae()+500,ua&&An()))}function rt(e,t){var n=e.callbackNode;lv(e,t);var s=Bi(e,e===Pe?Ue:0);if(s===0)n!==null&&du(n),e.callbackNode=null,e.callbackPriority=0;else if(t=s&-s,e.callbackPriority!==t){if(n!=null&&du(n),t===1)e.tag===0?ry(rd.bind(null,e)):sp(rd.bind(null,e)),ey(function(){(ue&6)===0&&An()}),n=null;else{switch(Rd(s)){case 1:n=bo;break;case 4:n=Ad;break;case 16:n=Ui;break;case 536870912:n=xd;break;default:n=Ui}n=tf(n,jp.bind(null,e))}e.callbackPriority=t,e.callbackNode=n}}function jp(e,t){if(Ri=-1,Ii=0,(ue&6)!==0)throw Error(F(327));var n=e.callbackNode;if(ks()&&e.callbackNode!==n)return null;var s=Bi(e,e===Pe?Ue:0);if(s===0)return null;if((s&30)!==0||(s&e.expiredLanes)!==0||t)t=sa(e,s);else{t=s;var r=ue;ue|=2;var i=Qp();(Pe!==e||Ue!==t)&&(jt=null,xs=Ae()+500,zn(e,t));do try{Sy();break}catch(l){Yp(e,l)}while(!0);Lo(),ea.current=i,ue=r,xe!==null?t=0:(Pe=null,Ue=0,t=Ie)}if(t!==0){if(t===2&&(r=Ol(e),r!==0&&(s=r,t=po(e,r))),t===1)throw n=xr,zn(e,0),mn(e,s),rt(e,Ae()),n;if(t===6)mn(e,s);else{if(r=e.current.alternate,(s&30)===0&&!ky(r)&&(t=sa(e,s),t===2&&(i=Ol(e),i!==0&&(s=i,t=po(e,i))),t===1))throw n=xr,zn(e,0),mn(e,s),rt(e,Ae()),n;switch(e.finishedWork=r,e.finishedLanes=s,t){case 0:case 1:throw Error(F(345));case 2:On(e,et,jt);break;case 3:if(mn(e,s),(s&130023424)===s&&(t=Yo+500-Ae(),10<t)){if(Bi(e,0)!==0)break;if(r=e.suspendedLanes,(r&s)!==s){Qe(),e.pingedLanes|=e.suspendedLanes&r;break}e.timeoutHandle=Gl(On.bind(null,e,et,jt),t);break}On(e,et,jt);break;case 4:if(mn(e,s),(s&4194240)===s)break;for(t=e.eventTimes,r=-1;0<s;){var a=31-Dt(s);i=1<<a,a=t[a],a>r&&(r=a),s&=~i}if(s=r,s=Ae()-s,s=(120>s?120:480>s?480:1080>s?1080:1920>s?1920:3e3>s?3e3:4320>s?4320:1960*Ny(s/1960))-s,10<s){e.timeoutHandle=Gl(On.bind(null,e,et,jt),s);break}On(e,et,jt);break;case 5:On(e,et,jt);break;default:throw Error(F(329))}}}return rt(e,Ae()),e.callbackNode===n?jp.bind(null,e):null}function po(e,t){var n=pr;return e.current.memoizedState.isDehydrated&&(zn(e,t).flags|=256),e=sa(e,t),e!==2&&(t=et,et=n,t!==null&&fo(t)),e}function fo(e){et===null?et=e:et.push.apply(et,e)}function ky(e){for(var t=e;;){if(t.flags&16384){var n=t.updateQueue;if(n!==null&&(n=n.stores,n!==null))for(var s=0;s<n.length;s++){var r=n[s],i=r.getSnapshot;r=r.value;try{if(!It(i(),r))return!1}catch{return!1}}}if(n=t.child,t.subtreeFlags&16384&&n!==null)n.return=t,t=n;else{if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function mn(e,t){for(t&=~jo,t&=~ma,e.suspendedLanes|=t,e.pingedLanes&=~t,e=e.expirationTimes;0<t;){var n=31-Dt(t),s=1<<n;e[n]=-1,t&=~s}}function rd(e){if((ue&6)!==0)throw Error(F(327));ks();var t=Bi(e,0);if((t&1)===0)return rt(e,Ae()),null;var n=sa(e,t);if(e.tag!==0&&n===2){var s=Ol(e);s!==0&&(t=s,n=po(e,s))}if(n===1)throw n=xr,zn(e,0),mn(e,t),rt(e,Ae()),n;if(n===6)throw Error(F(345));return e.finishedWork=e.current.alternate,e.finishedLanes=t,On(e,et,jt),rt(e,Ae()),null}function Qo(e,t){var n=ue;ue|=1;try{return e(t)}finally{ue=n,ue===0&&(xs=Ae()+500,ua&&An())}}function Wn(e){yn!==null&&yn.tag===0&&(ue&6)===0&&ks();var t=ue;ue|=1;var n=$t.transition,s=pe;try{if($t.transition=null,pe=1,e)return e()}finally{pe=s,$t.transition=n,ue=t,(ue&6)===0&&An()}}function Xo(){ot=hs.current,ge(hs)}function zn(e,t){e.finishedWork=null,e.finishedLanes=0;var n=e.timeoutHandle;if(n!==-1&&(e.timeoutHandle=-1,Zv(n)),xe!==null)for(n=xe.return;n!==null;){var s=n;switch(Do(s),s.tag){case 1:s=s.type.childContextTypes,s!=null&&qi();break;case 3:Ts(),ge(nt),ge(Ge),Ko();break;case 5:Bo(s);break;case 4:Ts();break;case 13:ge(Se);break;case 19:ge(Se);break;case 10:Po(s.type._context);break;case 22:case 23:Xo()}n=n.return}if(Pe=e,xe=e=_n(e.current,null),Ue=ot=t,Ie=0,xr=null,jo=ma=Vn=0,et=pr=null,Bn!==null){for(t=0;t<Bn.length;t++)if(n=Bn[t],s=n.interleaved,s!==null){n.interleaved=null;var r=s.next,i=n.pending;if(i!==null){var a=i.next;i.next=r,s.next=a}n.pending=s}Bn=null}return e}function Yp(e,t){do{var n=xe;try{if(Lo(),Ai.current=Zi,Ji){for(var s=Ee.memoizedState;s!==null;){var r=s.queue;r!==null&&(r.pending=null),s=s.next}Ji=!1}if(Gn=0,Le=Re=Ee=null,ur=!1,Cr=0,Wo.current=null,n===null||n.return===null){Ie=1,xr=t,xe=null;break}e:{var i=e,a=n.return,l=n,u=t;if(t=Ue,l.flags|=32768,u!==null&&typeof u=="object"&&typeof u.then=="function"){var o=u,h=l,g=h.tag;if((h.mode&1)===0&&(g===0||g===11||g===15)){var v=h.alternate;v?(h.updateQueue=v.updateQueue,h.memoizedState=v.memoizedState,h.lanes=v.lanes):(h.updateQueue=null,h.memoizedState=null)}var w=Gu(a);if(w!==null){w.flags&=-257,Vu(w,a,l,i,t),w.mode&1&&qu(i,o,t),t=w,u=o;var S=t.updateQueue;if(S===null){var b=new Set;b.add(u),t.updateQueue=b}else S.add(u);break e}else{if((t&1)===0){qu(i,o,t),Jo();break e}u=Error(F(426))}}else if(Ne&&l.mode&1){var C=Gu(a);if(C!==null){(C.flags&65536)===0&&(C.flags|=256),Vu(C,a,l,i,t),Ro(As(u,l));break e}}i=u=As(u,l),Ie!==4&&(Ie=2),pr===null?pr=[i]:pr.push(i),i=a;do{switch(i.tag){case 3:i.flags|=65536,t&=-t,i.lanes|=t;var y=Rp(i,u,t);Uu(i,y);break e;case 1:l=u;var m=i.type,p=i.stateNode;if((i.flags&128)===0&&(typeof m.getDerivedStateFromError=="function"||p!==null&&typeof p.componentDidCatch=="function"&&(Nn===null||!Nn.has(p)))){i.flags|=65536,t&=-t,i.lanes|=t;var _=Ip(i,l,t);Uu(i,_);break e}}i=i.return}while(i!==null)}Jp(n)}catch(k){t=k,xe===n&&n!==null&&(xe=n=n.return);continue}break}while(!0)}function Qp(){var e=ea.current;return ea.current=Zi,e===null?Zi:e}function Jo(){(Ie===0||Ie===3||Ie===2)&&(Ie=4),Pe===null||(Vn&268435455)===0&&(ma&268435455)===0||mn(Pe,Ue)}function sa(e,t){var n=ue;ue|=2;var s=Qp();(Pe!==e||Ue!==t)&&(jt=null,zn(e,t));do try{_y();break}catch(r){Yp(e,r)}while(!0);if(Lo(),ue=n,ea.current=s,xe!==null)throw Error(F(261));return Pe=null,Ue=0,Ie}function _y(){for(;xe!==null;)Xp(xe)}function Sy(){for(;xe!==null&&!Jm();)Xp(xe)}function Xp(e){var t=ef(e.alternate,e,ot);e.memoizedProps=e.pendingProps,t===null?Jp(e):xe=t,Wo.current=null}function Jp(e){var t=e;do{var n=t.alternate;if(e=t.return,(t.flags&32768)===0){if(n=hy(n,t,ot),n!==null){xe=n;return}}else{if(n=gy(n,t),n!==null){n.flags&=32767,xe=n;return}if(e!==null)e.flags|=32768,e.subtreeFlags=0,e.deletions=null;else{Ie=6,xe=null;return}}if(t=t.sibling,t!==null){xe=t;return}xe=t=e}while(t!==null);Ie===0&&(Ie=5)}function On(e,t,n){var s=pe,r=$t.transition;try{$t.transition=null,pe=1,Ey(e,t,n,s)}finally{$t.transition=r,pe=s}return null}function Ey(e,t,n,s){do ks();while(yn!==null);if((ue&6)!==0)throw Error(F(327));n=e.finishedWork;var r=e.finishedLanes;if(n===null)return null;if(e.finishedWork=null,e.finishedLanes=0,n===e.current)throw Error(F(177));e.callbackNode=null,e.callbackPriority=0;var i=n.lanes|n.childLanes;if(ov(e,i),e===Pe&&(xe=Pe=null,Ue=0),(n.subtreeFlags&2064)===0&&(n.flags&2064)===0||_i||(_i=!0,tf(Ui,function(){return ks(),null})),i=(n.flags&15990)!==0,(n.subtreeFlags&15990)!==0||i){i=$t.transition,$t.transition=null;var a=pe;pe=1;var l=ue;ue|=4,Wo.current=null,wy(e,n),Vp(n,e),jv(Fl),Ki=!!Hl,Fl=Hl=null,e.current=n,by(n,e,r),Zm(),ue=l,pe=a,$t.transition=i}else e.current=n;if(_i&&(_i=!1,yn=e,na=r),i=e.pendingLanes,i===0&&(Nn=null),nv(n.stateNode,s),rt(e,Ae()),t!==null)for(s=e.onRecoverableError,n=0;n<t.length;n++)r=t[n],s(r.value,{componentStack:r.stack,digest:r.digest});if(ta)throw ta=!1,e=co,co=null,e;return(na&1)!==0&&e.tag!==0&&ks(),i=e.pendingLanes,(i&1)!==0?e===uo?fr++:(fr=0,uo=e):fr=0,An(),null}function ks(){if(yn!==null){var e=Rd(na),t=$t.transition,n=pe;try{if($t.transition=null,pe=16>e?16:e,yn===null)var s=!1;else{if(e=yn,yn=null,na=0,(ue&6)!==0)throw Error(F(331));var r=ue;for(ue|=4,ee=e.current;ee!==null;){var i=ee,a=i.child;if((ee.flags&16)!==0){var l=i.deletions;if(l!==null){for(var u=0;u<l.length;u++){var o=l[u];for(ee=o;ee!==null;){var h=ee;switch(h.tag){case 0:case 11:case 15:dr(8,h,i)}var g=h.child;if(g!==null)g.return=h,ee=g;else for(;ee!==null;){h=ee;var v=h.sibling,w=h.return;if(Fp(h),h===o){ee=null;break}if(v!==null){v.return=w,ee=v;break}ee=w}}}var S=i.alternate;if(S!==null){var b=S.child;if(b!==null){S.child=null;do{var C=b.sibling;b.sibling=null,b=C}while(b!==null)}}ee=i}}if((i.subtreeFlags&2064)!==0&&a!==null)a.return=i,ee=a;else e:for(;ee!==null;){if(i=ee,(i.flags&2048)!==0)switch(i.tag){case 0:case 11:case 15:dr(9,i,i.return)}var y=i.sibling;if(y!==null){y.return=i.return,ee=y;break e}ee=i.return}}var m=e.current;for(ee=m;ee!==null;){a=ee;var p=a.child;if((a.subtreeFlags&2064)!==0&&p!==null)p.return=a,ee=p;else e:for(a=m;ee!==null;){if(l=ee,(l.flags&2048)!==0)try{switch(l.tag){case 0:case 11:case 15:fa(9,l)}}catch(k){Te(l,l.return,k)}if(l===a){ee=null;break e}var _=l.sibling;if(_!==null){_.return=l.return,ee=_;break e}ee=l.return}}if(ue=r,An(),Ht&&typeof Ht.onPostCommitFiberRoot=="function")try{Ht.onPostCommitFiberRoot(ia,e)}catch{}s=!0}return s}finally{pe=n,$t.transition=t}}return!1}function id(e,t,n){t=As(n,t),t=Rp(e,t,1),e=bn(e,t,1),t=Qe(),e!==null&&(Dr(e,1,t),rt(e,t))}function Te(e,t,n){if(e.tag===3)id(e,e,n);else for(;t!==null;){if(t.tag===3){id(t,e,n);break}else if(t.tag===1){var s=t.stateNode;if(typeof t.type.getDerivedStateFromError=="function"||typeof s.componentDidCatch=="function"&&(Nn===null||!Nn.has(s))){e=As(n,e),e=Ip(t,e,1),t=bn(t,e,1),e=Qe(),t!==null&&(Dr(t,1,e),rt(t,e));break}}t=t.return}}function Cy(e,t,n){var s=e.pingCache;s!==null&&s.delete(t),t=Qe(),e.pingedLanes|=e.suspendedLanes&n,Pe===e&&(Ue&n)===n&&(Ie===4||Ie===3&&(Ue&130023424)===Ue&&500>Ae()-Yo?zn(e,0):jo|=n),rt(e,t)}function Zp(e,t){t===0&&((e.mode&1)===0?t=1:(t=ui,ui<<=1,(ui&130023424)===0&&(ui=4194304)));var n=Qe();e=tn(e,t),e!==null&&(Dr(e,t,n),rt(e,n))}function Ty(e){var t=e.memoizedState,n=0;t!==null&&(n=t.retryLane),Zp(e,n)}function Ay(e,t){var n=0;switch(e.tag){case 13:var s=e.stateNode,r=e.memoizedState;r!==null&&(n=r.retryLane);break;case 19:s=e.stateNode;break;default:throw Error(F(314))}s!==null&&s.delete(t),Zp(e,n)}var ef;ef=function(e,t,n){if(e!==null)if(e.memoizedProps!==t.pendingProps||nt.current)tt=!0;else{if((e.lanes&n)===0&&(t.flags&128)===0)return tt=!1,yy(e,t,n);tt=(e.flags&131072)!==0}else tt=!1,Ne&&(t.flags&1048576)!==0&&rp(t,Wi,t.index);switch(t.lanes=0,t.tag){case 2:var s=t.type;Di(e,t),e=t.pendingProps;var r=Ss(t,Ge.current);Ns(t,n),r=Ho(null,t,s,e,r,n);var i=Fo();return t.flags|=1,typeof r=="object"&&r!==null&&typeof r.render=="function"&&r.$$typeof===void 0?(t.tag=1,t.memoizedState=null,t.updateQueue=null,st(s)?(i=!0,Gi(t)):i=!1,t.memoizedState=r.state!==null&&r.state!==void 0?r.state:null,Oo(t),r.updater=pa,t.stateNode=r,r._reactInternals=t,Jl(t,s,e,n),t=to(null,t,s,!0,i,n)):(t.tag=0,Ne&&i&&xo(t),Ye(null,t,r,n),t=t.child),t;case 16:s=t.elementType;e:{switch(Di(e,t),e=t.pendingProps,r=s._init,s=r(s._payload),t.type=s,r=t.tag=Dy(s),e=Tt(s,e),r){case 0:t=eo(null,t,s,e,n);break e;case 1:t=Yu(null,t,s,e,n);break e;case 11:t=Wu(null,t,s,e,n);break e;case 14:t=ju(null,t,s,Tt(s.type,e),n);break e}throw Error(F(306,s,""))}return t;case 0:return s=t.type,r=t.pendingProps,r=t.elementType===s?r:Tt(s,r),eo(e,t,s,r,n);case 1:return s=t.type,r=t.pendingProps,r=t.elementType===s?r:Tt(s,r),Yu(e,t,s,r,n);case 3:e:{if(Op(t),e===null)throw Error(F(387));s=t.pendingProps,i=t.memoizedState,r=i.element,up(e,t),Qi(t,s,null,n);var a=t.memoizedState;if(s=a.element,i.isDehydrated)if(i={element:s,isDehydrated:!1,cache:a.cache,pendingSuspenseBoundaries:a.pendingSuspenseBoundaries,transitions:a.transitions},t.updateQueue.baseState=i,t.memoizedState=i,t.flags&256){r=As(Error(F(423)),t),t=Qu(e,t,s,n,r);break e}else if(s!==r){r=As(Error(F(424)),t),t=Qu(e,t,s,n,r);break e}else for(ct=wn(t.stateNode.containerInfo.firstChild),ut=t,Ne=!0,xt=null,n=op(t,null,s,n),t.child=n;n;)n.flags=n.flags&-3|4096,n=n.sibling;else{if(Es(),s===r){t=nn(e,t,n);break e}Ye(e,t,s,n)}t=t.child}return t;case 5:return dp(t),e===null&&Yl(t),s=t.type,r=t.pendingProps,i=e!==null?e.memoizedProps:null,a=r.children,ql(s,r)?a=null:i!==null&&ql(s,i)&&(t.flags|=32),Mp(e,t),Ye(e,t,a,n),t.child;case 6:return e===null&&Yl(t),null;case 13:return Up(e,t,n);case 4:return Uo(t,t.stateNode.containerInfo),s=t.pendingProps,e===null?t.child=Cs(t,null,s,n):Ye(e,t,s,n),t.child;case 11:return s=t.type,r=t.pendingProps,r=t.elementType===s?r:Tt(s,r),Wu(e,t,s,r,n);case 7:return Ye(e,t,t.pendingProps,n),t.child;case 8:return Ye(e,t,t.pendingProps.children,n),t.child;case 12:return Ye(e,t,t.pendingProps.children,n),t.child;case 10:e:{if(s=t.type._context,r=t.pendingProps,i=t.memoizedProps,a=r.value,ye(ji,s._currentValue),s._currentValue=a,i!==null)if(It(i.value,a)){if(i.children===r.children&&!nt.current){t=nn(e,t,n);break e}}else for(i=t.child,i!==null&&(i.return=t);i!==null;){var l=i.dependencies;if(l!==null){a=i.child;for(var u=l.firstContext;u!==null;){if(u.context===s){if(i.tag===1){u=Jt(-1,n&-n),u.tag=2;var o=i.updateQueue;if(o!==null){o=o.shared;var h=o.pending;h===null?u.next=u:(u.next=h.next,h.next=u),o.pending=u}}i.lanes|=n,u=i.alternate,u!==null&&(u.lanes|=n),Ql(i.return,n,t),l.lanes|=n;break}u=u.next}}else if(i.tag===10)a=i.type===t.type?null:i.child;else if(i.tag===18){if(a=i.return,a===null)throw Error(F(341));a.lanes|=n,l=a.alternate,l!==null&&(l.lanes|=n),Ql(a,n,t),a=i.sibling}else a=i.child;if(a!==null)a.return=i;else for(a=i;a!==null;){if(a===t){a=null;break}if(i=a.sibling,i!==null){i.return=a.return,a=i;break}a=a.return}i=a}Ye(e,t,r.children,n),t=t.child}return t;case 9:return r=t.type,s=t.pendingProps.children,Ns(t,n),r=wt(r),s=s(r),t.flags|=1,Ye(e,t,s,n),t.child;case 14:return s=t.type,r=Tt(s,t.pendingProps),r=Tt(s.type,r),ju(e,t,s,r,n);case 15:return Lp(e,t,t.type,t.pendingProps,n);case 17:return s=t.type,r=t.pendingProps,r=t.elementType===s?r:Tt(s,r),Di(e,t),t.tag=1,st(s)?(e=!0,Gi(t)):e=!1,Ns(t,n),Dp(t,s,r),Jl(t,s,r,n),to(null,t,s,!0,e,n);case 19:return Bp(e,t,n);case 22:return Pp(e,t,n)}throw Error(F(156,t.tag))};function tf(e,t){return Td(e,t)}function xy(e,t,n,s){this.tag=e,this.key=n,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=s,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function gt(e,t,n,s){return new xy(e,t,n,s)}function Zo(e){return e=e.prototype,!(!e||!e.isReactComponent)}function Dy(e){if(typeof e=="function")return Zo(e)?1:0;if(e!=null){if(e=e.$$typeof,e===go)return 11;if(e===$o)return 14}return 2}function _n(e,t){var n=e.alternate;return n===null?(n=gt(e.tag,t,e.key,e.mode),n.elementType=e.elementType,n.type=e.type,n.stateNode=e.stateNode,n.alternate=e,e.alternate=n):(n.pendingProps=t,n.type=e.type,n.flags=0,n.subtreeFlags=0,n.deletions=null),n.flags=e.flags&14680064,n.childLanes=e.childLanes,n.lanes=e.lanes,n.child=e.child,n.memoizedProps=e.memoizedProps,n.memoizedState=e.memoizedState,n.updateQueue=e.updateQueue,t=e.dependencies,n.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},n.sibling=e.sibling,n.index=e.index,n.ref=e.ref,n}function Li(e,t,n,s,r,i){var a=2;if(s=e,typeof e=="function")Zo(e)&&(a=1);else if(typeof e=="string")a=5;else e:switch(e){case ls:return Hn(n.children,r,i,t);case ho:a=8,r|=8;break;case Nl:return e=gt(12,n,t,r|2),e.elementType=Nl,e.lanes=i,e;case kl:return e=gt(13,n,t,r),e.elementType=kl,e.lanes=i,e;case _l:return e=gt(19,n,t,r),e.elementType=_l,e.lanes=i,e;case dd:return va(n,r,i,t);default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case cd:a=10;break e;case ud:a=9;break e;case go:a=11;break e;case $o:a=14;break e;case dn:a=16,s=null;break e}throw Error(F(130,e==null?e:typeof e,""))}return t=gt(a,n,t,r),t.elementType=e,t.type=s,t.lanes=i,t}function Hn(e,t,n,s){return e=gt(7,e,s,t),e.lanes=n,e}function va(e,t,n,s){return e=gt(22,e,s,t),e.elementType=dd,e.lanes=n,e.stateNode={isHidden:!1},e}function $l(e,t,n){return e=gt(6,e,null,t),e.lanes=n,e}function wl(e,t,n){return t=gt(4,e.children!==null?e.children:[],e.key,t),t.lanes=n,t.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},t}function Ry(e,t,n,s,r){this.tag=t,this.containerInfo=e,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=sl(0),this.expirationTimes=sl(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=sl(0),this.identifierPrefix=s,this.onRecoverableError=r,this.mutableSourceEagerHydrationData=null}function ec(e,t,n,s,r,i,a,l,u){return e=new Ry(e,t,n,l,u),t===1?(t=1,i===!0&&(t|=8)):t=0,i=gt(3,null,null,t),e.current=i,i.stateNode=e,i.memoizedState={element:s,isDehydrated:n,cache:null,transitions:null,pendingSuspenseBoundaries:null},Oo(i),e}function Iy(e,t,n){var s=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:as,key:s==null?null:""+s,children:e,containerInfo:t,implementation:n}}function nf(e){if(!e)return En;e=e._reactInternals;e:{if(Yn(e)!==e||e.tag!==1)throw Error(F(170));var t=e;do{switch(t.tag){case 3:t=t.stateNode.context;break e;case 1:if(st(t.type)){t=t.stateNode.__reactInternalMemoizedMergedChildContext;break e}}t=t.return}while(t!==null);throw Error(F(171))}if(e.tag===1){var n=e.type;if(st(n))return np(e,n,t)}return t}function sf(e,t,n,s,r,i,a,l,u){return e=ec(n,s,!0,e,r,i,a,l,u),e.context=nf(null),n=e.current,s=Qe(),r=kn(n),i=Jt(s,r),i.callback=t??null,bn(n,i,r),e.current.lanes=r,Dr(e,r,s),rt(e,s),e}function ya(e,t,n,s){var r=t.current,i=Qe(),a=kn(r);return n=nf(n),t.context===null?t.context=n:t.pendingContext=n,t=Jt(i,a),t.payload={element:e},s=s===void 0?null:s,s!==null&&(t.callback=s),e=bn(r,t,a),e!==null&&(Rt(e,r,a,i),Ti(e,r,a)),a}function ra(e){return e=e.current,e.child?(e.child.tag===5,e.child.stateNode):null}function ad(e,t){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var n=e.retryLane;e.retryLane=n!==0&&n<t?n:t}}function tc(e,t){ad(e,t),(e=e.alternate)&&ad(e,t)}function Ly(){return null}var rf=typeof reportError=="function"?reportError:function(e){console.error(e)};function nc(e){this._internalRoot=e}ha.prototype.render=nc.prototype.render=function(e){var t=this._internalRoot;if(t===null)throw Error(F(409));ya(e,t,null,null)};ha.prototype.unmount=nc.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var t=e.containerInfo;Wn(function(){ya(null,e,null,null)}),t[en]=null}};function ha(e){this._internalRoot=e}ha.prototype.unstable_scheduleHydration=function(e){if(e){var t=Pd();e={blockedOn:null,target:e,priority:t};for(var n=0;n<fn.length&&t!==0&&t<fn[n].priority;n++);fn.splice(n,0,e),n===0&&Od(e)}};function sc(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function ga(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11&&(e.nodeType!==8||e.nodeValue!==" react-mount-point-unstable "))}function ld(){}function Py(e,t,n,s,r){if(r){if(typeof s=="function"){var i=s;s=function(){var o=ra(a);i.call(o)}}var a=sf(t,s,e,0,null,!1,!1,"",ld);return e._reactRootContainer=a,e[en]=a.current,Nr(e.nodeType===8?e.parentNode:e),Wn(),a}for(;r=e.lastChild;)e.removeChild(r);if(typeof s=="function"){var l=s;s=function(){var o=ra(u);l.call(o)}}var u=ec(e,0,!1,null,null,!1,!1,"",ld);return e._reactRootContainer=u,e[en]=u.current,Nr(e.nodeType===8?e.parentNode:e),Wn(function(){ya(t,u,n,s)}),u}function $a(e,t,n,s,r){var i=n._reactRootContainer;if(i){var a=i;if(typeof r=="function"){var l=r;r=function(){var u=ra(a);l.call(u)}}ya(t,a,e,r)}else a=Py(n,t,e,r,s);return ra(a)}Id=function(e){switch(e.tag){case 3:var t=e.stateNode;if(t.current.memoizedState.isDehydrated){var n=sr(t.pendingLanes);n!==0&&(No(t,n|1),rt(t,Ae()),(ue&6)===0&&(xs=Ae()+500,An()))}break;case 13:Wn(function(){var s=tn(e,1);if(s!==null){var r=Qe();Rt(s,e,1,r)}}),tc(e,1)}};ko=function(e){if(e.tag===13){var t=tn(e,134217728);if(t!==null){var n=Qe();Rt(t,e,134217728,n)}tc(e,134217728)}};Ld=function(e){if(e.tag===13){var t=kn(e),n=tn(e,t);if(n!==null){var s=Qe();Rt(n,e,t,s)}tc(e,t)}};Pd=function(){return pe};Md=function(e,t){var n=pe;try{return pe=e,t()}finally{pe=n}};Ll=function(e,t,n){switch(t){case"input":if(Cl(e,n),t=n.name,n.type==="radio"&&t!=null){for(n=e;n.parentNode;)n=n.parentNode;for(n=n.querySelectorAll("input[name="+JSON.stringify(""+t)+'][type="radio"]'),t=0;t<n.length;t++){var s=n[t];if(s!==e&&s.form===e.form){var r=ca(s);if(!r)throw Error(F(90));fd(s),Cl(s,r)}}}break;case"textarea":vd(e,n);break;case"select":t=n.value,t!=null&&gs(e,!!n.multiple,t,!1)}};Nd=Qo;kd=Wn;var My={usingClientEntryPoint:!1,Events:[Ir,ds,ca,wd,bd,Qo]},Zs={findFiberByHostInstance:Un,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},Oy={bundleType:Zs.bundleType,version:Zs.version,rendererPackageName:Zs.rendererPackageName,rendererConfig:Zs.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:sn.ReactCurrentDispatcher,findHostInstanceByFiber:function(e){return e=Ed(e),e===null?null:e.stateNode},findFiberByHostInstance:Zs.findFiberByHostInstance||Ly,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"&&(er=__REACT_DEVTOOLS_GLOBAL_HOOK__,!er.isDisabled&&er.supportsFiber))try{ia=er.inject(Oy),Ht=er}catch{}var er;ft.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=My;ft.createPortal=function(e,t){var n=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!sc(t))throw Error(F(200));return Iy(e,t,null,n)};ft.createRoot=function(e,t){if(!sc(e))throw Error(F(299));var n=!1,s="",r=rf;return t!=null&&(t.unstable_strictMode===!0&&(n=!0),t.identifierPrefix!==void 0&&(s=t.identifierPrefix),t.onRecoverableError!==void 0&&(r=t.onRecoverableError)),t=ec(e,1,!1,null,null,n,!1,s,r),e[en]=t.current,Nr(e.nodeType===8?e.parentNode:e),new nc(t)};ft.findDOMNode=function(e){if(e==null)return null;if(e.nodeType===1)return e;var t=e._reactInternals;if(t===void 0)throw typeof e.render=="function"?Error(F(188)):(e=Object.keys(e).join(","),Error(F(268,e)));return e=Ed(t),e=e===null?null:e.stateNode,e};ft.flushSync=function(e){return Wn(e)};ft.hydrate=function(e,t,n){if(!ga(t))throw Error(F(200));return $a(null,e,t,!0,n)};ft.hydrateRoot=function(e,t,n){if(!sc(e))throw Error(F(405));var s=n!=null&&n.hydratedSources||null,r=!1,i="",a=rf;if(n!=null&&(n.unstable_strictMode===!0&&(r=!0),n.identifierPrefix!==void 0&&(i=n.identifierPrefix),n.onRecoverableError!==void 0&&(a=n.onRecoverableError)),t=sf(t,null,e,1,n??null,r,!1,i,a),e[en]=t.current,Nr(e),s)for(e=0;e<s.length;e++)n=s[e],r=n._getVersion,r=r(n._source),t.mutableSourceEagerHydrationData==null?t.mutableSourceEagerHydrationData=[n,r]:t.mutableSourceEagerHydrationData.push(n,r);return new ha(t)};ft.render=function(e,t,n){if(!ga(t))throw Error(F(200));return $a(null,e,t,!1,n)};ft.unmountComponentAtNode=function(e){if(!ga(e))throw Error(F(40));return e._reactRootContainer?(Wn(function(){$a(null,null,e,!1,function(){e._reactRootContainer=null,e[en]=null})}),!0):!1};ft.unstable_batchedUpdates=Qo;ft.unstable_renderSubtreeIntoContainer=function(e,t,n,s){if(!ga(n))throw Error(F(200));if(e==null||e._reactInternals===void 0)throw Error(F(38));return $a(e,t,n,!1,s)};ft.version="18.3.1-next-f1338f8080-20240426"});var cf=on((Eg,of)=>{"use strict";function lf(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(lf)}catch(e){console.error(e)}}lf(),of.exports=af()});var df=on(rc=>{"use strict";var uf=cf();rc.createRoot=uf.createRoot,rc.hydrateRoot=uf.hydrateRoot;var Cg});var ac=on((Lg,gf)=>{"use strict";var ic="ybndrfg8ejkmcpqxot1uwisza345h769",Uy=/^[0-9a-f]{64}$/i,By=/^d-([ybndrfg8ejkmcpqxot1uwisza345h769]{52})\.localhost$/i,Ky=new Map([...ic].map((e,t)=>[e,t]));function yf(e){if(typeof e!="string"||!Uy.test(e))throw new Error("Invalid drive key format");let t="",n=0,s=0;for(let r=0;r<e.length;r+=2){for(s=s<<8|parseInt(e.slice(r,r+2),16),n+=8;n>=5;)n-=5,t+=ic[s>>>n&31];s&=(1<<n)-1}return n>0&&(t+=ic[s<<5-n&31]),`d-${t}.localhost`}function hf(e){if(typeof e!="string")return null;let t=By.exec(e);if(!t)return null;let n="",s=0,r=0;for(let i of t[1].toLowerCase())r=r<<5|Ky.get(i),s+=5,s>=8&&(s-=8,n+=(r>>>s&255).toString(16).padStart(2,"0"),r&=(1<<s)-1);return n.length!==64||r!==0?null:yf(n)===e.toLowerCase()?n:null}function zy(e){return hf(e)!==null}gf.exports={driveHostnameForKey:yf,driveKeyFromHostname:hf,isDriveOriginHostname:zy}});var cm=Hs(df(),1);var vf=Hs(ei());var ff=function(e,t,n,s){var r;t[0]=0;for(var i=1;i<t.length;i++){var a=t[i++],l=t[i]?(t[0]|=a?1:2,n[t[i++]]):t[++i];a===3?s[0]=l:a===4?s[1]=Object.assign(s[1]||{},l):a===5?(s[1]=s[1]||{})[t[++i]]=l:a===6?s[1][t[++i]]+=l+"":a?(r=e.apply(l,ff(e,l,n,["",null])),s.push(r),l[0]?t[0]|=2:(t[i-2]=0,t[i]=r)):s.push(l)}return s},pf=new Map;function mf(e){var t=pf.get(this);return t||(t=new Map,pf.set(this,t)),(t=ff(this,t.get(e)||(t.set(e,t=(function(n){for(var s,r,i=1,a="",l="",u=[0],o=function(v){i===1&&(v||(a=a.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?u.push(0,v,a):i===3&&(v||a)?(u.push(3,v,a),i=2):i===2&&a==="..."&&v?u.push(4,v,0):i===2&&a&&!v?u.push(5,0,!0,a):i>=5&&((a||!v&&i===5)&&(u.push(i,0,a,r),i=6),v&&(u.push(i,v,0,r),i=6)),a=""},h=0;h<n.length;h++){h&&(i===1&&o(),o(h));for(var g=0;g<n[h].length;g++)s=n[h][g],i===1?s==="<"?(o(),u=[u],i=3):a+=s:i===4?a==="--"&&s===">"?(i=1,a=""):a=s+a[0]:l?s===l?l="":a+=s:s==='"'||s==="'"?l=s:s===">"?(o(),i=1):i&&(s==="="?(i=5,r=a,a=""):s==="/"&&(i<5||n[h][g+1]===">")?(o(),i===3&&(u=u[0]),i=u,(u=u[0]).push(2,0,i),i=0):s===" "||s==="	"||s===`
`||s==="\r"?(o(),i=2):a+=s),i===3&&a==="!--"&&(i=4,u=u[0])}return o(),u})(e)),t),arguments,[])).length>1?t:t[0]}var c=mf.bind(vf.createElement);var d=Hs(ei(),1);function Pr({size:e=64,animated:t=!1}){return c`
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
  `}function wa(){return c`
    <div className="wordmark">
      <span className="wordmark-bold">Pear</span><span className="wordmark-light">Browser</span>
    </div>
  `}var wf=Hs(ac(),1),{isDriveOriginHostname:bf}=wf.default,ba="ybndrfg8ejkmcpqxot1uwisza345h769",$f=(()=>{let e=new Map;for(let t=0;t<ba.length;t++)e.set(ba[t],t);return e})();function Hy(e){if(!/^[0-9a-f]+$/i.test(e)||e.length%2!==0)return null;let t=new Uint8Array(e.length/2);for(let n=0;n<t.length;n++)t[n]=parseInt(e.slice(n*2,n*2+2),16);return t}function Fy(e){return Array.from(e,t=>t.toString(16).padStart(2,"0")).join("")}function qy(e){let t=e.byteLength*8,n="";for(let s=0;s<t;s+=5){let r=s>>>3,i=s&7;if(i<=3){n+=ba[e[r]>>>3-i&31];continue}let a=i-3,l=e[r]<<a&31,u=(r+1>=e.byteLength?0:e[r+1])>>>8-a;n+=ba[l|u]}return n}function Gy(e){let t=String(e||"").toLowerCase(),n=new Uint8Array(Math.ceil(t.length*5/8)),s=0,r=0,i=()=>{let C=t[r++];if(!$f.has(C))throw new Error("invalid z-base-32");return $f.get(C)},a=t.length&7,l=(t.length-a)/8;for(let C=0;C<l;C++){let y=i(),m=i(),p=i(),_=i(),k=i(),T=i(),$=i(),E=i();n[s++]=y<<3|m>>>2,n[s++]=(m&3)<<6|p<<1|_>>>4,n[s++]=(_&15)<<4|k>>>1,n[s++]=(k&1)<<7|T<<2|$>>>3,n[s++]=($&7)<<5|E}if(a===0)return n.subarray(0,s);let u=i(),o=i();if(n[s++]=u<<3|o>>>2,a<=2)return n.subarray(0,s);let h=i(),g=i();if(n[s++]=(o&3)<<6|h<<1|g>>>4,a<=4)return n.subarray(0,s);let v=i();if(n[s++]=(g&15)<<4|v>>>1,a<=5)return n.subarray(0,s);let w=i(),S=i();if(n[s++]=(v&1)<<7|w<<2|S>>>3,a<=7)return n.subarray(0,s);let b=i();return n[s++]=(S&7)<<5|b,n.subarray(0,s)}function Nf(e){let t=Hy(e);return t?qy(t):null}function Na(e){try{let t=Gy(e);return t.length===32?Fy(t):null}catch{return null}}function ka(e){let t=Number(e)||0;if(t<1024)return`${t} B`;let n=["KB","MB","GB","TB"],s=t/1024,r=n[0];for(let i=1;i<n.length&&s>=1024;i++)s/=1024,r=n[i];return`${s>=10?s.toFixed(1):s.toFixed(2)} ${r}`}function $e(e){return!e||typeof e!="string"?"":e.length<=16?e:e.slice(0,8)+"\u2026"+e.slice(-6)}function lc(e){let t=String(e||"").trim();if(!t)return null;if(/^hyper:\/\//i.test(t)||/^https?:\/\//i.test(t))return t;if(/^(?:pear|file):\/\//i.test(t))return null;if(/^[0-9a-f]{64}$/i.test(t))return`hyper://${t.toLowerCase()}/`;if(/^[13-9a-km-uw-z]{52}$/i.test(t))return`hyper://${t}/`;try{let n=new URL(`http://${t}`);if(bf(n.hostname)&&!t.includes("@"))return n.href}catch{}return/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::\d{1,5})?(?:[/?#].*)?$/i.test(t)?`https://${t.replace(/^\/+/,"")}`:t.includes("/")?t:`hyper://${t}`}function Mr(e){try{let t=new URL(String(e||"").trim());if(t.protocol!=="http:"&&t.protocol!=="https:")return!1;let n=(t.hostname||"").toLowerCase();return n!=="127.0.0.1"&&n!=="localhost"&&n!=="[::1]"&&!(t.protocol==="http:"&&bf(n))}catch{return!1}}function it(e){let t=String(e||"").trim();if(!t)return null;let s=t.replace(/^hyper:\/\//i,"").split("/")[0].trim();return/^[0-9a-f]{64}$/i.test(s)?s.toLowerCase():/^[13-9a-km-uw-z]{52}$/i.test(s)?Na(s):null}function oc(e){let t=String(e||"").trim();return t?/^[0-9a-f]{64}$/i.test(t)?t.toLowerCase():t.length<=300&&/^hyper:\/\/.+/i.test(t)?t:null:null}function kf(e){let t=String(e||"").normalize("NFKC").trim();return!(!/^[\p{L}\p{N}][\p{L}\p{N}_-]{0,127}$/u.test(t)||/^[0-9a-f]{64}$/i.test(t)||/^[13-9a-km-uw-z]{52}$/i.test(t))}function qt(e){let t=String(e||"").trim();if(!t)return null;let n=(t.match(/^([a-z][a-z0-9+.-]*):\/\//i)?.[1]||"hyper").toLowerCase(),s=n==="autobee"?"autobee":n==="hyperbee"?"hyperbee":n==="sheets"?"sheets":n==="hiveindex"?"hiveindex":"drive",r=t.replace(/^(autobee|hyperbee|hiveindex|sheets|hyper):\/\//i,"").replace(/\/+$/,"").trim();return r?{key:r,bee:s==="hyperbee",autobee:s==="autobee",kind:s}:null}function cc(e){let t=String(e||"").trim();if(!t)return"";if(/^(bee|sheets|hiveindex|autobee):(?!\/\/)/i.test(t))return t;let n=qt(t);if(!n)return t;if(n.autobee)return`autobee:${n.key}`;if(n.bee)return`bee:${n.key}`;if(n.kind==="sheets"||n.kind==="hiveindex"){let s=Na(n.key);return`${n.kind}:${s||n.key}`}return n.key}function uc(e){let n=String(e||"").trim().replace(/^sync:\/\//i,"").replace(/\/+$/,"").match(/^([0-9a-f]{64}):([0-9a-f]{64})$/i);return n?{key:n[1].toLowerCase(),encKey:n[2].toLowerCase()}:null}function _f(e,t){let n=String(e||"").trim().toLowerCase(),s=String(t||"").trim().toLowerCase();return!/^[0-9a-f]{64}$/.test(n)||!/^[0-9a-f]{64}$/.test(s)?"":`sync://${n}:${s}`}function Sf(e){let t=String(e||"").trim().replace(/^pearname:\/\//i,"").replace(/\/+$/,"");return/^[^\s/]{1,253}$/.test(t)?t:null}var Cf=Hs(ac(),1),{driveKeyFromHostname:Vy}=Cf.default,Tf=50,Sa=20,Ef=0;function Wy(){return Ef+=1,"tab-"+Ef+"-"+Date.now().toString(36)}function Je(e){return typeof e=="string"?e.trim():""}function rn(e,t="New tab"){return typeof e=="string"&&e.trim()?e:t}function dc(e,t=""){let n=[];if(Array.isArray(e))for(let r of e){let i=Je(r);i&&n[n.length-1]!==i&&n.push(i)}let s=Je(t);return n.length===0&&s&&n.push(s),n.slice(-Tf)}function Or(e,t){if(!Array.isArray(e)||e.length===0)return-1;let n=Number.isInteger(t)?t:e.length-1;return Math.max(0,Math.min(n,e.length-1))}function Ea(e,t,n){let s=Je(n),r=dc(e),i=Or(r,t),a=i>=0?r.slice(0,i+1):[];s&&a[a.length-1]!==s&&a.push(s);let l=Math.max(0,a.length-Tf),u=a.slice(l);return{history:u,histIdx:u.length?u.length-1:-1}}function Is(e){if(!e||typeof e!="object")return null;let t=Je(e.url),n=dc(e.history,t),s=Or(n,e.histIdx);if(t&&(s<0||n[s]!==t)){let a=Ea(n,s,t);n=a.history,s=a.histIdx}let r=s>=0?n[s]:t,i=Je(e.displayUrl)||r||t;return!r&&!i&&n.length===0?null:{url:r||t,displayUrl:i,title:rn(e.title,r||"New tab"),history:n,histIdx:s,pinned:!!e.pinned}}function Af(e,t){return{...Is(e)||{url:"",displayUrl:"",title:rn(e?.title),history:[],histIdx:-1,pinned:!!e?.pinned},active:e?.id===t}}function pc(e){if(!e||typeof e!="object")return null;let t=Is(e)||{url:"",displayUrl:"",title:rn(e.title),history:[],histIdx:-1,pinned:!!e.pinned};return Ca(t.url,t)}function jy(e){return typeof e=="string"?{url:Je(e),title:""}:!e||typeof e!="object"?{url:"",title:""}:{url:Je(e.url),title:rn(e.title,"")}}function xf(e,t=[]){let n=[],s=new Set,r=a=>{if(!a)return;let l=Je(a.url||a.displayUrl);l&&s.has(l)||(l&&s.add(l),n.push(a))};for(let a of t){let{url:l,title:u}=jy(a);(l||u)&&r(Ca(l,u?{title:u}:{}))}let i=Array.isArray(e)?e.map(a=>({saved:a,tab:pc(a)})).filter(a=>a.tab&&(a.tab.url||a.tab.displayUrl)):[];for(let a of i)r(a.tab);if(n.length===0&&i.length>0)for(let a of i)r(a.tab);return{tabs:n,activeId:n[0]?.id||""}}function fc(e){return[...e.filter(t=>t.pinned),...e.filter(t=>!t.pinned)]}function _a(e){let t=Je(e);if(!t)return"";let n=it(t);if(n)return n;try{let s=new URL(t);if(s.protocol!=="http:")return"";let r=s.pathname.match(/^\/(?:hyper|app)\/([0-9a-f]{64})(?:\/|$)/i);if(!r)return"";let i=r[1].toLowerCase(),a=Vy(s.hostname);return a&&a===i?i:""}catch{return""}}function Ur(e){return!e||typeof e!="object"?"":_a(e.url)||_a(e.displayUrl)||_a(e.src)}function Nt(e){if(!e||e.kind!=="hyper"||!/^hyper:\/\//i.test(e.url||""))return"";let t=it(e.url),n=_a(e.src);return!t||!n||t!==n||e.displayUrl&&(!/^hyper:\/\//i.test(e.displayUrl)||it(e.displayUrl)!==t)?"":n}function Df(e,t){let n=typeof t=="string"?t.toLowerCase():"";return!/^[0-9a-f]{64}$/.test(n)||!Array.isArray(e)?!1:e.some(s=>Ur(s)===n)}function Ca(e="",t={}){let n=Array.isArray(t.history)?dc(t.history,e):[],s=Or(n,t.histIdx),r=s>=0?n[s]:"",i=Je(r||e),a=t.kind==="clearnet"||t.kind==="hyper"||t.kind==="loopback"?t.kind:Mr(i)?"clearnet":"hyper";return{id:Wy(),url:i,displayUrl:Je(t.displayUrl)||i,src:null,history:n,histIdx:s,status:"",title:rn(t.title),pinned:!!t.pinned,kind:a,clearnetMode:t.clearnetMode||null}}var mc=Object.freeze({maxUrlBytes:2048,maxTitleBytes:512,maxTextBytes:16384}),Yy=new Set(["done","cancelled","error"]),vc=0;function Aa(){let e=globalThis.crypto;if(e&&typeof e.randomUUID=="function")return`ask-${e.randomUUID()}`;if(e&&typeof e.getRandomValues=="function"){let t=new Uint32Array(3);return e.getRandomValues(t),`ask-${[...t].map(n=>n.toString(36)).join("-")}`}return vc=vc+1>>>0,`ask-${Date.now().toString(36)}-${vc.toString(36)}`}function Ls(e,t,n={}){let s=Qy(n),r=an(t)?t:{},i=an(e)?e:null,a=Ve(r.id),l=Ve(r.url)||Ve(r.displayUrl),u=Ve(r.title)||l||"Untitled page",o=Ta(l,s.maxUrlBytes),h=Ta(u,s.maxTitleBytes),g=i?Ve(i.tabId):"",v=!!(a&&g&&a!==g),w=i&&an(i.context)?i.context:null,S=w?Jy(w.selection,w.body):"",b=i&&typeof i.text=="string"?i.text:S,C=!v&&!!i&&typeof b=="string"&&b.length>0,y=Ta(C?b:"",s.maxTextBytes),m=i?Ta(Ve(i.source),80).value:"";return{tabId:a,url:o.value,title:h.value,text:y.value,textBytes:y.bytes,available:!!C,stale:v,truncated:!!(C&&(i.truncated===!0||i.flags?.truncated===!0||y.truncated)),source:m||(C?"browser-page":"unavailable"),provenance:{tabId:"trusted-tab",url:"trusted-tab",title:"trusted-tab",text:C?"context-response":"none"}}}function xn(e=""){let t=Ve(e);return{streamId:t,status:t?"starting":"idle",text:"",modelProgress:null,stats:null,finishReason:null,error:null}}function Qn(e,t){if(!an(e)||!an(t))return e;let n=Ve(t.streamId)||Ve(t.requestId);if(!e.streamId||!n||n!==e.streamId||Yy.has(e.status))return e;let s=an(t.event)?t.event:t,r=Ve(s.type);if(r==="model-progress"){let i=Zy(s.progress);return Number.isFinite(i)?{...e,status:"loading-model",modelProgress:Math.max(0,Math.min(1,i)),error:null}:e}if(r==="text")return typeof s.delta!="string"||s.delta.length===0?e:{...e,status:"streaming",text:e.text+s.delta,error:null};if(r==="stats")return an(s.stats)?{...e,stats:{...s.stats}}:e;if(r==="done"){let i=Ve(s.finishReason)||"eos";return{...e,status:i==="cancelled"?"cancelled":"done",finishReason:i,error:null}}if(r==="error"){let i=Ve(s.message)||"Local AI request failed",a=Ve(s.code)||"inference-failed";return{...e,status:"error",finishReason:"error",error:{code:a,message:i}}}return e}function hc(e){let t=Ve(e);return t?t.split(/[-_\s]+/).filter(Boolean).map(n=>/^(qvac|qwen|gguf|cpu|gpu)$/i.test(n)?n.toUpperCase():n.charAt(0).toUpperCase()+n.slice(1)).join(" "):"Local model"}function xa(e){if(!Number.isFinite(e)||e<0)return"\u2014";if(e<1024)return`${Math.round(e)} B`;let t=["KB","MB","GB","TB"],n=e,s=-1;do n/=1024,s++;while(n>=1024&&s<t.length-1);let r=n>=100?0:n>=10?1:2;return`${Number(n.toFixed(r))} ${t[s]}`}function Br(e){let t=typeof e=="string"?e:"",n=t.toLowerCase(),s=n.lastIndexOf("<think>"),r=n.lastIndexOf("</think>");return s>r&&(t=t.slice(0,s)),t.replace(/<think>[\s\S]*?<\/think>/gi,"").replace(/<\/?think>/gi,"").trim()}function Qy(e){let t=an(e)?e:{};return{maxUrlBytes:yc(t.maxUrlBytes,mc.maxUrlBytes),maxTitleBytes:yc(t.maxTitleBytes,mc.maxTitleBytes),maxTextBytes:yc(t.maxTextBytes,mc.maxTextBytes)}}function yc(e,t){return!Number.isFinite(e)||e<0?t:Math.floor(e)}function Ta(e,t){let n=typeof e=="string"?e:"",s=0,r=0;for(let i of n){let a=Xy(i.codePointAt(0));if(s+a>t)break;s+=a,r+=i.length}return{value:n.slice(0,r),bytes:s,truncated:r<n.length}}function Xy(e){return e<=127?1:e<=2047?2:e<=65535?3:4}function Ve(e){return typeof e=="string"?e.trim():""}function Jy(e,t){let n=Ve(e),s=Ve(t);return n&&s?`Selected text:
${n}

Page text:
${s}`:n?`Selected text:
${n}`:s}function Zy(e){if(Number.isFinite(e))return e;if(!an(e))return NaN;let t=Number(e.percentage);if(Number.isFinite(t))return t>1?t/100:t;let n=Number(e.completed??e.downloaded),s=Number(e.total);return Number.isFinite(n)&&Number.isFinite(s)&&s>0?n/s:NaN}function an(e){return!!e&&typeof e=="object"&&!Array.isArray(e)}function gc(e){let t=Kr(e)?e:null,n=t&&Array.isArray(t.models)?t.models.filter(Kr).map(th).filter(r=>r.alias):[],s=n.filter(r=>r.installed);return!t||t.available!==!0||n.length===0?{available:!1,reason:kt(t?.reason)||(t&&n.length===0&&t.available===!0?"no-models":"")||(t?"runtime-unavailable":"no-capabilities"),busy:!1,queueDepth:0,modelCount:n.length,loadedCount:0,models:n}:{available:!0,reason:"",busy:t.busy===!0,queueDepth:Number.isFinite(t.queueDepth)?Math.max(0,t.queueDepth):0,modelCount:n.length,loadedCount:s.length,models:n}}function Rf(e,t=""){let n=Array.isArray(e)?e.filter(Kr):[],s=kt(t);if(s&&n.some(i=>i.alias===s))return s;let r=n.find(i=>i.recommended===!0)||n.find(i=>i.provider==="ollama")||n[0];return kt(r?.alias)}function $c(e){let t=Kr(e)?e:gc(null);if(!t.available){let s=kt(t.reason);return s?`Local AI unavailable \xB7 ${s}`:"Local AI unavailable"}let n=t.modelCount===1?"1 local model":`${t.modelCount} local models`;return t.busy||t.queueDepth>0?`${n} \xB7 generating`:t.loadedCount>0?`${n} \xB7 ready in memory`:`${n} \xB7 loads on first use`}function If({streamId:e,model:t,question:n,history:s}={}){let r=kt(e),i=kt(t),a=kt(n).slice(0,2e3);if(!r)throw new Error("A quick ask requires a stream id");if(!i)throw new Error("A quick ask requires a browser-approved model alias");if(!a)throw new Error("A quick ask requires a non-empty question");return{streamId:r,model:i,question:a,history:eh(s),page:{},maxTokens:192,temperature:.3}}function eh(e){return Array.isArray(e)?e.filter(t=>Kr(t)&&(t.role==="user"||t.role==="assistant")).map(t=>({role:t.role,content:kt(t.content)})).filter(t=>t.content).slice(-6):[]}function th(e){return{alias:kt(e.alias),label:kt(e.label),provider:kt(e.provider),installed:e.installed===!0,recommended:e.recommended===!0,expectedSize:Number.isFinite(e.expectedSize)?e.expectedSize:void 0,quantization:kt(e.quantization)}}function kt(e){return typeof e=="string"?e.trim():""}function Kr(e){return!!e&&typeof e=="object"&&!Array.isArray(e)}var Da=Object.freeze({name:"DuckDuckGo",origin:"https://duckduckgo.com/"});function nh(e){return String(e||"").normalize("NFKC").trim().replace(/\s+/gu," ").slice(0,2048)}function Lf(e){let t=nh(e);if(!t)return null;let n=new URL(Da.origin);return n.searchParams.set("q",t),n.toString()}function Xn(e,t){if(typeof e!="string"||!/^[0-9]+$/.test(e))return String(e??"");if(!Number.isSafeInteger(t)||t<0)return e;if(t===0)return e.replace(/^0+(?=\d)/,"");let n=e.padStart(t+1,"0"),s=n.slice(0,-t).replace(/^0+(?=\d)/,""),r=n.slice(-t).replace(/0+$/,"");return r?`${s}.${r}`:s}function Ra(e){return!e||typeof e!="string"?"":e.length<=14?e:e.slice(0,6)+"\u2026"+e.slice(-4)}function Pf(e){if(typeof e!="string")return null;let t=e.trim().toLowerCase().split(/\s+/).filter(Boolean);return t.length!==12&&t.length!==24?null:t}var Ps="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",sh=(()=>{let e=new Map;for(let t=0;t<Ps.length;t++)e.set(Ps[t],t);return e})();function rh(e){return new TextEncoder().encode(e)}function ih(e){return new TextDecoder().decode(e)}function ah(e){let t="";for(let n=0;n<e.length;n+=3){let s=e[n],r=n+1<e.length?e[n+1]:null,i=n+2<e.length?e[n+2]:null;t+=Ps[s>>2],t+=Ps[(s&3)<<4|(r===null?0:r>>4)],t+=r===null?"=":Ps[(r&15)<<2|(i===null?0:i>>6)],t+=i===null?"=":Ps[i&63]}return t}function lh(e){if(typeof e!="string")return null;let t=e.replace(/=+$/,"");if(!/^[A-Za-z0-9+/]*$/.test(t))return null;let n=[],s=0,r=0;for(let i of t)s=s<<6|sh.get(i),r+=6,r>=8&&(r-=8,n.push(s>>r&255));return new Uint8Array(n)}function Mf(e){return ah(rh(e))}function Of(e){let t=lh(e);return t===null?null:ih(t)}function Lt(e){let t=typeof e=="string"?e:String(e?.message||e||""),n=t.toLowerCase();return n.includes("bad-passphrase")||n.includes("passphrase is incorrect")?"Wrong passphrase \u2014 check it and try again.":n.includes("wallet-exists")||n.includes("vault already exists")?"A wallet already exists on this device. Unlock it, or reset app data to start over.":n.includes("wallet-locked")||n.includes("wallet is locked")?"The wallet is locked \u2014 unlock it first.":n.includes("lock the wallet before starting a backup")?"Lock the wallet before starting a backup.":n.includes("rate-limited")||n.includes("rate limit")?"Rate limited \u2014 wait a moment and try again.":n.includes("prompt-expired")?"That approval prompt expired \u2014 try the action again.":n.includes("at least 12")?"The passphrase must be at least 12 characters long.":n.includes("bad-request")||n.includes("24 words")||n.includes("invalid mnemonic")||n.includes("checksum")?"That recovery phrase isn't valid \u2014 check each word and its order, and enter the full 24-word phrase.":n.includes("vault-corrupt")||n.includes("corrupt or tampered")?"The wallet vault is corrupt or tampered. Reset app data, then restore from your recovery phrase.":n.includes("restart required")||n.includes("recovery-required")?"The wallet engine hit an internal fault \u2014 restart PearBrowser, then try again.":n.includes("wallet-busy")?"The wallet is busy with another operation \u2014 wait a moment and try again.":n.includes("insufficient-funds")?"Insufficient balance to cover this payment and its network fee.":n.includes("ceremony-active")?"A recovery-phrase reveal is already open \u2014 finish or cancel it first.":n.includes("ceremony-failed")||n.includes("initialization-failed")||n.includes("operation-failed")?"The wallet operation failed \u2014 please try again. If you were importing, double-check every word of the recovery phrase.":n.includes("not-authorized")?"That action is not authorized for this app.":n.includes("not-found")||n.includes("not available")||n.includes("vault is absent")?"The wallet is not available yet \u2014 the worklet may still be booting. Try again in a moment.":n.includes("not-implemented")||n.includes("not implemented")?"This wallet feature is not implemented in this build.":t||"Something went wrong."}var zr=12;function oh(e){return typeof e!="string"?0:Array.from(e).length}function Jn(e){return oh(e)>=zr}function Uf(e){if(typeof e!="string"||e.length===0)return{score:0,label:"",hint:"Use 12+ characters \u2014 a short sentence works well."};let t=0;return e.length>=8&&t++,e.length>=12&&t++,e.length>=16&&t++,/[a-z]/.test(e)&&/[A-Z]/.test(e)&&t++,/[0-9]/.test(e)&&t++,/[^a-zA-Z0-9\s]/.test(e)&&t++,/^[a-z]+$/.test(e)&&e.length<12&&(t=Math.min(t,1)),t<=2?{score:t,label:"weak",hint:"Too easy to guess \u2014 make it longer and mix words, digits, symbols."}:t<=4?{score:t,label:"fair",hint:"Okay \u2014 longer is better. Losing this passphrase loses the wallet."}:{score:t,label:"strong",hint:"Strong. Store it safely \u2014 there is no reset."}}function Bf(e){if(!e||typeof e!="object")return"";switch(e.type){case"intent":return e.intentType==="payment"?"Payment requested":e.intentType==="sign-app"?"App signature requested":"Request";case"prompt":return"Approval prompt opened";case"approval":return"Approved";case"rejection":return"Rejected";case"broadcast":return"Broadcast to network";case"outcome":return{submitted:"Payment submitted",expired:"Prompt expired",cancelled:"Cancelled",error:"Failed"}[e.state]||(e.state?`Outcome: ${e.state}`:"Outcome");case"connect":return"App connected";case"disconnect":return"App disconnected";case"sign-app":return"App payload signed";default:return e.type}}function qr(e){try{navigator.clipboard?.writeText(e)}catch{}}var Kf="appearanceTheme",jf="pearbrowser.appearanceTheme",ch=new Set(["light","dark"]);function Yf(e){return ch.has(e)?e:"light"}function _c(){try{return Yf(localStorage.getItem(jf))}catch{return"light"}}function Ia(e){let t=Yf(e);try{document.documentElement.dataset.theme=t,document.documentElement.style.colorScheme=t,localStorage.setItem(jf,t)}catch{}return t}Ia(_c());var uh=[{id:"keet",name:"Keet",nativeDelivery:{status:"migration-required"},tagline:"End-to-end encrypted P2P chat, voice, and video calls by Holepunch.",legacyMigrationId:"oeeoz3w6fjjt7bym3ndpa6hhicm8f8naxyk11z4iypeoupn6jzpo",initial:"K",gradient:"linear-gradient(135deg, #fbbf24, #f97316)"},{id:"pearpass",name:"PearPass",nativeDelivery:{status:"migration-required"},tagline:"Peer-to-peer password manager from Tether \u2014 synced across devices without a cloud.",legacyMigrationId:"tywsat7gz8m65ejx4zjn3773pbdc4j8m66tukis8dgzekraymtzo",initial:"P",gradient:"linear-gradient(135deg, #3fb950, #58a6ff)"},{id:"anongpt",name:"anonGPT",nativeDelivery:{status:"migration-required"},tagline:"Private P2P AI chat \u2014 pay-per-inference from a HiveMind seller, with signed receipts.",legacyMigrationId:"rpzh3fsgg38kfir9nmae7x3o8ubofddzzixr5js4mxd6a6drb6wo",initial:"A",gradient:"linear-gradient(135deg, #22d3ee, #6366f1)"},{id:"pearpaste",name:"Paste",nativeDelivery:{status:"migration-required"},tagline:"Local-first, end-to-end encrypted notes & clipboard sync for your own devices \u2014 no account, no cloud.",legacyMigrationId:"qnax5k8ojtod51ci9qwkrawdof1hx5w3a7gqbueoqnzzq9dw5hfo",initial:"\u{1F4CB}",gradient:"linear-gradient(135deg, #4ade80, #22d3ee)"},{id:"peercord",name:"Peercord",nativeDelivery:{status:"migration-required"},tagline:"Decentralized Discord-style chat with text, voice, video, screen sharing, and P2P file transfer.",legacyMigrationId:"wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy",initial:"P",gradient:"linear-gradient(135deg, #5865f2, #22d3ee)"}],dh={browse:{label:"Browse"},apps:{label:"Apps"},sites:{label:"P2P Sites"},library:{label:"Library"},settings:{label:"Settings"}},Qf="hyper://03f0060a35451cfb6b68ad1dda1b8474ebb43fd9100071ccf7d67679a83ebb4f/",Xf="ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4",ph="hyper://"+Xf+"/",fh="ac1977a75cc84b46af0af8bb559cd4ebbe10507eb0f51d863e289d09635f6d74",Jf="hyper://"+fh+"/",Sc=[{url:"",title:"PearBrowser Home"},{url:Qf,title:"PearBrowser"},{url:Jf,title:"P2P Builders"},{url:ph,title:"peerit"}],wc=new Map(Sc.map(e=>[e.url,e.title]));function Zf(e){let t=Je(e).replace(/#.*$/,"");if(!t)return"";if(wc.has(t))return wc.get(t);try{let n=new URL(t);return n.protocol!=="hyper:"||!n.hostname?"":wc.get(`hyper://${n.hostname}/`)||""}catch{return""}}function mh(e){let t=String(e||"").replace(/^\/+/,"").split("/").filter(Boolean).pop();if(!t)return"";try{return decodeURIComponent(t)}catch{return t}}function Gr(e){let t=Je(e);if(!t)return"New tab";let n=Zf(t);if(n)return n;try{let r=new URL(t);if(r.protocol==="hyper:"&&r.hostname){let i=$e(r.hostname),a=mh(r.pathname);return a?`${i} / ${a}`:i}if(r.hostname)return r.hostname}catch{}let s=t.replace(/^hyper:\/\//i,"");return s.length>40?s.slice(0,37)+"...":s}function bc(e,t){let n=Zf(t);if(n)return n;let s=rn(e,"").trim();return s&&s!==t&&!/^hyper:\/\//i.test(s)?s:Gr(t)}function Os(e="",t={}){let n=Je(e);return Ca(n,{...t,title:rn(t.title,n?Gr(n):"New tab")})}function em(e){return rn(e?.title,Gr(e?.displayUrl||e?.url||""))}function vh(e){let t=em(e),n=e?.displayUrl||e?.url||"";return n&&n!==t?`${t}
${n}`:t}var Nc="hyperbee://f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d",Ms="hyperbee://5d961fdc2f56215463e5d4656dd4a3f22bb5e15b93f9bfc8439a63a18f974d75",yh="0c35d12fd9b1115dd2d1fb1cd1751817c9173d3196ac7c62ae37d023340dcb75";function zf(e,t){return e.kind==="sheets"?{cmd:t.CMD_SHEETS_LOAD,payload:{link:e.key},persistRef:`sheets://${e.key}`}:e.kind==="hiveindex"?{cmd:t.CMD_LOAD_CATALOG_INDEX,payload:{link:e.key},persistRef:`hiveindex://${e.key}`}:e.autobee?{cmd:t.CMD_LOAD_CATALOG_AUTOBEE,persistRef:`autobee://${e.key}`}:e.bee?{cmd:t.CMD_LOAD_CATALOG_BEE,persistRef:`hyperbee://${e.key}`}:{cmd:t.CMD_LOAD_CATALOG,persistRef:e.key}}function hh(e){if(!e||typeof e!="string")return null;let t;try{t=new URL(e)}catch{return null}let n=t.protocol.replace(":","");if(n!=="hyper"&&n!=="pear")return null;let s=t.hostname||t.pathname.split("/")[0]||"";if(!s)return null;let r=null,i=null;return/^[0-9a-f]{64}$/i.test(s)?(r=s.toLowerCase(),i=Nf(r)):/^[13-9a-km-uw-z]{52}$/i.test(s)&&(i=s.toLowerCase(),r=Na(i)),{proto:n,raw:s,hex:r,z32:i,path:t.pathname||"/",urlStr:e}}function Hf(e,t){let n=it(e),s=it(t);if(!n||n!==s)return!1;try{let r=new URL(e),i=new URL(t);return r.pathname===i.pathname&&r.search===i.search&&r.hash===i.hash}catch{return!1}}function Hr(e,t,n=t+"s"){let s=Number.isFinite(e)?e:0;return`${s} ${s===1?t:n}`}function gh(e,t){if(t)return{tone:"warn",text:`Live metadata unavailable: ${t}`};if(!e)return{tone:"pending",text:"Checking live drive metadata\u2026"};let n=e.relay||{};return n.available?n.advertisedRelays>0?{tone:"ok",text:`Pinned: advertised by ${Hr(n.advertisedRelays,"relay")}.`}:n.seedAcceptances>0&&n.durable?{tone:"ok",text:`Pinned by this client: ${Hr(n.seedAcceptances,"relay")} accepted and ${Hr(n.activePeers,"peer")} is replicating.`}:n.seedAcceptances>0?{tone:"warn",text:`${Hr(n.seedAcceptances,"relay")} accepted the pin request; waiting for a live replication peer.`}:n.connectedRelays>0?{tone:"neutral",text:`No pin signal for this drive from ${Hr(n.connectedRelays,"connected relay")}.`}:{tone:"warn",text:"No HiveRelay connections yet; discovery is currently pure P2P."}:{tone:"warn",text:"HiveRelay client is unavailable; using pure P2P discovery."}}function $h({rpc:e,C:t,url:n,onClose:s,onBookmarkToggle:r}){let i=hh(n),a=i?.hex||"",[l,u]=(0,d.useState)(null),[o,h]=(0,d.useState)(null),[g,v]=(0,d.useState)(""),[w,S]=(0,d.useState)(null),[b,C]=(0,d.useState)({});(0,d.useEffect)(()=>{n&&e.request(t.CMD_USERDATA_LIST_BOOKMARKS).then(T=>{let $=T?.bookmarks||[];u($.some(E=>E&&E.url===n))}).catch(()=>u(!1))},[n,e,t]),(0,d.useEffect)(()=>{if(!a){h(null),v("");return}let T=!1;h(null),v("");let $=async()=>{try{let D=await e.request(t.CMD_GET_DRIVE_INFO,{keyHex:a},1e4);T||(h(D),v(""))}catch(D){T||v(D.message||"unknown error")}};$();let E=setInterval($,5e3);return()=>{T=!0,clearInterval(E)}},[a,e,t]);let y=(T,$)=>{try{navigator.clipboard?.writeText($),C({...b,[T]:!0}),setTimeout(()=>C(E=>({...E,[T]:!1})),1500)}catch{}},m=async()=>{if(!w){S("bookmark");try{l?(await e.request(t.CMD_USERDATA_REMOVE_BOOKMARK,{url:n}),u(!1)):(await e.request(t.CMD_USERDATA_ADD_BOOKMARK,{url:n,title:n}),u(!0)),r?.()}catch{}finally{S(null)}}},p=gh(o,g),_=Number(o?.updatedAt),k=Number.isFinite(_)&&_>0?new Date(_).toLocaleTimeString():"";return c`
    <div className="modal-overlay" role="dialog" aria-modal="true"
         onClick=${T=>T.target.classList.contains("modal-overlay")&&s()}>
      <div className="modal-card about-card">
        <div className="about-head">
          <div className="about-title">About this site</div>
          <button className="about-close" onClick=${s} title="Close">×</button>
        </div>

        <div className="about-section-label">FULL URL</div>
        <div className="about-row">
          <code className="about-mono">${n||"(no URL loaded)"}</code>
          <button className="copy-btn-small ${b.url?"copied":""}"
                  onClick=${()=>y("url",n)} disabled=${!n}>
            ${b.url?"\u2713":"Copy"}
          </button>
        </div>

        ${i&&i.hex&&c`
          <div className="about-section-label">DRIVE KEY (hex)</div>
          <div className="about-row">
            <code className="about-mono">${i.hex}</code>
            <button className="copy-btn-small ${b.hex?"copied":""}"
                    onClick=${()=>y("hex",i.hex)}>
              ${b.hex?"\u2713":"Copy"}
            </button>
          </div>
        `}

        ${i&&i.z32&&c`
          <div className="about-section-label">DRIVE KEY (z-base-32)</div>
          <div className="about-row">
            <code className="about-mono">${i.z32}</code>
            <button className="copy-btn-small ${b.z32?"copied":""}"
                    onClick=${()=>y("z32",i.z32)}>
              ${b.z32?"\u2713":"Copy"}
            </button>
          </div>
        `}

        ${i&&c`
          <div className="about-meta-grid">
            <div>
              <div className="about-meta-label">Scheme</div>
              <div className="about-meta-value">${i.proto}://</div>
            </div>
            <div>
              <div className="about-meta-label">Path</div>
              <div className="about-meta-value">${i.path}</div>
            </div>
          </div>
        `}

        ${i&&i.hex&&c`
          <div className="about-section-label">LIVE DRIVE</div>
          <div className="about-meta-grid about-live-grid">
            <div>
              <div className="about-meta-label">Version</div>
              <div className="about-meta-value">${o?o.version??"\u2014":"\u2026"}</div>
            </div>
            <div>
              <div className="about-meta-label">Peers</div>
              <div className="about-meta-value" title=${o?`${o.metadataPeerCount||0} metadata \xB7 ${o.blobPeerCount||0} blob`:""}>
                ${o?o.peerCount||0:"\u2026"}
              </div>
            </div>
            <div>
              <div className="about-meta-label">Relays</div>
              <div className="about-meta-value">${o?o.relay?.connectedRelays||0:"\u2026"}</div>
            </div>
            <div>
              <div className="about-meta-label">Cached</div>
              <div className="about-meta-value">${o?ka(o.byteLength):"\u2026"}</div>
            </div>
            <div>
              <div className="about-meta-label">Mode</div>
              <div className="about-meta-value">${o?o.writable?"writable":"read-only":"\u2026"}</div>
            </div>
            <div>
              <div className="about-meta-label">Fetch</div>
              <div className="about-meta-value">${o?o.relay?.hybridFetchEnabled?"hybrid":"P2P":"\u2026"}</div>
            </div>
          </div>
          <div className=${"about-pin-status "+p.tone}>${p.text}</div>
        `}

        ${o&&o.discoveryKey&&c`
          <div className="about-section-label">DISCOVERY KEY</div>
          <div className="about-row">
            <code className="about-mono">${o.discoveryKey}</code>
            <button className="copy-btn-small ${b.discovery?"copied":""}"
                    onClick=${()=>y("discovery",o.discoveryKey)}>
              ${b.discovery?"\u2713":"Copy"}
            </button>
          </div>
        `}

        <div className="about-section-label">YOUR LIBRARY</div>
        <div className="about-row about-bookmark-row">
          <div>
            ${l===null?c`<span className="settings-subtle">Checking…</span>`:l?c`<span style=${{color:"#ff9500"}}>★ Bookmarked</span>`:c`<span className="settings-subtle">Not in your bookmarks</span>`}
          </div>
          <button className="btn ${l?"subtle":"primary"}"
                  onClick=${m}
                  disabled=${w==="bookmark"||l===null||!n}>
            ${w==="bookmark"?"\u2026":l?"Remove bookmark":"Bookmark this site"}
          </button>
        </div>

        ${o&&c`
          <div className="about-foot">
            ${k?`Updated ${k} \xB7 `:""}
            ${o.relay?.hybridFetchEnabled?"hybrid relay fetch enabled":"pure P2P fetch"}
          </div>
        `}
      </div>
    </div>
  `}var wh=["Summarize this page","What are the key claims?","Explain this simply","What should I verify?"];function bh({rpc:e,C:t,activeTab:n,captureContext:s,onClose:r}){let[i,a]=(0,d.useState)(null),[l,u]=(0,d.useState)(""),[o,h]=(0,d.useState)(""),[g,v]=(0,d.useState)(""),[w,S]=(0,d.useState)([]),[b,C]=(0,d.useState)(()=>xn()),[y,m]=(0,d.useState)(""),[p,_]=(0,d.useState)(null),[k,T]=(0,d.useState)(!1),$=(0,d.useRef)(""),E=(0,d.useRef)(""),D=(0,d.useRef)(null),x=(0,d.useRef)(""),q=(0,d.useRef)(null),X=(0,d.useRef)(0),Q=(0,d.useRef)(`${n?.id||""}
${n?.url||""}`),j=["starting","loading-model","streaming"].includes(b.status),K=Array.isArray(i?.models)?i.models:[],O=K.find(M=>M.alias===o)||null;(0,d.useEffect)(()=>{let M=!1;return u(""),e.request(t.CMD_ASK_BROWSER_CAPABILITIES).then(B=>{if(M)return;a(B);let Y=Array.isArray(B?.models)?B.models:[],A=Y.find(L=>L.recommended)||Y.find(L=>L.provider==="ollama")||Y[0];h(L=>Y.some(ae=>ae.alias===L)?L:A?.alias||"")}).catch(B=>{M||u(B.message||"Local AI runtime is unavailable")}),()=>{M=!0}},[e,t]),(0,d.useEffect)(()=>{let M=B=>{let Y=B.detail;!Y||Y.streamId!==$.current||C(A=>Qn(A,Y))};return e.addEventListener(`event:${t.EVT_ASK_BROWSER_STREAM}`,M),()=>e.removeEventListener(`event:${t.EVT_ASK_BROWSER_STREAM}`,M)},[e,t]),(0,d.useEffect)(()=>{if(!["done","cancelled","error"].includes(b.status)||!b.streamId||x.current===b.streamId)return;x.current=b.streamId;let B=E.current;B&&S(Y=>[...Y,{id:b.streamId,question:B,answer:Br(b.text),error:b.error,finishReason:b.finishReason,stats:b.stats,source:D.current}].slice(-20)),b.status==="done"&&a(Y=>Y&&{...Y,models:(Y.models||[]).map(A=>A.alias===o?{...A,installed:!0}:A)}),$.current="",E.current="",m(""),T(!1)},[b]),(0,d.useEffect)(()=>{let M=q.current;M&&(M.scrollTop=M.scrollHeight)},[w,b.text,b.status]),(0,d.useEffect)(()=>{let M=`${n?.id||""}
${n?.url||""}`;if(Q.current===M)return;Q.current=M,X.current++;let B=$.current;B&&e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:B}).catch(()=>{}),$.current="",E.current="",D.current=null,x.current="",S([]),C(xn()),m(""),_(null),T(!1)},[n?.id,n?.url,e,t]),(0,d.useEffect)(()=>()=>{X.current++;let M=$.current;$.current="",M&&e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:M}).catch(()=>{})},[e,t]);let ne=async M=>{M?.preventDefault?.();let B=g.trim();if(!B||j||!o)return;let Y=Aa(),A=++X.current;x.current="",$.current=Y,E.current=B,D.current=null,m(B),_(null),T(!1),v(""),C(xn(Y));try{let L=await s();if(X.current!==A||$.current!==Y)return;let ae={tabId:L.tabId,url:L.url,title:L.title,textBytes:L.textBytes,available:L.available,truncated:L.truncated,source:L.source};D.current=ae,_(ae);let we=w.filter(fe=>fe.source?.tabId===L.tabId&&fe.source?.url===L.url).slice(-3).flatMap(fe=>{let _t=[{role:"user",content:fe.question}];return fe.answer&&_t.push({role:"assistant",content:fe.answer}),_t}),re=await e.request(t.CMD_ASK_BROWSER_START,{streamId:Y,model:o,question:B,history:we,page:L,maxTokens:256,temperature:.2},3e4);if(X.current!==A||$.current!==Y){e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:Y}).catch(()=>{});return}let G={...ae,...re?.source||{}};D.current=G,_(G)}catch(L){if(X.current!==A||$.current!==Y)return;C(ae=>Qn(ae,{streamId:Y,event:{type:"error",code:L?.code||"ask-browser-failed",message:L?.message||"Ask Browser failed"}}))}},U=async()=>{let M=$.current;if(!(!M||k)){X.current++,T(!0),C(B=>Qn(B,{streamId:M,event:{type:"done",finishReason:"cancelled"}}));try{await e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:M})}catch{}}},ie=()=>{if($.current){X.current++;let M=$.current;$.current="",E.current="",m(""),C(xn()),T(!1),e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:M}).catch(()=>{})}D.current=null,_(null),S([])},de=()=>{X.current++;let M=$.current;$.current="",M&&e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:M}).catch(()=>{}),r()},P=Br(b.text),I=p||w[w.length-1]?.source||{tabId:n?.id||"",url:n?.url||"",title:n?.title||n?.url||"No active page"},H=k?"Stopping\u2026":b.status==="starting"?"Reading current page\u2026":b.status==="loading-model"?`Loading model${Number.isFinite(b.modelProgress)?` \xB7 ${Math.round(b.modelProgress*100)}%`:"\u2026"}`:b.status==="streaming"?"Generating locally\u2026":"";return c`
    <aside id="ask-browser-panel" className="ask-browser-panel" aria-label="Ask Browser" data-testid="ask-browser-panel">
      <div className="ask-browser-header">
        <div>
          <div className="ask-browser-title">Ask Browser</div>
          <div className="ask-browser-local"><span></span>Local only</div>
        </div>
        <div className="ask-browser-header-actions">
          <button type="button" className="ask-browser-text-button" onClick=${ie} disabled=${w.length===0&&!j}>Clear</button>
          <button type="button" className="ask-browser-close" aria-label="Close Ask Browser" onClick=${de}>×</button>
        </div>
      </div>

      <div className="ask-browser-model-row">
        <label htmlFor="ask-browser-model">Model</label>
        <select id="ask-browser-model" data-testid="ask-browser-model" value=${o} disabled=${j||K.length===0}
          onChange=${M=>h(M.target.value)}>
          ${K.map(M=>c`<option key=${M.alias} value=${M.alias}>${M.label||hc(M.alias)}${M.expectedSize?` \xB7 ${xa(M.expectedSize)}`:""}</option>`)}
        </select>
        ${O&&c`<div className="ask-browser-model-meta">${O.provider||"local"}${O.quantization?` \xB7 ${O.quantization}`:""}${O.installed?" \xB7 loaded":" \xB7 loads on first use"}</div>`}
      </div>

      <div className="ask-browser-source" title=${I.url||""}>
        <div className="ask-browser-source-kicker">Source [1] · current tab</div>
        <div className="ask-browser-source-title">${I.title||I.url||"No active page"}</div>
        <div className="ask-browser-source-url">${I.url||"Open a page to add context"}</div>
        ${p&&c`<div className="ask-browser-source-meta">${p.available||p.hasText?`${xa(p.textBytes||0)} captured`:"Metadata only"}${p.truncated?" \xB7 truncated":""}</div>`}
      </div>

      <div className="ask-browser-transcript" ref=${q}>
        ${w.length===0&&!y&&c`
          <div className="ask-browser-empty">
            <div className="ask-browser-spark">✦</div>
            <div className="ask-browser-empty-title">Ask about what you’re viewing</div>
            <div className="ask-browser-empty-copy">Page context stays on this device and is sent only to the selected local model.</div>
            <div className="ask-browser-quick-grid">
              ${wh.map(M=>c`<button type="button" key=${M} onClick=${()=>v(M)}>${M}</button>`)}
            </div>
          </div>
        `}
        ${w.map(M=>c`
          <div className="ask-browser-turn" key=${M.id}>
            <div className="ask-browser-message ask-browser-user">${M.question}</div>
            <div className=${`ask-browser-message ask-browser-assistant${M.error?" error":""}`}>
              ${M.error?M.error.message:M.answer||(M.finishReason==="cancelled"?"Stopped.":"No answer returned.")}
              ${M.finishReason==="cancelled"&&M.answer?c`<span className="ask-browser-interrupted"> Response stopped.</span>`:null}
            </div>
            ${M.source&&c`<div className="ask-browser-turn-source">[1] ${M.source.title||M.source.url||"Captured page"}</div>`}
            ${M.stats&&c`<div className="ask-browser-stats">${Number.isFinite(M.stats.tokensPerSecond)?`${M.stats.tokensPerSecond.toFixed(1)} tok/s`:""}${M.stats.backendDevice?` \xB7 ${M.stats.backendDevice}`:""}</div>`}
          </div>
        `)}
        ${y&&c`
          <div className="ask-browser-turn active">
            <div className="ask-browser-message ask-browser-user">${y}</div>
            <div className="ask-browser-message ask-browser-assistant">
              ${P||c`<span className="ask-browser-thinking">${H||"Thinking locally\u2026"}</span>`}
            </div>
          </div>
        `}
      </div>

      <form className="ask-browser-composer" onSubmit=${ne}>
        <div className="ask-browser-live-status" role="status" aria-live="polite">${H}</div>
        ${l&&c`<div className="ask-browser-error">${l}</div>`}
        ${i&&i.available===!1&&c`<div className="ask-browser-error">${i.reason||"Local AI runtime is unavailable"}</div>`}
        <textarea data-testid="ask-browser-input" value=${g}
          aria-label="Question about the current page"
          onInput=${M=>v(M.target.value)}
          onKeyDown=${M=>{M.key==="Enter"&&(M.metaKey||M.ctrlKey)&&ne(M)}}
          placeholder="Ask about this page…" rows="3" disabled=${j||!i?.available}></textarea>
        <div className="ask-browser-compose-row">
          <span>⌘↵ to send</span>
          ${j?c`<button type="button" className="ask-browser-stop" data-testid="ask-browser-stop" onClick=${U} disabled=${k}>${k?"Stopping\u2026":"Stop"}</button>`:c`<button type="submit" className="ask-browser-send" data-testid="ask-browser-send" disabled=${!g.trim()||!o||!i?.available}>Ask</button>`}
        </div>
      </form>
    </aside>
  `}var Nh=["What is the peer-to-peer web?","Summarize what a Hyperdrive is","Draft a short intro post for peerit"];function kh({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[r,i]=(0,d.useState)(""),[a,l]=(0,d.useState)(""),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)([]),[v,w]=(0,d.useState)(()=>xn()),[S,b]=(0,d.useState)(""),[C,y]=(0,d.useState)(!1),m=(0,d.useRef)(""),p=(0,d.useRef)(""),_=(0,d.useRef)(""),k=(0,d.useRef)(null),T=(0,d.useMemo)(()=>gc(n),[n]),$=["starting","loading-model","streaming"].includes(v.status),E=T.models,D=E.find(K=>K.alias===a)||null;(0,d.useEffect)(()=>{let K=!1;return i(""),e.request(t.CMD_ASK_BROWSER_CAPABILITIES).then(O=>{if(K)return;s(O);let ne=Array.isArray(O?.models)?O.models:[];l(U=>Rf(ne,U))}).catch(O=>{K||i(O.message||"Local AI runtime is unavailable")}),()=>{K=!0}},[e,t]),(0,d.useEffect)(()=>{let K=O=>{let ne=O.detail;!ne||ne.streamId!==m.current||w(U=>Qn(U,ne))};return e.addEventListener(`event:${t.EVT_ASK_BROWSER_STREAM}`,K),()=>e.removeEventListener(`event:${t.EVT_ASK_BROWSER_STREAM}`,K)},[e,t]),(0,d.useEffect)(()=>{if(!["done","cancelled","error"].includes(v.status)||!v.streamId||_.current===v.streamId)return;_.current=v.streamId;let O=p.current;O&&g(ne=>[...ne,{id:v.streamId,question:O,answer:Br(v.text),error:v.error,finishReason:v.finishReason,stats:v.stats}].slice(-8)),v.status==="done"&&s(ne=>ne&&{...ne,models:(ne.models||[]).map(U=>U.alias===a?{...U,installed:!0}:U)}),m.current="",p.current="",b(""),y(!1)},[v]),(0,d.useEffect)(()=>{let K=k.current;K&&(K.scrollTop=K.scrollHeight)},[h,v.text,v.status]),(0,d.useEffect)(()=>()=>{let K=m.current;m.current="",K&&e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:K}).catch(()=>{})},[e,t]);let x=async K=>{K?.preventDefault?.();let O=u.trim();if(!O||$||!a)return;let ne=Aa();_.current="",m.current=ne,p.current=O,b(O),y(!1),o(""),w(xn(ne));try{let U=h.slice(-3).flatMap(ie=>{let de=[{role:"user",content:ie.question}];return ie.answer&&de.push({role:"assistant",content:ie.answer}),de});await e.request(t.CMD_ASK_BROWSER_START,If({streamId:ne,model:a,question:O,history:U}),3e4)}catch(U){if(m.current!==ne)return;w(ie=>Qn(ie,{streamId:ne,event:{type:"error",code:U?.code||"quick-ask-failed",message:U?.message||"Local AI request failed"}}))}},q=async()=>{let K=m.current;if(!(!K||C)){y(!0),w(O=>Qn(O,{streamId:K,event:{type:"done",finishReason:"cancelled"}}));try{await e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:K})}catch{}}},X=()=>{let K=m.current;m.current="",p.current="",K&&e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:K}).catch(()=>{}),g([]),w(xn()),b(""),y(!1)},Q=Br(v.text),j=C?"Stopping\u2026":v.status==="starting"?"Starting locally\u2026":v.status==="loading-model"?`Loading model${Number.isFinite(v.modelProgress)?` \xB7 ${Math.round(v.modelProgress*100)}%`:"\u2026"}`:v.status==="streaming"?"Generating locally\u2026":"";return r||n&&!T.available?c`
      <section className="qvac-widget unavailable" data-testid="qvac-widget" aria-label="Local AI">
        <div className="qvac-widget-header">
          <span className="qvac-widget-spark">✦</span>
          <span className="qvac-widget-title">Local AI</span>
          <span className="qvac-widget-badge">QVAC · on-device</span>
        </div>
        <div className="qvac-widget-status" data-testid="qvac-widget-status">
          ${r||$c(T)}
        </div>
      </section>
    `:n?c`
    <section className="qvac-widget" data-testid="qvac-widget" aria-label="Local AI">
      <div className="qvac-widget-header">
        <span className="qvac-widget-spark">✦</span>
        <span className="qvac-widget-title">Local AI</span>
        <span className="qvac-widget-badge">QVAC · on-device</span>
        <span className="qvac-widget-header-space"></span>
        ${(h.length>0||$)&&c`<button type="button" className="qvac-widget-text-button" onClick=${X}>Clear</button>`}
      </div>
      <div className="qvac-widget-status" data-testid="qvac-widget-status">${$c(T)}</div>

      ${(h.length>0||S)&&c`
        <div className="qvac-widget-transcript" ref=${k} data-testid="qvac-widget-transcript">
          ${h.map(K=>c`
            <div className="qvac-widget-turn" key=${K.id}>
              <div className="qvac-widget-question">${K.question}</div>
              <div className=${`qvac-widget-answer${K.error?" error":""}`}>
                ${K.error?K.error.message:K.answer||(K.finishReason==="cancelled"?"Stopped.":"No answer returned.")}
              </div>
              ${K.stats&&c`<div className="qvac-widget-stats">${Number.isFinite(K.stats.tokensPerSecond)?`${K.stats.tokensPerSecond.toFixed(1)} tok/s`:""}${K.stats.backendDevice?` \xB7 ${K.stats.backendDevice}`:""}</div>`}
            </div>
          `)}
          ${S&&c`
            <div className="qvac-widget-turn active">
              <div className="qvac-widget-question">${S}</div>
              <div className="qvac-widget-answer">
                ${Q||c`<span className="qvac-widget-thinking">${j||"Thinking locally\u2026"}</span>`}
              </div>
            </div>
          `}
        </div>
      `}

      ${h.length===0&&!S&&c`
        <div className="qvac-widget-quick-grid">
          ${Nh.map(K=>c`<button type="button" key=${K} onClick=${()=>o(K)}>${K}</button>`)}
        </div>
      `}

      <form className="qvac-widget-composer" onSubmit=${x}>
        <input
          type="text"
          data-testid="qvac-widget-input"
          value=${u}
          aria-label="Ask the local model"
          onInput=${K=>o(K.target.value)}
          placeholder="Ask anything — answered on this device…"
          disabled=${$}
        />
        ${$?c`<button type="button" className="qvac-widget-stop" data-testid="qvac-widget-stop" onClick=${q} disabled=${C}>${C?"\u2026":"Stop"}</button>`:c`<button type="submit" className="qvac-widget-send" data-testid="qvac-widget-send" disabled=${!u.trim()||!a}>Ask</button>`}
      </form>

      <div className="qvac-widget-footer">
        <select
          className="qvac-widget-model"
          data-testid="qvac-widget-model"
          value=${a}
          disabled=${$||E.length===0}
          aria-label="Local model"
          onChange=${K=>l(K.target.value)}>
          ${E.map(K=>c`<option key=${K.alias} value=${K.alias}>${K.label||hc(K.alias)}</option>`)}
        </select>
        ${D&&c`<span className="qvac-widget-model-meta">${D.installed?"ready":D.expectedSize?`${xa(D.expectedSize)} \xB7 loads on first use`:"loads on first use"}</span>`}
        <span className="qvac-widget-live" role="status" aria-live="polite">${j}</span>
      </div>
    </section>
  `:null}function _h({rpc:e,C:t,navUrl:n,onNavigated:s,tabs:r,setTabs:i,activeId:a,setActiveId:l,closedTabs:u,setClosedTabs:o,sessionReady:h,onOpenSettings:g,nativePageObscured:v=!1}){let w=(0,d.useRef)(null),S=(0,d.useRef)({}),b=(0,d.useRef)({}),C=(0,d.useRef)(null),y=(0,d.useRef)(a),m=(0,d.useRef)(r),p=(0,d.useRef)({}),_=(0,d.useRef)({}),k=(0,d.useRef)(null),T=globalThis.pearbrowserRuntime?.tabs,$=(0,d.useRef)(new Set),[E,D]=(0,d.useState)(""),[x,q]=(0,d.useState)(""),[X,Q]=(0,d.useState)(!1),[j,K]=(0,d.useState)(!1),[O,ne]=(0,d.useState)([]),[U,ie]=(0,d.useState)(!1),[de,P]=(0,d.useState)(-1),I=(0,d.useRef)(0),H=r.find(N=>N.id===a)||r[0];y.current=a,m.current=r;let M=async()=>{let N=r.find(ke=>ke.id===y.current)||H;if(!N)return Ls(null,{});if(Nt(N)){if(!T?.captureContext)return Ls(null,N);let ke=N.url,me=await T.captureContext({tabId:N.id}),Me=m.current.find(mt=>mt.id===N.id);if(y.current!==N.id||!Me||Me.url!==ke)throw new Error("The active tab changed while Ask Browser was reading it");return Ls(me,N,{maxTextBytes:5*1024})}let R=S.current[N.id],W=R?.contentWindow,z=b.current[N.id]||0,Z=()=>{let ke="";try{ke=R?.contentDocument?.body?.innerText||""}catch{}return Ls({tabId:N.id,text:ke,source:ke?"renderer-dom":"metadata"},N,{maxTextBytes:5*1024})};if(!W||!N.contextToken||typeof MessageChannel>"u")return Z();let se;try{se=new URL(N.src).origin}catch{return Z()}let le=Aa(),te=new MessageChannel;return await new Promise((ke,me)=>{let Me=!1,mt=()=>y.current===N.id&&S.current[N.id]?.contentWindow===W&&(b.current[N.id]||0)===z,at=(De,We)=>{if(!Me){Me=!0,clearTimeout(lt);try{te.port1.close()}catch{}De?me(De):ke(We)}},_e=()=>{if(!mt()){at(new Error("The active tab changed while Ask Browser was reading it"));return}at(null,Z())},lt=setTimeout(_e,1500);te.port1.onmessage=De=>{let We=De.data;if(!(!We||We.type!=="pearbrowser:context-response"||We.v!==1||We.requestId!==le)){if(!mt()){at(new Error("The active tab changed while Ask Browser was reading it"));return}at(null,Ls({...We,tabId:N.id,source:"authenticated-page-context"},N,{maxTextBytes:5*1024}))}},te.port1.start?.();try{W.postMessage({type:"pearbrowser:context-request",v:1,requestId:le,contextToken:N.contextToken},se,[te.port2])}catch{_e()}})};(0,d.useEffect)(()=>{a==="placeholder"&&r.length>0&&l(r[0].id)},[a,r]);let B=(N,R)=>i(W=>W.map(z=>z.id===N?{...z,...R}:z)),Y=N=>{y.current=N,l(N);let R=r.find(W=>W.id===N);R&&D(R.displayUrl||"")},A=(N,R)=>{t.CMD_RELEASE_ORIGIN&&(!N||Df(R,N)||e.request(t.CMD_RELEASE_ORIGIN,{keyHex:N}).catch(()=>{}))},[L,ae]=(0,d.useState)(!1),[we,re]=(0,d.useState)(!1);(0,d.useEffect)(()=>{let N=!1;return e.request(t.CMD_USERDATA_GET_SETTINGS).then(R=>{if(N)return;let W=Pt(R)||{};ae(W.historyEnabled===!0),re(W.searchIndexEnabled===!0)}).catch(()=>{}),()=>{N=!0}},[e,t]),(0,d.useEffect)(()=>{H&&D(H.displayUrl||"")},[H?.id,H?.displayUrl]);let G=async(N,R,W={})=>{let z=R||a,Z=(p.current[z]||0)+1;p.current[z]=Z;let se=W.recordHistory!==!1,le=L&&(W.rememberVisit??se),te=null,ke=null,me=String(N??"").trim(),mt=(/^pearname:\/\//i.test(me)?Sf(me):null)||(kf(me)?me:null);if(mt)try{let{resolved:_e}=await e.request(t.CMD_NAME_RESOLVE,{name:mt});if(p.current[z]!==Z)return;if(_e?.legacyMigrationId){B(z,{status:`migration required for ${_e.label||mt} \xB7 ${_e.provenance}\u2026`});try{let lt=await e.request(t.CMD_LEGACY_APP_MIGRATION,{legacyMigrationId:_e.legacyMigrationId},1e4);p.current[z]===Z&&B(z,{status:lt?.message||"A verified native v3 package is required."})}catch(lt){p.current[z]===Z&&B(z,{status:`error: ${lt.message}`})}return}_e&&(_e.link||_e.key)&&(te=_e.link||`hyper://${_e.key}/`,ke={provenance:_e.provenance,label:_e.label||mt,name:mt,source:_e.source||null})}catch{}if(te||(te=lc(N)),!te||p.current[z]!==Z)return;$.current.add(`${z}:${me}`),$.current.add(`${z}:${te}`);let at=ke?ke.label:Gr(te);B(z,{status:`resolving ${at}\u2026`,displayUrl:te,title:at});try{let _e=m.current.find(Vt=>Vt.id===z),lt=Ur(_e),De=await e.request(t.CMD_NAVIGATE,{url:te});if(p.current[z]!==Z)return;let We=De.kind||(Mr(De.url||te)?"clearnet":"hyper"),Ln=De.url||te,ln=Nt({kind:We,src:De.localUrl,url:Ln,displayUrl:Ln}),jr=ln||it(te);if(We==="hyper"&&!ln)throw new Error("This Hyper site has no drive-bound native origin");if(ln){if(!T?.load)throw new Error("Native Hyper tabs are unavailable in this build");_.current[z]={epoch:Z,driveKey:ln,events:[],committed:!1},await T.load({tabId:z,url:De.localUrl,driveKey:ln})}else await T?.close?.({tabId:z});if(p.current[z]!==Z){_.current[z]?.epoch===Z&&delete _.current[z],m.current.some(Vt=>Vt.id===z)||await T?.close?.({tabId:z});return}_.current[z]?.epoch===Z&&(_.current[z].committed=!0),i(Vt=>Vt.map(f=>{if(f.id!==z)return f;let V=Array.isArray(f.history)?f.history:[],J=Number.isInteger(f.histIdx)?f.histIdx:-1;if(se){let ce=Ea(V,J,te);V=ce.history,J=ce.histIdx}else Number.isInteger(W.historyIndex)&&(J=Or(V,W.historyIndex));return{...f,src:De.localUrl,status:"",history:V,histIdx:J,url:Ln,displayUrl:Ln,title:at,nameProv:ke,contextToken:De.contextToken||null,kind:We,clearnetMode:De.mode||null,shieldActive:De.shieldActive!==!1&&We!=="clearnet"?!0:!!De.shieldActive}})),lt&&lt!==jr&&A(lt,r.filter(Vt=>Vt.id!==z)),le&&e.request(t.CMD_USERDATA_ADD_HISTORY,{url:te,title:at}).catch(()=>{})}catch(_e){_.current[z]?.epoch===Z&&delete _.current[z],p.current[z]===Z&&B(z,{status:`error: ${_e.message}`})}},fe=(N,R)=>{try{if(!we)return;let W=N&&(N.url||N.displayUrl)||"";if(!/^hyper:\/\//i.test(W))return;let z=W.replace(/^hyper:\/\//i,""),Z=z.indexOf("/"),se=Z>=0?z.slice(0,Z):z,le=Z>=0?z.slice(Z):"/",te="",ke="";try{let Me=R&&R.contentDocument;Me&&(te=Me.title||"",ke=(Me.body&&Me.body.innerText||"").slice(0,2e5))}catch{}let me=bc(te,W);me&&me!==N.title&&B(N.id,{title:me}),e.request(t.CMD_SEARCH_INDEX,{driveKey:se,path:le,title:te||W,text:ke}).catch(()=>{})}catch{}},_t=async N=>{if(!we||!T?.captureContext)return;let R=m.current.find(z=>z.id===N);if(!R||!Nt(R)||!/^hyper:\/\//i.test(R.url||""))return;let W=R.url;try{let z=await T.captureContext({tabId:N}),Z=m.current.find(Me=>Me.id===N);if(!Z||Z.url!==W||z?.tabId!==N)return;let se=new URL(W),le=it(W);if(!le)return;let te=typeof z?.context?.title=="string"?z.context.title.slice(0,512):"",ke=typeof z?.context?.body=="string"?z.context.body.slice(0,2e5):"",me=bc(te,W);me&&me!==Z.title&&B(N,{title:me}),e.request(t.CMD_SEARCH_INDEX,{driveKey:le,path:`${se.pathname||"/"}${se.search||""}`,title:te||W,text:ke}).catch(()=>{})}catch{}},Us=async()=>{let N=lc(E);if(N)try{await e.request(t.CMD_USERDATA_ADD_BOOKMARK,{url:N,title:N}),B(a,{status:`bookmarked ${N}`}),setTimeout(()=>B(a,{status:""}),1500)}catch(R){B(a,{status:`bookmark failed: ${R.message}`})}},Bs=()=>{let N=H?.history||[];if(!H||H.histIdx<=0)return;let R=H.histIdx-1,W=N[R];G(W,H.id,{recordHistory:!1,rememberVisit:!1,historyIndex:R})},St=()=>{let N=H?.history||[];if(!H||H.histIdx>=N.length-1)return;let R=H.histIdx+1,W=N[R];G(W,H.id,{recordHistory:!1,rememberVisit:!1,historyIndex:R})},Rn=()=>{if(Nt(H)){T?.reload?.({tabId:a}).catch(R=>B(a,{status:`error: ${R.message}`}));return}let N=S.current[a];N&&N.src&&(N.src=N.src)},Ke=(N="")=>{let R=Os(N);i(W=>[...W,R]),l(R.id),D(N||"")},Wr=N=>{N?.preventDefault?.();let R=Lf(x);R&&(q(""),G(R,a,{rememberVisit:!1}))},es=N=>{let R=r.find(te=>te.id===N),W=Is(R);W&&o(te=>[W,...te].slice(0,Sa));let z=r.findIndex(te=>te.id===N);if(z===-1)return;let Z=r.filter(te=>te.id!==N),se=Ur(R),le=!!_.current[N];if(p.current[N]=(p.current[N]||0)+1,delete _.current[N],(Nt(R)||le)&&T?.close?T.close({tabId:N}).then(()=>A(se,Z)).catch(()=>{}):(T?.close?.({tabId:N}).catch(()=>{}),A(se,Z)),delete S.current[N],delete b.current[N],Z.length===0){let te=Os("");i([te]),l(te.id),D("");return}if(i(Z),N===a){let te=Z[Math.min(z,Z.length-1)];l(te.id),D(te.displayUrl||"")}},In=()=>{let N=u[0];if(!N)return;let R=pc(N);R&&(o(W=>W.slice(1)),i(W=>fc([...W,R])),l(R.id),D(R.displayUrl||""))},Gt=N=>{i(R=>fc(R.map(W=>W.id===N?{...W,pinned:!W.pinned}:W)))},Ks=()=>{try{if(Nt(H)){T?.openDevTools?.({tabId:a}).catch(W=>B(a,{status:`error: ${W.message}`}));return}if(!S.current[a]?.contentWindow)return;if(globalThis.pearbrowserRuntime?.openDevTools){globalThis.pearbrowserRuntime.openDevTools();return}console.log("[devtools] native host does not expose openDevTools"),B(a,{status:"devtools are unavailable in this native build"}),setTimeout(()=>B(a,{status:""}),3e3)}catch(N){console.error("[devtools] failed:",N)}};(0,d.useEffect)(()=>{let N=R=>{if(R.metaKey||R.ctrlKey){if(R.key==="t"||R.key==="T")R.preventDefault(),R.shiftKey?In():Ke();else if(R.key==="w"||R.key==="W")R.preventDefault(),es(a);else if(R.key==="l"||R.key==="L")R.preventDefault(),w.current?.focus(),w.current?.select?.();else if(R.key==="r"||R.key==="R")R.preventDefault(),Rn();else if((R.key==="i"||R.key==="I")&&(R.shiftKey||R.altKey))R.preventDefault(),Ks();else if(R.key>="1"&&R.key<="9"){let z=parseInt(R.key,10)-1;r[z]&&(R.preventDefault(),Y(r[z].id))}}};return document.addEventListener("keydown",N),()=>document.removeEventListener("keydown",N)},[a,r,u]),k.current=N=>{if(!N||typeof N.tabId!="string")return;let R=_.current[N.tabId];if(R){["navigation","title","load","error"].includes(N.type)&&R.events.length<8&&(N.type!=="navigation"||it(N.url)===R.driveKey)&&R.events.push(N);return}let W=m.current.find(z=>z.id===N.tabId);if(!(!W||!Nt(W))){if(N.type==="navigation"){let z=typeof N.url=="string"?N.url.trim():"";if(!/^hyper:\/\//i.test(z)||it(z)!==Nt(W)||Hf(z,W.url))return;i(Z=>Z.map(se=>{if(se.id!==N.tabId||Hf(se.url,z))return se;let le=Ea(se.history,se.histIdx,z);return{...se,url:z,displayUrl:z,history:le.history,histIdx:le.histIdx,nameProv:null,status:""}})),N.tabId===y.current&&D(z),L&&e.request(t.CMD_USERDATA_ADD_HISTORY,{url:z,title:Gr(z)}).catch(()=>{});return}if(N.type==="title"){let z=typeof N.title=="string"?N.title.slice(0,512):"";z&&B(N.tabId,{title:bc(z,W.url)});return}if(N.type==="open-url"){let z=typeof N.url=="string"?N.url.trim():"";if(!(/^hyper:\/\//i.test(z)&&it(z))&&!Mr(z))return;if(N.openInNewTab){let Z=Os(z);y.current=Z.id,i(se=>[...se,Z]),l(Z.id),D(z),G(z,Z.id)}else y.current=W.id,l(W.id),D(z),G(z,W.id);return}if(N.type==="shortcut"){if(N.tabId!==y.current)return;switch(N.command){case"new-tab":Ke();break;case"reopen-tab":In();break;case"close-tab":es(N.tabId);break;case"focus-address":w.current?.focus(),w.current?.select?.();break;case"reload":Rn();break;case"devtools":Ks();break;case"switch-tab":{let z=Number(N.index)-1,Z=m.current[z];Number.isInteger(z)&&Z&&Y(Z.id);break}}return}N.type==="load"?(B(N.tabId,{status:""}),_t(N.tabId)):N.type==="error"&&B(N.tabId,{status:`error: ${String(N.reason||"Page failed to load").slice(0,160)}`})}},(0,d.useEffect)(()=>{if(T?.onTabEvent)return T.onTabEvent(N=>k.current?.(N))},[T]),(0,d.useEffect)(()=>{for(let[N,R]of Object.entries(_.current)){let W=r.find(z=>z.id===N);if(!(!R.committed||Nt(W)!==R.driveKey)){delete _.current[N];for(let z of R.events)k.current?.(z)}}},[r]),(0,d.useEffect)(()=>{if(!T?.select||!T?.hide)return;let N=C.current;if(!N)return;let R=()=>{let Z=m.current.find(te=>te.id===y.current);if(!Z||!Nt(Z)||v||j||X||U){T.hide().catch(()=>{});return}let se=N.getBoundingClientRect(),le={x:Math.round(se.left),y:Math.round(se.top),width:Math.round(se.width),height:Math.round(se.height)};if(le.width<=0||le.height<=0){T.hide().catch(()=>{});return}T.select({tabId:Z.id,bounds:le}).catch(te=>{B(Z.id,{status:`error: ${te.message}`})})},W=typeof ResizeObserver=="function"?new ResizeObserver(R):null;W?.observe(N),window.addEventListener("resize",R),window.addEventListener("scroll",R,!0);let z=requestAnimationFrame(R);return()=>{cancelAnimationFrame(z),W?.disconnect(),window.removeEventListener("resize",R),window.removeEventListener("scroll",R,!0)}},[T,a,H?.src,H?.url,j,X,U,v]),(0,d.useEffect)(()=>()=>{T?.hide?.().catch(()=>{})},[T]),(0,d.useEffect)(()=>{let N=R=>{let W=R.data;if(!W)return;let z=r.find(se=>S.current[se.id]?.contentWindow===R.source);if(!z)return;if(W.type==="pearbrowser:clearnet-direct-fallback"){if(z.kind!=="clearnet"||z.clearnetMode!=="proxy")return;let se;try{let le=new URL(z.url||z.displayUrl),te=new URL(typeof W.url=="string"?W.url.trim():""),ke=le.hostname===te.hostname||le.hostname.endsWith(`.${te.hostname}`)||te.hostname.endsWith(`.${le.hostname}`);if(!/^https?:$/.test(te.protocol)||!ke)return;se=te.toString()}catch{return}i(le=>le.map(te=>te.id===z.id?{...te,src:se,url:se,displayUrl:se,contextToken:null,clearnetMode:"direct",shieldActive:!1,status:"Publisher blocked the privacy proxy \u2014 loaded direct; Content Shield is unavailable for this tab."}:te)),z.id===y.current&&D(se);return}if(W.type!=="pearbrowser:navigate")return;let Z=typeof W.url=="string"?W.url.trim():"";if(/^hyper:\/\//i.test(Z)){if(W.openInNewTab){let se=Os(Z);i(le=>[...le,se]),l(se.id),D(Z),G(Z,se.id);return}l(z.id),D(Z),G(Z,z.id)}};return window.addEventListener("message",N),()=>window.removeEventListener("message",N)},[r]),(0,d.useEffect)(()=>{if(h)for(let N of r){if(!N||N.src||!N.url)continue;let R=`${N.id}:${N.url}`;if($.current.has(R))continue;$.current.add(R);let W=Array.isArray(N.history)&&N.history.length>0;G(N.url,N.id,{recordHistory:!W,rememberVisit:!W,historyIndex:N.histIdx})}},[h,H?.id,r]),(0,d.useEffect)(()=>{if(n){if(H&&(H.src||H.url)){let N=Os(n);i(R=>[...R,N]),l(N.id),D(n),G(n,N.id)}else G(n,H?.id);s?.()}},[n]);let Mt=(0,d.useMemo)(()=>{let N=(E||"").trim().toLowerCase();if(!N)return O.slice(0,8);let R=new Set,W=[],z=se=>{let le=(se.url||"").toLowerCase(),te=(se.title||"").toLowerCase();return le.startsWith(N)?0:te.startsWith(N)?1:le.includes(N)?2:te.includes(N)?3:99},Z=O.map(se=>({e:se,s:z(se)})).filter(({s:se})=>se<99).sort((se,le)=>se.s-le.s||(se.e.kind==="bookmark"?-1:1));for(let{e:se}of Z)if(!R.has(se.url)&&(R.add(se.url),W.push(se),W.length>=8))break;return W},[E,O]),ts=async()=>{if(!(Date.now()-I.current<3e4&&O.length>0))try{let[N,R]=await Promise.all([e.request(t.CMD_USERDATA_LIST_BOOKMARKS).catch(()=>({})),e.request(t.CMD_USERDATA_LIST_HISTORY,{limit:100}).catch(()=>({}))]),W=(N&&N.bookmarks||[]).map(Z=>({kind:"bookmark",url:Z.url,title:Z.title||Z.url})),z=(R&&R.history||[]).map(Z=>({kind:"history",url:Z.url,title:Z.title||Z.url}));ne([...W,...z]),I.current=Date.now()}catch{}},Oa=N=>{if(U&&Mt.length>0){if(N.key==="ArrowDown"){N.preventDefault(),P(R=>(R+1)%Mt.length);return}if(N.key==="ArrowUp"){N.preventDefault(),P(R=>R<=0?Mt.length-1:R-1);return}if(N.key==="Escape"){ie(!1),P(-1);return}if(N.key==="Enter"&&de>=0&&Mt[de]){N.preventDefault();let R=Mt[de];D(R.url),ie(!1),P(-1),G(R.url);return}}N.key==="Enter"&&G(E)};return c`
    <div className="browse">
      <div className="tabstrip">
        ${r.map((N,R)=>c`
          <button
            key=${N.id}
            className=${"tabchip"+(N.id===a?" active":"")+(N.pinned?" pinned":"")}
            onClick=${()=>Y(N.id)}
            title=${vh(N)}
          >
            <span
              className=${"tabchip-pin"+(N.pinned?" on":"")}
              title=${N.pinned?"Unpin tab":"Pin tab"}
              onClick=${W=>{W.stopPropagation(),Gt(N.id)}}
            >${N.pinned?"\u25CF":"\u25CB"}</span>
            <span className="tabchip-title">${em(N)}</span>
            <span className="tabchip-close" onClick=${W=>{W.stopPropagation(),es(N.id)}}>×</span>
          </button>
        `)}
        <button className="tabchip-new" onClick=${()=>Ke()} title="New tab (⌘T)">+</button>
        <button className="tabchip-new tabchip-restore" onClick=${In} disabled=${u.length===0} title="Reopen closed tab (⌘⇧T)">↺</button>
      </div>
      <div className="urlbar">
        <button className="nav" onClick=${Bs} disabled=${!H||H.histIdx<=0} title="Back">◀</button>
        <button className="nav" onClick=${St} disabled=${!H||H.histIdx>=(H.history||[]).length-1} title="Forward">▶</button>
        <button className="nav" onClick=${Rn} disabled=${!H?.src} title="Reload (⌘R)">⟳</button>
        <input
          ref=${w}
          type="text"
          value=${E}
          onInput=${N=>{D(N.target.value),ie(!0),P(-1)}}
          onFocus=${()=>{ts(),ie(!0),P(-1)}}
          onBlur=${()=>{setTimeout(()=>ie(!1),120)}}
          onKeyDown=${Oa}
          placeholder="hyper://… or https://… or example.com"
          spellCheck="false"
        />
        <button className="nav" onClick=${Us} disabled=${!E?.trim?.()} title="Bookmark this URL">☆</button>
        <button className="nav" onClick=${()=>Q(!0)} disabled=${!H?.url} title="About this site">ⓘ</button>
        <${ng} rpc=${e} C=${t} activeUrl=${H?.url||E||""} onOpenSettings=${g} />
        <button className=${`nav ask-browser-toggle${j?" active":""}`} data-testid="ask-browser-toggle"
          aria-expanded=${j} aria-controls="ask-browser-panel"
          onClick=${()=>K(N=>!N)} disabled=${!H?.url} title="Ask Browser about this page">✦ Ask</button>
        <button className="nav" onClick=${Ks} disabled=${!H?.src} title="Devtools (⌘⇧I)">⚙</button>
        <button className="nav go" onClick=${()=>G(E)}>Go</button>
        ${U&&Mt.length>0&&c`
          <div className="urlbar-suggestions">
            ${Mt.map((N,R)=>c`
              <div
                key=${N.url}
                className=${"urlbar-suggestion"+(R===de?" active":"")}
                onMouseDown=${W=>{W.preventDefault(),D(N.url),ie(!1),P(-1),G(N.url)}}
                onMouseEnter=${()=>P(R)}
              >
                <span className="urlbar-suggestion-icon">${N.kind==="bookmark"?"\u2605":"\u{1F558}"}</span>
                <div className="urlbar-suggestion-text">
                  ${N.title&&N.title!==N.url?c`<div className="urlbar-suggestion-title">${N.title}</div>`:null}
                  <div className="urlbar-suggestion-url">${N.url}</div>
                </div>
              </div>
            `)}
          </div>
        `}
      </div>
      ${H?.status&&c`<div className="browse-status">${H.status}</div>`}
      ${H?.nameProv&&c`
        <div className=${`name-prov-chip name-prov-${H.nameProv.provenance}`}
             title=${`\u201C${H.nameProv.name}\u201D resolved to ${H.displayUrl}`}>
          <span className="name-prov-name">${H.nameProv.label}</span>
          <span className="name-prov-tier">${H.nameProv.provenance==="petname"?"your saved name":H.nameProv.provenance==="registry"?"name registry":H.nameProv.provenance==="contact"?`from ${H.nameProv.source||"a contact"}`:"curated"}</span>
        </div>
      `}
      <div className="browse-workspace">
        <div className="browse-stage" ref=${C}>
          ${r.map(N=>N.src?Nt(N)?c`<div key=${N.id} className=${"webview"+(N.id===a?"":" hidden")} data-testid="hyper-native-view" aria-label=${N.title||"Hyper page"}></div>`:N.kind==="hyper"?c`<div key=${N.id} className=${"webview"+(N.id===a?"":" hidden")} data-testid="hyper-native-unavailable" role="alert">This Hyper page needs a drive-bound native view. Reload it after the proxy is ready.</div>`:N.kind==="clearnet"&&N.clearnetMode==="direct"?typeof window<"u"&&window.customElements?.get?.("webview")?c`<webview
                      key=${N.id}
                      ref=${R=>{R&&(S.current[N.id]=R)}}
                      className=${"webview"+(N.id===a?"":" hidden")}
                      src=${N.src}
                      partition=${"persist:clearnet-"+(()=>{try{return new URL(N.url||N.src).hostname}catch{return"site"}})()}
                      allowpopups=${!0}
                      data-testid="clearnet-webview"
                    ></webview>`:c`<iframe
                      key=${N.id}
                      ref=${R=>{R&&(S.current[N.id]=R)}}
                      className=${"webview"+(N.id===a?"":" hidden")}
                      src=${N.src}
                      data-testid="clearnet-iframe-direct"
                      onLoad=${R=>{b.current[N.id]=(b.current[N.id]||0)+1}}
                      sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-pointer-lock"
                    ></iframe>`:c`<iframe
                  key=${N.id}
                  ref=${R=>{R&&(S.current[N.id]=R)}}
                  className=${"webview"+(N.id===a?"":" hidden")}
                  src=${N.src}
                  data-testid=${N.kind==="clearnet"?"clearnet-iframe-proxy":"hyper-iframe"}
                  onLoad=${R=>{b.current[N.id]=(b.current[N.id]||0)+1,fe(N,R.target)}}
                  sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-pointer-lock"
                ></iframe>`:N.id===a?N.url?c`<div key=${N.id} className="browse-welcome">
                      <div className="browse-welcome-inner">
                        <div className="browse-welcome-logo">🍐</div>
                        ${N.status&&/^error/i.test(N.status)?c`<div className="browse-welcome-copy">
                              <h2>Couldn't load this page</h2>
                              <p>${String(N.status).replace(/^error:\s*/i,"")}</p>
                            </div>`:c`<div className="browse-welcome-copy">
                              <h2>Loading…</h2>
                              <p>Fetching <code>${N.url}</code> ${N.kind==="clearnet"?"over the clearnet proxy \u2014 shields and the privacy ladder apply.":"directly from its peers \u2014 first load of a cold drive can take a moment."}</p>
                            </div>`}
                        <div className="browse-welcome-actions">
                          <button className="btn primary" onClick=${()=>G(N.url,N.id)}>${N.status&&/^error/i.test(N.status)?"Retry":"Reload"}</button>
                          <button className="btn subtle" onClick=${()=>{w.current?.focus(),w.current?.select?.()}}>Edit URL</button>
                        </div>
                      </div>
                    </div>`:c`<div key=${N.id} className="browse-welcome">
                      <div className="browse-welcome-inner start-page">
                        <div className="browse-welcome-logo">🍐</div>
                        <h2>Search without a profile</h2>
                        <p className="start-page-lede">PearBrowser sends no search analytics and never adds a query to its optional persistent visit history.</p>
                        <section className="private-search-card" aria-labelledby="private-search-title">
                          <div className="private-search-heading">
                            <span id="private-search-title">Private web search</span>
                            <span className="private-search-provider">${Da.name}</span>
                          </div>
                          <form className="private-search-form" data-testid="private-search-form" onSubmit=${Wr}>
                            <input
                              type="search"
                              value=${x}
                              data-testid="private-search-input"
                              aria-label="Search the web privately"
                              placeholder="Search the web"
                              autoComplete="off"
                              autoFocus
                              spellCheck="false"
                              onInput=${R=>q(R.target.value)}
                            />
                            <button type="submit" className="private-search-submit" data-testid="private-search-submit" disabled=${!x.trim()}>Search</button>
                          </form>
                          <div className="private-search-disclosure">
                            Content Shield stays on. ${Da.name} receives your query and network address to return results; its published policy says it does not save or share search history. Private search is not anonymity.
                          </div>
                        </section>
                        <div className="start-page-p2p">Or paste a <code>hyper://</code> address above to fetch a site directly from its peers — no DNS, server, or CDN.</div>
                        <div className="browse-welcome-actions">
                          <button className="btn primary" onClick=${()=>G(Qf)}>Open the PearBrowser site</button>
                          <button className="btn subtle" onClick=${()=>{w.current?.focus(),w.current?.select?.()}}>Focus the URL bar</button>
                        </div>
                        <div className="browse-welcome-tip">Tip: <code>⌘T</code> opens a new tab, <code>⌘⇧T</code> reopens one, <code>⌘W</code> closes one, <code>⌘L</code> jumps to the URL bar, <code>⌘1</code>–<code>⌘9</code> switches between tabs.</div>
                        <${kh} rpc=${e} C=${t} />
                      </div>
                      </div>`:null)}
        </div>
        ${j&&c`<${bh}
          rpc=${e}
          C=${t}
          activeTab=${H}
          captureContext=${M}
          onClose=${()=>K(!1)}
        />`}
      </div>
      ${X&&c`<${$h}
        rpc=${e}
        C=${t}
        url=${H?.url||""}
        onClose=${()=>Q(!1)}
      />`}
    </div>
  `}var tm={"profile:name":{label:"Display name",detail:"Your chosen public name"},"profile:avatar":{label:"Avatar",detail:"Your profile picture URL"},"profile:email":{label:"Email",detail:"Email you put in your profile"},"profile:website":{label:"Website",detail:"Personal site URL on your profile"},"profile:read":{label:"Full profile",detail:"All filled profile fields"},"profile:contact":{label:"Contact profile",detail:"Email and website fields"},"contacts:read":{label:"Contacts",detail:"Your saved contacts list"}};function Sh({rpc:e,C:t,request:n,identity:s,onClose:r}){let i=new Set(n.scopes||[]),[a,l]=(0,d.useState)(i),[u,o]=(0,d.useState)(null),[h,g]=(0,d.useState)(""),v=C=>{l(y=>{let m=new Set(y);return m.has(C)?m.delete(C):m.add(C),m})},w=async C=>{g(""),o(C?"approve":"deny");try{let y=C?Array.from(a):[];await e.request(t.CMD_LOGIN_RESOLVE,{requestId:n.requestId,approved:C,scopes:y}),r()}catch(y){g(`could not resolve: ${y.message}`),o(null)}},S=n.appName||"A Pear app",b=$e(n.driveKey);return c`
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick=${C=>C.target.classList.contains("modal-overlay")&&w(!1)}>
      <div className="modal-card login-consent">
        <div className="login-header">
          <div className="login-app-icon">🍐</div>
          <div className="login-header-text">
            <div className="login-app-name">${S}</div>
            <div className="login-app-sub">wants to sign you in</div>
            <div className="login-app-key" title=${n.driveKey}>${b}</div>
          </div>
        </div>

        ${n.reason&&c`<div className="login-reason">"${n.reason}"</div>`}

        <div className="login-section-label">SIGNING IN AS</div>
        <div className="login-identity">
          <div className="login-identity-avatar">🍐</div>
          <div className="login-identity-meta">
            <div className="login-identity-label">You</div>
            <code className="login-identity-key">${$e(s?.publicKey||"")}</code>
          </div>
        </div>

        <div className="login-section-label">${S} WILL SEE</div>
        <div className="login-scopes">
          ${(n.scopes||[]).length===0?c`<div className="login-scope-empty">Nothing — sign-in only confirms it's you.</div>`:(n.scopes||[]).map(C=>{let y=tm[C]||{label:C,detail:""},m=a.has(C);return c`
                  <label className=${"login-scope"+(m?" on":"")} key=${C}>
                    <input type="checkbox" checked=${m} onChange=${()=>v(C)} />
                    <div className="login-scope-meta">
                      <div className="login-scope-label">${y.label}</div>
                      <div className="login-scope-detail">${y.detail||C}</div>
                    </div>
                  </label>
                `})}
        </div>

        ${n.currentGrant&&c`
          <div className="login-existing">
            You previously granted this app on
            ${" "+new Date(n.currentGrant.grantedAt).toLocaleDateString()}.
          </div>
        `}

        ${h&&c`<div className="apps-error">${h}</div>`}

        <div className="login-actions">
          <button className="btn subtle" onClick=${()=>w(!1)} disabled=${u!==null}>
            ${u==="deny"?"Cancelling\u2026":"Cancel"}
          </button>
          <button className="btn primary" onClick=${()=>w(!0)} disabled=${u!==null}>
            ${u==="approve"?"Signing in\u2026":"Sign in"}
          </button>
        </div>
      </div>
    </div>
  `}function Eh({rpc:e,C:t,request:n,identity:s,onClose:r}){let[i,a]=(0,d.useState)(null),[l,u]=(0,d.useState)(""),o=async w=>{u(""),a(w?"approve":"deny");try{await e.request(t.CMD_SWARM_RESOLVE,{requestId:n.requestId,approved:w}),r()}catch(S){u(`could not resolve: ${S.message}`),a(null)}},h=n.appName||"A Pear app",g=$e(n.driveKey),v=$e(n.topicHex);return c`
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick=${w=>w.target.classList.contains("modal-overlay")&&o(!1)}>
      <div className="modal-card login-consent">
        <div className="login-header">
          <div className="login-app-icon" style=${{background:"linear-gradient(135deg, #58a6ff, #a371f7)"}}>📡</div>
          <div className="login-header-text">
            <div className="login-app-name">${h}</div>
            <div className="login-app-sub">wants to connect to peers on a swarm topic</div>
            <div className="login-app-key" title=${n.driveKey}>${g}</div>
          </div>
        </div>

        ${n.reason&&c`<div className="login-reason">"${n.reason}"</div>`}

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

        ${l&&c`<div className="apps-error">${l}</div>`}

        <div className="login-actions">
          <button className="btn subtle" onClick=${()=>o(!1)} disabled=${i!==null}>
            ${i==="deny"?"Cancelling\u2026":"Cancel"}
          </button>
          <button className="btn primary" onClick=${()=>o(!0)} disabled=${i!==null}>
            ${i==="approve"?"Connecting\u2026":"Approve & Connect"}
          </button>
        </div>
      </div>
    </div>
  `}function Ch(e){if(typeof e!="string"||!/^[0-9]+$/.test(e))return String(e??"");let t=e.padStart(7,"0");return`${t.slice(0,-6).replace(/^0+(?=\d)/,"")}.${t.slice(-6)}`}function Th({rpc:e,C:t,request:n,onClose:s}){let[r,i]=(0,d.useState)(null),[a,l]=(0,d.useState)(""),[u,o]=(0,d.useState)(Date.now()),[h,g]=(0,d.useState)(!1);(0,d.useEffect)(()=>{let T=setInterval(()=>o(Date.now()),1e3);return()=>clearInterval(T)},[]);let v=Math.max(0,Math.ceil(((n.expiresAt||0)-u)/1e3)),w=async T=>{l(""),i(T?"approve":"deny");try{let $=n.type==="connect"?t.CMD_WALLET_CONNECT_RESOLVE:t.CMD_WALLET_PAYMENT_RESOLVE;await e.request($,{intentId:n.intentId,approved:T}),s()}catch($){l(Lt($)),i(null)}},S=()=>{if(n.recipient)try{navigator.clipboard.writeText(n.recipient),g(!0),setTimeout(()=>g(!1),1500)}catch{}},b=n.appName||"A Pear app",C=$e(n.driveKey||""),y=$e(n.manifestSha256||""),m={connect:"wants to connect to your wallet",payment:"requests a test payment","sign-app":"wants an app-payload attestation"},p={connect:["Connecting\u2026","Approve & Connect"],payment:["Paying\u2026","Approve & Pay"],"sign-app":["Signing\u2026","Approve & Sign"]},[_,k]=p[n.type]||["Working\u2026","Approve"];return c`
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card login-consent">
        <div className="login-header">
          <div className="login-app-icon" style=${{background:"linear-gradient(135deg, #f7b731, #e25822)"}}>👛</div>
          <div className="login-header-text">
            <div className="login-app-name">${b}</div>
            <div className="login-app-sub">${m[n.type]||"requests wallet approval"}</div>
            <div className="login-app-key" title=${n.driveKey||""}>${C}</div>
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

        ${n.type==="payment"&&c`
          <div className="login-section-label">PAYMENT · STABLE TESTNET · TEST USD₮0</div>
          <div className="login-scopes">
            <div className="login-scope on">
              <div className="login-scope-meta">
                <div className="login-scope-label">${Ch(n.amountAtomic)} USD₮0</div>
                <div className="login-scope-detail">${n.amountAtomic} atomic</div>
              </div>
            </div>
            <div className="login-scope on">
              <div className="login-scope-meta">
                <div className="login-scope-label">Recipient</div>
                <div className="login-scope-detail" style=${{wordBreak:"break-all"}}>${n.recipient}</div>
              </div>
              <button className="btn small subtle" onClick=${S} data-testid="wallet-consent-copy-recipient">
                ${h?"Copied":"Copy"}
              </button>
            </div>
            ${n.estimatedFeeAtomic&&c`
              <div className="login-scope on">
                <div className="login-scope-meta">
                  <div className="login-scope-label">Network fee — est. ${Xn(n.estimatedFeeAtomic,18)} USDT0</div>
                  <div className="login-scope-detail">never more than ${Xn(n.maxFeeAtomic,18)} USDT0 (test gas)</div>
                </div>
              </div>
              <div className="login-scope on">
                <div className="login-scope-meta">
                  <div className="login-scope-label">Total debit (max) ${Xn(n.maxTotalDebitAtomic,18)} USD₮0</div>
                  <div className="login-scope-detail">payment amount + maximum network fee</div>
                </div>
              </div>
            `}
          </div>
          ${!n.estimatedFeeAtomic&&c`
            <div className="login-existing">The network fee could not be estimated (the testnet may be unreachable). The enforced fee ceiling still applies after approval.</div>
          `}
          ${n.reference&&c`<div className="login-reason">"${n.reference}"</div>`}
        `}

        ${n.type==="sign-app"&&c`
          <div className="login-section-label">APP PAYLOAD</div>
          <div className="login-identity">
            <div className="login-identity-avatar">✍️</div>
            <div className="login-identity-meta">
              <div className="login-identity-label">payload hash</div>
              <code className="login-identity-key" title=${n.payloadHash||""}>${$e(n.payloadHash||"")}</code>
            </div>
          </div>
          <div className="login-existing">
            This attests the app payload with your wallet identity. <strong>No funds move.</strong>
          </div>
        `}

        ${n.type==="connect"&&c`
          <div className="login-existing">
            Connects this app to your wallet on <strong>Stable Testnet</strong> (test USD₮0).
            Every payment will still require a fresh approval. Connecting does not reveal
            your address or balance.
          </div>
          <div className="login-existing">
            This app will be able to: see its connection status
            ${n.permissions?.pay?c` · <strong>request payments</strong> (each one still needs your approval)`:""}
            ${n.permissions?.signApp?c` · <strong>request app-payload signatures</strong>`:""}
            ${!n.permissions?.pay&&!n.permissions?.signApp?" \u2014 nothing else":""}
          </div>
        `}

        ${n.expiresAt?c`<div className="login-existing">Prompt expires in ${v}s.</div>`:c`<div className="login-existing">This prompt stays open until you decide.</div>`}

        ${a&&c`<div className="apps-error">${a}</div>`}

        <div className="login-actions">
          <button className="btn subtle" onClick=${()=>w(!1)} disabled=${r!==null}>
            ${r==="deny"?"Rejecting\u2026":"Reject"}
          </button>
          <button className="btn primary" onClick=${()=>w(!0)} disabled=${r!==null}>
            ${r==="approve"?_:k}
          </button>
        </div>
      </div>
    </div>
  `}var Ah=[{id:"home",title:"PearBrowser homepage",subtitle:"The landing page \u2014 what this app is, who built it",url:"hyper://2d6c2be92f07e10ed5a4b07b5c1286a56f0c1220c79ad3c3293b069f8c946763/",initial:"\u{1F350}",gradient:"linear-gradient(135deg, #7ee787, #58a6ff)"},{id:"hiveworm",title:"HiveWorm",subtitle:"Legacy native app \u2014 a verified v3 package is required",legacyMigrationId:"d1xbkcpcbi1xa8dexp49rsendra5r67w3qh5a9k8t44oemm4k16y",initial:"\u{1F41B}",gradient:"linear-gradient(135deg, #a371f7, #d946ef)"},{id:"hiverelay",title:"HiveRelay",subtitle:"The relay backbone keeping it all online",url:"hyper://ea607230f7b9a5f854c664901b2c34faf1c6f5b7cee6fc3bca02ac682fd02754/",initial:"\u{1F7E2}",gradient:"linear-gradient(135deg, #00ff41, #3eaf55)"},{id:"p2pbuilders",title:"P2P Builders",subtitle:"Permissionless P2P hacker news",url:Jf,initial:"\u{1F527}",gradient:"linear-gradient(135deg, #ff6600, #fbbf24)"}];function xh({rpc:e,C:t,onPickSite:n,onClose:s}){let[r,i]=(0,d.useState)(0),a=async l=>{if(e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{onboardingDone:!0,onboardingDoneAt:Date.now()}}).catch(()=>{}),l?.legacyMigrationId)try{await e.request(t.CMD_LEGACY_APP_MIGRATION,{legacyMigrationId:l.legacyMigrationId},1e4)}catch{}else l?.url&&n(l.url);s()};return c`
    <div className="modal-overlay onboarding-overlay" role="dialog" aria-modal="true">
      <div className="modal-card onboarding-card">
        ${r===0&&c`
          <div className="onb-slide onb-slide-welcome">
            <div className="onb-hero">
              <${Pr} size=${72} />
            </div>
            <h1 className="onb-title">Welcome to <strong>PearBrowser</strong></h1>
            <p className="onb-subtitle">The web that doesn't go down.</p>
            <p className="onb-blurb">
              A peer-to-peer browser, app store, and site publisher. Pages
              live as Hyperdrives, identified by 32-byte keys, replicated
              by their readers. No DNS. No servers. No accounts.
            </p>
            <div className="onb-actions">
              <button className="btn primary" onClick=${()=>i(1)}>Get started →</button>
            </div>
          </div>
        `}
        ${r===1&&c`
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
              <button className="btn subtle" onClick=${()=>i(0)}>← Back</button>
              <button className="btn primary" onClick=${()=>i(2)}>Continue →</button>
            </div>
          </div>
        `}
        ${r===2&&c`
          <div className="onb-slide">
            <h2 className="onb-stepname">Try a site</h2>
            <p className="onb-blurb">Pick one to start with — you can always come back here.</p>
            <div className="onb-sites">
              ${Ah.map(l=>c`
                <button
                  className="onb-site-card"
                  key=${l.id}
                  onClick=${()=>a(l)}
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
              <button className="btn subtle" onClick=${()=>i(1)}>← Back</button>
              <button className="onb-skip" onClick=${()=>a(null)}>Skip — I'll explore</button>
            </div>
          </div>
        `}
        <div className="onb-dots">
          ${[0,1,2].map(l=>c`
            <span className=${"onb-dot"+(l===r?" on":"")} key=${l}></span>
          `)}
        </div>
      </div>
    </div>
  `}function Vr(e){return typeof e!="string"?null:/^data:image\//i.test(e)||/^https?:\/\//i.test(e)?e:null}function Fr({rpc:e,C:t,driveKey:n,iconRef:s,iconData:r,name:i}){let[a,l]=(0,d.useState)(Vr(r));return(0,d.useEffect)(()=>{if(a||!n||!/^[0-9a-f]{64}$/i.test(n)||!(t&&t.CMD_GET_APP_ICON))return;let u=!0;return e.request(t.CMD_GET_APP_ICON,{driveKey:n,iconRef:s}).then(o=>{let h=Vr(o&&o.iconData);u&&h&&l(h)}).catch(()=>{}),()=>{u=!1}},[n,s]),a?c`<img src=${a} alt="" className="app-icon" />`:c`<div className="app-icon app-icon-fallback">${(i||"?").charAt(0)}</div>`}function La(e){return Array.isArray(e.categories)?e.categories.map(t=>String(t)).filter(Boolean):e.category?[String(e.category)]:[]}function Dh(e){return!e||typeof e!="object"?"":[e.name,e.description,e.author,e.id,e.version,e.source,e.catalogName,e.verification,e.link,e.driveKey,...La(e),...Array.isArray(e._sources)?e._sources:[]].filter(t=>t!=null&&t!=="").map(t=>String(t).normalize("NFKC").toLowerCase()).join(" ")}function Pt(e){return e&&typeof e.settings=="object"&&e.settings!==null?e.settings:e||{}}function Rh({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[r,i]=(0,d.useState)(null),[a,l]=(0,d.useState)(null),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)(""),[v,w]=(0,d.useState)(""),[S,b]=(0,d.useState)(""),[C,y]=(0,d.useState)(""),[m,p]=(0,d.useState)(""),[_,k]=(0,d.useState)(""),[T,$]=(0,d.useState)("");(0,d.useEffect)(()=>{e.request(t.CMD_USERDATA_GET_SETTINGS).then(O=>{let ne=Pt(O);s(!!ne?.experimentalAutobeeCatalogs);let U=typeof ne?.autobeeOwnedKey=="string"?ne.autobeeOwnedKey:null;ne?.experimentalAutobeeCatalogs&&U&&e.request(t.CMD_AUTOBEE_GET,{keyHex:U}).then(i).catch(()=>{})}).catch(()=>s(!1))},[]);let E=O=>e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{autobeeOwnedKey:O}}).catch(()=>{}),D=O=>{g(O),setTimeout(()=>g(""),1800)},x=(O,ne)=>{try{navigator.clipboard.writeText(O),$(ne),setTimeout(()=>$(""),1500)}catch{}},q=async()=>{o(""),l("create");try{let O=await e.request(t.CMD_AUTOBEE_CREATE,{name:v||"Collaborative Catalog"},6e4);i(O),w(""),E(O.keyHex),D("Catalog created.")}catch(O){o(O.message)}finally{l(null)}},X=async()=>{let O=qt(S);if(O){o(""),l("open");try{let ne=await e.request(t.CMD_AUTOBEE_GET,{keyHex:O.key},6e4);i(ne),b(""),E(ne.keyHex),D(ne.writable?"Opened \u2014 you are a writer.":"Opened read-only \u2014 share your writer key to be invited.")}catch(ne){o(ne.message)}finally{l(null)}}},Q=async()=>{let O=(qt(C)?.key||C).trim();o(""),l("invite");try{await e.request(t.CMD_AUTOBEE_ADD_WRITER,{keyHex:r.keyHex,writerKey:O},6e4),y(""),D("Writer added \u2014 they can edit once they sync.")}catch(ne){o(ne.message)}finally{l(null)}},j=async()=>{let O=m.trim();if(!O)return;if(/^(?:pear|file):\/\//i.test(O)){o("Remote executable app links are not accepted. Add browsable hyper:// content only.");return}let ne={driveKey:it(O),name:_||O};if(!ne.driveKey){o("Enter a valid hyper:// drive key.");return}o(""),l("addapp");try{let U=await e.request(t.CMD_AUTOBEE_ADD_APP,{keyHex:r.keyHex,app:ne},6e4);i(U),p(""),k(""),D("App added.")}catch(U){o(U.message)}finally{l(null)}},K=async O=>{o(""),l("rm:"+O);try{let ne=await e.request(t.CMD_AUTOBEE_REMOVE_APP,{keyHex:r.keyHex,id:O},6e4);i(ne)}catch(ne){o(ne.message)}finally{l(null)}};return n?c`
    <div className="collab-catalog">
      <h2>Collaborative catalog <span className="settings-subtle">(experimental)</span></h2>
      <p className="subtitle">An app catalog several people can co-edit, synced peer-to-peer. This existing catalog format uses Autobase and Hyperbee; new Autobee 2 catalogs are not compatible. Not pinned on relays yet — reachable only while a writer is online.</p>
      <div className="settings-card">
        ${u&&c`<div className="apps-error">${u}</div>`}
        ${h&&c`<div className="apps-ok">${h}</div>`}

        ${!r&&c`
          <div className="collab-empty">
            <div className="settings-row">
              <div className="profile-field">
                <div className="settings-label">Create a new collaborative catalog</div>
                <input className="profile-input" placeholder="Catalog name" value=${v} onInput=${O=>w(O.target.value)} />
              </div>
              <button className="btn primary" onClick=${q} disabled=${a==="create"}>${a==="create"?"Creating\u2026":"Create"}</button>
            </div>
            <div className="settings-row">
              <div className="profile-field">
                <div className="settings-label">…or open one by key</div>
                <input className="profile-input" placeholder="autobee://… or 64-hex key" value=${S} onInput=${O=>b(O.target.value)} onKeyDown=${O=>O.key==="Enter"&&X()} />
              </div>
              <button className="btn" onClick=${X} disabled=${a==="open"||!S.trim()}>${a==="open"?"Opening\u2026":"Open"}</button>
            </div>
          </div>
        `}

        ${r&&c`
          <div className="collab-open">
            <div className="settings-row">
              <div>
                <div className="settings-label">${r.name} ${r.writable?"":c`<span className="settings-subtle">· read-only</span>`}</div>
                <div className="settings-subtle">${r.apps.length} app(s)</div>
              </div>
              <button className="btn subtle" onClick=${()=>{i(null),E("")}}>Close</button>
            </div>
            <div className="settings-row">
              <div className="profile-field">
                <div className="settings-label">Share key — anyone can load this in the Apps tab</div>
                <code className="settings-code">${r.shareKey}</code>
              </div>
              <button className="btn small" onClick=${()=>x(r.shareKey,"share")}>${T==="share"?"Copied":"Copy"}</button>
            </div>
            <div className="settings-row">
              <div className="profile-field">
                <div className="settings-label">Your writer key — give this to the owner to be invited</div>
                <code className="settings-code">${r.writerKey}</code>
              </div>
              <button className="btn small" onClick=${()=>x(r.writerKey,"writer")}>${T==="writer"?"Copied":"Copy"}</button>
            </div>

            ${r.writable&&c`
              <div className="collab-writable">
                <div className="settings-row">
                  <div className="profile-field">
                    <div className="settings-label">Invite a writer (paste their writer key)</div>
                    <input className="profile-input" placeholder="64-hex writer key" value=${C} onInput=${O=>y(O.target.value)} />
                  </div>
                  <button className="btn" onClick=${Q} disabled=${a==="invite"||!C.trim()}>${a==="invite"?"Adding\u2026":"Invite"}</button>
                </div>
                <div className="settings-row">
                  <div className="profile-field">
                    <div className="settings-label">Add an app</div>
                    <input className="profile-input" placeholder="App name (optional)" value=${_} onInput=${O=>k(O.target.value)} />
                    <input className="profile-input" placeholder="hyper:// drive key" value=${m} onInput=${O=>p(O.target.value)} onKeyDown=${O=>O.key==="Enter"&&j()} />
                  </div>
                  <button className="btn primary" onClick=${j} disabled=${a==="addapp"||!m.trim()}>${a==="addapp"?"Adding\u2026":"Add app"}</button>
                </div>
              </div>
            `}

            ${r.apps.length>0&&c`
              <div className="collab-apps">
                <div className="settings-row"><div className="settings-label">Apps</div></div>
                ${r.apps.map(O=>c`
                  <div className="settings-row" key=${O.id||O.driveKey||O.link||O.name}>
                    <div>
                      <div className="settings-label">${O.name||O.id}</div>
                      <div className="settings-subtle">${O.driveKey||O.link||""}</div>
                    </div>
                    ${r.writable&&c`<button className="btn small subtle" onClick=${()=>K(O.id)} disabled=${a==="rm:"+O.id}>Remove</button>`}
                  </div>
                `)}
              </div>
            `}
          </div>
        `}
      </div>
    </div>
  `:null}function Ih({rpc:e,C:t}){let[n,s]=(0,d.useState)("pear-v3"),[r,i]=(0,d.useState)(""),[a,l]=(0,d.useState)(""),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)(""),[v,w]=(0,d.useState)([]),[S,b]=(0,d.useState)(!1),[C,y]=(0,d.useState)(""),[m,p]=(0,d.useState)(""),[_,k]=(0,d.useState)(""),[T,$]=(0,d.useState)(""),[E,D]=(0,d.useState)(""),[x,q]=(0,d.useState)(!1),[X,Q]=(0,d.useState)(""),[j,K]=(0,d.useState)(""),O=n==="pear-v3",ne=[["darwin-arm64","macOS Apple silicon"],["darwin-x64","macOS Intel"],["linux-arm64","Linux ARM64"],["linux-x64","Linux x64"],["win32-arm64","Windows ARM64"],["win32-x64","Windows x64"]],U=I=>{s(I),l(""),K(""),Q(""),b(!1)},ie=I=>{w(H=>H.includes(I)?H.filter(M=>M!==I):[...H,I])},de=I=>{Q(""),$(""),D("");let H=I.target.files&&I.target.files[0];if(!H)return;if(!["image/png","image/jpeg","image/webp","image/gif","image/svg+xml"].includes(H.type)){Q("Choose a PNG, JPEG, WebP, GIF, or SVG icon.");return}if(H.size>14*1024){Q("Keep the icon under 14 KB so it fits the shared catalogue record.");return}let B=new FileReader;B.onerror=()=>Q("The icon could not be read."),B.onload=()=>{let Y=typeof B.result=="string"?B.result:"";if(!Y||Y.length>2e4){Q("The encoded icon is too large for the catalogue.");return}$(Y),D(H.name)},B.readAsDataURL(H)},P=async()=>{if(Q(""),K(""),!r.trim()){Q("App name is required.");return}if(!a.trim()){Q(O?"Paste the production pear:// release link.":"Paste a hyper:// link or drive key.");return}if(O&&!u.trim()){Q("Enter the version currently published on this Pear release line.");return}if(O&&v.length===0){Q("Select every operating-system target included in the release.");return}if(O&&!S){Q("Confirm that the root link is the seeded production provision or multisig release line.");return}if(!O&&/^(?:pear|file):\/\//i.test(a.trim())){Q("Choose Pear v3 app for native release links.");return}q(!0);try{let I=await e.request(t.CMD_SUBMIT_APP,{submissionKind:n,name:r.trim(),link:a.trim(),version:u.trim(),productName:h.trim()||r.trim(),targets:v,releaseConfirmed:S,description:C.trim(),author:m.trim(),categories:_,iconData:T},9e4),H=I&&I.manifest&&I.manifest.name||r.trim(),M;if(I&&I.status==="pending-review"){let Y=Number(I.queuedForReview)||0,A=Number(I.acceptances)||0;M=`${Y} relay${Y===1?"":"s"} queued the catalogue receipt for human review.${A>0?` ${A} other relay${A===1?"":"s"} accepted receipt replication.`:""}`}else if(I&&I.status==="relay-accepted"){let Y=Number(I.acceptances)||0;M=`${Y} relay${Y===1?"":"s"} accepted receipt replication, but no human-review queue acknowledgement was observed.`}else M="The receipt request was broadcast, but no relay accepted it or confirmed a review queue entry within the initial window; the client will retry.";let B=I&&I.receiptWarning?` ${I.receiptWarning}`:"";K(`Submitted "${H}". ${M}${B} Catalogue publication remains a separate final gate.`),i(""),l(""),o(""),g(""),w([]),b(!1),y(""),p(""),k(""),$(""),D("")}catch(I){Q(I&&I.message||String(I))}finally{q(!1)}};return c`
    <div className="community-submit">
      <h2>Submit your app <span className="settings-subtle">→ Community list</span></h2>
      <p className="subtitle">Submit release metadata for review. Pear v3 native apps must already be built, staged, provisioned or multisig-gated, and seeded under a stable root <code>pear://</code> production identity. This form does not release or execute the app.</p>
      <div className="settings-card">
        ${X&&c`<div className="apps-error">${X}</div>`}
        ${j&&c`<div className="apps-ok">${j}</div>`}
        <div className="community-kind" role="group" aria-label="Submission type">
          <button className=${"btn "+(O?"primary":"subtle")} onClick=${()=>U("pear-v3")}>Pear v3 app</button>
          <button className=${"btn "+(O?"subtle":"primary")} onClick=${()=>U("hyper")}>Hyper site</button>
        </div>
        <div className="community-release-note">
          ${O?c`<span><strong>Pear v3 flow:</strong> <code>pear build</code> → <code>pear stage</code> → <code>pear provision</code> / multisig → keep the root release link seeded.</span>`:c`<span><strong>Hyper flow:</strong> publish and seed a drive with a root <code>/index.html</code>. The review receipt points to it but does not pin it automatically.</span>`}
        </div>
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">App name *</div>
            <input className="profile-input" placeholder="My Cool App" value=${r} onInput=${I=>i(I.target.value)} />
          </div>
        </div>
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">${O?"Production Pear release link *":"Hyper content link *"}</div>
            <input className="profile-input" spellCheck="false" placeholder=${O?"pear://<52-character production key>":"hyper://\u2026 (or a 64-hex / z-base-32 key)"} value=${a} onInput=${I=>l(I.target.value)} />
          </div>
        </div>
        ${O&&c`
          <div className="settings-row">
            <div className="profile-field">
              <div className="settings-label">Released version *</div>
              <input className="profile-input" placeholder="1.2.3" value=${u} onInput=${I=>o(I.target.value)} />
            </div>
            <div className="profile-field">
              <div className="settings-label">Installed product name *</div>
              <input className="profile-input" placeholder=${r.trim()||"Must match the Pear package"} value=${h} onInput=${I=>g(I.target.value)} />
            </div>
          </div>
          <div className="profile-field">
            <div className="settings-label">Published targets *</div>
            <div className="community-targets">
              ${ne.map(([I,H])=>c`
                <label key=${I}>
                  <input type="checkbox" checked=${v.includes(I)} onChange=${()=>ie(I)} />
                  <span>${H}</span>
                </label>
              `)}
            </div>
          </div>
        `}
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">Description</div>
            <input className="profile-input" placeholder="What does it do?" value=${C} onInput=${I=>y(I.target.value)} />
          </div>
        </div>
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">Author</div>
            <input className="profile-input" placeholder="Your name or handle" value=${m} onInput=${I=>p(I.target.value)} />
          </div>
          <div className="profile-field">
            <div className="settings-label">Categories</div>
            <input className="profile-input" placeholder="tools, social" value=${_} onInput=${I=>k(I.target.value)} />
          </div>
        </div>
        <div className="profile-field">
          <div className="settings-label">App icon <span className="settings-subtle">PNG, JPEG, WebP, GIF, or safe SVG · max 14 KB</span></div>
          <div className="community-icon-upload">
            ${T?c`<img src=${Vr(T)} alt="Selected app icon" />`:c`<div className="app-icon app-icon-fallback">${(r||"?").charAt(0)}</div>`}
            <label className="btn">
              ${T?"Replace icon":"Choose icon"}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange=${de} />
            </label>
            ${E&&c`<span className="settings-subtle">${E}</span>`}
            ${T&&c`<button className="btn subtle" onClick=${()=>{$(""),D("")}}>Remove</button>`}
          </div>
        </div>
        ${O&&c`
          <label className="community-release-confirm">
            <input type="checkbox" checked=${S} onChange=${I=>b(I.target.checked)} />
            <span>I confirm this root link is the currently seeded production provision or multisig release line, not a versioned stage link.</span>
          </label>
        `}
        <div className="settings-row">
          <button className="btn primary" onClick=${P} disabled=${x||!r.trim()||!a.trim()||O&&(!u.trim()||v.length===0||!S)}>${x?"Submitting\u2026":"Submit catalogue receipt"}</button>
        </div>
      </div>
    </div>
  `}function Lh({rpc:e,C:t,onPreview:n}){let[s,r]=(0,d.useState)(!1),[i,a]=(0,d.useState)(""),[l,u]=(0,d.useState)(""),[o,h]=(0,d.useState)(!1),[g,v]=(0,d.useState)(null),[w,S]=(0,d.useState)(null),[b,C]=(0,d.useState)({}),[y,m]=(0,d.useState)({}),[p,_]=(0,d.useState)({}),[k,T]=(0,d.useState)({}),[$,E]=(0,d.useState)([]),[D,x]=(0,d.useState)(null),[q,X]=(0,d.useState)(""),[Q,j]=(0,d.useState)("");(0,d.useEffect)(()=>{e.request(t.CMD_USERDATA_GET_SETTINGS).then(P=>{let I=Pt(P)||{};typeof I.relayManageUrl=="string"&&a(I.relayManageUrl),typeof I.relayManageKey=="string"&&u(I.relayManageKey)}).catch(()=>{})},[]);let K=P=>{j(P),setTimeout(()=>j(""),3500)},O=async()=>{X("");try{await e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{relayManageUrl:i.trim(),relayManageKey:l.trim()}}),h(!0),setTimeout(()=>h(!1),1500),K("Saved.")}catch(P){X(P.message)}},ne=async()=>{X(""),x("load");try{let P=await e.request(t.CMD_MOD_PENDING,{},3e4);v(P.pending||[]),S(P.mode||null),E(P.audit||[]),C({}),m({})}catch(P){X(P.message),v([])}finally{x(null)}},U=async(P,I=!1)=>{let H=P.appKey;X(""),x("v:"+H);try{let M=await e.request(t.CMD_MOD_REVIEW,{appKey:H,publisherPubkey:P.publisherPubkey,force:I},45e3);C(B=>({...B,[H]:M})),m(B=>({...B,[H]:!1}))}catch(M){X(M.message)}finally{x(null)}},ie=async(P,I)=>{let H=P.appKey,M=b[H],B=(k[H]||"").trim(),Y=(p[H]||"").trim();if(I&&!M){X("Run due diligence before approving.");return}if(I&&!Y){X("Record what you checked in the reviewer note before approving.");return}if(!I&&!B){X("Add a rejection reason before rejecting.");return}X(""),x((I?"a:":"r:")+H);try{let A=await e.request(I?t.CMD_MOD_APPROVE:t.CMD_MOD_REJECT,{appKey:H,acknowledged:y[H]===!0,reviewedAt:M&&M.checkedAt,reviewedReceiptDriveVersion:M&&M.evidence&&M.evidence.receiptDriveVersion,reviewedTargetDriveVersion:M&&M.evidence&&M.evidence.targetDriveVersion,note:Y,reason:B},6e4);v(L=>(L||[]).filter(ae=>ae.appKey!==H)),A&&A.audit&&E(L=>[A.audit,...L].slice(0,50)),C(L=>{let ae={...L};return delete ae[H],ae}),K(A&&A.auditWarning?A.auditWarning:I?A&&A.promoted&&A.promoted.deferred?"Catalogue receipt approved. Community catalogue publication is still pending.":"Catalogue receipt approved and audited.":"Rejected with an audit reason.")}catch(A){X(A.message)}finally{x(null)}},de=P=>P?P.approvalAllowed?"Needs human review":"Blocked":"Not checked";return c`
    <div className="moderator-panel">
      <h2>
        <button className="btn subtle small" onClick=${()=>r(P=>!P)} style=${{marginRight:"8px"}}>${s?"\u25BE":"\u25B8"}</button>
        Moderator tools <span className="settings-subtle">(operator)</span>
      </h2>
      ${s&&c`
        <div className="settings-card">
          ${q&&c`<div className="apps-error">${q}</div>`}
          ${Q&&c`<div className="apps-ok">${Q}</div>`}
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
              <input className="profile-input" placeholder="https://relay-eu.p2phiverelay.xyz or http://127.0.0.1:9100" value=${i} onInput=${P=>a(P.target.value)} />
            </div>
          </div>
          <div className="settings-row">
            <div className="profile-field">
              <div className="settings-label">Operator API key</div>
              <input className="profile-input" type="password" placeholder="Bearer token" value=${l} onInput=${P=>u(P.target.value)} />
            </div>
            <button className="btn" onClick=${O}>${o?"Saved":"Save"}</button>
          </div>
          <div className="settings-row">
            <button className="btn primary" onClick=${ne} disabled=${D==="load"||!i.trim()}>${D==="load"?"Loading\u2026":"Load pending"}</button>
            ${w&&c`<span className=${"mod-mode "+(w==="review"?"pass":"warning")}>relay mode: ${w}</span>`}
            ${g&&c`<span className="settings-subtle">${g.length} queued</span>`}
          </div>
          ${w&&w!=="review"&&c`<div className="apps-error">This relay is not in review mode. Queue decisions are unsafe until its acceptance policy is set to <code>review</code>.</div>`}
          ${g&&g.length===0&&c`<div className="settings-subtle" style=${{padding:"6px 0"}}>No pending submissions.</div>`}
          ${g&&g.length>0&&c`
            <div className="mod-pending">
              ${g.map(P=>{let I=b[P.appKey],H=I&&I.summary?I.summary.warning:0,M=[P.source,P.contentType,P.privacyTier,P.storageClass,P.availabilityClass].filter(Boolean);return c`
                <div className="mod-review-card" key=${P.appKey}>
                  <div className="mod-review-head">
                    <div style=${{minWidth:0}}>
                      <div className="app-name">${I&&I.manifest&&I.manifest.name||P.name||P.appId||"Unidentified app"}</div>
                      <div className="mod-key">${P.appKey}</div>
                      <div className="settings-subtle">publisher ${(P.publisherPubkey||"unknown").slice(0,16)}…${P.currentRelays?` \xB7 ${P.currentRelays} current relay(s)`:""}${P.replicationFactor?` \xB7 requests ${P.replicationFactor}`:""}</div>
                      ${M.length>0&&c`<div className="settings-subtle">relay metadata · ${M.join(" \xB7 ")}</div>`}
                      ${P.discoveredAt&&c`<div className="settings-subtle">queued ${new Date(P.discoveredAt).toLocaleString()}</div>`}
                    </div>
                    <span className=${"mod-mode "+(I?I.approvalAllowed?"warning":"block":"")}>${de(I)}</span>
                  </div>
                  <div className="mod-review-actions">
                    <button className="btn small" onClick=${()=>U(P,!!I)} disabled=${!!D}>${D==="v:"+P.appKey?"Checking\u2026":I?"Re-run checks":"Run due diligence"}</button>
                    ${I&&I.previewUrl&&c`<button className="btn small subtle" onClick=${()=>n&&n(I.previewUrl)} disabled=${!!D}>Open target preview</button>`}
                  </div>
                  ${I&&c`
                    <div className="mod-summary">
                      <span className="mod-check pass">${I.summary.pass} pass</span>
                      <span className="mod-check warning">${I.summary.warning} warning${I.summary.warning===1?"":"s"}</span>
                      <span className="mod-check block">${I.summary.block} blocker${I.summary.block===1?"":"s"}</span>
                    </div>
                    ${I.manifest&&c`
                      <div className="mod-manifest">
                        <strong>${I.manifest.name}</strong>${I.manifest.version?` \xB7 v${I.manifest.version}`:""}${I.manifest.author?` \xB7 ${I.manifest.author}`:""}
                        ${I.manifest.description&&c`<div>${I.manifest.description}</div>`}
                        ${I.manifest.categories&&I.manifest.categories.length>0&&c`<div className="settings-subtle">${I.manifest.categories.join(" \xB7 ")}</div>`}
                        ${I.manifest.nativeDelivery?.installLink&&c`<div className="mod-key">${I.manifest.nativeDelivery.installLink}</div>`}
                      </div>
                    `}
                    <div className="mod-checks">
                      ${I.checks.map(B=>c`
                        <div className=${"mod-check-row "+B.status} key=${B.id}>
                          <span className="mod-check-icon">${B.status==="pass"?"\u2713":B.status==="block"?"\xD7":"!"}</span>
                          <div><strong>${B.label}</strong><div>${B.detail}</div></div>
                        </div>
                      `)}
                    </div>
                    <label className="mod-ack">
                      <input type="checkbox" checked=${y[P.appKey]===!0} onChange=${B=>m(Y=>({...Y,[P.appKey]:B.target.checked}))} />
                      ${I.submissionKind==="pear-v3"?"I independently checked the publisher and Pear release metadata, reviewed every warning, and understand that receipt checks are not a safety endorsement.":"I opened the target preview, reviewed every warning, and understand that automated checks are not a safety endorsement."}
                    </label>
                  `}
                  <div className="profile-field">
                    <div className="settings-label">Reviewer note <span className="settings-subtle">(required for approval)</span></div>
                    <textarea className="profile-input mod-textarea" placeholder="What did you inspect? Record relevant provenance or caveats." value=${p[P.appKey]||""} onInput=${B=>_(Y=>({...Y,[P.appKey]:B.target.value}))}></textarea>
                  </div>
                  <div className="profile-field">
                    <div className="settings-label">Rejection reason</div>
                    <input className="profile-input" placeholder="Required only when rejecting" value=${k[P.appKey]||""} onInput=${B=>T(Y=>({...Y,[P.appKey]:B.target.value}))} />
                  </div>
                  <div className="mod-decision-actions">
                    <button className="btn small primary" onClick=${()=>ie(P,!0)} disabled=${!!D||w!=="review"||!I||!I.approvalAllowed||!(p[P.appKey]||"").trim()||H>0&&y[P.appKey]!==!0}>${D==="a:"+P.appKey?"Approving\u2026":"Approve receipt"}</button>
                    <button className="btn small subtle" onClick=${()=>ie(P,!1)} disabled=${!!D||w!=="review"||!(k[P.appKey]||"").trim()}>${D==="r:"+P.appKey?"Rejecting\u2026":"Reject with reason"}</button>
                  </div>
                </div>
              `})}
            </div>
          `}
          ${$.length>0&&c`
            <details className="mod-audit">
              <summary>Recent local decision audit · ${$.length}</summary>
              ${$.slice(0,20).map(P=>c`
                <div className="mod-audit-row" key=${P.appKey+":"+P.decidedAt}>
                  <span className=${"mod-mode "+(P.action==="approve"?"pass":"block")}>${P.action}</span>
                  <code>${(P.appKey||"").slice(0,16)}…</code>
                  <span>${P.reason||P.note||"No note"}</span>
                  <time>${P.decidedAt?new Date(P.decidedAt).toLocaleString():""}</time>
                </div>
              `)}
            </details>
          `}
        </div>
      `}
    </div>
  `}var Ff={"author-signed":3,"relay-listed":2,unverified:1};function qf(e,t){let n=String(e||"0").split(".").map(r=>parseInt(r,10)||0),s=String(t||"0").split(".").map(r=>parseInt(r,10)||0);for(let r=0;r<Math.max(n.length,s.length);r++){let i=n[r]||0,a=s[r]||0;if(i!==a)return i>a}return!1}function Ph(e,t){let n=Ff[e.verification]||1,s=Ff[t.verification]||1;return n!==s?n>s?e:t:qf(e.version,t.version)?e:(qf(t.version,e.version),t)}function Mh(e){let t=String(e||"").trim();return t?t.replace(/^([a-z][a-z0-9+.-]*):\/\//i,(n,s)=>s.toLowerCase()+"://"):""}function Oh(e){if(!e||typeof e!="object")return"";let t=/^[0-9a-f]{64}$/i.test(String(e.driveKey||"").trim())?String(e.driveKey).trim().toLowerCase():"",n=Mh(e.link),s=/^hyper:\/\//i.test(n)?it(n):"";if(t||s)return"drive:"+(t||s);if(/^hyper:\/\/.+/i.test(n))return"link:"+n;let r=String(e.nativeDelivery?.installLink||"").trim().toLowerCase().replace(/\/$/,"");if(e.nativeDelivery?.status==="available"&&e.nativeDelivery?.kind==="pear-v3"&&/^pear:\/\/[13-9a-km-uw-z]{52}$/.test(r))return"native:"+r;let i=String(e.legacyMigrationId||"").trim().toLowerCase();if(/^[13-9a-km-uw-z]{52}$/.test(i))return"legacy:"+i;let a=String(e.id||"").trim();return a?"id:"+a:""}function Ec(e){let t=new Map,n=[];for(let s of e){let r=Oh(s);if(!r){n.push(s);continue}let i=t.get(r);if(!i){t.set(r,{...s,_sources:s.catalogName?[s.catalogName]:[]});continue}let a=[...new Set([...i._sources||[],s.catalogName].filter(Boolean))],l=Ph(s,i),u=l===s?i:s,o={...l};!o.iconData&&u.iconData&&(o.iconData=u.iconData),!o.icon&&u.icon&&(o.icon=u.icon),t.set(r,{...o,_sources:a})}return[...t.values(),...n]}function Uh(e){return e&&/^[0-9a-f]{64}$/i.test(e.driveKey||"")?e.driveKey.toLowerCase():null}function Bh({rpc:e,C:t,app:n}){let s=Uh(n),r=n&&n.link?n.link:n&&/^[0-9a-f]{64}$/i.test(n.driveKey||"")?"hyper://"+n.driveKey+"/":null,[i,a]=(0,d.useState)(null);if((0,d.useEffect)(()=>{if(!s||!(t&&t.CMD_GET_DRIVE_INFO)){a(null);return}let h=!1,g=async()=>{try{let w=await e.request(t.CMD_GET_DRIVE_INFO,{keyHex:s},12e3);h||a(w)}catch{}};g();let v=setInterval(g,15e3);return()=>{h=!0,clearInterval(v)}},[s,e,t]),!r)return null;let l=r.length>30?r.slice(0,20)+"\u2026"+r.slice(-6):r,u=i?i.peerCount||0:null,o=i&&i.byteLength?ka(i.byteLength):null;return c`
    <div className="app-p2p-meta" style=${{display:"flex",flexWrap:"wrap",alignItems:"center",gap:"8px",marginTop:"5px",fontSize:"11px"}}>
      <button title=${"Copy "+r} onClick=${h=>{h.stopPropagation(),qr(r)}} style=${{background:"none",border:"none",padding:0,color:"#6e7681",cursor:"pointer",fontFamily:"ui-monospace, monospace",fontSize:"11px"}}>${l} ⧉</button>
      ${o?c`<span style=${{color:"#8b949e"}}>${o}</span>`:""}
      <span title="Peers currently serving this app" style=${{display:"inline-flex",alignItems:"center",gap:"4px",color:u>0?"#3fb950":"#6e7681"}}>
        <span style=${{width:"6px",height:"6px",borderRadius:"50%",background:u>0?"#3fb950":"#484f58",display:"inline-block"}}></span>
        ${u==null?"\u2026":u+" "+(u===1?"peer":"peers")}
      </span>
    </div>
  `}function Kh({rpc:e,C:t,onLaunch:n}){let[s,r]=(0,d.useState)(""),[i,a]=(0,d.useState)([]),[l,u]=(0,d.useState)([]),[o,h]=(0,d.useState)(null),[g,v]=(0,d.useState)(""),[w,S]=(0,d.useState)("all"),[b,C]=(0,d.useState)("all"),[y,m]=(0,d.useState)({}),[p,_]=(0,d.useState)(null),[k,T]=(0,d.useState)(""),[$,E]=(0,d.useState)(!1),[D,x]=(0,d.useState)(""),[q,X]=(0,d.useState)(null),[Q,j]=(0,d.useState)(null),[K,O]=(0,d.useState)(!1),[ne,U]=(0,d.useState)([]),[ie,de]=(0,d.useState)([]),[P,I]=(0,d.useState)([]),[H,M]=(0,d.useState)(null),[B,Y]=(0,d.useState)(null),[A,L]=(0,d.useState)(""),[ae,we]=(0,d.useState)(!1),[re,G]=(0,d.useState)(""),fe=async f=>{let V=String(f?.legacyMigrationId||"").trim().toLowerCase();if(!V){L(`${f?.name||"This app"} has no verified native v3 package yet.`);return}L(""),Y("legacy-migration"),G("");try{let J=await e.request(t.CMD_LEGACY_APP_MIGRATION,{legacyMigrationId:V},1e4);L(J?.message||"A verified native v3 package is required.")}catch(J){L(`migration: ${J.message}`)}finally{Y(null)}},_t=f=>{if(f?.nativeDelivery?.status==="migration-required"){fe(f);return}let V=(f.link||"").trim();if(V){if(V.startsWith("hyper://")||V.startsWith("http://")||V.startsWith("https://")){L(""),n?.(V),G(`Launched ${f.name} in Browse \u2014 window.pear.${f.id}.* shim will inject if the manifest gate passes.`),setTimeout(()=>G(""),4e3);return}L(`launch: unsupported scheme for featured app "${f.name}" \u2014 ${V.slice(0,32)}`)}},Us=async f=>{if(f&&f.type!=="hypersite"){L(`${f.name||"This app"} is window-only: its catalogue type is "${f.type||"standalone"}", not "hypersite".`);return}L(""),Y("run-in-tab"),G("");try{let V=await e.request(t.CMD_RUN_APP_IN_TAB,{link:f.link},3e4);if(V?.action==="legacy-migration-required"){L(V.message||"A verified native v3 package is required.");return}n?.(V.url),G(`Running ${f.name} headless in a tab.`),setTimeout(()=>G(""),4e3)}catch(V){L(`run in tab: ${V.message}`)}finally{Y(null)}},Bs=f=>{!f||!f.driveKey||(L(""),G(""),n?.("hyper://"+f.driveKey+"/"),G(`Opened ${f.name}.`),setTimeout(()=>G(""),3500))},St=async()=>{try{let f=await e.request(t.CMD_LIST_INSTALLED);de(Array.isArray(f)?f:f?.apps??[])}catch(f){L(`saved copies: ${f.message}`)}},Rn=async()=>{try{let f=globalThis.pearbrowserRuntime;if(!f||typeof f.listPearApps!="function")return I([]);let V=await f.listPearApps();I(Array.isArray(V)?V:[])}catch(f){L(`native apps: ${f.message}`)}},Ke=f=>f?.nativeDelivery?.status==="available"&&f?.nativeDelivery?.kind==="pear-v3"?String(f.nativeDelivery.installLink||""):"",Wr=f=>{let V=Ke(f);return V&&P.find(J=>J.link===V)||null},es=async f=>{let V=globalThis.pearbrowserRuntime;if(!V||typeof V.installPearApp!="function"){L("Native Pear v3 installation is unavailable in this build.");return}let J=Ke(f);if(!J){L(`${f?.name||"This app"} has no valid Pear v3 install link.`);return}L(""),G(""),M(null),Y(`native-install:${J}`);try{let ce=await V.installPearApp({id:f.id,name:f.name,verification:f.verification,nativeDelivery:f.nativeDelivery});if(ce?.cancelled)return;await Rn(),G(ce?.exists?`${ce.app||f.name} is already installed.`:`Installed ${ce?.app||f.name} as a native Pear v3 app.`),setTimeout(()=>G(""),5e3)}catch(ce){L(`install ${f.name}: ${ce.message}`)}finally{Y(null),M(null)}},In=async f=>{let V=globalThis.pearbrowserRuntime;if(!V||typeof V.launchPearApp!="function"){L("Native Pear v3 launching is unavailable in this build.");return}let J=Ke(f)||f?.link||f?.id;L(""),G(""),Y(`native-launch:${J}`);try{let ce=await V.launchPearApp({link:J,id:f?.id});G(`Opened ${ce?.app||f?.name||"Pear app"} in its native window.`),setTimeout(()=>G(""),4e3),await Rn()}catch(ce){L(`launch ${f?.name||"app"}: ${ce.message}`)}finally{Y(null)}},Gt=async()=>{try{let f=await e.request(t.CMD_CHECK_UPDATES),V={};for(let J of Array.isArray(f)?f:[])J&&J.id&&(V[J.id]=J.newVersion);m(V)}catch{}},Ks=async f=>{let V=i.find(J=>J.id===f);if(!V){L(`refresh ${f}: not in any loaded catalog`);return}await at(V),await Gt()},Mt=f=>{let V=Array.isArray(f)?f.filter(Boolean):[f].filter(Boolean);return!p||!V.length||!Array.isArray(p.apps)?!1:p.apps.some(J=>V.some(ce=>J.id===ce||J.driveKey===ce||J.link===ce))},ts=!!(p&&p.writable),Oa=f=>{try{navigator.clipboard.writeText(f),O(!0),setTimeout(()=>O(!1),1500)}catch{}},N=async()=>{L(""),Y("mycatalog");try{let f=await e.request(t.CMD_MYCATALOG_CREATE,{name:k},6e4);_(f),T(""),e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{myCatalogKey:f.keyHex}}).catch(()=>{}),await Me(f.keyHex)}catch(f){L(`catalog create: ${f.message}`)}finally{Y(null)}},R=async f=>{if(!p)return;if(!p.writable){L("This catalog is not editable on this device.");return}let V=f.id||f.driveKey||f.link;L(""),Y(`addcat:${V}`);try{let J=await e.request(t.CMD_MYCATALOG_ADD_APP,{keyHex:p.keyHex,app:f},6e4);_(J),await me(),Gt()}catch(J){L(`add to catalog: ${J.message}`)}finally{Y(null)}},W=async f=>{if(p){if(!p.writable){L("This catalog is not editable on this device.");return}L(""),Y(`rmcat:${f}`);try{let V=await e.request(t.CMD_MYCATALOG_REMOVE_APP,{keyHex:p.keyHex,id:f},6e4);_(V),q===f&&(X(null),j(null)),await me(),Gt()}catch(V){L(`remove from catalog: ${V.message}`)}finally{Y(null)}}},z=()=>{p&&(x(p.name||"My Catalog"),E(!0))},Z=async()=>{if(p){if(!p.writable){L("This catalog is not editable on this device.");return}L(""),Y("renamecat");try{let f=await e.request(t.CMD_MYCATALOG_RENAME,{keyHex:p.keyHex,name:D},6e4);_(f),E(!1),await me(),Gt()}catch(f){L(`rename catalog: ${f.message}`)}finally{Y(null)}}},se=f=>{let V=f.id||f.driveKey||f.link;V&&(X(V),j({name:f.name||"",type:f.type||"standalone",description:f.description||"",version:f.version||"",author:f.author||"",categories:La(f).join(", "),icon:f.icon||f.iconRef||""}))},le=(f,V)=>{j(J=>({...J||{},[f]:V}))},te=()=>{X(null),j(null)},ke=async f=>{if(!p||!Q)return;if(!p.writable){L("This catalog is not editable on this device.");return}let V=String(Q.categories||"").split(",").map(J=>J.trim()).filter(Boolean);L(""),Y(`editcat:${f}`);try{let J=await e.request(t.CMD_MYCATALOG_UPDATE_APP,{keyHex:p.keyHex,id:f,app:{name:Q.name,type:Q.type,description:Q.description,version:Q.version,author:Q.author,categories:V,icon:Q.icon}},6e4);_(J),X(null),j(null),await me(),Gt()}catch(J){L(`edit app: ${J.message}`)}finally{Y(null)}},me=async()=>{try{let f=await e.request(t.CMD_GET_CATALOG_APPS);a(Array.isArray(f?.apps)?f.apps:[]),u(Array.isArray(f?.catalogs)?f.catalogs:[])}catch(f){L(`catalog: ${f.message}`)}},Me=async f=>{let V=(typeof f=="string"?f:s).trim(),J=qt(V);if(J){L(""),Y("catalog");try{let{cmd:ce,payload:Ot,persistRef:be}=zf(J,t);await e.request(ce,Ot||{keyHex:J.key},6e4),r(""),await me(),Gt(),U(ns=>{let zs=[be,...ns.filter(Ua=>Ua!==be)].slice(0,8);return e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{lastCatalogKey:be,recentCatalogs:zs}}).catch(()=>{}),zs})}catch(ce){L(`catalog: ${ce.message}`)}finally{Y(null)}}},mt=async f=>{L("");try{await e.request(t.CMD_UNLOAD_CATALOG,{keyHex:f}),b===f&&C("all"),await me();let V=cc(f);U(J=>{let ce=J.filter(Ot=>cc(Ot)!==V);return e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{recentCatalogs:ce}}).catch(()=>{}),ce})}catch(V){L(`unload: ${V.message}`)}};(0,d.useEffect)(()=>{St(),Rn(),me(),(async()=>{try{let f=Pt(await e.request(t.CMD_USERDATA_GET_SETTINGS)),V=Array.isArray(f?.recentCatalogs)?f.recentCatalogs:[],J=f?.lastCatalogKey,ce=typeof f?.myCatalogKey=="string"?f.myCatalogKey:null,Ot=Ze=>qt(Ze)?.key===yh?Nc:Ze,be=V.map(Ot);be.some((Ze,Wt)=>Ze!==V[Wt])&&e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{recentCatalogs:be}}).catch(()=>{});let ns=[...new Set([...be,...J?[Ot(J)]:[],...ce?[ce]:[]])];be.length&&U(be),ce&&e.request(t.CMD_MYCATALOG_GET,{keyHex:ce}).then(_).catch(()=>{});let zs=f?.defaultCatalogSeeded===!0,Ua=f?.communityCatalogSeeded===!0,um=qt(Ms)?.key,dm=ns.some(Ze=>qt(Ze)?.key===um),Yr=ns.length?[...ns]:zs?[]:[Nc,Ms],Ac=!dm&&!Ua;if(Ac&&(Yr=[...new Set([...Yr,Ms])]),Yr.length){Y("catalog"),await Promise.allSettled(Yr.map(Wt=>{let Qr=qt(Wt);if(!Qr)return Promise.resolve();let{cmd:pm,payload:fm}=zf(Qr,t),mm=qt(Ms)?.key===Qr.key;return e.request(pm,fm||{keyHex:Qr.key},mm?25e3:6e4)}));let Ze={};if(!ns.length&&!zs){let Wt=[Nc,Ms];U(Wt),Ze.recentCatalogs=Wt,Ze.defaultCatalogSeeded=!0,Ze.communityCatalogSeeded=!0}else if(Ac){let Wt=[...new Set([...be,Ms])];U(Wt),Ze.recentCatalogs=Wt,Ze.communityCatalogSeeded=!0}Object.keys(Ze).length&&e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:Ze}).catch(()=>{}),await me(),Gt(),Y(null)}}catch{}finally{we(!0)}})()},[]),(0,d.useEffect)(()=>{let f=globalThis.pearbrowserRuntime;if(!(!f||typeof f.onPearAppProgress!="function"))return f.onPearAppProgress(V=>M(V||null))},[]);let at=async f=>{L(""),Y(`save-offline:${f.id}`);try{await e.request(t.CMD_INSTALL_APP,f,12e4),await St()}catch(V){L(`save ${f.name} offline: ${V.message}`)}finally{Y(null)}},_e=async f=>{L(""),Y(`remove-saved:${f.id}`);try{await e.request(t.CMD_UNINSTALL_APP,{id:f.id}),await St()}catch(V){L(`remove saved copy of ${f.name}: ${V.message}`)}finally{Y(null)}},lt=async f=>{L(""),Y(`open-saved:${f.id}`);try{let V=await e.request(t.CMD_LAUNCH_APP,{id:f.id});n(V.localUrl)}catch(V){L(`open ${f.name}: ${V.message}`)}finally{Y(null)}},De=f=>ie.some(V=>V.id===f),We=f=>{if(De(f.id))return lt(f);Bs(f)},Ln=(0,d.useMemo)(()=>{let f=new Set;for(let V of i)La(V).forEach(J=>f.add(J));return["all",...[...f].sort()]},[i]),ln=(0,d.useMemo)(()=>{let f=g.normalize("NFKC").trim().toLowerCase(),V=i.filter(J=>!J||!J.link&&!J.legacyMigrationId&&!Ke(J)||b!=="all"&&J.catalogKey!==b||w!=="all"&&!La(J).includes(w)?!1:f?Dh(J).includes(f):!0);return Ec(V)},[i,g,w,b]),jr=(0,d.useMemo)(()=>Ec(i.filter(f=>f&&(f.link||f.legacyMigrationId||Ke(f)))).length,[i]),Vt=f=>{let V=f.id||f.driveKey||f.name||"untitled",J=f.id||f.driveKey,ce=q===J&&Q,Ot=!!(Q&&String(Q.name||"").trim());return c`
      <div className=${"app-card"+(ce?" editing":"")} key=${V}>
        <${Fr} rpc=${e} C=${t} driveKey=${f.driveKey} iconRef=${f.icon} iconData=${f.iconData} name=${f.name} />
        <div className="app-info">
          ${ce?c`
              <div className="catalog-edit-wrap">
                <div className="catalog-edit-form">
                  <label>
                    Name
                    <input type="text" value=${Q.name} onInput=${be=>le("name",be.target.value)} />
                  </label>
                  <label>
                    Type <span style=${{opacity:.6,fontWeight:"normal"}}>(how it launches — required)</span>
                    <select value=${Q.type||"standalone"} onChange=${be=>le("type",be.target.value)} style=${{width:"100%",padding:"8px",borderRadius:"6px",background:"#0d1117",color:"#c9d1d9",border:"1px solid #30363d"}}>
                      <option value="hypersite">hypersite — browsable P2P content</option>
                    </select>
                  </label>
                  <label>
                    Description
                    <textarea rows="3" value=${Q.description} onInput=${be=>le("description",be.target.value)}></textarea>
                  </label>
                  <div className="catalog-form-grid">
                    <label>
                      Version
                      <input type="text" value=${Q.version} onInput=${be=>le("version",be.target.value)} />
                    </label>
                    <label>
                      Author
                      <input type="text" value=${Q.author} onInput=${be=>le("author",be.target.value)} />
                    </label>
                  </div>
                  <label>
                    Categories
                    <input type="text" value=${Q.categories} onInput=${be=>le("categories",be.target.value)} />
                  </label>
                  <label>
                    Icon <span style=${{opacity:.6,fontWeight:"normal"}}>(path inside your drive, e.g. /icon.svg)</span>
                    <input type="text" placeholder="/icon.svg" value=${Q.icon||""} onInput=${be=>le("icon",be.target.value)} />
                  </label>
                  ${(f.link||f.driveKey)&&c`<div className="app-meta" style=${{marginTop:"2px",fontFamily:"ui-monospace, monospace",fontSize:"11px",color:"#6e7681",wordBreak:"break-all"}}>launch: ${f.link||"hyper://"+f.driveKey+"/"}</div>`}
                </div>
              </div>
            `:c`
              <div className="app-info-copy">
                <div className="app-name">${f.name||f.id}</div>
                <div className="app-desc">${f.description||""}</div>
                <div className="app-meta">${f.version?"v"+f.version:""} ${f.author?"\xB7 "+f.author:""}</div>
              </div>
            `}
        </div>
        <div className="app-actions">
          ${ce?c`
              <div className="app-actions-group">
                <button key="save" className="btn primary" onClick=${()=>ke(J)} disabled=${B===`editcat:${J}`||!Ot}>
                  ${B===`editcat:${J}`?"Saving\u2026":"Save"}
                </button>
                <button key="cancel" className="btn subtle" onClick=${te} disabled=${B===`editcat:${J}`}>Cancel</button>
              </div>
            `:c`
              <div className="app-actions-group">
                ${ts&&J&&c`
                  <button key="edit" className="btn subtle" onClick=${()=>se(f)} disabled=${B===`rmcat:${J}`}>Edit</button>
                  <button key="remove" className="btn subtle" onClick=${()=>W(J)} disabled=${B===`rmcat:${J}`}>Remove</button>
                `}
              </div>
            `}
        </div>
      </div>
    `};return c`
    <div className="apps">
      <h1>Apps</h1>
      <p className="subtitle">Browse P2P content or find verified native v3 package guidance in a HiveRelay catalog.</p>

      <h2>Featured</h2>
      <div className="app-grid">
        ${uh.map(f=>c`
          <div className="app-card" key=${f.id}>
            <div className="app-icon app-icon-fallback" style=${{background:f.gradient,color:"#0b0e14"}}>${f.initial}</div>
            <div className="app-info">
              <div className="app-name">${f.name}</div>
              <div className="app-desc">${f.tagline}</div>
              <div className="app-meta" title=${f.legacyMigrationId}>Legacy native release · migration required</div>
            </div>
            <div className="app-actions">
              ${f.type==="hypersite"?c`<button key="run-featured" className="btn primary" onClick=${()=>Us(f)} disabled=${B==="run-in-tab"} title="Run headless — the app's UI streams into a tab over a pipe">Run in tab</button>`:c`<button key="open-featured" className="btn primary" onClick=${()=>_t(f)} disabled=${B==="legacy-migration"} title="Requires a verified native v3 package">Migration status</button>`}
            </div>
          </div>
        `)}
      </div>

      <h2>Legacy native apps</h2>
      <div className="catalog-loader">
        <p className="placeholder">Older remote app links cannot run in PearBrowser. Install only a publisher-provided, verified native v3 package.</p>
      </div>
      ${re&&c`<div className="apps-ok">${re}</div>`}
      ${H&&c`<div className="apps-ok">
        ${H.phase==="downloading"?`Downloading native app \xB7 ${ka(H.download?.bytes||0)} \xB7 ${H.peers||0} peer${H.peers===1?"":"s"}`:H.phase==="connecting"?"Finding Pear v3 release peers\u2026":H.phase==="installing"?`Installing ${H.app||"native app"}${H.version?` v${H.version}`:""}\u2026`:"Preparing native app\u2026"}
      </div>`}

      <h2>App Catalog</h2>
      <div className="catalog-loader">
        <input
          type="text"
          placeholder="Catalog key: hex, z32, hyperbee://…, autobee://…, sheets://… or hiveindex://…"
          value=${s}
          onInput=${f=>r(f.target.value)}
          onKeyDown=${f=>f.key==="Enter"&&Me()}
          spellCheck="false"
        />
        <button className="btn primary" onClick=${()=>Me()} disabled=${!s||B==="catalog"}>
          ${B==="catalog"?"Loading\u2026":"Add catalog"}
        </button>
      </div>

      ${l.length>0&&c`
        <div className="catalog-sources">
          <button
            className=${"catalog-chip"+(b==="all"?" active":"")}
            onClick=${()=>C("all")}
          >All · ${jr}</button>
          ${l.map(f=>c`
            <span className="catalog-source" key=${f.key}>
              <button
                className=${"catalog-chip"+(b===f.key?" active":"")}
                title=${f.key}
                onClick=${()=>C(f.key)}
              >${f.name} · ${f.count}</button>
              <button className="catalog-source-x" title="Remove this catalog" onClick=${()=>mt(f.key)}>×</button>
            </span>
          `)}
        </div>
      `}

      ${A&&c`<div className="apps-error">${A}</div>`}

      ${B==="catalog"&&i.length===0&&c`
        <div className="catalog-loading">
          <span className="spinner"></span>
          <span>Loading catalogs from peers…</span>
        </div>
      `}

      ${ae&&i.length===0&&!B&&!A&&c`
        <div className="catalog-empty">
          <strong>No catalogs loaded.</strong>
          Paste a catalog drive key above, or use one of the featured Pear apps to launch directly.
          The browser remembers catalogs you've loaded before — they'll reload here next time.
        </div>
      `}

      ${i.length>0&&c`
        <div className="catalog-results">
          <h2>All apps · ${jr}${l.length?` across ${l.length} ${l.length===1?"catalog":"catalogs"}`:""}</h2>

          <div className="catalog-filter">
            <input
              type="text"
              className="catalog-search"
              placeholder="Search apps by name, category, catalogue, or author…"
              value=${g}
              onInput=${f=>v(f.target.value)}
              spellCheck="false"
            />
            ${Ln.length>1&&c`
              <div className="catalog-categories">
                ${Ln.map(f=>c`
                  <button
                    className=${"catalog-chip"+(f===w?" active":"")}
                    key=${f}
                    onClick=${()=>S(f)}
                  >${f==="all"?"All":f}</button>
                `)}
              </div>
            `}
          </div>

          ${ln.length===0?c`<p className="placeholder">No apps match ${g?`"${g}"`:"this filter"}.</p>`:c`<div className="app-grid">
              ${ln.map(f=>c`
              <div className="app-card" key=${f.id}>
                <${Fr} rpc=${e} C=${t} driveKey=${f.driveKey} iconRef=${f.icon} iconData=${f.iconData} name=${f.name} />
                <div className="app-info" onClick=${()=>h(f)} style=${{cursor:"pointer"}} title="View details">
                  <div className="app-name">
                    ${f.name||f.id||"Untitled app"}
                    ${f.verification==="relay-listed"?c`<span title="Relay-listed" style=${{marginLeft:"5px",color:"#58a6ff",fontSize:"12px"}}>✓</span>`:""}
                    ${f.verification==="author-signed"?c`<span title="Author-signed" style=${{marginLeft:"5px",color:"#3fb950",fontSize:"12px"}}>✦</span>`:""}
                  </div>
                  <div className="app-desc">${f.description||""}</div>
                  <div className="app-meta">
                    ${f.version?"v"+f.version:""} ${f.author?"\xB7 "+f.author:""}
                    ${f.nativeDelivery?.status==="migration-required"?c`<span style=${{marginLeft:"6px",opacity:.75}}>· verified native package required</span>`:Ke(f)?c`<span style=${{marginLeft:"6px",opacity:.75}}>· Pear v3 native app</span>`:f.type==="hypersite"?c`<span style=${{marginLeft:"6px",opacity:.75}}>· opens in a tab</span>`:""}
                  </div>
                  ${f.catalogName&&c`<div className="app-source-tag">${f.catalogName}</div>`}
                  <${Bh} rpc=${e} C=${t} app=${f} />
                </div>
                <div className="app-actions">
                  ${(()=>{let V=Ke(f),J=Wr(f),ce=!!(f.driveKey&&/^[0-9a-f]{64}$/i.test(f.driveKey)),Ot=De(f.id);return c`
                      ${ce?c`<button key="open-content" className=${"btn "+(V||f.nativeDelivery?.status==="migration-required"?"subtle":"primary")} onClick=${()=>We(f)} title="Open this browsable Hyperdrive content in a tab">Open</button>`:""}
                      ${ce?Ot?c`<button key="remove-saved-copy" className="btn subtle" onClick=${()=>_e(f)} disabled=${B===`remove-saved:${f.id}`} title="Remove this device's saved content while keeping the catalogue entry">${B===`remove-saved:${f.id}`?"Removing\u2026":"Remove saved copy"}</button>`:c`<button key="save-offline" className="btn subtle" onClick=${()=>at(f)} disabled=${B===`save-offline:${f.id}`} title="Save browsable content on this device for offline use">${B===`save-offline:${f.id}`?"Saving\u2026":"Save offline"}</button>`:""}
                      ${V?J?.installed?c`<button key="open-native" className="btn primary" onClick=${()=>In(f)} disabled=${B===`native-launch:${V}`} title="Open the installed native application">Open app</button>`:c`<button key="install-native" className="btn primary" onClick=${()=>es(f)} disabled=${B===`native-install:${V}`} title="Install the Pear v3 build into your operating system">${B===`native-install:${V}`?"Installing\u2026":"Install app"}</button>`:f.nativeDelivery?.status==="migration-required"?c`<button key="migration" className="btn primary" onClick=${()=>fe(f)} disabled=${B==="legacy-migration"} title="Requires a verified native v3 package">Migration status</button>`:""}
                      ${ts&&f.catalogKey!==p.keyHex&&!Mt([f.id,f.driveKey,f.link])&&c`
                        <button key="add-catalog" className="btn subtle" title="Add to my catalog" onClick=${()=>R(f)} disabled=${B===`addcat:${f.id||f.driveKey||f.link}`}>+ Catalog</button>
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
      ${p?c`
          <div className="mycatalog">
            <div className="mycatalog-head">
              <div className="mycatalog-title">
                ${$?c`
                    <div className="mycatalog-title-edit">
                      <input
                        className="mycatalog-title-input"
                        type="text"
                        value=${D}
                        onInput=${f=>x(f.target.value)}
                        onKeyDown=${f=>{f.key==="Enter"&&Z(),f.key==="Escape"&&E(!1)}}
                        spellCheck="false"
                        autoFocus
                      />
                    <button key="save-name" className="btn primary small" onClick=${Z} disabled=${B==="renamecat"||!D.trim()}>
                      ${B==="renamecat"?"Saving\u2026":"Save"}
                    </button>
                    <button key="cancel-name" className="btn subtle small" onClick=${()=>E(!1)} disabled=${B==="renamecat"}>Cancel</button>
                    </div>
                  `:c`
                    <div className="mycatalog-title-row">
                      <div className="app-name">${p.name}</div>
                      ${ts&&c`<button key="rename" className="btn subtle small" onClick=${z}>Rename</button>`}
                    </div>
                  `}
                <div className="app-meta">${p.apps.length} app${p.apps.length===1?"":"s"}${p.writable?"":" \xB7 read-only on this device"}</div>
              </div>
              <button className="btn subtle" onClick=${()=>Oa(p.keyHex)}>${K?"Copied!":"Copy share key"}</button>
            </div>
            <div className="mycatalog-key" title=${p.keyHex}>${p.keyHex}</div>
            ${p.apps.length===0?c`<p className="placeholder">${p.writable?"No apps yet. Use + Catalog on any app above to add it.":"This catalog has no saved apps."}</p>`:c`<div className="app-grid">
                  ${p.apps.map(Vt)}
                </div>`}
          </div>
        `:c`
          <div className="catalog-empty">
            <strong>Publish your own catalog.</strong>
            Create a catalog, add apps you want to share, then hand out its key — anyone can load it above to discover your picks. It's pinned to the relays, so it stays reachable even when you're offline.
            <div className="catalog-loader" style=${{marginTop:"10px"}}>
              <input
                type="text"
                placeholder="Catalog name (e.g. My Picks)"
                value=${k}
                onInput=${f=>T(f.target.value)}
                onKeyDown=${f=>f.key==="Enter"&&N()}
                spellCheck="false"
              />
              <button className="btn primary" onClick=${N} disabled=${B==="mycatalog"}>
                ${B==="mycatalog"?"Creating\u2026":"Create catalog"}
              </button>
            </div>
          </div>
        `}

      <h2>Native Pear apps</h2>
      ${P.length===0?c`<p className="placeholder">No native Pear v3 apps installed through PearBrowser yet.</p>`:c`<div className="app-grid">
            ${P.map(f=>c`
              <div className="app-card" key=${f.link}>
                <div className="app-icon app-icon-fallback">${(f.app||f.displayName||"?").charAt(0)}</div>
                <div className="app-info">
                  <div className="app-name">${f.app||f.displayName}</div>
                  <div className="app-meta">v${f.version||"?"} · native ${f.platform||""}${f.installed?"":" \xB7 not found at recorded OS location"}</div>
                </div>
                <div className="app-actions">
                  <button key="launch-native-installed" className="btn primary" onClick=${()=>In({id:f.id,name:f.app,nativeDelivery:{status:"available",kind:"pear-v3",installLink:f.link}})} disabled=${!f.installed||B===`native-launch:${f.link}`}>Open app</button>
                </div>
              </div>
            `)}
          </div>`}

      <h2>Saved for offline use</h2>
      ${ie.length===0?c`<p className="placeholder">No Hyperdrive content saved for offline use yet.</p>`:c`<div className="app-grid">
            ${ie.map(f=>c`
              <div className="app-card" key=${f.id}>
                <${Fr} rpc=${e} C=${t} driveKey=${f.driveKey} iconRef=${f.icon} iconData=${f.iconData} name=${f.name} />
                <div className="app-info">
                  <div className="app-name">${f.name}</div>
                  <div className="app-meta">Saved v${f.version||"?"}${y[f.id]?` \xB7 newer content available \u2192 v${y[f.id]}`:""}</div>
                </div>
                <div className="app-actions">
                  ${y[f.id]&&c`
                    <button key="refresh-saved-copy" className="btn primary" onClick=${()=>Ks(f.id)} disabled=${B===`save-offline:${f.id}`}>
                      ${B===`save-offline:${f.id}`?"Refreshing\u2026":"Refresh saved copy"}
                    </button>
                  `}
                  <button key="open-saved" className="btn" onClick=${()=>lt(f)} disabled=${B===`open-saved:${f.id}`}>Open</button>
                  <button key="remove-saved" className="btn subtle" onClick=${()=>_e(f)} disabled=${B===`remove-saved:${f.id}`}>${B===`remove-saved:${f.id}`?"Removing\u2026":"Remove saved copy"}</button>
                  ${ts&&!Mt([f.id,f.driveKey,f.link])&&c`
                    <button key="add-installed" className="btn subtle" title="Add to my catalog" onClick=${()=>R(f)} disabled=${B===`addcat:${f.id||f.driveKey||f.link}`}>+ Catalog</button>
                  `}
                </div>
              </div>
            `)}
          </div>`}

      <${Ih} rpc=${e} C=${t} />

      <${Rh} rpc=${e} C=${t} />

      <${Lh} rpc=${e} C=${t} onPreview=${n} />

      ${o&&c`
        <div onClick=${()=>h(null)} style=${{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3,padding:"24px"}}>
          <div onClick=${f=>f.stopPropagation()} style=${{background:"#11161f",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"14px",padding:"20px 24px 24px",maxWidth:"480px",width:"100%",maxHeight:"82vh",overflowY:"auto"}}>
            <div style=${{display:"flex",justifyContent:"flex-end"}}>
              <button className="btn subtle" title="Close" onClick=${()=>h(null)} style=${{padding:"2px 9px"}}>✕</button>
            </div>
            <div style=${{display:"flex",gap:"14px",alignItems:"center",marginBottom:"14px"}}>
              ${Vr(o.iconData)?c`<img src=${Vr(o.iconData)} alt="" style=${{width:"56px",height:"56px",borderRadius:"12px"}} />`:c`<div style=${{width:"56px",height:"56px",borderRadius:"12px",background:"#1f2733",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",fontWeight:600}}>${(o.name||"?").charAt(0)}</div>`}
              <div style=${{minWidth:0}}>
                <div style=${{fontSize:"18px",fontWeight:600}}>
                  ${o.name||"Untitled app"}
                  ${o.verification==="relay-listed"?c`<span title="Relay-listed" style=${{marginLeft:"6px",color:"#58a6ff",fontSize:"14px"}}>✓</span>`:""}
                  ${o.verification==="author-signed"?c`<span title="Author-signed" style=${{marginLeft:"6px",color:"#3fb950",fontSize:"14px"}}>✦</span>`:""}
                </div>
                <div style=${{color:"#8b949e",fontSize:"13px"}}>${o.author||""}</div>
              </div>
            </div>
            <p style=${{color:"#c9d1d9",lineHeight:1.6,margin:"0 0 14px"}}>${o.description||"No description."}</p>
            ${o.categories&&o.categories.length?c`
              <div style=${{display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:"14px"}}>
                ${o.categories.map(f=>c`<span key=${f} style=${{fontSize:"12px",padding:"2px 9px",borderRadius:"8px",background:"rgba(255,255,255,0.06)",color:"#8b949e"}}>${f}</span>`)}
              </div>`:""}
            <div style=${{fontSize:"13px",color:"#8b949e",display:"grid",gap:"6px",marginBottom:"18px"}}>
              <div><strong style=${{color:"#c9d1d9"}}>Delivery:</strong> ${o.driveKey?`browsable Hyperdrive content opened in a browser tab${Ke(o)?"; signed Pear v3 native package also available":""}`:Ke(o)?"signed Pear v3 native OS application":o.nativeDelivery?.status==="migration-required"?"legacy native record; verified Pear v3 package required":"catalogue link"}</div>
              ${o.version?c`<div><strong style=${{color:"#c9d1d9"}}>Version:</strong> v${o.version}</div>`:""}
              <div><strong style=${{color:"#c9d1d9"}}>Verification:</strong> ${o.verification||"unverified"}</div>
              ${o.homepage?c`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Homepage:</strong> ${o.homepage}</div>`:""}
              ${o.sourceUrl?c`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Source:</strong> ${o.sourceUrl}</div>`:""}
              ${o.license?c`<div><strong style=${{color:"#c9d1d9"}}>License:</strong> ${o.license}</div>`:""}
              ${o.link?c`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Link:</strong> ${o.link}</div>`:""}
              ${Ke(o)?c`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Install:</strong> ${Ke(o)}</div>`:""}
              ${o.driveKey?c`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Drive:</strong> ${o.driveKey}</div>`:""}
              ${o._sources&&o._sources.length?c`<div><strong style=${{color:"#c9d1d9"}}>Catalogue${o._sources.length>1?"s":""}:</strong> ${o._sources.join(", ")}</div>`:o.catalogName?c`<div><strong style=${{color:"#c9d1d9"}}>Catalogue:</strong> ${o.catalogName}</div>`:""}
              ${o.publisherKey?c`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Publisher:</strong> ${$e(o.publisherKey)}</div>`:""}
            </div>
            <div style=${{display:"flex",gap:"8px"}}>
              ${o.driveKey&&c`
                <button key="detail-open-site" className="btn primary" onClick=${()=>{We(o),h(null)}}>Open</button>
                ${De(o.id)?c`<button key="detail-remove-saved" className="btn subtle" onClick=${()=>{_e(o),h(null)}}>Remove saved copy</button>`:c`<button key="detail-save-offline" className="btn subtle" onClick=${()=>{at(o),h(null)}}>Save offline</button>`}
              `}
              ${Ke(o)?Wr(o)?.installed?c`<button key="detail-open-native" className="btn primary" onClick=${()=>{In(o),h(null)}}>Open app</button>`:c`<button key="detail-install-native" className="btn primary" onClick=${()=>{es(o),h(null)}}>Install app</button>`:o.nativeDelivery?.status==="migration-required"?c`<button key="detail-migration" className="btn primary" onClick=${()=>{fe(o),h(null)}}>Migration status</button>`:!o.driveKey&&o.type==="hypersite"?c`<button key="detail-run-tab" className="btn primary" onClick=${()=>{Us(o),h(null)}}>Run in tab</button>`:o.driveKey?"":c`<button key="detail-open-window" className="btn primary" onClick=${()=>{_t(o),h(null)}}>Open</button>`}
              <button key="detail-close" className="btn" onClick=${()=>h(null)}>Close</button>
            </div>
          </div>
        </div>
      `}
    </div>
  `}function zh({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[r,i]=(0,d.useState)([]),[a,l]=(0,d.useState)(""),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)(!1),v=async()=>{try{s(await e.request(t.CMD_CONTACTS_MY_INVITE));let b=await e.request(t.CMD_CONTACTS_LIST,{limit:200});i(Array.isArray(b?.contacts)?b.contacts:[])}catch(b){o(b.message)}};(0,d.useEffect)(()=>{v()},[]);let w=async()=>{try{await navigator.clipboard.writeText(n.url),g(!0),setTimeout(()=>g(!1),1500)}catch{}},S=async()=>{let b=a.trim();if(b){o("");try{let y=(await e.request(t.CMD_CONTACTS_ADD_INVITE,{url:b}))?.contact||{};l(""),o(`Added ${y.displayName||(y.pubkey?y.pubkey.slice(0,12)+"\u2026":"contact")}${y.bindingKey?" \u2014 searchable":""}`),v()}catch(C){o(`Couldn't add: ${C.message}`)}}};return c`
    <details className="trusted-peers">
      <summary>Trusted peers for federated search (${r.length})</summary>
      <div className="tp-body">
        <p className="subtitle">Share your invite so a peer can add you; paste theirs to search their content. Peer results are cryptographically verified before they're shown.</p>
        ${n&&c`
          <div className="tp-field">
            <label>Your invite</label>
            <div className="tp-row">
              <input className="profile-input" readOnly value=${n.url} onClick=${b=>b.target.select()} />
              <button className="btn small" onClick=${w}>${h?"Copied":"Copy"}</button>
            </div>
          </div>`}
        <div className="tp-field">
          <label>Add a peer</label>
          <div className="tp-row">
            <input className="profile-input" placeholder="Paste a p2p-contact://invite…" value=${a}
                   onInput=${b=>l(b.target.value)} onKeyDown=${b=>b.key==="Enter"&&S()} />
            <button className="btn small primary" onClick=${S} disabled=${!a.trim()}>Add</button>
          </div>
        </div>
        ${u&&c`<div className="tp-msg">${u}</div>`}
        ${r.length>0&&c`
          <ul className="tp-list">
            ${r.map(b=>c`
              <li key=${b.pubkey}>
                <span className="tp-name">${b.displayName||b.pubkey.slice(0,16)+"\u2026"}</span>
                ${b.verifiedAt?c`<span className="src-badge followed">verified</span>`:c`<span className="src-badge other">unverified</span>`}
                ${b.bindingKey?c`<span className="src-badge self">searchable</span>`:""}
              </li>`)}
          </ul>`}
      </div>
    </details>`}function nm({meta:e}){let t=e&&(e.provenance||e);return t?c`<span className="search-provenance">
    ${t.digestHit?c`<span className="src-badge self">digest hit</span>`:""}
    ${t.fallbackPull?c`<span className="src-badge other">fallback pull</span>`:""}
    ${t.partial?c`<span className="src-badge other">partial</span>`:""}
    ${e.verifyBudgetExhausted?c`<span className="src-badge other">verify budget</span>`:""}
  </span>`:null}function Hh({rpc:e,C:t,onBrowse:n}){let[s,r]=(0,d.useState)([]),[i,a]=(0,d.useState)([]),[l,u]=(0,d.useState)(!1),[o,h]=(0,d.useState)(!1),[g,v]=(0,d.useState)(""),[w,S]=(0,d.useState)(""),[b,C]=(0,d.useState)(null),[y,m]=(0,d.useState)(0),[p,_]=(0,d.useState)(!1),[k,T]=(0,d.useState)(!1),[$,E]=(0,d.useState)(!1),[D,x]=(0,d.useState)(null),q=(0,d.useRef)(0),X=async()=>{let U=w.trim();if(!U){C(null),E(!1),x(null);return}_(!0),E(!1),x(null);try{let ie=await e.request(t.CMD_SEARCH,{query:U,limit:50,federated:k});q.current=ie?.queryId||0,C(Array.isArray(ie?.results)?ie.results:[]),m(ie?.stats?.docs||0),ie?.federating&&E(!0)}catch(ie){v(`search: ${ie.message}`)}finally{_(!1)}},Q=U=>U&&U.link?U.link:U&&/^(?:pear|file|hyper):\/\//i.test(U.driveKey||"")?U.driveKey:`hyper://${U.driveKey}${U.path&&U.path!=="/"?U.path:"/"}`,j=U=>!U.tier||U.tier==="self"?c`<span className="src-badge self">you</span>`:U.tier==="followed"?c`<span className="src-badge followed">trusted · hop ${U.trustHop??1}</span>`:c`<span className="src-badge other">${U.tier}</span>`;(0,d.useEffect)(()=>{let U=ie=>{let de=ie&&ie.detail||{};de.queryId===q.current&&(Array.isArray(de.results)&&C(de.results),x(de),E(!1))};return e.addEventListener(`event:${t.EVT_SEARCH_FEDERATED}`,U),()=>e.removeEventListener(`event:${t.EVT_SEARCH_FEDERATED}`,U)},[]);let K=async()=>{try{let U=await e.request(t.CMD_USERDATA_LIST_BOOKMARKS);r(Array.isArray(U)?U:U?.bookmarks??[]);let ie=await e.request(t.CMD_USERDATA_LIST_HISTORY,{limit:200});a(Array.isArray(ie)?ie:ie?.history??[]),typeof ie?.historyEnabled=="boolean"&&u(ie.historyEnabled);let de=Pt(await e.request(t.CMD_USERDATA_GET_SETTINGS).catch(()=>null));de&&(u(de.historyEnabled===!0),h(de.searchIndexEnabled===!0))}catch(U){v(U.message)}};(0,d.useEffect)(()=>{K();let U=setInterval(K,5e3);return()=>clearInterval(U)},[]);let O=async U=>{try{await e.request(t.CMD_USERDATA_REMOVE_BOOKMARK,{url:U}),K()}catch(ie){v(ie.message)}},ne=async()=>{if(confirm("Clear all browsing history?"))try{await e.request(t.CMD_USERDATA_CLEAR_HISTORY),K()}catch(U){v(U.message)}};return c`
    <div className="library">
      <h1>Library</h1>
      <p className="subtitle">Bookmarks you choose to save, and optional history — all local on this device. No browse data is uploaded.</p>
      ${g&&c`<div className="apps-error">${g}</div>`}

      <h2>Search your P2P content</h2>
      <p className="subtitle">${o?c`Full-text search over pages you've opened, fully local — no query ever leaves your device.${y?` ${y} page(s) indexed.`:""}`:c`Local page indexing is OFF (privacy default). Enable it in Settings → Clearnet & privacy if you want Library search to learn from pages you open.`}</p>
      <div className="urlbar" style=${{marginBottom:"12px"}}>
        <input
          type="text"
          className="url-input"
          placeholder="Search pages you've visited…"
          value=${w}
          onInput=${U=>S(U.target.value)}
          onKeyDown=${U=>U.key==="Enter"&&X()}
        />
        <button className="btn primary" onClick=${X} disabled=${p||!w.trim()}>${p?"Searching\u2026":"Search"}</button>
      </div>
      <label className="search-fed-toggle">
        <input type="checkbox" checked=${k} onChange=${U=>T(U.target.checked)} />
        Include trusted peers${$?c` <span className="fed-status">· searching peers…</span>`:""}
        <${nm} meta=${D} />
      </label>
      <${zh} rpc=${e} C=${t} />
      ${b!==null&&(b.length===0?c`<p className="placeholder">No matches${y===0?" yet \u2014 browse some hyper:// pages first to build your index.":"."}</p>`:c`<div className="library-list">
            ${b.map(U=>c`
              <div className="library-row" key=${U.docId||U.driveKey+U.path}>
                <div className="library-row-main">
                  <div className="library-title">${U.title||Q(U)}${k?j(U):""}</div>
                  <div className="library-url">${Q(U)}</div>
                </div>
                <button className="btn small" onClick=${()=>n(Q(U))}>Open</button>
              </div>
            `)}
          </div>`)}

      <h2>Bookmarks (${s.length})</h2>
      ${s.length===0?c`<p className="placeholder">No bookmarks yet. Use the star button in Browse, or open About this site and choose Bookmark this site.</p>`:c`<div className="library-list">
            ${s.map(U=>c`
              <div className="library-row" key=${U.url}>
                <div className="library-row-main">
                  <div className="library-title">${U.title||U.url}</div>
                  <div className="library-url">${U.url}</div>
                </div>
                <button className="btn small" onClick=${()=>n(U.url)}>Open</button>
                <button className="btn small subtle" onClick=${()=>O(U.url)}>Remove</button>
              </div>
            `)}
          </div>`}

      <div className="library-history-head">
        <h2>History ${l?`(${i.length})`:"(off)"}</h2>
        ${l&&i.length>0&&c`<button className="btn small subtle" onClick=${ne}>Clear history</button>`}
      </div>
      ${l?i.length===0?c`<p className="placeholder">No browsing history yet.</p>`:c`<div className="library-list">
              ${i.slice(0,100).map((U,ie)=>c`
                <div className="library-row" key=${(U.url||"")+":"+ie}>
                  <div className="library-row-main">
                    <div className="library-title">${U.title||U.url}</div>
                    <div className="library-url">${U.url} ${U.visitedAt?"\xB7 "+new Date(U.visitedAt).toLocaleString():""}</div>
                  </div>
                  <button className="btn small" onClick=${()=>n(U.url)}>Open</button>
                </div>
              `)}
            </div>`:c`<p className="placeholder" data-testid="history-disabled-note">Browsing history is OFF by default. Nothing is recorded. Turn it on in Settings → Clearnet &amp; privacy if you want a local visit log on this device only.</p>`}
    </div>
  `}var kc=[{key:"displayName",label:"Display name",placeholder:"How apps will refer to you"},{key:"bio",label:"Bio",placeholder:"A short bio (optional)",textarea:!0},{key:"avatar",label:"Avatar URL",placeholder:"https://\u2026 or hyper://\u2026 (optional)"},{key:"website",label:"Website",placeholder:"https://your.site (optional)"},{key:"email",label:"Email",placeholder:"name@example.com (optional)"}];function Fh(e){let t={...e||{}};return!t.displayName&&t.name&&(t.displayName=t.name),t}function qh(e){let t=e?.driveKey||e?.driveKeyHex||"";return{...e||{},driveKey:t,driveKeyHex:t}}function Gh(e){return tm[e]||{label:e,detail:e}}function Gf(e){return(Array.isArray(e)?e:[]).map(t=>Gh(t).label)}function Vf(e){let t=new Set(Array.isArray(e)?e:[]);if(t.has("profile:read"))return["Display name","Avatar","Bio","Email","Website","Pronouns","Location"];let n=[];return t.has("profile:name")&&n.push("Display name"),t.has("profile:avatar")&&n.push("Avatar"),t.has("profile:email")&&n.push("Email"),t.has("profile:website")&&n.push("Website"),t.has("profile:contact")&&(n.includes("Email")||n.push("Email"),n.includes("Website")||n.push("Website")),n}function Vh({rpc:e,C:t}){let[n,s]=(0,d.useState)({}),[r,i]=(0,d.useState)({}),[a,l]=(0,d.useState)(null),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)(""),v=async()=>{o("");try{let C=await e.request(t.CMD_PROFILE_GET),y=Fh(C?.profile||{});s(y),i(y)}catch(C){o(`profile: ${C.message}`)}};(0,d.useEffect)(()=>{v()},[]);let w=kc.some(({key:C})=>(r[C]||"")!==(n[C]||"")),S=async()=>{o(""),g(""),l("save");try{let C={};for(let{key:p}of kc){let _=(r[p]||"").trim();_!==(n[p]||"")&&(C[p]=_)}let m=(await e.request(t.CMD_PROFILE_UPDATE,{updates:C}))?.profile||C;s(m),i(m),g("Saved."),setTimeout(()=>g(""),1500)}catch(C){o(`save: ${C.message}`)}finally{l(null)}},b=async()=>{if(confirm("Clear ALL profile fields? Apps that already have grants will see empty values from now on.")){o(""),l("clear");try{await e.request(t.CMD_PROFILE_CLEAR),s({}),i({}),g("Profile cleared."),setTimeout(()=>g(""),1500)}catch(C){o(`clear: ${C.message}`)}finally{l(null)}}};return c`
    <div className="settings-card">
      ${u&&c`<div className="apps-error">${u}</div>`}
      ${h&&c`<div className="apps-ok">${h}</div>`}
      ${kc.map(({key:C,label:y,placeholder:m,textarea:p})=>c`
        <div className="settings-row" key=${C}>
          <div className="profile-field">
            <div className="settings-label">${y}</div>
            ${p?c`<textarea
                  className="profile-input"
                  rows="2"
                  placeholder=${m}
                  value=${r[C]||""}
                  onInput=${_=>i({...r,[C]:_.target.value})}
                ></textarea>`:c`<input
                  type="text"
                  className="profile-input"
                  placeholder=${m}
                  value=${r[C]||""}
                  onInput=${_=>i({...r,[C]:_.target.value})}
                />`}
          </div>
        </div>
      `)}
      <div className="settings-row settings-row-actions">
        <button className="btn subtle" onClick=${b} disabled=${a!==null}>
          ${a==="clear"?"Clearing\u2026":"Clear all"}
        </button>
        <button className="btn primary" onClick=${S} disabled=${!w||a!==null}>
          ${a==="save"?"Saving\u2026":"Save profile"}
        </button>
      </div>
    </div>
  `}function Wh({rpc:e,C:t}){let[n,s]=(0,d.useState)([]),[r,i]=(0,d.useState)([]),[a,l]=(0,d.useState)([]),[u,o]=(0,d.useState)(null),[h,g]=(0,d.useState)(""),[v,w]=(0,d.useState)(!1),S=async()=>{g("");try{let[$,E,D]=await Promise.all([e.request(t.CMD_LOGIN_LIST_GRANTS).catch(x=>({error:x})),e.request(t.CMD_SWARM_LIST_GRANTS).catch(()=>({grants:[]})),e.request(t.CMD_CONTACTS_LIST,{limit:1e3}).catch(()=>({contacts:[]}))]);if($?.error)throw $.error;s((Array.isArray($?.grants)?$.grants:[]).map(qh).filter(x=>x.driveKey)),i(Array.isArray(E?.grants)?E.grants.filter(x=>x?.driveKey):[]),l(Array.isArray(D?.contacts)?D.contacts:[])}catch($){g(`permissions: ${$.message}`)}finally{w(!0)}};(0,d.useEffect)(()=>{S()},[]);let b=(0,d.useMemo)(()=>{let $=new Map,E=D=>($.has(D)||$.set(D,{driveKey:D,appName:null,login:null,swarm:[]}),$.get(D));for(let D of n){let x=E(D.driveKey);x.login=D,x.appName=D.appName||x.appName}for(let D of r){let x=E(D.driveKey);x.swarm.push(D),x.appName=x.appName||D.appName}return[...$.values()].sort((D,x)=>{let q=Math.max(D.login?.grantedAt||0,...D.swarm.map(Q=>Q.grantedAt||0));return Math.max(x.login?.grantedAt||0,...x.swarm.map(Q=>Q.grantedAt||0))-q})},[n,r]),C=n.filter($=>($.scopes||[]).includes("contacts:read")),y=n.filter($=>Vf($.scopes).length>0),m=async $=>{let E=$.appName||$e($.driveKey);if(confirm(`Revoke sign-in for ${E}? It will need to ask again next time.`)){g(""),o(`login:${$.driveKey}`);try{await e.request(t.CMD_LOGIN_REVOKE_GRANT,{driveKeyHex:$.driveKey}),await S()}catch(D){g(`revoke sign-in: ${D.message}`)}finally{o(null)}}},p=async $=>{let E=$.appName||$e($.driveKey);if(confirm(`Revoke ${E}'s access to topic ${$e($.topicHex)}?`)){g(""),o(`swarm:${$.driveKey}:${$.topicHex}`);try{await e.request(t.CMD_SWARM_REVOKE_GRANT,{driveKey:$.driveKey,topicHex:$.topicHex}),await S()}catch(D){g(`revoke topic: ${D.message}`)}finally{o(null)}}},_=async $=>{if(!$.swarm.length)return;let E=$.appName||$e($.driveKey);if(confirm(`Revoke all ${$.swarm.length} swarm topic grant(s) for ${E}?`)){g(""),o(`swarm-all:${$.driveKey}`);try{await e.request(t.CMD_SWARM_REVOKE_ALL_FOR_APP,{driveKey:$.driveKey}),await S()}catch(D){g(`revoke topics: ${D.message}`)}finally{o(null)}}},k=async $=>{let E=$.appName||$e($.driveKey);if(confirm(`Revoke every stored permission for ${E}?`)){g(""),o(`app:${$.driveKey}`);try{$.login&&await e.request(t.CMD_LOGIN_REVOKE_GRANT,{driveKeyHex:$.driveKey}),$.swarm.length&&await e.request(t.CMD_SWARM_REVOKE_ALL_FOR_APP,{driveKey:$.driveKey}),await S()}catch(D){g(`revoke app: ${D.message}`)}finally{o(null)}}},T=async()=>{if(n.length&&confirm(`Revoke all ${n.length} sign-in grant(s)?`)){g(""),o("login-all");try{await e.request(t.CMD_LOGIN_REVOKE_ALL),await S()}catch($){g(`revoke all sign-ins: ${$.message}`)}finally{o(null)}}};return c`
    <div className="settings-card permission-center">
      ${h&&c`<div className="apps-error">${h}</div>`}

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
          <div className="permission-stat-value">${C.length}</div>
          <div className="permission-stat-label">contact readers</div>
        </div>
        <div className="permission-stat">
          <div className="permission-stat-value">${r.length}</div>
          <div className="permission-stat-label">swarm topics</div>
        </div>
      </div>

      <div className="settings-subsection-label">Apps and sites</div>
      ${v?b.length===0?c`<div className="settings-subtle">No stored app permissions yet.</div>`:b.map($=>{let E=Vf($.login?.scopes||[]),D=($.login?.scopes||[]).includes("contacts:read");return c`
                <div className="permission-app" key=${$.driveKey}>
                  <div className="permission-app-head">
                    <div>
                      <div className="settings-label">${$.appName||$e($.driveKey)}</div>
                      <code className="settings-code">${$e($.driveKey)}</code>
                    </div>
                    <button className="btn subtle danger" onClick=${()=>k($)}
                            disabled=${u===`app:${$.driveKey}`}>
                      ${u===`app:${$.driveKey}`?"Revoking\u2026":"Revoke app"}
                    </button>
                  </div>

                  <div className="permission-cap-grid">
                    <div className="permission-cap">
                      <div className="permission-cap-label">Sign-in</div>
	                      ${$.login?c`<div className="permission-cap-body">
	                          <div className="permission-chip-row">
	                            ${(Gf($.login.scopes).length?Gf($.login.scopes):["sign-in only"]).map(x=>c`
	                              <span className="permission-chip" key=${x}>${x}</span>
	                            `)}
	                          </div>
                          <div className="settings-subtle">
                            Granted ${new Date($.login.grantedAt).toLocaleDateString()}
                            ${$.login.expiresAt?c` · expires ${new Date($.login.expiresAt).toLocaleDateString()}`:""}
	                          </div>
	                          <button className="btn subtle danger small" onClick=${()=>m($.login)}
	                                  disabled=${u===`login:${$.driveKey}`}>Revoke sign-in</button>
	                        </div>`:c`<div className="settings-subtle">No sign-in grant.</div>`}
                    </div>

                    <div className="permission-cap">
                      <div className="permission-cap-label">Profile fields</div>
                      ${E.length?c`<div className="permission-chip-row">
                            ${E.map(x=>c`<span className="permission-chip" key=${x}>${x}</span>`)}
                          </div>`:c`<div className="settings-subtle">No profile fields shared.</div>`}
                    </div>

                    <div className="permission-cap">
                      <div className="permission-cap-label">Contacts</div>
	                      ${D?c`<div className="permission-cap-body">
	                          <div className="permission-chip-row"><span className="permission-chip warn">contacts:read</span></div>
	                          <div className="settings-subtle">${a.length} saved contact${a.length===1?"":"s"} visible through this scope.</div>
	                        </div>`:c`<div className="settings-subtle">No contact access.</div>`}
                    </div>

                    <div className="permission-cap">
                      <div className="permission-cap-label">Swarm topics</div>
	                      ${$.swarm.length?c`<div className="permission-cap-body">
	                          <div className="settings-subtle">${$.swarm.length} persisted topic${$.swarm.length===1?"":"s"}.</div>
	                          ${$.swarm.map(x=>c`
	                            <div className="permission-topic" key=${x.topicHex}>
	                              <div>
	                                <code className="settings-code">${x.protocol||"pear.swarm.v1"} · ${$e(x.topicHex)}</code>
                                <div className="settings-subtle">
                                  Granted ${new Date(x.grantedAt).toLocaleDateString()}
                                  ${x.lastUsedAt&&x.lastUsedAt!==x.grantedAt?c` · last used ${new Date(x.lastUsedAt).toLocaleDateString()}`:""}
                                </div>
                              </div>
                              <button className="btn subtle danger small" onClick=${()=>p(x)}
                                      disabled=${u===`swarm:${x.driveKey}:${x.topicHex}`}>Revoke</button>
                            </div>
	                          `)}
	                          <button className="btn subtle danger small" onClick=${()=>_($)}
	                                  disabled=${u===`swarm-all:${$.driveKey}`}>Revoke all topics</button>
	                        </div>`:c`<div className="settings-subtle">No arbitrary topic grants.</div>`}
                    </div>
                  </div>
                </div>
              `}):c`<div className="settings-subtle">Loading…</div>`}

      ${n.length>0&&c`
        <div className="settings-row settings-row-actions">
          <button className="btn subtle danger" onClick=${T} disabled=${u==="login-all"}>
            ${u==="login-all"?"Revoking\u2026":"Revoke all sign-ins"}
          </button>
        </div>
      `}
    </div>
  `}function jh(e){return Array.isArray(e?.supported_transports)?e.supported_transports:Array.isArray(e?.transports)?e.transports:[]}function Yh({rpc:e,C:t}){let[n,s]=(0,d.useState)({relays:[],enabled:!0}),[r,i]=(0,d.useState)(""),[a,l]=(0,d.useState)(null),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)(!1),[v,w]=(0,d.useState)({}),S=async()=>{o("");try{let p=await e.request(t.CMD_GET_RELAYS);s({relays:Array.isArray(p?.relays)?p.relays:[],enabled:p?.enabled!==!1})}catch(p){o(`relays: ${p.message}`)}finally{g(!0)}};(0,d.useEffect)(()=>{S()},[]),(0,d.useEffect)(()=>{if(!n.relays.length)return;let p=!1,_={};for(let k of n.relays)_[k]=v[k]||null;return w(_),n.relays.forEach(async k=>{try{if(p)return;let T=await e.request(t.CMD_CHECK_RELAY_CAPABILITY,{url:k},1e4);if(p)return;w($=>({...$,[k]:T}))}catch(T){if(p)return;w($=>({...$,[k]:{ok:!1,error:T.message||"unreachable"}}))}}),()=>{p=!0}},[n.relays.join("|")]);let b=async p=>{o(""),l("save");try{let _=await e.request(t.CMD_SET_RELAYS,{relays:p});s({relays:Array.isArray(_?.relays)?_.relays:p,enabled:_?.enabled!==!1})}catch(_){o(`set: ${_.message}`)}finally{l(null)}},C=async p=>{o(""),l("toggle");try{await e.request(t.CMD_SET_RELAY_ENABLED,{enabled:p}),s(_=>({..._,enabled:p}))}catch(_){o(`toggle: ${_.message}`)}finally{l(null)}},y=async()=>{let p=r.trim().replace(/\/$/,"");if(p){if(!/^https?:\/\//.test(p)){o("Relay URLs must start with http:// or https://");return}if(n.relays.includes(p)){o("Already in the list.");return}i(""),await b([...n.relays,p])}},m=async p=>{n.relays.length<=1&&!confirm("Removing your last relay will switch to pure-P2P mode (slower first paint). Continue?")||await b(n.relays.filter(_=>_!==p))};return c`
    <div className="settings-card">
      ${u&&c`<div className="apps-error">${u}</div>`}
      <div className="settings-row">
        <div>
          <div className="settings-label">${n.enabled?"Hybrid fetch":"Pure P2P mode"}</div>
          <div className="settings-subtle">${n.enabled?"Try a relay first (1-2s first paint), fall back to P2P. Recommended for most users.":"P2P only \u2014 slower first paint, no relay dependency. Toggle this on to use relays."}</div>
        </div>
        <button className="btn subtle" onClick=${()=>C(!n.enabled)} disabled=${a==="toggle"}>
          ${n.enabled?"Disable":"Enable"}
        </button>
      </div>
      ${h&&n.relays.length===0&&c`
        <div className="settings-subtle">No relays configured.</div>
      `}
      ${n.relays.map((p,_)=>{let k=v[p];return c`
        <div className="settings-row relay-row" key=${p}>
          <div className="relay-info">
            <div className="relay-url-line">
              <code className="settings-code">${p}</code>
              ${_===0?c`<span className="settings-pill">primary</span>`:""}
            </div>
            ${k==null?c`<div className="relay-caps relay-caps-loading">probing capability advertisement…</div>`:k.ok?c`<div className="relay-caps">
                    <span className="relay-cap-label">v${k.doc?.version||"?"}</span>
                    ${k.doc?.region?c`<span className="relay-cap-label">${k.doc.region}</span>`:""}
                    ${jh(k.doc).map(T=>c`
                      <span className=${"relay-cap-pill"+(T==="dht-relay-ws"?" relay-cap-pill-new":"")} key=${T}>${T}</span>
                    `)}
                  </div>`:c`<div className="relay-caps relay-caps-err">capability check failed: ${k.error}</div>`}
          </div>
          ${n.relays.length>1?c`
            <button className="btn subtle" onClick=${()=>m(p)} disabled=${a==="save"}>
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
          value=${r}
          onInput=${p=>i(p.target.value)}
          onKeyDown=${p=>p.key==="Enter"&&y()}
          spellCheck="false"
        />
        <button className="btn primary" onClick=${y} disabled=${!r.trim()||a==="save"}>
          Add
        </button>
      </div>
    </div>
  `}function Qh({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[r,i]=(0,d.useState)(null),[a,l]=(0,d.useState)(""),[u,o]=(0,d.useState)(!1),h=async()=>{try{s(await e.request(t.CMD_NOSTR_GET_IDENTITY)),l("")}catch(k){l(k.message)}};(0,d.useEffect)(()=>{h()},[]);let g=async()=>{if(n?.npub)try{await navigator.clipboard.writeText(n.npub),o(!0),setTimeout(()=>o(!1),1500)}catch{}},v=async(k,T)=>{i(T),l("");try{s(await e.request(k))}catch($){l($.message)}finally{i(null)}},w=n?.npub||"",S=w?w.slice(0,14)+"\u2026"+w.slice(-6):"\u2014",b=n?.status||(n?.linked?"linked":"unverified"),C=b==="linked",y=n?.epoch||0,m=b==="linked"?"self":b==="revoked"?"other danger":"other",p=b==="linked"?`linked (attested) \xB7 epoch ${y}`:b==="revoked"?`revoked \xB7 epoch ${y}`:b==="stale"?`stale \xB7 epoch ${y}`:"not linked",_=b==="linked"?"Your pear root and this Nostr key are mutually signed.":b==="revoked"?"The last attestation was revoked and is no longer trusted.":b==="stale"?"The stored attestation points at an older Nostr key.":"Mint a mutual attestation binding your pear root \u2194 Nostr key.";return c`
    <div className="settings-card">
      <div className="settings-row">
        <div>
          <div className="settings-label">Your Nostr key</div>
          <div className="settings-subtle">${n?S:"Loading\u2026"}</div>
        </div>
        <button className="btn small" onClick=${g} disabled=${!w}>${u?"Copied":"Copy npub"}</button>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Link status</div>
          <div className="settings-subtle">
            <span className=${`src-badge ${m}`}>${p}</span> ${_}
          </div>
        </div>
        ${C?c`<button className="btn subtle danger" onClick=${()=>v(t.CMD_NOSTR_REVOKE,"revoke")} disabled=${r!=null}>${r==="revoke"?"Revoking\u2026":"Revoke"}</button>`:c`<button className="btn primary" onClick=${()=>v(t.CMD_NOSTR_BIND,"bind")} disabled=${r!=null}>${r==="bind"?"Linking\u2026":"Link (attest)"}</button>`}
      </div>
      ${a&&c`<div className="tp-msg">${a}</div>`}
    </div>
  `}function Xh({rpc:e,C:t}){let[n,s]=(0,d.useState)([]),[r,i]=(0,d.useState)(""),[a,l]=(0,d.useState)(!1),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)(!1),[v,w]=(0,d.useState)(null),S=64*1024,b=async()=>{try{let _=await e.request(t.CMD_NOSTR_QUERY,{filter:{kinds:[1],limit:50},federated:h});s(Array.isArray(_?.events)?_.events:[]),w(_?.hidden||null),o("")}catch(_){o(_.message)}};(0,d.useEffect)(()=>{b()},[h]);let C=async()=>{let _=r.trim();if(_){l(!0),o("");try{await e.request(t.CMD_NOSTR_PUBLISH,{kind:1,content:_}),i(""),await b()}catch(k){o(k.message)}finally{l(!1)}}},y=_=>{let k=Date.now()/1e3-_;return k<60?"just now":k<3600?Math.floor(k/60)+"m":k<86400?Math.floor(k/3600)+"h":Math.floor(k/86400)+"d"},m=v?(v.quarantined||0)+(v.dropped||0)+(v.futureDated||0)+(v.bindingMissing||0)+(v.bindingUntrusted||0)+(v.contactFailures||0):0,p=v?.byReason?Object.entries(v.byReason).filter(([,_])=>_>0).map(([_,k])=>`${_}: ${k}`).join(" \xB7 "):"";return c`
    <div className="settings-card">
      <div className="tp-field">
        <label>Post a note</label>
        <textarea className="profile-input" rows="2" maxLength=${S} placeholder="What's happening?" value=${r}
                  onInput=${_=>i(_.target.value)}></textarea>
        <button className="btn small primary" onClick=${C} disabled=${a||!r.trim()}>${a?"Posting\u2026":"Post"}</button>
      </div>
      ${u&&c`<div className="tp-msg">${u}</div>`}
      <div className="settings-row">
        <label className="login-scope${h?" on":""}">
          <input type="checkbox" checked=${h} onChange=${()=>g(_=>!_)} />
          Include trusted contacts' notes
        </label>
      </div>
      ${h&&m>0&&c`
        <div className="settings-subtle">
          Hidden contact activity: ${m}${p?` \xB7 ${p}`:""}
        </div>
      `}
      <div className="nostr-feed">
        ${n.length===0?c`<div className="settings-subtle">No notes yet — post one above. Each is signed with your Nostr key and stored in your local event log.</div>`:n.map(_=>c`
            <div className="nostr-note" key=${_.id}>
              <div className="nostr-note-content">${_.content}</div>
              <div className="settings-subtle">
                ${_._via?c`<span className="src-badge followed">from ${_._via}</span>`:c`<span className="src-badge self">you</span>`}
                kind ${_.kind} · ${y(_.created_at)}
              </div>
            </div>`)}
      </div>
    </div>
  `}function Jh({rpc:e,C:t}){let[n,s]=(0,d.useState)([]),[r,i]=(0,d.useState)(null),[a,l]=(0,d.useState)(""),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)(null),[v,w]=(0,d.useState)(""),[S,b]=(0,d.useState)(""),C=async()=>{try{let k=await e.request(t.CMD_NAMEREG_STATUS);if(i(k),k.created){let T=await e.request(t.CMD_NAMEREG_LIST);s(Array.isArray(T?.names)?T.names:[])}else s([])}catch(k){w(k.message)}};(0,d.useEffect)(()=>{C()},[]);let y=async()=>{let k=a.trim(),T=oc(u);if(!T){w("Enter a 64-hex drive key or hyper:// link.");return}let $=n.find(E=>E.normalized===k.toLowerCase()||(E.name||"").toLowerCase()===k.toLowerCase());g("submit"),w("");try{await e.request($?t.CMD_NAMEREG_ROTATE:t.CMD_NAMEREG_CLAIM,{name:k,target:T}),l(""),o(""),await C()}catch(E){w(E.message)}finally{g(null)}},m=async(k,T)=>{g(T+k),w("");try{await e.request(k,{name:T}),await C()}catch($){w($.message)}finally{g(null)}},p=async k=>{try{await navigator.clipboard.writeText("pearname://"+k),b(k),setTimeout(()=>b(""),1500)}catch{}},_=oc(u)!=null;return c`
    <div className="settings-card">
	      ${r&&!r.enabled?c`<div className="settings-subtle">Turn on “Names” in Experimental (below) to claim registry names.</div>`:c`<div className="namereg-body">
	        <div className="settings-row">
	          <div>
	            <div className="settings-label">Claim or update a name</div>
            <div className="settings-subtle">A memorable name → browsable P2P content. First claim wins; confusable look-alikes are rejected. Re-submitting a name you own updates its target.</div>
          </div>
        </div>
        <div className="tp-row">
          <input className="profile-input" placeholder="name (e.g. alice)" value=${a} onInput=${k=>l(k.target.value)} />
          <input className="profile-input" placeholder="64-hex key or hyper:// link" value=${u} onInput=${k=>o(k.target.value)} />
          <button className="btn small primary" onClick=${y} disabled=${h!=null||!a.trim()||!_}>${h==="submit"?"Saving\u2026":"Save"}</button>
        </div>
        ${n.length>0&&c`<div className="namereg-list">
          ${n.map(k=>c`
            <div className="settings-row" key=${k.normalized}>
              <div>
                <div className="settings-label">${k.name} <span className="src-badge self">pearname://${k.normalized}</span></div>
                <div className="settings-subtle" title=${k.link||k.key||k.target}>→ ${$e(k.link||k.key||k.target)} · v${k.version}</div>
              </div>
              <div>
                <button className="btn small" onClick=${()=>p(k.normalized)}>${S===k.normalized?"Copied":"Copy"}</button>
                <button className="btn small" onClick=${()=>m(t.CMD_NAMEREG_RELEASE,k.normalized)} disabled=${h!=null}>Release</button>
                <button className="btn subtle danger" onClick=${()=>m(t.CMD_NAMEREG_REVOKE,k.normalized)} disabled=${h!=null}>Revoke</button>
              </div>
            </div>`)}
	        </div>`}
	        ${r&&r.created&&n.length===0&&c`<div className="settings-subtle">No names yet — claim one above.</div>`}
	      </div>`}
      ${v&&c`<div className="tp-msg">${v}</div>`}
    </div>
  `}function Zh({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[r,i]=(0,d.useState)(null),[a,l]=(0,d.useState)(""),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)(""),[v,w]=(0,d.useState)(""),[S,b]=(0,d.useState)(""),C=j=>{o(j),setTimeout(()=>o(""),2200)},y=(j,K)=>{if(j)try{navigator.clipboard.writeText(j),b(K),setTimeout(()=>b(""),1500)}catch{}},m=async()=>{l("");try{s(await e.request(t.CMD_SYNC_STATUS))}catch(j){l(j.message),s({enabled:!0,paired:!1})}};(0,d.useEffect)(()=>{m()},[]);let p=async()=>{i("refresh");try{await m()}finally{i(null)}},_=async()=>{l(""),i("create");try{await e.request(t.CMD_SYNC_CREATE,{},6e4),await m(),C("Sync is on \u2014 this device is the first writer.")}catch(j){l(j.message)}finally{i(null)}},k=async()=>{let j=uc(h);if(!j){l("That is not a valid sync invite \u2014 expected sync://<64-hex>:<64-hex>.");return}l(""),i("join");try{await e.request(t.CMD_SYNC_JOIN,j,6e4),g(""),await m(),C("Paired. Copy this device\u2019s writer key below, then add it from a writer device.")}catch(K){l(K.message)}finally{i(null)}},T=async()=>{let j=(uc(v)?.key||v).trim().toLowerCase();l(""),i("writer");try{await e.request(t.CMD_SYNC_ADD_WRITER,{writerKey:j},6e4),w(""),C("Device added \u2014 it becomes a writer once it syncs.")}catch(K){l(K.message)}finally{i(null)}},$=async()=>{l(""),i("push");try{let j=await e.request(t.CMD_SYNC_PUSH_LOCAL,{},6e4);await m(),C(`Imported ${j?.pushed??0} local bookmark(s) into the synced set.`)}catch(j){l(j.message)}finally{i(null)}},E=async j=>{l(""),i("rm:"+j);try{await e.request(t.CMD_SYNC_REMOVE_BOOKMARK,{url:j},6e4),await m()}catch(K){l(K.message)}finally{i(null)}};if(n===null)return c`<div className="settings-card"><div className="settings-subtle">Loading…</div></div>`;let D=!!n.paired,x=!!n.writable,q=_f(n.key,n.encKey),X=Array.isArray(n.bookmarks)?n.bookmarks:[],Q=n.count&&Number.isFinite(n.count.bookmarks)?n.count.bookmarks:X.length;return c`
    <div className="settings-card">
      ${a&&c`<div className="apps-error">${a}</div>`}
      ${u&&c`<div className="apps-ok">${u}</div>`}

	      ${!D&&c`<div className="sync-setup">
	        <div className="settings-row">
	          <div>
	            <div className="settings-label">Set up sync on this device</div>
	            <div className="settings-subtle">Creates a private, encrypted bookmark store. This device becomes the first writer; pair your other devices to it.</div>
          </div>
          <button className="btn primary" onClick=${_} disabled=${r==="create"}>${r==="create"?"Setting up\u2026":"Set up sync"}</button>
        </div>
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">…or pair this device with another</div>
            <input className="profile-input" placeholder="sync://<key>:<encryption-key>" value=${h}
                   onInput=${j=>g(j.target.value)} onKeyDown=${j=>j.key==="Enter"&&k()} />
	          </div>
	          <button className="btn" onClick=${k} disabled=${r==="join"||!h.trim()}>${r==="join"?"Pairing\u2026":"Pair"}</button>
	        </div>
	      </div>`}

	      ${D&&c`<div className="sync-paired">
	        <div className="settings-row">
	          <div>
	            <div className="settings-label">Syncing ${x?"":c`<span className="settings-subtle">· read-only on this device</span>`}</div>
	            <div className="settings-subtle">${Q} bookmark(s) in the synced set</div>
          </div>
          <div className="settings-row-actions">
            <button className="btn subtle small" onClick=${p} disabled=${r==="refresh"} title="Re-check sync status (e.g. after another device added this one as a writer)">${r==="refresh"?"Refreshing\u2026":"Refresh"}</button>
            ${x&&c`<button className="btn subtle" onClick=${$} disabled=${r==="push"}>${r==="push"?"Importing\u2026":"Import local bookmarks"}</button>`}
          </div>
        </div>

        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">Pairing invite — open this on another device to sync it</div>
            <code className="settings-code">${q||"(unavailable)"}</code>
            <div className="settings-subtle">Carries your encryption key. Anyone with it can read your synced bookmarks — treat it like a password.</div>
          </div>
          <button className="btn small" onClick=${()=>y(q,"invite")} disabled=${!q}>${S==="invite"?"Copied":"Copy"}</button>
        </div>

        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">This device’s writer key${x?"":" \u2014 give it to a writer device to be added"}</div>
            <code className="settings-code">${n.writerKey||"(unavailable)"}</code>
          </div>
          <button className="btn small" onClick=${()=>y(n.writerKey,"writer")} disabled=${!n.writerKey}>${S==="writer"?"Copied":"Copy"}</button>
        </div>

        ${x&&c`
          <div className="settings-row">
            <div className="profile-field">
              <div className="settings-label">Add another device (paste its writer key)</div>
              <input className="profile-input" placeholder="64-hex writer key" value=${v}
                     onInput=${j=>w(j.target.value)} onKeyDown=${j=>j.key==="Enter"&&T()} />
            </div>
            <button className="btn" onClick=${T} disabled=${r==="writer"||!v.trim()}>${r==="writer"?"Adding\u2026":"Add device"}</button>
          </div>
        `}

        ${!x&&c`<div className="settings-subtle">This device is read-only until a writer device adds the key above. Synced bookmarks still replicate here in the meantime.</div>`}

	        ${X.length>0&&c`<div className="sync-bookmarks">
	          <div className="settings-row"><div className="settings-label">Synced bookmarks</div></div>
	          ${X.map(j=>c`
	            <div className="settings-row" key=${j.url}>
	              <div>
                <div className="settings-label">${j.title||j.url}</div>
                <div className="settings-subtle">${j.url}</div>
              </div>
	              ${x&&c`<button className="btn small subtle" onClick=${()=>E(j.url)} disabled=${r==="rm:"+j.url}>Remove</button>`}
	            </div>
	          `)}
	        </div>`}
	      </div>`}
    </div>
  `}function eg({rpc:e,C:t,activeDriveKey:n="",onBrowse:s}){let[r,i]=(0,d.useState)(!0),[a,l]=(0,d.useState)(null),[u,o]=(0,d.useState)([]),[h,g]=(0,d.useState)(!1),[v,w]=(0,d.useState)(""),[S,b]=(0,d.useState)(""),[C,y]=(0,d.useState)(""),[m,p]=(0,d.useState)(null),[_,k]=(0,d.useState)(null),[T,$]=(0,d.useState)({entries:[],sources:[]}),[E,D]=(0,d.useState)(""),x=typeof n=="string"&&/^[0-9a-f]{64}$/i.test(n)?n.toLowerCase():"";(0,d.useEffect)(()=>{let A=!1;e.request(t.CMD_USERDATA_GET_SETTINGS).then(we=>{if(A)return;let re=Pt(we);i(re?.contentShield!==!1)}).catch(()=>{});let L=()=>{let we=x?{driveKey:x}:{};e.request(t.CMD_SHIELD_STATUS,we).then(re=>{A||l(re)}).catch(()=>{}),t.CMD_PLUGIN_LIST!=null&&e.request(t.CMD_PLUGIN_LIST).then(re=>{A||o(re?.plugins||[])}).catch(()=>{}),t.CMD_PLUGIN_CATALOG!=null&&e.request(t.CMD_PLUGIN_CATALOG).then(re=>{!A&&re&&$({entries:re.entries||[],sources:re.sources||[]})}).catch(()=>{})};L();let ae=setInterval(L,5e3);return()=>{A=!0,clearInterval(ae)}},[e,t,x]);let q=async()=>{let A=!r;g(!0),w("");try{await e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{contentShield:A}}),i(A);let L=await e.request(t.CMD_SHIELD_STATUS,x?{driveKey:x}:{}).catch(()=>null);L&&l(L)}catch(L){w(`save: ${L.message}`)}finally{g(!1)}},X=async()=>{if(!(!x||t.CMD_SHIELD_SET_ALLOW==null)){g(!0),w("");try{let A=!(a&&a.driveAllowlisted);await e.request(t.CMD_SHIELD_SET_ALLOW,{driveKey:x,allow:A});let L=await e.request(t.CMD_SHIELD_STATUS,{driveKey:x}).catch(()=>null);L&&l(L)}catch(A){w(`allowlist: ${A.message}`)}finally{g(!1)}}},Q=async()=>{if(!(!x||t.CMD_SHIELD_SET_STRICT==null)){g(!0),w("");try{let A=!(a&&a.driveStrict);await e.request(t.CMD_SHIELD_SET_STRICT,{driveKey:x,strict:A});let L=await e.request(t.CMD_SHIELD_STATUS,{driveKey:x}).catch(()=>null);L&&l(L)}catch(A){w(`strict: ${A.message}`)}finally{g(!1)}}},j=async(A,L)=>{if(t.CMD_PLUGIN_SET_ENABLED!=null){g(!0),w("");try{await e.request(t.CMD_PLUGIN_SET_ENABLED,{id:A,enabled:!L});let ae=await e.request(t.CMD_PLUGIN_LIST).catch(()=>null);ae&&o(ae.plugins||[])}catch(ae){w(`plugin: ${ae.message}`)}finally{g(!1)}}},K=async()=>{let A=await e.request(t.CMD_SHIELD_STATUS,x?{driveKey:x}:{}).catch(()=>null);A&&l(A);let L=await e.request(t.CMD_PLUGIN_LIST).catch(()=>null);if(L&&o(L.plugins||[]),t.CMD_PLUGIN_CATALOG!=null){let ae=await e.request(t.CMD_PLUGIN_CATALOG).catch(()=>null);ae&&$({entries:ae.entries||[],sources:ae.sources||[]})}},O=async()=>{let A=S.trim().toLowerCase();if(!(!/^[0-9a-f]{64}$/.test(A)||t.CMD_SHIELD_SUBSCRIBE_LIST==null)){g(!0),w("");try{await e.request(t.CMD_SHIELD_SUBSCRIBE_LIST,{driveKey:A},3e4),b(""),await K()}catch(L){w(`subscribe: ${L.message}`)}finally{g(!1)}}},ne=async A=>{if(t.CMD_SHIELD_UNSUBSCRIBE_LIST!=null){g(!0),w("");try{await e.request(t.CMD_SHIELD_UNSUBSCRIBE_LIST,{driveKey:A}),await K()}catch(L){w(`unsubscribe: ${L.message}`)}finally{g(!1)}}},U=async A=>{if(t.CMD_SHIELD_REFRESH_LISTS!=null){g(!0),w("");try{await e.request(t.CMD_SHIELD_REFRESH_LISTS,A?{driveKey:A,force:!0}:{},3e4),await K()}catch(L){w(`refresh: ${L.message}`)}finally{g(!1)}}},ie=async(A,L=null)=>{let ae=String(A||"").trim().toLowerCase();if(!(!/^[0-9a-f]{64}$/.test(ae)||t.CMD_PLUGIN_INSTALL_DRIVE==null)){g(!0),w("");try{let we={driveKey:ae};L&&(we.granted=L.requested||[],we.reviewedFingerprint=L.fingerprint);let re=await e.request(t.CMD_PLUGIN_INSTALL_DRIVE,we,3e4);p(re&&re.consentRequired?re:null),await K()}catch(we){w(`install: ${we.message}`)}finally{g(!1)}}},de=async()=>{await ie(C),y("")},P=async()=>{let A=E.trim().toLowerCase();if(!(!/^[0-9a-f]{64}$/.test(A)||t.CMD_PLUGIN_CATALOG_LOAD_DRIVE==null)){g(!0),w("");try{await e.request(t.CMD_PLUGIN_CATALOG_LOAD_DRIVE,{driveKey:A},3e4),D(""),await K()}catch(L){w(`catalog: ${L.message}`)}finally{g(!1)}}},I=async A=>{if(t.CMD_PLUGIN_CATALOG_REMOVE_SOURCE!=null){g(!0),w("");try{await e.request(t.CMD_PLUGIN_CATALOG_REMOVE_SOURCE,{driveKey:A}),await K()}catch(L){w(`catalog: ${L.message}`)}finally{g(!1)}}},H=async(A,L=null)=>{if(t.CMD_PLUGIN_UPDATE_DRIVE!=null){g(!0),w("");try{let ae={driveKey:A};L&&(ae.granted=L.capabilities||[],ae.reviewedFingerprint=L.fingerprint);let we=await e.request(t.CMD_PLUGIN_UPDATE_DRIVE,ae,3e4);k(we&&we.escalated?{driveKey:A,...we}:null),await K()}catch(ae){w(`update: ${ae.message}`)}finally{g(!1)}}},M=async A=>{if(t.CMD_PLUGIN_UNINSTALL!=null){g(!0),w("");try{await e.request(t.CMD_PLUGIN_UNINSTALL,{driveKey:A}),_?.driveKey===A&&k(null),await K()}catch(L){w(`uninstall: ${L.message}`)}finally{g(!1)}}},B=a&&(a.listDetails||a.lists)||[],Y=Array.isArray(B)?B.map(A=>typeof A=="string"?A:A.name).join(", "):"";return c`
    <div className="settings-card" data-testid="content-shield-card">
      ${v&&c`<div className="apps-error">${v}</div>`}
      <div className="settings-row">
        <div>
          <div className="settings-label">Block ads and trackers</div>
          <div className="settings-subtle">Requests matching the shield's filter rules are refused inside the browser before any peer or relay is contacted, and matching page elements are hidden. Counters only — the shield never keeps a log of what you visit. Named lists hot-swap and reload offline after first acquisition.</div>
        </div>
        <label className="login-scope${r?" on":""}">
          <input type="checkbox" checked=${r} disabled=${h}
                 onChange=${q} data-testid="content-shield-toggle" />
        </label>
      </div>
      ${a&&c`
        <div className="settings-row">
          <div>
            <div className="settings-label" data-testid="content-shield-counters">${a.blocked} blocked · ${a.allowed} allowed this session</div>
            <div className="settings-subtle" data-testid="content-shield-lists">${a.blockRules} block · ${a.cosmeticRules} cosmetic · ${a.scriptletRules||0} scriptlet · lists: ${Y||"none"}</div>
          </div>
        </div>
      `}
      ${x&&c`
        <div className="settings-row" data-testid="content-shield-drive-controls">
          <div>
            <div className="settings-label">This drive (${x.slice(0,12)}…)</div>
            <div className="settings-subtle">Allowlist exempts only this drive from blocking. Strict mode injects a CSP that confines third-party subresources to the page origin.</div>
          </div>
          <div className="settings-inline-actions">
            <label className="login-scope${a?.driveAllowlisted?" on":""}" title="Allowlist this drive">
              <span className="settings-subtle">Allow</span>
              <input type="checkbox" checked=${!!a?.driveAllowlisted} disabled=${h}
                     onChange=${X} data-testid="content-shield-allow-toggle" />
            </label>
            <label className="login-scope${a?.driveStrict?" on":""}" title="Strict third-party mode">
              <span className="settings-subtle">Strict</span>
              <input type="checkbox" checked=${!!a?.driveStrict} disabled=${h}
                     onChange=${Q} data-testid="content-shield-strict-toggle" />
            </label>
          </div>
        </div>
      `}
      ${a&&Array.isArray(a.topRules)&&a.topRules.length>0&&c`
        <div className="settings-subtle">Top rules: ${a.topRules.slice(0,3).map(A=>`${A.rule} (${A.hits})`).join(" \xB7 ")}</div>
      `}

      <div className="settings-row" data-testid="content-shield-list-sync">
        <div style=${{width:"100%"}}>
          <div className="settings-label">Filter lists from the swarm</div>
          <div className="settings-subtle">Subscribe to a filter-list Hyperdrive by key. Rules sync peer-to-peer, hot-swap when the publisher updates, and keep working offline — no CDN, no list-fetch fingerprint.</div>
          <div className="settings-row">
            <div className="profile-field" style=${{flex:1}}>
              <input className="profile-input" placeholder="64-hex filter-list drive key" value=${S}
                     data-testid="content-shield-subscribe-input"
                     onInput=${A=>b(A.target.value)}
                     onKeyDown=${A=>A.key==="Enter"&&O()} />
            </div>
            <button className="btn" data-testid="content-shield-subscribe" onClick=${O}
                    disabled=${h||!/^[0-9a-f]{64}$/i.test(S.trim())}>Subscribe</button>
            <button className="btn subtle" onClick=${()=>U()} disabled=${h||!a?.subscriptions?.length}>Refresh all</button>
          </div>
          ${(a?.subscriptions||[]).map(A=>c`
            <div className="settings-row" key=${A.driveKey} data-testid=${"shield-list-row-"+A.driveKey}>
              <div>
                <div className="settings-label">${A.name||A.driveKey.slice(0,12)+"\u2026"}${A.version?` \xB7 v${A.version}`:""}</div>
                <div className="settings-subtle">${A.rules||0} rules · ${A.driveKey.slice(0,16)}…</div>
              </div>
              <div className="settings-inline-actions">
                <button className="btn small subtle" onClick=${()=>U(A.driveKey)} disabled=${h}>Refresh</button>
                <button className="btn small subtle danger" onClick=${()=>ne(A.driveKey)} disabled=${h}>Remove</button>
              </div>
            </div>
          `)}
        </div>
      </div>

      <div className="settings-row" data-testid="plugin-catalog">
        <div style=${{width:"100%"}}>
          <div className="settings-label">Plugin catalog</div>
          <div className="settings-subtle">Curated plugins and AI add-ons you can add yourself. Installing a plugin shows its declared capabilities and records your grant; app entries open as ordinary P2P apps gated by their own manifests. Load more catalogues from a drive key below.</div>
          ${T.entries.map(A=>c`
            <div className="settings-row" key=${A.id} data-testid=${"catalog-entry-"+A.id}>
              <div>
                <div className="settings-label">${A.name}${A.source==="builtin"&&A.verified?c`<span title="Curated entry" style=${{marginLeft:"5px",color:"#3fb950",fontSize:"12px"}}>✦</span>`:""}</div>
                <div className="settings-subtle">${A.description}</div>
                <div className="settings-subtle">${A.kind==="app"?"P2P app":"plugin"}${A.capabilities?.length?` \xB7 ${A.capabilities.join(", ")}`:""}${A.source!=="builtin"?` \xB7 from ${String(A.source).slice(0,8)}\u2026`:""}</div>
              </div>
              <div className="settings-inline-actions">
                ${A.kind==="app"&&A.driveKey&&c`
                  <button className="btn small" data-testid=${"catalog-open-"+A.id}
                          onClick=${()=>s&&s(`hyper://${A.driveKey}/`)}
                          disabled=${h||!s}>Open</button>
                `}
                ${A.kind==="plugin"&&A.driveKey&&!A.installed&&c`
                  <button className="btn small" data-testid=${"catalog-install-"+A.id}
                          onClick=${()=>ie(A.driveKey)} disabled=${h}>Install</button>
                `}
                ${A.kind==="plugin"&&A.installed&&c`<span className="settings-subtle">Installed</span>`}
                ${A.kind==="plugin"&&!A.driveKey&&c`<span className="settings-subtle" title=${A.unpublished?`Publish ${A.unpublished} to enable`:""}>Publish pending</span>`}
              </div>
            </div>
          `)}
          <div className="settings-row">
            <div className="profile-field" style=${{flex:1}}>
              <input className="profile-input" placeholder="64-hex catalogue drive key" value=${E}
                     data-testid="plugin-catalog-source-input"
                     onInput=${A=>D(A.target.value)}
                     onKeyDown=${A=>A.key==="Enter"&&P()} />
            </div>
            <button className="btn subtle" data-testid="plugin-catalog-load" onClick=${P}
                    disabled=${h||!/^[0-9a-f]{64}$/i.test(E.trim())}>Load catalogue</button>
          </div>
          ${T.sources.map(A=>c`
            <div className="settings-row" key=${A.driveKey}>
              <div className="settings-subtle">${A.name} · ${A.entryCount} entries · ${A.driveKey.slice(0,16)}…</div>
              <button className="btn small subtle danger" onClick=${()=>I(A.driveKey)} disabled=${h}>Remove</button>
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
              <input className="profile-input" placeholder="64-hex plugin drive key" value=${C}
                     data-testid="plugin-install-input"
                     onInput=${A=>y(A.target.value)}
                     onKeyDown=${A=>A.key==="Enter"&&de()} />
            </div>
            <button className="btn" data-testid="plugin-install" onClick=${de}
                    disabled=${h||!/^[0-9a-f]{64}$/i.test(C.trim())}>Install</button>
          </div>
          ${m&&c`
            <div className="apps-error" data-testid="plugin-install-consent">
              ${m.name} ${m.version?`v${m.version}`:""} requests:
              ${(m.requested||[]).join(", ")||"no capabilities"}.
              Review this grant before installing; catalogue labels are not trusted permissions.
              <button className="btn small" onClick=${()=>ie(m.driveKey,m)} disabled=${h}>Grant and install</button>
              <button className="btn small subtle" onClick=${()=>p(null)} disabled=${h}>Cancel</button>
            </div>
          `}
          ${_&&c`
            <div className="apps-error" data-testid="plugin-escalation">
              Update for ${_.driveKey.slice(0,12)}… requests new capabilities: ${_.added.join(", ")}.
              ${_.changedSinceReview?" The plugin changed after the previous review; inspect this new request.":""}
              <button className="btn small" onClick=${()=>H(_.driveKey,_)} disabled=${h}>Accept and re-enable</button>
            </div>
          `}
          ${u.map(A=>c`
            <div className="settings-row" key=${A.id} data-testid=${"plugin-row-"+A.id}>
              <div>
                <div className="settings-label">${A.name||A.id}</div>
                <div className="settings-subtle">${(A.capabilities||[]).join(", ")||"no capabilities"}${A.version?` \xB7 v${A.version}`:""}</div>
              </div>
              <div className="settings-inline-actions">
                ${/^[0-9a-f]{64}$/.test(A.id)&&c`
                  <button className="btn small subtle" data-testid=${"plugin-update-"+A.id} onClick=${()=>H(A.id)} disabled=${h}>Update</button>
                  <button className="btn small subtle danger" data-testid=${"plugin-uninstall-"+A.id} onClick=${()=>M(A.id)} disabled=${h}>Uninstall</button>
                `}
                <label className="login-scope${A.enabled?" on":""}">
                  <input type="checkbox" checked=${!!A.enabled} disabled=${h}
                         onChange=${()=>j(A.id,A.enabled)} data-testid=${"plugin-enabled-"+A.id} />
                </label>
              </div>
            </div>
          `)}
        </div>
      </div>
    </div>
  `}function tg({rpc:e,C:t}){let[n,s]=(0,d.useState)({httpsOnly:!0,stripTrackingParams:!0,blockThirdPartyCookies:!0,fingerprintFarbling:!0,clearnetMode:"proxy",historyEnabled:!1,searchIndexEnabled:!1,telemetryEnabled:!1,contentShield:!0}),[r,i]=(0,d.useState)(null),[a,l]=(0,d.useState)(!1),[u,o]=(0,d.useState)("");(0,d.useEffect)(()=>{let v=!1;return e.request(t.CMD_USERDATA_GET_SETTINGS).then(w=>{if(v)return;let S=Pt(w)||{};s(b=>({...b,httpsOnly:S.httpsOnly!==!1,stripTrackingParams:S.stripTrackingParams!==!1,blockThirdPartyCookies:S.blockThirdPartyCookies!==!1,fingerprintFarbling:S.fingerprintFarbling!==!1,clearnetMode:S.clearnetMode==="direct"?"direct":"proxy",historyEnabled:S.historyEnabled===!0,searchIndexEnabled:S.searchIndexEnabled===!0,telemetryEnabled:!1,contentShield:S.contentShield!==!1}))}).catch(()=>{}),t.CMD_PRIVACY_STATUS!=null&&e.request(t.CMD_PRIVACY_STATUS).then(w=>{v||i(w)}).catch(()=>{}),()=>{v=!0}},[e,t]);let h=async v=>{let w={...n,...v,telemetryEnabled:!1};l(!0),o("");try{if(await e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:w}),s(w),t.CMD_PRIVACY_STATUS!=null){let S=await e.request(t.CMD_PRIVACY_STATUS).catch(()=>null);S&&i(S)}}catch(S){o(`save: ${S.message}`)}finally{l(!1)}},g=v=>{v!=="telemetryEnabled"&&h({[v]:!n[v]})};return c`
    <div className="settings-card" data-testid="privacy-clearnet-card">
      ${u&&c`<div className="apps-error">${u}</div>`}
      <div className="settings-row" data-testid="privacy-zero-collection">
        <div>
          <div className="settings-label">Zero remote data collection</div>
          <div className="settings-subtle">PearBrowser does not ship telemetry, crash beacons, usage analytics, or third-party trackers in the browser chrome. Nothing you browse is sent to a PearBrowser server — there is no PearBrowser server for that.</div>
        </div>
        <span className="settings-subtle" data-testid="privacy-telemetry-status">Telemetry: never</span>
      </div>
      ${[["historyEnabled","Save browsing history (opt-in)","OFF by default. When enabled, visited URLs are stored only on this device in your local Hyperbee. Disabling clears stored history."],["searchIndexEnabled","Index pages for local search (opt-in)","OFF by default. When enabled, text from hyper:// pages you open is indexed on-device for Library search. No query ever leaves the device."],["contentShield","Block ads and trackers","ON by default. Refuses known ad/tracker requests inside the browser before peers or the network are contacted."],["httpsOnly","HTTPS-only mode","Upgrade http:// navigations to https:// before loading."],["stripTrackingParams","Strip tracking parameters","Remove utm_*, fbclid, gclid and similar click-ids from URLs."],["blockThirdPartyCookies","Block third-party cookies (proxy)","Drop Set-Cookie from proxied clearnet responses so sites cannot share a jar with hyper tabs."],["fingerprintFarbling","Fingerprint farbling","Noise canvas/audio fingerprints on proxied pages (per-origin seed)."]].map(([v,w,S])=>c`
        <div className="settings-row" key=${v}>
          <div>
            <div className="settings-label">${w}</div>
            <div className="settings-subtle">${S}</div>
          </div>
          <label className=${"login-scope"+(n[v]?" on":"")}>
            <input type="checkbox" checked=${!!n[v]} disabled=${a}
                   onChange=${()=>g(v)} data-testid=${"privacy-"+v} />
          </label>
        </div>
      `)}
      <div className="settings-row">
        <div>
          <div className="settings-label">Clearnet mode</div>
          <div className="settings-subtle">Proxy (default): https pages load through the browser proxy so Content Shield blocks ads/trackers. Direct: load the real https URL (shields need a future session bridge).</div>
        </div>
        <div className="theme-segmented" role="group" aria-label="Clearnet mode">
          ${["proxy","direct"].map(v=>c`
            <button key=${v} type="button"
              className=${"theme-segment"+(n.clearnetMode===v?" active":"")}
              data-testid=${"clearnet-mode-"+v}
              disabled=${a}
              onClick=${()=>h({clearnetMode:v})}>
              ${v==="proxy"?"Proxy + shield":"Direct"}
            </button>
          `)}
        </div>
      </div>
      ${r&&c`
        <div className="settings-subtle" data-testid="privacy-session-status">
          Data collection: telemetry=${String(r.dataCollection?.telemetry??!1)}
          · history=${String(r.dataCollection?.history??!1)}
          · searchIndex=${String(r.dataCollection?.searchIndex??!1)}
          · shield=${r.privacy?.contentShield!==!1?"on":"off"}
          ${r.session?.proxyPort?` \xB7 proxy :${r.session.proxyPort}`:""}
        </div>
      `}
    </div>
  `}function ng({rpc:e,C:t,activeUrl:n,onOpenSettings:s}){let[r,i]=(0,d.useState)(null),a=(0,d.useMemo)(()=>{let v=String(n||"").match(/(?:hyper:\/\/|\/(?:hyper|app)\/)([0-9a-fA-F]{64})/);return v?v[1].toLowerCase():""},[n]);if((0,d.useEffect)(()=>{if(!e||!t?.CMD_SHIELD_STATUS)return;let v=!1,w=()=>{e.request(t.CMD_SHIELD_STATUS,a?{driveKey:a}:{}).then(b=>{v||i(b)}).catch(()=>{})};w();let S=setInterval(w,4e3);return()=>{v=!0,clearInterval(S)}},[e,t,a]),!r)return null;let l=r.blocked||0,u=r.enabled!==!1,o=!!(a&&r.driveAllowlisted),h=u?o?"Allowlisted":`${l}`:"Shield off",g=u?o?"This drive is allowlisted \u2014 click for shield settings":`${l} blocked this session \u2014 click for shield settings`:"Content Shield is off";return c`
    <button
      type="button"
      className=${`nav shield-chip${u?" on":""}${o?" allowlisted":""}`}
      data-testid="shield-status-chip"
      title=${g}
      onClick=${()=>s&&s()}
    >🛡 ${h}</button>
  `}function sg({rpc:e,C:t,onAutobeeChange:n,onDeviceSyncChange:s}){let[r,i]=(0,d.useState)(!1),[a,l]=(0,d.useState)(!1),[u,o]=(0,d.useState)(!1),[h,g]=(0,d.useState)(null),[v,w]=(0,d.useState)("");(0,d.useEffect)(()=>{e.request(t.CMD_USERDATA_GET_SETTINGS).then(b=>{let C=Pt(b);i(!!C?.experimentalNaming),l(!!C?.experimentalAutobeeCatalogs),o(!!C?.experimentalDeviceSync)}).catch(()=>{})},[]);let S=async(b,C,y,m)=>{g(b),w("");try{await e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{[b]:C}}),y(C),m?.(C)}catch(p){w(`save: ${p.message}`)}finally{g(null)}};return c`
    <div className="settings-card">
      ${v&&c`<div className="apps-error">${v}</div>`}
      <div className="settings-row">
        <div>
          <div className="settings-label">Names (petnames)</div>
          <div className="settings-subtle">Type friendly names like <code>keet</code> in the address bar instead of 52-character keys. Resolves your own saved petnames plus a curated set of well-known names, fully local — a provenance chip shows how each name resolved. Experimental.</div>
        </div>
        <label className="login-scope${r?" on":""}">
          <input type="checkbox" checked=${r} disabled=${h==="experimentalNaming"}
                 onChange=${()=>S("experimentalNaming",!r,i)} />
        </label>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Collaborative catalogs (experimental)</div>
          <div className="settings-subtle">Co-edit app catalogs using the existing Autobase format. Its <code>autobee://</code> keys are not compatible with new Autobee 2 catalogs. Reachable only while a writer is online until relay pinning is supported.</div>
        </div>
        <label className="login-scope${a?" on":""}">
          <input type="checkbox" checked=${a} disabled=${h==="experimentalAutobeeCatalogs"}
                 onChange=${()=>S("experimentalAutobeeCatalogs",!a,l,n)} />
        </label>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Device sync (encrypted bookmarks)</div>
          <div className="settings-subtle">Sync your bookmarks across your own devices, encrypted end-to-end with no server or account. Once enabled, pair devices in the <strong>Device sync</strong> section below. Experimental — your synced data is readable only on devices that hold the pairing invite.</div>
        </div>
        <label className="login-scope${u?" on":""}">
          <input type="checkbox" checked=${u} disabled=${h==="experimentalDeviceSync"}
                 onChange=${()=>S("experimentalDeviceSync",!u,o,s)} />
        </label>
      </div>
    </div>
  `}function sm(){return c`
    <span style=${{padding:"4px 8px",borderRadius:"6px",background:"#e25822",color:"#fff",fontSize:"11px",fontWeight:700,letterSpacing:"0.05em",whiteSpace:"nowrap"}}
          data-testid="wallet-testnet-badge">TESTNET · NO REAL FUNDS</span>
  `}function rg({rpc:e,C:t,onChanged:n,onError:s,onNotice:r}){let[i,a]=(0,d.useState)(""),[l,u]=(0,d.useState)(""),[o,h]=(0,d.useState)(null),[g,v]=(0,d.useState)(!1),[w,S]=(0,d.useState)(""),[b,C]=(0,d.useState)(""),[y,m]=(0,d.useState)(""),p=Uf(i),_=g?Pf(w):null,k=!!(_&&_.length===24),T=async()=>{if(!(!Jn(i)||i!==l||o)){s(""),h("create");try{await e.request(t.CMD_WALLET_CREATE,{passphrase:i},12e4),a(""),u(""),n(),r("Wallet created. Now back it up: open \u201CBack up\u2026\u201D below, write the 24 words down offline and keep them safe \u2014 they are the only way back if the passphrase is lost.")}catch(E){s(Lt(E))}finally{h(null)}}},$=async()=>{if(!(!k||!Jn(b)||b!==y||o)){s(""),h("import");try{await e.request(t.CMD_WALLET_IMPORT,{passphrase:b,mnemonicB64:Mf(_.join(" "))},12e4),S(""),C(""),m(""),v(!1),n(),r("Wallet imported. Unlock it with your new passphrase to use it.")}catch(E){s(Lt(E))}finally{h(null)}}};return c`
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
      <input className="profile-input" type="password" placeholder="Passphrase" value=${i}
             autoComplete="new-password" data-testid="wallet-create-passphrase"
             onInput=${E=>a(E.target.value)} />
      <input className="profile-input" type="password" placeholder="Confirm passphrase" value=${l}
             autoComplete="new-password" data-testid="wallet-create-confirm"
             onInput=${E=>u(E.target.value)} />
      <div className="settings-subtle" data-testid="wallet-create-strength">
        ${i?`Strength: ${p.label} \u2014 ${p.hint}`:`A passphrase of at least ${zr} characters is required \u2014 a short sentence works well.`}
      </div>
      ${i&&!Jn(i)&&c`<div className="apps-error">Passphrase must be at least ${zr} characters long.</div>`}
      ${l&&i!==l&&c`<div className="apps-error">Passphrases do not match.</div>`}
      <div className="restore-actions">
        <button className="btn primary" onClick=${T} disabled=${!Jn(i)||i!==l||o!==null} data-testid="wallet-create-submit">
          ${o==="create"?"Creating\u2026":"Create wallet"}
        </button>
      </div>
    </div>
    <div className="settings-row">
      <div>
        <div className="settings-label">Import from recovery phrase</div>
        <div className="settings-subtle">Restore an existing wallet from its 24-word recovery phrase and protect it with a new passphrase.</div>
      </div>
      <button className="btn subtle" onClick=${()=>{v(E=>!E),s("")}} disabled=${o==="import"} data-testid="wallet-import-toggle">
        ${g?"Cancel":"Import\u2026"}
      </button>
    </div>
    ${g&&c`
      <div className="restore-form">
        <textarea className="restore-textarea" rows="3" spellCheck="false" autoCapitalize="none"
                  placeholder="Paste your 24-word recovery phrase here, separated by spaces"
                  value=${w} data-testid="wallet-import-mnemonic"
                  onInput=${E=>S(E.target.value)}></textarea>
        ${w.trim()&&!k&&c`<div className="apps-error">Enter the full 24-word recovery phrase.</div>`}
        <input className="profile-input" type="password" placeholder="New passphrase for this device" value=${b}
               autoComplete="new-password" data-testid="wallet-import-passphrase"
               onInput=${E=>C(E.target.value)} />
        <input className="profile-input" type="password" placeholder="Confirm new passphrase" value=${y}
               autoComplete="new-password" data-testid="wallet-import-confirm"
               onInput=${E=>m(E.target.value)} />
        ${b&&!Jn(b)&&c`<div className="apps-error">Passphrase must be at least ${zr} characters long.</div>`}
        ${y&&b!==y&&c`<div className="apps-error">Passphrases do not match.</div>`}
        <div className="restore-actions">
          <button className="btn primary" onClick=${$} disabled=${!k||!Jn(b)||b!==y||o!==null} data-testid="wallet-import-submit">
            ${o==="import"?"Importing\u2026":"Import wallet"}
          </button>
        </div>
        <div className="settings-warning">The phrase is imported on-device and never sent anywhere. Anyone with these words controls the wallet.</div>
      </div>
    `}
  `}function ig({rpc:e,C:t,onChanged:n,onError:s,onNotice:r}){let[i,a]=(0,d.useState)(""),[l,u]=(0,d.useState)(null),[o,h]=(0,d.useState)(!1),[g,v]=(0,d.useState)(""),[w,S]=(0,d.useState)(null),b=(0,d.useRef)(null);b.current=w,(0,d.useEffect)(()=>()=>{let p=b.current;p&&e.request(t.CMD_WALLET_BACKUP,{phase:"finish",ceremonyId:p.ceremonyId,outcome:"cancel"}).catch(()=>{})},[e,t]);let C=async()=>{if(!(!i||l)){s(""),u("unlock");try{await e.request(t.CMD_WALLET_UNLOCK,{passphrase:i},12e4),a(""),n()}catch(p){s(Lt(p))}finally{u(null)}}},y=async()=>{if(!(!g||l)){s(""),u("backup");try{let p=await e.request(t.CMD_WALLET_BACKUP,{phase:"begin",passphrase:g},12e4),_=Of(p.mnemonicB64);if(!_)throw new Error("could not decode the recovery phrase");S({ceremonyId:p.ceremonyId,words:_.split(" ")}),v(""),h(!1)}catch(p){s(Lt(p))}finally{u(null)}}},m=async p=>{let _=w;if(S(null),!!_){s(""),u("backup-finish");try{await e.request(t.CMD_WALLET_BACKUP,{phase:"finish",ceremonyId:_.ceremonyId,outcome:p}),p==="complete"&&r("Backup complete. The phrase is gone from this screen \u2014 it is your only way back if the passphrase is lost.")}catch(k){s(Lt(k))}finally{u(null)}}};return w?c`
      <div className="settings-card" data-testid="wallet-backup-ceremony">
        <div className="settings-row">
          <div>
            <div className="settings-label">Your recovery phrase <${sm} /></div>
            <div className="settings-subtle">Shown once, on this device only — it never leaves the device and is cleared from the screen when you finish or cancel.</div>
          </div>
        </div>
        <div className="seed-phrase" style=${{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"6px 12px"}} data-testid="wallet-backup-words">
          ${w.words.map((p,_)=>c`<div key=${_}><span className="settings-subtle">${_+1}.</span> ${p}</div>`)}
        </div>
        <div className="settings-warning">
          Write these ${w.words.length} words down offline, in order. Anyone with them controls this wallet — never type them into a website or show them on a shared screen.
        </div>
        <div className="restore-actions">
          <button className="btn subtle" onClick=${()=>m("cancel")} disabled=${l==="backup-finish"} data-testid="wallet-backup-cancel">Cancel</button>
          <button className="btn primary" onClick=${()=>m("complete")} disabled=${l==="backup-finish"} data-testid="wallet-backup-done">
            ${l==="backup-finish"?"Finishing\u2026":"I have written it down"}
          </button>
        </div>
      </div>
    `:c`
    <div className="settings-row">
      <div>
        <div className="settings-label">Unlock wallet</div>
        <div className="settings-subtle">The wallet auto-locks after 15 minutes idle. Unlocking never exposes the keys — apps still need your per-action approval.</div>
      </div>
    </div>
    <div className="restore-form">
      <input className="profile-input" type="password" placeholder="Passphrase" value=${i}
             autoComplete="current-password" data-testid="wallet-unlock-passphrase"
             onInput=${p=>a(p.target.value)}
             onKeyDown=${p=>p.key==="Enter"&&C()} />
      <div className="restore-actions">
        <button className="btn primary" onClick=${C} disabled=${!i||l!==null} data-testid="wallet-unlock-submit">
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
        ${o?"Cancel":"Back up\u2026"}
      </button>
    </div>
    ${o&&c`
      <div className="restore-form">
        <input className="profile-input" type="password" placeholder="Passphrase" value=${g}
               autoComplete="current-password" data-testid="wallet-backup-passphrase"
               onInput=${p=>v(p.target.value)} />
        <div className="restore-actions">
          <button className="btn primary" onClick=${y} disabled=${!g||l!==null} data-testid="wallet-backup-begin">
            ${l==="backup"?"Verifying\u2026":"Reveal phrase"}
          </button>
        </div>
      </div>
    `}
  `}function ag({rpc:e,C:t,status:n,onChanged:s,onError:r}){let[i,a]=(0,d.useState)(null),[l,u]=(0,d.useState)([]),[o,h]=(0,d.useState)([]),[g,v]=(0,d.useState)(null),[w,S]=(0,d.useState)(!1),b=$=>{let E=String($?.message||$||"").toLowerCase();return E.includes("wallet-locked")||E.includes("wallet is locked")?(s(),!0):!1},C=()=>e.request(t.CMD_WALLET_BALANCES).then(a).catch($=>{b($)||a({unavailable:!0,code:"unavailable"})}),y=()=>e.request(t.CMD_WALLET_TRANSACTIONS,{limit:20}).then($=>u($?.transactions||[])).catch($=>{b($)}),m=()=>e.request(t.CMD_WALLET_CONNECTIONS_LIST).then($=>h($?.connections||[])).catch($=>{b($)});(0,d.useEffect)(()=>{C(),y(),m()},[e,t]);let p=()=>{if(n.address)try{navigator.clipboard.writeText(n.address),S(!0),setTimeout(()=>S(!1),1500)}catch{}},_=async()=>{r(""),v("lock");try{await e.request(t.CMD_WALLET_LOCK),s()}catch($){r(Lt($))}finally{v(null)}},k=async $=>{let E=$.driveKey;r(""),v(E);try{await e.request(t.CMD_WALLET_CONNECTION_REVOKE,{browserSessionId:$.browserSessionId,tabId:$.tabId,driveKey:$.driveKey}),await m()}catch(D){r(Lt(D))}finally{v(null)}},T=async()=>{v("balances");try{await C()}finally{v(null)}};return c`
    <div className="settings-row">
      <div>
        <div className="settings-label">Address</div>
        <code className="settings-code" title=${n.address||""} data-testid="wallet-address">${Ra(n.address||"")}</code>
      </div>
      <button className="btn small subtle" onClick=${p} disabled=${!n.address} data-testid="wallet-address-copy">
        ${w?"Copied":"Copy"}
      </button>
    </div>
    <div className="settings-row">
      <div>
        <div className="settings-label">Balances</div>
        ${i===null&&c`<div className="settings-subtle">Loading…</div>`}
        ${i&&i.unavailable&&c`
          <div className="settings-subtle" data-testid="wallet-balances-unavailable">
            Unavailable — the testnet RPC is not reachable right now. Funds are safe; retry when online.
          </div>
        `}
        ${i&&!i.unavailable&&c`
          <div className="settings-subtle" data-testid="wallet-balances">
            ${Xn(i.paymentAmountAtomic,6)} USD₮0 (test payment token)
            · ${Xn(i.nativeFeeAmountAtomic,18)} native (test gas)
          </div>
        `}
      </div>
      <button className="btn small subtle" onClick=${T} disabled=${g!==null} data-testid="wallet-balances-refresh">
        ${g==="balances"?"Refreshing\u2026":"Refresh"}
      </button>
    </div>
    <div className="settings-row">
      <div style=${{width:"100%"}}>
        <div className="settings-label">Recent activity</div>
        ${l.length===0?c`<div className="settings-subtle" data-testid="wallet-activity-empty">No wallet activity yet.</div>`:c`
            <div data-testid="wallet-activity">
              ${l.map(($,E)=>c`
                <div className="settings-row" key=${$.intentId||E} style=${{paddingTop:"4px",paddingBottom:"4px"}}>
                  <div>
                    <div className="settings-label" style=${{fontSize:"13px"}}>${Bf($)}</div>
                    <div className="settings-subtle">
                      ${$.ts?new Date($.ts).toLocaleString():""}
                      ${$.amountAtomic?` \xB7 ${Xn($.amountAtomic,6)} USD\u20AE0 \u2192 ${Ra($.recipient||"")}`:""}
                      ${$.transactionHash?` \xB7 tx ${Ra($.transactionHash)}`:""}
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
        ${o.length===0?c`<div className="settings-subtle" data-testid="wallet-connections-empty">No apps connected.</div>`:c`
            <div data-testid="wallet-connections">
              ${o.map($=>c`
                <div className="settings-row" key=${$.driveKey+":"+$.tabId} style=${{paddingTop:"4px",paddingBottom:"4px"}}>
                  <div>
                    <div className="settings-label" style=${{fontSize:"13px"}}>${$.appName||$e($.driveKey)}</div>
                    <div className="settings-subtle">
                      ${$.appName?`${$e($.driveKey)} \xB7 `:""}
                      ${["connect",$.permissions?.pay&&"pay",$.permissions?.signApp&&"sign"].filter(Boolean).join(" \xB7 ")}
                      ${$.connectedAt?` \xB7 since ${new Date($.connectedAt).toLocaleDateString()}`:""}
                    </div>
                  </div>
                  <button className="btn small subtle danger" onClick=${()=>k($)} disabled=${g!==null} data-testid=${"wallet-revoke-"+$.driveKey.slice(0,8)}>
                    ${g===$.driveKey?"Revoking\u2026":"Revoke"}
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
      <button className="btn subtle danger" onClick=${_} disabled=${g!==null} data-testid="wallet-lock">
        ${g==="lock"?"Locking\u2026":"Lock"}
      </button>
    </div>
  `}function lg({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[r,i]=(0,d.useState)(""),[a,l]=(0,d.useState)(""),[u,o]=(0,d.useState)(!1),[h,g]=(0,d.useState)(!1),v=()=>{e.request(t.CMD_WALLET_STATUS).then(C=>{s(C),i(y=>y&&y.startsWith("status:")?"":y)}).catch(C=>{s(null),i("status: "+Lt(C))})};(0,d.useEffect)(()=>{v(),e.request(t.CMD_USERDATA_GET_SETTINGS).then(C=>o(!!Pt(C)?.experimentalWalletWdk)).catch(()=>{})},[e,t]);let w=()=>{l(""),v()},S=async()=>{i(""),g(!0);try{await e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{experimentalWalletWdk:!u}}),o(!u)}catch(C){i(Lt(C))}finally{g(!1)}},b=n?.state||"absent";return c`
    <div className="settings-card" data-testid="wallet-card">
      <div className="settings-row">
        <div>
          <div className="settings-label">Testnet wallet <${sm} /></div>
          <div className="settings-subtle">
            ${n===null&&"Wallet status unavailable."}
            ${n&&b==="absent"&&"No wallet on this device yet."}
            ${n&&b==="locked"&&"Wallet locked."}
            ${n&&b==="unlocked"&&"Wallet unlocked."}
            ${n?.networkId?` Network: ${n.networkId}.`:""}
          </div>
        </div>
        ${n===null&&c`
          <button className="btn small subtle" onClick=${v} data-testid="wallet-status-retry">Retry</button>
        `}
      </div>
      ${r&&c`<div className="apps-error">${r.replace(/^status: /,"")}</div>`}
      ${a&&c`<div className="apps-ok">${a}</div>`}
      ${n&&b==="absent"&&c`<${rg} rpc=${e} C=${t} onChanged=${w} onError=${i} onNotice=${l} />`}
      ${n&&b==="locked"&&c`<${ig} rpc=${e} C=${t} onChanged=${w} onError=${i} onNotice=${l} />`}
      ${n&&b==="unlocked"&&c`<${ag} rpc=${e} C=${t} status=${n} onChanged=${w} onError=${i} />`}
      <div className="settings-row">
        <div>
          <div className="settings-label">Wallet provider for apps</div>
          <div className="settings-subtle">Enables the wallet provider injection for apps that declare wallet permissions (connect / pay / app-sign). Turning this off stops new wallet connections — it does <strong>not</strong> delete your wallet or affect your recovery phrase.</div>
        </div>
        <label className="login-scope${u?" on":""}">
          <input type="checkbox" checked=${u} disabled=${h}
                 onChange=${S} data-testid="wallet-experimental-toggle" />
        </label>
      </div>
    </div>
  `}function og({rpc:e,C:t,status:n,storagePath:s,log:r,appearanceTheme:i,onAppearanceThemeChange:a,activeDriveKey:l="",onBrowse:u}){let[o,h]=(0,d.useState)(null),[g,v]=(0,d.useState)(null),[w,S]=(0,d.useState)(""),[b,C]=(0,d.useState)(null),[y,m]=(0,d.useState)(!1),[p,_]=(0,d.useState)(""),[k,T]=(0,d.useState)(""),[$,E]=(0,d.useState)(!1),[D,x]=(0,d.useState)(""),[q,X]=(0,d.useState)(!1),[Q,j]=(0,d.useState)(""),[K,O]=(0,d.useState)(""),ne=t?.CMD_GET_IDENTITY??31,U=t?.CMD_IDENTITY_EXPORT_PHRASE??70,ie=t?.CMD_IDENTITY_IMPORT_PHRASE??71,de=t?.CMD_IDENTITY_VALIDATE_PHRASE??73,P=t?.CMD_DEVICE_LINK_CREATE_INVITE??76,I=t?.CMD_DEVICE_LINK_JOIN??77,H=t?.CMD_CLEAR_CACHE??30,M=t?.CMD_RESET_APP??29,B=()=>e.request(ne).then(h).catch(G=>S(G.message));(0,d.useEffect)(()=>{B()},[]),(0,d.useEffect)(()=>{e.request(t.CMD_USERDATA_GET_SETTINGS).then(G=>E(!!Pt(G)?.experimentalDeviceSync)).catch(()=>{})},[]);let Y=async()=>{if(g){v(null);return}S(""),C("reveal");try{let G=await e.request(U);v(G.mnemonic)}catch(G){S(G.message)}finally{C(null)}},A=async()=>{let G=p.trim().split(/\s+/).join(" ");if(G){S(""),T(""),C("restore-validate");try{if(!(await e.request(de,{mnemonic:G}))?.valid){S("That phrase is not a valid 12 or 24-word BIP-39 mnemonic."),C(null);return}}catch(fe){S(`validate: ${fe.message}`),C(null);return}if(!confirm(`Restoring will REPLACE this device's identity.

All Hyperbees (bookmarks, history, profile, contacts) on this device stay in place but get re-keyed under the restored identity. This cannot be undone unless you also kept the previous backup phrase.

Proceed?`)){C(null);return}C("restore-apply");try{await e.request(ie,{mnemonic:G},3e4),_(""),m(!1),v(null),T("Identity restored. Your peer key has rotated \u2014 running apps may need to re-pair."),await B()}catch(fe){S(`restore: ${fe.message}`)}finally{C(null)}}},L=async()=>{S(""),O(""),C("link-invite");try{let G=await e.request(P,{},3e4);x(G.invite)}catch(G){S(`link: ${G.message}`)}finally{C(null)}},ae=async()=>{let G=Q.trim();if(G&&confirm(`Linking will REPLACE this device's identity with the one from your other device.

This device's current identity is discarded (make sure its phrase is saved if you need it). Proceed?`)){S(""),O(""),C("link-join");try{await e.request(I,{invite:G,device:"this device"},12e4),j(""),X(!1),O("Device linked \u2014 your peer key has rotated. Restart PearBrowser for the linked identity to take effect."),await B()}catch(fe){S(`link: ${fe.message}`)}finally{C(null)}}},we=async()=>{if(confirm("Clear all cached drives + proxy cache? Installed apps and your sites are NOT affected.")){S(""),C("cache");try{let G=await e.request(H);alert(`Cleared: ${G.message||G.cleared+" items"}`)}catch(G){S(G.message)}finally{C(null)}}},re=async()=>{if(confirm(`Reset app data?

This will:
  1. Unseed every pinned site from HiveRelay
  2. Wipe all local state (sites, apps, bookmarks, identity)
  3. PERMANENTLY DELETE the testnet wallet on this device \u2014 without its 24-word recovery phrase it is gone forever
  4. Quit the app

Back up your wallet recovery phrase (Settings \u2192 Wallet \u2192 Back up\u2026) and copy any drive keys you want to keep first!`)&&confirm("Are you ABSOLUTELY sure? This cannot be undone.")){S(""),C("reset");try{let G=await e.request(M,{},6e4);alert(`Unseeded ${G.unseeded?.length??0} site(s). App will now quit. Relaunch to start fresh.`)}catch(G){S(G.message)}finally{C(null)}}};return c`
    <div className="settings">
      <h1>Settings</h1>
      <p className="subtitle">Identity, appearance, infrastructure, and diagnostics for your peer-to-peer browser.</p>
      ${w&&c`<div className="apps-error">${w}</div>`}

      <h2>Appearance</h2>
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Browser theme</div>
            <div className="settings-subtle">Choose the chrome appearance for tabs, toolbars, settings, and dialogs.</div>
          </div>
          <div className="theme-segmented" role="group" aria-label="Browser theme">
            ${["light","dark"].map(G=>c`
              <button
                key=${G}
                type="button"
                className=${"theme-segment"+(i===G?" active":"")}
                aria-pressed=${i===G}
                onClick=${()=>a?.(G)}
              >
                ${G==="light"?"Light":"Dark"}
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
            <code className="settings-code">${o?.publicKey||"(loading\u2026)"}</code>
          </div>
        </div>
      </div>

      <h2>Moving to a new device?</h2>
      <p className="subtitle">Your identity lives on this machine. To use the same identity on another computer or after a wipe, write down your backup phrase (or use <em>Link a device</em> below). Anyone with the phrase can sign in as you — store it like a password.</p>
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Backup phrase</div>
            <div className="settings-subtle">${o?.hasBackupPhrase?`${o.mnemonicWordCount}-word BIP-39 mnemonic. Reveal once to write down \u2014 never display on a shared screen.`:"not available"}</div>
          </div>
          <button className="btn" onClick=${Y} disabled=${b==="reveal"||!o?.hasBackupPhrase}>
            ${g?"Hide":"Reveal phrase"}
          </button>
        </div>
        ${g&&c`
          <pre className="seed-phrase">${g}</pre>
          <div className="settings-warning">Write this down somewhere offline. Anyone with these words controls your identity — and we can't reset it for you.</div>
        `}
        <div className="settings-row">
          <div>
            <div className="settings-label">Restore from phrase</div>
            <div className="settings-subtle">Replace this device's identity with one recovered from a saved 12 or 24-word phrase. Use this on a fresh PearBrowser install to bring your existing identity over.</div>
          </div>
          <button className="btn subtle" onClick=${()=>{m(G=>!G),T(""),S("")}}
                  disabled=${b?.startsWith?.("restore")}>
            ${y?"Cancel":"Restore\u2026"}
          </button>
        </div>
        ${y&&c`
          <div className="restore-form">
            <textarea
              className="restore-textarea"
              placeholder="Paste your 12 or 24-word backup phrase here, separated by spaces"
              value=${p}
              rows="3"
              spellCheck="false"
              autoCapitalize="none"
              onInput=${G=>_(G.target.value)}
            ></textarea>
            <div className="restore-actions">
              <button className="btn primary" onClick=${A}
                      disabled=${!p.trim()||b?.startsWith?.("restore")}>
                ${b==="restore-validate"?"Checking\u2026":b==="restore-apply"?"Restoring\u2026":"Restore identity"}
              </button>
            </div>
            <div className="settings-warning">This destroys the current identity on disk. Make sure you've saved its phrase first.</div>
          </div>
        `}
        ${k&&c`<div className="apps-ok">${k}</div>`}
      </div>

      <h2>Link a device</h2>
      <p className="subtitle">Move this identity to another device without typing your phrase. Devices pair directly over the P2P network (blind-pairing) — no server, no account. The invite is a one-time secret that hands over your identity, so only share it with your own device.</p>
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Link a new device</div>
            <div className="settings-subtle">Generate an invite here, then paste it into <em>Link this device</em> on your other device to copy this identity across.</div>
          </div>
          <button className="btn" onClick=${L} disabled=${b==="link-invite"||!o?.hasBackupPhrase}>
            ${b==="link-invite"?"Creating\u2026":"Create invite"}
          </button>
        </div>
        ${D&&c`
          <pre className="seed-phrase">${D}</pre>
          <div className="settings-warning">One-time invite — anyone who receives it can adopt your identity. Paste it into your other device now; it expires when you close this screen.</div>
        `}
        <div className="settings-row">
          <div>
            <div className="settings-label">Link this device</div>
            <div className="settings-subtle">Paste an invite from your other device to adopt its identity here. Replaces this device's current identity.</div>
          </div>
          <button className="btn subtle" onClick=${()=>{X(G=>!G),O(""),S("")}}
                  disabled=${b?.startsWith?.("link")}>
            ${q?"Cancel":"Paste invite\u2026"}
          </button>
        </div>
        ${q&&c`
          <div className="restore-form">
            <textarea
              className="restore-textarea"
              placeholder="Paste the invite from your other device"
              value=${Q}
              rows="2"
              spellCheck="false"
              autoCapitalize="none"
              onInput=${G=>j(G.target.value)}
            ></textarea>
            <div className="restore-actions">
              <button className="btn primary" onClick=${ae}
                      disabled=${!Q.trim()||b==="link-join"}>
                ${b==="link-join"?"Linking\u2026":"Link this device"}
              </button>
            </div>
            <div className="settings-warning">This destroys the current identity on disk. Make sure you've saved its phrase first.</div>
          </div>
        `}
        ${K&&c`<div className="apps-ok">${K}</div>`}
      </div>

      <h2>Profile</h2>
      <p className="subtitle">What apps see when you grant a sign-in. Each field is opt-in — leave blank to share nothing.</p>
      <${Vh} rpc=${e} C=${t} />

      <h2>Permission Center</h2>
      <p className="subtitle">Persistent app grants grouped by drive: sign-in, profile fields, contacts, and arbitrary swarm topics.</p>
      <${Wh} rpc=${e} C=${t} />

      <h2>Content Shield</h2>
      <p className="subtitle">Brave-style ad and tracker blocking, enforced inside the browser's own proxy — blocked requests never reach a peer, a relay, or the network. Named filter lists hot-swap offline; per-drive allowlist and strict mode live here; Pear Plugins feed the same engine with a kill switch.</p>
      <${eg} rpc=${e} C=${t} activeDriveKey=${l} onBrowse=${u} />

      <h2>Clearnet &amp; privacy</h2>
      <p className="subtitle">Browse https:// sites through the browser-owned clearnet proxy (shields on) or direct load. Privacy ladder: HTTPS-only upgrades, tracking-parameter stripping, referrer policy, fingerprint farbling, third-party cookie isolation in proxy mode.</p>
      <${tg} rpc=${e} C=${t} />

      <h2>Wallet</h2>
      <p className="subtitle">The built-in testnet wallet (USD₮0 on Stable Testnet — no real funds). Create or import it here, unlock it with your passphrase, back up the recovery phrase, and manage which apps may connect.</p>
      <${lg} rpc=${e} C=${t} />

      <h2>Relays</h2>
      <p className="subtitle">HiveRelay endpoints used for fast first-paint and persistence. Hybrid mode falls back to pure P2P if a relay is down.</p>
      <${Yh} rpc=${e} C=${t} />

      <h2>Nostr identity</h2>
      <p className="subtitle">A portable Nostr key (npub), linked to your pear identity by a mutual, revocable attestation. "Linked (attested)" is a trust assertion the two keys mutually signed — never proof of the same person.</p>
      <${Qh} rpc=${e} C=${t} />

      <h2>Nostr feed</h2>
      <p className="subtitle">Post NIP-01 notes signed with your Nostr key. Toggle "Include trusted contacts" to also see notes a verified contact authored with their attested Nostr key, replicated peer-to-peer.</p>
      <${Xh} rpc=${e} C=${t} />

      <h2>Name registry</h2>
      <p className="subtitle">Claim memorable names that resolve to your drives or app links — type the name (or pearname://name) in the URL bar. Owner-signed, durable across devices, first-claim-wins with a homograph guard.</p>
      <${Jh} rpc=${e} C=${t} />

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
          <button className="btn subtle" onClick=${we} disabled=${b==="cache"}>Clear cache</button>
        </div>
      </div>

      <h2>Experimental</h2>
      <p className="subtitle">Early features behind a flag. They may change, break, or be removed.</p>
      <${sg} rpc=${e} C=${t} onDeviceSyncChange=${E} />

	      ${$&&c`<div className="settings-section-device-sync">
	        <h2>Device sync <span className="settings-subtle">(experimental)</span></h2>
	        <p className="subtitle">Your bookmarks, encrypted and synced across your own devices — no server, no account. Set up sync here, then pair your other devices with the invite.</p>
	        <${Zh} rpc=${e} C=${t} />
	      </div>`}

      <h2>Danger zone</h2>
      <div className="settings-card danger">
        <div className="settings-row">
          <div>
            <div className="settings-label">Reset app data</div>
            <div className="settings-subtle">Unseeds every published site from HiveRelay first (only possible while your publisher keypair is intact), then wipes local storage and quits. You'll start fresh on next launch. <strong>Copy your drive keys before doing this.</strong> <strong>This also deletes the testnet wallet on this device</strong> — back up its 24-word recovery phrase (Wallet → Back up…) first, or the wallet is unrecoverable.</div>
          </div>
          <button className="btn subtle danger" onClick=${re} disabled=${b==="reset"}>${b==="reset"?"Resetting\u2026":"Reset data"}</button>
        </div>
      </div>

      <h2>Boot log</h2>
      <pre className="boot-log">${r.join(`
`)||"(events arrived pre-mount \u2014 check status above)"}</pre>
    </div>
  `}var Wf={heading:()=>({type:"heading",level:1,text:"New heading"}),text:()=>({type:"text",text:"Write something."}),image:()=>({type:"image",src:"https://",alt:""}),link:()=>({type:"link",href:"https://",text:"Link text"}),html:()=>({type:"html",text:`<div>
  <!-- Raw HTML / CSS / JS \u2014 rendered as-is -->
</div>`}),code:()=>({type:"code",text:"// code sample \u2014 shown as text"}),quote:()=>({type:"quote",text:"A quote."}),list:()=>({type:"list",items:["Item 1","Item 2"]}),divider:()=>({type:"divider"})};function cg({block:e,onChange:t}){let n=s=>t({...e,...s});switch(e.type){case"heading":return c`
        <div className="block-fields">
          <select value=${e.level} onChange=${s=>n({level:+s.target.value})}>
            ${[1,2,3].map(s=>c`<option key=${s} value=${s}>H${s}</option>`)}
          </select>
          <input type="text" value=${e.text} onInput=${s=>n({text:s.target.value})} />
        </div>
      `;case"text":case"quote":case"code":case"html":return c`<textarea rows=${e.type==="html"?8:e.type==="code"?4:2} value=${e.text} placeholder=${e.type==="html"?"Paste raw HTML, CSS, or <script> \u2014 rendered as part of the page":""} onInput=${s=>n({text:s.target.value})}></textarea>`;case"image":return c`
        <div className="block-fields">
          <input type="text" placeholder="src (https://…)" value=${e.src} onInput=${s=>n({src:s.target.value})} />
          <input type="text" placeholder="alt text" value=${e.alt} onInput=${s=>n({alt:s.target.value})} />
        </div>
      `;case"link":return c`
        <div className="block-fields">
          <input type="text" placeholder="href" value=${e.href} onInput=${s=>n({href:s.target.value})} />
          <input type="text" placeholder="text" value=${e.text} onInput=${s=>n({text:s.target.value})} />
        </div>
      `;case"list":return c`<textarea rows=${Math.max(2,e.items.length)} placeholder="One item per line" value=${e.items.join(`
`)} onInput=${s=>n({items:s.target.value.split(`
`)})}></textarea>`;case"divider":return c`<div className="placeholder">— divider —</div>`;default:return c`<div className="placeholder">unknown block: ${e.type}</div>`}}function ug({site:e,rpc:t,C:n,onBack:s,onBrowse:r}){let[i,a]=(0,d.useState)(e.name||""),[l,u]=(0,d.useState)(e.blocks||[]),[o,h]=(0,d.useState)(null),[g,v]=(0,d.useState)(""),[w,S]=(0,d.useState)({keyHex:e.keyHex,published:e.published}),[b,C]=(0,d.useState)(!e.published);(0,d.useEffect)(()=>{b||!e.siteId||(async()=>{try{let q=await t.request(n.CMD_GET_SITE_BLOCKS,{siteId:e.siteId});Array.isArray(q?.blocks)&&q.blocks.length>0&&u(q.blocks)}catch{}C(!0)})()},[e.siteId]);let y=q=>u(X=>[...X,Wf[q]()]),m=(q,X)=>u(Q=>Q.map((j,K)=>K===q?X:j)),p=q=>u(X=>X.filter((Q,j)=>j!==q)),_=(q,X)=>u(Q=>{let j=q+X;if(j<0||j>=Q.length)return Q;let K=[...Q];return[K[q],K[j]]=[K[j],K[q]],K}),k=async()=>{v(""),h("save");try{await t.request(n.CMD_UPDATE_SITE,{siteId:e.siteId,blocks:l,name:i})}catch(q){v(`save: ${q.message}`)}finally{h(null)}},T=async()=>{v(""),h("publish");try{await t.request(n.CMD_UPDATE_SITE,{siteId:e.siteId,blocks:l,name:i});let q=await t.request(n.CMD_PUBLISH_SITE,{siteId:e.siteId},12e4);S({keyHex:q.keyHex,published:!0,pin:q.pin})}catch(q){v(`publish: ${q.message}`)}finally{h(null)}},$=async()=>{v(""),h("unpublish");try{await t.request(n.CMD_UNPUBLISH_SITE,{siteId:e.siteId}),S(q=>({...q,published:!1}))}catch(q){v(`unpublish: ${q.message}`)}finally{h(null)}},[E,D]=(0,d.useState)(!1);return c`
    <div className="site-editor">
      <div className="site-editor-bar">
        <button className="btn subtle" onClick=${s}>← Sites</button>
        <input className="site-name-input" type="text" placeholder="Site name" value=${i} onInput=${q=>a(q.target.value)} />
        <div className="spacer"></div>
        <label className="btn subtle" title="Upload a site icon (SVG/PNG/JPEG/WebP, ≤512KB) — shows in the browser's site list">
          ${o==="icon"?"Uploading\u2026":E?"\u2713 Icon set":"\u{1F5BC} Icon"}
          <input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" style=${{display:"none"}} onChange=${q=>{let X=q.target.files&&q.target.files[0];if(!X)return;if(X.size>512*1024){v("icon: too large (max 512KB)"),q.target.value="";return}let Q=new FileReader;Q.onload=async()=>{v(""),D(!1),h("icon");try{await t.request(n.CMD_SET_SITE_ICON,{siteId:e.siteId,dataUrl:Q.result}),D(!0),setTimeout(()=>D(!1),2500)}catch(j){v(`icon: ${j.message}`)}finally{h(null),q.target&&(q.target.value="")}},Q.readAsDataURL(X)}} />
        </label>
        <button className="btn" onClick=${k} disabled=${o==="save"} title="Write block changes to the drive — peers see updates live">${o==="save"?"Saving\u2026":"Save"}</button>
        ${w.published?c`<button key="unpublish" className="btn subtle" onClick=${$} disabled=${o==="unpublish"}>${o==="unpublish"?"Unpublishing\u2026":"Unpublish"}</button>`:c`<button key="publish" className="btn primary" onClick=${T} disabled=${o==="publish"} title="Seeds via Hyperswarm and pins to HiveRelay for 24/7 availability">${o==="publish"?"Publishing\u2026":"Publish & Pin"}</button>`}
      </div>

      ${g&&c`<div className="apps-error">${g}</div>`}

      ${w.published&&w.keyHex&&c`
        <div className="site-published">
          <div className="site-published-row">
            <span>Published at</span>
            <code>hyper://${w.keyHex}/</code>
            <button className="btn small" onClick=${()=>qr(`hyper://${w.keyHex}/`)} title="Copy hyper:// URL">📋 Copy</button>
            <button className="btn" onClick=${()=>r(`hyper://${w.keyHex}/`)}>Open in Browse</button>
          </div>
          <div className="site-published-row subtle">
            <span>Drive key</span>
            <code className="key-mono">${w.keyHex}</code>
            <button className="btn small subtle" onClick=${()=>qr(w.keyHex)} title="Copy raw key">📋 Key</button>
          </div>
          <div className="site-pin-row ${w.pin?.replicatedPeers>0?"ok":"warn"}">
            ${w.pin?.replicatedPeers>0?c`<span>📌 Replicated to ${w.pin.replicatedPeers} HiveRelay peer${w.pin.replicatedPeers===1?"":"s"} (of ${w.pin.acceptances} accepted). Safe to close the app — stays online 24/7.</span>`:w.pin?.ok?c`<span>📡 <strong>${w.pin.acceptances} relay${w.pin.acceptances===1?"":"s"} accepted</strong> your pin request, but none have pulled the content yet. The public HiveRelay network may take minutes or may not replicate at all. Your site is reachable via Hyperswarm as long as this app is running. Share your drive key now; keep the app open until you're sure someone's replicated it.</span>`:c`<span>⚠️ Seeded P2P locally only. ${w.pin?.connectedRelays>0?`Connected to ${w.pin.connectedRelays} relay(s) but none accepted the seed request.`:"No HiveRelays connected yet; retry in a moment."} Site is reachable while this app is running.</span>`}
          </div>
          <div className="site-save-warning">
            💾 <strong>Save this key now.</strong> It's the only way to recover this site if you reset app data. Anyone with the key can reach your site; only this machine's publisher keypair can unseed it.
          </div>
        </div>
      `}

      <div className="blocks">
        ${l.length===0&&c`<p className="placeholder">No blocks yet. Add one below.</p>`}
        ${l.map((q,X)=>c`
          <div className="block" key=${X}>
            <div className="block-header">
              <span className="block-type">${q.type}</span>
              <div className="spacer"></div>
              <button className="btn subtle small" onClick=${()=>_(X,-1)} disabled=${X===0}>↑</button>
              <button className="btn subtle small" onClick=${()=>_(X,1)} disabled=${X===l.length-1}>↓</button>
              <button className="btn subtle small" onClick=${()=>p(X)}>✕</button>
            </div>
            <${cg} block=${q} onChange=${Q=>m(X,Q)} />
          </div>
        `)}
      </div>

      <div className="add-block-row">
        <span className="placeholder">Add:</span>
        ${Object.keys(Wf).map(q=>c`
          <button key=${q} className="btn subtle small" onClick=${()=>y(q)}>${q}</button>
        `)}
      </div>
    </div>
  `}function dg({rpc:e,C:t,onBrowse:n,placeholder:s}){let[r,i]=(0,d.useState)(""),[a,l]=(0,d.useState)(null),[u,o]=(0,d.useState)(0),[h,g]=(0,d.useState)(!1),[v,w]=(0,d.useState)(!1),[S,b]=(0,d.useState)(!1),[C,y]=(0,d.useState)(null),[m,p]=(0,d.useState)(""),_=(0,d.useRef)(0),k=async()=>{let E=r.trim();if(!E){l(null),b(!1),y(null);return}g(!0),b(!1),y(null);try{let D=await e.request(t.CMD_SEARCH,{query:E,limit:50,federated:v});_.current=D?.queryId||0,l(Array.isArray(D?.results)?D.results:[]),o(D?.stats?.docs||0),D?.federating&&b(!0)}catch(D){p(`search: ${D.message}`)}finally{g(!1)}},T=E=>E&&E.link?E.link:E&&/^(?:pear|file|hyper):\/\//i.test(E.driveKey||"")?E.driveKey:`hyper://${E.driveKey}${E.path&&E.path!=="/"?E.path:"/"}`,$=E=>!E.tier||E.tier==="self"?c`<span className="src-badge self">you</span>`:E.tier==="followed"?c`<span className="src-badge followed">trusted · hop ${E.trustHop??1}</span>`:c`<span className="src-badge other">${E.tier}</span>`;return(0,d.useEffect)(()=>{let E=D=>{let x=D&&D.detail||{};x.queryId===_.current&&(Array.isArray(x.results)&&l(x.results),y(x),b(!1))};return e.addEventListener(`event:${t.EVT_SEARCH_FEDERATED}`,E),()=>e.removeEventListener(`event:${t.EVT_SEARCH_FEDERATED}`,E)},[]),c`
    <div className="fed-search">
      ${m&&c`<div className="apps-error">${m}</div>`}
      <div className="urlbar" style=${{marginBottom:"10px"}}>
        <input type="text" className="url-input"
          placeholder=${s||"Search the peer-to-peer web\u2026"}
          value=${r}
          onInput=${E=>i(E.target.value)}
          onKeyDown=${E=>E.key==="Enter"&&k()} />
        <button className="btn primary" onClick=${k} disabled=${h||!r.trim()}>${h?"Searching\u2026":"Search"}</button>
      </div>
      <label className="search-fed-toggle">
        <input type="checkbox" checked=${v} onChange=${E=>w(E.target.checked)} />
        Include trusted peers${S?c` <span className="fed-status">· searching peers…</span>`:""}
        <${nm} meta=${C} />
      </label>
      ${u?c`<span className="search-indexed" style=${{marginLeft:"10px",opacity:.6,fontSize:"12px"}}>${u} page(s) indexed</span>`:""}
      ${a!==null&&(a.length===0?c`<p className="placeholder">No matches${u===0?" yet \u2014 browse some hyper:// pages first to build your index.":"."}</p>`:c`<div className="library-list">
            ${a.map(E=>c`
              <div className="library-row" key=${E.docId||E.driveKey+E.path}>
                <div className="library-row-main">
                  <div className="library-title">${E.title||T(E)}${v?$(E):""}</div>
                  <div className="library-url">${T(E)}</div>
                </div>
                <button className="btn small" onClick=${()=>n(T(E))}>Open</button>
              </div>
            `)}
          </div>`)}
    </div>
  `}function pg({rpc:e,C:t,onBrowse:n}){let[s,r]=(0,d.useState)([]),[i,a]=(0,d.useState)(null),[l,u]=(0,d.useState)(null),[o,h]=(0,d.useState)(""),[g,v]=(0,d.useState)(""),w=(0,d.useRef)({el:null}),S=k=>{w.current.el=k},b=async()=>{try{let k=await e.request(t.CMD_LIST_SITES);r(Array.isArray(k)?k:k?.sites??[])}catch(k){h(`list: ${k.message}`)}},[C,y]=(0,d.useState)([]),m=async()=>{try{let k=await e.request(t.CMD_GET_CATALOG_APPS),$=(Array.isArray(k)?k:k?.apps??[]).filter(x=>x&&typeof x.driveKey=="string"&&/^[0-9a-f]{64}$/i.test(x.driveKey)),E=x=>x.driveKey===Xf?0:Array.isArray(x.categories)&&x.categories.includes("featured")?1:2,D=Ec($).map((x,q)=>({a:x,i:q})).sort((x,q)=>E(x.a)-E(q.a)||x.i-q.i).map(x=>x.a);y(D)}catch{}};(0,d.useEffect)(()=>{b(),m()},[]);let p=async()=>{if(l==="create")return;let k=document.querySelector(".site-name-field"),$=(k?.value??"").trim()||"Untitled";h(""),u("create");try{let E=await e.request(t.CMD_CREATE_SITE,{name:$},12e4);k&&(k.value=""),await b(),a({siteId:E.siteId??E.id,name:$,blocks:[]})}catch(E){h(`create: ${E.message}`)}finally{u(null)}},_=async k=>{if(confirm(`Delete "${k.name}"?`)){h(""),u(`del:${k.siteId}`);try{await e.request(t.CMD_DELETE_SITE,{siteId:k.siteId}),await b()}catch(T){h(`delete: ${T.message}`)}finally{u(null)}}};return i?c`<${ug} site=${i} rpc=${e} C=${t} onBack=${()=>{a(null),b()}} onBrowse=${n} />`:c`
    <div className="sites">
      <h1>P2P Sites</h1>
      <p className="subtitle">Search the peer-to-peer web, browse published sites, or create your own — all served 24/7 on the HiveRelay network.</p>

      <h2>Search the P2P web</h2>
      <${dg} rpc=${e} C=${t} onBrowse=${n} placeholder="Search the peer-to-peer web…" />

      <h2>Published sites${C.length?` (${C.length})`:""}</h2>
      <p className="subtitle">Live hyper:// sites pinned on the relay network — open any one in a tab.</p>
      ${C.length===0?c`<p className="placeholder">Loading published sites…</p>`:c`<div className="app-grid">
            ${C.map(k=>c`
              <div className="app-card" key=${k.driveKey}>
                <${Fr} rpc=${e} C=${t} driveKey=${k.driveKey} iconRef=${k.icon} iconData=${k.iconData} name=${k.name} />
                <div className="app-info">
                  <div className="app-name">${k.name}</div>
                  <div className="app-meta">${k.description||"hyper://"+k.driveKey.slice(0,10)+"\u2026"}</div>
                </div>
                <div className="app-actions">
                  <button className="btn primary" onClick=${()=>n("hyper://"+k.driveKey+"/")}>Open</button>
                  <button className="btn subtle" onClick=${()=>qr("hyper://"+k.driveKey+"/")}>📋 Copy</button>
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
          onKeyDown=${k=>k.key==="Enter"&&p()}
        />
        <button className="btn primary" onClick=${p} disabled=${l==="create"}>
          ${l==="create"?"Creating\u2026":"Create site"}
        </button>
      </div>
      ${o&&c`<div className="apps-error">${o}</div>`}

      ${s.length===0?c`<p className="placeholder">No sites yet. Create one above.</p>`:c`<div className="app-grid">
            ${s.map(k=>c`
              <div className="app-card" key=${k.siteId}>
                <${Fr} rpc=${e} C=${t} driveKey=${k.keyHex} name=${k.name} />
                <div className="app-info">
                  <div className="app-name">${k.name}</div>
                  <div className="app-meta">${k.published?"published \xB7 "+(k.keyHex?.slice(0,8)??"")+"\u2026":"draft"}</div>
                </div>
                <div className="app-actions">
                  <button className="btn" onClick=${()=>a(k)}>Edit</button>
                  ${k.published&&k.keyHex&&c`<button className="btn subtle" onClick=${()=>n(`hyper://${k.keyHex}/`)}>Open</button>`}
                  ${k.published&&k.keyHex&&c`<button className="btn subtle" onClick=${()=>qr(`hyper://${k.keyHex}/`)}>📋 Copy</button>`}
                  <button className="btn subtle" onClick=${()=>_(k)} disabled=${l===`del:${k.siteId}`}>Delete</button>
                </div>
              </div>
            `)}
          </div>`}
    </div>
  `}function rm({rpc:e,C:t,storagePath:n}){let[s,r]=(0,d.useState)("browse"),[i,a]=(0,d.useState)(null),[l,u]=(0,d.useState)(()=>Ia(_c())),[o,h]=(0,d.useState)({stage:"booting",peerCount:0,dhtConnected:!1,ready:!1,proxyPort:null}),[g,v]=(0,d.useState)([]),[w,S]=(0,d.useState)(null),[b,C]=(0,d.useState)(null),[y,m]=(0,d.useState)(null),[p,_]=(0,d.useState)(null),[k,T]=(0,d.useState)("pending"),[$,E]=(0,d.useState)(()=>Sc.map(P=>Os(P.url,{title:P.title}))),[D,x]=(0,d.useState)(()=>"placeholder"),[q,X]=(0,d.useState)(()=>[]),[Q,j]=(0,d.useState)(!1);(0,d.useEffect)(()=>{let P=re=>v(G=>[...G.slice(-200),re]),I=re=>{P(`[${re.detail.stage}] ${re.detail.message||""}`),h(G=>({...G,stage:re.detail.stage}))},H=re=>{P(`[ready] HTTP proxy on port ${re.detail.port}`),h(G=>({...G,ready:!0,proxyPort:re.detail.port,stage:"ready"})),e.request(t.CMD_GET_IDENTITY).then(_).catch(()=>{}),e.request(t.CMD_USERDATA_GET_SETTINGS).then(G=>{let fe=Pt(G);u(Ia(fe?.[Kf]||_c())),T(fe?.onboardingDone?"done":"show");let _t=Array.isArray(fe?.browseTabs)?fe.browseTabs:null;if(_t&&_t.length>0){let St=xf(_t,Sc);St.tabs.length>0&&(E(St.tabs),x(St.activeId))}let Bs=(Array.isArray(fe?.browseClosedTabs)?fe.browseClosedTabs:[]).map(St=>Is(St)).filter(Boolean).slice(0,Sa);X(Bs)}).catch(()=>{T("done")}).finally(()=>{j(!0)})},M=re=>h(G=>({...G,peerCount:re.detail.peerCount})),B=re=>P(`[error] ${re.detail?.message||JSON.stringify(re.detail)}`),Y=re=>{P(`[login] ${re.detail?.appName||$e(re.detail?.driveKey)} requested ${(re.detail?.scopes||[]).join(",")||"sign-in"}`),S(re.detail)},A=re=>{P(`[swarm] ${re.detail?.appName||$e(re.detail?.driveKey)} wants topic ${$e(re.detail?.topicHex||"")}`),C(re.detail)},L=re=>{P(`[wallet] ${re.detail?.type} consent requested by ${$e(re.detail?.driveKey||"")}`),m(re.detail)},ae=re=>{P(`[wallet] intent ${re.detail?.intentId} \u2192 ${re.detail?.state}`)};e.addEventListener(`event:${t.EVT_BOOT_PROGRESS}`,I),e.addEventListener(`event:${t.EVT_READY}`,H),e.addEventListener(`event:${t.EVT_PEER_COUNT}`,M),e.addEventListener(`event:${t.EVT_ERROR}`,B),e.addEventListener(`event:${t.EVT_LOGIN_REQUEST}`,Y),e.addEventListener(`event:${t.EVT_SWARM_REQUEST}`,A),e.addEventListener(`event:${t.EVT_WALLET_CONNECT_REQUEST}`,L),e.addEventListener(`event:${t.EVT_WALLET_PAYMENT_REQUEST}`,L),e.addEventListener(`event:${t.EVT_WALLET_TX_UPDATE}`,ae);let we=setInterval(async()=>{try{let re=await e.request(t.CMD_GET_STATUS);h(G=>({...G,...re}))}catch{}},3e3);return()=>{clearInterval(we),e.removeEventListener(`event:${t.EVT_BOOT_PROGRESS}`,I),e.removeEventListener(`event:${t.EVT_READY}`,H),e.removeEventListener(`event:${t.EVT_PEER_COUNT}`,M),e.removeEventListener(`event:${t.EVT_ERROR}`,B),e.removeEventListener(`event:${t.EVT_LOGIN_REQUEST}`,Y),e.removeEventListener(`event:${t.EVT_SWARM_REQUEST}`,A),e.removeEventListener(`event:${t.EVT_WALLET_CONNECT_REQUEST}`,L),e.removeEventListener(`event:${t.EVT_WALLET_PAYMENT_REQUEST}`,L),e.removeEventListener(`event:${t.EVT_WALLET_TX_UPDATE}`,ae)}},[e,t]),(0,d.useEffect)(()=>{if(!Q)return;let P=setTimeout(()=>{let I=$.map(M=>Af(M,D)),H=q.map(M=>Is(M)).filter(Boolean).slice(0,Sa);e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{browseTabs:I,browseClosedTabs:H}}).catch(()=>{})},800);return()=>clearTimeout(P)},[$,q,D,Q,e,t]);let K=P=>{a(P),r("browse")},O=P=>{let I=Ia(P);u(I),e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{[Kf]:I}}).catch(H=>{v(M=>[...M.slice(-200),`[settings] theme save failed: ${H.message}`])})},ne=()=>{O(l==="dark"?"light":"dark")},U=o.ready||!!o.proxyPort,ie=U?o.dhtConnected?"ok":"err":"booting",de=U?`DHT \xB7 ${o.peerCount} peer${o.peerCount===1?"":"s"} \xB7 ${o.hiveRelays||0} relay${o.hiveRelays===1?"":"s"} \xB7 proxy :${o.proxyPort}`:`Booting: ${o.stage}`;return c`
    <div className=${`app theme-${l}`} data-theme=${l}>
      <div className="topbar">
        <div className="brand">
          <${Pr} size=${22} />
          <${wa} />
        </div>
        <div className="tabs">
          ${Object.entries(dh).map(([P,I])=>c`
            <button className=${"tab"+(s===P?" active":"")} onClick=${()=>r(P)} key=${P}>
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
            onClick=${ne}
          >
            <span className="theme-toggle-track" aria-hidden="true">
              <span className="theme-toggle-thumb">${l==="dark"?"\u263E":"\u2600"}</span>
            </span>
          </button>
        </div>
      </div>

      <div className=${"panel"+(s==="browse"?" panel-browse":"")}>
        ${s==="browse"&&c`<${_h} rpc=${e} C=${t} navUrl=${i} onNavigated=${()=>a(null)} tabs=${$} setTabs=${E} activeId=${D} setActiveId=${x} closedTabs=${q} setClosedTabs=${X} sessionReady=${Q} onOpenSettings=${()=>r("settings")} nativePageObscured=${!!w||!!b||!!y||k!=="done"} />`}
        ${s==="apps"&&c`<${Kh} rpc=${e} C=${t} onLaunch=${K} />`}
        ${s==="sites"&&c`<${pg} rpc=${e} C=${t} onBrowse=${K} />`}
        ${s==="library"&&c`<${Hh} rpc=${e} C=${t} onBrowse=${K} />`}
        ${s==="settings"&&c`<${og} rpc=${e} C=${t} status=${o} storagePath=${n} log=${g} appearanceTheme=${l} onAppearanceThemeChange=${O} activeDriveKey=${$.find(P=>P.id===D)&&Ur($.find(P=>P.id===D))||""} onBrowse=${K} />`}
      </div>

      <div className=${"status "+ie}>
        <span className="dot"></span>${de}
      </div>

      ${w&&c`<${Sh}
        rpc=${e}
        C=${t}
        request=${w}
        identity=${p}
        onClose=${()=>S(null)}
      />`}

      ${b&&c`<${Eh}
        rpc=${e}
        C=${t}
        request=${b}
        identity=${p}
        onClose=${()=>C(null)}
      />`}

      ${y&&c`<${Th}
        rpc=${e}
        C=${t}
        request=${y}
        onClose=${()=>m(null)}
      />`}

      ${k==="show"&&c`<${xh}
        rpc=${e}
        C=${t}
        onPickSite=${P=>K(P)}
        onClose=${()=>T("done")}
      />`}
    </div>
  `}var Pa=class extends EventTarget{constructor(t){super(),this._pipe=t,this._nextId=1,this._pending=new Map,this._buffer="",this._connected=t.connected!==!1,t.on("data",n=>this._onData(n)),t.on("open",()=>{this._connected=!0,this.dispatchEvent(new CustomEvent("open"))}),t.on("close",()=>{this._disconnect("RPC connection closed"),this.dispatchEvent(new CustomEvent("close"))}),t.on("error",n=>{this._disconnect("RPC connection failed"),this.dispatchEvent(new CustomEvent("error",{detail:n}))})}request(t,n={},s=3e4){return t==null?Promise.reject(new Error("RPC command is missing. Renderer constants are out of sync with backend/constants.js.")):this._connected?new Promise((r,i)=>{let a=this._nextId++,l=setTimeout(()=>{this._pending.has(a)&&(this._pending.delete(a),i(new Error(`RPC timeout: ${t}`)))},s);this._pending.set(a,{resolve:r,reject:i,timer:l});try{this._send({id:a,cmd:t,data:n})}catch(u){clearTimeout(l),this._pending.delete(a),i(u)}}):Promise.reject(new Error(`RPC unavailable: ${t} (backend disconnected; reconnecting)`))}on(t,n){return this.addEventListener(t,s=>n(s.detail)),this}_send(t){let n=JSON.stringify(t),s=n.length.toString(16).padStart(8,"0")+n;if(this._pipe.write(s)===!1)throw new Error("RPC connection is not writable")}_disconnect(t){this._connected=!1;for(let n of this._pending.values())clearTimeout(n.timer),n.reject(new Error(t));this._pending.clear()}_onData(t){for(this._buffer+=typeof t=="string"?t:t.toString();this._buffer.length>=8;){let n=parseInt(this._buffer.slice(0,8),16);if(isNaN(n)||n<=0){this._buffer="";return}if(this._buffer.length<8+n)break;let s=this._buffer.slice(8,8+n);this._buffer=this._buffer.slice(8+n);let r;try{r=JSON.parse(s)}catch{continue}this._dispatch(r)}}_dispatch(t){if(t.id&&(t.result!==void 0||t.error)){let n=this._pending.get(t.id);n&&(clearTimeout(n.timer),this._pending.delete(t.id),t.error?n.reject(new Error(t.error)):n.resolve(t.result));return}t.event&&(this.dispatchEvent(new CustomEvent(`event:${t.event}`,{detail:t.data})),this.dispatchEvent(new CustomEvent("event",{detail:{name:t.event,data:t.data}})))}};var Ma=9876,im=5,am=900000001,Cc=String(globalThis.pearbrowserRuntime?.sessionToken||""),lm={CMD_NAVIGATE:1,CMD_GET_STATUS:2,CMD_GET_DRIVE_INFO:3,CMD_RELEASE_ORIGIN:4,CMD_LOAD_CATALOG:10,CMD_INSTALL_APP:11,CMD_UNINSTALL_APP:12,CMD_LAUNCH_APP:13,CMD_LIST_INSTALLED:14,CMD_CHECK_UPDATES:15,CMD_LOAD_CATALOG_BEE:16,CMD_GET_CATALOG_APPS:17,CMD_UNLOAD_CATALOG:18,CMD_LOAD_CATALOG_AUTOBEE:19,CMD_SHEETS_LOAD:170,CMD_SHEETS_LIST:171,CMD_SHEETS_LIST_SCHEMAS:175,CMD_LOAD_CATALOG_INDEX:176,CMD_SEARCH:177,CMD_SEARCH_INDEX:178,CMD_CREATE_SITE:20,CMD_UPDATE_SITE:21,CMD_PUBLISH_SITE:22,CMD_UNPUBLISH_SITE:23,CMD_LIST_SITES:24,CMD_DELETE_SITE:25,CMD_LOAD_TEMPLATE:26,CMD_GET_SITE_BLOCKS:27,CMD_LEGACY_APP_MIGRATION:28,CMD_RUN_APP_IN_TAB:201,CMD_RESET_APP:29,CMD_CLEAR_CACHE:30,CMD_GET_IDENTITY:31,CMD_GET_APP_ICON:32,CMD_SET_SITE_ICON:33,CMD_GET_RELAYS:40,CMD_SET_RELAYS:41,CMD_SET_RELAY_ENABLED:42,CMD_CHECK_RELAY_CAPABILITY:43,CMD_USERDATA_LIST_BOOKMARKS:50,CMD_USERDATA_ADD_BOOKMARK:51,CMD_USERDATA_REMOVE_BOOKMARK:52,CMD_USERDATA_LIST_HISTORY:53,CMD_USERDATA_ADD_HISTORY:54,CMD_USERDATA_CLEAR_HISTORY:55,CMD_USERDATA_GET_SETTINGS:56,CMD_USERDATA_SET_SETTINGS:57,CMD_USERDATA_GET_SESSION:58,CMD_USERDATA_SAVE_SESSION:59,CMD_USERDATA_IMPORT:60,CMD_IDENTITY_EXPORT_PHRASE:70,CMD_IDENTITY_IMPORT_PHRASE:71,CMD_IDENTITY_ROTATE:72,CMD_IDENTITY_VALIDATE_PHRASE:73,CMD_IDENTITY_SIGN:74,CMD_IDENTITY_VERIFY:75,CMD_PROFILE_GET:80,CMD_PROFILE_UPDATE:81,CMD_PROFILE_CLEAR:82,CMD_LOGIN_LIST_GRANTS:83,CMD_LOGIN_REVOKE_GRANT:84,CMD_LOGIN_REVOKE_ALL:85,CMD_LOGIN_RESOLVE:86,CMD_CONTACTS_LIST:90,CMD_CONTACTS_LOOKUP:91,CMD_CONTACTS_ADD:92,CMD_CONTACTS_UPDATE:93,CMD_CONTACTS_REMOVE:94,CMD_CONTACTS_MY_INVITE:95,CMD_CONTACTS_ADD_INVITE:96,CMD_STOP:99,CMD_SWARM_RESOLVE:120,CMD_SWARM_LIST_GRANTS:121,CMD_SWARM_REVOKE_GRANT:122,CMD_SWARM_REVOKE_ALL_FOR_APP:123,CMD_MYCATALOG_GET:150,CMD_MYCATALOG_CREATE:151,CMD_MYCATALOG_ADD_APP:152,CMD_MYCATALOG_REMOVE_APP:153,CMD_MYCATALOG_RENAME:154,CMD_MYCATALOG_UPDATE_APP:155,CMD_AUTOBEE_CREATE:160,CMD_AUTOBEE_GET:161,CMD_AUTOBEE_ADD_APP:162,CMD_AUTOBEE_REMOVE_APP:163,CMD_AUTOBEE_RENAME:164,CMD_AUTOBEE_ADD_WRITER:165,CMD_SYNC_STATUS:180,CMD_SYNC_CREATE:181,CMD_SYNC_JOIN:182,CMD_SYNC_ADD_WRITER:183,CMD_SYNC_GET_BOOKMARKS:184,CMD_SYNC_ADD_BOOKMARK:185,CMD_SYNC_REMOVE_BOOKMARK:186,CMD_SYNC_PUSH_LOCAL:187,CMD_NAME_RESOLVE:250,CMD_NAME_PETNAME_LIST:251,CMD_NAME_PETNAME_SET:252,CMD_NAME_PETNAME_REMOVE:253,CMD_NAMEREG_CLAIM:264,CMD_NAMEREG_ROTATE:265,CMD_NAMEREG_RELEASE:266,CMD_NAMEREG_REVOKE:267,CMD_NAMEREG_LIST:268,CMD_NAMEREG_RESOLVE:269,CMD_NAMEREG_STATUS:270,CMD_IDENTITY_BINDING_PUBLISH:260,CMD_IDENTITY_BINDING_RESOLVE:261,CMD_SEARCH_FEDERATED:262,CMD_NOSTR_GET_IDENTITY:188,CMD_NOSTR_BIND:189,CMD_NOSTR_REVOKE:190,CMD_NOSTR_PUBLISH:191,CMD_NOSTR_QUERY:192,CMD_SUBMIT_APP:210,CMD_MOD_PENDING:211,CMD_MOD_APPROVE:212,CMD_MOD_REJECT:213,CMD_MOD_REVIEW:214,CMD_ASK_BROWSER_CAPABILITIES:220,CMD_ASK_BROWSER_START:221,CMD_ASK_BROWSER_CANCEL:222,CMD_SHIELD_STATUS:230,CMD_SHIELD_LOAD_LIST:231,CMD_SHIELD_REMOVE_LIST:232,CMD_SHIELD_SET_ALLOW:233,CMD_SHIELD_SET_STRICT:234,CMD_PLUGIN_LIST:235,CMD_PLUGIN_SET_ENABLED:236,CMD_PLUGIN_REGISTER:237,CMD_SHIELD_SUBSCRIBE_LIST:239,CMD_SHIELD_UNSUBSCRIBE_LIST:240,CMD_SHIELD_REFRESH_LISTS:241,CMD_PLUGIN_INSTALL_DRIVE:242,CMD_PLUGIN_UPDATE_DRIVE:243,CMD_PLUGIN_UNINSTALL:244,CMD_PLUGIN_CATALOG:245,CMD_PLUGIN_CATALOG_LOAD_DRIVE:246,CMD_PLUGIN_CATALOG_REMOVE_SOURCE:247,CMD_PRIVACY_STATUS:238,CMD_WALLET_STATUS:300,CMD_WALLET_CREATE:301,CMD_WALLET_IMPORT:302,CMD_WALLET_BACKUP:303,CMD_WALLET_UNLOCK:304,CMD_WALLET_LOCK:305,CMD_WALLET_ADDRESS:306,CMD_WALLET_BALANCES:307,CMD_WALLET_TRANSACTIONS:308,CMD_WALLET_CONNECTIONS_LIST:309,CMD_WALLET_CONNECTION_REVOKE:310,CMD_WALLET_CONNECT_RESOLVE:311,CMD_WALLET_PAYMENT_RESOLVE:312,CMD_WALLET_RECONCILE:313,CMD_BRIDGE:200,EVT_READY:100,EVT_PEER_COUNT:101,EVT_ERROR:102,EVT_INSTALL_PROGRESS:103,EVT_SITE_PUBLISHED:104,EVT_BOOT_PROGRESS:105,EVT_LOGIN_REQUEST:106,EVT_SWARM_REQUEST:107,EVT_SEARCH_FEDERATED:108,EVT_IDENTITY_BINDING_PUBLISHED:109,EVT_LAUNCH_PROGRESS:110,EVT_ASK_BROWSER_STREAM:111,EVT_WALLET_CONNECT_REQUEST:112,EVT_WALLET_PAYMENT_REQUEST:113,EVT_WALLET_TX_UPDATE:114},Tc=class{constructor(t,n={}){this._listeners={data:[],close:[],error:[],open:[],reconnecting:[],"reconnect-failed":[]},this._url=t,this._connected=!1,this._connecting=!1,this._destroyed=!1,this._reconnectEnabled=!1,this._reconnectTimer=null,this._reconnectAttempt=0,this._maxReconnectAttempts=Number.isInteger(n.maxReconnectAttempts)?n.maxReconnectAttempts:8,this._reconnectBaseMs=Number.isFinite(n.reconnectBaseMs)?n.reconnectBaseMs:100,this._reconnectMaxMs=Number.isFinite(n.reconnectMaxMs)?n.reconnectMaxMs:1e3,this._failedSocket=null,this._ws=null,this._connect()}get connected(){return this._connected}enableReconnect(){this._destroyed||(this._reconnectEnabled=!0,!this._connected&&!this._connecting&&this._scheduleReconnect())}destroy(){this._destroyed=!0,this._reconnectEnabled=!1,this._connected=!1,this._connecting=!1,this._reconnectTimer&&clearTimeout(this._reconnectTimer),this._reconnectTimer=null;let t=this._ws;this._ws=null;try{t?.close()}catch{}}_emit(t,n){for(let s of this._listeners[t]||[])s(n)}_connect(){if(this._destroyed||this._connecting||this._connected)return;this._connecting=!0,console.log("[ws] connecting to local backend");let t=new globalThis.WebSocket(this._url);this._ws=t,this._failedSocket=null,t.binaryType="arraybuffer",t.addEventListener("open",()=>{if(this._destroyed||t!==this._ws){try{t.close()}catch{}return}console.log("[ws] open"),this._connecting=!1,this._connected=!0,this._reconnectAttempt=0,this._emit("open")}),t.addEventListener("message",n=>{if(t!==this._ws||!this._connected)return;let s=typeof n.data=="string"?n.data:new TextDecoder().decode(n.data);this._emit("data",s)}),t.addEventListener("close",n=>{console.log("[ws] close",n.code,n.reason),this._handleDisconnect(t)}),t.addEventListener("error",n=>{console.error("[ws] error",n),this._handleDisconnect(t,n);try{t.close()}catch{}})}_handleDisconnect(t,n=null){this._destroyed||t!==this._ws||this._failedSocket===t||(this._failedSocket=t,this._connected=!1,this._connecting=!1,n&&this._emit("error",n),this._emit("close"),this._scheduleReconnect())}_scheduleReconnect(){if(!this._reconnectEnabled||this._destroyed||this._connected||this._connecting||this._reconnectTimer)return;if(this._reconnectAttempt>=this._maxReconnectAttempts){this._emit("reconnect-failed",{attempts:this._reconnectAttempt});return}let t=++this._reconnectAttempt,n=Math.min(this._reconnectBaseMs*2**(t-1),this._reconnectMaxMs);this._emit("reconnecting",{attempt:t,delay:n}),this._reconnectTimer=setTimeout(()=>{this._reconnectTimer=null,this._connect()},n)}on(t,n){return this._listeners[t]&&this._listeners[t].push(n),this}write(t){if(!this._connected||!this._ws)throw new Error("WebSocket RPC connection is not open");return this._ws.send(t),!0}};function fg(e){let t=JSON.stringify(e);return t.length.toString(16).padStart(8,"0")+t}function mg(e){let t=new URL(e);return t.pathname="/status-smoke",t.search=`?session=${encodeURIComponent(Cc)}`,t.hash="",t.toString()}function vg(e){if(!Cc)throw new Error("PearBrowser v3 runtime session token is unavailable");return`ws://127.0.0.1:${e}/?session=${encodeURIComponent(Cc)}`}function yg(e,t){e.buffer+=typeof t=="string"?t:new TextDecoder().decode(t);let n=[];for(;e.buffer.length>=8;){let s=parseInt(e.buffer.slice(0,8),16);if(isNaN(s)||s<=0||s>1e7)throw new Error("invalid rpc frame");if(e.buffer.length<8+s)break;let r=e.buffer.slice(8,8+s);e.buffer=e.buffer.slice(8+s),n.push(JSON.parse(r))}return n}function hg(e,t){return new Promise((n,s)=>{let r=mg(e),i=new globalThis.WebSocket(r);i.binaryType="arraybuffer";let a={buffer:""},l=!1,u=setTimeout(()=>o(new Error("probe timeout")),t);function o(h){if(!l){l=!0,clearTimeout(u);try{i.close()}catch{}h?s(h):n()}}i.addEventListener("open",()=>{i.send(fg({id:am,cmd:lm.CMD_GET_STATUS,data:{}}))}),i.addEventListener("message",h=>{let g;try{g=yg(a,h.data)}catch(v){o(v);return}for(let v of g){if(v?.event==="backend-boot-failed")return o(null);if(v?.id===am)return v.error?o(new Error(v.error)):o(null)}}),i.addEventListener("error",()=>o(new Error("probe error"))),i.addEventListener("close",()=>o(new Error("probe closed")))})}async function gg(e,t){let n=performance.now()+t;await hg(e,t);let s=n-performance.now();if(s<=0)throw new Error("renderer handshake timeout");return await new Promise((r,i)=>{let a=new Tc(e),l=!1,u=(h=null)=>{l||(l=!0,clearTimeout(o),h?(a.destroy(),i(h)):(a.enableReconnect(),r(a)))},o=setTimeout(()=>u(new Error("renderer handshake timeout")),s);a.on("open",()=>u()),a.on("error",()=>u(new Error("renderer ws error"))),a.on("close",()=>u(new Error("renderer ws closed")))})}async function om({startupTimeoutMs:e=6e4,portTimeoutMs:t=1e4,retryDelayMs:n=500}={}){for(let[u,o]of Object.entries({startupTimeoutMs:e,portTimeoutMs:t,retryDelayMs:n}))if(!Number.isInteger(o)||o<=0)throw new TypeError(`${u} must be a positive integer`);let s=null,r=null,i=[],a=performance.now()+e;for(;performance.now()<a;){i=[];for(let o=Ma;o<Ma+im;o++){let h=a-performance.now();if(h<=0)break;try{s=await gg(vg(o),Math.min(t,h)),r=o,console.log("[rpc] connected on :"+o);break}catch(g){i.push(`:${o} ${g.message}`)}}if(s)break;let u=a-performance.now();u>0&&await new Promise(o=>setTimeout(o,Math.min(n,u)))}if(!s)throw new Error(`Could not establish the local backend connection on ports ${Ma}-${Ma+im-1} within ${e} ms (last scan: ${i.join("; ")||"no response"}). The backend or the renderer network connection may still be starting. Fully quit and reopen PearBrowser; if this recurs, include this message in a bug report.`);return{rpc:new Pa(s),C:lm,pipe:s,storagePath:`(backend in main Bare process, WS :${r})`}}var $g=document.getElementById("app"),Dn=(0,cm.createRoot)($g);function Zn({message:e,detail:t,failed:n}){return c`
    <div className="splash">
      <div className="splash-inner">
        <${Pr} size=${96} animated=${!n} />
        <${wa} />
        <div className="splash-tagline">P2P browser, app store, and publishing — no servers required.</div>
        <div className=${"splash-status"+(n?" failed":"")}>
          <span className="splash-spinner"></span>
          <span>${e}</span>
        </div>
        ${t&&c`<pre className="splash-detail">${t}</pre>`}
      </div>
    </div>
  `}Dn.render(c`<${Zn} message="Connecting to backend…" />`);try{let{rpc:e,C:t,storagePath:n,pipe:s}=await om(),r=!1;e.on("event:backend-boot-failed",l=>{r=!0,console.error("Backend boot failed in main process:"),console.error(l?.message),l?.stack&&console.error(l.stack);let u=[l?.message||"(no message)",l?.code?`
Code: `+l.code:"",l?.stack?`

`+l.stack:"",`

Likely fix: reinstall the verified signed native package, then relaunch it.`].join("");Dn.render(c`<${Zn}
      message="Backend failed to boot"
      detail=${u}
      failed=${!0} />`)});let i=!1,a=()=>{r||i||!s.connected||(i=!0,Dn.render(c`<${rm} rpc=${e} C=${t} storagePath=${n} />`))};s.on("open",()=>{r||(Dn.render(c`<${Zn} message="Handshake restored · resuming…" />`),setTimeout(a,50))}),s.on("error",l=>{console.error("Backend RPC connection error:",l)}),s.on("close",()=>{r||(i=!1,Dn.render(c`<${Zn} message="Backend connection lost · reconnecting…" />`))}),s.on("reconnecting",({attempt:l}={})=>{r||Dn.render(c`<${Zn} message=${`Reconnecting to backend${l?` \xB7 attempt ${l}`:""}\u2026`} />`)}),s.on("reconnect-failed",()=>{r||(i=!1,Dn.render(c`<${Zn}
      message="Backend disconnected"
      detail="Automatic reconnect failed. Fully quit and relaunch PearBrowser; your profile and application storage are safe."
      failed=${!0} />`))}),setTimeout(a,250)}catch(e){console.error("Boot failed:",e),Dn.render(c`<${Zn} message="Boot failed" detail=${e.stack||e.message} failed=${!0} />`)}
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
