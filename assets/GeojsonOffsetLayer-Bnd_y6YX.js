import{P as g}from"./PathOffsetLayer-apVO-iJh.js";import{G as f}from"./geojson-layer-5Wtw9r1a.js";function h(s){const o=s.getCanvas().toDataURL("image/png"),t=document.createElement("a");t.download="simwrapper-screenshot.png",t.href=o,t.click()}async function u(s,a){const o=s.context.deck.canvas.toDataURL("image/png"),t=a?.toDataURL("image/png"),e=[];t&&e.push(t),e.push(o);const i=await p({width:s.context.deck.canvas.width,height:s.context.deck.canvas.height,imageDataURLs:e});var n=document.createElement("a");n.setAttribute("href",i),n.setAttribute("download","screenshot.png"),n.style.display="none",document.body.appendChild(n),n.click(),document.body.removeChild(n)}function p(s){return new Promise((a,o)=>{var t=document.createElement("canvas");t.width=s.width,t.height=s.height,Promise.all(s.imageDataURLs.map(e=>m(t,e))).then(()=>{const e=t.getContext("2d"),i=t.width-152,n=t.height-8;e.beginPath(),e.rect(i-4,n-14,158,22),e.fillStyle="#ffffff44",e.fill(),e.font="11px Arial",e.fillStyle="#888",e.fillText("© Mapbox  © OpenStreetMap",i,n),a(t.toDataURL("image/png"))})})}function m(s,a){return new Promise((o,t)=>{s||t(),a||t();var e=new Image;e.onload=function(){s.getContext("2d").drawImage(this,0,0),o(!0)},e.src=a})}const x={savePNG:u,saveMapWithOverlay:h};function y(s,a){const{transitions:o,updateTriggers:t}=s.props,e={updateTriggers:{},transitions:o&&{getPosition:o.geometry}};for(const i in a){const n=a[i];let r=s.props[i];i.startsWith("get")&&(r=s.getSubLayerAccessor(r),e.updateTriggers[n]=t[i],o&&(e.transitions[n]=o[i])),e[n]=r}return e}const L={RIGHT:2},c={type:g,props:{lineWidthUnits:"widthUnits",lineWidthScale:"widthScale",lineWidthMinPixels:"widthMinPixels",lineWidthMaxPixels:"widthMaxPixels",lineJointRounded:"jointRounded",lineCapRounded:"capRounded",lineMiterLimit:"miterLimit",lineBillboard:"billboard",getLineColor:"getColor",getLineWidth:"getWidth"}};class l extends f{constructor(a){super(a)}_renderLineLayers(){const{extruded:a,stroked:o}=this.props,{layerProps:t}=this.state,e="polygons-stroke",i="linestrings",n=!a&&o&&this.shouldRenderSubLayer(e,t.polygonsOutline.data)&&this.getSubLayerClass(e,c.type),r=this.shouldRenderSubLayer(i,t.lines.data)&&this.getSubLayerClass(i,c.type);if(n||r){const d=y(this,c.props);return[n&&new n(d,this.getSubLayerProps({id:e,updateTriggers:d.updateTriggers}),t.polygonsOutline),r&&new r(d,this.getSubLayerProps({id:i,updateTriggers:d.updateTriggers}),t.lines)]}return null}getShaders(){return{...super.getShaders(),inject:{"vs:#decl":`
            attribute float instanceOffset;
            varying float offset;
            `,"vs:#main-start":`
            offset = instanceOffset;
            `,"fs:#decl":`
            varying float offset;
            `,"fs:#main-start":`
            if (offset == 1.0 && vPathPosition.x < 0.0) {
                discard;
            }
            if (offset == 2.0 && vPathPosition.x > 0.0) {
                discard;
            }
            if (offset == 0.0 && abs(vPathPosition.x) > 0.5) {
                discard;
            }
        `}}}}l.layerName="GeojsonOffsetLayer";l.defaultProps={getOffset:{type:"accessor",value:L.RIGHT}};export{l as G,x as S};
