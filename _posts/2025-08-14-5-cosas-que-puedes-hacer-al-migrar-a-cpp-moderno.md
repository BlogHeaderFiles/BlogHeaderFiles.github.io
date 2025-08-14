---
title: 5 cosas que puedes hacer al migrar a C++ moderno
date: 2025-08-14T07:00:00+01:00
author: Carlos Buchart
layout: post
permalink: /2025/08/14/5-cosas-que-puedes-hacer-al-migrar-a-cpp-moderno
image: /assets/images/featured/modern-cpp.jpg
excerpt: Descubre cómo migrar a C++ moderno puede triplicar el rendimiento de tu código y mejorar su legibilidad sin apenas esfuerzo. Desde optimizaciones automáticas hasta nuevas sintaxis y funciones.
categories: c++ c++11 c++14 c++17 c++20
---
Si bien C++11 y el resto de versiones del bien llamado _C++ moderno_ llevan ya tiempo entre nosotros, muchos programadores siguen usando C++ a la _antigua usanza_, en detrimento de la legibilidad, flexibilidad de diseño e incluso del rendimiento que nos ofrecen las versiones más recientes. He aquí algunas cosas que puedes hacer fácilmente para comenzar a disfrutar de las ventajas del _C++ moderno_.

## No hagas nada

Sí, como suena, la primera de ellas es "no hagas nada". Haz un _benchmarking_ de tu código antes y después de migrar y seguramente te sorprenderás, especialmente si haces un uso intensivo de contenedores de la biblioteca estándar.

Una de las principales razones de esto es la introducción de la semántica de movimiento, con la consecuencia añadida de que muchos de los métodos y constructores ya existentes han recibido soporte para argumentos _r-value_, lo que significa que, sin _mover_ un dedo, disfrutamos ya de sus beneficios. Además, existen otras optimizaciones que pueden destacar dependiendo del compilador que usemos, tales como el _return-value-optimization_ (RVO, obligatorio a partir de C++17).

El siguiente ejemplo muestra un caso no poco común de creación de un vector de objetos (adjunto también el código del _benchmark_):

```cpp
std::vector<std::string> create_vector(size_t n, std::string s)
{
    std::vector<std::string> v;

    for (size_t i = 0; i < n; ++i)
    {
        v.push_back(s + s);
    }

    return v;
}

int main(int argc, char* argv[])
{
    const size_t n = atoi(argv[1]);
    const size_t m = atoi(argv[2]);

    int z = 0;
    for (size_t i = 0; i < m; ++i)
    {
        char c = (rand() % 26) + 'a';
        size_t sn = (rand() % 1000) + 10;
        std::vector<std::string> v = create_vector(n + i, std::string(sn, c));

        const int x = v.front().front();
        z += x; // to prevent compiler to remove code
    }

    std::cout << z << std::endl;

    return 0;
}
```

El compilador usado ha sido Apple clang version 14.0.3 (clang-1403.0.22.14.1), todos con nivel de optimización `-O2` y bajo plataforma ARM. Todas las pruebas se han hecho con `n=10000` y `m=1000`, midiendo el tiempo de ejecución con `time` 5 veces y promediando los resultados:

- `--std=c++03`: real 5.586s, user 3.325s, system 2.010s
- `--std=c++11`: real 1.856s, user 1.166s, system 0.689s
- `--std=c++14`: real 1.875s, user 1.155s, system 0.692s
- `--std=c++17`: real 1.829s, user 1.139s, system 0.689s
- `--std=c++20`: real 1.839s, user 1.159s, system 0.674s

Sin hacer nada hemos podido triplicar la velocidad de nuestro programa simplemente compilando con una versión más moderna del lenguaje. Esto obviamente no quiere decir que _todo_ nuestro programa se acelere 3x; este ejemplo está preparado específicamente para mostrar esta mejora, pero da una idea clara de los beneficios que implican las nuevas características del lenguaje.

## Auto-matiza la deducción de tipos

C++11 introdujo un nuevo significado para la palabra reservada `auto` (es el único caso que conozco de cambios en este sentido). Se usa en una declaración para deducir el tipo de la variable a partir de su inicialización; y si el compilador no es capaz de hacer una deducción única, la declaración se considera incorrecta y se genera un error.

El uso de `auto` permite reducir la cantidad de código a escribir (y leer), simplificando el mismo, y moviendo el nivel de abstracción al _qué_ en lugar del _cómo_ (o _con qué_).

```cpp
std::vector<int> generate_ids(int n) { ... }

// Before
const std::vector<int> ids_old_way = generate_ids();

// Now
const auto ids_old_way = generate_ids();
```

Un caso especialmente útil es a la hora de usar iteradores:

```cpp
std::map<std::string, std::vector<std::string> > synonyms;

// Before
std::map<std::string, std::vector<std::string> >::iterator it = synonyms.find(word);

// Now
auto it = synonyms.find(word);
```

Además, se facilitan los _refactorings_ y optimizaciones de código al reducir el número de errores de compilación: si se cambia el tipo de un contenedor, `auto` se deducirá el nuevo iterador y listo (obviamente, si el nuevo tipo de iterador no es compatible con el anterior sí puede haber problemas, por ejemplo si se pasa de un `std::vector` a un `std::unordered_map`). Lo mismo sucedería si se cambia el tipo de retorno de una función: con `auto` tendríamos ya hecha una parte del pastel.

La única _pega_ (que por otra parte tiene su lado positivo), es que el nombre de la variable cobra más peso ya que no tenemos a la mano (¿ojo?) su tipo. Pero como dije, esto puede incluso mejorar el código al obligarnos a poner nombres descriptivos (`cardVector` podría ser `cardCollection` o simplemente `cards`, y esa enigmática `DatabaseConnectionController* dcc = DatabaseConnectionController::create()` pasar a ser `auto dbConnectionController = DatabaseConnectionController::create()`).

## Pythoniza tu código

El que diga que C++ moderno no <del>ha copiado</del> se ha inspirando en aspectos de otros lenguajes más jóvenes (especialmente Python), pues simplemente está negando lo obvio. Las nuevas sintaxis introducidas no sólo ayudan a hacer un código más compacto, sino que además permiten mejorar la expresividad del código y elevar el nivel de abstracción.

- _Range-for_: seguramente la más conocida de estas _pythonizaciones_, permite recorrer una colección de elementos, sin necesidad de preocuparse del tipo exacto de contenedor. C++ ya disponía de un par de formas de hacerlo (un `for` desde `begin` hasta `end`, y el `std::for_each`), pero el _range-for_ es más natural en muchos casos donde solamente queremos _recorrer los elementos_ (pero no modificar el contenedor, por ejemplo).

    ```cpp
    for (size_t i = 0; i < container.size(); ++i) { // random-access iterators
        foo(container[i]);
    }

    for (std::list<int>::iterator it = list.begin(); it != list.end(); ++it) { // basic iterator version
        foo(*it);
    }

    for (auto it = container.begin(); it != container.end(); ++it) { // more generic using 'auto'
        foo(*it);
    }

    std::for_each(container.begin(), container.end(), foo); // using an algorithm

    for (auto&& c : container) { // range-for
        foo(c);
    }
    ```

  Como detalle curioso, he visto cómo el uso del _range-for_ puede optimizar código en determinados momentos. Un _range-for_ siempre copiará el iterador `end()`, por lo que si nuestro contenedor hacía uso de un `end()` costoso, eso que nos ahorramos.

  Por último, una rápida comparación entre `std::for_each` y los _range-for_:

  - Los _range-for_ permiten utilizar las instrucciones _break_ y _continue_ para modificar el flujo.
  - `std::for_each` puede ser paralelizado (C++17, ver más abajo).

- Utiliza las listas de inicialización, de esta forma puedes inicializar colecciones de datos en la propia declaración, e incluso [hacerlas constantes](/2023/03/27/que-conste-porque-construyo-con-constantes).

    ```cpp
    const std::map<int, std::string> numbers = {
        {1, "one"},
        {2, "two"},
        {3, "three"},
    };
    ```

- Mejora la expresividad _atando_ variables. Devolver pares o tuplas es una forma común de evitar crear _structs_ específicamente para devolver varios valores en una función. Ahora bien, el problema surge rápidamente cuando no sabemos qué significan el _.first_ o el _.second_, y peor aún si comparten el mismo tipo de datos.

    ```cpp
    std::pair<int, std::string> get_id_and_name();

    // Without binding
    const auto id_and_name = get_id_and_name();
    std::cout << "ID: " << id_and_name.first << ", name: " << id_and_name.second << std::endl;

    // With binding
    const auto [id, name] = get_id_and_name();
    std::cout << "ID: " << id << ", name: " << name << std::endl;
    ````

  También puede usarse al iterar sobre mapas:

    ```cpp
    std::map<int, std::string> roman_numbers;

    // Without binding
    for (const auto& it : roman_numbers) {
        std::cout << "Number " << it.first << " is " << it.second << std::endl;
    }

    // With binding
    for (const auto& [decimal, roman] : roman_numbers) {
        std::cout << "Number " << decimal << " is " << roman << std::endl;
    }
    ```

## Haz uso de los nuevos contenedores y métodos

C++11 introduce nuevas estructuras de datos que mejoran drásticamente el rendimiento bajo determinadas condiciones:

- Todo `std::map` cuyas claves sean tipos básicos (`char`, `int`, `float`, enumeraciones, punteros, etc.), y con más de unas pocas decenas de elementos, puede ser reemplazado por [`std::unordered_map`](https://es.cppreference.com/w/cpp/container/unordered_map). Es el equivalente de una tabla _hash_ y sus operaciones son mucho más eficientes: O(1) de media para la inserción y la búsqueda, dependiendo de las colisiones que puedan generarse. También puede usarse con otros tipos, tales como `std::string` pero acá el rendimiento va a depender también del tamaño medio de la clave. Cuidado que con mapas de poco tamaño puede no notarse el rendimiento o incluso disminuir (el coste relativo de calcular la función _hash_ respecto a la comparación del tipo bruto aumenta conforme el número de elementos es más pequeño).
- De forma análoga tenemos a [`std::unordered_set`](https://es.cppreference.com/w/cpp/container/unordered_set) como alternativa a `std::set`. En ambos casos es importante hacer notar que, tal y como indica su nombre, las claves no están ordenadas, por lo que hay que tener cuidado si la implementación actual depende de ello. Esto no debe de ser un impedimento por sí mismo para migrar; por ejemplo, si sólo se requieren las claves ordenadas para un proceso de serialización, y el rendimiento del mismo no es crítico, se podrían extraer las claves, ordenarlas y serializarlas en orden, manteniendo así la compatibilidad con el código anterior.
- Usar [`std::string_view`](https://es.cppreference.com/w/cpp/string/basic_string_view) (C++17) en los argumentos de funciones que no requieren modificar la cadena de texto. `std::string_view` es básicamente un _wrapper_ al estilo de las cadenas de texto en C (un puntero al primer caracter y un tamaño) pero de forma segura y compatible con `std::string` donde haga falta. De esta forma, cuando se requiere un subconjunto de la cadena, se evita pasar copias innecesarias.

Gracias a los _r-value_ y a los _variadic templates_, C++11 introdujo nuevos métodos para añadir elementos a un contenedor de forma más eficiente. Tradicionalmente usamos `push_back` para añadir elementos a un `std::vector` o `insert` para los `std::map`. Ahora bien, en ambos casos el método primero reserva _e inicializa_ el espacio para el elemento en el contenedor, y luego es que copia (o mueve) el elemento en sí. En la práctica esto significa que tenemos que llamar a un constructor por defecto y a un constructor de copia (o movimiento). En C++11 tenemos `std::vector::emplace_back` y `std::map::emplace` que nos permitirán construir _in-place_ el elemento en su zona de memoria reservada, generando un código mucho más eficiente. Desgraciadamente, y por compatibilidad hacia atrás, los métodos anteriores `push_back` e `insert` no pudieron ganar esta mejora y la migración tenemos que hacerla a mano (además de cambiar costumbre de los métodos a usar).

```cpp
struct my_bag {
    my_bag(int32_t a, int32_t b, int32_t c);
};

std::vector<my_bag> bags;

// Before
bags.push_back(my_bag(1, 3, 3));

// Now
bags.emplace_back(1, 2, 3);
```

Así, vemos que `emplace_back` se ha de llamar con los mismos argumentos del constructor. Si hiciese `my_bag bag{2, 3, 4}; bags.emplace_back(bag);` estaría llamando al constructor de copia, pero in-place, que sería una mejora más no la óptima.

### Reduce la dependencia de bibliotecas de terceros

Como extensión del punto actual, y como ya se ha visto, C++11 y posteriores han ido extendiendo la biblioteca estándar con nuevos integrantes, muchas veces inspirándose en populares bibliotecas de terceros, especialmente Boost.

- `std::thread`, `std::mutex`, para gestión de hilos y sincronización. `boost::thread` no es exactamente igual que `std::thread`, la de Boost tiene un conjunto mayor de funcionalidades, tales como interrupción de un hilo y manejo de colecciones de hilos.
- `std::chrono`, para operaciones con unidades de tiempo.
- `std::optional`, `std::variant`, para tipos opcionales y variantes tipo-seguras.
- `std::filesystem` (C++17), para gestión del sistema de ficheros (aunque no es 100% equivalente).
- `std::ranges` (C++20), inspirándose en ranges-v3.

## Mejora la gestión de recursos

Uno de los puntos que muchos desarrolladores critican a C++ es la gestión de memoria (punteros nulos, colgantes, etc). Es cierto que, tal y como comentaba Bjarne Stroustrup, _C hace que sea fácil pegarte un tiro en el pie; C++ lo hace más difícil, pero cuando lo haces te vuela toda la pierna_. Pero también es cierto que desde C++11 es aún más difícil ya que la biblioteca estándar provee de muchos mecanismos para evitarlo. Los dos principales son `std::unique_ptr` y `std::shared_ptr`. el primero permite expresar que un objeto tiene un único dueño, mientras el segundo distribuye, mediante un contador de referencias, la propiedad entre varios.

Un ejemplo común para `unique_ptr` son las clases _manager_, que centralizan el acceso a un determinado recurso. Así, esta clase puede tener un `unique_ptr` y pasar una referencia a todas las demás. Además, los `unique_ptr` no pueden ser copiados, sólo _movidos_, por lo que la transferencia de propiedad es explícita. Los `shared_ptr`, por otro lado, son más comunes en elementos con un ciclo de vida impredecible o donde los actores creadores del objeto pueden desaparecer antes que el objeto en sí.

Un código de C++ moderno no debería usar punteros _raw_ para almacenar objetos. A la hora de pasar un objeto `unique_ptr` podemos o bien usar una referencia (que además obliga a no pasar un `nullptr`); si el objeto puede no estar inicializado podríamos pasar un `std::optional<Objeto&>` (C++17), pero en este caso no hay una ventaja muy clara respecto a pasar un puntero _raw_ ya que se puede usar mal en ambos casos. El acceso a punteros nulos sigue siendo responsabilidad del programador. Así que cuidado en este caso.

Ambos tipos de _punteros inteligentes_ se basan en un principio muy conocido de C++ y del que ya he hablado en otras ocasiones: el RAII (ver [RAII 1](/2020/01/13/_posts/2020-01-13-automatizando-acciones-gracias-al-raii-parte-i) y [RAII 2](/2020/01/17/2020-01-17-automatizando-acciones-gracias-al-raii-parte-ii)). No me extenderé acá en este tema y refiero a dichas páginas para más información

## Bonos

Algunos pequeños cambios adicionales que marcan una gran diferencia:

- Nuevos literales: `""s` para `std::string`, `""ms` para `std::chrono::milliseconds`, `0x1234_u32` para enteros con tipo específico, etc. Hacen el código más expresivo y evitan conversiones implícitas.
- Paralelización de algoritmos (C++17): simplemente añade `std::execution::par` a tus `std::sort`, `std::transform` y otros algoritmos para aprovechar múltiples núcleos automáticamente.
- `if constexpr` (C++17): cambia el complicado SFINAE por código estructurado más legible en templates. Permite escribir código condicional que se evalúa en tiempo de compilación.
- Designated initializers (C++20): inicializa estructuras de forma más clara con `Point{.x = 10, .y = 20}` en lugar de `Point{10, 20}`.
- `std::optional` (C++17): expresa explícitamente cuando una función puede no devolver un valor válido, eliminando la ambigüedad de los valores "especiales" como `-1` o `nullptr`.
- Fold expressions (C++17): simplifica operaciones en _parameter packs_ con expresiones como `(args + ...)` en lugar de recursión manual.
- Lambda expressions mejoradas: desde C++11, pero con mejoras constantes. Usa `[&]` para capturar por referencia, `[=]` por copia, o mezcla ambas. En C++14 puedes usar _generic lambdas_ con `auto` en los parámetros.
- `constexpr` everywhere: marca funciones como `constexpr` siempre que sea posible. El compilador las evaluará en tiempo de compilación cuando pueda, mejorando el rendimiento.
- `std::array` vs arrays C: reemplaza `int arr[10]` por `std::array<int, 10>`. Obtienes los beneficios de los contenedores STL sin coste adicional.
- Inicialización uniforme: usa `{}` en lugar de `()` para la inicialización. Es más segura (previene _narrowing conversions_) y más consistente.

## Conclusión

Migrar a C++ moderno no es solo cambiar el estándar del compilador; es adoptar una mentalidad que prioriza la expresividad, el rendimiento y la seguridad. Como hemos visto, algunas de estas mejoras llegan prácticamente "gratis" con solo recompilar el código, mientras que otras requieren cambios mínimos que pueden transformar drásticamente la calidad del software.

Los cinco puntos que hemos cubierto —aprovechar las optimizaciones automáticas, usar `auto` para simplificar el código, adoptar las sintaxis "pythonizadas", migrar a contenedores más eficientes y mejorar la gestión de recursos— representan solo la punta del iceberg de lo que C++ moderno tiene para ofrecer.

La belleza del C++ moderno radica en que permite escribir código más limpio y expresivo sin sacrificar el rendimiento que siempre ha caracterizado al lenguaje. Al contrario, en muchos casos lo mejora. Así que la próxima vez que inicies un proyecto o tengas la oportunidad de refactorizar código existente, no dudes en darle una oportunidad a estas características. Tu código (y tus compañeros de equipo) te lo agradecerán.
