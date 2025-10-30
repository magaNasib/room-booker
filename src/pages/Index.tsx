import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RoomCard } from "@/components/RoomCard";
import { Calendar, Users } from "lucide-react";

const Index = () => {
  const { data: rooms, isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, rooms(name), squads(name)")
        .gte("end_time", new Date().toISOString())
        .order("start_time");
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading rooms...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-8 h-8 text-primary" />
                Room Booking
              </h1>
              <p className="text-muted-foreground mt-1">Select a room to view availability and book</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>10 Squads</span>
            </div>
          </div>
        </div>
      </header>

      {/* Rooms Grid */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {rooms?.map((room) => (
            <RoomCard key={room.id} room={room} bookings={bookings} />
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid md:grid-cols-3 gap-4">
          <div className="bg-card border rounded-lg p-6">
            <div className="text-2xl font-bold text-foreground">{rooms?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Total Rooms</div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="text-2xl font-bold text-foreground">
              {bookings?.filter(b => new Date(b.start_time) <= new Date() && new Date(b.end_time) >= new Date()).length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Currently Active</div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="text-2xl font-bold text-foreground">
              {bookings?.filter(b => new Date(b.start_time) > new Date()).length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Upcoming Bookings</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
