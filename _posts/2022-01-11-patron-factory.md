---
title: Patrón Factory
date: 2022-01-11T01:10:00+01:00
author: Carlos Buchart
layout: post
permalink: /2022/01/11/patron-factory
image: /assets/images/featured/factory.jpg
excerpt: Explicamos una implementación del patrón factory basada en templates.
categories: c++ patterns
---
## Introducción

El [patrón _factory_](https://es.wikipedia.org/wiki/Factory_Method_(patr%C3%B3n_de_dise%C3%B1o)) nos permite la creación de objetos de un subtipo concreto. Entre las diversas ventajas de este patrón, resaltaré dos:

- Evita exponer la implementación de los subtipos.
- Permite diferir la elección del subtipo al tiempo de ejecución, por ejemplo, basándose en un identificador de tipo.

## Implementación

Para ilustrar este patrón de diseño expondré cómo podemos crear una factoría de formas geométricas. A saber, el cliente tiene expuestos los ficheros `shape.h` (donde se declara una interfaz `IShape` que cumplirán todos los objetos) y `factory.h` (donde se define la función factoría que creará dichos objetos). Los subtipos específicos no están expuestos a los clientes; para construirlos hay que invocar a la función factoría `make_shape` con el identificador del tipo deseado: `triangle`, `square`, `circle`.

```cpp
std::unique_ptr<IShape> make_shape(std::string const& id);

// ...
auto triangle = make_shape("triangle");
```

### Propuesta inicial

Una primera aproximación sería definir el método `make_shape` _a pelo_, listando todas los subtipos soportados:

```cpp
#include "factory.h"
#include "Triangle.h"
#include "Square.h"
#include "Circle.h"

std::unique_ptr<IShape> make_shape(std::string const& id)
{
    if (id == "triangle") { return std::make_unique<Triangle>(); }
    if (id == "square") { return std::make_unique<Square>(); }
    if (id == "circle") { return std::make_unique<Circle>(); }
    return nullptr;
}
```

### Primera mejora: extracción del ID

Esta implementación básica es suficiente para cubrir las necesidades más inmediatas. Vamos a buscarle el primer _pero_: el identificador del tipo no debería estar en la factoría, sino con el tipo. De este modo si el identificador se necesita en otro lugar (construcción de un JSON, datos de depuración o log, etc.), no habría que duplicarlo.

Supongamos que se establece que todas las sub-clases de `IShape` deben definir un método estático `id()` que nos devuelva el ID del objeto. De esta forma podríamos tener un código más independiente:

```cpp
std::unique_ptr<IShape> make_shape(std::string const& id)
{
    if (id == Triangle::id()) { return std::make_unique<Triangle>(); }
    if (id == Square::id()) { return std::make_unique<Square>(); }
    if (id == Circle::id()) { return std::make_unique<Circle>(); }
    return nullptr;
}
```

Esto mejora mucho la parte del ID, pero nos deja ahora el segundo _pero_: la duplicación de código.

### Segunda mejora: automatizar la factoría

La duplicación de código antes mencionada puede ser evitada mediante un proceso que se llama _registro de clases_. En éste se asocian los ID de las clases con un método creador, de forma que dicho método puede ser usado _a posteriori_. Para ello crearemos una clase _privada_ `ShapeFactory` que llevará un registro de todas las clases soportadas:

```cpp
class ShapeFactory
{
public:
    ShapeFactory()
    {
        register_class<Triangle>();
        register_class<Square>();
        register_class<Circle>();
    }

    std::unique_ptr<IShape> make(std::string const& id) const
    {
        auto it = m_creators.find(id);
        if (it == m_creators.end())
        {
            // ID not found
            return nullptr;
        }

        return it->second();
    }

private:
    template<class T>
    void register_class()
    {
        m_creators.emplace(T::id(), []() { return std::make_unique<T>(); });
    }

    std::map<std::string, std::function<std::unique_ptr<IShape()>>> m_creators;
};

std::unique_ptr<IShape> make_shape(std::string const& id)
{
    static ShapeFactory factory{};
    return factory.make(id);
}
```

Se puede probar un ejemplo [en Coliru](https://coliru.stacked-crooked.com/a/171f6f8c26de623a).

### Tercera mejora: factoría genérica

Imaginemos que en nuestro código tenemos un par de docenas de interfaces a las que queremos asociar un método _factory_. La factoría antes presentada funciona muy bien para crear objetos cuyo subtipo implementa la interfaz `IShape`, pero no para otros tipos, por lo que tendríamos que duplicar dicho código para cada nueva interfaz y los subtipos asociados.

Si examinamos detenidamente la implementación de la `ShapeFactory`, podremos ver rápidamente que es fácilmente generalizable si convertimos la clase factoría en una clase _templatizada_. Usando _variadic templates_ para especializar la factoría con múltiples tipos asociados tenemos algo como:

```cpp
template<class... Ts>
class Factory
{
    // ...
};

std::unique_ptr<IShape> make_shape(std::string const& id)
{
    using factory_t = Factory<Triangle, Square, Circle>;
    static factory_t factory{};
    return factory.make(id);
}
```

Ahora, el problema radica en registrar las clases de la factoría. Para ello, necesitamos poder iterar sobre todos los tipos indicados. Esto se consigue mediante una función _tonta_ (vacía) que nos haga las veces de expansor, llamándola con una función que se ejecute una vez para cada tipo de dato en el _template_. El truco acá consiste en que dicha función debe devolver un valor (cualquier cosa menos `void`), para poder expandirse como lista de argumentos.

```cpp
template<class... Ts>
class Factory
{
public:
    Factory()
    {
        register_all(register_class<Ts>()...);
    }

    // ...

private:
    template<class... Ts>
    void register_all(Ts...)
    {
    }

    template<class T>
    auto register_class()
    {
        return m_creators.emplace(T::id(), []() { return std::make_unique<T>(); }).second;
    }

    // ...
};
```

En este caso el método `register_class` devuelve un booleano indicado si la clase aún no había sido registrada, aunque realmente se usa únicamente para el _truco_ de la expansión de parámetros, no para una verificación real.

Dicho lo anterior, ahora se pueden crear tantos métodos _factory_ como se deseen con una mínima inversión: únicamente hay que especializar la clase `Factory` en el método factoría de cada interfaz.

Como nota final, podéis consultar un ejemplo completo operativo de patrón _factory_ [en Coliru](https://coliru.stacked-crooked.com/a/6c5230717152c279).
