import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RoomCard } from "@/components/RoomCard";
import { Loader2, CalendarDays, Users, Clock, LogOut, Shield, Repeat } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { Session } from "@supabase/supabase-js";

const TIMEZONE = "Asia/Baku";

const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single()
        .then(({ data }) => {
          setIsAdmin(data?.role === "admin");
        });
    } else {
      setIsAdmin(false);
    }
  }, [session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const { data: rooms, isLoading: roomsLoading } = useQuery({
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

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          room:rooms(name, color)
        `
        )
        .gte("end_time", new Date().toISOString())
        .order("start_time");

      if (error) throw error;
      
      // Group recurring bookings
      const grouped: any[] = [];
      const processed = new Set<string>();
      
      data?.forEach((booking) => {
        if (processed.has(booking.id)) return;
        
        // Find similar bookings (same room, booker, time)
        const startTime = toZonedTime(new Date(booking.start_time), TIMEZONE);
        const endTime = toZonedTime(new Date(booking.end_time), TIMEZONE);
        const timeKey = `${startTime.getHours()}:${startTime.getMinutes()}-${endTime.getHours()}:${endTime.getMinutes()}`;
        
        const similarBookings = data.filter((b) => {
          const bStart = toZonedTime(new Date(b.start_time), TIMEZONE);
          const bEnd = toZonedTime(new Date(b.end_time), TIMEZONE);
          const bTimeKey = `${bStart.getHours()}:${bStart.getMinutes()}-${bEnd.getHours()}:${bEnd.getMinutes()}`;
          
          return (
            b.room_id === booking.room_id &&
            b.booker_name === booking.booker_name &&
            bTimeKey === timeKey
          );
        });
        
        if (similarBookings.length > 3) {
          // This is a recurring series - get unique weekdays
          const weekdays = new Set<number>();
          similarBookings.forEach((b) => {
            const date = toZonedTime(new Date(b.start_time), TIMEZONE);
            weekdays.add(date.getDay());
          });
          
          grouped.push({
            ...booking,
            isRecurring: true,
            recurringCount: similarBookings.length,
            weekdays: Array.from(weekdays).sort(),
            start_time: similarBookings[0].start_time,
            end_time: similarBookings[similarBookings.length - 1].end_time,
          });
          similarBookings.forEach((b) => processed.add(b.id));
        } else {
          grouped.push(booking);
          processed.add(booking.id);
        }
      });
      
      return grouped;
    },
  });

  if (roomsLoading || bookingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Room Booking
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl">
                View available rooms and current bookings. Only admins can create bookings.
              </p>
            </div>
            <div className="flex gap-2">
              {session ? (
                <>
                  {isAdmin && (
                    <Button onClick={() => navigate("/admin")} variant="outline" className="gap-2">
                      <Shield className="w-4 h-4" />
                      Admin Panel
                    </Button>
                  )}
                  <Button onClick={handleSignOut} variant="outline" className="gap-2">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button onClick={() => navigate("/auth")}>Sign In</Button>
              )}
            </div>
          </div>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-card rounded-xl shadow-lg p-6 border border-primary/10">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <CalendarDays className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Rooms</p>
                <p className="text-2xl font-bold">{rooms?.length || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-lg p-6 border border-success/10">
            <div className="flex items-center gap-4">
              <div className="bg-success/10 p-3 rounded-lg">
                <Users className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Bookings</p>
                <p className="text-2xl font-bold">
                  {bookings?.filter(
                    (b: any) =>
                      new Date(b.start_time) <= new Date() &&
                      new Date(b.end_time) >= new Date()
                  ).length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-lg p-6 border border-warning/10">
            <div className="flex items-center gap-4">
              <div className="bg-warning/10 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">
                  {bookings?.filter(
                    (b: any) => new Date(b.start_time) > new Date()
                  ).length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rooms Grid */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Available Rooms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms?.map((room: any) => {
              const roomBookings = bookings?.filter(
                (booking: any) => booking.room_id === room.id
              );
              return (
                <RoomCard
                  key={room.id}
                  room={room}
                  bookings={roomBookings || []}
                />
              );
            })}
          </div>
        </section>

        {/* All Bookings Table */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">All Bookings</h2>
          <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Booker</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings && bookings.length > 0 ? (
                  bookings.map((booking: any) => {
                    const now = new Date();
                    const startTime = new Date(booking.start_time);
                    const endTime = new Date(booking.end_time);
                    const isActive = !booking.isRecurring && startTime <= now && endTime >= now;
                    const isUpcoming = startTime > now;
                    
                    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

                    return (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: booking.room?.color }}
                            />
                            <span className="font-medium">{booking.room?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {booking.booker_name || "—"}
                            {booking.isRecurring && (
                              <Badge variant="secondary" className="gap-1">
                                <Repeat className="w-3 h-3" />
                                {booking.recurringCount}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {booking.isRecurring ? (
                            <div className="flex flex-wrap gap-1">
                              {booking.weekdays.map((day: number) => (
                                <Badge key={day} variant="outline" className="text-xs">
                                  {weekdayNames[day]}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm">
                              {format(startTime, "MMM dd, yyyy")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {booking.isRecurring ? (
                            <div>
                              {format(toZonedTime(new Date(booking.start_time), TIMEZONE), "HH:mm")} -{" "}
                              {format(toZonedTime(new Date(booking.start_time), TIMEZONE).setHours(
                                toZonedTime(new Date(booking.start_time), TIMEZONE).getHours() + 1
                              ), "HH:mm")}
                            </div>
                          ) : (
                            <div>
                              {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              isActive
                                ? "bg-success/10 text-success"
                                : isUpcoming || booking.isRecurring
                                ? "bg-warning/10 text-warning"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isActive ? "Active" : (isUpcoming || booking.isRecurring) ? "Upcoming" : "Past"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No bookings yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
