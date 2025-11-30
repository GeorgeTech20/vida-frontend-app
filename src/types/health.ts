export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  image: string;
}

export interface Appointment {
  id: string;
  doctor: Doctor;
  date: string;
  time: string;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'misha';
  timestamp: Date;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  surname: string | null;
  dni: string | null;
  birth_date: string | null;
  height: number | null;
  weight: number | null;
  gender: string | null;
  phone: string | null;
  patient_main: string | null;
  patient_active: string | null;
  avatar_url: string | null;
}

export interface Patient {
  id: string;
  user_id: string;
  dni: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  height: number | null;
  weight: number | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
}
