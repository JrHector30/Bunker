cok = 0.12
I0 = 25651.50

fnc1 = 13734.30
fnc2 = 33728.00
fnc3 = 67592.00

# VAN
va1 = fnc1 / (1 + cok)**1
va2 = fnc2 / (1 + cok)**2
va3 = fnc3 / (1 + cok)**3
van = -I0 + va1 + va2 + va3

print(f"VA1: {va1:.2f}")
print(f"VA2: {va2:.2f}")
print(f"VA3: {va3:.2f}")
print(f"Suma VA flujos: {va1+va2+va3:.2f}")
print(f"VAN: {van:.2f}")

# TIR
def calc_van(r):
    return -I0 + fnc1/(1+r) + fnc2/(1+r)**2 + fnc3/(1+r)**3

low, high = 0.0, 2.0
for _ in range(100):
    mid = (low + high) / 2
    if calc_van(mid) > 0:
        low = mid
    else:
        high = mid
tir = low * 100
print(f"TIR: {tir:.1f}%")

# PRI
saldo_ano1 = I0 - fnc1
flujo_mes_ano2 = fnc2 / 12
meses_adicionales = saldo_ano1 / flujo_mes_ano2
print(f"Saldo restante tras Año 1: {saldo_ano1:.2f}")
print(f"Flujo mensual Año 2: {flujo_mes_ano2:.2f}")
print(f"Meses adicionales Año 2: {meses_adicionales:.1f}")
total_meses = 12 + meses_adicionales
print(f"PRI: 1 Año y {meses_adicionales:.1f} Meses (Aproximadamente {total_meses:.1f} Meses)")

# B/C
ing1, ing2, ing3 = 33570.00, 71580.00, 129720.00
va_ing = ing1/(1+cok)**1 + ing2/(1+cok)**2 + ing3/(1+cok)**3

egr1, egr2, egr3 = 19835.70, 37852.00, 62128.00
va_egr = I0 + egr1/(1+cok)**1 + egr2/(1+cok)**2 + egr3/(1+cok)**3
bc = va_ing / va_egr

print(f"VA Ingresos: {va_ing:.2f}")
print(f"VA Costos Totales: {va_egr:.2f}")
print(f"B/C: {bc:.2f}")
