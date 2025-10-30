import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";

export const SquadsManager = () => {
  const [name, setName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: squads, isLoading } = useQuery({
    queryKey: ["admin-squads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("squads")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const addSquad = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("squads").insert({ name });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-squads"] });
      queryClient.invalidateQueries({ queryKey: ["squads"] });
      setName("");
      toast({ title: "Squad added successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding squad",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSquad = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("squads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-squads"] });
      queryClient.invalidateQueries({ queryKey: ["squads"] });
      toast({ title: "Squad deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting squad",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Squad</CardTitle>
          <CardDescription>Create a new squad for booking</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addSquad.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="squad-name">Squad Name</Label>
              <Input
                id="squad-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Engineering Squad"
                required
              />
            </div>
            <Button type="submit" disabled={addSquad.isPending} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Squad
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Squads</CardTitle>
          <CardDescription>Manage your squads</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading squads...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {squads && squads.length > 0 ? (
                  squads.map((squad) => (
                    <TableRow key={squad.id}>
                      <TableCell className="font-medium">{squad.name}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteSquad.mutate(squad.id)}
                          disabled={deleteSquad.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No squads yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};