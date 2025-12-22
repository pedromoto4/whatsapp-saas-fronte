import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { authFetch } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Conversation } from '@/types';
import {
  Modal,
  Input,
  Textarea,
  Button,
  Switch,
  Badge,
} from '@/components/ui';

interface ContactInfoProps {
  conversation: Conversation;
  messageCount: number;
  visible: boolean;
  onClose: () => void;
  onContactUpdated?: () => void;
}

interface ContactData {
  phone_number: string;
  name?: string;
  verified_name?: string;
  profile_picture_url?: string;
  database_name?: string;
  tags?: string;
}

interface AISetting {
  ai_enabled: boolean;
  source: 'user' | 'contact';
  contact_override: boolean | null;
}

export default function ContactInfo({
  conversation,
  messageCount,
  visible,
  onClose,
  onContactUpdated,
}: ContactInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [name, setName] = useState(conversation.contact_name || '');
  const [contactData, setContactData] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiSetting, setAiSetting] = useState<AISetting | null>(null);
  const [loadingAI, setLoadingAI] = useState(true);
  const [savingAI, setSavingAI] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load contact info
  useEffect(() => {
    if (visible && conversation.phone_number) {
      loadContactInfo();
      loadAISetting();
    }
  }, [visible, conversation.phone_number]);

  const loadContactInfo = async () => {
    try {
      setLoading(true);
      const response = await authFetch(
        API_ENDPOINTS.CONVERSATION_INFO(conversation.phone_number)
      );

      if (response.ok) {
        const data = await response.json();
        setContactData(data);

        // Use WhatsApp name or database name if available
        if (data.database_name) {
          setName(data.database_name);
        } else if (data.name && data.name !== conversation.phone_number) {
          setName(data.name);
        }

        // Load notes from contact if exists in database
        // Try to get contact from database to get notes
        try {
          const contactsResponse = await authFetch(API_ENDPOINTS.CONTACTS);
          if (contactsResponse.ok) {
            const contactsData = await contactsResponse.json();
            const contacts = Array.isArray(contactsData)
              ? contactsData
              : contactsData.contacts || [];
            const existingContact = contacts.find(
              (c: any) => c.phone_number === conversation.phone_number
            );
            if (existingContact && existingContact.notes) {
              setNotes(existingContact.notes);
            }
          }
        } catch (error) {
          console.error('Error loading contact notes:', error);
        }
      }
    } catch (error) {
      console.error('Error loading contact info:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAISetting = async () => {
    try {
      setLoadingAI(true);
      const response = await authFetch(
        API_ENDPOINTS.CONVERSATION_AI_ENABLED(conversation.phone_number)
      );

      if (response.ok) {
        const data = await response.json();
        setAiSetting({
          ai_enabled: data.ai_enabled,
          source: data.source,
          contact_override: data.contact_override,
        });
      }
    } catch (error) {
      console.error('Error loading AI setting:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleToggleAI = async (enabled: boolean | null) => {
    setSavingAI(true);
    try {
      const response = await authFetch(
        API_ENDPOINTS.CONVERSATION_AI_ENABLED(conversation.phone_number),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ enabled }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAiSetting({
          ai_enabled: data.ai_enabled,
          source: enabled === null ? 'user' : 'contact',
          contact_override: enabled,
        });
        Alert.alert('Sucesso', data.message || 'Configuração atualizada');
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Erro', errorData.detail || 'Erro ao atualizar configuração');
      }
    } catch (error) {
      console.error('Error updating AI setting:', error);
      Alert.alert('Erro', 'Erro de conexão');
    } finally {
      setSavingAI(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'O nome não pode estar vazio');
      return;
    }

    setSaving(true);
    try {
      // First, get or create the contact
      let contactId: number | null = null;

      try {
        const getContactResponse = await authFetch(API_ENDPOINTS.CONTACTS);

        if (getContactResponse.ok) {
          const contactsData = await getContactResponse.json();
          // API can return { contacts: [...] } or direct array
          const contacts = Array.isArray(contactsData)
            ? contactsData
            : contactsData.contacts || [];
          const existingContact = contacts.find(
            (c: any) => c.phone_number === conversation.phone_number
          );
          if (existingContact) {
            contactId = existingContact.id;
          }
        }
      } catch (error) {
        console.error('Error getting contacts:', error);
      }

      // If contact doesn't exist, create it
      if (!contactId) {
        const createResponse = await authFetch(API_ENDPOINTS.CONTACTS, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone_number: conversation.phone_number,
            name: name.trim(),
            notes: notes.trim() || null,
            tags: contactData?.tags || null,
          }),
        });

        if (createResponse.ok) {
          Alert.alert('Sucesso', 'Contacto criado com sucesso!');
          setIsEditing(false);
          if (onContactUpdated) onContactUpdated();
          loadContactInfo();
          return;
        } else {
          const errorData = await createResponse.json().catch(() => ({}));
          Alert.alert('Erro', errorData.detail || 'Erro ao criar contacto');
          return;
        }
      }

      // Update existing contact
      const updateResponse = await authFetch(API_ENDPOINTS.CONTACT_DETAIL(contactId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          notes: notes.trim() || null,
          tags: contactData?.tags || null,
        }),
      });

      if (updateResponse.ok) {
        Alert.alert('Sucesso', 'Informações atualizadas!');
        setIsEditing(false);
        setContactData((prev) =>
          prev ? { ...prev, database_name: name.trim() } : null
        );
        if (onContactUpdated) onContactUpdated();
      } else {
        const errorData = await updateResponse.json().catch(() => ({}));
        Alert.alert('Erro', errorData.detail || 'Erro ao atualizar contacto');
      }
    } catch (error) {
      console.error('Error saving contact info:', error);
      Alert.alert('Erro', 'Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const displayName =
    name ||
    conversation.contact_name ||
    contactData?.database_name ||
    contactData?.name ||
    conversation.phone_number;

  const displayPhone = conversation.phone_number;
  const tags = contactData?.tags
    ? contactData.tags.split(',').map((t) => t.trim()).filter((t) => t)
    : [];

  const aiEnabled = aiSetting?.contact_override;
  const aiSource = aiSetting?.source || 'user';

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Informações do Contacto"
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#25D366" />
            <Text style={styles.loadingText}>Carregando informações...</Text>
          </View>
        ) : (
          <>
            {/* Profile Section */}
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.nameSection}>
                {isEditing ? (
                  <Input
                    value={name}
                    onChangeText={setName}
                    placeholder="Nome do contacto"
                    style={styles.nameInput}
                    containerStyle={styles.nameInputContainer}
                  />
                ) : (
                  <Text style={styles.nameText}>{displayName}</Text>
                )}
                <Text style={styles.phoneText}>{displayPhone}</Text>
              </View>
            </View>

            {/* Tags */}
            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" style={styles.tag}>
                    {tag}
                  </Badge>
                ))}
              </View>
            )}

            {/* Contact Details */}
            <View style={styles.detailsSection}>
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={20} color="#8696A0" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Última conversa</Text>
                  <Text style={styles.detailValue}>
                    {format(
                      new Date(conversation.last_message_time),
                      "d 'de' MMMM 'às' HH:mm",
                      { locale: pt }
                    )}
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <Ionicons name="chatbubbles-outline" size={20} color="#8696A0" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Total de mensagens</Text>
                  <Text style={styles.detailValue}>{messageCount} mensagens</Text>
                </View>
              </View>
            </View>

            {/* AI Settings Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="flash-outline" size={20} color="#8696A0" />
                <Text style={styles.sectionTitle}>Respostas por IA</Text>
              </View>

              {loadingAI ? (
                <ActivityIndicator size="small" color="#25D366" style={styles.aiLoading} />
              ) : (
                <View style={styles.aiContent}>
                  <View style={styles.aiToggleRow}>
                    <View style={styles.aiToggleInfo}>
                      <Text style={styles.aiToggleLabel}>
                        {aiEnabled === null
                          ? 'Usar configuração global'
                          : aiEnabled
                          ? 'Ativado para este contacto'
                          : 'Desativado para este contacto'}
                      </Text>
                      <Text style={styles.aiToggleDescription}>
                        {aiEnabled === null
                          ? 'Usa a configuração geral das Definições'
                          : aiEnabled
                          ? 'Este contacto receberá respostas por IA mesmo se desativado globalmente'
                          : 'Este contacto NÃO receberá respostas por IA mesmo se ativado globalmente'}
                      </Text>
                    </View>
                    {aiSource === 'contact' && (
                      <Switch
                        value={aiEnabled === true}
                        onValueChange={(value) => handleToggleAI(value)}
                        disabled={savingAI}
                      />
                    )}
                  </View>

                  <View style={styles.aiButtons}>
                    <Button
                      variant={aiEnabled === null ? 'default' : 'outline'}
                      onPress={() => handleToggleAI(null)}
                      disabled={savingAI}
                      style={styles.aiButton}
                    >
                      Global
                    </Button>
                    <Button
                      variant={aiEnabled === true ? 'default' : 'outline'}
                      onPress={() => handleToggleAI(true)}
                      disabled={savingAI}
                      style={styles.aiButton}
                    >
                      Ativar
                    </Button>
                    <Button
                      variant={aiEnabled === false ? 'default' : 'outline'}
                      onPress={() => handleToggleAI(false)}
                      disabled={savingAI}
                      style={styles.aiButton}
                    >
                      Desativar
                    </Button>
                  </View>
                </View>
              )}
            </View>

            {/* Notes Section */}
            <View style={styles.section}>
              <View style={styles.notesHeader}>
                <Text style={styles.sectionTitle}>Notas</Text>
                {isEditing ? (
                  <Button
                    onPress={handleSave}
                    disabled={saving}
                    style={styles.saveButton}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                        Guardar
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onPress={() => setIsEditing(true)}
                    style={styles.editButton}
                  >
                    <Ionicons name="pencil" size={16} color="#E9EDEF" style={{ marginRight: 4 }} />
                    Editar
                  </Button>
                )}
              </View>

              {isEditing ? (
                <Textarea
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Adicione notas sobre este contacto..."
                  rows={4}
                />
              ) : (
                <View style={styles.notesDisplay}>
                  <Text style={notes ? styles.notesText : styles.notesPlaceholder}>
                    {notes || 'Nenhuma nota adicionada ainda.'}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#8696A0',
    fontSize: 14,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#25D36630',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#25D366',
  },
  nameSection: {
    alignItems: 'center',
    width: '100%',
  },
  nameInputContainer: {
    width: '100%',
    marginBottom: 8,
  },
  nameInput: {
    textAlign: 'center',
    color: '#E9EDEF',
    fontSize: 20,
    fontWeight: '600',
  },
  nameText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#E9EDEF',
    marginBottom: 4,
  },
  phoneText: {
    fontSize: 14,
    color: '#8696A0',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    marginRight: 0,
  },
  detailsSection: {
    marginBottom: 24,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8696A0',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#E9EDEF',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E9EDEF',
  },
  aiLoading: {
    marginVertical: 16,
  },
  aiContent: {
    gap: 16,
  },
  aiToggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  aiToggleInfo: {
    flex: 1,
  },
  aiToggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E9EDEF',
    marginBottom: 4,
  },
  aiToggleDescription: {
    fontSize: 12,
    color: '#8696A0',
    lineHeight: 16,
  },
  aiButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  aiButton: {
    flex: 1,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  notesDisplay: {
    backgroundColor: '#1F2C33',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
  },
  notesText: {
    fontSize: 14,
    color: '#E9EDEF',
    lineHeight: 20,
  },
  notesPlaceholder: {
    fontSize: 14,
    color: '#8696A0',
    fontStyle: 'italic',
  },
});

