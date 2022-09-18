---
title: Argumentos expresivos (tipos fuertemente tipados, parte 2)
date: 2021-07-06T11:30:00+01:00
author: Carlos Buchart
layout: post
permalink: /2021/07/06/expressive-args-2/
image: /assets/images/featured/expressive_args.jpg
excerpt: En esta segunda entre generalizamos para más tipos de datos la solución propuesta anteriormente.
---
Se suele decir que lo más difícil de la programación no es escribir código, es leerlo. Y los que hemos trabajado con bases de código de varios lustros de edad lo sabemos muy bien: funciones que tenemos que leer durante un par de horas para saber qué hacen, cómo lo hacen, sus precondiciones, sus casos borde, sus efectos colaterales. Muchas veces tenemos que pasar por largas sesiones de depuración paso a paso y refactorización para descifrar ese método que otro (¿nosotros?) escribió hace años (¿meses? ¿semanas?). Para más información sobre el trabajo con código legado recomiendo [esta lectura](https://www.fluentcpp.com/2019/02/01/the-legacy-code-programmers-toolbox-is-out/).

La mejor forma de resolver este problema es evitarlo: escribir código que no sólo ha de ser ejectuado por un ordenador sino que ha de ser leído por un ser humano. La expresividad del código es un tema que desde hace unos años me viene apasionando más y más, ya que muchas veces con muy poco esfuerzo es posible mejorar la calidad, legibilidad y mantenibilidad del código drásticamente. Y casi siempre sin añadir _overhead_ a nuestro proyecto.

En esta entrega extenderemos lo expuesto [a comienzos de año](https://headerfiles.com/2021/02/07/expressive-args/) a más tipos de datos de una forma muy sencilla.

## Argumentos booleanos expresivos

Para refrescar, comentábamos que podíamos crear un tipo booleano con un propósito específico, que no fuera convertible implícitamente, y por lo tanto de forma oculta a nuestros ojos:

```cpp
struct TrueFalse
{
  const bool value;

  explicit TrueFalse(bool value) : value{value} {}
  explicit TrueFalse(int value) = delete;
  explicit TrueFalse(const void* value) = delete;
  explicit TrueFalse(double value) = delete;

  operator bool() const { return value; }
};
#define DEF_TRUE_FALSE(name) struct name : TrueFalse { using TrueFalse::TrueFalse; }

DEF_TRUE_FALSE(ReadOnly);
```

## Generalización

Basándonos en esta solución es posible generalizar parte de la clase para soportar cualquier tipo de dato (aprovecharemos de extender algunas funcionalidades y de mejorar el código)

```cpp
template<typename T>
class StrongType
{
  T value;

public:
  explicit StrongType(T value) noexcept : value{value} {}

  StrongType(const StrongType &other) noexcept : value{other.value} {}
  StrongType(StrongType &&other) noexcept : value{std::move(other.value)} {}

  StrongType<T> &operator=(const StrongType &other)
  {
    value = other.value;
    return *this;
  }
  StrongType<T> &operator=(StrongType &&other)
  {
    value = std::move(other.value);
    return *this;
  }

  operator T() const { return value; }
};

#define DEF_STRONG_TYPE(name, Type) class name : public StrongType<Type> { using StrongType::StrongType; }
#define DEF_TRUE_FALSE(name) DEF_STRONG_TYPE(name, bool)
```

Por último, podemos extender esta funcionalidad aún más definiendo un literal de usuario para construir el tipo de dato. Es importante tener en cuenta las [limitaciones de este operador](https://en.cppreference.com/w/cpp/language/user_literal) respecto a los tipos de datos soportados, ya que es probable que tengamos que forzar un _casting_ si nuestro tipo de datos usa valores con menor rango.

```cpp
DEF_STRONG_TYPE(Kilometers, long double);
inline Kilometers operator""_km(long double value) { return Kilometers{value}; }

const auto distance = 42.0_km;
```

Podéis encontrar el ejemplo completo y ejecutable en [Coliru](http://coliru.stacked-crooked.com/a/3ec753ba6d3c9b7b).
