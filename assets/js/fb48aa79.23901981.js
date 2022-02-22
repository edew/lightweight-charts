"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[5338],{3905:function(e,t,n){n.d(t,{Zo:function(){return d},kt:function(){return m}});var r=n(7294);function o(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function a(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?i(Object(n),!0).forEach((function(t){o(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,r,o=function(e,t){if(null==e)return{};var n,r,o={},i=Object.keys(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||(o[n]=e[n]);return o}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(o[n]=e[n])}return o}var c=r.createContext({}),u=function(e){var t=r.useContext(c),n=t;return e&&(n="function"==typeof e?e(t):a(a({},t),e)),n},d=function(e){var t=u(e.components);return r.createElement(c.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},s=r.forwardRef((function(e,t){var n=e.components,o=e.mdxType,i=e.originalType,c=e.parentName,d=l(e,["components","mdxType","originalType","parentName"]),s=u(n),m=o,f=s["".concat(c,".").concat(m)]||s[m]||p[m]||i;return n?r.createElement(f,a(a({ref:t},d),{},{components:n})):r.createElement(f,a({ref:t},d))}));function m(e,t){var n=arguments,o=t&&t.mdxType;if("string"==typeof e||o){var i=n.length,a=new Array(i);a[0]=s;var l={};for(var c in t)hasOwnProperty.call(t,c)&&(l[c]=t[c]);l.originalType=e,l.mdxType="string"==typeof e?e:o,a[1]=l;for(var u=2;u<i;u++)a[u]=n[u];return r.createElement.apply(null,a)}return r.createElement.apply(null,n)}s.displayName="MDXCreateElement"},3841:function(e,t,n){n.r(t),n.d(t,{frontMatter:function(){return l},contentTitle:function(){return c},metadata:function(){return u},toc:function(){return d},default:function(){return s}});var r=n(7462),o=n(3366),i=(n(7294),n(3905)),a=["components"],l={id:"TrackingModeExitMode",title:"Enumeration: TrackingModeExitMode",sidebar_label:"TrackingModeExitMode",sidebar_position:0,custom_edit_url:null,pagination_next:null,pagination_prev:null},c=void 0,u={unversionedId:"api/enums/TrackingModeExitMode",id:"version-3.8/api/enums/TrackingModeExitMode",title:"Enumeration: TrackingModeExitMode",description:"Determine how to exit the tracking mode.",source:"@site/versioned_docs/version-3.8/api/enums/TrackingModeExitMode.md",sourceDirName:"api/enums",slug:"/api/enums/TrackingModeExitMode",permalink:"/lightweight-charts/docs/api/enums/TrackingModeExitMode",editUrl:null,tags:[],version:"3.8",sidebarPosition:0,frontMatter:{id:"TrackingModeExitMode",title:"Enumeration: TrackingModeExitMode",sidebar_label:"TrackingModeExitMode",sidebar_position:0,custom_edit_url:null,pagination_next:null,pagination_prev:null},sidebar:"apiSidebar"},d=[{value:"Enumeration members",id:"enumeration-members",children:[{value:"OnTouchEnd",id:"ontouchend",children:[],level:3},{value:"OnNextTap",id:"onnexttap",children:[],level:3}],level:2}],p={toc:d};function s(e){var t=e.components,n=(0,o.Z)(e,a);return(0,i.kt)("wrapper",(0,r.Z)({},p,n,{components:t,mdxType:"MDXLayout"}),(0,i.kt)("p",null,"Determine how to exit the tracking mode."),(0,i.kt)("p",null,"By default, mobile users will long press to deactivate the scroll and have the ability to check values and dates.\nAnother press is required to activate the scroll, be able to move left/right, zoom, etc."),(0,i.kt)("h2",{id:"enumeration-members"},"Enumeration members"),(0,i.kt)("h3",{id:"ontouchend"},"OnTouchEnd"),(0,i.kt)("p",null,"\u2022 ",(0,i.kt)("strong",{parentName:"p"},"OnTouchEnd")," = ",(0,i.kt)("inlineCode",{parentName:"p"},"0")),(0,i.kt)("p",null,"Tracking Mode will be deactivated on touch end event."),(0,i.kt)("hr",null),(0,i.kt)("h3",{id:"onnexttap"},"OnNextTap"),(0,i.kt)("p",null,"\u2022 ",(0,i.kt)("strong",{parentName:"p"},"OnNextTap")," = ",(0,i.kt)("inlineCode",{parentName:"p"},"1")),(0,i.kt)("p",null,"Tracking Mode will be deactivated on the next tap event."))}s.isMDXComponent=!0}}]);