---
title: Breve introducción al uso de RSA con OpenSSL
date: 2019-03-12T09:54:38+01:00
author: Carlos Buchart
layout: post
permalink: /2019/03/12/breve-introduccion-al-uso-de-rsa-con-openssl/
excerpt: Breve tutorial acerca del uso de OpenSSL, generación de claves, firma y verificación de ficheros.
categories: c openssl rsa
---
De cara a un proyecto que he tenido que hacer en estos días, me he topado con la necesidad de utilizar [RSA](https://es.wikipedia.org/wiki/RSA), el cual no había tenido el placer de probar hasta la semana pasada.

Dejo acá un poco mi experiencia y resumen de uso, tanto en la línea de comandos como en el uso de la biblioteca de programación.

Nota: lo he usado sólo en entorno Windows, por lo que no estoy seguro si la sintaxis sea exactamente igual.

## Generar el par de claves pública y privada

Primero generamos la clave privada en formato [PEM](https://www.cryptosys.net/pki/rsakeyformats.html) (el número al final es el tamaño de la clave, si se omite será de 512 bits):

```bash
openssl genrsa -out private.pem 1024
```

Ahora, extraemos la clave pública:

```bash
openssl rsa -pubout -in private.pem -out public.pem
```

## Firmar ficheros

Para el proyecto que mencioné necesitaba verificar la autenticidad de ciertos ficheros. Para ello decidí utilizar un protocolo de verificación bastante tradicional consistente en firmar los ficheros en cuestión con la clave privada y al recibir los ficheros desencriptarlos con la clave pública y comprobar que el contenido coincide con el del fichero sin firmar. Ambos pasos son necesarios (desencriptar y comprobar) para evitar que versiones correctamente firmadas, pero no las deseadas, puedan enviarse en lugar del fichero correcto.

Para firmar un fichero:

```bash
openssl rsautl -sign -in plain.txt -out signed.txt -inkey private.pem
```

Podemos comprobar nosotros mismos que el fichero firmado es correcto usando:

```bash
openssl rsautl -verify -in signed.txt -inkey public.pem -pubin
```

Se debería mostrar el contenido del fichero. En caso de que el fichero no estuviese firmado con la clave privada OpenSSL dará un error.

## Verificar el fichero firmado utilizando C/C++

Acá fue donde más problemas tuve y lo que me llevó a escribir este post, de forma que otros puedan aprovecharse de mis golpes al aire. Haré la menor cantidad de suposiciones posibles a fin de que esté todo claro. Sólo asumiré que las rutas de los ficheros de cabeceras y todo eso está configurado.

Ficheros de cabecera de OpenSSL necesarios:

```cpp
#include <openssl/err.h>
#include <openssl/bio.h>
#include <openssl/pem.h>
#include <openssl/evp.h>
#include <openssl/rsa.h>
```

Al cargar la clave pública, contemplo dos opciones (aunque soy partidario de la segunda):

- Desde un fichero. El problema está en que fácilmente pueden cambiar la clave pública por otra y falsificar los ficheros firmados. El código sería:

```cpp
  BIO *pubkeyin = BIO_new(BIO_s_file());
  if (BIO_read_filename(pubkeyin, "public.pem") <= 0) {
    // error reading public key
  }
```

- Desde una cadena de caracteres. Esta opción es más genérica y permite, además de cargar la cadena desde un fichero, incrustarla en el ejecutable o descargarla desde un servidor, por ejemplo. En el siguiente ejemplo `public_key_str` es una cadena de caracteres de tipo `char[]`. Nota importante si se incrusta la cadena de caracteres, y es el incluir los saltos de línea al copiar la clave al código fuente.

```cpp
  char public_key_str[] = "-----BEGIN PUBLIC KEY-----\n"
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDMe9XS8VDg6H5dgqoWeJGhwJw4\n"
  "wz4YZfj1AZnSjWJyqnVnCf4YWolwZ0xGKuR6hktsCYj759AADkRx9/2+SwFGb0pE\n"
  "6kdxeIL8V/yNSN6LJB84+LmVLjdP9or/hZ/l/XyAc9LT8q0Dl6p8mNzOoTe7e6CJ\n"
  "pz8UCfFig0TGGzmRbwIDAQAB\n"
  "-----END PUBLIC KEY-----\n";

  BIO *pubkeyin = BIO_new_mem_buf(_public_key, strlen(public_key_str));
```

Extraer la clave pública y preparar las estructuras de datos necesarias:

```cpp
EVP_PKEY *pkey = PEM_read_bio_PUBKEY(pubkeyin, NULL, NULL, NULL);
RSA *rsa = EVP_PKEY_get1_RSA(pkey);
EVP_PKEY_free(pkey);
```

El contenido del fichero firmado deberá estar en una cadena de caracteres de tipo `unsigned char[]`:

```cpp
unsigned char *rsa_in = (unsigned char *)OPENSSL_malloc(keysize * 2);
BIO *in = BIO_new_file(_targetURL.toLocal8Bit().data(), "rb");
int rsa_inlen = BIO_read(in, rsa_in, keysize * 2);
```

Finalmente, desencriptar el fichero firmado (`RSA_PKCS1_PADDING` es el valor estándar de padding al firmar ficheros):

```cpp
unsigned char *rsa_out = (unsigned char *)OPENSSL_malloc(keysize + 1);
int rsa_outlen = RSA_public_decrypt(rsa_inlen, rsa_in, rsa_out, rsa, RSA_PKCS1_PADDING);
if (rsa_outlen <= 0)
  // Error, fichero firmado incorrectamente
  // Acá su código de error
else {
  // Importante convertir la cadena leída en una cadena de caracteres válida para C
  rsa_out[rsa_outlen] = 0;
}
```

Para comprobar la validez del fichero, habrá que comprobarlo contra el contenido esperado (en este caso almacenado en la variable `valid_str`):

```cpp
bool valid = (strcmp((char *)rsa_out, valid_str) == 0);
```

Al finalizar, borrar las estructuras creadas. Omitiré las creadas con métodos tradicionales y dejaré las creadas mediante OpenSSL:

```cpp
OPENSSL_free(rsa_out);
RSA_free(rsa);
BIO_free(pubkeyin);
```
