import { useState } from 'react';
import { ArrowLeft, Share2, Star } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { doctors } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const timeSlots = [
  '8:00 AM', '9:30 AM', '10:00 AM',
  '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '2:00 PM',
];

const DoctorProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const doctor = doctors.find(d => d.id === id) || doctors[0];

  const [selectedDate, setSelectedDate] = useState(24);
  const [selectedTime, setSelectedTime] = useState('9:30 AM');

  // Generate dates for current week
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return {
      day: date.toLocaleDateString('es-ES', { weekday: 'short' }),
      date: date.getDate(),
    };
  });

  const handleBookAppointment = () => {
    toast({
      title: "¡Cita agendada!",
      description: `Tu cita con ${doctor.name} ha sido confirmada para el día ${selectedDate} a las ${selectedTime}.`,
    });
    navigate('/');
  };

  return (
    <MobileLayout>
      <div className="min-h-screen pb-6">
        {/* Header with Image */}
        <div className="relative h-72 bg-gradient-to-b from-primary/20 to-background">
          <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-card/80 backdrop-blur rounded-full hover:bg-card transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <button className="p-2 bg-card/80 backdrop-blur rounded-full hover:bg-card transition-colors">
              <Share2 className="w-5 h-5 text-foreground" />
            </button>
          </div>

          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
            <div className="relative">
              <img
                src={doctor.image}
                alt={doctor.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-lg"
              />
              <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 bg-card rounded-full shadow">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-semibold text-foreground">{doctor.rating}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Doctor Info */}
        <div className="px-4 pt-20 text-center">
          <h1 className="text-2xl font-bold text-foreground">{doctor.name}</h1>
          <p className="text-muted-foreground mt-1">{doctor.specialty}</p>
        </div>

        {/* Date Selection */}
        <div className="px-4 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Seleccionar Fecha</h2>
            <p className="text-sm text-muted-foreground">Noviembre 2025</p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {dates.map((item) => (
              <button
                key={item.date}
                onClick={() => setSelectedDate(item.date)}
                className={cn(
                  "flex flex-col items-center min-w-[48px] py-3 px-2 rounded-xl transition-colors",
                  selectedDate === item.date
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground hover:bg-accent"
                )}
              >
                <span className="text-xs capitalize">{item.day}</span>
                <span className="text-lg font-semibold mt-1">{item.date}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time Selection */}
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Seleccionar Hora</h2>
            <p className="text-sm text-muted-foreground">{timeSlots.length} Slots</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((time) => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={cn(
                  "py-3 px-2 rounded-xl text-sm font-medium transition-colors",
                  selectedTime === time
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground hover:bg-accent"
                )}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* Book Button */}
        <div className="px-4 mt-8">
          <Button
            onClick={handleBookAppointment}
            className="w-full py-6 text-base font-semibold rounded-2xl"
          >
            Agendar Cita
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default DoctorProfile;
