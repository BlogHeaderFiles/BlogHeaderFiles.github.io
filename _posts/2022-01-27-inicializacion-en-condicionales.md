---
title: Inicialización en condicionales
date: 2022-01-27T23:15:00+01:00
author: Carlos Buchart
layout: post
permalink: /2022/01/27/inicializacion-en-condicionales
image: /assets/images/featured/init_statement.jpg
excerpt: Estudiamos el uso de inicializaciones en condicionales y las ventajas que ello supone.
categories: c++
---
De toda la vida hemos oído que debemos evitar las asignaciones en expresiones booleanas, ya que pueden ser fácilmente confundidas con comparaciones, queda la duda de la intención real del programador y se presta a errores. ¿Qué significado tiene cada una de las siguientes sentencias?

```cpp
if (value == 0) { ... }
if (value = 0) { ... }
```

En el primer caso está claro que verificamos que `value` sea cero. Pero en el segundo resulta que nunca evaluaremos a verdadero, ya que primero se asigna el 0 y luego se evalúa la expresión a diferente de cero, siendo equivalente a:

```cpp
value = 0;
if (value) { ... }
```

Es cierto que muchos compiladores nos alertarán y cualquier analizador estático lo mismo, pero si podemos evitarlo, ¿por qué ponerlo?

## Declaración en condicionales

Ahora bien, hay una variante de este caso que, al contrario que su _primo malvado_, resulta muy útil: una declaración en la expresión condicional. A primera vista parecen muy similares, pero la diferencia es radical. Veamos primero un ejemplo:

```cpp
// ...
if (auto image = load_image()) { ... }
// ...
```

En esta sentencia estamos declarando una variable `image`, a la que asignamos un valor y luego se evalúa la expresión (como diferente de falso, cero o `nullptr`, según corresponda). Es decir, es _casi_ equivalente a decir:

```cpp
// ...
auto image = load_image();
if (image) { ... }
// ...
```

Y digo _casi_ porque la principal diferencia entre esta sintaxis y la de asignación es precisamente en que declara la variable _únicamente dentro el ámbito del condicional_: la variable sólo existe dentro del `if` (y del `else` si lo hubiera). Es decir, que la primera expresión de esta sección realmente correspondería con:

```cpp
// ...
{
    auto image = load_image();
    if (image) { ... }
} // 'image' doesn't exist outside the scope of this block
// ...
```

_Nota: esta sintaxis no requiere del uso de `auto`, solamente que en muchas ocasiones facilita la lectura del código._

### Ventajas

¿Qué nos aporta esta sintaxis? Primero, claridad: no hay manera de confundir una declaración con una expresión condicional, ya que lo segundo no sería una sintaxis válida: `if (auto value == 42)` simplemente no compilaría.

Segundo (aunque depende de cada caso) simplifica el código, ya que no tenemos que crear variables con nombres extraños solamente para que no colisionen los nombres:

```cpp
if (auto image = load_image()) { ... }
if (auto image = load_gray_image()) { ... }
```

Tercero, y para mí el más importante, nos protege las espaldas de posibles usos indebidos. Por ejemplo, en el siguiente fragmento comprobamos que `ptr` no sea nulo, pero tenemos que tener cuidado de no usarlo fuera de dicha comprobación:

```cpp
auto ptr = create_printer();
if (ptr) { ptr->load_document(); }
// ...
ptr->print(); // < 'ptr' may be null
```

En cambio, con esta sintaxis, es el propio compilador el que nos avisa con un fallo de compilación, ya que la variable no existe fuera del `if`. Es una de esas grandes ventajas de los lenguajes compilados: con poco esfuerzo podemos detectar y solucionar muchos problemas en el código antes de que se manifiesten por primera vez en ejecución, y sin necesidad de hacer pruebas unitarias para ello.

Otro ejemplo de uso sería el de desreferenciar un `std::weak_ptr`. El método `std::weak_ptr<>::lock` devuelve `nullptr` si no ha sido posible obtener una referencia:

```cpp
void foo(std::weak_ptr<Object> weak)
{
    if (auto obj = weak.lock()) { ... }
}
```

## Declaración y comparación

C++17 introduce una nueva mejora a esta sintaxis, que la hace mucho más flexible aún. En su primera aparición, declarábamos la variable y la condición quedaba implícita en diferente de cero, verdadero, diferente de nulo. Con esta sintaxis extendida podemos agregar una expresión adicional que será la que se evalúe para decidir el condicional:

```cpp
if (auto it = map.find(key); it != map.end()) { ... }
```

Así, al igual que antes, declaramos y asignamos `it` dentro el ámbito del condicional, pero la expresión a evaluar es `it != map.end()`, lo que enriquece y facilita el uso de esta nueva sintaxis en más sitios aún.

### Ñapa

_En Venezuela, en donde nací, una ñapa (añadidura) es un regalo que nos hace un vendedor, por ejemplo, al comprar 500gr de queso nos da 30gr gratis de ñapa._

Como _ñapa_ quiero comentar una mejora de sintaxis que introduce C++20 sobre los _range-for_ de C++11. Recordemos que un _range-for_ es un bucle del tipo:

```cpp
for (auto value : container) { ... }
```

Ahora bien, si queremos, además de iterar sobre los elementos, hacer un conteo de los mismos, hasta antes de C++20 teníamos que recurrir o bien a los `for` tradicionales, o bien a algo como:

```cpp
size_t i = 0;
for (auto value : container) {
    ...
    ++i;
}
```

En C++20 se introducen las _inicialiaciones adicionales_, pudiendo hacer:

```cpp
for (size_t i = 0; auto value : container) {
    ++i;
}
```

Para más información de este caso, otros usos y alternativas podéis consultar [esta entrada en Stack Overflow](https://stackoverflow.com/a/60209974/1485885).

## Conclusiones

Commo hemos visto, esta sintaxis permite limitar el alcance de una variable, limitándola al entorno _seguro_ que le hemos definido, evitando además que se use para varios propósitos. Su uso es recomendado en los [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#es6-declare-names-in-for-statement-initializers-and-conditions-to-limit-scope) (lectura prácticamente obligatoria para mejorar en el lenguaje).
