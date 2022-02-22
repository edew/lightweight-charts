"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[4087],{3905:function(e,t,a){a.d(t,{Zo:function(){return p},kt:function(){return u}});var r=a(7294);function i(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function n(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,r)}return a}function c(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?n(Object(a),!0).forEach((function(t){i(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):n(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function l(e,t){if(null==e)return{};var a,r,i=function(e,t){if(null==e)return{};var a,r,i={},n=Object.keys(e);for(r=0;r<n.length;r++)a=n[r],t.indexOf(a)>=0||(i[a]=e[a]);return i}(e,t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);for(r=0;r<n.length;r++)a=n[r],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(i[a]=e[a])}return i}var o=r.createContext({}),s=function(e){var t=r.useContext(o),a=t;return e&&(a="function"==typeof e?e(t):c(c({},t),e)),a},p=function(e){var t=s(e.components);return r.createElement(o.Provider,{value:t},e.children)},d={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},h=r.forwardRef((function(e,t){var a=e.components,i=e.mdxType,n=e.originalType,o=e.parentName,p=l(e,["components","mdxType","originalType","parentName"]),h=s(a),u=i,f=h["".concat(o,".").concat(u)]||h[u]||d[u]||n;return a?r.createElement(f,c(c({ref:t},p),{},{components:a})):r.createElement(f,c({ref:t},p))}));function u(e,t){var a=arguments,i=t&&t.mdxType;if("string"==typeof e||i){var n=a.length,c=new Array(n);c[0]=h;var l={};for(var o in t)hasOwnProperty.call(t,o)&&(l[o]=t[o]);l.originalType=e,l.mdxType="string"==typeof e?e:i,c[1]=l;for(var s=2;s<n;s++)c[s]=a[s];return r.createElement.apply(null,c)}return r.createElement.apply(null,a)}h.displayName="MDXCreateElement"},6691:function(e,t,a){a.r(t),a.d(t,{frontMatter:function(){return l},contentTitle:function(){return o},metadata:function(){return s},toc:function(){return p},default:function(){return h}});var r=a(7462),i=a(3366),n=(a(7294),a(3905)),c=["components"],l={sidebar_position:2},o="Price scale",s={unversionedId:"price-scale",id:"version-3.8/price-scale",title:"Price scale",description:"Price Scale (or price axis) is a vertical scale that mostly maps prices to coordinates and vice versa.",source:"@site/versioned_docs/version-3.8/price-scale.md",sourceDirName:".",slug:"/price-scale",permalink:"/lightweight-charts/docs/price-scale",tags:[],version:"3.8",sidebarPosition:2,frontMatter:{sidebar_position:2},sidebar:"docsSidebar",previous:{title:"Series types",permalink:"/lightweight-charts/docs/series-types"},next:{title:"Time scale",permalink:"/lightweight-charts/docs/time-scale"}},p=[{value:"Creating a price scale",id:"creating-a-price-scale",children:[],level:2},{value:"Removing a price scale",id:"removing-a-price-scale",children:[],level:2}],d={toc:p};function h(e){var t=e.components,l=(0,i.Z)(e,c);return(0,n.kt)("wrapper",(0,r.Z)({},d,l,{components:t,mdxType:"MDXLayout"}),(0,n.kt)("h1",{id:"price-scale"},"Price scale"),(0,n.kt)("p",null,"Price Scale (or price axis) is a vertical scale that mostly maps prices to coordinates and vice versa.\nThe rules of converting depend on a price scale mode, a height of the chart and visible part of the data."),(0,n.kt)("p",null,(0,n.kt)("img",{alt:"Price scales",src:a(6937).Z,title:"Price scales",width:"687",height:"387"})),(0,n.kt)("p",null,"By default, chart has 2 predefined price scales: ",(0,n.kt)("inlineCode",{parentName:"p"},"left")," and ",(0,n.kt)("inlineCode",{parentName:"p"},"right"),", and an unlimited number of overlay scales."),(0,n.kt)("p",null,"Only ",(0,n.kt)("inlineCode",{parentName:"p"},"left")," and ",(0,n.kt)("inlineCode",{parentName:"p"},"right")," price scales could be displayed on the chart, all overlay scales are hidden."),(0,n.kt)("p",null,"If you want to change ",(0,n.kt)("inlineCode",{parentName:"p"},"left")," price scale, you need to use ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/ChartOptions#leftpricescale"},(0,n.kt)("inlineCode",{parentName:"a"},"leftPriceScale"))," option, to change ",(0,n.kt)("inlineCode",{parentName:"p"},"right")," price scale use ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/ChartOptions#rightpricescale"},(0,n.kt)("inlineCode",{parentName:"a"},"rightPriceScale")),", to change default options for an overlay price scale use ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/ChartOptions#overlaypricescales"},(0,n.kt)("inlineCode",{parentName:"a"},"overlayPriceScales"))," option."),(0,n.kt)("p",null,"Alternatively, you can use ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/IChartApi#pricescale"},(0,n.kt)("inlineCode",{parentName:"a"},"IChartApi.priceScale"))," method to get an API object of any price scale or ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/ISeriesApi#pricescale"},(0,n.kt)("inlineCode",{parentName:"a"},"ISeriesApi.priceScale"))," to get an API object of series' price scale (the price scale that the series is attached to)."),(0,n.kt)("h2",{id:"creating-a-price-scale"},"Creating a price scale"),(0,n.kt)("p",null,"By default a chart has only 2 price scales: ",(0,n.kt)("inlineCode",{parentName:"p"},"left")," and ",(0,n.kt)("inlineCode",{parentName:"p"},"right"),"."),(0,n.kt)("p",null,"If you want to create an overlay price scale, you can simply assign ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/SeriesOptionsCommon#pricescaleid"},(0,n.kt)("inlineCode",{parentName:"a"},"priceScaleId"))," option to a series (note that a value should be differ from ",(0,n.kt)("inlineCode",{parentName:"p"},"left")," and ",(0,n.kt)("inlineCode",{parentName:"p"},"right"),") and a chart will automatically create an overlay price scale with provided ID.\nIf a price scale with such ID already exists then a series will be attached to this existing price scale.\nFurther you can use provided price scale ID to get its corresponding API object via ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/IChartApi#pricescale"},(0,n.kt)("inlineCode",{parentName:"a"},"IChartApi.priceScale"))," method."),(0,n.kt)("h2",{id:"removing-a-price-scale"},"Removing a price scale"),(0,n.kt)("p",null,"The default price scales (",(0,n.kt)("inlineCode",{parentName:"p"},"left")," and ",(0,n.kt)("inlineCode",{parentName:"p"},"right"),") cannot be removed, you can only hide them by setting ",(0,n.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/PriceScaleOptions#visible"},(0,n.kt)("inlineCode",{parentName:"a"},"visible"))," option to ",(0,n.kt)("inlineCode",{parentName:"p"},"false"),"."),(0,n.kt)("p",null,"An overlay price scale exists while there is at least 1 series attached to this price scale.\nThus, to remove an overlay price scale remove all series attached to this price scale."))}h.isMDXComponent=!0},6937:function(e,t,a){t.Z=a.p+"assets/images/price-scales-5ff372fd08578f74710940c724ad5df4.png"}}]);