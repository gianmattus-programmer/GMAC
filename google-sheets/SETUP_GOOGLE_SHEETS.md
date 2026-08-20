# GMAC · Google Sheets + biblioteca de copas en Drive

## 1. Control Center
Usa `GMAC_CONTROL_CENTER_DRIVE.xlsx` o el Google Sheet nativo creado para GMAC.

Hojas principales:
- DASHBOARD
- COMPETICIONES
- TORNEOS
- CODIGOS
- INSCRIPCIONES
- PARTIDOS
- GANADORES
- MULTIMEDIA
- CONFIG

## 2. Apps Script
En el Google Sheet abre **Extensiones → Apps Script**.
Borra el contenido inicial, pega `Code.gs` completo y guarda.

Ejecuta manualmente una vez:

`setupGMAC()`

Google pedirá permisos de Google Sheets y Google Drive. Acepta los permisos con la cuenta propietaria de GMAC.

`setupGMAC()` hace lo siguiente:
1. Repara/crea las hojas y encabezados requeridos.
2. Guarda el Spreadsheet ID.
3. Configura la biblioteca de copas.
4. Busca los AVIF actuales en Drive.
5. Completa en `COMPETICIONES`:
   - `copa_portada_file_id`
   - `copa_fixture_file_id`
   - `copa_portada_url`
   - `copa_fixture_url`
6. Intenta dejar los archivos visibles con enlace para que Vercel pueda mostrarlos.

También puedes ejecutar en cualquier momento:
**GMAC Control Center → Sincronizar biblioteca de copas**.

## 3. Biblioteca ya configurada
Carpeta raíz:
`1hZAdbnpiClB9LF2bYARk8Dy58uTHWSJl`

Subcarpetas:
- COMPARTIDAS: `1riwk6_IVCJOmY5dJ_cV4j5kFmetQd4v9`
- FC Mobile / PORTADAS: `1LqQsgJMdpSGAeOy6pw32ukmIeBkUmtbX`
- FC Mobile / FIXTURE: `1cdH-AVsZQ68laqJ2OqGmU_rc1dMhVV6f`
- eFootball / PORTADAS: `123xu7eod32Bdwz0M68IlcobiqmmpLfKO`
- eFootball / FIXTURE: `1cqu-Fm16LegEYOLebEDjsj6GIEBIAvK_`

Todas las copas nuevas deben ser AVIF.

## 4. Nueva competición inédita
1. Sube primero la copa en AVIF a Google Drive.
2. En el Sheet abre **GMAC Control Center → Nueva competición**.
3. Completa juego, nombre, participantes y formato.
4. Pega el enlace o File ID del AVIF.
5. El script mueve el archivo a la carpeta de PORTADAS correcta, lo renombra de forma segura y guarda File ID + URL.
6. Para una competición nueva, la misma imagen se usa inicialmente como portada y fixture. Si luego quieres una variante minimalista para fixture, se puede asignar en las columnas correspondientes y volver a sincronizar.

## 5. Secretos
En Apps Script → Configuración del proyecto → Propiedades de la secuencia de comandos crea:
- `API_SECRET`
- `ADMIN_SECRET`

Usa valores largos y aleatorios. No los guardes en GitHub.

## 6. Deploy de Apps Script
Implementar → Nueva implementación → Aplicación web.

- Ejecutar como: tú
- Acceso: según tu configuración de producción

Copia la URL terminada en `/exec`.

## 7. Vercel
Configura estas variables en Vercel:
- `GOOGLE_APPS_SCRIPT_URL`
- `SHEETS_API_SECRET`
- `ADMIN_SECRET`

Después haz un redeploy.

## 8. Comprobación antes de producción
En `COMPETICIONES`, las columnas de File ID y URL no deben quedar vacías después de sincronizar.

Prueba recomendada:
1. Crear una nueva competición de 8 participantes.
2. Crear Edición 1.
3. Confirmar 8 códigos únicos.
4. Activar torneo.
5. Inscribir 8 participantes.
6. Generar fixture.
7. Registrar cuartos, semifinal y final.
8. Confirmar campeón, segundo lugar, premios e historial.

## Permisos públicos de imágenes
El Apps Script intenta usar `ANYONE_WITH_LINK`. Si tu política de Google Workspace no lo permite, deberás configurar manualmente la carpeta/biblioteca para que los trofeos puedan ser visualizados por visitantes de la web.
