import {choose} from './core.mjs';
import {parseUnico,parseASP} from './html-sources.mjs';
async function timedFetch(url,options={}){return fetch(String(url).replace(/\+/g,'%20'),{...options,signal:AbortSignal.timeout(15000),headers:{'Accept':'application/json,text/plain;q=0.9,*/*;q=0.5','User-Agent':'CanastaRosario/1.0 (price comparison; daily refresh)',...options.headers}})}
const PUBLIC_COTO_SEARCH_KEY='key_r6xzz4IAoTWcipni';

const anonymousSessions=new Map();
export async function darCatalogHTML(store,query){
 let cookie=anonymousSessions.get(store.id)||'';
 if(!cookie){
  const first=await timedFetch(store.url+'/Login.asp');
  const headers=typeof first.headers.getSetCookie==='function'?first.headers.getSetCookie():[first.headers.get('set-cookie')||''];
  cookie=headers.map(h=>h.split(';')[0]).filter(Boolean).join('; ');
  const next=await timedFetch(store.url+'/index.asp',{headers:{Accept:'text/html',...(cookie?{Cookie:cookie}:{})}});
  const additional=typeof next.headers.getSetCookie==='function'?next.headers.getSetCookie():[next.headers.get('set-cookie')||''];
  cookie=[cookie,...additional.map(h=>h.split(';')[0]).filter(Boolean)].filter(Boolean).join('; ');
  if(cookie)anonymousSessions.set(store.id,cookie);
 }
 const url=new URL(store.url+'/carrito.asp');url.searchParams.set('TM','Bus');url.searchParams.set('cpoB',query);
 const response=await timedFetch(url,{headers:{Accept:'text/html',...(cookie?{Cookie:cookie}:{})}});
 if(!response.ok)throw Error('DAR: HTTP '+response.status);
 return {html:await response.text(),url:response.url};
}

async function queryProducts(s,item){
 if(s.type==='unico'){const url=new URL(s.url+'/listaProductos.php');url.searchParams.set('busqueda',item.query);const r=await timedFetch(url);if(!r.ok)throw Error('HTTP '+r.status);const html=await r.text();let products=parseUnico(html,s);if(/pagina=2/.test(html)){url.searchParams.set('pagina','2');const next=await timedFetch(url);if(next.ok)products.push(...parseUnico(await next.text(),s));}return products;}
 if(s.id==='dar'){const result=await darCatalogHTML(s,item.query);return parseASP(result.html,s);}
 if(s.type==='asp'){const url=new URL(s.url+(s.id==='dar'?'/carrito.asp':'/productosnl.asp'));url.searchParams.set('TM','Bus');url.searchParams.set('cpoB',item.query);const r=await timedFetch(url);if(!r.ok)throw Error('HTTP '+r.status);let html=await r.text(),products=parseASP(html,s);if(/(?:pg=2|value=["']Siguiente)/i.test(html)){url.searchParams.set('pg','2');const next=await timedFetch(url);if(next.ok)products.push(...parseASP(await next.text(),s));}return products;}
 if(s.type==='vtex'){const url=new URL(s.url+'/api/catalog_system/pub/products/search');url.searchParams.set('ft',item.query);url.searchParams.set('_from','0');url.searchParams.set('_to','49');url.searchParams.set('O','OrderByPriceASC');const r=await timedFetch(url);if(!r.ok)throw Error('HTTP '+r.status);const products=await r.json();if(!Array.isArray(products))throw Error('Catálogo VTEX inválido');return products;}
 const url=new URL('https://api.coto.com.ar/api/v1/ms-digital-sitio-bff-web/api/v1/products/search/'+encodeURIComponent(item.query));url.searchParams.set('key',PUBLIC_COTO_SEARCH_KEY);url.searchParams.set('num_results_per_page','50');url.searchParams.set('pre_filter_expression',JSON.stringify({name:'store_availability',value:'200'}));url.searchParams.set('us','200');const response=await timedFetch(url);if(!response.ok)throw Error('HTTP '+response.status);const result=await response.json();if(!Array.isArray(result.response?.results))throw Error('Respuesta Coto no reconocida');return result.response.results.flatMap(p=>{const d=p.data;const price=d?.price?.find(q=>q.store==='200')?.listPrice;if(!(price>0)||!d.store_availability?.includes('200'))return [];return [{productName:p.value||d.sku_display_name,brand:d.product_brand,link:s.url+'/sitios/cdigi/producto/'+d.url,categories:(d.groups||[]).map(g=>g.display_name==='Verdulería'?'Frutas y Verduras':g.display_name),items:[{nameComplete:p.value||d.sku_display_name,measurementUnit:d.product_weighable?'kg':'un',unitMultiplier:1,sellers:[{commertialOffer:{Price:price,AvailableQuantity:1}}]}]}]});
}


export async function getProducts(store,item){let products=[];for(const query of item.queries||((store.type==='asp'||store.type==='unico')&&item.query.includes(' ')?[item.query,item.query.split(' ')[0]]:[item.query])){const found=await queryProducts(store,{...item,query});products.push(...found);if(choose(products,item,store,new Date().toISOString()))break;}return products;}
