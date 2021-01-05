---
title: Atributo maybe_unused (C++17)
date: 2020-05-17T10:48:14+02:00
author: Carlos Buchart
layout: post
permalink: /2020/05/17/atributo-maybe_unused/
image: /assets/images/featured/maybe_unused.jpg
---
En algunos ejemplos mostrados en entradas anteriores ha aparecido el uso del atributo `[[maybe_unused]]` que igual no os suena aún. Los _atributos_ son una característica del C++ moderno que permiten indicar al compilar información acerca del código, con el fin de optimizar determinados fragmentos, introducir restricciones o generar el código de una forma específica. Los atributos vienen a unificar alternativas ya existentes pero que eran propias de cada compilador, generando código no portable u obligando a usar macros y detección del compilador. Una lista completa de los atributos de C++ puede encontrarse en [cppreference.com](https://en.cppreference.com/w/cpp/language/attributes).

En nuestro caso, [`[[maybe_unused]]`](https://es.cppreference.com/w/cpp/language/attributes/maybe_unused) es un atributo introducido en C++17, que indica al compilador que no genere _warnings_ de no-uso para el identificador asociado. Esto es especialmente útil si se ha indicado al compilador que convierta los _warnings_ en errores de compilación (`/WX` para el compilador 'cl' de Visual Studio, `-Werror` en gcc) pero el código en sí es correcto (al final de la entrada hablo un poco más sobre la utilidad de este _warning_).

### Utilidad de los _warnings_
Para muchos programadores los _warnings_ no son más que una gran molestia del compilador, que resulta ser _quisquilloso_ y no nos deja en paz. Esto es cierto en algunos escenarios, pero normalmente tienen su razón de ser: el código potencialmente puede tener un problema de lógica y el compilador nos avisa de ello, pudiendo muchas veces solucionarlos incluso antes de depurar el código.

Sin desviarme mucho del tema del atributo, mencionaré algunos _warnings_ genéricos que me suelen ayudar:

  - Conversión implícita: se está convirtiendo un tipo en otro para ser usado, normalmente, en la construcción de un objeto. Esto algunas veces lleva a un comportamiento no esperado, como el que describo en [esta pregunta de Stack Overflow](https://stackoverflow.com/q/47280461/1485885).
  - Código no alcanzable: no hay combinación de parámetros posible que haga que un código se ejecute, por lo que es lo mismo a no haberlo puesto nunca. Por ejemplo, si tenemos un condicional (con su contraparte) que evalúa siempre a verdadero, por lo que nunca se ejecutaría el `else`.
  - Se usa una variable no inicializada: en C++ las variables no tienen un valor por defecto salvo que el constructor por defecto así lo haga, por lo que si el compilador detecta que una variable se está usando sin haber sido inicializada nos lanza un _warning_ para informarnos. Desafortunadamente hay al menos un escenario en el que el compilador no puede saber si esto es realmente un problema: cuando la variable se usa como argumento de salida de una función (pasada bien por referencia o como puntero); en este caso tendremos que ignorar el _warning_ si sabemos que el código es correcto.
  - Una declaración local oculta a una de nivel superior: por ejemplo, un parámetro de un método con el mismo nombre de una variable miembro, o una variable local respecto a una de un bloque padre; potencialmente podríamos estar queriendo usar la variable original en lugar de la nueva.
  - Parámetro o variable no usada: se ha definido una variable que no se usa en ningún momento. Puede ser, por ejemplo, debido a código antiguo o por un problema similar al anterior: tienen nombres semejantes y lo hemos escrito mal, usando la variable equivocada. A continuación detallo algunos casos en los que el _warning_ nos es útil:

#### Hemos metido la pata al escribir
Básicamente es código que compila correctamente, pero que tiene un error de lógica: estamos usando la variable que no es. Suele pasar cuando hacemos _copy-paste_, en funciones con variables de nombre similar, al actualizar código antiguo, etc. Por ejemplo:

```cpp
int computeDistance(float x, float y)
{
   const auto x2 = x * x;
   const auto y2 = x * x; // <
   return sqrt(x2 + y2);
}
```

#### Código basura
Suele ser producto de algún _refactoring_, actualización de código para ser compatible con una nueva API, o limpieza después de algunas pruebas temporales. Por ejemplo:

```cpp
bool checkFileIntegrity(const std::filesystem::path &amp;file_path, const std::string &amp;checksum)
{
  std::ifstream file(file_path);
  if (!file.is_open()) return false;

  const auto filename_length = file_path.filename().string().size(); // <

  return computeChecksum(file) == checksum;
}
```

Probablemente `filename_length` se usó durante una prueba o en una versión vieja del código pero ya no es necesaria.

### ¿Cuándo el _warning_ no es útil?
Ahora que conocemos el aviso que nos concierne, vamos a ver por qué nos interesaría ignorarlo, o lo que es mejor, indicarle al compilador que sabemos lo que estamos haciendo mediante el uso del atributo `[[maybe_unused]]`.

#### Argumento de función no utilizado
Éste es el escenario más frecuente (e importante) donde uso el `[[maybe_unused]]`. En un primer momento parece que la solución es obvia (eliminar el argumento que no se usa, ya que posiblemente la interfaz se ha complicado). Un ejemplo sería una aplicación de dibujo que define una serie de herramientas que heredan todas de la misma clase. Cuando el usuario hace clic sobre el lienzo, se llama al método `mouseClicked` de la herramienta activa, pasándole el botón del ratón presionado y la posición del cursor en coordenadas del lienzo:

```cpp
class BaseDrawingTool {
  // ...
protected:
  virtual void mouseClicked(int button, const std::tuple<int, int> &amp;pos_xy) = 0;
}

class ClearWholeCanvas : public BaseDrawingTool {
protected:
  virtual void mouseClicked(int button, const std::tuple<int, int> &amp;pos_xy) override
  {
    switch (button) {
    case LEFT: clearCanvas(m_foreground_color); break;
    case RIGHT: clearCanvas(m_background_color); break;
    }
  }

  void clearCanvas(const Color &amp;color) { ... }
}
```

Claramente, la herramienta `ClearWholeCanvas` no necesita conocer la posición exacta del cursor, únicamente qué botón se ha presionado. Como no se usa `pos_xy` el compilador generará un _warning_ (o un error si hemos activado la opción correspondiente).

##### Soluciones
La solución más obvia sería comentar el parámetro o simplemente dejarlo sin nombre

```cpp
virtual void mouseClicked(int button, const std::tuple<int, int> &amp;) ...
virtual void mouseClicked(int button, const std::tuple<int, int> &amp; /*pos_xy*/) ...
```

El problema acá es que se pierde la información semántica del parámetro: ¿qué significa?, ¿por qué está comentado?, si necesito la posición del cursor en el futuro ¿me acordaré que ya la tengo disponible?. El caso del comentario es algo mejor pero muchos ayudantes de código (como el IntelliSense) no interpretan estos comentarios cuando presentan los prototipos de las funciones, por lo que perdemos esa ayuda extra _in-situ_.

En todos estos casos tendríamos que referirnos a la clase padre para saber estos datos pero, además de tedioso, ¿y qué pasa si la clase padre también los tiene borrados? Situación típica en clases que dejan una implementación vacía por defecto:

```cpp
virtual void mouseClicked(int, const std::tuple<int, int> &amp;) {}
```

De nuevo, los comentarios serían de utilidad pero no tendríamos esa información en el ayudante contextual (IntelliSense, p.e.)

Podríamos también generar un NOOP (_no-operation_), que en general es de las mejores opciones y de hecho es implementado por muchas bibliotecas, como Qt con su [`Q_UNUSED`](https://doc.qt.io/qt-5/qtglobal.html#Q_UNUSED).

```cpp
virtual void mouseClicked(int button, const std::tuple<int, int> &amp;pos_xy) override
{
  (void)(pos_xy);
}
```

Sin embargo, la solución usando `[[maybe_unused]]` es más sencilla y explícita:

```cpp
virtual void mouseClicked(int button, [[maybe_unused]] const std::tuple<int, int> &amp;pos_xy) override { ... }
```

#### Variable o argumento de función no utilizado, a veces
Una variante del caso anterior es cuando el argumento (o variable local) es usada sólo bajo determinados escenarios de compilación. Pongamos como ejemplo una función que verifica la validez de un fichero de licencia, pero sólo si se está compilando para despliegue (las versiones de desarrollo se ejecutarían sin licencia):

```cpp
bool checkLicense(const std::filesystem::path &amp;license)
{
###ifdef PROJECT_IN_DEPLOYMENT_MODE
  std::ifstream file(license);

  // ...
###else
  return true;
###endif
}
```

Otras variantes de este ejemplo implicarían determinados parámetros que se usan sólo en un determinado sistema operativo, o en una arquitectura hardware específica.

##### Soluciones
El caso de `checkLicense` es diferente al anterior, ya que hay situaciones en las que sí se usa el argumento, por lo que la variable debe tener nombre.

La única solución hasta ahora ha sido generar un NOOP:

```cpp
bool checkLicense(const std::filesystem::path &amp;license)
{
###ifdef PROJECT_IN_DEPLOYMENT_MODE
  std::ifstream file(license);

  // ...
###else
  (license);

  return true;
###endif
}
```

La solución usando `[[maybe_unused]]` es, de nuevo, muy explícita:

```cpp
bool checkLicense([[maybe_unused]] const std::filesystem::path &amp;license)
{
###ifdef PROJECT_IN_DEPLOYMENT_MODE
  std::ifstream file(license);

  // ...
###else
  return true;
###endif
}
```

#### Cumplir con un `[[nodiscard]]`
El `[[nodiscard]]` es otro atributo de C++17 que indica al compilador que genere un _warning_ si el valor de retorno de una función no es tenido en cuenta (por ejemplo, para verificar que se comprueba la validez de una operación, evitar _resource-leaks_, etc). Se puede cumplir con esta restricción simplemente asignando el valor de retorno a una variable, aunque obviamente ahora el compilador nos dirá que dicha variable no está siendo usada; parafraseando a Obi-Wan: _se suponía que debías destruirlos, no unirte a ellos_.

Como el ejemplo es muy directo y ya hemos expuesto bastante el _warning_, pasaré directamente a la solución:

```cpp
[[nodiscard]] bool foo() { ... }

void bar()
{
  [[maybe_unused]] const auto ret = foo();
}
```
