"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[6159],{3905:function(e,t,n){n.d(t,{Zo:function(){return u},kt:function(){return k}});var r=n(7294);function l(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?a(Object(n),!0).forEach((function(t){l(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):a(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function o(e,t){if(null==e)return{};var n,r,l=function(e,t){if(null==e)return{};var n,r,l={},a=Object.keys(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||(l[n]=e[n]);return l}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(l[n]=e[n])}return l}var p=r.createContext({}),s=function(e){var t=r.useContext(p),n=t;return e&&(n="function"==typeof e?e(t):i(i({},t),e)),n},u=function(e){var t=s(e.components);return r.createElement(p.Provider,{value:t},e.children)},c={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},d=r.forwardRef((function(e,t){var n=e.components,l=e.mdxType,a=e.originalType,p=e.parentName,u=o(e,["components","mdxType","originalType","parentName"]),d=s(n),k=l,m=d["".concat(p,".").concat(k)]||d[k]||c[k]||a;return n?r.createElement(m,i(i({ref:t},u),{},{components:n})):r.createElement(m,i({ref:t},u))}));function k(e,t){var n=arguments,l=t&&t.mdxType;if("string"==typeof e||l){var a=n.length,i=new Array(a);i[0]=d;var o={};for(var p in t)hasOwnProperty.call(t,p)&&(o[p]=t[p]);o.originalType=e,o.mdxType="string"==typeof e?e:l,i[1]=o;for(var s=2;s<a;s++)i[s]=n[s];return r.createElement.apply(null,i)}return r.createElement.apply(null,n)}d.displayName="MDXCreateElement"},3393:function(e,t,n){n.r(t),n.d(t,{frontMatter:function(){return o},contentTitle:function(){return p},metadata:function(){return s},toc:function(){return u},default:function(){return d}});var r=n(7462),l=n(3366),a=(n(7294),n(3905)),i=["components"],o={id:"BaselineStyleOptions",title:"Interface: BaselineStyleOptions",sidebar_label:"BaselineStyleOptions",sidebar_position:0,custom_edit_url:null,pagination_next:null,pagination_prev:null},p=void 0,s={unversionedId:"api/interfaces/BaselineStyleOptions",id:"api/interfaces/BaselineStyleOptions",title:"Interface: BaselineStyleOptions",description:"Represents style options for a baseline series.",source:"@site/docs/api/interfaces/BaselineStyleOptions.md",sourceDirName:"api/interfaces",slug:"/api/interfaces/BaselineStyleOptions",permalink:"/lightweight-charts/docs/next/api/interfaces/BaselineStyleOptions",editUrl:null,tags:[],version:"current",sidebarPosition:0,frontMatter:{id:"BaselineStyleOptions",title:"Interface: BaselineStyleOptions",sidebar_label:"BaselineStyleOptions",sidebar_position:0,custom_edit_url:null,pagination_next:null,pagination_prev:null},sidebar:"apiSidebar"},u=[{value:"Properties",id:"properties",children:[{value:"baseValue",id:"basevalue",children:[],level:3},{value:"topFillColor1",id:"topfillcolor1",children:[],level:3},{value:"topFillColor2",id:"topfillcolor2",children:[],level:3},{value:"topLineColor",id:"toplinecolor",children:[],level:3},{value:"bottomFillColor1",id:"bottomfillcolor1",children:[],level:3},{value:"bottomFillColor2",id:"bottomfillcolor2",children:[],level:3},{value:"bottomLineColor",id:"bottomlinecolor",children:[],level:3},{value:"lineWidth",id:"linewidth",children:[],level:3},{value:"lineStyle",id:"linestyle",children:[],level:3},{value:"lineTension",id:"linetension",children:[],level:3},{value:"crosshairMarkerVisible",id:"crosshairmarkervisible",children:[],level:3},{value:"crosshairMarkerRadius",id:"crosshairmarkerradius",children:[],level:3},{value:"crosshairMarkerBorderColor",id:"crosshairmarkerbordercolor",children:[],level:3},{value:"crosshairMarkerBackgroundColor",id:"crosshairmarkerbackgroundcolor",children:[],level:3},{value:"lastPriceAnimation",id:"lastpriceanimation",children:[],level:3}],level:2}],c={toc:u};function d(e){var t=e.components,n=(0,l.Z)(e,i);return(0,a.kt)("wrapper",(0,r.Z)({},c,n,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("p",null,"Represents style options for a baseline series."),(0,a.kt)("h2",{id:"properties"},"Properties"),(0,a.kt)("h3",{id:"basevalue"},"baseValue"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"baseValue"),": ",(0,a.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/next/api/interfaces/BaseValuePrice"},(0,a.kt)("inlineCode",{parentName:"a"},"BaseValuePrice"))),(0,a.kt)("p",null,"Base value of the series."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("inlineCode",{parentName:"p"},"{ type: 'price', price: 0 }")),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"topfillcolor1"},"topFillColor1"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"topFillColor1"),": ",(0,a.kt)("inlineCode",{parentName:"p"},"string")),(0,a.kt)("p",null,"The first color of the top area."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("inlineCode",{parentName:"p"},"'rgba(38, 166, 154, 0.28)'")),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"topfillcolor2"},"topFillColor2"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"topFillColor2"),": ",(0,a.kt)("inlineCode",{parentName:"p"},"string")),(0,a.kt)("p",null,"The second color of the top area."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("inlineCode",{parentName:"p"},"'rgba(38, 166, 154, 0.05)'")),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"toplinecolor"},"topLineColor"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"topLineColor"),": ",(0,a.kt)("inlineCode",{parentName:"p"},"string")),(0,a.kt)("p",null,"The line color of the top area."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("inlineCode",{parentName:"p"},"'rgba(38, 166, 154, 1)'")),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"bottomfillcolor1"},"bottomFillColor1"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"bottomFillColor1"),": ",(0,a.kt)("inlineCode",{parentName:"p"},"string")),(0,a.kt)("p",null,"The first color of the bottom area."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("inlineCode",{parentName:"p"},"'rgba(239, 83, 80, 0.05)'")),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"bottomfillcolor2"},"bottomFillColor2"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"bottomFillColor2"),": ",(0,a.kt)("inlineCode",{parentName:"p"},"string")),(0,a.kt)("p",null,"The second color of the bottom area."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("inlineCode",{parentName:"p"},"'rgba(239, 83, 80, 0.28)'")),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"bottomlinecolor"},"bottomLineColor"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"bottomLineColor"),": ",(0,a.kt)("inlineCode",{parentName:"p"},"string")),(0,a.kt)("p",null,"The line color of the bottom area."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("inlineCode",{parentName:"p"},"'rgba(239, 83, 80, 1)'")),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"linewidth"},"lineWidth"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"lineWidth"),": ",(0,a.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/next/api/#linewidth"},(0,a.kt)("inlineCode",{parentName:"a"},"LineWidth"))),(0,a.kt)("p",null,"Line width."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("inlineCode",{parentName:"p"},"3")),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"linestyle"},"lineStyle"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"lineStyle"),": ",(0,a.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/next/api/enums/LineStyle"},(0,a.kt)("inlineCode",{parentName:"a"},"LineStyle"))),(0,a.kt)("p",null,"Line style."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/next/api/enums/LineStyle#solid"},"LineStyle.Solid")),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"linetension"},"lineTension"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"lineTension"),": ",(0,a.kt)("inlineCode",{parentName:"p"},"number")),(0,a.kt)("p",null,"Line tension. A tension of 0 draws a straight line, a tension of 1 draws a very curvy line. Should be a value between 0 and 1 inclusive."),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"crosshairmarkervisible"},"crosshairMarkerVisible"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"crosshairMarkerVisible"),": ",(0,a.kt)("inlineCode",{parentName:"p"},"boolean")),(0,a.kt)("p",null,"Show the crosshair marker."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("inlineCode",{parentName:"p"},"true")),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"crosshairmarkerradius"},"crosshairMarkerRadius"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"crosshairMarkerRadius"),": ",(0,a.kt)("inlineCode",{parentName:"p"},"number")),(0,a.kt)("p",null,"Crosshair marker radius in pixels."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("inlineCode",{parentName:"p"},"4")),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"crosshairmarkerbordercolor"},"crosshairMarkerBorderColor"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"crosshairMarkerBorderColor"),": ",(0,a.kt)("inlineCode",{parentName:"p"},"string")),(0,a.kt)("p",null,"Crosshair marker border color. An empty string falls back to the the color of the series under the crosshair."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("inlineCode",{parentName:"p"},"''")),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"crosshairmarkerbackgroundcolor"},"crosshairMarkerBackgroundColor"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"crosshairMarkerBackgroundColor"),": ",(0,a.kt)("inlineCode",{parentName:"p"},"string")),(0,a.kt)("p",null,"The crosshair marker background color. An empty string falls back to the the color of the series under the crosshair."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("inlineCode",{parentName:"p"},"''")),(0,a.kt)("hr",null),(0,a.kt)("h3",{id:"lastpriceanimation"},"lastPriceAnimation"),(0,a.kt)("p",null,"\u2022 ",(0,a.kt)("strong",{parentName:"p"},"lastPriceAnimation"),": ",(0,a.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/next/api/enums/LastPriceAnimationMode"},(0,a.kt)("inlineCode",{parentName:"a"},"LastPriceAnimationMode"))),(0,a.kt)("p",null,"Last price animation mode."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},(0,a.kt)("inlineCode",{parentName:"strong"},"defaultvalue"))," ",(0,a.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/next/api/enums/LastPriceAnimationMode#disabled"},"LastPriceAnimationMode.Disabled")))}d.isMDXComponent=!0}}]);