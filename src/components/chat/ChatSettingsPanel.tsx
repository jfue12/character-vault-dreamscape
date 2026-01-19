import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Image as ImageIcon, BookOpen } from "lucide-react";

interface ChatSettingsPanelProps {
  room: {
    id: string;
    name: string;
    description?: string | null;
    background_url?: string | null;
  };
  onUpdate: (data: { name?: string; description?: string; background_url?: string }) => Promise<void>;
}

export const ChatSettingsPanel = ({ room, onUpdate }: ChatSettingsPanelProps) => {
  const [name, setName] = React.useState(room.name);
  const [description, setDescription] = React.useState(room.description || "");
  const [bgUrl, setBgUrl] = React.useState(room.background_url || "");
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        name,
        description,
        background_url: bgUrl,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-6 bg-card border-l border-border h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Room Settings</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="room-name">Room Name</Label>
          <Input
            id="room-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter room name..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="room-lore" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Room Lore
          </Label>
          <Textarea
            id="room-lore"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the setting for the AI..."
            className="min-h-[120px] resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bg-url" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Background Image URL
          </Label>
          <Input
            id="bg-url"
            value={bgUrl}
            onChange={(e) => setBgUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <Button className="w-full mt-4" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};
