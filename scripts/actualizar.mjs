import fs from 'node:fs/promises';
import {stores,choose} from '../src/core.mjs';
import {getProducts} from '../src/sources.mjs';
const catalog=JSON.parse(await fs.readFile('data/catalogo.json','utf8'));
const data=JSON.parse(await fs.readFile('data/precios.json','utf8'));
const requested=process.env.ONLY_STORES?.split(',');
const queue=stores.filter(s=>!requested||requested.includes(s.id));
const diagnostics=structuredClone(data.diagnostics||{});
const output=new Map(),checks={...data.checks};let successes=0,failures=0;
async function updateStore(store){
 const records=new Map(data.records.filter(r=>r.storeId===store.id).map(r=>[r.itemId,r]));let completed=0,found=0,errors=[],consecutive=0;
 diagnostics[store.id]??={};
 for(const item of catalog){
  try{
   let products;
   for(let attempt=0;attempt<2;attempt++){
    try{products=await getProducts(store,item);break;}catch(error){if(attempt)throw error;await new Promise(r=>setTimeout(r,1500));}
   }
   if(!Array.isArray(products))throw Error('Formato de catálogo no reconocido');
   const record=choose(products,item,store,new Date().toISOString());
   if(record){records.set(item.id,record);found++;}
   diagnostics[store.id][item.id]={at:new Date().toISOString(),status:record?'matched':'no_compatible_product',candidates:products.length,query:item.query};
   completed++;successes++;consecutive=0;
  }catch(error){diagnostics[store.id][item.id]={at:new Date().toISOString(),status:'error',error:error.message,query:item.query};errors.push(error.message);failures++;if(++consecutive>=2)break;}
  if(completed&&completed%10===0)console.log(store.name,completed+'/50 categorías');
  await new Promise(r=>setTimeout(r,250));
 }
 checks[store.id]={at:new Date().toISOString(),message:errors.length?'Consulta parcial: '+[...new Set(errors)].join('; ')+'. Se conservan los registros anteriores de las consultas que fallaron.':`${completed} categorías consultadas; ${found} productos compatibles. ${store.localVerified?'Tienda de Rosario identificada.':'Sucursal y entrega en Rosario sin confirmar.'}`};
 output.set(store.id,[...records.values()]);console.log(store.name+':',completed,'categorías,',found,'precios,',errors.length,'fallos');
}
async function worker(){while(queue.length)await updateStore(queue.shift());}
await Promise.all([worker(),worker(),worker()]);
data.records=[...data.records.filter(r=>!output.has(r.storeId)),...[...output.values()].flat()];data.checks=checks;data.diagnostics=diagnostics;data.at=new Date().toISOString();data.normalizationVersion=2;
await fs.writeFile('data/precios.json.tmp',JSON.stringify(data,null,2)+'\n');await fs.rename('data/precios.json.tmp','data/precios.json');
console.log('Actualización terminada:',data.records.length,'registros,',successes,'consultas exitosas,',failures,'fallidas');
if(!successes)console.warn('Ninguna fuente respondió: se conservaron los datos anteriores.');
