import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Menu, X, LayoutDashboard, Shield, Zap, Sparkles,
  ChevronDown, ChevronUp, Check, Star, HelpCircle, Utensils,
  TrendingUp, Users, Printer, Store
} from 'lucide-react';
import RevealOnScroll from '../components/RevealOnScroll';
import CircularCarousel from '../components/CircularCarousel';
import Aurora from '../components/Aurora';
import imgDashboard from '../../public/uploads/home/dashboard_centro_mando.png';
import imgSalon from '../../public/uploads/home/salon_mesas.png';
import imgCocina from '../../public/uploads/home/cocina_kds.png';
import imgCaja from '../../public/uploads/home/caja_arqueo.png';
import imgCategorias from '../../public/uploads/home/gestion_categorias.png';
import imgReportes from '../../public/uploads/home/reportes_rendimiento.png';
import imgSoporte from '../../public/uploads/home/soporte_asistencia.png';
import imgImpresion from '../../public/uploads/home/impresion_dispositivos.png';

const carouselItems = [
  {
    src: imgDashboard,
    alt: 'Centro de Mando de Búnker',
    title: 'Centro de Mando',
    subtitle: 'Métricas en Vivo y Control de Salón'
  },
  {
    src: imgSalon,
    alt: 'Salón Interactivo y Control de Mesas',
    title: 'Salón Interactivo',
    subtitle: 'Distribución y Estados en Tiempo Real'
  },
  {
    src: imgCocina,
    alt: 'Monitor KDS de Cocina en Tiempo Real',
    title: 'Monitor de Cocina',
    subtitle: 'Despacho y Tiempos KDS'
  },
  {
    src: imgCaja,
    alt: 'Caja Blindada y Arqueo de Turnos',
    title: 'Caja Blindada',
    subtitle: 'Arqueo de Turnos y Cierre de Cuentas'
  },
  {
    src: imgCategorias,
    alt: 'Gestión de Menú y Categorías',
    title: 'Gestión de Categorías',
    subtitle: 'Configuración de Carta y Cocina'
  },
  {
    src: imgReportes,
    alt: 'Rendimiento y Reportes Financieros',
    title: 'Rendimiento y Reportes',
    subtitle: 'Analítica Financiera y Tiempos'
  },
  {
    src: imgSoporte,
    alt: 'Atención y Soporte AI',
    title: 'Atención y Soporte AI',
    subtitle: 'Tickets de Incidencia y Diagnóstico por Voz'
  },
  {
    src: imgImpresion,
    alt: 'Administrador de Dispositivos de Impresión',
    title: 'Impresión Térmica Cloud',
    subtitle: 'Control de Impresoras USB y Red Ethernet'
  }
];

// Componente reusable de Botón Premium
const SaasButton = ({ variant = "default", className = "", children, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-200 focus:outline-none active:scale-95 text-sm h-11 px-5 cursor-pointer";
  const variants = {
    default: "bg-white text-black hover:bg-gray-100",
    ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-gray-900/40 border border-transparent",
    gradient: "bg-gradient-to-r from-teal-400 to-teal-600 text-white hover:shadow-[0_0_25px_rgba(20,184,166,0.4)] font-semibold border border-teal-400/20 active:scale-95 transition-all"
  };
  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default function LandingView() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [showCookies, setShowCookies] = useState(() => {
    try {
      return !localStorage.getItem('bunker_cookies_accepted');
    } catch {
      return false;
    }
  });
  const [legalModal, setLegalModal] = useState(null); // 'terms' | 'privacy' | null
  const [expandedIndex, setExpandedIndex] = useState(null);
  const navigate = useNavigate();

  const acceptCookies = () => {
    try {
      localStorage.setItem('bunker_cookies_accepted', 'true');
    } catch (e) {
      console.error(e);
    }
    setShowCookies(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (expandedIndex === null) return;
      if (e.key === 'Escape') setExpandedIndex(null);
      else if (e.key === 'ArrowRight') setExpandedIndex((prev) => (prev + 1) % carouselItems.length);
      else if (e.key === 'ArrowLeft') setExpandedIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedIndex]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('mode-light');
    root.classList.add('mode-dark');
  }, []);

  const stats = [
    { value: "+150k", label: "Órdenes Procesadas" },
    { value: "99.9%", label: "Uptime del Búnker" },
    { value: "-40%", label: "Tiempo de Espera" },
    { value: "100%", label: "Conexión Sunat" }
  ];

  const features = [
    { icon: <LayoutDashboard />, title: "Salón Interactivo", desc: "Plano arquitectónico interactivo con estados cromáticos neón en tiempo real (Verde, Amarillo, Gris)." },
    { icon: <Shield />, title: "Caja Blindada", desc: "Intercepción operativa temprana que bloquea comandas automáticas si el turno de caja no está abierto." },
    { icon: <Zap />, title: "Consulta RUC/DNI", desc: "Extracción instantánea de datos del padrón de Sunat a través de tokens elásticos serverless." },
    { icon: <Printer />, title: "Comprobantes Pro", desc: "Pre-cuentas consolidadas y tickets de formato Courier listos para impresión física o PDF." },
    { icon: <Utensils />, title: "Bandeja de Cocina", desc: "Monitoreo sutil del estado de los platos (Pendiente, Preparando, Listo) con alertas visuales." },
    { icon: <TrendingUp />, title: "Métricas Avanzadas", desc: "Análisis financiero del ciclo comercial diario sin saturación ni retrasos en memoria." }
  ];

  const steps = [
    { num: "01", title: "Apertura de Caja", desc: "Inicia el turno registrando el saldo inicial en el búnker financiero para desbloquear las operaciones." },
    { num: "02", title: "Comanda Líquida", desc: "Asigna comensales en el mapa interactivo y despacha platos directo a cocina con un clic." },
    { num: "03", title: "Factura Directa", desc: "Valida el RUC de la empresa, genera el comprobante fiscal simulado e imprime el ticket formal." }
  ];

  const pricing = {
    monthly: [
      { name: "Emprendedor", price: "S/. 89", desc: "Perfecto para cafeterías o restobares pequeños en crecimiento.", features: ["Hasta 5 mesas activas", "Efectivo y Yape/Plin", "Soporte básico", "Tickets Simples"], popular: false },
      { name: "Restaurante Pro", price: "S/. 149", desc: "El motor ideal para operaciones gastronómicas exigentes.", features: ["Mesas ilimitadas", "Mapa Interactivo con Sillas", "Consulta RUC Sunat", "Control de Caja Blindado", "Bandeja de Cocina Pro"], popular: true },
      { name: "Corporativo", price: "S/. 299", desc: "Control total para franquicias y cadenas multi-ambiente.", features: ["Múltiples Salones", "Soporte 24/7 Dedicado", "API Access Ilimitado", "Analítica Avanzada AI", "Logística de Insumos"], popular: false }
    ],
    yearly: [
      { name: "Emprendedor", price: "S/. 69", desc: "Perfecto para cafeterías o restobares pequeños en crecimiento.", features: ["Hasta 5 mesas activas", "Efectivo y Yape/Plin", "Soporte básico", "Tickets Simples"], popular: false },
      { name: "Restaurante Pro", price: "S/. 119", desc: "El motor ideal para operaciones gastronómicas exigentes.", features: ["Mesas ilimitadas", "Mapa Interactivo con Sillas", "Consulta RUC Sunat", "Control de Caja Blindado", "Bandeja de Cocina Pro"], popular: true },
      { name: "Corporativo", price: "S/. 249", desc: "Control total para franquicias y cadenas multi-ambiente.", features: ["Múltiples Salones", "Soporte 24/7 Dedicado", "API Access Ilimitado", "Analítica Avanzada AI", "Logística de Insumos"], popular: false }
    ]
  };

  const testimonials = [
    { name: "Carlos Mendoza", role: "Dueño de 'El Carbón & Sazón'", text: "El parpadeo que tenía mi sistema anterior volvía locos a mis mozos. Con el mapa interactivo de Bunker, el control de la sala es inmediato y fluido.", stars: 5 },
    { name: "Milagros Vega", role: "Administradora de 'Inversiones Gastronómicas'", text: "La validación automática de RUC nos ahorra minutos valiosos en caja. La arquitectura es limpia y visualmente está a otro nivel.", stars: 5 },
    { name: "Hector Madrid", role: "Lead Architect", text: "Diseñado bajo los estándares de alta fidelidad oscura. Rendimiento óptimo en renderizado reactivo y persistencia serverless.", stars: 5 }
  ];

  const faqs = [
    { q: "¿Cómo evita el sistema errores con la caja cerrada?", a: "Bunker integra un Contexto Global que intercepta el estado operativo. Si la caja no registra apertura, el salón pasa a modo atenuado ('CERRADA') bloqueando la creación de comandas fantasmas." },
    { q: "¿La consulta de RUC requiere una IP estática?", a: "No. El sistema consume un endpoint serverless optimizado mediante autenticación por Token Bearer, haciéndolo 100% compatible con despliegues dinámicos en Vercel." },
    { q: "¿Es compatible con impresoras térmicas de tickets?", a: "Sí, el renderizado de tickets está pre-calculado con fuentes monoespaciadas nativas a través de CSS nativo para un formateado físico perfecto de 80mm." }
  ];

  const integrations = ["Supabase", "Prisma", "Vercel", "Tailwind", "React", "NodeJS", "PostgreSQL", "GitHub"];

  return (
    <div className="landing-root min-h-screen bg-[#060609] text-white selection:bg-teal-500 selection:text-black overflow-x-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* 🌟 CONTENEDOR DE LA AURORA (Arriba en la Web) */}
      <div className="absolute top-0 left-0 w-full h-[50vh] overflow-hidden opacity-70 mask-image">
        <Aurora
          colorStops={["#00d0b8", "#000000", "#00d0b8"]}
          blend={0.6}
          amplitude={1.0}
          speed={0.6}
        />
        {/* Un degradado negro abajo para que se fusione suavemente con el resto de la web */}
        <div className="absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
      </div>
      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 border-b border-gray-900/40 bg-[#060609]/70 backdrop-blur-md">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-bold tracking-tight cursor-pointer hover:scale-105 transition-transform origin-left" onClick={() => navigate('/')}>
            <LayoutDashboard className="text-teal-400" size={22} />
            BUNKER
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Beneficios</a>
            <a href="#workflow" className="hover:text-white transition-colors">Estructura</a>
            <a href="#pricing" className="hover:text-white transition-colors">Precios</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <SaasButton variant="ghost" onClick={() => navigate('/login')}>Iniciar Sesión</SaasButton>
            <SaasButton variant="default" onClick={() => navigate('/login')}>Acceder Demo</SaasButton>
          </div>
          <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[#060609] border-t border-gray-900 px-6 py-6 flex flex-col gap-4 animate-fade-in fade-in">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-gray-400 py-1">Beneficios</a>
            <a href="#workflow" onClick={() => setMobileMenuOpen(false)} className="text-gray-400 py-1">Estructura</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-gray-400 py-1">Precios</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-gray-400 py-1">FAQ</a>
            <div className="h-px bg-gray-900 my-2" />
            <SaasButton className="w-full justify-start" variant="ghost" onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}>Iniciar Sesión</SaasButton>
            <SaasButton className="w-full justify-start" variant="default" onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}>Acceder Demo</SaasButton>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative pt-36 pb-20 px-6 max-w-6xl mx-auto flex flex-col items-center text-center">
        <RevealOnScroll variant="slide-down" delay={100}>
          <aside className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-800 bg-gray-900/20 backdrop-blur-sm text-xs text-gray-400 animate-bounce">
            <span className="flex items-center gap-1 text-teal-400 font-medium">
              <Sparkles size={12} /> Motor de salón interactivo en vivo
            </span>
            <span className="h-3 w-px bg-gray-800" />
            <span className="text-gray-500">v2.0 Estabilizada</span>
          </aside>
        </RevealOnScroll>

        <RevealOnScroll variant="slide-up" delay={250}>
          <h1 className="hero-title text-4xl md:text-7xl font-bold max-w-5xl leading-[1.1] mb-6 tracking-tight"
            style={{ background: "linear-gradient(to bottom, #ffffff 30%, rgba(255, 255, 255, 0.5) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Automatiza Tu Restaurante <br />Como Nunca Antes
          </h1>
        </RevealOnScroll>

        <RevealOnScroll variant="slide-up" delay={400}>
          <p className="text-sm md:text-base text-gray-400 max-w-2xl mb-10 leading-relaxed">
            Puntos de venta fluidos, distribución de mesas absoluta con neón semántico y consultas automáticas de Sunat. Todo lo que tu negocio gastronómico necesita en una sola interfaz.
          </p>
        </RevealOnScroll>

        <RevealOnScroll variant="slide-up" delay={550}>
          <div className="flex items-center gap-4 relative z-10 mb-20">
            <SaasButton className="h-12 px-8 rounded-xl text-base" variant="gradient" onClick={() => navigate('/login')}>
              Comenzar Prueba Gratis <ArrowRight className="ml-1" size={16} />
            </SaasButton>
          </div>
        </RevealOnScroll>

        <RevealOnScroll variant="scale" delay={700} duration={1200} className="w-full flex justify-center">
          <div className="w-full max-w-7xl relative flex justify-center mb-16">
            <div style={{ width: '100%', height: '750px', position: 'relative' }}>
              <CircularCarousel
                items={carouselItems}
                preset="cylinder"
                intro="rise"
                cardWidth={950}
                aspectRatio={2.09}
                curve={1}
                gap={42}
                speed={12}
                scale={1.9}
                depthFade={0.92}
                captions={false}
                onItemClick={(item, index) => setExpandedIndex(index)}
              />
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* STATS */}
      <section className="border-t border-gray-900/60 bg-black/40 py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <RevealOnScroll key={i} variant="slide-up" delay={i * 150}>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-1">{s.value}</div>
                <div className="text-xs md:text-sm text-gray-500 font-medium tracking-wide uppercase">{s.label}</div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-6 max-w-6xl mx-auto border-t border-gray-900/40">
        <div className="text-center mb-16">
          <RevealOnScroll variant="slide-up">
            <h2 className="section-title text-3xl md:text-5xl font-bold tracking-tight mb-4">Funcionalidades potentes para equipos modernos</h2>
          </RevealOnScroll>
          <RevealOnScroll variant="slide-up" delay={150}>
            <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto">Todo lo necesario para automatizar, optimizar y expandir los procesos comerciales de tu salón sin fricciones técnicas.</p>
          </RevealOnScroll>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <RevealOnScroll key={i} variant="slide-up" delay={i * 100}>
              <div className="p-6 rounded-xl border border-gray-900 bg-gray-950/30 backdrop-blur-xs transition-all duration-300 hover:border-gray-800 hover:-translate-y-1 group min-h-[220px] md:h-[220px]">
                <div className="w-10 h-10 rounded-lg bg-teal-500/5 border border-teal-500/10 flex items-center justify-center text-teal-400 mb-4 group-hover:bg-teal-500/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-200">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="py-24 px-6 bg-black/20 border-t border-gray-900/50">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <RevealOnScroll variant="slide-right">
            <div>
              <span className="text-xs font-bold tracking-widest text-teal-400 uppercase">Flujo de Trabajo</span>
              <h2 className="section-title text-3xl md:text-5xl font-bold tracking-tight mt-2 mb-6 leading-tight">Control Operativo en Tres Pasos</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">Diseñado con una lógica de blindaje transaccional. La interfaz guía al personal de forma intuitiva, eliminando descuidos administrativos y pérdidas en cuentas.</p>
            </div>
          </RevealOnScroll>
          <div className="flex flex-col gap-6">
            {steps.map((s, i) => (
              <RevealOnScroll key={i} variant="slide-left" delay={i * 150}>
                <div className="flex gap-4 p-5 rounded-xl border border-gray-900 bg-gray-950/20">
                  <div className="text-xl font-bold text-teal-500/40 mt-0.5">{s.num}</div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-200 mb-1">{s.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6 max-w-6xl mx-auto border-t border-gray-900/40">
        <div className="text-center mb-12">
          <RevealOnScroll variant="slide-up">
            <h2 className="section-title text-3xl md:text-5xl font-bold tracking-tight mb-4">Precios sencillos y transparentes</h2>
          </RevealOnScroll>
          <RevealOnScroll variant="slide-up" delay={150}>
            <p className="text-gray-400 text-sm max-w-xl mx-auto mb-8">Elige el plan ideal para tu salón. Escalabilidad garantizada a medida que tu negocio gastronómico crece.</p>
          </RevealOnScroll>

          <RevealOnScroll variant="fade" delay={200}>
            <div className="inline-flex items-center p-1 rounded-lg bg-gray-950 border border-gray-900">
              <button className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${billingPeriod === 'monthly' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-white'}`} onClick={() => setBillingPeriod('monthly')}>Mensual</button>
              <button className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${billingPeriod === 'yearly' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-white'}`} onClick={() => setBillingPeriod('yearly')}>Anual (Ahorro)</button>
            </div>
          </RevealOnScroll>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
          {pricing[billingPeriod].map((p, i) => (
            <RevealOnScroll key={i} variant="slide-up" delay={i * 150} className="h-full">
              <div className={`relative flex flex-col justify-between p-8 rounded-xl border transition-all duration-300 hover:-translate-y-2 h-full group ${p.popular ? 'border-teal-500/50 bg-[#060609]' : 'border-gray-900 hover:border-teal-500/50 bg-gray-950/20'}`}>
                <div className={`absolute -inset-px rounded-xl bg-gradient-to-r from-teal-500/30 to-teal-600/30 blur-sm -z-10 transition-opacity duration-300 ${p.popular ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                {p.popular && (
                  <span className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider text-teal-400 uppercase bg-teal-950 border border-teal-500/30">Popular</span>
                )}
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">{p.name}</h3>
                  <p className="text-xs text-gray-400 mb-6">{p.desc}</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl font-extrabold text-white">{p.price}</span>
                    <span className="text-xs text-gray-500">/ mes</span>
                  </div>
                  <ul className="flex flex-col gap-3 mb-8">
                    {p.features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-2 text-xs text-gray-300">
                        <Check size={14} className="text-teal-400 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <SaasButton className="w-full justify-center" variant={p.popular ? 'gradient' : 'ghost'} onClick={() => navigate('/login')}>
                  Comenzar Plan
                </SaasButton>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 px-6 bg-black/20 border-t border-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <RevealOnScroll variant="slide-up">
              <h2 className="section-title text-3xl md:text-5xl font-bold tracking-tight mb-4">Elegida por equipos de todo el mundo</h2>
            </RevealOnScroll>
            <RevealOnScroll variant="slide-up" delay={150}>
              <p className="text-gray-400 text-sm max-w-xl mx-auto">Descubre cómo los administradores y mozos han transformado el ritmo de su atención comercial.</p>
            </RevealOnScroll>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <RevealOnScroll key={i} variant="slide-up" delay={i * 150}>
                <div className="p-6 rounded-xl border border-gray-900 bg-gray-950/20 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: t.stars }).map((_, si) => <Star key={si} className="text-amber-400" fill="#fbbf24" stroke="#fbbf24" size={14} />)}
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed italic mb-6">"{t.text}"</p>
                  </div>
                  <div className="flex items-center gap-3 border-t border-gray-900/60 pt-4 mt-auto">
                    <div className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center font-bold text-xs text-teal-400 uppercase">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-200">{t.name}</h4>
                      <p className="text-[11px] text-gray-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section className="py-20 px-6 max-w-5xl mx-auto border-t border-gray-900/40 text-center">
        <RevealOnScroll variant="fade">
          <h2 className="text-sm font-bold tracking-widest text-teal-500 uppercase mb-8">Tecnología de Infraestructura Líquida</h2>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 select-none group">
            {integrations.map((tech, i) => (
              <span key={i} className="text-base md:text-lg font-bold tracking-wider text-gray-400 lowercase italic grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500">
                #{tech}
              </span>
            ))}
          </div>
        </RevealOnScroll>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 bg-black/10 border-t border-gray-900/40">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <RevealOnScroll variant="slide-up">
              <h2 className="section-title text-3xl md:text-4xl font-bold tracking-tight mb-4">Preguntas Frecuentes</h2>
            </RevealOnScroll>
            <RevealOnScroll variant="slide-up" delay={150}>
              <p className="text-gray-400 text-sm">Resuelve tus dudas operativas sobre la pasarela técnica y las validaciones del sistema.</p>
            </RevealOnScroll>
          </div>
          <div className="flex flex-col gap-3">
            {faqs.map((f, i) => {
              const isOpen = activeFaq === i;
              return (
                <RevealOnScroll key={i} variant="slide-up" delay={i * 100}>
                  <div className="rounded-xl border border-gray-900 bg-[#050508] overflow-hidden transition-colors duration-200">
                    <button className="w-full p-5 flex items-center justify-between text-left font-medium text-sm md:text-base text-gray-200 hover:text-white cursor-pointer" onClick={() => setActiveFaq(isOpen ? null : i)}>
                      <span>{f.q}</span>
                      <ChevronDown
                        className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-teal-400' : ''}`}
                        size={16}
                      />
                    </button>
                    <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden">
                        <div className="px-5 pb-5 text-xs md:text-sm text-gray-400 leading-relaxed border-t border-gray-900/40 pt-3 bg-black/10">
                          {f.a}
                        </div>
                      </div>
                    </div>
                  </div>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}

      <section className="relative py-24 px-6 border-t border-gray-900/40 overflow-hidden text-center">
        {/* 🌟 CONTENEDOR DE LA AURORA (Arriba en la Web) */}
        <div className="absolute top-0 left-0 w-full h-[50vh] overflow-hidden opacity-70 mask-image">
          <Aurora
            colorStops={["#00d0b8", "#000000", "#00d0b8"]}
            blend={0.6}
            amplitude={1.0}
            speed={0.6}
          />
          {/* Un degradado negro abajo para que se fusione suavemente con el resto de la web */}
          <div className="absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
        </div>
        <RevealOnScroll variant="scale" duration={1200}>
          <div className="absolute left-1/2 w-[70%] h-[80%] pointer-events-none z-0 opacity-20 blur-[140px] bottom-[-20%] -translate-x-1/2 bg-teal-500 rounded-full" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="section-title text-3xl md:text-5xl font-bold tracking-tight mb-4">¿Listo para transformar tu restaurante?</h2>
            <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto mb-8">Únete a los restaurantes locales que ya operan sin parpadeos visuales ni descuadres de caja.</p>
            <SaasButton className="h-12 px-8 rounded-xl text-base font-bold" variant="gradient" onClick={() => navigate('/login')}>
              Ingresar al Sistema Ahora
            </SaasButton>
          </div>
        </RevealOnScroll>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-900 bg-black/60 py-12 px-6 text-xs text-gray-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 text-sm font-bold text-white tracking-tight mb-2 hover:scale-105 transition-transform origin-left cursor-pointer" onClick={() => navigate('/')}>
              <LayoutDashboard className="text-teal-400" size={16} /> BUNKER
            </div>
            <p className="leading-relaxed max-w-xs">Optimización transaccional de alta fidelidad para el control administrativo de locales gastronómicos.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-6 md:gap-12">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-gray-400 text-[11px] uppercase tracking-wider">Producto</span>
              <a href="#features" className="hover:text-white transition-colors">Beneficios</a>
              <a href="#pricing" className="hover:text-white transition-colors">Precios</a>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-gray-400 text-[11px] uppercase tracking-wider">Legal</span>
              <button
                type="button"
                onClick={() => setLegalModal('terms')}
                className="text-left hover:text-white transition-colors cursor-pointer text-gray-400 text-xs"
              >
                Términos de servicio
              </button>
              <button
                type="button"
                onClick={() => setLegalModal('privacy')}
                className="text-left hover:text-white transition-colors cursor-pointer text-gray-400 text-xs"
              >
                Privacidad
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto border-t border-gray-900/60 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px]">
          <div className="text-center sm:text-left">
            &copy; {new Date().getFullYear()} Bunker. Todos los derechos reservados. Proyecto Académico de Simulación Comercial.
          </div>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center justify-center w-10 h-10 rounded-full text-white hover:-translate-y-1 active:translate-y-0 transition-all duration-300 group cursor-pointer"
            style={{
              backgroundColor: '#00c9b4',
              boxShadow: '0 0 15px rgba(0, 201, 180, 0.4)',
              border: '1px solid rgba(0, 201, 180, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#00e0c8';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 201, 180, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#00c9b4';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 201, 180, 0.4)';
            }}
            title="Volver arriba"
            aria-label="Volver arriba"
          >
            <ChevronUp size={20} className="group-hover:animate-bounce text-white" />
          </button>
        </div>
      </footer>

      {/* BANNER DE COOKIES */}
      {showCookies && (
        <div className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-50 bg-[#0f172a]/95 backdrop-blur-md border border-gray-800 p-4 rounded-xl shadow-2xl text-xs text-gray-300 flex flex-col sm:flex-row items-center gap-3 animate-fade-in">
          <p className="flex-1 text-center sm:text-left leading-relaxed">
            Utilizamos cookies esenciales para optimizar la velocidad, seguridad y persistencia de sesión en <span className="text-teal-400 font-semibold">Búnker</span>.
          </p>
          <div className="flex gap-2">
            <button
              onClick={acceptCookies}
              className="bg-teal-500 hover:bg-teal-400 text-black font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer text-xs"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE DE WHATSAPP */}
      <a
        href="https://wa.me/51924383883?text=Hola%20B%C3%BAnker%2C%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20el%20sistema%20gastron%C3%B3mico"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#25D366] hover:bg-[#20bd5a] text-white p-3.5 rounded-full shadow-[0_10px_25px_rgba(37,211,102,0.4)] hover:shadow-[0_15px_35px_rgba(37,211,102,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 group cursor-pointer"
        title="Chatea con nosotros por WhatsApp (+51 924 383 883)"
      >
        <span className="hidden sm:inline-block max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-500 text-xs font-bold pl-1 text-white">
          ¿Dudas? Chatea con nosotros
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-6 h-6 text-white"
        >
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.34C9.33 7.34 9.15 7.35 8.97 7.42C8.72 7.5 8.35 7.85 8.35 8.57C8.35 9.29 8.87 10.37 8.97 10.52C9.07 10.67 10.3 12.63 12.24 13.44C13.88 14.12 14.21 13.99 14.57 13.95C14.93 13.92 15.73 13.47 15.9 12.98C16.07 12.49 16.07 12.08 16.02 11.99C15.97 11.9 15.84 11.85 15.65 11.75C15.45 11.65 14.51 11.19 14.33 11.13C14.16 11.06 14.03 11.03 13.91 11.22C13.74 11.47 13.37 11.93 13.25 12.05C13.13 12.18 13.01 12.2 12.81 12.1C12.62 12 11.79 11.73 10.82 10.86C10.06 10.18 9.55 9.34 9.4 9.09C9.25 8.85 9.39 8.71 9.49 8.61C9.58 8.52 9.69 8.38 9.79 8.26C9.89 8.14 9.92 8.04 9.99 7.9C10.05 7.75 10.02 7.63 9.97 7.53C9.92 7.43 9.53 6.46 9.37 6.07C9.21 5.69 9.05 5.75 8.93 5.74C8.82 5.73 8.69 5.73 8.56 5.73" />
        </svg>
      </a>

      {/* MODAL LEGAL (TÉRMINOS Y PRIVACIDAD) */}
      {legalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/60">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="text-teal-400" size={18} />
                {legalModal === 'terms' ? 'Términos y Condiciones de Servicio' : 'Política de Privacidad y Tratamiento de Datos'}
              </h3>
              <button
                onClick={() => setLegalModal(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-xs text-gray-300 space-y-4 leading-relaxed">
              {legalModal === 'terms' ? (
                <>
                  <p><strong>1. Identificación del Servicio:</strong> Búnker es una plataforma web especializada en la gestión operativa de restaurantes, salón interactivo, comandas de cocina y facturación comercial.</p>
                  <p><strong>2. Propiedad Intelectual y Licenciamiento:</strong> Todos los derechos sobre la plataforma, código fuente y marca pertenecen a sus desarrolladores. El usuario adquiere una licencia de uso intransferible para su establecimiento comercial.</p>
                  <p><strong>3. Responsabilidad Transaccional:</strong> La plataforma proporciona herramientas para control de caja y cuadre de turnos. El usuario es responsable de la exactitud de los montos ingresados y de la custodia de sus credenciales de acceso.</p>
                  <p><strong>4. Disponibilidad del Servicio:</strong> Operamos sobre infraestructura cloud de alta disponibilidad (99.9% uptime). La conectividad final depende del proveedor de Internet del establecimiento.</p>
                </>
              ) : (
                <>
                  <p><strong>1. Información Recopilada:</strong> Recopilamos datos estrictamente necesarios para la operativa del restaurante: nombres de usuarios del sistema, registros de comandas, comprobantes y números de RUC/DNI para facturación.</p>
                  <p><strong>2. Uso de la Información:</strong> Los datos se emplean únicamente para la generación de reportes financieros, emisión de comprobantes y auditoría de inventario. No comercializamos ni transferimos datos a terceros.</p>
                  <p><strong>3. Seguridad de Datos:</strong> Todas las contraseñas se almacenan mediante algoritmos de encriptación criptográfica (bcrypt). La comunicación viaja cifrada bajo certificados TLS/HTTPS.</p>
                  <p><strong>4. Derechos ARCO:</strong> El titular de la cuenta puede solicitar en cualquier momento la exportación o eliminación de sus datos comunicándose a través de nuestros canales de soporte.</p>
                </>
              )}
            </div>
            <div className="p-4 border-t border-gray-800 bg-gray-900/60 text-right">
              <button
                onClick={() => setLegalModal(null)}
                className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LIGHTBOX EXPANDIR IMAGEN */}
      {expandedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col items-center justify-center p-3 md:p-8 animate-fade-in select-none"
          onClick={() => setExpandedIndex(null)}
        >
          {/* Barra Superior */}
          <div
            className="w-full max-w-6xl flex items-center justify-between pb-3 mb-2 border-b border-gray-800/80 text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                {carouselItems[expandedIndex].title}
              </h3>
              <p className="text-xs md:text-sm text-teal-400 font-medium uppercase tracking-wider">
                {carouselItems[expandedIndex].subtitle}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-mono tabular-nums px-2.5 py-1 bg-gray-900/80 border border-gray-800 rounded-lg">
                {expandedIndex + 1} / {carouselItems.length}
              </span>
              <button
                onClick={() => setExpandedIndex(null)}
                className="p-2 rounded-lg bg-gray-900/80 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition-all cursor-pointer"
                title="Cerrar (Esc)"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Contenedor Principal de la Imagen */}
          <div
            className="relative w-full max-w-6xl flex items-center justify-center my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón Anterior */}
            <button
              onClick={() => setExpandedIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length)}
              className="absolute left-2 md:-left-12 z-20 p-2.5 rounded-full bg-black/75 hover:bg-teal-500 hover:text-black border border-gray-700/60 text-white transition-all shadow-xl backdrop-blur-sm cursor-pointer"
              title="Anterior"
            >
              <ChevronDown className="rotate-90" size={24} />
            </button>

            <img
              src={carouselItems[expandedIndex].src}
              alt={carouselItems[expandedIndex].alt}
              className="w-full max-h-[76vh] object-contain rounded-xl border border-gray-800/80 shadow-[0_20px_60px_rgba(0,0,0,0.9)] bg-black/40"
            />

            {/* Botón Siguiente */}
            <button
              onClick={() => setExpandedIndex((prev) => (prev + 1) % carouselItems.length)}
              className="absolute right-2 md:-right-12 z-20 p-2.5 rounded-full bg-black/75 hover:bg-teal-500 hover:text-black border border-gray-700/60 text-white transition-all shadow-xl backdrop-blur-sm cursor-pointer"
              title="Siguiente"
            >
              <ChevronDown className="-rotate-90" size={24} />
            </button>
          </div>

          <div className="text-[11px] text-gray-400 mt-2 z-10 hidden md:block">
            Usa las flechas del teclado ← → para navegar o Esc para cerrar
          </div>
        </div>
      )}
    </div>
  );
}
