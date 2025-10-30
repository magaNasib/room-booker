import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin } from "lucide-react";

interface Room {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

interface Booking {
  id: string;
  room_id: string;
  start_time: string;
  end_time: string;
}

interface RoomCardProps {
  room: Room;
  bookings?: Booking[];
}

export const RoomCard = ({ room, bookings }: RoomCardProps) => {
  const now = new Date();
  const currentBooking = bookings?.find(
    (b) =>
      b.room_id === room.id &&
      new Date(b.start_time) <= now &&
      new Date(b.end_time) >= now
  );

  const nextBooking = bookings?.find(
    (b) =>
      b.room_id === room.id &&
      new Date(b.start_time) > now
  );

  const isAvailable = !currentBooking;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div 
        className="h-3" 
        style={{ backgroundColor: room.color }}
      />
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{room.name}</CardTitle>
            <CardDescription>{room.description}</CardDescription>
          </div>
          <Badge 
            variant={isAvailable ? "default" : "secondary"}
            className={isAvailable ? "bg-success hover:bg-success/90" : "bg-warning hover:bg-warning/90"}
          >
            {isAvailable ? "Available" : "In Use"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentBooking && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              Until {new Date(currentBooking.end_time).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        )}

        {nextBooking && !currentBooking && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              Next at {new Date(nextBooking.start_time).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        )}

        <Link to={`/room/${room.id}`} className="block">
          <Button className="w-full" variant={isAvailable ? "default" : "outline"}>
            <MapPin className="w-4 h-4 mr-2" />
            {isAvailable ? "Book Now" : "View Schedule"}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};
