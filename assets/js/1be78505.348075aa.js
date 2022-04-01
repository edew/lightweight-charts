"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[9514,4608],{3254:function(e,t,n){n.r(t),n.d(t,{default:function(){return ie}});var a=n(7294),r=n(3905),i=n(8790),l=n(1872),c=n(6010),o=n(9366),s=n(5500),d=n(7462);function u(e){return a.createElement("svg",(0,d.Z)({width:"20",height:"20","aria-hidden":"true"},e),a.createElement("g",{fill:"#7a7a7a"},a.createElement("path",{d:"M9.992 10.023c0 .2-.062.399-.172.547l-4.996 7.492a.982.982 0 01-.828.454H1c-.55 0-1-.453-1-1 0-.2.059-.403.168-.551l4.629-6.942L.168 3.078A.939.939 0 010 2.528c0-.548.45-.997 1-.997h2.996c.352 0 .649.18.828.45L9.82 9.472c.11.148.172.347.172.55zm0 0"}),a.createElement("path",{d:"M19.98 10.023c0 .2-.058.399-.168.547l-4.996 7.492a.987.987 0 01-.828.454h-3c-.547 0-.996-.453-.996-1 0-.2.059-.403.168-.551l4.625-6.942-4.625-6.945a.939.939 0 01-.168-.55 1 1 0 01.996-.997h3c.348 0 .649.18.828.45l4.996 7.492c.11.148.168.347.168.55zm0 0"})))}var m=n(5999),p=n(3366),f=n(9960),h=n(3919),E=n(541),b="menuHtmlItem_fVIQ",_=n(2389),v=["item"],O=["item","onItemClick","activePath","level","index"],L=["item","onItemClick","activePath","level","index"];function C(e){var t=e.item,n=(0,p.Z)(e,v);switch(t.type){case"category":return a.createElement(g,(0,d.Z)({item:t},n));case"html":return a.createElement(T,(0,d.Z)({item:t},n));default:return a.createElement(I,(0,d.Z)({item:t},n))}}function g(e){var t=e.item,n=e.onItemClick,r=e.activePath,i=e.level,l=e.index,s=(0,p.Z)(e,O),u=t.items,h=t.label,E=t.collapsible,b=t.className,v=t.href,L=function(e){var t=(0,_.Z)();return(0,a.useMemo)((function(){return e.href?e.href:!t&&e.collapsible?(0,o.Wl)(e):void 0}),[e,t])}(t),C=(0,o._F)(t,r),g=(0,o.Mg)(v,r),T=(0,o.uR)({initialState:function(){return!!E&&(!C&&t.collapsed)}}),I=T.collapsed,N=T.setCollapsed;!function(e){var t=e.isActive,n=e.collapsed,r=e.setCollapsed,i=(0,o.D9)(t);(0,a.useEffect)((function(){t&&!i&&n&&r(!1)}),[t,i,n,r])}({isActive:C,collapsed:I,setCollapsed:N});var Z=(0,o.fP)(),k=Z.expandedItem,S=Z.setExpandedItem;function A(e){void 0===e&&(e=!I),S(e?null:l),N(e)}var y=(0,o.LU)().autoCollapseSidebarCategories;return(0,a.useEffect)((function(){E&&k&&k!==l&&y&&N(!0)}),[E,k,l,N,y]),a.createElement("li",{className:(0,c.Z)(o.kM.docs.docSidebarItemCategory,o.kM.docs.docSidebarItemCategoryLevel(i),"menu__list-item",{"menu__list-item--collapsed":I},b)},a.createElement("div",{className:(0,c.Z)("menu__list-item-collapsible",{"menu__list-item-collapsible--active":g})},a.createElement(f.Z,(0,d.Z)({className:(0,c.Z)("menu__link",{"menu__link--sublist":E&&!v,"menu__link--active":C}),onClick:E?function(e){null==n||n(t),v?A(!1):(e.preventDefault(),A())}:function(){null==n||n(t)},"aria-current":g?"page":void 0,href:E?null!=L?L:"#":L},s),h),v&&E&&a.createElement("button",{"aria-label":(0,m.I)({id:"theme.DocSidebarItem.toggleCollapsedCategoryAriaLabel",message:"Toggle the collapsible sidebar category '{label}'",description:"The ARIA label to toggle the collapsible sidebar category"},{label:h}),type:"button",className:"clean-btn menu__caret",onClick:function(e){e.preventDefault(),A()}})),a.createElement(o.zF,{lazy:!0,as:"ul",className:"menu__list",collapsed:I},a.createElement(R,{items:u,tabIndex:I?-1:0,onItemClick:n,activePath:r,level:i+1})))}function T(e){var t=e.item,n=e.level,r=e.index,i=t.value,l=t.defaultStyle,s=t.className;return a.createElement("li",{className:(0,c.Z)(o.kM.docs.docSidebarItemLink,o.kM.docs.docSidebarItemLinkLevel(n),l&&b+" menu__list-item",s),key:r,dangerouslySetInnerHTML:{__html:i}})}function I(e){var t=e.item,n=e.onItemClick,r=e.activePath,i=e.level,l=(e.index,(0,p.Z)(e,L)),s=t.href,u=t.label,m=t.className,b=(0,o._F)(t,r);return a.createElement("li",{className:(0,c.Z)(o.kM.docs.docSidebarItemLink,o.kM.docs.docSidebarItemLinkLevel(i),"menu__list-item",m),key:u},a.createElement(f.Z,(0,d.Z)({className:(0,c.Z)("menu__link",{"menu__link--active":b}),"aria-current":b?"page":void 0,to:s},(0,h.Z)(s)&&{onClick:n?function(){return n(t)}:void 0},l),(0,h.Z)(s)?u:a.createElement("span",null,u,a.createElement(E.Z,null))))}var N=["items"];function Z(e){var t=e.items,n=(0,p.Z)(e,N);return a.createElement(o.D_,null,t.map((function(e,t){return a.createElement(C,(0,d.Z)({key:t,item:e,index:t},n))})))}var R=(0,a.memo)(Z),k="sidebar_CW9Y",S="sidebarWithHideableNavbar_FoYL",A="sidebarHidden_D64r",y="sidebarLogo_FJUI",B="menu_SkdO",M="menuWithAnnouncementBar_x19h",w="collapseSidebarButton_cwdi",x="collapseSidebarButtonIcon_xORG";function P(e){var t=e.onClick;return a.createElement("button",{type:"button",title:(0,m.I)({id:"theme.docs.sidebar.collapseButtonTitle",message:"Collapse sidebar",description:"The title attribute for collapse button of doc sidebar"}),"aria-label":(0,m.I)({id:"theme.docs.sidebar.collapseButtonAriaLabel",message:"Collapse sidebar",description:"The title attribute for collapse button of doc sidebar"}),className:(0,c.Z)("button button--secondary button--outline",w),onClick:t},a.createElement(u,{className:x}))}function F(e){var t,n,r=e.path,i=e.sidebar,l=e.onCollapse,d=e.isHidden,u=function(){var e=(0,o.nT)().isActive,t=(0,a.useState)(e),n=t[0],r=t[1];return(0,o.RF)((function(t){var n=t.scrollY;e&&r(0===n)}),[e]),e&&n}(),m=(0,o.LU)(),p=m.navbar.hideOnScroll,f=m.hideableSidebar;return a.createElement("div",{className:(0,c.Z)(k,(t={},t[S]=p,t[A]=d,t))},p&&a.createElement(s.Z,{tabIndex:-1,className:y}),a.createElement("nav",{className:(0,c.Z)("menu thin-scrollbar",B,(n={},n[M]=u,n))},a.createElement("ul",{className:(0,c.Z)(o.kM.docs.docSidebarMenu,"menu__list")},a.createElement(R,{items:i,activePath:r,level:1}))),f&&a.createElement(P,{onClick:l}))}var D=function(e){var t=e.toggleSidebar,n=e.sidebar,r=e.path;return a.createElement("ul",{className:(0,c.Z)(o.kM.docs.docSidebarMenu,"menu__list")},a.createElement(R,{items:n,activePath:r,onItemClick:function(e){"category"===e.type&&e.href&&t(),"link"===e.type&&t()},level:1}))};function H(e){return a.createElement(o.Cv,{component:D,props:e})}var W=a.memo(F),U=a.memo(H);function G(e){var t=(0,o.iP)(),n="desktop"===t||"ssr"===t,r="mobile"===t;return a.createElement(a.Fragment,null,n&&a.createElement(W,e),r&&a.createElement(U,e))}var Y=n(5742),K=n(5946),V=n(9649),z="details_BAp3";function j(e){var t=Object.assign({},e);return a.createElement(o.PO,(0,d.Z)({},t,{className:(0,c.Z)("alert alert--info",z,t.className)}))}var q=["mdxType","originalType"];var X={head:function(e){var t=a.Children.map(e.children,(function(e){return function(e){var t,n;if(null!=e&&null!=(t=e.props)&&t.mdxType&&null!=e&&null!=(n=e.props)&&n.originalType){var r=e.props,i=(r.mdxType,r.originalType,(0,p.Z)(r,q));return a.createElement(e.props.originalType,i)}return e}(e)}));return a.createElement(Y.Z,e,t)},code:function(e){var t=["a","b","big","i","span","em","strong","sup","sub","small"];return a.Children.toArray(e.children).every((function(e){return"string"==typeof e&&!e.includes("\n")||a.isValidElement(e)&&t.includes(e.props.mdxType)}))?a.createElement("code",e):a.createElement(K.Z,e)},a:function(e){return a.createElement(f.Z,e)},pre:function(e){var t;return a.createElement(K.Z,(0,a.isValidElement)(e.children)&&"code"===e.children.props.originalType?null==(t=e.children)?void 0:t.props:Object.assign({},e))},details:function(e){var t=a.Children.toArray(e.children),n=t.find((function(e){var t;return"summary"===(null==e||null==(t=e.props)?void 0:t.mdxType)})),r=a.createElement(a.Fragment,null,t.filter((function(e){return e!==n})));return a.createElement(j,(0,d.Z)({},e,{summary:n}),r)},h1:function(e){return a.createElement(V.Z,(0,d.Z)({as:"h1"},e))},h2:function(e){return a.createElement(V.Z,(0,d.Z)({as:"h2"},e))},h3:function(e){return a.createElement(V.Z,(0,d.Z)({as:"h3"},e))},h4:function(e){return a.createElement(V.Z,(0,d.Z)({as:"h4"},e))},h5:function(e){return a.createElement(V.Z,(0,d.Z)({as:"h5"},e))},h6:function(e){return a.createElement(V.Z,(0,d.Z)({as:"h6"},e))}},Q=n(4608),J="backToTopButton_RiI4",$="backToTopButtonShow_ssHd";function ee(){var e=(0,a.useRef)(null);return{smoothScrollTop:function(){var t;e.current=(t=null,function e(){var n=document.documentElement.scrollTop;n>0&&(t=requestAnimationFrame(e),window.scrollTo(0,Math.floor(.85*n)))}(),function(){return t&&cancelAnimationFrame(t)})},cancelScrollToTop:function(){return null==e.current?void 0:e.current()}}}function te(){var e,t=(0,a.useState)(!1),n=t[0],r=t[1],i=(0,a.useRef)(!1),l=ee(),s=l.smoothScrollTop,d=l.cancelScrollToTop;return(0,o.RF)((function(e,t){var n=e.scrollY,a=null==t?void 0:t.scrollY;if(a)if(i.current)i.current=!1;else{var l=n<a;if(l||d(),n<300)r(!1);else if(l){var c=document.documentElement.scrollHeight;n+window.innerHeight<c&&r(!0)}else r(!1)}})),(0,o.SL)((function(e){e.location.hash&&(i.current=!0,r(!1))})),a.createElement("button",{"aria-label":(0,m.I)({id:"theme.BackToTopButton.buttonAriaLabel",message:"Scroll back to top",description:"The ARIA label for the back to top button"}),className:(0,c.Z)("clean-btn",o.kM.common.backToTopButton,J,(e={},e[$]=n,e)),type:"button",onClick:function(){return s()}})}var ne=n(6775),ae={docPage:"docPage_P2Lg",docMainContainer:"docMainContainer_TCnq",docSidebarContainer:"docSidebarContainer_rKC_",docMainContainerEnhanced:"docMainContainerEnhanced_WDCb",docSidebarContainerHidden:"docSidebarContainerHidden_nvlY",collapsedDocSidebar:"collapsedDocSidebar_Xgr6",expandSidebarButtonIcon:"expandSidebarButtonIcon_AV8S",docItemWrapperEnhanced:"docItemWrapperEnhanced_r_WG"};function re(e){var t,n,i,s=e.currentDocRoute,d=e.versionMetadata,p=e.children,f=e.sidebarName,h=(0,o.Vq)(),E=d.pluginId,b=d.version,_=(0,a.useState)(!1),v=_[0],O=_[1],L=(0,a.useState)(!1),C=L[0],g=L[1],T=(0,a.useCallback)((function(){C&&g(!1),O((function(e){return!e}))}),[C]);return a.createElement(l.Z,{wrapperClassName:o.kM.wrapper.docsPages,pageClassName:o.kM.page.docsDocPage,searchMetadata:{version:b,tag:(0,o.os)(E,b)}},a.createElement("div",{className:ae.docPage},a.createElement(te,null),h&&a.createElement("aside",{className:(0,c.Z)(o.kM.docs.docSidebarContainer,ae.docSidebarContainer,(t={},t[ae.docSidebarContainerHidden]=v,t)),onTransitionEnd:function(e){e.currentTarget.classList.contains(ae.docSidebarContainer)&&v&&g(!0)}},a.createElement(G,{key:f,sidebar:h,path:s.path,onCollapse:T,isHidden:C}),C&&a.createElement("div",{className:ae.collapsedDocSidebar,title:(0,m.I)({id:"theme.docs.sidebar.expandButtonTitle",message:"Expand sidebar",description:"The ARIA label and title attribute for expand button of doc sidebar"}),"aria-label":(0,m.I)({id:"theme.docs.sidebar.expandButtonAriaLabel",message:"Expand sidebar",description:"The ARIA label and title attribute for expand button of doc sidebar"}),tabIndex:0,role:"button",onKeyDown:T,onClick:T},a.createElement(u,{className:ae.expandSidebarButtonIcon}))),a.createElement("main",{className:(0,c.Z)(ae.docMainContainer,(n={},n[ae.docMainContainerEnhanced]=v||!h,n))},a.createElement("div",{className:(0,c.Z)("container padding-top--md padding-bottom--lg",ae.docItemWrapper,(i={},i[ae.docItemWrapperEnhanced]=v,i))},a.createElement(r.Zo,{components:X},p)))))}function ie(e){var t=e.route.routes,n=e.versionMetadata,r=e.location,l=t.find((function(e){return(0,ne.LX)(r.pathname,e)}));if(!l)return a.createElement(Q.default,null);var c=l.sidebar,s=c?n.docsSidebars[c]:null;return a.createElement(a.Fragment,null,a.createElement(Y.Z,null,a.createElement("html",{className:n.className})),a.createElement(o.qu,{version:n},a.createElement(o.bT,{sidebar:s},a.createElement(re,{currentDocRoute:l,versionMetadata:n,sidebarName:c},(0,i.H)(t,{versionMetadata:n})))))}},9649:function(e,t,n){n.d(t,{Z:function(){return f}});var a=n(7462),r=n(3366),i=n(7294),l=n(6010),c=n(5999),o=n(9366),s="anchorWithStickyNavbar_mojV",d="anchorWithHideOnScrollNavbar_R0VQ",u=["as","id"],m=["as"];function p(e){var t,n=e.as,m=e.id,p=(0,r.Z)(e,u),f=(0,o.LU)().navbar.hideOnScroll;return m?i.createElement(n,(0,a.Z)({},p,{className:(0,l.Z)("anchor",(t={},t[d]=f,t[s]=!f,t)),id:m}),p.children,i.createElement("a",{className:"hash-link",href:"#"+m,title:(0,c.I)({id:"theme.common.headingLinkTitle",message:"Direct link to heading",description:"Title for link to heading"})},"\u200b")):i.createElement(n,p)}function f(e){var t=e.as,n=(0,r.Z)(e,m);return"h1"===t?i.createElement("h1",(0,a.Z)({},n,{id:void 0}),n.children):i.createElement(p,(0,a.Z)({as:t},n))}},4608:function(e,t,n){n.r(t),n.d(t,{default:function(){return l}});var a=n(7294),r=n(1872),i=n(5999);function l(){return a.createElement(r.Z,{title:(0,i.I)({id:"theme.NotFound.title",message:"Page Not Found"})},a.createElement("main",{className:"container margin-vert--xl"},a.createElement("div",{className:"row"},a.createElement("div",{className:"col col--6 col--offset-3"},a.createElement("h1",{className:"hero__title"},a.createElement(i.Z,{id:"theme.NotFound.title",description:"The title of the 404 page"},"Page Not Found")),a.createElement("p",null,a.createElement(i.Z,{id:"theme.NotFound.p1",description:"The first paragraph of the 404 page"},"We could not find what you were looking for.")),a.createElement("p",null,a.createElement(i.Z,{id:"theme.NotFound.p2",description:"The 2nd paragraph of the 404 page"},"Please contact the owner of the site that linked you to the original URL and let them know their link is broken."))))))}},5946:function(e,t,n){n.d(t,{Z:function(){return f}});var a=n(3366),r=n(7855),i=n(7294),l=n(1736),c=n(1262),o=n(9366);var s="iframe_R_Fr";var d=function(e){var t=e.script,a=window.origin,r=(0,o.E6)().version,l=function(e,t){return'\n\t\t<style>\n\t\t\thtml,\n\t\t\tbody,\n\t\t\t#container {\n\t\t\t\twidth: 100%;\n\t\t\t\theight: 100%;\n\t\t\t\toverflow: hidden;\n\t\t\t\tmargin: 0;\n\t\t\t}\n\t\t</style>\n\t\t<div id="container"></div>\n\t\t<script>\n\t\t\twindow.run = () => {\n\t\t\t\t'+e+"\n\t\t\t};\n\n\t\t\twindow.parent.postMessage('ready', '"+t+"');\n\t\t\twindow.__READY_TO_RUN = true;\n\t\t<\/script>\n\t"}(t,a),c=i.useRef();return i.useEffect((function(){var e=function(e){switch(e){case"current":return n.e(3537).then(n.bind(n,3537));case"3.8":return n.e(193).then(n.bind(n,193))}}(r),t=function(t){e.then((function(e){var n=e.createChart;t.createChart=function(e,a){var r=n(e,a);return t.addEventListener("resize",(function(){var t=e.getBoundingClientRect();r.resize(t.width,t.height)}),!0),r},t.run()}))};if(c.current.contentWindow.__READY_TO_RUN)t(c.current.contentWindow);else{window.addEventListener("message",(function e(n){n.origin===a&&n.source===c.current.contentWindow&&"ready"===n.data&&(t(n.source),window.removeEventListener("message",e,!1))}),!1)}}),[a,l]),i.createElement("iframe",{key:t,ref:c,srcDoc:l,className:s})},u=n(3864),m=["chart","replaceThemeConstants"],p=Object.keys(u.l.DARK);var f=function(e){var t=e.chart,n=e.replaceThemeConstants,f=(0,a.Z)(e,m),h=e.children,E=(0,o.If)().isDarkTheme;return n&&"string"==typeof h&&(h=function(e,t){for(var n,a=t?u.l.DARK:u.l.LIGHT,i=e,l=(0,r.Z)(p);!(n=l()).done;){var c=n.value;i=i.replace(new RegExp(c,"g"),"'"+a[c]+"'")}return i}(h,E)),t?i.createElement(i.Fragment,null,i.createElement(l.Z,f,h),i.createElement(c.Z,{fallback:i.createElement("div",{className:s},"\xa0")},(function(){return i.createElement(d,{script:h})}))):i.createElement(l.Z,f,h)}},3864:function(e,t,n){n.d(t,{l:function(){return l}});var a=function(e){return"rgba(15, 216, 62, "+e+")"},r=function(e){return"rgb(255, 64, 64, "+e+")"},i=function(e){return"rgba(41, 98, 255, "+e+")"},l={DARK:{CHART_BACKGROUND_COLOR:"black",LINE_LINE_COLOR:i(.9),AREA_TOP_COLOR:i(.5),AREA_BOTTOM_COLOR:i(.2),BAR_UP_COLOR:a(1),BAR_DOWN_COLOR:r(1),BASELINE_TOP_LINE_COLOR:a(1),BASELINE_TOP_FILL_COLOR1:a(.9),BASELINE_TOP_FILL_COLOR2:a(.1),BASELINE_BOTTOM_LINE_COLOR:r(1),BASELINE_BOTTOM_FILL_COLOR1:r(.1),BASELINE_BOTTOM_FILL_COLOR2:r(.9),HISTOGRAM_COLOR:a(1),CHART_TEXT_COLOR:"white"},LIGHT:{CHART_BACKGROUND_COLOR:"white",LINE_LINE_COLOR:i(.9),AREA_TOP_COLOR:i(.5),AREA_BOTTOM_COLOR:i(.05),BAR_UP_COLOR:a(1),BAR_DOWN_COLOR:r(1),BASELINE_TOP_LINE_COLOR:a(.5),BASELINE_TOP_FILL_COLOR1:a(.4),BASELINE_TOP_FILL_COLOR2:a(0),BASELINE_BOTTOM_LINE_COLOR:r(1),BASELINE_BOTTOM_FILL_COLOR1:r(0),BASELINE_BOTTOM_FILL_COLOR2:r(.9),HISTOGRAM_COLOR:a(1),CHART_TEXT_COLOR:"black"}}}}]);