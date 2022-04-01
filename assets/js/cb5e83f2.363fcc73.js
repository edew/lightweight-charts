"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[8440],{3905:function(e,t,r){r.d(t,{Zo:function(){return f},kt:function(){return h}});var n=r(7294);function a(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function i(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function o(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?i(Object(r),!0).forEach((function(t){a(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):i(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function l(e,t){if(null==e)return{};var r,n,a=function(e,t){if(null==e)return{};var r,n,a={},i=Object.keys(e);for(n=0;n<i.length;n++)r=i[n],t.indexOf(r)>=0||(a[r]=e[r]);return a}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(n=0;n<i.length;n++)r=i[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(a[r]=e[r])}return a}var s=n.createContext({}),p=function(e){var t=n.useContext(s),r=t;return e&&(r="function"==typeof e?e(t):o(o({},t),e)),r},f=function(e){var t=p(e.components);return n.createElement(s.Provider,{value:t},e.children)},c={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},u=n.forwardRef((function(e,t){var r=e.components,a=e.mdxType,i=e.originalType,s=e.parentName,f=l(e,["components","mdxType","originalType","parentName"]),u=p(r),h=a,m=u["".concat(s,".").concat(h)]||u[h]||c[h]||i;return r?n.createElement(m,o(o({ref:t},f),{},{components:r})):n.createElement(m,o({ref:t},f))}));function h(e,t){var r=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var i=r.length,o=new Array(i);o[0]=u;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l.mdxType="string"==typeof e?e:a,o[1]=l;for(var p=2;p<i;p++)o[p]=r[p];return n.createElement.apply(null,o)}return n.createElement.apply(null,r)}u.displayName="MDXCreateElement"},9436:function(e,t,r){r.r(t),r.d(t,{assets:function(){return f},contentTitle:function(){return s},default:function(){return h},frontMatter:function(){return l},metadata:function(){return p},toc:function(){return c}});var n=r(7462),a=r(3366),i=(r(7294),r(3905)),o=["components"],l={id:"BarsInfo",title:"Interface: BarsInfo",sidebar_label:"BarsInfo",sidebar_position:0,custom_edit_url:null,pagination_next:null,pagination_prev:null},s=void 0,p={unversionedId:"api/interfaces/BarsInfo",id:"version-3.8/api/interfaces/BarsInfo",title:"Interface: BarsInfo",description:"Represents a range of bars and the number of bars outside the range.",source:"@site/versioned_docs/version-3.8/api/interfaces/BarsInfo.md",sourceDirName:"api/interfaces",slug:"/api/interfaces/BarsInfo",permalink:"/lightweight-charts/docs/api/interfaces/BarsInfo",editUrl:null,tags:[],version:"3.8",sidebarPosition:0,frontMatter:{id:"BarsInfo",title:"Interface: BarsInfo",sidebar_label:"BarsInfo",sidebar_position:0,custom_edit_url:null,pagination_next:null,pagination_prev:null},sidebar:"apiSidebar"},f={},c=[{value:"Hierarchy",id:"hierarchy",level:2},{value:"Properties",id:"properties",level:2},{value:"barsBefore",id:"barsbefore",level:3},{value:"barsAfter",id:"barsafter",level:3},{value:"from",id:"from",level:3},{value:"Inherited from",id:"inherited-from",level:4},{value:"to",id:"to",level:3},{value:"Inherited from",id:"inherited-from-1",level:4}],u={toc:c};function h(e){var t=e.components,r=(0,a.Z)(e,o);return(0,i.kt)("wrapper",(0,n.Z)({},u,r,{components:t,mdxType:"MDXLayout"}),(0,i.kt)("p",null,"Represents a range of bars and the number of bars outside the range."),(0,i.kt)("h2",{id:"hierarchy"},"Hierarchy"),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("p",{parentName:"li"},(0,i.kt)("inlineCode",{parentName:"p"},"Partial"),"<",(0,i.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/Range"},(0,i.kt)("inlineCode",{parentName:"a"},"Range")),"<",(0,i.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/#time"},(0,i.kt)("inlineCode",{parentName:"a"},"Time")),">",">"),(0,i.kt)("p",{parentName:"li"},"\u21b3 ",(0,i.kt)("strong",{parentName:"p"},(0,i.kt)("inlineCode",{parentName:"strong"},"BarsInfo"))))),(0,i.kt)("h2",{id:"properties"},"Properties"),(0,i.kt)("h3",{id:"barsbefore"},"barsBefore"),(0,i.kt)("p",null,"\u2022 ",(0,i.kt)("strong",{parentName:"p"},"barsBefore"),": ",(0,i.kt)("inlineCode",{parentName:"p"},"number")),(0,i.kt)("p",null,"The number of bars before the start of the range.\nPositive value means that there are some bars before (out of logical range from the left) the ",(0,i.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/Range#from"},"Range.from")," logical index in the series.\nNegative value means that the first series' bar is inside the passed logical range, and between the first series' bar and the ",(0,i.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/Range#from"},"Range.from")," logical index are some bars."),(0,i.kt)("hr",null),(0,i.kt)("h3",{id:"barsafter"},"barsAfter"),(0,i.kt)("p",null,"\u2022 ",(0,i.kt)("strong",{parentName:"p"},"barsAfter"),": ",(0,i.kt)("inlineCode",{parentName:"p"},"number")),(0,i.kt)("p",null,"The number of bars after the end of the range.\nPositive value in the ",(0,i.kt)("inlineCode",{parentName:"p"},"barsAfter")," field means that there are some bars after (out of logical range from the right) the ",(0,i.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/Range#to"},"Range.to")," logical index in the series.\nNegative value means that the last series' bar is inside the passed logical range, and between the last series' bar and the ",(0,i.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/Range#to"},"Range.to")," logical index are some bars."),(0,i.kt)("hr",null),(0,i.kt)("h3",{id:"from"},"from"),(0,i.kt)("p",null,"\u2022 ",(0,i.kt)("inlineCode",{parentName:"p"},"Optional")," ",(0,i.kt)("strong",{parentName:"p"},"from"),": ",(0,i.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/#time"},(0,i.kt)("inlineCode",{parentName:"a"},"Time"))),(0,i.kt)("p",null,"The from value. The start of the range."),(0,i.kt)("h4",{id:"inherited-from"},"Inherited from"),(0,i.kt)("p",null,"Partial.from"),(0,i.kt)("hr",null),(0,i.kt)("h3",{id:"to"},"to"),(0,i.kt)("p",null,"\u2022 ",(0,i.kt)("inlineCode",{parentName:"p"},"Optional")," ",(0,i.kt)("strong",{parentName:"p"},"to"),": ",(0,i.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/#time"},(0,i.kt)("inlineCode",{parentName:"a"},"Time"))),(0,i.kt)("p",null,"The to value. The end of the range."),(0,i.kt)("h4",{id:"inherited-from-1"},"Inherited from"),(0,i.kt)("p",null,"Partial.to"))}h.isMDXComponent=!0}}]);