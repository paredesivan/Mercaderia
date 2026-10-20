# Mercadería · Canasta Rosario

Comparador de una canasta de **50 artículos habituales** para el hogar. No es un ranking estadístico de los 50 más vendidos.

La web compara marcas distintas, muestra el producto concreto, su precio, fecha y enlace, y calcula:

- Costo de los envases enteros necesarios para cada cantidad de referencia.
- Total por supermercado, identificando subtotales incompletos.
- Mejor combinación entre hasta cinco supermercados, con costo opcional por parada extra.

## Abrir y activar desde el celular

1. En este repositorio, abrir **Settings → Pages**.
2. En **Source**, elegir **GitHub Actions**.
3. Abrir **Actions → Actualizar precios y publicar → Run workflow**.
4. La dirección esperada es `https://paredesivan.github.io/Mercaderia/`. La primera publicación puede tardar unos minutos.

No hace falta una computadora, instalar programas ni subir archivos JavaScript separados. `index.html` incluye el JavaScript y una copia de los datos; también carga `data/precios.json` cuando se sirve por HTTP.

## Actualización diaria

GitHub Actions consulta los catálogos todos los días a las **09:00 de Argentina** (12:00 UTC), además de permitir ejecución manual. GitHub puede demorar el inicio. La tarea ejecuta las pruebas, actualiza datos, conserva los anteriores ante errores, genera el HTML, guarda un commit y publica si Pages está configurado como GitHub Actions. La concurrencia está limitada para evitar dos actualizaciones simultáneas.

No se usan claves privadas, cuentas de supermercados ni sesiones del visitante. La clave de búsqueda de Coto incluida en el adaptador es la clave pública de su buscador, no una credencial de usuario.

## Cobertura y límites actuales

| Supermercado | Integración | Ubicación de los precios |
|---|---|---|
| Carrefour | Catálogo online con búsqueda por texto completo | Sucursal Rosario sin confirmar |
| Coto | Catálogo online general, tienda 200 | No atribuir a una sucursal de Rosario |
| ChangoMás | Catálogo online | Sucursal Rosario sin confirmar |
| Jumbo | Catálogo online | Sucursal Rosario sin confirmar |
| Día | Catálogo online de referencia | No se confirmó presencia o entrega en Rosario; fuera del plan local |
| La Gallega | Buscador público y hasta dos páginas de resultados | Stock final por confirmar |
| La Reina | Buscador público y hasta dos páginas de resultados | Stock final por confirmar |
| Único Lavalle | Buscador público y hasta dos páginas de resultados | Tienda de Lavalle 2554, Rosario |
| Libertad | Adaptador de catálogo; errores de acceso en las pruebas | Sin precios utilizables |
| DAR | Adaptador de buscador y sesión anónima pública | Respuesta de catálogo pendiente de validar |

La canasta tiene cobertura para los **50 artículos entre las fuentes disponibles**. No implica que cada supermercado tenga los 50, ni que todos los precios online correspondan a la sucursal de Rosario. La interfaz distingue faltantes, referencias y cobertura. Día se consulta pero no participa del plan de visitas local.

Los precios vencen a las 36 horas para los cálculos. Las consultas fallidas conservan el registro y la fecha anteriores. No se presenta un faltante como precio cero. Las búsquedas revisan hasta 50 resultados en catálogos VTEX y hasta dos páginas en los buscadores HTML: el mínimo observado no garantiza ser el menor de todo el catálogo.

Se corrigieron el uso del buscador de texto completo, los espacios codificados, las unidades en saquitos y sobres, formatos como 3x60 hojas, gramos escritos como gm y grados de harina como 000x1kg. Las comparaciones se regeneran con la versión 2 del normalizador; no se reutilizan cantidades de la versión anterior sin revisarlas.

No se incluyen beneficios bancarios, membresías, promociones por cantidad, costos de envío ni rutas. Las categorías son genéricas: revisar variantes y calidades en el producto enlazado. La extracción puede requerir mantenimiento si las tiendas cambian su catálogo. Los adaptadores HTML muestran precios publicados; la disponibilidad final se confirma en la tienda.

## Desarrollo

Node.js 22 o superior, sin dependencias externas:

```sh
npm test
npm run update
npm run build
```

`src/core.mjs` contiene normalización y optimización; `src/sources.mjs`, las consultas; `data/`, catálogo y observaciones; `src/page.html`, la interfaz. `scripts/build.mjs` genera `index.html` y `_site/`.

La primera vista privada creada en ChatGPT es independiente de GitHub Pages y mantiene su propio control diario. Este repositorio contiene una versión autónoma: los cambios aquí no se sincronizan automáticamente con aquella vista.
