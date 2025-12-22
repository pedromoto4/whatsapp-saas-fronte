import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { authFetch } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Contact } from '@/types';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({
    phone_number: '',
    name: '',
    email: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadContacts = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const response = await authFetch(API_ENDPOINTS.CONTACTS);
      
      console.log('Contacts API Response Status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Contacts API Data:', data);
        // API returns { contacts: [...] }, extract the array
        const contactsArray = Array.isArray(data) ? data : (data.contacts || []);
        console.log('Contacts Count:', contactsArray.length);
        // Ensure data is always an array
        setContacts(contactsArray);
      } else {
        // On error, log the error
        const errorText = await response.text();
        console.error('Contacts API Error:', response.status, errorText);
        // On error, set empty array
        setContacts([]);
        if (!silent) {
          Alert.alert('Erro', `Não foi possível carregar os contactos. (${response.status})`);
        }
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      // Ensure contacts is always an array even on error
      setContacts([]);
      if (!silent) {
        Alert.alert('Erro', 'Erro de conexão.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadContacts();
  };

  const filteredContacts = (contacts || []).filter((contact) => {
    const matchesSearch =
      searchQuery === '' ||
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone_number.includes(searchQuery) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleAddContact = async () => {
    if (!newContact.phone_number) {
      Alert.alert('Erro', 'O número de telefone é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      const response = await authFetch(API_ENDPOINTS.CONTACTS, {
        method: 'POST',
        body: JSON.stringify(newContact),
      });

      if (response.ok) {
        Alert.alert('Sucesso', 'Contacto adicionado com sucesso!');
        setShowAddModal(false);
        setNewContact({ phone_number: '', name: '', email: '', notes: '' });
        loadContacts();
      } else {
        const error = await response.json();
        Alert.alert('Erro', error.detail || 'Não foi possível adicionar o contacto.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  const handleImportFromPhone = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permissão Negada',
        'É necessário permitir o acesso aos contactos para importar.'
      );
      return;
    }

    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Name],
      });

      if (data.length > 0) {
        // Show a picker to select contacts
        Alert.alert(
          'Importar Contactos',
          `Encontrados ${data.length} contactos no seu telefone. Deseja importar todos?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Importar',
              onPress: async () => {
                let imported = 0;
                let failed = 0;

                for (const contact of data.slice(0, 50)) { // Limit to 50 for safety
                  if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
                    try {
                      const response = await authFetch(API_ENDPOINTS.CONTACTS, {
                        method: 'POST',
                        body: JSON.stringify({
                          phone_number: contact.phoneNumbers[0].number?.replace(/\D/g, '') || '',
                          name: contact.name || '',
                          email: contact.emails?.[0]?.email || '',
                        }),
                      });

                      if (response.ok) {
                        imported++;
                      } else {
                        failed++;
                      }
                    } catch {
                      failed++;
                    }
                  }
                }

                Alert.alert(
                  'Importação Concluída',
                  `Importados: ${imported}\nFalharam: ${failed}`
                );
                loadContacts();
              },
            },
          ]
        );
      } else {
        Alert.alert('Info', 'Não foram encontrados contactos no seu telefone.');
      }
    } catch (error) {
      console.error('Error importing contacts:', error);
      Alert.alert('Erro', 'Não foi possível aceder aos contactos.');
    }
  };

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2A373F',
      }}
      onPress={() => {
        // Show contact details (can be expanded later)
        Alert.alert(
          item.name || 'Contacto',
          `📱 ${item.phone_number}${item.email ? `\n📧 ${item.email}` : ''}${
            item.notes ? `\n📝 ${item.notes}` : ''
          }`
        );
      }}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View
        style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: '#128C7E30',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#128C7E' }}>
          {(item.name || item.phone_number).charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '500',
            color: '#E9EDEF',
            marginBottom: 4,
          }}
          numberOfLines={1}
        >
          {item.name || 'Sem nome'}
        </Text>
        <Text style={{ fontSize: 14, color: '#8696A0' }}>{item.phone_number}</Text>
        {item.email && (
          <Text style={{ fontSize: 12, color: '#8696A0', marginTop: 2 }}>{item.email}</Text>
        )}
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={() => {
            router.push({
              pathname: '/chat',
              params: { phone: item.phone_number },
            });
          }}
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: '#25D36620',
          }}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#25D366" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

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
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#25D366' }}>
            Contactos
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handleImportFromPhone}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: '#1F2C33',
              }}
            >
              <Ionicons name="phone-portrait-outline" size={24} color="#8696A0" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: '#25D366',
              }}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
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
            placeholder="Pesquisar contactos..."
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

        {/* Stats */}
        <Text style={{ fontSize: 12, color: '#8696A0', marginTop: 8 }}>
          {filteredContacts.length} contacto{filteredContacts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Contacts List */}
      <FlatList
        data={filteredContacts}
        renderItem={renderContactItem}
        keyExtractor={(item) => item.id.toString()}
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
            <Ionicons name="people-outline" size={64} color="#2A373F" />
            <Text style={{ fontSize: 18, color: '#8696A0', marginTop: 16 }}>
              {searchQuery ? 'Nenhum contacto encontrado' : 'Sem contactos'}
            </Text>
            <Button
              variant="outline"
              onPress={() => setShowAddModal(true)}
              style={{ marginTop: 16 }}
              leftIcon={<Ionicons name="add" size={20} color="#E9EDEF" />}
            >
              Adicionar Contacto
            </Button>
          </View>
        }
      />

      {/* Add Contact Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0B141A' }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#2A373F',
            }}
          >
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={{ fontSize: 16, color: '#8696A0' }}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#E9EDEF' }}>
              Novo Contacto
            </Text>
            <TouchableOpacity onPress={handleAddContact} disabled={saving}>
              <Text style={{ fontSize: 16, color: '#25D366', fontWeight: '600' }}>
                {saving ? 'A guardar...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ padding: 16, gap: 16 }}>
            <Input
              label="Número de Telefone *"
              placeholder="+351 912 345 678"
              value={newContact.phone_number}
              onChangeText={(text) =>
                setNewContact((prev) => ({ ...prev, phone_number: text }))
              }
              keyboardType="phone-pad"
              leftIcon={<Ionicons name="call-outline" size={20} color="#8696A0" />}
            />

            <Input
              label="Nome"
              placeholder="Nome do contacto"
              value={newContact.name}
              onChangeText={(text) =>
                setNewContact((prev) => ({ ...prev, name: text }))
              }
              leftIcon={<Ionicons name="person-outline" size={20} color="#8696A0" />}
            />

            <Input
              label="Email"
              placeholder="email@exemplo.com"
              value={newContact.email}
              onChangeText={(text) =>
                setNewContact((prev) => ({ ...prev, email: text }))
              }
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Ionicons name="mail-outline" size={20} color="#8696A0" />}
            />

            <Input
              label="Notas"
              placeholder="Notas adicionais..."
              value={newContact.notes}
              onChangeText={(text) =>
                setNewContact((prev) => ({ ...prev, notes: text }))
              }
              multiline
              numberOfLines={3}
              leftIcon={<Ionicons name="document-text-outline" size={20} color="#8696A0" />}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

