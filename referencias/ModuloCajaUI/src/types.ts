export interface IngresoDetalle {
  efectivo: number;
  digital: number;
  yape?: number;
  plin?: number;
  tarjeta: number;
  manual: number;
}

export interface Arqueo {
  id: number;
  fechaInicio: string;
  fechaCierre: string;
  estado: 'ABIERTO' | 'CERRADO';
  inicio: number;
  egreso: number;
  ingresoDetalle: IngresoDetalle;
  propinas: number;
  totalCaja: number;
  totalBruto: number;
  pendiente: number;
}

export interface ProductoCuenta {
  cantidad: number;
  nombre: string;
  precio: number;
}

export interface CuentaAbierta {
  id: string;
  mesa: string;
  monto: number;
  productos: ProductoCuenta[];
}

export interface MovimientoCaja {
  id: string;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  metodoPago: 'efectivo' | 'yape' | 'plin' | 'tarjeta' | 'digital' | 'manual';
  descripcion: string;
  fecha: string;
  arqueoId: number;
  comprobante?: 'boleta' | 'factura' | 'recibo';
}
