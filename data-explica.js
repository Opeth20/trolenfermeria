// "Explícalo en voz alta" (técnica Feynman): explica el concepto como si se lo enseñaras a un amigo.
// k: grupos de ideas clave; en cada grupo basta con mencionar una de las palabras.
window.EXPLICA = {
  histo: [
    { p: 'Explica cómo se clasifica el tejido epitelial de revestimiento, con ejemplos.', k: [['simple'], ['estratificado'], ['plano', 'escamoso', 'cubico', 'cilindrico'], ['pseudoestratificado', 'transicional'], ['avascular', 'membrana basal']] },
    { p: 'Explica qué pasa desde la fecundación hasta la gastrulación.', k: [['ampolla', 'trompa'], ['cigoto'], ['morula', 'blastocisto'], ['implantacion'], ['bilaminar', 'epiblasto'], ['tres capas', 'ectodermo', 'mesodermo', 'endodermo']] },
    { p: 'Compara los tres tipos de cartílago.', k: [['hialino'], ['elastico'], ['fibrocartilago', 'fibroso'], ['colageno'], ['pericondrio'], ['avascular', 'difusion']] },
    { p: 'Explica las células del tejido nervioso y su función.', k: [['neurona'], ['axon', 'dendrita'], ['oligodendrocito', 'schwann', 'mielina'], ['astrocito'], ['microglia', 'fagocit']] },
  ],
  bio: [
    { p: 'Explica cómo obtiene energía la célula.', k: [['mitocondria'], ['atp'], ['glucosa'], ['oxigeno', 'aerobica', 'respiracion celular']] },
    { p: 'Explica qué es la osmosis y qué le pasa a un glóbulo rojo en agua pura.', k: [['agua'], ['membrana'], ['concentracion', 'gradiente'], ['hinchar', 'hincha', 'lisis', 'revienta', 'hemolisis']] },
  ],
  morfo: [
    { p: 'Explica el recorrido de la sangre por el corazón.', k: [['auricula'], ['ventriculo'], ['pulmon', 'pulmonar'], ['aorta', 'sistemica', 'cuerpo'], ['valvula', 'mitral', 'tricuspide']] },
  ],
  paux: [
    { p: 'Explica qué haces si encuentras a un adulto que no responde en la calle.', k: [['seguridad', 'seguro', 'escena'], ['responde', 'estimulo', 'llamar'], ['131', 'samu', 'ayuda'], ['respira', 'respiracion'], ['compresiones', 'rcp'], ['dea', 'desfibrilador']] },
    { p: 'Explica cómo tratas una quemadura leve y qué no debes hacer.', k: [['agua'], ['20 minutos', 'minutos', 'enfriar'], ['hielo'], ['ampollas'], ['cubrir', 'aposito', 'limpio']] },
  ],
  intro: [
    { p: 'Explica qué es la gestión del cuidado y por qué es propia de la enfermera en Chile.', k: [['codigo sanitario', '113'], ['cuidado'], ['promocion', 'prevencion'], ['autonom', 'propia', 'independiente']] },
  ],
  quim: [
    { p: 'Explica cómo actúan las enzimas y qué es la energía de activación.', k: [['energia de activacion'], ['catalizador', 'acelera', 'velocidad'], ['sitio activo', 'sustrato'], ['no se consume', 'no se gasta', 'reutiliza']] },
    { p: 'Compara la glucólisis con la gluconeogénesis.', k: [['citoplasma', 'citosol'], ['piruvato'], ['glucosa'], ['catabol', 'degrada'], ['anabol', 'sintetiza', 'forma glucosa'], ['glucagon', 'ayuno'], ['insulina']] },
    { p: 'Explica qué pasa con el piruvato cuando hay oxígeno: Krebs y cadena respiratoria.', k: [['acetil'], ['mitocondria', 'matriz'], ['nadh', 'fadh'], ['oxigeno', 'aceptor'], ['atp sintasa', 'gradiente', 'protones'], ['co2']] },
    { p: 'Explica qué es la desnaturalización de una proteína y qué la produce.', k: [['estructura primaria', 'primaria se mantiene', 'primaria se conserva'], ['secundaria', 'terciaria'], ['temperatura', 'fiebre', 'calor'], ['ph'], ['funcion', 'pierde']] },
    { p: 'Explica qué es el pH sanguíneo y cómo se mantiene estable.', k: [['7 35', '7 45', 'normal'], ['amortiguador', 'buffer', 'tampon'], ['bicarbonato'], ['pulmon', 'co2', 'respiracion'], ['riñon', 'renal']] },
  ],
  etica: [
    { p: 'Explica la diferencia entre actuar sobre, para y con la comunidad.', k: [['sobre', 'impone', 'define'], ['para', 'decide por'], ['con', 'en conjunto', 'construye'], ['autonomia', 'voz'], ['dignidad', 'reconoc']] },
    { p: 'Explica qué significa participar como pares según Nancy Fraser.', k: [['fraser'], ['redistribucion', 'recursos'], ['reconocimiento'], ['paridad', 'pares', 'igualdad de condiciones'], ['barrera', 'horario', 'transporte', 'idioma']] },
    { p: 'Explica los niveles de participación en salud y la corresponsabilidad.', k: [['informativa', 'informar'], ['consultiva', 'consultar'], ['resolutiva', 'decide', 'control'], ['corresponsabilidad'], ['poder']] },
    { p: 'Explica la ética de la alteridad según Levinas, Ricœur y Dussel.', k: [['otro', 'alteridad'], ['levinas', 'rostro', 'responsabilidad'], ['ricoeur', 'instituciones justas', 'vida buena'], ['dussel', 'excluido', 'liberacion']] },
    { p: 'Explica los cuatro principios de la bioética con un ejemplo.', k: [['autonomia'], ['beneficencia'], ['no maleficencia', 'no dañar'], ['justicia']] },
    { p: 'Explica qué es el consentimiento informado.', k: [['informacion', 'informar'], ['voluntari', 'libre'], ['autonomia', 'decidir'], ['riesgo'], ['20 584', 'ley']] },
  ],
  vida: [
    { p: 'Explica la diferencia entre asepsia, antisepsia, desinfección y esterilización.', k: [['asepsia'], ['antisep', 'piel', 'tejido vivo'], ['desinfec', 'objeto', 'inanimado'], ['esteriliz', 'esporas', 'todos los microorganismos']] },
    { p: 'Explica la metodología Humanitude y sus pilares.', k: [['gineste', 'marescotti'], ['mirada'], ['palabra', 'hablar'], ['tacto', 'toque'], ['verticalidad', 'de pie']] },
    { p: 'Explica cómo valora el modelo de Inés Astorquiza.', k: [['necesidad'], ['biologic', 'psicologic', 'social', 'espiritual'], ['mecanismo de produccion', 'produccion'], ['expresion', 'indicador'], ['satisfaccion', 'requerimiento'], ['satisfecho', 'insatisfecho', 'alterado']] },
    { p: 'Explica cómo debe ser el control de salud de un adolescente.', k: [['confidencial'], ['a solas', 'sin acompañante', 'privacidad'], ['heeadsss', 'riesgo'], ['tanner', 'crecimiento'], ['suicid', 'abuso', 'vulneracion']] },
    { p: 'Explica por qué se recomienda la lactancia materna exclusiva y hasta cuándo.', k: [['6 meses', 'seis meses'], ['anticuerpos', 'inmun', 'defensas'], ['vinculo', 'apego'], ['nutri']] },
  ],
  spub: [
    { p: 'Explica los tres niveles de prevención con un ejemplo de cada uno.', k: [['primaria'], ['secundaria'], ['terciaria'], ['vacuna', 'promocion'], ['deteccion', 'precoz', 'tamizaje', 'examen'], ['rehabilita', 'secuela']] },
    { p: 'Explica qué es el GES y qué garantiza.', k: [['garantias explicitas', 'auge'], ['acceso'], ['oportunidad'], ['proteccion financiera'], ['calidad']] },
  ],
  fisio: [
    { p: 'Explica cómo se regula la presión arterial.', k: [['gasto cardiaco', 'frecuencia cardiaca'], ['resistencia', 'vasoconstric'], ['riñon', 'renal', 'renina', 'aldosterona'], ['simpatico', 'barorreceptor']] },
    { p: 'Explica cómo la insulina y el glucagón controlan la glicemia.', k: [['insulina'], ['glucagon'], ['pancreas'], ['baja', 'disminuye'], ['sube', 'aumenta'], ['higado', 'glucogeno']] },
  ],
  micro: [
    { p: 'Explica la diferencia entre limpieza, desinfección y esterilización.', k: [['limpieza', 'suciedad', 'materia organica'], ['desinfeccion'], ['esterilizacion'], ['esporas']] },
  ],
  pae1: [
    { p: 'Explica las etapas del Proceso de Atención de Enfermería.', k: [['valoracion'], ['diagnostico'], ['planificacion'], ['ejecucion'], ['evaluacion']] },
    { p: 'Explica cómo se redacta un diagnóstico NANDA real.', k: [['etiqueta', 'problema'], ['relacionado', 'r c'], ['manifestado', 'm p', 'caracteristicas definitorias']] },
  ],
  farma: [
    { p: 'Explica los correctos de la administración de medicamentos.', k: [['paciente'], ['medicamento', 'farmaco'], ['dosis'], ['via'], ['hora', 'horario'], ['registro', 'registrar']] },
    { p: 'Explica qué es la farmacocinética.', k: [['absorcion'], ['distribucion'], ['metabolismo'], ['excrecion', 'eliminacion']] },
  ],
  fisiopat: [
    { p: 'Explica qué pasa en el cuerpo en un shock hipovolémico.', k: [['volumen', 'sangre', 'hemorragia'], ['hipotension', 'presion'], ['taquicardia'], ['perfusion', 'oxigeno'], ['frio', 'palido', 'llene capilar']] },
  ],
  comu2: [
    { p: 'Explica para qué sirven el genograma y el ecomapa.', k: [['genograma'], ['ecomapa'], ['familia'], ['generaciones'], ['redes', 'entorno', 'recursos']] },
  ],
  pae2: [
    { p: 'Explica cómo priorizas los problemas de un paciente.', k: [['via aerea'], ['respiracion'], ['circulacion'], ['riesgo vital', 'vida'], ['maslow', 'necesidades']] },
  ],
  adulto1: [
    { p: 'Explica cómo reconoces y tratas una hipoglicemia.', k: [['70'], ['sudoracion', 'temblor', 'confusion'], ['15 gramos', 'azucar', 'carbohidratos'], ['15 minutos', 'controlar'], ['glucagon', 'glucosa endovenosa', 'inconsciente']] },
  ],
  epi: [
    { p: 'Explica la diferencia entre incidencia y prevalencia.', k: [['incidencia'], ['prevalencia'], ['nuevos'], ['existentes', 'totales', 'antiguos'], ['periodo', 'momento']] },
  ],
  edu: [
    { p: 'Explica cómo harías una educación sobre autocontrol de la diabetes.', k: [['objetivo'], ['necesidades', 'conocimientos previos'], ['lenguaje', 'simple'], ['demostracion', 'practica'], ['teach back', 'repita', 'evaluar']] },
  ],
  adulto2: [
    { p: 'Explica los cuidados de enfermería de un paciente con EPOC descompensado.', k: [['oxigeno'], ['88', '92', 'saturacion'], ['broncodilatador', 'salbutamol'], ['posicion', 'fowler', 'semisentado'], ['signos de alarma', 'conciencia', 'co2']] },
  ],
  bioetica: [
    { p: 'Explica qué es la adecuación del esfuerzo terapéutico.', k: [['desproporcionado', 'futil', 'no beneficio'], ['retirar', 'no iniciar'], ['cuidados', 'confort', 'sintomas'], ['familia', 'decision', 'compartida']] },
  ],
  mayor: [
    { p: 'Explica qué son los síndromes geriátricos y da ejemplos.', k: [['caidas'], ['incontinencia'], ['deterioro cognitivo', 'demencia', 'delirium'], ['polifarmacia'], ['inmovilidad']] },
  ],
  gest2: [
    { p: 'Explica qué es un evento adverso y qué haces si ocurre.', k: [['daño'], ['atencion', 'no intencional'], ['notificar', 'notificacion'], ['no punitiva', 'aprender'], ['paciente', 'informar']] },
  ],
  mental: [
    { p: 'Explica cómo evalúas el riesgo suicida de un paciente.', k: [['preguntar', 'directamente'], ['plan'], ['intentos previos', 'antecedentes'], ['medios', 'acceso'], ['red de apoyo', 'familia'], ['derivar', 'urgencia']] },
  ],
  nino1: [
    { p: 'Explica cómo se evalúa el Apgar.', k: [['minuto 1', 'primer minuto', 'minuto 5', 'cinco minutos'], ['frecuencia cardiaca'], ['respiratorio', 'respiracion'], ['tono'], ['irritabilidad', 'reflejo'], ['color']] },
  ],
  urg: [
    { p: 'Explica la evaluación primaria de un paciente politraumatizado.', k: [['via aerea'], ['columna', 'cervical'], ['respiracion', 'ventilacion'], ['circulacion', 'hemorragia'], ['neurologico', 'glasgow'], ['exposicion', 'hipotermia']] },
  ],
  palia: [
    { p: 'Explica la escalera analgésica de la OMS.', k: [['tres', '3'], ['no opioide', 'paracetamol', 'aine'], ['opioide debil', 'tramadol', 'codeina'], ['opioide potente', 'morfina'], ['coadyuvante']] },
  ],
  iaas: [
    { p: 'Explica los 5 momentos de la higiene de manos.', k: [['antes del contacto', 'antes de tocar'], ['tarea aseptica', 'procedimiento limpio'], ['fluidos'], ['despues del contacto', 'despues de tocar'], ['entorno']] },
    { p: 'Explica las precauciones por gotitas, aire y contacto con ejemplos.', k: [['gotitas'], ['aire', 'aerea'], ['contacto'], ['mascarilla', 'n95', 'respirador'], ['influenza', 'tuberculosis', 'sarampion']] },
  ],
  sva: [
    { p: 'Explica el algoritmo de paro en fibrilación ventricular.', k: [['rcp', 'compresiones'], ['descarga', 'desfibril'], ['adrenalina'], ['amiodarona'], ['2 minutos', 'ciclos'], ['causas reversibles', '5h', 'h y t']] },
  ],
};
