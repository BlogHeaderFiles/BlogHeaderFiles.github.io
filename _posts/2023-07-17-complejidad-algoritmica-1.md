---
title: Complejidad algorítmica (parte I)
date: 2023-07-17T08:00:00+01:00
author: Carlos Buchart
layout: post
permalink: /2023/07/17/complejidad-algoritmica-1
excerpt: Introducción al concepto de complejidad algorítmica, su impacto en el desarrollo y algunas consideraciones iniciales
categories: algorithm performance
---
## Introducción

Sin entrar a filosofar demasiado, podríamos decir que para que un determinado código pueda considerarse bueno, hacen falta cinco cosas:

- Hacer lo que tiene que hacer, es decir, cumplir con los requerimientos.
- No hacer lo que no debe hacer (no tener errores, ser seguro, ser fiable).
- Hacerlo eficientemente, con el menor consumo de recursos posible.
- Acoplarse correctamente al resto del sistema, sin interferir con otras aplicaciones.
- Ser entendible tanto por el equipo actual como por el del futuro (expresividad y documentación).

Así como en otras ocasiones hemos hablado mucho del último punto, hoy (y en futuras entregas) lo haremos del tercero: eficiencia, y más específicamente de un aspecto del rendimiento llamado _complejidad algorítmica_. Aunque este tema ha sido abordado por numerosos autores de una forma mucha más profunda de lo que lo haremos acá, el objetivo de estas entradas es introducir el concepto y su importancia, así como dar ejemplos y guías rápidas de uso que nos permitan sacar provecho del mismo en nuestros proyectos.

## Complejidad algorítmica

El concepto de complejidad algorítmica se refiere a cómo se comporta un determinado código cuando el conjunto de datos sobre el que opera crece (se dice que su tamaño _tiende a infinito_). Es decir, nos habla principalmente de la _escalabilidad_ del código, y también, aunque de forma indirecta, de su eficiencia.

La complejidad algorítmica suele evaluarse considerando dos aspectos: el temporal (tiempo de ejecución) y el espacial (memoria requerida). Aunque trataremos de abordar ambos a lo largo de estas entregas, nos centraremos en el análisis de tiempo, pudiéndose tomar la teoría y aplicarla directamente al espacial la gran mayoría de las veces.

Para realizar este análisis necesitaremos una forma de indicar la complejidad obtenida, y lo haremos utilizando la _notación asintótica_, más específicamente de la O grande (aunque existen otros tipos).

## Notación asintótica O grande

Esta notación indica una cota máxima en la complejidad de un algoritmo. Indica, _grosso modo_, cómo es el comportamiento de un algoritmo (en tiempo o espacio) a medida que crece el conjunto de datos. No se expresa en unidades de tiempo (o de memoria) específicas, ni siquiera en términos de instrucciones, ya que dependen de muchos factores (compilador, _flags_ utilizados, arquitectura, hardware disponible, entorno, etc).

Tampoco es un análisis detallado del número de operaciones que un algoritmo realiza, o de los bytes que consume, sino un resumen de su tendencia principal. Así, un algoritmo que sume elemento a elemento dos vectores, y otro que realice 514 operaciones por cada par de elementos, tendrá la misma notación O grande (en este caso O(n), pero eso lo veremos en breve). ¿Por qué? Porque a medida que el conjunto de datos crece, los detalles de implementación tienen cada vez menos impacto frente al comportamiento general del mismo. (Obviamente, esto no quita que a la hora de comparar exhaustivamente dos algoritmos o implementaciones no debamos tomar en cuenta estos detalles, pero en esta serie nos centraremos en lo antes expuesto.)

La notación O grande busca pues describir, con sencillez, este comportamiento, de forma que podamos hacernos una idea del rendimiento de un algoritmo y poder realizar comparaciones entre distintas soluciones. Algunos de los tipos principales son (en orden de _mejor_ a _peor_):

- O(1): constante (el tiempo o espacio requerido no se ve afectado por el tamaño del conjunto de datos). Ejemplos son el acceso a un arreglo o vector de datos, consultas a tablas _hash_, y búsqueda de máximo o mínimo en un conjunto ordenado.
- O(log n): logarítmico (normalmente se descartan secciones completas del conjunto de datos durante el procesamiento). El tipo de algoritmo más conocido de este orden son las búsquedas dicotómicas (o binarias).
- O(n): lineal (seguramente el caso más trivial, recorrer los datos un número constante de veces). Se identifican rápidamente por la presencia de un bluce _for_ del tipo `for (size_t i = 0; i < N; ++i)` (o variantes).
- O(n log n): cuasi-lineal. La gran mayoría de algoritmos de ordenación eficientes (tales como _quick-sort_) tienen esta complejidad.
- O(n<sup>2</sup>): cuadrático (recorrer el conjunto de datos por cada elemento del mismo). Suelen consistir en un par de bucles anidados y, en muchos casos, corresponden a la versión más directa (y no optimizada) de un algoritmo.
- O(n<sup>3</sup>): cúbico. Análogamente al cuadrático, encontramos tres bucles anidados. Estos casos son raros de ver de forma directa y suelen aparecer disfrazados como la aplicación, a modo de subrutina, de un algoritmo cuadrático a cada elemento de un conjunto de datos.
- O(2<sup>n</sup>): exponencial. Un ejemplo son las búsquedas de caminos óptimos por fuerza bruta.

## Rendimiento promedio, mejor y peor caso

Lo más normal es medir el rendimiento de un algoritmo en los casos más comunes. Aún así, muchos algoritmos se comportan de forma más eficiente en determinadas situaciones. Por ejemplo, algunos algoritmos de ordenanamiento (entre ellos el _infame_ algoritmo de la burbuja) pueden llegar a ser O(n) sobre conjuntos previamente ordenados. Así mismo, puede pasar que haya casos en los que el rendimiento decaiga dramáticamente (por poner otro ejemplo interesante, el _quick-sort_ puede llegar a ser O(n<sup>2</sup>) si el conjunto está ordenado de forma inversa).

El conocimiento del comportamiento del algoritmo en todos estos casos nos proporcionará una guía útil para elegir el más acorde a nuestras necesidades.

## Ejemplo

Para entenderlo mejor, veamos cómo se comportarían un grupo de funciones, todas calculando el mismo resultado pero cada una con una complejidad media diferente. Ya mencionamos anteriormente que la complejidad algorítmica no está asociada a tiempos específicos, pero ilustrar con algunos números reales siempre ayuda a entender mejor el concepto. Supongamos que para el caso básico (N=1) todas las variantes tardasen 0,1us (venga, un tiempo a primera vista _ridículamente pequeño_). Ahora, _midamos_ (desde un punto de vista teórico y simplista) cuánto tardarían en ejecutarse estos algoritmos para N=100, N=10.000 y N=1.000.000:

|Complejidad|1|100|10.000|1.000.000|
|--|--|--|--|--|
|O(1)|0,1us|0,1us|0,1us|0,1us|
|O(log n)|0,1us|0,6us|1,3us|2us|
|O(n)|0,1us|10us|1ms|100ms|
|O(n log n)|0,1us|66us|13,3ms|2s|
|O(n<sup>2</sup>)|0,1us|1ms|10s|27,8h|
|O(n<sup>3</sup>)|0,1us|100ms|27,8h|3.171y|
|O(2<sup>n</sup>)|0,1us|🌌|🤯|🤯|

Nota: En este caso el algoritmo exponencial no nos serviría más que para conjunto de unas pocas unidades

Aunque pareciese que incluso los cuatro primeros tienen un rendimiento más que decente, tenemos que ponerlos en contexto. Para operaciones que se realizan una única vez, o muy esporádicamente, tiempos de hasta unos pocos segundos pueden ser aceptables (guardar un fichero, la generación de miniaturas de un álbum de fotos, preparar un documento para su impresión, precalcular tablas de valores). Por otro lado, si la operación debe ser realizada continuamente, o forma parte de un flujo de trabajo más largo, es probable que se convierta en nuestro cuello de botella y debamos buscar una alternativa.

Imaginemos que esta función es la encargada de calcular la colisión entre el personaje de un videojuego y su entorno, y donde N es la cantidad de polígonos en la escena. Si queremos un juego fluido deberíamos entonces realizar este cálculo un mínimo de 60 veces por segundo. Así, si tenemos 10.000 polígonos (algo bastante flojo hoy en día), podemos aproximar el tiempo requerido:

||Tiempo por fotograma|60Hz|
|--|--|--|
|O(1)|0,1us|6us|
|O(log n)|1,3us|78us|
|O(n)|1ms|60ms|
|O(n log n)|13,3ms|798ms|

Vemos que el algoritmo O(n log n) se queda atrás ya que consume casi todo el tiempo disponible en un segundo, y aún quedan otras tareas por hacer (IA, renderizado, sonido, comunicaciones...). Pero es que aunque se pusiese en un hilo dedicado, la detección de colisiones suele ser un cálculo bloqueante de otras tareas, tales como interacción con objetos, recibir daño, restringir el movimiento. Así que incluso en el caso del O(n) estaríamos consumiendo el 6% de nuestro valioso tiempo en esto antes de poder proseguir con otros cálculos. Por último, suponer un escenario de sólo 10.000 polígonos es, hoy en día, hablar de un juego bastante sencillote. En entornos más exigentes (más de 1 millón de polígonos), la solución de orden lineal se mostraría inficiente también.

## Complejidad espacial

La tabla anterior mostró la eficiencia de ejecución de un algoritmo. A la hora de hablar de complejidad espacial, tenemos que hacer hincapié en que la gran mayoría de las veces se refiere al espacio requerido _por las estructuras auxiliares_, no por el conjunto de datos en sí que, obviamente, tendrá que contener los datos que necesite (dejaremos de lado técnicas de compresión o de control de redundancias).

Así pues, imaginemos que tenemos una colección de objectos de clase `C`, donde cada uno ocupa 20 bytes y, para simplificar, asumamos que la alineación de memoria es siempre perfecta. Dicha colección debe ser procesada por diversos algoritmos, cada uno con una complejidad espacial diferente (no pasaré de O(N<sup>2</sup>), ya que suele ser el peor caso asociado). Para ilustrar el caso haremos los cálculos suponiendo un _overhead_ de un objeto auxiliar (20B):

||1|1.000|1.000.000|
|--|--|--|--|
|O(1)|20B|20B|20B|
|O(log n)|20B|200B|400B|
|O(n)|20B|20KB|20MB|
|O(n log n)|20B|4MB|8GB|
|O(n<sup>2</sup>)|20B|20MB|20PB|

Vemos claramente cómo no suelen ser viables algoritmos que requieren más de O(n) espacio adicional. Esto sin entrar en detalles tales como el tiempo que conlleva la reserva de memoria ni el patrón de accesos a todos los datos (caché).

## Conclusiones

En esta primera entrega hemos expuesto las nociones de la complejidad algorítmica: notación O grande, complejidad temporal y espacial; y mostrado su impacto mediante ejemplos realistas.

Como guía rápida, en general debemos evitar cualquier algoritmo de orden cuadrático y superior en aquellos escenarios donde el conjunto de datos sea grande. En una entrega futura detallaremos la complejidad de algunos algoritmos conocidos así como diversas técnicas de optimización que podemos utilizar.
