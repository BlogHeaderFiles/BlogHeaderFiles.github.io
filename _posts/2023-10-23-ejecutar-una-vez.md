---
title: Cómo llamar a una función una única vez
date: 2023-10-13T09:00:00+01:00
author: Carlos Buchart
layout: post
permalink: /2023/10/23/ejecutar-una-vez
image: /assets/images/featured/execute_once.jpg
excerpt: Estudiamos varias técnicas para restringir, de forma elegante, la ejecución de una función a una única vez.
categories: c++ initialization
---
## Introducción

Algunas veces es necesario tener funciones que han de llamarse una única vez en todo el ciclo de vida del proceso. El caso que más he visto es el de funciones de inicialización, tales como la configuración de un _framework_ de terceros, la definición de variables de entorno o la creación de zonas de memoria compartidas.

Como pasa muchas veces, C++ nos ofrece no una, sino muchas formas de resolver el problema: estudiemos algunas de ellas (_spoiler_, dejaré mi favorita para el final). Para facilitar las explicaciones, asumiremos que el código a ejecutar está encapsulado en una función llamada `init_once()` que debe ser llamada antes de que `execute_many()` se ejecute.

## Variable bandera

Seguramente la solución más sencilla, aunque no necesariamente la más eficiente, es crear una variable a modo de bandera de uso (inicializada a _false_), y cambiarla la primera vez que se llame a la función.

```cpp
namespace
{
    bool g_called{false};
}

void execute_many()
{
    if (!g_called) {
        init_once();
        g_called = true;
    }
    // ...
}
```

### Variante con variable estática

Personalmente prefiero limitar el alcance de las variables todo lo posible, por lo que cambiaremos esta bandera a una variable estática local. Recordad que una variable estática se crea una única vez y perdura durante toda la vida del proceso.

```cpp
void execute_many()
{
    static bool s_called{false};
    if (s_called) {
        init_once();
        s_called = true;
    }
    // ...
}
```

Si bien presentan una solución simple, queda la sutil posibilidad de que cambiemos el valor de la bandera por error (por ejemplo, si tenemos varias funciones de inicialización). El tema de la eficiencia claramente dependerá del contexto, aunque la gran mayoría de las veces no será un problema. Por último, estas soluciones podrían originar una condición de carrera y desembocar en una doble inicialización.

## `std::call_once`

C++11 introdujo una forma _estándar_ de resolver este problema, y que además es _thread-safe_. Como ya se dijo, las dos soluciones anteriores pecarían de crear condiciones de carrera, necesitando el uso de _mutex_ adicionales; el uso de `std::call_once` es equivalente pero mucho más limpio. Básicamente sigue el mismo modelo que la solución anterior: se asocia un _flag_ especial (_thread-safe_) a la función que queremos llamar una única vez:

```cpp
#include <mutex>

void execute_many()
{
    static std::once_flag s_once;
    std::call_once(s_once, init_once);
    // ...
}
```

## Uso de _singletons_

Otra posible solución es emplear un _singleton_. Un _singleton_ es un patrón de diseño que permite restringir la creación de objetos de una clase a una única instancia. Así, podemos utilizarlo para llamar a `init_once()` durante la construcción del mismo (y como la clase sólo se construye una vez, sólo se llamará a la función una única vez). Una ventaja de este método frente a los anteriores es que nos evitamos la comprobación de una bandera de estado para cada ejecución. Si la función `execute_many()` se llama de forma masiva, pues es una mejora que ganamos. En contrapartida, la función `execute_many` pasa a ser miembro del _singleton_.

Acá una implementación sencilla pero suficiente de un _singleton_ con inicialización única:

```cpp
class Singleton
{
public:
    Singleton& get_instance() {
        static Singleton s_singleton;
        return s_singleton;
    }

    void execute_many() { /* ... */ }

private:
    Singleton() {
        init_once();
    }
};

void foo()
{
    Singleton::get_instance().execute_many();
}
```

## Usando el operador de evaluación secuencial en la inicialización de una variable estática

La última solución que expondré es, para mí, la más limpia en términos de código generado, aunque requiere un poco más de conocimiento del lenguaje para poder entenderla. Expliquemos primero las partes que lo componen:

### Operador de evaluación secuencial

El operador de evaluación secuencial es una expresión del tipo _(e<sub>0</sub>, e<sub>1</sub>, ..., e<sub>n</sub>)_, donde las sub-expresiones _e<sub>i</sub>_ son evaluadas en orden y cuyo tipo y valor final corresponden a los de _e<sub>n</sub>_. Así, la siguiente expresión `auto x = (42.0f, "hola"s)` resultaría en `x` de tipo `std::string` y con valor `"hola"`. Si una de las sub-expresiones fuese una llamada a función, ésta se invocaría, independientemente del tipo de retorno de la misma, incluido `void`. Por otra parte, si una de las sub-expresiones lanza una excepción, las siguientes sub-expresiones no serían evaluadas.

```cpp
int a = 0;
std::cout << (a++, ++a, a) << std::endl;

try {
    (a++, throw std::exception{}, a--); // a-- is never called
} catch(...) {
    std::cout << "Exception" << std::endl;
}

std::cout << a << std::endl;
```

El resultado es:

```txt
2
Exception
3
```

Nótese que como son expresiones separadas, evaluadas secuencialmente, el uso del operador de post-incremento no se diferencia (en cuanto al resultado final) del de pre-incremento.

### Inicialización de variable estáticas

Por otro lado, las variables estáticas sólo se construyen una vez, y el estándar de C++ garantiza que la inicialización de una variable estática es _thread-safe_; es decir, si diversos hilos pasan concurrentemente por la inicialización de la variable, sólo uno de ellos, el primero, la efectuará, quedando los demás bloqueados hasta que finalice la inicialización.

### Ensamblando las partes

Con todo esto podemos construir una versión minimalista de nuestra solución, que garantizará que la función `init_once()` será llamada una única vez, de forma _thread-safe_ y sin comprobaciones innecesarias de banderas de estado.

```cpp
void execute_many()
{
    static const bool s_initialized = (init_once(), true);
    // ...
}
```

## Extendiendo la solución

El principio de responsabilidad única conlleva, por lo general, a descomponer nuestro código en clases y funciones con una finalidad más acotada. En el caso que nos ocupa hoy esto puede suponer aumentar el riesgo de que la función `init_once()` sea llamada desde diversos lugares, debiendo aplicar los mecanismos de protección expuestos más de una vez. Esto nos lleva al eterno dilema del programador: evitar duplicar código innecesariamente.

En términos generales, la solución pasa primero por limitar el acceso a la función en sí misma. Una primera forma de hacerlo es crear una clase cuya única razón de ser sea la de invocar a esta función:

```cpp
class InitOnceCaller
{
public:
    static void call_init_once()
    {
        static const bool s_initialized = (init_once(), true);
    }

private:
    static void init_once() { /* ... */ }
};
```

La contrapartida acá es que debemos pagar por una llamada a función adicional en caso de que el compilador no la haga _inline_.

En caso de que la función deba ser llamada únicamente desde un punto en concreto, podríamos mover `init_once()` a una lambda local.

```cpp
void execute_many()
{
    static const auto s_init_once = []() { /* ... */ };
    static const bool s_initialized = (s_init_once(), true);
}
```

## Conclusión

Se han presentado varias formas de abordar el problema de inicialización única, yendo desde la más obvia y sencilla, hasta la más completa (aunque sutilmente críptica para los menos entendidos en el lenguaje), pasando por opciones intermedias en cuanto a legibilidad y rendimiento.
