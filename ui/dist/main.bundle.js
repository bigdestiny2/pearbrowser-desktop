var pf=Object.create;var Cc=Object.defineProperty;var mf=Object.getOwnPropertyDescriptor;var ff=Object.getOwnPropertyNames;var vf=Object.getPrototypeOf,yf=Object.prototype.hasOwnProperty;var sn=(e,t)=>()=>{try{return t||e((t={exports:{}}).exports,t),t.exports}catch(n){throw t=0,n}};var hf=(e,t,n,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let i of ff(t))!yf.call(e,i)&&i!==n&&Cc(e,i,{get:()=>t[i],enumerable:!(s=mf(t,i))||s.enumerable});return e};var Ms=(e,t,n)=>(n=e!=null?pf(vf(e)):{},hf(t||!e||!e.__esModule?Cc(n,"default",{value:e,enumerable:!0}):n,e));var Bc=sn(re=>{"use strict";var Os=Symbol.for("react.element"),gf=Symbol.for("react.portal"),$f=Symbol.for("react.fragment"),wf=Symbol.for("react.strict_mode"),Nf=Symbol.for("react.profiler"),bf=Symbol.for("react.provider"),kf=Symbol.for("react.context"),_f=Symbol.for("react.forward_ref"),Sf=Symbol.for("react.suspense"),Ef=Symbol.for("react.memo"),Cf=Symbol.for("react.lazy"),Tc=Symbol.iterator;function Tf(e){return e===null||typeof e!="object"?null:(e=Tc&&e[Tc]||e["@@iterator"],typeof e=="function"?e:null)}var Dc={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},Rc=Object.assign,Ic={};function Jn(e,t,n){this.props=e,this.context=t,this.refs=Ic,this.updater=n||Dc}Jn.prototype.isReactComponent={};Jn.prototype.setState=function(e,t){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,t,"setState")};Jn.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function Lc(){}Lc.prototype=Jn.prototype;function Ra(e,t,n){this.props=e,this.context=t,this.refs=Ic,this.updater=n||Dc}var Ia=Ra.prototype=new Lc;Ia.constructor=Ra;Rc(Ia,Jn.prototype);Ia.isPureReactComponent=!0;var Ac=Array.isArray,Pc=Object.prototype.hasOwnProperty,La={current:null},Mc={key:!0,ref:!0,__self:!0,__source:!0};function Oc(e,t,n){var s,i={},r=null,a=null;if(t!=null)for(s in t.ref!==void 0&&(a=t.ref),t.key!==void 0&&(r=""+t.key),t)Pc.call(t,s)&&!Mc.hasOwnProperty(s)&&(i[s]=t[s]);var l=arguments.length-2;if(l===1)i.children=n;else if(1<l){for(var u=Array(l),o=0;o<l;o++)u[o]=arguments[o+2];i.children=u}if(e&&e.defaultProps)for(s in l=e.defaultProps,l)i[s]===void 0&&(i[s]=l[s]);return{$$typeof:Os,type:e,key:r,ref:a,props:i,_owner:La.current}}function Af(e,t){return{$$typeof:Os,type:e.type,key:t,ref:e.ref,props:e.props,_owner:e._owner}}function Pa(e){return typeof e=="object"&&e!==null&&e.$$typeof===Os}function xf(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(n){return t[n]})}var xc=/\/+/g;function Da(e,t){return typeof e=="object"&&e!==null&&e.key!=null?xf(""+e.key):t.toString(36)}function Fi(e,t,n,s,i){var r=typeof e;(r==="undefined"||r==="boolean")&&(e=null);var a=!1;if(e===null)a=!0;else switch(r){case"string":case"number":a=!0;break;case"object":switch(e.$$typeof){case Os:case gf:a=!0}}if(a)return a=e,i=i(a),e=s===""?"."+Da(a,0):s,Ac(i)?(n="",e!=null&&(n=e.replace(xc,"$&/")+"/"),Fi(i,t,n,"",function(o){return o})):i!=null&&(Pa(i)&&(i=Af(i,n+(!i.key||a&&a.key===i.key?"":(""+i.key).replace(xc,"$&/")+"/")+e)),t.push(i)),1;if(a=0,s=s===""?".":s+":",Ac(e))for(var l=0;l<e.length;l++){r=e[l];var u=s+Da(r,l);a+=Fi(r,t,n,u,i)}else if(u=Tf(e),typeof u=="function")for(e=u.call(e),l=0;!(r=e.next()).done;)r=r.value,u=s+Da(r,l++),a+=Fi(r,t,n,u,i);else if(r==="object")throw t=String(e),Error("Objects are not valid as a React child (found: "+(t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t)+"). If you meant to render a collection of children, use an array instead.");return a}function Hi(e,t,n){if(e==null)return e;var s=[],i=0;return Fi(e,s,"","",function(r){return t.call(n,r,i++)}),s}function Df(e){if(e._status===-1){var t=e._result;t=t(),t.then(function(n){(e._status===0||e._status===-1)&&(e._status=1,e._result=n)},function(n){(e._status===0||e._status===-1)&&(e._status=2,e._result=n)}),e._status===-1&&(e._status=0,e._result=t)}if(e._status===1)return e._result.default;throw e._result}var je={current:null},qi={transition:null},Rf={ReactCurrentDispatcher:je,ReactCurrentBatchConfig:qi,ReactCurrentOwner:La};function Uc(){throw Error("act(...) is not supported in production builds of React.")}re.Children={map:Hi,forEach:function(e,t,n){Hi(e,function(){t.apply(this,arguments)},n)},count:function(e){var t=0;return Hi(e,function(){t++}),t},toArray:function(e){return Hi(e,function(t){return t})||[]},only:function(e){if(!Pa(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};re.Component=Jn;re.Fragment=$f;re.Profiler=Nf;re.PureComponent=Ra;re.StrictMode=wf;re.Suspense=Sf;re.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Rf;re.act=Uc;re.cloneElement=function(e,t,n){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var s=Rc({},e.props),i=e.key,r=e.ref,a=e._owner;if(t!=null){if(t.ref!==void 0&&(r=t.ref,a=La.current),t.key!==void 0&&(i=""+t.key),e.type&&e.type.defaultProps)var l=e.type.defaultProps;for(u in t)Pc.call(t,u)&&!Mc.hasOwnProperty(u)&&(s[u]=t[u]===void 0&&l!==void 0?l[u]:t[u])}var u=arguments.length-2;if(u===1)s.children=n;else if(1<u){l=Array(u);for(var o=0;o<u;o++)l[o]=arguments[o+2];s.children=l}return{$$typeof:Os,type:e.type,key:i,ref:r,props:s,_owner:a}};re.createContext=function(e){return e={$$typeof:kf,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:bf,_context:e},e.Consumer=e};re.createElement=Oc;re.createFactory=function(e){var t=Oc.bind(null,e);return t.type=e,t};re.createRef=function(){return{current:null}};re.forwardRef=function(e){return{$$typeof:_f,render:e}};re.isValidElement=Pa;re.lazy=function(e){return{$$typeof:Cf,_payload:{_status:-1,_result:e},_init:Df}};re.memo=function(e,t){return{$$typeof:Ef,type:e,compare:t===void 0?null:t}};re.startTransition=function(e){var t=qi.transition;qi.transition={};try{e()}finally{qi.transition=t}};re.unstable_act=Uc;re.useCallback=function(e,t){return je.current.useCallback(e,t)};re.useContext=function(e){return je.current.useContext(e)};re.useDebugValue=function(){};re.useDeferredValue=function(e){return je.current.useDeferredValue(e)};re.useEffect=function(e,t){return je.current.useEffect(e,t)};re.useId=function(){return je.current.useId()};re.useImperativeHandle=function(e,t,n){return je.current.useImperativeHandle(e,t,n)};re.useInsertionEffect=function(e,t){return je.current.useInsertionEffect(e,t)};re.useLayoutEffect=function(e,t){return je.current.useLayoutEffect(e,t)};re.useMemo=function(e,t){return je.current.useMemo(e,t)};re.useReducer=function(e,t,n){return je.current.useReducer(e,t,n)};re.useRef=function(e){return je.current.useRef(e)};re.useState=function(e){return je.current.useState(e)};re.useSyncExternalStore=function(e,t,n){return je.current.useSyncExternalStore(e,t,n)};re.useTransition=function(){return je.current.useTransition()};re.version="18.3.1"});var Gi=sn((wg,Kc)=>{"use strict";Kc.exports=Bc()});var Qc=sn(fe=>{"use strict";function Ba(e,t){var n=e.length;e.push(t);e:for(;0<n;){var s=n-1>>>1,i=e[s];if(0<Vi(i,t))e[s]=t,e[n]=i,n=s;else break e}}function kt(e){return e.length===0?null:e[0]}function ji(e){if(e.length===0)return null;var t=e[0],n=e.pop();if(n!==t){e[0]=n;e:for(var s=0,i=e.length,r=i>>>1;s<r;){var a=2*(s+1)-1,l=e[a],u=a+1,o=e[u];if(0>Vi(l,n))u<i&&0>Vi(o,l)?(e[s]=o,e[u]=n,s=u):(e[s]=l,e[a]=n,s=a);else if(u<i&&0>Vi(o,n))e[s]=o,e[u]=n,s=u;else break e}}return t}function Vi(e,t){var n=e.sortIndex-t.sortIndex;return n!==0?n:e.id-t.id}typeof performance=="object"&&typeof performance.now=="function"?(zc=performance,fe.unstable_now=function(){return zc.now()}):(Ma=Date,Hc=Ma.now(),fe.unstable_now=function(){return Ma.now()-Hc});var zc,Ma,Hc,Lt=[],rn=[],If=1,ft=null,Be=3,Yi=!1,Tn=!1,Bs=!1,Gc=typeof setTimeout=="function"?setTimeout:null,Vc=typeof clearTimeout=="function"?clearTimeout:null,Fc=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function Ka(e){for(var t=kt(rn);t!==null;){if(t.callback===null)ji(rn);else if(t.startTime<=e)ji(rn),t.sortIndex=t.expirationTime,Ba(Lt,t);else break;t=kt(rn)}}function za(e){if(Bs=!1,Ka(e),!Tn)if(kt(Lt)!==null)Tn=!0,Fa(Ha);else{var t=kt(rn);t!==null&&qa(za,t.startTime-e)}}function Ha(e,t){Tn=!1,Bs&&(Bs=!1,Vc(Ks),Ks=-1),Yi=!0;var n=Be;try{for(Ka(t),ft=kt(Lt);ft!==null&&(!(ft.expirationTime>t)||e&&!Yc());){var s=ft.callback;if(typeof s=="function"){ft.callback=null,Be=ft.priorityLevel;var i=s(ft.expirationTime<=t);t=fe.unstable_now(),typeof i=="function"?ft.callback=i:ft===kt(Lt)&&ji(Lt),Ka(t)}else ji(Lt);ft=kt(Lt)}if(ft!==null)var r=!0;else{var a=kt(rn);a!==null&&qa(za,a.startTime-t),r=!1}return r}finally{ft=null,Be=n,Yi=!1}}var Qi=!1,Wi=null,Ks=-1,Wc=5,jc=-1;function Yc(){return!(fe.unstable_now()-jc<Wc)}function Oa(){if(Wi!==null){var e=fe.unstable_now();jc=e;var t=!0;try{t=Wi(!0,e)}finally{t?Us():(Qi=!1,Wi=null)}}else Qi=!1}var Us;typeof Fc=="function"?Us=function(){Fc(Oa)}:typeof MessageChannel<"u"?(Ua=new MessageChannel,qc=Ua.port2,Ua.port1.onmessage=Oa,Us=function(){qc.postMessage(null)}):Us=function(){Gc(Oa,0)};var Ua,qc;function Fa(e){Wi=e,Qi||(Qi=!0,Us())}function qa(e,t){Ks=Gc(function(){e(fe.unstable_now())},t)}fe.unstable_IdlePriority=5;fe.unstable_ImmediatePriority=1;fe.unstable_LowPriority=4;fe.unstable_NormalPriority=3;fe.unstable_Profiling=null;fe.unstable_UserBlockingPriority=2;fe.unstable_cancelCallback=function(e){e.callback=null};fe.unstable_continueExecution=function(){Tn||Yi||(Tn=!0,Fa(Ha))};fe.unstable_forceFrameRate=function(e){0>e||125<e?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):Wc=0<e?Math.floor(1e3/e):5};fe.unstable_getCurrentPriorityLevel=function(){return Be};fe.unstable_getFirstCallbackNode=function(){return kt(Lt)};fe.unstable_next=function(e){switch(Be){case 1:case 2:case 3:var t=3;break;default:t=Be}var n=Be;Be=t;try{return e()}finally{Be=n}};fe.unstable_pauseExecution=function(){};fe.unstable_requestPaint=function(){};fe.unstable_runWithPriority=function(e,t){switch(e){case 1:case 2:case 3:case 4:case 5:break;default:e=3}var n=Be;Be=e;try{return t()}finally{Be=n}};fe.unstable_scheduleCallback=function(e,t,n){var s=fe.unstable_now();switch(typeof n=="object"&&n!==null?(n=n.delay,n=typeof n=="number"&&0<n?s+n:s):n=s,e){case 1:var i=-1;break;case 2:i=250;break;case 5:i=1073741823;break;case 4:i=1e4;break;default:i=5e3}return i=n+i,e={id:If++,callback:t,priorityLevel:e,startTime:n,expirationTime:i,sortIndex:-1},n>s?(e.sortIndex=n,Ba(rn,e),kt(Lt)===null&&e===kt(rn)&&(Bs?(Vc(Ks),Ks=-1):Bs=!0,qa(za,n-s))):(e.sortIndex=i,Ba(Lt,e),Tn||Yi||(Tn=!0,Fa(Ha))),e};fe.unstable_shouldYield=Yc;fe.unstable_wrapCallback=function(e){var t=Be;return function(){var n=Be;Be=t;try{return e.apply(this,arguments)}finally{Be=n}}}});var Jc=sn((bg,Xc)=>{"use strict";Xc.exports=Qc()});var nm=sn(pt=>{"use strict";var Lf=Gi(),ut=Jc();function z(e){for(var t="https://reactjs.org/docs/error-decoder.html?invariant="+e,n=1;n<arguments.length;n++)t+="&args[]="+encodeURIComponent(arguments[n]);return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var rd=new Set,oi={};function zn(e,t){$s(e,t),$s(e+"Capture",t)}function $s(e,t){for(oi[e]=t,e=0;e<t.length;e++)rd.add(t[e])}var Yt=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),ml=Object.prototype.hasOwnProperty,Pf=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,Zc={},eu={};function Mf(e){return ml.call(eu,e)?!0:ml.call(Zc,e)?!1:Pf.test(e)?eu[e]=!0:(Zc[e]=!0,!1)}function Of(e,t,n,s){if(n!==null&&n.type===0)return!1;switch(typeof t){case"function":case"symbol":return!0;case"boolean":return s?!1:n!==null?!n.acceptsBooleans:(e=e.toLowerCase().slice(0,5),e!=="data-"&&e!=="aria-");default:return!1}}function Uf(e,t,n,s){if(t===null||typeof t>"u"||Of(e,t,n,s))return!0;if(s)return!1;if(n!==null)switch(n.type){case 3:return!t;case 4:return t===!1;case 5:return isNaN(t);case 6:return isNaN(t)||1>t}return!1}function Xe(e,t,n,s,i,r,a){this.acceptsBooleans=t===2||t===3||t===4,this.attributeName=s,this.attributeNamespace=i,this.mustUseProperty=n,this.propertyName=e,this.type=t,this.sanitizeURL=r,this.removeEmptyString=a}var Oe={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e){Oe[e]=new Xe(e,0,!1,e,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(e){var t=e[0];Oe[t]=new Xe(t,1,!1,e[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(e){Oe[e]=new Xe(e,2,!1,e.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(e){Oe[e]=new Xe(e,2,!1,e,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e){Oe[e]=new Xe(e,3,!1,e.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(e){Oe[e]=new Xe(e,3,!0,e,null,!1,!1)});["capture","download"].forEach(function(e){Oe[e]=new Xe(e,4,!1,e,null,!1,!1)});["cols","rows","size","span"].forEach(function(e){Oe[e]=new Xe(e,6,!1,e,null,!1,!1)});["rowSpan","start"].forEach(function(e){Oe[e]=new Xe(e,5,!1,e.toLowerCase(),null,!1,!1)});var ro=/[\-:]([a-z])/g;function ao(e){return e[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e){var t=e.replace(ro,ao);Oe[t]=new Xe(t,1,!1,e,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e){var t=e.replace(ro,ao);Oe[t]=new Xe(t,1,!1,e,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(e){var t=e.replace(ro,ao);Oe[t]=new Xe(t,1,!1,e,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(e){Oe[e]=new Xe(e,1,!1,e.toLowerCase(),null,!1,!1)});Oe.xlinkHref=new Xe("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(e){Oe[e]=new Xe(e,1,!1,e.toLowerCase(),null,!0,!0)});function lo(e,t,n,s){var i=Oe.hasOwnProperty(t)?Oe[t]:null;(i!==null?i.type!==0:s||!(2<t.length)||t[0]!=="o"&&t[0]!=="O"||t[1]!=="n"&&t[1]!=="N")&&(Uf(t,n,i,s)&&(n=null),s||i===null?Mf(t)&&(n===null?e.removeAttribute(t):e.setAttribute(t,""+n)):i.mustUseProperty?e[i.propertyName]=n===null?i.type===3?!1:"":n:(t=i.attributeName,s=i.attributeNamespace,n===null?e.removeAttribute(t):(i=i.type,n=i===3||i===4&&n===!0?"":""+n,s?e.setAttributeNS(s,t,n):e.setAttribute(t,n))))}var Zt=Lf.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,Xi=Symbol.for("react.element"),ts=Symbol.for("react.portal"),ns=Symbol.for("react.fragment"),oo=Symbol.for("react.strict_mode"),fl=Symbol.for("react.profiler"),ad=Symbol.for("react.provider"),ld=Symbol.for("react.context"),co=Symbol.for("react.forward_ref"),vl=Symbol.for("react.suspense"),yl=Symbol.for("react.suspense_list"),uo=Symbol.for("react.memo"),ln=Symbol.for("react.lazy"),od=Symbol.for("react.offscreen"),tu=Symbol.iterator;function zs(e){return e===null||typeof e!="object"?null:(e=tu&&e[tu]||e["@@iterator"],typeof e=="function"?e:null)}var Se=Object.assign,Ga;function Ys(e){if(Ga===void 0)try{throw Error()}catch(n){var t=n.stack.trim().match(/\n( *(at )?)/);Ga=t&&t[1]||""}return`
`+Ga+e}var Va=!1;function Wa(e,t){if(!e||Va)return"";Va=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(t)if(t=function(){throw Error()},Object.defineProperty(t.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(t,[])}catch(o){var s=o}Reflect.construct(e,[],t)}else{try{t.call()}catch(o){s=o}e.call(t.prototype)}else{try{throw Error()}catch(o){s=o}e()}}catch(o){if(o&&s&&typeof o.stack=="string"){for(var i=o.stack.split(`
`),r=s.stack.split(`
`),a=i.length-1,l=r.length-1;1<=a&&0<=l&&i[a]!==r[l];)l--;for(;1<=a&&0<=l;a--,l--)if(i[a]!==r[l]){if(a!==1||l!==1)do if(a--,l--,0>l||i[a]!==r[l]){var u=`
`+i[a].replace(" at new "," at ");return e.displayName&&u.includes("<anonymous>")&&(u=u.replace("<anonymous>",e.displayName)),u}while(1<=a&&0<=l);break}}}finally{Va=!1,Error.prepareStackTrace=n}return(e=e?e.displayName||e.name:"")?Ys(e):""}function Bf(e){switch(e.tag){case 5:return Ys(e.type);case 16:return Ys("Lazy");case 13:return Ys("Suspense");case 19:return Ys("SuspenseList");case 0:case 2:case 15:return e=Wa(e.type,!1),e;case 11:return e=Wa(e.type.render,!1),e;case 1:return e=Wa(e.type,!0),e;default:return""}}function hl(e){if(e==null)return null;if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case ns:return"Fragment";case ts:return"Portal";case fl:return"Profiler";case oo:return"StrictMode";case vl:return"Suspense";case yl:return"SuspenseList"}if(typeof e=="object")switch(e.$$typeof){case ld:return(e.displayName||"Context")+".Consumer";case ad:return(e._context.displayName||"Context")+".Provider";case co:var t=e.render;return e=e.displayName,e||(e=t.displayName||t.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case uo:return t=e.displayName||null,t!==null?t:hl(e.type)||"Memo";case ln:t=e._payload,e=e._init;try{return hl(e(t))}catch{}}return null}function Kf(e){var t=e.type;switch(e.tag){case 24:return"Cache";case 9:return(t.displayName||"Context")+".Consumer";case 10:return(t._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return e=t.render,e=e.displayName||e.name||"",t.displayName||(e!==""?"ForwardRef("+e+")":"ForwardRef");case 7:return"Fragment";case 5:return t;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return hl(t);case 8:return t===oo?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t}return null}function Nn(e){switch(typeof e){case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function cd(e){var t=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(t==="checkbox"||t==="radio")}function zf(e){var t=cd(e)?"checked":"value",n=Object.getOwnPropertyDescriptor(e.constructor.prototype,t),s=""+e[t];if(!e.hasOwnProperty(t)&&typeof n<"u"&&typeof n.get=="function"&&typeof n.set=="function"){var i=n.get,r=n.set;return Object.defineProperty(e,t,{configurable:!0,get:function(){return i.call(this)},set:function(a){s=""+a,r.call(this,a)}}),Object.defineProperty(e,t,{enumerable:n.enumerable}),{getValue:function(){return s},setValue:function(a){s=""+a},stopTracking:function(){e._valueTracker=null,delete e[t]}}}}function Ji(e){e._valueTracker||(e._valueTracker=zf(e))}function ud(e){if(!e)return!1;var t=e._valueTracker;if(!t)return!0;var n=t.getValue(),s="";return e&&(s=cd(e)?e.checked?"true":"false":e.value),e=s,e!==n?(t.setValue(e),!0):!1}function Er(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}function gl(e,t){var n=t.checked;return Se({},t,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:n??e._wrapperState.initialChecked})}function nu(e,t){var n=t.defaultValue==null?"":t.defaultValue,s=t.checked!=null?t.checked:t.defaultChecked;n=Nn(t.value!=null?t.value:n),e._wrapperState={initialChecked:s,initialValue:n,controlled:t.type==="checkbox"||t.type==="radio"?t.checked!=null:t.value!=null}}function dd(e,t){t=t.checked,t!=null&&lo(e,"checked",t,!1)}function $l(e,t){dd(e,t);var n=Nn(t.value),s=t.type;if(n!=null)s==="number"?(n===0&&e.value===""||e.value!=n)&&(e.value=""+n):e.value!==""+n&&(e.value=""+n);else if(s==="submit"||s==="reset"){e.removeAttribute("value");return}t.hasOwnProperty("value")?wl(e,t.type,n):t.hasOwnProperty("defaultValue")&&wl(e,t.type,Nn(t.defaultValue)),t.checked==null&&t.defaultChecked!=null&&(e.defaultChecked=!!t.defaultChecked)}function su(e,t,n){if(t.hasOwnProperty("value")||t.hasOwnProperty("defaultValue")){var s=t.type;if(!(s!=="submit"&&s!=="reset"||t.value!==void 0&&t.value!==null))return;t=""+e._wrapperState.initialValue,n||t===e.value||(e.value=t),e.defaultValue=t}n=e.name,n!==""&&(e.name=""),e.defaultChecked=!!e._wrapperState.initialChecked,n!==""&&(e.name=n)}function wl(e,t,n){(t!=="number"||Er(e.ownerDocument)!==e)&&(n==null?e.defaultValue=""+e._wrapperState.initialValue:e.defaultValue!==""+n&&(e.defaultValue=""+n))}var Qs=Array.isArray;function ms(e,t,n,s){if(e=e.options,t){t={};for(var i=0;i<n.length;i++)t["$"+n[i]]=!0;for(n=0;n<e.length;n++)i=t.hasOwnProperty("$"+e[n].value),e[n].selected!==i&&(e[n].selected=i),i&&s&&(e[n].defaultSelected=!0)}else{for(n=""+Nn(n),t=null,i=0;i<e.length;i++){if(e[i].value===n){e[i].selected=!0,s&&(e[i].defaultSelected=!0);return}t!==null||e[i].disabled||(t=e[i])}t!==null&&(t.selected=!0)}}function Nl(e,t){if(t.dangerouslySetInnerHTML!=null)throw Error(z(91));return Se({},t,{value:void 0,defaultValue:void 0,children:""+e._wrapperState.initialValue})}function iu(e,t){var n=t.value;if(n==null){if(n=t.children,t=t.defaultValue,n!=null){if(t!=null)throw Error(z(92));if(Qs(n)){if(1<n.length)throw Error(z(93));n=n[0]}t=n}t==null&&(t=""),n=t}e._wrapperState={initialValue:Nn(n)}}function pd(e,t){var n=Nn(t.value),s=Nn(t.defaultValue);n!=null&&(n=""+n,n!==e.value&&(e.value=n),t.defaultValue==null&&e.defaultValue!==n&&(e.defaultValue=n)),s!=null&&(e.defaultValue=""+s)}function ru(e){var t=e.textContent;t===e._wrapperState.initialValue&&t!==""&&t!==null&&(e.value=t)}function md(e){switch(e){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function bl(e,t){return e==null||e==="http://www.w3.org/1999/xhtml"?md(t):e==="http://www.w3.org/2000/svg"&&t==="foreignObject"?"http://www.w3.org/1999/xhtml":e}var Zi,fd=(function(e){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(t,n,s,i){MSApp.execUnsafeLocalFunction(function(){return e(t,n,s,i)})}:e})(function(e,t){if(e.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in e)e.innerHTML=t;else{for(Zi=Zi||document.createElement("div"),Zi.innerHTML="<svg>"+t.valueOf().toString()+"</svg>",t=Zi.firstChild;e.firstChild;)e.removeChild(e.firstChild);for(;t.firstChild;)e.appendChild(t.firstChild)}});function ci(e,t){if(t){var n=e.firstChild;if(n&&n===e.lastChild&&n.nodeType===3){n.nodeValue=t;return}}e.textContent=t}var Zs={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},Hf=["Webkit","ms","Moz","O"];Object.keys(Zs).forEach(function(e){Hf.forEach(function(t){t=t+e.charAt(0).toUpperCase()+e.substring(1),Zs[t]=Zs[e]})});function vd(e,t,n){return t==null||typeof t=="boolean"||t===""?"":n||typeof t!="number"||t===0||Zs.hasOwnProperty(e)&&Zs[e]?(""+t).trim():t+"px"}function yd(e,t){e=e.style;for(var n in t)if(t.hasOwnProperty(n)){var s=n.indexOf("--")===0,i=vd(n,t[n],s);n==="float"&&(n="cssFloat"),s?e.setProperty(n,i):e[n]=i}}var Ff=Se({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function kl(e,t){if(t){if(Ff[e]&&(t.children!=null||t.dangerouslySetInnerHTML!=null))throw Error(z(137,e));if(t.dangerouslySetInnerHTML!=null){if(t.children!=null)throw Error(z(60));if(typeof t.dangerouslySetInnerHTML!="object"||!("__html"in t.dangerouslySetInnerHTML))throw Error(z(61))}if(t.style!=null&&typeof t.style!="object")throw Error(z(62))}}function _l(e,t){if(e.indexOf("-")===-1)return typeof t.is=="string";switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Sl=null;function po(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var El=null,fs=null,vs=null;function au(e){if(e=Ci(e)){if(typeof El!="function")throw Error(z(280));var t=e.stateNode;t&&(t=ea(t),El(e.stateNode,e.type,t))}}function hd(e){fs?vs?vs.push(e):vs=[e]:fs=e}function gd(){if(fs){var e=fs,t=vs;if(vs=fs=null,au(e),t)for(e=0;e<t.length;e++)au(t[e])}}function $d(e,t){return e(t)}function wd(){}var ja=!1;function Nd(e,t,n){if(ja)return e(t,n);ja=!0;try{return $d(e,t,n)}finally{ja=!1,(fs!==null||vs!==null)&&(wd(),gd())}}function ui(e,t){var n=e.stateNode;if(n===null)return null;var s=ea(n);if(s===null)return null;n=s[t];e:switch(t){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(s=!s.disabled)||(e=e.type,s=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!s;break e;default:e=!1}if(e)return null;if(n&&typeof n!="function")throw Error(z(231,t,typeof n));return n}var Cl=!1;if(Yt)try{Zn={},Object.defineProperty(Zn,"passive",{get:function(){Cl=!0}}),window.addEventListener("test",Zn,Zn),window.removeEventListener("test",Zn,Zn)}catch{Cl=!1}var Zn;function qf(e,t,n,s,i,r,a,l,u){var o=Array.prototype.slice.call(arguments,3);try{t.apply(n,o)}catch(h){this.onError(h)}}var ei=!1,Cr=null,Tr=!1,Tl=null,Gf={onError:function(e){ei=!0,Cr=e}};function Vf(e,t,n,s,i,r,a,l,u){ei=!1,Cr=null,qf.apply(Gf,arguments)}function Wf(e,t,n,s,i,r,a,l,u){if(Vf.apply(this,arguments),ei){if(ei){var o=Cr;ei=!1,Cr=null}else throw Error(z(198));Tr||(Tr=!0,Tl=o)}}function Hn(e){var t=e,n=e;if(e.alternate)for(;t.return;)t=t.return;else{e=t;do t=e,(t.flags&4098)!==0&&(n=t.return),e=t.return;while(e)}return t.tag===3?n:null}function bd(e){if(e.tag===13){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function lu(e){if(Hn(e)!==e)throw Error(z(188))}function jf(e){var t=e.alternate;if(!t){if(t=Hn(e),t===null)throw Error(z(188));return t!==e?null:e}for(var n=e,s=t;;){var i=n.return;if(i===null)break;var r=i.alternate;if(r===null){if(s=i.return,s!==null){n=s;continue}break}if(i.child===r.child){for(r=i.child;r;){if(r===n)return lu(i),e;if(r===s)return lu(i),t;r=r.sibling}throw Error(z(188))}if(n.return!==s.return)n=i,s=r;else{for(var a=!1,l=i.child;l;){if(l===n){a=!0,n=i,s=r;break}if(l===s){a=!0,s=i,n=r;break}l=l.sibling}if(!a){for(l=r.child;l;){if(l===n){a=!0,n=r,s=i;break}if(l===s){a=!0,s=r,n=i;break}l=l.sibling}if(!a)throw Error(z(189))}}if(n.alternate!==s)throw Error(z(190))}if(n.tag!==3)throw Error(z(188));return n.stateNode.current===n?e:t}function kd(e){return e=jf(e),e!==null?_d(e):null}function _d(e){if(e.tag===5||e.tag===6)return e;for(e=e.child;e!==null;){var t=_d(e);if(t!==null)return t;e=e.sibling}return null}var Sd=ut.unstable_scheduleCallback,ou=ut.unstable_cancelCallback,Yf=ut.unstable_shouldYield,Qf=ut.unstable_requestPaint,Ce=ut.unstable_now,Xf=ut.unstable_getCurrentPriorityLevel,mo=ut.unstable_ImmediatePriority,Ed=ut.unstable_UserBlockingPriority,Ar=ut.unstable_NormalPriority,Jf=ut.unstable_LowPriority,Cd=ut.unstable_IdlePriority,Qr=null,Ut=null;function Zf(e){if(Ut&&typeof Ut.onCommitFiberRoot=="function")try{Ut.onCommitFiberRoot(Qr,e,void 0,(e.current.flags&128)===128)}catch{}}var Tt=Math.clz32?Math.clz32:nv,ev=Math.log,tv=Math.LN2;function nv(e){return e>>>=0,e===0?32:31-(ev(e)/tv|0)|0}var er=64,tr=4194304;function Xs(e){switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return e&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return e}}function xr(e,t){var n=e.pendingLanes;if(n===0)return 0;var s=0,i=e.suspendedLanes,r=e.pingedLanes,a=n&268435455;if(a!==0){var l=a&~i;l!==0?s=Xs(l):(r&=a,r!==0&&(s=Xs(r)))}else a=n&~i,a!==0?s=Xs(a):r!==0&&(s=Xs(r));if(s===0)return 0;if(t!==0&&t!==s&&(t&i)===0&&(i=s&-s,r=t&-t,i>=r||i===16&&(r&4194240)!==0))return t;if((s&4)!==0&&(s|=n&16),t=e.entangledLanes,t!==0)for(e=e.entanglements,t&=s;0<t;)n=31-Tt(t),i=1<<n,s|=e[n],t&=~i;return s}function sv(e,t){switch(e){case 1:case 2:case 4:return t+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function iv(e,t){for(var n=e.suspendedLanes,s=e.pingedLanes,i=e.expirationTimes,r=e.pendingLanes;0<r;){var a=31-Tt(r),l=1<<a,u=i[a];u===-1?((l&n)===0||(l&s)!==0)&&(i[a]=sv(l,t)):u<=t&&(e.expiredLanes|=l),r&=~l}}function Al(e){return e=e.pendingLanes&-1073741825,e!==0?e:e&1073741824?1073741824:0}function Td(){var e=er;return er<<=1,(er&4194240)===0&&(er=64),e}function Ya(e){for(var t=[],n=0;31>n;n++)t.push(e);return t}function Si(e,t,n){e.pendingLanes|=t,t!==536870912&&(e.suspendedLanes=0,e.pingedLanes=0),e=e.eventTimes,t=31-Tt(t),e[t]=n}function rv(e,t){var n=e.pendingLanes&~t;e.pendingLanes=t,e.suspendedLanes=0,e.pingedLanes=0,e.expiredLanes&=t,e.mutableReadLanes&=t,e.entangledLanes&=t,t=e.entanglements;var s=e.eventTimes;for(e=e.expirationTimes;0<n;){var i=31-Tt(n),r=1<<i;t[i]=0,s[i]=-1,e[i]=-1,n&=~r}}function fo(e,t){var n=e.entangledLanes|=t;for(e=e.entanglements;n;){var s=31-Tt(n),i=1<<s;i&t|e[s]&t&&(e[s]|=t),n&=~i}}var de=0;function Ad(e){return e&=-e,1<e?4<e?(e&268435455)!==0?16:536870912:4:1}var xd,vo,Dd,Rd,Id,xl=!1,nr=[],mn=null,fn=null,vn=null,di=new Map,pi=new Map,cn=[],av="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function cu(e,t){switch(e){case"focusin":case"focusout":mn=null;break;case"dragenter":case"dragleave":fn=null;break;case"mouseover":case"mouseout":vn=null;break;case"pointerover":case"pointerout":di.delete(t.pointerId);break;case"gotpointercapture":case"lostpointercapture":pi.delete(t.pointerId)}}function Hs(e,t,n,s,i,r){return e===null||e.nativeEvent!==r?(e={blockedOn:t,domEventName:n,eventSystemFlags:s,nativeEvent:r,targetContainers:[i]},t!==null&&(t=Ci(t),t!==null&&vo(t)),e):(e.eventSystemFlags|=s,t=e.targetContainers,i!==null&&t.indexOf(i)===-1&&t.push(i),e)}function lv(e,t,n,s,i){switch(t){case"focusin":return mn=Hs(mn,e,t,n,s,i),!0;case"dragenter":return fn=Hs(fn,e,t,n,s,i),!0;case"mouseover":return vn=Hs(vn,e,t,n,s,i),!0;case"pointerover":var r=i.pointerId;return di.set(r,Hs(di.get(r)||null,e,t,n,s,i)),!0;case"gotpointercapture":return r=i.pointerId,pi.set(r,Hs(pi.get(r)||null,e,t,n,s,i)),!0}return!1}function Ld(e){var t=Dn(e.target);if(t!==null){var n=Hn(t);if(n!==null){if(t=n.tag,t===13){if(t=bd(n),t!==null){e.blockedOn=t,Id(e.priority,function(){Dd(n)});return}}else if(t===3&&n.stateNode.current.memoizedState.isDehydrated){e.blockedOn=n.tag===3?n.stateNode.containerInfo:null;return}}}e.blockedOn=null}function yr(e){if(e.blockedOn!==null)return!1;for(var t=e.targetContainers;0<t.length;){var n=Dl(e.domEventName,e.eventSystemFlags,t[0],e.nativeEvent);if(n===null){n=e.nativeEvent;var s=new n.constructor(n.type,n);Sl=s,n.target.dispatchEvent(s),Sl=null}else return t=Ci(n),t!==null&&vo(t),e.blockedOn=n,!1;t.shift()}return!0}function uu(e,t,n){yr(e)&&n.delete(t)}function ov(){xl=!1,mn!==null&&yr(mn)&&(mn=null),fn!==null&&yr(fn)&&(fn=null),vn!==null&&yr(vn)&&(vn=null),di.forEach(uu),pi.forEach(uu)}function Fs(e,t){e.blockedOn===t&&(e.blockedOn=null,xl||(xl=!0,ut.unstable_scheduleCallback(ut.unstable_NormalPriority,ov)))}function mi(e){function t(i){return Fs(i,e)}if(0<nr.length){Fs(nr[0],e);for(var n=1;n<nr.length;n++){var s=nr[n];s.blockedOn===e&&(s.blockedOn=null)}}for(mn!==null&&Fs(mn,e),fn!==null&&Fs(fn,e),vn!==null&&Fs(vn,e),di.forEach(t),pi.forEach(t),n=0;n<cn.length;n++)s=cn[n],s.blockedOn===e&&(s.blockedOn=null);for(;0<cn.length&&(n=cn[0],n.blockedOn===null);)Ld(n),n.blockedOn===null&&cn.shift()}var ys=Zt.ReactCurrentBatchConfig,Dr=!0;function cv(e,t,n,s){var i=de,r=ys.transition;ys.transition=null;try{de=1,yo(e,t,n,s)}finally{de=i,ys.transition=r}}function uv(e,t,n,s){var i=de,r=ys.transition;ys.transition=null;try{de=4,yo(e,t,n,s)}finally{de=i,ys.transition=r}}function yo(e,t,n,s){if(Dr){var i=Dl(e,t,n,s);if(i===null)nl(e,t,s,Rr,n),cu(e,s);else if(lv(i,e,t,n,s))s.stopPropagation();else if(cu(e,s),t&4&&-1<av.indexOf(e)){for(;i!==null;){var r=Ci(i);if(r!==null&&xd(r),r=Dl(e,t,n,s),r===null&&nl(e,t,s,Rr,n),r===i)break;i=r}i!==null&&s.stopPropagation()}else nl(e,t,s,null,n)}}var Rr=null;function Dl(e,t,n,s){if(Rr=null,e=po(s),e=Dn(e),e!==null)if(t=Hn(e),t===null)e=null;else if(n=t.tag,n===13){if(e=bd(t),e!==null)return e;e=null}else if(n===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;e=null}else t!==e&&(e=null);return Rr=e,null}function Pd(e){switch(e){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(Xf()){case mo:return 1;case Ed:return 4;case Ar:case Jf:return 16;case Cd:return 536870912;default:return 16}default:return 16}}var dn=null,ho=null,hr=null;function Md(){if(hr)return hr;var e,t=ho,n=t.length,s,i="value"in dn?dn.value:dn.textContent,r=i.length;for(e=0;e<n&&t[e]===i[e];e++);var a=n-e;for(s=1;s<=a&&t[n-s]===i[r-s];s++);return hr=i.slice(e,1<s?1-s:void 0)}function gr(e){var t=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&t===13&&(e=13)):e=t,e===10&&(e=13),32<=e||e===13?e:0}function sr(){return!0}function du(){return!1}function dt(e){function t(n,s,i,r,a){this._reactName=n,this._targetInst=i,this.type=s,this.nativeEvent=r,this.target=a,this.currentTarget=null;for(var l in e)e.hasOwnProperty(l)&&(n=e[l],this[l]=n?n(r):r[l]);return this.isDefaultPrevented=(r.defaultPrevented!=null?r.defaultPrevented:r.returnValue===!1)?sr:du,this.isPropagationStopped=du,this}return Se(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var n=this.nativeEvent;n&&(n.preventDefault?n.preventDefault():typeof n.returnValue!="unknown"&&(n.returnValue=!1),this.isDefaultPrevented=sr)},stopPropagation:function(){var n=this.nativeEvent;n&&(n.stopPropagation?n.stopPropagation():typeof n.cancelBubble!="unknown"&&(n.cancelBubble=!0),this.isPropagationStopped=sr)},persist:function(){},isPersistent:sr}),t}var Es={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},go=dt(Es),Ei=Se({},Es,{view:0,detail:0}),dv=dt(Ei),Qa,Xa,qs,Xr=Se({},Ei,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:$o,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==qs&&(qs&&e.type==="mousemove"?(Qa=e.screenX-qs.screenX,Xa=e.screenY-qs.screenY):Xa=Qa=0,qs=e),Qa)},movementY:function(e){return"movementY"in e?e.movementY:Xa}}),pu=dt(Xr),pv=Se({},Xr,{dataTransfer:0}),mv=dt(pv),fv=Se({},Ei,{relatedTarget:0}),Ja=dt(fv),vv=Se({},Es,{animationName:0,elapsedTime:0,pseudoElement:0}),yv=dt(vv),hv=Se({},Es,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),gv=dt(hv),$v=Se({},Es,{data:0}),mu=dt($v),wv={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},Nv={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},bv={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function kv(e){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(e):(e=bv[e])?!!t[e]:!1}function $o(){return kv}var _v=Se({},Ei,{key:function(e){if(e.key){var t=wv[e.key]||e.key;if(t!=="Unidentified")return t}return e.type==="keypress"?(e=gr(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?Nv[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:$o,charCode:function(e){return e.type==="keypress"?gr(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?gr(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),Sv=dt(_v),Ev=Se({},Xr,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),fu=dt(Ev),Cv=Se({},Ei,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:$o}),Tv=dt(Cv),Av=Se({},Es,{propertyName:0,elapsedTime:0,pseudoElement:0}),xv=dt(Av),Dv=Se({},Xr,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),Rv=dt(Dv),Iv=[9,13,27,32],wo=Yt&&"CompositionEvent"in window,ti=null;Yt&&"documentMode"in document&&(ti=document.documentMode);var Lv=Yt&&"TextEvent"in window&&!ti,Od=Yt&&(!wo||ti&&8<ti&&11>=ti),vu=" ",yu=!1;function Ud(e,t){switch(e){case"keyup":return Iv.indexOf(t.keyCode)!==-1;case"keydown":return t.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function Bd(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}var ss=!1;function Pv(e,t){switch(e){case"compositionend":return Bd(t);case"keypress":return t.which!==32?null:(yu=!0,vu);case"textInput":return e=t.data,e===vu&&yu?null:e;default:return null}}function Mv(e,t){if(ss)return e==="compositionend"||!wo&&Ud(e,t)?(e=Md(),hr=ho=dn=null,ss=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case"compositionend":return Od&&t.locale!=="ko"?null:t.data;default:return null}}var Ov={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function hu(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t==="input"?!!Ov[e.type]:t==="textarea"}function Kd(e,t,n,s){hd(s),t=Ir(t,"onChange"),0<t.length&&(n=new go("onChange","change",null,n,s),e.push({event:n,listeners:t}))}var ni=null,fi=null;function Uv(e){Xd(e,0)}function Jr(e){var t=as(e);if(ud(t))return e}function Bv(e,t){if(e==="change")return t}var zd=!1;Yt&&(Yt?(rr="oninput"in document,rr||(Za=document.createElement("div"),Za.setAttribute("oninput","return;"),rr=typeof Za.oninput=="function"),ir=rr):ir=!1,zd=ir&&(!document.documentMode||9<document.documentMode));var ir,rr,Za;function gu(){ni&&(ni.detachEvent("onpropertychange",Hd),fi=ni=null)}function Hd(e){if(e.propertyName==="value"&&Jr(fi)){var t=[];Kd(t,fi,e,po(e)),Nd(Uv,t)}}function Kv(e,t,n){e==="focusin"?(gu(),ni=t,fi=n,ni.attachEvent("onpropertychange",Hd)):e==="focusout"&&gu()}function zv(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return Jr(fi)}function Hv(e,t){if(e==="click")return Jr(t)}function Fv(e,t){if(e==="input"||e==="change")return Jr(t)}function qv(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var xt=typeof Object.is=="function"?Object.is:qv;function vi(e,t){if(xt(e,t))return!0;if(typeof e!="object"||e===null||typeof t!="object"||t===null)return!1;var n=Object.keys(e),s=Object.keys(t);if(n.length!==s.length)return!1;for(s=0;s<n.length;s++){var i=n[s];if(!ml.call(t,i)||!xt(e[i],t[i]))return!1}return!0}function $u(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function wu(e,t){var n=$u(e);e=0;for(var s;n;){if(n.nodeType===3){if(s=e+n.textContent.length,e<=t&&s>=t)return{node:n,offset:t-e};e=s}e:{for(;n;){if(n.nextSibling){n=n.nextSibling;break e}n=n.parentNode}n=void 0}n=$u(n)}}function Fd(e,t){return e&&t?e===t?!0:e&&e.nodeType===3?!1:t&&t.nodeType===3?Fd(e,t.parentNode):"contains"in e?e.contains(t):e.compareDocumentPosition?!!(e.compareDocumentPosition(t)&16):!1:!1}function qd(){for(var e=window,t=Er();t instanceof e.HTMLIFrameElement;){try{var n=typeof t.contentWindow.location.href=="string"}catch{n=!1}if(n)e=t.contentWindow;else break;t=Er(e.document)}return t}function No(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t&&(t==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||t==="textarea"||e.contentEditable==="true")}function Gv(e){var t=qd(),n=e.focusedElem,s=e.selectionRange;if(t!==n&&n&&n.ownerDocument&&Fd(n.ownerDocument.documentElement,n)){if(s!==null&&No(n)){if(t=s.start,e=s.end,e===void 0&&(e=t),"selectionStart"in n)n.selectionStart=t,n.selectionEnd=Math.min(e,n.value.length);else if(e=(t=n.ownerDocument||document)&&t.defaultView||window,e.getSelection){e=e.getSelection();var i=n.textContent.length,r=Math.min(s.start,i);s=s.end===void 0?r:Math.min(s.end,i),!e.extend&&r>s&&(i=s,s=r,r=i),i=wu(n,r);var a=wu(n,s);i&&a&&(e.rangeCount!==1||e.anchorNode!==i.node||e.anchorOffset!==i.offset||e.focusNode!==a.node||e.focusOffset!==a.offset)&&(t=t.createRange(),t.setStart(i.node,i.offset),e.removeAllRanges(),r>s?(e.addRange(t),e.extend(a.node,a.offset)):(t.setEnd(a.node,a.offset),e.addRange(t)))}}for(t=[],e=n;e=e.parentNode;)e.nodeType===1&&t.push({element:e,left:e.scrollLeft,top:e.scrollTop});for(typeof n.focus=="function"&&n.focus(),n=0;n<t.length;n++)e=t[n],e.element.scrollLeft=e.left,e.element.scrollTop=e.top}}var Vv=Yt&&"documentMode"in document&&11>=document.documentMode,is=null,Rl=null,si=null,Il=!1;function Nu(e,t,n){var s=n.window===n?n.document:n.nodeType===9?n:n.ownerDocument;Il||is==null||is!==Er(s)||(s=is,"selectionStart"in s&&No(s)?s={start:s.selectionStart,end:s.selectionEnd}:(s=(s.ownerDocument&&s.ownerDocument.defaultView||window).getSelection(),s={anchorNode:s.anchorNode,anchorOffset:s.anchorOffset,focusNode:s.focusNode,focusOffset:s.focusOffset}),si&&vi(si,s)||(si=s,s=Ir(Rl,"onSelect"),0<s.length&&(t=new go("onSelect","select",null,t,n),e.push({event:t,listeners:s}),t.target=is)))}function ar(e,t){var n={};return n[e.toLowerCase()]=t.toLowerCase(),n["Webkit"+e]="webkit"+t,n["Moz"+e]="moz"+t,n}var rs={animationend:ar("Animation","AnimationEnd"),animationiteration:ar("Animation","AnimationIteration"),animationstart:ar("Animation","AnimationStart"),transitionend:ar("Transition","TransitionEnd")},el={},Gd={};Yt&&(Gd=document.createElement("div").style,"AnimationEvent"in window||(delete rs.animationend.animation,delete rs.animationiteration.animation,delete rs.animationstart.animation),"TransitionEvent"in window||delete rs.transitionend.transition);function Zr(e){if(el[e])return el[e];if(!rs[e])return e;var t=rs[e],n;for(n in t)if(t.hasOwnProperty(n)&&n in Gd)return el[e]=t[n];return e}var Vd=Zr("animationend"),Wd=Zr("animationiteration"),jd=Zr("animationstart"),Yd=Zr("transitionend"),Qd=new Map,bu="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function kn(e,t){Qd.set(e,t),zn(t,[e])}for(lr=0;lr<bu.length;lr++)or=bu[lr],ku=or.toLowerCase(),_u=or[0].toUpperCase()+or.slice(1),kn(ku,"on"+_u);var or,ku,_u,lr;kn(Vd,"onAnimationEnd");kn(Wd,"onAnimationIteration");kn(jd,"onAnimationStart");kn("dblclick","onDoubleClick");kn("focusin","onFocus");kn("focusout","onBlur");kn(Yd,"onTransitionEnd");$s("onMouseEnter",["mouseout","mouseover"]);$s("onMouseLeave",["mouseout","mouseover"]);$s("onPointerEnter",["pointerout","pointerover"]);$s("onPointerLeave",["pointerout","pointerover"]);zn("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));zn("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));zn("onBeforeInput",["compositionend","keypress","textInput","paste"]);zn("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));zn("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));zn("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var Js="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),Wv=new Set("cancel close invalid load scroll toggle".split(" ").concat(Js));function Su(e,t,n){var s=e.type||"unknown-event";e.currentTarget=n,Wf(s,t,void 0,e),e.currentTarget=null}function Xd(e,t){t=(t&4)!==0;for(var n=0;n<e.length;n++){var s=e[n],i=s.event;s=s.listeners;e:{var r=void 0;if(t)for(var a=s.length-1;0<=a;a--){var l=s[a],u=l.instance,o=l.currentTarget;if(l=l.listener,u!==r&&i.isPropagationStopped())break e;Su(i,l,o),r=u}else for(a=0;a<s.length;a++){if(l=s[a],u=l.instance,o=l.currentTarget,l=l.listener,u!==r&&i.isPropagationStopped())break e;Su(i,l,o),r=u}}}if(Tr)throw e=Tl,Tr=!1,Tl=null,e}function ye(e,t){var n=t[Ul];n===void 0&&(n=t[Ul]=new Set);var s=e+"__bubble";n.has(s)||(Jd(t,e,2,!1),n.add(s))}function tl(e,t,n){var s=0;t&&(s|=4),Jd(n,e,s,t)}var cr="_reactListening"+Math.random().toString(36).slice(2);function yi(e){if(!e[cr]){e[cr]=!0,rd.forEach(function(n){n!=="selectionchange"&&(Wv.has(n)||tl(n,!1,e),tl(n,!0,e))});var t=e.nodeType===9?e:e.ownerDocument;t===null||t[cr]||(t[cr]=!0,tl("selectionchange",!1,t))}}function Jd(e,t,n,s){switch(Pd(t)){case 1:var i=cv;break;case 4:i=uv;break;default:i=yo}n=i.bind(null,t,n,e),i=void 0,!Cl||t!=="touchstart"&&t!=="touchmove"&&t!=="wheel"||(i=!0),s?i!==void 0?e.addEventListener(t,n,{capture:!0,passive:i}):e.addEventListener(t,n,!0):i!==void 0?e.addEventListener(t,n,{passive:i}):e.addEventListener(t,n,!1)}function nl(e,t,n,s,i){var r=s;if((t&1)===0&&(t&2)===0&&s!==null)e:for(;;){if(s===null)return;var a=s.tag;if(a===3||a===4){var l=s.stateNode.containerInfo;if(l===i||l.nodeType===8&&l.parentNode===i)break;if(a===4)for(a=s.return;a!==null;){var u=a.tag;if((u===3||u===4)&&(u=a.stateNode.containerInfo,u===i||u.nodeType===8&&u.parentNode===i))return;a=a.return}for(;l!==null;){if(a=Dn(l),a===null)return;if(u=a.tag,u===5||u===6){s=r=a;continue e}l=l.parentNode}}s=s.return}Nd(function(){var o=r,h=po(n),g=[];e:{var v=Qd.get(e);if(v!==void 0){var w=go,_=e;switch(e){case"keypress":if(gr(n)===0)break e;case"keydown":case"keyup":w=Sv;break;case"focusin":_="focus",w=Ja;break;case"focusout":_="blur",w=Ja;break;case"beforeblur":case"afterblur":w=Ja;break;case"click":if(n.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":w=pu;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":w=mv;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":w=Tv;break;case Vd:case Wd:case jd:w=yv;break;case Yd:w=xv;break;case"scroll":w=dv;break;case"wheel":w=Rv;break;case"copy":case"cut":case"paste":w=gv;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":w=fu}var N=(t&4)!==0,E=!N&&e==="scroll",y=N?v!==null?v+"Capture":null:v;N=[];for(var f=o,p;f!==null;){p=f;var k=p.stateNode;if(p.tag===5&&k!==null&&(p=k,y!==null&&(k=ui(f,y),k!=null&&N.push(hi(f,k,p)))),E)break;f=f.return}0<N.length&&(v=new w(v,_,null,n,h),g.push({event:v,listeners:N}))}}if((t&7)===0){e:{if(v=e==="mouseover"||e==="pointerover",w=e==="mouseout"||e==="pointerout",v&&n!==Sl&&(_=n.relatedTarget||n.fromElement)&&(Dn(_)||_[Qt]))break e;if((w||v)&&(v=h.window===h?h:(v=h.ownerDocument)?v.defaultView||v.parentWindow:window,w?(_=n.relatedTarget||n.toElement,w=o,_=_?Dn(_):null,_!==null&&(E=Hn(_),_!==E||_.tag!==5&&_.tag!==6)&&(_=null)):(w=null,_=o),w!==_)){if(N=pu,k="onMouseLeave",y="onMouseEnter",f="mouse",(e==="pointerout"||e==="pointerover")&&(N=fu,k="onPointerLeave",y="onPointerEnter",f="pointer"),E=w==null?v:as(w),p=_==null?v:as(_),v=new N(k,f+"leave",w,n,h),v.target=E,v.relatedTarget=p,k=null,Dn(h)===o&&(N=new N(y,f+"enter",_,n,h),N.target=p,N.relatedTarget=E,k=N),E=k,w&&_)t:{for(N=w,y=_,f=0,p=N;p;p=es(p))f++;for(p=0,k=y;k;k=es(k))p++;for(;0<f-p;)N=es(N),f--;for(;0<p-f;)y=es(y),p--;for(;f--;){if(N===y||y!==null&&N===y.alternate)break t;N=es(N),y=es(y)}N=null}else N=null;w!==null&&Eu(g,v,w,N,!1),_!==null&&E!==null&&Eu(g,E,_,N,!0)}}e:{if(v=o?as(o):window,w=v.nodeName&&v.nodeName.toLowerCase(),w==="select"||w==="input"&&v.type==="file")var b=Bv;else if(hu(v))if(zd)b=Fv;else{b=zv;var x=Kv}else(w=v.nodeName)&&w.toLowerCase()==="input"&&(v.type==="checkbox"||v.type==="radio")&&(b=Hv);if(b&&(b=b(e,o))){Kd(g,b,n,h);break e}x&&x(e,v,o),e==="focusout"&&(x=v._wrapperState)&&x.controlled&&v.type==="number"&&wl(v,"number",v.value)}switch(x=o?as(o):window,e){case"focusin":(hu(x)||x.contentEditable==="true")&&(is=x,Rl=o,si=null);break;case"focusout":si=Rl=is=null;break;case"mousedown":Il=!0;break;case"contextmenu":case"mouseup":case"dragend":Il=!1,Nu(g,n,h);break;case"selectionchange":if(Vv)break;case"keydown":case"keyup":Nu(g,n,h)}var $;if(wo)e:{switch(e){case"compositionstart":var S="onCompositionStart";break e;case"compositionend":S="onCompositionEnd";break e;case"compositionupdate":S="onCompositionUpdate";break e}S=void 0}else ss?Ud(e,n)&&(S="onCompositionEnd"):e==="keydown"&&n.keyCode===229&&(S="onCompositionStart");S&&(Od&&n.locale!=="ko"&&(ss||S!=="onCompositionStart"?S==="onCompositionEnd"&&ss&&($=Md()):(dn=h,ho="value"in dn?dn.value:dn.textContent,ss=!0)),x=Ir(o,S),0<x.length&&(S=new mu(S,e,null,n,h),g.push({event:S,listeners:x}),$?S.data=$:($=Bd(n),$!==null&&(S.data=$)))),($=Lv?Pv(e,n):Mv(e,n))&&(o=Ir(o,"onBeforeInput"),0<o.length&&(h=new mu("onBeforeInput","beforeinput",null,n,h),g.push({event:h,listeners:o}),h.data=$))}Xd(g,t)})}function hi(e,t,n){return{instance:e,listener:t,currentTarget:n}}function Ir(e,t){for(var n=t+"Capture",s=[];e!==null;){var i=e,r=i.stateNode;i.tag===5&&r!==null&&(i=r,r=ui(e,n),r!=null&&s.unshift(hi(e,r,i)),r=ui(e,t),r!=null&&s.push(hi(e,r,i))),e=e.return}return s}function es(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5);return e||null}function Eu(e,t,n,s,i){for(var r=t._reactName,a=[];n!==null&&n!==s;){var l=n,u=l.alternate,o=l.stateNode;if(u!==null&&u===s)break;l.tag===5&&o!==null&&(l=o,i?(u=ui(n,r),u!=null&&a.unshift(hi(n,u,l))):i||(u=ui(n,r),u!=null&&a.push(hi(n,u,l)))),n=n.return}a.length!==0&&e.push({event:t,listeners:a})}var jv=/\r\n?/g,Yv=/\u0000|\uFFFD/g;function Cu(e){return(typeof e=="string"?e:""+e).replace(jv,`
`).replace(Yv,"")}function ur(e,t,n){if(t=Cu(t),Cu(e)!==t&&n)throw Error(z(425))}function Lr(){}var Ll=null,Pl=null;function Ml(e,t){return e==="textarea"||e==="noscript"||typeof t.children=="string"||typeof t.children=="number"||typeof t.dangerouslySetInnerHTML=="object"&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}var Ol=typeof setTimeout=="function"?setTimeout:void 0,Qv=typeof clearTimeout=="function"?clearTimeout:void 0,Tu=typeof Promise=="function"?Promise:void 0,Xv=typeof queueMicrotask=="function"?queueMicrotask:typeof Tu<"u"?function(e){return Tu.resolve(null).then(e).catch(Jv)}:Ol;function Jv(e){setTimeout(function(){throw e})}function sl(e,t){var n=t,s=0;do{var i=n.nextSibling;if(e.removeChild(n),i&&i.nodeType===8)if(n=i.data,n==="/$"){if(s===0){e.removeChild(i),mi(t);return}s--}else n!=="$"&&n!=="$?"&&n!=="$!"||s++;n=i}while(n);mi(t)}function yn(e){for(;e!=null;e=e.nextSibling){var t=e.nodeType;if(t===1||t===3)break;if(t===8){if(t=e.data,t==="$"||t==="$!"||t==="$?")break;if(t==="/$")return null}}return e}function Au(e){e=e.previousSibling;for(var t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="$"||n==="$!"||n==="$?"){if(t===0)return e;t--}else n==="/$"&&t++}e=e.previousSibling}return null}var Cs=Math.random().toString(36).slice(2),Ot="__reactFiber$"+Cs,gi="__reactProps$"+Cs,Qt="__reactContainer$"+Cs,Ul="__reactEvents$"+Cs,Zv="__reactListeners$"+Cs,ey="__reactHandles$"+Cs;function Dn(e){var t=e[Ot];if(t)return t;for(var n=e.parentNode;n;){if(t=n[Qt]||n[Ot]){if(n=t.alternate,t.child!==null||n!==null&&n.child!==null)for(e=Au(e);e!==null;){if(n=e[Ot])return n;e=Au(e)}return t}e=n,n=e.parentNode}return null}function Ci(e){return e=e[Ot]||e[Qt],!e||e.tag!==5&&e.tag!==6&&e.tag!==13&&e.tag!==3?null:e}function as(e){if(e.tag===5||e.tag===6)return e.stateNode;throw Error(z(33))}function ea(e){return e[gi]||null}var Bl=[],ls=-1;function _n(e){return{current:e}}function he(e){0>ls||(e.current=Bl[ls],Bl[ls]=null,ls--)}function ve(e,t){ls++,Bl[ls]=e.current,e.current=t}var bn={},Fe=_n(bn),st=_n(!1),Mn=bn;function ws(e,t){var n=e.type.contextTypes;if(!n)return bn;var s=e.stateNode;if(s&&s.__reactInternalMemoizedUnmaskedChildContext===t)return s.__reactInternalMemoizedMaskedChildContext;var i={},r;for(r in n)i[r]=t[r];return s&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=t,e.__reactInternalMemoizedMaskedChildContext=i),i}function it(e){return e=e.childContextTypes,e!=null}function Pr(){he(st),he(Fe)}function xu(e,t,n){if(Fe.current!==bn)throw Error(z(168));ve(Fe,t),ve(st,n)}function Zd(e,t,n){var s=e.stateNode;if(t=t.childContextTypes,typeof s.getChildContext!="function")return n;s=s.getChildContext();for(var i in s)if(!(i in t))throw Error(z(108,Kf(e)||"Unknown",i));return Se({},n,s)}function Mr(e){return e=(e=e.stateNode)&&e.__reactInternalMemoizedMergedChildContext||bn,Mn=Fe.current,ve(Fe,e),ve(st,st.current),!0}function Du(e,t,n){var s=e.stateNode;if(!s)throw Error(z(169));n?(e=Zd(e,t,Mn),s.__reactInternalMemoizedMergedChildContext=e,he(st),he(Fe),ve(Fe,e)):he(st),ve(st,n)}var Gt=null,ta=!1,il=!1;function ep(e){Gt===null?Gt=[e]:Gt.push(e)}function ty(e){ta=!0,ep(e)}function Sn(){if(!il&&Gt!==null){il=!0;var e=0,t=de;try{var n=Gt;for(de=1;e<n.length;e++){var s=n[e];do s=s(!0);while(s!==null)}Gt=null,ta=!1}catch(i){throw Gt!==null&&(Gt=Gt.slice(e+1)),Sd(mo,Sn),i}finally{de=t,il=!1}}return null}var os=[],cs=0,Or=null,Ur=0,vt=[],yt=0,On=null,Vt=1,Wt="";function An(e,t){os[cs++]=Ur,os[cs++]=Or,Or=e,Ur=t}function tp(e,t,n){vt[yt++]=Vt,vt[yt++]=Wt,vt[yt++]=On,On=e;var s=Vt;e=Wt;var i=32-Tt(s)-1;s&=~(1<<i),n+=1;var r=32-Tt(t)+i;if(30<r){var a=i-i%5;r=(s&(1<<a)-1).toString(32),s>>=a,i-=a,Vt=1<<32-Tt(t)+i|n<<i|s,Wt=r+e}else Vt=1<<r|n<<i|s,Wt=e}function bo(e){e.return!==null&&(An(e,1),tp(e,1,0))}function ko(e){for(;e===Or;)Or=os[--cs],os[cs]=null,Ur=os[--cs],os[cs]=null;for(;e===On;)On=vt[--yt],vt[yt]=null,Wt=vt[--yt],vt[yt]=null,Vt=vt[--yt],vt[yt]=null}var ct=null,ot=null,be=!1,Ct=null;function np(e,t){var n=ht(5,null,null,0);n.elementType="DELETED",n.stateNode=t,n.return=e,t=e.deletions,t===null?(e.deletions=[n],e.flags|=16):t.push(n)}function Ru(e,t){switch(e.tag){case 5:var n=e.type;return t=t.nodeType!==1||n.toLowerCase()!==t.nodeName.toLowerCase()?null:t,t!==null?(e.stateNode=t,ct=e,ot=yn(t.firstChild),!0):!1;case 6:return t=e.pendingProps===""||t.nodeType!==3?null:t,t!==null?(e.stateNode=t,ct=e,ot=null,!0):!1;case 13:return t=t.nodeType!==8?null:t,t!==null?(n=On!==null?{id:Vt,overflow:Wt}:null,e.memoizedState={dehydrated:t,treeContext:n,retryLane:1073741824},n=ht(18,null,null,0),n.stateNode=t,n.return=e,e.child=n,ct=e,ot=null,!0):!1;default:return!1}}function Kl(e){return(e.mode&1)!==0&&(e.flags&128)===0}function zl(e){if(be){var t=ot;if(t){var n=t;if(!Ru(e,t)){if(Kl(e))throw Error(z(418));t=yn(n.nextSibling);var s=ct;t&&Ru(e,t)?np(s,n):(e.flags=e.flags&-4097|2,be=!1,ct=e)}}else{if(Kl(e))throw Error(z(418));e.flags=e.flags&-4097|2,be=!1,ct=e}}}function Iu(e){for(e=e.return;e!==null&&e.tag!==5&&e.tag!==3&&e.tag!==13;)e=e.return;ct=e}function dr(e){if(e!==ct)return!1;if(!be)return Iu(e),be=!0,!1;var t;if((t=e.tag!==3)&&!(t=e.tag!==5)&&(t=e.type,t=t!=="head"&&t!=="body"&&!Ml(e.type,e.memoizedProps)),t&&(t=ot)){if(Kl(e))throw sp(),Error(z(418));for(;t;)np(e,t),t=yn(t.nextSibling)}if(Iu(e),e.tag===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(z(317));e:{for(e=e.nextSibling,t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="/$"){if(t===0){ot=yn(e.nextSibling);break e}t--}else n!=="$"&&n!=="$!"&&n!=="$?"||t++}e=e.nextSibling}ot=null}}else ot=ct?yn(e.stateNode.nextSibling):null;return!0}function sp(){for(var e=ot;e;)e=yn(e.nextSibling)}function Ns(){ot=ct=null,be=!1}function _o(e){Ct===null?Ct=[e]:Ct.push(e)}var ny=Zt.ReactCurrentBatchConfig;function Gs(e,t,n){if(e=n.ref,e!==null&&typeof e!="function"&&typeof e!="object"){if(n._owner){if(n=n._owner,n){if(n.tag!==1)throw Error(z(309));var s=n.stateNode}if(!s)throw Error(z(147,e));var i=s,r=""+e;return t!==null&&t.ref!==null&&typeof t.ref=="function"&&t.ref._stringRef===r?t.ref:(t=function(a){var l=i.refs;a===null?delete l[r]:l[r]=a},t._stringRef=r,t)}if(typeof e!="string")throw Error(z(284));if(!n._owner)throw Error(z(290,e))}return e}function pr(e,t){throw e=Object.prototype.toString.call(t),Error(z(31,e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e))}function Lu(e){var t=e._init;return t(e._payload)}function ip(e){function t(y,f){if(e){var p=y.deletions;p===null?(y.deletions=[f],y.flags|=16):p.push(f)}}function n(y,f){if(!e)return null;for(;f!==null;)t(y,f),f=f.sibling;return null}function s(y,f){for(y=new Map;f!==null;)f.key!==null?y.set(f.key,f):y.set(f.index,f),f=f.sibling;return y}function i(y,f){return y=wn(y,f),y.index=0,y.sibling=null,y}function r(y,f,p){return y.index=p,e?(p=y.alternate,p!==null?(p=p.index,p<f?(y.flags|=2,f):p):(y.flags|=2,f)):(y.flags|=1048576,f)}function a(y){return e&&y.alternate===null&&(y.flags|=2),y}function l(y,f,p,k){return f===null||f.tag!==6?(f=dl(p,y.mode,k),f.return=y,f):(f=i(f,p),f.return=y,f)}function u(y,f,p,k){var b=p.type;return b===ns?h(y,f,p.props.children,k,p.key):f!==null&&(f.elementType===b||typeof b=="object"&&b!==null&&b.$$typeof===ln&&Lu(b)===f.type)?(k=i(f,p.props),k.ref=Gs(y,f,p),k.return=y,k):(k=Sr(p.type,p.key,p.props,null,y.mode,k),k.ref=Gs(y,f,p),k.return=y,k)}function o(y,f,p,k){return f===null||f.tag!==4||f.stateNode.containerInfo!==p.containerInfo||f.stateNode.implementation!==p.implementation?(f=pl(p,y.mode,k),f.return=y,f):(f=i(f,p.children||[]),f.return=y,f)}function h(y,f,p,k,b){return f===null||f.tag!==7?(f=Pn(p,y.mode,k,b),f.return=y,f):(f=i(f,p),f.return=y,f)}function g(y,f,p){if(typeof f=="string"&&f!==""||typeof f=="number")return f=dl(""+f,y.mode,p),f.return=y,f;if(typeof f=="object"&&f!==null){switch(f.$$typeof){case Xi:return p=Sr(f.type,f.key,f.props,null,y.mode,p),p.ref=Gs(y,null,f),p.return=y,p;case ts:return f=pl(f,y.mode,p),f.return=y,f;case ln:var k=f._init;return g(y,k(f._payload),p)}if(Qs(f)||zs(f))return f=Pn(f,y.mode,p,null),f.return=y,f;pr(y,f)}return null}function v(y,f,p,k){var b=f!==null?f.key:null;if(typeof p=="string"&&p!==""||typeof p=="number")return b!==null?null:l(y,f,""+p,k);if(typeof p=="object"&&p!==null){switch(p.$$typeof){case Xi:return p.key===b?u(y,f,p,k):null;case ts:return p.key===b?o(y,f,p,k):null;case ln:return b=p._init,v(y,f,b(p._payload),k)}if(Qs(p)||zs(p))return b!==null?null:h(y,f,p,k,null);pr(y,p)}return null}function w(y,f,p,k,b){if(typeof k=="string"&&k!==""||typeof k=="number")return y=y.get(p)||null,l(f,y,""+k,b);if(typeof k=="object"&&k!==null){switch(k.$$typeof){case Xi:return y=y.get(k.key===null?p:k.key)||null,u(f,y,k,b);case ts:return y=y.get(k.key===null?p:k.key)||null,o(f,y,k,b);case ln:var x=k._init;return w(y,f,p,x(k._payload),b)}if(Qs(k)||zs(k))return y=y.get(p)||null,h(f,y,k,b,null);pr(f,k)}return null}function _(y,f,p,k){for(var b=null,x=null,$=f,S=f=0,R=null;$!==null&&S<p.length;S++){$.index>S?(R=$,$=null):R=$.sibling;var D=v(y,$,p[S],k);if(D===null){$===null&&($=R);break}e&&$&&D.alternate===null&&t(y,$),f=r(D,f,S),x===null?b=D:x.sibling=D,x=D,$=R}if(S===p.length)return n(y,$),be&&An(y,S),b;if($===null){for(;S<p.length;S++)$=g(y,p[S],k),$!==null&&(f=r($,f,S),x===null?b=$:x.sibling=$,x=$);return be&&An(y,S),b}for($=s(y,$);S<p.length;S++)R=w($,y,S,p[S],k),R!==null&&(e&&R.alternate!==null&&$.delete(R.key===null?S:R.key),f=r(R,f,S),x===null?b=R:x.sibling=R,x=R);return e&&$.forEach(function(H){return t(y,H)}),be&&An(y,S),b}function N(y,f,p,k){var b=zs(p);if(typeof b!="function")throw Error(z(150));if(p=b.call(p),p==null)throw Error(z(151));for(var x=b=null,$=f,S=f=0,R=null,D=p.next();$!==null&&!D.done;S++,D=p.next()){$.index>S?(R=$,$=null):R=$.sibling;var H=v(y,$,D.value,k);if(H===null){$===null&&($=R);break}e&&$&&H.alternate===null&&t(y,$),f=r(H,f,S),x===null?b=H:x.sibling=H,x=H,$=R}if(D.done)return n(y,$),be&&An(y,S),b;if($===null){for(;!D.done;S++,D=p.next())D=g(y,D.value,k),D!==null&&(f=r(D,f,S),x===null?b=D:x.sibling=D,x=D);return be&&An(y,S),b}for($=s(y,$);!D.done;S++,D=p.next())D=w($,y,S,D.value,k),D!==null&&(e&&D.alternate!==null&&$.delete(D.key===null?S:D.key),f=r(D,f,S),x===null?b=D:x.sibling=D,x=D);return e&&$.forEach(function(W){return t(y,W)}),be&&An(y,S),b}function E(y,f,p,k){if(typeof p=="object"&&p!==null&&p.type===ns&&p.key===null&&(p=p.props.children),typeof p=="object"&&p!==null){switch(p.$$typeof){case Xi:e:{for(var b=p.key,x=f;x!==null;){if(x.key===b){if(b=p.type,b===ns){if(x.tag===7){n(y,x.sibling),f=i(x,p.props.children),f.return=y,y=f;break e}}else if(x.elementType===b||typeof b=="object"&&b!==null&&b.$$typeof===ln&&Lu(b)===x.type){n(y,x.sibling),f=i(x,p.props),f.ref=Gs(y,x,p),f.return=y,y=f;break e}n(y,x);break}else t(y,x);x=x.sibling}p.type===ns?(f=Pn(p.props.children,y.mode,k,p.key),f.return=y,y=f):(k=Sr(p.type,p.key,p.props,null,y.mode,k),k.ref=Gs(y,f,p),k.return=y,y=k)}return a(y);case ts:e:{for(x=p.key;f!==null;){if(f.key===x)if(f.tag===4&&f.stateNode.containerInfo===p.containerInfo&&f.stateNode.implementation===p.implementation){n(y,f.sibling),f=i(f,p.children||[]),f.return=y,y=f;break e}else{n(y,f);break}else t(y,f);f=f.sibling}f=pl(p,y.mode,k),f.return=y,y=f}return a(y);case ln:return x=p._init,E(y,f,x(p._payload),k)}if(Qs(p))return _(y,f,p,k);if(zs(p))return N(y,f,p,k);pr(y,p)}return typeof p=="string"&&p!==""||typeof p=="number"?(p=""+p,f!==null&&f.tag===6?(n(y,f.sibling),f=i(f,p),f.return=y,y=f):(n(y,f),f=dl(p,y.mode,k),f.return=y,y=f),a(y)):n(y,f)}return E}var bs=ip(!0),rp=ip(!1),Br=_n(null),Kr=null,us=null,So=null;function Eo(){So=us=Kr=null}function Co(e){var t=Br.current;he(Br),e._currentValue=t}function Hl(e,t,n){for(;e!==null;){var s=e.alternate;if((e.childLanes&t)!==t?(e.childLanes|=t,s!==null&&(s.childLanes|=t)):s!==null&&(s.childLanes&t)!==t&&(s.childLanes|=t),e===n)break;e=e.return}}function hs(e,t){Kr=e,So=us=null,e=e.dependencies,e!==null&&e.firstContext!==null&&((e.lanes&t)!==0&&(nt=!0),e.firstContext=null)}function $t(e){var t=e._currentValue;if(So!==e)if(e={context:e,memoizedValue:t,next:null},us===null){if(Kr===null)throw Error(z(308));us=e,Kr.dependencies={lanes:0,firstContext:e}}else us=us.next=e;return t}var Rn=null;function To(e){Rn===null?Rn=[e]:Rn.push(e)}function ap(e,t,n,s){var i=t.interleaved;return i===null?(n.next=n,To(t)):(n.next=i.next,i.next=n),t.interleaved=n,Xt(e,s)}function Xt(e,t){e.lanes|=t;var n=e.alternate;for(n!==null&&(n.lanes|=t),n=e,e=e.return;e!==null;)e.childLanes|=t,n=e.alternate,n!==null&&(n.childLanes|=t),n=e,e=e.return;return n.tag===3?n.stateNode:null}var on=!1;function Ao(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function lp(e,t){e=e.updateQueue,t.updateQueue===e&&(t.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,effects:e.effects})}function jt(e,t){return{eventTime:e,lane:t,tag:0,payload:null,callback:null,next:null}}function hn(e,t,n){var s=e.updateQueue;if(s===null)return null;if(s=s.shared,(ce&2)!==0){var i=s.pending;return i===null?t.next=t:(t.next=i.next,i.next=t),s.pending=t,Xt(e,n)}return i=s.interleaved,i===null?(t.next=t,To(s)):(t.next=i.next,i.next=t),s.interleaved=t,Xt(e,n)}function $r(e,t,n){if(t=t.updateQueue,t!==null&&(t=t.shared,(n&4194240)!==0)){var s=t.lanes;s&=e.pendingLanes,n|=s,t.lanes=n,fo(e,n)}}function Pu(e,t){var n=e.updateQueue,s=e.alternate;if(s!==null&&(s=s.updateQueue,n===s)){var i=null,r=null;if(n=n.firstBaseUpdate,n!==null){do{var a={eventTime:n.eventTime,lane:n.lane,tag:n.tag,payload:n.payload,callback:n.callback,next:null};r===null?i=r=a:r=r.next=a,n=n.next}while(n!==null);r===null?i=r=t:r=r.next=t}else i=r=t;n={baseState:s.baseState,firstBaseUpdate:i,lastBaseUpdate:r,shared:s.shared,effects:s.effects},e.updateQueue=n;return}e=n.lastBaseUpdate,e===null?n.firstBaseUpdate=t:e.next=t,n.lastBaseUpdate=t}function zr(e,t,n,s){var i=e.updateQueue;on=!1;var r=i.firstBaseUpdate,a=i.lastBaseUpdate,l=i.shared.pending;if(l!==null){i.shared.pending=null;var u=l,o=u.next;u.next=null,a===null?r=o:a.next=o,a=u;var h=e.alternate;h!==null&&(h=h.updateQueue,l=h.lastBaseUpdate,l!==a&&(l===null?h.firstBaseUpdate=o:l.next=o,h.lastBaseUpdate=u))}if(r!==null){var g=i.baseState;a=0,h=o=u=null,l=r;do{var v=l.lane,w=l.eventTime;if((s&v)===v){h!==null&&(h=h.next={eventTime:w,lane:0,tag:l.tag,payload:l.payload,callback:l.callback,next:null});e:{var _=e,N=l;switch(v=t,w=n,N.tag){case 1:if(_=N.payload,typeof _=="function"){g=_.call(w,g,v);break e}g=_;break e;case 3:_.flags=_.flags&-65537|128;case 0:if(_=N.payload,v=typeof _=="function"?_.call(w,g,v):_,v==null)break e;g=Se({},g,v);break e;case 2:on=!0}}l.callback!==null&&l.lane!==0&&(e.flags|=64,v=i.effects,v===null?i.effects=[l]:v.push(l))}else w={eventTime:w,lane:v,tag:l.tag,payload:l.payload,callback:l.callback,next:null},h===null?(o=h=w,u=g):h=h.next=w,a|=v;if(l=l.next,l===null){if(l=i.shared.pending,l===null)break;v=l,l=v.next,v.next=null,i.lastBaseUpdate=v,i.shared.pending=null}}while(!0);if(h===null&&(u=g),i.baseState=u,i.firstBaseUpdate=o,i.lastBaseUpdate=h,t=i.shared.interleaved,t!==null){i=t;do a|=i.lane,i=i.next;while(i!==t)}else r===null&&(i.shared.lanes=0);Bn|=a,e.lanes=a,e.memoizedState=g}}function Mu(e,t,n){if(e=t.effects,t.effects=null,e!==null)for(t=0;t<e.length;t++){var s=e[t],i=s.callback;if(i!==null){if(s.callback=null,s=n,typeof i!="function")throw Error(z(191,i));i.call(s)}}}var Ti={},Bt=_n(Ti),$i=_n(Ti),wi=_n(Ti);function In(e){if(e===Ti)throw Error(z(174));return e}function xo(e,t){switch(ve(wi,t),ve($i,e),ve(Bt,Ti),e=t.nodeType,e){case 9:case 11:t=(t=t.documentElement)?t.namespaceURI:bl(null,"");break;default:e=e===8?t.parentNode:t,t=e.namespaceURI||null,e=e.tagName,t=bl(t,e)}he(Bt),ve(Bt,t)}function ks(){he(Bt),he($i),he(wi)}function op(e){In(wi.current);var t=In(Bt.current),n=bl(t,e.type);t!==n&&(ve($i,e),ve(Bt,n))}function Do(e){$i.current===e&&(he(Bt),he($i))}var ke=_n(0);function Hr(e){for(var t=e;t!==null;){if(t.tag===13){var n=t.memoizedState;if(n!==null&&(n=n.dehydrated,n===null||n.data==="$?"||n.data==="$!"))return t}else if(t.tag===19&&t.memoizedProps.revealOrder!==void 0){if((t.flags&128)!==0)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}var rl=[];function Ro(){for(var e=0;e<rl.length;e++)rl[e]._workInProgressVersionPrimary=null;rl.length=0}var wr=Zt.ReactCurrentDispatcher,al=Zt.ReactCurrentBatchConfig,Un=0,_e=null,xe=null,Re=null,Fr=!1,ii=!1,Ni=0,sy=0;function Ke(){throw Error(z(321))}function Io(e,t){if(t===null)return!1;for(var n=0;n<t.length&&n<e.length;n++)if(!xt(e[n],t[n]))return!1;return!0}function Lo(e,t,n,s,i,r){if(Un=r,_e=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,wr.current=e===null||e.memoizedState===null?ly:oy,e=n(s,i),ii){r=0;do{if(ii=!1,Ni=0,25<=r)throw Error(z(301));r+=1,Re=xe=null,t.updateQueue=null,wr.current=cy,e=n(s,i)}while(ii)}if(wr.current=qr,t=xe!==null&&xe.next!==null,Un=0,Re=xe=_e=null,Fr=!1,t)throw Error(z(300));return e}function Po(){var e=Ni!==0;return Ni=0,e}function Mt(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Re===null?_e.memoizedState=Re=e:Re=Re.next=e,Re}function wt(){if(xe===null){var e=_e.alternate;e=e!==null?e.memoizedState:null}else e=xe.next;var t=Re===null?_e.memoizedState:Re.next;if(t!==null)Re=t,xe=e;else{if(e===null)throw Error(z(310));xe=e,e={memoizedState:xe.memoizedState,baseState:xe.baseState,baseQueue:xe.baseQueue,queue:xe.queue,next:null},Re===null?_e.memoizedState=Re=e:Re=Re.next=e}return Re}function bi(e,t){return typeof t=="function"?t(e):t}function ll(e){var t=wt(),n=t.queue;if(n===null)throw Error(z(311));n.lastRenderedReducer=e;var s=xe,i=s.baseQueue,r=n.pending;if(r!==null){if(i!==null){var a=i.next;i.next=r.next,r.next=a}s.baseQueue=i=r,n.pending=null}if(i!==null){r=i.next,s=s.baseState;var l=a=null,u=null,o=r;do{var h=o.lane;if((Un&h)===h)u!==null&&(u=u.next={lane:0,action:o.action,hasEagerState:o.hasEagerState,eagerState:o.eagerState,next:null}),s=o.hasEagerState?o.eagerState:e(s,o.action);else{var g={lane:h,action:o.action,hasEagerState:o.hasEagerState,eagerState:o.eagerState,next:null};u===null?(l=u=g,a=s):u=u.next=g,_e.lanes|=h,Bn|=h}o=o.next}while(o!==null&&o!==r);u===null?a=s:u.next=l,xt(s,t.memoizedState)||(nt=!0),t.memoizedState=s,t.baseState=a,t.baseQueue=u,n.lastRenderedState=s}if(e=n.interleaved,e!==null){i=e;do r=i.lane,_e.lanes|=r,Bn|=r,i=i.next;while(i!==e)}else i===null&&(n.lanes=0);return[t.memoizedState,n.dispatch]}function ol(e){var t=wt(),n=t.queue;if(n===null)throw Error(z(311));n.lastRenderedReducer=e;var s=n.dispatch,i=n.pending,r=t.memoizedState;if(i!==null){n.pending=null;var a=i=i.next;do r=e(r,a.action),a=a.next;while(a!==i);xt(r,t.memoizedState)||(nt=!0),t.memoizedState=r,t.baseQueue===null&&(t.baseState=r),n.lastRenderedState=r}return[r,s]}function cp(){}function up(e,t){var n=_e,s=wt(),i=t(),r=!xt(s.memoizedState,i);if(r&&(s.memoizedState=i,nt=!0),s=s.queue,Mo(mp.bind(null,n,s,e),[e]),s.getSnapshot!==t||r||Re!==null&&Re.memoizedState.tag&1){if(n.flags|=2048,ki(9,pp.bind(null,n,s,i,t),void 0,null),Ie===null)throw Error(z(349));(Un&30)!==0||dp(n,t,i)}return i}function dp(e,t,n){e.flags|=16384,e={getSnapshot:t,value:n},t=_e.updateQueue,t===null?(t={lastEffect:null,stores:null},_e.updateQueue=t,t.stores=[e]):(n=t.stores,n===null?t.stores=[e]:n.push(e))}function pp(e,t,n,s){t.value=n,t.getSnapshot=s,fp(t)&&vp(e)}function mp(e,t,n){return n(function(){fp(t)&&vp(e)})}function fp(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!xt(e,n)}catch{return!0}}function vp(e){var t=Xt(e,1);t!==null&&At(t,e,1,-1)}function Ou(e){var t=Mt();return typeof e=="function"&&(e=e()),t.memoizedState=t.baseState=e,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:bi,lastRenderedState:e},t.queue=e,e=e.dispatch=ay.bind(null,_e,e),[t.memoizedState,e]}function ki(e,t,n,s){return e={tag:e,create:t,destroy:n,deps:s,next:null},t=_e.updateQueue,t===null?(t={lastEffect:null,stores:null},_e.updateQueue=t,t.lastEffect=e.next=e):(n=t.lastEffect,n===null?t.lastEffect=e.next=e:(s=n.next,n.next=e,e.next=s,t.lastEffect=e)),e}function yp(){return wt().memoizedState}function Nr(e,t,n,s){var i=Mt();_e.flags|=e,i.memoizedState=ki(1|t,n,void 0,s===void 0?null:s)}function na(e,t,n,s){var i=wt();s=s===void 0?null:s;var r=void 0;if(xe!==null){var a=xe.memoizedState;if(r=a.destroy,s!==null&&Io(s,a.deps)){i.memoizedState=ki(t,n,r,s);return}}_e.flags|=e,i.memoizedState=ki(1|t,n,r,s)}function Uu(e,t){return Nr(8390656,8,e,t)}function Mo(e,t){return na(2048,8,e,t)}function hp(e,t){return na(4,2,e,t)}function gp(e,t){return na(4,4,e,t)}function $p(e,t){if(typeof t=="function")return e=e(),t(e),function(){t(null)};if(t!=null)return e=e(),t.current=e,function(){t.current=null}}function wp(e,t,n){return n=n!=null?n.concat([e]):null,na(4,4,$p.bind(null,t,e),n)}function Oo(){}function Np(e,t){var n=wt();t=t===void 0?null:t;var s=n.memoizedState;return s!==null&&t!==null&&Io(t,s[1])?s[0]:(n.memoizedState=[e,t],e)}function bp(e,t){var n=wt();t=t===void 0?null:t;var s=n.memoizedState;return s!==null&&t!==null&&Io(t,s[1])?s[0]:(e=e(),n.memoizedState=[e,t],e)}function kp(e,t,n){return(Un&21)===0?(e.baseState&&(e.baseState=!1,nt=!0),e.memoizedState=n):(xt(n,t)||(n=Td(),_e.lanes|=n,Bn|=n,e.baseState=!0),t)}function iy(e,t){var n=de;de=n!==0&&4>n?n:4,e(!0);var s=al.transition;al.transition={};try{e(!1),t()}finally{de=n,al.transition=s}}function _p(){return wt().memoizedState}function ry(e,t,n){var s=$n(e);if(n={lane:s,action:n,hasEagerState:!1,eagerState:null,next:null},Sp(e))Ep(t,n);else if(n=ap(e,t,n,s),n!==null){var i=Qe();At(n,e,s,i),Cp(n,t,s)}}function ay(e,t,n){var s=$n(e),i={lane:s,action:n,hasEagerState:!1,eagerState:null,next:null};if(Sp(e))Ep(t,i);else{var r=e.alternate;if(e.lanes===0&&(r===null||r.lanes===0)&&(r=t.lastRenderedReducer,r!==null))try{var a=t.lastRenderedState,l=r(a,n);if(i.hasEagerState=!0,i.eagerState=l,xt(l,a)){var u=t.interleaved;u===null?(i.next=i,To(t)):(i.next=u.next,u.next=i),t.interleaved=i;return}}catch{}n=ap(e,t,i,s),n!==null&&(i=Qe(),At(n,e,s,i),Cp(n,t,s))}}function Sp(e){var t=e.alternate;return e===_e||t!==null&&t===_e}function Ep(e,t){ii=Fr=!0;var n=e.pending;n===null?t.next=t:(t.next=n.next,n.next=t),e.pending=t}function Cp(e,t,n){if((n&4194240)!==0){var s=t.lanes;s&=e.pendingLanes,n|=s,t.lanes=n,fo(e,n)}}var qr={readContext:$t,useCallback:Ke,useContext:Ke,useEffect:Ke,useImperativeHandle:Ke,useInsertionEffect:Ke,useLayoutEffect:Ke,useMemo:Ke,useReducer:Ke,useRef:Ke,useState:Ke,useDebugValue:Ke,useDeferredValue:Ke,useTransition:Ke,useMutableSource:Ke,useSyncExternalStore:Ke,useId:Ke,unstable_isNewReconciler:!1},ly={readContext:$t,useCallback:function(e,t){return Mt().memoizedState=[e,t===void 0?null:t],e},useContext:$t,useEffect:Uu,useImperativeHandle:function(e,t,n){return n=n!=null?n.concat([e]):null,Nr(4194308,4,$p.bind(null,t,e),n)},useLayoutEffect:function(e,t){return Nr(4194308,4,e,t)},useInsertionEffect:function(e,t){return Nr(4,2,e,t)},useMemo:function(e,t){var n=Mt();return t=t===void 0?null:t,e=e(),n.memoizedState=[e,t],e},useReducer:function(e,t,n){var s=Mt();return t=n!==void 0?n(t):t,s.memoizedState=s.baseState=t,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:t},s.queue=e,e=e.dispatch=ry.bind(null,_e,e),[s.memoizedState,e]},useRef:function(e){var t=Mt();return e={current:e},t.memoizedState=e},useState:Ou,useDebugValue:Oo,useDeferredValue:function(e){return Mt().memoizedState=e},useTransition:function(){var e=Ou(!1),t=e[0];return e=iy.bind(null,e[1]),Mt().memoizedState=e,[t,e]},useMutableSource:function(){},useSyncExternalStore:function(e,t,n){var s=_e,i=Mt();if(be){if(n===void 0)throw Error(z(407));n=n()}else{if(n=t(),Ie===null)throw Error(z(349));(Un&30)!==0||dp(s,t,n)}i.memoizedState=n;var r={value:n,getSnapshot:t};return i.queue=r,Uu(mp.bind(null,s,r,e),[e]),s.flags|=2048,ki(9,pp.bind(null,s,r,n,t),void 0,null),n},useId:function(){var e=Mt(),t=Ie.identifierPrefix;if(be){var n=Wt,s=Vt;n=(s&~(1<<32-Tt(s)-1)).toString(32)+n,t=":"+t+"R"+n,n=Ni++,0<n&&(t+="H"+n.toString(32)),t+=":"}else n=sy++,t=":"+t+"r"+n.toString(32)+":";return e.memoizedState=t},unstable_isNewReconciler:!1},oy={readContext:$t,useCallback:Np,useContext:$t,useEffect:Mo,useImperativeHandle:wp,useInsertionEffect:hp,useLayoutEffect:gp,useMemo:bp,useReducer:ll,useRef:yp,useState:function(){return ll(bi)},useDebugValue:Oo,useDeferredValue:function(e){var t=wt();return kp(t,xe.memoizedState,e)},useTransition:function(){var e=ll(bi)[0],t=wt().memoizedState;return[e,t]},useMutableSource:cp,useSyncExternalStore:up,useId:_p,unstable_isNewReconciler:!1},cy={readContext:$t,useCallback:Np,useContext:$t,useEffect:Mo,useImperativeHandle:wp,useInsertionEffect:hp,useLayoutEffect:gp,useMemo:bp,useReducer:ol,useRef:yp,useState:function(){return ol(bi)},useDebugValue:Oo,useDeferredValue:function(e){var t=wt();return xe===null?t.memoizedState=e:kp(t,xe.memoizedState,e)},useTransition:function(){var e=ol(bi)[0],t=wt().memoizedState;return[e,t]},useMutableSource:cp,useSyncExternalStore:up,useId:_p,unstable_isNewReconciler:!1};function St(e,t){if(e&&e.defaultProps){t=Se({},t),e=e.defaultProps;for(var n in e)t[n]===void 0&&(t[n]=e[n]);return t}return t}function Fl(e,t,n,s){t=e.memoizedState,n=n(s,t),n=n==null?t:Se({},t,n),e.memoizedState=n,e.lanes===0&&(e.updateQueue.baseState=n)}var sa={isMounted:function(e){return(e=e._reactInternals)?Hn(e)===e:!1},enqueueSetState:function(e,t,n){e=e._reactInternals;var s=Qe(),i=$n(e),r=jt(s,i);r.payload=t,n!=null&&(r.callback=n),t=hn(e,r,i),t!==null&&(At(t,e,i,s),$r(t,e,i))},enqueueReplaceState:function(e,t,n){e=e._reactInternals;var s=Qe(),i=$n(e),r=jt(s,i);r.tag=1,r.payload=t,n!=null&&(r.callback=n),t=hn(e,r,i),t!==null&&(At(t,e,i,s),$r(t,e,i))},enqueueForceUpdate:function(e,t){e=e._reactInternals;var n=Qe(),s=$n(e),i=jt(n,s);i.tag=2,t!=null&&(i.callback=t),t=hn(e,i,s),t!==null&&(At(t,e,s,n),$r(t,e,s))}};function Bu(e,t,n,s,i,r,a){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(s,r,a):t.prototype&&t.prototype.isPureReactComponent?!vi(n,s)||!vi(i,r):!0}function Tp(e,t,n){var s=!1,i=bn,r=t.contextType;return typeof r=="object"&&r!==null?r=$t(r):(i=it(t)?Mn:Fe.current,s=t.contextTypes,r=(s=s!=null)?ws(e,i):bn),t=new t(n,r),e.memoizedState=t.state!==null&&t.state!==void 0?t.state:null,t.updater=sa,e.stateNode=t,t._reactInternals=e,s&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=i,e.__reactInternalMemoizedMaskedChildContext=r),t}function Ku(e,t,n,s){e=t.state,typeof t.componentWillReceiveProps=="function"&&t.componentWillReceiveProps(n,s),typeof t.UNSAFE_componentWillReceiveProps=="function"&&t.UNSAFE_componentWillReceiveProps(n,s),t.state!==e&&sa.enqueueReplaceState(t,t.state,null)}function ql(e,t,n,s){var i=e.stateNode;i.props=n,i.state=e.memoizedState,i.refs={},Ao(e);var r=t.contextType;typeof r=="object"&&r!==null?i.context=$t(r):(r=it(t)?Mn:Fe.current,i.context=ws(e,r)),i.state=e.memoizedState,r=t.getDerivedStateFromProps,typeof r=="function"&&(Fl(e,t,r,n),i.state=e.memoizedState),typeof t.getDerivedStateFromProps=="function"||typeof i.getSnapshotBeforeUpdate=="function"||typeof i.UNSAFE_componentWillMount!="function"&&typeof i.componentWillMount!="function"||(t=i.state,typeof i.componentWillMount=="function"&&i.componentWillMount(),typeof i.UNSAFE_componentWillMount=="function"&&i.UNSAFE_componentWillMount(),t!==i.state&&sa.enqueueReplaceState(i,i.state,null),zr(e,n,i,s),i.state=e.memoizedState),typeof i.componentDidMount=="function"&&(e.flags|=4194308)}function _s(e,t){try{var n="",s=t;do n+=Bf(s),s=s.return;while(s);var i=n}catch(r){i=`
Error generating stack: `+r.message+`
`+r.stack}return{value:e,source:t,stack:i,digest:null}}function cl(e,t,n){return{value:e,source:null,stack:n??null,digest:t??null}}function Gl(e,t){try{console.error(t.value)}catch(n){setTimeout(function(){throw n})}}var uy=typeof WeakMap=="function"?WeakMap:Map;function Ap(e,t,n){n=jt(-1,n),n.tag=3,n.payload={element:null};var s=t.value;return n.callback=function(){Vr||(Vr=!0,to=s),Gl(e,t)},n}function xp(e,t,n){n=jt(-1,n),n.tag=3;var s=e.type.getDerivedStateFromError;if(typeof s=="function"){var i=t.value;n.payload=function(){return s(i)},n.callback=function(){Gl(e,t)}}var r=e.stateNode;return r!==null&&typeof r.componentDidCatch=="function"&&(n.callback=function(){Gl(e,t),typeof s!="function"&&(gn===null?gn=new Set([this]):gn.add(this));var a=t.stack;this.componentDidCatch(t.value,{componentStack:a!==null?a:""})}),n}function zu(e,t,n){var s=e.pingCache;if(s===null){s=e.pingCache=new uy;var i=new Set;s.set(t,i)}else i=s.get(t),i===void 0&&(i=new Set,s.set(t,i));i.has(n)||(i.add(n),e=_y.bind(null,e,t,n),t.then(e,e))}function Hu(e){do{var t;if((t=e.tag===13)&&(t=e.memoizedState,t=t!==null?t.dehydrated!==null:!0),t)return e;e=e.return}while(e!==null);return null}function Fu(e,t,n,s,i){return(e.mode&1)===0?(e===t?e.flags|=65536:(e.flags|=128,n.flags|=131072,n.flags&=-52805,n.tag===1&&(n.alternate===null?n.tag=17:(t=jt(-1,1),t.tag=2,hn(n,t,1))),n.lanes|=1),e):(e.flags|=65536,e.lanes=i,e)}var dy=Zt.ReactCurrentOwner,nt=!1;function Ye(e,t,n,s){t.child=e===null?rp(t,null,n,s):bs(t,e.child,n,s)}function qu(e,t,n,s,i){n=n.render;var r=t.ref;return hs(t,i),s=Lo(e,t,n,s,r,i),n=Po(),e!==null&&!nt?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~i,Jt(e,t,i)):(be&&n&&bo(t),t.flags|=1,Ye(e,t,s,i),t.child)}function Gu(e,t,n,s,i){if(e===null){var r=n.type;return typeof r=="function"&&!Go(r)&&r.defaultProps===void 0&&n.compare===null&&n.defaultProps===void 0?(t.tag=15,t.type=r,Dp(e,t,r,s,i)):(e=Sr(n.type,null,s,t,t.mode,i),e.ref=t.ref,e.return=t,t.child=e)}if(r=e.child,(e.lanes&i)===0){var a=r.memoizedProps;if(n=n.compare,n=n!==null?n:vi,n(a,s)&&e.ref===t.ref)return Jt(e,t,i)}return t.flags|=1,e=wn(r,s),e.ref=t.ref,e.return=t,t.child=e}function Dp(e,t,n,s,i){if(e!==null){var r=e.memoizedProps;if(vi(r,s)&&e.ref===t.ref)if(nt=!1,t.pendingProps=s=r,(e.lanes&i)!==0)(e.flags&131072)!==0&&(nt=!0);else return t.lanes=e.lanes,Jt(e,t,i)}return Vl(e,t,n,s,i)}function Rp(e,t,n){var s=t.pendingProps,i=s.children,r=e!==null?e.memoizedState:null;if(s.mode==="hidden")if((t.mode&1)===0)t.memoizedState={baseLanes:0,cachePool:null,transitions:null},ve(ps,lt),lt|=n;else{if((n&1073741824)===0)return e=r!==null?r.baseLanes|n:n,t.lanes=t.childLanes=1073741824,t.memoizedState={baseLanes:e,cachePool:null,transitions:null},t.updateQueue=null,ve(ps,lt),lt|=e,null;t.memoizedState={baseLanes:0,cachePool:null,transitions:null},s=r!==null?r.baseLanes:n,ve(ps,lt),lt|=s}else r!==null?(s=r.baseLanes|n,t.memoizedState=null):s=n,ve(ps,lt),lt|=s;return Ye(e,t,i,n),t.child}function Ip(e,t){var n=t.ref;(e===null&&n!==null||e!==null&&e.ref!==n)&&(t.flags|=512,t.flags|=2097152)}function Vl(e,t,n,s,i){var r=it(n)?Mn:Fe.current;return r=ws(t,r),hs(t,i),n=Lo(e,t,n,s,r,i),s=Po(),e!==null&&!nt?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~i,Jt(e,t,i)):(be&&s&&bo(t),t.flags|=1,Ye(e,t,n,i),t.child)}function Vu(e,t,n,s,i){if(it(n)){var r=!0;Mr(t)}else r=!1;if(hs(t,i),t.stateNode===null)br(e,t),Tp(t,n,s),ql(t,n,s,i),s=!0;else if(e===null){var a=t.stateNode,l=t.memoizedProps;a.props=l;var u=a.context,o=n.contextType;typeof o=="object"&&o!==null?o=$t(o):(o=it(n)?Mn:Fe.current,o=ws(t,o));var h=n.getDerivedStateFromProps,g=typeof h=="function"||typeof a.getSnapshotBeforeUpdate=="function";g||typeof a.UNSAFE_componentWillReceiveProps!="function"&&typeof a.componentWillReceiveProps!="function"||(l!==s||u!==o)&&Ku(t,a,s,o),on=!1;var v=t.memoizedState;a.state=v,zr(t,s,a,i),u=t.memoizedState,l!==s||v!==u||st.current||on?(typeof h=="function"&&(Fl(t,n,h,s),u=t.memoizedState),(l=on||Bu(t,n,l,s,v,u,o))?(g||typeof a.UNSAFE_componentWillMount!="function"&&typeof a.componentWillMount!="function"||(typeof a.componentWillMount=="function"&&a.componentWillMount(),typeof a.UNSAFE_componentWillMount=="function"&&a.UNSAFE_componentWillMount()),typeof a.componentDidMount=="function"&&(t.flags|=4194308)):(typeof a.componentDidMount=="function"&&(t.flags|=4194308),t.memoizedProps=s,t.memoizedState=u),a.props=s,a.state=u,a.context=o,s=l):(typeof a.componentDidMount=="function"&&(t.flags|=4194308),s=!1)}else{a=t.stateNode,lp(e,t),l=t.memoizedProps,o=t.type===t.elementType?l:St(t.type,l),a.props=o,g=t.pendingProps,v=a.context,u=n.contextType,typeof u=="object"&&u!==null?u=$t(u):(u=it(n)?Mn:Fe.current,u=ws(t,u));var w=n.getDerivedStateFromProps;(h=typeof w=="function"||typeof a.getSnapshotBeforeUpdate=="function")||typeof a.UNSAFE_componentWillReceiveProps!="function"&&typeof a.componentWillReceiveProps!="function"||(l!==g||v!==u)&&Ku(t,a,s,u),on=!1,v=t.memoizedState,a.state=v,zr(t,s,a,i);var _=t.memoizedState;l!==g||v!==_||st.current||on?(typeof w=="function"&&(Fl(t,n,w,s),_=t.memoizedState),(o=on||Bu(t,n,o,s,v,_,u)||!1)?(h||typeof a.UNSAFE_componentWillUpdate!="function"&&typeof a.componentWillUpdate!="function"||(typeof a.componentWillUpdate=="function"&&a.componentWillUpdate(s,_,u),typeof a.UNSAFE_componentWillUpdate=="function"&&a.UNSAFE_componentWillUpdate(s,_,u)),typeof a.componentDidUpdate=="function"&&(t.flags|=4),typeof a.getSnapshotBeforeUpdate=="function"&&(t.flags|=1024)):(typeof a.componentDidUpdate!="function"||l===e.memoizedProps&&v===e.memoizedState||(t.flags|=4),typeof a.getSnapshotBeforeUpdate!="function"||l===e.memoizedProps&&v===e.memoizedState||(t.flags|=1024),t.memoizedProps=s,t.memoizedState=_),a.props=s,a.state=_,a.context=u,s=o):(typeof a.componentDidUpdate!="function"||l===e.memoizedProps&&v===e.memoizedState||(t.flags|=4),typeof a.getSnapshotBeforeUpdate!="function"||l===e.memoizedProps&&v===e.memoizedState||(t.flags|=1024),s=!1)}return Wl(e,t,n,s,r,i)}function Wl(e,t,n,s,i,r){Ip(e,t);var a=(t.flags&128)!==0;if(!s&&!a)return i&&Du(t,n,!1),Jt(e,t,r);s=t.stateNode,dy.current=t;var l=a&&typeof n.getDerivedStateFromError!="function"?null:s.render();return t.flags|=1,e!==null&&a?(t.child=bs(t,e.child,null,r),t.child=bs(t,null,l,r)):Ye(e,t,l,r),t.memoizedState=s.state,i&&Du(t,n,!0),t.child}function Lp(e){var t=e.stateNode;t.pendingContext?xu(e,t.pendingContext,t.pendingContext!==t.context):t.context&&xu(e,t.context,!1),xo(e,t.containerInfo)}function Wu(e,t,n,s,i){return Ns(),_o(i),t.flags|=256,Ye(e,t,n,s),t.child}var jl={dehydrated:null,treeContext:null,retryLane:0};function Yl(e){return{baseLanes:e,cachePool:null,transitions:null}}function Pp(e,t,n){var s=t.pendingProps,i=ke.current,r=!1,a=(t.flags&128)!==0,l;if((l=a)||(l=e!==null&&e.memoizedState===null?!1:(i&2)!==0),l?(r=!0,t.flags&=-129):(e===null||e.memoizedState!==null)&&(i|=1),ve(ke,i&1),e===null)return zl(t),e=t.memoizedState,e!==null&&(e=e.dehydrated,e!==null)?((t.mode&1)===0?t.lanes=1:e.data==="$!"?t.lanes=8:t.lanes=1073741824,null):(a=s.children,e=s.fallback,r?(s=t.mode,r=t.child,a={mode:"hidden",children:a},(s&1)===0&&r!==null?(r.childLanes=0,r.pendingProps=a):r=aa(a,s,0,null),e=Pn(e,s,n,null),r.return=t,e.return=t,r.sibling=e,t.child=r,t.child.memoizedState=Yl(n),t.memoizedState=jl,e):Uo(t,a));if(i=e.memoizedState,i!==null&&(l=i.dehydrated,l!==null))return py(e,t,a,s,l,i,n);if(r){r=s.fallback,a=t.mode,i=e.child,l=i.sibling;var u={mode:"hidden",children:s.children};return(a&1)===0&&t.child!==i?(s=t.child,s.childLanes=0,s.pendingProps=u,t.deletions=null):(s=wn(i,u),s.subtreeFlags=i.subtreeFlags&14680064),l!==null?r=wn(l,r):(r=Pn(r,a,n,null),r.flags|=2),r.return=t,s.return=t,s.sibling=r,t.child=s,s=r,r=t.child,a=e.child.memoizedState,a=a===null?Yl(n):{baseLanes:a.baseLanes|n,cachePool:null,transitions:a.transitions},r.memoizedState=a,r.childLanes=e.childLanes&~n,t.memoizedState=jl,s}return r=e.child,e=r.sibling,s=wn(r,{mode:"visible",children:s.children}),(t.mode&1)===0&&(s.lanes=n),s.return=t,s.sibling=null,e!==null&&(n=t.deletions,n===null?(t.deletions=[e],t.flags|=16):n.push(e)),t.child=s,t.memoizedState=null,s}function Uo(e,t){return t=aa({mode:"visible",children:t},e.mode,0,null),t.return=e,e.child=t}function mr(e,t,n,s){return s!==null&&_o(s),bs(t,e.child,null,n),e=Uo(t,t.pendingProps.children),e.flags|=2,t.memoizedState=null,e}function py(e,t,n,s,i,r,a){if(n)return t.flags&256?(t.flags&=-257,s=cl(Error(z(422))),mr(e,t,a,s)):t.memoizedState!==null?(t.child=e.child,t.flags|=128,null):(r=s.fallback,i=t.mode,s=aa({mode:"visible",children:s.children},i,0,null),r=Pn(r,i,a,null),r.flags|=2,s.return=t,r.return=t,s.sibling=r,t.child=s,(t.mode&1)!==0&&bs(t,e.child,null,a),t.child.memoizedState=Yl(a),t.memoizedState=jl,r);if((t.mode&1)===0)return mr(e,t,a,null);if(i.data==="$!"){if(s=i.nextSibling&&i.nextSibling.dataset,s)var l=s.dgst;return s=l,r=Error(z(419)),s=cl(r,s,void 0),mr(e,t,a,s)}if(l=(a&e.childLanes)!==0,nt||l){if(s=Ie,s!==null){switch(a&-a){case 4:i=2;break;case 16:i=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:i=32;break;case 536870912:i=268435456;break;default:i=0}i=(i&(s.suspendedLanes|a))!==0?0:i,i!==0&&i!==r.retryLane&&(r.retryLane=i,Xt(e,i),At(s,e,i,-1))}return qo(),s=cl(Error(z(421))),mr(e,t,a,s)}return i.data==="$?"?(t.flags|=128,t.child=e.child,t=Sy.bind(null,e),i._reactRetry=t,null):(e=r.treeContext,ot=yn(i.nextSibling),ct=t,be=!0,Ct=null,e!==null&&(vt[yt++]=Vt,vt[yt++]=Wt,vt[yt++]=On,Vt=e.id,Wt=e.overflow,On=t),t=Uo(t,s.children),t.flags|=4096,t)}function ju(e,t,n){e.lanes|=t;var s=e.alternate;s!==null&&(s.lanes|=t),Hl(e.return,t,n)}function ul(e,t,n,s,i){var r=e.memoizedState;r===null?e.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:s,tail:n,tailMode:i}:(r.isBackwards=t,r.rendering=null,r.renderingStartTime=0,r.last=s,r.tail=n,r.tailMode=i)}function Mp(e,t,n){var s=t.pendingProps,i=s.revealOrder,r=s.tail;if(Ye(e,t,s.children,n),s=ke.current,(s&2)!==0)s=s&1|2,t.flags|=128;else{if(e!==null&&(e.flags&128)!==0)e:for(e=t.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&ju(e,n,t);else if(e.tag===19)ju(e,n,t);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break e;for(;e.sibling===null;){if(e.return===null||e.return===t)break e;e=e.return}e.sibling.return=e.return,e=e.sibling}s&=1}if(ve(ke,s),(t.mode&1)===0)t.memoizedState=null;else switch(i){case"forwards":for(n=t.child,i=null;n!==null;)e=n.alternate,e!==null&&Hr(e)===null&&(i=n),n=n.sibling;n=i,n===null?(i=t.child,t.child=null):(i=n.sibling,n.sibling=null),ul(t,!1,i,n,r);break;case"backwards":for(n=null,i=t.child,t.child=null;i!==null;){if(e=i.alternate,e!==null&&Hr(e)===null){t.child=i;break}e=i.sibling,i.sibling=n,n=i,i=e}ul(t,!0,n,null,r);break;case"together":ul(t,!1,null,null,void 0);break;default:t.memoizedState=null}return t.child}function br(e,t){(t.mode&1)===0&&e!==null&&(e.alternate=null,t.alternate=null,t.flags|=2)}function Jt(e,t,n){if(e!==null&&(t.dependencies=e.dependencies),Bn|=t.lanes,(n&t.childLanes)===0)return null;if(e!==null&&t.child!==e.child)throw Error(z(153));if(t.child!==null){for(e=t.child,n=wn(e,e.pendingProps),t.child=n,n.return=t;e.sibling!==null;)e=e.sibling,n=n.sibling=wn(e,e.pendingProps),n.return=t;n.sibling=null}return t.child}function my(e,t,n){switch(t.tag){case 3:Lp(t),Ns();break;case 5:op(t);break;case 1:it(t.type)&&Mr(t);break;case 4:xo(t,t.stateNode.containerInfo);break;case 10:var s=t.type._context,i=t.memoizedProps.value;ve(Br,s._currentValue),s._currentValue=i;break;case 13:if(s=t.memoizedState,s!==null)return s.dehydrated!==null?(ve(ke,ke.current&1),t.flags|=128,null):(n&t.child.childLanes)!==0?Pp(e,t,n):(ve(ke,ke.current&1),e=Jt(e,t,n),e!==null?e.sibling:null);ve(ke,ke.current&1);break;case 19:if(s=(n&t.childLanes)!==0,(e.flags&128)!==0){if(s)return Mp(e,t,n);t.flags|=128}if(i=t.memoizedState,i!==null&&(i.rendering=null,i.tail=null,i.lastEffect=null),ve(ke,ke.current),s)break;return null;case 22:case 23:return t.lanes=0,Rp(e,t,n)}return Jt(e,t,n)}var Op,Ql,Up,Bp;Op=function(e,t){for(var n=t.child;n!==null;){if(n.tag===5||n.tag===6)e.appendChild(n.stateNode);else if(n.tag!==4&&n.child!==null){n.child.return=n,n=n.child;continue}if(n===t)break;for(;n.sibling===null;){if(n.return===null||n.return===t)return;n=n.return}n.sibling.return=n.return,n=n.sibling}};Ql=function(){};Up=function(e,t,n,s){var i=e.memoizedProps;if(i!==s){e=t.stateNode,In(Bt.current);var r=null;switch(n){case"input":i=gl(e,i),s=gl(e,s),r=[];break;case"select":i=Se({},i,{value:void 0}),s=Se({},s,{value:void 0}),r=[];break;case"textarea":i=Nl(e,i),s=Nl(e,s),r=[];break;default:typeof i.onClick!="function"&&typeof s.onClick=="function"&&(e.onclick=Lr)}kl(n,s);var a;n=null;for(o in i)if(!s.hasOwnProperty(o)&&i.hasOwnProperty(o)&&i[o]!=null)if(o==="style"){var l=i[o];for(a in l)l.hasOwnProperty(a)&&(n||(n={}),n[a]="")}else o!=="dangerouslySetInnerHTML"&&o!=="children"&&o!=="suppressContentEditableWarning"&&o!=="suppressHydrationWarning"&&o!=="autoFocus"&&(oi.hasOwnProperty(o)?r||(r=[]):(r=r||[]).push(o,null));for(o in s){var u=s[o];if(l=i?.[o],s.hasOwnProperty(o)&&u!==l&&(u!=null||l!=null))if(o==="style")if(l){for(a in l)!l.hasOwnProperty(a)||u&&u.hasOwnProperty(a)||(n||(n={}),n[a]="");for(a in u)u.hasOwnProperty(a)&&l[a]!==u[a]&&(n||(n={}),n[a]=u[a])}else n||(r||(r=[]),r.push(o,n)),n=u;else o==="dangerouslySetInnerHTML"?(u=u?u.__html:void 0,l=l?l.__html:void 0,u!=null&&l!==u&&(r=r||[]).push(o,u)):o==="children"?typeof u!="string"&&typeof u!="number"||(r=r||[]).push(o,""+u):o!=="suppressContentEditableWarning"&&o!=="suppressHydrationWarning"&&(oi.hasOwnProperty(o)?(u!=null&&o==="onScroll"&&ye("scroll",e),r||l===u||(r=[])):(r=r||[]).push(o,u))}n&&(r=r||[]).push("style",n);var o=r;(t.updateQueue=o)&&(t.flags|=4)}};Bp=function(e,t,n,s){n!==s&&(t.flags|=4)};function Vs(e,t){if(!be)switch(e.tailMode){case"hidden":t=e.tail;for(var n=null;t!==null;)t.alternate!==null&&(n=t),t=t.sibling;n===null?e.tail=null:n.sibling=null;break;case"collapsed":n=e.tail;for(var s=null;n!==null;)n.alternate!==null&&(s=n),n=n.sibling;s===null?t||e.tail===null?e.tail=null:e.tail.sibling=null:s.sibling=null}}function ze(e){var t=e.alternate!==null&&e.alternate.child===e.child,n=0,s=0;if(t)for(var i=e.child;i!==null;)n|=i.lanes|i.childLanes,s|=i.subtreeFlags&14680064,s|=i.flags&14680064,i.return=e,i=i.sibling;else for(i=e.child;i!==null;)n|=i.lanes|i.childLanes,s|=i.subtreeFlags,s|=i.flags,i.return=e,i=i.sibling;return e.subtreeFlags|=s,e.childLanes=n,t}function fy(e,t,n){var s=t.pendingProps;switch(ko(t),t.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return ze(t),null;case 1:return it(t.type)&&Pr(),ze(t),null;case 3:return s=t.stateNode,ks(),he(st),he(Fe),Ro(),s.pendingContext&&(s.context=s.pendingContext,s.pendingContext=null),(e===null||e.child===null)&&(dr(t)?t.flags|=4:e===null||e.memoizedState.isDehydrated&&(t.flags&256)===0||(t.flags|=1024,Ct!==null&&(io(Ct),Ct=null))),Ql(e,t),ze(t),null;case 5:Do(t);var i=In(wi.current);if(n=t.type,e!==null&&t.stateNode!=null)Up(e,t,n,s,i),e.ref!==t.ref&&(t.flags|=512,t.flags|=2097152);else{if(!s){if(t.stateNode===null)throw Error(z(166));return ze(t),null}if(e=In(Bt.current),dr(t)){s=t.stateNode,n=t.type;var r=t.memoizedProps;switch(s[Ot]=t,s[gi]=r,e=(t.mode&1)!==0,n){case"dialog":ye("cancel",s),ye("close",s);break;case"iframe":case"object":case"embed":ye("load",s);break;case"video":case"audio":for(i=0;i<Js.length;i++)ye(Js[i],s);break;case"source":ye("error",s);break;case"img":case"image":case"link":ye("error",s),ye("load",s);break;case"details":ye("toggle",s);break;case"input":nu(s,r),ye("invalid",s);break;case"select":s._wrapperState={wasMultiple:!!r.multiple},ye("invalid",s);break;case"textarea":iu(s,r),ye("invalid",s)}kl(n,r),i=null;for(var a in r)if(r.hasOwnProperty(a)){var l=r[a];a==="children"?typeof l=="string"?s.textContent!==l&&(r.suppressHydrationWarning!==!0&&ur(s.textContent,l,e),i=["children",l]):typeof l=="number"&&s.textContent!==""+l&&(r.suppressHydrationWarning!==!0&&ur(s.textContent,l,e),i=["children",""+l]):oi.hasOwnProperty(a)&&l!=null&&a==="onScroll"&&ye("scroll",s)}switch(n){case"input":Ji(s),su(s,r,!0);break;case"textarea":Ji(s),ru(s);break;case"select":case"option":break;default:typeof r.onClick=="function"&&(s.onclick=Lr)}s=i,t.updateQueue=s,s!==null&&(t.flags|=4)}else{a=i.nodeType===9?i:i.ownerDocument,e==="http://www.w3.org/1999/xhtml"&&(e=md(n)),e==="http://www.w3.org/1999/xhtml"?n==="script"?(e=a.createElement("div"),e.innerHTML="<script><\/script>",e=e.removeChild(e.firstChild)):typeof s.is=="string"?e=a.createElement(n,{is:s.is}):(e=a.createElement(n),n==="select"&&(a=e,s.multiple?a.multiple=!0:s.size&&(a.size=s.size))):e=a.createElementNS(e,n),e[Ot]=t,e[gi]=s,Op(e,t,!1,!1),t.stateNode=e;e:{switch(a=_l(n,s),n){case"dialog":ye("cancel",e),ye("close",e),i=s;break;case"iframe":case"object":case"embed":ye("load",e),i=s;break;case"video":case"audio":for(i=0;i<Js.length;i++)ye(Js[i],e);i=s;break;case"source":ye("error",e),i=s;break;case"img":case"image":case"link":ye("error",e),ye("load",e),i=s;break;case"details":ye("toggle",e),i=s;break;case"input":nu(e,s),i=gl(e,s),ye("invalid",e);break;case"option":i=s;break;case"select":e._wrapperState={wasMultiple:!!s.multiple},i=Se({},s,{value:void 0}),ye("invalid",e);break;case"textarea":iu(e,s),i=Nl(e,s),ye("invalid",e);break;default:i=s}kl(n,i),l=i;for(r in l)if(l.hasOwnProperty(r)){var u=l[r];r==="style"?yd(e,u):r==="dangerouslySetInnerHTML"?(u=u?u.__html:void 0,u!=null&&fd(e,u)):r==="children"?typeof u=="string"?(n!=="textarea"||u!=="")&&ci(e,u):typeof u=="number"&&ci(e,""+u):r!=="suppressContentEditableWarning"&&r!=="suppressHydrationWarning"&&r!=="autoFocus"&&(oi.hasOwnProperty(r)?u!=null&&r==="onScroll"&&ye("scroll",e):u!=null&&lo(e,r,u,a))}switch(n){case"input":Ji(e),su(e,s,!1);break;case"textarea":Ji(e),ru(e);break;case"option":s.value!=null&&e.setAttribute("value",""+Nn(s.value));break;case"select":e.multiple=!!s.multiple,r=s.value,r!=null?ms(e,!!s.multiple,r,!1):s.defaultValue!=null&&ms(e,!!s.multiple,s.defaultValue,!0);break;default:typeof i.onClick=="function"&&(e.onclick=Lr)}switch(n){case"button":case"input":case"select":case"textarea":s=!!s.autoFocus;break e;case"img":s=!0;break e;default:s=!1}}s&&(t.flags|=4)}t.ref!==null&&(t.flags|=512,t.flags|=2097152)}return ze(t),null;case 6:if(e&&t.stateNode!=null)Bp(e,t,e.memoizedProps,s);else{if(typeof s!="string"&&t.stateNode===null)throw Error(z(166));if(n=In(wi.current),In(Bt.current),dr(t)){if(s=t.stateNode,n=t.memoizedProps,s[Ot]=t,(r=s.nodeValue!==n)&&(e=ct,e!==null))switch(e.tag){case 3:ur(s.nodeValue,n,(e.mode&1)!==0);break;case 5:e.memoizedProps.suppressHydrationWarning!==!0&&ur(s.nodeValue,n,(e.mode&1)!==0)}r&&(t.flags|=4)}else s=(n.nodeType===9?n:n.ownerDocument).createTextNode(s),s[Ot]=t,t.stateNode=s}return ze(t),null;case 13:if(he(ke),s=t.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(be&&ot!==null&&(t.mode&1)!==0&&(t.flags&128)===0)sp(),Ns(),t.flags|=98560,r=!1;else if(r=dr(t),s!==null&&s.dehydrated!==null){if(e===null){if(!r)throw Error(z(318));if(r=t.memoizedState,r=r!==null?r.dehydrated:null,!r)throw Error(z(317));r[Ot]=t}else Ns(),(t.flags&128)===0&&(t.memoizedState=null),t.flags|=4;ze(t),r=!1}else Ct!==null&&(io(Ct),Ct=null),r=!0;if(!r)return t.flags&65536?t:null}return(t.flags&128)!==0?(t.lanes=n,t):(s=s!==null,s!==(e!==null&&e.memoizedState!==null)&&s&&(t.child.flags|=8192,(t.mode&1)!==0&&(e===null||(ke.current&1)!==0?De===0&&(De=3):qo())),t.updateQueue!==null&&(t.flags|=4),ze(t),null);case 4:return ks(),Ql(e,t),e===null&&yi(t.stateNode.containerInfo),ze(t),null;case 10:return Co(t.type._context),ze(t),null;case 17:return it(t.type)&&Pr(),ze(t),null;case 19:if(he(ke),r=t.memoizedState,r===null)return ze(t),null;if(s=(t.flags&128)!==0,a=r.rendering,a===null)if(s)Vs(r,!1);else{if(De!==0||e!==null&&(e.flags&128)!==0)for(e=t.child;e!==null;){if(a=Hr(e),a!==null){for(t.flags|=128,Vs(r,!1),s=a.updateQueue,s!==null&&(t.updateQueue=s,t.flags|=4),t.subtreeFlags=0,s=n,n=t.child;n!==null;)r=n,e=s,r.flags&=14680066,a=r.alternate,a===null?(r.childLanes=0,r.lanes=e,r.child=null,r.subtreeFlags=0,r.memoizedProps=null,r.memoizedState=null,r.updateQueue=null,r.dependencies=null,r.stateNode=null):(r.childLanes=a.childLanes,r.lanes=a.lanes,r.child=a.child,r.subtreeFlags=0,r.deletions=null,r.memoizedProps=a.memoizedProps,r.memoizedState=a.memoizedState,r.updateQueue=a.updateQueue,r.type=a.type,e=a.dependencies,r.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext}),n=n.sibling;return ve(ke,ke.current&1|2),t.child}e=e.sibling}r.tail!==null&&Ce()>Ss&&(t.flags|=128,s=!0,Vs(r,!1),t.lanes=4194304)}else{if(!s)if(e=Hr(a),e!==null){if(t.flags|=128,s=!0,n=e.updateQueue,n!==null&&(t.updateQueue=n,t.flags|=4),Vs(r,!0),r.tail===null&&r.tailMode==="hidden"&&!a.alternate&&!be)return ze(t),null}else 2*Ce()-r.renderingStartTime>Ss&&n!==1073741824&&(t.flags|=128,s=!0,Vs(r,!1),t.lanes=4194304);r.isBackwards?(a.sibling=t.child,t.child=a):(n=r.last,n!==null?n.sibling=a:t.child=a,r.last=a)}return r.tail!==null?(t=r.tail,r.rendering=t,r.tail=t.sibling,r.renderingStartTime=Ce(),t.sibling=null,n=ke.current,ve(ke,s?n&1|2:n&1),t):(ze(t),null);case 22:case 23:return Fo(),s=t.memoizedState!==null,e!==null&&e.memoizedState!==null!==s&&(t.flags|=8192),s&&(t.mode&1)!==0?(lt&1073741824)!==0&&(ze(t),t.subtreeFlags&6&&(t.flags|=8192)):ze(t),null;case 24:return null;case 25:return null}throw Error(z(156,t.tag))}function vy(e,t){switch(ko(t),t.tag){case 1:return it(t.type)&&Pr(),e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 3:return ks(),he(st),he(Fe),Ro(),e=t.flags,(e&65536)!==0&&(e&128)===0?(t.flags=e&-65537|128,t):null;case 5:return Do(t),null;case 13:if(he(ke),e=t.memoizedState,e!==null&&e.dehydrated!==null){if(t.alternate===null)throw Error(z(340));Ns()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 19:return he(ke),null;case 4:return ks(),null;case 10:return Co(t.type._context),null;case 22:case 23:return Fo(),null;case 24:return null;default:return null}}var fr=!1,He=!1,yy=typeof WeakSet=="function"?WeakSet:Set,Q=null;function ds(e,t){var n=e.ref;if(n!==null)if(typeof n=="function")try{n(null)}catch(s){Ee(e,t,s)}else n.current=null}function Xl(e,t,n){try{n()}catch(s){Ee(e,t,s)}}var Yu=!1;function hy(e,t){if(Ll=Dr,e=qd(),No(e)){if("selectionStart"in e)var n={start:e.selectionStart,end:e.selectionEnd};else e:{n=(n=e.ownerDocument)&&n.defaultView||window;var s=n.getSelection&&n.getSelection();if(s&&s.rangeCount!==0){n=s.anchorNode;var i=s.anchorOffset,r=s.focusNode;s=s.focusOffset;try{n.nodeType,r.nodeType}catch{n=null;break e}var a=0,l=-1,u=-1,o=0,h=0,g=e,v=null;t:for(;;){for(var w;g!==n||i!==0&&g.nodeType!==3||(l=a+i),g!==r||s!==0&&g.nodeType!==3||(u=a+s),g.nodeType===3&&(a+=g.nodeValue.length),(w=g.firstChild)!==null;)v=g,g=w;for(;;){if(g===e)break t;if(v===n&&++o===i&&(l=a),v===r&&++h===s&&(u=a),(w=g.nextSibling)!==null)break;g=v,v=g.parentNode}g=w}n=l===-1||u===-1?null:{start:l,end:u}}else n=null}n=n||{start:0,end:0}}else n=null;for(Pl={focusedElem:e,selectionRange:n},Dr=!1,Q=t;Q!==null;)if(t=Q,e=t.child,(t.subtreeFlags&1028)!==0&&e!==null)e.return=t,Q=e;else for(;Q!==null;){t=Q;try{var _=t.alternate;if((t.flags&1024)!==0)switch(t.tag){case 0:case 11:case 15:break;case 1:if(_!==null){var N=_.memoizedProps,E=_.memoizedState,y=t.stateNode,f=y.getSnapshotBeforeUpdate(t.elementType===t.type?N:St(t.type,N),E);y.__reactInternalSnapshotBeforeUpdate=f}break;case 3:var p=t.stateNode.containerInfo;p.nodeType===1?p.textContent="":p.nodeType===9&&p.documentElement&&p.removeChild(p.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(z(163))}}catch(k){Ee(t,t.return,k)}if(e=t.sibling,e!==null){e.return=t.return,Q=e;break}Q=t.return}return _=Yu,Yu=!1,_}function ri(e,t,n){var s=t.updateQueue;if(s=s!==null?s.lastEffect:null,s!==null){var i=s=s.next;do{if((i.tag&e)===e){var r=i.destroy;i.destroy=void 0,r!==void 0&&Xl(t,n,r)}i=i.next}while(i!==s)}}function ia(e,t){if(t=t.updateQueue,t=t!==null?t.lastEffect:null,t!==null){var n=t=t.next;do{if((n.tag&e)===e){var s=n.create;n.destroy=s()}n=n.next}while(n!==t)}}function Jl(e){var t=e.ref;if(t!==null){var n=e.stateNode;e.tag,e=n,typeof t=="function"?t(e):t.current=e}}function Kp(e){var t=e.alternate;t!==null&&(e.alternate=null,Kp(t)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(t=e.stateNode,t!==null&&(delete t[Ot],delete t[gi],delete t[Ul],delete t[Zv],delete t[ey])),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}function zp(e){return e.tag===5||e.tag===3||e.tag===4}function Qu(e){e:for(;;){for(;e.sibling===null;){if(e.return===null||zp(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.flags&2||e.child===null||e.tag===4)continue e;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function Zl(e,t,n){var s=e.tag;if(s===5||s===6)e=e.stateNode,t?n.nodeType===8?n.parentNode.insertBefore(e,t):n.insertBefore(e,t):(n.nodeType===8?(t=n.parentNode,t.insertBefore(e,n)):(t=n,t.appendChild(e)),n=n._reactRootContainer,n!=null||t.onclick!==null||(t.onclick=Lr));else if(s!==4&&(e=e.child,e!==null))for(Zl(e,t,n),e=e.sibling;e!==null;)Zl(e,t,n),e=e.sibling}function eo(e,t,n){var s=e.tag;if(s===5||s===6)e=e.stateNode,t?n.insertBefore(e,t):n.appendChild(e);else if(s!==4&&(e=e.child,e!==null))for(eo(e,t,n),e=e.sibling;e!==null;)eo(e,t,n),e=e.sibling}var Pe=null,Et=!1;function an(e,t,n){for(n=n.child;n!==null;)Hp(e,t,n),n=n.sibling}function Hp(e,t,n){if(Ut&&typeof Ut.onCommitFiberUnmount=="function")try{Ut.onCommitFiberUnmount(Qr,n)}catch{}switch(n.tag){case 5:He||ds(n,t);case 6:var s=Pe,i=Et;Pe=null,an(e,t,n),Pe=s,Et=i,Pe!==null&&(Et?(e=Pe,n=n.stateNode,e.nodeType===8?e.parentNode.removeChild(n):e.removeChild(n)):Pe.removeChild(n.stateNode));break;case 18:Pe!==null&&(Et?(e=Pe,n=n.stateNode,e.nodeType===8?sl(e.parentNode,n):e.nodeType===1&&sl(e,n),mi(e)):sl(Pe,n.stateNode));break;case 4:s=Pe,i=Et,Pe=n.stateNode.containerInfo,Et=!0,an(e,t,n),Pe=s,Et=i;break;case 0:case 11:case 14:case 15:if(!He&&(s=n.updateQueue,s!==null&&(s=s.lastEffect,s!==null))){i=s=s.next;do{var r=i,a=r.destroy;r=r.tag,a!==void 0&&((r&2)!==0||(r&4)!==0)&&Xl(n,t,a),i=i.next}while(i!==s)}an(e,t,n);break;case 1:if(!He&&(ds(n,t),s=n.stateNode,typeof s.componentWillUnmount=="function"))try{s.props=n.memoizedProps,s.state=n.memoizedState,s.componentWillUnmount()}catch(l){Ee(n,t,l)}an(e,t,n);break;case 21:an(e,t,n);break;case 22:n.mode&1?(He=(s=He)||n.memoizedState!==null,an(e,t,n),He=s):an(e,t,n);break;default:an(e,t,n)}}function Xu(e){var t=e.updateQueue;if(t!==null){e.updateQueue=null;var n=e.stateNode;n===null&&(n=e.stateNode=new yy),t.forEach(function(s){var i=Ey.bind(null,e,s);n.has(s)||(n.add(s),s.then(i,i))})}}function _t(e,t){var n=t.deletions;if(n!==null)for(var s=0;s<n.length;s++){var i=n[s];try{var r=e,a=t,l=a;e:for(;l!==null;){switch(l.tag){case 5:Pe=l.stateNode,Et=!1;break e;case 3:Pe=l.stateNode.containerInfo,Et=!0;break e;case 4:Pe=l.stateNode.containerInfo,Et=!0;break e}l=l.return}if(Pe===null)throw Error(z(160));Hp(r,a,i),Pe=null,Et=!1;var u=i.alternate;u!==null&&(u.return=null),i.return=null}catch(o){Ee(i,t,o)}}if(t.subtreeFlags&12854)for(t=t.child;t!==null;)Fp(t,e),t=t.sibling}function Fp(e,t){var n=e.alternate,s=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:if(_t(t,e),Pt(e),s&4){try{ri(3,e,e.return),ia(3,e)}catch(N){Ee(e,e.return,N)}try{ri(5,e,e.return)}catch(N){Ee(e,e.return,N)}}break;case 1:_t(t,e),Pt(e),s&512&&n!==null&&ds(n,n.return);break;case 5:if(_t(t,e),Pt(e),s&512&&n!==null&&ds(n,n.return),e.flags&32){var i=e.stateNode;try{ci(i,"")}catch(N){Ee(e,e.return,N)}}if(s&4&&(i=e.stateNode,i!=null)){var r=e.memoizedProps,a=n!==null?n.memoizedProps:r,l=e.type,u=e.updateQueue;if(e.updateQueue=null,u!==null)try{l==="input"&&r.type==="radio"&&r.name!=null&&dd(i,r),_l(l,a);var o=_l(l,r);for(a=0;a<u.length;a+=2){var h=u[a],g=u[a+1];h==="style"?yd(i,g):h==="dangerouslySetInnerHTML"?fd(i,g):h==="children"?ci(i,g):lo(i,h,g,o)}switch(l){case"input":$l(i,r);break;case"textarea":pd(i,r);break;case"select":var v=i._wrapperState.wasMultiple;i._wrapperState.wasMultiple=!!r.multiple;var w=r.value;w!=null?ms(i,!!r.multiple,w,!1):v!==!!r.multiple&&(r.defaultValue!=null?ms(i,!!r.multiple,r.defaultValue,!0):ms(i,!!r.multiple,r.multiple?[]:"",!1))}i[gi]=r}catch(N){Ee(e,e.return,N)}}break;case 6:if(_t(t,e),Pt(e),s&4){if(e.stateNode===null)throw Error(z(162));i=e.stateNode,r=e.memoizedProps;try{i.nodeValue=r}catch(N){Ee(e,e.return,N)}}break;case 3:if(_t(t,e),Pt(e),s&4&&n!==null&&n.memoizedState.isDehydrated)try{mi(t.containerInfo)}catch(N){Ee(e,e.return,N)}break;case 4:_t(t,e),Pt(e);break;case 13:_t(t,e),Pt(e),i=e.child,i.flags&8192&&(r=i.memoizedState!==null,i.stateNode.isHidden=r,!r||i.alternate!==null&&i.alternate.memoizedState!==null||(zo=Ce())),s&4&&Xu(e);break;case 22:if(h=n!==null&&n.memoizedState!==null,e.mode&1?(He=(o=He)||h,_t(t,e),He=o):_t(t,e),Pt(e),s&8192){if(o=e.memoizedState!==null,(e.stateNode.isHidden=o)&&!h&&(e.mode&1)!==0)for(Q=e,h=e.child;h!==null;){for(g=Q=h;Q!==null;){switch(v=Q,w=v.child,v.tag){case 0:case 11:case 14:case 15:ri(4,v,v.return);break;case 1:ds(v,v.return);var _=v.stateNode;if(typeof _.componentWillUnmount=="function"){s=v,n=v.return;try{t=s,_.props=t.memoizedProps,_.state=t.memoizedState,_.componentWillUnmount()}catch(N){Ee(s,n,N)}}break;case 5:ds(v,v.return);break;case 22:if(v.memoizedState!==null){Zu(g);continue}}w!==null?(w.return=v,Q=w):Zu(g)}h=h.sibling}e:for(h=null,g=e;;){if(g.tag===5){if(h===null){h=g;try{i=g.stateNode,o?(r=i.style,typeof r.setProperty=="function"?r.setProperty("display","none","important"):r.display="none"):(l=g.stateNode,u=g.memoizedProps.style,a=u!=null&&u.hasOwnProperty("display")?u.display:null,l.style.display=vd("display",a))}catch(N){Ee(e,e.return,N)}}}else if(g.tag===6){if(h===null)try{g.stateNode.nodeValue=o?"":g.memoizedProps}catch(N){Ee(e,e.return,N)}}else if((g.tag!==22&&g.tag!==23||g.memoizedState===null||g===e)&&g.child!==null){g.child.return=g,g=g.child;continue}if(g===e)break e;for(;g.sibling===null;){if(g.return===null||g.return===e)break e;h===g&&(h=null),g=g.return}h===g&&(h=null),g.sibling.return=g.return,g=g.sibling}}break;case 19:_t(t,e),Pt(e),s&4&&Xu(e);break;case 21:break;default:_t(t,e),Pt(e)}}function Pt(e){var t=e.flags;if(t&2){try{e:{for(var n=e.return;n!==null;){if(zp(n)){var s=n;break e}n=n.return}throw Error(z(160))}switch(s.tag){case 5:var i=s.stateNode;s.flags&32&&(ci(i,""),s.flags&=-33);var r=Qu(e);eo(e,r,i);break;case 3:case 4:var a=s.stateNode.containerInfo,l=Qu(e);Zl(e,l,a);break;default:throw Error(z(161))}}catch(u){Ee(e,e.return,u)}e.flags&=-3}t&4096&&(e.flags&=-4097)}function gy(e,t,n){Q=e,qp(e,t,n)}function qp(e,t,n){for(var s=(e.mode&1)!==0;Q!==null;){var i=Q,r=i.child;if(i.tag===22&&s){var a=i.memoizedState!==null||fr;if(!a){var l=i.alternate,u=l!==null&&l.memoizedState!==null||He;l=fr;var o=He;if(fr=a,(He=u)&&!o)for(Q=i;Q!==null;)a=Q,u=a.child,a.tag===22&&a.memoizedState!==null?ed(i):u!==null?(u.return=a,Q=u):ed(i);for(;r!==null;)Q=r,qp(r,t,n),r=r.sibling;Q=i,fr=l,He=o}Ju(e,t,n)}else(i.subtreeFlags&8772)!==0&&r!==null?(r.return=i,Q=r):Ju(e,t,n)}}function Ju(e){for(;Q!==null;){var t=Q;if((t.flags&8772)!==0){var n=t.alternate;try{if((t.flags&8772)!==0)switch(t.tag){case 0:case 11:case 15:He||ia(5,t);break;case 1:var s=t.stateNode;if(t.flags&4&&!He)if(n===null)s.componentDidMount();else{var i=t.elementType===t.type?n.memoizedProps:St(t.type,n.memoizedProps);s.componentDidUpdate(i,n.memoizedState,s.__reactInternalSnapshotBeforeUpdate)}var r=t.updateQueue;r!==null&&Mu(t,r,s);break;case 3:var a=t.updateQueue;if(a!==null){if(n=null,t.child!==null)switch(t.child.tag){case 5:n=t.child.stateNode;break;case 1:n=t.child.stateNode}Mu(t,a,n)}break;case 5:var l=t.stateNode;if(n===null&&t.flags&4){n=l;var u=t.memoizedProps;switch(t.type){case"button":case"input":case"select":case"textarea":u.autoFocus&&n.focus();break;case"img":u.src&&(n.src=u.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(t.memoizedState===null){var o=t.alternate;if(o!==null){var h=o.memoizedState;if(h!==null){var g=h.dehydrated;g!==null&&mi(g)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(z(163))}He||t.flags&512&&Jl(t)}catch(v){Ee(t,t.return,v)}}if(t===e){Q=null;break}if(n=t.sibling,n!==null){n.return=t.return,Q=n;break}Q=t.return}}function Zu(e){for(;Q!==null;){var t=Q;if(t===e){Q=null;break}var n=t.sibling;if(n!==null){n.return=t.return,Q=n;break}Q=t.return}}function ed(e){for(;Q!==null;){var t=Q;try{switch(t.tag){case 0:case 11:case 15:var n=t.return;try{ia(4,t)}catch(u){Ee(t,n,u)}break;case 1:var s=t.stateNode;if(typeof s.componentDidMount=="function"){var i=t.return;try{s.componentDidMount()}catch(u){Ee(t,i,u)}}var r=t.return;try{Jl(t)}catch(u){Ee(t,r,u)}break;case 5:var a=t.return;try{Jl(t)}catch(u){Ee(t,a,u)}}}catch(u){Ee(t,t.return,u)}if(t===e){Q=null;break}var l=t.sibling;if(l!==null){l.return=t.return,Q=l;break}Q=t.return}}var $y=Math.ceil,Gr=Zt.ReactCurrentDispatcher,Bo=Zt.ReactCurrentOwner,gt=Zt.ReactCurrentBatchConfig,ce=0,Ie=null,Ae=null,Me=0,lt=0,ps=_n(0),De=0,_i=null,Bn=0,ra=0,Ko=0,ai=null,tt=null,zo=0,Ss=1/0,qt=null,Vr=!1,to=null,gn=null,vr=!1,pn=null,Wr=0,li=0,no=null,kr=-1,_r=0;function Qe(){return(ce&6)!==0?Ce():kr!==-1?kr:kr=Ce()}function $n(e){return(e.mode&1)===0?1:(ce&2)!==0&&Me!==0?Me&-Me:ny.transition!==null?(_r===0&&(_r=Td()),_r):(e=de,e!==0||(e=window.event,e=e===void 0?16:Pd(e.type)),e)}function At(e,t,n,s){if(50<li)throw li=0,no=null,Error(z(185));Si(e,n,s),((ce&2)===0||e!==Ie)&&(e===Ie&&((ce&2)===0&&(ra|=n),De===4&&un(e,Me)),rt(e,s),n===1&&ce===0&&(t.mode&1)===0&&(Ss=Ce()+500,ta&&Sn()))}function rt(e,t){var n=e.callbackNode;iv(e,t);var s=xr(e,e===Ie?Me:0);if(s===0)n!==null&&ou(n),e.callbackNode=null,e.callbackPriority=0;else if(t=s&-s,e.callbackPriority!==t){if(n!=null&&ou(n),t===1)e.tag===0?ty(td.bind(null,e)):ep(td.bind(null,e)),Xv(function(){(ce&6)===0&&Sn()}),n=null;else{switch(Ad(s)){case 1:n=mo;break;case 4:n=Ed;break;case 16:n=Ar;break;case 536870912:n=Cd;break;default:n=Ar}n=Jp(n,Gp.bind(null,e))}e.callbackPriority=t,e.callbackNode=n}}function Gp(e,t){if(kr=-1,_r=0,(ce&6)!==0)throw Error(z(327));var n=e.callbackNode;if(gs()&&e.callbackNode!==n)return null;var s=xr(e,e===Ie?Me:0);if(s===0)return null;if((s&30)!==0||(s&e.expiredLanes)!==0||t)t=jr(e,s);else{t=s;var i=ce;ce|=2;var r=Wp();(Ie!==e||Me!==t)&&(qt=null,Ss=Ce()+500,Ln(e,t));do try{by();break}catch(l){Vp(e,l)}while(!0);Eo(),Gr.current=r,ce=i,Ae!==null?t=0:(Ie=null,Me=0,t=De)}if(t!==0){if(t===2&&(i=Al(e),i!==0&&(s=i,t=so(e,i))),t===1)throw n=_i,Ln(e,0),un(e,s),rt(e,Ce()),n;if(t===6)un(e,s);else{if(i=e.current.alternate,(s&30)===0&&!wy(i)&&(t=jr(e,s),t===2&&(r=Al(e),r!==0&&(s=r,t=so(e,r))),t===1))throw n=_i,Ln(e,0),un(e,s),rt(e,Ce()),n;switch(e.finishedWork=i,e.finishedLanes=s,t){case 0:case 1:throw Error(z(345));case 2:xn(e,tt,qt);break;case 3:if(un(e,s),(s&130023424)===s&&(t=zo+500-Ce(),10<t)){if(xr(e,0)!==0)break;if(i=e.suspendedLanes,(i&s)!==s){Qe(),e.pingedLanes|=e.suspendedLanes&i;break}e.timeoutHandle=Ol(xn.bind(null,e,tt,qt),t);break}xn(e,tt,qt);break;case 4:if(un(e,s),(s&4194240)===s)break;for(t=e.eventTimes,i=-1;0<s;){var a=31-Tt(s);r=1<<a,a=t[a],a>i&&(i=a),s&=~r}if(s=i,s=Ce()-s,s=(120>s?120:480>s?480:1080>s?1080:1920>s?1920:3e3>s?3e3:4320>s?4320:1960*$y(s/1960))-s,10<s){e.timeoutHandle=Ol(xn.bind(null,e,tt,qt),s);break}xn(e,tt,qt);break;case 5:xn(e,tt,qt);break;default:throw Error(z(329))}}}return rt(e,Ce()),e.callbackNode===n?Gp.bind(null,e):null}function so(e,t){var n=ai;return e.current.memoizedState.isDehydrated&&(Ln(e,t).flags|=256),e=jr(e,t),e!==2&&(t=tt,tt=n,t!==null&&io(t)),e}function io(e){tt===null?tt=e:tt.push.apply(tt,e)}function wy(e){for(var t=e;;){if(t.flags&16384){var n=t.updateQueue;if(n!==null&&(n=n.stores,n!==null))for(var s=0;s<n.length;s++){var i=n[s],r=i.getSnapshot;i=i.value;try{if(!xt(r(),i))return!1}catch{return!1}}}if(n=t.child,t.subtreeFlags&16384&&n!==null)n.return=t,t=n;else{if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function un(e,t){for(t&=~Ko,t&=~ra,e.suspendedLanes|=t,e.pingedLanes&=~t,e=e.expirationTimes;0<t;){var n=31-Tt(t),s=1<<n;e[n]=-1,t&=~s}}function td(e){if((ce&6)!==0)throw Error(z(327));gs();var t=xr(e,0);if((t&1)===0)return rt(e,Ce()),null;var n=jr(e,t);if(e.tag!==0&&n===2){var s=Al(e);s!==0&&(t=s,n=so(e,s))}if(n===1)throw n=_i,Ln(e,0),un(e,t),rt(e,Ce()),n;if(n===6)throw Error(z(345));return e.finishedWork=e.current.alternate,e.finishedLanes=t,xn(e,tt,qt),rt(e,Ce()),null}function Ho(e,t){var n=ce;ce|=1;try{return e(t)}finally{ce=n,ce===0&&(Ss=Ce()+500,ta&&Sn())}}function Kn(e){pn!==null&&pn.tag===0&&(ce&6)===0&&gs();var t=ce;ce|=1;var n=gt.transition,s=de;try{if(gt.transition=null,de=1,e)return e()}finally{de=s,gt.transition=n,ce=t,(ce&6)===0&&Sn()}}function Fo(){lt=ps.current,he(ps)}function Ln(e,t){e.finishedWork=null,e.finishedLanes=0;var n=e.timeoutHandle;if(n!==-1&&(e.timeoutHandle=-1,Qv(n)),Ae!==null)for(n=Ae.return;n!==null;){var s=n;switch(ko(s),s.tag){case 1:s=s.type.childContextTypes,s!=null&&Pr();break;case 3:ks(),he(st),he(Fe),Ro();break;case 5:Do(s);break;case 4:ks();break;case 13:he(ke);break;case 19:he(ke);break;case 10:Co(s.type._context);break;case 22:case 23:Fo()}n=n.return}if(Ie=e,Ae=e=wn(e.current,null),Me=lt=t,De=0,_i=null,Ko=ra=Bn=0,tt=ai=null,Rn!==null){for(t=0;t<Rn.length;t++)if(n=Rn[t],s=n.interleaved,s!==null){n.interleaved=null;var i=s.next,r=n.pending;if(r!==null){var a=r.next;r.next=i,s.next=a}n.pending=s}Rn=null}return e}function Vp(e,t){do{var n=Ae;try{if(Eo(),wr.current=qr,Fr){for(var s=_e.memoizedState;s!==null;){var i=s.queue;i!==null&&(i.pending=null),s=s.next}Fr=!1}if(Un=0,Re=xe=_e=null,ii=!1,Ni=0,Bo.current=null,n===null||n.return===null){De=1,_i=t,Ae=null;break}e:{var r=e,a=n.return,l=n,u=t;if(t=Me,l.flags|=32768,u!==null&&typeof u=="object"&&typeof u.then=="function"){var o=u,h=l,g=h.tag;if((h.mode&1)===0&&(g===0||g===11||g===15)){var v=h.alternate;v?(h.updateQueue=v.updateQueue,h.memoizedState=v.memoizedState,h.lanes=v.lanes):(h.updateQueue=null,h.memoizedState=null)}var w=Hu(a);if(w!==null){w.flags&=-257,Fu(w,a,l,r,t),w.mode&1&&zu(r,o,t),t=w,u=o;var _=t.updateQueue;if(_===null){var N=new Set;N.add(u),t.updateQueue=N}else _.add(u);break e}else{if((t&1)===0){zu(r,o,t),qo();break e}u=Error(z(426))}}else if(be&&l.mode&1){var E=Hu(a);if(E!==null){(E.flags&65536)===0&&(E.flags|=256),Fu(E,a,l,r,t),_o(_s(u,l));break e}}r=u=_s(u,l),De!==4&&(De=2),ai===null?ai=[r]:ai.push(r),r=a;do{switch(r.tag){case 3:r.flags|=65536,t&=-t,r.lanes|=t;var y=Ap(r,u,t);Pu(r,y);break e;case 1:l=u;var f=r.type,p=r.stateNode;if((r.flags&128)===0&&(typeof f.getDerivedStateFromError=="function"||p!==null&&typeof p.componentDidCatch=="function"&&(gn===null||!gn.has(p)))){r.flags|=65536,t&=-t,r.lanes|=t;var k=xp(r,l,t);Pu(r,k);break e}}r=r.return}while(r!==null)}Yp(n)}catch(b){t=b,Ae===n&&n!==null&&(Ae=n=n.return);continue}break}while(!0)}function Wp(){var e=Gr.current;return Gr.current=qr,e===null?qr:e}function qo(){(De===0||De===3||De===2)&&(De=4),Ie===null||(Bn&268435455)===0&&(ra&268435455)===0||un(Ie,Me)}function jr(e,t){var n=ce;ce|=2;var s=Wp();(Ie!==e||Me!==t)&&(qt=null,Ln(e,t));do try{Ny();break}catch(i){Vp(e,i)}while(!0);if(Eo(),ce=n,Gr.current=s,Ae!==null)throw Error(z(261));return Ie=null,Me=0,De}function Ny(){for(;Ae!==null;)jp(Ae)}function by(){for(;Ae!==null&&!Yf();)jp(Ae)}function jp(e){var t=Xp(e.alternate,e,lt);e.memoizedProps=e.pendingProps,t===null?Yp(e):Ae=t,Bo.current=null}function Yp(e){var t=e;do{var n=t.alternate;if(e=t.return,(t.flags&32768)===0){if(n=fy(n,t,lt),n!==null){Ae=n;return}}else{if(n=vy(n,t),n!==null){n.flags&=32767,Ae=n;return}if(e!==null)e.flags|=32768,e.subtreeFlags=0,e.deletions=null;else{De=6,Ae=null;return}}if(t=t.sibling,t!==null){Ae=t;return}Ae=t=e}while(t!==null);De===0&&(De=5)}function xn(e,t,n){var s=de,i=gt.transition;try{gt.transition=null,de=1,ky(e,t,n,s)}finally{gt.transition=i,de=s}return null}function ky(e,t,n,s){do gs();while(pn!==null);if((ce&6)!==0)throw Error(z(327));n=e.finishedWork;var i=e.finishedLanes;if(n===null)return null;if(e.finishedWork=null,e.finishedLanes=0,n===e.current)throw Error(z(177));e.callbackNode=null,e.callbackPriority=0;var r=n.lanes|n.childLanes;if(rv(e,r),e===Ie&&(Ae=Ie=null,Me=0),(n.subtreeFlags&2064)===0&&(n.flags&2064)===0||vr||(vr=!0,Jp(Ar,function(){return gs(),null})),r=(n.flags&15990)!==0,(n.subtreeFlags&15990)!==0||r){r=gt.transition,gt.transition=null;var a=de;de=1;var l=ce;ce|=4,Bo.current=null,hy(e,n),Fp(n,e),Gv(Pl),Dr=!!Ll,Pl=Ll=null,e.current=n,gy(n,e,i),Qf(),ce=l,de=a,gt.transition=r}else e.current=n;if(vr&&(vr=!1,pn=e,Wr=i),r=e.pendingLanes,r===0&&(gn=null),Zf(n.stateNode,s),rt(e,Ce()),t!==null)for(s=e.onRecoverableError,n=0;n<t.length;n++)i=t[n],s(i.value,{componentStack:i.stack,digest:i.digest});if(Vr)throw Vr=!1,e=to,to=null,e;return(Wr&1)!==0&&e.tag!==0&&gs(),r=e.pendingLanes,(r&1)!==0?e===no?li++:(li=0,no=e):li=0,Sn(),null}function gs(){if(pn!==null){var e=Ad(Wr),t=gt.transition,n=de;try{if(gt.transition=null,de=16>e?16:e,pn===null)var s=!1;else{if(e=pn,pn=null,Wr=0,(ce&6)!==0)throw Error(z(331));var i=ce;for(ce|=4,Q=e.current;Q!==null;){var r=Q,a=r.child;if((Q.flags&16)!==0){var l=r.deletions;if(l!==null){for(var u=0;u<l.length;u++){var o=l[u];for(Q=o;Q!==null;){var h=Q;switch(h.tag){case 0:case 11:case 15:ri(8,h,r)}var g=h.child;if(g!==null)g.return=h,Q=g;else for(;Q!==null;){h=Q;var v=h.sibling,w=h.return;if(Kp(h),h===o){Q=null;break}if(v!==null){v.return=w,Q=v;break}Q=w}}}var _=r.alternate;if(_!==null){var N=_.child;if(N!==null){_.child=null;do{var E=N.sibling;N.sibling=null,N=E}while(N!==null)}}Q=r}}if((r.subtreeFlags&2064)!==0&&a!==null)a.return=r,Q=a;else e:for(;Q!==null;){if(r=Q,(r.flags&2048)!==0)switch(r.tag){case 0:case 11:case 15:ri(9,r,r.return)}var y=r.sibling;if(y!==null){y.return=r.return,Q=y;break e}Q=r.return}}var f=e.current;for(Q=f;Q!==null;){a=Q;var p=a.child;if((a.subtreeFlags&2064)!==0&&p!==null)p.return=a,Q=p;else e:for(a=f;Q!==null;){if(l=Q,(l.flags&2048)!==0)try{switch(l.tag){case 0:case 11:case 15:ia(9,l)}}catch(b){Ee(l,l.return,b)}if(l===a){Q=null;break e}var k=l.sibling;if(k!==null){k.return=l.return,Q=k;break e}Q=l.return}}if(ce=i,Sn(),Ut&&typeof Ut.onPostCommitFiberRoot=="function")try{Ut.onPostCommitFiberRoot(Qr,e)}catch{}s=!0}return s}finally{de=n,gt.transition=t}}return!1}function nd(e,t,n){t=_s(n,t),t=Ap(e,t,1),e=hn(e,t,1),t=Qe(),e!==null&&(Si(e,1,t),rt(e,t))}function Ee(e,t,n){if(e.tag===3)nd(e,e,n);else for(;t!==null;){if(t.tag===3){nd(t,e,n);break}else if(t.tag===1){var s=t.stateNode;if(typeof t.type.getDerivedStateFromError=="function"||typeof s.componentDidCatch=="function"&&(gn===null||!gn.has(s))){e=_s(n,e),e=xp(t,e,1),t=hn(t,e,1),e=Qe(),t!==null&&(Si(t,1,e),rt(t,e));break}}t=t.return}}function _y(e,t,n){var s=e.pingCache;s!==null&&s.delete(t),t=Qe(),e.pingedLanes|=e.suspendedLanes&n,Ie===e&&(Me&n)===n&&(De===4||De===3&&(Me&130023424)===Me&&500>Ce()-zo?Ln(e,0):Ko|=n),rt(e,t)}function Qp(e,t){t===0&&((e.mode&1)===0?t=1:(t=tr,tr<<=1,(tr&130023424)===0&&(tr=4194304)));var n=Qe();e=Xt(e,t),e!==null&&(Si(e,t,n),rt(e,n))}function Sy(e){var t=e.memoizedState,n=0;t!==null&&(n=t.retryLane),Qp(e,n)}function Ey(e,t){var n=0;switch(e.tag){case 13:var s=e.stateNode,i=e.memoizedState;i!==null&&(n=i.retryLane);break;case 19:s=e.stateNode;break;default:throw Error(z(314))}s!==null&&s.delete(t),Qp(e,n)}var Xp;Xp=function(e,t,n){if(e!==null)if(e.memoizedProps!==t.pendingProps||st.current)nt=!0;else{if((e.lanes&n)===0&&(t.flags&128)===0)return nt=!1,my(e,t,n);nt=(e.flags&131072)!==0}else nt=!1,be&&(t.flags&1048576)!==0&&tp(t,Ur,t.index);switch(t.lanes=0,t.tag){case 2:var s=t.type;br(e,t),e=t.pendingProps;var i=ws(t,Fe.current);hs(t,n),i=Lo(null,t,s,e,i,n);var r=Po();return t.flags|=1,typeof i=="object"&&i!==null&&typeof i.render=="function"&&i.$$typeof===void 0?(t.tag=1,t.memoizedState=null,t.updateQueue=null,it(s)?(r=!0,Mr(t)):r=!1,t.memoizedState=i.state!==null&&i.state!==void 0?i.state:null,Ao(t),i.updater=sa,t.stateNode=i,i._reactInternals=t,ql(t,s,e,n),t=Wl(null,t,s,!0,r,n)):(t.tag=0,be&&r&&bo(t),Ye(null,t,i,n),t=t.child),t;case 16:s=t.elementType;e:{switch(br(e,t),e=t.pendingProps,i=s._init,s=i(s._payload),t.type=s,i=t.tag=Ty(s),e=St(s,e),i){case 0:t=Vl(null,t,s,e,n);break e;case 1:t=Vu(null,t,s,e,n);break e;case 11:t=qu(null,t,s,e,n);break e;case 14:t=Gu(null,t,s,St(s.type,e),n);break e}throw Error(z(306,s,""))}return t;case 0:return s=t.type,i=t.pendingProps,i=t.elementType===s?i:St(s,i),Vl(e,t,s,i,n);case 1:return s=t.type,i=t.pendingProps,i=t.elementType===s?i:St(s,i),Vu(e,t,s,i,n);case 3:e:{if(Lp(t),e===null)throw Error(z(387));s=t.pendingProps,r=t.memoizedState,i=r.element,lp(e,t),zr(t,s,null,n);var a=t.memoizedState;if(s=a.element,r.isDehydrated)if(r={element:s,isDehydrated:!1,cache:a.cache,pendingSuspenseBoundaries:a.pendingSuspenseBoundaries,transitions:a.transitions},t.updateQueue.baseState=r,t.memoizedState=r,t.flags&256){i=_s(Error(z(423)),t),t=Wu(e,t,s,n,i);break e}else if(s!==i){i=_s(Error(z(424)),t),t=Wu(e,t,s,n,i);break e}else for(ot=yn(t.stateNode.containerInfo.firstChild),ct=t,be=!0,Ct=null,n=rp(t,null,s,n),t.child=n;n;)n.flags=n.flags&-3|4096,n=n.sibling;else{if(Ns(),s===i){t=Jt(e,t,n);break e}Ye(e,t,s,n)}t=t.child}return t;case 5:return op(t),e===null&&zl(t),s=t.type,i=t.pendingProps,r=e!==null?e.memoizedProps:null,a=i.children,Ml(s,i)?a=null:r!==null&&Ml(s,r)&&(t.flags|=32),Ip(e,t),Ye(e,t,a,n),t.child;case 6:return e===null&&zl(t),null;case 13:return Pp(e,t,n);case 4:return xo(t,t.stateNode.containerInfo),s=t.pendingProps,e===null?t.child=bs(t,null,s,n):Ye(e,t,s,n),t.child;case 11:return s=t.type,i=t.pendingProps,i=t.elementType===s?i:St(s,i),qu(e,t,s,i,n);case 7:return Ye(e,t,t.pendingProps,n),t.child;case 8:return Ye(e,t,t.pendingProps.children,n),t.child;case 12:return Ye(e,t,t.pendingProps.children,n),t.child;case 10:e:{if(s=t.type._context,i=t.pendingProps,r=t.memoizedProps,a=i.value,ve(Br,s._currentValue),s._currentValue=a,r!==null)if(xt(r.value,a)){if(r.children===i.children&&!st.current){t=Jt(e,t,n);break e}}else for(r=t.child,r!==null&&(r.return=t);r!==null;){var l=r.dependencies;if(l!==null){a=r.child;for(var u=l.firstContext;u!==null;){if(u.context===s){if(r.tag===1){u=jt(-1,n&-n),u.tag=2;var o=r.updateQueue;if(o!==null){o=o.shared;var h=o.pending;h===null?u.next=u:(u.next=h.next,h.next=u),o.pending=u}}r.lanes|=n,u=r.alternate,u!==null&&(u.lanes|=n),Hl(r.return,n,t),l.lanes|=n;break}u=u.next}}else if(r.tag===10)a=r.type===t.type?null:r.child;else if(r.tag===18){if(a=r.return,a===null)throw Error(z(341));a.lanes|=n,l=a.alternate,l!==null&&(l.lanes|=n),Hl(a,n,t),a=r.sibling}else a=r.child;if(a!==null)a.return=r;else for(a=r;a!==null;){if(a===t){a=null;break}if(r=a.sibling,r!==null){r.return=a.return,a=r;break}a=a.return}r=a}Ye(e,t,i.children,n),t=t.child}return t;case 9:return i=t.type,s=t.pendingProps.children,hs(t,n),i=$t(i),s=s(i),t.flags|=1,Ye(e,t,s,n),t.child;case 14:return s=t.type,i=St(s,t.pendingProps),i=St(s.type,i),Gu(e,t,s,i,n);case 15:return Dp(e,t,t.type,t.pendingProps,n);case 17:return s=t.type,i=t.pendingProps,i=t.elementType===s?i:St(s,i),br(e,t),t.tag=1,it(s)?(e=!0,Mr(t)):e=!1,hs(t,n),Tp(t,s,i),ql(t,s,i,n),Wl(null,t,s,!0,e,n);case 19:return Mp(e,t,n);case 22:return Rp(e,t,n)}throw Error(z(156,t.tag))};function Jp(e,t){return Sd(e,t)}function Cy(e,t,n,s){this.tag=e,this.key=n,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=s,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function ht(e,t,n,s){return new Cy(e,t,n,s)}function Go(e){return e=e.prototype,!(!e||!e.isReactComponent)}function Ty(e){if(typeof e=="function")return Go(e)?1:0;if(e!=null){if(e=e.$$typeof,e===co)return 11;if(e===uo)return 14}return 2}function wn(e,t){var n=e.alternate;return n===null?(n=ht(e.tag,t,e.key,e.mode),n.elementType=e.elementType,n.type=e.type,n.stateNode=e.stateNode,n.alternate=e,e.alternate=n):(n.pendingProps=t,n.type=e.type,n.flags=0,n.subtreeFlags=0,n.deletions=null),n.flags=e.flags&14680064,n.childLanes=e.childLanes,n.lanes=e.lanes,n.child=e.child,n.memoizedProps=e.memoizedProps,n.memoizedState=e.memoizedState,n.updateQueue=e.updateQueue,t=e.dependencies,n.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},n.sibling=e.sibling,n.index=e.index,n.ref=e.ref,n}function Sr(e,t,n,s,i,r){var a=2;if(s=e,typeof e=="function")Go(e)&&(a=1);else if(typeof e=="string")a=5;else e:switch(e){case ns:return Pn(n.children,i,r,t);case oo:a=8,i|=8;break;case fl:return e=ht(12,n,t,i|2),e.elementType=fl,e.lanes=r,e;case vl:return e=ht(13,n,t,i),e.elementType=vl,e.lanes=r,e;case yl:return e=ht(19,n,t,i),e.elementType=yl,e.lanes=r,e;case od:return aa(n,i,r,t);default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case ad:a=10;break e;case ld:a=9;break e;case co:a=11;break e;case uo:a=14;break e;case ln:a=16,s=null;break e}throw Error(z(130,e==null?e:typeof e,""))}return t=ht(a,n,t,i),t.elementType=e,t.type=s,t.lanes=r,t}function Pn(e,t,n,s){return e=ht(7,e,s,t),e.lanes=n,e}function aa(e,t,n,s){return e=ht(22,e,s,t),e.elementType=od,e.lanes=n,e.stateNode={isHidden:!1},e}function dl(e,t,n){return e=ht(6,e,null,t),e.lanes=n,e}function pl(e,t,n){return t=ht(4,e.children!==null?e.children:[],e.key,t),t.lanes=n,t.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},t}function Ay(e,t,n,s,i){this.tag=t,this.containerInfo=e,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=Ya(0),this.expirationTimes=Ya(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Ya(0),this.identifierPrefix=s,this.onRecoverableError=i,this.mutableSourceEagerHydrationData=null}function Vo(e,t,n,s,i,r,a,l,u){return e=new Ay(e,t,n,l,u),t===1?(t=1,r===!0&&(t|=8)):t=0,r=ht(3,null,null,t),e.current=r,r.stateNode=e,r.memoizedState={element:s,isDehydrated:n,cache:null,transitions:null,pendingSuspenseBoundaries:null},Ao(r),e}function xy(e,t,n){var s=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:ts,key:s==null?null:""+s,children:e,containerInfo:t,implementation:n}}function Zp(e){if(!e)return bn;e=e._reactInternals;e:{if(Hn(e)!==e||e.tag!==1)throw Error(z(170));var t=e;do{switch(t.tag){case 3:t=t.stateNode.context;break e;case 1:if(it(t.type)){t=t.stateNode.__reactInternalMemoizedMergedChildContext;break e}}t=t.return}while(t!==null);throw Error(z(171))}if(e.tag===1){var n=e.type;if(it(n))return Zd(e,n,t)}return t}function em(e,t,n,s,i,r,a,l,u){return e=Vo(n,s,!0,e,i,r,a,l,u),e.context=Zp(null),n=e.current,s=Qe(),i=$n(n),r=jt(s,i),r.callback=t??null,hn(n,r,i),e.current.lanes=i,Si(e,i,s),rt(e,s),e}function la(e,t,n,s){var i=t.current,r=Qe(),a=$n(i);return n=Zp(n),t.context===null?t.context=n:t.pendingContext=n,t=jt(r,a),t.payload={element:e},s=s===void 0?null:s,s!==null&&(t.callback=s),e=hn(i,t,a),e!==null&&(At(e,i,a,r),$r(e,i,a)),a}function Yr(e){return e=e.current,e.child?(e.child.tag===5,e.child.stateNode):null}function sd(e,t){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var n=e.retryLane;e.retryLane=n!==0&&n<t?n:t}}function Wo(e,t){sd(e,t),(e=e.alternate)&&sd(e,t)}function Dy(){return null}var tm=typeof reportError=="function"?reportError:function(e){console.error(e)};function jo(e){this._internalRoot=e}oa.prototype.render=jo.prototype.render=function(e){var t=this._internalRoot;if(t===null)throw Error(z(409));la(e,t,null,null)};oa.prototype.unmount=jo.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var t=e.containerInfo;Kn(function(){la(null,e,null,null)}),t[Qt]=null}};function oa(e){this._internalRoot=e}oa.prototype.unstable_scheduleHydration=function(e){if(e){var t=Rd();e={blockedOn:null,target:e,priority:t};for(var n=0;n<cn.length&&t!==0&&t<cn[n].priority;n++);cn.splice(n,0,e),n===0&&Ld(e)}};function Yo(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function ca(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11&&(e.nodeType!==8||e.nodeValue!==" react-mount-point-unstable "))}function id(){}function Ry(e,t,n,s,i){if(i){if(typeof s=="function"){var r=s;s=function(){var o=Yr(a);r.call(o)}}var a=em(t,s,e,0,null,!1,!1,"",id);return e._reactRootContainer=a,e[Qt]=a.current,yi(e.nodeType===8?e.parentNode:e),Kn(),a}for(;i=e.lastChild;)e.removeChild(i);if(typeof s=="function"){var l=s;s=function(){var o=Yr(u);l.call(o)}}var u=Vo(e,0,!1,null,null,!1,!1,"",id);return e._reactRootContainer=u,e[Qt]=u.current,yi(e.nodeType===8?e.parentNode:e),Kn(function(){la(t,u,n,s)}),u}function ua(e,t,n,s,i){var r=n._reactRootContainer;if(r){var a=r;if(typeof i=="function"){var l=i;i=function(){var u=Yr(a);l.call(u)}}la(t,a,e,i)}else a=Ry(n,t,e,i,s);return Yr(a)}xd=function(e){switch(e.tag){case 3:var t=e.stateNode;if(t.current.memoizedState.isDehydrated){var n=Xs(t.pendingLanes);n!==0&&(fo(t,n|1),rt(t,Ce()),(ce&6)===0&&(Ss=Ce()+500,Sn()))}break;case 13:Kn(function(){var s=Xt(e,1);if(s!==null){var i=Qe();At(s,e,1,i)}}),Wo(e,1)}};vo=function(e){if(e.tag===13){var t=Xt(e,134217728);if(t!==null){var n=Qe();At(t,e,134217728,n)}Wo(e,134217728)}};Dd=function(e){if(e.tag===13){var t=$n(e),n=Xt(e,t);if(n!==null){var s=Qe();At(n,e,t,s)}Wo(e,t)}};Rd=function(){return de};Id=function(e,t){var n=de;try{return de=e,t()}finally{de=n}};El=function(e,t,n){switch(t){case"input":if($l(e,n),t=n.name,n.type==="radio"&&t!=null){for(n=e;n.parentNode;)n=n.parentNode;for(n=n.querySelectorAll("input[name="+JSON.stringify(""+t)+'][type="radio"]'),t=0;t<n.length;t++){var s=n[t];if(s!==e&&s.form===e.form){var i=ea(s);if(!i)throw Error(z(90));ud(s),$l(s,i)}}}break;case"textarea":pd(e,n);break;case"select":t=n.value,t!=null&&ms(e,!!n.multiple,t,!1)}};$d=Ho;wd=Kn;var Iy={usingClientEntryPoint:!1,Events:[Ci,as,ea,hd,gd,Ho]},Ws={findFiberByHostInstance:Dn,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},Ly={bundleType:Ws.bundleType,version:Ws.version,rendererPackageName:Ws.rendererPackageName,rendererConfig:Ws.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:Zt.ReactCurrentDispatcher,findHostInstanceByFiber:function(e){return e=kd(e),e===null?null:e.stateNode},findFiberByHostInstance:Ws.findFiberByHostInstance||Dy,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"&&(js=__REACT_DEVTOOLS_GLOBAL_HOOK__,!js.isDisabled&&js.supportsFiber))try{Qr=js.inject(Ly),Ut=js}catch{}var js;pt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Iy;pt.createPortal=function(e,t){var n=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!Yo(t))throw Error(z(200));return xy(e,t,null,n)};pt.createRoot=function(e,t){if(!Yo(e))throw Error(z(299));var n=!1,s="",i=tm;return t!=null&&(t.unstable_strictMode===!0&&(n=!0),t.identifierPrefix!==void 0&&(s=t.identifierPrefix),t.onRecoverableError!==void 0&&(i=t.onRecoverableError)),t=Vo(e,1,!1,null,null,n,!1,s,i),e[Qt]=t.current,yi(e.nodeType===8?e.parentNode:e),new jo(t)};pt.findDOMNode=function(e){if(e==null)return null;if(e.nodeType===1)return e;var t=e._reactInternals;if(t===void 0)throw typeof e.render=="function"?Error(z(188)):(e=Object.keys(e).join(","),Error(z(268,e)));return e=kd(t),e=e===null?null:e.stateNode,e};pt.flushSync=function(e){return Kn(e)};pt.hydrate=function(e,t,n){if(!ca(t))throw Error(z(200));return ua(null,e,t,!0,n)};pt.hydrateRoot=function(e,t,n){if(!Yo(e))throw Error(z(405));var s=n!=null&&n.hydratedSources||null,i=!1,r="",a=tm;if(n!=null&&(n.unstable_strictMode===!0&&(i=!0),n.identifierPrefix!==void 0&&(r=n.identifierPrefix),n.onRecoverableError!==void 0&&(a=n.onRecoverableError)),t=em(t,null,e,1,n??null,i,!1,r,a),e[Qt]=t.current,yi(e),s)for(e=0;e<s.length;e++)n=s[e],i=n._getVersion,i=i(n._source),t.mutableSourceEagerHydrationData==null?t.mutableSourceEagerHydrationData=[n,i]:t.mutableSourceEagerHydrationData.push(n,i);return new oa(t)};pt.render=function(e,t,n){if(!ca(t))throw Error(z(200));return ua(null,e,t,!1,n)};pt.unmountComponentAtNode=function(e){if(!ca(e))throw Error(z(40));return e._reactRootContainer?(Kn(function(){ua(null,null,e,!1,function(){e._reactRootContainer=null,e[Qt]=null})}),!0):!1};pt.unstable_batchedUpdates=Ho;pt.unstable_renderSubtreeIntoContainer=function(e,t,n,s){if(!ca(n))throw Error(z(200));if(e==null||e._reactInternals===void 0)throw Error(z(38));return ua(e,t,n,!1,s)};pt.version="18.3.1-next-f1338f8080-20240426"});var rm=sn((_g,im)=>{"use strict";function sm(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(sm)}catch(e){console.error(e)}}sm(),im.exports=nm()});var lm=sn(Qo=>{"use strict";var am=rm();Qo.createRoot=am.createRoot,Qo.hydrateRoot=am.hydrateRoot;var Sg});var Jo=sn((Rg,fm)=>{"use strict";var Xo="ybndrfg8ejkmcpqxot1uwisza345h769",Py=/^[0-9a-f]{64}$/i,My=/^d-([ybndrfg8ejkmcpqxot1uwisza345h769]{52})\.localhost$/i,Oy=new Map([...Xo].map((e,t)=>[e,t]));function pm(e){if(typeof e!="string"||!Py.test(e))throw new Error("Invalid drive key format");let t="",n=0,s=0;for(let i=0;i<e.length;i+=2){for(s=s<<8|parseInt(e.slice(i,i+2),16),n+=8;n>=5;)n-=5,t+=Xo[s>>>n&31];s&=(1<<n)-1}return n>0&&(t+=Xo[s<<5-n&31]),`d-${t}.localhost`}function mm(e){if(typeof e!="string")return null;let t=My.exec(e);if(!t)return null;let n="",s=0,i=0;for(let r of t[1].toLowerCase())i=i<<5|Oy.get(r),s+=5,s>=8&&(s-=8,n+=(i>>>s&255).toString(16).padStart(2,"0"),i&=(1<<s)-1);return n.length!==64||i!==0?null:pm(n)===e.toLowerCase()?n:null}function Uy(e){return mm(e)!==null}fm.exports={driveHostnameForKey:pm,driveKeyFromHostname:mm,isDriveOriginHostname:Uy}});var rf=Ms(lm(),1);var dm=Ms(Gi());var cm=function(e,t,n,s){var i;t[0]=0;for(var r=1;r<t.length;r++){var a=t[r++],l=t[r]?(t[0]|=a?1:2,n[t[r++]]):t[++r];a===3?s[0]=l:a===4?s[1]=Object.assign(s[1]||{},l):a===5?(s[1]=s[1]||{})[t[++r]]=l:a===6?s[1][t[++r]]+=l+"":a?(i=e.apply(l,cm(e,l,n,["",null])),s.push(i),l[0]?t[0]|=2:(t[r-2]=0,t[r]=i)):s.push(l)}return s},om=new Map;function um(e){var t=om.get(this);return t||(t=new Map,om.set(this,t)),(t=cm(this,t.get(e)||(t.set(e,t=(function(n){for(var s,i,r=1,a="",l="",u=[0],o=function(v){r===1&&(v||(a=a.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?u.push(0,v,a):r===3&&(v||a)?(u.push(3,v,a),r=2):r===2&&a==="..."&&v?u.push(4,v,0):r===2&&a&&!v?u.push(5,0,!0,a):r>=5&&((a||!v&&r===5)&&(u.push(r,0,a,i),r=6),v&&(u.push(r,v,0,i),r=6)),a=""},h=0;h<n.length;h++){h&&(r===1&&o(),o(h));for(var g=0;g<n[h].length;g++)s=n[h][g],r===1?s==="<"?(o(),u=[u],r=3):a+=s:r===4?a==="--"&&s===">"?(r=1,a=""):a=s+a[0]:l?s===l?l="":a+=s:s==='"'||s==="'"?l=s:s===">"?(o(),r=1):r&&(s==="="?(r=5,i=a,a=""):s==="/"&&(r<5||n[h][g+1]===">")?(o(),r===3&&(u=u[0]),r=u,(u=u[0]).push(2,0,r),r=0):s===" "||s==="	"||s===`
`||s==="\r"?(o(),r=2):a+=s),r===3&&a==="!--"&&(r=4,u=u[0])}return o(),u})(e)),t),arguments,[])).length>1?t:t[0]}var c=um.bind(dm.createElement);var d=Ms(Gi(),1);function Ai({size:e=64,animated:t=!1}){return c`
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
  `}function da(){return c`
    <div className="wordmark">
      <span className="wordmark-bold">Pear</span><span className="wordmark-light">Browser</span>
    </div>
  `}var ym=Ms(Jo(),1),{isDriveOriginHostname:hm}=ym.default,pa="ybndrfg8ejkmcpqxot1uwisza345h769",vm=(()=>{let e=new Map;for(let t=0;t<pa.length;t++)e.set(pa[t],t);return e})();function By(e){if(!/^[0-9a-f]+$/i.test(e)||e.length%2!==0)return null;let t=new Uint8Array(e.length/2);for(let n=0;n<t.length;n++)t[n]=parseInt(e.slice(n*2,n*2+2),16);return t}function Ky(e){return Array.from(e,t=>t.toString(16).padStart(2,"0")).join("")}function zy(e){let t=e.byteLength*8,n="";for(let s=0;s<t;s+=5){let i=s>>>3,r=s&7;if(r<=3){n+=pa[e[i]>>>3-r&31];continue}let a=r-3,l=e[i]<<a&31,u=(i+1>=e.byteLength?0:e[i+1])>>>8-a;n+=pa[l|u]}return n}function Hy(e){let t=String(e||"").toLowerCase(),n=new Uint8Array(Math.ceil(t.length*5/8)),s=0,i=0,r=()=>{let E=t[i++];if(!vm.has(E))throw new Error("invalid z-base-32");return vm.get(E)},a=t.length&7,l=(t.length-a)/8;for(let E=0;E<l;E++){let y=r(),f=r(),p=r(),k=r(),b=r(),x=r(),$=r(),S=r();n[s++]=y<<3|f>>>2,n[s++]=(f&3)<<6|p<<1|k>>>4,n[s++]=(k&15)<<4|b>>>1,n[s++]=(b&1)<<7|x<<2|$>>>3,n[s++]=($&7)<<5|S}if(a===0)return n.subarray(0,s);let u=r(),o=r();if(n[s++]=u<<3|o>>>2,a<=2)return n.subarray(0,s);let h=r(),g=r();if(n[s++]=(o&3)<<6|h<<1|g>>>4,a<=4)return n.subarray(0,s);let v=r();if(n[s++]=(g&15)<<4|v>>>1,a<=5)return n.subarray(0,s);let w=r(),_=r();if(n[s++]=(v&1)<<7|w<<2|_>>>3,a<=7)return n.subarray(0,s);let N=r();return n[s++]=(_&7)<<5|N,n.subarray(0,s)}function gm(e){let t=By(e);return t?zy(t):null}function ma(e){try{let t=Hy(e);return t.length===32?Ky(t):null}catch{return null}}function fa(e){let t=Number(e)||0;if(t<1024)return`${t} B`;let n=["KB","MB","GB","TB"],s=t/1024,i=n[0];for(let r=1;r<n.length&&s>=1024;r++)s/=1024,i=n[r];return`${s>=10?s.toFixed(1):s.toFixed(2)} ${i}`}function ge(e){return!e||typeof e!="string"?"":e.length<=16?e:e.slice(0,8)+"\u2026"+e.slice(-6)}function Zo(e){let t=String(e||"").trim();if(!t)return null;if(/^hyper:\/\//i.test(t)||/^https?:\/\//i.test(t))return t;if(/^(?:pear|file):\/\//i.test(t))return null;if(/^[0-9a-f]{64}$/i.test(t))return`hyper://${t.toLowerCase()}/`;if(/^[13-9a-km-uw-z]{52}$/i.test(t))return`hyper://${t}/`;try{let n=new URL(`http://${t}`);if(hm(n.hostname)&&!t.includes("@"))return n.href}catch{}return/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::\d{1,5})?(?:[/?#].*)?$/i.test(t)?`https://${t.replace(/^\/+/,"")}`:t.includes("/")?t:`hyper://${t}`}function va(e){try{let t=new URL(String(e||"").trim());if(t.protocol!=="http:"&&t.protocol!=="https:")return!1;let n=(t.hostname||"").toLowerCase();return n!=="127.0.0.1"&&n!=="localhost"&&n!=="[::1]"&&!(t.protocol==="http:"&&hm(n))}catch{return!1}}function Ts(e){let t=String(e||"").trim();if(!t)return null;let s=t.replace(/^hyper:\/\//i,"").split("/")[0].trim();return/^[0-9a-f]{64}$/i.test(s)?s.toLowerCase():/^[13-9a-km-uw-z]{52}$/i.test(s)?ma(s):null}function ec(e){let t=String(e||"").trim();return t?/^[0-9a-f]{64}$/i.test(t)?t.toLowerCase():t.length<=300&&/^hyper:\/\/.+/i.test(t)?t:null:null}function $m(e){let t=String(e||"").normalize("NFKC").trim();return!(!/^[\p{L}\p{N}][\p{L}\p{N}_-]{0,127}$/u.test(t)||/^[0-9a-f]{64}$/i.test(t)||/^[13-9a-km-uw-z]{52}$/i.test(t))}function Kt(e){let t=String(e||"").trim();if(!t)return null;let n=(t.match(/^([a-z][a-z0-9+.-]*):\/\//i)?.[1]||"hyper").toLowerCase(),s=n==="autobee"?"autobee":n==="hyperbee"?"hyperbee":n==="sheets"?"sheets":n==="hiveindex"?"hiveindex":"drive",i=t.replace(/^(autobee|hyperbee|hiveindex|sheets|hyper):\/\//i,"").replace(/\/+$/,"").trim();return i?{key:i,bee:s==="hyperbee",autobee:s==="autobee",kind:s}:null}function tc(e){let t=String(e||"").trim();if(!t)return"";if(/^(bee|sheets|hiveindex|autobee):(?!\/\/)/i.test(t))return t;let n=Kt(t);if(!n)return t;if(n.autobee)return`autobee:${n.key}`;if(n.bee)return`bee:${n.key}`;if(n.kind==="sheets"||n.kind==="hiveindex"){let s=ma(n.key);return`${n.kind}:${s||n.key}`}return n.key}function nc(e){let n=String(e||"").trim().replace(/^sync:\/\//i,"").replace(/\/+$/,"").match(/^([0-9a-f]{64}):([0-9a-f]{64})$/i);return n?{key:n[1].toLowerCase(),encKey:n[2].toLowerCase()}:null}function wm(e,t){let n=String(e||"").trim().toLowerCase(),s=String(t||"").trim().toLowerCase();return!/^[0-9a-f]{64}$/.test(n)||!/^[0-9a-f]{64}$/.test(s)?"":`sync://${n}:${s}`}function Nm(e){let t=String(e||"").trim().replace(/^pearname:\/\//i,"").replace(/\/+$/,"");return/^[^\s/]{1,253}$/.test(t)?t:null}var km=Ms(Jo(),1),{driveKeyFromHostname:Fy}=km.default,_m=50,ya=20,bm=0;function qy(){return bm+=1,"tab-"+bm+"-"+Date.now().toString(36)}function Je(e){return typeof e=="string"?e.trim():""}function en(e,t="New tab"){return typeof e=="string"&&e.trim()?e:t}function ic(e,t=""){let n=[];if(Array.isArray(e))for(let i of e){let r=Je(i);r&&n[n.length-1]!==r&&n.push(r)}let s=Je(t);return n.length===0&&s&&n.push(s),n.slice(-_m)}function xi(e,t){if(!Array.isArray(e)||e.length===0)return-1;let n=Number.isInteger(t)?t:e.length-1;return Math.max(0,Math.min(n,e.length-1))}function rc(e,t,n){let s=Je(n),i=ic(e),r=xi(i,t),a=r>=0?i.slice(0,r+1):[];s&&a[a.length-1]!==s&&a.push(s);let l=Math.max(0,a.length-_m),u=a.slice(l);return{history:u,histIdx:u.length?u.length-1:-1}}function As(e){if(!e||typeof e!="object")return null;let t=Je(e.url),n=ic(e.history,t),s=xi(n,e.histIdx);if(t&&(s<0||n[s]!==t)){let a=rc(n,s,t);n=a.history,s=a.histIdx}let i=s>=0?n[s]:t,r=Je(e.displayUrl)||i||t;return!i&&!r&&n.length===0?null:{url:i||t,displayUrl:r,title:en(e.title,i||"New tab"),history:n,histIdx:s,pinned:!!e.pinned}}function Sm(e,t){return{...As(e)||{url:"",displayUrl:"",title:en(e?.title),history:[],histIdx:-1,pinned:!!e?.pinned},active:e?.id===t}}function ac(e){if(!e||typeof e!="object")return null;let t=As(e)||{url:"",displayUrl:"",title:en(e.title),history:[],histIdx:-1,pinned:!!e.pinned};return ha(t.url,t)}function Gy(e){return typeof e=="string"?{url:Je(e),title:""}:!e||typeof e!="object"?{url:"",title:""}:{url:Je(e.url),title:en(e.title,"")}}function Em(e,t=[]){let n=[],s=new Set,i=a=>{if(!a)return;let l=Je(a.url||a.displayUrl);l&&s.has(l)||(l&&s.add(l),n.push(a))};for(let a of t){let{url:l,title:u}=Gy(a);(l||u)&&i(ha(l,u?{title:u}:{}))}let r=Array.isArray(e)?e.map(a=>({saved:a,tab:ac(a)})).filter(a=>a.tab&&(a.tab.url||a.tab.displayUrl)):[];for(let a of r)i(a.tab);if(n.length===0&&r.length>0)for(let a of r)i(a.tab);return{tabs:n,activeId:n[0]?.id||""}}function lc(e){return[...e.filter(t=>t.pinned),...e.filter(t=>!t.pinned)]}function sc(e){let t=Je(e);if(!t)return"";let n=Ts(t);if(n)return n;try{let s=new URL(t);if(s.protocol!=="http:")return"";let i=s.pathname.match(/^\/(?:hyper|app)\/([0-9a-f]{64})(?:\/|$)/i);if(!i)return"";let r=i[1].toLowerCase(),a=Fy(s.hostname);return a&&a===r?r:""}catch{return""}}function Di(e){return!e||typeof e!="object"?"":sc(e.url)||sc(e.displayUrl)||sc(e.src)}function Cm(e,t){let n=typeof t=="string"?t.toLowerCase():"";return!/^[0-9a-f]{64}$/.test(n)||!Array.isArray(e)?!1:e.some(s=>Di(s)===n)}function ha(e="",t={}){let n=Array.isArray(t.history)?ic(t.history,e):[],s=xi(n,t.histIdx),i=s>=0?n[s]:"",r=Je(i||e),a=t.kind==="clearnet"||t.kind==="hyper"||t.kind==="loopback"?t.kind:va(r)?"clearnet":"hyper";return{id:qy(),url:r,displayUrl:Je(t.displayUrl)||r,src:null,history:n,histIdx:s,status:"",title:en(t.title),pinned:!!t.pinned,kind:a,clearnetMode:t.clearnetMode||null}}var oc=Object.freeze({maxUrlBytes:2048,maxTitleBytes:512,maxTextBytes:16384}),Vy=new Set(["done","cancelled","error"]),cc=0;function $a(){let e=globalThis.crypto;if(e&&typeof e.randomUUID=="function")return`ask-${e.randomUUID()}`;if(e&&typeof e.getRandomValues=="function"){let t=new Uint32Array(3);return e.getRandomValues(t),`ask-${[...t].map(n=>n.toString(36)).join("-")}`}return cc=cc+1>>>0,`ask-${Date.now().toString(36)}-${cc.toString(36)}`}function wa(e,t,n={}){let s=Wy(n),i=tn(t)?t:{},r=tn(e)?e:null,a=qe(i.id),l=qe(i.url)||qe(i.displayUrl),u=qe(i.title)||l||"Untitled page",o=ga(l,s.maxUrlBytes),h=ga(u,s.maxTitleBytes),g=r?qe(r.tabId):"",v=!!(a&&g&&a!==g),w=r&&tn(r.context)?r.context:null,_=w?Yy(w.selection,w.body):"",N=r&&typeof r.text=="string"?r.text:_,E=!v&&!!r&&typeof N=="string"&&N.length>0,y=ga(E?N:"",s.maxTextBytes),f=r?ga(qe(r.source),80).value:"";return{tabId:a,url:o.value,title:h.value,text:y.value,textBytes:y.bytes,available:!!E,stale:v,truncated:!!(E&&(r.truncated===!0||r.flags?.truncated===!0||y.truncated)),source:f||(E?"browser-page":"unavailable"),provenance:{tabId:"trusted-tab",url:"trusted-tab",title:"trusted-tab",text:E?"context-response":"none"}}}function En(e=""){let t=qe(e);return{streamId:t,status:t?"starting":"idle",text:"",modelProgress:null,stats:null,finishReason:null,error:null}}function Fn(e,t){if(!tn(e)||!tn(t))return e;let n=qe(t.streamId)||qe(t.requestId);if(!e.streamId||!n||n!==e.streamId||Vy.has(e.status))return e;let s=tn(t.event)?t.event:t,i=qe(s.type);if(i==="model-progress"){let r=Qy(s.progress);return Number.isFinite(r)?{...e,status:"loading-model",modelProgress:Math.max(0,Math.min(1,r)),error:null}:e}if(i==="text")return typeof s.delta!="string"||s.delta.length===0?e:{...e,status:"streaming",text:e.text+s.delta,error:null};if(i==="stats")return tn(s.stats)?{...e,stats:{...s.stats}}:e;if(i==="done"){let r=qe(s.finishReason)||"eos";return{...e,status:r==="cancelled"?"cancelled":"done",finishReason:r,error:null}}if(i==="error"){let r=qe(s.message)||"Local AI request failed",a=qe(s.code)||"inference-failed";return{...e,status:"error",finishReason:"error",error:{code:a,message:r}}}return e}function dc(e){let t=qe(e);return t?t.split(/[-_\s]+/).filter(Boolean).map(n=>/^(qvac|qwen|gguf|cpu|gpu)$/i.test(n)?n.toUpperCase():n.charAt(0).toUpperCase()+n.slice(1)).join(" "):"Local model"}function Na(e){if(!Number.isFinite(e)||e<0)return"\u2014";if(e<1024)return`${Math.round(e)} B`;let t=["KB","MB","GB","TB"],n=e,s=-1;do n/=1024,s++;while(n>=1024&&s<t.length-1);let i=n>=100?0:n>=10?1:2;return`${Number(n.toFixed(i))} ${t[s]}`}function Ri(e){let t=typeof e=="string"?e:"",n=t.toLowerCase(),s=n.lastIndexOf("<think>"),i=n.lastIndexOf("</think>");return s>i&&(t=t.slice(0,s)),t.replace(/<think>[\s\S]*?<\/think>/gi,"").replace(/<\/?think>/gi,"").trim()}function Wy(e){let t=tn(e)?e:{};return{maxUrlBytes:uc(t.maxUrlBytes,oc.maxUrlBytes),maxTitleBytes:uc(t.maxTitleBytes,oc.maxTitleBytes),maxTextBytes:uc(t.maxTextBytes,oc.maxTextBytes)}}function uc(e,t){return!Number.isFinite(e)||e<0?t:Math.floor(e)}function ga(e,t){let n=typeof e=="string"?e:"",s=0,i=0;for(let r of n){let a=jy(r.codePointAt(0));if(s+a>t)break;s+=a,i+=r.length}return{value:n.slice(0,i),bytes:s,truncated:i<n.length}}function jy(e){return e<=127?1:e<=2047?2:e<=65535?3:4}function qe(e){return typeof e=="string"?e.trim():""}function Yy(e,t){let n=qe(e),s=qe(t);return n&&s?`Selected text:
${n}

Page text:
${s}`:n?`Selected text:
${n}`:s}function Qy(e){if(Number.isFinite(e))return e;if(!tn(e))return NaN;let t=Number(e.percentage);if(Number.isFinite(t))return t>1?t/100:t;let n=Number(e.completed??e.downloaded),s=Number(e.total);return Number.isFinite(n)&&Number.isFinite(s)&&s>0?n/s:NaN}function tn(e){return!!e&&typeof e=="object"&&!Array.isArray(e)}function pc(e){let t=Ii(e)?e:null,n=t&&Array.isArray(t.models)?t.models.filter(Ii).map(Jy).filter(i=>i.alias):[],s=n.filter(i=>i.installed);return!t||t.available!==!0||n.length===0?{available:!1,reason:Nt(t?.reason)||(t&&n.length===0&&t.available===!0?"no-models":"")||(t?"runtime-unavailable":"no-capabilities"),busy:!1,queueDepth:0,modelCount:n.length,loadedCount:0,models:n}:{available:!0,reason:"",busy:t.busy===!0,queueDepth:Number.isFinite(t.queueDepth)?Math.max(0,t.queueDepth):0,modelCount:n.length,loadedCount:s.length,models:n}}function Tm(e,t=""){let n=Array.isArray(e)?e.filter(Ii):[],s=Nt(t);if(s&&n.some(r=>r.alias===s))return s;let i=n.find(r=>r.recommended===!0)||n.find(r=>r.provider==="ollama")||n[0];return Nt(i?.alias)}function mc(e){let t=Ii(e)?e:pc(null);if(!t.available){let s=Nt(t.reason);return s?`Local AI unavailable \xB7 ${s}`:"Local AI unavailable"}let n=t.modelCount===1?"1 local model":`${t.modelCount} local models`;return t.busy||t.queueDepth>0?`${n} \xB7 generating`:t.loadedCount>0?`${n} \xB7 ready in memory`:`${n} \xB7 loads on first use`}function Am({streamId:e,model:t,question:n,history:s}={}){let i=Nt(e),r=Nt(t),a=Nt(n).slice(0,2e3);if(!i)throw new Error("A quick ask requires a stream id");if(!r)throw new Error("A quick ask requires a browser-approved model alias");if(!a)throw new Error("A quick ask requires a non-empty question");return{streamId:i,model:r,question:a,history:Xy(s),page:{},maxTokens:192,temperature:.3}}function Xy(e){return Array.isArray(e)?e.filter(t=>Ii(t)&&(t.role==="user"||t.role==="assistant")).map(t=>({role:t.role,content:Nt(t.content)})).filter(t=>t.content).slice(-6):[]}function Jy(e){return{alias:Nt(e.alias),label:Nt(e.label),provider:Nt(e.provider),installed:e.installed===!0,recommended:e.recommended===!0,expectedSize:Number.isFinite(e.expectedSize)?e.expectedSize:void 0,quantization:Nt(e.quantization)}}function Nt(e){return typeof e=="string"?e.trim():""}function Ii(e){return!!e&&typeof e=="object"&&!Array.isArray(e)}var ba=Object.freeze({name:"DuckDuckGo",origin:"https://duckduckgo.com/"});function Zy(e){return String(e||"").normalize("NFKC").trim().replace(/\s+/gu," ").slice(0,2048)}function xm(e){let t=Zy(e);if(!t)return null;let n=new URL(ba.origin);return n.searchParams.set("q",t),n.toString()}function qn(e,t){if(typeof e!="string"||!/^[0-9]+$/.test(e))return String(e??"");if(!Number.isSafeInteger(t)||t<0)return e;if(t===0)return e.replace(/^0+(?=\d)/,"");let n=e.padStart(t+1,"0"),s=n.slice(0,-t).replace(/^0+(?=\d)/,""),i=n.slice(-t).replace(/0+$/,"");return i?`${s}.${i}`:s}function ka(e){return!e||typeof e!="string"?"":e.length<=14?e:e.slice(0,6)+"\u2026"+e.slice(-4)}function Dm(e){if(typeof e!="string")return null;let t=e.trim().toLowerCase().split(/\s+/).filter(Boolean);return t.length!==12&&t.length!==24?null:t}var xs="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",eh=(()=>{let e=new Map;for(let t=0;t<xs.length;t++)e.set(xs[t],t);return e})();function th(e){return new TextEncoder().encode(e)}function nh(e){return new TextDecoder().decode(e)}function sh(e){let t="";for(let n=0;n<e.length;n+=3){let s=e[n],i=n+1<e.length?e[n+1]:null,r=n+2<e.length?e[n+2]:null;t+=xs[s>>2],t+=xs[(s&3)<<4|(i===null?0:i>>4)],t+=i===null?"=":xs[(i&15)<<2|(r===null?0:r>>6)],t+=r===null?"=":xs[r&63]}return t}function ih(e){if(typeof e!="string")return null;let t=e.replace(/=+$/,"");if(!/^[A-Za-z0-9+/]*$/.test(t))return null;let n=[],s=0,i=0;for(let r of t)s=s<<6|eh.get(r),i+=6,i>=8&&(i-=8,n.push(s>>i&255));return new Uint8Array(n)}function Rm(e){return sh(th(e))}function Im(e){let t=ih(e);return t===null?null:nh(t)}function Dt(e){let t=typeof e=="string"?e:String(e?.message||e||""),n=t.toLowerCase();return n.includes("bad-passphrase")||n.includes("passphrase is incorrect")?"Wrong passphrase \u2014 check it and try again.":n.includes("wallet-exists")||n.includes("vault already exists")?"A wallet already exists on this device. Unlock it, or reset app data to start over.":n.includes("wallet-locked")||n.includes("wallet is locked")?"The wallet is locked \u2014 unlock it first.":n.includes("lock the wallet before starting a backup")?"Lock the wallet before starting a backup.":n.includes("rate-limited")||n.includes("rate limit")?"Rate limited \u2014 wait a moment and try again.":n.includes("prompt-expired")?"That approval prompt expired \u2014 try the action again.":n.includes("at least 12")?"The passphrase must be at least 12 characters long.":n.includes("bad-request")||n.includes("24 words")||n.includes("invalid mnemonic")||n.includes("checksum")?"That recovery phrase isn't valid \u2014 check each word and its order, and enter the full 24-word phrase.":n.includes("vault-corrupt")||n.includes("corrupt or tampered")?"The wallet vault is corrupt or tampered. Reset app data, then restore from your recovery phrase.":n.includes("restart required")||n.includes("recovery-required")?"The wallet engine hit an internal fault \u2014 restart PearBrowser, then try again.":n.includes("wallet-busy")?"The wallet is busy with another operation \u2014 wait a moment and try again.":n.includes("insufficient-funds")?"Insufficient balance to cover this payment and its network fee.":n.includes("ceremony-active")?"A recovery-phrase reveal is already open \u2014 finish or cancel it first.":n.includes("ceremony-failed")||n.includes("initialization-failed")||n.includes("operation-failed")?"The wallet operation failed \u2014 please try again. If you were importing, double-check every word of the recovery phrase.":n.includes("not-authorized")?"That action is not authorized for this app.":n.includes("not-found")||n.includes("not available")||n.includes("vault is absent")?"The wallet is not available yet \u2014 the worklet may still be booting. Try again in a moment.":n.includes("not-implemented")||n.includes("not implemented")?"This wallet feature is not implemented in this build.":t||"Something went wrong."}var Li=12;function rh(e){return typeof e!="string"?0:Array.from(e).length}function Gn(e){return rh(e)>=Li}function Lm(e){if(typeof e!="string"||e.length===0)return{score:0,label:"",hint:"Use 12+ characters \u2014 a short sentence works well."};let t=0;return e.length>=8&&t++,e.length>=12&&t++,e.length>=16&&t++,/[a-z]/.test(e)&&/[A-Z]/.test(e)&&t++,/[0-9]/.test(e)&&t++,/[^a-zA-Z0-9\s]/.test(e)&&t++,/^[a-z]+$/.test(e)&&e.length<12&&(t=Math.min(t,1)),t<=2?{score:t,label:"weak",hint:"Too easy to guess \u2014 make it longer and mix words, digits, symbols."}:t<=4?{score:t,label:"fair",hint:"Okay \u2014 longer is better. Losing this passphrase loses the wallet."}:{score:t,label:"strong",hint:"Strong. Store it safely \u2014 there is no reset."}}function Pm(e){if(!e||typeof e!="object")return"";switch(e.type){case"intent":return e.intentType==="payment"?"Payment requested":e.intentType==="sign-app"?"App signature requested":"Request";case"prompt":return"Approval prompt opened";case"approval":return"Approved";case"rejection":return"Rejected";case"broadcast":return"Broadcast to network";case"outcome":return{submitted:"Payment submitted",expired:"Prompt expired",cancelled:"Cancelled",error:"Failed"}[e.state]||(e.state?`Outcome: ${e.state}`:"Outcome");case"connect":return"App connected";case"disconnect":return"App disconnected";case"sign-app":return"App payload signed";default:return e.type}}function Ui(e){try{navigator.clipboard?.writeText(e)}catch{}}var Mm="appearanceTheme",Fm="pearbrowser.appearanceTheme",ah=new Set(["light","dark"]);function qm(e){return ah.has(e)?e:"light"}function hc(){try{return qm(localStorage.getItem(Fm))}catch{return"light"}}function _a(e){let t=qm(e);try{document.documentElement.dataset.theme=t,document.documentElement.style.colorScheme=t,localStorage.setItem(Fm,t)}catch{}return t}_a(hc());var lh=[{id:"keet",name:"Keet",nativeDelivery:{status:"migration-required"},tagline:"End-to-end encrypted P2P chat, voice, and video calls by Holepunch.",legacyMigrationId:"oeeoz3w6fjjt7bym3ndpa6hhicm8f8naxyk11z4iypeoupn6jzpo",initial:"K",gradient:"linear-gradient(135deg, #fbbf24, #f97316)"},{id:"pearpass",name:"PearPass",nativeDelivery:{status:"migration-required"},tagline:"Peer-to-peer password manager from Tether \u2014 synced across devices without a cloud.",legacyMigrationId:"tywsat7gz8m65ejx4zjn3773pbdc4j8m66tukis8dgzekraymtzo",initial:"P",gradient:"linear-gradient(135deg, #3fb950, #58a6ff)"},{id:"anongpt",name:"anonGPT",nativeDelivery:{status:"migration-required"},tagline:"Private P2P AI chat \u2014 pay-per-inference from a HiveMind seller, with signed receipts.",legacyMigrationId:"rpzh3fsgg38kfir9nmae7x3o8ubofddzzixr5js4mxd6a6drb6wo",initial:"A",gradient:"linear-gradient(135deg, #22d3ee, #6366f1)"},{id:"pearpaste",name:"Paste",nativeDelivery:{status:"migration-required"},tagline:"Local-first, end-to-end encrypted notes & clipboard sync for your own devices \u2014 no account, no cloud.",legacyMigrationId:"qnax5k8ojtod51ci9qwkrawdof1hx5w3a7gqbueoqnzzq9dw5hfo",initial:"\u{1F4CB}",gradient:"linear-gradient(135deg, #4ade80, #22d3ee)"},{id:"peercord",name:"Peercord",nativeDelivery:{status:"migration-required"},tagline:"Decentralized Discord-style chat with text, voice, video, screen sharing, and P2P file transfer.",legacyMigrationId:"wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy",initial:"P",gradient:"linear-gradient(135deg, #5865f2, #22d3ee)"}],oh={browse:{label:"Browse"},apps:{label:"Apps"},sites:{label:"P2P Sites"},library:{label:"Library"},settings:{label:"Settings"}},Gm="hyper://03f0060a35451cfb6b68ad1dda1b8474ebb43fd9100071ccf7d67679a83ebb4f/",Vm="ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4",ch="hyper://"+Vm+"/",uh="ac1977a75cc84b46af0af8bb559cd4ebbe10507eb0f51d863e289d09635f6d74",Wm="hyper://"+uh+"/",gc=[{url:"",title:"PearBrowser Home"},{url:Gm,title:"PearBrowser"},{url:Wm,title:"P2P Builders"},{url:ch,title:"peerit"}],fc=new Map(gc.map(e=>[e.url,e.title]));function jm(e){let t=Je(e).replace(/#.*$/,"");if(!t)return"";if(fc.has(t))return fc.get(t);try{let n=new URL(t);return n.protocol!=="hyper:"||!n.hostname?"":fc.get(`hyper://${n.hostname}/`)||""}catch{return""}}function dh(e){let t=String(e||"").replace(/^\/+/,"").split("/").filter(Boolean).pop();if(!t)return"";try{return decodeURIComponent(t)}catch{return t}}function Ea(e){let t=Je(e);if(!t)return"New tab";let n=jm(t);if(n)return n;try{let i=new URL(t);if(i.protocol==="hyper:"&&i.hostname){let r=ge(i.hostname),a=dh(i.pathname);return a?`${r} / ${a}`:r}if(i.hostname)return i.hostname}catch{}let s=t.replace(/^hyper:\/\//i,"");return s.length>40?s.slice(0,37)+"...":s}function ph(e,t){let n=jm(t);if(n)return n;let s=en(e,"").trim();return s&&s!==t&&!/^hyper:\/\//i.test(s)?s:Ea(t)}function Mi(e="",t={}){let n=Je(e);return ha(n,{...t,title:en(t.title,n?Ea(n):"New tab")})}function Ym(e){return en(e?.title,Ea(e?.displayUrl||e?.url||""))}function mh(e){let t=Ym(e),n=e?.displayUrl||e?.url||"";return n&&n!==t?`${t}
${n}`:t}var vc="hyperbee://f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d",Ds="hyperbee://5d961fdc2f56215463e5d4656dd4a3f22bb5e15b93f9bfc8439a63a18f974d75",fh="0c35d12fd9b1115dd2d1fb1cd1751817c9173d3196ac7c62ae37d023340dcb75";function Om(e,t){return e.kind==="sheets"?{cmd:t.CMD_SHEETS_LOAD,payload:{link:e.key},persistRef:`sheets://${e.key}`}:e.kind==="hiveindex"?{cmd:t.CMD_LOAD_CATALOG_INDEX,payload:{link:e.key},persistRef:`hiveindex://${e.key}`}:e.autobee?{cmd:t.CMD_LOAD_CATALOG_AUTOBEE,persistRef:`autobee://${e.key}`}:e.bee?{cmd:t.CMD_LOAD_CATALOG_BEE,persistRef:`hyperbee://${e.key}`}:{cmd:t.CMD_LOAD_CATALOG,persistRef:e.key}}function vh(e){if(!e||typeof e!="string")return null;let t;try{t=new URL(e)}catch{return null}let n=t.protocol.replace(":","");if(n!=="hyper"&&n!=="pear")return null;let s=t.hostname||t.pathname.split("/")[0]||"";if(!s)return null;let i=null,r=null;return/^[0-9a-f]{64}$/i.test(s)?(i=s.toLowerCase(),r=gm(i)):/^[13-9a-km-uw-z]{52}$/i.test(s)&&(r=s.toLowerCase(),i=ma(r)),{proto:n,raw:s,hex:i,z32:r,path:t.pathname||"/",urlStr:e}}function Pi(e,t,n=t+"s"){let s=Number.isFinite(e)?e:0;return`${s} ${s===1?t:n}`}function yh(e,t){if(t)return{tone:"warn",text:`Live metadata unavailable: ${t}`};if(!e)return{tone:"pending",text:"Checking live drive metadata\u2026"};let n=e.relay||{};return n.available?n.advertisedRelays>0?{tone:"ok",text:`Pinned: advertised by ${Pi(n.advertisedRelays,"relay")}.`}:n.seedAcceptances>0&&n.durable?{tone:"ok",text:`Pinned by this client: ${Pi(n.seedAcceptances,"relay")} accepted and ${Pi(n.activePeers,"peer")} is replicating.`}:n.seedAcceptances>0?{tone:"warn",text:`${Pi(n.seedAcceptances,"relay")} accepted the pin request; waiting for a live replication peer.`}:n.connectedRelays>0?{tone:"neutral",text:`No pin signal for this drive from ${Pi(n.connectedRelays,"connected relay")}.`}:{tone:"warn",text:"No HiveRelay connections yet; discovery is currently pure P2P."}:{tone:"warn",text:"HiveRelay client is unavailable; using pure P2P discovery."}}function hh({rpc:e,C:t,url:n,onClose:s,onBookmarkToggle:i}){let r=vh(n),a=r?.hex||"",[l,u]=(0,d.useState)(null),[o,h]=(0,d.useState)(null),[g,v]=(0,d.useState)(""),[w,_]=(0,d.useState)(null),[N,E]=(0,d.useState)({});(0,d.useEffect)(()=>{n&&e.request(t.CMD_USERDATA_LIST_BOOKMARKS).then(x=>{let $=x?.bookmarks||[];u($.some(S=>S&&S.url===n))}).catch(()=>u(!1))},[n,e,t]),(0,d.useEffect)(()=>{if(!a){h(null),v("");return}let x=!1;h(null),v("");let $=async()=>{try{let R=await e.request(t.CMD_GET_DRIVE_INFO,{keyHex:a},1e4);x||(h(R),v(""))}catch(R){x||v(R.message||"unknown error")}};$();let S=setInterval($,5e3);return()=>{x=!0,clearInterval(S)}},[a,e,t]);let y=(x,$)=>{try{navigator.clipboard?.writeText($),E({...N,[x]:!0}),setTimeout(()=>E(S=>({...S,[x]:!1})),1500)}catch{}},f=async()=>{if(!w){_("bookmark");try{l?(await e.request(t.CMD_USERDATA_REMOVE_BOOKMARK,{url:n}),u(!1)):(await e.request(t.CMD_USERDATA_ADD_BOOKMARK,{url:n,title:n}),u(!0)),i?.()}catch{}finally{_(null)}}},p=yh(o,g),k=Number(o?.updatedAt),b=Number.isFinite(k)&&k>0?new Date(k).toLocaleTimeString():"";return c`
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
          <button className="copy-btn-small ${N.url?"copied":""}"
                  onClick=${()=>y("url",n)} disabled=${!n}>
            ${N.url?"\u2713":"Copy"}
          </button>
        </div>

        ${r&&r.hex&&c`
          <div className="about-section-label">DRIVE KEY (hex)</div>
          <div className="about-row">
            <code className="about-mono">${r.hex}</code>
            <button className="copy-btn-small ${N.hex?"copied":""}"
                    onClick=${()=>y("hex",r.hex)}>
              ${N.hex?"\u2713":"Copy"}
            </button>
          </div>
        `}

        ${r&&r.z32&&c`
          <div className="about-section-label">DRIVE KEY (z-base-32)</div>
          <div className="about-row">
            <code className="about-mono">${r.z32}</code>
            <button className="copy-btn-small ${N.z32?"copied":""}"
                    onClick=${()=>y("z32",r.z32)}>
              ${N.z32?"\u2713":"Copy"}
            </button>
          </div>
        `}

        ${r&&c`
          <div className="about-meta-grid">
            <div>
              <div className="about-meta-label">Scheme</div>
              <div className="about-meta-value">${r.proto}://</div>
            </div>
            <div>
              <div className="about-meta-label">Path</div>
              <div className="about-meta-value">${r.path}</div>
            </div>
          </div>
        `}

        ${r&&r.hex&&c`
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
              <div className="about-meta-value">${o?fa(o.byteLength):"\u2026"}</div>
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
            <button className="copy-btn-small ${N.discovery?"copied":""}"
                    onClick=${()=>y("discovery",o.discoveryKey)}>
              ${N.discovery?"\u2713":"Copy"}
            </button>
          </div>
        `}

        <div className="about-section-label">YOUR LIBRARY</div>
        <div className="about-row about-bookmark-row">
          <div>
            ${l===null?c`<span className="settings-subtle">Checking…</span>`:l?c`<span style=${{color:"#ff9500"}}>★ Bookmarked</span>`:c`<span className="settings-subtle">Not in your bookmarks</span>`}
          </div>
          <button className="btn ${l?"subtle":"primary"}"
                  onClick=${f}
                  disabled=${w==="bookmark"||l===null||!n}>
            ${w==="bookmark"?"\u2026":l?"Remove bookmark":"Bookmark this site"}
          </button>
        </div>

        ${o&&c`
          <div className="about-foot">
            ${b?`Updated ${b} \xB7 `:""}
            ${o.relay?.hybridFetchEnabled?"hybrid relay fetch enabled":"pure P2P fetch"}
          </div>
        `}
      </div>
    </div>
  `}var gh=["Summarize this page","What are the key claims?","Explain this simply","What should I verify?"];function $h({rpc:e,C:t,activeTab:n,captureContext:s,onClose:i}){let[r,a]=(0,d.useState)(null),[l,u]=(0,d.useState)(""),[o,h]=(0,d.useState)(""),[g,v]=(0,d.useState)(""),[w,_]=(0,d.useState)([]),[N,E]=(0,d.useState)(()=>En()),[y,f]=(0,d.useState)(""),[p,k]=(0,d.useState)(null),[b,x]=(0,d.useState)(!1),$=(0,d.useRef)(""),S=(0,d.useRef)(""),R=(0,d.useRef)(null),D=(0,d.useRef)(""),H=(0,d.useRef)(null),W=(0,d.useRef)(0),G=(0,d.useRef)(`${n?.id||""}
${n?.url||""}`),F=["starting","loading-model","streaming"].includes(N.status),B=Array.isArray(r?.models)?r.models:[],A=B.find(M=>M.alias===o)||null;(0,d.useEffect)(()=>{let M=!1;return u(""),e.request(t.CMD_ASK_BROWSER_CAPABILITIES).then(K=>{if(M)return;a(K);let V=Array.isArray(K?.models)?K.models:[],T=V.find(L=>L.recommended)||V.find(L=>L.provider==="ollama")||V[0];h(L=>V.some(ie=>ie.alias===L)?L:T?.alias||"")}).catch(K=>{M||u(K.message||"Local AI runtime is unavailable")}),()=>{M=!0}},[e,t]),(0,d.useEffect)(()=>{let M=K=>{let V=K.detail;!V||V.streamId!==$.current||E(T=>Fn(T,V))};return e.addEventListener(`event:${t.EVT_ASK_BROWSER_STREAM}`,M),()=>e.removeEventListener(`event:${t.EVT_ASK_BROWSER_STREAM}`,M)},[e,t]),(0,d.useEffect)(()=>{if(!["done","cancelled","error"].includes(N.status)||!N.streamId||D.current===N.streamId)return;D.current=N.streamId;let K=S.current;K&&_(V=>[...V,{id:N.streamId,question:K,answer:Ri(N.text),error:N.error,finishReason:N.finishReason,stats:N.stats,source:R.current}].slice(-20)),N.status==="done"&&a(V=>V&&{...V,models:(V.models||[]).map(T=>T.alias===o?{...T,installed:!0}:T)}),$.current="",S.current="",f(""),x(!1)},[N]),(0,d.useEffect)(()=>{let M=H.current;M&&(M.scrollTop=M.scrollHeight)},[w,N.text,N.status]),(0,d.useEffect)(()=>{let M=`${n?.id||""}
${n?.url||""}`;if(G.current===M)return;G.current=M,W.current++;let K=$.current;K&&e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:K}).catch(()=>{}),$.current="",S.current="",R.current=null,D.current="",_([]),E(En()),f(""),k(null),x(!1)},[n?.id,n?.url,e,t]),(0,d.useEffect)(()=>()=>{W.current++;let M=$.current;$.current="",M&&e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:M}).catch(()=>{})},[e,t]);let J=async M=>{M?.preventDefault?.();let K=g.trim();if(!K||F||!o)return;let V=$a(),T=++W.current;D.current="",$.current=V,S.current=K,R.current=null,f(K),k(null),x(!1),v(""),E(En(V));try{let L=await s();if(W.current!==T||$.current!==V)return;let ie={tabId:L.tabId,url:L.url,title:L.title,textBytes:L.textBytes,available:L.available,truncated:L.truncated,source:L.source};R.current=ie,k(ie);let $e=w.filter(me=>me.source?.tabId===L.tabId&&me.source?.url===L.url).slice(-3).flatMap(me=>{let mt=[{role:"user",content:me.question}];return me.answer&&mt.push({role:"assistant",content:me.answer}),mt}),ee=await e.request(t.CMD_ASK_BROWSER_START,{streamId:V,model:o,question:K,history:$e,page:L,maxTokens:256,temperature:.2},3e4);if(W.current!==T||$.current!==V){e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:V}).catch(()=>{});return}let j={...ie,...ee?.source||{}};R.current=j,k(j)}catch(L){if(W.current!==T||$.current!==V)return;E(ie=>Fn(ie,{streamId:V,event:{type:"error",code:L?.code||"ask-browser-failed",message:L?.message||"Ask Browser failed"}}))}},P=async()=>{let M=$.current;if(!(!M||b)){W.current++,x(!0),E(K=>Fn(K,{streamId:M,event:{type:"done",finishReason:"cancelled"}}));try{await e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:M})}catch{}}},ne=()=>{if($.current){W.current++;let M=$.current;$.current="",S.current="",f(""),E(En()),x(!1),e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:M}).catch(()=>{})}R.current=null,k(null),_([])},ue=()=>{W.current++;let M=$.current;$.current="",M&&e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:M}).catch(()=>{}),i()},O=Ri(N.text),I=p||w[w.length-1]?.source||{tabId:n?.id||"",url:n?.url||"",title:n?.title||n?.url||"No active page"},Z=b?"Stopping\u2026":N.status==="starting"?"Reading current page\u2026":N.status==="loading-model"?`Loading model${Number.isFinite(N.modelProgress)?` \xB7 ${Math.round(N.modelProgress*100)}%`:"\u2026"}`:N.status==="streaming"?"Generating locally\u2026":"";return c`
    <aside id="ask-browser-panel" className="ask-browser-panel" aria-label="Ask Browser" data-testid="ask-browser-panel">
      <div className="ask-browser-header">
        <div>
          <div className="ask-browser-title">Ask Browser</div>
          <div className="ask-browser-local"><span></span>Local only</div>
        </div>
        <div className="ask-browser-header-actions">
          <button type="button" className="ask-browser-text-button" onClick=${ne} disabled=${w.length===0&&!F}>Clear</button>
          <button type="button" className="ask-browser-close" aria-label="Close Ask Browser" onClick=${ue}>×</button>
        </div>
      </div>

      <div className="ask-browser-model-row">
        <label htmlFor="ask-browser-model">Model</label>
        <select id="ask-browser-model" data-testid="ask-browser-model" value=${o} disabled=${F||B.length===0}
          onChange=${M=>h(M.target.value)}>
          ${B.map(M=>c`<option key=${M.alias} value=${M.alias}>${M.label||dc(M.alias)}${M.expectedSize?` \xB7 ${Na(M.expectedSize)}`:""}</option>`)}
        </select>
        ${A&&c`<div className="ask-browser-model-meta">${A.provider||"local"}${A.quantization?` \xB7 ${A.quantization}`:""}${A.installed?" \xB7 loaded":" \xB7 loads on first use"}</div>`}
      </div>

      <div className="ask-browser-source" title=${I.url||""}>
        <div className="ask-browser-source-kicker">Source [1] · current tab</div>
        <div className="ask-browser-source-title">${I.title||I.url||"No active page"}</div>
        <div className="ask-browser-source-url">${I.url||"Open a page to add context"}</div>
        ${p&&c`<div className="ask-browser-source-meta">${p.available||p.hasText?`${Na(p.textBytes||0)} captured`:"Metadata only"}${p.truncated?" \xB7 truncated":""}</div>`}
      </div>

      <div className="ask-browser-transcript" ref=${H}>
        ${w.length===0&&!y&&c`
          <div className="ask-browser-empty">
            <div className="ask-browser-spark">✦</div>
            <div className="ask-browser-empty-title">Ask about what you’re viewing</div>
            <div className="ask-browser-empty-copy">Page context stays on this device and is sent only to the selected local model.</div>
            <div className="ask-browser-quick-grid">
              ${gh.map(M=>c`<button type="button" key=${M} onClick=${()=>v(M)}>${M}</button>`)}
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
              ${O||c`<span className="ask-browser-thinking">${Z||"Thinking locally\u2026"}</span>`}
            </div>
          </div>
        `}
      </div>

      <form className="ask-browser-composer" onSubmit=${J}>
        <div className="ask-browser-live-status" role="status" aria-live="polite">${Z}</div>
        ${l&&c`<div className="ask-browser-error">${l}</div>`}
        ${r&&r.available===!1&&c`<div className="ask-browser-error">${r.reason||"Local AI runtime is unavailable"}</div>`}
        <textarea data-testid="ask-browser-input" value=${g}
          aria-label="Question about the current page"
          onInput=${M=>v(M.target.value)}
          onKeyDown=${M=>{M.key==="Enter"&&(M.metaKey||M.ctrlKey)&&J(M)}}
          placeholder="Ask about this page…" rows="3" disabled=${F||!r?.available}></textarea>
        <div className="ask-browser-compose-row">
          <span>⌘↵ to send</span>
          ${F?c`<button type="button" className="ask-browser-stop" data-testid="ask-browser-stop" onClick=${P} disabled=${b}>${b?"Stopping\u2026":"Stop"}</button>`:c`<button type="submit" className="ask-browser-send" data-testid="ask-browser-send" disabled=${!g.trim()||!o||!r?.available}>Ask</button>`}
        </div>
      </form>
    </aside>
  `}var wh=["What is the peer-to-peer web?","Summarize what a Hyperdrive is","Draft a short intro post for peerit"];function Nh({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[i,r]=(0,d.useState)(""),[a,l]=(0,d.useState)(""),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)([]),[v,w]=(0,d.useState)(()=>En()),[_,N]=(0,d.useState)(""),[E,y]=(0,d.useState)(!1),f=(0,d.useRef)(""),p=(0,d.useRef)(""),k=(0,d.useRef)(""),b=(0,d.useRef)(null),x=(0,d.useMemo)(()=>pc(n),[n]),$=["starting","loading-model","streaming"].includes(v.status),S=x.models,R=S.find(B=>B.alias===a)||null;(0,d.useEffect)(()=>{let B=!1;return r(""),e.request(t.CMD_ASK_BROWSER_CAPABILITIES).then(A=>{if(B)return;s(A);let J=Array.isArray(A?.models)?A.models:[];l(P=>Tm(J,P))}).catch(A=>{B||r(A.message||"Local AI runtime is unavailable")}),()=>{B=!0}},[e,t]),(0,d.useEffect)(()=>{let B=A=>{let J=A.detail;!J||J.streamId!==f.current||w(P=>Fn(P,J))};return e.addEventListener(`event:${t.EVT_ASK_BROWSER_STREAM}`,B),()=>e.removeEventListener(`event:${t.EVT_ASK_BROWSER_STREAM}`,B)},[e,t]),(0,d.useEffect)(()=>{if(!["done","cancelled","error"].includes(v.status)||!v.streamId||k.current===v.streamId)return;k.current=v.streamId;let A=p.current;A&&g(J=>[...J,{id:v.streamId,question:A,answer:Ri(v.text),error:v.error,finishReason:v.finishReason,stats:v.stats}].slice(-8)),v.status==="done"&&s(J=>J&&{...J,models:(J.models||[]).map(P=>P.alias===a?{...P,installed:!0}:P)}),f.current="",p.current="",N(""),y(!1)},[v]),(0,d.useEffect)(()=>{let B=b.current;B&&(B.scrollTop=B.scrollHeight)},[h,v.text,v.status]),(0,d.useEffect)(()=>()=>{let B=f.current;f.current="",B&&e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:B}).catch(()=>{})},[e,t]);let D=async B=>{B?.preventDefault?.();let A=u.trim();if(!A||$||!a)return;let J=$a();k.current="",f.current=J,p.current=A,N(A),y(!1),o(""),w(En(J));try{let P=h.slice(-3).flatMap(ne=>{let ue=[{role:"user",content:ne.question}];return ne.answer&&ue.push({role:"assistant",content:ne.answer}),ue});await e.request(t.CMD_ASK_BROWSER_START,Am({streamId:J,model:a,question:A,history:P}),3e4)}catch(P){if(f.current!==J)return;w(ne=>Fn(ne,{streamId:J,event:{type:"error",code:P?.code||"quick-ask-failed",message:P?.message||"Local AI request failed"}}))}},H=async()=>{let B=f.current;if(!(!B||E)){y(!0),w(A=>Fn(A,{streamId:B,event:{type:"done",finishReason:"cancelled"}}));try{await e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:B})}catch{}}},W=()=>{let B=f.current;f.current="",p.current="",B&&e.request(t.CMD_ASK_BROWSER_CANCEL,{streamId:B}).catch(()=>{}),g([]),w(En()),N(""),y(!1)},G=Ri(v.text),F=E?"Stopping\u2026":v.status==="starting"?"Starting locally\u2026":v.status==="loading-model"?`Loading model${Number.isFinite(v.modelProgress)?` \xB7 ${Math.round(v.modelProgress*100)}%`:"\u2026"}`:v.status==="streaming"?"Generating locally\u2026":"";return i||n&&!x.available?c`
      <section className="qvac-widget unavailable" data-testid="qvac-widget" aria-label="Local AI">
        <div className="qvac-widget-header">
          <span className="qvac-widget-spark">✦</span>
          <span className="qvac-widget-title">Local AI</span>
          <span className="qvac-widget-badge">QVAC · on-device</span>
        </div>
        <div className="qvac-widget-status" data-testid="qvac-widget-status">
          ${i||mc(x)}
        </div>
      </section>
    `:n?c`
    <section className="qvac-widget" data-testid="qvac-widget" aria-label="Local AI">
      <div className="qvac-widget-header">
        <span className="qvac-widget-spark">✦</span>
        <span className="qvac-widget-title">Local AI</span>
        <span className="qvac-widget-badge">QVAC · on-device</span>
        <span className="qvac-widget-header-space"></span>
        ${(h.length>0||$)&&c`<button type="button" className="qvac-widget-text-button" onClick=${W}>Clear</button>`}
      </div>
      <div className="qvac-widget-status" data-testid="qvac-widget-status">${mc(x)}</div>

      ${(h.length>0||_)&&c`
        <div className="qvac-widget-transcript" ref=${b} data-testid="qvac-widget-transcript">
          ${h.map(B=>c`
            <div className="qvac-widget-turn" key=${B.id}>
              <div className="qvac-widget-question">${B.question}</div>
              <div className=${`qvac-widget-answer${B.error?" error":""}`}>
                ${B.error?B.error.message:B.answer||(B.finishReason==="cancelled"?"Stopped.":"No answer returned.")}
              </div>
              ${B.stats&&c`<div className="qvac-widget-stats">${Number.isFinite(B.stats.tokensPerSecond)?`${B.stats.tokensPerSecond.toFixed(1)} tok/s`:""}${B.stats.backendDevice?` \xB7 ${B.stats.backendDevice}`:""}</div>`}
            </div>
          `)}
          ${_&&c`
            <div className="qvac-widget-turn active">
              <div className="qvac-widget-question">${_}</div>
              <div className="qvac-widget-answer">
                ${G||c`<span className="qvac-widget-thinking">${F||"Thinking locally\u2026"}</span>`}
              </div>
            </div>
          `}
        </div>
      `}

      ${h.length===0&&!_&&c`
        <div className="qvac-widget-quick-grid">
          ${wh.map(B=>c`<button type="button" key=${B} onClick=${()=>o(B)}>${B}</button>`)}
        </div>
      `}

      <form className="qvac-widget-composer" onSubmit=${D}>
        <input
          type="text"
          data-testid="qvac-widget-input"
          value=${u}
          aria-label="Ask the local model"
          onInput=${B=>o(B.target.value)}
          placeholder="Ask anything — answered on this device…"
          disabled=${$}
        />
        ${$?c`<button type="button" className="qvac-widget-stop" data-testid="qvac-widget-stop" onClick=${H} disabled=${E}>${E?"\u2026":"Stop"}</button>`:c`<button type="submit" className="qvac-widget-send" data-testid="qvac-widget-send" disabled=${!u.trim()||!a}>Ask</button>`}
      </form>

      <div className="qvac-widget-footer">
        <select
          className="qvac-widget-model"
          data-testid="qvac-widget-model"
          value=${a}
          disabled=${$||S.length===0}
          aria-label="Local model"
          onChange=${B=>l(B.target.value)}>
          ${S.map(B=>c`<option key=${B.alias} value=${B.alias}>${B.label||dc(B.alias)}</option>`)}
        </select>
        ${R&&c`<span className="qvac-widget-model-meta">${R.installed?"ready":R.expectedSize?`${Na(R.expectedSize)} \xB7 loads on first use`:"loads on first use"}</span>`}
        <span className="qvac-widget-live" role="status" aria-live="polite">${F}</span>
      </div>
    </section>
  `:null}function bh({rpc:e,C:t,navUrl:n,onNavigated:s,tabs:i,setTabs:r,activeId:a,setActiveId:l,closedTabs:u,setClosedTabs:o,sessionReady:h,onOpenSettings:g}){let v=(0,d.useRef)(null),w=(0,d.useRef)({}),_=(0,d.useRef)({}),N=(0,d.useRef)(a),E=(0,d.useRef)(new Set),[y,f]=(0,d.useState)(""),[p,k]=(0,d.useState)(""),[b,x]=(0,d.useState)(!1),[$,S]=(0,d.useState)(!1),[R,D]=(0,d.useState)([]),[H,W]=(0,d.useState)(!1),[G,F]=(0,d.useState)(-1),B=(0,d.useRef)(0),A=i.find(C=>C.id===a)||i[0];N.current=a;let J=async()=>{let C=i.find(Te=>Te.id===N.current)||A;if(!C)return wa(null,{});let U=w.current[C.id],Y=U?.contentWindow,se=_.current[C.id]||0,ae=()=>{let Te="";try{Te=U?.contentDocument?.body?.innerText||""}catch{}return wa({tabId:C.id,text:Te,source:Te?"renderer-dom":"metadata"},C,{maxTextBytes:5*1024})};if(!Y||!C.contextToken||typeof MessageChannel>"u")return ae();let te;try{te=new URL(C.src).origin}catch{return ae()}let le=$a(),pe=new MessageChannel;return await new Promise((Te,zt)=>{let Ge=!1,Ht=()=>N.current===C.id&&w.current[C.id]?.contentWindow===Y&&(_.current[C.id]||0)===se,we=(Ve,We)=>{if(!Ge){Ge=!0,clearTimeout(bt);try{pe.port1.close()}catch{}Ve?zt(Ve):Te(We)}},at=()=>{if(!Ht()){we(new Error("The active tab changed while Ask Browser was reading it"));return}we(null,ae())},bt=setTimeout(at,1500);pe.port1.onmessage=Ve=>{let We=Ve.data;if(!(!We||We.type!=="pearbrowser:context-response"||We.v!==1||We.requestId!==le)){if(!Ht()){we(new Error("The active tab changed while Ask Browser was reading it"));return}we(null,wa({...We,tabId:C.id,source:"authenticated-page-context"},C,{maxTextBytes:5*1024}))}},pe.port1.start?.();try{Y.postMessage({type:"pearbrowser:context-request",v:1,requestId:le,contextToken:C.contextToken},te,[pe.port2])}catch{at()}})};(0,d.useEffect)(()=>{a==="placeholder"&&i.length>0&&l(i[0].id)},[a,i]);let P=(C,U)=>r(Y=>Y.map(se=>se.id===C?{...se,...U}:se)),ne=C=>{l(C);let U=i.find(Y=>Y.id===C);U&&f(U.displayUrl||"")},ue=(C,U)=>{t.CMD_RELEASE_ORIGIN&&(!C||Cm(U,C)||e.request(t.CMD_RELEASE_ORIGIN,{keyHex:C}).catch(()=>{}))},[O,I]=(0,d.useState)(!1),[Z,M]=(0,d.useState)(!1);(0,d.useEffect)(()=>{let C=!1;return e.request(t.CMD_USERDATA_GET_SETTINGS).then(U=>{if(C)return;let Y=Rt(U)||{};I(Y.historyEnabled===!0),M(Y.searchIndexEnabled===!0)}).catch(()=>{}),()=>{C=!0}},[e,t]),(0,d.useEffect)(()=>{A&&f(A.displayUrl||"")},[A?.id,A?.displayUrl]);let K=async(C,U,Y={})=>{let se=U||a,ae=Y.recordHistory!==!1,te=O&&(Y.rememberVisit??ae),le=null,pe=null,Te=String(C??"").trim(),Ge=(/^pearname:\/\//i.test(Te)?Nm(Te):null)||($m(Te)?Te:null);if(Ge)try{let{resolved:we}=await e.request(t.CMD_NAME_RESOLVE,{name:Ge});if(we?.legacyMigrationId){P(se,{status:`migration required for ${we.label||Ge} \xB7 ${we.provenance}\u2026`});try{let at=await e.request(t.CMD_LEGACY_APP_MIGRATION,{legacyMigrationId:we.legacyMigrationId},1e4);P(se,{status:at?.message||"A verified native v3 package is required."})}catch(at){P(se,{status:`error: ${at.message}`})}return}we&&(we.link||we.key)&&(le=we.link||`hyper://${we.key}/`,pe={provenance:we.provenance,label:we.label||Ge,name:Ge,source:we.source||null})}catch{}if(le||(le=Zo(C)),!le)return;let Ht=pe?pe.label:Ea(le);P(se,{status:`resolving ${Ht}\u2026`,displayUrl:le,title:Ht});try{let we=i.find(We=>We.id===se),at=Di(we),bt=Ts(le),Ve=await e.request(t.CMD_NAVIGATE,{url:le});r(We=>We.map(Ue=>{if(Ue.id!==se)return Ue;let nn=Array.isArray(Ue.history)?Ue.history:[],jn=Number.isInteger(Ue.histIdx)?Ue.histIdx:-1;if(ae){let Ls=rc(nn,jn,le);nn=Ls.history,jn=Ls.histIdx}else Number.isInteger(Y.historyIndex)&&(jn=xi(nn,Y.historyIndex));let Yn=Ve.kind||(va(Ve.url||le)?"clearnet":"hyper"),Qn=Ve.url||le;return{...Ue,src:Ve.localUrl,status:"",history:nn,histIdx:jn,url:Qn,displayUrl:Qn,title:Ht,nameProv:pe,contextToken:Ve.contextToken||null,kind:Yn,clearnetMode:Ve.mode||null,shieldActive:Ve.shieldActive!==!1&&Yn!=="clearnet"?!0:!!Ve.shieldActive}})),at&&at!==bt&&ue(at,i.filter(We=>We.id!==se)),te&&e.request(t.CMD_USERDATA_ADD_HISTORY,{url:le,title:Ht}).catch(()=>{})}catch(we){P(se,{status:`error: ${we.message}`})}},V=(C,U)=>{try{if(!Z)return;let Y=C&&(C.url||C.displayUrl)||"";if(!/^hyper:\/\//i.test(Y))return;let se=Y.replace(/^hyper:\/\//i,""),ae=se.indexOf("/"),te=ae>=0?se.slice(0,ae):se,le=ae>=0?se.slice(ae):"/",pe="",Te="";try{let Ge=U&&U.contentDocument;Ge&&(pe=Ge.title||"",Te=(Ge.body&&Ge.body.innerText||"").slice(0,2e5))}catch{}let zt=ph(pe,Y);zt&&zt!==C.title&&P(C.id,{title:zt}),e.request(t.CMD_SEARCH_INDEX,{driveKey:te,path:le,title:pe||Y,text:Te}).catch(()=>{})}catch{}},T=async()=>{let C=Zo(y);if(C)try{await e.request(t.CMD_USERDATA_ADD_BOOKMARK,{url:C,title:C}),P(a,{status:`bookmarked ${C}`}),setTimeout(()=>P(a,{status:""}),1500)}catch(U){P(a,{status:`bookmark failed: ${U.message}`})}},L=()=>{let C=A?.history||[];if(!A||A.histIdx<=0)return;let U=A.histIdx-1,Y=C[U];K(Y,A.id,{recordHistory:!1,rememberVisit:!1,historyIndex:U})},ie=()=>{let C=A?.history||[];if(!A||A.histIdx>=C.length-1)return;let U=A.histIdx+1,Y=C[U];K(Y,A.id,{recordHistory:!1,rememberVisit:!1,historyIndex:U})},$e=()=>{let C=w.current[a];C&&C.src&&(C.src=C.src)},ee=(C="")=>{let U=Mi(C);r(Y=>[...Y,U]),l(U.id),f(C||"")},j=C=>{C?.preventDefault?.();let U=xm(p);U&&(k(""),K(U,a,{rememberVisit:!1}))},me=C=>{let U=i.find(te=>te.id===C),Y=As(U);Y&&o(te=>[Y,...te].slice(0,ya));let se=i.findIndex(te=>te.id===C);if(se===-1)return;let ae=i.filter(te=>te.id!==C);if(ue(Di(U),ae),delete w.current[C],delete _.current[C],ae.length===0){let te=Mi("");r([te]),l(te.id),f("");return}if(r(ae),C===a){let te=ae[Math.min(se,ae.length-1)];l(te.id),f(te.displayUrl||"")}},mt=()=>{let C=u[0];if(!C)return;let U=ac(C);U&&(o(Y=>Y.slice(1)),r(Y=>lc([...Y,U])),l(U.id),f(U.displayUrl||""))},Rs=C=>{r(U=>lc(U.map(Y=>Y.id===C?{...Y,pinned:!Y.pinned}:Y)))},Wn=()=>{try{if(!w.current[a]?.contentWindow)return;if(globalThis.pearbrowserRuntime?.openDevTools){globalThis.pearbrowserRuntime.openDevTools();return}console.log("[devtools] native host does not expose openDevTools"),P(a,{status:"devtools are unavailable in this native build"}),setTimeout(()=>P(a,{status:""}),3e3)}catch(C){console.error("[devtools] failed:",C)}};(0,d.useEffect)(()=>{let C=U=>{if(U.metaKey||U.ctrlKey){if(U.key==="t"||U.key==="T")U.preventDefault(),U.shiftKey?mt():ee();else if(U.key==="w"||U.key==="W")U.preventDefault(),me(a);else if(U.key==="l"||U.key==="L")U.preventDefault(),v.current?.focus(),v.current?.select?.();else if(U.key==="r"||U.key==="R")U.preventDefault(),$e();else if((U.key==="i"||U.key==="I")&&(U.shiftKey||U.altKey))U.preventDefault(),Wn();else if(U.key>="1"&&U.key<="9"){let se=parseInt(U.key,10)-1;i[se]&&(U.preventDefault(),ne(i[se].id))}}};return document.addEventListener("keydown",C),()=>document.removeEventListener("keydown",C)},[a,i,u]),(0,d.useEffect)(()=>{let C=U=>{let Y=U.data;if(!Y)return;let se=i.find(te=>w.current[te.id]?.contentWindow===U.source);if(!se)return;if(Y.type==="pearbrowser:clearnet-direct-fallback"){if(se.kind!=="clearnet"||se.clearnetMode!=="proxy")return;let te;try{let le=new URL(se.url||se.displayUrl),pe=new URL(typeof Y.url=="string"?Y.url.trim():""),Te=le.hostname===pe.hostname||le.hostname.endsWith(`.${pe.hostname}`)||pe.hostname.endsWith(`.${le.hostname}`);if(!/^https?:$/.test(pe.protocol)||!Te)return;te=pe.toString()}catch{return}r(le=>le.map(pe=>pe.id===se.id?{...pe,src:te,url:te,displayUrl:te,contextToken:null,clearnetMode:"direct",shieldActive:!1,status:"Publisher blocked the privacy proxy \u2014 loaded direct; Content Shield is unavailable for this tab."}:pe)),se.id===N.current&&f(te);return}if(Y.type!=="pearbrowser:navigate")return;let ae=typeof Y.url=="string"?Y.url.trim():"";if(/^hyper:\/\//i.test(ae)){if(Y.openInNewTab){let te=Mi(ae);r(le=>[...le,te]),l(te.id),f(ae),K(ae,te.id);return}l(se.id),f(ae),K(ae,se.id)}};return window.addEventListener("message",C),()=>window.removeEventListener("message",C)},[i]),(0,d.useEffect)(()=>{if(h)for(let C of i){if(!C||C.src||!C.url)continue;let U=`${C.id}:${C.url}`;if(E.current.has(U))continue;E.current.add(U);let Y=Array.isArray(C.history)&&C.history.length>0;K(C.url,C.id,{recordHistory:!Y,rememberVisit:!Y,historyIndex:C.histIdx})}},[h,A?.id,i]),(0,d.useEffect)(()=>{if(n){if(A&&(A.src||A.url)){let C=Mi(n);r(U=>[...U,C]),l(C.id),f(n),K(n,C.id)}else K(n,A?.id);s?.()}},[n]);let Le=(0,d.useMemo)(()=>{let C=(y||"").trim().toLowerCase();if(!C)return R.slice(0,8);let U=new Set,Y=[],se=te=>{let le=(te.url||"").toLowerCase(),pe=(te.title||"").toLowerCase();return le.startsWith(C)?0:pe.startsWith(C)?1:le.includes(C)?2:pe.includes(C)?3:99},ae=R.map(te=>({e:te,s:se(te)})).filter(({s:te})=>te<99).sort((te,le)=>te.s-le.s||(te.e.kind==="bookmark"?-1:1));for(let{e:te}of ae)if(!U.has(te.url)&&(U.add(te.url),Y.push(te),Y.length>=8))break;return Y},[y,R]),Is=async()=>{if(!(Date.now()-B.current<3e4&&R.length>0))try{let[C,U]=await Promise.all([e.request(t.CMD_USERDATA_LIST_BOOKMARKS).catch(()=>({})),e.request(t.CMD_USERDATA_LIST_HISTORY,{limit:100}).catch(()=>({}))]),Y=(C&&C.bookmarks||[]).map(ae=>({kind:"bookmark",url:ae.url,title:ae.title||ae.url})),se=(U&&U.history||[]).map(ae=>({kind:"history",url:ae.url,title:ae.title||ae.url}));D([...Y,...se]),B.current=Date.now()}catch{}},Ze=C=>{if(H&&Le.length>0){if(C.key==="ArrowDown"){C.preventDefault(),F(U=>(U+1)%Le.length);return}if(C.key==="ArrowUp"){C.preventDefault(),F(U=>U<=0?Le.length-1:U-1);return}if(C.key==="Escape"){W(!1),F(-1);return}if(C.key==="Enter"&&G>=0&&Le[G]){C.preventDefault();let U=Le[G];f(U.url),W(!1),F(-1),K(U.url);return}}C.key==="Enter"&&K(y)};return c`
    <div className="browse">
      <div className="tabstrip">
        ${i.map((C,U)=>c`
          <button
            key=${C.id}
            className=${"tabchip"+(C.id===a?" active":"")+(C.pinned?" pinned":"")}
            onClick=${()=>ne(C.id)}
            title=${mh(C)}
          >
            <span
              className=${"tabchip-pin"+(C.pinned?" on":"")}
              title=${C.pinned?"Unpin tab":"Pin tab"}
              onClick=${Y=>{Y.stopPropagation(),Rs(C.id)}}
            >${C.pinned?"\u25CF":"\u25CB"}</span>
            <span className="tabchip-title">${Ym(C)}</span>
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
        <${eg} rpc=${e} C=${t} activeUrl=${A?.url||y||""} onOpenSettings=${g} />
        <button className=${`nav ask-browser-toggle${$?" active":""}`} data-testid="ask-browser-toggle"
          aria-expanded=${$} aria-controls="ask-browser-panel"
          onClick=${()=>S(C=>!C)} disabled=${!A?.url} title="Ask Browser about this page">✦ Ask</button>
        <button className="nav" onClick=${Wn} disabled=${!A?.src} title="Devtools (⌘⇧I)">⚙</button>
        <button className="nav go" onClick=${()=>K(y)}>Go</button>
        ${H&&Le.length>0&&c`
          <div className="urlbar-suggestions">
            ${Le.map((C,U)=>c`
              <div
                key=${C.url}
                className=${"urlbar-suggestion"+(U===G?" active":"")}
                onMouseDown=${Y=>{Y.preventDefault(),f(C.url),W(!1),F(-1),K(C.url)}}
                onMouseEnter=${()=>F(U)}
              >
                <span className="urlbar-suggestion-icon">${C.kind==="bookmark"?"\u2605":"\u{1F558}"}</span>
                <div className="urlbar-suggestion-text">
                  ${C.title&&C.title!==C.url?c`<div className="urlbar-suggestion-title">${C.title}</div>`:null}
                  <div className="urlbar-suggestion-url">${C.url}</div>
                </div>
              </div>
            `)}
          </div>
        `}
      </div>
      ${A?.status&&c`<div className="browse-status">${A.status}</div>`}
      ${A?.nameProv&&c`
        <div className=${`name-prov-chip name-prov-${A.nameProv.provenance}`}
             title=${`\u201C${A.nameProv.name}\u201D resolved to ${A.displayUrl}`}>
          <span className="name-prov-name">${A.nameProv.label}</span>
          <span className="name-prov-tier">${A.nameProv.provenance==="petname"?"your saved name":A.nameProv.provenance==="registry"?"name registry":A.nameProv.provenance==="contact"?`from ${A.nameProv.source||"a contact"}`:"curated"}</span>
        </div>
      `}
      <div className="browse-workspace">
        <div className="browse-stage">
          ${i.map(C=>C.src?C.kind==="clearnet"&&C.clearnetMode==="direct"?typeof window<"u"&&window.customElements?.get?.("webview")?c`<webview
                      key=${C.id}
                      ref=${U=>{U&&(w.current[C.id]=U)}}
                      className=${"webview"+(C.id===a?"":" hidden")}
                      src=${C.src}
                      partition=${"persist:clearnet-"+(()=>{try{return new URL(C.url||C.src).hostname}catch{return"site"}})()}
                      allowpopups=${!0}
                      data-testid="clearnet-webview"
                    ></webview>`:c`<iframe
                      key=${C.id}
                      ref=${U=>{U&&(w.current[C.id]=U)}}
                      className=${"webview"+(C.id===a?"":" hidden")}
                      src=${C.src}
                      data-testid="clearnet-iframe-direct"
                      onLoad=${U=>{_.current[C.id]=(_.current[C.id]||0)+1}}
                      sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-pointer-lock"
                    ></iframe>`:c`<iframe
                  key=${C.id}
                  ref=${U=>{U&&(w.current[C.id]=U)}}
                  className=${"webview"+(C.id===a?"":" hidden")}
                  src=${C.src}
                  data-testid=${C.kind==="clearnet"?"clearnet-iframe-proxy":"hyper-iframe"}
                  onLoad=${U=>{_.current[C.id]=(_.current[C.id]||0)+1,V(C,U.target)}}
                  sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-pointer-lock"
                ></iframe>`:C.id===a?C.url?c`<div key=${C.id} className="browse-welcome">
                      <div className="browse-welcome-inner">
                        <div className="browse-welcome-logo">🍐</div>
                        ${C.status&&/^error/i.test(C.status)?c`<div className="browse-welcome-copy">
                              <h2>Couldn't load this page</h2>
                              <p>${String(C.status).replace(/^error:\s*/i,"")}</p>
                            </div>`:c`<div className="browse-welcome-copy">
                              <h2>Loading…</h2>
                              <p>Fetching <code>${C.url}</code> ${C.kind==="clearnet"?"over the clearnet proxy \u2014 shields and the privacy ladder apply.":"directly from its peers \u2014 first load of a cold drive can take a moment."}</p>
                            </div>`}
                        <div className="browse-welcome-actions">
                          <button className="btn primary" onClick=${()=>K(C.url,C.id)}>${C.status&&/^error/i.test(C.status)?"Retry":"Reload"}</button>
                          <button className="btn subtle" onClick=${()=>{v.current?.focus(),v.current?.select?.()}}>Edit URL</button>
                        </div>
                      </div>
                    </div>`:c`<div key=${C.id} className="browse-welcome">
                      <div className="browse-welcome-inner start-page">
                        <div className="browse-welcome-logo">🍐</div>
                        <h2>Search without a profile</h2>
                        <p className="start-page-lede">PearBrowser sends no search analytics and never adds a query to its optional persistent visit history.</p>
                        <section className="private-search-card" aria-labelledby="private-search-title">
                          <div className="private-search-heading">
                            <span id="private-search-title">Private web search</span>
                            <span className="private-search-provider">${ba.name}</span>
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
                            Content Shield stays on. ${ba.name} receives your query and network address to return results; its published policy says it does not save or share search history. Private search is not anonymity.
                          </div>
                        </section>
                        <div className="start-page-p2p">Or paste a <code>hyper://</code> address above to fetch a site directly from its peers — no DNS, server, or CDN.</div>
                        <div className="browse-welcome-actions">
                          <button className="btn primary" onClick=${()=>K(Gm)}>Open the PearBrowser site</button>
                          <button className="btn subtle" onClick=${()=>{v.current?.focus(),v.current?.select?.()}}>Focus the URL bar</button>
                        </div>
                        <div className="browse-welcome-tip">Tip: <code>⌘T</code> opens a new tab, <code>⌘⇧T</code> reopens one, <code>⌘W</code> closes one, <code>⌘L</code> jumps to the URL bar, <code>⌘1</code>–<code>⌘9</code> switches between tabs.</div>
                        <${Nh} rpc=${e} C=${t} />
                      </div>
                      </div>`:null)}
        </div>
        ${$&&c`<${$h}
          rpc=${e}
          C=${t}
          activeTab=${A}
          captureContext=${J}
          onClose=${()=>S(!1)}
        />`}
      </div>
      ${b&&c`<${hh}
        rpc=${e}
        C=${t}
        url=${A?.url||""}
        onClose=${()=>x(!1)}
      />`}
    </div>
  `}var Qm={"profile:name":{label:"Display name",detail:"Your chosen public name"},"profile:avatar":{label:"Avatar",detail:"Your profile picture URL"},"profile:email":{label:"Email",detail:"Email you put in your profile"},"profile:website":{label:"Website",detail:"Personal site URL on your profile"},"profile:read":{label:"Full profile",detail:"All filled profile fields"},"profile:contact":{label:"Contact profile",detail:"Email and website fields"},"contacts:read":{label:"Contacts",detail:"Your saved contacts list"}};function kh({rpc:e,C:t,request:n,identity:s,onClose:i}){let r=new Set(n.scopes||[]),[a,l]=(0,d.useState)(r),[u,o]=(0,d.useState)(null),[h,g]=(0,d.useState)(""),v=E=>{l(y=>{let f=new Set(y);return f.has(E)?f.delete(E):f.add(E),f})},w=async E=>{g(""),o(E?"approve":"deny");try{let y=E?Array.from(a):[];await e.request(t.CMD_LOGIN_RESOLVE,{requestId:n.requestId,approved:E,scopes:y}),i()}catch(y){g(`could not resolve: ${y.message}`),o(null)}},_=n.appName||"A Pear app",N=ge(n.driveKey);return c`
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick=${E=>E.target.classList.contains("modal-overlay")&&w(!1)}>
      <div className="modal-card login-consent">
        <div className="login-header">
          <div className="login-app-icon">🍐</div>
          <div className="login-header-text">
            <div className="login-app-name">${_}</div>
            <div className="login-app-sub">wants to sign you in</div>
            <div className="login-app-key" title=${n.driveKey}>${N}</div>
          </div>
        </div>

        ${n.reason&&c`<div className="login-reason">"${n.reason}"</div>`}

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
          ${(n.scopes||[]).length===0?c`<div className="login-scope-empty">Nothing — sign-in only confirms it's you.</div>`:(n.scopes||[]).map(E=>{let y=Qm[E]||{label:E,detail:""},f=a.has(E);return c`
                  <label className=${"login-scope"+(f?" on":"")} key=${E}>
                    <input type="checkbox" checked=${f} onChange=${()=>v(E)} />
                    <div className="login-scope-meta">
                      <div className="login-scope-label">${y.label}</div>
                      <div className="login-scope-detail">${y.detail||E}</div>
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
  `}function _h({rpc:e,C:t,request:n,identity:s,onClose:i}){let[r,a]=(0,d.useState)(null),[l,u]=(0,d.useState)(""),o=async w=>{u(""),a(w?"approve":"deny");try{await e.request(t.CMD_SWARM_RESOLVE,{requestId:n.requestId,approved:w}),i()}catch(_){u(`could not resolve: ${_.message}`),a(null)}},h=n.appName||"A Pear app",g=ge(n.driveKey),v=ge(n.topicHex);return c`
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
          <button className="btn subtle" onClick=${()=>o(!1)} disabled=${r!==null}>
            ${r==="deny"?"Cancelling\u2026":"Cancel"}
          </button>
          <button className="btn primary" onClick=${()=>o(!0)} disabled=${r!==null}>
            ${r==="approve"?"Connecting\u2026":"Approve & Connect"}
          </button>
        </div>
      </div>
    </div>
  `}function Sh(e){if(typeof e!="string"||!/^[0-9]+$/.test(e))return String(e??"");let t=e.padStart(7,"0");return`${t.slice(0,-6).replace(/^0+(?=\d)/,"")}.${t.slice(-6)}`}function Eh({rpc:e,C:t,request:n,onClose:s}){let[i,r]=(0,d.useState)(null),[a,l]=(0,d.useState)(""),[u,o]=(0,d.useState)(Date.now()),[h,g]=(0,d.useState)(!1);(0,d.useEffect)(()=>{let x=setInterval(()=>o(Date.now()),1e3);return()=>clearInterval(x)},[]);let v=Math.max(0,Math.ceil(((n.expiresAt||0)-u)/1e3)),w=async x=>{l(""),r(x?"approve":"deny");try{let $=n.type==="connect"?t.CMD_WALLET_CONNECT_RESOLVE:t.CMD_WALLET_PAYMENT_RESOLVE;await e.request($,{intentId:n.intentId,approved:x}),s()}catch($){l(Dt($)),r(null)}},_=()=>{if(n.recipient)try{navigator.clipboard.writeText(n.recipient),g(!0),setTimeout(()=>g(!1),1500)}catch{}},N=n.appName||"A Pear app",E=ge(n.driveKey||""),y=ge(n.manifestSha256||""),f={connect:"wants to connect to your wallet",payment:"requests a test payment","sign-app":"wants an app-payload attestation"},p={connect:["Connecting\u2026","Approve & Connect"],payment:["Paying\u2026","Approve & Pay"],"sign-app":["Signing\u2026","Approve & Sign"]},[k,b]=p[n.type]||["Working\u2026","Approve"];return c`
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card login-consent">
        <div className="login-header">
          <div className="login-app-icon" style=${{background:"linear-gradient(135deg, #f7b731, #e25822)"}}>👛</div>
          <div className="login-header-text">
            <div className="login-app-name">${N}</div>
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

        ${n.type==="payment"&&c`
          <div className="login-section-label">PAYMENT · STABLE TESTNET · TEST USD₮0</div>
          <div className="login-scopes">
            <div className="login-scope on">
              <div className="login-scope-meta">
                <div className="login-scope-label">${Sh(n.amountAtomic)} USD₮0</div>
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
            ${n.estimatedFeeAtomic&&c`
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
              <code className="login-identity-key" title=${n.payloadHash||""}>${ge(n.payloadHash||"")}</code>
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
          <button className="btn subtle" onClick=${()=>w(!1)} disabled=${i!==null}>
            ${i==="deny"?"Rejecting\u2026":"Reject"}
          </button>
          <button className="btn primary" onClick=${()=>w(!0)} disabled=${i!==null}>
            ${i==="approve"?k:b}
          </button>
        </div>
      </div>
    </div>
  `}var Ch=[{id:"home",title:"PearBrowser homepage",subtitle:"The landing page \u2014 what this app is, who built it",url:"hyper://2d6c2be92f07e10ed5a4b07b5c1286a56f0c1220c79ad3c3293b069f8c946763/",initial:"\u{1F350}",gradient:"linear-gradient(135deg, #7ee787, #58a6ff)"},{id:"hiveworm",title:"HiveWorm",subtitle:"Legacy native app \u2014 a verified v3 package is required",legacyMigrationId:"d1xbkcpcbi1xa8dexp49rsendra5r67w3qh5a9k8t44oemm4k16y",initial:"\u{1F41B}",gradient:"linear-gradient(135deg, #a371f7, #d946ef)"},{id:"hiverelay",title:"HiveRelay",subtitle:"The relay backbone keeping it all online",url:"hyper://ea607230f7b9a5f854c664901b2c34faf1c6f5b7cee6fc3bca02ac682fd02754/",initial:"\u{1F7E2}",gradient:"linear-gradient(135deg, #00ff41, #3eaf55)"},{id:"p2pbuilders",title:"P2P Builders",subtitle:"Permissionless P2P hacker news",url:Wm,initial:"\u{1F527}",gradient:"linear-gradient(135deg, #ff6600, #fbbf24)"}];function Th({rpc:e,C:t,onPickSite:n,onClose:s}){let[i,r]=(0,d.useState)(0),a=async l=>{if(e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{onboardingDone:!0,onboardingDoneAt:Date.now()}}).catch(()=>{}),l?.legacyMigrationId)try{await e.request(t.CMD_LEGACY_APP_MIGRATION,{legacyMigrationId:l.legacyMigrationId},1e4)}catch{}else l?.url&&n(l.url);s()};return c`
    <div className="modal-overlay onboarding-overlay" role="dialog" aria-modal="true">
      <div className="modal-card onboarding-card">
        ${i===0&&c`
          <div className="onb-slide onb-slide-welcome">
            <div className="onb-hero">
              <${Ai} size=${72} />
            </div>
            <h1 className="onb-title">Welcome to <strong>PearBrowser</strong></h1>
            <p className="onb-subtitle">The web that doesn't go down.</p>
            <p className="onb-blurb">
              A peer-to-peer browser, app store, and site publisher. Pages
              live as Hyperdrives, identified by 32-byte keys, replicated
              by their readers. No DNS. No servers. No accounts.
            </p>
            <div className="onb-actions">
              <button className="btn primary" onClick=${()=>r(1)}>Get started →</button>
            </div>
          </div>
        `}
        ${i===1&&c`
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
              <button className="btn subtle" onClick=${()=>r(0)}>← Back</button>
              <button className="btn primary" onClick=${()=>r(2)}>Continue →</button>
            </div>
          </div>
        `}
        ${i===2&&c`
          <div className="onb-slide">
            <h2 className="onb-stepname">Try a site</h2>
            <p className="onb-blurb">Pick one to start with — you can always come back here.</p>
            <div className="onb-sites">
              ${Ch.map(l=>c`
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
              <button className="btn subtle" onClick=${()=>r(1)}>← Back</button>
              <button className="onb-skip" onClick=${()=>a(null)}>Skip — I'll explore</button>
            </div>
          </div>
        `}
        <div className="onb-dots">
          ${[0,1,2].map(l=>c`
            <span className=${"onb-dot"+(l===i?" on":"")} key=${l}></span>
          `)}
        </div>
      </div>
    </div>
  `}function Bi(e){return typeof e!="string"?null:/^data:image\//i.test(e)||/^https?:\/\//i.test(e)?e:null}function Oi({rpc:e,C:t,driveKey:n,iconRef:s,iconData:i,name:r}){let[a,l]=(0,d.useState)(Bi(i));return(0,d.useEffect)(()=>{if(a||!n||!/^[0-9a-f]{64}$/i.test(n)||!(t&&t.CMD_GET_APP_ICON))return;let u=!0;return e.request(t.CMD_GET_APP_ICON,{driveKey:n,iconRef:s}).then(o=>{let h=Bi(o&&o.iconData);u&&h&&l(h)}).catch(()=>{}),()=>{u=!1}},[n,s]),a?c`<img src=${a} alt="" className="app-icon" />`:c`<div className="app-icon app-icon-fallback">${(r||"?").charAt(0)}</div>`}function Sa(e){return Array.isArray(e.categories)?e.categories.map(t=>String(t)).filter(Boolean):e.category?[String(e.category)]:[]}function Ah(e){return!e||typeof e!="object"?"":[e.name,e.description,e.author,e.id,e.version,e.source,e.catalogName,e.verification,e.link,e.driveKey,...Sa(e),...Array.isArray(e._sources)?e._sources:[]].filter(t=>t!=null&&t!=="").map(t=>String(t).normalize("NFKC").toLowerCase()).join(" ")}function Rt(e){return e&&typeof e.settings=="object"&&e.settings!==null?e.settings:e||{}}function xh({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[i,r]=(0,d.useState)(null),[a,l]=(0,d.useState)(null),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)(""),[v,w]=(0,d.useState)(""),[_,N]=(0,d.useState)(""),[E,y]=(0,d.useState)(""),[f,p]=(0,d.useState)(""),[k,b]=(0,d.useState)(""),[x,$]=(0,d.useState)("");(0,d.useEffect)(()=>{e.request(t.CMD_USERDATA_GET_SETTINGS).then(A=>{let J=Rt(A);s(!!J?.experimentalAutobeeCatalogs);let P=typeof J?.autobeeOwnedKey=="string"?J.autobeeOwnedKey:null;J?.experimentalAutobeeCatalogs&&P&&e.request(t.CMD_AUTOBEE_GET,{keyHex:P}).then(r).catch(()=>{})}).catch(()=>s(!1))},[]);let S=A=>e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{autobeeOwnedKey:A}}).catch(()=>{}),R=A=>{g(A),setTimeout(()=>g(""),1800)},D=(A,J)=>{try{navigator.clipboard.writeText(A),$(J),setTimeout(()=>$(""),1500)}catch{}},H=async()=>{o(""),l("create");try{let A=await e.request(t.CMD_AUTOBEE_CREATE,{name:v||"Collaborative Catalog"},6e4);r(A),w(""),S(A.keyHex),R("Catalog created.")}catch(A){o(A.message)}finally{l(null)}},W=async()=>{let A=Kt(_);if(A){o(""),l("open");try{let J=await e.request(t.CMD_AUTOBEE_GET,{keyHex:A.key},6e4);r(J),N(""),S(J.keyHex),R(J.writable?"Opened \u2014 you are a writer.":"Opened read-only \u2014 share your writer key to be invited.")}catch(J){o(J.message)}finally{l(null)}}},G=async()=>{let A=(Kt(E)?.key||E).trim();o(""),l("invite");try{await e.request(t.CMD_AUTOBEE_ADD_WRITER,{keyHex:i.keyHex,writerKey:A},6e4),y(""),R("Writer added \u2014 they can edit once they sync.")}catch(J){o(J.message)}finally{l(null)}},F=async()=>{let A=f.trim();if(!A)return;if(/^(?:pear|file):\/\//i.test(A)){o("Remote executable app links are not accepted. Add browsable hyper:// content only.");return}let J={driveKey:Ts(A),name:k||A};if(!J.driveKey){o("Enter a valid hyper:// drive key.");return}o(""),l("addapp");try{let P=await e.request(t.CMD_AUTOBEE_ADD_APP,{keyHex:i.keyHex,app:J},6e4);r(P),p(""),b(""),R("App added.")}catch(P){o(P.message)}finally{l(null)}},B=async A=>{o(""),l("rm:"+A);try{let J=await e.request(t.CMD_AUTOBEE_REMOVE_APP,{keyHex:i.keyHex,id:A},6e4);r(J)}catch(J){o(J.message)}finally{l(null)}};return n?c`
    <div className="collab-catalog">
      <h2>Collaborative catalog <span className="settings-subtle">(experimental)</span></h2>
      <p className="subtitle">An app catalog several people can co-edit, synced peer-to-peer. This existing catalog format uses Autobase and Hyperbee; new Autobee 2 catalogs are not compatible. Not pinned on relays yet — reachable only while a writer is online.</p>
      <div className="settings-card">
        ${u&&c`<div className="apps-error">${u}</div>`}
        ${h&&c`<div className="apps-ok">${h}</div>`}

        ${!i&&c`
          <div className="collab-empty">
            <div className="settings-row">
              <div className="profile-field">
                <div className="settings-label">Create a new collaborative catalog</div>
                <input className="profile-input" placeholder="Catalog name" value=${v} onInput=${A=>w(A.target.value)} />
              </div>
              <button className="btn primary" onClick=${H} disabled=${a==="create"}>${a==="create"?"Creating\u2026":"Create"}</button>
            </div>
            <div className="settings-row">
              <div className="profile-field">
                <div className="settings-label">…or open one by key</div>
                <input className="profile-input" placeholder="autobee://… or 64-hex key" value=${_} onInput=${A=>N(A.target.value)} onKeyDown=${A=>A.key==="Enter"&&W()} />
              </div>
              <button className="btn" onClick=${W} disabled=${a==="open"||!_.trim()}>${a==="open"?"Opening\u2026":"Open"}</button>
            </div>
          </div>
        `}

        ${i&&c`
          <div className="collab-open">
            <div className="settings-row">
              <div>
                <div className="settings-label">${i.name} ${i.writable?"":c`<span className="settings-subtle">· read-only</span>`}</div>
                <div className="settings-subtle">${i.apps.length} app(s)</div>
              </div>
              <button className="btn subtle" onClick=${()=>{r(null),S("")}}>Close</button>
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

            ${i.writable&&c`
              <div className="collab-writable">
                <div className="settings-row">
                  <div className="profile-field">
                    <div className="settings-label">Invite a writer (paste their writer key)</div>
                    <input className="profile-input" placeholder="64-hex writer key" value=${E} onInput=${A=>y(A.target.value)} />
                  </div>
                  <button className="btn" onClick=${G} disabled=${a==="invite"||!E.trim()}>${a==="invite"?"Adding\u2026":"Invite"}</button>
                </div>
                <div className="settings-row">
                  <div className="profile-field">
                    <div className="settings-label">Add an app</div>
                    <input className="profile-input" placeholder="App name (optional)" value=${k} onInput=${A=>b(A.target.value)} />
                    <input className="profile-input" placeholder="hyper:// drive key" value=${f} onInput=${A=>p(A.target.value)} onKeyDown=${A=>A.key==="Enter"&&F()} />
                  </div>
                  <button className="btn primary" onClick=${F} disabled=${a==="addapp"||!f.trim()}>${a==="addapp"?"Adding\u2026":"Add app"}</button>
                </div>
              </div>
            `}

            ${i.apps.length>0&&c`
              <div className="collab-apps">
                <div className="settings-row"><div className="settings-label">Apps</div></div>
                ${i.apps.map(A=>c`
                  <div className="settings-row" key=${A.id||A.driveKey||A.link||A.name}>
                    <div>
                      <div className="settings-label">${A.name||A.id}</div>
                      <div className="settings-subtle">${A.driveKey||A.link||""}</div>
                    </div>
                    ${i.writable&&c`<button className="btn small subtle" onClick=${()=>B(A.id)} disabled=${a==="rm:"+A.id}>Remove</button>`}
                  </div>
                `)}
              </div>
            `}
          </div>
        `}
      </div>
    </div>
  `:null}function Dh({rpc:e,C:t}){let[n,s]=(0,d.useState)("pear-v3"),[i,r]=(0,d.useState)(""),[a,l]=(0,d.useState)(""),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)(""),[v,w]=(0,d.useState)([]),[_,N]=(0,d.useState)(!1),[E,y]=(0,d.useState)(""),[f,p]=(0,d.useState)(""),[k,b]=(0,d.useState)(""),[x,$]=(0,d.useState)(""),[S,R]=(0,d.useState)(""),[D,H]=(0,d.useState)(!1),[W,G]=(0,d.useState)(""),[F,B]=(0,d.useState)(""),A=n==="pear-v3",J=[["darwin-arm64","macOS Apple silicon"],["darwin-x64","macOS Intel"],["linux-arm64","Linux ARM64"],["linux-x64","Linux x64"],["win32-arm64","Windows ARM64"],["win32-x64","Windows x64"]],P=I=>{s(I),l(""),B(""),G(""),N(!1)},ne=I=>{w(Z=>Z.includes(I)?Z.filter(M=>M!==I):[...Z,I])},ue=I=>{G(""),$(""),R("");let Z=I.target.files&&I.target.files[0];if(!Z)return;if(!["image/png","image/jpeg","image/webp","image/gif","image/svg+xml"].includes(Z.type)){G("Choose a PNG, JPEG, WebP, GIF, or SVG icon.");return}if(Z.size>14*1024){G("Keep the icon under 14 KB so it fits the shared catalogue record.");return}let K=new FileReader;K.onerror=()=>G("The icon could not be read."),K.onload=()=>{let V=typeof K.result=="string"?K.result:"";if(!V||V.length>2e4){G("The encoded icon is too large for the catalogue.");return}$(V),R(Z.name)},K.readAsDataURL(Z)},O=async()=>{if(G(""),B(""),!i.trim()){G("App name is required.");return}if(!a.trim()){G(A?"Paste the production pear:// release link.":"Paste a hyper:// link or drive key.");return}if(A&&!u.trim()){G("Enter the version currently published on this Pear release line.");return}if(A&&v.length===0){G("Select every operating-system target included in the release.");return}if(A&&!_){G("Confirm that the root link is the seeded production provision or multisig release line.");return}if(!A&&/^(?:pear|file):\/\//i.test(a.trim())){G("Choose Pear v3 app for native release links.");return}H(!0);try{let I=await e.request(t.CMD_SUBMIT_APP,{submissionKind:n,name:i.trim(),link:a.trim(),version:u.trim(),productName:h.trim()||i.trim(),targets:v,releaseConfirmed:_,description:E.trim(),author:f.trim(),categories:k,iconData:x},9e4),Z=I&&I.manifest&&I.manifest.name||i.trim(),M;if(I&&I.status==="pending-review"){let V=Number(I.queuedForReview)||0,T=Number(I.acceptances)||0;M=`${V} relay${V===1?"":"s"} queued the catalogue receipt for human review.${T>0?` ${T} other relay${T===1?"":"s"} accepted receipt replication.`:""}`}else if(I&&I.status==="relay-accepted"){let V=Number(I.acceptances)||0;M=`${V} relay${V===1?"":"s"} accepted receipt replication, but no human-review queue acknowledgement was observed.`}else M="The receipt request was broadcast, but no relay accepted it or confirmed a review queue entry within the initial window; the client will retry.";let K=I&&I.receiptWarning?` ${I.receiptWarning}`:"";B(`Submitted "${Z}". ${M}${K} Catalogue publication remains a separate final gate.`),r(""),l(""),o(""),g(""),w([]),N(!1),y(""),p(""),b(""),$(""),R("")}catch(I){G(I&&I.message||String(I))}finally{H(!1)}};return c`
    <div className="community-submit">
      <h2>Submit your app <span className="settings-subtle">→ Community list</span></h2>
      <p className="subtitle">Submit release metadata for review. Pear v3 native apps must already be built, staged, provisioned or multisig-gated, and seeded under a stable root <code>pear://</code> production identity. This form does not release or execute the app.</p>
      <div className="settings-card">
        ${W&&c`<div className="apps-error">${W}</div>`}
        ${F&&c`<div className="apps-ok">${F}</div>`}
        <div className="community-kind" role="group" aria-label="Submission type">
          <button className=${"btn "+(A?"primary":"subtle")} onClick=${()=>P("pear-v3")}>Pear v3 app</button>
          <button className=${"btn "+(A?"subtle":"primary")} onClick=${()=>P("hyper")}>Hyper site</button>
        </div>
        <div className="community-release-note">
          ${A?c`<span><strong>Pear v3 flow:</strong> <code>pear build</code> → <code>pear stage</code> → <code>pear provision</code> / multisig → keep the root release link seeded.</span>`:c`<span><strong>Hyper flow:</strong> publish and seed a drive with a root <code>/index.html</code>. The review receipt points to it but does not pin it automatically.</span>`}
        </div>
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">App name *</div>
            <input className="profile-input" placeholder="My Cool App" value=${i} onInput=${I=>r(I.target.value)} />
          </div>
        </div>
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">${A?"Production Pear release link *":"Hyper content link *"}</div>
            <input className="profile-input" spellCheck="false" placeholder=${A?"pear://<52-character production key>":"hyper://\u2026 (or a 64-hex / z-base-32 key)"} value=${a} onInput=${I=>l(I.target.value)} />
          </div>
        </div>
        ${A&&c`
          <div className="settings-row">
            <div className="profile-field">
              <div className="settings-label">Released version *</div>
              <input className="profile-input" placeholder="1.2.3" value=${u} onInput=${I=>o(I.target.value)} />
            </div>
            <div className="profile-field">
              <div className="settings-label">Installed product name *</div>
              <input className="profile-input" placeholder=${i.trim()||"Must match the Pear package"} value=${h} onInput=${I=>g(I.target.value)} />
            </div>
          </div>
          <div className="profile-field">
            <div className="settings-label">Published targets *</div>
            <div className="community-targets">
              ${J.map(([I,Z])=>c`
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
            ${x?c`<img src=${Bi(x)} alt="Selected app icon" />`:c`<div className="app-icon app-icon-fallback">${(i||"?").charAt(0)}</div>`}
            <label className="btn">
              ${x?"Replace icon":"Choose icon"}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange=${ue} />
            </label>
            ${S&&c`<span className="settings-subtle">${S}</span>`}
            ${x&&c`<button className="btn subtle" onClick=${()=>{$(""),R("")}}>Remove</button>`}
          </div>
        </div>
        ${A&&c`
          <label className="community-release-confirm">
            <input type="checkbox" checked=${_} onChange=${I=>N(I.target.checked)} />
            <span>I confirm this root link is the currently seeded production provision or multisig release line, not a versioned stage link.</span>
          </label>
        `}
        <div className="settings-row">
          <button className="btn primary" onClick=${O} disabled=${D||!i.trim()||!a.trim()||A&&(!u.trim()||v.length===0||!_)}>${D?"Submitting\u2026":"Submit catalogue receipt"}</button>
        </div>
      </div>
    </div>
  `}function Rh({rpc:e,C:t,onPreview:n}){let[s,i]=(0,d.useState)(!1),[r,a]=(0,d.useState)(""),[l,u]=(0,d.useState)(""),[o,h]=(0,d.useState)(!1),[g,v]=(0,d.useState)(null),[w,_]=(0,d.useState)(null),[N,E]=(0,d.useState)({}),[y,f]=(0,d.useState)({}),[p,k]=(0,d.useState)({}),[b,x]=(0,d.useState)({}),[$,S]=(0,d.useState)([]),[R,D]=(0,d.useState)(null),[H,W]=(0,d.useState)(""),[G,F]=(0,d.useState)("");(0,d.useEffect)(()=>{e.request(t.CMD_USERDATA_GET_SETTINGS).then(O=>{let I=Rt(O)||{};typeof I.relayManageUrl=="string"&&a(I.relayManageUrl),typeof I.relayManageKey=="string"&&u(I.relayManageKey)}).catch(()=>{})},[]);let B=O=>{F(O),setTimeout(()=>F(""),3500)},A=async()=>{W("");try{await e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{relayManageUrl:r.trim(),relayManageKey:l.trim()}}),h(!0),setTimeout(()=>h(!1),1500),B("Saved.")}catch(O){W(O.message)}},J=async()=>{W(""),D("load");try{let O=await e.request(t.CMD_MOD_PENDING,{},3e4);v(O.pending||[]),_(O.mode||null),S(O.audit||[]),E({}),f({})}catch(O){W(O.message),v([])}finally{D(null)}},P=async(O,I=!1)=>{let Z=O.appKey;W(""),D("v:"+Z);try{let M=await e.request(t.CMD_MOD_REVIEW,{appKey:Z,publisherPubkey:O.publisherPubkey,force:I},45e3);E(K=>({...K,[Z]:M})),f(K=>({...K,[Z]:!1}))}catch(M){W(M.message)}finally{D(null)}},ne=async(O,I)=>{let Z=O.appKey,M=N[Z],K=(b[Z]||"").trim(),V=(p[Z]||"").trim();if(I&&!M){W("Run due diligence before approving.");return}if(I&&!V){W("Record what you checked in the reviewer note before approving.");return}if(!I&&!K){W("Add a rejection reason before rejecting.");return}W(""),D((I?"a:":"r:")+Z);try{let T=await e.request(I?t.CMD_MOD_APPROVE:t.CMD_MOD_REJECT,{appKey:Z,acknowledged:y[Z]===!0,reviewedAt:M&&M.checkedAt,reviewedReceiptDriveVersion:M&&M.evidence&&M.evidence.receiptDriveVersion,reviewedTargetDriveVersion:M&&M.evidence&&M.evidence.targetDriveVersion,note:V,reason:K},6e4);v(L=>(L||[]).filter(ie=>ie.appKey!==Z)),T&&T.audit&&S(L=>[T.audit,...L].slice(0,50)),E(L=>{let ie={...L};return delete ie[Z],ie}),B(T&&T.auditWarning?T.auditWarning:I?T&&T.promoted&&T.promoted.deferred?"Catalogue receipt approved. Community catalogue publication is still pending.":"Catalogue receipt approved and audited.":"Rejected with an audit reason.")}catch(T){W(T.message)}finally{D(null)}},ue=O=>O?O.approvalAllowed?"Needs human review":"Blocked":"Not checked";return c`
    <div className="moderator-panel">
      <h2>
        <button className="btn subtle small" onClick=${()=>i(O=>!O)} style=${{marginRight:"8px"}}>${s?"\u25BE":"\u25B8"}</button>
        Moderator tools <span className="settings-subtle">(operator)</span>
      </h2>
      ${s&&c`
        <div className="settings-card">
          ${H&&c`<div className="apps-error">${H}</div>`}
          ${G&&c`<div className="apps-ok">${G}</div>`}
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
              <input className="profile-input" placeholder="https://relay-eu.p2phiverelay.xyz or http://127.0.0.1:9100" value=${r} onInput=${O=>a(O.target.value)} />
            </div>
          </div>
          <div className="settings-row">
            <div className="profile-field">
              <div className="settings-label">Operator API key</div>
              <input className="profile-input" type="password" placeholder="Bearer token" value=${l} onInput=${O=>u(O.target.value)} />
            </div>
            <button className="btn" onClick=${A}>${o?"Saved":"Save"}</button>
          </div>
          <div className="settings-row">
            <button className="btn primary" onClick=${J} disabled=${R==="load"||!r.trim()}>${R==="load"?"Loading\u2026":"Load pending"}</button>
            ${w&&c`<span className=${"mod-mode "+(w==="review"?"pass":"warning")}>relay mode: ${w}</span>`}
            ${g&&c`<span className="settings-subtle">${g.length} queued</span>`}
          </div>
          ${w&&w!=="review"&&c`<div className="apps-error">This relay is not in review mode. Queue decisions are unsafe until its acceptance policy is set to <code>review</code>.</div>`}
          ${g&&g.length===0&&c`<div className="settings-subtle" style=${{padding:"6px 0"}}>No pending submissions.</div>`}
          ${g&&g.length>0&&c`
            <div className="mod-pending">
              ${g.map(O=>{let I=N[O.appKey],Z=I&&I.summary?I.summary.warning:0,M=[O.source,O.contentType,O.privacyTier,O.storageClass,O.availabilityClass].filter(Boolean);return c`
                <div className="mod-review-card" key=${O.appKey}>
                  <div className="mod-review-head">
                    <div style=${{minWidth:0}}>
                      <div className="app-name">${I&&I.manifest&&I.manifest.name||O.name||O.appId||"Unidentified app"}</div>
                      <div className="mod-key">${O.appKey}</div>
                      <div className="settings-subtle">publisher ${(O.publisherPubkey||"unknown").slice(0,16)}…${O.currentRelays?` \xB7 ${O.currentRelays} current relay(s)`:""}${O.replicationFactor?` \xB7 requests ${O.replicationFactor}`:""}</div>
                      ${M.length>0&&c`<div className="settings-subtle">relay metadata · ${M.join(" \xB7 ")}</div>`}
                      ${O.discoveredAt&&c`<div className="settings-subtle">queued ${new Date(O.discoveredAt).toLocaleString()}</div>`}
                    </div>
                    <span className=${"mod-mode "+(I?I.approvalAllowed?"warning":"block":"")}>${ue(I)}</span>
                  </div>
                  <div className="mod-review-actions">
                    <button className="btn small" onClick=${()=>P(O,!!I)} disabled=${!!R}>${R==="v:"+O.appKey?"Checking\u2026":I?"Re-run checks":"Run due diligence"}</button>
                    ${I&&I.previewUrl&&c`<button className="btn small subtle" onClick=${()=>n&&n(I.previewUrl)} disabled=${!!R}>Open target preview</button>`}
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
                      ${I.checks.map(K=>c`
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
                    <button className="btn small primary" onClick=${()=>ne(O,!0)} disabled=${!!R||w!=="review"||!I||!I.approvalAllowed||!(p[O.appKey]||"").trim()||Z>0&&y[O.appKey]!==!0}>${R==="a:"+O.appKey?"Approving\u2026":"Approve receipt"}</button>
                    <button className="btn small subtle" onClick=${()=>ne(O,!1)} disabled=${!!R||w!=="review"||!(b[O.appKey]||"").trim()}>${R==="r:"+O.appKey?"Rejecting\u2026":"Reject with reason"}</button>
                  </div>
                </div>
              `})}
            </div>
          `}
          ${$.length>0&&c`
            <details className="mod-audit">
              <summary>Recent local decision audit · ${$.length}</summary>
              ${$.slice(0,20).map(O=>c`
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
  `}var Um={"author-signed":3,"relay-listed":2,unverified:1};function Bm(e,t){let n=String(e||"0").split(".").map(i=>parseInt(i,10)||0),s=String(t||"0").split(".").map(i=>parseInt(i,10)||0);for(let i=0;i<Math.max(n.length,s.length);i++){let r=n[i]||0,a=s[i]||0;if(r!==a)return r>a}return!1}function Ih(e,t){let n=Um[e.verification]||1,s=Um[t.verification]||1;return n!==s?n>s?e:t:Bm(e.version,t.version)?e:(Bm(t.version,e.version),t)}function Lh(e){let t=String(e||"").trim();return t?t.replace(/^([a-z][a-z0-9+.-]*):\/\//i,(n,s)=>s.toLowerCase()+"://"):""}function Ph(e){if(!e||typeof e!="object")return"";let t=/^[0-9a-f]{64}$/i.test(String(e.driveKey||"").trim())?String(e.driveKey).trim().toLowerCase():"",n=Lh(e.link),s=/^hyper:\/\//i.test(n)?Ts(n):"";if(t||s)return"drive:"+(t||s);if(/^hyper:\/\/.+/i.test(n))return"link:"+n;let i=String(e.nativeDelivery?.installLink||"").trim().toLowerCase().replace(/\/$/,"");if(e.nativeDelivery?.status==="available"&&e.nativeDelivery?.kind==="pear-v3"&&/^pear:\/\/[13-9a-km-uw-z]{52}$/.test(i))return"native:"+i;let r=String(e.legacyMigrationId||"").trim().toLowerCase();if(/^[13-9a-km-uw-z]{52}$/.test(r))return"legacy:"+r;let a=String(e.id||"").trim();return a?"id:"+a:""}function $c(e){let t=new Map,n=[];for(let s of e){let i=Ph(s);if(!i){n.push(s);continue}let r=t.get(i);if(!r){t.set(i,{...s,_sources:s.catalogName?[s.catalogName]:[]});continue}let a=[...new Set([...r._sources||[],s.catalogName].filter(Boolean))],l=Ih(s,r),u=l===s?r:s,o={...l};!o.iconData&&u.iconData&&(o.iconData=u.iconData),!o.icon&&u.icon&&(o.icon=u.icon),t.set(i,{...o,_sources:a})}return[...t.values(),...n]}function Mh(e){return e&&/^[0-9a-f]{64}$/i.test(e.driveKey||"")?e.driveKey.toLowerCase():null}function Oh({rpc:e,C:t,app:n}){let s=Mh(n),i=n&&n.link?n.link:n&&/^[0-9a-f]{64}$/i.test(n.driveKey||"")?"hyper://"+n.driveKey+"/":null,[r,a]=(0,d.useState)(null);if((0,d.useEffect)(()=>{if(!s||!(t&&t.CMD_GET_DRIVE_INFO)){a(null);return}let h=!1,g=async()=>{try{let w=await e.request(t.CMD_GET_DRIVE_INFO,{keyHex:s},12e3);h||a(w)}catch{}};g();let v=setInterval(g,15e3);return()=>{h=!0,clearInterval(v)}},[s,e,t]),!i)return null;let l=i.length>30?i.slice(0,20)+"\u2026"+i.slice(-6):i,u=r?r.peerCount||0:null,o=r&&r.byteLength?fa(r.byteLength):null;return c`
    <div className="app-p2p-meta" style=${{display:"flex",flexWrap:"wrap",alignItems:"center",gap:"8px",marginTop:"5px",fontSize:"11px"}}>
      <button title=${"Copy "+i} onClick=${h=>{h.stopPropagation(),Ui(i)}} style=${{background:"none",border:"none",padding:0,color:"#6e7681",cursor:"pointer",fontFamily:"ui-monospace, monospace",fontSize:"11px"}}>${l} ⧉</button>
      ${o?c`<span style=${{color:"#8b949e"}}>${o}</span>`:""}
      <span title="Peers currently serving this app" style=${{display:"inline-flex",alignItems:"center",gap:"4px",color:u>0?"#3fb950":"#6e7681"}}>
        <span style=${{width:"6px",height:"6px",borderRadius:"50%",background:u>0?"#3fb950":"#484f58",display:"inline-block"}}></span>
        ${u==null?"\u2026":u+" "+(u===1?"peer":"peers")}
      </span>
    </div>
  `}function Uh({rpc:e,C:t,onLaunch:n}){let[s,i]=(0,d.useState)(""),[r,a]=(0,d.useState)([]),[l,u]=(0,d.useState)([]),[o,h]=(0,d.useState)(null),[g,v]=(0,d.useState)(""),[w,_]=(0,d.useState)("all"),[N,E]=(0,d.useState)("all"),[y,f]=(0,d.useState)({}),[p,k]=(0,d.useState)(null),[b,x]=(0,d.useState)(""),[$,S]=(0,d.useState)(!1),[R,D]=(0,d.useState)(""),[H,W]=(0,d.useState)(null),[G,F]=(0,d.useState)(null),[B,A]=(0,d.useState)(!1),[J,P]=(0,d.useState)([]),[ne,ue]=(0,d.useState)([]),[O,I]=(0,d.useState)([]),[Z,M]=(0,d.useState)(null),[K,V]=(0,d.useState)(null),[T,L]=(0,d.useState)(""),[ie,$e]=(0,d.useState)(!1),[ee,j]=(0,d.useState)(""),me=async m=>{let q=String(m?.legacyMigrationId||"").trim().toLowerCase();if(!q){L(`${m?.name||"This app"} has no verified native v3 package yet.`);return}L(""),V("legacy-migration"),j("");try{let X=await e.request(t.CMD_LEGACY_APP_MIGRATION,{legacyMigrationId:q},1e4);L(X?.message||"A verified native v3 package is required.")}catch(X){L(`migration: ${X.message}`)}finally{V(null)}},mt=m=>{if(m?.nativeDelivery?.status==="migration-required"){me(m);return}let q=(m.link||"").trim();if(q){if(q.startsWith("hyper://")||q.startsWith("http://")||q.startsWith("https://")){L(""),n?.(q),j(`Launched ${m.name} in Browse \u2014 window.pear.${m.id}.* shim will inject if the manifest gate passes.`),setTimeout(()=>j(""),4e3);return}L(`launch: unsupported scheme for featured app "${m.name}" \u2014 ${q.slice(0,32)}`)}},Rs=async m=>{if(m&&m.type!=="hypersite"){L(`${m.name||"This app"} is window-only: its catalogue type is "${m.type||"standalone"}", not "hypersite".`);return}L(""),V("run-in-tab"),j("");try{let q=await e.request(t.CMD_RUN_APP_IN_TAB,{link:m.link},3e4);if(q?.action==="legacy-migration-required"){L(q.message||"A verified native v3 package is required.");return}n?.(q.url),j(`Running ${m.name} headless in a tab.`),setTimeout(()=>j(""),4e3)}catch(q){L(`run in tab: ${q.message}`)}finally{V(null)}},Wn=m=>{!m||!m.driveKey||(L(""),j(""),n?.("hyper://"+m.driveKey+"/"),j(`Opened ${m.name}.`),setTimeout(()=>j(""),3500))},Le=async()=>{try{let m=await e.request(t.CMD_LIST_INSTALLED);ue(Array.isArray(m)?m:m?.apps??[])}catch(m){L(`saved copies: ${m.message}`)}},Is=async()=>{try{let m=globalThis.pearbrowserRuntime;if(!m||typeof m.listPearApps!="function")return I([]);let q=await m.listPearApps();I(Array.isArray(q)?q:[])}catch(m){L(`native apps: ${m.message}`)}},Ze=m=>m?.nativeDelivery?.status==="available"&&m?.nativeDelivery?.kind==="pear-v3"?String(m.nativeDelivery.installLink||""):"",C=m=>{let q=Ze(m);return q&&O.find(X=>X.link===q)||null},U=async m=>{let q=globalThis.pearbrowserRuntime;if(!q||typeof q.installPearApp!="function"){L("Native Pear v3 installation is unavailable in this build.");return}let X=Ze(m);if(!X){L(`${m?.name||"This app"} has no valid Pear v3 install link.`);return}L(""),j(""),M(null),V(`native-install:${X}`);try{let oe=await q.installPearApp({id:m.id,name:m.name,verification:m.verification,nativeDelivery:m.nativeDelivery});if(oe?.cancelled)return;await Is(),j(oe?.exists?`${oe.app||m.name} is already installed.`:`Installed ${oe?.app||m.name} as a native Pear v3 app.`),setTimeout(()=>j(""),5e3)}catch(oe){L(`install ${m.name}: ${oe.message}`)}finally{V(null),M(null)}},Y=async m=>{let q=globalThis.pearbrowserRuntime;if(!q||typeof q.launchPearApp!="function"){L("Native Pear v3 launching is unavailable in this build.");return}let X=Ze(m)||m?.link||m?.id;L(""),j(""),V(`native-launch:${X}`);try{let oe=await q.launchPearApp({link:X,id:m?.id});j(`Opened ${oe?.app||m?.name||"Pear app"} in its native window.`),setTimeout(()=>j(""),4e3),await Is()}catch(oe){L(`launch ${m?.name||"app"}: ${oe.message}`)}finally{V(null)}},se=async()=>{try{let m=await e.request(t.CMD_CHECK_UPDATES),q={};for(let X of Array.isArray(m)?m:[])X&&X.id&&(q[X.id]=X.newVersion);f(q)}catch{}},ae=async m=>{let q=r.find(X=>X.id===m);if(!q){L(`refresh ${m}: not in any loaded catalog`);return}await Yn(q),await se()},te=m=>{let q=Array.isArray(m)?m.filter(Boolean):[m].filter(Boolean);return!p||!q.length||!Array.isArray(p.apps)?!1:p.apps.some(X=>q.some(oe=>X.id===oe||X.driveKey===oe||X.link===oe))},le=!!(p&&p.writable),pe=m=>{try{navigator.clipboard.writeText(m),A(!0),setTimeout(()=>A(!1),1500)}catch{}},Te=async()=>{L(""),V("mycatalog");try{let m=await e.request(t.CMD_MYCATALOG_CREATE,{name:b},6e4);k(m),x(""),e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{myCatalogKey:m.keyHex}}).catch(()=>{}),await nn(m.keyHex)}catch(m){L(`catalog create: ${m.message}`)}finally{V(null)}},zt=async m=>{if(!p)return;if(!p.writable){L("This catalog is not editable on this device.");return}let q=m.id||m.driveKey||m.link;L(""),V(`addcat:${q}`);try{let X=await e.request(t.CMD_MYCATALOG_ADD_APP,{keyHex:p.keyHex,app:m},6e4);k(X),await Ue(),se()}catch(X){L(`add to catalog: ${X.message}`)}finally{V(null)}},Ge=async m=>{if(p){if(!p.writable){L("This catalog is not editable on this device.");return}L(""),V(`rmcat:${m}`);try{let q=await e.request(t.CMD_MYCATALOG_REMOVE_APP,{keyHex:p.keyHex,id:m},6e4);k(q),H===m&&(W(null),F(null)),await Ue(),se()}catch(q){L(`remove from catalog: ${q.message}`)}finally{V(null)}}},Ht=()=>{p&&(D(p.name||"My Catalog"),S(!0))},we=async()=>{if(p){if(!p.writable){L("This catalog is not editable on this device.");return}L(""),V("renamecat");try{let m=await e.request(t.CMD_MYCATALOG_RENAME,{keyHex:p.keyHex,name:R},6e4);k(m),S(!1),await Ue(),se()}catch(m){L(`rename catalog: ${m.message}`)}finally{V(null)}}},at=m=>{let q=m.id||m.driveKey||m.link;q&&(W(q),F({name:m.name||"",type:m.type||"standalone",description:m.description||"",version:m.version||"",author:m.author||"",categories:Sa(m).join(", "),icon:m.icon||m.iconRef||""}))},bt=(m,q)=>{F(X=>({...X||{},[m]:q}))},Ve=()=>{W(null),F(null)},We=async m=>{if(!p||!G)return;if(!p.writable){L("This catalog is not editable on this device.");return}let q=String(G.categories||"").split(",").map(X=>X.trim()).filter(Boolean);L(""),V(`editcat:${m}`);try{let X=await e.request(t.CMD_MYCATALOG_UPDATE_APP,{keyHex:p.keyHex,id:m,app:{name:G.name,type:G.type,description:G.description,version:G.version,author:G.author,categories:q,icon:G.icon}},6e4);k(X),W(null),F(null),await Ue(),se()}catch(X){L(`edit app: ${X.message}`)}finally{V(null)}},Ue=async()=>{try{let m=await e.request(t.CMD_GET_CATALOG_APPS);a(Array.isArray(m?.apps)?m.apps:[]),u(Array.isArray(m?.catalogs)?m.catalogs:[])}catch(m){L(`catalog: ${m.message}`)}},nn=async m=>{let q=(typeof m=="string"?m:s).trim(),X=Kt(q);if(X){L(""),V("catalog");try{let{cmd:oe,payload:It,persistRef:Ne}=Om(X,t);await e.request(oe,It||{keyHex:X.key},6e4),i(""),await Ue(),se(),P(Xn=>{let Ps=[Ne,...Xn.filter(xa=>xa!==Ne)].slice(0,8);return e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{lastCatalogKey:Ne,recentCatalogs:Ps}}).catch(()=>{}),Ps})}catch(oe){L(`catalog: ${oe.message}`)}finally{V(null)}}},jn=async m=>{L("");try{await e.request(t.CMD_UNLOAD_CATALOG,{keyHex:m}),N===m&&E("all"),await Ue();let q=tc(m);P(X=>{let oe=X.filter(It=>tc(It)!==q);return e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{recentCatalogs:oe}}).catch(()=>{}),oe})}catch(q){L(`unload: ${q.message}`)}};(0,d.useEffect)(()=>{Le(),Is(),Ue(),(async()=>{try{let m=Rt(await e.request(t.CMD_USERDATA_GET_SETTINGS)),q=Array.isArray(m?.recentCatalogs)?m.recentCatalogs:[],X=m?.lastCatalogKey,oe=typeof m?.myCatalogKey=="string"?m.myCatalogKey:null,It=et=>Kt(et)?.key===fh?vc:et,Ne=q.map(It);Ne.some((et,Ft)=>et!==q[Ft])&&e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{recentCatalogs:Ne}}).catch(()=>{});let Xn=[...new Set([...Ne,...X?[It(X)]:[],...oe?[oe]:[]])];Ne.length&&P(Ne),oe&&e.request(t.CMD_MYCATALOG_GET,{keyHex:oe}).then(k).catch(()=>{});let Ps=m?.defaultCatalogSeeded===!0,xa=m?.communityCatalogSeeded===!0,lf=Kt(Ds)?.key,of=Xn.some(et=>Kt(et)?.key===lf),Ki=Xn.length?[...Xn]:Ps?[]:[vc,Ds],Ec=!of&&!xa;if(Ec&&(Ki=[...new Set([...Ki,Ds])]),Ki.length){V("catalog"),await Promise.allSettled(Ki.map(Ft=>{let zi=Kt(Ft);if(!zi)return Promise.resolve();let{cmd:cf,payload:uf}=Om(zi,t),df=Kt(Ds)?.key===zi.key;return e.request(cf,uf||{keyHex:zi.key},df?25e3:6e4)}));let et={};if(!Xn.length&&!Ps){let Ft=[vc,Ds];P(Ft),et.recentCatalogs=Ft,et.defaultCatalogSeeded=!0,et.communityCatalogSeeded=!0}else if(Ec){let Ft=[...new Set([...Ne,Ds])];P(Ft),et.recentCatalogs=Ft,et.communityCatalogSeeded=!0}Object.keys(et).length&&e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:et}).catch(()=>{}),await Ue(),se(),V(null)}}catch{}finally{$e(!0)}})()},[]),(0,d.useEffect)(()=>{let m=globalThis.pearbrowserRuntime;if(!(!m||typeof m.onPearAppProgress!="function"))return m.onPearAppProgress(q=>M(q||null))},[]);let Yn=async m=>{L(""),V(`save-offline:${m.id}`);try{await e.request(t.CMD_INSTALL_APP,m,12e4),await Le()}catch(q){L(`save ${m.name} offline: ${q.message}`)}finally{V(null)}},Qn=async m=>{L(""),V(`remove-saved:${m.id}`);try{await e.request(t.CMD_UNINSTALL_APP,{id:m.id}),await Le()}catch(q){L(`remove saved copy of ${m.name}: ${q.message}`)}finally{V(null)}},Ls=async m=>{L(""),V(`open-saved:${m.id}`);try{let q=await e.request(t.CMD_LAUNCH_APP,{id:m.id});n(q.localUrl)}catch(q){L(`open ${m.name}: ${q.message}`)}finally{V(null)}},Aa=m=>ne.some(q=>q.id===m),bc=m=>{if(Aa(m.id))return Ls(m);Wn(m)},kc=(0,d.useMemo)(()=>{let m=new Set;for(let q of r)Sa(q).forEach(X=>m.add(X));return["all",...[...m].sort()]},[r]),_c=(0,d.useMemo)(()=>{let m=g.normalize("NFKC").trim().toLowerCase(),q=r.filter(X=>!X||!X.link&&!X.legacyMigrationId&&!Ze(X)||N!=="all"&&X.catalogKey!==N||w!=="all"&&!Sa(X).includes(w)?!1:m?Ah(X).includes(m):!0);return $c(q)},[r,g,w,N]),Sc=(0,d.useMemo)(()=>$c(r.filter(m=>m&&(m.link||m.legacyMigrationId||Ze(m)))).length,[r]),af=m=>{let q=m.id||m.driveKey||m.name||"untitled",X=m.id||m.driveKey,oe=H===X&&G,It=!!(G&&String(G.name||"").trim());return c`
      <div className=${"app-card"+(oe?" editing":"")} key=${q}>
        <${Oi} rpc=${e} C=${t} driveKey=${m.driveKey} iconRef=${m.icon} iconData=${m.iconData} name=${m.name} />
        <div className="app-info">
          ${oe?c`
              <div className="catalog-edit-wrap">
                <div className="catalog-edit-form">
                  <label>
                    Name
                    <input type="text" value=${G.name} onInput=${Ne=>bt("name",Ne.target.value)} />
                  </label>
                  <label>
                    Type <span style=${{opacity:.6,fontWeight:"normal"}}>(how it launches — required)</span>
                    <select value=${G.type||"standalone"} onChange=${Ne=>bt("type",Ne.target.value)} style=${{width:"100%",padding:"8px",borderRadius:"6px",background:"#0d1117",color:"#c9d1d9",border:"1px solid #30363d"}}>
                      <option value="hypersite">hypersite — browsable P2P content</option>
                    </select>
                  </label>
                  <label>
                    Description
                    <textarea rows="3" value=${G.description} onInput=${Ne=>bt("description",Ne.target.value)}></textarea>
                  </label>
                  <div className="catalog-form-grid">
                    <label>
                      Version
                      <input type="text" value=${G.version} onInput=${Ne=>bt("version",Ne.target.value)} />
                    </label>
                    <label>
                      Author
                      <input type="text" value=${G.author} onInput=${Ne=>bt("author",Ne.target.value)} />
                    </label>
                  </div>
                  <label>
                    Categories
                    <input type="text" value=${G.categories} onInput=${Ne=>bt("categories",Ne.target.value)} />
                  </label>
                  <label>
                    Icon <span style=${{opacity:.6,fontWeight:"normal"}}>(path inside your drive, e.g. /icon.svg)</span>
                    <input type="text" placeholder="/icon.svg" value=${G.icon||""} onInput=${Ne=>bt("icon",Ne.target.value)} />
                  </label>
                  ${(m.link||m.driveKey)&&c`<div className="app-meta" style=${{marginTop:"2px",fontFamily:"ui-monospace, monospace",fontSize:"11px",color:"#6e7681",wordBreak:"break-all"}}>launch: ${m.link||"hyper://"+m.driveKey+"/"}</div>`}
                </div>
              </div>
            `:c`
              <div className="app-info-copy">
                <div className="app-name">${m.name||m.id}</div>
                <div className="app-desc">${m.description||""}</div>
                <div className="app-meta">${m.version?"v"+m.version:""} ${m.author?"\xB7 "+m.author:""}</div>
              </div>
            `}
        </div>
        <div className="app-actions">
          ${oe?c`
              <div className="app-actions-group">
                <button key="save" className="btn primary" onClick=${()=>We(X)} disabled=${K===`editcat:${X}`||!It}>
                  ${K===`editcat:${X}`?"Saving\u2026":"Save"}
                </button>
                <button key="cancel" className="btn subtle" onClick=${Ve} disabled=${K===`editcat:${X}`}>Cancel</button>
              </div>
            `:c`
              <div className="app-actions-group">
                ${le&&X&&c`
                  <button key="edit" className="btn subtle" onClick=${()=>at(m)} disabled=${K===`rmcat:${X}`}>Edit</button>
                  <button key="remove" className="btn subtle" onClick=${()=>Ge(X)} disabled=${K===`rmcat:${X}`}>Remove</button>
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
        ${lh.map(m=>c`
          <div className="app-card" key=${m.id}>
            <div className="app-icon app-icon-fallback" style=${{background:m.gradient,color:"#0b0e14"}}>${m.initial}</div>
            <div className="app-info">
              <div className="app-name">${m.name}</div>
              <div className="app-desc">${m.tagline}</div>
              <div className="app-meta" title=${m.legacyMigrationId}>Legacy native release · migration required</div>
            </div>
            <div className="app-actions">
              ${m.type==="hypersite"?c`<button key="run-featured" className="btn primary" onClick=${()=>Rs(m)} disabled=${K==="run-in-tab"} title="Run headless — the app's UI streams into a tab over a pipe">Run in tab</button>`:c`<button key="open-featured" className="btn primary" onClick=${()=>mt(m)} disabled=${K==="legacy-migration"} title="Requires a verified native v3 package">Migration status</button>`}
            </div>
          </div>
        `)}
      </div>

      <h2>Legacy native apps</h2>
      <div className="catalog-loader">
        <p className="placeholder">Older remote app links cannot run in PearBrowser. Install only a publisher-provided, verified native v3 package.</p>
      </div>
      ${ee&&c`<div className="apps-ok">${ee}</div>`}
      ${Z&&c`<div className="apps-ok">
        ${Z.phase==="downloading"?`Downloading native app \xB7 ${fa(Z.download?.bytes||0)} \xB7 ${Z.peers||0} peer${Z.peers===1?"":"s"}`:Z.phase==="connecting"?"Finding Pear v3 release peers\u2026":Z.phase==="installing"?`Installing ${Z.app||"native app"}${Z.version?` v${Z.version}`:""}\u2026`:"Preparing native app\u2026"}
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

      ${l.length>0&&c`
        <div className="catalog-sources">
          <button
            className=${"catalog-chip"+(N==="all"?" active":"")}
            onClick=${()=>E("all")}
          >All · ${Sc}</button>
          ${l.map(m=>c`
            <span className="catalog-source" key=${m.key}>
              <button
                className=${"catalog-chip"+(N===m.key?" active":"")}
                title=${m.key}
                onClick=${()=>E(m.key)}
              >${m.name} · ${m.count}</button>
              <button className="catalog-source-x" title="Remove this catalog" onClick=${()=>jn(m.key)}>×</button>
            </span>
          `)}
        </div>
      `}

      ${T&&c`<div className="apps-error">${T}</div>`}

      ${K==="catalog"&&r.length===0&&c`
        <div className="catalog-loading">
          <span className="spinner"></span>
          <span>Loading catalogs from peers…</span>
        </div>
      `}

      ${ie&&r.length===0&&!K&&!T&&c`
        <div className="catalog-empty">
          <strong>No catalogs loaded.</strong>
          Paste a catalog drive key above, or use one of the featured Pear apps to launch directly.
          The browser remembers catalogs you've loaded before — they'll reload here next time.
        </div>
      `}

      ${r.length>0&&c`
        <div className="catalog-results">
          <h2>All apps · ${Sc}${l.length?` across ${l.length} ${l.length===1?"catalog":"catalogs"}`:""}</h2>

          <div className="catalog-filter">
            <input
              type="text"
              className="catalog-search"
              placeholder="Search apps by name, category, catalogue, or author…"
              value=${g}
              onInput=${m=>v(m.target.value)}
              spellCheck="false"
            />
            ${kc.length>1&&c`
              <div className="catalog-categories">
                ${kc.map(m=>c`
                  <button
                    className=${"catalog-chip"+(m===w?" active":"")}
                    key=${m}
                    onClick=${()=>_(m)}
                  >${m==="all"?"All":m}</button>
                `)}
              </div>
            `}
          </div>

          ${_c.length===0?c`<p className="placeholder">No apps match ${g?`"${g}"`:"this filter"}.</p>`:c`<div className="app-grid">
              ${_c.map(m=>c`
              <div className="app-card" key=${m.id}>
                <${Oi} rpc=${e} C=${t} driveKey=${m.driveKey} iconRef=${m.icon} iconData=${m.iconData} name=${m.name} />
                <div className="app-info" onClick=${()=>h(m)} style=${{cursor:"pointer"}} title="View details">
                  <div className="app-name">
                    ${m.name||m.id||"Untitled app"}
                    ${m.verification==="relay-listed"?c`<span title="Relay-listed" style=${{marginLeft:"5px",color:"#58a6ff",fontSize:"12px"}}>✓</span>`:""}
                    ${m.verification==="author-signed"?c`<span title="Author-signed" style=${{marginLeft:"5px",color:"#3fb950",fontSize:"12px"}}>✦</span>`:""}
                  </div>
                  <div className="app-desc">${m.description||""}</div>
                  <div className="app-meta">
                    ${m.version?"v"+m.version:""} ${m.author?"\xB7 "+m.author:""}
                    ${m.nativeDelivery?.status==="migration-required"?c`<span style=${{marginLeft:"6px",opacity:.75}}>· verified native package required</span>`:Ze(m)?c`<span style=${{marginLeft:"6px",opacity:.75}}>· Pear v3 native app</span>`:m.type==="hypersite"?c`<span style=${{marginLeft:"6px",opacity:.75}}>· opens in a tab</span>`:""}
                  </div>
                  ${m.catalogName&&c`<div className="app-source-tag">${m.catalogName}</div>`}
                  <${Oh} rpc=${e} C=${t} app=${m} />
                </div>
                <div className="app-actions">
                  ${(()=>{let q=Ze(m),X=C(m),oe=!!(m.driveKey&&/^[0-9a-f]{64}$/i.test(m.driveKey)),It=Aa(m.id);return c`
                      ${oe?c`<button key="open-content" className=${"btn "+(q||m.nativeDelivery?.status==="migration-required"?"subtle":"primary")} onClick=${()=>bc(m)} title="Open this browsable Hyperdrive content in a tab">Open</button>`:""}
                      ${oe?It?c`<button key="remove-saved-copy" className="btn subtle" onClick=${()=>Qn(m)} disabled=${K===`remove-saved:${m.id}`} title="Remove this device's saved content while keeping the catalogue entry">${K===`remove-saved:${m.id}`?"Removing\u2026":"Remove saved copy"}</button>`:c`<button key="save-offline" className="btn subtle" onClick=${()=>Yn(m)} disabled=${K===`save-offline:${m.id}`} title="Save browsable content on this device for offline use">${K===`save-offline:${m.id}`?"Saving\u2026":"Save offline"}</button>`:""}
                      ${q?X?.installed?c`<button key="open-native" className="btn primary" onClick=${()=>Y(m)} disabled=${K===`native-launch:${q}`} title="Open the installed native application">Open app</button>`:c`<button key="install-native" className="btn primary" onClick=${()=>U(m)} disabled=${K===`native-install:${q}`} title="Install the Pear v3 build into your operating system">${K===`native-install:${q}`?"Installing\u2026":"Install app"}</button>`:m.nativeDelivery?.status==="migration-required"?c`<button key="migration" className="btn primary" onClick=${()=>me(m)} disabled=${K==="legacy-migration"} title="Requires a verified native v3 package">Migration status</button>`:""}
                      ${le&&m.catalogKey!==p.keyHex&&!te([m.id,m.driveKey,m.link])&&c`
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
      ${p?c`
          <div className="mycatalog">
            <div className="mycatalog-head">
              <div className="mycatalog-title">
                ${$?c`
                    <div className="mycatalog-title-edit">
                      <input
                        className="mycatalog-title-input"
                        type="text"
                        value=${R}
                        onInput=${m=>D(m.target.value)}
                        onKeyDown=${m=>{m.key==="Enter"&&we(),m.key==="Escape"&&S(!1)}}
                        spellCheck="false"
                        autoFocus
                      />
                    <button key="save-name" className="btn primary small" onClick=${we} disabled=${K==="renamecat"||!R.trim()}>
                      ${K==="renamecat"?"Saving\u2026":"Save"}
                    </button>
                    <button key="cancel-name" className="btn subtle small" onClick=${()=>S(!1)} disabled=${K==="renamecat"}>Cancel</button>
                    </div>
                  `:c`
                    <div className="mycatalog-title-row">
                      <div className="app-name">${p.name}</div>
                      ${le&&c`<button key="rename" className="btn subtle small" onClick=${Ht}>Rename</button>`}
                    </div>
                  `}
                <div className="app-meta">${p.apps.length} app${p.apps.length===1?"":"s"}${p.writable?"":" \xB7 read-only on this device"}</div>
              </div>
              <button className="btn subtle" onClick=${()=>pe(p.keyHex)}>${B?"Copied!":"Copy share key"}</button>
            </div>
            <div className="mycatalog-key" title=${p.keyHex}>${p.keyHex}</div>
            ${p.apps.length===0?c`<p className="placeholder">${p.writable?"No apps yet. Use + Catalog on any app above to add it.":"This catalog has no saved apps."}</p>`:c`<div className="app-grid">
                  ${p.apps.map(af)}
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
      ${O.length===0?c`<p className="placeholder">No native Pear v3 apps installed through PearBrowser yet.</p>`:c`<div className="app-grid">
            ${O.map(m=>c`
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
      ${ne.length===0?c`<p className="placeholder">No Hyperdrive content saved for offline use yet.</p>`:c`<div className="app-grid">
            ${ne.map(m=>c`
              <div className="app-card" key=${m.id}>
                <${Oi} rpc=${e} C=${t} driveKey=${m.driveKey} iconRef=${m.icon} iconData=${m.iconData} name=${m.name} />
                <div className="app-info">
                  <div className="app-name">${m.name}</div>
                  <div className="app-meta">Saved v${m.version||"?"}${y[m.id]?` \xB7 newer content available \u2192 v${y[m.id]}`:""}</div>
                </div>
                <div className="app-actions">
                  ${y[m.id]&&c`
                    <button key="refresh-saved-copy" className="btn primary" onClick=${()=>ae(m.id)} disabled=${K===`save-offline:${m.id}`}>
                      ${K===`save-offline:${m.id}`?"Refreshing\u2026":"Refresh saved copy"}
                    </button>
                  `}
                  <button key="open-saved" className="btn" onClick=${()=>Ls(m)} disabled=${K===`open-saved:${m.id}`}>Open</button>
                  <button key="remove-saved" className="btn subtle" onClick=${()=>Qn(m)} disabled=${K===`remove-saved:${m.id}`}>${K===`remove-saved:${m.id}`?"Removing\u2026":"Remove saved copy"}</button>
                  ${le&&!te([m.id,m.driveKey,m.link])&&c`
                    <button key="add-installed" className="btn subtle" title="Add to my catalog" onClick=${()=>zt(m)} disabled=${K===`addcat:${m.id||m.driveKey||m.link}`}>+ Catalog</button>
                  `}
                </div>
              </div>
            `)}
          </div>`}

      <${Dh} rpc=${e} C=${t} />

      <${xh} rpc=${e} C=${t} />

      <${Rh} rpc=${e} C=${t} onPreview=${n} />

      ${o&&c`
        <div onClick=${()=>h(null)} style=${{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3,padding:"24px"}}>
          <div onClick=${m=>m.stopPropagation()} style=${{background:"#11161f",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"14px",padding:"20px 24px 24px",maxWidth:"480px",width:"100%",maxHeight:"82vh",overflowY:"auto"}}>
            <div style=${{display:"flex",justifyContent:"flex-end"}}>
              <button className="btn subtle" title="Close" onClick=${()=>h(null)} style=${{padding:"2px 9px"}}>✕</button>
            </div>
            <div style=${{display:"flex",gap:"14px",alignItems:"center",marginBottom:"14px"}}>
              ${Bi(o.iconData)?c`<img src=${Bi(o.iconData)} alt="" style=${{width:"56px",height:"56px",borderRadius:"12px"}} />`:c`<div style=${{width:"56px",height:"56px",borderRadius:"12px",background:"#1f2733",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",fontWeight:600}}>${(o.name||"?").charAt(0)}</div>`}
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
                ${o.categories.map(m=>c`<span key=${m} style=${{fontSize:"12px",padding:"2px 9px",borderRadius:"8px",background:"rgba(255,255,255,0.06)",color:"#8b949e"}}>${m}</span>`)}
              </div>`:""}
            <div style=${{fontSize:"13px",color:"#8b949e",display:"grid",gap:"6px",marginBottom:"18px"}}>
              <div><strong style=${{color:"#c9d1d9"}}>Delivery:</strong> ${o.driveKey?`browsable Hyperdrive content opened in a browser tab${Ze(o)?"; signed Pear v3 native package also available":""}`:Ze(o)?"signed Pear v3 native OS application":o.nativeDelivery?.status==="migration-required"?"legacy native record; verified Pear v3 package required":"catalogue link"}</div>
              ${o.version?c`<div><strong style=${{color:"#c9d1d9"}}>Version:</strong> v${o.version}</div>`:""}
              <div><strong style=${{color:"#c9d1d9"}}>Verification:</strong> ${o.verification||"unverified"}</div>
              ${o.homepage?c`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Homepage:</strong> ${o.homepage}</div>`:""}
              ${o.sourceUrl?c`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Source:</strong> ${o.sourceUrl}</div>`:""}
              ${o.license?c`<div><strong style=${{color:"#c9d1d9"}}>License:</strong> ${o.license}</div>`:""}
              ${o.link?c`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Link:</strong> ${o.link}</div>`:""}
              ${Ze(o)?c`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Install:</strong> ${Ze(o)}</div>`:""}
              ${o.driveKey?c`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Drive:</strong> ${o.driveKey}</div>`:""}
              ${o._sources&&o._sources.length?c`<div><strong style=${{color:"#c9d1d9"}}>Catalogue${o._sources.length>1?"s":""}:</strong> ${o._sources.join(", ")}</div>`:o.catalogName?c`<div><strong style=${{color:"#c9d1d9"}}>Catalogue:</strong> ${o.catalogName}</div>`:""}
              ${o.publisherKey?c`<div style=${{wordBreak:"break-all"}}><strong style=${{color:"#c9d1d9"}}>Publisher:</strong> ${ge(o.publisherKey)}</div>`:""}
            </div>
            <div style=${{display:"flex",gap:"8px"}}>
              ${o.driveKey&&c`
                <button key="detail-open-site" className="btn primary" onClick=${()=>{bc(o),h(null)}}>Open</button>
                ${Aa(o.id)?c`<button key="detail-remove-saved" className="btn subtle" onClick=${()=>{Qn(o),h(null)}}>Remove saved copy</button>`:c`<button key="detail-save-offline" className="btn subtle" onClick=${()=>{Yn(o),h(null)}}>Save offline</button>`}
              `}
              ${Ze(o)?C(o)?.installed?c`<button key="detail-open-native" className="btn primary" onClick=${()=>{Y(o),h(null)}}>Open app</button>`:c`<button key="detail-install-native" className="btn primary" onClick=${()=>{U(o),h(null)}}>Install app</button>`:o.nativeDelivery?.status==="migration-required"?c`<button key="detail-migration" className="btn primary" onClick=${()=>{me(o),h(null)}}>Migration status</button>`:!o.driveKey&&o.type==="hypersite"?c`<button key="detail-run-tab" className="btn primary" onClick=${()=>{Rs(o),h(null)}}>Run in tab</button>`:o.driveKey?"":c`<button key="detail-open-window" className="btn primary" onClick=${()=>{mt(o),h(null)}}>Open</button>`}
              <button key="detail-close" className="btn" onClick=${()=>h(null)}>Close</button>
            </div>
          </div>
        </div>
      `}
    </div>
  `}function Bh({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[i,r]=(0,d.useState)([]),[a,l]=(0,d.useState)(""),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)(!1),v=async()=>{try{s(await e.request(t.CMD_CONTACTS_MY_INVITE));let N=await e.request(t.CMD_CONTACTS_LIST,{limit:200});r(Array.isArray(N?.contacts)?N.contacts:[])}catch(N){o(N.message)}};(0,d.useEffect)(()=>{v()},[]);let w=async()=>{try{await navigator.clipboard.writeText(n.url),g(!0),setTimeout(()=>g(!1),1500)}catch{}},_=async()=>{let N=a.trim();if(N){o("");try{let y=(await e.request(t.CMD_CONTACTS_ADD_INVITE,{url:N}))?.contact||{};l(""),o(`Added ${y.displayName||(y.pubkey?y.pubkey.slice(0,12)+"\u2026":"contact")}${y.bindingKey?" \u2014 searchable":""}`),v()}catch(E){o(`Couldn't add: ${E.message}`)}}};return c`
    <details className="trusted-peers">
      <summary>Trusted peers for federated search (${i.length})</summary>
      <div className="tp-body">
        <p className="subtitle">Share your invite so a peer can add you; paste theirs to search their content. Peer results are cryptographically verified before they're shown.</p>
        ${n&&c`
          <div className="tp-field">
            <label>Your invite</label>
            <div className="tp-row">
              <input className="profile-input" readOnly value=${n.url} onClick=${N=>N.target.select()} />
              <button className="btn small" onClick=${w}>${h?"Copied":"Copy"}</button>
            </div>
          </div>`}
        <div className="tp-field">
          <label>Add a peer</label>
          <div className="tp-row">
            <input className="profile-input" placeholder="Paste a p2p-contact://invite…" value=${a}
                   onInput=${N=>l(N.target.value)} onKeyDown=${N=>N.key==="Enter"&&_()} />
            <button className="btn small primary" onClick=${_} disabled=${!a.trim()}>Add</button>
          </div>
        </div>
        ${u&&c`<div className="tp-msg">${u}</div>`}
        ${i.length>0&&c`
          <ul className="tp-list">
            ${i.map(N=>c`
              <li key=${N.pubkey}>
                <span className="tp-name">${N.displayName||N.pubkey.slice(0,16)+"\u2026"}</span>
                ${N.verifiedAt?c`<span className="src-badge followed">verified</span>`:c`<span className="src-badge other">unverified</span>`}
                ${N.bindingKey?c`<span className="src-badge self">searchable</span>`:""}
              </li>`)}
          </ul>`}
      </div>
    </details>`}function Xm({meta:e}){let t=e&&(e.provenance||e);return t?c`<span className="search-provenance">
    ${t.digestHit?c`<span className="src-badge self">digest hit</span>`:""}
    ${t.fallbackPull?c`<span className="src-badge other">fallback pull</span>`:""}
    ${t.partial?c`<span className="src-badge other">partial</span>`:""}
    ${e.verifyBudgetExhausted?c`<span className="src-badge other">verify budget</span>`:""}
  </span>`:null}function Kh({rpc:e,C:t,onBrowse:n}){let[s,i]=(0,d.useState)([]),[r,a]=(0,d.useState)([]),[l,u]=(0,d.useState)(!1),[o,h]=(0,d.useState)(!1),[g,v]=(0,d.useState)(""),[w,_]=(0,d.useState)(""),[N,E]=(0,d.useState)(null),[y,f]=(0,d.useState)(0),[p,k]=(0,d.useState)(!1),[b,x]=(0,d.useState)(!1),[$,S]=(0,d.useState)(!1),[R,D]=(0,d.useState)(null),H=(0,d.useRef)(0),W=async()=>{let P=w.trim();if(!P){E(null),S(!1),D(null);return}k(!0),S(!1),D(null);try{let ne=await e.request(t.CMD_SEARCH,{query:P,limit:50,federated:b});H.current=ne?.queryId||0,E(Array.isArray(ne?.results)?ne.results:[]),f(ne?.stats?.docs||0),ne?.federating&&S(!0)}catch(ne){v(`search: ${ne.message}`)}finally{k(!1)}},G=P=>P&&P.link?P.link:P&&/^(?:pear|file|hyper):\/\//i.test(P.driveKey||"")?P.driveKey:`hyper://${P.driveKey}${P.path&&P.path!=="/"?P.path:"/"}`,F=P=>!P.tier||P.tier==="self"?c`<span className="src-badge self">you</span>`:P.tier==="followed"?c`<span className="src-badge followed">trusted · hop ${P.trustHop??1}</span>`:c`<span className="src-badge other">${P.tier}</span>`;(0,d.useEffect)(()=>{let P=ne=>{let ue=ne&&ne.detail||{};ue.queryId===H.current&&(Array.isArray(ue.results)&&E(ue.results),D(ue),S(!1))};return e.addEventListener(`event:${t.EVT_SEARCH_FEDERATED}`,P),()=>e.removeEventListener(`event:${t.EVT_SEARCH_FEDERATED}`,P)},[]);let B=async()=>{try{let P=await e.request(t.CMD_USERDATA_LIST_BOOKMARKS);i(Array.isArray(P)?P:P?.bookmarks??[]);let ne=await e.request(t.CMD_USERDATA_LIST_HISTORY,{limit:200});a(Array.isArray(ne)?ne:ne?.history??[]),typeof ne?.historyEnabled=="boolean"&&u(ne.historyEnabled);let ue=Rt(await e.request(t.CMD_USERDATA_GET_SETTINGS).catch(()=>null));ue&&(u(ue.historyEnabled===!0),h(ue.searchIndexEnabled===!0))}catch(P){v(P.message)}};(0,d.useEffect)(()=>{B();let P=setInterval(B,5e3);return()=>clearInterval(P)},[]);let A=async P=>{try{await e.request(t.CMD_USERDATA_REMOVE_BOOKMARK,{url:P}),B()}catch(ne){v(ne.message)}},J=async()=>{if(confirm("Clear all browsing history?"))try{await e.request(t.CMD_USERDATA_CLEAR_HISTORY),B()}catch(P){v(P.message)}};return c`
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
          onInput=${P=>_(P.target.value)}
          onKeyDown=${P=>P.key==="Enter"&&W()}
        />
        <button className="btn primary" onClick=${W} disabled=${p||!w.trim()}>${p?"Searching\u2026":"Search"}</button>
      </div>
      <label className="search-fed-toggle">
        <input type="checkbox" checked=${b} onChange=${P=>x(P.target.checked)} />
        Include trusted peers${$?c` <span className="fed-status">· searching peers…</span>`:""}
        <${Xm} meta=${R} />
      </label>
      <${Bh} rpc=${e} C=${t} />
      ${N!==null&&(N.length===0?c`<p className="placeholder">No matches${y===0?" yet \u2014 browse some hyper:// pages first to build your index.":"."}</p>`:c`<div className="library-list">
            ${N.map(P=>c`
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
      ${s.length===0?c`<p className="placeholder">No bookmarks yet. Use the star button in Browse, or open About this site and choose Bookmark this site.</p>`:c`<div className="library-list">
            ${s.map(P=>c`
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
        <h2>History ${l?`(${r.length})`:"(off)"}</h2>
        ${l&&r.length>0&&c`<button className="btn small subtle" onClick=${J}>Clear history</button>`}
      </div>
      ${l?r.length===0?c`<p className="placeholder">No browsing history yet.</p>`:c`<div className="library-list">
              ${r.slice(0,100).map((P,ne)=>c`
                <div className="library-row" key=${(P.url||"")+":"+ne}>
                  <div className="library-row-main">
                    <div className="library-title">${P.title||P.url}</div>
                    <div className="library-url">${P.url} ${P.visitedAt?"\xB7 "+new Date(P.visitedAt).toLocaleString():""}</div>
                  </div>
                  <button className="btn small" onClick=${()=>n(P.url)}>Open</button>
                </div>
              `)}
            </div>`:c`<p className="placeholder" data-testid="history-disabled-note">Browsing history is OFF by default. Nothing is recorded. Turn it on in Settings → Clearnet &amp; privacy if you want a local visit log on this device only.</p>`}
    </div>
  `}var yc=[{key:"displayName",label:"Display name",placeholder:"How apps will refer to you"},{key:"bio",label:"Bio",placeholder:"A short bio (optional)",textarea:!0},{key:"avatar",label:"Avatar URL",placeholder:"https://\u2026 or hyper://\u2026 (optional)"},{key:"website",label:"Website",placeholder:"https://your.site (optional)"},{key:"email",label:"Email",placeholder:"name@example.com (optional)"}];function zh(e){let t={...e||{}};return!t.displayName&&t.name&&(t.displayName=t.name),t}function Hh(e){let t=e?.driveKey||e?.driveKeyHex||"";return{...e||{},driveKey:t,driveKeyHex:t}}function Fh(e){return Qm[e]||{label:e,detail:e}}function Km(e){return(Array.isArray(e)?e:[]).map(t=>Fh(t).label)}function zm(e){let t=new Set(Array.isArray(e)?e:[]);if(t.has("profile:read"))return["Display name","Avatar","Bio","Email","Website","Pronouns","Location"];let n=[];return t.has("profile:name")&&n.push("Display name"),t.has("profile:avatar")&&n.push("Avatar"),t.has("profile:email")&&n.push("Email"),t.has("profile:website")&&n.push("Website"),t.has("profile:contact")&&(n.includes("Email")||n.push("Email"),n.includes("Website")||n.push("Website")),n}function qh({rpc:e,C:t}){let[n,s]=(0,d.useState)({}),[i,r]=(0,d.useState)({}),[a,l]=(0,d.useState)(null),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)(""),v=async()=>{o("");try{let E=await e.request(t.CMD_PROFILE_GET),y=zh(E?.profile||{});s(y),r(y)}catch(E){o(`profile: ${E.message}`)}};(0,d.useEffect)(()=>{v()},[]);let w=yc.some(({key:E})=>(i[E]||"")!==(n[E]||"")),_=async()=>{o(""),g(""),l("save");try{let E={};for(let{key:p}of yc){let k=(i[p]||"").trim();k!==(n[p]||"")&&(E[p]=k)}let f=(await e.request(t.CMD_PROFILE_UPDATE,{updates:E}))?.profile||E;s(f),r(f),g("Saved."),setTimeout(()=>g(""),1500)}catch(E){o(`save: ${E.message}`)}finally{l(null)}},N=async()=>{if(confirm("Clear ALL profile fields? Apps that already have grants will see empty values from now on.")){o(""),l("clear");try{await e.request(t.CMD_PROFILE_CLEAR),s({}),r({}),g("Profile cleared."),setTimeout(()=>g(""),1500)}catch(E){o(`clear: ${E.message}`)}finally{l(null)}}};return c`
    <div className="settings-card">
      ${u&&c`<div className="apps-error">${u}</div>`}
      ${h&&c`<div className="apps-ok">${h}</div>`}
      ${yc.map(({key:E,label:y,placeholder:f,textarea:p})=>c`
        <div className="settings-row" key=${E}>
          <div className="profile-field">
            <div className="settings-label">${y}</div>
            ${p?c`<textarea
                  className="profile-input"
                  rows="2"
                  placeholder=${f}
                  value=${i[E]||""}
                  onInput=${k=>r({...i,[E]:k.target.value})}
                ></textarea>`:c`<input
                  type="text"
                  className="profile-input"
                  placeholder=${f}
                  value=${i[E]||""}
                  onInput=${k=>r({...i,[E]:k.target.value})}
                />`}
          </div>
        </div>
      `)}
      <div className="settings-row settings-row-actions">
        <button className="btn subtle" onClick=${N} disabled=${a!==null}>
          ${a==="clear"?"Clearing\u2026":"Clear all"}
        </button>
        <button className="btn primary" onClick=${_} disabled=${!w||a!==null}>
          ${a==="save"?"Saving\u2026":"Save profile"}
        </button>
      </div>
    </div>
  `}function Gh({rpc:e,C:t}){let[n,s]=(0,d.useState)([]),[i,r]=(0,d.useState)([]),[a,l]=(0,d.useState)([]),[u,o]=(0,d.useState)(null),[h,g]=(0,d.useState)(""),[v,w]=(0,d.useState)(!1),_=async()=>{g("");try{let[$,S,R]=await Promise.all([e.request(t.CMD_LOGIN_LIST_GRANTS).catch(D=>({error:D})),e.request(t.CMD_SWARM_LIST_GRANTS).catch(()=>({grants:[]})),e.request(t.CMD_CONTACTS_LIST,{limit:1e3}).catch(()=>({contacts:[]}))]);if($?.error)throw $.error;s((Array.isArray($?.grants)?$.grants:[]).map(Hh).filter(D=>D.driveKey)),r(Array.isArray(S?.grants)?S.grants.filter(D=>D?.driveKey):[]),l(Array.isArray(R?.contacts)?R.contacts:[])}catch($){g(`permissions: ${$.message}`)}finally{w(!0)}};(0,d.useEffect)(()=>{_()},[]);let N=(0,d.useMemo)(()=>{let $=new Map,S=R=>($.has(R)||$.set(R,{driveKey:R,appName:null,login:null,swarm:[]}),$.get(R));for(let R of n){let D=S(R.driveKey);D.login=R,D.appName=R.appName||D.appName}for(let R of i){let D=S(R.driveKey);D.swarm.push(R),D.appName=D.appName||R.appName}return[...$.values()].sort((R,D)=>{let H=Math.max(R.login?.grantedAt||0,...R.swarm.map(G=>G.grantedAt||0));return Math.max(D.login?.grantedAt||0,...D.swarm.map(G=>G.grantedAt||0))-H})},[n,i]),E=n.filter($=>($.scopes||[]).includes("contacts:read")),y=n.filter($=>zm($.scopes).length>0),f=async $=>{let S=$.appName||ge($.driveKey);if(confirm(`Revoke sign-in for ${S}? It will need to ask again next time.`)){g(""),o(`login:${$.driveKey}`);try{await e.request(t.CMD_LOGIN_REVOKE_GRANT,{driveKeyHex:$.driveKey}),await _()}catch(R){g(`revoke sign-in: ${R.message}`)}finally{o(null)}}},p=async $=>{let S=$.appName||ge($.driveKey);if(confirm(`Revoke ${S}'s access to topic ${ge($.topicHex)}?`)){g(""),o(`swarm:${$.driveKey}:${$.topicHex}`);try{await e.request(t.CMD_SWARM_REVOKE_GRANT,{driveKey:$.driveKey,topicHex:$.topicHex}),await _()}catch(R){g(`revoke topic: ${R.message}`)}finally{o(null)}}},k=async $=>{if(!$.swarm.length)return;let S=$.appName||ge($.driveKey);if(confirm(`Revoke all ${$.swarm.length} swarm topic grant(s) for ${S}?`)){g(""),o(`swarm-all:${$.driveKey}`);try{await e.request(t.CMD_SWARM_REVOKE_ALL_FOR_APP,{driveKey:$.driveKey}),await _()}catch(R){g(`revoke topics: ${R.message}`)}finally{o(null)}}},b=async $=>{let S=$.appName||ge($.driveKey);if(confirm(`Revoke every stored permission for ${S}?`)){g(""),o(`app:${$.driveKey}`);try{$.login&&await e.request(t.CMD_LOGIN_REVOKE_GRANT,{driveKeyHex:$.driveKey}),$.swarm.length&&await e.request(t.CMD_SWARM_REVOKE_ALL_FOR_APP,{driveKey:$.driveKey}),await _()}catch(R){g(`revoke app: ${R.message}`)}finally{o(null)}}},x=async()=>{if(n.length&&confirm(`Revoke all ${n.length} sign-in grant(s)?`)){g(""),o("login-all");try{await e.request(t.CMD_LOGIN_REVOKE_ALL),await _()}catch($){g(`revoke all sign-ins: ${$.message}`)}finally{o(null)}}};return c`
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
          <div className="permission-stat-value">${E.length}</div>
          <div className="permission-stat-label">contact readers</div>
        </div>
        <div className="permission-stat">
          <div className="permission-stat-value">${i.length}</div>
          <div className="permission-stat-label">swarm topics</div>
        </div>
      </div>

      <div className="settings-subsection-label">Apps and sites</div>
      ${v?N.length===0?c`<div className="settings-subtle">No stored app permissions yet.</div>`:N.map($=>{let S=zm($.login?.scopes||[]),R=($.login?.scopes||[]).includes("contacts:read");return c`
                <div className="permission-app" key=${$.driveKey}>
                  <div className="permission-app-head">
                    <div>
                      <div className="settings-label">${$.appName||ge($.driveKey)}</div>
                      <code className="settings-code">${ge($.driveKey)}</code>
                    </div>
                    <button className="btn subtle danger" onClick=${()=>b($)}
                            disabled=${u===`app:${$.driveKey}`}>
                      ${u===`app:${$.driveKey}`?"Revoking\u2026":"Revoke app"}
                    </button>
                  </div>

                  <div className="permission-cap-grid">
                    <div className="permission-cap">
                      <div className="permission-cap-label">Sign-in</div>
	                      ${$.login?c`<div className="permission-cap-body">
	                          <div className="permission-chip-row">
	                            ${(Km($.login.scopes).length?Km($.login.scopes):["sign-in only"]).map(D=>c`
	                              <span className="permission-chip" key=${D}>${D}</span>
	                            `)}
	                          </div>
                          <div className="settings-subtle">
                            Granted ${new Date($.login.grantedAt).toLocaleDateString()}
                            ${$.login.expiresAt?c` · expires ${new Date($.login.expiresAt).toLocaleDateString()}`:""}
	                          </div>
	                          <button className="btn subtle danger small" onClick=${()=>f($.login)}
	                                  disabled=${u===`login:${$.driveKey}`}>Revoke sign-in</button>
	                        </div>`:c`<div className="settings-subtle">No sign-in grant.</div>`}
                    </div>

                    <div className="permission-cap">
                      <div className="permission-cap-label">Profile fields</div>
                      ${S.length?c`<div className="permission-chip-row">
                            ${S.map(D=>c`<span className="permission-chip" key=${D}>${D}</span>`)}
                          </div>`:c`<div className="settings-subtle">No profile fields shared.</div>`}
                    </div>

                    <div className="permission-cap">
                      <div className="permission-cap-label">Contacts</div>
	                      ${R?c`<div className="permission-cap-body">
	                          <div className="permission-chip-row"><span className="permission-chip warn">contacts:read</span></div>
	                          <div className="settings-subtle">${a.length} saved contact${a.length===1?"":"s"} visible through this scope.</div>
	                        </div>`:c`<div className="settings-subtle">No contact access.</div>`}
                    </div>

                    <div className="permission-cap">
                      <div className="permission-cap-label">Swarm topics</div>
	                      ${$.swarm.length?c`<div className="permission-cap-body">
	                          <div className="settings-subtle">${$.swarm.length} persisted topic${$.swarm.length===1?"":"s"}.</div>
	                          ${$.swarm.map(D=>c`
	                            <div className="permission-topic" key=${D.topicHex}>
	                              <div>
	                                <code className="settings-code">${D.protocol||"pear.swarm.v1"} · ${ge(D.topicHex)}</code>
                                <div className="settings-subtle">
                                  Granted ${new Date(D.grantedAt).toLocaleDateString()}
                                  ${D.lastUsedAt&&D.lastUsedAt!==D.grantedAt?c` · last used ${new Date(D.lastUsedAt).toLocaleDateString()}`:""}
                                </div>
                              </div>
                              <button className="btn subtle danger small" onClick=${()=>p(D)}
                                      disabled=${u===`swarm:${D.driveKey}:${D.topicHex}`}>Revoke</button>
                            </div>
	                          `)}
	                          <button className="btn subtle danger small" onClick=${()=>k($)}
	                                  disabled=${u===`swarm-all:${$.driveKey}`}>Revoke all topics</button>
	                        </div>`:c`<div className="settings-subtle">No arbitrary topic grants.</div>`}
                    </div>
                  </div>
                </div>
              `}):c`<div className="settings-subtle">Loading…</div>`}

      ${n.length>0&&c`
        <div className="settings-row settings-row-actions">
          <button className="btn subtle danger" onClick=${x} disabled=${u==="login-all"}>
            ${u==="login-all"?"Revoking\u2026":"Revoke all sign-ins"}
          </button>
        </div>
      `}
    </div>
  `}function Vh(e){return Array.isArray(e?.supported_transports)?e.supported_transports:Array.isArray(e?.transports)?e.transports:[]}function Wh({rpc:e,C:t}){let[n,s]=(0,d.useState)({relays:[],enabled:!0}),[i,r]=(0,d.useState)(""),[a,l]=(0,d.useState)(null),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)(!1),[v,w]=(0,d.useState)({}),_=async()=>{o("");try{let p=await e.request(t.CMD_GET_RELAYS);s({relays:Array.isArray(p?.relays)?p.relays:[],enabled:p?.enabled!==!1})}catch(p){o(`relays: ${p.message}`)}finally{g(!0)}};(0,d.useEffect)(()=>{_()},[]),(0,d.useEffect)(()=>{if(!n.relays.length)return;let p=!1,k={};for(let b of n.relays)k[b]=v[b]||null;return w(k),n.relays.forEach(async b=>{try{if(p)return;let x=await e.request(t.CMD_CHECK_RELAY_CAPABILITY,{url:b},1e4);if(p)return;w($=>({...$,[b]:x}))}catch(x){if(p)return;w($=>({...$,[b]:{ok:!1,error:x.message||"unreachable"}}))}}),()=>{p=!0}},[n.relays.join("|")]);let N=async p=>{o(""),l("save");try{let k=await e.request(t.CMD_SET_RELAYS,{relays:p});s({relays:Array.isArray(k?.relays)?k.relays:p,enabled:k?.enabled!==!1})}catch(k){o(`set: ${k.message}`)}finally{l(null)}},E=async p=>{o(""),l("toggle");try{await e.request(t.CMD_SET_RELAY_ENABLED,{enabled:p}),s(k=>({...k,enabled:p}))}catch(k){o(`toggle: ${k.message}`)}finally{l(null)}},y=async()=>{let p=i.trim().replace(/\/$/,"");if(p){if(!/^https?:\/\//.test(p)){o("Relay URLs must start with http:// or https://");return}if(n.relays.includes(p)){o("Already in the list.");return}r(""),await N([...n.relays,p])}},f=async p=>{n.relays.length<=1&&!confirm("Removing your last relay will switch to pure-P2P mode (slower first paint). Continue?")||await N(n.relays.filter(k=>k!==p))};return c`
    <div className="settings-card">
      ${u&&c`<div className="apps-error">${u}</div>`}
      <div className="settings-row">
        <div>
          <div className="settings-label">${n.enabled?"Hybrid fetch":"Pure P2P mode"}</div>
          <div className="settings-subtle">${n.enabled?"Try a relay first (1-2s first paint), fall back to P2P. Recommended for most users.":"P2P only \u2014 slower first paint, no relay dependency. Toggle this on to use relays."}</div>
        </div>
        <button className="btn subtle" onClick=${()=>E(!n.enabled)} disabled=${a==="toggle"}>
          ${n.enabled?"Disable":"Enable"}
        </button>
      </div>
      ${h&&n.relays.length===0&&c`
        <div className="settings-subtle">No relays configured.</div>
      `}
      ${n.relays.map((p,k)=>{let b=v[p];return c`
        <div className="settings-row relay-row" key=${p}>
          <div className="relay-info">
            <div className="relay-url-line">
              <code className="settings-code">${p}</code>
              ${k===0?c`<span className="settings-pill">primary</span>`:""}
            </div>
            ${b==null?c`<div className="relay-caps relay-caps-loading">probing capability advertisement…</div>`:b.ok?c`<div className="relay-caps">
                    <span className="relay-cap-label">v${b.doc?.version||"?"}</span>
                    ${b.doc?.region?c`<span className="relay-cap-label">${b.doc.region}</span>`:""}
                    ${Vh(b.doc).map(x=>c`
                      <span className=${"relay-cap-pill"+(x==="dht-relay-ws"?" relay-cap-pill-new":"")} key=${x}>${x}</span>
                    `)}
                  </div>`:c`<div className="relay-caps relay-caps-err">capability check failed: ${b.error}</div>`}
          </div>
          ${n.relays.length>1?c`
            <button className="btn subtle" onClick=${()=>f(p)} disabled=${a==="save"}>
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
          onInput=${p=>r(p.target.value)}
          onKeyDown=${p=>p.key==="Enter"&&y()}
          spellCheck="false"
        />
        <button className="btn primary" onClick=${y} disabled=${!i.trim()||a==="save"}>
          Add
        </button>
      </div>
    </div>
  `}function jh({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[i,r]=(0,d.useState)(null),[a,l]=(0,d.useState)(""),[u,o]=(0,d.useState)(!1),h=async()=>{try{s(await e.request(t.CMD_NOSTR_GET_IDENTITY)),l("")}catch(b){l(b.message)}};(0,d.useEffect)(()=>{h()},[]);let g=async()=>{if(n?.npub)try{await navigator.clipboard.writeText(n.npub),o(!0),setTimeout(()=>o(!1),1500)}catch{}},v=async(b,x)=>{r(x),l("");try{s(await e.request(b))}catch($){l($.message)}finally{r(null)}},w=n?.npub||"",_=w?w.slice(0,14)+"\u2026"+w.slice(-6):"\u2014",N=n?.status||(n?.linked?"linked":"unverified"),E=N==="linked",y=n?.epoch||0,f=N==="linked"?"self":N==="revoked"?"other danger":"other",p=N==="linked"?`linked (attested) \xB7 epoch ${y}`:N==="revoked"?`revoked \xB7 epoch ${y}`:N==="stale"?`stale \xB7 epoch ${y}`:"not linked",k=N==="linked"?"Your pear root and this Nostr key are mutually signed.":N==="revoked"?"The last attestation was revoked and is no longer trusted.":N==="stale"?"The stored attestation points at an older Nostr key.":"Mint a mutual attestation binding your pear root \u2194 Nostr key.";return c`
    <div className="settings-card">
      <div className="settings-row">
        <div>
          <div className="settings-label">Your Nostr key</div>
          <div className="settings-subtle">${n?_:"Loading\u2026"}</div>
        </div>
        <button className="btn small" onClick=${g} disabled=${!w}>${u?"Copied":"Copy npub"}</button>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Link status</div>
          <div className="settings-subtle">
            <span className=${`src-badge ${f}`}>${p}</span> ${k}
          </div>
        </div>
        ${E?c`<button className="btn subtle danger" onClick=${()=>v(t.CMD_NOSTR_REVOKE,"revoke")} disabled=${i!=null}>${i==="revoke"?"Revoking\u2026":"Revoke"}</button>`:c`<button className="btn primary" onClick=${()=>v(t.CMD_NOSTR_BIND,"bind")} disabled=${i!=null}>${i==="bind"?"Linking\u2026":"Link (attest)"}</button>`}
      </div>
      ${a&&c`<div className="tp-msg">${a}</div>`}
    </div>
  `}function Yh({rpc:e,C:t}){let[n,s]=(0,d.useState)([]),[i,r]=(0,d.useState)(""),[a,l]=(0,d.useState)(!1),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)(!1),[v,w]=(0,d.useState)(null),_=64*1024,N=async()=>{try{let k=await e.request(t.CMD_NOSTR_QUERY,{filter:{kinds:[1],limit:50},federated:h});s(Array.isArray(k?.events)?k.events:[]),w(k?.hidden||null),o("")}catch(k){o(k.message)}};(0,d.useEffect)(()=>{N()},[h]);let E=async()=>{let k=i.trim();if(k){l(!0),o("");try{await e.request(t.CMD_NOSTR_PUBLISH,{kind:1,content:k}),r(""),await N()}catch(b){o(b.message)}finally{l(!1)}}},y=k=>{let b=Date.now()/1e3-k;return b<60?"just now":b<3600?Math.floor(b/60)+"m":b<86400?Math.floor(b/3600)+"h":Math.floor(b/86400)+"d"},f=v?(v.quarantined||0)+(v.dropped||0)+(v.futureDated||0)+(v.bindingMissing||0)+(v.bindingUntrusted||0)+(v.contactFailures||0):0,p=v?.byReason?Object.entries(v.byReason).filter(([,k])=>k>0).map(([k,b])=>`${k}: ${b}`).join(" \xB7 "):"";return c`
    <div className="settings-card">
      <div className="tp-field">
        <label>Post a note</label>
        <textarea className="profile-input" rows="2" maxLength=${_} placeholder="What's happening?" value=${i}
                  onInput=${k=>r(k.target.value)}></textarea>
        <button className="btn small primary" onClick=${E} disabled=${a||!i.trim()}>${a?"Posting\u2026":"Post"}</button>
      </div>
      ${u&&c`<div className="tp-msg">${u}</div>`}
      <div className="settings-row">
        <label className="login-scope${h?" on":""}">
          <input type="checkbox" checked=${h} onChange=${()=>g(k=>!k)} />
          Include trusted contacts' notes
        </label>
      </div>
      ${h&&f>0&&c`
        <div className="settings-subtle">
          Hidden contact activity: ${f}${p?` \xB7 ${p}`:""}
        </div>
      `}
      <div className="nostr-feed">
        ${n.length===0?c`<div className="settings-subtle">No notes yet — post one above. Each is signed with your Nostr key and stored in your local event log.</div>`:n.map(k=>c`
            <div className="nostr-note" key=${k.id}>
              <div className="nostr-note-content">${k.content}</div>
              <div className="settings-subtle">
                ${k._via?c`<span className="src-badge followed">from ${k._via}</span>`:c`<span className="src-badge self">you</span>`}
                kind ${k.kind} · ${y(k.created_at)}
              </div>
            </div>`)}
      </div>
    </div>
  `}function Qh({rpc:e,C:t}){let[n,s]=(0,d.useState)([]),[i,r]=(0,d.useState)(null),[a,l]=(0,d.useState)(""),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)(null),[v,w]=(0,d.useState)(""),[_,N]=(0,d.useState)(""),E=async()=>{try{let b=await e.request(t.CMD_NAMEREG_STATUS);if(r(b),b.created){let x=await e.request(t.CMD_NAMEREG_LIST);s(Array.isArray(x?.names)?x.names:[])}else s([])}catch(b){w(b.message)}};(0,d.useEffect)(()=>{E()},[]);let y=async()=>{let b=a.trim(),x=ec(u);if(!x){w("Enter a 64-hex drive key or hyper:// link.");return}let $=n.find(S=>S.normalized===b.toLowerCase()||(S.name||"").toLowerCase()===b.toLowerCase());g("submit"),w("");try{await e.request($?t.CMD_NAMEREG_ROTATE:t.CMD_NAMEREG_CLAIM,{name:b,target:x}),l(""),o(""),await E()}catch(S){w(S.message)}finally{g(null)}},f=async(b,x)=>{g(x+b),w("");try{await e.request(b,{name:x}),await E()}catch($){w($.message)}finally{g(null)}},p=async b=>{try{await navigator.clipboard.writeText("pearname://"+b),N(b),setTimeout(()=>N(""),1500)}catch{}},k=ec(u)!=null;return c`
    <div className="settings-card">
	      ${i&&!i.enabled?c`<div className="settings-subtle">Turn on “Names” in Experimental (below) to claim registry names.</div>`:c`<div className="namereg-body">
	        <div className="settings-row">
	          <div>
	            <div className="settings-label">Claim or update a name</div>
            <div className="settings-subtle">A memorable name → browsable P2P content. First claim wins; confusable look-alikes are rejected. Re-submitting a name you own updates its target.</div>
          </div>
        </div>
        <div className="tp-row">
          <input className="profile-input" placeholder="name (e.g. alice)" value=${a} onInput=${b=>l(b.target.value)} />
          <input className="profile-input" placeholder="64-hex key or hyper:// link" value=${u} onInput=${b=>o(b.target.value)} />
          <button className="btn small primary" onClick=${y} disabled=${h!=null||!a.trim()||!k}>${h==="submit"?"Saving\u2026":"Save"}</button>
        </div>
        ${n.length>0&&c`<div className="namereg-list">
          ${n.map(b=>c`
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
	        ${i&&i.created&&n.length===0&&c`<div className="settings-subtle">No names yet — claim one above.</div>`}
	      </div>`}
      ${v&&c`<div className="tp-msg">${v}</div>`}
    </div>
  `}function Xh({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[i,r]=(0,d.useState)(null),[a,l]=(0,d.useState)(""),[u,o]=(0,d.useState)(""),[h,g]=(0,d.useState)(""),[v,w]=(0,d.useState)(""),[_,N]=(0,d.useState)(""),E=F=>{o(F),setTimeout(()=>o(""),2200)},y=(F,B)=>{if(F)try{navigator.clipboard.writeText(F),N(B),setTimeout(()=>N(""),1500)}catch{}},f=async()=>{l("");try{s(await e.request(t.CMD_SYNC_STATUS))}catch(F){l(F.message),s({enabled:!0,paired:!1})}};(0,d.useEffect)(()=>{f()},[]);let p=async()=>{r("refresh");try{await f()}finally{r(null)}},k=async()=>{l(""),r("create");try{await e.request(t.CMD_SYNC_CREATE,{},6e4),await f(),E("Sync is on \u2014 this device is the first writer.")}catch(F){l(F.message)}finally{r(null)}},b=async()=>{let F=nc(h);if(!F){l("That is not a valid sync invite \u2014 expected sync://<64-hex>:<64-hex>.");return}l(""),r("join");try{await e.request(t.CMD_SYNC_JOIN,F,6e4),g(""),await f(),E("Paired. Copy this device\u2019s writer key below, then add it from a writer device.")}catch(B){l(B.message)}finally{r(null)}},x=async()=>{let F=(nc(v)?.key||v).trim().toLowerCase();l(""),r("writer");try{await e.request(t.CMD_SYNC_ADD_WRITER,{writerKey:F},6e4),w(""),E("Device added \u2014 it becomes a writer once it syncs.")}catch(B){l(B.message)}finally{r(null)}},$=async()=>{l(""),r("push");try{let F=await e.request(t.CMD_SYNC_PUSH_LOCAL,{},6e4);await f(),E(`Imported ${F?.pushed??0} local bookmark(s) into the synced set.`)}catch(F){l(F.message)}finally{r(null)}},S=async F=>{l(""),r("rm:"+F);try{await e.request(t.CMD_SYNC_REMOVE_BOOKMARK,{url:F},6e4),await f()}catch(B){l(B.message)}finally{r(null)}};if(n===null)return c`<div className="settings-card"><div className="settings-subtle">Loading…</div></div>`;let R=!!n.paired,D=!!n.writable,H=wm(n.key,n.encKey),W=Array.isArray(n.bookmarks)?n.bookmarks:[],G=n.count&&Number.isFinite(n.count.bookmarks)?n.count.bookmarks:W.length;return c`
    <div className="settings-card">
      ${a&&c`<div className="apps-error">${a}</div>`}
      ${u&&c`<div className="apps-ok">${u}</div>`}

	      ${!R&&c`<div className="sync-setup">
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
                   onInput=${F=>g(F.target.value)} onKeyDown=${F=>F.key==="Enter"&&b()} />
	          </div>
	          <button className="btn" onClick=${b} disabled=${i==="join"||!h.trim()}>${i==="join"?"Pairing\u2026":"Pair"}</button>
	        </div>
	      </div>`}

	      ${R&&c`<div className="sync-paired">
	        <div className="settings-row">
	          <div>
	            <div className="settings-label">Syncing ${D?"":c`<span className="settings-subtle">· read-only on this device</span>`}</div>
	            <div className="settings-subtle">${G} bookmark(s) in the synced set</div>
          </div>
          <div className="settings-row-actions">
            <button className="btn subtle small" onClick=${p} disabled=${i==="refresh"} title="Re-check sync status (e.g. after another device added this one as a writer)">${i==="refresh"?"Refreshing\u2026":"Refresh"}</button>
            ${D&&c`<button className="btn subtle" onClick=${$} disabled=${i==="push"}>${i==="push"?"Importing\u2026":"Import local bookmarks"}</button>`}
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

        ${D&&c`
          <div className="settings-row">
            <div className="profile-field">
              <div className="settings-label">Add another device (paste its writer key)</div>
              <input className="profile-input" placeholder="64-hex writer key" value=${v}
                     onInput=${F=>w(F.target.value)} onKeyDown=${F=>F.key==="Enter"&&x()} />
            </div>
            <button className="btn" onClick=${x} disabled=${i==="writer"||!v.trim()}>${i==="writer"?"Adding\u2026":"Add device"}</button>
          </div>
        `}

        ${!D&&c`<div className="settings-subtle">This device is read-only until a writer device adds the key above. Synced bookmarks still replicate here in the meantime.</div>`}

	        ${W.length>0&&c`<div className="sync-bookmarks">
	          <div className="settings-row"><div className="settings-label">Synced bookmarks</div></div>
	          ${W.map(F=>c`
	            <div className="settings-row" key=${F.url}>
	              <div>
                <div className="settings-label">${F.title||F.url}</div>
                <div className="settings-subtle">${F.url}</div>
              </div>
	              ${D&&c`<button className="btn small subtle" onClick=${()=>S(F.url)} disabled=${i==="rm:"+F.url}>Remove</button>`}
	            </div>
	          `)}
	        </div>`}
	      </div>`}
    </div>
  `}function Jh({rpc:e,C:t,activeDriveKey:n="",onBrowse:s}){let[i,r]=(0,d.useState)(!0),[a,l]=(0,d.useState)(null),[u,o]=(0,d.useState)([]),[h,g]=(0,d.useState)(!1),[v,w]=(0,d.useState)(""),[_,N]=(0,d.useState)(""),[E,y]=(0,d.useState)(""),[f,p]=(0,d.useState)(null),[k,b]=(0,d.useState)(null),[x,$]=(0,d.useState)({entries:[],sources:[]}),[S,R]=(0,d.useState)(""),D=typeof n=="string"&&/^[0-9a-f]{64}$/i.test(n)?n.toLowerCase():"";(0,d.useEffect)(()=>{let T=!1;e.request(t.CMD_USERDATA_GET_SETTINGS).then($e=>{if(T)return;let ee=Rt($e);r(ee?.contentShield!==!1)}).catch(()=>{});let L=()=>{let $e=D?{driveKey:D}:{};e.request(t.CMD_SHIELD_STATUS,$e).then(ee=>{T||l(ee)}).catch(()=>{}),t.CMD_PLUGIN_LIST!=null&&e.request(t.CMD_PLUGIN_LIST).then(ee=>{T||o(ee?.plugins||[])}).catch(()=>{}),t.CMD_PLUGIN_CATALOG!=null&&e.request(t.CMD_PLUGIN_CATALOG).then(ee=>{!T&&ee&&$({entries:ee.entries||[],sources:ee.sources||[]})}).catch(()=>{})};L();let ie=setInterval(L,5e3);return()=>{T=!0,clearInterval(ie)}},[e,t,D]);let H=async()=>{let T=!i;g(!0),w("");try{await e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{contentShield:T}}),r(T);let L=await e.request(t.CMD_SHIELD_STATUS,D?{driveKey:D}:{}).catch(()=>null);L&&l(L)}catch(L){w(`save: ${L.message}`)}finally{g(!1)}},W=async()=>{if(!(!D||t.CMD_SHIELD_SET_ALLOW==null)){g(!0),w("");try{let T=!(a&&a.driveAllowlisted);await e.request(t.CMD_SHIELD_SET_ALLOW,{driveKey:D,allow:T});let L=await e.request(t.CMD_SHIELD_STATUS,{driveKey:D}).catch(()=>null);L&&l(L)}catch(T){w(`allowlist: ${T.message}`)}finally{g(!1)}}},G=async()=>{if(!(!D||t.CMD_SHIELD_SET_STRICT==null)){g(!0),w("");try{let T=!(a&&a.driveStrict);await e.request(t.CMD_SHIELD_SET_STRICT,{driveKey:D,strict:T});let L=await e.request(t.CMD_SHIELD_STATUS,{driveKey:D}).catch(()=>null);L&&l(L)}catch(T){w(`strict: ${T.message}`)}finally{g(!1)}}},F=async(T,L)=>{if(t.CMD_PLUGIN_SET_ENABLED!=null){g(!0),w("");try{await e.request(t.CMD_PLUGIN_SET_ENABLED,{id:T,enabled:!L});let ie=await e.request(t.CMD_PLUGIN_LIST).catch(()=>null);ie&&o(ie.plugins||[])}catch(ie){w(`plugin: ${ie.message}`)}finally{g(!1)}}},B=async()=>{let T=await e.request(t.CMD_SHIELD_STATUS,D?{driveKey:D}:{}).catch(()=>null);T&&l(T);let L=await e.request(t.CMD_PLUGIN_LIST).catch(()=>null);if(L&&o(L.plugins||[]),t.CMD_PLUGIN_CATALOG!=null){let ie=await e.request(t.CMD_PLUGIN_CATALOG).catch(()=>null);ie&&$({entries:ie.entries||[],sources:ie.sources||[]})}},A=async()=>{let T=_.trim().toLowerCase();if(!(!/^[0-9a-f]{64}$/.test(T)||t.CMD_SHIELD_SUBSCRIBE_LIST==null)){g(!0),w("");try{await e.request(t.CMD_SHIELD_SUBSCRIBE_LIST,{driveKey:T},3e4),N(""),await B()}catch(L){w(`subscribe: ${L.message}`)}finally{g(!1)}}},J=async T=>{if(t.CMD_SHIELD_UNSUBSCRIBE_LIST!=null){g(!0),w("");try{await e.request(t.CMD_SHIELD_UNSUBSCRIBE_LIST,{driveKey:T}),await B()}catch(L){w(`unsubscribe: ${L.message}`)}finally{g(!1)}}},P=async T=>{if(t.CMD_SHIELD_REFRESH_LISTS!=null){g(!0),w("");try{await e.request(t.CMD_SHIELD_REFRESH_LISTS,T?{driveKey:T,force:!0}:{},3e4),await B()}catch(L){w(`refresh: ${L.message}`)}finally{g(!1)}}},ne=async(T,L=null)=>{let ie=String(T||"").trim().toLowerCase();if(!(!/^[0-9a-f]{64}$/.test(ie)||t.CMD_PLUGIN_INSTALL_DRIVE==null)){g(!0),w("");try{let $e={driveKey:ie};L&&($e.granted=L.requested||[],$e.reviewedFingerprint=L.fingerprint);let ee=await e.request(t.CMD_PLUGIN_INSTALL_DRIVE,$e,3e4);p(ee&&ee.consentRequired?ee:null),await B()}catch($e){w(`install: ${$e.message}`)}finally{g(!1)}}},ue=async()=>{await ne(E),y("")},O=async()=>{let T=S.trim().toLowerCase();if(!(!/^[0-9a-f]{64}$/.test(T)||t.CMD_PLUGIN_CATALOG_LOAD_DRIVE==null)){g(!0),w("");try{await e.request(t.CMD_PLUGIN_CATALOG_LOAD_DRIVE,{driveKey:T},3e4),R(""),await B()}catch(L){w(`catalog: ${L.message}`)}finally{g(!1)}}},I=async T=>{if(t.CMD_PLUGIN_CATALOG_REMOVE_SOURCE!=null){g(!0),w("");try{await e.request(t.CMD_PLUGIN_CATALOG_REMOVE_SOURCE,{driveKey:T}),await B()}catch(L){w(`catalog: ${L.message}`)}finally{g(!1)}}},Z=async(T,L=null)=>{if(t.CMD_PLUGIN_UPDATE_DRIVE!=null){g(!0),w("");try{let ie={driveKey:T};L&&(ie.granted=L.capabilities||[],ie.reviewedFingerprint=L.fingerprint);let $e=await e.request(t.CMD_PLUGIN_UPDATE_DRIVE,ie,3e4);b($e&&$e.escalated?{driveKey:T,...$e}:null),await B()}catch(ie){w(`update: ${ie.message}`)}finally{g(!1)}}},M=async T=>{if(t.CMD_PLUGIN_UNINSTALL!=null){g(!0),w("");try{await e.request(t.CMD_PLUGIN_UNINSTALL,{driveKey:T}),k?.driveKey===T&&b(null),await B()}catch(L){w(`uninstall: ${L.message}`)}finally{g(!1)}}},K=a&&(a.listDetails||a.lists)||[],V=Array.isArray(K)?K.map(T=>typeof T=="string"?T:T.name).join(", "):"";return c`
    <div className="settings-card" data-testid="content-shield-card">
      ${v&&c`<div className="apps-error">${v}</div>`}
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
      ${a&&c`
        <div className="settings-row">
          <div>
            <div className="settings-label" data-testid="content-shield-counters">${a.blocked} blocked · ${a.allowed} allowed this session</div>
            <div className="settings-subtle" data-testid="content-shield-lists">${a.blockRules} block · ${a.cosmeticRules} cosmetic · ${a.scriptletRules||0} scriptlet · lists: ${V||"none"}</div>
          </div>
        </div>
      `}
      ${D&&c`
        <div className="settings-row" data-testid="content-shield-drive-controls">
          <div>
            <div className="settings-label">This drive (${D.slice(0,12)}…)</div>
            <div className="settings-subtle">Allowlist exempts only this drive from blocking. Strict mode injects a CSP that confines third-party subresources to the page origin.</div>
          </div>
          <div className="settings-inline-actions">
            <label className="login-scope${a?.driveAllowlisted?" on":""}" title="Allowlist this drive">
              <span className="settings-subtle">Allow</span>
              <input type="checkbox" checked=${!!a?.driveAllowlisted} disabled=${h}
                     onChange=${W} data-testid="content-shield-allow-toggle" />
            </label>
            <label className="login-scope${a?.driveStrict?" on":""}" title="Strict third-party mode">
              <span className="settings-subtle">Strict</span>
              <input type="checkbox" checked=${!!a?.driveStrict} disabled=${h}
                     onChange=${G} data-testid="content-shield-strict-toggle" />
            </label>
          </div>
        </div>
      `}
      ${a&&Array.isArray(a.topRules)&&a.topRules.length>0&&c`
        <div className="settings-subtle">Top rules: ${a.topRules.slice(0,3).map(T=>`${T.rule} (${T.hits})`).join(" \xB7 ")}</div>
      `}

      <div className="settings-row" data-testid="content-shield-list-sync">
        <div style=${{width:"100%"}}>
          <div className="settings-label">Filter lists from the swarm</div>
          <div className="settings-subtle">Subscribe to a filter-list Hyperdrive by key. Rules sync peer-to-peer, hot-swap when the publisher updates, and keep working offline — no CDN, no list-fetch fingerprint.</div>
          <div className="settings-row">
            <div className="profile-field" style=${{flex:1}}>
              <input className="profile-input" placeholder="64-hex filter-list drive key" value=${_}
                     data-testid="content-shield-subscribe-input"
                     onInput=${T=>N(T.target.value)}
                     onKeyDown=${T=>T.key==="Enter"&&A()} />
            </div>
            <button className="btn" data-testid="content-shield-subscribe" onClick=${A}
                    disabled=${h||!/^[0-9a-f]{64}$/i.test(_.trim())}>Subscribe</button>
            <button className="btn subtle" onClick=${()=>P()} disabled=${h||!a?.subscriptions?.length}>Refresh all</button>
          </div>
          ${(a?.subscriptions||[]).map(T=>c`
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
          ${x.entries.map(T=>c`
            <div className="settings-row" key=${T.id} data-testid=${"catalog-entry-"+T.id}>
              <div>
                <div className="settings-label">${T.name}${T.source==="builtin"&&T.verified?c`<span title="Curated entry" style=${{marginLeft:"5px",color:"#3fb950",fontSize:"12px"}}>✦</span>`:""}</div>
                <div className="settings-subtle">${T.description}</div>
                <div className="settings-subtle">${T.kind==="app"?"P2P app":"plugin"}${T.capabilities?.length?` \xB7 ${T.capabilities.join(", ")}`:""}${T.source!=="builtin"?` \xB7 from ${String(T.source).slice(0,8)}\u2026`:""}</div>
              </div>
              <div className="settings-inline-actions">
                ${T.kind==="app"&&T.driveKey&&c`
                  <button className="btn small" data-testid=${"catalog-open-"+T.id}
                          onClick=${()=>s&&s(`hyper://${T.driveKey}/`)}
                          disabled=${h||!s}>Open</button>
                `}
                ${T.kind==="plugin"&&T.driveKey&&!T.installed&&c`
                  <button className="btn small" data-testid=${"catalog-install-"+T.id}
                          onClick=${()=>ne(T.driveKey)} disabled=${h}>Install</button>
                `}
                ${T.kind==="plugin"&&T.installed&&c`<span className="settings-subtle">Installed</span>`}
                ${T.kind==="plugin"&&!T.driveKey&&c`<span className="settings-subtle" title=${T.unpublished?`Publish ${T.unpublished} to enable`:""}>Publish pending</span>`}
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
          ${x.sources.map(T=>c`
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
          ${f&&c`
            <div className="apps-error" data-testid="plugin-install-consent">
              ${f.name} ${f.version?`v${f.version}`:""} requests:
              ${(f.requested||[]).join(", ")||"no capabilities"}.
              Review this grant before installing; catalogue labels are not trusted permissions.
              <button className="btn small" onClick=${()=>ne(f.driveKey,f)} disabled=${h}>Grant and install</button>
              <button className="btn small subtle" onClick=${()=>p(null)} disabled=${h}>Cancel</button>
            </div>
          `}
          ${k&&c`
            <div className="apps-error" data-testid="plugin-escalation">
              Update for ${k.driveKey.slice(0,12)}… requests new capabilities: ${k.added.join(", ")}.
              ${k.changedSinceReview?" The plugin changed after the previous review; inspect this new request.":""}
              <button className="btn small" onClick=${()=>Z(k.driveKey,k)} disabled=${h}>Accept and re-enable</button>
            </div>
          `}
          ${u.map(T=>c`
            <div className="settings-row" key=${T.id} data-testid=${"plugin-row-"+T.id}>
              <div>
                <div className="settings-label">${T.name||T.id}</div>
                <div className="settings-subtle">${(T.capabilities||[]).join(", ")||"no capabilities"}${T.version?` \xB7 v${T.version}`:""}</div>
              </div>
              <div className="settings-inline-actions">
                ${/^[0-9a-f]{64}$/.test(T.id)&&c`
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
  `}function Zh({rpc:e,C:t}){let[n,s]=(0,d.useState)({httpsOnly:!0,stripTrackingParams:!0,blockThirdPartyCookies:!0,fingerprintFarbling:!0,clearnetMode:"proxy",historyEnabled:!1,searchIndexEnabled:!1,telemetryEnabled:!1,contentShield:!0}),[i,r]=(0,d.useState)(null),[a,l]=(0,d.useState)(!1),[u,o]=(0,d.useState)("");(0,d.useEffect)(()=>{let v=!1;return e.request(t.CMD_USERDATA_GET_SETTINGS).then(w=>{if(v)return;let _=Rt(w)||{};s(N=>({...N,httpsOnly:_.httpsOnly!==!1,stripTrackingParams:_.stripTrackingParams!==!1,blockThirdPartyCookies:_.blockThirdPartyCookies!==!1,fingerprintFarbling:_.fingerprintFarbling!==!1,clearnetMode:_.clearnetMode==="direct"?"direct":"proxy",historyEnabled:_.historyEnabled===!0,searchIndexEnabled:_.searchIndexEnabled===!0,telemetryEnabled:!1,contentShield:_.contentShield!==!1}))}).catch(()=>{}),t.CMD_PRIVACY_STATUS!=null&&e.request(t.CMD_PRIVACY_STATUS).then(w=>{v||r(w)}).catch(()=>{}),()=>{v=!0}},[e,t]);let h=async v=>{let w={...n,...v,telemetryEnabled:!1};l(!0),o("");try{if(await e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:w}),s(w),t.CMD_PRIVACY_STATUS!=null){let _=await e.request(t.CMD_PRIVACY_STATUS).catch(()=>null);_&&r(_)}}catch(_){o(`save: ${_.message}`)}finally{l(!1)}},g=v=>{v!=="telemetryEnabled"&&h({[v]:!n[v]})};return c`
    <div className="settings-card" data-testid="privacy-clearnet-card">
      ${u&&c`<div className="apps-error">${u}</div>`}
      <div className="settings-row" data-testid="privacy-zero-collection">
        <div>
          <div className="settings-label">Zero remote data collection</div>
          <div className="settings-subtle">PearBrowser does not ship telemetry, crash beacons, usage analytics, or third-party trackers in the browser chrome. Nothing you browse is sent to a PearBrowser server — there is no PearBrowser server for that.</div>
        </div>
        <span className="settings-subtle" data-testid="privacy-telemetry-status">Telemetry: never</span>
      </div>
      ${[["historyEnabled","Save browsing history (opt-in)","OFF by default. When enabled, visited URLs are stored only on this device in your local Hyperbee. Disabling clears stored history."],["searchIndexEnabled","Index pages for local search (opt-in)","OFF by default. When enabled, text from hyper:// pages you open is indexed on-device for Library search. No query ever leaves the device."],["contentShield","Block ads and trackers","ON by default. Refuses known ad/tracker requests inside the browser before peers or the network are contacted."],["httpsOnly","HTTPS-only mode","Upgrade http:// navigations to https:// before loading."],["stripTrackingParams","Strip tracking parameters","Remove utm_*, fbclid, gclid and similar click-ids from URLs."],["blockThirdPartyCookies","Block third-party cookies (proxy)","Drop Set-Cookie from proxied clearnet responses so sites cannot share a jar with hyper tabs."],["fingerprintFarbling","Fingerprint farbling","Noise canvas/audio fingerprints on proxied pages (per-origin seed)."]].map(([v,w,_])=>c`
        <div className="settings-row" key=${v}>
          <div>
            <div className="settings-label">${w}</div>
            <div className="settings-subtle">${_}</div>
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
      ${i&&c`
        <div className="settings-subtle" data-testid="privacy-session-status">
          Data collection: telemetry=${String(i.dataCollection?.telemetry??!1)}
          · history=${String(i.dataCollection?.history??!1)}
          · searchIndex=${String(i.dataCollection?.searchIndex??!1)}
          · shield=${i.privacy?.contentShield!==!1?"on":"off"}
          ${i.session?.proxyPort?` \xB7 proxy :${i.session.proxyPort}`:""}
        </div>
      `}
    </div>
  `}function eg({rpc:e,C:t,activeUrl:n,onOpenSettings:s}){let[i,r]=(0,d.useState)(null),a=(0,d.useMemo)(()=>{let v=String(n||"").match(/(?:hyper:\/\/|\/(?:hyper|app)\/)([0-9a-fA-F]{64})/);return v?v[1].toLowerCase():""},[n]);if((0,d.useEffect)(()=>{if(!e||!t?.CMD_SHIELD_STATUS)return;let v=!1,w=()=>{e.request(t.CMD_SHIELD_STATUS,a?{driveKey:a}:{}).then(N=>{v||r(N)}).catch(()=>{})};w();let _=setInterval(w,4e3);return()=>{v=!0,clearInterval(_)}},[e,t,a]),!i)return null;let l=i.blocked||0,u=i.enabled!==!1,o=!!(a&&i.driveAllowlisted),h=u?o?"Allowlisted":`${l}`:"Shield off",g=u?o?"This drive is allowlisted \u2014 click for shield settings":`${l} blocked this session \u2014 click for shield settings`:"Content Shield is off";return c`
    <button
      type="button"
      className=${`nav shield-chip${u?" on":""}${o?" allowlisted":""}`}
      data-testid="shield-status-chip"
      title=${g}
      onClick=${()=>s&&s()}
    >🛡 ${h}</button>
  `}function tg({rpc:e,C:t,onAutobeeChange:n,onDeviceSyncChange:s}){let[i,r]=(0,d.useState)(!1),[a,l]=(0,d.useState)(!1),[u,o]=(0,d.useState)(!1),[h,g]=(0,d.useState)(null),[v,w]=(0,d.useState)("");(0,d.useEffect)(()=>{e.request(t.CMD_USERDATA_GET_SETTINGS).then(N=>{let E=Rt(N);r(!!E?.experimentalNaming),l(!!E?.experimentalAutobeeCatalogs),o(!!E?.experimentalDeviceSync)}).catch(()=>{})},[]);let _=async(N,E,y,f)=>{g(N),w("");try{await e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{[N]:E}}),y(E),f?.(E)}catch(p){w(`save: ${p.message}`)}finally{g(null)}};return c`
    <div className="settings-card">
      ${v&&c`<div className="apps-error">${v}</div>`}
      <div className="settings-row">
        <div>
          <div className="settings-label">Names (petnames)</div>
          <div className="settings-subtle">Type friendly names like <code>keet</code> in the address bar instead of 52-character keys. Resolves your own saved petnames plus a curated set of well-known names, fully local — a provenance chip shows how each name resolved. Experimental.</div>
        </div>
        <label className="login-scope${i?" on":""}">
          <input type="checkbox" checked=${i} disabled=${h==="experimentalNaming"}
                 onChange=${()=>_("experimentalNaming",!i,r)} />
        </label>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Collaborative catalogs (experimental)</div>
          <div className="settings-subtle">Co-edit app catalogs using the existing Autobase format. Its <code>autobee://</code> keys are not compatible with new Autobee 2 catalogs. Reachable only while a writer is online until relay pinning is supported.</div>
        </div>
        <label className="login-scope${a?" on":""}">
          <input type="checkbox" checked=${a} disabled=${h==="experimentalAutobeeCatalogs"}
                 onChange=${()=>_("experimentalAutobeeCatalogs",!a,l,n)} />
        </label>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Device sync (encrypted bookmarks)</div>
          <div className="settings-subtle">Sync your bookmarks across your own devices, encrypted end-to-end with no server or account. Once enabled, pair devices in the <strong>Device sync</strong> section below. Experimental — your synced data is readable only on devices that hold the pairing invite.</div>
        </div>
        <label className="login-scope${u?" on":""}">
          <input type="checkbox" checked=${u} disabled=${h==="experimentalDeviceSync"}
                 onChange=${()=>_("experimentalDeviceSync",!u,o,s)} />
        </label>
      </div>
    </div>
  `}function Jm(){return c`
    <span style=${{padding:"4px 8px",borderRadius:"6px",background:"#e25822",color:"#fff",fontSize:"11px",fontWeight:700,letterSpacing:"0.05em",whiteSpace:"nowrap"}}
          data-testid="wallet-testnet-badge">TESTNET · NO REAL FUNDS</span>
  `}function ng({rpc:e,C:t,onChanged:n,onError:s,onNotice:i}){let[r,a]=(0,d.useState)(""),[l,u]=(0,d.useState)(""),[o,h]=(0,d.useState)(null),[g,v]=(0,d.useState)(!1),[w,_]=(0,d.useState)(""),[N,E]=(0,d.useState)(""),[y,f]=(0,d.useState)(""),p=Lm(r),k=g?Dm(w):null,b=!!(k&&k.length===24),x=async()=>{if(!(!Gn(r)||r!==l||o)){s(""),h("create");try{await e.request(t.CMD_WALLET_CREATE,{passphrase:r},12e4),a(""),u(""),n(),i("Wallet created. Now back it up: open \u201CBack up\u2026\u201D below, write the 24 words down offline and keep them safe \u2014 they are the only way back if the passphrase is lost.")}catch(S){s(Dt(S))}finally{h(null)}}},$=async()=>{if(!(!b||!Gn(N)||N!==y||o)){s(""),h("import");try{await e.request(t.CMD_WALLET_IMPORT,{passphrase:N,mnemonicB64:Rm(k.join(" "))},12e4),_(""),E(""),f(""),v(!1),n(),i("Wallet imported. Unlock it with your new passphrase to use it.")}catch(S){s(Dt(S))}finally{h(null)}}};return c`
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
      <input className="profile-input" type="password" placeholder="Passphrase" value=${r}
             autoComplete="new-password" data-testid="wallet-create-passphrase"
             onInput=${S=>a(S.target.value)} />
      <input className="profile-input" type="password" placeholder="Confirm passphrase" value=${l}
             autoComplete="new-password" data-testid="wallet-create-confirm"
             onInput=${S=>u(S.target.value)} />
      <div className="settings-subtle" data-testid="wallet-create-strength">
        ${r?`Strength: ${p.label} \u2014 ${p.hint}`:`A passphrase of at least ${Li} characters is required \u2014 a short sentence works well.`}
      </div>
      ${r&&!Gn(r)&&c`<div className="apps-error">Passphrase must be at least ${Li} characters long.</div>`}
      ${l&&r!==l&&c`<div className="apps-error">Passphrases do not match.</div>`}
      <div className="restore-actions">
        <button className="btn primary" onClick=${x} disabled=${!Gn(r)||r!==l||o!==null} data-testid="wallet-create-submit">
          ${o==="create"?"Creating\u2026":"Create wallet"}
        </button>
      </div>
    </div>
    <div className="settings-row">
      <div>
        <div className="settings-label">Import from recovery phrase</div>
        <div className="settings-subtle">Restore an existing wallet from its 24-word recovery phrase and protect it with a new passphrase.</div>
      </div>
      <button className="btn subtle" onClick=${()=>{v(S=>!S),s("")}} disabled=${o==="import"} data-testid="wallet-import-toggle">
        ${g?"Cancel":"Import\u2026"}
      </button>
    </div>
    ${g&&c`
      <div className="restore-form">
        <textarea className="restore-textarea" rows="3" spellCheck="false" autoCapitalize="none"
                  placeholder="Paste your 24-word recovery phrase here, separated by spaces"
                  value=${w} data-testid="wallet-import-mnemonic"
                  onInput=${S=>_(S.target.value)}></textarea>
        ${w.trim()&&!b&&c`<div className="apps-error">Enter the full 24-word recovery phrase.</div>`}
        <input className="profile-input" type="password" placeholder="New passphrase for this device" value=${N}
               autoComplete="new-password" data-testid="wallet-import-passphrase"
               onInput=${S=>E(S.target.value)} />
        <input className="profile-input" type="password" placeholder="Confirm new passphrase" value=${y}
               autoComplete="new-password" data-testid="wallet-import-confirm"
               onInput=${S=>f(S.target.value)} />
        ${N&&!Gn(N)&&c`<div className="apps-error">Passphrase must be at least ${Li} characters long.</div>`}
        ${y&&N!==y&&c`<div className="apps-error">Passphrases do not match.</div>`}
        <div className="restore-actions">
          <button className="btn primary" onClick=${$} disabled=${!b||!Gn(N)||N!==y||o!==null} data-testid="wallet-import-submit">
            ${o==="import"?"Importing\u2026":"Import wallet"}
          </button>
        </div>
        <div className="settings-warning">The phrase is imported on-device and never sent anywhere. Anyone with these words controls the wallet.</div>
      </div>
    `}
  `}function sg({rpc:e,C:t,onChanged:n,onError:s,onNotice:i}){let[r,a]=(0,d.useState)(""),[l,u]=(0,d.useState)(null),[o,h]=(0,d.useState)(!1),[g,v]=(0,d.useState)(""),[w,_]=(0,d.useState)(null),N=(0,d.useRef)(null);N.current=w,(0,d.useEffect)(()=>()=>{let p=N.current;p&&e.request(t.CMD_WALLET_BACKUP,{phase:"finish",ceremonyId:p.ceremonyId,outcome:"cancel"}).catch(()=>{})},[e,t]);let E=async()=>{if(!(!r||l)){s(""),u("unlock");try{await e.request(t.CMD_WALLET_UNLOCK,{passphrase:r},12e4),a(""),n()}catch(p){s(Dt(p))}finally{u(null)}}},y=async()=>{if(!(!g||l)){s(""),u("backup");try{let p=await e.request(t.CMD_WALLET_BACKUP,{phase:"begin",passphrase:g},12e4),k=Im(p.mnemonicB64);if(!k)throw new Error("could not decode the recovery phrase");_({ceremonyId:p.ceremonyId,words:k.split(" ")}),v(""),h(!1)}catch(p){s(Dt(p))}finally{u(null)}}},f=async p=>{let k=w;if(_(null),!!k){s(""),u("backup-finish");try{await e.request(t.CMD_WALLET_BACKUP,{phase:"finish",ceremonyId:k.ceremonyId,outcome:p}),p==="complete"&&i("Backup complete. The phrase is gone from this screen \u2014 it is your only way back if the passphrase is lost.")}catch(b){s(Dt(b))}finally{u(null)}}};return w?c`
      <div className="settings-card" data-testid="wallet-backup-ceremony">
        <div className="settings-row">
          <div>
            <div className="settings-label">Your recovery phrase <${Jm} /></div>
            <div className="settings-subtle">Shown once, on this device only — it never leaves the device and is cleared from the screen when you finish or cancel.</div>
          </div>
        </div>
        <div className="seed-phrase" style=${{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"6px 12px"}} data-testid="wallet-backup-words">
          ${w.words.map((p,k)=>c`<div key=${k}><span className="settings-subtle">${k+1}.</span> ${p}</div>`)}
        </div>
        <div className="settings-warning">
          Write these ${w.words.length} words down offline, in order. Anyone with them controls this wallet — never type them into a website or show them on a shared screen.
        </div>
        <div className="restore-actions">
          <button className="btn subtle" onClick=${()=>f("cancel")} disabled=${l==="backup-finish"} data-testid="wallet-backup-cancel">Cancel</button>
          <button className="btn primary" onClick=${()=>f("complete")} disabled=${l==="backup-finish"} data-testid="wallet-backup-done">
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
      <input className="profile-input" type="password" placeholder="Passphrase" value=${r}
             autoComplete="current-password" data-testid="wallet-unlock-passphrase"
             onInput=${p=>a(p.target.value)}
             onKeyDown=${p=>p.key==="Enter"&&E()} />
      <div className="restore-actions">
        <button className="btn primary" onClick=${E} disabled=${!r||l!==null} data-testid="wallet-unlock-submit">
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
  `}function ig({rpc:e,C:t,status:n,onChanged:s,onError:i}){let[r,a]=(0,d.useState)(null),[l,u]=(0,d.useState)([]),[o,h]=(0,d.useState)([]),[g,v]=(0,d.useState)(null),[w,_]=(0,d.useState)(!1),N=$=>{let S=String($?.message||$||"").toLowerCase();return S.includes("wallet-locked")||S.includes("wallet is locked")?(s(),!0):!1},E=()=>e.request(t.CMD_WALLET_BALANCES).then(a).catch($=>{N($)||a({unavailable:!0,code:"unavailable"})}),y=()=>e.request(t.CMD_WALLET_TRANSACTIONS,{limit:20}).then($=>u($?.transactions||[])).catch($=>{N($)}),f=()=>e.request(t.CMD_WALLET_CONNECTIONS_LIST).then($=>h($?.connections||[])).catch($=>{N($)});(0,d.useEffect)(()=>{E(),y(),f()},[e,t]);let p=()=>{if(n.address)try{navigator.clipboard.writeText(n.address),_(!0),setTimeout(()=>_(!1),1500)}catch{}},k=async()=>{i(""),v("lock");try{await e.request(t.CMD_WALLET_LOCK),s()}catch($){i(Dt($))}finally{v(null)}},b=async $=>{let S=$.driveKey;i(""),v(S);try{await e.request(t.CMD_WALLET_CONNECTION_REVOKE,{browserSessionId:$.browserSessionId,tabId:$.tabId,driveKey:$.driveKey}),await f()}catch(R){i(Dt(R))}finally{v(null)}},x=async()=>{v("balances");try{await E()}finally{v(null)}};return c`
    <div className="settings-row">
      <div>
        <div className="settings-label">Address</div>
        <code className="settings-code" title=${n.address||""} data-testid="wallet-address">${ka(n.address||"")}</code>
      </div>
      <button className="btn small subtle" onClick=${p} disabled=${!n.address} data-testid="wallet-address-copy">
        ${w?"Copied":"Copy"}
      </button>
    </div>
    <div className="settings-row">
      <div>
        <div className="settings-label">Balances</div>
        ${r===null&&c`<div className="settings-subtle">Loading…</div>`}
        ${r&&r.unavailable&&c`
          <div className="settings-subtle" data-testid="wallet-balances-unavailable">
            Unavailable — the testnet RPC is not reachable right now. Funds are safe; retry when online.
          </div>
        `}
        ${r&&!r.unavailable&&c`
          <div className="settings-subtle" data-testid="wallet-balances">
            ${qn(r.paymentAmountAtomic,6)} USD₮0 (test payment token)
            · ${qn(r.nativeFeeAmountAtomic,18)} native (test gas)
          </div>
        `}
      </div>
      <button className="btn small subtle" onClick=${x} disabled=${g!==null} data-testid="wallet-balances-refresh">
        ${g==="balances"?"Refreshing\u2026":"Refresh"}
      </button>
    </div>
    <div className="settings-row">
      <div style=${{width:"100%"}}>
        <div className="settings-label">Recent activity</div>
        ${l.length===0?c`<div className="settings-subtle" data-testid="wallet-activity-empty">No wallet activity yet.</div>`:c`
            <div data-testid="wallet-activity">
              ${l.map(($,S)=>c`
                <div className="settings-row" key=${$.intentId||S} style=${{paddingTop:"4px",paddingBottom:"4px"}}>
                  <div>
                    <div className="settings-label" style=${{fontSize:"13px"}}>${Pm($)}</div>
                    <div className="settings-subtle">
                      ${$.ts?new Date($.ts).toLocaleString():""}
                      ${$.amountAtomic?` \xB7 ${qn($.amountAtomic,6)} USD\u20AE0 \u2192 ${ka($.recipient||"")}`:""}
                      ${$.transactionHash?` \xB7 tx ${ka($.transactionHash)}`:""}
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
                    <div className="settings-label" style=${{fontSize:"13px"}}>${$.appName||ge($.driveKey)}</div>
                    <div className="settings-subtle">
                      ${$.appName?`${ge($.driveKey)} \xB7 `:""}
                      ${["connect",$.permissions?.pay&&"pay",$.permissions?.signApp&&"sign"].filter(Boolean).join(" \xB7 ")}
                      ${$.connectedAt?` \xB7 since ${new Date($.connectedAt).toLocaleDateString()}`:""}
                    </div>
                  </div>
                  <button className="btn small subtle danger" onClick=${()=>b($)} disabled=${g!==null} data-testid=${"wallet-revoke-"+$.driveKey.slice(0,8)}>
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
      <button className="btn subtle danger" onClick=${k} disabled=${g!==null} data-testid="wallet-lock">
        ${g==="lock"?"Locking\u2026":"Lock"}
      </button>
    </div>
  `}function rg({rpc:e,C:t}){let[n,s]=(0,d.useState)(null),[i,r]=(0,d.useState)(""),[a,l]=(0,d.useState)(""),[u,o]=(0,d.useState)(!1),[h,g]=(0,d.useState)(!1),v=()=>{e.request(t.CMD_WALLET_STATUS).then(E=>{s(E),r(y=>y&&y.startsWith("status:")?"":y)}).catch(E=>{s(null),r("status: "+Dt(E))})};(0,d.useEffect)(()=>{v(),e.request(t.CMD_USERDATA_GET_SETTINGS).then(E=>o(!!Rt(E)?.experimentalWalletWdk)).catch(()=>{})},[e,t]);let w=()=>{l(""),v()},_=async()=>{r(""),g(!0);try{await e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{experimentalWalletWdk:!u}}),o(!u)}catch(E){r(Dt(E))}finally{g(!1)}},N=n?.state||"absent";return c`
    <div className="settings-card" data-testid="wallet-card">
      <div className="settings-row">
        <div>
          <div className="settings-label">Testnet wallet <${Jm} /></div>
          <div className="settings-subtle">
            ${n===null&&"Wallet status unavailable."}
            ${n&&N==="absent"&&"No wallet on this device yet."}
            ${n&&N==="locked"&&"Wallet locked."}
            ${n&&N==="unlocked"&&"Wallet unlocked."}
            ${n?.networkId?` Network: ${n.networkId}.`:""}
          </div>
        </div>
        ${n===null&&c`
          <button className="btn small subtle" onClick=${v} data-testid="wallet-status-retry">Retry</button>
        `}
      </div>
      ${i&&c`<div className="apps-error">${i.replace(/^status: /,"")}</div>`}
      ${a&&c`<div className="apps-ok">${a}</div>`}
      ${n&&N==="absent"&&c`<${ng} rpc=${e} C=${t} onChanged=${w} onError=${r} onNotice=${l} />`}
      ${n&&N==="locked"&&c`<${sg} rpc=${e} C=${t} onChanged=${w} onError=${r} onNotice=${l} />`}
      ${n&&N==="unlocked"&&c`<${ig} rpc=${e} C=${t} status=${n} onChanged=${w} onError=${r} />`}
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
  `}function ag({rpc:e,C:t,status:n,storagePath:s,log:i,appearanceTheme:r,onAppearanceThemeChange:a,activeDriveKey:l="",onBrowse:u}){let[o,h]=(0,d.useState)(null),[g,v]=(0,d.useState)(null),[w,_]=(0,d.useState)(""),[N,E]=(0,d.useState)(null),[y,f]=(0,d.useState)(!1),[p,k]=(0,d.useState)(""),[b,x]=(0,d.useState)(""),[$,S]=(0,d.useState)(!1),[R,D]=(0,d.useState)(""),[H,W]=(0,d.useState)(!1),[G,F]=(0,d.useState)(""),[B,A]=(0,d.useState)(""),J=t?.CMD_GET_IDENTITY??31,P=t?.CMD_IDENTITY_EXPORT_PHRASE??70,ne=t?.CMD_IDENTITY_IMPORT_PHRASE??71,ue=t?.CMD_IDENTITY_VALIDATE_PHRASE??73,O=t?.CMD_DEVICE_LINK_CREATE_INVITE??76,I=t?.CMD_DEVICE_LINK_JOIN??77,Z=t?.CMD_CLEAR_CACHE??30,M=t?.CMD_RESET_APP??29,K=()=>e.request(J).then(h).catch(j=>_(j.message));(0,d.useEffect)(()=>{K()},[]),(0,d.useEffect)(()=>{e.request(t.CMD_USERDATA_GET_SETTINGS).then(j=>S(!!Rt(j)?.experimentalDeviceSync)).catch(()=>{})},[]);let V=async()=>{if(g){v(null);return}_(""),E("reveal");try{let j=await e.request(P);v(j.mnemonic)}catch(j){_(j.message)}finally{E(null)}},T=async()=>{let j=p.trim().split(/\s+/).join(" ");if(j){_(""),x(""),E("restore-validate");try{if(!(await e.request(ue,{mnemonic:j}))?.valid){_("That phrase is not a valid 12 or 24-word BIP-39 mnemonic."),E(null);return}}catch(me){_(`validate: ${me.message}`),E(null);return}if(!confirm(`Restoring will REPLACE this device's identity.

All Hyperbees (bookmarks, history, profile, contacts) on this device stay in place but get re-keyed under the restored identity. This cannot be undone unless you also kept the previous backup phrase.

Proceed?`)){E(null);return}E("restore-apply");try{await e.request(ne,{mnemonic:j},3e4),k(""),f(!1),v(null),x("Identity restored. Your peer key has rotated \u2014 running apps may need to re-pair."),await K()}catch(me){_(`restore: ${me.message}`)}finally{E(null)}}},L=async()=>{_(""),A(""),E("link-invite");try{let j=await e.request(O,{},3e4);D(j.invite)}catch(j){_(`link: ${j.message}`)}finally{E(null)}},ie=async()=>{let j=G.trim();if(j&&confirm(`Linking will REPLACE this device's identity with the one from your other device.

This device's current identity is discarded (make sure its phrase is saved if you need it). Proceed?`)){_(""),A(""),E("link-join");try{await e.request(I,{invite:j,device:"this device"},12e4),F(""),W(!1),A("Device linked \u2014 your peer key has rotated. Restart PearBrowser for the linked identity to take effect."),await K()}catch(me){_(`link: ${me.message}`)}finally{E(null)}}},$e=async()=>{if(confirm("Clear all cached drives + proxy cache? Installed apps and your sites are NOT affected.")){_(""),E("cache");try{let j=await e.request(Z);alert(`Cleared: ${j.message||j.cleared+" items"}`)}catch(j){_(j.message)}finally{E(null)}}},ee=async()=>{if(confirm(`Reset app data?

This will:
  1. Unseed every pinned site from HiveRelay
  2. Wipe all local state (sites, apps, bookmarks, identity)
  3. PERMANENTLY DELETE the testnet wallet on this device \u2014 without its 24-word recovery phrase it is gone forever
  4. Quit the app

Back up your wallet recovery phrase (Settings \u2192 Wallet \u2192 Back up\u2026) and copy any drive keys you want to keep first!`)&&confirm("Are you ABSOLUTELY sure? This cannot be undone.")){_(""),E("reset");try{let j=await e.request(M,{},6e4);alert(`Unseeded ${j.unseeded?.length??0} site(s). App will now quit. Relaunch to start fresh.`)}catch(j){_(j.message)}finally{E(null)}}};return c`
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
            ${["light","dark"].map(j=>c`
              <button
                key=${j}
                type="button"
                className=${"theme-segment"+(r===j?" active":"")}
                aria-pressed=${r===j}
                onClick=${()=>a?.(j)}
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
          <button className="btn" onClick=${V} disabled=${N==="reveal"||!o?.hasBackupPhrase}>
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
          <button className="btn subtle" onClick=${()=>{f(j=>!j),x(""),_("")}}
                  disabled=${N?.startsWith?.("restore")}>
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
              onInput=${j=>k(j.target.value)}
            ></textarea>
            <div className="restore-actions">
              <button className="btn primary" onClick=${T}
                      disabled=${!p.trim()||N?.startsWith?.("restore")}>
                ${N==="restore-validate"?"Checking\u2026":N==="restore-apply"?"Restoring\u2026":"Restore identity"}
              </button>
            </div>
            <div className="settings-warning">This destroys the current identity on disk. Make sure you've saved its phrase first.</div>
          </div>
        `}
        ${b&&c`<div className="apps-ok">${b}</div>`}
      </div>

      <h2>Link a device</h2>
      <p className="subtitle">Move this identity to another device without typing your phrase. Devices pair directly over the P2P network (blind-pairing) — no server, no account. The invite is a one-time secret that hands over your identity, so only share it with your own device.</p>
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Link a new device</div>
            <div className="settings-subtle">Generate an invite here, then paste it into <em>Link this device</em> on your other device to copy this identity across.</div>
          </div>
          <button className="btn" onClick=${L} disabled=${N==="link-invite"||!o?.hasBackupPhrase}>
            ${N==="link-invite"?"Creating\u2026":"Create invite"}
          </button>
        </div>
        ${R&&c`
          <pre className="seed-phrase">${R}</pre>
          <div className="settings-warning">One-time invite — anyone who receives it can adopt your identity. Paste it into your other device now; it expires when you close this screen.</div>
        `}
        <div className="settings-row">
          <div>
            <div className="settings-label">Link this device</div>
            <div className="settings-subtle">Paste an invite from your other device to adopt its identity here. Replaces this device's current identity.</div>
          </div>
          <button className="btn subtle" onClick=${()=>{W(j=>!j),A(""),_("")}}
                  disabled=${N?.startsWith?.("link")}>
            ${H?"Cancel":"Paste invite\u2026"}
          </button>
        </div>
        ${H&&c`
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
                      disabled=${!G.trim()||N==="link-join"}>
                ${N==="link-join"?"Linking\u2026":"Link this device"}
              </button>
            </div>
            <div className="settings-warning">This destroys the current identity on disk. Make sure you've saved its phrase first.</div>
          </div>
        `}
        ${B&&c`<div className="apps-ok">${B}</div>`}
      </div>

      <h2>Profile</h2>
      <p className="subtitle">What apps see when you grant a sign-in. Each field is opt-in — leave blank to share nothing.</p>
      <${qh} rpc=${e} C=${t} />

      <h2>Permission Center</h2>
      <p className="subtitle">Persistent app grants grouped by drive: sign-in, profile fields, contacts, and arbitrary swarm topics.</p>
      <${Gh} rpc=${e} C=${t} />

      <h2>Content Shield</h2>
      <p className="subtitle">Brave-style ad and tracker blocking, enforced inside the browser's own proxy — blocked requests never reach a peer, a relay, or the network. Named filter lists hot-swap offline; per-drive allowlist and strict mode live here; Pear Plugins feed the same engine with a kill switch.</p>
      <${Jh} rpc=${e} C=${t} activeDriveKey=${l} onBrowse=${u} />

      <h2>Clearnet &amp; privacy</h2>
      <p className="subtitle">Browse https:// sites through the browser-owned clearnet proxy (shields on) or direct load. Privacy ladder: HTTPS-only upgrades, tracking-parameter stripping, referrer policy, fingerprint farbling, third-party cookie isolation in proxy mode.</p>
      <${Zh} rpc=${e} C=${t} />

      <h2>Wallet</h2>
      <p className="subtitle">The built-in testnet wallet (USD₮0 on Stable Testnet — no real funds). Create or import it here, unlock it with your passphrase, back up the recovery phrase, and manage which apps may connect.</p>
      <${rg} rpc=${e} C=${t} />

      <h2>Relays</h2>
      <p className="subtitle">HiveRelay endpoints used for fast first-paint and persistence. Hybrid mode falls back to pure P2P if a relay is down.</p>
      <${Wh} rpc=${e} C=${t} />

      <h2>Nostr identity</h2>
      <p className="subtitle">A portable Nostr key (npub), linked to your pear identity by a mutual, revocable attestation. "Linked (attested)" is a trust assertion the two keys mutually signed — never proof of the same person.</p>
      <${jh} rpc=${e} C=${t} />

      <h2>Nostr feed</h2>
      <p className="subtitle">Post NIP-01 notes signed with your Nostr key. Toggle "Include trusted contacts" to also see notes a verified contact authored with their attested Nostr key, replicated peer-to-peer.</p>
      <${Yh} rpc=${e} C=${t} />

      <h2>Name registry</h2>
      <p className="subtitle">Claim memorable names that resolve to your drives or app links — type the name (or pearname://name) in the URL bar. Owner-signed, durable across devices, first-claim-wins with a homograph guard.</p>
      <${Qh} rpc=${e} C=${t} />

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
          <button className="btn subtle" onClick=${$e} disabled=${N==="cache"}>Clear cache</button>
        </div>
      </div>

      <h2>Experimental</h2>
      <p className="subtitle">Early features behind a flag. They may change, break, or be removed.</p>
      <${tg} rpc=${e} C=${t} onDeviceSyncChange=${S} />

	      ${$&&c`<div className="settings-section-device-sync">
	        <h2>Device sync <span className="settings-subtle">(experimental)</span></h2>
	        <p className="subtitle">Your bookmarks, encrypted and synced across your own devices — no server, no account. Set up sync here, then pair your other devices with the invite.</p>
	        <${Xh} rpc=${e} C=${t} />
	      </div>`}

      <h2>Danger zone</h2>
      <div className="settings-card danger">
        <div className="settings-row">
          <div>
            <div className="settings-label">Reset app data</div>
            <div className="settings-subtle">Unseeds every published site from HiveRelay first (only possible while your publisher keypair is intact), then wipes local storage and quits. You'll start fresh on next launch. <strong>Copy your drive keys before doing this.</strong> <strong>This also deletes the testnet wallet on this device</strong> — back up its 24-word recovery phrase (Wallet → Back up…) first, or the wallet is unrecoverable.</div>
          </div>
          <button className="btn subtle danger" onClick=${ee} disabled=${N==="reset"}>${N==="reset"?"Resetting\u2026":"Reset data"}</button>
        </div>
      </div>

      <h2>Boot log</h2>
      <pre className="boot-log">${i.join(`
`)||"(events arrived pre-mount \u2014 check status above)"}</pre>
    </div>
  `}var Hm={heading:()=>({type:"heading",level:1,text:"New heading"}),text:()=>({type:"text",text:"Write something."}),image:()=>({type:"image",src:"https://",alt:""}),link:()=>({type:"link",href:"https://",text:"Link text"}),html:()=>({type:"html",text:`<div>
  <!-- Raw HTML / CSS / JS \u2014 rendered as-is -->
</div>`}),code:()=>({type:"code",text:"// code sample \u2014 shown as text"}),quote:()=>({type:"quote",text:"A quote."}),list:()=>({type:"list",items:["Item 1","Item 2"]}),divider:()=>({type:"divider"})};function lg({block:e,onChange:t}){let n=s=>t({...e,...s});switch(e.type){case"heading":return c`
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
`)})}></textarea>`;case"divider":return c`<div className="placeholder">— divider —</div>`;default:return c`<div className="placeholder">unknown block: ${e.type}</div>`}}function og({site:e,rpc:t,C:n,onBack:s,onBrowse:i}){let[r,a]=(0,d.useState)(e.name||""),[l,u]=(0,d.useState)(e.blocks||[]),[o,h]=(0,d.useState)(null),[g,v]=(0,d.useState)(""),[w,_]=(0,d.useState)({keyHex:e.keyHex,published:e.published}),[N,E]=(0,d.useState)(!e.published);(0,d.useEffect)(()=>{N||!e.siteId||(async()=>{try{let H=await t.request(n.CMD_GET_SITE_BLOCKS,{siteId:e.siteId});Array.isArray(H?.blocks)&&H.blocks.length>0&&u(H.blocks)}catch{}E(!0)})()},[e.siteId]);let y=H=>u(W=>[...W,Hm[H]()]),f=(H,W)=>u(G=>G.map((F,B)=>B===H?W:F)),p=H=>u(W=>W.filter((G,F)=>F!==H)),k=(H,W)=>u(G=>{let F=H+W;if(F<0||F>=G.length)return G;let B=[...G];return[B[H],B[F]]=[B[F],B[H]],B}),b=async()=>{v(""),h("save");try{await t.request(n.CMD_UPDATE_SITE,{siteId:e.siteId,blocks:l,name:r})}catch(H){v(`save: ${H.message}`)}finally{h(null)}},x=async()=>{v(""),h("publish");try{await t.request(n.CMD_UPDATE_SITE,{siteId:e.siteId,blocks:l,name:r});let H=await t.request(n.CMD_PUBLISH_SITE,{siteId:e.siteId},12e4);_({keyHex:H.keyHex,published:!0,pin:H.pin})}catch(H){v(`publish: ${H.message}`)}finally{h(null)}},$=async()=>{v(""),h("unpublish");try{await t.request(n.CMD_UNPUBLISH_SITE,{siteId:e.siteId}),_(H=>({...H,published:!1}))}catch(H){v(`unpublish: ${H.message}`)}finally{h(null)}},[S,R]=(0,d.useState)(!1);return c`
    <div className="site-editor">
      <div className="site-editor-bar">
        <button className="btn subtle" onClick=${s}>← Sites</button>
        <input className="site-name-input" type="text" placeholder="Site name" value=${r} onInput=${H=>a(H.target.value)} />
        <div className="spacer"></div>
        <label className="btn subtle" title="Upload a site icon (SVG/PNG/JPEG/WebP, ≤512KB) — shows in the browser's site list">
          ${o==="icon"?"Uploading\u2026":S?"\u2713 Icon set":"\u{1F5BC} Icon"}
          <input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" style=${{display:"none"}} onChange=${H=>{let W=H.target.files&&H.target.files[0];if(!W)return;if(W.size>512*1024){v("icon: too large (max 512KB)"),H.target.value="";return}let G=new FileReader;G.onload=async()=>{v(""),R(!1),h("icon");try{await t.request(n.CMD_SET_SITE_ICON,{siteId:e.siteId,dataUrl:G.result}),R(!0),setTimeout(()=>R(!1),2500)}catch(F){v(`icon: ${F.message}`)}finally{h(null),H.target&&(H.target.value="")}},G.readAsDataURL(W)}} />
        </label>
        <button className="btn" onClick=${b} disabled=${o==="save"} title="Write block changes to the drive — peers see updates live">${o==="save"?"Saving\u2026":"Save"}</button>
        ${w.published?c`<button key="unpublish" className="btn subtle" onClick=${$} disabled=${o==="unpublish"}>${o==="unpublish"?"Unpublishing\u2026":"Unpublish"}</button>`:c`<button key="publish" className="btn primary" onClick=${x} disabled=${o==="publish"} title="Seeds via Hyperswarm and pins to HiveRelay for 24/7 availability">${o==="publish"?"Publishing\u2026":"Publish & Pin"}</button>`}
      </div>

      ${g&&c`<div className="apps-error">${g}</div>`}

      ${w.published&&w.keyHex&&c`
        <div className="site-published">
          <div className="site-published-row">
            <span>Published at</span>
            <code>hyper://${w.keyHex}/</code>
            <button className="btn small" onClick=${()=>Ui(`hyper://${w.keyHex}/`)} title="Copy hyper:// URL">📋 Copy</button>
            <button className="btn" onClick=${()=>i(`hyper://${w.keyHex}/`)}>Open in Browse</button>
          </div>
          <div className="site-published-row subtle">
            <span>Drive key</span>
            <code className="key-mono">${w.keyHex}</code>
            <button className="btn small subtle" onClick=${()=>Ui(w.keyHex)} title="Copy raw key">📋 Key</button>
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
        ${l.map((H,W)=>c`
          <div className="block" key=${W}>
            <div className="block-header">
              <span className="block-type">${H.type}</span>
              <div className="spacer"></div>
              <button className="btn subtle small" onClick=${()=>k(W,-1)} disabled=${W===0}>↑</button>
              <button className="btn subtle small" onClick=${()=>k(W,1)} disabled=${W===l.length-1}>↓</button>
              <button className="btn subtle small" onClick=${()=>p(W)}>✕</button>
            </div>
            <${lg} block=${H} onChange=${G=>f(W,G)} />
          </div>
        `)}
      </div>

      <div className="add-block-row">
        <span className="placeholder">Add:</span>
        ${Object.keys(Hm).map(H=>c`
          <button key=${H} className="btn subtle small" onClick=${()=>y(H)}>${H}</button>
        `)}
      </div>
    </div>
  `}function cg({rpc:e,C:t,onBrowse:n,placeholder:s}){let[i,r]=(0,d.useState)(""),[a,l]=(0,d.useState)(null),[u,o]=(0,d.useState)(0),[h,g]=(0,d.useState)(!1),[v,w]=(0,d.useState)(!1),[_,N]=(0,d.useState)(!1),[E,y]=(0,d.useState)(null),[f,p]=(0,d.useState)(""),k=(0,d.useRef)(0),b=async()=>{let S=i.trim();if(!S){l(null),N(!1),y(null);return}g(!0),N(!1),y(null);try{let R=await e.request(t.CMD_SEARCH,{query:S,limit:50,federated:v});k.current=R?.queryId||0,l(Array.isArray(R?.results)?R.results:[]),o(R?.stats?.docs||0),R?.federating&&N(!0)}catch(R){p(`search: ${R.message}`)}finally{g(!1)}},x=S=>S&&S.link?S.link:S&&/^(?:pear|file|hyper):\/\//i.test(S.driveKey||"")?S.driveKey:`hyper://${S.driveKey}${S.path&&S.path!=="/"?S.path:"/"}`,$=S=>!S.tier||S.tier==="self"?c`<span className="src-badge self">you</span>`:S.tier==="followed"?c`<span className="src-badge followed">trusted · hop ${S.trustHop??1}</span>`:c`<span className="src-badge other">${S.tier}</span>`;return(0,d.useEffect)(()=>{let S=R=>{let D=R&&R.detail||{};D.queryId===k.current&&(Array.isArray(D.results)&&l(D.results),y(D),N(!1))};return e.addEventListener(`event:${t.EVT_SEARCH_FEDERATED}`,S),()=>e.removeEventListener(`event:${t.EVT_SEARCH_FEDERATED}`,S)},[]),c`
    <div className="fed-search">
      ${f&&c`<div className="apps-error">${f}</div>`}
      <div className="urlbar" style=${{marginBottom:"10px"}}>
        <input type="text" className="url-input"
          placeholder=${s||"Search the peer-to-peer web\u2026"}
          value=${i}
          onInput=${S=>r(S.target.value)}
          onKeyDown=${S=>S.key==="Enter"&&b()} />
        <button className="btn primary" onClick=${b} disabled=${h||!i.trim()}>${h?"Searching\u2026":"Search"}</button>
      </div>
      <label className="search-fed-toggle">
        <input type="checkbox" checked=${v} onChange=${S=>w(S.target.checked)} />
        Include trusted peers${_?c` <span className="fed-status">· searching peers…</span>`:""}
        <${Xm} meta=${E} />
      </label>
      ${u?c`<span className="search-indexed" style=${{marginLeft:"10px",opacity:.6,fontSize:"12px"}}>${u} page(s) indexed</span>`:""}
      ${a!==null&&(a.length===0?c`<p className="placeholder">No matches${u===0?" yet \u2014 browse some hyper:// pages first to build your index.":"."}</p>`:c`<div className="library-list">
            ${a.map(S=>c`
              <div className="library-row" key=${S.docId||S.driveKey+S.path}>
                <div className="library-row-main">
                  <div className="library-title">${S.title||x(S)}${v?$(S):""}</div>
                  <div className="library-url">${x(S)}</div>
                </div>
                <button className="btn small" onClick=${()=>n(x(S))}>Open</button>
              </div>
            `)}
          </div>`)}
    </div>
  `}function ug({rpc:e,C:t,onBrowse:n}){let[s,i]=(0,d.useState)([]),[r,a]=(0,d.useState)(null),[l,u]=(0,d.useState)(null),[o,h]=(0,d.useState)(""),[g,v]=(0,d.useState)(""),w=(0,d.useRef)({el:null}),_=b=>{w.current.el=b},N=async()=>{try{let b=await e.request(t.CMD_LIST_SITES);i(Array.isArray(b)?b:b?.sites??[])}catch(b){h(`list: ${b.message}`)}},[E,y]=(0,d.useState)([]),f=async()=>{try{let b=await e.request(t.CMD_GET_CATALOG_APPS),$=(Array.isArray(b)?b:b?.apps??[]).filter(D=>D&&typeof D.driveKey=="string"&&/^[0-9a-f]{64}$/i.test(D.driveKey)),S=D=>D.driveKey===Vm?0:Array.isArray(D.categories)&&D.categories.includes("featured")?1:2,R=$c($).map((D,H)=>({a:D,i:H})).sort((D,H)=>S(D.a)-S(H.a)||D.i-H.i).map(D=>D.a);y(R)}catch{}};(0,d.useEffect)(()=>{N(),f()},[]);let p=async()=>{if(l==="create")return;let b=document.querySelector(".site-name-field"),$=(b?.value??"").trim()||"Untitled";h(""),u("create");try{let S=await e.request(t.CMD_CREATE_SITE,{name:$},12e4);b&&(b.value=""),await N(),a({siteId:S.siteId??S.id,name:$,blocks:[]})}catch(S){h(`create: ${S.message}`)}finally{u(null)}},k=async b=>{if(confirm(`Delete "${b.name}"?`)){h(""),u(`del:${b.siteId}`);try{await e.request(t.CMD_DELETE_SITE,{siteId:b.siteId}),await N()}catch(x){h(`delete: ${x.message}`)}finally{u(null)}}};return r?c`<${og} site=${r} rpc=${e} C=${t} onBack=${()=>{a(null),N()}} onBrowse=${n} />`:c`
    <div className="sites">
      <h1>P2P Sites</h1>
      <p className="subtitle">Search the peer-to-peer web, browse published sites, or create your own — all served 24/7 on the HiveRelay network.</p>

      <h2>Search the P2P web</h2>
      <${cg} rpc=${e} C=${t} onBrowse=${n} placeholder="Search the peer-to-peer web…" />

      <h2>Published sites${E.length?` (${E.length})`:""}</h2>
      <p className="subtitle">Live hyper:// sites pinned on the relay network — open any one in a tab.</p>
      ${E.length===0?c`<p className="placeholder">Loading published sites…</p>`:c`<div className="app-grid">
            ${E.map(b=>c`
              <div className="app-card" key=${b.driveKey}>
                <${Oi} rpc=${e} C=${t} driveKey=${b.driveKey} iconRef=${b.icon} iconData=${b.iconData} name=${b.name} />
                <div className="app-info">
                  <div className="app-name">${b.name}</div>
                  <div className="app-meta">${b.description||"hyper://"+b.driveKey.slice(0,10)+"\u2026"}</div>
                </div>
                <div className="app-actions">
                  <button className="btn primary" onClick=${()=>n("hyper://"+b.driveKey+"/")}>Open</button>
                  <button className="btn subtle" onClick=${()=>Ui("hyper://"+b.driveKey+"/")}>📋 Copy</button>
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
      ${o&&c`<div className="apps-error">${o}</div>`}

      ${s.length===0?c`<p className="placeholder">No sites yet. Create one above.</p>`:c`<div className="app-grid">
            ${s.map(b=>c`
              <div className="app-card" key=${b.siteId}>
                <${Oi} rpc=${e} C=${t} driveKey=${b.keyHex} name=${b.name} />
                <div className="app-info">
                  <div className="app-name">${b.name}</div>
                  <div className="app-meta">${b.published?"published \xB7 "+(b.keyHex?.slice(0,8)??"")+"\u2026":"draft"}</div>
                </div>
                <div className="app-actions">
                  <button className="btn" onClick=${()=>a(b)}>Edit</button>
                  ${b.published&&b.keyHex&&c`<button className="btn subtle" onClick=${()=>n(`hyper://${b.keyHex}/`)}>Open</button>`}
                  ${b.published&&b.keyHex&&c`<button className="btn subtle" onClick=${()=>Ui(`hyper://${b.keyHex}/`)}>📋 Copy</button>`}
                  <button className="btn subtle" onClick=${()=>k(b)} disabled=${l===`del:${b.siteId}`}>Delete</button>
                </div>
              </div>
            `)}
          </div>`}
    </div>
  `}function Zm({rpc:e,C:t,storagePath:n}){let[s,i]=(0,d.useState)("browse"),[r,a]=(0,d.useState)(null),[l,u]=(0,d.useState)(()=>_a(hc())),[o,h]=(0,d.useState)({stage:"booting",peerCount:0,dhtConnected:!1,ready:!1,proxyPort:null}),[g,v]=(0,d.useState)([]),[w,_]=(0,d.useState)(null),[N,E]=(0,d.useState)(null),[y,f]=(0,d.useState)(null),[p,k]=(0,d.useState)(null),[b,x]=(0,d.useState)("pending"),[$,S]=(0,d.useState)(()=>gc.map(O=>Mi(O.url,{title:O.title}))),[R,D]=(0,d.useState)(()=>"placeholder"),[H,W]=(0,d.useState)(()=>[]),[G,F]=(0,d.useState)(!1);(0,d.useEffect)(()=>{let O=ee=>v(j=>[...j.slice(-200),ee]),I=ee=>{O(`[${ee.detail.stage}] ${ee.detail.message||""}`),h(j=>({...j,stage:ee.detail.stage}))},Z=ee=>{O(`[ready] HTTP proxy on port ${ee.detail.port}`),h(j=>({...j,ready:!0,proxyPort:ee.detail.port,stage:"ready"})),e.request(t.CMD_GET_IDENTITY).then(k).catch(()=>{}),e.request(t.CMD_USERDATA_GET_SETTINGS).then(j=>{let me=Rt(j);u(_a(me?.[Mm]||hc())),x(me?.onboardingDone?"done":"show");let mt=Array.isArray(me?.browseTabs)?me.browseTabs:null;if(mt&&mt.length>0){let Le=Em(mt,gc);Le.tabs.length>0&&(S(Le.tabs),D(Le.activeId))}let Wn=(Array.isArray(me?.browseClosedTabs)?me.browseClosedTabs:[]).map(Le=>As(Le)).filter(Boolean).slice(0,ya);W(Wn)}).catch(()=>{x("done")}).finally(()=>{F(!0)})},M=ee=>h(j=>({...j,peerCount:ee.detail.peerCount})),K=ee=>O(`[error] ${ee.detail?.message||JSON.stringify(ee.detail)}`),V=ee=>{O(`[login] ${ee.detail?.appName||ge(ee.detail?.driveKey)} requested ${(ee.detail?.scopes||[]).join(",")||"sign-in"}`),_(ee.detail)},T=ee=>{O(`[swarm] ${ee.detail?.appName||ge(ee.detail?.driveKey)} wants topic ${ge(ee.detail?.topicHex||"")}`),E(ee.detail)},L=ee=>{O(`[wallet] ${ee.detail?.type} consent requested by ${ge(ee.detail?.driveKey||"")}`),f(ee.detail)},ie=ee=>{O(`[wallet] intent ${ee.detail?.intentId} \u2192 ${ee.detail?.state}`)};e.addEventListener(`event:${t.EVT_BOOT_PROGRESS}`,I),e.addEventListener(`event:${t.EVT_READY}`,Z),e.addEventListener(`event:${t.EVT_PEER_COUNT}`,M),e.addEventListener(`event:${t.EVT_ERROR}`,K),e.addEventListener(`event:${t.EVT_LOGIN_REQUEST}`,V),e.addEventListener(`event:${t.EVT_SWARM_REQUEST}`,T),e.addEventListener(`event:${t.EVT_WALLET_CONNECT_REQUEST}`,L),e.addEventListener(`event:${t.EVT_WALLET_PAYMENT_REQUEST}`,L),e.addEventListener(`event:${t.EVT_WALLET_TX_UPDATE}`,ie);let $e=setInterval(async()=>{try{let ee=await e.request(t.CMD_GET_STATUS);h(j=>({...j,...ee}))}catch{}},3e3);return()=>{clearInterval($e),e.removeEventListener(`event:${t.EVT_BOOT_PROGRESS}`,I),e.removeEventListener(`event:${t.EVT_READY}`,Z),e.removeEventListener(`event:${t.EVT_PEER_COUNT}`,M),e.removeEventListener(`event:${t.EVT_ERROR}`,K),e.removeEventListener(`event:${t.EVT_LOGIN_REQUEST}`,V),e.removeEventListener(`event:${t.EVT_SWARM_REQUEST}`,T),e.removeEventListener(`event:${t.EVT_WALLET_CONNECT_REQUEST}`,L),e.removeEventListener(`event:${t.EVT_WALLET_PAYMENT_REQUEST}`,L),e.removeEventListener(`event:${t.EVT_WALLET_TX_UPDATE}`,ie)}},[e,t]),(0,d.useEffect)(()=>{if(!G)return;let O=setTimeout(()=>{let I=$.map(M=>Sm(M,R)),Z=H.map(M=>As(M)).filter(Boolean).slice(0,ya);e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{browseTabs:I,browseClosedTabs:Z}}).catch(()=>{})},800);return()=>clearTimeout(O)},[$,H,R,G,e,t]);let B=O=>{a(O),i("browse")},A=O=>{let I=_a(O);u(I),e.request(t.CMD_USERDATA_SET_SETTINGS,{updates:{[Mm]:I}}).catch(Z=>{v(M=>[...M.slice(-200),`[settings] theme save failed: ${Z.message}`])})},J=()=>{A(l==="dark"?"light":"dark")},P=o.ready||!!o.proxyPort,ne=P?o.dhtConnected?"ok":"err":"booting",ue=P?`DHT \xB7 ${o.peerCount} peer${o.peerCount===1?"":"s"} \xB7 ${o.hiveRelays||0} relay${o.hiveRelays===1?"":"s"} \xB7 proxy :${o.proxyPort}`:`Booting: ${o.stage}`;return c`
    <div className=${`app theme-${l}`} data-theme=${l}>
      <div className="topbar">
        <div className="brand">
          <${Ai} size=${22} />
          <${da} />
        </div>
        <div className="tabs">
          ${Object.entries(oh).map(([O,I])=>c`
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
        ${s==="browse"&&c`<${bh} rpc=${e} C=${t} navUrl=${r} onNavigated=${()=>a(null)} tabs=${$} setTabs=${S} activeId=${R} setActiveId=${D} closedTabs=${H} setClosedTabs=${W} sessionReady=${G} onOpenSettings=${()=>i("settings")} />`}
        ${s==="apps"&&c`<${Uh} rpc=${e} C=${t} onLaunch=${B} />`}
        ${s==="sites"&&c`<${ug} rpc=${e} C=${t} onBrowse=${B} />`}
        ${s==="library"&&c`<${Kh} rpc=${e} C=${t} onBrowse=${B} />`}
        ${s==="settings"&&c`<${ag} rpc=${e} C=${t} status=${o} storagePath=${n} log=${g} appearanceTheme=${l} onAppearanceThemeChange=${A} activeDriveKey=${$.find(O=>O.id===R)&&Di($.find(O=>O.id===R))||""} onBrowse=${B} />`}
      </div>

      <div className=${"status "+ne}>
        <span className="dot"></span>${ue}
      </div>

      ${w&&c`<${kh}
        rpc=${e}
        C=${t}
        request=${w}
        identity=${p}
        onClose=${()=>_(null)}
      />`}

      ${N&&c`<${_h}
        rpc=${e}
        C=${t}
        request=${N}
        identity=${p}
        onClose=${()=>E(null)}
      />`}

      ${y&&c`<${Eh}
        rpc=${e}
        C=${t}
        request=${y}
        onClose=${()=>f(null)}
      />`}

      ${b==="show"&&c`<${Th}
        rpc=${e}
        C=${t}
        onPickSite=${O=>B(O)}
        onClose=${()=>x("done")}
      />`}
    </div>
  `}var Ca=class extends EventTarget{constructor(t){super(),this._pipe=t,this._nextId=1,this._pending=new Map,this._buffer="",this._connected=t.connected!==!1,t.on("data",n=>this._onData(n)),t.on("open",()=>{this._connected=!0,this.dispatchEvent(new CustomEvent("open"))}),t.on("close",()=>{this._disconnect("RPC connection closed"),this.dispatchEvent(new CustomEvent("close"))}),t.on("error",n=>{this._disconnect("RPC connection failed"),this.dispatchEvent(new CustomEvent("error",{detail:n}))})}request(t,n={},s=3e4){return t==null?Promise.reject(new Error("RPC command is missing. Renderer constants are out of sync with backend/constants.js.")):this._connected?new Promise((i,r)=>{let a=this._nextId++,l=setTimeout(()=>{this._pending.has(a)&&(this._pending.delete(a),r(new Error(`RPC timeout: ${t}`)))},s);this._pending.set(a,{resolve:i,reject:r,timer:l});try{this._send({id:a,cmd:t,data:n})}catch(u){clearTimeout(l),this._pending.delete(a),r(u)}}):Promise.reject(new Error(`RPC unavailable: ${t} (backend disconnected; reconnecting)`))}on(t,n){return this.addEventListener(t,s=>n(s.detail)),this}_send(t){let n=JSON.stringify(t),s=n.length.toString(16).padStart(8,"0")+n;if(this._pipe.write(s)===!1)throw new Error("RPC connection is not writable")}_disconnect(t){this._connected=!1;for(let n of this._pending.values())clearTimeout(n.timer),n.reject(new Error(t));this._pending.clear()}_onData(t){for(this._buffer+=typeof t=="string"?t:t.toString();this._buffer.length>=8;){let n=parseInt(this._buffer.slice(0,8),16);if(isNaN(n)||n<=0){this._buffer="";return}if(this._buffer.length<8+n)break;let s=this._buffer.slice(8,8+n);this._buffer=this._buffer.slice(8+n);let i;try{i=JSON.parse(s)}catch{continue}this._dispatch(i)}}_dispatch(t){if(t.id&&(t.result!==void 0||t.error)){let n=this._pending.get(t.id);n&&(clearTimeout(n.timer),this._pending.delete(t.id),t.error?n.reject(new Error(t.error)):n.resolve(t.result));return}t.event&&(this.dispatchEvent(new CustomEvent(`event:${t.event}`,{detail:t.data})),this.dispatchEvent(new CustomEvent("event",{detail:{name:t.event,data:t.data}})))}};var Ta=9876,ef=5,tf=900000001,wc=String(globalThis.pearbrowserRuntime?.sessionToken||""),nf={CMD_NAVIGATE:1,CMD_GET_STATUS:2,CMD_GET_DRIVE_INFO:3,CMD_RELEASE_ORIGIN:4,CMD_LOAD_CATALOG:10,CMD_INSTALL_APP:11,CMD_UNINSTALL_APP:12,CMD_LAUNCH_APP:13,CMD_LIST_INSTALLED:14,CMD_CHECK_UPDATES:15,CMD_LOAD_CATALOG_BEE:16,CMD_GET_CATALOG_APPS:17,CMD_UNLOAD_CATALOG:18,CMD_LOAD_CATALOG_AUTOBEE:19,CMD_SHEETS_LOAD:170,CMD_SHEETS_LIST:171,CMD_SHEETS_LIST_SCHEMAS:175,CMD_LOAD_CATALOG_INDEX:176,CMD_SEARCH:177,CMD_SEARCH_INDEX:178,CMD_CREATE_SITE:20,CMD_UPDATE_SITE:21,CMD_PUBLISH_SITE:22,CMD_UNPUBLISH_SITE:23,CMD_LIST_SITES:24,CMD_DELETE_SITE:25,CMD_LOAD_TEMPLATE:26,CMD_GET_SITE_BLOCKS:27,CMD_LEGACY_APP_MIGRATION:28,CMD_RUN_APP_IN_TAB:201,CMD_RESET_APP:29,CMD_CLEAR_CACHE:30,CMD_GET_IDENTITY:31,CMD_GET_APP_ICON:32,CMD_SET_SITE_ICON:33,CMD_GET_RELAYS:40,CMD_SET_RELAYS:41,CMD_SET_RELAY_ENABLED:42,CMD_CHECK_RELAY_CAPABILITY:43,CMD_USERDATA_LIST_BOOKMARKS:50,CMD_USERDATA_ADD_BOOKMARK:51,CMD_USERDATA_REMOVE_BOOKMARK:52,CMD_USERDATA_LIST_HISTORY:53,CMD_USERDATA_ADD_HISTORY:54,CMD_USERDATA_CLEAR_HISTORY:55,CMD_USERDATA_GET_SETTINGS:56,CMD_USERDATA_SET_SETTINGS:57,CMD_USERDATA_GET_SESSION:58,CMD_USERDATA_SAVE_SESSION:59,CMD_USERDATA_IMPORT:60,CMD_IDENTITY_EXPORT_PHRASE:70,CMD_IDENTITY_IMPORT_PHRASE:71,CMD_IDENTITY_ROTATE:72,CMD_IDENTITY_VALIDATE_PHRASE:73,CMD_IDENTITY_SIGN:74,CMD_IDENTITY_VERIFY:75,CMD_PROFILE_GET:80,CMD_PROFILE_UPDATE:81,CMD_PROFILE_CLEAR:82,CMD_LOGIN_LIST_GRANTS:83,CMD_LOGIN_REVOKE_GRANT:84,CMD_LOGIN_REVOKE_ALL:85,CMD_LOGIN_RESOLVE:86,CMD_CONTACTS_LIST:90,CMD_CONTACTS_LOOKUP:91,CMD_CONTACTS_ADD:92,CMD_CONTACTS_UPDATE:93,CMD_CONTACTS_REMOVE:94,CMD_CONTACTS_MY_INVITE:95,CMD_CONTACTS_ADD_INVITE:96,CMD_STOP:99,CMD_SWARM_RESOLVE:120,CMD_SWARM_LIST_GRANTS:121,CMD_SWARM_REVOKE_GRANT:122,CMD_SWARM_REVOKE_ALL_FOR_APP:123,CMD_MYCATALOG_GET:150,CMD_MYCATALOG_CREATE:151,CMD_MYCATALOG_ADD_APP:152,CMD_MYCATALOG_REMOVE_APP:153,CMD_MYCATALOG_RENAME:154,CMD_MYCATALOG_UPDATE_APP:155,CMD_AUTOBEE_CREATE:160,CMD_AUTOBEE_GET:161,CMD_AUTOBEE_ADD_APP:162,CMD_AUTOBEE_REMOVE_APP:163,CMD_AUTOBEE_RENAME:164,CMD_AUTOBEE_ADD_WRITER:165,CMD_SYNC_STATUS:180,CMD_SYNC_CREATE:181,CMD_SYNC_JOIN:182,CMD_SYNC_ADD_WRITER:183,CMD_SYNC_GET_BOOKMARKS:184,CMD_SYNC_ADD_BOOKMARK:185,CMD_SYNC_REMOVE_BOOKMARK:186,CMD_SYNC_PUSH_LOCAL:187,CMD_NAME_RESOLVE:250,CMD_NAME_PETNAME_LIST:251,CMD_NAME_PETNAME_SET:252,CMD_NAME_PETNAME_REMOVE:253,CMD_NAMEREG_CLAIM:264,CMD_NAMEREG_ROTATE:265,CMD_NAMEREG_RELEASE:266,CMD_NAMEREG_REVOKE:267,CMD_NAMEREG_LIST:268,CMD_NAMEREG_RESOLVE:269,CMD_NAMEREG_STATUS:270,CMD_IDENTITY_BINDING_PUBLISH:260,CMD_IDENTITY_BINDING_RESOLVE:261,CMD_SEARCH_FEDERATED:262,CMD_NOSTR_GET_IDENTITY:188,CMD_NOSTR_BIND:189,CMD_NOSTR_REVOKE:190,CMD_NOSTR_PUBLISH:191,CMD_NOSTR_QUERY:192,CMD_SUBMIT_APP:210,CMD_MOD_PENDING:211,CMD_MOD_APPROVE:212,CMD_MOD_REJECT:213,CMD_MOD_REVIEW:214,CMD_ASK_BROWSER_CAPABILITIES:220,CMD_ASK_BROWSER_START:221,CMD_ASK_BROWSER_CANCEL:222,CMD_SHIELD_STATUS:230,CMD_SHIELD_LOAD_LIST:231,CMD_SHIELD_REMOVE_LIST:232,CMD_SHIELD_SET_ALLOW:233,CMD_SHIELD_SET_STRICT:234,CMD_PLUGIN_LIST:235,CMD_PLUGIN_SET_ENABLED:236,CMD_PLUGIN_REGISTER:237,CMD_SHIELD_SUBSCRIBE_LIST:239,CMD_SHIELD_UNSUBSCRIBE_LIST:240,CMD_SHIELD_REFRESH_LISTS:241,CMD_PLUGIN_INSTALL_DRIVE:242,CMD_PLUGIN_UPDATE_DRIVE:243,CMD_PLUGIN_UNINSTALL:244,CMD_PLUGIN_CATALOG:245,CMD_PLUGIN_CATALOG_LOAD_DRIVE:246,CMD_PLUGIN_CATALOG_REMOVE_SOURCE:247,CMD_PRIVACY_STATUS:238,CMD_WALLET_STATUS:300,CMD_WALLET_CREATE:301,CMD_WALLET_IMPORT:302,CMD_WALLET_BACKUP:303,CMD_WALLET_UNLOCK:304,CMD_WALLET_LOCK:305,CMD_WALLET_ADDRESS:306,CMD_WALLET_BALANCES:307,CMD_WALLET_TRANSACTIONS:308,CMD_WALLET_CONNECTIONS_LIST:309,CMD_WALLET_CONNECTION_REVOKE:310,CMD_WALLET_CONNECT_RESOLVE:311,CMD_WALLET_PAYMENT_RESOLVE:312,CMD_WALLET_RECONCILE:313,CMD_BRIDGE:200,EVT_READY:100,EVT_PEER_COUNT:101,EVT_ERROR:102,EVT_INSTALL_PROGRESS:103,EVT_SITE_PUBLISHED:104,EVT_BOOT_PROGRESS:105,EVT_LOGIN_REQUEST:106,EVT_SWARM_REQUEST:107,EVT_SEARCH_FEDERATED:108,EVT_IDENTITY_BINDING_PUBLISHED:109,EVT_LAUNCH_PROGRESS:110,EVT_ASK_BROWSER_STREAM:111,EVT_WALLET_CONNECT_REQUEST:112,EVT_WALLET_PAYMENT_REQUEST:113,EVT_WALLET_TX_UPDATE:114},Nc=class{constructor(t,n={}){this._listeners={data:[],close:[],error:[],open:[],reconnecting:[],"reconnect-failed":[]},this._url=t,this._connected=!1,this._connecting=!1,this._destroyed=!1,this._reconnectEnabled=!1,this._reconnectTimer=null,this._reconnectAttempt=0,this._maxReconnectAttempts=Number.isInteger(n.maxReconnectAttempts)?n.maxReconnectAttempts:8,this._reconnectBaseMs=Number.isFinite(n.reconnectBaseMs)?n.reconnectBaseMs:100,this._reconnectMaxMs=Number.isFinite(n.reconnectMaxMs)?n.reconnectMaxMs:1e3,this._failedSocket=null,this._ws=null,this._connect()}get connected(){return this._connected}enableReconnect(){this._destroyed||(this._reconnectEnabled=!0,!this._connected&&!this._connecting&&this._scheduleReconnect())}destroy(){this._destroyed=!0,this._reconnectEnabled=!1,this._connected=!1,this._connecting=!1,this._reconnectTimer&&clearTimeout(this._reconnectTimer),this._reconnectTimer=null;let t=this._ws;this._ws=null;try{t?.close()}catch{}}_emit(t,n){for(let s of this._listeners[t]||[])s(n)}_connect(){if(this._destroyed||this._connecting||this._connected)return;this._connecting=!0,console.log("[ws] connecting to local backend");let t=new globalThis.WebSocket(this._url);this._ws=t,this._failedSocket=null,t.binaryType="arraybuffer",t.addEventListener("open",()=>{if(this._destroyed||t!==this._ws){try{t.close()}catch{}return}console.log("[ws] open"),this._connecting=!1,this._connected=!0,this._reconnectAttempt=0,this._emit("open")}),t.addEventListener("message",n=>{if(t!==this._ws||!this._connected)return;let s=typeof n.data=="string"?n.data:new TextDecoder().decode(n.data);this._emit("data",s)}),t.addEventListener("close",n=>{console.log("[ws] close",n.code,n.reason),this._handleDisconnect(t)}),t.addEventListener("error",n=>{console.error("[ws] error",n),this._handleDisconnect(t,n);try{t.close()}catch{}})}_handleDisconnect(t,n=null){this._destroyed||t!==this._ws||this._failedSocket===t||(this._failedSocket=t,this._connected=!1,this._connecting=!1,n&&this._emit("error",n),this._emit("close"),this._scheduleReconnect())}_scheduleReconnect(){if(!this._reconnectEnabled||this._destroyed||this._connected||this._connecting||this._reconnectTimer)return;if(this._reconnectAttempt>=this._maxReconnectAttempts){this._emit("reconnect-failed",{attempts:this._reconnectAttempt});return}let t=++this._reconnectAttempt,n=Math.min(this._reconnectBaseMs*2**(t-1),this._reconnectMaxMs);this._emit("reconnecting",{attempt:t,delay:n}),this._reconnectTimer=setTimeout(()=>{this._reconnectTimer=null,this._connect()},n)}on(t,n){return this._listeners[t]&&this._listeners[t].push(n),this}write(t){if(!this._connected||!this._ws)throw new Error("WebSocket RPC connection is not open");return this._ws.send(t),!0}};function dg(e){let t=JSON.stringify(e);return t.length.toString(16).padStart(8,"0")+t}function pg(e){let t=new URL(e);return t.pathname="/status-smoke",t.search=`?session=${encodeURIComponent(wc)}`,t.hash="",t.toString()}function mg(e){if(!wc)throw new Error("PearBrowser v3 runtime session token is unavailable");return`ws://127.0.0.1:${e}/?session=${encodeURIComponent(wc)}`}function fg(e,t){e.buffer+=typeof t=="string"?t:new TextDecoder().decode(t);let n=[];for(;e.buffer.length>=8;){let s=parseInt(e.buffer.slice(0,8),16);if(isNaN(s)||s<=0||s>1e7)throw new Error("invalid rpc frame");if(e.buffer.length<8+s)break;let i=e.buffer.slice(8,8+s);e.buffer=e.buffer.slice(8+s),n.push(JSON.parse(i))}return n}function vg(e,t){return new Promise((n,s)=>{let i=pg(e),r=new globalThis.WebSocket(i);r.binaryType="arraybuffer";let a={buffer:""},l=!1,u=setTimeout(()=>o(new Error("probe timeout")),t);function o(h){if(!l){l=!0,clearTimeout(u);try{r.close()}catch{}h?s(h):n()}}r.addEventListener("open",()=>{r.send(dg({id:tf,cmd:nf.CMD_GET_STATUS,data:{}}))}),r.addEventListener("message",h=>{let g;try{g=fg(a,h.data)}catch(v){o(v);return}for(let v of g){if(v?.event==="backend-boot-failed")return o(null);if(v?.id===tf)return v.error?o(new Error(v.error)):o(null)}}),r.addEventListener("error",()=>o(new Error("probe error"))),r.addEventListener("close",()=>o(new Error("probe closed")))})}async function yg(e,t){let n=performance.now()+t;await vg(e,t);let s=n-performance.now();if(s<=0)throw new Error("renderer handshake timeout");return await new Promise((i,r)=>{let a=new Nc(e),l=!1,u=(h=null)=>{l||(l=!0,clearTimeout(o),h?(a.destroy(),r(h)):(a.enableReconnect(),i(a)))},o=setTimeout(()=>u(new Error("renderer handshake timeout")),s);a.on("open",()=>u()),a.on("error",()=>u(new Error("renderer ws error"))),a.on("close",()=>u(new Error("renderer ws closed")))})}async function sf({startupTimeoutMs:e=6e4,portTimeoutMs:t=1e4,retryDelayMs:n=500}={}){for(let[u,o]of Object.entries({startupTimeoutMs:e,portTimeoutMs:t,retryDelayMs:n}))if(!Number.isInteger(o)||o<=0)throw new TypeError(`${u} must be a positive integer`);let s=null,i=null,r=[],a=performance.now()+e;for(;performance.now()<a;){r=[];for(let o=Ta;o<Ta+ef;o++){let h=a-performance.now();if(h<=0)break;try{s=await yg(mg(o),Math.min(t,h)),i=o,console.log("[rpc] connected on :"+o);break}catch(g){r.push(`:${o} ${g.message}`)}}if(s)break;let u=a-performance.now();u>0&&await new Promise(o=>setTimeout(o,Math.min(n,u)))}if(!s)throw new Error(`Could not establish the local backend connection on ports ${Ta}-${Ta+ef-1} within ${e} ms (last scan: ${r.join("; ")||"no response"}). The backend or the renderer network connection may still be starting. Fully quit and reopen PearBrowser; if this recurs, include this message in a bug report.`);return{rpc:new Ca(s),C:nf,pipe:s,storagePath:`(backend in main Bare process, WS :${i})`}}var hg=document.getElementById("app"),Cn=(0,rf.createRoot)(hg);function Vn({message:e,detail:t,failed:n}){return c`
    <div className="splash">
      <div className="splash-inner">
        <${Ai} size=${96} animated=${!n} />
        <${da} />
        <div className="splash-tagline">P2P browser, app store, and publishing — no servers required.</div>
        <div className=${"splash-status"+(n?" failed":"")}>
          <span className="splash-spinner"></span>
          <span>${e}</span>
        </div>
        ${t&&c`<pre className="splash-detail">${t}</pre>`}
      </div>
    </div>
  `}Cn.render(c`<${Vn} message="Connecting to backend…" />`);try{let{rpc:e,C:t,storagePath:n,pipe:s}=await sf(),i=!1;e.on("event:backend-boot-failed",l=>{i=!0,console.error("Backend boot failed in main process:"),console.error(l?.message),l?.stack&&console.error(l.stack);let u=[l?.message||"(no message)",l?.code?`
Code: `+l.code:"",l?.stack?`

`+l.stack:"",`

Likely fix: reinstall the verified signed native package, then relaunch it.`].join("");Cn.render(c`<${Vn}
      message="Backend failed to boot"
      detail=${u}
      failed=${!0} />`)});let r=!1,a=()=>{i||r||!s.connected||(r=!0,Cn.render(c`<${Zm} rpc=${e} C=${t} storagePath=${n} />`))};s.on("open",()=>{i||(Cn.render(c`<${Vn} message="Handshake restored · resuming…" />`),setTimeout(a,50))}),s.on("error",l=>{console.error("Backend RPC connection error:",l)}),s.on("close",()=>{i||(r=!1,Cn.render(c`<${Vn} message="Backend connection lost · reconnecting…" />`))}),s.on("reconnecting",({attempt:l}={})=>{i||Cn.render(c`<${Vn} message=${`Reconnecting to backend${l?` \xB7 attempt ${l}`:""}\u2026`} />`)}),s.on("reconnect-failed",()=>{i||(r=!1,Cn.render(c`<${Vn}
      message="Backend disconnected"
      detail="Automatic reconnect failed. Fully quit and relaunch PearBrowser; your profile and application storage are safe."
      failed=${!0} />`))}),setTimeout(a,250)}catch(e){console.error("Boot failed:",e),Cn.render(c`<${Vn} message="Boot failed" detail=${e.stack||e.message} failed=${!0} />`)}
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
