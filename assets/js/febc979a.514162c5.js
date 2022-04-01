"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[9915],{3905:function(e,t,n){n.d(t,{Zo:function(){return c},kt:function(){return u}});var a=n(7294);function i(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function r(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?r(Object(n),!0).forEach((function(t){i(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):r(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,a,i=function(e,t){if(null==e)return{};var n,a,i={},r=Object.keys(e);for(a=0;a<r.length;a++)n=r[a],t.indexOf(n)>=0||(i[n]=e[n]);return i}(e,t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);for(a=0;a<r.length;a++)n=r[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(i[n]=e[n])}return i}var s=a.createContext({}),d=function(e){var t=a.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},c=function(e){var t=d(e.components);return a.createElement(s.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},h=a.forwardRef((function(e,t){var n=e.components,i=e.mdxType,r=e.originalType,s=e.parentName,c=l(e,["components","mdxType","originalType","parentName"]),h=d(n),u=i,m=h["".concat(s,".").concat(u)]||h[u]||p[u]||r;return n?a.createElement(m,o(o({ref:t},c),{},{components:n})):a.createElement(m,o({ref:t},c))}));function u(e,t){var n=arguments,i=t&&t.mdxType;if("string"==typeof e||i){var r=n.length,o=new Array(r);o[0]=h;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l.mdxType="string"==typeof e?e:i,o[1]=l;for(var d=2;d<r;d++)o[d]=n[d];return a.createElement.apply(null,o)}return a.createElement.apply(null,n)}h.displayName="MDXCreateElement"},9798:function(e,t,n){n.r(t),n.d(t,{assets:function(){return c},contentTitle:function(){return s},default:function(){return u},frontMatter:function(){return l},metadata:function(){return d},toc:function(){return p}});var a=n(7462),i=n(3366),r=(n(7294),n(3905)),o=["components"],l={id:"android",description:"You can use Lightweight Charts inside an Android application. To use Lightweight Charts in that context, you can use our Android wrapper, which will allow you to interact with lightweight charts library, which will be rendered in a web view.",keywords:["charts","android","canvas","charting library","charting","html5 charts","financial charting library"],sidebar_position:7},s="Android wrapper",d={unversionedId:"android",id:"version-3.8/android",title:"Android wrapper",description:"You can use Lightweight Charts inside an Android application. To use Lightweight Charts in that context, you can use our Android wrapper, which will allow you to interact with lightweight charts library, which will be rendered in a web view.",source:"@site/versioned_docs/version-3.8/android.md",sourceDirName:".",slug:"/android",permalink:"/lightweight-charts/docs/android",tags:[],version:"3.8",sidebarPosition:7,frontMatter:{id:"android",description:"You can use Lightweight Charts inside an Android application. To use Lightweight Charts in that context, you can use our Android wrapper, which will allow you to interact with lightweight charts library, which will be rendered in a web view.",keywords:["charts","android","canvas","charting library","charting","html5 charts","financial charting library"],sidebar_position:7},sidebar:"docsSidebar",previous:{title:"iOS wrapper",permalink:"/lightweight-charts/docs/ios"}},c={},p=[{value:"Installation",id:"installation",level:2},{value:"Usage",id:"usage",level:2},{value:"How to run the provided example",id:"how-to-run-the-provided-example",level:2}],h={toc:p};function u(e){var t=e.components,n=(0,i.Z)(e,o);return(0,r.kt)("wrapper",(0,a.Z)({},h,n,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("h1",{id:"android-wrapper"},"Android wrapper"),(0,r.kt)("div",{className:"admonition admonition-note alert alert--secondary"},(0,r.kt)("div",{parentName:"div",className:"admonition-heading"},(0,r.kt)("h5",{parentName:"div"},(0,r.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,r.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"14",height:"16",viewBox:"0 0 14 16"},(0,r.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M6.3 5.69a.942.942 0 0 1-.28-.7c0-.28.09-.52.28-.7.19-.18.42-.28.7-.28.28 0 .52.09.7.28.18.19.28.42.28.7 0 .28-.09.52-.28.7a1 1 0 0 1-.7.3c-.28 0-.52-.11-.7-.3zM8 7.99c-.02-.25-.11-.48-.31-.69-.2-.19-.42-.3-.69-.31H6c-.27.02-.48.13-.69.31-.2.2-.3.44-.31.69h1v3c.02.27.11.5.31.69.2.2.42.31.69.31h1c.27 0 .48-.11.69-.31.2-.19.3-.42.31-.69H8V7.98v.01zM7 2.3c-3.14 0-5.7 2.54-5.7 5.68 0 3.14 2.56 5.7 5.7 5.7s5.7-2.55 5.7-5.7c0-3.15-2.56-5.69-5.7-5.69v.01zM7 .98c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.12-7-7 3.14-7 7-7z"}))),"note")),(0,r.kt)("div",{parentName:"div",className:"admonition-content"},(0,r.kt)("p",{parentName:"div"},"You can find the source code of the Lightweight Charts Android wrapper in ",(0,r.kt)("a",{parentName:"p",href:"https://github.com/tradingview/lightweight-charts-android"},"this repository"),"."))),(0,r.kt)("p",null,"You can use Lightweight Charts inside an Android application. To use Lightweight Charts in that context, you can use our Android wrapper, which will allow you to interact with lightweight charts library, which will be rendered in a web view."),(0,r.kt)("h2",{id:"installation"},"Installation"),(0,r.kt)("div",{className:"admonition admonition-info alert alert--info"},(0,r.kt)("div",{parentName:"div",className:"admonition-heading"},(0,r.kt)("h5",{parentName:"div"},(0,r.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,r.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"14",height:"16",viewBox:"0 0 14 16"},(0,r.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M7 2.3c3.14 0 5.7 2.56 5.7 5.7s-2.56 5.7-5.7 5.7A5.71 5.71 0 0 1 1.3 8c0-3.14 2.56-5.7 5.7-5.7zM7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm1 3H6v5h2V4zm0 6H6v2h2v-2z"}))),"info")),(0,r.kt)("div",{parentName:"div",className:"admonition-content"},(0,r.kt)("p",{parentName:"div"},"Requires minSdkVersion 21, and installed WebView with support of ES6"))),(0,r.kt)("p",null,"In ",(0,r.kt)("inlineCode",{parentName:"p"},"/build.gradle")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-groovy"},"allprojects {\n    repositories {\n        google()\n        mavenCentral()\n    }\n}\n")),(0,r.kt)("p",null,"In ",(0,r.kt)("inlineCode",{parentName:"p"},"/gradle_module/build.gradle")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-groovy"},"dependencies {\n    //...\n    implementation 'com.tradingview:lightweightcharts:3.8.0'\n}\n")),(0,r.kt)("h2",{id:"usage"},"Usage"),(0,r.kt)("p",null,"Add view to the layout."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-xml"},'<androidx.constraintlayout.widget.ConstraintLayout\n        android:layout_width="match_parent"\n        android:layout_height="match_parent">\n\n        <com.tradingview.lightweightcharts.view.ChartsView\n            android:id="@+id/charts_view"\n            android:layout_width="0dp"\n            android:layout_height="0dp"\n            app:layout_constraintBottom_toBottomOf="parent"\n            app:layout_constraintLeft_toLeftOf="parent"\n            app:layout_constraintRight_toRightOf="parent"\n            app:layout_constraintTop_toTopOf="parent" />\n\n</androidx.constraintlayout.widget.ConstraintLayout>\n')),(0,r.kt)("p",null,"Configure the chart layout."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-kotlin"},'charts_view.api.applyOptions {\n    layout = layoutOptions {\n        background = SolidColor(Color.LTGRAY)\n        textColor = Color.BLACK.toIntColor()\n    }\n    localization = localizationOptions {\n        locale = "ru-RU"\n        priceFormatter = PriceFormatter(template = "{price:#2:#3}$")\n        timeFormatter = TimeFormatter(\n            locale = "ru-RU",\n            dateTimeFormat = DateTimeFormat.DATE_TIME\n        )\n    }\n}\n')),(0,r.kt)("p",null,"Add any series to the chart and store a reference to it."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-kotlin"},"lateinit var histogramSeries: SeriesApi\ncharts_view.api.addHistogramSeries(\n    onSeriesCreated = { series ->\n        histogramSeries = series\n    }\n)\n")),(0,r.kt)("p",null,"Add data to the series."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-kotlin"},"val data = listOf(\n    HistogramData(Time.BusinessDay(2019, 6, 11), 40.01f),\n    HistogramData(Time.BusinessDay(2019, 6, 12), 52.38f),\n    HistogramData(Time.BusinessDay(2019, 6, 13), 36.30f),\n    HistogramData(Time.BusinessDay(2019, 6, 14), 34.48f),\n    WhitespaceData(Time.BusinessDay(2019, 6, 15)),\n    WhitespaceData(Time.BusinessDay(2019, 6, 16)),\n    HistogramData(Time.BusinessDay(2019, 6, 17), 41.50f),\n    HistogramData(Time.BusinessDay(2019, 6, 18), 34.82f)\n)\nhistogramSeries.setData(data)\n")),(0,r.kt)("h2",{id:"how-to-run-the-provided-example"},"How to run the provided example"),(0,r.kt)("p",null,"The ",(0,r.kt)("a",{parentName:"p",href:"https://github.com/tradingview/lightweight-charts-android"},"GitHub repository")," for lightweight-charts-android contains an example of the library in action.\nYou can run the example (LighweightCharts.app) by cloning the repository and opening it in Android Studio. You will need to have ",(0,r.kt)("a",{parentName:"p",href:"https://nodejs.org/"},"NodeJS/NPM")," installed."))}u.isMDXComponent=!0}}]);