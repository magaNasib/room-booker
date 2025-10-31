import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, QrCode } from "lucide-react";
import { useEffect, useRef } from "react";
import QRCode from "qrcode";

const RoomDetail = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const queryClient = useQueryClient();
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ["room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["room-bookings", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("room_id", roomId)
        .gte("end_time", new Date().toISOString())
        .order("start_time");
      
      if (error) throw error;
      return data;
    },
  });


  // Generate QR code
  useEffect(() => {
    if (qrCanvasRef.current && roomId) {
      const url = window.location.href;
      QRCode.toCanvas(qrCanvasRef.current, url, { width: 200 });
    }
  }, [roomId]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`bookings-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["room-bookings", roomId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient]);

  if (roomLoading || bookingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading room details...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Room not found</h2>
          <Link to="/">
            <Button>Back to Rooms</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground">{room.name}</h1>
              <p className="text-muted-foreground mt-1">{room.description}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Bookings List */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Upcoming Bookings
                </CardTitle>
                <CardDescription>
                  View all bookings for this room. Only admins can create bookings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bookings && bookings.length > 0 ? (
                  <div className="space-y-2">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{booking.booker_name || "Anonymous"}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(booking.start_time).toLocaleString()} - {new Date(booking.end_time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No upcoming bookings</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* QR Code Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  QR Code
                </CardTitle>
                <CardDescription>
                  Scan to book this room
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <canvas ref={qrCanvasRef} className="border rounded-lg p-4" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Room Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Bookings</span>
                    <span className="font-semibold">{bookings?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available Slots</span>
                    <span className="font-semibold text-success">Open</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RoomDetail;
