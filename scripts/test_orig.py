va1 = 16794.30 / 1.12
va2 = 40868.00 / 1.12**2
va3 = 80852.00 / 1.12**3
print("Original VA flujos:", va1, va2, va3)
print("Sum VA flujos:", va1 + va2 + va3)
print("VAN:", -25651.50 + va1 + va2 + va3)

# Why was TIR 51.4% in the original?
# Let's check TIR of [-25651.50, 16794.30, 40868.00, 80852.00]
def calc_van_orig(r):
    return -25651.50 + 16794.30/(1+r) + 40868.00/(1+r)**2 + 80852.00/(1+r)**3

print("VAN at 0.514:", calc_van_orig(0.514))
for r in [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2]:
    print(f"VAN at {r}: {calc_van_orig(r):.2f}")
