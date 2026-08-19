import { useState } from "react";
import { BookOpen, Play, CheckCircle, Clock, Award, Video, FileText, Users, ChevronRight, Lock, Star, Zap, Target, TrendingUp, MessageSquare, Mail, Globe } from "lucide-react";
import { cn, Button } from "../components/ui";

interface Course {
  id: string;
  title: string;
  description: string;
  icon: any;
  duration: string;
  lessons: number;
  level: "Básico" | "Intermedio" | "Avanzado";
  category: string;
  progress: number;
  certificate: boolean;
}

interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: "video" | "quiz" | "reading";
  completed: boolean;
}

const courses: Course[] = [
  {
    id: "marketing-digital",
    title: "Fundamentos de Marketing Digital",
    description: "Aprende las bases del marketing online para generar leads cualificados.",
    icon: Globe,
    duration: "4 horas",
    lessons: 12,
    level: "Básico",
    category: "Marketing",
    progress: 0,
    certificate: true,
  },
  {
    id: "social-media",
    title: "Social Media Marketing",
    description: "Domina Facebook, Instagram, TikTok y LinkedIn para captar prospectos.",
    icon: Users,
    duration: "6 horas",
    lessons: 18,
    level: "Intermedio",
    category: "Redes Sociales",
    progress: 0,
    certificate: true,
  },
  {
    id: "ventas-direccion",
    title: "Ventas y Dirección de Objeciones",
    description: "Técnicas profesionales para cerrar ventas y manejar objeciones.",
    icon: Target,
    duration: "5 horas",
    lessons: 15,
    level: "Intermedio",
    category: "Ventas",
    progress: 0,
    certificate: true,
  },
  {
    id: "copywriting",
    title: "Copywriting que Convierte",
    description: "Escribe textos de venta que generan acción y aumentan conversiones.",
    icon: FileText,
    duration: "3 horas",
    lessons: 10,
    level: "Básico",
    category: "Contenido",
    progress: 0,
    certificate: false,
  },
  {
    id: "embudos-ventas",
    title: "Embudos de Ventas Automatizados",
    description: "Crea funnels que convierten prospectos en clientes sin intervención manual.",
    icon: TrendingUp,
    duration: "7 horas",
    lessons: 20,
    level: "Avanzado",
    category: "Automatización",
    progress: 0,
    certificate: true,
  },
  {
    id: "email-marketing",
    title: "Email Marketing Avanzado",
    description: "Secuencias de email que nurturan leads y cierran ventas automáticamente.",
    icon: Mail,
    duration: "4 horas",
    lessons: 14,
    level: "Intermedio",
    category: "Email",
    progress: 0,
    certificate: true,
  },
  {
    id: "ia-ventas",
    title: "IA para Ventas y Marketing",
    description: "Utiliza inteligencia artificial para escalar tus resultados.",
    icon: Zap,
    duration: "5 horas",
    lessons: 16,
    level: "Avanzado",
    category: "IA",
    progress: 0,
    certificate: true,
  },
  {
    id: "liderazgo",
    title: "Liderazgo y Equipo",
    description: "Construye y lidera equipos de alto rendimiento en network marketing.",
    icon: Award,
    duration: "4 horas",
    lessons: 12,
    level: "Intermedio",
    category: "Liderazgo",
    progress: 0,
    certificate: true,
  },
];

const categories = ["Todos", "Marketing", "Redes Sociales", "Ventas", "Contenido", "Automatización", "Email", "IA", "Liderazgo"];
const levels = ["Todos", "Básico", "Intermedio", "Avanzado"];

export default function CoursesPage() {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedLevel, setSelectedLevel] = useState("Todos");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  const filteredCourses = courses.filter((c) => {
    const matchCategory = selectedCategory === "Todos" || c.category === selectedCategory;
    const matchLevel = selectedLevel === "Todos" || c.level === selectedLevel;
    return matchCategory && matchLevel;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Básico": return "text-emerald-400 bg-emerald-400/10";
      case "Intermedio": return "text-amber-400 bg-amber-400/10";
      case "Avanzado": return "text-rose-400 bg-rose-400/10";
      default: return "text-slate-400 bg-slate-400/10";
    }
  };

  const sampleLessons: Lesson[] = [
    { id: "1", title: "Introducción al Curso", duration: "5 min", type: "video", completed: true },
    { id: "2", title: "¿Qué es el Marketing Digital?", duration: "12 min", type: "video", completed: true },
    { id: "3", title: "Principales Canales", duration: "15 min", type: "video", completed: false },
    { id: "4", title: "Quiz: Conceptos Básicos", duration: "5 min", type: "quiz", completed: false },
    { id: "5", title: "Estrategia de Contenido", duration: "20 min", type: "video", completed: false },
    { id: "6", title: "Casos de Éxito", duration: "10 min", type: "reading", completed: false },
  ];

  if (selectedCourse) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedCourse(null)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition cursor-pointer">
          <ChevronRight className="h-4 w-4 rotate-180" /> Volver a cursos
        </button>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-brand-600/20 to-glow-600/10 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
              <selectedCourse.icon className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-extrabold text-white">{selectedCourse.title}</h1>
              <p className="mt-1 text-sm text-slate-300">{selectedCourse.description}</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {selectedCourse.duration}</span>
                <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {selectedCourse.lessons} lecciones</span>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", getLevelColor(selectedCourse.level))}>{selectedCourse.level}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-lg font-bold text-white">Contenido del Curso</h2>
            {sampleLessons.map((lesson, i) => (
              <div key={lesson.id} className={cn("flex items-center gap-4 rounded-xl border p-4 transition-all", lesson.completed ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/10 bg-white/5 hover:border-brand-500/30")}>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", lesson.completed ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-slate-400")}>
                  {lesson.completed ? <CheckCircle className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <p className={cn("text-sm font-semibold", lesson.completed ? "text-emerald-300" : "text-white")}>{lesson.title}</p>
                  <p className="text-[11px] text-slate-500">{lesson.duration} · {lesson.type === "video" ? "Video" : lesson.type === "quiz" ? "Quiz" : "Lectura"}</p>
                </div>
                {!lesson.completed && <Button size="sm" variant="outline">Iniciar</Button>}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-bold text-white mb-3">Tu Progreso</h3>
              <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-500 to-glow-500 transition-all" style={{ width: "33%" }} />
              </div>
              <p className="mt-2 text-xs text-slate-400">2 de 6 lecciones completadas</p>
            </div>

            {selectedCourse.certificate && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 text-amber-400">
                  <Award className="h-5 w-5" />
                  <p className="text-sm font-bold">Certificado</p>
                </div>
                <p className="mt-1 text-xs text-slate-400">Obtén tu certificado al completar el 100% del curso.</p>
              </div>
            )}

            <Button className="w-full" size="lg">
              <Play className="h-4 w-4 mr-2" /> Continuar Curso
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showIntro) {
    return (
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-600/30 via-glow-600/20 to-rose-600/10 p-8 text-center">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-glow-500/20 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="relative z-10">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-glow-500 shadow-2xl shadow-brand-600/40 animate-bounce-slow">
              <BookOpen className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-white animate-fade-up">Centro de Aprendizaje</h1>
            <p className="mt-2 text-sm text-slate-300 max-w-xl mx-auto animate-fade-up" style={{ animationDelay: "0.1s" }}>
              Capacítate con nuestros cursos de marketing digital, ventas y liderazgo. 
              Obtén certificados y potencia tu negocio con conocimiento de vanguardia.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <Button onClick={() => setShowIntro(false)} size="lg">
                <Play className="h-4 w-4 mr-2" /> Explorar Cursos
              </Button>
              <Button variant="outline" size="lg">
                <Award className="h-4 w-4 mr-2" /> Mis Certificados
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Video, title: "8 Cursos", desc: "Contenido actualizado" },
            { icon: Clock, title: "38+ Horas", desc: "De aprendizaje" },
            { icon: Award, title: "Certificados", desc: "Reconocimiento oficial" },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 animate-fade-up" style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10">
                <stat.icon className="h-6 w-6 text-brand-400" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-white">{stat.title}</p>
                <p className="text-xs text-slate-400">{stat.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-lg font-bold text-white mb-4">Cursos Populares</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {courses.slice(0, 4).map((course, i) => (
              <button
                key={course.id}
                onClick={() => { setSelectedCourse(course); setShowIntro(false); }}
                className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-brand-500/30 hover:bg-white/10 cursor-pointer animate-fade-up"
                style={{ animationDelay: `${0.4 + i * 0.1}s` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 group-hover:scale-110 transition-transform">
                  <course.icon className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-bold text-white">{course.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">{course.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", getLevelColor(course.level))}>{course.level}</span>
                  <span className="text-[10px] text-slate-500">{course.duration}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Centro de Aprendizaje</h1>
        <p className="text-sm text-slate-400">Cursos de marketing digital, ventas y liderazgo para impulsar tu negocio.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer", selectedCategory === cat ? "bg-brand-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {levels.map((lvl) => (
          <button
            key={lvl}
            onClick={() => setSelectedLevel(lvl)}
            className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer", selectedLevel === lvl ? "bg-glow-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}
          >
            {lvl}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCourses.map((course) => (
          <button
            key={course.id}
            onClick={() => setSelectedCourse(course)}
            className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 p-5 text-left transition-all hover:border-brand-500/30 hover:bg-white/10 cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400 group-hover:scale-110 transition-transform">
                <course.icon className="h-7 w-7" />
              </div>
              {course.certificate && (
                <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1">
                  <Award className="h-3 w-3 text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-400">Certificado</span>
                </div>
              )}
            </div>
            <h3 className="mt-4 text-base font-bold text-white">{course.title}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-slate-400">{course.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {course.duration}</span>
                <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {course.lessons}</span>
              </div>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", getLevelColor(course.level))}>{course.level}</span>
            </div>
            <div className="mt-3 relative h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-500 to-glow-500 transition-all" style={{ width: `${course.progress}%` }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
