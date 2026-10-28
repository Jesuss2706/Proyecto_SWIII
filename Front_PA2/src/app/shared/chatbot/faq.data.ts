
export interface FaqLink {
  label: string;
  route: string;
  fragment?: string;
  guestOnly?: boolean;
}

export interface Faq {
  id: string;
  question: string;

  answer: string;
  link?: FaqLink;
}

export const WELCOME_MESSAGE =
  '¡Hola! Soy el asistente virtual de Piedra Azul. Elige una de las preguntas frecuentes y te respondo al instante.';


//preguntas frecuentes
export const FAQS: Faq[] = [
  {
    id: 'ubicacion',
    question: '¿Dónde están ubicados?',
    answer: 'Nuestra sede está en la Calle 5 # 12-34, Popayán, Cauca.',
  },
  {
    id: 'horarios',
    question: '¿Cuáles son los horarios de atención?',
    // revisar
    answer:
      'Atendemos de lunes a viernes, de 7:00 a. m. a 6:00 p. m.\n' +
      'El horario exacto depende de cada profesional; al agendar verás únicamente los espacios libres.',
  },
  {
    id: 'agendar',
    question: '¿Cómo agendo una cita?',
    answer:
      '1. Inicia sesión (o crea tu cuenta).\n' +
      '2. Ve a "Agendar cita" y verifica tu documento.\n' +
      '3. Confirma tus datos y elige el día y la hora disponibles.',
    link: { label: 'Agendar cita', route: '/agendar' },
  },
  {
    id: 'cancelar',
    question: '¿Cómo cancelo una cita?',
    answer:
      'Inicia sesión y entra a "Mis citas". Junto a la cita agendada verás el botón "Cancelar"; ' +
      'te pediremos confirmación antes de cancelarla.',
    link: { label: 'Ir a Mis citas', route: '/mis-citas' },
  },
  {
    id: 'reagendar',
    question: '¿Puedo cambiar el horario de mi cita?',
    answer:
      'Cancela la cita actual desde "Mis citas" y agenda una nueva en el horario que prefieras.',
    link: { label: 'Agendar nueva cita', route: '/agendar' },
  },
  {
    id: 'cuenta',
    question: '¿Necesito una cuenta para agendar?',
    answer:
      'Sí. Para agendar y consultar tus citas debes iniciar sesión. Si aún no tienes cuenta, el registro toma un minuto.',
    link: { label: 'Crear cuenta', route: '/registro', guestOnly: true},
  },
  {
    id: 'servicios',
    question: '¿Qué servicios ofrecen?',
    answer: 'Ofrecemos terapia neural, quiropraxia y fisioterapia.',
    link: { label: 'Ver servicios', route: '/', fragment: 'servicios' },
  },
  {
    id: 'contacto',
    question: '¿Cómo me comunico con ustedes?',
    answer: 'Puedes llamarnos al (602) 555 0192 o escribirnos a piedraAzul@piedraazul.co.',
  },
];