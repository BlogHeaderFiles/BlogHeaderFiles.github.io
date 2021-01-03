---
title: Navegando rápidamente por el código (parte I)
date: 2020-02-24T00:34:04+01:00
author: Carlos Buchart
layout: post
permalink: /2020/02/24/navegando-por-el-codigo-rapidamente-parte-i/
categories:
  - programación
---
Como dicen muchos autores, escribir código no es lo único que hace un programador, un programador _lee_ mucho código. Además, la mayor parte de ese código (casi la totalidad) **no** la hemos escrito nosotros. No, ni siquiera en esos proyectos en los que somos el único desarrollador. ¿Cuántos os acordáis de todo el código, con sus más íntimos recovecos, explicaciones y casos borde, que habéis escrito en los últimos... 6 meses? ¿4 semanas? ¿5 días? ¿el viernes? Lo normal es solucionar problemas, refactorizar código, hacerlo mejor, agregar nuevas funcionalidades, documentarlas... y lo normal es no acordarnos de todo. No digo olvidarlo todo, pero sí que es normal que nos olvidemos de cosas, del nombre exacto de una función o clase, de un error descubierto y solucionado sobre la marcha, de un efecto colateral...

Por otro lado, cuando escribimos código muchas veces escribimos mucho código casi de forma simultánea: un _bug_ que conlleva cambiar una buena tajada de métodos, una nueva característica que obliga a rediseñar unas cuantas clases, o un _refactoring_ en el que hay que cambiar la forma en que se usaba una clase en medio proyecto.

En esta serie de dos entregas comentaré cómo navego por el código con el que trabajo. Se trata de un conjunto de herramientas, pasos, técnicas que me ayudan a leer el código, a inspeccionarlo, a tenerlo a la mano, a no _perderme_ en los cambios que hago. No son métodos para _escribir_ mejor código (ni temas de formato, ni organización, ni nomenclatura). Son ayudas para leer y navegar por código ya existente.

En la primera parte abordaré el uso del [IDE (_Integrated Development Environment_, Entorno de desarrollo integrado)](https://es.wikipedia.org/wiki/Entorno_de_desarrollo_integrado) como _chivato_. En mi caso, mi IDE más habitual es Visual Studio (actualmente VS 2017), con mucho uso auxiliar de [Notepad++](https://notepad-plus-plus.org/) (lo recomiendo ampliamente para quien no lo conozca). Por otra parte, alguna vez recurro a Qt Creator, Visual Studio Code, nano, Eclipse, Spider, Xcode. Cada IDE tiene sus puntos fuertes, su _metodología_, digamos que su personalidad e idiosincrasia. Me centraré en Visual Studio, aunque seguramente varias de estas técnicas puedan replicarse en otros entornos.

# Resaltado de sintaxis

Puede parecer obvia, trivial, tácita, pero qué diferencia hay entre ver un código donde palabras reservadas, comentarios, variables, funciones, clases, se distinguen a simple vista. Permite al cerebro centrarse en lo que necesita sin necesidad de leerlo todo; si estamos buscando una variable automáticamente desechamos documentación, cadenas de texto.

Si bien es gusto de cada uno, más las posibilidades de cada editor (algunos distinguen entre clases, funciones y variables, mientras otros sólo identificadores), un buen comienzo es un tema agradable a la vista, que no canse y que permita distinguir los elementos que necesitamos:

![todo](/assets/images/syntax-highlighting.jpg)

# Scroll bars

Seguramente mi técnica preferida, o técnicas, porque realmente son cuatro apartados, todos centrados en tomar las barras de desplazamiento (esas siempre presentes amigas que nos ayudan en nuestro trabajo de subir y bajar por el código) y vitaminarlas. Las encontramos en _Tools_ > _Options_ > _Text editor_ > _C/C++_ > _Scroll Bars_

![todo](/assets/images/vs-options-scrollbars.jpg)

## Posición del cursor

Esta primera permite conocer rápidamente en qué parte del código estamos, de forma que podemos bajar y subir la barra de desplazamiento teniendo presente dónde estábamos. No sólo para volver (que se podría hacer simplemente con las flechas del teclado) sino en relación con lo que estamos viendo, ya que es normal que código relacionado se encuentre cerca. Así podemos acotar la búsqueda, volviendo sobre nuestros pasos si nos estamos alejando demasiado.

## Mapa del documento

Requiere de un buen resaltado de sintaxis para funcionar bien: esta características nos permite tener una visión global del documento en todo momento, incluso en documentos largos; mejor dicho, sobre todo en documentos largos: ubicar rápidamente funciones, documentación, zonas de mayor densidad de código.

![todo](/assets/images/scrollbars-map.jpg)

## Previsualización

Nos permite inspeccionar código en otras partes del documento con solo pasearnos por encima de la barra de desplazamiento sin necesidad de cambiar moverla. Es prácticamente un _zoom_ de la función de mapa del documento. Muy práctico si queremos revisar rápidamente un pequeño fragmento de código sin perder el contexto actual.

![todo](/assets/images/scrollbars-preview.jpg)

## Indicadores

Si el uso de las _scroll bars_ es mi técnica preferida del IDE, el de los indicadores es mi media naranja. Nos muestra una pequeña marca en la barra de desplazamiento para cada uno de los siguientes casos:

- Errores detectados por el IntelliSense: básicamente para adelantarnos a los errores de compilación, especialmente cuando estamos modificando el código.
- Cambios desde último guardado: ideal para saber el impacto de nuestros cambios. Truco si ya hemos guardado: deshacer los cambios, guardar y rehacerlos sin guardar ;)
- Cambios respecto al repositorio: no se sincroniza bien si los _commits_ se hacen desde fuera de VS, pero da una idea de las zonas modificadas desde que se abrió el documento. Normalmente lo uso como un _diff_ rápido, lo que me ayuda a centrarme e ignorar las zonas que no han sido tocadas.
- Selección actual (requiere el uso de la extensión [MatchMargin](https://marketplace.visualstudio.com/items?itemName=VisualStudioPlatformTeam.MatchMargin)): seguramente la que más uso, me permite visualizar el nivel de uso de una función o variable, su dispersión en el código, la ubicación de otros puntos donde se llama a la función que estoy modificando, etc.

![todo](/assets/images/scrollbars-match.jpg)

- Resultados de búsqueda. Similar al anterior pero ni requiere de la extensión ni desaparece al comenzar modificar la selección actual. Mismos casos de uso con el añadido de que no es volátil. Se pueden usar de forma conjunta para resaltar dos términos a la vez.

# Pestañas y documentos

Agrupo acá tres características sobre las ventanas del editor:

## Coloreado por proyecto o tipo de fichero

La extensión [Custom Document Well](https://marketplace.visualstudio.com/items?itemName=VisualStudioPlatformTeam.CustomDocumentWell) nos permite usar un color de pestaña diferente para cada proyecto, pudiendo distinguir rápidamente ficheros cuando tenemos soluciones con muchos proyectos (algo no poco frecuente). Además, podemos indicar colores por tipo de fichero mediante expresiones regulares. Útil cuando además de los ficheros de código contamos con ficheros de recursos, hojas de estilo, etc.

![todo](/assets/images/custom-document-well.jpg)

## Visualizar varios documentos a la vez

Si nuestra pantalla es lo suficientemente grande, podemos abrir un segundo grupo de pestañas (horizontal o vertical) para poder inspeccionar dos documentos en paralelo. La opción en vertical es normalmente la que más código deja ver, especialmente si contamos con un monitor panorámico.

Si además contamos con varios monitores, podemos arrastrar un documento desde su pestaña y dejarlo _flotando_, pudiendo arrastrarlo a otro monitor.

## Dividir un documento en dos

Algunas veces la previsualización del documento en la barra de desplazamiento no es suficiente ya que hay que ir modificando dos partes en simultáneo del mismo fichero. En ese caso, es posible dividir la vista del documento en dos y trabajar sobre cada parte por separado.

![todo](/assets/images/vs-split-window.jpg)

# Parte II

En el siguiente artículo hablaré de un par de usos más del IDE así como de una herramienta fundamental en la navegación de código.