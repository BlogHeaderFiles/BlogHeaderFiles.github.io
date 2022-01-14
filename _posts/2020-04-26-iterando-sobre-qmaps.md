---
title: Iterando sobre QMaps
date: 2020-04-26T09:58:19+02:00
author: Carlos Buchart
layout: post
permalink: /2020/04/26/iterando-sobre-qmaps/
image: /assets/images/featured/iterating_qmaps.jpg
excerpt: 'Un pequeño análisis de distintas formas de recorrer los elementos de un QMap, y cómo se comparan dichos bucles con los del contenedor estándar de C++.'
---
Los que trabajáis normalmente con Qt me entenderéis la siguiente expresión: en lo que respecta a contenedores de datos (bueno, y en muchos otros también), Qt es casi un lenguaje propio, sigue su propia filosofía y adapta C++ a ella. Por ejemplo:

- Uso extensivo del COW ([_Copy-On-Write_](https://es.wikipedia.org/wiki/Copy-on-write)) para reducir la carga asociada a la copia de objetos.
- Compatibilidad parcial con los contenedores de la biblioteca estándar y sus algoritmos (por ejemplo, el método `size` de todos los contenedores Qt devuelve un entero con signo, en lugar de un `size_t` como hacen los contenedores estándar). Esto se ve además en cantidad de métodos duplicados para ser compatibles con algoritmos de la biblioteca estándar (véase `QList::push_back` y `QList::append`).
- Compatibilidad parcial con nuevas características del lenguaje (entendible en parte porque Qt 5.0 estaba ya madura cuando se terminó el estándar de C++11, por lo que oficialmente todavía soportan compiladores más antiguos). Ejemplo de ello es la carencia en muchos lugares de constructores `move` (usan COW en su lugar), o el cuidado que hay que tener al cambiar el famoso `Q_FOREACH` a los nuevos _range-for_ de C++11.
- No todos los contenedores Qt son equivalentes a los estándar. Así, mientras `QVector` y `std::vector` son contenedores similares, `QList` no tiene equivalente en la biblioteca estándar, y Qt no tiene un equivalente a `std::set` (y no, `QSet` no lo es ya que no garantiza el orden de los elementos).

Una comparación exhaustiva puede encontrarse en [Clean Qt](https://www.cleanqt.io/blog/exploring-qt-containers) y [Marc Mutz](https://marcmutz.wordpress.com/effective-qt/containers/) (ambos en inglés).

En este artículo voy a describir un escenario con el que me topo cotidianamente: iterar sobre un contenedor tipo mapa, y compararé cómo hacerlo con un `std::map` y con un `QMap`, aunque en general son análogas con otros tipos de mapas como los `std::unordered_map` y `QHash` (con la salvedad de los tiempos de búsqueda de elementos).

### `std::map`

#### Usando iteradores con `std::map`

Complejidad O(n). Cambiar `begin`/`end` por `cbegin`/ `cend` para inmutables.

```cpp
for (auto it = std_map.begin(); it != std_map.end(); ++it) {
  std::cout << it.first << ' ' << it.second << '\n';
}
```

#### Usando _range-for_ con `std::map`

Complejidad O(n). Añadir `const` a `elem` para inmutables.

```cpp
for (auto& elem : std_map) {
  std::cout << elem.first << ' ' << elem.second << '\n';
}
```

### `QMap`

#### Usando iteradores con `QMap`

Complejidad O(n). Cambiar `begin`/`end` por `cbegin`/ `cend` para inmutables.

```cpp
for (auto it = qmap.begin(); it != qmap.end(); ++it) {
  qDebug() << it.key() << it.value();
}
```

#### Usando la forma _Java_

Complejidad O(n). Usar `QMutableMapIterator` para mutables.

```cpp
QMapIterator<tipo_clave, tipo_valor> it(qmap);
while (it.hasNext()) {
  it.next();
  qDebug() << it.key() << it.value();
}
```

Es posible hacer más genérica la declaración del iterador mediante el uso de `decltype` y no tener que conocer a priori los tipos de la clave y el valor:

```cpp
QMapIterator<decltype(qmap)::key_type, decltype(qmap)::mapped_type> it(qmap);
```

#### Usando _range-for_ con `QMap`

Complejidad O(n). Añadir `const` a `elem` para inmutables.

```cpp
for (auto& elem : qmap) {
  qDebug() << elem;
}
```

Lo malo es que con esta sintaxis sólo se itera sobre los valores, no hay forma de obtener la clave asociada. Existen opciones para lograrlo pero que aumentan la complejidad:

##### Iterar sobre las claves

```cpp
for (const auto& key : qmap.keys()) {
  qDebug() << key << qmap[key];
}
```

El problema es que en ninguna parte se garantiza que la lista de claves se extraiga en tiempo constante, además de tener que buscar cada elemento por separado. Complejidad O(nlogn) en el mejor caso.

##### Convertir a `std::map`

```cpp
for (auto& elem : qmap.toStdMap()) {
  qDebug() << elem.first << elem.second;
}
```

Obviamente el gran problema es que hay que construir un `std::map` temporal (iterando sobre cada elemento e insertándolo en el nuevo mapa). Complejidad O(nlogn) en el mejor caso.

##### Iteradores compatibles con STL

A partir Qt 5.10 `QMap` provee los métodos [`keyValueBegin`](https://doc.qt.io/qt-5/qmap.html#keyValueBegin) y [`keyValueEnd`](https://doc.qt.io/qt-5/qmap.html#keyValueEnd) que retornan un iterador similar a los usados por la STL. Desafortunadamente, al menos hasta la última versión estable al día de escribir este artículo (Qt 5.14.2), estos iteradores no sobrecargan el operador `->`. Complejidad O(n).

```cpp
for (auto it = qmap.keyValueBegin(); it != qmap.keyValueEnd(); ++it) {
  qDebug() << (*it).first << (*it).second;
}
```

### Iterando sobre `QMap` usando el _range-for_

Particularmente la sintaxis del _range-for_ es la que más me gusta para casi cualquier contenedor (especialmente con la introducción de los [rangos](https://itnext.io/a-little-bit-of-code-c-20-ranges-c6a6f7eae401) en C++20 y los [_init-statements_](https://en.cppreference.com/w/cpp/language/range-for)), así que me encantaría poder usarla con los `QMap` de forma natural y eficiente.

Hace un par de meses publiqué un artículo como invitado en [Fluent C++](https://www.fluentcpp.com/2020/02/11/reverse-for-loops-in-cpp/) acerca del uso de bucles `for` en reversa usando la sintaxis de los _range-for_. Usando una técnica similar se puede obtener el resultado esperado:

```cpp
for (auto elem : qmap_wrapper(qmap)) {
  qDebug() << elem.first << elem.second;
}
```

#### A partir de Qt 5.10

Haciendo uso de los iteradores compatibles con STL, el _wrapper_ sería:

```cpp
template<class K, class V>
struct qmap_wrapper {
  using map_t = QMap<K, V>;
  using iterator_t = typename map_t::key_value_iterator;

  map_t& map;

  qmap_wrapper(map_t& map_) : map{map_} {}

  iterator_t begin() { return map.keyValueBegin(); }
  iterator_t end() { return map.keyValueEnd(); }
};
```

#### Antes de Qt 5.10

Pues la forma más sencilla es copiando la definición de la clase `QKeyValueIterator` introducida en Qt 5.10 y adaptar el _wrapper_ que hicimos antes:

```cpp
// Iterator copied from Qt 5.14.2
template<typename Key, typename T, class Iterator>
class QKeyValueIterator
{
public:
  typedef typename Iterator::iterator_category iterator_category;
  typedef typename Iterator::difference_type difference_type;
  typedef std::pair<Key, T> value_type;
  typedef const value_type *pointer;
  typedef const value_type &reference;

  QKeyValueIterator() = default;
  Q_DECL_CONSTEXPR explicit QKeyValueIterator(Iterator o) noexcept(std::is_nothrow_move_constructible<Iterator>::value)
    : i(std::move(o)) {}

  std::pair<Key, T> operator*() const {
    return std::pair<Key, T>(i.key(), i.value());
  }

  friend bool operator==(QKeyValueIterator lhs, QKeyValueIterator rhs) noexcept { return lhs.i == rhs.i; }
  friend bool operator!=(QKeyValueIterator lhs, QKeyValueIterator rhs) noexcept { return lhs.i != rhs.i; }

  inline QKeyValueIterator &operator++() { ++i; return *this; }
  inline QKeyValueIterator operator++(int) { return QKeyValueIterator(i++);}
  inline QKeyValueIterator &operator--() { --i; return *this; }
  inline QKeyValueIterator operator--(int) { return QKeyValueIterator(i--); }
  Iterator base() const { return i; }

private:
  Iterator i;
};
```

```cpp
// Wrapper adapted to pre-5.10 QMap
template<class K, class V>
struct qmap_wrapper {
  using map_t = QMap<K, V>;
  using iterator_t = QKeyValueIterator<K, V, typename map_t::iterator>;

  map_t& map;

  qmap_wrapper(map_t& map_) : map{map_} {}

  iterator_t begin() { return iterator_t{map.begin()}; }
  iterator_t end() { return iterator_t{map.end()}; }
};
```

El código completo de este artículo está disponible en [GitHub](https://github.com/BlogHeaderFiles/SourceCode/tree/master/IteratingQMap).

_Créditos:_ este artículo fue inspirado por [esta entrada de Stack Overflow](https://stackoverflow.com/q/8517853/1485885), donde se detallan diversas formas de iterar sobre un `QMap`, con excelentes comentarios acerca de su rendimiento, ventajas y desventajas.
