// Inside your RoomChat component, add this useEffect:
useEffect(() => {
  if (currentRoom?.background_url) {
    const chatContainer = document.getElementById("chat-layout-container");
    if (chatContainer) {
      chatContainer.style.backgroundImage = `url(${currentRoom.background_url})`;
      chatContainer.style.backgroundSize = "cover";
      chatContainer.style.backgroundPosition = "center";
    }
  }
}, [currentRoom]);

// Ensure your local interface includes these:
interface Room {
  id: string;
  name: string;
  description: string | null; // This replaces room_lore
  background_url: string | null;
  avatar_url?: string | null;
}
