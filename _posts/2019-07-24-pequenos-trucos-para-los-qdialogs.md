---
title: Pequeños trucos para los QDialogs
date: 2019-07-24T19:04:09+02:00
author: Carlos Buchart
layout: post
permalink: /2019/07/24/pequenos-trucos-para-los-qdialogs/
categories:
  - programación
tags:
  - C++
  - Qt
---
Es habitual que nuestras aplicaciones no se restrinjan a una única ventana, sino que se sucedan diversas ventanas de opciones, mensajes, informes, selección de datos, visualización de resultados, etc.

Una de las grandes decisiones que hay que tomar cuando se diseñan estas ventanas es su [modalidad](https://es.wikipedia.org/wiki/Ventana_(inform%C3%A1tica)#Modalidad) que, en lenguaje llano, dice si se puede seguir usando el resto de la aplicación (no modal) o no (modal) mientras esa ventana esté abierta.

Resulta obvio que una ventana no-modal es mucho más compleja de diseñar que una ventana modal, ya que mientras ésta (la ventana no modal) _viva_ seguramente deba comunicarse continuamente con la aplicación (u otras ventanas no modales) para mantener actualizado el estado de ambas (por ejemplo, imaginemos una ventana que permita el ajuste de color de un vídeo, o que muestre información proveniente de una red eléctrica). En este caso, lo más normal es diseñar un `QWidget`, mostrarlo y utilizar los mecanismos oportunos de comunicación. Como se está deduciendo por lo genérico del enfoque, este artículo no versa sobre ventanas no modales.

Por otro lado, las ventanas modales son más sencillas, ya que dichos mecanismos de comunicación están mejor delimitados: ocurren antes de mostrarse la ventana, y después de cerrada; mientras la ventana está siendo mostrada ésta tiene su propio ciclo de vida (de eventos, en lenguaje GUI). Puede que ocasionalmente tengan el famoso botón "Aplicar", lo cual implica una comunicación hacia afuera, pero normalmente no se diferencia de lo que ocurre al "Aceptar", salvando que la ventana no se cierra.

En Qt, el soporte para ventanas modales se proporciona mediante la clase [`QDialog`](https://doc.qt.io/qt-5/qdialog.html), que, simplificando, es un `QWidget` con soporte para distintas opciones de modalidad, donde la principal es el método [`QDialog::exec`](https://doc.qt.io/qt-5/qdialog.html#exec) el cual, además de mostrar el diálogo, ejecuta su propio bucle de eventos, bloqueando el bucle del padre, pudiendo además devolver un valor de retorno.

### `QMessageBox`
Un ejemplo básico de diálogos modales lo encontramos en los [`QMessageBox`](https://doc.qt.io/qt-5/qmessagebox.html), que proveen de diálogos básicos preconstruidos, como un diálogo de pregunta:

```cpp
if (QMessageBox::question(nullptr, "Title", "Yes or no?",
                          QMessageBox::Yes | QMessageBox::No, // botones
                          QMessageBox::No) // botón por defecto
    == QMessageBox::Yes) {
}
```

![todo](/assets/images/qdialog_tips_question.png)

Existen en total cuatro cajas de mensaje posibles:
- `QMessageBox::question`: diálogo con icono de pregunta (los valores por defecto de los botones supuestamente muestra el Sí / No con No por defecto, pero al menos hasta la versión 5.12.3 selecciona el Sí)
- `QMessageBox::information`: diálogo con icono de información
- `QMessageBox::warning`: diálogo con icono de alerta
- `QMessageBox::critical`: diálogo con icono de error

Los tres último diálogos muestran por defecto un botón de Aceptar.

El icono del cuadro de mensaje (y de cualquier diálogo o _widget_ que se muestre como ventana) será, si no se indica lo contrario, el del padre. Por otro lado, el título de los diálogos puede ser uno personalizado, o se usa el de la aplicación en caso de indicarse vacío (ahorrándose así el copiar el título u obtenerlo de alguna variable común o de `qApp->applicationName()`).

Es posible además personalizar los textos de los botones, pero en este caso ya es necesario hacerlo en _varias líneas_:

```cpp
QMessageBox msg_box(QMessageBox::Question, "Encuesta", "¿Qué opinas de HeaderFiles?",
                    QMessageBox::Yes | QMessageBox::No);
msg_box.setButtonText(QMessageBox::Yes, "¡Mola!");
msg_box.setButtonText(QMessageBox::No, "Yo <3 HF");
if (msg_box.exec() == QMessageBox::Yes) {
  qDebug() << "Por supuesto";
} else {
  qDebug() << "¡Yo también!";
}
```

![todo](/assets/images/qdialog_tips_custom_labels.png)

### `QDialog`
Lo más normal para diseñar un diálogo es usar el Qt Designer. No me alargaré en este caso, ya que acá mostraré cómo hacerlo programáticamente (además de que algunas opciones no están disponibles desde el editor gráfico). No se diferencia mucho de un `QWidget`, salvo quizá por la forma de ejecutarse (el famoso `QDialog::exec()`), y la posibilidad de conectar con los _slots_ `QDialog::accept` y `QDialog::reject` que se correspondente, respectivamente, con los botones "Aceptar" y "Cancelar".

#### Qt Designer
Cuando se diseña un diálogo usando el Qt Designer, lo más normal es crear una clase que herede de `QDialog`, con una variable miembro del tipo `Ui::ElQueSeaElNombreDeLaClaseDelDialogo`, y en el constructor, invocar a `ui.setupUi(this)`. Este modo se emplea cuando el diálogo es complejo, tiene muchos controles o un flujo de trabajo complejo (modelos asociados, múltiples conexiones, etc.)

#### Programáticamente
Este modo es especialmente útil cuando uno no quiere poblar el proyecto de micro-clases para diálogos que apenas constan de un par de _widgets_ (usualmente alguna etiqueta) y un par de botones.

```cpp
###include <qdialog.h>
###include <qlayout.h>
###include <qpushbutton.h>
###include <qlabel.h>

bool basicDialog()
{
  QDialog dlg;
  
  auto layout = new QVBoxLayout();
  layout->addWidget(new QLabel("This is a dialog."));
  
  auto h_layout = new QHBoxLayout();
  h_layout->addStretch();
  auto ok_button = new QPushButton("OK");
  QObject::connect(ok_button, &amp;QPushButton::clicked, &amp;dlg, &amp;QDialog::accept);
  h_layout->addWidget(ok_button);
  auto cancel_button = new QPushButton("Cancel");
  QObject::connect(cancel_button, &amp;QPushButton::clicked, &amp;dlg, &amp;QDialog::reject);
  h_layout->addWidget(cancel_button);
  layout->addLayout(h_layout);
  
  dlg.setLayout(layout);
  
  return dlg.exec() == QDialog::Accepted;
}
```

![todo](/assets/images/qdialog_tips_dialog_1.png)

Este diálogo básico está muy bien, salvo por dos detalles: ese botón `?` en la barra de título (que supuestamente se usa para mostrar ayuda sobre los controles, pero que ni el propio Windows usa, y cuando lo usa lo hace bastante mal), y el hecho de que el diálogo se puede redimensionar libremente. De esto segundo depende del diseño; normalmente un diálogo tipo mensaje es de tamaño fijo, mientras que los paneles de opciones o de resultados suelen ser redimensionables.

Para solucionar esto debemos cambiar las bandera de ventana (un amplio ejemplo se puede ver [acá](https://doc.qt.io/qt-5/qtwidgets-widgets-windowflags-example.html)).

- Quitar botón de ayuda: 
```cpp
dlg.setWindowFlag(Qt::WindowContextHelpButtonHint, false);
```
- Deshabilitar redimensionado: 
```cpp
dlg.setWindowFlag(Qt::MSWindowsFixedSizeDialogHint, true);
```

![todo](/assets/images/qdialog_tips_dialog_2.png)

_Nota:_ en caso de usar estas líneas en un diálogo diseñado en Qt Designer, hay que asegurarse de ponerlas _después_ de la llamada al `setupUi`, ya que si no se corre el riesgo de que se vean sobrescritas por los valores del diseño visual.

#### Más de dos posibles valores de retorno
Imaginemos que tenemos un diálogo para seleccionar un elemento de entre varios posible, de un _combo box_. Existe una opción que es la de, dentro de la clase que gestiona el código, usar el método [`QDialog::done`](https://doc.qt.io/qt-5/qdialog.html#done): el valor especificado será el devuelto por el diálogo. De todas formas, se recomienda en estos casos usar el `accepted` e implementar un método alternativo para consultar el valor de retorno; de esta forma se marca mejor la diferencia entre un diálogo aceptado y uno cancelado.

El código completo de esta entrada está disponible en [GitHub](https://github.com/cbuchart/HeaderFiles.com/tree/master/QDialog_tips).