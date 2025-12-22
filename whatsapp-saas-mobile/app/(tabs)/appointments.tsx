import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authFetch } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Appointment, ServiceType, Contact } from '@/types';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Modal as UIModal,
  Select,
  SelectItem,
} from '@/components/ui';

type ViewMode = 'calendar' | 'list';

export default function AppointmentsPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ selectToday?: string }>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [monthAppointments, setMonthAppointments] = useState<Appointment[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempHour, setTempHour] = useState(9);
  const [tempMinute, setTempMinute] = useState(0);
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  const [formData, setFormData] = useState<{
    contact_id: string;
    service_type_id: string;
    scheduled_at: Date;
    notes: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  }>({
    contact_id: '',
    service_type_id: '',
    scheduled_at: new Date(),
    notes: '',
    status: 'pending',
  });

  // Load appointments for selected day
  const loadDayAppointments = async (date: Date) => {
    try {
      setLoading(true);
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const response = await authFetch(
        `${API_ENDPOINTS.APPOINTMENTS}?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`
      );

      if (response.ok) {
        const data = await response.json();
        setAppointments(Array.isArray(data) ? data : []);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar os agendamentos.');
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      Alert.alert('Erro', 'Erro de conexão.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load appointments for entire month
  const loadMonthAppointments = async (month: Date) => {
    try {
      const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);

      const response = await authFetch(
        `${API_ENDPOINTS.APPOINTMENTS}?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`
      );

      if (response.ok) {
        const data = await response.json();
        setMonthAppointments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading month appointments:', error);
    }
  };

  // Load service types
  const loadServiceTypes = async () => {
    try {
      const response = await authFetch(API_ENDPOINTS.APPOINTMENT_SERVICE_TYPES);
      if (response.ok) {
        const data = await response.json();
        setServiceTypes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading service types:', error);
    }
  };

  // Load contacts
  const loadContacts = async () => {
    try {
      const response = await authFetch(API_ENDPOINTS.CONTACTS);
      if (response.ok) {
        const data = await response.json();
        const contactsArray = Array.isArray(data) ? data : (data.contacts || []);
        setContacts(contactsArray);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  // Check if coming from dashboard - select today's date
  useEffect(() => {
    if (params?.selectToday === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setSelectedDate(today);
      setCurrentMonth(today);
      loadDayAppointments(today);
      loadMonthAppointments(today);
    }
  }, [params?.selectToday]);

  useEffect(() => {
    loadDayAppointments(selectedDate);
    loadServiceTypes();
    loadContacts();
  }, [selectedDate]);

  useEffect(() => {
    loadMonthAppointments(currentMonth);
  }, [currentMonth]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDayAppointments(selectedDate);
    loadMonthAppointments(currentMonth);
  };

  // Marked dates for calendar
  const markedDates = useMemo(() => {
    const marked: any = {};
    
    monthAppointments.forEach((apt) => {
      if (apt.status === 'cancelled') return;
      
      const dateKey = format(new Date(apt.scheduled_at), 'yyyy-MM-dd');
      if (!marked[dateKey]) {
        marked[dateKey] = {
          marked: true,
          dotColor: '#25D366',
          selected: dateKey === format(selectedDate, 'yyyy-MM-dd'),
          selectedColor: '#25D366',
        };
      }
    });

    // Mark selected date
    const selectedKey = format(selectedDate, 'yyyy-MM-dd');
    if (!marked[selectedKey]) {
      marked[selectedKey] = {
        selected: true,
        selectedColor: '#25D366',
      };
    }

    return marked;
  }, [monthAppointments, selectedDate]);

  const handleDateSelect = (day: DateData) => {
    const date = new Date(day.dateString);
    setSelectedDate(date);
  };

  const handleSave = async () => {
    if (!formData.contact_id) {
      Alert.alert('Erro', 'Por favor, selecione um contacto.');
      return;
    }

    try {
      const url = editingAppointment
        ? API_ENDPOINTS.APPOINTMENT_DETAIL(editingAppointment.id)
        : API_ENDPOINTS.APPOINTMENTS;

      const method = editingAppointment ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_id: parseInt(formData.contact_id),
          service_type_id: formData.service_type_id ? parseInt(formData.service_type_id) : null,
          scheduled_at: formData.scheduled_at.toISOString(),
          notes: formData.notes || null,
          status: formData.status,
        }),
      });

      if (response.ok) {
        Alert.alert('Sucesso', editingAppointment ? 'Agendamento atualizado!' : 'Agendamento criado!');
        setShowModal(false);
        setEditingAppointment(null);
        resetForm();
        loadDayAppointments(selectedDate);
        loadMonthAppointments(currentMonth);
      } else {
        const errorText = await response.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { detail: errorText || 'Erro ao salvar agendamento' };
        }
        
        const errorMessage = error.detail || 'Erro ao salvar agendamento';
        console.error('Appointment save error:', {
          status: response.status,
          error: errorMessage,
          scheduled_at: formData.scheduled_at.toISOString(),
          date: format(formData.scheduled_at, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt }),
          dayOfWeek: formData.scheduled_at.getDay(),
        });
        
        // Provide more helpful error message
        let userMessage = errorMessage;
        if (errorMessage.includes('not available') || errorMessage.includes('slot') || errorMessage.includes('disponível')) {
          const dayName = format(formData.scheduled_at, 'EEEE', { locale: pt });
          userMessage = `Este horário não está disponível.\n\n` +
            `Data/Hora: ${format(formData.scheduled_at, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}\n` +
            `Dia da semana: ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}\n\n` +
            `Possíveis causas:\n` +
            `• Não há disponibilidade configurada para ${dayName}\n` +
            `• O horário está no passado\n` +
            `• Há conflito com outro agendamento\n\n` +
            `Configure a disponibilidade em Definições > Disponibilidade primeiro.`;
        }
        
        Alert.alert('Erro ao Criar Agendamento', userMessage);
      }
    } catch (error) {
      console.error('Error saving appointment:', error);
      Alert.alert('Erro', 'Erro de conexão');
    }
  };

  const handleCancel = async (id: number) => {
    Alert.alert(
      'Cancelar Agendamento',
      'Tem certeza que deseja cancelar este agendamento?\n\nEsta ação não pode ser desfeita.',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await authFetch(API_ENDPOINTS.APPOINTMENT_DETAIL(id), {
                method: 'DELETE',
              });

              if (response.ok) {
                Alert.alert('Sucesso', 'Agendamento cancelado!');
                loadDayAppointments(selectedDate);
                loadMonthAppointments(currentMonth);
              } else {
                Alert.alert('Erro', 'Erro ao cancelar agendamento');
              }
            } catch (error) {
              console.error('Error cancelling appointment:', error);
              Alert.alert('Erro', 'Erro de conexão');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      contact_id: '',
      service_type_id: '',
      scheduled_at: new Date(),
      notes: '',
      status: 'pending',
    });
    setEditingAppointment(null);
  };

  const openCreateModal = () => {
    resetForm();
    const newDate = new Date(selectedDate);
    newDate.setHours(9, 0, 0, 0); // Default to 9:00
    setFormData((prev) => ({ ...prev, scheduled_at: newDate }));
    setTempDate(newDate);
    setTempHour(9);
    setTempMinute(0);
    setShowModal(true);
    // Scroll to default values after a short delay
    setTimeout(() => {
      hourScrollRef.current?.scrollTo({ y: 9 * 50, animated: false });
      minuteScrollRef.current?.scrollTo({ y: 0 * 50, animated: false });
    }, 300);
  };

  const openEditModal = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    const aptDate = new Date(appointment.scheduled_at);
    const hours = aptDate.getHours();
    const minutes = aptDate.getMinutes();
    // Round minutes to nearest 10
    const roundedMinutes = Math.round(minutes / 10) * 10;
    aptDate.setMinutes(roundedMinutes);
    setFormData({
      contact_id: appointment.contact_id.toString(),
      service_type_id: appointment.service_type_id?.toString() || '',
      scheduled_at: aptDate,
      notes: appointment.notes || '',
      status: appointment.status as 'pending' | 'confirmed' | 'cancelled' | 'completed',
    });
    setTempDate(aptDate);
    setTempHour(hours);
    setTempMinute(roundedMinutes);
    setShowModal(true);
    // Scroll to current values after a short delay
    setTimeout(() => {
      hourScrollRef.current?.scrollTo({ y: hours * 50, animated: false });
      const minuteIndex = roundedMinutes / 10;
      minuteScrollRef.current?.scrollTo({ y: minuteIndex * 50, animated: false });
    }, 300);
  };

  const getStatusBadge = (status: Appointment['status']) => {
    const variants = {
      pending: 'secondary' as const,
      confirmed: 'default' as const,
      cancelled: 'destructive' as const,
      completed: 'outline' as const,
    };
    const labels = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      cancelled: 'Cancelado',
      completed: 'Concluído',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: format(date, "dd 'de' MMMM 'de' yyyy", { locale: pt }),
      time: format(date, 'HH:mm', { locale: pt }),
    };
  };

  // Prepare select items
  const contactItems: SelectItem[] = contacts.map((contact) => ({
    label: contact.name || contact.phone_number,
    value: contact.id.toString(),
  }));

  const serviceTypeItems: SelectItem[] = [
    { label: 'Nenhum', value: '' },
    ...serviceTypes.map((st) => ({
      label: `${st.name} (${st.duration_minutes} min)`,
      value: st.id.toString(),
    })),
  ];

  const statusItems: SelectItem[] = [
    { label: 'Pendente', value: 'pending' },
    { label: 'Confirmado', value: 'confirmed' },
    { label: 'Concluído', value: 'completed' },
  ];

  const renderAppointmentItem = ({ item }: { item: Appointment }) => {
    const { time } = formatDateTime(item.scheduled_at);
    return (
      <Card style={{ marginBottom: 12 }}>
        <CardContent>
          <View style={styles.appointmentItem}>
            <View style={styles.appointmentInfo}>
              <View style={styles.appointmentTime}>
                <Ionicons name="time-outline" size={20} color="#25D366" />
                <Text style={styles.timeText}>{time}</Text>
              </View>
              {item.contact && (
                <View style={styles.appointmentDetail}>
                  <Ionicons name="person-outline" size={16} color="#8696A0" />
                  <Text style={styles.detailText}>
                    {item.contact.name || item.contact.phone_number}
                  </Text>
                </View>
              )}
              {item.service_type && (
                <Text style={styles.serviceText}>{item.service_type.name}</Text>
              )}
              {item.notes && (
                <Text style={styles.notesText} numberOfLines={2}>
                  {item.notes}
                </Text>
              )}
            </View>
            <View style={styles.appointmentActions}>
              {getStatusBadge(item.status)}
              {item.status !== 'cancelled' && (
                <>
                  <TouchableOpacity
                    onPress={() => openEditModal(item)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="pencil-outline" size={20} color="#8696A0" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleCancel(item.id)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="close-circle-outline" size={20} color="#F15C6D" />
                  </TouchableOpacity>
                </>
              )}
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
        <View>
          <Text style={styles.headerTitle}>Agendamentos</Text>
          <Text style={styles.headerSubtitle}>
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: pt })}
          </Text>
        </View>
        <TouchableOpacity onPress={openCreateModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'calendar' && styles.toggleButtonActive]}
          onPress={() => setViewMode('calendar')}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={viewMode === 'calendar' ? '#25D366' : '#8696A0'}
          />
          <Text
            style={[
              styles.toggleButtonText,
              viewMode === 'calendar' && styles.toggleButtonTextActive,
            ]}
          >
            Calendário
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons
            name="list-outline"
            size={20}
            color={viewMode === 'list' ? '#25D366' : '#8696A0'}
          />
          <Text
            style={[
              styles.toggleButtonText,
              viewMode === 'list' && styles.toggleButtonTextActive,
            ]}
          >
            Lista
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {viewMode === 'calendar' ? (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#25D366" />}
        >
          <Card style={styles.calendarCard}>
            <CardContent>
              <Calendar
                current={format(currentMonth, 'yyyy-MM-dd')}
                markedDates={markedDates}
                onDayPress={handleDateSelect}
                onMonthChange={(month: DateData) => {
                  setCurrentMonth(new Date(month.dateString));
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
                  dotColor: '#25D366',
                  selectedDotColor: '#FFFFFF',
                  arrowColor: '#25D366',
                  monthTextColor: '#E9EDEF',
                  indicatorColor: '#25D366',
                  textDayFontWeight: '400',
                  textMonthFontWeight: '600',
                  textDayHeaderFontWeight: '500',
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                  textDayHeaderFontSize: 14,
                }}
              />
            </CardContent>
          </Card>

          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              Agendamentos de {format(selectedDate, "dd 'de' MMMM", { locale: pt })}
            </Text>
            <Text style={styles.listSubtitle}>
              {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <Text style={styles.loadingText}>Carregando...</Text>
            </View>
          ) : appointments.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="calendar-outline" size={48} color="#54656F" />
              <Text style={styles.emptyText}>Nenhum agendamento para esta data</Text>
            </View>
          ) : (
            <FlatList
              data={appointments}
              renderItem={renderAppointmentItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          )}
        </ScrollView>
      ) : (
        <>
          {/* Date Navigation for List View */}
          <View style={styles.dateNavigation}>
            <TouchableOpacity
              style={styles.dateNavButton}
              onPress={() => {
                const prevDate = new Date(selectedDate);
                prevDate.setDate(prevDate.getDate() - 1);
                setSelectedDate(prevDate);
              }}
            >
              <Ionicons name="chevron-back" size={24} color="#25D366" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateNavCurrent}
              onPress={() => setViewMode('calendar')}
            >
              <Ionicons name="calendar-outline" size={20} color="#E9EDEF" />
              <Text style={styles.dateNavText}>
                {format(selectedDate, "dd 'de' MMMM", { locale: pt })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateNavButton}
              onPress={() => {
                const nextDate = new Date(selectedDate);
                nextDate.setDate(nextDate.getDate() + 1);
                setSelectedDate(nextDate);
              }}
            >
              <Ionicons name="chevron-forward" size={24} color="#25D366" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={appointments}
            renderItem={renderAppointmentItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#25D366" />}
            ListEmptyComponent={
            loading ? (
              <View style={styles.centerContainer}>
                <Text style={styles.loadingText}>Carregando...</Text>
              </View>
            ) : (
              <View style={styles.centerContainer}>
                <Ionicons name="calendar-outline" size={48} color="#54656F" />
                <Text style={styles.emptyText}>Nenhum agendamento para esta data</Text>
              </View>
            )
          }
          />
        </>
      )}

      {/* Create/Edit Modal */}
      <UIModal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
        description={editingAppointment ? 'Atualize as informações do agendamento' : 'Crie um novo agendamento'}
      >
        <View style={styles.form}>
          <View style={styles.formField}>
            <Text style={styles.label}>Contacto *</Text>
            <Select
              value={formData.contact_id}
              onValueChange={(value) => setFormData({ ...formData, contact_id: value })}
              items={contactItems}
              placeholder="Selecione um contacto"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Tipo de Serviço</Text>
            <Select
              value={formData.service_type_id}
              onValueChange={(value) => setFormData({ ...formData, service_type_id: value })}
              items={serviceTypeItems}
              placeholder="Selecione um tipo de serviço"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Data e Hora</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => {
                const date = formData.scheduled_at;
                const hours = date.getHours();
                const minutes = date.getMinutes();
                // Round minutes to nearest 10
                const roundedMinutes = Math.round(minutes / 10) * 10;
                const roundedDate = new Date(date);
                roundedDate.setMinutes(roundedMinutes);
                setTempDate(roundedDate);
                setTempHour(hours);
                setTempMinute(roundedMinutes);
                setShowDatePicker(true);
                // Scroll to current values after modal opens
                setTimeout(() => {
                  hourScrollRef.current?.scrollTo({ y: hours * 50, animated: false });
                  const minuteIndex = roundedMinutes / 10;
                  minuteScrollRef.current?.scrollTo({ y: minuteIndex * 50, animated: false });
                }, 300);
              }}
            >
              <Ionicons name="calendar-outline" size={20} color="#8696A0" />
              <Text style={styles.dateTimeText}>
                {format(formData.scheduled_at, "dd 'de' MMMM 'de' yyyy", { locale: pt })} às {format(formData.scheduled_at, 'HH:mm', { locale: pt })}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <UIModal
              visible={showDatePicker}
              onClose={() => setShowDatePicker(false)}
              title="Selecionar Data e Hora"
            >
              <View style={styles.dateTimePickerContainer}>
                <Calendar
                  current={format(tempDate, 'yyyy-MM-dd')}
                  markedDates={{
                    [format(tempDate, 'yyyy-MM-dd')]: {
                      selected: true,
                      selectedColor: '#25D366',
                    },
                  }}
                  onDayPress={(day: DateData) => {
                    const newDate = new Date(day.dateString);
                    newDate.setHours(tempDate.getHours(), tempDate.getMinutes());
                    setTempDate(newDate);
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

                <View style={styles.timePickerContainer}>
                  <Text style={styles.timeLabel}>Hora:</Text>
                  <View style={styles.timePickerRow}>
                    {/* Hour Picker */}
                    <View style={styles.pickerWrapper}>
                      <View style={styles.pickerOverlay} pointerEvents="none" />
                      <ScrollView
                        ref={hourScrollRef}
                        style={styles.pickerScroll}
                        contentContainerStyle={styles.pickerContent}
                        showsVerticalScrollIndicator={false}
                        snapToInterval={50}
                        decelerationRate="fast"
                        scrollEventThrottle={16}
                        nestedScrollEnabled={true}
                        bounces={false}
                        onScroll={(e) => {
                          const offsetY = e.nativeEvent.contentOffset.y;
                          const index = Math.round(offsetY / 50);
                          const hour = Math.max(0, Math.min(23, index));
                          if (hour !== tempHour) {
                            setTempHour(hour);
                            const newDate = new Date(tempDate);
                            newDate.setHours(hour, tempMinute);
                            setTempDate(newDate);
                          }
                        }}
                        onMomentumScrollEnd={(e) => {
                          const offsetY = e.nativeEvent.contentOffset.y;
                          const index = Math.round(offsetY / 50);
                          const hour = Math.max(0, Math.min(23, index));
                          setTempHour(hour);
                          const newDate = new Date(tempDate);
                          newDate.setHours(hour, tempMinute);
                          setTempDate(newDate);
                          // Snap to exact position
                          hourScrollRef.current?.scrollTo({ y: hour * 50, animated: true });
                        }}
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <TouchableOpacity
                            key={i}
                            style={styles.pickerItem}
                            onPress={() => {
                              setTempHour(i);
                              const newDate = new Date(tempDate);
                              newDate.setHours(i, tempMinute);
                              setTempDate(newDate);
                              hourScrollRef.current?.scrollTo({ y: i * 50, animated: true });
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.pickerItemText,
                              tempHour === i && styles.pickerItemTextSelected
                            ]}>
                              {String(i).padStart(2, '0')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <Text style={styles.timeSeparator}>:</Text>

                    {/* Minute Picker */}
                    <View style={styles.pickerWrapper}>
                      <View style={styles.pickerOverlay} pointerEvents="none" />
                      <ScrollView
                        ref={minuteScrollRef}
                        style={styles.pickerScroll}
                        contentContainerStyle={styles.pickerContent}
                        showsVerticalScrollIndicator={false}
                        snapToInterval={50}
                        decelerationRate="fast"
                        scrollEventThrottle={16}
                        nestedScrollEnabled={true}
                        bounces={false}
                        onScroll={(e) => {
                          const offsetY = e.nativeEvent.contentOffset.y;
                          const index = Math.round(offsetY / 50);
                          const minute = Math.max(0, Math.min(5, index)) * 10; // 0, 10, 20, 30, 40, 50
                          if (minute !== tempMinute) {
                            setTempMinute(minute);
                            const newDate = new Date(tempDate);
                            newDate.setHours(tempHour, minute);
                            setTempDate(newDate);
                          }
                        }}
                        onMomentumScrollEnd={(e) => {
                          const offsetY = e.nativeEvent.contentOffset.y;
                          const index = Math.round(offsetY / 50);
                          const minuteIndex = Math.max(0, Math.min(5, index));
                          const minute = minuteIndex * 10;
                          setTempMinute(minute);
                          const newDate = new Date(tempDate);
                          newDate.setHours(tempHour, minute);
                          setTempDate(newDate);
                          // Snap to exact position
                          minuteScrollRef.current?.scrollTo({ y: minuteIndex * 50, animated: true });
                        }}
                      >
                        {[0, 10, 20, 30, 40, 50].map((minute) => {
                          const index = minute / 10;
                          return (
                            <TouchableOpacity
                              key={minute}
                              style={styles.pickerItem}
                              onPress={() => {
                                setTempMinute(minute);
                                const newDate = new Date(tempDate);
                                newDate.setHours(tempHour, minute);
                                setTempDate(newDate);
                                minuteScrollRef.current?.scrollTo({ y: index * 50, animated: true });
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.pickerItemText,
                                tempMinute === minute && styles.pickerItemTextSelected
                              ]}>
                                {String(minute).padStart(2, '0')}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  </View>
                  <Text style={styles.timePreview}>
                    Hora selecionada: {String(tempHour).padStart(2, '0')}:{String(tempMinute).padStart(2, '0')}
                  </Text>
                </View>

                <View style={styles.dateTimePickerActions}>
                  <Button
                    variant="outline"
                    onPress={() => setShowDatePicker(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onPress={() => {
                      const finalDate = new Date(tempDate);
                      finalDate.setHours(tempHour, tempMinute);
                      setFormData({ ...formData, scheduled_at: finalDate });
                      setShowDatePicker(false);
                    }}
                  >
                    Confirmar
                  </Button>
                </View>
              </View>
            </UIModal>
          )}

          <View style={styles.formField}>
            <Text style={styles.label}>Status</Text>
            <Select
              value={formData.status}
              onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              items={statusItems}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Notas</Text>
            <Input
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Notas adicionais..."
              multiline
              numberOfLines={4}
              containerStyle={{ marginBottom: 0 }}
              style={styles.textArea}
            />
          </View>

          <View style={styles.formActions}>
            <Button
              variant="outline"
              onPress={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onPress={handleSave}>Salvar</Button>
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
  headerSubtitle: {
    fontSize: 14,
    color: '#8696A0',
    marginTop: 4,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1F2C33',
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#25D36620',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8696A0',
  },
  toggleButtonTextActive: {
    color: '#25D366',
  },
  content: {
    flex: 1,
  },
  calendarCard: {
    margin: 16,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E9EDEF',
  },
  listSubtitle: {
    fontSize: 14,
    color: '#8696A0',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  appointmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appointmentInfo: {
    flex: 1,
    gap: 8,
  },
  appointmentTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#25D366',
  },
  appointmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E9EDEF',
  },
  serviceText: {
    fontSize: 14,
    color: '#8696A0',
  },
  notesText: {
    fontSize: 14,
    color: '#8696A0',
    fontStyle: 'italic',
  },
  appointmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
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
  dateTimeButton: {
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
  dateTimeText: {
    fontSize: 16,
    color: '#E9EDEF',
    flex: 1,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  dateTimePickerContainer: {
    gap: 20,
  },
  timePickerContainer: {
    gap: 12,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E9EDEF',
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  timeInputGroup: {
    alignItems: 'center',
    gap: 8,
  },
  timeInputLabel: {
    fontSize: 12,
    color: '#8696A0',
  },
  timeInputControls: {
    alignItems: 'center',
    gap: 8,
  },
  timeButton: {
    padding: 8,
    backgroundColor: '#1F2C33',
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#25D366',
    minWidth: 50,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '600',
    color: '#E9EDEF',
    marginTop: 20,
  },
  dateTimePickerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 16,
  },
  pickerWrapper: {
    height: 150,
    width: 80,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1F2C33',
    borderRadius: 8,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: '#25D36620',
    borderRadius: 8,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#25D366',
    pointerEvents: 'none',
  },
  pickerScroll: {
    height: 150,
    zIndex: 0,
  },
  pickerContent: {
    paddingTop: 50,
    paddingBottom: 50,
  },
  pickerItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 24,
    fontWeight: '400',
    color: '#8696A0',
  },
  pickerItemTextSelected: {
    fontSize: 28,
    fontWeight: '600',
    color: '#25D366',
  },
  timePreview: {
    fontSize: 14,
    color: '#8696A0',
    textAlign: 'center',
    marginTop: 8,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1F2C33',
    borderBottomWidth: 1,
    borderBottomColor: '#2A373F',
  },
  dateNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#25D36620',
  },
  dateNavCurrent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  dateNavText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E9EDEF',
  },
});

