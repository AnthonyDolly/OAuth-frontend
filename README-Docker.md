# OAuth Frontend - Docker Setup

Esta guía explica cómo ejecutar la aplicación Angular OAuth-frontend usando Docker.

## Requisitos previos

- Docker instalado en tu sistema
- Docker Compose instalado

## Estructura de archivos creados

- `Dockerfile` - Configuración multi-stage para build y producción
- `docker-compose.yml` - Orquestación de servicios
- `nginx.conf` - Configuración del servidor web
- `.dockerignore` - Archivos excluidos del build
- `Makefile` - Automatización de tareas Docker comunes

## Construir y ejecutar la aplicación

### Opción 1: Usando Make (Recomendado)

```bash
# Construir e iniciar la aplicación
make build
make up

# O directamente
make rebuild

# Detener la aplicación
make down
```

### Opción 2: Usando Docker Compose directamente

```bash
# Construir y ejecutar la aplicación
docker compose up --build

# Ejecutar en segundo plano
docker compose up -d --build

# Detener la aplicación
docker compose down
```

### Opción 3: Usando Docker directamente

```bash
# Construir la imagen
docker build -t oauth-frontend .

# Ejecutar el contenedor
docker run -p 4200:80 --name oauth-frontend-container oauth-frontend
```

## Acceder a la aplicación

Una vez que el contenedor esté ejecutándose, puedes acceder a la aplicación en:
- **http://localhost:4200**

## Configuración del puerto

Por defecto, la aplicación está configurada para ejecutarse en el puerto 4200. Si necesitas cambiar el puerto, modifica el archivo `docker-compose.yml`:

```yaml
ports:
  - "TU_PUERTO:80"
```

## Variables de entorno

Si necesitas configurar variables de entorno, puedes agregarlas al archivo `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - API_URL=http://tu-api-url
```

## Comandos útiles

### Usando Make (Recomendado)

```bash
# Comandos principales
make build     # Construir imagen desde cero
make up        # Iniciar aplicación
make down      # Detener aplicación
make restart   # Reiniciar aplicación
make logs      # Ver logs en tiempo real
make shell     # Acceder al contenedor
make status    # Ver estado de contenedores
make clean     # Limpiar recursos no utilizados

# Comandos de desarrollo
make dev-build # Construir para desarrollo
make dev-up    # Iniciar en modo desarrollo
make dev-down  # Detener desarrollo

# Comandos adicionales
make rebuild   # Reconstruir completamente
make config    # Verificar configuración
make help      # Mostrar ayuda completa
```

### Usando Docker Compose directamente

```bash
# Ver logs del contenedor
docker compose logs -f

# Acceder al contenedor
docker compose exec oauth-frontend sh

# Reconstruir después de cambios
docker compose up --build --force-recreate

# Limpiar imágenes no utilizadas
docker image prune -f
```

## Producción

Para despliegue en producción:

1. Asegúrate de que las variables de entorno estén correctamente configuradas
2. Usa un dominio personalizado configurando nginx apropiadamente
3. Considera usar un reverse proxy como Traefik o nginx para SSL

## Integración con backend

Si necesitas conectar con el backend OAuth-backend, asegúrate de que ambos estén en la misma red Docker:

```yaml
networks:
  oauth-network:
    external: true
```

## Solución de problemas

### Error de puerto ocupado
```bash
# Cambiar el puerto en docker-compose.yml
ports:
  - "4201:80"
```

### Error de permisos
```bash
# Asegurarse de que Docker tenga permisos adecuados
sudo usermod -aG docker $USER
```

### Cache issues
```bash
# Limpiar cache y reconstruir (usando Make)
make clean
make rebuild

# O directamente
docker system prune -f
docker compose up --build --force-recreate
```

## Makefile - Automatización

El proyecto incluye un `Makefile` completo que facilita todas las operaciones comunes de Docker:

### Ventajas del Makefile:

- **Portabilidad**: Funciona en cualquier sistema con make instalado
- **Autocompletado**: Los targets se pueden autocompletar en la terminal
- **Documentación integrada**: `make help` muestra todos los comandos disponibles
- **Colores**: Output coloreado para mejor legibilidad
- **Validaciones**: Verifica que Docker esté corriendo antes de ejecutar comandos
- **Dependencias**: Maneja dependencias entre tareas automáticamente

### Targets principales:

| Comando | Descripción |
|---------|-------------|
| `make build` | Construye la imagen desde cero |
| `make up` | Inicia la aplicación en segundo plano |
| `make down` | Detiene la aplicación |
| `make logs` | Muestra logs en tiempo real |
| `make shell` | Accede al shell del contenedor |
| `make clean` | Limpia recursos no utilizados |
| `make rebuild` | Reconstruye completamente la aplicación |

### Ejemplo de uso típico:

```bash
# Primera vez
make build
make up

# Después de cambios en el código
make rebuild

# Desarrollo
make dev-up

# Limpieza
make clean
```

## Optimizaciones incluidas

- **Multi-stage build**: Reduce el tamaño final de la imagen
- **Gzip compression**: Comprime respuestas HTTP
- **Cache headers**: Optimiza carga de assets estáticos
- **Security headers**: Mejora la seguridad
- **SPA routing**: Maneja correctamente las rutas de Angular
- **Makefile automation**: Facilita todas las operaciones Docker
