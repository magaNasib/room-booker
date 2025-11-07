import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, QrCode, Clock, TrendingUp } from "lucide-react";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TIMEZONE = "Asia/Baku";

const RoomDetail = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const queryClient = useQueryClient();
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

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


  // Generate QR code when dialog opens
  useEffect(() => {
    if (qrDialogOpen && qrCanvasRef.current && roomId) {
      // Small delay to ensure canvas is ready in DOM
      const timer = setTimeout(() => {
        const url = window.location.href;
        QRCode.toCanvas(qrCanvasRef.current, url, { 
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        }).catch(error => {
          console.error('QR Code generation failed:', error);
        });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [qrDialogOpen, roomId]);

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

  const now = new Date();
  const activeBookings = bookings?.filter(
    (b) => new Date(b.start_time) <= now && new Date(b.end_time) >= now
  ).length || 0;
  const upcomingBookings = bookings?.filter(
    (b) => new Date(b.start_time) > now
  ).length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{room.name}</h1>
                <p className="text-muted-foreground mt-1">{room.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Room Stats */}
              <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-success" />
                  <div>
                    <p className="text-xs text-muted-foreground">Active Now</p>
                    <p className="text-sm font-semibold">{activeBookings}</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-warning" />
                  <div>
                    <p className="text-xs text-muted-foreground">Upcoming</p>
                    <p className="text-sm font-semibold">{upcomingBookings}</p>
                  </div>
                </div>
              </div>

              {/* QR Code Dialog */}
              <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <QrCode className="w-4 h-4" />
                    View QR Code
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Room QR Code</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="bg-white p-4 rounded-lg border">
                      <canvas ref={qrCanvasRef} />
                    </div>
                    <p className="text-sm text-muted-foreground text-center max-w-xs">
                      Scan this QR code to quickly access this room's booking page
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <WeeklyCalendar bookings={bookings || []} />
      </main>
    </div>
  );
};

export default RoomDetail;
