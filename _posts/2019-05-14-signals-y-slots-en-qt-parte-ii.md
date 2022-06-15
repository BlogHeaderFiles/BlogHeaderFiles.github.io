---
title: Signals y slots en Qt (parte II)
date: 2019-05-14T22:05:03+02:00
author: Carlos Buchart
layout: post
permalink: /2019/05/14/signals-y-slots-en-qt-parte-ii/
---
En esta segunda entrega de _Signals y Slots_, estudiaremos la nueva sintaxis introducida en Qt 5, así como una comparativa respecto a la forma antigua, y cómo resolver los principales problemas que puedan surgir.

Actualización: el código de ejemplo para esta entrada está ya disponible en [GitHub (Part_2)](https://github.com/BlogHeaderFiles/SourceCode/tree/master/SignalsAndSlots).

### Qt 4

El método clásico descrito en el [artículo anterior]({{url}}/2019/04/26/signals-y-slots-en-qt-parte-i) (el único en Qt 4 y anteriores), tiene básicamente dos desventajas:

- No es posible hacer comprobaciones en tiempo de compilación (abriendo la puerta a muchos errores sutiles e indetectables, tales como escribir mal el nombre del _slot_). Los errores son sólo mostrados en tiempo de ejecución, por consola, y sin ningún tipo de _assert_ ni nada parecido, por lo que es muy sencillo pasarlos por alto.
- Sólo permite unirse a métodos marcados como _slots_ en la definición de la clase.

### Nueva sintaxis en Qt 5

Con la llegada de Qt 5 (hace ya unos años), se proporcionaron nuevas formas de conexión para solventar los problemas descritos anteriormente. Esta nueva sintaxis es, de media, un poco más larga, pero tiene como principal ventaja que la existencia de la señal, el _slot_ y la compatibilidad de tipos de datos son comprobados en tiempo de compilación en lugar de hacerlo silenciosamente en tiempo de ejecución.

Simplificando los escenarios, podríamos dividir esta nueva sintaxis en dos tipos: conexión a métodos miembro y conexión a objetos función.

#### Conexión a métodos miembros

De forma general:

```cpp
connect(objeto_emisor, &ClaseEmisora::la_señal,
        objeto_receptor, &ClaseReceptora::el_slot);
```

Un dato interesante es que, gracias a esta nueva sintaxis, el método receptor no tiene por qué estar marcado como _slot_, sino que puede ser cualquier función accesible. Esto proporciona un pequeño ahorro en el tamaño final del ejecutable, ya que es posible prescindir de la pequeña sobrecarga que supone el código del meta-objeto, en caso de no requerirse para más nada, y un mínimo ahorro en tiempo de compilación.

Ahora bien, tiene tres _desventajas_ menores:

- Ya no es posible omitir el objeto receptor en caso de ser `this`.
- En caso de que la señal o el _slot_ estén sobrecargados, es necesario indicar a cuál de todas las versiones se quiere conectar. Para esto se puede usar `qOverload` (ver más adelante).
- El _slot_ no puede usar ya valores por defecto para _disminuir_ el número de parámetros (ver más adelante).

#### Conexión mediante objetos función

Mi forma favorita, ya que permite ahorrar la creación de multitud de micro-métodos específicos (inevitables en Qt 4), además de servir de _puente_ para salvar otras limitaciones de la forma anterior:

```cpp
connect(ui.button1, &QPushButton::clicked,
        []() { QMessageBox::information(nullptr, "", "Hello world!"); });

// foo recibe un QString, por lo que no puede conectarse con la señal clicked
connect(ui.button2, &QPushButton::clicked,
        [this]() { foo("hello world!"); });
```

Una desventaja de esta forma es que no es posible usar el método [`sender()`](https://doc.qt.io/qt-5/qobject.html#sender), básicamente porque el _slot_ (que es un objeto función) no es miembro de una clase que herede de `QObject`.

### Sobrecarga

Como se mencionó al principio, los métodos sobrecargados sean seguramente el punto débil de esta nueva sintaxis, no tanto desde el punto de vista de fiabilidad o rendimiento, sino básicamente de complejidad, ya que es necesario indicar cuál sobrecarga se desea usar.

Esto puede hacerse mediante [`qOverload`](https://doc.qt.io/qt-5/qtglobal.html#qOverload), indicando los tipos de datos de la sobrecarga: `qOverload<int, int, const QString&>(&Clase::slot_sobrecargado)`. Nótese que ha de indicarse el `const` y la referencia `&` (ver ejemplo siguiente). Si la sobrecarga a usar no recibe parámetros, se puede dejar en blanco la lista (`qOverload<>`).

```cpp
// .h
void printString(const QString& str);

// .cpp
connect(m_ui->cboValues, qOverload<QString>(&QComboBox::activated),
        this, &MainWindow::printString); // error de compilación
connect(m_ui->cboValues, qOverload<const QString&>(&QComboBox::activated),
        this, &MainWindow::printString);
```

En caso de que el método esté sobrecargado como const y no-const se usarán `qConstOverload` (para usar la versión const) y `qNonConstOverload` (para la versión no-const).

`qOverload` require que compilemos con soporte para C++14. En caso de disponer de C++11 únicamente, puede usarse la clase de ayuda `QOverload`:

```cpp
connect(m_ui->cboThirdParty, QOverload<QString>::of(&QComboBox::activated),
        this, &About::showThirdPartyAbout);
```

### Valores por defecto

El otro gran _problema_ de la nueva sintaxis son los valores por defecto en el _slot_: cuando el _slot_ tiene más parámetros que la señal. En Qt 4 era posible definir valores por defecto a esos parámetros, con lo que la conexión usaba esos valores por defecto:

```cpp
// .h
void onTextChanged(const QString& text, bool refresh = true);

// .cpp
connect(m_ui->lineEdit, SIGNAL(textChanged(QString)), SLOT(onTextChanged(QString)));
```

Para hacer lo mismo en Qt 5 debemos crear un método intermediario, bien como método miembro o conectando a una función lambda:

```cpp
// Opción 1: sobrecargando el método
// .h
void onTextChanged(const QString& text, bool refresh);
void onTextChanged(const QString& text) { onTextChanged(text); }

// Opción 2: conectando a un lambda intermedio
// .cpp
connect(m_ui->lineEdit, &QLineEdit::textChanged,
        this, qOverload<const QString&>(Class::onTextChanged));
connect(m_ui->lineEdit, &QLineEdit::textChanged,
        [this](const QString& text) { onTextChanged(text, true); });
```

Nótese que no hablo de diferencia en el número de parámetros, ya que la señal pasará al _slot_ todos los parámetros compatibles, de _izquierda a derecha_, e ignorará el resto. En el siguiente ejemplo `textChanged` envía un `QString`, pero que es ignorado por el _slot_:

```cpp
connect(m_ui->lineEdit, &QLineEdit::textChanged,
        []() { qDebug() << "Text has changed"; });
```

### Conversión implícita de parámetros

Ahora bien, hay que tener cuidado con conexiones que involucren señales y _slots_ con parámetros _compatibles_, es decir, que sean transformables entre sí implícitamente, dado que estas conversiones no son comprobadas en tiempo de compilación:

```cpp
// .h
void record(int secs = 0);

// .cpp
// Conversión bool -> int
connect(m_ui->btnRecord, &QPushButton::clicked, this, &Video::record);
```

En este caso, se hace una conversión implícita del parámetro `bool` de `clicked` y se le pasa a `record` como un entero. Para más información sobre qué pasaría en el caso contrario (`int` a `bool`), sugiero una mirada a [esta publicación en S.O.](https://stackoverflow.com/a/2192801/1485885).

De nuevo, una solución a este caso sería o bien una función lambda o una sobrecarga que internamente llame al método con los parámetros correctos.

### Siguiente entrega

En una tercera parte discutiremos los últimos aspectos relacionados con _slots_ constantes, orden de ejecución de los _slots_, sistemas multi-hilo y el bucle de eventos.
