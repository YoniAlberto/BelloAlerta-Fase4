# Bello Alerta – Prototipo funcional Fase 4

Prototipo académico del proyecto **Desarrollo de un sistema web georreferenciado para el reporte ciudadano y apoyo a la gestión de riesgos por movimientos en masa en el municipio de Bello, Antioquia**.

> El sistema es una herramienta académica de apoyo informativo. No emite alertas oficiales, no diagnostica estabilidad de laderas y no sustituye a las entidades competentes.

## Funcionalidades

- Inicio de sesión por rol (ciudadano / administrador).
- Registro de reportes con categoría, descripción, sector, prioridad percibida y coordenadas.
- Evidencia fotográfica opcional.
- Consulta de reportes y estado.
- Visualización georreferenciada en mapa demostrativo.
- Panel administrativo con filtros y cambio de estado.
- Historial de cambios para trazabilidad.
- Estadísticas básicas.
- Diseño responsive.

## Credenciales de demostración

- Ciudadano: `yony@belloalerta.local` / `Ciudadano123*`
- Administrador: `admin@belloalerta.local` / `Admin123*`

## Opción A – ejecución rápida sin instalar dependencias

Requiere Node.js 18 o superior.

```bash
node server-demo.js
```

Abrir `http://localhost:3000`.

Este modo utiliza un archivo JSON local y existe únicamente para facilitar la demostración académica.

## Opción B – arquitectura definida en el documento maestro

Tecnologías: Node.js + Express + PostgreSQL/PostGIS.

```bash
npm install
```

Crear la base de datos con `db/schema.sql`, configurar `DATABASE_URL` y ejecutar:

```bash
npm run seed
npm start
```

### Con Docker Compose

```bash
docker compose up
```

El contenedor de base de datos usa PostgreSQL/PostGIS y el servicio web instala dependencias, crea datos de demostración y levanta el sistema en el puerto 3000.

## Pruebas automatizadas del modo demostrativo

```bash
npm test
```

Las pruebas verifican: salud del servicio, autenticación, creación de reporte, consulta, actualización administrativa y trazabilidad.


Subir todo el proyecto excepto los archivos ignorados en `.gitignore`. Cada integrante debe realizar commits identificables para dejar evidencia de trabajo colaborativo.
