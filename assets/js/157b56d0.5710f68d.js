"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[9746],{3905:function(e,t,a){a.d(t,{Zo:function(){return p},kt:function(){return u}});var n=a(7294);function r(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function i(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,n)}return a}function s(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?i(Object(a),!0).forEach((function(t){r(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):i(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function o(e,t){if(null==e)return{};var a,n,r=function(e,t){if(null==e)return{};var a,n,r={},i=Object.keys(e);for(n=0;n<i.length;n++)a=i[n],t.indexOf(a)>=0||(r[a]=e[a]);return r}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(n=0;n<i.length;n++)a=i[n],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(r[a]=e[a])}return r}var l=n.createContext({}),c=function(e){var t=n.useContext(l),a=t;return e&&(a="function"==typeof e?e(t):s(s({},t),e)),a},p=function(e){var t=c(e.components);return n.createElement(l.Provider,{value:t},e.children)},h={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},d=n.forwardRef((function(e,t){var a=e.components,r=e.mdxType,i=e.originalType,l=e.parentName,p=o(e,["components","mdxType","originalType","parentName"]),d=c(a),u=r,m=d["".concat(l,".").concat(u)]||d[u]||h[u]||i;return a?n.createElement(m,s(s({ref:t},p),{},{components:a})):n.createElement(m,s({ref:t},p))}));function u(e,t){var a=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var i=a.length,s=new Array(i);s[0]=d;var o={};for(var l in t)hasOwnProperty.call(t,l)&&(o[l]=t[l]);o.originalType=e,o.mdxType="string"==typeof e?e:r,s[1]=o;for(var c=2;c<i;c++)s[c]=a[c];return n.createElement.apply(null,s)}return n.createElement.apply(null,a)}d.displayName="MDXCreateElement"},2516:function(e,t,a){a.r(t),a.d(t,{frontMatter:function(){return o},contentTitle:function(){return l},metadata:function(){return c},toc:function(){return p},default:function(){return d}});var n=a(7462),r=a(3366),i=(a(7294),a(3905)),s=["components"],o={slug:"/",id:"intro",sidebar_position:0},l="Getting started",c={unversionedId:"intro",id:"version-3.8/intro",title:"Getting started",description:"Installation",source:"@site/versioned_docs/version-3.8/intro.md",sourceDirName:".",slug:"/",permalink:"/lightweight-charts/docs/",tags:[],version:"3.8",sidebarPosition:0,frontMatter:{slug:"/",id:"intro",sidebar_position:0},sidebar:"docsSidebar",next:{title:"Series types",permalink:"/lightweight-charts/docs/series-types"}},p=[{value:"Installation",id:"installation",children:[],level:2},{value:"Creating a chart",id:"creating-a-chart",children:[],level:2},{value:"Creating a series",id:"creating-a-series",children:[],level:2},{value:"Setting and updating a data",id:"setting-and-updating-a-data",children:[{value:"Setting the data to a series",id:"setting-the-data-to-a-series",children:[],level:3},{value:"Updating the data in a series",id:"updating-the-data-in-a-series",children:[],level:3}],level:2}],h={toc:p};function d(e){var t=e.components,o=(0,r.Z)(e,s);return(0,i.kt)("wrapper",(0,n.Z)({},h,o,{components:t,mdxType:"MDXLayout"}),(0,i.kt)("h1",{id:"getting-started"},"Getting started"),(0,i.kt)("h2",{id:"installation"},"Installation"),(0,i.kt)("p",null,"The first thing you need to do to use ",(0,i.kt)("inlineCode",{parentName:"p"},"lightweight-charts")," is to install it from ",(0,i.kt)("a",{parentName:"p",href:"https://www.npmjs.com/"},"npm"),":"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-console"},"npm install --save lightweight-charts\n")),(0,i.kt)("p",null,(0,i.kt)("em",{parentName:"p"},"Note that the package is shipped with TypeScript declarations, so you can easily use it within TypeScript code.")),(0,i.kt)("h2",{id:"creating-a-chart"},"Creating a chart"),(0,i.kt)("p",null,"Once the library has been installed in your repo you're ready to create your first chart."),(0,i.kt)("p",null,"First of all, in a file where you would like to create a chart you need to import the library:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-js"},"import { createChart } from 'lightweight-charts';\n")),(0,i.kt)("p",null,(0,i.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/#createchart"},(0,i.kt)("inlineCode",{parentName:"a"},"createChart"))," is the entry-point for creating charts. You can use it to create as many charts as you need:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-js"},"import { createChart } from 'lightweight-charts';\n\n// ...\n\n// somewhere in your code\nconst firstChart = createChart(firstContainer);\nconst secondChart = createChart(secondContainer);\n")),(0,i.kt)("p",null,"The result of this function is a ",(0,i.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/IChartApi"},(0,i.kt)("inlineCode",{parentName:"a"},"IChartApi"))," object, which you need to use to work with a chart instance."),(0,i.kt)("h2",{id:"creating-a-series"},"Creating a series"),(0,i.kt)("p",null,"Once your chart is created it is ready to display data."),(0,i.kt)("p",null,"The basic primitive to display a data is ",(0,i.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/ISeriesApi"},"a series"),".\nThere are different types of series:"),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},"Area"),(0,i.kt)("li",{parentName:"ul"},"Bar"),(0,i.kt)("li",{parentName:"ul"},"Baseline"),(0,i.kt)("li",{parentName:"ul"},"Candlestick"),(0,i.kt)("li",{parentName:"ul"},"Histogram"),(0,i.kt)("li",{parentName:"ul"},"Line")),(0,i.kt)("p",null,"To create a series with desired type you need to use appropriate method from ",(0,i.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/IChartApi"},(0,i.kt)("inlineCode",{parentName:"a"},"IChartApi")),".\nAll of them have the same naming ",(0,i.kt)("inlineCode",{parentName:"p"},"add<type>Series"),", where ",(0,i.kt)("inlineCode",{parentName:"p"},"<type>")," is a type of a series you'd like to create:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-js"},"import { createChart } from 'lightweight-charts';\n\nconst chart = createChart(container);\n\nconst areaSeries = chart.addAreaSeries();\nconst barSeries = chart.addBarSeries();\nconst baselineSeries = chart.addBaselineSeries();\n// ... and so on\n")),(0,i.kt)("p",null,"Please look at ",(0,i.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/series-types"},"this page")," for more information about different series types."),(0,i.kt)("p",null,"Note that ",(0,i.kt)("strong",{parentName:"p"},"a series cannot be transferred from one type to another one")," since different series types have different data and options types."),(0,i.kt)("h2",{id:"setting-and-updating-a-data"},"Setting and updating a data"),(0,i.kt)("p",null,"Once your chart and series are created it's time to set data to the series."),(0,i.kt)("p",null,"Note that regardless of the series type, the API calls are the same (the type of the data might be different though)."),(0,i.kt)("h3",{id:"setting-the-data-to-a-series"},"Setting the data to a series"),(0,i.kt)("p",null,"To set the data (or to replace all data items) to a series you need to use ",(0,i.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/ISeriesApi#setdata"},(0,i.kt)("inlineCode",{parentName:"a"},"ISeriesApi.setData"))," method:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-js"},"import { createChart } from 'lightweight-charts';\n\nconst chart = createChart(container);\n\nconst areaSeries = chart.addAreaSeries();\nareaSeries.setData([\n    { time: '2018-12-22', value: 32.51 },\n    { time: '2018-12-23', value: 31.11 },\n    { time: '2018-12-24', value: 27.02 },\n    { time: '2018-12-25', value: 27.32 },\n    { time: '2018-12-26', value: 25.17 },\n    { time: '2018-12-27', value: 28.89 },\n    { time: '2018-12-28', value: 25.46 },\n    { time: '2018-12-29', value: 23.92 },\n    { time: '2018-12-30', value: 22.68 },\n    { time: '2018-12-31', value: 22.67 },\n]);\n\nconst candlestickSeries = chart.addCandlestickSeries();\ncandlestickSeries.setData([\n    { time: '2018-12-22', open: 75.16, high: 82.84, low: 36.16, close: 45.72 },\n    { time: '2018-12-23', open: 45.12, high: 53.90, low: 45.12, close: 48.09 },\n    { time: '2018-12-24', open: 60.71, high: 60.71, low: 53.39, close: 59.29 },\n    { time: '2018-12-25', open: 68.26, high: 68.26, low: 59.04, close: 60.50 },\n    { time: '2018-12-26', open: 67.71, high: 105.85, low: 66.67, close: 91.04 },\n    { time: '2018-12-27', open: 91.04, high: 121.40, low: 82.70, close: 111.40 },\n    { time: '2018-12-28', open: 111.51, high: 142.83, low: 103.34, close: 131.25 },\n    { time: '2018-12-29', open: 131.33, high: 151.17, low: 77.68, close: 96.43 },\n    { time: '2018-12-30', open: 106.33, high: 110.20, low: 90.39, close: 98.10 },\n    { time: '2018-12-31', open: 109.87, high: 114.69, low: 85.66, close: 111.26 },\n]);\n")),(0,i.kt)("p",null,"It's pretty easy, isn't it? That's it, your chart is ready to be displayed on the page:"),(0,i.kt)("p",null,(0,i.kt)("img",{alt:"First simple chart",src:a(3852).Z,title:"First simple chart",width:"900",height:"450"})),(0,i.kt)("h3",{id:"updating-the-data-in-a-series"},"Updating the data in a series"),(0,i.kt)("p",null,"In a case when your data is updated (e.g. real-time updates) you might want to update the chart as well."),(0,i.kt)("p",null,"But using ",(0,i.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/ISeriesApi#setdata"},(0,i.kt)("inlineCode",{parentName:"a"},"ISeriesApi.setData"))," very often might affect the performance and we do not recommend to do this.\nAlso it replaces all series data with the new one, and probably this is not what you're looking for."),(0,i.kt)("p",null,"Thus, to update the data you can use a method ",(0,i.kt)("a",{parentName:"p",href:"/lightweight-charts/docs/api/interfaces/ISeriesApi#update"},(0,i.kt)("inlineCode",{parentName:"a"},"ISeriesApi.update")),".\nIt allows you to update the last data item or add a new one much faster without affecting the performance:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-js"},"import { createChart } from 'lightweight-charts';\n\nconst chart = createChart(container);\n\nconst areaSeries = chart.addAreaSeries();\nareaSeries.setData([\n    // ... other data items\n    { time: '2018-12-31', value: 22.67 },\n]);\n\nconst candlestickSeries = chart.addCandlestickSeries();\ncandlestickSeries.setData([\n    // ... other data items\n    { time: '2018-12-31', open: 109.87, high: 114.69, low: 85.66, close: 111.26 },\n]);\n\n// sometime later\n\n// update the most recent bar\nareaSeries.update({ time: '2018-12-31', value: 25 });\ncandlestickSeries.update({ time: '2018-12-31', open: 109.87, high: 114.69, low: 85.66, close: 112 });\n\n// creating the new bar\nareaSeries.update({ time: '2019-01-01', value: 20 });\ncandlestickSeries.update({ time: '2019-01-01', open: 112, high: 112, low: 100, close: 101 });\n")))}d.isMDXComponent=!0},3852:function(e,t,a){t.Z=a.p+"assets/images/first-chart-e469628894eaf814a4c1f0c314046919.png"}}]);