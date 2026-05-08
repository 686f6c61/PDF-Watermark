# Política de seguridad

Este documento describe cómo reportar vulnerabilidades de seguridad de PDF Watermark.

## Alcance

Aplica a:

- El sitio público desplegado en `pdf-watermark.686f6c61.dev`.
- El bundle de JavaScript, CSS y workers servido desde ese dominio.
- El código fuente publicado en [este repositorio](https://github.com/686f6c61/PDF-Watermark).

No aplica a:

- Vulnerabilidades en dependencias upstream que ya tengan un advisory público asignado. Para esas, abre un issue público enlazando al advisory.
- Vulnerabilidades en navegadores, sistemas operativos o hardware del usuario.

## Versiones soportadas

Solo se mantiene la última versión publicada en producción. Las versiones anteriores no reciben parches de seguridad.

| Versión | Soportada |
|---------|-----------|
| Última desplegada | sí |
| Anteriores | no |

## Cómo reportar una vulnerabilidad

**No abras un issue público** ni un pull request que describa el fallo. Abrir issues públicos sobre fallos sin parchear pone en riesgo a las personas usuarias.

Tienes dos canales privados:

1. **Security Advisories de GitHub** (recomendado):
   [Crear nuevo advisory privado](https://github.com/686f6c61/PDF-Watermark/security/advisories/new). Es el canal estándar de GitHub para divulgación responsable: la comunicación queda cifrada y solo visible para los mantenedores hasta que se publica el parche.

2. **Mensaje directo en X/Twitter**: [@686f6c61](https://x.com/686f6c61). Útil si no tienes cuenta de GitHub o prefieres un canal más informal para el primer contacto.

Incluye en el reporte:

- Descripción del fallo.
- Pasos reproducibles.
- Impacto estimado.
- Versión o commit afectado.
- Si procede, prueba de concepto en un entorno aislado.

Si no recibes acuse de recibo en **72 horas**, vuelve a escribir por el otro canal.

## Sugerencias y mejoras (no de seguridad)

Si tu reporte no es de seguridad sino una idea de mejora, una opinión o un caso de uso interesante, escríbeme directamente en X/Twitter: [@686f6c61](https://x.com/686f6c61). Las propuestas más concretas también pueden ir como Issue público en GitHub.

## Compromiso de respuesta

| Fase | Plazo objetivo |
|------|----------------|
| Acuse de recibo | 72 horas |
| Triage inicial y clasificación | 7 días naturales |
| Mitigación o parche para severidad alta o crítica | 30 días naturales |
| Mitigación o parche para severidad media | 90 días naturales |
| Comunicación pública tras el parche | coordinada con quien reporta |

Si la vulnerabilidad está siendo explotada activamente, los plazos se reducen al mínimo técnicamente posible y la comunicación se prioriza sobre la coordinación.

## Coordinación con autoridades

En caso de brecha que afecte a datos personales según el RGPD, se notificará a la AEPD en un máximo de 72 horas tras conocer el incidente, conforme al artículo 33.

En caso de incidente significativo bajo NIS2, se aplicará el procedimiento de alerta temprana en 24 horas, notificación completa en 72 horas y reporte final en un mes.

## Reconocimiento

Quien reporte una vulnerabilidad válida recibirá reconocimiento público (con su permiso) en una sección de agradecimientos. Sin recompensa económica formal por ahora.

## Buenas prácticas para quien usa la herramienta

- Mantén tu navegador actualizado.
- Verifica que el sitio se sirve por HTTPS y que el certificado es válido.
- Si manejas archivos extremadamente sensibles, considera ejecutar la herramienta en un perfil de navegador aislado.

## Marco normativo aplicable

- RGPD (Reglamento UE 2016/679).
- Cyber Resilience Act (CRA) — requisitos de gestión de vulnerabilidades para productos con elementos digitales.
- NIS2 (Directiva UE 2022/2555) — en lo aplicable a operadores que se acojan al servicio.
- Ley Orgánica 3/2018 de protección de datos personales y garantía de los derechos digitales (LOPDGDD).
