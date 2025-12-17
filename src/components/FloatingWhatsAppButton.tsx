import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "5541983455701";

export const FloatingWhatsAppButton = () => {
  const handleClick = () => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 animate-pulse hover:animate-none"
      aria-label="Chamar no WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </button>
  );
};
