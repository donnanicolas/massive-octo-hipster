# massive-octo-hipster
El nombre del repositorio es fue generado por github.

Esta aplicación es un trabajo para la materia Monitoreo y Gestión de Redes de la carrera de Ingeniería en Infomática de la Universidad de Mendoza.
Bajo ningún concepto se debe utilizar esta aplicación en producción, ya que puede generar grandes problemas en un servidor al matar procesos, repriorizarlos o crear nuevos.

# Instalación
Se debe contar con nodejs y npm instalados

En ubuntu

> (sudo) apt-get install nodejs npm

En algunas distribuciones el paquete se llama **node**.

Luego, en el directorio del repositorio, instalar las dependencias

> npm install

Luego simplemente hay que correrlo

> nodejs app.js


# Rutas
La aplicación cuenta con 5 rutas

## GET /ps
La misma devuelve el resultado de:

> ps -Ao "user pid ppid %cpu %mem vsz rss tty stat start time comm

Se utiliza este comando en lugar de **ps faxu** por las inconsistencias de la opción *f* en distintos entornos.
El resultado ha sido parseado y pasado a json.

## GET /users
Devuelve los usuarios que están corriendo procesos en el sistema

## POST /renice
Esta ruta simplemente corre el comando **renice**. Recibe como argumento *increment* y *pid*. Siendo *pid* el id del proceso y *increment* el valor a incrementar.
El comando **renice** requiere permisos especiales, por lo tanto solo podrá ser utilizado si el proceso del servidor tiene permisos para hacerlo.

## POST /run
Esta ruta corre el comando que se pasa como parametro *cmd*. Es una funcionalidad peligrosa ya que se puede correr virtualmente cualquier comando.
Para evitar que se utilice para el mal se puede configurar que comandos ignorar agregandolos al config file del programa bajo run.ignore.
Para correr el comando, se utiliza la funcionalidad **process#spawn** de nodejs, que abre un streams sobre stdout y stderr del proceso.
Como no sabemos de antemano el tiempo que va a llevar el proceso y no podemos utilizar el stream debido a que no estamos usando streaming, solo se devuelve el *pid*

## POST /kill
Esta ruta envia un *SIGTERM* al proceso bajo con el *pid* enviado como argumento.
Para evitar problemas si el *pid* es el mismo proceso o es padre del proceso del servidor no se puede matar.
