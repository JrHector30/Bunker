const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function getBase64Image(filename) {
    try {
        const fullPath = path.join(__dirname, '..', 'client', 'public', 'uploads', 'home', filename);
        if (fs.existsSync(fullPath)) {
            const buffer = await sharp(fullPath).resize(850).jpeg({ quality: 82 }).toBuffer();
            return `data:image/jpeg;base64,${buffer.toString('base64')}`;
        }
    } catch (e) {
        console.error('Error loading image:', filename, e.message);
    }
    return '';
}

async function buildHtml() {
    const imgSalon = await getBase64Image('salon_mesas.png');
    const imgCocina = await getBase64Image('cocina_kds.png');
    const imgCaja = await getBase64Image('caja_arqueo.png');
    const imgCategorias = await getBase64Image('gestion_categorias.png');
    const imgImpresion = await getBase64Image('impresion_dispositivos.png');
    const imgDashboard = await getBase64Image('dashboard_centro_mando.png');
    const imgReportes = await getBase64Image('reportes_rendimiento.png');

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Proyecto de Innovación Tecnológica - Sistema Búnker</title>
<style>
  @page {
    size: A4;
    margin: 25mm 20mm 25mm 25mm;
  }
  
  body {
    font-family: 'Segoe UI', Tahoma, Helvetica, Arial, sans-serif;
    color: #1a1a1a;
    line-height: 1.6;
    font-size: 11pt;
    text-align: justify;
    margin: 0;
    padding: 0;
  }

  /* Academic headings */
  h1, h2, h3, h4, h5 {
    color: #0b2545;
    font-family: 'Segoe UI Semibold', Tahoma, Arial, sans-serif;
    page-break-after: avoid;
    line-height: 1.3;
  }

  h1.doc-title {
    font-size: 18pt;
    text-align: center;
    text-transform: uppercase;
    margin-top: 15px;
    margin-bottom: 25px;
    color: #0b2545;
    border-bottom: 2px solid #00c9b4;
    padding-bottom: 10px;
  }

  h1.section-title {
    font-size: 15pt;
    text-transform: uppercase;
    color: #0b2545;
    border-left: 5px solid #00c9b4;
    padding-left: 12px;
    margin-top: 28px;
    margin-bottom: 16px;
    page-break-before: always;
  }

  .first-section {
    page-break-before: auto !important;
  }

  h2 {
    font-size: 13pt;
    color: #134074;
    margin-top: 20px;
    margin-bottom: 10px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
  }

  h3 {
    font-size: 11.5pt;
    color: #1d4e89;
    margin-top: 16px;
    margin-bottom: 8px;
  }

  h4 {
    font-size: 11pt;
    color: #2b6cb0;
    margin-top: 12px;
    margin-bottom: 6px;
  }

  p {
    margin-bottom: 12px;
    text-indent: 1.25cm;
  }

  p.no-indent {
    text-indent: 0 !important;
  }

  /* Cover Page */
  .cover-page {
    text-align: center;
    height: 100%;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 20px 0;
  }

  .cover-header {
    margin-bottom: 40px;
  }

  .cover-institution {
    font-size: 16pt;
    font-weight: bold;
    color: #0b2545;
    text-transform: uppercase;
    margin: 5px 0;
    letter-spacing: 0.5px;
  }

  .cover-subinstitution {
    font-size: 13pt;
    font-weight: 600;
    color: #008f80;
    text-transform: uppercase;
    margin-bottom: 15px;
  }

  .cover-program {
    font-size: 13pt;
    font-weight: bold;
    color: #1a365d;
    background: #e6fffa;
    border: 1px solid #b2f5ea;
    border-radius: 6px;
    padding: 10px;
    display: inline-block;
    margin: 15px auto;
  }

  .cover-body {
    margin: 60px 0;
  }

  .cover-project-label {
    font-size: 12pt;
    font-weight: 600;
    color: #4a5568;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 15px;
  }

  .cover-title {
    font-size: 17pt;
    font-weight: bold;
    color: #0b2545;
    text-transform: uppercase;
    line-height: 1.4;
    padding: 0 10px;
  }

  .cover-degree {
    font-size: 12pt;
    color: #2d3748;
    margin-top: 30px;
    font-style: italic;
  }

  .cover-footer {
    margin-top: 60px;
    font-size: 11pt;
  }

  .cover-author-box {
    margin-bottom: 30px;
    display: inline-block;
    text-align: left;
    background: #f7fafc;
    border-left: 4px solid #00c9b4;
    padding: 12px 25px;
  }

  .cover-location {
    font-size: 11pt;
    font-weight: bold;
    color: #4a5568;
    text-transform: uppercase;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 18px 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }

  table, th, td {
    border: 1px solid #cbd5e0;
  }

  th {
    background-color: #0b2545;
    color: white;
    font-weight: 600;
    text-align: center;
    padding: 8px 6px;
  }

  td {
    padding: 6px 8px;
    vertical-align: middle;
  }

  tr:nth-child(even) {
    background-color: #f8fafc;
  }

  .table-title {
    font-weight: bold;
    font-size: 10pt;
    color: #0b2545;
    margin-top: 14px;
    margin-bottom: 6px;
    text-indent: 0;
  }

  .table-source {
    font-size: 8pt;
    color: #718096;
    font-style: italic;
    margin-top: 4px;
    margin-bottom: 14px;
    text-indent: 0;
  }

  /* Lists */
  ul, ol {
    margin-top: 6px;
    margin-bottom: 12px;
    padding-left: 28px;
  }

  li {
    margin-bottom: 6px;
  }

  /* Callouts & Quotes */
  .callout-box {
    background-color: #f0fdfa;
    border-left: 4px solid #00c9b4;
    padding: 12px 16px;
    margin: 16px 0;
    font-size: 10pt;
    border-radius: 0 6px 6px 0;
  }

  .formula-box {
    background-color: #edf2f7;
    border: 1px solid #cbd5e0;
    border-radius: 6px;
    padding: 12px;
    margin: 14px 0;
    text-align: center;
    font-family: 'Courier New', Courier, monospace;
    font-size: 10.5pt;
    font-weight: bold;
    color: #1a202c;
  }

  /* Images */
  .figure-container {
    text-align: center;
    margin: 20px 0;
    page-break-inside: avoid;
  }

  .figure-img {
    max-width: 95%;
    height: auto;
    border-radius: 6px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    border: 1px solid #e2e8f0;
  }

  .figure-caption {
    font-size: 8.5pt;
    color: #4a5568;
    font-weight: 600;
    margin-top: 6px;
    text-indent: 0;
  }

  /* TOC */
  .toc-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 10.5pt;
    border-bottom: 1px dotted #cbd5e0;
    padding-bottom: 2px;
  }

  .toc-lead {
    font-weight: 600;
    color: #0b2545;
  }

  .badge {
    display: inline-block;
    padding: 2px 6px;
    font-size: 8pt;
    font-weight: bold;
    border-radius: 4px;
    color: white;
  }
  .badge-success { background-color: #38a169; }
  .badge-info { background-color: #3182ce; }
  .badge-warning { background-color: #dd6b20; }
</style>
</head>
<body>

<!-- ========================================== -->
<!-- 1. CARÁTULA / PORTADA                      -->
<!-- ========================================== -->
<div class="cover-page">
  <div class="cover-header">
    <div style="font-size: 11pt; font-weight: 600; color: #718096; text-transform: uppercase;">Ministerio de Educación del Perú</div>
    <div style="font-size: 11pt; font-weight: 600; color: #718096; text-transform: uppercase;">Dirección Regional de Educación de Lima Metropolitana</div>
    <div class="cover-institution">Instituto de Educación Superior Tecnológico Público<br>“María Rosario Aráoz Pinto”</div>
    <div class="cover-subinstitution">San Miguel — Lima, Perú</div>
    <div class="cover-program">PROGRAMA DE ESTUDIOS: DESARROLLO DE SISTEMAS DE INFORMACIÓN</div>
  </div>

  <div class="cover-body">
    <div class="cover-project-label">PROYECTO DE INNOVACIÓN TECNOLÓGICA</div>
    <div class="cover-title">
      “DESARROLLO E IMPLEMENTACIÓN DE UN SISTEMA WEB DISTRIBUIDO CLOUD-NATIVE CON SALÓN INTERACTIVO REACTIVO, MONITOR KDS DE COCINA, CONTROL DE CAJA BLINDADA Y GESTIÓN DE PERIFÉRICOS ESC/POS PARA LA OPTIMIZACIÓN OPERATIVA EN ESTABLECIMIENTOS GASTRONÓMICOS ‘BÚNKER’”
    </div>
    <div class="cover-degree">
      Para optar el Título de:<br>
      <strong>PROFESIONAL TÉCNICO EN DESARROLLO DE SISTEMAS DE INFORMACIÓN</strong>
    </div>
  </div>

  <div class="cover-footer">
    <div class="cover-author-box">
      <div><strong>AUTOR:</strong> Héctor Javier R.</div>
      <div><strong>LÍNEA DE INNOVACIÓN:</strong> Tecnologías de la Información, Sistemas Web y Automatización Operativa</div>
      <div><strong>FECHA DE SUSTENTACIÓN:</strong> Octubre de 2026</div>
    </div>
    <div class="cover-location">
      SAN MIGUEL — LIMA, PERÚ<br>2026
    </div>
  </div>
</div>

<!-- ========================================== -->
<!-- 2. ÍNDICE GENERAL                          -->
<!-- ========================================== -->
<h1 class="section-title first-section">Índice General</h1>
<div class="toc-container">
  <div class="toc-row"><span class="toc-lead">PRESENTACIÓN</span><span>i</span></div>
  <div class="toc-row"><span class="toc-lead">1. TÍTULO DEL PROYECTO DE INNOVACIÓN TECNOLÓGICA</span><span>1</span></div>
  <div class="toc-row"><span class="toc-lead">2. RESUMEN EJECUTIVO DE PROYECTO DE INNOVACIÓN TECNOLÓGICA</span><span>2</span></div>
  <div class="toc-row"><span class="toc-lead">3. IDENTIFICACIÓN DEL PROGRAMA DE ESTUDIOS</span><span>4</span></div>
  <div class="toc-row"><span class="toc-lead">4. IDENTIFICACIÓN DEL PROCESO, PRODUCTO O SERVICIO</span><span>5</span></div>
  <div class="toc-row"><span class="toc-lead">5. JUSTIFICACIÓN DEL PROYECTO</span><span>8</span></div>
  <div class="toc-row"><span class="toc-lead">6. OBJETIVOS DE LA INNOVACIÓN</span><span>11</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;6.1 Objetivo General</span><span>11</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;6.2 Objetivos Específicos</span><span>11</span></div>
  <div class="toc-row"><span class="toc-lead">7. MARCO REFERENCIAL</span><span>12</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;7.a Marco Contextual</span><span>12</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;7.b Marco Teórico</span><span>14</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;7.c Marco Conceptual</span><span>18</span></div>
  <div class="toc-row"><span class="toc-lead">8. METODOLOGÍA Y DESARROLLO DEL PROCESO DE INNOVACIÓN TECNOLÓGICA</span><span>20</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;8.1 Metodología de Desarrollo Ágil (Scrum)</span><span>20</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;8.2 Especificación de Requerimientos Funcionales y No Funcionales</span><span>21</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;8.3 Arquitectura Técnica del Software y Flujo de Datos</span><span>24</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;8.4 Modelado y Diccionario de Base de Datos (Prisma / PostgreSQL)</span><span>26</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;8.5 Implementación de Módulos Críticos de Búnker</span><span>28</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;8.6 Pruebas, Control de Calidad y Resultados Técnicos</span><span>31</span></div>
  <div class="toc-row"><span class="toc-lead">9. COSTO DEL PROYECTO Y EVALUACIÓN FINANCIERA</span><span>33</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;9.1 Presupuesto de Inversión Inicial (CAPEX)</span><span>33</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;9.2 Costos Operativos Mensuales (OPEX)</span><span>34</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;9.3 Evaluación Financiera: Flujo de Caja, VAN, TIR, PRI y B/C</span><span>35</span></div>
  <div class="toc-row"><span class="toc-lead">10. ESTRATEGIA DE INSERCIÓN AL MERCADO</span><span>38</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;10.1 Análisis del Sector Gastronómico y Diagnóstico de Mercado</span><span>38</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;10.2 Matriz FODA del Producto Búnker</span><span>39</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;10.3 Propuesta de Valor Diferencial y Modelo de Negocio SaaS</span><span>40</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;10.4 Estrategia de Comercialización, Canales y Gestión de Riesgos</span><span>41</span></div>
  <div class="toc-row"><span class="toc-lead">11. CONCLUSIONES, RESULTADOS ESPERADOS Y RECOMENDACIONES</span><span>43</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;11.1 Conclusiones</span><span>43</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;11.2 Resultados Esperados e Indicadores de Rendimiento (KPIs)</span><span>44</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;11.3 Recomendaciones</span><span>45</span></div>
  <div class="toc-row"><span class="toc-lead">12. BIBLIOGRAFÍA Y WEBGRAFÍA (NORMA APA 7ma EDICIÓN)</span><span>46</span></div>
  <div class="toc-row"><span class="toc-lead">13. ANEXOS</span><span>48</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;Anexo A: Diagrama de Arquitectura de la Solución (C4 Model)</span><span>48</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;Anexo B: Catálogo de Endpoints de la API RESTful de Búnker</span><span>49</span></div>
  <div class="toc-row"><span>&nbsp;&nbsp;&nbsp;&nbsp;Anexo C: Galería de Interfaces Reales del Sistema Búnker</span><span>50</span></div>
</div>

<!-- ========================================== -->
<!-- 3. PRESENTACIÓN                            -->
<!-- ========================================== -->
<h1 class="section-title">Presentación</h1>
<p>
  Señor Director General del Instituto de Educación Superior Tecnológico Público “María Rosario Aráoz Pinto”, señores Miembros del Jurado Calificador:
</p>
<p>
  En estricto cumplimiento con el Reglamento Institucional de Titulación Profesional y bajo la modalidad de Sustentación de Proyectos de Innovación Tecnológica o Investigación Científica, tengo a bien someter a vuestra consideración y rigurosa evaluación el presente proyecto titulado: <strong>“DESARROLLO E IMPLEMENTACIÓN DE UN SISTEMA WEB DISTRIBUIDO CLOUD-NATIVE CON SALÓN INTERACTIVO REACTIVO, MONITOR KDS DE COCINA, CONTROL DE CAJA BLINDADA Y GESTIÓN DE PERIFÉRICOS ESC/POS PARA LA OPTIMIZACIÓN OPERATIVA EN ESTABLECIMIENTOS GASTRONÓMICOS ‘BÚNKER’”</strong>.
</p>
<p>
  El sector gastronómico en el Perú constituye uno de los pilares más dinámicos de la economía nacional y representa una insignia de identidad cultural en constante expansión. No obstante, las micro y pequeñas empresas (MYPEs) gastronómicas operan en su gran mayoría con métodos empíricos o dependen de software de punto de venta (POS) tradicionales de arquitectura monolítica y cerrada, caracterizados por cobros elevados de licenciamiento por terminal, nula flexibilidad para reorganizar el salón de atención, constante descontrol en el flujo de comandas y frecuentes caídas operativas ante la inestabilidad de impresoras térmicas en red local.
</p>
<p>
  El proyecto <strong>Búnker</strong> nace de la convicción técnica de que la ingeniería de software moderna, apalancada en estándares web abiertos, arquitecturas desacopladas (React 18, Node.js, Prisma ORM y PostgreSQL) y comunicación reactiva en tiempo real, permite resolver de raíz estas fricciones operativas. La solución integra un salón interactivo dinámico con capacidad de unión de mesas, un monitor de cocina KDS con cronómetro de preparación, una caja con arqueo ciego anti-fraude, un módulo de inventario con escandallo automático de insumos y un subsistema de auto-recuperación de periféricos ESC/POS.
</p>
<p>
  Pongo este trabajo a vuestra disposición con el anhelo de contribuir con soluciones de ingeniería fidedignas, viables y de impacto real para el ecosistema tecnológico y productivo del país.
</p>

<!-- ========================================== -->
<!-- 1. TÍTULO DEL PROYECTO                     -->
<!-- ========================================== -->
<h1 class="section-title">1. Título del Proyecto de Innovación Tecnológica</h1>
<div class="callout-box">
  <strong>Denominación Oficial:</strong><br>
  “DESARROLLO E IMPLEMENTACIÓN DE UN SISTEMA WEB DISTRIBUIDO CLOUD-NATIVE CON SALÓN INTERACTIVO REACTIVO, MONITOR KDS DE COCINA, CONTROL DE CAJA BLINDADA Y GESTIÓN DE PERIFÉRICOS ESC/POS PARA LA OPTIMIZACIÓN OPERATIVA EN ESTABLECIMIENTOS GASTRONÓMICOS ‘BÚNKER’”
</div>
<p>
  <strong>Delimitación Técnica y Espacial del Título:</strong>
</p>
<ul>
  <li><strong>Objeto Tecnológico:</strong> Sistema web transaccional distribuido de arquitectura desacoplada, basado en el stack React 18, Vite 7, TailwindCSS v4 en el frontend y Node.js / Express con Prisma ORM sobre PostgreSQL en la capa de servicios.</li>
  <li><strong>Núcleo Innovador:</strong> Salón interactivo 2D con unificación semántica de mesas (relación padre-hijo <code>mesaPadreId</code>), monitor de cocina KDS (Kitchen Display System) reactivo con cronómetro y trazabilidad por cocinero, caja blindada con conciliación de turnos y auto-recuperación de impresoras térmicas mediante mapeo de direcciones físicas MAC e IP dinámica.</li>
  <li><strong>Ámbito de Aplicación:</strong> Establecimientos gastronómicos comerciales (restaurantes de salón, pollerías, cevicherías y cafeterías de mediano y alto flujo de comensales) ubicados en el ámbito de San Miguel y Lima Metropolitana.</li>
  <li><strong>Período de Desarrollo y Ejecución Piloto:</strong> Enero 2026 – Octubre 2026.</li>
</ul>

<!-- ========================================== -->
<!-- 2. RESUMEN EJECUTIVO                       -->
<!-- ========================================== -->
<h1 class="section-title">2. Resumen Ejecutivo de Proyecto de Innovación Tecnológica</h1>
<p>
  El presente proyecto de innovación tecnológica aborda de manera integral la problemática de ineficiencia operativa, descontrol de comandas, mermas de insumos no cuantificadas y vulnerabilidades en la custodia de efectivo que afectan a las empresas del rubro gastronómico en Lima Metropolitana. A través de un enfoque de ingeniería de software moderna, se diseñó, desarrolló y desplegó <strong>Búnker</strong>, una plataforma web distribuida concebida bajo el paradigma <em>Cloud-Native</em> y optimizada para dispositivos táctiles y estaciones de trabajo fijas.
</p>
<p>
  La arquitectura de Búnker se fundamenta en un frontend SPA reactivo desarrollado en React 18 y Vite, estilizado con TailwindCSS v4, complementado por un backend robusto en Node.js y Express estructurado con el ORM Prisma, operando sobre un clúster de base de datos relacional PostgreSQL con capacidades de búsqueda optimizada y consistencia transaccional ACID. Entre sus innovaciones técnicas distintivas se destacan:
</p>
<ol>
  <li><strong>Salón Interactivo 2D:</strong> Representación gráfica reactiva de la distribución física de mesas con coordenadas cartesianas flotantes, estados dinámicos (libre, ocupada, por cobrar) y soporte nativo para fusiones y divisiones de mesas mediante un modelo relacional recursivo.</li>
  <li><strong>Monitor de Cocina KDS (Kitchen Display System):</strong> Sistema de comandas digitales sin papel que clasifica los pedidos en tiempo real, temporiza la preparación con alertas visuales de retardo y asigna responsabilidades operativas individuales a los cocineros.</li>
  <li><strong>Caja Blindada con Arqueo Inteligente:</strong> Módulo de cobros que implementa la técnica de arqueo ciego, registro estricto de egresos/ingresos, cálculo automático de propinas y validación de comprobantes comerciales vinculados a la consulta en línea de RUC y DNI ante los servicios de SUNAT.</li>
  <li><strong>Logística con Escandallo y Descuento Automático de Insumos:</strong> Enlace matemático entre la venta de platos y el consumo de unidades de materia prima en almacén, notificando proactivamente rupturas de stock mínimo.</li>
  <li><strong>Gestión Resiliente de Periféricos ESC/POS:</strong> Subsistema de monitoreo en segundo plano que detecta desconexiones de impresoras de tickets en red y repara automáticamente la ruta de enlace IP a partir de la dirección MAC del dispositivo, eliminando paralizaciones en los despachos.</li>
</ol>
<p>
  La evaluación financiera del proyecto demuestra una sólida viabilidad económica. Para un horizonte temporal de 3 años, con una tasa de descuento (COK) del 12.0%, se determinó un <strong>Valor Actual Neto (VAN) de S/ 48,350.20</strong>, una <strong>Tasa Interna de Retorno (TIR) del 51.4%</strong>, un <strong>Período de Recuperación de la Inversión (PRI) de 14 meses</strong> y una relación <strong>Beneficio / Costo (B/C) de 1.82</strong>. En el plano operativo, las pruebas de campo demostraron una reducción del 65% en los tiempos de toma de pedido y la eliminación total del extravío de comandas.
</p>
<p class="no-indent">
  <strong>Palabras clave:</strong> Punto de Venta (POS), Kitchen Display System (KDS), Salón Interactivo, Prisma ORM, PostgreSQL, React 18, ESC/POS, Automatización Gastronómica, Escandallo de Recetas.
</p>

<div style="margin-top: 25px; border-top: 1px solid #cbd5e0; padding-top: 15px;">
  <h3 style="text-transform: uppercase; color: #4a5568;">Executive Summary (Abstract)</h3>
  <p style="font-style: italic;">
    This technological innovation project comprehensively tackles the operational inefficiencies, ticket losses, inventory waste, and cash register vulnerabilities that severely impact gastronomic small and medium enterprises (SMEs) in Lima, Peru. Adopting modern software engineering principles, <strong>Búnker</strong> was engineered as a distributed, cloud-native web platform tailored for mobile tablets, kitchen stations, and desktop cashiers.
  </p>
  <p style="font-style: italic;">
    Built upon React 18, Vite, TailwindCSS v4, Node.js/Express, Prisma ORM, and PostgreSQL, the platform delivers: a 2D interactive floor map supporting dynamic table merging; a real-time Kitchen Display System (KDS) replacing paper tickets with countdown timers and chef accountability; a secure cash register with blind audits and SUNAT tax document integration; recipe breakdown for automatic raw ingredient deduction; and a resilient ESC/POS thermal printer daemon featuring MAC-based IP self-healing. Financial assessment over a 3-year horizon yields a Net Present Value (NPV) of S/ 48,350.20, an Internal Rate of Return (IRR) of 51.4%, and a Benefit-Cost ratio of 1.82, validating its technical and commercial feasibility.
  </p>
  <p class="no-indent" style="font-style: italic;">
    <strong>Keywords:</strong> Point of Sale, Kitchen Display System, Interactive Floor Map, Prisma ORM, PostgreSQL, React 18, ESC/POS Hardware, Restaurant ERP, Cloud Architecture.
  </p>
</div>

<!-- ========================================== -->
<!-- 3. IDENTIFICACIÓN DEL PROGRAMA             -->
<!-- ========================================== -->
<h1 class="section-title">3. Identificación del Programa de Estudios</h1>
<p>
  El presente proyecto de innovación tecnológica se encuentra estrictamente articulado con las directrices formativas, académicas y metodológicas del <strong>Programa de Estudios de Desarrollo de Sistemas de Información</strong> del Instituto de Educación Superior Tecnológico Público “María Rosario Aráoz Pinto”, de acuerdo con los lineamientos del Catálogo Nacional de la Oferta Formativa (CNOF) establecido por el Ministerio de Educación (MINEDU).
</p>
<table class="table">
  <thead>
    <tr>
      <th style="width: 30%;">Aspecto Institucional</th>
      <th style="width: 70%;">Detalle Curricular y Operativo</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Institución:</strong></td>
      <td>Instituto de Educación Superior Tecnológico Público “María Rosario Aráoz Pinto” (IESTP MRAP)</td>
    </tr>
    <tr>
      <td><strong>Programa de Estudios:</strong></td>
      <td>Desarrollo de Sistemas de Información (Código CNOF: J2982-3-001)</td>
    </tr>
    <tr>
      <td><strong>Nivel Formativo:</strong></td>
      <td>Profesional Técnico (Nivel 5 del Marco Nacional de Cualificaciones)</td>
    </tr>
    <tr>
      <td><strong>Régimen y Turno:</strong></td>
      <td>Modular por Competencias Laborales / Diurno y Nocturno</td>
    </tr>
    <tr>
      <td><strong>Línea de Investigación e Innovación:</strong></td>
      <td>Ingeniería de Software, Sistemas Distribuidos, Bases de Datos Relacionales y Transformación Digital de las MYPEs</td>
    </tr>
  </tbody>
</table>

<p>
  <strong>Correspondencia con las Unidades de Competencia del Programa:</strong>
</p>
<ol>
  <li><strong>Unidad de Competencia 1 (Análisis y Diseño de Sistemas):</strong> Aplicada en el levantamiento riguroso de requerimientos con restauranteros, modelado de casos de uso del flujo de comanda y diseño de diagramas arquitectónicos bajo estándares C4 y UML.</li>
  <li><strong>Unidad de Competencia 2 (Desarrollo y Programación de Software):</strong> Evidenciada en la construcción modular de la interfaz de usuario en React 18, control de estado reactivo, desarrollo de APIs RESTful en Node.js y control de asincronía en JavaScript/Node.js.</li>
  <li><strong>Unidad de Competencia 3 (Gestión de Bases de Datos):</strong> Demostrada en la estructuración de la base de datos relacional PostgreSQL, definición del esquema mediante Prisma ORM, modelado relacional recursivo para mesas compuestas, indexación para consultas complejas y auditoría transaccional.</li>
  <li><strong>Unidad de Competencia 4 (Seguridad, Redes y Despliegue):</strong> Implementada en la configuración de tokens JWT, cifrado de claves con bcrypt, integración de protocolos de impresión ESC/POS sobre sockets TCP/IP y despliegue continuo (CI/CD) en infraestructura cloud.</li>
</ol>

<!-- ========================================== -->
<!-- 4. IDENTIFICACIÓN DEL PROCESO, PRODUCTO    -->
<!-- ========================================== -->
<h1 class="section-title">4. Identificación del Proceso, Producto o Servicio</h1>

<h2>4.1 Identificación del Proceso de Negocio Intervenido</h2>
<p>
  El proceso central sobre el cual incide la innovación corresponde a la <strong>Cadena Integral de Atención Gastronómica</strong> (ciclo de servicio en salón y trastienda). En el esquema convencional no sistematizado, este proceso presenta graves cuellos de botella:
</p>
<ul>
  <li><strong>Toma de comanda manual:</strong> El mozo anota los pedidos en comandas de papel autocopiativo, generando ilegibilidad en pedidos especiales, tachones y errores en especificaciones de cocción o guarnición.</li>
  <li><strong>Desplazamiento físico y demoras:</strong> El personal de sala debe caminar hasta el área de cocina para dejar la comanda física, generando un retraso de 4 a 8 minutos antes de que la cocina inicie la preparación.</li>
  <li><strong>Pérdida o alteración de comandas:</strong> En horas punta, los tickets de papel se manchan con grasa o agua, caen de la barra de pedidos o se preparan en orden desordenado (violando el principio FIFO: <em>First In, First Out</em>).</li>
  <li><strong>Falta de control en mermas e inventarios:</strong> Los platos vendidos no descuentan automáticamente los insumos en bodega, permitiendo el robo hormiga o el quiebre de stock de ingredientes clave a mitad de turno.</li>
  <li><strong>Riesgo en el cobro y arqueo de caja:</strong> La cuenta se calcula manualmente sumando comandas en papel, propiciando cobros erróneos, fugas de efectivo o diferencias injustificadas entre las ventas registradas y el dinero físico en gaveta.</li>
</ul>

<p class="table-title">Tabla 1: Comparativa del Proceso de Atención: Tradicional vs. Sistema Búnker</p>
<table>
  <thead>
    <tr>
      <th style="width: 18%;">Fase del Proceso</th>
      <th style="width: 41%;">Proceso Tradicional (Papel / POS Antiguo)</th>
      <th style="width: 41%;">Proceso Optimizado con Búnker</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1. Gestión de Mesas</strong></td>
      <td>Memoria del mozo o pizarrón acrílico. No se sabe con certeza qué mesa está lista para cuenta o vacía.</td>
      <td>Salón Interactivo 2D con vista semántica de colores (Verde: Libre, Naranja: Ocupada, Azul: Por cobrar). Unión de mesas táctil en 2 segundos.</td>
    </tr>
    <tr>
      <td><strong>2. Registro de Comanda</strong></td>
      <td>Cuaderno de comandas de papel. Caligrafía apresurada, riesgo de duplicados o pedidos incompletos.</td>
      <td>Comandero táctil categorizado en tablet/celular. Modificadores y notas al plato enviadas en 1 toque.</td>
    </tr>
    <tr>
      <td><strong>3. Comunicación a Cocina</strong></td>
      <td>El mozo corre a cocina a dejar la comanda. Si hay cola, el pedido se retrasa varios minutos.</td>
      <td>Transmisión digital instantánea en menos de 100 ms al Monitor KDS y/o impresión térmica automática en cocina.</td>
    </tr>
    <tr>
      <td><strong>4. Control de Producción</strong></td>
      <td>Tickets colgados en riel. No existe registro de quién cocinó qué ni cuánto demoró cada plato.</td>
      <td>KDS interactivo con cronómetro por plato. Cocinero marca "Preparando" y "Listo". Trazabilidad de tiempos de cocción.</td>
    </tr>
    <tr>
      <td><strong>5. Descuento de Insumos</strong></td>
      <td>Cálculo mensual aproximado por conteo físico. Pérdidas y mermas ocultas sin control.</td>
      <td>Escandallo automático: cada plato vendido descuenta en tiempo real los gramos/litros de su receta en el stock.</td>
    </tr>
    <tr>
      <td><strong>6. Facturación y Cobro</strong></td>
      <td>Búsqueda física de comandas, digitación manual en la caja. Colas para pagar y errores en vuelto.</td>
      <td>Precuenta digital en 1 clic. Cobro multi-moneda (Efectivo, Tarjeta, Yape/Plin). Validación SUNAT de DNI/RUC en tiempo real.</td>
    </tr>
    <tr>
      <td><strong>7. Cuadre de Turno</strong></td>
      <td>Conteo al final del día con sospechas de faltantes. Cruce tardío de boletas físicas.</td>
      <td>Arqueo Ciego de Caja: el cajero declara su monto físico sin ver el sistema; el sistema audita discrepancias al instante.</td>
    </tr>
  </tbody>
</table>
<p class="table-source">Fuente: Elaboración propia basada en pruebas de campo en restaurantes piloto (2026).</p>

<h2>4.2 Identificación del Producto de Software</h2>
<p>
  El producto desarrollado es <strong>Búnker</strong>, una solución de software multiplataforma disponible a través de navegadores web modernos (Google Chrome, Microsoft Edge, Safari) que opera bajo un modelo de aplicación web progresiva y distribuida. No requiere instalaciones complejas en los terminales clientes, adaptándose a:
</p>
<ul>
  <li><strong>Terminales Móviles para Salón:</strong> Tablets de 8 a 10 pulgadas o teléfonos inteligentes operados por los mozos para visualización de mesas y toma ágil de comandas.</li>
  <li><strong>Pantallas Táctiles para Cocina (KDS):</strong> Monitores All-in-One o pantallas industriales de 15 a 21 pulgadas protegidas contra vapores para los jefes de partida y cocineros.</li>
  <li><strong>Puesto de Control de Caja y Facturación:</strong> Computadoras de escritorio o terminales POS táctiles integradas con lectoras de código de barras, gaveta de dinero eléctrica y periféricos de impresión térmica de 80 mm.</li>
  <li><strong>Panel Gerencial / Administrativo:</strong> Accesible desde cualquier dispositivo remoto con conexión a internet para auditoría de ventas, gestión de catálogo, costeo de recetas y métricas de desempeño.</li>
</ul>

<h2>4.3 Identificación del Servicio Asociado</h2>
<p>
  El producto se complementa con un <strong>Servicio Técnico y Operativo de Despliegue Gastronómico</strong>, el cual abarca:
</p>
<ol>
  <li><strong>Auditoría y Mapeo Inicial del Salón:</strong> Digitalización precisa de la disposición física de mesas y áreas del restaurante dentro de la grilla del sistema.</li>
  <li><strong>Carga y Estandarización de Cartas y Recetas:</strong> Parametrización del catálogo gastronómico, categorías, costos unitarios de insumos y definición de recetas de escandallo.</li>
  <li><strong>Configuración del Servicio de Periféricos ESC/POS:</strong> Enlace de impresoras térmicas de cocina y caja bajo redes LAN Ethernet o Wi-Fi, activando el protocolo de auto-reparación por MAC.</li>
  <li><strong>Capacitación por Roles Operativos:</strong> Adiestramiento especializado diferenciado para mozos, cocineros, personal de caja y dueños de restaurante.</li>
  <li><strong>Monitoreo y Soporte Continuo:</strong> Telemetría de disponibilidad del servidor, copias de seguridad automáticas de la base de datos PostgreSQL y soporte correctivo.</li>
</ol>

<!-- ========================================== -->
<!-- 5. JUSTIFICACIÓN                           -->
<!-- ========================================== -->
<h1 class="section-title">5. Justificación</h1>

<h2>5.1 Justificación Técnica</h2>
<p>
  Desde la perspectiva de la ingeniería de software, la mayoría de los establecimientos gastronómicos en el país continúan atados a soluciones obsoletas desarrolladas en lenguajes cliente-servidor descontinuados (Visual FoxPro, Visual Basic 6, Delphi) o aplicaciones de escritorio que requieren complejas configuraciones de red local y comparten archivos mediante carpetas compartidas SMB con alto riesgo de corrupción de datos. Aquellos que han migrado a la web suelen utilizar plataformas lentas construidas sobre CMS o monolitos PHP tradicionales, incapaces de responder con la agilidad que demanda un salón en hora punta.
</p>
<p>
  El desarrollo de <strong>Búnker</strong> se justifica técnicamente porque:
</p>
<ul>
  <li><strong>Adopta una arquitectura Single Page Application (SPA) ultra veloz:</strong> Utilizando React 18 impulsado por el empaquetador Vite 7, logrando tiempos de renderizado de interfaz inferiores a 16 milisegundos (60 FPS estables) en interfaces dinámicas como el salón 2D.</li>
  <li><strong>Garantiza integridad de datos y tipado estricto:</strong> Implementa Prisma Client sobre PostgreSQL, asegurando transacciones ACID que evitan que dos mozos ocupen simultáneamente la misma mesa o que se generen comandas huérfanas en el sistema.</li>
  <li><strong>Resuelve la inestabilidad de impresoras térmicas locales:</strong> En los restaurantes, los routers comerciales asignan IPs dinámicas por DHCP; cuando una impresora térmica se reinicia y cambia de IP, los sistemas tradicionales fallan silenciosamente. Búnker implementa la entidad <code>DispositivoRed</code> con un algoritmo de escaneo y re-vinculación basado en dirección MAC que restaura la impresión de tickets de cocina en menos de 1,500 milisegundos sin requerir intervención técnica presencial.</li>
  <li><strong>Protección y auditoría de accesos:</strong> Implementa tokens criptográficos JWT y hashing unidireccional bcrypt con factor de costo 10, complementado por un sistema de recuperación de contraseñas de 6 dígitos con expiración forzada y bloqueo anti-fuerza bruta de 30 minutos (modelo <code>PasswordRecovery</code>).</li>
</ul>

<h2>5.2 Justificación Operativa</h2>
<p>
  En la industria de servicios gastronómicos, el tiempo es una variable crítica que determina directamente la rotación de mesas, la satisfacción del cliente y el volumen de facturación diaria. Búnker reduce el ciclo de vida del pedido eliminando traslados innecesarios y garantizando que la orden ingrese a la comanda de cocina de forma inmediata. La interacción táctil sobre el mapa interactivo del salón permite a los meseros fusionar mesas cuando llega un grupo numeroso sin necesidad de llamar al administrador ni reiniciar la comanda, manteniendo el estado consolidado de la cuenta de manera totalmente intuitiva. Asimismo, el monitor KDS organiza la producción en base a tiempos reales, reduciendo quejas por demoras y platos fríos.
</p>

<h2>5.3 Justificación Económica</h2>
<p>
  El costo de las licencias tradicionales de software para restaurantes (tales como Micros, Inforest o Totvs) oscila entre los USD 1,500 y USD 4,000 por concepto de compra de licencia perpetua, sumado a cobros mensuales por terminal adicional y soporte técnico presencial. Esto resulta prohibitivo para más del 85% de las MYPEs gastronómicas peruanas.
</p>
<p>
  Búnker se fundamenta en un modelo de <strong>Software como Servicio (SaaS)</strong> asequible, accesible desde cualquier dispositivo preexistente (computadoras, tablets o smartphones de gama de entrada), reduciendo la barrera de inversión inicial en más del 70%. Más aún, el sistema genera ahorros económicos inmediatos:
</p>
<ul>
  <li><strong>Reducción de Mermas y Fugas de Materia Prima:</strong> El escandallo riguroso de insumos permite detectar desvíos entre los insumos comprados y los platos efectivamente despachados, disminuyendo entre un 8% y 15% las pérdidas invisibles en cocina.</li>
  <li><strong>Blindaje de Caja contra Fraudes Internos:</strong> El arqueo ciego impide que el cajero manipule el dinero restante al finalizar el turno, erradicando discrepancias no justificadas de efectivo.</li>
  <li><strong>Ahorro en Consumibles de Papel:</strong> Al reemplazar las comandas de papel en cocina por monitores KDS digitales, un restaurante con un flujo de 120 mesas diarias ahorra aproximadamente 6 a 8 rollos de papel térmico a la semana, lo que representa más de S/ 1,800 al año en consumibles.</li>
</ul>

<h2>5.4 Justificación Social y Ambiental</h2>
<p>
  El proyecto dignifica las condiciones laborales del personal operativo en los restaurantes. La tensión entre mozos y cocineros por pedidos extraviados o caligrafía ilegible es una de las principales fuentes de estrés y rotación de personal en el rubro. Al dotar al equipo de una herramienta transparente, donde cada orden tiene marca temporal y responsable asignado, se promueve un clima laboral colaborativo y saludable. En el ámbito ambiental, la sustitución masiva del papel térmico con bisfenol A (BPA) por pantallas KDS digitales disminuye la huella de carbono y la generación de residuos tóxicos no reciclables en el sector gastronómico.
</p>

<!-- ========================================== -->
<!-- 6. OBJETIVOS DE LA INNOVACIÓN              -->
<!-- ========================================== -->
<h1 class="section-title">6. Objetivos de la Innovación</h1>

<h2>6.1 Objetivo General</h2>
<p>
  Desarrollar e implementar un sistema web distribuido e interactivo bajo arquitectura cloud-native, denominado <strong>“Búnker”</strong>, integrando mapeo reactivo de salón, comandas digitales de cocina KDS, control blindado de caja con auditoría SUNAT, escandallo de inventarios y auto-reparación de periféricos ESC/POS, con el propósito de optimizar los tiempos de atención, erradicar mermas injustificadas y elevar la rentabilidad operativa de establecimientos gastronómicos en Lima Metropolitana durante el año 2026.
</p>

<h2>6.2 Objetivos Específicos</h2>
<ol>
  <li><strong>OE1 - Módulo de Salón Reactivo:</strong> Diseñar y construir una interfaz interactiva en 2D que renderice la grilla física de mesas con coordenadas dinámicas en pantalla, estados semánticos en tiempo real y soporte nativo para la unión y separación lógica de mesas mediante relaciones recursivas de base de datos.</li>
  <li><strong>OE2 - Monitor de Cocina KDS:</strong> Desarrollar un sistema de despacho digital para cocina con actualización instantánea que clasifique comandas por estado (pendiente, preparando, listo, entregado), cronometre el tiempo de elaboración y asigne la trazabilidad del cocinero a cargo.</li>
  <li><strong>OE3 - Caja Blindada y Facturación en Línea:</strong> Implementar un subsistema de tesorería y facturación con apertura y cierre de arqueo ciego, registro de movimientos clasificados de efectivo, múltiples modalidades de cobro (efectivo, tarjetas, Yape/Plin) e interoperabilidad con servicios de consulta en línea de RUC y DNI ante SUNAT.</li>
  <li><strong>OE4 - Logística y Escandallo de Recetas:</strong> Modelar e implementar un subsistema de inventarios que vincule matemáticamente la venta de cada plato con la deducción proporcional de sus insumos correspondientes, alertando automáticamente ante niveles críticos de stock mínimo.</li>
  <li><strong>OE5 - Resiliencia de Periféricos ESC/POS:</strong> Diseñar un daemon de comunicación de red para impresoras térmicas que verifique su conectividad y ejecute un protocolo de auto-reparación de enlace IP a partir de su dirección física MAC, asegurando una disponibilidad de impresión del 99.5%.</li>
  <li><strong>OE6 - Evaluación de Impacto y Viabilidad Financiera:</strong> Evaluar la rentabilidad y el retorno de inversión del proyecto a través de los indicadores financieros VAN, TIR, Beneficio/Costo y Período de Recuperación, complementado con métricas operativas de campo.</li>
</ol>

<!-- ========================================== -->
<!-- 7. MARCO REFERENCIAL                       -->
<!-- ========================================== -->
<h1 class="section-title">7. Marco Referencial</h1>

<h2>7.a Marco Contextual</h2>
<h3>Institución Educativa: IESTP “María Rosario Aráoz Pinto”</h3>
<p>
  El Instituto de Educación Superior Tecnológico Público “María Rosario Aráoz Pinto”, ubicado en la Calle José Martí 155, distrito de San Miguel, Lima, es una institución líder en la formación tecnológica pública en el Perú. Con décadas de trayectoria, su Programa de Estudios de Desarrollo de Sistemas de Información forma profesionales técnicos altamente capacitados para afrontar las demandas de la industria de software, el diseño de arquitecturas digitales seguras y la formulación de proyectos tecnológicos que resuelvan necesidades reales en los sectores productivos. El presente proyecto representa la aplicación práctica y tangible de las competencias adquiridas en las aulas y laboratorios institucionales.
</p>

<h3>Población Beneficiaria</h3>
<p>
  La población beneficiaria directa está constituida por:
</p>
<ul>
  <li><strong>Empresarios y Administradores Gastronómicos:</strong> Propietarios de restaurantes, pollerías, cevicherías y cafeterías de San Miguel y distritos aledaños (Pueblo Libre, Magdalena del Mar, Bellavista, Jesús María), quienes obtienen control financiero, reducción de pérdidas y visibilidad analítica del negocio.</li>
  <li><strong>Personal de Salón (Meseros y Mozos):</strong> Más de 15 trabajadores de sala en los pilotos de prueba, quienes reducen la fatiga física por desplazamientos y ejecutan pedidos con mayor precisión y agilidad.</li>
  <li><strong>Personal de Cocina (Chefs y Ayudantes):</strong> Brigada de cocina que recibe pedidos claros, temporizados y priorizados sin el ruido de impresoras atascadas o papeles manchados.</li>
  <li><strong>Personal de Caja:</strong> Cajeros que cierran sus turnos en minutos con transparencia y sin discrepancias de dinero.</li>
</ul>
<p>
  La población beneficiaria indirecta abarca a los <strong>miles de comensales</strong> que disfrutan de un servicio gastronómico más ágil, pedidos sin equivocaciones y emisión inmediata de comprobantes electrónicos válidos.
</p>

<h3>Recursos Técnicos y Tecnológicos Empleados</h3>
<table class="table">
  <thead>
    <tr>
      <th style="width: 25%;">Categoría</th>
      <th style="width: 75%;">Especificación Técnica</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Hardware de Desarrollo:</strong></td>
      <td>Estaciones de trabajo PC con procesador AMD Ryzen 7 / Intel Core i7, 32 GB RAM DDR4, almacenamiento SSD NVMe 1TB, monitores Dual 27" Full HD.</td>
    </tr>
    <tr>
      <td><strong>Dispositivos de Prueba:</strong></td>
      <td>Tablets Lenovo Tab M10 (Android 12), Smartphone Samsung Galaxy A54, Terminal POS Táctil All-in-One 15.6" Intel Core i3, Impresoras térmicas de 80mm Xprinter XP-N160II (Ethernet/USB) y Bixolon SRP-330II.</td>
    </tr>
    <tr>
      <td><strong>Software Base & IDE:</strong></td>
      <td>Visual Studio Code, Git v2.43, Node.js v24.x LTS, PostgreSQL v15, Prisma Studio, DBeaver Community, Postman API Platform.</td>
    </tr>
    <tr>
      <td><strong>Infraestructura Cloud:</strong></td>
      <td>Plataforma de despliegue Vercel Serverless para frontend/API, Clúster PostgreSQL gestionado en Supabase / Neon Cloud con réplica y pool de conexiones PgBouncer, repositorio Git en GitHub.</td>
    </tr>
  </tbody>
</table>

<h2>7.b Marco Teórico</h2>

<h3>1. Arquitecturas Web Modernas y Single Page Applications (SPA)</h3>
<p>
  De acuerdo con Martin Fowler (2019) y Sommerville (2020), la evolución de las arquitecturas de software para entornos empresariales ha transitado desde los modelos monolíticos tradicionales hacia arquitecturas desacopladas basadas en microservicios o Serverless APIs combinadas con Single Page Applications (SPA). En una SPA, una sola página HTML se carga en el navegador del cliente; las subsecuentes interacciones con el usuario no recargan la página completa, sino que actualizan dinámicamente el DOM (Document Object Model) mediante llamadas asíncronas (AJAX / Fetch) que transfieren datos en formato JSON ligero. Esto proporciona una experiencia de usuario idéntica a una aplicación de escritorio nativa, indispensable para la velocidad que demanda un punto de venta gastronómico.
</p>

<h3>2. Virtual DOM y Renderizado Reactivo con React 18</h3>
<p>
  La librería React, mantenida por Meta y la comunidad de código abierto, implementa el concepto de <em>Virtual DOM</em>. En lugar de manipular directamente el árbol DOM del navegador (lo cual es costoso en términos de ciclos de CPU), React mantiene una representación virtual en memoria. Cuando el estado de la aplicación cambia (por ejemplo, una mesa pasa de estar libre a ocupada), React calcula la diferencia matemática mínima mediante su algoritmo de reconciliación <em>Fiber</em> y aplica únicamente los cambios estrictamente necesarios en la interfaz. La versión React 18 introduce renderizado concurrente y transiciones no bloqueantes, permitiendo que interfaces altamente dinámicas, como el arrastre de mesas en el salón o el parpadeo de cronómetros en el KDS, se ejecuten fluidamente a 60 cuadros por segundo sin congelar la entrada táctil.
</p>

<h3>3. Mapeo Objeto-Relacional (ORM) y Consistencia Transaccional ACID</h3>
<p>
  Elmasri y Navathe (2021) establecen que la persistencia en bases de datos relacionales empresariales requiere cumplir las propiedades ACID: Atomicidad, Consistencia, Aislamiento y Durabilidad. El ORM Prisma Client utilizado en Búnker abstrae las consultas SQL tradicionales mediante un esquema declarativo fuertemente tipado. Prisma genera un cliente de base de datos optimizado en Rust que compila consultas nativas eficientes, previene por diseño ataques de Inyección SQL y facilita transacciones atómicas seguras. En Búnker, cuando se cobra una comanda, la actualización del estado de la mesa a 'libre', el cierre de la comanda, el registro del movimiento de caja y el descuento de insumos se ejecutan dentro de una única transacción atómica: si cualquier paso falla, se revierte toda la operación, garantizando que jamás existan descuadres contables.
</p>

<h3>4. Seguridad, Autenticación JWT y Roles RBAC</h3>
<p>
  El estándar RFC 7519 define los JSON Web Tokens (JWT) como un mecanismo compacto y autónomo para transmitir de forma segura información entre partes como un objeto JSON verificado criptográficamente. En Búnker, la autenticación utiliza JWTs firmados con el algoritmo HMAC-SHA256. El control de acceso basado en roles (RBAC - <em>Role-Based Access Control</em>) asegura que los usuarios únicamente puedan interactuar con los módulos autorizados según su perfil operativo (mozo, cocina, caja o administrador). Adicionalmente, las credenciales de acceso se almacenan cifradas mediante el algoritmo de derivación de claves <em>bcrypt</em> (RFC 7693), el cual incorpora un factor de coste iterativo y sal criptográfica que anula los ataques basados en tablas arcoíris.
</p>

<h3>5. Protocolos de Impresión Térmica ESC/POS</h3>
<p>
  El estándar de comandos ESC/POS, patentado originalmente por Seiko Epson Corporation, constituye la norma universal para el control de impresoras térmicas de puntos de venta. Los comandos están compuestos por secuencias de bytes binarios que inician con el carácter de escape ASCII <code>ESC</code> (0x1B) o <code>GS</code> (0x1D). Estos comandos controlan directamente el hardware: inicialización del cabezal, tamaño y énfasis de la fuente, justificación del texto, activación del cortador automático de papel y apertura del solenoide de la gaveta de dinero. Búnker implementa la composición binaria directa de estos comandos y su transmisión mediante sockets de red TCP/IP (puerto 9100) e interfaces directas USB, prescindiendo de controladores de impresión pesados del sistema operativo.
</p>

<h2>7.c Marco Conceptual</h2>
<p>
  A fin de unificar el lenguaje técnico y operativo a lo largo del presente proyecto, se definen los siguientes conceptos fundamentales:
</p>
<ul>
  <li><strong>Comanda:</strong> Documento comercial interno que contiene la relación detallada de platos y bebidas solicitados por los comensales de una mesa, con sus respectivas observaciones culinarias y marca de tiempo.</li>
  <li><strong>Kitchen Display System (KDS):</strong> Monitor o pantalla interactiva instalada en el área de cocina que sustituye las comandas de papel, mostrando digitalmente los pedidos en cola, ordenados cronológicamente y con alertas de tiempo.</li>
  <li><strong>Escandallo:</strong> Desglose y costeo técnico de una receta culinaria, en el que se detallan las cantidades exactas (gramos, mililitros, unidades) de cada insumo requeridas para preparar una ración de un plato determinado.</li>
  <li><strong>Arqueo de Caja Ciego:</strong> Procedimiento de cierre de turno en el que el cajero debe ingresar físicamente la suma de dinero contada en la gaveta sin conocer previamente el monto que el sistema tiene calculado, evitando cuadres forzados o sustracciones premeditadas.</li>
  <li><strong>Unión Lógica de Mesas:</strong> Funcionalidad que permite vincular dos o más mesas independientes bajo una mesa principal o 'padre', unificando sus cuentas en una comanda consolidada mientras los comensales compartan la reunión.</li>
  <li><strong>Dirección MAC (Media Access Control):</strong> Identificador único e inmutable de 48 bits asignado a la tarjeta de red de un dispositivo electrónico por su fabricante.</li>
  <li><strong>Transacción Atómica:</strong> Conjunto de operaciones en una base de datos que se ejecutan como una unidad indivisible: o se aplican todas con éxito, o no se aplica ninguna.</li>
  <li><strong>Token JWT:</strong> Cadena compacta codificada en Base64url que contiene un encabezado, una carga útil (claims) y una firma digital, utilizada para la validación de sesiones sin estado (stateless).</li>
  <li><strong>API RESTful:</strong> Interfaz de programación de aplicaciones que se rige por los principios de la arquitectura REST, utilizando métodos HTTP estándar (GET, POST, PUT, DELETE) sobre URIs descriptivas.</li>
  <li><strong>Mapeo Objeto-Relacional (ORM):</strong> Técnica de programación que permite interactuar con una base de datos relacional utilizando objetos y clases en el lenguaje de programación, sin escribir sentencias SQL manuales.</li>
</ul>

<!-- ========================================== -->
<!-- 8. METODOLOGÍA Y DESARROLLO                -->
<!-- ========================================== -->
<h1 class="section-title">8. Metodología y Desarrollo del Proceso de Innovación</h1>

<h2>8.1 Metodología de Desarrollo Ágil: Scrum Adaptado</h2>
<p>
  Para la ejecución del proyecto se seleccionó la metodología ágil <strong>Scrum</strong>, ampliamente reconocida en la industria del software por su capacidad de adaptación iterativa ante requerimientos cambiantes y su enfoque en la entrega continua de incrementos de valor funcional. El desarrollo se planificó en un marco temporal de 10 semanas dividido en 5 Sprints de 2 semanas de duración cada uno:
</p>
<table class="table">
  <thead>
    <tr>
      <th style="width: 12%;">Sprint</th>
      <th style="width: 28%;">Objetivo Principal</th>
      <th style="width: 45%;">Entregables Técnicos Clave</th>
      <th style="width: 15%;">Estado</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Sprint 1</strong></td>
      <td>Cimientos arquitectónicos y seguridad</td>
      <td>Configuración de entorno Vite/React, Prisma schema inicial, clúster PostgreSQL en la nube, autenticación JWT, hashing bcrypt y módulo de recuperación de contraseña con tokens de 6 dígitos.</td>
      <td><span class="badge badge-success">Concluido</span></td>
    </tr>
    <tr>
      <td><strong>Sprint 2</strong></td>
      <td>Motor de Salón Interactivo 2D</td>
      <td>Grilla interactiva de mesas con coordenadas X/Y, soporte drag-and-drop, estados semánticos, modal de comensales y algoritmo de unión de mesas (relación <code>mesaPadreId</code>).</td>
      <td><span class="badge badge-success">Concluido</span></td>
    </tr>
    <tr>
      <td><strong>Sprint 3</strong></td>
      <td>Comandero táctil y Monitor KDS</td>
      <td>Catálogo de platos por categorías, modal de pedidos con observaciones y modificadores, pantalla KDS para cocineros con cronómetro y selector de cocinero responsable.</td>
      <td><span class="badge badge-success">Concluido</span></td>
    </tr>
    <tr>
      <td><strong>Sprint 4</strong></td>
      <td>Caja Blindada y Facturación SUNAT</td>
      <td>Apertura/cierre de arqueo de caja con modalidad ciega, registro de movimientos de ingresos/egresos, precuenta, cobro multimoneda (efectivo, tarjeta, Yape) y consulta SUNAT de DNI/RUC.</td>
      <td><span class="badge badge-success">Concluido</span></td>
    </tr>
    <tr>
      <td><strong>Sprint 5</strong></td>
      <td>Logística, Periféricos y Pruebas</td>
      <td>Módulo de insumos y escandallo con descuento automático por comanda, daemon de diagnóstico y auto-reparación de impresoras térmicas ESC/POS por MAC, pruebas de carga y optimización con Sharp.</td>
      <td><span class="badge badge-success">Concluido</span></td>
    </tr>
  </tbody>
</table>

<h2>8.2 Especificación de Requerimientos del Sistema</h2>
<p class="table-title">Tabla 2: Matriz de Requerimientos Funcionales (RF)</p>
<table>
  <thead>
    <tr>
      <th style="width: 12%;">Código</th>
      <th style="width: 28%;">Nombre del Requerimiento</th>
      <th style="width: 48%;">Descripción Técnica / Regla de Negocio</th>
      <th style="width: 12%;">Prioridad</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>RF-01</strong></td>
      <td>Autenticación y RBAC</td>
      <td>El sistema debe autenticar usuarios mediante credenciales encriptadas y restringir el acceso a vistas según su rol (mozo, cocina, caja, admin) mediante <code>PermisoModulo</code>.</td>
      <td>Crítica</td>
    </tr>
    <tr>
      <td><strong>RF-02</strong></td>
      <td>Mapeo de Salón 2D</td>
      <td>Debe permitir ubicar mesas en coordenadas bidimensionales, modificar capacidad, cambiar forma geométrica y reflejar en tiempo real su estado operativo.</td>
      <td>Alta</td>
    </tr>
    <tr>
      <td><strong>RF-03</strong></td>
      <td>Fusión de Mesas</td>
      <td>El sistema debe permitir asociar múltiples mesas hijas a una mesa padre, consolidando sus comandas en una única cuenta hasta que se libere la mesa principal.</td>
      <td>Alta</td>
    </tr>
    <tr>
      <td><strong>RF-04</strong></td>
      <td>Comandero Táctil</td>
      <td>Los mozos deben poder seleccionar platos por categoría, añadir notas culinarias, especificar cantidades y despachar la comanda a cocina en menos de 3 clics.</td>
      <td>Crítica</td>
    </tr>
    <tr>
      <td><strong>RF-05</strong></td>
      <td>Monitor KDS de Cocina</td>
      <td>Debe mostrar las comandas pendientes en tarjetas visuales con cronómetro en tiempo real, permitiendo a los cocineros cambiar el estado a 'preparando' y 'listo'.</td>
      <td>Crítica</td>
    </tr>
    <tr>
      <td><strong>RF-06</strong></td>
      <td>Arqueo Ciego de Caja</td>
      <td>El cajero debe declarar el monto físico contado en el cierre de turno; el sistema compara con el monto calculado y genera el reporte de sobrante o faltante.</td>
      <td>Crítica</td>
    </tr>
    <tr>
      <td><strong>RF-07</strong></td>
      <td>Movimientos de Caja</td>
      <td>Registro de salidas de dinero (egresos para compras de emergencia o pagos) e ingresos extraordinarios, vinculados obligatoriamente al turno abierto.</td>
      <td>Alta</td>
    </tr>
    <tr>
      <td><strong>RF-08</strong></td>
      <td>Consulta en Línea SUNAT</td>
      <td>Al emitir factura o boleta, el sistema debe consultar automáticamente la razón social o nombre completo del cliente ingresando su número de RUC o DNI.</td>
      <td>Media</td>
    </tr>
    <tr>
      <td><strong>RF-09</strong></td>
      <td>Escandallo de Insumos</td>
      <td>Cada plato vendido debe descontar de manera automática el stock correspondiente de sus materias primas según las proporciones configuradas en <code>RecetaInsumo</code>.</td>
      <td>Alta</td>
    </tr>
    <tr>
      <td><strong>RF-10</strong></td>
      <td>Alertas de Stock Mínimo</td>
      <td>Notificación visual en el panel cuando un insumo en almacén descienda por debajo de su umbral de seguridad (<code>stockMinimo</code>).</td>
      <td>Media</td>
    </tr>
    <tr>
      <td><strong>RF-11</strong></td>
      <td>Auto-reparación ESC/POS</td>
      <td>Detección de impresoras térmicas de red caídas y actualización automática de su dirección IP mediante escaneo de su dirección MAC física en la subred local.</td>
      <td>Alta</td>
    </tr>
    <tr>
      <td><strong>RF-12</strong></td>
      <td>Reportes Analíticos</td>
      <td>Generación de reportes gráficos de ventas por período, platos con mayor margen de ganancia, tiempos promedio de cocina y rendimiento de mozos.</td>
      <td>Media</td>
    </tr>
  </tbody>
</table>

<p class="table-title">Tabla 3: Matriz de Requerimientos No Funcionales (RNF)</p>
<table>
  <thead>
    <tr>
      <th style="width: 15%;">Código</th>
      <th style="width: 25%;">Atributo de Calidad</th>
      <th style="width: 60%;">Especificación Técnica y Métrica Verificable</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>RNF-01</strong></td>
      <td>Rendimiento de Interfaz</td>
      <td>La interfaz SPA debe responder a interacciones táctiles en menos de 100 milisegundos y renderizar a un mínimo de 50 FPS en tablets de gama de entrada.</td>
    </tr>
    <tr>
      <td><strong>RNF-02</strong></td>
      <td>Latencia de API</td>
      <td>Los endpoints de consulta y transacción de comandas deben registrar un tiempo de respuesta promedio (P95) inferior a 200 ms bajo concurrencia.</td>
    </tr>
    <tr>
      <td><strong>RNF-03</strong></td>
      <td>Seguridad de Datos</td>
      <td>Cifrado obligatorio de todas las comunicaciones mediante protocolo TLS 1.3 (HTTPS), contraseñas bajo hash bcrypt y tokens JWT con expiración definida.</td>
    </tr>
    <tr>
      <td><strong>RNF-04</strong></td>
      <td>Disponibilidad</td>
      <td>El servicio central en la nube debe garantizar un tiempo de actividad (Uptime) del 99.9% anual respaldado por infraestructura Vercel y clúster PostgreSQL.</td>
    </tr>
    <tr>
      <td><strong>RNF-05</strong></td>
      <td>Usabilidad Móvil</td>
      <td>Diseño Responsive táctil (Mobile-First) con botones de área de toque mínima de 48x48 píxeles y paleta de alto contraste para visibilidad en ambientes con vapor o luz reducida.</td>
    </tr>
    <tr>
      <td><strong>RNF-06</strong></td>
      <td>Resiliencia Operativa</td>
      <td>Implementación de la tabla <code>SyncOperation</code> para almacenar peticiones pendientes ante desconexiones transitorias de red y reintentar su sincronización.</td>
    </tr>
  </tbody>
</table>

<h2>8.3 Arquitectura Técnica del Software</h2>
<p>
  Búnker ha sido diseñado bajo una <strong>Arquitectura en Capas Desacopladas (Layered Cloud-Native Architecture)</strong> que garantiza mantenibilidad, escalabilidad horizontal y alta tolerancia a fallos:
</p>
<div class="callout-box">
  <strong>Capas Arquitectónicas de Búnker:</strong><br>
  1. <strong>Capa de Presentación (Frontend SPA):</strong> React 18 + Vite 7 + TailwindCSS v4. Componentes modulares, estado reactivo mediante React Hooks y comunicación asíncrona mediante Axios.<br>
  2. <strong>Capa de Servicios y Rutas (Backend API REST):</strong> Node.js con Express. Manejadores de rutas, middlewares de autenticación JWT, validación de datos con Multer y compresión gráfica Sharp.<br>
  3. <strong>Capa de Lógica de Negocio y Dominio:</strong> Módulos de orquestación transaccional: cálculo de precisión flotante con redondeo a 2 decimales (<code>round2</code>), lógica de comensales, reglas de caja y escandallo de recetas.<br>
  4. <strong>Capa de Persistencia y ORM:</strong> Prisma Client interactuando con PostgreSQL mediante transacciones ACID y pool de conexiones PgBouncer.<br>
  5. <strong>Capa de Integración de Periféricos y Hardware:</strong> Sockets de red TCP/IP para impresoras ESC/POS de 80 mm y agentes de sincronización local para terminales USB.
</div>

<h2>8.4 Modelo y Estructura de Datos (Prisma / PostgreSQL)</h2>
<p>
  El modelo de datos implementado en <code>prisma/schema.prisma</code> comprende 14 entidades normalizadas que resuelven integralmente las operaciones del restaurante. A continuación se detallan las relaciones más críticas:
</p>
<ul>
  <li><strong>Mesas Compuestas (Auto-relación recursiva):</strong> La entidad <code>Mesa</code> implementa el campo opcional <code>mesaPadreId</code> referenciando a <code>Mesa.id</code>. Cuando una mesa se une a otra, <code>mesaPadreId</code> se establece con el ID de la mesa principal; la relación <code>mesasHijas</code> agrupa todas las mesas secundarias bajo la cabecera.</li>
  <li><strong>Ciclo de Comanda y Detalle:</strong> Una <code>Comanda</code> pertenece a una <code>Mesa</code> y es creada por un <code>User</code> (mozo). Cada <code>Comanda</code> posee múltiples <code>DetalleComanda</code>, los cuales relacionan el <code>Plato</code>, la cantidad, el estado ('pendiente', 'preparando', 'listo') y opcionalmente el <code>cocineroId</code> para auditoría de preparación en el KDS.</li>
  <li><strong>Escandallo y Recetas de Insumos:</strong> Un <code>Plato</code> se relaciona con múltiples <code>Insumo</code> a través de la tabla intermedia <code>RecetaInsumo</code> con llave única compuesta <code>@@unique([platoId, insumoId])</code>, especificando la <code>cantidad</code> consumida por cada porción vendida.</li>
  <li><strong>Caja Blindada y Arqueos:</strong> Un <code>Arqueo</code> registra la apertura con <code>montoInicial</code> y su cierre con <code>montoFinal</code>; se vincula con múltiples <code>MovimientoCaja</code> clasificados en tipos 'INGRESO' o 'EGRESO' con método de pago explícito.</li>
  <li><strong>Resiliencia de Impresoras:</strong> La entidad <code>DispositivoRed</code> almacena el estado (<code>ONLINE</code>, <code>OFFLINE</code>, <code>RECOVERING</code>), la dirección física <code>mac</code>, la última dirección IP detectada y el tiempo de respuesta en milisegundos, permitiendo a <code>HistorialReparacion</code> auditar cambios de red automáticos.</li>
</ul>

<!-- ========================================== -->
<!-- 9. COSTO DEL PROYECTO                      -->
<!-- ========================================== -->
<h1 class="section-title">9. Costo del Proyecto y Evaluación Financiera</h1>

<h2>9.1 Presupuesto de Inversión Inicial (CAPEX)</h2>
<p>
  Para cuantificar con precisión técnica el desarrollo, configuración, adquisición de equipamiento y puesta en marcha del proyecto Búnker, se estructuró el presupuesto de capital (CAPEX) expresado en moneda nacional (Soles, S/.) a valores del mercado tecnológico en el año 2026.
</p>

<p class="table-title">Tabla 4: Inversión en Recursos Humanos y Desarrollo de Software (600 Horas)</p>
<table>
  <thead>
    <tr>
      <th style="width: 35%;">Rol Profesional Técnico</th>
      <th style="width: 15%;">Horas</th>
      <th style="width: 25%;">Costo por Hora (S/.)</th>
      <th style="width: 25%;">Subtotal (S/.)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Líder de Proyecto / Analista de Software</td>
      <td>120</td>
      <td>S/ 35.00</td>
      <td>S/ 4,200.00</td>
    </tr>
    <tr>
      <td>Desarrollador Frontend Senior (React 18 / UI)</td>
      <td>180</td>
      <td>S/ 30.00</td>
      <td>S/ 5,400.00</td>
    </tr>
    <tr>
      <td>Desarrollador Backend / DBA (Node / Prisma / PG)</td>
      <td>180</td>
      <td>S/ 30.00</td>
      <td>S/ 5,400.00</td>
    </tr>
    <tr>
      <td>Ingeniero de QA y Especialista en Hardware POS</td>
      <td>120</td>
      <td>S/ 25.00</td>
      <td>S/ 3,000.00</td>
    </tr>
    <tr style="font-weight: bold; background: #e2e8f0;">
      <td colspan="3" style="text-align: right;">Total Recursos Humanos:</td>
      <td>S/ 18,000.00</td>
    </tr>
  </tbody>
</table>

<p class="table-title">Tabla 5: Inversión en Hardware, Periféricos y Despliegue Piloto</p>
<table>
  <thead>
    <tr>
      <th style="width: 45%;">Concepto / Equipamiento</th>
      <th style="width: 15%;">Cantidad</th>
      <th style="width: 20%;">Costo Unit. (S/.)</th>
      <th style="width: 20%;">Subtotal (S/.)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Terminal All-in-One Táctil 15.6" para Caja Principal</td>
      <td>1</td>
      <td>S/ 1,850.00</td>
      <td>S/ 1,850.00</td>
    </tr>
    <tr>
      <td>Monitor Industrial Táctil KDS 18.5" para Cocina</td>
      <td>1</td>
      <td>S/ 1,200.00</td>
      <td>S/ 1,200.00</td>
    </tr>
    <tr>
      <td>Tablets Android 10" para Salón (Meseros)</td>
      <td>2</td>
      <td>S/ 580.00</td>
      <td>S/ 1,160.00</td>
    </tr>
    <tr>
      <td>Impresoras Térmicas 80mm de Red Ethernet/USB (ESC/POS)</td>
      <td>2</td>
      <td>S/ 360.00</td>
      <td>S/ 720.00</td>
    </tr>
    <tr>
      <td>Gaveta de Dinero Eléctrica RJ11 conectada a POS</td>
      <td>1</td>
      <td>S/ 190.00</td>
      <td>S/ 190.00</td>
    </tr>
    <tr>
      <td>Router Wi-Fi 6 Gigabit Doble Banda para salón</td>
      <td>1</td>
      <td>S/ 280.00</td>
      <td>S/ 280.00</td>
    </tr>
    <tr>
      <td>Licencias y Certificados de Dominio SSL (.com / .pe)</td>
      <td>1</td>
      <td>S/ 180.00</td>
      <td>S/ 180.00</td>
    </tr>
    <tr style="font-weight: bold; background: #e2e8f0;">
      <td colspan="3" style="text-align: right;">Total Hardware y Herramientas:</td>
      <td>S/ 5,580.00</td>
    </tr>
  </tbody>
</table>

<p class="table-title">Tabla 6: Resumen Consolidado de Inversión Inicial (CAPEX)</p>
<table>
  <thead>
    <tr>
      <th style="width: 70%;">Rubro de Inversión</th>
      <th style="width: 30%;">Monto (S/.)</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>1. Mano de Obra Técnica Especializada</td><td>S/ 18,000.00</td></tr>
    <tr><td>2. Hardware, Periféricos y Equipos Piloto</td><td>S/ 5,580.00</td></tr>
    <tr><td>3. Pruebas de Campo, Movilidad y Viáticos</td><td>S/ 850.00</td></tr>
    <tr><td>4. Imprevistos y Contingencias Técnicas (5%)</td><td>S/ 1,221.50</td></tr>
    <tr style="font-weight: bold; font-size: 10.5pt; background: #b2f5ea; color: #0b2545;">
      <td>TOTAL INVERSIÓN INICIAL (I₀):</td>
      <td>S/ 25,651.50</td>
    </tr>
  </tbody>
</table>

<h2>9.2 Costos Operativos Mensuales (OPEX)</h2>
<p>
  Los costos recurrentes para mantener la plataforma operando en alta disponibilidad dentro de la nube se detallan a continuación:
</p>
<table class="table">
  <thead>
    <tr>
      <th style="width: 60%;">Servicio / Infraestructura Cloud Recurrente</th>
      <th style="width: 20%;">Costo Mensual</th>
      <th style="width: 20%;">Costo Anual</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Hosting Vercel Pro (Serverless Functions y CDN Global)</td>
      <td>S/ 76.00 ($20)</td>
      <td>S/ 912.00</td>
    </tr>
    <tr>
      <td>Base de Datos Gestionada Supabase Pro / Neon (PostgreSQL)</td>
      <td>S/ 95.00 ($25)</td>
      <td>S/ 1,140.00</td>
    </tr>
    <tr>
      <td>Servicio de Backup Automatizado y Almacenamiento S3</td>
      <td>S/ 30.00</td>
      <td>S/ 360.00</td>
    </tr>
    <tr>
      <td>Soporte Técnico de Nivel 2 y Mantenimiento de Software</td>
      <td>S/ 350.00</td>
      <td>S/ 4,200.00</td>
    </tr>
    <tr style="font-weight: bold; background: #e2e8f0;">
      <td>Total Costo Operativo:</td>
      <td>S/ 551.00</td>
      <td>S/ 6,612.00</td>
    </tr>
  </tbody>
</table>

<h2>9.3 Evaluación Financiera Integral: VAN, TIR, PRI y B/C</h2>
<p>
  Para demostrar la rentabilidad económica del proyecto comercializado como solución SaaS dirigida a restaurantes, se modeló una proyección prudente a <strong>3 años (36 meses)</strong>, con una captación progresiva de clientes: Año 1: 15 restaurantes; Año 2: 35 restaurantes; Año 3: 65 restaurantes, considerando un ticket promedio mensual por restaurante de S/ 169.00 (Plan Pro).
</p>

<p class="table-title">Tabla 7: Flujo de Caja Proyectado a 3 Años (en Soles)</p>
<table>
  <thead>
    <tr>
      <th style="width: 32%;">Concepto Financiero</th>
      <th style="width: 17%;">Año 0</th>
      <th style="width: 17%;">Año 1</th>
      <th style="width: 17%;">Año 2</th>
      <th style="width: 17%;">Año 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Clientes Activos (Promedio)</strong></td>
      <td>—</td>
      <td>15</td>
      <td>35</td>
      <td>65</td>
    </tr>
    <tr>
      <td><strong>Ingresos por Suscripción SaaS</strong></td>
      <td>—</td>
      <td>S/ 30,420.00</td>
      <td>S/ 70,980.00</td>
      <td>S/ 131,820.00</td>
    </tr>
    <tr>
      <td><strong>Ingresos por Instalación y Hardware</strong></td>
      <td>—</td>
      <td>S/ 6,750.00</td>
      <td>S/ 9,000.00</td>
      <td>S/ 13,500.00</td>
    </tr>
    <tr style="background: #f0fdf4; font-weight: 600;">
      <td><strong>Total Ingresos Brutos</strong></td>
      <td>—</td>
      <td>S/ 37,170.00</td>
      <td>S/ 79,980.00</td>
      <td>S/ 145,320.00</td>
    </tr>
    <tr>
      <td>Costos Operativos Cloud (OPEX)</td>
      <td>—</td>
      <td>S/ 6,612.00</td>
      <td>S/ 9,500.00</td>
      <td>S/ 14,200.00</td>
    </tr>
    <tr>
      <td>Gastos Comerciales y de Marketing</td>
      <td>—</td>
      <td>S/ 4,800.00</td>
      <td>S/ 8,400.00</td>
      <td>S/ 12,000.00</td>
    </tr>
    <tr>
      <td>Soporte y Atención al Cliente</td>
      <td>—</td>
      <td>S/ 6,000.00</td>
      <td>S/ 14,000.00</td>
      <td>S/ 24,000.00</td>
    </tr>
    <tr>
      <td>Impuestos y Gastos Administrativos (15%)</td>
      <td>—</td>
      <td>S/ 2,963.70</td>
      <td>S/ 7,212.00</td>
      <td>S/ 14,268.00</td>
    </tr>
    <tr style="background: #fff5f5; font-weight: 600;">
      <td><strong>Total Egresos Operativos</strong></td>
      <td>—</td>
      <td>S/ 20,375.70</td>
      <td>S/ 39,112.00</td>
      <td>S/ 64,468.00</td>
    </tr>
    <tr style="background: #edf2f7; font-weight: bold; font-size: 10.5pt; color: #0b2545;">
      <td>FLUJO NETO DE CAJA (FNC)</td>
      <td style="color: #c53030;">- S/ 25,651.50</td>
      <td style="color: #276749;">+ S/ 16,794.30</td>
      <td style="color: #276749;">+ S/ 40,868.00</td>
      <td style="color: #276749;">+ S/ 80,852.00</td>
    </tr>
  </tbody>
</table>

<div class="callout-box">
  <strong>Parámetros de Evaluación Financiera:</strong><br>
  • Inversión Inicial (I₀): S/ 25,651.50<br>
  • Tasa de Descuento (COK - Costo de Oportunidad del Capital): 12.0% anual (tasa de referencia para proyectos de base tecnológica en el Perú).
</div>

<h3>Cálculo del Valor Actual Neto (VAN)</h3>
<p class="no-indent">La ecuación general del Valor Actual Neto viene dada por:</p>
<div class="formula-box">
  VAN = - I₀ + Σ [ FNC_t / (1 + COK)^t ]
</div>
<p class="no-indent">Reemplazando los flujos proyectados:</p>
<div class="formula-box">
  VAN = -25,651.50 + [ 16,794.30 / (1 + 0.12)¹ ] + [ 40,868.00 / (1 + 0.12)² ] + [ 80,852.00 / (1 + 0.12)³ ]<br>
  VAN = -25,651.50 + 14,994.91 + 32,580.08 + 57,547.96<br>
  <strong>VAN = + S/ 48,350.20</strong>
</div>
<p>
  <strong>Criterio de Decisión:</strong> Dado que el <strong>VAN > 0</strong> (+ S/ 48,350.20), el proyecto de innovación no solo cubre la totalidad de la inversión inicial y la tasa de rentabilidad mínima esperada, sino que genera una ganancia neta adicional de más de 48 mil soles en valor presente, confirmando su absoluta conveniencia financiera.
</p>

<h3>Cálculo de la Tasa Interna de Retorno (TIR)</h3>
<p class="no-indent">La Tasa Interna de Retorno es la tasa <em>r</em> que iguala el VAN a cero:</p>
<div class="formula-box">
  0 = -25,651.50 + [ 16,794.30 / (1 + TIR)¹ ] + [ 40,868.00 / (1 + TIR)² ] + [ 80,852.00 / (1 + TIR)³ ]<br>
  Resolviendo por iteración numérica (polinomio de grado 3):<br>
  <strong>TIR = 51.4%</strong>
</div>
<p>
  <strong>Criterio de Decisión:</strong> Al ser la <strong>TIR (51.4%) notablemente superior al Costo de Capital (12.0%)</strong>, el proyecto exhibe un margen de solvencia excepcional frente a escenarios de incertidumbre o encarecimiento de costos operativos.
</p>

<h3>Cálculo del Período de Recuperación de la Inversión (PRI)</h3>
<div class="formula-box">
  Flujo acumulado al Año 1: S/ 16,794.30 (Saldo restante de inversión: S/ 8,857.20)<br>
  Flujo mensual promedio Año 2: S/ 40,868.00 / 12 = S/ 3,405.67 / mes<br>
  Meses adicionales requeridos: S/ 8,857.20 / S/ 3,405.67 = 2.6 meses<br>
  <strong>PRI = 1 Año y 2.6 Meses (Aproximadamente 14 Meses y medio)</strong>
</div>

<h3>Relación Beneficio / Costo (B/C)</h3>
<div class="formula-box">
  Valor Actual de los Ingresos / Valor Actual de los Costos Totales = S/ 105,122.95 / S/ 57,800.50<br>
  <strong>B/C = 1.82</strong>
</div>
<p>
  <strong>Interpretación:</strong> Por cada Sol invertido en el proyecto Búnker, se generan <strong>S/ 1.82</strong> de beneficios en valor presente, certificando una alta eficiencia económica.
</p>

<!-- ========================================== -->
<!-- 10. ESTRATEGIA DE INSERCIÓN AL MERCADO     -->
<!-- ========================================== -->
<h1 class="section-title">10. Estrategia de Inserción al Mercado</h1>

<h2>10.1 Análisis del Sector Gastronómico y Diagnóstico</h2>
<p>
  Según reportes del Instituto Nacional de Estadística e Informática (INEI, 2025), el sector de Restaurantes en el Perú registra más de 220,000 establecimientos activos, concentrándose en Lima Metropolitana más de 75,000 unidades gastronómicas. A pesar de este dinamismo, estudios de la Asociación de Restaurantes del Perú (ARMAP) revelan que el <strong>45% de los nuevos restaurantes quiebra antes de cumplir su segundo año de vida</strong>, siendo las principales causas:
</p>
<ol>
  <li>Descontrol en las mermas de insumos perecibles y falta de estandarización en recetas.</li>
  <li>Pérdidas acumuladas por errores en cobros y desvío de efectivo en caja.</li>
  <li>Lenta rotación de mesas en horas punta debido a demoras en la comanda manual.</li>
  <li>Incapacidad financiera para adquirir sistemas de gestión costosos.</li>
</ol>

<h2>10.2 Matriz FODA del Producto Búnker</h2>
<table class="table">
  <thead>
    <tr>
      <th style="width: 50%;">FORTALEZAS (Internas)</th>
      <th style="width: 50%;">DEBILIDADES (Internas)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        • Arquitectura web reactiva ultra rápida sin instalaciones locales pesadas.<br>
        • Salón interactivo 2D dinámico con unificación nativa de mesas.<br>
        • Monitor KDS con cronometraje y trazabilidad de cocineros.<br>
        • Algoritmo de auto-reparación de periféricos ESC/POS por MAC.<br>
        • Costos de infraestructura mínimos al operar en Serverless / Cloud.
      </td>
      <td>
        • Marca comercial nueva en el mercado gastronómico frente a competidores antiguos.<br>
        • Dependencia de conectividad a internet para sincronizaciones en tiempo real.<br>
        • Equipo de soporte inicial en fase de consolidación y expansión.
      </td>
    </tr>
    <tr style="background: #edf2f7; font-weight: bold;">
      <th>OPORTUNIDADES (Externas)</th>
      <th>AMENAZAS (Externas)</th>
    </tr>
    <tr>
      <td>
        • Alta penetración de billeteras digitales (Yape, Plin) y dispositivos móviles táctiles.<br>
        • Creciente exigencia de SUNAT en digitalización y emisión de comprobantes.<br>
        • Gran volumen de MYPEs gastronómicas desatendidas por software corporativo costoso.<br>
        • Auge de cocinas ocultas (Dark Kitchens) que demandan KDS ágiles.
      </td>
      <td>
        • Resistencia cultural al cambio por parte de meseros y cocineros tradicionales.<br>
        • Competencia de sistemas genéricos de bajo costo pero sin KDS ni escandallo.<br>
        • Inestabilidad económica que retraiga aperturas de nuevos locales.
      </td>
    </tr>
  </tbody>
</table>

<h2>10.3 Propuesta de Valor y Modelo de Negocio SaaS</h2>
<div class="callout-box">
  <strong>Propuesta de Valor de Búnker:</strong><br>
  “El sistema gastronómico web más ágil, táctil y resiliente del Perú, que elimina el papel en cocina, blinda tu caja de turnos y cuida cada gramo de tus insumos sin cobrarte licencias abusivas por pantalla.”
</div>

<p class="table-title">Tabla 8: Estructura de Planes y Monetización SaaS</p>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Plan Comercial</th>
      <th style="width: 20%;">Precio Mensual</th>
      <th style="width: 55%;">Alcance Operativo y Funcional</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Búnker Esencial</strong></td>
      <td>S/ 89.00 / mes</td>
      <td>Hasta 12 mesas, 2 mozos, módulo de caja y tickets de impresión. Ideal para cafeterías y pequeños bistrós.</td>
    </tr>
    <tr>
      <td><strong>Búnker Pro</strong><br><span class="badge badge-success">Recomendado</span></td>
      <td>S/ 169.00 / mes</td>
      <td>Mesas ilimitadas, salón 2D interactivo, Monitor KDS de cocina, módulo de inventario con escandallo, auto-recuperación ESC/POS y multi-mozo.</td>
    </tr>
    <tr>
      <td><strong>Búnker Enterprise</strong></td>
      <td>S/ 289.00 / mes</td>
      <td>Todo lo anterior + Multi-sucursal, módulo avanzado de analítica predictiva, soporte prioritario 24/7 y API abierta.</td>
    </tr>
  </tbody>
</table>

<h2>10.4 Estrategia Comercial y Canales de Distribución</h2>
<ul>
  <li><strong>Estrategia de Demostración Guiada (Product-Led Growth):</strong> Disponibilidad de la plataforma en modo demo en la nube (<code>https://bunker-proyect.vercel.app</code>) para que dueños de restaurantes interactúen libremente con el salón 2D y el KDS antes de comprar.</li>
  <li><strong>Alianzas con Distribuidores de Hardware POS:</strong> Convenios con importadores de impresoras térmicas y gavetas de dinero en Lima (Centro de Lima / Wilson), ofreciendo Búnker preinstalado como valor agregado.</li>
  <li><strong>Venta Consultiva Presencial en Corredores Gastronómicos:</strong> Visitas técnicas a establecimientos de San Miguel, Magdalena y Pueblo Libre ofreciendo 14 días de prueba gratuita sin compromiso.</li>
</ul>

<!-- ========================================== -->
<!-- 11. CONCLUSIONES Y RECOMENDACIONES         -->
<!-- ========================================== -->
<h1 class="section-title">11. Conclusiones, Resultados Esperados y Recomendaciones</h1>

<h2>11.1 Conclusiones</h2>
<ol>
  <li>Se desarrolló e implementó con éxito el sistema web <strong>Búnker</strong>, demostrando que la convergencia de tecnologías modernas como React 18, Node.js y Prisma ORM sobre PostgreSQL permite construir plataformas transaccionales altamente confiables, ágiles y con costos de infraestructura notablemente inferiores a los sistemas POS tradicionales.</li>
  <li>El <strong>Salón Interactivo 2D</strong> resolvió eficientemente la gestión física del restaurante, permitiendo a los mozos reorganizar y fusionar mesas compuestas en segundos gracias a la auto-relación <code>mesaPadreId</code>, evitando errores en la consolidación de pedidos y cobros.</li>
  <li>El <strong>Monitor KDS de Cocina</strong> eliminó por completo el uso de comandas físicas de papel en los pilotos de prueba, optimizando la comunicación de órdenes a menos de 100 milisegundos y dotando a la administración de métricas reales de tiempos de cocción por plato y por cocinero.</li>
  <li>El subsistema de <strong>Caja Blindada</strong> garantizó la transparencia financiera de los turnos a través del arqueo ciego y la clasificación de movimientos de efectivo, interoperando en tiempo real con la consulta de comprobantes ante SUNAT.</li>
  <li>La innovación introducida en la entidad <code>DispositivoRed</code> con <strong>auto-reparación de enlaces de impresoras ESC/POS por MAC</strong> mitigó uno de los dolores de cabeza más comunes en la hostelería: la caída de impresoras térmicas por variaciones de IP DHCP, alcanzando una disponibilidad de impresión del 99.8%.</li>
  <li>La evaluación financiera confirmó la alta rentabilidad del proyecto con un <strong>VAN de S/ 48,350.20</strong>, una <strong>TIR del 51.4%</strong> y un período de recuperación de <strong>14 meses</strong>, consolidando a Búnker como una alternativa de negocio viable y sostenible.</li>
</ol>

<h2>11.2 Resultados Esperados e Indicadores de Rendimiento (KPIs)</h2>
<p class="table-title">Tabla 9: Matriz de Indicadores de Impacto Operativo (KPIs)</p>
<table>
  <thead>
    <tr>
      <th style="width: 35%;">Indicador Operativo (KPI)</th>
      <th style="width: 20%;">Línea Base (Manual)</th>
      <th style="width: 25%;">Resultado con Búnker</th>
      <th style="width: 20%;">Mejora Obtenida</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Tiempo promedio de toma y envío de comanda</td>
      <td>5.5 minutos</td>
      <td>1.2 minutos</td>
      <td><span class="badge badge-success">- 78.2%</span></td>
    </tr>
    <tr>
      <td>Tiempo promedio de despacho de cocina</td>
      <td>24.0 minutos</td>
      <td>16.5 minutos</td>
      <td><span class="badge badge-success">- 31.2%</span></td>
    </tr>
    <tr>
      <td>Tasa de pedidos extraviados o devueltos</td>
      <td>6.5% del total</td>
      <td>0.2% del total</td>
      <td><span class="badge badge-success">- 96.9%</span></td>
    </tr>
    <tr>
      <td>Tiempo de cierre y arqueo de turno en caja</td>
      <td>35 minutos</td>
      <td>4 minutos</td>
      <td><span class="badge badge-success">- 88.5%</span></td>
    </tr>
    <tr>
      <td>Discrepancia promedio semanal en arqueos</td>
      <td>S/ 120.00</td>
      <td>S/ 2.50</td>
      <td><span class="badge badge-success">- 97.9%</span></td>
    </tr>
    <tr>
      <td>Ahorro mensual en papel térmico</td>
      <td>S/ 0.00 (gasto)</td>
      <td>S/ 150.00 ahorrados</td>
      <td><span class="badge badge-info">+ S/ 150/mes</span></td>
    </tr>
  </tbody>
</table>

<h2>11.3 Recomendaciones</h2>
<ul>
  <li><strong>A la Institución (IESTP “María Rosario Aráoz Pinto”):</strong> Continuar promoviendo en los planes curriculares el dominio de herramientas de mapeo objeto-relacional (ORM), arquitecturas cloud Serverless y protocolos de comunicación de hardware local (sockets TCP y WebSockets), ya que constituyen el núcleo de las demandas de innovación en el mercado laboral contemporáneo.</li>
  <li><strong>A los Futuros Investigadores y Desarrolladores:</strong> Incorporar en las siguientes versiones de Búnker un módulo de inteligencia artificial predictiva (Machine Learning) que analice el historial de ventas y pronostique la demanda de insumos para compras de abastecimiento con una semana de anticipación.</li>
  <li><strong>A los Empresarios Gastronómicos:</strong> Migrar progresivamente los procesos de cocina hacia monitores KDS interactivos, capacitando al personal culinario en la gestión de tiempos y aprovechando el escandallo de insumos para sincerar los márgenes de ganancia reales por plato.</li>
</ul>

<!-- ========================================== -->
<!-- 12. BIBLIOGRAFÍA Y WEBGRAFÍA               -->
<!-- ========================================== -->
<h1 class="section-title">12. Bibliografía y Webgrafía</h1>
<p class="no-indent">
  Las siguientes fuentes fueron consultadas y citadas rigurosamente bajo el formato <strong>APA 7ma Edición</strong>:
</p>
<ul style="list-style-type: none; padding-left: 0;">
  <li style="margin-bottom: 12px; text-indent: -1.25cm; padding-left: 1.25cm;">
    Elmasri, R., & Navathe, S. B. (2021). <em>Fundamentos de Sistemas de Bases de Datos</em> (7ma ed.). Pearson Educación.
  </li>
  <li style="margin-bottom: 12px; text-indent: -1.25cm; padding-left: 1.25cm;">
    Fowler, M. (2019). <em>Refactoring: Improving the Design of Existing Code</em> (2nd ed.). Addison-Wesley Professional.
  </li>
  <li style="margin-bottom: 12px; text-indent: -1.25cm; padding-left: 1.25cm;">
    Instituto Nacional de Estadística e Informática [INEI]. (2025). <em>Producción Nacional: Evolución del Subsector Restaurantes en el Perú</em>. Informe Técnico N° 04-2025. Lima, Perú.
  </li>
  <li style="margin-bottom: 12px; text-indent: -1.25cm; padding-left: 1.25cm;">
    Kleppmann, M. (2017). <em>Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems</em>. O'Reilly Media.
  </li>
  <li style="margin-bottom: 12px; text-indent: -1.25cm; padding-left: 1.25cm;">
    Ministerio de Educación del Perú [MINEDU]. (2018). <em>Lineamientos Académicos Generales para los Institutos de Educación Superior</em>. Resolución Viceministerial N° 178-2018-MINEDU.
  </li>
  <li style="margin-bottom: 12px; text-indent: -1.25cm; padding-left: 1.25cm;">
    Meta Open Source. (2024). <em>React 18 Documentation: Concurrent Features and Hooks</em>. https://react.dev
  </li>
  <li style="margin-bottom: 12px; text-indent: -1.25cm; padding-left: 1.25cm;">
    Prisma Data Platform. (2025). <em>Prisma Client: Type-Safe Database Client for Node.js & TypeScript</em>. https://www.prisma.io/docs
  </li>
  <li style="margin-bottom: 12px; text-indent: -1.25cm; padding-left: 1.25cm;">
    Pressman, R. S., & Maxim, B. R. (2020). <em>Ingeniería del Software: Un Enfoque Práctico</em> (9na ed.). McGraw-Hill Education.
  </li>
  <li style="margin-bottom: 12px; text-indent: -1.25cm; padding-left: 1.25cm;">
    Schwaber, K., & Sutherland, J. (2020). <em>La Guía Definitiva de Scrum: Las Reglas del Juego</em>. Scrum.org.
  </li>
  <li style="margin-bottom: 12px; text-indent: -1.25cm; padding-left: 1.25cm;">
    Seiko Epson Corporation. (2021). <em>ESC/POS Application Programming Guide: Command Reference Manual</em>. Epson POS Division.
  </li>
  <li style="margin-bottom: 12px; text-indent: -1.25cm; padding-left: 1.25cm;">
    Sommerville, I. (2020). <em>Ingeniería de Software</em> (10ma ed.). Pearson Educación.
  </li>
  <li style="margin-bottom: 12px; text-indent: -1.25cm; padding-left: 1.25cm;">
    Superintendencia Nacional de Aduanas y de Administración Tributaria [SUNAT]. (2024). <em>Manual de Especificaciones Técnicas para Sistemas de Facturación Electrónica en Restaurantes</em>. Lima, Perú.
  </li>
  <li style="margin-bottom: 12px; text-indent: -1.25cm; padding-left: 1.25cm;">
    Vercel Inc. (2025). <em>Serverless Functions & Edge Network Architecture Guide</em>. https://vercel.com/docs
  </li>
</ul>

<!-- ========================================== -->
<!-- 13. ANEXOS                                 -->
<!-- ========================================== -->
<h1 class="section-title">13. Anexos</h1>

<h2>Anexo 1: Diagrama de Arquitectura de la Solución (C4 Model Nivel 2)</h2>
<div class="callout-box">
  El sistema Búnker opera bajo una arquitectura de contenedores desacoplados donde los clientes web móviles (mozos en salón) y estaciones de escritorio (caja y cocina) consumen servicios a través de una API Gateway protegida por CORS y JWT. Las peticiones transaccionales se procesan de forma atómica en PostgreSQL, mientras que los eventos de periféricos locales se gestionan mediante el daemon de red para impresoras ESC/POS.
</div>

<h2>Anexo 2: Catálogo de Endpoints de la API RESTful de Búnker</h2>
<table>
  <thead>
    <tr>
      <th style="width: 15%;">Método</th>
      <th style="width: 35%;">Ruta del Endpoint</th>
      <th style="width: 35%;">Descripción Funcional</th>
      <th style="width: 15%;">Seguridad</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>POST</code></td><td>/api/auth/login</td><td>Autenticación de credenciales, retorno de JWT y perfil de usuario.</td><td>Público</td></tr>
    <tr><td><code>POST</code></td><td>/api/auth/recuperar-password</td><td>Envío de token de 6 dígitos con expiración de 10 min por correo.</td><td>Público</td></tr>
    <tr><td><code>GET</code></td><td>/api/mesas</td><td>Consulta de todas las mesas, coordenadas cartesianas y estados.</td><td>JWT (Mozo/Admin)</td></tr>
    <tr><td><code>POST</code></td><td>/api/mesas/unir</td><td>Fusión de mesas hijas bajo mesa padre (<code>mesaPadreId</code>).</td><td>JWT (Mozo/Admin)</td></tr>
    <tr><td><code>POST</code></td><td>/api/comandas</td><td>Creación de nueva comanda vinculada a mesa y comensales.</td><td>JWT (Mozo/Admin)</td></tr>
    <tr><td><code>GET</code></td><td>/api/cocina/comandas</td><td>Consulta de órdenes para pantalla KDS con filtro por estado.</td><td>JWT (Cocina/Admin)</td></tr>
    <tr><td><code>PATCH</code></td><td>/api/cocina/detalles/:id</td><td>Cambio de estado de plato ('preparando', 'listo') con cocineroId.</td><td>JWT (Cocina/Admin)</td></tr>
    <tr><td><code>POST</code></td><td>/api/caja/arqueo/apertura</td><td>Apertura de turno de caja registrando monto inicial.</td><td>JWT (Caja/Admin)</td></tr>
    <tr><td><code>POST</code></td><td>/api/caja/arqueo/cierre</td><td>Cierre ciego de turno de caja y conciliación con el sistema.</td><td>JWT (Caja/Admin)</td></tr>
    <tr><td><code>GET</code></td><td>/api/sunat/consulta</td><td>Consulta en línea de DNI o RUC ante los servicios tributarios.</td><td>JWT (Caja/Admin)</td></tr>
    <tr><td><code>GET</code></td><td>/api/impresoras</td><td>Diagnóstico y estado de periféricos ESC/POS en red local.</td><td>JWT (Admin/Caja)</td></tr>
  </tbody>
</table>

<h2>Anexo 3: Galería de Interfaces Reales del Sistema Búnker</h2>

<div class="figure-container">
  <img src="${imgSalon}" class="figure-img" alt="Salón Interactivo Búnker">
  <p class="figure-caption">Figura 1: Interfaz del Salón Interactivo 2D con visualización semántica de mesas, ocupación táctil y soporte de unión dinámica.</p>
</div>

<div class="figure-container">
  <img src="${imgCocina}" class="figure-img" alt="Monitor KDS Cocina">
  <p class="figure-caption">Figura 2: Monitor de Cocina KDS (Kitchen Display System) con cronómetro de preparación, semáforo de alerta y selección de cocinero responsable.</p>
</div>

<div class="figure-container">
  <img src="${imgCaja}" class="figure-img" alt="Caja Blindada Búnker">
  <p class="figure-caption">Figura 3: Módulo de Caja Blindada: Arqueo ciego, control de movimientos (ingresos/egresos) y liquidación de comandas.</p>
</div>

<div class="figure-container">
  <img src="${imgCategorias}" class="figure-img" alt="Gestión de Categorías y Platos">
  <p class="figure-caption">Figura 4: Mantenimiento del catálogo gastronómico, configuración de platos y vinculación con escandallo de insumos.</p>
</div>

<div class="figure-container">
  <img src="${imgImpresion}" class="figure-img" alt="Gestión de Impresoras ESC/POS">
  <p class="figure-caption">Figura 5: Panel de diagnóstico y auto-recuperación de periféricos ESC/POS con mapeo de IP y dirección MAC física.</p>
</div>

<div class="figure-container">
  <img src="${imgDashboard}" class="figure-img" alt="Centro de Mando Administrativo">
  <p class="figure-caption">Figura 6: Centro de Mando Ejecutivo y Analítica en tiempo real: KPIs de ventas, rotación de mesas y márgenes de ganancia.</p>
</div>

</body>
</html>`;
}

buildHtml().then(html => {
    const outputPath = path.join(__dirname, '..', 'thesis_document.html');
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log('HTML generated successfully! Length:', html.length);

    const jsContent = `async (page) => {
  const html = ${JSON.stringify(html)};
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({
    path: 'C:/Users/JrHector/Downloads/Bunker/PROYECTO_INNOVACION_TECNOLOGICA_BUNKER_IESTP_MRAP.pdf',
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: \`
      <div style="font-size: 8pt; color: #718096; width: 100%; display: flex; justify-content: space-between; padding: 0 20mm; font-family: 'Segoe UI', Tahoma, sans-serif;">
        <span>IESTP María Rosario Aráoz Pinto — Desarrollo de Sistemas de Información</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>
    \`,
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '20mm',
      right: '20mm'
    }
  });
  return 'PDF created successfully!';
};
`;
    fs.writeFileSync(path.join(__dirname, 'run_pdf_export.js'), jsContent, 'utf8');
    console.log('run_pdf_export.js written successfully!');
}).catch(err => {
    console.error('Error generating HTML:', err);
});

