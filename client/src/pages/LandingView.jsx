import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Menu, X, LayoutDashboard, Shield, Zap, Sparkles,
  ChevronDown, ChevronUp, Check, Star, HelpCircle, Utensils,
  TrendingUp, Users, Printer, Store
} from 'lucide-react';
import RevealOnScroll from '../components/RevealOnScroll';
import HeroCarousel from '../components/HeroCarousel';
import Aurora from '../components/Aurora';

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
  const navigate = useNavigate();

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
          <div className="w-full max-w-5xl relative group">
            <div className="absolute left-1/2 w-[90%] h-[70%] pointer-events-none z-0 opacity-15 blur-[140px] top-[-10%] -translate-x-1/2 bg-teal-500 rounded-full" />
            <div className="relative z-10 border border-gray-800/60 rounded-2xl overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.8)] bg-gray-950/60 transition-transform duration-700 hover:scale-[1.01]">
              <HeroCarousel />
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
              <span className="cursor-not-allowed">Términos de servicio</span>
              <span className="cursor-not-allowed">Privacidad</span>
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

    </div>
  );
}
