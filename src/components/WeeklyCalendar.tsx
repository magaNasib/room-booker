import { useState } from "react";
import { format, startOfWeek, addDays, addWeeks, isSameDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TIMEZONE = "Asia/Baku";

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  booker_name: string | null;
}

interface WeeklyCalendarProps {
  bookings: Booking[];
  currentDate?: Date;
}

export const WeeklyCalendar = ({ bookings, currentDate = new Date() }: WeeklyCalendarProps) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeek = addWeeks(currentDate, weekOffset);
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Start on Monday
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00

  const goToPreviousWeek = () => setWeekOffset(weekOffset - 1);
  const goToNextWeek = () => setWeekOffset(weekOffset + 1);
  const goToCurrentWeek = () => setWeekOffset(0);

  const getBookingsForDayAndHour = (day: Date, hour: number) => {
    return bookings.filter((booking) => {
      const bookingStart = toZonedTime(new Date(booking.start_time), TIMEZONE);
      const bookingEnd = toZonedTime(new Date(booking.end_time), TIMEZONE);
      const startHour = bookingStart.getHours();
      const endHour = bookingEnd.getHours();

      return (
        isSameDay(bookingStart, day) &&
        hour >= startHour &&
        hour < endHour
      );
    });
  };

  const getBookingHeight = (booking: Booking) => {
    const start = toZonedTime(new Date(booking.start_time), TIMEZONE);
    const end = toZonedTime(new Date(booking.end_time), TIMEZONE);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.min(durationHours * 60, 60); // Cap at 60px per hour
  };

  const getBookingTopOffset = (booking: Booking, hour: number) => {
    const start = toZonedTime(new Date(booking.start_time), TIMEZONE);
    const minutes = start.getMinutes();
    return (minutes / 60) * 60; // Convert minutes to pixels
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-lg md:text-xl">Weekly Schedule</CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
              className="h-8 w-8 p-0 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToCurrentWeek}
              disabled={weekOffset === 0}
              className="h-8 flex-1 sm:flex-none"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextWeek}
              className="h-8 w-8 p-0 shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          {format(days[0], "MMM d")} - {format(days[6], "MMM d, yyyy")}
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-2 md:p-6">
        <div className="min-w-[600px] md:min-w-[800px]">
          {/* Header with days */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-0 border-b">
            <div className="p-2 font-semibold text-sm text-muted-foreground">Time</div>
            {days.map((day, i) => (
              <div
                key={i}
                className="p-2 text-center font-semibold text-sm border-l"
              >
                <div>{format(day, "EEE")}</div>
                <div className="text-xs text-muted-foreground">{format(day, "MMM d")}</div>
              </div>
            ))}
          </div>

          {/* Time slots grid */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-0">
            {hours.map((hour) => (
              <div key={hour} className="contents">
                <div className="p-2 text-sm text-muted-foreground border-b border-r">
                  {format(new Date().setHours(hour, 0), "HH:mm")}
                </div>
                {days.map((day, dayIndex) => {
                  const dayBookings = getBookingsForDayAndHour(day, hour);
                  const isFirstSlot = dayBookings.length > 0 && 
                    toZonedTime(new Date(dayBookings[0].start_time), TIMEZONE).getHours() === hour;

                  return (
                    <div
                      key={`${hour}-${dayIndex}`}
                      className="relative border-b border-l min-h-[60px] bg-card hover:bg-accent/5 transition-colors"
                    >
                      {isFirstSlot && dayBookings.map((booking) => {
                        const height = getBookingHeight(booking);
                        const topOffset = getBookingTopOffset(booking, hour);
                        
                        return (
                          <div
                            key={booking.id}
                            className="absolute left-1 right-1 bg-primary/10 border-l-4 border-primary rounded p-1 text-xs overflow-hidden z-10"
                            style={{
                              top: `${topOffset}px`,
                              height: `${height}px`,
                            }}
                          >
                            <div className="font-medium truncate text-primary">
                              {booking.booker_name || "Anonymous"}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {format(toZonedTime(new Date(booking.start_time), TIMEZONE), "HH:mm")} -
                              {format(toZonedTime(new Date(booking.end_time), TIMEZONE), "HH:mm")}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
