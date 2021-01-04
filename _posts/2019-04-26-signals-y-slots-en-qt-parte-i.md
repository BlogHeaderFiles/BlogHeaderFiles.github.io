---
title: Signals y slots en Qt (parte I)
date: 2019-04-26T08:03:17+02:00
author: Carlos Buchart
excerpt: 'Al hablar de Qt vienen inmediatamente a la cabeza dos palabras: _signals_ y _slots_. Y es que Qt usa ampliamente este mecanismo de comunicación, muy similar al patrón observador, especialmente en lo referente a interfaces gráficas. La documentación de Qt es muy extensa en el uso de este mecanismo, pero me ha parecido interesante resaltar algunos aspectos básicos y otros un poco menos obvios.'
layout: post
permalink: /2019/04/26/signals-y-slots-en-qt-parte-i/
categories:
  - programación
tags:
  - C++
  - Qt
---
Es normal que, para muchos, al hablar de Qt vengan a la cabeza dos palabras: _signals_ y _slots_. Y es que Qt usa ampliamente este [mecanismo de comunicación](https://en.wikipedia.org/wiki/Signals_and_slots), muy similar al [patrón observador](https://es.wikipedia.org/wiki/Observer_(patr%C3%B3n_de_dise%C3%B1o)), especialmente en lo referente a interfaces gráficas.

La [documentación de Qt](https://doc.qt.io/qt-5/signalsandslots.html) es muy extensa en el uso de este mecanismo, pero me ha parecido interesante resaltar algunos aspectos básicos y otros un poco menos obvios. Por su extensión, dividiré este artículo en dos entregas. En esta primera parte introduciré el uso más común y _tradicional_ (el usado hasta Qt 4, aunque sea dentro del contexto de Qt 5), y en la [segunda entrega]({{url}}/2019/05/14/signals-y-slots-en-qt-parte-ii/) pasaré a explicar las novedades introducidas en Qt 5, una comparativa entre ambas versiones, y algunos tópicos más avanzados o al menos no tan frecuentes.

He creado un pequeño proyecto de ejemplo para ilustrar las principales ideas de esta entrada; está disponible en [GitHub](https://github.com/cbuchart/HeaderFiles.com/tree/master/SignalsAndSlots).

### Conceptos generales
Una señal (_signal_) es emitida por un objeto para informar acerca de _algo_. El _slot_ no es más que una función encargada de recibir ese mensaje (_callback_). Al proceso de unir una señal con un _slot_ se le llama _conexión_. Las conexiones son del tipo uno-a-muchos, es decir, una señal puede estar conectada a múltiples _slots_ (aunque no hay ninguna garantía del orden de ejecución de las mismas). Un _slot_ puede invocarse desde varias señales, pero es un uso menos frecuente.

El ejemplo más obvio es, seguramente, poder asociar una acción a un evento de la interfaz gráfica, como la pulsación de un botón:

```cpp
connect(ui.btnButton, SIGNAL(clicked()), SLOT(buttonHasBeenPressed()));
```

Los _signals_ - _slots_ basan una buena parte de su funcionamiento en el [meta-objeto de Qt](https://doc.qt.io/qt-5/qmetaobject.html#details). En una entrada futura (igual muy futura) hablaré sobre él, pero por ahora resumir tres aspectos:

- Es el encargado de casi toda la comunicación basada en señales (luego aclararé el _casi toda_), información del objeto en tiempo de ejecución y de las propiedades.
- Su uso requiere un pre-proceso de compilación mediante la herramienta _moc_ (_meta-object compiler_). Este paso lo gestiona automáticamente el plugin de Qt para Visual Studio o la herramienta `qmake`, dependiendo de cómo se compile el proyecto. Para incluir el meta-objeto es necesario que ésta herede de [`QObject`](https://doc.qt.io/qt-5/qobject.html) (directamente o de una clase padre) y _marcar_ la clase:

```cpp
class MyObject : public QObject {
  Q_OBJECT // la marca: debe ser privada y no hace falta ; al final

public: // ...

public slots: // ...

protected slots: // ...

private slots: // ...

signals: // ...
};
```

Los _slots_ no dejan de ser métodos normales de la clase, y como tales pueden ser públicos, protegidos o privados, se pueden heredar, y marcar como virtuales, abstractos y finales. Las señales por su parte, son algo más especiales: son siempre públicas y su implementación corre por cuenta del proceso `moc` (es decir, no les debemos definir un cuerpo).

#### Notas de interés
En caso de usar herencia múltiple, la clase `QObject` (o heredada, si es el caso) debe ser la primera en la lista de clases:

```cpp
class MyWidget : public QWidget, public MandatoryInterface, protected UIDelegate {
};
```

Así mismo, no es necesario _moc'ear_ toda clase que herede de `QObject`, únicamente aquellas para las que necesitemos hacer uso de señales y _slots_, u otras características del meta-objeto. Algo más sobre esto en [Stack Overflow](https://stackoverflow.com/q/43539405/1485885).

### Sintaxis básica
Esta es la forma _antigua_ (hasta Qt 4) y es la más sencilla de usar. Es importante conocerla no sólo para poder entender código legado, o por tener una forma _corta_ de hacer la conexión, sino porque aún en Qt 5 hay ciertas conexiones que no son posibles sino mediante este mecanismo. De hecho, Qt no indica que esta forma esté obsoleta, simplemente han añadido nuevas (con sus ventajas, pero ya lo veremos en otra entrega).

La sintaxis es como sigue:

```cpp
connect(objeto_emisor, SIGNAL(la_señal(parámetros)),
        objeto_receptor, SLOT(el_slot(parámetros)));
```

Ambos objetos, el emisor y el receptor deben heredar de `QObject` y deben coincidir en los parámetros indicados, aunque se puede emitir el indicador `const` y el de referencia `&`. Si el objeto receptor es el mismo objeto donde se está haciendo la conexión (es decir, `this`), se puede omitir.

En caso de que el _slot_ o la señal no exista, el _runtime_ de Qt reportará un error por consola en tiempo de ejecución a la hora de realizar la conexión. Como por lo general las aplicaciones con interfaz gráfica no tienen una consola asociada, tengo como norma crearla en al menos una configuración del proyecto, normalmente la _Debug_ y, en los proyectos que lo ameriten, la _ReleaseWithDebug_. Como he dicho, la configuración de producción (_Release_) rara vez tiene consola.

![todo](/assets/images/signal_slots_dont_exist.png)

Como nota: muchas veces es necesario mantener actualizado el estado entre diferentes componentes de la interfaz. La forma tradicional de hacerlo en Qt es conectando recíprocamente las señales de un objeto con los _slots_ del otro. Esto puede hacer por código o bien desde el Qt Designer, aunque no soy muy amigo de esta última forma ya que prefiero tener a la vista en el código las conexiones que se realizan, y dentro del fichero UI quedan escondidas y no es sencillo dar con ellas al realizar búsquedas.

#### Desconexión
La conexión se mantiene viva mientras ambos objetos, emisor y receptor, existan. En cuanto uno de los dos es destruido, la conexión es destruida también.

Es posible también realizar esta desconexión manualmente mediante el método `disconnect`. Un par de escenarios para hacer la desconexión manual pueden ser:

- Existe una señal emitida por la clase padre y que está conectada a un _slot_ de una clase hija. Si la señal es emitida durante la destrucción de la clase padre, ya la clase hija ha sido destruida, generando un comportamiento indefinido. En este caso se puede desconectar la señal en el destructor de la clase hija.
- Alternar entre destinatarios de una señal dependiendo del estado actual de la aplicación.

Existen muchas formas de desconexión manual, pero igual las más interesantes son:

- Usar el valor de retorno del método `connect`, un objeto `QMetaObject::Connection` que representa la conexión, y el cual puede pasarse al método `disconnect` para destruirla. Este objeto no puede ser usado para reconectar la señal con el _slot_.
- Desconectar por completo una señal: `ui.btnButton->disconnect(SIGNAL(clicked()));`.

Es posible prevenir, de forma temporal, que un objeto emita señales usando [`QObject::blockSignals`](https://doc.qt.io/qt-5/qobject.html#blockSignals).

#### Exponer una señal
Otro uso frecuente de las conexiones es para _rebotar_ una señal dentro de una composición de objetos o en un _wrapper_: uno de los miembros de la clase emite una señal a la que deben reaccionar usuarios de la clase. Para ello, la clase define su propia señal (con el mismo nombre, u otro) y simplemente se conecta la señal del objeto privado a la señal pública de la clase:

```cpp
connect(ui.btnButton, SIGNAL(clicked()), SIGNAL(buttonClicked()));
```

### El método `sender()`
Como se dijo, las señales y los _slots_ deben pertenecer a objetos que hereden en algún momento de `QObject`. `QObject` tiene un método protegido llamado [`QObject* sender()`](https://doc.qt.io/qt-5/qobject.html#sender) el cual devuelve un puntero al objeto emisor de la señal, o `nullptr` si en ese momento no se está respondiendo a una señal.

Este método permite obtener información adicional y simplifica el diseño de la clase (particularmente de los _slots_). Por ejemplo, si estamos diseñando un teclado virtual, podemos conectar el `clicked()` de todos los botones al mismo método y usar `sender()` para obtener el caracter a mostrar por pantalla (en este caso habría que usar las propiedades de `QObject` o bien hacer un _casting_ al tipo de botón usado). También permite añadir _asserts_ para comprobar que determinado _slot_ sólo está siendo invocado por un tipo específico de objeto, o sólo mediante una señal (`sender() != nullptr`).

### Algunas señales y _slots_ interesantes
Cabe decir que, pese al título, esta lista no es ni mucho menos exhaustiva y ni siquiera amplia; simplemente representa una pequeña muestra de un par de señales y _slots_ propios de Qt que conviene conocer. La documentación de Qt, de nuevo, es rica en ejemplos de conexiones y detalla perfectamente las señales y _slots_ de cada clase (estando atentos a aquellos que puedan estar siendo heredados).

#### _Slots_
- [`QObject::deleteLater()`](https://doc.qt.io/qt-5/qobject.html#deleteLater): como es sabido, es necesario destruir los objetos que no se usen a fin de evitar _memory leaks_. Los objetos de Qt suelen usar un esquema jerárquico de propiedad (padre-hijo), y cuando el padre se destruye los hijos también. Aún así, hay muchos casos donde no se asocia un objeto a un padre, por lo que es responsabilidad del programador el liberar esa memoria. Por otro lado, es posible que queden señales pendientes de procesar y a las que el objeto está conectado, en cuyo caso no se podría garantizar que la señal ha sido procesado antes de borrar el objeto. `deleteLater()` marca el objeto para su destrucción en una próxima iteración del bucle de eventos, por lo que cualquier señal pendiente es correctamente despachada. Un ejemplo puede ser destruir objetos cuando un hilo termine su ejecución (`connect(the_thread, SIGNAL(finished()), the_object, SLOT(deleteLater()))`). Como todo _slot_, éste puede ser llamado como un método normal.
- [`QCoreApplication::quit()`](https://doc.qt.io/qt-5/qcoreapplication.html#quit): finaliza la ejecución de la aplicación de forma inmediata. Seguramente el ejemplo más común es asociar la entrada _Salir_ del menú a este _slot_ (`connect(ui.actionQuit, SIGNAL(triggered()), qApp, SLOT(quit()))`).

#### Señales
- [`QAction::triggered(bool)`](https://doc.qt.io/qt-5/qaction.html#triggered), [`QAction::toggled(bool)`](https://doc.qt.io/qt-5/qaction.html#toggled): emitidas cuando la acción es activada (el parámetro booleano sólo aplica si la acción es _chequeable_). La diferencia básica está en que la primera sólo es emitida cuando la acción cambia por intervención del usuario, mientras que la segunda se emite también cuando el estado cambia programáticamente.
- [`QAbstractButton::clicked(bool)`](https://doc.qt.io/qt-5/qabstractbutton.html#clicked), [`QAbstractButton::toggled(bool)`](https://doc.qt.io/qt-5/qabstractbutton.html#toggled): análogas a las de las `QAction` pero para los botones: `clicked` es emitida sólo si el botón es pulsado por el usuario, mientras que `toggled` se emite también si el estado cambia programáticamente. Esta diferenciación es importante cuando actualizamos el estado de la interfaz desde nuestro código, tanto por si queremos que se ejecute un determinado código como si no.
- [`QThread::started()`](https://doc.qt.io/qt-5/qthread.html#started): emitida por el hilo cuando ya está preparado para ejecutar código. Conectar con esta señal es de hecho la forma recomendada para usar hilos en Qt, y no heredando de `QThread`.
- [`QThread::finished()`](https://doc.qt.io/qt-5/qthread.html#finished): análoga a la anterior, es emitida por el hilo cuando ha finalizado la ejecución del código asociado y está a punto de destruirse.
- [`QObject::destroyed()`](https://doc.qt.io/qt-5/qobject.html#destroyed): emitida por un objeto justo antes de destruirse. Puede usarse para concatenar la destrucción de objetos no-hijos (cuidado con los punteros inválidos que quedan).

### Siguiente entrega
En el [siguiente artículo]({{url}}/2019/05/14/signals-y-slots-en-qt-parte-ii/) de esta serie estudiamos la nueva sintaxis introducida en Qt 5.