---
title: Benchmarking de iteraciones sobre QMaps
date: 2020-12-06T17:31:07+01:00
author: Carlos Buchart
layout: post
permalink: /2020/12/06/benchmarking-de-iteraciones-sobre-qmaps/
image: /assets/images/featured/iterating_qmaps.jpg
excerpt: 'Como usuario asiduo de Qt, el rendimiento de sus diferentes componentes resulta crítico. Hoy me gustaría comentar brevemente una pequeña comparativa que hice recientemente sobre las diversas formas de iterar sobre un QMap.'
categories: c++ qt maps benchmarking
---
Como usuario asiduo de Qt, el rendimiento de sus diferentes componentes resulta crítico. Hoy me gustaría comentar brevemente una pequeña comparativa que hice recientemente sobre las diversas formas de iterar sobre un `QMap`. Esta entrada es básicamente un estudio de rendimiento de las opciones presentadas hace ya un tiempo en [esta otra]({{url}}/2020/04/26/iterando-sobre-qmaps/).

### Estudio

El estudio se ha realizado iterando sobre `QMap<QString, int>` de entre 100 y 1.000.000 de elementos, repitiendo 1000 veces. He utilizado los _benchmark_ del módulo Qt::Test para facilitar el proceso. El código del estudio puede descargarse desde [mi repositorio en GitHub](https://github.com/BlogHeaderFiles/SourceCode/tree/master/qmap_wrapper_benchmark).

El entorno de pruebas es un i7 7700HQ con 16GB de RAM, ejecutando Windows 10 (20H2); el código fue compilado usando Visual Studio 17 y Qt 5.14.2 de 32 bits.

Las distintas formas de iteración valoradas han sido las siguientes:

#### Iteración directa sobre los valores

`for (const auto &value : map) { sum += value; }`

#### Iteración sobre las claves

`for (const auto &key : map.keys()) { sum += map[key]; }`

#### Usando los iteradores estándar de `QMap`

`for (auto it = map.begin(); it != map.end(); ++it) { sum += it.value(); }`

#### Convirtiendo a `std::map`

`for (const auto &it : map.toStdMap()) { sum += it.second; }`

#### Usando los iteradores `keyValue` presentes desde Qt 5.10

`for (const auto it : ::qmap_wrapper{map}) { sum += it.second; }`

### Resultados

La siguiente gráfica muestra los resultados de las pruebas:

![todo](/assets/images/benchmark_qmap_wrapper.jpg)

Como era de esperarse, las opciones más ineficientes (y con diferencia) son las que iteran individualmente sobre las claves y luego realizan la consulta. Algo mejor se comporta la copia a un `std::map`, donde se nota que se recurre al iterador base del `QMap`, aunque claramente hay una penalización por copia y doble acceso.

Los mejores resultados los reportan, más o menos en el mismo rango, el iterador estándar de `QMap`, el _range-for_ por defecto, y nuestro `qmap_wrapper`, siendo entre uno y dos órdenes de magnitud más eficientes. Esto demuestra que el _wrapper_ desarrollado es una alternativa perfectamente válida, que no sacrifica rendimiento y da mayor versatilidad y compatibilidad con código C++ estándar existente.
