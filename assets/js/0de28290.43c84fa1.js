"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[3471],{3905:function(e,t,n){n.d(t,{Zo:function(){return p},kt:function(){return m}});var r=n(7294);function i(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?a(Object(n),!0).forEach((function(t){i(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):a(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,r,i=function(e,t){if(null==e)return{};var n,r,i={},a=Object.keys(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||(i[n]=e[n]);return i}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(i[n]=e[n])}return i}var s=r.createContext({}),c=function(e){var t=r.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},p=function(e){var t=c(e.components);return r.createElement(s.Provider,{value:t},e.children)},u={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},h=r.forwardRef((function(e,t){var n=e.components,i=e.mdxType,a=e.originalType,s=e.parentName,p=l(e,["components","mdxType","originalType","parentName"]),h=c(n),m=i,g=h["".concat(s,".").concat(m)]||h[m]||u[m]||a;return n?r.createElement(g,o(o({ref:t},p),{},{components:n})):r.createElement(g,o({ref:t},p))}));function m(e,t){var n=arguments,i=t&&t.mdxType;if("string"==typeof e||i){var a=n.length,o=new Array(a);o[0]=h;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l.mdxType="string"==typeof e?e:i,o[1]=l;for(var c=2;c<a;c++)o[c]=n[c];return r.createElement.apply(null,o)}return r.createElement.apply(null,n)}h.displayName="MDXCreateElement"},2536:function(e,t,n){n.r(t),n.d(t,{assets:function(){return p},contentTitle:function(){return s},default:function(){return m},frontMatter:function(){return l},metadata:function(){return c},toc:function(){return u}});var r=n(7462),i=n(3366),a=(n(7294),n(3905)),o=["components"],l={},s="From v2 to v3",c={unversionedId:"migrations/from-v2-to-v3",id:"version-3.8/migrations/from-v2-to-v3",title:"From v2 to v3",description:"Lightweight charts library 3.0 announces the major improvements: supporting two price scales and improving the time scale API.",source:"@site/versioned_docs/version-3.8/migrations/from-v2-to-v3.md",sourceDirName:"migrations",slug:"/migrations/from-v2-to-v3",permalink:"/lightweight-charts/docs/migrations/from-v2-to-v3",tags:[],version:"3.8",frontMatter:{},sidebar:"docsSidebar",previous:{title:"Working with time zones",permalink:"/lightweight-charts/docs/time-zones"},next:{title:"iOS wrapper",permalink:"/lightweight-charts/docs/ios"}},p={},u=[{value:"Time Scale API",id:"time-scale-api",level:2},{value:"Two price scales",id:"two-price-scales",level:2},{value:"Default behavior",id:"default-behavior",level:3},{value:"Left price scale",id:"left-price-scale",level:3},{value:"No price scale",id:"no-price-scale",level:3},{value:"Creating overlay",id:"creating-overlay",level:3},{value:"Move price scale from right to left or vice versa",id:"move-price-scale-from-right-to-left-or-vice-versa",level:3}],h={toc:u};function m(e){var t=e.components,n=(0,i.Z)(e,o);return(0,a.kt)("wrapper",(0,r.Z)({},h,n,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("h1",{id:"from-v2-to-v3"},"From v2 to v3"),(0,a.kt)("p",null,"Lightweight charts library 3.0 announces the major improvements: supporting two price scales and improving the time scale API.\nIn order of keep the API clear and consistent, we decided to allow breaking change of the API."),(0,a.kt)("p",null,"In this document you can find the migration guide from the previous version to 3.0."),(0,a.kt)("h2",{id:"time-scale-api"},"Time Scale API"),(0,a.kt)("p",null,"Previously, to handle changing visible time range you needed to use ",(0,a.kt)("inlineCode",{parentName:"p"},"subscribeVisibleTimeRangeChange")," and ",(0,a.kt)("inlineCode",{parentName:"p"},"unsubscribeVisibleTimeRangeChange")," to subscribe and unsubscribe from visible range events.\nThese methods were available in the chart object  (e.g. you call it like ",(0,a.kt)("inlineCode",{parentName:"p"},"chart.subscribeVisibleTimeRangeChange(func)"),")."),(0,a.kt)("p",null,"In 3.0 in order to make API more consistent with the new API we decided to move these methods to ",(0,a.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/ITimeScaleApi"},"ITimeScaleApi"),"\n(along with the new subscription methods ",(0,a.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/ITimeScaleApi#subscribevisiblelogicalrangechange"},(0,a.kt)("inlineCode",{parentName:"a"},"ITimeScaleApi.subscribeVisibleLogicalRangeChange"))," and ",(0,a.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/ITimeScaleApi#unsubscribevisiblelogicalrangechange"},(0,a.kt)("inlineCode",{parentName:"a"},"ITimeScaleApi.unsubscribeVisibleLogicalRangeChange")),")."),(0,a.kt)("p",null,"So, to migrate your code to 3.0 you just need to replace:"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"chart.subscribeVisibleTimeRangeChange")," with ",(0,a.kt)("inlineCode",{parentName:"li"},"chart.timeScale().subscribeVisibleTimeRangeChange")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"chart.unsubscribeVisibleTimeRangeChange")," with ",(0,a.kt)("inlineCode",{parentName:"li"},"chart.timeScale().unsubscribeVisibleTimeRangeChange"))),(0,a.kt)("h2",{id:"two-price-scales"},"Two price scales"),(0,a.kt)("p",null,"We understand disadvantages of breaking changes in the API, so we have not removed support of the current API at all, but have deprecated it, so the most common cases will continue to work."),(0,a.kt)("p",null,"You can refer to the new API ",(0,a.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/price-scale"},"here"),"."),(0,a.kt)("p",null,"Following are migration rules."),(0,a.kt)("h3",{id:"default-behavior"},"Default behavior"),(0,a.kt)("p",null,"Default behavior is not changed. If you do not specify price scale options, the chart will have the right price scale visible and all the series will assign to it."),(0,a.kt)("h3",{id:"left-price-scale"},"Left price scale"),(0,a.kt)("p",null,"If you need the price scale to be drawn on the left side, you should make the following changes.\ninstead of"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-js"},"const chart = LightweightCharts.createChart(container, {\n    priceScale: {\n        position: 'left',\n    },\n});\n")),(0,a.kt)("p",null,"use"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-js"},"const chart = LightweightCharts.createChart(container, {\n    rightPriceScale: {\n        visible: false,\n    },\n    leftPriceScale: {\n        visible: true,\n    },\n});\n")),(0,a.kt)("p",null,"then specify target price scale while creating a series:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-js"},"const histSeries = chart.addHistogramSeries({\n    priceScaleId: 'left',\n});\n")),(0,a.kt)("p",null,"New version fully supports this case via the old API, however this support will be removed in the future releases."),(0,a.kt)("h3",{id:"no-price-scale"},"No price scale"),(0,a.kt)("p",null,"To create chart without any visible price scale, instead of"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-js"},"const chart = LightweightCharts.createChart(container, {\n    priceScale: {\n        position: 'none',\n    },\n});\n")),(0,a.kt)("p",null,"use"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-js"},"const chart = LightweightCharts.createChart(container, {\n    leftPriceScale: {\n        visible: false,\n    },\n    rightPriceScale: {\n        visible: false,\n    },\n});\n")),(0,a.kt)("p",null,"New version fully supports this case via the old API, however this support will be removed in the future releases."),(0,a.kt)("h3",{id:"creating-overlay"},"Creating overlay"),(0,a.kt)("p",null,"To create an overlay series, instead of"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-js"},"const histogramSeries = chart.addHistogramSeries({\n    overlay: true,\n});\n")),(0,a.kt)("p",null,"use"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-js"},"const histogramSeries = chart.addHistogramSeries({\n    // or any other _the same_ id for all overlay series\n    priceScaleId: '',\n});\n")),(0,a.kt)("p",null,"New version fully supports this case via the old API, however this support will be removed in the future releases."),(0,a.kt)("h3",{id:"move-price-scale-from-right-to-left-or-vice-versa"},"Move price scale from right to left or vice versa"),(0,a.kt)("p",null,"To do this, instead of"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-js"},"const chart = LightweightCharts.createChart(container);\n\nconst mainSeries = chart.addLineSeries();\n\n// ...\n\nchart.applyOptions({\n    priceScale: {\n        position: 'left',\n    },\n});\n")),(0,a.kt)("p",null,"use"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-js"},"const chart = LightweightCharts.createChart(container);\n\nconst mainSeries = chart.addLineSeries();\n\n// ...\n\nchart.applyOptions({\n    leftPriceScale: {\n        visible: true,\n    },\n    rightPriceScale: {\n        visible: false,\n    },\n});\n\nmainSeries.applyOptions({\n    priceScaleId: 'left',\n});\n")),(0,a.kt)("p",null,"New version does not support this case via the old API, so, if you use it, you should migrate your code in order of keeping it working."))}m.isMDXComponent=!0}}]);