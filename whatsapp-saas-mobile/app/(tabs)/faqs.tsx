import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { authFetch } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';
import { FAQ } from '@/types';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Modal as UIModal,
  Input,
  Textarea,
} from '@/components/ui';

interface FAQFormData {
  question: string;
  answer: string;
  keywords: string;
}

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<FAQFormData>({
    question: '',
    answer: '',
    keywords: '',
  });

  // Load FAQs
  const loadFaqs = async () => {
    try {
      setLoading(true);
      const response = await authFetch(API_ENDPOINTS.FAQS);

      if (response.ok) {
        const data = await response.json();
        setFaqs(Array.isArray(data) ? data : []);
        setFilteredFaqs(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Erro', errorData.detail || 'Não foi possível carregar as FAQs.');
      }
    } catch (error) {
      console.error('Error loading FAQs:', error);
      Alert.alert('Erro', 'Erro de conexão.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter FAQs based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFaqs(faqs);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query) ||
        (faq.keywords && faq.keywords.toLowerCase().includes(query))
    );
    setFilteredFaqs(filtered);
  }, [searchQuery, faqs]);

  // Create/Update FAQ
  const saveFaq = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      Alert.alert('Erro', 'Por favor, preencha a pergunta e a resposta.');
      return;
    }

    try {
      const url = editingFaq
        ? API_ENDPOINTS.FAQ_DETAIL(editingFaq.id)
        : API_ENDPOINTS.FAQS;

      const method = editingFaq ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: formData.question.trim(),
          answer: formData.answer.trim(),
          keywords: formData.keywords.trim() || null,
        }),
      });

      if (response.ok) {
        Alert.alert('Sucesso', editingFaq ? 'FAQ atualizada!' : 'FAQ criada!');
        setShowModal(false);
        resetForm();
        loadFaqs();
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Erro', errorData.detail || 'Não foi possível salvar a FAQ.');
      }
    } catch (error) {
      console.error('Error saving FAQ:', error);
      Alert.alert('Erro', 'Erro de conexão.');
    }
  };

  // Delete FAQ
  const deleteFaq = (faq: FAQ) => {
    Alert.alert(
      'Confirmar',
      'Tem certeza que deseja eliminar esta FAQ?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await authFetch(
                API_ENDPOINTS.FAQ_DETAIL(faq.id),
                {
                  method: 'DELETE',
                }
              );

              if (response.ok) {
                Alert.alert('Sucesso', 'FAQ eliminada!');
                loadFaqs();
              } else {
                const errorData = await response.json().catch(() => ({}));
                Alert.alert('Erro', errorData.detail || 'Não foi possível eliminar a FAQ.');
              }
            } catch (error) {
              console.error('Error deleting FAQ:', error);
              Alert.alert('Erro', 'Erro de conexão.');
            }
          },
        },
      ]
    );
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      question: '',
      answer: '',
      keywords: '',
    });
    setEditingFaq(null);
  };

  // Open create modal
  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      keywords: faq.keywords || '',
    });
    setShowModal(true);
  };

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadFaqs();
  };

  // Load FAQs on mount
  useEffect(() => {
    loadFaqs();
  }, []);

  // Render FAQ item
  const renderFAQItem = ({ item }: { item: FAQ }) => {
    const keywords = item.keywords
      ? item.keywords.split(',').map((k) => k.trim()).filter((k) => k)
      : [];

    return (
      <Card style={styles.faqCard}>
        <CardHeader>
          <View style={styles.faqHeader}>
            <View style={styles.faqContent}>
              <CardTitle style={styles.faqQuestion}>{item.question}</CardTitle>
              <CardDescription style={styles.faqAnswer} numberOfLines={3}>
                {item.answer}
              </CardDescription>
            </View>
            <View style={styles.faqActions}>
              <TouchableOpacity
                onPress={() => openEditModal(item)}
                style={styles.actionButton}
              >
                <Ionicons name="pencil" size={20} color="#25D366" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteFaq(item)}
                style={styles.actionButton}
              >
                <Ionicons name="trash" size={20} color="#F15C6D" />
              </TouchableOpacity>
            </View>
          </View>
          {keywords.length > 0 && (
            <View style={styles.keywordsContainer}>
              {keywords.map((keyword, index) => (
                <Badge key={index} variant="secondary" style={styles.keywordBadge}>
                  {keyword}
                </Badge>
              ))}
            </View>
          )}
        </CardHeader>
      </Card>
    );
  };

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="help-circle-outline" size={64} color="#8696A0" />
      <Text style={styles.emptyTitle}>Nenhuma FAQ criada</Text>
      <Text style={styles.emptyDescription}>
        Crie sua primeira FAQ para começar a responder automaticamente
      </Text>
      <Button onPress={openCreateModal} style={styles.emptyButton} leftIcon={<Ionicons name="add" size={20} color="#FFFFFF" />}>
        Criar Primeira FAQ
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Gestão de FAQs</Text>
        <Button onPress={openCreateModal} style={styles.createButton} leftIcon={<Ionicons name="add" size={20} color="#FFFFFF" />}>
          Nova FAQ
        </Button>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8696A0" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar FAQs..."
          placeholderTextColor="#8696A0"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#8696A0" />
          </TouchableOpacity>
        )}
      </View>

      {/* FAQs List */}
      {loading && faqs.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando FAQs...</Text>
        </View>
      ) : filteredFaqs.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredFaqs}
          renderItem={renderFAQItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#25D366"
            />
          }
          ListEmptyComponent={
            searchQuery ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={64} color="#8696A0" />
                <Text style={styles.emptyTitle}>Nenhuma FAQ encontrada</Text>
                <Text style={styles.emptyDescription}>
                  Tente pesquisar com outros termos
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Create/Edit Modal */}
      <UIModal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingFaq ? 'Editar FAQ' : 'Nova FAQ'}
        description="Configure a pergunta, resposta e palavras-chave para resposta automática"
      >
        <View style={styles.modalContent}>
          <Input
            label="Pergunta"
            placeholder="Ex: Qual o horário de funcionamento?"
            value={formData.question}
            onChangeText={(text) => setFormData({ ...formData, question: text })}
          />

          <Textarea
            label="Resposta"
            placeholder="Ex: Funcionamos de segunda a sexta, das 9h às 18h."
            value={formData.answer}
            onChangeText={(text) => setFormData({ ...formData, answer: text })}
            rows={4}
          />

          <Input
            label="Palavras-chave"
            placeholder="Ex: horário, funcionamento, horas, aberto"
            value={formData.keywords}
            onChangeText={(text) => setFormData({ ...formData, keywords: text })}
          />
          <Text style={styles.helperText}>
            Separe as palavras-chave por vírgula
          </Text>

          <View style={styles.modalActions}>
            <Button
              variant="outline"
              onPress={() => {
                setShowModal(false);
                resetForm();
              }}
              style={styles.cancelButton}
            >
              Cancelar
            </Button>
            <Button onPress={saveFaq} style={styles.saveButton}>
              {editingFaq ? 'Atualizar' : 'Criar'} FAQ
            </Button>
          </View>
        </View>
      </UIModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B141A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A373F',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#E9EDEF',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2C33',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A373F',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#E9EDEF',
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8696A0',
    fontSize: 16,
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
  },
  faqCard: {
    marginBottom: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  faqContent: {
    flex: 1,
    marginRight: 12,
  },
  faqQuestion: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E9EDEF',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#8696A0',
    lineHeight: 20,
  },
  faqActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  keywordBadge: {
    marginRight: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#E9EDEF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#8696A0',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalContent: {
    gap: 0,
  },
  helperText: {
    fontSize: 12,
    color: '#8696A0',
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
});

