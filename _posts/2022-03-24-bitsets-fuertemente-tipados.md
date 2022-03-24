---
title: Flags fuertemente tipadas
date: 2022-03-24T07:45:00+01:00
author: Carlos Buchart
layout: post
permalink: /2022/03/24/flags-fuertemente-tipadas
image: /assets/images/featured/strong_flags.jpg
excerpt: Exponemos una alternativa fuertemente tipada a las colecciones de banderas.
---
## Introducción

En muchos sistemas es frecuente tener que saber si determinada característica, opción, componente, etc. está habilitado o no. Para ello se suelen usar _flags_ (banderas), definidas como constantes o enumeraciones, y vectores de booleanos o `std::bitset`.

```cpp
enum CompilationFlags {
    CompilationFlags_CrossCompilation,
    CompilationFlags_Debug,
    CompilationFlags_Count
};
std::bitset<CompilationFlags_Count> compilation_flags;

compilation_flags.set(CompilationFlags_Debug, true);
```

El principal problema de estas soluciones es que se basan en convertir un _identificador_ en un índice en el vector / bitset, lo que lleva a que no haya comprobación en tiempo de compilación de que la característica esté soportada. Por ejemplo, puede ocurrir un desbordamiento de buffer si el índice supera el tamaño máximo del contenedor, o un error de lógica si se consulta un _flag_ no correspondiente a dicho conjunto (pero con el mismo valor numérico).

## Propuesta

Una posible solución es definir las banderas como tipos booleanos fuertemente tipados y usarlos en una tupla. En este artículo extenderemos la sintaxis que propusimos en una entrega anterior ([Argumentos expresivos 1](https://headerfiles.com/2021/02/07/expressive-args/)):

```cpp
class Flag
{
    bool m_value;

public:
    Flag() = default;
    explicit Flag(bool value) noexcept : m_value{value} {}

    operator bool() const { return m_value; }
};

#define FLAG(name) struct name : Flag { using Flag::Flag; }

FLAG(CrossCompilation);
FLAG(Debug);

using CompilationFlags = std::tuple<CrossCompilation, Debug>;
```

Así, podemos aprovechar el método `std::get` basado en tipos para consultar el estado de la bandera:

```cpp
CompilationFlags comp_flags;

std::get<CrossCompilation>(comp_flags) = CrossCompilation{true};       // to set a value
auto const cross_compilation = std::get<CrossCompilation>(comp_flags); // to get a value
```

Ahora bien, esta sintaxis puede ser mejorada en varios aspectos; veamos cuáles son.

### Estado inicial de la bandera

Lo primero es que no todas las banderas estarán en un estado _off_ al inicio, por lo que podemos modificar el tipo `Flag` para considerar este escenario y dotarlas de un estado inicial explícito:

```cpp
template<bool default_value>
class Flag
{
    bool m_value{default_value};

public:
    Flag() = default;
    explicit Flag(bool value) noexcept : m_value{value} {}

    operator bool() const { return m_value; }
};

#define FLAG(name, value) struct name : Flag<value> { using Flag::Flag; }

FLAG(CrossCompilation, false);
FLAG(Debug, true);
```

### Encapsulamiento

Lo siguiente es dotar de una mejor interfaz a nuestra solución. Para ello definiremos una clase `Flags` que se hará cargo de dichas funciones. Veremos esta solución en conjunto con la siguiente mejora.

### Inicialización selectiva

Aunque las banderas tengan un estado inicial, éste puede que no sea apropiado en algunos casos. Una solución podría ser tener un constructor que reciba todas las banderas, pero claramente no es la opción más limpia, especialmente si el conjunto es grande. En su lugar aprovecharemos el tipado fuerte de las banderas para poder definir un constructor más flexible.

```cpp
template<typename... Types>
class Flags
{
public:
    Flags() = default;

    template<typename Flag, typename... Args>
    explicit Flags(Flag flag, Args&&... args) : Flags{args...}
    {
        std::get<Flag>(m_flags) = flag;
    }

    template<typename T>
    bool is_enabled() const noexcept
    {
        return std::get<T>(m_flags);
    }

    template<typename T>
    void set_enabled(T const& state) noexcept
    {
        std::get<T>(m_flags) = state;
    }

private:
    std::tuple<Types...> m_flags;
};
```

#### Ejemplo de uso

```cpp
using CompilationFlags = Flags<CrossCompilation, Debug>;

CompilationFlags const compilation_flags{Debug{false}};

auto const is_debug = compilation_flags.is_enabled<Debug>();
```

El ejemplo completo puede conseguirse [acá](http://coliru.stacked-crooked.com/a/f4f911e69df90423).

## Conclusión

Como se ha podido ver, el uso de tipos fuertemente tipados aumenta la expresividad del código, permiten soluciones máx flexibles y robustaz, y da una mayor cercanía entre la sintaxis y la semántica.

Por otro lado, permiten sacar partido a una de mis características favoritas de C++: el compilador. Si algo se puede hacer en tiempo de compilación, ¿por qué hacerlo en tiempo de ejecución? Si un fallo se puede detectar cuando sólo nosotros (los desarrolladores) somos los afectados, ¿por qué dejar que el cliente sea el que lo descubra? De todo esto hablaremos en una entrega futura, mientras tanto, y como diría Sheldon Cooper: ¡diversión con banderas!
