"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[2188],{3905:function(e,t,a){a.d(t,{Zo:function(){return c},kt:function(){return m}});var r=a(7294);function i(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function n(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,r)}return a}function p(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?n(Object(a),!0).forEach((function(t){i(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):n(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function o(e,t){if(null==e)return{};var a,r,i=function(e,t){if(null==e)return{};var a,r,i={},n=Object.keys(e);for(r=0;r<n.length;r++)a=n[r],t.indexOf(a)>=0||(i[a]=e[a]);return i}(e,t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);for(r=0;r<n.length;r++)a=n[r],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(i[a]=e[a])}return i}var s=r.createContext({}),l=function(e){var t=r.useContext(s),a=t;return e&&(a="function"==typeof e?e(t):p(p({},t),e)),a},c=function(e){var t=l(e.components);return r.createElement(s.Provider,{value:t},e.children)},h={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},d=r.forwardRef((function(e,t){var a=e.components,i=e.mdxType,n=e.originalType,s=e.parentName,c=o(e,["components","mdxType","originalType","parentName"]),d=l(a),m=i,f=d["".concat(s,".").concat(m)]||d[m]||h[m]||n;return a?r.createElement(f,p(p({ref:t},c),{},{components:a})):r.createElement(f,p({ref:t},c))}));function m(e,t){var a=arguments,i=t&&t.mdxType;if("string"==typeof e||i){var n=a.length,p=new Array(n);p[0]=d;var o={};for(var s in t)hasOwnProperty.call(t,s)&&(o[s]=t[s]);o.originalType=e,o.mdxType="string"==typeof e?e:i,p[1]=o;for(var l=2;l<n;l++)p[l]=a[l];return r.createElement.apply(null,p)}return r.createElement.apply(null,a)}d.displayName="MDXCreateElement"},9879:function(e,t,a){a.r(t),a.d(t,{frontMatter:function(){return o},contentTitle:function(){return s},metadata:function(){return l},toc:function(){return c},default:function(){return d}});var r=a(7462),i=a(3366),n=(a(7294),a(3905)),p=["components"],o={id:"SeriesPartialOptionsMap",title:"Interface: SeriesPartialOptionsMap",sidebar_label:"SeriesPartialOptionsMap",sidebar_position:0,custom_edit_url:null},s=void 0,l={unversionedId:"api/interfaces/SeriesPartialOptionsMap",id:"api/interfaces/SeriesPartialOptionsMap",title:"Interface: SeriesPartialOptionsMap",description:"Represents the type of partial options for each series type.",source:"@site/docs/api/interfaces/SeriesPartialOptionsMap.md",sourceDirName:"api/interfaces",slug:"/api/interfaces/SeriesPartialOptionsMap",permalink:"/lightweight-charts/docs/api/interfaces/SeriesPartialOptionsMap",editUrl:null,tags:[],version:"current",sidebarPosition:0,frontMatter:{id:"SeriesPartialOptionsMap",title:"Interface: SeriesPartialOptionsMap",sidebar_label:"SeriesPartialOptionsMap",sidebar_position:0,custom_edit_url:null},sidebar:"apiSidebar",previous:{title:"SeriesOptionsMap",permalink:"/lightweight-charts/docs/api/interfaces/SeriesOptionsMap"},next:{title:"SingleValueData",permalink:"/lightweight-charts/docs/api/interfaces/SingleValueData"}},c=[{value:"Properties",id:"properties",children:[{value:"Bar",id:"bar",children:[],level:3},{value:"Candlestick",id:"candlestick",children:[],level:3},{value:"Area",id:"area",children:[],level:3},{value:"Baseline",id:"baseline",children:[],level:3},{value:"Line",id:"line",children:[],level:3},{value:"Histogram",id:"histogram",children:[],level:3}],level:2}],h={toc:c};function d(e){var t=e.components,a=(0,i.Z)(e,p);return(0,n.kt)("wrapper",(0,r.Z)({},h,a,{components:t,mdxType:"MDXLayout"}),(0,n.kt)("p",null,"Represents the type of partial options for each series type."),(0,n.kt)("p",null,"For example a bar series has options represented by ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/#barseriespartialoptions"},"BarSeriesPartialOptions"),"."),(0,n.kt)("h2",{id:"properties"},"Properties"),(0,n.kt)("h3",{id:"bar"},"Bar"),(0,n.kt)("p",null,"\u2022 ",(0,n.kt)("strong",{parentName:"p"},"Bar"),": ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/#deeppartial"},(0,n.kt)("inlineCode",{parentName:"a"},"DeepPartial")),"<",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/BarStyleOptions"},(0,n.kt)("inlineCode",{parentName:"a"},"BarStyleOptions"))," & ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/SeriesOptionsCommon"},(0,n.kt)("inlineCode",{parentName:"a"},"SeriesOptionsCommon")),">"),(0,n.kt)("p",null,"The type of bar series partial options."),(0,n.kt)("hr",null),(0,n.kt)("h3",{id:"candlestick"},"Candlestick"),(0,n.kt)("p",null,"\u2022 ",(0,n.kt)("strong",{parentName:"p"},"Candlestick"),": ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/#deeppartial"},(0,n.kt)("inlineCode",{parentName:"a"},"DeepPartial")),"<",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/CandlestickStyleOptions"},(0,n.kt)("inlineCode",{parentName:"a"},"CandlestickStyleOptions"))," & ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/SeriesOptionsCommon"},(0,n.kt)("inlineCode",{parentName:"a"},"SeriesOptionsCommon")),">"),(0,n.kt)("p",null,"The type of candlestick series partial options."),(0,n.kt)("hr",null),(0,n.kt)("h3",{id:"area"},"Area"),(0,n.kt)("p",null,"\u2022 ",(0,n.kt)("strong",{parentName:"p"},"Area"),": ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/#deeppartial"},(0,n.kt)("inlineCode",{parentName:"a"},"DeepPartial")),"<",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/AreaStyleOptions"},(0,n.kt)("inlineCode",{parentName:"a"},"AreaStyleOptions"))," & ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/SeriesOptionsCommon"},(0,n.kt)("inlineCode",{parentName:"a"},"SeriesOptionsCommon")),">"),(0,n.kt)("p",null,"The type of area series partial options."),(0,n.kt)("hr",null),(0,n.kt)("h3",{id:"baseline"},"Baseline"),(0,n.kt)("p",null,"\u2022 ",(0,n.kt)("strong",{parentName:"p"},"Baseline"),": ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/#deeppartial"},(0,n.kt)("inlineCode",{parentName:"a"},"DeepPartial")),"<",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/BaselineStyleOptions"},(0,n.kt)("inlineCode",{parentName:"a"},"BaselineStyleOptions"))," & ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/SeriesOptionsCommon"},(0,n.kt)("inlineCode",{parentName:"a"},"SeriesOptionsCommon")),">"),(0,n.kt)("p",null,"The type of baseline series partial options."),(0,n.kt)("hr",null),(0,n.kt)("h3",{id:"line"},"Line"),(0,n.kt)("p",null,"\u2022 ",(0,n.kt)("strong",{parentName:"p"},"Line"),": ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/#deeppartial"},(0,n.kt)("inlineCode",{parentName:"a"},"DeepPartial")),"<",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/LineStyleOptions"},(0,n.kt)("inlineCode",{parentName:"a"},"LineStyleOptions"))," & ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/SeriesOptionsCommon"},(0,n.kt)("inlineCode",{parentName:"a"},"SeriesOptionsCommon")),">"),(0,n.kt)("p",null,"The type of line series partial options."),(0,n.kt)("hr",null),(0,n.kt)("h3",{id:"histogram"},"Histogram"),(0,n.kt)("p",null,"\u2022 ",(0,n.kt)("strong",{parentName:"p"},"Histogram"),": ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/#deeppartial"},(0,n.kt)("inlineCode",{parentName:"a"},"DeepPartial")),"<",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/HistogramStyleOptions"},(0,n.kt)("inlineCode",{parentName:"a"},"HistogramStyleOptions"))," & ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/SeriesOptionsCommon"},(0,n.kt)("inlineCode",{parentName:"a"},"SeriesOptionsCommon")),">"),(0,n.kt)("p",null,"The type of histogram series partial options."))}d.isMDXComponent=!0}}]);