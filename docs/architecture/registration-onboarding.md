# Registro y onboarding por tipo de cuenta

## Objetivo

Separar la autenticación de Firebase Auth, la información adicional del usuario
y la habilitación de permisos profesionales. Elegir "Psicólogo/a" durante el
registro expresa una intención, pero nunca concede el rol `psychologist`.

## Flujo

1. El usuario selecciona `patient` o `psychologist` en `/registro`.
2. Se autentica con Google o con correo y contraseña.
3. `finalizeRegistration` crea o actualiza `users/{uid}` y conserva roles
   existentes.
4. El router envía al usuario a `/onboarding/paciente` o
   `/onboarding/psicologo`.
5. El paciente completa sus datos básicos y continúa a la encuesta.
6. El psicólogo envía una solicitud y ve el estado pendiente.
7. Un administrador aprueba o rechaza la solicitud desde la vista admin.
8. Al aprobar, una transacción crea el perfil en `therapists`, añade el rol
   `psychologist` y actualiza la solicitud.

## Estados

El documento `users/{uid}` utiliza:

- `registrationIntent`: `patient` o `psychologist`.
- `onboardingStatus`: `pending` o `complete`.
- `patientOnboardingStatus`: `pending` o `complete`.
- `professionalAccessStatus`: `draft`, `pending`, `approved` o `rejected`.
- `roles`: lista de permisos efectivos.

Todas las cuentas nuevas conservan `patient` como acceso base. Una cuenta
profesional aprobada utiliza `["patient", "psychologist"]`, lo que permite
alternar vistas sin mezclar la autorización de cada recorrido.

## Operaciones sensibles

Las siguientes Cloud Functions callable son el único punto de escritura para
el onboarding y las solicitudes profesionales:

- `finalizeRegistration`
- `completePatientOnboarding`
- `submitPsychologistApplication`
- `reviewPsychologistApplication`

La aprobación profesional se ejecuta dentro de una transacción de Firestore.
El cliente nunca puede asignarse el rol `psychologist` ni crear directamente un
perfil público de terapeuta.

## Compatibilidad

Los usuarios existentes sin `registrationIntent` se consideran perfiles
legados completos y no son obligados a repetir el onboarding. Si una cuenta
existente entra por el registro y elige el recorrido profesional, puede iniciar
la solicitud sin perder sus roles actuales.
