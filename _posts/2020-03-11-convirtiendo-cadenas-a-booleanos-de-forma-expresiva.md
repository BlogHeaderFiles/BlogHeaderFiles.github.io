---
title: Convirtiendo cadenas a booleanos de forma expresiva
date: 2020-03-11T08:00:09+01:00
author: Carlos Buchart
layout: post
permalink: /2020/03/11/convirtiendo-cadenas-a-booleanos-de-forma-expresiva/
excerpt: Detallamos algunas posibles mejoras en la expresividad del código al transformar cadenas de texto a booleanos.
categories: c++ expressiveness clean-code
---
Al almacenar y recuperar valores desde un JSON, XML o cualquier otra notación de datos, es frecuente encontrarnos con la necesidad de convertir booleanos a cadenas y viceversa. En términos generales no es una operación complicada, y seguramente nos hagamos un par de funciones de ayuda similares a la siguientes:

```cpp
std::string bool2string(bool value)
{
  return value ? "true" : "false";
}

bool string2bool(const std::string &value)
{
  return value == "true";
}
```

Ahora, supongamos que, para facilitar la lectura del fichero de datos, y para ser más expresivos en su contenido, en lugar de `"true"` y `"false"`, elegimos `"yes"` / `"no"`, `"show"` / `"hide"`, `"enabled"` / `"disabled"`, etc. Nuestras funciones se complican entonces un poco:

```cpp
std::string bool2string(bool value, const std::string &true_str, const std::string &false_str)
{
  return value ? true_str : false_str;
}

bool string2bool(const std::string &value, const std::string &true_str)
{
  return value == true_str;
}
```

La interfaz del nuevo `string2bool` obvia el `false_str` por simplicidad: si no es el `true_str` pues será el `false_str`, ¿no? Bueno, esto es cierto salvo que queramos validar la integridad del fichero, pero muchas veces para valores booleanos nos conformamos con saber uno de los dos casos, el otro cae por omisión.

## Controlando valores por defecto

Ahora bien, imaginemos que nuestro campo booleano debe valer `true` por defecto, es decir, incluso si no está presente:

```cpp
bool value = true;
const std::string value_str = /* read from JSON, XML... */;
if (!value_str.empty()) value = string2bool(value_str, "enabled");
```

En este caso, el campo es `false` si el valor del campo no es ni vacío ni `"enabled"`. Esto implica que si por cualquier motivo el campo adquiere el valor `"yes"` o `"enabeld"` (por algún error en nuestro código, modificación manual, una API desactualizada, un error en la aplicación cliente...), ¡pues nuestro campo pasaría a tener el valor `false` en lugar del valor por defecto `true`!

Una solución a este caso sería el de verificar más bien que el campo _no_ tenga el valor para `false` (`"disabled"` en el ejemplo), y en cualquier otro tendría el valor por defecto (`true`):

```cpp
const std::string value_str = /* read from JSON, XML... */;
const bool value = !string2bool(value_str, "disabled");
```

El problema de este enfoque es que hay que leer detenidamente el código para no interpretar erróneamente la conversión.

## Mejorando la expresividad del código

La siguiente versión de `string2bool` permite indicar de una forma expresiva la intención del programador (requiere C++17):

```cpp
struct TrueValue
{
  const std::string true_str;
};
struct FalseValue
{
  const std::string false_str;
};

template<typename T>
bool string2bool(const std::string &str, T &&value)
{
  constexpr bool is_true_exp = std::is_same_v<T, TrueValue>;
  constexpr bool is_false_exp = std::is_same_v<T, FalseValue>;

  if constexpr (is_true_exp) return str == value.true_str;
  if constexpr (is_false_exp) return str != value.false_str;

  static_assert(is_true_exp || is_false_exp, "'value' must be of either TrueValue or FalseValue types");
}
```

Igual que en el último caso, la usaríamos contra el valor contrario al por defecto, pero de una forma mucho más documentada:

```cpp
const std::string value_str = /* read from JSON, XML... */;
const bool value = string2bool(value_str, FalseValue{"disabled"});
```

## Explicación rápida

Desde C++17 es posible usar condicionales evaluados en tiempo de compilación ([`if constexpr`](https://arne-mertz.de/2017/03/constexpr-additions-c17/)) de forma que el compilador es capaz de generar código a partir de una condición dada. En el código antes expuesto se usa para generar tres versiones de la función `string2bool`: una para `TrueValue`, una para `FalseValue` y una versión que emitirá un error de compilación si no se usa uno de estos dos tipos válidos. Esto es posible mediante el _trait_ [`std::is_same_v`](https://en.cppreference.com/w/cpp/types/is_same) el cual indica si dos tipos son idénticos.

El código completo de la solución final está disponible en [GitHub](https://github.com/BlogHeaderFiles/SourceCode/tree/master/string2bool) y en [Coliru](https://coliru.stacked-crooked.com/a/e830d4fb94163bb6).
