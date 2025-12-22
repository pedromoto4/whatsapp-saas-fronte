import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar, DateData } from 'react-native-calendars';
import { authFetch } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';
import { RecurringAvailability, AvailabilityException } from '@/types';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Modal,
  Select,
  SelectItem,
  Switch,
} from '@/components/ui';

const DAYS_OF_WEEK = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

const DAY_OPTIONS: SelectItem[] = DAYS_OF_WEEK.map((day, index) => ({
  label: day,
  value: index.toString(),
}));

const SLOT_DURATION_OPTIONS: SelectItem[] = [
  { label: '15 minutos', value: '15' },
  { label: '30 minutos', value: '30' },
  { label: '45 minutos', value: '45' },
  { label: '60 minutos', value: '60' },
  { label: '90 minutos', value: '90' },
  { label: '120 minutos', value: '120' },
];

export default function AvailabilityPage() {
  const [recurringAvailability, setRecurringAvailability] = useState<RecurringAvailability[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Recurring availability modal
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringAvailability | null>(null);
  const [recurringFormData, setRecurringFormData] = useState({
    day_of_week: '0',
    start_time: '09:00',
    end_time: '18:00',
    slot_duration_minutes: '30',
    is_active: true,
  });

  // Exception modal
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [editingException, setEditingException] = useState<AvailabilityException | null>(null);
  const [exceptionFormData, setExceptionFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    is_blocked: false,
    custom_slots: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load data
  const loadRecurringAvailability = async () => {
    try {
      const response = await authFetch(API_ENDPOINTS.AVAILABILITY_RECURRING);
      if (response.ok) {
        const data = await response.json();
        setRecurringAvailability(Array.isArray(data) ? data : []);
      } else {
        console.error('Error loading recurring availability:', response.status);
      }
    } catch (error) {
      console.error('Error loading recurring availability:', error);
    }
  };

  const loadExceptions = async () => {
    try {
      const response = await authFetch(API_ENDPOINTS.AVAILABILITY_EXCEPTIONS);
      if (response.ok) {
        const data = await response.json();
        setExceptions(Array.isArray(data) ? data : []);
      } else {
        console.error('Error loading exceptions:', response.status);
      }
    } catch (error) {
      console.error('Error loading exceptions:', error);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadRecurringAvailability(), loadExceptions()]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  // Recurring availability handlers
  const openCreateRecurringModal = () => {
    setEditingRecurring(null);
    setRecurringFormData({
      day_of_week: '0',
      start_time: '09:00',
      end_time: '18:00',
      slot_duration_minutes: '30',
      is_active: true,
    });
    setShowRecurringModal(true);
  };

  const openEditRecurringModal = (availability: RecurringAvailability) => {
    setEditingRecurring(availability);
    setRecurringFormData({
      day_of_week: availability.day_of_week.toString(),
      start_time: availability.start_time,
      end_time: availability.end_time,
      slot_duration_minutes: availability.slot_duration_minutes.toString(),
      is_active: availability.is_active,
    });
    setShowRecurringModal(true);
  };

  const handleSaveRecurring = async () => {
    // Validate and format times
    const startTime = formatTimeOnBlur(recurringFormData.start_time, '09:00');
    const endTime = formatTimeOnBlur(recurringFormData.end_time, '18:00');

    // Ensure times are in correct format
    if (!startTime.match(/^\d{2}:\d{2}$/)) {
      Alert.alert('Erro', 'Por favor, insira uma hora de início válida (HH:MM)');
      return;
    }

    if (!endTime.match(/^\d{2}:\d{2}$/)) {
      Alert.alert('Erro', 'Por favor, insira uma hora de fim válida (HH:MM)');
      return;
    }

    try {
      const url = editingRecurring
        ? API_ENDPOINTS.AVAILABILITY_RECURRING_DETAIL(editingRecurring.id)
        : API_ENDPOINTS.AVAILABILITY_RECURRING;

      const method = editingRecurring ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          day_of_week: parseInt(recurringFormData.day_of_week),
          start_time: startTime,
          end_time: endTime,
          slot_duration_minutes: parseInt(recurringFormData.slot_duration_minutes),
          is_active: recurringFormData.is_active,
        }),
      });

      if (response.ok) {
        Alert.alert('Sucesso', editingRecurring ? 'Horário atualizado!' : 'Horário criado!');
        setShowRecurringModal(false);
        setEditingRecurring(null);
        loadRecurringAvailability();
      } else {
        const errorText = await response.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { detail: errorText || 'Erro ao salvar horário' };
        }
        Alert.alert('Erro', error.detail || 'Erro ao salvar horário');
      }
    } catch (error) {
      console.error('Error saving recurring availability:', error);
      Alert.alert('Erro', 'Erro de conexão');
    }
  };

  const handleDeleteRecurring = (id: number) => {
    Alert.alert(
      'Eliminar Horário',
      'Tem certeza que deseja eliminar este horário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await authFetch(API_ENDPOINTS.AVAILABILITY_RECURRING_DETAIL(id), {
                method: 'DELETE',
              });

              if (response.ok) {
                Alert.alert('Sucesso', 'Horário eliminado!');
                loadRecurringAvailability();
              } else {
                Alert.alert('Erro', 'Erro ao eliminar horário');
              }
            } catch (error) {
              console.error('Error deleting recurring availability:', error);
              Alert.alert('Erro', 'Erro de conexão');
            }
          },
        },
      ]
    );
  };

  const handleToggleRecurringActive = async (availability: RecurringAvailability) => {
    try {
      const response = await authFetch(API_ENDPOINTS.AVAILABILITY_RECURRING_DETAIL(availability.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          day_of_week: availability.day_of_week,
          start_time: availability.start_time,
          end_time: availability.end_time,
          slot_duration_minutes: availability.slot_duration_minutes,
          is_active: !availability.is_active,
        }),
      });

      if (response.ok) {
        loadRecurringAvailability();
      } else {
        Alert.alert('Erro', 'Erro ao atualizar disponibilidade');
      }
    } catch (error) {
      console.error('Error toggling recurring availability:', error);
      Alert.alert('Erro', 'Erro de conexão');
    }
  };

  // Exception handlers
  const openCreateExceptionModal = () => {
    setEditingException(null);
    setExceptionFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      is_blocked: false,
      custom_slots: '',
    });
    setShowExceptionModal(true);
  };

  const openEditExceptionModal = (exception: AvailabilityException) => {
    setEditingException(exception);
    setExceptionFormData({
      date: format(new Date(exception.date), 'yyyy-MM-dd'),
      is_blocked: exception.is_blocked,
      custom_slots: exception.custom_slots || '',
    });
    setShowExceptionModal(true);
  };

  const handleSaveException = async () => {
    try {
      const url = editingException
        ? API_ENDPOINTS.AVAILABILITY_EXCEPTION_DETAIL(editingException.id)
        : API_ENDPOINTS.AVAILABILITY_EXCEPTIONS;

      const method = editingException ? 'PUT' : 'POST';

      // Convert date to ISO string with time (midday to avoid timezone issues)
      const dateObj = new Date(exceptionFormData.date);
      dateObj.setHours(12, 0, 0, 0); // Set to midday
      const dateISO = dateObj.toISOString();

      const response = await authFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: dateISO,
          is_blocked: exceptionFormData.is_blocked,
          custom_slots: exceptionFormData.custom_slots || null,
        }),
      });

      if (response.ok) {
        Alert.alert('Sucesso', editingException ? 'Exceção atualizada!' : 'Exceção criada!');
        setShowExceptionModal(false);
        setEditingException(null);
        loadExceptions();
      } else {
        const errorText = await response.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { detail: errorText || 'Erro ao salvar exceção' };
        }
        Alert.alert('Erro', error.detail || 'Erro ao salvar exceção');
      }
    } catch (error) {
      console.error('Error saving exception:', error);
      Alert.alert('Erro', 'Erro de conexão');
    }
  };

  const handleDeleteException = (id: number) => {
    Alert.alert(
      'Eliminar Exceção',
      'Tem certeza que deseja eliminar esta exceção?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await authFetch(API_ENDPOINTS.AVAILABILITY_EXCEPTION_DETAIL(id), {
                method: 'DELETE',
              });

              if (response.ok) {
                Alert.alert('Sucesso', 'Exceção eliminada!');
                loadExceptions();
              } else {
                Alert.alert('Erro', 'Erro ao eliminar exceção');
              }
            } catch (error) {
              console.error('Error deleting exception:', error);
              Alert.alert('Erro', 'Erro de conexão');
            }
          },
        },
      ]
    );
  };

  // Format time input (HH:MM) with smart validation
  // Allows natural typing: 9 -> 09: -> 09:3 -> 09:30
  const formatTimeInput = (text: string): string => {
    // Remove all non-numeric characters
    const digitsOnly = text.replace(/\D/g, '');
    
    // Allow empty string for easy deletion
    if (digitsOnly === '') {
      return '';
    }

    // Limit to 4 digits (HHMM format)
    const digits = digitsOnly.substring(0, 4);

    // 1 digit: just return it (user is starting to type)
    if (digits.length === 1) {
      return digits;
    }

    // 2 digits: treat as hours, add colon
    if (digits.length === 2) {
      const hours = parseInt(digits);
      // If hours > 23, cap at 23
      if (hours > 23) {
        return '23:';
      }
      return `${digits}:`;
    }

    // 3 digits: HH + first minute digit
    if (digits.length === 3) {
      const hoursStr = digits.substring(0, 2);
      const firstMinute = parseInt(digits[2]);
      
      let hours = parseInt(hoursStr);
      if (hours > 23) {
        // If hours > 23, use first digit as hour
        hours = parseInt(hoursStr[0]);
        const remaining = hoursStr[1] + digits[2];
        const newHours = parseInt(remaining.substring(0, 2));
        if (newHours > 23) {
          return `${hours}0:`;
        }
        return `${String(newHours).padStart(2, '0')}:`;
      }
      
      // Validate first minute digit (0-5)
      if (firstMinute > 5) {
        return `${String(hours).padStart(2, '0')}:0`;
      }
      return `${String(hours).padStart(2, '0')}:${firstMinute}`;
    }

    // 4 digits: HHMM format
    const hoursStr = digits.substring(0, 2);
    const minutesStr = digits.substring(2);

    let hours = parseInt(hoursStr);
    let minutes = parseInt(minutesStr);

    // Validate hours (0-23)
    if (hours > 23) {
      // If hours > 23, use first digit as hour, rest as minutes
      hours = parseInt(hoursStr[0]);
      const remaining = hoursStr[1] + minutesStr;
      minutes = parseInt(remaining);
      if (minutes > 59) minutes = 59;
      return `${hours}${String(minutes).padStart(2, '0')}`;
    }

    // Validate minutes (0-59)
    if (minutes > 59) {
      minutes = 59;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Validate and format time on blur
  const formatTimeOnBlur = (time: string, defaultValue: string = '09:00'): string => {
    if (!time || time === ':' || time.trim() === '') {
      return defaultValue;
    }

    // Remove all non-numeric characters
    const digitsOnly = time.replace(/\D/g, '');
    
    if (digitsOnly.length === 0) {
      return defaultValue;
    }

    // Parse hours and minutes
    let hours = 0;
    let minutes = 0;

    if (digitsOnly.length <= 2) {
      // Only hours provided
      hours = parseInt(digitsOnly) || 0;
      if (hours > 23) hours = 23;
      minutes = 0;
    } else if (digitsOnly.length === 3) {
      // 3 digits: first 2 are hours, last is first minute digit
      hours = parseInt(digitsOnly.substring(0, 2)) || 0;
      if (hours > 23) hours = 23;
      const firstMinute = parseInt(digitsOnly[2]) || 0;
      if (firstMinute > 5) {
        minutes = 0;
      } else {
        minutes = firstMinute * 10;
      }
    } else {
      // 4 digits: HHMM
      hours = parseInt(digitsOnly.substring(0, 2)) || 0;
      minutes = parseInt(digitsOnly.substring(2)) || 0;
      if (hours > 23) hours = 23;
      if (minutes > 59) minutes = 59;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Render recurring availability item
  const renderRecurringItem = (item: RecurringAvailability) => {
    const dayName = DAYS_OF_WEEK[item.day_of_week];
    return (
      <Card key={item.id} style={styles.itemCard}>
        <CardContent>
          <View style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{dayName}</Text>
                <Badge variant={item.is_active ? 'default' : 'secondary'}>
                  {item.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </View>
              <Text style={styles.itemSubtitle}>
                {item.start_time} - {item.end_time}
              </Text>
              <Text style={styles.itemDetail}>
                Duração do slot: {item.slot_duration_minutes} minutos
              </Text>
            </View>
            <View style={styles.itemActions}>
              <Switch
                value={item.is_active}
                onValueChange={() => handleToggleRecurringActive(item)}
              />
              <TouchableOpacity
                onPress={() => openEditRecurringModal(item)}
                style={styles.actionButton}
              >
                <Ionicons name="pencil-outline" size={20} color="#8696A0" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteRecurring(item.id)}
                style={styles.actionButton}
              >
                <Ionicons name="trash-outline" size={20} color="#F15C6D" />
              </TouchableOpacity>
            </View>
          </View>
        </CardContent>
      </Card>
    );
  };

  // Render exception item
  const renderExceptionItem = (item: AvailabilityException) => {
    const date = new Date(item.date);
    return (
      <Card key={item.id} style={styles.itemCard}>
        <CardContent>
          <View style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>
                  {format(date, "dd 'de' MMMM 'de' yyyy", { locale: pt })}
                </Text>
                <Badge variant={item.is_blocked ? 'destructive' : 'default'}>
                  {item.is_blocked ? 'Bloqueado' : 'Horários Especiais'}
                </Badge>
              </View>
              {item.custom_slots && !item.is_blocked && (
                <Text style={styles.itemSubtitle}>
                  Slots: {item.custom_slots}
                </Text>
              )}
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity
                onPress={() => openEditExceptionModal(item)}
                style={styles.actionButton}
              >
                <Ionicons name="pencil-outline" size={20} color="#8696A0" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteException(item.id)}
                style={styles.actionButton}
              >
                <Ionicons name="trash-outline" size={20} color="#F15C6D" />
              </TouchableOpacity>
            </View>
          </View>
        </CardContent>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Disponibilidade</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#25D366" />}
      >
        {/* Recurring Availability Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Horários Recorrentes</Text>
            <Button
              size="sm"
              onPress={openCreateRecurringModal}
              leftIcon={<Ionicons name="add" size={16} color="#FFFFFF" />}
            >
              Adicionar
            </Button>
          </View>
          <Text style={styles.sectionDescription}>
            Configure horários de disponibilidade por dia da semana
          </Text>

          {loading ? (
            <View style={styles.centerContainer}>
              <Text style={styles.loadingText}>Carregando...</Text>
            </View>
          ) : recurringAvailability.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="time-outline" size={48} color="#54656F" />
              <Text style={styles.emptyText}>Nenhum horário configurado</Text>
              <Text style={styles.emptySubtext}>
                Adicione horários para definir sua disponibilidade semanal
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {recurringAvailability.map(renderRecurringItem)}
            </View>
          )}
        </View>

        {/* Exceptions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exceções</Text>
            <Button
              size="sm"
              onPress={openCreateExceptionModal}
              leftIcon={<Ionicons name="add" size={16} color="#FFFFFF" />}
            >
              Adicionar
            </Button>
          </View>
          <Text style={styles.sectionDescription}>
            Configure datas específicas (bloqueios ou horários especiais)
          </Text>

          {loading ? (
            <View style={styles.centerContainer}>
              <Text style={styles.loadingText}>Carregando...</Text>
            </View>
          ) : exceptions.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="calendar-outline" size={48} color="#54656F" />
              <Text style={styles.emptyText}>Nenhuma exceção configurada</Text>
              <Text style={styles.emptySubtext}>
                Adicione exceções para datas específicas
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {exceptions.map(renderExceptionItem)}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Recurring Availability Modal */}
      <Modal
        visible={showRecurringModal}
        onClose={() => {
          setShowRecurringModal(false);
          setEditingRecurring(null);
        }}
        title={editingRecurring ? 'Editar Horário' : 'Novo Horário'}
        description={editingRecurring ? 'Atualize as informações do horário' : 'Configure um novo horário recorrente'}
      >
        <View style={styles.form}>
          <View style={styles.formField}>
            <Text style={styles.label}>Dia da Semana *</Text>
            <Select
              value={recurringFormData.day_of_week}
              onValueChange={(value) => setRecurringFormData({ ...recurringFormData, day_of_week: value })}
              items={DAY_OPTIONS}
              placeholder="Selecione o dia"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Hora de Início *</Text>
            <Input
              value={recurringFormData.start_time}
              onChangeText={(text) => {
                const formatted = formatTimeInput(text, recurringFormData.start_time);
                setRecurringFormData({ ...recurringFormData, start_time: formatted });
              }}
              onBlur={() => {
                const formatted = formatTimeOnBlur(recurringFormData.start_time, '09:00');
                setRecurringFormData({ ...recurringFormData, start_time: formatted });
              }}
              placeholder="09:00"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Hora de Fim *</Text>
            <Input
              value={recurringFormData.end_time}
              onChangeText={(text) => {
                const formatted = formatTimeInput(text, recurringFormData.end_time);
                setRecurringFormData({ ...recurringFormData, end_time: formatted });
              }}
              onBlur={() => {
                const formatted = formatTimeOnBlur(recurringFormData.end_time, '18:00');
                setRecurringFormData({ ...recurringFormData, end_time: formatted });
              }}
              placeholder="18:00"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Duração do Slot *</Text>
            <Select
              value={recurringFormData.slot_duration_minutes}
              onValueChange={(value) => setRecurringFormData({ ...recurringFormData, slot_duration_minutes: value })}
              items={SLOT_DURATION_OPTIONS}
              placeholder="Selecione a duração"
            />
          </View>

          <View style={styles.formField}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Ativo</Text>
              <Switch
                value={recurringFormData.is_active}
                onValueChange={(value) => setRecurringFormData({ ...recurringFormData, is_active: value })}
              />
            </View>
          </View>

          <View style={styles.formActions}>
            <Button
              variant="outline"
              onPress={() => {
                setShowRecurringModal(false);
                setEditingRecurring(null);
              }}
            >
              Cancelar
            </Button>
            <Button onPress={handleSaveRecurring}>Salvar</Button>
          </View>
        </View>
      </Modal>

      {/* Exception Modal */}
      <Modal
        visible={showExceptionModal}
        onClose={() => {
          setShowExceptionModal(false);
          setEditingException(null);
        }}
        title={editingException ? 'Editar Exceção' : 'Nova Exceção'}
        description={editingException ? 'Atualize as informações da exceção' : 'Configure uma exceção para uma data específica'}
      >
        <View style={styles.form}>
          <View style={styles.formField}>
            <Text style={styles.label}>Data *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#8696A0" />
              <Text style={styles.dateButtonText}>
                {format(new Date(exceptionFormData.date), "dd 'de' MMMM 'de' yyyy", { locale: pt })}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <Modal
              visible={showDatePicker}
              onClose={() => setShowDatePicker(false)}
              title="Selecionar Data"
            >
              <View style={styles.datePickerContainer}>
                <Calendar
                  current={exceptionFormData.date}
                  markedDates={{
                    [exceptionFormData.date]: {
                      selected: true,
                      selectedColor: '#25D366',
                    },
                  }}
                  onDayPress={(day: DateData) => {
                    setExceptionFormData({ ...exceptionFormData, date: day.dateString });
                    setShowDatePicker(false);
                  }}
                  theme={{
                    backgroundColor: '#1F2C33',
                    calendarBackground: '#1F2C33',
                    textSectionTitleColor: '#8696A0',
                    selectedDayBackgroundColor: '#25D366',
                    selectedDayTextColor: '#FFFFFF',
                    todayTextColor: '#25D366',
                    dayTextColor: '#E9EDEF',
                    textDisabledColor: '#54656F',
                    arrowColor: '#25D366',
                    monthTextColor: '#E9EDEF',
                    textDayFontSize: 16,
                    textMonthFontSize: 18,
                    textDayHeaderFontSize: 14,
                  }}
                />
              </View>
            </Modal>
          )}

          <View style={styles.formField}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.label}>Dia Bloqueado</Text>
                <Text style={styles.switchDescription}>
                  Se ativado, este dia estará completamente bloqueado
                </Text>
              </View>
              <Switch
                value={exceptionFormData.is_blocked}
                onValueChange={(value) => setExceptionFormData({ ...exceptionFormData, is_blocked: value })}
              />
            </View>
          </View>

          {!exceptionFormData.is_blocked && (
            <View style={styles.formField}>
              <Text style={styles.label}>Slots Personalizados (JSON)</Text>
              <Input
                value={exceptionFormData.custom_slots}
                onChangeText={(text) => setExceptionFormData({ ...exceptionFormData, custom_slots: text })}
                placeholder='Ex: ["09:00", "10:00", "14:00", "15:00"]'
                multiline
                numberOfLines={4}
                containerStyle={{ marginBottom: 0 }}
                style={styles.textArea}
              />
              <Text style={styles.helperText}>
                Formato: array JSON com horários no formato HH:MM
              </Text>
            </View>
          )}

          <View style={styles.formActions}>
            <Button
              variant="outline"
              onPress={() => {
                setShowExceptionModal(false);
                setEditingException(null);
              }}
            >
              Cancelar
            </Button>
            <Button onPress={handleSaveException}>Salvar</Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B141A',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A373F',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#25D366',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#E9EDEF',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8696A0',
    marginBottom: 16,
  },
  itemsList: {
    gap: 12,
  },
  itemCard: {
    marginBottom: 0,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E9EDEF',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#8696A0',
  },
  itemDetail: {
    fontSize: 12,
    color: '#54656F',
    marginTop: 4,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  centerContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#8696A0',
  },
  emptyText: {
    fontSize: 16,
    color: '#54656F',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#54656F',
    textAlign: 'center',
    marginTop: 4,
  },
  form: {
    gap: 20,
  },
  formField: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E9EDEF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchDescription: {
    fontSize: 12,
    color: '#8696A0',
    marginTop: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1F2C33',
    borderWidth: 1,
    borderColor: '#2A373F',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#E9EDEF',
    flex: 1,
  },
  datePickerContainer: {
    gap: 20,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#8696A0',
    marginTop: 4,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});

