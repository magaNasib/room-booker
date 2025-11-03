import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Repeat, Search } from "lucide-react";
import { format, addDays, addWeeks, startOfWeek, isBefore, isAfter, isSameDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const TIMEZONE = "Asia/Baku";

export const BookingsManager = () => {
  const [roomId, setRoomId] = useState("");
  const [bookerName, setBookerName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rooms } = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          rooms (name, color)
        `)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });
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
          // Get unique weekdays
          const weekdays = new Set<number>();
          similarBookings.forEach((b) => {
            const date = toZonedTime(new Date(b.start_time), TIMEZONE);
            weekdays.add(date.getDay());
          });
          
          // This is a recurring series
          grouped.push({
            ...booking,
            isRecurring: true,
            recurringCount: similarBookings.length,
            recurringIds: similarBookings.map((b) => b.id),
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

  const addBooking = useMutation({
    mutationFn: async () => {
      const bookingsToCreate = [];

      if (isRecurring && selectedDays.length > 0 && recurringEndDate) {
        // Create recurring bookings
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(recurringEndDate);

        let currentDate = new Date(rangeStart);
        while (isBefore(currentDate, rangeEnd) || isSameDay(currentDate, rangeEnd)) {
          if (selectedDays.includes(currentDate.getDay())) {
            // Create booking for this day
            const bookingStartDate = new Date(currentDate);
            const [startHour, startMinute] = startTime.split(":");
            bookingStartDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

            const bookingEndDate = new Date(currentDate);
            const [endHour, endMinute] = endTime.split(":");
            bookingEndDate.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

            // Convert to UTC from Azerbaijan timezone
            const startUTC = fromZonedTime(bookingStartDate, TIMEZONE);
            const endUTC = fromZonedTime(bookingEndDate, TIMEZONE);

            bookingsToCreate.push({
              room_id: roomId,
              booker_name: bookerName,
              start_time: startUTC.toISOString(),
              end_time: endUTC.toISOString(),
            });
          }
          currentDate = addDays(currentDate, 1);
        }
      } else {
        // Create single booking
        const bookingStartDate = new Date(startDate);
        const [startHour, startMinute] = startTime.split(":");
        bookingStartDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

        const bookingEndDate = new Date(endDate);
        const [endHour, endMinute] = endTime.split(":");
        bookingEndDate.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

        // Convert to UTC from Azerbaijan timezone
        const startUTC = fromZonedTime(bookingStartDate, TIMEZONE);
        const endUTC = fromZonedTime(bookingEndDate, TIMEZONE);

        bookingsToCreate.push({
          room_id: roomId,
          booker_name: bookerName,
          start_time: startUTC.toISOString(),
          end_time: endUTC.toISOString(),
        });
      }

      const { error } = await supabase.from("bookings").insert(bookingsToCreate);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setRoomId("");
      setBookerName("");
      setStartDate("");
      setStartTime("");
      setEndDate("");
      setEndTime("");
      setIsRecurring(false);
      setRecurringEndDate("");
      setSelectedDays([]);
      toast({ title: isRecurring ? "Recurring bookings created successfully" : "Booking created successfully" });
    },
    onError: (error: any) => {
      const message = error.message.includes("overlaps") 
        ? "This time slot is already booked. Please choose a different time."
        : error.message;
      toast({
        title: "Error creating booking",
        description: message,
        variant: "destructive",
      });
    },
  });

  const deleteBooking = useMutation({
    mutationFn: async (ids: string | string[]) => {
      const idsToDelete = Array.isArray(ids) ? ids : [ids];
      const { error } = await supabase.from("bookings").delete().in("id", idsToDelete);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast({ title: "Booking(s) deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting booking",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Booking</CardTitle>
          <CardDescription>Book a room for a specific time period</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addBooking.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="room">Room</Label>
              <Select value={roomId} onValueChange={setRoomId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms?.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="booker-name">Booker Name</Label>
              <Input
                id="booker-name"
                value={bookerName}
                onChange={(e) => setBookerName(e.target.value)}
                placeholder="Enter booker name"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                />
                <Label htmlFor="recurring" className="cursor-pointer">
                  Create recurring weekly bookings
                </Label>
              </div>
            </div>

            {isRecurring && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label>Select Days of Week</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Checkbox
                          id={`day-${index}`}
                          checked={selectedDays.includes(index)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDays([...selectedDays, index]);
                            } else {
                              setSelectedDays(selectedDays.filter((d) => d !== index));
                            }
                          }}
                        />
                        <Label htmlFor={`day-${index}`} className="cursor-pointer">
                          {day}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurring-end-date">Recurring Until</Label>
                  <Input
                    id="recurring-end-date"
                    type="date"
                    value={recurringEndDate}
                    onChange={(e) => setRecurringEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">{isRecurring ? "First Booking Date" : "Start Date"}</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {!isRecurring && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {isRecurring && (
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time (same day)</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            )}

            <Button type="submit" disabled={addBooking.isPending} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Booking
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bookings</CardTitle>
          <CardDescription>Manage upcoming room bookings</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading bookings...</p>
          ) : (
            <>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by room or booker name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Tabs defaultValue="normal" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="normal">Individual Bookings</TabsTrigger>
                  <TabsTrigger value="recurring">Weekly Series</TabsTrigger>
                </TabsList>

                <TabsContent value="normal">
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Room</TableHead>
                          <TableHead>Booker</TableHead>
                          <TableHead>Day</TableHead>
                          <TableHead>Start Time</TableHead>
                          <TableHead>End Time</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookings?.filter((b) => {
                          if (!b.isRecurring) {
                            const matchesSearch = searchQuery.toLowerCase() === "" ||
                              b.rooms?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              b.booker_name?.toLowerCase().includes(searchQuery.toLowerCase());
                            return matchesSearch;
                          }
                          return false;
                        }).length > 0 ? (
                          bookings
                            .filter((b) => {
                              if (!b.isRecurring) {
                                const matchesSearch = searchQuery.toLowerCase() === "" ||
                                  b.rooms?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  b.booker_name?.toLowerCase().includes(searchQuery.toLowerCase());
                                return matchesSearch;
                              }
                              return false;
                            })
                            .map((booking) => {
                              const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                              const startTime = toZonedTime(new Date(booking.start_time), TIMEZONE);
                              const endTime = toZonedTime(new Date(booking.end_time), TIMEZONE);

                              return (
                                <TableRow key={booking.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded"
                                        style={{ backgroundColor: booking.rooms?.color }}
                                      />
                                      <span className="font-medium">{booking.rooms?.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{booking.booker_name || "—"}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {weekdayNames[startTime.getDay()]}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {format(startTime, "MMM d, HH:mm")}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {format(endTime, "MMM d, HH:mm")}
                                  </TableCell>
                                  <TableCell>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          disabled={deleteBooking.isPending}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Booking</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete this booking? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteBooking.mutate(booking.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No individual bookings found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="recurring">
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Room</TableHead>
                          <TableHead>Booker</TableHead>
                          <TableHead>Weekdays</TableHead>
                          <TableHead>Time Slot</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookings?.filter((b) => {
                          if (b.isRecurring) {
                            const matchesSearch = searchQuery.toLowerCase() === "" ||
                              b.rooms?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              b.booker_name?.toLowerCase().includes(searchQuery.toLowerCase());
                            return matchesSearch;
                          }
                          return false;
                        }).length > 0 ? (
                          bookings
                            .filter((b) => {
                              if (b.isRecurring) {
                                const matchesSearch = searchQuery.toLowerCase() === "" ||
                                  b.rooms?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  b.booker_name?.toLowerCase().includes(searchQuery.toLowerCase());
                                return matchesSearch;
                              }
                              return false;
                            })
                            .map((booking) => {
                              const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                              const startTime = toZonedTime(new Date(booking.start_time), TIMEZONE);
                              const endTime = toZonedTime(new Date(booking.end_time), TIMEZONE);

                              return (
                                <TableRow key={booking.id} className="bg-primary/5">
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded"
                                        style={{ backgroundColor: booking.rooms?.color }}
                                      />
                                      <span className="font-medium">{booking.rooms?.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{booking.booker_name || "—"}</TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {booking.weekdays?.map((day: number) => (
                                        <Badge key={day} variant="outline" className="text-xs">
                                          {weekdayNames[day]}
                                        </Badge>
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {format(startTime, "HH:mm")} - {format(startTime, "HH:mm").split(':').map((v, i) => i === 0 ? String((parseInt(v) + 1) % 24).padStart(2, '0') : v).join(':')}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {format(endTime, "MMM d")}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="gap-1">
                                      <Repeat className="w-3 h-3" />
                                      {booking.recurringCount}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          disabled={deleteBooking.isPending}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Weekly Series</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete all {booking.recurringCount} bookings in this weekly series? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteBooking.mutate(booking.recurringIds)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Delete All
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No weekly series found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
