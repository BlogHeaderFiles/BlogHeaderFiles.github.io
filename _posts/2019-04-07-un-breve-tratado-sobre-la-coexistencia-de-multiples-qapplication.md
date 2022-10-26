---
title: 'Un breve tratado sobre la coexistencia de múltiples Q*Application'
date: 2019-04-07T08:52:12+02:00
author: Carlos Buchart
layout: post
permalink: /2019/04/07/un-breve-tratado-sobre-la-coexistencia-de-multiples-qapplication/
image: /assets/images/featured/multiple_qapplications.jpg
excerpt: 'Hace un par de años me tocó embeber el editor de interfaces de Qt (Qt Designer) dentro de otra aplicación. Si bien el cómo lo hice no tiene demasiada importancia ahora mismo, resulta que me enfrenté al siguiente problema: Qt Designer crea su propia instancia de QApplication, pero es que ¡la nueva aplicación contenedora también! Así que ante la clara pregunta ¿tendré problemas?, decidí estudiar el tema un poco más a fondo.'
categories: c++ qt
---
## Breve historia de este post

Hace un par de años me tocó embeber el editor de interfaces de Qt (Qt Designer) dentro de otra aplicación. Si bien el cómo lo hice no tiene demasiada importancia ahora mismo, resulta que me enfrenté al siguiente problema: Qt Designer crea su propia instancia de `QApplication`, pero es que ¡la nueva aplicación contenedora también! Así que ante la clara pregunta _¿tendré problemas?_, decidí estudiar el tema un poco más a fondo.

## Antecedentes: `QApplication`

Un gran número de funcionalidades de Qt requieren de la existencia de un objeto especial, _la aplicación_: ésta gestiona los bucles de eventos, un gran número de variables _globales_ (como el idioma actual), etc.

Dependiendo del modo de la aplicación, este objeto puede ser de tipo `QCoreApplication` para aplicaciones de consola, o `QApplication` para aplicaciones con interfaz gráfica (existe el `QGuiApplication` también, pero es más común usar el `QApplication`). Ejemplo:

```cpp
#include <qapplication.h>

int main(int argc, char* argv[])
{
  QApplication a(argc, argv);

  // Fijando algunas propiedades globales de la aplicación
  qApp->setApplicationName("Multiple QApplication");
  qApp->setOrganizationName("Header Files");

  return a->exec(); // bucle de eventos
}
```

Como se puede ver en este ejemplo, se ha usado el puntero [`qApp`](https://doc.qt.io/qt-5/qapplication.html#qApp), que básicamente es un [_singleton_](https://en.wikipedia.org/wiki/Singleton_pattern) (bueno, una macro que simplifica su uso). Ahora bien, siendo un _singleton_, no es posible que hayan dos instancias. ¿Qué pasa entonces con el escenario expuesto al comienzo, donde es posible que `QApplication` se instancie dos veces?

## Código de ejemplo

El siguiente programa ilustrará las consecuencias de tener uno o más `Q*Application`s instanciados. Las pruebas se han hecho ejecutando Qt 5.12.2 de 32 bits compilado con Visual Studio 2017 (15.9.11). Las mismas pruebas las he realizado con versiones anteriores de Qt 5 con los mismos resultados.

El código de este proyecto (para VS) está disponible en [GitHub](https://github.com/BlogHeaderFiles/SourceCode/tree/master/Multiple_QApplications).

```cpp
#include <QtCore>
#include <qapplication.h>

QTranslator tr1;

void testTranslators(QApplication& a)
{
  qDebug() << qApp->removeTranslator(&tr1); // false if the translator is not installed
  a.installTranslator(&tr1); // it is installed in the latest instance (as if called from qApp)
  qDebug() << qApp->removeTranslator(&tr1); // false if the translator is not installed
}

void oneQApplication(int argc, char* argv[])
{
  qDebug() << __FUNCTION__;

  QApplication a1(argc, argv);
  a1.setApplicationName("a1");
  a1.installTranslator(&tr1);
  qDebug() << qApp << &a1;
  qDebug() << "a1.applicationName() =" << a1.applicationName();

  // qApp == &a1
  QObject::connect(&a1, &QCoreApplication::aboutToQuit, []() { qDebug() << "aboutToQuit from a1!"; });
  QTimer::singleShot(2000, &a1, &QCoreApplication::quit); // as if connected to latest qApp

  testTranslators(a1);

  qApp->exec();
  qDebug() << "-----";
}

void twoQApplications(int argc, char* argv[])
{
  qDebug() << __FUNCTION__;

  QApplication a1(argc, argv);
  a1.setApplicationName("a1");
  a1.installTranslator(&tr1);
  qDebug() << qApp << &a1;
  qDebug() << "a1.applicationName() =" << a1.applicationName();

  // qApp == &a1
  QObject::connect(&a1, &QCoreApplication::aboutToQuit, []() { qDebug() << "aboutToQuit from a1!"; });
  QTimer::singleShot(2000, &a1, &QCoreApplication::quit); // as if connected to latest qApp

  qApp->setStyleSheet("QLineEdit{}");
  qDebug() << "qApp->styleSheet() = " << qApp->styleSheet();

  do { // limite scope of second application
    QApplication a2(argc, argv);
    a2.setApplicationName("a2");
    qDebug() << qApp << &a1 << &a2;
    qDebug() << "a2.applicationName() =" << a2.applicationName();
    qDebug() << "a1.applicationName() =" << a1.applicationName(); // as if called from qApp
    qDebug() << "qApp->applicationName() =" << qApp->applicationName();
    qDebug() << "qApp->styleSheet() = " << qApp->styleSheet();
    QObject::connect(&a2, &QCoreApplication::aboutToQuit, []() { qDebug() << "aboutToQuit from a2!"; });

    testTranslators(a1);

    qApp->exec();
  } while (false);

  qDebug() << qApp << &a1;

  a1.installTranslator(&tr1);

  qDebug() << "-----";
}

int main(int argc, char* argv[])
{
  oneQApplication(argc, argv);
  twoQApplications(argc, argv);

  return 0;
}
```

### Resultados

#### Ejecución en Release

```text
oneQApplication
QApplication(0x79fd90) QApplication(0x79fd90)
a1.applicationName() = "a1"
true
true
aboutToQuit from a1!
-----
twoQApplications
QApplication(0x79fd88) QApplication(0x79fd88)
a1.applicationName() = "a1"
qApp->styleSheet() =  "QLineEdit{}"
QApplication(0x79fd80) QApplication(0x79fd88) QApplication(0x79fd80)
a2.applicationName() = "a2"
a1.applicationName() = "a2"
qApp->applicationName() = "a2"
qApp->styleSheet() =  "QLineEdit{}"
false
true
aboutToQuit from a2!
QObject(0x0) QApplication(0x79fd88)
QApplication::installTranslator: Please instantiate the QApplication object first
-----
```

#### Ejecución en Debug

En debug, el resultado es similar, salvando por un par de _asserts_ que pueden ser ignorados ya que no violan ninguna precondición sino que simplemente alertan de posibles resultados no esperados.

```text
oneQApplication
QApplication(0x59f9b4) QApplication(0x59f9b4)
a1.applicationName() = "a1"
true
true
aboutToQuit from a1!
-----
twoQApplications
QApplication(0x59f9b8) QApplication(0x59f9b8)
a1.applicationName() = "a1"
qApp->styleSheet() =  "QLineEdit{}"
ASSERT failure in QCoreApplication: "there should be only one application object", file kernel\qcoreapplication.cpp, line 791
ASSERT: "!eventDispatcher" in file kernel\qcoreapplication.cpp, line 852
QApplication(0x59f8d8) QApplication(0x59f9b8) QApplication(0x59f8d8)
a2.applicationName() = "a2"
a1.applicationName() = "a2"
qApp->applicationName() = "a2"
qApp->styleSheet() =  "QLineEdit{}"
false
true
aboutToQuit from a2!
QObject(0x0) QApplication(0x59f9b8)
QApplication::installTranslator: Please instantiate the QApplication object first
-----
```

## ¿Qué implica entonces varios `Q*Application`?

- El más obvio: en debug saltarán algunos _asserts_, que pueden ser ignorados. En release no hay _crash_ alguno.
- Cada instanciación del `Q*Application` actualiza el _singleton_ (`qApp` siempre apunta a la última instancia), pero _no_ guarda un histórico para _rollback_ (ver punto siguiente).
- Al destruirse la instancia activa de `Q*Application` (la última), `qApp` pasa a nulo, no a la instancia anterior.
- Propiedades como `applicationName` y `applicationOrganization` _pasan_ entre versiones: esto es bastante lógico dado que esos métodos son estáticos.
- Los _slots_ siempre actúan sobre el último `Q*Application` (aka: `qApp`).
- El único caso que he visto en este breve estudio donde habría que tener cuidado es con los traductores, que _no_ son transferidos a la siguiente instancia, pero necesitan que el singleton (`qApp`) sea válido para poder instalarse.

## Conclusiones

Es posible tener un proceso que instancia múltiples veces los `Q*Application`s, siempre que tengamos en cuenta:

- La última instancia debe existir siempre que queramos acceder al _singleton_. Si la última instancia la crea un plugin que puede ser descargado deberemos asegurar la creación de una nueva instancia global antes de que eso suceda.
- Tener cuidado si nuestra aplicación usa `QApplication` pero la instancia vigente (la última) es un `QCoreApplication`.

## Enlaces relacionados

- [Multiple QApplication instances (SO)](https://stackoverflow.com/q/46304070/1485885)
