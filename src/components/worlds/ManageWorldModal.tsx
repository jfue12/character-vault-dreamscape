import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Crown, Shield, X, Ban, UserMinus, ShieldAlert } from "lucide-react";

interface ManageWorldModalProps {
  isOpen: boolean;
  onClose: () => void;
  worldId: string;
  members: any[];
  user: any;
  handlePromote: (userId: string, role: string) => void;
  handleKick: (userId: string) => void;
  handleBan: (userId: string) => void;
  handleUnban: (userId: string) => void;
  handleTimeout: (userId: string, duration: string) => void;
}

const TIMEOUT_DURATIONS = [
  { label: "10 Minutes", value: "10m" },
  { label: "1 Hour", value: "1h" },
  { label: "24 Hours", value: "24h" },
];

export const ManageWorldModal = ({
  isOpen,
  onClose,
  members,
  user,
  handlePromote,
  handleKick,
  handleBan,
  handleUnban,
  handleTimeout,
}: ManageWorldModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-background border-border">
        <DialogHeader>
          <DialogTitle>World Management</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="settings">Advanced Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {members?.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{member.profiles?.username || "Unknown User"}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                      {member.role}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {user?.id !== member.user_id && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handlePromote(member.user_id, "admin")}>
                          <Crown className="w-4 h-4 mr-1" /> Promote
                        </Button>
                        <Select onValueChange={(val) => handleTimeout(member.user_id, val)}>
                          <SelectTrigger className="w-[110px] h-8">
                            <Clock className="w-3 h-3 mr-1" />
                            <SelectValue placeholder="Timeout" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEOUT_DURATIONS.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="destructive" onClick={() => handleKick(member.user_id)}>
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings">
            <div className="p-4 text-center text-muted-foreground">World security and visibility settings...</div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
