# Extranjería.ai — Agente de Extranjería con IA

> Consultas sobre NIE, TIE, visados y permisos en España — respondidas en segundos, con fuentes oficiales verificadas y actualizadas continuamente.

---

## 🎯 Problema que resuelve

La información de extranjería en España cambia constantemente (BOE, normativa UE, instrucciones internas de las oficinas) y los afectados no tienen dónde acudir sin pagar un despacho caro o perderse en foros desactualizados. No existe ningún producto digital de calidad en este nicho.

---

## 💡 Propuesta de valor

- Respuestas precisas en menos de 8 segundos
- Base de conocimiento actualizada cada 24h
- Fuentes oficiales citadas en cada respuesta (BOE, sede.gob.es, SEPE)
- Checklists personalizados por situación y nacionalidad
- Alertas cuando cambia la normativa relevante para el usuario
- Derivación a abogados especialistas para casos complejos

---

## 🏗️ Arquitectura técnica

### Pipeline de conocimiento (RAG)

```
BOE / sede.gob.es / SEPE
        ↓  (scraping diario — cron job)
   Procesamiento y chunking
        ↓
   Embeddings (OpenAI / Cohere)
        ↓
   Vector DB (Pinecone o pgvector)
        ↓
   Retrieval → LLM (Claude / GPT-4o)
        ↓
   Respuesta con fuente + fecha de verificación
```

### Stack recomendado

| Capa | Tecnología |
|---|---|
| Backend | Node.js + TypeScript |
| Frontend | Next.js (App Router) |
| Base de datos | PostgreSQL + pgvector |
| LLM | Claude Sonnet (Anthropic API) |
| Scraping | Playwright + cron (GitHub Actions o Railway) |
| Auth | Clerk |
| Pagos | Stripe |
| Deploy | Vercel (frontend) + Railway (backend/workers) |

---

## 💰 Modelo de precios

### Planes de suscripción

| Plan | Precio | Objetivo |
|---|---|---|
| **Básico** | €0 / mes | Viralidad y captación de confianza |
| **Pro** | €9 / mes | Usuarios en trámite activo |
| **Empresa / API** | €49 / mes | Gestorías y despachos |

### Detalle de cada plan

**Básico (gratis)**
- 5 consultas/mes
- Respuestas generales
- Acceso a guías públicas
- Sin historial guardado

**Pro (€9/mes)**
- Consultas ilimitadas
- Respuestas personalizadas por situación y nacionalidad
- Alertas de cambios normativos
- Historial completo de conversaciones
- Checklist de documentos generado automáticamente
- Fuentes citadas en cada respuesta

**Empresa / API (€49/mes)**
- Todo lo incluido en Pro
- Hasta 20 usuarios
- API REST + webhooks
- White-label básico
- Derivación a abogados de la red
- Soporte prioritario + factura disponible

### Líneas de revenue adicionales

- **Créditos de pago único**: €5 por 20 consultas (reduce fricción para no suscriptores)
- **Comisión de referral**: 15–20% por derivación a abogados de la red
- **B2B custom**: integraciones para ERPs de RRHH y empresas con empleados extranjeros

---

## 🗺️ Plan de MVP

### Fase 1 — Core (4–6 semanas)
- [ ] Scraper de BOE y sede.gob.es con actualización diaria
- [ ] Pipeline RAG básico (chunking + embeddings + retrieval)
- [ ] Chat UI con historial de conversación
- [ ] Sistema de citas de fuentes en respuestas
- [ ] Auth con Clerk + plan gratuito activo

### Fase 2 — Monetización (2–3 semanas)
- [ ] Integración Stripe (Pro y Empresa)
- [ ] Créditos de pago único
- [ ] Límites de uso por plan
- [ ] Dashboard de usuario

### Fase 3 — Retención y B2B (4 semanas)
- [ ] Sistema de alertas por email (cambios normativos)
- [ ] Generación automática de checklists de documentos
- [ ] API REST pública (plan Empresa)
- [ ] Panel de gestión multi-usuario para gestorías

---

## ⚠️ Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Responsabilidad legal (intrusismo) | Disclaimer claro: *orientación, no asesoramiento jurídico*. Derivación a abogados para casos complejos. |
| Información desactualizada | Fecha de verificación visible en cada respuesta. Alerta automática si el scraper falla más de 24h. |
| Alucinaciones del LLM | RAG estricto: el modelo solo responde con contexto recuperado. Sin generación libre sobre normativa. |
| Competencia de despachos | El precio y la disponibilidad 24/7 son la ventaja. No competimos con abogados, los complementamos. |

---

## 🧭 Posicionamiento

> "No somos un despacho de abogados. Somos la herramienta que te prepara para serlo."

Extranjería.ai se posiciona como el paso previo y paralelo al abogado: ayuda al usuario a entender su situación, preparar sus documentos y no llegar a ciegas a ninguna oficina ni consulta.

---

## 📎 Referencias técnicas

- [BOE — Boletín Oficial del Estado](https://www.boe.es)
- [Sede Electrónica del Ministerio del Interior](https://sede.administracion.gob.es)
- [SEPE — Servicio Público de Empleo Estatal](https://www.sepe.es)
- [Instrucción SEM/2024 — Permisos de residencia UE](https://www.interior.gob.es)
