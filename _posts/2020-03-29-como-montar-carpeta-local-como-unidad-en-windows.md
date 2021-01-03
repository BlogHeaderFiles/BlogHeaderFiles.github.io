---
title: Cómo montar una carpeta local como unidad en Windows
date: 2020-03-29T09:06:21+02:00
author: Carlos Buchart
layout: post
permalink: /2020/03/29/como-montar-carpeta-local-como-unidad-en-windows/
image: /assets/images/featured/map_network_drive.jpg
categories:
  - programación
---
Llevo un par de años trabajando a distancia y, aunque no pretendo abrir un especial de teletrabajo, me gustaría compartir un pequeño cambio que hice en mi sistema para ajustarme mejor a esa situación y poder agilizar mi día a día. No es ningún secreto pero igual ayuda a los que hayáis tenido que cambiar al _remote working_.

Nuestro flujo de compilación incluye trabajar continuamente con repositorios (en donde se ven los beneficios de usar un sistema de control de versiones distribuido como Git), y descargar datos desde unidades de red, las cuales tenemos montadas como discos. Además, nuestro día a día incluye consultar continuamente ficheros en dichas unidades. Todos estos accesos pueden llegar a ser bastante más lentos cuando se trabaja en remoto (estoy asumiendo, claro está, que contamos con una VPN). Por simplicidad, asumiré una única unidad de red montada en el disco Z:.

Debido a esto, después de un tiempo preferí _cachear_ los ficheros que más uso en una carpeta local, usando una herramienta de sincronización para mantenerlos al día. Para no tener que cambiar todos los _scripts_ de compilación que hacen referencia a Z: a mi nueva ruta local, cambié el montaje de Z: a otro (X:), y monté la carpeta local como el nuevo disco Z:.

Para montar la carpeta como disco tenemos cualquiera de las siguientes opciones:

- Usando la línea de comandos: `subst Z: D:\remote\Z`. Esta opción tiene la _pega_ de que hay que ejecutar el comando cada vez que se reinicia el sistema.
- Usando una aplicación de terceros, en este caso [Visual Subst](https://www.ntwind.com/software/visual-subst.html) que nos ayudará en este proceso, además de añadir una opción para aplicar el cambio en cada reinicio.
- Trabajando directamente con el Registro de Windows (la opción que uso). Ir a `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\DOS Devices` y añadir una nuevo valor de cadena con el nombre de la unidad (`Z:` en nuestro caso) y como valor la ruta de la carpeta (precedida de `\DosDevices\`), por ejemplo: `\DosDevices\D:\remote\Z`. Después de esto basta con reiniciar el ordenador para ver los cambios.

P.D.: dependiendo de la configuración de la VPN, especialmente si fue montada específicamente para esta ocasión (lo que puede llevar a una configuración incompleta), puede que no tengáis acceso a los nombres de dominio internos de vuestra corporación. En ese caso sugiero le echéis un ojo a [este artículo de mi compañero Rubén de Celis en Mascando Bits](https://mascandobits.es/tips/problemas-de-acceso-a-una-ip-o-dominio-publico-desde-una-red-lan/).

Espero os sirva en estos días de confinamiento o cuarentena (dependiendo desde dónde me leáis). Mientras tanto, yo me sigo quedando en casa ;).