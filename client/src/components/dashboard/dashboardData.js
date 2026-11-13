import sushiPlatterImg from '../../assets/images/sushi_platter_dish_1794591157776.jpg';
import beefBurgerImg from '../../assets/images/beef_burger_dish_1794591157865.jpg';
import artisanPizzaImg from '../../assets/images/artisan_pizza_dish_1794591158814.jpg';

export const KITCHEN_CAPACITY_TARGET = 50;

export const RATINGS_SUMMARY = {
  score: '4,80',
  filledStars: 4,
  totalStars: 5,
  totalReviews: 412,
  positivePercent: 97,
  negativePercent: 3,
};

export const CUSTOMER_REVIEWS = [
  {
    id: 'REV-104',
    customer: 'Camila Mendoza',
    rating: 5,
    sentiment: 'positive',
    dish: 'Tabla de Sushi',
    channel: 'Salón',
    date: 'Hoy, 10:15 AM',
    comment: 'Excelente frescura en el salmón y presentación impecable. El servicio en mesa fue súper ágil.',
  },
  {
    id: 'REV-103',
    customer: 'Rodrigo Paredes',
    rating: 5,
    sentiment: 'positive',
    dish: 'Hamburguesa de Res',
    channel: 'Delivery',
    date: 'Hoy, 09:42 AM',
    comment: 'Llegó caliente, el pan brioche crocante y el punto de la carne exactamente como lo pedí.',
  },
  {
    id: 'REV-102',
    customer: 'Valeria Quispe',
    rating: 5,
    sentiment: 'positive',
    dish: 'Pizza Artesanal',
    channel: 'Salón',
    date: 'Ayer, 08:50 PM',
    comment: 'Masa delgada con bordes aireados muy ricos. Una delicia total.',
  },
  {
    id: 'REV-101',
    customer: 'Martín Salvatierra',
    rating: 5,
    sentiment: 'positive',
    dish: 'Salmón a la Parrilla',
    channel: 'Salón',
    date: 'Ayer, 07:30 PM',
    comment: 'Sazón equilibrada y guarniciones al punto. La mejor atención de la zona.',
  },
  {
    id: 'REV-100',
    customer: 'Luciana Torres',
    rating: 4,
    sentiment: 'positive',
    dish: 'Sopa Criolla',
    channel: 'Salón',
    date: 'Ayer, 01:15 PM',
    comment: 'Riquísimo el caldo y el sabor casero, muy recomendado para almorzar.',
  },
  {
    id: 'REV-99',
    customer: 'Renato Balbuena',
    rating: 5,
    sentiment: 'positive',
    dish: 'Lomo Saltado',
    channel: 'Salón',
    date: 'Ayer, 12:40 PM',
    comment: 'Carne en su punto y papas crujientes. 10 de 10 el sazón.',
  },
];

export const WEEKLY_SALES_DATA = [
  {
    day: 'Dom',
    fullDay: 'Domingo',
    percentage: 27,
    revenuePen: 38420,
    revenueUsd: 10245,
    orders: 214,
  },
  {
    day: 'Lun',
    fullDay: 'Lunes',
    percentage: 34,
    revenuePen: 46150,
    revenueUsd: 12306,
    orders: 256,
  },
  {
    day: 'Mar',
    fullDay: 'Martes',
    percentage: 27,
    revenuePen: 39810,
    revenueUsd: 10616,
    orders: 221,
  },
  {
    day: 'Mié',
    fullDay: 'Miércoles',
    percentage: 39,
    revenuePen: 54900,
    revenueUsd: 14640,
    orders: 289,
  },
  {
    day: 'Jue',
    fullDay: 'Jueves',
    percentage: 50,
    revenuePen: 72480,
    revenueUsd: 19328,
    orders: 328,
  },
  {
    day: 'Vie',
    fullDay: 'Viernes',
    percentage: 40,
    revenuePen: 68120,
    revenueUsd: 18165,
    orders: 312,
  },
  {
    day: 'Sáb',
    fullDay: 'Sábado',
    percentage: 37,
    revenuePen: 65629,
    revenueUsd: 17501,
    orders: 304,
  },
];

export const DEFAULT_POPULAR_MENU = {
  Hoy: [
    {
      id: 'sushi-platter',
      name: 'Tabla de Sushi',
      category: 'Barra Fría',
      imageUrl: sushiPlatterImg,
      rating: '4,9',
      orders: 130,
      revenueUsd: 2432,
      revenuePen: 2432,
    },
    {
      id: 'beef-burger',
      name: 'Hamburguesa de Res',
      category: 'Parrilla',
      imageUrl: beefBurgerImg,
      rating: '4,8',
      orders: 104,
      revenueUsd: 1745,
      revenuePen: 1745,
    },
    {
      id: 'artisan-pizza',
      name: 'Pizza Artesanal',
      category: 'Horno de Piedra',
      imageUrl: artisanPizzaImg,
      rating: '4,7',
      orders: 89,
      revenueUsd: 1280,
      revenuePen: 1280,
    },
  ],
  'Esta Semana': [
    {
      id: 'sushi-platter',
      name: 'Tabla de Sushi',
      category: 'Barra Fría',
      imageUrl: sushiPlatterImg,
      rating: '4,9',
      orders: 742,
      revenueUsd: 8924,
      revenuePen: 8924,
    },
    {
      id: 'beef-burger',
      name: 'Hamburguesa de Res',
      category: 'Parrilla',
      imageUrl: beefBurgerImg,
      rating: '4,8',
      orders: 618,
      revenueUsd: 6412,
      revenuePen: 6412,
    },
    {
      id: 'artisan-pizza',
      name: 'Pizza Artesanal',
      category: 'Horno de Piedra',
      imageUrl: artisanPizzaImg,
      rating: '4,8',
      orders: 534,
      revenueUsd: 4981,
      revenuePen: 4981,
    },
  ],
  'Este Mes': [
    {
      id: 'sushi-platter',
      name: 'Tabla de Sushi',
      category: 'Barra Fría',
      imageUrl: sushiPlatterImg,
      rating: '4,9',
      orders: 2890,
      revenueUsd: 34208,
      revenuePen: 34208,
    },
    {
      id: 'beef-burger',
      name: 'Hamburguesa de Res',
      category: 'Parrilla',
      imageUrl: beefBurgerImg,
      rating: '4,8',
      orders: 2415,
      revenueUsd: 26843,
      revenuePen: 26843,
    },
    {
      id: 'artisan-pizza',
      name: 'Pizza Artesanal',
      category: 'Horno de Piedra',
      imageUrl: artisanPizzaImg,
      rating: '4,7',
      orders: 2040,
      revenueUsd: 19854,
      revenuePen: 19854,
    },
  ],
};

export function formatCurrencyAmount(amount, currency = 'PEN') {
  if (typeof amount !== 'number') amount = Number(amount) || 0;
  const formatted = amount.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return currency === 'PEN' ? `S/ ${formatted}` : `$ ${formatted}`;
}
