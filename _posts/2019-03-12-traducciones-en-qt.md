---
title: Traducciones en Qt
date: 2019-03-12T09:29:51+01:00
author: Carlos Buchart
layout: post
permalink: /2019/03/12/traducciones-en-qt/
categories:
  - programación
tags:
  - C++
  - Qt
---
El sistema de traducciones de Qt es muy simple: usar el método `QObject::tr()` para definir los textos a traducir, crear un fichero .ts para cada idioma, ejecutar el comando `lupdate` para actualizar esos ficheros con las nuevas frases del proyecto, traducirlas y ejecutar `lrelease` para generar el fichero que usa Qt con las traducciones. El sistema es muy potente, por ejemplo, no hace falta nada especial para cambiar a idiomas orientales, simplemente funciona, además de proveer ayudas a la traducción como libros de frases para tener traducciones "pre-hechas", o detectar incoherencias en parámetros o signos de puntuación distintos entre traducciones los muestra.

Como siempre, no quiero dar un curso, sólo recopilar algunos _tips_ nacidos del día a día.

### Frases dinámicas
Igual es de los consejos más importantes y "no opcionales". Veamos.

"El carro de Pepe", "Pepe's car". Un ejemplo rápido de que cada idioma tiene construcciones diferentes. ¿Y qué? Imaginemos que queremos que nuestra aplicación pregunte el nombre al usuario y muestre el mensaje anterior. Nuestro primer código podría ser algo como:

```cpp
QString msg = tr("El carro de ") + strNombre;
```

El problema viene al traducirlo: la cadena a traducir es únicamente "El carro de ", mientras que en nuestro código concatenaremos el nombre a continuación. No es posible traducir la frase al inglés usando este método.

Qt ofrece una solución basada en parámetros: construimos una única frase indicando el lugar de los elementos. En tiempo de ejecución sustituimos esos parámetros con el método `QString::arg`. Así:

```cpp
QString msg = tr("El carro de %1").arg(strNombre);
```

La cadena a traducir en inglés tendrá la forma "%1's car", y funcionará perfectamente.

### Cambios en los textos originales
Un proyecto es un ser vivo, y es normal que los textos mostrados cambien. Cada vez que eso ocurre hay que ejecutar `lupdate` para actualizar el fichero .ts. Ahora bien, al cambiar textos o quitar frases, el fichero .ts guarda las viejas entradas (muy bueno por una parte para re-traducir, especialmente si son cambios menores como un signo de puntuación o una falta de ortografía en el texto original). Conforme crece el proyecto, las viejas entradas pueden molestar más que ayudar. Para eliminarlas basta con ejecutar `lupdate -noobsolete` (si se usa el plugin de Visual Studio se puede especificar este parámetro en las opciones del proyecto de Qt).

### Propiedades personalizadas
Es posible definir en el Qt Designer propiedades personalizadas a los `QWidget` (por ejemplo, para distinguir grupos de objetos de forma sencilla). No entraré en detalle ahora de esto, prometo un post otro día. ¿Qué tiene que ver con las traducciones? Que si el valor asignado es una cadena de texto, por defecto Qt Designer lo marca como "traducible", por lo que nuestro fichero .ts podría verse desbordado de propiedades que no queremos traducir. Para evitarlo basta con desmarcar la casilla "Traducible" de la propiedad.

### One more thing...
El último consejo no es directamente propio de las traducciones sino de la clase `QString` y del Visual C++. El editor de código usa una codificación diferente a la que usa Qt por defecto, lo que puede llevar a que algunos caracteres se muestren mal al ejecutar la aplicación. Un caso típico es el símbolo de grado (º). El problema se magnifica si ese símbolo está en una traducción, ya que entonces Qt no asociará los textos 'origen' y 'traducción' correctamente. La solución más cómoda que he encontrado es usar un parámetro para ello e insertar el carácter Unicode correspondiente:

```cpp
QString degreeMsg = tr("Ahora mismo hacen 25%1").arg(QChar(0260));
```
