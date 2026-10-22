export const stores=[
{id:'carrefour',name:'Carrefour',url:'https://www.carrefour.com.ar',type:'vtex'},
{id:'coto',name:'Coto',url:'https://www.cotodigital.com.ar',type:'coto'},
{id:'libertad',name:'Libertad',url:'https://www.hiperlibertad.com.ar',type:'vtex'},
{id:'gallega',name:'La Gallega',url:'https://www.lagallega.com.ar',type:'asp'},
{id:'microgo',name:'MicroGo / Micropack',url:'https://www.microgo.com.ar',type:'vtex',note:'Tienda online con envío y retiro en Rosario; precio online sin sucursal específica.'},
{id:'jumbo',name:'Jumbo',url:'https://www.jumbo.com.ar',type:'vtex'},
{id:'dia',name:'Día',url:'https://diaonline.supermercadosdia.com.ar',type:'vtex',planningEligible:false,note:'Referencia online: no se confirmó sucursal o entrega en Rosario. No participa del plan de compras local.'},
{id:'dar',name:'DAR',url:'https://darentucasa.com.ar',type:'asp'},
{id:'reina',name:'La Reina',url:'https://www.lareinaonline.com.ar',type:'asp'},
{id:'unico',name:'Único Lavalle',url:'https://supermercadounicolavalle.com.ar',type:'unico',localVerified:true}
];
export const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function quantity(name,unit){
 const t=clean(name).replace(/,/g,'.').replace(/×/g,'x');
 const number='(\\d+(?:\\.\\d+)?)';
 const tokens=unit==='m'?'(?:metros?|mts?|m)':unit==='hojas'?'(?:hojas?|panos?)':unit==='g'?'(?:kilogramos?|kgs?|gramos?|gms?|grs?|g)':unit==='ml'?'(?:mililitros?|ml|cc|litros?|lts?|lt|l)':'(?:unidades?|unid(?:ades)?|uni|uds?|un|u|saquitos?|sobres?)';
 let m=t.match(new RegExp('(?:^|\\s)'+number+'\\s*x\\s*'+number+'\\s*('+tokens+')\\b'));
 const scale=token=>unit==='g'&&/^k/.test(token)||unit==='ml'&&/^l/.test(token)?1000:1;
 if(m&&+m[1]>0)return +m[1]*+m[2]*scale(m[3]);
 const all=[...t.matchAll(new RegExp(number+'\\s*('+tokens+')\\b','g'))];
 if(!all.length){if(unit==='u'){let d=t.match(/(\d+)\s*docenas?/);if(d)return +d[1]*12;if(/media docena/.test(t))return 6;if(/\bdocena\b/.test(t))return 12;}return null;}
 m=all.at(-1);let value=+m[1]*scale(m[2]);
 if(unit==='hojas'||unit==='m'){
  let count=t.match(/(\d+)\s*(?:rollos?|unidades?|unid|uds?|un|u)\b/);
  if(!count)count=t.match(/(?:x|por)\s*(\d+)\s*(?:rollos?|unidades?|unid|un|u)?\s*$/);
  return value*(count?+count[1]:1);
 }
 if(unit==='g'||unit==='ml'){
  const count=t.match(/(?:x|por)\s*(\d+)\s*(?:unidades?|unid|un|u)\b/);
  if(count)value*=+count[1];
 }
 return value>0?value:null;
}
export function choose(products,item,store,now){
 const candidates=[];
 for(const p of products){
  const n=clean(p.productName);
  if(!new RegExp(item.include).test(n)||(item.exclude&&new RegExp(item.exclude).test(n)))continue;
  if(item.category==='Frescos'&&/conserva|deshidrat|congelad|en cubos|en rodajas/.test(n))continue;
  for(const sku of p.items||[]){
   let qty=sku.measurementUnit==='kg'&&item.unit==='g'?Number(sku.unitMultiplier)*1000:sku.measurementUnit==='l'&&item.unit==='ml'?Number(sku.unitMultiplier)*1000:quantity(sku.nameComplete||p.productName,item.unit);
   if(!qty&&item.singleUnit&&sku.measurementUnit==='un'&&!/pack|combo|caja.*sobres|\d+\s*x\s*\d+/.test(n))qty=1;
   if(!(qty>0))continue;
   for(const seller of sku.sellers||[]){
    const offer=seller.commertialOffer;
    if(!offer||!(offer.Price>0)||!(offer.AvailableQuantity>0))continue;
    const price=offer.Price*((sku.measurementUnit==='kg'||sku.measurementUnit==='l')?Number(sku.unitMultiplier):1);
    if(!(price>0))continue;
    let url;try{url=new URL(p.link);if(url.hostname!==new URL(store.url).hostname)continue;}catch{continue;}
    const packs=Math.ceil(item.amount/qty-1e-9),priceCents=Math.round(price*100);
    candidates.push({itemId:item.id,storeId:store.id,name:p.productName,brand:p.brand||'',priceCents,quantity:qty,unit:item.unit,packs,costCents:priceCents*packs,unitCostCents:priceCents*item.amount/qty,url:url.href,checkedAt:now,localVerified:!!store.localVerified,availabilityVerified:p.availabilityVerified!==false,normalizationVersion:2});
   }
  }
 }
 if(!candidates.length)return null;
 const purchase=[...candidates].sort((a,b)=>a.costCents-b.costCents||a.unitCostCents-b.unitCostCents)[0];
 const comparison=[...candidates].sort((a,b)=>a.unitCostCents-b.unitCostCents||a.costCents-b.costCents)[0];
 return {...purchase,comparison:{name:comparison.name,brand:comparison.brand,priceCents:comparison.priceCents,quantity:comparison.quantity,unit:comparison.unit,packs:comparison.packs,costCents:comparison.costCents,unitCostCents:comparison.unitCostCents,url:comparison.url}};
}
export function plans(items,records,maxStops=5,travelCents=0){
 if(!items.length)return null;
 const active=stores.filter(s=>s.planningEligible!==false&&records.some(r=>r.storeId===s.id));
 const options=items.map(item=>active.map(s=>records.filter(r=>r.itemId===item.id&&r.storeId===s.id).sort((a,b)=>a.costCents-b.costCents)[0]));
 if(options.some(row=>row.every(r=>!r)))return null;
 let best=null;
 for(let mask=1;mask<2**active.length;mask++){
  let count=0;for(let bits=mask;bits;bits&=bits-1)count++;if(count>maxStops)continue;
  const picks=[];let sum=0;
  for(const row of options){let pick=null;for(let i=0;i<active.length;i++)if(mask&(1<<i)&&row[i]&&(!pick||row[i].costCents<pick.costCents))pick=row[i];if(!pick)break;picks.push(pick);sum+=pick.costCents;}
  if(picks.length!==items.length)continue;
  const stops=new Set(picks.map(r=>r.storeId)).size,net=sum+Math.max(0,stops-1)*travelCents;
  if(!best||net<best.net||net===best.net&&stops<best.stops)best={picks,sum,net,stops};
 }
 return best;
}
