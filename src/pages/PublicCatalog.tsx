import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ServiceCard } from '@/components/ServiceCard';
import { BookingModal } from '@/components/BookingModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Clock, MessageCircle, Facebook, Instagram } from 'lucide-react';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  is_popular: boolean;
}

interface Barbershop {
  name: string;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
  operating_hours: any;
  facebook_url: string | null;
  instagram_url: string | null;
}

interface CatalogSettings {
  theme_color: string;
  hero_image_url: string | null;
  show_popular_badge: boolean;
}

const isLovableDomain = (hostname: string) => {
  return hostname === 'localhost' || 
         hostname.includes('lovableproject') ||
         hostname.includes('.lovable.app') ||
         hostname.includes('.lovable.dev');
};

const PublicCatalog = () => {
  const { slug } = useParams();
  const [services, setServices] = useState<Service[]>([]);
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [catalogSettings, setCatalogSettings] = useState<CatalogSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [slug]);

  const fetchData = async () => {
    try {
      let barbershopData = null;
      
      // 1️⃣ Se tiver slug na URL, buscar por slug
      if (slug) {
        const { data } = await supabase
          .from('barbershops')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
        barbershopData = data;
      } 
      // 2️⃣ Se não tiver slug, tentar por domínio customizado
      else {
        const hostname = window.location.hostname;
        
        // Ignorar domínios Lovable
        if (!isLovableDomain(hostname)) {
          const { data: byDomain } = await supabase
            .from('barbershops')
            .select('*')
            .eq('custom_domain', hostname)
            .maybeSingle();
          
          if (byDomain) {
            barbershopData = byDomain;
          }
        }
      }

      // ✅ Se não encontrou barbearia, mostrar erro
      if (!barbershopData) {
        toast.error('Barbearia não encontrada');
        setLoading(false);
        return;
      }

      setBarbershop(barbershopData);
      setBarbershopId(barbershopData.id);
      await fetchServicesAndSettings(barbershopData.id);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar catálogo');
    } finally {
      setLoading(false);
    }
  };

  const fetchServicesAndSettings = async (barbershopId: string) => {
    // Fetch services for this barbershop
    const { data: servicesData } = await supabase
      .from('services')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .order('is_popular', { ascending: false })
      .order('name');

    if (servicesData) {
      setServices(servicesData);
    }

    // Fetch catalog settings
    const { data: settingsData } = await supabase
      .from('catalog_settings')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .maybeSingle();

    if (settingsData) {
      setCatalogSettings(settingsData);
    }

    // Fetch WhatsApp number
    const { data: credentialsData } = await supabase
      .from('barbershop_credentials')
      .select('whatsapp_credentials')
      .eq('barbershop_id', barbershopId)
      .maybeSingle();

    if (credentialsData?.whatsapp_credentials) {
      const whatsappCreds = credentialsData.whatsapp_credentials as any;
      if (whatsappCreds.enabled && whatsappCreds.phone_number) {
        // Clean number (remove special characters)
        const cleanNumber = whatsappCreds.phone_number.replace(/\D/g, '');
        setWhatsappNumber(cleanNumber);
      }
    }
  };

  const handleBookNow = (service: Service) => {
    setSelectedService(service);
    setIsBookingOpen(true);
  };

  const themeColor = catalogSettings?.theme_color || '#8B4513';

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div 
        className="relative h-64 md:h-80 bg-cover bg-center"
        style={{
          backgroundImage: catalogSettings?.hero_image_url 
            ? `url(${catalogSettings.hero_image_url})` 
            : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative h-full flex flex-col items-center justify-center text-white px-4">
          {barbershop?.logo_url && (
            <img 
              src={barbershop.logo_url} 
              alt="Logo"
              className="h-20 w-20 mb-4 rounded-full object-cover border-4 border-white shadow-lg"
            />
          )}
          <h1 className="text-3xl md:text-5xl font-bold text-center mb-2">
            {barbershop?.name || 'Barbearia'}
          </h1>
          <p className="text-lg text-white/90">Agende seu horário</p>
        </div>
      </div>

      {/* Barbershop Info */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4 text-sm">
            {barbershop?.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{barbershop.address}</span>
              </div>
            )}
            {barbershop?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${barbershop.phone}`} className="hover:text-accent">
                  {barbershop.phone}
                </a>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Seg-Sáb: 9h-19h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">Nossos Serviços</h2>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">Nenhum serviço disponível no momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                showPopularBadge={catalogSettings?.show_popular_badge ?? true}
                onBookNow={() => handleBookNow(service)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false);
          setSelectedService(null);
        }}
        service={selectedService}
        barbershopId={barbershopId}
      />

      {/* WhatsApp Floating Button */}
      {whatsappNumber && (
        <a
          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Olá! Gostaria de saber mais sobre os serviços.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 group"
        >
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 bg-[#25D366] hover:bg-[#128C7E] text-white border-0"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          <span className="absolute bottom-full right-0 mb-2 hidden group-hover:block whitespace-nowrap bg-popover text-popover-foreground px-3 py-1 rounded-md text-sm shadow-md">
            Fale conosco pelo WhatsApp
          </span>
        </a>
      )}

      {/* Footer */}
      <footer className="bg-muted mt-16 border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {barbershop?.name}. Todos os direitos reservados.
            </div>
            
            {/* Redes Sociais */}
            {(barbershop?.facebook_url || barbershop?.instagram_url) && (
              <div className="flex gap-3">
                {barbershop.facebook_url && (
                  <a
                    href={barbershop.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#1877F2] hover:bg-[#1565c0] p-2 rounded-full transition-all duration-300 hover:scale-110 text-white"
                    aria-label="Siga-nos no Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {barbershop.instagram_url && (
                  <a
                    href={barbershop.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-br from-[#833AB4] via-[#E4405F] to-[#F77737] hover:opacity-90 p-2 rounded-full transition-all duration-300 hover:scale-110 text-white"
                    aria-label="Siga-nos no Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}
            
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link 
                to={`/${slug}/privacidade`} 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Política de Privacidade
              </Link>
              <Link 
                to={`/${slug}/termos`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Termos de Uso
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicCatalog;
