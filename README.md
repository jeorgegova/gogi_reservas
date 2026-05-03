# Reservas de Áreas Comunes

Sistema de gestión de reservas para áreas comunes de edificios residenciales o comerciales. Permite a los usuarios reservar espacios como salones de eventos, gimnasios, piscinas, etc., y a los administradores gestionar las reservas, áreas y usuarios.

## 🚀 Tecnologías

- **Frontend:** React 18 + TypeScript + Vite
- **Estado y autenticación:** Supabase (auth, base de datos en tiempo real)
- **Estilos:** Tailwind CSS
- **Linting:** ESLint con reglas de TypeScript avanzadas
- **Iconos:** React Icons (implícito en los componentes)

## ✨ Características

### Para usuarios comunes:
- 🔐 Autenticación segura (email/password, recuperación de contraseña)
- 📅 Reserva de áreas comunes con selección de fecha y hora
- 📋 Visualización de mis reservas próximas y pasadas
- 👤 Gestión de perfil de usuario
- 💳 Simulación de pagos (modo mock)

### Para administradores:
- 🏢 Gestión de áreas comunes (crear, editar, eliminar)
- 👥 Gestión de usuarios (ver roles, cambiar estados)
- 📊 Dashboard con estadísticas y reservas recientes
- 📢 Sistema de anuncios/notificaciones
- 📅 Gestión completa de todas las reservas
- 🔍 Filtros y búsquedas avanzadas

## 🛠️ Instalación y configuración

### Prerrequisitos
- Node.js (v16 o superior)
- npm o yarn
- Una cuenta en [Supabase](https://supabase.io/)

### Pasos para ejecutar localmente

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd GoGi_Reservas
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   # o
   yarn
   ```

3. **Configurar variables de entorno**
   Copia `.env.example` a `.env` y completa los valores:
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
   ```

4. **Configurar la base de datos en Supabase**
   - Ejecuta el esquema SQL en `supabase-schema.sql` en tu proyecto de Supabase
   - Esto creará las tablas necesarias: areas, reservas, usuarios, anuncios, etc.

5. **Iniciar el servidor de desarrollo**
   ```bash
   npm run dev
   # o
   yarn dev
   ```

   La aplicación estará disponible en `http://localhost:5173`

## 📦 Scripts disponibles

- `npm run dev` - Inicia el servidor de desarrollo con Vite
- `npm run build` - Compila la aplicación para producción
- `npm run preview` - Vista previa de la build de producción
- `npm run lint` - Ejecuta ESLint para revisar el código

## 🧩 Estructura del proyecto

```
src/
├── assets/           # Recursos estáticos
├── components/       # Componentes reutilizables
│   ├── layout/       # Layouts principales (DashboardLayout)
│   └── ui/           # Componentes UI básicos (button, input, label, card)
├── hooks/            # Hooks personalizados (useAuth)
├── lib/              # Configuraciones y utilities (supabase, utils)
├── pages/            # Páginas de la aplicación
│   ├── admin/        # Panel de administración
│   │   ├── AdminAreas.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminNotices.tsx
│   │   ├── AdminReservations.tsx
│   │   └── AdminUsers.tsx
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── ForgotPassword.tsx
│   ├── Maintenance.tsx
│   ├── MyReservations.tsx
│   ├── NewReservation.tsx
│   ├── PaymentMock.tsx
│   └── Profile.tsx
├── App.tsx           # Componente raíz
├── main.tsx          # Entrada de la aplicación
└── index.css         # Estilos globales
```

## 🔐 Autenticación

La aplicación utiliza Supabase Auth para la gestión de usuarios. Los flujos de autenticación incluyen:
- Registro de nuevos usuarios
- Inicio de sesión con email y password
- Recuperación de contraseña
- Sesiones persistentes

## 🗄️ Base de datos

El esquema de la base de datos (en `supabase-schema.sql`) incluye:

- **users:** Información de los usuarios (rol, estado, etc.)
- **areas:** Áreas comunes disponibles para reserva
- **reservations:** Reservas realizadas por los usuarios
- **notices:** Anuncios o notificaciones para los usuarios
- **payment_mocks:** Registro de pagos simulados (para testing)

## 🎨 Personalización

Los estilos están basados en Tailwind CSS. Puedes modificar:
- `tailwind.config.js` para cambiar colores, fuentes, breakpoints, etc.
- `src/index.css` para estilos globales adicionales
- Los componentes en `src/components/ui/` para ajustar la apariencia de elementos básicos

## 🤝 Contribución

1. Haz un fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📧 Contacto

Para preguntas o soporte, por favor abre un issue en el repositorio.
