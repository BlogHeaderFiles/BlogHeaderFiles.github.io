---
title: Que conste porqué construyo con constantes
date: 2023-03-27T08:00:00+01:00
author: Carlos Buchart
layout: post
permalink: /2023/03/27/que-conste-porque-construyo-con-constantes
image: /assets/images/featured/const.jpg
excerpt: Enumeramos y razonamos los motivos que me llevan a usar el modificador 'const' en cada momento que puedo
categories: clean-code good-practices c++
---
Esta semana un colega me preguntó cuáles eran las razones por las que, a la primera oportunidad, declaraba como constantes todas las variables posibles. Ello derivó en una interesante conversación que ha servido de inspiración para este artículo.

## Constantes

Una constante es _un espacio de memoria con nombre cuyo valor no puede ser cambiado mientras el programa se ejecuta_. Son diferentes de los _literales_, que son datos presentados directamente en el código (tales como `42` y `"Hola mundo"`). Las constantes pueden ser de cualquier tipo: numéricas, cadenas de texto, booleanas, objetos, etc.

## Constantes en C++

Primero que nada, vale la pena mencionar que existen lenguajes muy populares, como Python, que no soportan constantes como tal, aunque tengan una nomenclatura especial para referirse a ellas (`MAYÚSCULAS`).

C++ por otro lado, sí permite la definición de _variables no modificables_, es decir, que las constantes son iguales a las variables con la salvedad de que su valor puede asignarse una única vez (hablaríamos de una especie de _invariable_). En C++ hay cuatro formas de declarar una constante:

- `#define RESPUESTA 42` (macro)
- `const int respuesta = 42;` (constante en tiempo de compilación)
- `const int respuesta = pregunta();` (constante en tiempo de ejecución)
- `constexpr int respuesta = 42;` (expresión constante, a partir de C++11)

Dejando de lado las macros, ya que no se recomienda su uso salvo para casos específicos (y eso que servidor era un adepto de las macros), los otros tres tipos podemos clasificarlos en dos categorías basándonos en qué momento la constante adquiere su valor: en tiempo de compilación o en tiempo de ejecución.

## Uso de las constantes

Discutiremos los diferentes usos de las constantes y sus beneficios (y contras cuando los haya) a partir de la clasificación dada anteriormente, además de algunos conceptos asociados.

### Constantes en tiempo de compilación

Las constantes en tiempo de compilación son inicializada con valores conocidos durante el propio proceso de compilación, bien mediante literales, directivas del preprocesador o expresiones constantes. Este tipo de constante sirve, en primer lugar, para darle un significado a un _valor mágico_ que, de otro modo, necesitaría de información adicional para ser entendido. Por ejemplo, si vemos en el código 3.1415926 casi todo el mundo sabe que eso es Pi, pero si vemos un 12 no sabemos si se refiere a los meses del año, horas de un reloj, un límite de edad, etc. Otro uso similar es el de guardar algunas configuración específica de esa compilación (por ejemplo, tamaño del _stack_ o la versión utilizada de una biblioteca).

Por otro lado, las constantes nos ayudan a no tener que repetir un valor. Así, tener una constante llamada `PI` es mucho más sencillo que escribir 3.1415926(...) cada dos por tres, además de arriesgarnos a escribirlo mal en algún momento.

Esto nos lleva al tercer uso de las constantes: tener una única fuente de verdad para ese valor. Además, si llegase a tener que modificarse en el código, sólo tendríamos que hacerlo en su definición, el resto de las referencias al mismo no tendrían que ser cambiadas.

### Constantes en tiempo de ejecución

Las constantes cuyo valor no puede ser conocido durante el proceso de compilación, sino que dependen del estado actual del sistema al momento de ser inicializadas, se llaman constantes en tiempo de ejecución. Aún así, siguen siendo constantes, ya que una vez inicializadas no podemos cambiar su valor.

#### Constantes globales por ejecución

¿De qué nos sirve, pues, una constante cuyo valor no conocemos hasta el momento de ejecutarse? Lo primero y principal es precisamente establecer una regla de no modificación, de utilizar la semántica de declaración para impedir que cambie (intencionada o, más comúnmente, por error).

Pongamos el caso de un _feature flag_, de una opción de ejecución que se establece durante el arranque: el usuario puede asignar un valor u otro al iniciar el programa, pero una vez asignado no es posible cambiarlo a no ser que se reinicie. Esto puede ser, por ejemplo, el uso de aceleración por hardware para un motor de renderizado. Es fácil elegir uno u otro durante la inicialización, pero cambiarlo _en caliente_ seguramente no compense el beneficio a la complejidad necesario de nuestro diseño de software. Así, una vez leído el parámetro, lo asignamos a una constante que no puede ser modificada.

#### Constantes locales y _clean code_

De forma más local, si tenemos una variable cuyo valor no necesitamos modificar, ¿por qué vamos a dejar abierta esa posibilidad, la de alterar su valor y ocasionar un efecto inesperado? Supongamos el siguiente código:

```cpp
void set_image_to_black(Image& image)
{
    const auto bytes_per_row = image.width() * image.bpp() / 8;
    const auto height = image.height();

    for (auto y = 0; y < height; ++y) {
        auto ptr = image.get_ptr_to_row(y);
        memset(ptr, bytes_per_row, 0);
    }
}
```

Es claro a partir de este código que todas las filas de la imagen tienen el mismo tamaño en bytes, que no varía. Además, dejamos al compilador la tarea de detectar cualquier intento de alteración de dicho valor. En resumen, dejamos claras nuestras intenciones.

Siguiendo con este punto, un dato local en una variable (en lugar de una constante) es una invitación a reutilizar dicho espacio de memoria para otros usos. Esto lleva a varios posibles problemas:

- Uso inapropiado de un espacio con nombre para un fin diferente (reusar una variable `name` para guardar el _checksum_ del fichero). Esto reduce la legibilidad del código.
- Apunta a un posible _refactoring_ ya que claramente estamos teniendo bloques de diferente ámbito mezclados, y seguramente muy largos.
- Y el peor, podríamos introducir errores si quisiésemos volver a utilizar dicha variable con su sentido original. Esto también apuntaría a un _refactoring_ ya que bien tenemos responsabilidades mezcladas, o el código es más largo del que podemos cubrir con ciertas garantías.

#### Construyendo Constantinopla

¿Y qué pasa con aquellas variables cuyo valor de asigna una única vez, pero no es posible conocer con certeza el valor dado que depende de muchos factores? Pongamos el siguiente ejemplo:

```cpp
void draw_account_icon(uint32_t row, AccountType type) {
    Color color;
    if (type == AccountType::User && row > 0) color = Color::Blue;
    else if (type == AccountType::User && row == 0) color = Color::LightBlue;
    else if (type == AccountType::Group) color = Color::Red;
    else color = Color::Green;

    const auto icon = get_icon(type);
    const auto colorized_icon = colorize_icon(icon, color);
    const auto y = row * colorized_icon.get_height();
    draw_icon(0, y, colorized_icon);
}
```

Éste quizás es uno de los argumentos tácitos más comunes para no declarar como constante una variable. En la mayoría de los casos esto es también un indicativo de que nuestro código está haciendo demasiadas cosas y que deberíamos refactorizar. Así, podríamos extraer una función que, dado el tipo de cuenta y la fila en la que ha de ser presentada, devuelve el color del icono asociado.

```cpp
Color get_color_for_account(uint32_t row, AccountType type) {
    if (type == AccountType::User && row > 0) return Color::Blue;
    if (type == AccountType::User && row == 0) return Color::LightBlue;
    if (type == AccountType::Group) return Color::Red;
    return color = Color::Green;
}

void draw_account_icon(uint32_t row, AccountType type) {
    const auto icon = get_icon(type);
    const auto color = get_color_for_account(row, type);
    const auto colorized_icon = colorize_icon(icon, color);
    const auto y = row * colorized_icon.get_height();
    draw_icon(0, y, colorized_icon);
}
```

### Métodos constantes

Otro uso de objetos constantes (tanto en tiempo de compilación como especialmente en tiempo de ejecución), es la de limitar el acceso a los métodos que se pueden llamar. Un método puede ser marcado como `const`, de forma que se establece un contrato mediante el cual se _promete_ que dicho método no modifica el estado del objeto. Como es lógico, no es posible llamar a métodos no-const desde un objeto marcado como constante (y esto incluye a los operadores de asignación).

Siguiendo con la lógica del punto anterior, si un método no modifica el estado del objeto, ¿por qué voy a querer marcarlo como que sí lo hace? Respuestas como "por si acaso" o "igual en el futuro sí" demuestran simplemente un diseño pobre y poco pensado. Además, si los requerimientos cambian en el futuro también lo puede hacer la API de la clase, y en este caso incluso tendremos ayuda ya que nuestro método que antes era const y ahora no lo es no podrá ser llamado desde los objetos que habíamos también declarado como constantes, por lo que el compilador nos servirá de guía para revisar nuestro código después de la modificación y evitar efectos indeseados.

Por otro lado, C++ tiene _puertas traseras_ en el diseño de los métodos const que son necesario conocer.

- El modificador `mutable` indica que la variable miembro asociada puede ser modificada desde un método const. Obviamente abusar de este método es falsear el contrato establecido. Recordad que C++ nos hace difícil dispararnos en el pie, pero cuando lo logramos nos volamos la pierna entera ([Bjarne Stroustrup](https://www.goodreads.com/quotes/226222-c-makes-it-easy-to-shoot-yourself-in-the-foot)). Seguramente el uso más común de este modificador es para declarar `mutex` u otras estructuras para proteger secciones críticas, ya que se deberían poder usar en métodos tipo _get_ (que normalmente son constantes), pero obviamente el mutex debe poder modificar su estado para ello. De todas formas, estos casos son excepcionales ya que el propio mutex garantiza su coherencia.
- Uso de punteros inteligentes. En estos casos no es posible modificar el puntero inteligente desde el método const, _pero sí el objeto al que apunta_. Esto permite llamar a métodos no-const en objetos referenciados desde punteros inteligentes. Esto no ocurre con los punteros normales (_raw_).
- El modificador `const` no impide modificar variables globales, o llamar a métodos estáticos que sí puedan modificar el estado del sistema.
- El operador `const_cast` que permite _quitar_ el modificar const a un objeto. Aunque tiene sus casos de uso, la regla general es evitarlo.

Los métodos const son, dentro las limitaciones anteriores, un indicativo de métodos de _sólo lectura_. Esto permite identificar más fácilmente problemas de sincronización del estilo "escritores - lectores".

C++ permite, además, realizar una sobrecarga de métodos con versiones `const` y no-`const`. Por ejemplo, la versión const pod–ría devolver una referencia constante a una variable miembro mientras que la no-const devolvería una copia. Si declaramos nuestro objeto como `const` estaremos dirigiendo al compilador a la versión optimizada del método.

En resumen, definiendo nuestras variables como `const` dejamos al compilador la tarea de filtrar qué operaciones son posibles además de permitir ciertas optimizaciones en el proceso.

Por último, y casi nota al margen, si un método no modifica a miembros de la clase, pero tampoco los usa, es muy probable que estemos ante un posible método estático, o que debería ser movido a una biblioteca o módulo separado. Además, si dicho método sólo se usa dentro de una determinada implementación, igual lo mejor es moverlo a una función local (en un `namespace` anónimo) o por lo menos como parte de otro fichero. Con esto limpiamos la interfaz de las clase, además de reducir (muy ligeramente) el tiempo de compilación.

### `constexpr` vs `const`

En C++11 se introdujo un nuevo tipo de constante en tiempo de compilación, llamado `constexpr`. La idea es que el compilador puede hacer uso de estas constantes y evaluarlas durante la generación del binario para producir código optimizado (aunque no es obligatorio). Además, es posible definir funciones `constexpr` que son evaluables en tiempo de compilación, aunque tienen algunas limitaciones dependiendo de la versión de C++ que se use.

Definir, si se puede, una constante como `constexpr` abre las puertas a posibles optimizaciones, además de dejar más clara la intención de definir una constante en tiempo de compilación.

#### Funciones `constexpr` y `consteval`

Como se dijo antes, las funciones marcadas como `constexpr` _pueden_ ser evaluadas en tiempo de compilación. Lo harán si el resultado se necesita en dicho momento, como por ejemplo para calcular el tamaño de un arreglo, pero es posible que otras llamadas se difieran al momento de ejecución. Las funciones marcadas como `consteval` (C++20), son evaluadas _únicamente_ en tiempo de compilación. No existen variables `consteval` ya que su uso estaba cubierto por completo con `constexpr` en la especificación de C++11.

### Argumentos `const`

Seguramente este punto sea ampliamnte conocido por el lector más veterano, ya que data de la época del C++ _viejo_. Básicamente se trata de definir los argumentos de una función, cuando son objetos, como referencias constantes, a fin de evitar copias innecesarias. Como ejemplo (`std::string trim(const std::string& str)`). Esto además permite el uso de dichas funciones sobre objetos construidos implícitamente a partir de literales (`const auto trimmed = trim("   hola mundo  ");`). Desde C++11 existen pequeñas variantes de esta _regla universal_ en lo que se refiere a los constructores de movimiento, pero no profundizaré en dicha explicación ahora (para más información consultar Effective Modern C++, de Scott Meyers, Item 41).

### Miembros constantes

Las clases pueden tener miembros constantes que pueden ser inicializados únicamente en los constructores. Como puede deducirse si se piensa un poco, esto imposibilita el uso del operador de asignación por defecto, ya que éste básicamente lo que hace es llamar al operador de asignación de los miembros de la clase, y a una constante no se le puede volver a dar un valor. Esta limitación puede eludirse definiendo nuestro propio operador de asignación que _salte_ las constantes (aunque tendremos que mirar que la clase entonces quede en un estado coherente).

### Alternativas a constantes

Algunas veces no es posible utilizar una constante como tal, pero al menos podemos definir un mecanismo que nos alerte de _reinicializaciones_. Se trata básicamente de usar un método `get` con una bandera de inicialización que se levanta con la primera llamada al `set`:

```cpp
template<class T>
class RuntimeConstant {
    std::optional<T> m_value;

public:
    void set(const T& value) {
        assert(!m_value);
        if (m_value) {
            throw std::runtime_error("Re-initialization detected"); // no further information for simplicity
        }
        m_value = value;
    }

    T get() const {
        assert(m_value);
        if (!m_value) {
            throw std::runtime_error("Uninitialized run-time constant"); // no further information for simplicity
        }
        return m_value;
    }
};
```

## Conclusiones

Como hemos visto, el uso del modificador `const` (y `constexpr`) no se restringe únicamente a dar nombre a valores mágicos, sino que además mejora la expresividad del código, limita los posibles errores y abusos, ayuda a detectar zonas de mejora (especialmente extracción de funciones) y permite al compilador realizar algunas optimizaciones.
