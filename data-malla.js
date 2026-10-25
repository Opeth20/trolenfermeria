// Malla de Enfermería UDLA Chile 2026 (jornada diurna, 10 semestres).
// Fuente: admision.udla.cl/wp-content/uploads/2021/06/Enfermeria-UDLA-2026.pdf
// La universidad indica que la malla puede cambiar; verifica con tu escuela.
// area: general | profesional | disciplinar | practico
// mix: ramos cuyas preguntas se mezclan (prácticas, internados, talleres, examen de título)
window.MALLA = {
  fuente: 'Malla curricular Enfermería UDLA 2026 (Diurno)',
  semestres: [
    { n: 1, ramos: [
      { id: 'mat', name: 'Introducción a la Matemática Aplicada', icon: '🧮', area: 'general', topics: ['conversiones de unidades', 'regla de tres', 'porcentajes y soluciones', 'cálculo de dosis básico'] },
      { id: 'bio', name: 'Biología Celular', icon: '🧬', area: 'disciplinar', topics: ['organelos', 'membrana y transporte', 'ciclo celular', 'mitosis y meiosis', 'ADN y síntesis de proteínas'] },
      { id: 'comu1', name: 'Fundamentos del Actuar Comunitario', icon: '🏘️', area: 'profesional', topics: ['APS y Alma-Ata', 'determinantes sociales', 'modelo de salud familiar', 'participación comunitaria'] },
      { id: 'morfo', name: 'Morfología y Función', icon: '🦴', area: 'disciplinar', topics: ['sistema cardiovascular', 'sistema respiratorio', 'sistema renal', 'sistema nervioso', 'sistema musculoesquelético'] },
      { id: 'paux', name: 'Primeros Auxilios', icon: '🩹', area: 'profesional', topics: ['RCP básica', 'DEA', 'atragantamiento', 'hemorragias', 'quemaduras', 'posición lateral de seguridad'] },
      { id: 'intro', name: 'Introducción a los Estudios de la Enfermería', icon: '📘', area: 'profesional', topics: ['historia de la enfermería', 'teorías y modelos', 'metaparadigma', 'rol de la enfermera en Chile (Código Sanitario art. 113)'] },
    ] },
    { n: 2, ramos: [
      { id: 'ing1', name: 'Inglés I', icon: '🇬🇧', area: 'general', topics: ['vocabulario médico básico', 'preguntas al paciente', 'signos y síntomas en inglés'] },
      { id: 'quim', name: 'Fundamentos de Química y Bioquímica para el Área de la Salud', icon: '⚗️', area: 'disciplinar', topics: ['materia, átomos y enlaces', 'grupos funcionales', 'reacciones y redox', 'bioenergética', 'agua, disoluciones y concentraciones', 'pH y buffer', 'aminoácidos y proteínas', 'enzimas', 'glucólisis y gluconeogénesis', 'Krebs y cadena respiratoria', 'lípidos y cuerpos cetónicos', 'metabolismo del nitrógeno'] },
      { id: 'etica', name: 'Fundamentos Éticos del Actuar Comunitario', icon: '⚖️', area: 'profesional', topics: ['ética y moral', 'dignidad y justicia social', 'alteridad: Levinas, Ricœur y Dussel', 'comunidad (Bauman) y miedo (Lechner)', 'ciudadanía de baja intensidad (O\'Donnell)', 'justicia y paridad (Fraser)', 'participación y corresponsabilidad', 'diálogo y convivencia democrática', 'actuar sobre, para o con la comunidad'] },
      { id: 'histo', name: 'Histoembriología', icon: '🔬', area: 'disciplinar', topics: ['tejidos fundamentales', 'sistema reproductor y gametogénesis', 'fecundación a gastrulación', 'tejido epitelial y glandular', 'tejido conectivo', 'cartílago, hueso y sangre', 'tejido muscular', 'tejido nervioso'] },
      { id: 'vida', name: 'Enfermería en el Curso de la Vida Humana', icon: '👶', area: 'profesional', topics: ['asepsia, antisepsia y aislamientos', 'comunicación en el curso de vida', 'rol enfermero en equipos', 'Humanitude y acompañamiento', 'prenatal y recién nacido', 'lactante y lactancia', 'preescolar y escolar', 'adolescencia', 'modelos de Astorquiza y Anderson'] },
    ] },
    { n: 3, ramos: [
      { id: 'ing2', name: 'Inglés II', icon: '🇺🇸', area: 'general', topics: ['verb to be y preguntas', 'there is / there are', 'presente simple y continuo', 'let\'s, posesivos y pronombres', 'artículos y plurales', 'pensamiento crítico (ethos, pathos)', 'vocabulario hospitalario'] },
      { id: 'spub', name: 'Salud Pública y Políticas Públicas', icon: '🏛️', area: 'profesional', topics: ['sistema de salud chileno', 'GES/AUGE', 'FONASA e ISAPRE', 'niveles de prevención', 'Ley Ricarte Soto', 'PNI'] },
      { id: 'bioest', name: 'Bioestadística', icon: '📊', area: 'general', topics: ['tipos de variables', 'medidas de tendencia central', 'medidas de dispersión', 'gráficos'] },
      { id: 'fisio', name: 'Fisiología General', icon: '❤️', area: 'disciplinar', topics: ['fisiología cardiovascular', 'respiratoria', 'renal', 'endocrina', 'sistema nervioso autónomo'] },
      { id: 'micro', name: 'Microbiología y Parasitología para Enfermería', icon: '🦠', area: 'disciplinar', topics: ['bacterias y tinción de Gram', 'virus', 'esterilización y desinfección', 'parásitos de Chile (Chagas, hidatidosis)'] },
      { id: 'pae1', name: 'Proceso de Atención en Enfermería I', icon: '📋', area: 'profesional', topics: ['etapas del PAE', 'valoración por patrones de Gordon', 'diagnóstico NANDA', 'signos vitales', 'datos subjetivos y objetivos'] },
    ] },
    { n: 4, ramos: [
      { id: 'metod', name: 'Metodologías Participativas e Interacción Comunitaria', icon: '🤝', area: 'profesional', topics: ['educación popular', 'diagnóstico participativo', 'mapeo de actores', 'grupos focales'] },
      { id: 'farma', name: 'Farmacología', icon: '💊', area: 'disciplinar', topics: ['farmacocinética (ADME)', 'vías de administración', 'correctos de administración', 'antídotos', 'diuréticos, anticoagulantes, digoxina'] },
      { id: 'fisiopat', name: 'Fisiopatología', icon: '🩺', area: 'disciplinar', topics: ['inflamación', 'shock', 'diabetes y cetoacidosis', 'insuficiencia cardíaca', 'EPOC', 'aterosclerosis'] },
      { id: 'comu2', name: 'Fundamentos de Enfermería en Salud Comunitaria', icon: '🏥', area: 'profesional', topics: ['visita domiciliaria integral', 'genograma y ecomapa', 'ciclo vital familiar', 'programas de APS (PSCV)'] },
      { id: 'psico', name: 'Psicología para el Ejercicio de la Enfermería', icon: '🧠', area: 'profesional', topics: ['comunicación terapéutica', 'Maslow', 'mecanismos de defensa', 'duelo', 'burnout'] },
      { id: 'pae2', name: 'Proceso de Atención en Enfermería II', icon: '📝', area: 'profesional', topics: ['priorización ABC', 'diagnósticos de riesgo', 'escalas de Braden y Downton', 'registros SOAP', 'evaluación'] },
    ] },
    { n: 5, ramos: [
      { id: 'taller1', name: 'Taller de Intervención Comunitaria Interdisciplinar I', icon: '🛠️', area: 'profesional', mix: ['comu1', 'comu2', 'metod', 'edu', 'spub', 'epi'], topics: ['diagnóstico comunitario', 'trabajo interdisciplinario', 'planificación de intervenciones'] },
      { id: 'adulto1', name: 'Salud y Morbilidad del Adulto I', icon: '🫀', area: 'disciplinar', topics: ['hipertensión', 'diabetes', 'hipoglicemia', 'pie diabético', 'IAM', 'cuidados postoperatorios'] },
      { id: 'epi', name: 'Epidemiología', icon: '📈', area: 'profesional', topics: ['incidencia y prevalencia', 'tasas', 'diseños de estudio', 'brotes y epidemias', 'sensibilidad y especificidad'] },
      { id: 'edu', name: 'Educación para la Salud', icon: '🗣️', area: 'profesional', topics: ['modelo transteórico', 'creencias en salud', 'andragogía', 'teach-back', 'objetivos educativos'] },
      { id: 'gest1', name: 'Gestión y Administración en Enfermería I', icon: '🗂️', area: 'profesional', topics: ['proceso administrativo', 'FODA', 'gestión del cuidado', 'liderazgo', 'indicadores de calidad'] },
      { id: 'prac1', name: 'Práctica Integrada I', icon: '🏨', area: 'practico', mix: ['pae1', 'pae2', 'farma', 'fisiopat', 'adulto1', 'comu2'], topics: ['integración clínica'] },
    ] },
    { n: 6, ramos: [
      { id: 'taller2', name: 'Taller de Intervención Comunitaria Interdisciplinar II', icon: '🛠️', area: 'profesional', mix: ['comu2', 'metod', 'edu', 'epi', 'gest1', 'spub'], topics: ['ejecución y evaluación de intervenciones comunitarias'] },
      { id: 'adulto2', name: 'Salud y Morbilidad del Adulto II', icon: '🫁', area: 'disciplinar', topics: ['EPOC y asma', 'neumonía', 'insuficiencia renal', 'ACV', 'insuficiencia cardíaca', 'TVP', 'cirrosis'] },
      { id: 'bioetica', name: 'Bioética', icon: '⚖️', area: 'profesional', topics: ['principios', 'adecuación del esfuerzo terapéutico', 'comités de ética', 'objeción de conciencia', 'Ley 20.584'] },
      { id: 'mayor', name: 'Salud del Adulto Mayor', icon: '👵', area: 'disciplinar', topics: ['EMPAM y EFAM', 'Barthel y Lawton', 'síndromes geriátricos', 'polifarmacia', 'delirium vs demencia'] },
      { id: 'gest2', name: 'Gestión y Administración en Enfermería II', icon: '📑', area: 'profesional', topics: ['calidad y seguridad', 'eventos adversos', 'acreditación', 'ciclo PDCA', 'dotación'] },
      { id: 'prac2', name: 'Práctica Integrada II', icon: '🏨', area: 'practico', mix: ['adulto2', 'mayor', 'farma', 'pae2', 'bioetica', 'gest1'], topics: ['integración clínica'] },
    ] },
    { n: 7, ramos: [
      { id: 'mental', name: 'Enfermería en Salud Mental', icon: '🧩', area: 'disciplinar', topics: ['riesgo suicida', 'esquizofrenia', 'depresión', 'litio', 'desescalamiento', 'Ley 21.331'] },
      { id: 'nino1', name: 'Salud del Niño y Adolescente I', icon: '🧸', area: 'disciplinar', topics: ['recién nacido', 'Apgar', 'ictericia', 'vacunas PNI', 'tamizaje neonatal', 'crecimiento y desarrollo'] },
      { id: 'urg', name: 'Enfermería en Urgencias', icon: '🚑', area: 'disciplinar', topics: ['categorización ESI', 'Glasgow', 'anafilaxia', 'quemaduras (regla de los 9)', 'ritmos de paro'] },
      { id: 'invest', name: 'Metodología de la Investigación', icon: '🔎', area: 'profesional', topics: ['pregunta PICO', 'hipótesis y variables', 'muestreo', 'enfoques cuantitativo y cualitativo', 'niveles de evidencia'] },
      { id: 'prac3', name: 'Práctica Integrada III', icon: '🏨', area: 'practico', mix: ['mental', 'nino1', 'urg', 'iaas', 'farma'], topics: ['integración clínica'] },
    ] },
    { n: 8, ramos: [
      { id: 'palia', name: 'Cuidados Paliativos Integrales', icon: '🕊️', area: 'disciplinar', topics: ['escalera analgésica OMS', 'opioides', 'vía subcutánea', 'ESAS', 'Ley 21.375', 'acompañamiento'] },
      { id: 'ocup', name: 'Salud Ocupacional y Ambiental', icon: '🦺', area: 'profesional', topics: ['Ley 16.744', 'accidente cortopunzante', 'EPP', 'mutualidades', 'vacuna hepatitis B'] },
      { id: 'nino2', name: 'Salud del Niño y Adolescente II', icon: '🧒', area: 'disciplinar', topics: ['IRA y bronquiolitis', 'score de Tal', 'fiebre y convulsión febril', 'deshidratación', 'salud adolescente'] },
      { id: 'iaas', name: 'Infecciones y Atención en Salud', icon: '🧼', area: 'disciplinar', topics: ['higiene de manos (5 momentos)', 'precauciones estándar y adicionales', 'prevención de ITU, NAVM e ITS', 'cortopunzantes'] },
      { id: 'semi', name: 'Seminario de Grado', icon: '🎓', area: 'profesional', mix: ['invest', 'bioest', 'epi'], topics: ['proyecto de investigación', 'análisis de datos', 'redacción científica'] },
      { id: 'prac4', name: 'Práctica Integrada IV', icon: '🏨', area: 'practico', mix: ['palia', 'nino2', 'iaas', 'ocup', 'urg'], topics: ['integración clínica'] },
    ] },
    { n: 9, ramos: [
      { id: 'sva', name: 'Soporte Vital Avanzado para Personal de Salud', icon: '⚡', area: 'disciplinar', topics: ['algoritmo de paro', 'adrenalina y amiodarona', '5H y 5T', 'bradicardia y taquicardia', 'capnografía'] },
      { id: 'int1', name: 'Internado I', icon: '🏥', area: 'practico', mix: ['adulto1', 'adulto2', 'urg', 'sva', 'farma', 'iaas', 'mayor'], topics: ['internado clínico hospitalario'] },
    ] },
    { n: 10, ramos: [
      { id: 'examen', name: 'Preparación Examen de Título', icon: '🏆', area: 'profesional', mix: ['pae1', 'pae2', 'farma', 'fisiopat', 'adulto1', 'adulto2', 'mayor', 'mental', 'nino1', 'nino2', 'urg', 'iaas', 'sva', 'palia', 'spub', 'epi', 'gest2', 'bioetica'], topics: ['repaso integral de la carrera'] },
      { id: 'int2', name: 'Internado II', icon: '🏥', area: 'practico', mix: ['nino1', 'nino2', 'mental', 'comu2', 'gest2', 'palia', 'spub'], topics: ['internado en APS y áreas especializadas'] },
    ] },
  ],
};
// Índice rápido por id
window.RAMOS = {};
MALLA.semestres.forEach(s => s.ramos.forEach(r => { r.sem = s.n; RAMOS[r.id] = r; }));
