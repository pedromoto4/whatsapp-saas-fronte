import { useEffect } from 'react';
import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';

export default function LandingPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuthStore();

  useEffect(() => {
    // If already logged in, redirect to dashboard
    // Use setTimeout to ensure router is ready
    if (isLoggedIn) {
      const timer = setTimeout(() => {
        try {
          router.replace('/(tabs)/dashboard');
        } catch (error) {
          // Router not ready yet, try again
          console.log('Router not ready, retrying...');
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0B141A',
        paddingHorizontal: 24,
      }}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: 60,
          paddingBottom: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: '#25D366',
          }}
        >
          WhatsApp SaaS
        </Text>
      </View>

      {/* Hero Section */}
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 32,
        }}
      >
        {/* Icon */}
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: '#25D366',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="chatbubbles" size={60} color="#FFFFFF" />
        </View>

        {/* Title */}
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: 'bold',
              color: '#E9EDEF',
              textAlign: 'center',
            }}
          >
            Automatize o seu{'\n'}WhatsApp Business
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: '#8696A0',
              textAlign: 'center',
              lineHeight: 24,
            }}
          >
            Gerencie conversas, agende mensagens e{'\n'}
            automatize respostas com IA
          </Text>
        </View>

        {/* Features */}
        <View style={{ gap: 16, width: '100%' }}>
          <FeatureItem
            icon="chatbubble-ellipses"
            title="Respostas Automáticas"
            description="IA que responde às perguntas frequentes"
          />
          <FeatureItem
            icon="calendar"
            title="Agendamentos"
            description="Sistema completo de marcação de horários"
          />
          <FeatureItem
            icon="people"
            title="Gestão de Contactos"
            description="Organize e segmente seus clientes"
          />
        </View>
      </View>

      {/* CTA Buttons */}
      <View
        style={{
          paddingBottom: 40,
          gap: 12,
        }}
      >
        <Button
          onPress={() => router.push('/login')}
          size="lg"
        >
          Começar Agora
        </Button>
        <Button
          variant="outline"
          onPress={() => router.push('/login')}
          size="lg"
        >
          Já tenho conta
        </Button>
      </View>
    </View>
  );
}

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: '#1F2C33',
        padding: 16,
        borderRadius: 12,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: '#25D36620',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name={icon} size={24} color="#25D366" />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: '#E9EDEF',
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: '#8696A0',
          }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

