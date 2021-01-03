---
title: Un cuadro de búsqueda simple y en tiempo real
date: 2019-06-13T08:38:58+02:00
author: Carlos Buchart
layout: post
permalink: /2019/06/13/cuadro-de-busqueda/
categories:
  - programación
tags:
  - C++
  - Qt
---
Un caso de uso recurrente en muchas aplicaciones es la de tener un conjunto de entradas, posiblemente visualizadas en una tabla, y tener que realizar una búsqueda sobre dichos datos. Si la búsqueda ha de soportar diversas opciones tales como filtrar por fecha, rangos de valores, escoger tipo de envío, campos en los que se buscará, etc., pues seguramente haya que diseñar una ventana específica que cumpla dichos requerimientos. Pero muchas otras veces bastará con un pequeño cajetín de texto donde el usuario escriba lo que desea y el listado de entradas se actualice acorde (y preferiblemente en caliente, conforme se va escribiendo). ¡Vamos a ello!

El código completo de este ejemplo está disponible en [GitHub](https://github.com/cbuchart/HeaderFiles.com/tree/master/Basic_search_box). Esta vez el ejemplo ha sido programado usando Qt Creator, por dar algo de variedad ;)


# Requerimientos

- Mostrar un listado de nombres y apellidos.
- Proporcionar un mecanismo de filtrado en tiempo real.


# Interfaz gráfica

La forma tradicional de mostrar información en listas, tablas y árboles en Qt es mediante el patrón [modelo-vista-controlador](https://doc.qt.io/qt-5/model-view-programming.html) o MVC. Qt proporciona diversos widgets y clases para ello, donde los primeros heredan de [`QAbstractItemView`](https://doc.qt.io/qt-5/qabstractitemview.html) y los modelos de [`QAbstractItemModel`](https://doc.qt.io/qt-5/qabstractitemmodel.html).

En otro momento profundizaremos en esto del MVC en Qt, de momento resumir que también existe un widget especial llamado [`QListWidget`](https://doc.qt.io/qt-5/qlistwidget.html) que combina un `QListView` y un modelo de lista básico (con soporte para cadenas de texto y poco más). Usaremos este `QListWidget` para nuestro listado de nombres.

```cpp
ui->listWidget->addItem("Denis Ritchie");
ui->listWidget->addItem("Bill Gates");
ui->listWidget->addItem("Steve Jobs");
ui->listWidget->addItem("Linus Torvald");
ui->listWidget->addItem("Haavard Nord");
ui->listWidget->addItem("Eirik Chambe-Eng");
ui->listWidget->sortItems();
```

Para el filtrado usaremos un [`QLineEdit`](https://doc.qt.io/qt-5/qlineedit.html). Particularmente me gusta poder prescindir de etiquetas de texto cuando resultan claramente innecesarias, o cuando cumplen su función durante un período de tiempo determinado. Un mecanismo de UI usado para esto son los _placeholder texts_, que se muestran únicamente mientras el control no tiene uso (no tiene texto en el caso del `QLineEdit`).

```cpp
ui->txtSearch->setPlaceholderText("Search...");
```

![todo](/assets/images/search_ui.png)


# Buscando...

Por lo que respecta a esta publicación, nos quedaremos en una búsqueda simple, donde se buscará que el texto escrito sea parte del nombre (obviando diferencias entre mayúsculas y minúsculas). Una función más compleja dividiría la cadena de texto en _tokens_ a buscar, aceptaría operadores lógicos, etc.

Para lograr el _efecto_ de filtrado simplemente marcamos como ocultos aquellos ítems que no cumplen con el criterio de búsqueda.

```cpp
void MainWindow::search(const QString&amp; text)
{
  for (int ii = 0; ii < ui->listWidget->count(); ++ii) {
    const auto item_text = ui->listWidget->item(ii)->text();
    const bool matches = item_text.contains(text, Qt::CaseInsensitive);
    ui->listWidget->item(ii)->setHidden(!matches);
  }
}
```

Y conectamos el cajetín de texto con la función de búsqueda mediante la señal `QLineEdit::textChanged`, la cual se emite cada vez que se modificar el contenido del control (es decir, la lista se irá actualizando en tiempo real conforme se vaya escribiendo).

```cpp
connect(ui->txtSearch, &amp;QLineEdit::textChanged, this, &amp;MainWindow::search);
```

Existe otra señal similar en `QLineEdit`: `QLineEdit::textEdited`. La diferencia principal está en que ésta se emite cuando el texto se cambar _por acción directa del usuario_, mientras que `QLineEdit::textChanged` se emite tanto cuando el usuario escribe como cuando el valor se cambia programáticamente. Veremos mejor la diferencia en el siguiente apartado.

_Advertencia: el método de búsqueda en sí no es el más eficiente, simplemente sirve de caja negra para ejemplificar la función "buscar"._


# Botón borrar

Es bastante común ofrecer al usuario una forma rápida de eliminar el filtro creado, de _borrar_ el criterio de búsqueda. `QLineEdit` ofrece una propiedad, [`QLineEdit::clearButtonEnabled`](https://doc.qt.io/qt-5/qlineedit.html#clearButtonEnabled-prop) que, cuando está activada, muestra un pequeño botón de _borrar_ en un extremo del control.

![todo](/assets/images/qlineedit_clear_button.png)

Al presionarse el botón de borrar se llama automáticamente a `QLineEdit::clear`, que borra el texto del cajetín. Puede ya verse el porqué nos conectamos con la señal `QLineEdit::textChanged` y no con `QLineEdit::textEdited`: de haberlo hecho, al presionar el botón se borraría el texto pero no se mostrarían las entradas ocultas.

Como nota, el método `QString::contains` devuelve `true` si la cadena a buscar es vacía, lo cual lleva a que al borrar todo el texto se muestren todas las entradas de la lista, ideal ¿no?


## Estilo visual

Para terminar esta entrada, vamos a modificar el botón de borrar, que personalmente me parece bastante feo. Dicho icono está controlado por el estilo activo a través del icono estándar `SP_LineEditClearButton`. Usaremos un estilo _proxy_ para evitar diseñar nosotros un estilo desde cero y además añadiremos un par de retoques usando una hoja de estilo. (Para más información sobre los `QProxyStyle` se puede consultar [este otro artículo](introduccion-a-los-qproxystyle/)).

```cpp
virtual QIcon standardIcon(StandardPixmap standard_icon, const QStyleOption* option,
                           const QWidget* widget) const override {
  if (standard_icon == SP_LineEditClearButton) return m_clear_icon;
  return QProxyStyle::standardIcon(standard_icon, option, widget);
}
```

Como comentario al diseñador, es importante saber que el icono ocupará todo el alto del `QLineEdit`, por lo que deben agregarse unos márgenes adecuados si no se quiere que se vea de borde a borde.

![todo](/assets/images/qlineedit_clear_button_custom.png)

Créditos: el icono de borrar fue diseñado por [CC 3.0 BY](http://creativecommons.org/licenses/by/3.0/).

# Mejorando el motor de búsqueda
Hemos visto cómo diseñar rápidamente una búsqueda _al vuelo_. La implementación mostrada es suficiente para conjuntos de datos no demasiado grandes y sólo permite una búsqueda _textual_.


## Dar flexibilidad a la búsqueda

En el ejemplo dado, si busco "bill g" me mostrará "Bill Gates", pero si busco "jobs steve" no me dará ninguna coincidencia. Una forma de solucionarlo es extraer los diferentes _tokens_ de búsqueda, por ejemplo:

```cpp
QStringList splitSearchString(QString pattern)
{
  // Posibles delimitadores: cambiar a espacios
  pattern.replace(QRegExp("[.,;:]+"), " ");

  return pattern.split(' ', QString::SkipEmptyParts); 
}

void MainWindow::search(const QString&amp; text)
{
  const auto tokens = splitSearchString(text);
  
  for (int ii = 0; ii < ui->listWidget->count(); ++ii) {
    bool matched = true;
    for (const auto&amp; token : tokens) {
      if (!ui->listWidget->item(ii)->text().contains(token, Qt::CaseInsensitive)) {
        matched = false; // debe haber una coincidencia con todos los tokens
        break;
      }
    }
    ui->listWidget->item(ii)->setHidden(!matched);
  }
}
```


## Tablas

En el ejemplo se ha usado una lista para mostrar los datos. En caso de usar una tabla el procedimiento es similar sólo que, adicionalmente, habría que recorrer cada una de las columnas buscando coincidencias. Acá entra en juego entonces: saber sobre qué columnas se buscará, si se busca todo el texto o sólo una coincidencia parcial, si todos los _tokens_ de búsqueda han de tener correspondencia (*and* lógico), etc.


## Mejoras adicionales

Algunas posibles optimizaciones y mejoras que quedan fuera del ámbito de este artículo son:

- Normalmente una búsqueda progresiva tiende a restringir cada vez más el conjunto de datos, por lo que es un desperdicio de tiempo re-evaluar ítems que ya han sido descartados. Una posible optimización es la de obviar los ítems que ya están ocultos, salvo en el caso de que el patrón de búsqueda se haya relajado (por simplificarlo: que el texto ahora tenga menos caracteres).
- Flexibilidad al buscar caracteres con [signos diacríticos](https://es.wikipedia.org/wiki/Signo_diacr%C3%ADtico) (en cristiano: con tilde). El algoritmo presentado hasta ahora necesita una coincidencia exacta en los caracteres, así si estamos buscando "Jose" se descartarán entradas como "José". Una posible solución es usar expresiones regulares en el patrón de búsqueda que tomen esto en cuenta, o _aplanar_ tanto el patrón de búsqueda como el texto de los ítems, de forma que ninguno de los dos tengan tildes (o diéresis, o virgulillas, etc).