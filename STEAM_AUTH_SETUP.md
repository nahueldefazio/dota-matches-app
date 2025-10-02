# Configuración de Autenticación con Steam

Este proyecto incluye un sistema completo de autenticación con Steam OpenID que guarda la información del usuario en MongoDB Atlas.

## 🚀 Características

- ✅ Autenticación segura con Steam OpenID
- ✅ Detección automática de IP y país del usuario
- ✅ Almacenamiento en MongoDB Atlas
- ✅ Anonimización opcional de IPs
- ✅ Interfaz React integrada
- ✅ Despliegue listo para Vercel

## 📋 Configuración Requerida

### 1. Steam API Key

1. Ve a [Steam Web API Key](https://steamcommunity.com/dev/apikey)
2. Ingresa tu dominio (ej: `localhost` para desarrollo, tu dominio de Vercel para producción)
3. Copia tu API Key

### 2. MongoDB Atlas

1. Crea una cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crea un cluster gratuito
3. Crea un usuario de base de datos
4. Obtén la connection string

### 3. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Steam API Configuration
STEAM_API_KEY=tu_steam_api_key_aqui

# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/dota-matches?retryWrites=true&w=majority

# Optional: IP Anonymization
ANONYMIZE_IP=true
```

### 4. Variables de Entorno en Vercel

En el panel de Vercel, ve a tu proyecto → Settings → Environment Variables:

```
STEAM_API_KEY = tu_steam_api_key_aqui
MONGODB_URI = tu_mongodb_connection_string
ANONYMIZE_IP = true
```

## 🏗️ Estructura del Proyecto

```
├── api/
│   └── auth/
│       ├── steam.js          # Inicio de autenticación
│       └── steam/
│           └── callback.js    # Callback de Steam
├── src/
│   ├── components/
│   │   ├── SteamAuth.jsx     # Componente de autenticación
│   │   └── DotaMatches.jsx   # Componente principal actualizado
│   └── hooks/
│       └── useSteamAuth.js   # Hook personalizado
└── vercel.json               # Configuración de Vercel
```

## 🔄 Flujo de Autenticación

1. **Usuario hace clic en "Iniciar sesión con Steam"**
2. **Redirección a Steam** → `/api/auth/steam`
3. **Usuario se autentica en Steam**
4. **Steam redirige de vuelta** → `/api/auth/steam/callback`
5. **Procesamiento del callback:**
   - Extrae SteamID64 de la respuesta
   - Obtiene perfil del usuario desde Steam API
   - Detecta IP y país del usuario
   - Guarda/actualiza datos en MongoDB
   - Retorna JSON con información del usuario

## 📊 Datos Almacenados en MongoDB

```json
{
  "steamID": "76561198045611095",
  "name": "Usuario de Steam",
  "avatar": "https://steamcdn-a.akamaihd.net/...",
  "ip": "192.168.xxx.xxx",
  "country": "AR",
  "createdAt": "2025-10-02T21:00:00.000Z",
  "lastLogin": "2025-10-02T21:00:00.000Z"
}
```

## 🎯 Uso en React

### Hook useSteamAuth

```javascript
import { useSteamAuth } from '../hooks/useSteamAuth';

function MyComponent() {
  const {
    user,
    loading,
    error,
    loginWithSteam,
    isAuthenticated
  } = useSteamAuth();

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;
  if (isAuthenticated) {
    return <div>¡Hola {user.name}!</div>;
  }
  
  return (
    <button onClick={loginWithSteam}>
      Iniciar sesión con Steam
    </button>
  );
}
```

### Componente SteamAuth

```javascript
import SteamAuth from './components/SteamAuth';

function App() {
  return (
    <div>
      <SteamAuth />
      {/* Resto de tu aplicación */}
    </div>
  );
}
```

## 🔧 Desarrollo Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp env.example .env.local
   # Editar .env.local con tus valores
   ```

3. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

4. **Probar autenticación:**
   - Ve a `http://localhost:3000`
   - Haz clic en "Iniciar sesión con Steam"
   - Completa el proceso de autenticación

## 🚀 Despliegue en Vercel

1. **Conectar repositorio a Vercel**
2. **Configurar variables de entorno** (ver sección anterior)
3. **Desplegar:**
   ```bash
   vercel --prod
   ```

## 🛡️ Seguridad

- ✅ Steam OpenID es seguro y confiable
- ✅ IPs pueden ser anonimizadas
- ✅ No se almacenan contraseñas
- ✅ Conexión segura a MongoDB Atlas
- ✅ Variables de entorno protegidas

## 🐛 Solución de Problemas

### Error: "STEAM_API_KEY no configurado"
- Verifica que la variable de entorno esté configurada
- Asegúrate de usar el nombre correcto: `STEAM_API_KEY`

### Error de conexión a MongoDB
- Verifica la connection string
- Asegúrate de que la IP esté en la whitelist de MongoDB Atlas
- Verifica que el usuario tenga permisos de lectura/escritura

### Error de dominio en Steam
- Asegúrate de que el dominio esté registrado en tu Steam API Key
- Para desarrollo local, usa `localhost`
- Para producción, usa tu dominio de Vercel

## 📝 Notas Adicionales

- El sistema detecta automáticamente el Steam ID del usuario autenticado
- Los datos se actualizan en cada login (lastLogin)
- La IP se detecta usando headers de Vercel
- El país se detecta usando `x-vercel-ip-country`
- Compatible con el sistema existente de Dota Matches

## 🤝 Contribuciones

Si encuentras algún problema o tienes sugerencias, por favor:

1. Abre un issue en GitHub
2. Describe el problema detalladamente
3. Incluye logs de error si es posible
4. Proporciona pasos para reproducir el problema

¡Disfruta analizando tus partidas de Dota 2! 🎮
