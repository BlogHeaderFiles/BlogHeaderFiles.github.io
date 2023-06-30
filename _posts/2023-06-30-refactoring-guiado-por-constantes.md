---
title: Refactoring guiado por constantes en C++
date: 2023-06-30T16:00:00+01:00
author: Carlos Buchart
layout: post
permalink: /2023/06/30/refactoring-guiado-por-constantes
image: /assets/images/featured/const.jpg
excerpt: Continuamos estudiando el uso de constantes y explicamos un refactoring muy sencillo que podemos detectar gracias a ellas
categories: clean-code good-practices c++
---
En la [última entrega](/2023/03/27/que-conste-porque-construyo-con-constantes) explicamos los beneficios del uso de constantes en nuestro código: mejoran la expresividad, dejan clara la intención de uso, ayudan a reducir errores y, en algunos casos, pueden mejorar el rendimiento del código.

En este artículo comentaremos un _refactoring_ fácil y directo con el que podemos mejorar la limpieza y expresividad de nuestro código, y que podremos identificar fácilmente gracias al uso de constantes.

## Inicialización de constantes

La única _operación de escritura_ permitida sobre una constante es su inicialización. Para ser claros, no debe confundirse con una asignación; la asignación modifica el valor de una variable ya existente, mientras que la inicialización dota a la variable (o constante en este caso) de su primer valor. Una vez inicializada, una constante no puede cambiar su valor nunca más.

Existen no pocas situaciones en las que nuestro código calcula un valor y luego, sin mutarlo, lo usa durante su ejecución. Casos como éstos son claros candidatos a convertirse en una constante (con la consecuente mejora del código).

Ahora bien, ¿qué ocurre si el valor de dicha constante se determina en varios pasos? Acá claramente necesitamos alterar el valor de la _constante_ hasta que obtengamos su valor definitivo. Esto es bastante común en código antiguo (_legacy_). Este escenario también surge como consecuencia de un cambio que nos obliga a quitar el modificador _const_ que ya teníamos para poder _arreglar un bug_ o _incorporar una nueva característica_.

Por ejemplo, supongamos que tenemos una función para convertir una cadena de texto en un icono de 16px para un avatar (así, _HeaderFiles_ generaría una imagen las letras _HF_). Como sabemos un poco de _clean code_, hemos extraído nuestras funciones y dejado claras las intenciones. Nuestro código es el siguiente:

```cpp
Icon generate_icon_from_text(const std::string& text, int32_t width)
{
    // ...
}

Icon generate_avatar(const std::string& text)
{
    constexpr int32_t icon_width = 16;
    return generate_icon_from_text(text, icon_width);
}
```

Después de la fase de pruebas, vemos que es necesario poder generar versiones del avatar para resoluciones HiDPI (1x: 16px, 2x: 32px, 3x: 48px). Esto nos obliga a cambiar el código un poco (me he inventado una API para determinar el modo HiDPI):

```cpp
Icon generate_avatar(const std::string& text)
{
    int32_t icon_width = 16;
    switch (get_hidpi_mode())
    {
        case HiDPI_2x: icon_width = 32; break;
        case HiDPI_3x: icon_width = 48; break;
    }
    return generate_icon_from_text(text, icon_width);
}
```

Como vemos, para resolver el problema de las resoluciones hemos tenido que transformar nuestra constante (expresión constante realmente) en una variable mutable. Este patrón es un claro aviso de _refactoring_, ya que nos indica de zonas con una responsabilidad propia (en este caso, calcular el ancho del avatar) y que, por ende, pueden ser extraídas del código. Veamos algunas de las opciones de las que disponemos en C++ para ello.

## Opciones para la extracción de funciones en C++

C++ proporciona diversos mecanismos para encapsular código, a saber:

- Métodos miembro (en caso de que el código refactorizado sea una clase)
- Métodos estáticos
- Funciones globales (preferiblemente dentro de un _namespace_)
- Funciones locales (_namespace_ anónimo)
- Funciones lambda

Cuándo usar cada uno depende en gran medida de las circunstancias propias del código y de nuestras preferencias personales, aunque podemos trazar unas líneas generales de acción. Nótese que, si bien estamos aplicando estos mecanismos a la inicialización de constantes, son también válidos a cualquier escenario donde tengamos que elegir dónde ubicar una función.

- Si nuestra nueva función no va a ser reutilizada y el código es pequeño, podemos optar por una función lambda _in-place_ (no es necesario darle nombre ya que la propia constante nos indica su razón de ser de forma expresiva):

    ```cpp
    Icon generate_avatar(const std::string& text)
    {
        const int32_t icon_width = [] {
            switch (get_hidpi_mode())
            {
                case HiDPI_2x: return 32;
                case HiDPI_3x: return 48;
                default: return 16;
            }
        }();
        return generate_icon_from_text(text, icon_width);
    }
    ```

- Si la vamos a reutilizar dentro de una única función, y además necesitamos llamarla varias veces, podemos optar por una lambda con nombre, capturando los valores necesarios (nótese que no podremos acceder a miembros privados mediante este método).

- En caso de que la función sea algo más larga, no necesitemos _capturar_ ningún valor y únicamente dependamos de los argumentos variables, usar una función local (en un _namespace_ anónimo) es una mejor opción ya que reduce la extensión de la función inicial. Esta función puede definirse justo antes de la función que la usa, indicando así la relación que hay entre ambas.

    ```cpp
    namespace
    {
        int32_t get_avatar_width()
        {
            switch (get_hidpi_mode())
            {
                case HiDPI_2x: return 32;
                case HiDPI_3x: return 48;
                default: return 16;
            }
        }
    }

    Icon generate_avatar(const std::string& text)
    {
        const auto icon_width = get_avatar_width();
        return generate_icon_from_text(text, icon_width);
    }
    ```

- Lo mismo ocurrirá cuando necesitemos reutilizar este código en varios puntos del mismo fichero: optaremos por una función local aunque en este caso puede ser conveniente ubicarla al principio del fichero.

- Si necesitamos usar miembros privados de la clase, ni las lambdas ni las funciones locales nos pueden ayudar, salvo que los pasemos como parámetros. Si son muchos argumentos a pasar, podemos optar por usar métodos privados constantes: tendrán un alcance a nivel de toda la clase y podremos acceder a todos los miembros. Por contrapartida los miembros privados son visibles al usuario de la clase (visibles en cuando legibles, no en cuanto a usables). Tradicionalmente la forma de evitar esto es mediante el [patrón pImpl](https://cpppatterns.com/patterns/pimpl.html).

- Por último, en caso de que veamos que la función extraida es reutilizable en más de un lugar, lo mejor será ubicarla en alguna posición global (biblioteca o módulo), preferiblemente dentro de un espacio de nombres. Si además de ser global, el método está estrechamente relacionado con una clase en específico, podremos situarlo como un método estático (un ejemplo claro de esto son funciones de creación de objetos).

## Conclusiones

Hemos mostrado cómo el uso de constantes no sólo mejora la expresividad de nuestro código y nos proporciona mecanismos de seguridad ante errores humanos, sino que además puede indicarnos posibles _refactorings_. Tanto si nuestro código ya empleaba constantes, como si estamos comenzando a introducirlas, siempre nos serán útiles para detectar estos puntos de mejora.
