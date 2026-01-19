import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface ChatBubbleProps {
  messageId: string;
  characterName: string;
  characterAvatar: string;
  username?: string; // Added this
  content: string;
  type: "dialogue" | "narrator" | "thought";
  isOwnMessage: boolean;
  timestamp: string;
  attachmentUrl?: string;
  isRead?: boolean;
  showReadReceipt?: boolean;
  onDelete?: (id: string) => void;
  onAICharacterClick?: () => void;
}

export const ChatBubble = ({
  characterName,
  characterAvatar,
  username,
  content,
  type,
  isOwnMessage,
  timestamp,
}: ChatBubbleProps) => {
  return (
    <div className={cn("flex gap-3 mb-4", isOwnMessage ? "flex-row-reverse" : "flex-row")}>
      <Avatar className="w-10 h-10 border border-border/50">
        <AvatarImage src={characterAvatar} />
        <AvatarFallback>{characterName[0]}</AvatarFallback>
      </Avatar>
      <div className={cn("flex flex-col max-w-[70%]", isOwnMessage ? "items-end" : "items-start")}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-primary">{characterName}</span>
          {username && <span className="text-xs text-muted-foreground">@{username}</span>}
        </div>
        <div
          className={cn(
            "rounded-2xl px-4 py-2 text-sm shadow-sm",
            type === "narrator"
              ? "bg-muted/50 italic text-muted-foreground border border-dashed border-border"
              : isOwnMessage
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border",
          )}
        >
          {content}
        </div>
        <span className="text-[10px] text-muted-foreground mt-1">{timestamp}</span>
      </div>
    </div>
  );
};
