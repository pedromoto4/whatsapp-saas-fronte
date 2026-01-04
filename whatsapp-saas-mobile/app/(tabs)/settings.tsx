import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuthStore } from '@/lib/auth-store';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = async () => {
    Alert.alert(
      'Terminar Sessão',
      'Tem a certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleNotificationsToggle = async (value: boolean) => {
    if (isExpoGo) {
      Alert.alert(
        'Expo Go',
        'As notificações push não estão disponíveis no Expo Go. Use um development build para testar esta funcionalidade.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (value) {
      // Dynamic import to avoid crash in Expo Go
      try {
        const Notifications = await import('expo-notifications');
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permissão Negada',
            'É necessário permitir notificações nas definições do sistema.',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Abrir Definições',
                onPress: () => Linking.openSettings(),
              },
            ]
          );
          return;
        }
      } catch (error) {
        console.log('Notifications not available');
      }
    }
    setNotificationsEnabled(value);
  };

  const handleTestNotification = async () => {
    try {
      const { authFetch } = await import('@/lib/auth-store');
      
      Alert.alert('Teste', 'Enviando notificação de teste...', [], { cancelable: false });
      
      const response = await authFetch('/api/push-tokens/test', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          '✅ Sucesso',
          data.message || `Notificação enviada para ${data.devices_notified} dispositivo(s)`,
          [{ text: 'OK' }]
        );
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
        Alert.alert(
          '❌ Erro',
          errorData.detail || 'Falha ao enviar notificação de teste',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Error testing notification:', error);
      Alert.alert(
        '❌ Erro',
        error.message || 'Falha ao enviar notificação de teste',
        [{ text: 'OK' }]
      );
    }
  };

  const settingsSections = [
    {
      title: 'Conta',
      items: [
        {
          icon: 'person-outline',
          label: 'Perfil',
          description: user?.email || 'email@exemplo.com',
          onPress: () => Alert.alert('Perfil', 'Funcionalidade em desenvolvimento.'),
        },
        {
          icon: 'key-outline',
          label: 'Alterar Password',
          description: 'Atualizar a sua password',
          onPress: () => Alert.alert('Password', 'Funcionalidade em desenvolvimento.'),
        },
      ],
    },
    {
      title: 'Notificações',
      items: [
        {
          icon: 'notifications-outline',
          label: 'Notificações Push',
          description: 'Receber alertas de novas mensagens',
          isSwitch: true,
          value: notificationsEnabled,
          onToggle: handleNotificationsToggle,
        },
        {
          icon: 'flash-outline',
          label: 'Testar Notificação',
          description: 'Enviar uma notificação de teste',
          onPress: handleTestNotification,
        },
      ],
    },
    {
      title: 'WhatsApp Business',
      items: [
        {
          icon: 'logo-whatsapp',
          label: 'Configurar WhatsApp',
          description: 'Conectar sua conta Business',
          onPress: () => Alert.alert('WhatsApp', 'Configure no dashboard web.'),
        },
        {
          icon: 'flash-outline',
          label: 'Respostas Automáticas',
          description: 'Configurar IA e FAQs',
          onPress: () => Alert.alert('FAQs', 'Configure no dashboard web.'),
        },
      ],
    },
    {
      title: 'Sobre',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'Versão',
          description: '1.0.0',
          onPress: () => {},
        },
        {
          icon: 'document-text-outline',
          label: 'Termos de Serviço',
          description: 'Ler os termos',
          onPress: () => Linking.openURL('https://whatsapp-saas.com/terms'),
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Política de Privacidade',
          description: 'Ler a política',
          onPress: () => Linking.openURL('https://whatsapp-saas.com/privacy'),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B141A' }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#2A373F',
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#25D366' }}>
          Definições
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}
      >
        {/* User Card */}
        <Card>
          <CardContent style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: '#25D36630',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#25D366' }}>
                  {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#E9EDEF' }}>
                  {user?.displayName || 'Utilizador'}
                </Text>
                <Text style={{ fontSize: 14, color: '#8696A0' }}>
                  {user?.email || 'email@exemplo.com'}
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <Card key={sectionIndex}>
            <CardHeader>
              <CardTitle style={{ fontSize: 14, color: '#8696A0' }}>
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent style={{ paddingTop: 0, gap: 0 }}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: itemIndex < section.items.length - 1 ? 1 : 0,
                    borderBottomColor: '#2A373F',
                  }}
                  onPress={item.onPress}
                  activeOpacity={item.isSwitch ? 1 : 0.7}
                  disabled={item.isSwitch}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: '#1F2C33',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Ionicons
                      name={item.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color="#8696A0"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, color: '#E9EDEF' }}>{item.label}</Text>
                    <Text style={{ fontSize: 12, color: '#8696A0' }}>
                      {item.description}
                    </Text>
                  </View>
                  {item.isSwitch ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{ false: '#2A373F', true: '#25D36650' }}
                      thumbColor={item.value ? '#25D366' : '#8696A0'}
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#8696A0" />
                  )}
                </TouchableOpacity>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Logout Button */}
        <Button
          variant="destructive"
          onPress={handleLogout}
          size="lg"
          leftIcon={<Ionicons name="log-out-outline" size={20} color="#FFFFFF" />}
        >
          Terminar Sessão
        </Button>

        {/* App Info */}
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <Text style={{ fontSize: 12, color: '#8696A0' }}>
            WhatsApp SaaS Mobile v1.0.0
          </Text>
          <Text style={{ fontSize: 12, color: '#8696A0' }}>
            © 2025 WhatsApp SaaS
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

