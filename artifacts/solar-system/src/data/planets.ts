export interface SatelliteData {
  id: string;
  name: string;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  color: string;
  isArtificial?: boolean;
  description: string;
}

export interface PlanetData {
  id: string;
  name: string;
  radius: number;
  distance: number;
  orbitSpeed: number;
  rotationSpeed: number;
  color: string;
  emissive?: string;
  atmosphereColor?: string;
  description: string;
  realDistance: string;
  realDiameter: string;
  moonsCount: number;
  fact: string;
  satellites: SatelliteData[];
  hasRings?: boolean;
  ringInner?: number;
  ringOuter?: number;
  ringColor?: string;
  ringOpacity?: number;
  tilt?: number;
  textureType: 'solid' | 'stripes' | 'rocky' | 'gas' | 'ice';
  stripeColors?: string[];
}

export const PLANETS: PlanetData[] = [
  {
    id: 'mercury',
    name: 'Mercurio',
    radius: 0.35,
    distance: 9,
    orbitSpeed: 0.48,
    rotationSpeed: 0.017,
    color: '#b5b5b5',
    emissive: '#222222',
    description: 'El planeta más pequeño y cercano al Sol. Su superficie está cubierta de cráteres y experimenta temperaturas extremas: 430°C de día y -180°C de noche.',
    realDistance: '57.9 millones de km',
    realDiameter: '4,879 km',
    moonsCount: 0,
    fact: 'Un año en Mercurio dura solo 88 días terrestres.',
    satellites: [],
    textureType: 'rocky',
  },
  {
    id: 'venus',
    name: 'Venus',
    radius: 0.65,
    distance: 14,
    orbitSpeed: 0.35,
    rotationSpeed: -0.004,
    color: '#e8c47a',
    emissive: '#3a2a00',
    atmosphereColor: '#f5deb3',
    description: 'El planeta más caliente del Sistema Solar con temperaturas que alcanzan los 465°C. Su densa atmósfera de CO₂ produce un efecto invernadero extremo.',
    realDistance: '108.2 millones de km',
    realDiameter: '12,104 km',
    moonsCount: 0,
    fact: 'Venus rota en sentido contrario al resto de los planetas.',
    satellites: [],
    textureType: 'solid',
  },
  {
    id: 'earth',
    name: 'Tierra',
    radius: 0.72,
    distance: 20,
    orbitSpeed: 0.29,
    rotationSpeed: 0.73,
    color: '#2e7fc1',
    emissive: '#001a33',
    atmosphereColor: '#4fc3f7',
    description: 'Nuestro hogar. El único planeta conocido con vida, con agua líquida en su superficie y una atmósfera que protege toda forma de vida.',
    realDistance: '149.6 millones de km',
    realDiameter: '12,742 km',
    moonsCount: 1,
    fact: 'La Tierra es el planeta con mayor densidad del Sistema Solar.',
    satellites: [
      {
        id: 'luna',
        name: 'Luna',
        radius: 0.2,
        orbitRadius: 1.8,
        orbitSpeed: 1.0,
        color: '#aaaaaa',
        isArtificial: false,
        description: 'El único satélite natural de la Tierra. Estabiliza el eje de rotación terrestre y genera las mareas.',
      },
      {
        id: 'iss',
        name: 'ISS',
        radius: 0.06,
        orbitRadius: 1.15,
        orbitSpeed: 15.0,
        color: '#e0e0ff',
        isArtificial: true,
        description: 'Estación Espacial Internacional. Laboratorio orbital que orbita a 408 km de altitud a 27,600 km/h.',
      },
      {
        id: 'hubble',
        name: 'Hubble',
        radius: 0.055,
        orbitRadius: 1.22,
        orbitSpeed: 12.5,
        color: '#c8d8f0',
        isArtificial: true,
        description: 'Telescopio Espacial Hubble. Observatorio orbital que ha revolucionado nuestra comprensión del universo desde 1990.',
      },
      {
        id: 'arsat1',
        name: 'ARSAT-1',
        radius: 0.05,
        orbitRadius: 2.5,
        orbitSpeed: 0.29,
        color: '#ffd700',
        isArtificial: true,
        description: 'Primer satélite geoestacionario argentino. Lanzado en 2014, provee servicios de telecomunicaciones para Sudamérica.',
      },
    ],
    textureType: 'solid',
  },
  {
    id: 'mars',
    name: 'Marte',
    radius: 0.48,
    distance: 28,
    orbitSpeed: 0.24,
    rotationSpeed: 0.71,
    color: '#c1440e',
    emissive: '#3a1000',
    description: 'El planeta rojo. Hogar del Monte Olimpo, el volcán más alto del Sistema Solar (21 km). Posee una delgada atmósfera de CO₂.',
    realDistance: '227.9 millones de km',
    realDiameter: '6,779 km',
    moonsCount: 2,
    fact: 'Un día en Marte (sol) dura 24 horas y 37 minutos, similar a la Tierra.',
    satellites: [
      {
        id: 'fobos',
        name: 'Fobos',
        radius: 0.1,
        orbitRadius: 1.2,
        orbitSpeed: 3.5,
        color: '#888888',
        description: 'El satélite más grande de Marte. Orbita tan cerca que algún día será destruido por las fuerzas gravitacionales.',
      },
      {
        id: 'deimos',
        name: 'Deimos',
        radius: 0.07,
        orbitRadius: 1.8,
        orbitSpeed: 1.8,
        color: '#999999',
        description: 'El satélite más pequeño de Marte. Tiene una órbita más estable y se aleja lentamente del planeta.',
      },
    ],
    textureType: 'rocky',
  },
  {
    id: 'jupiter',
    name: 'Júpiter',
    radius: 1.8,
    distance: 44,
    orbitSpeed: 0.13,
    rotationSpeed: 1.77,
    color: '#c88b3a',
    emissive: '#2a1a00',
    description: 'El planeta más grande del Sistema Solar, una gigante gaseosa. Su Gran Mancha Roja es una tormenta que lleva más de 350 años activa.',
    realDistance: '778.5 millones de km',
    realDiameter: '139,820 km',
    moonsCount: 95,
    fact: 'Júpiter tiene más de el doble de masa que todos los demás planetas juntos.',
    satellites: [
      {
        id: 'io',
        name: 'Io',
        radius: 0.18,
        orbitRadius: 2.8,
        orbitSpeed: 2.0,
        color: '#ffcc44',
        description: 'El cuerpo geológicamente más activo del Sistema Solar, cubierto de volcanes activos.',
      },
      {
        id: 'europa',
        name: 'Europa',
        radius: 0.15,
        orbitRadius: 3.5,
        orbitSpeed: 1.4,
        color: '#d4c9a8',
        description: 'Luna de Júpiter con un océano de agua líquida bajo su superficie helada. Candidato a albergar vida.',
      },
      {
        id: 'ganymede',
        name: 'Ganímedes',
        radius: 0.24,
        orbitRadius: 4.5,
        orbitSpeed: 0.9,
        color: '#a0987a',
        description: 'El satélite natural más grande del Sistema Solar, más grande que el planeta Mercurio.',
      },
      {
        id: 'callisto',
        name: 'Calisto',
        radius: 0.22,
        orbitRadius: 5.5,
        orbitSpeed: 0.5,
        color: '#7a7060',
        description: 'La luna más craterizada del Sistema Solar. Orbita fuera del cinturón de radiación de Júpiter.',
      },
    ],
    textureType: 'stripes',
    stripeColors: ['#c88b3a', '#e8a84a', '#a87030', '#d4a060', '#b87828', '#e8b84a', '#9a6020'],
  },
  {
    id: 'saturn',
    name: 'Saturno',
    radius: 1.5,
    distance: 62,
    orbitSpeed: 0.096,
    rotationSpeed: 1.65,
    color: '#e8d5a3',
    emissive: '#2a2010',
    description: 'Famoso por sus espectaculares anillos de hielo y roca. Es el único planeta del Sistema Solar menos denso que el agua.',
    realDistance: '1,432 millones de km',
    realDiameter: '116,460 km',
    moonsCount: 146,
    fact: 'Los anillos de Saturno tienen 270,000 km de diámetro pero solo 100 m de grosor.',
    satellites: [
      {
        id: 'titan',
        name: 'Titán',
        radius: 0.22,
        orbitRadius: 3.5,
        orbitSpeed: 0.9,
        color: '#d4a030',
        description: 'La luna más grande de Saturno. Posee una densa atmósfera de nitrógeno y lagos de metano líquido.',
      },
      {
        id: 'enceladus',
        name: 'Encélado',
        radius: 0.12,
        orbitRadius: 2.5,
        orbitSpeed: 2.5,
        color: '#e8e8ff',
        description: 'Luna de Saturno que expulsa géiseres de vapor de agua al espacio. Tiene un océano subsuperficial.',
      },
      {
        id: 'rhea',
        name: 'Rea',
        radius: 0.15,
        orbitRadius: 4.5,
        orbitSpeed: 0.55,
        color: '#cccccc',
        description: 'La segunda luna más grande de Saturno, cubierta de hielo y cráteres.',
      },
    ],
    hasRings: true,
    ringInner: 2.0,
    ringOuter: 3.5,
    ringColor: '#c8b887',
    ringOpacity: 0.7,
    tilt: 0.47,
    textureType: 'stripes',
    stripeColors: ['#e8d5a3', '#d4bf88', '#f0e0b8', '#c8b073', '#e0cc98'],
  },
  {
    id: 'uranus',
    name: 'Urano',
    radius: 1.1,
    distance: 78,
    orbitSpeed: 0.068,
    rotationSpeed: -1.04,
    color: '#7de8e8',
    emissive: '#002a2a',
    atmosphereColor: '#a0f0f0',
    description: 'El planeta de hielo más frío del Sistema Solar (-224°C). Rota de lado con una inclinación axial de 98°, probablemente por un impacto antiguo.',
    realDistance: '2,867 millones de km',
    realDiameter: '50,724 km',
    moonsCount: 28,
    fact: 'Urano tarda 84 años terrestres en dar una vuelta completa al Sol.',
    satellites: [
      {
        id: 'miranda',
        name: 'Miranda',
        radius: 0.1,
        orbitRadius: 2.0,
        orbitSpeed: 2.8,
        color: '#b0c0d0',
        description: 'La luna más pequeña de las principales de Urano. Tiene un terreno caótico y acantilados de 20 km.',
      },
      {
        id: 'ariel',
        name: 'Ariel',
        radius: 0.14,
        orbitRadius: 2.8,
        orbitSpeed: 1.8,
        color: '#c8d0d8',
        description: 'Una de las lunas más brillantes de Urano, con extensos valles y cañones.',
      },
    ],
    textureType: 'ice',
    tilt: 1.71,
  },
  {
    id: 'neptune',
    name: 'Neptuno',
    radius: 1.05,
    distance: 94,
    orbitSpeed: 0.054,
    rotationSpeed: 1.14,
    color: '#3f54ba',
    emissive: '#000a30',
    atmosphereColor: '#6080ff',
    description: 'El planeta más alejado del Sol, con los vientos más veloces del Sistema Solar (hasta 2,100 km/h). Su Gran Mancha Oscura es una tormenta masiva.',
    realDistance: '4,515 millones de km',
    realDiameter: '49,244 km',
    moonsCount: 16,
    fact: 'Neptuno tarda 165 años terrestres en completar una órbita alrededor del Sol.',
    satellites: [
      {
        id: 'triton',
        name: 'Tritón',
        radius: 0.18,
        orbitRadius: 2.5,
        orbitSpeed: -1.4,
        color: '#d0c8c0',
        description: 'La única luna grande con órbita retrógrada. Se mueve en sentido contrario a la rotación de Neptuno.',
      },
      {
        id: 'nereid',
        name: 'Nereida',
        radius: 0.08,
        orbitRadius: 4.0,
        orbitSpeed: 0.6,
        color: '#b0b0b0',
        description: 'La tercera luna más grande de Neptuno, con una de las órbitas más excéntricas del Sistema Solar.',
      },
    ],
    textureType: 'gas',
  },
];

export const SUN_DATA = {
  radius: 3.0,
  color: '#FDB813',
  emissive: '#FF8C00',
  description: 'La estrella central de nuestro Sistema Solar. Una esfera de plasma ardiente compuesta principalmente de hidrógeno (73%) y helio (25%).',
  realDiameter: '1,392,700 km',
  temperature: '5,500°C (superficie) / 15,000,000°C (núcleo)',
  age: '4,600 millones de años',
  fact: 'El Sol contiene el 99.86% de toda la masa del Sistema Solar.',
};
