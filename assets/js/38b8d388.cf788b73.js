"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[205],{3905:function(e,t,n){n.d(t,{Zo:function(){return c},kt:function(){return f}});var r=n(7294);function o(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?a(Object(n),!0).forEach((function(t){o(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):a(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,r,o=function(e,t){if(null==e)return{};var n,r,o={},a=Object.keys(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||(o[n]=e[n]);return o}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(o[n]=e[n])}return o}var p=r.createContext({}),u=function(e){var t=r.useContext(p),n=t;return e&&(n="function"==typeof e?e(t):i(i({},t),e)),n},c=function(e){var t=u(e.components);return r.createElement(p.Provider,{value:t},e.children)},s={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},d=r.forwardRef((function(e,t){var n=e.components,o=e.mdxType,a=e.originalType,p=e.parentName,c=l(e,["components","mdxType","originalType","parentName"]),d=u(n),f=o,k=d["".concat(p,".").concat(f)]||d[f]||s[f]||a;return n?r.createElement(k,i(i({ref:t},c),{},{components:n})):r.createElement(k,i({ref:t},c))}));function f(e,t){var n=arguments,o=t&&t.mdxType;if("string"==typeof e||o){var a=n.length,i=new Array(a);i[0]=d;var l={};for(var p in t)hasOwnProperty.call(t,p)&&(l[p]=t[p]);l.originalType=e,l.mdxType="string"==typeof e?e:o,i[1]=l;for(var u=2;u<a;u++)i[u]=n[u];return r.createElement.apply(null,i)}return r.createElement.apply(null,n)}d.displayName="MDXCreateElement"},4257:function(e,t,n){n.r(t),n.d(t,{frontMatter:function(){return l},contentTitle:function(){return p},metadata:function(){return u},toc:function(){return c},default:function(){return d}});var r=n(7462),o=n(3366),a=(n(7294),n(3905)),i=["components"],l={id:"LayoutOptions",title:"Interface: LayoutOptions",sidebar_label:"LayoutOptions",sidebar_position:0,custom_edit_url:null},p=void 0,u={unversionedId:"api/interfaces/LayoutOptions",id:"api/interfaces/LayoutOptions",title:"Interface: LayoutOptions",description:"Represents layout options",source:"@site/docs/api/interfaces/LayoutOptions.md",sourceDirName:"api/interfaces",slug:"/api/interfaces/LayoutOptions",permalink:"/lightweight-charts/docs/api/interfaces/LayoutOptions",editUrl:null,tags:[],version:"current",sidebarPosition:0,frontMatter:{id:"LayoutOptions",title:"Interface: LayoutOptions",sidebar_label:"LayoutOptions",sidebar_position:0,custom_edit_url:null},sidebar:"apiSidebar",previous:{title:"KineticScrollOptions",permalink:"/lightweight-charts/docs/api/interfaces/KineticScrollOptions"},next:{title:"LineData",permalink:"/lightweight-charts/docs/api/interfaces/LineData"}},c=[{value:"Properties",id:"properties",children:[{value:"background",id:"background",children:[],level:3},{value:"backgroundColor",id:"backgroundcolor",children:[],level:3},{value:"textColor",id:"textcolor",children:[],level:3},{value:"fontSize",id:"fontsize",children:[],level:3},{value:"fontFamily",id:"fontfamily",children:[],level:3}],level:2}],s={toc:c};function d(e){var t=e.components,n=(0,o.Z)(e,i);return(0,a.kt)("wrapper",(0,r.Z)({},s,n,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("p",null,"Represents layout options"),(0,a.kt)("h2",{id:"properties"},"Properties"),(0,a.kt)("h3",{id:"background"},"background"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"background"),": ",(0,a.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/#background"},(0,a.kt)("inlineCode",{parentName:"a"},"Background"))),(0,a.kt)("p",null,"Chart and scales background color."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("inlineCode",{parentName:"p"},"{ type: ColorType.Solid, color: '#FFFFFF' }")),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"backgroundcolor"},"backgroundColor"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"backgroundColor"),": ",(0,a.kt)("inlineCode",{parentName:"p"},"string")),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"deprecated"))," Use background instead."),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"textcolor"},"textColor"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"textColor"),": ",(0,a.kt)("inlineCode",{parentName:"p"},"string")),(0,a.kt)("p",null,"Color of text on the scales."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("inlineCode",{parentName:"p"},"'#191919'")),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"fontsize"},"fontSize"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"fontSize"),": ",(0,a.kt)("inlineCode",{parentName:"p"},"number")),(0,a.kt)("p",null,"Font size of text on scales in pixels."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("inlineCode",{parentName:"p"},"11")),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"fontfamily"},"fontFamily"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"fontFamily"),": ",(0,a.kt)("inlineCode",{parentName:"p"},"string")),(0,a.kt)("p",null,"Font family of text on the scales."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("inlineCode",{parentName:"p"},"'Trebuchet MS', Roboto, Ubuntu, sans-serif")))}d.isMDXComponent=!0}}]);