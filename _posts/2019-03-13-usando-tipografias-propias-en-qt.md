---
title: Usando tipografías propias en Qt
date: 2019-03-13T14:00:02+01:00
author: Carlos Buchart
layout: post
permalink: /2019/03/13/usando-tipografias-propias-en-qt/
---
El dar un toque de distinción a nuestras aplicaciones puede pasar por utilizar tipografías que no son estándares, o que sólo vienen incluidas con instalaciones de determinados programas que no podemos asumir estén siempre presentes (ejemplo típico, MS Office, _suites_ de Adobe...).

La opción más conveniente es la de incluirlas con nuestra aplicación (no hablaré de licencias ni nada parecido, asumo que todo está en orden). Para esto se pueden bien copiar junto al ejecutable, o incluir en un fichero de recursos (QRC). En cualquier de ambos casos habrá que registrar las fuentes antes de poder utilizarlas, especialmente si deseamos usarlas desde hojas de estilos.

```cpp
// Para una tipografía incluida en el fichero de recursos
QFontDatabase::addApplicationFont(":/fonts/arialn.ttf");

// Si está distribuida con nuestro ejecutable
QFontDatabase::addApplicationFont("../resources/fonts/arialnb.ttf");
```

Recordad que en Qt las rutas que empiezan por ":" pertenecen al sistema de ficheros virtual de recursos, pero de eso hablaremos más en otro momento. Por otro lado, si las tipografías están en un directorio que se distribuye con la aplicación, podemos utilizar [`QApplication::applicationDirPath`](https://doc.qt.io/qt-5/qcoreapplication.html#applicationDirPath) para asegurarnos de que la ruta que pongamos no se ve modificada por el directorio actual de trabajo:

```cpp
const auto fonts_dir = qApp->applicationDirPath() + "/../resources/fonts/";
QFontDatabase::addApplicationFont(fonts_dir + "arialnb.ttf");
```

Esto podemos hacerlo en nuestra función `main()`, justo después de instanciar la aplicación (`QApplication`) por ejemplo. A partir de ese momento podremos utilizar las fuentes por su nombre como si se tratase de otra fuente del sistema.

La contraparte de esto es que debemos mantener actualizada esta lista de tipografías con las incluidas en los recursos, y bien puede pasar que esa lista sea modificada por otra persona del equipo (por ejemplo, diseñadores), lo que implicaría una constante comunicación con el desarrollador encargado (¿nosotros?) para que la aplicación cargue correctamente todos los recursos. Con el siguiente fragmento de código cargamos todas las tipografías contenidas dentro de un directorio dado de forma completamente automática:

```cpp
// Sustituir ":/fonts/" por el directorio correspondiente
QDirIterator fonts_it(":/fonts/", QDir::Files);
while (fonts_it.hasNext()) {
  QFontDatabase::addApplicationFont(fonts_it.next());
}
```
