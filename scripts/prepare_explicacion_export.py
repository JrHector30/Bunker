import os
import json

html_path = r'c:\Users\JrHector\Downloads\Bunker\EXPLICACION9Y11.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html_content = f.read()

js_code = f"""async (page) => {{
  const html = {json.dumps(html_content)};
  await page.setContent(html, {{ waitUntil: 'load' }});
  await page.pdf({{
    path: 'C:/Users/JrHector/Downloads/Bunker/EXPLICACION9Y11.pdf',
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `<div style="font-size: 8pt; color: #718096; width: 100%; display: flex; justify-content: space-between; padding: 0 20mm; font-family: 'Segoe UI', Tahoma, sans-serif;"><span>IESTP María Rosario Aráoz Pinto — Desarrollo de Sistemas de Información</span><span>Guía de Sustentación Financiera | Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`,
    margin: {{
      top: '20mm',
      bottom: '20mm',
      left: '20mm',
      right: '20mm'
    }}
  }});
  return 'EXPLICACION9Y11.pdf generated successfully!';
}}"""

out_js = r'c:\Users\JrHector\Downloads\Bunker\scripts\run_explicacion_export.js'
with open(out_js, 'w', encoding='utf-8') as f:
    f.write(js_code)

print("Generated run_explicacion_export.js successfully!")
