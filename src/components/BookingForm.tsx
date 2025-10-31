import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";

interface Booking {
  start_time: string;
  end_time: string;
}

interface BookingFormProps {
  existingBookings: Booking[];
  onSubmit: (data: { booker_name: string; start_time: string; end_time: string }) => void;
  isLoading: boolean;
}

export const BookingForm = ({ existingBookings, onSubmit, isLoading }: BookingFormProps) => {
  const [bookerName, setBookerName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");

  const checkConflict = (start: Date, end: Date): boolean => {
    return existingBookings.some((booking) => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      
      // Check if there's any overlap
      return (start < bookingEnd && end > bookingStart);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!bookerName || !startDate || !startTime || !endDate || !endTime) {
      setError("All fields are required");
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    // Validate that end time is after start time
    if (endDateTime <= startDateTime) {
      setError("End time must be after start time");
      return;
    }

    // Check for conflicts
    if (checkConflict(startDateTime, endDateTime)) {
      setError("This time slot conflicts with an existing booking");
      return;
    }

    onSubmit({
      booker_name: bookerName,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
    });

    // Reset form
    setBookerName("");
    setStartDate("");
    setStartTime("");
    setEndDate("");
    setEndTime("");
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="booker-name">Your Name</Label>
        <Input
          id="booker-name"
          type="text"
          value={bookerName}
          onChange={(e) => setBookerName(e.target.value)}
          placeholder="Enter your name"
          required
        />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Start Date & Time</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={today}
              required
            />
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>End Date & Time</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || today}
              required
            />
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isLoading || !bookerName || !startDate || !startTime || !endDate || !endTime}
      >
        <Calendar className="w-4 h-4 mr-2" />
        {isLoading ? "Booking..." : "Book Room"}
      </Button>
    </form>
  );
};