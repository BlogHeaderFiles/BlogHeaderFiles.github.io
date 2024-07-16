---
title: La trampa al usar semántica de movimiento con std::string
date: 2024-07-17T00:00:00+02:00
author: Carlos Buchart
layout: post
permalink: /2024/07/17/std-string-move-trampa
image: /assets/images/featured/move.jpg
excerpt: Estudiamos la eficiencia de la semántica de movimiento en std::string y exploramos algunas consideraciones.
categories: c++ c++11 move-semantics string
---
## La trampa al usar semántica de movimiento con `std::string`

La semántica de movimiento de `std::string` puede ser complicada y, a menos que tengamos información previa sobre los tamaños esperados de las cadenas, puede tener el efecto contrario y hacer que el código sea más lento. La razón detrás de esto es la _optimización de cadenas pequeñas_ (SSO, por sus siglas en inglés). que consiste, en resumidas cuentas, en tratar al objeto como si fuera una unión, de forma que si la cadena es más corta que un tamaño dado, se almacena en el mismo bloque de memoria del objeto en lugar de asignar memoria dinámica. Cuando la cadena supera ese tamaño, la cadena se almacena en un bloque diferente.

### ¿Qué es la Optimización de Cadenas Pequeñas (SSO)?

La SSO es una técnica utilizada en la implementación de `std::string` para optimizar el uso de memoria y el rendimiento. En lugar de asignar memoria dinámica para todas las cadenas, la SSO almacena cadenas pequeñas directamente en el objeto `std::string` (como si de una unión se tratase). Se puede ver la SSO en acción en [este ejemplo](https://coliru.stacked-crooked.com/a/5ce54b634d60a59e).

Esta técnica evita la sobrecarga de la asignación de memoria dinámica, que puede ser costosa en términos de tiempo y recursos. Sin embargo, esta optimización introduce algunas consideraciones importantes al mover objetos `std::string`.

_Nota: La SSO no es parte del estándar de C++ sino más bien una optimización de algunos compiladores. Igualmente, el tamaño máximo para considerar una cadena como pequeña no tiene que ser el mismo en todas las implementaciones ni plataformas._

### El constructor de movimiento de `std::string`

Al mover cualquier objeto en C++, estamos dando la posibilida de realizar una _copia optimizada_. La eficiencia aumenta cuando tenemos recursos externos que podemos intercambiar, como un puntero a un bloque de memoria o un _handle_ de fichero. Sin embargo, para el resto de datos, aún tenemos que copiar datos. Si la cadena es pequeña y la SSO está en acción, no hay ningún puntero que intercambiar y todavía estamos copiando los datos base de `std::string`.

De hecho, al mover, tenemos que garantizar que el objeto original se mantenga en un estado válido, lo cual normalmente se hace estableciendo algunos valores por defecto. En la práctica, esto significa que estamos copiando una vez y asignando una vez, duplicando la cantidad de operaciones en comparación con una copia normal. Por lo tanto, si nuestras cadenas se espera que siempre (o la mayoría del tiempo) sean más cortas que el límite de SSO, entonces un movimiento perjudicaría el rendimiento.

### Comparación de Copia vs Movimiento

Para ilustrar mejor este punto, se puede comparar el rendimiento de la copia y el movimiento para cadenas pequeñas, grandes y una mezcla de ambas. El [siguiente ejemplo](https://quick-bench.com/q/R8uD6hPu1z5yVSetQY5gblzX5R8) permite visualizar las diferencias entre ellas. En este benchmark, se estableció un tamaño de 32 caracteres para tener aproximadamente un 50% de cadenas pequeñas y un 50% de cadenas grandes. Los resultados muestran cómo el movimiento de cadenas pequeñas puede ser menos eficiente que una simple copia debido a la SSO.

![Benchmark std::string](/assets/images/std-string-copy-move.png)

### Conclusión

En resumen, la semántica de movimiento de `std::string` no siempre es la mejor opción, especialmente cuando se trata de cadenas cortas que se benefician de la SSO. Es crucial considerar el tamaño esperado de las cadenas al decidir entre copiar o mover `std::string`. Esta decisión puede tener un impacto significativo en el rendimiento de nuestra aplicación.
