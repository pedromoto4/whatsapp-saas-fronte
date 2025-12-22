import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/auth-store';
import { authFetch } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';

interface Stats {
  messages_sent: number;
  active_contacts: number;
  unread_count: number;
  appointments_today: number;
  faqs_count: number;
  catalog_count: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    messages_sent: 0,
    active_contacts: 0,
    unread_count: 0,
    appointments_today: 0,
    faqs_count: 0,
    catalog_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      // Load unread count
      const unreadResponse = await authFetch(API_ENDPOINTS.UNREAD_COUNT);
      if (unreadResponse.ok) {
        const unreadData = await unreadResponse.json();
        setStats((prev) => ({ ...prev, unread_count: unreadData.unread_count }));
      }

      // Load contacts count
      const contactsResponse = await authFetch(API_ENDPOINTS.CONTACTS);
      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        setStats((prev) => ({ ...prev, active_contacts: contactsData.length }));
      }

      // Load appointments
      const appointmentsResponse = await authFetch(API_ENDPOINTS.APPOINTMENTS);
      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json();
        const today = new Date().toDateString();
        const todayAppointments = appointmentsData.filter(
          (apt: any) => new Date(apt.scheduled_at).toDateString() === today
        );
        setStats((prev) => ({ ...prev, appointments_today: todayAppointments.length }));
      }

      // Load FAQs count
      const faqsResponse = await authFetch(API_ENDPOINTS.FAQS);
      if (faqsResponse.ok) {
        const faqsData = await faqsResponse.json();
        setStats((prev) => ({ ...prev, faqs_count: Array.isArray(faqsData) ? faqsData.length : 0 }));
      }

      // Load Catalog count
      const catalogResponse = await authFetch(API_ENDPOINTS.CATALOG);
      if (catalogResponse.ok) {
        const catalogData = await catalogResponse.json();
        setStats((prev) => ({ ...prev, catalog_count: Array.isArray(catalogData) ? catalogData.length : 0 }));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const statCards = [
    {
      title: 'Mensagens Não Lidas',
      value: stats.unread_count,
      icon: 'chatbubble-ellipses',
      color: '#25D366',
      onPress: () => router.push('/(tabs)/conversations'),
    },
    {
      title: 'Contactos Ativos',
      value: stats.active_contacts,
      icon: 'people',
      color: '#128C7E',
      onPress: () => router.push('/(tabs)/contacts'),
    },
    {
      title: 'Agendamentos Hoje',
      value: stats.appointments_today,
      icon: 'calendar',
      color: '#F59E0B',
      onPress: () => router.push({
        pathname: '/(tabs)/appointments',
        params: { selectToday: 'true' },
      } as any),
    },
    {
      title: 'FAQs',
      value: stats.faqs_count,
      icon: 'help-circle',
      color: '#8B5CF6',
      onPress: () => router.push('/(tabs)/faqs'),
    },
    {
      title: 'Produtos',
      value: stats.catalog_count,
      icon: 'bag',
      color: '#007AFF',
      onPress: () => router.push('/(tabs)/catalog'),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B141A' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#2A373F',
        }}
      >
        <View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#25D366' }}>
            Dashboard
          </Text>
          <Text style={{ fontSize: 14, color: '#8696A0' }}>
            Olá, {user?.displayName || user?.email?.split('@')[0]}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: '#1F2C33',
          }}
        >
          <Ionicons name="log-out-outline" size={24} color="#F15C6D" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#25D366"
          />
        }
      >
        {/* Welcome Card */}
        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo de volta!</CardTitle>
          </CardHeader>
          <CardContent>
            <Text style={{ color: '#8696A0', lineHeight: 20 }}>
              Aqui está um resumo do seu negócio hoje. Toque nos cartões para ver mais detalhes.
            </Text>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {statCards.map((stat, index) => (
            <TouchableOpacity
              key={index}
              onPress={stat.onPress}
              style={{
                width: '48%',
                backgroundColor: '#1F2C33',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: '#2A373F',
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: `${stat.color}20`,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name={stat.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={stat.color}
                />
              </View>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: 'bold',
                  color: '#E9EDEF',
                  marginBottom: 4,
                }}
              >
                {stat.value}
              </Text>
              <Text style={{ fontSize: 12, color: '#8696A0' }}>{stat.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent style={{ gap: 12 }}>
            <Button
              variant="outline"
              onPress={() => router.push('/(tabs)/conversations')}
              leftIcon={<Ionicons name="chatbubbles-outline" size={20} color="#E9EDEF" />}
            >
              Ver Conversas
            </Button>
            <Button
              variant="outline"
              onPress={() => router.push('/(tabs)/contacts')}
              leftIcon={<Ionicons name="person-add-outline" size={20} color="#E9EDEF" />}
            >
              Gerir Contactos
            </Button>
            <Button
              variant="outline"
              onPress={() => router.push('/(tabs)/faqs')}
              leftIcon={<Ionicons name="help-circle-outline" size={20} color="#E9EDEF" />}
            >
              Gerir FAQs
            </Button>
            <Button
              variant="outline"
              onPress={() => router.push('/(tabs)/catalog')}
              leftIcon={<Ionicons name="bag-outline" size={20} color="#E9EDEF" />}
            >
              Gerir Catálogo
            </Button>
            <Button
              variant="outline"
              onPress={() => router.push('/(tabs)/settings')}
              leftIcon={<Ionicons name="settings-outline" size={20} color="#E9EDEF" />}
            >
              Configurações
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <View style={{ gap: 12 }}>
              <ActivityItem
                icon="chatbubble"
                title="Nova mensagem recebida"
                time="Há 2 minutos"
                color="#25D366"
              />
              <ActivityItem
                icon="checkmark-circle"
                title="Agendamento confirmado"
                time="Há 15 minutos"
                color="#10B981"
              />
              <ActivityItem
                icon="person-add"
                title="Novo contacto adicionado"
                time="Há 1 hora"
                color="#128C7E"
              />
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ActivityItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  time: string;
  color: string;
}

function ActivityItem({ icon, title, time, color }: ActivityItemProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, color: '#E9EDEF' }}>{title}</Text>
        <Text style={{ fontSize: 12, color: '#8696A0' }}>{time}</Text>
      </View>
    </View>
  );
}

