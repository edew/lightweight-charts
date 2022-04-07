"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[5184],{9176:function(t,e,n){n.r(e),n.d(e,{assets:function(){return f},contentTitle:function(){return C},default:function(){return L},frontMatter:function(){return O},metadata:function(){return v},toc:function(){return _}});var a=n(7462),r=n(3366),o=n(7294),i=n(3905),l=n(6383),c=n(3296),s=n(2300),u=function(t){var e=t.data,n=t.colors,a=n.backgroundColor,r=void 0===a?CHART_BACKGROUND_COLOR:a,i=n.lineColor,l=void 0===i?LINE_LINE_COLOR:i,c=n.textColor,u=void 0===c?CHART_TEXT_COLOR:c,p=n.areaTopColor,m=void 0===p?AREA_TOP_COLOR:p,d=n.areaBottomColor,h=void 0===d?AREA_BOTTOM_COLOR:d,O=(0,o.useRef)();return(0,o.useEffect)((function(){var t=function(){n.applyOptions({width:O.current.clientWidth})},n=(0,s.C2)(O.current,{layout:{background:{type:s.Mr.Solid,color:r},textColor:u},width:O.current.clientWidth,height:300});return n.timeScale().fitContent(),n.addAreaSeries().setData(e),window.addEventListener("resize",t),function(){window.removeEventListener("resize",t),n.remove()}}),[e,r,l,u,m,h]),o.createElement("div",{ref:O})},p=[{time:"2018-12-22",value:32.51},{time:"2018-12-23",value:31.11},{time:"2018-12-24",value:27.02},{time:"2018-12-25",value:27.32},{time:"2018-12-26",value:25.17},{time:"2018-12-27",value:28.89},{time:"2018-12-28",value:25.46},{time:"2018-12-29",value:23.92},{time:"2018-12-30",value:22.68},{time:"2018-12-31",value:22.67}];function m(t){return o.createElement(u,(0,a.Z)({},t,{data:p}))}var d=n(5804),h=["components"],O={sidebar_label:"Simple example",hide_table_of_contents:!0},C="React - Simple example",v={unversionedId:"react/simple",id:"react/simple",title:"React - Simple example",description:"The following only describes a relatively simple example that only renders an area series that could be tweaked to render any other type of series.",source:"@site/tutorials/react/01-simple.mdx",sourceDirName:"react",slug:"/react/simple",permalink:"/lightweight-charts/tutorials/react/simple",tags:[],version:"current",sidebarPosition:1,frontMatter:{sidebar_label:"Simple example",hide_table_of_contents:!0},sidebar:"tutorialsSidebar",previous:{title:"Tutorials",permalink:"/lightweight-charts/tutorials/"},next:{title:"Advanced example",permalink:"/lightweight-charts/tutorials/react/advanced"}},f={},_=[{value:"Preparing your project",id:"preparing-your-project",level:2},{value:"Creating a charting component",id:"creating-a-charting-component",level:2}],R={toc:_};function L(t){var e=t.components,n=(0,r.Z)(t,h);return(0,i.kt)("wrapper",(0,a.Z)({},R,n,{components:e,mdxType:"MDXLayout"}),(0,i.kt)("h1",{id:"react---simple-example"},"React - Simple example"),(0,i.kt)("div",{className:"admonition admonition-info alert alert--info"},(0,i.kt)("div",{parentName:"div",className:"admonition-heading"},(0,i.kt)("h5",{parentName:"div"},(0,i.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,i.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"14",height:"16",viewBox:"0 0 14 16"},(0,i.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M7 2.3c3.14 0 5.7 2.56 5.7 5.7s-2.56 5.7-5.7 5.7A5.71 5.71 0 0 1 1.3 8c0-3.14 2.56-5.7 5.7-5.7zM7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm1 3H6v5h2V4zm0 6H6v2h2v-2z"}))),"info")),(0,i.kt)("div",{parentName:"div",className:"admonition-content"},(0,i.kt)("p",{parentName:"div"},"The following only describes a relatively simple example that only renders an ",(0,i.kt)("a",{parentName:"p",href:"/docs/series-types#area"},"area series")," that could be tweaked to render any other type of ",(0,i.kt)("a",{parentName:"p",href:"/docs/series-types"},"series"),"."),(0,i.kt)("p",{parentName:"div"},"For a more complete scenario where you could wrap Lightweight Charts into a component having sub components, please consult this ",(0,i.kt)("a",{parentName:"p",href:"./advanced"},"example"),"."))),(0,i.kt)("p",null,"On this page you will learn how to easily use Lightweight Charts with React."),(0,i.kt)("h2",{id:"preparing-your-project"},"Preparing your project"),(0,i.kt)("p",null,"For the example purpose we are using ",(0,i.kt)("a",{parentName:"p",href:"https://github.com/brandiqa/react-parcel-starter"},"Parcel starter kit")," but feel free to use any other tool or starter kit."),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-console"},"git clone git@github.com:brandiqa/react-parcel-starter.git lwc-react\ncd lwc-react\nnpm install\n")),(0,i.kt)("p",null,"To run your project simply"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-console"},"npm start\n")),(0,i.kt)("p",null,"This will create a web page accessible by default on ",(0,i.kt)("a",{parentName:"p",href:"http://localhost:1234/"},"http://localhost:1234/"),"."),(0,i.kt)("h2",{id:"creating-a-charting-component"},"Creating a charting component"),(0,i.kt)("p",null,"The example ",(0,i.kt)("em",{parentName:"p"},"React component")," on this page may not fit your requirements completely. Creating a general purpose declarative wrapper for Lightweight Charts' imperative API is a challenge, but hopefully you can adapt this example to your use case."),(0,i.kt)("div",{className:"admonition admonition-info alert alert--info"},(0,i.kt)("div",{parentName:"div",className:"admonition-heading"},(0,i.kt)("h5",{parentName:"div"},(0,i.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,i.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"14",height:"16",viewBox:"0 0 14 16"},(0,i.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M7 2.3c3.14 0 5.7 2.56 5.7 5.7s-2.56 5.7-5.7 5.7A5.71 5.71 0 0 1 1.3 8c0-3.14 2.56-5.7 5.7-5.7zM7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm1 3H6v5h2V4zm0 6H6v2h2v-2z"}))),"info")),(0,i.kt)("div",{parentName:"div",className:"admonition-content"},(0,i.kt)("p",{parentName:"div"},"For this example we are using props to set chart colors based on the current theme (light or dark). In your real code it might be a better idea to use a ",(0,i.kt)("a",{parentName:"p",href:"https://reactjs.org/docs/context.html#when-to-use-context"},"Context"),"."))),(0,i.kt)(c.Z,{replaceThemeConstants:!0,className:"language-jsx",mdxType:"CodeBlock"},"import { createChart, ColorType } from 'lightweight-charts';\nimport React, { useEffect, useRef } from 'react';\n\nexport const ChartComponent = props => {\n\tconst {\n\t\tdata,\n\t\tcolors: {\n\t\t\tbackgroundColor = CHART_BACKGROUND_COLOR,\n\t\t\tlineColor = LINE_LINE_COLOR,\n\t\t\ttextColor = CHART_TEXT_COLOR,\n\t\t\tareaTopColor = AREA_TOP_COLOR,\n\t\t\tareaBottomColor = AREA_BOTTOM_COLOR,\n\t\t},\n\t} = props;\n\tconst chartContainerRef = useRef();\n\n\tuseEffect(\n\t\t() => {\n\t\t\tconst handleResize = () => {\n\t\t\t\tchart.applyOptions({ width: chartContainerRef.current.clientWidth });\n\t\t\t};\n\n\t\t\tconst chart = createChart(chartContainerRef.current, {\n\t\t\t\tlayout: {\n\t\t\t\t\tbackground: { type: ColorType.Solid, color: backgroundColor },\n\t\t\t\t\ttextColor,\n\t\t\t\t},\n\t\t\t\twidth: chartContainerRef.current.clientWidth,\n\t\t\t\theight: 300,\n\t\t\t});\n\t\t\tchart.timeScale().fitContent();\n\n\t\t\tconst newSeries = chart.addAreaSeries();\n\t\t\tnewSeries.setData(data);\n\n\t\t\twindow.addEventListener('resize', handleResize);\n\n\t\t\treturn () => {\n\t\t\t\twindow.removeEventListener('resize', handleResize);\n\n\t\t\t\tchart.remove();\n\t\t\t};\n\t\t},\n\t\t[data, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor]\n\t);\n\n\treturn (\n\t\t<div\n\t\t\tref={chartContainerRef}\n\t\t/>\n\t);\n};\n\nconst initialData = [\n\t{ time: '2018-12-22', value: 32.51 },\n\t{ time: '2018-12-23', value: 31.11 },\n\t{ time: '2018-12-24', value: 27.02 },\n\t{ time: '2018-12-25', value: 27.32 },\n\t{ time: '2018-12-26', value: 25.17 },\n\t{ time: '2018-12-27', value: 28.89 },\n\t{ time: '2018-12-28', value: 25.46 },\n\t{ time: '2018-12-29', value: 23.92 },\n\t{ time: '2018-12-30', value: 22.68 },\n\t{ time: '2018-12-31', value: 22.67 },\n];\n\nexport function App(props) {\n\treturn (\n\t\t<ChartComponent {...props} data={initialData}></ChartComponent>\n\t);\n}\n"),(0,i.kt)("p",null,"and you'll have a reusable component that could then be enhanced, tweaked to meet your needs, adding properties and even functionalities."),(0,i.kt)("p",null,"If you've successfully followed all the steps you should see something similar to"),(0,i.kt)("div",{className:d.Z.ChartContainer},(0,i.kt)(l.Z,{ChartComponent:m,mdxType:"ThemedChart"})))}L.isMDXComponent=!0},3296:function(t,e,n){n.d(e,{Z:function(){return h}});var a=n(3366),r=n(7855),o=n(7294),i=n(1736),l=n(1262),c=n(9366);var s="iframe_R_Fr";var u=function(t){var e=t.script,a=window.origin,r=(0,c.E6)().version,i=function(t,e){return'\n\t\t<style>\n\t\t\thtml,\n\t\t\tbody,\n\t\t\t#container {\n\t\t\t\twidth: 100%;\n\t\t\t\theight: 100%;\n\t\t\t\toverflow: hidden;\n\t\t\t\tmargin: 0;\n\t\t\t}\n\t\t</style>\n\t\t<div id="container"></div>\n\t\t<script>\n\t\t\twindow.run = () => {\n\t\t\t\t'+t+"\n\t\t\t};\n\t\t<\/script>\n\t"}(e),l=o.useRef(null);return o.useEffect((function(){var t=l.current,e=null==t?void 0:t.contentWindow,a=null==t?void 0:t.contentDocument;if(null!==t&&e&&a){var o=function(){(function(t){switch(t){case"current":return n.e(3537).then(n.bind(n,3537));case"3.8":return n.e(193).then(n.bind(n,193))}})(r).then((function(t){var n=t.createChart;e.createChart=function(t,a){var r=n(t,a);return e.addEventListener("resize",(function(){var e=t.getBoundingClientRect();r.resize(e.width,e.height)}),!0),r},void 0!==e.run&&e.run()})).catch((function(t){console.error(t)}))};if("complete"===a.readyState&&void 0!==e.run)o();else{t.addEventListener("load",(function e(){o(),t.removeEventListener("load",e)}))}}}),[a,i]),o.createElement("iframe",{key:e,ref:l,srcDoc:i,className:s})},p=n(3864),m=["chart","replaceThemeConstants"],d=Object.keys(p.l.DARK);var h=function(t){var e=t.chart,n=t.replaceThemeConstants,h=(0,a.Z)(t,m),O=t.children,C=(0,c.If)().isDarkTheme;return n&&"string"==typeof O&&(O=function(t,e){for(var n,a=e?p.l.DARK:p.l.LIGHT,o=t,i=(0,r.Z)(d);!(n=i()).done;){var l=n.value;o=o.replace(new RegExp(l,"g"),"'"+a[l]+"'")}return o}(O,C)),e?o.createElement(o.Fragment,null,o.createElement(i.Z,h,O),o.createElement(l.Z,{fallback:o.createElement("div",{className:s},"\xa0")},(function(){return o.createElement(u,{script:O})}))):o.createElement(i.Z,h,O)}},6383:function(t,e,n){n.d(e,{Z:function(){return l}});var a=n(9366),r=n(7294),o=n(3864);function i(t){var e=t?"DARK":"LIGHT";return{backgroundColor:o.l[e].CHART_BACKGROUND_COLOR,lineColor:o.l[e].LINE_LINE_COLOR,textColor:o.l[e].CHART_TEXT_COLOR,areaTopColor:o.l[e].AREA_TOP_COLOR,areaBottomColor:o.l[e].AREA_BOTTOM_COLOR}}function l(t){var e=t.ChartComponent,n=function(){var t=(0,a.If)().isDarkTheme,e=(0,r.useState)(i(t)),n=e[0],o=e[1];return(0,r.useEffect)((function(){o(i(t))}),[t]),n}();return r.createElement(e,{colors:n})}},3864:function(t,e,n){n.d(e,{l:function(){return i}});var a=function(t){return"rgba(15, 216, 62, "+t+")"},r=function(t){return"rgba(255, 64, 64, "+t+")"},o=function(t){return"rgba(41, 98, 255, "+t+")"},i={DARK:{CHART_BACKGROUND_COLOR:"black",LINE_LINE_COLOR:o(.9),AREA_TOP_COLOR:o(.5),AREA_BOTTOM_COLOR:o(.2),BAR_UP_COLOR:a(1),BAR_DOWN_COLOR:r(1),BASELINE_TOP_LINE_COLOR:a(1),BASELINE_TOP_FILL_COLOR1:a(.9),BASELINE_TOP_FILL_COLOR2:a(.1),BASELINE_BOTTOM_LINE_COLOR:r(1),BASELINE_BOTTOM_FILL_COLOR1:r(.1),BASELINE_BOTTOM_FILL_COLOR2:r(.9),HISTOGRAM_COLOR:a(1),CHART_TEXT_COLOR:"white"},LIGHT:{CHART_BACKGROUND_COLOR:"white",LINE_LINE_COLOR:o(.9),AREA_TOP_COLOR:o(.5),AREA_BOTTOM_COLOR:o(.05),BAR_UP_COLOR:a(1),BAR_DOWN_COLOR:r(1),BASELINE_TOP_LINE_COLOR:a(.5),BASELINE_TOP_FILL_COLOR1:a(.4),BASELINE_TOP_FILL_COLOR2:a(0),BASELINE_BOTTOM_LINE_COLOR:r(1),BASELINE_BOTTOM_FILL_COLOR1:r(0),BASELINE_BOTTOM_FILL_COLOR2:r(.9),HISTOGRAM_COLOR:a(1),CHART_TEXT_COLOR:"black"}}},5804:function(t,e){e.Z={ChartContainer:"ChartContainer_Hwvl"}}}]);