import os
import re

html_path = r'c:\Users\JrHector\Downloads\Bunker\thesis_document.html'
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Ticket promedio text
content = content.replace('de S/ 169.00 (Plan Pro)', 'de S/ 149.00 (Plan Pro)')

# 2. Table 7 replacements
old_table7_rows = """    <tr>
      <td><strong>Ingresos por Suscripcin SaaS</strong></td>
      <td>?"</td>
      <td>S/ 30,420.00</td>
      <td>S/ 70,980.00</td>
      <td>S/ 131,820.00</td>
    </tr>
    <tr>
      <td><strong>Ingresos por Instalacin y Hardware</strong></td>
      <td>?"</td>
      <td>S/ 6,750.00</td>
      <td>S/ 9,000.00</td>
      <td>S/ 13,500.00</td>
    </tr>
    <tr style="background: #f0fdf4; font-weight: 600;">
      <td><strong>Total Ingresos Brutos</strong></td>
      <td>?"</td>
      <td>S/ 37,170.00</td>
      <td>S/ 79,980.00</td>
      <td>S/ 145,320.00</td>
    </tr>
    <tr>
      <td>Costos Operativos Cloud (OPEX)</td>
      <td>?"</td>
      <td>S/ 6,612.00</td>
      <td>S/ 9,500.00</td>
      <td>S/ 14,200.00</td>
    </tr>
    <tr>
      <td>Gastos Comerciales y de Marketing</td>
      <td>?"</td>
      <td>S/ 4,800.00</td>
      <td>S/ 8,400.00</td>
      <td>S/ 12,000.00</td>
    </tr>
    <tr>
      <td>Soporte y Atencin al Cliente</td>
      <td>?"</td>
      <td>S/ 6,000.00</td>
      <td>S/ 14,000.00</td>
      <td>S/ 24,000.00</td>
    </tr>
    <tr>
      <td>Impuestos y Gastos Administrativos (15%)</td>
      <td>?"</td>
      <td>S/ 2,963.70</td>
      <td>S/ 7,212.00</td>
      <td>S/ 14,268.00</td>
    </tr>
    <tr style="background: #fff5f5; font-weight: 600;">
      <td><strong>Total Egresos Operativos</strong></td>
      <td>?"</td>
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
    </tr>"""

new_table7_rows = """    <tr>
      <td><strong>Ingresos por Suscripcin SaaS</strong></td>
      <td>?"</td>
      <td>S/ 26,820.00</td>
      <td>S/ 62,580.00</td>
      <td>S/ 116,220.00</td>
    </tr>
    <tr>
      <td><strong>Ingresos por Instalacin y Hardware</strong></td>
      <td>?"</td>
      <td>S/ 6,750.00</td>
      <td>S/ 9,000.00</td>
      <td>S/ 13,500.00</td>
    </tr>
    <tr style="background: #f0fdf4; font-weight: 600;">
      <td><strong>Total Ingresos Brutos</strong></td>
      <td>?"</td>
      <td>S/ 33,570.00</td>
      <td>S/ 71,580.00</td>
      <td>S/ 129,720.00</td>
    </tr>
    <tr>
      <td>Costos Operativos Cloud (OPEX)</td>
      <td>?"</td>
      <td>S/ 6,612.00</td>
      <td>S/ 9,500.00</td>
      <td>S/ 14,200.00</td>
    </tr>
    <tr>
      <td>Gastos Comerciales y de Marketing</td>
      <td>?"</td>
      <td>S/ 4,800.00</td>
      <td>S/ 8,400.00</td>
      <td>S/ 12,000.00</td>
    </tr>
    <tr>
      <td>Soporte y Atencin al Cliente</td>
      <td>?"</td>
      <td>S/ 6,000.00</td>
      <td>S/ 14,000.00</td>
      <td>S/ 24,000.00</td>
    </tr>
    <tr>
      <td>Impuestos y Gastos Administrativos (15%)</td>
      <td>?"</td>
      <td>S/ 2,423.70</td>
      <td>S/ 5,952.00</td>
      <td>S/ 11,928.00</td>
    </tr>
    <tr style="background: #fff5f5; font-weight: 600;">
      <td><strong>Total Egresos Operativos</strong></td>
      <td>?"</td>
      <td>S/ 19,835.70</td>
      <td>S/ 37,852.00</td>
      <td>S/ 62,128.00</td>
    </tr>
    <tr style="background: #edf2f7; font-weight: bold; font-size: 10.5pt; color: #0b2545;">
      <td>FLUJO NETO DE CAJA (FNC)</td>
      <td style="color: #c53030;">- S/ 25,651.50</td>
      <td style="color: #276749;">+ S/ 13,734.30</td>
      <td style="color: #276749;">+ S/ 33,728.00</td>
      <td style="color: #276749;">+ S/ 67,592.00</td>
    </tr>"""

content = content.replace(old_table7_rows, new_table7_rows)

# 3. Formulas
old_van = """  VAN = -25,651.50 + [ 16,794.30 / (1 + 0.12) ] + [ 40,868.00 / (1 + 0.12) ] + [ 80,852.00 / (1 + 0.12) ]<br>
  VAN = -25,651.50 + 14,994.91 + 32,580.08 + 57,547.96<br>
  <strong>VAN = + S/ 48,350.20</strong>"""

new_van = """  VAN = -25,651.50 + [ 13,734.30 / (1 + 0.12) ] + [ 33,728.00 / (1 + 0.12) ] + [ 67,592.00 / (1 + 0.12) ]<br>
  VAN = -25,651.50 + 12,262.77 + 26,887.76 + 48,110.65<br>
  <strong>VAN = + S/ 61,609.68</strong>"""
content = content.replace(old_van, new_van)

content = content.replace('+ S/ 48,350.20', '+ S/ 61,609.68')
content = content.replace('ms de 48 mil soles', 'ms de 61 mil soles')

old_tir = """  0 = -25,651.50 + [ 16,794.30 / (1 + TIR) ] + [ 40,868.00 / (1 + TIR) ] + [ 80,852.00 / (1 + TIR) ]<br>
  Resolviendo por iteracin numǸrica (polinomio de grado 3):<br>
  <strong>TIR = 51.4%</strong>"""

new_tir = """  0 = -25,651.50 + [ 13,734.30 / (1 + TIR) ] + [ 33,728.00 / (1 + TIR) ] + [ 67,592.00 / (1 + TIR) ]<br>
  Resolviendo por iteracin numǸrica (polinomio de grado 3):<br>
  <strong>TIR = 92.7%</strong>"""
content = content.replace(old_tir, new_tir)

content = content.replace('TIR (51.4%)', 'TIR (92.7%)')

old_pri = """  Flujo acumulado al Ao 1: S/ 16,794.30 (Saldo restante de inversin: S/ 8,857.20)<br>
  Flujo mensual promedio Ao 2: S/ 40,868.00 / 12 = S/ 3,405.67 / mes<br>
  Meses adicionales requeridos: S/ 8,857.20 / S/ 3,405.67 = 2.6 meses<br>
  <strong>PRI = 1 Ao y 2.6 Meses (Aproximadamente 14 Meses y medio)</strong>"""

new_pri = """  Flujo acumulado al Ao 1: S/ 13,734.30 (Saldo restante de inversin: S/ 11,917.20)<br>
  Flujo mensual promedio Ao 2: S/ 33,728.00 / 12 = S/ 2,810.67 / mes<br>
  Meses adicionales requeridos: S/ 11,917.20 / S/ 2,810.67 = 4.2 meses<br>
  <strong>PRI = 1 Ao y 4.2 Meses (Aproximadamente 16 Meses)</strong>"""
content = content.replace(old_pri, new_pri)

old_bc = """  Valor Actual de los Ingresos / Valor Actual de los Costos Totales = S/ 105,122.95 / S/ 57,800.50<br>
  <strong>B/C = 1.82</strong>"""

new_bc = """  Valor Actual de los Ingresos / Valor Actual de los Costos Totales = S/ 179,368.49 / S/ 117,758.81<br>
  <strong>B/C = 1.52</strong>"""
content = content.replace(old_bc, new_bc)

content = content.replace('generan <strong>S/ 1.82</strong>', 'generan <strong>S/ 1.52</strong>')

# 4. Plan Pro in table 8
content = content.replace('<td>S/ 169.00 / mes</td>', '<td>S/ 149.00 / mes</td>')

# 5. Conclusion 6
old_conc6 = 'con un <strong>VAN de S/ 48,350.20</strong>, una <strong>TIR del 51.4%</strong> y un perodo de recuperacin de <strong>14 meses</strong>'
new_conc6 = 'con un <strong>VAN de S/ 61,609.68</strong>, una <strong>TIR del 92.7%</strong> y un perodo de recuperacin de <strong>16 meses (1 ao y 4.2 meses)</strong>'
content = content.replace(old_conc6, new_conc6)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("thesis_document.html updated successfully!")
