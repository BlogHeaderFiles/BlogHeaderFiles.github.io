---
title: Documentar, sí, ¿pero dónde?
date: 2022-07-15T00:45:00+02:00
author: Carlos Buchart
layout: post
permalink: /2022/07/15/documentar-si-pero-donde
image: /assets/images/featured/document.jpg
excerpt: Algunas reflexiones sobre la documentación de código.
---
## Introducción

Mis primeras experiencias programando se podrían catalogar formalmente de _garabatos_: un montón de código que a duras penas hacía lo que yo quería que hiciese (el hecho de que fuese en BASIC no ayudaba mucho, todo hay que decirlo). En ese entonces tampoco disponía de conexión a Internet, y aunque la tuviese, tampoco habría encontrado gran cosa en él (aún).

Al poco tiempo aprendí la importancia de dejar, usando palabras en cristiano, una explicación de aquellas líneas. Y así se inició ese viaje en lograr que el código lo entendiese no sólo el ordenador, sino también otro ser humano (que, como pasa inequívocamente, casi siempre era yo mismo poco tiempo después).

## Las etapas de la documentación

Al principio uno ve la documentación como algo tedioso e innecesario: ¿por qué he de poner en la lengua de Cervantes (o Shakespeare) lo que esa hermosa línea de código hace, si se ve a leguas? Bueno, cualquier que haya vuelto a un código suyo escrito pocas semanas atrás sabrá responder a esta pregunta rápidamente (aunque no todo son comentarios, pero hablaremos de ello en un rato).

Poco después casi siempre uno pasa por un período oscuro, opuesto por completo a la falta de documentación pero igual de malo: la _sobredocumentación_. Si no poner ningún comentario es malo, parafrasear cada comando, instrucción y ciclo de reloj no solo es una pérdida de tiempo en ese momento, es además una pérdida de tiempo a futuro cuando se esté leyendo el código y una pérdida de tiempo aún mayor ya que hay que mantener una documentación tan rígida que con el mínimo cambio queda obsoleta.

En términos generales sabemos bien lo que una línea individual hace: leer un fichero, incrementar un valor, grabar un valor a disco... El problema no es _qué_ hace una línea, sino _qué se supone que queremos hacer_ con el conjunto (bloque, función, clase), el _por qué_ se hace. Para el ejemplo anterior bien podría ser _generar y almacenar el siguiente ID único_. Esto hace a la documentación más útil y además más duradera en el tiempo, ya que no depende del código sino del diseño de la solución y de los requerimientos.

## Código expresivo

Cuando llegamos a este punto entendemos que, aunque no haya que documentar cada línea del código, sí que hay que escribir un código que sea legible. No es lo mismo `int ab23 = get_value(42, 3.14, 1984);` que

```cpp
constexpr auto ANSWER{42};
constexpr auto PI{3.14};
constexpr auto BEST_YEAR{1984};
int common_digits_count = get_number_of_common_digits(ANSWER, PI, BEST_YEAR);
```

Esto no sólo aplica a los nombres de variables, tipos y funciones. La expresividad también está en el correcto uso del lenguaje en el que programamos. Por listar algunos:

- Uso de la biblioteca estándar (no reinventar la rueda, usando un idioma común a otros programadores)
- Seguir los _guidelines_ generales del lenguaje
- Un correcto uso de la semántica propia (¿por qué usar lenguaje imperativo cuando se soporta y prefiere el funcional?)

En resumen, el mejor comentario es el que no se necesita, ya que en ese caso el código habla por sí mismo. Esto no quita que debamos indicar el propósito general si éste no se puede extraer fácilmente del propio código. Veamos cómo documentar el resto.

## Documentación de API

Esta documentación suele estar en los ficheros públicos del código, aquellos que _ven_ otros programadores, y se necesita para entender cómo usar las interfaces expuestas, sus funciones, parámetros, propósito de las clases, etc.

Además, estos comentarios suelen diferenciarse de los demás en que tienen una sintaxis particular (dependiendo del lenguaje y otras herramientas de documentación). Por ejemplo, si usamos C++ y Doxygen, podríamos ver algo como

```cpp
/**
 * Generate a unique private key for a given table.
 * @param table Table for which the key is being generated.
 * @return int Unique key.
 */
int generate_unique_key(const std::string& table);
```

Es importante destacar que si las APIs están en la frontera de nuestro servicio (por ejemplo, una API REST o un sistema de mensajes), la documentación generada debe estar disponible a otros equipos, tanto de desarrollo como de QA. Esto puede hacerse bien exportando la documentación generada, o bien mediante sistemas de definición de APIs como RAML u OpenAPI que además permitan generar las APIs requeridas por cada proyecto de forma automática a partir de la misma especificación.

## Documentación de lógica

Con estos comentarios buscamos resumir el algoritmo, el propósito del código. Muchas veces puede ser un breve resumen al comienzo de una función. Otras se pondrá un comentario para describir lo que se busca con un determinado bloque de código, aunque hay que estar atentos a estos casos, ya que podría ser un indicador de que podemos refactorizar y extraer una función.

### Casos particulares y casos borde

Esta documentación es de suma importancia, ya que no se suele poder deducir del código. Son casos especiales para los que el diseño no está preparado, _corner cases_ encontrados en producción o código que simplifica la lógica atajando determinadas situaciones.

En estos casos la documentación busca salvaguardar ese conocimiento de nuestra volátil memoria (o incluso de nuestra volatilidad en la empresa). En el caso de los _hotfixes_, suele ser buena idea dejar constancia del ID del _ticket_ asociado, de forma que se puede entender mejor el contexto, cómo se produce el error, etc. Comentar por último que estos comentarios son útiles para ayudar a futuros _refactorers_ a entender mejor el problem.

## Documentación externa al código

Hay otra parte vital de la documentación y es aquella que describe al conjunto. No siempre podemos entender, o siquiera usar un módulo si no sabemos qué problema resuelve, el diseño de las clases, su interoperabilidad, etc.

En esta parte digamos que siempre hay poco de conflicto sobre cómo documentar: están los que prefieren un fichero `README.md` en el proyecto, los que abogan por un directorio completo de documentación, los que prefieren ponerla en un gestor de documentos, en una _wiki_...

En términos generales empecemos diciendo que lo más importante es que _exista_. Si no hay documentación de poco sirve enfrascarnos en una discusión de dónde tiene que ir.

Lo siguiente es que debe ser _encontrable_. Cualquiera que la necesite debería poder buscarla y acceder a ella (roles aparte).

Por último, debe ser _usable_. Es decir, que nos aporte la información que necesitamos. Esto incluye que esté actualizada (con el código, con los requerimientos), y que sea adecuada (navegación, contenido, nivel de detalle).

### Documentación de especificaciones funcionales

Estos documentos nos indican lo que debería hacer nuestra aplicación, servicio, módulo... Normalmente viene dado por el _Product Owner_, que a su vez lo ha redactado a partir de los requisitos del Negocio. Un ejemplo de ello serían los diagramas de casos de uso.

Por definición, un desarrollador debería ser un _lector_ de este documento, pero no un _escritor_, no debería modificarlo ya que podría caer en la tentación de ajustar los requerimientos al comportamiento del sistema, y no al contrario que es como debería ser.

Debido a esto, estos documentos deberían estar separados del código y en un lugar visible por todos los equipos involucrados: desarrollo, diseño, validación... Este lugar podría ser desde algo tan completo como un DMS (como Confluence), hasta algo más sencillo como una wiki o una carpeta compartida en Google Drive.

### Documentación del diseño

Si los documentación de especificaciones eran el _qué_ hay que hacer, el diseño de software viene siendo el _cómo_ está pensada la solución, y puede presentarse en diferentes niveles de abstracción: diagramas de clases, de estados, de secuencia, de colaboración, etc. (Para más información se pueden consultar los distintos [diagramas UML](https://es.wikipedia.org/wiki/Lenguaje_unificado_de_modelado)).

Como es evidente, dichos diagramas y demás documentos son útiles sólo si se corresponden con el código, si le representan. Si no más bien crean confusión. Por ejemplo, ¿el diagrama de secuencia es correcto y la implementación es errónea? ¿o más bien el diagrama se quedó obsoleto por no actualizarlo con los cambios en el código?

Dicho esto, lo más natural es versionar esta documentación a la par que el código, posiblemente como parte del mismo repositorio; o generar parte de ella a partir del código (por ejemplo los diagramas de clases o de colaboración).

## Conclusión

Hemos comentado a lo largo de este artículo la importancia de documentar qué hace nuestro código, cómo lo hace, cómo se comunica, de dejar constancia de la experiencia adquirida. Asimismo hemos presentado una propuesta de distribución de la documentación que la pone cercana a los actores interesados así y que permite mantenerla útil a lo largo del tiempo.

## Créditos

- Icono de la imagen de cabecera por [Freepik - Flaticon](https://www.flaticon.com/free-icons/documents).
