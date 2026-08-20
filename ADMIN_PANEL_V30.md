# GMAC V30 · Panel administrativo

Ruta privada: `/admin`

Seguridad:
- Login contra `ADMIN_SECRET` en Vercel.
- Cookie HttpOnly + Secure + SameSite=Strict de 12 horas.
- `ADMIN_SECRET` no se escribe en HTML/JS ni se guarda en localStorage.
- Acciones privadas pasan Vercel → Apps Script usando el secreto de servidor.

Funciones:
- Crear edición + códigos.
- Activar torneo (VIGENTE + inscripciones abiertas).
- Abrir/cerrar inscripciones.
- Regenerar/exportar códigos.
- Ver participantes.
- Preparar fixture.
- Guardar resultados y penales.
- Finalización automática por resultado decisivo.
- Finalización manual de emergencia.

Vercel Functions: 8 (compatible con Hobby).

Para habilitar snapshot privado, códigos, abrir/cerrar inscripciones y finalización manual, reemplaza Apps Script por el archivo V30 entregado junto con esta versión y actualiza la implementación web a una nueva versión.
