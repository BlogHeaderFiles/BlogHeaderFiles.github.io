---
title: QDateEdit con valor nulo
date: 2020-10-18T00:07:28+02:00
author: Carlos Buchart
layout: post
permalink: /2020/10/18/qdateedit-con-valor-nulo/
image: /assets/images/featured/nullable_qdateedit.jpg
excerpt: 'En este artículo presento una variante del widget QDateEdit para trabajar con fechas nulas.'
---
A principios de este año se cumplieron 438 años desde la promulgación de la bula [Inter Gravissimas](https://es.wikipedia.org/wiki/Inter_Gravissimas), el 24 de febrero de 1582, en la que el Para Gregorio XIII instituía un nuevo calendario; el que ahora conocemos como calendario gregoriano y que es el vigente en muchos países, especialmente occidentales.

A raíz de esto me acordé (aunque la pandemia dejó este borrador en el olvido) de un pequeño _tunning_ que tuve que hacer tiempo atrás al widget de selección de fechas de Qt, [`QDateEdit`](https://doc.qt.io/qt-5/qdateedit.html). Uno de los requerimientos era el poder tener una _fecha nula_, algo que indicase que el usuario no había querido introducir una fecha (de nacimiento en este caso, que era opcional).

`QAbstractSpinBox`, del que hereda indirectamente `QDateEdit`, proporciona una propiedad llamada [`specialValueText`](https://doc.qt.io/qt-5/qabstractspinbox.html#specialValueText-prop) que permite mostrar un texto específico cuando el valor del control es el mínimo.

El problema en general con `specialValueText` es precisamente de que depende de que el valor sea el mínimo del _spin-box_: hay casos donde definir ese _valor mínimo_ no es sencillo o intuitivo (como rangos de valores del tipo (-∞, +∞)), y que, en nuestro caso concreto, al abrir el selector de fecha aparece seleccionada esa fecha de _hace mucho, mucho tiempo atrás_. Además, todo nuestro proyecto debe estar atento a que la fecha mínima no es una fecha válida, es _nula_, con la consiguiente complejidad añadida (¿qué pasa si cambiamos la fecha mínima porque cambian los requerimientos?).

Como dije al principio, la siguiente clase es una adaptación de `QDateEdit` que busca resolver estos problemas. Además, dado el caso de uso, sólo proporciona una versión con calendario desplegable. El único inconveniente que tiene es que no podemos usarla de forma 100% transparente respecto a la original, ya que algunos métodos no son virtuales, lo que implica que no son heredables. Así, en lugar de poder sustituir `date()` se ha tenido que añadir `dateOrNull()` que devuelve la fecha, si está seleccionada (como hace `date()`), o un `QDate` nulo en caso contrario.

Por último, un detalle de usabilidad: dado que una fecha _nula_ es realmente la fecha mínima, al desplegar el calendario se mostraría dicha fecha mínima (en nuestro caso fijada en 1900), con el consiguiente tedio de tener que movernos hasta una fecha algo _más_ reciente. Para evitar esto debemos actualizar el widget del calendario cuando se fije una fecha nula

El código completo viene siendo el siguiente:

```cpp
#include <qdatetimeedit.h>
#include <qcalendarwidget.h>

class QDateEditWithNull : public QDateEdit
{
  Q_OBJECT
  Q_PROPERTY(QDate dateOrNull READ dateOrNull WRITE setDate USER true)

public:
  explicit QDateEditWithNull(const QDate &date, QWidget *parent = nullptr) : QDateEdit(date, parent) {
    setSpecialValueText(tr("No date"));
    setMinimumDate(QDate(1900, 1, 1));
    setCalendarPopup(true);
  }
  explicit QDateEditWithNull(QWidget *parent = nullptr) : QDateEditWithNull({}, parent) {}
  virtual ~QDateEditWithNull() = default;

public:
  bool isNullDate(const QDate &date) const {
    return date.isNull() || date <= minimumDate();
  }

  // Replaces 'date()'
  QDate dateOrNull() const {
    const auto d = QDateEdit::date();
    return isNullDate(d) ? QDate() : d;
  }

protected:
  void setCalendarPopup(bool enable) {
    QDateEdit::setCalendarPopup(enable);

    if (calendarWidget()) {
      updateCalendarWidgetPage();

      connect(calendarWidget(), &QCalendarWidget::selectionChanged, [=]() { updateCalendarWidgetPage(); });
    }
  }

public slots:
  void clear() {
    setDate(minimumDate());
  }
  void setDate(const QDate &date) {
    QDateEdit::setDate(isNullDate(date) ? minimumDate() : date);
    setCalendarPopup(calendarPopup());
  }

private:
  void updateCalendarWidgetPage() {
    if (!calendarWidget()) { return; }

    if (isNullDate(calendarWidget()->selectedDate())) {
      calendarWidget()->setCurrentPage(QDate::currentDate().year(), QDate::currentDate().month());
    }
  }
};
```
