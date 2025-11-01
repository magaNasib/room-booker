import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TIMEZONE = "Asia/Baku";

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  booker_name: string | null;
  squads?: {
    name: string;
  } | null;
}

interface BookingsListProps {
  bookings: Booking[];
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export const BookingsList = ({ bookings, onDelete, isDeleting }: BookingsListProps) => {
  const now = new Date();

  const activeBooking = bookings.find(
    (b) => new Date(b.start_time) <= now && new Date(b.end_time) >= now
  );

  const upcomingBookings = bookings.filter(
    (b) => new Date(b.start_time) > now
  );

  return (
    <div className="space-y-6">
      {activeBooking && (
        <Card className="border-warning bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <Clock className="w-5 h-5" />
              Currently In Use
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{activeBooking.booker_name || activeBooking.squads?.name || "Unknown"}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(activeBooking.id)}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                {format(toZonedTime(new Date(activeBooking.start_time), TIMEZONE), "h:mm a")} -{" "}
                {format(toZonedTime(new Date(activeBooking.end_time), TIMEZONE), "h:mm a")}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {upcomingBookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Bookings</CardTitle>
            <CardDescription>
              {upcomingBookings.length} upcoming {upcomingBookings.length === 1 ? "booking" : "bookings"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{booking.booker_name || booking.squads?.name || "Unknown"}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(toZonedTime(new Date(booking.start_time), TIMEZONE), "MMM d, h:mm a")} -{" "}
                      {format(toZonedTime(new Date(booking.end_time), TIMEZONE), "h:mm a")}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(booking.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!activeBooking && upcomingBookings.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No bookings yet. Be the first to book this room!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
