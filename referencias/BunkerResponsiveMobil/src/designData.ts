import { Plate, KitchenTicket, RestaurantTable } from './types';

export const mockPlates: Plate[] = [
  { id: '1', name: 'Agua Mineral 600ml', category: 'Bebidas', price: 4.50, stock: 120, status: 'active', emoji: '🍹' },
  { id: '2', name: 'Arroz con Mariscos', category: 'Marino', price: 32.00, stock: 45, status: 'active', emoji: '🐟' },
  { id: '3', name: 'Arroz con Pato', category: 'Plato Principal', price: 28.50, stock: 30, status: 'active', emoji: '🍽️' },
  { id: '4', name: 'Brownie con Helado', category: 'Postres', price: 14.00, stock: 15, status: 'active', emoji: '🧁' },
  { id: '5', name: 'Ceviche Carretillero', category: 'Marino', price: 36.00, stock: 22, status: 'active', emoji: '🍋' },
  { id: '6', name: 'Lomo Saltado Criollo', category: 'Plato Principal', price: 34.00, stock: 50, status: 'active', emoji: '🔥' },
  { id: '7', name: 'Chicha Morada de la Casa (1L)', category: 'Bebidas', price: 15.00, stock: 80, status: 'active', emoji: '🥤' },
  { id: '8', name: 'Leche de Tigre Especial', category: 'Marino', price: 18.00, stock: 35, status: 'active', emoji: '🐟' },
  { id: '9', name: 'Pisco Sour Búnker', category: 'Bebidas', price: 22.00, stock: 60, status: 'active', emoji: '🍸' },
  { id: '10', name: 'Tarta de Tres Leches', category: 'Postres', price: 12.00, stock: 10, status: 'inactive', emoji: '🍰' },
];

export const mockKitchenTickets: KitchenTicket[] = [
  { id: 'K-201', table: 'Mesa 4', items: ['1x Arroz con Mariscos', '1x Ceviche Carretillero'], time: '23:44', status: 'preparing', elapsedMinutes: 11 },
  { id: 'K-202', table: 'Mesa 12', items: ['2x Lomo Saltado Criollo', '1x Agua Mineral 600ml'], time: '23:49', status: 'pending', elapsedMinutes: 6 },
  { id: 'K-203', table: 'Mesa 8 (Terraza)', items: ['1x Arroz con Pato', '1x Chicha Morada (1L)'], time: '23:38', status: 'ready', elapsedMinutes: 17 },
  { id: 'K-204', table: 'Mesa VIP 1', items: ['2x Ceviche Carretillero', '2x Pisco Sour Búnker'], time: '23:51', status: 'pending', elapsedMinutes: 4 },
];

export const mockTables: RestaurantTable[] = [
  { id: 'T1', number: 1, zone: 'Salón Principal', status: 'occupied', currentTotal: 78.50, people: 2 },
  { id: 'T2', number: 2, zone: 'Salón Principal', status: 'available', people: 0 },
  { id: 'T3', number: 3, zone: 'Salón Principal', status: 'billing', currentTotal: 124.00, people: 4 },
  { id: 'T4', number: 4, zone: 'Salón Principal', status: 'occupied', currentTotal: 68.00, people: 2 },
  { id: 'T5', number: 5, zone: 'Salón Principal', status: 'available', people: 0 },
  { id: 'T6', number: 6, zone: 'Terraza', status: 'occupied', currentTotal: 45.00, people: 1 },
  { id: 'T7', number: 7, zone: 'Terraza', status: 'reserved', people: 4 },
  { id: 'T8', number: 8, zone: 'Terraza', status: 'occupied', currentTotal: 110.50, people: 3 },
  { id: 'T9', number: 9, zone: 'VIP', status: 'available', people: 0 },
  { id: 'T10', number: 10, zone: 'VIP', status: 'occupied', currentTotal: 340.00, people: 6 },
];

export interface ProposalSpec {
  id: 'A' | 'B' | 'C';
  title: string;
  tagline: string;
  description: string;
  pros: string[];
  cons: string[];
  thumbReach: number; // 1-100
  speedScore: number; // 1-100
  spaceEfficiency: number; // 1-100
  cognitiveLoad: number; // 1-100 (lower is better, let's store as score 1-100 where higher is better UX)
  bestFor: string;
}

export const proposalsSpec: ProposalSpec[] = [
  {
    id: 'A',
    title: 'Sidebar Colapsable & Gestos (Drawer Táctil)',
    tagline: 'Evolución directa optimizada para pantallas táctiles',
    description: 'Mantiene la estructura clásica del menú lateral pero lo transforma en un drawer ultra-sensible a gestos. Se contrae automáticamente a iconos compactos o se expande mediante un swipe lateral. Las secciones complejas como "Logística" se manejan mediante micro-acordeones colapsables para evitar el scroll vertical infinito.',
    pros: [
      'Mantiene la familiaridad absoluta del personal con el sistema actual.',
      'Ocupa 0% de espacio útil cuando está cerrado, dejando toda la pantalla para las comandas o cajas.',
      'Excelente consistencia visual entre la versión de escritorio y la versión de tablet.',
      'Fácil acceso a los roles de usuario y perfil en el pie del sidebar.'
    ],
    cons: [
      'Requiere dos interacciones para acceder a módulos secundarios (abrir sidebar + tap).',
      'El área de alcance con el pulgar es desfavorable en teléfonos de pantalla grande cuando se opera con una sola mano.',
      'Sigue requiriendo cierto esfuerzo cognitivo al desplegar categorías y logística simultáneamente.'
    ],
    thumbReach: 68,
    speedScore: 82,
    spaceEfficiency: 95,
    cognitiveLoad: 75,
    bestFor: 'Tablets de comandas, pantallas de cocina fijas y usuarios acostumbrados al layout tradicional de escritorio.'
  },
  {
    id: 'B',
    title: 'Navegación Inferior Tipo Dock (Recomendado ⭐)',
    tagline: 'Optimización móvil nativa con foco ergonómico',
    description: 'Elimina por completo el menú lateral en dispositivos móviles. Sitúa una barra fija de navegación en la base de la pantalla (zona de máximo alcance del pulgar) con los 4 módulos críticos del restaurante. Integra el botón inteligente "Más" que abre un Bottom Sheet flotante con las herramientas táctiles secundarias.',
    pros: [
      'Ergonomía perfecta: 100% de operaciones clave realizables con el pulgar sin estirar la mano.',
      'El Bottom Sheet respeta las áreas seguras (safe areas) de iOS y Android.',
      'Acceso instantáneo de un solo tap a Inicio, Mesas, Cocina y Caja (90% del trabajo diario).',
      'Logística se organiza de manera limpia en un sub-módulo táctil interactivo dentro del panel "Más".',
      'No interfiere con listas de productos ni botones flotantes de acción gracias a un padding inferior dinámico.'
    ],
    cons: [
      'Consume una pequeña franja vertical fija (64px) en la parte inferior de la pantalla.',
      'Requiere reubicar visualmente el perfil de usuario y la acción de cerrar sesión en el contenedor "Más".'
    ],
    thumbReach: 98,
    speedScore: 94,
    spaceEfficiency: 88,
    cognitiveLoad: 90,
    bestFor: 'Meseros en movimiento con smartphones, cajeros y administradores operando el sistema con una sola mano.'
  },
  {
    id: 'C',
    title: 'Bento App Launcher (Menú Modular de Rejilla)',
    tagline: 'Acceso radial e inmersivo para alta velocidad',
    description: 'Sustituye la navegación persistente por un botón flotante inteligente o una cabecera minimalista. Al presionarlo, despliega un Launchpad de pantalla completa con tarjetas modulares tipo Bento. Clasifica visualmente los módulos mediante tamaños, colores y accesos directos numéricos para el personal.',
    pros: [
      'Velocidad de cambio brutal: Todo el menú es visible y seleccionable con un patrón visual idéntico.',
      'Ideal para cambiar de contexto rápidamente en momentos de alta ocupación.',
      'Visualmente el más moderno e innovador, con soporte para gestos e indicadores rápidos en cada tarjeta.',
      'Altamente configurable para destacar módulos según el rol (ej. mesero ve más grande "Mesas", cajero ve "Caja").'
    ],
    cons: [
      'Oculta temporalmente toda la pantalla de trabajo activa cuando se abre.',
      'Puede resultar abrumador para el personal menos tecnológico al principio.',
      'Rompe un poco con la linealidad tradicional de navegación.'
    ],
    thumbReach: 80,
    speedScore: 88,
    spaceEfficiency: 92,
    cognitiveLoad: 80,
    bestFor: 'Administradores multi-local, personal de delivery de alta velocidad y tablets de formato mediano.'
  }
];
