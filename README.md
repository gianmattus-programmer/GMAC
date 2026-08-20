# GMAC · Producción con Google Sheets + Vercel

Esta versión conserva el diseño actual y cambia la parte funcional para trabajar con una base administrada en Google Sheets.

## Arquitectura

Usuario → Web en Vercel → `/api/*` → Google Apps Script → Google Sheets

El navegador nunca recibe la clave privada de Sheets.

## Archivos importantes

- `google-sheets/GMAC_CONTROL_CENTER.xlsx`: plantilla premium para importar a Google Sheets.
- `google-sheets/Code.gs`: automatizaciones y API de Google Sheets.
- `api/`: funciones serverless de Vercel.
- `.env.example`: variables privadas necesarias en Vercel.

## Flujo de una edición

1. Crear o seleccionar una competición.
2. Crear una nueva edición.
3. Se generan automáticamente tantos códigos únicos como cupos.
4. Activar el torneo cuando corresponda; al activarlo se abren las inscripciones.
5. Los participantes se inscriben con un código de un solo uso.
6. Al completar los cupos, preparar el fixture.
7. Registrar resultados en `PARTIDOS`.
8. El sistema actualiza clasificados y rondas siguientes.
9. Cuando termina la final (o la liga completa), se guarda campeón y segundo lugar.
10. El torneo pasa a `FINALIZADO`, se cierran inscripciones y se crea el registro en `GANADORES`.
11. El ganador de la edición más reciente queda con `es_actual = SI`; los anteriores pasan a `NO`.
12. Pegar el enlace del post de Instagram en `GANADORES` o mediante el menú GMAC.

## Regla central

GMAC permite como máximo un torneo `VIGENTE`. Puede haber ediciones `PROXIMAMENTE`, pero no dos vigentes al mismo tiempo.

Toda competición se juega a una sola vuelta / partido único.

## Foto del campeón

La foto se toma de `INSCRIPCIONES.foto_url`. Si el participante que gana tiene una URL de foto, al finalizar se copia automáticamente a `TORNEOS.foto_ganador` y `GANADORES.foto_primer_lugar`.

La web pública ya consume `foto_ganador` como portada/foto del campeón. La plantilla deja el campo listo aunque la carga de archivos se gestione externamente.

## GitHub

Sube todo el contenido de esta carpeta a un repositorio privado o público. No subas archivos `.env` con secretos.

## Vercel

Conecta el repositorio a Vercel y configura:

- `GOOGLE_APPS_SCRIPT_URL`
- `SHEETS_API_SECRET`
- `ADMIN_SECRET`

Luego haz Redeploy.

Consulta `google-sheets/SETUP_GOOGLE_SHEETS.md` para la configuración paso a paso.

## Ajustes de interfaz V25

- Capturas de grupos y fixture generadas como PNG de alta resolución, pensadas para conservar legibilidad al hacer zoom.
- Los marcadores de eliminatoria se colocan en el centro de cada cruce en la captura; los penales se muestran al costado cuando existen.
- Posiciones clasificatorias y encabezados de fase usan superficies claras con texto/números oscuros para distinguir mejor grupos y eliminatorias.
- Responsive reforzado en páginas de torneo para evitar desplazamiento horizontal, títulos cortados y columnas rotas en teléfonos.
- El botón de menú móvil conserva `aria-label` para accesibilidad, pero ya no contiene texto visual auxiliar.

## Biblioteca de copas en Google Drive
La versión de producción incluye integración con la biblioteca AVIF de GMAC. `Code.gs` incorpora la opción **Sincronizar biblioteca de copas**, resuelve los archivos por sus rutas AVIF y completa automáticamente File IDs y URLs en `COMPETICIONES`.

Para nuevas competiciones se puede pegar el enlace/ID de un archivo AVIF ya subido a Drive; Apps Script lo mueve a la carpeta del juego correspondiente y lo registra en la base.
