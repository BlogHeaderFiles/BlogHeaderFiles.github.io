---
title: 'Poniendo el foco en&#8230; el foco'
date: 2020-03-07T10:00:27+01:00
author: Carlos Buchart
layout: post
permalink: /2020/03/07/poniendo-el-foco-en-el-foco/
categories:
  - programación
tags:
  - C++
  - Qt
---
Hoy hablaremos de tres casos particulares en los que es conveniente alterar el comportamiento por defecto que tienen algunos controles de Qt al recibir el foco.


# Breve introducción

Para los que no sepan qué es el foco, básicamente éste indica qué control va a recibir los eventos de entrada más importantes (como los de teclado), y se suele representar con un pequeño realce del color de los bordes o algún tipo de contorno. El foco puede obtenerse normalmente clicando sobre el control o pulsando repetidamente la tecla tabulador, aunque esto depende (en jerga Qt) de la [política de foco (_focus policy_)](https://doc.qt.io/qt-5/qt.html#FocusPolicy-enum) que tenga el control.


# Seleccionar todo el texto al mostrar el formulario

El más sencillo de los casos es el de seleccionar el texto al recibir el foco. Un caso típico es cuando tenemos un formulario cuyo primer control es un `QLineEdit` (por ejemplo, el nombre del informe a generar), con un valor por defecto para que no esté vacío, pero que normalmente el usuario va a querer cambiar. Otro caso similar es si al editar un valor se abre un cuadro de diálogo con un único `QLineEdit`: lo normal, de nuevo, será que si el usuario ha elegido _editar_ es que quiera cambiarlo. En estos casos, además de tener ya el foco y estar listo para recibir entradas del teclado, es buena idea que el texto esté previamente seleccionado, así el usuario lo reemplaza con sólo escribir, en lugar de tener que borrarlo manualmente.

Como vemos, el patrón que se sigue es sencillo: al abrir el formulario se pone el foco en el control `QLineEdit` deseado y se debe seleccionar el texto:

```cpp
MyDialog::MyDialog(QWidget* parent) : QDialog(parent)
{
  ui.setupUi(this); // suponiendo un formulario desde un fichero UI
  ui.lineEdit->setFocus();
  ui.lineEdit->selectAll();
}
```

Es importante destacar que cuando el foco se cambia mediante la tecla tabulador, el texto siempre es seleccionado por completo. Si queremos además añadir el mismo comportamiento al cambiar el foco al clicar podemos usar un filtro de eventos similar al expuesto en el próximo caso de uso.


# Reiniciar posición del cursor

Este fragmento de código lo he adaptado de [una pregunta de Stack Overflow](https://stackoverflow.com/q/22532607/1485885) y consiste en forzar a que el cursor esté siempre al comienzo del control. El escenario típico es cuando el control tiene una máscara (por ejemplo, código de activación, seriales, fechas, etc). El comportamiento por defecto es que cuando el usuario clica en el control el cursor se ubica donde haya clicado, probablemente en medio de la máscara, así el control esté _vacío_.

La siguiente clase provee un filtro de eventos que captura el cambio de foco y ajusta el cursor de forma apropiada:

```cpp
class ResetCursorPositionOnFocus : public QObject
{
  Q_OBJECT

public:
  explicit ResetCursorPositionOnFocus(QLineEdit *lineEdit, QObject *parent = nullptr) : QObject(parent)
  {
    lineEdit->installEventFilter(this);
  }

protected:
  virtual bool eventFilter(QObject *obj, QEvent *event) override
  {
    auto le = qobject_cast<QLineEdit *>(obj);
    if (le &amp;&amp; event->type() == QEvent::FocusIn) {
      QMetaObject::invokeMethod(this, "resetCursor", Qt::QueuedConnection, Q_ARG(QWidget *, le));
    }

    return QObject::eventFilter(obj, event);
  }

  Q_INVOKABLE void resetCursor(QWidget *w)
  {
    if (auto le = qobject_cast<QLineEdit *>(w)) {
      if (le->text().isEmpty()) {
        le->setCursorPosition(0);
      } else {
        le->selectAll();
      }
    }
  }
};

void installResetPositionOnFocus(QLineEdit *lineEdit)
{
  // El objeto será agregado a la lista de hijos del control
  //   por lo que será eliminado cuando se destruya el control
  [[maybe_unused]] auto helper = new ResetCursorPositionOnFocus(lineEdit, lineEdit);
}
```


# Deshabilitar el foco al usar la rueda

El último caso de uso que presento tiene que ver ya no con los `QLineEdit` (o similares) sino con los `QComboBox` o hijos de `QAbstractSpinBox`. Por defecto, estos controles establecen la política de foco `WheelFocus`, que significa que adquieren el foco al usar la rueda del ratón sobre ellos, ya que además con ese mismo gesto cambiamos su valor.

El problema surge cuando tenemos un control de éstos en un formulario con barra de desplazamiento vertical (el formulario es más largo que la ventana que lo contiene). Así, los eventos de _scroll_ para desplazarse por el formulario pudieran mezclarse con los de estos controles si el cursor resulta posicionado encima (caso no poco frecuente, os lo aseguro). ¿Resultado? El formulario deja de hacer _scroll_ y pasamos a cambiar el valor del control. Algo nada agradable y poco _user-friendly_.

Por suerte podemos, de nuevo, usar un filtro de eventos para solucionar este problema, capturando los eventos de la rueda:

```cpp
template<class T>
class WheelFocusDisabler : public QObject
{
public:
  using QObject::QObject;

  virtual bool eventFilter(QObject *obj, QEvent *e) override
  {
    if (e->type() == QEvent::Wheel) {
      auto widget = qobject_cast<T *>(obj);
      if (widget &amp;&amp; !widget->hasFocus()) { return true; }
    }
    return false;
  }
};

template<class T>
void installWheelFocusDisabler(T *widget)
{
  if (!widget) { return; }

  if (widget->focusPolicy() == Qt::WheelFocus) { widget->setFocusPolicy(Qt::StrongFocus); }

  auto wheelFocusDisabler = new WheelFocusDisabler<T>(widget);
  widget->installEventFilter(wheelFocusDisabler);
}

void disableWheelFocus(QComboBox *comboBox)
{
  installWheelFocusDisabler<QComboBox>(comboBox);
}

void disableWheelFocus(QSpinBox *spinBox)
{
  installWheelFocusDisabler<QSpinBox>(spinBox);
}

void disableWheelFocus(QDoubleSpinBox *spinBox)
{
  installWheelFocusDisabler<QDoubleSpinBox>(spinBox);
}
```
