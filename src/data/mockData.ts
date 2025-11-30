import { Doctor, Appointment } from '@/types/health';
import doctorMale from '@/assets/doctor-male.jpg';
import doctorFemale from '@/assets/doctor-female.jpg';

export const doctors: Doctor[] = [
  {
    id: '1',
    name: 'Dr. Carlos Mendez',
    specialty: 'Cardiología',
    rating: 4.9,
    reviews: 190,
    image: doctorMale,
  },
  {
    id: '2',
    name: 'Dra. Ana García',
    specialty: 'Dermatología',
    rating: 4.8,
    reviews: 156,
    image: doctorFemale,
  },
  {
    id: '3',
    name: 'Dr. Miguel Torres',
    specialty: 'Pediatría',
    rating: 4.7,
    reviews: 203,
    image: doctorMale,
  },
  {
    id: '4',
    name: 'Dra. Laura Sánchez',
    specialty: 'Neurología',
    rating: 4.9,
    reviews: 178,
    image: doctorFemale,
  },
];

export const appointments: Appointment[] = [
  {
    id: '1',
    doctor: doctors[0],
    date: '18 Nov, Lunes',
    time: '8pm - 8:30 pm',
  },
];

export const specialties = ['Todos', 'Cardiología', 'Dermatología', 'Pediatría', 'Neurología'];
