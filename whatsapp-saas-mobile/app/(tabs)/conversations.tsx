import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { authFetch } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Conversation } from '@/types';

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const loadConversations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const response = await authFetch(API_ENDPOINTS.CONVERSATIONS);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Conversations API Response:', data);
        console.log('Is Array:', Array.isArray(data));
        // Ensure data is always an array
        const conversationsArray = Array.isArray(data) ? data : [];
        console.log('Conversations Count:', conversationsArray.length);
        setConversations(conversationsArray);
      } else {
        setConversations([]);
        if (!silent) {
          Alert.alert('Erro', 'Não foi possível carregar as conversas.');
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
      if (!silent) {
        Alert.alert('Erro', 'Erro de conexão.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadConversations();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadConversations(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const filteredConversations = (conversations || []).filter((conv) => {
    const matchesArchive = showArchived ? conv.is_archived : !conv.is_archived;
    const matchesSearch =
      searchQuery === '' ||
      conv.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.phone_number.includes(searchQuery);
    return matchesArchive && matchesSearch;
  });

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return format(date, 'HH:mm');
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return format(date, 'EEEE', { locale: pt });
    } else {
      return format(date, 'dd/MM/yyyy');
    }
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2A373F',
        backgroundColor: item.unread_count > 0 ? '#1F2C3310' : 'transparent',
      }}
      onPress={() => {
        router.push({
          pathname: '/chat',
          params: { phone: item.phone_number },
        });
      }}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View
        style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: '#25D36630',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#25D366' }}>
          {(item.contact_name || item.phone_number).charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: item.unread_count > 0 ? '700' : '500',
              color: '#E9EDEF',
              flex: 1,
            }}
            numberOfLines={1}
          >
            {item.contact_name || item.phone_number}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: item.unread_count > 0 ? '#25D366' : '#8696A0',
            }}
          >
            {formatMessageTime(item.last_message_time)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {item.direction === 'out' && (
            <Ionicons
              name={item.is_automated ? 'flash' : 'checkmark-done'}
              size={16}
              color="#8696A0"
              style={{ marginRight: 4 }}
            />
          )}
          <Text
            style={{
              fontSize: 14,
              color: item.unread_count > 0 ? '#E9EDEF' : '#8696A0',
              flex: 1,
            }}
            numberOfLines={1}
          >
            {item.last_message}
          </Text>
          {item.unread_count > 0 && (
            <View
              style={{
                backgroundColor: '#25D366',
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 6,
              }}
            >
              <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: 'bold' }}>
                {item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);

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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#25D366' }}>
              Conversas
            </Text>
            {totalUnread > 0 && (
              <View
                style={{
                  backgroundColor: '#F15C6D',
                  borderRadius: 12,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: 'bold' }}>
                  {totalUnread}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setShowArchived(!showArchived)}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: showArchived ? '#25D36630' : '#1F2C33',
            }}
          >
            <Ionicons
              name="archive-outline"
              size={24}
              color={showArchived ? '#25D366' : '#8696A0'}
            />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#1F2C33',
            borderRadius: 8,
            paddingHorizontal: 12,
            marginTop: 12,
          }}
        >
          <Ionicons name="search" size={20} color="#8696A0" />
          <TextInput
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 8,
              fontSize: 16,
              color: '#E9EDEF',
            }}
            placeholder="Pesquisar conversas..."
            placeholderTextColor="#8696A0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#8696A0" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.phone_number}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#25D366"
          />
        }
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingTop: 100,
            }}
          >
            <Ionicons name="chatbubbles-outline" size={64} color="#2A373F" />
            <Text style={{ fontSize: 18, color: '#8696A0', marginTop: 16 }}>
              {searchQuery
                ? 'Nenhuma conversa encontrada'
                : showArchived
                ? 'Sem conversas arquivadas'
                : 'Sem conversas'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

