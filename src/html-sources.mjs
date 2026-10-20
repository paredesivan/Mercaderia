export function decodeHTML(text){return String(text).replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt|apos);|&#(?:\d+|x[0-9a-f]+);/gi,s=>({ '&nbsp;':' ','&amp;':'&','&quot;':'"','&lt;':'<','&gt;':'>','&apos;':"'" }[s.toLowerCase()]||String.fromCodePoint(s[2].toLowerCase()==='x'?parseInt(s.slice(3,-1),16):parseInt(s.slice(2,-1),10)))).replace(/\s+/g,' ').trim();}
export function pricedProduct(name,price,url,{unit='un',multiplier=1}={}){return {productName:decodeHTML(name),link:url,items:[{nameComplete:decodeHTML(name),measurementUnit:unit,unitMultiplier:multiplier,sellers:[{commertialOffer:{Price:price,AvailableQuantity:1}}]}]};}
export function parseUnico(html,store){
 const products=[];
 const rx=/<h1\b[^>]*>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h1>[\s\S]*?<h3\b[^>]*class=["'][^"']*precioIndex[^"']*["'][^>]*>\s*\$\s*([\d.,]+)/gi;
 for(const m of html.matchAll(rx)){
  const name=decodeHTML(m[2]);let p=m[3].replace(/,/g,'');if(/,\d{2}$/.test(m[3]))p=m[3].replace(/\./g,'').replace(',','.');const price=Number(p);
  if(!(price>0))continue;
  const weighted=/\b(?:x\s*1?\s*kg|por\s*kilo|el\s*kilo)\b/i.test(name);
  products.push(pricedProduct(name,price,new URL(m[1],store.url).href,{unit:weighted?'kg':'un',multiplier:1}));
 }
 if(!products.length&&!(/no (?:se )?(?:encontraron|hay)|sin resultados|0 productos/i.test(decodeHTML(html))||(/name=["']busqueda/i.test(html)&&/contenidoProductos|Su b&uacute;queda|Su b.squeda/i.test(html)&&! /precio_producto/i.test(html))))throw Error('Formato de productos Único no reconocido; no se borran precios anteriores');
 return products;
}
export function parseASP(html,store){
 const products=[];
 const blocks=[...html.matchAll(/<li\b[^>]*class=["'][^"']*\bcuadProd\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi)];
 for(const match of blocks){
  const block=match[1],name=block.match(/<div\b[^>]*class=["']desc["'][^>]*>([\s\S]*?)<\/div>/i)?.[1],link=block.match(/<a\b[^>]*href=["']([^"']*productosdet\.asp[^"']*)["']/i)?.[1];
  if(!name||!link||/agotado|sin stock/i.test(decodeHTML(block)))continue;
  const prices=[];
  for(const priceBlock of block.matchAll(/<div\b[^>]*class=["'](?:izqdes|izq|der)["'][^>]*>([\s\S]*?)<\/div>/gi)){
   const text=decodeHTML(priceBlock[1]).replace(/\s+/g,''),number=text.match(/\$([\d.,]+)/)?.[1];
   if(!number)continue;const value=Number(number.includes(',')?number.replace(/\./g,'').replace(',','.'):number);if(value>0)prices.push(value);
  }
  if(!prices.length)continue;
  const conditional=/llevando|segunda|2da|tarjeta|banco|club|comunidad|socios?|\b[23]\s*x\s*[12]\b/i.test(decodeHTML(block));
  const price=conditional?prices[0]:prices.at(-1);
  let unit='un';if(/(?:x|por)\s*(?:1\s*)?kg\b|\bel kilo\b/i.test(decodeHTML(name)))unit='kg';
  const product=pricedProduct(name,price,new URL(decodeHTML(link),store.url).href,{unit});product.availabilityVerified=false;products.push(product);
 }
 if(!blocks.length&&!/no (?:se )?(?:encontraron|hay)|sin resultados|no existen|no se han encontrado/i.test(decodeHTML(html)))throw Error('Buscador sin listado interpretable; se conservan los registros anteriores');
 return products;
}
