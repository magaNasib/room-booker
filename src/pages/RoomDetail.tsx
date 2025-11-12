import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

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

  useEffect(() => {
    if (roomId) {
      const url = window.location.href;

      QRCode.toDataURL(url, { width: 200 })
        .then((dataUrl) => {
          setQrDataUrl(dataUrl);
        })
        .catch((err) => {
          console.error("Error generating QR code:", err);
        });
    }
  }, [roomId]);

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
          queryClient.invalidateQueries({
            queryKey: ["room-bookings", roomId],
          });
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
        <div className="animate-pulse text-muted-foreground">
          Loading room details...
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Room not found
          </h2>
          <Link to="/">
            <Button>Back to Rooms</Button>
          </Link>
        </div>
      </div>
    );
  }

  const now = new Date();
  const activeBookings =
    bookings?.filter(
      (b) => new Date(b.start_time) <= now && new Date(b.end_time) >= now
    ).length || 0;
  const upcomingBookings =
    bookings?.filter((b) => new Date(b.start_time) > now).length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col gap-4">
            {/* Top row - Back button and title */}
            <div className="flex items-start gap-3">
              <Link to="/">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">
                  {room.name}
                </h1>
                <p className="text-muted-foreground text-sm md:text-base mt-1">{room.description}</p>
              </div>
            </div>

            {/* Bottom row - Stats and QR button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Room Stats */}
              <div className="flex items-center justify-around sm:justify-start gap-3 sm:gap-4 px-3 sm:px-4 py-2 bg-muted/50 rounded-lg flex-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-success shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Active Now</p>
                    <p className="text-sm font-semibold">{activeBookings}</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-warning shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Upcoming</p>
                    <p className="text-sm font-semibold">{upcomingBookings}</p>
                  </div>
                </div>
              </div>

              {/* QR Code Dialog */}
              <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 w-full sm:w-auto">
                    <QrCode className="w-4 h-4" />
                    <span className="sm:inline">View QR Code</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[90vw] max-w-md">
                  <DialogHeader>
                    <DialogTitle>Room QR Code</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col items-center gap-4 py-4">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Room QR Code"
                        className="border rounded-lg p-4 w-full max-w-[200px] h-auto"
                      />
                    ) : (
                      <div className="w-full max-w-[200px] aspect-square border rounded-lg p-4 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground text-center">
                          Generating QR code...
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground text-center px-4">
                      Scan this QR code to quickly access this room's booking
                      page
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 md:py-8">
        <WeeklyCalendar bookings={bookings || []} />
      </main>
    </div>
  );
};

export default RoomDetail;
